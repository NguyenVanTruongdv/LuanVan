// using BE.Data;
// using BE.Dtos.Member;
// using BE.Models;
// using BE.Services.FaceRecognition;
// using BE.Services.Storage;
// using Microsoft.EntityFrameworkCore;

// namespace BE.Services
// {
//     /// <summary>
//     /// Service FaceID dùng chung cho cả Member và Employee.
//     ///
//     /// LƯU Ý VỀ MODEL (cần chỉnh trước khi build):
//     /// - Bảng FaceData: đổi cột "MemberId" thành nullable (long?), thêm cột mới
//     ///   "EmployeeId" (long?, FK tới Employees). Chỉ đúng MỘT trong hai cột được set.
//     /// - Bảng FaceUpdateHistory: tương tự, thêm "EmployeeId" (long?, FK tới Employees).
//     ///   Cột "PerformedBy"/"PerformedByNavigation" giữ nguyên — đó là NHÂN VIÊN THỰC HIỆN
//     ///   thao tác (admin/lễ tân), khác với EmployeeId (chủ sở hữu khuôn mặt, nếu record
//     ///   này là của 1 employee). Vì cả hai FK đều trỏ tới bảng Employees, cần cấu hình rõ
//     ///   ràng trong OnModelCreating để EF không tự suy luận nhầm quan hệ:
//     ///
//     ///     modelBuilder.Entity&lt;FaceUpdateHistory&gt;()
//     ///         .HasOne(f =&gt; f.PerformedByNavigation)
//     ///         .WithMany()
//     ///         .HasForeignKey(f =&gt; f.PerformedBy);
//     ///
//     ///     modelBuilder.Entity&lt;FaceUpdateHistory&gt;()
//     ///         .HasOne(f =&gt; f.Employee)
//     ///         .WithMany()
//     ///         .HasForeignKey(f =&gt; f.EmployeeId);
//     ///
//     ///   (Tương tự cho FaceDatum.Employee nếu cần navigation.)
//     /// - Nhớ tạo migration cho các thay đổi trên (và có thể thêm CHECK constraint
//     ///   đảm bảo MemberId/EmployeeId không cùng null hoặc cùng có giá trị).
//     /// </summary>
//     public class FaceIdService
//     {
//         private const string FaceImageFolder = "members/faces";

//         private readonly GymManagementContext _context;
//         private readonly S3StorageService _storageService;
//         private readonly RekognitionFaceService _faceService;

//         public FaceIdService(
//             GymManagementContext context,
//             S3StorageService storageService,
//             RekognitionFaceService faceService)
//         {
//             _context = context;
//             _storageService = storageService;
//             _faceService = faceService;
//         }

//         /// <summary>
//         /// Đăng ký FaceID lần đầu cho member HOẶC employee (chưa có FaceDatum).
//         /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
//         /// Không SaveChanges — caller tự gọi SaveChanges khi gộp chung transaction.
//         /// </summary>
//         public async Task<FaceDatum> RegisterFirstFaceAsync(
//             long? memberId,
//             long? employeeId,
//             IFormFile profileImage,
//             string reason,
//             long performedBy)
//         {
//             ValidateOwner(memberId, employeeId);

//             var now = DateTime.UtcNow;

//             var profileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
//             var faceIdAws = await _faceService.RegisterFaceAsync(profileImage, BuildExternalImageId(memberId, employeeId));

//             var faceData = new FaceDatum
//             {
//                 MemberId = memberId,
//                 EmployeeId = employeeId,
//                 FaceIdAws = faceIdAws,
//                 ProfileImage = profileImageUrl,
//                 CreatedAt = now,
//                 CreatedBy = performedBy
//             };
//             _context.FaceData.Add(faceData);

//             _context.FaceUpdateHistories.Add(new FaceUpdateHistory
//             {
//                 MemberId = memberId,
//                 EmployeeId = employeeId,
//                 OldFaceIdAws = null,
//                 NewFaceIdAws = faceIdAws,
//                 NewProfileImage = profileImageUrl,
//                 Reason = reason,
//                 PerformedBy = performedBy,
//                 PerformedAt = now
//             });

//             return faceData;
//         }

