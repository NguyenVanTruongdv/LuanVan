using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Liên kết nhiều-nhiều giữa khuyến mãi và gói tập. Mỗi gói chỉ có 1 KM active tại 1 thời điểm — kiểm tra qua stored procedure
/// </summary>
public partial class PromotionPlan
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Mã khuyến mãi — FK tới promotions.promotion_id
    /// </summary>
    public int PromotionId { get; set; }

    /// <summary>
    /// Mã gói tập được gắn vào khuyến mãi — FK tới membership_plans.plan_id
    /// </summary>
    public int PlanId { get; set; }

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion Promotion { get; set; } = null!;
}
