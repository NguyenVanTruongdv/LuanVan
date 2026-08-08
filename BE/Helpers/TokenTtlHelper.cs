// Dùng để làm gì: quy định thời hạn refresh token theo từng role
public static class TokenTtlHelper
{
    public const int AccessTokenMinutes = 1; // tất cả role đều 30 phút

    private static readonly Dictionary<string, int> RefreshTokenDaysByRole = new()
    {
        { "Member",       7 }, // Hội viên — app di động
        { "Staff",        30 }, // Thu ngân — máy quầy cố định
        { "Manager",       7 }, // Quản lý
        { "Admin",         1 }, // Admin — bảo mật cao nhất
    };

    public static int GetRefreshTokenDays(string role)
    {
        return RefreshTokenDaysByRole.TryGetValue(role, out var days) ? days : 1;
    }
}