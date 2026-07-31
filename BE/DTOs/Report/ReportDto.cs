using System;
using System.Collections.Generic;

namespace BE.Services.Reports;

/// <summary>
/// Bộ lọc dùng chung cho mọi báo cáo.
/// Nếu FromDate/ToDate = null thì service sẽ tự lấy mặc định (30 ngày gần nhất).
/// BranchId = null nghĩa là xem tất cả chi nhánh.
/// </summary>
public class ReportFilter
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    /// <summary>Chi nhánh cụ thể người dùng chọn để xem báo cáo (null = không chọn cụ thể).</summary>
    public int? BranchId { get; set; }

    /// <summary>
    /// Danh sách chi nhánh mà người dùng ĐƯỢC PHÉP xem (áp dụng cho Quản lý — chỉ các chi nhánh họ quản lý).
    /// null = không giới hạn (dùng cho Admin). Controller là nơi tính toán và gán giá trị này,
    /// KHÔNG lấy trực tiếp từ input của người dùng.
    /// </summary>
    public List<int>? AllowedBranchIds { get; set; }
}

// ================= THU NGÂN (CASHIER) =================

public class MemberSummaryReportDto
{
    public int TotalMembers { get; set; }
    public int NewMembersInRange { get; set; }
    public int ActiveMembers { get; set; }
    public int PendingActivationMembers { get; set; }
    public int SuspendedMembers { get; set; }
    public List<DailyCountDto> NewMembersByDay { get; set; } = new();
}

public class CheckInReportDto
{
    public int TotalCheckIns { get; set; }
    public int AutoCheckIns { get; set; }
    public int ManualCheckIns { get; set; }
    public int CurrentlyCheckedIn { get; set; } // chưa check-out
    public List<DailyCountDto> CheckInsByDay { get; set; } = new();
    public List<BranchCountDto> CheckInsByBranch { get; set; } = new();
}

public class RevenueReportDto
{
    public decimal TotalRevenue { get; set; }        // các giao dịch PaymentStatus = Paid
    public decimal TotalOriginalPrice { get; set; }   // tổng gia_goc trước giảm giá
    public decimal TotalDiscount { get; set; }        // chênh lệch gia_goc - amount
    public int TotalPaidTransactions { get; set; }
    public int TotalPendingTransactions { get; set; }
    public int TotalCancelledTransactions { get; set; }
    public List<DailyRevenueDto> RevenueByDay { get; set; } = new();
    public List<BranchRevenueDto> RevenueByBranch { get; set; } = new();
    public List<PlanRevenueDto> RevenueByPlan { get; set; } = new();
    public List<PaymentMethodRevenueDto> RevenueByPaymentMethod { get; set; } = new();
}

public class CashierDashboardDto
{
    public MemberSummaryReportDto MemberReport { get; set; } = new();
    public CheckInReportDto CheckInReport { get; set; } = new();
    public RevenueReportDto RevenueReport { get; set; } = new();
}

// ================= QUẢN LÝ / ADMIN =================

public class EmployeeReportDto
{
    public int TotalEmployees { get; set; }
    public int ActiveEmployees { get; set; }
    public int InactiveEmployees { get; set; }
    public int NewEmployeesInRange { get; set; }
    public List<RoleCountDto> EmployeesByRole { get; set; } = new();
    public List<BranchCountDto> EmployeesByBranch { get; set; } = new();
}

public class IncidentReportDto
{
    public int TotalIncidents { get; set; }
    public int PendingApproval { get; set; }
    public int Approved { get; set; }
    public int Completed { get; set; }
    public int Cancelled { get; set; }
    public List<DailyCountDto> IncidentsByDay { get; set; } = new();
    public List<BranchCountDto> IncidentsByBranch { get; set; } = new();
    public List<EquipmentIncidentCountDto> TopEquipmentByIncidents { get; set; } = new();
}

public class EquipmentReportDto
{
    public int TotalEquipment { get; set; }
    public int ActiveEquipment { get; set; }
    public int DeletedEquipment { get; set; }
    public List<CategoryCountDto> EquipmentByCategory { get; set; } = new();
    public List<BranchCountDto> EquipmentByBranch { get; set; } = new();
}

public class ManagerDashboardDto
{
    public MemberSummaryReportDto MemberReport { get; set; } = new();
    public EmployeeReportDto EmployeeReport { get; set; } = new();
    public IncidentReportDto IncidentReport { get; set; } = new();
    public EquipmentReportDto EquipmentReport { get; set; } = new();
    public RevenueReportDto RevenueReport { get; set; } = new();
}

/// <summary>Dùng để hiển thị danh sách chi nhánh cho dropdown lọc báo cáo.</summary>
public class BranchListItemDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
}

// ================= DTO nhỏ dùng chung =================

public class DailyCountDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

public class DailyRevenueDto
{
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public int TransactionCount { get; set; }
}

public class BranchCountDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class BranchRevenueDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class PlanRevenueDto
{
    public int PlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int TransactionCount { get; set; }
}

public class PaymentMethodRevenueDto
{
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int TransactionCount { get; set; }
}

public class RoleCountDto
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CategoryCountDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class EquipmentIncidentCountDto
{
    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = string.Empty;
    public int IncidentCount { get; set; }
}