using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bình luận bài viết cộng đồng, hỗ trợ trả lời 2 cấp
/// </summary>
public partial class ForumComment
{
    public long CommentId { get; set; }

    public long PostId { get; set; }

    public long MemberId { get; set; }

    public long? ParentCommentId { get; set; }

    public long? ReplyToMemberId { get; set; }

    public string Content { get; set; } = null!;

    public int LikeCount { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ForumCommentLike> ForumCommentLikes { get; set; } = new List<ForumCommentLike>();

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumComment> InverseParentComment { get; set; } = new List<ForumComment>();

    public virtual Member Member { get; set; } = null!;

    public virtual ForumComment? ParentComment { get; set; }

    public virtual ForumPost Post { get; set; } = null!;

    public virtual Member? ReplyToMember { get; set; }
}
