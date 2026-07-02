using System.Security.Claims;
using BE.DTOs.Auth;
using BE.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("api/news")]
public class NewsController : ControllerBase
{
    private readonly NewsService _newsService;

    public NewsController(NewsService NewsService)
    {
        _newsService = NewsService;
    }
    [HttpGet]
     public async Task<IActionResult> GetListNews()
    {
        var news= await _newsService.ListNews();
        return Ok(news);
    }
}
