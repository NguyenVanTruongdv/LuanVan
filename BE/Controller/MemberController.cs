// BE/Controllers/MembersController.cs
using System.Security.Claims;
using BE.Dtos.Member;
using BE.Services;
using BE.Services.Identify;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    // Chỉ chứa các endpoint thuộc về hồ sơ hội viên: tạo tài khoản, thông tin cá nhân,
    // FaceID, khóa/mở khóa, kích hoạt. Mọi thứ liên quan gói tập/giao dịch/gia hạn đã tách sang
    // MemberPackagesController và TransactionsController.
    //
    // QUY TẮC PHÂN QUYỀN (áp dụng thống nhất trong file này):
    //   - Endpoint CHỈ DÀNH CHO THU NGÂN/NHÂN VIÊN (tạo hội viên, danh sách, tìm kiếm,
    //     khóa/mở khóa, sửa FaceID, lookup theo SĐT, kiểm tra/kích hoạt gói): bắt buộc
    //     IsEmployee() == true. "id" trên route LUÔN được dùng trực tiếp — vì nhân viên
    //     PHẢI chỉ định rõ đang thao tác trên hội viên nào, JWT của nhân viên không mang
    //     theo memberId của khách.
    //   - Endpoint CHO PHÉP CẢ HỘI VIÊN TỰ THAO TÁC (xem/sửa hồ sơ, xem lịch sử cập nhật):
    //     "id" trên route CHỈ được tin dùng khi caller là nhân viên. Khi caller là hội viên,
    //     memberId bắt buộc lấy từ JWT (GetCurrentUserId()), bỏ qua route — tránh trường hợp
    //     hội viên A đổi số trên URL rồi đọc/sửa được dữ liệu của hội viên B.
    [ApiController]
    [Route("api/members")]
    [Authorize(Roles = "Manager,Staff")]
    public class MembersController : ApiControllerBase
    {
        private readonly MemberService _memberService;
        private readonly IdentifyService _identifyService;

        public MembersController(MemberService memberService, IdentifyService indentifyService)
        {
            _memberService = memberService;
            _identifyService = indentifyService;
        }

        // ===================== [THU NGÂN] TẠO HỘI VIÊN MỚI =====================
        // Bắt buộc nhân viên — hội viên không có API tự đăng ký ở đây (đăng ký online nằm ở AuthService).
        [HttpPost]
        public async Task<IActionResult> CreateMember([FromForm] CreateMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.CreateMemberAsync(request, performedBy);
            return CreatedAtAction(nameof(GetMember), new { id = result.MemberId }, result);
        }

        // ===================== [THU NGÂN] LẤY DANH SÁCH HỘI VIÊN =====================
        [HttpGet]
        public async Task<IActionResult> GetMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.GetMembersAsync(phone, fullName, branchId);
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

        // ===================== SỬA THÔNG TIN HỘI VIÊN =====================
        // Nhân viên: sửa hồ sơ bất kỳ hội viên nào theo "id" trên route.
        // Hội viên: chỉ được sửa hồ sơ của chính mình -> ép memberId về JWT.
        [HttpPut("{id:long}")]
        public async Task<IActionResult> UpdateMemberInfo(long id, [FromBody] UpdateMemberInfoRequest request)
        {
            var performedBy = GetPerformedByOrNull();
            var targetMemberId = IsEmployee() ? id : GetCurrentUserId();

            var result = await _memberService.UpdateMemberInfoAsync(targetMemberId, request, performedBy);
            return Ok(result);
        }

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

        // ===================== [THU NGÂN] KHÓA TÀI KHOẢN HỘI VIÊN =====================
        [HttpPut("{id:long}/lock")]
        public async Task<IActionResult> LockMember(long id, [FromBody] LockMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.LockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã khóa tài khoản hội viên." });
        }

        // ===================== [THU NGÂN] KIỂM TRA XEM CÓ GÓI TẬP (PENDING) K ĐỂ KÍCH HOẠT TK =====================
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

        // ===================== [THU NGÂN] KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
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

        // ===================== [THU NGÂN] KÍCH HOẠT: CHỈ TẠO FACE ID =====================
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

        // ===================== [THU NGÂN] MỞ KHÓA TÀI KHOẢN HỘI VIÊN =====================
        [HttpPut("{id:long}/unlock")]
        public async Task<IActionResult> UnlockMember(long id, [FromBody] UnlockMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.UnlockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã mở khóa tài khoản hội viên." });
        }

        // ===================== [THU NGÂN] TRA CỨU HỘI VIÊN THEO SỐ ĐIỆN THOẠI (check-in FaceID...) =====================
        [Authorize]
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
    }
}