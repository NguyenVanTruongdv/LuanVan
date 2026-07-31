using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BE.Services.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>
    /// Lấy employeeId của người đang đăng nhập từ claim.
    /// Đổi tên claim ("employeeId") cho khớp với claim thực tế trong JWT của bạn.
    /// </summary>
    private long? GetCurrentEmployeeId()
    {
        var raw = User.FindFirstValue("employeeId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(raw, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole("Admin");

    /// <summary>
    /// Dựng ReportFilter cho THU NGÂN / vai trò không giới hạn chi nhánh theo quyền quản lý
    /// (Thu ngân được xem theo branchId được chọn, hoặc tất cả nếu không chọn — tuỳ chính sách của bạn,
    /// ở đây giữ đơn giản: không giới hạn AllowedBranchIds).
    /// </summary>
    private static ReportFilter BuildFilter(DateTime? from, DateTime? to, int? branchId) => new()
    {
        FromDate = from,
        ToDate = to,
        BranchId = branchId
    };

    /// <summary>
    /// Dựng ReportFilter cho QUẢN LÝ / ADMIN:
    ///  - Admin: không giới hạn, xem theo branchId được chọn hoặc tất cả.
    ///  - Quản lý: bắt buộc AllowedBranchIds = danh sách chi nhánh họ quản lý.
    ///    Nếu họ truyền branchId không thuộc danh sách này -> 403 Forbid.
    /// </summary>
    private async Task<(ReportFilter? filter, IActionResult? error)> BuildManagerFilterAsync(
        DateTime? from, DateTime? to, int? branchId)
    {
        if (IsAdmin())
        {
            return (new ReportFilter { FromDate = from, ToDate = to, BranchId = branchId }, null);
        }

        var employeeId = GetCurrentEmployeeId();
        if (employeeId == null)
            return (null, Unauthorized("Không xác định được nhân viên hiện tại."));

        var managedBranches = await _reportService.GetManagedBranchesAsync(employeeId.Value);
        var managedBranchIds = managedBranches.Select(b => b.BranchId).ToList();

        if (branchId.HasValue && !managedBranchIds.Contains(branchId.Value))
            return (null, Forbid("Bạn không được phép xem báo cáo của chi nhánh này."));

        var filter = new ReportFilter
        {
            FromDate = from,
            ToDate = to,
            BranchId = branchId,
            AllowedBranchIds = managedBranchIds
        };
        return (filter, null);
    }

    // ================= THU NGÂN =================

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/members")]
    public async Task<IActionResult> GetMemberReport(DateTime? from, DateTime? to, int? branchId)
        => Ok(await _reportService.GetMemberSummaryReportAsync(BuildFilter(from, to, branchId)));

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/checkins")]
    public async Task<IActionResult> GetCheckInReport(DateTime? from, DateTime? to, int? branchId)
        => Ok(await _reportService.GetCheckInReportAsync(BuildFilter(from, to, branchId)));

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/revenue")]
    public async Task<IActionResult> GetRevenueReport(DateTime? from, DateTime? to, int? branchId)
        => Ok(await _reportService.GetRevenueReportAsync(BuildFilter(from, to, branchId)));

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/dashboard")]
    public async Task<IActionResult> GetCashierDashboard(DateTime? from, DateTime? to, int? branchId)
        => Ok(await _reportService.GetCashierDashboardAsync(BuildFilter(from, to, branchId)));

    // ================= QUẢN LÝ / ADMIN =================
    // Admin dùng chung toàn bộ endpoint bên dưới, KHÔNG bị giới hạn chi nhánh.
    // Quản lý chỉ được lọc trong phạm vi chi nhánh mình quản lý (kiểm tra qua BuildManagerFilterAsync).

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/employees")]
    public async Task<IActionResult> GetEmployeeReport(DateTime? from, DateTime? to, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(from, to, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetEmployeeReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/incidents")]
    public async Task<IActionResult> GetIncidentReport(DateTime? from, DateTime? to, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(from, to, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetIncidentReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/equipment")]
    public async Task<IActionResult> GetEquipmentReport(DateTime? from, DateTime? to, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(from, to, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetEquipmentReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/revenue")]
    public async Task<IActionResult> GetManagerRevenueReport(DateTime? from, DateTime? to, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(from, to, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetRevenueReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/dashboard")]
    public async Task<IActionResult> GetManagerDashboard(DateTime? from, DateTime? to, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(from, to, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetManagerDashboardAsync(filter!));
    }

    /// <summary>Danh sách chi nhánh để hiển thị dropdown lọc — Admin thấy tất cả, Quản lý chỉ thấy chi nhánh mình quản lý.</summary>
    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/branches")]
    public async Task<IActionResult> GetFilterableBranches()
    {
        if (IsAdmin())
            return Ok(await _reportService.GetAllBranchesAsync());

        var employeeId = GetCurrentEmployeeId();
        if (employeeId == null)
            return Unauthorized("Không xác định được nhân viên hiện tại.");

        return Ok(await _reportService.GetManagedBranchesAsync(employeeId.Value));
    }
}