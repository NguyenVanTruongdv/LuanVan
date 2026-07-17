using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bình luận bài viết cộng đồng, hỗ trợ trả lời 2 cấp
/// </summary>
public partial class ForumComment
{
    /// <summary>
    /// Mã bình luận — khóa chính tự tăng
    /// </summary>
    public long CommentId { get; set; }

    /// <summary>
    /// Bài đăng chứa bình luận — FK tới forum_posts.post_id
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// Hội viên viết bình luận — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// NULL = bình luận gốc (cấp 1). Có giá trị = trả lời, LUÔN trỏ về comment_id của bình luận GỐC (kể cả khi trả lời 1 reply khác) — FK tới forum_comments.comment_id
    /// </summary>
    public long? ParentCommentId { get; set; }

    /// <summary>
    /// Chỉ dùng để hiển thị &quot;Trả lời &lt;tên&gt;&quot; khi reply nhắm vào 1 reply khác, không ảnh hưởng cấu trúc cây — FK tới members.member_id
    /// </summary>
    public long? ReplyToMemberId { get; set; }

    /// <summary>
    /// Nội dung bình luận
    /// </summary>
    public string Content { get; set; } = null!;

    /// <summary>
    /// Tổng số lượt tym bình luận này
    /// </summary>
    public int LikeCount { get; set; }

    /// <summary>
    /// Trạng thái: Active=hiển thị, Hidden=admin ẩn, Deleted=đã xóa
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Thời điểm tạo bình luận
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ForumCommentLike> ForumCommentLikes { get; set; } = new List<ForumCommentLike>();

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumComment> InverseParentComment { get; set; } = new List<ForumComment>();

    public virtual Member Member { get; set; } = null!;

    public virtual ForumComment? ParentComment { get; set; }

    public virtual ForumPost Post { get; set; } = null!;

    public virtual Member? ReplyToMember { get; set; }
}
