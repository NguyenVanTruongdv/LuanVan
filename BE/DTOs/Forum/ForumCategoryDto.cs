using System.ComponentModel.DataAnnotations;

namespace BE.DTOs;

public class ForumCategoryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public string? Slug { get; set; }
    public string? Icon { get; set; }
    public int DisplayOrder { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public int PostCount { get; set; } // tính động, không lưu trong bảng
}

public class ForumCategoryCreateDto
{
    [Required, MaxLength(100)]
    public string CategoryName { get; set; } = null!;

    [MaxLength(100)]
    public string? Slug { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    public int DisplayOrder { get; set; }
}

public class ForumCategoryUpdateDto
{
    [Required, MaxLength(100)]
    public string CategoryName { get; set; } = null!;

    [MaxLength(100)]
    public string? Slug { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    public int DisplayOrder { get; set; }

    [Required]
    public string Status { get; set; } = null!; // "Active" | "Inactive"
}