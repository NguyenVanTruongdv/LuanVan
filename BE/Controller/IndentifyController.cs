using BE.DTOs.Identify;
using BE.Services.Identify;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/identify")]
public class IdentifyController : ApiControllerBase
{
    private readonly IdentifyService _identifyService;

    public IdentifyController(IdentifyService identifyService)
    {
        _identifyService = identifyService;
    }

    // POST /api/checkins/identify
    // Dùng chung cho cả check-in và check-out qua camera — phân biệt bằng field "action".
    // branchId lấy từ token đăng nhập của thiết bị/nhân viên, không nhận từ FE nữa.
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> IdentifyAttendance([FromBody] IdentifyAttendanceRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Image))
        {
            return BadRequest(new { message = "Thiếu ảnh." });
        }

        if (request.Action != "checkin" && request.Action != "checkout")
        {
            return BadRequest(new { message = "Action không hợp lệ." });
        }

        var branchIds = GetCurrentUserBranchIds();
        if (branchIds.Count == 0)
        {
            return Unauthorized(new { message = "Không xác định được chi nhánh của tài khoản đăng nhập." });
        }

        var result = await _identifyService.IdentifyAttendanceAsync(request, branchIds[0]);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("checkins")]
    public async Task<IActionResult> CheckinManual([FromBody] ManualCheckinRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ManualReason))
        {
            return BadRequest(new { message = "Thiếu lý do check-in thủ công." });
        }

        var staffIdText = User.FindFirst("employeeId")?.Value;
        long? staffId = null;
        if (long.TryParse(staffIdText, out var parsedId))
        {
            staffId = parsedId;
        }

        var branchIds = GetCurrentUserBranchIds();
        if (branchIds.Count == 0)
        {
            return Unauthorized(new { message = "Không xác định được chi nhánh của tài khoản đăng nhập." });
        }

        try
        {
            var result = await _identifyService.CheckinManualAsync(request, staffId, branchIds[0]);
            return Ok(new
            {
                status = "success",
                member = result.Member,
                checkInId = result.CheckInId
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("doors/open")]
    public async Task<IActionResult> OpenDoor([FromBody] OpenDoorRequestDto request)
    {
        if (request.Side != "checkin" && request.Side != "checkout")
        {
            return BadRequest(new { message = "Side không hợp lệ." });
        }

        var branchIds = GetCurrentUserBranchIds();
        if (branchIds.Count == 0)
        {
            return Unauthorized(new { message = "Không xác định được chi nhánh của tài khoản đăng nhập." });
        }

        await _identifyService.OpenDoorAsync(branchIds[0], request);
        return Ok(new { status = "success" });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetHistory([FromQuery] CheckInHistoryQueryDto query)
    {
        long? staffId = GetCurrentUserId();
        if (staffId == null)
        {
            return Unauthorized(new { message = "Không xác định được nhân viên đăng nhập." });
        }

        CheckInHistoryResponseDto result = await _identifyService
            .GetCheckInHistoryByStaffAsync(staffId.Value, query);

        return Ok(result);
    }
}