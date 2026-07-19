using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BE.Data;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    // ====================== DTO (dữ liệu trả về cho FE) ======================

    public class DashboardStatsDto
    {
        public decimal RevenueToday { get; set; }
        public double RevenueChangePercent { get; set; } // % thay đổi so với hôm qua
        public int NewMembersToday { get; set; }
        public int CheckinsToday { get; set; }
        public int CheckinsChange { get; set; } // chênh lệch số lượng so với hôm qua
    }

    public class RecentCheckinDto
    {
        public string MemberName { get; set; }
        public string PackageName { get; set; }
        public DateTime CheckInTime { get; set; }
        public bool IsCheckedOut { get; set; }
    }

    public class RecentTransactionDto
    {
        public long TransactionId { get; set; }
        public string MemberName { get; set; }
        public string PackageName { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; }
        public DateTime Time { get; set; }
        public string Status { get; set; }
    }

    public class WeeklyChartDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public int CheckinCount { get; set; }
    }

    public class ExpiringPackageDto
    {
        public string MemberName { get; set; }
        public string PackageName { get; set; }
        public int DaysLeft { get; set; }
    }

    // Gộp tất cả lại thành 1 object trả về cho FE hiển thị luôn 1 lần
    public class DashboardDto
    {
        public DashboardStatsDto Stats { get; set; }
        public List<RecentCheckinDto> RecentCheckins { get; set; }
        public List<RecentTransactionDto> RecentTransactions { get; set; }
        public List<WeeklyChartDto> WeeklyChart { get; set; }
        public List<ExpiringPackageDto> ExpiringPackages { get; set; }
    }

    // ====================== SERVICE ======================

    public class DashboardService
    {
        private readonly GymManagementContext _context;

        public DashboardService(GymManagementContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Hàm chính — gọi hàm này cho cả 3 role.
        /// branchId = null  => Admin, xem toàn hệ thống (không lọc chi nhánh)
        /// branchId = X     => Cashier / Manager, chỉ xem chi nhánh X
        /// </summary>
        public async Task<DashboardDto> GetDashboardAsync(int? branchId)
        {
            return new DashboardDto
            {
                Stats = await GetStatsAsync(branchId),
                RecentCheckins = await GetRecentCheckinsAsync(branchId),
                RecentTransactions = await GetRecentTransactionsAsync(branchId),
                WeeklyChart = await GetWeeklyChartAsync(branchId),
                ExpiringPackages = await GetExpiringPackagesAsync(branchId)
            };
        }

        // ---- 1. Số liệu tổng quan (4 ô thống kê trên đầu dashboard) ----
        public async Task<DashboardStatsDto> GetStatsAsync(int? branchId)
        {
            var today = DateTime.Today;
            var yesterday = today.AddDays(-1);

            // Doanh thu: chỉ tính giao dịch đã thanh toán thành công (Paid)
            var txQuery = _context.Transactions.Where(t => t.PaymentStatus == "Paid");
            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            decimal revenueToday = await txQuery
                .Where(t => t.CreatedAt.Date == today)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            decimal revenueYesterday = await txQuery
                .Where(t => t.CreatedAt.Date == yesterday)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            // Check-in trong ngày
            var checkinQuery = _context.CheckIns.AsQueryable();
            if (branchId.HasValue)
                checkinQuery = checkinQuery.Where(c => c.BranchId == branchId);

            int checkinsToday = await checkinQuery.CountAsync(c => c.CheckInTime.Date == today);
            int checkinsYesterday = await checkinQuery.CountAsync(c => c.CheckInTime.Date == yesterday);

            // Hội viên mới hôm nay: lấy qua member_packages vì bảng này có branch_id
            // (bảng members không gắn trực tiếp với chi nhánh)
            var newMemberQuery = _context.MemberPackages.Where(mp => mp.CreatedAt.Date == today);
            if (branchId.HasValue)
                newMemberQuery = newMemberQuery.Where(mp => mp.BranchId == branchId);

            int newMembersToday = await newMemberQuery
                .Select(mp => mp.MemberId)
                .Distinct()
                .CountAsync();

            return new DashboardStatsDto
            {
                RevenueToday = revenueToday,
                RevenueChangePercent = CalcPercentChange(revenueYesterday, revenueToday),
                NewMembersToday = newMembersToday,
                CheckinsToday = checkinsToday,
                CheckinsChange = checkinsToday - checkinsYesterday
            };
        }

        private double CalcPercentChange(decimal oldValue, decimal newValue)
        {
            if (oldValue == 0) return newValue == 0 ? 0 : 100;
            return (double)((newValue - oldValue) / oldValue * 100);
        }

        // ---- 2. Danh sách check-in gần đây ----
        public async Task<List<RecentCheckinDto>> GetRecentCheckinsAsync(int? branchId, int take = 10)
        {
            var query = _context.CheckIns
                .Include(c => c.Member)
                .Include(c => c.MemberPackage)
                    .ThenInclude(mp => mp.Plan)
                .AsQueryable();

            if (branchId.HasValue)
                query = query.Where(c => c.BranchId == branchId);

            return await query
                .OrderByDescending(c => c.CheckInTime)
                .Take(take)
                .Select(c => new RecentCheckinDto
                {
                    MemberName = c.Member.FullName,
                    PackageName = c.MemberPackage != null ? c.MemberPackage.Plan.PlanName : "",
                    CheckInTime = c.CheckInTime,
                    IsCheckedOut = c.CheckOutTime != null
                })
                .ToListAsync();
        }

        // ---- 3. Danh sách giao dịch gần đây ----
       public async Task<List<RecentTransactionDto>> GetRecentTransactionsAsync(int? branchId, int take = 10)
{
    var today = DateTime.Today;              // 00:00:00 hôm nay
    var tomorrow = today.AddDays(1);          // 00:00:00 ngày mai (mốc kết thúc, exclusive)

    var query = _context.Transactions
        .Include(t => t.Member)
        .Include(t => t.Plan)
        .Where(t => t.CreatedAt >= today && t.CreatedAt < tomorrow)
        .AsQueryable();

    if (branchId.HasValue)
        query = query.Where(t => t.BranchId == branchId);

    return await query
        .OrderByDescending(t => t.CreatedAt)
        .Take(take)
        .Select(t => new RecentTransactionDto
        {
            TransactionId = t.TransactionId,
            MemberName = t.Member.FullName,
            PackageName = t.Plan.PlanName,
            Amount = t.Amount,
            PaymentMethod = t.PaymentMethod,
            Time = t.CreatedAt,
            Status = t.PaymentStatus
        })
        .ToListAsync();
}

        // ---- 4. Biểu đồ 7 ngày gần nhất (doanh thu + check-in) ----
        public async Task<List<WeeklyChartDto>> GetWeeklyChartAsync(int? branchId)
        {
            var fromDate = DateTime.Today.AddDays(-6);

            var txQuery = _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= fromDate);
            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            var checkinQuery = _context.CheckIns.Where(c => c.CheckInTime >= fromDate);
            if (branchId.HasValue)
                checkinQuery = checkinQuery.Where(c => c.BranchId == branchId);

            // Lấy hết dữ liệu 7 ngày về rồi group trong bộ nhớ cho dễ hiểu
            var transactions = await txQuery.Select(t => new { t.CreatedAt, t.Amount }).ToListAsync();
            var checkins = await checkinQuery.Select(c => c.CheckInTime).ToListAsync();

            var result = new List<WeeklyChartDto>();
            for (int i = 0; i < 7; i++)
            {
                var day = fromDate.AddDays(i);
                result.Add(new WeeklyChartDto
                {
                    Date = day,
                    Revenue = transactions.Where(t => t.CreatedAt.Date == day).Sum(t => t.Amount),
                    CheckinCount = checkins.Count(c => c.Date == day)
                });
            }
            return result;
        }

        // ---- 5. Gói tập sắp hết hạn (trong N ngày tới, mặc định 7 ngày) ----
        public async Task<List<ExpiringPackageDto>> GetExpiringPackagesAsync(int? branchId, int daysThreshold = 7)
        {
            // ExpiryDate trong model là DateOnly? nên phải đổi DateTime.Today
            // sang DateOnly thì mới so sánh được, không thể so DateOnly với DateTime
            var todayDate = DateOnly.FromDateTime(DateTime.Today);
            var limitDate = todayDate.AddDays(daysThreshold);

            var query = _context.MemberPackages
                .Include(mp => mp.Member)
                .Include(mp => mp.Plan)
                .Where(mp => mp.PackageStatus == "Active"
                          && mp.ExpiryDate >= todayDate
                          && mp.ExpiryDate <= limitDate);

            if (branchId.HasValue)
                query = query.Where(mp => mp.BranchId == branchId);

            var list = await query.OrderBy(mp => mp.ExpiryDate).ToListAsync();

            return list.Select(mp => new ExpiringPackageDto
            {
                MemberName = mp.Member.FullName,
                PackageName = mp.Plan.PlanName,
                DaysLeft = mp.ExpiryDate.HasValue ? mp.ExpiryDate.Value.DayNumber - todayDate.DayNumber : 0
            }).ToList();
        }
    }
}