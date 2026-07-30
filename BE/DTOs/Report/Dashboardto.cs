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

// ====================== DTO trả về cho FE — CASHIER ======================

public class CashierDashboardStatsDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public decimal AvgOrder { get; set; }

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

// ====================== DTO cho DASHBOARD QUẢN LÝ (MANAGER MỚI) ======================

public class ManagerDashboardQueryDto
{
    // "today" | "7d" | "30d" | "custom"
    public string Range { get; set; } = "7d";
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
}

public class RevenueTrendPointDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
}

public class MemberCheckinRowDto
{
    public string MemberName { get; set; } = "";
    public string PlanName { get; set; } = "";
    public DateTime CheckInTime { get; set; }
    // "active" | "expiring" | "expired"
    public string Status { get; set; } = "";
}

public class IssueRowDto
{
    public int IssueId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Area { get; set; } = "";       // tên thiết bị liên quan (nếu có)
    public string Severity { get; set; } = "";   // "high" | "medium" | "low" — suy luận, xem InferSeverity
    public string Reporter { get; set; } = "";
    public string Status { get; set; } = "";     // Pending | Approved | Rejected — TODO: xác nhận giá trị thật
    public DateTime CreatedAt { get; set; }
}

public class EquipmentRowDto
{
    public int EquipmentId { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Area { get; set; } = "";       // tên chi nhánh
    public string RawStatus { get; set; } = "";  // giá trị gốc trong DB, để FE debug nếu cần
    public string Status { get; set; } = "";     // "ok" | "warn" | "danger" — map cho FE
    public string Note { get; set; } = "";
    public string? ImageUrl { get; set; }
}

public class ManagerDashboardKpiDto
{
    public decimal TotalRevenue { get; set; }
    public int RevenueChangePercent { get; set; }
    public int ActiveMembersCount { get; set; }
    public int UnresolvedIssuesCount { get; set; }

    // dữ liệu cho 3 ring trên FE (RingCluster), giá trị 0..1
    public double RevenueGoalProgress { get; set; }
    public double ActiveMemberRatio { get; set; }
    public double IssueResolvedRatio { get; set; }
}

public class ManagerDashboardDto
{
    public string BranchName { get; set; } = ""; // "Toàn hệ thống" nếu branchId = null (Admin xem)
    public ManagerDashboardKpiDto Kpi { get; set; } = new();
    public List<RevenueTrendPointDto> RevenueTrend { get; set; } = new();
    public List<MemberCheckinRowDto> RecentMembers { get; set; } = new();
    public List<IssueRowDto> UnresolvedIssues { get; set; } = new();
    public List<EquipmentRowDto> EquipmentStatus { get; set; } = new();
}
// ====================== DTO cho DASHBOARD TỔNG QUAN ADMIN (trang DashboardOverview.jsx) ======================

public class AdminOverviewQueryDto
{
    // Số tháng lấy cho biểu đồ doanh thu, mặc định 6
    public int Months { get; set; } = 6;
}

public class AdminOverviewStatsDto
{
    public int TotalMembers { get; set; }
    public double TotalMembersChangePercent { get; set; } // so với tháng trước

    public decimal MonthlyRevenue { get; set; } // doanh thu tháng hiện tại
    public double MonthlyRevenueChangePercent { get; set; } // so với tháng trước

    public int BranchCount { get; set; }

    public int EmployeeCount { get; set; }
    public double EmployeeChangePercent { get; set; } // so với tháng trước
}

public class RevenueByMonthDto
{
    public string MonthLabel { get; set; } = ""; // "Tháng 1", "Tháng 2", ...
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Revenue { get; set; }
}

public class MemberByBranchDto
{
    public string BranchName { get; set; } = "";
    public int MemberCount { get; set; }
    public double Percent { get; set; } // 0..100, để FE hiển thị pct trên legend
}

public class AdminOverviewDto
{
    public AdminOverviewStatsDto Stats { get; set; } = new();
    public List<RevenueByMonthDto> RevenueByMonth { get; set; } = new();
    public List<MemberByBranchDto> MemberByBranch { get; set; } = new();
}