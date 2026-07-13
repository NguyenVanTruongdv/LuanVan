using BE.Data;
using BE.Dtos.Promotion;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Chỉ lo phần "khuyến mãi" xét theo góc độ tra cứu/hiển thị + tạo/sửa Promotion.
// Các phần tính hiệu lực khuyến mãi khi tạo giao dịch (giảm giá/tặng ngày) hiện vẫn đang nằm ở
// PackageService (CalculateSoNgayTangThucTeAsync -> nay là MemberPackageService.CalculateBonusDays)
// và TransactionService (CalculatePromotionEffectAsync, RecordPromotionUsage) — chưa gom về đây,
// để tránh động vào nhiều chỗ cùng lúc.
//
// [MỚI - 13/07/2026] Thêm CreatePromotionAsync / UpdatePromotionAsync + ValidatePromotionData.
// Lý do: phát hiện thực tế trong DB có nhiều khuyến mãi "Mua X Tháng Tặng Y Tháng" bị khai NHẦM
// promo_type = "TangNgay" (cộng NGÀY CỐ ĐỊNH bằng AddDays) thay vì đúng ra phải là "TangChuKy"
// (cộng theo CHU KỲ 30 NGÀY CỐ ĐỊNH) — hậu quả là ngày hết hạn tính sai khi admin thực ra muốn
// tặng theo tháng chứ không phải một số ngày lẻ cụ thể.
//
// [FIX - 13/07/2026] Sửa lại mô tả cho đúng bản chất thực tế đang cài đặt: TangChuKy KHÔNG dùng
// AddMonths theo lịch (tháng 28-31 ngày) như ghi chú cũ — bản chất là 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH
// (xem hằng số CYCLE_DAYS trong MemberPackageService.CalculateBonusDays), rồi cộng bằng AddDays.
// Trước đây comment nói "cộng theo tháng lịch bằng AddMonths" là SAI so với code thực tế (code
// đang nhân SoChuKyTang với plan.DurationDays, đã bị fix sang nhân với 30 cố định) — sửa lại
// comment/thông báo cho khớp, tránh gây hiểu nhầm về bản chất của TangChuKy.
//
// [FIX - 13/07/2026] GetApplicablePromotionsAsync / GetApplicablePromotionsAtAsync trước đây trả
// thẳng SoNgayTang/SoChuKyTang y hệt trong DB cho FE. Với promo_type = "TangChuKy" thì SoNgayTang
// trong DB luôn là null (theo ValidatePromotionData, 2 cột này loại trừ nhau) — khiến FE không có
// con số ngày tương đương để hiển thị cho khách/nhân viên. Từ giờ, hàm map dùng chung sẽ:
//   - TangNgay    : giữ nguyên SoNgayTang từ DB, ép SoChuKyTang = null (tường minh, dù DB đã null).
//   - TangChuKy   : ép SoChuKyTang giữ nguyên, và TÍNH RA SoNgayTang = SoChuKyTang * 30 (1 chu kỳ
//                   = 30 ngày cố định, khớp công thức thật đang dùng ở MemberPackageService.
//                   CalculateBonusDays) để FE hiển thị số ngày tương đương, không phải lấy từ DB.
//   - Các loại khác (GiamPhanTram/GiamTienMat): giữ nguyên, cả 2 cột đều null.
//
// Trước đây không có gì chặn việc nhập sai tổ hợp promo_type + các cột số liệu đi kèm ngay từ
// lúc tạo/sửa khuyến mãi — lỗi chỉ lộ ra rất muộn, tận lúc tính hóa đơn cho khách hàng thật.
// Từ giờ, MỌI lần tạo/sửa Promotion phải đi qua ValidatePromotionData trước khi lưu, để:
//   - Đảm bảo đúng bộ cột đi kèm cho từng promo_type (không set nhầm cột của loại khác).
//   - Cảnh báo/CHẶN cứng nếu SoNgayTang là bội số "sạch" của 30 (rất nhiều khả năng người tạo
//     đang muốn tặng theo CHU KỲ/THÁNG chứ không phải ngày lẻ thật) — bắt phải dùng đúng TangChuKy.
public class PromotionService
{
    // 1 chu kỳ = 30 ngày cố định, khớp với hằng số CYCLE_DAYS đang dùng ở
    // MemberPackageService.CalculateBonusDays. Dùng chung 1 hằng số ở đây để lúc map dữ liệu ra
    // cho FE (SoNgayTang tương đương của TangChuKy) không bị lệch với công thức tính thật.
    private const int CYCLE_DAYS = 30;

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

