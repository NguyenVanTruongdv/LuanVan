using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Vai trò của nhân viên trong hệ thống
/// </summary>
public partial class Role
{
    /// <summary>
    /// Mã vai trò — khóa chính tự tăng
    /// </summary>
    public sbyte RoleId { get; set; }

    /// <summary>
    /// Tên vai trò, VD: Staff, Manager, Admin, Technician
    /// </summary>
    public string RoleName { get; set; } = null!;

    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
