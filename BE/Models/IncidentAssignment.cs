using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Phân công kỹ thuật viên xử lý sự cố. Khi Completed phải đồng bộ incidents.status
/// </summary>
public partial class IncidentAssignment
{
    /// <summary>
    /// Mã phân công — khóa chính tự tăng
    /// </summary>
    public int AssignmentId { get; set; }

    /// <summary>
    /// Sự cố cần xử lý — FK tới incidents.incident_id, mỗi sự cố chỉ có 1 phân công
    /// </summary>
    public int IncidentId { get; set; }

    /// <summary>
    /// Kỹ thuật viên được giao việc — FK tới employees.employee_id
    /// </summary>
    public long TechnicianId { get; set; }

    /// <summary>
    /// Quản lý thực hiện phân công — FK tới employees.employee_id
    /// </summary>
    public long ManagerId { get; set; }

    /// <summary>
    /// Tiến độ công việc: NotStarted=chưa bắt đầu, InProgress=đang sửa, WaitingForParts=chờ linh kiện, Completed=hoàn thành. Khi Completed phải cập nhật incidents.status=Resolved
    /// </summary>
    public string WorkStatus { get; set; } = null!;

    /// <summary>
    /// Ghi chú tiến độ do kỹ thuật viên cập nhật
    /// </summary>
    public string? WorkNotes { get; set; }

    /// <summary>
    /// URL ảnh sau khi sửa xong, dùng để xác nhận hoàn tất
    /// </summary>
    public string? AfterImage { get; set; }

    /// <summary>
    /// Thời điểm quản lý thực hiện phân công
    /// </summary>
    public DateTime AssignedAt { get; set; }

    /// <summary>
    /// Thời điểm kỹ thuật viên hoàn thành — điền khi work_status = Completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    public virtual Incident Incident { get; set; } = null!;

    public virtual Employee Manager { get; set; } = null!;

    public virtual Employee Technician { get; set; } = null!;
}
