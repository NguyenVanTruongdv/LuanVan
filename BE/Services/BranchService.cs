using BE.Data;
using BE.DTOs.Branches;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class BranchService
{
    private readonly GymManagementContext _context;
    private readonly BranchImageService _branchImageService;

    private const string ManagerRole = "Manager";

    public BranchService(GymManagementContext context, BranchImageService branchImageService)
    {
        _context = context;
        _branchImageService = branchImageService;
    }

    public async Task<BranchListResultDto> GetListAsync(BranchFilterDto filter)
    {
        var query = _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.EmployeeBranches).ThenInclude(eb => eb.Employee)
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
            .Include(b => b.EmployeeBranches).ThenInclude(eb => eb.Employee)
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
        await _context.SaveChangesAsync(); // cần BranchId trước khi upload ảnh / gán manager

        if (dto.ManagerIds is { Count: > 0 })
        {
            await AssignManagersAsync(branch.BranchId, dto.ManagerIds);
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
        await _context.Entry(branch).Collection(b => b.EmployeeBranches).LoadAsync();
        foreach (var eb in branch.EmployeeBranches)
        {
            await _context.Entry(eb).Reference(x => x.Employee).LoadAsync();
        }

        return MapToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(int branchId, UpdateBranchDto dto)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.EmployeeBranches).ThenInclude(eb => eb.Employee)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status != BranchSatusEnum.Inactive.ToString());

        if (branch is null) return null;

        branch.BranchName = dto.BranchName;
        branch.Address = dto.Address;
        branch.Phone = dto.Phone;
        branch.Status = dto.Status;

        // Nếu FE có gửi ManagerIds thì đồng bộ lại danh sách quản lý của chi nhánh này
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
            .Include(b => b.EmployeeBranches).ThenInclude(eb => eb.Employee)
            .FirstOrDefaultAsync(b => b.BranchId == branchId && b.Status == BranchSatusEnum.Inactive.ToString());

        if (branch is null) return null;

        branch.Status = "Active";
        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    // ===================== QUẢN LÝ CHI NHÁNH (EmployeeBranch.BranchRole = Manager) =====================

    /// <summary>Gán thêm các nhân viên làm quản lý cho 1 chi nhánh (dùng khi tạo mới, chưa có record nào)</summary>
    private async Task AssignManagersAsync(int branchId, List<long> employeeIds)
    {
        foreach (long employeeId in employeeIds.Distinct())
        {
            bool exists = await _context.EmployeeBranches
                .AnyAsync(eb => eb.BranchId == branchId && eb.EmployeeId == employeeId);

            if (!exists)
            {
                _context.EmployeeBranches.Add(new EmployeeBranch
                {
                    BranchId = branchId,
                    EmployeeId = employeeId,
                    BranchRole = ManagerRole
                });
            }
        }
    }

    /// <summary>
    /// Đồng bộ danh sách quản lý của 1 chi nhánh theo đúng danh sách employeeIds truyền vào:
    /// - Ai không còn trong danh sách -> xóa record (hoặc hạ role, tùy nghiệp vụ)
    /// - Ai mới có trong danh sách -> thêm record mới với BranchRole = Manager
    /// - Nhân viên với BranchRole khác (VD "Staff") tại chi nhánh này không bị ảnh hưởng
    /// </summary>
    private async Task SyncManagersAsync(Branch branch, List<long> employeeIds)
    {
        List<EmployeeBranch> currentManagers = branch.EmployeeBranches
            .Where(eb => eb.BranchRole == ManagerRole)
            .ToList();

        // Xóa quản lý không còn trong danh sách mới
        foreach (var eb in currentManagers)
        {
            if (!employeeIds.Contains(eb.EmployeeId))
            {
                _context.EmployeeBranches.Remove(eb);
            }
        }

        // Thêm quản lý mới chưa có record tại chi nhánh này
        var existingEmployeeIds = branch.EmployeeBranches.Select(eb => eb.EmployeeId).ToHashSet();

        foreach (long employeeId in employeeIds.Distinct())
        {
            if (!existingEmployeeIds.Contains(employeeId))
            {
                _context.EmployeeBranches.Add(new EmployeeBranch
                {
                    BranchId = branch.BranchId,
                    EmployeeId = employeeId,
                    BranchRole = ManagerRole
                });
            }
            else
            {
                // Đã có record (có thể trước đó là Staff) -> nâng lên Manager
                var eb = branch.EmployeeBranches.First(x => x.EmployeeId == employeeId);
                eb.BranchRole = ManagerRole;
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
        Managers = b.EmployeeBranches
            .Where(eb => eb.BranchRole == ManagerRole)
            .Select(eb => new BranchManagerDto
            {
                EmployeeId = eb.EmployeeId,
                FullName = eb.Employee?.FullName ?? "",
                Phone = eb.Employee?.Phone
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
            return await _context.Employees.Include(e=>e.Role)
                .Where(e => e.Role.RoleId==2
                            && e.Status == "Active")
                .Select(e => new ManagerLookupDto
                {
                    EmployeeId = e.EmployeeId,
                    FullName = e.FullName,
                    TotalBranches = e.EmployeeBranches.Count(eb => eb.BranchRole == "Manager")
                })
                .Where(x => x.TotalBranches < 3)
                .OrderBy(x => x.TotalBranches)
                .ThenBy(x => x.FullName)
                .ToListAsync();
        }
}