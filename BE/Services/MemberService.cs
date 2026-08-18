using BE.Data;
using BE.Dtos;
using BE.Dtos.Member;
using BE.Dtos.Member.BE.Dtos.Member;
using BE.Dtos.Promotion;
using BE.Dtos.Transaction;
using BE.DTOs.Payment;
using BE.Exceptions;
using BE.Helpers;
using BE.Models;
using BE.Services.FaceRecognition;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BE.Services
{
    public class MemberService
    {
        private readonly GymManagementContext _context;
        private readonly FaceIdService _faceIdService;
        private readonly TransactionService _transactionService;
        private readonly MemberPackageService _packageService;
        private readonly AccountService _accountService;

        public MemberService(
            GymManagementContext context,
            FaceIdService faceIdService,
            TransactionService transactionService,
            MemberPackageService packageService,
            AccountService accountService)
        {
            _context = context;
            _faceIdService = faceIdService;
            _transactionService = transactionService;
            _packageService = packageService;
            _accountService = accountService;
        }

        // =========================================================================
        // NHÓM 1: HÀM PRIVATE DÙNG CHUNG (helper nội bộ)
        // =========================================================================

        private async Task<int> GetEmployeeBranchIdAsync(long employeeId)
        {
            Employee? nhanVien = await _context.Employees
                .Include(e => e.Branches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (nhanVien == null)
                throw new Exception("Không tìm thấy nhân viên.");

            int? branchId = nhanVien.Branches.FirstOrDefault()?.BranchId;
            if (branchId == null)
                throw new Exception("Nhân viên chưa được gán chi nhánh.");

            return branchId.Value;
        }

        private async Task<string?> GetEmployeeNameAsync(long employeeId)
        {
            Employee? nhanVien = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            return nhanVien?.FullName;
        }


        // Hàm này dùng khi cần AccountId để đổi mật khẩu, khóa/mở khóa, hoặc đọc SuspendReason.
        private async Task<Account> GetAccountByMemberIdAsync(long memberId)
        {
            Account? taiKhoan = await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);
            if (taiKhoan == null)
                throw new KeyNotFoundException("Không tìm thấy tài khoản của hội viên.");
            return taiKhoan;
        }

        private async Task<Promotion?> ValidateAndGetPromotionAsync(int? promotionId, int planId, DateTime now)
        {
            if (!promotionId.HasValue)
                return null;

            Promotion? khuyenMai = await _context.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
            if (khuyenMai == null)
                throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

            if (khuyenMai.PlanId != planId)
                throw new InvalidOperationException("Khuyến mãi không áp dụng cho gói tập này.");

            if (khuyenMai.TrangThai != "HoatDong")
                throw new InvalidOperationException("Khuyến mãi hiện không hoạt động.");

            if (khuyenMai.NgayBatDau > now || (khuyenMai.NgayKetThuc != null && khuyenMai.NgayKetThuc < now))
                throw new InvalidOperationException("Khuyến mãi chưa bắt đầu hoặc đã hết hạn.");

            if (khuyenMai.GioiHanLuot != null && khuyenMai.SoLuotDaDung >= khuyenMai.GioiHanLuot)
                throw new InvalidOperationException("Khuyến mãi đã hết lượt sử dụng.");

            return khuyenMai;
        }

        private static string GenerateRandomPassword(int length = 8)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            var bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes);

            var sb = new StringBuilder(length);
            foreach (byte b in bytes)
                sb.Append(chars[b % chars.Length]);

            return sb.ToString();
        }

        // Gói chỉ còn 1 loại duy nhất -> lấy thẳng gói Active mới nhất theo ExpiryDate.
        // Nếu tài khoản đang bị khóa (Status == "Suspended") thì trả kèm SuspendReason (sống trên Account).
        private async Task<MemberResponse> BuildMemberResponse(long memberId)
        {
            Member? hoiVien = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Plan)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Branch)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            Account? taiKhoan = await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);

            MemberPackage? goiHienTai = hoiVien.MemberPackages
                .Where(mp => mp.PackageStatus == "Active")
                .OrderByDescending(mp => mp.ExpiryDate)
                .FirstOrDefault();

            return new MemberResponse
            {
                MemberId = hoiVien.MemberId,
                FullName = hoiVien.FullName,
                Phone = hoiVien.Phone,
                Gender = hoiVien.Gender,
                BranchName = goiHienTai?.Branch?.BranchName,
                Status = hoiVien.Status,

                InternalNotes = hoiVien.InternalNotes,
                CreatedAt = hoiVien.CreatedAt,
                UpdatedAt = hoiVien.UpdatedAt,

                FaceIdAws = hoiVien.FaceDatum?.FaceIdAws,
                ProfileImage = hoiVien.FaceDatum?.ProfileImage,

                CurrentMemberPackageId = goiHienTai?.Plan?.PlanName,
                PackageExpiryDate = goiHienTai?.ExpiryDate,
                PackageStatus = goiHienTai?.PackageStatus,
            };
        }

        private async Task<string?> GenerateInvoiceIfPaidAsync(
            Transaction transaction,
            Member member,
            string memberPhone,
            MembershipPlan plan,
            string paymentStatus,
            decimal giaGoc,
            decimal discountAmount,
            decimal amount,
            short bonusDays,
            DateOnly startDate,
            DateOnly expiryDate,
            long? performedBy,
            Promotion? promotion,
            int branchId)
        {
            if (!string.Equals(paymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
                return null;

            Employee? nhanVien = performedBy.HasValue
                ? await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == performedBy.Value)
                : null;

            Branch? chiNhanh = await _context.Branches.FirstOrDefaultAsync(b => b.BranchId == branchId);

            return await _transactionService.GenerateAndAttachInvoiceAsync(transaction, new InvoiceData
            {
                OrderCode = transaction.OrderCode,
                MemberName = member.FullName,
                MemberPhone = memberPhone,
                PlanName = plan.PlanName,
                GiaGoc = giaGoc,
                DiscountAmount = discountAmount,
                Amount = amount,
                BonusDays = bonusDays,
                StartDate = startDate,
                ExpiryDate = expiryDate,
                PaymentMethod = transaction.PaymentMethod,
                CreatedAt = transaction.CreatedAt,
                EmployeeName = nhanVien?.FullName,
                PromotionName = promotion?.TenKhuyenMai,
                BranchName = chiNhanh?.BranchName,
                BranchAddress = chiNhanh?.Address,
                BranchPhone = chiNhanh?.Phone
            });
        }

        // =========================================================================
        // NHÓM 2: KIỂM TRA / TRUY VẤN HỘI VIÊN
        // =========================================================================

        public async Task<bool> CheckPhoneExistsAsync(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Số điện thoại không được để trống.");

            return await _context.Members.AnyAsync(a => a.Phone == phone);
        }

        public async Task<PendingPurchaseStatusDto> CheckPendingPurchaseStatusAsync(long memberId)
        {
            Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            bool dangChoKichHoat = hoiVien.Status == "PendingActivation";
            bool coGoiDangCho = false;

            if (dangChoKichHoat)
            {
                MemberPackage? goiDangCho = await _packageService.GetPendingPackageAsync(memberId);
                coGoiDangCho = goiDangCho != null;
            }

            return new PendingPurchaseStatusDto
            {
                IsPendingActivation = dangChoKichHoat,
                HasPendingPackage = coGoiDangCho,
                CanPurchasePackage = !(dangChoKichHoat && coGoiDangCho)
            };
        }

        // Kiểm tra có gói tập đang chờ kích hoạt hay không (dùng ở trang kích hoạt)
        public async Task<bool> HasPendingPackageAsync(long memberId)
        {
            return await _context.MemberPackages
                .AnyAsync(p => p.MemberId == memberId && p.PackageStatus == "PendingActivation");
        }

        public async Task<bool> HasPackageAsync(long memberId)
        {
            bool tonTai = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!tonTai)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            return await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
        }

        public async Task<CurrentPackageDto> GetCurrentPackageAsync(long memberId)
        {
            Member? hoiVien = await _context.Members.FindAsync(memberId);
            if (hoiVien == null)
                throw new NotFoundException("Không tìm thấy hội viên");

            return await _context.MemberPackages
                .Include(m => m.Plan)
                .Where(m => m.MemberId == memberId && m.PackageStatus == "Active")
                .OrderByDescending(m => m.ExpiryDate)
                .Select(m => new CurrentPackageDto
                {
                    MemberPackageId = m.MemberPackageId,
                    PlanId = m.PlanId,
                    PlanName = m.Plan.PlanName,
                    StartDate = m.StartDate,
                    ExpiryDate = m.ExpiryDate,
                    PackageStatus = m.PackageStatus,
                }).FirstOrDefaultAsync();
        }

        public async Task<MemberResponse> GetByIdAsync(long memberId) => await BuildMemberResponse(memberId);

        public async Task<List<MemberListItem>> GetMembersAsync(string? phone, string? fullName, int? branchId)
            => await QueryMemberList(phone, fullName, branchId, pendingOnly: false);

        public async Task<List<MemberListItem>> GetAllAsync(string? phone, string? fullName)
            => await QueryAll(phone, fullName);

        public async Task<List<MemberListItem>> GetPendingMembersAsync(string? phone, string? fullName, int? branchId)
            => await QueryMemberList(phone, fullName, branchId, pendingOnly: true);

        // Danh sách hội viên theo phone/fullName/branch. Phone nằm thẳng trên Member nên lọc
        // được ngay trong câu SQL, không cần join qua Account hay lọc lại ở bộ nhớ.
        private async Task<List<MemberListItem>> QueryMemberList(string? phone, string? fullName, int? branchId, bool pendingOnly)
        {
            var truyVan = _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Plan)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Branch)
                .AsQueryable();

            if (pendingOnly)
                truyVan = truyVan.Where(m => m.Status == "PendingActivation");

            if (!string.IsNullOrWhiteSpace(fullName))
                truyVan = truyVan.Where(m => m.FullName.Contains(fullName));

            if (!string.IsNullOrWhiteSpace(phone))
                truyVan = truyVan.Where(m => m.Phone != null && m.Phone.Contains(phone));

            if (branchId.HasValue)
                truyVan = truyVan.Where(m => m.MemberPackages.Any(p => p.BranchId == branchId));

            List<Member> danhSachHoiVien = await truyVan
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return danhSachHoiVien.Select(hoiVien =>
            {
                MemberPackage? goiHienTai = hoiVien.MemberPackages
                    .Where(p => p.PackageStatus == "Active")
                    .OrderByDescending(p => p.ExpiryDate)
                    .FirstOrDefault();

                return new MemberListItem
                {
                    MemberId = hoiVien.MemberId,
                    FullName = hoiVien.FullName,
                    Phone = hoiVien.Phone,
                    BranchName = goiHienTai?.Branch?.BranchName,
                    Status = hoiVien.Status,
                    ProfileImage = hoiVien.FaceDatum?.ProfileImage,

                    CurrentPackages = hoiVien.MemberPackages
                        .Where(p => p.PackageStatus == "Active")
                        .OrderByDescending(p => p.ExpiryDate)
                        .Select(p => new CurrentPackageItem
                        {
                            MemberPackageId = p.MemberPackageId,
                            PlanId = p.PlanId,
                            PlanName = p.Plan.PlanName,
                            StartDate = p.StartDate,
                            ExpiryDate = p.ExpiryDate,
                            PackageStatus = p.PackageStatus
                        })
                        .ToList()
                };
            }).ToList();
        }

        private async Task<List<MemberListItem>> QueryAll(string? phone, string? fullName)
        {
            var truyVan = _context.Members
                .Include(m => m.FaceDatum)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(fullName))
                truyVan = truyVan.Where(m => m.FullName.Contains(fullName));

            if (!string.IsNullOrWhiteSpace(phone))
                truyVan = truyVan.Where(m => m.Phone != null && m.Phone.Contains(phone));

            List<Member> danhSachHoiVien = await truyVan
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return danhSachHoiVien.Select(hoiVien => new MemberListItem
            {
                MemberId = hoiVien.MemberId,
                FullName = hoiVien.FullName,
                Phone = hoiVien.Phone,
                Status = hoiVien.Status,
                ProfileImage = hoiVien.FaceDatum?.ProfileImage,
                BranchName = null,
                CurrentPackages = new List<CurrentPackageItem>()
            }).ToList();
        }

        // Tìm hội viên theo tên HOẶC số điện thoại — cả hai cột đều nằm trên Member nên gộp
        // được thành một query duy nhất (không cần query Account rồi map ngược lại).
        public async Task<List<MemberSearchItem>> SearchMembersForRenewAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<MemberSearchItem>();

            string tuKhoa = query.Trim();

            List<Member> danhSachHoiVien = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Where(m => m.FullName.Contains(tuKhoa)
                         || (m.Phone != null && m.Phone.Contains(tuKhoa)))
                .OrderByDescending(m => m.CreatedAt)
                .Take(20)
                .ToListAsync();

            return danhSachHoiVien.Select(hoiVien =>
            {
                MemberPackage? goi = hoiVien.MemberPackages.OrderByDescending(p => p.ExpiryDate).FirstOrDefault();
                return new MemberSearchItem
                {
                    MemberId = hoiVien.MemberId,
                    FullName = hoiVien.FullName,
                    Phone = hoiVien.Phone,
                    Status = hoiVien.Status,
                    ProfileImage = hoiVien.FaceDatum?.ProfileImage,
                    CurrentPlanName = goi?.Plan?.PlanName,
                    CurrentStartDate = goi?.StartDate,
                    CurrentExpiryDate = goi?.ExpiryDate,
                    CurrentPackageStatus = goi?.PackageStatus
                };
            }).ToList();
        }

        // =========================================================================
        // NHÓM 3: [THU NGÂN] TẠO HỘI VIÊN MỚI
        // =========================================================================

        public async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request, long performedBy)
        {
            bool sdtDaTonTai = await _context.Members.AnyAsync(m => m.Phone == request.Phone);
            if (sdtDaTonTai)
                throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

            // FIX: Username của Account đang dùng chung số điện thoại làm username, nên phải
            // đảm bảo username này (trên bảng Account) cũng chưa bị dùng — Account dùng chung
            // cho cả Member và Employee nên check riêng ở đây, không thể suy ra từ check Phone ở trên.
            bool usernameDaTonTai = await _context.Accounts.AnyAsync(a => a.Username == request.Phone);
            if (usernameDaTonTai)
                throw new InvalidOperationException($"Tên đăng nhập '{request.Phone}' đã được sử dụng.");

            DateTime now = DateTime.Now;
            string matKhauTaoMoi = GenerateRandomPassword();

            int branchId = await GetEmployeeBranchIdAsync(performedBy);

            MembershipPlan? goiTap = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (goiTap == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");

            // FIX: bổ sung check gói tập còn bán, cho đồng nhất với ActivateWithPackageAsync/RenewMembershipAsync.
            if (goiTap.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            Promotion? khuyenMai = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);
            short soNgayTangThucTe = _packageService.CalculateBonusDays(khuyenMai, goiTap);

            DateOnly startDate = DateOnly.FromDateTime(now);
            DateOnly expiryDate = _packageService.CalculateExpiryDate(startDate, goiTap, soNgayTangThucTe);

            // Kiểm tra trùng khuôn mặt TRƯỚC khi mở transaction DB để tránh rollback tốn công.
            // Hội viên mới nên không cần loại trừ ai. scope Member: chỉ so trùng với Member khác.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse phanHoi = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var hoiVien = new Member
                    {
                        FullName = request.FullName,
                        Phone = request.Phone,
                        Gender = request.Gender,
                        Status = "Active",
                        InternalNotes = request.InternalNotes,
                        CreatedBy = performedBy,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.Members.Add(hoiVien);
                    await _context.SaveChangesAsync();

                    var taiKhoan = new Account
                    {
                        MemberId = hoiVien.MemberId,
                        // FIX (bug chính gây crash "Column 'username' cannot be null"):
                        // trước đây thiếu gán Username. Dùng số điện thoại làm username cho hội viên.
                        Username = request.Phone,
                        RoleId = 4,
                        PasswordHash = PasswordHelper.HashPassword(matKhauTaoMoi),
                        Status = "Active",
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.Accounts.Add(taiKhoan);
                    await _context.SaveChangesAsync();

                    // Nếu upload ảnh lỗi -> throw -> rollback member + account vừa Add.
                    await _faceIdService.RegisterFirstFaceAsync(
                        hoiVien.MemberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi tạo hội viên", performedBy);

                    string paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                        ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                        : request.PaymentStatus;

                    Transaction giaoDich = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
                    {
                        MemberId = hoiVien.MemberId,
                        PlanId = request.PlanId,
                        PromotionId = request.PromotionId,
                        BranchId = branchId,
                        PaymentMethod = request.PaymentMethod,
                        PaymentStatus = paymentStatus,
                        GiaGoc = request.GiaGoc,
                        Amount = request.Amount,
                        BankReferenceCode = null,
                        PerformedBy = performedBy
                    });

                    MemberPackage goiTapMoi = await _packageService.CreateActivePackageAsync(
                        hoiVien.MemberId, request.PlanId, request.PromotionId,
                        request.GiaGoc, request.Amount, soNgayTangThucTe,
                        startDate, expiryDate, giaoDich.TransactionId, branchId);

                    if (khuyenMai != null)
                    {
                        _transactionService.RecordPromotionUsage(
                            khuyenMai, hoiVien.MemberId, goiTapMoi.MemberPackageId,
                            request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
                    }

                    await GenerateInvoiceIfPaidAsync(
                        giaoDich, hoiVien, request.Phone, goiTap, paymentStatus,
                        giaGoc: request.GiaGoc,
                        discountAmount: request.GiaGoc - request.Amount,
                        amount: request.Amount,
                        bonusDays: soNgayTangThucTe,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: khuyenMai,
                        branchId: branchId);

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = hoiVien.MemberId,
                        FieldName = "Tạo hội viên",
                        OldValue = null,
                        NewValue = $"Tạo hội viên '{hoiVien.FullName}' - SĐT {request.Phone} - Hóa đơn {giaoDich.OrderCode}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    phanHoi = await BuildMemberResponse(hoiVien.MemberId);
                    phanHoi.GeneratedPassword = matKhauTaoMoi;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return phanHoi;
        }

        // =========================================================================
        // NHÓM 4: CẬP NHẬT THÔNG TIN HỘI VIÊN
        // =========================================================================

     public async Task<MemberResponse> UpdateMemberInfoAsync(long memberId, UpdateMemberInfoRequest request, long? performedBy)
{
    Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
    if (hoiVien == null)
        throw new KeyNotFoundException("Không tìm thấy hội viên.");

    DateTime now = DateTime.Now;
    Guid sessionId = Guid.NewGuid();
    var danhSachLog = new List<MemberUpdateLog>();

    void TrackChange(string field, string? oldValue, string? newValue)
    {
        if (oldValue == newValue) return;
        danhSachLog.Add(new MemberUpdateLog
        {
            UpdateSessionId = sessionId,
            MemberId = memberId,
            FieldName = field,
            OldValue = oldValue,
            NewValue = newValue ?? string.Empty,
            UpdatedByEmployeeId = performedBy,
            UpdatedAt = now
        });
    }

    if (request.FullName != null && request.FullName != hoiVien.FullName)
    {
        TrackChange("Họ và tên", hoiVien.FullName, request.FullName);
        hoiVien.FullName = request.FullName;
    }

    if (request.Phone != null && request.Phone != hoiVien.Phone)
    {
        bool trungSdt = await _context.Members
            .AnyAsync(m => m.MemberId != memberId && m.Phone == request.Phone);
        if (trungSdt)
            throw new InvalidOperationException("Số điện thoại đã được sử dụng bởi hội viên khác.");

        TrackChange("Số điện thoại", hoiVien.Phone, request.Phone);
        hoiVien.Phone = request.Phone;
    }

    if (request.Gender != null && request.Gender != hoiVien.Gender)
    {
        TrackChange("Giới tính", hoiVien.Gender, request.Gender);
        hoiVien.Gender = request.Gender;
    }

    if (request.InternalNotes != null && request.InternalNotes != hoiVien.InternalNotes)
    {
        TrackChange("Ghi chú nội bộ", hoiVien.InternalNotes, request.InternalNotes);
        hoiVien.InternalNotes = request.InternalNotes;
    }

    if (danhSachLog.Count == 0)
        return await BuildMemberResponse(memberId);

    hoiVien.UpdatedAt = now;
    _context.MemberUpdateLogs.AddRange(danhSachLog);
    await _context.SaveChangesAsync();

    return await BuildMemberResponse(memberId);
}
        // Admin/nhân viên đặt lại mật khẩu cho hội viên — không cần mật khẩu cũ.
        // Ủy quyền qua AccountService.ResetPasswordAsync (tự hash + thu hồi hết refresh token).
        // Ghi log không lưu giá trị mật khẩu thật, chỉ ghi dạng ẩn để biết có thao tác đổi.
        public async Task ChangeMemberPasswordAsync(long memberId, string newPassword, long performedBy)
        {
            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
                throw new InvalidOperationException("Mật khẩu mới phải có ít nhất 6 ký tự.");

            Member hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy hội viên.");

            Account taiKhoan = await _accountService.GetByMemberIdAsync(memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy tài khoản của hội viên.");

            DateTime now = DateTime.Now;

            await _accountService.ResetPasswordAsync(taiKhoan.AccountId, newPassword);

            hoiVien.UpdatedAt = now;

            _context.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = memberId,
                FieldName = "Đặt lại mật khẩu",
                OldValue = "(mật khẩu cũ - đã ẩn)",
                NewValue = "(mật khẩu mới - đã ẩn)",
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = now
            });

            await _context.SaveChangesAsync();
        }

        public async Task<MemberResponse> UpdateFaceIdAsync(long memberId, UpdateFaceIdRequest request, long performedBy)
        {
            bool tonTai = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!tonTai)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            // Loại trừ chính memberId đang cập nhật vì Rekognition khớp lại chính họ là bình thường.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member, excludeMemberId: memberId);

            await _faceIdService.UpdateFaceAsync(memberId, employeeId: null, request.ProfileImage, request.Reason, performedBy);

            Member hoiVien = await _context.Members.FirstAsync(m => m.MemberId == memberId);
            hoiVien.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // Hội viên tự cập nhật thông tin của chính mình. Phone nằm trên Member; đổi mật khẩu thao tác trên Account.
        public async Task<MemberResponse> UpdateMyProfileAsync(long memberId, UpdateMyProfileRequest request)
        {
            Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (hoiVien.Status == "Suspended")
                throw new InvalidOperationException("Tài khoản đang bị khóa, không thể tự cập nhật thông tin.");

            DateTime now = DateTime.Now;
            Guid sessionId = Guid.NewGuid();
            var danhSachLog = new List<MemberUpdateLog>();
            bool taiKhoanCoThayDoi = false;
            Account? taiKhoan = null;

            void TrackChange(string field, string? oldValue, string? newValue)
            {
                danhSachLog.Add(new MemberUpdateLog
                {
                    UpdateSessionId = sessionId,
                    MemberId = memberId,
                    FieldName = field,
                    OldValue = oldValue,
                    NewValue = newValue ?? string.Empty,
                    UpdatedByEmployeeId = null,
                    UpdatedAt = now
                });
            }

            if (!string.IsNullOrWhiteSpace(request.FullName) && request.FullName != hoiVien.FullName)
            {
                TrackChange("Họ và tên", hoiVien.FullName, request.FullName);
                hoiVien.FullName = request.FullName;
            }

            if (!string.IsNullOrWhiteSpace(request.Phone) && request.Phone != hoiVien.Phone)
            {
                bool sdtDaTonTai = await _context.Members.AnyAsync(m => m.Phone == request.Phone && m.MemberId != memberId);
                if (sdtDaTonTai)
                    throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

                TrackChange("Số điện thoại", hoiVien.Phone, request.Phone);
                hoiVien.Phone = request.Phone;
            }

            if (!string.IsNullOrWhiteSpace(request.Gender) && request.Gender != hoiVien.Gender)
            {
                TrackChange("Giới tính", hoiVien.Gender, request.Gender);
                hoiVien.Gender = request.Gender;
            }

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                    throw new InvalidOperationException("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");

                taiKhoan = await GetAccountByMemberIdAsync(memberId);

                // Dùng lại AccountService.ChangePasswordAsync (có verify mật khẩu cũ) cho đồng nhất.
                await _accountService.ChangePasswordAsync(taiKhoan.AccountId, request.CurrentPassword, request.NewPassword);
                taiKhoanCoThayDoi = true;

                danhSachLog.Add(new MemberUpdateLog
                {
                    UpdateSessionId = sessionId,
                    MemberId = memberId,
                    FieldName = "Mật khẩu",
                    OldValue = "(đã ẩn)",
                    NewValue = "Hội viên tự đổi mật khẩu",
                    UpdatedByEmployeeId = null,
                    UpdatedAt = now
                });
            }

            if (danhSachLog.Count == 0)
                return await BuildMemberResponse(memberId);

            if (taiKhoanCoThayDoi && taiKhoan != null)
                taiKhoan.UpdatedAt = now;

            hoiVien.UpdatedAt = now;
            _context.MemberUpdateLogs.AddRange(danhSachLog);
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // =========================================================================
        // NHÓM 5: [THU NGÂN] KÍCH HOẠT HỘI VIÊN
        // =========================================================================

        public async Task<MemberResponse> ActivateWithPackageAsync(long memberId, ActivateMemberWithPackageRequest request, long performedBy)
        {
            Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            bool coGoiRoi = await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
            if (coGoiRoi)
                throw new InvalidOperationException("Hội viên đã có gói tập (kể cả gói đang chờ kích hoạt). Vui lòng dùng API kích hoạt FaceID.");

            bool coFaceIdRoi = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
            if (coFaceIdRoi)
                throw new InvalidOperationException("Hội viên đã có FaceID.");

            MembershipPlan? goiTap = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (goiTap == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");
            if (goiTap.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            int branchId = await GetEmployeeBranchIdAsync(performedBy);
            string? tenNhanVien = await GetEmployeeNameAsync(performedBy);

            // Chỉ dùng để xác nhận hội viên đã có tài khoản (ném lỗi nếu chưa) — không cần dùng tiếp.
            await GetAccountByMemberIdAsync(memberId);

            DateTime now = DateTime.Now;
            Promotion? khuyenMai = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);
            short soNgayTangThucTe = _packageService.CalculateBonusDays(khuyenMai, goiTap);

            DateOnly startDate = DateOnly.FromDateTime(now);
            DateOnly expiryDate = _packageService.CalculateExpiryDate(startDate, goiTap, soNgayTangThucTe);

            string paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                : request.PaymentStatus;

            // Hội viên chưa có FaceID (đã check ở trên) -> không cần loại trừ ai khi kiểm tra trùng.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse phanHoi = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    Transaction giaoDich = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
                    {
                        MemberId = memberId,
                        PlanId = request.PlanId,
                        PromotionId = request.PromotionId,
                        BranchId = branchId,
                        PaymentMethod = request.PaymentMethod,
                        PaymentStatus = paymentStatus,
                        GiaGoc = request.GiaGoc,
                        Amount = request.Amount,
                        BankReferenceCode = null,
                        PerformedBy = performedBy
                    });

                    MemberPackage goiTapMoi = await _packageService.CreateActivePackageAsync(
                        memberId, request.PlanId, request.PromotionId,
                        request.GiaGoc, request.Amount, soNgayTangThucTe,
                        startDate, expiryDate, giaoDich.TransactionId, branchId);

                    if (khuyenMai != null)
                    {
                        _transactionService.RecordPromotionUsage(
                            khuyenMai, memberId, goiTapMoi.MemberPackageId,
                            request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
                    }

                    await GenerateInvoiceIfPaidAsync(
                        giaoDich, hoiVien, hoiVien.Phone, goiTap, paymentStatus,
                        giaGoc: request.GiaGoc,
                        discountAmount: request.GiaGoc - request.Amount,
                        amount: request.Amount,
                        bonusDays: soNgayTangThucTe,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: khuyenMai,
                        branchId: branchId);

                    await _faceIdService.RegisterFirstFaceAsync(
                        memberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

                    string trangThaiCu = hoiVien.Status;
                    hoiVien.Status = "Active";
                    hoiVien.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "Kích hoạt hội viên",
                        OldValue = trangThaiCu,
                        NewValue = $"Kích hoạt hội viên - Tạo gói tập + FaceID - Hóa đơn {giaoDich.OrderCode} - NV kích hoạt: {tenNhanVien ?? "N/A"}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    phanHoi = await BuildMemberResponse(memberId);
                    phanHoi.ActivatedByEmployeeName = tenNhanVien;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return phanHoi;
        }

        public async Task<MemberResponse> ActivateFaceIdOnlyAsync(long memberId, ActivateMemberFaceIdOnlyRequest request, long performedBy)
        {
            Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            DateTime now = DateTime.Now;
            DateOnly homNay = DateOnly.FromDateTime(now);
            string? tenNhanVien = await GetEmployeeNameAsync(performedBy);

            // Hội viên này chưa có FaceID (được assert lại trong strategy bên dưới) nên không
            // cần loại trừ ai khi kiểm tra trùng.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse phanHoi = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    MemberPackage? goiDangCho = await _packageService.GetPendingPackageAsync(memberId);
                    if (goiDangCho != null)
                    {
                        await _packageService.ActivatePendingPackageAsync(goiDangCho, homNay);
                    }
                    else
                    {
                        MemberPackage? goiGanNhat = await _packageService.GetLatestPackageAsync(memberId);
                        if (goiGanNhat == null)
                            throw new InvalidOperationException("Hội viên chưa có gói tập. Vui lòng dùng API tạo gói tập + FaceID.");

                        if (!goiGanNhat.ExpiryDate.HasValue || goiGanNhat.ExpiryDate.Value < homNay)
                            throw new InvalidOperationException(
                                $"Gói tập '{goiGanNhat.Plan?.PlanName}' đã hết hạn từ ngày {goiGanNhat.ExpiryDate:dd/MM/yyyy} " +
                                "(hội viên chưa từng đến tập kể từ lúc mua gói). Vui lòng gia hạn/mua gói mới cho hội viên " +
                                "trước khi đăng ký FaceID (dùng API gia hạn hoặc API tạo gói tập + FaceID).");
                    }

                    bool coFaceIdRoi = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
                    if (coFaceIdRoi)
                        throw new InvalidOperationException("Hội viên đã có FaceID.");

                    await _faceIdService.RegisterFirstFaceAsync(
                        memberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

                    string trangThaiCu = hoiVien.Status;
                    hoiVien.Status = "Active";
                    hoiVien.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "Kích hoạt hội viên",
                        OldValue = trangThaiCu,
                        NewValue = (goiDangCho != null
                            ? "Kích hoạt hội viên - Kích hoạt gói tập đã mua online + FaceID"
                            : "Kích hoạt hội viên - Tạo FaceID (đã có gói tập)")
                            + $" - NV kích hoạt: {tenNhanVien ?? "N/A"}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    phanHoi = await BuildMemberResponse(memberId);
                    phanHoi.ActivatedByEmployeeName = tenNhanVien;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return phanHoi;
        }

        // =========================================================================
        // NHÓM 6: KHÓA / MỞ KHÓA HỘI VIÊN (ủy quyền toàn bộ qua AccountService)
        //
        // Member.Status chỉ là bản sao hiển thị đồng bộ theo Account.Status thật sự.
        // AccountService lo validate/lưu SuspendReason/thu hồi refresh token, không tự ghi log.
        // MemberService ghi log MemberUpdateLog (LOCK_MEMBER/UNLOCK_MEMBER) để có đủ lịch sử.
        //
        // FIX: bọc transaction để Account.Status và Member.Status luôn đổi cùng lúc — nếu
        // SaveChangesAsync (ghi log + đổi Member.Status) lỗi thì đổi Account.Status cũng bị rollback,
        // tránh tình trạng 2 bảng lệch trạng thái với nhau.
        // =========================================================================

        public async Task LockMemberAsync(long memberId, string reason, long performedBy)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));

            Member hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy hội viên.");

            Account taiKhoan = await _accountService.GetByMemberIdAsync(memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy tài khoản của hội viên.");

            string trangThaiCu = hoiVien.Status;
            DateTime now = DateTime.Now;

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // AccountService: validate reason, đổi Account.Status + SuspendReason, thu hồi refresh token.
                    await _accountService.LockAccountAsync(taiKhoan.AccountId,  performedBy);

                    hoiVien.Status = "Suspended";
                    hoiVien.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "Khóa hội viên",
                        OldValue = trangThaiCu,
                        NewValue = $"Khóa tài khoản - Lý do: {reason}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task UnlockMemberAsync(long memberId, long performedBy, string? note = null)
        {
            Member hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy hội viên.");

            Account taiKhoan = await _accountService.GetByMemberIdAsync(memberId)
                ?? throw new KeyNotFoundException("Không tìm thấy tài khoản của hội viên.");

            string trangThaiCu = hoiVien.Status;
            DateTime now = DateTime.Now;

            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // AccountService: đổi Account.Status về Active, xóa SuspendReason.
                    await _accountService.UnlockAccountAsync(taiKhoan.AccountId, performedBy);

                    hoiVien.Status = "Active";
                    hoiVien.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "Mở khóa hội viên",
                        OldValue = trangThaiCu,
                        NewValue = string.IsNullOrWhiteSpace(note)
                            ? "Mở khóa tài khoản"
                            : $"Mở khóa tài khoản - Ghi chú: {note}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });
        }

        // =========================================================================
        // NHÓM 7: LỊCH SỬ CẬP NHẬT
        // =========================================================================

        public async Task<List<MemberUpdateSessionResponse>> GetUpdateHistoryAsync(long memberId)
        {
            List<MemberUpdateLog> danhSachLog = await _context.MemberUpdateLogs
                .Where(l => l.MemberId == memberId)
                .Include(l => l.UpdatedByEmployee)
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            var infoSessions = danhSachLog
                .GroupBy(l => l.UpdateSessionId)
                .Select(g => new MemberUpdateSessionResponse
                {
                    SessionId = $"info-{g.Key}",
                    SessionType = "INFO",
                    EmployeeName = g.First().UpdatedByEmployee?.FullName,
                    UpdatedAt = g.Max(x => x.UpdatedAt),
                    Changes = g.Select(x => new MemberUpdateLogItem
                    {
                        FieldName = x.FieldName,
                        OldValue = x.OldValue,
                        NewValue = x.NewValue
                    }).ToList()
                });

            var faceSessions = await _faceIdService.GetFaceHistoryAsync(memberId, employeeId: null);
            var packageAdjustSessions = await _transactionService.GetPackageAdjustmentHistoryAsync(memberId);

            return infoSessions
                .Concat(faceSessions)
                .Concat(packageAdjustSessions)
                .OrderByDescending(s => s.UpdatedAt)
                .ToList();
        }

        // =========================================================================
        // NHÓM 8: [THU NGÂN] GIA HẠN GÓI TẬP
        // =========================================================================

        public async Task<RenewMembershipResponse> RenewMembershipAsync(long memberId, RenewMembershipRequest request, long performedBy)
        {
            Member? hoiVien = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (hoiVien == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (hoiVien.Status == "Suspended")
                throw new InvalidOperationException("Hội viên đang bị khóa tài khoản, không thể gia hạn gói tập.");

            MembershipPlan? goiTap = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (goiTap == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");
            if (goiTap.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            int branchId = await GetEmployeeBranchIdAsync(performedBy);

            DateOnly homNay = DateOnly.FromDateTime(DateTime.Now);

            MemberPackage? goiGanNhat = await _packageService.GetLatestPackageAsync(memberId);
            (DateOnly startDate, bool isExtending) = _packageService.DetermineStartDate(goiGanNhat, homNay);

            var hieuUngKhuyenMai = await _transactionService.CalculatePromotionEffectAsync(
                request.PromotionId, goiTap.PlanId, goiTap.Price, goiTap.DurationDays);

            decimal giaGoc = hieuUngKhuyenMai.GiaGoc;
            decimal discountAmt = hieuUngKhuyenMai.DiscountAmount;
            decimal amount = hieuUngKhuyenMai.Amount;
            short bonusDays = hieuUngKhuyenMai.BonusDays;
            Promotion? khuyenMaiApDung = hieuUngKhuyenMai.Promo;
            DateOnly expiryDate = _packageService.CalculateExpiryDate(startDate, goiTap, bonusDays);

            var strategy = _context.Database.CreateExecutionStrategy();
            RenewMembershipResponse ketQua = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    Transaction giaoDich = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
                    {
                        MemberId = memberId,
                        PlanId = goiTap.PlanId,
                        PromotionId = khuyenMaiApDung?.PromotionId,
                        BranchId = branchId,
                        PaymentMethod = request.PaymentMethod,
                        PaymentStatus = "Paid",
                        GiaGoc = giaGoc,
                        Amount = amount,
                        BankReferenceCode = request.BankReferenceCode,
                        PerformedBy = performedBy
                    });

                    MemberPackage goiTapMoi = await _packageService.CreateActivePackageAsync(
                        memberId, goiTap.PlanId, khuyenMaiApDung?.PromotionId,
                        giaGoc, amount, bonusDays, startDate, expiryDate, giaoDich.TransactionId, branchId);

                    if (khuyenMaiApDung != null)
                        _transactionService.RecordPromotionUsage(khuyenMaiApDung, memberId, goiTapMoi.MemberPackageId, goiTap.PlanId, bonusDays, discountAmt);

                    DateTime now = DateTime.Now;

                    // Gói mới đã Active -> nếu hội viên đang ở trạng thái "Expired" (do gói cũ hết hạn
                    // và chưa gia hạn kịp) thì đưa về "Active" trở lại.
                    if (hoiVien.Status == "Expired")
                        hoiVien.Status = "Active";
                    hoiVien.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "Gia hạn gói tập",
                        OldValue = goiGanNhat != null ? $"{goiGanNhat.Plan?.PlanName} - hết hạn {goiGanNhat.ExpiryDate}" : null,
                        NewValue = $"Gia hạn '{goiTap.PlanName}' - Hóa đơn {giaoDich.OrderCode} - {(isExtending ? "Nối tiếp" : "Bắt đầu mới")}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    // FIX: gọi GenerateInvoiceIfPaidAsync TRƯỚC SaveChangesAsync cuối cùng.
                    // Hàm này chỉ gán InvoiceUrl lên entity `giaoDich` (không tự SaveChanges),
                    // nên phải gọi trước để thay đổi được lưu xuống DB cùng lượt save này.
                    // Code cũ gọi SAU SaveChangesAsync -> InvoiceUrl trả về cho client nhưng KHÔNG lưu vào DB.
                    string? invoiceUrl = await GenerateInvoiceIfPaidAsync(
                        giaoDich, hoiVien, hoiVien.Phone, goiTap, giaoDich.PaymentStatus,
                        giaGoc: giaGoc,
                        discountAmount: discountAmt,
                        amount: amount,
                        bonusDays: bonusDays,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: khuyenMaiApDung,
                        branchId: branchId);

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    ketQua = new RenewMembershipResponse
                    {
                        MemberId = memberId,
                        MemberName = hoiVien.FullName,
                        MemberPackageId = goiTapMoi.MemberPackageId,
                        PlanId = goiTap.PlanId,
                        PlanName = goiTap.PlanName,
                        GiaGoc = giaGoc,
                        DiscountAmount = discountAmt,
                        Amount = amount,
                        BonusDays = bonusDays,
                        StartDate = startDate,
                        ExpiryDate = expiryDate,
                        IsExtending = isExtending,
                        PaymentMethod = giaoDich.PaymentMethod,
                        PaymentStatus = giaoDich.PaymentStatus,
                        TransactionId = giaoDich.TransactionId,
                        OrderCode = giaoDich.OrderCode,
                        BankReferenceCode = giaoDich.BankReferenceCode,
                        InvoiceUrl = invoiceUrl
                    };
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return ketQua;
        }

        // =========================================================================
        // NHÓM 9: [HỘI VIÊN] HỒ SƠ TỰ XEM
        // =========================================================================

        public async Task<MemberProfileDtoForum> GetMyProfileForumAsync(long memberId)
        {
            Member? hoiVien = await _context.Members
                .Include(m => m.FaceDatum)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (hoiVien is null) return null;

            int soBaiViet = await _context.ForumPosts
                .CountAsync(p => p.MemberId == memberId && p.Status != "Deleted");

            return new MemberProfileDtoForum
            {
                MemberId = hoiVien.MemberId,
                FullName = hoiVien.FullName,
                Avatar = hoiVien.FaceDatum?.ProfileImage,
                Phone = hoiVien.Phone,
                JoinedAt = hoiVien.CreatedAt,
                PostCount = soBaiViet
            };
        }

       public async Task<MemberProfileDto?> GetMyProfileAsync(long memberId)
{
    Member? hoiVien = await _context.Members
        .Include(m => m.FaceDatum)
        .FirstOrDefaultAsync(m => m.MemberId == memberId);

    if (hoiVien == null)
        return null;

    Account? taiKhoan = await _context.Accounts
        .FirstOrDefaultAsync(a => a.MemberId == memberId);

    List<MemberUpdateSessionResponse> lichSuCapNhat =
        await GetUpdateHistoryAsync(memberId);

    MemberUpdateSessionResponse? capNhatGanNhat =
        lichSuCapNhat.FirstOrDefault();

    DateOnly homNay = DateOnly.FromDateTime(DateTime.Today);

    MemberPackage? goiDangHieuLuc = await _context.MemberPackages
        .Include(mp => mp.Plan)
        .FirstOrDefaultAsync(mp =>
            mp.MemberId == memberId &&
            mp.StartDate <= homNay &&
            mp.ExpiryDate >= homNay);

    // Lấy chi nhánh từ lịch sử FaceID
    var history = await _context.FaceUpdateHistories
        .Include(x => x.PerformedByNavigation)
            .ThenInclude(x => x.Branches)
        .Where(x => x.MemberId == memberId)
        .OrderByDescending(x => x.PerformedAt) // nếu có cột này
        .FirstOrDefaultAsync();

    var branchname = history?
        .PerformedByNavigation?
        .Branches?
        .FirstOrDefault()?
        .BranchName;

    return new MemberProfileDto
    {
        MemberId = hoiVien.MemberId,
        FullName = hoiVien.FullName,
        Avatar = hoiVien.FaceDatum?.ProfileImage,

        Phone = hoiVien.Phone,
        Gender = hoiVien.Gender,
        JoinedAt = hoiVien.CreatedAt,

        // Không có chi nhánh thì trả null
        BranchName = branchname,

        Update = capNhatGanNhat?.UpdatedAt.ToString("dd/MM/yyyy HH:mm"),
        EmployeeName = capNhatGanNhat?.EmployeeName,

        MembershipPlanReponse = goiDangHieuLuc == null
            ? null
            : new MembershipPlanReponse
            {
                PlanName = goiDangHieuLuc.Plan?.PlanName,
                Price = goiDangHieuLuc.Plan?.Price ?? 0,

                StartDate = goiDangHieuLuc.StartDate.HasValue
                    ? goiDangHieuLuc.StartDate.Value.ToDateTime(TimeOnly.MinValue)
                    : default,

                EndDate = goiDangHieuLuc.ExpiryDate.HasValue
                    ? goiDangHieuLuc.ExpiryDate.Value.ToDateTime(TimeOnly.MinValue)
                    : default
            },

        UpdateHistory = lichSuCapNhat,

        HistoryTransaction =
            await _transactionService.GetMyHistoryAsync(memberId)
    };
}
    }
}
