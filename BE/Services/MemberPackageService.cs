using BE.Data;
using BE.Dtos.MemberPackage;
using BE.DTOs.Payment;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class MemberPackageService
{
    // ===================== ĐỘ DÀI 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH =====================
    // TangChuKy không ăn theo DurationDays của gói đang mua. Public để PromotionService tham
    // chiếu thẳng, không tự khai báo hằng số trùng lặp.
    public const int CYCLE_DAYS = 30;

    private readonly GymManagementContext _db;

    public MemberPackageService(GymManagementContext db)
    {
        _db = db;
    }

    // ===================== TÍNH SoNgayTangThucTe — CÔNG THỨC DUY NHẤT =====================
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
            "TangChuKy" => (short)((promotion.SoChuKyTang ?? 0) * CYCLE_DAYS),
            _ => 0
        };
    }

    // ===================== TÍNH GIÁ SAU GIẢM — CÔNG THỨC DUY NHẤT =====================
    //   GiamTienMat  -> giaGoc - SoTienGiam
    //   GiamPhanTram -> giaGoc - (giaGoc × PhanTramGiam / 100), chặn trần MucGiamToiDa nếu có
    //   TangNgay/TangChuKy/null -> giữ nguyên giaGoc (không giảm giá, chỉ tặng ngày)
    // Kết quả luôn được chặn không cho âm.
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
                return giaGoc;
        }

        return amount < 0 ? 0 : amount;
    }

    // ===================== TÍNH NGÀY HẾT HẠN — DÙNG CHUNG MỌI LUỒNG =====================
    // expiryDate = startDate + plan.DurationDays + bonusDays. Đây là hàm DUY NHẤT được phép cộng
    // ngày kiểu này trong toàn hệ thống, kể cả những chỗ chỉ cần số ước tính (VD hóa đơn tạm cho
    // gói PendingActivation) cũng PHẢI gọi hàm này thay vì tự AddDays(a + b) inline.
    public DateOnly CalculateExpiryDate(DateOnly startDate, MembershipPlan plan, short bonusDays)
    {
        return startDate.AddDays(plan.DurationDays + bonusDays);
    }

    // ===================== KIỂM TRA CHI NHÁNH HỢP LỆ =====================
    // Dùng khi branchId đến từ nguồn không đáng tin cậy tuyệt đối (FE gửi lên lúc mua online).
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
    // Chỉ còn 1 loại gói duy nhất -> không còn tham số planType/track.
    public async Task<MemberPackage?> GetLatestPackageAsync(long memberId)
    {
        return await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus != "PendingActivation")
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefaultAsync();
    }

    // ===================== LẤY GÓI ĐANG CHỜ KÍCH HOẠT (mua online, chưa qua quầy) =====================
    // Ràng buộc: 1 hội viên chỉ được có TỐI ĐA 1 gói đang PendingActivation (không còn phân biệt
    // theo track nữa).
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
    // lại từ Promotion, chỉ nhận giá trị cuối để lưu.
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

    // ===================== TẠO GÓI TẬP CHỜ KÍCH HOẠT (mua online) =====================
    // Dùng khi khách mua gói online lúc tài khoản còn PendingActivation: CHƯA biết ngày kích hoạt
    // nên StartDate/ExpiryDate = null. PackageStatus = "PendingActivation".
    // Ràng buộc: 1 tài khoản chỉ được có TỐI ĐA 1 gói đang PendingActivation (không còn phân biệt
    // theo track). PaymentService (webhook xác nhận thanh toán) gọi hàm này khi
    // Member.Status == "PendingActivation".
    // branchId: chi nhánh khách TỰ CHỌN lúc mua online (FE gửi lên, PaymentService lưu tạm vào
    // Transaction.BranchId ngay lúc tạo QR, rồi đọc lại và truyền xuống đây khi webhook báo Paid).
    //
    // LƯU Ý: amount/bonusDays cũng PHẢI tính sẵn qua CalculateDiscountedAmount/CalculateBonusDays
    // ở nơi gọi, giống CreateActivePackageAsync ở trên.
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
    // KHÔNG đụng vào Amount/GiaGoc — giá đã chốt xong lúc mua online, kích hoạt chỉ xác định ngày.
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

    // ===================== MUA THÊM GÓI ONLINE SAU KHI ĐÃ KÍCH HOẠT =====================
    // Dùng cho luồng thanh toán online (PaymentService) khi Member.Status == "Active" (hoặc "Expired"):
    // tự động nối hạn dựa trên gói gần nhất — cùng logic với gia hạn tại quầy
    // (MemberService.RenewMembershipAsync), chỉ khác là không cần request.PaymentMethod/BankReferenceCode
    // do controller khác xử lý.
    // branchId: chi nhánh khách chọn lúc mua online (đọc từ Transaction.BranchId, giống CreatePendingPackageAsync).
    //
    // LƯU Ý: giaGoc/amount/bonusDays vẫn nhận từ nơi gọi (đã tính sẵn qua CalculateDiscountedAmount
    // / CalculateBonusDays trước khi gọi vào đây) — hàm này chỉ lo phần NGÀY (nối hạn theo gói gần
    // nhất, rồi tính expiryDate), không tự tính lại giá.
    public async Task<MemberPackage> CreateActivePackageOnlineAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var plan = await _db.MembershipPlans.FindAsync(planId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói tập.");

        var latestPackage = await GetLatestPackageAsync(memberId);
        var (startDate, _) = DetermineStartDate(latestPackage, today);

        var expiryDate = CalculateExpiryDate(startDate, plan, bonusDays);

        return await CreateActivePackageAsync(
            memberId, planId, promotionId, giaGoc, amount, bonusDays,
            startDate, expiryDate, transactionId, branchId);
    }

    // ===================== LẤY DANH SÁCH CHI NHÁNH NHÂN VIÊN ĐƯỢC QUẢN LÝ =====================
    // Dùng để giới hạn phạm vi xem lịch sử đăng ký gói tập theo role:
    //   - Staff: EmployeeBranches có đúng 1 dòng -> chỉ xem chi nhánh đó.
    //   - Manager: có thể có nhiều dòng (VD 3 chi nhánh) -> xem được cả 3.
    //   - Admin: KHÔNG gọi hàm này (xem GetPackageHistoryAsync bên dưới) -> xem toàn bộ.
   public async Task<List<int>> GetManagedBranchIdsAsync(long employeeId)
{
    return await _db.Employees
        .Where(e => e.EmployeeId == employeeId)
        .SelectMany(e => e.Branches)
        .Select(b => b.BranchId)
        .ToListAsync();
}

    // ===================== LỊCH SỬ ĐĂNG KÝ GÓI TẬP (CÓ LỌC) =====================
    // allowedBranchIds:
    //   - null  -> KHÔNG giới hạn chi nhánh (dùng cho Admin không truyền filter branchId).
    //   - list  -> CHỈ lấy các MemberPackage thuộc những chi nhánh này (Staff/Manager, hoặc Admin
    //              đã chọn 1 branchId cụ thể — Controller tự quyết định truyền gì vào đây).
    // Sắp xếp mới nhất trước theo CreatedAt, không phân trang (theo yêu cầu nghiệp vụ hiện tại).
    // [SỬA] Phone không còn nằm trên Member -> join thêm bảng Accounts để lấy/lọc theo SĐT.
    public async Task<List<MemberPackageHistoryItem>> GetPackageHistoryAsync(
        MemberPackageHistoryQuery query, List<int>? allowedBranchIds)
    {
        var q =
            from mp in _db.MemberPackages
                .Include(mp => mp.Member).ThenInclude(m => m.FaceDatum)
                .Include(mp => mp.Plan)
                .Include(mp => mp.Branch)
                .Include(mp => mp.Transaction)
            join acc in _db.Accounts on mp.MemberId equals acc.MemberId into accJoin
            from acc in accJoin.DefaultIfEmpty()
            select new { mp, Phone = acc != null ? acc.Phone : null };

        // Giới hạn theo chi nhánh nhân viên được quản lý (Staff/Manager) — áp dụng TRƯỚC filter
        // branchId của query, vì đây là ràng buộc quyền hạn, không phải lựa chọn của người dùng.
        if (allowedBranchIds != null)
            q = q.Where(x => allowedBranchIds.Contains(x.mp.BranchId));

        if (query.BranchId.HasValue)
            q = q.Where(x => x.mp.BranchId == query.BranchId.Value);

        if (!string.IsNullOrWhiteSpace(query.keyword))
        {
            var keyword = query.keyword.Trim();

            q = q.Where(x =>
                x.mp.Member.FullName.Contains(keyword) ||
                (x.Phone != null && x.Phone.Contains(keyword)));
        }
        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(x => x.mp.PackageStatus == query.Status);

        if (!string.IsNullOrWhiteSpace(query.Channel))
        {
            if (query.Channel == "Online")
                q = q.Where(x => x.mp.Transaction.EmployeeId == null);
            else if (query.Channel == "Offline")
                q = q.Where(x => x.mp.Transaction.EmployeeId != null);
        }

        var result = await q
            .OrderByDescending(x => x.mp.CreatedAt)
            .Select(x => new MemberPackageHistoryItem
            {
                MemberPackageId = x.mp.MemberPackageId,
                MemberId = x.mp.MemberId,
                MemberAvatarUrl = x.mp.Member.FaceDatum != null ? x.mp.Member.FaceDatum.ProfileImage : null,
                MemberFullName = x.mp.Member.FullName,
                MemberPhone = x.Phone,
                PlanName = x.mp.Plan.PlanName,
                BranchId = x.mp.BranchId,
                BranchName = x.mp.Branch.BranchName,
                TransactionId = x.mp.TransactionId,
                TransactionCode = x.mp.Transaction.OrderCode,
                Channel = x.mp.Transaction.EmployeeId == null ? "Online" : "Offline",
                StartDate = x.mp.StartDate,
                ExpiryDate = x.mp.ExpiryDate,
                Amount = x.mp.Amount,
                PackageStatus = x.mp.PackageStatus
            })
            .ToListAsync();

        return result;
    }
}