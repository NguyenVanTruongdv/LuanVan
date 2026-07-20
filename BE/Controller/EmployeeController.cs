// using System.Security.Claims;
// using BE.DTOs.Employee;
// using BE.Services;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace BE.Controllers
// {
//     [ApiController]
//     [Route("api/employee")]
//     [Authorize]
//     public class EmployeeController : ControllerBase
//     {
//         private readonly EmployeeService _employeeService;

//         public EmployeeController(EmployeeService employeeService)
//         {
//             _employeeService = employeeService;
//         }

//         [HttpGet("profile")]
//         public async Task<IActionResult> GetProfile()
//         {
//             var employeeId = GetCurrentEmployeeId();
//             if (employeeId == null)
//                 return Unauthorized();

//             var employee = await _employeeService.GetProfileAsync(employeeId.Value);
//             return employee == null ? NotFound() : Ok(employee);
//         }

//         [HttpGet]
//         public async Task<IActionResult> GetList([FromQuery] EmployeeFilterDto filter)
//         {
//             var currentEmployeeId = GetCurrentEmployeeId();
//             if (currentEmployeeId == null)
//                 return Unauthorized();

//             try
//             {
//                 var result = await _employeeService.GetListAsync(filter, currentEmployeeId.Value);
//                 return Ok(result);
//             }
//             catch (UnauthorizedAccessException ex)
//             {
//                 return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
//             }
//         }

//         [HttpPost]
//         [Authorize(Roles = "Admin,Manager")]
//         public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
//         {
//             var currentEmployeeId = GetCurrentEmployeeId();
//             if (currentEmployeeId == null)
//                 return Unauthorized();

//             try
//             {
//                 var result = await _employeeService.CreateAsync(dto, currentEmployeeId.Value);
//                 return CreatedAtAction(nameof(GetProfile), result);
//             }
//             catch (UnauthorizedAccessException ex)
//             {
//                 return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
//             }
//             catch (InvalidOperationException ex)
//             {
//                 return BadRequest(new { message = ex.Message });
//             }
//         }

//         [HttpPut("{id:long}")]
//         [Authorize(Roles = "Admin,Manager")]
//         public async Task<IActionResult> Update(long id, [FromBody] UpdateEmployeeDto dto)
//         {
//             var currentEmployeeId = GetCurrentEmployeeId();
//             if (currentEmployeeId == null)
//                 return Unauthorized();

//             try
//             {
//                 var success = await _employeeService.UpdateAsync(id, dto, currentEmployeeId.Value);
//                 return success ? NoContent() : NotFound();
//             }
//             catch (UnauthorizedAccessException ex)
//             {
//                 return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
//             }
//             catch (InvalidOperationException ex)
//             {
//                 return BadRequest(new { message = ex.Message });
//             }
//         }

//         // Khóa tài khoản nhân viên — bắt buộc nhập lý do
//         [HttpPatch("{id:long}/hide")]
//         [Authorize(Roles = "Admin,Manager")]
//         public async Task<IActionResult> Hide(long id, [FromBody] HideEmployeeDto dto)
//         {
//             var currentEmployeeId = GetCurrentEmployeeId();
//             if (currentEmployeeId == null)
//                 return Unauthorized();

//             if (string.IsNullOrWhiteSpace(dto.Reason))
//                 return BadRequest(new { message = "Vui lòng nhập lý do khóa tài khoản." });

//             try
//             {
//                 var success = await _employeeService.LockAsync(id, dto.Reason, currentEmployeeId.Value);
//                 return success ? NoContent() : NotFound();
//             }
//             catch (UnauthorizedAccessException ex)
//             {
//                 return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
//             }
//         }

//         // Mở khóa tài khoản nhân viên
//         [HttpPatch("{id:long}/activate")]
//         [Authorize(Roles = "Admin,Manager")]
//         public async Task<IActionResult> Activate(long id)
//         {
//             var currentEmployeeId = GetCurrentEmployeeId();
//             if (currentEmployeeId == null)
//                 return Unauthorized();

//             try
//             {
//                 var success = await _employeeService.UnlockAsync(id, currentEmployeeId.Value);
//                 return success ? NoContent() : NotFound();
//             }
//             catch (UnauthorizedAccessException ex)
//             {
//                 return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
//             }
//         }

//         private long? GetCurrentEmployeeId()
//         {
//             var claim = User.FindFirst(ClaimTypes.NameIdentifier);
//             return claim != null && long.TryParse(claim.Value, out var id) ? id : null;
//         }
//     }
// }