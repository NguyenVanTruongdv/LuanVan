using BE.Data;
using BE.DTOs.Branches;
using BE.Models;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

/// <summary>
/// Xử lý nghiệp vụ cho chi nhánh: danh sách, lọc, tạo (kèm ảnh), cập nhật, soft delete,
/// và quản lý ảnh chi nhánh (thêm / sửa / xóa, đồng bộ xóa file cũ trên S3).
/// Lưu ý: giả định DbContext tên là AppDbContext với DbSet Branches, BranchImages, Employees.
/// Điều chỉnh lại tên cho khớp với DbContext thực tế của bạn nếu khác.
/// </summary>
public class BranchService 
{
    private readonly GymManagementContext _context;
    private readonly S3StorageService _s3Service;

    private const string DefaultImageType = "Khác";
    private const string StatusDeleted = "Deleted";

    public BranchService(GymManagementContext context, S3StorageService s3Service)
    {
        _context = context;
        _s3Service = s3Service;
    }

    public async Task<BranchListResultDto> GetListAsync(BranchFilterDto filter)
    {
        var query = _context.Branches
            .Include(b => b.Manager)
            .Include(b => b.BranchImages)
            .Where(b => b.Status != StatusDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Name))
        {
            var keyword = filter.Name.Trim().ToLower();
            query = query.Where(b => b.BranchName.ToLower().Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(b => b.Status == filter.Status);
        }

        var totalCount = await query.CountAsync();

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var branches = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new BranchListResultDto
        {
            Items = branches.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BranchDto?> GetByIdAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.Manager)
            .Include(b => b.BranchImages)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != StatusDeleted);

