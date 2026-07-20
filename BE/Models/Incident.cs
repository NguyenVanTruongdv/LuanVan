using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Báo cáo sự cố
/// </summary>
public partial class Incident
{
    public int IncidentId { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public int BranchId { get; set; }

    public int? EquipmentId { get; set; }

    public long? ReportedByMemberId { get; set; }

    public long? ReportedByEmployeeId { get; set; }

    public string Status { get; set; } = null!;

    public string? RejectReason { get; set; }

    public long? ApprovedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Employee? ApprovedByNavigation { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Equipment? Equipment { get; set; }

    public virtual ICollection<IncidentMedia> IncidentMedia { get; set; } = new List<IncidentMedia>();

    public virtual Employee? ReportedByEmployee { get; set; }

    public virtual Member? ReportedByMember { get; set; }
}
