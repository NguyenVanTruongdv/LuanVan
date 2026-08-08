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


    public async Task<(bool Success, string? Error, ForumLikeToggleResultDto? Data)> ToggleLikeAsync(long memberId, long postId)
    {
        var baiViet = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);

        if (baiViet == null || baiViet.Status != "Active")
        {
            return (false, "Bài viết không tồn tại hoặc đã bị ẩn/xóa", null);
        }

        var likeCu = await _context.ForumLikes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.MemberId == memberId);

        bool dangLike;
        ForumLike? likeMoi = null;

        if (likeCu != null)
        {
            // Đã tym trước đó -> bấm nữa là bỏ tym
            _context.ForumLikes.Remove(likeCu);
            if (baiViet.LikeCount > 0)
            {
                baiViet.LikeCount = baiViet.LikeCount - 1;
            }
            dangLike = false;
        }
        else
        {
            
            likeMoi = new ForumLike
            {
                PostId = postId,
                MemberId = memberId,
                CreatedAt = DateTime.UtcNow
            };
            _context.ForumLikes.Add(likeMoi);
            baiViet.LikeCount = baiViet.LikeCount + 1;
            dangLike = true;
        }

        // Lưu trước để có LikeId thật  rồi mới tạo thông báo
        await _context.SaveChangesAsync();

        if (dangLike == true && likeMoi != null)
        {
            // Tạo thông báo cho chủ bài viết (CreateAsync tự bỏ qua nếu tự tym bài của chính mình)
            await _notificationService.CreateAsync(
                recipientMemberId: baiViet.MemberId,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Like,
                postId: postId,
                likeId: likeMoi.LikeId);
        }

        var ketQua = new ForumLikeToggleResultDto
        {
            IsLiked = dangLike,
            LikeCount = baiViet.LikeCount
        };

        return (true, null, ketQua);
    }

  
    public async Task<bool> HasLikedAsync(long postId, long memberId)
    {
        bool daTym = await _context.ForumLikes.AnyAsync(l => l.PostId == postId && l.MemberId == memberId);
        return daTym;
    }
}