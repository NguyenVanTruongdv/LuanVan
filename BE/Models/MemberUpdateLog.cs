using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử cập nhật thông tin hội viên — chỉ ghi thêm
/// </summary>
public partial class MemberUpdateLog
{
    public long Id { get; set; }

    public Guid UpdateSessionId { get; set; }

    public long MemberId { get; set; }

    public string FieldName { get; set; } = null!;

    public string? OldValue { get; set; }

    public string NewValue { get; set; } = null!;

    public long? UpdatedByEmployeeId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual Employee? UpdatedByEmployee { get; set; }
}
