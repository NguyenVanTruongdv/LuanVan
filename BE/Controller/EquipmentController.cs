using System.Security.Claims;
using BE.DTOs.Equipment;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/equipment")]
    public class EquipmentController : ApiControllerBase
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
            var currentEmployeeId = GetCurrentUserId(); // null nếu là khách

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
            var currentEmployeeId = GetCurrentUserId();

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
            var currentEmployeeId = GetCurrentUserId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var result = await _equipmentService.CreateAsync(dto, currentEmployeeId);
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
            var currentEmployeeId = GetCurrentUserId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.UpdateAsync(id, dto, currentEmployeeId);
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
            var currentEmployeeId = GetCurrentUserId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.SetStatusAsync(id, "Deleted", currentEmployeeId);
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
            var currentEmployeeId = GetCurrentUserId();
            if (currentEmployeeId == null)
                return Unauthorized();

            try
            {
                var success = await _equipmentService.SetStatusAsync(id, "Active", currentEmployeeId);
                return success ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

    }
}