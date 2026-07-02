using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Ảnh hiển thị trên trang chủ (banner/slideshow) — chỉ Admin quản lý
/// </summary>
public partial class HomeImage
{
    /// <summary>
    /// Mã ảnh — khóa chính tự tăng
    /// </summary>
    public int ImageId { get; set; }

    /// <summary>
    /// URL ảnh lưu trên S3
    /// </summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>
    /// Tiêu đề/chú thích hiển thị kèm ảnh, có thể NULL
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Đường dẫn khi người dùng bấm vào ảnh (VD: liên kết tới gói tập, khuyến mãi), có thể NULL
    /// </summary>
    public string? LinkUrl { get; set; }

    /// <summary>
    /// Thứ tự hiển thị trên trang home, số nhỏ hiển thị trước
    /// </summary>
    public sbyte SortOrder { get; set; }

    /// <summary>
    /// Trạng thái hiển thị: Active = đang hiện, Inactive = đang ẩn
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Nhân viên (Admin) tải ảnh lên — FK tới employees.employee_id
    /// </summary>
    public long UploadedBy { get; set; }

    /// <summary>
    /// Thời điểm tải ảnh lên
    /// </summary>
    public DateTime UploadedAt { get; set; }

    public virtual Employee UploadedByNavigation { get; set; } = null!;
}
