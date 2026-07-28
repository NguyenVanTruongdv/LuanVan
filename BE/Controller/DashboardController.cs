using System.Security.Claims;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _dashboardService;

        public DashboardController(DashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        // Admin không có branchId trong token (hoặc claim "role" = Admin) => xem toàn hệ thống
        // Cashier / Manager => lấy branchId từ token để chỉ xem chi nhánh của họ
        private int? CurrentBranchId
        {
            get
            {
                var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
                if (role == "Admin") return null;

                var branchIdClaim = User.FindFirst("branchId")?.Value;
                return int.TryParse(branchIdClaim, out var branchId) ? branchId : null;
            }
        }

        // GET /api/dashboard  -> dashboard tổng quan cũ (stats + checkin + giao dịch + biểu đồ 7 ngày + gói sắp hết hạn)
        [HttpGet]
        public async Task<IActionResult> GetDashboard()
            => Ok(await _dashboardService.GetDashboardAsync(CurrentBranchId));

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
            => Ok(await _dashboardService.GetStatsAsync(CurrentBranchId));

        [HttpGet("recent-checkins")]
        public async Task<IActionResult> GetRecentCheckins([FromQuery] int take = 10)
            => Ok(await _dashboardService.GetRecentCheckinsAsync(CurrentBranchId, take));

        [HttpGet("recent-transactions")]
        public async Task<IActionResult> GetRecentTransactions([FromQuery] int take = 10)
            => Ok(await _dashboardService.GetRecentTransactionsAsync(CurrentBranchId, take));

        [HttpGet("weekly-chart")]
        public async Task<IActionResult> GetWeeklyChart()
            => Ok(await _dashboardService.GetWeeklyChartAsync(CurrentBranchId));

        [HttpGet("expiring-packages")]
        public async Task<IActionResult> GetExpiringPackages([FromQuery] int days = 7)
            => Ok(await _dashboardService.GetExpiringPackagesAsync(CurrentBranchId, days));

        // ==============================================================
        // GET /api/dashboard/cashier -> dùng riêng cho trang CashierDashboard.jsx
        // Query params:
        //   range   : "today" | "7d" | "30d" | "custom"   (mặc định "30d")
        //   start   : datetime ISO, chỉ dùng khi range = "custom"
        //   end     : datetime ISO, chỉ dùng khi range = "custom"
        //   method  : "Tất cả" | "Tiền mặt" | "Chuyển khoản"
        //   channel : "Tất cả" | "Tại quầy" | "Online"
        // ==============================================================
        [HttpGet("cashier")]
        public async Task<IActionResult> GetCashierDashboard([FromQuery] CashierDashboardQueryDto query)
            => Ok(await _dashboardService.GetCashierDashboardAsync(CurrentBranchId, query));
    }
}