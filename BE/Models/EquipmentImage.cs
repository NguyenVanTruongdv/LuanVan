using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Album ảnh của từng thiết bị
/// </summary>
public partial class EquipmentImage
{
    public int ImageId { get; set; }

    public int EquipmentId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public sbyte SortOrder { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual Equipment Equipment { get; set; } = null!;
}
