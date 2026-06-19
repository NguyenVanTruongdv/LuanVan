
// Dùng để làm gì: quy định thời hạn refresh token theo từng role
public static class TokenTtlHelper
{
    public const int AccessTokenMinutes = 30; // tất cả role đều 15 phút

    private static readonly Dictionary<string, int> EmployeeRefreshTokenDays = new()
    {
        { "Staff",       30 }, // Thu ngân — máy quầy cố định
        { "Technician",   7 }, // Kỹ thuật viên
        { "Manager",      7 }, // Quản lý
        { "Admin",        1 }, // Admin — bảo mật cao nhất
    };

    public const int MemberRefreshTokenDays = 7; // Member app

    public static int GetRefreshTokenDays(string entityType, string role)
    {
        if (entityType == "Member")
            return MemberRefreshTokenDays;

        return EmployeeRefreshTokenDays.TryGetValue(role, out var days) ? days : 1;
    }
}