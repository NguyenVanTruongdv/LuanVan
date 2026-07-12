import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Gift,
    Globe,
    Hourglass,
    Loader2,
    MapPin,
    Package,
    PencilLine,
    Phone,
    Store,
    User,
    Wallet,
    XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import managerApi from "../../../../api/ManagerApi";

// ---------------------------------------------------------------------------
// NOTE VỀ API — đối chiếu với ManagerApi.js:
//   1. managerApi.getTransactionDetail(id)              -> GET  /api/transactions/{id}
//      Luôn gọi khi vào trang (không dùng lại state từ trang trước) để đảm bảo
//      dữ liệu mới nhất trước khi cho sửa.
//   2. managerApi.getPlans()                             -> GET  /api/plans
//   3. managerApi.previewAdjustTransactionPlan(id, newPlanId)
//      -> GET  /api/transactions/{id}/adjust-plan-preview?newPlanId=X
//      BE tự tra + tính khuyến mãi hiệu lực TẠI THỜI ĐIỂM giao dịch gốc được tạo,
//      KHÔNG lưu DB. FE gọi mỗi khi nhân viên đổi gói mới để hiển thị xem trước.
//   4. managerApi.adjustTransactionPlan(id, payload)     -> PUT  /api/transactions/{id}/adjust-plan
//      payload: { newPlanId, reason } — KHÔNG còn newPromotionId, BE tự áp KM.
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
    Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "rgba(180,83,9,0.16)", color: "#fbbf24" },
    Paid: { label: "Đang hiệu lực", icon: CheckCircle2, bg: "rgba(4,120,87,0.16)", color: "#34d399" },
    Expired: { label: "Hết hạn", icon: Clock, bg: "rgba(100,116,139,0.16)", color: "#94a3b8" },
    Cancelled: { label: "Đã hủy", icon: XCircle, bg: "rgba(190,18,60,0.16)", color: "#fb7185" },
};

const CHANNEL_CONFIG = {
    "Online": { label: "Online", icon: Globe, bg: "rgba(3,105,161,0.16)", color: "#38bdf8" },
    "Tại quầy": { label: "Tại quầy", icon: Store, bg: "rgba(4,120,87,0.16)", color: "#34d399" },
};

function formatCurrency(v) {
    const n = Number(v) || 0;
    return n.toLocaleString("vi-VN") + "đ";
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
    // BE trả DateOnly dạng "2026-08-12" — parse thủ công để tránh lệch múi giờ
    const parts = String(d).split("-");
    if (parts.length !== 3) return d;
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
}

