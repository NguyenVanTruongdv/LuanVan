using System.Security.Claims;
using BE.DTOs.Employee;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/employee")]
    [Authorize]
    public class EmployeeController : ControllerBase
    {
        private readonly EmployeeService _employeeService;

        public EmployeeController(EmployeeService employeeService)
        {
            _employeeService = employeeService;
        }

        // ====================================================================
        // XEM HỒ SƠ / DANH SÁCH
        // ====================================================================

        // Xem hồ sơ "nhân viên" (info + FaceID) của chính mình — mọi role đăng nhập đều xem được.
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            var employee = await _employeeService.GetProfileAsync(currentEmployeeId.Value, currentEmployeeId.Value);
            return employee == null ? NotFound() : Ok(employee);
        }

        // Xem hồ sơ "nhân viên" (info + FaceID) của người khác — chỉ Admin/Manager, Manager bị giới hạn
        // theo chi nhánh và không được xem Admin.
        [HttpGet("{id:long}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetById(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var employee = await _employeeService.GetProfileAsync(id, currentEmployeeId.Value);
                return employee == null ? NotFound() : Ok(employee);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // Xem hồ sơ "tài khoản" (info + login) của 1 nhân viên — chỉ những nhân viên đã có Account.
        [HttpGet("{id:long}/account")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetAccountProfile(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var profile = await _employeeService.GetAccountProfileAsync(id, currentEmployeeId.Value);
                return profile == null ? NotFound() : Ok(profile);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // Danh sách NHÂN VIÊN (luồng FaceID) — chỉ những nhân viên CHƯA có Account.
        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetList([FromQuery] EmployeeFilterDto filter)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.GetListAsync(filter, currentEmployeeId.Value);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // Danh sách TÀI KHOẢN (luồng Account) — chỉ những nhân viên ĐÃ có Account.
        [HttpGet("accounts")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetAccountList([FromQuery] EmployeeAccountFilterDto filter)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.GetAccountListAsync(filter, currentEmployeeId.Value);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // ====================================================================
        // TẠO NHÂN VIÊN
        // ====================================================================

        // Luồng 1: tạo nhân viên KÈM tài khoản đăng nhập — không đụng FaceID.
        [HttpPost("with-account")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CreateWithAccount([FromBody] CreateEmployeeAccountDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.CreateWithAccountAsync(dto, currentEmployeeId.Value);
                return CreatedAtAction(nameof(GetAccountProfile), new { id = result.EmployeeId }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Luồng 2: tạo nhân viên KÈM FaceID (bắt buộc ảnh) — không đụng tài khoản đăng nhập.
        [HttpPost("with-faceid")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateWithFaceId([FromForm] CreateEmployeeFaceIdDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.CreateWithFaceIdAsync(dto, currentEmployeeId.Value);
                return CreatedAtAction(nameof(GetById), new { id = result.EmployeeId }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ====================================================================
        // SỬA THÔNG TIN CƠ BẢN
        // ====================================================================

        // Sửa thông tin cơ bản của nhân viên thuộc luồng TÀI KHOẢN — không đụng FaceID.
        [HttpPut("{id:long}/account-info")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateAccountInfo(long id, [FromBody] UpdateEmployeeAccountInfoDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _employeeService.UpdateAccountInfoAsync(id, dto, currentEmployeeId.Value);
                return success ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Sửa thông tin cơ bản của nhân viên thuộc luồng FACEID — không đụng tài khoản.
        [HttpPut("{id:long}/info")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateInfo(long id, [FromBody] UpdateEmployeeInfoDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _employeeService.UpdateInfoAsync(id, dto, currentEmployeeId.Value);
                return success ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ====================================================================
        // TÀI KHOẢN ĐĂNG NHẬP
        // ====================================================================

      
        // Sửa tài khoản đăng nhập đã có của nhân viên (email đăng nhập, mật khẩu...).
        [HttpPut("{id:long}/account")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateAccount(long id, [FromBody] UpdateEmployeeAccountDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                await _employeeService.UpdateAccountAsync(id, dto, currentEmployeeId.Value);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Khóa CHỈ tài khoản đăng nhập (không đụng Employee.Status / FaceID).
      
        // ====================================================================
        // FACEID
        // ====================================================================

        // Sửa / đăng ký lại FaceID cho nhân viên.
        [HttpPut("{id:long}/face")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateFace(long id, [FromForm] UpdateEmployeeFaceIdDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.UpdateFaceAsync(id, dto, currentEmployeeId.Value);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Lịch sử cập nhật FaceID của nhân viên.
        [HttpGet("{id:long}/face-history")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetFaceHistory(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.GetFaceHistoryAsync(id, currentEmployeeId.Value);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // ====================================================================
        // KHÓA / MỞ KHÓA TOÀN DIỆN
        // ====================================================================

        // Khóa toàn diện nhân viên (Employee.Status + Account nếu có) — bắt buộc nhập lý do.
        [HttpPatch("{id:long}/hide")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Hide(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            

            try
            {
                await _employeeService.LockEmployeeAsync(id, currentEmployeeId.Value);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Mở khóa toàn diện nhân viên.
        [HttpPatch("{id:long}/activate")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Activate(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                await _employeeService.UnlockEmployeeAsync(id, currentEmployeeId.Value);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ====================================================================
        // LỊCH SỬ CẬP NHẬT CHUNG
        // ====================================================================

        [HttpGet("{id:long}/history")]
        public async Task<IActionResult> GetUpdateHistory(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var history = await _employeeService.GetUpdateHistoryAsync(id, currentEmployeeId.Value);
                return Ok(history);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        private long? GetCurrentEmployeeId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && long.TryParse(claim.Value, out var id) ? id : null;
        }
    }
}