// BE/Controllers/MembersController.cs
using System.Security.Claims;
using BE.Dtos.Member;
using BE.Dtos.Member.BE.Dtos.Member;
using BE.Models;
using BE.Services;
using BE.Services.Identify;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
   
    [ApiController]
    [Route("api/members")]
    [Authorize]
    public class MembersController : ApiControllerBase
    {
        private readonly MemberService _memberService;
        private readonly IdentifyService _identifyService;

        public MembersController(MemberService memberService, IdentifyService indentifyService)
        {
            _memberService = memberService;
            _identifyService = indentifyService;
        }


        [HttpPost]
        public async Task<IActionResult> CreateMember([FromForm] CreateMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.CreateMemberAsync(request, performedBy);
            return CreatedAtAction(nameof(GetMember), new { id = result.MemberId }, result);
        }

        // =========================================================================
        // NHÓM 2: [THU NGÂN] DANH SÁCH / TÌM KIẾM / TRA CỨU
        // =========================================================================

        [HttpGet]
        public async Task<IActionResult> GetMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.GetMembersAsync(phone, fullName, branchId);
            return Ok(result);
        }

        [HttpGet("employee")]
        public async Task<IActionResult> GetMemberEmployee([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            if (!IsEmployee())
                return Forbid();
            long employeeId = GetCurrentUserId();
            var result = await _memberService.GetMembersEmployeeAsync(phone, fullName, branchId, employeeId);
            return Ok(result);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll([FromQuery] string? phone, [FromQuery] string? fullName)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.GetAllAsync(phone, fullName);
            return Ok(result);
        }

        // ===================== [THU NGÂN] LẤY DANH SÁCH HỘI VIÊN CHỜ KÍCH HOẠT =====================
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.GetPendingMembersAsync(phone, fullName, branchId);
            return Ok(result);
        }

        // ===================== [THU NGÂN] TÌM HỘI VIÊN (gộp SĐT/Tên) — dùng ở màn gia hạn =====================
        // Đặt ở đây vì bản chất là tìm Member, dù mục đích cuối là gia hạn gói (xử lý ở MemberPackagesController).
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.SearchMembersForRenewAsync(q);
            return Ok(result);
        }

        // ===================== KIỂM TRA TRÙNG SỐ ĐIỆN THOẠI =====================
        // Cho phép cả 2 phía gọi (thu ngân tạo hội viên mới, hội viên tự đăng ký online đều
        // cần check trùng SĐT trước khi submit) — không cần memberId nên không có rủi ro lộ dữ liệu.
        [HttpGet("check-phone")]
        public async Task<IActionResult> CheckPhoneExists([FromQuery] string phone)
        {
            var exists = await _memberService.CheckPhoneExistsAsync(phone);
            return Ok(new { exists });
        }

        // ===================== [THU NGÂN] TRA CỨU HỘI VIÊN THEO SỐ ĐIỆN THOẠI (check-in FaceID...) =====================
        [HttpGet("lookup")]
        public async Task<IActionResult> LookupMemberByPhone([FromQuery] string phone)
        {
            if (!IsEmployee())
                return Forbid();

            if (string.IsNullOrWhiteSpace(phone))
            {
                return BadRequest(new { message = "Thiếu số điện thoại." });
            }

            var member = await _identifyService.LookupMemberByPhoneAsync(phone);
            return Ok(new { member = member });
        }

        // =========================================================================
        // NHÓM 3: XEM HỒ SƠ HỘI VIÊN
        // =========================================================================

        // ===================== LẤY THÔNG TIN CHI TIẾT 1 HỘI VIÊN =====================
        // Nhân viên: xem bất kỳ hội viên nào theo "id" trên route.
        // Hội viên: chỉ được xem hồ sơ của chính mình -> ép memberId về JWT, bỏ qua "id" trên route.
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetMember(long id)
        {
            var targetMemberId = IsEmployee() ? id : GetCurrentUserId();

            var result = await _memberService.GetByIdAsync(targetMemberId);
            return Ok(result);
        }

        // ===================== [HỘI VIÊN] HỒ SƠ RÚT GỌN DÙNG CHO FORUM (avatar/tên ở header) =====================
        [Authorize(Roles = "Member,Manager,Staff")]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var memberId = GetCurrentUserId();
            var profile = await _memberService.GetMyProfileForumAsync(memberId);

            if (profile is null)
                return NotFound(new { message = "Không tìm thấy hội viên" });

            return Ok(profile);
        }

        // ===================== [HỘI VIÊN] HỒ SƠ ĐẦY ĐỦ (thông tin + gói tập + lịch sử) =====================
        // [SỬA LỖI] Route trước đây là "/my-profile" (route TUYỆT ĐỐI) -> phá vỡ prefix
        // "api/members" của controller. Đã đổi thành route tương đối "my-profile".
        [Authorize(Roles = "Member")]
        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            var memberId = GetCurrentUserId();
            var profile = await _memberService.GetMyProfileAsync(memberId);

            if (profile is null)
                return NotFound(new { message = "Không tìm thấy hội viên" });

            return Ok(profile);
        }

        // =========================================================================
        // NHÓM 4: CẬP NHẬT THÔNG TIN HỘI VIÊN
        // =========================================================================

        // ===================== [NHÂN VIÊN] SỬA THÔNG TIN HỘI VIÊN =====================
        // Chỉ nhân viên gọi endpoint này (sửa hồ sơ của khách theo "id" trên route, bao gồm cả
        // InternalNotes — field ghi chú nội bộ mà hội viên KHÔNG được phép tự sửa).
        [HttpPut("{id:long}")]
        public async Task<IActionResult> UpdateMemberInfo(long id, [FromBody] UpdateMemberInfoRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetPerformedByOrNull();
            var result = await _memberService.UpdateMemberInfoAsync(id, request, performedBy);
            return Ok(result);
        }

        // ===================== [MỚI] [HỘI VIÊN] TỰ CẬP NHẬT HỒ SƠ CỦA CHÍNH MÌNH =====================
        // Thay thế cho endpoint "PUT api/members" (UpdateMyInfo) cũ đã bị xóa do không an toàn
        // (xem ghi chú SỬA LỖI ở đầu file). memberId LUÔN lấy từ JWT, không nhận qua route/body,
        // nên hội viên không thể tự sửa hồ sơ của người khác.
        // Cho phép đổi: FullName, Phone, Gender, mật khẩu (CurrentPassword + NewPassword).
        // KHÔNG cho sửa InternalNotes/Status — những field đó chỉ nhân viên mới được sửa qua
        // endpoint UpdateMemberInfo(id) ở trên.
        [Authorize(Roles = "Member")]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request)
        {
            var memberId = GetCurrentUserId();
            var result = await _memberService.UpdateMyProfileAsync(memberId, request);
            return Ok(result);
        }

        // ===================== [THU NGÂN] SỬA FACE ID / ẢNH ĐẠI DIỆN =====================
        // Chỉ nhân viên được đăng ký/sửa FaceID (yêu cầu chụp ảnh trực tiếp tại quầy),
        // "id" trên route là hội viên nhân viên đang thao tác.
        // LƯU Ý: dùng để SỬA FaceID cho hội viên ĐÃ Active sẵn có FaceID. Trường hợp KÍCH HOẠT
        // hội viên mới (Status = PendingActivation) phải dùng ActivateWithPackage/ActivateFaceId
        // bên dưới — 2 API đó còn xử lý thêm việc chuyển Status -> Active, kích hoạt gói Pending...
        [HttpPut("{id:long}/face-id")]
        public async Task<IActionResult> UpdateFaceId(long id, [FromForm] UpdateFaceIdRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.UpdateFaceIdAsync(id, request, performedBy);
            return Ok(result);
        }

        // =========================================================================
        // NHÓM 5: LỊCH SỬ CẬP NHẬT
        // =========================================================================

        // ===================== LỊCH SỬ CẬP NHẬT THÔNG TIN =====================
        // Nhân viên: xem lịch sử của bất kỳ hội viên nào theo "id" trên route.
        // Hội viên: chỉ được xem lịch sử của chính mình -> ép memberId về JWT.
        [HttpGet("{id:long}/update-history")]
        public async Task<IActionResult> GetUpdateHistory(long id)
        {
            var targetMemberId = IsEmployee() ? id : GetCurrentUserId();

            var result = await _memberService.GetUpdateHistoryAsync(targetMemberId);
            return Ok(result);
        }

        // =========================================================================
        // NHÓM 6: [THU NGÂN] KÍCH HOẠT HỘI VIÊN
        // =========================================================================

        // ===================== KIỂM TRA XEM CÓ GÓI TẬP (PENDING) K ĐỂ KÍCH HOẠT TK =====================
        // Trả về boolean THÔ: true nếu hội viên đang có 1 gói ở trạng thái PendingActivation
        // (đã mua online, chưa kích hoạt). Dùng ở màn "Kích hoạt hội viên" để quyết định có cần
        // hiển thị bước chọn gói hay không (false -> cần chọn gói -> gọi ActivateWithPackage;
        // true -> chỉ cần đăng ký FaceID -> gọi ActivateFaceId, BE tự kích hoạt gói Pending đó).
        [HttpGet("{id:long}/has-package")]
        public async Task<IActionResult> CheckHasPack(long id)
        {
            if (!IsEmployee())
                return Forbid();

            var hasPackage = await _memberService.Haspackage(id);
            return Ok(hasPackage);
        }

        // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
        // Dùng khi hội viên CHƯA có gói nào (kể cả Pending) — chọn gói tập + chụp FaceID cùng lúc.
        // request (multipart/form-data) khớp ActivateMemberWithPackageRequest: PlanId (bắt buộc),
        // PromotionId (tùy chọn), GiaGoc, Amount, PaymentMethod, PaymentStatus (tùy chọn),
        // ProfileImage (file ảnh FaceID). BE tự tính StartDate/ExpiryDate/SoNgayTangThucTe.
        // Kích hoạt được thực hiện ở BẤT KỲ chi nhánh nào nhân viên đang đứng.
        [HttpPost("{id:long}/activate-with-package")]
        public async Task<IActionResult> ActivateWithPackage(long id, [FromForm] ActivateMemberWithPackageRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateWithPackageAsync(id, request, performedBy);
            return Ok(result);
        }

        // ===================== KÍCH HOẠT: CHỈ TẠO FACE ID =====================
        // Dùng khi hội viên ĐÃ có gói — gói Pending (mua online) sẽ được BE tự chuyển sang Active
        // với StartDate = hôm nay; nếu không có gói Pending thì BE dùng gói gần nhất còn hạn.
        // Nếu gói gần nhất đã hết hạn, BE sẽ trả lỗi yêu cầu gia hạn/mua gói mới trước.
        // request (multipart/form-data) khớp ActivateMemberFaceIdOnlyRequest: chỉ cần ProfileImage.
        [HttpPost("{id:long}/activate-face-id")]
        public async Task<IActionResult> ActivateFaceIdOnly(long id, [FromForm] ActivateMemberFaceIdOnlyRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateFaceIdOnlyAsync(id, request, performedBy);
            return Ok(result);
        }

        // =========================================================================
        // NHÓM 7: [THU NGÂN] KHÓA / MỞ KHÓA TÀI KHOẢN
        // =========================================================================

        [HttpPut("{id:long}/lock")]
        public async Task<IActionResult> LockMember(long id, [FromBody] LockMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.LockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã khóa tài khoản hội viên." });
        }

        [HttpPut("{id:long}/unlock")]
        public async Task<IActionResult> UnlockMember(long id, [FromBody] UnlockMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.UnlockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã mở khóa tài khoản hội viên." });
        }
    }
}