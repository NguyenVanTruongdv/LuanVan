using BE.Data;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class NewsService 
{

    private readonly GymManagementContext _db;


    public NewsService(GymManagementContext db)
    {
        _db = db;
    }
    public async Task<List<NewsReponseDto>> ListNews()
    {
        return await _db.News.Where(n => n.Status == NewsEnum.Active.ToString()).Select(n => new NewsReponseDto
        {
            Title = n.Title,
            Summary =n.Summary,
            Content = n.Content
        }).ToListAsync();

    }
}