import { useEffect, useMemo, useState } from "react";
import cashierApi from "../../../api/cashierApi";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --green:       #1E6B45; --green-dark: #155235; --green-light: #E8F5EE; --green-border: rgba(30,107,69,0.18);
  --bg: #F4F6F8; --surface: #FFFFFF; --border: #E4EAF0; --border-md: #C9D4DF;
  --text-1: #111827; --text-2: #4B5563; --text-3: #9CA3AF;
  --danger: #DC2626; --danger-light: #FEF2F2; --danger-border: #FECACA;
  --warn: #D97706; --warn-light: #FFFBEB; --warn-border: #FCD34D;
  --blue: #2563EB; --blue-light: #EFF6FF; --blue-border: rgba(37,99,235,0.18);
  --radius: 12px; --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.05); --shadow-md: 0 4px 16px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 40px rgba(0,0,0,.12);
}
html,body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text-1);-webkit-font-smoothing:antialiased;}

.main { max-width: 1100px; margin: 0 auto; padding: 32px 28px 60px; }

/* page header */
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; gap:16px; flex-wrap:wrap; }
.page-head-left { display:flex; align-items:center; gap:14px; }
.page-icon {
  width:42px;height:42px;border-radius:11px;
  background:linear-gradient(135deg,var(--green),var(--green-dark));
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:0 3px 10px rgba(30,107,69,.28);
}
.page-title { font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-0.5px;line-height:1; }
.page-subtitle { font-size:13px;color:var(--text-2);margin-top:3px;font-weight:500; }

