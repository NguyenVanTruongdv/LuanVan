using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/thong-ke")]
    public class ThongKeController : ControllerBase
    {
        private readonly ThongKeService _thongKeService;

        public ThongKeController(ThongKeService thongKeService)
        {
            _thongKeService = thongKeService;
        }

        
        [HttpGet("mat-do-phong-tap")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMatDoPhongTap([FromQuery] int? branchId, [FromQuery] int soNgay = 90)
        {
            var result = await _thongKeService.GetGymDensityAsync(branchId, soNgay);
            return Ok(result);
        }

       
        [HttpGet("tong-quan")]
        [Authorize]
        public async Task<IActionResult> GetTongQuan()
        {
            var memberId = LayMemberIdTuToken();
            if (memberId == null)
                return Unauthorized(new { message = "Không xác định được hội viên từ token." });

            var result = await _thongKeService.GetSummaryAsync(memberId.Value);
            return Ok(result);
        }

        
        [HttpGet("lich-su-check-in")]
        [Authorize]
        public async Task<IActionResult> GetLichSuCheckIn([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var memberId = LayMemberIdTuToken();
            if (memberId == null)
                return Unauthorized(new { message = "Không xác định được hội viên từ token." });

            var result = await _thongKeService.GetCheckInHistoryAsync(memberId.Value, page, pageSize);
            return Ok(result);
        }

        
        private int? LayMemberIdTuToken()
        {
            var claim = User.FindFirst("memberId")
                        ?? User.FindFirst(ClaimTypes.NameIdentifier)
                        ?? User.FindFirst("sub");

            if (claim == null || !int.TryParse(claim.Value, out var memberId))
                return null;

            return memberId;
        }
    }
}