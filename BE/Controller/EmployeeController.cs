using System.Security.Claims;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/employee")]
    [Authorize]
    public class EmployeeController : ControllerBase
    {
        private readonly EmployeeService _employeeService;

        public EmployeeController(EmployeeService employeeService)
        {
            _employeeService = employeeService;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var employeeIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (employeeIdClaim == null)
                return Unauthorized();

            var employee = await _employeeService.GetProfileAsync(
                long.Parse(employeeIdClaim.Value));

            if (employee == null)
                return NotFound();

            return Ok(employee);
        }
    }
}