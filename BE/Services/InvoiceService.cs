using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BE.Services
{
    // Dữ liệu đầu vào để render hóa đơn PDF — KHÔNG phải Entity Framework model,
    // chỉ là DTO tạm dùng nội bộ giữa TransactionService và InvoiceService.
    public class InvoiceData
    {
        public string OrderCode { get; set; } = null!;
        public string MemberName { get; set; } = null!;
        public string MemberPhone { get; set; } = null!;
        public string PlanName { get; set; } = null!;
        public decimal GiaGoc { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Amount { get; set; }
        public short BonusDays { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly ExpiryDate { get; set; }
        public string PaymentMethod { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public string? EmployeeName { get; set; }
        public string? PromotionName { get; set; }

        
        public string? BranchName { get; set; }
        public string? BranchAddress { get; set; }
        public string? BranchPhone { get; set; }

        // [MỚI] Đánh dấu đây là hóa đơn được LẬP LẠI sau khi nhân viên/quản lý điều chỉnh lại
        // thông tin giao dịch (đổi gói tập do chọn nhầm lúc bán...) — khi true, InvoiceService
        // sẽ in thêm 1 dòng lưu ý nổi bật ngay dưới tiêu đề hóa đơn.
        public bool IsAdjustmentReissue { get; set; }

        // Thời điểm thực hiện điều chỉnh — chỉ có ý nghĩa khi IsAdjustmentReissue = true,
        // dùng để hiển thị trong dòng lưu ý ("...vào lúc dd/MM/yyyy HH:mm").
        public DateTime? AdjustedAt { get; set; }
    }

    public class InvoiceService
    {
        static InvoiceService()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        // Trả về bytes PDF, chưa upload — TransactionService sẽ tự upload lên S3 rồi lưu URL.
        public byte[] GenerateInvoicePdf(InvoiceData data)
        {
            // [MỚI] Ưu tiên thông tin chi nhánh đã bán gói; fallback về tên mặc định nếu thiếu.
            // Với hóa đơn lập lại sau điều chỉnh, các giá trị này PHẢI là chi nhánh GỐC của giao
            // dịch (xem ghi chú tại InvoiceData.BranchName ở trên) — InvoiceService không tự suy
            // luận được chi nhánh, chỉ in đúng những gì được truyền vào.
            var branchName = string.IsNullOrWhiteSpace(data.BranchName) ? "VT GYM" : data.BranchName;
            var branchAddress = data.BranchAddress; // có thể null nếu thiếu dữ liệu
            var branchPhone = data.BranchPhone;

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A5);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Arial"));

                    page.Header().Column(col =>
                    {
                        // ===== Thông tin chi nhánh đã bán gói tập =====
                        col.Item().Text(branchName).FontSize(16).Bold().AlignCenter();

                        if (!string.IsNullOrWhiteSpace(branchAddress))
                            col.Item().Text(branchAddress).FontSize(9).AlignCenter();

                        if (!string.IsNullOrWhiteSpace(branchPhone))
                            col.Item().Text($"ĐT: {branchPhone}").FontSize(9).AlignCenter();

                        col.Item().PaddingTop(6).LineHorizontal(1);

                        // ===== Tiêu đề hóa đơn =====
                        col.Item().PaddingTop(6).Text("HÓA ĐƠN THANH TOÁN").FontSize(18).Bold().AlignCenter();

                        // ===== Số hóa đơn / ngày lập =====
                        col.Item().PaddingTop(4).Row(row =>
                        {
                            row.RelativeItem().Text($"Số: {data.OrderCode}").FontSize(10);
                            row.RelativeItem().AlignRight().Text($"Ngày lập: {data.CreatedAt:dd/MM/yyyy HH:mm}").FontSize(10);
                        });

                        if (!string.IsNullOrEmpty(data.EmployeeName))
                            col.Item().Text($"Thu ngân: {data.EmployeeName}").FontSize(10).AlignCenter();

                        // ===== [MỚI] Dòng lưu ý khi hóa đơn được lập lại sau điều chỉnh giao dịch =====
                        if (data.IsAdjustmentReissue)
                        {
                            col.Item().PaddingTop(8).Background(Colors.Amber.Lighten4).Padding(6).Text(t =>
                            {
                                t.Span("Lưu ý: ").Bold().FontColor(Colors.Red.Darken1).FontSize(9);
                                t.Span(
                                    data.AdjustedAt.HasValue
                                        ? $"Hóa đơn này được lập lại sau khi điều chỉnh thông tin giao dịch, vào lúc {data.AdjustedAt.Value:dd/MM/yyyy HH:mm}."
                                        : "Hóa đơn này được lập lại sau khi điều chỉnh thông tin giao dịch."
                                ).FontSize(9).FontColor(Colors.Grey.Darken2);
                            });
                        }

                        col.Item().PaddingTop(8).LineHorizontal(1);
                    });

                    page.Content().PaddingVertical(15).Column(col =>
                    {
                        col.Spacing(6);

                        col.Item().Text("Thông tin hội viên").Bold().FontSize(12);
                        col.Item().Text($"Họ tên: {data.MemberName}");
                        col.Item().Text($"Số điện thoại: {data.MemberPhone}");

                        col.Item().PaddingTop(10).Text("Chi tiết gói tập").Bold().FontSize(12);
                        col.Item().Text($"Gói tập: {data.PlanName}");
                        if (!string.IsNullOrEmpty(data.PromotionName))
                            col.Item().Text($"Khuyến mãi: {data.PromotionName}");
                        col.Item().Text($"Hiệu lực: {data.StartDate:dd/MM/yyyy} → {data.ExpiryDate:dd/MM/yyyy}");
                        if (data.BonusDays > 0)
                            col.Item().Text($"Số ngày tặng thêm: {data.BonusDays} ngày");

                        col.Item().PaddingTop(10).LineHorizontal(0.5f);

                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Text("Giá gốc");
                            row.ConstantItem(120).AlignRight().Text($"{data.GiaGoc:N0}₫");
                        });

                        if (data.DiscountAmount > 0)
                        {
                            col.Item().Row(row =>
                            {
                                row.RelativeItem().Text("Giảm giá");
                                row.ConstantItem(120).AlignRight().Text($"-{data.DiscountAmount:N0}₫");
                            });
                        }

                        col.Item().PaddingTop(4).Row(row =>
                        {
                            row.RelativeItem().Text("TỔNG THANH TOÁN").Bold().FontSize(13);
                            row.ConstantItem(120).AlignRight().Text($"{data.Amount:N0}₫").Bold().FontSize(13);
                        });

                        col.Item().PaddingTop(10).Text($"Phương thức: {(data.PaymentMethod == "Cash" ? "Tiền mặt" : "Chuyển khoản")}");
                    });

                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.Span("Cảm ơn quý khách đã sử dụng dịch vụ!").FontSize(9).Italic();
                    });
                });
            }).GeneratePdf();
        }
    }
}