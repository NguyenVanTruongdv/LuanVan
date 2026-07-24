using BE.Data;
using BE.Models;

using Microsoft.EntityFrameworkCore;

namespace BE.Services;

// Quản lý danh sách gói tập
public class MembershipPlanService
{
    private readonly GymManagementContext _db;

    public MembershipPlanService(GymManagementContext db)
    {
        _db = db;
    }

    // Lấy danh sách gói tập đang bán
    public async Task<List<MembershipPlan>> GetAllAsync(string? packageName)
    {
        var query = _db.MembershipPlans
            .Where(p => p.Status == MembershipPlanEnum.OnSale.ToString())
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(packageName))
        {
            query = query.Where(p => p.PlanName.Contains(packageName));
        }

        return await query
            .OrderByDescending(p => p.IsPopular)
            .ThenBy(p => p.Price)
            .ToListAsync();
    }

    // Lấy chi tiết gói tập
    public async Task<MembershipPlan?> GetByIdAsync(int id)
    {
        return await _db.MembershipPlans
            .FirstOrDefaultAsync(p => p.PlanId == id);
    }

    // Tạo gói tập — Status luôn do service set, không nhận từ client
    public async Task<MembershipPlan> CreateAsync(MembershipPlanRequest request)
    {
        var plan = new MembershipPlan
        {
            PlanName = request.PlanName,
            Price = request.Price,
            DurationDays = request.DurationDays,
            Description = request.Description,
            IsPopular = request.IsPopular,
            Status = MembershipPlanEnum.OnSale.ToString(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.MembershipPlans.Add(plan);
        await _db.SaveChangesAsync();

        return plan;
    }

    // Cập nhật thông tin gói tập — KHÔNG đụng tới Status ở đây.
    // Đổi trạng thái (ngừng bán / mở bán lại) đi qua UpdateStatusAsync / DeleteAsync riêng.
    public async Task<bool> UpdateAsync(int id, MembershipPlanRequest request)
    {
        var existing = await _db.MembershipPlans.FindAsync(id);

        if (existing == null)
            return false;

        existing.PlanName = request.PlanName;
        existing.Price = request.Price;
        existing.DurationDays = request.DurationDays;
        existing.Description = request.Description;
        existing.IsPopular = request.IsPopular;

        await _db.SaveChangesAsync();

        return true;
    }

    // Đổi trạng thái gói tập (tách riêng khỏi UpdateAsync).
    // status truyền vào phải khớp tên value của MembershipPlanEnum (vd: "OnSale", "Discontinued").
    public async Task<bool> UpdateStatusAsync(int id, MembershipPlanEnum status)
    {
        var existing = await _db.MembershipPlans.FindAsync(id);

        if (existing == null)
            return false;

        existing.Status = status.ToString();
        await _db.SaveChangesAsync();

        return true;
    }

    // Ngừng kinh doanh gói tập (Soft Delete)
    public async Task<bool> DeleteAsync(int id)
    {
        return await UpdateStatusAsync(id, MembershipPlanEnum.Discontinued);
    }
            public class MembershipPlanRequest
        {
            public string PlanName { get; set; } = null!;
        
            public decimal Price { get; set; }
        
            public short DurationDays { get; set; }
        
            public string? Description { get; set; }
        
            public bool IsPopular { get; set; }
        }
        
        // Dùng riêng cho endpoint PATCH /api/packages/{id}/status.
        // Status là MembershipPlanEnum nên body chỉ cần { "status": "OnSale" } hoặc { "status": "Discontinued" }.
        public class UpdateMembershipPlanStatusRequest
        {
            public MembershipPlanEnum Status { get; set; }
}
}