import {
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Globe,
    History,
    Loader2,
    MapPin,
    Phone,
    Search,
    Store,
    User,
    X,
    XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import authApi from "../../../../api/authApi";
import managerApi from "../../../../api/managerApi";

const PAGE_SIZE = 10;

// Trạng thái của MemberPackage (gói tập đã đăng ký) — khác với paymentStatus của Transaction.
const STATUS_CONFIG = {
    Active: { label: "Đang hoạt động", icon: CheckCircle2, bg: "rgba(5,150,105,0.1)", color: "#059669" },
    Expired: { label: "Hết hạn", icon: Clock, bg: "rgba(100,116,139,0.12)", color: "#64748b" },
    Cancelled: { label: "Đã hủy", icon: XCircle, bg: "rgba(190,18,60,0.1)", color: "#e11d48" },
};

const CHANNEL_CONFIG = {
    "Online": { label: "Online", icon: Globe, bg: "rgba(3,105,161,0.1)", color: "#0369a1" },
    "Offline": { label: "Tại quầy", icon: Store, bg: "rgba(5,150,105,0.1)", color: "#059669" },
};

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

// Danh sách số trang dạng: 1 … 4 5 [6] 7 8 … 20
function getPageNumbers(page, totalPages) {
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    }
    const result = [];
    pages.forEach((p, i) => {
        if (i > 0 && p - pages[i - 1] > 1) result.push("...");
        result.push(p);
    });
    return result;
}

