using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Hội viên phòng gym
/// </summary>
public partial class Member
{
    /// <summary>
    /// Mã hội viên — khóa chính tự tăng
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Họ và tên đầy đủ của hội viên
    /// </summary>
    public string FullName { get; set; } = null!;

    /// <summary>
    /// Số điện thoại — dùng làm tên đăng nhập, phải duy nhất
    /// </summary>
    public string Phone { get; set; } = null!;

    /// <summary>
    /// Mật khẩu đã mã hóa bcrypt, không lưu bản rõ
    /// </summary>
    public string PasswordHash { get; set; } = null!;

    /// <summary>
    /// Giới tính của hội viên
    /// </summary>
    public string Gender { get; set; } = null!;

    /// <summary>
    /// Chi nhánh hội viên đăng ký — FK tới branches.branch_id, NULL nếu chưa gán
    /// </summary>
    public int? BranchId { get; set; }

    /// <summary>
    /// Trạng thái tài khoản: PendingActivation=chờ kích hoạt, Active=đang hoạt động, Expired=hết hạn, Suspended=bị khóa
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Lý do tạm khóa — bắt buộc điền khi status = Suspended
    /// </summary>
    public string? SuspendReason { get; set; }

    /// <summary>
    /// Ghi chú nội bộ dành cho nhân viên, hội viên không thấy
    /// </summary>
    public string? InternalNotes { get; set; }

    /// <summary>
    /// Nhân viên tạo tài khoản hội viên này — FK tới employees.employee_id
    /// </summary>
    public long? CreatedBy { get; set; }

    /// <summary>
    /// Thời điểm tạo tài khoản
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<AccountLockLog> AccountLockLogs { get; set; } = new List<AccountLockLog>();

    public virtual Branch? Branch { get; set; }

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual Employee? CreatedByNavigation { get; set; }

    public virtual FaceDatum? FaceDatum { get; set; }

    public virtual ICollection<FaceUpdateHistory> FaceUpdateHistories { get; set; } = new List<FaceUpdateHistory>();

    public virtual ICollection<MemberGroupMember> MemberGroupMembers { get; set; } = new List<MemberGroupMember>();

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<MemberUpdateLog> MemberUpdateLogs { get; set; } = new List<MemberUpdateLog>();

    public virtual ICollection<NotificationRecipient> NotificationRecipients { get; set; } = new List<NotificationRecipient>();

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