/* steps */
.steps { display:flex; align-items:center; gap:0; margin-bottom:32px; }
.step { display:flex;align-items:center;gap:8px;flex:1; }
.step-circle {
  width:32px;height:32px;border-radius:50%;border:2px solid var(--border-md);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;color:var(--text-3);background:var(--surface);
  flex-shrink:0;transition:all .2s;
}
.step.done .step-circle { background:var(--green);border-color:var(--green);color:#fff; }
.step.active .step-circle { background:var(--green-light);border-color:var(--green);color:var(--green); }
.step-label { font-size:12px;font-weight:600;color:var(--text-3); }
.step.done .step-label,.step.active .step-label { color:var(--text-1); }
.step-line { flex:1;height:2px;background:var(--border);margin:0 8px; }
.step-line.done { background:var(--green); }

/* layout */
.layout { display:grid; grid-template-columns:1fr 360px; gap:24px; align-items:start; }

/* card */
.card {
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden;
}
.card-head {
  padding:18px 22px; border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:10px;
}
.card-head-icon {
  width:32px;height:32px;border-radius:8px;background:var(--green-light);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.card-head-title { font-size:14px;font-weight:700;color:var(--text-1); }
.card-head-sub { font-size:12px;color:var(--text-2);margin-top:1px; }
.card-body { padding:20px 22px; }

/* member search */
.search-wrap { position:relative;display:flex;align-items:center; }
.search-icon { position:absolute;left:12px;color:var(--text-3);width:16px;height:16px;flex-shrink:0; }
.search-input {
  width:100%;background:var(--bg);border:1.5px solid var(--border);
  border-radius:var(--radius-sm);padding:10px 12px 10px 38px;
  font-size:14px;color:var(--text-1);font-family:'Inter',sans-serif;font-weight:500;outline:none;
  transition:border-color .15s,box-shadow .15s;
}
.search-input::placeholder{color:var(--text-3);font-weight:400;}
.search-input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(30,107,69,.10);background:#fff;}

/* member result */
.member-result {
  margin-top:10px;border:1.5px solid var(--green-border);border-radius:var(--radius-sm);
  background:var(--green-light);padding:14px 16px;display:flex;align-items:center;gap:12px;
  cursor:pointer;transition:border-color .15s;
}
.member-result:hover{border-color:var(--green);}
.avatar {
  width:40px;height:40px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;color:#fff;
}
.member-name { font-size:14px;font-weight:700;color:var(--text-1); }
.member-meta { font-size:12px;color:var(--text-2);margin-top:2px; }
.member-select-hint { font-size:12px;color:var(--green);font-weight:600;margin-left:auto;white-space:nowrap; }

/* current package banner */
.pkg-banner {
  border-radius:var(--radius-sm);padding:14px 16px;margin-top:0;
  display:flex;align-items:center;gap:12px;border:1px solid;
}
.pkg-banner.active { background:#ECFDF5;border-color:#6EE7B7; }
.pkg-banner.expired { background:var(--warn-light);border-color:var(--warn-border); }
.pkg-banner.none { background:var(--bg);border-color:var(--border); }
.pkg-banner-label { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px; }
.pkg-banner.active .pkg-banner-label { color:#065F46; }
.pkg-banner.expired .pkg-banner-label { color:var(--warn); }
.pkg-banner.none .pkg-banner-label { color:var(--text-3); }
.pkg-banner-name { font-size:15px;font-weight:800;color:var(--text-1); }
.pkg-banner-dates { font-size:12px;color:var(--text-2);margin-top:3px; }
.pkg-banner-badge {
  margin-left:auto;flex-shrink:0;padding:4px 10px;border-radius:20px;
  font-size:11px;font-weight:700;
}
.badge-active { background:#D1FAE5;color:#065F46; }
.badge-expired { background:var(--warn-light);color:var(--warn);border:1px solid var(--warn-border); }

/* plan grid */
.plan-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
.plan-card {
  border:2px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;
  cursor:pointer;transition:all .15s;position:relative;overflow:hidden;background:var(--surface);
}
.plan-card:hover{border-color:var(--green);background:var(--green-light);}
.plan-card.selected{border-color:var(--green);background:var(--green-light);box-shadow:0 0 0 3px rgba(30,107,69,.12);}
.plan-card.discontinued{opacity:.45;cursor:not-allowed;pointer-events:none;}
.plan-badge {
  position:absolute;top:10px;right:10px;
  background:var(--green);color:#fff;font-size:10px;font-weight:700;
  padding:2px 8px;border-radius:20px;letter-spacing:.4px;
}
.plan-name { font-size:14px;font-weight:800;color:var(--text-1);margin-bottom:4px; }
.plan-duration { font-size:12px;color:var(--text-2);font-weight:500;margin-bottom:8px; }
.plan-price { font-size:20px;font-weight:900;color:var(--green);letter-spacing:-0.5px; }
.plan-price-unit { font-size:12px;font-weight:500;color:var(--text-3);margin-left:2px; }
.plan-desc { font-size:11.5px;color:var(--text-2);margin-top:6px;line-height:1.5; }
.plan-selected-check {
  position:absolute;bottom:10px;right:10px;
  width:20px;height:20px;border-radius:50%;background:var(--green);
  display:flex;align-items:center;justify-content:center;
}

/* promo select */
.promo-select {
  width:100%;background:var(--bg);border:1.5px solid var(--border);
  border-radius:var(--radius-sm);padding:10px 14px;
  font-size:14px;color:var(--text-1);font-family:'Inter',sans-serif;font-weight:600;outline:none;
  transition:border-color .15s,box-shadow .15s;cursor:pointer;appearance:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat:no-repeat;background-position:right 12px center;background-size:16px;
  padding-right:38px;
}
.promo-select:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(30,107,69,.10);background-color:#fff;}
.promo-tag {
  display:inline-flex;align-items:center;gap:6px;
  background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46;
  border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;margin-top:10px;
}

/* payment method */
.pay-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
.pay-card {
  border:2px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;
  cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:12px;background:var(--surface);
}
.pay-card:hover{border-color:var(--green);background:var(--green-light);}
.pay-card.selected{border-color:var(--green);background:var(--green-light);box-shadow:0 0 0 3px rgba(30,107,69,.12);}
.pay-card-icon {
  width:36px;height:36px;border-radius:9px;background:var(--bg);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.pay-card.selected .pay-card-icon { background:#fff; }
.pay-card-name { font-size:13.5px;font-weight:700;color:var(--text-1); }
.pay-card-sub { font-size:11.5px;color:var(--text-2);margin-top:1px; }

.transfer-box {
  margin-top:14px;border:1.5px solid var(--blue-border);background:var(--blue-light);
  border-radius:var(--radius-sm);padding:14px 16px;
}
.transfer-box-title { font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px; }
.transfer-info-row { display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:6px; }
.transfer-info-row:last-of-type{margin-bottom:0;}
.transfer-info-row .k { color:var(--text-2);font-weight:500; }
.transfer-info-row .v { font-weight:700;color:var(--text-1); }
.transfer-ref-input {
  width:100%;background:#fff;border:1.5px solid var(--border);
  border-radius:var(--radius-sm);padding:9px 12px;margin-top:10px;
  font-size:13px;color:var(--text-1);font-family:'Inter',sans-serif;font-weight:500;outline:none;
}
.transfer-ref-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.10);}
.transfer-file-input { margin-top:10px;font-size:12.5px;color:var(--text-2);font-weight:500; }
.transfer-confirm {
  display:flex;align-items:flex-start;gap:9px;margin-top:12px;cursor:pointer;user-select:none;
}
.transfer-confirm input { margin-top:2px;width:16px;height:16px;accent-color:var(--blue);cursor:pointer;flex-shrink:0; }
.transfer-confirm span { font-size:12.5px;color:var(--text-1);font-weight:600;line-height:1.5; }
.transfer-confirmed-tag {
  display:flex;align-items:center;gap:6px;margin-top:12px;
  background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46;
  border-radius:6px;padding:7px 10px;font-size:12px;font-weight:700;
}

/* summary card (right col) */
.summary-card { position:sticky;top:24px; }
.summary-head {
  background:linear-gradient(135deg,var(--green),var(--green-dark));
  padding:20px 22px;
}
.summary-head-title { font-size:13px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px; }
.summary-total { font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1; }
.summary-total-sub { font-size:12px;color:rgba(255,255,255,.65);margin-top:4px; }
.summary-body { padding:18px 22px; }
.summary-row { display:flex;align-items:flex-start;justify-content:space-between;gap:12px;font-size:13.5px;margin-bottom:12px; }
.summary-row:last-child{margin-bottom:0;}
.summary-row .lbl { color:var(--text-2);font-weight:500; }
.summary-row .val { font-weight:700;color:var(--text-1);text-align:right; }
.summary-row .val.green { color:var(--green); }
.summary-row .val.red { color:var(--danger); }
.summary-divider { height:1px;background:var(--border);margin:14px 0; }
.summary-new-expiry {
  background:var(--green-light);border:1px solid var(--green-border);
  border-radius:var(--radius-sm);padding:12px 14px;margin:14px 0;
  display:flex;align-items:center;gap:10px;
}
.summary-new-expiry-label { font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px; }
.summary-new-expiry-date { font-size:16px;font-weight:800;color:var(--text-1); }

/* btn submit */
.btn-submit {
  width:100%;background:linear-gradient(135deg,var(--green),var(--green-dark));
  color:#fff;font-size:15px;font-weight:700;padding:14px;border-radius:var(--radius-sm);
  border:none;cursor:pointer;transition:filter .15s,transform .1s;
  box-shadow:0 4px 14px rgba(30,107,69,.3);display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-submit:hover{filter:brightness(1.07);}
.btn-submit:active{transform:translateY(1px);}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;filter:none;transform:none;}

/* notice */
.notice {
  display:flex;align-items:flex-start;gap:8px;
  background:var(--warn-light);border:1px solid var(--warn-border);
  border-radius:var(--radius-sm);padding:11px 13px;font-size:12.5px;color:var(--warn);font-weight:500;
  margin-bottom:14px;line-height:1.5;
}
.notice.error { background:var(--danger-light);border-color:var(--danger-border);color:var(--danger); }

/* section label */
.section-label { font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px; }

/* divider */
.divider { height:1px;background:var(--border);margin:18px 0; }

/* spinner */
.spinner {
  width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);
  border-top-color:#fff;animation:spin .7s linear infinite;
}
.spinner.dark { border-color:var(--border-md);border-top-color:var(--green); }
@keyframes spin{to{transform:rotate(360deg)}}
.center-loading { display:flex;align-items:center;justify-content:center;gap:8px;padding:24px 0;font-size:13px;color:var(--text-3);font-weight:600; }

/* success overlay */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.success-box{background:var(--surface);border-radius:16px;padding:36px 32px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);text-align:center;animation:popIn .2s cubic-bezier(.34,1.56,.64,1);}
@keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.success-icon{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--green-dark));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 4px 14px rgba(30,107,69,.3);}
.success-title{font-size:20px;font-weight:800;color:var(--text-1);letter-spacing:-0.3px;margin-bottom:6px;}
.success-sub{font-size:14px;color:var(--text-2);line-height:1.6;margin-bottom:20px;}
.success-summary{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;text-align:left;margin-bottom:20px;}
.success-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:8px;}
.success-row:last-child{margin-bottom:0;}
.success-row .k{color:var(--text-2)}.success-row .v{font-weight:700;}
.btn-new{width:100%;padding:12px;border-radius:var(--radius-sm);background:var(--green);color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;}

