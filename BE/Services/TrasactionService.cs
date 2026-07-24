using BE.Data;
using BE.Dtos.Member;
using BE.Dtos.Promotion;
using BE.DTOs.Payment;
using BE.Models;
using BE.Services.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    // Chỉ lo phần "tiền" — tạo Transaction, tính khuyến mãi giảm giá, sinh & lưu hóa đơn PDF,
    // và truy vấn lịch sử giao dịch/đăng ký (vì query xoay quanh chính bảng Transaction).
    // KHÔNG biết gì về MemberPackage — MemberService là nơi ghép Transaction + MemberPackage lại.
    //
    // [MỚI] Transaction.BranchId giờ là cột BẮT BUỘC (not null) — mọi giao dịch đều phải gắn
    // với chi nhánh đã bán gói tập:
    //   - Luồng tại quầy (MemberService): branchId lấy từ Employee.Branches của thu ngân.
    //   - Luồng mua online (PaymentService.CreatePaymentAsync): branchId do FE gửi lên, được
    //     validate qua MemberPackageService.EnsureBranchExistsAsync rồi gán trực tiếp lúc tạo
    //     Transaction (PaymentService KHÔNG gọi CreateTransactionAsync bên dưới, vì luồng online
    //     luôn ở trạng thái Pending — tạo transaction xong chờ webhook, không tạo Transaction đã
    //     Paid ngay như luồng tại quầy).
    //
    // [SỬA] Đã bỏ bảng PromotionPlans (many-to-many Promotion <-> MembershipPlan). Promotion giờ
    // gắn trực tiếp 1-1 với 1 MembershipPlan qua cột Promotion.PlanId. Vì vậy CalculatePromotionEffectAsync
    // giờ phải tự kiểm tra promotion.PlanId có khớp với gói đang mua hay không (trước đây việc này
    // do chính join PromotionPlans đảm nhiệm — không tìm thấy dòng join nghĩa là không hợp lệ).
    //
    // [MỚI] Hỗ trợ ĐIỀU CHỈNH LẠI giao dịch tại quầy khi nhân viên bán/chọn nhầm gói tập
    // (AdjustTransactionPlanAsync). Quyền điều chỉnh:
    //   - RoleId == 3 (Admin): sửa được giao dịch ở BẤT KỲ chi nhánh nào.
    //   - RoleId == 2 (Manager): CHỈ sửa được giao dịch thuộc chi nhánh mình đang quản lý
    //     (Employee.EmployeeBranches).
    //   - Các role khác (vd Cashier = RoleId 1): KHÔNG được điều chỉnh.
    // Mọi lần điều chỉnh đều được ghi log lại vào TransactionAdjustmentLogs (ai sửa, sửa từ
    // gói/tiền/KM nào sang gói/tiền/KM nào, lúc nào) — GetPackageAdjustmentHistoryAsync dùng để
    // hiển thị lại lịch sử này cho 1 hội viên.
    //
    // [MỚI] KHÔNG còn cho FE tự chọn promotionId khi điều chỉnh gói nữa. BE tự động tra khuyến
    // mãi đang hiệu lực cho gói mới TẠI THỜI ĐIỂM giao dịch gốc được tạo (transaction.CreatedAt).
    // Để FE xem trước kết quả BE sẽ tính ra sao (giá, KM, ngày hết hạn mới) trước khi bấm xác
    // nhận, dùng PreviewAdjustTransactionPlanAsync bên dưới — chỉ tính, KHÔNG lưu DB.
    //
    // [13/07/2026 - FIX HIỂU LẦM "NGÀY TẠO" vs "NGÀY BẮT ĐẦU"] PreviewAdjustTransactionPlanAsync
    // trả thêm StartDate (= memberPackage.StartDate, mốc gốc thực sự dùng để cộng ra NewExpiryDate),
    // vì trước đây FE chỉ có transaction.CreatedAt để đối chiếu, dễ hiểu nhầm là NewExpiryDate được
    // tính từ CreatedAt trong khi thực chất tính từ StartDate của MemberPackage (có thể khác
    // CreatedAt nếu là gói gia hạn nối tiếp hoặc kích hoạt trễ).
    //
    // [MỚI] KHÔNG cho điều chỉnh nếu gói tập mới trùng với gói tập hiện tại của giao dịch
    // (newPlanId == transaction.PlanId) — coi như không có gì để sửa, chặn ngay từ đầu (cả ở
    // bước Preview lẫn Adjust thật) trước khi đụng tới tra cứu khuyến mãi/tính toán.
    //
    // [MỚI] Sau khi điều chỉnh THÀNH CÔNG, hàm AdjustTransactionPlanAsync giờ tự LẬP LẠI hóa đơn
    // PDF (gọi GenerateAndAttachInvoiceAsync ngay bên trong, không cần Controller gọi riêng nữa).
    // Hóa đơn mới:
    //   - Dùng ĐÚNG chi nhánh gốc của giao dịch (transaction.Branch) — vì điều chỉnh chỉ đổi
    //     gói tập/khuyến mãi, KHÔNG đổi chi nhánh đã bán, nên địa chỉ/số điện thoại in trên hóa
    //     đơn mới vẫn là chi nhánh mà khách đã thực hiện giao dịch gốc.
    //   - Có thêm 1 dòng lưu ý (IsAdjustmentReissue = true) cho biết đây là hóa đơn được lập lại
    //     sau khi điều chỉnh thông tin giao dịch, kèm thời điểm điều chỉnh.
    //   - ReceiptImage cũ (nếu có) sẽ bị ghi đè bằng URL hóa đơn mới.
    //
    // [FIX - 13/07/2026 - LẦN 3 - THỐNG NHẤT LẠI CÔNG THỨC "CHU KỲ"] Các lần sửa trước (LẦN 1, LẦN 2
    // — xem lịch sử comment cũ bên dưới CalculateNewExpiryDate trước khi sửa) đã đưa TangChuKy về
    // hướng "1 chu kỳ = 1 THÁNG LỊCH", dùng AddMonths + suy ngược planDurationDays -> planMonths
    // (kèm lớp phòng vệ dung sai 5 ngày). Cách làm đó SAI với định nghĩa nghiệp vụ thực tế:
    // "1 chu kỳ = 30 NGÀY CỐ ĐỊNH" (không phải tháng lịch, không AddMonths) — ĐÃ được áp dụng và
    // xác nhận trong MemberPackageService.CalculateBonusDays (CYCLE_DAYS = 30, cộng bằng AddDays).
    //
    // Hậu quả của việc có 2 công thức khác nhau cho cùng loại KM "TangChuKy": ngày hết hạn khi
    // TẠO MỚI/GIA HẠN gói (qua MemberPackageService, 30 ngày/chu kỳ) sẽ LỆCH với ngày hết hạn khi
    // ĐIỀU CHỈNH lại giao dịch (qua CalculateNewExpiryDate cũ ở đây, dùng AddMonths theo lịch) —
    // cùng 1 khuyến mãi nhưng ra 2 kết quả khác nhau tùy đi qua luồng nào.
    //
    // FIX: Bỏ hẳn cách quy đổi planMonths/AddMonths + lớp phòng vệ dung sai DurationDays (không
    // còn cần thiết vì không còn suy ngược gì từ DurationDays nữa). CalculateNewExpiryDate giờ
    // dùng ĐÚNG 1 công thức duy nhất, khớp 100% với MemberPackageService:
    //     ExpiryDate = StartDate + planDurationDays (ngày) + bonusDays (ngày)
    //     bonusDays: TangNgay = SoNgayTang; TangChuKy = SoChuKyTang * 30; còn lại = 0.
    // Toàn bộ cộng bằng AddDays, KHÔNG dùng AddMonths ở bất kỳ đâu trong file này nữa.
    //
    // [FIX - 19/07/2026 - ĐỒNG BỘ MÃ ĐƠN HÀNG VỚI PAYMENTSERVICE] GenerateOrderCode() bên dưới
    // (prefix "HD") giờ là NGUỒN SINH MÃ ĐƠN HÀNG DUY NHẤT của toàn hệ thống. Trước đây
    // PaymentService (luồng mua online) có 1 hàm GenerateOrderCode() RIÊNG, sinh mã prefix "GYM"
    // theo định dạng khác (dùng DateTime.Now + mili-giây thay vì UtcNow) — khiến giao dịch tại
    // quầy và giao dịch online có 2 kiểu mã khác nhau. PaymentService đã được sửa để gọi thẳng
    // TransactionService.GenerateOrderCode() (hàm này là static, không cần khởi tạo instance)
    // thay vì tự sinh mã riêng. File này KHÔNG cần đổi gì thêm ngoài giữ nguyên hàm static public
    // này để PaymentService tham chiếu được.
    public class TransactionService
    {
        // ===================== ĐỘ DÀI 1 CHU KỲ = 30 NGÀY CỐ ĐỊNH =====================
        // PHẢI khớp với MemberPackageService.CYCLE_DAYS — đây là nguồn công thức thứ 2 cho cùng
        // 1 khái niệm nghiệp vụ vì TransactionService không có tham chiếu tới MemberPackageService.
        // Nếu sau này đổi định nghĩa "1 chu kỳ", phải sửa ĐỒNG THỜI ở cả 2 nơi (MemberPackageService
        // và đây), và tốt nhất nên gom về 1 chỗ dùng chung (vd tiêm MemberPackageService vào đây)
        // để tránh 2 hằng số bị lệch nhau trong tương lai.
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

        // [FIX - 19/07/2026] Đây giờ là NGUỒN SINH MÃ ĐƠN HÀNG DUY NHẤT cho toàn hệ thống — dùng
        // cho cả luồng tạo giao dịch tại quầy (CreateTransactionAsync bên dưới) LẪN luồng mua
        // online (PaymentService.CreatePaymentAsync gọi thẳng TransactionService.GenerateOrderCode()
        // vì hàm này static và PaymentService đã có _transactionService tiêm sẵn qua constructor).
        // Định dạng: "HD" + yyyyMMddHHmmss (UTC, 14 số) + 4 số random = 18 ký tự số sau "HD".
        // Regex bóc tách OrderCode từ nội dung chuyển khoản ngân hàng trong
        // PaymentService.HandleWebhookAsync (@"\bHD\d{18,}\b") PHẢI luôn khớp với định dạng này —
        // nếu đổi định dạng ở đây (đổi prefix, đổi số chữ số...) thì phải sửa đồng thời regex đó.
        public static string GenerateOrderCode()
            => $"HD{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}";

        // ===================== LỊCH SỬ ĐĂNG KÝ GÓI DÙNG CHO NHÂN VIÊN VÌ NHÂN VIÊN CHỈ CÓ 1 CHI NHÁNH
        public async Task<List<HistoryRegisPacReponse>> GetHistoryRegisPac(
            string? keyword, string? status, string? channel, int? branchId, long employeeId)
        {
            var employee = await _context.Employees
                .Include(e => e.Role)
                .Include(e => e.EmployeeBranches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
                throw new KeyNotFoundException("Không tìm thấy nhân viên.");

            var isAdmin = employee.Role.RoleId == 3;

            var query = _context.Transactions
             .Include(t => t.Member).ThenInclude(m=>m.Account)
              .Include(t=>t.Member).ThenInclude(m => m.FaceDatum)
             .Include(t => t.Plan)
             .Include(t => t.Branch)          // 👈 thêm dòng này
             .Include(t => t.MemberPackages)
             .AsQueryable();

            if (isAdmin)
            {
                // Admin: xem toàn bộ, chỉ lọc branch nếu FE có truyền lên
                if (branchId.HasValue)
                    query = query.Where(t => t.BranchId == branchId.Value);
            }
            else
            {
                // Manager và Cashier: đều chỉ được xem trong phạm vi chi nhánh mình được gán
                var myBranchIds = employee.EmployeeBranches
                    .Select(b => b.BranchId)
                    .ToList();

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
                query = query.Where(t =>
                    t.Member.FullName.Contains(keyword) ||
                    t.Member.Account.Phone.Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(channel) && channel != "all")
            {
                // Có EmployeeId -> giao dịch tạo tại quầy; không có -> khách tự mua (online)
                bool isCounter = channel.Equals("Tại quầy", StringComparison.OrdinalIgnoreCase);
                query = isCounter
                    ? query.Where(t => t.EmployeeId != null)
                    : query.Where(t => t.EmployeeId == null);
            }

            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var result = transactions.Select(t =>
            {
                var memberPackage = t.MemberPackages
                    .OrderByDescending(mp => mp.CreatedAt)
                    .FirstOrDefault();

                return new HistoryRegisPacReponse
                {
                    transactionId = t.TransactionId,
                    UrlImg = t.Member.FaceDatum?.ProfileImage,
                    Phone = t.Member.Account.Phone,
                    FullName = t.Member.FullName,
                    OrderCode = t.OrderCode,
                    PlanName = t.Plan.PlanName,
                    BranchName = t.Branch.BranchName,
                    PurchaseChannel = t.EmployeeId != null ? "Tại quầy" : "Online",
                    StartDate = memberPackage?.StartDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    ExpiryDate = memberPackage?.ExpiryDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    OriginalAmount = t.GiaGoc,
                    Amount = t.Amount,
                    Status = t.PaymentStatus
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(status) && status != "all")
            {
                result = result
                    .Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return result;
        }

        // ===================== KHÁCH HÀNG XEM LẠI LỊCH SỬ GIAO DỊCH CỦA CHÍNH MÌNH =====================
        public async Task<List<HistoryRegisPacReponse>> GetMyHistoryAsync(long memberId)
        {
            var query = _context.Transactions
                .Include(t => t.Member)
                .ThenInclude(m => m.FaceDatum)
                .Include(t => t.Plan)
                .Include(t => t.MemberPackages)
                .Where(t => t.MemberId == memberId) // [MỚI] chỉ giao dịch của chính member này
                .AsQueryable();



            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var result = transactions.Select(t =>
            {
                var memberPackage = t.MemberPackages
                    .OrderByDescending(mp => mp.CreatedAt)
                    .FirstOrDefault();

                return new HistoryRegisPacReponse
                {
                    transactionId = t.TransactionId,
                    UrlImg = t.Member.FaceDatum?.ProfileImage,
                    Phone = t.Member.Account.Phone,
                    FullName = t.Member.FullName,
                    PlanName = t.Plan.PlanName,
                    PurchaseChannel = t.EmployeeId != null ? "Tại quầy" : "Online",
                    StartDate = memberPackage?.StartDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    ExpiryDate = memberPackage?.ExpiryDate ?? DateOnly.FromDateTime(t.CreatedAt),
                    OriginalAmount = t.GiaGoc,
                    Amount = t.Amount,
                    Status = t.PaymentStatus
                };
            }).ToList();

            return result;
        }

        // ===================== TÍNH HIỆU LỰC KHUYẾN MÃI (giảm giá HOẶC tặng ngày) =====================
        // [MỚI] Thêm tham số asOf (mặc định null -> dùng DateTime.UtcNow như cũ). Khi ĐIỀU CHỈNH lại
        // một giao dịch cũ, phải truyền transaction.CreatedAt vào asOf để kiểm tra hiệu lực khuyến
        // mãi (ngày bắt đầu/kết thúc) TẠI THỜI ĐIỂM giao dịch gốc được tạo.
        //
        // [MỚI] checkUsageLimit (mặc định true): có chặn theo GioiHanLuot/SoLuotDaDung hay không.
        // SoLuotDaDung LUÔN là số đếm TẠI THỜI ĐIỂM HIỆN TẠI (không suy ngược được theo asOf).
        // Ở luồng tạo giao dịch mới: check ở HIỆN TẠI là đúng nghĩa (KM hết lượt thì không cho mua).
        // Ở luồng điều chỉnh: cũng giữ true — nếu KM của gói mới đã hết lượt Ở HIỆN TẠI thì
        // KHÔNG cho điều chỉnh sang gói đó nữa (xem giải thích ở đầu file).
        //
        // [FIX - LẦN 3] bonusDays trả về ở đây giờ là SỐ NGÀY THẬT SỰ được dùng để cộng ra ngày
        // hết hạn (qua CalculateNewExpiryDate / CalculateExpiryDate) — KHÔNG còn là giá trị "chỉ
        // để tham khảo/hiển thị" như comment cũ. Với "TangNgay": bonusDays = SoNgayTang (cộng
        // thẳng). Với "TangChuKy": bonusDays = SoChuKyTang * CYCLE_DAYS (= SoChuKyTang * 30, CỐ
        // ĐỊNH — không phải AddMonths theo lịch, không phụ thuộc DurationDays của gói).
        public async Task<(decimal GiaGoc, decimal DiscountAmount, decimal Amount, short BonusDays, Promotion? Promo)>
            CalculatePromotionEffectAsync(
                int? promotionId, int planId, decimal planPrice, int planDurationDays,
                DateTime? asOf = null,
                bool checkUsageLimit = true)
        {
            if (promotionId == null)
                return (planPrice, 0, planPrice, 0, null);

            var promotion = await _context.Promotions
                .FirstOrDefaultAsync(p => p.PromotionId == promotionId);

            if (promotion == null)
                throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

            // [MỚI] Không còn bảng PromotionPlans để đảm bảo khuyến mãi thuộc đúng gói — Promotion
            // giờ có sẵn cột PlanId (1 khuyến mãi chỉ gắn với đúng 1 gói), nên phải tự kiểm tra ở đây
            // để tránh áp nhầm khuyến mãi của gói khác vào giao dịch đang tạo.
            if (promotion.PlanId != planId)
                throw new InvalidOperationException("Khuyến mãi không áp dụng cho gói tập này.");

            var now = asOf ?? DateTime.UtcNow;

            if (promotion.TrangThai != "HoatDong")
                throw new InvalidOperationException("Khuyến mãi hiện không hoạt động.");

            if (promotion.NgayBatDau > now || (promotion.NgayKetThuc != null && promotion.NgayKetThuc < now))
                throw new InvalidOperationException("Khuyến mãi chưa bắt đầu hoặc đã hết hạn.");

            // [MỚI] Check số lượt LUÔN dựa trên SoLuotDaDung tại HIỆN TẠI, bất kể asOf truyền vào
            // là ngày nào — vì đây là cột đếm dồn, không suy ngược được theo thời gian quá khứ.
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
                    discount = promotion.SoTienGiam ?? 0;
                    if (discount > planPrice) discount = planPrice;
                    break;

                case "TangNgay":
                    bonusDays = (short)(promotion.SoNgayTang ?? 0);
                    break;

                case "TangChuKy":
                    // [FIX - LẦN 3] 1 chu kỳ = 30 ngày CỐ ĐỊNH, KHÔNG phải plan.DurationDays (bug
                    // gốc: "1 * 90 = 90 ngày" cho gói 3 tháng thay vì đúng ra "1 * 30 = 30 ngày").
                    bonusDays = (short)((promotion.SoChuKyTang ?? 0) * CYCLE_DAYS);
                    break;
            }

            var amount = planPrice - discount;
            return (planPrice, discount, amount, bonusDays, promotion);
        }

        // ===================== TÍNH NGÀY HẾT HẠN MỚI (dùng cho Preview + Adjust) =====================
        // [FIX - 13/07/2026 - LẦN 3] Trước đây hàm này dùng AddMonths + suy ngược planDurationDays
        // ra "số tháng" (kèm lớp phòng vệ dung sai 5 ngày) — cách này SAI so với định nghĩa nghiệp
        // vụ "1 chu kỳ = 30 ngày cố định" và KHÔNG khớp với công thức đang dùng ở
        // MemberPackageService.CalculateExpiryDate (cộng thẳng bằng AddDays). Hậu quả: điều chỉnh
        // giao dịch cho ra ngày hết hạn khác với lúc tạo/gia hạn ban đầu cho cùng 1 khuyến mãi.
        //
        // FIX: Bỏ hẳn AddMonths + toàn bộ lớp phòng vệ suy luận planMonths (không còn cần thiết).
        // Dùng ĐÚNG 1 công thức, khớp 100% MemberPackageService:
        //     ExpiryDate = StartDate + planDurationDays (ngày) + bonusDays (ngày), cộng bằng AddDays.
        // bonusDays lấy thẳng từ CalculatePromotionEffectAsync ở trên (đã đúng: TangNgay=SoNgayTang,
        // TangChuKy=SoChuKyTang*30), KHÔNG tự suy luận lại promo.SoChuKyTang/SoNgayTang ở đây nữa.
        private static DateOnly CalculateNewExpiryDate(DateOnly startDate, int planDurationDays, short bonusDays)
        {
            return startDate.AddDays(planDurationDays + bonusDays);
        }

        // ===================== [MỚI] TRA KHUYẾN MÃI ĐANG HIỆU LỰC CHO 1 GÓI TẠI 1 THỜI ĐIỂM =====================
        // Dùng nội bộ khi ĐIỀU CHỈNH giao dịch: tự động chọn KM hợp lệ (đúng ngày bắt đầu/kết thúc)
        // cho gói mới TẠI THỜI ĐIỂM giao dịch gốc được tạo (asOf = transaction.CreatedAt), KHÔNG
        // cho nhân viên chọn tay nữa. Chỉ xét ngày hiệu lực — KHÔNG xét GioiHanLuot ở đây, vì việc
        // đó đã được CalculatePromotionEffectAsync xử lý riêng (và LUÔN theo số lượt HIỆN TẠI, xem
        // giải thích ở trên) — nếu hết lượt, hàm đó sẽ tự ném lỗi chặn đứng cả điều chỉnh.
        // Nếu tại asOf có nhiều hơn 1 KM cùng hiệu lực cho gói này, đang lấy KM đầu tiên tìm được —
        // báo lại nếu cần quy tắc ưu tiên khác (ví dụ giảm nhiều nhất / mới tạo nhất).
        //
        // LƯU Ý: asOf (transaction.CreatedAt) đang lưu theo UTC (CreateTransactionAsync dùng
        // DateTime.UtcNow), trong khi NgayBatDau/NgayKetThuc của Promotion RẤT CÓ THỂ đang được
        // nhập/lưu theo giờ địa phương (VN, UTC+7) mà không convert. Nếu đúng vậy, một khuyến mãi
        // "còn hiệu lực" theo mắt người dùng có thể bị so sánh lệch tới 7 tiếng và bị loại nhầm ở
        // đây (biểu hiện: ô "Khuyến mãi tự động áp dụng" ở FE không hiện dù ô tham khảo bên cạnh
        // vẫn thấy KM). Cần kiểm tra lại quy ước lưu giờ của 2 cột NgayBatDau/NgayKetThuc trong DB
        // và đồng bộ cùng 1 múi giờ (khuyến nghị: lưu UTC xuyên suốt) để loại trừ khả năng này.
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

        // ===================== TẠO GIAO DỊCH =====================
        // Dùng cho luồng THU NGÂN (tạo hội viên mới, kích hoạt, gia hạn) — Transaction luôn
        // gắn liền với 1 chi nhánh CỤ THỂ ngay từ lúc tạo (branchId bắt buộc, not null),
        // chính là chi nhánh của nhân viên thu ngân đang thao tác.
        // Luồng mua online KHÔNG dùng hàm này (xem PaymentService.CreatePaymentAsync) nhưng vẫn
        // dùng chung GenerateOrderCode() ở trên để đảm bảo cùng 1 định dạng mã đơn hàng.
        public async Task<Transaction> CreateTransactionAsync(
            long memberId, int planId, int? promotionId,
            decimal giaGoc, decimal amount,
            string paymentMethod, string paymentStatus,
            string? bankReferenceCode,
            long? performedBy,
            int branchId) // [MỚI] bắt buộc — chi nhánh đã bán gói tập trong giao dịch này
        {
            string? receiptImageUrl = null;

            var now = DateTime.UtcNow;

            var transaction = new Transaction
            {
                OrderCode = GenerateOrderCode(),
                MemberId = memberId,
                PlanId = planId,
                PromotionId = promotionId,
                BranchId = branchId, // [MỚI]
                PaymentMethod = paymentMethod,
                PaymentStatus = paymentStatus,
                GiaGoc = giaGoc,
                Amount = amount,
                ReceiptImage = receiptImageUrl,
                BankReferenceCode = bankReferenceCode,
                EmployeeId = performedBy,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            return transaction;
        }

        // ===================== [MỚI] KIỂM TRA QUYỀN ĐIỀU CHỈNH (dùng chung cho Adjust + Preview) =====================
        // Ném KeyNotFoundException nếu không tìm thấy nhân viên, UnauthorizedAccessException nếu
        // không đủ quyền. Trả về Employee để chỗ gọi dùng tiếp (vd lấy FullName in lên hóa đơn
        // lập lại sau khi điều chỉnh).
        //   - RoleId == 3 (Admin): qua mọi chi nhánh.
        //   - RoleId == 2 (Manager): chỉ qua nếu transaction.BranchId nằm trong chi nhánh quản lý.
        //   - Role khác: từ chối thẳng.
        private async Task<Employee> EnsureAdjustPermissionAsync(long employeeId, Transaction transaction)
        {
            var employee = await _context.Employees
                .Include(e => e.Role)
                .Include(e => e.EmployeeBranches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
                throw new KeyNotFoundException("Không tìm thấy nhân viên.");

            var roleId = employee.Role.RoleId;
            if (roleId != 2 && roleId != 3)
                throw new UnauthorizedAccessException("Bạn không có quyền điều chỉnh giao dịch.");

            var isAdmin = roleId == 3;
            if (!isAdmin)
            {
                var myBranchIds = employee.EmployeeBranches.Select(b => b.BranchId).ToList();
                if (!myBranchIds.Contains(transaction.BranchId))
                    throw new UnauthorizedAccessException("Bạn không có quyền điều chỉnh giao dịch của chi nhánh này.");
            }

            return employee;
        }

        // ===================== [MỚI] XEM TRƯỚC KẾT QUẢ ĐIỀU CHỈNH (KHÔNG LƯU DB) =====================
        // FE gọi hàm này TRƯỚC khi bấm xác nhận điều chỉnh, để hiển thị cho nhân viên biết:
        // gói mới giá bao nhiêu, KM nào (nếu có) sẽ được áp dụng, ngày hết hạn mới — và quan
        // trọng nhất: nếu KM của gói mới đã hết lượt Ở HIỆN TẠI thì hàm này sẽ NÉM LỖI ngay,
        // chặn nhân viên trước khi họ kịp bấm "Lưu thay đổi" (xem CalculatePromotionEffectAsync).
        // Hàm này KHÔNG lập hóa đơn — chỉ hàm AdjustTransactionPlanAsync (lưu DB thật) mới lập.
        //
        // Trả thêm StartDate (= memberPackage.StartDate, mốc gốc thực sự được dùng để cộng ra
        // NewExpiryDate) để FE hiển thị đúng mốc tính toán bên cạnh NewExpiryDate.
        public async Task<(int PlanId, string PlanName, decimal GiaGoc, decimal DiscountAmount, decimal Amount,
            short BonusDays, int? PromotionId, string? PromotionName, DateOnly StartDate, DateOnly NewExpiryDate)>
            PreviewAdjustTransactionPlanAsync(long transactionId, int newPlanId, long employeeId)
        {
            var transaction = await _context.Transactions
                .Include(t => t.MemberPackages)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

            if (transaction == null)
                throw new KeyNotFoundException("Không tìm thấy giao dịch.");

            await EnsureAdjustPermissionAsync(employeeId, transaction);

            if (transaction.EmployeeId == null)
                throw new InvalidOperationException("Không thể điều chỉnh giao dịch mua online qua chức năng này.");

            if (transaction.PaymentStatus != "Paid")
                throw new InvalidOperationException("Chỉ điều chỉnh được giao dịch đã thanh toán.");

            // [MỚI] Không cho "điều chỉnh" sang đúng gói tập đang có của giao dịch — trùng gói
            // nghĩa là không có gì để sửa, chặn ngay trước khi tra KM/tính toán gì thêm.
            if (newPlanId == transaction.PlanId)
                throw new InvalidOperationException("Gói tập mới trùng với gói tập hiện tại của giao dịch, không thể điều chỉnh.");

            var memberPackage = transaction.MemberPackages
                .OrderByDescending(mp => mp.CreatedAt)
                .FirstOrDefault();

            if (memberPackage == null)
                throw new InvalidOperationException("Giao dịch này chưa có gói tập tương ứng để điều chỉnh.");

            if (memberPackage.PackageStatus == "PendingActivation")
                throw new InvalidOperationException("Gói tập đang chờ kích hoạt, không thể điều chỉnh qua chức năng này.");

            if (memberPackage.StartDate == null)
                throw new InvalidOperationException("Gói tập chưa có ngày bắt đầu, không thể tính ngày hết hạn mới.");

            var newPlan = await _context.MembershipPlans.FindAsync(newPlanId);
            if (newPlan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập mới.");

            var newPromotionId = await GetActivePromotionIdAtAsync(newPlanId, transaction.CreatedAt);

            // [MỚI] checkUsageLimit mặc định true -> nếu KM này đã hết lượt Ở HIỆN TẠI, dòng dưới
            // sẽ tự throw InvalidOperationException, chặn đứng cả preview lẫn adjust thật.
            var (giaGoc, discount, amount, bonusDays, promo) = await CalculatePromotionEffectAsync(
                newPromotionId, newPlanId, newPlan.Price, newPlan.DurationDays, transaction.CreatedAt);

            // [FIX - LẦN 3] Dùng bonusDays đã tính đúng ở trên (30 ngày/chu kỳ cố định), cộng bằng
            // AddDays — khớp 100% công thức với MemberPackageService, không còn AddMonths.
            var startDate = memberPackage.StartDate!.Value;
            var newExpiryDate = CalculateNewExpiryDate(startDate, newPlan.DurationDays, bonusDays);

            return (newPlan.PlanId, newPlan.PlanName, giaGoc, discount, amount,
                bonusDays, promo?.PromotionId, promo?.TenKhuyenMai, startDate, newExpiryDate);
        }

        // ===================== [MỚI] ĐIỀU CHỈNH LẠI GÓI TẬP DO NHÂN VIÊN THAO TÁC NHẦM =====================
        // Chỉ áp dụng cho giao dịch TẠI QUẦY đã Paid (EmployeeId != null). KHÔNG dùng cho giao dịch
        // online — luồng online có webhook + trạng thái Pending riêng, không nên đụng vào đây.
        //
        // [MỚI] KHÔNG còn nhận promotionId từ bên gọi. Khuyến mãi được BE TỰ TRA CỨU tại thời điểm
        // giao dịch gốc được tạo (transaction.CreatedAt). NẾU khuyến mãi đó đã hết lượt sử dụng Ở
        // HIỆN TẠI, toàn bộ thao tác điều chỉnh bị CHẶN (ném lỗi), không cho sửa gói nữa — coi như
        // phạt việc chọn nhầm gói ban đầu. Muốn xem trước kết quả này, gọi
        // PreviewAdjustTransactionPlanAsync ở trên.
        //
        // [MỚI] Cũng KHÔNG cho điều chỉnh nếu gói mới trùng với gói hiện tại của giao dịch — chặn
        // ngay từ đầu, trước cả bước tra KM.
        //
        // Việc điều chỉnh sẽ:
        //   1. Tự tra KM cho GÓI MỚI tại transaction.CreatedAt, kiểm tra còn lượt Ở HIỆN TẠI không.
        //   2. Cập nhật lại Transaction (PlanId, PromotionId, GiaGoc, Amount).
        //   3. Cập nhật lại MemberPackage tương ứng (PlanId, ExpiryDate tính lại theo gói mới).
        //   4. Ghi log vào TransactionAdjustmentLogs: ai sửa, lý do, cũ -> mới.
        //   5. [MỚI] LẬP LẠI hóa đơn PDF ngay sau khi lưu DB thành công — hóa đơn mới dùng ĐÚNG
        //      chi nhánh gốc của giao dịch (transaction.Branch, KHÔNG đổi theo lần điều chỉnh),
        //      và có thêm dòng lưu ý "hóa đơn được lập lại sau khi điều chỉnh thông tin giao dịch"
        //      kèm thời điểm điều chỉnh. ReceiptImage cũ sẽ bị ghi đè bằng URL hóa đơn mới.
        //      Nếu việc lập hóa đơn thất bại (lỗi mạng/S3...), KHÔNG rollback dữ liệu đã điều chỉnh
        //      — GenerateAndAttachInvoiceAsync tự bắt lỗi và trả về null, không ném exception ra
        //      ngoài (xem cài đặt bên dưới).
        public async Task<Transaction> AdjustTransactionPlanAsync(
            long transactionId,
            int newPlanId,
            long adjustedByEmployeeId,
            string? reason)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Member).ThenInclude(m=>m.Account)
                .Include(t => t.Branch)
                .Include(t => t.MemberPackages)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

            if (transaction == null)
                throw new KeyNotFoundException("Không tìm thấy giao dịch.");

            var adjustingEmployee = await EnsureAdjustPermissionAsync(adjustedByEmployeeId, transaction);

            if (transaction.EmployeeId == null)
                throw new InvalidOperationException("Không thể điều chỉnh giao dịch mua online qua chức năng này.");

            if (transaction.PaymentStatus != "Paid")
                throw new InvalidOperationException("Chỉ điều chỉnh được giao dịch đã thanh toán.");

            // [MỚI] Không cho "điều chỉnh" sang đúng gói tập đang có của giao dịch — trùng gói
            // nghĩa là không có gì để sửa, chặn ngay trước khi tra KM/hoàn lượt dùng/ghi log.
            if (newPlanId == transaction.PlanId)
                throw new InvalidOperationException("Gói tập mới trùng với gói tập hiện tại của giao dịch, không thể điều chỉnh.");

            var memberPackage = transaction.MemberPackages
                .OrderByDescending(mp => mp.CreatedAt)
                .FirstOrDefault();

            if (memberPackage == null)
                throw new InvalidOperationException("Giao dịch này chưa có gói tập tương ứng để điều chỉnh.");

            if (memberPackage.PackageStatus == "PendingActivation")
                throw new InvalidOperationException("Gói tập đang chờ kích hoạt, không thể điều chỉnh qua chức năng này.");

            if (memberPackage.StartDate == null)
                throw new InvalidOperationException("Gói tập chưa có ngày bắt đầu, không thể tính ngày hết hạn mới.");

            var newPlan = await _context.MembershipPlans.FindAsync(newPlanId);
            if (newPlan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập mới.");

            // Tự tra KM hiệu lực tại thời điểm giao dịch gốc được tạo.
            var newPromotionId = await GetActivePromotionIdAtAsync(newPlanId, transaction.CreatedAt);

            // checkUsageLimit mặc định true -> nếu KM mới đã hết lượt Ở HIỆN TẠI, ném lỗi ngay tại đây,
            // KHÔNG cập nhật gì cả -> chặn đứng toàn bộ việc điều chỉnh.
            var (giaGoc, discountAmount, amount, bonusDays, promo) = await CalculatePromotionEffectAsync(
                newPromotionId, newPlanId, newPlan.Price, newPlan.DurationDays, transaction.CreatedAt);

            var oldPlanId = transaction.PlanId;
            var oldGiaGoc = transaction.GiaGoc;
            var oldAmount = transaction.Amount;
            var oldPromotionId = transaction.PromotionId;

            // [MỚI] Hoàn lại lượt dùng của (các) khuyến mãi CŨ từng ghi nhận cho memberPackage này,
            // trước khi ghi đè sang khuyến mãi mới — tránh SoLuotDaDung/PromotionUsage bị lệch so với
            // Transaction/MemberPackage sau khi điều chỉnh.
            var oldUsages = await _context.PromotionUsages
                .Where(u => u.MemberPackageId == memberPackage.MemberPackageId)
                .ToListAsync();

            if (oldUsages.Count > 0)
            {
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

            transaction.PlanId = newPlanId;
            transaction.PromotionId = promo?.PromotionId;
            transaction.GiaGoc = giaGoc;
            transaction.Amount = amount;
            transaction.UpdatedAt = DateTime.UtcNow;

            memberPackage.PlanId = newPlanId;
            memberPackage.PromotionId = promo?.PromotionId;
            memberPackage.GiaGoc = giaGoc;
            memberPackage.Amount = amount;
            memberPackage.SoNgayTangThucTe = bonusDays;

            // [FIX - LẦN 3] Cùng 1 công thức (AddDays, bonusDays = 30/chu kỳ) với
            // PreviewAdjustTransactionPlanAsync, đảm bảo số hiển thị lúc xem trước và số lưu thật
            // xuống DB luôn khớp nhau. StartDate KHÔNG đổi khi điều chỉnh — chỉ đổi gói/KM/ExpiryDate.
            memberPackage.ExpiryDate = CalculateNewExpiryDate(memberPackage.StartDate!.Value, newPlan.DurationDays, bonusDays);
            memberPackage.UpdatedAt = DateTime.UtcNow;

            // [MỚI] Ghi nhận lượt dùng khuyến mãi MỚI (nếu gói mới có KM áp dụng được).
            if (promo != null)
            {
                RecordPromotionUsage(
                    promo, transaction.MemberId, memberPackage.MemberPackageId,
                    newPlanId, bonusDays, discountAmount);
            }

            var adjustedAt = DateTime.UtcNow;

            _context.TransactionAdjustmentLogs.Add(new TransactionAdjustmentLog
            {
                TransactionId = transaction.TransactionId,
                OldPlanId = oldPlanId,
                NewPlanId = newPlanId,
                OldGiaGoc = oldGiaGoc,
                NewGiaGoc = giaGoc,
                OldAmount = oldAmount,
                NewAmount = amount,
                OldPromotionId = oldPromotionId,
                NewPromotionId = promo?.PromotionId,
                Reason = reason,
                AdjustedBy = adjustedByEmployeeId,
                AdjustedAt = adjustedAt
            });

            await _context.SaveChangesAsync();

            // ===== [MỚI] LẬP LẠI HÓA ĐƠN sau khi điều chỉnh thành công =====
            // Chi nhánh in trên hóa đơn mới LUÔN lấy từ transaction.Branch (chi nhánh gốc đã bán
            // gói tập cho khách) — điều chỉnh không đổi chi nhánh nên không cần hỏi lại FE.
            var invoiceData = new InvoiceData
            {
                OrderCode = transaction.OrderCode,
                MemberName = transaction.Member.FullName,
                MemberPhone = transaction.Member.Account.Phone,
                PlanName = newPlan.PlanName,
                GiaGoc = giaGoc,
                DiscountAmount = discountAmount,
                Amount = amount,
                BonusDays = bonusDays,
                StartDate = memberPackage.StartDate!.Value,
                ExpiryDate = memberPackage.ExpiryDate!.Value,
                PaymentMethod = transaction.PaymentMethod,
                CreatedAt = transaction.CreatedAt, // giữ ngày lập hóa đơn gốc để hội viên đối chiếu
                EmployeeName = adjustingEmployee.FullName, // người vừa thực hiện điều chỉnh
                PromotionName = promo?.TenKhuyenMai,
                BranchName = transaction.Branch.BranchName,
                BranchAddress = transaction.Branch.Address,
                BranchPhone = transaction.Branch.Phone,
                IsAdjustmentReissue = true,
                AdjustedAt = adjustedAt
            };

            await GenerateAndAttachInvoiceAsync(transaction, invoiceData);

            return transaction;
        }

        // ===================== [MỚI] LỊCH SỬ ĐIỀU CHỈNH GÓI TẬP CỦA 1 HỘI VIÊN =====================
        // Dùng để ghép chung vào màn hình lịch sử hội viên (giống INFO/FACEID) — trả về cùng kiểu
        // MemberUpdateSessionResponse với SessionType = "PACKAGE_ADJUST".
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

            // Gom hết PlanId cũ/mới xuất hiện trong log để lấy tên gói 1 lần, tránh N+1 query
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
            new MemberUpdateLogItem
            {
                FieldName = "Gói tập",
                OldValue = PlanName(l.OldPlanId),
                NewValue = PlanName(l.NewPlanId)
            },
            new MemberUpdateLogItem
            {
                FieldName = "Giá gốc",
                OldValue = l.OldGiaGoc.ToString("N0"),
                NewValue = l.NewGiaGoc.ToString("N0")
            },
            new MemberUpdateLogItem
            {
                FieldName = "Số tiền thanh toán",
                OldValue = l.OldAmount.ToString("N0"),
                NewValue = l.NewAmount.ToString("N0")
            }
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