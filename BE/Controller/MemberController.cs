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



        [HttpGet]
        public async Task<IActionResult> GetMembers([FromQuery] string? phone, [FromQuery] string? fullName, [FromQuery] int? branchId)
        {
            if (!IsEmployee())
                return Forbid();

            var result = await _memberService.GetMembersAsync(phone, fullName, branchId);
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

       
        // XEM HỒ SƠ HỘI VIÊN
     

        // =LẤY THÔNG TIN CHI TIẾT 1 HỘI VIÊN 
     
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

    
     // CẬP NHẬT THÔNG TIN HỘI VIÊN
 
        [HttpPut("{id:long}")]
        public async Task<IActionResult> UpdateMemberInfo(long id, [FromBody] UpdateMemberInfoRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetPerformedByOrNull();
            var result = await _memberService.UpdateMemberInfoAsync(id, request, performedBy);
            return Ok(result);
        }

        //  [MỚI] [HỘI VIÊN] TỰ CẬP NHẬT HỒ SƠ CỦA CHÍNH MÌNH 
      
        [Authorize(Roles = "Member")]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request)
        {
            var memberId = GetCurrentUserId();
            var result = await _memberService.UpdateMyProfileAsync(memberId, request);
            return Ok(result);
        }

        // [THU NGÂN] SỬA FACE ID / ẢNH ĐẠI DIỆN
        
        [HttpPut("{id:long}/face-id")]
        public async Task<IActionResult> UpdateFaceId(long id, [FromForm] UpdateFaceIdRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.UpdateFaceIdAsync(id, request, performedBy);
            return Ok(result);
        }

        
        // LỊCH SỬ CẬP NHẬT
        

        // LỊCH SỬ CẬP NHẬT THÔNG TIN 
   
        [HttpGet("{id:long}/update-history")]
        public async Task<IActionResult> GetUpdateHistory(long id)
        {
            var targetMemberId = IsEmployee() ? id : GetCurrentUserId();

            var result = await _memberService.GetUpdateHistoryAsync(targetMemberId);
            return Ok(result);
        }

        
        // [THU NGÂN] KÍCH HOẠT HỘI VIÊN
      

        // KIỂM TRA XEM CÓ GÓI TẬP (PENDING) K ĐỂ KÍCH HOẠT TK 
       
        [HttpGet("{id:long}/has-package")]
        public async Task<IActionResult> CheckHasPack(long id)
        {
            if (!IsEmployee())
                return Forbid();

            var hasPackage = await _memberService.HasPackageAsync(id);
            return Ok(hasPackage);
        }

        // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
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

        [HttpPost("{id:long}/activate-face-id")]
        public async Task<IActionResult> ActivateFaceIdOnly(long id, [FromForm] ActivateMemberFaceIdOnlyRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateFaceIdOnlyAsync(id, request, performedBy);
            return Ok(result);
        }

   

        [HttpPut("{id:long}/lock")]
        public async Task<IActionResult> LockMember(long id, [FromBody] LockMemberRequest request)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.LockMemberAsync(id, request.Reason, performedBy);
            return Ok(new { message = "Đã khóa tài khoản hội viên." });
        }

        [HttpPut("{id:long}/unlock")]
        public async Task<IActionResult> UnlockMember(long id)
        {
            if (!IsEmployee())
                return Forbid();

            var performedBy = GetCurrentUserId();
            await _memberService.UnlockMemberAsync(id, performedBy);
            return Ok(new { message = "Đã mở khóa tài khoản hội viên." });
        }
        // ===================== [NHÂN VIÊN] ĐẶT LẠI MẬT KHẨU HỘI VIÊN (không cần mật khẩu cũ) =====================
            [HttpPut("{id:long}/password/reset")]
            public async Task<IActionResult> ResetMemberPassword(long id, [FromBody] ResetMemberPasswordRequest request)
            {
                if (!IsEmployee())
                    return Forbid();

                var performedBy = GetCurrentUserId();   // THÊM dòng này
                await _memberService.ChangeMemberPasswordAsync(id, request.NewPassword, performedBy);   // truyền thêm performedBy
                return Ok(new { message = "Đã đặt lại mật khẩu hội viên." });
            }
    }

}