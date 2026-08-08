using BE.DTOs.Branches;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/branches")]
public class BranchesController : ControllerBase
{
    private readonly BranchService _branchService;

    public BranchesController(BranchService branchService)
    {
        _branchService = branchService;
    }

    // GET: api/branches?name=&status=&page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] BranchFilterDto filter)
    {
        var result = await _branchService.GetListAsync(filter);
        return Ok(result);
    }

    // GET: api/branches/1
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var branch = await _branchService.GetByIdAsync(id);

        if (branch is null)
            return NotFound(new { message = "Không tìm thấy chi nhánh." });

        return Ok(branch);
    }

    // POST: api/branches
    // Không nhận ảnh ở đây — tạo chi nhánh xong, thêm ảnh qua POST /api/branches/{id}/images
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreateBranchDto dto)
    {
        var created = await _branchService.CreateAsync(dto);

        return CreatedAtAction(nameof(GetById), new { id = created.BranchId }, created);
    }

    // PUT: api/branches/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBranchDto dto)
    {
        var updated = await _branchService.UpdateAsync(id, dto);

        if (updated is null)
            return NotFound(new { message = "Không tìm thấy chi nhánh." });

        return Ok(updated);
    }

    // DELETE: api/branches/1  (soft delete)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> SoftDelete(int id)
    {
        var deleted = await _branchService.SoftDeleteAsync(id);

        if (!deleted)
            return NotFound(new { message = "Không tìm thấy chi nhánh." });

        return NoContent();
    }

    // PUT: api/branches/1/restore
    [HttpPut("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var restored = await _branchService.RestoreAsync(id);

        if (restored is null)
            return NotFound(new { message = "Không tìm thấy chi nhánh đã xóa với id này." });

        return Ok(restored);
    }
         [HttpGet("available-managers")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAvailableManagers()
        {
            var result = await _branchService.GetAvailableManagersAsync();
            return Ok(result);
        }
}