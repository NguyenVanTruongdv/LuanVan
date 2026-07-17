using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumCommentService
{
    private readonly GymManagementContext _context;
    private readonly ForumNotificationService _notificationService;

    // Giới hạn độ sâu trả lời để tránh cây quá dài trên UI mobile (tùy chỉnh theo ý bạn)
    private const int MAX_DEPTH = 5;

    public ForumCommentService(GymManagementContext context, ForumNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // ===== LẤY TOÀN BỘ BÌNH LUẬN CỦA 1 BÀI, DỰNG CÂY N CẤP =====
    public async Task<List<ForumCommentDto>> GetByPostIdAsync(long postId, long? currentMemberId)
    {
        var all = await _context.ForumComments
            .Include(c => c.Member).ThenInclude(m => m.FaceDatum)
            .Include(c => c.ReplyToMember)
            .Where(c => c.PostId == postId && c.Status == "Active")
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var commentIds = all.Select(c => c.CommentId).ToList();
        var likedIds = currentMemberId.HasValue
            ? await _context.ForumCommentLikes
                .Where(l => commentIds.Contains(l.CommentId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.CommentId)
                .ToListAsync()
            : new List<long>();

        var dtoById = all.ToDictionary(c => c.CommentId, c => MapToDto(c, likedIds));

        var roots = new List<ForumCommentDto>();
        foreach (var c in all)
        {
            var dto = dtoById[c.CommentId];
            if (c.ParentCommentId is null)
                roots.Add(dto);
            else if (dtoById.TryGetValue(c.ParentCommentId.Value, out var parentDto))
                parentDto.Replies.Add(dto);
            // Nếu cha đã bị xóa/ẩn (không tìm thấy trong dtoById) -> coi như mồ côi, ẩn luôn (bỏ qua)
        }

        return roots;
    }

    // ===== TẠO BÌNH LUẬN / TRẢ LỜI + TẠO THÔNG BÁO ĐÚNG NGƯỜI =====
    public async Task<(bool Success, string? Error, ForumCommentDto? Data)> CreateAsync(
        long memberId, ForumCommentCreateDto dto)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == dto.PostId);
        if (post is null || post.Status != "Active")
            return (false, "Bài viết không tồn tại hoặc đã bị ẩn/xóa", null);

        long? replyToMemberId = null;

        if (dto.ParentCommentId.HasValue)
        {
            var parent = await _context.ForumComments
                .FirstOrDefaultAsync(c => c.CommentId == dto.ParentCommentId.Value);

            if (parent is null || parent.PostId != dto.PostId || parent.Status != "Active")
                return (false, "Bình luận không tồn tại", null);

            var depth = await GetDepthAsync(parent.CommentId);
            if (depth >= MAX_DEPTH)
                return (false, $"Chỉ hỗ trợ trả lời tối đa {MAX_DEPTH} cấp", null);

            // Người sẽ nhận thông báo "đã trả lời bình luận của bạn" chính là CHỦ của comment cha
            // (không phải chủ bài viết) — dù cây có sâu đến đâu, trỏ ĐÚNG cha trực tiếp
            replyToMemberId = parent.MemberId;
        }

        var comment = new ForumComment
        {
            PostId = dto.PostId,
            MemberId = memberId,
            ParentCommentId = dto.ParentCommentId, // trỏ thẳng cha trực tiếp, hỗ trợ n cấp thật sự
            ReplyToMemberId = replyToMemberId,
            Content = dto.Content,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ForumComments.Add(comment);
        post.CommentCount += 1; // đếm cả reply

        // Lưu trước để có CommentId thật (cần cho notification.comment_id)
        await _context.SaveChangesAsync();

        // ===== Tạo thông báo: phân biệt rõ "bình luận bài viết" và "trả lời bình luận" =====
        if (replyToMemberId.HasValue)
        {
            // Trả lời -> báo cho CHỦ BÌNH LUẬN CHA: "<Tên người trả lời> đã trả lời bình luận của bạn"
            await _notificationService.CreateAsync(
                recipientMemberId: replyToMemberId.Value,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Reply,
                postId: dto.PostId,
                commentId: comment.CommentId);
        }
        else
        {
            // Bình luận gốc -> báo cho CHỦ BÀI VIẾT: "<Tên người bình luận> đã bình luận về bài viết của bạn"
            await _notificationService.CreateAsync(
                recipientMemberId: post.MemberId,
                actorMemberId: memberId,
                notifyType: ForumNotifyType.Comment,
                postId: dto.PostId,
                commentId: comment.CommentId);
        }

        var created = MapToDto(comment, new List<long>());
        return (true, null, created);
    }

    // ===== TYM / BỎ TYM BÌNH LUẬN =====
    public async Task<(bool Success, string? Error, bool IsLiked, int LikeCount)> ToggleLikeAsync(
        long commentId, long memberId)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null || comment.Status != "Active")
            return (false, "Bình luận không tồn tại", false, 0);

        var existing = await _context.ForumCommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == commentId && l.MemberId == memberId);

        bool isLiked;

        if (existing is not null)
        {
            _context.ForumCommentLikes.Remove(existing);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
            isLiked = false;
        }
        else
        {
            _context.ForumCommentLikes.Add(new ForumCommentLike
            {
                CommentId = commentId,
                MemberId = memberId,
                CreatedAt = DateTime.UtcNow
            });
            comment.LikeCount += 1;
            isLiked = true;
        }

        await _context.SaveChangesAsync();

        // NOTE: ForumNotification.LikeId hiện chỉ FK tới ForumLike (tym bài viết), không có cột
        // riêng cho ForumCommentLike -> tạm KHÔNG tạo thông báo khi tym bình luận, tránh sai FK.
        // Nếu bạn muốn có thông báo "đã tym bình luận của bạn", cần thêm cột
        // comment_like_id (FK forum_comment_likes.like_id) vào bảng forum_notifications trước.

        return (true, null, isLiked, comment.LikeCount);
    }

    // ===== XÓA BÌNH LUẬN (soft delete) — khách tự xóa của mình, hoặc admin xóa bất kỳ =====
    public async Task<(bool Success, string? Error)> DeleteAsync(long commentId, long requesterId, bool isAdmin = false)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null)
            return (false, "Không tìm thấy bình luận");

        if (comment.Status == "Deleted")
            return (false, "Bình luận đã được xóa trước đó");

        // Khách chỉ xóa được bình luận của chính mình; admin bỏ qua check quyền sở hữu
        if (!isAdmin && comment.MemberId != requesterId)
            return (false, "Bạn không có quyền xóa bình luận này");

        // Xóa cả nhánh con (n cấp) bên dưới nó, vì reply không có nghĩa khi cha đã bị xóa
        var descendantIds = await GetAllDescendantIdsAsync(commentId);

        comment.Status = "Deleted";
        comment.UpdatedAt = DateTime.UtcNow;

        if (descendantIds.Count > 0)
        {
            await _context.ForumComments
                .Where(c => descendantIds.Contains(c.CommentId) && c.Status == "Active")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.Status, "Deleted")
                    .SetProperty(c => c.UpdatedAt, DateTime.UtcNow));
        }

        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == comment.PostId);
        if (post is not null)
            post.CommentCount = Math.Max(0, post.CommentCount - 1 - descendantIds.Count);

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== Helper: đếm độ sâu hiện tại bằng cách leo ngược lên cha =====
    private async Task<int> GetDepthAsync(long commentId)
    {
        int depth = 0;
        long? currentId = commentId;

        while (currentId.HasValue && depth < MAX_DEPTH + 1)
        {
            var parentId = await _context.ForumComments
                .Where(c => c.CommentId == currentId.Value)
                .Select(c => c.ParentCommentId)
                .FirstOrDefaultAsync();

            depth++;
            currentId = parentId;
        }

        return depth;
    }

    // ===== Helper: BFS toàn bộ hậu duệ (con, cháu, chắt...) của 1 comment =====
    private async Task<List<long>> GetAllDescendantIdsAsync(long rootCommentId)
    {
        var postId = await _context.ForumComments
            .Where(c => c.CommentId == rootCommentId)
            .Select(c => c.PostId)
            .FirstOrDefaultAsync();

        var allInPost = await _context.ForumComments
            .Where(c => c.PostId == postId && c.Status == "Active")
            .Select(c => new { c.CommentId, c.ParentCommentId })
            .ToListAsync();

        var childrenMap = allInPost
            .Where(c => c.ParentCommentId.HasValue)
            .GroupBy(c => c.ParentCommentId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(x => x.CommentId).ToList());

        var result = new List<long>();
        var queue = new Queue<long>();
        queue.Enqueue(rootCommentId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (childrenMap.TryGetValue(current, out var children))
            {
                foreach (var childId in children)
                {
                    result.Add(childId);
                    queue.Enqueue(childId);
                }
            }
        }

        return result;
    }

    // ===== MAPPER =====
    private static ForumCommentDto MapToDto(ForumComment c, List<long> likedIds) => new()
    {
        CommentId = c.CommentId,
        PostId = c.PostId,
        MemberId = c.MemberId,
        MemberName = c.Member?.FullName ?? "",
        MemberAvatar = c.Member?.FaceDatum?.ProfileImage,
        ParentCommentId = c.ParentCommentId,
        ReplyToMemberId = c.ReplyToMemberId,
        ReplyToMemberName = c.ReplyToMember?.FullName,
        Content = c.Content,
        LikeCount = c.LikeCount,
        IsLikedByCurrentUser = likedIds.Contains(c.CommentId),
        CreatedAt = c.CreatedAt,
    };
}