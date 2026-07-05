using BE.Data; // TODO: sửa lại namespace chứa DbContext của bạn nếu khác
using BE.Dtos.Equipments;
using BE.Models;
// using BE.Enums; // TODO: thêm using đúng namespace chứa enum EqmEnumStatus của bạn
using BE.Services.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Equipments;

public class EquipmentService 
{
    private const string ImageFolder = "equipments";

    private readonly GymManagementContext _context; // TODO: sửa lại tên DbContext nếu khác
    private readonly S3StorageService _fileStorageService;

    public EquipmentService(GymManagementContext context, S3StorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task<List<EquipmentDto>> GetAllAsync(EquipmentFilterDto filter)
    {
        var query = _context.Equipment
            .Include(e => e.Category)
            .Include(e => e.Branch)
            .Include(e => e.EquipmentImages)
            .AsQueryable();

        if (!filter.IncludeDeleted)
        {
            query = query.Where(e => e.Status != EqmEnumStatus.Deleted.ToString());
        }

        if (filter.BranchId.HasValue)
        {
            query = query.Where(e => e.BranchId == filter.BranchId.Value);
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(e => e.CategoryId == filter.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Name))
        {
            var keyword = filter.Name.Trim();
            query = query.Where(e => EF.Functions.Like(e.EquipmentName, $"%{keyword}%"));
        }

        var equipments = await query
            .OrderByDescending(e => e.AddedAt)
            .ToListAsync();

        return equipments.Select(MapToDto).ToList();
    }

    public async Task<EquipmentDto?> GetByIdAsync(int equipmentId)
    {
        var equipment = await _context.Equipment
            .Include(e => e.Category)
            .Include(e => e.Branch)
            .Include(e => e.EquipmentImages)
            .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);

        return equipment == null ? null : MapToDto(equipment);
    }

    public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto dto)
    {
        // Kiểm tra category và branch có tồn tại không
        var categoryExists = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId);
        if (!categoryExists)
        {
            throw new ArgumentException($"Danh mục thiết bị với id {dto.CategoryId} không tồn tại");
        }

        var branchExists = await _context.Branches.AnyAsync(b => b.BranchId == dto.BranchId);
        if (!branchExists)
        {
            throw new ArgumentException($"Chi nhánh với id {dto.BranchId} không tồn tại");
        }

        var equipment = new Equipment
        {
            EquipmentName = dto.EquipmentName,
            CategoryId = dto.CategoryId,
            BranchId = dto.BranchId,
            Description = dto.Description,
            Status = EqmEnumStatus.Active.ToString(),
            AddedAt = DateTime.UtcNow
        };

        _context.Equipment.Add(equipment);
        await _context.SaveChangesAsync(); // Cần EquipmentId trước khi gắn ảnh

        // Ảnh có thể null (bổ sung sau qua API update) — chỉ upload nếu có truyền lên
        if (dto.Image is { Length: > 0 })
        {
            await AddImageAsync(equipment.EquipmentId, dto.Image);
        }

        // Load lại kèm navigation properties để trả về đầy đủ thông tin
        return (await GetByIdAsync(equipment.EquipmentId))!;
    }

    public async Task<EquipmentDto?> UpdateAsync(int equipmentId, UpdateEquipmentDto dto)
    {
        var equipment = await _context.Equipment
            .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId && e.Status != EqmEnumStatus.Deleted.ToString());

        if (equipment == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(dto.EquipmentName))
        {
            equipment.EquipmentName = dto.EquipmentName;
        }

        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId.Value);
            if (!categoryExists)
            {
                throw new ArgumentException($"Danh mục thiết bị với id {dto.CategoryId} không tồn tại");
            }
            equipment.CategoryId = dto.CategoryId.Value;
        }

        if (dto.BranchId.HasValue)
        {
            var branchExists = await _context.Branches.AnyAsync(b => b.BranchId == dto.BranchId.Value);
            if (!branchExists)
            {
                throw new ArgumentException($"Chi nhánh với id {dto.BranchId} không tồn tại");
            }
            equipment.BranchId = dto.BranchId.Value;
        }

        if (dto.Description != null)
        {
            equipment.Description = dto.Description;
        }

        await _context.SaveChangesAsync();

        // Chỉ đụng vào ảnh khi có truyền ảnh mới lên.
        // Không truyền (null) => giữ nguyên ảnh cũ.
        if (dto.Image is { Length: > 0 })
        {
            await ReplaceImageAsync(equipment.EquipmentId, dto.Image);
        }

        return await GetByIdAsync(equipment.EquipmentId);
    }

    /// <summary>
    /// Upload 1 ảnh và lưu vào bảng EquipmentImage cho thiết bị (dùng khi tạo mới)
    /// </summary>
    private async Task AddImageAsync(int equipmentId, IFormFile image)
    {
        var url = await _fileStorageService.UploadFileAsync(image, ImageFolder);

        _context.EquipmentImages.Add(new EquipmentImage
        {
            EquipmentId = equipmentId,
            ImageUrl = url,
            SortOrder = 0,
            UploadedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Xóa ảnh cũ (nếu có, cả file trên storage lẫn record DB) và thay bằng ảnh mới (dùng khi update)
    /// </summary>
    private async Task ReplaceImageAsync(int equipmentId, IFormFile image)
    {
        var oldImages = await _context.EquipmentImages
            .Where(i => i.EquipmentId == equipmentId)
            .ToListAsync();

        foreach (var oldImage in oldImages)
        {
            // DeleteFileAsync tự nuốt lỗi bên trong nên không cần try/catch ở đây nữa
            await _fileStorageService.DeleteFileAsync(oldImage.ImageUrl);
        }

        _context.EquipmentImages.RemoveRange(oldImages);
        await _context.SaveChangesAsync();

        await AddImageAsync(equipmentId, image);
    }

    public async Task<bool> DeleteAsync(int equipmentId)
    {
        var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);

        if (equipment == null || equipment.Status == EqmEnumStatus.Deleted.ToString())
        {
            return false;
        }

        // Soft delete: chỉ đổi status, không xóa record thật
        equipment.Status = EqmEnumStatus.Deleted.ToString();
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RestoreAsync(int equipmentId)
    {
        var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);

        if (equipment == null || equipment.Status != EqmEnumStatus.Deleted.ToString())
        {
            return false;
        }

        equipment.Status = EqmEnumStatus.Active.ToString();
        await _context.SaveChangesAsync();

        return true;
    }

    private static EquipmentDto MapToDto(Equipment e)
    {
        return new EquipmentDto
        {
            EquipmentId = e.EquipmentId,
            EquipmentName = e.EquipmentName,
            CategoryId = e.CategoryId,
            CategoryName = e.Category?.CategoryName,
            BranchId = e.BranchId,
            BranchName = e.Branch?.BranchName,
            Status = e.Status,
            Description = e.Description,
            AddedAt = e.AddedAt,
            ImageUrls = e.EquipmentImages
                .OrderBy(img => img.SortOrder)
                .Select(img => img.ImageUrl)
                .ToList()
        };
    }
}