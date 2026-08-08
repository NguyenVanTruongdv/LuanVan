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

        private const string LogFieldLyDoKhoa = "Lý do khóa";

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
        // RoleName chỉ tồn tại nếu người thao tác đang có Account (bắt buộc, vì phải đăng nhập mới thao tác được)
        private class CurrentEmployeeInfo
        {
            public string RoleName { get; set; } = null!;
            public List<int> BranchIds { get; set; } = new();
        }

        // ====================================================================
        // LUỒNG 1: TÀI KHOẢN
        // (Thông tin nhân viên + tài khoản đăng nhập — KHÔNG đụng gì tới FaceID)
        // Role của nhân viên luồng này nằm ở Account.RoleId.
        // Danh sách/hồ sơ của luồng này chỉ áp dụng cho nhân viên ĐÃ có Account.
        // ====================================================================
        #region Luồng 1 - Tài khoản

        /// <summary>Tạo nhân viên KÈM tài khoản đăng nhập. Role được gán vào Account, không phải Employee.</summary>
        public async Task<EmployeeAccountProfileDto> CreateWithAccountAsync(CreateEmployeeAccountDto dto, long createdBy)
        {
            var current = await LayThongTinHienTaiAsync(createdBy);

            // Manager tạo nhân viên thì luôn là Staff, không cho tự chọn role. Admin thì tùy chọn.
            if (current.RoleName == RoleManager)
            {
                dto.RoleId = await LayRoleIdStaffAsync();
            }

            string targetRoleName = await LayTenVaiTroAsync(dto.RoleId);
            KiemTraQuyenGanVaiTro(current.RoleName, targetRoleName);
            KiemTraPhamViChiNhanh(current, dto.BranchIds);
            KiemTraSoLuongChiNhanhTheoVaiTro(targetRoleName, dto.BranchIds);

            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Cùng 1 UpdateSessionId cho toàn bộ log phát sinh trong lần tạo này
                    var sessionId = Guid.NewGuid();

                    var employee = await TaoThongTinNhanVienAsync(dto.FullName, dto.Phone, dto.Gender, dto.BranchIds, createdBy, sessionId);

                    await _accountService.CreateAccountAsync(memberId: null, employeeId: employee.EmployeeId, roleId: dto.RoleId, phone: null, email: dto.LoginEmail, password: dto.Password);
                    GhiLogThayDoi(employee.EmployeeId, sessionId, "Vai trò", null, targetRoleName, createdBy);
                    GhiLogThayDoi(employee.EmployeeId, sessionId, "Email đăng nhập", null, dto.LoginEmail, createdBy);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await LayHoSoTaiKhoanAsync(employee.EmployeeId);
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
        /// Sửa thông tin cơ bản + vai trò của nhân viên thuộc luồng tài khoản.
        /// Vai trò giờ nằm ở Account.RoleId nên đổi role tức là đổi Account, không phải Employee.
        /// </summary>
        public async Task<bool> UpdateAccountInfoAsync(long employeeId, UpdateEmployeeAccountInfoDto dto, long currentEmployeeId)
        {
            var current = await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees
                .Include(e => e.Branches)
                .Include(e => e.Account)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null || employee.Account == null)
            {
                return false;
            }

            bool roleChanged = dto.RoleId != employee.Account.RoleId;

            // Manager không có quyền điều chỉnh vai trò của nhân viên dưới mọi hình thức.
            if (roleChanged && current.RoleName == RoleManager)
            {
                throw new UnauthorizedAccessException("Quản lý không có quyền thay đổi vai trò của nhân viên.");
            }

            string newRoleName = await LayTenVaiTroAsync(dto.RoleId);

            if (roleChanged)
            {
                KiemTraQuyenGanVaiTro(current.RoleName, newRoleName);
            }

            KiemTraPhamViChiNhanh(current, dto.BranchIds);
            KiemTraSoLuongChiNhanhTheoVaiTro(newRoleName, dto.BranchIds);

            bool phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var sessionId = Guid.NewGuid();

            CapNhatThongTinCoBan(employee, dto.FullName, dto.Phone, dto.Gender, dto.BranchIds, currentEmployeeId, sessionId, await LayDanhSachChiNhanhAsync(dto.BranchIds));

            if (roleChanged)
            {
                string oldRoleName = await LayTenVaiTroAsync(employee.Account.RoleId);
                await _accountService.ChangeRoleAsync(employee.Account.AccountId, dto.RoleId);
                GhiLogThayDoi(employeeId, sessionId, "Vai trò", oldRoleName, newRoleName, currentEmployeeId);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>Thêm tài khoản đăng nhập cho nhân viên chưa có tài khoản — bắt buộc chọn vai trò khi thêm.</summary>
        public async Task<EmployeeAccountProfileDto> AddAccountAsync(long employeeId, AddEmployeeAccountDto dto, long currentEmployeeId)
        {
            var current = await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var existingAccount = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (existingAccount != null)
            {
                throw new InvalidOperationException("Nhân viên đã có tài khoản đăng nhập.");
            }

            string targetRoleName = await LayTenVaiTroAsync(dto.RoleId);
            KiemTraQuyenGanVaiTro(current.RoleName, targetRoleName);

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sessionId = Guid.NewGuid();

                    await _accountService.CreateAccountAsync(memberId: null, employeeId: employeeId, roleId: dto.RoleId, phone: null, email: dto.LoginEmail, password: dto.Password);
                    GhiLogThayDoi(employeeId, sessionId, "Vai trò", null, targetRoleName, currentEmployeeId);
                    GhiLogThayDoi(employeeId, sessionId, "Email đăng nhập", null, dto.LoginEmail, currentEmployeeId);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await LayHoSoTaiKhoanAsync(employeeId);
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
        /// Không cần transaction/rollback vì chỉ có 1 lần SaveChangesAsync ở cuối.
        /// </summary>
        public async Task UpdateAccountAsync(long employeeId, UpdateEmployeeAccountDto dto, long currentEmployeeId)
        {
            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập.");
            }

            var sessionId = Guid.NewGuid();

            // Account.Username chính là email đăng nhập của nhân viên (Account không còn cột Email riêng)
            GhiLogThayDoi(employeeId, sessionId, "Email đăng nhập", account.Username, dto.LoginEmail, currentEmployeeId);

            await _accountService.UpdateAccountInfoAsync(accountId: account.AccountId, newPhone: null, newEmail: dto.LoginEmail);

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                await _accountService.ResetPasswordAsync(account.AccountId, dto.NewPassword);
                // Không bao giờ ghi mật khẩu vào log — chỉ đánh dấu sự kiện.
                GhiLogThayDoi(employeeId, sessionId, "Mật khẩu", null, "Đã đặt lại mật khẩu", currentEmployeeId);
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Khóa CHỈ tài khoản đăng nhập, KHÔNG đụng Employee.Status, KHÔNG đụng FaceID.
        /// Không cần transaction/rollback vì chỉ có 1 lần SaveChangesAsync ở cuối.
        /// </summary>
        public async Task LockAccountOnlyAsync(long employeeId, string reason, long currentEmployeeId)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));
            }

            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để khóa.");
            }

            var sessionId = Guid.NewGuid();

            await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);
            GhiLogThayDoi(employeeId, sessionId, "Trạng thái tài khoản", MoTaTrangThaiTaiKhoan(account.Status), MoTaTrangThaiTaiKhoan(AccountStatusSuspended), currentEmployeeId);
            GhiLogThayDoi(employeeId, sessionId, LogFieldLyDoKhoa, null, reason, currentEmployeeId);

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Mở khóa CHỈ tài khoản đăng nhập, KHÔNG đụng Employee.Status, KHÔNG đụng FaceID.
        /// Không cần transaction/rollback vì chỉ có 1 lần SaveChangesAsync ở cuối.
        /// </summary>
        public async Task UnlockAccountOnlyAsync(long employeeId, long currentEmployeeId)
        {
            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
            {
                throw new InvalidOperationException("Nhân viên chưa có tài khoản đăng nhập để mở khóa.");
            }

            var sessionId = Guid.NewGuid();

            await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);
            GhiLogThayDoi(employeeId, sessionId, "Trạng thái tài khoản", MoTaTrangThaiTaiKhoan(account.Status), MoTaTrangThaiTaiKhoan(AccountStatusActive), currentEmployeeId);

            await _context.SaveChangesAsync();
        }

        /// <summary>Xem hồ sơ dạng "tài khoản" — chỉ trả về nếu nhân viên đang có Account.</summary>
        public async Task<EmployeeAccountProfileDto?> GetAccountProfileAsync(long employeeId, long currentEmployeeId)
        {
            await KiemTraQuyenXemAsync(currentEmployeeId, employeeId);
            return await LayHoSoTaiKhoanAsync(employeeId);
        }

        private async Task<EmployeeAccountProfileDto?> LayHoSoTaiKhoanAsync(long employeeId)
        {
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
                    Role = e.Account!.Role.RoleName,
                    e.Account.AccountId,
                    LoginEmail = e.Account.Username,
                    AccountStatus = e.Account.Status,
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

            string? suspendReason = null;
            if (employee.AccountStatus == AccountStatusSuspended)
            {
                suspendReason = await LayLyDoKhoaGanNhatAsync(employeeId);
            }

            int? defaultBranchId = employee.Branches.Count > 0 ? employee.Branches[0].BranchId : null;

            return new EmployeeAccountProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Gender = employee.Gender,
                Status = employee.Status,
                Role = employee.Role,
                AccountId = employee.AccountId,
                // Tài khoản nhân viên chỉ đăng nhập bằng Email, Account không còn cột SĐT đăng nhập riêng
                LoginPhone = null,
                LoginEmail = employee.LoginEmail,
                AccountStatus = employee.AccountStatus,
                SuspendReason = suspendReason,
                Branches = employee.Branches,
                DefaultBranchId = defaultBranchId
            };
        }

        /// <summary>
        /// Danh sách TÀI KHOẢN: chỉ những nhân viên đang có Account (e.Account != null).
        /// Chỉ Admin/Manager được xem. Manager chỉ thấy nhân viên cùng chi nhánh và không thấy Admin.
        /// </summary>
        public async Task<List<EmployeeAccountListItemDto>> GetAccountListAsync(EmployeeAccountFilterDto filter, long currentEmployeeId)
        {
            var current = await LayThongTinHienTaiAsync(currentEmployeeId);

            bool laAdmin = current.RoleName == RoleAdmin;
            bool laManager = current.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem danh sách tài khoản.");
            }

            var query = _context.Employees.AsNoTracking().Where(e => e.Account != null);

            if (laManager)
            {
                if (current.BranchIds.Count == 0)
                {
                    return new List<EmployeeAccountListItemDto>();
                }

                query = query
                    .Where(e => e.Branches.Any(b => current.BranchIds.Contains(b.BranchId)))
                    .Where(e => e.Account!.Role.RoleName != RoleAdmin);
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
                // Tài khoản nhân viên không có SĐT riêng, chỉ có SĐT liên hệ của Employee
                string phoneKeyword = filter.Phone.Trim();
                query = query.Where(e => e.Phone != null && EF.Functions.Like(e.Phone, $"%{phoneKeyword}%"));
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
                    Role = e.Account!.Role.RoleName,
                    AccountId = e.Account.AccountId,
                    LoginPhone = null,
                    LoginEmail = e.Account.Username,
                    AccountStatus = e.Account.Status,
                    // Không tải lý do khóa ở danh sách (tránh subquery nặng cho từng dòng) —
                    // xem chi tiết qua GetAccountProfileAsync hoặc GetUpdateHistoryAsync.
                    SuspendReason = null,
                    Branches = e.Branches
                        .OrderBy(b => b.BranchId)
                        .Select(b => new EmployeeBranchDto { BranchId = b.BranchId, BranchName = b.BranchName })
                        .ToList()
                })
                .ToListAsync();

            return result;
        }

        #endregion

        // ====================================================================
        // LUỒNG 2: NHÂN VIÊN + FACEID
        // (Thông tin nhân viên + FaceID — KHÔNG đụng gì tới tài khoản đăng nhập)
        // Nhân viên luồng này CHƯA có Account => KHÔNG có vai trò (Role = null).
        // Danh sách của luồng này = phần còn lại: nhân viên CHƯA có Account.
        // ====================================================================
        #region Luồng 2 - Nhân viên + FaceID

        /// <summary>
        /// Tạo nhân viên KÈM FaceID (bắt buộc). Thuần info + faceid — không tài khoản, không vai trò.
        /// FaceID (đăng ký AWS + upload ảnh S3) xảy ra BÊN NGOÀI transaction DB — nếu bước lưu DB
        /// (SaveChanges/Commit) lỗi sau khi FaceID đã đăng ký xong, phải tự tay xóa face trên AWS
        /// và ảnh trên S3 (transaction.RollbackAsync() chỉ hoàn tác được phần SQL, không tự xóa
        /// được 2 cái đó).
        /// </summary>
        public async Task<EmployeeProfileDto> CreateWithFaceIdAsync(CreateEmployeeFaceIdDto dto, long createdBy)
        {
            var current = await LayThongTinHienTaiAsync(createdBy);

            // Nhân viên luồng FaceID không có vai trò -> chỉ cần kiểm tra phạm vi chi nhánh của Manager.
            KiemTraPhamViChiNhanh(current, dto.BranchIds);

            // ⚠️ Bắt buộc chạy qua CreateExecutionStrategy() vì đã bật MySqlRetryingExecutionStrategy.
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();

                // Khai báo trước try để catch còn lấy được — dùng để rollback FaceID/S3 nếu lỗi
                FaceDatum? faceDatumDaDangKy = null;

                try
                {
                    var sessionId = Guid.NewGuid();

                    var employee = await TaoThongTinNhanVienAsync(dto.FullName, dto.Phone, dto.Gender, dto.BranchIds, createdBy, sessionId);

                    string faceReason = dto.FaceIdReason ?? "Đăng ký FaceID khi tạo hồ sơ nhân viên";

                    faceDatumDaDangKy = await _faceIdService.RegisterFirstFaceAsync(memberId: null, employeeId: employee.EmployeeId, profileImage: dto.ProfileImage, reason: faceReason, performedBy: createdBy);
                    GhiLogThayDoi(employee.EmployeeId, sessionId, "FaceID", null, "Đã đăng ký", createdBy);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var profile = await LayHoSoNhanVienAsync(employee.EmployeeId);
                    return profile!;
                }
                catch
                {
                    await transaction.RollbackAsync();

                    // DB đã rollback, nhưng face trên AWS + ảnh trên S3 thì KHÔNG tự rollback
                    // theo DB được, nên phải tự tay xóa nếu FaceID đã lỡ đăng ký thành công
                    // trước khi lỗi xảy ra.
                    if (faceDatumDaDangKy != null)
                    {
                        await _faceIdService.XoaFaceIdDaDangKyAsync(faceDatumDaDangKy.FaceIdAws, faceDatumDaDangKy.ProfileImage);
                    }

                    throw;
                }
            });
        }

        /// <summary>Sửa thông tin cơ bản của nhân viên thuộc luồng FaceID — không đụng tài khoản, không có vai trò.</summary>
        public async Task<bool> UpdateInfoAsync(long employeeId, UpdateEmployeeInfoDto dto, long currentEmployeeId)
        {
            var current = await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var employee = await _context.Employees
                .Include(e => e.Branches)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

            if (employee == null)
            {
                return false;
            }

            KiemTraPhamViChiNhanh(current, dto.BranchIds);

            bool phoneTaken = await _context.Employees
                .AnyAsync(e => e.Phone == dto.Phone && e.EmployeeId != employeeId);
            if (phoneTaken)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var sessionId = Guid.NewGuid();

            CapNhatThongTinCoBan(employee, dto.FullName, dto.Phone, dto.Gender, dto.BranchIds, currentEmployeeId, sessionId, await LayDanhSachChiNhanhAsync(dto.BranchIds));

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Đăng ký/cập nhật FaceID cho nhân viên.
        /// Không cần transaction/rollback DB vì chỉ có 1 lần SaveChangesAsync ở cuối. Nếu AWS/S3
        /// lỗi thì đã được xử lý sẵn ngay trong FaceIdService.UpdateFaceAsync (rollback face mới
        /// vừa đăng ký nếu upload ảnh thất bại), nên ở đây không cần lo thêm.
        /// </summary>
        public async Task<FaceDatum> UpdateFaceAsync(long employeeId, UpdateEmployeeFaceIdDto dto, long currentEmployeeId)
        {
            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

            var faceDatum = await _faceIdService.UpdateFaceAsync(memberId: null, employeeId: employeeId, profileImage: dto.ProfileImage, reason: dto.Reason, performedBy: currentEmployeeId);

            // FaceIdService tự có lịch sử riêng (FaceUpdateHistory); ở đây chỉ ghi thêm
            // 1 dòng đối chiếu chéo vào nhật ký chung của nhân viên cho dễ tra cứu.
            GhiLogThayDoi(employeeId, Guid.NewGuid(), "FaceID", null, "Đã cập nhật", currentEmployeeId);
            await _context.SaveChangesAsync();

            return faceDatum;
        }

        public async Task<List<MemberUpdateSessionResponse>> GetFaceHistoryAsync(long employeeId, long currentEmployeeId)
        {
            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);
            return await _faceIdService.GetFaceHistoryAsync(memberId: null, employeeId: employeeId);
        }

        /// <summary>
        /// Xem hồ sơ dạng "nhân viên" (info + FaceID). Role sẽ là null nếu nhân viên chưa có Account,
        /// hoặc có giá trị nếu tình cờ được gọi cho nhân viên thuộc luồng tài khoản.
        /// </summary>
        public async Task<EmployeeProfileDto?> GetProfileAsync(long employeeId, long currentEmployeeId)
        {
            await KiemTraQuyenXemAsync(currentEmployeeId, employeeId);
            return await LayHoSoNhanVienAsync(employeeId);
        }

        private async Task<EmployeeProfileDto?> LayHoSoNhanVienAsync(long employeeId)
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
                    Role = e.Account != null ? e.Account.Role.RoleName : null,
                    HasFaceId = e.FaceDatumEmployee != null,
                    FaceProfileImage = e.FaceDatumEmployee != null ? e.FaceDatumEmployee.ProfileImage : null,
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

            int? defaultBranchId = employee.Branches.Count > 0 ? employee.Branches[0].BranchId : null;

            return new EmployeeProfileDto
            {
                EmployeeId = employee.EmployeeId,
                FullName = employee.FullName,
                Phone = employee.Phone,
                Gender = employee.Gender,
                Status = employee.Status,
                Role = employee.Role, // null nếu nhân viên chưa có Account (luồng FaceID)
                HasFaceId = employee.HasFaceId,
                FaceProfileImage = employee.FaceProfileImage,
                Branches = employee.Branches,
                DefaultBranchId = defaultBranchId
            };
        }

        /// <summary>
        /// Danh sách NHÂN VIÊN: phần còn lại — những nhân viên CHƯA có Account (e.Account == null).
        /// Các nhân viên này không có vai trò. Chỉ Admin/Manager được xem. Manager chỉ thấy nhân
        /// viên cùng chi nhánh (và tất nhiên không thể là Admin/Manager vì nhóm này không có Role).
        /// </summary>
        public async Task<List<EmployeeListItemDto>> GetListAsync(EmployeeFilterDto filter, long currentEmployeeId)
        {
            var current = await LayThongTinHienTaiAsync(currentEmployeeId);

            bool laAdmin = current.RoleName == RoleAdmin;
            bool laManager = current.RoleName == RoleManager;

            if (!laAdmin && !laManager)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem danh sách nhân viên.");
            }

            var query = _context.Employees.AsNoTracking().Where(e => e.Account == null);

            if (laManager)
            {
                if (current.BranchIds.Count == 0)
                {
                    return new List<EmployeeListItemDto>();
                }

                query = query.Where(e => e.Branches.Any(b => current.BranchIds.Contains(b.BranchId)));
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
                    Role = null, // nhân viên luồng FaceID chưa có Account nên không có vai trò
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

        #endregion

        // ====================================================================
        // HẠ TẦNG DÙNG CHUNG
        // (không phải DTO nghiệp vụ của luồng nào — khóa toàn diện cả 2 phía,
        // lịch sử cập nhật chung, và các helper tạo/sửa dùng nội bộ)
        // ====================================================================
        #region Hạ tầng dùng chung

        /// <summary>
        /// Lấy lịch sử cập nhật CHUNG của nhân viên (bảng employee_update_logs) — bao gồm sửa thông
        /// tin cá nhân, đổi vai trò/chi nhánh, tạo/sửa tài khoản đăng nhập, khóa/mở khóa, FaceID...
        /// Các dòng log cùng 1 lần Lưu được gộp lại theo UpdateSessionId thành 1 "sự kiện",
        /// sắp xếp mới nhất lên trước.
        /// </summary>
        public async Task<List<EmployeeUpdateHistoryItemDto>> GetUpdateHistoryAsync(long employeeId, long currentEmployeeId)
        {
            await KiemTraQuyenXemAsync(currentEmployeeId, employeeId);

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

            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

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

                    DatTrangThaiNhanVien(employee, EmployeeStatusInactive, currentEmployeeId, sessionId);
                    GhiLogThayDoi(employeeId, sessionId, LogFieldLyDoKhoa, null, reason, currentEmployeeId);

                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusSuspended)
                    {
                        await _accountService.LockAccountAsync(account.AccountId, reason, currentEmployeeId);

                        GhiLogThayDoi(employeeId, sessionId, "Trạng thái tài khoản", MoTaTrangThaiTaiKhoan(account.Status), MoTaTrangThaiTaiKhoan(AccountStatusSuspended), currentEmployeeId);

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
            await KiemTraQuyenThaoTacAsync(currentEmployeeId, employeeId);

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

                    DatTrangThaiNhanVien(employee, EmployeeStatusActive, currentEmployeeId, sessionId);
                    await _context.SaveChangesAsync();

                    var account = await _accountService.GetByEmployeeIdAsync(employeeId);

                    if (account != null && account.Status != AccountStatusActive)
                    {
                        await _accountService.UnlockAccountAsync(account.AccountId, currentEmployeeId);

                        GhiLogThayDoi(employeeId, sessionId, "Trạng thái tài khoản", MoTaTrangThaiTaiKhoan(account.Status), MoTaTrangThaiTaiKhoan(AccountStatusActive), currentEmployeeId);

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

        /// <summary>
        /// Helper tạo Employee dùng chung cho cả 2 luồng. KHÔNG còn tham số role — vai trò (nếu có)
        /// được luồng gọi (CreateWithAccountAsync) xử lý riêng sau khi tạo Account.
        /// </summary>
        private async Task<Employee> TaoThongTinNhanVienAsync(
            string fullName, string phone, string gender, List<int> branchIds,
            long createdBy, Guid sessionId)
        {
            bool phoneExists = await _context.Employees.AnyAsync(e => e.Phone == phone);
            if (phoneExists)
            {
                throw new InvalidOperationException("Số điện thoại liên hệ đã được sử dụng bởi nhân viên khác.");
            }

            var branches = await LayDanhSachChiNhanhAsync(branchIds);

            var employee = new Employee
            {
                FullName = fullName,
                Phone = phone,
                Gender = gender,
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

            GhiLogThayDoi(employee.EmployeeId, sessionId, "Họ tên", null, employee.FullName, createdBy);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Số điện thoại", null, employee.Phone, createdBy);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Giới tính", null, employee.Gender, createdBy);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Trạng thái nhân viên", null, MoTaTrangThaiNhanVien(EmployeeStatusActive), createdBy);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Chi nhánh", null, GhepTenChiNhanh(branches), createdBy);

            return employee;
        }

        /// <summary>Helper sửa thông tin cơ bản (không role) dùng chung cho cả 2 luồng — ghi log rồi gán giá trị mới, không SaveChanges (caller tự gọi).</summary>
        private void CapNhatThongTinCoBan(
            Employee employee, string fullName, string phone, string gender, List<int> branchIds,
            long currentEmployeeId, Guid sessionId, List<Branch> newBranches)
        {
            var oldBranchIds = employee.Branches.Select(b => b.BranchId).ToList();
            var newBranchIds = newBranches.Select(b => b.BranchId).ToList();

            GhiLogThayDoi(employee.EmployeeId, sessionId, "Họ tên", employee.FullName, fullName, currentEmployeeId);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Số điện thoại", employee.Phone, phone, currentEmployeeId);
            GhiLogThayDoi(employee.EmployeeId, sessionId, "Giới tính", employee.Gender, gender, currentEmployeeId);

            if (!SoSanhDanhSachChiNhanh(oldBranchIds, newBranchIds))
            {
                string oldBranchNames = GhepTenChiNhanh(employee.Branches);
                string newBranchNames = GhepTenChiNhanh(newBranches);
                GhiLogThayDoi(employee.EmployeeId, sessionId, "Chi nhánh", oldBranchNames, newBranchNames, currentEmployeeId);
            }

            employee.FullName = fullName;
            employee.Phone = phone;
            employee.Gender = gender;
            employee.UpdatedAt = DateTime.UtcNow;

            employee.Branches.Clear();
            foreach (var branch in newBranches)
            {
                employee.Branches.Add(branch);
            }
        }

        private async Task<List<Branch>> LayDanhSachChiNhanhAsync(List<int> branchIds)
        {
            var distinctBranchIds = branchIds.Distinct().ToList();
            return await _context.Branches
                .Where(b => distinctBranchIds.Contains(b.BranchId))
                .ToListAsync();
        }

        /// <summary>Đổi Employee.Status + ghi log, không SaveChanges (caller tự gọi).</summary>
        private void DatTrangThaiNhanVien(Employee employee, string newStatus, long performedBy, Guid sessionId)
        {
            string oldStatus = employee.Status;
            employee.Status = newStatus;
            employee.UpdatedAt = DateTime.UtcNow;

            GhiLogThayDoi(employee.EmployeeId, sessionId, "Trạng thái nhân viên", MoTaTrangThaiNhanVien(oldStatus), MoTaTrangThaiNhanVien(newStatus), performedBy);
        }

        /// <summary>Lấy lý do khóa gần nhất được ghi trong lịch sử cập nhật của nhân viên (dùng cho hồ sơ chi tiết).</summary>
        private async Task<string?> LayLyDoKhoaGanNhatAsync(long employeeId)
        {
            return await _context.EmployeeUpdateLogs
                .AsNoTracking()
                .Where(l => l.EmployeeId == employeeId && l.FieldName == LogFieldLyDoKhoa)
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => l.NewValue)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Ghi 1 dòng log thay đổi cho 1 trường dữ liệu của nhân viên. Không ghi nếu giá trị
        /// không đổi. Không tự SaveChanges — caller gọi khi hoàn tất thao tác.
        /// </summary>
        private void GhiLogThayDoi(long employeeId, Guid sessionId, string fieldName, string? oldValue, string? newValue, long? performedBy)
        {
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
        private static string GhepTenChiNhanh(IEnumerable<Branch> branches)
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
        private static string MoTaTrangThaiTaiKhoan(string? status)
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
        private static string MoTaTrangThaiNhanVien(string status)
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
        private static bool SoSanhDanhSachChiNhanh(List<int> a, List<int> b)
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

        /// <summary>Lấy thông tin người đang thao tác. Bắt buộc phải có Account (vì đã đăng nhập) mới có RoleName.</summary>
        private async Task<CurrentEmployeeInfo> LayThongTinHienTaiAsync(long employeeId)
        {
            var current = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == employeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
                .FirstOrDefaultAsync();

            if (current == null || current.RoleName == null)
            {
                throw new UnauthorizedAccessException("Không tìm thấy tài khoản.");
            }

            return new CurrentEmployeeInfo
            {
                RoleName = current.RoleName,
                BranchIds = current.BranchIds
            };
        }

        private async Task<string> LayTenVaiTroAsync(long roleId)
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
        private async Task<long> LayRoleIdStaffAsync()
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
        private static void KiemTraQuyenGanVaiTro(string currentRoleName, string targetRoleName)
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
        private static void KiemTraPhamViChiNhanh(CurrentEmployeeInfo current, List<int> branchIds)
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
        private static void KiemTraSoLuongChiNhanhTheoVaiTro(string roleName, List<int> branchIds)
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
        ///   Nếu target chưa có Account (không có vai trò) thì mặc định không phải Admin/Manager.
        /// </summary>
        private async Task<CurrentEmployeeInfo> KiemTraQuyenThaoTacAsync(long currentEmployeeId, long targetEmployeeId)
        {
            var current = await LayThongTinHienTaiAsync(currentEmployeeId);

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
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
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
        /// Kiểm tra current có được XEM thông tin target không (nhẹ hơn KiemTraQuyenThaoTacAsync):
        /// - Chỉ Admin/Manager được xem, Staff không được xem.
        /// - Admin: xem tất cả.
        /// - Manager: chỉ xem nhân viên cùng chi nhánh, KHÔNG được xem Admin.
        /// - Riêng: tự xem hồ sơ của chính mình thì luôn được phép, kể cả Staff.
        /// </summary>
        private async Task<CurrentEmployeeInfo> KiemTraQuyenXemAsync(long currentEmployeeId, long targetEmployeeId)
        {
            var current = await LayThongTinHienTaiAsync(currentEmployeeId);

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

            var target = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == targetEmployeeId)
                .Select(e => new
                {
                    RoleName = e.Account != null ? e.Account.Role.RoleName : null,
                    BranchIds = e.Branches.Select(b => b.BranchId).ToList()
                })
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

        #endregion
    }
}