// ---------------------------------------------------------------------------
// Styles — đồng bộ tông tối với các trang quản lý khác (nền navy, viền slate,
// điểm nhấn teal/emerald)
// ---------------------------------------------------------------------------
const S = {
    root: { display: "flex", flexDirection: "column", backgroundColor: "#0b1220", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", minHeight: "100vh" },
    main: { flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1180, width: "100%", margin: "0 auto", boxSizing: "border-box" },

    topRow: { display: "flex", alignItems: "center", gap: 14 },
    backBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, border: "1px solid #1e293b", backgroundColor: "#111827", color: "#94a3b8", cursor: "pointer", flexShrink: 0 },
    pageTitleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    h1: { fontSize: 21, fontWeight: 700, color: "#f1f5f9", margin: 0 },
    pageDesc: { fontSize: 13, color: "#94a3b8", margin: 0 },

    grid: { display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 20, alignItems: "start" },

    card: { borderRadius: 16, border: "1px solid #1e293b", backgroundColor: "#111827", padding: 20 },
    cardTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: "0.04em" },

    memberRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1e293b" },
    avatarImg: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #1e293b" },
    avatarFallback: { width: 44, height: 44, borderRadius: "50%", backgroundColor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#64748b" },
    memberName: { fontWeight: 600, color: "#f1f5f9", fontSize: 14, margin: 0 },
    memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b", marginTop: 2 },

    infoList: { display: "flex", flexDirection: "column", gap: 12 },
    infoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 },
    infoLabel: { color: "#64748b" },
    infoValue: { color: "#e2e8f0", fontWeight: 500, textAlign: "right" },

    priceBlock: { marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e293b" },
    priceRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
    priceLabel: { fontSize: 12, color: "#64748b" },
    priceOld: { fontSize: 12, color: "#64748b", textDecoration: "line-through" },
    priceMain: { fontSize: 20, fontWeight: 700, color: "#f1f5f9" },

    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600, backgroundColor: bg, color }),

    formGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 },
    label: { fontSize: 12.5, fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 },
    labelRequired: { color: "#fb7185" },
    hint: { fontSize: 11.5, color: "#64748b" },

    textarea: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "10px 12px", fontSize: 13, color: "#e2e8f0", outline: "none", resize: "vertical", minHeight: 90, fontFamily: "inherit" },
    charCount: { alignSelf: "flex-end", fontSize: 11, color: "#475569" },

    customSelectWrap: { position: "relative" },
    customSelectBtn: (open, disabled) => ({
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        borderRadius: 8, border: `1px solid ${open ? "#0d9488" : "#1e293b"}`, backgroundColor: disabled ? "#0d131f" : "#0b1220",
        padding: "10px 12px", fontSize: 13, color: disabled ? "#475569" : "#e2e8f0", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        boxShadow: open ? "0 0 0 3px rgba(13,148,136,0.18)" : "none",
    }),
    customSelectBtnLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    customSelectChevron: (open) => ({ display: "flex", flexShrink: 0, color: "#64748b", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }),
    customSelectMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 200, zIndex: 30, borderRadius: 10, border: "1px solid #1e293b", backgroundColor: "#111827", boxShadow: "0 16px 32px rgba(0,0,0,0.45)", padding: 6, maxHeight: 260, overflowY: "auto" },
    customSelectOption: (active) => ({
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer",
        color: active ? "#5eead4" : "#cbd5e1",
        backgroundColor: active ? "rgba(13,148,136,0.14)" : "transparent",
    }),

    previewBox: { borderRadius: 12, border: "1px dashed #1e293b", backgroundColor: "#0b1220", padding: 16, marginBottom: 20 },
    previewTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 },
    previewRow: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 6 },
    previewArrow: { color: "#475569", margin: "0 6px" },
    previewNewValue: { color: "#5eead4", fontWeight: 700 },
    previewNote: { fontSize: 11.5, color: "#64748b", marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" },
    previewPromoBadge: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600, backgroundColor: "rgba(13,148,136,0.16)", color: "#5eead4" },
    previewLoadingRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" },

    actionsRow: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
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

    loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" },
    errorState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    emptyTitle: { fontSize: 13, fontWeight: 500, color: "#cbd5e1" },
    retryBtn: { marginTop: 8, borderRadius: 8, border: "1px solid #1e293b", backgroundColor: "#0b1220", padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#94a3b8", cursor: "pointer" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
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

function Avatar({ src, alt }) {
    const [errored, setErrored] = useState(false);
    if (!src || errored) {
        return (
            <span style={S.avatarFallback}>
                <User size={20} />
            </span>
        );
    }
    return <img src={src} alt={alt || "avatar"} style={S.avatarImg} onError={() => setErrored(true)} />;
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdjustTransactionPlan() {
    const { id } = useParams();
    const navigate = useNavigate();

    // ---- Chi tiết giao dịch — LUÔN gọi API khi vào trang, không dùng lại state cũ ----
    const [transaction, setTransaction] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState(null);

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [reason, setReason] = useState("");

    // ---- Xem trước kết quả điều chỉnh (BE tự tính giá + khuyến mãi) ----
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(null);

    async function loadDetail() {
        setLoadingDetail(true);
        setDetailError(null);
        try {
            const res = await managerApi.getTransactionDetail(id);
            const data = res?.data ?? res;
            setTransaction(data);
            setSelectedPlanId(data?.planId ?? "");
        } catch (err) {
            setDetailError(err?.response?.data?.message || err?.message || "Không thể tải thông tin giao dịch");
        } finally {
            setLoadingDetail(false);
        }
    }

    // ---- Nạp chi tiết giao dịch — bắt buộc gọi lại API mỗi lần vào trang ----
    useEffect(() => {
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ---- Nạp danh sách gói tập để chọn ----
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

    const planOptions = useMemo(() => plans.map((p) => ({
        value: p.planId,
        label: `${p.planName}${transaction && String(p.planId) === String(transaction.planId) ? " (đang dùng)" : ""} — ${formatCurrency(p.price)}`,
    })), [plans, transaction]);

    const hasChanges = !!transaction && String(selectedPlanId) !== String(transaction.planId ?? "");

    // ---- Gọi preview mỗi khi nhân viên đổi gói mới (debounce nhẹ) ----
    useEffect(() => {
        if (!transaction || !selectedPlanId) {
            setPreview(null);
            setPreviewError(null);
            return;
        }
        if (!hasChanges) {
            // Chưa đổi gói -> không cần xem trước
            setPreview(null);
            setPreviewError(null);
            return;
        }

        let cancelled = false;
        setPreviewLoading(true);
        setPreviewError(null);

        const timer = setTimeout(async () => {
            try {
                const res = await managerApi.previewAdjustTransactionPlan(id, selectedPlanId);
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
    }, [selectedPlanId, transaction, id]);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

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
            const res = await managerApi.adjustTransactionPlan(id, payload);
            const data = res?.data ?? res;

            setTransaction((prev) => ({
                ...prev,
                planId: data.planId,
                planName: data.planName,
                giaGoc: data.giaGoc,
                amount: data.amount,
                promotionId: data.promotionId,
                updatedAt: data.updatedAt,
            }));
            setSubmitSuccess("Đã cập nhật gói cho giao dịch thành công.");
            setReason("");
            setPreview(null);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            if (status === 404) setSubmitError(msg || "Không tìm thấy giao dịch này.");
            else if (status === 403) setSubmitError(msg || "Bạn không có quyền điều chỉnh giao dịch này.");
            else if (status === 400) setSubmitError(msg || "Yêu cầu không hợp lệ, vui lòng kiểm tra lại lựa chọn.");
            else setSubmitError(msg || err?.message || "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        textarea:focus { border-color: #0d9488 !important; background: #0b1220 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.18) !important; }
        .back-btn:hover { border-color: #0d9488 !important; color: #5eead4 !important; }
        .cancel-btn:hover { background-color: #1e293b !important; }
        .submit-btn:not(:disabled):hover { background-color: #0f766e !important; }
        .custom-select-btn:not(:disabled):hover { border-color: #334155 !important; }
        .custom-select-option:hover { background-color: #1e293b !important; }
        .custom-select-menu { animation: dropdown-in 0.12s ease-out; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .scroll-dark::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-dark::-webkit-scrollbar-track { background: transparent; }
        .scroll-dark::-webkit-scrollbar-thumb { background-color: #1e293b; border-radius: 8px; }
        .scroll-dark::-webkit-scrollbar-thumb:hover { background-color: #334155; }
        .scroll-dark { scrollbar-width: thin; scrollbar-color: #1e293b transparent; }

        @media (max-width: 960px) {
          .adjust-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .adjust-main { padding: 16px !important; }
          .adjust-card { padding: 16px !important; }
          .adjust-actions { flex-direction: column-reverse !important; }
          .adjust-actions button { width: 100% !important; justify-content: center !important; }
          textarea, .custom-select-btn { font-size: 16px !important; } /* tránh iOS tự zoom khi focus */
        }
      `}</style>

            <div style={S.root}>
                <main className="adjust-main" style={S.main}>
                    <div style={S.topRow}>
                        <button className="back-btn" style={S.backBtn} onClick={() => navigate(-1)} aria-label="Quay lại">
                            <ArrowLeft size={16} />
                        </button>
                        <div style={S.pageTitleIcon}>
                            <PencilLine size={20} color="#fff" />
                        </div>
                        <div>
                            <h1 style={S.h1}>Điều chỉnh gói hóa đơn</h1>
                            <p style={S.pageDesc}>Đổi gói tập cho một giao dịch đã tạo — khuyến mãi (nếu có) sẽ được hệ thống tự động áp dụng</p>
                        </div>
                    </div>

                    {loadingDetail ? (
                        <div className="adjust-card" style={S.card}>
                            <div style={S.loadingState}>
                                <Loader2 className="spin" size={28} color="#94a3b8" />
                                <p style={S.emptyTitle}>Đang tải thông tin giao dịch...</p>
                            </div>
                        </div>
                    ) : detailError ? (
                        <div className="adjust-card" style={S.card}>
                            <div style={S.errorState}>
                                <XCircle size={28} color="#f43f5e" />
                                <p style={S.emptyTitle}>{detailError}</p>
                                <button style={S.retryBtn} onClick={loadDetail}>Thử lại</button>
                            </div>
                        </div>
                    ) : !transaction ? (
                        <div className="adjust-card" style={S.card}>
                            <div style={S.errorState}>
                                <AlertTriangle size={28} color="#fbbf24" />
                                <p style={S.emptyTitle}>Không tìm thấy dữ liệu giao dịch</p>
                            </div>
                        </div>
                    ) : (
                        <div className="adjust-grid" style={S.grid}>
                            {/* ---- Cột trái: thông tin giao dịch hiện tại ---- */}
                            <div className="adjust-card" style={S.card}>
                                <p style={S.cardTitle}>Giao dịch hiện tại</p>

                                <div style={S.memberRow}>
                                    <Avatar src={transaction.urlImg} alt={transaction.memberName || transaction.fullName} />
                                    <div>
                                        <p style={S.memberName}>{transaction.memberName || transaction.fullName || "—"}</p>
                                        <p style={S.memberPhone}><Phone size={11} />{transaction.phone || "—"}</p>
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
                                        <StatusBadge status={transaction.paymentStatus || transaction.status} />
                                    </div>
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabel}>Gói hiện tại</span>
                                        <span style={S.infoValue}>{transaction.planName || "—"}</span>
                                    </div>
                                    <div style={S.infoRow}>
                                        <span style={S.infoLabel}>Ngày tạo</span>
                                        <span style={S.infoValue}>{formatDateTime(transaction.createdAt)}</span>
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

                            {/* ---- Cột phải: form điều chỉnh ---- */}
                            <div className="adjust-card" style={S.card}>
                                <p style={S.cardTitle}>Điều chỉnh</p>

                                {submitError && (
                                    <div style={S.banner("error")}>
                                        <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span>{submitError}</span>
                                    </div>
                                )}
                                {submitSuccess && (
                                    <div style={S.banner("success")}>
                                        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span>{submitSuccess}</span>
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
                                                        Đây là số liệu do hệ thống tính sẵn — sẽ được lưu chính thức sau khi bạn bấm "Lưu thay đổi".
                                                    </p>
                                                </>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="adjust-actions" style={S.actionsRow}>
                                        <button type="button" className="cancel-btn" style={S.cancelBtn} onClick={() => navigate(-1)}>
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
                </main>
            </div>
        </>
    );
}