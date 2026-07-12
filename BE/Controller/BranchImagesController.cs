using BE.DTOs.Branches;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

// Toàn bộ thao tác ảnh chi nhánh: xem danh sách, thêm nhiều ảnh cùng lúc, sửa 1 ảnh
// (đổi ảnh/loại ảnh/thứ tự), xóa 1 ảnh. Tách khỏi BranchesController vì đây là gallery
// nhiều ảnh, có vòng đời và tần suất thao tác khác với thông tin chi nhánh.
[ApiController]
[Route("api/branches/{branchId:int}/images")]
public class BranchImagesController : ControllerBase
{
    private readonly BranchImageService _branchImageService;

    public BranchImagesController(BranchImageService branchImageService)
    {
        _branchImageService = branchImageService;
    }

    // GET: api/branches/1/images
    [HttpGet]
    public async Task<IActionResult> GetByBranch(int branchId)
    {
        var images = await _branchImageService.GetByBranchIdAsync(branchId);
        return Ok(images);
    }

    // POST: api/branches/1/images  (multipart/form-data, có thể gửi nhiều ảnh 1 lần)
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddImages(int branchId, [FromForm] AddBranchImagesDto dto)
    {
        try
        {
            var result = await _branchImageService.AddImagesAsync(branchId, dto);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // PUT: api/branches/1/images/5  (branchId chỉ để giữ route lồng nhau cho rõ nghĩa,
    // thao tác thực tế xác định theo imageId vì mỗi ảnh chỉ thuộc đúng 1 chi nhánh)
    [HttpPut("{imageId:int}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateImage(int branchId, int imageId, [FromForm] UpdateBranchImageDto dto)
    {
        var updated = await _branchImageService.UpdateImageAsync(imageId, dto);

        if (updated is null)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        return Ok(updated);
    }

    // DELETE: api/branches/1/images/5
    [HttpDelete("{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int branchId, int imageId)
    {
        var deleted = await _branchImageService.DeleteImageAsync(imageId);

        if (!deleted)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        return NoContent();
    }
}