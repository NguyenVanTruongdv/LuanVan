using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thông báo nhắc hội viên khi gói tập sắp hết hạn — do background job tự sinh
/// </summary>
public partial class Notification
{
    /// <summary>
    /// Mã thông báo — khóa chính tự tăng
    /// </summary>
    public long NotificationId { get; set; }

    /// <summary>
    /// Hội viên nhận thông báo — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Gói tập sắp hết hạn tương ứng — FK tới member_packages.member_package_id
    /// </summary>
    public long MemberPackageId { get; set; }

    /// <summary>
    /// Số ngày còn lại trước khi hết hạn tại thời điểm gửi, VD: 7, 3, 1, 0
    /// </summary>
    public short DaysBeforeExpiry { get; set; }

    /// <summary>
    /// Tiêu đề thông báo, VD: Gói tập của bạn sắp hết hạn
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// Nội dung chi tiết thông báo
    /// </summary>
    public string Content { get; set; } = null!;

    /// <summary>
    /// Thời điểm hẹn gửi thông báo
    /// </summary>
    public DateTime ScheduledAt { get; set; }

    /// <summary>
    /// 0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job
    /// </summary>
    public bool IsSent { get; set; }

    /// <summary>
    /// Thời điểm thực tế đã gửi
    /// </summary>
    public DateTime? SentAt { get; set; }

    /// <summary>
    /// 0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Thời điểm tạo thông báo
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual MemberPackage MemberPackage { get; set; } = null!;
}
