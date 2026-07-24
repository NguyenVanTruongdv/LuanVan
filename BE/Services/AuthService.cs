using BE.Data;
using BE.DTOs.Auth;
using BE.Exceptions;
using BE.Helpers;
using BE.Models;
using BE.Services;

using BE.Enums;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class AuthService
{
    private readonly GymManagementContext _db;
    private readonly JwtHelper _jwt;
    private readonly SmsService _smsService;

    public AuthService(GymManagementContext db, JwtHelper jwt, SmsService smsService)
    {
        _db = db;
        _jwt = jwt;
        _smsService = smsService;
    }

    // ───────────────────────────────────────────────
    // ĐĂNG NHẬP
    // ───────────────────────────────────────────────

    public async Task<LoginResponseDto> LoginEmployeeAsync(LoginEmployeeRequestDto req)
    {
        var email = req.Email.Trim().ToLower();

        var account = await _db.Accounts
            .Include(a => a.Employee).ThenInclude(e => e!.Role)
            .Include(a => a.Employee).ThenInclude(e => e!.EmployeeBranches)
            .FirstOrDefaultAsync(a =>
                a.Email != null &&
                a.Email.ToLower() == email &&
                a.EmployeeId != null &&
                a.Employee!.Status == "Active")
            ?? throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        if (account.Status == "Suspended")
            throw new UnauthorizedException("Tài khoản đã bị tạm khóa");

        if (!PasswordHelper.VerifyPassword(req.Password, account.PasswordHash))
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        var emp = account.Employee!;
        var branchIds = emp.EmployeeBranches.Select(eb => eb.BranchId).ToList();

        return await IssueTokens(
            account.AccountId,
            emp.EmployeeId,
            emp.FullName,
            emp.Role.RoleName,
            "Employee",
            emp.Status,
            branchIds
        );
    }

    // Chặn account.Status = Suspended; cho phép Member.Status = PendingActivation đăng nhập để xem trạng thái
   public async Task<LoginResponseDto> LoginMemberAsync(LoginMemberRequestDto req)
{
    var account = await _db.Accounts
        .Include(a => a.Member)
        .FirstOrDefaultAsync(a => a.Phone == req.Phone && a.MemberId != null)
        ?? throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

    if (account.Status == "Suspended")
        throw new UnauthorizedException("Tài khoản đã bị tạm khóa");

    if (!PasswordHelper.VerifyPassword(req.Password, account.PasswordHash))
        throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

    var member = account.Member!;

    return await IssueTokens(
        account.AccountId,
        member.MemberId,
        member.FullName,
        "Member",
        "Member",
        member.Status
    );
}
    // ───────────────────────────────────────────────
    // ĐĂNG KÝ
    // ───────────────────────────────────────────────

    public async Task SendRegisterOtpAsync(string phone)
    {
        if (await _db.Accounts.AnyAsync(a => a.Phone == phone))
            throw new BadRequestException("Số điện thoại đã được đăng ký");

        var lastOtp = await _db.Otps
            .Where(x => x.Phone == phone
                && x.Purpose == Auth.DangKy.ToString()
                && !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOtp != null && lastOtp.CreatedAt > DateTime.UtcNow.AddSeconds(-60))
            throw new BadRequestException("Vui lòng thử lại sau 60 giây");

        var otp = new Otp
        {
            Phone = phone,
            OtpCode = Random.Shared.Next(100000, 999999).ToString(),
            Purpose = Auth.DangKy.ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            FailedAttempts = 0,
            IsUsed = false,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Otps.Add(otp);
        await _db.SaveChangesAsync();
        await _smsService.SendOtpAsync(phone, otp.OtpCode);
    }

    // Xác minh OTP, tạo Member + Account tương ứng
    public async Task VerifyOtpRegister(VerifyRegisterOtpDto req)
    {
        if (await _db.Accounts.AnyAsync(a => a.Phone == req.Phone))
            throw new BadRequestException("Số điện thoại đã tồn tại");

        var otp = await _db.Otps
            .Where(o => o.Phone == req.Phone
                && o.Purpose == Auth.DangKy.ToString()
                && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new BadRequestException("Mã OTP không tồn tại hoặc đã được sử dụng");

        if (otp.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("Mã OTP đã hết hạn");

        if (otp.FailedAttempts >= 3)
            throw new BadRequestException("OTP đã bị khóa. Vui lòng yêu cầu OTP mới.");

        if (req.Otp != otp.OtpCode)
        {
            otp.FailedAttempts++;

            if (otp.FailedAttempts >= 3)
            {
                otp.IsUsed = true;
                await _db.SaveChangesAsync();
                throw new BadRequestException("Bạn đã nhập sai OTP quá 3 lần. Vui lòng yêu cầu OTP mới.");
            }

            await _db.SaveChangesAsync();
            throw new BadRequestException($"OTP không đúng. Còn {3 - otp.FailedAttempts} lần thử.");
        }

        otp.IsUsed = true;

        var member = new Member
        {
            FullName = req.FullName,
            Gender = req.Gender,
            Status = MemberStatus.PendingActivation.ToString(),
        };
        _db.Members.Add(member);
        await _db.SaveChangesAsync(); // cần MemberId trước khi gắn Account

        _db.Accounts.Add(new Account
        {
            Phone = req.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            MemberId = member.MemberId,
            Status = "Active",
        });

        await _db.SaveChangesAsync();
    }

    // ───────────────────────────────────────────────
    // QUÊN MẬT KHẨU
    // ───────────────────────────────────────────────

    public async Task SendForgotPasswordOtpAsync(string phone)
    {
        var account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Phone == phone && a.MemberId != null)
            ?? throw new BadRequestException("Số điện thoại không tồn tại");

        var lastOtp = await _db.Otps
            .Where(x => x.Phone == phone
                && x.Purpose == Auth.QuenMatKhau.ToString()
                && !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOtp != null && lastOtp.CreatedAt > DateTime.UtcNow.AddSeconds(-60))
            throw new BadRequestException("Vui lòng thử lại sau 60 giây");

        var otpCode = Random.Shared.Next(100000, 999999).ToString();

        _db.Otps.Add(new Otp
        {
            Phone = phone,
            OtpCode = otpCode,
            Purpose = Auth.QuenMatKhau.ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            FailedAttempts = 0,
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        await _smsService.SendOtpAsync(phone, otpCode);
    }

    public async Task ResetPasswordAsync(ResetPasswordDto req)
    {
        var account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Phone == req.Phone && a.MemberId != null)
            ?? throw new BadRequestException("Tài khoản không tồn tại");

        var otp = await _db.Otps
            .Where(x =>
                x.Phone == req.Phone &&
                x.Purpose == Auth.QuenMatKhau.ToString() &&
                !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new BadRequestException("OTP không hợp lệ");

        if (otp.ExpiresAt < DateTime.UtcNow)
            throw new BadRequestException("OTP đã hết hạn");

        if (otp.FailedAttempts >= 3)
            throw new BadRequestException("OTP đã bị khóa. Vui lòng yêu cầu OTP mới.");

        if (req.Otp != otp.OtpCode)
        {
            otp.FailedAttempts++;

            if (otp.FailedAttempts >= 3)
            {
                otp.IsUsed = true;
                await _db.SaveChangesAsync();
                throw new BadRequestException("Bạn đã nhập sai OTP quá 3 lần. Vui lòng yêu cầu OTP mới.");
            }

            await _db.SaveChangesAsync();
            throw new BadRequestException($"OTP không đúng. Còn {3 - otp.FailedAttempts} lần thử.");
        }

        otp.IsUsed = true;
        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        await _db.RefreshTokens
            .Where(x => x.AccountId == account.AccountId && x.RevokedAt == null)
            .ExecuteUpdateAsync(x =>
                x.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
    }

    // ───────────────────────────────────────────────
    // ĐỔI MẬT KHẨU
    // ───────────────────────────────────────────────

    public async Task ChangePassAsync(ChangePasswordDto req, long accountId)
    {
        if (req.NewPassword != req.ConfirmPassx)
            throw new BadRequestException("Xác nhận mật khẩu không đúng!");

        var account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.AccountId == accountId)
            ?? throw new NotFoundException("Vui lòng đăng nhập lại!");

        if (!PasswordHelper.VerifyPassword(req.CurrentPassword, account.PasswordHash))
            throw new BadRequestException("Mật khẩu hiện tại không đúng");

        if (PasswordHelper.VerifyPassword(req.NewPassword, account.PasswordHash))
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu cũ");

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        await _db.RefreshTokens
            .Where(x => x.AccountId == accountId && x.RevokedAt == null)
            .ExecuteUpdateAsync(x =>
                x.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
    }

    // ───────────────────────────────────────────────
    // TOKEN
    // ───────────────────────────────────────────────

    public async Task<LoginResponseDto> RefreshAsync(RefreshRequestDto req)
    {
        var hash = JwtHelper.ComputeSha256(req.RefreshToken);

        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash)
            ?? throw new UnauthorizedAccessException("Token không hợp lệ");

        if (stored.RevokedAt != null || stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Phiên đã hết hạn, vui lòng đăng nhập lại");

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var account = await _db.Accounts
            .Include(a => a.Employee).ThenInclude(e => e!.Role)
            .Include(a => a.Employee).ThenInclude(e => e!.EmployeeBranches) // MỚI
            .Include(a => a.Member)
            .FirstOrDefaultAsync(a => a.AccountId == stored.AccountId)
            ?? throw new UnauthorizedAccessException("Tài khoản không còn tồn tại");

        if (account.Status == "Suspended")
            throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");

        long entityId;
        string fullName;
        string role;
        string entityType;
        string? status;
        List<int>? branchIds = null; // MỚI

        if (account.EmployeeId != null)
        {
            var emp = account.Employee!;
            if (emp.Status != "Active")
                throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");

            entityId = emp.EmployeeId;
            fullName = emp.FullName;
            role = emp.Role.RoleName;
            entityType = "Employee";
            status = emp.Status;
            branchIds = emp.EmployeeBranches.Select(eb => eb.BranchId).ToList(); // MỚI
        }
        else
        {
            var member = account.Member!;
            entityId = member.MemberId;
            fullName = member.FullName;
            role = "Member";
            entityType = "Member";
            status = member.Status;
        }

        return await IssueTokens(
            account.AccountId,
            entityId,
            fullName,
            role,
            entityType,
            status,
            branchIds // MỚI
        );
    }

    public async Task LogoutAsync(RefreshRequestDto req)
    {
        var hash = JwtHelper.ComputeSha256(req.RefreshToken);

        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored != null && stored.RevokedAt == null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<LoginResponseDto> IssueTokens(
    long accountId,
    long entityId,
    string fullName,
    string role,
    string entityType,
    string? status = null,
    List<int>? branchIds = null) // MỚI — mặc định null để không phá các lệnh gọi cũ (LoginMember, Refresh)
    {
        var userInfo = new JwtUserInfo
        {
            Id = entityId,
            AccountId = accountId,
            FullName = fullName,
            Role = role,
            EntityType = entityType,
            Status = status,
            BranchIds = branchIds ?? new List<int>() // MỚI
        };

        var accessToken = _jwt.GenerateAccessToken(userInfo);
        var (rawRefresh, hash) = _jwt.GenerateRefreshToken();
        var ttlDays = TokenTtlHelper.GetRefreshTokenDays(entityType, role);

        _db.RefreshTokens.Add(new RefreshToken
        {
            AccountId = accountId,
            Role = role,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(ttlDays)
        });

        await _db.SaveChangesAsync();

        return new LoginResponseDto
        {
            FullName = fullName,
            AccessToken = accessToken,
            RefreshToken = rawRefresh,
            Role = role,
            EntityType = entityType,
            Status = status
        }; // response DTO không đổi field nào — FE không cần sửa
    }

}