public class ResetPasswordDto
{
    public string Phone { get; set; } = null!;
    public string Otp { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}