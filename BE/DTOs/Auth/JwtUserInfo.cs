public class JwtUserInfo
{

    public long Id { get; set; }
    public string FullName { get; set; } = "";
    public string Role { get; set; } = "";
    public string EntityType { get; set; } = ""; // "Employee" | "Member"
}


