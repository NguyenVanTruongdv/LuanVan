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
    //   Các hàm search dựa vào đúng quy ước prefix này để phân biệt nhận diện ra
    //   là hội viên hay nhân viên, và parse ngược ra Id tương ứng.
    // - Dùng CHUNG 1 Collection cho cả member và employee (đơn giản hoá hạ tầng),
    //   phân biệt loại hoàn toàn dựa vào prefix của ExternalImageId.
    // - Cần tạo trước 1 "Collection" trên Rekognition (1 lần, ví dụ qua AWS CLI:
    //   aws rekognition create-collection --collection-id gym-faces)
    //   rồi cấu hình CollectionId trong appsettings.json (Aws:RekognitionCollectionId).
    // - Cần cài package: dotnet add package AWSSDK.Rekognition
    //
    // GHI CHÚ ƯU TIÊN NHÂN VIÊN (quan trọng, CHỈ áp dụng cho SearchFaceByImageAsync
    // — luồng check-in tự động qua camera):
    // - Một người có thể vừa là NHÂN VIÊN vừa là HỘI VIÊN, nên cùng 1 khuôn mặt
    //   có thể được index ở CẢ 2 dạng: "member-{id}" và "employee-{id}".
    // - Khi nhận diện CHECK-IN, nếu khuôn mặt khớp với CẢ 2 bản ghi, LUÔN ưu tiên
    //   coi người đó là NHÂN VIÊN (chỉ cần Employee đang Active là cho vào phòng,
    //   không quan tâm trạng thái gói tập/hội viên).
    //
    // LƯU Ý (fix bug 2024): việc "ưu tiên Employee" ở trên KHÔNG được dùng cho
    // luồng CHECK TRÙNG khi đăng ký (FaceIdService.CheckFaceInternalAsync). Nếu
    // dùng chung, một khuôn mặt được index cả 2 dạng sẽ luôn bị trả về là Employee,
    // khiến việc check trùng ở scope Member bị bỏ sót (coi "khác scope" là hợp lệ)
    // dù thực ra có 1 Member khớp nằm ngay trong danh sách nhưng bị che mất. Vì vậy
    // luồng check trùng đăng ký PHẢI dùng SearchAllFaceMatchesAsync (trả về TOÀN
    // BỘ match, không tự ưu tiên ai) để tự lọc đúng theo scope cần kiểm tra.

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

        // Số lượng kết quả khớp tối đa lấy về từ AWS mỗi lần search. Cần > 1 vì
        // 1 người có thể khớp cả bản ghi Member lẫn Employee, ta cần thấy đủ để
        // ưu tiên chọn Employee (ở luồng check-in) hoặc xét đúng scope (ở luồng
        // check trùng đăng ký).
        private const int MaxFacesPerSearch = 10;

        // Biên độ an toàn (%) khi xét ưu tiên Employee TRONG SearchFaceByImageAsync.
        // CHỈ ưu tiên Employee nếu similarity của nó gần bằng similarity cao nhất
        // trong danh sách match (nhiều khả năng là CÙNG 1 khuôn mặt được index 2
        // lần: member + employee). Nếu để ưu tiên Employee một cách tuyệt đối (bất
        // kỳ Employee nào >= threshold là chọn), sẽ có rủi ro nhận NHẦM sang 1 nhân
        // viên khác có gương mặt tương đồng nhưng similarity thấp hơn hẳn top match.
        private const float EmployeePriorityMargin = 3f;

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
        // NHẬN DIỆN — CHECK-IN (ưu tiên Employee) — giữ nguyên hành vi cũ, chỉ
        // dùng cho luồng check-in tự động qua camera.
        // =====================================================================

        /// <summary>
        /// Dùng cho check-in/check-out tự động qua camera: gửi ảnh khung hình vừa
        /// chụp lên Rekognition, tìm khuôn mặt khớp trong collection.
        /// KHÔNG index ảnh này vào collection (chỉ SearchFacesByImage, không IndexFaces).
        ///
        /// ƯU TIÊN NHÂN VIÊN: một người có thể được index cả 2 dạng (member-{id}
        /// và employee-{id}) nếu vừa là nhân viên vừa là hội viên. Vì vậy hàm này
        /// lấy nhiều kết quả khớp (không chỉ 1). Trong số các match có similarity
        /// GẦN BẰNG match cao nhất (chênh lệch <= EmployeePriorityMargin — tức
        /// nhiều khả năng là cùng 1 khuôn mặt), nếu có Employee thì ưu tiên chọn
        /// Employee. Match có similarity thấp hơn hẳn (khác biệt lớn) sẽ KHÔNG
        /// được ưu tiên dù là Employee, để tránh nhận nhầm sang người khác.
        ///
        /// CHỈ dùng cho check-in. KHÔNG dùng hàm này cho luồng check trùng khi
        /// đăng ký (dùng SearchAllFaceMatchesAsync bên dưới thay thế).
        /// </summary>
        public async Task<FaceSearchResult> SearchFaceByImageAsync(byte[] imageBytes)
        {
            var parsedMatches = await SearchAndParseMatchesAsync(imageBytes);

            if (parsedMatches.Count == 1 &&
                (parsedMatches[0].Status == FaceSearchStatus.NoFace || parsedMatches[0].Status == FaceSearchStatus.NotRecognized))
            {
                return parsedMatches[0];
            }

            float topSimilarity = parsedMatches[0].Similarity;

            // Chỉ coi là "ứng viên cùng 1 khuôn mặt" nếu similarity gần bằng top
            // match (trong khoảng EmployeePriorityMargin). Match có similarity
            // thấp hơn hẳn nhiều khả năng là 1 người KHÁC tình cờ khớp qua
            // threshold, không nên ưu tiên nhầm.
            List<FaceSearchResult> closeMatches = parsedMatches
                .Where(r => topSimilarity - r.Similarity <= EmployeePriorityMargin)
                .ToList();

            // ƯU TIÊN NHÂN VIÊN: trong nhóm "gần top match" đó, nếu có Employee
            // thì chọn Employee có similarity cao nhất trong nhóm.
            FaceSearchResult? bestEmployeeMatch = closeMatches
                .Where(r => r.OwnerType == FaceOwnerType.Employee)
                .OrderByDescending(r => r.Similarity)
                .FirstOrDefault();

            if (bestEmployeeMatch != null)
            {
                return bestEmployeeMatch;
            }

            // Không có Employee nào đủ gần top match -> trả về match khớp cao
            // nhất tuyệt đối (giữ hành vi cũ, an toàn cho trường hợp bình thường).
            return parsedMatches.First();
        }

        // =====================================================================
        // NHẬN DIỆN — CHECK TRÙNG KHI ĐĂNG KÝ (KHÔNG ưu tiên ai) — dùng bởi
        // FaceIdService.CheckFaceInternalAsync để tự lọc đúng scope Member/Employee
        // đang cần kiểm tra, tránh bug bị logic ưu tiên Employee che mất kết quả
        // Member (hoặc ngược lại).
        // =====================================================================

        /// <summary>
        /// Trả về TOÀN BỘ match hợp lệ đã parse Member/Employee, sắp giảm dần theo
        /// similarity, KHÔNG tự ưu tiên loại nào. Nếu ảnh không có mặt hoặc không
        /// khớp ai, trả về list chỉ chứa 1 phần tử tương ứng (NoFace/NotRecognized).
        /// Caller (FaceIdService) tự lọc theo đúng scope (Member/Employee) mình
        /// đang cần kiểm tra trùng.
        /// </summary>
        public async Task<List<FaceSearchResult>> SearchAllFaceMatchesAsync(byte[] imageBytes)
            => await SearchAndParseMatchesAsync(imageBytes);

        private async Task<List<FaceSearchResult>> SearchAndParseMatchesAsync(byte[] imageBytes)
        {
            using var memoryStream = new MemoryStream(imageBytes);

            SearchFacesByImageResponse response;
            try
            {
                response = await _rekognitionClient.SearchFacesByImageAsync(new SearchFacesByImageRequest
                {
                    CollectionId = _collectionId,
                    Image = new Amazon.Rekognition.Model.Image { Bytes = memoryStream },
                    MaxFaces = MaxFacesPerSearch,
                    FaceMatchThreshold = FaceMatchThreshold
                });
            }
            catch (InvalidParameterException)
            {
                // Ảnh không có khuôn mặt đủ rõ để xử lý
                return new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NoFace } };
            }

            if (response.FaceMatches == null || response.FaceMatches.Count == 0)
                return new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NotRecognized } };

            // Parse toàn bộ các match hợp lệ (đúng prefix), sắp theo similarity giảm dần
            List<FaceSearchResult> parsedMatches = response.FaceMatches
                .OrderByDescending(m => m.Similarity)
                .Select(m => ParseExternalImageId(m.Face.ExternalImageId, m.Similarity ?? 0))
                .Where(r => r.Status == FaceSearchStatus.Found)
                .ToList();

            return parsedMatches.Count == 0
                ? new List<FaceSearchResult> { new FaceSearchResult { Status = FaceSearchStatus.NotRecognized } }
                : parsedMatches;
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
            catch (Exception ex)
            {
                // TODO: thay Console bằng ILogger<RekognitionFaceService> khi có sẵn DI logger.
                // Không throw ở đây vì DB đã lưu FaceId mới thành công — xoá face cũ thất bại
                // không nên làm hỏng cả request, nhưng BẮT BUỘC phải biết để dọn rác thủ công.
                Console.WriteLine($"[RekognitionFaceService] Xoá face cũ thất bại. FaceId={faceId}. Lỗi: {ex.Message}");
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