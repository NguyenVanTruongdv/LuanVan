using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.FaceRecognition
{
    // GHI CHÚ QUAN TRỌNG:
    // - FaceIdAws KHÔNG BAO GIỜ nhận từ FE. Đây là giá trị do AWS Rekognition trả về
    //   sau khi BE gửi ảnh khuôn mặt lên (IndexFaces). Client chỉ gửi ẢNH, không gửi FaceId.
    // - ExternalImageId khi đăng ký (IndexFaces) luôn có 1 trong 2 dạng:
    //     "member-{memberId}"    -> dùng cho HỘI VIÊN
    //     "employee-{employeeId}" -> dùng cho NHÂN VIÊN
    //   SearchFaceByImageAsync dựa vào đúng quy ước prefix này để phân biệt
    //   nhận diện ra là hội viên hay nhân viên, và parse ngược ra Id tương ứng.
    // - Dùng CHUNG 1 Collection cho cả member và employee (đơn giản hoá hạ tầng),
    //   phân biệt loại hoàn toàn dựa vào prefix của ExternalImageId.
    // - Cần tạo trước 1 "Collection" trên Rekognition (1 lần, ví dụ qua AWS CLI:
    //   aws rekognition create-collection --collection-id gym-faces)
    //   rồi cấu hình CollectionId trong appsettings.json (Aws:RekognitionCollectionId).
    // - Cần cài package: dotnet add package AWSSDK.Rekognition

    public enum FaceOwnerType
    {
        Member,
        Employee
    }

    public enum FaceSearchStatus
    {
        NoFace,         // Ảnh không chứa khuôn mặt rõ ràng (InvalidParameterException từ AWS)
        NotRecognized,  // Có khuôn mặt nhưng không khớp ai trong collection
        Found           // Khớp được với 1 người (hội viên hoặc nhân viên)
    }

    public class FaceSearchResult
    {
        public FaceSearchStatus Status { get; set; }
        public FaceOwnerType? OwnerType { get; set; }
        public long? MemberId { get; set; }
        public long? EmployeeId { get; set; }
        public float Similarity { get; set; }
    }

    public class RekognitionFaceService
    {
        private const string MemberExternalImageIdPrefix = "member-";
        private const string EmployeeExternalImageIdPrefix = "employee-";

        private readonly IAmazonRekognition _rekognitionClient;
        private readonly string _collectionId;

        // Ngưỡng độ khớp tối thiểu để chấp nhận là "cùng 1 người". Có thể đưa ra
        // appsettings.json (Aws:RekognitionFaceMatchThreshold) nếu muốn chỉnh động.
        private const float FaceMatchThreshold = 90f;

        public RekognitionFaceService(IAmazonRekognition rekognitionClient, IConfiguration configuration)
        {
            _rekognitionClient = rekognitionClient;
            _collectionId = configuration["Aws:RekognitionCollectionId"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Aws:RekognitionCollectionId");
        }

        // =====================================================================
        // ĐĂNG KÝ FACEID — tách riêng cho Member và Employee để rõ ràng luồng,
        // nhưng bên trong đều dùng chung IndexFaces (chỉ khác ExternalImageId).
        // =====================================================================

        /// <summary>Đăng ký/cập nhật khuôn mặt cho HỘI VIÊN. Trả về FaceId do AWS cấp.</summary>
        public Task<string> RegisterMemberFaceAsync(IFormFile image, long memberId)
            => RegisterFaceInternalAsync(image, BuildMemberExternalImageId(memberId));

        /// <summary>Đăng ký/cập nhật khuôn mặt cho NHÂN VIÊN. Trả về FaceId do AWS cấp.</summary>
        public Task<string> RegisterEmployeeFaceAsync(IFormFile image, long employeeId)
            => RegisterFaceInternalAsync(image, BuildEmployeeExternalImageId(employeeId));

        /// <summary>
        /// Giữ lại overload tổng quát (dùng bởi FaceIdService khi build sẵn externalImageId)
        /// để không phải sửa các nơi đang gọi theo kiểu cũ.
        /// </summary>
        public Task<string> RegisterFaceAsync(IFormFile image, string externalImageId)
            => RegisterFaceInternalAsync(image, externalImageId);

        private async Task<string> RegisterFaceInternalAsync(IFormFile image, string externalImageId)
        {
            using var uploadStream = image.OpenReadStream();
            using var memoryStream = new MemoryStream();
            await uploadStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            var request = new IndexFacesRequest
            {
                CollectionId = _collectionId,
                Image = new Amazon.Rekognition.Model.Image { Bytes = memoryStream },
                ExternalImageId = externalImageId,
                MaxFaces = 1,
                QualityFilter = QualityFilter.AUTO,
                DetectionAttributes = new List<string> { "DEFAULT" }
            };

            IndexFacesResponse response;
            try
            {
                response = await _rekognitionClient.IndexFacesAsync(request);
            }
            catch (InvalidParameterException)
            {
                // AWS ném lỗi này khi ảnh không có khuôn mặt hợp lệ (mờ, quá tối, không có mặt...)
                throw new ArgumentException("Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại.");
            }

            if (response.FaceRecords.Count == 0)
                throw new ArgumentException("Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp lại ảnh rõ nét hơn.");

            return response.FaceRecords[0].Face.FaceId;
        }

        // =====================================================================
        // NHẬN DIỆN — dùng chung 1 hàm search, tự phân loại Member/Employee dựa
        // theo prefix ExternalImageId trả về từ AWS.
        // =====================================================================

        /// <summary>
        /// Dùng cho check-in/check-out tự động qua camera: gửi ảnh khung hình vừa
        /// chụp lên Rekognition, tìm khuôn mặt khớp nhất trong collection.
        /// KHÔNG index ảnh này vào collection (chỉ SearchFacesByImage, không IndexFaces).
        /// Kết quả trả về sẽ tự phân biệt là Member hay Employee.
        /// </summary>
        public async Task<FaceSearchResult> SearchFaceByImageAsync(byte[] imageBytes)
        {
            using var memoryStream = new MemoryStream(imageBytes);

            SearchFacesByImageResponse response;
            try
            {
                response = await _rekognitionClient.SearchFacesByImageAsync(new SearchFacesByImageRequest
                {
                    CollectionId = _collectionId,
                    Image = new Amazon.Rekognition.Model.Image { Bytes = memoryStream },
                    MaxFaces = 1,
                    FaceMatchThreshold = FaceMatchThreshold
                });
            }
            catch (InvalidParameterException)
            {
                // Ảnh không có khuôn mặt đủ rõ để xử lý
                return new FaceSearchResult { Status = FaceSearchStatus.NoFace };
            }

            if (response.FaceMatches == null || response.FaceMatches.Count == 0)
                return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };

            var best = response.FaceMatches.OrderByDescending(m => m.Similarity).First();
            var externalImageId = best.Face.ExternalImageId;

            return ParseExternalImageId(externalImageId, best.Similarity ?? 0);
        }

        private static FaceSearchResult ParseExternalImageId(string? externalImageId, float similarity)
        {
            if (string.IsNullOrEmpty(externalImageId))
                return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };

            if (externalImageId.StartsWith(MemberExternalImageIdPrefix, StringComparison.Ordinal) &&
                long.TryParse(externalImageId.AsSpan(MemberExternalImageIdPrefix.Length), out var memberId))
            {
                return new FaceSearchResult
                {
                    Status = FaceSearchStatus.Found,
                    OwnerType = FaceOwnerType.Member,
                    MemberId = memberId,
                    Similarity = similarity
                };
            }

            if (externalImageId.StartsWith(EmployeeExternalImageIdPrefix, StringComparison.Ordinal) &&
                long.TryParse(externalImageId.AsSpan(EmployeeExternalImageIdPrefix.Length), out var employeeId))
            {
                return new FaceSearchResult
                {
                    Status = FaceSearchStatus.Found,
                    OwnerType = FaceOwnerType.Employee,
                    EmployeeId = employeeId,
                    Similarity = similarity
                };
            }

            // Prefix lạ, không thuộc quy ước nào -> coi như không nhận diện được
            return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };
        }

        // =====================================================================
        // XOÁ FACEID (khi cập nhật ảnh mới, xoá face cũ khỏi collection)
        // =====================================================================
        public async Task DeleteFaceAsync(string? faceId)
        {
            if (string.IsNullOrWhiteSpace(faceId))
                return;

            try
            {
                await _rekognitionClient.DeleteFacesAsync(new DeleteFacesRequest
                {
                    CollectionId = _collectionId,
                    FaceIds = new List<string> { faceId }
                });
            }
            catch
            {
                // TODO: thay bằng ILogger để ghi log lỗi này lại nếu cần
            }
        }

        // =====================================================================
        // Helpers build ExternalImageId — public để FaceIdService hoặc nơi khác
        // có thể tái sử dụng nếu cần, tránh lệch quy ước.
        // =====================================================================
        public static string BuildMemberExternalImageId(long memberId) => $"{MemberExternalImageIdPrefix}{memberId}";
        public static string BuildEmployeeExternalImageId(long employeeId) => $"{EmployeeExternalImageIdPrefix}{employeeId}";
    }
}