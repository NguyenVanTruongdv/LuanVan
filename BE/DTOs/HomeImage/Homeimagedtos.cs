namespace BE.DTOs
{

    public class HomeImageResponse
    {
        public int ImageId { get; set; }
        public string ImageUrl { get; set; } = null!;
        public string? Title { get; set; }
        public string? LinkUrl { get; set; }
        public sbyte SortOrder { get; set; }
        public string Status { get; set; } = null!;
        public long UploadedBy { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    /// <summary>
    /// Request tạo mới ảnh home (multipart/form-data: kèm file ảnh)
    /// </summary>
    public class CreateHomeImageRequest
    {
        public IFormFile File { get; set; } = null!;
        public string? Title { get; set; }
        public string? LinkUrl { get; set; }
        public sbyte SortOrder { get; set; } = 0;
    }

    /// <summary>
    /// Request cập nhật ảnh home. File là optional (nếu muốn đổi ảnh mới thì upload,
    /// không thì giữ ảnh cũ)
    /// </summary>
    public class UpdateHomeImageRequest
    {
        public IFormFile? File { get; set; }
        public string? Title { get; set; }
        public string? LinkUrl { get; set; }
        public sbyte? SortOrder { get; set; }

        /// <summary>
        /// "Active" hoặc "Inactive"
        /// </summary>
        public string? Status { get; set; }
    }
}