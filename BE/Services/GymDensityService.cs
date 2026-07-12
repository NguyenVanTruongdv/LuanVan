using BE.Data;
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
}