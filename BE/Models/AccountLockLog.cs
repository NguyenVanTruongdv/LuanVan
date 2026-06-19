using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử khóa/mở tài khoản hội viên và nhân viên — chỉ ghi thêm
/// </summary>
public partial class AccountLockLog
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long LogId { get; set; }

    /// <summary>
    /// Hội viên bị tác động — FK tới members.member_id. Điền khi khóa/mở tài khoản hội viên, NULL nếu là nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên bị tác động — FK tới employees.employee_id. Điền khi khóa/mở tài khoản nhân viên, NULL nếu là hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    /// <summary>
    /// Hành động thực hiện: Lock = khóa tài khoản, Unlock = mở khóa tài khoản
    /// </summary>
    public string Action { get; set; } = null!;

    /// <summary>
    /// Lý do khóa hoặc mở khóa tài khoản
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// Nhân viên thực hiện thao tác — FK tới employees.employee_id
    /// </summary>
    public long PerformedBy { get; set; }

    /// <summary>
    /// Thời điểm thực hiện
    /// </summary>
    public DateTime PerformedAt { get; set; }

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }

    public virtual Employee PerformedByNavigation { get; set; } = null!;
}
