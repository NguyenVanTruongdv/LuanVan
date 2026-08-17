using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BE.Data;
using BE.Services.Reports;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{



    // ====================== SERVICE ======================

    public class DashboardService
    {
        private readonly GymManagementContext _context;
        private readonly ReportService _reportService;

        public DashboardService(GymManagementContext context, ReportService reportService)
        {
            _context = context;
            _reportService = reportService;
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

        // ====================== DASHBOARD THU NGÂN (CASHIER) ======================

        /// <summary>
        /// branchId = null  => Admin, xem toàn hệ thống
        /// branchId = X     => Cashier / Manager, chỉ xem chi nhánh X
        ///
        /// Dashboard thu ngân chỉ lọc theo khoảng thời gian (query.Range / Start / End).
        /// Phương thức thanh toán và kênh bán hàng (tại quầy/online) KHÔNG còn là bộ lọc —
        /// luôn tính trên toàn bộ giao dịch trong khoảng thời gian đã chọn, giống hành vi
        /// "Tất cả phương thức" / "Tất cả hình thức" trước đây. Các trường Method/Channel
        /// trong CashierDashboardQueryDto (nếu FE còn gửi lên) sẽ bị bỏ qua.
        /// </summary>
        public async Task<CashierDashboardDto> GetCashierDashboardAsync(int? branchId, CashierDashboardQueryDto query)
        {
            var (from, to) = ResolveRange(query);

            var txQuery = _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= from && t.CreatedAt <= to);

            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            // Không có cột Channel trong Transactions => suy ra kênh bán hàng từ EmployeeId:
            // có nhân viên xử lý (EmployeeId != null) = "Tại quầy", không có = "Online" (khách tự thanh toán).
            // Vẫn tính để hiển thị breakdown, nhưng không dùng để lọc nữa.
            // TODO: đổi "t.EmployeeId" thành đúng tên property nếu entity của bạn đặt tên khác.
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

            dto.MethodBreakdown = transactions
                .GroupBy(t => t.PaymentMethod)
                .Select(g => new MethodBreakdownDto { Method = g.Key, Amount = g.Sum(t => t.Amount) })
                .ToList();

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

            return dto;
        }

        // ====================== DASHBOARD THU NGÂN — BẢN TỔNG HỢP TỪ REPORT ======================

        /// <summary>
        /// Chuyển từ ReportService sang đây (đây là dashboard, không phải report).
        /// Gộp 3 report Member/CheckIn/Revenue thành 1 dashboard thu ngân, dùng
        /// ReportFilter/ReportService sẵn có bên BE.Services.Reports.
        /// Lưu ý: trả về BE.Services.Reports.CashierDashboardDto (khác với
        /// CashierDashboardDto ở trên — 2 class trùng tên, khác namespace, khác cấu trúc),
        /// nên phải fully-qualify để tránh nhầm lẫn với hàm GetCashierDashboardAsync phía trên.
        /// </summary>
        public async Task<BE.Services.Reports.CashierDashboardDto> GetCashierReportDashboardAsync(ReportFilter filter)
        {
            return new BE.Services.Reports.CashierDashboardDto
            {
                MemberReport = await _reportService.GetMemberSummaryReportAsync(filter),
                CheckInReport = await _reportService.GetCheckInReportAsync(filter),
                RevenueReport = await _reportService.GetRevenueReportAsync(filter)
            };
        }

        // ====================== DASHBOARD QUẢN LÝ (MANAGER MỚI) ======================

        /// <summary>
        /// Hàm chính cho trang Manager Dashboard (ManagerDashboard.jsx).
        /// branchId = null => xem toàn hệ thống (Admin)
        /// branchId = X    => chỉ xem chi nhánh X (Manager)
        /// </summary>
        public async Task<ManagerDashboardDto> GetManagerDashboardAsync(int? branchId, ManagerDashboardQueryDto query)
        {
            var (from, to) = ResolveManagerRange(query);

            string branchName = "Toàn hệ thống";
            if (branchId.HasValue)
            {
                var branch = await _context.Branches
                    .Where(b => b.BranchId == branchId)
                    .Select(b => b.BranchName)
                    .FirstOrDefaultAsync();
                branchName = branch ?? "Chi nhánh";
            }

            var revenueTrend = await GetRevenueTrendAsync(branchId, from, to);
            var recentMembers = await GetRecentMembersWithStatusAsync(branchId, take: 10);
            var unresolvedIssues = await GetUnresolvedIssuesAsync(branchId, take: 10);
            var equipmentStatus = await GetEquipmentStatusAsync(branchId);

            // Mốc so sánh: doanh thu thực tế của kỳ liền trước, cùng độ dài với kỳ đang xem
            // (thay cho mục tiêu hardcode cũ assumedDailyGoal)
            var periodLength = (to.Date - from.Date).Days + 1;
            var prevFrom = from.AddDays(-periodLength);
            var prevTo = from.AddTicks(-1);
            decimal previousPeriodRevenue = await GetTotalRevenueAsync(branchId, prevFrom, prevTo);

            var kpi = BuildManagerKpi(revenueTrend, recentMembers, unresolvedIssues, equipmentStatus, previousPeriodRevenue);

            return new ManagerDashboardDto
            {
                BranchName = branchName,
                Kpi = kpi,
                RevenueTrend = revenueTrend,
                RecentMembers = recentMembers,
                UnresolvedIssues = unresolvedIssues,
                EquipmentStatus = equipmentStatus
            };
        }

        private (DateTime from, DateTime to) ResolveManagerRange(ManagerDashboardQueryDto query)
        {
            var today = DateTime.Today;
            switch ((query.Range ?? "7d").ToLowerInvariant())
            {
                case "today":
                    return (today, today.AddDays(1).AddTicks(-1));
                case "30d":
                    return (today.AddDays(-29), today.AddDays(1).AddTicks(-1));
                case "custom":
                    var start = query.Start ?? today.AddDays(-6);
                    var end = query.End ?? DateTime.Now;
                    return (start, end);
                case "7d":
                default:
                    return (today.AddDays(-6), today.AddDays(1).AddTicks(-1));
            }
        }

        // ---- Doanh thu theo ngày (cho RevenueChart) ----
        public async Task<List<RevenueTrendPointDto>> GetRevenueTrendAsync(int? branchId, DateTime from, DateTime to)
        {
            var txQuery = _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= from && t.CreatedAt <= to);

            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            var transactions = await txQuery
                .Select(t => new { t.CreatedAt, t.Amount })
                .ToListAsync();

            var days = (int)Math.Ceiling((to.Date - from.Date).TotalDays) + 1;
            var result = new List<RevenueTrendPointDto>();
            for (int i = 0; i < days; i++)
            {
                var day = from.Date.AddDays(i);
                result.Add(new RevenueTrendPointDto
                {
                    Date = day,
                    Revenue = transactions.Where(t => t.CreatedAt.Date == day).Sum(t => t.Amount)
                });
            }
            return result;
        }

        // ---- Tổng doanh thu (Paid) trong 1 khoảng thời gian bất kỳ ----
        // Dùng làm mốc so sánh (kỳ trước) thay cho mục tiêu hardcode cũ.
        private async Task<decimal> GetTotalRevenueAsync(int? branchId, DateTime from, DateTime to)
        {
            var txQuery = _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= from && t.CreatedAt <= to);

            if (branchId.HasValue)
                txQuery = txQuery.Where(t => t.BranchId == branchId);

            return await txQuery.SumAsync(t => (decimal?)t.Amount) ?? 0;
        }

        // ---- Hội viên check-in gần đây, kèm trạng thái gói (active/expiring/expired) ----
        public async Task<List<MemberCheckinRowDto>> GetRecentMembersWithStatusAsync(int? branchId, int take = 10)
        {
            var query = _context.CheckIns
                .Include(c => c.Member)
                .Include(c => c.MemberPackage)
                    .ThenInclude(mp => mp.Plan)
                .AsQueryable();

            if (branchId.HasValue)
                query = query.Where(c => c.BranchId == branchId);

            var checkins = await query
                .OrderByDescending(c => c.CheckInTime)
                .Take(take)
                .Select(c => new
                {
                    MemberName = c.Member.FullName,
                    PlanName = c.MemberPackage != null && c.MemberPackage.Plan != null ? c.MemberPackage.Plan.PlanName : "",
                    c.CheckInTime,
                    ExpiryDate = c.MemberPackage != null ? c.MemberPackage.ExpiryDate : null,
                    PackageStatus = c.MemberPackage != null ? c.MemberPackage.PackageStatus : null
                })
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.Today);

            return checkins.Select(c => new MemberCheckinRowDto
            {
                MemberName = c.MemberName,
                PlanName = c.PlanName,
                CheckInTime = c.CheckInTime,
                Status = ClassifyMemberStatus(c.PackageStatus, c.ExpiryDate, today)
            }).ToList();
        }

        private string ClassifyMemberStatus(string? packageStatus, DateOnly? expiryDate, DateOnly today)
        {
            if (packageStatus != "Active" || expiryDate == null) return "expired";
            if (expiryDate.Value < today) return "expired";
            if (expiryDate.Value.DayNumber - today.DayNumber <= 7) return "expiring";
            return "active";
        }

        // ---- Sự cố chưa xử lý (dựa trên bảng Incident) ----
        // TODO: xác nhận đúng chuỗi trạng thái "chưa xử lý" trong DB (đang giả định "Pending").
        public async Task<List<IssueRowDto>> GetUnresolvedIssuesAsync(int? branchId, int take = 10)
        {
            var query = _context.Incidents
                .Include(i => i.Equipment)
                .Include(i => i.ReportedByEmployee)
                .Include(i => i.ReportedByMember)
                .Where(i => i.Status == "Pending"); // TODO: đổi cho khớp giá trị thật trong DB

            if (branchId.HasValue)
                query = query.Where(i => i.BranchId == branchId);

            var incidents = await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(take)
                .ToListAsync();

            return incidents.Select(i => new IssueRowDto
            {
                IssueId = i.IncidentId,
                Title = i.Title,
                Description = i.Description,
                Area = i.Equipment?.EquipmentName ?? "Chung",
                Severity = InferSeverity(i.Equipment?.Status),
                Reporter = i.ReportedByEmployee != null
                    ? $"Nhân viên: {i.ReportedByEmployee.FullName}"
                    : i.ReportedByMember != null
                        ? $"Hội viên: {i.ReportedByMember.FullName}"
                        : "Hệ thống",
                Status = i.Status,
                CreatedAt = i.CreatedAt
            }).ToList();
        }

        // Suy luận mức độ ưu tiên từ trạng thái thiết bị liên quan (Incident chưa có cột Severity riêng)
        private string InferSeverity(string? equipmentStatus)
        {
            if (string.IsNullOrWhiteSpace(equipmentStatus)) return "medium";

            var s = equipmentStatus.Trim().ToLowerInvariant();
            if (s.Contains("ngừng") || s.Contains("hỏng")) return "high";
            if (s.Contains("bảo trì") || s.Contains("cần")) return "medium";
            return "low";
        }

        // ---- Tình trạng thiết bị (dựa trên bảng Equipment) ----
        public async Task<List<EquipmentRowDto>> GetEquipmentStatusAsync(int? branchId)
        {
            var query = _context.Equipment
                .Include(e => e.Category)
                .Include(e => e.Branch)
                .AsQueryable();

            if (branchId.HasValue)
                query = query.Where(e => e.BranchId == branchId);

            var equipmentList = await query
                .OrderBy(e => e.Category.CategoryName)
                .ThenBy(e => e.EquipmentName)
                .ToListAsync();

            return equipmentList.Select(e => new EquipmentRowDto
            {
                EquipmentId = e.EquipmentId,
                Name = e.EquipmentName,
                Category = e.Category?.CategoryName ?? "",
                Area = e.Branch?.BranchName ?? "",
                RawStatus = e.Status,
                Status = MapEquipmentTone(e.Status),
                Note = e.Description ?? "",
                ImageUrl = e.ImageUrl
            }).ToList();
        }

        // TODO: xác nhận đúng danh sách giá trị Status thật trong DB rồi chỉnh map này.
        private string MapEquipmentTone(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "ok";
            var s = status.Trim().ToLowerInvariant();

            if (s.Contains("ngừng") || s.Contains("hỏng") || s.Contains("dừng")) return "danger";
            if (s.Contains("bảo trì") || s.Contains("cần")) return "warn";
            return "ok"; // "Hoạt động tốt", "Đang sử dụng", v.v.
        }

        // ---- Gộp số liệu cho 3 vòng tròn (RingCluster) và 3 thẻ KPI ----
        // previousPeriodRevenue: doanh thu thực tế của kỳ liền trước (cùng độ dài kỳ đang xem),
        // dùng làm mốc so sánh thay cho mục tiêu hardcode cũ (assumedDailyGoal).
        private ManagerDashboardKpiDto BuildManagerKpi(
            List<RevenueTrendPointDto> revenueTrend,
            List<MemberCheckinRowDto> recentMembers,
            List<IssueRowDto> unresolvedIssues,
            List<EquipmentRowDto> equipmentStatus,
            decimal previousPeriodRevenue)
        {
            decimal totalRevenue = revenueTrend.Sum(r => r.Revenue);

            // Dùng đúng doanh thu kỳ trước để so sánh, thay vì chia đôi kỳ hiện tại
            int changePercent = (int)Math.Round(CalcPercentChange(previousPeriodRevenue, totalRevenue));

            int activeMembers = _context.MemberPackages
                .Where(mp => mp.PackageStatus == "Active")
                .Select(mp => mp.MemberId)
                .Distinct()
                .Count();

            int totalMembers = _context.MemberPackages
                .Select(mp => mp.MemberId)
                .Distinct()
                .Count();

            double activeRatio = totalMembers > 0 ? (double)activeMembers / totalMembers : 0;

            double revenueGoalProgress = previousPeriodRevenue > 0
                ? (double)(totalRevenue / previousPeriodRevenue)
                : (totalRevenue > 0 ? 1.0 : 0);

            return new ManagerDashboardKpiDto
            {
                TotalRevenue = totalRevenue,
                RevenueChangePercent = changePercent,
                ActiveMembersCount = activeMembers,
                UnresolvedIssuesCount = unresolvedIssues.Count,
                RevenueGoalProgress = revenueGoalProgress,
                ActiveMemberRatio = activeRatio,
                IssueResolvedRatio = 0
            };
        }

        // ====================== DASHBOARD TỔNG QUAN ADMIN (DashboardOverview.jsx) ======================

        /// <summary>
        /// Chỉ dùng cho Admin, luôn xem toàn hệ thống (không lọc branchId).
        /// </summary>
        public async Task<AdminOverviewDto> GetAdminOverviewAsync(AdminOverviewQueryDto query)
        {
            int months = Math.Clamp(query.Months <= 0 ? 6 : query.Months, 1, 24);

            return new AdminOverviewDto
            {
                Stats = await GetAdminStatsAsync(),
                RevenueByMonth = await GetRevenueByMonthAsync(months),
                MemberByBranch = await GetMemberByBranchAsync()
            };
        }

        // ---- 1. 4 thẻ thống kê trên đầu trang ----
        private async Task<AdminOverviewStatsDto> GetAdminStatsAsync()
        {
            var now = DateTime.Today;
            var firstDayThisMonth = new DateTime(now.Year, now.Month, 1);
            var firstDayLastMonth = firstDayThisMonth.AddMonths(-1);

            // --- Tổng hội viên + tăng trưởng so với tháng trước ---
            // TODO: xác nhận Members có cột CreatedAt để tính "hội viên mới" theo tháng.
            int totalMembers = await _context.Members.CountAsync();

            int membersUpToLastMonth = await _context.Members
                .CountAsync(m => m.CreatedAt < firstDayThisMonth);
            int membersUpToPrevMonth = await _context.Members
                .CountAsync(m => m.CreatedAt < firstDayLastMonth);

            double memberGrowthPct = CalcPercentChange(membersUpToPrevMonth, membersUpToLastMonth);

            // --- Doanh thu tháng hiện tại + tháng trước ---
            decimal revenueThisMonth = await _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= firstDayThisMonth)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            decimal revenueLastMonth = await _context.Transactions
                .Where(t => t.PaymentStatus == "Paid"
                         && t.CreatedAt >= firstDayLastMonth
                         && t.CreatedAt < firstDayThisMonth)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            double revenueGrowthPct = CalcPercentChange(revenueLastMonth, revenueThisMonth);

            // --- Số chi nhánh ---
            int branchCount = await _context.Branches.CountAsync();

            // --- Số nhân viên + tăng trưởng ---
            // TODO: xác nhận Employees có cột CreatedAt / HireDate để tính tăng trưởng theo tháng.
            int employeeCount = await _context.Employees.CountAsync();
            int employeesUpToLastMonth = await _context.Employees
                .CountAsync(e => e.CreatedAt < firstDayThisMonth);
            int employeesUpToPrevMonth = await _context.Employees
                .CountAsync(e => e.CreatedAt < firstDayLastMonth);
            double employeeGrowthPct = CalcPercentChange(employeesUpToPrevMonth, employeesUpToLastMonth);

            return new AdminOverviewStatsDto
            {
                TotalMembers = totalMembers,
                TotalMembersChangePercent = memberGrowthPct,
                MonthlyRevenue = revenueThisMonth,
                MonthlyRevenueChangePercent = revenueGrowthPct,
                BranchCount = branchCount,
                EmployeeCount = employeeCount,
                EmployeeChangePercent = employeeGrowthPct
            };
        }

        // ---- 2. Doanh thu N tháng gần nhất (cho RevenueChart) ----
        private async Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(int months)
        {
            var now = DateTime.Today;
            var fromMonth = new DateTime(now.Year, now.Month, 1).AddMonths(-(months - 1));

            var transactions = await _context.Transactions
                .Where(t => t.PaymentStatus == "Paid" && t.CreatedAt >= fromMonth)
                .Select(t => new { t.CreatedAt, t.Amount })
                .ToListAsync();

            var result = new List<RevenueByMonthDto>();
            for (int i = 0; i < months; i++)
            {
                var monthDate = fromMonth.AddMonths(i);
                decimal revenue = transactions
                    .Where(t => t.CreatedAt.Year == monthDate.Year && t.CreatedAt.Month == monthDate.Month)
                    .Sum(t => t.Amount);

                result.Add(new RevenueByMonthDto
                {
                    MonthLabel = $"Tháng {monthDate.Month}",
                    Year = monthDate.Year,
                    Month = monthDate.Month,
                    Revenue = revenue
                });
            }
            return result;
        }

        // ---- 3. Số hội viên theo chi nhánh (cho BranchDonut) ----
        // TODO: xác nhận Member có cột BranchId trực tiếp. Nếu không, đổi sang đếm
        // theo MemberPackages (distinct MemberId theo BranchId) như dưới đây (bản dự phòng).
        private async Task<List<MemberByBranchDto>> GetMemberByBranchAsync()
        {
            var branches = await _context.Branches.ToListAsync();

            var counts = await _context.MemberPackages
                .Select(mp => new { mp.BranchId, mp.MemberId })
                .Distinct()
                .GroupBy(mp => mp.BranchId)
                .Select(g => new { BranchId = g.Key, Count = g.Select(x => x.MemberId).Distinct().Count() })
                .ToListAsync();

            int total = counts.Sum(c => c.Count);

            return branches.Select(b =>
            {
                var count = counts.FirstOrDefault(c => c.BranchId == b.BranchId)?.Count ?? 0;
                return new MemberByBranchDto
                {
                    BranchName = b.BranchName,
                    MemberCount = count,
                    Percent = total > 0 ? Math.Round((double)count / total * 100, 1) : 0
                };
            })
            .OrderByDescending(b => b.MemberCount)
            .ToList();
        }
    }
}