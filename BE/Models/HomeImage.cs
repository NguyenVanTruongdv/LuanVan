using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Ảnh hiển thị trên trang chủ (banner/slideshow)
/// </summary>
public partial class HomeImage
{
    public int ImageId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public string? Title { get; set; }

    public string? LinkUrl { get; set; }

    public sbyte SortOrder { get; set; }

    public string Status { get; set; } = null!;

    public long UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual Employee UploadedByNavigation { get; set; } = null!;
}
