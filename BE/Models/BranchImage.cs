using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Album ảnh các khu vực của từng chi nhánh
/// </summary>
public partial class BranchImage
{
    public int ImageId { get; set; }

    public int BranchId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public string ImageType { get; set; } = null!;

    public sbyte SortOrder { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;
}
