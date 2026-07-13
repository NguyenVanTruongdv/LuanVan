using BE.Data;
using BE.Dtos;
using BE.Dtos.Member;
using BE.Dtos.Promotion;
using BE.Exceptions;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BE.Services
{
    // GHI CHÚ:
    // - [MỚI] Member KHÔNG còn BranchId. MỌI Transaction/MemberPackage đều bắt buộc gắn BranchId:
    //   + Luồng tại quầy (mọi hàm trong file này): branchId lấy từ Employee.Branches của thu ngân
    //     đang thao tác (GetEmployeeBranchIdAsync) — dùng để tạo Transaction VÀ MemberPackage,
    //     và cũng chính là chi nhánh in trên hóa đơn PDF.
    //   + Luồng mua online (PaymentService) nhận BranchId từ FE lúc khách chọn mua.
    // - [MỚI] KÍCH HOẠT (ActivateWithPackageAsync / ActivateFaceIdOnlyAsync) được thực hiện ở
    //   BẤT KỲ chi nhánh nào, không bị ràng buộc phải trùng chi nhánh gói tập/chi nhánh cũ của
    //   hội viên. Cả 2 hàm đều ghi log tên nhân viên kích hoạt và trả về tên đó trong response
    //   (MemberResponse.ActivatedByEmployeeName).
    // - [MỚI - 13/07/2026] KHÔNG còn tự viết switch(promotion.PromoType) + AddDays để tính
    //   SoNgayTangThucTe/ExpiryDate ở đây nữa (trước đây bị lặp lại y hệt ở CreateMemberAsync VÀ
    //   ActivateWithPackageAsync). Công thức GIỮ NGUYÊN 100% như cũ, chỉ gom về 2 hàm dùng chung
    //   MemberPackageService.CalculateBonusDays / CalculateExpiryDate. Việc VALIDATE hiệu lực
    //   khuyến mãi (TrangThai, NgayBatDau/NgayKetThuc, GioiHanLuot/SoLuotDaDung, PlanId có khớp
    //   không) cũng được gom về 1 hàm private ValidateAndGetPromotionAsync bên dưới, vì trước đây
    //   2 luồng trên copy y hệt khối validate này.
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

        public async Task<CurrentPackageDto> GetCurrentPackageAsync(long memberId)
        {
            var exist = await _context.Members.FindAsync(memberId);
            if (exist == null)
            {
                throw new NotFoundException("Không tìm thấy hội viên");
            }
            var pack = await _context.MemberPackages
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

            return pack;
        }

        // ===================== KIỂM TRA TRÙNG SỐ ĐIỆN THOẠI =====================
        public async Task<bool> CheckPhoneExistsAsync(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Số điện thoại không được để trống.");

            return await _context.Members.AnyAsync(m => m.Phone == phone);
        }

        // ===================== KIỂM TRA ĐIỀU KIỆN MUA GÓI ONLINE =====================
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
        public async Task<bool> Haspackage(long memberId) //Kiểm tra xem có gói tập không (dùng ỏ trang kích hoạt)
        {
            var pack = await _context.MemberPackages.Where(p => p.PackageStatus == "PendingActivation")
                                                    .FirstOrDefaultAsync(p => p.MemberId == memberId);
            if (pack == null)
                return false;
            return true;
        }
        // ===================== [PRIVATE] LẤY CHI NHÁNH CỦA NHÂN VIÊN THAO TÁC =====================
        private async Task<int> GetEmployeeBranchIdAsync(long employeeId)  // Này dùng cho staff
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

        // ===================== [PRIVATE] LẤY TÊN NHÂN VIÊN (dùng cho log + response kích hoạt) =====================
        private async Task<string?> GetEmployeeNameAsync(long employeeId)
        {
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            return emp?.FullName;
        }

        // ===================== [PRIVATE] VALIDATE + LẤY PROMOTION (dùng chung cho 2 luồng bên dưới) =====================
        // [MỚI] Gom khối validate hiệu lực khuyến mãi — TRƯỚC ĐÂY bị copy y hệt ở CreateMemberAsync
        // VÀ ActivateWithPackageAsync — về 1 chỗ duy nhất, tránh 2 nơi cùng sửa mà quên đồng bộ.
        // Nội dung kiểm tra GIỮ NGUYÊN 100% như code gốc: đúng PlanId, đang HoatDong, còn trong
        // khoảng NgayBatDau/NgayKetThuc, còn lượt dùng (GioiHanLuot/SoLuotDaDung).
        // Việc quy đổi ra SoNgayTangThucTe do MemberPackageService.CalculateBonusDays đảm nhiệm,
        // KHÔNG làm ở đây.
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

        // ===================== [THU NGÂN] TẠO HỘI VIÊN MỚI (walk-in, Active ngay) =====================
        public async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request, long performedBy)
        {
            var phoneExisted = await _context.Members.AnyAsync(m => m.Phone == request.Phone);
            if (phoneExisted)
                throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

            var now = DateTime.UtcNow;
            var generatedPassword = GenerateRandomPassword();

            // Chi nhánh gói tập/giao dịch = chi nhánh của nhân viên thu ngân đang tạo hội viên này
            var branchId = await GetEmployeeBranchIdAsync(performedBy);

            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");

            // [MỚI] Validate khuyến mãi (nếu có) qua hàm dùng chung — nội dung kiểm tra y hệt bản cũ.
            var promotion = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);

            // [MỚI] Quy đổi khuyến mãi ra SoNgayTangThucTe + tính ExpiryDate qua hàm dùng chung
            // của MemberPackageService — công thức giữ nguyên y hệt bản cũ (TangNgay=SoNgayTang,
            // TangChuKy=SoChuKyTang*plan.DurationDays), chỉ không viết lặp lại switch ở đây nữa.
            var soNgayTangThucTe = _packageService.CalculateBonusDays(promotion, plan);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, soNgayTangThucTe);

            var member = new Member
            {
                FullName = request.FullName,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
                Gender = request.Gender,
                Status = "Activate",
                InternalNotes = request.InternalNotes,
                CreatedBy = performedBy,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            await _faceIdService.RegisterFirstFaceAsync(
                member.MemberId, request.ProfileImage,
                "Đăng ký khuôn mặt lần đầu khi tạo hội viên", performedBy);

            var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                : request.PaymentStatus;

            var transaction = await _transactionService.CreateTransactionAsync(
                member.MemberId, request.PlanId, request.PromotionId,
                request.GiaGoc, request.Amount,
                request.PaymentMethod, paymentStatus,
                null, performedBy, branchId); // [MỚI] branchId

            var memberPackage = await _packageService.CreateActivePackageAsync(
                member.MemberId, request.PlanId, request.PromotionId,
                request.GiaGoc, request.Amount, soNgayTangThucTe,
                startDate, expiryDate, transaction.TransactionId, branchId);

            // [MỚI] Ghi nhận lượt dùng khuyến mãi sau khi transaction + memberPackage đã tạo thành công.
            if (promotion != null)
            {
                _transactionService.RecordPromotionUsage(
                    promotion, member.MemberId, memberPackage.MemberPackageId,
                    request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
            }

            await GenerateInvoiceIfPaidAsync(
                transaction, member, plan, paymentStatus,
                giaGoc: request.GiaGoc,
                discountAmount: request.GiaGoc - request.Amount,
                amount: request.Amount,
                bonusDays: soNgayTangThucTe,
                startDate: startDate,
                expiryDate: expiryDate,
                performedBy: performedBy,
                promotion: promotion, // [MỚI] dùng lại promotion đã fetch, khỏi query lại
                branchId: branchId); // [MỚI] chi nhánh in trên hóa đơn = chi nhánh đã bán gói

            member.Status = "Active";
            member.UpdatedAt = now;

            _context.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = member.MemberId,
                FieldName = "CREATE_MEMBER",
                OldValue = null,
                NewValue = $"Tạo hội viên '{member.FullName}' - SĐT {member.Phone} - Hóa đơn {transaction.OrderCode}",
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = now
            });

            await _context.SaveChangesAsync();

            var response = await BuildMemberResponse(member.MemberId);
            response.GeneratedPassword = generatedPassword;
            return response;
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

        // ===================== LẤY THÔNG TIN HỘI VIÊN =====================
        public async Task<MemberResponse> GetByIdAsync(long memberId) => await BuildMemberResponse(memberId);

        // ===================== DANH SÁCH TẤT CẢ HỘI VIÊN =====================
        public async Task<List<MemberListItem>> GetMembersAsync(string? phone, string? fullName, int? branchId)
            => await QueryMemberList(phone, fullName, branchId, pendingOnly: false);

        // ===================== DANH SÁCH HỘI VIÊN CHỜ KÍCH HOẠT =====================
        public async Task<List<MemberListItem>> GetPendingMembersAsync(string? phone, string? fullName, int? branchId)
            => await QueryMemberList(phone, fullName, branchId, pendingOnly: true);

        private async Task<List<MemberListItem>> QueryMemberList(string? phone, string? fullName, int? branchId, bool pendingOnly)
        {
            var query = _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Branch)
                .AsQueryable();

            if (pendingOnly)
                query = query.Where(m => m.Status == "PendingActivation");

            if (!string.IsNullOrWhiteSpace(phone))
                query = query.Where(m => m.Phone.Contains(phone));

            if (!string.IsNullOrWhiteSpace(fullName))
                query = query.Where(m => m.FullName.Contains(fullName));

            if (branchId.HasValue)
                query = query.Where(m => m.MemberPackages.Any(p => p.BranchId == branchId));

            var members = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return members.Select(member =>
            {
                var latestPackage = member.MemberPackages
                    .OrderByDescending(p => p.CreatedAt)
                    .FirstOrDefault();

                return new MemberListItem
                {
                    MemberId = member.MemberId,
                    FullName = member.FullName,
                    Phone = member.Phone,
                    BranchName = latestPackage?.Branch?.BranchName,
                    Status = member.Status,
                    ProfileImage = member.FaceDatum?.ProfileImage,
                    CurrentPackages = member.MemberPackages
                        .Where(p => p.StartDate.HasValue && p.ExpiryDate.HasValue
                            && p.StartDate.Value <= today && p.ExpiryDate.Value >= today)
                        .Select(p => new CurrentPackageItem
                        {
                            MemberPackageId = p.MemberPackageId,
                            PlanId = p.PlanId,
                            PlanName = p.Plan.PlanName,
                            StartDate = p.StartDate,
                            ExpiryDate = p.ExpiryDate,
                            PackageStatus = p.PackageStatus
                        }).ToList()
                };
            }).ToList();
        }

        // ===================== KIỂM TRA ĐÃ CÓ GÓI TẬP CHƯA =====================
        public async Task<bool> HasPackageAsync(long memberId)
        {
            var memberExists = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!memberExists)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            return await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
        }

        // ===================== SỬA THÔNG TIN HỘI VIÊN =====================
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

            if (request.Phone != null && request.Phone != member.Phone)
            {
                var phoneExisted = await _context.Members.AnyAsync(m => m.Phone == request.Phone && m.MemberId != memberId);
                if (phoneExisted)
                    throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

                TrackChange("phone", member.Phone, request.Phone);
                member.Phone = request.Phone;
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

        // ===================== SỬA FACE ID / ẢNH ĐẠI DIỆN =====================
        public async Task<MemberResponse> UpdateFaceIdAsync(long memberId, UpdateFaceIdRequest request, long performedBy)
        {
            var memberExists = await _context.Members.AnyAsync(m => m.MemberId == memberId);
            if (!memberExists)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            await _faceIdService.UpdateFaceAsync(memberId, request.ProfileImage, request.Reason, performedBy);

            var member = await _context.Members.FirstAsync(m => m.MemberId == memberId);
            member.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // ===================== [THU NGÂN] KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
        // [MỚI] Chi nhánh gói tập vẫn lấy từ nhân viên đang bán gói lúc kích hoạt (vì đây là bán
        // gói mới thật sự, không phải "chỉ kích hoạt tài khoản"), nhưng KHÔNG có ràng buộc gì về
        // việc hội viên/gói cũ phải cùng chi nhánh — kích hoạt ở chi nhánh nào cũng được.
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

            // Chi nhánh gói tập/giao dịch = chi nhánh của nhân viên thu ngân đang kích hoạt+bán gói.
            var branchId = await GetEmployeeBranchIdAsync(performedBy);
            var employeeName = await GetEmployeeNameAsync(performedBy);

            var now = DateTime.UtcNow;

            // [MỚI] Validate khuyến mãi (nếu có) qua hàm dùng chung — nội dung kiểm tra y hệt bản cũ.
            var promotion = await ValidateAndGetPromotionAsync(request.PromotionId, request.PlanId, now);

            // [MỚI] Quy đổi khuyến mãi ra SoNgayTangThucTe + tính ExpiryDate qua hàm dùng chung.
            var soNgayTangThucTe = _packageService.CalculateBonusDays(promotion, plan);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, soNgayTangThucTe);

            var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : PaymentStatus.Paid.ToString())
                : request.PaymentStatus;

            var transaction = await _transactionService.CreateTransactionAsync(
                memberId, request.PlanId, request.PromotionId,
                request.GiaGoc, request.Amount,
                request.PaymentMethod, paymentStatus,
                null, performedBy, branchId); // [MỚI] branchId

            var memberPackage = await _packageService.CreateActivePackageAsync(
                memberId, request.PlanId, request.PromotionId,
                request.GiaGoc, request.Amount, soNgayTangThucTe,
                startDate, expiryDate, transaction.TransactionId, branchId);

            // [MỚI] Ghi nhận lượt dùng khuyến mãi.
            if (promotion != null)
            {
                _transactionService.RecordPromotionUsage(
                    promotion, memberId, memberPackage.MemberPackageId,
                    request.PlanId, soNgayTangThucTe, discountAmount: request.GiaGoc - request.Amount);
            }

            await GenerateInvoiceIfPaidAsync(
                transaction, member, plan, paymentStatus,
                giaGoc: request.GiaGoc,
                discountAmount: request.GiaGoc - request.Amount,
                amount: request.Amount,
                bonusDays: soNgayTangThucTe,
                startDate: startDate,
                expiryDate: expiryDate,
                performedBy: performedBy,
                promotion: promotion, // [MỚI] dùng lại promotion đã fetch
                branchId: branchId); // [MỚI]

            await _faceIdService.RegisterFirstFaceAsync(
                memberId, request.ProfileImage,
                "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

            var oldStatus = member.Status;
            member.Status = "Active";
            member.UpdatedAt = now;

            // [MỚI] Log ghi rõ tên nhân viên kích hoạt (ngoài UpdatedByEmployeeId đã có sẵn)
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

            var response = await BuildMemberResponse(memberId);
            response.ActivatedByEmployeeName = employeeName; // [MỚI]
            return response;
        }
        // ===================== [THU NGÂN] KÍCH HOẠT: CHỈ TẠO FACE ID =====================
        // [MỚI] Không ràng buộc chi nhánh — nhân viên ở BẤT KỲ chi nhánh nào cũng kích hoạt được
        // FaceID cho hội viên (gói Pending mua online giữ nguyên BranchId khách đã chọn; gói
        // Active/Expired cũ cũng không bị đổi BranchId ở đây). Chỉ ghi log + trả tên nhân viên
        // kích hoạt.
        public async Task<MemberResponse> ActivateFaceIdOnlyAsync(long memberId, ActivateMemberFaceIdOnlyRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var now = DateTime.UtcNow;
            var today = DateOnly.FromDateTime(now);
            var employeeName = await GetEmployeeNameAsync(performedBy); // [MỚI]

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
                memberId, request.ProfileImage,
                "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên", performedBy);

            var oldStatus = member.Status;
            member.Status = "Active";
            member.UpdatedAt = now;

            // [MỚI] Ghi rõ tên nhân viên kích hoạt vào log
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

            var response = await BuildMemberResponse(memberId);
            response.ActivatedByEmployeeName = employeeName; // [MỚI]
            return response;
        }

        // ===================== KHÓA / MỞ KHÓA TÀI KHOẢN =====================
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
            member.SuspendReason = action == "Lock" ? reason : null;
            member.UpdatedAt = now;

            _context.AccountLockLogs.Add(new AccountLockLog
            {
                MemberId = memberId,
                EmployeeId = null,
                Action = action,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            await _context.SaveChangesAsync();
        }

        // ===================== LỊCH SỬ CẬP NHẬT =====================
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

            var faceSessions = await _faceIdService.GetFaceHistoryAsync(memberId);

            // [MỚI] Lịch sử điều chỉnh gói tập tại quầy (nhân viên sửa lại do bán/chọn nhầm gói).
            var packageAdjustSessions = await _transactionService.GetPackageAdjustmentHistoryAsync(memberId);

            return infoSessions
                .Concat(faceSessions)
                .Concat(packageAdjustSessions)
                .OrderByDescending(s => s.UpdatedAt)
                .ToList();
        }

        // ===================== HÀM DỰNG RESPONSE =====================
        private async Task<MemberResponse> BuildMemberResponse(long memberId)
        {
            var member = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Branch)
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var currentPackage = member.MemberPackages.OrderByDescending(p => p.ExpiryDate).FirstOrDefault();

            return new MemberResponse
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Phone = member.Phone,
                Gender = member.Gender,
                BranchName = currentPackage?.Branch?.BranchName,
                Status = member.Status,
                SuspendReason = member.SuspendReason,
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

        // ===================== SINH HÓA ĐƠN PDF NẾU GIAO DỊCH ĐÃ THANH TOÁN =====================
        // [MỚI] Nhận thêm branchId — chi nhánh đã BÁN gói tập trong giao dịch này — để lấy
        // BranchName/Address/Phone in lên hóa đơn PDF (thay cho hardcode tên/địa chỉ gym cũ).
        private async Task<string?> GenerateInvoiceIfPaidAsync(
            Transaction transaction,
            Member member,
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
                MemberPhone = member.Phone,
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
                BranchName = branch?.BranchName,     // [MỚI]
                BranchAddress = branch?.Address,      // [MỚI]
                BranchPhone = branch?.Phone            // [MỚI]
            });
        }

        // =========================================================
        // GIA HẠN GÓI TẬP DÀNH CHO THU NGÂN
        // =========================================================

        public async Task<List<MemberSearchItem>> SearchMembersForRenewAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<MemberSearchItem>();

            var q = query.Trim();

            var members = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
                .Where(m => m.FullName.Contains(q) || m.Phone.Contains(q))
                .OrderByDescending(m => m.CreatedAt)
                .Take(20)
                .ToListAsync();

            return members.Select(m =>
            {
                var pkg = m.MemberPackages.OrderByDescending(p => p.ExpiryDate).FirstOrDefault();
                return new MemberSearchItem
                {
                    MemberId = m.MemberId,
                    FullName = m.FullName,
                    Phone = m.Phone,
                    Status = m.Status,
                    ProfileImage = m.FaceDatum?.ProfileImage,
                    CurrentPlanName = pkg?.Plan?.PlanName,
                    CurrentStartDate = pkg?.StartDate,
                    CurrentExpiryDate = pkg?.ExpiryDate,
                    CurrentPackageStatus = pkg?.PackageStatus
                };
            }).ToList();
        }

        // ===================== [THU NGÂN] GIA HẠN / MUA GÓI MỚI CHO HỘI VIÊN ĐÃ CÓ GÓI =====================
        // [KHÔNG ĐỔI] Hàm này vẫn lấy bonusDays từ TransactionService.CalculatePromotionEffectAsync
        // như bản gốc (không chuyển sang gọi _packageService.CalculateBonusDays), vì luồng này tính
        // kèm cả giá/giảm giá — CalculatePromotionEffectAsync cần biết bonusDays để trả về đúng bộ
        // (giaGoc, discountAmt, amount, bonusDays, appliedPromo) trong 1 lần, tránh phải validate
        // + tính lại promotion ở 2 nơi khác nhau cho cùng 1 giao dịch.
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

            // Chi nhánh gói tập mới = chi nhánh của nhân viên đang gia hạn
            var branchId = await GetEmployeeBranchIdAsync(performedBy);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var latestPackage = await _packageService.GetLatestPackageAsync(memberId);
            var (startDate, isExtending) = _packageService.DetermineStartDate(latestPackage, today);

            var (giaGoc, discountAmt, amount, bonusDays, appliedPromo) =
                await _transactionService.CalculatePromotionEffectAsync(request.PromotionId, plan.PlanId, plan.Price, plan.DurationDays);

            // [MỚI] Vẫn cộng ngày qua CalculateExpiryDate cho đồng nhất công thức với các luồng
            // khác (kết quả giống hệt startDate.AddDays(plan.DurationDays + bonusDays) như bản cũ).
            var expiryDate = _packageService.CalculateExpiryDate(startDate, plan, bonusDays);

            var transaction = await _transactionService.CreateTransactionAsync(
                memberId, plan.PlanId, appliedPromo?.PromotionId,
                giaGoc, amount, request.PaymentMethod, "Paid",
                request.BankReferenceCode, performedBy, branchId); // [MỚI] branchId

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
                transaction, member, plan, transaction.PaymentStatus,
                giaGoc: giaGoc,
                discountAmount: discountAmt,
                amount: amount,
                bonusDays: bonusDays,
                startDate: startDate,
                expiryDate: expiryDate,
                performedBy: performedBy,
                promotion: appliedPromo,
                branchId: branchId); // [MỚI]

            return new RenewMembershipResponse
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
    }
}