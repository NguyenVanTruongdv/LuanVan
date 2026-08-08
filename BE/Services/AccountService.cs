using BE.Data;
using BE.Helpers;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class AccountService
    {
        // Trạng thái tài khoản
        private const string STATUS_ACTIVE = "Active";
        private const string STATUS_SUSPENDED = "Suspended";

        private readonly GymManagementContext _context;

        public AccountService(GymManagementContext context)
        {
            _context = context;
        }

        // Tạo tài khoản mới cho member hoặc employee
        // roleId: BẮT BUỘC vì accounts.role_id giờ là NOT NULL (FK -> role.role_id).
        //         Với tài khoản hội viên, roleId phải là role_id của role 'Member'.
        //         Với tài khoản nhân viên, roleId là role_id tương ứng (Staff/Technician/Manager/Admin).
        public async Task<Account> CreateAccountAsync(long? memberId, long? employeeId, long roleId, string? phone, string? email, string password)
        {
            CheckOwner(memberId, employeeId);

            string username;

            if (memberId != null)
            {
                // Tài khoản khách hàng: đăng nhập bằng Số điện thoại -> username = phone
                if (string.IsNullOrWhiteSpace(phone))
                {
                    throw new ArgumentException("Tài khoản khách hàng bắt buộc phải có Số điện thoại.", nameof(phone));
                }
                if (!string.IsNullOrWhiteSpace(email))
                {
                    throw new ArgumentException("Tài khoản khách hàng chỉ đăng nhập bằng Số điện thoại, không được cung cấp Email.", nameof(email));
                }
                username = phone;
            }
            else
            {
                // Tài khoản nhân viên: đăng nhập bằng Email -> username = email
                if (string.IsNullOrWhiteSpace(email))
                {
                    throw new ArgumentException("Tài khoản nhân viên bắt buộc phải có Email.", nameof(email));
                }
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    throw new ArgumentException("Tài khoản nhân viên chỉ đăng nhập bằng Email, không được cung cấp Số điện thoại.", nameof(phone));
                }
                username = email;
            }

            await CheckUsernameAsync(username, null);
            await CheckRoleExistsAsync(roleId);

            DateTime now = DateTime.UtcNow;

            Account newAccount = new Account();
            newAccount.MemberId = memberId;
            newAccount.EmployeeId = employeeId;
            newAccount.Username = username;
            newAccount.RoleId = roleId;
            newAccount.PasswordHash = PasswordHelper.HashPassword(password);
            newAccount.Status = STATUS_ACTIVE;
            newAccount.CreatedAt = now;
            newAccount.UpdatedAt = now;

            _context.Accounts.Add(newAccount);
            await _context.SaveChangesAsync();

            return newAccount;
        }

        // Cập nhật số điện thoại (hội viên) hoặc email (nhân viên) của tài khoản
        // -> thực chất là cập nhật cột username duy nhất.
        public async Task<Account> UpdateAccountInfoAsync(long accountId, string? newPhone, string? newEmail)
        {
            Account account = await FindAccountAsync(accountId);

            if (account.MemberId != null)
            {
                // Tài khoản khách hàng
                if (newEmail != null)
                {
                    throw new ArgumentException("Tài khoản khách hàng không sử dụng Email, không thể cập nhật.", nameof(newEmail));
                }

                if (newPhone != null)
                {
                    if (string.IsNullOrWhiteSpace(newPhone))
                    {
                        throw new ArgumentException("Tài khoản khách hàng bắt buộc phải có Số điện thoại.", nameof(newPhone));
                    }
                    await CheckUsernameAsync(newPhone, accountId);
                    account.Username = newPhone;
                }
            }
            else
            {
                // Tài khoản nhân viên
                if (newPhone != null)
                {
                    throw new ArgumentException("Tài khoản nhân viên không sử dụng Số điện thoại, không thể cập nhật.", nameof(newPhone));
                }

                if (newEmail != null)
                {
                    if (string.IsNullOrWhiteSpace(newEmail))
                    {
                        throw new ArgumentException("Tài khoản nhân viên bắt buộc phải có Email.", nameof(newEmail));
                    }
                    await CheckUsernameAsync(newEmail, accountId);
                    account.Username = newEmail;
                }
            }

            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return account;
        }

        // Đổi vai trò (role) của tài khoản — nghiệp vụ mới vì role giờ nằm ở account, không ở employee
        public async Task<Account> ChangeRoleAsync(long accountId, long newRoleId)
        {
            Account account = await FindAccountAsync(accountId);

            await CheckRoleExistsAsync(newRoleId);

            account.RoleId = newRoleId;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return account;
        }

        // Đổi mật khẩu (người dùng tự đổi, cần mật khẩu cũ)
        public async Task ChangePasswordAsync(long accountId, string oldPassword, string newPassword)
        {
            Account account = await FindAccountAsync(accountId);

            bool isCorrect = PasswordHelper.VerifyPassword(oldPassword, account.PasswordHash);
            if (isCorrect == false)
            {
                throw new InvalidOperationException("Mật khẩu cũ không đúng.");
            }

            account.PasswordHash = PasswordHelper.HashPassword(newPassword);
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // Đặt lại mật khẩu (admin reset, không cần mật khẩu cũ)
        public async Task ResetPasswordAsync(long accountId, string newPassword)
        {
            Account account = await FindAccountAsync(accountId);

            account.PasswordHash = PasswordHelper.HashPassword(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            await RevokeAllTokensAsync(accountId);
            await _context.SaveChangesAsync();
        }

        // Khóa tài khoản
        // LƯU Ý: accounts.suspend_reason đã bị xoá khỏi DB, nên "reason" ở đây
        // KHÔNG còn được lưu vào bảng accounts. Nếu cần lưu lý do khóa, hãy ghi
        // vào member_update_logs (hội viên) hoặc employee_update_logs (nhân viên)
        // ở tầng gọi service này — reason vẫn bắt buộc nhập để phục vụ việc đó.
        public async Task<Account> LockAccountAsync(long accountId, string reason, long performedBy)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));
            }

            Account account = await FindAccountAsync(accountId);

            if (account.Status == STATUS_SUSPENDED)
            {
                throw new InvalidOperationException("Tài khoản đã bị khóa từ trước.");
            }

            account.Status = STATUS_SUSPENDED;
            account.UpdatedAt = DateTime.UtcNow;

            await RevokeAllTokensAsync(accountId);
            await _context.SaveChangesAsync();

            return account;
        }

        // Mở khóa tài khoản
        public async Task<Account> UnlockAccountAsync(long accountId, long performedBy)
        {
            Account account = await FindAccountAsync(accountId);

            if (account.Status == STATUS_ACTIVE)
            {
                throw new InvalidOperationException("Tài khoản đang hoạt động, không cần mở khóa.");
            }

            account.Status = STATUS_ACTIVE;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return account;
        }

        // Tìm tài khoản theo số điện thoại (đăng nhập khách hàng) -> tra theo Username
        public async Task<Account?> GetByPhoneAsync(string phone)
        {
            return await GetByUsernameAsync(phone);
        }

        // Tìm tài khoản theo email (đăng nhập nhân viên) -> tra theo Username
        public async Task<Account?> GetByEmailAsync(string email)
        {
            return await GetByUsernameAsync(email);
        }

        // Tìm tài khoản theo username (dùng chung cho cả 2 loại đăng nhập)
        public async Task<Account?> GetByUsernameAsync(string username)
        {
            Account? account = await _context.Accounts
                .Include(a => a.Member)
                .Include(a => a.Employee)
                .Include(a => a.Role)
                .FirstOrDefaultAsync(a => a.Username == username);

            return account;
        }

        public async Task<Account?> GetByMemberIdAsync(long memberId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);
        }

        public async Task<Account?> GetByEmployeeIdAsync(long employeeId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.EmployeeId == employeeId);
        }


        // Kiểm tra: phải có đúng 1 trong 2 (memberId hoặc employeeId)
        private static void CheckOwner(long? memberId, long? employeeId)
        {
            bool hasMember = memberId != null;
            bool hasEmployee = employeeId != null;

            if (hasMember == hasEmployee)
            {
                throw new ArgumentException("Phải cung cấp đúng một trong hai: memberId hoặc employeeId.");
            }
        }

        // Tìm tài khoản theo id, nếu không có thì ném lỗi
        private async Task<Account> FindAccountAsync(long accountId)
        {
            Account? account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountId == accountId);

            if (account == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy tài khoản có Id = {accountId}.");
            }

            return account;
        }

        // Kiểm tra username (số điện thoại hoặc email) đã tồn tại chưa
        private async Task CheckUsernameAsync(string username, long? excludeAccountId)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                throw new ArgumentException("Phải cung cấp Số điện thoại hoặc Email để đăng nhập.", nameof(username));
            }

            bool usernameTaken = await _context.Accounts
                .AnyAsync(a => a.Username == username && a.AccountId != excludeAccountId);

            if (usernameTaken)
            {
                throw new InvalidOperationException($"Số điện thoại/Email '{username}' đã được sử dụng.");
            }
        }

        // Kiểm tra role_id có tồn tại trong bảng role không
        private async Task CheckRoleExistsAsync(long roleId)
        {
            bool roleExists = await _context.Roles.AnyAsync(r => r.RoleId == roleId);

            if (!roleExists)
            {
                throw new ArgumentException($"Không tìm thấy vai trò (role) có Id = {roleId}.", nameof(roleId));
            }
        }

        // Thu hồi tất cả refresh token còn hiệu lực của tài khoản
        private async Task RevokeAllTokensAsync(long accountId)
        {
            DateTime now = DateTime.UtcNow;

            List<RefreshToken> tokenList = await _context.RefreshTokens
                .Where(t => t.AccountId == accountId && t.RevokedAt == null)
                .ToListAsync();

            foreach (RefreshToken token in tokenList)
            {
                token.RevokedAt = now;
            }
        }
    }
}