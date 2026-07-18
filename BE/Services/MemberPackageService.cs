using BE.Data;
using BE.Dtos.MemberPackage;
using BE.DTOs.Payment;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class MemberPackageService
{
    // ===================== [FIX] ĐỘ DÀI 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH =====================
    // Theo đúng định nghĩa nghiệp vụ: TangChuKy không ăn theo DurationDays của gói đang mua.
    // Nếu sau này nghiệp vụ đổi định nghĩa "1 chu kỳ", CHỈ cần sửa hằng số này ở 1 chỗ duy nhất.
    // [FIX] Đổi private -> public để PromotionService (và bất kỳ nơi nào khác cần hiển thị/suy ra
    // số ngày tương đương của 1 chu kỳ) tham chiếu thẳng, KHÔNG tự khai báo hằng số trùng lặp nữa.
    public const int CYCLE_DAYS = 30;

    // ===================== [MỚI] PHÂN LOẠI GÓI: NỘI BỘ (nhân viên) vs KHÁCH HÀNG =====================
    // [GIẢ ĐỊNH] MembershipPlan cần thêm cột PlanType (string, NOT NULL), giá trị là 1 trong 2
    // hằng số dưới đây. Member đang dùng 1 gói có PlanType = PLAN_TYPE_INTERNAL thì được gọi là
    // "nhân viên" (theo đúng nghiệp vụ bạn mô tả). Đây là điểm mình PHẢI giả định vì chưa thấy
    // model MembershipPlan — nếu tên cột/giá trị khác, đổi lại 2 hằng số này là đủ, phần logic
    // bên dưới không phụ thuộc vào tên chuỗi cụ thể.
    public const string PLAN_TYPE_INTERNAL = "Internal";
    public const string PLAN_TYPE_CUSTOMER = "Customer";

    // [MỚI] Trạng thái gói nội bộ sau khi bị ngưng dùng (khác "Active"/"PendingActivation" hiện có).
    public const string STATUS_CANCELED = "Canceled";

    private readonly GymManagementContext _db;

    public MemberPackageService(GymManagementContext db)
    {
        _db = db;
    }

    // ===================== TÍNH SoNgayTangThucTe — CÔNG THỨC DUY NHẤT =====================
    // Nhận thẳng Promotion đã có sẵn (do MemberService đã validate + fetch trước đó) — tránh query
    // DB thừa.
    //   TangNgay    -> SoNgayTang                       (cộng thẳng số ngày đã khai)
    //   TangChuKy   -> SoChuKyTang × CYCLE_DAYS (=30)    (cộng theo chu kỳ 30 ngày CỐ ĐỊNH,
    //                                                     KHÔNG dùng plan.DurationDays)
    //   còn lại/không KM (GiamPhanTram/GiamTienMat/null) -> 0, vì 2 loại giảm giá KHÔNG tặng ngày,
    //   chỉ ảnh hưởng tới giá — xem CalculateDiscountedAmount bên dưới cho phần đó.
    //
    // [KHÔNG ĐỔI] Khuyến mãi áp dụng như cũ cho MỌI loại gói (nội bộ lẫn khách hàng) — nghiệp vụ
    // gói nội bộ/khách hàng chỉ ảnh hưởng tới việc TÍNH START/EXPIRY DATE (track nào nối hạn với
    // track nào) và việc reset khi ngưng gói nội bộ, KHÔNG ảnh hưởng gì tới công thức KM.
    public short CalculateBonusDays(Promotion? promotion, MembershipPlan plan)
    {
        if (promotion == null)
            return 0;

        return promotion.PromoType switch
        {
            "TangNgay" => (short)(promotion.SoNgayTang ?? 0),
            "TangChuKy" => (short)((promotion.SoChuKyTang ?? 0) * CYCLE_DAYS), // [FIX] 30 ngày/chu kỳ, không phải plan.DurationDays
            _ => 0
        };
    }

    // ===================== [MỚI] TÍNH GIÁ SAU GIẢM — CÔNG THỨC DUY NHẤT =====================
    // Cặp song song với CalculateBonusDays ở trên: hàm đó lo phần "tặng ngày" (TangNgay/TangChuKy),
    // hàm này lo phần "giảm giá" (GiamPhanTram/GiamTienMat). Vì 2 nhóm promo_type loại trừ nhau
    // (theo PromotionService.ValidatePromotionData), 1 Promotion chỉ bao giờ đi vào ĐÚNG 1 trong 2
    // hàm và có tác dụng thật.
    //
    //   GiamTienMat  -> giaGoc - SoTienGiam                       (giảm thẳng 1 số tiền cố định)
    //   GiamPhanTram -> giaGoc - (giaGoc × PhanTramGiam / 100),
    //                   nếu có MucGiamToiDa thì số tiền giảm KHÔNG được vượt quá mức này
    //                   (áp trần giảm tối đa, ví dụ giảm 50% nhưng tối đa 500.000đ)
    //   TangNgay/TangChuKy/null -> giữ nguyên giaGoc (2 loại này không giảm giá, chỉ tặng ngày —
    //                   phần đó đã được CalculateBonusDays xử lý riêng)
    //
    // Kết quả luôn được chặn không cho âm (giảm nhiều hơn giá gốc thì amount = 0), tránh trường
    // hợp KM cấu hình sai (VD SoTienGiam lớn hơn giá gói) làm giao dịch ra số tiền âm.
    public decimal CalculateDiscountedAmount(Promotion? promotion, decimal giaGoc)
    {
        if (promotion == null)
            return giaGoc;

        decimal amount;

        switch (promotion.PromoType)
        {
            case "GiamTienMat":
                amount = giaGoc - (promotion.SoTienGiam ?? 0);
                break;

            case "GiamPhanTram":
                var soTienGiam = giaGoc * (promotion.PhanTramGiam ?? 0) / 100m;
                if (promotion.MucGiamToiDa.HasValue && soTienGiam > promotion.MucGiamToiDa.Value)
                    soTienGiam = promotion.MucGiamToiDa.Value;
                amount = giaGoc - soTienGiam;
                break;

            default:
                // TangNgay / TangChuKy / loại lạ -> không giảm giá, giữ nguyên giá gốc.
                return giaGoc;
        }

        return amount < 0 ? 0 : amount;
    }

    // ===================== TÍNH NGÀY HẾT HẠN — DÙNG CHUNG MỌI LUỒNG =====================
    // expiryDate = startDate + plan.DurationDays + bonusDays (bonusDays lấy từ CalculateBonusDays).
    // Gom lại để mọi nơi cộng ngày đều theo đúng 1 công thức, tránh chỗ này AddDays(a+b), chỗ kia
    // AddDays(a).AddDays(b) rồi lỡ quên 1 phần.
    //
    // [LƯU Ý] Đây là hàm DUY NHẤT được phép cộng ngày kiểu này trong toàn hệ thống — kể cả những
    // chỗ chỉ cần một con số ƯỚC TÍNH (VD dữ liệu in hóa đơn tạm cho gói PendingActivation, chưa
    // có MemberPackage thật để gọi) cũng PHẢI gọi hàm này thay vì tự viết lại AddDays(a + b) inline,
    // xem PaymentService.HandleWebhookAsync để biết ví dụ đã sửa theo đúng quy tắc này.
    // Cũng được SuspendInternalPackageAsync bên dưới tái sử dụng khi reset lại gói khách hàng.
    public DateOnly CalculateExpiryDate(DateOnly startDate, MembershipPlan plan, short bonusDays)
    {
        return startDate.AddDays(plan.DurationDays + bonusDays);
    }

    // ===================== [MỚI] KIỂM TRA CHI NHÁNH HỢP LỆ =====================
    // Dùng khi branchId đến từ nguồn KHÔNG đáng tin cậy tuyệt đối (FE gửi lên lúc mua online).
    // Luồng tại quầy lấy branchId từ Employee.Branches nên không cần gọi lại hàm này.
    public async Task EnsureBranchExistsAsync(int branchId)
    {
        var exists = await _db.Branches.AnyAsync(b => b.BranchId == branchId);
        if (!exists)
            throw new KeyNotFoundException("Không tìm thấy chi nhánh.");
    }

    // ===================== LẤY GÓI GẦN NHẤT ĐÃ CÓ NGÀY (dùng để tính nối hạn) =====================
    // CHỈ xét các gói KHÔNG ở trạng thái PendingActivation — gói Pending chưa có ExpiryDate nên
    // không có ý nghĩa khi so sánh "còn hạn hay không" cho việc gia hạn/nối hạn.
    //
    // [MỚI] planType: từ khi có gói nội bộ chạy SONG SONG với gói khách hàng, 1 hội viên có thể có
    // 2 "track" gói riêng biệt (nội bộ / khách hàng) tồn tại cùng lúc.
    //   - Truyền planType CỤ THỂ (PLAN_TYPE_INTERNAL / PLAN_TYPE_CUSTOMER) khi cần NỐI HẠN —
    //     nối hạn PHẢI tính riêng theo từng track, gói nội bộ chỉ nối vào gói nội bộ trước đó,
    //     gói khách hàng chỉ nối vào gói khách hàng trước đó (xem RenewMembershipAsync,
    //     CreateActivePackageForCustomerAsync).
    //   - Truyền null khi chỉ cần biết "hội viên còn gói nào chưa hết hạn không", KHÔNG quan tâm
    //     track (VD MemberService.ActivateFaceIdOnlyAsync — kích hoạt FaceID chỉ cần hội viên có
    //     ÍT NHẤT 1 gói còn hạn, bất kể nội bộ hay khách hàng) -> không lọc theo Plan.PlanType.
    public async Task<MemberPackage?> GetLatestPackageAsync(long memberId, string? planType = null)
    {
        var query = _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus != "PendingActivation");

        if (planType != null)
            query = query.Where(p => p.Plan.PlanType == planType);

        return await query.OrderByDescending(p => p.ExpiryDate).FirstOrDefaultAsync();
    }

    // ===================== LẤY GÓI ĐANG CHỜ KÍCH HOẠT (mua online, chưa qua quầy) =====================
    // [MỚI] Ràng buộc "tối đa 1 gói Pending" giờ áp dụng THEO TỪNG TRACK (nội bộ / khách hàng),
    // không còn chặn chéo — hội viên có thể vừa có 1 gói khách hàng Pending vừa có 1 gói nội bộ
    // Pending cùng lúc (2 track độc lập). Việc lọc theo track được thực hiện ở nơi gọi thông qua
    // CreatePendingPackageAsync (xem bên dưới); hàm GetPendingPackageAsync này để lấy 1 gói Pending
    // cụ thể theo track khi cần (VD PaymentService biết trước đang xử lý gói loại gì).
    public async Task<MemberPackage?> GetPendingPackageAsync(long memberId, string? planType = null)
    {
        var query = _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation");

        if (planType != null)
            query = query.Where(p => p.Plan.PlanType == planType);

        return await query.OrderByDescending(p => p.CreatedAt).FirstOrDefaultAsync();
    }

    // ===================== QUYẾT ĐỊNH NGÀY BẮT ĐẦU (gia hạn) =====================
    // latestPackage truyền vào luôn lấy từ GetLatestPackageAsync (đã loại Pending, đã lọc đúng
    // track) nên ExpiryDate ở đây luôn có giá trị thật -> trả về DateOnly không nullable, không
    // cần xử lý null phía sau.
    public (DateOnly StartDate, bool IsExtending) DetermineStartDate(MemberPackage? latestPackage, DateOnly today)
    {
        var isExtending = latestPackage != null
            && latestPackage.PackageStatus == "Active"
            && latestPackage.ExpiryDate.HasValue
            && latestPackage.ExpiryDate.Value >= today;

        var startDate = isExtending ? latestPackage!.ExpiryDate!.Value : today;
        return (startDate, isExtending);
    }

    // ===================== [THU NGÂN] TẠO GÓI TẬP ACTIVE NGAY =====================
    // Dùng khi gói được bán/kích hoạt tại quầy: tạo hội viên mới, kích hoạt gói+FaceID, gia hạn tại quầy.
    // Luôn có StartDate/ExpiryDate ngay tại thời điểm tạo -> PackageStatus mặc định "Active".
    // KHÔNG đụng gói cũ — luôn insert mới, giữ nguyên lịch sử các gói trước.
    // branchId: chi nhánh của nhân viên thu ngân thực hiện (lấy từ Employee.Branches ở service gọi vào).
    //
    // LƯU Ý: amount và bonusDays truyền vào đây PHẢI đã được tính sẵn qua CalculateDiscountedAmount
    // / CalculateBonusDays ở nơi gọi (MemberService/TransactionService) — hàm này không tự tính
    // lại từ Promotion, chỉ nhận giá trị cuối để lưu, tránh phải query lại Promotion/Plan ở đây.
    //
    // [KHÔNG ĐỔI] Hàm này KHÔNG cần biết gói là nội bộ hay khách hàng — nó chỉ insert, việc phân
    // track (nối hạn theo đúng track nào) đã được xử lý TRƯỚC khi gọi vào đây, ở nơi tính
    // startDate/expiryDate (xem CreateActivePackageForCustomerAsync bên dưới).
    public async Task<MemberPackage> CreateActivePackageAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        DateOnly startDate, DateOnly expiryDate,
        long transactionId, int branchId, string packageStatus = "Active")
    {
        var now = DateTime.UtcNow;

        var memberPackage = new MemberPackage
        {
            MemberId = memberId,
            TransactionId = transactionId,
            PlanId = planId,
            PromotionId = promotionId,
            BranchId = branchId,
            GiaGoc = giaGoc,
            Amount = amount,
            SoNgayTangThucTe = bonusDays,
            StartDate = startDate,
            ExpiryDate = expiryDate,
            PackageStatus = packageStatus,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.MemberPackages.Add(memberPackage);
        await _db.SaveChangesAsync(); // cần MemberPackageId cho PromotionUsage bên ngoài

        return memberPackage;
    }

    // ===================== [KHÁCH HÀNG] TẠO GÓI TẬP CHỜ KÍCH HOẠT (mua online) =====================
    // Dùng khi khách mua gói online lúc tài khoản còn PendingActivation: CHƯA biết ngày kích hoạt
    // nên StartDate/ExpiryDate = null. PackageStatus = "PendingActivation".
    // Ràng buộc: 1 tài khoản chỉ được có TỐI ĐA 1 gói đang ở trạng thái PendingActivation
    // [MỚI] — TÍNH THEO TỪNG TRACK (nội bộ / khách hàng), không chặn chéo giữa 2 loại.
    // PaymentService (webhook xác nhận thanh toán) gọi hàm này khi Member.Status == "PendingActivation".
    // branchId: chi nhánh khách TỰ CHỌN lúc mua online (FE gửi lên, PaymentService lưu tạm vào
    // Transaction.BranchId ngay lúc tạo QR, rồi đọc lại và truyền xuống đây khi webhook báo Paid).
    //
    // LƯU Ý: amount/bonusDays cũng PHẢI tính sẵn qua CalculateDiscountedAmount/CalculateBonusDays
    // ở nơi gọi, GIỐNG CreateActivePackageAsync ở trên — dù StartDate/ExpiryDate chưa xác định,
    // giá và số ngày tặng vẫn phải CHỐT ngay lúc mua (không đợi tới lúc kích hoạt), vì đây là số
    // tiền khách đã thanh toán thật.
    public async Task<MemberPackage> CreatePendingPackageAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        var plan = await _db.MembershipPlans.FindAsync(planId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói tập.");

        var alreadyPending = await _db.MemberPackages
            .Include(p => p.Plan)
            .AnyAsync(p => p.MemberId == memberId
                        && p.PackageStatus == "PendingActivation"
                        && p.Plan.PlanType == plan.PlanType);
        if (alreadyPending)
            throw new InvalidOperationException(
                "Hội viên đã có một gói tập đang chờ kích hoạt. Vui lòng hoàn tất kích hoạt tại quầy trước khi mua gói khác.");

        var now = DateTime.UtcNow;

        var memberPackage = new MemberPackage
        {
            MemberId = memberId,
            TransactionId = transactionId,
            PlanId = planId,
            PromotionId = promotionId,
            BranchId = branchId,
            GiaGoc = giaGoc,
            Amount = amount,
            SoNgayTangThucTe = bonusDays,
            StartDate = null,
            ExpiryDate = null,
            PackageStatus = "PendingActivation",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.MemberPackages.Add(memberPackage);
        await _db.SaveChangesAsync();

        return memberPackage;
    }

    // ===================== [THU NGÂN] KÍCH HOẠT GÓI ĐÃ MUA ONLINE =====================
    // Chuyển gói PendingActivation (mua online) sang Active tại thời điểm khách đến quầy kích hoạt:
    // StartDate = ngày kích hoạt, ExpiryDate = StartDate + DurationDays (của Plan) + SoNgayTangThucTe
    // (số ngày tặng đã chốt lúc mua online, KHÔNG tính lại khuyến mãi ở đây).
    // Dùng CalculateExpiryDate thay vì tự viết AddDays(...) inline, cho đồng nhất công thức
    // với các luồng khác — KHÔNG đổi kết quả, chỉ đổi chỗ viết công thức.
    // KHÔNG đụng vào BranchId — giữ nguyên chi nhánh khách đã chọn lúc mua online, dù nhân viên
    // đứng kích hoạt thuộc chi nhánh khác.
    // KHÔNG đụng vào Amount/GiaGoc — giá đã chốt xong lúc mua online (CreatePendingPackageAsync),
    // kích hoạt chỉ xác định ngày, không tính lại giá.
    // Không tự SaveChanges — để MemberService gộp chung 1 lần SaveChanges với các thay đổi khác
    // (Member.Status, log kích hoạt...) trong cùng 1 giao dịch nghiệp vụ.
    public async Task<MemberPackage> ActivatePendingPackageAsync(MemberPackage pendingPackage, DateOnly activationDate)
    {
        if (pendingPackage.PackageStatus != "PendingActivation")
            throw new InvalidOperationException("Gói tập này không ở trạng thái chờ kích hoạt.");

        if (pendingPackage.Plan == null)
            await _db.Entry(pendingPackage).Reference(p => p.Plan).LoadAsync();

        pendingPackage.StartDate = activationDate;
        pendingPackage.ExpiryDate = CalculateExpiryDate(activationDate, pendingPackage.Plan!, pendingPackage.SoNgayTangThucTe);
        pendingPackage.PackageStatus = "Active";
        pendingPackage.UpdatedAt = DateTime.UtcNow;

        return pendingPackage;
    }

    // ===================== [KHÁCH HÀNG] MUA THÊM GÓI ONLINE SAU KHI ĐÃ KÍCH HOẠT =====================
    // Dùng cho luồng thanh toán online (PaymentService) khi Member.Status == "Active" (hoặc "Expired"):
    // tự động nối hạn dựa trên gói gần nhất — cùng logic với gia hạn tại quầy
    // (MemberService.RenewMembershipAsync), chỉ khác là không cần request.PaymentMethod/BankReferenceCode
    // do controller khác xử lý.
    // branchId: chi nhánh khách chọn lúc mua online (đọc từ Transaction.BranchId, giống CreatePendingPackageAsync).
    // Dùng CalculateExpiryDate thay vì AddDays(plan.DurationDays + bonusDays) inline.
    //
    // [MỚI] Gói được mua vẫn có thể là gói nội bộ HOẶC gói khách hàng — hàm dùng chung cho cả 2,
    // tự đọc plan.PlanType rồi nối hạn ĐÚNG theo track tương ứng (PLAN_TYPE_INTERNAL nối với
    // PLAN_TYPE_INTERNAL, PLAN_TYPE_CUSTOMER nối với PLAN_TYPE_CUSTOMER). Nhờ vậy:
    //   - Đang có gói khách hàng còn hạn mà được đăng ký thêm gói nội bộ -> gói nội bộ tạo mới,
    //     StartDate = hôm nay (vì chưa có gói nội bộ nào trước đó để nối), CHẠY SONG SONG với
    //     gói khách hàng đang có, không đụng ngày của nhau.
    //   - Đang dùng gói nội bộ mà khách vẫn mua thêm gói khách hàng -> gói khách hàng nối hạn
    //     bình thường theo track khách hàng của riêng nó (không bị gói nội bộ ảnh hưởng lúc mua).
    //     Việc "trả lại" thời gian bị gói nội bộ che mất chỉ xảy ra khi gói nội bộ NGƯNG, xem
    //     SuspendInternalPackageAsync bên dưới.
    //
    // LƯU Ý: giaGoc/amount/bonusDays vẫn nhận từ nơi gọi (đã tính sẵn qua CalculateDiscountedAmount
    // / CalculateBonusDays trước khi gọi vào đây) — hàm này chỉ lo phần NGÀY (xác định startDate
    // theo nối hạn ĐÚNG TRACK, rồi tính expiryDate), không tự tính lại giá.
    public async Task<MemberPackage> CreateActivePackageForCustomerAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var plan = await _db.MembershipPlans.FindAsync(planId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói tập.");

        var latestPackage = await GetLatestPackageAsync(memberId, plan.PlanType);
        var (startDate, _) = DetermineStartDate(latestPackage, today);

        var expiryDate = CalculateExpiryDate(startDate, plan, bonusDays);

        return await CreateActivePackageAsync(
            memberId, planId, promotionId, giaGoc, amount, bonusDays,
            startDate, expiryDate, transactionId, branchId);
    }

    // ===================== [MỚI] GÓI "MẶC ĐỊNH" CỦA HỘI VIÊN =====================
    // Khi hội viên có cả gói nội bộ lẫn gói khách hàng đang Active song song, gói MẶC ĐỊNH
    // (dùng để check-in/FaceID/hiển thị trạng thái chính...) LUÔN LÀ GÓI NỘI BỘ, theo đúng
    // nghiệp vụ "member đã có gói khách hàng mà được đăng ký gói nội bộ thì gói mặc định là gói
    // nội bộ". Nếu không có gói nội bộ nào đang Active/còn hạn, fallback về gói khách hàng còn
    // hạn xa nhất.
    public async Task<MemberPackage?> GetDefaultActivePackageAsync(long memberId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var activePackages = await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId
                        && p.PackageStatus == "Active"
                        && p.ExpiryDate.HasValue
                        && p.ExpiryDate.Value >= today)
            .ToListAsync();

        return activePackages.FirstOrDefault(p => p.Plan.PlanType == PLAN_TYPE_INTERNAL)
            ?? activePackages.OrderByDescending(p => p.ExpiryDate).FirstOrDefault();
    }

    // ===================== [MỚI] NGƯNG DÙNG GÓI NỘI BỘ (nhân viên nghỉ / bị thu hồi quyền lợi) =====================
    // Nghiệp vụ:
    //   1) Gói nội bộ đang Active bị CHỐT LẠI ngay tại ngày ngưng: ExpiryDate = suspendDate,
    //      PackageStatus chuyển sang "Canceled" (không còn tính là gói đang dùng).
    //   2) Trong lúc dùng gói nội bộ, nếu hội viên có mua thêm gói khách hàng thì gói đó vẫn được
    //      tạo bình thường (track khách hàng độc lập — xem CreateActivePackageForCustomerAsync),
    //      NHƯNG coi như "chưa thật sự dùng" vì hội viên đang tập bằng gói nội bộ (gói mặc định).
    //      Nhận diện các gói khách hàng này bằng điều kiện: StartDate >= StartDate của gói nội bộ
    //      (tức là toàn bộ thời gian của gói khách hàng nằm trong giai đoạn đang có gói nội bộ).
    //      Với các gói này: RESET lại — StartDate = ngày ngưng gói nội bộ, ExpiryDate tính lại từ
    //      đó theo đúng DurationDays của Plan + SoNgayTangThucTe đã chốt lúc mua (KHÔNG tính lại
    //      khuyến mãi, KHÔNG đổi Amount/GiaGoc) — coi như "trả lại" nguyên vẹn số ngày khách đã
    //      trả tiền, bắt đầu tính từ đúng lúc khách thật sự bắt đầu dùng.
    //   3) Gói khách hàng nào đã có StartDate TRƯỚC khi gói nội bộ bắt đầu (tức là đã dùng dở từ
    //      trước khi thành nhân viên) thì KHÔNG bị đụng tới — giữ nguyên StartDate/ExpiryDate cũ.
    //
    // [GIẢ ĐỊNH CẦN XÁC NHẬN] Điều kiện nhận diện gói khách hàng "bị che" ở bước 2 là
    // StartDate >= StartDate gói nội bộ. Nếu nghiệp vụ thực tế muốn mốc so sánh khác (VD so với
    // ngày member được gắn PlanType nội bộ, không phải StartDate của MemberPackage nội bộ), báo
    // lại để chỉnh 1 dòng Where bên dưới.
   public async Task<MemberPackage> SuspendInternalPackageAsync(long memberId, DateOnly suspendDate, long updatedByEmployeeId )
        {
            var internalPackage = await _db.MemberPackages
                .Include(p => p.Plan)
                .Where(p => p.MemberId == memberId
                            && p.PackageStatus == "Active"
                            && p.Plan.PlanType == PLAN_TYPE_INTERNAL)
                .OrderByDescending(p => p.StartDate)
                .FirstOrDefaultAsync();

            if (internalPackage == null)
                throw new InvalidOperationException("Hội viên không có gói nội bộ đang hoạt động.");

            if (!internalPackage.StartDate.HasValue)
                throw new InvalidOperationException("Gói nội bộ chưa có ngày bắt đầu hợp lệ.");

            var now = DateTime.UtcNow;
            var oldStatus = internalPackage.PackageStatus;

            // 1) Chốt lại gói nội bộ.
            internalPackage.ExpiryDate = suspendDate;
            internalPackage.PackageStatus = STATUS_CANCELED;
            internalPackage.UpdatedAt = now;

            // 2) Reset các gói khách hàng "bị che" trong lúc dùng gói nội bộ.
            var affectedCustomerPackages = await _db.MemberPackages
                .Include(p => p.Plan)
                .Where(p => p.MemberId == memberId
                            && p.PackageStatus == "Active"
                            && p.Plan.PlanType == PLAN_TYPE_CUSTOMER
                            && p.StartDate.HasValue
                            && p.StartDate.Value >= internalPackage.StartDate.Value)
                .ToListAsync();

            foreach (var pkg in affectedCustomerPackages)
            {
                pkg.StartDate = suspendDate;
                pkg.ExpiryDate = CalculateExpiryDate(suspendDate, pkg.Plan!, pkg.SoNgayTangThucTe);
                pkg.UpdatedAt = now;
            }

            // 3) Ghi log lịch sử cập nhật — hiển thị trong "Lịch sử cập nhật" của hội viên
            _db.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = memberId,
                FieldName = "SUSPEND_INTERNAL_PACKAGE",
                OldValue = oldStatus,
                NewValue = $"Đã ngưng gói \"{internalPackage.Plan?.PlanName}\" (hiệu lực đến {suspendDate:dd/MM/yyyy})",
                UpdatedByEmployeeId = updatedByEmployeeId,
                UpdatedAt = now,
            });

            await _db.SaveChangesAsync();

            return internalPackage;
        }

    // ===================== [MỚI] LẤY DANH SÁCH CHI NHÁNH NHÂN VIÊN ĐƯỢC QUẢN LÝ =====================
    // Dùng để giới hạn phạm vi xem lịch sử đăng ký gói tập theo role:
    //   - Staff: EmployeeBranches có đúng 1 dòng -> chỉ xem chi nhánh đó.
    //   - Manager: có thể có nhiều dòng (VD 3 chi nhánh) -> xem được cả 3.
    //   - Admin: KHÔNG gọi hàm này (xem GetPackageHistoryAsync bên dưới) -> xem toàn bộ.
    public async Task<List<int>> GetManagedBranchIdsAsync(long employeeId)
    {
        return await _db.EmployeeBranches
            .Where(eb => eb.EmployeeId == employeeId)
            .Select(eb => eb.BranchId)
            .ToListAsync();
    }

    // ===================== [MỚI] LỊCH SỬ ĐĂNG KÝ GÓI TẬP (CÓ LỌC) =====================
    // allowedBranchIds:
    //   - null  -> KHÔNG giới hạn chi nhánh (dùng cho Admin không truyền filter branchId).
    //   - list  -> CHỈ lấy các MemberPackage thuộc những chi nhánh này (Staff/Manager, hoặc Admin
    //              đã chọn 1 branchId cụ thể — Controller tự quyết định truyền gì vào đây).
    // Sắp xếp mới nhất trước theo CreatedAt, không phân trang (theo yêu cầu nghiệp vụ hiện tại).
    public async Task<List<MemberPackageHistoryItem>> GetPackageHistoryAsync(
        MemberPackageHistoryQuery query, List<int>? allowedBranchIds)
    {
        var q = _db.MemberPackages
            .Include(mp => mp.Member).ThenInclude(m => m.FaceDatum)
            .Include(mp => mp.Plan)
            .Include(mp => mp.Branch)
            .Include(mp => mp.Transaction)
            .AsQueryable();

        // Giới hạn theo chi nhánh nhân viên được quản lý (Staff/Manager) — áp dụng TRƯỚC filter
        // branchId của query, vì đây là ràng buộc quyền hạn, không phải lựa chọn của người dùng.
        if (allowedBranchIds != null)
            q = q.Where(mp => allowedBranchIds.Contains(mp.BranchId));

        if (query.BranchId.HasValue)
            q = q.Where(mp => mp.BranchId == query.BranchId.Value);

        if (!string.IsNullOrWhiteSpace(query.keyword))
        {
            var keyword = query.keyword.Trim();

            q = q.Where(mp =>
                mp.Member.FullName.Contains(keyword) ||
                mp.Member.Phone.Contains(keyword));
        }
        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(mp => mp.PackageStatus == query.Status);

        if (!string.IsNullOrWhiteSpace(query.Channel))
        {
            if (query.Channel == "Online")
                q = q.Where(mp => mp.Transaction.EmployeeId == null);
            else if (query.Channel == "Offline")
                q = q.Where(mp => mp.Transaction.EmployeeId != null);
        }

        var result = await q
            .OrderByDescending(mp => mp.CreatedAt)
            .Select(mp => new MemberPackageHistoryItem
            {
                MemberPackageId = mp.MemberPackageId,
                MemberId = mp.MemberId,
                MemberAvatarUrl = mp.Member.FaceDatum != null ? mp.Member.FaceDatum.ProfileImage : null,
                MemberFullName = mp.Member.FullName,
                MemberPhone = mp.Member.Phone,
                PlanName = mp.Plan.PlanName,
                BranchId = mp.BranchId,
                BranchName = mp.Branch.BranchName,
                TransactionId = mp.TransactionId,
                TransactionCode = mp.Transaction.OrderCode,
                Channel = mp.Transaction.EmployeeId == null ? "Online" : "Offline",
                StartDate = mp.StartDate,
                ExpiryDate = mp.ExpiryDate,
                Amount = mp.Amount,
                PackageStatus = mp.PackageStatus
            })
            .ToListAsync();

        return result;
    }

}