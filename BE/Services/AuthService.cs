using BE.Data;
using BE.DTOs.Auth;
using BE.Exceptions;
using BE.Helpers;
using BE.Models;
using BE.Services.Interfaces;
using BE.Enums;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class AuthService : IAuthService
{
    private readonly GymManagementContext _db;
    private readonly JwtHelper _jwt;
    private readonly ISmsService _smsService;

    public AuthService(GymManagementContext db, JwtHelper jwt, ISmsService smsService)
    {
        _db = db;
        _jwt = jwt;
        _smsService = smsService;
    }

    // ───────────────────────────────────────────────
    // ĐĂNG NHẬP
    // ───────────────────────────────────────────────

    // Đăng nhập nhân viên
    public async Task<LoginResponseDto> LoginEmployeeAsync(LoginRequestDto req)
    {
        var emp = await _db.Employees
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Phone == req.Phone && e.Status == "Active")
            ?? throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        if (!PasswordHelper.VerifyPassword(req.Password, emp.PasswordHash))
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        return await IssueTokens(emp.EmployeeId, emp.FullName, emp.Role.RoleName, "Employee");
    }

    // Đăng nhập hội viên
    // Chặn Suspended; cho phép PendingActivation đăng nhập để xem trạng thái
    public async Task<LoginResponseDto> LoginMemberAsync(LoginRequestDto req)
    {
        var member = await _db.Members
            .FirstOrDefaultAsync(m => m.Phone == req.Phone)
            ?? throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        if (member.Status == MemberStatus.Suspended.ToString())
            throw new UnauthorizedException("Tài khoản đã bị tạm khóa");

        if (!PasswordHelper.VerifyPassword(req.Password, member.PasswordHash))
            throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");

        return await IssueTokens(member.MemberId, member.FullName, "Member", "Member");
    }

    // ───────────────────────────────────────────────
    // ĐĂNG KÝ
    // ───────────────────────────────────────────────

    // Gửi OTP đăng ký
    public async Task SendRegisterOtpAsync(string phone)
    {
        // Kiểm tra số điện thoại đã tồn tại chưa
        if (await _db.Members.AnyAsync(m => m.Phone == phone))
            throw new BadRequestException("Số điện thoại đã được đăng ký");

        // Chống spam: chỉ gửi lại sau 60 giây (lọc đúng Purpose)
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

    // Xác minh OTP và tạo tài khoản hội viên
    public async Task VerifyOtpRegister(VerifyRegisterOtpDto req)
    {
        if (await _db.Members.AnyAsync(m => m.Phone == req.Phone))
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

        // Guard: đề phòng edge case FailedAttempts bị lệch
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
        _db.Members.Add(new Member
        {
            FullName = req.FullName,
            Phone = req.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Gender = req.Gender,
            Status = MemberStatus.PendingActivation.ToString(),
            BranchId = req.BranchId,
        });

        await _db.SaveChangesAsync();
    }

    // ───────────────────────────────────────────────
    // QUÊN MẬT KHẨU
    // ───────────────────────────────────────────────

    // Gửi OTP quên mật khẩu
    public async Task SendForgotPasswordOtpAsync(string phone)
    {
        var member = await _db.Members
            .FirstOrDefaultAsync(x => x.Phone == phone)
            ?? throw new BadRequestException("Số điện thoại không tồn tại");

        // Chống spam: chỉ gửi lại sau 60 giây (lọc đúng Purpose)
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

    // Xác thực OTP và reset mật khẩu
    public async Task ResetPasswordAsync(ResetPasswordDto req)
    {
        var member = await _db.Members
            .FirstOrDefaultAsync(x => x.Phone == req.Phone)
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

        // Guard: đề phòng edge case FailedAttempts bị lệch
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

        // Đánh dấu OTP đã dùng + cập nhật mật khẩu — lưu trước
        otp.IsUsed = true;
        member.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        // Đăng xuất tất cả thiết bị (ExecuteUpdateAsync chạy trực tiếp xuống DB)
        await _db.RefreshTokens
            .Where(x =>
                x.EntityId == member.MemberId &&
                x.EntityType == "Member" &&
                x.RevokedAt == null)
            .ExecuteUpdateAsync(x =>
                x.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
    }

    // ───────────────────────────────────────────────
    // ĐỔI MẬT KHẨU
    // ───────────────────────────────────────────────

    public async Task ChangePassAsync(ChangePasswordDto req, long userId, string EntityType)
    {
        if (req.NewPassword != req.ConfirmPassx)
            throw new BadRequestException("Xác nhận mật khẩu không đúng!");

        if (EntityType == "Member")
        {
            var member = await _db.Members
                .FirstOrDefaultAsync(m => m.MemberId == userId)
                ?? throw new NotFoundException("Vui lòng đăng nhập lại!");

            if (!PasswordHelper.VerifyPassword(req.CurrentPassword, member.PasswordHash))
                throw new BadRequestException("Mật khẩu hiện tại không đúng");

            if (PasswordHelper.VerifyPassword(req.NewPassword, member.PasswordHash))
                throw new BadRequestException("Mật khẩu mới phải khác mật khẩu cũ");

            member.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _db.SaveChangesAsync();
        }
        else
        {
            var employee = await _db.Employees
                .FirstOrDefaultAsync(x => x.EmployeeId == userId)
                ?? throw new NotFoundException("Không tìm thấy tài khoản");

            if (!PasswordHelper.VerifyPassword(req.CurrentPassword, employee.PasswordHash))
                throw new BadRequestException("Mật khẩu hiện tại không đúng");

            if (PasswordHelper.VerifyPassword(req.NewPassword, employee.PasswordHash))
                throw new BadRequestException("Mật khẩu mới phải khác mật khẩu cũ");

            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _db.SaveChangesAsync();
        }

        // Đăng xuất tất cả thiết bị (ExecuteUpdateAsync chạy trực tiếp xuống DB)
        await _db.RefreshTokens
            .Where(x =>
                x.EntityId == userId &&
                x.EntityType == EntityType &&
                x.RevokedAt == null)
            .ExecuteUpdateAsync(x =>
                x.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
    }

    // ───────────────────────────────────────────────
    // TOKEN
    // ───────────────────────────────────────────────

    // Làm mới token (Rotation)
    public async Task<LoginResponseDto> RefreshAsync(RefreshRequestDto req)
    {
        var hash = JwtHelper.ComputeSha256(req.RefreshToken);

        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash)
            ?? throw new UnauthorizedAccessException("Token không hợp lệ");

        if (stored.RevokedAt != null || stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Phiên đã hết hạn, vui lòng đăng nhập lại");

        // Thu hồi token cũ ngay lập tức (chống Replay Attack)
        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string fullName;
        string role = stored.Role;

        if (stored.EntityType == "Employee")
        {
            var emp = await _db.Employees
                .Include(e => e.Role)
                .FirstOrDefaultAsync(e => e.EmployeeId == stored.EntityId && e.Status == "Active")
                ?? throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");

            fullName = emp.FullName;
            role = emp.Role.RoleName;
        }
        else
        {
            // Cho phép PendingActivation refresh, chặn Suspended
            var member = await _db.Members
                .FirstOrDefaultAsync(m =>
                    m.MemberId == stored.EntityId &&
                    m.Status != MemberStatus.Suspended.ToString())
                ?? throw new UnauthorizedAccessException("Tài khoản không còn hoạt động");

            fullName = member.FullName;
        }

        return await IssueTokens(stored.EntityId, fullName, role, stored.EntityType);
    }

    // Đăng xuất
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

    // Tạo cặp access + refresh token rồi lưu vào DB
    private async Task<LoginResponseDto> IssueTokens(
        long entityId, string fullName, string role, string entityType)
    {
        var userInfo = new JwtUserInfo
        {
            Id = entityId,
            FullName = fullName,
            Role = role,
            EntityType = entityType
        };

        var accessToken = _jwt.GenerateAccessToken(userInfo);
        var (rawRefresh, hash) = _jwt.GenerateRefreshToken();
        var ttlDays = TokenTtlHelper.GetRefreshTokenDays(entityType, role);

        _db.RefreshTokens.Add(new RefreshToken
        {
            EntityId = entityId,
            EntityType = entityType,
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
            EntityType = entityType
        };
    }
}