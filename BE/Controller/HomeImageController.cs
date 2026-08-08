using BE.DTOs;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/home-images")]
    public class HomeImageController : ControllerBase
    {
        private readonly HomeImageService _homeImageService;

        public HomeImageController(HomeImageService homeImageService)
        {
            _homeImageService = homeImageService;
        }

      
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetHomeImages()
        {
            var images = await _homeImageService.GetActiveImagesAsync();
            return Ok(images);
        }

      
        [HttpGet("all")]
        public async Task<IActionResult> GetAllImages()
        {
            var images = await _homeImageService.GetAllImagesAsync();
            return Ok(images);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var image = await _homeImageService.GetByIdAsync(id);

            if (image == null)
                return NotFound(new { message = $"Không tìm thấy ảnh với id = {id}" });

            return Ok(image);
        }

     
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromForm] CreateHomeImageRequest request)
        {
            try
            {
                var uploadedBy = GetCurrentEmployeeId();
                var result = await _homeImageService.CreateAsync(request, uploadedBy);

                return CreatedAtAction(nameof(GetById), new { id = result.ImageId }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] UpdateHomeImageRequest request)
        {
            try
            {
                var result = await _homeImageService.UpdateAsync(id, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

      
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _homeImageService.DeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

     
        private long GetCurrentEmployeeId()
        {
            var claim = User.FindFirst("EmployeeId")
                ?? User.FindFirst(ClaimTypes.NameIdentifier);

            if (claim == null || !long.TryParse(claim.Value, out var employeeId))
                throw new UnauthorizedAccessException("Không xác định được nhân viên đang đăng nhập.");

            return employeeId;
        }
    }
}