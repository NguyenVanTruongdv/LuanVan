using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lượt tym bình luận
/// </summary>
public partial class ForumCommentLike
{
    public long LikeId { get; set; }

    public long CommentId { get; set; }

    public long MemberId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ForumComment Comment { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
