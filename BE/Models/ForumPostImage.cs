using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Ảnh đính kèm trong bài đăng forum
/// </summary>
public partial class ForumPostImage
{
    public long ImageId { get; set; }

    public long PostId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public sbyte SortOrder { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual ForumPost Post { get; set; } = null!;
}
