using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

// ⚠️ LƯU Ý QUAN TRỌNG:
// File này giả định bạn có 1 DbContext tên "AppDbContext" (namespace BE.Data)
// với property: public DbSet<HomeImage> HomeImages { get; set; }
// Nếu DbContext của bạn tên khác (VD: GymDbContext), hãy đổi lại cho đúng.
using BE.Data;

namespace BE.Services
{
    public class HomeImageService 
    {
        private readonly GymManagementContext _context;
        private readonly IConfiguration _config;
        private readonly AmazonS3Client _s3Client;
        private readonly string _bucketName;

        // Prefix (thư mục con trong bucket) để tách riêng ảnh home với các loại ảnh khác
        private const string S3Folder = "home-images";

        public HomeImageService(GymManagementContext context, IConfiguration config)
        {
            _context = context;
            _config = config;

            var credentials = new BasicAWSCredentials(
                _config["AWS:AccessKey"],
                _config["AWS:SecretKey"]
            );

            _bucketName = _config["AWS:BucketName"]!;

            _s3Client = new AmazonS3Client(
                credentials,
                RegionEndpoint.APSoutheast1
            );
        }

        // =========================================
        // GET - Danh sách ảnh Active (trang home, public)
        // =========================================
        public async Task<List<HomeImageResponse>> GetActiveImagesAsync()
        {
            return await _context.HomeImages
                .Where(x => x.Status == "Active")
                .OrderBy(x => x.SortOrder)
                .Select(x => MapToResponse(x))
                .ToListAsync();
        }

        // =========================================
        // GET - Toàn bộ ảnh (trang quản trị)
        // =========================================
        public async Task<List<HomeImageResponse>> GetAllImagesAsync()
        {
            return await _context.HomeImages
                .OrderBy(x => x.SortOrder)
                .Select(x => MapToResponse(x))
                .ToListAsync();
        }

        // =========================================
        // GET BY ID
        // =========================================
        public async Task<HomeImageResponse?> GetByIdAsync(int imageId)
        {
            var entity = await _context.HomeImages
                .FirstOrDefaultAsync(x => x.ImageId == imageId);

            return entity == null ? null : MapToResponse(entity);
        }

        // =========================================
        // CREATE - Upload ảnh lên S3 + lưu DB
        // =========================================
        public async Task<HomeImageResponse> CreateAsync(CreateHomeImageRequest request, long uploadedBy)
        {
            if (request.File == null || request.File.Length == 0)
                throw new ArgumentException("Vui lòng chọn file ảnh.");

            var imageUrl = await UploadToS3Async(request.File);

            var entity = new HomeImage
            {
                ImageUrl = imageUrl,
                Title = request.Title,
            
                SortOrder = request.SortOrder,
                Status = "Active",
                UploadedBy = uploadedBy,
                UploadedAt = DateTime.UtcNow
            };

            _context.HomeImages.Add(entity);
            await _context.SaveChangesAsync();

            return MapToResponse(entity);
        }

        // =========================================
        // UPDATE - Cập nhật thông tin, có thể thay ảnh mới
        // =========================================
        public async Task<HomeImageResponse> UpdateAsync(int imageId, UpdateHomeImageRequest request)
        {
            var entity = await _context.HomeImages
                .FirstOrDefaultAsync(x => x.ImageId == imageId);

            if (entity == null)
                throw new KeyNotFoundException($"Không tìm thấy ảnh với ImageId = {imageId}");

            // Nếu người dùng upload ảnh mới -> xóa ảnh cũ trên S3, upload ảnh mới
            if (request.File != null && request.File.Length > 0)
            {
                var oldImageUrl = entity.ImageUrl;

                var newImageUrl = await UploadToS3Async(request.File);
                entity.ImageUrl = newImageUrl;

                await DeleteFromS3Async(oldImageUrl);
            }

            if (request.Title != null)
                entity.Title = request.Title;

          

            if (request.SortOrder.HasValue)
                entity.SortOrder = request.SortOrder.Value;

            if (!string.IsNullOrWhiteSpace(request.Status))
                entity.Status = request.Status;

            await _context.SaveChangesAsync();

            return MapToResponse(entity);
        }

        // =========================================
        // DELETE - Xóa ảnh trên S3 + xóa DB
        // =========================================
        public async Task DeleteAsync(int imageId)
        {
            var entity = await _context.HomeImages
                .FirstOrDefaultAsync(x => x.ImageId == imageId);

            if (entity == null)
                throw new KeyNotFoundException($"Không tìm thấy ảnh với ImageId = {imageId}");

            await DeleteFromS3Async(entity.ImageUrl);

            _context.HomeImages.Remove(entity);
            await _context.SaveChangesAsync();
        }

        // =========================================
        // HELPERS
        // =========================================

        private async Task<string> UploadToS3Async(IFormFile file)
        {
            var key = $"{S3Folder}/{Guid.NewGuid()}_{file.FileName}";

            using var uploadStream = file.OpenReadStream();

            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = uploadStream,
                Key = key,
                BucketName = _bucketName,
                ContentType = file.ContentType
            };

            var transferUtility = new TransferUtility(_s3Client);
            await transferUtility.UploadAsync(uploadRequest);

            return $"https://{_bucketName}.s3.amazonaws.com/{key}";
        }

        private async Task DeleteFromS3Async(string imageUrl)
        {
            try
            {
                var key = ExtractS3Key(imageUrl);

                if (string.IsNullOrEmpty(key))
                    return;

                await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = key
                });
            }
            catch
            {
                // Không để lỗi xóa S3 làm fail cả request (ảnh trong DB vẫn được xử lý bình thường)
                // Có thể thay bằng ILogger để ghi log lỗi này lại
            }
        }

        private string? ExtractS3Key(string imageUrl)
        {
            var prefix = $"https://{_bucketName}.s3.amazonaws.com/";

            if (!imageUrl.StartsWith(prefix))
                return null;

            return imageUrl[prefix.Length..];
        }

        private static HomeImageResponse MapToResponse(HomeImage x)
        {
            return new HomeImageResponse
            {
                ImageId = x.ImageId,
                ImageUrl = x.ImageUrl,
                Title = x.Title,
           
                SortOrder = x.SortOrder,
                Status = x.Status,
                UploadedBy = x.UploadedBy,
                UploadedAt = x.UploadedAt
            };
        }
    }
}