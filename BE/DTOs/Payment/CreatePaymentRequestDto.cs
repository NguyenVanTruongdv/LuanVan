namespace BE.DTOs.Payment
{
    public class CreatePaymentRequestDto
    {
        public int PlanId { get; set; } 
        public int BranchId {get; set; }
    }
}