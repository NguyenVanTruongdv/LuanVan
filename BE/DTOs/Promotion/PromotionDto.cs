
// Danh sách khuyến mãi hợp lệ cho 1 PlanId cụ thể — trả về cho FE hiển thị dropdown Bước 2

using System.ComponentModel.DataAnnotations;

namespace BE.Dtos.Promotion;

// ===================== KẾT QUẢ PHÂN TRANG DÙNG CHUNG =====================
// Generic để tái sử dụng cho các danh sách khác nếu cần, không chỉ riêng Promotion.
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);
}

// ===================== ITEM HIỂN THỊ TRONG DANH SÁCH (ADMIN) =====================
// Khác với ApplicablePromotionItem (dùng khi áp KM cho khách), item này đầy đủ hơn để
// hiển thị bảng quản lý: kèm trạng thái, số lượt đã dùng/giới hạn, ngày bắt đầu/kết thúc...
public class PromotionListItem
{
    public int PromotionId { get; set; }
    public string TenKhuyenMai { get; set; } = null!;
    public int PlanId { get; set; }
    public string? TenGoiTap { get; set; } // map từ MembershipPlan.TenGoi (nếu Include)
    public string PromoType { get; set; } = null!;
    public decimal? PhanTramGiam { get; set; }
    public decimal? SoTienGiam { get; set; }
    public decimal? MucGiamToiDa { get; set; }
    public short? SoNgayTang { get; set; }
    public sbyte? SoChuKyTang { get; set; }
    public DateTime NgayBatDau { get; set; }
    public DateTime NgayKetThuc { get; set; }
    public int? GioiHanLuot { get; set; }
    public int SoLuotDaDung { get; set; }
    public string TrangThai { get; set; } = null!;
    public string? MoTa { get; set; }
    public long NguoiTao { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// ===================== REQUEST: TẠO KHUYẾN MÃI =====================
public class CreatePromotionRequest
{
    [Required]
    public string TenKhuyenMai { get; set; } = null!;

    [Required]
    public int PlanId { get; set; }

    [Required]
    public string PromoType { get; set; } = null!; // GiamPhanTram | GiamTienMat | TangNgay | TangChuKy

    public decimal? PhanTramGiam { get; set; }
    public decimal? SoTienGiam { get; set; }
    public decimal? MucGiamToiDa { get; set; }
    public short? SoNgayTang { get; set; }
    public sbyte? SoChuKyTang { get; set; }

    [Required]
    public DateTime NgayBatDau { get; set; }

    [Required]
    public DateTime NgayKetThuc { get; set; }
    public int? GioiHanLuot { get; set; }
    public string? MoTa { get; set; }

    // Cho phép tạo sẵn ở trạng thái ẩn nếu muốn (mặc định HoatDong).
    public string TrangThai { get; set; } = "HoatDong";

    // Id nhân viên tạo KM (khóa ngoại tới Employee) — bắt buộc vì Promotion.NguoiTao
    // không nullable trong DB. Controller có thể lấy từ claim đăng nhập thay vì FE
    // truyền tay nếu hệ thống đã có middleware xác thực nhân viên.
    [Required]
    public long NguoiTao { get; set; }
}

// ===================== REQUEST: SỬA KHUYẾN MÃI =====================
// Giống CreatePromotionRequest nhưng tách riêng để sau này có thể thêm/bớt field
// cho phép sửa mà không ảnh hưởng request tạo mới. Không có NguoiTao vì không cho
// đổi lại "người tạo" gốc khi sửa.
public class UpdatePromotionRequest
{
    [Required]
    public string TenKhuyenMai { get; set; } = null!;

    [Required]
    public int PlanId { get; set; }

    [Required]
    public string PromoType { get; set; } = null!;

    public decimal? PhanTramGiam { get; set; }
    public decimal? SoTienGiam { get; set; }
    public decimal? MucGiamToiDa { get; set; }
    public short? SoNgayTang { get; set; }
    public sbyte? SoChuKyTang { get; set; }

    [Required]
    public DateTime NgayBatDau { get; set; }

    [Required]
    public DateTime NgayKetThuc { get; set; }
    public int? GioiHanLuot { get; set; }
    public string? MoTa { get; set; }
    public string TrangThai { get; set; } = "HoatDong";
}

// ===================== REQUEST: ẨN / HIỆN KHUYẾN MÃI =====================
// An = true  -> chuyển TrangThai sang "TamNgung" (ẩn khỏi danh sách áp dụng cho khách,
//               nhưng KHÔNG xóa dữ liệu, vẫn giữ lịch sử SoLuotDaDung / PromotionUsages).
// An = false -> chuyển lại "HoatDong".
public class SetPromotionVisibilityRequest
{
    [Required]
    public bool An { get; set; }
}
public class ApplicablePromotionItem
{
    public int PromotionId { get; set; }
    public string TenKhuyenMai { get; set; } = null!;
    public string PromoType { get; set; } = null!; // GiamPhanTram | GiamTienMat | TangNgay | TangChuKy
    public decimal? PhanTramGiam { get; set; }
    public decimal? SoTienGiam { get; set; }
    public decimal? MucGiamToiDa { get; set; }
    public int? SoNgayTang { get; set; }
    public int? SoChuKyTang { get; set; }
    public string? MoTa { get; set; }
}
public class PromotionUsageHistoryQueryDto
{
    public int? PromotionId { get; set; }
    public long? MemberId { get; set; }
    public int? PlanId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

// 1 dòng lịch sử sử dụng khuyến mãi trả về cho FE
public class PromotionUsageHistoryItem
{
    public long UsageId { get; set; }

    public int PromotionId { get; set; }
    public string TenKhuyenMai { get; set; } = null!;
    public string PromoType { get; set; } = null!;

    public long MemberId { get; set; }
    public string MemberName { get; set; } = null!;

    public long MemberPackageId { get; set; }

    public int PlanId { get; set; }
    public string? TenGoiTap { get; set; }

    public decimal SoTienDaGiam { get; set; }
    public short SoNgayDuocTang { get; set; }

    public DateTime ApDungLuc { get; set; }
}
