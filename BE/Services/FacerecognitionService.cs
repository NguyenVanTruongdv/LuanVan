using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.FaceRecognition
{
    // GHI CHÚ QUAN TRỌNG:
    // - FaceIdAws KHÔNG BAO GIỜ nhận từ FE. Đây là giá trị do AWS Rekognition trả về
    //   sau khi BE gửi ảnh khuôn mặt lên (IndexFaces). Client chỉ gửi ẢNH, không gửi FaceId.
    // - Cần tạo trước 1 "Collection" trên Rekognition (1 lần, ví dụ qua AWS CLI:
    //   aws rekognition create-collection --collection-id gym-members-faces)
    //   rồi cấu hình CollectionId trong appsettings.json (Aws:RekognitionCollectionId).
    // - Cần cài package: dotnet add package AWSSDK.Rekognition
    public class RekognitionFaceService
    {
        private readonly IAmazonRekognition _rekognitionClient;
        private readonly string _collectionId;

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