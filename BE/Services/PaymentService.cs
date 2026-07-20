// using System.Data;
// using System.Numerics;
// using BE.Data;
// using BE.DTOs.Payment;
// using BE.Exceptions;
// using BE.Models;
// using BE.Services;
// using Microsoft.EntityFrameworkCore;

// namespace BE.Services
// {
//     // [MỚI] BranchId của Transaction giờ là cột BẮT BUỘC (int, not null) — khách mua online phải
//     // chọn chi nhánh ngay từ CreatePaymentRequestDto.BranchId. Giá trị này được lưu thẳng vào
//     // Transaction.BranchId lúc tạo QR (CreatePaymentAsync), rồi webhook (HandleWebhookAsync) đọc
//     // lại để gán cho MemberPackage — đảm bảo MemberPackage.BranchId luôn là chi nhánh khách đã
//     // chọn lúc mua, không phụ thuộc chi nhánh nhân viên đứng kích hoạt sau này.
//     //
//     // [SỬA] Đã bỏ bảng PromotionPlans (quan hệ many-to-many giữa Promotion và MembershipPlan).
//     // Promotion giờ gắn trực tiếp 1-1 với 1 MembershipPlan qua cột Promotion.PlanId, nên mọi chỗ
//     // trước đây join qua PromotionPlans giờ chỉ cần lọc thẳng Promotions.Where(p => p.PlanId == ...).
//     //
//     // [FIX - 13/07/2026] 2 lỗi liên quan tới khuyến mãi phát hiện trong file này (đã sửa ở lần
//     // trước, giữ nguyên):
//     //
//     // 1) HandleWebhookAsync: tính bonus ngày cho loại "TangChuKy" từng dùng
//     //        soNgayTang = (short)((promotion.SoChuKyTang ?? 0) * plan.DurationDays);
//     //    -> bug gốc "1 chu kỳ = DurationDays của gói" thay vì 30 ngày cố định.
//     //
//     // 2) CreatePaymentAsync: điều kiện lọc khuyến mãi trước đây thiếu check null cho NgayKetThuc,
//     //    khiến khuyến mãi "vĩnh viễn" (NgayKetThuc == null) bị loại oan khỏi kết quả.
//     //
//     // [MỚI - 13/07/2026] GOM CÔNG THỨC VỀ MemberPackageService — trước đây PaymentService tự viết
//     // riêng cả 2 công thức (tính giá sau giảm ở CreatePaymentAsync bằng switch thủ công, và tính
//     // bonus ngày ở HandleWebhookAsync bằng hằng CYCLE_DAYS riêng của chính file này) vì không có
//     // tham chiếu logic dùng chung — đây chính là "nguồn công thức thứ 3" từng được ghi chú ở trên.
//     // Giờ PaymentService đã có sẵn _packageService (MemberPackageService) tiêm vào constructor, nên
//     // dùng thẳng:
//     //   - _packageService.CalculateDiscountedAmount(promotion, giaGoc) thay cho switch tính giảm giá
//     //     thủ công trong CreatePaymentAsync.
//     //   - _packageService.CalculateBonusDays(promotion, plan) thay cho if/else + CYCLE_DAYS thủ công
//     //     trong HandleWebhookAsync.
//     // Xóa hằng CYCLE_DAYS cục bộ của file này — không còn "3 nguồn công thức" nữa, chỉ còn đúng 1
//     // nguồn duy nhất ở MemberPackageService, khớp với TransactionService cũng đang dùng chung.
//     //
//     // [FIX - 13/07/2026] HandleWebhookAsync, nhánh member.Status == "PendingActivation": trước đây
//     // vẫn còn SÓT 1 chỗ tự viết lại công thức cộng ngày bằng tay để tính paidExpiryDate ước tính
//     // cho hóa đơn (todayForInvoice.AddDays(plan.DurationDays + soNgayTang)), dù comment đầu file
//     // đã khẳng định "gom về 1 nguồn công thức duy nhất". Giá trị ra vẫn ĐÚNG vì công thức viết tay
//     // giống hệt bên trong CalculateExpiryDate, nhưng đây vẫn là 1 điểm trùng lặp: nếu sau này
//     // MemberPackageService.CalculateExpiryDate đổi cách tính (VD đổi quy tắc làm tròn, đổi cách xử
//     // lý ngày lễ...) mà quên sửa chỗ này thì số hiển thị trên hóa đơn (paidExpiryDate) sẽ LỆCH so
//     // với ExpiryDate thật được lưu khi khách kích hoạt gói (ActivatePendingPackageAsync). Đổi sang
//     // gọi thẳng _packageService.CalculateExpiryDate(...) để chỉ còn đúng 1 nguồn công thức, không
//     // đổi kết quả tính toán, chỉ đổi chỗ viết công thức — cùng nguyên tắc đã áp dụng cho
//     // ActivatePendingPackageAsync/CreateActivePackageForCustomerAsync bên MemberPackageService.
//     //
//     // [FIX - 19/07/2026] ĐỒNG BỘ MÃ ĐƠN HÀNG (OrderCode) VỚI TRANSACTIONSERVICE.
//     // Trước đây file này tự có 1 hàm GenerateOrderCode() RIÊNG, sinh mã prefix "GYM" (dựa vào
//     // DateTime.Now với mili-giây: yyyyMMddHHmmssfff + 4 số random), trong khi TransactionService
//     // (luồng tại quầy) lại có 1 hàm GenerateOrderCode() KHÁC, sinh mã prefix "HD" (dựa vào
//     // DateTime.UtcNow: yyyyMMddHHmmss + 4 số random). Hậu quả: giao dịch tạo tại quầy và giao dịch
//     // mua online có 2 ĐỊNH DẠNG MÃ KHÁC NHAU cho cùng 1 khái niệm nghiệp vụ (OrderCode của
//     // Transaction) — đây chính là "nguồn sinh mã thứ 2" tương tự kiểu lỗi "nhiều nguồn công thức"
//     // đã từng gặp và sửa ở các file khác (MemberPackageService/TransactionService).
//     //
//     // FIX: Bỏ hẳn hàm GenerateOrderCode() riêng của PaymentService. PaymentService đã có sẵn
//     // _transactionService (TransactionService) tiêm qua constructor, nên dùng thẳng
//     // TransactionService.GenerateOrderCode() (hàm static, prefix "HD") làm NGUỒN SINH MÃ DUY NHẤT
//     // cho toàn hệ thống — cả tại quầy lẫn online giờ luôn ra cùng 1 định dạng mã "HD..." không còn
//     // phân biệt kênh mua.
//     //
//     // [QUAN TRỌNG] Vì đổi prefix mã từ "GYM" sang "HD", đoạn regex trong HandleWebhookAsync dùng để
//     // bóc tách OrderCode từ nội dung chuyển khoản ngân hàng (SePay content) PHẢI đổi theo, nếu
//     // không webhook sẽ không nhận diện được bất kỳ giao dịch online nào nữa (không tìm thấy chuỗi
//     // "GYM..." trong content vì mã QR mới sinh ra luôn có dạng "HD..."):
//     //     Cũ: @"\bGYM\d{18,}\b"
//     //     Mới: @"\bHD\d{18,}\b"   (HD + 14 số thời gian + 4 số random = 18 số, khớp định dạng
//     //                              TransactionService.GenerateOrderCode() đang sinh ra)
//     public class PaymentService
//     {
//         private readonly GymManagementContext _db;
//         private readonly IConfiguration _configuration;
//         private readonly TransactionService _transactionService;
//         private readonly MemberPackageService _packageService;

