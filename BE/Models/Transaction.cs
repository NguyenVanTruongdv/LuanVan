using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Giao dịch thanh toán mua hoặc gia hạn gói tập
/// </summary>
public partial class Transaction
{
    public long TransactionId { get; set; }

    public string OrderCode { get; set; } = null!;

    public string? BankReferenceCode { get; set; }

    public long MemberId { get; set; }

    public int PlanId { get; set; }

    public int? PromotionId { get; set; }

    public int BranchId { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public string PaymentStatus { get; set; } = null!;

    public decimal GiaGoc { get; set; }

    public decimal Amount { get; set; }

    public string? ReceiptImage { get; set; }

    public long? EmployeeId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Employee? Employee { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion? Promotion { get; set; }

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogs { get; set; } = new List<TransactionAdjustmentLog>();
}
