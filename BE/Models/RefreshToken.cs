using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Refresh token cho hội viên và nhân viên
/// </summary>
public partial class RefreshToken
{
    /// <summary>
    /// Mã token — khóa chính tự tăng
    /// </summary>
    public long TokenId { get; set; }

    /// <summary>
    /// ID của tài khoản sở hữu token (member_id hoặc employee_id)
    /// </summary>
    public long EntityId { get; set; }

    /// <summary>
    /// Loại tài khoản sở hữu token
    /// </summary>
    public string EntityType { get; set; } = null!;

    /// <summary>
    /// Role tại thời điểm đăng nhập
    /// </summary>
    public string Role { get; set; } = null!;

    /// <summary>
    /// SHA-256 hash của refresh token
    /// </summary>
    public string TokenHash { get; set; } = null!;

    /// <summary>
    /// Thời điểm token hết hạn
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Thời điểm token bị thu hồi
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Thời điểm tạo token
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
