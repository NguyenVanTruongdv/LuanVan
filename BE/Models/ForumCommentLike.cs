using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lượt tym bình luận
/// </summary>
public partial class ForumCommentLike
{
    /// <summary>
    /// Mã lượt tym — khóa chính tự tăng
    /// </summary>
    public long LikeId { get; set; }

    /// <summary>
    /// Bình luận được tym — FK tới forum_comments.comment_id
    /// </summary>
    public long CommentId { get; set; }

    /// <summary>
    /// Hội viên thực hiện tym — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Thời điểm tym
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual ForumComment Comment { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
