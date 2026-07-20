using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Snapshot mật độ người tập theo thời gian
/// </summary>
public partial class GymDensity
{
    public long DensityId { get; set; }

    public int BranchId { get; set; }

    public DateTime RecordedAt { get; set; }

    public short Headcount { get; set; }

    public virtual Branch Branch { get; set; } = null!;
}
