namespace BE.Dtos.Promotion
{
    // Danh sách khuyến mãi hợp lệ cho 1 PlanId cụ thể — trả về cho FE hiển thị dropdown Bước 2
    public class ApplicablePromotionItem
    {
        public int PromotionId { get; set; }
        public string TenKhuyenMai { get; set; } = null!;
        public string PromoType { get; set; } = null!; // GiamPhanTram | GiamTienMat | TangNgay | TangChuKy
        public decimal? PhanTramGiam { get; set; }
        public decimal? SoTienGiam { get; set; }
        public decimal? MucGiamToiDa { get; set; }
        public int? SoNgayTang { get; set; }
        public int? SoChuKyTang { get; set; }
        public string? MoTa { get; set; }
    }
}