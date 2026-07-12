using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Chi nhánh phòng gym
/// </summary>
public partial class Branch
{
    /// <summary>
    /// Mã chi nhánh — khóa chính tự tăng
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Tên hiển thị của chi nhánh
    /// </summary>
    public string BranchName { get; set; } = null!;

    /// <summary>
    /// Địa chỉ đầy đủ của chi nhánh
    /// </summary>
    public string Address { get; set; } = null!;

    /// <summary>
    /// Số điện thoại liên hệ của chi nhánh, có thể NULL
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Trạng thái hoạt động: Active = đang mở, Inactive = đã đóng
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Thời điểm thêm chi nhánh vào hệ thống
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public virtual ICollection<BranchImage> BranchImages { get; set; } = new List<BranchImage>();

    public virtual ICollection<CheckIn> CheckIns { get; set; } = new List<CheckIn>();

    public virtual ICollection<EmployeeBranch> EmployeeBranches { get; set; } = new List<EmployeeBranch>();

    public virtual ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();

    public virtual ICollection<GymDensity> GymDensities { get; set; } = new List<GymDensity>();

    public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();

    public virtual ICollection<MemberPackage> MemberPackages { get; set; } = new List<MemberPackage>();

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
