namespace BE.DTOs.Identify;

public class MemberDto
{
    public long MemberId { get; set; }
    public string FullName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string? PhotoUrl { get; set; }

    public string AccountStatus { get; set; } = null!;
    public string? SuspendReason { get; set; }
    public string? InternalNotes { get; set; }


    public string? Package { get; set; }
    public string PackageStatus { get; set; } = "expired";
    public string? ExpiryDate { get; set; }
}

/// <summary>Thông tin nhân viên trả về khi camera nhận diện ra NHÂN VIÊN thay vì hội viên.</summary>
public class EmployeeIdentifyDto
{
    public long EmployeeId { get; set; }
    public string FullName { get; set; } = null!;
    public string Status { get; set; } = null!;
}

public class IdentifyAttendanceRequestDto
{
    public string Image { get; set; } = null!;
    public string Action { get; set; } = null!; // "checkin" | "checkout"

}

public class IdentifyAttendanceResponseDto
{
    public string Status { get; set; } = null!;
    public MemberDto? Member { get; set; }
    public long? CheckInId { get; set; }
    public string? Reason { get; set; }

    /// <summary>true nếu khuôn mặt nhận diện được là NHÂN VIÊN (không phải hội viên).</summary>
    public bool IsEmployee { get; set; }
    public EmployeeIdentifyDto? Employee { get; set; }
}

public class PhoneLookupResponseDto
{
    public MemberDto? Member { get; set; }
}

public class ManualCheckinRequestDto
{
    public long MemberId { get; set; }
    public string ManualReason { get; set; } = null!;
}

public class ManualCheckinResponseDto
{
    public long CheckInId { get; set; }
    public MemberDto Member { get; set; } = null!;
}

public class OpenDoorRequestDto
{
    public string Side { get; set; } = null!; // "checkin" | "checkout"
}
public class CheckInHistoryQueryDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }

    public int? branchId { get; set; }

    /// <summary>Tìm theo tên hoặc SĐT hội viên, hoặc tên nhân viên (không bắt buộc)</summary>
    public string? Keyword { get; set; }

    /// <summary>
    /// Lọc theo loại người check-in: "member", "employee", hoặc null/để trống = lấy tất cả.
    /// </summary>
    public string? PersonType { get; set; }
}

public class CheckInHistoryItemDto
{
    public long CheckInId { get; set; }

    public bool IsEmployee { get; set; }

    public long? MemberId { get; set; }
    public string? MemberName { get; set; }
    public string? MemberPhone { get; set; }
    public string? MemberAvatar { get; set; }

    public long? EmployeeId { get; set; }
    public string? EmployeeName { get; set; }

    public int BranchId { get; set; }
    public string? BranchName { get; set; }

    public DateTime CheckInTime { get; set; }
    public string? CheckInMethod { get; set; }
    public string? CheckInStaffName { get; set; }

    public DateTime? CheckOutTime { get; set; }
    public string? CheckOutMethod { get; set; }
    public string? CheckOutStaffName { get; set; }
}

public class CheckInHistoryResponseDto
{
    public List<CheckInHistoryItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
}