using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Tin tức / bài viết hiển thị cho hội viên
/// </summary>
public partial class News
{
    /// <summary>
    /// Mã tin tức — khóa chính tự tăng
    /// </summary>
    public int NewsId { get; set; }

    /// <summary>
    /// Tiêu đề tin tức
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// Tóm tắt ngắn hiển thị ở danh sách tin tức
    /// </summary>
    public string? Summary { get; set; }

    /// <summary>
    /// Nội dung đầy đủ của bài tin tức
    /// </summary>
    public string Content { get; set; } = null!;

    public string Status { get; set; } = null!;

    /// <summary>
    /// Nhân viên soạn bài — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    /// <summary>
    /// Thời điểm bài viết được đăng — điền khi status = Published
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// Thời điểm tạo bài viết
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật gần nhất
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;
}
