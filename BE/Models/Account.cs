using System;
using System.Collections.Generic;

namespace BE.Models;

public partial class Account
{
    /// <summary>
    /// Mã tài khoản — khóa chính tự tăng
    /// </summary>
    public long AccountId { get; set; }

    public string Username { get; set; } = null!;

    /// <summary>
    /// Hội viên sở hữu tài khoản — FK tới members.member_id. NULL nếu đây là tài khoản nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên sở hữu tài khoản — FK tới employees.employee_id. NULL nếu đây là tài khoản hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    /// <summary>
    /// Mật khẩu đã mã hóa bcrypt, không lưu bản rõ
    /// </summary>
    public string PasswordHash { get; set; } = null!;

    public long RoleId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual Role Role { get; set; } = null!;
}
