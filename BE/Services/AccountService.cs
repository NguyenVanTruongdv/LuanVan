using BE.Data;
using BE.Helpers;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class AccountService
    {
        private static class AccountStatus
        {
            public const string Active = "Active";
            public const string Suspended = "Suspended";
        }

        private readonly GymManagementContext _context;

        public AccountService(GymManagementContext context)
        {
            _context = context;
        }

        // ------------------------------------------------------------------
        // Tạo tài khoản
        // ------------------------------------------------------------------

        /// <summary>
        /// Tạo tài khoản cho member HOẶC employee. Truyền đúng MỘT trong hai: memberId hoặc employeeId.
        /// </summary>
        public async Task<Account> CreateAccountAsync(
            long? memberId,
            long? employeeId,
            string phone,
            string? email,
            string password)
        {
            ValidateOwner(memberId, employeeId);
            await EnsurePhoneAndEmailAvailableAsync(phone, email, excludeAccountId: null);

            var now = DateTime.UtcNow;

            var account = new Account
            {
                MemberId = memberId,
                EmployeeId = employeeId,
                Phone = phone,
                Email = email,
                PasswordHash = PasswordHelper.HashPassword(password),
                Status = AccountStatus.Active,
                SuspendReason = null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();

            return account;
        }

        // ------------------------------------------------------------------
        // Sửa thông tin tài khoản (phone / email)
        // ------------------------------------------------------------------

        /// <summary>
        /// Cập nhật số điện thoại và/hoặc email của tài khoản. Truyền null cho field không muốn đổi.
        /// </summary>
        public async Task<Account> UpdateAccountInfoAsync(
            long accountId,
            string? newPhone,
            string? newEmail)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            var phoneToCheck = newPhone ?? account.Phone;
            var emailToCheck = newEmail ?? account.Email;
            await EnsurePhoneAndEmailAvailableAsync(phoneToCheck, emailToCheck, excludeAccountId: accountId);

            if (newPhone != null)
                account.Phone = newPhone;

            if (newEmail != null)
                account.Email = newEmail;

            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return account;
        }

        // ------------------------------------------------------------------
        // Đổi mật khẩu
        // ------------------------------------------------------------------

        /// <summary>
        /// Đổi mật khẩu, yêu cầu xác thực mật khẩu cũ.
        /// </summary>
        public async Task ChangePasswordAsync(long accountId, string oldPassword, string newPassword)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            if (!PasswordHelper.VerifyPassword(oldPassword, account.PasswordHash))
                throw new InvalidOperationException("Mật khẩu cũ không đúng.");

            account.PasswordHash = PasswordHelper.HashPassword(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Đặt lại mật khẩu (dùng cho admin/quên mật khẩu) — không cần mật khẩu cũ.
        /// Thu hồi hết refresh token sau khi reset để đăng xuất khỏi mọi thiết bị.
        /// </summary>
        public async Task ResetPasswordAsync(long accountId, string newPassword)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            account.PasswordHash = PasswordHelper.HashPassword(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            await RevokeAllRefreshTokensAsync(accountId);
            await _context.SaveChangesAsync();
        }

        // ------------------------------------------------------------------
        // Khóa / mở khóa tài khoản
        // ------------------------------------------------------------------

        /// <summary>
        /// Khóa tài khoản — bắt buộc có lý do. Thu hồi refresh token để đăng xuất ngay lập tức.
        /// performedBy: employeeId của nhân viên thực hiện thao tác (dùng để ghi log).
        /// </summary>
        public async Task<Account> LockAccountAsync(long accountId, string reason, long performedBy)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));

            var account = await GetAccountOrThrowAsync(accountId);

            if (account.Status == AccountStatus.Suspended)
                throw new InvalidOperationException("Tài khoản đã bị khóa từ trước.");

            var oldStatus = account.Status;

            account.Status = AccountStatus.Suspended;
            account.SuspendReason = reason;
            account.UpdatedAt = DateTime.UtcNow;

            AddOwnerStatusLog(account, oldStatus, AccountStatus.Suspended, performedBy);

            await RevokeAllRefreshTokensAsync(accountId);
            await _context.SaveChangesAsync();

            return account;
        }

        /// <summary>
        /// Mở khóa tài khoản.
        /// performedBy: employeeId của nhân viên thực hiện thao tác (dùng để ghi log).
        /// </summary>
        public async Task<Account> UnlockAccountAsync(long accountId, long performedBy)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            if (account.Status == AccountStatus.Active)
                throw new InvalidOperationException("Tài khoản đang hoạt động, không cần mở khóa.");

            var oldStatus = account.Status;

            account.Status = AccountStatus.Active;
            account.SuspendReason = null;
            account.UpdatedAt = DateTime.UtcNow;

            AddOwnerStatusLog(account, oldStatus, AccountStatus.Active, performedBy);

            await _context.SaveChangesAsync();

            return account;
        }

        // ------------------------------------------------------------------
        // Truy vấn
        // ------------------------------------------------------------------

        public async Task<Account?> GetByPhoneAsync(string phone)
        {
            return await _context.Accounts
                .Include(a => a.Member)
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Phone == phone);
        }

        public async Task<Account?> GetByMemberIdAsync(long memberId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.MemberId == memberId);
        }

        public async Task<Account?> GetByEmployeeIdAsync(long employeeId)
        {
            return await _context.Accounts.FirstOrDefaultAsync(a => a.EmployeeId == employeeId);
        }

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        private static void ValidateOwner(long? memberId, long? employeeId)
        {
            var hasMember = memberId.HasValue;
            var hasEmployee = employeeId.HasValue;

            if (hasMember == hasEmployee)
                throw new ArgumentException("Phải cung cấp đúng một trong hai: memberId hoặc employeeId.");
        }

        private async Task<Account> GetAccountOrThrowAsync(long accountId)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountId == accountId);

            if (account == null)
                throw new KeyNotFoundException($"Không tìm thấy tài khoản có Id = {accountId}.");

            return account;
        }

        private async Task EnsurePhoneAndEmailAvailableAsync(string phone, string? email, long? excludeAccountId)
        {
            var phoneTaken = await _context.Accounts
                .AnyAsync(a => a.Phone == phone && a.AccountId != excludeAccountId);

            if (phoneTaken)
                throw new InvalidOperationException($"Số điện thoại '{phone}' đã được sử dụng.");

            if (!string.IsNullOrEmpty(email))
            {
                var emailTaken = await _context.Accounts
                    .AnyAsync(a => a.Email == email && a.AccountId != excludeAccountId);

                if (emailTaken)
                    throw new InvalidOperationException($"Email '{email}' đã được sử dụng.");
            }
        }

        private async Task RevokeAllRefreshTokensAsync(long accountId)
        {
            var now = DateTime.UtcNow;

            var tokens = await _context.RefreshTokens
                .Where(t => t.AccountId == accountId && t.RevokedAt == null)
                .ToListAsync();

            foreach (var token in tokens)
                token.RevokedAt = now;
        }

        /// <summary>
        /// Ghi log thay đổi Status vào EmployeeUpdateLog hoặc MemberUpdateLog, tùy tài khoản thuộc ai.
        /// </summary>
        private void AddOwnerStatusLog(Account account, string oldStatus, string newStatus, long performedBy)
        {
            var now = DateTime.UtcNow;

            if (account.EmployeeId.HasValue)
            {
                _context.EmployeeUpdateLogs.Add(new EmployeeUpdateLog
                {
                    UpdateSessionId = Guid.NewGuid(),
                    EmployeeId = account.EmployeeId.Value,
                    FieldName = "AccountStatus",
                    OldValue = oldStatus,
                    NewValue = newStatus,
                    UpdatedByEmployeeId = performedBy,
                    UpdatedAt = now
                });
            }
            else if (account.MemberId.HasValue)
            {
                _context.MemberUpdateLogs.Add(new MemberUpdateLog
                {
                    UpdateSessionId = Guid.NewGuid(),
                    MemberId = account.MemberId.Value,
                    FieldName = "AccountStatus",
                    OldValue = oldStatus,
                    NewValue = newStatus,
                    UpdatedByEmployeeId = performedBy,
                    UpdatedAt = now
                });
            }
        }
    }
}