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

    // ================= THU NGÂN =================
    // LƯU Ý BẢO MẬT: KHÔNG bao giờ tin "branchId" do FE gửi lên cho vai trò
    // Staff — trước đây hàm BuildFilter() lấy branchId thẳng từ query string,
    // nghĩa là 1 thu ngân có thể tự sửa request để xem doanh thu chi nhánh
    // khác. Từ giờ chi nhánh của Staff LUÔN được BE tự tra ra từ employeeId
    // trong token (giống cơ chế BuildManagerFilterAsync đang dùng cho
    // Manager), branchId trên query chỉ còn tác dụng với Admin.
    private async Task<(ReportFilter? filter, IActionResult? error)> BuildCashierFilterAsync(
        DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        if (IsAdmin())
        {
            return (new ReportFilter { FromDate = fromDate, ToDate = toDate, BranchId = branchId }, null);
        }

        var employeeId = GetCurrentEmployeeId();
        if (employeeId == null)
            return (null, Unauthorized("Không xác định được nhân viên hiện tại."));

        var ownBranches = await _reportService.GetManagedBranchesAsync(employeeId.Value);
        var ownBranchIds = ownBranches.Select(b => b.BranchId).ToList();

        if (ownBranchIds.Count == 0)
            return (null, Forbid("Tài khoản chưa được gán chi nhánh làm việc."));

        // Nếu FE (vẫn) gửi branchId thì chỉ chấp nhận khi nó nằm trong chi
        // nhánh của chính nhân viên — không cho xem chéo. Nếu không gửi,
        // mặc định giới hạn theo đúng (các) chi nhánh của nhân viên đó.
        if (branchId.HasValue && !ownBranchIds.Contains(branchId.Value))
            return (null, Forbid("Bạn không được phép xem báo cáo của chi nhánh này."));

        var filter = new ReportFilter
        {
            FromDate = fromDate,
            ToDate = toDate,
            BranchId = branchId,
            AllowedBranchIds = ownBranchIds
        };
        return (filter, null);
    }

    private async Task<(ReportFilter? filter, IActionResult? error)> BuildManagerFilterAsync(
        DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        if (IsAdmin())
        {
            return (new ReportFilter { FromDate = fromDate, ToDate = toDate, BranchId = branchId }, null);
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
            FromDate = fromDate,
            ToDate = toDate,
            BranchId = branchId,
            AllowedBranchIds = managedBranchIds
        };
        return (filter, null);
    }

    // LƯU Ý: tên tham số bên dưới (fromDate/toDate/branchId) PHẢI khớp (không
    // phân biệt hoa/thường) với tên query string FE gửi lên (FromDate/ToDate/
    // BranchId trong cashierApi.js -> buildReportQuery).

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/members")]
    public async Task<IActionResult> GetMemberReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildCashierFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetMemberSummaryReportAsync(filter!));
    }

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/checkins")]
    public async Task<IActionResult> GetCheckInReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildCashierFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetCheckInReportAsync(filter!));
    }

    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/revenue")]
    public async Task<IActionResult> GetRevenueReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildCashierFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetRevenueReportAsync(filter!));
    }

    /// <summary>
    /// Dashboard thu ngân — bản tổng hợp Member + CheckIn + Revenue trong 1 lần gọi.
    /// Dùng cho trang CashierReport.jsx (cashierApi.getCashierReport). Cùng nhóm với
    /// 3 endpoint report riêng lẻ ở trên nên đặt chung ReportsController, không phải
    /// DashboardController.
    /// </summary>
    [Authorize(Roles = "Staff,Manager,Admin")]
    [HttpGet("cashier/dashboard")]
    public async Task<IActionResult> GetCashierDashboard(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildCashierFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetCashierDashboardAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/employees")]
    public async Task<IActionResult> GetEmployeeReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetEmployeeReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/incidents")]
    public async Task<IActionResult> GetIncidentReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetIncidentReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/equipment")]
    public async Task<IActionResult> GetEquipmentReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetEquipmentReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/revenue")]
    public async Task<IActionResult> GetManagerRevenueReport(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(fromDate, toDate, branchId);
        if (error != null) return error;
        return Ok(await _reportService.GetRevenueReportAsync(filter!));
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("manager/dashboard")]
    public async Task<IActionResult> GetManagerDashboard(DateTime? fromDate, DateTime? toDate, int? branchId)
    {
        var (filter, error) = await BuildManagerFilterAsync(fromDate, toDate, branchId);
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