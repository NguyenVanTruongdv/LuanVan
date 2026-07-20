// using System.Security.Claims;
// using BE.DTOs.Payment;
// using BE.Services;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace BE.Controllers
// {
//     [Route("api/payment")]
//     [ApiController]
//     [Authorize(Roles = "Member")]
//     public class PaymentController : ControllerBase
//     {
//         private readonly PaymentService _paymentService;
//         private readonly MemberService _memberService; // [MỚI]

//         public PaymentController(PaymentService paymentService, MemberService memberService)
//         {
//             _paymentService = paymentService;
//             _memberService = memberService; // [MỚI]
//         }
//         [Authorize(Roles = "Member")]
//         [HttpPost("create")]
//         public async Task<IActionResult> CreatePayment(CreatePaymentRequestDto request)
//         {
//             long memberId = long.Parse(
//                 User.FindFirstValue(ClaimTypes.NameIdentifier)!);

//             var result = await _paymentService.CreatePaymentAsync(memberId, request);

//             return Ok(result);
//         }
//         [Authorize(Roles = "Member")]
//         [HttpGet("status/{orderCode}")]
//         public async Task<IActionResult> GetPaymentStatus(string orderCode)
//         {
//             var result = await _paymentService.GetPaymentStatusAsync(orderCode);

//             return Ok(result);
//         }
//         [Authorize(Roles = "Member")]
//         [HttpGet("my-info")]
//         public async Task<IActionResult> GetMyInfoToPayment()
//         {
//             var memberId = long.Parse(
//                 User.FindFirstValue(ClaimTypes.NameIdentifier)!);

//             var result = await _paymentService.GetPaymentPageInfoAsync(memberId);
//             return Ok(result);
//         }

//         [AllowAnonymous]
//         [HttpPost("webhook")]
//         public async Task<IActionResult> Webhook([FromBody] SepayWebhookDto request)
//         {
//             await _paymentService.HandleWebhookAsync(request);

//             return Ok(new
//             {
//                 success = true
//             });
//         }
//         [HttpGet("pending")]
//         public async Task<IActionResult> GetPendingPayment()
//         {
//             var memberId = long.Parse(
//                 User.FindFirstValue(ClaimTypes.NameIdentifier)!);
//             var result = await _paymentService.GetPendingPaymentAsync(memberId);
//             return Ok(result);
//         }

//         [HttpPost("cancel/{orderCode}")]
//         public async Task<IActionResult> CancelPayment(string orderCode)
//         {
//             var memberId = long.Parse(
//                 User.FindFirstValue(ClaimTypes.NameIdentifier)!);
//             await _paymentService.CancelPaymentAsync(memberId, orderCode);
//             return Ok();
//         }

//         // ===================== [MỚI] KIỂM TRA ĐIỀU KIỆN MUA GÓI ONLINE =====================
//         // Dùng cho trang mua gói online: FE gọi trước khi tạo giao dịch (bấm "Chọn mua").
//         // memberId LUÔN lấy từ JWT (ClaimTypes.NameIdentifier), không nhận từ FE, để tránh
//         // 1 member truyền id của người khác vào và dò được trạng thái gói của họ.
//         //
//         // Trả về:
//         //   isPendingActivation : tài khoản chưa từng ra quầy kích hoạt
//         //   hasPendingPackage   : đã có sẵn 1 gói PendingActivation (mua online trước đó)
//         //   canPurchasePackage  : false CHỈ KHI đang Pending VÀ đã có sẵn gói Pending
//         //                         -> FE dùng cờ này để chặn nút "Chọn mua" + hiện thông báo
//         //                         yêu cầu ra quầy kích hoạt trước khi mua thêm.
//         [HttpGet("pending-purchase-status")]
//         public async Task<IActionResult> CheckPendingPurchaseStatus()
//         {
//             var memberId = long.Parse(
//                 User.FindFirstValue(ClaimTypes.NameIdentifier)!);

//             var result = await _memberService.CheckPendingPurchaseStatusAsync(memberId);
//             return Ok(result);
//         }
//     }
// }