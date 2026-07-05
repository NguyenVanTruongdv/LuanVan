using BE.Dtos.Member;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/members")]
    [Authorize]
    public class MembersController : ControllerBase
    {
        private readonly MemberService _memberService;

        public MembersController(MemberService memberService)
        {
            _memberService = memberService;
        }

        // Id của người đang đăng nhập (nhân viên hoặc khách), lấy từ claim chuẩn NameIdentifier.
        private long GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null || !long.TryParse(claim.Value, out var userId))
                throw new UnauthorizedAccessException("Không xác định được người dùng đang đăng nhập. Vui lòng đăng nhập lại.");
            return userId;
        }

        // true nếu người đang đăng nhập là nhân viên.
        // TODO: đổi "Employee" cho đúng tên role bạn đang dùng khi tạo token (User.IsInRole).
        private bool IsEmployee()
        {
            return User.IsInRole("Staff");
        }

        // performedBy = id nhân viên nếu người gọi là nhân viên, null nếu là khách tự thao tác.
        private long? GetPerformedByOrNull()
        {
            return IsEmployee() ? GetCurrentUserId() : null;
        }

        // ===================== TẠO HỘI VIÊN MỚI =====================
        // Chỉ nhân viên được tạo. [FromForm] vì có kèm file ảnh.
        [HttpPost]
        public async Task<IActionResult> CreateMember([FromForm] CreateMemberRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.CreateMemberAsync(request, performedBy);
            return CreatedAtAction(nameof(GetMember), new { id = result.MemberId }, result);
        }

        // ===================== LẤY DANH SÁCH HỘI VIÊN =====================
        // Lọc theo SĐT / tên / chi nhánh (bỏ trống param nào thì không lọc theo param đó)
        [HttpGet]
        public async Task<IActionResult> GetMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            var result = await _memberService.GetMembersAsync(phone, fullName, branchId);
            return Ok(result);
        }

        // ===================== LẤY DANH SÁCH HỘI VIÊN CHỜ KÍCH HOẠT =====================
        // Cùng cấu trúc trả về với GetMembers, luôn lọc Status = PendingActivation.
        // Đặt route cố định "pending" TRƯỚC route {id:long} bên dưới để tránh xung đột.
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            var result = await _memberService.GetPendingMembersAsync(phone, fullName, branchId);
            return Ok(result);
        }

        // ===================== KIỂM TRA TRÙNG SỐ ĐIỆN THOẠI =====================
        // Dùng ở FE ngay sau khi nhập xong form thông tin (bước 1), trước khi cho qua bước chọn gói.
        // Đặt TRƯỚC route {id:long} vì "check-phone" không parse được thành long.
        [HttpGet("check-phone")]
        public async Task<IActionResult> CheckPhoneExists([FromQuery] string phone)
        {
            var exists = await _memberService.CheckPhoneExistsAsync(phone);
            return Ok(new { exists });
        }

        // ===================== LẤY THÔNG TIN CHI TIẾT 1 HỘI VIÊN =====================
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetMember(long id)
        {
            var result = await _memberService.GetByIdAsync(id);
            return Ok(result);
        }

        // ===================== KIỂM TRA ĐÃ CÓ GÓI TẬP CHƯA =====================
        [HttpGet("{id:long}/has-package")]
        public async Task<IActionResult> HasPackage(long id)
        {
            var hasPackage = await _memberService.HasPackageAsync(id);
            return Ok(new { hasPackage });
        }

        // ===================== SỬA THÔNG TIN HỘI VIÊN =====================
        // Nhân viên sửa dùng id trên route, khách tự sửa thì lấy id từ token.
        [HttpPut("{id:long}")]
        public async Task<IActionResult> UpdateMemberInfo(long id, [FromBody] UpdateMemberInfoRequest request)
        {
            var performedBy = GetPerformedByOrNull();
            var targetMemberId = IsEmployee() ? id : GetCurrentUserId();

            var result = await _memberService.UpdateMemberInfoAsync(targetMemberId, request, performedBy);
            return Ok(result);
        }

        // ===================== LỊCH SỬ CẬP NHẬT THÔNG TIN (gộp theo từng phiên lưu) =====================
        [HttpGet("{id:long}/update-history")]
        public async Task<IActionResult> GetUpdateHistory(long id)
        {
            var result = await _memberService.GetUpdateHistoryAsync(id);
            return Ok(result);
        }

        // ===================== SỬA FACE ID / ẢNH ĐẠI DIỆN =====================
        // Chỉ nhân viên được sửa. Luôn bắt buộc có performedBy (không null). [FromForm] vì có kèm file ảnh.
        [HttpPut("{id:long}/face-id")]
        public async Task<IActionResult> UpdateFaceId(long id, [FromForm] UpdateFaceIdRequest request)
        {
            if (!IsEmployee())
                return Forbid(); // hoặc throw UnauthorizedAccessException tùy convention lỗi bạn đang dùng

            var performedBy = GetCurrentUserId();
            var result = await _memberService.UpdateFaceIdAsync(id, request, performedBy);
            return Ok(result);
        }

        // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
        // Dùng cho hội viên CHƯA có gói tập và CHƯA có FaceID (thường là status = PendingActivation).
        // Sau khi tạo xong, status của hội viên được chuyển sang Active.
        [HttpPost("{id:long}/activate-with-package")]
        public async Task<IActionResult> ActivateWithPackage(long id, [FromForm] ActivateMemberWithPackageRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateWithPackageAsync(id, request, performedBy);
            return Ok(result);
        }

        // ===================== KÍCH HOẠT: CHỈ TẠO FACE ID =====================
        // Dùng cho hội viên ĐÃ có gói tập nhưng CHƯA có FaceID.
        // Sau khi tạo xong, status của hội viên được chuyển sang Active.
        [HttpPost("{id:long}/activate-face-id")]
        public async Task<IActionResult> ActivateFaceIdOnly(long id, [FromForm] ActivateMemberFaceIdOnlyRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateFaceIdOnlyAsync(id, request, performedBy);
            return Ok(result);
        }

        // ===================== KHÓA TÀI KHOẢN HỘI VIÊN =====================
        // Chỉ nhân viên được khóa
        [HttpPut("{id:long}/lock")]
        public async Task<IActionResult> LockMember(long id, [FromBody] LockMemberRequest request)
        {
            var performedBy = GetCurrentUserId();
            await _memberService.LockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã khóa tài khoản hội viên." });
        }

        // ===================== MỞ KHÓA TÀI KHOẢN HỘI VIÊN =====================
        // Chỉ nhân viên được mở khóa
        [HttpPut("{id:long}/unlock")]
        public async Task<IActionResult> UnlockMember(long id, [FromBody] UnlockMemberRequest request)
        {
            var performedBy = GetCurrentUserId();
            await _memberService.UnlockMemberAsync(id, request, performedBy);
            return Ok(new { message = "Đã mở khóa tài khoản hội viên." });
        }
    }
}