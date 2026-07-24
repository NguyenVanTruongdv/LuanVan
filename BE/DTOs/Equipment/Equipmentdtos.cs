using System;
using Microsoft.AspNetCore.Http;

namespace BE.DTOs.Equipment
{
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
        public string? ImageUrl { get; set; }
    }

    /// <summary>
    /// FE gửi lên dạng query string (?name=...&branchId=...&categoryId=...)
    /// Khách và Admin: lọc tự do theo mọi field, kể cả branchId.
    /// Manager: branchId trong query bị bỏ qua, luôn ép về chi nhánh mình quản lý.
    /// </summary>
    public class EquipmentFilterDto
    {
        public string? Name { get; set; }
        public int? BranchId { get; set; }
        public int? CategoryId { get; set; }

        /// <summary>true = lấy cả thiết bị đã ẩn. Chỉ Admin/Manager mới nên dùng field này.</summary>
        public bool IncludeDeleted { get; set; } = false;
    }

    public class CreateEquipmentDto
    {
        public string EquipmentName { get; set; } = null!;
        public int CategoryId { get; set; }

        /// <summary>Với Manager: bị Service ép về chi nhánh mình quản lý, bất kể client gửi gì.</summary>
        public int BranchId { get; set; }
        public string? Description { get; set; }
        public IFormFile? Image { get; set; }
    }

    public class UpdateEquipmentDto
    {
        public string? EquipmentName { get; set; }
        public int? CategoryId { get; set; }

        /// <summary>Chỉ Admin mới được đổi chi nhánh của thiết bị.</summary>
        public int? BranchId { get; set; }
        public string? Description { get; set; }
        public IFormFile? Image { get; set; }
    }
}