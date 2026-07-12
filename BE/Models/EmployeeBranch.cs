using System;
using System.Collections.Generic;

namespace BE.Models;

public partial class EmployeeBranch
{
    public long EmployeeId { get; set; }

    public int BranchId { get; set; }

    public string BranchRole { get; set; } = null!;

    public virtual Branch Branch { get; set; } = null!;

    public virtual Employee Employee { get; set; } = null!;
}
