using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Gói tập đã mua của từng hội viên, lưu ngày hiệu lực và trạng thái
/// </summary>
public partial class MemberPackage
{
    /// <summary>
    /// Mã gói hội viên — khóa chính tự tăng
    /// </summary>
    public long MemberPackageId { get; set; }

    /// <summary>
    /// Hội viên sở hữu gói — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Giao dịch thanh toán tương ứng — FK tới transactions.transaction_id
    /// </summary>
    public long TransactionId { get; set; }

    /// <summary>
    /// Gói tập được mua — FK tới membership_plans.plan_id
    /// </summary>
    public int PlanId { get; set; }

    /// <summary>
    /// Khuyến mãi được áp dụng — FK tới promotions.promotion_id, NULL nếu không có
    /// </summary>
    public int? PromotionId { get; set; }

    /// <summary>
    /// Giá niêm yết của gói tại thời điểm mua (VNĐ)
    /// </summary>
    public decimal GiaGoc { get; set; }

    /// <summary>
    /// Số tiền thực thu sau khuyến mãi (VNĐ), sao chép từ transactions.amount
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Số ngày tặng thêm đã quy đổi thực tế: TangNgay=so_ngay_tang, TangChuKy=so_chu_ky_tang×duration_days, không KM=0
    /// </summary>
    public short SoNgayTangThucTe { get; set; }

    /// <summary>
    /// Ngày bắt đầu có hiệu lực của gói
    /// </summary>
    public DateOnly StartDate { get; set; }

    /// <summary>
    /// Ngày hết hạn = start_date + duration_days + so_ngay_tang_thuc_te
    /// </summary>
    public DateOnly ExpiryDate { get; set; }

    /// <summary>
    /// Trạng thái gói: Pending=chờ thanh toán, Active=đang hiệu lực, Expired=hết hạn, Cancelled=đã hủy
    /// </summary>
    public string PackageStatus { get; set; } = null!;

    /// <summary>
    /// Thời điểm tạo bản ghi
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual Member Member { get; set; } = null!;

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion? Promotion { get; set; }

    public virtual PromotionUsage? PromotionUsage { get; set; }

    public virtual Transaction Transaction { get; set; } = null!;
}
