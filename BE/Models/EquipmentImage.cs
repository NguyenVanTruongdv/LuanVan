using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Album ảnh của từng thiết bị
/// </summary>
public partial class EquipmentImage
{
    /// <summary>
    /// Mã ảnh — khóa chính tự tăng
    /// </summary>
    public int ImageId { get; set; }

    /// <summary>
    /// Thiết bị sở hữu ảnh — FK tới equipment.equipment_id
    /// </summary>
    public int EquipmentId { get; set; }

    /// <summary>
    /// URL ảnh lưu trên S3
    /// </summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>
    /// Thứ tự hiển thị, số nhỏ hiển thị trước
    /// </summary>
    public sbyte SortOrder { get; set; }

    /// <summary>
    /// Thời điểm tải ảnh lên
    /// </summary>
    public DateTime UploadedAt { get; set; }

    public virtual Equipment Equipment { get; set; } = null!;
}
