// Helpers/JwtHelper.cs
// Dùng để làm gì: tạo Access Token (JWT) và Refresh Token (random)
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace BE.Helpers;

public class JwtHelper
{
    public const string ClaimEntityType = "entity_type";
    public const string ClaimAccountId = "account_id";
    public const string ClaimBranchId = "BranchId";

    private readonly IConfiguration _config;

    public JwtHelper(IConfiguration config) => _config = config;

    // Tạo Access Token JWT ngắn hạn
    public string GenerateAccessToken(JwtUserInfo user)
    {
        var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name,           user.FullName),
                new(ClaimTypes.Role,           user.Role),
                new(ClaimEntityType,           user.EntityType),
                new(ClaimAccountId,            user.AccountId.ToString()),
            };

        // Mỗi chi nhánh 1 claim riêng — nhân viên có thể thuộc nhiều chi nhánh
        foreach (var branchId in user.BranchIds)
        {
            claims.Add(new Claim(ClaimBranchId, branchId.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(TokenTtlHelper.AccessTokenMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Tạo Refresh Token ngẫu nhiên + hash để lưu DB
    public (string rawToken, string tokenHash) GenerateRefreshToken()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var hash = ComputeSha256(raw);
        return (raw, hash);
    }

    // Hash SHA-256 — lưu hash vào DB, trả raw về client
    public static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }

    // Đọc claims từ token đã xác thực
    public long GetUserId(ClaimsPrincipal u) => long.Parse(u.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public long GetAccountId(ClaimsPrincipal u) => long.Parse(u.FindFirstValue(ClaimAccountId)!);
    public string GetRole(ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Role)!;
    public string GetFullName(ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Name)!;
    public string GetEntityType(ClaimsPrincipal u) => u.FindFirstValue(ClaimEntityType)!;
}