using BE.DTOs;
using BE.Services;
using BE.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ForumPostController : ControllerBase
{
    private readonly ForumPostService _service;
    private readonly S3StorageService _storageService;

    private const string ForumImageFolder = "forum-posts";
    private const int MaxImages = 3;

    public ForumPostController(ForumPostService service, S3StorageService storageService)
    {
        _service = service;
        _storageService = storageService;
    }

    private long? GetCurrentMemberId()
    {
        var claim = User.FindFirst("Id") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        return claim is not null && long.TryParse(claim.Value, out var id) ? id : null;
    }

    // Upload từng file một bằng UploadFileAsync (S3StorageService không có hàm upload nhiều file)
    private async Task<List<string>> UploadImagesAsync(List<IFormFile> images, string folder)
    {
        var urls = new List<string>();
        foreach (var file in images)
        {
            var url = await _storageService.UploadFileAsync(file, folder);
            urls.Add(url);
        }
        return urls;
    }

    // Xóa từng file một bằng DeleteFileAsync (S3StorageService không có hàm xóa nhiều file)
    private async Task DeleteImagesAsync(IEnumerable<string> urls)
    {
        foreach (var url in urls)
            await _storageService.DeleteFileAsync(url);
    }

    // GET: api/ForumPost?categoryId=1&sort=latest&page=1&pageSize=10
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetFeed([FromQuery] ForumPostQueryParams query)
    {
        var currentMemberId = GetCurrentMemberId();
        var (items, total) = await _service.GetFeedAsync(query, currentMemberId);

        return Ok(new
        {
            items,
            total,
            page = query.Page,
            pageSize = query.PageSize
        });
    }

    // GET: api/ForumPost/5
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(long id)
    {
        var currentMemberId = GetCurrentMemberId();
        var data = await _service.GetByIdAsync(id, currentMemberId);

        if (data is null)
            return NotFound(new { message = "Không tìm thấy bài viết" });

        return Ok(data);
    }

    // POST: api/ForumPost  (multipart/form-data: title, categoryId, content, images[])
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromForm] ForumPostCreateDto dto, [FromForm] List<IFormFile>? images)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null)
            return Unauthorized();

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (images is { Count: > MaxImages })
            return BadRequest(new { message = $"Chỉ được đăng tối đa {MaxImages} ảnh" });

        if (images is { Count: > 0 })
            dto.ImageUrls = await UploadImagesAsync(images, ForumImageFolder);

        var (success, error, data) = await _service.CreateAsync(memberId.Value, dto);
        if (!success)
        {
            // Upload rồi mà tạo bài thất bại (VD: category không hợp lệ) => xóa ảnh vừa up để tránh rác trên S3
            if (dto.ImageUrls is { Count: > 0 })
                await DeleteImagesAsync(dto.ImageUrls);

            return BadRequest(new { message = error });
        }

        return CreatedAtAction(nameof(GetById), new { id = data!.PostId }, data);
    }

   

    // PUT: api/ForumPost/5  (multipart/form-data: title, categoryId, content,
    //      existingImageUrls[] = ảnh cũ muốn giữ lại, newImages[] = ảnh mới thêm vào)
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(
        long id,
        [FromForm] ForumPostUpdateDto dto,
        [FromForm] List<string>? existingImageUrls,
        [FromForm] List<IFormFile>? newImages)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null)
            return Unauthorized();

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var keptUrls = existingImageUrls ?? new List<string>();
        var newFileCount = newImages?.Count ?? 0;

        if (keptUrls.Count + newFileCount > MaxImages)
            return BadRequest(new { message = $"Chỉ được đăng tối đa {MaxImages} ảnh" });

        List<string> uploadedUrls = new();
        if (newImages is { Count: > 0 })
            uploadedUrls = await UploadImagesAsync(newImages, ForumImageFolder);

        dto.ImageUrls = keptUrls.Concat(uploadedUrls).ToList();

        var (success, error) = await _service.UpdateAsync(id, memberId.Value, dto);
        if (!success)
        {
            // Update thất bại => xóa ảnh vừa upload mới, ảnh cũ (existingImageUrls) không đụng tới
            if (uploadedUrls.Count > 0)
                await DeleteImagesAsync(uploadedUrls);

            return BadRequest(new { message = error });
        }

        return NoContent();
    }

    // DELETE: api/ForumPost/5
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(long id)
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null)
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var (success, error) = await _service.DeleteAsync(id, memberId.Value, isAdmin);
        if (!success)
            return BadRequest(new { message = error });

        return NoContent();
    }

    // PATCH: api/ForumPost/5/hide (Admin ẩn bài vi phạm)
    [HttpPatch("{id}/hide")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Hide(long id)
    {
        var (success, error) = await _service.HideAsync(id);
        if (!success)
            return BadRequest(new { message = error });

        return NoContent();
    }

    // GET: api/ForumPost/top-members?range=week
    [HttpGet("top-members")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTopMembers([FromQuery] string range = "week")
    {
        var data = await _service.GetTopMembersAsync(range);
        return Ok(data);
    }
    // GET: api/ForumPost/my-posts?page=1&pageSize=20
   [HttpGet("my-posts")]
    [Authorize]
    public async Task<IActionResult> GetMyPosts()
    {
        var memberId = GetCurrentMemberId();
        if (memberId is null)
            return Unauthorized();

        var items = await _service.GetMyPostsAsync(memberId.Value);
        return Ok(new { items });
    }
    // GET: api/ForumPost/stats
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var data = await _service.GetCommunityStatsAsync();
        return Ok(data);
    }
    // GET: api/ForumPost/featured?top=3
    [HttpGet("featured")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFeatured([FromQuery] int top = 3)
    {
        var currentMemberId = GetCurrentMemberId();
        var data = await _service.GetFeaturedPostsAsync(currentMemberId, top);
        return Ok(data);
    }
}