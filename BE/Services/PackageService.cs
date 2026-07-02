using BE.Data;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class PackageService
{
    private readonly GymManagementContext _db;

    public PackageService(GymManagementContext db)
    {
        _db = db;
    }
    public async Task<List<MembershipPlan>> GetAllAsync(string? packageName)
    {
        var query = _db.MembershipPlans.Where(p => p.Status == MembershipPlanEnum.OnSale.ToString()).AsQueryable();

        if (!string.IsNullOrWhiteSpace(packageName))
        {
            query = query.Where(p => p.PlanName.Contains(packageName));
        }

        return await query.ToListAsync();
    }
    public async Task<MembershipPlan> GetById(int id)
    {
        return await _db.MembershipPlans.FindAsync(id);

    }
    public async Task<MembershipPlan> CreateAsync(MembershipPlan mbp)
    {
        mbp.Status = MembershipPlanEnum.OnSale.ToString();
        mbp.CreatedAt = DateTime.UtcNow;
        _db.Add(mbp);
        await _db.SaveChangesAsync();
        return mbp;
    }
    public async Task<bool> UpdateAsync(int id, MembershipPlan mbp)
    {
        var existing = await _db.MembershipPlans.FindAsync(id);
        if (existing == null)
            return false;
        existing.PlanName = mbp.PlanName;
        existing.Price = mbp.Price;
        existing.DurationDays = mbp.DurationDays;
        existing.Description = mbp.Description;
        await _db.SaveChangesAsync();
        return true;
    }

    // Xóa danh mục
    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _db.MembershipPlans.FindAsync(id);
        if (existing == null)
            return false;
        existing.Status = MembershipPlanEnum.Discontinued.ToString();
        await _db.SaveChangesAsync();
        return true;
    }
}