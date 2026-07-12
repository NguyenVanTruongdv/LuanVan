namespace BE.DTOs.Auth;



public class LoginResponseDto
{
    public string FullName { get; set; } = string.Empty;
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string Role { get; set; } = "";
    public string EntityType { get; set; } = ""; // "Employee" | "Member" 
    public string? Status { get; set; } = "";
}

