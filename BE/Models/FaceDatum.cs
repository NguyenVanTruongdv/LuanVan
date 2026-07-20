using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Dữ liệu nhận diện khuôn mặt hội viên (AWS Rekognition) — chỉ nhân viên mới được tạo faceId
/// </summary>
public partial class FaceDatum
{
    public long FaceDataId { get; set; }

    public long MemberId { get; set; }

    public string FaceIdAws { get; set; } = null!;

    public string? ProfileImage { get; set; }

    /// <summary>
    /// Nhân viên đã đăng ký/tạo faceId này — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;

    public virtual Member Member { get; set; } = null!;
}
