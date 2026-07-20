using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Hồ sơ nhân viên — thông tin đăng nhập nằm ở bảng accounts
/// </summary>
public partial class Employee
{
    public long EmployeeId { get; set; }

    public string FullName { get; set; } = null!;

    public string Gender { get; set; } = null!;

    /// <summary>
    /// Trạng thái làm việc của nhân viên: Active = đang làm việc, Inactive = đã nghỉ việc/ngưng hoạt động
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// FK tới roles.role_id
    /// </summary>
    public sbyte RoleId { get; set; }

    /// <summary>
    /// Nhân viên tạo tài khoản này — tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên
    /// </summary>
    public long? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Account? Account { get; set; }

    public virtual ICollection<CheckIn> CheckInCheckOutStaffs { get; set; } = new List<CheckIn>();

    public virtual ICollection<CheckIn> CheckInStaffs { get; set; } = new List<CheckIn>();

    public virtual Employee? CreatedByNavigation { get; set; }

    public virtual ICollection<EmployeeBranch> EmployeeBranches { get; set; } = new List<EmployeeBranch>();

    public virtual ICollection<FaceDatum> FaceData { get; set; } = new List<FaceDatum>();

    public virtual ICollection<FaceUpdateHistory> FaceUpdateHistories { get; set; } = new List<FaceUpdateHistory>();

    public virtual ICollection<HomeImage> HomeImages { get; set; } = new List<HomeImage>();

    public virtual ICollection<Incident> IncidentApprovedByNavigations { get; set; } = new List<Incident>();

    public virtual ICollection<Incident> IncidentReportedByEmployees { get; set; } = new List<Incident>();

    public virtual ICollection<Employee> InverseCreatedByNavigation { get; set; } = new List<Employee>();

    public virtual ICollection<MemberUpdateLog> MemberUpdateLogs { get; set; } = new List<MemberUpdateLog>();

    public virtual ICollection<Member> Members { get; set; } = new List<Member>();

    public virtual ICollection<News> News { get; set; } = new List<News>();

    public virtual ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<TransactionAdjustmentLog> TransactionAdjustmentLogs { get; set; } = new List<TransactionAdjustmentLog>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
