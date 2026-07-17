using System.Security.Claims;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/forum-posts/{postId}/like")]
public class ForumLikeController : ControllerBase
{
    private readonly ForumLikeService _service;

    public ForumLikeController(ForumLikeService service)
    {
        _service = service;
    }

    // POST: api/forum-posts/5/like  -> toggle tym/bỏ tym
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> ToggleLike(long postId)
    {
        var memberId = GetMemberId();
        var (success, error, data) = await _service.ToggleLikeAsync(memberId, postId);

        if (!success)
            return BadRequest(new { message = error });

        return Ok(data);
    }

    // GET: api/forum-posts/5/like/status -> kiểm tra hội viên hiện tại đã tym chưa
    [Authorize]
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(long postId)
    {
        var memberId = GetMemberId();
        var hasLiked = await _service.HasLikedAsync(postId, memberId);

        return Ok(new { isLiked = hasLiked });
    }

    private long GetMemberId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("Id")?.Value;

        return long.Parse(claim!);
    }
}