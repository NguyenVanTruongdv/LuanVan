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

        public MemberService(
            GymManagementContext context,
            FaceIdService faceIdService,
            TransactionService transactionService,
            MemberPackageService packageService)
        {
            _context = context;
            _faceIdService = faceIdService;
            _transactionService = transactionService;
            _packageService = packageService;
        }

        // =========================================================================
        // NHÓM 1: HÀM PRIVATE DÙNG CHUNG (helper nội bộ)
        // =========================================================================

        private async Task<int> GetEmployeeBranchIdAsync(long employeeId)
        {
            var emp = await _context.Employees
                .Include(e => e.EmployeeBranches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (emp == null)
                throw new Exception("Không tìm thấy nhân viên.");

            var branchId = emp.EmployeeBranches.FirstOrDefault()?.BranchId;
            if (branchId == null)
                throw new Exception("Nhân viên chưa được gán chi nhánh.");

            return branchId.Value;
        }

        private async Task<string?> GetEmployeeNameAsync(long employeeId)
        {
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            return emp?.FullName;
        }

        // Phone/PasswordHash nằm trên bảng accounts (dùng chung cho member + employee), không còn trên Member.
        private async Task<Account> GetAccountByMemberIdAsync(long memberId)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);
            if (account == null)
                throw new KeyNotFoundException("Không tìm thấy tài khoản của hội viên.");
            return account;
        }

        private async Task<Promotion?> ValidateAndGetPromotionAsync(int? promotionId, int planId, DateTime now)
        {
            if (!promotionId.HasValue)
                return null;

            var promotion = await _context.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
            if (promotion == null)
                throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

            if (promotion.PlanId != planId)
                throw new InvalidOperationException("Khuyến mãi không áp dụng cho gói tập này.");

            if (promotion.TrangThai != "HoatDong")
                throw new InvalidOperationException("Khuyến mãi hiện không hoạt động.");

            if (promotion.NgayBatDau > now || (promotion.NgayKetThuc != null && promotion.NgayKetThuc < now))
                throw new InvalidOperationException("Khuyến mãi chưa bắt đầu hoặc đã hết hạn.");

            if (promotion.GioiHanLuot != null && promotion.SoLuotDaDung >= promotion.GioiHanLuot)
                throw new InvalidOperationException("Khuyến mãi đã hết lượt sử dụng.");

            return promotion;
        }

        private static string GenerateRandomPassword(int length = 8)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            var bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes);

            var sb = new StringBuilder(length);
            foreach (var b in bytes)
                sb.Append(chars[b % chars.Length]);

            return sb.ToString();
        }

        // Gói chỉ còn 1 loại duy nhất (không còn Internal/Customer) -> lấy thẳng gói Active mới nhất theo ExpiryDate.
        private async Task<MemberResponse> BuildMemberResponse(long memberId)
        {
            var member = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Plan)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Branch)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);

            var currentPackage = member.MemberPackages
                .Where(mp => mp.PackageStatus == "Active")
                .OrderByDescending(mp => mp.ExpiryDate)
                .FirstOrDefault();

            return new MemberResponse
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Phone = account?.Phone,
                Gender = member.Gender,
                BranchName = currentPackage?.Branch?.BranchName,
                Status = member.Status,

                InternalNotes = member.InternalNotes,
                CreatedAt = member.CreatedAt,
                UpdatedAt = member.UpdatedAt,

                FaceIdAws = member.FaceDatum?.FaceIdAws,
                ProfileImage = member.FaceDatum?.ProfileImage,

                CurrentMemberPackageId = currentPackage?.Plan?.PlanName,
                PackageExpiryDate = currentPackage?.ExpiryDate,
                PackageStatus = currentPackage?.PackageStatus
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

            Employee? employee = performedBy.HasValue
                ? await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == performedBy.Value)
                : null;

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.BranchId == branchId);

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
                EmployeeName = employee?.FullName,
                PromotionName = promotion?.TenKhuyenMai,
                BranchName = branch?.BranchName,
                BranchAddress = branch?.Address,
                BranchPhone = branch?.Phone
            });
        }

        // =========================================================================
        // NHÓM 2: KIỂM TRA / TRUY VẤN HỘI VIÊN
        // =========================================================================

        public async Task<bool> CheckPhoneExistsAsync(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Số điện thoại không được để trống.");

            return await _context.Accounts.AnyAsync(a => a.Phone == phone);
        }

        public async Task<PendingPurchaseStatusDto> CheckPendingPurchaseStatusAsync(long memberId)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var isPending = member.Status == "PendingActivation";
            var hasPendingPackage = false;

            if (isPending)
            {
                var pendingPackage = await _packageService.GetPendingPackageAsync(memberId);
                hasPendingPackage = pendingPackage != null;
            }

            return new PendingPurchaseStatusDto
            {
                IsPendingActivation = isPending,
                HasPendingPackage = hasPendingPackage,
                CanPurchasePackage = !(isPending && hasPendingPackage)
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
            var memberExists = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!memberExists)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            return await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
        }

        public async Task<CurrentPackageDto> GetCurrentPackageAsync(long memberId)
        {
            var exist = await _context.Members.FindAsync(memberId);
            if (exist == null)
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

        // Danh sách hội viên theo phone/fullName/branch (Phone lấy từ Account, không còn trên Member).
        private async Task<List<MemberListItem>> QueryMemberList(string? phone, string? fullName, int? branchId, bool pendingOnly)
        {
            var query = _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Plan)
                .Include(m => m.MemberPackages)
                    .ThenInclude(mp => mp.Branch)
                .AsQueryable();

            if (pendingOnly)
                query = query.Where(m => m.Status == "PendingActivation");

            if (!string.IsNullOrWhiteSpace(fullName))
                query = query.Where(m => m.FullName.Contains(fullName));

            if (branchId.HasValue)
                query = query.Where(m => m.MemberPackages.Any(p => p.BranchId == branchId));

            var members = await query
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var accountsByMemberId = await GetPhonesByMemberIdsAsync(members.Select(m => m.MemberId));

            var result = members.Select(member =>
            {
                var currentPackage = member.MemberPackages
                    .Where(p => p.PackageStatus == "Active")
                    .OrderByDescending(p => p.ExpiryDate)
                    .FirstOrDefault();

                accountsByMemberId.TryGetValue(member.MemberId, out var memberPhone);

                return new MemberListItem
                {
                    MemberId = member.MemberId,
                    FullName = member.FullName,
                    Phone = memberPhone,
                    BranchName = currentPackage?.Branch?.BranchName,
                    Status = member.Status,
                    ProfileImage = member.FaceDatum?.ProfileImage,

                    CurrentPackages = member.MemberPackages
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

            if (!string.IsNullOrWhiteSpace(phone))
                result = result.Where(m => m.Phone != null && m.Phone.Contains(phone)).ToList();

            return result;
        }

        private async Task<List<MemberListItem>> QueryAll(string? phone, string? fullName)
        {
            var query = _context.Members
                .Include(m => m.FaceDatum)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(fullName))
                query = query.Where(m => m.FullName.Contains(fullName));

            var members = await query
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var accountsByMemberId = await GetPhonesByMemberIdsAsync(members.Select(m => m.MemberId));

            var result = members.Select(member =>
            {
                accountsByMemberId.TryGetValue(member.MemberId, out var memberPhone);
                return new MemberListItem
                {
                    MemberId = member.MemberId,
                    FullName = member.FullName,
                    Phone = memberPhone,
                    Status = member.Status,
                    ProfileImage = member.FaceDatum?.ProfileImage,
                    BranchName = null,
                    CurrentPackages = new List<CurrentPackageItem>()
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(phone))
                result = result.Where(m => m.Phone != null && m.Phone.Contains(phone)).ToList();

            return result;
        }

        public async Task<List<MemberSearchItem>> SearchMembersForRenewAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<MemberSearchItem>();

            var q = query.Trim();

            var byName = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Where(m => m.FullName.Contains(q))
                .OrderByDescending(m => m.CreatedAt)
                .Take(20)
                .ToListAsync();

            var memberIdsByPhone = await _context.Accounts
                .Where(a => a.MemberId != null && a.Phone.Contains(q))
                .Select(a => a.MemberId!.Value)
                .Take(20)
                .ToListAsync();

            var byPhone = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Where(m => memberIdsByPhone.Contains(m.MemberId))
                .ToListAsync();

            var members = byName
                .Concat(byPhone)
                .GroupBy(m => m.MemberId)
                .Select(g => g.First())
                .OrderByDescending(m => m.CreatedAt)
                .Take(20)
                .ToList();

            var accountsByMemberId = await GetPhonesByMemberIdsAsync(members.Select(m => m.MemberId));

            return members.Select(m =>
            {
                var pkg = m.MemberPackages.OrderByDescending(p => p.ExpiryDate).FirstOrDefault();
                accountsByMemberId.TryGetValue(m.MemberId, out var memberPhone);
                return new MemberSearchItem
                {
                    MemberId = m.MemberId,
                    FullName = m.FullName,
                    Phone = memberPhone,
                    Status = m.Status,
                    ProfileImage = m.FaceDatum?.ProfileImage,
                    CurrentPlanName = pkg?.Plan?.PlanName,
                    CurrentStartDate = pkg?.StartDate,
                    CurrentExpiryDate = pkg?.ExpiryDate,
                    CurrentPackageStatus = pkg?.PackageStatus
                };
            }).ToList();
        }

        // Lấy Phone theo MemberId hàng loạt (dùng chung cho các hàm liệt kê ở trên)
        private async Task<Dictionary<long, string?>> GetPhonesByMemberIdsAsync(IEnumerable<long> memberIds)
        {
            var ids = memberIds.ToList();
            return await _context.Accounts
                .Where(a => a.MemberId != null && ids.Contains(a.MemberId.Value))
                .ToDictionaryAsync(a => a.MemberId!.Value, a => a.Phone);
        }

        // =========================================================================
        // NHÓM 3: [THU NGÂN] TẠO HỘI VIÊN MỚI
        // =========================================================================

        public async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request, long performedBy)
        {
            var phoneExisted = await _context.Accounts.AnyAsync(a => a.Phone == request.Phone);
            if (phoneExisted)
                throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

            var now = DateTime.UtcNow;
            var generatedPassword = GenerateRandomPassword();

            var branchId = await GetEmployeeBranchIdAsync(performedBy);

            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");

            var promotion = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);
            var soNgayTangThucTe = _packageService.CalculateBonusDays(promotion, plan);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, soNgayTangThucTe);

            // Kiểm tra trùng khuôn mặt TRƯỚC khi mở transaction DB, tránh mở transaction
            // rồi rollback tốn công nếu ảnh đã trùng người khác. Đây là hội viên MỚI nên
            // không loại trừ ai (chưa có FaceId nào để loại trừ). scope: Member -> chỉ so
            // trùng với các Member khác, không bị chặn nhầm nếu khớp ra 1 Employee.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse response = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var member = new Member
                    {
                        FullName = request.FullName,
                        Gender = request.Gender,
                        Status = "Activate",
                        InternalNotes = request.InternalNotes,
                        CreatedBy = performedBy,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.Members.Add(member);
                    await _context.SaveChangesAsync();

                    var account = new Account
                    {
                        MemberId = member.MemberId,
                        Phone = request.Phone,
                        PasswordHash = PasswordHelper.HashPassword(generatedPassword),
                        Status = "Active",
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.Accounts.Add(account);
                    await _context.SaveChangesAsync();

                    // Nếu upload ảnh lỗi -> throw -> rollback member + account vừa Add.
                    await _faceIdService.RegisterFirstFaceAsync(
                        member.MemberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi tạo hội viên", performedBy);

                    var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                        ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                        : request.PaymentStatus;

                    var transaction = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
                    {
                        MemberId = member.MemberId,
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

                    var memberPackage = await _packageService.CreateActivePackageAsync(
                        member.MemberId, request.PlanId, request.PromotionId,
                        request.GiaGoc, request.Amount, soNgayTangThucTe,
                        startDate, expiryDate, transaction.TransactionId, branchId);

                    if (promotion != null)
                    {
                        _transactionService.RecordPromotionUsage(
                            promotion, member.MemberId, memberPackage.MemberPackageId,
                            request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
                    }

                    await GenerateInvoiceIfPaidAsync(
                        transaction, member, request.Phone, plan, paymentStatus,
                        giaGoc: request.GiaGoc,
                        discountAmount: request.GiaGoc - request.Amount,
                        amount: request.Amount,
                        bonusDays: soNgayTangThucTe,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: promotion,
                        branchId: branchId);

                    member.Status = "Active";
                    member.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = member.MemberId,
                        FieldName = "CREATE_MEMBER",
                        OldValue = null,
                        NewValue = $"Tạo hội viên '{member.FullName}' - SĐT {request.Phone} - Hóa đơn {transaction.OrderCode}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    response = await BuildMemberResponse(member.MemberId);
                    response.GeneratedPassword = generatedPassword;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return response;
        }

        // =========================================================================
        // NHÓM 4: CẬP NHẬT THÔNG TIN HỘI VIÊN
        // =========================================================================

        public async Task<MemberResponse> UpdateMemberInfoAsync(long memberId, UpdateMemberInfoRequest request, long? performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var now = DateTime.UtcNow;
            var sessionId = Guid.NewGuid();
            var logs = new List<MemberUpdateLog>();

            void TrackChange(string field, string? oldValue, string? newValue)
            {
                if (oldValue == newValue) return;
                logs.Add(new MemberUpdateLog
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

            if (request.FullName != null && request.FullName != member.FullName)
            {
                TrackChange("full_name", member.FullName, request.FullName);
                member.FullName = request.FullName;
            }

            if (request.Phone != null)
            {
                var account = await GetAccountByMemberIdAsync(memberId);
                if (request.Phone != account.Phone)
                {
                    var phoneExisted = await _context.Accounts.AnyAsync(a => a.Phone == request.Phone && a.MemberId != memberId);
                    if (phoneExisted)
                        throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

                    TrackChange("phone", account.Phone, request.Phone);
                    account.Phone = request.Phone;
                    account.UpdatedAt = now;
                }
            }

            if (request.Gender != null && request.Gender != member.Gender)
            {
                TrackChange("gender", member.Gender, request.Gender);
                member.Gender = request.Gender;
            }

            if (request.InternalNotes != null && request.InternalNotes != member.InternalNotes)
            {
                TrackChange("internal_notes", member.InternalNotes, request.InternalNotes);
                member.InternalNotes = request.InternalNotes;
            }

            if (logs.Count == 0)
                return await BuildMemberResponse(memberId);

            member.UpdatedAt = now;
            _context.MemberUpdateLogs.AddRange(logs);
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        public async Task<MemberResponse> UpdateFaceIdAsync(long memberId, UpdateFaceIdRequest request, long performedBy)
        {
            var memberExists = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!memberExists)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            // Kiểm tra trùng khuôn mặt với NGƯỜI KHÁC trước khi đổi ảnh — loại trừ chính
            // memberId đang cập nhật vì Rekognition khớp lại chính họ là bình thường.
            // scope: Member -> chỉ so trùng với các Member khác.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member, excludeMemberId: memberId);

            await _faceIdService.UpdateFaceAsync(memberId, employeeId: null, request.ProfileImage, request.Reason, performedBy);

            var member = await _context.Members.FirstAsync(m => m.MemberId == memberId);
            member.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // Hội viên tự cập nhật thông tin của chính mình. Phone + đổi mật khẩu thao tác trên Account.
        public async Task<MemberResponse> UpdateMyProfileAsync(long memberId, UpdateMyProfileRequest request)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (member.Status == "Suspended")
                throw new InvalidOperationException("Tài khoản đang bị khóa, không thể tự cập nhật thông tin.");

            var account = await GetAccountByMemberIdAsync(memberId);

            var now = DateTime.UtcNow;
            var sessionId = Guid.NewGuid();
            var logs = new List<MemberUpdateLog>();
            var accountChanged = false;

            void TrackChange(string field, string? oldValue, string? newValue)
            {
                logs.Add(new MemberUpdateLog
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

            if (!string.IsNullOrWhiteSpace(request.FullName) && request.FullName != member.FullName)
            {
                TrackChange("full_name", member.FullName, request.FullName);
                member.FullName = request.FullName;
            }

            if (!string.IsNullOrWhiteSpace(request.Phone) && request.Phone != account.Phone)
            {
                var phoneExisted = await _context.Accounts.AnyAsync(a => a.Phone == request.Phone && a.MemberId != memberId);
                if (phoneExisted)
                    throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

                TrackChange("phone", account.Phone, request.Phone);
                account.Phone = request.Phone;
                accountChanged = true;
            }

            if (!string.IsNullOrWhiteSpace(request.Gender) && request.Gender != member.Gender)
            {
                TrackChange("gender", member.Gender, request.Gender);
                member.Gender = request.Gender;
            }

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                    throw new InvalidOperationException("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");

                if (!PasswordHelper.VerifyPassword(request.CurrentPassword, account.PasswordHash))
                    throw new InvalidOperationException("Mật khẩu hiện tại không đúng.");

                if (request.NewPassword.Length < 6)
                    throw new InvalidOperationException("Mật khẩu mới phải có ít nhất 6 ký tự.");

                if (request.NewPassword == request.CurrentPassword)
                    throw new InvalidOperationException("Mật khẩu mới phải khác mật khẩu hiện tại.");

                account.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
                accountChanged = true;

                logs.Add(new MemberUpdateLog
                {
                    UpdateSessionId = sessionId,
                    MemberId = memberId,
                    FieldName = "password",
                    OldValue = "(đã ẩn)",
                    NewValue = "Hội viên tự đổi mật khẩu",
                    UpdatedByEmployeeId = null,
                    UpdatedAt = now
                });
            }

            if (logs.Count == 0)
                return await BuildMemberResponse(memberId);

            if (accountChanged)
                account.UpdatedAt = now;

            member.UpdatedAt = now;
            _context.MemberUpdateLogs.AddRange(logs);
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // =========================================================================
        // NHÓM 5: [THU NGÂN] KÍCH HOẠT HỘI VIÊN
        // =========================================================================

        public async Task<MemberResponse> ActivateWithPackageAsync(long memberId, ActivateMemberWithPackageRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var hasPackage = await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
            if (hasPackage)
                throw new InvalidOperationException("Hội viên đã có gói tập (kể cả gói đang chờ kích hoạt). Vui lòng dùng API kích hoạt FaceID.");

            var hasFaceId = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
            if (hasFaceId)
                throw new InvalidOperationException("Hội viên đã có FaceID.");

            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");
            if (plan.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            var branchId = await GetEmployeeBranchIdAsync(performedBy);
            var employeeName = await GetEmployeeNameAsync(performedBy);
            var account = await GetAccountByMemberIdAsync(memberId);

            var now = DateTime.UtcNow;
            var promotion = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);
            var soNgayTangThucTe = _packageService.CalculateBonusDays(promotion, plan);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, soNgayTangThucTe);

            var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                : request.PaymentStatus;

            // Hội viên chưa có FaceID (đã check ở trên) -> không cần loại trừ ai khi kiểm
            // tra trùng. scope: Member -> chỉ so trùng với các Member khác.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse response = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var transaction = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
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

                    var memberPackage = await _packageService.CreateActivePackageAsync(
                        memberId, request.PlanId, request.PromotionId,
                        request.GiaGoc, request.Amount, soNgayTangThucTe,
                        startDate, expiryDate, transaction.TransactionId, branchId);

                    if (promotion != null)
                    {
                        _transactionService.RecordPromotionUsage(
                            promotion, memberId, memberPackage.MemberPackageId,
                            request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
                    }

                    await GenerateInvoiceIfPaidAsync(
                        transaction, member, account.Phone, plan, paymentStatus,
                        giaGoc: request.GiaGoc,
                        discountAmount: request.GiaGoc - request.Amount,
                        amount: request.Amount,
                        bonusDays: soNgayTangThucTe,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: promotion,
                        branchId: branchId);

                    await _faceIdService.RegisterFirstFaceAsync(
                        memberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

                    var oldStatus = member.Status;
                    member.Status = "Active";
                    member.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "ACTIVATE_MEMBER",
                        OldValue = oldStatus,
                        NewValue = $"Kích hoạt hội viên - Tạo gói tập + FaceID - Hóa đơn {transaction.OrderCode} - NV kích hoạt: {employeeName ?? "N/A"}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    response = await BuildMemberResponse(memberId);
                    response.ActivatedByEmployeeName = employeeName;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return response;
        }

        public async Task<MemberResponse> ActivateFaceIdOnlyAsync(long memberId, ActivateMemberFaceIdOnlyRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var now = DateTime.UtcNow;
            var today = DateOnly.FromDateTime(now);
            var employeeName = await GetEmployeeNameAsync(performedBy);

            // Hội viên này CHƯA có FaceID (được assert lại trong strategy bên dưới),
            // nên không cần loại trừ ai khi kiểm tra trùng. scope: Member -> chỉ so
            // trùng với các Member khác.
            await _faceIdService.EnsureFaceNotDuplicateAsync(request.ProfileImage, FaceOwnerType.Member);

            var strategy = _context.Database.CreateExecutionStrategy();
            MemberResponse response = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var pendingPackage = await _packageService.GetPendingPackageAsync(memberId);
                    if (pendingPackage != null)
                    {
                        await _packageService.ActivatePendingPackageAsync(pendingPackage, today);
                    }
                    else
                    {
                        var latestPackage = await _packageService.GetLatestPackageAsync(memberId);
                        if (latestPackage == null)
                            throw new InvalidOperationException("Hội viên chưa có gói tập. Vui lòng dùng API tạo gói tập + FaceID.");

                        if (!latestPackage.ExpiryDate.HasValue || latestPackage.ExpiryDate.Value < today)
                            throw new InvalidOperationException(
                                $"Gói tập '{latestPackage.Plan?.PlanName}' đã hết hạn từ ngày {latestPackage.ExpiryDate:dd/MM/yyyy} " +
                                "(hội viên chưa từng đến tập kể từ lúc mua gói). Vui lòng gia hạn/mua gói mới cho hội viên " +
                                "trước khi đăng ký FaceID (dùng API gia hạn hoặc API tạo gói tập + FaceID).");
                    }

                    var hasFaceId = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
                    if (hasFaceId)
                        throw new InvalidOperationException("Hội viên đã có FaceID.");

                    await _faceIdService.RegisterFirstFaceAsync(
                        memberId, employeeId: null, request.ProfileImage,
                        "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

                    var oldStatus = member.Status;
                    member.Status = "Active";
                    member.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "ACTIVATE_MEMBER",
                        OldValue = oldStatus,
                        NewValue = (pendingPackage != null
                            ? "Kích hoạt hội viên - Kích hoạt gói tập đã mua online + FaceID"
                            : "Kích hoạt hội viên - Tạo FaceID (đã có gói tập)")
                            + $" - NV kích hoạt: {employeeName ?? "N/A"}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    response = await BuildMemberResponse(memberId);
                    response.ActivatedByEmployeeName = employeeName;
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return response;
        }

        // =========================================================================
        // NHÓM 6: KHÓA / MỞ KHÓA TÀI KHOẢN
        // =========================================================================

        public async Task LockMemberAsync(long memberId, LockMemberRequest request, long performedBy)
            => await SetLockStatusAsync(memberId, "Suspended", "Lock", request.Reason, performedBy);

        public async Task UnlockMemberAsync(long memberId, UnlockMemberRequest request, long performedBy)
            => await SetLockStatusAsync(memberId, "Active", "Unlock", request.Reason, performedBy);

        private async Task SetLockStatusAsync(long memberId, string newStatus, string action, string? reason, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (action == "Lock" && member.Status == "Suspended")
                throw new InvalidOperationException("Tài khoản hội viên đã bị khóa trước đó.");
            if (action == "Unlock" && member.Status != "Suspended")
                throw new InvalidOperationException("Tài khoản hội viên không ở trạng thái bị khóa.");

            var now = DateTime.UtcNow;
            member.Status = newStatus;
            member.UpdatedAt = now;

            await _context.SaveChangesAsync();
        }

        // =========================================================================
        // NHÓM 7: LỊCH SỬ CẬP NHẬT
        // =========================================================================

        public async Task<List<MemberUpdateSessionResponse>> GetUpdateHistoryAsync(long memberId)
        {
            var infoLogs = await _context.MemberUpdateLogs
                .Where(l => l.MemberId == memberId)
                .Include(l => l.UpdatedByEmployee)
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            var infoSessions = infoLogs
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
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (member.Status == "Suspended")
                throw new InvalidOperationException("Hội viên đang bị khóa tài khoản, không thể gia hạn gói tập.");

            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");
            if (plan.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            var branchId = await GetEmployeeBranchIdAsync(performedBy);
            var account = await GetAccountByMemberIdAsync(memberId);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var latestPackage = await _packageService.GetLatestPackageAsync(memberId);
            var (startDate, isExtending) = _packageService.DetermineStartDate(latestPackage, today);

                var promoEffect = await _transactionService.CalculatePromotionEffectAsync(
            request.PromotionId, plan.PlanId, plan.Price, plan.DurationDays);

            var giaGoc = promoEffect.GiaGoc;
            var discountAmt = promoEffect.DiscountAmount;
            var amount = promoEffect.Amount;
            var bonusDays = promoEffect.BonusDays;
            var appliedPromo = promoEffect.Promo;
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, bonusDays);

            var strategy = _context.Database.CreateExecutionStrategy();
            RenewMembershipResponse result = null!;

            await strategy.ExecuteAsync(async () =>
            {
                await using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var transaction = await _transactionService.CreateTransactionAsync(new CreateTransactionRequest
                    {
                        MemberId = memberId,
                        PlanId = plan.PlanId,
                        PromotionId = appliedPromo?.PromotionId,
                        BranchId = branchId,
                        PaymentMethod = request.PaymentMethod,
                        PaymentStatus = "Paid",
                        GiaGoc = giaGoc,
                        Amount = amount,
                        BankReferenceCode = request.BankReferenceCode,
                        PerformedBy = performedBy
                    });

                    var memberPackage = await _packageService.CreateActivePackageAsync(
                        memberId, plan.PlanId, appliedPromo?.PromotionId,
                        giaGoc, amount, bonusDays, startDate, expiryDate, transaction.TransactionId, branchId);

                    if (appliedPromo != null)
                        _transactionService.RecordPromotionUsage(appliedPromo, memberId, memberPackage.MemberPackageId, plan.PlanId, bonusDays, discountAmt);

                    var now = DateTime.UtcNow;
                    if (member.Status == "Expired")
                        member.Status = "Active";
                    member.UpdatedAt = now;

                    _context.MemberUpdateLogs.Add(new MemberUpdateLog
                    {
                        UpdateSessionId = Guid.NewGuid(),
                        MemberId = memberId,
                        FieldName = "RENEW_PACKAGE",
                        OldValue = latestPackage != null ? $"{latestPackage.Plan?.PlanName} - hết hạn {latestPackage.ExpiryDate}" : null,
                        NewValue = $"Gia hạn '{plan.PlanName}' - Hóa đơn {transaction.OrderCode} - {(isExtending ? "Nối tiếp" : "Bắt đầu mới")}",
                        UpdatedByEmployeeId = performedBy,
                        UpdatedAt = now
                    });

                    await _context.SaveChangesAsync();

                    var invoiceUrl = await GenerateInvoiceIfPaidAsync(
                        transaction, member, account.Phone, plan, transaction.PaymentStatus,
                        giaGoc: giaGoc,
                        discountAmount: discountAmt,
                        amount: amount,
                        bonusDays: bonusDays,
                        startDate: startDate,
                        expiryDate: expiryDate,
                        performedBy: performedBy,
                        promotion: appliedPromo,
                        branchId: branchId);

                    await dbTransaction.CommitAsync();

                    result = new RenewMembershipResponse
                    {
                        MemberId = memberId,
                        MemberName = member.FullName,
                        MemberPackageId = memberPackage.MemberPackageId,
                        PlanId = plan.PlanId,
                        PlanName = plan.PlanName,
                        GiaGoc = giaGoc,
                        DiscountAmount = discountAmt,
                        Amount = amount,
                        BonusDays = bonusDays,
                        StartDate = startDate,
                        ExpiryDate = expiryDate,
                        IsExtending = isExtending,
                        PaymentMethod = transaction.PaymentMethod,
                        PaymentStatus = transaction.PaymentStatus,
                        TransactionId = transaction.TransactionId,
                        OrderCode = transaction.OrderCode,
                        BankReferenceCode = transaction.BankReferenceCode,
                        InvoiceUrl = invoiceUrl
                    };
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            });

            return result;
        }

        // =========================================================================
        // NHÓM 9: [HỘI VIÊN] HỒ SƠ TỰ XEM
        // =========================================================================

        public async Task<MemberProfileDtoForum> GetMyProfileForumAsync(long memberId)
        {
            var member = await _context.Members
                .Include(m => m.FaceDatum)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member is null) return null;

            var postCount = await _context.ForumPosts
                .CountAsync(p => p.MemberId == memberId && p.Status != "Deleted");

            return new MemberProfileDtoForum
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Avatar = member.FaceDatum?.ProfileImage,
                Phone = (await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId))?.Phone,
                JoinedAt = member.CreatedAt,
                PostCount = postCount
            };
        }

        public async Task<MemberProfileDto?> GetMyProfileAsync(long memberId)
        {
            var member = await _context.Members
                .Include(m => m.FaceDatum)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                return null;

            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);

            var updateHistory = await GetUpdateHistoryAsync(memberId);
            var latestUpdate = updateHistory.FirstOrDefault();

            var today = DateOnly.FromDateTime(DateTime.Today);

            var package = await _context.MemberPackages
                .Include(mp => mp.Plan)
                .FirstOrDefaultAsync(mp =>
                    mp.MemberId == memberId &&
                    mp.StartDate <= today &&
                    mp.ExpiryDate >= today);

            return new MemberProfileDto
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Avatar = member.FaceDatum?.ProfileImage,

                Phone = account?.Phone,
                Gender = member.Gender,
                JoinedAt = member.CreatedAt,

                Update = latestUpdate?.UpdatedAt.ToString("dd/MM/yyyy HH:mm"),
                EmployeeName = latestUpdate?.EmployeeName,

                MembershipPlanReponse = package == null
                    ? null
                    : new MembershipPlanReponse
                    {
                        PlanName = package.Plan.PlanName,
                        Price = package.Plan.Price,
                        StartDate = package.StartDate.HasValue ? package.StartDate.Value.ToDateTime(TimeOnly.MinValue) : default,
                        EndDate = package.ExpiryDate.HasValue ? package.ExpiryDate.Value.ToDateTime(TimeOnly.MinValue) : default,
                    },

                UpdateHistory = updateHistory,

                // TODO: Lấy lịch sử giao dịch
                HistoryTransaction = await _transactionService.GetMyHistoryAsync(memberId)
            };
        }
    }
}