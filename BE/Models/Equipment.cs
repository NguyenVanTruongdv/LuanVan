using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thiết bị tập luyện lắp đặt tại các chi nhánh
/// </summary>
public partial class Equipment
{
    public int EquipmentId { get; set; }

    public string EquipmentName { get; set; } = null!;

    public int CategoryId { get; set; }

    public int BranchId { get; set; }

    public string Status { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime AddedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual EquipmentCategory Category { get; set; } = null!;

    public virtual ICollection<EquipmentImage> EquipmentImages { get; set; } = new List<EquipmentImage>();

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();
}
