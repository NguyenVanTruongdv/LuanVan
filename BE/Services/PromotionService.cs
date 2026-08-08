using BE.Data;
using BE.Dtos.Promotion;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;


public class PromotionService
{
    // 1 chu kỳ = 30 ngày cố định, khớp với hằng số CYCLE_DAYS đang dùng ở
    // MemberPackageService.CalculateBonusDays. Dùng chung 1 hằng số ở đây để lúc map dữ liệu ra
    // cho FE (SoNgayTang tương đương của TangChuKy) không bị lệch với công thức tính thật.
    private const int CYCLE_DAYS = 30;

    // ===== 4 trạng thái, khớp CHÍNH XÁC với CHECK constraint của cột TrangThai trong DB =====
    // 3 trạng thái đầu là TỰ ĐỘNG, tính theo NgayBatDau/NgayKetThuc so với thời điểm hiện tại —
    // KHÔNG cho FE set tuỳ ý. Chỉ TamDung là thao tác THỦ CÔNG do admin chủ động bấm ẩn.
    //
    // [SỬA LỖI] Trước đây code dùng "TamNgung" — SAI CHÍNH TẢ so với giá trị thật trong DB
    // ("TamDung"), có thể gây lỗi khi DB có CHECK constraint chặt cột này.
    private const string STATUS_DRAFT = "NhapLieu";   // Chưa tới ngày bắt đầu
    private const string STATUS_ACTIVE = "HoatDong";   // Đang trong thời gian hiệu lực
    private const string STATUS_PAUSED = "TamDung";    // Admin chủ động tạm dừng (override thủ công)
    private const string STATUS_EXPIRED = "HetHan";    // Đã qua ngày kết thúc

    private readonly GymManagementContext _db;

    public PromotionService(GymManagementContext db)
    {
        _db = db;
    }

    // ===================== TÍNH TRẠNG THÁI TỰ ĐỘNG THEO NGÀY =====================
    // Trung tâm của toàn bộ logic trạng thái — dùng chung cho Create/Update/Sync/Visibility để
    // đảm bảo mọi nơi tính ra cùng 1 kết quả cho cùng 1 bộ ngày. KHÔNG xét TamDung ở đây — việc
    // giữ nguyên TamDung hay không do nơi gọi (caller) tự quyết định.
    private static string ComputeAutoStatus(DateTime ngayBatDau, DateTime ngayKetThuc, DateTime now)
    {
        if (now < ngayBatDau) return STATUS_DRAFT;
        if (now > ngayKetThuc) return STATUS_EXPIRED;
        return STATUS_ACTIVE;
    }

    // ===================== ĐỒNG BỘ LẠI TRẠNG THÁI TỰ ĐỘNG CHO 1 DANH SÁCH =====================
    // Gọi mỗi khi ĐỌC danh sách/chi tiết khuyến mãi (không có cron/background job riêng), để trạng
    // thái lưu trong DB luôn khớp với ngày hiện tại — VD một KM đang NhapLieu mà hôm nay đã tới
    // NgayBatDau thì lần load tiếp theo sẽ tự chuyển thành HoatDong và được lưu lại. Bỏ qua các bản
    // ghi đang TamDung vì đó là override thủ công, không được tự ý đổi.
    private async Task SyncAutoStatusesAsync(List<Promotion> promos)
    {
        var now = DateTime.Now;
        var changed = false;

        foreach (var p in promos)
        {
            if (p.TrangThai == STATUS_PAUSED) continue;

            var computed = ComputeAutoStatus(p.NgayBatDau, p.NgayKetThuc, now);
            if (p.TrangThai != computed)
            {
                p.TrangThai = computed;
                p.UpdatedAt = now;
                changed = true;
            }
        }

        if (changed)
            await _db.SaveChangesAsync();
    }

    // ===================== DANH SÁCH KHUYẾN MÃI ÁP DỤNG ĐƯỢC CHO 1 GÓI (TẠI HIỆN TẠI) =====================
    // Điều kiện lọc theo trạng thái đổi từ "TrangThai == HoatDong" (cứng) sang "TrangThai !=
    // TamDung" — vì kết hợp với 2 điều kiện ngày bên dưới (NgayBatDau <= now && NgayKetThuc >= now)
    // thì việc nằm trong khoảng ngày ĐÃ tự động đồng nghĩa với HoatDong; chỉ cần loại trừ trường hợp
    // admin đã chủ động TamDung. Cách này cũng an toàn hơn nếu vì lý do gì đó dữ liệu TrangThai
    // trong DB chưa kịp đồng bộ (VD chưa ai gọi SyncAutoStatusesAsync cho bản ghi này).
    public async Task<List<ApplicablePromotionItem>> GetApplicablePromotionsAsync(int planId)
    {
        var now = DateTime.Now;

        var promos = await _db.Promotions
            .Where(p => p.PlanId == planId
                    && p.TrangThai != STATUS_PAUSED
                    && p.NgayBatDau <= now
                    && p.NgayKetThuc >= now
                    && (p.GioiHanLuot == null || p.SoLuotDaDung < p.GioiHanLuot))
            .ToListAsync();

        return promos.Select(MapToApplicablePromotionItem).ToList();
    }

