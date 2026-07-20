using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lượt tym bài đăng forum
/// </summary>
public partial class ForumLike
{
    public long LikeId { get; set; }

    public long PostId { get; set; }

    public long MemberId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual Member Member { get; set; } = null!;

    public virtual ForumPost Post { get; set; } = null!;
}