const S = {
    root: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    main: { flex: 1, overflow: "visible", padding: "18px 32px 20px", display: "flex", flexDirection: "column", minHeight: 0 },

    pageTitle: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    pageTitleIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    h1: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.2 },
    pageDesc: { fontSize: 12, color: "#64748b", margin: 0 },

    branchStrip: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
    branchChip: (active) => ({
        display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8,
        border: `1px solid ${active ? "#059669" : "#e2e8f0"}`,
        backgroundColor: active ? "rgba(5,150,105,0.08)" : "#ffffff",
        padding: "6px 11px", fontSize: 12, fontWeight: 600,
        color: active ? "#059669" : "#64748b", cursor: "pointer", whiteSpace: "nowrap",
    }),
    branchChipIcon: (active) => ({ display: "flex", color: active ? "#059669" : "#94a3b8" }),

    filterPanel: { marginBottom: 10, borderRadius: 12, border: "1px solid #a7f3d0", backgroundColor: "#ffffff", padding: 12, flexShrink: 0 },
    filterGrid: { display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10 },
    searchWrap: { position: "relative" },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
    searchInput: { width: "100%", boxSizing: "border-box", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "7px 32px 7px 32px", fontSize: 12.5, color: "#0f172a", outline: "none" },
    clearBtn: { position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 2 },

    customSelectWrap: { position: "relative" },
    customSelectBtn: (open, disabled) => ({
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        borderRadius: 7, border: `1px solid ${open ? "#059669" : "#e2e8f0"}`, backgroundColor: disabled ? "#f1f5f9" : "#ffffff",
        padding: "7px 10px", fontSize: 12.5, color: disabled ? "#94a3b8" : "#0f172a", cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        boxShadow: open ? "0 0 0 3px rgba(5,150,105,0.15)" : "none",
    }),
    customSelectBtnLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    customSelectChevron: (open) => ({ display: "flex", flexShrink: 0, color: "#94a3b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }),
    customSelectMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 180, zIndex: 60, borderRadius: 10, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 16px 32px rgba(15,23,42,0.12)", padding: 6, maxHeight: 260, overflowY: "auto" },
    customSelectOption: (active) => ({
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer",
        color: active ? "#059669" : "#334155",
        backgroundColor: active ? "rgba(5,150,105,0.08)" : "transparent",
    }),
    resetBtn: { borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "7px 14px", fontSize: 12.5, fontWeight: 500, color: "#64748b", cursor: "pointer" },

    card: { borderRadius: 14, border: "1px solid #a7f3d0", backgroundColor: "#ffffff", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" },

    table: { width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" },
    th: { padding: "9px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#ffffff", textTransform: "uppercase", whiteSpace: "nowrap" },
    thRight: { padding: "9px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#ffffff", textAlign: "right", textTransform: "uppercase" },
    td: { padding: "12px 20px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
    tdRight: { padding: "12px 20px", borderBottom: "1px solid #e2e8f0", textAlign: "right", verticalAlign: "middle" },
    memberRow: { display: "flex", alignItems: "center", gap: 10 },
    avatarImg: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e2e8f0" },
    avatarFallback: { width: 34, height: 34, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#94a3b8" },
    memberName: { fontWeight: 600, color: "#0f172a", fontSize: 13 },
    memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", marginTop: 2 },
    planName: { color: "#334155" },
    orderCodeTag: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
    branchTag: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" },
    dateRange: { color: "#64748b", whiteSpace: "nowrap" },
    amountMain: { fontWeight: 600, color: "#0f172a" },

    badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600, backgroundColor: bg, color }),

    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    emptyTitle: { fontSize: 13, fontWeight: 500, color: "#334155" },
    emptyDesc: { fontSize: 11, color: "#94a3b8" },

    loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" },
    errorState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
    retryBtn: { marginTop: 8, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#64748b", cursor: "pointer" },

    scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
    stickyHead: { position: "sticky", top: 0, zIndex: 1, background: "linear-gradient(135deg, #059669, #0e7490)" },

    pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", borderTop: "1px solid #a7f3d0", backgroundColor: "#f0fdf4", flexWrap: "wrap", gap: 8, flexShrink: 0 },
    pageInfo: { fontSize: 12, color: "#64748b" },
    pageBtns: { display: "flex", gap: 5 },
    pageBtn: (active) => ({
        padding: "5px 10px", borderRadius: 6, border: `1px solid ${active ? "#059669" : "#e2e8f0"}`,
        backgroundColor: active ? "#059669" : "#ffffff", fontSize: 12.5, fontWeight: 600,
        color: active ? "#ffffff" : "#0f172a", cursor: "pointer",
    }),
    pageBtnDisabled: { opacity: 0.4, cursor: "default" },
    pageEllipsis: { padding: "0 3px", color: "#94a3b8", lineHeight: "28px", fontSize: 12.5 },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Active;
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

function Avatar({ src, alt, size = 34 }) {
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
                        <div style={{ padding: "10px 10px", fontSize: 12.5, color: "#94a3b8" }}>Không có dữ liệu</div>
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


export default function LichSuDangKyGoiTapOfManager() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");

    const [branches, setBranches] = useState([]);
    const [branchFilter, setBranchFilter] = useState("all");
    const [branchesLoading, setBranchesLoading] = useState(true);

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

    // Đổi bộ lọc thì quay về trang 1
    useEffect(() => setPage(1), [formData]);

    // Danh sách gói tập đã đăng ký (MemberPackage), lấy từ /api/member-packages/history.
    async function fetchHistory() {
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getMemberPackagesHistory(formData);
            const raw = res?.data ?? res;
            const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            setHistory(data);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || "Không thể tải lịch sử đăng ký gói tập");
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

    // Phân trang phía client trên danh sách đã lọc
    const totalCount = history.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const pagedHistory = useMemo(
        () => history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [history, page]
    );

    return (
        <>
            <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }
        input:focus { border-color: #059669 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.15) !important; }
        tr:hover td { background-color: rgba(241,245,249,0.9) !important; }
        .table-wrap { display: block; overflow-x: auto; }
        .mobile-cards { display: none; }
        .spin { animation: spin 0.8s linear infinite; }
        .reset-btn:hover { background-color: #f1f5f9 !important; }
        .branch-chip:hover { border-color: #059669 !important; }
        .custom-select-btn:not(:disabled):hover { border-color: #cbd5e1 !important; }
        .custom-select-option:hover { background-color: #f1f5f9 !important; }
        .custom-select-menu { animation: dropdown-in 0.12s ease-out; }
        .page-btn:hover:not(:disabled) { border-color: #059669 !important; color: #059669 !important; }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scroll-dark::-webkit-scrollbar { width: 8px; height: 8px; }
        .scroll-dark::-webkit-scrollbar-track { background: transparent; }
        .scroll-dark::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 8px; }
        .scroll-dark::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .scroll-dark { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .app-root { height: 100vh; height: 100dvh; }
        @media (max-width: 1024px) {
          .filter-grid { grid-template-columns: 1fr 1fr !important; }
          .filter-grid .reset-btn { grid-column: span 2; }
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
      `}</style>

            <div className="app-root" style={S.root}>
                <main className="main-pad" style={S.main}>
                    <div className="page-title" style={S.pageTitle}>
                        <div className="page-title-icon" style={S.pageTitleIcon}>
                            <History size={18} color="#fff" />
                        </div>
                        <div>
                            <h1 className="page-title-h1" style={S.h1}>Lịch sử đăng ký gói tập</h1>
                            <p className="page-desc" style={S.pageDesc}>Xem lại các gói tập hội viên đã đăng ký</p>
                        </div>
                    </div>

                    {!branchesLoading && branches.length > 0 && (
                        <div className="branch-strip scroll-dark" style={S.branchStrip}>
                            <button
                                className="branch-chip"
                                style={S.branchChip(branchFilter === "all")}
                                onClick={() => setBranchFilter("all")}
                            >
                                <span style={S.branchChipIcon(branchFilter === "all")}><Building2 size={13} /></span>
                                Tất cả chi nhánh
                            </button>
                            {branches.map((b) => (
                                <button
                                    key={b.branchId}
                                    className="branch-chip"
                                    style={S.branchChip(String(branchFilter) === String(b.branchId))}
                                    onClick={() => setBranchFilter(b.branchId)}
                                >
                                    <span style={S.branchChipIcon(String(branchFilter) === String(b.branchId))}><MapPin size={13} /></span>
                                    {b.branchName}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="filter-panel" style={S.filterPanel}>
                        <div className="filter-grid" style={S.filterGrid}>
                            <div style={S.searchWrap}>
                                <span style={S.searchIcon}><Search size={15} /></span>
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
                                    { value: "Active", label: "Đang hoạt động" },
                                    { value: "Expired", label: "Hết hạn" },
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
                                    { value: "Offline", label: "Tại quầy" },
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
                        {loading ? (
                            <div style={S.loadingState}>
                                <Loader2 className="spin" size={28} color="#94a3b8" />
                                <p style={S.emptyTitle}>Đang tải lịch sử đăng ký...</p>
                            </div>
                        ) : error ? (
                            <div style={S.errorState}>
                                <XCircle size={28} color="#e11d48" />
                                <p style={S.emptyTitle}>{error}</p>
                                <button style={S.retryBtn} onClick={fetchHistory}>Thử lại</button>
                            </div>
                        ) : totalCount === 0 ? (
                            <div style={S.emptyState}>
                                <Search size={28} color="#cbd5e1" />
                                <p style={S.emptyTitle}>Không tìm thấy gói tập phù hợp</p>
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
                                                <th style={S.th}>Thời hạn</th>
                                                <th style={S.thRight}>Số tiền</th>
                                                <th style={S.th}>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedHistory.map((item, idx) => {
                                                const rowKey = item.memberPackageId ?? `${item.memberPhone}-${item.planName}-${item.startDate}-${idx}`;
                                                return (
                                                    <tr key={rowKey}>
                                                        <td style={S.td}>
                                                            <div style={S.memberRow}>
                                                                <Avatar src={item.memberAvatarUrl} alt={item.memberFullName} />
                                                                <div>
                                                                    <p style={S.memberName}>{item.memberFullName}</p>
                                                                    <p style={S.memberPhone}><Phone size={10} />{item.memberPhone}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={S.td}>

                                                            {item.transactionCode && (
                                                                <p style={S.orderCodeTag}>{item.transactionCode}</p>
                                                            )}
                                                        </td>
                                                        <td style={S.td}>
                                                            <span style={S.planName}>{item.planName}</span>

                                                        </td>
                                                        <td><span style={S.branchTag}>
                                                            <MapPin size={12} color="#94a3b8" />
                                                            {item.branchName || "—"}
                                                        </span></td>
                                                        <td style={S.td}><ChannelBadge channel={item.channel} /></td>
                                                        <td style={S.td}><span style={S.dateRange}>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span></td>
                                                        <td style={S.tdRight}>
                                                            <p style={S.amountMain}>{formatCurrency(item.amount)}</p>
                                                        </td>
                                                        <td style={S.td}><StatusBadge status={item.packageStatus} /></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mobile-cards scroll-dark" style={S.scrollArea}>
                                    {pagedHistory.map((item, idx) => {
                                        const rowKey = item.memberPackageId ?? `${item.memberPhone}-${item.planName}-${item.startDate}-${idx}`;
                                        return (
                                            <div key={rowKey} style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: 16, backgroundColor: "#f8fafc" }}>
                                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                                    <div style={S.memberRow}>
                                                        <Avatar src={item.memberAvatarUrl} alt={item.memberFullName} />
                                                        <div>
                                                            <p style={S.memberName}>{item.memberFullName}</p>
                                                            <p style={S.memberPhone}><Phone size={10} />{item.memberPhone}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={item.packageStatus} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
                                                    <span style={{ color: "#334155" }}>{item.planName}</span>
                                                    <ChannelBadge channel={item.channel} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                                    <span style={S.branchTag}><MapPin size={12} color="#94a3b8" />{item.branchName || "—"}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
                                                    <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{formatCurrency(item.amount)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalCount > PAGE_SIZE && (
                                    <div style={S.pagination}>
                                        <p style={S.pageInfo}>Trang {page} / {totalPages} · {totalCount} kết quả</p>
                                        <div style={S.pageBtns}>
                                            <button
                                                className="page-btn"
                                                style={{ ...S.pageBtn(false), ...(page === 1 ? S.pageBtnDisabled : {}) }}
                                                disabled={page === 1}
                                                onClick={() => setPage((p) => p - 1)}
                                            >← Trước</button>
                                            {getPageNumbers(page, totalPages).map((p, i) =>
                                                p === "..." ? (
                                                    <span key={`e${i}`} style={S.pageEllipsis}>…</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        className="page-btn"
                                                        style={S.pageBtn(page === p)}
                                                        onClick={() => setPage(p)}
                                                    >{p}</button>
                                                )
                                            )}
                                            <button
                                                className="page-btn"
                                                style={{ ...S.pageBtn(false), ...(page === totalPages ? S.pageBtnDisabled : {}) }}
                                                disabled={page === totalPages}
                                                onClick={() => setPage((p) => p + 1)}
                                            >Sau →</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}