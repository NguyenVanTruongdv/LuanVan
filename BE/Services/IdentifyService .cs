using BE.Data;
using BE.DTOs.Identify;
using BE.Models;
using BE.Services.FaceRecognition;
using BE.Services.GymDensity;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Identify;

public class IdentifyService
{
    private readonly GymManagementContext _context;
    private readonly RekognitionFaceService _faceService;
    private readonly GymDensityService _densityService;

    private const string RoleAdmin = "Admin";
    private const string RoleManager = "Manager";

    private const string EmployeeStatusActive = "Active";
    private const string AccountStatusSuspended = "Suspended";
    private const string MemberStatusPendingActivation = "PendingActivation";
    private const string PackageStatusActive = "Active";

    public IdentifyService(
        GymManagementContext context,
        RekognitionFaceService faceService,
        GymDensityService densityService)
    {
        _context = context;
        _faceService = faceService;
        _densityService = densityService;
    }

    // Nhận diện khuôn mặt qua camera, dùng chung cho check-in và check-out.
    public async Task<IdentifyAttendanceResponseDto> IdentifyAttendanceAsync(IdentifyAttendanceRequestDto request, int branchId)
    {
        byte[]? anhBytes = DecodeBase64Image(request.Image);
        if (anhBytes == null)
        {
            return new IdentifyAttendanceResponseDto { Status = "no_face" };
        }

        FaceSearchResult ketQuaTimKiem = await _faceService.SearchFaceByImageAsync(anhBytes);

        if (ketQuaTimKiem.Status == FaceSearchStatus.NoFace)
        {
            return new IdentifyAttendanceResponseDto { Status = "no_face" };
        }

        if (ketQuaTimKiem.Status == FaceSearchStatus.NotRecognized)
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        if (ketQuaTimKiem.OwnerType == FaceOwnerType.Employee)
        {
            return await IdentifyEmployeeAsync(ketQuaTimKiem.EmployeeId!.Value, ketQuaTimKiem.MatchedFaceId, branchId, request.Action, anhBytes);
        }

        if (ketQuaTimKiem.OwnerType == FaceOwnerType.Member)
        {
            return await IdentifyMemberAsync(ketQuaTimKiem.MemberId!.Value, ketQuaTimKiem.MatchedFaceId, branchId, request.Action);
        }

        return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
    }

    // ===================== LUỒNG NHÂN VIÊN =====================

    private async Task<IdentifyAttendanceResponseDto> IdentifyEmployeeAsync(
        long employeeId, string? matchedFaceId, int branchId, string? action, byte[] anhBytes)
    {
        Employee? nhanVien = await _context.Employees
            .AsNoTracking()
            .Include(e => e.FaceDatumEmployee)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        bool khopKhuonMat = nhanVien != null
            && nhanVien.FaceDatumEmployee != null
            && !string.IsNullOrEmpty(matchedFaceId)
            && nhanVien.FaceDatumEmployee.FaceIdAws == matchedFaceId;

        if (!khopKhuonMat)
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        var nhanVienDto = new EmployeeIdentifyDto
        {
            EmployeeId = nhanVien!.EmployeeId,
            FullName = nhanVien.FullName,
            Status = nhanVien.Status
        };

        if (nhanVien.Status != EmployeeStatusActive)
        {
            // Nhân viên nghỉ việc có thể vẫn là hội viên -> thử tìm theo hướng hội viên.
            IdentifyAttendanceResponseDto? ketQuaHoiVien = await TryFallbackToMemberAsync(anhBytes, branchId, action);
            if (ketQuaHoiVien != null)
            {
                return ketQuaHoiVien;
            }

            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Reason = "Tài khoản nhân viên không hoạt động, không thể ra/vào.",
                IsEmployee = true,
                Employee = nhanVienDto
            };
        }

