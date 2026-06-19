using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử thay đổi số điện thoại hội viên — chỉ Manager thực hiện được
/// </summary>
public partial class PhoneChangeLog
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long LogId { get; set; }

    /// <summary>
    /// Hội viên được đổi số điện thoại — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Số điện thoại cũ trước khi thay đổi
    /// </summary>
    public string OldPhone { get; set; } = null!;

    /// <summary>
    /// Số điện thoại mới sau khi thay đổi
    /// </summary>
    public string NewPhone { get; set; } = null!;

    /// <summary>
    /// Quản lý thực hiện đổi số — FK tới employees.employee_id
    /// </summary>
    public long ChangedBy { get; set; }

    /// <summary>
    /// Thời điểm thực hiện đổi số điện thoại
    /// </summary>
    public DateTime ChangedAt { get; set; }

    public virtual Employee ChangedByNavigation { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
