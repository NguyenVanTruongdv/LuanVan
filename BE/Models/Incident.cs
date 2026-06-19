using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Báo cáo sự cố thiết bị và cơ sở vật chất tại các chi nhánh
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
    /// URL ảnh minh chứng sự cố lưu trên S3, có thể NULL
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Chi nhánh xảy ra sự cố — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Thiết bị liên quan — FK tới equipment.equipment_id. NULL nếu sự cố không liên quan thiết bị cụ thể
    /// </summary>
    public int? EquipmentId { get; set; }

    /// <summary>
    /// Trạng thái xử lý: PendingApproval=chờ duyệt, Assigned=đã phân công, Resolved=đã xử lý xong, Rejected=bị từ chối. Phải đồng bộ với incident_assignments.work_status
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Nhân viên báo cáo sự cố — FK tới employees.employee_id
    /// </summary>
    public long ReportedBy { get; set; }

    /// <summary>
    /// Thời điểm tạo báo cáo sự cố
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm sự cố được xử lý hoàn tất — điền khi status = Resolved
    /// </summary>
    public DateTime? ResolvedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Equipment? Equipment { get; set; }

    public virtual IncidentAssignment? IncidentAssignment { get; set; }

    public virtual Employee ReportedByNavigation { get; set; } = null!;
}