//         public PaymentService(
//             GymManagementContext context,
//             IConfiguration configuration,
//             TransactionService transactionService,
//             MemberPackageService packageService)
//         {
//             _db = context;
//             _configuration = configuration;
//             _transactionService = transactionService;
//             _packageService = packageService;
//         }

//         public async Task<CreatePaymentResponseDto> CreatePaymentAsync(long member_id, CreatePaymentRequestDto dto)
//         {
//             var pac = await _db.MembershipPlans.FirstOrDefaultAsync(x => x.PlanId == dto.PlanId);
//             if (pac == null)
//             {
//                 throw new NotFoundException("Không tìm thấy gói tập!");
//             }
//             var member = await _db.Members.FirstOrDefaultAsync(m => m.MemberId == member_id);
//             if (member == null)
//             {
//                 throw new NotFoundException("Không tìm thấy hội viên");
//             }

//             // BranchId bắt buộc phải hợp lệ — khách phải chọn chi nhánh muốn gắn cho gói tập
//             // này ngay lúc mua online (dto.BranchId do FE gửi lên).
//             await _packageService.EnsureBranchExistsAsync(dto.BranchId);

//             var existingPending = await _db.Transactions
//                 .FirstOrDefaultAsync(t => t.MemberId == member_id
//                                         && t.PaymentStatus == PaymentStatus.Pending.ToString());
//             if (existingPending != null)
//             {
//                 return new CreatePaymentResponseDto
//                 {
//                     OrderCode = existingPending.OrderCode,
//                     Amount = existingPending.Amount,
//                     QrImage = BuildQrImage(existingPending)
//                 };
//             }

