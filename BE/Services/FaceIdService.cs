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