import { useEffect, useState } from "react";
import cashierApi from "../../api/cashierApi";

// ── HELPERS ────────────────────────────────────────────────────────────────
const fmtCurrency = (v) => (v ?? 0).toLocaleString("vi-VN") + " ₫";
const fmtCompact = (v) => ((v ?? 0) / 1000000).toFixed(1) + "M";
const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtPercent = (v) => `${v >= 0 ? "+" : ""}${(v ?? 0).toFixed(1)}%`;

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // theo Date.getDay()
const dayLabelOf = (iso) => DAY_LABELS[new Date(iso).getDay()];
const isSameDay = (iso) => new Date(iso).toDateString() === new Date().toDateString();

const METHOD_LABELS = { Cash: "Tiền mặt", BankTransfer: "Chuyển khoản" };
const methodLabel = (m) => METHOD_LABELS[m] || m;

// Trạng thái giao dịch — nền trong suốt (tint) + chữ sáng, phù hợp nền tối
const STATUS_MAP = {
    Paid: { label: "✓ Thành công", bg: "rgba(5,150,105,0.15)", color: "#34D399" },
    Pending: { label: "⏳ Chờ", bg: "rgba(217,119,6,0.15)", color: "#FBBF24" },
    Cancelled: { label: "✕ Đã huỷ", bg: "rgba(220,38,38,0.15)", color: "#F87171" },
};