        return action == "checkout"
            ? await DoEmployeeAutoCheckoutAsync(nhanVien.EmployeeId, branchId, nhanVienDto)
            : await DoEmployeeAutoCheckinAsync(nhanVien.EmployeeId, branchId, nhanVienDto);
    }

    // Nếu employee không active, thử xem khuôn mặt này có khớp một hội viên nào không.
    private async Task<IdentifyAttendanceResponseDto?> TryFallbackToMemberAsync(byte[] anhBytes, int branchId, string? action)
    {
        List<FaceSearchResult> dsKetQua = await _faceService.SearchAllFaceMatchesAsync(anhBytes);

        FaceSearchResult? hoiVienMatch = dsKetQua
            .Where(m => m.Status == FaceSearchStatus.Found && m.OwnerType == FaceOwnerType.Member)
            .OrderByDescending(m => m.Similarity)
            .FirstOrDefault();

        if (hoiVienMatch == null)
        {
            return null;
        }

        IdentifyAttendanceResponseDto ketQua = await IdentifyMemberAsync(
            hoiVienMatch.MemberId!.Value, hoiVienMatch.MatchedFaceId, branchId, action);

        return ketQua.Status == "not_recognized" ? null : ketQua;
    }

    private async Task<IdentifyAttendanceResponseDto> DoEmployeeAutoCheckinAsync(long employeeId, int branchId, EmployeeIdentifyDto nhanVienDto)
    {
        var checkIn = new Models.CheckIn
        {
            EmployeeId = employeeId,
            BranchId = branchId,
            CheckInTime = DateTime.Now,
            Method = "Auto"
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();
        await _densityService.AdjustAsync(branchId, 1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            IsEmployee = true,
            Employee = nhanVienDto,
            CheckInId = checkIn.CheckInId
        };
    }

    private async Task<IdentifyAttendanceResponseDto> DoEmployeeAutoCheckoutAsync(long employeeId, int branchId, EmployeeIdentifyDto nhanVienDto)
    {
        Models.CheckIn? phienDangMo = await _context.CheckIns
            .Where(c => c.EmployeeId == employeeId && c.CheckOutTime == null)
            .OrderByDescending(c => c.CheckInTime)
            .FirstOrDefaultAsync();

        if (phienDangMo == null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "no_open_session",
                IsEmployee = true,
                Employee = nhanVienDto
            };
        }

        phienDangMo.CheckOutTime = DateTime.Now;
        phienDangMo.CheckOutMethod = "Auto";
        await _context.SaveChangesAsync();
        await _densityService.AdjustAsync(branchId, -1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            IsEmployee = true,
            Employee = nhanVienDto,
            CheckInId = phienDangMo.CheckInId
        };
    }

    // ===================== LUỒNG HỘI VIÊN =====================

    private async Task<IdentifyAttendanceResponseDto> IdentifyMemberAsync(long memberId, string? matchedFaceId, int branchId, string? action)
    {
        Member? hoiVien = await LoadMemberWithDetailsAsync(memberId);

        bool khopKhuonMat = hoiVien != null
            && hoiVien.FaceDatum != null
            && !string.IsNullOrEmpty(matchedFaceId)
            && hoiVien.FaceDatum.FaceIdAws == matchedFaceId;

        if (!khopKhuonMat)
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        return action == "checkout"
            ? await DoAutoCheckoutAsync(hoiVien!, branchId)
            : await DoAutoCheckinAsync(hoiVien!, branchId);
    }

    private async Task<IdentifyAttendanceResponseDto> DoAutoCheckinAsync(Member hoiVien, int branchId)
    {
        MemberPackage? goiTap = GetLatestPackage(hoiVien);
        string? lyDoTuChoi = GetCheckinIneligibleReason(hoiVien, goiTap);

        if (lyDoTuChoi != null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Member = MapMember(hoiVien, goiTap),
                Reason = lyDoTuChoi
            };
        }

        var checkIn = new Models.CheckIn
        {
            MemberId = hoiVien.MemberId,
            MemberPackageId = goiTap!.MemberPackageId,
            BranchId = branchId,
            CheckInTime = DateTime.Now,
            Method = "Auto"
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();
        await _densityService.AdjustAsync(branchId, 1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            Member = MapMember(hoiVien, goiTap),
            CheckInId = checkIn.CheckInId
        };
    }

    private async Task<IdentifyAttendanceResponseDto> DoAutoCheckoutAsync(Member hoiVien, int branchId)
    {
        Models.CheckIn? phienDangMo = await _context.CheckIns
            .Where(c => c.MemberId == hoiVien.MemberId && c.CheckOutTime == null)
            .OrderByDescending(c => c.CheckInTime)
            .FirstOrDefaultAsync();

        if (phienDangMo == null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "no_open_session",
                Member = MapMember(hoiVien, GetLatestPackage(hoiVien))
            };
        }

        string? lyDoKhoa = GetAccountLockedReason(hoiVien);
        if (lyDoKhoa != null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Member = MapMember(hoiVien, GetLatestPackage(hoiVien)),
                Reason = lyDoKhoa
            };
        }

        phienDangMo.CheckOutTime = DateTime.Now;
        phienDangMo.CheckOutMethod = "Auto";
        await _context.SaveChangesAsync();
        await _densityService.AdjustAsync(branchId, -1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            Member = MapMember(hoiVien, GetLatestPackage(hoiVien)),
            CheckInId = phienDangMo.CheckInId
        };
    }

    // ===================== TRA CỨU & CHECK-IN THỦ CÔNG =====================

    public async Task<MemberDto?> LookupMemberByPhoneAsync(string phone)
    {
        Member? hoiVien = await LoadMemberByPhoneAsync(phone);
        return hoiVien == null ? null : MapMember(hoiVien, GetLatestPackage(hoiVien));
    }

    public async Task<ManualCheckinResponseDto> CheckinManualAsync(ManualCheckinRequestDto request, long? staffId, int branchId)
    {
        Member? hoiVien = await LoadMemberWithDetailsAsync(request.MemberId);
        if (hoiVien == null)
        {
            throw new KeyNotFoundException("Không tìm thấy hội viên.");
        }

        MemberPackage? goiTap = GetLatestPackage(hoiVien);
        string? lyDoTuChoi = GetCheckinIneligibleReason(hoiVien, goiTap);
        if (lyDoTuChoi != null)
        {
            throw new InvalidOperationException(lyDoTuChoi);
        }

        var checkIn = new Models.CheckIn
        {
            MemberId = hoiVien.MemberId,
            MemberPackageId = goiTap!.MemberPackageId,
            BranchId = branchId,
            CheckInTime = DateTime.Now,
            Method = "Manual",
            StaffId = staffId,
            ManualReason = request.ManualReason
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();
        // Mật độ phòng gym đã được cộng khi bấm "Mở cửa" nên không cộng lại ở đây.

        return new ManualCheckinResponseDto
        {
            CheckInId = checkIn.CheckInId,
            Member = MapMember(hoiVien, goiTap)
        };
    }

    public async Task OpenDoorAsync(int branchId, OpenDoorRequestDto request)
    {
        int delta = request.Side == "checkout" ? -1 : 1;
        await _densityService.AdjustAsync(branchId, delta);
    }

    // ===================== HÀM PHỤ TRỢ =====================

    private async Task<Member?> LoadMemberWithDetailsAsync(long memberId)
    {
        return await _context.Members
            .Include(m => m.Account)
            .Include(m => m.FaceDatum)
            .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
            .FirstOrDefaultAsync(m => m.MemberId == memberId);
    }

    private async Task<Member?> LoadMemberByPhoneAsync(string phone)
    {
        return await _context.Members
            .Include(m => m.Account)
            .Include(m => m.FaceDatum)
            .Include(m => m.MemberPackages).ThenInclude(p => p.Plan)
            .FirstOrDefaultAsync(m => m.Account != null && m.Account.Phone == phone);
    }

    private MemberPackage? GetLatestPackage(Member hoiVien)
    {
        if (hoiVien.MemberPackages == null || hoiVien.MemberPackages.Count == 0)
        {
            return null;
        }

        MemberPackage? goiDangActive = hoiVien.MemberPackages
            .Where(p => p.PackageStatus == PackageStatusActive)
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();

        return goiDangActive ?? hoiVien.MemberPackages
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();
    }

    private string? GetCheckinIneligibleReason(Member hoiVien, MemberPackage? goiTap)
    {
        string? lyDoKhoa = GetAccountLockedReason(hoiVien);
        if (lyDoKhoa != null)
        {
            return lyDoKhoa;
        }

        if (hoiVien.Status == MemberStatusPendingActivation)
        {
            return "Tài khoản chưa được kích hoạt. Không thể check-in.";
        }

        if (goiTap == null || goiTap.PackageStatus != PackageStatusActive)
        {
            return "Gói tập đã hết hạn. Vui lòng gia hạn trước khi check-in.";
        }

        return null;
    }

    private static string? GetAccountLockedReason(Member hoiVien)
    {
        if (hoiVien.Account == null || hoiVien.Account.Status != AccountStatusSuspended)
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(hoiVien.Account.SuspendReason)
            ? "Tài khoản đã bị khoá."
            : "Tài khoản đã bị khoá: " + hoiVien.Account.SuspendReason;
    }

    private MemberDto MapMember(Member hoiVien, MemberPackage? goiTap)
    {
        var dto = new MemberDto
        {
            MemberId = hoiVien.MemberId,
            FullName = hoiVien.FullName,
            Phone = hoiVien.Account?.Phone ?? "",
            PhotoUrl = hoiVien.FaceDatum?.ProfileImage,
            AccountStatus = hoiVien.Account?.Status ?? hoiVien.Status,
            SuspendReason = hoiVien.Account?.SuspendReason,
            InternalNotes = hoiVien.InternalNotes
        };

        if (goiTap != null)
        {
            dto.Package = goiTap.Plan?.PlanName;
            dto.PackageStatus = goiTap.PackageStatus == PackageStatusActive ? "active" : "expired";
            dto.ExpiryDate = goiTap.ExpiryDate?.ToString("dd/MM/yyyy");
        }

        return dto;
    }

    private byte[]? DecodeBase64Image(string dataUrl)
    {
        if (string.IsNullOrWhiteSpace(dataUrl))
        {
            return null;
        }

        int viTriPhay = dataUrl.IndexOf(',');
        string base64 = viTriPhay >= 0 ? dataUrl[(viTriPhay + 1)..] : dataUrl;

        try
        {
            return Convert.FromBase64String(base64);
        }
        catch
        {
            return null;
        }
    }

    // ===================== LỊCH SỬ CHECK-IN =====================

    public async Task<CheckInHistoryResponseDto> GetCheckInHistoryByStaffAsync(long staffId, CheckInHistoryQueryDto query)
    {
        Employee? nhanVien = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Role)
            .Include(e => e.Branches)
            .FirstOrDefaultAsync(e => e.EmployeeId == staffId);

        if (nhanVien == null)
        {
            throw new KeyNotFoundException("Không tìm thấy nhân viên.");
        }

        bool isAdmin = nhanVien.Role.RoleName == RoleAdmin;
        bool isManager = nhanVien.Role.RoleName == RoleManager;
        List<int> dsChiNhanhDuocGan = nhanVien.Branches.Select(b => b.BranchId).ToList();

        IQueryable<Models.CheckIn> truyVan = _context.CheckIns
            .AsNoTracking()
            .Where(c => c.MemberId != null)
            .Include(c => c.Member).ThenInclude(m => m.FaceDatum)
            .Include(c => c.Member).ThenInclude(m => m.Account)
            .Include(c => c.Branch)
            .Include(c => c.Staff)
            .Include(c => c.CheckOutStaff);

        if (isAdmin && query.branchId.HasValue)
        {
            bool chiNhanhTonTai = await _context.Branches.AsNoTracking().AnyAsync(b => b.BranchId == query.branchId.Value);
            if (!chiNhanhTonTai)
            {
                throw new KeyNotFoundException("Chi nhánh không tồn tại.");
            }
        }

        truyVan = ApplyBranchFilter(truyVan, query.branchId, isAdmin, isManager, dsChiNhanhDuocGan);

        if (query.FromDate.HasValue)
        {
            DateTime tuNgay = DateTime.SpecifyKind(query.FromDate.Value.Date, DateTimeKind.Unspecified);
            truyVan = truyVan.Where(c => c.CheckInTime >= tuNgay);
        }

        if (query.ToDate.HasValue)
        {
            DateTime denNgay = DateTime.SpecifyKind(query.ToDate.Value.Date, DateTimeKind.Unspecified).AddDays(1);
            truyVan = truyVan.Where(c => c.CheckInTime < denNgay);
        }

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            string tuKhoa = query.Keyword.Trim();
            truyVan = truyVan.Where(c =>
                c.Member!.FullName.Contains(tuKhoa) ||
                (c.Member!.Account != null && c.Member.Account.Phone != null && c.Member.Account.Phone.Contains(tuKhoa)));
        }

        int totalCount = await truyVan.CountAsync();
        int page = query.Page < 1 ? 1 : query.Page;
        int pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        List<Models.CheckIn> danhSach = await truyVan
            .OrderByDescending(c => c.CheckInTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        List<CheckInHistoryItemDto> items = danhSach.Select(c => new CheckInHistoryItemDto
        {
            CheckInId = c.CheckInId,
            MemberId = c.MemberId!.Value,
            MemberName = c.Member!.FullName,
            MemberPhone = c.Member.Account?.Phone,
            MemberAvatar = c.Member.FaceDatum?.ProfileImage,
            BranchId = c.BranchId,
            BranchName = c.Branch?.BranchName,
            CheckInTime = c.CheckInTime,
            CheckInMethod = c.Method,
            CheckInStaffName = c.Staff?.FullName,
            CheckOutTime = c.CheckOutTime,
            CheckOutMethod = c.CheckOutMethod,
            CheckOutStaffName = c.CheckOutStaff?.FullName
        }).ToList();

        return new CheckInHistoryResponseDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    // Admin xem theo branchId tuỳ chọn; Manager/Staff chỉ xem trong các chi nhánh được gán.
    private static IQueryable<Models.CheckIn> ApplyBranchFilter(
        IQueryable<Models.CheckIn> query, int? branchIdYeuCau, bool isAdmin, bool isManager, List<int> dsChiNhanhDuocGan)
    {
        if (isAdmin)
        {
            return branchIdYeuCau.HasValue
                ? query.Where(c => c.BranchId == branchIdYeuCau.Value)
                : query;
        }

        if (dsChiNhanhDuocGan.Count == 0)
        {
            throw new InvalidOperationException("Nhân viên chưa được gán chi nhánh nào.");
        }

        if (!branchIdYeuCau.HasValue)
        {
            return query.Where(c => dsChiNhanhDuocGan.Contains(c.BranchId));
        }

        if (isManager)
        {
            if (!dsChiNhanhDuocGan.Contains(branchIdYeuCau.Value))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem chi nhánh này.");
            }

            return query.Where(c => c.BranchId == branchIdYeuCau.Value);
        }

        return query.Where(c => dsChiNhanhDuocGan.Contains(c.BranchId));
    }
}