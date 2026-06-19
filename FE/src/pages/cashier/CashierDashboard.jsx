import { useState } from "react";

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const STATS = [
    {
        id: "revenue",
        label: "Doanh thu hôm nay",
        value: "12.450.000 ₫",
        change: "+8.2%",
        up: true,
        icon: "💰",
        color: "#2563EB",
        bg: "#EFF6FF",
    },
    {
        id: "new_members",
        label: "Hội viên mới",
        value: "7",
        change: "+2 so với hôm qua",
        up: true,
        icon: "👥",
        color: "#059669",
        bg: "#ECFDF5",
    },
    {
        id: "checkins",
        label: "Check-in hôm nay",
        value: "134",
        change: "-5 so với hôm qua",
        up: false,
        icon: "📷",
        color: "#7C3AED",
        bg: "#F5F3FF",
    },

];

const RECENT_CHECKINS = [
    { id: 1, name: "Trần Minh Khoa", pkg: "Gói 3 tháng", time: "08:42", avatar: "TK", status: "in" },
    { id: 2, name: "Nguyễn Thị Lan", pkg: "Gói 1 tháng", time: "08:39", avatar: "NL", status: "in" },
    { id: 3, name: "Lê Hoàng Nam", pkg: "Gói 6 tháng", time: "08:31", avatar: "LN", status: "in" },
    { id: 4, name: "Phạm Thu Hà", pkg: "Gói 1 năm", time: "08:20", avatar: "PH", status: "in" },
    { id: 5, name: "Vũ Đức Anh", pkg: "Gói 3 tháng", time: "08:15", avatar: "VA", status: "in" },
    { id: 6, name: "Bùi Ngọc Mai", pkg: "Gói 1 tháng", time: "08:05", avatar: "BM", status: "out" },
];

const TRANSACTIONS = [
    { id: "TXN001", member: "Trần Minh Khoa", pkg: "Gói 3 tháng", amount: "1.200.000 ₫", method: "Tiền mặt", time: "08:40", status: "success" },
    { id: "TXN002", member: "Lý Thị Hoa", pkg: "Gói 1 tháng", amount: "450.000 ₫", method: "Chuyển khoản", time: "08:25", status: "success" },
    { id: "TXN003", member: "Đoàn Minh Tuấn", pkg: "Gói 6 tháng", amount: "2.400.000 ₫", method: "Thẻ", time: "08:10", status: "success" },
    { id: "TXN004", member: "Phan Ánh Tuyết", pkg: "Gói 1 tháng", amount: "450.000 ₫", method: "Tiền mặt", time: "07:55", status: "pending" },
    { id: "TXN005", member: "Ngô Thế Phong", pkg: "Gói 3 tháng", amount: "1.200.000 ₫", method: "Chuyển khoản", time: "07:40", status: "success" },
];

const EXPIRING = [
    { name: "Vũ Đức Anh", pkg: "Gói 3 tháng", days: 2, avatar: "VA" },
    { name: "Bùi Ngọc Mai", pkg: "Gói 1 tháng", days: 3, avatar: "BM" },
    { name: "Đinh Thanh Tùng", pkg: "Gói 6 tháng", days: 5, avatar: "DT" },
    { name: "Cao Thị Phương", pkg: "Gói 1 tháng", days: 6, avatar: "CP" },
];

const BAR_DATA = [
    { day: "T2", value: 8200000, checkin: 110 },
    { day: "T3", value: 9500000, checkin: 126 },
    { day: "T4", value: 7800000, checkin: 98 },
    { day: "T5", value: 11200000, checkin: 142 },
    { day: "T6", value: 13400000, checkin: 158 },
    { day: "T7", value: 15600000, checkin: 178 },
    { day: "CN", value: 12450000, checkin: 134 },
];

