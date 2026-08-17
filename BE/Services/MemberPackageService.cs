using BE.Data;
using BE.Dtos.MemberPackage;
using BE.DTOs.Payment;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class MemberPackageService
{
    // 1 chu kỳ khuyến mãi = 30 ngày cố định, không ăn theo DurationDays của gói.
    public const int CYCLE_DAYS = 30;

    private readonly GymManagementContext _db;

    public MemberPackageService(GymManagementContext db)
    {
        _db = db;
    }

    // Tính số ngày được tặng thêm từ khuyến mãi.
    // TangNgay: cộng thẳng số ngày. TangChuKy: nhân số chu kỳ với CYCLE_DAYS.
    // Loại giảm giá (GiamPhanTram/GiamTienMat) hoặc không có KM -> không tặng ngày.
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

    // Tính giá sau khi áp khuyến mãi. Kết quả không âm.
    public decimal CalculateDiscountedAmount(Promotion? promotion, decimal giaGoc)
    {
        if (promotion == null)
            return giaGoc;

        decimal giaSauGiam;

        switch (promotion.PromoType)
        {
            case "GiamTienMat":
                giaSauGiam = giaGoc - (promotion.SoTienGiam ?? 0);
                break;

            case "GiamPhanTram":
                decimal soTienGiam = giaGoc * (promotion.PhanTramGiam ?? 0) / 100m;
                if (promotion.MucGiamToiDa.HasValue && soTienGiam > promotion.MucGiamToiDa.Value)
                    soTienGiam = promotion.MucGiamToiDa.Value;
                giaSauGiam = giaGoc - soTienGiam;
                break;

            default:
                return giaGoc;
        }

        return giaSauGiam < 0 ? 0 : giaSauGiam;
    }

    // Hàm DUY NHẤT tính ngày hết hạn: startDate + DurationDays của plan + số ngày tặng thêm.
    // Mọi nơi trong hệ thống cần tính expiryDate đều phải gọi hàm này, không tự AddDays inline.
    public DateOnly CalculateExpiryDate(DateOnly startDate, MembershipPlan plan, short bonusDays)
    {
        return startDate.AddDays(plan.DurationDays + bonusDays);
    }

    // Kiểm tra branchId có tồn tại không (dùng khi branchId đến từ FE, chưa chắc đáng tin).
    public async Task EnsureBranchExistsAsync(int branchId)
    {
        bool tonTai = await _db.Branches.AnyAsync(b => b.BranchId == branchId);
        if (!tonTai)
            throw new KeyNotFoundException("Không tìm thấy chi nhánh.");
    }

    // Lấy gói tập gần nhất đã có ngày hết hạn (bỏ qua gói PendingActivation), dùng để gia hạn.
    public async Task<MemberPackage?> GetLatestPackageAsync(long memberId)
    {
        return await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus != "PendingActivation")
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefaultAsync();
    }

    // Lấy gói đang chờ kích hoạt (mua online, chưa qua quầy). Mỗi hội viên chỉ có tối đa 1 gói Pending.
    public async Task<MemberPackage?> GetPendingPackageAsync(long memberId)
    {
        return await _db.MemberPackages
            .Include(p => p.Plan)
            .Where(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation")
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();
    }

    // Quyết định ngày bắt đầu gói mới: nếu gói gần nhất còn Active và chưa hết hạn -> nối tiếp
    // từ ExpiryDate cũ (gia hạn), ngược lại bắt đầu từ hôm nay.
    public (DateOnly StartDate, bool IsExtending) DetermineStartDate(MemberPackage? latestPackage, DateOnly today)
    {
        bool dangGiaHan = latestPackage != null
            && latestPackage.PackageStatus == "Active"
            && latestPackage.ExpiryDate.HasValue
            && latestPackage.ExpiryDate.Value >= today;

        DateOnly ngayBatDau = dangGiaHan ? latestPackage!.ExpiryDate!.Value : today;
        return (ngayBatDau, dangGiaHan);
    }

    // [THU NGÂN] Tạo gói tập Active ngay tại quầy. Luôn insert mới, không đụng gói cũ.
    // giaGoc/amount/bonusDays phải được tính sẵn ở nơi gọi (qua CalculateDiscountedAmount/CalculateBonusDays).
    public async Task<MemberPackage> CreateActivePackageAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        DateOnly startDate, DateOnly expiryDate,
        long transactionId, int branchId, string packageStatus = "Active")
    {
        DateTime thoiDiemTao = DateTime.Now;

        var goiTapMoi = new MemberPackage
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
            CreatedAt = thoiDiemTao,
            UpdatedAt = thoiDiemTao
        };

        _db.MemberPackages.Add(goiTapMoi);
        await _db.SaveChangesAsync(); // cần MemberPackageId để PromotionUsage dùng bên ngoài

        return goiTapMoi;
    }

    // Tạo gói tập chờ kích hoạt (mua online lúc tài khoản còn PendingActivation).
    // Chưa biết ngày kích hoạt nên StartDate/ExpiryDate = null.
    public async Task<MemberPackage> CreatePendingPackageAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        bool daCoGoiPending = await _db.MemberPackages
            .AnyAsync(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation");
        if (daCoGoiPending)
            throw new InvalidOperationException(
                "Hội viên đã có một gói tập đang chờ kích hoạt. Vui lòng hoàn tất kích hoạt tại quầy trước khi mua gói khác.");

        DateTime thoiDiemTao = DateTime.Now;

        var goiTapMoi = new MemberPackage
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
            CreatedAt = thoiDiemTao,
            UpdatedAt = thoiDiemTao
        };

        _db.MemberPackages.Add(goiTapMoi);
        await _db.SaveChangesAsync();

        return goiTapMoi;
    }

    // [THU NGÂN] Kích hoạt gói đã mua online: chốt StartDate/ExpiryDate, không đụng Amount/BranchId
    // (giá và chi nhánh đã chốt lúc mua online). Không tự SaveChanges, để MemberService gộp chung 1 giao dịch.
    public async Task<MemberPackage> ActivatePendingPackageAsync(MemberPackage pendingPackage, DateOnly activationDate)
    {
        if (pendingPackage.PackageStatus != "PendingActivation")
            throw new InvalidOperationException("Gói tập này không ở trạng thái chờ kích hoạt.");

        if (pendingPackage.Plan == null)
            await _db.Entry(pendingPackage).Reference(p => p.Plan).LoadAsync();

        pendingPackage.StartDate = activationDate;
        pendingPackage.ExpiryDate = CalculateExpiryDate(activationDate, pendingPackage.Plan!, pendingPackage.SoNgayTangThucTe);
        pendingPackage.PackageStatus = "Active";
        pendingPackage.UpdatedAt = DateTime.Now;

        return pendingPackage;
    }

    // Mua thêm gói online sau khi đã kích hoạt (Member.Status Active/Expired): tự nối hạn theo
    // gói gần nhất, cùng logic gia hạn tại quầy. giaGoc/amount/bonusDays vẫn nhận từ nơi gọi.
    public async Task<MemberPackage> CreateActivePackageOnlineAsync(
        long memberId, int planId, int? promotionId,
        decimal giaGoc, decimal amount, short bonusDays,
        long transactionId, int branchId)
    {
        DateOnly homNay = DateOnly.FromDateTime(DateTime.Now);

        MembershipPlan plan = await _db.MembershipPlans.FindAsync(planId)
            ?? throw new KeyNotFoundException("Không tìm thấy gói tập.");

        MemberPackage? goiGanNhat = await GetLatestPackageAsync(memberId);
        (DateOnly ngayBatDau, _) = DetermineStartDate(goiGanNhat, homNay);

        DateOnly ngayHetHan = CalculateExpiryDate(ngayBatDau, plan, bonusDays);

        return await CreateActivePackageAsync(
            memberId, planId, promotionId, giaGoc, amount, bonusDays,
            ngayBatDau, ngayHetHan, transactionId, branchId);
    }

    // Lấy danh sách chi nhánh mà nhân viên được quản lý (Staff: 1 chi nhánh, Manager: nhiều chi
    // nhánh). Admin không gọi hàm này vì xem được toàn bộ.
    public async Task<List<int>> GetManagedBranchIdsAsync(long employeeId)
    {
        return await _db.Employees
            .Where(e => e.EmployeeId == employeeId)
            .SelectMany(e => e.Branches)
            .Select(b => b.BranchId)
            .ToListAsync();
    }

    // Lịch sử đăng ký gói tập, có lọc theo chi nhánh/keyword/trạng thái/kênh mua.
    // allowedBranchIds = null -> không giới hạn (Admin); có giá trị -> chỉ lấy trong các chi nhánh đó.
    public async Task<List<MemberPackageHistoryItem>> GetPackageHistoryAsync(
        MemberPackageHistoryQuery query, List<int>? allowedBranchIds)
    {
        var truyVan = _db.MemberPackages
            .Include(mp => mp.Member).ThenInclude(m => m.FaceDatum)
            .Include(mp => mp.Member).ThenInclude(m => m.Account)
            .Include(mp => mp.Plan)
            .Include(mp => mp.Branch)
            .Include(mp => mp.Transaction)
            .AsQueryable();

        // Giới hạn theo quyền chi nhánh của nhân viên TRƯỚC, rồi mới áp filter branchId người dùng chọn.
        if (allowedBranchIds != null)
            truyVan = truyVan.Where(mp => allowedBranchIds.Contains(mp.BranchId));

        if (query.BranchId.HasValue)
            truyVan = truyVan.Where(mp => mp.BranchId == query.BranchId.Value);

        if (!string.IsNullOrWhiteSpace(query.keyword))
        {
            string tuKhoa = query.keyword.Trim();

            // Account.Username của hội viên chính là SĐT đăng nhập, dùng để tìm theo SĐT.
            truyVan = truyVan.Where(mp =>
                mp.Member.FullName.Contains(tuKhoa) ||
                (mp.Member.Account != null && mp.Member.Account.Username.Contains(tuKhoa)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
            truyVan = truyVan.Where(mp => mp.PackageStatus == query.Status);

        if (!string.IsNullOrWhiteSpace(query.Channel))
        {
            if (query.Channel == "Online")
                truyVan = truyVan.Where(mp => mp.Transaction.EmployeeId == null);
            else if (query.Channel == "Offline")
                truyVan = truyVan.Where(mp => mp.Transaction.EmployeeId != null);
        }

        List<MemberPackageHistoryItem> ketQua = await truyVan
            .OrderByDescending(mp => mp.CreatedAt)
            .Select(mp => new MemberPackageHistoryItem
            {
                MemberPackageId = mp.MemberPackageId,
                MemberId = mp.MemberId,
                MemberAvatarUrl = mp.Member.FaceDatum != null ? mp.Member.FaceDatum.ProfileImage : null,
                MemberFullName = mp.Member.FullName,
                MemberPhone = mp.Member.Account != null ? mp.Member.Account.Username : null,
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

        return ketQua;
    }
}