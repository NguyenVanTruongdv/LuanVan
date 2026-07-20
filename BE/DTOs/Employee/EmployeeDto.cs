using System.ComponentModel.DataAnnotations;

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

    public class EmployeeListItemDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string? Email { get; set; }
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string? SuspendReason { get; set; }
        public string Role { get; set; } = "";
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    public class EmployeeFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class CreateEmployeeDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;
        public IFormFile? ProfileImage { get; set; }
        public string? FaceIdReason { get; set; }
        [Required] public string Gender { get; set; } = null!;
        [Required] public sbyte RoleId { get; set; }
        public List<int>? BranchIds { get; set; } = new();
    }

    public class UpdateEmployeeDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        [Required] public string Gender { get; set; } = null!;
        [Required] public sbyte RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();

        // Tùy chọn: chỉ đổi mật khẩu khi người dùng nhập giá trị mới.
        // Để trống (null hoặc rỗng) thì giữ nguyên mật khẩu cũ.
        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string? Password { get; set; }
    }

    public class HideEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }
}