// Bảng màu avatar — slot đầu dùng cyan làm điểm nhấn thương hiệu (thay cho indigo cũ)
const AVATAR_COLORS = [
    ["#06B6D4", "rgba(6,182,212,0.15)"],
    ["#34D399", "rgba(5,150,105,0.15)"],
    ["#A78BFA", "rgba(124,58,237,0.15)"],
    ["#FBBF24", "rgba(217,119,6,0.15)"],
    ["#F87171", "rgba(220,38,38,0.15)"],
    ["#22D3EE", "rgba(8,145,178,0.15)"],
];
const initialsOf = (name = "") => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts[parts.length - 1]?.[0] || "";
    return (first + (parts.length > 1 ? last : "")).toUpperCase();
};
const getAvatarColor = (str) => {
    if (!str) return AVATAR_COLORS[0];
    const i = (str.charCodeAt(0) + (str.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[i];
};

// ── DASHBOARD ──────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [chartTab, setChartTab] = useState("revenue");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await cashierApi.getDashboard();
            setData(res.data ?? res);
        } catch (err) {
            console.error(err);
            setError("Không tải được dữ liệu dashboard. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={s.page}>
                <p style={s.subtext}>Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={s.page}>
                <p style={{ ...s.subtext, color: "#F87171" }}>{error}</p>
                <button style={s.btnOutline} onClick={loadDashboard}>🔄 Thử lại</button>
            </div>
        );
    }

    const stats = data?.stats ?? {};
    const recentCheckins = data?.recentCheckins ?? [];
    const recentTransactions = data?.recentTransactions ?? [];
    const weeklyChart = data?.weeklyChart ?? [];

    const STATS = [
        {
            id: "revenue",
            label: "Doanh thu hôm nay",
            value: fmtCurrency(stats.revenueToday),
            change: fmtPercent(stats.revenueChangePercent),
            up: (stats.revenueChangePercent ?? 0) >= 0,
            icon: "💰",
            color: "#22D3EE",
            bg: "rgba(6,182,212,0.15)",
        },
        {
            id: "new_members",
            label: "Hội viên mới",
            value: String(stats.newMembersToday ?? 0),
            change: "Hôm nay",
            up: null,
            icon: "👥",
            color: "#34D399",
            bg: "rgba(5,150,105,0.15)",
        },
        {
            id: "checkins",
            label: "Check-in hôm nay",
            value: String(stats.checkinsToday ?? 0),
            change: `${stats.checkinsChange >= 0 ? "+" : ""}${stats.checkinsChange ?? 0} so với hôm qua`,
            up: (stats.checkinsChange ?? 0) >= 0,
            icon: "📷",
            color: "#A78BFA",
            bg: "rgba(124,58,237,0.15)",
        },
    ];

    const maxBar = Math.max(
        1,
        ...weeklyChart.map((d) => (chartTab === "revenue" ? d.revenue : d.checkinCount))
    );

    return (
        <div style={s.page}>
            {/* Page header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.h1}>Dashboard</h1>
                    <p style={s.subtext}>
                        {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                <div style={s.headerActions}>
                    <button style={s.btnOutline}>📥 Xuất báo cáo</button>
                    <button style={s.btnPrimary}>➕ Hội viên mới</button>
                </div>
            </div>

            {/* Stat cards */}
            <div style={s.statsGrid}>
                {STATS.map((stat) => (
                    <div key={stat.id} style={s.statCard}>
                        <div style={s.statTop}>
                            <div style={{ ...s.statIconWrap, background: stat.bg, color: stat.color }}>
                                <span style={{ fontSize: 20 }}>{stat.icon}</span>
                            </div>
                            {stat.up !== null && (
                                <span style={{ ...s.badge, color: stat.up ? "#34D399" : "#F87171", background: stat.up ? "rgba(5,150,105,0.15)" : "rgba(220,38,38,0.15)" }}>
                                    {stat.up ? "▲" : "▼"} {stat.change}
                                </span>
                            )}
                            {stat.up === null && (
                                <span style={{ ...s.badge, color: "#FBBF24", background: "rgba(217,119,6,0.15)" }}>
                                    ⚡ {stat.change}
                                </span>
                            )}
                        </div>
                        <div style={s.statValue}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Chart + Recent checkins */}
            <div style={s.midRow}>
                {/* Bar chart */}
                <div style={s.card}>
                    <div style={s.cardHeader}>
                        <h2 style={s.cardTitle}>Thống kê tuần này</h2>
                        <div style={s.tabs}>
                            <button
                                style={{ ...s.tab, ...(chartTab === "revenue" ? s.tabActive : {}) }}
                                onClick={() => setChartTab("revenue")}
                            >
                                Doanh thu
                            </button>
                            <button
                                style={{ ...s.tab, ...(chartTab === "checkin" ? s.tabActive : {}) }}
                                onClick={() => setChartTab("checkin")}
                            >
                                Check-in
                            </button>
                        </div>
                    </div>
                    <div style={s.chartArea}>
                        {weeklyChart.map((d) => {
                            const val = chartTab === "revenue" ? d.revenue : d.checkinCount;
                            const pct = (val / maxBar) * 100;
                            const today = isSameDay(d.date);
                            return (
                                <div key={d.date} style={s.barCol}>
                                    <div style={s.barLabel2}>{chartTab === "revenue" ? fmtCompact(val) : val}</div>
                                    <div style={s.barTrack}>
                                        <div
                                            style={{
                                                ...s.bar,
                                                height: `${pct}%`,
                                                background: today
                                                    ? "linear-gradient(180deg, #06B6D4, #22D3EE)"
                                                    : "linear-gradient(180deg, #334155, #475569)",
                                                borderRadius: "6px 6px 0 0",
                                            }}
                                        />
                                    </div>
                                    <div style={{ ...s.dayLabel, fontWeight: today ? 700 : 400, color: today ? "#22D3EE" : "#64748B" }}>
                                        {dayLabelOf(d.date)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent check-ins */}
                <div style={{ ...s.card, flex: "0 0 300px", minWidth: 0 }}>
                    <div style={s.cardHeader}>
                        <h2 style={s.cardTitle}>Check-in gần đây</h2>
                        <button style={s.linkBtn}>Xem tất cả</button>
                    </div>
                    <div style={s.checkinList}>
                        {recentCheckins.length === 0 && (
                            <div style={{ padding: "16px 20px", fontSize: 13, color: "#64748B" }}>Chưa có check-in nào hôm nay</div>
                        )}
                        {recentCheckins.map((c, i) => {
                            const initials = initialsOf(c.memberName);
                            const [fg, bg] = getAvatarColor(initials);
                            return (
                                <div key={i} style={s.checkinItem}>
                                    <div style={{ position: "relative" }}>
                                        <div style={{ ...s.smAvatar, background: bg, color: fg }}>{initials}</div>
                                        <span style={{
                                            ...s.statusDot,
                                            background: c.isCheckedOut ? "#64748B" : "#22C55E",
                                        }} />
                                    </div>
                                    <div style={s.checkinInfo}>
                                        <div style={s.checkinName}>{c.memberName}</div>
                                        <div style={s.checkinPkg}>{c.packageName}</div>
                                    </div>
                                    <span style={s.checkinTime}>{fmtTime(c.checkInTime)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom row: Transactions */}
            <div style={s.bottomRow}>
                <div style={{ ...s.card, flex: 1, minWidth: 0, overflowX: "auto" }}>
                    <div style={s.cardHeader}>
                        <h2 style={s.cardTitle}>Giao dịch hôm nay</h2>
                        <button style={s.linkBtn}>Xem tất cả</button>
                    </div>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {["Mã GD", "Hội viên", "Gói tập", "Số tiền", "Phương thức", "Giờ", "Trạng thái"].map((h) => (
                                    <th key={h} style={s.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#64748B" }}>
                                        Chưa có giao dịch nào hôm nay
                                    </td>
                                </tr>
                            )}
                            {recentTransactions.map((tx, i) => {
                                const badge = STATUS_MAP[tx.status] ?? { label: tx.status, bg: "#334155", color: "#94A3B8" };
                                return (
                                    <tr key={tx.transactionId} style={{ background: i % 2 === 0 ? "#1E293B" : "#243244" }}>
                                        <td style={{ ...s.td, color: "#22D3EE", fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>
                                            #{tx.transactionId}
                                        </td>
                                        <td style={s.td}>{tx.memberName}</td>
                                        <td style={{ ...s.td, color: "#94A3B8" }}>{tx.packageName}</td>
                                        <td style={{ ...s.td, fontWeight: 600, color: "#F1F5F9" }}>{fmtCurrency(tx.amount)}</td>
                                        <td style={s.td}>
                                            <span style={{
                                                ...s.methodBadge,
                                                background: tx.paymentMethod === "Cash" ? "rgba(5,150,105,0.15)" : "rgba(6,182,212,0.15)",
                                                color: tx.paymentMethod === "Cash" ? "#34D399" : "#22D3EE",
                                            }}>{methodLabel(tx.paymentMethod)}</span>
                                        </td>
                                        <td style={{ ...s.td, color: "#94A3B8" }}>{fmtTime(tx.time)}</td>
                                        <td style={s.td}>
                                            <span style={{ ...s.statusBadge, background: badge.bg, color: badge.color }}>
                                                {badge.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        @media (max-width: 1024px) {
          .mid-row { flex-direction: column !important; }
          .bottom-row { flex-direction: column !important; }
          .checkin-card { flex: unset !important; }
        }
        @media (max-width: 640px) {
          .page { padding: 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .header-actions { flex-direction: column !important; gap: 8px !important; }
        }
      `}</style>
        </div>
    );
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const s = {
    page: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1400,
        background: "#0B1120",
        padding: 24,
        borderRadius: 12,
    },
    pageHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
    },
    h1: {
        fontSize: 24,
        fontWeight: 700,
        color: "#F1F5F9",
        letterSpacing: "-0.4px",
    },
    subtext: {
        fontSize: 13,
        color: "#94A3B8",
        marginTop: 4,
    },
    headerActions: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    btnPrimary: {
        padding: "9px 18px",
        background: "linear-gradient(135deg, #06B6D4, #0891B2)",
        color: "#0B1120",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(6,182,212,0.4)",
        whiteSpace: "nowrap",
    },
    btnOutline: {
        padding: "9px 18px",
        background: "#1E293B",
        color: "#CBD5E1",
        borderRadius: 8,
        fontWeight: 500,
        fontSize: 14,
        border: "1px solid #334155",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
    },
    statCard: {
        background: "#1E293B",
        borderRadius: 12,
        padding: "20px",
        border: "1px solid #334155",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    statTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    badge: {
        padding: "3px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
    },
    statValue: {
        fontSize: 22,
        fontWeight: 700,
        color: "#F1F5F9",
        letterSpacing: "-0.5px",
        marginTop: 4,
    },
    statLabel: {
        fontSize: 13,
        color: "#94A3B8",
    },
    midRow: {
        display: "flex",
        gap: 16,
        alignItems: "stretch",
    },
    card: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1E293B",
        borderRadius: 12,
        border: "1px solid #334155",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        overflow: "hidden",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #334155",
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: "#F1F5F9",
    },
    linkBtn: {
        fontSize: 13,
        color: "#22D3EE",
        fontWeight: 500,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
    },
    tabs: {
        display: "flex",
        background: "#0B1120",
        borderRadius: 8,
        padding: 3,
        gap: 2,
    },
    tab: {
        padding: "5px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        color: "#94A3B8",
        background: "none",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
    },
    tabActive: {
        background: "#06B6D4",
        color: "#0B1120",
        boxShadow: "0 1px 3px rgba(6,182,212,0.4)",
    },
    chartArea: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-around",
        padding: "20px 20px 12px",
        flex: 1,
        minHeight: 200,
        gap: 6,
    },
    barCol: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        height: "100%",
        gap: 4,
    },
    barLabel2: {
        fontSize: 10,
        color: "#94A3B8",
        whiteSpace: "nowrap",
        minHeight: 14,
    },
    barTrack: {
        flex: 1,
        width: "100%",
        display: "flex",
        alignItems: "flex-end",
        position: "relative",
    },
    bar: {
        width: "100%",
        minHeight: 4,
        transition: "height 0.4s ease",
    },
    dayLabel: {
        fontSize: 12,
    },
    bottomRow: {
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
    },
    checkinList: {
        display: "flex",
        flexDirection: "column",
        padding: "8px 0",
        flex: 1,
        minHeight: 0,
        maxHeight: 420,
        overflowY: "auto",
    },
    checkinItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderBottom: "1px solid #293548",
    },
    checkinInfo: {
        flex: 1,
        minWidth: 0,
    },
    checkinName: {
        fontSize: 13,
        fontWeight: 600,
        color: "#F1F5F9",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    checkinPkg: {
        fontSize: 12,
        color: "#94A3B8",
        marginTop: 1,
    },
    checkinTime: {
        fontSize: 12,
        color: "#64748B",
        fontVariantNumeric: "tabular-nums",
    },
    statusDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 9,
        height: 9,
        borderRadius: "50%",
        border: "2px solid #1E293B",
    },
    smAvatar: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
    },
    th: {
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: "#0F172A",
        borderBottom: "1px solid #334155",
        whiteSpace: "nowrap",
    },
    td: {
        padding: "12px 14px",
        color: "#CBD5E1",
        fontSize: 13,
        borderBottom: "1px solid #293548",
        whiteSpace: "nowrap",
    },
    methodBadge: {
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
    },
    statusBadge: {
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
    },
};