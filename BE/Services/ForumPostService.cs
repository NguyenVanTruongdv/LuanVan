using BE.Data;
using BE.DTOs;
using BE.Models;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ForumPostService
{
    private readonly GymManagementContext _context;
    private readonly S3StorageService _storageService;

    // Danh sách từ ngữ thô tục / cấm dùng trong bài viết 
   
    private static readonly List<string> BadWordList = new List<string>
    {
       "ngu","cho","đm"
    };

    public ForumPostService(GymManagementContext context, S3StorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    // ===== Helper: kiểm tra 1 đoạn text có chứa từ thô tục không =====
    private static bool ContainsBadWord(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        string textThuong = text.ToLower();

        foreach (var badWord in BadWordList)
        {
            if (textThuong.Contains(badWord))
            {
                return true;
            }
        }

        return false;
    }

    // ===== LẤY DANH SÁCH (FEED) =====
    public async Task<(List<ForumPostDto> Items, int Total)> GetFeedAsync(ForumPostQueryParams query, long? currentMemberId)
    {
        var q = _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Include(p => p.Category)
            .Include(p => p.ForumPostImages)
            .Where(p => p.Status == "Active")
            .AsQueryable();

        if (query.CategoryId.HasValue)
        {
            q = q.Where(p => p.CategoryId == query.CategoryId.Value);
        }

        if (query.MemberId.HasValue)
        {
            q = q.Where(p => p.MemberId == query.MemberId.Value);
        }

        // Thịnh hành: tym nhiều nhất trước, bằng tym thì xét đến comment nhiều nhất
        if (query.Sort == "trending")
        {
            q = q.OrderByDescending(p => p.LikeCount)
                 .ThenByDescending(p => p.CommentCount)
                 .ThenByDescending(p => p.CreatedAt);
        }
        else
        {
            // Mới nhất: theo thời gian tạo
            q = q.OrderByDescending(p => p.CreatedAt);
        }

        int total = await q.CountAsync();

        var posts = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        List<long> postIds = new List<long>();
        foreach (var p in posts)
        {
            postIds.Add(p.PostId);
        }

        List<long> likedPostIds = new List<long>();
        if (currentMemberId.HasValue)
        {
            likedPostIds = await _context.ForumLikes
                .Where(l => postIds.Contains(l.PostId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.PostId)
                .ToListAsync();
        }

        List<ForumPostDto> items = new List<ForumPostDto>();
        foreach (var p in posts)
        {
            items.Add(MapToDto(p, likedPostIds));
        }

        return (items, total);
    }

    // ===== LẤY CHI TIẾT 1 BÀI =====
    public async Task<ForumPostDto?> GetByIdAsync(long postId, long? currentMemberId)
    {
        var post = await _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Include(p => p.Category)
            .Include(p => p.ForumPostImages)
            .FirstOrDefaultAsync(p => p.PostId == postId && p.Status != "Deleted");

        if (post == null)
        {
            return null;
        }

        List<long> likedPostIds = new List<long>();
        if (currentMemberId.HasValue)
        {
            bool daTym = await _context.ForumLikes
                .AnyAsync(l => l.PostId == postId && l.MemberId == currentMemberId.Value);

            if (daTym)
            {
                likedPostIds.Add(postId);
            }
        }

        return MapToDto(post, likedPostIds);
    }

    // ===== TẠO BÀI VIẾT MỚI (Original) =====
    public async Task<(bool Success, string? Error, ForumPostDto? Data)> CreateAsync(long memberId, ForumPostCreateDto dto)
    {
        if (dto.ImageUrls != null && dto.ImageUrls.Count > 3)
        {
            return (false, "Chỉ được đăng tối đa 3 ảnh", null);
        }

        if (ContainsBadWord(dto.Title) || ContainsBadWord(dto.Content))
        {
            return (false, "Tiêu đề hoặc nội dung chứa từ ngữ không phù hợp", null);
        }

        bool categoryExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryId == dto.CategoryId && c.Status == "Active");

        if (!categoryExists)
        {
            return (false, "Danh mục không tồn tại hoặc đã ngừng hoạt động", null);
        }

        var post = new ForumPost
        {
            MemberId = memberId,
            Title = dto.Title,
            CategoryId = dto.CategoryId,
            Content = dto.Content,
            PostType = "Original",
            Status = "Active",
            LikeCount = 0,
            CommentCount = 0,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        if (dto.ImageUrls != null && dto.ImageUrls.Count > 0)
        {
            sbyte order = 0;
            foreach (var url in dto.ImageUrls)
            {
                post.ForumPostImages.Add(new ForumPostImage
                {
                    ImageUrl = url,
                    SortOrder = order,
                    UploadedAt = DateTime.Now
                });
                order = (sbyte)(order + 1);
            }
        }

        _context.ForumPosts.Add(post);
        await _context.SaveChangesAsync();

        var created = await GetByIdAsync(post.PostId, memberId);
        return (true, null, created);
    }

    // ===== SỬA BÀI VIẾT =====
    public async Task<(bool Success, string? Error)> UpdateAsync(long postId, long memberId, ForumPostUpdateDto dto)
    {
        if (dto.ImageUrls != null && dto.ImageUrls.Count > 3)
        {
            return (false, "Chỉ được đăng tối đa 3 ảnh");
        }

        var post = await _context.ForumPosts
            .Include(p => p.ForumPostImages)
            .FirstOrDefaultAsync(p => p.PostId == postId);

        if (post == null)
        {
            return (false, "Không tìm thấy bài viết");
        }

        if (post.MemberId != memberId)
        {
            return (false, "Bạn không có quyền sửa bài viết này");
        }

        if (post.Status == "Deleted")
        {
            return (false, "Bài viết đã bị xóa");
        }

        if (post.PostType == "Repost")
        {
            return (false, "Không thể sửa tiêu đề/danh mục của bài repost");
        }

        if (ContainsBadWord(dto.Title) || ContainsBadWord(dto.Content))
        {
            return (false, "Tiêu đề hoặc nội dung chứa từ ngữ không phù hợp");
        }

        bool categoryExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryId == dto.CategoryId && c.Status == "Active");

        if (!categoryExists)
        {
            return (false, "Danh mục không tồn tại hoặc đã ngừng hoạt động");
        }

        post.Title = dto.Title;
        post.CategoryId = dto.CategoryId;
        post.Content = dto.Content;
        post.UpdatedAt = DateTime.Now;

        // Danh sách URL cuối cùng client muốn giữ (ảnh cũ giữ lại + ảnh mới đã upload)
        List<string> newImageUrls = dto.ImageUrls ?? new List<string>();

        // Ảnh nào đang có trong DB mà không còn nằm trong danh sách mới => xóa khỏi S3 luôn, tránh rác
        List<string> urlsToDelete = new List<string>();
        foreach (var image in post.ForumPostImages)
        {
            if (!newImageUrls.Contains(image.ImageUrl))
            {
                urlsToDelete.Add(image.ImageUrl);
            }
        }

        if (urlsToDelete.Count > 0)
        {
            await _storageService.DeleteFilesAsync(urlsToDelete);
        }

        _context.ForumPostImages.RemoveRange(post.ForumPostImages);

        if (newImageUrls.Count > 0)
        {
            sbyte order = 0;
            foreach (var url in newImageUrls)
            {
                post.ForumPostImages.Add(new ForumPostImage
                {
                    ImageUrl = url,
                    SortOrder = order,
                    UploadedAt = DateTime.Now
                });
                order = (sbyte)(order + 1);
            }
        }

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== XÓA BÀI VIẾT (soft delete) =====
    public async Task<(bool Success, string? Error)> DeleteAsync(long postId, long memberId, bool isAdmin = false)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);

        if (post == null)
        {
            return (false, "Không tìm thấy bài viết");
        }

        if (post.MemberId != memberId && !isAdmin)
        {
            return (false, "Bạn không có quyền xóa bài viết này");
        }

        if (post.Status == "Deleted")
        {
            return (false, "Bài viết đã được xóa trước đó");
        }

        post.Status = "Deleted";
        post.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== ADMIN ẨN BÀI VI PHẠM =====
    public async Task<(bool Success, string? Error)> HideAsync(long postId)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);

        if (post == null)
        {
            return (false, "Không tìm thấy bài viết");
        }

        post.Status = "Hidden";
        post.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== MAPPER =====
    private static ForumPostDto MapToDto(ForumPost p, List<long> likedPostIds)
    {
        List<string> imageUrls = p.ForumPostImages
            .OrderBy(i => i.SortOrder)
            .Select(i => i.ImageUrl)
            .ToList();

        var dto = new ForumPostDto
        {
            PostId = p.PostId,
            MemberId = p.MemberId,
            MemberName = p.Member != null ? p.Member.FullName : "",
            MemberAvatar = p.Member != null && p.Member.FaceDatum != null ? p.Member.FaceDatum.ProfileImage : null,
            Title = p.Title,
            CategoryId = p.CategoryId,
            CategoryName = p.Category != null ? p.Category.CategoryName : "",
            Content = p.Content,
            PostType = p.PostType,
            LikeCount = p.LikeCount,
            CommentCount = p.CommentCount,
            Status = p.Status,
            IsLikedByCurrentUser = likedPostIds.Contains(p.PostId),
            ImageUrls = imageUrls,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };

        return dto;
    }

    // ===== TOP THÀNH VIÊN THEO SỐ BÀI ĐĂNG =====
    public async Task<List<TopMemberDto>> GetTopMembersAsync(string range = "week", int top = 5)
    {
        DateTime? fromDate = null;
        if (range == "week")
        {
            fromDate = DateTime.Now.AddDays(-7);
        }
        else if (range == "month")
        {
            fromDate = DateTime.Now.AddMonths(-1);
        }
        // range == "all" -> không lọc thời gian

        var q = _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Where(p => p.Status == "Active");

        if (fromDate.HasValue)
        {
            q = q.Where(p => p.CreatedAt >= fromDate.Value);
        }

        var grouped = await q
            .GroupBy(p => new { p.MemberId, p.Member.FullName, p.Member.FaceDatum.ProfileImage })
            .Select(g => new TopMemberDto
            {
                MemberId = g.Key.MemberId,
                MemberName = g.Key.FullName,
                MemberAvatar = g.Key.ProfileImage,
                PostCount = g.Count()
            })
            .OrderByDescending(m => m.PostCount)
            .Take(top)
            .ToListAsync();

        for (int i = 0; i < grouped.Count; i++)
        {
            grouped[i].Rank = i + 1;
        }

        return grouped;
    }

    // ===== LẤY BÀI ĐĂNG CỦA CHÍNH MÌNH =====
    // Khác GetFeedAsync ở chỗ: lấy cả bài đang bị Hidden (để chủ bài biết bài mình bị ẩn),
    // chỉ loại bài đã xóa (Deleted), và không cần lọc category/member khác.
    public async Task<List<ForumPostDto>> GetMyPostsAsync(long memberId)
    {
        var posts = await _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Include(p => p.Category)
            .Include(p => p.ForumPostImages)
            .Where(p => p.MemberId == memberId && p.Status != "Deleted")
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        List<long> postIds = new List<long>();
        foreach (var p in posts)
        {
            postIds.Add(p.PostId);
        }

        // Chủ bài xem bài của mình -> lấy luôn trạng thái đã tym của chính họ
        var likedPostIds = await _context.ForumLikes
            .Where(l => postIds.Contains(l.PostId) && l.MemberId == memberId)
            .Select(l => l.PostId)
            .ToListAsync();

        List<ForumPostDto> result = new List<ForumPostDto>();
        foreach (var p in posts)
        {
            result.Add(MapToDto(p, likedPostIds));
        }

        return result;
    }

    // ===== THỐNG KÊ CỘNG ĐỒNG (tổng thành viên / bài viết / bình luận / lượt tim) =====
    public async Task<ForumStatsDto> GetCommunityStatsAsync()
    {
        int totalMembers = await _context.Members.CountAsync();

        int totalPosts = await _context.ForumPosts
            .CountAsync(p => p.Status == "Active");

        int totalComments = await _context.ForumComments
            .CountAsync(c => c.Status != "Deleted");

        int totalLikes = await _context.ForumLikes.CountAsync();

        var stats = new ForumStatsDto
        {
            TotalMembers = totalMembers,
            TotalPosts = totalPosts,
            TotalComments = totalComments,
            TotalLikes = totalLikes
        };

        return stats;
    }

    // ===== BÀI VIẾT NỔI BẬT (dùng cho panel "Bài viết nổi bật") =====
    // Tiêu chí: bài Active, ưu tiên nhiều lượt thích -> nhiều bình luận -> mới nhất.
    // Mặc định chỉ xét bài trong 30 ngày gần nhất để tránh 1 bài cũ hot mãi mãi
    // chiếm top; nếu không đủ 'top' bài trong khoảng đó thì lấy bổ sung toàn thời gian.
    public async Task<List<ForumPostDto>> GetFeaturedPostsAsync(long? currentMemberId, int top = 3, int recentDays = 30)
    {
        DateTime fromDate = DateTime.Now.AddDays(-recentDays);

        var baseQuery = _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Include(p => p.Category)
            .Include(p => p.ForumPostImages)
            .Where(p => p.Status == "Active");

        var recentPosts = await baseQuery
            .Where(p => p.CreatedAt >= fromDate)
            .OrderByDescending(p => p.LikeCount)
            .ThenByDescending(p => p.CommentCount)
            .ThenByDescending(p => p.CreatedAt)
            .Take(top)
            .ToListAsync();

        // Nếu bài gần đây không đủ số lượng yêu cầu, bổ sung thêm từ toàn bộ thời gian
        // (loại trừ những bài đã lấy ở trên để không bị trùng)
        if (recentPosts.Count < top)
        {
            List<long> excludeIds = new List<long>();
            foreach (var p in recentPosts)
            {
                excludeIds.Add(p.PostId);
            }

            var extraPosts = await baseQuery
                .Where(p => !excludeIds.Contains(p.PostId))
                .OrderByDescending(p => p.LikeCount)
                .ThenByDescending(p => p.CommentCount)
                .ThenByDescending(p => p.CreatedAt)
                .Take(top - recentPosts.Count)
                .ToListAsync();

            recentPosts.AddRange(extraPosts);
        }

        List<long> postIds = new List<long>();
        foreach (var p in recentPosts)
        {
            postIds.Add(p.PostId);
        }

        List<long> likedPostIds = new List<long>();
        if (currentMemberId.HasValue)
        {
            likedPostIds = await _context.ForumLikes
                .Where(l => postIds.Contains(l.PostId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.PostId)
                .ToListAsync();
        }

        List<ForumPostDto> result = new List<ForumPostDto>();
        foreach (var p in recentPosts)
        {
            result.Add(MapToDto(p, likedPostIds));
        }

        return result;
    }
}