        return promos.Select(MapToApplicablePromotionItem).ToList();
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

        return promos.Select(MapToApplicablePromotionItem).ToList();
    }

    // ===================== [MỚI] MAP Promotion (entity) -> ApplicablePromotionItem (DTO) =====================
    // Dùng chung cho cả GetApplicablePromotionsAsync và GetApplicablePromotionsAtAsync, để đảm bảo
    // 2 hàm luôn trả dữ liệu nhất quán và chỉ cần sửa 1 chỗ nếu sau này đổi quy tắc hiển thị.
    //
    // Quy tắc map SoNgayTang / SoChuKyTang theo PromoType (khác với việc chỉ copy thẳng từ DB):
    //   - TangNgay  : SoNgayTang = giá trị thật trong DB; SoChuKyTang ép cứng = null.
    //   - TangChuKy : SoChuKyTang = giá trị thật trong DB; SoNgayTang KHÔNG lấy từ DB (DB đang lưu
    //                 null cho loại này) mà TÍNH RA = SoChuKyTang * CYCLE_DAYS, để FE có số ngày
    //                 tương đương hiển thị cho khách (VD SoChuKyTang = 2 -> SoNgayTang = 60).
    //   - Các loại khác (GiamPhanTram/GiamTienMat): cả 2 cột đều null, giữ nguyên như DB.
    private static ApplicablePromotionItem MapToApplicablePromotionItem(Promotion p)
    {
        int? soNgayTang;
        int? soChuKyTang;

        switch (p.PromoType)
        {
            case "TangNgay":
                soNgayTang = p.SoNgayTang;
                soChuKyTang = null;
                break;

            case "TangChuKy":
                soChuKyTang = p.SoChuKyTang;
                soNgayTang = p.SoChuKyTang != null ? p.SoChuKyTang.Value * CYCLE_DAYS : null;
                break;

            default:
                soNgayTang = null;
                soChuKyTang = null;
                break;
        }

        return new ApplicablePromotionItem
        {
            PromotionId = p.PromotionId,
            TenKhuyenMai = p.TenKhuyenMai,
            PromoType = p.PromoType,
            PhanTramGiam = p.PhanTramGiam,
            SoTienGiam = p.SoTienGiam,
            MucGiamToiDa = p.MucGiamToiDa,
            SoNgayTang = soNgayTang,
            SoChuKyTang = soChuKyTang,
            MoTa = p.MoTa
        };
    }

    // ===================== [MỚI] TẠO KHUYẾN MÃI MỚI =====================
    // Mọi field cần thiết (TenKhuyenMai, PlanId, PromoType, các cột số liệu tương ứng,
    // NgayBatDau/NgayKetThuc, GioiHanLuot...) được set sẵn trên object `promotion` truyền vào
    // (do Controller map từ DTO request). Hàm này CHỈ chịu trách nhiệm validate + lưu.
    //
    // Ném InvalidOperationException nếu dữ liệu không hợp lệ theo ValidatePromotionData bên dưới —
    // Controller nên bắt exception này và trả về lỗi 400 kèm message cho FE hiển thị.
    public async Task<Promotion> CreatePromotionAsync(Promotion promotion)
    {
        if (promotion.PlanId <= 0)
            throw new InvalidOperationException("Khuyến mãi phải gắn với 1 gói tập hợp lệ (PlanId).");

        var planExists = await _db.MembershipPlans.AnyAsync(p => p.PlanId == promotion.PlanId);
        if (!planExists)
            throw new KeyNotFoundException("Không tìm thấy gói tập tương ứng với PlanId đã chọn.");

        ValidatePromotionData(promotion);

        promotion.SoLuotDaDung = 0; // luôn bắt đầu từ 0 khi tạo mới, không cho FE tự set

        _db.Promotions.Add(promotion);
        await _db.SaveChangesAsync();

        return promotion;
    }

    // ===================== [MỚI] SỬA KHUYẾN MÃI ĐÃ CÓ =====================
    // `updated` chứa các giá trị MỚI muốn ghi đè (do Controller map từ DTO request). Hàm này tự
    // load bản ghi gốc, ghi đè các field cho phép sửa, validate lại TOÀN BỘ tổ hợp field SAU khi
    // ghi đè (không chỉ validate riêng field vừa đổi) — vì đổi promo_type mà không đổi kèm các
    // cột số liệu tương ứng cũng phải bị chặn y như lúc tạo mới.
    //
    // KHÔNG cho sửa SoLuotDaDung qua đường này (cột đếm dồn, chỉ được tăng/giảm bởi
    // TransactionService.RecordPromotionUsage / hoàn lượt khi điều chỉnh giao dịch).
    public async Task<Promotion> UpdatePromotionAsync(int promotionId, Promotion updated)
    {
        var promotion = await _db.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
        if (promotion == null)
            throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

        if (updated.PlanId != promotion.PlanId)
        {
            var planExists = await _db.MembershipPlans.AnyAsync(p => p.PlanId == updated.PlanId);
            if (!planExists)
                throw new KeyNotFoundException("Không tìm thấy gói tập tương ứng với PlanId mới.");
        }

        promotion.TenKhuyenMai = updated.TenKhuyenMai;
        promotion.MoTa = updated.MoTa;
        promotion.PlanId = updated.PlanId;
        promotion.PromoType = updated.PromoType;
        promotion.PhanTramGiam = updated.PhanTramGiam;
        promotion.MucGiamToiDa = updated.MucGiamToiDa;
        promotion.SoTienGiam = updated.SoTienGiam;
        promotion.SoNgayTang = updated.SoNgayTang;
        promotion.SoChuKyTang = updated.SoChuKyTang;
        promotion.NgayBatDau = updated.NgayBatDau;
        promotion.NgayKetThuc = updated.NgayKetThuc;
        promotion.GioiHanLuot = updated.GioiHanLuot;
        promotion.TrangThai = updated.TrangThai;
        // SoLuotDaDung: KHÔNG copy từ `updated` — giữ nguyên giá trị đang đếm dồn trong DB.

        ValidatePromotionData(promotion);

        await _db.SaveChangesAsync();

        return promotion;
    }

    // ===================== [MỚI] VALIDATE DỮ LIỆU KHUYẾN MÃI THEO ĐÚNG promo_type =====================
    // Dùng chung cho cả Create và Update, gọi NGAY TRƯỚC KHI SaveChanges. Mục tiêu: chặn đứng các
    // tổ hợp dữ liệu vô lý/nhầm loại ngay từ lúc nhập liệu, thay vì để lỗi trôi tới tận lúc tính
    // ngày hết hạn / giá tiền cho một giao dịch thật của khách hàng.
    //
    // Quy tắc:
    //   - GiamPhanTram: BẮT BUỘC có PhanTramGiam > 0; KHÔNG được set SoTienGiam/SoNgayTang/SoChuKyTang.
    //   - GiamTienMat : BẮT BUỘC có SoTienGiam > 0; KHÔNG được set PhanTramGiam/SoNgayTang/SoChuKyTang.
    //   - TangNgay    : BẮT BUỘC có SoNgayTang > 0; KHÔNG được set PhanTramGiam/SoTienGiam/SoChuKyTang.
    //                   Nếu SoNgayTang là bội số "sạch" của 30 (30, 60, 90, 120...) -> rất có
    //                   khả năng người tạo đang MUỐN tặng theo CHU KỲ (1 chu kỳ = 30 ngày cố định,
    //                   nên dùng TangChuKy với SoChuKyTang tương ứng), không phải ngày lẻ thật ->
    //                   NÉM LỖI, bắt sửa lại đúng loại thay vì lặng lẽ cho qua và tái diễn bug đã gặp.
    //   - TangChuKy   : BẮT BUỘC có SoChuKyTang > 0; KHÔNG được set PhanTramGiam/SoTienGiam/SoNgayTang.
    //                   Số ngày tặng thực tế = SoChuKyTang × 30 (1 chu kỳ = 30 ngày CỐ ĐỊNH, xem
    //                   MemberPackageService.CalculateBonusDays — KHÔNG phụ thuộc DurationDays của
    //                   gói đang mua, và KHÔNG dùng AddMonths theo lịch).
    private static void ValidatePromotionData(Promotion promotion)
    {
        switch (promotion.PromoType)
        {
            case "GiamPhanTram":
                if (promotion.PhanTramGiam == null || promotion.PhanTramGiam <= 0)
                    throw new InvalidOperationException("Khuyến mãi 'Giảm %' phải có PhanTramGiam > 0.");
                if (promotion.SoTienGiam != null || promotion.SoNgayTang != null || promotion.SoChuKyTang != null)
                    throw new InvalidOperationException(
                        "Khuyến mãi 'Giảm %' không được có SoTienGiam/SoNgayTang/SoChuKyTang.");
                break;

            case "GiamTienMat":
                if (promotion.SoTienGiam == null || promotion.SoTienGiam <= 0)
                    throw new InvalidOperationException("Khuyến mãi 'Giảm tiền mặt' phải có SoTienGiam > 0.");
                if (promotion.PhanTramGiam != null || promotion.SoNgayTang != null || promotion.SoChuKyTang != null)
                    throw new InvalidOperationException(
                        "Khuyến mãi 'Giảm tiền mặt' không được có PhanTramGiam/SoNgayTang/SoChuKyTang.");
                break;

            case "TangNgay":
                if (promotion.SoNgayTang == null || promotion.SoNgayTang <= 0)
                    throw new InvalidOperationException("Khuyến mãi 'Tặng ngày' phải có SoNgayTang > 0.");
                if (promotion.PhanTramGiam != null || promotion.SoTienGiam != null || promotion.SoChuKyTang != null)
                    throw new InvalidOperationException(
                        "Khuyến mãi 'Tặng ngày' không được có PhanTramGiam/SoTienGiam/SoChuKyTang.");

                // Chặn phòng vệ: SoNgayTang là bội số "sạch" của 30 (>= 30) rất có khả năng admin
                // đang muốn tặng theo CHU KỲ (30 ngày/chu kỳ), không phải ngày lẻ thật. Nếu để lọt
                // qua sẽ tái diễn đúng bug đã gặp thực tế (khai nhầm TangNgay=90 thay vì
                // TangChuKy=3).
                if (promotion.SoNgayTang.Value >= 30 && promotion.SoNgayTang.Value % 30 == 0)
                    throw new InvalidOperationException(
                        $"SoNgayTang = {promotion.SoNgayTang} là bội số của 30 — có vẻ bạn đang " +
                        "muốn tặng theo CHU KỲ chứ không phải ngày lẻ. Hãy dùng loại 'TangChuKy' với " +
                        "SoChuKyTang tương ứng (1 chu kỳ = 30 ngày cố định), để tránh nhầm lẫn về sau.");
                break;

            case "TangChuKy":
                if (promotion.SoChuKyTang == null || promotion.SoChuKyTang <= 0)
                    throw new InvalidOperationException("Khuyến mãi 'Tặng chu kỳ' phải có SoChuKyTang > 0.");
                if (promotion.PhanTramGiam != null || promotion.SoTienGiam != null || promotion.SoNgayTang != null)
                    throw new InvalidOperationException(
                        "Khuyến mãi 'Tặng chu kỳ' không được có PhanTramGiam/SoTienGiam/SoNgayTang.");
                break;

            default:
                throw new InvalidOperationException(
                    $"Loại khuyến mãi không hợp lệ: '{promotion.PromoType}'. Chỉ chấp nhận: " +
                    "GiamPhanTram, GiamTienMat, TangNgay, TangChuKy.");
        }

        if (promotion.NgayKetThuc != null && promotion.NgayKetThuc < promotion.NgayBatDau)
            throw new InvalidOperationException("NgayKetThuc không được nhỏ hơn NgayBatDau.");

        if (promotion.GioiHanLuot != null && promotion.GioiHanLuot <= 0)
            throw new InvalidOperationException("GioiHanLuot (nếu có) phải lớn hơn 0.");
    }
}