using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử áp dụng khuyến mãi — chỉ ghi thêm, không sửa xóa
/// </summary>
public partial class PromotionUsage
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long UsageId { get; set; }

    /// <summary>
    /// Khuyến mãi được áp dụng — FK tới promotions.promotion_id
    /// </summary>
    public int PromotionId { get; set; }

    /// <summary>
    /// Gói hội viên được hưởng khuyến mãi — FK tới member_packages.member_package_id
    /// </summary>
    public long MemberPackageId { get; set; }

    /// <summary>
    /// Hội viên được hưởng — FK tới members.member_id, lưu để truy vấn nhanh
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Gói tập tương ứng — FK tới membership_plans.plan_id, lưu để truy vấn nhanh
    /// </summary>
    public int PlanId { get; set; }

    /// <summary>
    /// Số tiền thực tế được giảm (VNĐ). = 0 nếu loại TangNgay hoặc TangChuKy
    /// </summary>
    public decimal SoTienDaGiam { get; set; }

    /// <summary>
    /// Số ngày thực tế được cộng thêm vào ngày hết hạn. = 0 nếu loại GiamPhanTram hoặc GiamTienMat
    /// </summary>
    public short SoNgayDuocTang { get; set; }

    /// <summary>
    /// Thời điểm khuyến mãi được áp dụng
    /// </summary>
    public DateTime ApDungLuc { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual MemberPackage MemberPackage { get; set; } = null!;

    public virtual MembershipPlan Plan { get; set; } = null!;

    public virtual Promotion Promotion { get; set; } = null!;
}
