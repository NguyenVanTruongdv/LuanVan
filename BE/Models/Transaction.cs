using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Giao dịch thanh toán mua hoặc gia hạn gói tập
/// </summary>
public partial class Transaction
{
    /// <summary>
    /// Mã giao dịch — khóa chính tự tăng
    /// </summary>
    public long TransactionId { get; set; }

    /// <summary>
    /// Hội viên thực hiện giao dịch — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Chi nhánh xử lý giao dịch — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Gói tập được mua trong giao dịch này — FK tới membership_plans.plan_id
    /// </summary>
    public int PlanId { get; set; }

    /// <summary>
    /// Loại giao dịch: NewPurchase = mua mới, Renewal = gia hạn
    /// </summary>
    public string TransactionType { get; set; } = null!;

    /// <summary>
    /// Phương thức thanh toán: Cash = tiền mặt, BankTransfer = chuyển khoản
    /// </summary>
    public string PaymentMethod { get; set; } = null!;

    /// <summary>
    /// Trạng thái thanh toán: Pending=chờ xác nhận, Paid=đã thanh toán, Failed=thất bại
    /// </summary>
    public string PaymentStatus { get; set; } = null!;

    /// <summary>
    /// Giá niêm yết của gói trước khi áp khuyến mãi (VNĐ)
    /// </summary>
    public decimal GiaGoc { get; set; }

    /// <summary>
    /// Số tiền thực thu sau khi áp khuyến mãi (VNĐ). Bằng gia_goc nếu không có KM
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// URL ảnh biên lai / chứng từ chuyển khoản lưu trên S3
    /// </summary>
    public string? ReceiptImage { get; set; }

    /// <summary>
    /// Thời điểm tạo giao dịch
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Nhân viên tạo giao dịch, NULL nếu khách tự mua
    /// </summary>
    public long? EmployeeId { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Employee? Employee { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual MembershipPlan Plan { get; set; } = null!;
}
