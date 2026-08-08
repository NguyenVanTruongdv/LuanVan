using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Vai trò của nhân viên
/// </summary>
public partial class Role
{
    public long RoleId { get; set; }

    /// <summary>
    /// Tên vai trò: Staff, Manager, Admin
    /// </summary>
    public string RoleName { get; set; } = null!;

    public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();
}
