using System.Security.Claims;
using BE.Dtos.Transaction;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    // Mọi endpoint đọc thông tin giao dịch/hóa đơn, và điều chỉnh lại gói tập khi nhân viên
    // thao tác nhầm lúc bán tại quầy. Không có endpoint tạo giao dịch riêng — Transaction luôn
    // được tạo kèm theo tạo/gia hạn gói tập, đi qua MemberPackagesController.
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

        // ===================== XEM CHI TIẾT GIAO DỊCH =====================
        // FE dùng endpoint này để lấy thông tin GÓI CŨ (PlanId/PlanName) trước khi cho nhân viên
        // chọn gói mới ở màn hình điều chỉnh.
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            var transaction = await _transactionService.GetByIdAsync(id);
            if (transaction == null)
                return NotFound(new { message = "Không tìm thấy giao dịch." });

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
                transaction.CreatedAt
            });
        }

        // ===================== XEM HÓA ĐƠN (PROXY TỪ S3, TRÁNH CORS) =====================
        // BE tải nội dung từ S3 về rồi trả thẳng cho FE (cùng origin với API),
        // thay vì Redirect (302) sang thẳng URL S3 — tránh vấn đề CORS khi FE
        // dùng fetch/XHR/iframe để đọc nội dung bằng JS.
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
        public async Task<IActionResult> GetMyHistory([FromQuery] string? status, [FromQuery] string? channel)
        {
            // Khách hàng gọi API này -> GetCurrentUserId() trả về đúng MemberId của họ
            // (miễn là token member cũng set MemberId vào ClaimTypes.NameIdentifier lúc đăng nhập).
            var memberId = GetCurrentUserId();

            var result = await _transactionService.GetMyHistoryAsync(memberId, status, channel);
            return Ok(result);
        }

        // ===================== [MỚI] XEM TRƯỚC KẾT QUẢ ĐIỀU CHỈNH GÓI (KHÔNG LƯU DB) =====================
        // FE gọi API này khi nhân viên chọn gói mới ở màn hình điều chỉnh, TRƯỚC khi bấm xác nhận.
        // BE tự tra + tính KM hiệu lực cho gói mới tại thời điểm giao dịch GỐC được tạo và trả về
        // giá/KM/ngày hết hạn dự kiến để FE hiển thị — không còn cho FE tự chọn promotionId nữa.
        // Cùng quyền với adjust-plan (Manager chỉ xem được giao dịch chi nhánh mình quản lý).
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

        // ===================== [MỚI] ĐIỀU CHỈNH LẠI GÓI TẬP DO NHÂN VIÊN THAO TÁC NHẦM =====================
        // Chỉ RoleId 2 (Manager) hoặc 3 (Admin) mới gọi được — Admin sửa được mọi chi nhánh,
        // Manager chỉ sửa được giao dịch thuộc chi nhánh mình quản lý. Việc kiểm tra quyền này
        // nằm trong TransactionService.AdjustTransactionPlanAsync (qua EnsureAdjustPermissionAsync),
        // controller chỉ bắt exception và map ra đúng status code.
        //
        // [MỚI] Không còn nhận NewPromotionId từ FE — BE tự tra khuyến mãi hiệu lực tại thời điểm
        // giao dịch gốc được tạo (xem TransactionService.AdjustTransactionPlanAsync). FE nên gọi
        // adjust-plan-preview ở trên trước để hiển thị cho nhân viên xem, endpoint này chỉ để XÁC
        // NHẬN và LƯU thật.
        //
        // employeeId lấy từ GetCurrentUserId() — dùng chung 1 helper với GetMyHistory ở trên vì
        // cả 2 đều đọc claim NameIdentifier; token nhân viên và token member khác nhau về NỘI DUNG
        // (giá trị bên trong là EmployeeId hay MemberId) nhưng cùng CƠ CHẾ đọc claim.
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

                return Ok(new
                {
                    transaction.TransactionId,
                    transaction.OrderCode,
                    transaction.PlanId,
                    PlanName = transaction.Plan?.PlanName,
                    transaction.GiaGoc,
                    transaction.Amount,
                    transaction.PromotionId,
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
    }
}