//             if (member.Status == "PendingActivation")
//             {
//                 var pendingPackage = await _packageService.GetPendingPackageAsync(member_id);
//                 if (pendingPackage != null)
//                     throw new InvalidOperationException(
//                         "Tài khoản đang chờ kích hoạt chỉ được mua 1 gói tập. " +
//                         "Vui lòng đến quầy kích hoạt gói đã mua trước khi mua thêm gói khác.");
//             }

//             decimal giaGoc = pac.Price;

//             // [SỬA] Trước đây join PromotionPlans để tìm khuyến mãi áp cho gói pac.PlanId.
//             // Giờ Promotion có sẵn cột PlanId nên query thẳng bảng Promotions, không cần join nữa.
//             //
//             // [FIX] Check "p.NgayKetThuc == null" TRƯỚC khi so sánh >= DateTime.Now — thiếu điều
//             // kiện này khiến khuyến mãi KHÔNG giới hạn ngày kết thúc (vĩnh viễn) bị loại khỏi kết
//             // quả oan (NULL >= x luôn unknown/false trong SQL), giống hệt cách các nơi khác trong
//             // hệ thống (PromotionService, TransactionService) đã xử lý.
//             var now = DateTime.Now;
//             var promotion = await _db.Promotions
//                 .FirstOrDefaultAsync(p =>
//                     p.PlanId == pac.PlanId
//                     && p.TrangThai == "HoatDong"
//                     && p.NgayBatDau <= now
//                     && (p.NgayKetThuc == null || p.NgayKetThuc >= now) // [FIX]
//                     && (
//                         p.GioiHanLuot == null
//                         || p.SoLuotDaDung < p.GioiHanLuot
//                     ));

//             // [MỚI] Dùng thẳng công thức DUY NHẤT ở MemberPackageService thay vì tự switch tính
//             // giảm giá thủ công ở đây. Với promotion == null hoặc promotion là loại TangNgay/
//             // TangChuKy (không giảm giá), hàm này tự trả về giaGoc, khỏi cần if riêng.
//             decimal amount = _packageService.CalculateDiscountedAmount(promotion, giaGoc);

//             // [FIX - 19/07/2026] Dùng chung TransactionService.GenerateOrderCode() (prefix "HD")
//             // thay vì hàm GenerateOrderCode() riêng (prefix "GYM") của chính file này — đảm bảo
//             // giao dịch tại quầy và giao dịch online luôn ra CÙNG 1 định dạng mã đơn hàng.
//             var OrderCode = TransactionService.GenerateOrderCode();

//             var transaction = new Transaction
//             {
//                 OrderCode = OrderCode,
//                 MemberId = member.MemberId,
//                 PlanId = pac.PlanId,
//                 PromotionId = promotion?.PromotionId,
//                 BranchId = dto.BranchId, // giữ chi nhánh khách chọn, webhook sẽ đọc lại

//                 PaymentMethod = PaymentMethod.BankTransfer.ToString(),
//                 PaymentStatus = PaymentStatus.Pending.ToString(),

//                 GiaGoc = pac.Price,
//                 Amount = amount,

//                 CreatedAt = DateTime.Now,
//                 UpdatedAt = DateTime.Now
//             };
//             _db.Transactions.Add(transaction);

//             await _db.SaveChangesAsync();

//             var qrImage = BuildQrImage(transaction);

//             return new CreatePaymentResponseDto
//             {
//                 OrderCode = OrderCode,
//                 Amount = amount,
//                 QrImage = qrImage
//             };
//         }

//         public async Task<PaymentStatusResponseDto> GetPaymentStatusAsync(string orderCode)
//         {
//             var transaction = await _db.Transactions
//                 .AsNoTracking()
//                 .FirstOrDefaultAsync(x => x.OrderCode == orderCode);

//             if (transaction == null)
//             {
//                 throw new Exception("Không tìm thấy giao dịch.");
//             }