const AVATAR_COLORS = [
    ["#2563EB", "#EFF6FF"],
    ["#059669", "#ECFDF5"],
    ["#7C3AED", "#F5F3FF"],
    ["#D97706", "#FFFBEB"],
    ["#DC2626", "#FEF2F2"],
    ["#0891B2", "#ECFEFF"],
];
const getAvatarColor = (str) => {
    const i = (str.charCodeAt(0) + (str.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[i];
};

const fmt = (v) => (v / 1000000).toFixed(1) + "M";

// ── DASHBOARD ──────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [chartTab, setChartTab] = useState("revenue");
    const maxBar = Math.max(...BAR_DATA.map((d) => (chartTab === "revenue" ? d.value : d.checkin)));

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
                                <span style={{ ...s.badge, color: stat.up ? "#059669" : "#DC2626", background: stat.up ? "#ECFDF5" : "#FEF2F2" }}>
                                    {stat.up ? "▲" : "▼"} {stat.change}
                                </span>
                            )}
                            {stat.up === null && (
                                <span style={{ ...s.badge, color: "#D97706", background: "#FFFBEB" }}>
                                    ⚡ {stat.change}
                                </span>
                            )}
                        </div>
                        <div style={s.statValue}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Chart + Expiring */}
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
                        {BAR_DATA.map((d) => {
                            const val = chartTab === "revenue" ? d.value : d.checkin;
                            const pct = (val / maxBar) * 100;
                            const isToday = d.day === "CN";
                            return (
                                <div key={d.day} style={s.barCol}>
                                    <div style={s.barLabel2}>{chartTab === "revenue" ? fmt(val) : val}</div>
                                    <div style={s.barTrack}>
                                        <div
                                            style={{
                                                ...s.bar,
                                                height: `${pct}%`,
                                                background: isToday
                                                    ? "linear-gradient(180deg, #2563EB, #60A5FA)"
                                                    : "linear-gradient(180deg, #BFDBFE, #DBEAFE)",
                                                borderRadius: "6px 6px 0 0",
                                            }}
                                        />
                                    </div>
                                    <div style={{ ...s.dayLabel, fontWeight: isToday ? 700 : 400, color: isToday ? "#2563EB" : "#9CA3AF" }}>
                                        {d.day}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Expiring soon */}
                {/* <div style={{ ...s.card, minWidth: 0, flex: "0 0 280px" }}>
                    <div style={s.cardHeader}>
                        <h2 style={s.cardTitle}>⚠️ Sắp hết hạn</h2>
                        <button style={s.linkBtn}>Xem tất cả</button>
                    </div>
                    <div style={s.expiringList}>
                        {EXPIRING.map((m) => {
                            const [fg, bg] = getAvatarColor(m.avatar);
                            return (
                                <div key={m.name} style={s.expiringItem}>
                                    <div style={{ ...s.smAvatar, background: bg, color: fg }}>{m.avatar}</div>
                                    <div style={s.expiringInfo}>
                                        <div style={s.expiringName}>{m.name}</div>
                                        <div style={s.expiringPkg}>{m.pkg}</div>
                                    </div>
                                    <span style={{
                                        ...s.daysBadge,
                                        background: m.days <= 2 ? "#FEF2F2" : m.days <= 5 ? "#FFFBEB" : "#F3F4F6",
                                        color: m.days <= 2 ? "#DC2626" : m.days <= 5 ? "#D97706" : "#6B7280",
                                    }}>
                                        {m.days} ngày
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <button style={s.renewAllBtn}>📨 Nhắc gia hạn tất cả</button>
                </div> */}
                <div style={{ ...s.card, flex: "0 0 300px", minWidth: 0 }}>
                    <div style={s.cardHeader}>
                        <h2 style={s.cardTitle}>Check-in gần đây</h2>
                        <button style={s.linkBtn}>Xem tất cả</button>
                    </div>
                    <div style={s.checkinList}>
                        {RECENT_CHECKINS.map((c) => {
                            const [fg, bg] = getAvatarColor(c.avatar);
                            return (
                                <div key={c.id} style={s.checkinItem}>
                                    <div style={{ position: "relative" }}>
                                        <div style={{ ...s.smAvatar, background: bg, color: fg }}>{c.avatar}</div>
                                        <span style={{
                                            ...s.statusDot,
                                            background: c.status === "in" ? "#22C55E" : "#94A3B8",
                                        }} />
                                    </div>
                                    <div style={s.checkinInfo}>
                                        <div style={s.checkinName}>{c.name}</div>
                                        <div style={s.checkinPkg}>{c.pkg}</div>
                                    </div>
                                    <span style={s.checkinTime}>{c.time}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom row: Recent checkins + Transactions */}
            <div style={s.bottomRow}>
                {/* Recent check-ins */}


                {/* Transactions */}
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
                            {TRANSACTIONS.map((tx, i) => (
                                <tr key={tx.id} style={{ background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                                    <td style={{ ...s.td, color: "#2563EB", fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{tx.id}</td>
                                    <td style={s.td}>{tx.member}</td>
                                    <td style={{ ...s.td, color: "#6B7280" }}>{tx.pkg}</td>
                                    <td style={{ ...s.td, fontWeight: 600, color: "#111827" }}>{tx.amount}</td>
                                    <td style={s.td}>
                                        <span style={{
                                            ...s.methodBadge,
                                            background: tx.method === "Tiền mặt" ? "#F0FDF4" : tx.method === "Chuyển khoản" ? "#EFF6FF" : "#F5F3FF",
                                            color: tx.method === "Tiền mặt" ? "#15803D" : tx.method === "Chuyển khoản" ? "#1D4ED8" : "#6D28D9",
                                        }}>{tx.method}</span>
                                    </td>
                                    <td style={{ ...s.td, color: "#6B7280" }}>{tx.time}</td>
                                    <td style={s.td}>
                                        <span style={{
                                            ...s.statusBadge,
                                            background: tx.status === "success" ? "#ECFDF5" : "#FFFBEB",
                                            color: tx.status === "success" ? "#059669" : "#D97706",
                                        }}>
                                            {tx.status === "success" ? "✓ Thành công" : "⏳ Chờ"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        @media (max-width: 1024px) {
          .mid-row { flex-direction: column !important; }
          .bottom-row { flex-direction: column !important; }
          .expiring-card { flex: unset !important; }
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
        color: "#111827",
        letterSpacing: "-0.4px",
    },
    subtext: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    headerActions: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    btnPrimary: {
        padding: "9px 18px",
        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
        color: "white",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(37,99,235,0.4)",
        whiteSpace: "nowrap",
    },
    btnOutline: {
        padding: "9px 18px",
        background: "white",
        color: "#374151",
        borderRadius: 8,
        fontWeight: 500,
        fontSize: 14,
        border: "1px solid #E5E7EB",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
    },
    statCard: {
        background: "white",
        borderRadius: 12,
        padding: "20px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
        color: "#111827",
        letterSpacing: "-0.5px",
        marginTop: 4,
    },
    statLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    midRow: {
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
    },
    card: {
        flex: 1,
        background: "white",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #F3F4F6",
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: "#111827",
    },
    linkBtn: {
        fontSize: 13,
        color: "#2563EB",
        fontWeight: 500,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
    },
    tabs: {
        display: "flex",
        background: "#F3F4F6",
        borderRadius: 8,
        padding: 3,
        gap: 2,
    },
    tab: {
        padding: "5px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        color: "#6B7280",
        background: "none",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
    },
    tabActive: {
        background: "white",
        color: "#111827",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    chartArea: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-around",
        padding: "20px 20px 12px",
        height: 200,
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
        color: "#6B7280",
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
    expiringList: {
        display: "flex",
        flexDirection: "column",
        padding: "8px 0",
    },
    expiringItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderBottom: "1px solid #F9FAFB",
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
    expiringInfo: {
        flex: 1,
        minWidth: 0,
    },
    expiringName: {
        fontSize: 13,
        fontWeight: 600,
        color: "#111827",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    expiringPkg: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 1,
    },
    daysBadge: {
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        whiteSpace: "nowrap",
    },
    renewAllBtn: {
        display: "block",
        width: "calc(100% - 40px)",
        margin: "12px 20px 16px",
        padding: "10px",
        background: "#EFF6FF",
        color: "#2563EB",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #BFDBFE",
        cursor: "pointer",
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
    },
    checkinItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderBottom: "1px solid #F9FAFB",
    },
    checkinInfo: {
        flex: 1,
        minWidth: 0,
    },
    checkinName: {
        fontSize: 13,
        fontWeight: 600,
        color: "#111827",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    checkinPkg: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 1,
    },
    checkinTime: {
        fontSize: 12,
        color: "#9CA3AF",
        fontVariantNumeric: "tabular-nums",
    },
    statusDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 9,
        height: 9,
        borderRadius: "50%",
        border: "2px solid white",
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
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: "#F9FAFB",
        borderBottom: "1px solid #E5E7EB",
        whiteSpace: "nowrap",
    },
    td: {
        padding: "12px 14px",
        color: "#374151",
        fontSize: 13,
        borderBottom: "1px solid #F3F4F6",
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