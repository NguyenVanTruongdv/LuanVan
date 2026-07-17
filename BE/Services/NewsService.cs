using BE.Data;
using BE.DTOs.News;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Quản lý Tin tức (News) — tạo/sửa/ẩn/lấy danh sách theo phân quyền.
public class NewsService
{
    private const string StatusActive = "Active";
    private const string StatusHidden = "Hidden";

    private readonly GymManagementContext _db;

    public NewsService(GymManagementContext db)
    {
        _db = db;
    }

    // TẠO: chỉ Admin và Manager
    public async Task<News> CreateAsync(News news, long currentUserId, int? currentUserBranchId)
    {
        news.CreatedBy = currentUserId;
        news.BranchId = news.BranchId ?? currentUserBranchId;
        news.Status = StatusActive;
        news.CreatedAt = DateTime.UtcNow;
        news.UpdatedAt = DateTime.UtcNow;

        _db.Add(news);
        await _db.SaveChangesAsync();
        return news;
    }

    // SỬA: Admin sửa tất cả, Manager chỉ sửa bài mình tạo
    public async Task<(bool Success, string? Error)> UpdateAsync(int id, News input, long currentUserId, bool isAdmin)
    {
        var existing = await _db.News.FindAsync(id);
        if (existing == null)
            return (false, "NotFound");

        if (!isAdmin && existing.CreatedBy != currentUserId)
            return (false, "Forbidden");

        existing.Title = input.Title;
        existing.Summary = input.Summary;
        existing.Content = input.Content;
        if (isAdmin && input.BranchId.HasValue)
            existing.BranchId = input.BranchId;
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (true, null);
    }

    // ẨN (soft delete): Admin ẩn tất cả, Manager chỉ ẩn bài mình tạo
    public async Task<(bool Success, string? Error)> HideAsync(int id, long currentUserId, bool isAdmin)
    {
        var existing = await _db.News.FindAsync(id);
        if (existing == null)
            return (false, "NotFound");

        if (!isAdmin && existing.CreatedBy != currentUserId)
            return (false, "Forbidden");

        existing.Status = StatusHidden;
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (true, null);
    }

    // DANH SÁCH CHO KHÁCH HÀNG: toàn bộ tin Active, không lọc gì cả
    public async Task<List<NewsResponseDto>> GetPublicListAsync()
    {
        return await _db.News
            .Where(n => n.Status == StatusActive)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NewsResponseDto
            {
                Title = n.Title,
                Summary = n.Summary,
                Content = n.Content
            })
            .ToListAsync();
    }

    // DANH SÁCH CHO ADMIN/MANAGER:
    // - Admin: xem tất cả (kể cả Hidden), lọc theo branchId/keyword nếu truyền
    // - Manager: chỉ xem tin mình tạo, lọc theo branchId/keyword nếu truyền
    public async Task<List<NewsAdminResponseDto>> GetStaffListAsync(
        bool isAdmin,
        long currentUserId,
        int? branchId,
        string? keyword)
    {
        var query = _db.News
            .Include(n => n.CreatedByNavigation)
            .Include(n => n.Branch)
            .AsQueryable();

        if (!isAdmin)
        {
            // Manager chỉ thấy bài mình tạo
            query = query.Where(n => n.CreatedBy == currentUserId);
        }

        if (branchId.HasValue)
            query = query.Where(n => n.BranchId == branchId.Value);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(n =>
                n.Title.Contains(keyword) ||
                (n.Summary != null && n.Summary.Contains(keyword)) ||
                n.Content.Contains(keyword));
        }

        return await query
            .OrderByDescending(n => n.Status == StatusActive)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n => new NewsAdminResponseDto
            {
                NewsId = n.NewsId,
                Title = n.Title,
                Summary = n.Summary,
                Content = n.Content,
                Status = n.Status,
                CreatedBy = n.CreatedBy,
                CreatedByName = n.CreatedByNavigation.FullName,
                BranchId = n.BranchId,
                BranchName = n.Branch != null ? n.Branch.BranchName : null,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            })
            .ToListAsync();
    }
    // KÍCH HOẠT LẠI (bỏ ẩn): cùng luật quyền như Sửa/Ẩn
    public async Task<(bool Success, string? Error)> ActivateAsync(int id, long currentUserId, bool isAdmin)
    {
        var existing = await _db.News.FindAsync(id);
        if (existing == null)
            return (false, "NotFound");

        if (!isAdmin && existing.CreatedBy != currentUserId)
            return (false, "Forbidden");

        existing.Status = StatusActive;
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (true, null);
    }
}