using BE.Models;

namespace BE.Dtos.Transaction
{
    // Dùng cho CreateTransactionAsync — thay vì truyền 10 tham số rời rạc
    public class CreateTransactionRequest
    {
        public long MemberId { get; set; }
        public int PlanId { get; set; }
        public int? PromotionId { get; set; }
        public decimal GiaGoc { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = null!;
        public string PaymentStatus { get; set; } = null!;
        public string? BankReferenceCode { get; set; }
        public long? PerformedBy { get; set; }
        public int BranchId { get; set; } // bắt buộc — chi nhánh đã bán gói
    }

    // Kết quả CalculatePromotionEffectAsync — thay tuple 5 phần tử
     public class PromotionEffectResult
    {
        public decimal GiaGoc { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Amount { get; set; }
        public short BonusDays { get; set; }

        // Fully-qualified vì "Promotion" trùng tên với namespace BE.Dtos.Promotion
        public BE.Models.Promotion? Promo { get; set; }
    }

    // Kết quả PreviewAdjustTransactionPlanAsync — thay tuple 10 phần tử
    public class AdjustPlanPreviewResult
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = null!;
        public decimal GiaGoc { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Amount { get; set; }
        public short BonusDays { get; set; }
        public int? PromotionId { get; set; }
        public string? PromotionName { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly NewExpiryDate { get; set; }
    }
}