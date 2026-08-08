using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Employee
{
    /// <summary>Value object thuần (không mang nghiệp vụ Account/FaceID) — dùng chung cho cả 2 luồng.</summary>
    public class EmployeeBranchDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = "";
    }

    // ======================================================================
    // LUỒNG 1: TÀI KHOẢN (info + login) — KHÔNG có field nào liên quan FaceID.
    // Danh sách tài khoản = những Employee đang tồn tại Account.
    // Vai trò (Role) của luồng này nằm ở Account.RoleId.
    // ======================================================================

    public class EmployeeAccountProfileDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";         // Employee.Phone — số liên hệ
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";         // Employee.Status — Active/Inactive
        public string Role { get; set; } = "";            // Account.Role.RoleName — luồng này luôn có Account nên luôn có Role

        public long AccountId { get; set; }

        // Tài khoản nhân viên chỉ đăng nhập bằng Email (Account.Username), không có SĐT đăng nhập riêng.
        // Giữ lại field để tương thích phía FE nhưng luôn trả về null.
        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string AccountStatus { get; set; } = "";  // Active/Suspended
        public string? SuspendReason { get; set; }

        public int? DefaultBranchId { get; set; }
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    public class EmployeeAccountListItemDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string Role { get; set; } = "";

        public long AccountId { get; set; }
        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string AccountStatus { get; set; } = "";
        public string? SuspendReason { get; set; }

        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    /// <summary>Filter cho danh sách tài khoản (chỉ những nhân viên có Account).</summary>
    public class EmployeeAccountFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }

        // Tìm theo SĐT liên hệ (Employee.Phone) — tài khoản nhân viên không có SĐT đăng nhập riêng
        public string? Phone { get; set; }

        // Tìm theo email đăng nhập (Account.Username)
        public string? Email { get; set; }

        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>Tạo nhân viên KÈM tài khoản đăng nhập. KHÔNG có field FaceID.</summary>
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

    /// <summary>Sửa thông tin cơ bản + vai trò của nhân viên thuộc luồng tài khoản — không đụng FaceID.</summary>
    public class UpdateEmployeeAccountInfoDto
    {
        [Required] public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        [Required] public long RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();
    }

    /// <summary>Thêm tài khoản đăng nhập cho nhân viên chưa có tài khoản — bắt buộc chọn vai trò.</summary>
    public class AddEmployeeAccountDto
    {
        [Required] public long RoleId { get; set; }

        [Required, EmailAddress]
        public string LoginEmail { get; set; } = null!;

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;
    }

    /// <summary>Sửa tài khoản đăng nhập đã có của nhân viên (email đăng nhập, mật khẩu).</summary>
    public class UpdateEmployeeAccountDto
    {
        [Required, EmailAddress]
        public string LoginEmail { get; set; } = null!;

        // Để trống nếu không đổi mật khẩu
        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string? NewPassword { get; set; }
    }

    public class LockAccountOnlyDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    // ======================================================================
    // LUỒNG 2: NHÂN VIÊN + FACEID — KHÔNG có field nào liên quan tài khoản.
    // Danh sách nhân viên = phần còn lại (những Employee CHƯA có Account).
    // Nhân viên luồng này KHÔNG có vai trò (Role chỉ tồn tại khi có Account).
    // ======================================================================

    public class EmployeeProfileDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";

        // Null nếu nhân viên chưa có Account (luồng FaceID thuần). Có giá trị nếu tình cờ được
        // gọi cho nhân viên thuộc luồng tài khoản (GetProfileAsync dùng chung cho cả 2 luồng).
        public string? Role { get; set; }

        public bool HasFaceId { get; set; }
        public string? FaceProfileImage { get; set; }   // FaceDatum.ProfileImage — null nếu chưa có FaceID

        public int? DefaultBranchId { get; set; }
        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    public class EmployeeListItemDto
    {
        public long EmployeeId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";

        // Luôn null: danh sách này chỉ gồm nhân viên CHƯA có Account nên không có vai trò.
        public string? Role { get; set; }

        public bool HasFaceId { get; set; }
        public string? FaceProfileImage { get; set; }

        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    /// <summary>Filter cho danh sách nhân viên (những Employee CHƯA có Account).</summary>
    public class EmployeeFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }   // Employee.Phone — không có Account nên không tìm theo sđt đăng nhập
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>Tạo nhân viên KÈM FaceID (bắt buộc). KHÔNG có field tài khoản, KHÔNG có vai trò.</summary>
    public class CreateEmployeeFaceIdDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        public List<int> BranchIds { get; set; } = new();

        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? FaceIdReason { get; set; }
    }

    /// <summary>Sửa thông tin cơ bản của nhân viên thuộc luồng FaceID — không đụng tài khoản, không có vai trò.</summary>
    public class UpdateEmployeeInfoDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        public List<int> BranchIds { get; set; } = new();
    }

    public class UpdateEmployeeFaceIdDto
    {
        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? Reason { get; set; }
    }

    // ======================================================================
    // HẠ TẦNG DÙNG CHUNG (không phải DTO nghiệp vụ của luồng nào — khóa toàn
    // diện cả 2 phía cùng lúc, và lịch sử cập nhật chung của nhân viên)
    // ======================================================================

    public class LockEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    public class HideEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    public class EmployeeUpdateHistoryItemDto
    {
        public Guid UpdateSessionId { get; set; }
        public DateTime UpdatedAt { get; set; }
        public long? UpdatedByEmployeeId { get; set; }
        public string? UpdatedByName { get; set; }
        public List<EmployeeUpdateFieldChangeDto> Changes { get; set; } = new();
    }

    /// <summary>1 dòng thay đổi field trong 1 sự kiện cập nhật.</summary>
    public class EmployeeUpdateFieldChangeDto
    {
        public string FieldName { get; set; } = null!;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
    }
}