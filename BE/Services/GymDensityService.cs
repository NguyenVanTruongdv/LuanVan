using BE.Data;
using BE.DTOs;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.GymDensity;


public class GymDensityService
{
    private readonly GymManagementContext _context;

    public GymDensityService(GymManagementContext context)
    {
        _context = context;
    }

    public async Task<int> AdjustAsync(int branchId, int delta)
    {
        var current = await GetCurrentHeadcountAsync(branchId);
        var next = current + delta;
        if (next < 0) next = 0; // an toàn, tránh âm do lệch dữ liệu (vd. thiếu 1 lượt check-in)

        _context.GymDensities.Add(new Models.GymDensity
        {
            BranchId = branchId,
            Headcount = (short)next,
            RecordedAt = DateTime.Now
        });
        await _context.SaveChangesAsync();

        return next;
    }

    public async Task<int> GetCurrentHeadcountAsync(int branchId)
    {
        var last = await _context.GymDensities
            .Where(d => d.BranchId == branchId)
            .OrderByDescending(d => d.RecordedAt)
            .ThenByDescending(d => d.DensityId)
            .FirstOrDefaultAsync();

        return last?.Headcount ?? 0;
    }
       public async Task<List<GymDensityHourDto>> GetDensityByBranchAsync(
            int branchId,
            int hoursCount = 5,
            CancellationToken ct = default)
        {
            // Giờ hiện tại (local), cắt bỏ phút/giây để làm mốc (khung giờ cuối cùng trong dãy trả về)
            var now = DateTime.Now;
            var currentHourSlot = new DateTime(
                now.Year, now.Month, now.Day, now.Hour, 0, 0);

            // Khung giờ sớm nhất cần trả về
            var earliestSlot = currentHourSlot.AddHours(-(hoursCount - 1));

            // Chỉ kéo dữ liệu trong khoảng thời gian đủ dùng, tránh load toàn bộ lịch sử
            var fromTime = earliestSlot;

            var rawData = await _context.GymDensities
                .Where(x => x.BranchId == branchId && x.RecordedAt >= fromTime)
                .OrderByDescending(x => x.RecordedAt)
                .ToListAsync(ct);

            // Gom nhóm theo khung giờ, lấy bản ghi mới nhất trong mỗi giờ -> dùng để tra cứu (lookup)
            var groupedByHour = rawData
                .GroupBy(x => new DateTime(
                    x.RecordedAt.Year, x.RecordedAt.Month, x.RecordedAt.Day,
                    x.RecordedAt.Hour, 0, 0))
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.RecordedAt).First().Headcount);

            // Sinh đủ hoursCount khung giờ liên tục, thiếu thì mặc định Headcount = 0
            var result = Enumerable.Range(0, hoursCount)
                .Select(i => earliestSlot.AddHours(i))
                .Select(slot => new GymDensityHourDto
                {
                    HourSlot = slot,
                    Headcount = (short)(groupedByHour.TryGetValue(slot, out var headcount) ? headcount : 0)
                })
                .OrderBy(x => x.HourSlot) // tăng dần để vẽ trái → phải
                .ToList();

            return result;
        }
}