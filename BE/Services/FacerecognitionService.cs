using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.FaceRecognition
{
    // GHI CHÚ QUAN TRỌNG:
    // - FaceIdAws KHÔNG BAO GIỜ nhận từ FE. Đây là giá trị do AWS Rekognition trả về
    //   sau khi BE gửi ảnh khuôn mặt lên (IndexFaces). Client chỉ gửi ẢNH, không gửi FaceId.
    // - ExternalImageId khi đăng ký (IndexFaces) luôn có dạng "member-{memberId}"
    //   (xem FaceIdService.RegisterFirstFaceAsync / UpdateFaceAsync). SearchFaceByImageAsync
    //   dựa vào đúng quy ước này để parse ngược ra memberId.
    // - Cần tạo trước 1 "Collection" trên Rekognition (1 lần, ví dụ qua AWS CLI:
    //   aws rekognition create-collection --collection-id gym-members-faces)
    //   rồi cấu hình CollectionId trong appsettings.json (Aws:RekognitionCollectionId).
    // - Cần cài package: dotnet add package AWSSDK.Rekognition
    public enum FaceSearchStatus
    {
        NoFace,         // Ảnh không chứa khuôn mặt rõ ràng (InvalidParameterException từ AWS)
        NotRecognized,  // Có khuôn mặt nhưng không khớp ai trong collection
        Found           // Khớp được với 1 hội viên
    }

    public class FaceSearchResult
    {
        public FaceSearchStatus Status { get; set; }
        public long? MemberId { get; set; }
        public float Similarity { get; set; }
    }

    public class RekognitionFaceService
    {
        private const string ExternalImageIdPrefix = "member-";

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

        public async Task<string> RegisterFaceAsync(IFormFile image, string externalImageId)
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

        /// <summary>
        /// Dùng cho check-in/check-out tự động qua camera: gửi ảnh khung hình vừa
        /// chụp lên Rekognition, tìm khuôn mặt khớp nhất trong collection.
        /// KHÔNG index ảnh này vào collection (chỉ SearchFacesByImage, không IndexFaces).
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

            // ExternalImageId có dạng "member-{memberId}" — parse đúng quy ước của FaceIdService
            if (string.IsNullOrEmpty(externalImageId) ||
                !externalImageId.StartsWith(ExternalImageIdPrefix, StringComparison.Ordinal) ||
                !long.TryParse(externalImageId.AsSpan(ExternalImageIdPrefix.Length), out var memberId))
            {
                return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };
            }

            return new FaceSearchResult
            {
                Status = FaceSearchStatus.Found,
                MemberId = memberId,
                Similarity = best.Similarity ?? 0
            };
        }

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
    }
}