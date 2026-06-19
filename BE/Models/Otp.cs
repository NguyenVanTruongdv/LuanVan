using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Mã OTP xác thực một lần gửi qua SMS
/// </summary>
public partial class Otp
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long OtpId { get; set; }

    /// <summary>
    /// Số điện thoại nhận OTP
    /// </summary>
    public string Phone { get; set; } = null!;

    /// <summary>
    /// Mã OTP gửi cho người dùng (lưu dạng hash nếu cần bảo mật cao hơn)
    /// </summary>
    public string OtpCode { get; set; } = null!;

    /// <summary>
    /// Mục đích: DangKy=đăng ký mới, QuenMatKhau=đặt lại mật khẩu, DoiSoDienThoai=xác nhận đổi số
    /// </summary>
    public string Purpose { get; set; } = null!;

    /// <summary>
    /// Thời điểm OTP hết hạn — thường 5 phút kể từ lúc tạo
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Số lần nhập sai liên tiếp — ứng dụng khóa sau N lần
    /// </summary>
    public sbyte FailedAttempts { get; set; }

    /// <summary>
    /// 0 = chưa dùng, 1 = đã dùng thành công
    /// </summary>
    public bool IsUsed { get; set; }

    /// <summary>
    /// Thời điểm tạo và gửi OTP
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
