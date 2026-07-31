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

    

    public async Task<LoginResponseDto> LoginEmployeeAsync(LoginEmployeeRequestDto req)
    {
        string email = req.Email.Trim().ToLower();

        Account? account = await _db.Accounts
            .Include(a => a.Employee)
                .ThenInclude(e => e!.Role)
            .Include(a => a.Employee)
                .ThenInclude(e => e!.Branches)
            .FirstOrDefaultAsync(a =>
                a.Email != null &&
                a.Email.ToLower() == email &&
                a.EmployeeId != null &&
                a.Employee!.Status == "Active");

        if (account == null)
        {
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");
        }

        if (account.Status == "Suspended")
        {
            throw new UnauthorizedException("Tài khoản đã bị tạm khóa");
        }

        bool isPasswordCorrect = PasswordHelper.VerifyPassword(req.Password, account.PasswordHash);
        if (!isPasswordCorrect)
        {
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");
        }

        Employee emp = account.Employee!;

        List<int> branchIds = new List<int>();
        foreach (var branch in emp.Branches)
        {
            branchIds.Add(branch.BranchId);
        }

        return await IssueTokens(account.AccountId, emp.EmployeeId,  emp.FullName,  emp.Role.RoleName, "Employee",emp.Status, branchIds
        );
    }

    // Chặn account.Status = Suspended; cho phép Member.Status = PendingActivation đăng nhập để xem trạng thái
    public async Task<LoginResponseDto> LoginMemberAsync(LoginMemberRequestDto req)
    {
        Account? account = await _db.Accounts
            .Include(a => a.Member)
            .FirstOrDefaultAsync(a => a.Phone == req.Phone && a.MemberId != null);

        if (account == null)
        {
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");
        }

        if (account.Status == "Suspended")
        {
            throw new UnauthorizedException("Tài khoản đã bị tạm khóa");
        }

        bool isPasswordCorrect = PasswordHelper.VerifyPassword(req.Password, account.PasswordHash);
        if (!isPasswordCorrect)
        {
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");
        }

        Member member = account.Member!;

        return await IssueTokens( account.AccountId, member.MemberId,  member.FullName,"Member",  "Member", member.Status
        );
    }

  
    public async Task SendRegisterOtpAsync(string phone)
    {
        bool phoneExists = await _db.Accounts.AnyAsync(a => a.Phone == phone);
        if (phoneExists)
        {
            throw new BadRequestException("Số điện thoại đã được đăng ký");
        }

        Otp? lastOtp = await _db.Otps
            .Where(x => x.Phone == phone
                && x.Purpose == Auth.DangKy.ToString()
                && !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOtp != null && lastOtp.CreatedAt > DateTime.UtcNow.AddSeconds(-60))
        {
            throw new BadRequestException("Vui lòng thử lại sau 60 giây");
        }

        Otp otp = new Otp();
        otp.Phone = phone;
        otp.OtpCode = Random.Shared.Next(100000, 999999).ToString();
        otp.Purpose = Auth.DangKy.ToString();
        otp.ExpiresAt = DateTime.UtcNow.AddMinutes(5);
        otp.FailedAttempts = 0;
        otp.IsUsed = false;
        otp.CreatedAt = DateTime.UtcNow;

        _db.Otps.Add(otp);
        await _db.SaveChangesAsync();
        await _smsService.SendOtpAsync(phone, otp.OtpCode);
    }

    // Xác minh OTP, tạo Member + Account tương ứng
    public async Task VerifyOtpRegister(VerifyRegisterOtpDto req)
    {
        bool phoneExists = await _db.Accounts.AnyAsync(a => a.Phone == req.Phone);
        if (phoneExists)
        {
            throw new BadRequestException("Số điện thoại đã tồn tại");
        }

        Otp? otp = await _db.Otps
            .Where(o => o.Phone == req.Phone
                && o.Purpose == Auth.DangKy.ToString()
                && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp == null)
        {
            throw new BadRequestException("Mã OTP không tồn tại hoặc đã được sử dụng");
        }

        if (otp.ExpiresAt < DateTime.UtcNow)
        {
            throw new BadRequestException("Mã OTP đã hết hạn");
        }

        if (otp.FailedAttempts >= 3)
        {
            throw new BadRequestException("OTP đã bị khóa. Vui lòng yêu cầu OTP mới.");
        }

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
            int remaining = 3 - otp.FailedAttempts;
            throw new BadRequestException($"OTP không đúng. Còn {remaining} lần thử.");
        }

        otp.IsUsed = true;

        Member member = new Member();
        member.FullName = req.FullName;
        member.Gender = req.Gender;
        member.Status = MemberStatus.PendingActivation.ToString();

        _db.Members.Add(member);
        await _db.SaveChangesAsync(); // cần MemberId trước khi gắn Account

        Account newAccount = new Account();
        newAccount.Phone = req.Phone;
        newAccount.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        newAccount.MemberId = member.MemberId;
        newAccount.Status = "Active";

        _db.Accounts.Add(newAccount);
        await _db.SaveChangesAsync();
    }

    

    public async Task SendForgotPasswordOtpAsync(string phone)
    {
        Account? account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Phone == phone && a.MemberId != null);

        if (account == null)
        {
            throw new BadRequestException("Số điện thoại không tồn tại");
        }

        Otp? lastOtp = await _db.Otps
            .Where(x => x.Phone == phone
                && x.Purpose == Auth.QuenMatKhau.ToString()
                && !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastOtp != null && lastOtp.CreatedAt > DateTime.UtcNow.AddSeconds(-60))
        {
            throw new BadRequestException("Vui lòng thử lại sau 60 giây");
        }

        string otpCode = Random.Shared.Next(100000, 999999).ToString();

        Otp otp = new Otp();
        otp.Phone = phone;
        otp.OtpCode = otpCode;
        otp.Purpose = Auth.QuenMatKhau.ToString();
        otp.ExpiresAt = DateTime.UtcNow.AddMinutes(5);
        otp.FailedAttempts = 0;
        otp.IsUsed = false;
        otp.CreatedAt = DateTime.UtcNow;

        _db.Otps.Add(otp);
        await _db.SaveChangesAsync();
        await _smsService.SendOtpAsync(phone, otpCode);
    }

    public async Task ResetPasswordAsync(ResetPasswordDto req)
    {
        Account? account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Phone == req.Phone && a.MemberId != null);

        if (account == null)
        {
            throw new BadRequestException("Tài khoản không tồn tại");
        }

        Otp? otp = await _db.Otps
            .Where(x =>
                x.Phone == req.Phone &&
                x.Purpose == Auth.QuenMatKhau.ToString() &&
                !x.IsUsed)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp == null)
        {
            throw new BadRequestException("OTP không hợp lệ");
        }

        if (otp.ExpiresAt < DateTime.UtcNow)
        {
            throw new BadRequestException("OTP đã hết hạn");
        }

        if (otp.FailedAttempts >= 3)
        {
            throw new BadRequestException("OTP đã bị khóa. Vui lòng yêu cầu OTP mới.");
        }

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
            int remaining = 3 - otp.FailedAttempts;
            throw new BadRequestException($"OTP không đúng. Còn {remaining} lần thử.");
        }

        otp.IsUsed = true;
        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        // Thu hồi tất cả refresh token cũ
        List<RefreshToken> tokens = await _db.RefreshTokens
            .Where(x => x.AccountId == account.AccountId && x.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }


    public async Task ChangePassAsync(ChangePasswordDto req, long accountId)
    {
        if (req.NewPassword != req.ConfirmPassx)
        {
            throw new BadRequestException("Xác nhận mật khẩu không đúng!");
        }

        Account? account = await _db.Accounts
            .FirstOrDefaultAsync(a => a.AccountId == accountId);

        if (account == null)
        {
            throw new NotFoundException("Vui lòng đăng nhập lại!");
        }

        bool isCurrentCorrect = PasswordHelper.VerifyPassword(req.CurrentPassword, account.PasswordHash);
        if (!isCurrentCorrect)
        {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }

        bool isSameAsOld = PasswordHelper.VerifyPassword(req.NewPassword, account.PasswordHash);
        if (isSameAsOld)
        {
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu cũ");
        }

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        // Thu hồi tất cả refresh token cũ
        List<RefreshToken> tokens = await _db.RefreshTokens
            .Where(x => x.AccountId == accountId && x.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<LoginResponseDto> RefreshAsync(RefreshRequestDto req)
    {
        string hash = JwtHelper.ComputeSha256(req.RefreshToken);

        RefreshToken? stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored == null)
        {
            throw new UnauthorizedAccessException("Token không hợp lệ");
        }

        if (stored.RevokedAt != null || stored.ExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Phiên đã hết hạn, vui lòng đăng nhập lại");
        }

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        Account? account = await _db.Accounts
            .Include(a => a.Employee).ThenInclude(e => e!.Role)
            .Include(a => a.Employee).ThenInclude(e => e!.Branches)
            .Include(a => a.Member)
            .FirstOrDefaultAsync(a => a.AccountId == stored.AccountId);

        if (account == null)
        {
            throw new UnauthorizedAccessException("Tài khoản không còn tồn tại");
        }

        if (account.Status == "Suspended")
        {
            throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");
        }

        long entityId;
        string fullName;
        string role;
        string entityType;
        string? status;
        List<int>? branchIds = null;

        if (account.EmployeeId != null)
        {
            Employee emp = account.Employee!;

            if (emp.Status != "Active")
            {
                throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");
            }

            entityId = emp.EmployeeId;
            fullName = emp.FullName;
            role = emp.Role.RoleName;
            entityType = "Employee";
            status = emp.Status;

            branchIds = new List<int>();
            foreach (var branch in emp.Branches)
            {
                branchIds.Add(branch.BranchId);
            }
        }
        else
        {
            Member member = account.Member!;
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
            branchIds
        );
    }

    public async Task LogoutAsync(RefreshRequestDto req)
    {
        string hash = JwtHelper.ComputeSha256(req.RefreshToken);

        RefreshToken? stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored != null && stored.RevokedAt == null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    // Hàm dùng chung: tạo access token + refresh token, lưu vào DB
    private async Task<LoginResponseDto> IssueTokens( long accountId,  long entityId, string fullName, string role,  string entityType,  string? status = null,  List<int>? branchIds = null)
    {
        JwtUserInfo userInfo = new JwtUserInfo();
        userInfo.Id = entityId;
        userInfo.AccountId = accountId;
        userInfo.FullName = fullName;
        userInfo.Role = role;
        userInfo.EntityType = entityType;
        userInfo.Status = status;
        userInfo.BranchIds = branchIds ?? new List<int>();

        string accessToken = _jwt.GenerateAccessToken(userInfo);
        var (rawRefresh, hash) = _jwt.GenerateRefreshToken();
        int ttlDays = TokenTtlHelper.GetRefreshTokenDays(entityType, role);

        RefreshToken newToken = new RefreshToken();
        newToken.AccountId = accountId;
        newToken.Role = role;
        newToken.TokenHash = hash;
        newToken.ExpiresAt = DateTime.UtcNow.AddDays(ttlDays);

        _db.RefreshTokens.Add(newToken);
        await _db.SaveChangesAsync();

        LoginResponseDto response = new LoginResponseDto();
        response.FullName = fullName;
        response.AccessToken = accessToken;
        response.RefreshToken = rawRefresh;
        response.Role = role;
        response.EntityType = entityType;
        response.Status = status;

        return response;
    }
}