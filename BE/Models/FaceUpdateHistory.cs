using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử mỗi lần cập nhật khuôn mặt hội viên
/// </summary>
public partial class FaceUpdateHistory
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long HistoryId { get; set; }

    /// <summary>
    /// Hội viên được cập nhật khuôn mặt — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Face ID cũ trên AWS — NULL nếu đây là lần đăng ký đầu tiên
    /// </summary>
    public string? OldFaceIdAws { get; set; }

    /// <summary>
    /// Face ID mới trên AWS sau khi cập nhật
    /// </summary>
    public string NewFaceIdAws { get; set; } = null!;

    /// <summary>
    /// Lý do thay đổi khuôn mặt, VD: ảnh cũ không rõ, hội viên yêu cầu
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// Nhân viên thực hiện thao tác — FK tới employees.employee_id
    /// </summary>
    public long PerformedBy { get; set; }

    /// <summary>
    /// Thời điểm thực hiện thay đổi
    /// </summary>
    public DateTime PerformedAt { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual Employee PerformedByNavigation { get; set; } = null!;
}
