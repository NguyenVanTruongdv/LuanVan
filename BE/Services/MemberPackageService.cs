using BE.Data;
using BE.Dtos.MemberPackage;
using BE.DTOs.Payment;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Chỉ lo phần ĐĂNG KÝ TẬP (MemberPackage) — tính ngày hiệu lực, tạo MemberPackage, xác định nối hạn.
// KHÔNG biết gì về:
//  - MembershipPlan (danh sách gói tập để bán)   -> xem MembershipPlanService
//  - Transaction (giao dịch, hóa đơn)            -> xem TransactionService
// nhận sẵn TransactionId từ service gọi vào (MemberService hoặc PaymentService).
//
// GHI CHÚ VỀ MODEL: MemberPackage.StartDate và MemberPackage.ExpiryDate phải là DateOnly? (nullable)
// vì gói mua online trước khi kích hoạt chưa có ngày bắt đầu/kết thúc.
//
// [MỚI - 13/07/2026] Gom công thức tính "Số ngày tặng thêm đã quy đổi thực tế" (đúng như comment
// trên cột MemberPackage.SoNgayTangThucTe: TangNgay=so_ngay_tang, TangChuKy=so_chu_ky_tang×30,
// không KM=0) về 2 hàm dùng chung CalculateBonusDays / CalculateExpiryDate bên dưới. Trước đây
// công thức này bị viết lặp lại y hệt ở nhiều nơi (CreateMemberAsync, ActivateWithPackageAsync
// trong MemberService, và ActivatePendingPackageAsync/CreateActivePackageForCustomerAsync ở chính
// file này) — chỉ cần 1 chỗ viết sai/quên cập nhật là ngày hết hạn tính lệch giữa các luồng.
//
// [FIX - 13/07/2026] BUG: CalculateBonusDays trước đây tính TangChuKy = SoChuKyTang * plan.DurationDays
// (dùng thời hạn của GÓI ĐANG MUA làm độ dài 1 chu kỳ). Điều này SAI vì:
//   - Theo đúng định nghĩa nghiệp vụ, 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH, không phụ thuộc gói tập đang
//     mua là gói 1/3/6/12 tháng.
//   - Với công thức cũ, cùng 1 khuyến mãi "tặng 1 chu kỳ" sẽ cho ra số ngày tặng KHÁC NHAU tùy
//     khách mua gói nào (gói 3 tháng -> tặng 90 ngày, gói 6 tháng -> tặng 180 ngày...), trong khi
//     ý định thực tế chỉ là tặng thêm đúng 1 tháng (30 ngày) cho mỗi chu kỳ.
//   - Ví dụ thực tế gây lỗi: KM "Mua 3 Tháng Tặng 1 Chu Kỳ" (SoChuKyTang=1) áp cho gói 3 tháng
//     (DurationDays=90) -> hệ thống tính nhầm ra 90 ngày tặng thêm thay vì đúng ra phải là 30 ngày.
// FIX: nhân SoChuKyTang với hằng số CYCLE_DAYS = 30, KHÔNG dùng plan.DurationDays nữa.
//
// [MỚI - 13/07/2026] Thêm CalculateDiscountedAmount — công thức DUY NHẤT để tính GIÁ SAU GIẢM,
// làm cặp song song với CalculateBonusDays (công thức DUY NHẤT để tính NGÀY TẶNG). Lý do gom về
// đây: Promotion chỉ có 4 loại (GiamPhanTram/GiamTienMat/TangNgay/TangChuKy), và luôn CHỈ ẢNH
// HƯỞNG 1 TRONG 2 THỨ — hoặc giá tiền, hoặc ngày hết hạn — không bao giờ cả hai (xem
// PromotionService.ValidatePromotionData, 2 nhóm cột loại trừ nhau). Vì vậy 2 hàm này luôn đi cùng
// nhau thành 1 cặp khi xử lý hiệu lực khuyến mãi cho 1 giao dịch:
//   - CalculateDiscountedAmount(promotion, giaGoc)         -> ra "amount" (giá sau giảm)
//   - CalculateBonusDays(promotion, plan)                  -> ra "bonusDays" (số ngày tặng thêm)
// Nơi gọi vào (MemberService, TransactionService, PaymentService) nên gọi CẢ HAI cho mọi
// Promotion, thay vì tự viết lại công thức giảm giá rải rác từng nơi — tránh lặp lại đúng kiểu
// bug đã từng gặp với công thức tính ngày tặng.
//
// [FIX - 13/07/2026] CYCLE_DAYS chuyển từ private sang PUBLIC CONST. Trước đây PromotionService
// tự khai báo một hằng số CYCLE_DAYS = 30 RIÊNG của chính nó (chỉ để phục vụ việc map SoNgayTang
// tương đương cho FE hiển thị) — về mặt giá trị thì đang khớp với hằng số ở đây, nhưng là 2 khai
// báo ĐỘC LẬP, không liên kết gì với nhau. Nếu sau này nghiệp vụ đổi định nghĩa "1 chu kỳ" (VD từ
// 30 ngày sang 30.5 ngày, hoặc đổi hẳn cách tính), sửa ở đây mà quên sửa bên PromotionService thì
// FE sẽ hiển thị SAI số ngày tương đương so với số ngày THẬT được cộng vào ExpiryDate — trong khi
// bản chất đây phải là CÙNG MỘT con số. Public hoá hằng số này để PromotionService tham chiếu
// thẳng MemberPackageService.CYCLE_DAYS thay vì tự khai báo lại, đưa về đúng 1 nguồn duy nhất cho
// toàn bộ hệ thống (tính toán thật lẫn hiển thị FE).
public class MemberPackageService
{
    // ===================== [FIX] ĐỘ DÀI 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH =====================
    // Theo đúng định nghĩa nghiệp vụ: TangChuKy không ăn theo DurationDays của gói đang mua.
    // Nếu sau này nghiệp vụ đổi định nghĩa "1 chu kỳ", CHỈ cần sửa hằng số này ở 1 chỗ duy nhất.
    // [FIX] Đổi private -> public để PromotionService (và bất kỳ nơi nào khác cần hiển thị/suy ra
    // số ngày tương đương của 1 chu kỳ) tham chiếu thẳng, KHÔNG tự khai báo hằng số trùng lặp nữa.
    public const int CYCLE_DAYS = 30;

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
    public async Task<MemberPackage?> GetLatestPackageAsync(long memberId)
    {
        return await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus != "PendingActivation")
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefaultAsync();
    }

    // ===================== LẤY GÓI ĐANG CHỜ KÍCH HOẠT (mua online, chưa qua quầy) =====================
    // Theo ràng buộc nghiệp vụ, mỗi hội viên tối đa 1 gói ở trạng thái này tại 1 thời điểm.
    public async Task<MemberPackage?> GetPendingPackageAsync(long memberId)
    {
        return await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation")
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();
    }

    // ===================== QUYẾT ĐỊNH NGÀY BẮT ĐẦU (gia hạn) =====================
    // latestPackage truyền vào luôn lấy từ GetLatestPackageAsync (đã loại Pending) nên ExpiryDate
    // ở đây luôn có giá trị thật -> trả về DateOnly không nullable, không cần xử lý null phía sau.
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
    // Ràng buộc: 1 tài khoản chỉ được có TỐI ĐA 1 gói đang ở trạng thái PendingActivation.
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
        var alreadyPending = await _db.MemberPackages
            .AnyAsync(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation");
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
    // do controller khác xử lý. Tài khoản đã kích hoạt được phép mua nhiều gói, luôn cộng dồn/nối hạn.
    // branchId: chi nhánh khách chọn lúc mua online (đọc từ Transaction.BranchId, giống CreatePendingPackageAsync).
    // Dùng CalculateExpiryDate thay vì AddDays(plan.DurationDays + bonusDays) inline.
    //
    // LƯU Ý: giaGoc/amount/bonusDays vẫn nhận từ nơi gọi (đã tính sẵn qua CalculateDiscountedAmount
    // / CalculateBonusDays trước khi gọi vào đây) — hàm này chỉ lo phần NGÀY (xác định startDate
    // theo nối hạn, rồi tính expiryDate), không tự tính lại giá.
    public async Task<MemberPackage> CreateActivePackageForCustomerAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var latestPackage = await GetLatestPackageAsync(memberId);
        var (startDate, _) = DetermineStartDate(latestPackage, today);

        var plan = await _db.MembershipPlans.FindAsync(planId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói tập.");

        var expiryDate = CalculateExpiryDate(startDate, plan, bonusDays);

        return await CreateActivePackageAsync(
            memberId, planId, promotionId, giaGoc, amount, bonusDays,
            startDate, expiryDate, transactionId, branchId);
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