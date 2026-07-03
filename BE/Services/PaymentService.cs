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
    public class PaymentService
    {
        private readonly GymManagementContext _db;
        private readonly IConfiguration _configuration;

        public PaymentService(GymManagementContext context, IConfiguration configuration)
        {
            _db = context;
            _configuration = configuration;
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

            // Nếu member đã có transaction Pending -> tái sử dụng, không tạo mới
            // (chặn spam transaction khi user bấm xác nhận nhiều lần / vào ra trang payment)
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

            decimal giaGoc = pac.Price;
            decimal amount = giaGoc;

            var promotion = await _db.PromotionPlans
                                           .Where(x => x.PlanId == pac.PlanId)
                                           .Select(x => x.Promotion)
                                           .FirstOrDefaultAsync(p =>
                                               p.TrangThai == "HoatDong"
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
                OrderCode = OrderCode, //để gửi lên sepay, tí sepay gửi lại xác dịnh ck thành công. 
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
                .Include(m => m.Branch)
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                throw new Exception("Không tìm thấy hội viên.");

            // Gói đang active gần nhất — ưu tiên bản ghi có ExpiryDate lớn nhất
            var currentPackage = await _db.MemberPackages
                .Include(mp => mp.Plan)
                .AsNoTracking()
                .Where(mp => mp.MemberId == memberId && mp.PackageStatus == "Active")
                .OrderByDescending(mp => mp.ExpiryDate)
                .FirstOrDefaultAsync();

            // Danh sách gói đang mở bán để hiển thị cho hội viên chọn
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
                BranchName = member.Branch?.BranchName,
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

        /// <summary>
        /// Kiểm tra xem member hiện tại có transaction nào đang Pending không.
        /// Dùng cho FE: khi vào trang payment, nếu có pending thì đưa thẳng tới màn QR
        /// thay vì tạo transaction mới, tránh sinh ra hàng loạt bản ghi Pending rác.
        /// </summary>
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

        /// <summary>
        /// Hủy transaction đang Pending theo yêu cầu của member (bấm nút "Hủy đơn hàng" ở màn QR).
        /// Chỉ cho hủy khi transaction còn Pending, tránh đụng độ với webhook vừa xử lý Paid.
        /// </summary>
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
            // Chỉ xử lý tiền vào
            if (!request.TransferType.Equals("in", StringComparison.OrdinalIgnoreCase))
                return;

            // 1. IDEMPOTENCY CHECK: nếu ReferenceCode này đã được xử lý rồi thì bỏ qua ngay
            // (chặn trường hợp Sepay retry / gọi webhook trùng)
            bool alreadyProcessed = await _db.Transactions
                .AnyAsync(t => t.BankReferenceCode == request.ReferenceCode);
            if (alreadyProcessed)
                return;

            // 3. Bọc toàn bộ read-check-write trong 1 DB transaction với isolation level cao
            // để chặn race condition khi 2 webhook đến gần như đồng thời
            var strategy = _db.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                using var dbTransaction = await _db.Database
                    .BeginTransactionAsync(IsolationLevel.Serializable);
                try
                {
                    // 2. Match chính xác OrderCode dưới dạng token độc lập, tránh Contains mập mờ
                    // (vd "GYM1" không được match nhầm khi nội dung là "GYM19")
                    var transaction = _db.Transactions.FirstOrDefault(t =>
                        System.Text.RegularExpressions.Regex.IsMatch(
                            request.Content,
                            $@"\b{System.Text.RegularExpressions.Regex.Escape(t.OrderCode)}\b",
                            System.Text.RegularExpressions.RegexOptions.IgnoreCase));

                    if (transaction == null)
                        throw new Exception("Không tìm thấy giao dịch.");

                    // Re-check bên trong transaction (double-check locking pattern)
                    // Đã xử lý rồi thì bỏ qua, không throw để tránh Sepay retry vô ích
                    if (transaction.PaymentStatus == "Paid")
                    {
                        await dbTransaction.CommitAsync();
                        return;
                    }

                    // Kiểm tra số tiền
                    if (transaction.Amount != request.TransferAmount)
                        throw new Exception("Số tiền thanh toán không khớp.");

                    transaction.PaymentStatus = "Paid";
                    transaction.UpdatedAt = DateTime.Now;
                    transaction.BankReferenceCode = request.ReferenceCode;

                    var plan = await _db.MembershipPlans
                        .FirstOrDefaultAsync(x => x.PlanId == transaction.PlanId);

                    if (plan == null)
                        throw new Exception("Không tìm thấy gói tập.");

                    short soNgayTang = 0;

                    if (transaction.PromotionId.HasValue)
                    {
                        var promotion = await _db.Promotions
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

                    // Tính StartDate: nối tiếp sau ExpiryDate lớn nhất trong các gói đang Active
                    // của hội viên này. Nếu chưa có gói Active nào (hoặc gói Active đã hết hạn),
                    // gói mới bắt đầu từ hôm nay.
                    var today = DateOnly.FromDateTime(DateTime.Today);

                    var latestActiveExpiry = await _db.MemberPackages
                        .Where(mp => mp.MemberId == transaction.MemberId
                                  && mp.PackageStatus == "Active")
                        .MaxAsync(mp => (DateOnly?)mp.ExpiryDate);

                    var startDate = (latestActiveExpiry.HasValue && latestActiveExpiry.Value > today)
                        ? latestActiveExpiry.Value
                        : today;

                    var expiryDate = startDate.AddDays(plan.DurationDays + soNgayTang);

                    var memberPackage = new MemberPackage
                    {
                        MemberId = transaction.MemberId,
                        TransactionId = transaction.TransactionId,
                        PlanId = transaction.PlanId,
                        PromotionId = transaction.PromotionId,

                        GiaGoc = transaction.GiaGoc,
                        Amount = transaction.Amount,

                        SoNgayTangThucTe = soNgayTang,

                        StartDate = startDate,
                        ExpiryDate = expiryDate,

                        PackageStatus = "Active",

                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    _db.MemberPackages.Add(memberPackage);

                    await _db.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });
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