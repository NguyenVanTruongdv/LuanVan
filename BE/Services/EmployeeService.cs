using BE.Data;
using BE.DTOs.Employee;
using BE.Models;

using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class EmployeeService
    {
        private readonly GymManagementContext _context;

        // Tên vai trò chuẩn dùng để so sánh phân quyền
        private const string RoleAdmin = "Admin";
        private const string RoleManager = "Manager";

        public EmployeeService(GymManagementContext context)
        {
            _context = context;
        }

        public async Task<EmployeeProfileDto?> GetProfileAsync(long employeeId)
        {
            var employee = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new
                {
                    e.EmployeeId,
                    e.FullName,
                    e.Phone,
                    e.Email,
                    e.Gender,
                    e.Status,
                    e.SuspendReason,
                    Role = e.Role.RoleName,
                    Branches = e.EmployeeBranches
                        .OrderBy(b => b.Branch.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.Branch.BranchId, BranchName = b.Branch.BranchName })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (employee == null)
                return null;

            return new EmployeeProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Email = employee.Email,
                Gender = employee.Gender,
                Status = employee.Status,
                SuspendReason = employee.SuspendReason,
                Role = employee.Role,
                Branches = employee.Branches,
                DefaultBranchId = employee.Branches.Count > 0 ? employee.Branches[0].BranchId : null
            };
        }

        // Lấy danh sách nhân viên, phân quyền theo role: Manager chỉ thấy nhân viên
        // thuộc chi nhánh mình phụ trách, Admin thấy hết. Không phân trang.
        public async Task<List<EmployeeListItemDto>> GetListAsync(EmployeeFilterDto filter, long currentEmployeeId)
        {
            var current = await GetCurrentAsync(currentEmployeeId);

            var query = _context.Employees.AsNoTracking().AsQueryable();

            if (current.RoleName == RoleManager)
            {
                if (current.BranchIds.Count == 0)
                    return new List<EmployeeListItemDto>();

                query = query.Where(e => e.EmployeeBranches.Any(b => current.BranchIds.Contains(b.BranchId)));
            }

            if (filter.BranchId.HasValue)
                query = query.Where(e => e.EmployeeBranches.Any(b => b.BranchId == filter.BranchId.Value));

            if (!string.IsNullOrWhiteSpace(filter.Name))
                query = query.Where(e => EF.Functions.Like(e.FullName, $"%{filter.Name.Trim()}%"));

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(e => e.Status == filter.Status);

            return await query
                .OrderBy(e => e.FullName)
                .Select(e => new EmployeeListItemDto
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
                        .OrderBy(b => b.Branch.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.Branch.BranchId, BranchName = b.Branch.BranchName })
                        .ToList()
                })
                .ToListAsync();
        }

        public async Task<EmployeeProfileDto> CreateAsync(CreateEmployeeDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);

            var targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);

            // Manager chỉ được tạo nhân viên cho (các) chi nhánh mình đang phụ trách
            if (current.RoleName == RoleManager)
            {
                if (dto.BranchIds.Count == 0 || dto.BranchIds.Except(current.BranchIds).Any())
                    throw new UnauthorizedAccessException("Bạn chỉ được tạo nhân viên cho chi nhánh mình phụ trách.");
            }

            var phoneExists = await _context.Employees.AnyAsync(e => e.Phone == dto.Phone);
            if (phoneExists)
                throw new InvalidOperationException("Số điện thoại đã được sử dụng.");

            var employee = new Employee
            {
                FullName = dto.FullName,
                Phone = dto.Phone,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Gender = dto.Gender,
                RoleId = dto.RoleId,
                Status = "Active",
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EmployeeBranches = dto.BranchIds.Distinct()
                    .Select(branchId => new EmployeeBranch { BranchId = branchId })
                    .ToList()
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return (await GetProfileAsync(employee.EmployeeId))!;
        }

        public async Task<bool> UpdateAsync(long employeeId, UpdateEmployeeDto dto, long currentEmployeeId)
        {
            var current = await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees
                .Include(e => e.EmployeeBranches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
                return false;

            // Chỉ kiểm tra quyền gán vai trò khi thực sự có thay đổi vai trò.
            // (Cho phép Admin sửa hồ sơ của Admin khác miễn là không đổi vai trò của họ.)
            if (dto.RoleId != employee.RoleId)
            {
                var targetRoleName = await GetRoleNameAsync(dto.RoleId);
                EnsureCanAssignRole(current.RoleName, targetRoleName);
            }

            // Manager chỉ được gán chi nhánh mình đang phụ trách
            if (current.RoleName == RoleManager)
            {
                if (dto.BranchIds.Count == 0 || dto.BranchIds.Except(current.BranchIds).Any())
                    throw new UnauthorizedAccessException("Bạn chỉ được gán chi nhánh mình phụ trách.");
            }

            employee.FullName = dto.FullName;
            employee.Phone = dto.Phone;
            employee.Email = dto.Email;
            employee.Gender = dto.Gender;
            employee.RoleId = dto.RoleId;
            employee.UpdatedAt = DateTime.UtcNow;

            // Chỉ đổi mật khẩu khi có giá trị mới được nhập
            if (!string.IsNullOrWhiteSpace(dto.Password))
                employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            employee.EmployeeBranches.Clear();
            foreach (var branchId in dto.BranchIds.Distinct())
                employee.EmployeeBranches.Add(new EmployeeBranch { EmployeeId = employeeId, BranchId = branchId });

            await _context.SaveChangesAsync();
            return true;
        }

        // Khóa tài khoản nhân viên — bắt buộc có lý do
        public async Task<bool> LockAsync(long employeeId, string reason, long currentEmployeeId)
        {
            return await ChangeStatusInternalAsync(employeeId, "Suspended", reason, currentEmployeeId);
        }

        // Mở khóa tài khoản nhân viên — lý do không bắt buộc
        public async Task<bool> UnlockAsync(long employeeId, long currentEmployeeId)
        {
            return await ChangeStatusInternalAsync(employeeId, "Active", null, currentEmployeeId);
        }

        // ------------------------------------------------------------------
        // Helpers phân quyền
        // ------------------------------------------------------------------

        private async Task<(string RoleName, List<int> BranchIds)> GetCurrentAsync(long employeeId)
        {
            var current = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new { e.Role.RoleName, BranchIds = e.EmployeeBranches.Select(b => b.BranchId).ToList() })
                .FirstOrDefaultAsync();

            if (current == null)
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");

            return (current.RoleName, current.BranchIds);
        }

        private async Task<string> GetRoleNameAsync(sbyte roleId)
        {
            var roleName = await _context.Roles
                .AsNoTracking()
                .Where(r => r.RoleId == roleId)
                .Select(r => r.RoleName)
                .FirstOrDefaultAsync();

            if (roleName == null)
                throw new InvalidOperationException("Vai trò không hợp lệ.");

            return roleName;
        }

        // Quy tắc: Admin được tạo/gán full mọi vai trò (kể cả Admin khác).
        // Manager chỉ được tạo/gán vai trò nhân viên thường (Staff) — không được
        // tạo hoặc nâng cấp lên Admin/Manager.
        private static void EnsureCanAssignRole(string currentRoleName, string targetRoleName)
        {
            if (currentRoleName == RoleAdmin)
            {
                // Admin toàn quyền, không giới hạn vai trò được gán
                return;
            }

            if (currentRoleName == RoleManager)
            {
                if (targetRoleName == RoleAdmin || targetRoleName == RoleManager)
                    throw new UnauthorizedAccessException("Quản lý chỉ được tạo hoặc cập nhật tài khoản nhân viên.");
                return;
            }

            throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
        }

        // Kiểm tra current có được thao tác (sửa/khóa/mở khóa) trên targetEmployeeId không:
        // - Admin: luôn được phép.
        // - Manager: chỉ được phép nếu target không phải Admin/Manager VÀ cùng chi nhánh phụ trách.
        private async Task<(string RoleName, List<int> BranchIds)> EnsureCanManageTargetAsync(long currentEmployeeId, long targetEmployeeId)
        {
            var current = await GetCurrentAsync(currentEmployeeId);

            if (current.RoleName == RoleAdmin)
                return current;

            if (current.RoleName != RoleManager)
                throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");

            var target = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == targetEmployeeId)
                .Select(e => new { e.Role.RoleName, BranchIds = e.EmployeeBranches.Select(b => b.BranchId).ToList() })
                .FirstOrDefaultAsync();

            if (target == null)
                throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");

            if (target.RoleName == RoleAdmin || target.RoleName == RoleManager)
                throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");

            var allowed = target.BranchIds.Any(id => current.BranchIds.Contains(id));
            if (!allowed)
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");

            return current;
        }

        // Đổi trạng thái tài khoản dùng chung cho Lock/Unlock
        private async Task<bool> ChangeStatusInternalAsync(long employeeId, string status, string? reason, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
            if (employee == null)
                return false;

            employee.Status = status;
            employee.SuspendReason = status == "Suspended" ? reason : null;
            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}