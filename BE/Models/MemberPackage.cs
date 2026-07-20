using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Gói tập đã mua của từng hội viên. LƯU Ý: package_status (trạng thái của gói tập cụ thể) vẫn giữ Expired — đây khác với members.status (trạng thái tài khoản hội viên nói chung), cái đã bỏ Expired theo yêu cầu.
/// </summary>
public partial class MemberPackage
{
    public long MemberPackageId { get; set; }

    public int BranchId { get; set; }

    public long MemberId { get; set; }

    public long TransactionId { get; set; }

    public int PlanId { get; set; }

    public int? PromotionId { get; set; }

    public decimal GiaGoc { get; set; }

    public decimal Amount { get; set; }

    public short SoNgayTangThucTe { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public string PackageStatus { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual Member Member { get; set; } = null!;

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion? Promotion { get; set; }

    public virtual PromotionUsage? PromotionUsage { get; set; }

    public virtual Transaction Transaction { get; set; } = null!;
}
