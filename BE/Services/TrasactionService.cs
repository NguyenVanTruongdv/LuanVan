using BE.Data;
using BE.Dtos.Member;
using BE.Dtos.Promotion;
using BE.Dtos.Transaction;
using BE.DTOs.Payment;
using BE.Models;
using BE.Services.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{

    public class TransactionService
    {
        // Phải khớp MemberPackageService.CYCLE_DAYS (2 service không tham chiếu nhau nên có 2 hằng số
        // trùng giá trị — nếu đổi định nghĩa "1 chu kỳ" phải sửa đồng thời cả 2 nơi).
        private const int CYCLE_DAYS = 30;

        private readonly GymManagementContext _context;
        private readonly S3StorageService _storageService;
        private readonly InvoiceService _invoiceService;

        public TransactionService(
            GymManagementContext context,
            S3StorageService storageService,
            InvoiceService invoiceService)
        {
            _context = context;
            _storageService = storageService;
            _invoiceService = invoiceService;
        }

        public async Task<Transaction?> GetByIdAsync(long transactionId)
        {
            return await _context.Transactions
                .Include(t => t.Member)
                .Include(t => t.Plan)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);
        }

        public static string GenerateOrderCode()
            => $"HD{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}";

        // ===================== LỊCH SỬ ĐĂNG KÝ GÓI (dùng cho nhân viên) =====================
        public async Task<List<HistoryRegisPacReponse>> GetHistoryRegisPac(
            string? keyword, string? status, string? channel, int? branchId, long employeeId)
        {
            var employee = await _context.Employees
        .Include(e => e.Role)
        .Include(e => e.Branches)
        .FirstOrDefaultAsync(e => e.EmployeeId == employeeId)
        ?? throw new KeyNotFoundException("Không tìm thấy nhân viên.");
            var isAdmin = employee.Role.RoleId == 3;

            var query = _context.Transactions
                .Include(t => t.Member).ThenInclude(m => m.Account)
                .Include(t => t.Member).ThenInclude(m => m.FaceDatum)
                .Include(t => t.Plan)
                .Include(t => t.Branch)
                .Include(t => t.MemberPackages)
                .AsQueryable();

            if (isAdmin)
            {
                if (branchId.HasValue)
                    query = query.Where(t => t.BranchId == branchId.Value);
            }
            else
            {
                var myBranchIds = employee.Branches.Select(b => b.BranchId).ToList();
                if (myBranchIds.Count == 0)
                    throw new InvalidOperationException("Nhân viên chưa được gán chi nhánh.");

                if (branchId.HasValue)
                {
                    if (!myBranchIds.Contains(branchId.Value))
                        throw new InvalidOperationException("Bạn không có quyền xem chi nhánh này.");
                    query = query.Where(t => t.BranchId == branchId.Value);
                }
                else
                {
                    query = query.Where(t => myBranchIds.Contains(t.BranchId));
                }
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                keyword = keyword.Trim();
                // Cho phép tìm theo tên/SĐT hội viên, mã hóa đơn (OrderCode)
                // hoặc mã giao dịch (TransactionId — chỉ so khi keyword là số nguyên).
                var isNumericKeyword = long.TryParse(keyword, out var keywordAsId);

                query = query.Where(t =>
                    t.Member.FullName.Contains(keyword) ||
                    t.Member.Account.Phone.Contains(keyword) ||
                    t.OrderCode.Contains(keyword) ||
                    (isNumericKeyword && t.TransactionId == keywordAsId));
            }

            if (!string.IsNullOrWhiteSpace(channel) && channel != "all")
            {
                bool isCounter = channel.Equals("Tại quầy", StringComparison.OrdinalIgnoreCase);
                query = isCounter
                    ? query.Where(t => t.EmployeeId != null)
                    : query.Where(t => t.EmployeeId == null);
            }

            var transactions = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

            var result = transactions.Select(MapToHistoryResponse(includeBranch: true)).ToList();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
                result = result.Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();

            return result;
        }

        // ===================== HỘI VIÊN XEM LỊCH SỬ GIAO DỊCH CỦA CHÍNH MÌNH =====================
        public async Task<List<HistoryRegisPacReponse>> GetMyHistoryAsync(long memberId)
        {
            var transactions = await _context.Transactions
                .Include(t => t.Member).ThenInclude(m => m.FaceDatum)
                .Include(t => t.Member).ThenInclude(m => m.Account)
                .Include(t => t.Plan)
                .Include(t => t.MemberPackages)
                .Where(t => t.MemberId == memberId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions.Select(MapToHistoryResponse(includeBranch: false)).ToList();
        }

        // Gom logic map Transaction -> HistoryRegisPacReponse dùng chung cho 2 hàm trên
        // (trước đây bị lặp y hệt nhau). includeBranch=false vì GetMyHistoryAsync không Include Branch.
        private static Func<Transaction, HistoryRegisPacReponse> MapToHistoryResponse(bool includeBranch)
        {
            return t =>
            {
                var memberPackage = t.MemberPackages.OrderByDescending(mp => mp.CreatedAt).FirstOrDefault();
                return new HistoryRegisPacReponse
                {
                    transactionId = t.TransactionId,
                    UrlImg = t.Member.FaceDatum?.ProfileImage,
                    Phone = t.Member.Account.Phone,
                    FullName = t.Member.FullName,
                    OrderCode = t.OrderCode,
                    PlanName = t.Plan.PlanName,
                    BranchName = includeBranch ? t.Branch.BranchName : null,
                    PurchaseChannel = t.EmployeeId != null ? "Tại quầy" : "Online",
                    StartDate = memberPackage?.StartDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    ExpiryDate = memberPackage?.ExpiryDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    OriginalAmount = t.GiaGoc,
                    Amount = t.Amount,
                    Status = t.PaymentStatus,
                    BankReferenceCode = t.BankReferenceCode   // <-- mới thêm
                };
            };
        }

        // ===================== TÍNH HIỆU LỰC KHUYẾN MÃI =====================
        // asOf: thời điểm cần kiểm tra hiệu lực KM (mặc định = hiện tại). Khi điều chỉnh giao dịch
        // cũ, truyền transaction.CreatedAt vào đây.
        // checkUsageLimit: có chặn theo GioiHanLuot/SoLuotDaDung hay không — SoLuotDaDung LUÔN đếm
        // tại HIỆN TẠI (không suy ngược theo asOf được), giữ true ở cả 2 luồng tạo mới và điều chỉnh.
        public async Task<PromotionEffectResult> CalculatePromotionEffectAsync(
            int? promotionId, int planId, decimal planPrice, int planDurationDays,
            DateTime? asOf = null,
            bool checkUsageLimit = true)
        {
            if (promotionId == null)
                return new PromotionEffectResult { GiaGoc = planPrice, Amount = planPrice };

            var promotion = await _context.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId)
                ?? throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

            if (promotion.PlanId != planId)
                throw new InvalidOperationException("Khuyến mãi không áp dụng cho gói tập này.");

            var now = asOf ?? DateTime.UtcNow;

            if (promotion.TrangThai != "HoatDong")
                throw new InvalidOperationException("Khuyến mãi hiện không hoạt động.");

            if (promotion.NgayBatDau > now || (promotion.NgayKetThuc != null && promotion.NgayKetThuc < now))
                throw new InvalidOperationException("Khuyến mãi chưa bắt đầu hoặc đã hết hạn.");

            if (checkUsageLimit && promotion.GioiHanLuot != null && promotion.SoLuotDaDung >= promotion.GioiHanLuot)
                throw new InvalidOperationException("Khuyến mãi đã hết lượt sử dụng.");

            decimal discount = 0;
            short bonusDays = 0;

            switch (promotion.PromoType)
            {
                case "GiamPhanTram":
                    discount = Math.Round(planPrice * (promotion.PhanTramGiam ?? 0) / 100m);
                    if (promotion.MucGiamToiDa != null && discount > promotion.MucGiamToiDa)
                        discount = promotion.MucGiamToiDa.Value;
                    break;

                case "GiamTienMat":
                    discount = Math.Min(promotion.SoTienGiam ?? 0, planPrice);
                    break;

                case "TangNgay":
                    bonusDays = (short)(promotion.SoNgayTang ?? 0);
                    break;

                case "TangChuKy":
                    // 1 chu kỳ = 30 ngày cố định, KHÔNG phải plan.DurationDays.
                    bonusDays = (short)((promotion.SoChuKyTang ?? 0) * CYCLE_DAYS);
                    break;
            }

            return new PromotionEffectResult
            {
                GiaGoc = planPrice,
                DiscountAmount = discount,
                Amount = planPrice - discount,
                BonusDays = bonusDays,
                Promo = promotion
            };
        }

        // ExpiryDate = StartDate + planDurationDays + bonusDays, cộng bằng AddDays — khớp 100%
        // công thức với MemberPackageService.CalculateExpiryDate. KHÔNG dùng AddMonths ở đây nữa.
        private static DateOnly CalculateNewExpiryDate(DateOnly startDate, int planDurationDays, short bonusDays)
            => startDate.AddDays(planDurationDays + bonusDays);

        // Tra KM đang hiệu lực cho 1 gói tại 1 thời điểm — dùng nội bộ khi điều chỉnh giao dịch,
        // KHÔNG xét GioiHanLuot ở đây (CalculatePromotionEffectAsync xử lý riêng, luôn theo lượt
        // dùng hiện tại). Nếu có nhiều hơn 1 KM cùng hiệu lực, lấy KM đầu tiên tìm được.
        //
        // LƯU Ý: transaction.CreatedAt lưu UTC, nhưng NgayBatDau/NgayKetThuc của Promotion có thể
        // đang lưu theo giờ VN (UTC+7) chưa convert — cần rà lại để tránh lệch múi giờ khi so sánh.
        private async Task<int?> GetActivePromotionIdAtAsync(int planId, DateTime asOf)
        {
            var promo = await _context.Promotions
                .Where(p => p.PlanId == planId
                        && p.TrangThai == "HoatDong"
                        && p.NgayBatDau <= asOf
                        && (p.NgayKetThuc == null || p.NgayKetThuc >= asOf))
                .FirstOrDefaultAsync();

            return promo?.PromotionId;
        }

        // ===================== TẠO GIAO DỊCH (luồng tại quầy) =====================
        public async Task<Transaction> CreateTransactionAsync(CreateTransactionRequest request)
        {
            var now = DateTime.UtcNow;

            var transaction = new Transaction
            {
                OrderCode = GenerateOrderCode(),
                MemberId = request.MemberId,
                PlanId = request.PlanId,
                PromotionId = request.PromotionId,
                BranchId = request.BranchId,
                PaymentMethod = request.PaymentMethod,
                PaymentStatus = request.PaymentStatus,
                GiaGoc = request.GiaGoc,
                Amount = request.Amount,
                BankReferenceCode = request.BankReferenceCode,
                EmployeeId = request.PerformedBy,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            return transaction;
        }

        // ===================== KIỂM TRA QUYỀN ĐIỀU CHỈNH =====================
        //   - RoleId 3 (Admin): qua mọi chi nhánh.
        //   - RoleId 2 (Manager): chỉ qua nếu transaction.BranchId nằm trong chi nhánh quản lý.
        //   - Role khác: từ chối.
        private async Task<Employee> EnsureAdjustPermissionAsync(long employeeId, Transaction transaction)
        {
            var employee = await _context.Employees
                 .Include(e => e.Role)
                 .Include(e => e.Branches)
                 .FirstOrDefaultAsync(e => e.EmployeeId == employeeId)
                 ?? throw new KeyNotFoundException("Không tìm thấy nhân viên.");
            var roleId = employee.Role.RoleId;
            if (roleId != 2 && roleId != 3)
                throw new UnauthorizedAccessException("Bạn không có quyền điều chỉnh giao dịch.");

            if (roleId != 3)
            {
                var myBranchIds = employee.Branches.Select(b => b.BranchId).ToList();
                if (!myBranchIds.Contains(transaction.BranchId))
                    throw new UnauthorizedAccessException("Bạn không có quyền điều chỉnh giao dịch của chi nhánh này.");
            }

            return employee;
        }

        // ===================== VALIDATE DÙNG CHUNG CHO PREVIEW + ADJUST =====================
        // Gom hết phần kiểm tra/điều kiện tiên quyết mà Preview và Adjust dùng CHUNG y hệt nhau
        // (trước đây bị lặp 2 lần): tìm giao dịch, check quyền, check trạng thái, check trùng gói,
        // tìm MemberPackage, tìm gói mới. Trả về đủ dữ liệu để 2 hàm gọi tiếp phần riêng của mình.
        private async Task<(Transaction Transaction, Employee Employee, MemberPackage MemberPackage, MembershipPlan NewPlan)>
            ValidateAdjustmentAsync(long transactionId, int newPlanId, long employeeId)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Member).ThenInclude(m => m.Account)
                .Include(t => t.Branch)
                .Include(t => t.MemberPackages)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId)
                ?? throw new KeyNotFoundException("Không tìm thấy giao dịch.");

            var employee = await EnsureAdjustPermissionAsync(employeeId, transaction);

            if (transaction.EmployeeId == null)
                throw new InvalidOperationException("Không thể điều chỉnh giao dịch mua online qua chức năng này.");

            if (transaction.PaymentStatus != "Paid")
                throw new InvalidOperationException("Chỉ điều chỉnh được giao dịch đã thanh toán.");

            // Trùng gói hiện tại = không có gì để sửa, chặn trước khi đụng tới KM.
            if (newPlanId == transaction.PlanId)
                throw new InvalidOperationException("Gói tập mới trùng với gói tập hiện tại của giao dịch, không thể điều chỉnh.");

            var memberPackage = transaction.MemberPackages.OrderByDescending(mp => mp.CreatedAt).FirstOrDefault()
                ?? throw new InvalidOperationException("Giao dịch này chưa có gói tập tương ứng để điều chỉnh.");

            if (memberPackage.PackageStatus == "PendingActivation")
                throw new InvalidOperationException("Gói tập đang chờ kích hoạt, không thể điều chỉnh qua chức năng này.");

            if (memberPackage.StartDate == null)
                throw new InvalidOperationException("Gói tập chưa có ngày bắt đầu, không thể tính ngày hết hạn mới.");

            var newPlan = await _context.MembershipPlans.FindAsync(newPlanId)
                ?? throw new KeyNotFoundException("Không tìm thấy gói tập mới.");

            return (transaction, employee, memberPackage, newPlan);
        }

        // ===================== XEM TRƯỚC KẾT QUẢ ĐIỀU CHỈNH (KHÔNG LƯU DB) =====================
        // Nếu KM của gói mới đã hết lượt Ở HIỆN TẠI, hàm sẽ ném lỗi ngay tại đây (xem
        // CalculatePromotionEffectAsync) — chặn nhân viên trước khi họ bấm "Lưu thay đổi".
        public async Task<AdjustPlanPreviewResult> PreviewAdjustTransactionPlanAsync(
            long transactionId, int newPlanId, long employeeId)
        {
            var (transaction, _, memberPackage, newPlan) =
                await ValidateAdjustmentAsync(transactionId, newPlanId, employeeId);

            var newPromotionId = await GetActivePromotionIdAtAsync(newPlanId, transaction.CreatedAt);
            var effect = await CalculatePromotionEffectAsync(
                newPromotionId, newPlanId, newPlan.Price, newPlan.DurationDays, transaction.CreatedAt);

            var startDate = memberPackage.StartDate!.Value;
            var newExpiryDate = CalculateNewExpiryDate(startDate, newPlan.DurationDays, effect.BonusDays);

            return new AdjustPlanPreviewResult
            {
                PlanId = newPlan.PlanId,
                PlanName = newPlan.PlanName,
                GiaGoc = effect.GiaGoc,
                DiscountAmount = effect.DiscountAmount,
                Amount = effect.Amount,
                BonusDays = effect.BonusDays,
                PromotionId = effect.Promo?.PromotionId,
                PromotionName = effect.Promo?.TenKhuyenMai,
                StartDate = startDate,
                NewExpiryDate = newExpiryDate
            };
        }

        // ===================== ĐIỀU CHỈNH LẠI GÓI TẬP DO CHỌN NHẦM =====================
        // Chỉ áp dụng giao dịch tại quầy đã Paid. KM cho gói mới do BE tự tra tại transaction.CreatedAt
        // — nếu KM đó hết lượt Ở HIỆN TẠI thì chặn luôn (không cho điều chỉnh).
        // Sau khi lưu DB thành công: hoàn lượt dùng KM cũ, ghi lượt dùng KM mới, ghi log, và lập lại
        // hóa đơn PDF (dùng branch gốc của giao dịch, đánh dấu IsAdjustmentReissue). Nếu lập hóa đơn
        // lỗi thì KHÔNG rollback dữ liệu đã điều chỉnh (xem GenerateAndAttachInvoiceAsync).
        public async Task<Transaction> AdjustTransactionPlanAsync(
            long transactionId, int newPlanId, long adjustedByEmployeeId, string? reason)
        {
            var (transaction, adjustingEmployee, memberPackage, newPlan) =
                await ValidateAdjustmentAsync(transactionId, newPlanId, adjustedByEmployeeId);

            var newPromotionId = await GetActivePromotionIdAtAsync(newPlanId, transaction.CreatedAt);
            var effect = await CalculatePromotionEffectAsync(
                newPromotionId, newPlanId, newPlan.Price, newPlan.DurationDays, transaction.CreatedAt);

            var (oldPlanId, oldGiaGoc, oldAmount, oldPromotionId) =
                (transaction.PlanId, transaction.GiaGoc, transaction.Amount, transaction.PromotionId);

            await ReversePromotionUsagesAsync(memberPackage.MemberPackageId);

            transaction.PlanId = newPlanId;
            transaction.PromotionId = effect.Promo?.PromotionId;
            transaction.GiaGoc = effect.GiaGoc;
            transaction.Amount = effect.Amount;
            transaction.UpdatedAt = DateTime.UtcNow;

            memberPackage.PlanId = newPlanId;
            memberPackage.PromotionId = effect.Promo?.PromotionId;
            memberPackage.GiaGoc = effect.GiaGoc;
            memberPackage.Amount = effect.Amount;
            memberPackage.SoNgayTangThucTe = effect.BonusDays;
            // StartDate KHÔNG đổi khi điều chỉnh — chỉ đổi gói/KM/ExpiryDate.
            memberPackage.ExpiryDate = CalculateNewExpiryDate(
                memberPackage.StartDate!.Value, newPlan.DurationDays, effect.BonusDays);
            memberPackage.UpdatedAt = DateTime.UtcNow;

            if (effect.Promo != null)
                RecordPromotionUsage(effect.Promo, transaction.MemberId, memberPackage.MemberPackageId,
                    newPlanId, effect.BonusDays, effect.DiscountAmount);

            var adjustedAt = DateTime.UtcNow;
            _context.TransactionAdjustmentLogs.Add(new TransactionAdjustmentLog
            {
                TransactionId = transaction.TransactionId,
                OldPlanId = oldPlanId,
                NewPlanId = newPlanId,
                OldGiaGoc = oldGiaGoc,
                NewGiaGoc = effect.GiaGoc,
                OldAmount = oldAmount,
                NewAmount = effect.Amount,
                OldPromotionId = oldPromotionId,
                NewPromotionId = effect.Promo?.PromotionId,
                Reason = reason,
                AdjustedBy = adjustedByEmployeeId,
                AdjustedAt = adjustedAt
            });

            await _context.SaveChangesAsync();

            await GenerateAndAttachInvoiceAsync(transaction, new InvoiceData
            {
                OrderCode = transaction.OrderCode,
                MemberName = transaction.Member.FullName,
                MemberPhone = transaction.Member.Account.Phone,
                PlanName = newPlan.PlanName,
                GiaGoc = effect.GiaGoc,
                DiscountAmount = effect.DiscountAmount,
                Amount = effect.Amount,
                BonusDays = effect.BonusDays,
                StartDate = memberPackage.StartDate!.Value,
                ExpiryDate = memberPackage.ExpiryDate!.Value,
                PaymentMethod = transaction.PaymentMethod,
                CreatedAt = transaction.CreatedAt, // giữ ngày lập hóa đơn gốc để hội viên đối chiếu
                EmployeeName = adjustingEmployee.FullName,
                PromotionName = effect.Promo?.TenKhuyenMai,
                BranchName = transaction.Branch.BranchName,
                BranchAddress = transaction.Branch.Address,
                BranchPhone = transaction.Branch.Phone,
                IsAdjustmentReissue = true,
                AdjustedAt = adjustedAt
            });

            return transaction;
        }

        // Hoàn lại lượt dùng của các KM cũ từng ghi nhận cho memberPackage này, tránh
        // SoLuotDaDung/PromotionUsage bị lệch sau khi ghi đè sang KM mới.
        private async Task ReversePromotionUsagesAsync(long memberPackageId)
        {
            var oldUsages = await _context.PromotionUsages
                .Where(u => u.MemberPackageId == memberPackageId)
                .ToListAsync();

            if (oldUsages.Count == 0) return;

            var oldPromotionIds = oldUsages.Select(u => u.PromotionId).Distinct().ToList();
            var oldPromotions = await _context.Promotions
                .Where(p => oldPromotionIds.Contains(p.PromotionId))
                .ToListAsync();

            foreach (var usage in oldUsages)
            {
                var oldPromo = oldPromotions.FirstOrDefault(p => p.PromotionId == usage.PromotionId);
                if (oldPromo != null && oldPromo.SoLuotDaDung > 0)
                    oldPromo.SoLuotDaDung -= 1;
            }

            _context.PromotionUsages.RemoveRange(oldUsages);
        }

        // ===================== LỊCH SỬ ĐIỀU CHỈNH GÓI TẬP CỦA 1 HỘI VIÊN =====================
        public async Task<List<MemberUpdateSessionResponse>> GetPackageAdjustmentHistoryAsync(long memberId)
        {
            var logs = await _context.TransactionAdjustmentLogs
                .Include(a => a.Transaction)
                .Include(a => a.AdjustedByNavigation)
                .Where(a => a.Transaction.MemberId == memberId)
                .OrderByDescending(a => a.AdjustedAt)
                .ToListAsync();

            if (logs.Count == 0)
                return new List<MemberUpdateSessionResponse>();

            var planIds = logs.SelectMany(l => new[] { l.OldPlanId, l.NewPlanId }).Distinct().ToList();
            var planNames = await _context.MembershipPlans
                .Where(p => planIds.Contains(p.PlanId))
                .ToDictionaryAsync(p => p.PlanId, p => p.PlanName);

            string PlanName(int planId) => planNames.TryGetValue(planId, out var name) ? name : $"#{planId}";

            return logs.Select(l => new MemberUpdateSessionResponse
            {
                SessionId = $"pkgadjust-{l.AdjustmentId}",
                SessionType = "PACKAGE_ADJUST",
                EmployeeName = l.AdjustedByNavigation.FullName,
                UpdatedAt = l.AdjustedAt,
                Reason = l.Reason,
                Changes = new List<MemberUpdateLogItem>
                {
                    new() { FieldName = "Gói tập", OldValue = PlanName(l.OldPlanId), NewValue = PlanName(l.NewPlanId) },
                    new() { FieldName = "Giá gốc", OldValue = l.OldGiaGoc.ToString("N0"), NewValue = l.NewGiaGoc.ToString("N0") },
                    new() { FieldName = "Số tiền thanh toán", OldValue = l.OldAmount.ToString("N0"), NewValue = l.NewAmount.ToString("N0") }
                }
            }).ToList();
        }

        // ===================== GHI NHẬN LƯỢT DÙNG KHUYẾN MÃI =====================
        public void RecordPromotionUsage(
            Promotion promotion, long memberId, long memberPackageId, int planId,
            short bonusDays, decimal discountAmount)
        {
            _context.PromotionUsages.Add(new PromotionUsage
            {
                PromotionId = promotion.PromotionId,
                MemberId = memberId,
                MemberPackageId = memberPackageId,
                PlanId = planId,
                SoNgayDuocTang = bonusDays,
                SoTienDaGiam = discountAmount,
                ApDungLuc = DateTime.UtcNow
            });
            promotion.SoLuotDaDung += 1;
        }

        // ===================== SINH & LƯU HÓA ĐƠN PDF =====================
        public async Task<string?> GenerateAndAttachInvoiceAsync(Transaction transaction, InvoiceData data)
        {
            try
            {
                var pdfBytes = _invoiceService.GenerateInvoicePdf(data);

                var invoiceUrl = await _storageService.UploadBytesAsync(
                    pdfBytes, $"{transaction.OrderCode}.pdf", "invoices", "application/pdf");

                transaction.ReceiptImage = invoiceUrl;
                await _context.SaveChangesAsync();

                return invoiceUrl;
            }
            catch
            {
                return null;
            }
        }
    }
}