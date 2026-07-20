// using System.Security.Claims;
// using BE.DTOs.Incidents;
// using BE.Services.Identify;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace BE.Controllers;

// [ApiController]
// [Route("api/incidents")]
// [Authorize]
// public class IncidentController : ApiControllerBase
// {
//     private readonly IncidentService _incidentService;

//     public IncidentController(IncidentService incidentService)
//     {
//         _incidentService = incidentService;
//     }

//     /// <summary>
//     /// Danh sách TẤT CẢ báo cáo sự cố (dành cho Manager/Admin duyệt, xem toàn bộ)
//     /// </summary>
//     [HttpGet]
//     public async Task<IActionResult> GetList([FromQuery] IncidentFilterDto filter)
//     {
//         var user = GetCurrentUser();
//         var result = await _incidentService.GetListAsync(filter, user);
//         return Ok(result);
//     }

//     /// <summary>
//     /// Lịch sử báo cáo sự cố do CHÍNH người dùng hiện tại gửi
//     /// (nhân viên chỉ xem báo cáo của mình, hội viên chỉ xem báo cáo của mình)
//     /// </summary>
//     [HttpGet("my")]
//     public async Task<IActionResult> GetMyList([FromQuery] IncidentFilterDto filter)
//     {
//         var user = GetCurrentUser();

//         var result = await _incidentService.GetListAsync(filter, user);
//         return Ok(result);
//     }

//     /// <summary>
//     /// Chi tiết báo cáo sự cố
//     /// </summary>
//     [HttpGet("{id:int}")]
//     public async Task<IActionResult> GetById(int id)
//     {
//         var result = await _incidentService.GetByIdAsync(id);

//         if (result == null)
//             return NotFound("Không tìm thấy báo cáo.");

//         return Ok(result);
//     }
//     [HttpPut("{id}/status")]
//     public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateIncidentStatusDto dto)
//     {
//         var user = GetCurrentUser(); // lấy theo cách bạn đang dùng để lấy JwtUserInfo

//         try
//         {
//             await _incidentService.UpdateStatusAsync(id, dto, user);
//             return Ok(new { message = "Cập nhật trạng thái thành công." });
//         }
//         catch (Exception ex)
//         {
//             return BadRequest(new { message = ex.Message });
//         }
//     }

//     /// <summary>
//     /// Tạo báo cáo sự cố
//     /// </summary>
//     [HttpPost]
//     [Consumes("multipart/form-data")]
//     public async Task<IActionResult> Create([FromForm] CreateIncidentDto dto)
//     {
//         var user = GetCurrentUser();

//         await _incidentService.CreateAsync(dto, user);

//         return Ok(new
//         {
//             message = "Tạo báo cáo thành công."
//         });
//     }

//     /// <summary>
//     /// Cập nhật báo cáo
//     /// </summary>
//     [HttpPut("{id:int}")]
//         public async Task<IActionResult> Update(int id, [FromBody] UpdateIncidentDto dto)
//         {
//             var user = GetCurrentUser();
//             try
//             {
//                 await _incidentService.UpdateAsync(id, dto, user);
//                 return Ok(new { message = "Cập nhật thành công." });
//             }
//             catch (Exception ex)
//             {
//                 return BadRequest(new { message = ex.Message });
//             }
//         }

//     /// <summary>
//     /// Xóa báo cáo
//     /// </summary>
//     [HttpDelete("{id:int}")]
//     public async Task<IActionResult> Delete(int id)
//     {
//         await _incidentService.DeleteAsync(id);

//         return Ok(new
//         {
//             message = "Xóa thành công."
//         });
//     }

//     /// <summary>
//     /// Lấy user hiện tại từ JWT claims, dùng chung cho Create/GetMyList
//     /// để tránh lặp lại logic build JwtUserInfo ở nhiều action.
//     /// </summary>
//   private JwtUserInfo GetCurrentUser()
//     {
//         return new JwtUserInfo
//         {
//             Id = GetCurrentUserId(),
//             EntityType = IsEmployee() ? "Employee" : "Member",
//             Role = User.FindFirst(ClaimTypes.Role)?.Value,
//         };
//     }
// }