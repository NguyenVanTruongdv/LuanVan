using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Chương trình khuyến mãi do Admin/Manager tạo
/// </summary>
public partial class Promotion
{
    /// <summary>
    /// Mã khuyến mãi — khóa chính tự tăng
    /// </summary>
    public int PromotionId { get; set; }

    /// <summary>
    /// Tên hiển thị chương trình, VD: Giảm 50% Gói PRO tháng 6
    /// </summary>
    public string TenKhuyenMai { get; set; } = null!;

    /// <summary>
    /// Mô tả chi tiết quyền lợi hiển thị cho hội viên
    /// </summary>
    public string? MoTa { get; set; }

    /// <summary>
    /// Loại khuyến mãi: GiamPhanTram=giảm %, GiamTienMat=giảm tiền cố định, TangNgay=tặng N ngày, TangChuKy=tặng N chu kỳ
    /// </summary>
    public string PromoType { get; set; } = null!;

    /// <summary>
    /// [GiamPhanTram] Phần trăm giảm, VD: 50.00 = giảm 50%. NULL nếu không phải loại này
    /// </summary>
    public decimal? PhanTramGiam { get; set; }

    /// <summary>
    /// [GiamPhanTram] Số tiền giảm tối đa (VNĐ). NULL = không giới hạn mức giảm
    /// </summary>
    public decimal? MucGiamToiDa { get; set; }

    /// <summary>
    /// [GiamTienMat] Số tiền giảm cố định (VNĐ). NULL nếu không phải loại này
    /// </summary>
    public decimal? SoTienGiam { get; set; }

    /// <summary>
    /// [TangNgay] Số ngày tặng thêm vào ngày hết hạn. NULL nếu không phải loại này
    /// </summary>
    public short? SoNgayTang { get; set; }

    /// <summary>
    /// [TangChuKy] Số chu kỳ tặng thêm, 1 chu kỳ = duration_days của gói. NULL nếu không phải loại này
    /// </summary>
    public sbyte? SoChuKyTang { get; set; }

    /// <summary>
    /// Thời điểm bắt đầu áp dụng khuyến mãi
    /// </summary>
    public DateTime NgayBatDau { get; set; }

    /// <summary>
    /// Thời điểm kết thúc — sau mốc này không áp dụng nữa
    /// </summary>
    public DateTime NgayKetThuc { get; set; }

    /// <summary>
    /// Tổng số lượt dùng tối đa toàn chương trình. NULL = không giới hạn
    /// </summary>
    public int? GioiHanLuot { get; set; }

    /// <summary>
    /// Số lượt đã dùng, tự tăng mỗi khi khuyến mãi được áp dụng thành công
    /// </summary>
    public int SoLuotDaDung { get; set; }

    /// <summary>
    /// Trạng thái: NhapLieu=đang soạn, HoatDong=đang chạy, TamDung=tạm dừng, HetHan=đã kết thúc
    /// </summary>
    public string TrangThai { get; set; } = null!;

    /// <summary>
    /// Nhân viên (Admin/Manager) tạo chương trình — FK tới employees.employee_id
    /// </summary>
    public long NguoiTao { get; set; }

    /// <summary>
    /// Thời điểm tạo chương trình
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual Employee NguoiTaoNavigation { get; set; } = null!;

    public virtual ICollection<PromotionPlan> PromotionPlans { get; set; } = new List<PromotionPlan>();

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
