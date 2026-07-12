import {
    Banknote,
    CalendarPlus,
    Check,
    CheckCircle2,
    CreditCard,
    Gift,
    RefreshCw,
    Search,
    ShieldCheck,
    Tag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import cashierApi from "../../../api/cashierApi";

/* ─────────────────────────────────────────────
   STYLES — tông màu navy + cyan, đồng bộ với sidebar
   (giống theme trong trang MemberActive)
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --ink:#152238;
  --muted:#66758c;
  --primary:#0891b2;
  --primary-dark:#0e7490;
  --primary-light:#e0f7fa;
  --navy:#0f1b2d;
  --navy-light:#17263f;
  --surface:#ffffff;
  --bg:#eef2f6;
  --border:#dde3ea;
  --border-md:#c7d0da;
  --danger:#d64545;
  --danger-light:#fdecec;
  --danger-border:#f3c6c6;
  --warn:#b8862f;
  --warn-bg:#fbf1e0;
  --warn-border:#f0d9ab;
  --bonus:#f59e0b;
  --bonus-bg:#fef3e2;
  --discount:#10b981;
  --discount-bg:#e3f9f0;
  --radius:14px;--radius-sm:10px;
  --shadow-sm:0 1px 3px rgba(15,27,45,.06);--shadow-md:0 8px 24px rgba(15,27,45,.10);--shadow-lg:0 16px 44px rgba(15,27,45,.16);
}
html,body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;}

.main{max-width:1100px;margin:0 auto;padding:32px 24px 60px;}

/* page head — nền navy giống sidebar */
.page-head{
  display:flex;gap:14px;align-items:flex-start;margin-bottom:24px;
  background:linear-gradient(135deg,var(--navy),var(--navy-light));
  border-radius:16px;padding:20px 24px;
}
.page-head-icon{
  width:42px;height:42px;border-radius:12px;background:rgba(34,211,238,.16);
  color:#22d3ee;display:flex;align-items:center;justify-content:center;flex:none;
}
.page-head h1{font-size:21px;font-weight:700;margin:0 0 4px;letter-spacing:-.01em;color:#fff;}
.page-head p{font-size:13.5px;color:rgba(255,255,255,.62);margin:0;}

/* stepper */
.stepper{display:flex;align-items:center;margin:0 0 24px;}
.step{display:flex;align-items:center;gap:8px;flex:none;}
.step span{font-size:13px;color:var(--muted);font-weight:500;}
.step-circle{
  width:28px;height:28px;border-radius:50%;background:var(--surface);
  border:2px solid var(--border);display:flex;align-items:center;justify-content:center;
  font-size:12.5px;font-weight:700;color:var(--muted);flex:none;
}
.step-active .step-circle{border-color:var(--primary);color:var(--primary);background:var(--primary-light);}
.step-active span{color:var(--ink);font-weight:700;}
.step-done .step-circle{background:var(--primary);border-color:var(--primary);color:#fff;}
.step-done span{color:var(--ink);}
.step-line{flex:1;height:2px;background:var(--border);margin:0 12px;min-width:24px;}

/* layout */
.layout{display:grid;grid-template-columns:1fr 360px;gap:22px;align-items:start;}
@media(max-width:860px){.layout{grid-template-columns:1fr;}}

/* card */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden;}
.card-head{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;}
.card-head-icon{width:32px;height:32px;border-radius:9px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary-dark);}
.card-head-title{font-size:15px;font-weight:700;color:var(--ink);}
.card-head-sub{font-size:12.5px;color:var(--muted);margin-top:1px;}
.card-body{padding:20px 22px;}

/* search */
.search-wrap{position:relative;display:flex;align-items:center;}
.search-icon{position:absolute;left:12px;color:var(--muted);width:16px;height:16px;}
.search-input{
  width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);
  padding:10px 12px 10px 38px;font-size:14px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:500;outline:none;
  transition:border-color .15s,box-shadow .15s;
}
.search-input::placeholder{color:var(--muted);font-weight:400;}
.search-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,145,178,.12);background:#fff;}

.member-result{
  margin-top:10px;border:1.5px solid var(--primary-light);border-radius:var(--radius-sm);
  background:var(--primary-light);padding:14px 16px;display:flex;align-items:center;gap:12px;
  cursor:pointer;transition:border-color .15s;
}
.member-result:hover{border-color:var(--primary);}
.avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;}
.member-name{font-size:14px;font-weight:700;color:var(--ink);}
.member-meta{font-size:12px;color:var(--muted);margin-top:2px;}
.member-select-hint{font-size:12px;color:var(--primary-dark);font-weight:600;margin-left:auto;white-space:nowrap;}

/* pkg switch (giống trang active) */
.pkg-switch{display:flex;align-items:stretch;gap:12px;margin-bottom:20px;}
.pkg-switch-box{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:0;}
.pkg-switch-new.filled{border-color:var(--primary);background:var(--primary-light);}
.pkg-switch-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;}
.pkg-switch-value{font-weight:700;font-size:14.5px;overflow-wrap:anywhere;color:var(--ink);}
.pkg-switch-duration{font-size:12px;color:var(--primary-dark);margin-top:3px;}
.pkg-switch-arrow{display:flex;align-items:center;justify-content:center;color:var(--muted);flex:none;}
.pkg-switch-sub{font-size:12px;color:var(--muted);margin-top:3px;}

