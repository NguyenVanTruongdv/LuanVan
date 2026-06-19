using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Album ảnh các khu vực của từng chi nhánh — chỉ Admin quản lý
/// </summary>
public partial class BranchImage
{
    /// <summary>
    /// Mã ảnh — khóa chính tự tăng
    /// </summary>
    public int ImageId { get; set; }

    /// <summary>
    /// Chi nhánh sở hữu ảnh — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// URL ảnh lưu trên S3
    /// </summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>
    /// Khu vực trong ảnh, VD: Lễ tân, Phòng tập, Phòng thay đồ, Hồ bơi
    /// </summary>
    public string ImageType { get; set; } = null!;

    /// <summary>
    /// Thứ tự hiển thị trong cùng image_type, số nhỏ hiển thị trước
    /// </summary>
    public sbyte SortOrder { get; set; }

    /// <summary>
    /// Thời điểm tải ảnh lên
    /// </summary>
    public DateTime UploadedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;
}
