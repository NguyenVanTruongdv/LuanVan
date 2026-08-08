using System.Security.Claims;
using BE.Dtos.Transaction;
using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{

    [ApiController]
    [Route("api/transactions")]
    [Authorize]
    public class TransactionsController : ApiControllerBase
    {
        private readonly TransactionService _transactionService;
        private readonly IHttpClientFactory _httpClientFactory;

        public TransactionsController(
            TransactionService transactionService,
            IHttpClientFactory httpClientFactory)
        {
            _transactionService = transactionService;
            _httpClientFactory = httpClientFactory;
        }


        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var transaction = await _transactionService.GetByIdAsync(id);
            if (transaction == null)
                return NotFound(new { message = "Không tìm thấy giao dịch." });


            var memberPackage = transaction.MemberPackages?
                .OrderByDescending(mp => mp.CreatedAt)
                .FirstOrDefault();

            return Ok(new
            {
                transaction.TransactionId,
                transaction.OrderCode,
                transaction.MemberId,
                MemberName = transaction.Member?.FullName,
                transaction.PlanId,
                PlanName = transaction.Plan?.PlanName,
                transaction.GiaGoc,
                transaction.Amount,
                transaction.PaymentMethod,
                transaction.PaymentStatus,
                transaction.BankReferenceCode,
                InvoiceUrl = transaction.ReceiptImage, // dùng lại cột receipt_image cho PDF hóa đơn
                transaction.CreatedAt,
                // [MỚI] Ngày bắt đầu gói (mốc thật dùng để tính ngày hết hạn) — KHÁC với CreatedAt
                // ở trên (thời điểm tạo giao dịch/hóa đơn). Có thể null nếu gói đang PendingActivation
                // chưa có StartDate.
                StartDate = memberPackage?.StartDate,
                ExpiryDate = memberPackage?.ExpiryDate
            });
        }


        [HttpGet("{id:long}/invoice")]
        public async Task<IActionResult> GetInvoice(long id)
        {
            var transaction = await _transactionService.GetByIdAsync(id);
            if (transaction == null)
                return NotFound(new { message = "Không tìm thấy giao dịch." });

            if (string.IsNullOrEmpty(transaction.ReceiptImage))
                return NotFound(new { message = "Giao dịch này chưa có hóa đơn." });

            var client = _httpClientFactory.CreateClient();

            HttpResponseMessage s3Response;
            try
            {
                s3Response = await client.GetAsync(transaction.ReceiptImage);
            }
            catch (Exception)
            {
                return StatusCode(502, new { message = "Không thể tải hóa đơn từ nơi lưu trữ." });
            }

            if (!s3Response.IsSuccessStatusCode)
                return NotFound(new { message = "Tệp hóa đơn không tồn tại hoặc đã bị xóa." });

            var bytes = await s3Response.Content.ReadAsByteArrayAsync();
            var contentType = s3Response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";

            // "inline" để trình duyệt hiển thị trực tiếp (ảnh/pdf) thay vì tải xuống
            Response.Headers.Append("Content-Disposition", "inline; filename=\"invoice.jpg\"");

            return File(bytes, contentType);
        }

        [HttpGet("my-history")]
        public async Task<IActionResult> GetMyHistory()
        {

            var memberId = GetCurrentUserId();

            var result = await _transactionService.GetMyHistoryAsync(memberId);
            return Ok(result);
        }


        [HttpGet("{id:long}/adjust-plan-preview")]
        public async Task<IActionResult> PreviewAdjustPlan(long id, [FromQuery] int newPlanId)
        {
            var employeeId = GetCurrentUserId();

            try
            {
                var preview = await _transactionService.PreviewAdjustTransactionPlanAsync(id, newPlanId, employeeId);

                return Ok(new
                {
                    NewPlanId = preview.PlanId,
                    NewPlanName = preview.PlanName,
                    GiaGoc = preview.GiaGoc,
                    DiscountAmount = preview.DiscountAmount,
                    Amount = preview.Amount,
                    BonusDays = preview.BonusDays,
                    PromotionId = preview.PromotionId,
                    PromotionName = preview.PromotionName,
                    StartDate = preview.StartDate,
                    NewExpiryDate = preview.NewExpiryDate
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:long}/adjust-plan")]
        public async Task<IActionResult> AdjustPlan(long id, [FromBody] AdjustTransactionPlanRequest request)
        {
            var employeeId = GetCurrentUserId();

            try
            {
                var transaction = await _transactionService.AdjustTransactionPlanAsync(
                    id,
                    request.NewPlanId,
                    employeeId,
                    request.Reason);

                var memberPackage = transaction.MemberPackages?
                    .OrderByDescending(mp => mp.CreatedAt)
                    .FirstOrDefault();

                return Ok(new
                {
                    transaction.TransactionId,
                    transaction.OrderCode,
                    transaction.PlanId,
                    PlanName = transaction.Plan?.PlanName,
                    transaction.GiaGoc,
                    transaction.Amount,
                    transaction.PromotionId,
                    StartDate = memberPackage?.StartDate,
                    ExpiryDate = memberPackage?.ExpiryDate,
                    transaction.UpdatedAt
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpGet("{id:long}/adjustment-history")]
        public async Task<IActionResult> GetAdjustmentHistory(long id)
        {
            var employeeId = GetCurrentUserId();

            try
            {
                var result = await _transactionService.GetTransactionAdjustmentHistoryAsync(id, employeeId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
                [FromQuery] string? keyword,
                [FromQuery] string? status,
                [FromQuery] int? branchId,
                [FromQuery] string? channel)
        {
            var employeeId = GetCurrentUserId();
            var data = await _transactionService.GetHistoryRegisPac(keyword, status, channel, branchId, employeeId);
            return Ok(data);
        }
    }

}