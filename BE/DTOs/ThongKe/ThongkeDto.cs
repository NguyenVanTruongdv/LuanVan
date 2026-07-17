using System;
using System.Collections.Generic;

namespace BE.DTOs
{
    // ============ MẬT ĐỘ PHÒNG TẬP (công khai) ============

    /// <summary>Một khung giờ trong ngày kèm số lượt trung bình.</summary>
    public class DensitySlotDto
    {
        /// <summary>VD: "06:00-07:00"</summary>
        public string Slot { get; set; } = string.Empty;

        /// <summary>Số người trung bình trong khung giờ này (làm tròn).</summary>
        public int Luot { get; set; }
    }
    public class GymDensityHourDto
    {
        public DateTime HourSlot { get; set; }   // Mốc giờ, VD: 06:00
        public short Headcount { get; set; }     // Số người tại thời điểm mới nhất trong giờ đó
    }

    /// <summary>Kết quả mật độ phòng tập, key là mã thứ (T2..CN).</summary>
    public class GymDensityResponseDto
    {
        /// <summary>Key: "T2","T3",...,"CN". Value: 24 khung giờ trong ngày.</summary>
        public Dictionary<string, List<DensitySlotDto>> Data { get; set; } = new();

        /// <summary>Số ngày dữ liệu lịch sử dùng để tính trung bình.</summary>
        public int SoNgayDuLieu { get; set; }
    }

    // ============ TỔNG QUAN CỦA HỘI VIÊN (cần đăng nhập) ============

    public class ThongKeSummaryDto
    {
        /// <summary>Số buổi tập trong tháng hiện tại.</summary>
        public int BuoiTapThangNay { get; set; }

        /// <summary>Tổng thời lượng tập trong tháng, dạng "Xh Ym".</summary>
        public string TongGioTap { get; set; } = "0h 0m";

        /// <summary>Số buổi check-in trước 8h sáng trong tháng.</summary>
        public int BuoiSangSom { get; set; }

        /// <summary>Số ngày tập liên tục tính đến hôm nay.</summary>
        public int StreakHienTai { get; set; }
    }

    // ============ LỊCH SỬ CHECK-IN CỦA HỘI VIÊN (cần đăng nhập) ============

    public class CheckInHistoryItemDto
    {
        public long CheckInId { get; set; }

        /// <summary>Định dạng dd/MM/yyyy</summary>
        public string Date { get; set; } = string.Empty;

        /// <summary>Định dạng HH:mm</summary>
        public string CheckIn { get; set; } = string.Empty;

        /// <summary>Định dạng HH:mm, null nếu chưa check-out.</summary>
        public string? CheckOut { get; set; }

        /// <summary>Định dạng "Xh Ym", null nếu chưa check-out.</summary>
        public string? Duration { get; set; }

        /// <summary>"Đang tập" hoặc "Đã ra".</summary>
        public string Status { get; set; } = string.Empty;
    }

    public class CheckInHistoryResponseDto
    {
        public List<CheckInHistoryItemDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}