//             return new PaymentStatusResponseDto
//             {
//                 PaymentStatus = transaction.PaymentStatus
//             };
//         }

//         public async Task<PaymentPageInfoDto> GetPaymentPageInfoAsync(long memberId)
//         {
//             var member = await _db.Members
//                 .AsNoTracking()
//                 .FirstOrDefaultAsync(m => m.MemberId == memberId);

//             if (member == null)
//                 throw new Exception("Không tìm thấy hội viên.");

//             var currentPackage = await _db.MemberPackages
//                 .Include(mp => mp.Plan)
//                 .Include(mp => mp.Branch)
//                 .AsNoTracking()
//                 .Where(mp => mp.MemberId == memberId && mp.PackageStatus == "Active")
//                 .OrderByDescending(mp => mp.ExpiryDate)
//                 .FirstOrDefaultAsync();

//             var availablePlans = await _db.MembershipPlans
//                 .AsNoTracking()
//                 .Where(p => p.Status == "OnSale")
//                 .OrderBy(p => p.Price)
//                 .Select(p => new AvailablePlanDto
//                 {
//                     PlanId = p.PlanId,
//                     PlanName = p.PlanName,
//                     Price = p.Price,
//                     DurationDays = p.DurationDays,
//                     Description = p.Description,
//                     IsPopular = p.IsPopular
//                 })
//                 .ToListAsync();

//             return new PaymentPageInfoDto
//             {
//                 FullName = member.FullName,
//                 Phone = member.Phone,
//                 BranchName = currentPackage?.Branch?.BranchName,
//                 CurrentPackage = currentPackage == null
//                     ? null
//                     : new CurrentPackageDto
//                     {
//                         MemberPackageId = currentPackage.MemberPackageId,
//                         PlanId = currentPackage.PlanId,
//                         PlanName = currentPackage.Plan.PlanName,
//                         StartDate = currentPackage.StartDate,
//                         ExpiryDate = currentPackage.ExpiryDate,
//                         PackageStatus = currentPackage.PackageStatus
//                     },
//                 AvailablePlans = availablePlans
//             };
//         }

//         public async Task<PendingPaymentResponseDto> GetPendingPaymentAsync(long memberId)
//         {
//             var transaction = await _db.Transactions
//                 .Include(t => t.Plan)
//                 .AsNoTracking()
//                 .Where(t => t.MemberId == memberId && t.PaymentStatus == PaymentStatus.Pending.ToString())
//                 .OrderByDescending(t => t.CreatedAt)
//                 .FirstOrDefaultAsync();

//             if (transaction == null)
//                 return new PendingPaymentResponseDto { HasPending = false };

//             return new PendingPaymentResponseDto
//             {
//                 HasPending = true,
//                 OrderCode = transaction.OrderCode,
//                 Amount = transaction.Amount,
//                 QrImage = BuildQrImage(transaction),
//                 PlanId = transaction.PlanId,
//                 PlanName = transaction.Plan?.PlanName,
//                 DurationDays = transaction.Plan?.DurationDays,
//                 PlanPrice = transaction.Plan?.Price
//             };
//         }

//         public async Task CancelPaymentAsync(long memberId, string orderCode)
//         {
//             var transaction = await _db.Transactions
//                 .FirstOrDefaultAsync(t => t.OrderCode == orderCode && t.MemberId == memberId);

//             if (transaction == null)
//                 throw new NotFoundException("Không tìm thấy giao dịch.");

//             if (transaction.PaymentStatus != PaymentStatus.Pending.ToString())
//                 throw new Exception("Giao dịch này không thể hủy.");

//             transaction.PaymentStatus = PaymentStatus.Cancelled.ToString();
//             transaction.UpdatedAt = DateTime.Now;

//             await _db.SaveChangesAsync();
//         }

//         public async Task HandleWebhookAsync(SepayWebhookDto request)
//         {
//             if (!request.TransferType.Equals("in", StringComparison.OrdinalIgnoreCase))
//                 return;

//             bool alreadyProcessed = await _db.Transactions
//                 .AnyAsync(t => t.BankReferenceCode == request.ReferenceCode);
//             if (alreadyProcessed)
//                 return;

