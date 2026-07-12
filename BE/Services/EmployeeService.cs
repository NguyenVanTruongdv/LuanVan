using BE.Data;
using BE.DTOs.Employee;

using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class EmployeeService
    {
        private readonly GymManagementContext _context;

        public EmployeeService(GymManagementContext context)
        {
            _context = context;
        }


        public async Task<EmployeeProfileDto?> GetProfileAsync(long employeeId)
        {
            return await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new EmployeeProfileDto
                {
                    EmployeeId = e.EmployeeId,
                    FullName = e.FullName,
                    Phone = e.Phone,
                    Email = e.Email,
                    Gender = e.Gender,
                    Status = e.Status,
                    SuspendReason = e.SuspendReason,
                    Role = e.Role.RoleName,

                    Branches = e.EmployeeBranches
                        .OrderBy(b => b.Branch.BranchId) // đảm bảo thứ tự ổn định, phần tử [0] luôn là branch đầu tiên
                        .Select(b => new EmployeeBranchDto
                        {
                            BranchId = b.Branch.BranchId,
                            BranchName = b.Branch.BranchName
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();
        }
    }
}