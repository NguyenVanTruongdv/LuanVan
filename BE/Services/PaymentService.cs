using System.Data;
using System.Numerics;
using BE.Data;
using BE.DTOs.Payment;
using BE.Exceptions;
using BE.Models;
using BE.Services;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    // [MỚI] BranchId của Transaction giờ là cột BẮT BUỘC (int, not null) — khách mua online phải
    // chọn chi nhánh ngay từ CreatePaymentRequestDto.BranchId. Giá trị này được lưu thẳng vào
    // Transaction.BranchId lúc tạo QR (CreatePaymentAsync), rồi webhook (HandleWebhookAsync) đọc
    // lại để gán cho MemberPackage — đảm bảo MemberPackage.BranchId luôn là chi nhánh khách đã
    // chọn lúc mua, không phụ thuộc chi nhánh nhân viên đứng kích hoạt sau này.
    //
    // [SỬA] Đã bỏ bảng PromotionPlans (quan hệ many-to-many giữa Promotion và MembershipPlan).
    // Promotion giờ gắn trực tiếp 1-1 với 1 MembershipPlan qua cột Promotion.PlanId, nên mọi chỗ
    // trước đây join qua PromotionPlans giờ chỉ cần lọc thẳng Promotions.Where(p => p.PlanId == ...).
    public class PaymentService
    {
        private readonly GymManagementContext _db;
        private readonly IConfiguration _configuration;
        private readonly TransactionService _transactionService;
        private readonly MemberPackageService _packageService;

        public PaymentService(
            GymManagementContext context,
            IConfiguration configuration,
            TransactionService transactionService,
            MemberPackageService packageService)
        {
            _db = context;
            _configuration = configuration;
            _transactionService = transactionService;
            _packageService = packageService;
        }

        public async Task<CreatePaymentResponseDto> CreatePaymentAsync(long member_id, CreatePaymentRequestDto dto)
        {
            var pac = await _db.MembershipPlans.FirstOrDefaultAsync(x => x.PlanId == dto.PlanId);
            if (pac == null)
            {
                throw new NotFoundException("Không tìm thấy gói tập!");
            }
            var member = await _db.Members.FirstOrDefaultAsync(m => m.MemberId == member_id);
            if (member == null)
            {
                throw new NotFoundException("Không tìm thấy hội viên");
            }

            // BranchId bắt buộc phải hợp lệ — khách phải chọn chi nhánh muốn gắn cho gói tập
            // này ngay lúc mua online (dto.BranchId do FE gửi lên).
            await _packageService.EnsureBranchExistsAsync(dto.BranchId);

            var existingPending = await _db.Transactions
                .FirstOrDefaultAsync(t => t.MemberId == member_id
                                        && t.PaymentStatus == PaymentStatus.Pending.ToString());
            if (existingPending != null)
            {
                return new CreatePaymentResponseDto
                {
                    OrderCode = existingPending.OrderCode,
                    Amount = existingPending.Amount,
                    QrImage = BuildQrImage(existingPending)
                };
            }

            if (member.Status == "PendingActivation")
            {
                var pendingPackage = await _packageService.GetPendingPackageAsync(member_id);
                if (pendingPackage != null)
                    throw new InvalidOperationException(
                        "Tài khoản đang chờ kích hoạt chỉ được mua 1 gói tập. " +
                        "Vui lòng đến quầy kích hoạt gói đã mua trước khi mua thêm gói khác.");
            }

            decimal giaGoc = pac.Price;
            decimal amount = giaGoc;

            // [SỬA] Trước đây join PromotionPlans để tìm khuyến mãi áp cho gói pac.PlanId.
            // Giờ Promotion có sẵn cột PlanId nên query thẳng bảng Promotions, không cần join nữa.
            var promotion = await _db.Promotions
                .FirstOrDefaultAsync(p =>
                    p.PlanId == pac.PlanId
                    && p.TrangThai == "HoatDong"
                    && p.NgayBatDau <= DateTime.Now
                    && p.NgayKetThuc >= DateTime.Now
                    && (
                        p.GioiHanLuot == null
                        || p.SoLuotDaDung < p.GioiHanLuot
                    ));
            if (promotion != null)
            {
                switch (promotion.PromoType)
                {
                    case "GiamPhanTram":

                        decimal discount =
                            giaGoc * promotion.PhanTramGiam!.Value / 100;

                        if (promotion.MucGiamToiDa.HasValue &&
                            discount > promotion.MucGiamToiDa.Value)
                        {
                            discount = promotion.MucGiamToiDa.Value;
                        }

                        amount -= discount;

                        break;

                    case "GiamTienMat":

                        amount -= promotion.SoTienGiam ?? 0;

                        break;
                }

                if (amount < 0)
                    amount = 0;
            }

            var OrderCode = GenerateOrderCode();

            var transaction = new Transaction
            {
                OrderCode = OrderCode,
                MemberId = member.MemberId,
                PlanId = pac.PlanId,
                PromotionId = promotion?.PromotionId,
                BranchId = dto.BranchId, // giữ chi nhánh khách chọn, webhook sẽ đọc lại

                PaymentMethod = PaymentMethod.BankTransfer.ToString(),
                PaymentStatus = PaymentStatus.Pending.ToString(),

                GiaGoc = pac.Price,
                Amount = amount,

                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _db.Transactions.Add(transaction);

            await _db.SaveChangesAsync();

            var qrImage = BuildQrImage(transaction);

            return new CreatePaymentResponseDto
            {
                OrderCode = OrderCode,
                Amount = amount,
                QrImage = qrImage
            };
        }

        public async Task<PaymentStatusResponseDto> GetPaymentStatusAsync(string orderCode)
        {
            var transaction = await _db.Transactions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode);

            if (transaction == null)
            {
                throw new Exception("Không tìm thấy giao dịch.");
            }

            return new PaymentStatusResponseDto
            {
                PaymentStatus = transaction.PaymentStatus
            };
        }

        public async Task<PaymentPageInfoDto> GetPaymentPageInfoAsync(long memberId)
        {
            var member = await _db.Members
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                throw new Exception("Không tìm thấy hội viên.");

            var currentPackage = await _db.MemberPackages
                .Include(mp => mp.Plan)
                .Include(mp => mp.Branch)
                .AsNoTracking()
                .Where(mp => mp.MemberId == memberId && mp.PackageStatus == "Active")
                .OrderByDescending(mp => mp.ExpiryDate)
                .FirstOrDefaultAsync();

            var availablePlans = await _db.MembershipPlans
                .AsNoTracking()
                .Where(p => p.Status == "OnSale")
                .OrderBy(p => p.Price)
                .Select(p => new AvailablePlanDto
                {
                    PlanId = p.PlanId,
                    PlanName = p.PlanName,
                    Price = p.Price,
                    DurationDays = p.DurationDays,
                    Description = p.Description,
                    IsPopular = p.IsPopular
                })
                .ToListAsync();

            return new PaymentPageInfoDto
            {
                FullName = member.FullName,
                Phone = member.Phone,
                BranchName = currentPackage?.Branch?.BranchName,
                CurrentPackage = currentPackage == null
                    ? null
                    : new CurrentPackageDto
                    {
                        MemberPackageId = currentPackage.MemberPackageId,
                        PlanId = currentPackage.PlanId,
                        PlanName = currentPackage.Plan.PlanName,
                        StartDate = currentPackage.StartDate,
                        ExpiryDate = currentPackage.ExpiryDate,
                        PackageStatus = currentPackage.PackageStatus
                    },
                AvailablePlans = availablePlans
            };
        }

        public async Task<PendingPaymentResponseDto> GetPendingPaymentAsync(long memberId)
        {
            var transaction = await _db.Transactions
                .Include(t => t.Plan)
                .AsNoTracking()
                .Where(t => t.MemberId == memberId && t.PaymentStatus == PaymentStatus.Pending.ToString())
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (transaction == null)
                return new PendingPaymentResponseDto { HasPending = false };

            return new PendingPaymentResponseDto
            {
                HasPending = true,
                OrderCode = transaction.OrderCode,
                Amount = transaction.Amount,
                QrImage = BuildQrImage(transaction),
                PlanId = transaction.PlanId,
                PlanName = transaction.Plan?.PlanName,
                DurationDays = transaction.Plan?.DurationDays,
                PlanPrice = transaction.Plan?.Price
            };
        }

        public async Task CancelPaymentAsync(long memberId, string orderCode)
        {
            var transaction = await _db.Transactions
                .FirstOrDefaultAsync(t => t.OrderCode == orderCode && t.MemberId == memberId);

            if (transaction == null)
                throw new NotFoundException("Không tìm thấy giao dịch.");

            if (transaction.PaymentStatus != PaymentStatus.Pending.ToString())
                throw new Exception("Giao dịch này không thể hủy.");

            transaction.PaymentStatus = PaymentStatus.Cancelled.ToString();
            transaction.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
        }

        public async Task HandleWebhookAsync(SepayWebhookDto request)
        {
            if (!request.TransferType.Equals("in", StringComparison.OrdinalIgnoreCase))
                return;

            bool alreadyProcessed = await _db.Transactions
                .AnyAsync(t => t.BankReferenceCode == request.ReferenceCode);
            if (alreadyProcessed)
                return;

            Transaction? paidTransaction = null;
            MembershipPlan? paidPlan = null;
            Promotion? paidPromotion = null;
            short paidBonusDays = 0;
            DateOnly paidStartDate = default;
            DateOnly paidExpiryDate = default;
            int paidBranchId = 0; // [MỚI] dùng để lấy thông tin chi nhánh in hóa đơn sau khi commit
            bool shouldGenerateInvoice = false;

            var strategy = _db.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                using var dbTransaction = await _db.Database
                    .BeginTransactionAsync(IsolationLevel.Serializable);
                try
                {
                    var match = System.Text.RegularExpressions.Regex.Match(
                        request.Content,
                        @"\bGYM\d{18,}\b"
                    );

                    var orderCode = match.Value;

                    var transaction = await _db.Transactions
                        .FirstOrDefaultAsync(t => t.OrderCode == orderCode);

                    if (transaction == null)
                        throw new Exception("Không tìm thấy giao dịch.");

                    if (transaction.PaymentStatus == "Paid")
                    {
                        await dbTransaction.CommitAsync();
                        return;
                    }

                    if (transaction.Amount != request.TransferAmount)
                        throw new Exception("Số tiền thanh toán không khớp.");

                    // [MỚI] BranchId giờ là cột bắt buộc (int, not null) trên Transaction — đã được
                    // gán ngay lúc CreatePaymentAsync nên không cần check null nữa.
                    int branchId = transaction.BranchId;

                    var member = await _db.Members
                        .FirstOrDefaultAsync(m => m.MemberId == transaction.MemberId);
                    if (member == null)
                        throw new Exception("Không tìm thấy hội viên.");

                    transaction.PaymentStatus = "Paid";
                    transaction.UpdatedAt = DateTime.Now;
                    transaction.BankReferenceCode = request.ReferenceCode;

                    var plan = await _db.MembershipPlans
                        .FirstOrDefaultAsync(x => x.PlanId == transaction.PlanId);

                    if (plan == null)
                        throw new Exception("Không tìm thấy gói tập.");

                    short soNgayTang = 0;
                    Promotion? promotion = null;

                    if (transaction.PromotionId.HasValue)
                    {
                        promotion = await _db.Promotions
                            .FirstOrDefaultAsync(x => x.PromotionId == transaction.PromotionId);

                        if (promotion != null)
                        {
                            if (promotion.PromoType == "TangNgay")
                            {
                                soNgayTang = promotion.SoNgayTang ?? 0;
                            }
                            else if (promotion.PromoType == "TangChuKy")
                            {
                                soNgayTang = (short)((promotion.SoChuKyTang ?? 0) * plan.DurationDays);
                            }

                            promotion.SoLuotDaDung++;
                        }
                    }

                    MemberPackage memberPackage;

                    if (member.Status == "PendingActivation")
                    {
                        memberPackage = await _packageService.CreatePendingPackageAsync(
                            member.MemberId, transaction.PlanId, transaction.PromotionId,
                            transaction.GiaGoc, transaction.Amount, soNgayTang,
                            transaction.TransactionId, branchId);

                        var todayForInvoice = DateOnly.FromDateTime(DateTime.Today);
                        paidStartDate = todayForInvoice;
                        paidExpiryDate = todayForInvoice.AddDays(plan.DurationDays + soNgayTang);
                    }
                    else
                    {
                        memberPackage = await _packageService.CreateActivePackageForCustomerAsync(
                            member.MemberId, transaction.PlanId, transaction.PromotionId,
                            transaction.GiaGoc, transaction.Amount, soNgayTang,
                            transaction.TransactionId, branchId);

                        paidStartDate = memberPackage.StartDate!.Value;
                        paidExpiryDate = memberPackage.ExpiryDate!.Value;

                        if (member.Status == "Expired")
                        {
                            member.Status = "Active";
                            member.UpdatedAt = DateTime.Now;
                        }
                    }

                    await _db.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    paidTransaction = transaction;
                    paidPlan = plan;
                    paidPromotion = promotion;
                    paidBonusDays = soNgayTang;
                    paidBranchId = branchId; // [MỚI]
                    shouldGenerateInvoice = true;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            if (shouldGenerateInvoice && paidTransaction != null && paidPlan != null)
            {
                var member = await _db.Members
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MemberId == paidTransaction.MemberId);

                // [MỚI] Lấy thông tin chi nhánh khách đã chọn lúc mua online để in lên hóa đơn
                var branch = await _db.Branches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.BranchId == paidBranchId);

                await _transactionService.GenerateAndAttachInvoiceAsync(paidTransaction, new InvoiceData
                {
                    OrderCode = paidTransaction.OrderCode,
                    MemberName = member?.FullName,
                    MemberPhone = member?.Phone,
                    PlanName = paidPlan.PlanName,
                    GiaGoc = paidTransaction.GiaGoc,
                    DiscountAmount = paidTransaction.GiaGoc - paidTransaction.Amount,
                    Amount = paidTransaction.Amount,
                    BonusDays = paidBonusDays,
                    StartDate = paidStartDate,
                    ExpiryDate = paidExpiryDate,
                    PaymentMethod = paidTransaction.PaymentMethod,
                    CreatedAt = paidTransaction.CreatedAt,
                    EmployeeName = null,
                    PromotionName = paidPromotion?.TenKhuyenMai,
                    BranchName = branch?.BranchName,     // [MỚI]
                    BranchAddress = branch?.Address,      // [MỚI]
                    BranchPhone = branch?.Phone            // [MỚI]
                });
            }
        }

        private string BuildQrImage(Transaction transaction)
        {
            var bank = _configuration["SePay:Bank"];
            var account = _configuration["SePay:AccountNumber"];
            var holder = _configuration["SePay:AccountHolder"];
            var template = _configuration["SePay:Template"];
            var showInfo = _configuration["SePay:ShowInfo"];

            return $"https://vietqr.app/img" +
                $"?bank={bank}" +
                $"&acc={account}" +
                $"&amount={transaction.Amount}" +
                $"&des={Uri.EscapeDataString(transaction.OrderCode)}" +
                $"&template={template}" +
                $"&showinfo={showInfo}" +
                $"&fullacc=true" +
                $"&holder={Uri.EscapeDataString(holder!)}";
        }

        private string GenerateOrderCode()
        {
            return $"GYM{DateTime.Now:yyyyMMddHHmmssfff}{Random.Shared.Next(1000, 9999)}";
        }
    }
}