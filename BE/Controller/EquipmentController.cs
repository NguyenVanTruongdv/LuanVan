using System.Security.Claims;
using BE.DTOs.Equipment;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/equipment")]
    public class EquipmentController : ControllerBase
    {
        private readonly EquipmentService _equipmentService;

        public EquipmentController(EquipmentService equipmentService)
        {
            _equipmentService = equipmentService;
        }

       
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetList([FromQuery] EquipmentFilterDto filter)
        {
            var currentEmployeeId = GetCurrentEmployeeId(); // null nếu là khách

            try
            {
                var result = await _equipmentService.GetListAsync(filter, currentEmployeeId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();

            try
            {
                var equipment = await _equipmentService.GetByIdAsync(id, currentEmployeeId);
                return equipment == null ? NotFound() : Ok(equipment);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] CreateEquipmentDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _equipmentService.CreateAsync(dto, currentEmployeeId.Value);
                return CreatedAtAction(nameof(GetById), new { id = result.EquipmentId }, result);
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

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Manager")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Update(int id, [FromForm] UpdateEquipmentDto dto)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.UpdateAsync(id, dto, currentEmployeeId.Value);
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

        [HttpPatch("{id:int}/hide")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Hide(int id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.SetStatusAsync(id, "Deleted", currentEmployeeId.Value);
                return success ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpPatch("{id:int}/activate")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Activate(int id)
        {
            var currentEmployeeId = GetCurrentEmployeeId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.SetStatusAsync(id, "Active", currentEmployeeId.Value);
                return success ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        private long? GetCurrentEmployeeId()
            {
                var role = User.FindFirstValue(ClaimTypes.Role);

                // Member không có EmployeeId
                if (role == "Member")
                    return null;

                return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
                    ? id
                    : null;
            }
    }
}