using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Thông báo đẩy gửi đến hội viên theo đối tượng
/// </summary>
public partial class Notification
{
    /// <summary>
    /// Mã thông báo — khóa chính tự tăng
    /// </summary>
    public long NotificationId { get; set; }

    /// <summary>
    /// Tiêu đề ngắn gọn của thông báo
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// Nội dung đầy đủ của thông báo
    /// </summary>
    public string Content { get; set; } = null!;

    /// <summary>
    /// Đối tượng nhận: All=toàn bộ hội viên, ByBranch=theo chi nhánh, ByGroup=theo nhóm
    /// </summary>
    public string SendType { get; set; } = null!;

    /// <summary>
    /// Chi nhánh nhận thông báo — FK tới branches.branch_id. Bắt buộc khi send_type = ByBranch, NULL trong trường hợp khác
    /// </summary>
    public int? BranchId { get; set; }

    /// <summary>
    /// Nhóm nhận thông báo — FK tới member_groups.group_id. Bắt buộc khi send_type = ByGroup, NULL trong trường hợp khác
    /// </summary>
    public int? GroupId { get; set; }

    /// <summary>
    /// Quản lý tạo thông báo — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    /// <summary>
    /// Thời điểm hẹn gửi thông báo
    /// </summary>
    public DateTime ScheduledAt { get; set; }

    /// <summary>
    /// 0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job
    /// </summary>
    public bool IsSent { get; set; }

    /// <summary>
    /// Thời điểm tạo thông báo
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual Branch? Branch { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;

    public virtual MemberGroup? Group { get; set; }

    public virtual ICollection<NotificationRecipient> NotificationRecipients { get; set; } = new List<NotificationRecipient>();
}
