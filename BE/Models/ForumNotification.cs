using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thông báo cho hội viên khi bài viết của họ được tym hoặc bình luận
/// </summary>
public partial class ForumNotification
{
    /// <summary>
    /// Mã thông báo — khóa chính tự tăng
    /// </summary>
    public long NotificationId { get; set; }

    /// <summary>
    /// Hội viên nhận thông báo — FK tới members.member_id
    /// </summary>
    public long RecipientMemberId { get; set; }

    /// <summary>
    /// Hội viên thực hiện hành động (người tym/bình luận/trả lời) — FK tới members.member_id
    /// </summary>
    public long ActorMemberId { get; set; }

    /// <summary>
    /// Loại thông báo: Like=có người tym bài, Comment=có người bình luận bài, Reply=có người trả lời đích danh bình luận của mình
    /// </summary>
    public string NotifyType { get; set; } = null!;

    /// <summary>
    /// Bài đăng liên quan — FK tới forum_posts.post_id
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// Bình luận liên quan — FK tới forum_comments.comment_id. Bắt buộc điền khi notify_type = Comment, NULL khi notify_type = Like
    /// </summary>
    public long? CommentId { get; set; }

    /// <summary>
    /// 0 = chưa đọc, 1 = đã đọc
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Thời điểm phát sinh thông báo
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual Member ActorMember { get; set; } = null!;

    public virtual ForumComment? Comment { get; set; }

    public virtual ForumPost Post { get; set; } = null!;

    public virtual Member RecipientMember { get; set; } = null!;
}
