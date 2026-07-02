using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/packages")]
public class PackageController : ControllerBase
{
    private readonly PackageService _packageService;

    public PackageController(PackageService packageService)
    {
        _packageService = packageService;
    }

    // GET: api/packages?packageName=gym
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? packageName)
    {
        var packages = await _packageService.GetAllAsync(packageName);
        return Ok(packages);
    }

    // GET: api/packages/1
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var package = await _packageService.GetById(id);

        if (package == null)
            return NotFound(new
            {
                message = "Membership plan not found."
            });

        return Ok(package);
    }

    // POST: api/packages
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MembershipPlan membershipPlan)
    {
        var created = await _packageService.CreateAsync(membershipPlan);

        return CreatedAtAction(
            nameof(GetById),
            new { id = created.PlanId },
            created);
    }

    // PUT: api/packages/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MembershipPlan membershipPlan)
    {
        var updated = await _packageService.UpdateAsync(id, membershipPlan);

        if (!updated)
            return NotFound(new
            {
                message = "Không tìm thấy gói  tập!"
            });

        return NoContent();
    }

    // DELETE: api/packages/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _packageService.DeleteAsync(id);

        if (!deleted)
            return NotFound(new
            {
                message = "Không tìm thấy gói  tập!"
            });

        return NoContent();
    }
}