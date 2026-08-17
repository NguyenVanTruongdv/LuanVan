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

    private const string DEFAULT_IMAGE_TYPE = "Khác";

    public BranchImageService(GymManagementContext context, S3StorageService s3Service)
    {
        _context = context;
        _s3Service = s3Service;
    }

    // Lấy danh sách ảnh của 1 chi nhánh, sắp xếp theo loại ảnh rồi tới thứ tự
    public async Task<List<BranchImageDto>> GetByBranchIdAsync(int branchId)
    {
        List<BranchImage> images = await _context.BranchImages
            .Where(i => i.BranchId == branchId)
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .ToListAsync();

        List<BranchImageDto> result = new List<BranchImageDto>();
        foreach (var image in images)
        {
            result.Add(MapImageToDto(image));
        }

        return result;
    }

    // Thêm nhiều ảnh mới cho 1 chi nhánh
    public async Task<List<BranchImageDto>> AddImagesAsync(int branchId, AddBranchImagesDto dto)
    {
        bool branchExists = await _context.Branches
            .AnyAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        if (!branchExists)
        {
            throw new KeyNotFoundException($"Không tìm thấy chi nhánh có id = {branchId}");
        }

        List<BranchImage> newImages = await UploadAndAttachImagesAsync(branchId, dto.Images, dto.ImageTypes);
        await _context.SaveChangesAsync();

        List<BranchImageDto> result = new List<BranchImageDto>();
        foreach (var image in newImages)
        {
            result.Add(MapImageToDto(image));
        }

        return result;
    }

    // Cập nhật 1 ảnh: có thể đổi ảnh mới, đổi loại ảnh, hoặc đổi thứ tự
    public async Task<BranchImageDto?> UpdateImageAsync(int imageId, UpdateBranchImageDto dto)
    {
        BranchImage? image = await _context.BranchImages
            .FirstOrDefaultAsync(i => i.ImageId == imageId);

        if (image == null)
        {
            return null;
        }

        // Nếu có ảnh mới: upload ảnh mới trước, gán vào, rồi xóa ảnh cũ trên S3
        if (dto.Image != null)
        {
            string oldUrl = image.ImageUrl;
            string newUrl = await _s3Service.UploadFileAsync(dto.Image, $"branches/{image.BranchId}");
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

    // Xóa 1 ảnh, đồng thời xóa file trên S3
    public async Task<bool> DeleteImageAsync(int imageId)
    {
        BranchImage? image = await _context.BranchImages
            .FirstOrDefaultAsync(i => i.ImageId == imageId);

        if (image == null)
        {
            return false;
        }

        await _s3Service.DeleteFileAsync(image.ImageUrl);

        _context.BranchImages.Remove(image);
        await _context.SaveChangesAsync();

        return true;
    }

    // Đổi thứ tự nhiều ảnh cùng lúc trong 1 chi nhánh (kéo thả, hoặc lưu hàng loạt từ nút +/-)
   
    public async Task<List<BranchImageDto>> ReorderImagesAsync(int branchId, ReorderBranchImagesDto dto)
    {
        List<int> imageIds = new List<int>();
        foreach (var item in dto.Items)
        {
            imageIds.Add(item.ImageId);
        }

        List<BranchImage> images = await _context.BranchImages
            .Where(i => i.BranchId == branchId && imageIds.Contains(i.ImageId))
            .ToListAsync();

        if (images.Count != imageIds.Count)
        {
            throw new KeyNotFoundException("Một số ảnh không tồn tại hoặc không thuộc chi nhánh này");
        }

        // Gom ImageId -> SortOrder mới để tra cứu nhanh
        Dictionary<int, sbyte> sortOrderByImageId = new Dictionary<int, sbyte>();
        foreach (var item in dto.Items)
        {
            sortOrderByImageId[item.ImageId] = item.SortOrder;
        }

        foreach (var image in images)
        {
            image.SortOrder = sortOrderByImageId[image.ImageId];
        }

        await _context.SaveChangesAsync();

        List<BranchImage> sortedImages = images
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .ToList();

        List<BranchImageDto> result = new List<BranchImageDto>();
        foreach (var image in sortedImages)
        {
            result.Add(MapImageToDto(image));
        }

        return result;
    }


    private async Task<List<BranchImage>> UploadAndAttachImagesAsync(
        int branchId, List<IFormFile> images, List<string>? imageTypes)
    {
        List<BranchImage> result = new List<BranchImage>();

        // Lấy sort order hiện tại theo từng loại ảnh để nối tiếp thay vì ghi đè
        List<BranchImage> existingImages = await _context.BranchImages
            .Where(i => i.BranchId == branchId)
            .ToListAsync();

        Dictionary<string, sbyte> currentMaxSortOrders = new Dictionary<string, sbyte>();
        foreach (var existingImage in existingImages)
        {
            if (!currentMaxSortOrders.ContainsKey(existingImage.ImageType))
            {
                currentMaxSortOrders[existingImage.ImageType] = existingImage.SortOrder;
            }
            else if (existingImage.SortOrder > currentMaxSortOrders[existingImage.ImageType])
            {
                currentMaxSortOrders[existingImage.ImageType] = existingImage.SortOrder;
            }
        }

        for (int i = 0; i < images.Count; i++)
        {
            IFormFile file = images[i];

            string imageType = DEFAULT_IMAGE_TYPE;
            if (imageTypes != null && i < imageTypes.Count && !string.IsNullOrWhiteSpace(imageTypes[i]))
            {
                imageType = imageTypes[i];
            }

            string url = await _s3Service.UploadFileAsync(file, $"branches/{branchId}");

            sbyte currentMax = 0;
            currentMaxSortOrders.TryGetValue(imageType, out currentMax);
            sbyte nextOrder = (sbyte)(currentMax + 1);
            currentMaxSortOrders[imageType] = nextOrder;

            BranchImage entity = new BranchImage();
            entity.BranchId = branchId;
            entity.ImageUrl = url;
            entity.ImageType = imageType;
            entity.SortOrder = nextOrder;
            entity.UploadedAt = DateTime.Now;

            _context.BranchImages.Add(entity);
            result.Add(entity);
        }

        return result;
    }


    internal static BranchImageDto MapImageToDto(BranchImage i)
    {
        BranchImageDto dto = new BranchImageDto();
        dto.ImageId = i.ImageId;
        dto.BranchId = i.BranchId;
        dto.ImageUrl = i.ImageUrl;
        dto.ImageType = i.ImageType;
        dto.SortOrder = i.SortOrder;
        dto.UploadedAt = i.UploadedAt;
        return dto;
    }
}