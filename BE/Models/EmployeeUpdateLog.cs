using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử cập nhật thông tin nhân viên — chỉ ghi thêm
/// </summary>
public partial class EmployeeUpdateLog
{
    public long Id { get; set; }

    public Guid UpdateSessionId { get; set; }

    
    /// Nhân viên bị thay đổi thông tin — FK tới employees.employee_id
  
    public long EmployeeId { get; set; }

    public string FieldName { get; set; } = null!;

    public string? OldValue { get; set; }

    public string NewValue { get; set; } = null!;

    /// <summary>
    /// Nhân viên thực hiện thay đổi — FK tới employees.employee_id
    /// </summary>
    public long? UpdatedByEmployeeId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Employee Employee { get; set; } = null!;

    public virtual Employee? UpdatedByEmployee { get; set; }
}