//             Transaction? paidTransaction = null;
//             MembershipPlan? paidPlan = null;
//             Promotion? paidPromotion = null;
//             short paidBonusDays = 0;
//             DateOnly paidStartDate = default;
//             DateOnly paidExpiryDate = default;
//             int paidBranchId = 0; // [MỚI] dùng để lấy thông tin chi nhánh in hóa đơn sau khi commit
//             bool shouldGenerateInvoice = false;

//             var strategy = _db.Database.CreateExecutionStrategy();

//             await strategy.ExecuteAsync(async () =>
//             {
//                 using var dbTransaction = await _db.Database
//                     .BeginTransactionAsync(IsolationLevel.Serializable);
//                 try
//                 {
//                     // [FIX - 19/07/2026] Đổi prefix regex từ "GYM" sang "HD" cho khớp với định
//                     // dạng mã đơn hàng mới do TransactionService.GenerateOrderCode() sinh ra
//                     // (HD + 14 số thời gian UTC + 4 số random = 18 số). Nếu không đổi, webhook sẽ
//                     // KHÔNG tìm thấy mã đơn hàng nào trong nội dung chuyển khoản nữa vì QR mới
//                     // không còn sinh ra chuỗi "GYM..." như trước.
//                     var match = System.Text.RegularExpressions.Regex.Match(
//                         request.Content,
//                         @"\bHD\d{18,}\b"
//                     );

//                     var orderCode = match.Value;

//                     var transaction = await _db.Transactions
//                         .FirstOrDefaultAsync(t => t.OrderCode == orderCode);

//                     if (transaction == null)
//                         throw new Exception("Không tìm thấy giao dịch.");

//                     if (transaction.PaymentStatus == "Paid")
//                     {
//                         await dbTransaction.CommitAsync();
//                         return;
//                     }

//                     if (transaction.Amount != request.TransferAmount)
//                         throw new Exception("Số tiền thanh toán không khớp.");

//                     // [MỚI] BranchId giờ là cột bắt buộc (int, not null) trên Transaction — đã được
//                     // gán ngay lúc CreatePaymentAsync nên không cần check null nữa.
//                     int branchId = transaction.BranchId;

//                     var member = await _db.Members
//                         .FirstOrDefaultAsync(m => m.MemberId == transaction.MemberId);
//                     if (member == null)
//                         throw new Exception("Không tìm thấy hội viên.");

//                     transaction.PaymentStatus = "Paid";
//                     transaction.UpdatedAt = DateTime.Now;
//                     transaction.BankReferenceCode = request.ReferenceCode;

//                     var plan = await _db.MembershipPlans
//                         .FirstOrDefaultAsync(x => x.PlanId == transaction.PlanId);

//                     if (plan == null)
//                         throw new Exception("Không tìm thấy gói tập.");

//                     Promotion? promotion = null;

//                     if (transaction.PromotionId.HasValue)
//                     {
//                         promotion = await _db.Promotions
//                             .FirstOrDefaultAsync(x => x.PromotionId == transaction.PromotionId);

//                         if (promotion != null)
//                         {
//                             promotion.SoLuotDaDung++;
//                         }
//                     }

//                     // [MỚI] Dùng thẳng công thức DUY NHẤT ở MemberPackageService.CalculateBonusDays
//                     // thay cho if/else + hằng CYCLE_DAYS thủ công trước đây trong chính file này.
//                     // Với promotion == null hoặc là loại GiamPhanTram/GiamTienMat (không tặng
//                     // ngày), hàm này tự trả về 0, khỏi cần if riêng.
//                     short soNgayTang = _packageService.CalculateBonusDays(promotion, plan);

//                     MemberPackage memberPackage;

//                     if (member.Status == "PendingActivation")
//                     {
//                         memberPackage = await _packageService.CreatePendingPackageAsync(
//                             member.MemberId, transaction.PlanId, transaction.PromotionId,
//                             transaction.GiaGoc, transaction.Amount, soNgayTang,
//                             transaction.TransactionId, branchId);

