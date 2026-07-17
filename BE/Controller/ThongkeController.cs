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

        /// <summary>
        /// GET /api/thong-ke/mat-do-phong-tap
        /// Dữ liệu công khai — không yêu cầu đăng nhập.
        /// </summary>
        [HttpGet("mat-do-phong-tap")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMatDoPhongTap([FromQuery] int? branchId, [FromQuery] int soNgay = 90)
        {
            var result = await _thongKeService.GetGymDensityAsync(branchId, soNgay);
            return Ok(result);
        }

        /// <summary>
        /// GET /api/thong-ke/tong-quan
        /// Tổng quan buổi tập của hội viên đang đăng nhập (memberId lấy từ token).
        /// </summary>
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

        /// <summary>
        /// GET /api/thong-ke/lich-su-check-in?page=1&amp;pageSize=10
        /// Lịch sử check-in của hội viên đang đăng nhập (memberId lấy từ token).
        /// </summary>
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

        /// <summary>
        /// Lấy member_id từ claim của JWT token.
        /// Điều chỉnh tên claim cho khớp với cách sinh token thực tế của dự án
        /// (hiện đang thử lần lượt: "memberId" -> ClaimTypes.NameIdentifier -> "sub").
        /// </summary>
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