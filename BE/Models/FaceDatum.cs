using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Dữ liệu nhận diện khuôn mặt (AWS Rekognition) dùng chung cho hội viên và nhân viên — chỉ nhân viên mới được tạo faceId
/// </summary>
public partial class FaceDatum
{
    public long FaceDataId { get; set; }

    /// <summary>
    /// Hội viên sở hữu faceId — FK tới members.member_id. NULL nếu đây là faceId của nhân viên
    /// </summary>
    public long? MemberId { get; set; }

    /// <summary>
    /// Nhân viên sở hữu faceId — FK tới employees.employee_id. NULL nếu đây là faceId của hội viên
    /// </summary>
    public long? EmployeeId { get; set; }

    public string FaceIdAws { get; set; } = null!;

    public string? ProfileImage { get; set; }

    /// <summary>
    /// Nhân viên đã đăng ký/tạo faceId này — FK tới employees.employee_id
    /// </summary>
    public long CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Employee CreatedByNavigation { get; set; } = null!;

    public virtual Employee? Employee { get; set; }

    public virtual Member? Member { get; set; }
}
