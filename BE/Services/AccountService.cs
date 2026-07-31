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
        public async Task<Account> CreateAccountAsync(long? memberId, long? employeeId, string? phone, string? email, string password)
        {
            CheckOwner(memberId, employeeId);

            if (memberId != null)
            {
                // Tài khoản khách hàng: bắt buộc có phone, không được có email
                if (string.IsNullOrWhiteSpace(phone))
                {
                    throw new ArgumentException("Tài khoản khách hàng bắt buộc phải có Số điện thoại.", nameof(phone));
                }
                if (!string.IsNullOrWhiteSpace(email))
                {
                    throw new ArgumentException("Tài khoản khách hàng chỉ đăng nhập bằng Số điện thoại, không được cung cấp Email.", nameof(email));
                }
                email = null;
            }
            else
            {
                // Tài khoản nhân viên: bắt buộc có email, không được có phone
                if (string.IsNullOrWhiteSpace(email))
                {
                    throw new ArgumentException("Tài khoản nhân viên bắt buộc phải có Email.", nameof(email));
                }
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    throw new ArgumentException("Tài khoản nhân viên chỉ đăng nhập bằng Email, không được cung cấp Số điện thoại.", nameof(phone));
                }
                phone = null;
            }

            await CheckPhoneAndEmailAsync(phone, email, null);

            DateTime now = DateTime.UtcNow;

            Account newAccount = new Account();
            newAccount.MemberId = memberId;
            newAccount.EmployeeId = employeeId;
            newAccount.Phone = phone;
            newAccount.Email = email;
            newAccount.PasswordHash = PasswordHelper.HashPassword(password);
            newAccount.Status = STATUS_ACTIVE;
            newAccount.SuspendReason = null;
            newAccount.CreatedAt = now;
            newAccount.UpdatedAt = now;

            _context.Accounts.Add(newAccount);
            await _context.SaveChangesAsync();

            return newAccount;
        }

        // Cập nhật số điện thoại hoặc email của tài khoản
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
                    await CheckPhoneAndEmailAsync(newPhone, null, accountId);
                    account.Phone = newPhone;
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
                    await CheckPhoneAndEmailAsync(null, newEmail, accountId);
                    account.Email = newEmail;
                }
            }

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
            account.SuspendReason = reason;
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
            account.SuspendReason = null;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return account;
        }

        // Tìm tài khoản theo số điện thoại (đăng nhập khách hàng)
        public async Task<Account?> GetByPhoneAsync(string phone)
        {
            Account? account = await _context.Accounts
                .Include(a => a.Member)
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Phone == phone);

            return account;
        }

        // Tìm tài khoản theo email (đăng nhập nhân viên)
        public async Task<Account?> GetByEmailAsync(string email)
        {
            Account? account = await _context.Accounts
                .Include(a => a.Member)
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Email == email);

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

        // Kiểm tra số điện thoại / email đã tồn tại chưa
        private async Task CheckPhoneAndEmailAsync(string? phone, string? email, long? excludeAccountId)
        {
            bool noPhone = string.IsNullOrWhiteSpace(phone);
            bool noEmail = string.IsNullOrWhiteSpace(email);

            if (noPhone && noEmail)
            {
                throw new ArgumentException("Phải cung cấp ít nhất Số điện thoại hoặc Email để đăng nhập.");
            }

            if (!noPhone)
            {
                bool phoneTaken = await _context.Accounts
                    .AnyAsync(a => a.Phone == phone && a.AccountId != excludeAccountId);

                if (phoneTaken)
                {
                    throw new InvalidOperationException($"Số điện thoại '{phone}' đã được sử dụng.");
                }
            }

            if (!noEmail)
            {
                bool emailTaken = await _context.Accounts
                    .AnyAsync(a => a.Email == email && a.AccountId != excludeAccountId);

                if (emailTaken)
                {
                    throw new InvalidOperationException($"Email '{email}' đã được sử dụng.");
                }
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