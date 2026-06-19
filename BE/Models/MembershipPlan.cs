using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Danh sách gói tập phòng gym
/// </summary>
public partial class MembershipPlan
{
    /// <summary>
    /// Mã gói tập — khóa chính tự tăng
    /// </summary>
    public int PlanId { get; set; }

    /// <summary>
    /// Tên hiển thị của gói tập, VD: Gói 1 Tháng, Gói PRO 3 Tháng
    /// </summary>
    public string PlanName { get; set; } = null!;

    /// <summary>
    /// Giá niêm yết của gói (VNĐ), không có số thập phân
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Thời hạn gói tính bằng số ngày kể từ ngày bắt đầu
    /// </summary>
    public short DurationDays { get; set; }

    /// <summary>
    /// Mô tả quyền lợi gói tập hiển thị cho hội viên
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Trạng thái bán: OnSale = đang bán, Discontinued = ngừng bán
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Thời điểm tạo gói tập
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<PromotionPlan> PromotionPlans { get; set; } = new List<PromotionPlan>();

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
