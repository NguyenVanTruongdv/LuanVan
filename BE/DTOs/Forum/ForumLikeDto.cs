namespace BE.DTOs;

/// <summary>
/// Kết quả trả về sau khi tym/bỏ tym 1 bài viết
/// </summary>
public class ForumLikeToggleResultDto
{
    public bool IsLiked { get; set; }
    public int LikeCount { get; set; }
}