//                         // [FIX] Trước đây tự viết tay: todayForInvoice.AddDays(plan.DurationDays + soNgayTang).
//                         // Gói này chưa có StartDate/ExpiryDate thật (PackageStatus = PendingActivation),
//                         // nên đây CHỈ là ngày ước tính để in lên hóa đơn ngay lúc thanh toán — nhưng vẫn
//                         // phải đi qua đúng 1 nguồn công thức duy nhất (_packageService.CalculateExpiryDate)
//                         // như mọi luồng khác, để không có nguy cơ lệch nếu công thức đổi sau này.
//                         var todayForInvoice = DateOnly.FromDateTime(DateTime.Today);
//                         paidStartDate = todayForInvoice;
//                         paidExpiryDate = _packageService.CalculateExpiryDate(todayForInvoice, plan, soNgayTang);
//                     }
//                     else
//                     {
//                         memberPackage = await _packageService.CreateActivePackageForCustomerAsync(
//                             member.MemberId, transaction.PlanId, transaction.PromotionId,
//                             transaction.GiaGoc, transaction.Amount, soNgayTang,
//                             transaction.TransactionId, branchId);

//                         paidStartDate = memberPackage.StartDate!.Value;
//                         paidExpiryDate = memberPackage.ExpiryDate!.Value;

//                         if (member.Status == "Expired")
//                         {
//                             member.Status = "Active";
//                             member.UpdatedAt = DateTime.Now;
//                         }
//                     }

//                     await _db.SaveChangesAsync();
//                     await dbTransaction.CommitAsync();

//                     paidTransaction = transaction;
//                     paidPlan = plan;
//                     paidPromotion = promotion;
//                     paidBonusDays = soNgayTang;
//                     paidBranchId = branchId; // [MỚI]
//                     shouldGenerateInvoice = true;
//                 }
//                 catch
//                 {
//                     await dbTransaction.RollbackAsync();
//                     throw;
//                 }
//             });

//             if (shouldGenerateInvoice && paidTransaction != null && paidPlan != null)
//             {
//                 var member = await _db.Members
//                     .AsNoTracking()
//                     .FirstOrDefaultAsync(m => m.MemberId == paidTransaction.MemberId);

//                 // [MỚI] Lấy thông tin chi nhánh khách đã chọn lúc mua online để in lên hóa đơn
//                 var branch = await _db.Branches
//                     .AsNoTracking()
//                     .FirstOrDefaultAsync(b => b.BranchId == paidBranchId);

//                 await _transactionService.GenerateAndAttachInvoiceAsync(paidTransaction, new InvoiceData
//                 {
//                     OrderCode = paidTransaction.OrderCode,
//                     MemberName = member?.FullName,
//                     MemberPhone = member?.Phone,
//                     PlanName = paidPlan.PlanName,
//                     GiaGoc = paidTransaction.GiaGoc,
//                     DiscountAmount = paidTransaction.GiaGoc - paidTransaction.Amount,
//                     Amount = paidTransaction.Amount,
//                     BonusDays = paidBonusDays,
//                     StartDate = paidStartDate,
//                     ExpiryDate = paidExpiryDate,
//                     PaymentMethod = paidTransaction.PaymentMethod,
//                     CreatedAt = paidTransaction.CreatedAt,
//                     EmployeeName = null,
//                     PromotionName = paidPromotion?.TenKhuyenMai,
//                     BranchName = branch?.BranchName,     // [MỚI]
//                     BranchAddress = branch?.Address,      // [MỚI]
//                     BranchPhone = branch?.Phone            // [MỚI]
//                 });
//             }
//         }

//         private string BuildQrImage(Transaction transaction)
//         {
//             var bank = _configuration["SePay:Bank"];
//             var account = _configuration["SePay:AccountNumber"];
//             var holder = _configuration["SePay:AccountHolder"];
//             var template = _configuration["SePay:Template"];
//             var showInfo = _configuration["SePay:ShowInfo"];

//             return $"https://vietqr.app/img" +
//                 $"?bank={bank}" +
//                 $"&acc={account}" +
//                 $"&amount={transaction.Amount}" +
//                 $"&des={Uri.EscapeDataString(transaction.OrderCode)}" +
//                 $"&template={template}" +
//                 $"&showinfo={showInfo}" +
//                 $"&fullacc=true" +
//                 $"&holder={Uri.EscapeDataString(holder!)}";
//         }

//         // [FIX - 19/07/2026] Đã XÓA hàm GenerateOrderCode() riêng của PaymentService (prefix "GYM").
//         // Toàn bộ việc sinh OrderCode giờ đi qua đúng 1 nguồn duy nhất:
//         // TransactionService.GenerateOrderCode() (static, prefix "HD") — xem CreatePaymentAsync
//         // phía trên. Không còn 2 định dạng mã khác nhau giữa kênh tại quầy và kênh online nữa.
//     }
// }