import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    CreditCard,
    Download,
    FileText,
    Gift,
    Globe,
    Hash,
    History,
    Hourglass,
    Loader2,
    MapPin,
    Package,
    PencilLine,
    Phone,
    Printer,
    Receipt,
    RefreshCw,
    Search,
    Sparkles,
    Store,
    User,
    Wallet,
    X,
    XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import authApi from "../../../api/authApi";
import managerApi from "../../../api/managerApi";

const STATUS_CONFIG = {
    Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "rgba(217,119,6,0.12)", color: "#b45309" },
    Paid: { label: "Đã thanh toán", icon: CheckCircle2, bg: "rgba(5,150,105,0.12)", color: "#047857" },
    Cancelled: { label: "Đã hủy", icon: XCircle, bg: "rgba(225,29,72,0.10)", color: "#be123c" },
};

const CHANNEL_CONFIG = {
    "Online": { label: "Online", icon: Globe, bg: "rgba(2,132,199,0.12)", color: "#0369a1" },
    "Tại quầy": { label: "Tại quầy", icon: Store, bg: "rgba(5,150,105,0.12)", color: "#047857" },
};

// Màu dùng riêng cho các giao dịch ĐÃ ĐIỀU CHỈNH — tô cả dòng bằng tông hổ phách nhạt
// để nhân viên nhận ra ngay trong danh sách, không cần mở từng dòng ra xem.
const ADJUSTED_ROW_BG = "rgba(180,83,9,0.06)";
const ADJUSTED_ACCENT = "#b45309";

function describePromotion(p) {
    switch (p.promoType) {
        case "GiamPhanTram":
            return `Giảm ${p.phanTramGiam ?? 0}%${p.mucGiamToiDa ? ` (tối đa ${formatCurrency(p.mucGiamToiDa)})` : ""}`;
        case "GiamTienMat":
            return `Giảm ${formatCurrency(p.soTienGiam)}`;
        case "TangNgay":
            return `Tặng ${p.soNgayTang ?? 0} ngày`;
        case "TangChuKy":
            return `Tặng ${p.soChuKyTang ?? 0} chu kỳ`;
        default:
            return p.promoType || "Khuyến mãi";
    }
}

function formatCurrency(v) {
    const n = Number(v) || 0;
    return n.toLocaleString("vi-VN") + "đ";
}

function formatDate(d) {
    if (!d) return "—";
    const datePart = d.split("T")[0];
    const [y, m, dd] = datePart.split("-");
    if (!y || !m || !dd) return d;
    return `${dd}/${m}/${y}`;
}

function formatDateTime(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
}

function formatDateOnly(d) {
    if (!d) return "—";
    const parts = String(d).split("-");
    if (parts.length !== 3) return d;
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
}

// Bảng token màu — theme sáng (trắng nền, xanh lá làm accent) khớp với giao diện
// Admin Panel chung của hệ thống: nền kem-trắng dịu, card trắng viền màu xanh lá nhạt,
// đổ bóng đậm để tách lớp rõ ràng.
const C = {
    bgPage: "#f4f7f5",
    bgCard: "#ffffff",
    bgSubtle: "#f4faf7",
    borderSoft: "#e3e8e6",
    borderAccent: "#bfe8d4",
    green: "#059669",
    greenDark: "#047857",
    greenDarker: "#065f46",
    greenSoft: "rgba(5,150,105,0.10)",
    greenRing: "rgba(5,150,105,0.18)",
    textPrimary: "#0f2419",
    textSecondary: "#5b6b64",
    textMuted: "#93a29b",
    shadowCard: "0 1px 2px rgba(15,36,25,0.04), 0 14px 32px -12px rgba(5,150,105,0.18)",
    shadowStrong: "0 4px 10px rgba(15,36,25,0.06), 0 22px 46px -14px rgba(5,150,105,0.26)",
    shadowSoft: "0 1px 2px rgba(15,36,25,0.03), 0 6px 14px -8px rgba(5,150,105,0.16)",
    transition: "all 0.16s ease",
};

