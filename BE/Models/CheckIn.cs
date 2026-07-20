using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử check-in / check-out
/// </summary>
public partial class CheckIn
{
    public long CheckInId { get; set; }

    public long MemberId { get; set; }

    public long MemberPackageId { get; set; }

    public int BranchId { get; set; }

    public DateTime CheckInTime { get; set; }

    public string Method { get; set; } = null!;

    public long? StaffId { get; set; }

    public string? ManualReason { get; set; }

    public DateTime? CheckOutTime { get; set; }

    public string? CheckOutMethod { get; set; }

    public long? CheckOutStaffId { get; set; }

    public string? CheckOutManualReason { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Employee? CheckOutStaff { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual MemberPackage MemberPackage { get; set; } = null!;

    public virtual Employee? Staff { get; set; }
}
