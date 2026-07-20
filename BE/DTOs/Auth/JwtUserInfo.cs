
    public class JwtUserInfo
    {
        public long Id { get; set; }
        public long AccountId { get; set; }
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string EntityType { get; set; } = null!;
        public string? Status { get; set; }

        // MỚI: danh sách chi nhánh nhân viên đang làm việc (rỗng nếu là Member hoặc chưa gán chi nhánh)
        public List<int> BranchIds { get; set; } = new();
    }
