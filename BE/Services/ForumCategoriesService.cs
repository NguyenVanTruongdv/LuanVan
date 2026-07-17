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
                Slug = c.Slug,
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
                Slug = c.Slug,
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
        var nameExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryName == dto.CategoryName);

        if (nameExists)
            return (false, "Tên danh mục đã tồn tại", null);

        var slug = string.IsNullOrWhiteSpace(dto.Slug)
            ? GenerateSlug(dto.CategoryName)
            : dto.Slug;

        var entity = new ForumCategory
        {
            CategoryName = dto.CategoryName,
            Slug = slug,
            Icon = dto.Icon,
            DisplayOrder = dto.DisplayOrder,
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        };

        _context.ForumCategories.Add(entity);
        await _context.SaveChangesAsync();

        return (true, null, new ForumCategoryDto
        {
            CategoryId = entity.CategoryId,
            CategoryName = entity.CategoryName,
            Slug = entity.Slug,
            Icon = entity.Icon,
            DisplayOrder = entity.DisplayOrder,
            Status = entity.Status,
            CreatedAt = entity.CreatedAt,
            PostCount = 0
        });
    }

    // Sửa danh mục
    public async Task<(bool Success, string? Error)> UpdateAsync(int id, ForumCategoryUpdateDto dto)
    {
        var entity = await _context.ForumCategories.FindAsync(id);
        if (entity is null)
            return (false, "Không tìm thấy danh mục");

        var nameExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryName == dto.CategoryName && c.CategoryId != id);

        if (nameExists)
            return (false, "Tên danh mục đã tồn tại");

        if (dto.Status != "Active" && dto.Status != "Inactive")
            return (false, "Status không hợp lệ (chỉ Active hoặc Inactive)");

        entity.CategoryName = dto.CategoryName;
        entity.Slug = string.IsNullOrWhiteSpace(dto.Slug) ? GenerateSlug(dto.CategoryName) : dto.Slug;
        entity.Icon = dto.Icon;
        entity.DisplayOrder = dto.DisplayOrder;
        entity.Status = dto.Status;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // Xóa danh mục
    public async Task<(bool Success, string? Error)> DeleteAsync(int id)
    {
        var entity = await _context.ForumCategories
            .Include(c => c.ForumPosts)
            .FirstOrDefaultAsync(c => c.CategoryId == id);

        if (entity is null)
            return (false, "Không tìm thấy danh mục");

        if (entity.ForumPosts.Any())
            return (false, "Không thể xóa vì vẫn còn bài viết thuộc danh mục này. Hãy chuyển bài viết sang danh mục khác trước.");

        _context.ForumCategories.Remove(entity);
        await _context.SaveChangesAsync();
        return (true, null);
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        // Vietnamese/basic normalize - tối thiểu để không lỗi, có thể thay bằng thư viện dấu tiếng Việt
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"\s+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        return slug;
    }
}