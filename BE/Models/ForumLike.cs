using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lượt tym (yêu thích) bài đăng forum của hội viên
/// </summary>
public partial class ForumLike
{
    /// <summary>
    /// Mã lượt tym — khóa chính tự tăng
    /// </summary>
    public long LikeId { get; set; }

    /// <summary>
    /// Bài đăng được tym — FK tới forum_posts.post_id
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// Hội viên thực hiện tym — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Thời điểm tym
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual Member Member { get; set; } = null!;

    public virtual ForumPost Post { get; set; } = null!;
}
