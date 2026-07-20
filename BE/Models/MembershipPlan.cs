using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Danh sách gói tập — không còn phân loại Customer/Internal
/// </summary>
public partial class MembershipPlan
{
    public int PlanId { get; set; }

    public string PlanName { get; set; } = null!;

    public decimal Price { get; set; }

    public short DurationDays { get; set; }

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public bool IsPopular { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogNewPlans { get; set; } = new List<TransactionAdjustmentLog>();

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogOldPlans { get; set; } = new List<TransactionAdjustmentLog>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
