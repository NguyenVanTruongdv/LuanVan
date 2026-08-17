import {
    Building2,
    ChevronDown,
    Minus,
    TrendingDown,
    TrendingUp,
    UserCog,
    Users,
    Wallet
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import adminApi from "../../api/adminApi"; // TODO: chỉnh lại đường dẫn cho khớp cấu trúc thư mục thật của bạn

/**
 * DashboardOverview
 * ------------------------------------------------------------------
 * Nội dung trang "Tổng quan" — dùng làm children của <AdminLayout>.
 * Bản chỉnh sửa: gọi API thật GET /api/dashboard/admin-overview thay
 * cho dữ liệu cứng, KHÔNG dùng Tailwind, style thuần CSS nhúng trong
 * thẻ <style> bên dưới.
 * ------------------------------------------------------------------
 */

// Bảng màu để gán vòng tròn cho donut theo chi nhánh (BE không trả màu)
const BRANCH_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#a855f7", "#f43f5e", "#0ea5e9", "#eab308", "#14b8a6"];

const MONTHS_OPTIONS = [
    { label: "6 tháng", value: 6 },
    { label: "3 tháng", value: 3 },
    { label: "12 tháng", value: 12 },
];

function formatCurrencyVnd(value) {
    const n = Number(value) || 0;
    return `${n.toLocaleString("vi-VN")} đ`;
}

function formatChangeText(percent) {
    if (percent === null || percent === undefined) return "Không đổi";
    const rounded = Math.round(Math.abs(percent) * 10) / 10;
    if (rounded === 0) return "Không đổi";
    const sign = percent > 0 ? "+" : "-";
    return `${sign}${rounded}% so với tháng trước`;
}

function trendFromPercent(percent) {
    if (!percent) return "flat";
    return percent > 0 ? "up" : "down";
}

function TrendBadge({ trend, children }) {
    const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const cls =
        trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-flat";
    return (
        <span className={`trend-badge ${cls}`}>
            <Icon size={13} />
            {children}
        </span>
    );
}

function StatCard({ stat }) {
    const Icon = stat.icon;
    return (
        <div className="stat-card">
            <div className="stat-card-head">
                <div className={`stat-icon stat-icon--${stat.color}`}>
                    <Icon size={18} strokeWidth={2} />
                </div>
                <p className="stat-label">{stat.label}</p>
            </div>
            <p className="stat-value">{stat.value}</p>
            <div className="stat-change">
                <TrendBadge trend={stat.trend}>{stat.change}</TrendBadge>
            </div>
        </div>
    );
}

function RevenueChart({ data, months, onMonthsChange }) {
    return (
        <div className="panel panel-revenue">
            <div className="panel-head">
                <h3 className="panel-title">Doanh thu {months} tháng gần nhất</h3>
                <div className="select-wrap">
                    <select
                        value={months}
                        onChange={(e) => onMonthsChange(Number(e.target.value))}
                        className="select"
                    >
                        {MONTHS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="select-chevron" />
                </div>
            </div>

            <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}M`}
                        />
                        <Tooltip
                            formatter={(v) => [`${v}M đ`, "Doanh thu"]}
                            contentStyle={{
                                borderRadius: 10,
                                border: "1px solid #e2e8f0",
                                fontSize: 12,
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            fill="url(#revenueFill)"
                            dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function BranchDonut({ data }) {
    const total = data.reduce((s, b) => s + b.value, 0);
    return (
        <div className="panel panel-branch">
            <h3 className="panel-title">Hội viên theo chi nhánh</h3>

            <div className="donut-row">
                <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={2}
                                stroke="none"
                            >
                                {data.map((b, i) => (
                                    <Cell key={i} fill={b.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                        <p className="donut-total">{total.toLocaleString()}</p>
                        <p className="donut-total-label">Tổng</p>
                    </div>
                </div>

                <div className="legend">
                    {data.length === 0 && (
                        <p className="legend-empty">Chưa có dữ liệu hội viên theo chi nhánh</p>
                    )}
                    {data.map((b) => (
                        <div key={b.name} className="legend-row">
                            <span className="legend-dot" style={{ backgroundColor: b.color }} />
                            <span className="legend-name">{b.name}</span>
                            <span className="legend-value">
                                {b.value.toLocaleString()} ({b.pct})
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function DashboardOverview() {
    const [months, setMonths] = useState(6);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function fetchOverview() {
            setLoading(true);
            setError(null);
            try {
                const res = await adminApi.getAdminOverview({ months });
                // authApi có thể trả thẳng data hoặc bọc trong { data }, tuỳ config —
                // fallback cả 2 trường hợp cho an toàn.
                const payload = res?.data ?? res;
                if (!ignore) setOverview(payload);
            } catch (err) {
                console.error("Lỗi khi tải dashboard tổng quan:", err);
                if (!ignore) setError("Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        fetchOverview();
        return () => {
            ignore = true;
        };
    }, [months]);

    // ---- Map dữ liệu BE -> format hiển thị cho STATS ----
    const stats = overview?.stats;

    const STATS = [
        {
            label: "Tổng hội viên",
            value: stats ? stats.totalMembers.toLocaleString("vi-VN") : "—",
            change: formatChangeText(stats?.totalMembersChangePercent),
            trend: trendFromPercent(stats?.totalMembersChangePercent),
            icon: Users,
            color: "indigo",
        },
        {
            label: "Doanh thu tháng",
            value: stats ? formatCurrencyVnd(stats.monthlyRevenue) : "—",
            change: formatChangeText(stats?.monthlyRevenueChangePercent),
            trend: trendFromPercent(stats?.monthlyRevenueChangePercent),
            icon: Wallet,
            color: "emerald",
        },
        {
            label: "Chi nhánh",
            value: stats ? String(stats.branchCount) : "—",
            change: "Tổng số chi nhánh hiện tại",
            trend: "flat",
            icon: Building2,
            color: "sky",
        },
        {
            label: "Nhân viên",
            value: stats ? stats.employeeCount.toLocaleString("vi-VN") : "—",
            change: formatChangeText(stats?.employeeChangePercent),
            trend: trendFromPercent(stats?.employeeChangePercent),
            icon: UserCog,
            color: "purple",
        },
    ];

    // ---- Map dữ liệu doanh thu theo tháng -> đơn vị triệu (M) cho chart ----
    const REVENUE_DATA = (overview?.revenueByMonth ?? []).map((r) => ({
        month: r.monthLabel,
        value: Math.round((Number(r.revenue) || 0) / 1_000_000),
    }));

    // ---- Map dữ liệu hội viên theo chi nhánh, tự gán màu ----
    const BRANCH_DATA = (overview?.memberByBranch ?? []).map((b, i) => ({
        name: b.branchName,
        value: b.memberCount,
        pct: `${b.percent}%`,
        color: BRANCH_COLORS[i % BRANCH_COLORS.length],
    }));

    return (
        <div className="dashboard">
            <style>{`
        .dashboard, .dashboard *, .dashboard *::before, .dashboard *::after {
          box-sizing: border-box;
        }
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }

        /* welcome */
        .welcome-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .welcome-sub {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .error-banner {
          border-radius: 10px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
        }

        /* stat cards grid — auto-fit tự co giãn theo bề rộng thật của khối cha,
           không phụ thuộc breakpoint cứng theo viewport, nên khi có sidebar
           thu hẹp không gian, card vẫn tự xuống dòng thay vì tràn ngang */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
          gap: 16px;
        }

        .stat-card {
          min-width: 0;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 16px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1), 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .stat-card-head {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .stat-icon {
          display: flex;
          height: 40px;
          width: 40px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .stat-icon--indigo { color: #4f46e5; background: #eef2ff; }
        .stat-icon--emerald { color: #059669; background: #ecfdf5; }
        .stat-icon--orange  { color: #ea580c; background: #fff7ed; }
        .stat-icon--sky     { color: #0284c7; background: #f0f9ff; }
        .stat-icon--purple  { color: #9333ea; background: #faf5ff; }

        .stat-label {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
          margin: 0;
          min-width: 70px;
          overflow-wrap: break-word;
        }
        .stat-value {
          margin: 12px 0 0;
          font-size: clamp(18px, 2.2vw, 24px);
          font-weight: 700;
          color: #0f172a;
          overflow-wrap: break-word;
        }
        .stat-change { margin-top: 6px; }
        .stat-change .trend-badge { flex-wrap: wrap; }

        .trend-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .trend-up   { color: #059669; }
        .trend-down { color: #e11d48; }
        .trend-flat { color: #94a3b8; }

        /* charts row — flex-wrap co giãn theo bề rộng thật của container,
           panel doanh thu ưu tiên rộng hơn nhưng tự nhường chỗ khi chật */
        .charts-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }
        .charts-row > .panel-revenue {
          flex: 2 1 420px;
          min-width: 0;
        }
        .charts-row > .panel-branch {
          flex: 1 1 280px;
          min-width: 0;
        }

        .panel {
          min-width: 0;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 20px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1), 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .panel-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          overflow-wrap: break-word;
        }

        .select-wrap { position: relative; flex-shrink: 0; }
        .select {
          appearance: none;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 6px 30px 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          max-width: 100%;
        }
        .select:focus {
          outline: none;
          box-shadow: 0 0 0 2px #e0e7ff;
        }
        .select-chevron {
          pointer-events: none;
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .chart-box {
          margin-top: 16px;
          width: 100%;
          height: clamp(180px, 28vw, 260px);
        }

        /* donut — dùng flex-wrap để tự động xuống dòng theo bề rộng thật,
           kích thước donut co giãn bằng clamp + aspect-ratio thay vì px cứng */
        .donut-row {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }
        .donut-wrap {
          position: relative;
          width: clamp(140px, 30%, 176px);
          aspect-ratio: 1 / 1;
          flex-shrink: 0;
        }
        .donut-center {
          pointer-events: none;
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .donut-total {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .donut-total-label {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        .legend {
          flex: 1 1 180px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .legend-empty {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
        }
        .legend-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          min-width: 0;
        }
        .legend-dot {
          height: 10px;
          width: 10px;
          flex-shrink: 0;
          border-radius: 999px;
        }
        .legend-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #334155;
          font-weight: 500;
        }
        .legend-value { color: #64748b; font-weight: 500; }
      `}</style>

            {/* welcome */}
            <div>
                <h1 className="welcome-title">
                    Xin chào, Admin <span>👋</span>
                </h1>
                <p className="welcome-sub">
                    Chào mừng bạn đến với hệ thống quản lý phòng Gym
                </p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* stat cards */}
            <div className="stat-grid">
                {STATS.map((s) => (
                    <StatCard key={s.label} stat={s} />
                ))}
            </div>

            {/* charts */}
            <div className="charts-row">
                <RevenueChart data={REVENUE_DATA} months={months} onMonthsChange={setMonths} />
                <BranchDonut data={BRANCH_DATA} />
            </div>

            {loading && !overview && (
                <p className="welcome-sub" style={{ textAlign: "center" }}>
                    Đang tải dữ liệu...
                </p>
            )}
        </div>
    );
}