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

    public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual Employee? CreatedByNavigation { get; set; }

    public virtual ICollection<FaceDatum> FaceData { get; set; } = new List<FaceDatum>();

    public virtual ICollection<FaceUpdateHistory> FaceUpdateHistories { get; set; } = new List<FaceUpdateHistory>();

    public virtual ICollection<IncidentAssignment> IncidentAssignmentManagers { get; set; } = new List<IncidentAssignment>();

    public virtual ICollection<IncidentAssignment> IncidentAssignmentTechnicians { get; set; } = new List<IncidentAssignment>();

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();

    public virtual ICollection<Employee> InverseCreatedByNavigation { get; set; } = new List<Employee>();

    public virtual ICollection<MemberGroup> MemberGroups { get; set; } = new List<MemberGroup>();

    public virtual ICollection<Member> Members { get; set; } = new List<Member>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<PhoneChangeLog> PhoneChangeLogs { get; set; } = new List<PhoneChangeLog>();

    public virtual ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();

    public virtual Role Role { get; set; } = null!;
}
