namespace BE.DTOs;


public class ForumNotificationQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public bool? UnreadOnly { get; set; }
}
public class ForumNotificationDto
{
    public long NotificationId { get; set; }
    public string NotifyType { get; set; } = null!; // Like/Comment/Reply — FE map ra câu tương ứng

    public long ActorMemberId { get; set; }
    public string ActorName { get; set; } = null!;
    public string? ActorAvatar { get; set; }

    public long PostId { get; set; }
    public long? CommentId { get; set; }

    // Trích 1 đoạn ngắn nội dung bình luận để hiển thị preview, kiểu Facebook
    // ("Nguyễn Văn A đã trả lời bình luận của bạn: 'Đúng bài đó đấy...'")
    public string? CommentPreview { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}