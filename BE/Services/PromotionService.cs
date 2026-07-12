using BE.Data;
using BE.Dtos.Promotion;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Chỉ lo phần "khuyến mãi" xét theo góc độ tra cứu/hiển thị.
// Các phần tính hiệu lực khuyến mãi khi tạo giao dịch (giảm giá/tặng ngày) hiện vẫn đang nằm ở
// PackageService (CalculateSoNgayTangThucTeAsync) và TransactionService (CalculatePromotionEffectAsync,
// RecordPromotionUsage) — chưa gom về đây, để tránh động vào nhiều chỗ cùng lúc.
public class PromotionService
{
    private readonly GymManagementContext _db;

    public PromotionService(GymManagementContext db)
    {
        _db = db;
    }

    // ===================== DANH SÁCH KHUYẾN MÃI ÁP DỤNG ĐƯỢC CHO 1 GÓI (TẠI HIỆN TẠI) =====================
    public async Task<List<ApplicablePromotionItem>> GetApplicablePromotionsAsync(int planId)
    {
        var now = DateTime.Now;

        var promos = await _db.Promotions
            .Where(p => p.PlanId == planId
                    && p.TrangThai == "HoatDong"
                    && p.NgayBatDau <= now
                    && (p.NgayKetThuc == null || p.NgayKetThuc >= now)
                    && (p.GioiHanLuot == null || p.SoLuotDaDung < p.GioiHanLuot))
            .ToListAsync();

        return promos.Select(p => new ApplicablePromotionItem
        {
            PromotionId = p.PromotionId,
            TenKhuyenMai = p.TenKhuyenMai,
            PromoType = p.PromoType,
            PhanTramGiam = p.PhanTramGiam,
            SoTienGiam = p.SoTienGiam,
            MucGiamToiDa = p.MucGiamToiDa,
            SoNgayTang = p.SoNgayTang,
            SoChuKyTang = p.SoChuKyTang,
            MoTa = p.MoTa
        }).ToList();
    }

    // ===================== [MỚI] DANH SÁCH KHUYẾN MÃI ÁP DỤNG CHO 1 GÓI TẠI 1 THỜI ĐIỂM CỤ THỂ =====================
    // Dùng khi cần biết những KM nào ĐÃ TỪNG hợp lệ tại thời điểm giao dịch gốc được tạo (asOf),
    // thay vì tại thời điểm gọi hàm (now). Ca dùng chính: hiển thị cho nhân viên chọn lại KM khi
    // điều chỉnh 1 giao dịch cũ — tránh trường hợp KM đã hết hạn Ở HIỆN TẠI bị loại khỏi danh sách,
    // dù tại lúc giao dịch gốc được tạo nó vẫn còn hiệu lực.
    //
    // [LƯU Ý QUAN TRỌNG] Điều kiện GioiHanLuot/SoLuotDaDung KHÔNG được áp dụng ở đây, vì
    // SoLuotDaDung là số đếm DỒN TỚI HIỆN TẠI, không thể suy ngược chính xác giá trị của nó tại
    // một thời điểm trong quá khứ. Nếu cần chặt chẽ tuyệt đối (biết chính xác KM đã hết lượt hay
    // chưa tại asOf), phải đếm lại từ PromotionUsages.ApDungLuc <= asOf thay vì dùng SoLuotDaDung —
    // nhắn lại nếu bạn cần bản này.
    public async Task<List<ApplicablePromotionItem>> GetApplicablePromotionsAtAsync(int planId, DateTime asOf)
    {
        var promos = await _db.Promotions
            .Where(p => p.PlanId == planId
                    && p.TrangThai == "HoatDong"
                    && p.NgayBatDau <= asOf
                    && (p.NgayKetThuc == null || p.NgayKetThuc >= asOf))
            .ToListAsync();

        return promos.Select(p => new ApplicablePromotionItem
        {
            PromotionId = p.PromotionId,
            TenKhuyenMai = p.TenKhuyenMai,
            PromoType = p.PromoType,
            PhanTramGiam = p.PhanTramGiam,
            SoTienGiam = p.SoTienGiam,
            MucGiamToiDa = p.MucGiamToiDa,
            SoNgayTang = p.SoNgayTang,
            SoChuKyTang = p.SoChuKyTang,
            MoTa = p.MoTa
        }).ToList();
    }
}