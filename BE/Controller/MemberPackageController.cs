// //Controller này dùng cho MemberPackage, tách ra khỏi package
// using BE.Dtos.Member;
// using BE.Dtos.MemberPackage;
// using BE.Services;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace BE.Controllers
// {
//     // Mọi endpoint thao tác trên gói tập của hội viên: kích hoạt (tạo gói lần đầu),
//     // gia hạn/mua gói mới, kiểm tra đã có gói chưa, tra khuyến mãi áp dụng cho 1 gói.
//     // Renew/Activate vẫn gọi qua MemberService vì đó là orchestration (ghép Transaction +
//     // MemberPackage) — chỉ phần đọc thuần khuyến mãi mới gọi trực tiếp PromotionService.
//     [ApiController]
//     [Route("api/members/{memberId:long}/packages")]
//     // [Authorize]
//     public class MemberPackagesController : ApiControllerBase
//     {   
//         private readonly MemberPackageService _memberPackageService;
//         private readonly MemberService _memberService;
//         private readonly PromotionService _promotionService;

//         public MemberPackagesController(MemberService memberService, PromotionService promotionService, MemberPackageService memberPackageService)
//         {
//             _memberService = memberService;
//             _promotionService = promotionService;
//             _memberPackageService= memberPackageService;
//         }

//         [HttpGet()]
//         public async Task<IActionResult> GetCurrentPack(long memberId)
//         {
//             var currentPackage = await _memberService.GetCurrentPackageAsync(memberId);
//             return Ok(new { currentPackage });
//         }

//         [HttpGet("internal")]
//         public async Task<IActionResult> GetCurrentPackInternal(long memberId)
//         {
//             var currentPackage = await _memberService.GetCurrentPackageInternalAsync(memberId);
//             return Ok(new { currentPackage });
//         }
//         // ===================== KIỂM TRA ĐÃ CÓ GÓI TẬP CHƯA =====================
//         [HttpGet("has-any")]
//         public async Task<IActionResult> HasPackage(long memberId)
//         {
//             var hasPackage = await _memberService.HasPackageAsync(memberId);
//             return Ok(new { hasPackage });
//         }

//         // ===================== KÍCH HOẠT: TẠO GÓI TẬP + FACE ID =====================
//         // Dùng cho hội viên CHƯA có gói tập và CHƯA có FaceID.
//         [HttpPost("activate-with-package")]
//         public async Task<IActionResult> ActivateWithPackage(long memberId, [FromForm] ActivateMemberWithPackageRequest request)
//         {
//             var performedBy = GetCurrentUserId();
//             var result = await _memberService.ActivateWithPackageAsync(memberId, request, performedBy);
//             return Ok(result);
//         }

//         // ===================== KÍCH HOẠT: CHỈ TẠO FACE ID (đã có gói tập) =====================
//         [HttpPost("activate-face-id")]
//         public async Task<IActionResult> ActivateFaceIdOnly(long memberId, [FromForm] ActivateMemberFaceIdOnlyRequest request)
//         {
//             var performedBy = GetCurrentUserId();
//             var result = await _memberService.ActivateFaceIdOnlyAsync(memberId, request, performedBy);
//             return Ok(result);
//         }

//         // ===================== GIA HẠN / MUA GÓI MỚI (màn hình thu ngân) =====================
//         [HttpPost("renew")]
//         [Consumes("multipart/form-data")]
//         public async Task<IActionResult> Renew(long memberId, [FromForm] RenewMembershipRequest request)
//         {
//             var performedBy = GetCurrentUserId();
//             var result = await _memberService.RenewMembershipAsync(memberId, request, performedBy);
//             return Ok(result);
//         }

//         // ===================== [MỚI] NGƯNG DÙNG GÓI NỘI BỘ (nhân viên nghỉ / bị thu hồi quyền lợi) =====================
//         // Chốt gói nội bộ (PlanType = NoiBo) đang Active của hội viên tại đúng ngày ngưng
//         // (mặc định hôm nay nếu không truyền suspendDate): ExpiryDate = ngày ngưng, PackageStatus
//         // chuyển "Canceled". Đồng thời tự động "trả lại" thời gian cho các gói khách hàng đã mua
//         // song song trong lúc dùng gói nội bộ (StartDate/ExpiryDate của gói khách hàng đó được
//         // reset lại tính từ đúng ngày ngưng) — chi tiết công thức xem
//         // MemberPackageService.SuspendInternalPackageAsync.
//         // [GIẢ ĐỊNH] Đây là thao tác quản trị (thu hồi quyền lợi nhân viên) nên mình tạm giới hạn
//         // quyền giống GetHistory bên dưới (Staff/Manager/Admin). Chưa siết theo chi nhánh vì gói
//         // nội bộ không rõ có ràng buộc chi nhánh giống lịch sử gói hay không — báo lại nếu cần.
//         [HttpPost("cancel-internal")]
//         [Authorize(Roles = "Staff,Manager,Admin")]
//         public async Task<IActionResult> CancelInternalPackage(long memberId)
//         {   
//             long employeeId= GetCurrentUserId();
//             var effectiveDate =  DateOnly.FromDateTime(DateTime.UtcNow);
//             var result = await _memberPackageService.SuspendInternalPackageAsync(memberId, effectiveDate,employeeId);

//             return Ok(new
//             {
//                 memberPackageId = result.MemberPackageId,
//                 planId = result.PlanId,
//                 packageStatus = result.PackageStatus,
//                 startDate = result.StartDate,
//                 expiryDate = result.ExpiryDate
//             });
//         }

//         // ===================== KHUYẾN MÃI ÁP DỤNG ĐƯỢC CHO 1 GÓI =====================
//         // Đọc thuần, không đụng Member/Transaction — gọi thẳng PromotionService, không qua MemberService.
//         // Route KHÔNG phụ thuộc memberId cụ thể, nhưng để trong nhóm này cho gần luồng gia hạn ở FE.
//         [HttpGet("~/api/plans/{planId:int}/applicable-promotions")]
//         public async Task<IActionResult> GetApplicablePromotions(int planId)
//         {
//             var result = await _promotionService.GetApplicablePromotionsAsync(planId);
//             return Ok(result);
//         }
//          [HttpGet("~/api/member-packages/history")]
//         [Authorize(Roles = "Staff,Manager,Admin")]
//         public async Task<IActionResult> GetHistory([FromQuery] MemberPackageHistoryQuery query)
//         {
//             var employeeId = GetCurrentUserId();
//             List<int>? allowedBranchIds = null;

//             if (!User.IsInRole("Admin"))
//             {
//                 allowedBranchIds = await _memberPackageService.GetManagedBranchIdsAsync(employeeId);

//                 if (query.BranchId.HasValue && !allowedBranchIds.Contains(query.BranchId.Value))
//                     throw new UnauthorizedAccessException(
//                         "Bạn không có quyền xem lịch sử đăng ký của chi nhánh này.");
//             }

//             var result = await _memberPackageService.GetPackageHistoryAsync(query, allowedBranchIds);
//             return Ok(result);
//         }
//     }
    
// }