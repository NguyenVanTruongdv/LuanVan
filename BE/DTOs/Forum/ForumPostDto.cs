using System.ComponentModel.DataAnnotations;

namespace BE.DTOs;

public class ForumPostDto
{
    public long PostId { get; set; }
    public long MemberId { get; set; }
    public string MemberName { get; set; } = null!;
    public string? MemberAvatar { get; set; }

    public string Title { get; set; } = null!;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;

    public string? Content { get; set; }
    public string PostType { get; set; } = null!;

    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public string Status { get; set; } = null!;

    public bool IsLikedByCurrentUser { get; set; }

    public List<string> ImageUrls { get; set; } = new();

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ForumPostCreateDto
{
    [Required, MaxLength(255)]
    public string Title { get; set; } = null!;

    [Required]
    public int CategoryId { get; set; }

    public string? Content { get; set; }

    // Danh sách URL ảnh đã upload sẵn lên S3 — có thể rỗng hoặc null
    public List<string>? ImageUrls { get; set; }
}

public class ForumPostUpdateDto
{
    [Required, MaxLength(255)]
    public string Title { get; set; } = null!;

    [Required]
    public int CategoryId { get; set; }

    public string? Content { get; set; }

    // Danh sách ảnh cuối cùng sau khi sửa (thay thế toàn bộ ảnh cũ)
    public List<string>? ImageUrls { get; set; }
}

public class ForumRepostCreateDto
{
    [Required]
    public long OriginalPostId { get; set; }

    // Lời bình khi repost — có thể để trống (repost trơn)
    public string? Content { get; set; }
}

public class ForumPostQueryParams
{
    public int? CategoryId { get; set; }
    public long? MemberId { get; set; }

    /// <summary>
    /// "latest" = Mới nhất (theo CreatedAt), "trending" = Thịnh hành (theo LikeCount, rồi CommentCount)
    /// </summary>
    public string Sort { get; set; } = "latest";

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
public class TopMemberDto
{
    public int Rank { get; set; }
    public long MemberId { get; set; }
    public string MemberName { get; set; } = null!;
    public string MemberAvatar { get; set; } = null!;
    public int PostCount { get; set; }
}

public class ForumStatsDto
{
    public int TotalMembers { get; set; }
    public int TotalPosts { get; set; }
    public int TotalComments { get; set; }
    public int TotalLikes { get; set; }
}