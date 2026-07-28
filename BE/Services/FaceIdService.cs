using BE.Data;
using BE.Dtos.Member;
using BE.Models;
using BE.Services.FaceRecognition;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class FaceIdService
    {
        private const string FaceImageFolder = "members/faces";

        private readonly GymManagementContext _context;
        private readonly S3StorageService _storageService;
        private readonly RekognitionFaceService _faceService;

        public FaceIdService(
            GymManagementContext context,
            S3StorageService storageService,
            RekognitionFaceService faceService)
        {
            _context = context;
            _storageService = storageService;
            _faceService = faceService;
        }

        // ------------------------------------------------------------------
        // KIỂM TRA HỢP LỆ CHO HỘI VIÊN (KHÔNG throw) — dùng cho endpoint
        // preview trước khi tạo hội viên mới / kích hoạt / đổi FaceID hội viên.
        //
        // excludeMemberId: truyền memberId nếu đang kiểm tra ảnh ĐỔI FaceID cho
        // chính hội viên đó (khớp lại chính họ không tính là trùng). Để null khi
        // đăng ký MỚI (chưa có FaceId nào để loại trừ).
        //
        // Chỉ so khớp trong phạm vi Member — nếu Rekognition khớp ra 1 Employee
        // thì KHÔNG tính là trùng ở luồng này (2 pool Member/Employee độc lập).
        // ------------------------------------------------------------------
        public async Task<FaceCheckResultDto> CheckMemberFaceAsync(IFormFile profileImage, long? excludeMemberId = null)
            => await CheckFaceInternalAsync(profileImage, FaceOwnerType.Member, excludeMemberId: excludeMemberId, excludeEmployeeId: null);

        // ------------------------------------------------------------------
        // KIỂM TRA HỢP LỆ CHO NHÂN VIÊN (KHÔNG throw) — dùng cho endpoint
        // preview trước khi tạo/đổi FaceID nhân viên.
        //
        // excludeEmployeeId: truyền employeeId nếu đang kiểm tra ảnh ĐỔI FaceID
        // cho chính nhân viên đó.
        //
        // Chỉ so khớp trong phạm vi Employee — nếu Rekognition khớp ra 1 Member
        // thì KHÔNG tính là trùng ở luồng này (2 pool Member/Employee độc lập).
        // ------------------------------------------------------------------
        public async Task<FaceCheckResultDto> CheckEmployeeFaceAsync(IFormFile profileImage, long? excludeEmployeeId = null)
            => await CheckFaceInternalAsync(profileImage, FaceOwnerType.Employee, excludeMemberId: null, excludeEmployeeId: excludeEmployeeId);

        // ------------------------------------------------------------------
        // Logic dùng chung cho CheckMemberFaceAsync/CheckEmployeeFaceAsync và
        // EnsureFaceNotDuplicateAsync bên dưới.
        //
        // ĐÃ FIX (bug cũ): trước đây hàm này gọi SearchFaceByImageAsync — hàm CHỈ
        // trả về 1 kết quả duy nhất và LUÔN ưu tiên Employee nếu có (thiết kế cho
        // luồng check-in, nơi 1 người vừa là NV vừa là hội viên thì ưu tiên coi là
        // NV). Khi tái sử dụng cho luồng CHECK TRÙNG lúc đăng ký, nếu 1 khuôn mặt
        // được index cả 2 dạng (member-X và employee-Y), việc "ưu tiên Employee"
        // khiến kết quả trả về luôn là Employee dù caller đang cần scope Member —
        // code cũ so `OwnerType != scope` rồi coi là "không khớp trong scope này"
        // và cho pass NHẦM, dù thực ra có 1 Member khớp nằm ngay trong danh sách
        // match trả về từ AWS nhưng bị che mất bởi logic ưu tiên.
        //
        // FIX: dùng SearchAllFaceMatchesAsync (lấy TOÀN BỘ match, không tự ưu
        // tiên ai), rồi tự lọc đúng theo scope đang cần kiểm tra.
        //
        // scope: phạm vi đang kiểm tra (Member hoặc Employee). Nếu trong toàn bộ
        // match không có ai thuộc đúng scope này thì coi là không trùng, hợp lệ
        // để đăng ký (dù có thể khớp 1 người ở scope khác — đó là chuyện của
        // luồng check-in, không phải luồng đăng ký).
        // ------------------------------------------------------------------
        private async Task<FaceCheckResultDto> CheckFaceInternalAsync(
            IFormFile profileImage,
            FaceOwnerType scope,
            long? excludeMemberId,
            long? excludeEmployeeId)
        {
            byte[] imageBytes;
            using (var uploadStream = profileImage.OpenReadStream())
            using (var memoryStream = new MemoryStream())
            {
                await uploadStream.CopyToAsync(memoryStream);
                imageBytes = memoryStream.ToArray();
            }

            var allMatches = await _faceService.SearchAllFaceMatchesAsync(imageBytes);

            if (allMatches.Count == 1 && allMatches[0].Status == FaceSearchStatus.NoFace)
            {
                return new FaceCheckResultDto
                {
                    IsValid = false,
                    HasFace = false,
                    IsDuplicate = false,
                    Message = "Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại."
                };
            }

            // Tìm match ĐÚNG scope đang xét, similarity cao nhất, trong TOÀN BỘ
            // danh sách match trả về — không bị logic ưu tiên Employee che mất.
            var scopeMatch = allMatches
                .Where(r => r.Status == FaceSearchStatus.Found && r.OwnerType == scope)
                .OrderByDescending(r => r.Similarity)
                .FirstOrDefault();

            if (scopeMatch == null)
            {
                // Không có ai thuộc đúng scope đang xét khớp -> hợp lệ để đăng ký
                // (nếu có khớp ở scope khác, đó là việc của luồng check-in, 2 pool
                // Member/Employee độc lập, không chặn chéo nhau ở đây).
                return new FaceCheckResultDto
                {
                    IsValid = true,
                    HasFace = true,
                    IsDuplicate = false,
                    Message = "Ảnh hợp lệ, có thể đăng ký."
                };
            }

            var isSelf = scope == FaceOwnerType.Member
                ? (excludeMemberId.HasValue && scopeMatch.MemberId == excludeMemberId.Value)
                : (excludeEmployeeId.HasValue && scopeMatch.EmployeeId == excludeEmployeeId.Value);

            if (isSelf)
            {
                return new FaceCheckResultDto
                {
                    IsValid = true,
                    HasFace = true,
                    IsDuplicate = false,
                    Message = "Ảnh hợp lệ (khớp với chính hồ sơ đang cập nhật)."
                };
            }

            var ownerTypeLabel = scope == FaceOwnerType.Member ? "Member" : "Employee";
            var target = scope == FaceOwnerType.Member
                ? $"hội viên #{scopeMatch.MemberId}"
                : $"nhân viên #{scopeMatch.EmployeeId}";

            return new FaceCheckResultDto
            {
                IsValid = false,
                HasFace = true,
                IsDuplicate = true,
                DuplicateOwnerType = ownerTypeLabel,
                DuplicateMemberId = scopeMatch.MemberId,
                DuplicateEmployeeId = scopeMatch.EmployeeId,
                Similarity = scopeMatch.Similarity,
                Message = $"Khuôn mặt này đã được đăng ký cho {target} (độ khớp {scopeMatch.Similarity:0.0}%)."
            };
        }

        // ------------------------------------------------------------------
        // KIỂM TRA TRÙNG KHUÔN MẶT (throw nếu trùng) — gọi TRƯỚC khi
        // RegisterFirstFaceAsync/UpdateFaceAsync thực sự đăng ký/cập nhật.
        //
        // Tái sử dụng CHUNG logic search với CheckMemberFaceAsync/CheckEmployeeFaceAsync
        // ở trên (không viết lại lần 2) — chỉ khác là ném exception khi trùng thay vì
        // trả DTO, để giữ đúng hành vi chặn cứng của luồng đăng ký/cập nhật thật.
        //
        // scope: BẮT BUỘC truyền đúng phạm vi đang đăng ký/cập nhật (Member hoặc
        // Employee) để không bị chặn nhầm chéo pool.
        //
        // excludeMemberId / excludeEmployeeId: dùng khi ĐỔI ảnh cho chính người đó
        // (UpdateFaceAsync) — nếu Rekognition khớp lại chính họ thì không tính là trùng.
        // Khi ĐĂNG KÝ LẦN ĐẦU (RegisterFirstFaceAsync) thì không truyền (hoặc truyền null)
        // vì người đó chưa có FaceId nào để loại trừ.
        // ------------------------------------------------------------------
        public async Task EnsureFaceNotDuplicateAsync(
            IFormFile profileImage,
            FaceOwnerType scope,
            long? excludeMemberId = null,
            long? excludeEmployeeId = null)
        {
            var result = await CheckFaceInternalAsync(profileImage, scope, excludeMemberId, excludeEmployeeId);

            // Không chặn HasFace=false ở đây — để bước IndexFaces (RegisterFirstFaceAsync/
            // UpdateFaceAsync) tự ném lỗi tương ứng, tránh trùng lặp thông điệp lỗi (giữ
            // đúng hành vi gốc: "cho qua" khi Status != Found trong phạm vi đang xét).
            if (result.IsDuplicate)
                throw new InvalidOperationException(result.Message);
        }

        /// <summary>
        /// Đăng ký FaceID lần đầu cho member HOẶC employee (chưa có FaceDatum).
        /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
        /// performedBy luôn là EmployeeId của nhân viên thực hiện thao tác (khớp
        /// FaceDatum.CreatedBy — chỉ nhân viên mới được tạo faceId, kể cả khi
        /// faceId đó là của hội viên).
        /// Không SaveChanges — caller tự gọi SaveChanges khi gộp chung transaction.
        /// </summary>
        public async Task<FaceDatum> RegisterFirstFaceAsync(
            long? memberId,
            long? employeeId,
            IFormFile profileImage,
            string reason,
            long performedBy)
        {
            ValidateOwner(memberId, employeeId);

            // Lưu ý: hàm này KHÔNG tự gọi EnsureFaceNotDuplicateAsync — caller (vd:
            // MemberService.CreateMemberAsync) phải tự gọi check trùng TRƯỚC khi gọi
            // hàm này, thường là trước khi mở transaction DB, để tránh mở transaction
            // rồi phải rollback nếu ảnh đã trùng người khác.

            var now = DateTime.UtcNow;
            var sessionId = Guid.NewGuid();

            var profileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);

            // Đăng ký khuôn mặt lên AWS Rekognition — tách rõ nhánh Member/Employee
            // để ExternalImageId luôn đúng quy ước prefix (member-/employee-).
            var faceIdAws = memberId.HasValue
                ? await _faceService.RegisterMemberFaceAsync(profileImage, memberId.Value)
                : await _faceService.RegisterEmployeeFaceAsync(profileImage, employeeId!.Value);

            var faceData = new FaceDatum
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                FaceIdAws = faceIdAws,
                ProfileImage = profileImageUrl,
                CreatedBy = performedBy,
                CreatedAt = now
            };
            _context.FaceData.Add(faceData);

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = profileImageUrl,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            if (employeeId.HasValue)
            {
                AddEmployeeUpdateLogs(
                    sessionId,
                    employeeId.Value,
                    performedBy,
                    now,
                    oldFaceIdAws: null,
                    newFaceIdAws: faceIdAws,
                    oldProfileImage: null,
                    newProfileImage: profileImageUrl);
            }

            return faceData;
        }

        /// <summary>
        /// Cập nhật FaceID cho member HOẶC employee (có thể đã có hoặc chưa có FaceDatum).
        /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
        /// Tự SaveChanges, và chỉ xóa face cũ trên AWS SAU KHI DB đã lưu thành công.
        /// </summary>
        public async Task<FaceDatum> UpdateFaceAsync(
            long? memberId,
            long? employeeId,
            IFormFile profileImage,
            string? reason,
            long performedBy)
        {
            ValidateOwner(memberId, employeeId);

            // Lưu ý: hàm này KHÔNG tự gọi EnsureFaceNotDuplicateAsync — caller (vd:
            // MemberService.UpdateFaceIdAsync) phải tự gọi check trùng TRƯỚC khi gọi
            // hàm này.

            var faceData = await _context.FaceData
                .FirstOrDefaultAsync(f => f.MemberId == memberId && f.EmployeeId == employeeId);

            var now = DateTime.UtcNow;
            var sessionId = Guid.NewGuid();
            var oldFaceId = faceData?.FaceIdAws;
            var oldProfileImageUrl = faceData?.ProfileImage;

            var newProfileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);

            var newFaceId = memberId.HasValue
                ? await _faceService.RegisterMemberFaceAsync(profileImage, memberId.Value)
                : await _faceService.RegisterEmployeeFaceAsync(profileImage, employeeId!.Value);

            if (faceData == null)
            {
                faceData = new FaceDatum
                {
                    MemberId = memberId,
                    EmployeeId = employeeId,
                    FaceIdAws = newFaceId,
                    ProfileImage = newProfileImageUrl,
                    CreatedBy = performedBy,
                    CreatedAt = now
                };
                _context.FaceData.Add(faceData);
            }
            else
            {
                faceData.FaceIdAws = newFaceId;
                faceData.ProfileImage = newProfileImageUrl;
            }

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                OldFaceIdAws = oldFaceId,
                NewFaceIdAws = newFaceId,
                OldProfileImage = oldProfileImageUrl,
                NewProfileImage = newProfileImageUrl,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            if (employeeId.HasValue)
            {
                AddEmployeeUpdateLogs(
                    sessionId,
                    employeeId.Value,
                    performedBy,
                    now,
                    oldFaceIdAws: oldFaceId,
                    newFaceIdAws: newFaceId,
                    oldProfileImage: oldProfileImageUrl,
                    newProfileImage: newProfileImageUrl);
            }

            await _context.SaveChangesAsync();

            // Chỉ xóa face cũ trên AWS sau khi DB đã lưu thành công, tránh mất dữ liệu nếu lỗi giữa chừng
            if (!string.IsNullOrEmpty(oldFaceId))
                await _faceService.DeleteFaceAsync(oldFaceId);

            return faceData;
        }

        /// <summary>
        /// Lấy lịch sử thay đổi FaceID của 1 member HOẶC 1 employee, đã map sẵn sang response chung.
        /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
        /// </summary>
        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long? memberId, long? employeeId)
        {
            ValidateOwner(memberId, employeeId);

            var faceLogs = await _context.FaceUpdateHistories
                .Where(f => f.MemberId == memberId && f.EmployeeId == employeeId)
                .Include(f => f.PerformedByNavigation)
                .OrderByDescending(f => f.PerformedAt)
                .ToListAsync();

            return faceLogs.Select(f => new MemberUpdateSessionResponse
            {
                SessionId = $"faceid-{f.HistoryId}",
                SessionType = "FACEID",
                EmployeeName = f.PerformedByNavigation.FullName,
                UpdatedAt = f.PerformedAt,
                OldImageUrl = f.OldProfileImage,
                NewImageUrl = f.NewProfileImage,
                Reason = f.Reason
            }).ToList();
        }

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        private static void ValidateOwner(long? memberId, long? employeeId)
        {
            var hasMember = memberId.HasValue;
            var hasEmployee = employeeId.HasValue;

            if (hasMember == hasEmployee)
                throw new ArgumentException("Phải cung cấp đúng một trong hai: memberId hoặc employeeId.");
        }

        /// <summary>
        /// Ghi log thay đổi FaceID/ProfileImage của nhân viên vào EmployeeUpdateLog (mỗi field 1 dòng, chung 1 session).
        /// </summary>
        private void AddEmployeeUpdateLogs(
            Guid sessionId,
            long employeeId,
            long performedBy,
            DateTime updatedAt,
            string? oldFaceIdAws,
            string newFaceIdAws,
            string? oldProfileImage,
            string newProfileImage)
        {
            _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog
            {
                UpdateSessionId = sessionId,
                EmployeeId = employeeId,
                FieldName = "FaceIdAws",
                OldValue = oldFaceIdAws,
                NewValue = newFaceIdAws,
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = updatedAt
            });

            _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog
            {
                UpdateSessionId = sessionId,
                EmployeeId = employeeId,
                FieldName = "ProfileImage",
                OldValue = oldProfileImage,
                NewValue = newProfileImage,
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = updatedAt
            });
        }
    }
}