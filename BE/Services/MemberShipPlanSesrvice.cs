using BE.Data;
using BE.DTOs.Payment;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Quản lý DANH SÁCH GÓI TẬP (MembershipPlan) — catalog gói bán: tên, giá, số ngày, mô tả.
// KHÔNG liên quan đến việc 1 hội viên đang đăng ký gói nào (đó là MemberPackage, xem PackageService).
public class MembershipPlanService
{
    private readonly GymManagementContext _db;

    public MembershipPlanService(GymManagementContext db)
    {
        _db = db;
    }

    public async Task<List<MembershipPlan>> GetAllAsync(string? packageName)
    {
        var query = _db.MembershipPlans.Where(p => p.Status == MembershipPlanEnum.OnSale.ToString() && p.PlanType == "Customer").AsQueryable();

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

    // Xóa gói tập (soft delete: chuyển sang Discontinued, không xóa record thật)
    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _db.MembershipPlans.FindAsync(id);
        if (existing == null)
            return false;
        existing.Status = MembershipPlanEnum.Discontinued.ToString();
        await _db.SaveChangesAsync();
        return true;
    }
    public async Task<List<InternalMembershipPlanDto>> GetAllInternalAsync(string? packageName)
    {
        var query = _db.MembershipPlans
            .Where(p => p.Status == MembershipPlanEnum.OnSale.ToString()
                    && p.PlanType == "Internal")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(packageName))
        {
            query = query.Where(p => p.PlanName.Contains(packageName));
        }

        return await query
            .Select(p => new InternalMembershipPlanDto
            {
                PlanId = p.PlanId,
                PlanName = p.PlanName,
                Price = p.Price,
                DurationDays = p.DurationDays,
                Description = p.Description,
                PlanType = p.PlanType,
                Status = p.Status,
                CreatedAt = p.CreatedAt,
                IsPopular = p.IsPopular
            })
            .ToListAsync();
    }

}