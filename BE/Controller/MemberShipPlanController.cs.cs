using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

// Đổi tên từ PackageController -> MembershipPlansController cho đúng với domain: đây là
// CRUD danh sách gói tập để bán (MembershipPlan), không phải MemberPackage (đăng ký tập của
// hội viên — xem MemberPackagesController). Giữ nguyên route "api/packages" để không phá FE hiện tại.
[ApiController]
[Route("api/packages")]
public class MembershipPlansController : ApiControllerBase
{
    private readonly MembershipPlanService _membershipPlanService;
    private readonly TransactionService _transactionService;

    public MembershipPlansController(MembershipPlanService membershipPlanService, TransactionService transactionService)
    {
        _membershipPlanService = membershipPlanService;
        _transactionService = transactionService;
    }

    // GET: api/packages?packageName=gym
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? packageName)
    {
        var packages = await _membershipPlanService.GetAllAsync(packageName);
        return Ok(packages);
    }
     [HttpGet("internal")]
     [Authorize (Roles ="Admin,Manager,Staff")]
    public async Task<IActionResult> GetAllInternal([FromQuery] string? packageName)
    {
        var packages = await _membershipPlanService.GetAllInternalAsync(packageName);
        return Ok(packages);
    }
    // GET: api/packages/1
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var package = await _membershipPlanService.GetById(id);

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
        var created = await _membershipPlanService.CreateAsync(membershipPlan);

        return CreatedAtAction(
            nameof(GetById),
            new { id = created.PlanId },
            created);
    }

    // PUT: api/packages/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MembershipPlan membershipPlan)
    {
        var updated = await _membershipPlanService.UpdateAsync(id, membershipPlan);

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

    // GET: api/packages/history
    // Lịch sử đăng ký gói — bản chất là lịch sử Transaction, nên gọi TransactionService.
    
   
}