const S = {
    root: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: C.bgPage, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    main: { flex: 1, overflow: "visible", padding: "24px 32px", display: "flex", flexDirection: "column", minHeight: 0 },

    pageTitle: { display: "flex", alignItems: "center", gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${C.borderSoft}` },
    pageTitleIcon: { width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg, ${C.green}, ${C.greenDarker})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 10px 22px -6px rgba(5,150,105,0.55)" },
    h1: { fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" },
    pageDesc: { fontSize: 13, color: C.textSecondary, margin: "2px 0 0 0" },

    filterPanel: { marginBottom: 20, borderRadius: 16, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, padding: 18, flexShrink: 0, boxShadow: C.shadowCard },
    filterGrid: { display: "grid", gridTemplateColumns: "minmax(220px, 1.6fr) minmax(160px, 1fr) minmax(160px, 1fr) auto", gap: 10 },
    searchWrap: { position: "relative" },
    searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none" },
    searchInput: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgSubtle, padding: "10px 36px 10px 36px", fontSize: 13, color: C.textPrimary, outline: "none", transition: C.transition },
    clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", padding: 2, borderRadius: 6, transition: C.transition },

    customSelectWrap: { position: "relative" },
    customSelectBtn: (open, disabled) => ({
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        borderRadius: 8, border: `1.5px solid ${open ? C.green : C.borderSoft}`, backgroundColor: disabled ? "#eef1ef" : C.bgSubtle,
        padding: "10px 12px", fontSize: 13, color: disabled ? C.textMuted : C.textPrimary, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        boxShadow: open ? `0 0 0 3px ${C.greenRing}` : "none",
    }),
    customSelectBtnLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    customSelectChevron: (open) => ({ display: "flex", flexShrink: 0, color: C.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }),
    customSelectMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 180, zIndex: 60, borderRadius: 10, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, boxShadow: C.shadowStrong, padding: 6, maxHeight: 260, overflowY: "auto" },
    customSelectOption: (active) => ({
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer",
        color: active ? C.greenDark : C.textPrimary,
        backgroundColor: active ? C.greenSoft : "transparent",
    }),
    resetBtn: { borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgCard, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" },

    card: { borderRadius: 16, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, boxShadow: C.shadowCard },
    cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.borderSoft}`, padding: "14px 20px", flexShrink: 0, backgroundColor: C.bgSubtle, borderRadius: "16px 16px 0 0" },
    countText: { fontSize: 13, color: C.textSecondary },
    countBold: { fontWeight: 700, color: C.greenDark },
    legendRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.textSecondary },
    legendSwatch: { width: 12, height: 12, borderRadius: 4, backgroundColor: ADJUSTED_ROW_BG, border: `1.5px solid ${ADJUSTED_ACCENT}`, flexShrink: 0 },

    table: { width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" },
    th: { padding: "12px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textSecondary, borderBottom: `2px solid ${C.borderSoft}`, textTransform: "uppercase", whiteSpace: "nowrap", backgroundColor: C.bgSubtle },
    thRight: { padding: "12px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textSecondary, borderBottom: `2px solid ${C.borderSoft}`, textAlign: "right", textTransform: "uppercase", backgroundColor: C.bgSubtle },
    thCenter: { padding: "12px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textSecondary, borderBottom: `2px solid ${C.borderSoft}`, textAlign: "center", textTransform: "uppercase", backgroundColor: C.bgSubtle },
    thAccent: { padding: 0, borderBottom: `2px solid ${C.borderSoft}`, backgroundColor: C.bgSubtle, width: 6 },
    // Ô đầu mỗi hàng — viền trái tô màu hổ phách CHỈ với giao dịch đã điều chỉnh, để mắt bắt được
    // ngay các dòng cần chú ý khi lướt bảng; giao dịch bình thường không có viền màu.
    tdAccent: (isAdjusted) => ({ padding: 0, borderBottom: `1px solid ${C.borderSoft}`, borderLeft: `4px solid ${isAdjusted ? ADJUSTED_ACCENT : "transparent"}`, width: 6 }),
    td: { padding: "13px 20px", borderBottom: `1px solid ${C.borderSoft}`, verticalAlign: "middle" },
    tdRight: { padding: "13px 20px", borderBottom: `1px solid ${C.borderSoft}`, textAlign: "right", verticalAlign: "middle" },
    tdCenter: { padding: "13px 20px", borderBottom: `1px solid ${C.borderSoft}`, textAlign: "center", verticalAlign: "middle" },
    // Tô cả dòng bằng nền hổ phách nhạt khi giao dịch đã bị điều chỉnh gói.
    trAdjusted: (isAdjusted) => (isAdjusted ? { backgroundColor: ADJUSTED_ROW_BG } : undefined),
    memberRow: { display: "flex", alignItems: "center", gap: 10 },
    avatarImg: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${C.borderAccent}`, boxShadow: "0 2px 6px rgba(15,36,25,0.08)" },
    avatarFallback: { width: 36, height: 36, borderRadius: "50%", backgroundColor: C.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.textMuted, border: `1.5px solid ${C.borderSoft}` },
    memberName: { fontWeight: 700, color: C.textPrimary, fontSize: 13 },
    memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textSecondary, marginTop: 2 },
    planName: { color: C.textPrimary },
    branchTag: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSecondary },
    amountMain: { fontWeight: 700, color: C.textPrimary },
    amountOld: { fontSize: 11, color: C.textMuted, textDecoration: "line-through" },

    expandRow: { backgroundColor: C.bgSubtle },
    expandCell: { padding: "16px 24px 20px 58px", borderBottom: `1px solid ${C.borderSoft}` },

    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px 4px 8px", fontSize: 11, fontWeight: 700, backgroundColor: bg, color }),
    adjustedBadge: { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 9999, padding: "3px 9px", fontSize: 10.5, fontWeight: 700, backgroundColor: "rgba(180,83,9,0.14)", color: ADJUSTED_ACCENT, border: `1px solid rgba(180,83,9,0.3)` },

    invoiceBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1.5px solid #bfe0f5", backgroundColor: "#f0f9ff", padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0369a1", cursor: "pointer", whiteSpace: "nowrap", transition: C.transition },
    invoiceBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    adjustBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.greenSoft, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: C.greenDark, cursor: "pointer", whiteSpace: "nowrap", transition: C.transition },
    // Nút "Chi tiết" — điều hướng hẳn sang trang chi tiết, thay cho việc mở rộng dòng tại chỗ.
    detailBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: `1.5px solid ${C.green}`, backgroundColor: C.green, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#ffffff", cursor: "pointer", whiteSpace: "nowrap", transition: C.transition, boxShadow: "0 6px 14px -6px rgba(5,150,105,0.55)" },
    actionStack: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },

    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    emptyTitle: { fontSize: 13.5, fontWeight: 700, color: C.textPrimary },
    emptyDesc: { fontSize: 12, color: C.textSecondary },
    stateIconWrap: (bg) => ({ width: 52, height: 52, borderRadius: "50%", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }),

    loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" },
    errorState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    retryBtn: { marginTop: 8, borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgCard, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer", transition: C.transition },

    scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
    stickyHead: { position: "sticky", top: 0, zIndex: 1 },

    modalBackdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(15,36,25,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "4vh 4vw" },
    modalBox: {
        width: "clamp(320px, 60vw, 760px)",
        height: "clamp(420px, 85vh, 900px)",
        backgroundColor: C.bgCard,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: `1.5px solid ${C.borderAccent}`,
        boxShadow: C.shadowStrong,
    },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.borderSoft}`, flexShrink: 0 },
    modalTitle: { fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 },
    modalHeaderActions: { display: "flex", alignItems: "center", gap: 8 },
    modalIconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgSubtle, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: C.textSecondary, cursor: "pointer" },
    modalBody: { flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: "#fff" },
    invoiceFrame: { width: "100%", height: "100%", border: "none", display: "block", backgroundColor: "#fff" },
    invoiceImgWrap: { width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", backgroundColor: "#f4faf7" },
    invoiceImg: { maxWidth: "100%", display: "block" },

    adjustModalBox: {
        width: "clamp(320px, 90vw, 980px)",
        maxHeight: "90vh",
        backgroundColor: C.bgCard,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: `1.5px solid ${C.borderAccent}`,
        boxShadow: C.shadowStrong,
    },
    adjustModalBody: { flex: 1, minHeight: 0, overflowY: "auto", padding: 20 },
    adjustGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20, alignItems: "start" },
    innerCard: { borderRadius: 14, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgSubtle, padding: 18 },
    innerCardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: "0.04em" },

    infoList: { display: "flex", flexDirection: "column", gap: 12 },
    infoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 },
    infoLabel: { color: C.textSecondary },
    infoLabelWithHint: { display: "flex", flexDirection: "column", gap: 2 },
    infoSubHint: { fontSize: 10.5, color: C.textMuted },
    infoValue: { color: C.textPrimary, fontWeight: 500, textAlign: "right" },
    infoValueHighlight: { color: C.greenDark, fontWeight: 700, textAlign: "right" },

    priceBlock: { marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderSoft}` },
    priceRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
    priceLabel: { fontSize: 12, color: C.textSecondary },
    priceOld: { fontSize: 12, color: C.textMuted, textDecoration: "line-through" },
    priceMain: { fontSize: 20, fontWeight: 700, color: C.textPrimary },

    formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 },
    label: { fontSize: 12.5, fontWeight: 600, color: C.textPrimary, display: "flex", alignItems: "center", gap: 6 },
    labelRequired: { color: "#e11d48" },
    hint: { fontSize: 11.5, color: C.textSecondary },

    textarea: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgCard, padding: "10px 12px", fontSize: 13, color: C.textPrimary, outline: "none", resize: "vertical", minHeight: 90, fontFamily: "inherit" },
    charCount: { alignSelf: "flex-end", fontSize: 11, color: C.textMuted },

    applicablePromoBox: { borderRadius: 10, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgCard, padding: "10px 12px", marginTop: 8 },
    applicablePromoTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 },
    applicablePromoList: { display: "flex", flexDirection: "column", gap: 6 },
    applicablePromoItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 },
    applicablePromoName: { color: C.textPrimary, fontWeight: 500 },
    applicablePromoDesc: { color: C.greenDark, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" },
    applicablePromoEmpty: { fontSize: 12, color: C.textMuted },
    applicablePromoLoadingRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSecondary },

    previewBox: { borderRadius: 12, border: `1.5px dashed ${C.borderAccent}`, backgroundColor: C.greenSoft, padding: 16, marginBottom: 20 },
    previewTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 },
    previewRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 6 },
    previewArrow: { color: C.textMuted, margin: "0 6px" },
    previewNewValue: { color: C.greenDark, fontWeight: 700 },
    previewNote: { fontSize: 11.5, color: C.textSecondary, marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" },
    previewPromoBadge: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, backgroundColor: "#ffffff", color: C.greenDark, border: `1px solid ${C.borderAccent}` },
    previewLoadingRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.textSecondary },
    previewCalcBaseRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, marginBottom: 6, padding: "6px 8px", borderRadius: 8, backgroundColor: "#ffffff" },

    adjustActionsRow: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
    cancelBtn: { borderRadius: 8, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgCard, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" },
    submitBtn: (disabled) => ({
        display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, border: "none",
        backgroundColor: disabled ? "#a7d9c4" : C.green, padding: "10px 20px", fontSize: 13, fontWeight: 700,
        color: disabled ? "#e9f6f0" : "#ffffff", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 10px 20px -8px rgba(5,150,105,0.6)",
    }),

    banner: (kind) => ({
        display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 18,
        backgroundColor: kind === "error" ? "rgba(225,29,72,0.08)" : C.greenSoft,
        border: `1.5px solid ${kind === "error" ? "rgba(225,29,72,0.3)" : C.borderAccent}`,
        color: kind === "error" ? "#be123c" : C.greenDark,
    }),

    successWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 4px 4px" },
    successIconWrap: { width: 60, height: 60, borderRadius: "50%", backgroundColor: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    successTitle: { fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px 0" },
    successDesc: { fontSize: 13, color: C.textSecondary, margin: "0 0 20px 0" },
    successInfoList: { width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 10, backgroundColor: C.bgSubtle, border: `1.5px solid ${C.borderSoft}`, borderRadius: 12, padding: "16px 18px", textAlign: "left" },
    successBackBtn: { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, border: "none", backgroundColor: C.green, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, color: "#ffffff", cursor: "pointer", marginTop: 22, boxShadow: "0 10px 20px -8px rgba(5,150,105,0.6)" },

    // ===== Trang chi tiết giao dịch — thanh trên có nút quay lại + tiêu đề + nút chỉnh sửa;
    // bên dưới chia 2 cột (ảnh hội viên bên trái, thông tin dạng ô bo góc bên phải), và một khối
    // "Lịch sử chỉnh sửa" nằm full-width bên dưới cùng — thay cho modal lịch sử tách rời trước đây. =====
    detailTopBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${C.borderSoft}`, flexWrap: "wrap" },
    detailTopLeft: { display: "flex", alignItems: "center", gap: 14 },
    detailBackBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 12, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, color: C.textPrimary, cursor: "pointer", boxShadow: C.shadowCard, transition: C.transition, flexShrink: 0 },
    detailTitleWrap: {},
    detailTitle: { fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" },
    detailSubtitle: { fontSize: 12.5, color: C.textSecondary, margin: "2px 0 0 0" },
    detailEditBtn: { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, border: "none", backgroundColor: C.green, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, color: "#ffffff", cursor: "pointer", boxShadow: "0 10px 22px -8px rgba(5,150,105,0.6)", transition: C.transition },

    detailBody: { flex: 1, minHeight: 0, overflowY: "auto" },
    detailGrid: { display: "grid", gridTemplateColumns: "minmax(200px, 240px) 1fr", gap: 18, alignItems: "start" },

    detailPhotoCard: { borderRadius: 16, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, boxShadow: C.shadowCard, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
    detailPhotoLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12, alignSelf: "flex-start" },
    detailPhotoImgWrap: { width: 140, height: 140, borderRadius: 14, overflow: "hidden", border: `2px solid ${C.borderAccent}`, boxShadow: C.shadowSoft, backgroundColor: C.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    detailPhotoImg: { width: "100%", height: "100%", objectFit: "cover" },
    detailPhotoName: { fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "12px 0 8px 0" },
    detailPhotoBadges: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 },

    detailInfoCard: { borderRadius: 16, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, boxShadow: C.shadowCard, padding: 18 },
    detailSectionTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: C.greenDark, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" },
    detailFieldGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 },
    detailFieldBox: { display: "flex", flexDirection: "column", gap: 5 },
    detailFieldLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.textSecondary },
    detailFieldValue: { borderRadius: 10, border: `1.5px solid ${C.borderAccent}`, backgroundColor: "#ffffff", padding: "9px 12px", fontSize: 13, fontWeight: 600, color: C.textPrimary, minHeight: 18, boxShadow: C.shadowSoft },
    detailFieldValueHighlight: { borderRadius: 10, border: `1.5px solid ${C.green}`, backgroundColor: C.greenSoft, padding: "9px 12px", fontSize: 13, fontWeight: 700, color: C.greenDark, minHeight: 18, boxShadow: "0 1px 2px rgba(15,36,25,0.03), 0 8px 18px -8px rgba(5,150,105,0.35)" },
    detailDivider: { height: 1, backgroundColor: C.borderSoft, margin: "16px 0" },

    // Khối "Lịch sử chỉnh sửa" — đặt full-width bên dưới detailGrid.
    detailHistoryCard: { borderRadius: 16, border: `1.5px solid ${C.borderAccent}`, backgroundColor: C.bgCard, boxShadow: C.shadowCard, padding: 18, marginTop: 18 },
    historySessionCard: { borderRadius: 12, border: `1.5px solid ${C.borderSoft}`, backgroundColor: C.bgSubtle, padding: 16, marginBottom: 12 },
    historySessionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 },
    historySessionEmployee: { fontSize: 13, fontWeight: 700, color: C.textPrimary },
    historySessionDate: { fontSize: 11.5, color: C.textMuted },
    historySessionReason: { fontSize: 12.5, color: C.textSecondary, marginBottom: 10, fontStyle: "italic" },
    historyChangeRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "6px 0", borderTop: `1px solid ${C.borderSoft}` },
    historyChangeLabel: { color: C.textSecondary, minWidth: 110, flexShrink: 0 },
    historyChangeValues: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
    historyChangeOld: { color: C.textMuted, textDecoration: "line-through" },
    historyChangeNew: { color: C.greenDark, fontWeight: 700 },
    historyEmptyRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.textMuted, padding: "8px 2px" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
    const Icon = cfg.icon;
    return (
        <span style={S.badge(cfg.bg, cfg.color)}>
            <Icon size={12} strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

function ChannelBadge({ channel }) {
    const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG["Online"];
    const Icon = cfg.icon;
    return (
        <span style={S.badge(cfg.bg, cfg.color)}>
            <Icon size={12} strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

// Badge nhỏ đánh dấu giao dịch đã từng bị điều chỉnh gói (item.isAdjusted từ BE).
function AdjustedBadge() {
    return (
        <span style={S.adjustedBadge}>
            <RefreshCw size={10} strokeWidth={2.5} />
            Đã điều chỉnh
        </span>
    );
}

function Avatar({ src, alt, size = 36 }) {
    const [errored, setErrored] = useState(false);
    if (!src || errored) {
        return (
            <span style={{ ...S.avatarFallback, width: size, height: size }}>
                <User size={size <= 36 ? 16 : 20} />
            </span>
        );
    }
    return (
        <img
            src={src}
            alt={alt || "avatar"}
            style={{ ...S.avatarImg, width: size, height: size }}
            onError={() => setErrored(true)}
        />
    );
}

function CustomSelect({ value, onChange, options, placeholder = "Chọn...", disabled = false }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        }
        function handleKey(e) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, []);

    const selected = options.find((o) => String(o.value) === String(value));

    return (
        <div ref={wrapRef} style={S.customSelectWrap}>
            <button
                type="button"
                className="custom-select-btn"
                style={S.customSelectBtn(open, disabled)}
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
            >
                <span style={S.customSelectBtnLabel}>{selected ? selected.label : placeholder}</span>
                <span style={S.customSelectChevron(open)}><ChevronDown size={14} /></span>
            </button>
            {open && (
                <div style={S.customSelectMenu} className="scroll-dark custom-select-menu">
                    {options.length === 0 ? (
                        <div style={{ padding: "10px 10px", fontSize: 12.5, color: "#93a29b" }}>Không có dữ liệu</div>
                    ) : (
                        options.map((opt) => {
                            const isActive = String(opt.value) === String(value);
                            return (
                                <div
                                    key={opt.value}
                                    className="custom-select-option"
                                    style={S.customSelectOption(isActive)}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                >
                                    <span>{opt.label}</span>
                                    {isActive && <Check size={14} />}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function InvoiceButton({ item, onView, loading }) {
    return (
        <button
            style={{ ...S.invoiceBtn, ...(loading ? S.invoiceBtnDisabled : {}) }}
            className="invoice-btn"
            disabled={loading}
            onClick={() => onView(item)}
        >
            {loading ? <Loader2 className="spin" size={13} /> : <FileText size={13} />}
            Xem hóa đơn
        </button>
    );
}

function AdjustButton({ item, onClick }) {
    return (
        <button
            style={S.adjustBtn}
            className="adjust-btn"
            onClick={() => onClick(item)}
        >
            <PencilLine size={13} />
            Điều chỉnh
        </button>
    );
}

function InvoiceModal({ state, onClose, onPrint, onDownload }) {
    if (!state.open) return null;

    const isPdf = state.contentType?.includes("pdf");
    const isHtml = state.contentType?.includes("html");
    const isImage = state.contentType?.startsWith("image/");
    const showIframe = isPdf || isHtml;

    return (
        <div style={S.modalBackdrop} onClick={onClose}>
            <div style={S.modalBox} className="invoice-modal-box" onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <p style={S.modalTitle}>
                        Hóa đơn{state.item?.fullName ? ` - ${state.item.fullName}` : ""}
                    </p>
                    <div style={S.modalHeaderActions}>
                        {!state.loading && !state.error && (
                            <>
                                <button style={S.modalIconBtn} onClick={onDownload}>
                                    <Download size={13} /> Tải về
                                </button>
                                {showIframe && (
                                    <button style={S.modalIconBtn} onClick={onPrint}>
                                        <Printer size={13} /> In
                                    </button>
                                )}
                            </>
                        )}
                        <button style={S.modalIconBtn} onClick={onClose}>
                            <X size={13} /> Đóng
                        </button>
                    </div>
                </div>

                <div style={S.modalBody}>
                    {state.loading ? (
                        <div style={S.loadingState}>
                            <Loader2 className="spin" size={28} color="#5b6b64" />
                            <p style={S.emptyTitle}>Đang tải hóa đơn...</p>
                        </div>
                    ) : state.error ? (
                        <div style={S.errorState}>
                            <XCircle size={28} color="#e11d48" />
                            <p style={S.emptyTitle}>{state.error}</p>
                        </div>
                    ) : showIframe ? (
                        <iframe
                            id="invoice-print-frame"
                            title="Hóa đơn"
                            src={state.blobUrl}
                            style={S.invoiceFrame}
                        />
                    ) : isImage ? (
                        <div style={S.invoiceImgWrap}>
                            <img src={state.blobUrl} alt="Hóa đơn" style={S.invoiceImg} />
                        </div>
                    ) : (
                        <div style={S.errorState}>
                            <XCircle size={28} color="#e11d48" />
                            <p style={S.emptyTitle}>Định dạng hóa đơn không được hỗ trợ xem trực tiếp</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ApplicablePromotionsBox({ planId }) {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!planId) {
            setPromotions([]);
            setError(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);

        managerApi.getApplicablePromotions(planId)
            .then((res) => {
                if (cancelled) return;
                const data = res?.data ?? res;
                const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
                setPromotions(list);
            })
            .catch((err) => {
                if (cancelled) return;
                setPromotions([]);
                setError(err?.response?.data?.message || err?.message || "Không thể tải khuyến mãi của gói này.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [planId]);

    if (!planId) return null;

    return (
        <div style={S.applicablePromoBox}>
            <p style={S.applicablePromoTitle}>
                <Sparkles size={12} />
                Khuyến mãi đang gắn với gói này
            </p>
            {loading ? (
                <div style={S.applicablePromoLoadingRow}>
                    <Loader2 className="spin" size={12} />
                    Đang tải...
                </div>
            ) : error ? (
                <div style={{ ...S.applicablePromoLoadingRow, color: "#fda4af" }}>
                    <XCircle size={12} />
                    {error}
                </div>
            ) : promotions.length === 0 ? (
                <p style={S.applicablePromoEmpty}>Gói này hiện không có khuyến mãi nào.</p>
            ) : (
                <div style={S.applicablePromoList}>
                    {promotions.map((p) => (
                        <div key={p.promotionId} style={S.applicablePromoItem}>
                            <span style={S.applicablePromoName}>{p.tenKhuyenMai}</span>
                            <span style={S.applicablePromoDesc}>{describePromotion(p)}</span>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}

function SuccessPanel({ data, onClose }) {
    return (
        <div style={S.successWrap}>
            <div style={S.successIconWrap}>
                <CheckCircle2 size={32} color="#059669" />
            </div>
            <h2 style={S.successTitle}>Điều chỉnh thành công</h2>
            <p style={S.successDesc}>
                Giao dịch {data?.orderCode ? <strong style={{ color: "#0f2419" }}>#{data.orderCode}</strong> : ""} đã được cập nhật sang gói mới.
            </p>

            <div style={S.successInfoList}>
                <div style={S.infoRow}>
                    <span style={S.infoLabel}>Hội viên</span>
                    <span style={S.infoValue}>{data?.memberName || "—"}</span>
                </div>
                <div style={S.infoRow}>
                    <span style={S.infoLabel}>Gói cũ</span>
                    <span style={S.infoValue}>{data?.oldPlanName || "—"}</span>
                </div>
                <div style={S.infoRow}>
                    <span style={S.infoLabel}>Gói mới</span>
                    <span style={{ ...S.infoValue, color: "#047857" }}>{data?.newPlanName || "—"}</span>
                </div>
                <div style={S.infoRow}>
                    <span style={S.infoLabel}>Số tiền mới</span>
                    <span style={S.infoValue}>{formatCurrency(data?.newAmount)}</span>
                </div>
                {data?.promotionName && (
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Khuyến mãi áp dụng</span>
                        <span style={S.previewPromoBadge}>
                            <Gift size={11} />
                            {data.promotionName}
                            {data?.bonusDays > 0 ? ` (+${data.bonusDays} ngày)` : ""}
                        </span>
                    </div>
                )}
                {data?.startDate && (
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Ngày bắt đầu gói (mốc tính)</span>
                        <span style={S.infoValue}>{formatDateOnly(data.startDate)}</span>
                    </div>
                )}
                {data?.newExpiryDate && (
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Ngày hết hạn mới</span>
                        <span style={S.infoValue}>{formatDateOnly(data.newExpiryDate)}</span>
                    </div>
                )}
                {data?.reason && (
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Lý do</span>
                        <span style={S.infoValue}>{data.reason}</span>
                    </div>
                )}
            </div>

            <button type="button" className="success-back-btn" style={S.successBackBtn} onClick={onClose}>
                Đóng &amp; cập nhật danh sách
            </button>
        </div>
    );
}

function AdjustModal({ transactionId, onClose, onSuccess }) {
    const [transaction, setTransaction] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState(null);

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [reason, setReason] = useState("");

    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const [success, setSuccess] = useState(false);
    const [successData, setSuccessData] = useState(null);

    async function loadDetail() {
        setLoadingDetail(true);
        setDetailError(null);
        try {
            const res = await managerApi.getTransactionDetail(transactionId);
            const raw = res?.data ?? res;
            const data = raw?.data ?? raw;
            setTransaction(data);
            setSelectedPlanId(data?.planId ?? "");
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            if (status === 403) setDetailError(msg || "Bạn không có quyền xem/điều chỉnh giao dịch này.");
            else if (status === 404) setDetailError(msg || "Không tìm thấy giao dịch này.");
            else setDetailError(msg || err?.message || "Không thể tải thông tin giao dịch");
        } finally {
            setLoadingDetail(false);
        }
    }

    useEffect(() => {
        if (transactionId) loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId]);

    useEffect(() => {
        async function loadPlans() {
            setLoadingPlans(true);
            try {
                const res = await managerApi.getPlans();
                const data = res?.data ?? res;
                setPlans(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
            } catch (err) {
                console.error("Không thể tải danh sách gói tập:", err);
                setPlans([]);
            } finally {
                setLoadingPlans(false);
            }
        }
        loadPlans();
    }, []);

    const currentStatus = transaction?.paymentStatus || transaction?.status;
    const isAdjustable = !!transaction && currentStatus === "Paid";

    const transactionPhone =
        transaction?.phone ??
        transaction?.phoneNumber ??
        transaction?.sdt ??
        transaction?.soDienThoai ??
        transaction?.member?.phoneNumber ??
        transaction?.member?.phone ??
        null;

    const transactionStartDate =
        transaction?.startDate ??
        transaction?.ngayBatDau ??
        transaction?.memberPackageStartDate ??
        null;

    const planOptions = useMemo(() => plans.map((p) => ({
        value: p.planId,
        label: `${p.planName}${transaction && String(p.planId) === String(transaction.planId) ? " (đang dùng)" : ""} — ${formatCurrency(p.price)}`,
    })), [plans, transaction]);

    const hasChanges = !!transaction && String(selectedPlanId) !== String(transaction.planId ?? "");

    useEffect(() => {
        if (!transaction || !selectedPlanId || !isAdjustable) {
            setPreview(null);
            setPreviewError(null);
            return;
        }
        if (!hasChanges) {
            setPreview(null);
            setPreviewError(null);
            return;
        }

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);

        const timer = setTimeout(async () => {
            try {
                const res = await managerApi.previewAdjustTransactionPlan(transactionId, selectedPlanId);
                const data = res?.data ?? res;
                if (!cancelled) setPreview(data);
            } catch (err) {
                if (!cancelled) {
                    setPreview(null);
                    setPreviewError(
                        err?.response?.data?.message || err?.message || "Không thể tính trước kết quả điều chỉnh."
                    );
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlanId, transaction, transactionId, isAdjustable]);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError(null);

        if (!isAdjustable) {
            setSubmitError("Giao dịch này hiện không thể điều chỉnh (không ở trạng thái Đang hiệu lực).");
            return;
        }
        if (!selectedPlanId) {
            setSubmitError("Vui lòng chọn gói tập mới.");
            return;
        }
        if (!reason.trim()) {
            setSubmitError("Vui lòng nhập lý do điều chỉnh.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                newPlanId: selectedPlanId,
                reason: reason.trim(),
            };
            const res = await managerApi.adjustTransactionPlan(transactionId, payload);
            const data = res?.data ?? res;

            setSuccessData({
                transactionId,
                orderCode: transaction?.orderCode,
                memberName: transaction?.memberName || transaction?.fullName,
                oldPlanName: transaction?.planName,
                newPlanName: data?.planName ?? planOptions.find((o) => String(o.value) === String(selectedPlanId))?.label,
                oldAmount: transaction?.amount,
                newAmount: data?.amount,
                promotionId: data?.promotionId ?? null,
                promotionName: preview?.promotionName ?? null,
                bonusDays: preview?.bonusDays ?? 0,
                startDate: data?.startDate ?? preview?.startDate ?? null,
                newExpiryDate: data?.expiryDate ?? preview?.newExpiryDate ?? null,
                reason: reason.trim(),
            });
            setSuccess(true);
            setSubmitting(false);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            if (status === 404) setSubmitError(msg || "Không tìm thấy giao dịch này.");
            else if (status === 403) setSubmitError(msg || "Bạn không có quyền điều chỉnh giao dịch này.");
            else if (status === 400) setSubmitError(msg || "Yêu cầu không hợp lệ, vui lòng kiểm tra lại lựa chọn.");
            else setSubmitError(msg || err?.message || "Có lỗi xảy ra, vui lòng thử lại.");
            setSubmitting(false);
        }
    }

    return (
        <div style={S.modalBackdrop} onClick={success ? undefined : onClose}>
            <div style={S.adjustModalBox} className="invoice-modal-box" onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <p style={S.modalTitle}>
                        <PencilLine size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
                        Điều chỉnh gói hóa đơn
                    </p>
                    <div style={S.modalHeaderActions}>
                        <button style={S.modalIconBtn} onClick={onClose}>
                            <X size={13} /> Đóng
                        </button>
                    </div>
                </div>

                <div style={S.adjustModalBody} className="scroll-dark">
                    {success ? (
                        <SuccessPanel data={successData} onClose={onSuccess} />
                    ) : loadingDetail ? (
                        <div style={S.loadingState}>
                            <Loader2 className="spin" size={28} color="#5b6b64" />
                            <p style={S.emptyTitle}>Đang tải thông tin giao dịch...</p>
                        </div>
                    ) : detailError ? (
                        <div style={S.errorState}>
                            <XCircle size={28} color="#e11d48" />
                            <p style={S.emptyTitle}>{detailError}</p>
                            <button style={S.retryBtn} className="retry-btn" onClick={loadDetail}>Thử lại</button>
                        </div>
                    ) : !transaction ? (
                        <div style={S.errorState}>
                            <AlertTriangle size={28} color="#fbbf24" />
                            <p style={S.emptyTitle}>Không tìm thấy dữ liệu giao dịch</p>
                        </div>
                    ) : !isAdjustable ? (
                        <div style={S.errorState}>
                            <AlertTriangle size={28} color="#fbbf24" />
                            <p style={S.emptyTitle}>Giao dịch này hiện không thể điều chỉnh</p>
                            <p style={S.emptyDesc}>
                                Chỉ giao dịch ở trạng thái "Đang hiệu lực" mới được phép đổi gói.
                                Trạng thái hiện tại: <StatusBadge status={currentStatus} />
                            </p>
                        </div>
                    ) : (
                        <div className="adjust-grid" style={S.adjustGrid}>
                            <div style={S.innerCard}>
                                <p style={S.innerCardTitle}>Giao dịch hiện tại</p>

                                <div style={{ ...S.memberRow, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e3e8e6" }}>
                                    <Avatar src={transaction.urlImg} alt={transaction.memberName || transaction.fullName} size={44} />
                                    <div>
                                        <p style={{ fontWeight: 600, color: "#0f2419", fontSize: 14, margin: 0 }}>{transaction.memberName || transaction.fullName || "—"}</p>
                                        <p style={S.memberPhone}><Phone size={11} />{transactionPhone || "—"}</p>
                                    </div>
                                </div>

                                <div style={S.infoList}>
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabel}>Mã đơn</span>
                                        <span style={S.infoValue}>{transaction.orderCode || "—"}</span>
                                    </div>
                                    {transaction.branchName && (
                                        <div style={S.infoRow}>
                                            <span style={S.infoLabel}>Chi nhánh</span>
                                            <span style={S.infoValue}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                    <MapPin size={12} color="#93a29b" />{transaction.branchName}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                    {transaction.purchaseChannel && (
                                        <div style={S.infoRow}>
                                            <span style={S.infoLabel}>Kênh mua</span>
                                            <ChannelBadge channel={transaction.purchaseChannel} />
                                        </div>
                                    )}
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabel}>Trạng thái</span>
                                        <StatusBadge status={currentStatus} />
                                    </div>
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabel}>Gói hiện tại</span>
                                        <span style={S.infoValue}>{transaction.planName || "—"}</span>
                                    </div>

                                    <div style={S.infoRow}>
                                        <span style={S.infoLabelWithHint}>
                                            <span style={S.infoLabel}>Ngày tạo</span>
                                            <span style={S.infoSubHint}>(thời điểm lập giao dịch/hóa đơn)</span>
                                        </span>
                                        <span style={S.infoValue}>{formatDateTime(transaction.createdAt)}</span>
                                    </div>
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabelWithHint}>
                                            <span style={S.infoLabel}>Ngày bắt đầu gói</span>
                                            <span style={S.infoSubHint}>(mốc để tính ngày hết hạn)</span>
                                        </span>
                                        <span style={S.infoValueHighlight}>{formatDateOnly(transactionStartDate) || "—"}</span>
                                    </div>

                                    {transaction.updatedAt && (
                                        <div style={S.infoRow}>
                                            <span style={S.infoLabel}>Cập nhật lần cuối</span>
                                            <span style={S.infoValue}>{formatDateTime(transaction.updatedAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={S.priceBlock}>
                                    <div style={S.priceRow}>
                                        <span style={S.priceLabel}>Giá gốc</span>
                                        <span style={{ ...S.infoValue }}>{formatCurrency(transaction.giaGoc ?? transaction.originalAmount)}</span>
                                    </div>
                                    <div style={S.priceRow}>
                                        <span style={S.priceLabel}>Số tiền đã thanh toán</span>
                                        <span style={S.priceMain}>{formatCurrency(transaction.amount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={S.innerCard}>
                                <p style={S.innerCardTitle}>Điều chỉnh</p>

                                {submitError && (
                                    <div style={S.banner("error")}>
                                        <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span>{submitError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div style={S.formGroup}>
                                        <span style={S.label}><Package size={13} /> Gói tập mới <span style={S.labelRequired}>*</span></span>
                                        <CustomSelect
                                            value={selectedPlanId}
                                            onChange={setSelectedPlanId}
                                            placeholder={loadingPlans ? "Đang tải danh sách gói..." : "Chọn gói tập"}
                                            disabled={loadingPlans}
                                            options={planOptions}
                                        />
                                        <span style={S.hint}>Khuyến mãi (nếu có) sẽ được hệ thống tự động áp dụng theo đúng chương trình còn hiệu lực tại thời điểm giao dịch gốc được tạo.</span>

                                        <ApplicablePromotionsBox planId={selectedPlanId} />
                                    </div>

                                    <div style={S.formGroup}>
                                        <span style={S.label}>Lý do điều chỉnh <span style={S.labelRequired}>*</span></span>
                                        <textarea
                                            style={S.textarea}
                                            value={reason}
                                            maxLength={500}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Vd: Nhân viên chọn nhầm gói lúc bán, hội viên yêu cầu đổi sang gói 3 tháng..."
                                        />
                                        <span style={S.charCount}>{reason.length}/500</span>
                                    </div>

                                    {hasChanges && (
                                        <div style={S.previewBox}>
                                            <p style={S.previewTitle}>Xem trước thay đổi</p>

                                            {previewLoading ? (
                                                <div style={S.previewLoadingRow}>
                                                    <Loader2 className="spin" size={14} />
                                                    Đang tính toán giá và khuyến mãi...
                                                </div>
                                            ) : previewError ? (
                                                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: "#fda4af" }}>
                                                    <XCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                                    {previewError}
                                                </div>
                                            ) : preview ? (
                                                <>
                                                    {preview.startDate && (
                                                        <div style={S.previewCalcBaseRow}>
                                                            <span style={{ ...S.infoLabel, display: "inline-flex", alignItems: "center", gap: 5 }}>
                                                                <Clock size={11} />
                                                                Tính từ ngày bắt đầu gói
                                                            </span>
                                                            <span style={{ color: "#047857", fontWeight: 700 }}>{formatDateOnly(preview.startDate)}</span>
                                                        </div>
                                                    )}
                                                    <div style={S.previewRow}>
                                                        <span style={S.infoLabel}>Gói tập</span>
                                                        <span>
                                                            {transaction.planName}
                                                            <span style={S.previewArrow}>→</span>
                                                            <span style={S.previewNewValue}>{preview.newPlanName}</span>
                                                        </span>
                                                    </div>
                                                    <div style={S.previewRow}>
                                                        <span style={S.infoLabel}>Giá gốc</span>
                                                        <span>
                                                            <span style={S.priceOld}>{formatCurrency(transaction.giaGoc ?? transaction.originalAmount)}</span>
                                                            <span style={S.previewArrow}>→</span>
                                                            <span style={S.previewNewValue}>{formatCurrency(preview.giaGoc)}</span>
                                                        </span>
                                                    </div>
                                                    <div style={S.previewRow}>
                                                        <span style={S.infoLabel}>Số tiền thanh toán</span>
                                                        <span style={S.previewNewValue}>{formatCurrency(preview.amount)}</span>
                                                    </div>
                                                    {preview.promotionId != null && (
                                                        <div style={S.previewRow}>
                                                            <span style={S.infoLabel}>Khuyến mãi tự động áp dụng</span>
                                                            <span style={S.previewPromoBadge}>
                                                                <Gift size={11} />
                                                                {preview.promotionName}
                                                                {preview.bonusDays > 0 ? ` (+${preview.bonusDays} ngày)` : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {preview.newExpiryDate && (
                                                        <div style={S.previewRow}>
                                                            <span style={S.infoLabel}>Ngày hết hạn mới</span>
                                                            <span style={S.previewNewValue}>{formatDateOnly(preview.newExpiryDate)}</span>
                                                        </div>
                                                    )}
                                                    <p style={S.previewNote}>
                                                        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                                        "Ngày hết hạn mới" được cộng dồn từ "Ngày bắt đầu gói" ở trên — KHÔNG phải từ "Ngày tạo"
                                                        giao dịch. Đây là số liệu do hệ thống tính sẵn, sẽ được lưu chính thức sau khi bạn bấm
                                                        "Lưu thay đổi".
                                                    </p>
                                                </>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="adjust-actions" style={S.adjustActionsRow}>
                                        <button type="button" className="cancel-btn" style={S.cancelBtn} onClick={onClose}>
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            className="submit-btn"
                                            style={S.submitBtn(submitting || loadingPlans || previewLoading)}
                                            disabled={submitting || loadingPlans || previewLoading}
                                        >
                                            {submitting ? <Loader2 className="spin" size={14} /> : <Wallet size={14} />}
                                            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Gộp dữ liệu chi tiết (từ API) với dữ liệu dòng đã bấm trong danh sách (fallback), chỉ ghi đè
// field nào API chi tiết thực sự trả về dữ liệu — tránh mất "Ngày bắt đầu gói"/"Ngày hết hạn"
// khi endpoint chi tiết trả null/rỗng cho field đó.
function mergeDetailData(fallback, detail) {
    const merged = { ...(fallback || {}) };
    if (detail) {
        Object.keys(detail).forEach((key) => {
            const v = detail[key];
            if (v !== null && v !== undefined && v !== "") {
                merged[key] = v;
            }
        });
    }
    return merged;
}

// Khối "Lịch sử chỉnh sửa" — trước đây là modal riêng (AdjustmentHistoryModal), giờ chuyển
// thành 1 khối hiển thị ngay trong trang chi tiết giao dịch, tự tải dữ liệu khi trang mở.
function AdjustmentHistorySection({ transactionId }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function loadHistory() {
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getAdjustmentHistory(transactionId);
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            setSessions(list);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            if (status === 403) setError(msg || "Bạn không có quyền xem lịch sử điều chỉnh giao dịch này.");
            else if (status === 404) setError(msg || "Không tìm thấy giao dịch này.");
            else setError(msg || err?.message || "Không thể tải lịch sử điều chỉnh.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (transactionId) loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId]);

    return (
        <div style={S.detailHistoryCard}>
            <p style={S.detailSectionTitle}><History size={13} /> Lịch sử chỉnh sửa</p>

            {loading ? (
                <div style={S.historyEmptyRow}>
                    <Loader2 className="spin" size={13} />
                    Đang tải lịch sử điều chỉnh...
                </div>
            ) : error ? (
                <div style={{ ...S.historyEmptyRow, color: "#be123c" }}>
                    <XCircle size={13} />
                    {error}
                </div>
            ) : sessions.length === 0 ? (
                <div style={S.historyEmptyRow}>
                    <History size={13} />
                    Giao dịch này chưa từng được điều chỉnh
                </div>
            ) : (
                sessions.map((s) => (
                    <div key={s.sessionId} style={S.historySessionCard}>
                        <div style={S.historySessionHeader}>
                            <span style={S.historySessionEmployee}>{s.employeeName || "—"}</span>
                            <span style={S.historySessionDate}>{formatDateTime(s.updatedAt)}</span>
                        </div>
                        {s.reason && (
                            <p style={S.historySessionReason}>"{s.reason}"</p>
                        )}
                        {(s.changes || []).map((c, i) => (
                            <div key={i} style={S.historyChangeRow}>
                                <span style={S.historyChangeLabel}>{c.fieldName}</span>
                                <span style={S.historyChangeValues}>
                                    <span style={S.historyChangeOld}>{c.oldValue}</span>
                                    <ArrowRight size={12} color="#93a29b" />
                                    <span style={S.historyChangeNew}>{c.newValue}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}

function TransactionDetailPage({ transactionId, fallbackItem, onBack, onEdit }) {
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function loadDetail() {
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getTransactionDetail(transactionId);
            const raw = res?.data ?? res;
            const data = raw?.data ?? raw;
            setTransaction(data);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            if (status === 403) setError(msg || "Bạn không có quyền xem giao dịch này.");
            else if (status === 404) setError(msg || "Không tìm thấy giao dịch này.");
            else setError(msg || err?.message || "Không thể tải thông tin giao dịch");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (transactionId) loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId]);

    const data = mergeDetailData(fallbackItem, transaction);

    const phone =
        data.phone ?? data.phoneNumber ?? data.sdt ?? data.soDienThoai ??
        data.member?.phoneNumber ?? data.member?.phone ?? null;

    const status = data.status || data.paymentStatus;
    const startDate = data.startDate ?? data.ngayBatDau ?? data.memberPackageStartDate ?? null;
    const fullName = data.fullName || data.memberName || "—";
    const isAdjustable = status === "Paid";

    return (
        <main className="main-pad" style={S.main}>
            <div className="detail-top-bar" style={S.detailTopBar}>
                <div style={S.detailTopLeft}>
                    <button type="button" className="detail-back-btn" style={S.detailBackBtn} onClick={onBack} title="Quay lại danh sách">
                        <ArrowLeft size={18} />
                    </button>
                    <div style={S.detailTitleWrap}>
                        <h1 style={S.detailTitle}>Chi tiết giao dịch</h1>
                        <p style={S.detailSubtitle}>Mã đơn: {data.orderCode || "—"}</p>
                    </div>
                </div>
                {!loading && !error && (
                    <button
                        type="button"
                        className="detail-edit-btn"
                        style={{ ...S.detailEditBtn, ...(isAdjustable ? {} : { opacity: 0.5, cursor: "not-allowed" }) }}
                        disabled={!isAdjustable}
                        onClick={() => isAdjustable && onEdit(transactionId)}
                        title={isAdjustable ? "Điều chỉnh gói của giao dịch này" : "Chỉ giao dịch Đã thanh toán mới điều chỉnh được"}
                    >
                        <PencilLine size={15} />
                        Chỉnh sửa
                    </button>
                )}
            </div>

            <div className="detail-body scroll-dark" style={S.detailBody}>
                {loading ? (
                    <div style={S.loadingState}>
                        <div style={S.stateIconWrap(C.greenSoft)}>
                            <Loader2 className="spin" size={22} color={C.green} />
                        </div>
                        <p style={S.emptyTitle}>Đang tải thông tin giao dịch...</p>
                    </div>
                ) : error ? (
                    <div style={S.errorState}>
                        <div style={S.stateIconWrap("rgba(225,29,72,0.10)")}>
                            <XCircle size={22} color="#e11d48" />
                        </div>
                        <p style={S.emptyTitle}>{error}</p>
                        <button style={S.retryBtn} className="retry-btn" onClick={loadDetail}>Thử lại</button>
                    </div>
                ) : (
                    <>
                        <div className="detail-grid" style={S.detailGrid}>
                            <div style={S.detailPhotoCard}>
                                <span style={S.detailPhotoLabel}><User size={12} /> Ảnh hội viên</span>
                                <div style={S.detailPhotoImgWrap}>
                                    {data.urlImg ? (
                                        <img src={data.urlImg} alt={fullName} style={S.detailPhotoImg} />
                                    ) : (
                                        <User size={48} color={C.textMuted} />
                                    )}
                                </div>
                                <p style={S.detailPhotoName}>{fullName}</p>
                                <div style={S.detailPhotoBadges}>
                                    <StatusBadge status={status} />
                                    {data.purchaseChannel && <ChannelBadge channel={data.purchaseChannel} />}
                                    {data.isAdjusted && <AdjustedBadge />}
                                </div>
                            </div>

                            <div style={S.detailInfoCard}>
                                <p style={S.detailSectionTitle}><User size={13} /> Thông tin hội viên</p>
                                <div style={S.detailFieldGrid}>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><User size={12} /> Họ và tên</span>
                                        <span style={S.detailFieldValue}>{fullName}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Phone size={12} /> Số điện thoại</span>
                                        <span style={S.detailFieldValue}>{phone || "—"}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Hash size={12} /> Mã đơn</span>
                                        <span style={S.detailFieldValue}>{data.orderCode || "—"}</span>
                                    </div>
                                </div>

                                <div style={S.detailDivider} />

                                <p style={S.detailSectionTitle}><Package size={13} /> Gói tập &amp; giao dịch</p>
                                <div style={S.detailFieldGrid}>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Package size={12} /> Gói tập</span>
                                        <span style={S.detailFieldValue}>{data.planName || "—"}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><MapPin size={12} /> Chi nhánh</span>
                                        <span style={S.detailFieldValue}>{data.branchName || "—"}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Store size={12} /> Kênh mua</span>
                                        <span style={S.detailFieldValue}>
                                            {data.purchaseChannel ? <ChannelBadge channel={data.purchaseChannel} /> : "—"}
                                        </span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><CheckCircle2 size={12} /> Trạng thái</span>
                                        <span style={S.detailFieldValue}><StatusBadge status={status} /></span>
                                    </div>
                                </div>

                                <div style={S.detailDivider} />

                                <p style={S.detailSectionTitle}><Calendar size={13} /> Thời gian &amp; thanh toán</p>
                                <div style={S.detailFieldGrid}>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Clock size={12} /> Ngày tạo</span>
                                        <span style={S.detailFieldValue}>{formatDateTime(data.createdAt)}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Calendar size={12} /> Ngày bắt đầu gói</span>
                                        <span style={S.detailFieldValueHighlight}>{formatDateOnly(startDate) || "—"}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Calendar size={12} /> Ngày hết hạn</span>
                                        <span style={S.detailFieldValue}>{formatDate(data.expiryDate)}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Receipt size={12} /> Giá gốc</span>
                                        <span style={S.detailFieldValue}>{formatCurrency(data.giaGoc ?? data.originalAmount)}</span>
                                    </div>
                                    <div style={S.detailFieldBox}>
                                        <span style={S.detailFieldLabel}><Wallet size={12} /> Số tiền thanh toán</span>
                                        <span style={S.detailFieldValueHighlight}>{formatCurrency(data.amount)}</span>
                                    </div>
                                    {data.bankReferenceCode && (
                                        <div style={S.detailFieldBox}>
                                            <span style={S.detailFieldLabel}><CreditCard size={12} /> Mã tham chiếu NH</span>
                                            <span style={S.detailFieldValue}>{data.bankReferenceCode}</span>
                                        </div>
                                    )}
                                    {data.updatedAt && (
                                        <div style={S.detailFieldBox}>
                                            <span style={S.detailFieldLabel}><Clock size={12} /> Cập nhật lần cuối</span>
                                            <span style={S.detailFieldValue}>{formatDateTime(data.updatedAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lịch sử các lần điều chỉnh gói — nằm ngay trong trang chi tiết thay vì modal riêng. */}
                        <AdjustmentHistorySection transactionId={transactionId} />
                    </>
                )}
            </div>
        </main>
    );
}

export default function InvoiceOfAdmin() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");

    const [branches, setBranches] = useState([]);
    const [branchFilter, setBranchFilter] = useState("all");
    const [branchesLoading, setBranchesLoading] = useState(true);

    const [invoiceModal, setInvoiceModal] = useState({
        open: false,
        loading: false,
        error: null,
        blobUrl: "",
        contentType: "",
        item: null,
    });
    const loadingItemRef = useRef(null);

    const [adjustModal, setAdjustModal] = useState({ open: false, transactionId: null });

    // Điều hướng nội bộ: "list" = bảng danh sách giao dịch, "detail" = trang chi tiết
    // toàn màn hình của 1 giao dịch, bao gồm cả lịch sử điều chỉnh (nếu có).
    const [view, setView] = useState("list");
    const [selectedItem, setSelectedItem] = useState(null);

    function openDetail(item) {
        const transactionId = item.transactionId ?? item.id;
        if (!transactionId) {
            alert("Không tìm thấy mã giao dịch");
            return;
        }
        setSelectedItem(item);
        setView("detail");
    }

    function backToList() {
        setView("list");
        setSelectedItem(null);
    }

    useEffect(() => {
        async function fetchBranches() {
            setBranchesLoading(true);
            try {
                const res = await authApi.get("/api/employee/profile");
                const data = res?.data ?? res;
                setBranches(Array.isArray(data?.branches) ? data.branches : []);
            } catch (err) {
                console.error("Không thể tải danh sách chi nhánh:", err);
                setBranches([]);
            } finally {
                setBranchesLoading(false);
            }
        }
        fetchBranches();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const formData = useMemo(() => ({
        keyword: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        channel: channelFilter !== "all" ? channelFilter : undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
    }), [debouncedSearch, statusFilter, channelFilter, branchFilter]);

    async function fetchHistory() {
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getTransactions(formData);
            const raw = res?.data ?? res;
            const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            setHistory(data);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || "Không thể tải hóa đơn");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData]);

    function resetFilters() {
        setSearchTerm(""); setDebouncedSearch(""); setStatusFilter("all"); setChannelFilter("all"); setBranchFilter("all");
    }

    async function handleViewInvoice(item) {
        const transactionId = item.transactionId ?? item.id;
        if (!transactionId) {
            alert("Không tìm thấy mã giao dịch");
            return;
        }

        loadingItemRef.current = item;
        setInvoiceModal({ open: true, loading: true, error: null, blobUrl: "", contentType: "", item });

        try {
            const { blob, contentType } = await managerApi.getInvoice(transactionId);
            const blobUrl = URL.createObjectURL(blob);
            setInvoiceModal({ open: true, loading: false, error: null, blobUrl, contentType, item });
        } catch (err) {
            setInvoiceModal({
                open: true,
                loading: false,
                error: err?.message || "Không thể tải hóa đơn",
                blobUrl: "",
                contentType: "",
                item,
            });
        } finally {
            loadingItemRef.current = null;
        }
    }

    function closeInvoiceModal() {
        if (invoiceModal.blobUrl) {
            URL.revokeObjectURL(invoiceModal.blobUrl);
        }
        setInvoiceModal({ open: false, loading: false, error: null, blobUrl: "", contentType: "", item: null });
    }

    function handlePrintInvoice() {
        const iframe = document.getElementById("invoice-print-frame");
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    }

    function handleDownloadInvoice() {
        if (!invoiceModal.blobUrl) return;
        const a = document.createElement("a");
        a.href = invoiceModal.blobUrl;
        let ext = "jpg";
        if (invoiceModal.contentType?.includes("pdf")) ext = "pdf";
        else if (invoiceModal.contentType?.includes("html")) ext = "html";
        else if (invoiceModal.contentType?.includes("png")) ext = "png";
        a.download = `hoa-don-${invoiceModal.item?.transactionId ?? invoiceModal.item?.id ?? "invoice"}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function handleAdjustTransaction(item) {
        const transactionId = item.transactionId ?? item.id;
        if (!transactionId) {
            alert("Không tìm thấy mã giao dịch");
            return;
        }
        if (item.status !== "Paid") {
            alert("Chỉ có thể điều chỉnh giao dịch đang ở trạng thái Đang hiệu lực.");
            return;
        }
        setAdjustModal({ open: true, transactionId });
    }

    function openAdjustModalById(transactionId) {
        setAdjustModal({ open: true, transactionId });
    }

    function closeAdjustModal() {
        setAdjustModal({ open: false, transactionId: null });
    }

    function handleAdjustSuccess() {
        closeAdjustModal();
        fetchHistory();
        backToList();
    }

    return (
        <>
            <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }
        input:focus { border-color: #059669 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.18) !important; }
        textarea:focus { border-color: #059669 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.18) !important; }
        tbody tr td { transition: background-color 0.12s ease; }
        tr:hover td { background-color: rgba(5,150,105,0.08) !important; }
        .table-wrap { display: block; overflow-x: auto; }
        .mobile-cards { display: none; }
        .spin { animation: spin 0.8s linear infinite; }
        .invoice-btn:hover { background-color: rgba(56,189,248,0.15) !important; border-color: #0369a1 !important; transform: translateY(-1px); }
        .adjust-btn:hover { background-color: rgba(5,150,105,0.18) !important; border-color: #059669 !important; transform: translateY(-1px); }
        .detail-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .reset-btn:hover, .retry-btn:hover { background-color: #eef3f0 !important; border-color: #93a29b !important; }
        .modal-icon-btn:hover { background-color: #eef3f0 !important; }
        .custom-select-btn:not(:disabled):hover { border-color: #93a29b !important; }
        .custom-select-option:hover { background-color: #eef3f0 !important; }
        .custom-select-menu { animation: dropdown-in 0.12s ease-out; }
        .cancel-btn:hover { background-color: #eef3f0 !important; }
        .submit-btn:not(:disabled):hover { background-color: #0f766e !important; }
        .success-back-btn:hover { background-color: #0f766e !important; }
        .detail-back-btn:hover { border-color: #059669 !important; }
        .detail-edit-btn:hover { filter: brightness(1.06); }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scroll-dark::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-dark::-webkit-scrollbar-track { background: transparent; }
        .scroll-dark::-webkit-scrollbar-thumb { background-color: #c7d3ce; border-radius: 8px; }
        .scroll-dark::-webkit-scrollbar-thumb:hover { background-color: #93a29b; }
        .scroll-dark { scrollbar-width: thin; scrollbar-color: #c7d3ce transparent; }
        .app-root { height: 100vh; height: 100dvh; }
        @media (max-width: 1024px) {
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
          .filter-grid .reset-btn { grid-column: span 2; }
        }
        @media (max-width: 960px) {
          .adjust-grid { grid-template-columns: 1fr !important; }
          .detail-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .table-wrap { display: none !important; }
          .mobile-cards { display: flex !important; flex-direction: column; gap: 12px; padding: 16px; }
          .filter-grid { grid-template-columns: 1fr !important; }
          .filter-grid .reset-btn { grid-column: span 1; }
          .main-pad { padding: 16px !important; }
          .page-title-icon { width: 38px !important; height: 38px !important; }
          .page-title-h1 { font-size: 18px !important; }
          .page-desc { font-size: 12px !important; }
          .filter-panel { padding: 14px !important; }
          input, .custom-select-btn { font-size: 16px !important; }
        }
        @media (max-width: 480px) {
          .page-title { gap: 10px !important; }
          .page-title-icon { width: 34px !important; height: 34px !important; border-radius: 10px !important; }
          .page-title-h1 { font-size: 16px !important; }
        }
        @media (max-width: 640px) {
          .invoice-modal-box {
            width: 96vw !important;
            height: 92vh !important;
            max-height: 92vh !important;
          }
        }
      `}</style>

            <div className="app-root" style={S.root}>
                {view === "list" && (
                    <main className="main-pad" style={S.main}>
                        <div className="page-title" style={S.pageTitle}>
                            <div className="page-title-icon" style={S.pageTitleIcon}>
                                <History size={20} color="#fff" />
                            </div>
                            <div>
                                <h1 className="page-title-h1" style={S.h1}>Hóa đơn</h1>
                                <p className="page-desc" style={S.pageDesc}>Xem lại các giao dịch của hội viên</p>
                            </div>
                        </div>

                        <div className="filter-panel" style={S.filterPanel}>
                            <div className="filter-grid" style={S.filterGrid}>
                                <div style={S.searchWrap}>
                                    <span style={S.searchIcon}><Search size={16} /></span>
                                    <input
                                        style={S.searchInput}
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); }}
                                        placeholder="Tìm theo tên, số điện thoại hoặc mã giao dịch..."
                                    />
                                    {searchTerm && (
                                        <button style={S.clearBtn} onClick={() => setSearchTerm("")}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <CustomSelect
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    placeholder="Tất cả trạng thái"
                                    options={[
                                        { value: "all", label: "Tất cả trạng thái" },
                                        { value: "Pending", label: "Chờ thanh toán" },
                                        { value: "Paid", label: "Đã thanh toán" },
                                        { value: "Cancelled", label: "Đã hủy" },
                                    ]}
                                />

                                <CustomSelect
                                    value={channelFilter}
                                    onChange={setChannelFilter}
                                    placeholder="Tất cả kênh mua"
                                    options={[
                                        { value: "all", label: "Tất cả kênh mua" },
                                        { value: "Online", label: "Online" },
                                        { value: "Tại quầy", label: "Tại quầy" },
                                    ]}
                                />

                                <button className="reset-btn" style={S.resetBtn} onClick={resetFilters}>Đặt lại</button>
                            </div>
                        </div>

                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <p style={S.countText}>
                                    {loading ? "Đang tải..." : (
                                        <>Tìm thấy <span style={S.countBold}>{history.length}</span> giao dịch</>
                                    )}
                                </p>
                                <span style={S.legendRow}>
                                    <span style={S.legendSwatch} />
                                    Dòng tô màu = giao dịch đã bị điều chỉnh gói
                                </span>
                            </div>

                            {loading ? (
                                <div style={S.loadingState}>
                                    <div style={S.stateIconWrap(C.greenSoft)}>
                                        <Loader2 className="spin" size={22} color={C.green} />
                                    </div>
                                    <p style={S.emptyTitle}>Đang tải lịch sử đăng ký...</p>
                                </div>
                            ) : error ? (
                                <div style={S.errorState}>
                                    <div style={S.stateIconWrap("rgba(225,29,72,0.10)")}>
                                        <XCircle size={22} color="#e11d48" />
                                    </div>
                                    <p style={S.emptyTitle}>{error}</p>
                                    <button style={S.retryBtn} className="retry-btn" onClick={fetchHistory}>Thử lại</button>
                                </div>
                            ) : history.length === 0 ? (
                                <div style={S.emptyState}>
                                    <div style={S.stateIconWrap(C.bgSubtle)}>
                                        <Search size={22} color={C.textMuted} />
                                    </div>
                                    <p style={S.emptyTitle}>Không tìm thấy giao dịch phù hợp</p>
                                    <p style={S.emptyDesc}>Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng</p>
                                </div>
                            ) : (
                                <>
                                    <div className="table-wrap scroll-dark" style={S.scrollArea}>
                                        <table style={S.table}>
                                            <thead style={S.stickyHead}>
                                                <tr>
                                                    <th style={S.thAccent}></th>
                                                    <th style={S.th}>Hội viên</th>
                                                    <th style={S.th}>Gói tập</th>
                                                    <th style={S.th}>Chi nhánh</th>
                                                    <th style={S.thCenter}>Kênh mua</th>
                                                    <th style={S.thRight}>Số tiền</th>
                                                    <th style={S.th}>Trạng thái</th>
                                                    <th style={S.thCenter}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.map((item, idx) => {
                                                    const rowKey = `${item.phone}-${item.planName}-${item.startDate}-${idx}`;
                                                    const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === item;
                                                    const isAdjusted = !!item.isAdjusted;
                                                    return (
                                                        <tr key={rowKey} style={S.trAdjusted(isAdjusted)}>
                                                            <td style={S.tdAccent(isAdjusted)}></td>
                                                            <td style={S.td}>
                                                                <div style={S.memberRow}>
                                                                    <Avatar src={item.urlImg} alt={item.fullName} />
                                                                    <div>
                                                                        <p style={S.memberName}>{item.fullName}</p>
                                                                        <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={S.td}><span style={S.planName}>{item.planName || "—"}</span></td>
                                                            <td style={S.td}>
                                                                <span style={S.branchTag}><MapPin size={12} color="#93a29b" />{item.branchName || "—"}</span>
                                                            </td>
                                                            <td style={S.tdCenter}><ChannelBadge channel={item.purchaseChannel} /></td>
                                                            <td style={S.tdRight}>
                                                                <p style={S.amountMain}>{formatCurrency(item.amount)}</p>
                                                                {item.amount !== item.originalAmount && (
                                                                    <p style={S.amountOld}>{formatCurrency(item.originalAmount)}</p>
                                                                )}
                                                            </td>
                                                            <td style={S.td}>
                                                                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                                                                    <StatusBadge status={item.status} />
                                                                    {isAdjusted && <AdjustedBadge />}
                                                                </div>
                                                            </td>
                                                            <td style={S.tdCenter}>
                                                                <div style={S.actionStack}>
                                                                    <button
                                                                        type="button"
                                                                        className="detail-btn"
                                                                        style={S.detailBtn}
                                                                        onClick={() => openDetail(item)}
                                                                    >
                                                                        Chi tiết
                                                                        <ArrowRight size={13} />
                                                                    </button>
                                                                    <InvoiceButton item={item} onView={handleViewInvoice} loading={isThisLoading} />
                                                                    {item.status === "Paid" && (
                                                                        <AdjustButton item={item} onClick={handleAdjustTransaction} />
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mobile-cards scroll-dark" style={S.scrollArea}>
                                        {history.map((item, idx) => {
                                            const rowKey = `${item.phone}-${item.planName}-${item.startDate}-${idx}`;
                                            const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === item;
                                            const isAdjusted = !!item.isAdjusted;
                                            return (
                                                <div
                                                    key={rowKey}
                                                    style={{
                                                        borderRadius: 12,
                                                        border: `1.5px solid ${isAdjusted ? "rgba(180,83,9,0.35)" : "#bfe8d4"}`,
                                                        borderLeft: `4px solid ${isAdjusted ? ADJUSTED_ACCENT : "#bfe8d4"}`,
                                                        padding: 16,
                                                        backgroundColor: isAdjusted ? ADJUSTED_ROW_BG : "#ffffff",
                                                        boxShadow: "0 1px 2px rgba(15,36,25,0.04), 0 10px 22px -10px rgba(5,150,105,0.22)",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                                        <div style={S.memberRow}>
                                                            <Avatar src={item.urlImg} alt={item.fullName} />
                                                            <div>
                                                                <p style={S.memberName}>{item.fullName}</p>
                                                                <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                                                            <StatusBadge status={item.status} />
                                                            {isAdjusted && <AdjustedBadge />}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
                                                        <span style={{ color: "#0f2419" }}>{item.planName}</span>
                                                        <ChannelBadge channel={item.purchaseChannel} />
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                                        <span style={S.branchTag}><MapPin size={12} color="#93a29b" />{item.branchName || "—"}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#5b6b64" }}>
                                                        <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f2419" }}>{formatCurrency(item.amount)}</span>
                                                    </div>
                                                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                                                        <button type="button" className="detail-btn" style={S.detailBtn} onClick={() => openDetail(item)}>
                                                            Chi tiết
                                                            <ArrowRight size={13} />
                                                        </button>
                                                        <InvoiceButton item={item} onView={handleViewInvoice} loading={isThisLoading} />
                                                        {item.status === "Paid" && (
                                                            <AdjustButton item={item} onClick={handleAdjustTransaction} />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </main>
                )}

                {view === "detail" && selectedItem && (
                    <TransactionDetailPage
                        transactionId={selectedItem.transactionId ?? selectedItem.id}
                        fallbackItem={selectedItem}
                        onBack={backToList}
                        onEdit={openAdjustModalById}
                    />
                )}
            </div>

            <InvoiceModal
                state={invoiceModal}
                onClose={closeInvoiceModal}
                onPrint={handlePrintInvoice}
                onDownload={handleDownloadInvoice}
            />

            {adjustModal.open && (
                <AdjustModal
                    transactionId={adjustModal.transactionId}
                    onClose={closeAdjustModal}
                    onSuccess={handleAdjustSuccess}
                />
            )}
        </>
    );
}