using BE.DTOs.Auth;

namespace BE.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> LoginEmployeeAsync(LoginRequestDto req);
    Task<LoginResponseDto> LoginMemberAsync(LoginRequestDto req);

    // Flow đăng ký: SendOtp → VerifyOtp (tạo account luôn trong bước này)
    Task SendRegisterOtpAsync(string phone);
    Task VerifyOtpRegister(VerifyRegisterOtpDto req);
    Task SendForgotPasswordOtpAsync(string phone);

    Task ResetPasswordAsync(ResetPasswordDto req);
    Task ChangePassAsync(ChangePasswordDto req, long userId,string entityType);
    Task<LoginResponseDto> RefreshAsync(RefreshRequestDto req);
    Task LogoutAsync(RefreshRequestDto req);
}