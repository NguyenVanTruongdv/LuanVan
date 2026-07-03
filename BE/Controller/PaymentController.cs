using System.Security.Claims;
using BE.DTOs.Payment;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [Route("api/payment")]
    [ApiController]
    [Authorize(Roles = "Member")]
    public class PaymentController : ControllerBase
    {
        private readonly PaymentService _paymentService;

        public PaymentController(PaymentService paymentService)
        {
            _paymentService = paymentService;
        }
        [Authorize(Roles = "Member")]
        [HttpPost("create")]
        public async Task<IActionResult> CreatePayment(CreatePaymentRequestDto request)
        {
            long memberId = long.Parse(
                User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var result = await _paymentService.CreatePaymentAsync(memberId, request);

            return Ok(result);
        }
        [HttpGet("status/{orderCode}")]
        public async Task<IActionResult> GetPaymentStatus(string orderCode)
        {
            var result = await _paymentService.GetPaymentStatusAsync(orderCode);

            return Ok(result);
        }
        [Authorize(Roles = "Member")]
        [HttpGet("my-info")]
        public async Task<IActionResult> GetMyInfoToPayment()
        {
            var memberId = long.Parse(
                User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var result = await _paymentService.GetPaymentPageInfoAsync(memberId);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> Webhook([FromBody] SepayWebhookDto request)
        {
            await _paymentService.HandleWebhookAsync(request);

            return Ok(new
            {
                success = true
            });
        }
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingPayment()
        {
            var memberId = long.Parse(
                User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _paymentService.GetPendingPaymentAsync(memberId);
            return Ok(result);
        }

        [HttpPost("cancel/{orderCode}")]
        public async Task<IActionResult> CancelPayment(string orderCode)
        {
            var memberId = long.Parse(
                User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _paymentService.CancelPaymentAsync(memberId, orderCode);
            return Ok();
        }
    }
}