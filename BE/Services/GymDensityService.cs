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
        // Chỉ kéo dữ liệu trong khoảng thời gian đủ dùng (vd: hoursCount + 1 giờ gần nhất)
        // để tránh load toàn bộ lịch sử của chi nhánh
        var fromTime = DateTime.UtcNow.AddHours(-(hoursCount + 1));

        var rawData = await _context.GymDensities
            .Where(x => x.BranchId == branchId && x.RecordedAt >= fromTime)
            .OrderByDescending(x => x.RecordedAt)
            .ToListAsync(ct);

        // Gom nhóm theo khung giờ (bỏ phút/giây), lấy bản ghi mới nhất trong mỗi giờ
        var result = rawData
            .GroupBy(x => new DateTime(
                x.RecordedAt.Year, x.RecordedAt.Month, x.RecordedAt.Day,
                x.RecordedAt.Hour, 0, 0))
            .Select(g => new GymDensityHourDto
            {
                HourSlot = g.Key,
                Headcount = g.OrderByDescending(x => x.RecordedAt).First().Headcount
            })
            .OrderByDescending(x => x.HourSlot)
            .Take(hoursCount)
            .OrderBy(x => x.HourSlot) // trả về theo thứ tự tăng dần để vẽ trái → phải
            .ToList();

        return result;
    }
}