//         /// <summary>
//         /// Cập nhật FaceID cho member HOẶC employee (có thể đã có hoặc chưa có FaceDatum).
//         /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
//         /// Tự SaveChanges, và chỉ xóa face cũ trên AWS SAU KHI DB đã lưu thành công.
//         /// </summary>
//         public async Task<FaceDatum> UpdateFaceAsync(
//             long? memberId,
//             long? employeeId,
//             IFormFile profileImage,
//             string? reason,
//             long performedBy)
//         {
//             ValidateOwner(memberId, employeeId);

//             var faceData = await _context.FaceData
//                 .FirstOrDefaultAsync(f => f.MemberId == memberId && f.EmployeeId == employeeId);

//             var now = DateTime.UtcNow;
//             var oldFaceId = faceData?.FaceIdAws;
//             var oldProfileImageUrl = faceData?.ProfileImage;

//             var newProfileImageUrl = await _storageService.UploadFileAsync(profileImage, FaceImageFolder);
//             var newFaceId = await _faceService.RegisterFaceAsync(profileImage, BuildExternalImageId(memberId, employeeId));

//             if (faceData == null)
//             {
//                 faceData = new FaceDatum
//                 {
//                     MemberId = memberId,
//                     EmployeeId = employeeId,
//                     FaceIdAws = newFaceId,
//                     ProfileImage = newProfileImageUrl,
//                     CreatedAt = now,
//                     CreatedBy = performedBy
//                 };
//                 _context.FaceData.Add(faceData);
//             }
//             else
//             {
//                 faceData.FaceIdAws = newFaceId;
//                 faceData.ProfileImage = newProfileImageUrl;
//             }

//             _context.FaceUpdateHistories.Add(new FaceUpdateHistory
//             {
//                 MemberId = memberId,
//                 EmployeeId = employeeId,
//                 OldFaceIdAws = oldFaceId,
//                 NewFaceIdAws = newFaceId,
//                 OldProfileImage = oldProfileImageUrl,
//                 NewProfileImage = newProfileImageUrl,
//                 Reason = reason,
//                 PerformedBy = performedBy,
//                 PerformedAt = now
//             });

//             await _context.SaveChangesAsync();

//             // Chỉ xóa face cũ trên AWS sau khi DB đã lưu thành công, tránh mất dữ liệu nếu lỗi giữa chừng
//             if (!string.IsNullOrEmpty(oldFaceId))
//                 await _faceService.DeleteFaceAsync(oldFaceId);

//             return faceData;
//         }

//         /// <summary>
//         /// Lấy lịch sử thay đổi FaceID của 1 member HOẶC 1 employee, đã map sẵn sang response chung.
//         /// Truyền đúng MỘT trong hai: memberId hoặc employeeId.
//         /// </summary>
//         public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long? memberId, long? employeeId)
//         {
//             ValidateOwner(memberId, employeeId);

//             var faceLogs = await _context.FaceUpdateHistories
//                 .Where(f => f.MemberId == memberId && f.EmployeeId == employeeId)
//                 .Include(f => f.PerformedByNavigation)
//                 .OrderByDescending(f => f.PerformedAt)
//                 .ToListAsync();

//             return faceLogs.Select(f => new MemberUpdateSessionResponse
//             {
//                 SessionId = $"faceid-{f.HistoryId}",
//                 SessionType = "FACEID",
//                 EmployeeName = f.PerformedByNavigation.FullName,
//                 UpdatedAt = f.PerformedAt,
//                 OldImageUrl = f.OldProfileImage,
//                 NewImageUrl = f.NewProfileImage,
//                 Reason = f.Reason
//             }).ToList();
//         }

//         // ------------------------------------------------------------------
//         // Helpers
//         // ------------------------------------------------------------------

//         private static void ValidateOwner(long? memberId, long? employeeId)
//         {
//             var hasMember = memberId.HasValue;
//             var hasEmployee = employeeId.HasValue;

//             if (hasMember == hasEmployee)
//                 throw new ArgumentException("Phải cung cấp đúng một trong hai: memberId hoặc employeeId.");
//         }

//         private static string BuildExternalImageId(long? memberId, long? employeeId)
//             => memberId.HasValue ? $"member-{memberId}" : $"employee-{employeeId}";
//     }
// }