using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Refresh token — dữ liệu tạm thời, không cần seed
/// </summary>
public partial class RefreshToken
{
    public long TokenId { get; set; }

    /// <summary>
    /// Tài khoản sở hữu token — FK tới accounts.account_id
    /// </summary>
    public long AccountId { get; set; }

    /// <summary>
    /// Role tại thời điểm đăng nhập, VD: Member, Staff, Manager, Admin
    /// </summary>
    public string Role { get; set; } = null!;

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Account Account { get; set; } = null!;
}