/* timeline */
.pkg-timeline{margin-bottom:22px;}
.pkg-timeline-bar{display:flex;height:6px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px;}
.pkg-timeline-bar .bar-base{display:block;height:100%;background:var(--primary);transition:width .2s;}
.pkg-timeline-bar .bar-bonus{display:block;height:100%;background:var(--bonus);transition:width .2s;}
.pkg-timeline-legend{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bonus);font-weight:600;margin-bottom:10px;}
.legend-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--bonus);}
.pkg-timeline-dates{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.pkg-timeline-dates div{display:flex;flex-direction:column;gap:3px;}
.pkg-timeline-dates span{font-size:11.5px;color:var(--muted);}
.pkg-timeline-dates strong{font-size:13px;color:var(--ink);}

/* package list — dạng hàng radio giống trang active */
.pkg-list-title{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.pkg-list-title-icon{display:flex;align-items:center;gap:6px;margin-top:22px;}
.package-list{display:flex;flex-direction:column;gap:8px;}
.package-row{
  display:flex;align-items:center;gap:12px;text-align:left;width:100%;
  background:var(--bg);border:1.5px solid var(--border);border-radius:12px;
  padding:12px 14px;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;
}
.package-row:hover{border-color:var(--primary);}
.package-row.active{border-color:var(--primary);background:var(--primary-light);}
.package-row.discontinued{opacity:.45;cursor:not-allowed;}
.package-row-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--border-md);display:flex;align-items:center;justify-content:center;flex:none;color:#fff;}
.package-row.active .package-row-radio{background:var(--primary);border-color:var(--primary);}
.package-row-info{flex:1;min-width:0;}
.package-row-name{font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--ink);}
.package-row-tag{font-size:10px;font-weight:700;color:var(--danger);background:var(--danger-light);padding:2px 8px;border-radius:999px;}
.package-row-duration{font-size:12px;color:var(--muted);margin-top:2px;}
.package-row-price{font-weight:700;font-size:14px;color:var(--primary-dark);flex:none;}

