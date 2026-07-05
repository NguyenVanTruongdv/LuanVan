using BE.DTOs.Branches;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BranchesController : ControllerBase
{
    private readonly BranchService _branchService;

    public BranchesController(BranchService branchService)
    {
        _branchService = branchService;
    }

    /// <summary>
    /// Lấy danh sách chi nhánh, hỗ trợ lọc theo tên/trạng thái và phân trang
    /// GET /api/branches?name=&status=&page=1&pageSize=20
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] BranchFilterDto filter)
    {
        var result = await _branchService.GetListAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết 1 chi nhánh kèm danh sách ảnh
    /// GET /api/branches/5
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var branch = await _branchService.GetByIdAsync(id);
        if (branch is null) return NotFound(new { message = $"Không tìm thấy chi nhánh có id = {id}" });

        return Ok(branch);
    }

    /// <summary>
    /// Tạo chi nhánh mới, cho phép up kèm danh sách ảnh (multipart/form-data)
    /// POST /api/branches
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateBranchDto dto)
    {
        var created = await _branchService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.BranchId }, created);
    }

    /// <summary>
    /// Cập nhật thông tin chi nhánh (không bao gồm ảnh)
    /// PUT /api/branches/5
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBranchDto dto)
    {
        var updated = await _branchService.UpdateAsync(id, dto);
        if (updated is null) return NotFound(new { message = $"Không tìm thấy chi nhánh có id = {id}" });

        return Ok(updated);
    }

    /// <summary>
    /// Soft delete chi nhánh — không xóa vật lý, chỉ đánh dấu trạng thái Deleted
    /// DELETE /api/branches/5
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> SoftDelete(int id)
    {
        var success = await _branchService.SoftDeleteAsync(id);
        if (!success) return NotFound(new { message = $"Không tìm thấy chi nhánh có id = {id}" });

        return NoContent();
    }

    /// <summary>
    /// Khôi phục chi nhánh đã bị soft delete
    /// POST /api/branches/5/restore
    /// </summary>
    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var restored = await _branchService.RestoreAsync(id);
        if (restored is null)
            return NotFound(new { message = $"Không tìm thấy chi nhánh đã xóa có id = {id}" });

        return Ok(restored);
    }

    /// <summary>
    /// Thêm ảnh cho chi nhánh (có thể thêm nhiều ảnh 1 lần)
    /// POST /api/branches/5/images
    /// </summary>
    [HttpPost("{id:int}/images")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddImages(int id, [FromForm] AddBranchImagesDto dto)
    {
        try
        {
            var images = await _branchService.AddImagesAsync(id, dto);
            return Ok(images);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật 1 ảnh cụ thể — nếu gửi kèm ảnh mới, ảnh cũ trên S3 sẽ tự động bị xóa
    /// PUT /api/branches/images/10
    /// </summary>
    [HttpPut("images/{imageId:int}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateImage(int imageId, [FromForm] UpdateBranchImageDto dto)
    {
        var updated = await _branchService.UpdateImageAsync(imageId, dto);
        if (updated is null) return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return Ok(updated);
    }

    /// <summary>
    /// Xóa 1 ảnh — xóa cả record trong DB lẫn file trên S3
    /// DELETE /api/branches/images/10
    /// </summary>
    [HttpDelete("images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        var success = await _branchService.DeleteImageAsync(imageId);
        if (!success) return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return NoContent();
    }
}