using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BE.Data;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    // ====================== QUERY (bộ lọc từ FE gửi lên) ======================

    public class CashierDashboardQueryDto
    {
        // "today" | "7d" | "30d" | "custom"
        public string Range { get; set; } = "30d";

        // Chỉ dùng khi Range == "custom"
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }

        // "Tất cả" hoặc null => không lọc. Ngược lại: "Tiền mặt" | "Chuyển khoản"
        public string? Method { get; set; }

        // "Tất cả" hoặc null => không lọc. Ngược lại: "Tại quầy" | "Online"
        public string? Channel { get; set; }
    }

    // ====================== DTO trả về cho FE ======================

    public class CashierDashboardStatsDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AvgOrder { get; set; }

        // So sánh nửa đầu kỳ vs nửa sau kỳ (đúng logic FE đang tự tính bằng mock data)
        public bool RevenueTrendUp { get; set; }
        public int RevenueDeltaPercent { get; set; }

        public decimal CounterRevenue { get; set; } // Tại quầy
        public decimal OnlineRevenue { get; set; }
        public decimal CashRevenue { get; set; }     // Tiền mặt
        public decimal TransferRevenue { get; set; } // Chuyển khoản
    }

    public class RevenueByDayDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public int Orders { get; set; }
    }

    public class MethodBreakdownDto
    {
        public string Method { get; set; } = "";
        public decimal Amount { get; set; }
    }

    public class ChannelByDayDto
    {
        public DateTime Date { get; set; }
        public decimal CounterRevenue { get; set; }
        public decimal OnlineRevenue { get; set; }
    }

    public class RecentOrderDto
    {
        public long TransactionId { get; set; }
        public DateTime DateTime { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "";
        public string Channel { get; set; } = "";
    }

    public class RecentCheckinDto2
    {
        public string MemberName { get; set; } = "";
        public DateTime DateTime { get; set; }
        public string MembershipType { get; set; } = "";
    }

    public class CashierDashboardDto
    {
        public CashierDashboardStatsDto Stats { get; set; } = new();
        public List<RevenueByDayDto> RevenueByDay { get; set; } = new();
        public List<MethodBreakdownDto> MethodBreakdown { get; set; } = new();
        public List<ChannelByDayDto> ChannelByDay { get; set; } = new();
        public List<RecentOrderDto> RecentOrders { get; set; } = new();
        public List<RecentCheckinDto2> RecentCheckins { get; set; } = new();
    }

    // ====================== DTO của dashboard tổng quan cũ (Admin/Manager) ======================

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

        // ====================== CÁC HÀM DASHBOARD TỔNG QUAN (CŨ) ======================

        /// <summary>
        /// Hàm chính cho dashboard tổng quan cũ — gọi cho cả 3 role.
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

            var txQuery = _context.Transactions.Where(t => t.PaymentStatus == "Paid");
            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            decimal revenueToday = await txQuery
                .Where(t => t.CreatedAt.Date == today)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            decimal revenueYesterday = await txQuery
                .Where(t => t.CreatedAt.Date == yesterday)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            var checkinQuery = _context.CheckIns.AsQueryable();
            if (branchId.HasValue)
                checkinQuery = checkinQuery.Where(c => c.BranchId == branchId);

            int checkinsToday = await checkinQuery.CountAsync(c => c.CheckInTime.Date == today);
            int checkinsYesterday = await checkinQuery.CountAsync(c => c.CheckInTime.Date == yesterday);

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
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

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

        // ====================== DASHBOARD THU NGÂN (MỚI) ======================

        /// <summary>
        /// branchId = null  => Admin, xem toàn hệ thống
        /// branchId = X     => Cashier / Manager, chỉ xem chi nhánh X
        /// </summary>
        public async Task<CashierDashboardDto> GetCashierDashboardAsync(int? branchId, CashierDashboardQueryDto query)
        {
            var (from, to) = ResolveRange(query);

            // ---- Giao dịch trong khoảng thời gian + filter phương thức/kênh ----
            var txQuery = _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= from && t.CreatedAt <= to);

            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            if (!string.IsNullOrWhiteSpace(query.Method) && query.Method != "Tất cả")
                txQuery = txQuery.Where(t => t.PaymentMethod == query.Method);

            // Không có cột Channel trong Transactions => suy ra kênh bán hàng từ EmployeeId:
            // có nhân viên xử lý (EmployeeId != null) = "Tại quầy", không có = "Online" (khách tự thanh toán).
            // TODO: đổi "t.EmployeeId" thành đúng tên property nếu entity của bạn đặt tên khác (VD: CashierId, StaffId).
            if (!string.IsNullOrWhiteSpace(query.Channel) && query.Channel != "Tất cả")
            {
                if (query.Channel == "Tại quầy")
                    txQuery = txQuery.Where(t => t.EmployeeId != null);
                else if (query.Channel == "Online")
                    txQuery = txQuery.Where(t => t.EmployeeId == null);
            }

            var transactions = await txQuery
                .OrderBy(t => t.CreatedAt)
                .Select(t => new
                {
                    t.TransactionId,
                    t.Amount,
                    t.PaymentMethod,
                    Channel = t.EmployeeId != null ? "Tại quầy" : "Online",
                    t.CreatedAt
                })
                .ToListAsync();

            // ---- Check-in trong khoảng thời gian (không áp filter phương thức/kênh) ----
            var checkinQuery = _context.CheckIns
                .Include(c => c.Member)
                .Include(c => c.MemberPackage)
                    .ThenInclude(mp => mp.Plan)
                .Where(c => c.CheckInTime >= from && c.CheckInTime <= to);

            if (branchId.HasValue)
                checkinQuery = checkinQuery.Where(c => c.BranchId == branchId);

            var recentCheckins = await checkinQuery
                .OrderByDescending(c => c.CheckInTime)
                .Take(15)
                .Select(c => new RecentCheckinDto2
                {
                    MemberName = c.Member.FullName,
                    DateTime = c.CheckInTime,
                    // TODO: đổi sang field loại hạng hội viên thật (VD: c.Member.MembershipType)
                    // nếu có, thay vì lấy tên gói tập như dưới đây.
                    MembershipType = c.MemberPackage != null && c.MemberPackage.Plan != null
                        ? c.MemberPackage.Plan.PlanName
                        : ""
                })
                .ToListAsync();

            var dto = BuildDto(transactions.Select(t => (
                t.TransactionId, t.Amount, t.PaymentMethod, t.Channel, t.CreatedAt)).ToList());
            dto.RecentCheckins = recentCheckins;
            return dto;
        }

        private (DateTime from, DateTime to) ResolveRange(CashierDashboardQueryDto query)
        {
            var today = DateTime.Today;

            switch ((query.Range ?? "30d").ToLowerInvariant())
            {
                case "today":
                    return (today, today.AddDays(1).AddTicks(-1));

                case "7d":
                    return (today.AddDays(-6), today.AddDays(1).AddTicks(-1));

                case "custom":
                    var start = query.Start ?? today.AddDays(-1);
                    var end = query.End ?? DateTime.Now;
                    return (start, end);

                case "30d":
                default:
                    return (today.AddDays(-29), today.AddDays(1).AddTicks(-1));
            }
        }

        private CashierDashboardDto BuildDto(
            List<(long TransactionId, decimal Amount, string PaymentMethod, string Channel, DateTime CreatedAt)> transactions)
        {
            var dto = new CashierDashboardDto();

            // ---------------- STATS ----------------
            decimal totalRevenue = transactions.Sum(t => t.Amount);
            int totalOrders = transactions.Count;
            decimal avgOrder = totalOrders > 0 ? Math.Round(totalRevenue / totalOrders) : 0;

            int half = totalOrders / 2;
            decimal firstHalfRev = transactions.Take(half).Sum(t => t.Amount);
            decimal secondHalfRev = transactions.Skip(half).Sum(t => t.Amount);
            bool trendUp = secondHalfRev >= firstHalfRev;
            int deltaPct = firstHalfRev > 0
                ? (int)Math.Abs(Math.Round((double)(secondHalfRev - firstHalfRev) / (double)firstHalfRev * 100))
                : 0;

            dto.Stats = new CashierDashboardStatsDto
            {
                TotalRevenue = totalRevenue,
                TotalOrders = totalOrders,
                AvgOrder = avgOrder,
                RevenueTrendUp = trendUp,
                RevenueDeltaPercent = deltaPct,
                CounterRevenue = transactions.Where(t => t.Channel == "Tại quầy").Sum(t => t.Amount),
                OnlineRevenue = transactions.Where(t => t.Channel == "Online").Sum(t => t.Amount),
                CashRevenue = transactions.Where(t => t.PaymentMethod == "Tiền mặt").Sum(t => t.Amount),
                TransferRevenue = transactions.Where(t => t.PaymentMethod == "Chuyển khoản").Sum(t => t.Amount),
            };

            // ---------------- REVENUE BY DAY ----------------
            dto.RevenueByDay = transactions
                .GroupBy(t => t.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    Revenue = g.Sum(t => t.Amount),
                    Orders = g.Count()
                })
                .ToList();

            // ---------------- METHOD BREAKDOWN ----------------
            dto.MethodBreakdown = transactions
                .GroupBy(t => t.PaymentMethod)
                .Select(g => new MethodBreakdownDto { Method = g.Key, Amount = g.Sum(t => t.Amount) })
                .ToList();

            // ---------------- CHANNEL BY DAY ----------------
            dto.ChannelByDay = transactions
                .GroupBy(t => t.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new ChannelByDayDto
                {
                    Date = g.Key,
                    CounterRevenue = g.Where(t => t.Channel == "Tại quầy").Sum(t => t.Amount),
                    OnlineRevenue = g.Where(t => t.Channel == "Online").Sum(t => t.Amount)
                })
                .ToList();

            // ---------------- RECENT ORDERS (15 gần nhất) ----------------
            dto.RecentOrders = transactions
                .OrderByDescending(t => t.CreatedAt)
                .Take(15)
                .Select(t => new RecentOrderDto
                {
                    TransactionId = t.TransactionId,
                    DateTime = t.CreatedAt,
                    Amount = t.Amount,
                    PaymentMethod = t.PaymentMethod,
                    Channel = t.Channel
                })
                .ToList();

            // RecentCheckins được gán trực tiếp ở GetCashierDashboardAsync (query riêng, không phụ thuộc filter phương thức/kênh)

            return dto;
        }
    }
}