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

    private const string PersonTypeMember = "member";
    private const string PersonTypeEmployee = "employee";

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

        if (hoiVien.Status == AccountStatusSuspended)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Member = MapMember(hoiVien, GetLatestPackage(hoiVien)),
                Reason = "Tài khoản hội viên đang bị khóa. Không thể check-out."
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
            .FirstOrDefaultAsync(m => m.Account != null && m.Phone == phone);
    }

    // Gói tập được coi là còn hiệu lực khi status = Active VÀ (không có ngày hết hạn hoặc ngày hết hạn >= hôm nay).
    private static bool IsPackageEffectivelyActive(MemberPackage? goiTap)
    {
        if (goiTap == null || goiTap.PackageStatus != PackageStatusActive)
        {
            return false;
        }

        return goiTap.ExpiryDate == null || goiTap.ExpiryDate.Value >= DateOnly.FromDateTime(DateTime.Today);
    }

    private MemberPackage? GetLatestPackage(Member hoiVien)
    {
        if (hoiVien.MemberPackages == null || hoiVien.MemberPackages.Count == 0)
        {
            return null;
        }

        // Ưu tiên gói còn hiệu lực thật sự (status Active và chưa hết hạn theo ngày), gần hết hạn nhất trước.
        MemberPackage? goiDangHieuLuc = hoiVien.MemberPackages
            .Where(IsPackageEffectivelyActive)
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();

        return goiDangHieuLuc ?? hoiVien.MemberPackages
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();
    }

    private string? GetCheckinIneligibleReason(Member hoiVien, MemberPackage? goiTap)
    {
        if (hoiVien.Status == AccountStatusSuspended)
        {
            return "Tài khoản hội viên đang bị khóa. Không thể check-in.";
        }

        if (hoiVien.Status == MemberStatusPendingActivation)
        {
            return "Tài khoản chưa được kích hoạt. Không thể check-in.";
        }

        // Chặn check-in nếu: không có gói, sai status, HOẶC đã qua ngày hết hạn (dù status trong DB vẫn là Active).
        if (!IsPackageEffectivelyActive(goiTap))
        {
            return "Gói tập đã hết hạn. Vui lòng gia hạn trước khi check-in.";
        }

        return null;
    }

    private MemberDto MapMember(Member hoiVien, MemberPackage? goiTap)
    {
        var dto = new MemberDto
        {
            MemberId = hoiVien.MemberId,
            FullName = hoiVien.FullName,
            Phone = hoiVien.Phone ?? "",
            PhotoUrl = hoiVien.FaceDatum?.ProfileImage,
            AccountStatus = hoiVien.Account?.Status ?? hoiVien.Status,

            InternalNotes = hoiVien.InternalNotes
        };

        if (goiTap != null)
        {
            dto.Package = goiTap.Plan?.PlanName;
            // Hiển thị "active" chỉ khi status = Active VÀ chưa qua ngày hết hạn, đồng bộ với logic check-in.
            dto.PackageStatus = IsPackageEffectivelyActive(goiTap) ? "active" : "expired";
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

    // Trả về toàn bộ danh sách theo bộ lọc (không phân trang, FE tự xử lý phân trang/hiển thị).
    public async Task<CheckInHistoryResponseDto> GetCheckInHistoryByStaffAsync(long staffId, CheckInHistoryQueryDto query)
    {
        Employee? nhanVien = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Account.Role)
            .Include(e => e.Branches)
            .FirstOrDefaultAsync(e => e.EmployeeId == staffId);

        if (nhanVien == null)
        {
            throw new KeyNotFoundException("Không tìm thấy nhân viên.");
        }

        bool isAdmin = nhanVien.Account.Role.RoleName == RoleAdmin;
        bool isManager = nhanVien.Account.Role.RoleName == RoleManager;
        List<int> dsChiNhanhDuocGan = nhanVien.Branches.Select(b => b.BranchId).ToList();

        // Lấy cả check-in của hội viên lẫn nhân viên.
        IQueryable<Models.CheckIn> truyVan = _context.CheckIns
            .AsNoTracking()
            .Include(c => c.Member).ThenInclude(m => m!.FaceDatum)
            .Include(c => c.Member).ThenInclude(m => m!.Account)
            .Include(c => c.Employee)
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

        // Lọc theo loại người: hội viên / nhân viên / tất cả (nếu không truyền hoặc giá trị khác).
        string? loaiNguoi = query.PersonType?.Trim().ToLower();
        if (loaiNguoi == PersonTypeMember)
        {
            truyVan = truyVan.Where(c => c.MemberId != null);
        }
        else if (loaiNguoi == PersonTypeEmployee)
        {
            truyVan = truyVan.Where(c => c.EmployeeId != null);
        }

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            string tuKhoa = query.Keyword.Trim();
            truyVan = truyVan.Where(c =>
                (c.Member != null && (c.Member.FullName.Contains(tuKhoa)
                    || (c.Member.Phone != null && c.Member.Phone.Contains(tuKhoa))))
                || (c.Employee != null && c.Employee.FullName.Contains(tuKhoa)));
        }

        List<Models.CheckIn> danhSach = await truyVan
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        List<CheckInHistoryItemDto> items = danhSach.Select(c => new CheckInHistoryItemDto
        {
            CheckInId = c.CheckInId,
            IsEmployee = c.EmployeeId != null,

            MemberId = c.MemberId,
            MemberName = c.Member?.FullName,
            MemberPhone = c.Member?.Phone,
            MemberAvatar = c.Member?.FaceDatum?.ProfileImage,

            EmployeeId = c.EmployeeId,
            EmployeeName = c.Employee?.FullName,

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
            TotalCount = items.Count
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