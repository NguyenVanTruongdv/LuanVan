using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BE.Data;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Reports;

public class ReportService
{
    private readonly GymManagementContext _context;

    private const int DefaultRangeDays = 30;

    public ReportService(GymManagementContext context)
    {
        _context = context;
    }

    // Nếu FE truyền From/To cụ thể (đã kèm giờ:phút:giây) thì dùng đúng giá trị
    // đó, KHÔNG được cắt về .Date — nếu không mọi bộ lọc theo giờ (ca làm việc)
    // sẽ bị "nuốt" mất và trả về nguyên cả ngày.
    // Chỉ khi FE không truyền (null) mới áp dụng mặc định theo ngày trọn vẹn.
    private (DateTime from, DateTime to) ResolveRange(ReportFilter filter)
    {
        DateTime to = filter.ToDate ?? DateTime.Now.Date.AddDays(1).AddTicks(-1);
        DateTime from = filter.FromDate ?? to.Date.AddDays(-DefaultRangeDays);
        return (from, to);
    }

    private static List<int>? GetEffectiveBranchIds(ReportFilter filter)
    {
        if (filter.AllowedBranchIds != null)
        {
            if (filter.BranchId.HasValue)
            {
                return filter.AllowedBranchIds.Contains(filter.BranchId.Value)
                    ? new List<int> { filter.BranchId.Value }
                    : new List<int>();
            }
            return filter.AllowedBranchIds;
        }

        if (filter.BranchId.HasValue)
            return new List<int> { filter.BranchId.Value };

        return null;
    }

    // =====================================================================
    // THU NGÂN
    // =====================================================================

