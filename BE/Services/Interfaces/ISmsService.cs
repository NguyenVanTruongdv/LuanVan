public interface ISmsService
{
    Task SendOtpAsync(
        string phoneNumber,
        string otp);
}