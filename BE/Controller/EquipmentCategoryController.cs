using System.Security.Claims;
using BE.DTOs.Auth;
using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/EquipmentCategory")]
public class EquipmentCategoryController : ControllerBase
{
    private readonly EquipmentCategoryService _service;

    public EquipmentCategoryController(EquipmentCategoryService service)
    {
        _service = service;
    }
    // GET: api/EquipmentCategory
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _service.GetAllAsync();
        return Ok(list);
    }

    // GET: api/EquipmentCategory/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var category = await _service.GetByIdAsync(id);
        if (category == null)
            return NotFound($"Không tìm thấy danh mục có Id = {id}");

        return Ok(category);
    }

    // POST: api/EquipmentCategory
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EquipmentCategory category)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _service.CreateAsync(category);
        return CreatedAtAction(nameof(GetById), new { id = created.CategoryId }, created);
    }

    // PUT: api/EquipmentCategory/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EquipmentCategory category)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _service.UpdateAsync(id, category);
        if (!result)
            return NotFound($"Không tìm thấy danh mục có Id = {id}");

        return Ok("Cập nhật thành công");
    }

    // DELETE: api/EquipmentCategory/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await _service.DeleteAsync(id);
            if (!result)
                return NotFound($"Không tìm thấy danh mục có Id = {id}");

            return Ok("Xóa thành công");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
