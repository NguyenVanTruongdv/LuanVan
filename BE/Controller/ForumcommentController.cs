using System.Security.Claims;
using BE.DTOs;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/forum/comments")]
public class ForumCommentController : ControllerBase
{
    private readonly ForumCommentService _service;
    public ForumCommentController(ForumCommentService service) => _service = service;

    /// <summary>Lấy toàn bộ bình luận của 1 bài viết, đã dựng sẵn cây n cấp</summary>
    [HttpGet("post/{postId}")]
    public async Task<IActionResult> GetByPost(long postId)
    {
        var currentMemberId = GetCurrentMemberId();
        var result = await _service.GetByPostIdAsync(postId, currentMemberId);
        return Ok(result);
    }

    /// <summary>Tạo bình luận mới hoặc trả lời 1 bình luận đã có</summary>
    [HttpPost]
    [Authorize(Roles = "Member")]
    public async Task<IActionResult> Create([FromBody] ForumCommentCreateDto dto)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null) return Unauthorized();

        var (success, error, data) = await _service.CreateAsync(memberId.Value, dto);
        if (!success) return BadRequest(new { message = error });
        return Ok(data);
    }

    /// <summary>Tym / bỏ tym 1 bình luận</summary>
    [HttpPost("{commentId}/like")]
    [Authorize(Roles = "Member")]
    public async Task<IActionResult> ToggleLike(long commentId)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null) return Unauthorized();

        var (success, error, isLiked, likeCount) = await _service.ToggleLikeAsync(commentId, memberId.Value);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { isLiked, likeCount });
    }

    /// <summary>Hội viên tự xóa bình luận của chính mình</summary>
    [HttpDelete("{commentId}")]
    [Authorize(Roles = "Member")]
    public async Task<IActionResult> DeleteOwn(long commentId)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null) return Unauthorized();

        var (success, error) = await _service.DeleteAsync(commentId, requesterId: memberId.Value, isAdmin: false);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Đã xóa bình luận" });
    }

    /// <summary>Admin/nhân viên xóa bất kỳ bình luận nào (vi phạm nội quy...)</summary>
    [HttpDelete("{commentId}/admin")]
    [Authorize(Roles = "Admin,Employee")]
    public async Task<IActionResult> DeleteByAdmin(long commentId)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId is null) return Unauthorized();

        var (success, error) = await _service.DeleteAsync(commentId, requesterId: employeeId.Value, isAdmin: true);
        if (!success) return BadRequest(new { message = error });
        return Ok(new { message = "Đã xóa bình luận (admin)" });
    }

         private long? GetCurrentMemberId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);

        if (claim != null && long.TryParse(claim.Value, out var userId))
            return userId;

        if (long.TryParse(User.FindFirst("memberId")?.Value, out var memberId))
            return memberId;

        return null;
    }

    private long? GetCurrentEmployeeId() =>
        long.TryParse(User.FindFirst("employeeId")?.Value, out var id) ? id : null;
}