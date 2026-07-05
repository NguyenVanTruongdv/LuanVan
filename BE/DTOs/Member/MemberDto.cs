using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BE.Dtos.Member
{
    // ===================== TẠO HỘI VIÊN MỚI =====================
    public class CreateMemberRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập họ tên")]
        [StringLength(100, ErrorMessage = "Họ tên tối đa 100 ký tự")]
        public string FullName { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng nhập số điện thoại")]
        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        [StringLength(15, ErrorMessage = "Số điện thoại tối đa 15 ký tự")]
        public string Phone { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng chọn giới tính")]
        public string Gender { get; set; } = null!;

        public int? BranchId { get; set; }
        public string? InternalNotes { get; set; }

        // FaceIdAws KHÔNG còn ở đây nữa — BE tự sinh bằng cách gửi ProfileImage
        // lên AWS Rekognition (IFaceRecognitionService.RegisterFaceAsync).
        [Required(ErrorMessage = "Vui lòng chụp ảnh khuôn mặt để đăng ký Face ID")]
        public IFormFile ProfileImage { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng chọn gói tập")]
        public int PlanId { get; set; }

        public int? PromotionId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá gốc phải >= 0")]
        public decimal GiaGoc { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Số tiền phải >= 0")]
        public decimal Amount { get; set; }

        // ĐÃ BỎ: SoNgayTangThucTe — BE tự tính từ PromotionId + DurationDays của gói,
        // không nhận số ngày tặng do FE tự tính gửi lên nữa (tránh sửa DevTools/Postman).

        // ĐÃ BỎ: StartDate, ExpiryDate — BE tự tính (StartDate = hôm nay,
        // ExpiryDate = StartDate + DurationDays + SoNgayTangThucTe tự tính).

        [Required(ErrorMessage = "Vui lòng chọn phương thức thanh toán")]
        public string PaymentMethod { get; set; } = null!;

        public string? PaymentStatus { get; set; }

        public IFormFile? ReceiptImage { get; set; }
    }

    public class MemberResponse
    {
        public long MemberId { get; set; }
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Gender { get; set; } = null!;
        public string? BranchName { get; set; }
        public string Status { get; set; } = null!;
        public string? SuspendReason { get; set; }
        public string? InternalNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string? FaceIdAws { get; set; }
        public string? ProfileImage { get; set; }

        public string? CurrentMemberPackageId { get; set; }
        public DateOnly? PackageExpiryDate { get; set; }
        public string? PackageStatus { get; set; }

        public string? GeneratedPassword { get; set; }
    }

    // ===================== DANH SÁCH HỘI VIÊN (kèm ảnh + gói tập đang dùng hôm nay) =====================
    public class MemberListItem
    {
        public long MemberId { get; set; }
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string? BranchName { get; set; }
        public string Status { get; set; } = null!;
        public string? ProfileImage { get; set; }

        public List<CurrentPackageItem> CurrentPackages { get; set; } = new();
    }

    public class CurrentPackageItem
    {
        public long MemberPackageId { get; set; }
        public int PlanId { get; set; }
        public string? PlanName { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly ExpiryDate { get; set; }
        public string PackageStatus { get; set; } = null!;
    }

    // ===================== SỬA THÔNG TIN HỘI VIÊN =====================
    public class UpdateMemberInfoRequest
    {
        [StringLength(100, ErrorMessage = "Họ tên tối đa 100 ký tự")]
        public string? FullName { get; set; }

        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        [StringLength(15, ErrorMessage = "Số điện thoại tối đa 15 ký tự")]
        public string? Phone { get; set; }

        public string? Gender { get; set; }
        public string? InternalNotes { get; set; }
    }

    // ===================== SỬA FACE ID (API riêng) =====================
    public class UpdateFaceIdRequest
    {
        [Required(ErrorMessage = "Vui lòng chụp ảnh khuôn mặt mới để cập nhật Face ID")]
        public IFormFile ProfileImage { get; set; } = null!;

        public string? Reason { get; set; }
    }

    // ===================== KHÓA / MỞ KHÓA TÀI KHOẢN =====================
    public class LockMemberRequest
    {
        [Required(ErrorMessage = "Phải nhập lý do khóa tài khoản")]
        public string Reason { get; set; } = null!;
    }

    public class UnlockMemberRequest
    {
        public string? Reason { get; set; }
    }

    // ===================== LỊCH SỬ CẬP NHẬT =====================
    public class MemberUpdateLogItem
    {
        public string FieldName { get; set; } = null!;
        public string? OldValue { get; set; }
        public string NewValue { get; set; } = null!;
    }

    public class MemberUpdateSessionResponse
    {
        public string SessionId { get; set; } = null!;
        public string SessionType { get; set; } = null!; // "INFO" | "FACEID"
        public string? EmployeeName { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<MemberUpdateLogItem> Changes { get; set; } = new();

        public string? OldImageUrl { get; set; }
        public string? NewImageUrl { get; set; }
        public string? Reason { get; set; }
    }

    // ===================== KÍCH HOẠT =====================
    public class ActivateMemberWithPackageRequest
    {
        [Required(ErrorMessage = "Vui lòng chụp ảnh khuôn mặt để đăng ký Face ID")]
        public IFormFile ProfileImage { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng chọn gói tập")]
        public int PlanId { get; set; }
        public int? PromotionId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn phương thức thanh toán")]
        public string PaymentMethod { get; set; } = null!;
        public string? PaymentStatus { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá gốc phải >= 0")]
        public decimal GiaGoc { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Số tiền phải >= 0")]
        public decimal Amount { get; set; }

        // ĐÃ BỎ: SoNgayTangThucTe, StartDate, ExpiryDate — BE tự tính toàn bộ.

        public IFormFile? ReceiptImage { get; set; }
    }

    public class ActivateMemberFaceIdOnlyRequest
    {
        [Required(ErrorMessage = "Vui lòng chụp ảnh khuôn mặt để đăng ký Face ID")]
        public IFormFile ProfileImage { get; set; } = null!;
    }
}