using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Tài khoản nhân viên vận hành phòng gym
/// </summary>
public partial class Employee
{
    /// <summary>
    /// Mã nhân viên — khóa chính tự tăng
    /// </summary>
    public long EmployeeId { get; set; }

    /// <summary>
    /// Họ và tên đầy đủ của nhân viên
    /// </summary>
    public string FullName { get; set; } = null!;

    /// <summary>
    /// Số điện thoại — dùng làm tên đăng nhập, phải duy nhất
    /// </summary>
    public string Phone { get; set; } = null!;

    /// <summary>
    /// Địa chỉ email của nhân viên, dùng để nhận thông báo/khôi phục mật khẩu, có thể NULL nhưng phải duy nhất nếu có
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Mật khẩu đã mã hóa bcrypt, không lưu bản rõ
    /// </summary>
    public string PasswordHash { get; set; } = null!;

    /// <summary>
    /// Giới tính của nhân viên
    /// </summary>
    public string Gender { get; set; } = null!;

    /// <summary>
    /// Vai trò của nhân viên — FK tới roles.role_id
    /// </summary>
    public sbyte RoleId { get; set; }

    /// <summary>
    /// Trạng thái tài khoản: Active = đang hoạt động, Suspended = bị tạm khóa
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Lý do tạm khóa — bắt buộc điền khi status = Suspended
    /// </summary>
    public string? SuspendReason { get; set; }

    /// <summary>
    /// Nhân viên tạo tài khoản này — FK tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên
    /// </summary>
    public long? CreatedBy { get; set; }

    /// <summary>
    /// Thời điểm tạo tài khoản
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<AccountLockLog> AccountLockLogEmployees { get; set; } = new List<AccountLockLog>();

    public virtual ICollection<AccountLockLog> AccountLockLogPerformedByNavigations { get; set; } = new List<AccountLockLog>();

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
