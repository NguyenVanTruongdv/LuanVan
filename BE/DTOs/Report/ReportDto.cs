namespace BE.DTOs;

// ===================== CONTEXT DÙNG CHUNG =====================
public class BranchReportContextDto
{
    public List<int> BranchIds { get; set; } = new();
    public List<string> BranchNames { get; set; } = new();
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
}

// ===================== DOANH THU (TỔNG QUAN) =====================
public class RevenueReportDto
{
    public BranchReportContextDto Context { get; set; } = new();

    public decimal TotalRevenue { get; set; }
    public int TotalTransactions { get; set; }
    public decimal AverageTransactionValue { get; set; }

    public decimal PreviousPeriodRevenue { get; set; }
    public double GrowthPercentage { get; set; }

    public List<RevenueByPlanDto> RevenueByPlan { get; set; } = new();
    public List<RevenueByMethodDto> RevenueByPaymentMethod { get; set; } = new();
    public List<RevenueByBranchDto> RevenueByBranch { get; set; } = new();

    // Trend theo ngày (giữ lại để tương thích ngược)
    public List<RevenueTrendPointDto> Trend { get; set; } = new();

    // Bổ sung: chi tiết theo ngày / theo tháng
    public List<RevenueByDayDto> RevenueByDay { get; set; } = new();
    public List<RevenueByMonthDto> RevenueByMonth { get; set; } = new();
}

public class RevenueByPlanDto
{
    public string PlanName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
}

public class RevenueByMethodDto
{
    public string Method { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
}

public class RevenueByBranchDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
    public decimal AverageTransactionValue { get; set; }
}

public class RevenueTrendPointDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
}

// ---- Doanh thu theo ngày ----
public class RevenueByDayDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
}

// ---- Doanh thu theo tháng ----
public class RevenueByMonthDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthLabel => $"{Month:D2}/{Year}";
    public decimal Revenue { get; set; }
    public int TransactionCount { get; set; }
}

// Report doanh thu theo chi nhánh dạng độc lập (kèm breakdown ngày/tháng cho từng chi nhánh nếu cần)
public class RevenueByBranchReportDto
{
    public BranchReportContextDto Context { get; set; } = new();
    public List<RevenueByBranchDto> Branches { get; set; } = new();
}

// ===================== HỘI VIÊN =====================
public class MemberReportDto
{
    public BranchReportContextDto Context { get; set; } = new();

    public int TotalMembers { get; set; }         // hội viên có ít nhất 1 gói tại các chi nhánh này
    public int ActiveMembers { get; set; }         // đang có gói package_status = Active
    public int ExpiredMembers { get; set; }
    public int NewMembersInPeriod { get; set; }    // hội viên mua gói đầu tiên tại chi nhánh trong kỳ
    public int ExpiringSoonCount { get; set; }     // gói active hết hạn trong 7 ngày tới

    public double RetentionRatePercentage { get; set; }

    public List<MemberByPlanDto> MembersByPlan { get; set; } = new();
    public List<ExpiringMemberDto> ExpiringSoon { get; set; } = new();
}

public class MemberByPlanDto
{
    public string PlanName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
}

public class ExpiringMemberDto
{
    public long MemberId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public int BranchId { get; set; }
}

// ---- Tổng hội viên + tổng check-in theo chi nhánh ----
public class MemberSummaryReportDto
{
    public BranchReportContextDto Context { get; set; } = new();

    public int TotalMembers { get; set; }          // tổng hội viên thuộc các chi nhánh quản lý
    public int TotalActiveMembers { get; set; }
    public int TotalCheckIns { get; set; }         // tổng lượt check-in trong kỳ (tất cả chi nhánh)

    public List<MemberCountByBranchDto> MembersByBranch { get; set; } = new();
    public List<CheckInByBranchDto> CheckInsByBranch { get; set; } = new();
}

public class MemberCountByBranchDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int ActiveMemberCount { get; set; }
}

public class CheckInByBranchDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int CheckInCount { get; set; }
    public int UniqueMemberCount { get; set; }
}

// ===================== THIẾT BỊ =====================
public class EquipmentReportDto
{
    public BranchReportContextDto Context { get; set; } = new();

    public int TotalEquipment { get; set; }
    public int ActiveCount { get; set; }
    public int DeletedCount { get; set; }

    public int IncidentCountInPeriod { get; set; }
    public List<IncidentByStatusDto> IncidentsByStatus { get; set; } = new();

    public List<EquipmentByCategoryDto> EquipmentByCategory { get; set; } = new();
    public List<EquipmentIncidentFrequencyDto> MostIncidentProneEquipment { get; set; } = new();
    public List<PendingIncidentDto> PendingApprovalIncidents { get; set; } = new();

    // Bổ sung: thiết bị theo chi nhánh
    public List<EquipmentByBranchDto> EquipmentByBranch { get; set; } = new();
}

public class IncidentByStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class EquipmentByCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class EquipmentIncidentFrequencyDto
{
    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = string.Empty;
    public int IncidentCount { get; set; }
}

public class PendingIncidentDto
{
    public int IncidentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? EquipmentName { get; set; }
    public DateTime CreatedAt { get; set; }
    public int BranchId { get; set; }
}

// ---- Thiết bị theo chi nhánh (report độc lập) ----
public class EquipmentByBranchDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int TotalEquipment { get; set; }
    public int ActiveCount { get; set; }
    public int DeletedCount { get; set; }
    public int IncidentCountInPeriod { get; set; }
    public int PendingApprovalIncidentCount { get; set; }
}

public class EquipmentByBranchReportDto
{
    public BranchReportContextDto Context { get; set; } = new();
    public List<EquipmentByBranchDto> Branches { get; set; } = new();
}