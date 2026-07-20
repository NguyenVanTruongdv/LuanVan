using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử áp dụng khuyến mãi
/// </summary>
public partial class PromotionUsage
{
    public long UsageId { get; set; }

    public int PromotionId { get; set; }

    public long MemberPackageId { get; set; }

    public long MemberId { get; set; }

    public int PlanId { get; set; }

    public decimal SoTienDaGiam { get; set; }

    public short SoNgayDuocTang { get; set; }

    public DateTime ApDungLuc { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual MemberPackage MemberPackage { get; set; } = null!;

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion Promotion { get; set; } = null!;
}
