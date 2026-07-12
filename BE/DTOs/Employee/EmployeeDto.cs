namespace BE.DTOs.Employee
{
    public class EmployeeBranchDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = "";
    }

    public class EmployeeProfileDto
    {
        public long EmployeeId { get; set; }

        public string FullName { get; set; } = "";

        public string Phone { get; set; } = "";

        public string? Email { get; set; }

        public string Gender { get; set; } = "";

        public string Status { get; set; } = "";

        public string? SuspendReason { get; set; }

        public string Role { get; set; } = "";

        // Chi nhánh đang được chọn mặc định (chi nhánh đầu tiên gán cho nhân viên)
        public int? DefaultBranchId { get; set; }

        // Danh sách tất cả chi nhánh nhân viên được quản lý/thu ngân
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }
}