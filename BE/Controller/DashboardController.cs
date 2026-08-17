using System;
using System.Security.Claims;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _dashboardService;

        public DashboardController(DashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        /// <summary>
        /// Admin => xem toàn hệ thống.
        /// Manager/Cashier => chỉ xem dữ liệu chi nhánh trong token.
        /// </summary>
        private int? CurrentBranchId
        {
            get
            {
                var role = User.FindFirst(ClaimTypes.Role)?.Value
                           ?? User.FindFirst("role")?.Value;

                if (role == "Admin")
                    return null;

                var branchIdClaim = User.FindFirst("branchId")?.Value;

                return int.TryParse(branchIdClaim, out var branchId)
                    ? branchId
                    : null;
            }
        }

     

        [HttpGet("admin-overview")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminOverview([FromQuery] AdminOverviewQueryDto query)
        {
            query.Months = Math.Clamp(query.Months <= 0 ? 6 : query.Months, 1, 24);

            return Ok(await _dashboardService.GetAdminOverviewAsync(query));
        }
        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            return Ok(await _dashboardService.GetDashboardAsync(CurrentBranchId));
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            return Ok(await _dashboardService.GetStatsAsync(CurrentBranchId));
        }

        [HttpGet("recent-checkins")]
        public async Task<IActionResult> GetRecentCheckins([FromQuery] int take = 10)
        {
            take = Math.Clamp(take, 1, 100);

            return Ok(await _dashboardService.GetRecentCheckinsAsync(CurrentBranchId, take));
        }

        [HttpGet("recent-transactions")]
        public async Task<IActionResult> GetRecentTransactions([FromQuery] int take = 10)
        {
            take = Math.Clamp(take, 1, 100);

            return Ok(await _dashboardService.GetRecentTransactionsAsync(CurrentBranchId, take));
        }

        [HttpGet("weekly-chart")]
        public async Task<IActionResult> GetWeeklyChart()
        {
            return Ok(await _dashboardService.GetWeeklyChartAsync(CurrentBranchId));
        }

        [HttpGet("expiring-packages")]
        public async Task<IActionResult> GetExpiringPackages([FromQuery] int days = 7)
        {
            days = Math.Clamp(days, 1, 365);

            return Ok(await _dashboardService.GetExpiringPackagesAsync(CurrentBranchId, days));
        }

       

        [HttpGet("cashier")]
        public async Task<IActionResult> GetCashierDashboard(
            [FromQuery] CashierDashboardQueryDto query)
        {
            query.Range = NormalizeRange(query.Range);

            return Ok(await _dashboardService.GetCashierDashboardAsync(CurrentBranchId, query));
        }

 

       [HttpGet("manager")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetManagerDashboard(
            [FromQuery] ManagerDashboardQueryDto query)
        {
            query.Range = NormalizeRange(query.Range);
            return Ok(await _dashboardService.GetManagerDashboardAsync(CurrentBranchId, query));
        }

       

        private static string NormalizeRange(string? range)
        {
            if (string.IsNullOrWhiteSpace(range))
                return "30d";

            range = range.Trim().ToLower();

            return range switch
            {
                "today" => "today",
                "7d" => "7d",
                "30d" => "30d",
                "custom" => "custom",
                _ => "30d"
            };
        }
    }
}