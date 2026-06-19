using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Danh sách hội viên nhận từng thông báo và trạng thái đã đọc
/// </summary>
public partial class NotificationRecipient
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Thông báo được gửi — FK tới notifications.notification_id
    /// </summary>
    public long NotificationId { get; set; }

    /// <summary>
    /// Hội viên nhận thông báo — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// 0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo
    /// </summary>
    public bool IsRead { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual Notification Notification { get; set; } = null!;
}
