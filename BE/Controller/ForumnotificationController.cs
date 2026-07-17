using System.Security.Claims;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/forum-notifications")]
[Authorize]
public class ForumNotificationController : ControllerBase
{
    private readonly ForumNotificationService _service;

    public ForumNotificationController(ForumNotificationService service)
    {
        _service = service;
    }

    // GET: api/forum-notifications?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetMy([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var memberId = GetMemberId();
        var items = await _service.GetByMemberIdAsync(memberId, page, pageSize);
        var unreadCount = await _service.GetUnreadCountAsync(memberId);

        return Ok(new
        {
            items,
            unreadCount,
            page,
            pageSize
        });
    }

    // GET: api/forum-notifications/unread-count -> hiển thị badge số lượng chưa đọc
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var memberId = GetMemberId();
        var count = await _service.GetUnreadCountAsync(memberId);
        return Ok(new { unreadCount = count });
    }

    // PUT: api/forum-notifications/10/read
    [HttpPut("{notificationId}/read")]
    public async Task<IActionResult> MarkAsRead(long notificationId)
    {
        var memberId = GetMemberId();
        await _service.MarkAsReadAsync(notificationId, memberId);
        return Ok(new { message = "Đã đánh dấu thông báo là đã đọc" });
    }

    // PUT: api/forum-notifications/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var memberId = GetMemberId();
        await _service.MarkAllAsReadAsync(memberId);
        return Ok(new { message = "Đã đánh dấu tất cả thông báo là đã đọc" });
    }

    private long GetMemberId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("id")?.Value;

        return long.Parse(claim!);
    }
}