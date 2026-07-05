using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Lịch sử cập nhật thông tin hội viên (theo từng field) — chỉ ghi thêm, không sửa xóa
/// </summary>
public partial class MemberUpdateLog
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Mã phiên cập nhật (UUID) — nhóm các field_name cùng thay đổi trong 1 lần lưu
    /// </summary>
    public Guid UpdateSessionId { get; set; }

    /// <summary>
    /// Hội viên được cập nhật thông tin — FK tới members.member_id
    /// </summary>
    public long MemberId { get; set; }

    /// <summary>
    /// Tên trường dữ liệu bị thay đổi, VD: phone, full_name, gender
    /// </summary>
    public string FieldName { get; set; } = null!;

    /// <summary>
    /// Giá trị cũ trước khi thay đổi — NULL nếu trường trước đó chưa có giá trị
    /// </summary>
    public string? OldValue { get; set; }

    /// <summary>
    /// Giá trị mới sau khi thay đổi
    /// </summary>
    public string NewValue { get; set; } = null!;

    public long? UpdatedByEmployeeId { get; set; }

    /// <summary>
    /// Thời điểm thực hiện cập nhật
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    public virtual Member Member { get; set; } = null!;

    public virtual Employee? UpdatedByEmployee { get; set; }
}
