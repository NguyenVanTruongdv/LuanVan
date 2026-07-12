//Controller này dùng cho MemberPackage, tách ra khỏi package
using BE.Dtos.Member;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    // Mọi endpoint thao tác trên gói tập của hội viên: kích hoạt (tạo gói lần đầu),
    // gia hạn/mua gói mới, kiểm tra đã có gói chưa, tra khuyến mãi áp dụng cho 1 gói.
    // Renew/Activate vẫn gọi qua MemberService vì đó là orchestration (ghép Transaction +
    // MemberPackage) — chỉ phần đọc thuần khuyến mãi mới gọi trực tiếp PromotionService.
    [ApiController]
    [Route("api/members/{memberId:long}/packages")]
    [Authorize]
    public class MemberPackagesController : ApiControllerBase
    {
        private readonly MemberService _memberService;
        private readonly PromotionService _promotionService;

        public MemberPackagesController(MemberService memberService, PromotionService promotionService)
        {
            _memberService = memberService;
            _promotionService = promotionService;
        }

        [HttpGet()]
        public async Task<IActionResult> GetCurrentPack(long memberId)
        {
            var currentPackage = await _memberService.GetCurrentPackageAsync(memberId);
            return Ok(new { currentPackage });
        }

        // ===================== KIỂM TRA ĐÃ CÓ GÓI TẬP CHƯA =====================
        [HttpGet("has-any")]
        public async Task<IActionResult> HasPackage(long memberId)
        {
            var hasPackage = await _memberService.HasPackageAsync(memberId);
            return Ok(new { hasPackage });
        }

        // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
        // Dùng cho hội viên CHƯA có gói tập và CHƯA có FaceID.
        [HttpPost("activate-with-package")]
        public async Task<IActionResult> ActivateWithPackage(long memberId, [FromForm] ActivateMemberWithPackageRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateWithPackageAsync(memberId, request, performedBy);
            return Ok(result);
        }

        // ===================== KÍCH HOẠT: CHỈ TẠO FACE ID (đã có gói tập) =====================
        [HttpPost("activate-face-id")]
        public async Task<IActionResult> ActivateFaceIdOnly(long memberId, [FromForm] ActivateMemberFaceIdOnlyRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.ActivateFaceIdOnlyAsync(memberId, request, performedBy);
            return Ok(result);
        }

        // ===================== GIA HẠN / MUA GÓI MỚI (màn hình thu ngân) =====================
        [HttpPost("renew")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Renew(long memberId, [FromForm] RenewMembershipRequest request)
        {
            var performedBy = GetCurrentUserId();
            var result = await _memberService.RenewMembershipAsync(memberId, request, performedBy);
            return Ok(result);
        }

        // ===================== KHUYẾN MÃI ÁP DỤNG ĐƯỢC CHO 1 GÓI =====================
        // Đọc thuần, không đụng Member/Transaction — gọi thẳng PromotionService, không qua MemberService.
        // Route KHÔNG phụ thuộc memberId cụ thể, nhưng để trong nhóm này cho gần luồng gia hạn ở FE.
        [HttpGet("~/api/plans/{planId:int}/applicable-promotions")]
        public async Task<IActionResult> GetApplicablePromotions(int planId)
        {
            var result = await _promotionService.GetApplicablePromotionsAsync(planId);
            return Ok(result);
        }
    }
}