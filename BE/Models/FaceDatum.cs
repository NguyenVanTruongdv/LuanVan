using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Dữ liệu nhận diện khuôn mặt hội viên liên kết với AWS Rekognition
/// </summary>
public partial class FaceDatum
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long FaceDataId { get; set; }

    /// <summary>
    /// Hội viên sở hữu khuôn mặt — FK tới members.member_id, quan hệ 1-1
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Face ID do AWS Rekognition trả về sau khi đăng ký
    /// </summary>
    public string FaceIdAws { get; set; } = null!;

    /// <summary>
    /// URL ảnh đại diện lưu trên S3, có thể NULL
    /// </summary>
    public string? ProfileImage { get; set; }

    /// <summary>
    /// Thời điểm đăng ký khuôn mặt
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Nhân viên thực hiện đăng ký khuôn mặt — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
