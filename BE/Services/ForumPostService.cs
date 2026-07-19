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

    public ForumPostService(GymManagementContext context, S3StorageService storageService)
    {
        _context = context;
        _storageService = storageService;
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
            q = q.Where(p => p.CategoryId == query.CategoryId.Value);

        if (query.MemberId.HasValue)
            q = q.Where(p => p.MemberId == query.MemberId.Value);

        q = query.Sort switch
        {
            // Thịnh hành: tym nhiều nhất trước, bằng tym thì xét đến comment nhiều nhất
            "trending" => q.OrderByDescending(p => p.LikeCount)
                            .ThenByDescending(p => p.CommentCount)
                            .ThenByDescending(p => p.CreatedAt),

            // Mới nhất: theo thời gian tạo
            _ => q.OrderByDescending(p => p.CreatedAt)
        };

        var total = await q.CountAsync();

        var posts = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var postIds = posts.Select(p => p.PostId).ToList();

        var likedPostIds = currentMemberId.HasValue
            ? await _context.ForumLikes
                .Where(l => postIds.Contains(l.PostId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.PostId)
                .ToListAsync()
            : new List<long>();

        var items = posts.Select(p => MapToDto(p, likedPostIds)).ToList();

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

        if (post is null) return null;

        var likedPostIds = currentMemberId.HasValue &&
            await _context.ForumLikes.AnyAsync(l => l.PostId == postId && l.MemberId == currentMemberId.Value)
            ? new List<long> { postId }
            : new List<long>();

        return MapToDto(post, likedPostIds);
    }

    // ===== TẠO BÀI VIẾT MỚI (Original) =====
    public async Task<(bool Success, string? Error, ForumPostDto? Data)> CreateAsync(long memberId, ForumPostCreateDto dto)
    {
        if (dto.ImageUrls is { Count: > 3 })
            return (false, "Chỉ được đăng tối đa 3 ảnh", null);

        var categoryExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryId == dto.CategoryId && c.Status == "Active");

        if (!categoryExists)
            return (false, "Danh mục không tồn tại hoặc đã ngừng hoạt động", null);

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
            RepostCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (dto.ImageUrls is { Count: > 0 })
        {
            sbyte order = 0;
            foreach (var url in dto.ImageUrls)
            {
                post.ForumPostImages.Add(new ForumPostImage
                {
                    ImageUrl = url,
                    SortOrder = order++,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        _context.ForumPosts.Add(post);
        await _context.SaveChangesAsync();

        var created = await GetByIdAsync(post.PostId, memberId);
        return (true, null, created);
    }

    // ===== REPOST (đăng lại bài của người khác) =====
    public async Task<(bool Success, string? Error, ForumPostDto? Data)> RepostAsync(long memberId, ForumRepostCreateDto dto)
    {
        var original = await _context.ForumPosts
            .FirstOrDefaultAsync(p => p.PostId == dto.OriginalPostId && p.Status == "Active");

        if (original is null)
            return (false, "Bài viết gốc không tồn tại hoặc đã bị ẩn/xóa", null);

        if (original.PostType == "Repost")
            return (false, "Không thể repost một bài đã là repost", null);

        var repost = new ForumPost
        {
            MemberId = memberId,
            Title = original.Title,
            CategoryId = original.CategoryId,
            Content = dto.Content,
            PostType = "Repost",
            OriginalPostId = original.PostId,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ForumPosts.Add(repost);
        original.RepostCount += 1;

        await _context.SaveChangesAsync();

        var created = await GetByIdAsync(repost.PostId, memberId);
        return (true, null, created);
    }

    // ===== SỬA BÀI VIẾT =====
    public async Task<(bool Success, string? Error)> UpdateAsync(long postId, long memberId, ForumPostUpdateDto dto)
    {
        if (dto.ImageUrls is { Count: > 3 })
            return (false, "Chỉ được đăng tối đa 3 ảnh");

        var post = await _context.ForumPosts
            .Include(p => p.ForumPostImages)
            .FirstOrDefaultAsync(p => p.PostId == postId);

        if (post is null)
            return (false, "Không tìm thấy bài viết");

        if (post.MemberId != memberId)
            return (false, "Bạn không có quyền sửa bài viết này");

        if (post.Status == "Deleted")
            return (false, "Bài viết đã bị xóa");

        if (post.PostType == "Repost")
            return (false, "Không thể sửa tiêu đề/danh mục của bài repost");

        var categoryExists = await _context.ForumCategories
            .AnyAsync(c => c.CategoryId == dto.CategoryId && c.Status == "Active");

        if (!categoryExists)
            return (false, "Danh mục không tồn tại hoặc đã ngừng hoạt động");

        post.Title = dto.Title;
        post.CategoryId = dto.CategoryId;
        post.Content = dto.Content;
        post.UpdatedAt = DateTime.UtcNow;

        // Danh sách URL cuối cùng client muốn giữ (ảnh cũ giữ lại + ảnh mới đã upload)
        var newImageUrls = dto.ImageUrls ?? new List<string>();

        // Ảnh nào đang có trong DB mà không còn nằm trong danh sách mới => xóa khỏi S3 luôn, tránh rác
        var urlsToDelete = post.ForumPostImages
            .Select(i => i.ImageUrl)
            .Where(url => !newImageUrls.Contains(url))
            .ToList();

        if (urlsToDelete.Count > 0)
            await _storageService.DeleteFilesAsync(urlsToDelete);

        _context.ForumPostImages.RemoveRange(post.ForumPostImages);

        if (newImageUrls.Count > 0)
        {
            sbyte order = 0;
            foreach (var url in newImageUrls)
            {
                post.ForumPostImages.Add(new ForumPostImage
                {
                    ImageUrl = url,
                    SortOrder = order++,
                    UploadedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== XÓA BÀI VIẾT (soft delete) =====
    public async Task<(bool Success, string? Error)> DeleteAsync(long postId, long memberId, bool isAdmin = false)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);

        if (post is null)
            return (false, "Không tìm thấy bài viết");

        if (post.MemberId != memberId && !isAdmin)
            return (false, "Bạn không có quyền xóa bài viết này");

        if (post.Status == "Deleted")
            return (false, "Bài viết đã được xóa trước đó");

        // Nếu là bài gốc bị repost, giảm repost_count của bài gốc khi bài repost bị xóa
        if (post.PostType == "Repost" && post.OriginalPostId.HasValue)
        {
            var original = await _context.ForumPosts.FindAsync(post.OriginalPostId.Value);
            if (original is not null && original.RepostCount > 0)
                original.RepostCount -= 1;
        }

        post.Status = "Deleted";
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== ADMIN ẨN BÀI VI PHẠM =====
    public async Task<(bool Success, string? Error)> HideAsync(long postId)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null)
            return (false, "Không tìm thấy bài viết");

        post.Status = "Hidden";
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    // ===== MAPPER =====
    private static ForumPostDto MapToDto(ForumPost p, List<long> likedPostIds)
    {
        return new ForumPostDto
        {
            PostId = p.PostId,
            MemberId = p.MemberId,
            MemberName = p.Member?.FullName ?? "",
            MemberAvatar = p.Member?.FaceDatum?.ProfileImage, // avatar lấy từ FaceDatum, có thể null nếu chưa đăng ký khuôn mặt
            Title = p.Title,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.CategoryName ?? "",
            Content = p.Content,
            PostType = p.PostType,
            OriginalPostId = p.OriginalPostId,
            LikeCount = p.LikeCount,
            CommentCount = p.CommentCount,
            RepostCount = p.RepostCount,
            Status = p.Status,
            IsLikedByCurrentUser = likedPostIds.Contains(p.PostId),
            ImageUrls = p.ForumPostImages
                .OrderBy(i => i.SortOrder)
                .Select(i => i.ImageUrl)
                .ToList(),
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

    // ===== TOP THÀNH VIÊN THEO SỐ BÀI ĐĂNG =====
    public async Task<List<TopMemberDto>> GetTopMembersAsync(string range = "week", int top = 5)
    {
        var fromDate = range switch
        {
            "week" => DateTime.UtcNow.AddDays(-7),
            "month" => DateTime.UtcNow.AddMonths(-1),
            _ => (DateTime?)null // "all" = không lọc thời gian
        };

        var q = _context.ForumPosts
            .Include(p => p.Member).ThenInclude(m => m.FaceDatum)
            .Where(p => p.Status == "Active");

        if (fromDate.HasValue)
            q = q.Where(p => p.CreatedAt >= fromDate.Value);

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
            grouped[i].Rank = i + 1;

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

        var postIds = posts.Select(p => p.PostId).ToList();

        // Chủ bài xem bài của mình -> lấy luôn trạng thái đã tym của chính họ
        var likedPostIds = await _context.ForumLikes
            .Where(l => postIds.Contains(l.PostId) && l.MemberId == memberId)
            .Select(l => l.PostId)
            .ToListAsync();

        return posts.Select(p => MapToDto(p, likedPostIds)).ToList();
    }
    // ===== THỐNG KÊ CỘNG ĐỒNG (tổng thành viên / bài viết / bình luận / lượt tim) =====
    public async Task<ForumStatsDto> GetCommunityStatsAsync()
    {
        var totalMembers = await _context.Members.CountAsync();

        var totalPosts = await _context.ForumPosts
            .CountAsync(p => p.Status == "Active");

        var totalComments = await _context.ForumComments
            .CountAsync(c => c.Status != "Deleted");

        var totalLikes = await _context.ForumLikes.CountAsync();

        return new ForumStatsDto
        {
            TotalMembers = totalMembers,
            TotalPosts = totalPosts,
            TotalComments = totalComments,
            TotalLikes = totalLikes
        };
    }
    // ===== BÀI VIẾT NỔI BẬT (dùng cho panel "Bài viết nổi bật") =====
    // Tiêu chí: bài Active, ưu tiên nhiều lượt thích -> nhiều bình luận -> mới nhất.
    // Mặc định chỉ xét bài trong 30 ngày gần nhất để tránh 1 bài cũ hot mãi mãi
    // chiếm top; nếu không đủ 'top' bài trong khoảng đó thì lấy bổ sung toàn thời gian.
    public async Task<List<ForumPostDto>> GetFeaturedPostsAsync(long? currentMemberId, int top = 3, int recentDays = 30)
    {
        var fromDate = DateTime.UtcNow.AddDays(-recentDays);

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
            var excludeIds = recentPosts.Select(p => p.PostId).ToList();

            var extraPosts = await baseQuery
                .Where(p => !excludeIds.Contains(p.PostId))
                .OrderByDescending(p => p.LikeCount)
                .ThenByDescending(p => p.CommentCount)
                .ThenByDescending(p => p.CreatedAt)
                .Take(top - recentPosts.Count)
                .ToListAsync();

            recentPosts.AddRange(extraPosts);
        }

        var postIds = recentPosts.Select(p => p.PostId).ToList();

        var likedPostIds = currentMemberId.HasValue
            ? await _context.ForumLikes
                .Where(l => postIds.Contains(l.PostId) && l.MemberId == currentMemberId.Value)
                .Select(l => l.PostId)
                .ToListAsync()
            : new List<long>();

        return recentPosts.Select(p => MapToDto(p, likedPostIds)).ToList();
    }
}