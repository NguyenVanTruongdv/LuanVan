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
    public long ManagerId { get; set; }
    public string? ManagerName { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public List<BranchImageDto> Images { get; set; } = new();
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
/// </summary>
public class CreateBranchDto
{
    public string BranchName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string? Phone { get; set; }
    public long ManagerId { get; set; }

    /// <summary>
    /// Danh sách ảnh up kèm lúc tạo chi nhánh (không bắt buộc)
    /// </summary>
    public List<IFormFile>? Images { get; set; }

    /// <summary>
    /// Loại ảnh tương ứng theo index với Images, VD: "Lễ tân", "Phòng tập"
    /// </summary>
    public List<string>? ImageTypes { get; set; }
}

/// <summary>
/// Dữ liệu cập nhật thông tin chi nhánh (không bao gồm ảnh — ảnh có API riêng)
/// </summary>
public class UpdateBranchDto
{
    public string BranchName { get; set; } = null!;
    public string Address { get; set; } = null!;
    public string? Phone { get; set; }
    public long ManagerId { get; set; }

    /// <summary>
    /// Active / Inactive
    /// </summary>
    public string Status { get; set; } = null!;
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