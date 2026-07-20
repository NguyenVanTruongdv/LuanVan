using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Mã OTP xác thực một lần — dữ liệu tạm thời, không cần seed
/// </summary>
public partial class Otp
{
    public long OtpId { get; set; }

    public string Phone { get; set; } = null!;

    public string OtpCode { get; set; } = null!;

    public string Purpose { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public sbyte FailedAttempts { get; set; }

    public bool IsUsed { get; set; }

    public DateTime CreatedAt { get; set; }
}
