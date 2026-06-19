using System.ComponentModel.DataAnnotations;
namespace BE.DTOs.Auth;

public class LoginRequestDto
{
    [Required(ErrorMessage = "Số điện thoại không được để trống")]
    [RegularExpression(
        @"^0\d{9}$",
        ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    public string Password { get; set; } = string.Empty;
}
