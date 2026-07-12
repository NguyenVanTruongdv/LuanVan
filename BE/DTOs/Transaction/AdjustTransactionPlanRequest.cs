namespace BE.Dtos.Transaction;

public class AdjustTransactionPlanRequest
{
    public int NewPlanId { get; set; }
    public string? Reason { get; set; }
}