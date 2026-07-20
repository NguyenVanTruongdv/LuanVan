using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thông báo tương tác trong cộng đồng
/// </summary>
public partial class ForumNotification
{
    public long NotificationId { get; set; }

    public long RecipientMemberId { get; set; }

    public long ActorMemberId { get; set; }

    public string NotifyType { get; set; } = null!;

    public long PostId { get; set; }

    public long? CommentId { get; set; }

    public long? LikeId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Member ActorMember { get; set; } = null!;

    public virtual ForumComment? Comment { get; set; }

    public virtual ForumLike? Like { get; set; }

    public virtual ForumPost Post { get; set; } = null!;

    public virtual Member RecipientMember { get; set; } = null!;
}
