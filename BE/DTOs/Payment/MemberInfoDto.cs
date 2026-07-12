public class CurrentPackageDto
{
    public long MemberPackageId { get; set; }
    public int PlanId { get; set; }
    public string PlanName { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public string PackageStatus { get; set; }
}

public class AvailablePlanDto
{
    public int PlanId { get; set; }
    public string PlanName { get; set; }
    public decimal Price { get; set; }
    public short DurationDays { get; set; }
    public string? Description { get; set; }
    public bool IsPopular { get; set; }
}

public class PaymentPageInfoDto
{
    public string FullName { get; set; }
    public string Phone { get; set; }
    public string BranchName { get; set; }

    // null nếu hội viên chưa từng mua gói nào
    public CurrentPackageDto? CurrentPackage { get; set; }

    public List<AvailablePlanDto> AvailablePlans { get; set; } = new();
}