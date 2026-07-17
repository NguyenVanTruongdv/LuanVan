using BE.DTOs.Branches;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

/// <summary>
/// Endpoint quản lý hình ảnh chi nhánh (trang "Hình ảnh chi nhánh").
/// KHÔNG bao gồm chức năng đổi ảnh đại diện (theo yêu cầu).
/// </summary>
[ApiController]
[Route("api")]
public class BranchImagesController : ControllerBase
{
    private readonly BranchImageService _branchImageService;

    public BranchImagesController(BranchImageService branchImageService)
    {
        _branchImageService = branchImageService;
    }

    /// <summary>
    /// Lấy danh sách hình ảnh đã tải lên của 1 chi nhánh.
    /// Dùng để render bảng "Danh sách hình ảnh đã tải lên".
    /// </summary>
    [HttpGet("branches/{branchId:int}/images")]
    public async Task<ActionResult<List<BranchImageDto>>> GetByBranch(int branchId)
    {
        var images = await _branchImageService.GetByBranchIdAsync(branchId);
        return Ok(images);
    }

    /// <summary>
    /// Tải lên 1 hoặc nhiều ảnh cho 1 chi nhánh (khu vực "Kéo thả ảnh vào đây" / nút "Thêm ảnh").
    /// Body: multipart/form-data, field "Images" (list file), "ImageTypes" (list string, cùng thứ tự với Images).
    /// Loại ảnh hợp lệ: "Ảnh đại diện", "Ảnh bìa", "Ảnh cơ sở vật chất", "Khác" (mặc định nếu không truyền).
    /// </summary>
    [HttpPost("branches/{branchId:int}/images")]
    public async Task<ActionResult<List<BranchImageDto>>> AddImages(int branchId, [FromForm] AddBranchImagesDto dto)
    {
        try
        {
            var images = await _branchImageService.AddImagesAsync(branchId, dto);
            return Ok(images);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật 1 ảnh: đổi loại ảnh (dropdown "Loại ảnh"), đổi thứ tự (nút +/-),
    /// hoặc thay file ảnh mới (nút sửa ở cột "Thao tác").
    /// Chỉ cần truyền field nào muốn đổi, các field null sẽ giữ nguyên.
    /// </summary>
    [HttpPut("branch-images/{imageId:int}")]
    public async Task<ActionResult<BranchImageDto>> UpdateImage(int imageId, [FromForm] UpdateBranchImageDto dto)
    {
        var image = await _branchImageService.UpdateImageAsync(imageId, dto);
        if (image is null)
            return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return Ok(image);
    }

    /// <summary>
    /// Đổi thứ tự nhiều ảnh cùng lúc trong 1 chi nhánh (kéo thả icon ⋮⋮, hoặc lưu hàng loạt
    /// sau khi bấm nút +/- ở nhiều dòng rồi bấm "Lưu hình ảnh").
    /// Body: { "items": [ { "imageId": 1, "sortOrder": 1 }, { "imageId": 2, "sortOrder": 2 }, ... ] }
    /// </summary>
    [HttpPut("branches/{branchId:int}/images/reorder")]
    public async Task<ActionResult<List<BranchImageDto>>> ReorderImages(int branchId, [FromBody] ReorderBranchImagesDto dto)
    {
        try
        {
            var images = await _branchImageService.ReorderImagesAsync(branchId, dto);
            return Ok(images);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa 1 ảnh (nút thùng rác ở cột "Thao tác"). Đồng thời xóa file trên S3.
    /// </summary>
    [HttpDelete("branch-images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        var deleted = await _branchImageService.DeleteImageAsync(imageId);
        if (!deleted)
            return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return NoContent();
    }
}