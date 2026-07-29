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

    public IdentifyService(
        GymManagementContext context,
        RekognitionFaceService faceService,
        GymDensityService densityService)
    {
        _context = context;
        _faceService = faceService;
        _densityService = densityService;
    }

    // =====================================================================
    // Nhận diện khuôn mặt qua camera — dùng chung cho cả check-in và check-out.
    // FE gửi ảnh + action ("checkin" hoặc "checkout") + branchId.
    //
    //   - OwnerType = Employee -> luồng riêng cho NHÂN VIÊN (chỉ kiểm tra
    //     Employee.Status, ghi CheckIn với EmployeeId thay vì MemberId).
    //   - OwnerType = Member   -> luồng cũ cho HỘI VIÊN, trạng thái khoá tài
    //     khoản lấy từ Account.Status (Member luôn đi kèm Account).
    //
    // FIX QUAN TRỌNG (bug "nhận diện khống" — trả về tên người không tồn tại/
    // không hợp lệ trong DB, ví dụ Employee đã bị xoá nhưng AWS Collection còn
    // sót face cũ):
    // ExternalImageId (do RekognitionFaceService parse ra Employee/MemberId)
    // CHỈ phản ánh những gì đang có trên AWS, KHÔNG đảm bảo đồng bộ với DB.
    // Vì vậy bắt buộc phải đối chiếu searchResult.MatchedFaceId (FaceId THẬT do
    // AWS cấp) với FaceData.FaceIdAws đang lưu chính thức trong DB của đúng
    // Employee/Member đó. Nếu không khớp (hoặc người đó chưa có FaceData nào)
    // thì coi như "not_recognized" — KHÔNG trả về danh tính.
    // =====================================================================
    public async Task<IdentifyAttendanceResponseDto> IdentifyAttendanceAsync(IdentifyAttendanceRequestDto request, int branchId)
    {
        byte[]? imageBytes = DecodeBase64Image(request.Image);
        if (imageBytes == null)
        {
            return new IdentifyAttendanceResponseDto { Status = "no_face" };
        }

        FaceSearchResult searchResult = await _faceService.SearchFaceByImageAsync(imageBytes);

        if (searchResult.Status == FaceSearchStatus.NoFace)
        {
            return new IdentifyAttendanceResponseDto { Status = "no_face" };
        }

        if (searchResult.Status == FaceSearchStatus.NotRecognized)
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        return searchResult.OwnerType switch
        {
            FaceOwnerType.Employee => await IdentifyEmployeeAsync(searchResult.EmployeeId!.Value, searchResult.MatchedFaceId, branchId, request.Action, imageBytes),
            FaceOwnerType.Member => await IdentifyMemberAsync(searchResult.MemberId!.Value, searchResult.MatchedFaceId, branchId, request.Action),
            _ => new IdentifyAttendanceResponseDto { Status = "not_recognized" }
        };
    }

    // =====================================================================
    // LUỒNG NHÂN VIÊN — chỉ kiểm tra Employee.Status, không đụng tới gói tập
    // của hội viên. Ghi nhận CheckIn với EmployeeId (MemberId/MemberPackageId
    // để null), đồng thời cộng/trừ mật độ phòng gym.
    //
    // FIX (2026): trước đây nếu Employee.Status != Active thì chặn thẳng
    // ("ineligible"), kể cả khi người này ĐỒNG THỜI là hội viên còn hạn gói
    // tập (case thực tế: nhân viên đã nghỉ việc nhưng vẫn đăng ký tập ở đây
    // với tư cách hội viên). Nay khi employee không Active, hệ thống sẽ thử
    // fallback sang kiểm tra xem khuôn mặt này có khớp một Member hợp lệ nào
    // không (dùng SearchAllFaceMatchesAsync — không ưu tiên Employee), nếu có
    // thì xử lý tiếp theo luồng hội viên bình thường thay vì chặn cứng.
    // =====================================================================
    private async Task<IdentifyAttendanceResponseDto> IdentifyEmployeeAsync(
        long employeeId, string? matchedFaceId, int branchId, string? action, byte[] imageBytes)
    {
        Employee? employee = await _context.Employees
            .AsNoTracking()
            .Include(e => e.FaceDatumEmployee)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        // Đối chiếu bắt buộc: FaceId AWS vừa match được phải TRÙNG với
        // FaceData.FaceIdAws đang lưu chính thức cho employee này. Nếu employee
        // không tồn tại (đã bị xoá), chưa từng đăng ký khuôn mặt, hoặc FaceId
        // lệch (face rác/cũ còn sót trong AWS Collection, hoặc đã đổi ảnh mới
        // nhưng face cũ chưa kịp xoá) -> KHÔNG được tin, coi như không nhận
        // diện được, tuyệt đối không trả về danh tính của employeeId đó.
        if (employee == null ||
            employee.FaceDatumEmployee == null ||
            string.IsNullOrEmpty(matchedFaceId) ||
            !string.Equals(employee.FaceDatumEmployee.FaceIdAws, matchedFaceId, StringComparison.Ordinal))
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        var employeeDto = new EmployeeIdentifyDto
        {
            EmployeeId = employee.EmployeeId,
            FullName = employee.FullName,
            Status = employee.Status
        };

        if (employee.Status != EmployeeStatusActive)
        {
            // Nhân viên không còn Active (vd đã nghỉ việc) -> trước khi chặn
            // hẳn, thử xem người này có ĐỒNG THỜI là HỘI VIÊN không (khuôn mặt
            // có thể được index cả 2 dạng: employee-{id} và member-{id}).
            IdentifyAttendanceResponseDto? memberFallback =
                await TryFallbackToMemberAsync(imageBytes, branchId, action);

            if (memberFallback != null)
            {
                return memberFallback;
            }

            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Reason = "Tài khoản nhân viên không hoạt động, không thể ra/vào.",
                IsEmployee = true,
                Employee = employeeDto
            };
        }

        if (action == "checkout")
        {
            return await DoEmployeeAutoCheckoutAsync(employee.EmployeeId, branchId, employeeDto);
        }
        else
        {
            return await DoEmployeeAutoCheckinAsync(employee.EmployeeId, branchId, employeeDto);
        }
    }

    // =====================================================================
    // FALLBACK (employee inactive -> thử tư cách hội viên):
    // Lấy TOÀN BỘ match hợp lệ từ AWS (SearchAllFaceMatchesAsync — KHÔNG ưu
    // tiên Employee như SearchFaceByImageAsync), tìm Member có similarity cao
    // nhất trong số đó, rồi xử lý qua đúng luồng IdentifyMemberAsync hiện có
    // (luồng này tự đối chiếu FaceIdAws trong DB, tự kiểm tra Account bị khoá,
    // gói tập còn hạn hay không...).
    //
    // Trả về null nếu:
    //   - Không có Member nào khớp trong danh sách match, hoặc
    //   - Có Member khớp theo ExternalImageId nhưng FaceIdAws không trùng với
    //     DB (not_recognized) -> để caller giữ nguyên thông báo "ineligible"
    //     theo lý do của Employee, tránh nhầm lẫn hiển thị "not_recognized"
    //     trong khi thực ra là do employee bị khoá.
    // =====================================================================
    private async Task<IdentifyAttendanceResponseDto?> TryFallbackToMemberAsync(
        byte[] imageBytes, int branchId, string? action)
    {
        List<FaceSearchResult> allMatches = await _faceService.SearchAllFaceMatchesAsync(imageBytes);

        FaceSearchResult? memberMatch = allMatches
            .Where(r => r.Status == FaceSearchStatus.Found && r.OwnerType == FaceOwnerType.Member)
            .OrderByDescending(r => r.Similarity)
            .FirstOrDefault();

        if (memberMatch == null)
        {
            return null;
        }

        IdentifyAttendanceResponseDto result = await IdentifyMemberAsync(
            memberMatch.MemberId!.Value, memberMatch.MatchedFaceId, branchId, action);

        return result.Status == "not_recognized" ? null : result;
    }

    // ------------------------ CHECK-IN TỰ ĐỘNG (camera) — NHÂN VIÊN ------------------------
    private async Task<IdentifyAttendanceResponseDto> DoEmployeeAutoCheckinAsync(long employeeId, int branchId, EmployeeIdentifyDto employeeDto)
    {
        var checkIn = new Models.CheckIn
        {
            EmployeeId = employeeId,
            MemberId = null,
            MemberPackageId = null,
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
            Employee = employeeDto,
            CheckInId = checkIn.CheckInId
        };
    }

    // ------------------------ CHECK-OUT TỰ ĐỘNG (camera) — NHÂN VIÊN ------------------------
    private async Task<IdentifyAttendanceResponseDto> DoEmployeeAutoCheckoutAsync(long employeeId, int branchId, EmployeeIdentifyDto employeeDto)
    {
        Models.CheckIn? openSession = await _context.CheckIns
            .Where(c => c.EmployeeId == employeeId && c.CheckOutTime == null)
            .OrderByDescending(c => c.CheckInTime)
            .FirstOrDefaultAsync();

        if (openSession == null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "no_open_session",
                IsEmployee = true,
                Employee = employeeDto
            };
        }

        openSession.CheckOutTime = DateTime.Now;
        openSession.CheckOutMethod = "Auto";
        await _context.SaveChangesAsync();

        await _densityService.AdjustAsync(branchId, -1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            IsEmployee = true,
            Employee = employeeDto,
            CheckInId = openSession.CheckInId
        };
    }

    // =====================================================================
    // LUỒNG HỘI VIÊN
    // =====================================================================
    private async Task<IdentifyAttendanceResponseDto> IdentifyMemberAsync(long memberId, string? matchedFaceId, int branchId, string? action)
    {
        Member? member = await LoadMemberWithDetailsAsync(memberId);

        // Đối chiếu bắt buộc tương tự luồng Employee: FaceId AWS match được
        // phải trùng với FaceData.FaceIdAws đang lưu chính thức cho member này.
        if (member == null ||
            member.FaceDatum == null ||
            string.IsNullOrEmpty(matchedFaceId) ||
            !string.Equals(member.FaceDatum.FaceIdAws, matchedFaceId, StringComparison.Ordinal))
        {
            return new IdentifyAttendanceResponseDto { Status = "not_recognized" };
        }

        if (action == "checkout")
        {
            return await DoAutoCheckoutAsync(member, branchId);
        }
        else
        {
            return await DoAutoCheckinAsync(member, branchId);
        }
    }

    // ------------------------ CHECK-IN TỰ ĐỘNG (camera) — HỘI VIÊN ------------------------
    private async Task<IdentifyAttendanceResponseDto> DoAutoCheckinAsync(Member member, int branchId)
    {
        MemberPackage? activePackage = GetLatestPackage(member);
        string? reason = GetCheckinIneligibleReason(member, activePackage);

        if (reason != null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Member = MapMember(member, activePackage),
                Reason = reason
            };
        }

        var checkIn = new Models.CheckIn
        {
            MemberId = member.MemberId,
            MemberPackageId = activePackage!.MemberPackageId,
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
            Member = MapMember(member, activePackage),
            CheckInId = checkIn.CheckInId
        };
    }

    // ------------------------ CHECK-OUT TỰ ĐỘNG (camera) — HỘI VIÊN ------------------------
    private async Task<IdentifyAttendanceResponseDto> DoAutoCheckoutAsync(Member member, int branchId)
    {
        Models.CheckIn? openSession = await _context.CheckIns
            .Where(c => c.MemberId == member.MemberId && c.CheckOutTime == null)
            .OrderByDescending(c => c.CheckInTime)
            .FirstOrDefaultAsync();

        if (openSession == null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "no_open_session",
                Member = MapMember(member, GetLatestPackage(member))
            };
        }

        string? reason = GetAccountLockedReason(member);
        if (reason != null)
        {
            return new IdentifyAttendanceResponseDto
            {
                Status = "ineligible",
                Member = MapMember(member, GetLatestPackage(member)),
                Reason = reason
            };
        }

        openSession.CheckOutTime = DateTime.Now;
        openSession.CheckOutMethod = "Auto";
        await _context.SaveChangesAsync();

        await _densityService.AdjustAsync(branchId, -1);

        return new IdentifyAttendanceResponseDto
        {
            Status = "success",
            Member = MapMember(member, GetLatestPackage(member)),
            CheckInId = openSession.CheckInId
        };
    }

    // ===================== TRA CỨU THEO SĐT (HỘI VIÊN) =====================
    // Phone nay nằm ở Account, không còn ở Member.
    public async Task<MemberDto?> LookupMemberByPhoneAsync(string phone)
    {
        Member? member = await LoadMemberByPhoneAsync(phone);
        if (member == null)
        {
            return null;
        }

        return MapMember(member, GetLatestPackage(member));
    }

    // ===================== CHECK-IN THỦ CÔNG (quầy) — HỘI VIÊN =====================
    public async Task<ManualCheckinResponseDto> CheckinManualAsync(ManualCheckinRequestDto request, long? staffId, int branchId)
    {
        Member? member = await LoadMemberWithDetailsAsync(request.MemberId);
        if (member == null)
        {
            throw new KeyNotFoundException("Không tìm thấy hội viên.");
        }

        MemberPackage? activePackage = GetLatestPackage(member);
        string? reason = GetCheckinIneligibleReason(member, activePackage);
        if (reason != null)
        {
            throw new InvalidOperationException(reason);
        }

        var checkIn = new Models.CheckIn
        {
            MemberId = member.MemberId,
            MemberPackageId = activePackage!.MemberPackageId,
            BranchId = branchId,
            CheckInTime = DateTime.Now,
            Method = "Manual",
            StaffId = staffId,
            ManualReason = request.ManualReason
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();

        // Không cộng thêm mật độ ở đây vì đã tính lúc bấm "Mở cửa" rồi

        return new ManualCheckinResponseDto
        {
            CheckInId = checkIn.CheckInId,
            Member = MapMember(member, activePackage)
        };
    }

    // ===================== MỞ CỬA =====================
    public async Task OpenDoorAsync(int branchId, OpenDoorRequestDto request)
    {
        if (request.Side == "checkout")
        {
            await _densityService.AdjustAsync(branchId, -1);
        }
        else
        {
            await _densityService.AdjustAsync(branchId, 1);
        }
    }

    // ===================== HÀM PHỤ TRỢ (HỘI VIÊN) =====================

    // Luôn Include Account vì Member luôn đi kèm Account, và mọi kiểm tra
    // khoá/trạng thái đăng nhập đều lấy từ Account, không còn ở Member.
    private async Task<Member?> LoadMemberWithDetailsAsync(long memberId)
    {
        return await _context.Members
            .Include(m => m.Account)
            .Include(m => m.FaceDatum)
            .Include(m => m.MemberPackages).ThenInclude(mp => mp.Plan)
            .FirstOrDefaultAsync(m => m.MemberId == memberId);
    }

    private async Task<Member?> LoadMemberByPhoneAsync(string phone)
    {
        return await _context.Members
            .Include(m => m.Account)
            .Include(m => m.FaceDatum)
            .Include(m => m.MemberPackages).ThenInclude(mp => mp.Plan)
            .FirstOrDefaultAsync(m => m.Account != null && m.Account.Phone == phone);
    }

    private MemberPackage? GetLatestPackage(Member member)
    {
        if (member.MemberPackages == null || member.MemberPackages.Count == 0)
        {
            return null;
        }

        MemberPackage? activePackage = member.MemberPackages
            .Where(p => p.PackageStatus == "Active")
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();

        if (activePackage != null)
        {
            return activePackage;
        }

        return member.MemberPackages
            .OrderByDescending(p => p.ExpiryDate)
            .FirstOrDefault();
    }

    // Thứ tự kiểm tra khi CHECK-IN:
    // 1) Account bị khoá (Suspended) -> chặn.
    // 2) Member chưa kích hoạt (PendingActivation) -> chặn.
    // 3) Không có gói tập Active -> chặn.
    private string? GetCheckinIneligibleReason(Member member, MemberPackage? package)
    {
        string? lockedReason = GetAccountLockedReason(member);
        if (lockedReason != null)
        {
            return lockedReason;
        }

        if (member.Status == MemberStatusPendingActivation)
        {
            return "Tài khoản chưa được kích hoạt. Không thể check-in.";
        }

        if (package == null || package.PackageStatus != "Active")
        {
            return "Gói tập đã hết hạn. Vui lòng gia hạn trước khi check-in.";
        }

        return null;
    }

    // Kiểm tra riêng phần khoá tài khoản (Account.Status), dùng chung cho cả
    // check-in và check-out.
    private static string? GetAccountLockedReason(Member member)
    {
        if (member.Account == null || member.Account.Status != AccountStatusSuspended)
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(member.Account.SuspendReason)
            ? "Tài khoản đã bị khoá."
            : "Tài khoản đã bị khoá: " + member.Account.SuspendReason;
    }

    private MemberDto MapMember(Member member, MemberPackage? package)
    {
        var dto = new MemberDto
        {
            MemberId = member.MemberId,
            FullName = member.FullName,
            Phone = member.Account?.Phone ?? "",
            PhotoUrl = member.FaceDatum?.ProfileImage,
            AccountStatus = member.Account?.Status ?? member.Status,
            SuspendReason = member.Account?.SuspendReason,
            InternalNotes = member.InternalNotes,
        };

        if (package != null)
        {
            dto.Package = package.Plan?.PlanName;
            dto.PackageStatus = package.PackageStatus == "Active" ? "active" : "expired";
            dto.ExpiryDate = package.ExpiryDate?.ToString("dd/MM/yyyy"); // TODO: đổi nếu ExpiryDate là DateOnly
        }

        return dto;
    }

    private byte[]? DecodeBase64Image(string dataUrl)
    {
        if (string.IsNullOrWhiteSpace(dataUrl))
        {
            return null;
        }

        string base64 = dataUrl;
        int commaIndex = dataUrl.IndexOf(',');
        if (commaIndex >= 0)
        {
            base64 = dataUrl.Substring(commaIndex + 1);
        }

        try
        {
            return Convert.FromBase64String(base64);
        }
        catch
        {
            return null;
        }
    }

    // ===================== LỊCH SỬ CHECK-IN THEO NHÂN VIÊN =====================
    // Xác định quyền Admin/Manager theo RoleName (chuỗi) để nhất quán với
    // EmployeeService, không dựa cứng vào RoleId số.
    //
    // Lưu ý: từ khi CheckIn hỗ trợ cả lượt của nhân viên (MemberId = null,
    // EmployeeId khác null), endpoint này chỉ lọc lịch sử check-in của HỘI VIÊN
    // (c.MemberId != null) để không đổi hành vi/DTO hiện có. Nếu cần xem chấm
    // công của nhân viên, nên làm API riêng.
    public async Task<CheckInHistoryResponseDto> GetCheckInHistoryByStaffAsync(long staffId, CheckInHistoryQueryDto query)
    {
        Employee? employee = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Role)
            .Include(e => e.Branches)
            .FirstOrDefaultAsync(e => e.EmployeeId == staffId);

        if (employee == null)
        {
            throw new KeyNotFoundException("Không tìm thấy nhân viên.");
        }

        bool isAdmin = employee.Role.RoleName == RoleAdmin;
        bool isManager = employee.Role.RoleName == RoleManager;

        List<int> assignedBranchIds = employee.Branches
            .Select(b => b.BranchId)
            .ToList();

        IQueryable<Models.CheckIn> baseQuery = _context.CheckIns
            .AsNoTracking()
            .Where(c => c.MemberId != null)
            .Include(c => c.Member).ThenInclude(m => m.FaceDatum)
            .Include(c => c.Member).ThenInclude(m => m.Account)
            .Include(c => c.Branch)
            .Include(c => c.Staff)
            .Include(c => c.CheckOutStaff)
            .AsQueryable();

        if (isAdmin)
        {
            if (query.branchId.HasValue)
            {
                bool branchExists = await _context.Branches
                    .AsNoTracking()
                    .AnyAsync(b => b.BranchId == query.branchId.Value);

                if (!branchExists)
                    throw new KeyNotFoundException("Chi nhánh không tồn tại.");

                baseQuery = baseQuery.Where(c => c.BranchId == query.branchId.Value);
            }
        }
        else if (isManager)
        {
            if (assignedBranchIds.Count == 0)
                throw new InvalidOperationException("Nhân viên chưa được gán chi nhánh nào.");

            if (query.branchId.HasValue)
            {
                if (!assignedBranchIds.Contains(query.branchId.Value))
                    throw new UnauthorizedAccessException("Bạn không có quyền xem chi nhánh này.");

                baseQuery = baseQuery.Where(c => c.BranchId == query.branchId.Value);
            }
            else
            {
                baseQuery = baseQuery.Where(c => assignedBranchIds.Contains(c.BranchId));
            }
        }
        else
        {
            if (assignedBranchIds.Count == 0)
                throw new InvalidOperationException("Nhân viên chưa được gán chi nhánh nào.");

            baseQuery = baseQuery.Where(c => assignedBranchIds.Contains(c.BranchId));
        }

        if (query.FromDate.HasValue)
        {
            DateTime from = DateTime.SpecifyKind(query.FromDate.Value.Date, DateTimeKind.Unspecified);
            baseQuery = baseQuery.Where(c => c.CheckInTime >= from);
        }

        if (query.ToDate.HasValue)
        {
            DateTime to = DateTime.SpecifyKind(query.ToDate.Value.Date, DateTimeKind.Unspecified).AddDays(1);
            baseQuery = baseQuery.Where(c => c.CheckInTime < to);
        }

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            string kw = query.Keyword.Trim();

            baseQuery = baseQuery.Where(c =>
                c.Member!.FullName.Contains(kw) ||
                (c.Member!.Account != null &&
                 c.Member.Account.Phone != null &&
                 c.Member.Account.Phone.Contains(kw)));
        }

        int totalCount = await baseQuery.CountAsync();

        int page = query.Page < 1 ? 1 : query.Page;
        int pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        List<Models.CheckIn> records = await baseQuery
            .OrderByDescending(c => c.CheckInTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        List<CheckInHistoryItemDto> items = records.Select(c => new CheckInHistoryItemDto
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
}