using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ReportService
{
    private readonly GymManagementContext _db;

    public ReportService(GymManagementContext db)
    {
        _db = db;
    }

    // Lấy danh sách chi nhánh mà nhân viên này được gán quản lý/làm việc.
    private async Task<List<Branch>> GetManagedBranchesAsync(long employeeId)
    {
        return await _db.EmployeeBranches
            .Where(eb => eb.EmployeeId == employeeId)
            .Select(eb => eb.Branch)
            .Distinct()
            .ToListAsync();
    }

    private static BranchReportContextDto BuildContext(List<Branch> branches, DateTime fromDate, DateTime toDate)
    {
        return new BranchReportContextDto
        {
            BranchIds = branches.Select(b => b.BranchId).ToList(),
            BranchNames = branches.Select(b => b.BranchName).ToList(),
            FromDate = fromDate.Date,
            ToDate = toDate.Date
        };
    }

    // ===================== DOANH THU (TỔNG QUAN) =====================
    public async Task<RevenueReportDto> GetRevenueReportAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();
        var toDateExclusive = toDate.Date.AddDays(1);

        if (branchIds.Count == 0)
        {
            return new RevenueReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        var paidTransactions = await _db.Transactions
            .Include(t => t.Plan)
            .Include(t => t.Branch)
            .Where(t => branchIds.Contains(t.BranchId)
                        && t.PaymentStatus == "Paid"
                        && t.CreatedAt >= fromDate.Date && t.CreatedAt < toDateExclusive)
            .ToListAsync();

        var totalRevenue = paidTransactions.Sum(t => t.Amount);
        var totalTransactions = paidTransactions.Count;

        var periodLength = toDateExclusive - fromDate.Date;
        var previousFrom = fromDate.Date - periodLength;
        var previousTo = fromDate.Date;

        var previousRevenue = await _db.Transactions
            .Where(t => branchIds.Contains(t.BranchId)
                        && t.PaymentStatus == "Paid"
                        && t.CreatedAt >= previousFrom && t.CreatedAt < previousTo)
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;

        var growth = previousRevenue == 0
            ? (totalRevenue > 0 ? 100.0 : 0.0)
            : (double)((totalRevenue - previousRevenue) / previousRevenue) * 100.0;

        var revenueByPlan = paidTransactions
            .GroupBy(t => t.Plan.PlanName)
            .Select(g => new RevenueByPlanDto
            {
                PlanName = g.Key,
                Revenue = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToList();

        var revenueByMethod = paidTransactions
            .GroupBy(t => t.PaymentMethod)
            .Select(g => new RevenueByMethodDto
            {
                Method = g.Key,
                Revenue = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToList();

        var revenueByBranch = BuildRevenueByBranch(paidTransactions);

        var trend = paidTransactions
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new RevenueTrendPointDto { Date = g.Key, Revenue = g.Sum(t => t.Amount) })
            .OrderBy(x => x.Date)
            .ToList();

        var revenueByDay = BuildRevenueByDay(paidTransactions);
        var revenueByMonth = BuildRevenueByMonth(paidTransactions);

        return new RevenueReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            TotalRevenue = totalRevenue,
            TotalTransactions = totalTransactions,
            AverageTransactionValue = totalTransactions == 0 ? 0 : totalRevenue / totalTransactions,
            PreviousPeriodRevenue = previousRevenue,
            GrowthPercentage = Math.Round(growth, 2),
            RevenueByPlan = revenueByPlan,
            RevenueByPaymentMethod = revenueByMethod,
            RevenueByBranch = revenueByBranch,
            Trend = trend,
            RevenueByDay = revenueByDay,
            RevenueByMonth = revenueByMonth
        };
    }

    // ===================== DOANH THU THEO NGÀY (riêng) =====================
    public async Task<List<RevenueByDayDto>> GetRevenueByDayAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();
        if (branchIds.Count == 0) return new List<RevenueByDayDto>();

        var toDateExclusive = toDate.Date.AddDays(1);

        var paidTransactions = await _db.Transactions
            .Where(t => branchIds.Contains(t.BranchId)
                        && t.PaymentStatus == "Paid"
                        && t.CreatedAt >= fromDate.Date && t.CreatedAt < toDateExclusive)
            .Select(t => new { t.CreatedAt, t.Amount })
            .ToListAsync();

        return paidTransactions
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new RevenueByDayDto
            {
                Date = g.Key,
                Revenue = g.Sum(x => x.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToList();
    }

    // ===================== DOANH THU THEO THÁNG (riêng) =====================
    public async Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();
        if (branchIds.Count == 0) return new List<RevenueByMonthDto>();

        var toDateExclusive = toDate.Date.AddDays(1);

        var paidTransactions = await _db.Transactions
            .Where(t => branchIds.Contains(t.BranchId)
                        && t.PaymentStatus == "Paid"
                        && t.CreatedAt >= fromDate.Date && t.CreatedAt < toDateExclusive)
            .Select(t => new { t.CreatedAt, t.Amount })
            .ToListAsync();

        return paidTransactions
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(g => new RevenueByMonthDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Revenue = g.Sum(x => x.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToList();
    }

    // ===================== DOANH THU THEO CHI NHÁNH (riêng) =====================
    public async Task<RevenueByBranchReportDto> GetRevenueByBranchAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();

        if (branchIds.Count == 0)
        {
            return new RevenueByBranchReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        var toDateExclusive = toDate.Date.AddDays(1);

        var paidTransactions = await _db.Transactions
            .Include(t => t.Branch)
            .Where(t => branchIds.Contains(t.BranchId)
                        && t.PaymentStatus == "Paid"
                        && t.CreatedAt >= fromDate.Date && t.CreatedAt < toDateExclusive)
            .ToListAsync();

        return new RevenueByBranchReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            Branches = BuildRevenueByBranch(paidTransactions, branches)
        };
    }

    private static List<RevenueByBranchDto> BuildRevenueByBranch(List<Transaction> paidTransactions, List<Branch>? allBranches = null)
    {
        var grouped = paidTransactions
            .GroupBy(t => new { t.BranchId, t.Branch.BranchName })
            .Select(g => new RevenueByBranchDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName,
                Revenue = g.Sum(t => t.Amount),
                TransactionCount = g.Count(),
                AverageTransactionValue = g.Count() == 0 ? 0 : g.Sum(t => t.Amount) / g.Count()
            })
            .ToList();

        // Nếu cần liệt kê cả những chi nhánh không phát sinh doanh thu trong kỳ
        if (allBranches != null)
        {
            var existingIds = grouped.Select(x => x.BranchId).ToHashSet();
            foreach (var b in allBranches.Where(b => !existingIds.Contains(b.BranchId)))
            {
                grouped.Add(new RevenueByBranchDto
                {
                    BranchId = b.BranchId,
                    BranchName = b.BranchName,
                    Revenue = 0,
                    TransactionCount = 0,
                    AverageTransactionValue = 0
                });
            }
        }

        return grouped.OrderByDescending(x => x.Revenue).ToList();
    }

    private static List<RevenueByDayDto> BuildRevenueByDay(List<Transaction> paidTransactions)
    {
        return paidTransactions
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new RevenueByDayDto
            {
                Date = g.Key,
                Revenue = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToList();
    }

    private static List<RevenueByMonthDto> BuildRevenueByMonth(List<Transaction> paidTransactions)
    {
        return paidTransactions
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(g => new RevenueByMonthDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Revenue = g.Sum(t => t.Amount),
                TransactionCount = g.Count()
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToList();
    }

    // ===================== HỘI VIÊN (TỔNG QUAN) =====================
    public async Task<MemberReportDto> GetMemberReportAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();
        var toDateExclusive = toDate.Date.AddDays(1);

        if (branchIds.Count == 0)
        {
            return new MemberReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        // Hội viên "thuộc" chi nhánh = có ít nhất 1 member_package tại chi nhánh đó
        var packagesAtBranches = await _db.MemberPackages
            .Include(mp => mp.Member)
            .Include(mp => mp.Plan)
            .Where(mp => branchIds.Contains(mp.BranchId))
            .ToListAsync();

        var totalMembers = packagesAtBranches.Select(mp => mp.MemberId).Distinct().Count();

        var activeMemberIds = packagesAtBranches
            .Where(mp => mp.PackageStatus == "Active")
            .Select(mp => mp.MemberId)
            .Distinct()
            .ToHashSet();

        var expiredMemberIds = packagesAtBranches
            .Where(mp => mp.PackageStatus == "Expired")
            .Select(mp => mp.MemberId)
            .Distinct()
            .ToHashSet();

        // Hội viên mới: gói đầu tiên của họ (bất kỳ chi nhánh nào) được tạo tại 1 trong các chi nhánh này, trong kỳ
        var firstPackagePerMember = await _db.MemberPackages
            .GroupBy(mp => mp.MemberId)
            .Select(g => new { MemberId = g.Key, FirstPackage = g.OrderBy(x => x.CreatedAt).First() })
            .Where(x => branchIds.Contains(x.FirstPackage.BranchId)
                        && x.FirstPackage.CreatedAt >= fromDate.Date
                        && x.FirstPackage.CreatedAt < toDateExclusive)
            .ToListAsync();
        var newMembersInPeriod = firstPackagePerMember.Count;

        // ExpiryDate là DateOnly? — so sánh phải quy về DateOnly, không so trực tiếp với DateTime
        var todayDateOnly = DateOnly.FromDateTime(DateTime.UtcNow);
        var expiringSoonWindow = todayDateOnly.AddDays(7);

        var expiringSoon = packagesAtBranches
            .Where(mp => mp.PackageStatus == "Active"
                         && mp.ExpiryDate.HasValue
                         && mp.ExpiryDate.Value >= todayDateOnly
                         && mp.ExpiryDate.Value <= expiringSoonWindow)
            .OrderBy(mp => mp.ExpiryDate)
            .Select(mp => new ExpiringMemberDto
            {
                MemberId = mp.MemberId,
                FullName = mp.Member.FullName,
                ExpiryDate = mp.ExpiryDate!.Value.ToDateTime(TimeOnly.MinValue),
                PlanName = mp.Plan.PlanName,
                BranchId = mp.BranchId
            })
            .ToList();

        // Tỷ lệ gia hạn: trong số gói hết hạn (ExpiryDate) rơi vào kỳ, bao nhiêu % hội viên vẫn có gói Active khác
        var fromDateOnly = DateOnly.FromDateTime(fromDate.Date);
        var toDateExclusiveOnly = DateOnly.FromDateTime(toDateExclusive);

        var packagesExpiredInPeriod = packagesAtBranches
            .Where(mp => mp.ExpiryDate.HasValue
                         && mp.ExpiryDate.Value >= fromDateOnly
                         && mp.ExpiryDate.Value < toDateExclusiveOnly)
            .ToList();

        var renewedCount = packagesExpiredInPeriod.Count(mp => activeMemberIds.Contains(mp.MemberId));
        var retentionRate = packagesExpiredInPeriod.Count == 0
            ? 0.0
            : (double)renewedCount / packagesExpiredInPeriod.Count * 100.0;

        var membersByPlan = packagesAtBranches
            .GroupBy(mp => mp.Plan.PlanName)
            .Select(g => new MemberByPlanDto
            {
                PlanName = g.Key,
                MemberCount = g.Select(x => x.MemberId).Distinct().Count()
            })
            .OrderByDescending(x => x.MemberCount)
            .ToList();

        return new MemberReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            TotalMembers = totalMembers,
            ActiveMembers = activeMemberIds.Count,
            ExpiredMembers = expiredMemberIds.Count,
            NewMembersInPeriod = newMembersInPeriod,
            ExpiringSoonCount = expiringSoon.Count,
            RetentionRatePercentage = Math.Round(retentionRate, 2),
            MembersByPlan = membersByPlan,
            ExpiringSoon = expiringSoon
        };
    }

    // ===================== HỘI VIÊN: TỔNG SỐ + CHECK-IN THEO CHI NHÁNH =====================
    public async Task<MemberSummaryReportDto> GetMemberSummaryAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();

        if (branchIds.Count == 0)
        {
            return new MemberSummaryReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        var toDateExclusive = toDate.Date.AddDays(1);

        // Hội viên theo chi nhánh (dựa trên member_packages tại chi nhánh)
        var packagesAtBranches = await _db.MemberPackages
            .Include(mp => mp.Branch)
            .Where(mp => branchIds.Contains(mp.BranchId))
            .Select(mp => new { mp.BranchId, mp.Branch.BranchName, mp.MemberId, mp.PackageStatus })
            .ToListAsync();

        var membersByBranch = packagesAtBranches
            .GroupBy(mp => new { mp.BranchId, mp.BranchName })
            .Select(g => new MemberCountByBranchDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName,
                MemberCount = g.Select(x => x.MemberId).Distinct().Count(),
                ActiveMemberCount = g.Where(x => x.PackageStatus == "Active")
                                      .Select(x => x.MemberId).Distinct().Count()
            })
            .OrderByDescending(x => x.MemberCount)
            .ToList();

        var totalMembers = packagesAtBranches.Select(x => x.MemberId).Distinct().Count();
        var totalActiveMembers = packagesAtBranches
            .Where(x => x.PackageStatus == "Active")
            .Select(x => x.MemberId).Distinct().Count();

        // Check-in theo chi nhánh trong kỳ
        var checkIns = await _db.CheckIns
            .Include(c => c.Branch)
            .Where(c => branchIds.Contains(c.BranchId)
                        && c.CheckInTime >= fromDate.Date && c.CheckInTime < toDateExclusive)
            .Select(c => new { c.BranchId, c.Branch.BranchName, c.MemberId })
            .ToListAsync();

        var checkInsByBranch = checkIns
            .GroupBy(c => new { c.BranchId, c.BranchName })
            .Select(g => new CheckInByBranchDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName,
                CheckInCount = g.Count(),
                UniqueMemberCount = g.Select(x => x.MemberId).Distinct().Count()
            })
            .OrderByDescending(x => x.CheckInCount)
            .ToList();

        // Đảm bảo liệt kê đủ tất cả chi nhánh quản lý, kể cả khi không có check-in
        var existingBranchIds = checkInsByBranch.Select(x => x.BranchId).ToHashSet();
        foreach (var b in branches.Where(b => !existingBranchIds.Contains(b.BranchId)))
        {
            checkInsByBranch.Add(new CheckInByBranchDto
            {
                BranchId = b.BranchId,
                BranchName = b.BranchName,
                CheckInCount = 0,
                UniqueMemberCount = 0
            });
        }

        return new MemberSummaryReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            TotalMembers = totalMembers,
            TotalActiveMembers = totalActiveMembers,
            TotalCheckIns = checkIns.Count,
            MembersByBranch = membersByBranch,
            CheckInsByBranch = checkInsByBranch.OrderByDescending(x => x.CheckInCount).ToList()
        };
    }

    // ===================== THIẾT BỊ (TỔNG QUAN) =====================
    public async Task<EquipmentReportDto> GetEquipmentReportAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();
        var toDateExclusive = toDate.Date.AddDays(1);

        if (branchIds.Count == 0)
        {
            return new EquipmentReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        var equipmentAtBranches = await _db.Equipment
            .Include(e => e.Category)
            .Include(e => e.Branch)
            .Include(e => e.Incidents)
            .Where(e => branchIds.Contains(e.BranchId))
            .ToListAsync();

        var totalEquipment = equipmentAtBranches.Count;
        var activeCount = equipmentAtBranches.Count(e => e.Status == "Active");
        var deletedCount = equipmentAtBranches.Count(e => e.Status == "Deleted");

        var incidentsInPeriod = equipmentAtBranches
            .SelectMany(e => e.Incidents)
            .Where(i => i.CreatedAt >= fromDate.Date && i.CreatedAt < toDateExclusive)
            .ToList();

        var incidentsByStatus = incidentsInPeriod
            .GroupBy(i => i.Status)
            .Select(g => new IncidentByStatusDto { Status = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        var equipmentByCategory = equipmentAtBranches
            .GroupBy(e => e.Category.CategoryName)
            .Select(g => new EquipmentByCategoryDto { Category = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        var mostIncidentProne = equipmentAtBranches
            .Select(e => new EquipmentIncidentFrequencyDto
            {
                EquipmentId = e.EquipmentId,
                EquipmentName = e.EquipmentName,
                IncidentCount = e.Incidents.Count
            })
            .Where(x => x.IncidentCount > 0)
            .OrderByDescending(x => x.IncidentCount)
            .Take(10)
            .ToList();

        var pendingApproval = equipmentAtBranches
            .SelectMany(e => e.Incidents)
            .Where(i => i.Status == "PendingApproval")
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new PendingIncidentDto
            {
                IncidentId = i.IncidentId,
                Title = i.Title,
                EquipmentName = i.Equipment != null ? i.Equipment.EquipmentName : null,
                CreatedAt = i.CreatedAt,
                BranchId = i.BranchId
            })
            .ToList();

        var equipmentByBranch = BuildEquipmentByBranch(equipmentAtBranches, fromDate, toDateExclusive);

        return new EquipmentReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            TotalEquipment = totalEquipment,
            ActiveCount = activeCount,
            DeletedCount = deletedCount,
            IncidentCountInPeriod = incidentsInPeriod.Count,
            IncidentsByStatus = incidentsByStatus,
            EquipmentByCategory = equipmentByCategory,
            MostIncidentProneEquipment = mostIncidentProne,
            PendingApprovalIncidents = pendingApproval,
            EquipmentByBranch = equipmentByBranch
        };
    }

    // ===================== THIẾT BỊ THEO CHI NHÁNH (riêng) =====================
    public async Task<EquipmentByBranchReportDto> GetEquipmentByBranchAsync(long employeeId, DateTime fromDate, DateTime toDate)
    {
        var branches = await GetManagedBranchesAsync(employeeId);
        var branchIds = branches.Select(b => b.BranchId).ToList();

        if (branchIds.Count == 0)
        {
            return new EquipmentByBranchReportDto { Context = BuildContext(branches, fromDate, toDate) };
        }

        var toDateExclusive = toDate.Date.AddDays(1);

        var equipmentAtBranches = await _db.Equipment
            .Include(e => e.Branch)
            .Include(e => e.Incidents)
            .Where(e => branchIds.Contains(e.BranchId))
            .ToListAsync();

        return new EquipmentByBranchReportDto
        {
            Context = BuildContext(branches, fromDate, toDate),
            Branches = BuildEquipmentByBranch(equipmentAtBranches, fromDate, toDateExclusive, branches)
        };
    }

    private static List<EquipmentByBranchDto> BuildEquipmentByBranch(
        List<Equipment> equipmentAtBranches,
        DateTime fromDate,
        DateTime toDateExclusive,
        List<Branch>? allBranches = null)
    {
        var grouped = equipmentAtBranches
            .GroupBy(e => new { e.BranchId, e.Branch.BranchName })
            .Select(g => new EquipmentByBranchDto
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.BranchName,
                TotalEquipment = g.Count(),
                ActiveCount = g.Count(e => e.Status == "Active"),
                DeletedCount = g.Count(e => e.Status == "Deleted"),
                IncidentCountInPeriod = g.SelectMany(e => e.Incidents)
                    .Count(i => i.CreatedAt >= fromDate.Date && i.CreatedAt < toDateExclusive),
                PendingApprovalIncidentCount = g.SelectMany(e => e.Incidents)
                    .Count(i => i.Status == "PendingApproval")
            })
            .ToList();

        if (allBranches != null)
        {
            var existingIds = grouped.Select(x => x.BranchId).ToHashSet();
            foreach (var b in allBranches.Where(b => !existingIds.Contains(b.BranchId)))
            {
                grouped.Add(new EquipmentByBranchDto
                {
                    BranchId = b.BranchId,
                    BranchName = b.BranchName,
                    TotalEquipment = 0,
                    ActiveCount = 0,
                    DeletedCount = 0,
                    IncidentCountInPeriod = 0,
                    PendingApprovalIncidentCount = 0
                });
            }
        }

        return grouped.OrderByDescending(x => x.TotalEquipment).ToList();
    }
}