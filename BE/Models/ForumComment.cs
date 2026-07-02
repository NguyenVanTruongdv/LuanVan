using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bình luận trong bài đăng forum, hỗ trợ trả lời 1 cấp và @ đích danh người được trả lời
/// </summary>
public partial class ForumComment
{
    /// <summary>
    /// Mã bình luận — khóa chính tự tăng
    /// </summary>
    public long CommentId { get; set; }

    /// <summary>
    /// Bài đăng được bình luận — FK tới forum_posts.post_id
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// Hội viên bình luận — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Bình luận gốc của nhánh — FK tự tham chiếu tới forum_comments.comment_id, NULL nếu bản thân là bình luận gốc
    /// </summary>
    public long? ParentCommentId { get; set; }

    /// <summary>
    /// Hội viên đang được trả lời đích danh — FK tới members.member_id. Bắt buộc điền khi là reply, NULL nếu là bình luận gốc
    /// </summary>
    public long? ReplyToMemberId { get; set; }

    /// <summary>
    /// Nội dung bình luận
    /// </summary>
    public string Content { get; set; } = null!;

    /// <summary>
    /// Trạng thái: Active=đang hiển thị, Deleted=đã xóa (soft delete)
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Thời điểm bình luận
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm chỉnh sửa gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumComment> InverseParentComment { get; set; } = new List<ForumComment>();

    public virtual Member Member { get; set; } = null!;

    public virtual ForumComment? ParentComment { get; set; }

    public virtual ForumPost Post { get; set; } = null!;

    public virtual Member? ReplyToMember { get; set; }
}
