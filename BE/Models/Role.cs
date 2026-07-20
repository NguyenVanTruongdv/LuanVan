using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Vai trò của nhân viên
/// </summary>
public partial class Role
{
    /// <summary>
    /// Mã vai trò
    /// </summary>
    public sbyte RoleId { get; set; }

    /// <summary>
    /// Tên vai trò: Staff, Manager, Admin
    /// </summary>
    public string RoleName { get; set; } = null!;

    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
