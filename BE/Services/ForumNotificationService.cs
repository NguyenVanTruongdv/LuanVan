using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumNotificationService
{
    private readonly GymManagementContext _context;

    public ForumNotificationService(GymManagementContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Tạo thông báo. Với Comment/Reply truyền commentId, với Like truyền likeId.
    /// Tự bỏ qua nếu recipient == actor (không tự thông báo cho chính mình).
    /// </summary>
    public async Task CreateAsync(long recipientMemberId, long actorMemberId, string notifyType,
        long postId, long? commentId = null, long? likeId = null)
    {
        // tự tương tác với bài/cmt của chính mình thì khỏi tạo thông báo
        if (recipientMemberId == actorMemberId)
        {
            return;
        }

        var thongBaoMoi = new ForumNotification
        {
            RecipientMemberId = recipientMemberId,
            ActorMemberId = actorMemberId,
            NotifyType = notifyType,
            PostId = postId,
            CommentId = commentId,
            LikeId = likeId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ForumNotifications.Add(thongBaoMoi);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ForumNotificationDto>> GetByMemberIdAsync(long memberId, int page = 1, int pageSize = 20)
    {
        var dsThongBao = await _context.ForumNotifications
            .Include(n => n.ActorMember).ThenInclude(m => m.FaceDatum)
            .Include(n => n.Comment)
            .Where(n => n.RecipientMemberId == memberId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        List<ForumNotificationDto> ketQua = new List<ForumNotificationDto>();

        foreach (var n in dsThongBao)
        {
            // cắt bớt nội dung comment cho gọn, dài quá thì thêm "..." phía sau
            string? previewCmt = null;
            if (n.Comment != null)
            {
                if (n.Comment.Content.Length > 80)
                {
                    previewCmt = n.Comment.Content.Substring(0, 80) + "...";
                }
                else
                {
                    previewCmt = n.Comment.Content;
                }
            }

            var dto = new ForumNotificationDto
            {
                NotificationId = n.NotificationId,
                NotifyType = n.NotifyType,
                ActorMemberId = n.ActorMemberId,
                ActorName = n.ActorMember.FullName,
                ActorAvatar = n.ActorMember.FaceDatum != null ? n.ActorMember.FaceDatum.ProfileImage : null,
                PostId = n.PostId,
                CommentId = n.CommentId,
                CommentPreview = previewCmt,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
            };

            ketQua.Add(dto);
        }

        return ketQua;
    }

    public async Task<int> GetUnreadCountAsync(long memberId)
    {
        int soChuaDoc = await _context.ForumNotifications
            .CountAsync(n => n.RecipientMemberId == memberId && n.IsRead == false);
        return soChuaDoc;
    }

    public async Task MarkAsReadAsync(long notificationId, long memberId)
    {
        var noti = await _context.ForumNotifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.RecipientMemberId == memberId);

        if (noti == null)
        {
            return;
        }

        noti.IsRead = true;
        await _context.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(long memberId)
    {
        await _context.ForumNotifications
            .Where(n => n.RecipientMemberId == memberId && n.IsRead == false)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }
}