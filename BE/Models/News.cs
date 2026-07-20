using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Tin tức hiển thị cho hội viên
/// </summary>
public partial class News
{
    public int NewsId { get; set; }

    public string Title { get; set; } = null!;

    public string? Summary { get; set; }

    public string Content { get; set; } = null!;

    public string Status { get; set; } = null!;

    public long CreatedBy { get; set; }

    public int? BranchId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Branch? Branch { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;
}
