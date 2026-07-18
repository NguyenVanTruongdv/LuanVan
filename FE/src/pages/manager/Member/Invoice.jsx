import {
    AlertTriangle,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Download,
    FileText,
    Gift,
    Globe,
    History,
    Hourglass,
    Loader2,
    MapPin,
    Package,
    PencilLine,
    Phone,
    Printer,
    Search,
    Sparkles,
    Store,
    User,
    Wallet,
    X,
    XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import authApi from "../../../api/AuthApi";
import managerApi from "../../../api/managerApi";

const STATUS_CONFIG = {
    Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "rgba(180,83,9,0.16)", color: "#fbbf24" },
    Paid: { label: "Đã thanh toán", icon: CheckCircle2, bg: "rgba(4,120,87,0.16)", color: "#34d399" },
    Cancelled: { label: "Đã hủy", icon: XCircle, bg: "rgba(190,18,60,0.16)", color: "#fb7185" },
};

const CHANNEL_CONFIG = {
    "Online": { label: "Online", icon: Globe, bg: "rgba(3,105,161,0.16)", color: "#38bdf8" },
    "Tại quầy": { label: "Tại quầy", icon: Store, bg: "rgba(4,120,87,0.16)", color: "#34d399" },
};

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

const S = {
    root: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#0b1220", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    main: { flex: 1, overflow: "visible", padding: "24px 32px", display: "flex", flexDirection: "column", minHeight: 0 },

    pageTitle: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
    pageTitleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    h1: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 },
    pageDesc: { fontSize: 13, color: "#94a3b8", margin: 0 },

    branchStrip: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" },
    branchChip: (active) => ({
        display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10,
        border: `1px solid ${active ? "#0d9488" : "#1e293b"}`,
        backgroundColor: active ? "rgba(13,148,136,0.14)" : "#111827",
        padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
        color: active ? "#5eead4" : "#94a3b8", cursor: "pointer", whiteSpace: "nowrap",
    }),
    branchChipIcon: (active) => ({ display: "flex", color: active ? "#2dd4bf" : "#475569" }),

    filterPanel: { marginBottom: 20, borderRadius: 16, border: "1px solid #1e293b", backgroundColor: "#111827", padding: 20, flexShrink: 0 },
    filterGrid: { display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12 },
    searchWrap: { position: "relative" },
    searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" },
    searchInput: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "10px 36px 10px 36px", fontSize: 13, color: "#e2e8f0", outline: "none" },
    clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 2 },

    customSelectWrap: { position: "relative" },
    customSelectBtn: (open, disabled) => ({
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        borderRadius: 8, border: `1px solid ${open ? "#0d9488" : "#1e293b"}`, backgroundColor: disabled ? "#0d131f" : "#0b1220",
        padding: "10px 12px", fontSize: 13, color: disabled ? "#475569" : "#e2e8f0", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        boxShadow: open ? "0 0 0 3px rgba(13,148,136,0.18)" : "none",
    }),
    customSelectBtnLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    customSelectChevron: (open) => ({ display: "flex", flexShrink: 0, color: "#64748b", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }),
    customSelectMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 180, zIndex: 60, borderRadius: 10, border: "1px solid #1e293b", backgroundColor: "#111827", boxShadow: "0 16px 32px rgba(0,0,0,0.45)", padding: 6, maxHeight: 260, overflowY: "auto" },
    customSelectOption: (active) => ({
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer",
        color: active ? "#5eead4" : "#cbd5e1",
        backgroundColor: active ? "rgba(13,148,136,0.14)" : "transparent",
    }),
    resetBtn: { borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#94a3b8", cursor: "pointer" },

    card: { borderRadius: 16, border: "1px solid #1e293b", backgroundColor: "#111827", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
    cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", padding: "14px 20px", flexShrink: 0 },
    countText: { fontSize: 13, color: "#94a3b8" },
    countBold: { fontWeight: 600, color: "#f1f5f9" },

    table: { width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" },
    th: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", borderBottom: "1px solid #1e293b", textTransform: "uppercase", whiteSpace: "nowrap", backgroundColor: "#111827" },
    thRight: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", borderBottom: "1px solid #1e293b", textAlign: "right", textTransform: "uppercase", backgroundColor: "#111827" },
    thCenter: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", borderBottom: "1px solid #1e293b", textAlign: "center", textTransform: "uppercase", backgroundColor: "#111827" },
    td: { padding: "14px 20px", borderBottom: "1px solid #1e293b", verticalAlign: "middle" },
    tdRight: { padding: "14px 20px", borderBottom: "1px solid #1e293b", textAlign: "right", verticalAlign: "middle" },
    tdCenter: { padding: "14px 20px", borderBottom: "1px solid #1e293b", textAlign: "center", verticalAlign: "middle" },
    memberRow: { display: "flex", alignItems: "center", gap: 10 },
    avatarImg: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #1e293b" },
    avatarFallback: { width: 36, height: 36, borderRadius: "50%", backgroundColor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#64748b" },
    memberName: { fontWeight: 600, color: "#f1f5f9", fontSize: 13 },
    memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b", marginTop: 2 },
    planName: { color: "#cbd5e1" },
    branchTag: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8" },
    dateRange: { color: "#94a3b8", whiteSpace: "nowrap" },
    amountMain: { fontWeight: 600, color: "#f1f5f9" },
    amountOld: { fontSize: 11, color: "#64748b", textDecoration: "line-through" },

    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600, backgroundColor: bg, color }),

    invoiceBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "#38bdf8", cursor: "pointer", whiteSpace: "nowrap" },
    invoiceBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    adjustBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "#5eead4", cursor: "pointer", whiteSpace: "nowrap" },
    actionStack: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },

    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    emptyTitle: { fontSize: 13, fontWeight: 500, color: "#cbd5e1" },
    emptyDesc: { fontSize: 11, color: "#64748b" },

    loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" },
    errorState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    retryBtn: { marginTop: 8, borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#94a3b8", cursor: "pointer" },

    scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
    stickyHead: { position: "sticky", top: 0, zIndex: 1 },

    modalBackdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(2,6,16,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "4vh 4vw" },
    modalBox: {
        width: "clamp(320px, 60vw, 760px)",
        height: "clamp(420px, 85vh, 900px)",
        backgroundColor: "#111827",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #1e293b",
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #1e293b", flexShrink: 0 },
    modalTitle: { fontSize: 14, fontWeight: 600, color: "#f1f5f9", margin: 0 },
    modalHeaderActions: { display: "flex", alignItems: "center", gap: 8 },
    modalIconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "6px 10px", fontSize: 12, fontWeight: 500, color: "#94a3b8", cursor: "pointer" },
    modalBody: { flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: "#fff" },
    invoiceFrame: { width: "100%", height: "100%", border: "none", display: "block", backgroundColor: "#fff" },
    invoiceImgWrap: { width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", backgroundColor: "#f1f5f9" },
    invoiceImg: { maxWidth: "100%", display: "block" },

    adjustModalBox: {
        width: "clamp(320px, 90vw, 980px)",
        maxHeight: "90vh",
        backgroundColor: "#111827",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #1e293b",
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    },
    adjustModalBody: { flex: 1, minHeight: 0, overflowY: "auto", padding: 20 },
    adjustGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20, alignItems: "start" },
    innerCard: { borderRadius: 14, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: 18 },
    innerCardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: "0.04em" },

    infoList: { display: "flex", flexDirection: "column", gap: 12 },
    infoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 },
    infoLabel: { color: "#64748b" },
    infoLabelWithHint: { display: "flex", flexDirection: "column", gap: 2 },
    infoSubHint: { fontSize: 10.5, color: "#475569" },
    infoValue: { color: "#e2e8f0", fontWeight: 500, textAlign: "right" },
    infoValueHighlight: { color: "#5eead4", fontWeight: 700, textAlign: "right" },

    priceBlock: { marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e293b" },
    priceRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
    priceLabel: { fontSize: 12, color: "#64748b" },
    priceOld: { fontSize: 12, color: "#64748b", textDecoration: "line-through" },
    priceMain: { fontSize: 20, fontWeight: 700, color: "#f1f5f9" },

    formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 },
    label: { fontSize: 12.5, fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 },
    labelRequired: { color: "#fb7185" },
    hint: { fontSize: 11.5, color: "#64748b" },

    textarea: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "10px 12px", fontSize: 13, color: "#e2e8f0", outline: "none", resize: "vertical", minHeight: 90, fontFamily: "inherit" },
    charCount: { alignSelf: "flex-end", fontSize: 11, color: "#475569" },

    applicablePromoBox: { borderRadius: 10, border: "1px solid #1e293b", backgroundColor: "#111827", padding: "10px 12px", marginTop: 8 },
    applicablePromoTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 },
    applicablePromoList: { display: "flex", flexDirection: "column", gap: 6 },
    applicablePromoItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 },
    applicablePromoName: { color: "#e2e8f0", fontWeight: 500 },
    applicablePromoDesc: { color: "#5eead4", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" },
    applicablePromoEmpty: { fontSize: 12, color: "#475569" },
    applicablePromoLoadingRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" },

    previewBox: { borderRadius: 12, border: "1px dashed #1e293b", backgroundColor: "#111827", padding: 16, marginBottom: 20 },
    previewTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 },
    previewRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 6 },
    previewArrow: { color: "#475569", margin: "0 6px" },
    previewNewValue: { color: "#5eead4", fontWeight: 700 },
    previewNote: { fontSize: 11.5, color: "#64748b", marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" },
    previewPromoBadge: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600, backgroundColor: "rgba(13,148,136,0.16)", color: "#5eead4" },
    previewLoadingRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" },
    previewCalcBaseRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, marginBottom: 6, padding: "6px 8px", borderRadius: 8, backgroundColor: "rgba(94,234,212,0.06)" },

    adjustActionsRow: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
    cancelBtn: { borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#94a3b8", cursor: "pointer" },
    submitBtn: (disabled) => ({
        display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, border: "none",
        backgroundColor: disabled ? "#134e4a" : "#0d9488", padding: "10px 20px", fontSize: 13, fontWeight: 700,
        color: disabled ? "#5f7d7a" : "#ecfeff", cursor: disabled ? "not-allowed" : "pointer",
    }),

    banner: (kind) => ({
        display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 18,
        backgroundColor: kind === "error" ? "rgba(190,18,60,0.12)" : "rgba(4,120,87,0.12)",
        border: `1px solid ${kind === "error" ? "rgba(190,18,60,0.35)" : "rgba(4,120,87,0.35)"}`,
        color: kind === "error" ? "#fda4af" : "#6ee7b7",
    }),

    successWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 4px 4px" },
    successIconWrap: { width: 60, height: 60, borderRadius: "50%", backgroundColor: "rgba(4,120,87,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    successTitle: { fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px 0" },
    successDesc: { fontSize: 13, color: "#94a3b8", margin: "0 0 20px 0" },
    successInfoList: { width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 18px", textAlign: "left" },
    successBackBtn: { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, border: "none", backgroundColor: "#0d9488", padding: "11px 22px", fontSize: 13.5, fontWeight: 700, color: "#ecfeff", cursor: "pointer", marginTop: 22 },
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
                        <div style={{ padding: "10px 10px", fontSize: 12.5, color: "#475569" }}>Không có dữ liệu</div>
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
                            <Loader2 className="spin" size={28} color="#94a3b8" />
                            <p style={S.emptyTitle}>Đang tải hóa đơn...</p>
                        </div>
                    ) : state.error ? (
                        <div style={S.errorState}>
                            <XCircle size={28} color="#f43f5e" />
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
                            <XCircle size={28} color="#f43f5e" />
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
                <CheckCircle2 size={32} color="#34d399" />
            </div>
            <h2 style={S.successTitle}>Điều chỉnh thành công</h2>
            <p style={S.successDesc}>
                Giao dịch {data?.orderCode ? <strong style={{ color: "#e2e8f0" }}>#{data.orderCode}</strong> : ""} đã được cập nhật sang gói mới.
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
                    <span style={{ ...S.infoValue, color: "#5eead4" }}>{data?.newPlanName || "—"}</span>
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
            const data = res?.data ?? res;
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

    // ---- Số điện thoại: BE trả ra dưới nhiều tên field tuỳ endpoint cũ/mới,
    // nên đọc theo thứ tự ưu tiên để tránh trường hợp field không khớp gây mất SĐT. ----
    const transactionPhone =
        transaction?.phoneNumber ??
        transaction?.phone ??
        transaction?.sdt ??
        transaction?.soDienThoai ??
        transaction?.member?.phoneNumber ??
        transaction?.member?.phone ??
        null;

    // ---- [MỚI] Ngày bắt đầu gói (MemberPackage.StartDate) — ĐÂY mới là mốc gốc thật sự dùng để
    // cộng ra "Ngày hết hạn mới", KHÔNG PHẢI "Ngày tạo giao dịch" (CreatedAt) hiển thị ở dưới.
    // Hai mốc này có thể khác nhau (gói gia hạn nối tiếp gói cũ, gói kích hoạt trễ...), nên phải
    // đọc + hiển thị tách riêng để tránh nhân viên hiểu nhầm là hệ thống tính sai ngày hết hạn.
    // Đọc theo nhiều tên field phòng trường hợp BE trả tên khác nhau tuỳ version endpoint.
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
                // [MỚI] Ưu tiên StartDate/ExpiryDate mà API adjust-plan vừa LƯU THẬT trả về (đáng
                // tin cậy nhất vì là số đã ghi xuống DB), chỉ fallback về số liệu Preview trước đó
                // nếu vì lý do gì đó BE chưa trả field này.
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
                            <Loader2 className="spin" size={28} color="#94a3b8" />
                            <p style={S.emptyTitle}>Đang tải thông tin giao dịch...</p>
                        </div>
                    ) : detailError ? (
                        <div style={S.errorState}>
                            <XCircle size={28} color="#f43f5e" />
                            <p style={S.emptyTitle}>{detailError}</p>
                            <button style={S.retryBtn} onClick={loadDetail}>Thử lại</button>
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

                                <div style={{ ...S.memberRow, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1e293b" }}>
                                    <Avatar src={transaction.urlImg} alt={transaction.memberName || transaction.fullName} size={44} />
                                    <div>
                                        <p style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 14, margin: 0 }}>{transaction.memberName || transaction.fullName || "—"}</p>
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
                                                    <MapPin size={12} color="#475569" />{transaction.branchName}
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

                                    {/* [MỚI] Tách riêng "Ngày tạo" (thời điểm lập giao dịch/hóa đơn) và
                                        "Ngày bắt đầu gói" (mốc THẬT SỰ dùng để tính ngày hết hạn mới ở
                                        khung Preview bên phải). Hai giá trị này thường trùng nhau, nhưng
                                        với gói gia hạn nối tiếp hoặc gói kích hoạt trễ thì sẽ khác nhau —
                                        hiển thị rõ ràng để tránh hiểu lầm là hệ thống tính sai. */}
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
                                        <span style={{ ...S.infoValue }}>{formatCurrency(transaction.giaGoc)}</span>
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
                                                            <span style={{ color: "#5eead4", fontWeight: 700 }}>{formatDateOnly(preview.startDate)}</span>
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
                                                            <span style={S.priceOld}>{formatCurrency(transaction.giaGoc)}</span>
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

export default function Invoice() {
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

    function closeAdjustModal() {
        setAdjustModal({ open: false, transactionId: null });
    }

    function handleAdjustSuccess() {
        closeAdjustModal();
        fetchHistory();
    }

    return (
        <>
            <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }
        input:focus { border-color: #0d9488 !important; background: #0b1220 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.18) !important; }
        textarea:focus { border-color: #0d9488 !important; background: #0b1220 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.18) !important; }
        tr:hover td { background-color: rgba(30,41,59,0.55) !important; }
        .table-wrap { display: block; overflow-x: auto; }
        .mobile-cards { display: none; }
        .spin { animation: spin 0.8s linear infinite; }
        .invoice-btn:hover { background-color: rgba(56,189,248,0.1) !important; border-color: #0369a1 !important; }
        .adjust-btn:hover { background-color: rgba(13,148,136,0.1) !important; border-color: #0d9488 !important; }
        .reset-btn:hover { background-color: #1e293b !important; }
        .branch-chip:hover { border-color: #0d9488 !important; }
        .modal-icon-btn:hover { background-color: #1e293b !important; }
        .custom-select-btn:not(:disabled):hover { border-color: #334155 !important; }
        .custom-select-option:hover { background-color: #1e293b !important; }
        .custom-select-menu { animation: dropdown-in 0.12s ease-out; }
        .cancel-btn:hover { background-color: #1e293b !important; }
        .submit-btn:not(:disabled):hover { background-color: #0f766e !important; }
        .success-back-btn:hover { background-color: #0f766e !important; }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scroll-dark::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-dark::-webkit-scrollbar-track { background: transparent; }
        .scroll-dark::-webkit-scrollbar-thumb { background-color: #1e293b; border-radius: 8px; }
        .scroll-dark::-webkit-scrollbar-thumb:hover { background-color: #334155; }
        .scroll-dark { scrollbar-width: thin; scrollbar-color: #1e293b transparent; }
        .app-root { height: 100vh; height: 100dvh; }
        @media (max-width: 1024px) {
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
          .filter-grid .reset-btn { grid-column: span 2; }
        }
        @media (max-width: 960px) {
          .adjust-grid { grid-template-columns: 1fr !important; }
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
          .branch-strip { flex-wrap: nowrap !important; overflow-x: auto !important; padding-bottom: 4px; }
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

                    {!branchesLoading && branches.length > 0 && (
                        <div className="branch-strip scroll-dark" style={S.branchStrip}>
                            <button
                                className="branch-chip"
                                style={S.branchChip(branchFilter === "all")}
                                onClick={() => setBranchFilter("all")}
                            >
                                <span style={S.branchChipIcon(branchFilter === "all")}><Building2 size={14} /></span>
                                Tất cả chi nhánh
                            </button>
                            {branches.map((b) => (
                                <button
                                    key={b.branchId}
                                    className="branch-chip"
                                    style={S.branchChip(String(branchFilter) === String(b.branchId))}
                                    onClick={() => setBranchFilter(b.branchId)}
                                >
                                    <span style={S.branchChipIcon(String(branchFilter) === String(b.branchId))}><MapPin size={14} /></span>
                                    {b.branchName}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="filter-panel" style={S.filterPanel}>
                        <div className="filter-grid" style={S.filterGrid}>
                            <div style={S.searchWrap}>
                                <span style={S.searchIcon}><Search size={16} /></span>
                                <input
                                    style={S.searchInput}
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); }}
                                    placeholder="Tìm theo tên hội viên hoặc số điện thoại..."
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

                            <CustomSelect
                                value={branchFilter}
                                onChange={setBranchFilter}
                                placeholder="Tất cả chi nhánh"
                                options={[
                                    { value: "all", label: "Tất cả chi nhánh" },
                                    ...branches.map((b) => ({ value: b.branchId, label: b.branchName })),
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
                        </div>

                        {loading ? (
                            <div style={S.loadingState}>
                                <Loader2 className="spin" size={28} color="#94a3b8" />
                                <p style={S.emptyTitle}>Đang tải lịch sử đăng ký...</p>
                            </div>
                        ) : error ? (
                            <div style={S.errorState}>
                                <XCircle size={28} color="#f43f5e" />
                                <p style={S.emptyTitle}>{error}</p>
                                <button style={S.retryBtn} onClick={fetchHistory}>Thử lại</button>
                            </div>
                        ) : history.length === 0 ? (
                            <div style={S.emptyState}>
                                <Search size={28} color="#334155" />
                                <p style={S.emptyTitle}>Không tìm thấy giao dịch phù hợp</p>
                                <p style={S.emptyDesc}>Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-wrap scroll-dark" style={S.scrollArea}>
                                    <table style={S.table}>
                                        <thead style={S.stickyHead}>
                                            <tr>
                                                <th style={S.th}>Hội viên</th>
                                                <th style={S.th}>Mã giao dịch</th>
                                                <th style={S.th}>Gói tập</th>
                                                <th style={S.th}>Chi nhánh</th>
                                                <th style={S.th}>Kênh mua</th>

                                                <th style={S.thRight}>Số tiền</th>
                                                <th style={S.th}>Trạng thái</th>
                                                <th style={S.thCenter}>Hóa đơn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((item, idx) => {
                                                const rowKey = `${item.phone}-${item.planName}-${item.startDate}-${idx}`;
                                                const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === item;
                                                return (
                                                    <tr key={rowKey}>
                                                        <td style={S.td}>
                                                            <div style={S.memberRow}>
                                                                <Avatar src={item.urlImg} alt={item.fullName} />
                                                                <div>
                                                                    <p style={S.memberName}>{item.fullName}</p>
                                                                    <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{item.orderCode}</td>
                                                        <td style={S.td}><span style={S.planName}>{item.planName}</span></td>
                                                        <td style={S.td}>
                                                            <span style={S.branchTag}>
                                                                <MapPin size={12} color="#475569" />
                                                                {item.branchName || "—"}
                                                            </span>
                                                        </td>
                                                        <td style={S.td}><ChannelBadge channel={item.purchaseChannel} /></td>

                                                        <td style={S.tdRight}>
                                                            <p style={S.amountMain}>{formatCurrency(item.amount)}</p>
                                                            {item.amount !== item.originalAmount && (
                                                                <p style={S.amountOld}>{formatCurrency(item.originalAmount)}</p>
                                                            )}
                                                        </td>
                                                        <td style={S.td}><StatusBadge status={item.status} /></td>
                                                        <td style={S.tdCenter}>
                                                            <div style={S.actionStack}>
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
                                        return (
                                            <div key={rowKey} style={{ borderRadius: 12, border: "1px solid #1e293b", padding: 16, backgroundColor: "#0b1220" }}>
                                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                                    <div style={S.memberRow}>
                                                        <Avatar src={item.urlImg} alt={item.fullName} />
                                                        <div>
                                                            <p style={S.memberName}>{item.fullName}</p>
                                                            <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={item.status} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
                                                    <span style={{ color: "#cbd5e1" }}>{item.planName}</span>
                                                    <ChannelBadge channel={item.purchaseChannel} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                                    <span style={S.branchTag}><MapPin size={12} color="#475569" />{item.branchName || "—"}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#64748b" }}>
                                                    <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{formatCurrency(item.amount)}</span>
                                                </div>
                                                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
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