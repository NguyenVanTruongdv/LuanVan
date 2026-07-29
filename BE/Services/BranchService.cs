using BE.Data;
using BE.DTOs.Branches;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class BranchService
{
    private readonly GymManagementContext _context;
    private readonly BranchImageService _branchImageService;

    public BranchService(GymManagementContext context, BranchImageService branchImageService)
    {
        _context = context;
        _branchImageService = branchImageService;
    }

    public async Task<BranchListResultDto> GetListAsync(BranchFilterDto filter)
    {
        var query = _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .Where(b => b.Status != BranchSatusEnum.Inactive.ToString())
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Name))
        {
            var keyword = filter.Name.Trim().ToLower();
            query = query.Where(b => b.BranchName.ToLower().Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(b => b.Status == filter.Status);
        }

        var totalCount = await query.CountAsync();

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var branches = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new BranchListResultDto
        {
            Items = branches.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<BranchDto?> GetByIdAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        return branch is null ? null : MapToDto(branch);
    }

    public async Task<BranchDto> CreateAsync(CreateBranchDto dto)
    {
        var branch = new Branch
        {
            BranchName = dto.BranchName,
            Address = dto.Address,
            Phone = dto.Phone,
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync(); // cần BranchId trước khi upload ảnh / gán quản lý

        if (dto.ManagerIds is { Count: > 0 })
        {
            await AssignManagersAsync(branch, dto.ManagerIds);
        }

        if (dto.Images is { Count: > 0 })
        {
            var add = new AddBranchImagesDto
            {
                Images = dto.Images,
                ImageTypes = dto.ImageTypes
            };
            await _branchImageService.AddImagesAsync(branch.BranchId, add);
        }

        await _context.SaveChangesAsync();

        await _context.Entry(branch).Collection(b => b.BranchImages).LoadAsync();
        await _context.Entry(branch).Collection(b => b.Employees).LoadAsync();

        // Cần load thêm Account để MapToDto lấy được Phone (không có bước này thì
        // Employee.Account luôn null nếu lazy loading không bật -> NullReferenceException).
        foreach (var employee in branch.Employees)
        {
            await _context.Entry(employee).Reference(e => e.Account).LoadAsync();
        }

        return MapToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(int branchId, UpdateBranchDto dto)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        if (branch is null) return null;

        branch.BranchName = dto.BranchName;
        branch.Address = dto.Address;
        branch.Phone = dto.Phone;
        branch.Status = dto.Status;

        // Nếu FE có gửi ManagerIds thì đồng bộ lại danh sách nhân viên quản lý của chi nhánh này
        if (dto.ManagerIds != null)
        {
            await SyncManagersAsync(branch, dto.ManagerIds);
        }

        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    public async Task<bool> SoftDeleteAsync(int branchId)
    {
        var branch = await _context.Branches
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        if (branch is null) return false;

        branch.Status = BranchSatusEnum.Inactive.ToString();
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<BranchDto?> RestoreAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status == BranchSatusEnum.Inactive.ToString());

        if (branch is null) return null;

        branch.Status = "Active";
        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    // ===================== QUẢN LÝ CHI NHÁNH =====================
    // Branch.Employees <-> Employee.Branches là skip navigation many-to-many
    // (qua bảng nối EmployeeBranch), nên chỉ cần Add/Remove trực tiếp đối tượng Employee,
    // EF Core tự lo việc ghi/xóa record ở bảng nối.

    /// <summary>Gán thêm các nhân viên làm quản lý cho 1 chi nhánh (dùng khi tạo mới, chưa có ai)</summary>
    private async Task AssignManagersAsync(Branch branch, List<long> employeeIds)
    {
        var employees = await _context.Employees
            .Where(e => employeeIds.Contains(e.EmployeeId))
            .ToListAsync();

        foreach (var employee in employees)
        {
            if (!branch.Employees.Any(e => e.EmployeeId == employee.EmployeeId))
            {
                branch.Employees.Add(employee);
            }
        }
    }

    /// <summary>
    /// Đồng bộ danh sách quản lý của 1 chi nhánh theo đúng danh sách employeeIds truyền vào:
    /// - Ai không còn trong danh sách -> gỡ khỏi chi nhánh
    /// - Ai mới có trong danh sách -> thêm vào chi nhánh
    /// </summary>
    private async Task SyncManagersAsync(Branch branch, List<long> employeeIds)
    {
        var currentManagers = branch.Employees.ToList();

        // Gỡ quản lý không còn trong danh sách mới
        foreach (var employee in currentManagers)
        {
            if (!employeeIds.Contains(employee.EmployeeId))
            {
                branch.Employees.Remove(employee);
            }
        }

        // Thêm quản lý mới chưa có trong chi nhánh này
        var existingEmployeeIds = branch.Employees.Select(e => e.EmployeeId).ToHashSet();
        var missingIds = employeeIds.Distinct().Where(id => !existingEmployeeIds.Contains(id)).ToList();

        if (missingIds.Count > 0)
        {
            var newEmployees = await _context.Employees
                .Where(e => missingIds.Contains(e.EmployeeId))
                .ToListAsync();

            foreach (var employee in newEmployees)
            {
                branch.Employees.Add(employee);
            }
        }
    }

    internal static BranchDto MapToDto(Branch b) => new()
    {
        BranchId = b.BranchId,
        BranchName = b.BranchName,
        Address = b.Address,
        Phone = b.Phone,
        Status = b.Status,
        CreatedAt = b.CreatedAt,
        Managers = b.Employees
            .Select(e => new BranchManagerDto
            {
                EmployeeId = e.EmployeeId,
                FullName = e.FullName,
                // e.Account?.Phone: Account có thể null nếu chưa Include/Load,
                // ?. để tránh NullReferenceException.
                Phone = e.Account?.Phone,
            })
            .ToList(),
        Images = b.BranchImages
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .Select(BranchImageService.MapImageToDto)
            .ToList()
    };

    public async Task<List<ManagerLookupDto>> GetAvailableManagersAsync()
    {
        return await _context.Employees.Include(e => e.Role)
            .Where(e => e.Role.RoleId == 2
                        && e.Status == "Active")
            .Select(e => new ManagerLookupDto
            {
                EmployeeId = e.EmployeeId,
                FullName = e.FullName,
                TotalBranches = e.Branches.Count
            })
            .Where(x => x.TotalBranches < 3)
            .OrderBy(x => x.TotalBranches)
            .ThenBy(x => x.FullName)
            .ToListAsync();
    }
}