using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bài đăng cộng đồng
/// </summary>
public partial class ForumPost
{
    public long PostId { get; set; }

    public long MemberId { get; set; }

    public string Title { get; set; } = null!;

    public int CategoryId { get; set; }

    public string? Content { get; set; }

    public string PostType { get; set; } = null!;

    public int LikeCount { get; set; }

    public int CommentCount { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ForumCategory Category { get; set; } = null!;

    public virtual ICollection<ForumComment> ForumComments { get; set; } = new List<ForumComment>();

    public virtual ICollection<ForumLike> ForumLikes { get; set; } = new List<ForumLike>();

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumPostImage> ForumPostImages { get; set; } = new List<ForumPostImage>();

    public virtual Member Member { get; set; } = null!;
}
