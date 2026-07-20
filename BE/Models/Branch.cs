using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Chi nhánh phòng gym
/// </summary>
public partial class Branch
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string? Phone { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<BranchImage> BranchImages { get; set; } = new List<BranchImage>();

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual ICollection<EmployeeBranch> EmployeeBranches { get; set; } = new List<EmployeeBranch>();

    public virtual ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();

    public virtual ICollection<GymDensity> GymDensities { get; set; } = new List<GymDensity>();

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<News> News { get; set; } = new List<News>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
