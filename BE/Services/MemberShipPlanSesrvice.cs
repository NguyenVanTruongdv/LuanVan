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

        var dsGoiTap = await query
            .OrderByDescending(p => p.IsPopular)
            .ThenBy(p => p.Price)
            .ToListAsync();

        return dsGoiTap;
    }

    // Lấy chi tiết gói tập
    public async Task<MembershipPlan?> GetByIdAsync(int id)
    {
        var goiTap = await _db.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == id);
        return goiTap;
    }

    // Tạo gói tập — Status luôn do service set, không nhận từ client
    public async Task<MembershipPlan> CreateAsync(MembershipPlanRequest request)
    {
        var goiTapMoi = new MembershipPlan
        {
            PlanName = request.PlanName,
            Price = request.Price,
            DurationDays = request.DurationDays,
            Description = request.Description,
            IsPopular = request.IsPopular,
            Status = MembershipPlanEnum.OnSale.ToString(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.MembershipPlans.Add(goiTapMoi);
        await _db.SaveChangesAsync();

        return goiTapMoi;
    }

    // Cập nhật thông tin gói tập — KHÔNG đụng tới Status ở đây.
    // Đổi trạng thái (ngừng bán / mở bán lại) đi qua UpdateStatusAsync / DeleteAsync riêng.
    public async Task<bool> UpdateAsync(int id, MembershipPlanRequest request)
    {
        var goiTapCu = await _db.MembershipPlans.FindAsync(id);

        if (goiTapCu == null)
        {
            return false;
        }

        goiTapCu.PlanName = request.PlanName;
        goiTapCu.Price = request.Price;
        goiTapCu.DurationDays = request.DurationDays;
        goiTapCu.Description = request.Description;
        goiTapCu.IsPopular = request.IsPopular;

        await _db.SaveChangesAsync();

        return true;
    }

    // Đổi trạng thái gói tập (tách riêng khỏi UpdateAsync).
    // status truyền vào phải khớp tên value của MembershipPlanEnum (vd: "OnSale", "Discontinued").
    public async Task<bool> UpdateStatusAsync(int id, MembershipPlanEnum status)
    {
        var goiTapCu = await _db.MembershipPlans.FindAsync(id);

        if (goiTapCu == null)
        {
            return false;
        }

        goiTapCu.Status = status.ToString();
        await _db.SaveChangesAsync();

        return true;
    }

    // Ngừng kinh doanh gói tập (Soft Delete)
    public async Task<bool> DeleteAsync(int id)
    {
        bool ketQua = await UpdateStatusAsync(id, MembershipPlanEnum.Discontinued);
        return ketQua;
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