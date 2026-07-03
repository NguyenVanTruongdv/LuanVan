namespace BE.DTOs.Payment
{
    public class PendingPaymentResponseDto
    {
        public bool HasPending { get; set; }
        public string? OrderCode { get; set; }
        public decimal? Amount { get; set; }
        public string? QrImage { get; set; }
        public long? PlanId { get; set; }
        public string? PlanName { get; set; }
        public int? DurationDays { get; set; }
        public decimal? PlanPrice { get; set; }
    }
}