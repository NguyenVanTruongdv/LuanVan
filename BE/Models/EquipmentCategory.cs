using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Danh mục phân loại thiết bị
/// </summary>
public partial class EquipmentCategory
{
    public int CategoryId { get; set; }

    public string CategoryName { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();
}
