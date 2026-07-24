using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử check-in / check-out của hội viên và nhân viên
/// </summary>
public partial class CheckIn
{
    public long CheckInId { get; set; }

    /// <summary>
    /// Hội viên check-in — FK tới members.member_id. NULL nếu đây là lượt check-in của nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên tự check-in (chấm công) — FK tới employees.employee_id. NULL nếu đây là lượt check-in của hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    /// <summary>
    /// Gói tập được dùng để check-in — FK tới member_packages.member_package_id. NULL nếu đây là lượt check-in của nhân viên
    /// </summary>
    public long? MemberPackageId { get; set; }

    public int BranchId { get; set; }

    public DateTime CheckInTime { get; set; }

    public string Method { get; set; } = null!;

    /// <summary>
    /// Nhân viên thực hiện thao tác check-in hộ (trường hợp Manual)
    /// </summary>
    public long? StaffId { get; set; }

    public string? ManualReason { get; set; }

    public DateTime? CheckOutTime { get; set; }

    public string? CheckOutMethod { get; set; }

    public long? CheckOutStaffId { get; set; }

    public string? CheckOutManualReason { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Employee? CheckOutStaff { get; set; }

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }

    public virtual MemberPackage? MemberPackage { get; set; }

    public virtual Employee? Staff { get; set; }
}
