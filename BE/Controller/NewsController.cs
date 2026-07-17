using BE.DTOs.News;
using BE.Models;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/news")]
public class NewsController : ApiControllerBase
{
    private readonly NewsService _newsService;

    public NewsController(NewsService newsService)
    {
        _newsService = newsService;
    }

    // Chỉ Admin và Manager được tạo tin tức
    [HttpPost]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> CreateNews([FromBody] NewsCreateRequestDto request)
    {
        var currentUserId = GetCurrentUserId();
        var currentUserBranchId = GetCurrentUserBranchId();

        var news = new News
        {
            Title = request.Title,
            Summary = request.Summary,
            Content = request.Content,
            BranchId = request.BranchId,
        };

        var created = await _newsService.CreateAsync(news, currentUserId, currentUserBranchId);
        return Ok(created);
    }

    // Admin sửa tất cả, Manager chỉ sửa bài mình tạo
    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UpdateNews(int id, [FromBody] NewsUpdateRequestDto request)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var news = new News
        {
            Title = request.Title,
            Summary = request.Summary,
            Content = request.Content,
            BranchId = request.BranchId,
        };

        var (success, error) = await _newsService.UpdateAsync(id, news, currentUserId, isAdmin);
        if (!success)
        {
            return error switch
            {
                "NotFound" => NotFound(new { message = "Không tìm thấy tin tức." }),
                "Forbidden" => Forbid(),
                _ => BadRequest()
            };
        }

        return Ok(new { message = "Cập nhật thành công." });
    }

    // Ẩn tin tức — cùng luật với Sửa
    [HttpPatch("{id}/hide")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> HideNews(int id)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var (success, error) = await _newsService.HideAsync(id, currentUserId, isAdmin);
        if (!success)
        {
            return error switch
            {
                "NotFound" => NotFound(new { message = "Không tìm thấy tin tức." }),
                "Forbidden" => Forbid(),
                _ => BadRequest()
            };
        }

        return Ok(new { message = "Đã ẩn tin tức." });
    }

    // Danh sách cho khách hàng/hội viên — toàn bộ tin Active, KHÔNG lọc
    [HttpGet]
    public async Task<IActionResult> GetListNews()
    {
        var news = await _newsService.GetPublicListAsync();
        return Ok(news);
    }

    // Danh sách cho Admin/Manager
    [HttpGet("manage")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetStaffListNews([FromQuery] int? branchId, [FromQuery] string? keyword)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var news = await _newsService.GetStaffListAsync(isAdmin, currentUserId, branchId, keyword);
        return Ok(news);
    }
    // Kích hoạt lại tin tức đã ẩn — cùng luật với Sửa/Ẩn
    [HttpPatch("{id}/activate")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> ActivateNews(int id)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var (success, error) = await _newsService.ActivateAsync(id, currentUserId, isAdmin);
        if (!success)
        {
            return error switch
            {
                "NotFound" => NotFound(new { message = "Không tìm thấy tin tức." }),
                "Forbidden" => Forbid(),
                _ => BadRequest()
            };
        }

        return Ok(new { message = "Đã kích hoạt lại tin tức." });
    }
}