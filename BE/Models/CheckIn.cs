using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử check-in và check-out của hội viên tại các chi nhánh
/// </summary>
public partial class CheckIn
{
    /// <summary>
    /// Mã lần check-in — khóa chính tự tăng
    /// </summary>
    public long CheckInId { get; set; }

    /// <summary>
    /// Hội viên check in — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Gói tập đang còn hiệu lực tại thời điểm check in — FK tới member_packages.member_package_id
    /// </summary>
    public long MemberPackageId { get; set; }

    /// <summary>
    /// Chi nhánh hội viên vào tập — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Thời điểm hội viên vào tập
    /// </summary>
    public DateTime CheckInTime { get; set; }

    /// <summary>
    /// Thời điểm hội viên ra về. NULL = chưa check out hoặc không xác định được
    /// </summary>
    public DateTime? CheckOutTime { get; set; }

    /// <summary>
    /// Phương thức check in: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công
    /// </summary>
    public string Method { get; set; } = null!;

    /// <summary>
    /// Nhân viên thực hiện check in thủ công — FK tới employees.employee_id. NULL nếu method = Auto
    /// </summary>
    public long? StaffId { get; set; }

    /// <summary>
    /// Lý do check in thủ công, VD: camera lỗi, hội viên chưa đăng ký khuôn mặt. Bắt buộc khi method = Manual
    /// </summary>
    public string? ManualReason { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;

    public virtual MemberPackage MemberPackage { get; set; } = null!;

    public virtual Employee? Staff { get; set; }
}