/* field label */
.field-label{font-size:12px;font-weight:700;color:var(--text-1);margin-bottom:7px;display:block;}

@media(max-width:860px){.layout{grid-template-columns:1fr;}.plan-grid{grid-template-columns:1fr 1fr;}.summary-card{position:static;}}
@media(max-width:480px){.plan-grid{grid-template-columns:1fr;}.pay-grid{grid-template-columns:1fr;}}
`;

/* ─────────── STATIC DATA (chưa có API riêng, giữ tạm) ─────────── */
// NOTE: Chưa có endpoint /api/promotions thật. `id` dưới đây là placeholder
// để map sang PromotionId (int?) mà BE yêu cầu trong RenewMembershipRequest.
// Khi có API thật, thay object này bằng dữ liệu fetch được (nhớ giữ field `id` là số).
const PROMO_CODES = {
    "SUMMER25": { id: 1, label: "SUMMER25", discountPct: 25, desc: "Giảm 25%" },
    "TANGGOI": { id: 2, label: "TANGGOI", bonusDays: 15, desc: "Tặng thêm 15 ngày" },
    "NEWMEM": { id: 3, label: "NEWMEM", discountPct: 10, desc: "Hội viên mới giảm 10%" },
};

const BANK_INFO = {
    bankName: "Vietcombank",
    accountNumber: "0123 456 789",
    accountName: "CÔNG TY TNHH PHÒNG GYM ABC",
};

const COLORS = ["#1E6B45", "#2563EB", "#7C3AED", "#DB2777", "#D97706"];
const avatarColor = id => COLORS[Number(id) % COLORS.length] || COLORS[0];
const initials = name => (name || "").split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
const fmtMoney = n => (n || 0).toLocaleString("vi-VN") + "₫";
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const addDays = (dateStr, days) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ─────────── HELPERS: unwrap + normalize dữ liệu từ API ───────────
   Vì chưa biết chính xác shape response của BE, các hàm dưới cố gắng
   đọc nhiều kiểu field phổ biến (camelCase / PascalCase / bọc trong data/items).
   Chỉnh lại theo response thật của BE nếu cần. */
function unwrap(res) {
    return res?.data ?? res ?? null;
}
// BE bọc response dạng { currentPackage: { memberPackageId, planId, planName, startDate, expiryDate, packageStatus } }.
// Hàm này dò qua các key bọc phổ biến (currentPackage/CurrentPackage, data/Data) để tìm đúng object DTO
// (nhận diện bằng field planName/PlanName).
function extractPackageDto(res) {
    const candidates = [
        res?.data?.currentPackage,
        res?.data?.CurrentPackage,
        res?.currentPackage,
        res?.CurrentPackage,
        res?.data?.data,
        res?.data?.Data,
        res?.data,
        res,
    ];
    for (const c of candidates) {
        if (c && typeof c === "object" && (c.planName ?? c.PlanName)) {
            return c;
        }
    }
    // fallback: object không có planName nhưng cũng không phải lớp bọc (không có key lồng bên trong)
    for (const c of candidates) {
        if (c && typeof c === "object" && !("data" in c) && !("Data" in c) && !("currentPackage" in c) && !("CurrentPackage" in c)) {
            return c;
        }
    }
    return null;
}
function unwrapList(res) {
    const d = unwrap(res);
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.members)) return d.members;
    if (Array.isArray(d?.packages)) return d.packages;
    return [];
}
// Khớp CurrentPackageDto (RenewService.GetCurrentPackageAsync):
// { MemberPackageId, PlanId, PlanName, StartDate, ExpiryDate, PackageStatus }
// BE chỉ trả về gói có PackageStatus == "Active", hoặc null nếu không có.
function normalizePackageInfo(pkg) {
    if (!pkg) return null;
    return {
        memberPackageId: pkg.memberPackageId ?? pkg.MemberPackageId,
        planId: pkg.planId ?? pkg.PlanId,
        planName: pkg.planName ?? pkg.PlanName,
        startDate: pkg.startDate ?? pkg.StartDate,
        expiryDate: pkg.expiryDate ?? pkg.ExpiryDate,
        status: pkg.packageStatus ?? pkg.PackageStatus ?? "Active",
    };
}
function normalizeMember(m) {
    if (!m) return null;
    return {
        id: m.id ?? m.Id ?? m.memberId ?? m.MemberId,
        name: m.fullName ?? m.FullName ?? m.name,
        phone: m.phone ?? m.Phone,
        email: m.email ?? m.Email,
        raw: m,
    };
}
function normalizePlan(p) {
    return {
        planId: p.planId ?? p.PlanId ?? p.id ?? p.Id,
        planName: p.planName ?? p.PlanName ?? p.name ?? p.Name,
        price: Number(p.price ?? p.Price ?? 0),
        durationDays: Number(p.durationDays ?? p.DurationDays ?? p.duration ?? 0),
        description: p.description ?? p.Description ?? "",
        status: p.status ?? p.Status ?? (p.isActive === false ? "Discontinued" : "OnSale"),
    };
}

/* ───────────────────────────────────────── */
export default function RenewPage() {
    /* ---- hội viên: tìm kiếm qua API (debounce) ---- */
    const [searchQ, setSearchQ] = useState("");
    const [memberResults, setMemberResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [selectedMember, setMember] = useState(null);
    const [loadingMemberDetail, setLoadingMemberDetail] = useState(false);

    /* ---- gói tập hiện tại: getCurrentMemberPack() ---- */
    const [currentPkg, setCurrentPkg] = useState(null);
    const [loadingPkgInfo, setLoadingPkgInfo] = useState(false);
    const [pkgInfoError, setPkgInfoError] = useState("");

    /* ---- gói tập: load 1 lần từ API ---- */
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [plansError, setPlansError] = useState("");
    const [selectedPlan, setPlan] = useState(null);

    /* ---- khuyến mãi / thanh toán ---- */
    const [promoCode, setPromoCode] = useState("");      // key trong PROMO_CODES, "" = none
    const [paymentMethod, setPaymentMethod] = useState(null); // "cash" | "transfer"
    const [transferRef, setTransferRef] = useState("");
    const [transferConfirmed, setTransferConfirmed] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);

    /* ---- submit ---- */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [success, setSuccess] = useState(null);

    const appliedPromo = promoCode ? PROMO_CODES[promoCode] : null;

    /* step logic */
    const step = !selectedMember ? 1 : !selectedPlan ? 2 : 3;

    /* ---- load danh sách gói tập khi mount ---- */
    useEffect(() => {
        let active = true;
        (async () => {
            setLoadingPlans(true);
            setPlansError("");
            try {
                const res = await cashierApi.getAllPackage();
                if (!active) return;
                setPlans(unwrapList(res).map(normalizePlan));
            } catch (e) {
                if (active) setPlansError("Không tải được danh sách gói tập. Vui lòng thử lại.");
            } finally {
                if (active) setLoadingPlans(false);
            }
        })();
        return () => { active = false; };
    }, []);

    /* ---- tìm hội viên: debounce theo searchQ ---- */
    useEffect(() => {
        const q = searchQ.trim();
        if (!q) { setMemberResults([]); setSearchError(""); return; }
        let active = true;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await cashierApi.getListMembers({ search: q });
                if (!active) return;
                setMemberResults(unwrapList(res).map(normalizeMember).filter(Boolean));
                setSearchError("");
            } catch (e) {
                if (active) { setMemberResults([]); setSearchError("Không tìm được hội viên. Vui lòng thử lại."); }
            } finally {
                if (active) setSearching(false);
            }
        }, 350);
        return () => { active = false; clearTimeout(t); };
    }, [searchQ]);

    /* ---- chọn hội viên: lấy chi tiết hội viên từ API ---- */
    async function handleSelectMember(m) {
        setSearchQ("");
        setMemberResults([]);
        setLoadingMemberDetail(true);
        try {
            const res = await cashierApi.getMemberDetail(m.id);
            const detail = normalizeMember(unwrap(res)) || m;
            setMember(detail);
        } catch (e) {
            // fallback: vẫn cho chọn bằng dữ liệu từ kết quả tìm kiếm
            setMember(m);
        } finally {
            setLoadingMemberDetail(false);
        }
    }

    /* ---- lấy gói tập hiện tại của hội viên: getCurrentMemberPack(id) ----
       GET /api/members/{id}/packages → CurrentPackageDto | null.
       BE chỉ trả về gói có PackageStatus == "Active"; không có gói active → null. */
    useEffect(() => {
        if (!selectedMember?.id) { setCurrentPkg(null); setPkgInfoError(""); return; }
        let active = true;
        (async () => {
            setLoadingPkgInfo(true);
            setPkgInfoError("");
            try {
                const res = await cashierApi.getCurrentMemberPack(selectedMember.id);
                if (!active) return;
                setCurrentPkg(normalizePackageInfo(extractPackageDto(res)));
            } catch (e) {
                if (active) {
                    setCurrentPkg(null);
                    setPkgInfoError("Không tải được thông tin gói tập hiện tại.");
                }
            } finally {
                if (active) setLoadingPkgInfo(false);
            }
        })();
        return () => { active = false; };
    }, [selectedMember?.id]);

    function changeMember() {
        setMember(null); setPlan(null); setPromoCode("");
        setPaymentMethod(null); setTransferConfirmed(false); setTransferRef("");
        setReceiptFile(null); setSubmitError("");
        setCurrentPkg(null); setPkgInfoError("");
    }

    /* pricing (chỉ để hiển thị — BE tự tính GiaGoc/Amount/ngày dựa trên PlanId/PromotionId) */
    const basePrice = selectedPlan?.price ?? 0;
    const discountAmt = appliedPromo?.discountPct ? Math.round(basePrice * appliedPromo.discountPct / 100) : 0;
    const finalPrice = basePrice - discountAmt;
    const bonusDays = appliedPromo?.bonusDays ?? 0;
    const totalDays = (selectedPlan?.durationDays ?? 0) + bonusDays;

    const pkg = currentPkg;
    const isExtending = !!pkg; // BE chỉ trả về gói có PackageStatus === "Active", hoặc null

    /* ngày bắt đầu / hết hạn ước tính của gói mới (chỉ để hiển thị) */
    const newStartDate = useMemo(() => {
        if (!selectedMember) return null;
        return isExtending ? pkg.expiryDate : todayISO();
    }, [selectedMember, isExtending, pkg]);

    const newExpiry = useMemo(() => {
        if (!newStartDate || !selectedPlan) return null;
        return addDays(newStartDate, totalDays);
    }, [newStartDate, selectedPlan, totalDays]);

    /* can the user actually submit? */
    const canSubmit = !!selectedMember && !!selectedPlan && !!paymentMethod && !submitting
        && (paymentMethod === "cash" || (paymentMethod === "transfer" && transferConfirmed));

    function handlePromoChange(e) {
        setPromoCode(e.target.value);
    }

    function selectPaymentMethod(method) {
        setPaymentMethod(method);
        if (method === "cash") { setTransferConfirmed(false); setTransferRef(""); setReceiptFile(null); }
    }

    /* ---- gọi API renew — khớp RenewMembershipRequest (RenewController.Renew) ----
       public int PlanId
       public int? PromotionId        // null = không dùng khuyến mãi
       public string PaymentMethod    // "Cash" | "BankTransfer"
       public string? BankReferenceCode
       + ReceiptImage (file, optional)
       KHÔNG gửi GiaGoc/Amount/SoNgayTangThucTe/StartDate/ExpiryDate — BE tự tính từ PlanId/PromotionId. */
    async function handleSubmit() {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError("");
        try {
            const fd = new FormData();
            fd.append("PlanId", selectedPlan.planId);
            if (appliedPromo?.id != null) {
                fd.append("PromotionId", appliedPromo.id);
            }
            fd.append("PaymentMethod", paymentMethod === "cash" ? "Cash" : "BankTransfer");
            if (transferRef) fd.append("BankReferenceCode", transferRef);
            if (receiptFile) fd.append("ReceiptImage", receiptFile);

            const res = await cashierApi.renewMembership(selectedMember.id, fd);
            const data = unwrap(res);

            setSuccess({
                memberName: selectedMember.name,
                planName: selectedPlan.planName,
                amount: data?.amount ?? data?.Amount ?? finalPrice,
                newExpiry: data?.expiryDate ?? data?.ExpiryDate ?? newExpiry,
                bonusDays,
                paymentMethod,
                transferRef,
            });
        } catch (e) {
            setSubmitError(
                e?.response?.data?.message ?? e?.message ?? "Gia hạn thất bại. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    }

    function reset() {
        setSearchQ(""); setMember(null); setPlan(null);
        setPromoCode(""); setPaymentMethod(null);
        setTransferRef(""); setTransferConfirmed(false);
        setReceiptFile(null); setSubmitError(""); setSuccess(null);
        setCurrentPkg(null); setPkgInfoError("");
    }

    return (
        <>
            <style>{css}</style>
            <div className="main">

                {/* Page header */}
                <div className="page-head">
                    <div className="page-head-left">
                        <div className="page-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                        </div>
                        <div>
                            <div className="page-title">Gia hạn gói tập</div>
                            <div className="page-subtitle">Chọn hội viên và gói tập cần gia hạn</div>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="steps">
                    <div className={`step ${step > 1 ? "done" : step === 1 ? "active" : ""}`}>
                        <div className="step-circle">{step > 1 ? "✓" : "1"}</div>
                        <div className="step-label">Chọn hội viên</div>
                    </div>
                    <div className={`step-line ${step > 1 ? "done" : ""}`} />
                    <div className={`step ${step > 2 ? "done" : step === 2 ? "active" : ""}`}>
                        <div className="step-circle">{step > 2 ? "✓" : "2"}</div>
                        <div className="step-label">Chọn gói tập</div>
                    </div>
                    <div className={`step-line ${step > 2 ? "done" : ""}`} />
                    <div className={`step ${step === 3 ? "active" : ""}`}>
                        <div className="step-circle">3</div>
                        <div className="step-label">Xác nhận thanh toán</div>
                    </div>
                </div>

                <div className="layout">
                    {/* LEFT COL */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                        {/* Step 1: Tìm hội viên */}
                        <div className="card">
                            <div className="card-head">
                                <div className="card-head-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={step >= 1 ? "var(--green)" : "var(--text-3)"} strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </div>
                                <div>
                                    <div className="card-head-title">Bước 1 — Tìm hội viên</div>
                                    <div className="card-head-sub">Tìm theo tên hoặc số điện thoại</div>
                                </div>
                                {selectedMember && (
                                    <button onClick={changeMember} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--border-md)", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-2)" }}>
                                        Đổi hội viên
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                {!selectedMember ? (
                                    <>
                                        <div className="search-wrap">
                                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                            <input className="search-input" placeholder="Nhập tên hoặc SĐT hội viên..." value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
                                        </div>

                                        {searching && (
                                            <div className="center-loading"><span className="spinner dark" /> Đang tìm...</div>
                                        )}

                                        {!searching && searchError && (
                                            <div className="notice error" style={{ marginTop: 10, marginBottom: 0 }}>{searchError}</div>
                                        )}

                                        {!searching && !searchError && searchQ && memberResults.length === 0 && (
                                            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 10, fontWeight: 500 }}>Không tìm thấy hội viên phù hợp</p>
                                        )}

                                        {!searching && memberResults.map(m => (
                                            <div key={m.id} className="member-result" onClick={() => handleSelectMember(m)}>
                                                <div className="avatar" style={{ background: avatarColor(m.id) }}>{initials(m.name)}</div>
                                                <div>
                                                    <div className="member-name">{m.name}</div>
                                                    <div className="member-meta">{m.phone} · {m.email}</div>
                                                </div>
                                                <div className="member-select-hint">Chọn →</div>
                                            </div>
                                        ))}
                                    </>
                                ) : loadingMemberDetail ? (
                                    <div className="center-loading"><span className="spinner dark" /> Đang tải thông tin hội viên...</div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div className="avatar" style={{ background: avatarColor(selectedMember.id), width: 44, height: 44, fontSize: 16 }}>{initials(selectedMember.name)}</div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>{selectedMember.name}</div>
                                            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>{selectedMember.phone} · {selectedMember.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current package info — getCurrentMemberPack() */}
                        {selectedMember && !loadingMemberDetail && (
                            <div className="card">
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-head-title">Gói tập hiện tại</div>
                                        <div className="card-head-sub">Thông tin gói đang sở hữu</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {loadingPkgInfo ? (
                                        <div className="center-loading"><span className="spinner dark" /> Đang kiểm tra gói tập...</div>
                                    ) : pkgInfoError ? (
                                        <div className="notice error" style={{ marginBottom: 0 }}>{pkgInfoError}</div>
                                    ) : pkg ? (
                                        <div className="pkg-banner active">
                                            <div style={{ flex: 1 }}>
                                                <div className="pkg-banner-label">Đang hiệu lực</div>
                                                <div className="pkg-banner-name">{pkg.planName}</div>
                                                <div className="pkg-banner-dates">{fmtDate(pkg.startDate)} → {fmtDate(pkg.expiryDate)}</div>
                                            </div>
                                            <span className="pkg-banner-badge badge-active">Active</span>
                                        </div>
                                    ) : (
                                        <div className="pkg-banner none">
                                            <div>
                                                <div className="pkg-banner-label">Chưa có gói</div>
                                                <div style={{ fontSize: 14, color: "var(--text-2)" }}>Hội viên chưa có gói tập đang hiệu lực</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Chọn gói */}
                        {selectedMember && !loadingMemberDetail && (
                            <div className="card">
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-head-title">Bước 2 — Chọn gói tập</div>
                                        <div className="card-head-sub">Chỉ hiển thị gói đang bán</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {loadingPlans && (
                                        <div className="center-loading"><span className="spinner dark" /> Đang tải danh sách gói tập...</div>
                                    )}
                                    {!loadingPlans && plansError && (
                                        <div className="notice error">{plansError}</div>
                                    )}
                                    {!loadingPlans && !plansError && (
                                        <div className="plan-grid">
                                            {plans.map(p => {
                                                const disc = p.status === "Discontinued";
                                                const sel = selectedPlan?.planId === p.planId;
                                                const perMonth = p.durationDays >= 30 ? Math.round(p.price / (p.durationDays / 30)) : null;
                                                return (
                                                    <div key={p.planId} className={`plan-card${sel ? " selected" : ""}${disc ? " discontinued" : ""}`} onClick={() => !disc && setPlan(p)}>
                                                        {p.durationDays >= 180 && !disc && <div className="plan-badge">Phổ biến</div>}
                                                        <div className="plan-name">{p.planName}</div>
                                                        <div className="plan-duration">{p.durationDays} ngày{perMonth ? ` · ~${fmtMoney(perMonth)}/tháng` : ""}</div>
                                                        <div className="plan-price">{fmtMoney(p.price)}<span className="plan-price-unit">VNĐ</span></div>
                                                        {p.description && <div className="plan-desc">{p.description}</div>}
                                                        {sel && <div className="plan-selected-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mã khuyến mãi — select option */}
                        {selectedPlan && (
                            <div className="card">
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-head-title">Mã khuyến mãi</div>
                                        <div className="card-head-sub">Tuỳ chọn — chọn mã từ danh sách</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <select className="promo-select" value={promoCode} onChange={handlePromoChange}>
                                        <option value="">Không dùng mã khuyến mãi</option>
                                        {Object.entries(PROMO_CODES).map(([code, p]) => (
                                            <option key={code} value={code}>{p.label} — {p.desc}</option>
                                        ))}
                                    </select>
                                    {appliedPromo && (
                                        <div className="promo-tag">🎁 {appliedPromo.label} — {appliedPromo.desc}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Phương thức thanh toán */}
                        {selectedPlan && (
                            <div className="card">
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-head-title">Bước 3 — Phương thức thanh toán</div>
                                        <div className="card-head-sub">Chọn cách hội viên thanh toán</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="pay-grid">
                                        <div className={`pay-card${paymentMethod === "cash" ? " selected" : ""}`} onClick={() => selectPaymentMethod("cash")}>
                                            <div className="pay-card-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 6v12M18 6v12" /></svg>
                                            </div>
                                            <div>
                                                <div className="pay-card-name">Tiền mặt</div>
                                                <div className="pay-card-sub">Thanh toán trực tiếp tại quầy</div>
                                            </div>
                                        </div>
                                        <div className={`pay-card${paymentMethod === "transfer" ? " selected" : ""}`} onClick={() => selectPaymentMethod("transfer")}>
                                            <div className="pay-card-icon">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10h2M7 14h6" /><path d="M16 9l2 2-2 2M16 13l2-2" /></svg>
                                            </div>
                                            <div>
                                                <div className="pay-card-name">Chuyển khoản</div>
                                                <div className="pay-card-sub">CK qua ngân hàng / ví điện tử</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Xác nhận chuyển khoản */}
                                    {paymentMethod === "transfer" && (
                                        <div className="transfer-box">
                                            <div className="transfer-box-title">Thông tin chuyển khoản</div>
                                            <div className="transfer-info-row"><span className="k">Ngân hàng</span><span className="v">{BANK_INFO.bankName}</span></div>
                                            <div className="transfer-info-row"><span className="k">Số tài khoản</span><span className="v">{BANK_INFO.accountNumber}</span></div>
                                            <div className="transfer-info-row"><span className="k">Chủ tài khoản</span><span className="v">{BANK_INFO.accountName}</span></div>
                                            <div className="transfer-info-row"><span className="k">Số tiền</span><span className="v" style={{ color: "var(--green)" }}>{fmtMoney(finalPrice)}</span></div>

                                            <input
                                                className="transfer-ref-input"
                                                placeholder="Mã giao dịch / nội dung chuyển khoản (không bắt buộc)"
                                                value={transferRef}
                                                onChange={e => setTransferRef(e.target.value)}
                                            />

                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="transfer-file-input"
                                                onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
                                            />

                                            {!transferConfirmed ? (
                                                <label className="transfer-confirm">
                                                    <input type="checkbox" checked={transferConfirmed} onChange={e => setTransferConfirmed(e.target.checked)} />
                                                    <span>Tôi xác nhận hội viên đã chuyển khoản đủ số tiền {fmtMoney(finalPrice)} vào tài khoản trên.</span>
                                                </label>
                                            ) : (
                                                <div className="transfer-confirmed-tag">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    Đã xác nhận chuyển khoản
                                                    <button onClick={() => setTransferConfirmed(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#065F46", opacity: .7, fontSize: 11, fontWeight: 700, textDecoration: "underline" }}>Bỏ xác nhận</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COL — Summary */}
                    <div className="summary-card">
                        <div className="card" style={{ overflow: "hidden" }}>
                            <div className="summary-head">
                                <div className="summary-head-title">Tổng thanh toán</div>
                                <div className="summary-total">
                                    {selectedPlan ? fmtMoney(finalPrice) : "—"}
                                </div>
                                <div className="summary-total-sub">
                                    {selectedPlan ? `${totalDays} ngày · ${selectedPlan.planName}` : "Chưa chọn gói"}
                                </div>
                            </div>

                            <div className="summary-body">
                                {!selectedMember && (
                                    <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "16px 0" }}>
                                        Tìm và chọn hội viên để bắt đầu
                                    </p>
                                )}

                                {selectedMember && !selectedPlan && (
                                    <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "16px 0" }}>
                                        Chọn gói tập để xem tổng tiền
                                    </p>
                                )}

                                {selectedMember && selectedPlan && (
                                    <>
                                        {/* Hội viên */}
                                        <div className="section-label">Hội viên</div>
                                        <div className="summary-row" style={{ marginBottom: 16 }}>
                                            <span className="lbl">{selectedMember.name}</span>
                                            <span className="val" style={{ fontSize: 12, color: "var(--text-2)" }}>{selectedMember.phone}</span>
                                        </div>

                                        <div className="summary-divider" />

                                        {/* Giá (ước tính hiển thị — BE tính lại và trả về khi renew) */}
                                        <div className="section-label">Chi tiết giá (ước tính)</div>
                                        <div className="summary-row">
                                            <span className="lbl">Giá gốc</span>
                                            <span className="val">{fmtMoney(basePrice)}</span>
                                        </div>
                                        {discountAmt > 0 && (
                                            <div className="summary-row">
                                                <span className="lbl">Giảm giá ({appliedPromo.discountPct}%)</span>
                                                <span className="val green">−{fmtMoney(discountAmt)}</span>
                                            </div>
                                        )}
                                        {bonusDays > 0 && (
                                            <div className="summary-row">
                                                <span className="lbl">Ngày tặng thêm</span>
                                                <span className="val green">+{bonusDays} ngày</span>
                                            </div>
                                        )}

                                        <div className="summary-divider" />

                                        {/* Thời hạn */}
                                        <div className="section-label">Thời hạn</div>
                                        <div className="summary-row">
                                            <span className="lbl">Thời hạn gói</span>
                                            <span className="val">{selectedPlan.durationDays} ngày</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="lbl">Loại gia hạn</span>
                                            <span className="val" style={{ fontSize: 12 }}>{isExtending ? "Nối tiếp gói hiện tại" : "Bắt đầu từ hôm nay"}</span>
                                        </div>

                                        {/* Thanh toán */}
                                        <div className="summary-divider" />
                                        <div className="section-label">Thanh toán</div>
                                        <div className="summary-row">
                                            <span className="lbl">Phương thức</span>
                                            <span className="val" style={{ fontSize: 12.5 }}>
                                                {paymentMethod === "cash" ? "Tiền mặt" : paymentMethod === "transfer" ? "Chuyển khoản" : "Chưa chọn"}
                                            </span>
                                        </div>
                                        {paymentMethod === "transfer" && (
                                            <div className="summary-row">
                                                <span className="lbl">Xác nhận CK</span>
                                                <span className="val" style={{ fontSize: 12.5, color: transferConfirmed ? "var(--green)" : "var(--danger)" }}>
                                                    {transferConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}
                                                </span>
                                            </div>
                                        )}

                                        {isExtending && (
                                            <div className="notice" style={{ marginTop: 14 }}>
                                                <span>⚡</span>
                                                <span>Gói mới sẽ bắt đầu ngay khi gói hiện tại hết hạn vào <strong>{fmtDate(pkg.expiryDate)}</strong>.</span>
                                            </div>
                                        )}

                                        {submitError && (
                                            <div className="notice error" style={{ marginTop: 14 }}>{submitError}</div>
                                        )}

                                        {/* New expiry (ước tính — BE trả về giá trị chính xác sau khi renew) */}
                                        <div className="summary-new-expiry">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                            <div>
                                                <div className="summary-new-expiry-label">Hạn mới sau gia hạn (ước tính)</div>
                                                <div className="summary-new-expiry-date">{fmtDate(newExpiry)}</div>
                                            </div>
                                        </div>

                                        <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
                                            {submitting
                                                ? <><span className="spinner" /> Đang xử lý...</>
                                                : <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    Xác nhận gia hạn · {fmtMoney(finalPrice)}
                                                </>
                                            }
                                        </button>

                                        {!paymentMethod && (
                                            <p style={{ fontSize: 11.5, color: "var(--danger)", textAlign: "center", marginTop: 10, lineHeight: 1.5, fontWeight: 600 }}>
                                                Vui lòng chọn phương thức thanh toán
                                            </p>
                                        )}
                                        {paymentMethod === "transfer" && !transferConfirmed && (
                                            <p style={{ fontSize: 11.5, color: "var(--danger)", textAlign: "center", marginTop: 10, lineHeight: 1.5, fontWeight: 600 }}>
                                                Vui lòng xác nhận đã nhận chuyển khoản
                                            </p>
                                        )}
                                        {canSubmit && (
                                            <p style={{ fontSize: 11.5, color: "var(--text-3)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                                                Sau khi xác nhận, giao dịch sẽ được ghi nhận và gói tập kích hoạt ngay
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success overlay */}
            {success && (
                <div className="overlay" onClick={reset}>
                    <div className="success-box" onClick={e => e.stopPropagation()}>
                        <div className="success-icon">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div className="success-title">Gia hạn thành công!</div>
                        <div className="success-sub">Gói tập đã được kích hoạt và giao dịch ghi nhận.</div>
                        <div className="success-summary">
                            <div className="success-row"><span className="k">Hội viên</span><span className="v">{success.memberName}</span></div>
                            <div className="success-row"><span className="k">Gói tập</span><span className="v">{success.planName}</span></div>
                            <div className="success-row"><span className="k">Phương thức</span><span className="v">{success.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
                            {success.paymentMethod === "transfer" && success.transferRef && (
                                <div className="success-row"><span className="k">Mã GD</span><span className="v">{success.transferRef}</span></div>
                            )}
                            <div className="success-row"><span className="k">Số tiền</span><span className="v" style={{ color: "var(--green)" }}>{fmtMoney(success.amount)}</span></div>
                            {success.bonusDays > 0 && <div className="success-row"><span className="k">Ngày tặng</span><span className="v" style={{ color: "var(--green)" }}>+{success.bonusDays} ngày</span></div>}
                            <div className="success-row"><span className="k">Hạn đến</span><span className="v">{fmtDate(success.newExpiry)}</span></div>
                        </div>
                        <button className="btn-new" onClick={reset}>Gia hạn cho hội viên khác</button>
                    </div>
                </div>
            )}
        </>
    );
}