using System.ComponentModel.DataAnnotations;

namespace BE.DTOs;

/// <summary>
/// Dữ liệu trả về cho 1 bình luận (bao gồm các reply cấp 1 nếu có)
/// </summary>
public class ForumCommentDto
{
    public long CommentId { get; set; }
    public long PostId { get; set; }
    public long MemberId { get; set; }
    public string MemberName { get; set; } = null!;
    public string? MemberAvatar { get; set; }

    public long? ParentCommentId { get; set; }
    public long? ReplyToMemberId { get; set; }
    public string? ReplyToMemberName { get; set; }

    public string Content { get; set; } = null!;
    public int LikeCount { get; set; }
    public bool IsLikedByCurrentUser { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<ForumCommentDto> Replies { get; set; } = new();
}

/// <summary>
/// Dữ liệu tạo bình luận mới hoặc trả lời 1 bình luận (@ đích danh)
/// </summary>
public class ForumCommentCreateDto
{
    [Required]
    public long PostId { get; set; }

    // Null = bình luận gốc mới. Có giá trị = trả lời trực tiếp comment này (n cấp thật sự).
    public long? ParentCommentId { get; set; }

    [Required, MaxLength(2000)]
    public string Content { get; set; } = null!;
}
/// <summary>
/// Dữ liệu sửa nội dung bình luận
/// </summary>
public class ForumCommentUpdateDto
{
    public string Content { get; set; } = null!;
}

/// <summary>
/// Tham số phân trang khi lấy danh sách bình luận theo bài viết
/// </summary>
public class ForumCommentQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}