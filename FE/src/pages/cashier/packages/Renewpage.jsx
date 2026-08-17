import { useEffect, useState } from "react";
import cashierApi from "../../../api/cashierApi";

/* =====================================================================
   TRANG GIA HẠN GÓI TẬP — BẢN ĐƠN GIẢN HÓA

   File này được viết lại cho DỄ ĐỌC, DỄ HIỂU, dành cho người mới học
   React. Mọi khối / ô / nút đều được tô VIỀN MÀU rõ ràng để nổi bật
   trên nền trắng.

   Cách trang hoạt động, theo 3 bước:
     Bước 1: Gõ tên/SĐT để tìm hội viên -> chọn 1 người
     Bước 2: Chọn gói tập muốn gia hạn (khuyến mãi tự áp dụng nếu có)
     Bước 3: Chọn cách thanh toán (tiền mặt / chuyển khoản) -> Xác nhận
===================================================================== */

/* ---------------------------------------------------------------------
   1) CSS — GIAO DIỆN
   Bảng màu: nền xám rất nhạt, khối nội dung nền trắng + viền mảnh +
   đổ bóng nhẹ. Màu xanh ngọc (teal) chỉ dùng ở chỗ cần nhấn: trạng
   thái đang chọn, nút chính, số tiền — không tô viền màu tràn lan.
--------------------------------------------------------------------- */
const css = `
.renew-page {
  --bg: #F5F6FA;
  --surface: #FFFFFF;
  --border: #E4E7EC;
  --border-strong: #D0D5DD;
  --ink: #0F172A;
  --muted: #6B7280;
  --primary: #0D9488;
  --primary-dark: #0F766E;
  --primary-soft: #F0FDFA;
  --primary-border: #99F0E4;
  --amber: #B45309;
  --amber-soft: #FFFBEB;
  --amber-border: #FDE7B0;
  --red: #DC2626;
  --red-soft: #FEF2F2;
  --red-border: #FCC9C4;
  --radius: 14px;
  --shadow: 0 1px 2px rgba(16,24,40,.04), 0 6px 20px rgba(16,24,40,.05);

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
  padding: 28px 24px 60px;
}

.renew-page * { box-sizing: border-box; }
.renew-page .wrap { max-width: 1080px; margin: 0 auto; }

/* ---- Tiêu đề trang ---- */
.renew-page .page-title {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 20px;
  background: var(--surface);
  border: 2px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 16px 20px;
  box-shadow: var(--shadow);
}
.renew-page .page-title .icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: var(--primary-soft); color: var(--primary-dark);
  border: 1.5px solid var(--primary-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; flex-shrink: 0;
}
.renew-page .page-title h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
.renew-page .page-title p  { font-size: 13px; color: var(--muted); margin-top: 2px; }

/* ---- Các bước 1-2-3 ---- */
.renew-page .steps {
  display: flex; align-items: center;
  background: var(--surface);
  border: 2px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 14px 22px;
  margin-bottom: 22px;
  box-shadow: var(--shadow);
}
.renew-page .step-item { display: flex; align-items: center; gap: 10px; }
.renew-page .step-dot {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-weight: 700;
  background: var(--surface); border: 2px solid var(--border-strong);
  color: var(--muted); flex-shrink: 0;
  transition: background .2s, border-color .2s, color .2s;
}
.renew-page .step-label { font-size: 13.5px; font-weight: 500; color: var(--muted); white-space: nowrap; }
.renew-page .step-item.active .step-dot { background: var(--primary); border-color: var(--primary); color: #fff; box-shadow: 0 0 0 4px var(--primary-soft); }
.renew-page .step-item.active .step-label { color: var(--ink); font-weight: 700; }
.renew-page .step-item.done .step-dot { background: var(--primary); border-color: var(--primary); color: #fff; }
.renew-page .step-item.done .step-label { color: var(--ink); }
.renew-page .step-line {
  flex: 1; height: 2.5px; background: var(--border-strong);
  margin: 0 14px; min-width: 20px; border-radius: 2px;
  position: relative; overflow: hidden;
}
.renew-page .step-line.filled { background: var(--primary); }

/* ---- Bố cục 2 cột ---- */
.renew-page .layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
@media (max-width: 850px) { .renew-page .layout { grid-template-columns: 1fr; } }

/* ---- Card dùng chung ---- */
.renew-page .card {
  background: var(--surface);
  border: 2px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 18px;
  overflow: hidden;
}
.renew-page .card-title {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding: 14px 20px;
  font-weight: 700;
  font-size: 14.5px;
}
.renew-page .card-body { padding: 20px; }
.renew-page .section-label { font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }

/* ---- Ô nhập liệu ---- */
.renew-page .input {
  width: 100%;
  border: 1.5px solid var(--border-strong);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
  background: var(--bg);
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.renew-page .input::placeholder { color: #98A2B3; }
.renew-page .input:focus { border-color: var(--primary); background: var(--surface); box-shadow: 0 0 0 3px rgba(13,148,136,.12); }

/* ---- Kết quả tìm hội viên ---- */
.renew-page .member-item {
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.renew-page .member-item:hover { border-color: var(--primary); background: var(--primary-soft); }

.renew-page .avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; flex-shrink: 0;
}

/* ---- Ô hiển thị gói hiện tại / gói mới ---- */
.renew-page .pkg-switch { display: flex; gap: 12px; align-items: stretch; margin-bottom: 18px; }
.renew-page .pkg-box {
  border: 2px solid var(--border-strong);
  border-radius: 12px;
  padding: 13px 15px;
  flex: 1;
  background: var(--bg);
}
.renew-page .pkg-box.new { border-color: var(--primary); background: var(--primary-soft); }
.renew-page .pkg-box .lbl { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 5px; }
.renew-page .pkg-box .val { font-weight: 700; font-size: 14px; }
.renew-page .pkg-box .sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

/* ---- Từng dòng gói tập ---- */
.renew-page .plan-row {
  border: 2px solid var(--border-strong);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 9px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  width: 100%;
  background: var(--surface);
  text-align: left;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.renew-page .plan-row:hover { border-color: var(--primary); }
.renew-page .plan-row.selected { border-color: var(--primary); background: var(--primary-soft); box-shadow: 0 0 0 3px rgba(13,148,136,.14); }
.renew-page .plan-row.disabled { opacity: .45; cursor: not-allowed; }
.renew-page .plan-row .radio {
  width: 18px; height: 18px;
  border: 2.5px solid var(--border-strong);
  border-radius: 50%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 10px;
}
.renew-page .plan-row.selected .radio { border-color: var(--primary); background: var(--primary); }

/* ---- Khuyến mãi ---- */
.renew-page .promo-box {
  border: 1.5px solid var(--amber-border);
  background: var(--amber-soft);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex; gap: 10px; align-items: flex-start;
}
.renew-page .promo-box .icon { color: var(--amber); flex-shrink: 0; margin-top: 1px; }
.renew-page .promo-box .name { font-weight: 700; font-size: 13.5px; color: var(--ink); }
.renew-page .promo-box .desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ---- Phương thức thanh toán ---- */
.renew-page .pay-options { display: flex; gap: 10px; }
.renew-page .pay-btn {
  flex: 1;
  border: 1.5px solid var(--border-strong);
  border-radius: 12px;
  padding: 13px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  background: var(--surface);
  color: var(--ink);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.renew-page .pay-btn:hover { border-color: var(--primary); }
.renew-page .pay-btn.selected { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); box-shadow: 0 0 0 3px rgba(13,148,136,.10); }

/* ---- Tóm tắt bên phải ---- */
.renew-page .layout > div:last-child .card { position: sticky; top: 20px; }
.renew-page .summary-total {
  border-radius: 12px;
  padding: 18px;
  text-align: center;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--primary-soft), #FFFFFF);
  border: 1px solid var(--primary-border);
}
.renew-page .summary-total .money { font-size: 28px; font-weight: 800; color: var(--primary-dark); letter-spacing: -.02em; }
.renew-page .summary-total .desc { font-size: 12px; color: var(--muted); margin-top: 4px; }

.renew-page .summary-line {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 13.5px; margin-bottom: 10px;
}
.renew-page .summary-line span { color: var(--muted); }

/* ---- Cảnh báo / lỗi ---- */
.renew-page .notice {
  border: 1.5px solid var(--amber-border);
  background: var(--amber-soft);
  color: var(--amber);
  border-radius: 10px;
  padding: 10px 13px;
  font-size: 12.5px;
  font-weight: 500;
  margin-bottom: 12px;
}
.renew-page .notice.error { border-color: var(--red-border); background: var(--red-soft); color: var(--red); }

/* ---- Nút xác nhận gia hạn ---- */
.renew-page .btn-submit {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
  font-weight: 700;
  font-size: 14.5px;
  padding: 13px;
  border-radius: 11px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(13,148,136,.30);
  font-family: inherit;
  transition: filter .15s, transform .1s;
}
.renew-page .btn-submit:hover:not(:disabled) { filter: brightness(1.05); }
.renew-page .btn-submit:active:not(:disabled) { transform: translateY(1px); }
.renew-page .btn-submit:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }

.renew-page .btn-outline {
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: border-color .15s, color .15s;
}
.renew-page .btn-outline:hover { border-color: var(--primary); color: var(--primary-dark); }

/* ---- Popup thành công ---- */
.renew-page .overlay {
  position: fixed; inset: 0;
  background: rgba(15,23,42,.55);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  z-index: 100;
}
.renew-page .success-box {
  background: var(--surface);
  border-radius: 18px;
  padding: 32px 28px;
  max-width: 380px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
.renew-page .success-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
  font-size: 24px;
  box-shadow: 0 6px 16px rgba(13,148,136,.35);
}
.renew-page .success-box h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.renew-page .success-details {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: 12px;
  padding: 14px 16px;
  text-align: left;
  margin: 18px 0;
  font-size: 13px;
}
.renew-page .success-details .row { display: flex; justify-content: space-between; margin-bottom: 7px; }
.renew-page .success-details .row:last-child { margin-bottom: 0; }
.renew-page .success-details .row span { color: var(--muted); }

.renew-page .loading-text { font-size: 13px; color: var(--muted); padding: 16px 0; text-align: center; }
`;

