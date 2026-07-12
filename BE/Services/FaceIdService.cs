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
        /// Đăng ký FaceID lần đầu cho member (member chưa có FaceDatum).
        /// Không SaveChanges — caller tự gọi SaveChanges khi gộp chung transaction.
        /// </summary>
        public async Task<FaceDatum> RegisterFirstFaceAsync(long memberId, IFormFile profileImage, string reason, long performedBy)
        {
            var now = DateTime.UtcNow;

            var profileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
            var faceIdAws = await _faceService.RegisterFaceAsync(profileImage, $"member-{memberId}");

            var faceData = new FaceDatum
            {
                MemberId = memberId,
                FaceIdAws = faceIdAws,
                ProfileImage = profileImageUrl,
                CreatedAt = now,
                CreatedBy = performedBy
            };
            _context.FaceData.Add(faceData);

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = profileImageUrl,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            return faceData;
        }

        /// <summary>
        /// Cập nhật FaceID cho member (có thể đã có hoặc chưa có FaceDatum).
        /// Tự SaveChanges, và chỉ xóa face cũ trên AWS SAU KHI DB đã lưu thành công.
        /// </summary>
        public async Task<FaceDatum> UpdateFaceAsync(long memberId, IFormFile profileImage, string? reason, long performedBy)
        {
            var faceData = await _context.FaceData.FirstOrDefaultAsync(f => f.MemberId == memberId);
            var now = DateTime.UtcNow;
            var oldFaceId = faceData?.FaceIdAws;
            var oldProfileImageUrl = faceData?.ProfileImage;

            var newProfileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
            var newFaceId = await _faceService.RegisterFaceAsync(profileImage, $"member-{memberId}");

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

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                OldFaceIdAws = oldFaceId,
                NewFaceIdAws = newFaceId,
                OldProfileImage = oldProfileImageUrl,
                NewProfileImage = newProfileImageUrl,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = now
            });

            await _context.SaveChangesAsync();

            // Chỉ xóa face cũ trên AWS sau khi DB đã lưu thành công, tránh mất dữ liệu nếu lỗi giữa chừng
            if (!string.IsNullOrEmpty(oldFaceId))
                await _faceService.DeleteFaceAsync(oldFaceId);

            return faceData;
        }

        /// <summary>Lấy lịch sử thay đổi FaceID của 1 member, đã map sẵn sang response chung</summary>
        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long memberId)
        {
            var faceLogs = await _context.FaceUpdateHistories
                .Where(f => f.MemberId == memberId)
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
    }
}