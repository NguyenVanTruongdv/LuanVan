using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Nhóm hội viên dùng để gửi thông báo theo nhóm (ByGroup)
/// </summary>
public partial class MemberGroup
{
    /// <summary>
    /// Mã nhóm — khóa chính tự tăng
    /// </summary>
    public int GroupId { get; set; }

    /// <summary>
    /// Tên nhóm hội viên, VD: Khách VIP, Học sinh sinh viên
    /// </summary>
    public string GroupName { get; set; } = null!;

    /// <summary>
    /// Mô tả mục đích hoặc tiêu chí của nhóm
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Nhân viên tạo nhóm — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    /// <summary>
    /// Thời điểm tạo nhóm
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<MemberGroupMember> MemberGroupMembers { get; set; } = new List<MemberGroupMember>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
