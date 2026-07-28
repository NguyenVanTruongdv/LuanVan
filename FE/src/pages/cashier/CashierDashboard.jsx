import {
    CalendarClock,
    ChevronDown,
    Globe,
    Leaf,
    Receipt,
    Repeat,
    Store,
    TrendingDown,
    TrendingUp,
    UserCheck,
    Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// TODO: chỉnh lại đường dẫn import cho đúng vị trí thật trong project của bạn.
// dashboardApi.getCashierDashboard({ range, start, end, method, channel }) => Promise<AxiosResponse>
import cashierApi from "../../api/cashierApi";
/* ============================================================
   CONST
   ============================================================ */

const PAYMENT_METHODS = ["Tiền mặt", "Chuyển khoản"];
const PIE_COLORS = ["#2f8a47", "#a6dcb0"];

const RANGE_OPTIONS = [
    { key: "today", label: "Hôm nay" },
    { key: "7d", label: "7 ngày qua" },
    { key: "30d", label: "30 ngày qua" },
    { key: "custom", label: "Tùy chỉnh (chọn ca cụ thể)" },
];

/* ============================================================
   FORMAT HELPERS
   ============================================================ */

function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function fmtDate(d) {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
function fmtDateTime(d) {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtMoney(n) {
    return (n || 0).toLocaleString("vi-VN") + " đ";
}
function fmtMoneyShort(n) {
    n = n || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "tr";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return `${n}`;
}
function toInputDateTime(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============================================================
   MAP DỮ LIỆU TỪ API (camelCase) SANG SHAPE DÙNG CHO UI
   ============================================================ */

function emptyDashboard() {
    return {
        stats: {
            totalRevenue: 0,
            totalOrders: 0,
            avgOrder: 0,
            revenueTrendUp: true,
            revenueDeltaPercent: 0,
            counterRevenue: 0,
            onlineRevenue: 0,
            cashRevenue: 0,
            transferRevenue: 0,
        },
        revenueByDay: [],
        methodBreakdown: [],
        channelByDay: [],
        recentOrders: [],
        recentCheckins: [],
    };
}

function mapDashboardResponse(data) {
    if (!data) return emptyDashboard();

    return {
        stats: {
            totalRevenue: data.stats?.totalRevenue ?? 0,
            totalOrders: data.stats?.totalOrders ?? 0,
            avgOrder: data.stats?.avgOrder ?? 0,
            revenueTrendUp: data.stats?.revenueTrendUp ?? true,
            revenueDeltaPercent: data.stats?.revenueDeltaPercent ?? 0,
            counterRevenue: data.stats?.counterRevenue ?? 0,
            onlineRevenue: data.stats?.onlineRevenue ?? 0,
            cashRevenue: data.stats?.cashRevenue ?? 0,
            transferRevenue: data.stats?.transferRevenue ?? 0,
        },
        revenueByDay: (data.revenueByDay || []).map((r) => {
            const date = new Date(r.date);
            return { key: r.date, date, revenue: r.revenue, orders: r.orders, label: fmtDate(date) };
        }),
        methodBreakdown: (data.methodBreakdown || []).map((m) => ({ name: m.method, value: m.amount })),
        channelByDay: (data.channelByDay || []).map((c) => {
            const date = new Date(c.date);
            return {
                key: c.date,
                date,
                "Tại quầy": c.counterRevenue,
                Online: c.onlineRevenue,
                label: fmtDate(date),
            };
        }),
        recentOrders: (data.recentOrders || []).map((o) => ({
            id: o.transactionId,
            datetime: new Date(o.dateTime),
            amount: o.amount,
            method: o.paymentMethod,
            channel: o.channel,
        })),
        recentCheckins: (data.recentCheckins || []).map((c, idx) => ({
            id: idx,
            member: c.memberName,
            datetime: new Date(c.dateTime),
            type: c.membershipType,
        })),
    };
}

/* ============================================================
   SMALL REUSABLE SELECT COMPONENT
   ============================================================ */

function FieldSelect({ label, icon, value, onChange, options }) {
    return (
        <div className="field">
            <label className="field__label">
                {icon} {label}
            </label>
            <div className="select-wrap">
                <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={15} className="select-chevron" />
            </div>
        </div>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function CashierDashboard() {
    const [range, setRange] = useState("30d");
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const [customStart, setCustomStart] = useState(toInputDateTime(oneDayAgo));
    const [customEnd, setCustomEnd] = useState(toInputDateTime(now));
    const [method, setMethod] = useState("Tất cả");
    const [channel, setChannel] = useState("Tất cả");

    const [dashboard, setDashboard] = useState(emptyDashboard());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Với range custom, chờ người dùng chọn đủ 2 mốc thời gian rồi mới gọi API
        if (range === "custom" && (!customStart || !customEnd)) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        cashierApi
            .getCashierDashboard({
                range,
                start: range === "custom" ? customStart : undefined,
                end: range === "custom" ? customEnd : undefined,
                method,
                channel,
            })
            .then((res) => {
                if (cancelled) return;
                // Tương thích cả 2 trường hợp: authApi trả về full response (res.data)
                // hoặc interceptor đã unwrap sẵn (res chính là payload).
                const payload = res && res.data && res.data.stats ? res.data : res;
                setDashboard(mapDashboardResponse(payload));
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Lỗi tải dashboard thu ngân:", err);
                setError("Không tải được dữ liệu. Vui lòng thử lại.");
                setDashboard(emptyDashboard());
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [range, customStart, customEnd, method, channel]);

    const {
        stats: {
            totalRevenue,
            totalOrders,
            avgOrder,
            revenueTrendUp,
            revenueDeltaPercent: revenueDeltaPct,
            counterRevenue,
            onlineRevenue,
            cashRevenue,
            transferRevenue,
        },
        revenueByDay,
        methodBreakdown,
        channelByDay,
        recentOrders,
        recentCheckins,
    } = dashboard;

    const methodMax = Math.max(cashRevenue, transferRevenue, 1);
    const channelMax = Math.max(counterRevenue, onlineRevenue, 1);

    return (
        <div className="dash">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

        :root {
          --white: #ffffff;
          --bg-page: #f2faf3;
          --green-50: #eaf7ec;
          --green-100: #d9f0dd;
          --green-200: #bfe6c6;
          --green-300: #8ed89d;
          --green-400: #5fc47a;
          --green-500: #3aa858;
          --green-600: #2f8a47;
          --green-700: #226b38;
          --green-800: #184e29;
          --text-dark: #17251b;
          --text-muted: #66806f;
          --border-soft: #cdeada;
          --border-strong: #9adcae;
          --shadow-color: rgba(38, 112, 62, 0.16);
          --shadow-strong: rgba(38, 112, 62, 0.26);
        }

        * { box-sizing: border-box; }

        .dash {
          font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--bg-page);
          color: var(--text-dark);
          min-height: 100vh;
          padding: 28px clamp(16px, 4vw, 48px) 60px;
        }

        /* ---------- header ---------- */
        .dash__header {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
        }
        .dash__title-wrap { display: flex; align-items: center; gap: 14px; }
        .dash__logo {
          width: 46px; height: 46px; border-radius: 16px;
          background: linear-gradient(135deg, var(--green-400), var(--green-700));
          display: flex; align-items: center; justify-content: center;
          color: white; box-shadow: 0 8px 18px var(--shadow-strong);
        }
        .dash__title { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .dash__subtitle { margin: 2px 0 0; color: var(--text-muted); font-size: 13.5px; font-weight: 500; }
        .dash__date-pill {
          background: var(--white); border: 2px solid var(--border-strong);
          border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 700;
          color: var(--green-700); box-shadow: 0 6px 18px var(--shadow-color);
          display: flex; align-items: center; gap: 8px;
        }

        /* ---------- generic card ---------- */
        .card {
          background: var(--white); border-radius: 22px;
          border: 2px solid var(--border-soft);
          box-shadow: 0 16px 36px var(--shadow-color);
          padding: 22px;
        }
        .card__head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
        }
        .card__title { font-size: 15.5px; font-weight: 700; margin: 0; }
        .card__hint { font-size: 12px; color: var(--text-muted); font-weight: 600; }

        /* ---------- filter bar ---------- */
        .filters {
          margin-bottom: 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          align-items: start;
        }
        .field { display: flex; flex-direction: column; gap: 8px; }
        .field__label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; color: var(--green-700);
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .select-wrap { position: relative; }
        .select {
          width: 100%;
          appearance: none;
          -webkit-appearance: none;
          border: 2px solid var(--border-soft);
          background: var(--green-50);
          color: var(--text-dark);
          border-radius: 14px;
          padding: 11px 38px 11px 14px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .select:hover { border-color: var(--green-400); }
        .select:focus { outline: none; border-color: var(--green-600); box-shadow: 0 0 0 4px var(--green-100); }
        .select-chevron {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: var(--green-600); pointer-events: none;
        }
        .custom-range {
          grid-column: 1 / -1;
          display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px;
          background: var(--green-50);
          border: 2px dashed var(--border-strong);
          border-radius: 16px;
          padding: 14px 16px;
          margin-top: 2px;
        }
        .custom-range__hint {
          font-size: 12px; color: var(--text-muted); font-weight: 600;
          width: 100%; margin-bottom: 2px;
        }
        .custom-range .field { min-width: 220px; }
        .custom-range input[type="datetime-local"] {
          border: 2px solid var(--border-soft);
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 13px;
          font-family: inherit;
          font-weight: 600;
          background: var(--white);
          color: var(--text-dark);
        }
        .custom-range input[type="datetime-local"]:focus {
          outline: none; border-color: var(--green-600); box-shadow: 0 0 0 4px var(--green-100);
        }

        /* ---------- KPI grid ---------- */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 22px;
        }
        .kpi-card {
          background: var(--white);
          border-radius: 22px;
          border: 2px solid var(--kpi-border, var(--border-soft));
          box-shadow: 0 16px 36px var(--shadow-color);
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        .kpi-card__stripe {
          height: 6px;
          width: 100%;
          background: var(--kpi-accent, var(--green-500));
        }
        .kpi-card__body { padding: 18px 20px 20px; position: relative; }
        .kpi-card__body::after {
          content: "";
          position: absolute; right: -30px; top: -10px;
          width: 90px; height: 90px; border-radius: 50%;
          background: var(--green-50); z-index: 0;
        }
        .kpi-card__top { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
        .kpi-card__icon {
          width: 38px; height: 38px; border-radius: 12px;
          background: var(--kpi-icon-bg, var(--green-100));
          color: var(--kpi-accent, var(--green-700));
          display: flex; align-items: center; justify-content: center;
        }
        .kpi-card__value { font-size: 23px; font-weight: 800; margin: 14px 0 2px; position: relative; z-index: 1; letter-spacing: -0.01em; }
        .kpi-card__label { font-size: 13px; color: var(--text-dark); font-weight: 700; position: relative; z-index: 1; }
        .kpi-card__desc { font-size: 11.5px; color: var(--text-muted); font-weight: 500; margin-top: 3px; position: relative; z-index: 1; }
        .kpi-card__delta {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11.5px; font-weight: 700;
          margin-top: 10px; padding: 3px 9px; border-radius: 999px;
          position: relative; z-index: 1;
        }
        .kpi-card__delta--up { background: var(--green-50); color: var(--green-700); }
        .kpi-card__delta--down { background: #fdeceb; color: #c0392b; }

        /* ---------- chart rows ---------- */
        .row-2col {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 6px; }

        .pie-legend { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
        .pie-legend__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
        .pie-legend__name { display: flex; align-items: center; color: var(--text-dark); font-weight: 600; }
        .pie-legend__val { color: var(--green-700); font-weight: 700; }

        .compare-block { margin-bottom: 20px; }
        .compare-block:last-child { margin-bottom: 0; }
        .compare-block__title { font-size: 12.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 10px; }
        .compare-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .compare-row__name { width: 84px; font-size: 12.5px; font-weight: 600; color: var(--text-dark); flex-shrink: 0; }
        .compare-row__track { flex: 1; background: var(--green-50); border-radius: 999px; height: 12px; overflow: hidden; }
        .compare-row__fill { height: 100%; border-radius: 999px; }
        .compare-row__val { width: 74px; text-align: right; font-size: 12px; font-weight: 700; color: var(--green-700); flex-shrink: 0; }

        /* ---------- recent lists ---------- */
        .section-heading { margin: 34px 0 16px; }
        .section-heading h2 { font-size: 19px; font-weight: 800; margin: 0 0 4px; }
        .section-heading p { margin: 0; color: var(--text-muted); font-size: 13px; }

        .table-wrap { overflow-x: auto; max-height: 420px; overflow-y: auto; }
        table.list-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.list-table th {
          text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--text-muted); font-weight: 700; padding: 10px 12px;
          border-bottom: 2px solid var(--green-50);
          position: sticky; top: 0; background: var(--white);
        }
        table.list-table td {
          padding: 11px 12px; border-bottom: 1px solid var(--green-50);
          color: var(--text-dark); font-weight: 500;
        }
        table.list-table tr:hover td { background: var(--green-50); }
        table.list-table tr:last-child td { border-bottom: none; }

        .member-avatar {
          width: 28px; height: 28px; border-radius: 10px;
          background: var(--green-100); color: var(--green-700);
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 11.5px; margin-right: 9px; flex-shrink: 0;
        }
        .name-cell { display: flex; align-items: center; }

        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
        }
        .badge--counter { background: var(--green-100); color: var(--green-700); }
        .badge--online { background: #eaf3fb; color: #1f6fb2; }
        .badge--cash { background: #fbf3d9; color: #9a7b1e; }
        .badge--transfer { background: var(--green-50); color: var(--green-600); }
        .badge--gold { background: #fdf1d6; color: #b8860b; }
        .badge--silver { background: #eef0f2; color: #6b7280; }
        .badge--basic { background: var(--green-50); color: var(--green-600); }

        .empty-note { text-align: center; color: var(--text-muted); font-size: 13px; padding: 28px 0; }
        .error-note { text-align: center; color: #c0392b; font-size: 13px; padding: 12px 0; font-weight: 600; }
        .loading-note { text-align: center; color: var(--text-muted); font-size: 13px; padding: 28px 0; }

        .footer-note {
          text-align: center; color: var(--text-muted); font-size: 11.5px; margin-top: 30px;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }

        @media (max-width: 980px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .row-2col { grid-template-columns: 1fr; }
          .filters { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .kpi-grid { grid-template-columns: 1fr; }
          .filters { grid-template-columns: 1fr; }
          .dash { padding: 18px 14px 40px; }
        }
      `}</style>

            {/* ================= HEADER ================= */}
            <div className="dash__header">
                <div className="dash__title-wrap">
                    <div className="dash__logo"><Leaf size={24} /></div>
                    <div>
                        <h1 className="dash__title">Báo cáo Thu ngân</h1>
                        <p className="dash__subtitle">Doanh thu &amp; check-in hội viên — cập nhật theo bộ lọc bên dưới</p>
                    </div>
                </div>
                <div className="dash__date-pill">
                    <CalendarClock size={15} />
                    {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
            </div>

            {/* ================= FILTERS ================= */}
            <div className="card filters">
                <FieldSelect
                    label="Thời gian"
                    icon={<CalendarClock size={13} />}
                    value={range}
                    onChange={setRange}
                    options={RANGE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                />
                <FieldSelect
                    label="Phương thức thanh toán"
                    icon={<Wallet size={13} />}
                    value={method}
                    onChange={setMethod}
                    options={[{ value: "Tất cả", label: "Tất cả phương thức" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]}
                />
                <FieldSelect
                    label="Hình thức"
                    icon={<Store size={13} />}
                    value={channel}
                    onChange={setChannel}
                    options={[
                        { value: "Tất cả", label: "Tất cả hình thức" },
                        { value: "Online", label: "Online" },
                        { value: "Tại quầy", label: "Tại quầy" },
                    ]}
                />

                {range === "custom" && (
                    <div className="custom-range">
                        <span className="custom-range__hint">
                            Chọn chính xác ngày &amp; giờ để lọc theo ca làm cụ thể (ví dụ: ca sáng, ca tối...)
                        </span>
                        <div className="field">
                            <label className="field__label">Từ ngày giờ</label>
                            <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                        </div>
                        <div className="field">
                            <label className="field__label">Đến ngày giờ</label>
                            <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="error-note">{error}</p>}
            {loading && <p className="loading-note">Đang tải dữ liệu...</p>}

            {/* ================= KPI: DOANH THU ================= */}
            <div className="kpi-grid">
                <div className="kpi-card" style={{ "--kpi-accent": "var(--green-700)", "--kpi-icon-bg": "var(--green-100)", "--kpi-border": "var(--border-strong)" }}>
                    <div className="kpi-card__stripe" />
                    <div className="kpi-card__body">
                        <div className="kpi-card__top">
                            <div className="kpi-card__icon"><Wallet size={18} /></div>
                        </div>
                        <div className="kpi-card__value">{fmtMoney(totalRevenue)}</div>
                        <div className="kpi-card__label">Tổng doanh thu</div>
                        <div className="kpi-card__desc">Toàn bộ giao dịch trong khoảng đã lọc</div>
                        <span className={`kpi-card__delta ${revenueTrendUp ? "kpi-card__delta--up" : "kpi-card__delta--down"}`}>
                            {revenueTrendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {revenueDeltaPct}% so với nửa đầu kỳ
                        </span>
                    </div>
                </div>

                <div className="kpi-card" style={{ "--kpi-accent": "var(--green-600)", "--kpi-icon-bg": "var(--green-100)" }}>
                    <div className="kpi-card__stripe" />
                    <div className="kpi-card__body">
                        <div className="kpi-card__top">
                            <div className="kpi-card__icon"><Repeat size={18} /></div>
                        </div>
                        <div className="kpi-card__value">{totalOrders.toLocaleString("vi-VN")}</div>
                        <div className="kpi-card__label">Tổng giao dịch</div>
                        <div className="kpi-card__desc">Trung bình {fmtMoneyShort(avgOrder)} / giao dịch</div>
                    </div>
                </div>

                <div className="kpi-card" style={{ "--kpi-accent": "var(--green-500)", "--kpi-icon-bg": "var(--green-100)" }}>
                    <div className="kpi-card__stripe" />
                    <div className="kpi-card__body">
                        <div className="kpi-card__top">
                            <div className="kpi-card__icon"><Store size={18} /></div>
                        </div>
                        <div className="kpi-card__value">{fmtMoneyShort(counterRevenue)}</div>
                        <div className="kpi-card__label">Doanh thu tại quầy</div>
                        <div className="kpi-card__desc">
                            {totalRevenue ? Math.round((counterRevenue / totalRevenue) * 100) : 0}% tổng doanh thu — khách trả trực tiếp
                        </div>
                    </div>
                </div>

                <div className="kpi-card" style={{ "--kpi-accent": "var(--green-400)", "--kpi-icon-bg": "var(--green-100)" }}>
                    <div className="kpi-card__stripe" />
                    <div className="kpi-card__body">
                        <div className="kpi-card__top">
                            <div className="kpi-card__icon"><Globe size={18} /></div>
                        </div>
                        <div className="kpi-card__value">{fmtMoneyShort(onlineRevenue)}</div>
                        <div className="kpi-card__label">Doanh thu online</div>
                        <div className="kpi-card__desc">
                            {totalRevenue ? Math.round((onlineRevenue / totalRevenue) * 100) : 0}% tổng doanh thu — đặt/thanh toán từ xa
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= CHARTS ROW 1: Trend + Payment donut ================= */}
            <div className="row-2col">
                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title">Xu hướng doanh thu theo ngày</h3>
                        <span className="card__hint">{revenueByDay.length} ngày có dữ liệu</span>
                    </div>
                    {revenueByDay.length ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={revenueByDay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2f8a47" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#2f8a47" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eaf7ec" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#66806f" }} axisLine={{ stroke: "#cdeada" }} tickLine={false} />
                                <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fill: "#66806f" }} axisLine={false} tickLine={false} width={50} />
                                <Tooltip
                                    formatter={(v) => [fmtMoney(v), "Doanh thu"]}
                                    contentStyle={{ borderRadius: 14, border: "2px solid #cdeada", boxShadow: "0 8px 20px rgba(38,112,62,0.18)", fontSize: 13 }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#226b38" strokeWidth={2.5} fill="url(#revGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="empty-note">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
                    )}
                </div>

                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title">Theo phương thức thanh toán</h3>
                    </div>
                    {methodBreakdown.length ? (
                        <>
                            <ResponsiveContainer width="100%" height={190}>
                                <PieChart>
                                    <Pie data={methodBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={4}>
                                        {methodBreakdown.map((entry, idx) => (
                                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 14, border: "2px solid #cdeada", fontSize: 12.5 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend">
                                {methodBreakdown.map((m, idx) => (
                                    <div className="pie-legend__row" key={m.name}>
                                        <span className="pie-legend__name">
                                            <span className="legend-dot" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                            {m.name}
                                        </span>
                                        <span className="pie-legend__val">{fmtMoneyShort(m.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="empty-note">Không có dữ liệu.</p>
                    )}
                </div>
            </div>

            {/* ================= CHARTS ROW 2: Channel by day + Quick compare ================= */}
            <div className="row-2col">
                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title">Online và tại quầy theo ngày</h3>
                    </div>
                    {channelByDay.length ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={channelByDay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eaf7ec" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#66806f" }} axisLine={{ stroke: "#cdeada" }} tickLine={false} />
                                <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fill: "#66806f" }} axisLine={false} tickLine={false} width={50} />
                                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 14, border: "2px solid #cdeada", fontSize: 12.5 }} />
                                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                                <Bar dataKey="Tại quầy" stackId="a" fill="#2f8a47" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Online" stackId="a" fill="#a6dcb0" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="empty-note">Không có dữ liệu.</p>
                    )}
                </div>

                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title">So sánh nhanh</h3>
                    </div>

                    <div className="compare-block">
                        <div className="compare-block__title">Kênh bán hàng</div>
                        <div className="compare-row">
                            <span className="compare-row__name">Tại quầy</span>
                            <div className="compare-row__track">
                                <div className="compare-row__fill" style={{ width: `${(counterRevenue / channelMax) * 100}%`, background: "linear-gradient(90deg, var(--green-500), var(--green-700))" }} />
                            </div>
                            <span className="compare-row__val">{fmtMoneyShort(counterRevenue)}</span>
                        </div>
                        <div className="compare-row">
                            <span className="compare-row__name">Online</span>
                            <div className="compare-row__track">
                                <div className="compare-row__fill" style={{ width: `${(onlineRevenue / channelMax) * 100}%`, background: "linear-gradient(90deg, var(--green-300), var(--green-500))" }} />
                            </div>
                            <span className="compare-row__val">{fmtMoneyShort(onlineRevenue)}</span>
                        </div>
                    </div>

                    <div className="compare-block">
                        <div className="compare-block__title">Phương thức thanh toán</div>
                        <div className="compare-row">
                            <span className="compare-row__name">Tiền mặt</span>
                            <div className="compare-row__track">
                                <div className="compare-row__fill" style={{ width: `${(cashRevenue / methodMax) * 100}%`, background: "linear-gradient(90deg, var(--green-500), var(--green-700))" }} />
                            </div>
                            <span className="compare-row__val">{fmtMoneyShort(cashRevenue)}</span>
                        </div>
                        <div className="compare-row">
                            <span className="compare-row__name">Chuyển khoản</span>
                            <div className="compare-row__track">
                                <div className="compare-row__fill" style={{ width: `${(transferRevenue / methodMax) * 100}%`, background: "linear-gradient(90deg, var(--green-300), var(--green-500))" }} />
                            </div>
                            <span className="compare-row__val">{fmtMoneyShort(transferRevenue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= RECENT ACTIVITY ================= */}
            <div className="section-heading">
                <h2>Hoạt động gần đây</h2>
                <p>Giao dịch và lượt check-in hội viên mới nhất theo bộ lọc ở trên</p>
            </div>

            <div className="row-2col">
                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title"><Receipt size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Giao dịch gần đây</h3>
                        <span className="card__hint">Tối đa 15 dòng</span>
                    </div>
                    <div className="table-wrap">
                        {recentOrders.length ? (
                            <table className="list-table">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Số tiền</th>
                                        <th>Phương thức</th>
                                        <th>Hình thức</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((o) => (
                                        <tr key={o.id}>
                                            <td>{fmtDateTime(o.datetime)}</td>
                                            <td style={{ fontWeight: 700, color: "var(--green-700)" }}>{fmtMoney(o.amount)}</td>
                                            <td>
                                                <span className={`badge ${o.method === "Tiền mặt" ? "badge--cash" : "badge--transfer"}`}>{o.method}</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${o.channel === "Online" ? "badge--online" : "badge--counter"}`}>{o.channel}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="empty-note">Không có giao dịch trong khoảng thời gian đã chọn.</p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card__head">
                        <h3 className="card__title"><UserCheck size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Check-in hội viên gần đây</h3>
                        <span className="card__hint">Tối đa 15 dòng</span>
                    </div>
                    <div className="table-wrap">
                        {recentCheckins.length ? (
                            <table className="list-table">
                                <thead>
                                    <tr>
                                        <th>Hội viên</th>
                                        <th>Thời gian</th>
                                        <th>Loại thẻ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCheckins.map((c) => (
                                        <tr key={c.id}>
                                            <td>
                                                <span className="name-cell">
                                                    <span className="member-avatar">{c.member?.split(" ").slice(-1)[0]?.charAt(0)}</span>
                                                    {c.member}
                                                </span>
                                            </td>
                                            <td>{fmtDateTime(c.datetime)}</td>
                                            <td>
                                                <span className={`badge ${c.type === "Hội viên Vàng" ? "badge--gold" : c.type === "Hội viên Bạc" ? "badge--silver" : "badge--basic"}`}>
                                                    {c.type}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="empty-note">Không có check-in trong khoảng thời gian đã chọn.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="footer-note">
                <Leaf size={12} /> Dữ liệu từ hệ thống — cập nhật theo bộ lọc đã chọn
            </div>
        </div>
    );
}