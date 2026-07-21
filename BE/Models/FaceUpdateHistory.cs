using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử mỗi lần tạo/cập nhật khuôn mặt (hội viên hoặc nhân viên) — chỉ ghi thêm, không sửa/xóa
/// </summary>
public partial class FaceUpdateHistory
{
    public long HistoryId { get; set; }

    /// <summary>
    /// Hội viên liên quan — FK tới members.member_id. NULL nếu đây là lịch sử của nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên liên quan (chủ sở hữu faceId) — FK tới employees.employee_id. NULL nếu đây là lịch sử của hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    public string? OldFaceIdAws { get; set; }

    public string NewFaceIdAws { get; set; } = null!;

    public string? Reason { get; set; }

    /// <summary>
    /// Nhân viên thực hiện tạo/cập nhật faceId — FK tới employees.employee_id
    /// </summary>
    public long PerformedBy { get; set; }

    public DateTime PerformedAt { get; set; }

    public string? OldProfileImage { get; set; }

    public string NewProfileImage { get; set; } = null!;

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }

    public virtual Employee PerformedByNavigation { get; set; } = null!;
}
