namespace BE.DTOs.Branches;

/// <summary>
/// Danh sách thứ tự mới cho các ảnh của 1 chi nhánh — dùng khi kéo thả để sắp xếp lại,
/// hoặc khi bấm nút +/- và muốn lưu tất cả thay đổi thứ tự cùng lúc.
/// </summary>
public class ReorderBranchImagesDto
{
    public List<BranchImageOrderItem> Items { get; set; } = new();
}

public class BranchImageOrderItem
{
    public int ImageId { get; set; }
    public sbyte SortOrder { get; set; }
}