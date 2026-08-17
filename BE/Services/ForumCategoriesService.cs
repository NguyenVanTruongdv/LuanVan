using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumCategoryService
{
    private readonly GymManagementContext _context;

    public ForumCategoryService(GymManagementContext context)
    {
        _context = context;
    }

    // Lấy danh sách danh mục (mặc định chỉ Active, có thể lấy tất cả)
    public async Task<List<ForumCategoryDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _context.ForumCategories.AsQueryable();

        if (!includeInactive)
            query = query.Where(c => c.Status == "Active");

        return await query
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new ForumCategoryDto
            {
                CategoryId = c.CategoryId,
                CategoryName = c.CategoryName,
                Icon = c.Icon,
                DisplayOrder = c.DisplayOrder,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                PostCount = c.ForumPosts.Count(p => p.Status == "Active")
            })
            .ToListAsync();
    }

    // Lấy 1 danh mục theo id
    public async Task<ForumCategoryDto?> GetByIdAsync(int id)
    {
        return await _context.ForumCategories
            .Where(c => c.CategoryId == id)
            .Select(c => new ForumCategoryDto
            {
                CategoryId = c.CategoryId,
                CategoryName = c.CategoryName,
                Icon = c.Icon,
                DisplayOrder = c.DisplayOrder,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                PostCount = c.ForumPosts.Count(p => p.Status == "Active")
            })
            .FirstOrDefaultAsync();
    }

    // Thêm danh mục mới
    public async Task<(bool Success, string? Error, ForumCategoryDto? Data)> CreateAsync(ForumCategoryCreateDto dto)
    {
        var daTonTai = await _context.ForumCategories
            .AnyAsync(c => c.CategoryName == dto.CategoryName);

        if (daTonTai)
            return (false, "Tên danh mục đã tồn tại", null);

        var danhMucMoi = new ForumCategory
        {
            CategoryName = dto.CategoryName,
            Icon = dto.Icon,
            DisplayOrder = dto.DisplayOrder,
            Status = "Active",
            CreatedAt = DateTime.Now
        };

        _context.ForumCategories.Add(danhMucMoi);
        await _context.SaveChangesAsync();

        return (true, null, new ForumCategoryDto
        {
            CategoryId = danhMucMoi.CategoryId,
            CategoryName = danhMucMoi.CategoryName,
            Icon = danhMucMoi.Icon,
            DisplayOrder = danhMucMoi.DisplayOrder,
            Status = danhMucMoi.Status,
            CreatedAt = danhMucMoi.CreatedAt,
            PostCount = 0
        });
    }

    // Sửa danh mục
    public async Task<(bool Success, string? Error)> UpdateAsync(int id, ForumCategoryUpdateDto dto)
    {
        var danhMuc = await _context.ForumCategories.FindAsync(id);
        if (danhMuc is null)
            return (false, "Không tìm thấy danh mục");

        var daTonTai = await _context.ForumCategories
            .AnyAsync(c => c.CategoryName == dto.CategoryName && c.CategoryId != id);

        if (daTonTai)
            return (false, "Tên danh mục đã tồn tại");

        if (dto.Status != "Active" && dto.Status != "Inactive")
            return (false, "Status không hợp lệ (chỉ Active hoặc Inactive)");

        danhMuc.CategoryName = dto.CategoryName;
        danhMuc.Icon = dto.Icon;
        danhMuc.DisplayOrder = dto.DisplayOrder;
        danhMuc.Status = dto.Status;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // Ẩn danh mục (chuyển Status sang Inactive, không xoá dữ liệu)
    public async Task<(bool Success, string? Error)> DeactivateAsync(int id)
    {
        var danhMuc = await _context.ForumCategories.FindAsync(id);
        if (danhMuc is null)
            return (false, "Không tìm thấy danh mục");

        if (danhMuc.Status == "Inactive")
            return (false, "Danh mục này đã ở trạng thái ẩn");

        danhMuc.Status = "Inactive";
        await _context.SaveChangesAsync();
        return (true, null);
    }

    // Hiện lại danh mục đã ẩn (chuyển Status về Active)
    public async Task<(bool Success, string? Error)> ActivateAsync(int id)
    {
        var danhMuc = await _context.ForumCategories.FindAsync(id);
        if (danhMuc is null)
            return (false, "Không tìm thấy danh mục");

        if (danhMuc.Status == "Active")
            return (false, "Danh mục này đang hiển thị rồi");

        danhMuc.Status = "Active";
        await _context.SaveChangesAsync();
        return (true, null);
    }

    // Xóa danh mục
    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var danhMuc = await _context.ForumCategories
            .Include(c => c.ForumPosts)
            .FirstOrDefaultAsync(c => c.CategoryId == id);

        if (danhMuc is null)
            return (false, "Không tìm thấy danh mục");

        if (danhMuc.ForumPosts.Any())
            return (false, "Không thể xóa vì vẫn còn bài viết thuộc danh mục này. Hãy chuyển bài viết sang danh mục khác trước.");

        _context.ForumCategories.Remove(danhMuc);
        await _context.SaveChangesAsync();
        return (true, null);
    }
}