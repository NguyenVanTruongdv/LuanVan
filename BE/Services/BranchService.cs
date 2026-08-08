using BE.Data;
using BE.DTOs.Branches;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class BranchService
{
    private readonly GymManagementContext _context;
    private readonly BranchImageService _branchImageService;

    private const int ManagerRoleId = 2;

    public BranchService(GymManagementContext context, BranchImageService branchImageService)
    {
        _context = context;
        _branchImageService = branchImageService;
    }

    // ===================== LẤY DANH SÁCH CHI NHÁNH (CÓ PHÂN TRANG) =====================
    public async Task<BranchListResultDto> GetListAsync(BranchFilterDto filter)
    {
        
        var query = _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .Include(b => b.Employees).ThenInclude(e => e.Role)
            .AsQueryable();

      
        query = query.Where(b => b.Status != BranchSatusEnum.Inactive.ToString());

       
        if (!string.IsNullOrWhiteSpace(filter.Name))
        {
            string keyword = filter.Name.Trim().ToLower();
            query = query.Where(b => b.BranchName.ToLower().Contains(keyword));
        }

       
        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(b => b.Status == filter.Status);
        }

        
        int totalCount = await query.CountAsync();

      
        int page = filter.Page;
        if (page < 1)
        {
            page = 1;
        }

        int pageSize = filter.PageSize;
        if (pageSize < 1)
        {
            pageSize = 20;
        }


        var branches = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

       
        var items = new List<BranchDto>();
        foreach (var branch in branches)
        {
            items.Add(MapToDto(branch));
        }

        return new BranchListResultDto
        {
            Items = items,
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
            .Include(b => b.Employees).ThenInclude(e => e.Role)
            .FirstOrDefaultAsync(b => b.BranchId == branchId
                                   && b.Status != BranchSatusEnum.Inactive.ToString());

        
        if (branch == null)
        {
            return null;
        }

        return MapToDto(branch);
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

        await _context.SaveChangesAsync();

        if (dto.ManagerIds != null && dto.ManagerIds.Count > 0)
        {
            await AssignManagersAsync(branch, dto.ManagerIds);
        }

     
        if (dto.Images != null && dto.Images.Count > 0)
        {
            var addImagesDto = new AddBranchImagesDto
            {
                Images = dto.Images,
                ImageTypes = dto.ImageTypes
            };
            await _branchImageService.AddImagesAsync(branch.BranchId, addImagesDto);
        }

        await _context.SaveChangesAsync();

        await _context.Entry(branch).Collection(b => b.BranchImages).LoadAsync();
        await _context.Entry(branch).Collection(b => b.Employees).LoadAsync();


        foreach (var employee in branch.Employees)
        {
            await _context.Entry(employee).Reference(e => e.Account).LoadAsync();
            await _context.Entry(employee).Reference(e => e.Role).LoadAsync();
        }

        return MapToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(int branchId, UpdateBranchDto dto)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .Include(b => b.Employees).ThenInclude(e => e.Role)
            .FirstOrDefaultAsync(b => b.BranchId == branchId
                                   && b.Status != BranchSatusEnum.Inactive.ToString());

        if (branch == null)
        {
            return null;
        }


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
            .FirstOrDefaultAsync(b => b.BranchId == branchId
                                   && b.Status != BranchSatusEnum.Inactive.ToString());

        if (branch == null)
        {
            return false;
        }

        // Không xóa thật khỏi database, chỉ đổi trạng thái thành Inactive
        branch.Status = BranchSatusEnum.Inactive.ToString();
        await _context.SaveChangesAsync();

        return true;
    }

    
    public async Task<BranchDto?> RestoreAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.BranchImages)
            .Include(b => b.Employees).ThenInclude(e => e.Account)
            .Include(b => b.Employees).ThenInclude(e => e.Role)
            .FirstOrDefaultAsync(b => b.BranchId == branchId
                                   && b.Status == BranchSatusEnum.Inactive.ToString());

        if (branch == null)
        {
            return null;
        }

        branch.Status = "Active";
        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    private async Task AssignManagersAsync(Branch branch, List<long> employeeIds)
    {
        var employees = await _context.Employees
            .Where(e => employeeIds.Contains(e.EmployeeId))
            .ToListAsync();

        foreach (var employee in employees)
        {
            // Chỉ thêm nếu chưa có trong danh sách, tránh thêm trùng
            bool daCoTrongDanhSach = false;
            foreach (var existing in branch.Employees)
            {
                if (existing.EmployeeId == employee.EmployeeId)
                {
                    daCoTrongDanhSach = true;
                    break;
                }
            }

            if (!daCoTrongDanhSach)
            {
                branch.Employees.Add(employee);
            }
        }
    }

 
    private async Task SyncManagersAsync(Branch branch, List<long> employeeIds)
    {
     
        var currentManagers = branch.Employees.ToList(); // copy ra list riêng để xóa an toàn khi đang duyệt
        foreach (var employee in currentManagers)
        {
            if (!employeeIds.Contains(employee.EmployeeId))
            {
                branch.Employees.Remove(employee);
            }
        }

        
        var idsHienTai = new HashSet<long>();
        foreach (var employee in branch.Employees)
        {
            idsHienTai.Add(employee.EmployeeId);
        }

        var idsCanThemMoi = new List<long>();
        foreach (var id in employeeIds.Distinct())
        {
            if (!idsHienTai.Contains(id))
            {
                idsCanThemMoi.Add(id);
            }
        }

        if (idsCanThemMoi.Count > 0)
        {
            var newEmployees = await _context.Employees
                .Where(e => idsCanThemMoi.Contains(e.EmployeeId))
                .ToListAsync();

            foreach (var employee in newEmployees)
            {
                branch.Employees.Add(employee);
            }
        }
    }


    internal static BranchDto MapToDto(Branch b)
    {

        var managers = new List<BranchManagerDto>();
        foreach (var employee in b.Employees)
        {
            bool laQuanLy = employee.Role != null && employee.Role.RoleId == ManagerRoleId;
            if (laQuanLy)
            {
                managers.Add(new BranchManagerDto
                {
                    EmployeeId = employee.EmployeeId,
                    FullName = employee.FullName,
                    Phone = employee.Account?.Phone,
                });
            }
        }

        var images = b.BranchImages
            .OrderBy(i => i.ImageType)
            .ThenBy(i => i.SortOrder)
            .Select(BranchImageService.MapImageToDto)
            .ToList();

        return new BranchDto
        {
            BranchId = b.BranchId,
            BranchName = b.BranchName,
            Address = b.Address,
            Phone = b.Phone,
            Status = b.Status,
            CreatedAt = b.CreatedAt,
            Managers = managers,
            Images = images
        };
    }

    public async Task<List<ManagerLookupDto>> GetAvailableManagersAsync()
    {
        var query = _context.Employees
            .Include(e => e.Role)
            .Where(e => e.Role.RoleId == ManagerRoleId && e.Status == "Active")
            .Select(e => new ManagerLookupDto
            {
                EmployeeId = e.EmployeeId,
                FullName = e.FullName,
                TotalBranches = e.Branches.Count
            });

        var result = await query
            .Where(x => x.TotalBranches < 3)
            .OrderBy(x => x.TotalBranches)
            .ThenBy(x => x.FullName)
            .ToListAsync();

        return result;
    }
}