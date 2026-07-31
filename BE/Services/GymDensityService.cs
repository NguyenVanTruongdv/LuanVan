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
        int soLuongHienTai = await GetCurrentHeadcountAsync(branchId);
        int soLuongMoi = soLuongHienTai + delta;

        if (soLuongMoi < 0)
        {
            soLuongMoi = 0; // an toàn, tránh âm do lệch dữ liệu (vd. thiếu 1 lượt check-in)
        }

        var banGhiMoi = new Models.GymDensity
        {
            BranchId = branchId,
            Headcount = (short)soLuongMoi,
            RecordedAt = DateTime.Now
        };

        _context.GymDensities.Add(banGhiMoi);
        await _context.SaveChangesAsync();

        return soLuongMoi;
    }

    public async Task<int> GetCurrentHeadcountAsync(int branchId)
    {
        var banGhiCuoiCung = await _context.GymDensities
            .Where(d => d.BranchId == branchId)
            .OrderByDescending(d => d.RecordedAt)
            .ThenByDescending(d => d.DensityId)
            .FirstOrDefaultAsync();

        if (banGhiCuoiCung == null)
        {
            return 0;
        }

        return banGhiCuoiCung.Headcount;
    }

    public async Task<List<GymDensityHourDto>> GetDensityByBranchAsync(
        int branchId,
        int hoursCount = 5,
        CancellationToken ct = default)
    {

        DateTime now = DateTime.Now;
        DateTime khungGioHienTai = new DateTime(now.Year, now.Month, now.Day, now.Hour, 0, 0);


        DateTime khungGioSomNhat = khungGioHienTai.AddHours(-(hoursCount - 1));


        DateTime fromTime = khungGioSomNhat;

        var rawData = await _context.GymDensities
            .Where(x => x.BranchId == branchId && x.RecordedAt >= fromTime)
            .OrderByDescending(x => x.RecordedAt)
            .ToListAsync(ct);


        Dictionary<DateTime, short> soLuongTheoGio = new Dictionary<DateTime, short>();
        foreach (var record in rawData)
        {
            DateTime khungGio = new DateTime(
                record.RecordedAt.Year, record.RecordedAt.Month, record.RecordedAt.Day,
                record.RecordedAt.Hour, 0, 0);


            if (soLuongTheoGio.ContainsKey(khungGio) == false)
            {
                soLuongTheoGio[khungGio] = record.Headcount;
            }
        }

        List<GymDensityHourDto> ketQua = new List<GymDensityHourDto>();
        for (int i = 0; i < hoursCount; i++)
        {
            DateTime slot = khungGioSomNhat.AddHours(i);

            short soLuong = 0;
            if (soLuongTheoGio.ContainsKey(slot))
            {
                soLuong = soLuongTheoGio[slot];
            }

            ketQua.Add(new GymDensityHourDto
            {
                HourSlot = slot,
                Headcount = soLuong
            });
        }


        return ketQua;
    }
}