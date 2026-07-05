using BE.Dtos.Equipments;
using BE.Services.Equipments;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EquipmentController : ControllerBase
{
    private readonly EquipmentService _equipmentService;

    public EquipmentController(EquipmentService equipmentService)
    {
        _equipmentService = equipmentService;
    }

    /// <summary>
    /// Lấy danh sách thiết bị. Có thể lọc theo branchId, categoryId.
    /// Mặc định chỉ trả về thiết bị chưa bị xóa mềm.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<EquipmentDto>>> GetAll([FromQuery] EquipmentFilterDto filter)
    {
        var result = await _equipmentService.GetAllAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết 1 thiết bị theo id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<EquipmentDto>> GetById(int id)
    {
        var equipment = await _equipmentService.GetByIdAsync(id);

        if (equipment == null)
        {
            return NotFound(new { message = $"Không tìm thấy thiết bị với id {id}" });
        }

        return Ok(equipment);
    }

    /// <summary>
    /// Thêm mới thiết bị
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<EquipmentDto>> Create([FromForm] CreateEquipmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var created = await _equipmentService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.EquipmentId }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật thông tin thiết bị
    /// </summary>
    [HttpPut("{id:int}")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<EquipmentDto>> Update(int id, [FromForm] UpdateEquipmentDto dto)
    {
        try
        {
            var updated = await _equipmentService.UpdateAsync(id, dto);

            if (updated == null)
            {
                return NotFound(new { message = $"Không tìm thấy thiết bị với id {id} (hoặc đã bị xóa)" });
            }

            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa mềm thiết bị (chuyển status sang Deleted, không xóa dữ liệu thật)
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _equipmentService.DeleteAsync(id);

        if (!success)
        {
            return NotFound(new { message = $"Không tìm thấy thiết bị với id {id} (hoặc đã bị xóa trước đó)" });
        }

        return NoContent();
    }

    /// <summary>
    /// Khôi phục thiết bị đã bị xóa mềm
    /// </summary>
    [HttpPatch("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var success = await _equipmentService.RestoreAsync(id);

        if (!success)
        {
            return NotFound(new { message = $"Không tìm thấy thiết bị đã xóa với id {id}" });
        }

        return NoContent();
    }
}