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

        // Xem hồ sơ của chính mình — mọi role đăng nhập đều xem được.
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var employeeId = GetCurrentEmployeeId();
            if (employeeId == null)
                return Unauthorized();

            var employee = await _employeeService.GetProfileAsync(employeeId.Value, employeeId.Value);
            return employee == null ? NotFound() : Ok(employee);
        }

        // Xem hồ sơ nhân viên khác — chỉ Admin/Manager, Manager bị giới hạn theo chi nhánh và không được xem Admin.
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

        // Danh sách nhân viên — hỗ trợ lọc theo tên/sđt/email/chi nhánh/trạng thái.
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

        // Trường hợp 1: tạo nhân viên kèm tài khoản đăng nhập + FaceID (bắt buộc ảnh).
        [HttpPost("with-account")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateWithAccount([FromForm] CreateEmployeeWithAccountDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.CreateWithAccountAsync(dto, currentEmployeeId.Value);
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

        // Trường hợp 2: tạo hồ sơ nhân viên + FaceID, chưa cấp tài khoản đăng nhập.
        [HttpPost("with-faceid")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateWithFaceId([FromForm] CreateEmployeeWithFaceIdDto dto)
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

        // Sửa thông tin cơ bản của nhân viên (không đụng Account/FaceID).
        [HttpPut("{id:long}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateEmployeeDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _employeeService.UpdateAsync(id, dto, currentEmployeeId.Value);
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

        // Thêm tài khoản đăng nhập cho nhân viên đã có info nhưng chưa có tài khoản.
        [HttpPost("{id:long}/account")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> AddAccount(long id, [FromBody] AddEmployeeAccountDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _employeeService.AddAccountAsync(id, dto, currentEmployeeId.Value);
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

        // Sửa tài khoản đăng nhập đã có của nhân viên.
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

        // Khóa toàn diện nhân viên (Employee.Status + Account nếu có) — bắt buộc nhập lý do.
        [HttpPatch("{id:long}/hide")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Hide(long id, [FromBody] HideEmployeeDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new { message = "Vui lòng nhập lý do khóa tài khoản." });

            try
            {
                await _employeeService.LockEmployeeAsync(id, dto.Reason, currentEmployeeId.Value);
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

        // Khóa CHỈ tài khoản đăng nhập (không đụng Employee.Status / FaceID).
        [HttpPatch("{id:long}/account/lock")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> LockAccountOnly(long id, [FromBody] LockAccountOnlyDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new { message = "Vui lòng nhập lý do khóa tài khoản." });

            try
            {
                await _employeeService.LockAccountOnlyAsync(id, dto.Reason, currentEmployeeId.Value);
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Mở khóa CHỈ tài khoản đăng nhập.
        [HttpPatch("{id:long}/account/unlock")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UnlockAccountOnly(long id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                await _employeeService.UnlockAccountOnlyAsync(id, currentEmployeeId.Value);
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

        private long? GetCurrentEmployeeId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && long.TryParse(claim.Value, out var id) ? id : null;
        }
                [HttpGet("{employeeId:long}/history")]
        public async Task<IActionResult> GetUpdateHistory(long employeeId)
        {
            var currentEmployeeId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            try
            {
                var history = await _employeeService.GetUpdateHistoryAsync(employeeId, currentEmployeeId);
                return Ok(history);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }
    }
}