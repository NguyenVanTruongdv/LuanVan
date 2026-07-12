using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Báo cáo sự cố thiết bị/cơ sở vật chất — hội viên hoặc nhân viên đều có thể tạo
/// </summary>
public partial class Incident
{
    /// <summary>
    /// Mã sự cố — khóa chính tự tăng
    /// </summary>
    public int IncidentId { get; set; }

    /// <summary>
    /// Tiêu đề ngắn gọn mô tả sự cố
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// Mô tả chi tiết hiện trạng sự cố
    /// </summary>
    public string Description { get; set; } = null!;

    /// <summary>
    /// Chi nhánh xảy ra sự cố — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Thiết bị liên quan — FK tới equipment.equipment_id. NULL nếu sự cố không liên quan thiết bị cụ thể
    /// </summary>
    public int? EquipmentId { get; set; }

    /// <summary>
    /// Hội viên báo cáo sự cố — FK tới members.member_id. Điền khi người báo cáo là hội viên
    /// </summary>
    public long? ReportedByMemberId { get; set; }

    /// <summary>
    /// Nhân viên báo cáo sự cố — FK tới employees.employee_id. Điền khi người báo cáo là nhân viên
    /// </summary>
    public long? ReportedByEmployeeId { get; set; }

    public string Status { get; set; } = null!;

    /// <summary>
    /// Lý do từ chối sự cố — bắt buộc điền khi status = Rejected
    /// </summary>
    public string? RejectReason { get; set; }

    /// <summary>
    /// Nhân viên (Manager/Admin) duyệt hoặc từ chối sự cố — FK tới employees.employee_id
    /// </summary>
    public long? ApprovedBy { get; set; }

    /// <summary>
    /// Thời điểm tạo báo cáo sự cố
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật trạng thái gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual Employee? ApprovedByNavigation { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Equipment? Equipment { get; set; }

    public virtual Employee? ReportedByEmployee { get; set; }

    public virtual Member? ReportedByMember { get; set; }
}
