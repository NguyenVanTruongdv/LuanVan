
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using static BE.Services.MembershipPlanService;

namespace BE.Controllers;


[ApiController]
[Route("api/packages")]
public class MembershipPlansController : ApiControllerBase
{
    private readonly MembershipPlanService _membershipPlanService;

    public MembershipPlansController(MembershipPlanService membershipPlanService)
    {
        _membershipPlanService = membershipPlanService;
    }

    // GET: api/packages?packageName=gym
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? packageName)
    {
        var packages = await _membershipPlanService.GetAllAsync(packageName);
        return Ok(packages);
    }

    // GET: api/packages/1
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var package = await _membershipPlanService.GetByIdAsync(id);

        if (package == null)
            return NotFound(new
            {
                message = "Membership plan not found."
            });

        return Ok(package);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MembershipPlanRequest request)
    {
        var created = await _membershipPlanService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = created.PlanId },
            created);
    }

    // PUT: api/packages/1
    
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MembershipPlanRequest request)
    {
        var updated = await _membershipPlanService.UpdateAsync(id, request);

        if (!updated)
            return NotFound(new
            {
                message = "Không tìm thấy gói  tập!"
            });

        return NoContent();
    }

    // PATCH: api/packages/1/status
   
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateMembershipPlanStatusRequest request)
    {
        var updated = await _membershipPlanService.UpdateStatusAsync(id, request.Status);

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
        var deleted = await _membershipPlanService.DeleteAsync(id);

        if (!deleted)
            return NotFound(new
            {
                message = "Không tìm thấy gói  tập!"
            });

        return NoContent();
    }
}