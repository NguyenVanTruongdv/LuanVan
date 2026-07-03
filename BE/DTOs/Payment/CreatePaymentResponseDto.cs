namespace BE.DTOs.Payment
{
    public class CreatePaymentResponseDto
    {
        public string OrderCode { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string? QrImage { get; set; }
    }
}