using Microsoft.AspNetCore.Http;

namespace BE.DTOs.Branches;

/// <summary>
/// Dùng để trả về danh sách/thông tin chi tiết chi nhánh
/// </summary>
public class BranchDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string? Phone { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    /// <summary>Danh sách quản lý của chi nhánh (có thể nhiều người cùng giữ vai trò Manager)</summary>
    public List<BranchManagerDto> Managers { get; set; } = new();

    public List<BranchImageDto> Images { get; set; } = new();
}

public class BranchManagerDto
{
    public long EmployeeId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Phone { get; set; }
}
/// <summary>
/// Thông tin ảnh của chi nhánh trả về cho client
/// </summary>
public class BranchImageDto
{
    public int ImageId { get; set; }
    public int BranchId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public string ImageType { get; set; } = null!;
    public sbyte SortOrder { get; set; }
    public DateTime UploadedAt { get; set; }
}

/// <summary>
/// Dữ liệu tạo mới chi nhánh — cho phép up kèm nhiều ảnh cùng lúc.
/// Images và ImageTypes được map theo index (ảnh thứ i tương ứng loại thứ i);
/// nếu ImageTypes không đủ số lượng, các ảnh dư sẽ nhận loại mặc định "Khác".
/// </summary>// CreateBranchDto / UpdateBranchDto — bỏ ManagerId, thay bằng ManagerIds (list)
public class CreateBranchDto
{
    public string BranchName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string? Phone { get; set; }

    /// <summary>Danh sách EmployeeId sẽ được gán làm quản lý chi nhánh này ngay khi tạo (không bắt buộc)</summary>
    public List<long>? ManagerIds { get; set; }

    public List<IFormFile>? Images { get; set; }
    public List<string>? ImageTypes { get; set; }
}

public class UpdateBranchDto
{
    public string BranchName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string? Phone { get; set; }
    public string Status { get; set; } = null!;

    /// <summary>
    /// Danh sách EmployeeId sẽ là quản lý chi nhánh sau khi cập nhật.
    /// Service sẽ đồng bộ lại EmployeeBranch (BranchRole = Manager) theo danh sách này.
    /// </summary>
    public List<long>? ManagerIds { get; set; }
}

/// <summary>
/// Thêm một hoặc nhiều ảnh cho chi nhánh đã tồn tại
/// </summary>
public class AddBranchImagesDto
{
    public List<IFormFile> Images { get; set; } = new();

    /// <summary>
    /// Loại ảnh tương ứng theo index với Images
    /// </summary>
    public List<string>? ImageTypes { get; set; }
}

/// <summary>
/// Cập nhật một ảnh cụ thể. Nếu có Image mới thì ảnh cũ trên S3 sẽ bị xóa và thay bằng ảnh mới.
/// Nếu chỉ muốn đổi loại ảnh / thứ tự hiển thị thì để Image = null.
/// </summary>
public class UpdateBranchImageDto
{
    public IFormFile? Image { get; set; }
    public string? ImageType { get; set; }
    public sbyte? SortOrder { get; set; }
}

/// <summary>
/// Kết quả trả về cho API danh sách chi nhánh (có phân trang)
/// </summary>
public class BranchListResultDto
{
    public List<BranchDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

/// <summary>
/// Tham số lọc + phân trang danh sách chi nhánh
/// </summary>
public class BranchFilterDto
{
    /// <summary>
    /// Lọc theo tên chi nhánh (tìm gần đúng, không phân biệt hoa thường)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Lọc theo trạng thái: Active / Inactive / Deleted
    /// </summary>
    public string? Status { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}