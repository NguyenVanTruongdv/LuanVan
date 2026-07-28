import { ArrowLeft, ArrowRight, Check, Gift, Percent, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import memberApi from "../../api/memberApi"; // chỉnh lại đường dẫn cho đúng project của bạn
import Footer from "../../component/Footer";
import Header from "../../component/Header";

const styles = `
  .co-root{
    --bg:#0a0a0d; --bg-soft:#101013; --card:#16161a; --border:#26262d; --border-hi:#35353d;
    --text:#f4f4f6; --text-dim:#9a9aa4; --text-faint:#64646d;
    --accent:#ff5a2e; --accent-2:#ff8a50; --accent-dim:#3a2015; --teal:#3fd6c0; --green:#33c47e;
    font-family:'Be Vietnam Pro', sans-serif;
    background:
      radial-gradient(900px 500px at 15% -10%, rgba(255,90,46,0.10), transparent 60%),
      radial-gradient(700px 500px at 100% 0%, rgba(63,214,192,0.06), transparent 55%),
      var(--bg);
    color:var(--text);
    min-height:100%;
    padding:28px 16px 70px;
  }
  .co-root *{ box-sizing:border-box; }
  .co-wrap{ max-width:1080px; margin:0 auto; }
  .co-disp{ font-family:'Space Grotesk', sans-serif; }

  .co-back{
    display:inline-flex; align-items:center; gap:7px; background:transparent; border:1px solid var(--border-hi);
    color:var(--text-dim); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer;
    margin-bottom:18px; transition:color .15s, border-color .15s;
  }
  .co-back:hover{ color:var(--text); border-color:var(--text-faint); }

  .co-stepper{ display:flex; align-items:center; justify-content:center; margin:8px 0 32px; }
  .co-step{ display:flex; align-items:center; gap:9px; }
  .co-dot{
    width:29px; height:29px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:12.5px; font-weight:700; border:1.5px solid var(--border-hi); color:var(--text-faint);
    background:var(--card); transition:all .3s ease; flex-shrink:0;
  }
  .co-step-label{ font-size:12.5px; color:var(--text-faint); font-weight:600; white-space:nowrap; }
  .co-step.active .co-dot{ border-color:var(--accent); background:var(--accent); color:#0a0a0d; box-shadow:0 0 0 4px var(--accent-dim); }
  .co-step.active .co-step-label{ color:var(--text); }
  .co-step.done .co-dot{ border-color:var(--green); background:var(--green); color:#04150c; }
  .co-step.done .co-step-label{ color:var(--text-dim); }
  .co-line{ width:40px; height:1.5px; background:var(--border-hi); margin:0 8px; transition:background .3s; }
  .co-line.done{ background:var(--green); }
  @media (max-width:600px){ .co-step-label{ display:none; } .co-line{ width:20px; } }

  .co-title{ font-size:25px; font-weight:700; margin:0 0 4px; letter-spacing:-.3px; text-align:center; }
  .co-sub{ color:var(--text-dim); font-size:14px; margin:0 0 26px; text-align:center; }

  .co-grid{ display:grid; grid-template-columns:1.35fr 1fr; gap:18px; align-items:stretch; }
  @media (max-width:860px){ .co-grid{ grid-template-columns:1fr; } }

  .co-left{ display:flex; flex-direction:column; height:100%; min-height:0; }
  .co-right{ display:flex; flex-direction:column; height:100%; min-height:0; }
  .co-card.co-grow{ flex:1; display:flex; flex-direction:column; margin-bottom:0; min-height:0; }
  .co-spacer{ flex:1; }

  .co-card{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; margin-bottom:16px; }
  .co-card-title{ font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-dim); margin:0 0 16px; display:flex; align-items:center; gap:8px; }
  .co-bar{ width:3px; height:13px; background:var(--accent); border-radius:2px; display:inline-block; }

  .co-pkg-row{ display:flex; align-items:center; gap:12px; }
  .co-pkg-box{ flex:1; border:1px solid var(--border); border-radius:12px; padding:13px 15px; background:var(--bg-soft); }
  .co-pkg-box.new{ border-color:rgba(255,90,46,0.45); background:linear-gradient(180deg, rgba(255,90,46,0.08), transparent); }
  .co-pkg-tag{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-faint); margin-bottom:5px; }
  .co-pkg-box.new .co-pkg-tag{ color:var(--accent-2); }
  .co-pkg-name{ font-size:16px; font-weight:700; }
  .co-pkg-meta{ font-size:12px; color:var(--text-dim); margin-top:3px; }

  .co-timeline{ margin-top:18px; }
  .co-track{ position:relative; height:8px; border-radius:5px; background:var(--border); overflow:hidden; }
  .co-fill-old{ position:absolute; left:0; top:0; height:100%; background:var(--border-hi); }
  .co-fill-new{ position:absolute; top:0; height:100%; background:linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius:5px; }
  .co-fill-bonus{ position:absolute; top:0; height:100%; background:repeating-linear-gradient(45deg, var(--teal), var(--teal) 5px, rgba(63,214,192,0.65) 5px, rgba(63,214,192,0.65) 10px); }
  .co-tl-labels{ display:flex; justify-content:space-between; margin-top:9px; font-size:11px; color:var(--text-faint); }
  .co-tl-pt{ display:flex; flex-direction:column; align-items:center; gap:2px; }
  .co-tl-pt b{ color:var(--text); font-weight:600; font-size:11.5px; }
  .co-tl-bonus-note{ display:flex; align-items:center; gap:7px; margin-top:11px; font-size:11.5px; color:var(--teal); font-weight:600; }
  .co-tl-bonus-dot{ width:8px; height:8px; border-radius:2px; background:repeating-linear-gradient(45deg, var(--teal), var(--teal) 2px, rgba(63,214,192,0.65) 2px, rgba(63,214,192,0.65) 4px); flex-shrink:0; }

  .co-promo{ display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px dashed rgba(63,214,192,0.4); background:rgba(63,214,192,0.06); border-radius:12px; padding:12px 15px; margin-top:16px; }
  .co-promo-left{ display:flex; align-items:center; gap:11px; }
  .co-promo-icon{ width:32px; height:32px; border-radius:9px; background:rgba(63,214,192,0.15); display:flex; align-items:center; justify-content:center; color:var(--teal); flex-shrink:0; }
  .co-promo-name{ font-weight:700; font-size:13px; }
  .co-promo-desc{ font-size:11.5px; color:var(--text-dim); margin-top:2px; }
  .co-promo-val{ font-weight:700; color:var(--teal); font-size:13.5px; white-space:nowrap; }

  .co-price-list{ margin-top:16px; border-top:1px solid var(--border); padding-top:12px; }
  .co-price-row{ display:flex; justify-content:space-between; font-size:13px; color:var(--text-dim); padding:5px 0; }
  .co-price-row.discount{ color:var(--teal); }
  .co-price-row.total{ margin-top:6px; padding-top:11px; border-top:1px solid var(--border); font-size:15px; color:var(--text); font-weight:700; }
  .co-price-row.total .val{ color:var(--accent-2); font-size:19px; }

  .co-user{ display:flex; align-items:center; gap:12px; }
  .co-avatar{ width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, var(--accent), #b8340f); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; }
  .co-user-name{ font-weight:700; font-size:14px; }
  .co-user-sub{ font-size:12px; color:var(--text-dim); margin-top:2px; }

  .co-info-line{ display:flex; justify-content:space-between; font-size:12.5px; padding:8px 0; border-bottom:1px solid var(--border); color:var(--text-dim); gap:12px; }
  .co-info-line:last-child{ border-bottom:none; }
  .co-info-line span:first-child{ flex-shrink:0; }
  .co-info-line span:last-child{ color:var(--text); font-weight:500; text-align:right; }

  .co-plan-picker{ display:flex; flex-direction:column; gap:8px; margin-top:2px; }
  .co-plan-opt{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    border:1px solid var(--border); border-radius:10px; padding:10px 13px; cursor:pointer;
    background:var(--bg-soft); transition:border-color .15s, background .15s;
  }
  .co-plan-opt:hover{ border-color:var(--border-hi); }
  .co-plan-opt.selected{ border-color:var(--accent); background:rgba(255,90,46,0.08); }
  .co-plan-opt-name{ font-size:13px; font-weight:700; }
  .co-plan-opt-meta{ font-size:11.5px; color:var(--text-dim); margin-top:2px; }
  .co-plan-opt-price{ font-size:13px; font-weight:700; color:var(--accent-2); white-space:nowrap; }
  .co-plan-badge{ font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--accent-2); background:rgba(255,90,46,0.12); border-radius:5px; padding:2px 6px; margin-left:6px; }

  .co-select-wrap{ display:flex; flex-direction:column; gap:6px; margin-top:14px; }
  .co-select-label{ font-size:11.5px; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.4px; }
  .co-select{
    width:100%; padding:11px 13px; border-radius:10px; border:1px solid var(--border-hi);
    background:var(--bg-soft); color:var(--text); font-size:13.5px; font-weight:500; cursor:pointer;
    appearance:none; -webkit-appearance:none;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239a9aa4' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
    background-repeat:no-repeat; background-position:right 13px center;
  }
  .co-select:focus{ outline:none; border-color:var(--accent); }
  .co-select.error{ border-color:var(--accent); }
  .co-select:disabled{ opacity:.55; cursor:not-allowed; }

  .co-btn{ width:100%; border:none; border-radius:12px; padding:14px 16px; font-weight:700; font-size:14.5px; cursor:pointer; transition:transform .15s, box-shadow .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .co-btn-primary{ background:linear-gradient(135deg, var(--accent), #e64a1f); color:#fff; box-shadow:0 8px 22px -8px rgba(255,90,46,0.55); }
  .co-btn-primary:hover{ transform:translateY(-1px); }
  .co-btn-primary:disabled{ opacity:.6; cursor:not-allowed; transform:none; }
  .co-btn-ghost{ background:transparent; border:1px solid var(--border-hi); color:var(--text-dim); }
  .co-btn-ghost:hover{ color:var(--text); border-color:var(--text-faint); }
  .co-btn-ghost:disabled{ opacity:.6; cursor:not-allowed; }
  .co-btn-danger{ background:transparent; border:1px solid rgba(255,90,46,0.4); color:var(--accent-2); }
  .co-btn-danger:hover{ background:rgba(255,90,46,0.08); border-color:var(--accent); }
  .co-btn-danger:disabled{ opacity:.6; cursor:not-allowed; }

  .co-fine{ font-size:11px; color:var(--text-faint); text-align:center; margin-top:11px; line-height:1.5; }
  .co-fine b{ color:var(--text-dim); }

  .co-checkout-grid{ display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:stretch; max-width:820px; margin:0 auto; }
  @media (max-width:700px){ .co-checkout-grid{ grid-template-columns:1fr; } }
  .co-checkout-grid .co-card{ display:flex; flex-direction:column; margin-bottom:0; min-height:0; }
  .co-qr-card{ text-align:center; }
  .co-qr-amount{ font-size:26px; font-weight:700; color:var(--accent-2); margin:2px 0; }
  .co-qr-box{
    width:100%; max-width:220px; aspect-ratio:1/1; margin:16px auto 12px; background:#fff; border-radius:14px; padding:10px;
    display:flex; align-items:center; justify-content:center;
  }
  .co-qr-empty{ width:100%; height:100%; border:1.5px dashed #cfcfcf; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#9a9aa4; font-size:12px; padding:10px; text-align:center; }
  .co-order{ font-size:12px; color:var(--text-dim); }
  .co-order b{ color:var(--text); letter-spacing:.4px; }
  .co-status-pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 15px; border-radius:999px; background:rgba(255,90,46,0.1); border:1px solid rgba(255,90,46,0.3); font-size:12.5px; font-weight:600; color:var(--accent-2); margin-top:16px; }
  .co-pulse{ width:7px; height:7px; border-radius:50%; background:var(--accent); animation:coPulse 1.4s ease-in-out infinite; }
  @keyframes coPulse{ 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.4; transform:scale(1.3);} }
  .co-countdown{ font-size:12px; color:var(--text-faint); margin-top:9px; }

  .co-success{ max-width:460px; margin:0 auto; text-align:center; padding:10px 0; }
  .co-check-circle{ width:74px; height:74px; border-radius:50%; margin:0 auto 20px; background:radial-gradient(circle, rgba(51,196,126,0.18), transparent 70%); display:flex; align-items:center; justify-content:center; position:relative; }
  .co-check-circle::before{ content:''; position:absolute; inset:0; border-radius:50%; border:2px solid var(--green); animation:coRing 1s ease-out; }
  @keyframes coRing{ 0%{ transform:scale(.6); opacity:0;} 60%{ opacity:1;} 100%{ transform:scale(1); opacity:1;} }
  .co-success-title{ font-size:21px; font-weight:700; margin:0 0 6px; }
  .co-success-sub{ color:var(--text-dim); font-size:13.5px; margin:0 0 22px; }

  .co-fade{ animation:coFade .35s ease; }
  @keyframes coFade{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }

  .co-state{ text-align:center; color:var(--text-dim); font-size:14px; padding:60px 16px; }
  .co-state--error{ color:var(--accent-2); }

  .co-skel{ display:inline-block; height:12px; width:90px; border-radius:4px; background:var(--border-hi); position:relative; overflow:hidden; }
  .co-skel::after{ content:''; position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); animation:coSkel 1.2s infinite; }
  @keyframes coSkel{ 0%{ transform:translateX(-100%);} 100%{ transform:translateX(100%);} }

  .co-modal-overlay{
    position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(2px);
    display:flex; align-items:center; justify-content:center; z-index:50; padding:16px;
  }
  .co-modal{
    background:var(--card); border:1px solid var(--border-hi); border-radius:16px;
    padding:22px; width:100%; max-width:380px; animation:coFade .2s ease;
  }
  .co-modal-actions{ display:flex; gap:10px; margin-top:18px; }
  .co-modal-actions .co-btn{ flex:1; }
`;

function formatVnd(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(d) {
    if (!d) return "";
    // Hỗ trợ cả DateOnly (BE trả về dạng "2026-07-03") lẫn DateTime/Date object
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("vi-VN");
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || "?";
}

// Số ngày cộng thêm vào thời hạn gói do khuyến mãi.
// "TangNgay" dùng thẳng soNgayTang; "TangChuKy" quy đổi 1 chu kỳ = 30 ngày.
// Chỉnh CHU_KY_DAYS nếu BE định nghĩa độ dài chu kỳ khác 30 ngày.
const CHU_KY_DAYS = 30;

function getPromotionBonusDays(promo) {
    if (!promo) return 0;
    if (promo.promoType === "TangNgay") return Number(promo.soNgayTang || 0);
    if (promo.promoType === "TangChuKy") return Number(promo.soChuKyTang || 0) * CHU_KY_DAYS;
    return 0;
}

// Số tiền được giảm trực tiếp trên giá gói (chỉ áp dụng cho 2 loại giảm giá).
function getPromotionDiscountAmount(promo, price) {
    if (!promo || !price) return 0;
    if (promo.promoType === "GiamPhanTram") {
        const raw = (Number(price) * Number(promo.phanTramGiam || 0)) / 100;
        return promo.mucGiamToiDa ? Math.min(raw, Number(promo.mucGiamToiDa)) : raw;
    }
    if (promo.promoType === "GiamTien") {
        return Number(promo.soTienGiam || 0);
    }
    return 0;
}

// Quy đổi tất cả các loại khuyến mãi (giảm tiền lẫn tặng ngày/chu kỳ) về cùng một đơn vị
// "giá trị VNĐ tương đương" để có thể so sánh và tự động chọn ra khuyến mãi tốt nhất cho khách,
// không cần khách phải tự chọn. Với khuyến mãi tặng ngày: quy đổi theo đơn giá/ngày của gói.
function estimatePromotionValue(promo, plan) {
    if (!promo || !plan) return 0;
    if (promo.promoType === "TangNgay" || promo.promoType === "TangChuKy") {
        const bonusDays = getPromotionBonusDays(promo);
        const perDayValue = plan.durationDays ? Number(plan.price || 0) / Number(plan.durationDays) : 0;
        return bonusDays * perDayValue;
    }
    return getPromotionDiscountAmount(promo, plan.price);
}

// Icon + nhãn hiển thị ngắn gọn cho từng loại khuyến mãi trong danh sách chọn.
function getPromotionBadge(promo) {
    switch (promo.promoType) {
        case "TangNgay":
            return { label: `+${promo.soNgayTang} ngày`, Icon: Gift };
        case "TangChuKy":
            return { label: `+${promo.soChuKyTang} chu kỳ`, Icon: Gift };
        case "GiamPhanTram":
            return { label: `-${promo.phanTramGiam}%`, Icon: Percent };
        case "GiamTien":
            return { label: `-${formatVnd(promo.soTienGiam)}`, Icon: Tag };
        default:
            return { label: "", Icon: Tag };
    }
}

// Tách bank/account/holder/nội dung CK từ query string của link ảnh QR (VietQR)
// dùng chung cho cả trường hợp tạo đơn mới và trường hợp resume đơn Pending có sẵn.
function parseQrInfo(qrImageUrl, fallbackOrderCode) {
    let bankName = "";
    let accountNumber = "";
    let accountName = "";
    let transferContent = fallbackOrderCode ?? "";

    if (qrImageUrl) {
        try {
            const qrUrl = new URL(qrImageUrl);
            bankName = qrUrl.searchParams.get("bank") ?? "";
            accountNumber = qrUrl.searchParams.get("acc") ?? "";
            accountName = qrUrl.searchParams.get("holder") ?? "";
            transferContent = qrUrl.searchParams.get("des") ?? transferContent;
        } catch (e) {
            // qrImage không đúng định dạng URL -> bỏ qua, vẫn hiển thị ảnh QR bình thường
        }
    }

    return { bankName, accountNumber, accountName, transferContent };
}

// Chuẩn hoá response /api/branches: BE trả { items: [...] } có phân trang,
// nhưng phòng thêm các trường hợp trả thẳng mảng hoặc bọc { data: [...] }.
function extractBranchList(raw) {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.data?.items)) return raw.data.items;
    return [];
}

