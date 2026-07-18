namespace BE.DTOs.Payment
{
    public class HistoryRegisPacReponse
    {   
        public long transactionId { get; set; } 
        public string UrlImg { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string FullName { get; set; } = null!;
         public string OrderCode { get; set; } = null!;
        public string PlanName { get; set; } = null!;
        public string BranchName {get; set; } =null!;
        public string PurchaseChannel { get; set; } = null!; // "Online" | "Tại quầy"
        public DateOnly StartDate { get; set; }
        public DateOnly ExpiryDate { get; set; }
        public decimal OriginalAmount { get; set; } // gia_goc, để hiển thị gạch ngang khi có KM
        public decimal Amount { get; set; }          // số tiền thực thu
        public string Status { get; set; } = null!;
    }
    public class InternalMembershipPlanDto
{
    public int PlanId { get; set; }

    public string PlanName { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public short DurationDays { get; set; }

    public string? Description { get; set; }

    public string PlanType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public bool IsPopular { get; set; }
}
  
}