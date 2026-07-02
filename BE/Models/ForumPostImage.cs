using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Ảnh đính kèm trong bài đăng forum, 1 bài có thể có nhiều ảnh
/// </summary>
public partial class ForumPostImage
{
    /// <summary>
    /// Mã ảnh — khóa chính tự tăng
    /// </summary>
    public long ImageId { get; set; }

    /// <summary>
    /// Bài đăng sở hữu ảnh — FK tới forum_posts.post_id
    /// </summary>
    public long PostId { get; set; }

    /// <summary>
    /// URL ảnh lưu trên S3
    /// </summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>
    /// Thứ tự hiển thị trong bài (ảnh 1, ảnh 2...), số nhỏ hiển thị trước
    /// </summary>
    public sbyte SortOrder { get; set; }

    /// <summary>
    /// Thời điểm tải ảnh lên
    /// </summary>
    public DateTime UploadedAt { get; set; }

    public virtual ForumPost Post { get; set; } = null!;
}
