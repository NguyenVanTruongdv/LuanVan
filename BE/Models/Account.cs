using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Tài khoản đăng nhập dùng chung cho hội viên và nhân viên
/// </summary>
public partial class Account
{
    /// <summary>
    /// Mã tài khoản — khóa chính tự tăng
    /// </summary>
    public long AccountId { get; set; }

    /// <summary>
    /// Hội viên sở hữu tài khoản — FK tới members.member_id. NULL nếu đây là tài khoản nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên sở hữu tài khoản — FK tới employees.employee_id. NULL nếu đây là tài khoản hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    /// <summary>
    /// Số điện thoại — dùng làm tên đăng nhập, duy nhất toàn hệ thống
    /// </summary>
    public string Phone { get; set; } = null!;

    /// <summary>
    /// Email, dùng khôi phục mật khẩu/nhận thông báo, có thể NULL nhưng phải duy nhất nếu có
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Mật khẩu đã mã hóa bcrypt, không lưu bản rõ
    /// </summary>
    public string PasswordHash { get; set; } = null!;

    /// <summary>
    /// Trạng thái đăng nhập: Active = được phép đăng nhập, Suspended = bị khóa
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Lý do khóa — bắt buộc điền khi status = Suspended
    /// </summary>
    public string? SuspendReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
