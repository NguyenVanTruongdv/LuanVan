using BE.DTOs;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForumCategoryController : ControllerBase
{
    private readonly ForumCategoryService _service;

    public ForumCategoryController(ForumCategoryService service)
    {
        _service = service;
    }

    // GET: api/ForumCategory?includeInactive=false
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var data = await _service.GetAllAsync(includeInactive);
        return Ok(data);
    }

    // GET: api/ForumCategory/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _service.GetByIdAsync(id);
        if (data is null)
            return NotFound(new { message = "Không tìm thấy danh mục" });

        return Ok(data);
    }

    // POST: api/ForumCategory
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ForumCategoryCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, data) = await _service.CreateAsync(dto);
        if (!success)
            return BadRequest(new { message = error });

        return CreatedAtAction(nameof(GetById), new { id = data!.CategoryId }, data);
    }

    // PUT: api/ForumCategory/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ForumCategoryUpdateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error) = await _service.UpdateAsync(id, dto);
        if (!success)
            return BadRequest(new { message = error });

        return NoContent();
    }

    // DELETE: api/ForumCategory/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var (success, error) = await _service.DeleteAsync(id);
        if (!success)
            return BadRequest(new { message = error });

        return NoContent();
    }
    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var (success, error) = await _service.DeactivateAsync(id);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Đã ẩn danh mục" });
    }

    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var (success, error) = await _service.ActivateAsync(id);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Đã hiện lại danh mục" });
    }
}