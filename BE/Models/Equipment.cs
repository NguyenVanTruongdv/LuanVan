using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thiết bị tập luyện được lắp đặt tại các chi nhánh
/// </summary>
public partial class Equipment
{
    /// <summary>
    /// Mã thiết bị — khóa chính tự tăng
    /// </summary>
    public int EquipmentId { get; set; }

    /// <summary>
    /// Tên thiết bị, VD: Máy chạy bộ TechnoGym Run 700
    /// </summary>
    public string EquipmentName { get; set; } = null!;

    /// <summary>
    /// Danh mục thiết bị — FK tới equipment_categories.category_id
    /// </summary>
    public int CategoryId { get; set; }

    /// <summary>
    /// Chi nhánh đang đặt thiết bị — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Trạng thái: Active=đang hoạt động, Broken=bị hỏng, UnderMaintenance=đang sửa chữa
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Mô tả thêm về thiết bị, VD: serial number, năm mua
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Ngày thiết bị được thêm vào hệ thống
    /// </summary>
    public DateTime AddedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual EquipmentCategory Category { get; set; } = null!;

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();
}
