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

        // ====================================================================
        // LUỒNG 1: TÀI KHOẢN
        // ====================================================================


        // Tạo nhân viên kèm tài khoản đăng nhập
        public async Task<EmployeeAccountProfileDto> CreateWithAccountAsync(CreateEmployeeAccountDto dto, long createdBy)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == createdBy)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            string currentRoleName = currentInfo.RoleName;
            List<int> currentBranchIds = currentInfo.BranchIds;

            // Manager tạo nhân viên thì luôn là Staff, không cho tự chọn role
            if (currentRoleName == RoleManager)
            {
                var staffRole = await _context.Roles
                    .AsNoTracking()
                    .Where(r => r.RoleName == RoleStaff)
                    .Select(r => new { r.RoleId })
                    .FirstOrDefaultAsync();

                if (staffRole == null)
                {
                    throw new InvalidOperationException("Không tìm thấy vai trò Staff trong hệ thống.");
                }

                dto.RoleId = staffRole.RoleId;
            }

            string? targetRoleName = await _context.Roles
                .AsNoTracking()
                .Where(r => r.RoleId == dto.RoleId)
                .Select(r => r.RoleName)
                .FirstOrDefaultAsync();

            if (targetRoleName == null)
            {
                throw new InvalidOperationException("Vai trò không hợp lệ.");
            }

            // Kiểm tra quyền gán vai trò: Admin gán tùy ý, Manager chỉ gán Staff, còn lại không có quyền
            if (currentRoleName == RoleManager)
            {
                if (targetRoleName == RoleAdmin || targetRoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý chỉ được tạo hoặc cập nhật tài khoản nhân viên.");
                }
            }
            else if (currentRoleName != RoleAdmin)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
            }

            // Manager chỉ được thao tác trên chi nhánh mình phụ trách
            if (currentRoleName == RoleManager)
            {
                bool coChiNhanhNgoaiPhamVi = dto.BranchIds.Except(currentBranchIds).Any();
                if (dto.BranchIds.Count == 0 || coChiNhanhNgoaiPhamVi)
                {
                    throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
                }
            }

            // Nhân viên vai trò Staff chỉ được thuộc đúng 1 chi nhánh
            if (targetRoleName == RoleStaff && dto.BranchIds.Count != 1)
            {
                throw new InvalidOperationException("Nhân viên có vai trò Staff chỉ được thuộc đúng 1 chi nhánh.");
            }

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sessionId = Guid.NewGuid();

                    bool phoneExists = await _context.Employees.AnyAsync(e => e.Phone == dto.Phone);
                    if (phoneExists)
                    {
                        throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
                    }

                    var distinctBranchIds = dto.BranchIds.Distinct().ToList();
                    var branches = await _context.Branches
                        .Where(b => distinctBranchIds.Contains(b.BranchId))
                        .ToListAsync();

                    var employee = new Employee
                    {
                        FullName = dto.FullName,
                        Phone = dto.Phone,
                        Gender = dto.Gender,
                        Status = EmployeeStatusActive,
                        CreatedBy = createdBy,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    foreach (var branch in branches)
                    {
                        employee.Branches.Add(branch);
                    }

                    _context.Employees.Add(employee);
                    await _context.SaveChangesAsync(); // cần EmployeeId sinh ra trước khi ghi log

                    string branchNames = branches.Count == 0
                        ? "Không có chi nhánh"
                        : string.Join(", ", branches.OrderBy(b => b.BranchId).Select(b => b.BranchName));

                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Họ tên", OldValue = null, NewValue = employee.FullName, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Số điện thoại", OldValue = null, NewValue = employee.Phone, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Giới tính", OldValue = null, NewValue = employee.Gender, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Trạng thái nhân viên", OldValue = null, NewValue = "Đang làm việc", UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Chi nhánh", OldValue = null, NewValue = branchNames, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });

                    await _accountService.CreateAccountAsync(memberId: null, employeeId: employee.EmployeeId, roleId: dto.RoleId, phone: null, email: dto.LoginEmail, password: dto.Password);

                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Vai trò", OldValue = null, NewValue = targetRoleName, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Email đăng nhập", OldValue = null, NewValue = dto.LoginEmail, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var created = await _context.Employees
                        .AsNoTracking()
                        .Where(e => e.EmployeeId == employee.EmployeeId && e.Account != null)
                        .Select(e => new
                        {
                            e.EmployeeId,
                            e.FullName,
                            e.Phone,
                            e.Gender,
                            e.Status,
                            e.CreatedByNavigation,
                            e.CreatedAt,
                            e.UpdatedAt,
                            Role = e.Account!.Role.RoleName,
                            e.Account.AccountId,
                            LoginEmail = e.Account.Username,
                            AccountStatus = e.Account.Status,
                            Branches = e.Branches.OrderBy(b => b.BranchId).Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName }).ToList()
                        })
                        .FirstAsync();

                    return new EmployeeAccountProfileDto
                    {
                        EmployeeId = created.EmployeeId,
                        FullName = created.FullName,
                        Phone = created.Phone,
                        Gender = created.Gender,
                        Status = created.Status,
                        CreatedBy = created.CreatedByNavigation?.FullName,
                        CreatedAt = created.CreatedAt,
                        UpdatedAt = created.UpdatedAt,
                        Role = created.Role,
                        AccountId = created.AccountId,
                        LoginPhone = null,
                        LoginEmail = created.LoginEmail,
                        AccountStatus = created.AccountStatus,
                        Branches = created.Branches,
                        DefaultBranchId = created.Branches.Count > 0 ? created.Branches[0].BranchId : null
                    };
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // Sửa thông tin cơ bản + vai trò của nhân viên hệ thống
        public async Task<bool> UpdateAccountInfoAsync(long employeeId, UpdateEmployeeAccountInfoDto dto, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            string currentRoleName = currentInfo.RoleName;
            List<int> currentBranchIds = currentInfo.BranchIds;

            if (currentRoleName != RoleAdmin)
            {
                if (currentRoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfoForRights = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfoForRights == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfoForRights.RoleName == RoleAdmin || targetInfoForRights.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfoForRights.BranchIds.Any(id => currentBranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

            var employee = await _context.Employees
                .Include(e => e.Branches)
                .Include(e => e.Account)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null || employee.Account == null)
            {
                return false;
            }

            bool roleChanged = dto.RoleId != employee.Account.RoleId;

            // Manager không có quyền điều chỉnh vai trò của nhân viên dưới mọi hình thức
            if (roleChanged && currentRoleName == RoleManager)
            {
                throw new UnauthorizedAccessException("Quản lý không có quyền thay đổi vai trò của nhân viên.");
            }

            string? newRoleName = await _context.Roles
                .AsNoTracking()
                .Where(r => r.RoleId == dto.RoleId)
                .Select(r => r.RoleName)
                .FirstOrDefaultAsync();

            if (newRoleName == null)
            {
                throw new InvalidOperationException("Vai trò không hợp lệ.");
            }

            if (roleChanged && currentRoleName == RoleManager && (newRoleName == RoleAdmin || newRoleName == RoleManager))
            {
                throw new UnauthorizedAccessException("Quản lý chỉ được tạo hoặc cập nhật tài khoản nhân viên.");
            }

            if (currentRoleName == RoleManager)
            {
                bool coChiNhanhNgoaiPhamVi = dto.BranchIds.Except(currentBranchIds).Any();
                if (dto.BranchIds.Count == 0 || coChiNhanhNgoaiPhamVi)
                {
                    throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
                }
            }

            if (newRoleName == RoleStaff && dto.BranchIds.Count != 1)
            {
                throw new InvalidOperationException("Nhân viên có vai trò Staff chỉ được thuộc đúng 1 chi nhánh.");
            }

            bool phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var sessionId = Guid.NewGuid();

            var distinctBranchIds = dto.BranchIds.Distinct().ToList();
            var newBranches = await _context.Branches
                .Where(b => distinctBranchIds.Contains(b.BranchId))
                .ToListAsync();

            if (employee.FullName != dto.FullName)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Họ tên", OldValue = employee.FullName, NewValue = dto.FullName, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }
            if (employee.Phone != dto.Phone)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Số điện thoại", OldValue = employee.Phone, NewValue = dto.Phone, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }
            if (employee.Gender != dto.Gender)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Giới tính", OldValue = employee.Gender, NewValue = dto.Gender, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            var oldBranchIdsSorted = employee.Branches.Select(b => b.BranchId).OrderBy(x => x).ToList();
            var newBranchIdsSorted = newBranches.Select(b => b.BranchId).OrderBy(x => x).ToList();
            bool branchesGiongNhau = oldBranchIdsSorted.SequenceEqual(newBranchIdsSorted);

            if (!branchesGiongNhau)
            {
                string oldBranchNames = employee.Branches.Count == 0 ? "Không có chi nhánh" : string.Join(", ", employee.Branches.OrderBy(b => b.BranchId).Select(b => b.BranchName));
                string newBranchNames = newBranches.Count == 0 ? "Không có chi nhánh" : string.Join(", ", newBranches.OrderBy(b => b.BranchId).Select(b => b.BranchName));
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Chi nhánh", OldValue = oldBranchNames, NewValue = newBranchNames, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            employee.FullName = dto.FullName;
            employee.Phone = dto.Phone;
            employee.Gender = dto.Gender;
            employee.UpdatedAt = DateTime.Now;

            employee.Branches.Clear();
            foreach (var branch in newBranches)
            {
                employee.Branches.Add(branch);
            }

            if (roleChanged)
            {
                string? oldRoleName = await _context.Roles
                    .AsNoTracking()
                    .Where(r => r.RoleId == employee.Account.RoleId)
                    .Select(r => r.RoleName)
                    .FirstOrDefaultAsync();

                await _accountService.ChangeRoleAsync(employee.Account.AccountId, dto.RoleId);
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Vai trò", OldValue = oldRoleName, NewValue = newRoleName, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            await _context.SaveChangesAsync();
            return true;
        }
        // Sửa tài khoản đăng nhập đã có (email đăng nhập, mật khẩu)
        public async Task UpdateAccountAsync(long employeeId, UpdateEmployeeAccountDto dto, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfo = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfo == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfo.RoleName == RoleAdmin || targetInfo.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập.");
            }

            var sessionId = Guid.NewGuid();

            // Account.Username chính là email đăng nhập của nhân viên
            if (account.Username != dto.LoginEmail)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Email đăng nhập", OldValue = account.Username, NewValue = dto.LoginEmail, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            await _accountService.UpdateAccountInfoAsync(accountId: account.AccountId, newPhone: null, newEmail: dto.LoginEmail);

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                await _accountService.ResetPasswordAsync(account.AccountId, dto.NewPassword);
                // Không bao giờ ghi mật khẩu vào log — chỉ đánh dấu sự kiện
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Mật khẩu", OldValue = null, NewValue = "Đã đặt lại mật khẩu", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<EmployeeAccountProfileDto?> GetAccountProfileAsync(long employeeId, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentEmployeeId != employeeId)
            {
                if (currentInfo.RoleName != RoleAdmin && currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên.");
                }

                if (currentInfo.RoleName == RoleManager)
                {
                    var targetInfo = await _context.Employees
                        .AsNoTracking()
                        .Where(e => e.EmployeeId == employeeId)
                        .Select(e => new
                        {
                            RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                            BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                        })
                        .FirstOrDefaultAsync();

                    if (targetInfo == null)
                    {
                        throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                    }

                    if (targetInfo.RoleName == RoleAdmin)
                    {
                        throw new UnauthorizedAccessException("Quản lý không có quyền xem thông tin tài khoản Admin.");
                    }

                    bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                    if (!cungChiNhanh)
                    {
                        throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên thuộc chi nhánh khác.");
                    }
                }
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId && e.Account != null)
                .Select(e => new
                {
                    e.EmployeeId,
                    e.FullName,
                    e.Phone,
                    e.Gender,
                    e.Status,
                    e.CreatedByNavigation,
                    e.CreatedAt,
                    e.UpdatedAt,
                    Role = e.Account!.Role.RoleName,
                    e.Account.AccountId,
                    LoginEmail = e.Account.Username,
                    AccountStatus = e.Account.Status,
                    Branches = e.Branches.OrderBy(b => b.BranchId).Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName }).ToList()
                })
                .FirstOrDefaultAsync();

            if (employee == null)
            {
                return null;
            }

            return new EmployeeAccountProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Gender = employee.Gender,
                Status = employee.Status,
                CreatedBy = employee.CreatedByNavigation?.FullName,
                CreatedAt = employee.CreatedAt,
                UpdatedAt = employee.UpdatedAt,
                Role = employee.Role,
                AccountId = employee.AccountId,
                LoginPhone = null,
                LoginEmail = employee.LoginEmail,
                AccountStatus = employee.AccountStatus,
                Branches = employee.Branches,
                DefaultBranchId = employee.Branches.Count > 0 ? employee.Branches[0].BranchId : null
            };
        }

        // Danh sách TÀI KHOẢN: chỉ những nhân viên đang có Account
        public async Task<List<EmployeeAccountListItemDto>> GetAccountListAsync(EmployeeAccountFilterDto filter, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            bool laAdmin = currentInfo.RoleName == RoleAdmin;
            bool laManager = currentInfo.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem danh sách tài khoản.");
            }

            var query = _context.Employees.AsNoTracking().Where(e => e.Account != null);

            if (laManager)
            {
                if (currentInfo.BranchIds.Count == 0)
                {
                    return new List<EmployeeAccountListItemDto>();  //nếu mà quản lý chua đc gán chi nhánh thì trả về rỗng. 
                                                                    // đã có chi nhánh đâu mà coi nhân viên
                }



                query = query
                    .Where(e => e.Branches.Any(eb => currentInfo.BranchIds.Contains(eb.BranchId)))
                    //eb là branches của thàng employee không p của currentinffo
                    .Where(e => e.Account!.Role.RoleName != RoleAdmin);  //tại vì nếu là quản lý thì k đc lọc thàng admin 
            }

            if (filter.BranchId.HasValue)
            {
                query = query.Where(e => e.Branches.Any(b => b.BranchId == filter.BranchId.Value));
            }

            if (!string.IsNullOrWhiteSpace(filter.Name))
            {
                string tenKeyword = filter.Name.Trim();
                query = query.Where(e => e.FullName.Contains(tenKeyword));
            }

            if (!string.IsNullOrWhiteSpace(filter.Phone))
            {
                string phoneKeyword = filter.Phone.Trim();
                query = query.Where(e => e.Phone.Contains(phoneKeyword));
            }

            if (!string.IsNullOrWhiteSpace(filter.Email))
            {
                string emailKeyword = filter.Email.Trim();
                query = query.Where(e => EF.Functions.Like(e.Account!.Username, $"%{emailKeyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(e => e.Status == filter.Status);
            }

            var result = await query
                .OrderBy(e => e.FullName)
                .Select(e => new EmployeeAccountListItemDto
                {
                    EmployeeId = e.EmployeeId,
                    FullName = e.FullName,
                    Phone = e.Phone,
                    Gender = e.Gender,
                    Status = e.Status,
                    CreatedBy = e.CreatedByNavigation.FullName,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt,
                    Role = e.Account!.Role.RoleName,
                    AccountId = e.Account.AccountId,
                    LoginPhone = null,
                    LoginEmail = e.Account.Username,
                    AccountStatus = e.Account.Status,
                    Branches = e.Branches
                        .OrderBy(b => b.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName })
                        .ToList()
                })
                .ToListAsync();

            return result;
        }


        // ====================================================================
        // LUỒNG 2: NHÂN VIÊN + FACEID
        // ====================================================================

        // Tạo nhân viên kèm FaceID (bắt buộc). Không tài khoản, không vai trò
        public async Task<EmployeeProfileDto> CreateWithFaceIdAsync(CreateEmployeeFaceIdDto dto, long createdBy)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == createdBy)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName == RoleManager)
            {
                bool coChiNhanhNgoaiPhamVi = dto.BranchIds.Except(currentInfo.BranchIds).Any();
                if (dto.BranchIds.Count == 0 || coChiNhanhNgoaiPhamVi)
                {
                    throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
                }
            }

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();

                // Dùng để xóa FaceID/S3 nếu bước lưu DB lỗi sau khi FaceID đã đăng ký xong
                FaceDatum? faceDatumDaDangKy = null;

                try
                {
                    var sessionId = Guid.NewGuid();

                    bool phoneExists = await _context.Employees.AnyAsync(e => e.Phone == dto.Phone);
                    if (phoneExists)
                    {
                        throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
                    }

                    var distinctBranchIds = dto.BranchIds.Distinct().ToList(); // chạn truongf họp gủi lên bị trùng mã chi nhánh 
                    var branches = await _context.Branches
                        .Where(b => distinctBranchIds.Contains(b.BranchId))
                        .ToListAsync();

                    var employee = new Employee
                    {
                        FullName = dto.FullName,
                        Phone = dto.Phone,
                        Gender = dto.Gender,
                        Status = EmployeeStatusActive,
                        CreatedBy = createdBy,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    foreach (var branch in branches)
                    {
                        employee.Branches.Add(branch);
                    }

                    _context.Employees.Add(employee);
                    await _context.SaveChangesAsync(); // cần EmployeeId sinh ra trước khi ghi log

                    string branchNames = "";
                    if (branches.Count == 0)
                    {
                        branchNames = "Không có chi nhánh";
                    }
                    else
                    {
                        string.Join(", ", branches.OrderBy(b => b.BranchId).Select(b => b.BranchName));
                    }


                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Họ tên", OldValue = null, NewValue = employee.FullName, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Số điện thoại", OldValue = null, NewValue = employee.Phone, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Giới tính", OldValue = null, NewValue = employee.Gender, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Trạng thái nhân viên", OldValue = null, NewValue = "Đang làm việc", UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "Chi nhánh", OldValue = null, NewValue = branchNames, UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });

                    string faceReason = dto.FaceIdReason ?? "Đăng ký FaceID khi tạo hồ sơ nhân viên";

                    faceDatumDaDangKy = await _faceIdService.RegisterFirstFaceAsync(memberId: null, employeeId: employee.EmployeeId, profileImage: dto.ProfileImage, reason: faceReason, performedBy: createdBy);
                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employee.EmployeeId, FieldName = "FaceID", OldValue = null, NewValue = "Đã đăng ký", UpdatedByEmployeeId = createdBy, UpdatedAt = DateTime.Now });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var created = await _context.Employees
                        .AsNoTracking()
                        .Where(e => e.EmployeeId == employee.EmployeeId)
                        .Select(e => new
                        {
                            e.EmployeeId,
                            e.FullName,
                            e.Phone,
                            e.Gender,
                            e.Status,
                            e.CreatedByNavigation,
                            e.CreatedAt,
                            e.UpdatedAt,
                            Role = e.Account != null ? e.Account.Role.RoleName : null,
                            HasFaceId = e.FaceDatumEmployee != null,
                            FaceProfileImage = e.FaceDatumEmployee != null ? e.FaceDatumEmployee.ProfileImage : null,
                            Branches = e.Branches.OrderBy(b => b.BranchId).Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName }).ToList()
                        })
                        .FirstAsync();

                    return new EmployeeProfileDto
                    {
                        EmployeeId = created.EmployeeId,
                        FullName = created.FullName,
                        Phone = created.Phone,
                        Gender = created.Gender,
                        Status = created.Status,
                        CreatedBy = created.CreatedByNavigation.FullName,
                        CreatedAt = created.CreatedAt,
                        UpdatedAt = created.UpdatedAt,
                        Role = created.Role,
                        HasFaceId = created.HasFaceId,
                        FaceProfileImage = created.FaceProfileImage,
                        Branches = created.Branches,
                        DefaultBranchId = created.Branches.Count > 0 ? created.Branches[0].BranchId : null
                    };
                }
                catch
                {
                    await transaction.RollbackAsync();

                    // DB đã rollback, nhưng face trên AWS + ảnh trên S3 thì không tự rollback theo DB được
                    if (faceDatumDaDangKy != null)
                    {
                        await _faceIdService.XoaFaceIdDaDangKyAsync(faceDatumDaDangKy.FaceIdAws, faceDatumDaDangKy.ProfileImage);
                    }

                    throw;
                }
            });
        }

        // Sửa thông tin cơ bản của nhân viên thuộc luồng FaceID 
        public async Task<bool> UpdateInfoAsync(long employeeId, UpdateEmployeeInfoDto dto, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfo = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfo == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfo.RoleName == RoleAdmin || targetInfo.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

            var employee = await _context.Employees
                .Include(e => e.Branches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
            {
                return false;
            }

            if (currentInfo.RoleName == RoleManager)
            {
                bool coChiNhanhNgoaiPhamVi = dto.BranchIds.Except(currentInfo.BranchIds).Any();
                if (dto.BranchIds.Count == 0 || coChiNhanhNgoaiPhamVi)
                {
                    throw new UnauthorizedAccessException("Bạn chỉ được thao tác trên chi nhánh mình phụ trách.");
                }
            }

            bool phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var sessionId = Guid.NewGuid();

            var distinctBranchIds = dto.BranchIds.Distinct().ToList();
            var newBranches = await _context.Branches
                .Where(b => distinctBranchIds.Contains(b.BranchId))
                .ToListAsync();

            if (employee.FullName != dto.FullName)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Họ tên", OldValue = employee.FullName, NewValue = dto.FullName, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }
            if (employee.Phone != dto.Phone)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Số điện thoại", OldValue = employee.Phone, NewValue = dto.Phone, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }
            if (employee.Gender != dto.Gender)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Giới tính", OldValue = employee.Gender, NewValue = dto.Gender, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            var oldBranchIdsSorted = employee.Branches.Select(b => b.BranchId).OrderBy(x => x).ToList();
            var newBranchIdsSorted = newBranches.Select(b => b.BranchId).OrderBy(x => x).ToList();
            bool branchesGiongNhau = oldBranchIdsSorted.SequenceEqual(newBranchIdsSorted);

            if (!branchesGiongNhau)
            {
                string oldBranchNames = employee.Branches.Count == 0 ? "Không có chi nhánh" : string.Join(", ", employee.Branches.OrderBy(b => b.BranchId).Select(b => b.BranchName));
                string newBranchNames = newBranches.Count == 0 ? "Không có chi nhánh" : string.Join(", ", newBranches.OrderBy(b => b.BranchId).Select(b => b.BranchName));
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Chi nhánh", OldValue = oldBranchNames, NewValue = newBranchNames, UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            }

            employee.FullName = dto.FullName;
            employee.Phone = dto.Phone;
            employee.Gender = dto.Gender;
            employee.UpdatedAt = DateTime.Now;

            employee.Branches.Clear();
            foreach (var branch in newBranches)
            {
                employee.Branches.Add(branch);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // Đăng ký/cập nhật FaceID cho nhân viên
        public async Task<FaceDatum> UpdateFaceAsync(long employeeId, UpdateEmployeeFaceIdDto dto, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfo = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfo == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfo.RoleName == RoleAdmin || targetInfo.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

            var faceDatum = await _faceIdService.UpdateFaceAsync(memberId: null, employeeId: employeeId, profileImage: dto.ProfileImage, reason: dto.Reason, performedBy: currentEmployeeId);

            // FaceIdService tự có lịch sử riêng; ở đây chỉ ghi thêm 1 dòng đối chiếu chéo vào nhật ký chung
            _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = Guid.NewGuid(), EmployeeId = employeeId, FieldName = "FaceID", OldValue = null, NewValue = "Đã cập nhật", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });
            await _context.SaveChangesAsync();

            return faceDatum;
        }

        // Lấy lịch sử cập nhật FaceID của nhân viên
        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long employeeId, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfo = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfo == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfo.RoleName == RoleAdmin || targetInfo.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

            return await _faceIdService.GetFaceHistoryAsync(memberId: null, employeeId: employeeId);
        }

        // Xem hồ sơ dạng "nhân viên" (info + FaceID)
        public async Task<EmployeeProfileDto?> GetProfileAsync(long employeeId, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentEmployeeId != employeeId)
            {
                if (currentInfo.RoleName != RoleAdmin && currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên.");
                }

                if (currentInfo.RoleName == RoleManager)
                {
                    var targetInfo = await _context.Employees
                        .AsNoTracking()
                        .Where(e => e.EmployeeId == employeeId)
                        .Select(e => new
                        {
                            RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                            BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                        })
                        .FirstOrDefaultAsync();

                    if (targetInfo == null)
                    {
                        throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                    }

                    if (targetInfo.RoleName == RoleAdmin)
                    {
                        throw new UnauthorizedAccessException("Quản lý không có quyền xem thông tin tài khoản Admin.");
                    }

                    bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                    if (!cungChiNhanh)
                    {
                        throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên thuộc chi nhánh khác.");
                    }
                }
            }

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
                    e.CreatedByNavigation,
                    e.CreatedAt,
                    e.UpdatedAt,
                    Role = e.Account != null ? e.Account.Role.RoleName : null,
                    HasFaceId = e.FaceDatumEmployee != null,
                    FaceProfileImage = e.FaceDatumEmployee != null ? e.FaceDatumEmployee.ProfileImage : null,
                    Branches = e.Branches.OrderBy(b => b.BranchId).Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName }).ToList()
                })
                .FirstOrDefaultAsync();

            if (employee == null)
            {
                return null;
            }

            return new EmployeeProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Gender = employee.Gender,
                Status = employee.Status,
                CreatedBy = employee.CreatedByNavigation.FullName,
                CreatedAt = employee.CreatedAt,
                UpdatedAt = employee.UpdatedAt,
                Role = employee.Role,
                HasFaceId = employee.HasFaceId,
                FaceProfileImage = employee.FaceProfileImage,
                Branches = employee.Branches,
                DefaultBranchId = employee.Branches.Count > 0 ? employee.Branches[0].BranchId : null
            };
        }

        // Danh sách NHÂN VIÊN: những nhân viên chưa có Account
        public async Task<List<EmployeeListItemDto>> GetListAsync(EmployeeFilterDto filter, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            bool laAdmin = currentInfo.RoleName == RoleAdmin;
            bool laManager = currentInfo.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem danh sách nhân viên.");
            }

            var query = _context.Employees.AsNoTracking().Where(e => e.Account == null);

            if (laManager)
            {
                if (currentInfo.BranchIds.Count == 0)
                {
                    return new List<EmployeeListItemDto>();
                }

                query = query.Where(e => e.Branches.Any(b => currentInfo.BranchIds.Contains(b.BranchId)));
            }

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
                query = query.Where(e => EF.Functions.Like(e.Phone, $"%{phoneKeyword}%"));
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
                    CreatedBy = e.CreatedByNavigation.FullName,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt,
                    Role = null,
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



        // ====================================================================
        // HẠ TẦNG DÙNG CHUNG
        // ====================================================================
        #region Hạ tầng dùng chung

        // Lấy lịch sử cập nhật chung của nhân viên, gộp theo UpdateSessionId
        public async Task<List<EmployeeUpdateHistoryItemDto>> GetUpdateHistoryAsync(long employeeId, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentEmployeeId != employeeId)
            {
                if (currentInfo.RoleName != RoleAdmin && currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên.");
                }

                if (currentInfo.RoleName == RoleManager)
                {
                    var targetInfo = await _context.Employees
                        .AsNoTracking()
                        .Where(e => e.EmployeeId == employeeId)
                        .Select(e => new
                        {
                            RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                            BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                        })
                        .FirstOrDefaultAsync();

                    if (targetInfo == null)
                    {
                        throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                    }

                    if (targetInfo.RoleName == RoleAdmin)
                    {
                        throw new UnauthorizedAccessException("Quản lý không có quyền xem thông tin tài khoản Admin.");
                    }

                    bool cungChiNhanh = targetInfo.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                    if (!cungChiNhanh)
                    {
                        throw new UnauthorizedAccessException("Bạn không có quyền xem thông tin nhân viên thuộc chi nhánh khác.");
                    }
                }
            }

            var logs = await _context.EmployeeUpdateLogs
                .AsNoTracking()
                .Where(l => l.EmployeeId == employeeId)
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            if (logs.Count == 0)
            {
                return new List<EmployeeUpdateHistoryItemDto>();
            }

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

        // Khóa nhân viên toàn diện: khóa Employee.Status + khóa luôn Account nếu có. FaceID không bị xóa
        public async Task LockEmployeeAsync(long employeeId, long currentEmployeeId)
        {


            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfoForRights = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfoForRights == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfoForRights.RoleName == RoleAdmin || targetInfoForRights.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfoForRights.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

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

                    string oldEmployeeStatusText = employee.Status == EmployeeStatusActive ? "Đang làm việc" : employee.Status == EmployeeStatusInactive ? "Bị khóa" : employee.Status;

                    employee.Status = EmployeeStatusInactive;
                    employee.UpdatedAt = DateTime.Now;

                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Trạng thái nhân viên", OldValue = oldEmployeeStatusText, NewValue = "Bị khóa", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });

                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusSuspended)
                    {
                        string oldAccountStatusText = account.Status == AccountStatusActive ? "Đang hoạt động" : account.Status == AccountStatusSuspended ? "Bị khóa" : (account.Status ?? "Chưa có tài khoản");

                        await _accountService.LockAccountAsync(account.AccountId, currentEmployeeId);

                        _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Trạng thái tài khoản", OldValue = oldAccountStatusText, NewValue = "Bị khóa", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });

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

        // Mở khóa nhân viên toàn diện: mở Employee.Status + mở luôn Account nếu có
        public async Task UnlockEmployeeAsync(long employeeId, long currentEmployeeId)
        {
            var currentInfo = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (currentInfo == null || currentInfo.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            if (currentInfo.RoleName != RoleAdmin)
            {
                if (currentInfo.RoleName != RoleManager)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thực hiện thao tác này.");
                }

                var targetInfoForRights = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == employeeId)
                    .Select(e => new
                    {
                        RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                        BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (targetInfoForRights == null)
                {
                    throw new UnauthorizedAccessException("Không tìm thấy nhân viên.");
                }

                if (targetInfoForRights.RoleName == RoleAdmin || targetInfoForRights.RoleName == RoleManager)
                {
                    throw new UnauthorizedAccessException("Quản lý không có quyền thao tác trên tài khoản Admin/Manager.");
                }

                bool cungChiNhanh = targetInfoForRights.BranchIds.Any(id => currentInfo.BranchIds.Contains(id));
                if (!cungChiNhanh)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thao tác trên nhân viên thuộc chi nhánh khác.");
                }
            }

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

                    string oldEmployeeStatusText = employee.Status == EmployeeStatusActive ? "Đang làm việc" : employee.Status == EmployeeStatusInactive ? "Bị khóa" : employee.Status;

                    employee.Status = EmployeeStatusActive;
                    employee.UpdatedAt = DateTime.Now;

                    _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Trạng thái nhân viên", OldValue = oldEmployeeStatusText, NewValue = "Đang làm việc", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });

                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusActive)
                    {
                        string oldAccountStatusText = account.Status == AccountStatusActive ? "Đang hoạt động" : account.Status == AccountStatusSuspended ? "Bị khóa" : (account.Status ?? "Chưa có tài khoản");

                        await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);

                        _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog { UpdateSessionId = sessionId, EmployeeId = employeeId, FieldName = "Trạng thái tài khoản", OldValue = oldAccountStatusText, NewValue = "Đang hoạt động", UpdatedByEmployeeId = currentEmployeeId, UpdatedAt = DateTime.Now });

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

        #endregion
    }
}