using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.Storage;

public class S3StorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3StorageService(IAmazonS3 s3Client, IConfiguration configuration)
    {
        _s3Client = s3Client;
        // TODO: đổi key config cho đúng với appsettings.json của bạn (hoặc hard-code như code cũ nếu muốn)
        _bucketName = configuration["Aws:BucketName"]
            ?? throw new InvalidOperationException("Thiếu cấu hình Aws:BucketName");
    }

    /// <summary>
    /// Upload 1 file lên S3, trả về URL public để lưu vào DB.
    /// </summary>
    /// <param name="file">File cần upload</param>
    /// <param name="folder">Thư mục/prefix trên bucket, VD: "equipments", "branches"</param>
    public async Task<string> UploadFileAsync(IFormFile file, string folder)
    {
        var key = $"{folder}/{Guid.NewGuid()}_{file.FileName}";

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

    /// <summary>
    /// Xóa 1 file khỏi S3 theo URL đã lưu trong DB.
    /// Nuốt lỗi có chủ đích: xóa ảnh cũ chỉ là dọn dẹp phụ,
    /// không nên làm fail cả request update/delete thiết bị nếu lỡ xóa S3 thất bại.
    /// </summary>
    public async Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            var key = ExtractS3Key(fileUrl);

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
            // TODO: thay bằng ILogger để ghi log lỗi này lại nếu cần
        }
    }

    private string? ExtractS3Key(string imageUrl)
    {
        var prefix = $"https://{_bucketName}.s3.amazonaws.com/";

        if (!imageUrl.StartsWith(prefix))
            return null;

        return imageUrl[prefix.Length..];
    }
}