    public async Task<MemberSummaryReportDto> GetMemberSummaryReportAsync(ReportFilter filter)
    {
        var (from, to) = ResolveRange(filter);

        var membersQuery = _context.Members.AsNoTracking().AsQueryable();

        var totalMembers = await membersQuery.CountAsync();
        var activeMembers = await membersQuery.CountAsync(m => m.Status == "Active");
        var pendingMembers = await membersQuery.CountAsync(m => m.Status == "PendingActivation");
        var suspendedMembers = await membersQuery.CountAsync(m => m.Status == "Suspended");

        var newMembersInRangeQuery = membersQuery.Where(m => m.CreatedAt >= from && m.CreatedAt <= to);
        var newMembersInRange = await newMembersInRangeQuery.CountAsync();

        var byDay = await newMembersInRangeQuery
            .GroupBy(m => m.CreatedAt.Date)
            .Select(g => new DailyCountDto { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return new MemberSummaryReportDto
        {
            TotalMembers = totalMembers,
            ActiveMembers = activeMembers,
            PendingActivationMembers = pendingMembers,
            SuspendedMembers = suspendedMembers,
            NewMembersInRange = newMembersInRange,
            NewMembersByDay = byDay
        };
    }

    public async Task<CheckInReportDto> GetCheckInReportAsync(ReportFilter filter)
    {
        var (from, to) = ResolveRange(filter);

        var query = _context.CheckIns.AsNoTracking()
            .Where(c => c.CheckInTime >= from && c.CheckInTime <= to);

        var effectiveBranchIds = GetEffectiveBranchIds(filter);
        if (effectiveBranchIds != null)
            query = query.Where(c => effectiveBranchIds.Contains(c.BranchId));

        var total = await query.CountAsync();
        var autoCount = await query.CountAsync(c => c.Method == "Auto");
        var manualCount = await query.CountAsync(c => c.Method == "Manual");
        var stillIn = await query.CountAsync(c => c.CheckOutTime == null);

        var byDay = await query
            .GroupBy(c => c.CheckInTime.Date)
            .Select(g => new DailyCountDto { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var byBranch = await query
            .Include(c => c.Branch)
            .GroupBy(c => new { c.BranchId, c.Branch!.BranchName })
            .Select(g => new BranchCountDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName ?? "",
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return new CheckInReportDto
        {
            TotalCheckIns = total,
            AutoCheckIns = autoCount,
            ManualCheckIns = manualCount,
            CurrentlyCheckedIn = stillIn,
            CheckInsByDay = byDay,
            CheckInsByBranch = byBranch
        };
    }

    public async Task<RevenueReportDto> GetRevenueReportAsync(ReportFilter filter)
    {
        var (from, to) = ResolveRange(filter);

        var baseQuery = _context.Transactions.AsNoTracking()
            .Where(t => t.CreatedAt >= from && t.CreatedAt <= to);

        var effectiveBranchIds = GetEffectiveBranchIds(filter);
        if (effectiveBranchIds != null)
            baseQuery = baseQuery.Where(t => t.BranchId != null && effectiveBranchIds.Contains(t.BranchId));

        var paidQuery = baseQuery.Where(t => t.PaymentStatus == "Paid");

        var totalRevenue = await paidQuery.SumAsync(t => (decimal?)t.Amount) ?? 0m;
        var totalOriginal = await paidQuery.SumAsync(t => (decimal?)t.GiaGoc) ?? 0m;
        var paidCount = await paidQuery.CountAsync();
        var pendingCount = await baseQuery.CountAsync(t => t.PaymentStatus == "Pending");
        var cancelledCount = await baseQuery.CountAsync(t => t.PaymentStatus == "Cancelled");

        var byDay = await paidQuery
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new DailyRevenueDto
            {
                Date = g.Key,
                Amount = g.Sum(x => x.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var byBranch = await paidQuery
            .Include(t => t.Branch)
            .GroupBy(t => new { t.BranchId, t.Branch!.BranchName })
            .Select(g => new BranchRevenueDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName ?? "",
                Amount = g.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var byPlan = await paidQuery
            .Include(t => t.Plan)
            .GroupBy(t => new { t.PlanId, t.Plan!.PlanName })
            .Select(g => new PlanRevenueDto
            {
                PlanId = g.Key.PlanId,
                PlanName = g.Key.PlanName ?? "",
                Amount = g.Sum(x => x.Amount),
                TransactionCount = g.Count()
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var byPaymentMethod = await paidQuery
            .GroupBy(t => t.PaymentMethod)
            .Select(g => new PaymentMethodRevenueDto
            {
                PaymentMethod = g.Key ?? "",
                Amount = g.Sum(x => x.Amount),
                TransactionCount = g.Count()
            })
            .ToListAsync();

        return new RevenueReportDto
        {
            TotalRevenue = totalRevenue,
            TotalOriginalPrice = totalOriginal,
            TotalDiscount = totalOriginal - totalRevenue,
            TotalPaidTransactions = paidCount,
            TotalPendingTransactions = pendingCount,
            TotalCancelledTransactions = cancelledCount,
            RevenueByDay = byDay,
            RevenueByBranch = byBranch,
            RevenueByPlan = byPlan,
            RevenueByPaymentMethod = byPaymentMethod
        };
    }

    public async Task<CashierDashboardDto> GetCashierDashboardAsync(ReportFilter filter)
    {
        return new CashierDashboardDto
        {
            MemberReport = await GetMemberSummaryReportAsync(filter),
            CheckInReport = await GetCheckInReportAsync(filter),
            RevenueReport = await GetRevenueReportAsync(filter)
        };
    }

    // =====================================================================
    // QUẢN LÝ / ADMIN (Admin gọi chung các hàm bên dưới)
    // =====================================================================

    public async Task<EmployeeReportDto> GetEmployeeReportAsync(ReportFilter filter)
    {
        var (from, to) = ResolveRange(filter);

        var query = _context.Employees.AsNoTracking().AsQueryable();

        var effectiveBranchIds = GetEffectiveBranchIds(filter);
        if (effectiveBranchIds != null)
            query = query.Where(e => e.Branches.Any(b => effectiveBranchIds.Contains(b.BranchId)));

        var total = await query.CountAsync();
        var active = await query.CountAsync(e => e.Status == "Active");
        var inactive = await query.CountAsync(e => e.Status == "Inactive");
        var newInRange = await query.CountAsync(e => e.CreatedAt >= from && e.CreatedAt <= to);

        var byRole = await query
        .Where(e => e.Account != null && e.Account.Role != null) // tránh NULL Account/Role gây lỗi materialize
        .Include(e => e.Account).ThenInclude(a => a.Role)
        .GroupBy(e => new { e.Account!.Role!.RoleId, e.Account.Role.RoleName })
        .Select(g => new RoleCountDto
        {
            RoleId = g.Key.RoleId,
            RoleName = g.Key.RoleName ?? "",
            Count = g.Count()
        })
        .OrderByDescending(x => x.Count)
        .ToListAsync();

        // Đếm riêng số nhân viên chưa gắn Account hoặc chưa gắn Role,
        // để không "mất" số liệu khi so với TotalEmployees
        var noRoleCount = await query
            .CountAsync(e => e.Account == null || e.Account.Role == null);
        if (noRoleCount > 0)
        {
            byRole.Add(new RoleCountDto
            {
                RoleId = 0,
                RoleName = "Chưa gán vai trò",
                Count = noRoleCount
            });
        }

        var branchesQuery = _context.Branches.AsNoTracking().AsQueryable();
        if (effectiveBranchIds != null)
            branchesQuery = branchesQuery.Where(b => effectiveBranchIds.Contains(b.BranchId));

        var byBranch = await branchesQuery
            .Select(b => new BranchCountDto
            {
                BranchId = b.BranchId,
                BranchName = b.BranchName ?? "",
                Count = b.Employees.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return new EmployeeReportDto
        {
            TotalEmployees = total,
            ActiveEmployees = active,
            InactiveEmployees = inactive,
            NewEmployeesInRange = newInRange,
            EmployeesByRole = byRole,
            EmployeesByBranch = byBranch
        };
    }

    public async Task<IncidentReportDto> GetIncidentReportAsync(ReportFilter filter)
    {
        var (from, to) = ResolveRange(filter);

        var query = _context.Incidents.AsNoTracking()
            .Where(i => i.CreatedAt >= from && i.CreatedAt <= to);

        var effectiveBranchIds = GetEffectiveBranchIds(filter);
        if (effectiveBranchIds != null)
            query = query.Where(i => effectiveBranchIds.Contains(i.BranchId));

        var total = await query.CountAsync();
        var pendingApproval = await query.CountAsync(i => i.Status == "PendingApproval");
        var approved = await query.CountAsync(i => i.Status == "Approved");
        var completed = await query.CountAsync(i => i.Status == "Completed");
        var cancelled = await query.CountAsync(i => i.Status == "Cancelled");

        var byDay = await query
            .GroupBy(i => i.CreatedAt.Date)
            .Select(g => new DailyCountDto { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var byBranch = await query
            .Include(i => i.Branch)
            .GroupBy(i => new { i.BranchId, i.Branch!.BranchName })
            .Select(g => new BranchCountDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName ?? "",
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var topEquipment = await query
            .Where(i => i.EquipmentId != null)
            .Include(i => i.Equipment)
            .GroupBy(i => new { i.EquipmentId, i.Equipment!.EquipmentName })
            .Select(g => new EquipmentIncidentCountDto
            {
                EquipmentId = g.Key.EquipmentId!.Value,
                EquipmentName = g.Key.EquipmentName ?? "",
                IncidentCount = g.Count()
            })
            .OrderByDescending(x => x.IncidentCount)
            .Take(10)
            .ToListAsync();

        return new IncidentReportDto
        {
            TotalIncidents = total,
            PendingApproval = pendingApproval,
            Approved = approved,
            Completed = completed,
            Cancelled = cancelled,
            IncidentsByDay = byDay,
            IncidentsByBranch = byBranch,
            TopEquipmentByIncidents = topEquipment
        };
    }

    public async Task<EquipmentReportDto> GetEquipmentReportAsync(ReportFilter filter)
    {
        var query = _context.Equipment.AsNoTracking().AsQueryable();

        var effectiveBranchIds = GetEffectiveBranchIds(filter);
        if (effectiveBranchIds != null)
            query = query.Where(e => effectiveBranchIds.Contains(e.BranchId));

        var total = await query.CountAsync();
        var active = await query.CountAsync(e => e.Status == "Active");
        var deleted = await query.CountAsync(e => e.Status == "Deleted");

        var byCategory = await query
            .Include(e => e.Category)
            .GroupBy(e => new { e.CategoryId, e.Category!.CategoryName })
            .Select(g => new CategoryCountDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName ?? "",
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var byBranch = await query
            .Include(e => e.Branch)
            .GroupBy(e => new { e.BranchId, e.Branch!.BranchName })
            .Select(g => new BranchCountDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName ?? "",
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return new EquipmentReportDto
        {
            TotalEquipment = total,
            ActiveEquipment = active,
            DeletedEquipment = deleted,
            EquipmentByCategory = byCategory,
            EquipmentByBranch = byBranch
        };
    }

    public async Task<ManagerDashboardDto> GetManagerDashboardAsync(ReportFilter filter)
    {
        return new ManagerDashboardDto
        {
            MemberReport = await GetMemberSummaryReportAsync(filter),
            EmployeeReport = await GetEmployeeReportAsync(filter),
            IncidentReport = await GetIncidentReportAsync(filter),
            EquipmentReport = await GetEquipmentReportAsync(filter),
            RevenueReport = await GetRevenueReportAsync(filter)
        };
    }

    // =====================================================================
    // HỖ TRỢ PHÂN QUYỀN CHI NHÁNH
    // =====================================================================

    public async Task<List<BranchListItemDto>> GetAllBranchesAsync()
    {
        return await _context.Branches.AsNoTracking()
            .OrderBy(b => b.BranchName)
            .Select(b => new BranchListItemDto { BranchId = b.BranchId, BranchName = b.BranchName ?? "" })
            .ToListAsync();
    }

    public async Task<List<BranchListItemDto>> GetManagedBranchesAsync(long employeeId)
    {
        return await _context.Employees.AsNoTracking()
            .Where(e => e.EmployeeId == employeeId)
            .SelectMany(e => e.Branches)
            .OrderBy(b => b.BranchName)
            .Select(b => new BranchListItemDto { BranchId = b.BranchId, BranchName = b.BranchName ?? "" })
            .ToListAsync();
    }

    public async Task<bool> IsBranchManagedByEmployeeAsync(long employeeId, int branchId)
    {
        return await _context.Employees.AsNoTracking()
            .Where(e => e.EmployeeId == employeeId)
            .SelectMany(e => e.Branches)
            .AnyAsync(b => b.BranchId == branchId);
    }
}