// ---- Giữ nguyên trang QR khi F5, HOÀN TOÀN Ở PHÍA CLIENT, không gọi thêm API nào ----
// Vấn đề: location.state (nơi lưu { resumePending, pending } khi trang Gói tập điều hướng qua
// sau khi đã hỏi khách đàng hoàng) chỉ tồn tại trong session điều hướng của SPA, bị mất khi F5.
// Cách xử lý ở đây KHÔNG động tới BE/API: chỉ cần lưu tạm { step, plan, order } vào
// sessionStorage của trình duyệt ngay khi đơn được tạo (hoặc khi resume từ trang Gói tập),
// rồi khi component mount lại (kể cả do F5) thì đọc lại từ sessionStorage để khôi phục đúng
// màn QR đang xem dở, thay vì reset về màn chọn gói. Giao dịch Pending ở BE không hề bị đụng tới,
// luồng hỏi khách ở trang Gói tập (resumePending) vẫn y nguyên như cũ.
const PAYMENT_SESSION_KEY = "gym_payment_checkout_session";

function savePaymentSession(data) {
    try {
        sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(data));
    } catch (e) {
        // sessionStorage có thể bị chặn (chế độ ẩn danh, quota đầy...) -> bỏ qua,
        // chỉ mất tính năng giữ trang khi F5, không ảnh hưởng gì tới luồng thanh toán chính.
    }
}

