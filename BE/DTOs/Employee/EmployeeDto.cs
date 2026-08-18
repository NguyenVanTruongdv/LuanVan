using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Employee
{
    // Thông tin 1 chi nhánh, dùng chung cho mọi DTO bên dưới
    public class EmployeeBranchDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = "";
    }

    // ======================================================================
    // LUỒNG 1: TÀI KHOẢN (info + login)
    // ======================================================================

    // Hồ sơ chi tiết của 1 nhân viên thuộc luồng tài khoản
    public class EmployeeAccountProfileDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Role { get; set; } = "";

        public long AccountId { get; set; }
        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string AccountStatus { get; set; } = "";

        public int? DefaultBranchId { get; set; }
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    // 1 dòng trong danh sách tài khoản
    public class EmployeeAccountListItemDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Role { get; set; } = "";

        public long AccountId { get; set; }
        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string AccountStatus { get; set; } = "";

        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    // Filter cho danh sách tài khoản
    public class EmployeeAccountFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    // Dữ liệu tạo nhân viên kèm tài khoản đăng nhập
    public class CreateEmployeeAccountDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        [Required] public long RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();

        [Required, EmailAddress]
        public string LoginEmail { get; set; } = null!;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;
    }

    // Dữ liệu sửa thông tin cơ bản + vai trò của nhân viên thuộc luồng tài khoản
    public class UpdateEmployeeAccountInfoDto
    {
        [Required] public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
         public string Gender { get; set; } = null!;
        public long RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();
    }

    // Dữ liệu thêm tài khoản đăng nhập cho nhân viên chưa có tài khoản
    public class AddEmployeeAccountDto
    {
        [Required] public long RoleId { get; set; }

        [Required, EmailAddress]
        public string LoginEmail { get; set; } = null!;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;
    }

    // Dữ liệu sửa tài khoản đăng nhập đã có
    public class UpdateEmployeeAccountDto
    {
        [Required, EmailAddress]
        public string LoginEmail { get; set; } = null!;

        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string? NewPassword { get; set; }
    }

    public class LockAccountOnlyDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    // ======================================================================
    // LUỒNG 2: NHÂN VIÊN + FACEID
    // ======================================================================

    // Hồ sơ chi tiết của 1 nhân viên thuộc luồng FaceID
    public class EmployeeProfileDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string? Role { get; set; }
        public bool HasFaceId { get; set; }
        public string? FaceProfileImage { get; set; }

        public int? DefaultBranchId { get; set; }
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    // 1 dòng trong danh sách nhân viên
    public class EmployeeListItemDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string? Role { get; set; }
        public bool HasFaceId { get; set; }
        public string? FaceProfileImage { get; set; }

        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    // Filter cho danh sách nhân viên
    public class EmployeeFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    // Dữ liệu tạo nhân viên kèm FaceID
    public class CreateEmployeeFaceIdDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        public List<int> BranchIds { get; set; } = new();

        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? FaceIdReason { get; set; }
    }

    // Dữ liệu sửa thông tin cơ bản của nhân viên thuộc luồng FaceID
    public class UpdateEmployeeInfoDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
       public string? Gender { get; set; } = null!;
        public List<int> BranchIds { get; set; } = new();
    }

    public class UpdateEmployeeFaceIdDto
    {
        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? Reason { get; set; }
    }

    // ======================================================================
    // HẠ TẦNG DÙNG CHUNG
    // ======================================================================

    public class LockEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    // 1 sự kiện cập nhật (gộp theo UpdateSessionId)
    public class EmployeeUpdateHistoryItemDto
    {
        public Guid UpdateSessionId { get; set; }
        public DateTime UpdatedAt { get; set; }
        public long? UpdatedByEmployeeId { get; set; }
        public string? UpdatedByName { get; set; }
        public List<EmployeeUpdateFieldChangeDto> Changes { get; set; } = new();
    }

    // 1 dòng thay đổi field trong 1 sự kiện cập nhật
    public class EmployeeUpdateFieldChangeDto
    {
        public string FieldName { get; set; } = null!;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
    }
}