/* ---------------------------------------------------------------------
   2) HÀM TIỆN ÍCH (giữ đơn giản nhất có thể)
--------------------------------------------------------------------- */

// Đổi số tiền thành chuỗi có dấu chấm + "đ", ví dụ 500000 -> "500.000đ"
function formatMoney(amount) {
    const n = Number(amount) || 0;
    return n.toLocaleString("vi-VN") + "đ";
}

// Đổi ngày ISO ("2026-08-16") thành "16/08/2026"
function formatDate(isoDate) {
    if (!isoDate) return "—";
    return new Date(isoDate).toLocaleDateString("vi-VN");
}

// Cộng thêm "days" ngày vào một ngày, trả về chuỗi ISO
function addDays(isoDate, days) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
}

// Lấy chữ cái đầu của họ tên để hiển thị avatar, ví dụ "Nguyễn Văn A" -> "VA"
function getInitials(fullName) {
    const words = (fullName || "").trim().split(" ").filter(Boolean);
    return words.slice(-2).map((w) => w[0]).join("").toUpperCase();
}

// API có thể trả dữ liệu bọc trong { data: ... } — hàm này "bóc" ra ngoài
function unwrap(response) {
    return response?.data ?? response ?? null;
}

// Bóc mảng dữ liệu ra khỏi các dạng gói khác nhau mà API có thể trả về
function unwrapList(response) {
    const data = unwrap(response);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

/* Chuyển 1 gói tập thô từ API thành dạng gọn, dễ dùng trong UI.
   Backend có thể trả tên trường viết hoa (PlanId) hoặc thường (planId)
   nên ta kiểm tra cả hai. */
function toPlan(raw) {
    return {
        planId: raw.planId ?? raw.PlanId,
        planName: raw.planName ?? raw.PlanName,
        price: Number(raw.price ?? raw.Price ?? 0),
        durationDays: Number(raw.durationDays ?? raw.DurationDays ?? 0),
        isDiscontinued: (raw.status ?? raw.Status) === "Discontinued",
    };
}

// Chuyển 1 hội viên thô từ API thành dạng gọn
function toMember(raw) {
    if (!raw) return null;
    return {
        id: raw.id ?? raw.Id ?? raw.memberId ?? raw.MemberId,
        name: raw.fullName ?? raw.FullName ?? raw.name,
        phone: raw.phone ?? raw.Phone,
        email: raw.email ?? raw.Email,
        avatarUrl: raw.profileImage ?? raw.ProfileImage ?? raw.avatarUrl ?? raw.AvatarUrl ?? null,
    };
}

// Chuyển thông tin gói tập hiện tại của hội viên thành dạng gọn
// API trả gói hiện tại theo dạng { currentPackage: { planName, expiryDate, ... } }
// -> phải "bóc" lớp currentPackage ra trước rồi mới đọc planName/expiryDate.
function toCurrentPackage(raw) {
    const pkg = raw?.currentPackage ?? raw?.CurrentPackage ?? raw;
    if (!pkg || !(pkg.planName ?? pkg.PlanName)) return null;
    return {
        planName: pkg.planName ?? pkg.PlanName,
        expiryDate: pkg.expiryDate ?? pkg.ExpiryDate,
    };
}

/* Khuyến mãi: mỗi gói chỉ có tối đa 1 khuyến mãi, có 4 loại:
   - GiamPhanTram: giảm theo %
   - GiamTienMat:  giảm số tiền cố định
   - TangNgay:     tặng thêm số ngày sử dụng
   - TangChuKy:    tặng thêm số chu kỳ (1 chu kỳ = thời hạn gói) */
function toPromotion(raw) {
    return {
        promotionId: raw.promotionId,
        name: raw.tenKhuyenMai,
        type: raw.promoType,
        percent: Number(raw.phanTramGiam) || 0,
        cashAmount: Number(raw.soTienGiam) || 0,
        maxDiscount: Number(raw.mucGiamToiDa) || 0,
        bonusDays: Number(raw.soNgayTang) || 0,
        bonusCycles: Number(raw.soChuKyTang) || 0,
    };
}

// Mô tả ngắn cho 1 khuyến mãi, hiển thị lên UI
function describePromotion(promo) {
    if (!promo) return "";
    switch (promo.type) {
        case "TangNgay": return `Tặng ${promo.bonusDays} ngày sử dụng`;
        case "TangChuKy": return `Tặng ${promo.bonusCycles} chu kỳ sử dụng`;
        case "GiamTienMat": return `Giảm ${formatMoney(promo.cashAmount)}`;
        case "GiamPhanTram": return `Giảm ${promo.percent}%`;
        default: return "";
    }
}

/* Tính giá cuối cùng + số ngày được tặng thêm + ngày hết hạn mới,
   dựa trên gói đã chọn + khuyến mãi + ngày bắt đầu. */
function calculatePricing(plan, promo, startDate) {
    if (!plan) return null;

    let bonusDays = 0;
    let discount = 0;

    if (promo?.type === "TangNgay") {
        bonusDays = promo.bonusDays;
    } else if (promo?.type === "TangChuKy") {
        bonusDays = promo.bonusCycles * plan.durationDays;
    } else if (promo?.type === "GiamTienMat") {
        discount = Math.min(promo.cashAmount, plan.price);
    } else if (promo?.type === "GiamPhanTram") {
        const rawDiscount = (plan.price * promo.percent) / 100;
        discount = promo.maxDiscount > 0
            ? Math.min(rawDiscount, promo.maxDiscount, plan.price)
            : Math.min(rawDiscount, plan.price);
    }

    const totalDays = plan.durationDays + bonusDays;

    return {
        bonusDays,
        discount,
        totalDays,
        finalAmount: plan.price - discount,
        newExpiryDate: startDate ? addDays(startDate, totalDays) : null,
    };
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

/* Avatar hội viên: có ảnh thật thì hiện ảnh, không có thì hiện chữ cái đầu tên.
   size: đường kính vòng tròn (px). */
function MemberAvatar({ member, size = 36 }) {
    const [imgFailed, setImgFailed] = useState(false);
    const style = { width: size, height: size, fontSize: size * 0.36 };

    // Có ảnh và ảnh chưa từng load lỗi -> hiện ảnh thật
    if (member?.avatarUrl && !imgFailed) {
        return (
            <img
                src={member.avatarUrl}
                alt={member.name}
                className="avatar"
                style={{ ...style, objectFit: "cover" }}
                onError={() => setImgFailed(true)} // ảnh lỗi -> chuyển sang hiện chữ cái đầu tên
            />
        );
    }

    // Không có ảnh, hoặc ảnh load lỗi -> hiện chữ cái đầu tên
    return <div className="avatar" style={style}>{getInitials(member?.name)}</div>;
}

/* =====================================================================
   3) COMPONENT CHÍNH
===================================================================== */
export default function RenewPage() {
    /* ----- Bước 1: tìm & chọn hội viên ----- */
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [member, setMember] = useState(null); // hội viên đã chọn

    /* ----- Gói tập hiện tại của hội viên (nếu có) ----- */
    const [currentPackage, setCurrentPackage] = useState(null);
    const [loadingCurrentPackage, setLoadingCurrentPackage] = useState(false);

    /* ----- Bước 2: danh sách gói tập + gói được chọn ----- */
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);

    /* ----- Khuyến mãi cho gói đã chọn ----- */
    const [promotion, setPromotion] = useState(null);
    const [loadingPromotion, setLoadingPromotion] = useState(false);

    /* ----- Bước 3: thanh toán ----- */
    const [paymentMethod, setPaymentMethod] = useState(null); // "cash" | "transfer"

    /* ----- Gửi yêu cầu gia hạn ----- */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successInfo, setSuccessInfo] = useState(null);

    // Đang ở bước mấy? (chỉ để tô sáng thanh bước 1-2-3 phía trên)
    const currentStep = !member ? 1 : !selectedPlan ? 2 : 3;

    /* ------------------- TẢI DANH SÁCH GÓI TẬP KHI VÀO TRANG ------------------- */
    useEffect(() => {
        loadPlans();
    }, []);

    function loadPlans() {
        setLoadingPlans(true);
        cashierApi.getAllPackage()
            .then((res) => setPlans(unwrapList(res).map(toPlan)))
            .catch(() => setPlans([]))
            .finally(() => setLoadingPlans(false));
    }

    /* ------------------- TÌM HỘI VIÊN (gõ tới đâu tìm tới đó) ------------------- */
    useEffect(() => {
        const keyword = searchText.trim();
        if (!keyword) {
            setSearchResults([]);
            return;
        }

        // Đợi 350ms sau khi ngừng gõ mới gọi API, tránh gọi liên tục
        const timer = setTimeout(() => {
            setIsSearching(true);
            cashierApi.searchMembersForRenew(keyword)
                .then((res) => setSearchResults(unwrapList(res).map(toMember)))
                .catch(() => setSearchResults([]))
                .finally(() => setIsSearching(false));
        }, 350);

        return () => clearTimeout(timer);
    }, [searchText]);

    /* ------------------- CHỌN 1 HỘI VIÊN TRONG DANH SÁCH KẾT QUẢ ------------------- */
    function selectMember(chosenMember) {
        setMember(chosenMember);
        setSearchText("");
        setSearchResults([]);

        // Tải gói tập hiện tại của hội viên này
        setLoadingCurrentPackage(true);
        cashierApi.getCurrentMemberPack(chosenMember.id)
            .then((res) => setCurrentPackage(toCurrentPackage(unwrap(res))))
            .catch(() => setCurrentPackage(null))
            .finally(() => setLoadingCurrentPackage(false));
    }

    // Bỏ chọn hội viên, quay lại bước 1
    function changeMember() {
        setMember(null);
        setCurrentPackage(null);
        setSelectedPlan(null);
        setPromotion(null);
        resetPaymentInfo();
    }

    /* ------------------- CHỌN 1 GÓI TẬP -> TỰ ĐỘNG TRA KHUYẾN MÃI ------------------- */
    function selectPlan(plan) {
        setSelectedPlan(plan);
        resetPaymentInfo();

        setLoadingPromotion(true);
        cashierApi.getApplicablePromotions(plan.planId)
            .then((res) => {
                const list = unwrapList(res);
                setPromotion(list.length > 0 ? toPromotion(list[0]) : null);
            })
            .catch(() => setPromotion(null))
            .finally(() => setLoadingPromotion(false));
    }

    function resetPaymentInfo() {
        setPaymentMethod(null);
        setSubmitError("");
    }

    /* ------------------- TÍNH TOÁN GIÁ / NGÀY (chỉ để hiển thị) ------------------- */
    const isExtending = !!currentPackage; // đang gia hạn nối tiếp gói cũ, hay bắt đầu mới
    const startDate = isExtending ? currentPackage.expiryDate : todayISO();
    const pricing = calculatePricing(selectedPlan, promotion, startDate);

    /* ------------------- ĐỦ ĐIỀU KIỆN BẤM "XÁC NHẬN" CHƯA? ------------------- */
    const canSubmit = member && selectedPlan && paymentMethod && !submitting;

    /* ------------------- GỬI YÊU CẦU GIA HẠN ------------------- */
    async function submitRenewal() {
        if (!canSubmit) return;

        setSubmitting(true);
        setSubmitError("");

        const formData = new FormData();
        formData.append("PlanId", selectedPlan.planId);
        if (promotion?.promotionId) formData.append("PromotionId", promotion.promotionId);
        formData.append("PaymentMethod", paymentMethod === "cash" ? "Cash" : "BankTransfer");

        try {
            const res = await cashierApi.renewMembership(member.id, formData);
            const data = unwrap(res);

            setSuccessInfo({
                memberName: member.name,
                planName: selectedPlan.planName,
                amount: data?.amount ?? pricing.finalAmount,
                newExpiryDate: data?.expiryDate ?? pricing.newExpiryDate,
                bonusDays: pricing.bonusDays,
                paymentMethod,
            });
        } catch (err) {
            setSubmitError(err?.response?.data?.message ?? "Gia hạn thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    // Làm lại từ đầu (sau khi gia hạn thành công)
    function startOver() {
        setMember(null);
        setCurrentPackage(null);
        setSelectedPlan(null);
        setPromotion(null);
        resetPaymentInfo();
        setSuccessInfo(null);
    }

    /* ======================= GIAO DIỆN (JSX) ======================= */
    return (
        <div className="renew-page">
            <style>{css}</style>
            <div className="wrap">

                {/* ---------- Tiêu đề ---------- */}
                <div className="page-title">
                    <div className="icon">🔄</div>
                    <div>
                        <h1>Gia hạn gói tập</h1>
                        <p>Chọn hội viên và gói tập cần gia hạn</p>
                    </div>
                </div>

                {/* ---------- Thanh 3 bước ---------- */}
                <div className="steps">
                    <div className={`step-item ${currentStep === 1 ? "active" : "done"}`}>
                        <div className="step-dot">{currentStep > 1 ? "✓" : "1"}</div>
                        <div className="step-label">Chọn hội viên</div>
                    </div>
                    <div className={`step-line ${currentStep > 1 ? "filled" : ""}`} />
                    <div className={`step-item ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`}>
                        <div className="step-dot">{currentStep > 2 ? "✓" : "2"}</div>
                        <div className="step-label">Chọn gói tập</div>
                    </div>
                    <div className={`step-line ${currentStep > 2 ? "filled" : ""}`} />
                    <div className={`step-item ${currentStep === 3 ? "active" : ""}`}>
                        <div className="step-dot">3</div>
                        <div className="step-label">Thanh toán</div>
                    </div>
                </div>

                <div className="layout">
                    {/* ================= CỘT TRÁI ================= */}
                    <div>
                        {/* ---------- BƯỚC 1: TÌM HỘI VIÊN ---------- */}
                        <div className="card">
                            <div className="card-title">
                                Bước 1 — Tìm hội viên
                                {member && (
                                    <button className="btn-outline" style={{ float: "right" }} onClick={changeMember}>
                                        Đổi hội viên
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                {!member ? (
                                    <>
                                        <input
                                            className="input"
                                            placeholder="Nhập tên hoặc số điện thoại..."
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                        />

                                        {isSearching && <p className="loading-text">Đang tìm...</p>}

                                        {!isSearching && searchText && searchResults.length === 0 && (
                                            <p className="loading-text">Không tìm thấy hội viên phù hợp</p>
                                        )}

                                        {searchResults.map((m) => (
                                            <div key={m.id} className="member-item" onClick={() => selectMember(m)}>
                                                <MemberAvatar member={m} size={36} />
                                                <div>
                                                    <div style={{ fontWeight: "bold" }}>{m.name}</div>
                                                    <div style={{ fontSize: 12, color: "#64748b" }}>{m.phone}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <MemberAvatar member={member} size={44} />
                                        <div>
                                            <div style={{ fontWeight: "bold", fontSize: 16 }}>{member.name}</div>
                                            <div style={{ fontSize: 13, color: "#64748b" }}>{member.phone} · {member.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ---------- BƯỚC 2: CHỌN GÓI TẬP ---------- */}
                        {member && (
                            <div className="card">
                                <div className="card-title">Bước 2 — Chọn gói tập</div>
                                <div className="card-body">

                                    {/* So sánh gói hiện tại và gói mới */}
                                    <div className="pkg-switch">
                                        <div className="pkg-box">
                                            <div className="lbl">Gói hiện tại</div>
                                            {loadingCurrentPackage ? (
                                                <span className="sub">Đang kiểm tra...</span>
                                            ) : currentPackage ? (
                                                <>
                                                    <div className="val">{currentPackage.planName}</div>
                                                    <div className="sub">Hết hạn {formatDate(currentPackage.expiryDate)}</div>
                                                </>
                                            ) : (
                                                <span className="sub">Chưa có gói</span>
                                            )}
                                        </div>
                                        <div className="pkg-box new">
                                            <div className="lbl">Gói muốn gia hạn</div>
                                            <div className="val">{selectedPlan ? selectedPlan.planName : "Chưa chọn"}</div>
                                        </div>
                                    </div>

                                    {/* Danh sách gói tập để chọn */}
                                    {loadingPlans && <p className="loading-text">Đang tải danh sách gói tập...</p>}

                                    {!loadingPlans && plans.map((p) => (
                                        <button
                                            key={p.planId}
                                            className={
                                                "plan-row" +
                                                (selectedPlan?.planId === p.planId ? " selected" : "") +
                                                (p.isDiscontinued ? " disabled" : "")
                                            }
                                            disabled={p.isDiscontinued}
                                            onClick={() => selectPlan(p)}
                                        >
                                            <div className="radio">{selectedPlan?.planId === p.planId && "✓"}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700 }}>
                                                    {p.planName} {p.isDiscontinued && "(Ngừng bán)"}
                                                </div>
                                                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.durationDays} ngày</div>
                                            </div>
                                            <div style={{ fontWeight: 700, color: "var(--primary-dark)" }}>{formatMoney(p.price)}</div>
                                        </button>
                                    ))}

                                    {/* Khuyến mãi tự động áp dụng cho gói đã chọn */}
                                    {selectedPlan && (
                                        <div style={{ marginTop: 16 }}>
                                            <div className="section-label">Khuyến mãi áp dụng</div>
                                            {loadingPromotion && <p className="loading-text">Đang kiểm tra khuyến mãi...</p>}
                                            {!loadingPromotion && promotion && (
                                                <div className="promo-box">
                                                    <span className="icon">🎁</span>
                                                    <div>
                                                        <div className="name">{promotion.name}</div>
                                                        <div className="desc">{describePromotion(promotion)}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {!loadingPromotion && !promotion && (
                                                <p className="loading-text">Gói này hiện không có khuyến mãi.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* ---------- BƯỚC 3: THANH TOÁN ---------- */}
                                    {selectedPlan && (
                                        <div style={{ marginTop: 22 }}>
                                            <div className="section-label">Bước 3 — Phương thức thanh toán</div>
                                            <div className="pay-options">
                                                <button
                                                    className={"pay-btn" + (paymentMethod === "cash" ? " selected" : "")}
                                                    onClick={() => setPaymentMethod("cash")}
                                                >
                                                    💵 Tiền mặt
                                                </button>
                                                <button
                                                    className={"pay-btn" + (paymentMethod === "transfer" ? " selected" : "")}
                                                    onClick={() => setPaymentMethod("transfer")}
                                                >
                                                    💳 Chuyển khoản
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ================= CỘT PHẢI: TÓM TẮT ================= */}
                    {/* Chỉ hiện khi đã chọn hội viên — ở bước 1 chưa có gì để tóm tắt */}
                    {member && (
                        <div>
                            <div className="card">
                                <div className="card-title">Tóm tắt</div>
                                <div className="card-body">

                                    <div className="summary-total">
                                        <div className="money">{selectedPlan ? formatMoney(pricing?.finalAmount) : "—"}</div>
                                        <div className="desc">
                                            {selectedPlan ? `${pricing.totalDays} ngày · ${selectedPlan.planName}` : "Chưa chọn gói"}
                                        </div>
                                    </div>

                                    {!selectedPlan && <p className="loading-text">Chọn gói tập để xem tổng tiền</p>}

                                    {selectedPlan && (
                                        <>
                                            <div className="summary-line"><span>Giá gốc</span><b>{formatMoney(selectedPlan.price)}</b></div>
                                            {pricing.discount > 0 && (
                                                <div className="summary-line"><span>Giảm giá</span><b style={{ color: "var(--primary-dark)" }}>-{formatMoney(pricing.discount)}</b></div>
                                            )}
                                            {pricing.bonusDays > 0 && (
                                                <div className="summary-line"><span>Ngày tặng thêm</span><b style={{ color: "var(--primary-dark)" }}>+{pricing.bonusDays} ngày</b></div>
                                            )}
                                            <div className="summary-line"><span>Hạn mới</span><b>{formatDate(pricing.newExpiryDate)}</b></div>

                                            {submitError && <div className="notice error">{submitError}</div>}
                                            {!paymentMethod && <div className="notice">Vui lòng chọn phương thức thanh toán</div>}

                                            <button className="btn-submit" disabled={!canSubmit} onClick={submitRenewal}>
                                                {submitting ? "Đang xử lý..." : `Xác nhận gia hạn · ${formatMoney(pricing.finalAmount)}`}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* ---------- Popup báo thành công ---------- */}
            {successInfo && (
                <div className="overlay" onClick={startOver}>
                    <div className="success-box" onClick={(e) => e.stopPropagation()}>
                        <div className="success-icon">✓</div>
                        <h2>Gia hạn thành công!</h2>
                        <div className="success-details">
                            <div className="row"><span>Hội viên</span><b>{successInfo.memberName}</b></div>
                            <div className="row"><span>Gói tập</span><b>{successInfo.planName}</b></div>
                            <div className="row"><span>Số tiền</span><b>{formatMoney(successInfo.amount)}</b></div>
                            {successInfo.bonusDays > 0 && (
                                <div className="row"><span>Ngày tặng</span><b>+{successInfo.bonusDays} ngày</b></div>
                            )}
                            <div className="row"><span>Hạn đến</span><b>{formatDate(successInfo.newExpiryDate)}</b></div>
                        </div>
                        <button className="btn-submit" onClick={startOver}>Gia hạn cho hội viên khác</button>
                    </div>
                </div>
            )}
        </div>
    );
}