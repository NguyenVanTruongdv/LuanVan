using BE.DTOs;
using BE.Services;
using BE.Services.GymDensity;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GymDensityController : ControllerBase
{
    private readonly GymDensityService _gymDensityService;

    public GymDensityController(GymDensityService gymDensityService)
    {
        _gymDensityService = gymDensityService;
    }

    /// <summary>
    /// Lấy mật độ người tập theo giờ của 1 chi nhánh — dùng để vẽ biểu đồ "Lượng người tập theo giờ"
    /// </summary>
    /// <param name="branchId">Mã chi nhánh</param>
    /// <param name="hoursCount">Số khung giờ gần nhất muốn lấy (mặc định 5)</param>
    [HttpGet("branch/{branchId:int}")]
    [ProducesResponseType(typeof(List<GymDensityHourDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDensityByBranch(
        int branchId,
        [FromQuery] int hoursCount = 5,
        CancellationToken ct = default)
    {
        if (branchId <= 0)
            return BadRequest("branchId không hợp lệ.");

        if (hoursCount <= 0 || hoursCount > 24)
            return BadRequest("hoursCount phải nằm trong khoảng 1-24.");

        var data = await _gymDensityService.GetDensityByBranchAsync(branchId, hoursCount, ct);

        if (data.Count == 0)
            return NotFound($"Không có dữ liệu mật độ cho chi nhánh {branchId}.");

        return Ok(data);
    }
}