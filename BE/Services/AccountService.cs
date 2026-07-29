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
        /// Quy tắc đăng nhập theo loại tài khoản:
        ///   - Member (khách hàng): BẮT BUỘC có Phone, KHÔNG được truyền Email (đăng nhập bằng SĐT + mật khẩu).
        ///   - Employee (nhân viên): BẮT BUỘC có Email, KHÔNG được truyền Phone (đăng nhập bằng Email + mật khẩu).
        /// </summary>
        public async Task<Account> CreateAccountAsync(
            long? memberId,
            long? employeeId,
            string? phone,
            string? email,
            string password)
        {
            ValidateOwner(memberId, employeeId);

            if (memberId.HasValue)
            {
                if (string.IsNullOrWhiteSpace(phone))
                    throw new ArgumentException("Tài khoản khách hàng bắt buộc phải có Số điện thoại.", nameof(phone));

                if (!string.IsNullOrWhiteSpace(email))
                    throw new ArgumentException("Tài khoản khách hàng chỉ đăng nhập bằng Số điện thoại, không được cung cấp Email.", nameof(email));

                email = null;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(email))
                    throw new ArgumentException("Tài khoản nhân viên bắt buộc phải có Email.", nameof(email));

                if (!string.IsNullOrWhiteSpace(phone))
                    throw new ArgumentException("Tài khoản nhân viên chỉ đăng nhập bằng Email, không được cung cấp Số điện thoại.", nameof(phone));

                phone = null;
            }

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
        /// Cập nhật thông tin đăng nhập của tài khoản. Truyền null cho field không muốn đổi.
        /// Quy tắc theo loại tài khoản:
        ///   - Member (khách hàng): chỉ được cập nhật Phone. Truyền newEmail sẽ báo lỗi.
        ///   - Employee (nhân viên): chỉ được cập nhật Email. Truyền newPhone sẽ báo lỗi.
        /// </summary>
        public async Task<Account> UpdateAccountInfoAsync(
            long accountId,
            string? newPhone,
            string? newEmail)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            if (account.MemberId.HasValue)
            {
                if (newEmail != null)
                    throw new ArgumentException("Tài khoản khách hàng không sử dụng Email, không thể cập nhật.", nameof(newEmail));

                if (newPhone != null)
                {
                    if (string.IsNullOrWhiteSpace(newPhone))
                        throw new ArgumentException("Tài khoản khách hàng bắt buộc phải có Số điện thoại.", nameof(newPhone));

                    await EnsurePhoneAndEmailAvailableAsync(newPhone, null, excludeAccountId: accountId);
                    account.Phone = newPhone;
                }
            }
            else
            {
                if (newPhone != null)
                    throw new ArgumentException("Tài khoản nhân viên không sử dụng Số điện thoại, không thể cập nhật.", nameof(newPhone));

                if (newEmail != null)
                {
                    if (string.IsNullOrWhiteSpace(newEmail))
                        throw new ArgumentException("Tài khoản nhân viên bắt buộc phải có Email.", nameof(newEmail));

                    await EnsurePhoneAndEmailAvailableAsync(null, newEmail, excludeAccountId: accountId);
                    account.Email = newEmail;
                }
            }

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
        //
        // AccountService KHÔNG tự ghi log ở đây nữa. MemberService và EmployeeService
        // (chủ sở hữu account) đều đã tự ghi log riêng của mình (kèm reason cho lock,
        // kèm ghi chú cho unlock) ngay sau khi gọi các hàm này. Việc này tránh ghi log
        // trùng lặp (trước đây AccountService ghi thêm 1 bản generic "AccountStatus",
        // trong khi MemberService/EmployeeService cũng ghi 1 bản chi tiết cho cùng hành động).
        // ------------------------------------------------------------------

        /// <summary>
        /// Khóa tài khoản — bắt buộc có lý do. Thu hồi refresh token để đăng xuất ngay lập tức.
        /// performedBy: employeeId của nhân viên thực hiện thao tác.
        /// </summary>
        public async Task<Account> LockAccountAsync(long accountId, string reason, long performedBy)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Phải cung cấp lý do khi khóa tài khoản.", nameof(reason));

            var account = await GetAccountOrThrowAsync(accountId);

            if (account.Status == AccountStatus.Suspended)
                throw new InvalidOperationException("Tài khoản đã bị khóa từ trước.");

            account.Status = AccountStatus.Suspended;
            account.SuspendReason = reason;
            account.UpdatedAt = DateTime.UtcNow;

            await RevokeAllRefreshTokensAsync(accountId);
            await _context.SaveChangesAsync();

            return account;
        }

        /// <summary>
        /// Mở khóa tài khoản.
        /// performedBy: employeeId của nhân viên thực hiện thao tác.
        /// </summary>
        public async Task<Account> UnlockAccountAsync(long accountId, long performedBy)
        {
            var account = await GetAccountOrThrowAsync(accountId);

            if (account.Status == AccountStatus.Active)
                throw new InvalidOperationException("Tài khoản đang hoạt động, không cần mở khóa.");

            account.Status = AccountStatus.Active;
            account.SuspendReason = null;
            account.UpdatedAt = DateTime.UtcNow;

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

        /// <summary>
        /// Tìm tài khoản theo Email — dùng cho đăng nhập bằng Email (VD: nhân viên chỉ có Email, không có Phone).
        /// </summary>
        public async Task<Account?> GetByEmailAsync(string email)
        {
            return await _context.Accounts
                .Include(a => a.Member)
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.Email == email);
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

        /// <summary>
        /// Kiểm tra Phone/Email không trùng tài khoản khác — chỉ kiểm tra field nào THỰC SỰ có giá trị.
        /// Bắt buộc phải có ít nhất 1 trong 2 (Phone hoặc Email) để tài khoản còn đăng nhập được.
        /// </summary>
        private async Task EnsurePhoneAndEmailAvailableAsync(string? phone, string? email, long? excludeAccountId)
        {
            if (string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Phải cung cấp ít nhất Số điện thoại hoặc Email để đăng nhập.");

            if (!string.IsNullOrWhiteSpace(phone))
            {
                var phoneTaken = await _context.Accounts
                    .AnyAsync(a => a.Phone == phone && a.AccountId != excludeAccountId);

                if (phoneTaken)
                    throw new InvalidOperationException($"Số điện thoại '{phone}' đã được sử dụng.");
            }

            if (!string.IsNullOrWhiteSpace(email))
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
    }
}