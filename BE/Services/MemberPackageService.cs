using BE.Data;
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
// [MỚI] BranchId chuyển từ Member sang MemberPackage — hội viên không cần chi nhánh cố định,
// nhưng MỖI GÓI TẬP đều gắn với 1 chi nhánh cụ thể (bắt buộc, not null):
//   - Bán tại quầy (CreateActivePackageAsync): branchId = chi nhánh của nhân viên thu ngân.
//   - Mua online (CreatePendingPackageAsync / CreateActivePackageForCustomerAsync): branchId
//     do FE gửi lên bắt buộc lúc khách bấm mua (PaymentService validate rồi truyền xuống đây).
//
// QUY TẮC NGHIỆP VỤ (áp dụng từ bản này):
//   - Tài khoản đang PendingActivation: mua online -> gói mới luôn ở trạng thái PendingActivation,
//     và CHỈ được có TỐI ĐA 1 gói Pending tại 1 thời điểm (xem CreatePendingPackageAsync).
//   - Sau khi thu ngân kích hoạt (tạo gói+FaceID hoặc chỉ tạo FaceID), tài khoản chuyển Active,
//     gói Pending (nếu có) được chuyển Active với StartDate = ngày kích hoạt.
//     BranchId của gói Pending GIỮ NGUYÊN chi nhánh khách đã chọn lúc mua online, KHÔNG bị ghi đè
//     bởi chi nhánh của nhân viên thu ngân đứng kích hoạt (2 chi nhánh có thể khác nhau).
//   - Tài khoản đã Active: mua thêm gói online hoặc gia hạn tại quầy -> luôn được phép, gói mới
//     tự động cộng dồn/nối hạn dựa trên gói gần nhất (xem DetermineStartDate).
//
// TÁCH HÀM THEO NGƯỜI GỌI (để dễ bảo trì, tránh nhầm luồng):
//   - [THU NGÂN]    CreateActivePackageAsync        — gói có ngày ngay lúc tạo (Active)
//   - [THU NGÂN]    ActivatePendingPackageAsync      — kích hoạt gói Pending đã mua online
//   - [KHÁCH HÀNG]  CreatePendingPackageAsync        — mua online lúc tài khoản còn Pending
//   - [KHÁCH HÀNG]  CreateActivePackageForCustomerAsync — mua thêm online sau khi đã Active (tự nối hạn)
public class MemberPackageService
{
    private readonly GymManagementContext _db;

    public MemberPackageService(GymManagementContext db)
    {
        _db = db;
    }

    // ===================== TÍNH SỐ NGÀY TẶNG (luồng cũ: tạo hội viên / kích hoạt tại quầy) =====================
    // Chỉ hỗ trợ TangNgay/TangChuKy — dùng cho CreateMemberAsync & ActivateWithPackageAsync,
    // 2 luồng này hiện chưa hỗ trợ giảm giá % nên giữ nguyên logic cũ, không đụng vào Amount/GiaGoc.
    public async Task<short> CalculateSoNgayTangThucTeAsync(int? promotionId, short planDurationDays)
    {
        if (promotionId == null)
            return 0;

        var promotion = await _db.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
        if (promotion == null)
            throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

        return promotion.PromoType switch
        {
            "TangNgay" => (short)(promotion.SoNgayTang ?? 0),
            "TangChuKy" => (short)((promotion.SoChuKyTang ?? 0) * planDurationDays),
            _ => 0
        };
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
    // KHÔNG đụng vào BranchId — giữ nguyên chi nhánh khách đã chọn lúc mua online, dù nhân viên
    // đứng kích hoạt thuộc chi nhánh khác.
    // Không tự SaveChanges — để MemberService gộp chung 1 lần SaveChanges với các thay đổi khác
    // (Member.Status, log kích hoạt...) trong cùng 1 giao dịch nghiệp vụ.
    public async Task<MemberPackage> ActivatePendingPackageAsync(MemberPackage pendingPackage, DateOnly activationDate)
    {
        if (pendingPackage.PackageStatus != "PendingActivation")
            throw new InvalidOperationException("Gói tập này không ở trạng thái chờ kích hoạt.");

        if (pendingPackage.Plan == null)
            await _db.Entry(pendingPackage).Reference(p => p.Plan).LoadAsync();

        pendingPackage.StartDate = activationDate;
        pendingPackage.ExpiryDate = activationDate.AddDays(pendingPackage.Plan!.DurationDays + pendingPackage.SoNgayTangThucTe);
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

        var expiryDate = startDate.AddDays(plan.DurationDays + bonusDays);

        return await CreateActivePackageAsync(
            memberId, planId, promotionId, giaGoc, amount, bonusDays,
            startDate, expiryDate, transactionId, branchId);
    }
}