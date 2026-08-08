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
    // Ghi chú quan trọng còn giữ lại:
    // - Transaction.BranchId là cột bắt buộc: chi nhánh khách chọn lúc mua online (CreatePaymentAsync)
    //   được lưu ngay từ đầu, webhook (HandleWebhookAsync) đọc lại để gán cho MemberPackage.
    // - Công thức tính giá giảm / số ngày tặng / ngày hết hạn dùng chung từ MemberPackageService
    //   (_packageService) — không tự viết lại công thức ở file này.
    // - Mã đơn hàng (OrderCode) dùng chung TransactionService.GenerateOrderCode() (prefix "HD") cho
    //   cả kênh tại quầy lẫn online, nên regex bóc mã trong HandleWebhookAsync phải khớp prefix "HD".
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
            MembershipPlan? goiTap = await _db.MembershipPlans.FirstOrDefaultAsync(x => x.PlanId == dto.PlanId);
            if (goiTap == null)
            {
                throw new NotFoundException("Không tìm thấy gói tập!");
            }

            Member? hoiVien = await _db.Members.FirstOrDefaultAsync(m => m.MemberId == member_id);
            if (hoiVien == null)
            {
                throw new NotFoundException("Không tìm thấy hội viên");
            }

            // Khách phải chọn chi nhánh hợp lệ ngay lúc mua online.
            await _packageService.EnsureBranchExistsAsync(dto.BranchId);

            Transaction? giaoDichDangCho = await _db.Transactions
                .FirstOrDefaultAsync(t => t.MemberId == member_id
                                        && t.PaymentStatus == PaymentStatus.Pending.ToString());
            if (giaoDichDangCho != null)
            {
                return new CreatePaymentResponseDto
                {
                    OrderCode = giaoDichDangCho.OrderCode,
                    Amount = giaoDichDangCho.Amount,
                    QrImage = BuildQrImage(giaoDichDangCho)
                };
            }

            if (hoiVien.Status == "PendingActivation")
            {
                MemberPackage? goiDangCho = await _packageService.GetPendingPackageAsync(member_id);
                if (goiDangCho != null)
                    throw new InvalidOperationException(
                        "Tài khoản đang chờ kích hoạt chỉ được mua 1 gói tập. " +
                        "Vui lòng đến quầy kích hoạt gói đã mua trước khi mua thêm gói khác.");
            }

            decimal giaGoc = goiTap.Price;

            // Promotion gắn 1-1 với 1 MembershipPlan qua cột PlanId nên lọc thẳng, không cần join.
            // NgayKetThuc == null nghĩa là khuyến mãi vĩnh viễn, phải cho qua chứ không loại oan.
            DateTime bayGio = DateTime.Now;
            Promotion? khuyenMai = await _db.Promotions
                .FirstOrDefaultAsync(p =>
                    p.PlanId == goiTap.PlanId
                    && p.TrangThai == "HoatDong"
                    && p.NgayBatDau <= bayGio
                    && (p.NgayKetThuc == null || p.NgayKetThuc >= bayGio)
                    && (p.GioiHanLuot == null || p.SoLuotDaDung < p.GioiHanLuot));

            decimal amount = _packageService.CalculateDiscountedAmount(khuyenMai, giaGoc);

            string orderCode = TransactionService.GenerateOrderCode();

            var giaoDichMoi = new Transaction
            {
                OrderCode = orderCode,
                MemberId = hoiVien.MemberId,
                PlanId = goiTap.PlanId,
                PromotionId = khuyenMai?.PromotionId,
                BranchId = dto.BranchId, // giữ chi nhánh khách chọn, webhook sẽ đọc lại

                PaymentMethod = PaymentMethod.BankTransfer.ToString(),
                PaymentStatus = PaymentStatus.Pending.ToString(),

                GiaGoc = goiTap.Price,
                Amount = amount,

                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _db.Transactions.Add(giaoDichMoi);

            await _db.SaveChangesAsync();

            string qrImage = BuildQrImage(giaoDichMoi);

            return new CreatePaymentResponseDto
            {
                OrderCode = orderCode,
                Amount = amount,
                QrImage = qrImage
            };
        }

        public async Task<PaymentStatusResponseDto> GetPaymentStatusAsync(string orderCode)
        {
            Transaction? giaoDich = await _db.Transactions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode);

            if (giaoDich == null)
            {
                throw new Exception("Không tìm thấy giao dịch.");
            }

            return new PaymentStatusResponseDto
            {
                PaymentStatus = giaoDich.PaymentStatus
            };
        }

        public async Task<PaymentPageInfoDto> GetPaymentPageInfoAsync(long memberId)
        {
            Member? hoiVien = await _db.Members.Include(m => m.Account)
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (hoiVien == null)
                throw new Exception("Không tìm thấy hội viên.");

            MemberPackage? goiHienTai = await _db.MemberPackages
                .Include(mp => mp.Plan)
                .Include(mp => mp.Branch)
                .AsNoTracking()
                .Where(mp => mp.MemberId == memberId && mp.PackageStatus == "Active")
                .OrderByDescending(mp => mp.ExpiryDate)
                .FirstOrDefaultAsync();

            List<AvailablePlanDto> dsGoiDangBan = await _db.MembershipPlans
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
                FullName = hoiVien.FullName,
                Phone = hoiVien.Account.Phone,
                BranchName = goiHienTai?.Branch?.BranchName,
                CurrentPackage = goiHienTai == null
                    ? null
                    : new CurrentPackageDto
                    {
                        MemberPackageId = goiHienTai.MemberPackageId,
                        PlanId = goiHienTai.PlanId,
                        PlanName = goiHienTai.Plan.PlanName,
                        StartDate = goiHienTai.StartDate,
                        ExpiryDate = goiHienTai.ExpiryDate,
                        PackageStatus = goiHienTai.PackageStatus
                    },
                AvailablePlans = dsGoiDangBan
            };
        }

        public async Task<PendingPaymentResponseDto> GetPendingPaymentAsync(long memberId)
        {
            Transaction? giaoDich = await _db.Transactions
                .Include(t => t.Plan)
                .AsNoTracking()
                .Where(t => t.MemberId == memberId && t.PaymentStatus == PaymentStatus.Pending.ToString())
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (giaoDich == null)
                return new PendingPaymentResponseDto { HasPending = false };

            return new PendingPaymentResponseDto
            {
                HasPending = true,
                OrderCode = giaoDich.OrderCode,
                Amount = giaoDich.Amount,
                QrImage = BuildQrImage(giaoDich),
                PlanId = giaoDich.PlanId,
                PlanName = giaoDich.Plan?.PlanName,
                DurationDays = giaoDich.Plan?.DurationDays,
                PlanPrice = giaoDich.Plan?.Price
            };
        }

        public async Task CancelPaymentAsync(long memberId, string orderCode)
        {
            Transaction? giaoDich = await _db.Transactions
                .FirstOrDefaultAsync(t => t.OrderCode == orderCode && t.MemberId == memberId);

            if (giaoDich == null)
                throw new NotFoundException("Không tìm thấy giao dịch.");

            if (giaoDich.PaymentStatus != PaymentStatus.Pending.ToString())
                throw new Exception("Giao dịch này không thể hủy.");

            giaoDich.PaymentStatus = PaymentStatus.Cancelled.ToString();
            giaoDich.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
        }

        public async Task HandleWebhookAsync(SepayWebhookDto request)
        {
            if (!request.TransferType.Equals("in", StringComparison.OrdinalIgnoreCase))
                return;

            bool daXuLyRoi = await _db.Transactions
                .AnyAsync(t => t.BankReferenceCode == request.ReferenceCode);
            if (daXuLyRoi)
                return;

            Transaction? giaoDichDaThanhToan = null;
            MembershipPlan? goiDaThanhToan = null;
            Promotion? khuyenMaiDaDung = null;
            short soNgayTangDaChot = 0;
            DateOnly ngayBatDauDaChot = default;
            DateOnly ngayHetHanDaChot = default;
            int branchIdDaChot = 0; // dùng để lấy thông tin chi nhánh in hóa đơn sau khi commit
            bool canTaoHoaDon = false;

            var strategy = _db.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                using var dbTransaction = await _db.Database
                    .BeginTransactionAsync(IsolationLevel.Serializable);
                try
                {
                    // Mã đơn hàng luôn có dạng "HD" + 14 số thời gian + 4 số random (18 số),
                    // khớp với TransactionService.GenerateOrderCode().
                    var match = System.Text.RegularExpressions.Regex.Match(
                        request.Content,
                        @"\bHD\d{18,}\b"
                    );

                    string orderCode = match.Value;

                    Transaction? giaoDich = await _db.Transactions
                        .FirstOrDefaultAsync(t => t.OrderCode == orderCode);

                    if (giaoDich == null)
                        throw new Exception("Không tìm thấy giao dịch.");

                    if (giaoDich.PaymentStatus == "Paid")
                    {
                        await dbTransaction.CommitAsync();
                        return;
                    }

                    if (giaoDich.Amount != request.TransferAmount)
                        throw new Exception("Số tiền thanh toán không khớp.");

                    int branchId = giaoDich.BranchId;

                    Member? hoiVien = await _db.Members
                        .FirstOrDefaultAsync(m => m.MemberId == giaoDich.MemberId);
                    if (hoiVien == null)
                        throw new Exception("Không tìm thấy hội viên.");

                    giaoDich.PaymentStatus = "Paid";
                    giaoDich.UpdatedAt = DateTime.Now;
                    giaoDich.BankReferenceCode = request.ReferenceCode;

                    MembershipPlan? goiTap = await _db.MembershipPlans
                        .FirstOrDefaultAsync(x => x.PlanId == giaoDich.PlanId);

                    if (goiTap == null)
                        throw new Exception("Không tìm thấy gói tập.");

                    Promotion? khuyenMai = null;

                    if (giaoDich.PromotionId.HasValue)
                    {
                        khuyenMai = await _db.Promotions
                            .FirstOrDefaultAsync(x => x.PromotionId == giaoDich.PromotionId);

                        if (khuyenMai != null)
                        {
                            khuyenMai.SoLuotDaDung++;
                        }
                    }

                    short soNgayTang = _packageService.CalculateBonusDays(khuyenMai, goiTap);

                    MemberPackage goiTapMoi;

                    if (hoiVien.Status == "PendingActivation")
                    {
                        goiTapMoi = await _packageService.CreatePendingPackageAsync(
                            hoiVien.MemberId, giaoDich.PlanId, giaoDich.PromotionId,
                            giaoDich.GiaGoc, giaoDich.Amount, soNgayTang,
                            giaoDich.TransactionId, branchId);

                        // Gói này chưa có StartDate/ExpiryDate thật (còn PendingActivation),
                        // đây chỉ là ngày ước tính để in hóa đơn ngay lúc thanh toán, nhưng vẫn
                        // phải tính qua đúng 1 nguồn công thức (_packageService.CalculateExpiryDate).
                        DateOnly homNay = DateOnly.FromDateTime(DateTime.Today);
                        ngayBatDauDaChot = homNay;
                        ngayHetHanDaChot = _packageService.CalculateExpiryDate(homNay, goiTap, soNgayTang);
                    }
                    else
                    {
                        goiTapMoi = await _packageService.CreateActivePackageOnlineAsync(
                            hoiVien.MemberId, giaoDich.PlanId, giaoDich.PromotionId,
                            giaoDich.GiaGoc, giaoDich.Amount, soNgayTang,
                            giaoDich.TransactionId, branchId);

                        ngayBatDauDaChot = goiTapMoi.StartDate!.Value;
                        ngayHetHanDaChot = goiTapMoi.ExpiryDate!.Value;

                        if (hoiVien.Status == "Expired")
                        {
                            hoiVien.Status = "Active";
                            hoiVien.UpdatedAt = DateTime.Now;
                        }
                    }

                    await _db.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    giaoDichDaThanhToan = giaoDich;
                    goiDaThanhToan = goiTap;
                    khuyenMaiDaDung = khuyenMai;
                    soNgayTangDaChot = soNgayTang;
                    branchIdDaChot = branchId;
                    canTaoHoaDon = true;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            if (canTaoHoaDon && giaoDichDaThanhToan != null && goiDaThanhToan != null)
            {
                Member? hoiVien = await _db.Members.Include(m => m.Account)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MemberId == giaoDichDaThanhToan.MemberId);

                Branch? chiNhanh = await _db.Branches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.BranchId == branchIdDaChot);

                await _transactionService.GenerateAndAttachInvoiceAsync(giaoDichDaThanhToan, new InvoiceData
                {
                    OrderCode = giaoDichDaThanhToan.OrderCode,
                    MemberName = hoiVien?.FullName,
                    MemberPhone = hoiVien?.Account.Phone,
                    PlanName = goiDaThanhToan.PlanName,
                    GiaGoc = giaoDichDaThanhToan.GiaGoc,
                    DiscountAmount = giaoDichDaThanhToan.GiaGoc - giaoDichDaThanhToan.Amount,
                    Amount = giaoDichDaThanhToan.Amount,
                    BonusDays = soNgayTangDaChot,
                    StartDate = ngayBatDauDaChot,
                    ExpiryDate = ngayHetHanDaChot,
                    PaymentMethod = giaoDichDaThanhToan.PaymentMethod,
                    CreatedAt = giaoDichDaThanhToan.CreatedAt,
                    EmployeeName = null,
                    PromotionName = khuyenMaiDaDung?.TenKhuyenMai,
                    BranchName = chiNhanh?.BranchName,
                    BranchAddress = chiNhanh?.Address,
                    BranchPhone = chiNhanh?.Phone
                });
            }
        }

        private string BuildQrImage(Transaction transaction)
        {
            string? bank = _configuration["SePay:Bank"];
            string? account = _configuration["SePay:AccountNumber"];
            string? holder = _configuration["SePay:AccountHolder"];
            string? template = _configuration["SePay:Template"];
            string? showInfo = _configuration["SePay:ShowInfo"];

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

    }
}