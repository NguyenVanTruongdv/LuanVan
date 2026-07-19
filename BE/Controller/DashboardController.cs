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

        // GET /api/dashboard  -> lấy tất cả 1 lần (stats + checkin + giao dịch + biểu đồ + gói sắp hết hạn)
        [HttpGet]
        public async Task<IActionResult> GetDashboard()
            => Ok(await _dashboardService.GetDashboardAsync(CurrentBranchId));

        // GET /api/dashboard/stats  -> chỉ 4 ô thống kê trên đầu
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
            => Ok(await _dashboardService.GetStatsAsync(CurrentBranchId));

        // GET /api/dashboard/recent-checkins
        [HttpGet("recent-checkins")]
        public async Task<IActionResult> GetRecentCheckins([FromQuery] int take = 10)
            => Ok(await _dashboardService.GetRecentCheckinsAsync(CurrentBranchId, take));

        // GET /api/dashboard/recent-transactions
        [HttpGet("recent-transactions")]
        public async Task<IActionResult> GetRecentTransactions([FromQuery] int take = 10)
            => Ok(await _dashboardService.GetRecentTransactionsAsync(CurrentBranchId, take));

        // GET /api/dashboard/weekly-chart
        [HttpGet("weekly-chart")]
        public async Task<IActionResult> GetWeeklyChart()
            => Ok(await _dashboardService.GetWeeklyChartAsync(CurrentBranchId));

        // GET /api/dashboard/expiring-packages
        [HttpGet("expiring-packages")]
        public async Task<IActionResult> GetExpiringPackages([FromQuery] int days = 7)
            => Ok(await _dashboardService.GetExpiringPackagesAsync(CurrentBranchId, days));
    }
}