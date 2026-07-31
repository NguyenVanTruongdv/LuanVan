using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.FaceRecognition
{
    
    public enum FaceOwnerType
    {
        Member,
        Employee
    }

    public enum FaceSearchStatus
    {
        NoFace,         // Ảnh không có khuôn mặt rõ (AWS ném InvalidParameterException)
        NotRecognized,  // Có mặt nhưng không khớp ai trong collection
        Found           // Khớp được 1 người (hội viên hoặc nhân viên)
    }

    public class FaceSearchResult
    {
        public FaceSearchStatus Status { get; set; }
        public FaceOwnerType? OwnerType { get; set; }
        public long? MemberId { get; set; }
        public long? EmployeeId { get; set; }
        public float Similarity { get; set; }

       
        public string? MatchedFaceId { get; set; }
    }

    public class RekognitionFaceService
    {
        private const string MemberPrefix = "member-";
        private const string EmployeePrefix = "employee-";

        private readonly IAmazonRekognition _rekognitionClient;
        private readonly string _collectionId;

        // Ngưỡng % giống nhau tối thiểu để chấp nhận là cùng 1 người.
        private const float FaceMatchThreshold = 90f;

        // Số kết quả tối đa lấy về mỗi lần search. Cần > 1 vì 1 người có thể
        // khớp cả bản ghi Member lẫn Employee.
        private const int MaxFacesPerSearch = 10;

        // Biên độ an toàn (%) khi ưu tiên Employee trong SearchFaceByImageAsync.
        // Chỉ ưu tiên Employee nếu similarity của nó gần bằng similarity cao
        // nhất (nhiều khả năng là cùng 1 khuôn mặt được index 2 lần). Nếu ưu
        // tiên Employee một cách tuyệt đối thì dễ nhận nhầm sang 1 nhân viên
        // khác có gương mặt hao hao nhưng similarity thấp hơn hẳn.
        private const float EmployeePriorityMargin = 3f;

        public RekognitionFaceService(IAmazonRekognition rekognitionClient, IConfiguration configuration)
        {
            _rekognitionClient = rekognitionClient;
            _collectionId = configuration["Aws:RekognitionCollectionId"]
                ?? throw new InvalidOperationException("Thiếu cấu hình Aws:RekognitionCollectionId");
        }

  

        // Đăng ký/cập nhật khuôn mặt cho hội viên. Trả về FaceId do AWS cấp.
        public Task<string> RegisterMemberFaceAsync(IFormFile image, long memberId)
            => RegisterFaceInternalAsync(image, BuildMemberExternalImageId(memberId));

        // Đăng ký/cập nhật khuôn mặt cho nhân viên. Trả về FaceId do AWS cấp.
        public Task<string> RegisterEmployeeFaceAsync(IFormFile image, long employeeId)
            => RegisterFaceInternalAsync(image, BuildEmployeeExternalImageId(employeeId));

        // Giữ overload tổng quát này cho các nơi đang tự build sẵn externalImageId,
        // để không phải sửa lại code cũ.
        public Task<string> RegisterFaceAsync(IFormFile image, string externalImageId)
            => RegisterFaceInternalAsync(image, externalImageId);

        private async Task<string> RegisterFaceInternalAsync(IFormFile image, string externalImageId)
        {
            using var luongDoc = image.OpenReadStream();
            using var anhStream = new MemoryStream();
            await luongDoc.CopyToAsync(anhStream);
            anhStream.Position = 0;

            var yeuCau = new IndexFacesRequest
            {
                CollectionId = _collectionId,
                Image = new Amazon.Rekognition.Model.Image { Bytes = anhStream },
                ExternalImageId = externalImageId,
                MaxFaces = 1,
                QualityFilter = QualityFilter.AUTO,
                DetectionAttributes = new List<string> { "DEFAULT" }
            };

            IndexFacesResponse ketQua;
            try
            {
                ketQua = await _rekognitionClient.IndexFacesAsync(yeuCau);
            }
            catch (InvalidParameterException)
            {
                // AWS ném lỗi này khi ảnh không có khuôn mặt hợp lệ (mờ, quá tối, không có mặt...)
                throw new ArgumentException("Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại.");
            }

            if (ketQua.FaceRecords.Count == 0)
                throw new ArgumentException("Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp lại ảnh rõ nét hơn.");

            return ketQua.FaceRecords[0].Face.FaceId;
        }

     
        // NHẬN DIỆN - CHECK-IN (ưu tiên Employee), chỉ dùng cho luồng check-in
        // tự động qua camera.
   
        public async Task<FaceSearchResult> SearchFaceByImageAsync(byte[] imageBytes)
        {
            var dsKhop = await SearchAndParseMatchesAsync(imageBytes);

            if (dsKhop.Count == 1 &&
                (dsKhop[0].Status == FaceSearchStatus.NoFace || dsKhop[0].Status == FaceSearchStatus.NotRecognized))
            {
                return dsKhop[0];
            }

            float diemCaoNhat = dsKhop[0].Similarity;

            // Chỉ coi là "ứng viên cùng 1 khuôn mặt" nếu similarity gần bằng top
            // match. Similarity thấp hơn hẳn nhiều khả năng là 1 người khác
            // tình cờ khớp qua ngưỡng, không nên ưu tiên nhầm.
            var khopGanNhat = dsKhop
                .Where(kh => diemCaoNhat - kh.Similarity <= EmployeePriorityMargin)
                .ToList();

            // Trong nhóm "gần top match" đó, nếu có Employee thì chọn Employee
            // có similarity cao nhất trong nhóm.
            var nvKhopTot = khopGanNhat
                .Where(kh => kh.OwnerType == FaceOwnerType.Employee)
                .OrderByDescending(kh => kh.Similarity)
                .FirstOrDefault();

            if (nvKhopTot != null)
                return nvKhopTot;

            // Không có Employee nào đủ gần top match -> trả về match cao nhất.
            return dsKhop.First();
        }

   
        // NHẬN DIỆN - CHECK TRÙNG KHI ĐĂNG KÝ (không ưu tiên ai), dùng bởi
        // FaceIdService.CheckFaceInternalAsync để tự lọc đúng scope Member/Employee
  

        // Trả về toàn bộ match hợp lệ đã parse Member/Employee, sắp giảm dần
        // theo similarity, không ưu tiên loại nào.
        //  Nếu ảnh không có mặt hoặc
        // không khớp ai, trả về list chỉ chứa 1 phần tử NoFace
        // Caller tự lọc theo scope (Member/Employee) mình đang cần kiểm tra.
        public async Task<List<FaceSearchResult>> SearchAllFaceMatchesAsync(byte[] imageBytes)
            => await SearchAndParseMatchesAsync(imageBytes);

        private async Task<List<FaceSearchResult>> SearchAndParseMatchesAsync(byte[] imageBytes)
        {
            using var anhStream = new MemoryStream(imageBytes);

            SearchFacesByImageResponse ketQua;
            try
            {
                ketQua = await _rekognitionClient.SearchFacesByImageAsync(new SearchFacesByImageRequest
                {
                    CollectionId = _collectionId,
                    Image = new Amazon.Rekognition.Model.Image { Bytes = anhStream },
                    MaxFaces = MaxFacesPerSearch,
                    FaceMatchThreshold = FaceMatchThreshold
                });
            }
            catch (InvalidParameterException)
            {
                // Ảnh không có khuôn mặt đủ rõ để xử lý
                return new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NoFace } };
            }

            if (ketQua.FaceMatches == null || ketQua.FaceMatches.Count == 0)
                return new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NotRecognized } };

       
            var dsMatch = ketQua.FaceMatches
                .OrderByDescending(kh => kh.Similarity)
                .Select(kh => ParseExternalImageId(kh.Face.ExternalImageId, kh.Similarity ?? 0, kh.Face.FaceId))
                .Where(kq => kq.Status == FaceSearchStatus.Found)
                .ToList();

            return dsMatch.Count == 0
                ? new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NotRecognized } }
                : dsMatch;
        }

        private static FaceSearchResult ParseExternalImageId(string? externalImageId, float similarity, string? faceId)
        {
            if (string.IsNullOrEmpty(externalImageId))
                return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };

            if (externalImageId.StartsWith(MemberPrefix, StringComparison.Ordinal) &&
                long.TryParse(externalImageId.AsSpan(MemberPrefix.Length), out var memberId))
            {
                return new FaceSearchResult
                {
                    Status = FaceSearchStatus.Found,
                    OwnerType = FaceOwnerType.Member,
                    MemberId = memberId,
                    Similarity = similarity,
                    MatchedFaceId = faceId
                };
            }

            if (externalImageId.StartsWith(EmployeePrefix, StringComparison.Ordinal) &&
                long.TryParse(externalImageId.AsSpan(EmployeePrefix.Length), out var employeeId))
            {
                return new FaceSearchResult
                {
                    Status = FaceSearchStatus.Found,
                    OwnerType = FaceOwnerType.Employee,
                    EmployeeId = employeeId,
                    Similarity = similarity,
                    MatchedFaceId = faceId
                };
            }

            // Tiền tố lạ, không thuộc quy ước nào -> coi như không nhận diện được
            return new FaceSearchResult { Status = FaceSearchStatus.NotRecognized };
        }
        // XOÁ FACEID (khi cập nhật ảnh mới, xoá face cũ khỏi collection)
 
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
            catch (Exception ex)
            {
                // TODO: thay Console bằng ILogger<RekognitionFaceService> khi có sẵn DI logger.
                // Không throw ở đây vì DB đã lưu FaceId mới thành công - xoá face cũ thất bại
                // không nên làm hỏng cả request, nhưng phải log lại để dọn rác thủ công.
                Console.WriteLine($"[RekognitionFaceService] Xoá face cũ thất bại. FaceId={faceId}. Lỗi: {ex.Message}");
            }
        }

        // =====================================================================
        // Helper build ExternalImageId - public để nơi khác tái sử dụng, tránh
        // tự build sai quy ước.
        // =====================================================================
        public static string BuildMemberExternalImageId(long memberId) => $"{MemberPrefix}{memberId}";
        public static string BuildEmployeeExternalImageId(long employeeId) => $"{EmployeePrefix}{employeeId}";
    }
}