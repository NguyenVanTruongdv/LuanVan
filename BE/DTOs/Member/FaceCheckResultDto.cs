namespace BE.Dtos.Member
{
    public class FaceCheckResultDto
    {
        /// <summary>Ảnh có hợp lệ để đăng ký hay không (có mặt rõ ràng + không trùng ai khác).</summary>
        public bool IsValid { get; set; }

        /// <summary>Ảnh có nhận diện được khuôn mặt hay không.</summary>
        public bool HasFace { get; set; }

        /// <summary>Khuôn mặt có trùng với người khác trong hệ thống hay không.</summary>
        public bool IsDuplicate { get; set; }

        /// <summary>"Member" hoặc "Employee" nếu trùng. Null nếu không trùng.</summary>
        public string? DuplicateOwnerType { get; set; }

        /// <summary>MemberId của người bị trùng (nếu DuplicateOwnerType = "Member").</summary>
        public long? DuplicateMemberId { get; set; }

        /// <summary>EmployeeId của người bị trùng (nếu DuplicateOwnerType = "Employee").</summary>
        public long? DuplicateEmployeeId { get; set; }

        /// <summary>Độ khớp (%) nếu trùng.</summary>
        public float? Similarity { get; set; }

        /// <summary>Thông báo mô tả kết quả, hiển thị trực tiếp cho người dùng.</summary>
        public string Message { get; set; } = string.Empty;
    }
     public class CheckMemberFaceRequest
    {
        public IFormFile ProfileImage { get; set; } = null!;
        public long? ExcludeMemberId { get; set; }
    }

    public class CheckEmployeeFaceRequest
    {
        public IFormFile ProfileImage { get; set; } = null!;
        public long? ExcludeEmployeeId { get; set; }
    }
}