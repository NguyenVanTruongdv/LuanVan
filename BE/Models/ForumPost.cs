using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bài đăng trên forum của hội viên, gồm cả bài gốc và bài đăng lại
/// </summary>
public partial class ForumPost
{
    /// <summary>
    /// Mã bài đăng — khóa chính tự tăng
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// Hội viên tạo bài đăng — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    public string Title { get; set; } = null!;

    public int CategoryId { get; set; }

    /// <summary>
    /// Nội dung bài viết. Có thể NULL nếu là Repost không kèm lời bình
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// Loại bài: Original = bài gốc, Repost = đăng lại bài của người khác
    /// </summary>
    public string PostType { get; set; } = null!;

    /// <summary>
    /// Bài viết gốc được đăng lại — FK tự tham chiếu tới forum_posts.post_id. Bắt buộc khi post_type = Repost, NULL khi Original
    /// </summary>
    public long? OriginalPostId { get; set; }

    /// <summary>
    /// Số lượt tym — đồng bộ mỗi khi forum_likes thay đổi
    /// </summary>
    public int LikeCount { get; set; }

    /// <summary>
    /// Số lượt bình luận — đồng bộ mỗi khi forum_comments thay đổi
    /// </summary>
    public int CommentCount { get; set; }

    /// <summary>
    /// Số lượt được đăng lại — đồng bộ mỗi khi có bài Repost mới trỏ tới bài này
    /// </summary>
    public int RepostCount { get; set; }

    /// <summary>
    /// Trạng thái: Active=đang hiển thị, Hidden=bị Admin ẩn do vi phạm, Deleted=hội viên tự xóa (soft delete)
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Thời điểm đăng bài
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm chỉnh sửa gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ForumCategory Category { get; set; } = null!;

    public virtual ICollection<ForumComment> ForumComments { get; set; } = new List<ForumComment>();

    public virtual ICollection<ForumLike> ForumLikes { get; set; } = new List<ForumLike>();

    public virtual ICollection<ForumNotification> ForumNotifications { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumPostImage> ForumPostImages { get; set; } = new List<ForumPostImage>();

    public virtual Member Member { get; set; } = null!;
}
