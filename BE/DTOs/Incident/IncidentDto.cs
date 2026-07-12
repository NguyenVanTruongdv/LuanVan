using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Incidents;

public class CreateIncidentDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = null!;

    [Required]
    [StringLength(2000)]
    public string Description { get; set; } = null!;

    public int? BranchId { get; set; }

    public int? EquipmentId { get; set; }

    public List<IFormFile>? Images { get; set; }

    public IFormFile? Video { get; set; }
}

public class UpdateIncidentDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = null!;

    [Required]
    [StringLength(2000)]
    public string Description { get; set; } = null!;

    [Required]
    public int BranchId { get; set; }

    public int? EquipmentId { get; set; }

    [Required]
    public string Status { get; set; } = null!;

    public string? RejectReason { get; set; }
}

public class IncidentFilterDto
{
    public string? Keyword { get; set; }

    public int? EquipmentId { get; set; }
    public int? BranchId {get; set; }

    public string? Status { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}

public class IncidentListDto
{
    public int IncidentId { get; set; }

    public string Title { get; set; } = null!;

    public string BranchName { get; set; } = null!;

    public string? EquipmentName { get; set; }

    public string ReporterName { get; set; } = null!;

    public string ReporterPhone { get; set; } = null!;

    // Hội viên / Nhân viên
    public string ReporterRole { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    // Ảnh đầu tiên dùng làm thumbnail
    public string? Thumbnail { get; set; }
}

public class IncidentDetailDto
{
    public int IncidentId { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public int? EquipmentId { get; set; }

    public string? EquipmentName { get; set; }

    public string ReporterName { get; set; } = null!;

    public string ReporterPhone { get; set; } = null!;

    public string ReporterRole { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? RejectReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public List<IncidentMediaDto> Medias { get; set; } = new();
}

public class IncidentMediaDto
{
    // Image | Video
    public string MediaType { get; set; } = null!;

    public string MediaUrl { get; set; } = null!;
}