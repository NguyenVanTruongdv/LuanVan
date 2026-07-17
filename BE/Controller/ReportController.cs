using System.Security.Claims;
using BE.DTOs;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize] // yêu cầu nhân viên đã đăng nhập
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService)
    {
        _reportService = reportService;
    }

    // Lấy employeeId từ token JWT hiện tại
    private long GetEmployeeId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("employee_id")
                      ?? User.FindFirstValue("sub");

        if (idClaim == null || !long.TryParse(idClaim, out var employeeId))
        {
            throw new UnauthorizedAccessException("Không xác định được nhân viên hiện tại.");
        }

        return employeeId;
    }

    // Chuẩn hóa khoảng ngày mặc định: 30 ngày gần nhất nếu không truyền vào
    private static (DateTime from, DateTime to) NormalizeRange(DateTime? fromDate, DateTime? toDate)
    {
        var to = (toDate ?? DateTime.UtcNow).Date;
        var from = (fromDate ?? to.AddDays(-29)).Date;

        if (from > to)
        {
            (from, to) = (to, from);
        }

        return (from, to);
    }

    // ===================== DOANH THU =====================

    // GET api/reports/revenue?fromDate=2026-06-01&toDate=2026-06-30
    // Trả về báo cáo doanh thu tổng quan, kèm sẵn breakdown theo ngày/tháng/chi nhánh
    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueReportDto>> GetRevenueReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetRevenueReportAsync(employeeId, from, to);
        return Ok(result);
    }

    // GET api/reports/revenue/by-day?fromDate=...&toDate=...
    [HttpGet("revenue/by-day")]
    public async Task<ActionResult<List<RevenueByDayDto>>> GetRevenueByDay(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetRevenueByDayAsync(employeeId, from, to);
        return Ok(result);
    }

    // GET api/reports/revenue/by-month?fromDate=...&toDate=...
    [HttpGet("revenue/by-month")]
    public async Task<ActionResult<List<RevenueByMonthDto>>> GetRevenueByMonth(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetRevenueByMonthAsync(employeeId, from, to);
        return Ok(result);
    }

    // GET api/reports/revenue/by-branch?fromDate=...&toDate=...
    [HttpGet("revenue/by-branch")]
    public async Task<ActionResult<RevenueByBranchReportDto>> GetRevenueByBranch(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetRevenueByBranchAsync(employeeId, from, to);
        return Ok(result);
    }

    // ===================== HỘI VIÊN =====================

    // GET api/reports/members?fromDate=...&toDate=...
    // Báo cáo hội viên tổng quan (active/expired/new/expiring/retention)
    [HttpGet("members")]
    public async Task<ActionResult<MemberReportDto>> GetMemberReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetMemberReportAsync(employeeId, from, to);
        return Ok(result);
    }

    // GET api/reports/members/summary?fromDate=...&toDate=...
    // Tổng hội viên + tổng check-in theo chi nhánh
    [HttpGet("members/summary")]
    public async Task<ActionResult<MemberSummaryReportDto>> GetMemberSummary(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetMemberSummaryAsync(employeeId, from, to);
        return Ok(result);
    }

    // ===================== THIẾT BỊ =====================

    // GET api/reports/equipment?fromDate=...&toDate=...
    [HttpGet("equipment")]
    public async Task<ActionResult<EquipmentReportDto>> GetEquipmentReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetEquipmentReportAsync(employeeId, from, to);
        return Ok(result);
    }

    // GET api/reports/equipment/by-branch?fromDate=...&toDate=...
    [HttpGet("equipment/by-branch")]
    public async Task<ActionResult<EquipmentByBranchReportDto>> GetEquipmentByBranch(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var (from, to) = NormalizeRange(fromDate, toDate);
        var employeeId = GetEmployeeId();
        var result = await _reportService.GetEquipmentByBranchAsync(employeeId, from, to);
        return Ok(result);
    }
}