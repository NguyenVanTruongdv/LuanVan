using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử chỉnh sửa giao dịch — không cần seed
/// </summary>
public partial class TransactionAdjustmentLog
{
    public long AdjustmentId { get; set; }

    public long TransactionId { get; set; }

    public int OldPlanId { get; set; }

    public int NewPlanId { get; set; }

    public decimal OldGiaGoc { get; set; }

    public decimal NewGiaGoc { get; set; }

    public decimal OldAmount { get; set; }

    public decimal NewAmount { get; set; }

    public int? OldPromotionId { get; set; }

    public int? NewPromotionId { get; set; }

    public string? Reason { get; set; }

    public long AdjustedBy { get; set; }

    public DateTime AdjustedAt { get; set; }

    public virtual Employee AdjustedByNavigation { get; set; } = null!;

    public virtual MembershipPlan NewPlan { get; set; } = null!;

    public virtual Promotion? NewPromotion { get; set; }

    public virtual MembershipPlan OldPlan { get; set; } = null!;

    public virtual Promotion? OldPromotion { get; set; }

    public virtual Transaction Transaction { get; set; } = null!;
}
