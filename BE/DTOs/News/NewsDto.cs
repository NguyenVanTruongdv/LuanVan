namespace BE.DTOs.News;


// Dùng khi tạo mới tin tức — chỉ chứa field client cần gửi lên
public class NewsCreateRequestDto
{
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public string Content { get; set; } = null!;
    public int? BranchId { get; set; }
}

// Dùng khi sửa tin tức
public class NewsUpdateRequestDto
{
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public string Content { get; set; } = null!;
    public int? BranchId { get; set; }
}
public class NewsResponseDto
{
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public string Content { get; set; } = null!;
}

// Dùng cho Admin/Manager quản lý tin tức — đầy đủ thông tin hơn
public class NewsAdminResponseDto
{
    public int NewsId { get; set; }
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public string Content { get; set; } = null!;
    public string Status { get; set; } = null!;
    public long CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}