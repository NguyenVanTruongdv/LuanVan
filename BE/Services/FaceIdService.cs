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


        public async Task<FaceCheckResultDto> CheckMemberFaceAsync(IFormFile profileImage, long? excludeMemberId = null)
            => await CheckFaceInternalAsync(profileImage, FaceOwnerType.Member, excludeMemberId: excludeMemberId, excludeEmployeeId: null);


        public async Task<FaceCheckResultDto> CheckEmployeeFaceAsync(IFormFile profileImage, long? excludeEmployeeId = null)
            => await CheckFaceInternalAsync(profileImage, FaceOwnerType.Employee, excludeMemberId: null, excludeEmployeeId: excludeEmployeeId);

        private async Task<FaceCheckResultDto> CheckFaceInternalAsync(
            IFormFile profileImage,
            FaceOwnerType scope,
            long? excludeMemberId,
            long? excludeEmployeeId)
        {
            byte[] mangByteAnh;
            using (var luongDocFileUpload = profileImage.OpenReadStream())
            using (var luongBoNho = new MemoryStream())
            {
                await luongDocFileUpload.CopyToAsync(luongBoNho);
                mangByteAnh = luongBoNho.ToArray();
            }

            var dsTatCaKetQuaKhop = await _faceService.SearchAllFaceMatchesAsync(mangByteAnh);

            if (dsTatCaKetQuaKhop.Count == 1 && dsTatCaKetQuaKhop[0].Status == FaceSearchStatus.NoFace)
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
            var ketQuaKhopDungScope = dsTatCaKetQuaKhop
                .Where(r => r.Status == FaceSearchStatus.Found && r.OwnerType == scope)
                .OrderByDescending(r => r.Similarity)
                .FirstOrDefault();

            if (ketQuaKhopDungScope == null)
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

            var laKhopChinhMinh = scope == FaceOwnerType.Member
                ? (excludeMemberId.HasValue && ketQuaKhopDungScope.MemberId == excludeMemberId.Value)
                : (excludeEmployeeId.HasValue && ketQuaKhopDungScope.EmployeeId == excludeEmployeeId.Value);

            if (laKhopChinhMinh)
            {
                return new FaceCheckResultDto
                {
                    IsValid = true,
                    HasFace = true,
                    IsDuplicate = false,
                    Message = "Ảnh hợp lệ (khớp với chính hồ sơ đang cập nhật)."
                };
            }

            var nhanLoaiChuSoHuu = scope == FaceOwnerType.Member ? "Member" : "Employee";
            var moTaDoiTuongTrung = scope == FaceOwnerType.Member
                ? $"hội viên #{ketQuaKhopDungScope.MemberId}"
                : $"nhân viên #{ketQuaKhopDungScope.EmployeeId}";

            return new FaceCheckResultDto
            {
                IsValid = false,
                HasFace = true,
                IsDuplicate = true,
                DuplicateOwnerType = nhanLoaiChuSoHuu,
                DuplicateMemberId = ketQuaKhopDungScope.MemberId,
                DuplicateEmployeeId = ketQuaKhopDungScope.EmployeeId,
                Similarity = ketQuaKhopDungScope.Similarity,
                Message = $"Khuôn mặt này đã được đăng ký cho {moTaDoiTuongTrung} (độ khớp {ketQuaKhopDungScope.Similarity:0.0}%)."
            };
        }


        public async Task EnsureFaceNotDuplicateAsync(
            IFormFile profileImage,
            FaceOwnerType scope,
            long? excludeMemberId = null,
            long? excludeEmployeeId = null)
        {
            var ketQuaKiemTra = await CheckFaceInternalAsync(profileImage, scope, excludeMemberId, excludeEmployeeId);

            // Không chặn HasFace=false ở đây — để bước IndexFaces (RegisterFirstFaceAsync/
            // UpdateFaceAsync) tự ném lỗi tương ứng, tránh trùng lặp thông điệp lỗi (giữ
            // đúng hành vi gốc: "cho qua" khi Status != Found trong phạm vi đang xét).
            if (ketQuaKiemTra.IsDuplicate)
                throw new InvalidOperationException(ketQuaKiemTra.Message);
        }


        /// <summary>
        /// Đăng ký FaceID lần đầu cho member/employee.
        /// Thứ tự cố ý: đăng ký khuôn mặt trên AWS TRƯỚC, upload ảnh lên S3 SAU.
        /// Lý do: đăng ký AWS dễ lỗi hơn (ảnh không rõ mặt...), nên làm trước để nếu lỗi
        /// thì chưa tốn công/tiền upload ảnh. Nếu AWS đăng ký xong mà upload S3 lại lỗi,
        /// thì xóa lại face vừa đăng ký trên AWS để không bị rác dữ liệu mồ côi.
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

            var thoiDiemHienTai = DateTime.UtcNow;
            var maPhienCapNhat = Guid.NewGuid();

            // Bước 1: đăng ký khuôn mặt lên AWS Rekognition trước.
            var faceIdAws = memberId.HasValue
                ? await _faceService.RegisterMemberFaceAsync(profileImage, memberId.Value)
                : await _faceService.RegisterEmployeeFaceAsync(profileImage, employeeId!.Value);

            // Bước 2: AWS đăng ký xong mới upload ảnh lên S3.
            // Nếu upload lỗi thì phải xóa lại face vừa tạo ở bước 1.
            string urlAnhDaiDien;
            try
            {
                urlAnhDaiDien = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
            }
            catch
            {
                await _faceService.DeleteFaceAsync(faceIdAws);
                throw;
            }

            var duLieuKhuonMat = new FaceDatum
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                FaceIdAws = faceIdAws,
                ProfileImage = urlAnhDaiDien,
                CreatedBy = performedBy,
                CreatedAt = thoiDiemHienTai
            };
            _context.FaceData.Add(duLieuKhuonMat);

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                OldFaceIdAws = null,
                NewFaceIdAws = faceIdAws,
                NewProfileImage = urlAnhDaiDien,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = thoiDiemHienTai
            });

            if (employeeId.HasValue)
            {
                AddEmployeeUpdateLogs(
                    maPhienCapNhat,
                    employeeId.Value,
                    performedBy,
                    thoiDiemHienTai,
                    oldFaceIdAws: null,
                    newFaceIdAws: faceIdAws,
                    oldProfileImage: null,
                    newProfileImage: urlAnhDaiDien);
            }

            return duLieuKhuonMat;
        }


        /// <summary>
        /// Đăng ký lại / cập nhật FaceID cho member/employee đã có sẵn (hoặc tạo mới nếu chưa có).
        /// Thứ tự cố ý giống RegisterFirstFaceAsync: đăng ký khuôn mặt MỚI trên AWS trước,
        /// upload ảnh MỚI lên S3 sau. Ảnh cũ / face cũ hoàn toàn chưa bị đụng tới cho đến khi
        /// DB lưu thành công ở cuối hàm — nên nếu có lỗi ở giữa chừng, dữ liệu cũ vẫn nguyên vẹn.
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

            var duLieuKhuonMat = await _context.FaceData
                .FirstOrDefaultAsync(f => f.MemberId == memberId && f.EmployeeId == employeeId);

            var thoiDiemHienTai = DateTime.UtcNow;
            var maPhienCapNhat = Guid.NewGuid();
            var faceIdCu = duLieuKhuonMat?.FaceIdAws;
            var urlAnhCu = duLieuKhuonMat?.ProfileImage;

            // Bước 1: đăng ký khuôn mặt MỚI lên AWS trước. Chưa đụng gì tới ảnh cũ / face cũ.
            var faceIdMoi = memberId.HasValue
                ? await _faceService.RegisterMemberFaceAsync(profileImage, memberId.Value)
                : await _faceService.RegisterEmployeeFaceAsync(profileImage, employeeId!.Value);

            // Bước 2: AWS đăng ký xong mới upload ảnh MỚI lên S3.
            // Nếu upload lỗi thì xóa face mới vừa đăng ký ở bước 1; face cũ/ảnh cũ giữ nguyên.
            string urlAnhMoi;
            try
            {
                urlAnhMoi = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
            }
            catch
            {
                await _faceService.DeleteFaceAsync(faceIdMoi);
                throw;
            }

            if (duLieuKhuonMat == null)
            {
                duLieuKhuonMat = new FaceDatum
                {
                    MemberId = memberId,
                    EmployeeId = employeeId,
                    FaceIdAws = faceIdMoi,
                    ProfileImage = urlAnhMoi,
                    CreatedBy = performedBy,
                    CreatedAt = thoiDiemHienTai
                };
                _context.FaceData.Add(duLieuKhuonMat);
            }
            else
            {
                duLieuKhuonMat.FaceIdAws = faceIdMoi;
                duLieuKhuonMat.ProfileImage = urlAnhMoi;
            }

            _context.FaceUpdateHistories.Add(new FaceUpdateHistory
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                OldFaceIdAws = faceIdCu,
                NewFaceIdAws = faceIdMoi,
                OldProfileImage = urlAnhCu,
                NewProfileImage = urlAnhMoi,
                Reason = reason,
                PerformedBy = performedBy,
                PerformedAt = thoiDiemHienTai
            });

            if (employeeId.HasValue)
            {
                AddEmployeeUpdateLogs(
                    maPhienCapNhat,
                    employeeId.Value,
                    performedBy,
                    thoiDiemHienTai,
                    oldFaceIdAws: faceIdCu,
                    newFaceIdAws: faceIdMoi,
                    oldProfileImage: urlAnhCu,
                    newProfileImage: urlAnhMoi);
            }

            await _context.SaveChangesAsync();

            // Chỉ xóa face cũ trên AWS sau khi DB đã lưu thành công, tránh mất dữ liệu nếu lỗi giữa chừng
            if (!string.IsNullOrEmpty(faceIdCu))
                await _faceService.DeleteFaceAsync(faceIdCu);

            return duLieuKhuonMat;
        }


        /// <summary>
        /// Dọn dẹp khi FaceID đã đăng ký thành công (đã có face trên AWS + đã upload ảnh lên S3)
        /// nhưng transaction DB ở caller (vd: EmployeeService.CreateWithFaceIdAsync) bị lỗi phải
        /// rollback. Transaction DB chỉ hoàn tác được phần ghi SQL, không tự xóa được face trên
        /// AWS hay ảnh trên S3 — nên phải tự gọi hàm này để xóa, tránh rác dữ liệu mồ côi.
        /// Không throw lỗi ra ngoài vì hàm này chạy trong catch của caller — nếu ném lỗi tiếp
        /// sẽ che mất lỗi gốc gây ra rollback.
        /// </summary>
        public async Task XoaFaceIdDaDangKyAsync(string? faceIdAws, string? urlAnhDaiDien)
        {
            try
            {
                if (!string.IsNullOrEmpty(faceIdAws))
                {
                    await _faceService.DeleteFaceAsync(faceIdAws);
                }

                if (!string.IsNullOrEmpty(urlAnhDaiDien))
                {
                    await _storageService.DeleteFileAsync(urlAnhDaiDien);
                }
            }
            catch
            {
                // TODO: thay bằng ILogger để ghi log lại nếu xóa rollback thất bại
            }
        }


        /// Lấy lịch sử thay đổi FaceID của 1 member HOẶC 1 employee, đã map sẵn sang response chung.
        /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.

        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long? memberId, long? employeeId)
        {
            ValidateOwner(memberId, employeeId);

            var dsLichSuThayDoi = await _context.FaceUpdateHistories
                .Where(f => f.MemberId == memberId && f.EmployeeId == employeeId)
                .Include(f => f.PerformedByNavigation)
                .OrderByDescending(f => f.PerformedAt)
                .ToListAsync();

            return dsLichSuThayDoi.Select(f => new MemberUpdateSessionResponse
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


        private static void ValidateOwner(long? memberId, long? employeeId)
        {
            var coMember = memberId.HasValue;
            var coEmployee = employeeId.HasValue;

            if (coMember == coEmployee)
                throw new ArgumentException("Phải cung cấp đúng một trong hai: memberId hoặc employeeId.");
        }

        /// Ghi log thay đổi FaceID/ProfileImage của nhân viên vào EmployeeUpdateLog (mỗi field 1 dòng, chung 1 session).

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