using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Bảng trung gian liên kết hội viên với nhóm
/// </summary>
public partial class MemberGroupMember
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Nhóm hội viên — FK tới member_groups.group_id
    /// </summary>
    public int GroupId { get; set; }

    /// <summary>
    /// Hội viên thuộc nhóm — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    public virtual MemberGroup Group { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
