using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BE.Data;
using BE.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class ThongKeService 
    {
        private readonly GymManagementContext _context;

        // Thứ tự cố định giống frontend: T2 -> CN
        private static readonly (DayOfWeek Dow, string Key)[] DayOrder = new[]
        {
            (DayOfWeek.Monday, "T2"),
            (DayOfWeek.Tuesday, "T3"),
            (DayOfWeek.Wednesday, "T4"),
            (DayOfWeek.Thursday, "T5"),
            (DayOfWeek.Friday, "T6"),
            (DayOfWeek.Saturday, "T7"),
            (DayOfWeek.Sunday, "CN"),
        };

        public ThongKeService(GymManagementContext context)
        {
            _context = context;
        }

        // ============ MẬT ĐỘ PHÒNG TẬP (công khai) ============

        public async Task<GymDensityResponseDto> GetGymDensityAsync(int? branchId = null, int soNgayGanNhat = 90)
        {
            var tuNgay = DateTime.Now.AddDays(-Math.Abs(soNgayGanNhat));

            var query = _context.GymDensities
                .Where(d => d.RecordedAt >= tuNgay);

            if (branchId.HasValue)
            {
                query = query.Where(d => d.BranchId == branchId.Value);
            }

            // Chỉ lấy 2 trường cần thiết để gộp nhóm ở phía application (tránh dịch DayOfWeek sang SQL không ổn định)
            var rawData = await query
                .Select(d => new { d.RecordedAt, d.Headcount })
                .ToListAsync();

            // Gộp theo (thứ trong tuần, giờ trong ngày) -> lấy trung bình headcount
            var grouped = rawData
                .GroupBy(x => new { x.RecordedAt.DayOfWeek, Hour = x.RecordedAt.Hour })
                .ToDictionary(
                    g => g.Key,
                    g => (int)Math.Round(g.Average(x => x.Headcount))
                );

            var result = new GymDensityResponseDto { SoNgayDuLieu = soNgayGanNhat };

            foreach (var (dow, key) in DayOrder)
            {
                var slots = new List<DensitySlotDto>();
                for (int h = 0; h < 24; h++)
                {
                    grouped.TryGetValue(new { DayOfWeek = dow, Hour = h }, out var avg);
                    var start = h.ToString("00");
                    var end = ((h + 1) % 24).ToString("00");
                    slots.Add(new DensitySlotDto
                    {
                        Slot = $"{start}:00-{end}:00",
                        Luot = avg,
                    });
                }
                result.Data[key] = slots;
            }

            return result;
        }

        // ============ TỔNG QUAN CỦA HỘI VIÊN ============

        public async Task<ThongKeSummaryDto> GetSummaryAsync(int memberId)
        {
            var now = DateTime.Now;
            var dauThang = new DateTime(now.Year, now.Month, 1);
            var dauThangSau = dauThang.AddMonths(1);

            var checkInsThangNay = await _context.CheckIns
                .Where(c => c.MemberId == memberId
                            && c.CheckInTime >= dauThang
                            && c.CheckInTime < dauThangSau)
                .Select(c => new { c.CheckInTime, c.CheckOutTime })
                .ToListAsync();

            var buoiTapThangNay = checkInsThangNay.Count;

            var tongPhut = checkInsThangNay
                .Where(c => c.CheckOutTime.HasValue)
                .Sum(c => (c.CheckOutTime!.Value - c.CheckInTime).TotalMinutes);

            var gio = (int)(tongPhut / 60);
            var phut = (int)(tongPhut % 60);

            var buoiSangSom = checkInsThangNay.Count(c => c.CheckInTime.Hour < 8);

            var streak = await TinhStreakAsync(memberId);

            return new ThongKeSummaryDto
            {
                BuoiTapThangNay = buoiTapThangNay,
                TongGioTap = $"{gio}h {phut}m",
                BuoiSangSom = buoiSangSom,
                StreakHienTai = streak,
            };
        }

        private async Task<int> TinhStreakAsync(int memberId)
        {
            var cacNgayTap = await _context.CheckIns
                .Where(c => c.MemberId == memberId)
                .Select(c => c.CheckInTime.Date)
                .Distinct()
                .ToListAsync();

            var tapSet = cacNgayTap.ToHashSet();
            var homNay = DateTime.Today;

            // Nếu hôm nay chưa tập, cho phép tính streak bắt đầu từ hôm qua
            var conTro = tapSet.Contains(homNay) ? homNay : homNay.AddDays(-1);

            int streak = 0;
            while (tapSet.Contains(conTro))
            {
                streak++;
                conTro = conTro.AddDays(-1);
            }

            return streak;
        }

        // ============ LỊCH SỬ CHECK-IN CỦA HỘI VIÊN ============

        public async Task<CheckInHistoryResponseDto> GetCheckInHistoryAsync(int memberId, int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var baseQuery = _context.CheckIns
                .Where(c => c.MemberId == memberId)
                .OrderByDescending(c => c.CheckInTime);

            var totalCount = await baseQuery.CountAsync();

            // Lấy dữ liệu thô trước (EF dịch được sang SQL), format chuỗi được xử lý sau ở phía application
            var raw = await baseQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new { c.CheckInId, c.CheckInTime, c.CheckOutTime })
                .ToListAsync();

            var items = raw.Select(c => new CheckInHistoryItemDto
            {
                CheckInId = c.CheckInId,
                Date = c.CheckInTime.ToString("dd/MM/yyyy"),
                CheckIn = c.CheckInTime.ToString("HH:mm"),
                CheckOut = c.CheckOutTime.HasValue ? c.CheckOutTime.Value.ToString("HH:mm") : null,
                Duration = c.CheckOutTime.HasValue
                    ? FormatDuration(c.CheckOutTime.Value - c.CheckInTime)
                    : null,
                Status = c.CheckOutTime.HasValue ? "Đã ra" : "Đang tập",
            }).ToList();

            return new CheckInHistoryResponseDto
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            };
        }

        private static string FormatDuration(TimeSpan ts)
        {
            var gio = (int)ts.TotalHours;
            var phut = ts.Minutes;
            return $"{gio}h {phut}m";
        }
    }
}