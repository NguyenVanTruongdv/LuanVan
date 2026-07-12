using BE.Data;
using BE.DTOs.Branches;
using BE.Models;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

/// <summary>
/// Xử lý ảnh chi nhánh: thêm / sửa / xóa, đồng bộ xóa file cũ trên S3.
/// KHÔNG biết gì về thông tin chi nhánh (tên, địa chỉ...) — xem BranchService cho phần đó.
/// </summary>
public class BranchImageService
{
    private readonly GymManagementContext _context;
    private readonly S3StorageService _s3Service;

    private const string DefaultImageType = "Khác";

    public BranchImageService(GymManagementContext context, S3StorageService s3Service)
    {
        _context = context;
        _s3Service = s3Service;
    }

    public async Task<List<BranchImageDto>> GetByBranchIdAsync(int branchId)
    {
        var images = await _context.BranchImages
            .Where(i => i.BranchId == branchId)
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .ToListAsync();

        return images.Select(MapImageToDto).ToList();
    }

    public async Task<List<BranchImageDto>> AddImagesAsync(int branchId, AddBranchImagesDto dto)
    {
        var branchExists = await _context.Branches
            .AnyAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        if (!branchExists)
            throw new KeyNotFoundException($"Không tìm thấy chi nhánh có id = {branchId}");

        var newImages = await UploadAndAttachImagesAsync(branchId, dto.Images, dto.ImageTypes);
        await _context.SaveChangesAsync();

        return newImages.Select(MapImageToDto).ToList();
    }

    public async Task<BranchImageDto?> UpdateImageAsync(int imageId, UpdateBranchImageDto dto)
    {
        var image = await _context.BranchImages.FirstOrDefaultAsync(i => i.ImageId == imageId);
        if (image is null) return null;

        // Nếu có ảnh mới: xóa ảnh cũ trên S3 trước, rồi upload ảnh mới thay thế
        if (dto.Image is not null)
        {
            var oldUrl = image.ImageUrl;
            var newUrl = await _s3Service.UploadFileAsync(dto.Image, $"branches/{image.BranchId}");
            image.ImageUrl = newUrl;

            await _s3Service.DeleteFileAsync(oldUrl);
        }

        if (!string.IsNullOrWhiteSpace(dto.ImageType))
        {
            image.ImageType = dto.ImageType;
        }

        if (dto.SortOrder.HasValue)
        {
            image.SortOrder = dto.SortOrder.Value;
        }

        await _context.SaveChangesAsync();

        return MapImageToDto(image);
    }

    public async Task<bool> DeleteImageAsync(int imageId)
    {
        var image = await _context.BranchImages.FirstOrDefaultAsync(i => i.ImageId == imageId);
        if (image is null) return false;

        await _s3Service.DeleteFileAsync(image.ImageUrl);

        _context.BranchImages.Remove(image);
        await _context.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Upload danh sách file lên S3 và tạo entity BranchImage tương ứng (chưa SaveChanges).
    /// SortOrder được tính tiếp theo giá trị lớn nhất hiện có trong cùng ImageType.
    /// </summary>
    private async Task<List<BranchImage>> UploadAndAttachImagesAsync(
        int branchId, List<IFormFile> images, List<string>? imageTypes)
    {
        var result = new List<BranchImage>();

        // Lấy sort order hiện tại theo từng loại ảnh để nối tiếp thay vì ghi đè
        var currentMaxSortOrders = await _context.BranchImages
            .Where(i => i.BranchId == branchId)
            .GroupBy(i => i.ImageType)
            .Select(g => new { ImageType = g.Key, Max = g.Max(i => i.SortOrder) })
            .ToDictionaryAsync(x => x.ImageType, x => x.Max);

        for (var i = 0; i < images.Count; i++)
        {
            var file = images[i];
            var imageType = imageTypes is not null && i < imageTypes.Count && !string.IsNullOrWhiteSpace(imageTypes[i])
                ? imageTypes[i]
                : DefaultImageType;

            var url = await _s3Service.UploadFileAsync(file, $"branches/{branchId}");

            currentMaxSortOrders.TryGetValue(imageType, out var currentMax);
            var nextOrder = (sbyte)(currentMax + 1);
            currentMaxSortOrders[imageType] = nextOrder;

            var entity = new BranchImage
            {
                BranchId = branchId,
                ImageUrl = url,
                ImageType = imageType,
                SortOrder = nextOrder,
                UploadedAt = DateTime.UtcNow
            };

            _context.BranchImages.Add(entity);
            result.Add(entity);
        }

        return result;
    }

    // internal + static để BranchService dùng chung khi map Branch -> BranchDto (tránh 2 nơi có 2 bản map khác nhau)
    internal static BranchImageDto MapImageToDto(BranchImage i) => new()
    {
        ImageId = i.ImageId,
        BranchId = i.BranchId,
        ImageUrl = i.ImageUrl,
        ImageType = i.ImageType,
        SortOrder = i.SortOrder,
        UploadedAt = i.UploadedAt
    };
}