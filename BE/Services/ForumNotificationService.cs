using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumNotificationService
{
    private readonly GymManagementContext _context;
    public ForumNotificationService(GymManagementContext context) => _context = context;

    /// <summary>
    /// Tạo thông báo. Với Comment/Reply truyền commentId, với Like truyền likeId.
    /// Tự bỏ qua nếu recipient == actor (không tự thông báo cho chính mình).
    /// </summary>
    public async Task CreateAsync(long recipientMemberId, long actorMemberId, string notifyType,
        long postId, long? commentId = null, long? likeId = null)
    {
        if (recipientMemberId == actorMemberId) return;

        _context.ForumNotifications.Add(new ForumNotification
        {
            RecipientMemberId = recipientMemberId,
            ActorMemberId = actorMemberId,
            NotifyType = notifyType,
            PostId = postId,
            CommentId = commentId,
            LikeId = likeId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
    }

    public async Task<List<ForumNotificationDto>> GetByMemberIdAsync(long memberId, int page = 1, int pageSize = 20)
    {
        var items = await _context.ForumNotifications
            .Include(n => n.ActorMember).ThenInclude(m => m.FaceDatum)
            .Include(n => n.Comment)
            .Where(n => n.RecipientMemberId == memberId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return items.Select(n => new ForumNotificationDto
        {
            NotificationId = n.NotificationId,
            NotifyType = n.NotifyType,
            ActorMemberId = n.ActorMemberId,
            ActorName = n.ActorMember.FullName,
            ActorAvatar = n.ActorMember.FaceDatum?.ProfileImage,
            PostId = n.PostId,
            CommentId = n.CommentId,
            CommentPreview = n.Comment is not null
                ? (n.Comment.Content.Length > 80 ? n.Comment.Content[..80] + "..." : n.Comment.Content)
                : null,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
        }).ToList();
    }

    public async Task<int> GetUnreadCountAsync(long memberId) =>
        await _context.ForumNotifications.CountAsync(n => n.RecipientMemberId == memberId && !n.IsRead);

    public async Task MarkAsReadAsync(long notificationId, long memberId)
    {
        var noti = await _context.ForumNotifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.RecipientMemberId == memberId);
        if (noti is null) return;

        noti.IsRead = true;
        await _context.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(long memberId)
    {
        await _context.ForumNotifications
            .Where(n => n.RecipientMemberId == memberId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }
}