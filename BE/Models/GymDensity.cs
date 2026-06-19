using System;
using System.Collections.Generic;

namespace BE.Models;

/// <summary>
/// Snapshot mật độ người tập theo thời gian — dữ liệu do job ngoài hoặc cảm biến ghi vào
/// </summary>
public partial class GymDensity
{
    /// <summary>
    /// Mã bản ghi — khóa chính tự tăng
    /// </summary>
    public long DensityId { get; set; }

    /// <summary>
    /// Chi nhánh được ghi nhận — FK tới branches.branch_id
    /// </summary>
    public int BranchId { get; set; }

    /// <summary>
    /// Thời điểm ghi nhận snapshot, VD: mỗi 15 phút job tự chạy
    /// </summary>
    public DateTime RecordedAt { get; set; }

    /// <summary>
    /// Số người đang có mặt tại chi nhánh tại thời điểm ghi nhận
    /// </summary>
    public short Headcount { get; set; }

    public virtual Branch Branch { get; set; } = null!;
}
