using BE.Data;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class EquipmentCategoryService
{
    private readonly GymManagementContext _db;

    public EquipmentCategoryService(GymManagementContext db)
    {
        _db = db;
    }

    // Lấy danh sách tất cả danh mục
    public async Task<List<EquipmentCategory>> GetAllAsync()
    {
        return await _db.EquipmentCategories.ToListAsync();
    }

    // Lấy danh mục theo Id
    public async Task<EquipmentCategory?> GetByIdAsync(int id)
    {
        return await _db.EquipmentCategories.FindAsync(id);
    }

    // Thêm mới danh mục
    public async Task<EquipmentCategory> CreateAsync(EquipmentCategory category)
    {
        _db.EquipmentCategories.Add(category);
        await _db.SaveChangesAsync();
        return category;
    }

    // Sửa danh mục
    public async Task<bool> UpdateAsync(int id, EquipmentCategory category)
    {
        var existing = await _db.EquipmentCategories.FindAsync(id);
        if (existing == null)
            return false;

        existing.CategoryName = category.CategoryName;
        existing.Description = category.Description;

        await _db.SaveChangesAsync();
        return true;
    }

    // Xóa danh mục
    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _db.EquipmentCategories.FindAsync(id);
        if (existing == null)
            return false;
        if (existing.Equipment.Any())
        {
           throw new InvalidOperationException("Không thể xóa danh mục vì đang có thiết bị sử dụng");
        }

        _db.EquipmentCategories.Remove(existing);
        await _db.SaveChangesAsync();
        return true;
    }
}