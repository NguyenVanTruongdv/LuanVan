using BE.Data;
using BE.Dtos.Member;
using BE.Models;
using BE.Services.FaceRecognition;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BE.Services
{
    // GHI CHÚ:
    // - Password không nhận từ FE, tự sinh 8 ký tự, hash bằng BCrypt.
    //   Cần cài package: dotnet add package BCrypt.Net-Next
    // - Ảnh (ProfileImage/ReceiptImage) nhận vào dạng IFormFile, upload lên S3, chỉ lưu URL vào DB.
    // - QUAN TRỌNG: FaceIdAws KHÔNG nhận từ FE nữa (trước đây sai logic — client không thể tự nghĩ
    //   ra FaceId). FaceIdAws giờ luôn được BE tự sinh bằng cách gửi ProfileImage lên AWS Rekognition
    //   (IFaceRecognitionService.RegisterFaceAsync) và lấy FaceId AWS trả về. Do đó ở mọi API liên
    //   quan tới FaceID, ProfileImage trở thành bắt buộc (không có ảnh thì không có gì để đăng ký cả).
    // - UpdatedByEmployeeId (MemberUpdateLog) và PerformedBy (FaceUpdateHistory) cần đổi kiểu
    //   trong Model từ "long" sang "long?" để cho phép null khi khách tự cập nhật.
    // - BranchId KHÔNG nhận từ FE khi tạo hội viên nữa — BE tự lấy chi nhánh gán cho nhân viên
    //   đang thực hiện (performedBy) thông qua Employee.Branches.
    // - StartDate/ExpiryDate KHÔNG nhận từ FE nữa — BE tự tính: StartDate = hôm nay,
    //   ExpiryDate = StartDate + DurationDays (của MembershipPlan) + SoNgayTangThucTe.
    // - SoNgayTangThucTe KHÔNG nhận từ FE nữa — BE tự tính dựa vào PromotionId + DurationDays
    //   của gói (xem CalculateSoNgayTangThucTeAsync). Tránh trường hợp client tự sửa số ngày
    //   tặng qua DevTools/Postman để được tặng thêm ngày tùy ý.
    public class MemberService
    {
        private readonly GymManagementContext _context;
        private readonly S3StorageService _storageService;
        private readonly RekognitionFaceService _faceService;

        public MemberService(
            GymManagementContext context,
            S3StorageService storageService,
            RekognitionFaceService faceService)
        {
            _context = context;
            _storageService = storageService;
            _faceService = faceService;
        }

        // ===================== KIỂM TRA TRÙNG SỐ ĐIỆN THOẠI =====================
        // Dùng ở FE ngay sau khi nhập xong form thông tin (bước 1), trước khi cho qua bước chọn gói,
        // để báo trùng SĐT sớm thay vì phải đợi tới lúc submit tạo hội viên mới biết.
        public async Task<bool> CheckPhoneExistsAsync(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Số điện thoại không được để trống.");

            return await _context.Members.AnyAsync(m => m.Phone == phone);
        }

        // ===================== TÍNH SỐ NGÀY TẶNG THỰC TẾ TỪ KHUYẾN MÃI =====================
        // KHÔNG nhận SoNgayTangThucTe từ FE — quy tắc quy đổi (xem comment trong Model MemberPackage):
        //   TangNgay    => lấy đúng số ngày tặng của khuyến mãi
        //   TangChuKy   => số chu kỳ tặng × DurationDays của gói
        //   Không có KM (PromotionId == null) => 0
        // TODO: đổi tên property PromotionType/SoNgayTang/SoChuKyTang cho khớp Model Promotion thật của bạn.
        private async Task<short> CalculateSoNgayTangThucTeAsync(int? promotionId, short planDurationDays)
        {
            if (promotionId == null)
                return 0;

            var promotion = await _context.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotionId);
            if (promotion == null)
                throw new KeyNotFoundException("Không tìm thấy khuyến mãi.");

            return promotion.PromoType switch
            {
                "TangNgay" => (short)(promotion.SoNgayTang ?? 0),
                "TangChuKy" => (short)((promotion.SoChuKyTang ?? 0) * planDurationDays),
                _ => 0
            };
        }

        // ===================== TẠO HỘI VIÊN MỚI =====================
        public async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request, long performedBy)
        {
            var phoneExisted = await _context.Members.AnyAsync(m => m.Phone == request.Phone);
            if (phoneExisted)
                throw new InvalidOperationException($"Số điện thoại '{request.Phone}' đã được sử dụng.");

            var now = DateTime.UtcNow;
            var generatedPassword = GenerateRandomPassword();
            var emp = await _context.Employees
                .Include(e => e.Branches)
                .FirstOrDefaultAsync(e => e.EmployeeId == performedBy);

            if (emp == null)
                throw new Exception("Không tìm thấy nhân viên.");

            var branchId = emp.Branches.FirstOrDefault()?.BranchId;

            if (branchId == null)
                throw new Exception("Nhân viên chưa được gán chi nhánh.");

            // Lấy gói tập từ DB để tự tính ngày — KHÔNG tin StartDate/ExpiryDate do FE gửi lên,
            // vì client hoàn toàn có thể sửa DevTools/Postman gửi ngày tùy ý để "tăng hạn" gói tập.
            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");

            var soNgayTangThucTe = await CalculateSoNgayTangThucTeAsync(request.PromotionId, plan.DurationDays);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = startDate.AddDays(plan.DurationDays + soNgayTangThucTe);

            // 1. Tạo hội viên (cần MemberId trước khi đăng ký Face — dùng làm ExternalImageId bên AWS)
            var member = new Member
            {
                FullName = request.FullName,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
                Gender = request.Gender,
                BranchId = branchId,
                Status = "PendingActivation",
                InternalNotes = request.InternalNotes,
                CreatedBy = performedBy,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Members.Add(member);
            await _context.SaveChangesAsync(); // cần MemberId cho các bước sau

            // 2. Upload ảnh + đăng ký Face ID qua AWS Rekognition (ProfileImage bắt buộc — xem CreateMemberRequest)
            var profileImageUrl = await _storageService.UploadFileAsync(request.ProfileImage, "members/faces");
            var faceIdAws = await _faceService.RegisterFaceAsync(request.ProfileImage, $"member-{member.MemberId}");

            _context.FaceData.Add(new FaceDatum
            {
                MemberId = member.MemberId,
                FaceIdAws = faceIdAws,
                ProfileImage = profileImageUrl,
                CreatedAt = now,
                CreatedBy = performedBy
            });

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = member.MemberId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = profileImageUrl,
                Reason = "Đăng ký khuôn mặt lần đầu khi tạo hội viên",
                PerformedBy = performedBy,
                PerformedAt = now
            });

            // 3. Tạo giao dịch (hóa đơn) cho gói tập
            string? receiptImageUrl = null;
            if (request.ReceiptImage != null)
                receiptImageUrl = await _storageService.UploadFileAsync(request.ReceiptImage, "members/receipts");

            var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : "Pending")
                : request.PaymentStatus;

            var transactionEntity = new Transaction
            {
                OrderCode = GenerateOrderCode(),
                MemberId = member.MemberId,
                PlanId = request.PlanId,
                PromotionId = request.PromotionId,
                PaymentMethod = request.PaymentMethod,
                PaymentStatus = paymentStatus,
                GiaGoc = request.GiaGoc,
                Amount = request.Amount,
                ReceiptImage = receiptImageUrl,
                EmployeeId = performedBy,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Transactions.Add(transactionEntity);
            await _context.SaveChangesAsync(); // cần TransactionId

            // 4. Tạo gói tập, gắn với hóa đơn vừa tạo — StartDate/ExpiryDate/SoNgayTangThucTe
            //    lấy từ các biến đã tự tính ở backend, không dùng giá trị FE gửi lên
            _context.MemberPackages.Add(new MemberPackage
            {
                MemberId = member.MemberId,
                TransactionId = transactionEntity.TransactionId,
                PlanId = request.PlanId,
                PromotionId = request.PromotionId,
                GiaGoc = request.GiaGoc,
                Amount = request.Amount,
                SoNgayTangThucTe = soNgayTangThucTe,
                StartDate = startDate,
                ExpiryDate = expiryDate,
                PackageStatus = "Active",
                CreatedAt = now,
                UpdatedAt = now
            });

            // 5. Kích hoạt tài khoản
            member.Status = "Active";
            member.UpdatedAt = now;

            // 6. Ghi log tạo hội viên
            _context.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = member.MemberId,
                FieldName = "CREATE_MEMBER",
                OldValue = null,
                NewValue = $"Tạo hội viên '{member.FullName}' - SĐT {member.Phone} - Hóa đơn {transactionEntity.OrderCode}",
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = now
            });

            await _context.SaveChangesAsync();

            var response = await BuildMemberResponse(member.MemberId);
            response.GeneratedPassword = generatedPassword; // trả về 1 lần duy nhất
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

        private static string GenerateOrderCode()
        {
            return $"HD{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}";
        }

        // ===================== LẤY THÔNG TIN HỘI VIÊN =====================
        public async Task<MemberResponse> GetByIdAsync(long memberId)
        {
            return await BuildMemberResponse(memberId);
        }

        // ===================== DANH SÁCH TẤT CẢ HỘI VIÊN (lọc theo SĐT, tên, chi nhánh) =====================
        // Trả kèm ảnh đại diện + tất cả gói tập đang trong thời hạn sử dụng tính đến hôm nay
        // (1 hội viên có thể có nhiều gói cùng lúc, nên CurrentPackages là danh sách).
        public async Task<List<MemberListItem>> GetMembersAsync(string? phone, string? fullName, int? branchId)
        {
            var query = _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(m => m.Plan)
                .Include(m => m.Branch) // TODO: đổi tên navigation property cho đúng với Model Member của bạn nếu khác
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(phone))
                query = query.Where(m => m.Phone.Contains(phone));

            if (!string.IsNullOrWhiteSpace(fullName))
                query = query.Where(m => m.FullName.Contains(fullName));

            if (branchId.HasValue)
                query = query.Where(m => m.BranchId == branchId);

            var members = await query
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return members.Select(member => new MemberListItem
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Phone = member.Phone,
                BranchName = member.Branch?.BranchName, // TODO: đổi tên property cho đúng Model Branch của bạn nếu khác
                Status = member.Status,
                ProfileImage = member.FaceDatum?.ProfileImage,
                CurrentPackages = member.MemberPackages
                    .Where(p => p.StartDate <= today && p.ExpiryDate >= today)
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
            }).ToList();
        }

        // ===================== DANH SÁCH HỘI VIÊN ĐANG CHỜ KÍCH HOẠT =====================
        // Cùng cấu trúc trả về với GetMembersAsync, nhưng luôn lọc Status = PendingActivation.
        public async Task<List<MemberListItem>> GetPendingMembersAsync(string? phone, string? fullName, int? branchId)
        {
            var query = _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(m => m.Plan)
                .Include(m => m.Branch) // TODO: đổi tên navigation property cho đúng với Model Member của bạn nếu khác
                .Where(m => m.Status == "PendingActivation")
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(phone))
                query = query.Where(m => m.Phone.Contains(phone));

            if (!string.IsNullOrWhiteSpace(fullName))
                query = query.Where(m => m.FullName.Contains(fullName));

            if (branchId.HasValue)
                query = query.Where(m => m.BranchId == branchId);

            var members = await query
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return members.Select(member => new MemberListItem
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Phone = member.Phone,
                BranchName = member.Branch?.BranchName, // TODO: đổi tên property cho đúng Model Branch của bạn nếu khác
                Status = member.Status,
                ProfileImage = member.FaceDatum?.ProfileImage,
                CurrentPackages = member.MemberPackages
                    .Where(p => p.StartDate <= today && p.ExpiryDate >= today)
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
                var phoneExisted = await _context.Members
                    .AnyAsync(m => m.Phone == request.Phone && m.MemberId != memberId);
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
                return await BuildMemberResponse(memberId); // không có gì thay đổi

            member.UpdatedAt = now;
            _context.MemberUpdateLogs.AddRange(logs);
            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // ===================== SỬA FACE ID / ẢNH ĐẠI DIỆN =====================
        // Chỉ nhân viên mới được sửa Face ID/ảnh đại diện — performedBy luôn bắt buộc, không null.
        // ProfileImage luôn bắt buộc (xem UpdateFaceIdRequest) vì FaceId mới chỉ có được
        // bằng cách đăng ký lại ảnh mới qua AWS Rekognition.
        //
        // Chính sách lưu ảnh: chỉ giữ lại tối đa 2 phiên bản ảnh gần nhất (ảnh hiện tại + ảnh vừa bị thay).
        // Ảnh nào "quá 1 đời" (bị thay từ 2 lần cập nhật trở lên) sẽ bị xóa khỏi S3, đồng thời cả 2
        // bản ghi lịch sử đang trỏ tới URL đó (bản ghi cũ có NewProfileImage = URL, bản ghi kế tiếp có
        // OldProfileImage = URL) đều được null hóa để tránh hiển thị ảnh vỡ.
        public async Task<MemberResponse> UpdateFaceIdAsync(long memberId, UpdateFaceIdRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var faceData = await _context.FaceData.FirstOrDefaultAsync(f => f.MemberId == memberId);
            var now = DateTime.UtcNow;
            var oldFaceId = faceData?.FaceIdAws;
            var oldProfileImageUrl = faceData?.ProfileImage;

            // Đăng ký khuôn mặt mới qua AWS Rekognition trước, upload ảnh mới lên S3
            var newProfileImageUrl = await _storageService.UploadFileAsync(request.ProfileImage, "members/faces");
            var newFaceId = await _faceService.RegisterFaceAsync(request.ProfileImage, $"member-{memberId}");

            if (faceData == null)
            {
                faceData = new FaceDatum
                {
                    MemberId = memberId,
                    FaceIdAws = newFaceId,
                    ProfileImage = newProfileImageUrl,
                    CreatedAt = now,
                    CreatedBy = performedBy
                };
                _context.FaceData.Add(faceData);
            }
            else
            {
                faceData.FaceIdAws = newFaceId;
                faceData.ProfileImage = newProfileImageUrl;
            }

            // Lưu lại toàn bộ — không xóa gì cả, phục vụ xem lại lịch sử đầy đủ
            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                OldFaceIdAws = oldFaceId,
                NewFaceIdAws = newFaceId,
                OldProfileImage = oldProfileImageUrl,
                NewProfileImage = newProfileImageUrl,
                Reason = request.Reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            member.UpdatedAt = now;
            await _context.SaveChangesAsync();

            // Chỉ xóa Face record cũ trên AWS Rekognition (tránh 1 người có nhiều face record
            // gây nhận diện nhầm) — KHÔNG xóa ảnh trên S3.
            if (!string.IsNullOrEmpty(oldFaceId))
                await _faceService.DeleteFaceAsync(oldFaceId);

            return await BuildMemberResponse(memberId);
        }

        // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID (hội viên chưa có cả 2) =====================
        public async Task<MemberResponse> ActivateWithPackageAsync(long memberId, ActivateMemberWithPackageRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var hasPackage = await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
            if (hasPackage)
                throw new InvalidOperationException("Hội viên đã có gói tập. Vui lòng dùng API tạo FaceID riêng.");

            var hasFaceId = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
            if (hasFaceId)
                throw new InvalidOperationException("Hội viên đã có FaceID.");

            // Lấy thông tin gói tập để tính ngày hiệu lực — KHÔNG tin StartDate/ExpiryDate FE gửi lên
            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == request.PlanId);
            if (plan == null)
                throw new KeyNotFoundException("Không tìm thấy gói tập.");
            if (plan.Status != "OnSale")
                throw new InvalidOperationException("Gói tập hiện không còn bán.");

            var now = DateTime.UtcNow;

            var soNgayTangThucTe = await CalculateSoNgayTangThucTeAsync(request.PromotionId, plan.DurationDays);

            var startDate = DateOnly.FromDateTime(now);
            var expiryDate = startDate.AddDays(plan.DurationDays + soNgayTangThucTe);

            // 1. Tạo giao dịch (hóa đơn) cho gói tập
            string? receiptImageUrl = null;
            if (request.ReceiptImage != null)
                receiptImageUrl = await _storageService.UploadFileAsync(request.ReceiptImage, "members/receipts");

            var paymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus)
                ? (request.PaymentMethod == "Cash" ? "Paid" : "Pending")
                : request.PaymentStatus;

            var transactionEntity = new Transaction
            {
                OrderCode = GenerateOrderCode(),
                MemberId = memberId,
                PlanId = request.PlanId,
                PromotionId = request.PromotionId,
                PaymentMethod = request.PaymentMethod,
                PaymentStatus = paymentStatus,
                GiaGoc = request.GiaGoc,
                Amount = request.Amount,
                ReceiptImage = receiptImageUrl,
                EmployeeId = performedBy,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Transactions.Add(transactionEntity);
            await _context.SaveChangesAsync(); // cần TransactionId

            // 2. Tạo gói tập, gắn với hóa đơn vừa tạo — StartDate/ExpiryDate/SoNgayTangThucTe
            //    lấy từ các biến đã tự tính ở backend
            _context.MemberPackages.Add(new MemberPackage
            {
                MemberId = memberId,
                TransactionId = transactionEntity.TransactionId,
                PlanId = request.PlanId,
                PromotionId = request.PromotionId,
                GiaGoc = request.GiaGoc,
                Amount = request.Amount,
                SoNgayTangThucTe = soNgayTangThucTe,
                StartDate = startDate,
                ExpiryDate = expiryDate,
                PackageStatus = "Active",
                CreatedAt = now,
                UpdatedAt = now
            });

            // 3. Đăng ký Face ID qua AWS Rekognition (ProfileImage bắt buộc — xem DTO)
            var profileImageUrl = await _storageService.UploadFileAsync(request.ProfileImage, "members/faces");
            var faceIdAws = await _faceService.RegisterFaceAsync(request.ProfileImage, $"member-{memberId}");

            _context.FaceData.Add(new FaceDatum
            {
                MemberId = memberId,
                FaceIdAws = faceIdAws,
                ProfileImage = profileImageUrl,
                CreatedAt = now,
                CreatedBy = performedBy
            });

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = profileImageUrl,
                Reason = "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên",
                PerformedBy = performedBy,
                PerformedAt = now
            });

            // 4. Kích hoạt tài khoản
            var oldStatus = member.Status;
            member.Status = "Active";
            member.UpdatedAt = now;

            // 5. Ghi log
            _context.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = memberId,
                FieldName = "ACTIVATE_MEMBER",
                OldValue = oldStatus,
                NewValue = $"Kích hoạt hội viên - Tạo gói tập + FaceID - Hóa đơn {transactionEntity.OrderCode}",
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = now
            });

            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // ===================== KÍCH HOẠT: CHỈ TẠO FACE ID (hội viên đã có gói tập) =====================
        // ProfileImage bắt buộc (xem ActivateMemberFaceIdOnlyRequest) — FaceId luôn do AWS sinh ra.
        public async Task<MemberResponse> ActivateFaceIdOnlyAsync(long memberId, ActivateMemberFaceIdOnlyRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            var hasPackage = await _context.MemberPackages.AnyAsync(p => p.MemberId == memberId);
            if (!hasPackage)
                throw new InvalidOperationException("Hội viên chưa có gói tập. Vui lòng dùng API tạo gói tập + FaceID.");

            var hasFaceId = await _context.FaceData.AnyAsync(f => f.MemberId == memberId);
            if (hasFaceId)
                throw new InvalidOperationException("Hội viên đã có FaceID.");

            var now = DateTime.UtcNow;

            var profileImageUrl = await _storageService.UploadFileAsync(request.ProfileImage, "members/faces");
            var faceIdAws = await _faceService.RegisterFaceAsync(request.ProfileImage, $"member-{memberId}");

            _context.FaceData.Add(new FaceDatum
            {
                MemberId = memberId,
                FaceIdAws = faceIdAws,
                ProfileImage = profileImageUrl,
                CreatedAt = now,
                CreatedBy = performedBy
            });

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = profileImageUrl,
                Reason = "Đăng ký khuôn mặt lần đầu khi kích hoạt hội viên",
                PerformedBy = performedBy,
                PerformedAt = now
            });

            var oldStatus = member.Status;
            member.Status = "Active";
            member.UpdatedAt = now;

            _context.MemberUpdateLogs.Add(new MemberUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                MemberId = memberId,
                FieldName = "ACTIVATE_MEMBER",
                OldValue = oldStatus,
                NewValue = "Kích hoạt hội viên - Tạo FaceID (đã có gói tập)",
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = now
            });

            await _context.SaveChangesAsync();

            return await BuildMemberResponse(memberId);
        }

        // ===================== KHÓA TÀI KHOẢN =====================
        public async Task LockMemberAsync(long memberId, LockMemberRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (member.Status == "Suspended")
                throw new InvalidOperationException("Tài khoản hội viên đã bị khóa trước đó.");

            var now = DateTime.UtcNow;
            member.Status = "Suspended";
            member.SuspendReason = request.Reason;
            member.UpdatedAt = now;

            _context.AccountLockLogs.Add(new AccountLockLog
            {
                MemberId = memberId,
                EmployeeId = null,
                Action = "Lock",
                Reason = request.Reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            await _context.SaveChangesAsync();
        }

        // ===================== MỞ KHÓA TÀI KHOẢN =====================
        public async Task UnlockMemberAsync(long memberId, UnlockMemberRequest request, long performedBy)
        {
            var member = await _context.Members.FirstOrDefaultAsync(m => m.MemberId == memberId);
            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            if (member.Status != "Suspended")
                throw new InvalidOperationException("Tài khoản hội viên không ở trạng thái bị khóa.");

            var now = DateTime.UtcNow;
            member.Status = "Active";
            member.SuspendReason = null;
            member.UpdatedAt = now;

            _context.AccountLockLogs.Add(new AccountLockLog
            {
                MemberId = memberId,
                EmployeeId = null,
                Action = "Unlock",
                Reason = request.Reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            await _context.SaveChangesAsync();
        }

        // ===================== LỊCH SỬ CẬP NHẬT (gộp theo phiên sửa) =====================
        public async Task<List<MemberUpdateSessionResponse>> GetUpdateHistoryAsync(long memberId)
        {
            // 1) Lịch sử cập nhật thông tin (họ tên, sđt, giới tính, ghi chú...)
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

            // 2) Lịch sử cập nhật FaceID
            var faceLogs = await _context.FaceUpdateHistories
                .Where(f => f.MemberId == memberId)
                .Include(f => f.PerformedByNavigation)
                .OrderByDescending(f => f.PerformedAt)
                .ToListAsync();

            var faceSessions = faceLogs.Select(f => new MemberUpdateSessionResponse
            {
                SessionId = $"faceid-{f.HistoryId}",
                SessionType = "FACEID",
                EmployeeName = f.PerformedByNavigation.FullName,
                UpdatedAt = f.PerformedAt,
                OldImageUrl = f.OldProfileImage,
                NewImageUrl = f.NewProfileImage,
                Reason = f.Reason
                // Changes để mặc định rỗng — FaceID không dùng field này nữa
            });

            // 3) Gộp & sắp xếp theo thời gian mới nhất
            return infoSessions
                .Concat(faceSessions)
                .OrderByDescending(s => s.UpdatedAt)
                .ToList();
        }

        // ===================== HÀM DỰNG RESPONSE =====================
        private async Task<MemberResponse> BuildMemberResponse(long memberId)
        {
            var member = await _context.Members
                .Include(m => m.FaceDatum)
                .Include(m => m.MemberPackages).ThenInclude(m => m.Plan)
                .Include(m => m.Branch) // TODO: đổi tên navigation property cho đúng với Model Member của bạn nếu khác
                .FirstOrDefaultAsync(m => m.MemberId == memberId);

            if (member == null)
                throw new KeyNotFoundException("Không tìm thấy hội viên.");

            return MapToResponse(member);
        }

        private static MemberResponse MapToResponse(Member member)
        {
            var currentPackage = member.MemberPackages
                .OrderByDescending(p => p.ExpiryDate)
                .FirstOrDefault();

            return new MemberResponse
            {
                MemberId = member.MemberId,
                FullName = member.FullName,
                Phone = member.Phone,
                Gender = member.Gender,
                BranchName = member.Branch?.BranchName, // TODO: đổi "Name" cho đúng tên property trong Model Branch của bạn
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
    }
}