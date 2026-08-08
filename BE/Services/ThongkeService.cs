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
            DateTime tuNgay = DateTime.Now.AddDays(-Math.Abs(soNgayGanNhat));

            var query = _context.GymDensities.Where(d => d.RecordedAt >= tuNgay);

            if (branchId.HasValue)
            {
                query = query.Where(d => d.BranchId == branchId.Value);
            }

            // Lấy dữ liệu thô trước, gộp nhóm theo thứ/giờ ở phía application cho chắc ăn.
            var duLieuTho = await query
                .Select(d => new { d.RecordedAt, d.Headcount })
                .ToListAsync();

            var gomNhom = duLieuTho
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
                    gomNhom.TryGetValue(new { DayOfWeek = dow, Hour = h }, out int trungBinh);
                    string start = h.ToString("00");
                    string end = ((h + 1) % 24).ToString("00");
                    slots.Add(new DensitySlotDto
                    {
                        Slot = $"{start}:00-{end}:00",
                        Luot = trungBinh,
                    });
                }
                result.Data[key] = slots;
            }

            return result;
        }

        // ============ TỔNG QUAN CỦA HỘI VIÊN ============

        public async Task<ThongKeSummaryDto> GetSummaryAsync(int memberId)
        {
            DateTime now = DateTime.Now;
            DateTime dauThang = new DateTime(now.Year, now.Month, 1);
            DateTime dauThangSau = dauThang.AddMonths(1);

            var checkInsThangNay = await _context.CheckIns
                .Where(c => c.MemberId == memberId
                            && c.CheckInTime >= dauThang
                            && c.CheckInTime < dauThangSau)
                .Select(c => new { c.CheckInTime, c.CheckOutTime })
                .ToListAsync();

            int buoiTapThangNay = checkInsThangNay.Count;

            double tongPhut = checkInsThangNay
                .Where(c => c.CheckOutTime.HasValue)
                .Sum(c => (c.CheckOutTime!.Value - c.CheckInTime).TotalMinutes);

            int gio = (int)(tongPhut / 60);
            int phut = (int)(tongPhut % 60);

            int buoiSangSom = checkInsThangNay.Count(c => c.CheckInTime.Hour < 8);

            int streak = await TinhStreakAsync(memberId);

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
            List<DateTime> cacNgayTap = await _context.CheckIns
                .Where(c => c.MemberId == memberId)
                .Select(c => c.CheckInTime.Date)
                .Distinct()
                .ToListAsync();

            var tapSet = cacNgayTap.ToHashSet();
            DateTime homNay = DateTime.Today;

            // Hôm nay chưa tập thì cho phép streak tính bắt đầu từ hôm qua.
            DateTime conTro = tapSet.Contains(homNay) ? homNay : homNay.AddDays(-1);

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

            int totalCount = await baseQuery.CountAsync();

            var raw = await baseQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new { c.CheckInId, c.CheckInTime, c.CheckOutTime })
                .ToListAsync();

            List<CheckInHistoryItemDto> items = raw.Select(c => new CheckInHistoryItemDto
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
            int gio = (int)ts.TotalHours;
            int phut = ts.Minutes;
            return $"{gio}h {phut}m";
        }
    }
}