using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BE.Services.Storage;

public class S3StorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly TransferUtility _transferUtility;
    private readonly string _bucketName;

    public S3StorageService(IAmazonS3 s3Client, IConfiguration configuration)
    {
        _s3Client = s3Client;
        _transferUtility = new TransferUtility(_s3Client);
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

        await _transferUtility.UploadAsync(uploadRequest);

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

        await _transferUtility.UploadAsync(uploadRequest);

        return $"https://{_bucketName}.s3.amazonaws.com/{key}";
    }

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

    /// <summary>Xóa nhiều file cùng lúc khỏi S3 — dùng khi Update bài viết có ảnh bị gỡ bỏ.</summary>
    public async Task DeleteFilesAsync(IEnumerable<string> fileUrls)
    {
        foreach (var url in fileUrls)
            await DeleteFileAsync(url);
    }

    /// <summary>
    /// Rollback ảnh đã upload lên S3 khi DB transaction fail (VD: SaveChanges lỗi sau khi đã upload ảnh).
    /// Dùng batch delete (tối đa 1000 key/lần) để xóa nhanh, không throw ra ngoài — chỉ trả về danh sách
    /// URL nào xóa thất bại (nếu cần log/retry sau), tránh làm gãy luồng rollback đang chạy trong catch.
    /// </summary>
    public async Task<List<string>> RollbackUploadedFilesAsync(IEnumerable<string> uploadedFileUrls)
    {
        var failedUrls = new List<string>();
        var urlList = uploadedFileUrls?.Where(u => !string.IsNullOrWhiteSpace(u)).ToList()
            ?? new List<string>();

        if (urlList.Count == 0) return failedUrls;

        // map key -> url để biết url nào lỗi, và bỏ qua url không thuộc bucket này
        var keyToUrl = new Dictionary<string, string>();
        foreach (var url in urlList)
        {
            var key = ExtractS3Key(url);
            if (!string.IsNullOrEmpty(key))
                keyToUrl[key] = url;
        }

        if (keyToUrl.Count == 0) return failedUrls;

        // S3 DeleteObjects giới hạn 1000 key/request -> chia batch
        const int batchSize = 1000;
        foreach (var batch in keyToUrl.Keys.Chunk(batchSize))
        {
            try
            {
                var response = await _s3Client.DeleteObjectsAsync(new DeleteObjectsRequest
                {
                    BucketName = _bucketName,
                    Objects = batch.Select(k => new KeyVersion { Key = k }).ToList(),
                    Quiet = false
                });

                if (response.DeleteErrors?.Count > 0)
                {
                    foreach (var err in response.DeleteErrors)
                    {
                        // TODO: log err.Key / err.Code / err.Message qua ILogger
                        if (keyToUrl.TryGetValue(err.Key, out var failedUrl))
                            failedUrls.Add(failedUrl);
                    }
                }
            }
            catch
            {
                // TODO: thay bằng ILogger để ghi log lỗi rollback lại nếu cần
                failedUrls.AddRange(batch.Select(k => keyToUrl[k]));
            }
        }

        return failedUrls;
    }

    private string? ExtractS3Key(string imageUrl)
    {
        var prefix = $"https://{_bucketName}.s3.amazonaws.com/";
        if (!imageUrl.StartsWith(prefix)) return null;
        return imageUrl[prefix.Length..];
    }
}