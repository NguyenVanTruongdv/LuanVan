using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Chương trình khuyến mãi
/// </summary>
public partial class Promotion
{
    public int PromotionId { get; set; }

    public int PlanId { get; set; }

    public string TenKhuyenMai { get; set; } = null!;

    public string? MoTa { get; set; }

    public string PromoType { get; set; } = null!;

    public decimal? PhanTramGiam { get; set; }

    public decimal? MucGiamToiDa { get; set; }

    public decimal? SoTienGiam { get; set; }

    public short? SoNgayTang { get; set; }

    public sbyte? SoChuKyTang { get; set; }

    public DateTime NgayBatDau { get; set; }

    public DateTime NgayKetThuc { get; set; }

    public int? GioiHanLuot { get; set; }

    public int SoLuotDaDung { get; set; }

    public string TrangThai { get; set; } = null!;

    public long NguoiTao { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual Employee NguoiTaoNavigation { get; set; } = null!;

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogNewPromotions { get; set; } = new List<TransactionAdjustmentLog>();

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogOldPromotions { get; set; } = new List<TransactionAdjustmentLog>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
