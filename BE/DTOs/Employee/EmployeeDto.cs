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
        public string Phone { get; set; } = "";        // Employee.Phone — số liên hệ
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";        // Employee.Status — Active/Inactive (đi làm/nghỉ việc)
        public string Role { get; set; } = "";

        // Thông tin tài khoản đăng nhập — null nếu nhân viên chưa được cấp tài khoản
        public long? AccountId { get; set; }
        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string? AccountStatus { get; set; }       // Active/Suspended
        public string? SuspendReason { get; set; }

        public bool HasFaceId { get; set; }

        // Ảnh khuôn mặt đã đăng ký (FaceDatum.ProfileImage) — null nếu chưa có FaceID
        public string? FaceProfileImage { get; set; }

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
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public string Role { get; set; } = "";

        public string? LoginPhone { get; set; }
        public string? LoginEmail { get; set; }
        public string? AccountStatus { get; set; }
        public string? SuspendReason { get; set; }

        public bool HasFaceId { get; set; }

        // Ảnh khuôn mặt đã đăng ký (FaceDatum.ProfileImage) — null nếu chưa có FaceID
        public string? FaceProfileImage { get; set; }

        public List<EmployeeBranchDto> Branches { get; set; } = new();
    }

    public class EmployeeFilterDto
    {
        public int? BranchId { get; set; }
        public string? Name { get; set; }

        // Tìm theo sđt liên hệ (Employee.Phone) hoặc sđt đăng nhập (Account.Phone)
        public string? Phone { get; set; }

        // Tìm theo email đăng nhập (Account.Email)
        public string? Email { get; set; }

        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>Thông tin cơ bản dùng chung để tạo hồ sơ nhân viên (không gồm login/FaceID).</summary>
    public class CreateEmployeeInfoDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        [Required] public sbyte RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();
    }

    /// <summary>Dùng khi tạo nhân viên đầy đủ: info + tài khoản đăng nhập + FaceID (bắt buộc).</summary>
    public class CreateEmployeeWithAccountDto : CreateEmployeeInfoDto
    {
        public string? LoginPhone { get; set; } = null!;
        public string? LoginEmail { get; set; }

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;

        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? FaceIdReason { get; set; }
    }

    /// <summary>Dùng khi tạo hồ sơ + FaceID nhưng chưa cấp tài khoản đăng nhập.</summary>
    public class CreateEmployeeWithFaceIdDto : CreateEmployeeInfoDto
    {
        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? FaceIdReason { get; set; }
    }

    /// <summary>Sửa thông tin nhân viên — không đụng tới Account/FaceID.</summary>
    public class UpdateEmployeeDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required] public string Phone { get; set; } = null!;
        [Required] public string Gender { get; set; } = null!;
        [Required] public sbyte RoleId { get; set; }
        public List<int> BranchIds { get; set; } = new();
    }

    public class UpdateEmployeeFaceIdDto
    {
        [Required] public IFormFile ProfileImage { get; set; } = null!;
        public string? Reason { get; set; }
    }

    /// <summary>Thêm tài khoản đăng nhập cho nhân viên đã có info/FaceID nhưng chưa có tài khoản.</summary>
    public class AddEmployeeAccountDto
    {
        [Required] public string LoginPhone { get; set; } = null!;
        public string? LoginEmail { get; set; }

        [Required, MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string Password { get; set; } = null!;
    }

    /// <summary>Sửa tài khoản đăng nhập đã có của nhân viên.</summary>
    public class UpdateEmployeeAccountDto
    {
        [Required] public string LoginPhone { get; set; } = null!;
        public string? LoginEmail { get; set; }

        // Để trống nếu không đổi mật khẩu
        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
        public string? NewPassword { get; set; }
    }

    public class LockEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    public class HideEmployeeDto
    {
        [Required] public string Reason { get; set; } = null!;
    }

    public class LockAccountOnlyDto
    {
        [Required] public string Reason { get; set; } = null!;
    }
}