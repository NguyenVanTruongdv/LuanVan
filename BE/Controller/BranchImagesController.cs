using BE.DTOs.Branches;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;


[ApiController]
[Route("api")]
public class BranchImagesController : ControllerBase
{
    private readonly BranchImageService _branchImageService;

    public BranchImagesController(BranchImageService branchImageService)
    {
        _branchImageService = branchImageService;
    }


    [HttpGet("branches/{branchId:int}/images")]
    public async Task<ActionResult<List<BranchImageDto>>> GetByBranch(int branchId)
    {
        var images = await _branchImageService.GetByBranchIdAsync(branchId);
        return Ok(images);
    }

    
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

    
    [HttpPut("branch-images/{imageId:int}")]
    public async Task<ActionResult<BranchImageDto>> UpdateImage(int imageId, [FromForm] UpdateBranchImageDto dto)
    {
        var image = await _branchImageService.UpdateImageAsync(imageId, dto);
        if (image is null)
            return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return Ok(image);
    }

    
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

    [HttpDelete("branch-images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        var deleted = await _branchImageService.DeleteImageAsync(imageId);
        if (!deleted)
            return NotFound(new { message = $"Không tìm thấy ảnh có id = {imageId}" });

        return NoContent();
    }
}