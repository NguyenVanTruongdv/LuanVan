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

    private long? GetCurrentEmployeeId()
    {
        var raw = User.FindFirstValue("employeeId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(raw, out var id) ? id : null;
    }

    private bool IsAdmin() => User.IsInRole("Admin");

    
    private static ReportFilter BuildFilter(DateTime? from, DateTime? to, int? branchId) => new()
    {
        FromDate = from,
        ToDate = to,
        BranchId = branchId
    };

   
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