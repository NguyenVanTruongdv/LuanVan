using BE.Data;
using BE.Dtos.Member;
using BE.DTOs.Employee;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class EmployeeService
    {
        private readonly GymManagementContext _context;
        private readonly FaceIdService _faceIdService;
        private readonly AccountService _accountService;

        private const string RoleAdmin = "Admin";
        private const string RoleManager = "Manager";

        private const string EmployeeStatusActive = "Active";
        private const string EmployeeStatusInactive = "Inactive";

        public EmployeeService(
            GymManagementContext context,
            FaceIdService faceIdService,
            AccountService accountService)
        {
            _context = context;
            _faceIdService = faceIdService;
            _accountService = accountService;
        }

        // ------------------------------------------------------------------
        // Đọc dữ liệu
        // ------------------------------------------------------------------

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
                    e.Gender,
                    e.Status,
                    Role = e.Role.RoleName,
                    HasFaceId = e.FaceDatumEmployee != null,
                    Account = e.Account == null ? null : new
                    {
                        e.Account.AccountId,
                        e.Account.Phone,
                        e.Account.Email,
                        e.Account.Status,
                        e.Account.SuspendReason
                    },
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
                Gender = employee.Gender,
                Status = employee.Status,
                Role = employee.Role,
                HasFaceId = employee.HasFaceId,
                AccountId = employee.Account?.AccountId,
                LoginPhone = employee.Account?.Phone,
                LoginEmail = employee.Account?.Email,
                AccountStatus = employee.Account?.Status,
                SuspendReason = employee.Account?.SuspendReason,
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
                    Gender = e.Gender,
                    Status = e.Status,
                    Role = e.Role.RoleName,
                    LoginPhone = e.Account != null ? e.Account.Phone : null,
                    LoginEmail = e.Account != null ? e.Account.Email : null,
                    AccountStatus = e.Account != null ? e.Account.Status : null,
                    SuspendReason = e.Account != null ? e.Account.SuspendReason : null,
                    Branches = e.EmployeeBranches
                        .OrderBy(b => b.Branch.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.Branch.BranchId, BranchName = b.Branch.BranchName })
                        .ToList()
                })
                .ToListAsync();
        }

        // ------------------------------------------------------------------
        // 1. Tạo tài khoản đăng nhập + thông tin nhân viên + FaceID
        // ------------------------------------------------------------------

        public async Task<EmployeeProfileDto> CreateWithAccountAsync(CreateEmployeeWithAccountDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);
            var targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);
            EnsureBranchScope(current, dto.BranchIds);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var employee = await CreateEmployeeInfoInternalAsync(dto, createdBy);

            await _accountService.CreateAccountAsync(
                memberId: null,
                employeeId: employee.EmployeeId,
                phone: dto.LoginPhone,
                email: dto.LoginEmail,
                password: dto.Password);

            if (dto.ProfileImage != null)
            {
                await _faceIdService.RegisterFirstFaceAsync(
                    memberId: null,
                    employeeId: employee.EmployeeId,
                    profileImage: dto.ProfileImage,
                    reason: dto.FaceIdReason ?? "Đăng ký FaceID khi tạo tài khoản nhân viên",
                    performedBy: createdBy);

                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();

            return (await GetProfileAsync(employee.EmployeeId))!;
        }

        // ------------------------------------------------------------------
        // 2. Tạo thông tin nhân viên + FaceID (chưa có tài khoản đăng nhập)
        // ------------------------------------------------------------------

        public async Task<EmployeeProfileDto> CreateWithFaceIdAsync(CreateEmployeeWithFaceIdDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);
            var targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);
            EnsureBranchScope(current, dto.BranchIds);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var employee = await CreateEmployeeInfoInternalAsync(dto, createdBy);

            await _faceIdService.RegisterFirstFaceAsync(
                memberId: null,
                employeeId: employee.EmployeeId,
                profileImage: dto.ProfileImage,
                reason: dto.FaceIdReason ?? "Đăng ký FaceID khi tạo hồ sơ nhân viên",
                performedBy: createdBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (await GetProfileAsync(employee.EmployeeId))!;
        }

        // ------------------------------------------------------------------
        // 3. Chỉ tạo thông tin nhân viên (không tài khoản, không FaceID)
        // ------------------------------------------------------------------

        public async Task<EmployeeProfileDto> CreateInfoOnlyAsync(CreateEmployeeInfoDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);
            var targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);
            EnsureBranchScope(current, dto.BranchIds);

            var employee = await CreateEmployeeInfoInternalAsync(dto, createdBy);
            await _context.SaveChangesAsync();

            return (await GetProfileAsync(employee.EmployeeId))!;
        }

        // ------------------------------------------------------------------
        // Sửa thông tin nhân viên (không đụng Account/FaceID)
        // ------------------------------------------------------------------

        public async Task<bool> UpdateAsync(long employeeId, UpdateEmployeeDto dto, long currentEmployeeId)
        {
            var current = await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees
                .Include(e => e.EmployeeBranches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
                return false;

            if (dto.RoleId != employee.RoleId)
            {
                var targetRoleName = await GetRoleNameAsync(dto.RoleId);
                EnsureCanAssignRole(current.RoleName, targetRoleName);
            }

            EnsureBranchScope(current, dto.BranchIds);

            var phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");

            employee.FullName = dto.FullName;
            employee.Phone = dto.Phone;
            employee.Gender = dto.Gender;
            employee.RoleId = dto.RoleId;
            employee.UpdatedAt = DateTime.UtcNow;

            employee.EmployeeBranches.Clear();
            foreach (var branchId in dto.BranchIds.Distinct())
                employee.EmployeeBranches.Add(new EmployeeBranch { EmployeeId = employeeId, BranchId = branchId });

            await _context.SaveChangesAsync();
            return true;
        }

        // ------------------------------------------------------------------
        // FaceID
        // ------------------------------------------------------------------

        /// <summary>Đăng ký/cập nhật FaceID cho nhân viên (dùng cả khi chưa có và khi đã có FaceDatum).</summary>
        public async Task<FaceDatum> UpdateFaceAsync(long employeeId, UpdateEmployeeFaceIdDto dto, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            return await _faceIdService.UpdateFaceAsync(
                memberId: null,
                employeeId: employeeId,
                profileImage: dto.ProfileImage,
                reason: dto.Reason,
                performedBy: currentEmployeeId);
        }

        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);
            return await _faceIdService.GetFaceHistoryAsync(memberId: null, employeeId: employeeId);
        }

        // ------------------------------------------------------------------
        // KHÓA / MỞ KHÓA — 2 CẤP ĐỘ RIÊNG BIỆT
        // ------------------------------------------------------------------

        /// <summary>
        /// Khóa nhân viên TOÀN DIỆN: khóa Employee.Status (Inactive) + khóa luôn Account nếu có
        /// (không đăng nhập được hệ thống). Dùng khi nhân viên nghỉ việc/vi phạm nặng.
        /// FaceID KHÔNG bị xóa — nếu hệ thống checkin có kiểm tra Employee.Status thì tự động
        /// chặn ra/vào; nếu bạn muốn vẫn cho ra/vào phòng tập dù đã nghỉ việc thì dùng
        /// LockAccountOnlyAsync thay vì hàm này.
        /// </summary>
        public async Task LockEmployeeAsync(long employeeId, string reason, long currentEmployeeId)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Phải cung cấp lý do khi khóa nhân viên.", nameof(reason));

            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId)
                ?? throw new KeyNotFoundException($"Không tìm thấy nhân viên có Id = {employeeId}.");

            if (employee.Status == EmployeeStatusInactive)
                throw new InvalidOperationException("Nhân viên đã bị khóa từ trước.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            SetEmployeeStatus(employee, EmployeeStatusInactive, currentEmployeeId);
            await _context.SaveChangesAsync();

            // Nếu đã có tài khoản đăng nhập thì khóa luôn (nếu chưa bị khóa sẵn)
            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account != null && account.Status != "Suspended")
                await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);

            await transaction.CommitAsync();
        }

        /// <summary>
        /// Mở khóa nhân viên TOÀN DIỆN: mở Employee.Status (Active) + mở luôn Account nếu có.
        /// </summary>
        public async Task UnlockEmployeeAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmployeeId == employeeId)
                ?? throw new KeyNotFoundException($"Không tìm thấy nhân viên có Id = {employeeId}.");

            if (employee.Status == EmployeeStatusActive)
                throw new InvalidOperationException("Nhân viên đang hoạt động, không cần mở khóa.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            SetEmployeeStatus(employee, EmployeeStatusActive, currentEmployeeId);
            await _context.SaveChangesAsync();

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account != null && account.Status != "Active")
                await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);

            await transaction.CommitAsync();
        }

        /// <summary>
        /// Khóa CHỈ tài khoản đăng nhập hệ thống (Account.Status), KHÔNG đụng Employee.Status.
        /// Dùng cho trường hợp: cấm truy cập phần mềm quản lý nhưng vẫn cho phép
        /// nhân viên quẹt mặt (FaceID) ra/vào phòng tập bình thường (VD: đang bị đình chỉ
        /// công tác hành chính nhưng vẫn được vào cơ sở làm việc khác không qua hệ thống).
        /// </summary>
        public async Task LockAccountOnlyAsync(long employeeId, string reason, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId)
                ?? throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để khóa.");

            await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);
        }

        /// <summary>
        /// Mở khóa CHỈ tài khoản đăng nhập hệ thống, KHÔNG đụng Employee.Status.
        /// </summary>
        public async Task UnlockAccountOnlyAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId)
                ?? throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để mở khóa.");

            await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);
        }

        // ------------------------------------------------------------------
        // Helper dùng chung cho 3 hàm tạo — chỉ tạo bản ghi Employee, tự SaveChanges (cần EmployeeId cho FK)
        // ------------------------------------------------------------------

        private async Task<Employee> CreateEmployeeInfoInternalAsync(CreateEmployeeInfoDto dto, long createdBy)
        {
            var phoneExists = await _context.Employees.AnyAsync(e => e.Phone == dto.Phone);
            if (phoneExists)
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");

            var employee = new Employee
            {
                FullName = dto.FullName,
                Phone = dto.Phone,
                Gender = dto.Gender,
                RoleId = dto.RoleId,
                Status = EmployeeStatusActive,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EmployeeBranches = dto.BranchIds.Distinct()
                    .Select(branchId => new EmployeeBranch { BranchId = branchId })
                    .ToList()
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return employee;
        }

        /// <summary>Đổi Employee.Status + ghi log, không SaveChanges (caller tự gọi).</summary>
        private void SetEmployeeStatus(Employee employee, string newStatus, long performedBy)
        {
            var oldStatus = employee.Status;
            employee.Status = newStatus;
            employee.UpdatedAt = DateTime.UtcNow;

            _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog
            {
                UpdateSessionId = Guid.NewGuid(),
                EmployeeId = employee.EmployeeId,
                FieldName = "Status",
                OldValue = oldStatus,
                NewValue = newStatus,
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = DateTime.UtcNow
            });
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

        private static void EnsureCanAssignRole(string currentRoleName, string targetRoleName)
        {
            if (currentRoleName == RoleAdmin)
                return;

            if (currentRoleName == RoleManager)
            {
                if (targetRoleName == RoleAdmin || targetRoleName == RoleManager)
                    throw new UnauthorizedAccessException("Quản lý chỉ được tạo hoặc cập nhật tài khoản nhân viên.");
                return;
            }

            throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
        }

        private static void EnsureBranchScope((string RoleName, List<int> BranchIds) current, List<int> branchIds)
        {
            if (current.RoleName != RoleManager)
                return;

            if (branchIds.Count == 0 || branchIds.Except(current.BranchIds).Any())
                throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
        }

        // Kiểm tra current có được thao tác (sửa/khóa/mở khóa/faceid) trên targetEmployeeId không:
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
    }
}