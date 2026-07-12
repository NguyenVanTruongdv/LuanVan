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
        _bucketName = configuration["Aws:BucketName"]
            ?? throw new InvalidOperationException("Thiếu cấu hình Aws:BucketName");
    }

    /// <summary>Upload 1 file (IFormFile) lên S3 — dùng cho file người dùng tự chọn upload.</summary>
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
    /// Upload dữ liệu bytes lên S3 — dùng cho file sinh ra trong code (VD: PDF hóa đơn tự generate),
    /// không phải file người dùng upload qua form nên không có IFormFile.
    /// </summary>
    public async Task<string> UploadBytesAsync(byte[] data, string fileName, string folder, string contentType)
    {
        var key = $"{folder}/{Guid.NewGuid()}_{fileName}";

        using var uploadStream = new MemoryStream(data);

        var uploadRequest = new TransferUtilityUploadRequest
        {
            InputStream = uploadStream,
            Key = key,
            BucketName = _bucketName,
            ContentType = contentType
        };

        var transferUtility = new TransferUtility(_s3Client);
        await transferUtility.UploadAsync(uploadRequest);

        return $"https://{_bucketName}.s3.amazonaws.com/{key}";
    }

    /// <summary>Xóa 1 file khỏi S3 theo URL đã lưu trong DB. Nuốt lỗi có chủ đích.</summary>
    public async Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            var key = ExtractS3Key(fileUrl);
            if (string.IsNullOrEmpty(key)) return;

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
        if (!imageUrl.StartsWith(prefix)) return null;
        return imageUrl[prefix.Length..];
    }
}