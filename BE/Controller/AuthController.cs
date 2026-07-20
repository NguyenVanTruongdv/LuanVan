using System.Security.Claims;
using BE.DTOs.Auth;
using BE.Helpers;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("employee/login")]
    public async Task<IActionResult> LoginEmployee([FromBody] LoginRequestDto req)
    {
        var result = await _authService.LoginEmployeeAsync(req);
        return Ok(result);
    }

    [HttpPost("member/login")]
    public async Task<IActionResult> LoginMember([FromBody] LoginRequestDto req)
    {
        var result = await _authService.LoginMemberAsync(req);
        return Ok(result);
    }

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpDto req)
    {
        await _authService.SendRegisterOtpAsync(req.Phone);
        return Ok(new { Message = "OTP đã được gửi" });
    }

    [HttpPost("forgot-password/send-otp")]
    public async Task<IActionResult> SendForgotPasswordOtp(ForgotPasswordRequestDto req)
    {
        await _authService.SendForgotPasswordOtpAsync(req.Phone);

        return Ok(new
        {
            message = "OTP đã được gửi"
        });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyRegisterOtpDto req)
    {
        await _authService.VerifyOtpRegister(req);
        return Ok(new { Message = "Đăng ký tài khoản thành công" });
    }

    [HttpPost("forgot-password/reset")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto req)
    {
        await _authService.ResetPasswordAsync(req);

        return Ok(new
        {
            message = "Đổi mật khẩu thành công"
        });
    }

            [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto req)
        {
            // account_id — không dùng NameIdentifier vì đó là EmployeeId/MemberId, không phải account.account_id
            var accountId = long.Parse(
                User.FindFirst(JwtHelper.ClaimAccountId)!.Value);

            await _authService.ChangePassAsync(req, accountId);

            return Ok(new
            {
                message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
            });
        }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshRequestDto req)
    {
        var result = await _authService.RefreshAsync(req);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequestDto req)
    {
        await _authService.LogoutAsync(req);
        return Ok(new { Message = "Đăng xuất thành công" });
    }
}