using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Hồ sơ hội viên — thông tin đăng nhập nằm ở bảng accounts
/// </summary>
public partial class Member
{
    public long MemberId { get; set; }

    public string FullName { get; set; } = null!;

    public string Gender { get; set; } = null!;

    /// <summary>
    /// PendingActivation=chờ kích hoạt, Active=đang hoạt động. Việc khóa đăng nhập nay do accounts.status quản lý, không còn Expired/Suspended ở đây.
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Ghi chú nội bộ, hội viên không thấy
    /// </summary>
    public string? InternalNotes { get; set; }

    /// <summary>
    /// Nhân viên tạo hồ sơ hội viên — FK tới employees.employee_id
    /// </summary>
    public long? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Account? Account { get; set; }

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual Employee? CreatedByNavigation { get; set; }

    public virtual FaceDatum? FaceDatum { get; set; }

    public virtual ICollection<FaceUpdateHistory> FaceUpdateHistories { get; set; } = new List<FaceUpdateHistory>();

    public virtual ICollection<ForumCommentLike> ForumCommentLikes { get; set; } = new List<ForumCommentLike>();

    public virtual ICollection<ForumComment> ForumCommentMembers { get; set; } = new List<ForumComment>();

    public virtual ICollection<ForumComment> ForumCommentReplyToMembers { get; set; } = new List<ForumComment>();

    public virtual ICollection<ForumLike> ForumLikes { get; set; } = new List<ForumLike>();

    public virtual ICollection<ForumNotification> ForumNotificationActorMembers { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumNotification> ForumNotificationRecipientMembers { get; set; } = new List<ForumNotification>();

    public virtual ICollection<ForumPost> ForumPosts { get; set; } = new List<ForumPost>();

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<MemberUpdateLog> MemberUpdateLogs { get; set; } = new List<MemberUpdateLog>();

    public virtual ICollection<PromotionUsage> PromotionUsages { get; set; } = new List<PromotionUsage>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