    // ===================== DANH SÁCH KHUYẾN MÃI ÁP DỤNG CHO 1 GÓI TẠI 1 THỜI ĐIỂM CỤ THỂ =====================
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
                    && p.TrangThai != STATUS_PAUSED
                    && p.NgayBatDau <= asOf
                    && p.NgayKetThuc >= asOf)
            .ToListAsync();

        return promos.Select(MapToApplicablePromotionItem).ToList();
    }

    // ===================== [MỚI] DANH SÁCH KHUYẾN MÃI (ADMIN) — LỌC TÊN + PHÂN TRANG =====================
    // Dùng cho màn quản lý khuyến mãi: liệt kê TẤT CẢ khuyến mãi (không lọc theo còn hiệu lực hay
    // hết hạn/ẩn hay không — admin cần thấy cả KM đã ẩn/hết hạn để bật lại hoặc xóa), có thể lọc
    // thêm theo planId và/hoặc từ khóa tên, sắp mới nhất lên trước.
    //
    // keyword: so khớp không phân biệt hoa/thường, dùng EF.Functions.Like để đẩy filter xuống DB
    // thay vì load hết về rồi lọc ở memory (quan trọng khi bảng Promotions lớn dần theo thời gian).
    //
    // Sau khi lấy trang dữ liệu, gọi SyncAutoStatusesAsync để đảm bảo TrangThai hiển thị cho admin
    // luôn khớp với ngày hiện tại (NhapLieu -> HoatDong -> HetHan tự chuyển khi tới hạn).
    public async Task<PagedResult<PromotionListItem>> GetPromotionsAsync(
        string? keyword,
        int? planId,
        int page = 1,
        int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;
        if (pageSize > 100) pageSize = 100; // chặn FE lỡ truyền pageSize quá lớn

        var query = _db.Promotions
            .Include(p => p.Plan) // để map TenGoiTap; nếu navigation property tên khác, đổi lại cho khớp
            .AsQueryable();

        if (planId != null)
            query = query.Where(p => p.PlanId == planId);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            query = query.Where(p => EF.Functions.Like(p.TenKhuyenMai, $"%{kw}%"));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.PromotionId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        await SyncAutoStatusesAsync(items);

        return new PagedResult<PromotionListItem>
        {
            Items = items.Select(MapToListItem).ToList(),
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize
        };
    }

    // ===================== [MỚI] LẤY CHI TIẾT 1 KHUYẾN MÃI THEO ID =====================
    public async Task<PromotionListItem> GetPromotionByIdAsync(int promotionId)
    {
        var promo = await _db.Promotions
            .Include(p => p.Plan)
            .FirstOrDefaultAsync(p => p.PromotionId == promotionId);

        if (promo == null)
            throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

        await SyncAutoStatusesAsync(new List<Promotion> { promo });

        return MapToListItem(promo);
    }

    // ===================== MAP Promotion (entity) -> ApplicablePromotionItem (DTO) =====================
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

    // ===================== [MỚI] MAP Promotion (entity) -> PromotionListItem (DTO cho danh sách admin) =====================
    // Khác MapToApplicablePromotionItem ở chỗ: giữ nguyên các cột số liệu THẬT trong DB (không suy
    // ra SoNgayTang tương đương cho TangChuKy), vì đây là màn quản lý — admin cần thấy đúng dữ liệu
    // gốc đang lưu, không phải giá trị diễn giải cho khách.
    private static PromotionListItem MapToListItem(Promotion p)
    {
        return new PromotionListItem
        {
            PromotionId = p.PromotionId,
            TenKhuyenMai = p.TenKhuyenMai,
            PlanId = p.PlanId,
            TenGoiTap = p.Plan?.PlanName, // đổi "TenGoi" nếu tên property thật trên MembershipPlan khác
            PromoType = p.PromoType,
            PhanTramGiam = p.PhanTramGiam,
            SoTienGiam = p.SoTienGiam,
            MucGiamToiDa = p.MucGiamToiDa,
            SoNgayTang = p.SoNgayTang,
            SoChuKyTang = p.SoChuKyTang,
            NgayBatDau = p.NgayBatDau,
            NgayKetThuc = p.NgayKetThuc,
            GioiHanLuot = p.GioiHanLuot,
            SoLuotDaDung = p.SoLuotDaDung,
            TrangThai = p.TrangThai,
            MoTa = p.MoTa,
            NguoiTao = p.NguoiTao,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

    // ===================== [MỚI] TẠO KHUYẾN MÃI MỚI =====================
    // Mọi field cần thiết (TenKhuyenMai, PlanId, PromoType, các cột số liệu tương ứng,
    // NgayBatDau/NgayKetThuc, GioiHanLuot...) được set sẵn trên object `promotion` truyền vào
    // (do Controller map từ DTO request). Hàm này CHỊU TRÁCH NHIỆM validate + TỰ TÍNH TrangThai +
    // lưu — KHÔNG dùng nguyên TrangThai do FE gửi lên, trừ trường hợp FE gửi đúng "TamDung" (nghĩa
    // là admin muốn tạo khuyến mãi ở trạng thái tạm dừng ngay từ đầu).
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

        // Trạng thái: TỰ ĐỘNG tính theo NgayBatDau/NgayKetThuc so với thời điểm tạo, trừ khi FE
        // chủ động gửi "TamDung" (tạo và ẩn ngay).
        promotion.TrangThai = promotion.TrangThai == STATUS_PAUSED
            ? STATUS_PAUSED
            : ComputeAutoStatus(promotion.NgayBatDau, promotion.NgayKetThuc, DateTime.Now);

        promotion.SoLuotDaDung = 0; // luôn bắt đầu từ 0 khi tạo mới, không cho FE tự set
        promotion.CreatedAt = DateTime.Now;
        promotion.UpdatedAt = DateTime.Now;

        _db.Promotions.Add(promotion);
        await _db.SaveChangesAsync();

        return promotion;
    }


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
        promotion.UpdatedAt = DateTime.Now;

        ValidatePromotionData(promotion);

        promotion.TrangThai = updated.TrangThai == STATUS_PAUSED
            ? STATUS_PAUSED
            : ComputeAutoStatus(promotion.NgayBatDau, promotion.NgayKetThuc, DateTime.Now);

        await _db.SaveChangesAsync();

        return promotion;
    }

    public async Task<Promotion> SetPromotionVisibilityAsync(int promotionId, bool an)
    {
        var promotion = await _db.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
        if (promotion == null)
            throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

        promotion.TrangThai = an
            ? STATUS_PAUSED              // an = true (Ẩn)  -> "TamDung"
            : ComputeAutoStatus(promotion.NgayBatDau, promotion.NgayKetThuc, DateTime.Now); // an = false (Hiện) -> tính lại theo ngày
        promotion.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return promotion;
    }
    public async Task DeletePromotionAsync(int promotionId)
    {
        var promotion = await _db.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
        if (promotion == null)
            throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

        if (promotion.SoLuotDaDung > 0)
            throw new InvalidOperationException(
                "Khuyến mãi đã từng được áp dụng (SoLuotDaDung > 0) nên không thể xóa, " +
                "để tránh mất dữ liệu tham chiếu ở các giao dịch cũ. Hãy dùng chức năng ẨN thay thế.");

        _db.Promotions.Remove(promotion);
        await _db.SaveChangesAsync();
    }


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

        if (promotion.NgayKetThuc < promotion.NgayBatDau)
            throw new InvalidOperationException("NgayKetThuc không được nhỏ hơn NgayBatDau.");

        if (promotion.GioiHanLuot != null && promotion.GioiHanLuot <= 0)
            throw new InvalidOperationException("GioiHanLuot (nếu có) phải lớn hơn 0.");
    }
    // ===================== [MỚI] LỊCH SỬ SỬ DỤNG KHUYẾN MÃI =====================

    public async Task<PagedResult<PromotionUsageHistoryItem>> GetPromotionUsageHistoryAsync(
        PromotionUsageHistoryQueryDto query)
    {
        int page = query.Page < 1 ? 1 : query.Page;
        int pageSize = query.PageSize < 1 ? 20 : query.PageSize;
        if (pageSize > 100) pageSize = 100;

        var usageQuery = _db.PromotionUsages
            .Include(u => u.Promotion)
            .Include(u => u.Member)
            .Include(u => u.Plan)
            .AsQueryable();

        if (query.PromotionId != null)
            usageQuery = usageQuery.Where(u => u.PromotionId == query.PromotionId);

        if (query.MemberId != null)
            usageQuery = usageQuery.Where(u => u.MemberId == query.MemberId);

        if (query.PlanId != null)
            usageQuery = usageQuery.Where(u => u.PlanId == query.PlanId);

        if (query.FromDate.HasValue)
        {
            var from = DateTime.SpecifyKind(query.FromDate.Value.Date, DateTimeKind.Unspecified);
            usageQuery = usageQuery.Where(u => u.ApDungLuc >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = DateTime.SpecifyKind(query.ToDate.Value.Date, DateTimeKind.Unspecified).AddDays(1);
            usageQuery = usageQuery.Where(u => u.ApDungLuc < to);
        }

        var totalItems = await usageQuery.CountAsync();

        var records = await usageQuery
            .OrderByDescending(u => u.ApDungLuc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = records.Select(u => new PromotionUsageHistoryItem
        {
            UsageId = u.UsageId,
            PromotionId = u.PromotionId,
            TenKhuyenMai = u.Promotion.TenKhuyenMai,
            PromoType = u.Promotion.PromoType,
            MemberId = u.MemberId,
            MemberName = u.Member.FullName,
            MemberPackageId = u.MemberPackageId,
            PlanId = u.PlanId,
            TenGoiTap = u.Plan?.PlanName,
            SoTienDaGiam = u.SoTienDaGiam,
            SoNgayDuocTang = u.SoNgayDuocTang,
            ApDungLuc = u.ApDungLuc
        }).ToList();

        return new PagedResult<PromotionUsageHistoryItem>
        {
            Items = items,
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize
        };
    }
}