        return branch is null ? null : MapToDto(branch);
    }

    public async Task<BranchDto> CreateAsync(CreateBranchDto dto)
    {
        var branch = new Branch
        {
            BranchName = dto.BranchName,
            Address = dto.Address,
            Phone = dto.Phone,
            ManagerId = dto.ManagerId,
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync(); // cần BranchId trước khi upload ảnh (đặt tên folder theo id)

        if (dto.Images is { Count: > 0 })
        {
            await UploadAndAttachImagesAsync(branch.BranchId, dto.Images, dto.ImageTypes);
            await _context.SaveChangesAsync();
        }

        await _context.Entry(branch).Reference(b => b.Manager).LoadAsync();
        await _context.Entry(branch).Collection(b => b.BranchImages).LoadAsync();

        return MapToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(int branchId, UpdateBranchDto dto)
    {
        var branch = await _context.Branches
            .Include(b => b.Manager)
            .Include(b => b.BranchImages)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != StatusDeleted);

        if (branch is null) return null;

        branch.BranchName = dto.BranchName;
        branch.Address = dto.Address;
        branch.Phone = dto.Phone;
        branch.ManagerId = dto.ManagerId;
        branch.Status = dto.Status;

        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    public async Task<bool> SoftDeleteAsync(int branchId)
    {
        var branch = await _context.Branches
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != StatusDeleted);

        if (branch is null) return false;

        // Soft delete: không xóa dữ liệu, chỉ đánh dấu trạng thái để loại khỏi danh sách hiển thị.
        // Ảnh trên S3 được giữ nguyên (không xóa) phòng trường hợp cần khôi phục chi nhánh.
        branch.Status = StatusDeleted;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<BranchDto?> RestoreAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.Manager)
            .Include(b => b.BranchImages)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status == StatusDeleted);

        if (branch is null) return null; // không tồn tại hoặc chưa từng bị xóa

        // Khôi phục về Active — có thể đổi thành Inactive nếu muốn giữ nguyên trạng thái trước khi xóa
        branch.Status = "Active";
        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    public async Task<List<BranchImageDto>> AddImagesAsync(int branchId, AddBranchImagesDto dto)
    {
        var branchExists = await _context.Branches
            .AnyAsync(b => b.BranchId == branchId && b.Status != StatusDeleted);

        if (!branchExists)
            throw new KeyNotFoundException($"Không tìm thấy chi nhánh có id = {branchId}");

        var newImages = await UploadAndAttachImagesAsync(branchId, dto.Images, dto.ImageTypes);
        await _context.SaveChangesAsync();

        return newImages.Select(MapImageToDto).ToList();
    }

    public async Task<BranchImageDto?> UpdateImageAsync(int imageId, UpdateBranchImageDto dto)
    {
        var image = await _context.BranchImages.FirstOrDefaultAsync(i => i.ImageId == imageId);
        if (image is null) return null;

        // Nếu có ảnh mới: xóa ảnh cũ trên S3 trước, rồi upload ảnh mới thay thế
        if (dto.Image is not null)
        {
            var oldUrl = image.ImageUrl;
            var newUrl = await _s3Service.UploadFileAsync(dto.Image, $"branches/{image.BranchId}");
            image.ImageUrl = newUrl;

            await _s3Service.DeleteFileAsync(oldUrl);
        }

        if (!string.IsNullOrWhiteSpace(dto.ImageType))
        {
            image.ImageType = dto.ImageType;
        }

        if (dto.SortOrder.HasValue)
        {
            image.SortOrder = dto.SortOrder.Value;
        }

        await _context.SaveChangesAsync();

        return MapImageToDto(image);
    }

    public async Task<bool> DeleteImageAsync(int imageId)
    {
        var image = await _context.BranchImages.FirstOrDefaultAsync(i => i.ImageId == imageId);
        if (image is null) return false;

        await _s3Service.DeleteFileAsync(image.ImageUrl);

        _context.BranchImages.Remove(image);
        await _context.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Upload danh sách file lên S3 và tạo entity BranchImage tương ứng (chưa SaveChanges).
    /// SortOrder được tính tiếp theo giá trị lớn nhất hiện có trong cùng ImageType.
    /// </summary>
    private async Task<List<BranchImage>> UploadAndAttachImagesAsync(
        int branchId, List<IFormFile> images, List<string>? imageTypes)
    {
        var result = new List<BranchImage>();

        // Lấy sort order hiện tại theo từng loại ảnh để nối tiếp thay vì ghi đè
        var currentMaxSortOrders = await _context.BranchImages
            .Where(i => i.BranchId == branchId)
            .GroupBy(i => i.ImageType)
            .Select(g => new { ImageType = g.Key, Max = g.Max(i => i.SortOrder) })
            .ToDictionaryAsync(x => x.ImageType, x => x.Max);

        for (var i = 0; i < images.Count; i++)
        {
            var file = images[i];
            var imageType = imageTypes is not null && i < imageTypes.Count && !string.IsNullOrWhiteSpace(imageTypes[i])
                ? imageTypes[i]
                : DefaultImageType;

            var url = await _s3Service.UploadFileAsync(file, $"branches/{branchId}");

            currentMaxSortOrders.TryGetValue(imageType, out var currentMax);
            var nextOrder = (sbyte)(currentMax + 1);
            currentMaxSortOrders[imageType] = nextOrder;

            var entity = new BranchImage
            {
                BranchId = branchId,
                ImageUrl = url,
                ImageType = imageType,
                SortOrder = nextOrder,
                UploadedAt = DateTime.UtcNow
            };

            _context.BranchImages.Add(entity);
            result.Add(entity);
        }

        return result;
    }

    private static BranchDto MapToDto(Branch b) => new()
    {
        BranchId = b.BranchId,
        BranchName = b.BranchName,
        Address = b.Address,
        Phone = b.Phone,
        ManagerId = b.ManagerId,
        ManagerName = b.Manager?.FullName, // đổi lại tên field cho khớp với Employee thực tế
        Status = b.Status,
        CreatedAt = b.CreatedAt,
        Images = b.BranchImages
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .Select(MapImageToDto)
            .ToList()
    };

    private static BranchImageDto MapImageToDto(BranchImage i) => new()
    {
        ImageId = i.ImageId,
        BranchId = i.BranchId,
        ImageUrl = i.ImageUrl,
        ImageType = i.ImageType,
        SortOrder = i.SortOrder,
        UploadedAt = i.UploadedAt
    };
}