function loadPaymentSession() {
    try {
        const raw = sessionStorage.getItem(PAYMENT_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearPaymentSession() {
    try {
        sessionStorage.removeItem(PAYMENT_SESSION_KEY);
    } catch (e) {
        // ignore
    }
}

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();

    // Trang này chỉ được điều hướng tới từ trang Gói tập (MembershipPlansPage), với 2 dạng state:
    // 1) { plan } -> khách mua gói mới bình thường, bắt đầu từ màn xác nhận đơn hàng (step 1).
    // 2) { resumePending: true, pending } -> khách chọn "Tiếp tục thanh toán" một giao dịch Pending
    //    có sẵn (trang Gói tập đã kiểm tra và hỏi khách trước khi điều hướng qua đây),
    //    vào thẳng màn QR (step 2), không tạo transaction mới.
    //
    // LƯU Ý: location.state chỉ tồn tại trong session điều hướng của SPA. Khi khách F5 ở màn QR,
    // state này mất, effect bên dưới rơi vào nhánh "mua mới" -> step bị reset về 1 dù transaction
    // Pending ở BE vẫn còn nguyên (chưa hề bị hủy). Để tránh việc này, effect bên dưới LUÔN tự hỏi
    // lại BE xem có giao dịch Pending nào của khách hay không (song song với state.resumePending,
    // không thay thế), rồi mới quyết định step/order dựa trên dữ liệu BE trả về.
    const [selectedPlan, setSelectedPlan] = useState(location.state?.plan ?? null);

    const [step, setStep] = useState(1);

    // Thông tin cá nhân + gói hiện tại: memberApi.getMyinfoToPayment() -> GET /api/payment/my-info
    // Response: { fullName, phone, branchName, currentPackage: { planName, expiryDate } | null }
    // Danh sách gói đang mở bán: memberApi.getAllPackage() -> GET /api/packages
    const [myInfo, setMyInfo] = useState(null);
    const [currentPackage, setCurrentPackage] = useState(null); // { planName, expiryDate } | null
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const [infoError, setInfoError] = useState(null);

    // Danh sách chi nhánh đang hoạt động để khách chọn nơi thanh toán/kích hoạt gói.
    // API thật: memberApi.getBranches({ status: "Active" }) -> GET /api/branches?status=Active
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [branchError, setBranchError] = useState(null);

    // Danh sách khuyến mãi áp dụng được cho gói đang chọn. Khuyến mãi tốt nhất (quy đổi ra
    // giá trị VNĐ cao nhất) sẽ được TỰ ĐỘNG áp dụng, khách không cần tự chọn.
    const [promotions, setPromotions] = useState([]);
    const [selectedPromotionId, setSelectedPromotionId] = useState(null);
    const [loadingPromotions, setLoadingPromotions] = useState(false);
    const [promotionError, setPromotionError] = useState(null);

    // Đơn thanh toán tạo ra sau khi bấm "Xác nhận & Thanh toán", hoặc được khôi phục lại
    // từ transaction Pending có sẵn khi trang Gói tập điều hướng qua với resumePending,
    // hoặc khi phát hiện Pending từ BE lúc mount lại trang (F5).
    const [order, setOrder] = useState(null); // { orderId, amount, qrImageUrl, checkoutUrl, bankName, accountName, accountNumber, transferContent, expiresInSeconds, promotion }
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [orderError, setOrderError] = useState(null);

    // Modal xác nhận hủy đơn ở màn QR
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const pollRef = useRef(null);

    // Fix: khi vào trang / chuyển bước, trình duyệt (đặc biệt trên mobile) đôi khi giữ
    // nguyên vị trí scroll của trang trước đó khiến trang này bị mở ra ở giữa chừng
    // thay vì từ đầu trang. Luôn cuộn về đầu trang mỗi khi trang được mount và mỗi khi
    // chuyển sang step khác (1 -> 2 -> 3).
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [step]);

    // Lấy thông tin cá nhân + gói hiện tại, danh sách gói đang mở bán, danh sách chi nhánh.
    // 3 lời gọi API giống hệt bản gốc, không thêm/bớt endpoint nào.
    //
    // Việc quyết định vào thẳng màn QR (step 2) hay màn chọn gói (step 1) vẫn dựa trên
    // location.state như cũ (trang Gói tập đã hỏi khách đàng hoàng trước khi điều hướng qua).
    // Điểm khác duy nhất: nếu không có state (ví dụ do F5 làm mất state) nhưng trình duyệt còn
    // lưu tạm phiên thanh toán trong sessionStorage (do chính trang này lưu lại lúc tạo đơn),
    // thì khôi phục lại từ đó — thuần phía client, không gọi thêm bất kỳ API nào.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoadingInfo(true);
                setInfoError(null);

                const [infoRes, plansRes, branchesRes] = await Promise.all([
                    memberApi.getMyinfoToPayment(),
                    memberApi.getAllPackage(),
                    memberApi.getBranches({ status: "Active", pageSize: 100 }),
                ]);

                if (!mounted) return;

                const info = infoRes?.data ?? infoRes ?? null;
                if (info) {
                    setMyInfo({
                        fullName: info.fullName,
                        phone: info.phone,
                        initialBranchName: info.branchName,
                    });

                    setCurrentPackage(
                        info.currentPackage
                            ? {
                                planName: info.currentPackage.planName,
                                expiryDate: info.currentPackage.expiryDate,
                            }
                            : null
                    );
                }

                const rawPlans = plansRes?.data ?? plansRes ?? [];
                const plans = Array.isArray(rawPlans) ? rawPlans : [];
                setAvailablePlans(plans);

                const rawBranches = branchesRes?.data ?? branchesRes ?? [];
                const branchList = extractBranchList(rawBranches).filter(
                    (b) => b.status === "Active"
                );
                setBranches(branchList);

                const state = location.state;

                if (state?.resumePending && state?.pending) {
                    // Y NGUYÊN logic cũ: khách chọn "Tiếp tục thanh toán" ở trang Gói tập (đã hỏi
                    // khách đàng hoàng), điều hướng qua đây với sẵn thông tin giao dịch Pending.
                    const pending = state.pending;
                    const plan = {
                        planId: pending.planId,
                        planName: pending.planName,
                        durationDays: pending.durationDays,
                        price: pending.planPrice,
                    };

                    const parsed = parseQrInfo(pending.qrImage, pending.orderCode);
                    const restoredOrder = {
                        orderId: pending.orderCode,
                        amount: pending.amount,
                        qrImageUrl: pending.qrImage ?? null,
                        checkoutUrl: null,
                        ...parsed,
                        expiresInSeconds: 299,
                    };

                    setSelectedPlan(plan);
                    setOrder(restoredOrder);
                    setStep(2);

                    // Lưu lại phiên vào sessionStorage ngay lúc này, để nếu khách F5 tiếp ở màn QR
                    // thì lần mount sau đọc thẳng từ đây (nhánh else if bên dưới), không cần quay
                    // lại trang Gói tập / không cần state nữa.
                    savePaymentSession({ step: 2, plan, order: restoredOrder });
                } else {
                    // Không có state.resumePending -> có thể là mua mới, HOẶC là F5 ở giữa luồng
                    // đang thanh toán (mất state). Kiểm tra sessionStorage trước khi mặc định coi
                    // là "mua mới": nếu còn phiên QR dở dang do chính trang này lưu lại trước đó
                    // (lúc tạo đơn thành công) thì khôi phục nguyên trang QR, không reset về step 1.
                    const savedSession = loadPaymentSession();

                    if (savedSession?.step === 2 && savedSession?.order && savedSession?.plan) {
                        setSelectedPlan(savedSession.plan);
                        setOrder(savedSession.order);
                        setStep(2);
                    } else {
                        // Mua gói mới bình thường. Nếu vào thẳng /payment mà chưa có gói được chọn
                        // từ trang trước, tự chọn gói đầu tiên trong danh sách để không bị kẹt màn hình lỗi.
                        setSelectedPlan((prev) => prev ?? state?.plan ?? plans[0] ?? null);
                        setStep(1);
                    }
                }
            } catch (err) {
                console.warn("Không lấy được thông tin thanh toán:", err);
                if (mounted) setInfoError("Không thể tải thông tin. Vui lòng thử lại.");
            } finally {
                if (mounted) setLoadingInfo(false);
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lấy danh sách khuyến mãi áp dụng được mỗi khi gói được chọn thay đổi (chỉ cần ở màn
    // xác nhận đơn hàng - step 1; khi resume đơn Pending thì đơn đã chốt khuyến mãi từ trước
    // nên không cần gọi lại). Khuyến mãi có giá trị quy đổi cao nhất sẽ được tự động chọn.
    useEffect(() => {
        if (!selectedPlan?.planId || step === 2) {
            setPromotions([]);
            setSelectedPromotionId(null);
            return;
        }

        let mounted = true;
        (async () => {
            try {
                setLoadingPromotions(true);
                setPromotionError(null);

                const res = await memberApi.getApplicablePromotions(selectedPlan.planId);
                const raw = res?.data ?? res ?? [];
                const list = Array.isArray(raw) ? raw : [];

                if (mounted) {
                    setPromotions(list);
                    // Tự động áp dụng khuyến mãi tốt nhất (quy đổi ra VNĐ cao nhất) cho khách,
                    // không cần khách tự chọn. Đổi gói -> tính lại từ đầu vì danh sách khuyến mãi
                    // áp dụng được có thể khác.
                    if (list.length > 0) {
                        const best = list.reduce((a, b) =>
                            estimatePromotionValue(b, selectedPlan) > estimatePromotionValue(a, selectedPlan) ? b : a
                        );
                        setSelectedPromotionId(best.promotionId);
                    } else {
                        setSelectedPromotionId(null);
                    }
                }
            } catch (err) {
                console.warn("Không lấy được danh sách khuyến mãi:", err);
                if (mounted) {
                    setPromotions([]);
                    setPromotionError("Không thể tải khuyến mãi.");
                }
            } finally {
                if (mounted) setLoadingPromotions(false);
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlan?.planId]);

    const selectedPromotion = promotions.find((p) => p.promotionId === selectedPromotionId) ?? null;

    // Tạo đơn thanh toán khi bước sang màn hình QR
    // API thật: memberApi.createPayment(planId, branchId, promotionId) -> POST /api/payment/create { planId, branchId, promotionId }
    const handleConfirmPayment = async () => {
        if (!selectedPlan) return;

        // Bắt buộc phải chọn chi nhánh trước khi tạo đơn (BE trả lỗi "Không tìm thấy chi nhánh"
        // nếu thiếu branchId).
        if (!selectedBranchId) {
            setBranchError("Vui lòng chọn chi nhánh thanh toán.");
            return;
        }

        try {
            setCreatingOrder(true);
            setOrderError(null);

            const res = await memberApi.createPayment(
                selectedPlan.planId,
                selectedBranchId,
                selectedPromotionId ?? null
            );
            const raw = res?.data ?? res;

            if (!raw) throw new Error("Không nhận được dữ liệu thanh toán từ server");

            // Response thật từ BE: { orderCode, amount, qrImage }
            // qrImage là link ảnh VietQR trực tiếp, dạng:
            // https://vietqr.app/img?bank=MBBank&acc=...&amount=...&des=...&holder=...
            // BE không trả riêng bankName/accountNumber/holder nên tách từ query string của qrImage để hiển thị.
            // amount trả về đã là số tiền cuối cùng sau khi BE áp dụng khuyến mãi (nếu có).
            const parsed = parseQrInfo(raw.qrImage, raw.orderCode);

            const newOrder = {
                orderId: raw.orderCode,
                amount: raw.amount ?? finalPrice,
                qrImageUrl: raw.qrImage ?? null, // null -> UI sẽ hiển thị ô trống "Chưa có mã QR" để dễ nhận biết khi test
                checkoutUrl: null,
                ...parsed,
                expiresInSeconds: raw.expiresInSeconds ?? 299,
                promotion: selectedPromotion,
            };

            setOrder(newOrder);
            setStep(2);

            // Lưu tạm phiên thanh toán vào sessionStorage (chỉ phía client, không gọi API nào)
            // để nếu khách F5 ngay tại màn QR thì lần mount sau vẫn khôi phục lại đúng màn này.
            savePaymentSession({ step: 2, plan: selectedPlan, order: newOrder });
        } catch (err) {
            console.error("Lỗi khi tạo thanh toán:", err);
            setOrderError("Không thể tạo thanh toán. Vui lòng thử lại.");
        } finally {
            setCreatingOrder(false);
        }
    };

    // Hủy đơn đang chờ thanh toán. API thật: memberApi.cancelPayment(orderCode) -> POST /api/payment/cancel/{orderCode}
    const handleCancelPayment = async () => {
        if (!order) return;
        try {
            setCancelling(true);
            await memberApi.cancelPayment(order.orderId);

            clearInterval(pollRef.current);
            setShowCancelConfirm(false);
            setOrder(null);
            setOrderError(null);
            // Đơn đã bị hủy -> xóa luôn phiên đã lưu trong sessionStorage, nếu không lần F5 sau
            // (hoặc quay lại trang này) sẽ vô tình khôi phục nhầm một đơn đã hủy.
            clearPaymentSession();
            // Hủy xong -> quay thẳng về trang gói tập để chọn lại từ đầu,
            // không ở lại trang payment nữa.
            navigate("/packages", { replace: true });
            return;
        } catch (err) {
            console.error("Lỗi khi hủy đơn hàng:", err);
            setShowCancelConfirm(false);
            setOrderError("Không thể hủy đơn hàng. Vui lòng thử lại.");
        } finally {
            setCancelling(false);
        }
    };

    // Poll trạng thái thanh toán mỗi 3s để tự động chuyển sang bước 3 khi thanh toán thành công
    // API thật: memberApi.getPaymentStatus(orderCode) -> GET /api/payment/status/{orderCode}
    useEffect(() => {
        if (step !== 2 || !order) return;

        let cancelled = false;

        const checkStatus = async () => {
            try {
                const res = await memberApi.getPaymentStatus(order.orderId);
                const raw = res?.data ?? res;
                const status = String(raw?.status ?? raw?.paymentStatus ?? "")
                    .trim()
                    .toLowerCase();

                if (!cancelled && status === "paid") {
                    clearInterval(pollRef.current);
                    // Thanh toán xong -> xóa phiên đã lưu để F5 sau này không bị khôi phục
                    // nhầm về màn QR của một đơn đã thanh toán xong.
                    clearPaymentSession();
                    setStep(3);
                }
            } catch (err) {
                console.warn("Lỗi khi kiểm tra trạng thái thanh toán:", err);
            }
        };

        // Check ngay lần đầu, không chờ 3s
        checkStatus();
        pollRef.current = setInterval(checkStatus, 3000);

        return () => {
            cancelled = true;
            clearInterval(pollRef.current);
        };
    }, [step, order]);

    // Số ngày tặng thêm và số tiền được giảm từ khuyến mãi đang chọn (nếu có)
    const bonusDays = getPromotionBonusDays(selectedPromotion);
    const discountAmount = selectedPlan ? getPromotionDiscountAmount(selectedPromotion, selectedPlan.price) : 0;
    const finalPrice = selectedPlan ? Math.max(0, Number(selectedPlan.price || 0) - discountAmount) : 0;

    // Tính mốc thời gian hiệu lực gói mới (đã cộng thêm số ngày tặng nếu có khuyến mãi loại tặng ngày/chu kỳ)
    // Nếu hội viên đang có gói active -> gói mới bắt đầu tính từ ngày hết hạn gói cũ (nối tiếp)
    // Nếu chưa có gói nào -> bắt đầu từ hôm nay
    const today = new Date();
    const newStart = currentPackage?.expiryDate ? new Date(currentPackage.expiryDate) : today;
    const totalDurationDays = selectedPlan ? Number(selectedPlan.durationDays || 0) + bonusDays : 0;
    const newEnd = selectedPlan ? addDays(newStart, totalDurationDays) : null;

    // Chia thanh thời gian biểu thành 3 đoạn: gói cũ (xám) / gói mới (cam) / ngày tặng thêm (teal sọc)
    const oldSegmentWidth = currentPackage ? 22 : 0;
    const newSegmentTotalWidth = 100 - oldSegmentWidth;
    const bonusSegmentWidth = totalDurationDays > 0 ? (bonusDays / totalDurationDays) * newSegmentTotalWidth : 0;
    const planSegmentWidth = newSegmentTotalWidth - bonusSegmentWidth;

    const goToPackages = () => navigate("/packages");

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setOrderError(null);
    };

    const handleSelectBranch = (e) => {
        setSelectedBranchId(e.target.value);
        setBranchError(null);
    };

    return (
        <>
            {/* Header không có route /payment riêng trong NAV_LINKS nên dùng prop `active="packages"`
                để ép highlight mục "Gói tập" trên thanh nav trong suốt luồng thanh toán */}
            <Header active="packages" />
            <div className="co-root">
                <style>{styles}</style>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
                />
                <div className="co-wrap">
                    {/* Stepper */}
                    <div className="co-stepper">
                        <div className={`co-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
                            <div className="co-dot co-disp">{step > 1 ? <Check size={14} /> : "1"}</div>
                            <div className="co-step-label">Thông tin đơn hàng</div>
                        </div>
                        <div className={`co-line ${step > 1 ? "done" : ""}`} />
                        <div className={`co-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
                            <div className="co-dot co-disp">{step > 2 ? <Check size={14} /> : "2"}</div>
                            <div className="co-step-label">Quét mã thanh toán</div>
                        </div>
                        <div className={`co-line ${step > 2 ? "done" : ""}`} />
                        <div className={`co-step ${step === 3 ? "active" : ""}`}>
                            <div className="co-dot co-disp">3</div>
                            <div className="co-step-label">Hoàn tất</div>
                        </div>
                    </div>

                    {/* Đang tải thông tin ban đầu */}
                    {loadingInfo && (
                        <div className="co-state">Đang tải thông tin...</div>
                    )}

                    {/* Lỗi khi tải thông tin trang */}
                    {!loadingInfo && infoError && (
                        <div className="co-state co-state--error">
                            {infoError}
                            <div style={{ marginTop: 16 }}>
                                <button
                                    className="co-btn co-btn-primary"
                                    style={{ width: "auto", padding: "10px 20px" }}
                                    onClick={() => window.location.reload()}
                                >
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Không có gói nào để mua (không truyền từ trang trước và BE cũng không trả gói nào đang mở bán) */}
                    {!loadingInfo && !infoError && !selectedPlan && (
                        <div className="co-state co-state--error">
                            Không tìm thấy thông tin gói tập bạn muốn mua.
                            <div style={{ marginTop: 16 }}>
                                <button className="co-btn co-btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={goToPackages}>
                                    Quay lại chọn gói
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 1 */}
                    {!loadingInfo && !infoError && selectedPlan && step === 1 && (
                        <div className="co-fade">
                            <button className="co-back" onClick={goToPackages}>
                                <ArrowLeft size={15} /> Quay lại chọn gói
                            </button>

                            <h1 className="co-title co-disp">Xác nhận đơn hàng</h1>
                            <p className="co-sub">Kiểm tra lại thông tin gói tập trước khi thanh toán</p>

                            <div className="co-grid">
                                <div className="co-left">
                                    <div className="co-card co-grow">
                                        <div className="co-card-title"><span className="co-bar" />Chuyển đổi gói tập</div>
                                        <div className="co-pkg-row">
                                            <div className="co-pkg-box">
                                                <div className="co-pkg-tag">Gói hiện tại</div>
                                                {currentPackage ? (
                                                    <>
                                                        <div className="co-pkg-name co-disp">{currentPackage.planName}</div>
                                                        <div className="co-pkg-meta">Kết thúc {formatDate(currentPackage.expiryDate)}</div>
                                                    </>
                                                ) : (
                                                    <div className="co-pkg-meta">Chưa có gói nào</div>
                                                )}
                                            </div>
                                            <ArrowRight size={18} color="#64646d" style={{ flexShrink: 0 }} />
                                            <div className="co-pkg-box new">
                                                <div className="co-pkg-tag">Gói muốn mua</div>
                                                <div className="co-pkg-name co-disp">{selectedPlan.planName}</div>
                                                <div className="co-pkg-meta">
                                                    Thời hạn {selectedPlan.durationDays} ngày
                                                    {bonusDays > 0 && ` + ${bonusDays} ngày tặng`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="co-timeline">
                                            <div className="co-track">
                                                <div className="co-fill-old" style={{ width: `${oldSegmentWidth}%` }} />
                                                <div className="co-fill-new" style={{ left: `${oldSegmentWidth}%`, width: `${planSegmentWidth}%` }} />
                                                {bonusDays > 0 && (
                                                    <div
                                                        className="co-fill-bonus"
                                                        style={{ left: `${oldSegmentWidth + planSegmentWidth}%`, width: `${bonusSegmentWidth}%` }}
                                                    />
                                                )}
                                            </div>
                                            <div className="co-tl-labels">
                                                <div className="co-tl-pt">Hôm nay<br /><b>{formatDate(today)}</b></div>
                                                <div className="co-tl-pt">Bắt đầu gói mới<br /><b>{formatDate(newStart)}</b></div>
                                                <div className="co-tl-pt">Kết thúc gói mới<br /><b>{formatDate(newEnd)}</b></div>
                                            </div>
                                            {bonusDays > 0 && (
                                                <div className="co-tl-bonus-note">
                                                    <span className="co-tl-bonus-dot" />
                                                    Bao gồm {bonusDays} ngày tặng thêm từ khuyến mãi "{selectedPromotion?.tenKhuyenMai}"
                                                </div>
                                            )}
                                        </div>

                                        {/* Danh sách gói đang mở bán để đổi lựa chọn ngay tại trang này */}
                                        {availablePlans.length > 1 && (
                                            <div style={{ marginTop: 18 }}>
                                                <div className="co-card-title" style={{ marginBottom: 10 }}>
                                                    <span className="co-bar" />Chọn gói khác
                                                </div>
                                                <div className="co-plan-picker">
                                                    {availablePlans.map((plan) => (
                                                        <div
                                                            key={plan.planId}
                                                            className={`co-plan-opt ${selectedPlan.planId === plan.planId ? "selected" : ""}`}
                                                            onClick={() => handleSelectPlan(plan)}
                                                        >
                                                            <div>
                                                                <span className="co-plan-opt-name">
                                                                    {plan.planName}
                                                                    {plan.isPopular && <span className="co-plan-badge">Phổ biến</span>}
                                                                </span>
                                                                <div className="co-plan-opt-meta">Thời hạn {plan.durationDays} ngày</div>
                                                            </div>
                                                            <div className="co-plan-opt-price co-disp">{formatVnd(plan.price)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Khuyến mãi được tự động áp dụng cho gói đang chọn (khách không cần tự chọn -
                                            hệ thống tự tìm khuyến mãi có giá trị quy đổi cao nhất trong danh sách áp dụng được) */}
                                        <div style={{ marginTop: 18 }}>
                                            <div className="co-card-title" style={{ marginBottom: 10 }}>
                                                <span className="co-bar" />Khuyến mãi
                                            </div>

                                            {loadingPromotions && <div className="co-fine">Đang tải khuyến mãi...</div>}

                                            {!loadingPromotions && promotionError && (
                                                <div className="co-fine" style={{ color: "var(--accent-2)" }}>{promotionError}</div>
                                            )}

                                            {!loadingPromotions && !promotionError && promotions.length === 0 && (
                                                <div className="co-fine">Gói này hiện chưa có khuyến mãi áp dụng.</div>
                                            )}

                                            {!loadingPromotions && !promotionError && selectedPromotion && (() => {
                                                const badge = getPromotionBadge(selectedPromotion);
                                                const BadgeIcon = badge.Icon;
                                                return (
                                                    <div className="co-promo" style={{ marginTop: 0 }}>
                                                        <div className="co-promo-left">
                                                            <div className="co-promo-icon">
                                                                <BadgeIcon size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="co-promo-name">
                                                                    {selectedPromotion.tenKhuyenMai}
                                                                    <span
                                                                        style={{
                                                                            marginLeft: 8,
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
                                                                            textTransform: "uppercase",
                                                                            letterSpacing: ".4px",
                                                                            color: "var(--teal)",
                                                                            background: "rgba(63,214,192,0.12)",
                                                                            borderRadius: 5,
                                                                            padding: "2px 6px",
                                                                        }}
                                                                    >
                                                                        Tự động áp dụng
                                                                    </span>
                                                                </div>
                                                                {selectedPromotion.moTa && (
                                                                    <div className="co-promo-desc">{selectedPromotion.moTa}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="co-promo-val co-disp">{badge.label}</div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="co-spacer" />

                                        <div className="co-price-list">
                                            <div className="co-price-row"><span>Giá {selectedPlan.planName}</span><span>{formatVnd(selectedPlan.price)}</span></div>
                                            {discountAmount > 0 && (
                                                <div className="co-price-row discount">
                                                    <span>Khuyến mãi ({selectedPromotion?.tenKhuyenMai})</span>
                                                    <span>-{formatVnd(discountAmount)}</span>
                                                </div>
                                            )}
                                            <div className="co-price-row total"><span>Thành tiền</span><span className="val co-disp">{formatVnd(finalPrice)}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="co-right">
                                    {/* Thông tin cá nhân */}
                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Thông tin cá nhân</div>
                                        <div className="co-user">
                                            <div className="co-avatar co-disp">{getInitials(myInfo?.fullName)}</div>
                                            <div>
                                                <div className="co-user-name">{myInfo?.fullName || "—"}</div>
                                                <div className="co-user-sub">{myInfo?.phone || "—"}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 14 }}>
                                            <div className="co-info-line">
                                                <span>Số điện thoại</span>
                                                <span>{myInfo?.phone || "—"}</span>
                                            </div>
                                            <div className="co-info-line">
                                                <span>Chi nhánh đăng ký ban đầu</span>
                                                <span>{myInfo?.initialBranchName || "—"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="co-card co-grow">
                                        <div className="co-card-title"><span className="co-bar" />Thanh toán</div>
                                        <div className="co-info-line">
                                            <span>Tổng cộng</span>
                                            <span className="co-disp" style={{ fontSize: 17, color: "#ff8a50" }}>{formatVnd(finalPrice)}</span>
                                        </div>

                                        {/* Chọn chi nhánh thanh toán / kích hoạt gói -> gửi kèm branchId khi tạo đơn */}
                                        <div className="co-select-wrap">
                                            <div className="co-select-label">Chi nhánh thanh toán</div>
                                            <select
                                                className={`co-select${branchError ? " error" : ""}`}
                                                value={selectedBranchId}
                                                onChange={handleSelectBranch}
                                                disabled={branches.length === 0}
                                            >
                                                <option value="">
                                                    {branches.length === 0 ? "Không có chi nhánh khả dụng" : "-- Chọn chi nhánh --"}
                                                </option>
                                                {branches.map((b) => (
                                                    <option key={b.branchId} value={b.branchId}>
                                                        {b.branchName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {branchError && (
                                            <div className="co-fine" style={{ color: "var(--accent-2)", marginTop: 8 }}>{branchError}</div>
                                        )}

                                        {orderError && (
                                            <div className="co-fine" style={{ color: "var(--accent-2)", marginTop: 10 }}>{orderError}</div>
                                        )}

                                        <div className="co-spacer" />

                                        <button
                                            className="co-btn co-btn-primary"
                                            style={{ marginTop: 14 }}
                                            disabled={creatingOrder}
                                            onClick={handleConfirmPayment}
                                        >
                                            {creatingOrder ? "Đang tạo đơn..." : "Xác nhận & Thanh toán"}
                                        </button>
                                        <div className="co-fine">
                                            Bằng việc xác nhận, gói mới sẽ được kích hoạt từ <b>{formatDate(newStart)}</b>{currentPackage ? " ngay sau khi gói hiện tại kết thúc." : "."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 2 */}
                    {!loadingInfo && !infoError && selectedPlan && step === 2 && order && (
                        <div className="co-fade">
                            <h1 className="co-title co-disp">Quét mã để thanh toán</h1>
                            <p className="co-sub">Mở app ngân hàng hoặc ví điện tử và quét mã QR bên dưới</p>

                            <div className="co-checkout-grid">
                                {/* Cột QR */}
                                <div className="co-card co-qr-card">
                                    <div className="co-qr-amount co-disp">{formatVnd(order.amount)}</div>
                                    <div style={{ fontSize: 12, color: "#64646d" }}>Số tiền cần thanh toán</div>

                                    <div className="co-qr-box">
                                        {order.qrImageUrl ? (
                                            <img src={order.qrImageUrl} alt="QR thanh toán" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                        ) : (
                                            // Chưa lấy được QR thật từ BE -> để trống có viền đứt để dễ nhận biết khi test
                                            <div className="co-qr-empty">Chưa có mã QR</div>
                                        )}
                                    </div>

                                    {order.checkoutUrl && (
                                        <a
                                            href={order.checkoutUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="co-btn co-btn-ghost"
                                            style={{ marginTop: 6, textDecoration: "none" }}
                                        >
                                            Mở trang thanh toán
                                        </a>
                                    )}

                                    <div className="co-spacer" />

                                    <div className="co-status-pill"><span className="co-pulse" />Đang chờ thanh toán...</div>

                                    <button
                                        className="co-btn co-btn-danger"
                                        style={{ marginTop: 14 }}
                                        onClick={() => setShowCancelConfirm(true)}
                                    >
                                        Hủy đơn hàng
                                    </button>
                                </div>

                                {/* Cột thông tin: đơn hàng + cá nhân, để khách xem đầy đủ trước khi quyết định thanh toán */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Thông tin đơn hàng</div>
                                        <div className="co-info-line"><span>Mã đơn hàng</span><span>#{order.orderId}</span></div>
                                        <div className="co-info-line"><span>Gói tập</span><span>{selectedPlan.planName}</span></div>
                                        <div className="co-info-line"><span>Thời hạn</span><span>{selectedPlan.durationDays} ngày{bonusDays > 0 && ` + ${bonusDays} ngày tặng`}</span></div>
                                        {order.promotion && (
                                            <div className="co-info-line"><span>Khuyến mãi</span><span>{order.promotion.tenKhuyenMai}</span></div>
                                        )}
                                        {order.bankName && <div className="co-info-line"><span>Ngân hàng</span><span>{order.bankName}</span></div>}
                                        {order.accountName && <div className="co-info-line"><span>Chủ tài khoản</span><span>{order.accountName}</span></div>}
                                        {order.accountNumber && <div className="co-info-line"><span>Số tài khoản</span><span>{order.accountNumber}</span></div>}
                                        <div className="co-info-line"><span>Nội dung CK</span><span>{order.transferContent}</span></div>
                                        <div className="co-info-line"><span>Số tiền</span><span style={{ color: "var(--accent-2)", fontWeight: 700 }}>{formatVnd(order.amount)}</span></div>

                                        {orderError && (
                                            <div className="co-fine" style={{ color: "var(--accent-2)", marginTop: 10 }}>{orderError}</div>
                                        )}
                                    </div>

                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Thông tin cá nhân</div>
                                        <div className="co-user">
                                            <div className="co-avatar co-disp">{getInitials(myInfo?.fullName)}</div>
                                            <div>
                                                <div className="co-user-name">{myInfo?.fullName || "—"}</div>
                                                <div className="co-user-sub">{myInfo?.phone || "—"}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 14 }}>
                                            <div className="co-info-line">
                                                <span>Số điện thoại</span>
                                                <span>{myInfo?.phone || "—"}</span>
                                            </div>
                                            <div className="co-info-line">
                                                <span>Chi nhánh</span>
                                                <span>
                                                    {branches.find((b) => String(b.branchId) === String(selectedBranchId))?.branchName
                                                        || myInfo?.initialBranchName
                                                        || "—"}
                                                </span>
                                            </div>
                                            {currentPackage && (
                                                <div className="co-info-line">
                                                    <span>Gói hiện tại</span>
                                                    <span>{currentPackage.planName} (hết hạn {formatDate(currentPackage.expiryDate)})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 3 */}
                    {!loadingInfo && !infoError && selectedPlan && step === 3 && (
                        <div className="co-fade co-success">
                            <div className="co-check-circle">
                                <Check size={34} color="#33c47e" strokeWidth={3} />
                            </div>
                            <h1 className="co-success-title co-disp">Thanh toán thành công!</h1>
                            <p className="co-success-sub">{selectedPlan.planName} sẽ tự động kích hoạt vào {formatDate(newStart)}</p>

                            <div className="co-card" style={{ textAlign: "left" }}>
                                <div className="co-card-title"><span className="co-bar" />Chi tiết giao dịch</div>
                                <div className="co-info-line"><span>Gói tập</span><span>{selectedPlan.planName}</span></div>
                                <div className="co-info-line"><span>Thời hạn</span><span>{formatDate(newStart)} &ndash; {formatDate(newEnd)}</span></div>
                                {order?.promotion && (
                                    <div className="co-info-line"><span>Khuyến mãi</span><span>{order.promotion.tenKhuyenMai}</span></div>
                                )}
                                <div className="co-info-line"><span>Mã đơn hàng</span><span>#{order?.orderId}</span></div>
                                <div className="co-info-line"><span>Số tiền đã thanh toán</span><span style={{ color: "#ff8a50", fontWeight: 700 }}>{formatVnd(order?.amount ?? finalPrice)}</span></div>
                            </div>

                            <button className="co-btn co-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/")}>
                                Về trang chủ
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal xác nhận hủy đơn hàng */}
                {showCancelConfirm && (
                    <div
                        className="co-modal-overlay"
                        onClick={() => !cancelling && setShowCancelConfirm(false)}
                    >
                        <div className="co-modal co-fade" onClick={(e) => e.stopPropagation()}>
                            <h3 className="co-disp" style={{ marginTop: 0, marginBottom: 8 }}>Hủy đơn hàng?</h3>
                            <p style={{ color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                                Đơn hàng <b style={{ color: "var(--text)" }}>#{order?.orderId}</b> sẽ bị hủy và bạn có thể chọn lại gói tập khác. Hành động này không thể hoàn tác.
                            </p>
                            <div className="co-modal-actions">
                                <button
                                    className="co-btn co-btn-ghost"
                                    disabled={cancelling}
                                    onClick={() => setShowCancelConfirm(false)}
                                >
                                    Không, giữ lại
                                </button>
                                <button
                                    className="co-btn co-btn-primary"
                                    disabled={cancelling}
                                    onClick={handleCancelPayment}
                                >
                                    {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}