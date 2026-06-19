using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Danh mục phân loại thiết bị tập luyện
/// </summary>
public partial class EquipmentCategory
{
    /// <summary>
    /// Mã danh mục — khóa chính tự tăng
    /// </summary>
    public int CategoryId { get; set; }

    /// <summary>
    /// Tên danh mục thiết bị, VD: Cardio, Tạ tự do, Máy tập
    /// </summary>
    public string CategoryName { get; set; } = null!;

    /// <summary>
    /// Mô tả chi tiết về danh mục thiết bị
    /// </summary>
    public string? Description { get; set; }

    public virtual ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();
}
