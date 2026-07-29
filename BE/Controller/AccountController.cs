using System.Security.Claims;
using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly AccountService _accountService;

        public AccountController(AccountService accountService)
        {
            _accountService = accountService;
        }

        // ------------------------------------------------------------------
        // DTOs
        // ------------------------------------------------------------------

        public class CreateAccountRequest
        {
            public long? MemberId { get; set; }
            public long? EmployeeId { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public string Password { get; set; } = string.Empty;
        }

        public class UpdateAccountInfoRequest
        {
            public string? NewPhone { get; set; }
            public string? NewEmail { get; set; }
        }

        public class ChangePasswordRequest
        {
            public string OldPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        public class ResetPasswordRequest
        {
            public string NewPassword { get; set; } = string.Empty;
        }

        public class LockAccountRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        // ------------------------------------------------------------------
        // Tạo tài khoản
        // ------------------------------------------------------------------

        // POST: api/account
        [HttpPost]
        public async Task<ActionResult<Account>> CreateAccount([FromBody] CreateAccountRequest request)
        {
            try
            {
                var account = await _accountService.CreateAccountAsync(
                    request.MemberId,
                    request.EmployeeId,
                    request.Phone,
                    request.Email,
                    request.Password);

                return CreatedAtAction(nameof(GetById), new { accountId = account.AccountId }, account);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // ------------------------------------------------------------------
        // Sửa thông tin tài khoản (phone / email)
        // ------------------------------------------------------------------

        // PUT: api/account/{accountId}/info
        [HttpPut("{accountId:long}/info")]
        public async Task<ActionResult<Account>> UpdateAccountInfo(long accountId, [FromBody] UpdateAccountInfoRequest request)
        {
            try
            {
                var account = await _accountService.UpdateAccountInfoAsync(accountId, request.NewPhone, request.NewEmail);
                return Ok(account);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // ------------------------------------------------------------------
        // Đổi mật khẩu / đặt lại mật khẩu
        // ------------------------------------------------------------------

        // PUT: api/account/{accountId}/password
        [HttpPut("{accountId:long}/password")]
        public async Task<IActionResult> ChangePassword(long accountId, [FromBody] ChangePasswordRequest request)
        {
            try
            {
                await _accountService.ChangePasswordAsync(accountId, request.OldPassword, request.NewPassword);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // Sai mật khẩu cũ
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/account/{accountId}/password/reset
        // Dùng cho admin/quên mật khẩu — không cần mật khẩu cũ.
        [HttpPut("{accountId:long}/password/reset")]
        [Authorize] // TODO: giới hạn quyền admin/nhân viên phù hợp
        public async Task<IActionResult> ResetPassword(long accountId, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _accountService.ResetPasswordAsync(accountId, request.NewPassword);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // ------------------------------------------------------------------
        // Khóa / mở khóa tài khoản
        // ------------------------------------------------------------------

        // PUT: api/account/{accountId}/lock
        [HttpPut("{accountId:long}/lock")]
        [Authorize] // TODO: giới hạn quyền nhân viên/admin phù hợp
        public async Task<ActionResult<Account>> LockAccount(long accountId, [FromBody] LockAccountRequest request)
        {
            try
            {
                var performedBy = GetCurrentEmployeeId();
                var account = await _accountService.LockAccountAsync(accountId, request.Reason, performedBy);
                return Ok(account);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/account/{accountId}/unlock
        [HttpPut("{accountId:long}/unlock")]
        [Authorize] // TODO: giới hạn quyền nhân viên/admin phù hợp
        public async Task<ActionResult<Account>> UnlockAccount(long accountId)
        {
            try
            {
                var performedBy = GetCurrentEmployeeId();
                var account = await _accountService.UnlockAccountAsync(accountId, performedBy);
                return Ok(account);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // ------------------------------------------------------------------
        // Truy vấn
        // ------------------------------------------------------------------

        // GET: api/account/phone/{phone}
        [HttpGet("phone/{phone}")]
        public async Task<ActionResult<Account>> GetByPhone(string phone)
        {
            var account = await _accountService.GetByPhoneAsync(phone);
            if (account == null)
                return NotFound(new { message = $"Không tìm thấy tài khoản với Số điện thoại = {phone}." });

            return Ok(account);
        }

        // GET: api/account/email/{email}
        [HttpGet("email/{email}")]
        public async Task<ActionResult<Account>> GetByEmail(string email)
        {
            var account = await _accountService.GetByEmailAsync(email);
            if (account == null)
                return NotFound(new { message = $"Không tìm thấy tài khoản với Email = {email}." });

            return Ok(account);
        }

        // GET: api/account/member/{memberId}
        [HttpGet("member/{memberId:long}")]
        public async Task<ActionResult<Account>> GetByMemberId(long memberId)
        {
            var account = await _accountService.GetByMemberIdAsync(memberId);
            if (account == null)
                return NotFound(new { message = $"Không tìm thấy tài khoản của Member Id = {memberId}." });

            return Ok(account);
        }

        // GET: api/account/employee/{employeeId}
        [HttpGet("employee/{employeeId:long}")]
        public async Task<ActionResult<Account>> GetByEmployeeId(long employeeId)
        {
            var account = await _accountService.GetByEmployeeIdAsync(employeeId);
            if (account == null)
                return NotFound(new { message = $"Không tìm thấy tài khoản của Employee Id = {employeeId}." });

            return Ok(account);
        }

        // GET: api/account/{accountId}
        // Lưu ý: AccountService hiện chưa có GetByIdAsync riêng, endpoint này dùng để hỗ trợ
        // CreatedAtAction ở trên. Có thể bổ sung AccountService.GetByIdAsync nếu muốn dùng thật.
        [HttpGet("{accountId:long}")]
        public async Task<ActionResult<Account>> GetById(long accountId)
        {
            var account = await _accountService.GetByMemberIdAsync(accountId)
                           ?? await _accountService.GetByEmployeeIdAsync(accountId);

            if (account == null)
                return NotFound(new { message = $"Không tìm thấy tài khoản có Id = {accountId}." });

            return Ok(account);
        }

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        /// <summary>
        /// Lấy EmployeeId của người đang thực hiện thao tác từ JWT claims.
        /// TODO: đổi tên claim "employeeId" cho khớp với claim thực tế đang dùng khi phát hành JWT.
        /// </summary>
        private long GetCurrentEmployeeId()
        {
            var claim = User.FindFirst("employeeId") ?? User.FindFirst(ClaimTypes.NameIdentifier);

            if (claim == null || !long.TryParse(claim.Value, out var employeeId))
                throw new UnauthorizedAccessException("Không xác định được nhân viên thực hiện thao tác.");

            return employeeId;
        }
    }
}