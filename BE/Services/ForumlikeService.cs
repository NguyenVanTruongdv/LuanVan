using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumLikeService
{
    private readonly GymManagementContext _context;
    private readonly ForumNotificationService _notificationService;

    public ForumLikeService(GymManagementContext context, ForumNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // ===== TYM / BỎ TYM BÀI VIẾT (toggle) =====
    public async Task<(bool Success, string? Error, ForumLikeToggleResultDto? Data)> ToggleLikeAsync(long memberId, long postId)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);

        if (post is null || post.Status != "Active")
            return (false, "Bài viết không tồn tại hoặc đã bị ẩn/xóa", null);

        var existingLike = await _context.ForumLikes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.MemberId == memberId);

        bool isLiked;
        ForumLike? newLike = null;

        if (existingLike is not null)
        {
            // Đã tym trước đó -> bỏ tym
            _context.ForumLikes.Remove(existingLike);
            if (post.LikeCount > 0) post.LikeCount -= 1;
            isLiked = false;
        }
        else
        {
            // Chưa tym -> thêm tym mới
            newLike = new ForumLike
            {
                PostId = postId,
                MemberId = memberId,
                CreatedAt = DateTime.UtcNow
            };
            _context.ForumLikes.Add(newLike);
            post.LikeCount += 1;
            isLiked = true;
        }

        // Lưu trước để có LikeId thật (cần cho notification.like_id) rồi mới tạo thông báo
        await _context.SaveChangesAsync();

        if (isLiked && newLike is not null)
        {
            // Tạo thông báo cho chủ bài viết (CreateAsync tự bỏ qua nếu tự tym bài của chính mình)
            await _notificationService.CreateAsync(
                recipientMemberId: post.MemberId,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Like,
                postId: postId,
                likeId: newLike.LikeId);
        }

        return (true, null, new ForumLikeToggleResultDto
        {
            IsLiked = isLiked,
            LikeCount = post.LikeCount
        });
    }

    // ===== KIỂM TRA 1 HỘI VIÊN ĐÃ TYM BÀI CHƯA =====
    public async Task<bool> HasLikedAsync(long postId, long memberId)
    {
        return await _context.ForumLikes.AnyAsync(l => l.PostId == postId && l.MemberId == memberId);
    }
}