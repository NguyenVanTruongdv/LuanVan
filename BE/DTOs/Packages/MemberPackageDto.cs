namespace BE.Dtos.MemberPackage;

// Tham số lọc cho GET /api/member-packages/history.
// BranchId: nếu null -> không lọc theo 1 chi nhánh cụ thể (Admin sẽ thấy tất cả, Staff/Manager sẽ
// bị giới hạn theo danh sách chi nhánh họ quản lý ở tầng Controller/Service, KHÔNG phải ở đây).
// Channel: "Online" (Transaction.EmployeeId == null) hoặc "Offline" (Transaction.EmployeeId != null).
public class MemberPackageHistoryQuery
{
    /// <summary>Lọc theo tên hội viên (chứa chuỗi, không phân biệt hoa thường theo collation DB)</summary>
    public string? keyword {get; set;}
    /// <summary>Lọc theo 1 chi nhánh cụ thể. Staff/Manager gửi chi nhánh ngoài quyền hạn -> bị từ chối ở Controller.</summary>
    public int? BranchId { get; set; }

    /// <summary>Lọc theo PackageStatus: PendingActivation / Active / Expired ...</summary>
    public string? Status { get; set; }

    /// <summary>Lọc theo kênh mua: "Online" hoặc "Offline"</summary>
    public string? Channel { get; set; }
}


public class MemberPackageHistoryItem
{
    public long MemberPackageId { get; set; }

    // ----- Hội viên -----
    public long MemberId { get; set; }
    public string? MemberAvatarUrl { get; set; } // FaceDatum.ProfileImage, có thể null nếu chưa đăng ký FaceID
    public string MemberFullName { get; set; } = null!;
    public string MemberPhone { get; set; } = null!;

    // ----- Gói tập -----
    public string PlanName { get; set; } = null!;

    // ----- Chi nhánh đăng ký -----
    public int BranchId { get; set; }
    public string BranchName { get; set; } = null!;

    // ----- Giao dịch -----
    public long TransactionId { get; set; }
    public string TransactionCode { get; set; } = null!; // Transaction.OrderCode
    public string Channel { get; set; } = null!; // "Online" | "Offline" - suy ra từ Transaction.EmployeeId

    // ----- Thời hạn & tiền -----
    public DateOnly? StartDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public decimal Amount { get; set; }

    public string PackageStatus { get; set; } = null!;
}