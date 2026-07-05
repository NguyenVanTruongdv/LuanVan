using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace BE.Dtos.Equipments;

/// <summary>
/// Dữ liệu trả về khi xem danh sách / chi tiết thiết bị
/// </summary>
public class EquipmentDto
{
    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = null!;
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int BranchId { get; set; }
    public string? BranchName { get; set; }
    public string Status { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime AddedAt { get; set; }
    public List<string> ImageUrls { get; set; } = new();
}

/// <summary>
/// Form lọc danh sách thiết bị — FE gửi lên dạng query string (?name=...&branchId=...&categoryId=...)
/// </summary>
public class EquipmentFilterDto
{
    /// <summary>
    /// Lọc theo tên thiết bị (tìm gần đúng, không phân biệt hoa thường)
    /// </summary>
    public string? Name { get; set; }

    public int? BranchId { get; set; }

    public int? CategoryId { get; set; }

    /// <summary>
    /// true = lấy cả thiết bị đã xóa mềm. Mặc định false.
    /// </summary>
    public bool IncludeDeleted { get; set; } = false;
}

/// <summary>
/// Dữ liệu đầu vào khi tạo mới thiết bị
/// </summary>
public class CreateEquipmentDto
{
    public string EquipmentName { get; set; } = null!;
    public int CategoryId { get; set; }
    public int BranchId { get; set; }
    public string? Description { get; set; }

    /// <summary>
    /// Ảnh thiết bị — chỉ 1 ảnh duy nhất, có thể null (bổ sung sau qua API update)
    /// </summary>
    public IFormFile? Image { get; set; }
}

/// <summary>
/// Dữ liệu đầu vào khi cập nhật thiết bị.
/// Các field null sẽ được bỏ qua (không cập nhật).
/// </summary>
public class UpdateEquipmentDto
{
    public string? EquipmentName { get; set; }
    public int? CategoryId { get; set; }
    public int? BranchId { get; set; }
    public string? Description { get; set; }

    /// <summary>
    /// Ảnh mới của thiết bị — chỉ 1 ảnh duy nhất.
    /// - Không truyền (null) => giữ nguyên ảnh cũ.
    /// - Có truyền => xóa ảnh cũ và thay bằng ảnh mới này.
    /// </summary>
    public IFormFile? Image { get; set; }
}