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
        private const string RoleStaff = "Staff";

        private const string EmployeeStatusActive = "Active";
        private const string EmployeeStatusInactive = "Inactive";

        private const string AccountStatusActive = "Active";
        private const string AccountStatusSuspended = "Suspended";

        public EmployeeService(
            GymManagementContext context,
            FaceIdService faceIdService,
            AccountService accountService)
        {
            _context = context;
            _faceIdService = faceIdService;
            _accountService = accountService;
        }

        // Thông tin gọn của người đang thao tác (thay cho tuple cho dễ đọc)
        private class CurrentEmployeeInfo
        {
            public string RoleName { get; set; } = null!;
            public List<int> BranchIds { get; set; } = new();
        }

     
        public async Task<EmployeeProfileDto?> GetProfileAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanViewTargetAsync(currentEmployeeId, employeeId);
            return await GetProfileInternalAsync(employeeId);
        }

        private async Task<EmployeeProfileDto?> GetProfileInternalAsync(long employeeId)
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
                    FaceProfileImage = e.FaceDatumEmployee != null ? e.FaceDatumEmployee.ProfileImage : null,
                    Account = e.Account == null ? null : new
                    {
                        e.Account.AccountId,
                        e.Account.Phone,
                        e.Account.Email,
                        e.Account.Status,
                        e.Account.SuspendReason
                    },
                
                    Branches = e.Branches
                        .OrderBy(b => b.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (employee == null)
            {
                return null;
            }

            // Chi nhánh mặc định = chi nhánh đầu tiên trong danh sách (nếu có)
            int? defaultBranchId = null;
            if (employee.Branches.Count > 0)
            {
                defaultBranchId = employee.Branches[0].BranchId;
            }

            return new EmployeeProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Gender = employee.Gender,
                Status = employee.Status,
                Role = employee.Role,
                HasFaceId = employee.HasFaceId,
                FaceProfileImage = employee.FaceProfileImage,
                AccountId = employee.Account?.AccountId,
                LoginPhone = employee.Account?.Phone,
                LoginEmail = employee.Account?.Email,
                AccountStatus = employee.Account?.Status,
                SuspendReason = employee.Account?.SuspendReason,
                Branches = employee.Branches,
                DefaultBranchId = defaultBranchId
            };
        }

   
        /// Lấy danh sách nhân viên. Chỉ Admin/Manager được xem.
        /// Manager chỉ thấy nhân viên cùng chi nhánh phụ trách và không thấy Admin.
 
        public async Task<List<EmployeeListItemDto>> GetListAsync(EmployeeFilterDto filter, long currentEmployeeId)
        {
            var current = await GetCurrentAsync(currentEmployeeId);

            bool laAdmin = current.RoleName == RoleAdmin;
            bool laManager = current.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem danh sách nhân viên.");
            }

            var query = _context.Employees.AsNoTracking().AsQueryable();

            // Manager chỉ được xem nhân viên cùng chi nhánh phụ trách, và không được thấy Admin
            if (laManager)
            {
                if (current.BranchIds.Count == 0)
                {
                    return new List<EmployeeListItemDto>();
                }

                query = query
                    .Where(e => e.Branches.Any(b => current.BranchIds.Contains(b.BranchId)))
                    .Where(e => e.Role.RoleName != RoleAdmin);
            }

            // Áp dụng thêm các bộ lọc theo yêu cầu của FE (nếu có)
            if (filter.BranchId.HasValue)
            {
                query = query.Where(e => e.Branches.Any(b => b.BranchId == filter.BranchId.Value));
            }

            if (!string.IsNullOrWhiteSpace(filter.Name))
            {
                string tenKeyword = filter.Name.Trim();
                query = query.Where(e => EF.Functions.Like(e.FullName, $"%{tenKeyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(filter.Phone))
            {
                string phoneKeyword = filter.Phone.Trim();
                query = query.Where(e =>
                    EF.Functions.Like(e.Phone, $"%{phoneKeyword}%") ||
                    (e.Account != null && e.Account.Phone != null && EF.Functions.Like(e.Account.Phone, $"%{phoneKeyword}%")));
            }

            if (!string.IsNullOrWhiteSpace(filter.Email))
            {
                string emailKeyword = filter.Email.Trim();
                query = query.Where(e => e.Account != null && e.Account.Email != null && EF.Functions.Like(e.Account.Email, $"%{emailKeyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(e => e.Status == filter.Status);
            }

            var result = await query
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
                    HasFaceId = e.FaceDatumEmployee != null,
                    FaceProfileImage = e.FaceDatumEmployee != null ? e.FaceDatumEmployee.ProfileImage : null,
                    Branches = e.Branches
                        .OrderBy(b => b.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName })
                        .ToList()
                })
                .ToListAsync();

            return result;
        }

        //tạo thông tin nhân viên kèm vói tài khoản đang nhập. face id k bát buộc. đang ký nếu có hoạc k. 
        public async Task<EmployeeProfileDto> CreateWithAccountAsync(CreateEmployeeWithAccountDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);

            // Manager tạo nhân viên thì luôn là Staff, không cho tự chọn role. Admin thì tùy chọn.
            if (current.RoleName == RoleManager)
            {
                dto.RoleId = await GetStaffRoleIdAsync();
            }

            string targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);
            EnsureBranchScope(current, dto.BranchIds);
            EnsureBranchCountForRole(targetRoleName, dto.BranchIds);

       
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Cùng 1 UpdateSessionId cho toàn bộ log phát sinh trong lần tạo này
                    var sessionId = Guid.NewGuid();

                    var employee = await CreateEmployeeInfoInternalAsync(dto, createdBy, sessionId, targetRoleName);

                    await _accountService.CreateAccountAsync(
                        memberId: null,
                        employeeId: employee.EmployeeId,
                        phone: null,
                        email: dto.LoginEmail,
                        password: dto.Password);
                    LogFieldChange(employee.EmployeeId, sessionId, "Email đăng nhập", null, dto.LoginEmail, createdBy);

                    // FaceID không bắt buộc — chỉ đăng ký nếu có ảnh được gửi lên.
                    if (dto.ProfileImage != null)
                    {
                        string faceReason = dto.FaceIdReason ?? "Đăng ký FaceID khi tạo tài khoản nhân viên";

                        await _faceIdService.RegisterFirstFaceAsync(
                            memberId: null,
                            employeeId: employee.EmployeeId,
                            profileImage: dto.ProfileImage,
                            reason: faceReason,
                            performedBy: createdBy);
                        LogFieldChange(employee.EmployeeId, sessionId, "FaceID", null, "Đã đăng ký", createdBy);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await GetProfileInternalAsync(employee.EmployeeId);
                    return profile!;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ------------------------------------------------------------------
        // 2. Tạo thông tin nhân viên (+ FaceID nếu có ảnh — KHÔNG bắt buộc), chưa có tài khoản đăng nhập
        // ------------------------------------------------------------------

        public async Task<EmployeeProfileDto> CreateWithFaceIdAsync(CreateEmployeeWithFaceIdDto dto, long createdBy)
        {
            var current = await GetCurrentAsync(createdBy);

            if (current.RoleName == RoleManager)
            {
                dto.RoleId = await GetStaffRoleIdAsync();
            }

            string targetRoleName = await GetRoleNameAsync(dto.RoleId);
            EnsureCanAssignRole(current.RoleName, targetRoleName);
            EnsureBranchScope(current, dto.BranchIds);
            EnsureBranchCountForRole(targetRoleName, dto.BranchIds);

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sessionId = Guid.NewGuid();

                    var employee = await CreateEmployeeInfoInternalAsync(dto, createdBy, sessionId, targetRoleName);

                    // FaceID không bắt buộc — chỉ đăng ký nếu có ảnh được gửi lên.
                    if (dto.ProfileImage != null)
                    {
                        string faceReason = dto.FaceIdReason ?? "Đăng ký FaceID khi tạo hồ sơ nhân viên";

                        await _faceIdService.RegisterFirstFaceAsync(
                            memberId: null,
                            employeeId: employee.EmployeeId,
                            profileImage: dto.ProfileImage,
                            reason: faceReason,
                            performedBy: createdBy);
                        LogFieldChange(employee.EmployeeId, sessionId, "FaceID", null, "Đã đăng ký", createdBy);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await GetProfileInternalAsync(employee.EmployeeId);
                    return profile!;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ------------------------------------------------------------------
        // Sửa thông tin nhân viên (không đụng Account/FaceID)
        // ------------------------------------------------------------------

        public async Task<bool> UpdateAsync(long employeeId, UpdateEmployeeDto dto, long currentEmployeeId)
        {
            var current = await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees
                .Include(e => e.Branches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
            {
                return false;
            }

            bool roleChanged = dto.RoleId != employee.RoleId;

            // Manager không có quyền điều chỉnh vai trò của nhân viên dưới mọi hình thức.
            if (roleChanged && current.RoleName == RoleManager)
            {
                throw new UnauthorizedAccessException("Quản lý không có quyền thay đổi vai trò của nhân viên.");
            }

            // Luôn cần tên vai trò đích (dùng để kiểm tra quyền gán + luật số chi nhánh theo vai trò)
            string newRoleName = await GetRoleNameAsync(dto.RoleId);

            if (roleChanged)
            {
                EnsureCanAssignRole(current.RoleName, newRoleName);
            }

            EnsureBranchScope(current, dto.BranchIds);
            EnsureBranchCountForRole(newRoleName, dto.BranchIds);

            bool phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var oldBranchIds = employee.Branches.Select(b => b.BranchId).ToList();
            var newBranchIds = dto.BranchIds.Distinct().ToList();

            // Lấy đúng các Branch (đã tracked) - dùng luôn để ghi log tên chi nhánh và để gán lại bên dưới
            var newBranches = await _context.Branches
                .Where(b => newBranchIds.Contains(b.BranchId))
                .ToListAsync();

            // Ghi log trước khi gán giá trị mới, để còn giữ được giá trị cũ.
            var sessionId = Guid.NewGuid();

            LogFieldChange(employeeId, sessionId, "Họ tên", employee.FullName, dto.FullName, currentEmployeeId);
            LogFieldChange(employeeId, sessionId, "Số điện thoại", employee.Phone, dto.Phone, currentEmployeeId);
            LogFieldChange(employeeId, sessionId, "Giới tính", employee.Gender, dto.Gender, currentEmployeeId);

            if (roleChanged)
            {
                string oldRoleName = await GetRoleNameAsync(employee.RoleId);
                LogFieldChange(employeeId, sessionId, "Vai trò", oldRoleName, newRoleName, currentEmployeeId);
            }

            if (!SameBranchSet(oldBranchIds, newBranchIds))
            {
                string oldBranchNames = FormatBranchNames(employee.Branches);
                string newBranchNames = FormatBranchNames(newBranches);
                LogFieldChange(employeeId, sessionId, "Chi nhánh", oldBranchNames, newBranchNames, currentEmployeeId);
            }

            employee.FullName = dto.FullName;
            employee.Phone = dto.Phone;
            employee.Gender = dto.Gender;
            employee.RoleId = dto.RoleId;
            employee.UpdatedAt = DateTime.UtcNow;

            employee.Branches.Clear();
            foreach (var branch in newBranches)
            {
                employee.Branches.Add(branch);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // ------------------------------------------------------------------
        // Tài khoản đăng nhập (thêm mới cho nhân viên chưa có / sửa tài khoản đã có)
        // ------------------------------------------------------------------

        /// <summary>Thêm tài khoản đăng nhập cho nhân viên chưa có tài khoản.</summary>
        public async Task<EmployeeProfileDto> AddAccountAsync(long employeeId, AddEmployeeAccountDto dto, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var existingAccount = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (existingAccount != null)
            {
                throw new InvalidOperationException("Nhân viên đã có tài khoản đăng nhập.");
            }

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sessionId = Guid.NewGuid();

                    await _accountService.CreateAccountAsync(
                        memberId: null,
                        employeeId: employeeId,
                        phone: null,
                        email: dto.LoginEmail,
                        password: dto.Password);
                    LogFieldChange(employeeId, sessionId, "Email đăng nhập", null, dto.LoginEmail, currentEmployeeId);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await GetProfileInternalAsync(employeeId);
                    return profile!;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Sửa tài khoản đăng nhập đã có (email đăng nhập, mật khẩu...).
        /// Đổi mật khẩu không cần mật khẩu cũ vì đây là admin/manager thao tác thay nhân viên,
        /// và ResetPasswordAsync sẽ tự thu hồi hết refresh token để đăng xuất khỏi mọi thiết bị.
        /// </summary>
        public async Task UpdateAccountAsync(long employeeId, UpdateEmployeeAccountDto dto, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập.");
            }

            var sessionId = Guid.NewGuid();

            LogFieldChange(employeeId, sessionId, "Email đăng nhập", account.Email, dto.LoginEmail, currentEmployeeId);

            await _accountService.UpdateAccountInfoAsync(
                accountId: account.AccountId,
                newPhone: null,
                newEmail: dto.LoginEmail);

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                await _accountService.ResetPasswordAsync(account.AccountId, dto.NewPassword);
                // Không bao giờ ghi mật khẩu vào log — chỉ đánh dấu sự kiện.
                LogFieldChange(employeeId, sessionId, "Mật khẩu", null, "Đã đặt lại mật khẩu", currentEmployeeId);
            }

            await _context.SaveChangesAsync();
        }

        // ------------------------------------------------------------------
        // FaceID
        // ------------------------------------------------------------------

        /// <summary>Đăng ký/cập nhật FaceID cho nhân viên.</summary>
        public async Task<FaceDatum> UpdateFaceAsync(long employeeId, UpdateEmployeeFaceIdDto dto, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var faceDatum = await _faceIdService.UpdateFaceAsync(
                memberId: null,
                employeeId: employeeId,
                profileImage: dto.ProfileImage,
                reason: dto.Reason,
                performedBy: currentEmployeeId);

            // FaceIdService tự có lịch sử riêng (FaceUpdateHistory); ở đây chỉ ghi thêm
            // 1 dòng đối chiếu chéo vào nhật ký chung của nhân viên cho dễ tra cứu.
            LogFieldChange(employeeId, Guid.NewGuid(), "FaceID", null, "Đã cập nhật", currentEmployeeId);
            await _context.SaveChangesAsync();

            return faceDatum;
        }

        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);
            return await _faceIdService.GetFaceHistoryAsync(memberId: null, employeeId: employeeId);
        }

        /// <summary>
        /// Lấy lịch sử cập nhật CHUNG của nhân viên (bảng employee_update_logs) — bao gồm sửa thông
        /// tin cá nhân, đổi vai trò/chi nhánh, tạo/sửa tài khoản đăng nhập, khóa/mở khóa, FaceID...
        /// Các dòng log cùng 1 lần Lưu được gộp lại theo UpdateSessionId thành 1 "sự kiện",
        /// sắp xếp mới nhất lên trước. Chỉ Admin/Manager (đúng phạm vi chi nhánh) được xem,
        /// dùng chung luật với GetProfileAsync.
        /// </summary>
        public async Task<List<EmployeeUpdateHistoryItemDto>> GetUpdateHistoryAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanViewTargetAsync(currentEmployeeId, employeeId);

            var logs = await _context.EmployeeUpdateLogs
                .AsNoTracking()
                .Where(l => l.EmployeeId == employeeId)
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            if (logs.Count == 0)
            {
                return new List<EmployeeUpdateHistoryItemDto>();
            }

            // Lấy tên người thực hiện theo lô (tránh N+1 query), không dùng subquery lồng trong Select
            // ở trên vì không phải lúc nào EF cũng dịch được sang SQL 1 cách an toàn.
            var performerIds = logs
                .Where(l => l.UpdatedByEmployeeId.HasValue)
                .Select(l => l.UpdatedByEmployeeId!.Value)
                .Distinct()
                .ToList();

            var performerNames = await _context.Employees
                .AsNoTracking()
                .Where(e => performerIds.Contains(e.EmployeeId))
                .Select(e => new { e.EmployeeId, e.FullName })
                .ToDictionaryAsync(e => e.EmployeeId, e => e.FullName);

            // Gom các dòng log có cùng UpdateSessionId lại thành 1 "sự kiện" trong lịch sử
            var groupedBySession = logs.GroupBy(l => l.UpdateSessionId);

            var history = new List<EmployeeUpdateHistoryItemDto>();

            foreach (var group in groupedBySession)
            {
                var first = group.First();

                string? performedByName = null;
                if (first.UpdatedByEmployeeId.HasValue)
                {
                    performerNames.TryGetValue(first.UpdatedByEmployeeId.Value, out performedByName);
                }

                var changes = group
                    .OrderBy(l => l.FieldName)
                    .Select(l => new EmployeeUpdateFieldChangeDto
                    {
                        FieldName = l.FieldName,
                        OldValue = l.OldValue,
                        NewValue = l.NewValue
                    })
                    .ToList();

                history.Add(new EmployeeUpdateHistoryItemDto
                {
                    UpdateSessionId = group.Key,
                    UpdatedAt = group.Max(l => l.UpdatedAt),
                    UpdatedByEmployeeId = first.UpdatedByEmployeeId,
                    UpdatedByName = performedByName,
                    Changes = changes
                });
            }

            return history.OrderByDescending(h => h.UpdatedAt).ToList();
        }

        // ------------------------------------------------------------------
        // KHÓA / MỞ KHÓA — 2 CẤP ĐỘ RIÊNG BIỆT
        // ------------------------------------------------------------------

        /// <summary>
        /// Khóa nhân viên TOÀN DIỆN: khóa Employee.Status (Inactive) + khóa luôn Account nếu có.
        /// FaceID KHÔNG bị xóa.
        /// </summary>
        public async Task LockEmployeeAsync(long employeeId, string reason, long currentEmployeeId)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Phải cung cấp lý do khi khóa nhân viên.", nameof(reason));
            }

            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    var employee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

                    if (employee == null)
                    {
                        throw new KeyNotFoundException($"Không tìm thấy nhân viên có Id = {employeeId}.");
                    }

                    if (employee.Status == EmployeeStatusInactive)
                    {
                        throw new InvalidOperationException("Nhân viên đã bị khóa từ trước.");
                    }

                    var sessionId = Guid.NewGuid();

                    SetEmployeeStatus(employee, EmployeeStatusInactive, currentEmployeeId, sessionId);
                    LogFieldChange(employeeId, sessionId, "Lý do khóa", null, reason, currentEmployeeId);

                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusSuspended)
                    {
                        await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);

                        LogFieldChange(
                            employeeId,
                            sessionId,
                            "Trạng thái tài khoản",
                            DescribeAccountStatus(account.Status),
                            DescribeAccountStatus(AccountStatusSuspended),
                            currentEmployeeId);

                        await _context.SaveChangesAsync();
                    }

                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>Mở khóa nhân viên TOÀN DIỆN: mở Employee.Status (Active) + mở luôn Account nếu có.</summary>
        public async Task UnlockEmployeeAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    var employee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

                    if (employee == null)
                    {
                        throw new KeyNotFoundException($"Không tìm thấy nhân viên có Id = {employeeId}.");
                    }

                    if (employee.Status == EmployeeStatusActive)
                    {
                        throw new InvalidOperationException("Nhân viên đang hoạt động, không cần mở khóa.");
                    }

                    var sessionId = Guid.NewGuid();

                    SetEmployeeStatus(employee, EmployeeStatusActive, currentEmployeeId, sessionId);
                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusActive)
                    {
                        await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);

                        LogFieldChange(
                            employeeId,
                            sessionId,
                            "Trạng thái tài khoản",
                            DescribeAccountStatus(account.Status),
                            DescribeAccountStatus(AccountStatusActive),
                            currentEmployeeId);

                        await _context.SaveChangesAsync();
                    }

                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>Khóa CHỈ tài khoản đăng nhập, KHÔNG đụng Employee.Status.</summary>
        public async Task LockAccountOnlyAsync(long employeeId, string reason, long currentEmployeeId)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));
            }

            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để khóa.");
            }

            var sessionId = Guid.NewGuid();

            await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);
            LogFieldChange(employeeId, sessionId, "Trạng thái tài khoản", DescribeAccountStatus(account.Status), DescribeAccountStatus(AccountStatusSuspended), currentEmployeeId);
            LogFieldChange(employeeId, sessionId, "Lý do khóa", null, reason, currentEmployeeId);

            await _context.SaveChangesAsync();
        }

        /// <summary>Mở khóa CHỈ tài khoản đăng nhập, KHÔNG đụng Employee.Status.</summary>
        public async Task UnlockAccountOnlyAsync(long employeeId, long currentEmployeeId)
        {
            await EnsureCanManageTargetAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để mở khóa.");
            }

            var sessionId = Guid.NewGuid();

            await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);
            LogFieldChange(employeeId, sessionId, "Trạng thái tài khoản", DescribeAccountStatus(account.Status), DescribeAccountStatus(AccountStatusActive), currentEmployeeId);

            await _context.SaveChangesAsync();
        }

        // ------------------------------------------------------------------
        // Helper dùng chung cho các hàm tạo nhân viên
        // ------------------------------------------------------------------

        private async Task<Employee> CreateEmployeeInfoInternalAsync(CreateEmployeeInfoDto dto, long createdBy, Guid sessionId, string roleName)
        {
            bool phoneExists = await _context.Employees.AnyAsync(e => e.Phone == dto.Phone);
            if (phoneExists)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var branchIds = dto.BranchIds.Distinct().ToList();
            var branches = await _context.Branches
                .Where(b => branchIds.Contains(b.BranchId))
                .ToListAsync();

            var employee = new Employee
            {
                FullName = dto.FullName,
                Phone = dto.Phone,
                Gender = dto.Gender,
                RoleId = dto.RoleId,
                Status = EmployeeStatusActive,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            foreach (var branch in branches)
            {
                employee.Branches.Add(branch);
            }

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync(); // cần EmployeeId sinh ra trước khi ghi log

            LogFieldChange(employee.EmployeeId, sessionId, "Họ tên", null, employee.FullName, createdBy);
            LogFieldChange(employee.EmployeeId, sessionId, "Số điện thoại", null, employee.Phone, createdBy);
            LogFieldChange(employee.EmployeeId, sessionId, "Giới tính", null, employee.Gender, createdBy);
            LogFieldChange(employee.EmployeeId, sessionId, "Vai trò", null, roleName, createdBy);
            LogFieldChange(employee.EmployeeId, sessionId, "Trạng thái nhân viên", null, DescribeEmployeeStatus(EmployeeStatusActive), createdBy);
            LogFieldChange(employee.EmployeeId, sessionId, "Chi nhánh", null, FormatBranchNames(branches), createdBy);

            return employee;
        }

        /// <summary>Đổi Employee.Status + ghi log, không SaveChanges (caller tự gọi).</summary>
        private void SetEmployeeStatus(Employee employee, string newStatus, long performedBy, Guid sessionId)
        {
            string oldStatus = employee.Status;
            employee.Status = newStatus;
            employee.UpdatedAt = DateTime.UtcNow;

            LogFieldChange(
                employee.EmployeeId,
                sessionId,
                "Trạng thái nhân viên",
                DescribeEmployeeStatus(oldStatus),
                DescribeEmployeeStatus(newStatus),
                performedBy);
        }

        // ------------------------------------------------------------------
        // Ghi log hoạt động (employee_update_logs)
        // ------------------------------------------------------------------

        /// <summary>
        /// Ghi 1 dòng log thay đổi cho 1 trường dữ liệu của nhân viên. Không ghi nếu giá trị
        /// không đổi. Không tự SaveChanges — caller gọi khi hoàn tất thao tác.
        /// </summary>
        private void LogFieldChange(long employeeId, Guid sessionId, string fieldName, string? oldValue, string? newValue, long? performedBy)
        {
            // Giá trị cũ và mới giống nhau thì không cần ghi log
            if (oldValue == newValue)
            {
                return;
            }

            _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog
            {
                UpdateSessionId = sessionId,
                EmployeeId = employeeId,
                FieldName = fieldName,
                OldValue = oldValue,
                NewValue = newValue ?? string.Empty,
                UpdatedByEmployeeId = performedBy,
                UpdatedAt = DateTime.UtcNow
            });
        }

        /// <summary>Ghép tên các chi nhánh thành 1 chuỗi dễ đọc cho log, vd: "Chi nhánh Quận 1, Chi nhánh Thủ Đức".</summary>
        private static string FormatBranchNames(IEnumerable<Branch> branches)
        {
            var names = branches
                .OrderBy(b => b.BranchId)
                .Select(b => b.BranchName)
                .ToList();

            if (names.Count == 0)
            {
                return "Không có chi nhánh";
            }

            return string.Join(", ", names);
        }

        /// <summary>Chuyển trạng thái tài khoản (Active/Suspended) sang chữ dễ hiểu cho log.</summary>
        private static string DescribeAccountStatus(string? status)
        {
            if (status == AccountStatusActive)
            {
                return "Đang hoạt động";
            }

            if (status == AccountStatusSuspended)
            {
                return "Bị khóa";
            }

            return status ?? "Chưa có tài khoản";
        }

        /// <summary>Chuyển trạng thái nhân viên (Active/Inactive) sang chữ dễ hiểu cho log.</summary>
        private static string DescribeEmployeeStatus(string status)
        {
            if (status == EmployeeStatusActive)
            {
                return "Đang làm việc";
            }

            if (status == EmployeeStatusInactive)
            {
                return "Bị khóa";
            }

            return status;
        }

        /// <summary>So sánh 2 danh sách id chi nhánh có giống nhau không (không quan tâm thứ tự).</summary>
        private static bool SameBranchSet(List<int> a, List<int> b)
        {
            if (a.Count != b.Count)
            {
                return false;
            }

            var aSorted = a.OrderBy(x => x).ToList();
            var bSorted = b.OrderBy(x => x).ToList();

            for (int i = 0; i < aSorted.Count; i++)
            {
                if (aSorted[i] != bSorted[i])
                {
                    return false;
                }
            }

            return true;
        }

        // ------------------------------------------------------------------
        // Helpers phân quyền
        // ------------------------------------------------------------------

        private async Task<CurrentEmployeeInfo> GetCurrentAsync(long employeeId)
        {
            var current = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new CurrentEmployeeInfo
                {
                    RoleName = e.Role.RoleName,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (current == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            return current;
        }

        private async Task<string> GetRoleNameAsync(sbyte roleId)
        {
            var roleName = await _context.Roles
                .AsNoTracking()
                .Where(r => r.RoleId == roleId)
                .Select(r => r.RoleName)
                .FirstOrDefaultAsync();

            if (roleName == null)
            {
                throw new InvalidOperationException("Vai trò không hợp lệ.");
            }

            return roleName;
        }

        /// <summary>Lấy RoleId ứng với vai trò Staff — dùng để ép role khi Manager tạo nhân viên.</summary>
        private async Task<sbyte> GetStaffRoleIdAsync()
        {
            var role = await _context.Roles
                .AsNoTracking()
                .Where(r => r.RoleName == RoleStaff)
                .Select(r => new { r.RoleId })
                .FirstOrDefaultAsync();

            if (role == null)
            {
                throw new InvalidOperationException("Không tìm thấy vai trò Staff trong hệ thống.");
            }

            return role.RoleId;
        }

        /// <summary>
        /// Kiểm tra current có quyền gán vai trò targetRoleName cho người khác không:
        /// - Admin: được gán bất kỳ vai trò nào.
        /// - Manager: chỉ được gán vai trò Staff (không được gán Admin hoặc Manager).
        /// - Vai trò khác (vd Staff): không có quyền gì cả.
        /// </summary>
        private static void EnsureCanAssignRole(string currentRoleName, string targetRoleName)
        {
            if (currentRoleName == RoleAdmin)
            {
                return;
            }

            if (currentRoleName == RoleManager)
            {
                if (targetRoleName == RoleAdmin || targetRoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý chỉ được tạo hoặc cập nhật tài khoản nhân viên.");
                }
                return;
            }

            throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
        }

        /// <summary>Manager chỉ được thao tác trên các chi nhánh mình phụ trách; Admin thì không giới hạn.</summary>
        private static void EnsureBranchScope(CurrentEmployeeInfo current, List<int> branchIds)
        {
            if (current.RoleName != RoleManager)
            {
                return;
            }

            bool coChiNhanhNgoaiPhamVi = branchIds.Except(current.BranchIds).Any();

            if (branchIds.Count == 0 || coChiNhanhNgoaiPhamVi)
            {
                throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
            }
        }

        /// <summary>Nhân viên có vai trò Staff chỉ được gán đúng 1 chi nhánh.</summary>
        private static void EnsureBranchCountForRole(string roleName, List<int> branchIds)
        {
            if (roleName == RoleStaff && branchIds.Count != 1)
            {
                throw new InvalidOperationException("Nhân viên có vai trò Staff chỉ được thuộc đúng 1 chi nhánh.");
            }
        }

        /// <summary>
        /// Kiểm tra current có được thao tác (sửa/khóa/mở khóa/faceid/tài khoản) trên target không:
        /// - Admin: luôn được phép.
        /// - Manager: chỉ được phép nếu target không phải Admin/Manager VÀ cùng chi nhánh phụ trách.
        /// </summary>
        private async Task<CurrentEmployeeInfo> EnsureCanManageTargetAsync(long currentEmployeeId, long targetEmployeeId)
        {
            var current = await GetCurrentAsync(currentEmployeeId);

            if (current.RoleName == RoleAdmin)
            {
                return current;
            }

            if (current.RoleName != RoleManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
            }

            var target = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == targetEmployeeId)
                .Select(e => new { e.Role.RoleName, BranchIds = e.Branches.Select(b => b.BranchId).ToList() })
                .FirstOrDefaultAsync();

            if (target == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
            }

            if (target.RoleName == RoleAdmin || target.RoleName == RoleManager)
            {
                throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
            }

            bool cungChiNhanh = target.BranchIds.Any(id => current.BranchIds.Contains(id));
            if (!cungChiNhanh)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
            }

            return current;
        }

        /// <summary>
        /// Kiểm tra current có được XEM thông tin target không (nhẹ hơn EnsureCanManageTargetAsync):
        /// - Chỉ Admin/Manager được xem, Staff không được xem.
        /// - Admin: xem tất cả.
        /// - Manager: chỉ xem nhân viên cùng chi nhánh, KHÔNG được xem Admin.
        /// - Riêng: tự xem hồ sơ của chính mình thì luôn được phép, kể cả Staff.
        /// </summary>
        private async Task<CurrentEmployeeInfo> EnsureCanViewTargetAsync(long currentEmployeeId, long targetEmployeeId)
        {
            var current = await GetCurrentAsync(currentEmployeeId);

            // Tự xem hồ sơ của chính mình thì luôn được phép.
            if (currentEmployeeId == targetEmployeeId)
            {
                return current;
            }

            bool laAdmin = current.RoleName == RoleAdmin;
            bool laManager = current.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên.");
            }

            if (laAdmin)
            {
                return current;
            }

            // Còn lại là Manager -> kiểm tra thêm điều kiện phạm vi chi nhánh và không được xem Admin
            var target = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == targetEmployeeId)
                .Select(e => new { e.Role.RoleName, BranchIds = e.Branches.Select(b => b.BranchId).ToList() })
                .FirstOrDefaultAsync();

            if (target == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
            }

            if (target.RoleName == RoleAdmin)
            {
                throw new UnauthorizedAccessException("Quản lý không có quyền xem thông tin tài khoản Admin.");
            }

            bool cungChiNhanh = target.BranchIds.Any(id => current.BranchIds.Contains(id));
            if (!cungChiNhanh)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên thuộc chi nhánh khác.");
            }

            return current;
        }
    }
}