/* promotion — tự động áp dụng, không cho chọn thủ công */
.voucher-row{
  display:flex;align-items:center;gap:12px;width:100%;
  background:var(--bg);border:1.5px solid var(--border);border-left-width:4px;
  border-radius:12px;padding:12px 14px;
}
.voucher-row-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;}
.voucher-row.voucher-days{border-left-color:var(--bonus);background:var(--bonus-bg);}
.voucher-row.voucher-days .voucher-row-icon{background:#fff;color:var(--bonus);}
.voucher-row.voucher-discount{border-left-color:var(--discount);background:var(--discount-bg);}
.voucher-row.voucher-discount .voucher-row-icon{background:#fff;color:var(--discount);}
.voucher-row-info{flex:1;min-width:0;}
.voucher-row-name{font-weight:700;font-size:13.5px;color:var(--ink);}
.voucher-row-desc{font-size:12px;color:var(--muted);margin-top:2px;}
.voucher-row-check{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;color:#fff;}
.voucher-row.voucher-days .voucher-row-check{background:var(--bonus);}
.voucher-row.voucher-discount .voucher-row-check{background:var(--discount);}

.pkg-total{display:flex;justify-content:space-between;align-items:center;padding-top:16px;margin-top:22px;border-top:1px dashed var(--border);font-size:14px;}
.pkg-total strong{font-size:18px;color:var(--primary-dark);}
.pkg-total-price{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.pkg-total-original{font-size:12.5px;color:var(--muted);text-decoration:line-through;}

/* payment methods */
.payment-methods{display:flex;gap:10px;flex-wrap:wrap;}
.payment-method-btn{
  flex:1;min-width:150px;display:flex;align-items:center;gap:9px;
  background:var(--bg);border:1.5px solid var(--border);border-radius:12px;
  padding:12px 14px;cursor:pointer;font-size:13.5px;font-weight:600;color:var(--ink);
  transition:all .15s;position:relative;font-family:'Inter',sans-serif;
}
.payment-method-btn:hover{border-color:var(--primary);}
.payment-method-btn.active{border-color:var(--primary);background:var(--primary-light);color:var(--primary-dark);}
.payment-method-check{margin-left:auto;color:var(--primary);}

/* transfer box */
.transfer-box{margin-top:14px;border:1.5px solid var(--primary-light);background:var(--primary-light);border-radius:var(--radius-sm);padding:14px 16px;}
.transfer-box-title{font-size:12px;font-weight:700;color:var(--primary-dark);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
.transfer-info-row{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:6px;}
.transfer-info-row:last-of-type{margin-bottom:0;}
.transfer-info-row .k{color:var(--muted);font-weight:500;}
.transfer-info-row .v{font-weight:700;color:var(--ink);}
.transfer-ref-input{
  width:100%;background:#fff;border:1.5px solid var(--border);border-radius:var(--radius-sm);
  padding:9px 12px;margin-top:10px;font-size:13px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:500;outline:none;
}
.transfer-ref-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(8,145,178,.10);}
.transfer-file-input{margin-top:10px;font-size:12.5px;color:var(--muted);font-weight:500;}
.transfer-confirm{display:flex;align-items:flex-start;gap:9px;margin-top:12px;cursor:pointer;user-select:none;}
.transfer-confirm input{margin-top:2px;width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex-shrink:0;}
.transfer-confirm span{font-size:12.5px;color:var(--ink);font-weight:600;line-height:1.5;}
.transfer-confirmed-tag{display:flex;align-items:center;gap:6px;margin-top:12px;background:var(--discount-bg);border:1px solid #6EE7B7;color:#065F46;border-radius:6px;padding:7px 10px;font-size:12px;font-weight:700;}

/* summary card */
.summary-card{position:sticky;top:24px;}
.summary-head{background:linear-gradient(135deg,var(--navy),var(--navy-light));padding:20px 22px;}
.summary-head-title{font-size:12.5px;font-weight:700;color:rgba(255,255,255,.65);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;}
.summary-total{font-size:30px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1;}
.summary-total-sub{font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;}
.summary-body{padding:18px 22px;}
.summary-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;font-size:13.5px;margin-bottom:12px;}
.summary-row:last-child{margin-bottom:0;}
.summary-row .lbl{color:var(--muted);font-weight:500;}
.summary-row .val{font-weight:700;color:var(--ink);text-align:right;}
.summary-row .val.green{color:var(--discount);}
.summary-row .val.red{color:var(--danger);}
.summary-divider{height:1px;background:var(--border);margin:14px 0;}
.summary-new-expiry{background:var(--primary-light);border:1px solid rgba(8,145,178,.18);border-radius:var(--radius-sm);padding:12px 14px;margin:14px 0;display:flex;align-items:center;gap:10px;}
.summary-new-expiry-label{font-size:11px;font-weight:700;color:var(--primary-dark);text-transform:uppercase;letter-spacing:.5px;}
.summary-new-expiry-date{font-size:16px;font-weight:800;color:var(--ink);}

.btn-submit{
  width:100%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;font-size:15px;font-weight:700;
  padding:14px;border-radius:var(--radius-sm);border:none;cursor:pointer;transition:filter .15s,transform .1s;
  box-shadow:0 4px 14px rgba(8,145,178,.28);display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-submit:hover{filter:brightness(1.06);}
.btn-submit:active{transform:translateY(1px);}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;filter:none;transform:none;}

.notice{display:flex;align-items:flex-start;gap:8px;background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:var(--radius-sm);padding:11px 13px;font-size:12.5px;color:var(--warn);font-weight:500;margin-bottom:14px;line-height:1.5;}
.notice.error{background:var(--danger-light);border-color:var(--danger-border);color:var(--danger);}

.section-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px;}
.divider{height:1px;background:var(--border);margin:18px 0;}

.spinner{width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;animation:spin .7s linear infinite;}
.spinner.dark{border-color:var(--border-md);border-top-color:var(--primary);}
@keyframes spin{to{transform:rotate(360deg)}}
.center-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:24px 0;font-size:13px;color:var(--muted);font-weight:600;}

.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.success-box{background:var(--surface);border-radius:16px;padding:36px 32px;max-width:400px;width:100%;box-shadow:var(--shadow-lg);text-align:center;animation:popIn .2s cubic-bezier(.34,1.56,.64,1);}
@keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.success-icon{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 4px 14px rgba(8,145,178,.28);}
.success-title{font-size:20px;font-weight:800;color:var(--ink);letter-spacing:-.3px;margin-bottom:6px;}
.success-sub{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:20px;}
.success-summary{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;text-align:left;margin-bottom:20px;}
.success-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:8px;}
.success-row:last-child{margin-bottom:0;}
.success-row .k{color:var(--muted)}.success-row .v{font-weight:700;}
.btn-new{width:100%;padding:12px;border-radius:var(--radius-sm);background:var(--primary);color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;}

.field-label{font-size:12px;font-weight:700;color:var(--ink);margin-bottom:7px;display:block;}
.btn-outline{background:none;border:1px solid var(--border-md);border-radius:var(--radius-sm);padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;color:var(--muted);}

@media(max-width:480px){.payment-methods{flex-direction:column;}}
`;

/* ─────────── Static (chưa có API riêng) ─────────── */
const BANK_INFO = {
    bankName: "Vietcombank",
    accountNumber: "0123 456 789",
    accountName: "CÔNG TY TNHH PHÒNG GYM ABC",
};

const COLORS = ["#0891b2", "#2563EB", "#7C3AED", "#DB2777", "#D97706"];
const avatarColor = id => COLORS[Number(id) % COLORS.length] || COLORS[0];
const initials = name => (name || "").split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
const fmtMoney = n => {
    const num = Number(n);
    return (Number.isFinite(num) ? num : 0).toLocaleString("vi-VN") + "₫";
};
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const addDays = (dateStr, days) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + (Number(days) || 0));
    return d.toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ─────────── HELPERS: unwrap + normalize dữ liệu từ API ─────────── */
function unwrap(res) { return res?.data ?? res ?? null; }
function extractPackageDto(res) {
    const candidates = [
        res?.data?.currentPackage, res?.data?.CurrentPackage,
        res?.currentPackage, res?.CurrentPackage,
        res?.data?.data, res?.data?.Data, res?.data, res,
    ];
    for (const c of candidates) {
        if (c && typeof c === "object" && (c.planName ?? c.PlanName)) return c;
    }
    for (const c of candidates) {
        if (c && typeof c === "object" && !("data" in c) && !("Data" in c) && !("currentPackage" in c) && !("CurrentPackage" in c)) return c;
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
    const planId = p.planId ?? p.PlanId ?? p.id ?? p.Id;
    const planName = p.planName ?? p.PlanName ?? p.name ?? p.Name;
    const price = Number(p.price ?? p.Price ?? 0);
    const durationDays = Number(p.durationDays ?? p.DurationDays ?? p.duration ?? 0);
    const description = p.description ?? p.Description ?? "";
    const status = p.status ?? p.Status ?? (p.isActive === false ? "Discontinued" : "OnSale");
    const duration = durationDays > 0 && durationDays % 30 === 0 ? `${durationDays / 30} tháng` : `${durationDays} ngày`;
    return { planId, planName, price, durationDays, description, status, duration };
}

// Khuyến mãi cho 1 gói — GET /api/plans/{planId}/applicable-promotions (cashierApi.getApplicablePromotions).
// Mỗi gói chỉ có tối đa 1 khuyến mãi hiệu lực -> FE lấy phần tử đầu tiên và áp dụng tự động,
// không cho nhân viên chọn thủ công (đồng bộ với khâu chọn gói tập của trang kích hoạt hội viên).
// promoType: "GiamPhanTram" | "GiamTienMat" | "TangNgay" | "TangChuKy"
function normalizePromotion(p) {
    const { promotionId, tenKhuyenMai, promoType, phanTramGiam, soTienGiam, mucGiamToiDa, soNgayTang, soChuKyTang, moTa } = p;
    let value = 0;
    switch (promoType) {
        case "GiamPhanTram": value = Number(phanTramGiam) || 0; break;
        case "GiamTienMat": value = Number(soTienGiam) || 0; break;
        case "TangNgay": value = Number(soNgayTang) || 0; break;
        case "TangChuKy": value = Number(soChuKyTang) || 0; break;
        default: break;
    }
    return {
        promotionId,
        name: tenKhuyenMai,
        type: promoType,
        value,
        maxDiscount: Number(mucGiamToiDa) || 0,
        description: moTa || "",
    };
}
function isBonusDaysPromotion(type) { return type === "TangNgay" || type === "TangChuKy"; }
function promotionDescription(promotion) {
    if (!promotion) return "";
    if (promotion.description) return promotion.description;
    switch (promotion.type) {
        case "TangNgay": return `Tặng ${promotion.value} ngày sử dụng`;
        case "TangChuKy": return `Tặng ${promotion.value} chu kỳ sử dụng`;
        case "GiamTienMat": return `Giảm ${fmtMoney(promotion.value)}`;
        case "GiamPhanTram": return `Giảm ${promotion.value}%`;
        default: return "";
    }
}
function promotionShortLabel(promotion) {
    if (!promotion) return "";
    switch (promotion.type) {
        case "TangNgay": return `+${promotion.value} ngày`;
        case "TangChuKy": return `+${promotion.value} chu kỳ`;
        case "GiamTienMat": return `−${fmtMoney(promotion.value)}`;
        case "GiamPhanTram": return `−${promotion.value}%`;
        default: return "";
    }
}

// Tính lại thời hạn + số tiền của gói mới dựa trên plan + khuyến mãi (nếu có) + ngày bắt đầu.
// startDateISO: hôm nay nếu hội viên chưa có gói active, hoặc ngày hết hạn gói hiện tại nếu đang gia hạn nối tiếp.
function computePricing(plan, promotion, startDateISO) {
    if (!plan) return null;
    const price = Number(plan.price) || 0;
    const durationDays = Number(plan.durationDays) || 0;
    const promoValue = Number(promotion?.value) || 0;

    let bonusDays = 0;
    let discount = 0;
    switch (promotion?.type) {
        case "TangNgay": bonusDays = promoValue; break;
        case "TangChuKy": bonusDays = promoValue * durationDays; break;
        case "GiamTienMat": discount = Math.min(promoValue, price); break;
        case "GiamPhanTram": {
            const raw = (price * promoValue) / 100;
            const maxDiscount = Number(promotion?.maxDiscount) || 0;
            discount = maxDiscount > 0 ? Math.min(raw, maxDiscount, price) : Math.min(raw, price);
            break;
        }
        default: break;
    }
    const totalDays = durationDays + bonusDays;
    const finalAmount = price - discount;
    return {
        bonusDays, discount, totalDays, finalAmount,
        expiry: startDateISO ? addDays(startDateISO, totalDays) : null,
    };
}

/* ─────────────────────────────────────────────────────────────── */
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

    /* ---- danh sách gói tập: getAllPackage() ---- */
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [plansError, setPlansError] = useState("");
    const [selectedPlan, setPlan] = useState(null);

    /* ---- khuyến mãi áp dụng cho gói đã chọn: getApplicablePromotions(planId) ---- */
    const [promotion, setPromotion] = useState(null);
    const [loadingPromotion, setLoadingPromotion] = useState(false);
    const [promotionError, setPromotionError] = useState("");

    /* ---- thanh toán ---- */
    const [paymentMethod, setPaymentMethod] = useState(null); // "cash" | "transfer"
    const [transferRef, setTransferRef] = useState("");
    const [transferConfirmed, setTransferConfirmed] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);

    /* ---- submit ---- */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [success, setSuccess] = useState(null);

    /* step logic */
    const step = !selectedMember ? 1 : !selectedPlan ? 2 : 3;

    /* ---- load danh sách gói tập khi mount ---- */
    const fetchPlans = useCallback(() => {
        setLoadingPlans(true);
        setPlansError("");
        return cashierApi.getAllPackage()
            .then(res => setPlans(unwrapList(res).map(normalizePlan)))
            .catch(() => setPlansError("Không tải được danh sách gói tập. Vui lòng thử lại."))
            .finally(() => setLoadingPlans(false));
    }, []);
    useEffect(() => { fetchPlans(); }, [fetchPlans]);

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
            setMember(m);
        } finally {
            setLoadingMemberDetail(false);
        }
    }

    /* ---- lấy gói tập hiện tại của hội viên ---- */
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
                if (active) { setCurrentPkg(null); setPkgInfoError("Không tải được thông tin gói tập hiện tại."); }
            } finally {
                if (active) setLoadingPkgInfo(false);
            }
        })();
        return () => { active = false; };
    }, [selectedMember?.id]);

    /* ---- tra khuyến mãi áp dụng mỗi khi đổi gói tập ---- */
    useEffect(() => {
        if (!selectedPlan?.planId) { setPromotion(null); setPromotionError(""); return; }
        let active = true;
        setLoadingPromotion(true);
        setPromotionError("");
        cashierApi.getApplicablePromotions(selectedPlan.planId)
            .then(res => {
                if (!active) return;
                const list = unwrapList(res).length ? unwrapList(res) : (Array.isArray(unwrap(res)) ? unwrap(res) : (unwrap(res) ? [unwrap(res)] : []));
                setPromotion(list.length > 0 ? normalizePromotion(list[0]) : null);
            })
            .catch(() => { if (active) { setPromotion(null); setPromotionError("Không kiểm tra được khuyến mãi cho gói này."); } })
            .finally(() => { if (active) setLoadingPromotion(false); });
        return () => { active = false; };
    }, [selectedPlan?.planId]);

    function changeMember() {
        setMember(null); setPlan(null); setPromotion(null); setPromotionError("");
        setPaymentMethod(null); setTransferConfirmed(false); setTransferRef("");
        setReceiptFile(null); setSubmitError("");
        setCurrentPkg(null); setPkgInfoError("");
    }

    const pkg = currentPkg;
    const isExtending = !!pkg; // BE chỉ trả về gói có PackageStatus === "Active", hoặc null

    /* ngày bắt đầu gói mới: nối tiếp gói hiện tại nếu đang gia hạn, ngược lại bắt đầu từ hôm nay */
    const newStartDate = useMemo(() => {
        if (!selectedMember) return null;
        return isExtending ? pkg.expiryDate : todayISO();
    }, [selectedMember, isExtending, pkg]);

    /* pricing (hiển thị — BE tự tính lại chính xác khi renew) */
    const pricing = useMemo(
        () => (selectedPlan ? computePricing(selectedPlan, promotion, newStartDate) : null),
        [selectedPlan, promotion, newStartDate]
    );
    const totalDays = pricing ? pricing.totalDays : 0;
    const basePct = pricing && totalDays > 0 ? ((selectedPlan.durationDays / totalDays) * 100) : (selectedPlan ? 100 : 6);
    const bonusPct = pricing && totalDays > 0 ? ((pricing.bonusDays / totalDays) * 100) : 0;

    /* can the user actually submit? */
    const canSubmit = !!selectedMember && !!selectedPlan && !!paymentMethod && !submitting
        && (paymentMethod === "cash" || (paymentMethod === "transfer" && transferConfirmed));

    function selectPaymentMethod(method) {
        setPaymentMethod(method);
        if (method === "cash") { setTransferConfirmed(false); setTransferRef(""); setReceiptFile(null); }
    }

    /* ---- gọi API renew — khớp RenewMembershipRequest (RenewController.Renew) ----
       PlanId, PromotionId (null nếu không có KM), PaymentMethod ("Cash"|"BankTransfer"),
       BankReferenceCode, ReceiptImage. BE tự tính GiaGoc/Amount/ngày/StartDate/ExpiryDate. */
    async function handleSubmit() {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError("");
        try {
            const fd = new FormData();
            fd.append("PlanId", selectedPlan.planId);
            if (promotion?.promotionId != null) fd.append("PromotionId", promotion.promotionId);
            fd.append("PaymentMethod", paymentMethod === "cash" ? "Cash" : "BankTransfer");
            if (transferRef) fd.append("BankReferenceCode", transferRef);
            if (receiptFile) fd.append("ReceiptImage", receiptFile);

            const res = await cashierApi.renewMembership(selectedMember.id, fd);
            const data = unwrap(res);

            setSuccess({
                memberName: selectedMember.name,
                planName: selectedPlan.planName,
                amount: data?.amount ?? data?.Amount ?? pricing?.finalAmount,
                newExpiry: data?.expiryDate ?? data?.ExpiryDate ?? pricing?.expiry,
                bonusDays: pricing?.bonusDays ?? 0,
                paymentMethod,
                transferRef,
            });
        } catch (e) {
            setSubmitError(e?.response?.data?.message ?? e?.message ?? "Gia hạn thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    function reset() {
        setSearchQ(""); setMember(null); setPlan(null);
        setPromotion(null); setPromotionError(""); setPaymentMethod(null);
        setTransferRef(""); setTransferConfirmed(false);
        setReceiptFile(null); setSubmitError(""); setSuccess(null);
        setCurrentPkg(null); setPkgInfoError("");
    }

    return (
        <>
            <style>{css}</style>
            <div className="main">

                {/* Page header — nền navy giống sidebar */}
                <div className="page-head">
                    <div className="page-head-icon">
                        <RefreshCw size={20} />
                    </div>
                    <div>
                        <h1>Gia hạn gói tập</h1>
                        <p>Chọn hội viên và gói tập cần gia hạn</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="stepper">
                    <div className={`step ${step > 1 ? "step-done" : step === 1 ? "step-active" : ""}`}>
                        <div className="step-circle">{step > 1 ? <Check size={13} /> : "1"}</div>
                        <span>Chọn hội viên</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step > 2 ? "step-done" : step === 2 ? "step-active" : ""}`}>
                        <div className="step-circle">{step > 2 ? <Check size={13} /> : "2"}</div>
                        <span>Chọn gói tập</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step === 3 ? "step-active" : ""}`}>
                        <div className="step-circle">3</div>
                        <span>Xác nhận thanh toán</span>
                    </div>
                </div>

                <div className="layout">
                    {/* LEFT COL */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                        {/* Bước 1 — Tìm hội viên */}
                        <div className="card">
                            <div className="card-head">
                                <div className="card-head-icon"><Search size={16} /></div>
                                <div>
                                    <div className="card-head-title">Bước 1 — Tìm hội viên</div>
                                    <div className="card-head-sub">Tìm theo tên hoặc số điện thoại</div>
                                </div>
                                {selectedMember && (
                                    <button onClick={changeMember} className="btn-outline" style={{ marginLeft: "auto" }}>
                                        Đổi hội viên
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                {!selectedMember ? (
                                    <>
                                        <div className="search-wrap">
                                            <Search className="search-icon" size={16} />
                                            <input className="search-input" placeholder="Nhập tên hoặc SĐT hội viên..." value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
                                        </div>

                                        {searching && <div className="center-loading"><span className="spinner dark" /> Đang tìm...</div>}
                                        {!searching && searchError && <div className="notice error" style={{ marginTop: 10, marginBottom: 0 }}>{searchError}</div>}
                                        {!searching && !searchError && searchQ && memberResults.length === 0 && (
                                            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10, fontWeight: 500 }}>Không tìm thấy hội viên phù hợp</p>
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
                                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{selectedMember.name}</div>
                                            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{selectedMember.phone} · {selectedMember.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bước 2 — Chọn gói tập (đồng bộ layout với khâu chọn gói ở trang kích hoạt hội viên) */}
                        {selectedMember && !loadingMemberDetail && (
                            <div className="card">
                                <div className="card-head">
                                    <div className="card-head-icon"><ShieldCheck size={16} /></div>
                                    <div>
                                        <div className="card-head-title">Bước 2 — Chọn gói tập</div>
                                        <div className="card-head-sub">Chỉ hiển thị gói đang bán · khuyến mãi được áp dụng tự động</div>
                                    </div>
                                </div>
                                <div className="card-body">

                                    {/* Chuyển đổi gói: gói hiện tại -> gói muốn gia hạn */}
                                    <div className="pkg-switch">
                                        <div className="pkg-switch-box">
                                            <div className="pkg-switch-label">Gói hiện tại</div>
                                            {loadingPkgInfo ? (
                                                <div className="pkg-switch-value" style={{ color: "var(--muted)", fontWeight: 500 }}>Đang kiểm tra...</div>
                                            ) : pkgInfoError ? (
                                                <div className="pkg-switch-value" style={{ color: "var(--danger)", fontSize: 12.5, fontWeight: 600 }}>{pkgInfoError}</div>
                                            ) : pkg ? (
                                                <>
                                                    <div className="pkg-switch-value">{pkg.planName}</div>
                                                    <div className="pkg-switch-sub">Hết hạn {fmtDate(pkg.expiryDate)}</div>
                                                </>
                                            ) : (
                                                <div className="pkg-switch-value" style={{ color: "var(--muted)" }}>Chưa có gói</div>
                                            )}
                                        </div>
                                        <div className="pkg-switch-arrow"><ChevronRightIcon /></div>
                                        <div className={"pkg-switch-box pkg-switch-new" + (selectedPlan ? " filled" : "")}>
                                            <div className="pkg-switch-label">Gói muốn gia hạn</div>
                                            <div className="pkg-switch-value">{selectedPlan ? selectedPlan.planName : "Chưa chọn gói"}</div>
                                            {selectedPlan && <div className="pkg-switch-duration">Thời hạn {selectedPlan.duration}</div>}
                                        </div>
                                    </div>

                                    {/* Mốc thời gian */}
                                    <div className="pkg-timeline">
                                        <div className="pkg-timeline-bar">
                                            <span className="bar-base" style={{ width: selectedPlan ? `${basePct}%` : "6%" }} />
                                            {pricing && pricing.bonusDays > 0 && <span className="bar-bonus" style={{ width: `${bonusPct}%` }} />}
                                        </div>
                                        {pricing && pricing.bonusDays > 0 && (
                                            <div className="pkg-timeline-legend">
                                                <span className="legend-dot" />
                                                {pricing.bonusDays} ngày được tặng thêm từ khuyến mãi
                                            </div>
                                        )}
                                        <div className="pkg-timeline-dates">
                                            <div><span>Hôm nay</span><strong>{fmtDate(todayISO())}</strong></div>
                                            <div><span>Bắt đầu gói mới</span><strong>{selectedPlan ? fmtDate(newStartDate) : "—"}</strong></div>
                                            <div><span>Kết thúc gói mới</span><strong>{pricing ? fmtDate(pricing.expiry) : "—"}</strong></div>
                                        </div>
                                    </div>

                                    <div className="pkg-list-title">Chọn gói</div>

                                    {loadingPlans && <div className="center-loading" style={{ padding: "20px 0" }}><span className="spinner dark" /> Đang tải danh sách gói tập...</div>}
                                    {!loadingPlans && plansError && (
                                        <div className="notice error" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {plansError}
                                            <button className="btn-outline" style={{ alignSelf: "flex-start" }} onClick={fetchPlans}><RefreshCw size={13} /> Thử lại</button>
                                        </div>
                                    )}
                                    {!loadingPlans && !plansError && (
                                        <div className="package-list">
                                            {plans.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>Chưa có gói tập nào.</p>}
                                            {plans.map(p => {
                                                const disc = p.status === "Discontinued";
                                                const active = selectedPlan?.planId === p.planId;
                                                return (
                                                    <button
                                                        key={p.planId}
                                                        className={"package-row" + (active ? " active" : "") + (disc ? " discontinued" : "")}
                                                        onClick={() => !disc && setPlan(p)}
                                                        disabled={disc}
                                                    >
                                                        <div className="package-row-radio">{active && <Check size={12} />}</div>
                                                        <div className="package-row-info">
                                                            <div className="package-row-name">
                                                                {p.planName}
                                                                {disc && <span className="package-row-tag">Ngừng bán</span>}
                                                            </div>
                                                            <div className="package-row-duration">Thời hạn {p.duration}</div>
                                                        </div>
                                                        <div className="package-row-price">{fmtMoney(p.price)}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Khuyến mãi — tra tự động theo gói đã chọn, KHÔNG cho chọn thủ công */}
                                    {selectedPlan && (
                                        <>
                                            <div className="pkg-list-title pkg-list-title-icon">
                                                <Gift size={13} /> Khuyến mãi áp dụng
                                            </div>
                                            {loadingPromotion && <div className="center-loading" style={{ padding: "16px 0" }}><span className="spinner dark" /> Đang kiểm tra khuyến mãi...</div>}
                                            {!loadingPromotion && promotionError && <div className="notice error">{promotionError}</div>}
                                            {!loadingPromotion && !promotionError && (
                                                promotion ? (
                                                    <div className={"voucher-row" + (isBonusDaysPromotion(promotion.type) ? " voucher-days" : " voucher-discount")}>
                                                        <div className="voucher-row-icon">
                                                            {isBonusDaysPromotion(promotion.type) ? <CalendarPlus size={16} /> : <Tag size={16} />}
                                                        </div>
                                                        <div className="voucher-row-info">
                                                            <div className="voucher-row-name">{promotion.name}</div>
                                                            <div className="voucher-row-desc">{promotionDescription(promotion)}</div>
                                                        </div>
                                                        <div className="voucher-row-check"><Check size={12} /></div>
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: 13, color: "var(--muted)" }}>Gói này hiện không có khuyến mãi.</p>
                                                )
                                            )}
                                        </>
                                    )}

                                    {selectedPlan && pricing && (
                                        <div className="pkg-total">
                                            <span>Thành tiền</span>
                                            {pricing.discount > 0 ? (
                                                <div className="pkg-total-price">
                                                    <span className="pkg-total-original">{fmtMoney(selectedPlan.price)}</span>
                                                    <strong>{fmtMoney(pricing.finalAmount)}</strong>
                                                </div>
                                            ) : (
                                                <strong>{fmtMoney(selectedPlan.price)}</strong>
                                            )}
                                        </div>
                                    )}

                                    {/* Phương thức thanh toán */}
                                    {selectedPlan && (
                                        <>
                                            <div className="pkg-list-title" style={{ marginTop: 22 }}>Bước 3 — Phương thức thanh toán</div>
                                            <div className="payment-methods">
                                                <button className={"payment-method-btn" + (paymentMethod === "cash" ? " active" : "")} onClick={() => selectPaymentMethod("cash")}>
                                                    <Banknote size={17} /><span>Tiền mặt</span>
                                                    {paymentMethod === "cash" && <Check size={13} className="payment-method-check" />}
                                                </button>
                                                <button className={"payment-method-btn" + (paymentMethod === "transfer" ? " active" : "")} onClick={() => selectPaymentMethod("transfer")}>
                                                    <CreditCard size={17} /><span>Chuyển khoản</span>
                                                    {paymentMethod === "transfer" && <Check size={13} className="payment-method-check" />}
                                                </button>
                                            </div>

                                            {paymentMethod === "transfer" && (
                                                <div className="transfer-box">
                                                    <div className="transfer-box-title">Thông tin chuyển khoản</div>
                                                    <div className="transfer-info-row"><span className="k">Ngân hàng</span><span className="v">{BANK_INFO.bankName}</span></div>
                                                    <div className="transfer-info-row"><span className="k">Số tài khoản</span><span className="v">{BANK_INFO.accountNumber}</span></div>
                                                    <div className="transfer-info-row"><span className="k">Chủ tài khoản</span><span className="v">{BANK_INFO.accountName}</span></div>
                                                    <div className="transfer-info-row"><span className="k">Số tiền</span><span className="v" style={{ color: "var(--primary-dark)" }}>{fmtMoney(pricing?.finalAmount)}</span></div>

                                                    <input
                                                        className="transfer-ref-input"
                                                        placeholder="Mã giao dịch / nội dung chuyển khoản (không bắt buộc)"
                                                        value={transferRef}
                                                        onChange={e => setTransferRef(e.target.value)}
                                                    />
                                                    <input type="file" accept="image/*" className="transfer-file-input" onChange={e => setReceiptFile(e.target.files?.[0] ?? null)} />

                                                    {!transferConfirmed ? (
                                                        <label className="transfer-confirm">
                                                            <input type="checkbox" checked={transferConfirmed} onChange={e => setTransferConfirmed(e.target.checked)} />
                                                            <span>Tôi xác nhận hội viên đã chuyển khoản đủ số tiền {fmtMoney(pricing?.finalAmount)} vào tài khoản trên.</span>
                                                        </label>
                                                    ) : (
                                                        <div className="transfer-confirmed-tag">
                                                            <CheckCircle2 size={14} /> Đã xác nhận chuyển khoản
                                                            <button onClick={() => setTransferConfirmed(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#065F46", opacity: .7, fontSize: 11, fontWeight: 700, textDecoration: "underline" }}>Bỏ xác nhận</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
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
                                <div className="summary-total">{selectedPlan ? fmtMoney(pricing?.finalAmount) : "—"}</div>
                                <div className="summary-total-sub">{selectedPlan ? `${totalDays} ngày · ${selectedPlan.planName}` : "Chưa chọn gói"}</div>
                            </div>

                            <div className="summary-body">
                                {!selectedMember && (
                                    <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Tìm và chọn hội viên để bắt đầu</p>
                                )}
                                {selectedMember && !selectedPlan && (
                                    <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Chọn gói tập để xem tổng tiền</p>
                                )}

                                {selectedMember && selectedPlan && (
                                    <>
                                        <div className="section-label">Hội viên</div>
                                        <div className="summary-row" style={{ marginBottom: 16 }}>
                                            <span className="lbl">{selectedMember.name}</span>
                                            <span className="val" style={{ fontSize: 12, color: "var(--muted)" }}>{selectedMember.phone}</span>
                                        </div>

                                        <div className="summary-divider" />

                                        <div className="section-label">Chi tiết giá (ước tính)</div>
                                        <div className="summary-row">
                                            <span className="lbl">Giá gốc</span>
                                            <span className="val">{fmtMoney(selectedPlan.price)}</span>
                                        </div>
                                        {pricing?.discount > 0 && (
                                            <div className="summary-row">
                                                <span className="lbl">Giảm giá ({promotion?.type === "GiamPhanTram" ? `${promotion.value}%` : "khuyến mãi"})</span>
                                                <span className="val green">−{fmtMoney(pricing.discount)}</span>
                                            </div>
                                        )}
                                        {pricing?.bonusDays > 0 && (
                                            <div className="summary-row">
                                                <span className="lbl">Ngày tặng thêm</span>
                                                <span className="val green">+{pricing.bonusDays} ngày</span>
                                            </div>
                                        )}

                                        <div className="summary-divider" />

                                        <div className="section-label">Thời hạn</div>
                                        <div className="summary-row">
                                            <span className="lbl">Thời hạn gói</span>
                                            <span className="val">{selectedPlan.durationDays} ngày</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="lbl">Loại gia hạn</span>
                                            <span className="val" style={{ fontSize: 12 }}>{isExtending ? "Nối tiếp gói hiện tại" : "Bắt đầu từ hôm nay"}</span>
                                        </div>

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
                                                <span className="val" style={{ fontSize: 12.5, color: transferConfirmed ? "var(--discount)" : "var(--danger)" }}>
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

                                        {submitError && <div className="notice error" style={{ marginTop: 14 }}>{submitError}</div>}

                                        <div className="summary-new-expiry">
                                            <CalendarPlus size={18} color="var(--primary-dark)" />
                                            <div>
                                                <div className="summary-new-expiry-label">Hạn mới sau gia hạn (ước tính)</div>
                                                <div className="summary-new-expiry-date">{fmtDate(pricing?.expiry)}</div>
                                            </div>
                                        </div>

                                        <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
                                            {submitting
                                                ? <><span className="spinner" /> Đang xử lý...</>
                                                : <><Check size={16} /> Xác nhận gia hạn · {fmtMoney(pricing?.finalAmount)}</>
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
                                            <p style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
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
                        <div className="success-icon"><Check size={26} color="#fff" strokeWidth={2.5} /></div>
                        <div className="success-title">Gia hạn thành công!</div>
                        <div className="success-sub">Gói tập đã được kích hoạt và giao dịch ghi nhận.</div>
                        <div className="success-summary">
                            <div className="success-row"><span className="k">Hội viên</span><span className="v">{success.memberName}</span></div>
                            <div className="success-row"><span className="k">Gói tập</span><span className="v">{success.planName}</span></div>
                            <div className="success-row"><span className="k">Phương thức</span><span className="v">{success.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
                            {success.paymentMethod === "transfer" && success.transferRef && (
                                <div className="success-row"><span className="k">Mã GD</span><span className="v">{success.transferRef}</span></div>
                            )}
                            <div className="success-row"><span className="k">Số tiền</span><span className="v" style={{ color: "var(--primary-dark)" }}>{fmtMoney(success.amount)}</span></div>
                            {success.bonusDays > 0 && <div className="success-row"><span className="k">Ngày tặng</span><span className="v" style={{ color: "var(--discount)" }}>+{success.bonusDays} ngày</span></div>}
                            <div className="success-row"><span className="k">Hạn đến</span><span className="v">{fmtDate(success.newExpiry)}</span></div>
                        </div>
                        <button className="btn-new" onClick={reset}>Gia hạn cho hội viên khác</button>
                    </div>
                </div>
            )}
        </>
    );
}

/* small inline chevron to avoid an extra lucide import collision with card icons above */
function ChevronRightIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}