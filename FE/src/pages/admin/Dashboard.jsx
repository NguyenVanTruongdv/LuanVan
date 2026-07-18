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
import { useState } from "react";
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

/**
 * DashboardOverview
 * ------------------------------------------------------------------
 * Nội dung trang "Tổng quan" — dùng làm children của <AdminLayout>.
 * Bản chỉnh sửa: KHÔNG dùng Tailwind, toàn bộ style chuyển sang CSS
 * thuần (nhúng trong thẻ <style> bên dưới, dùng class name riêng).
 * ------------------------------------------------------------------
 */

const STATS = [
    {
        label: "Tổng hội viên",
        value: "12,458",
        change: "+12.5% so với tháng trước",
        trend: "up",
        icon: Users,
        color: "indigo",
    },
    {
        label: "Doanh thu tháng",
        value: "1,248,000,000 đ",
        change: "+18.7% so với tháng trước",
        trend: "up",
        icon: Wallet,
        color: "emerald",
    },

    {
        label: "Chi nhánh",
        value: "5",
        change: "Không đổi",
        trend: "flat",
        icon: Building2,
        color: "sky",
    },
    {
        label: "Nhân viên",
        value: "48",
        change: "+2.1% so với tháng trước",
        trend: "up",
        icon: UserCog,
        color: "purple",
    },
];

const REVENUE_DATA = [
    { month: "Tháng 1", value: 820 },
    { month: "Tháng 2", value: 1120 },
    { month: "Tháng 3", value: 760 },
    { month: "Tháng 4", value: 1180 },
    { month: "Tháng 5", value: 1040 },
    { month: "Tháng 6", value: 1350 },
];

const BRANCH_DATA = [
    { name: "GymFit Quận 1", value: 2845, pct: "22.8%", color: "#6366f1" },
    { name: "GymFit Quận 7", value: 2562, pct: "20.6%", color: "#22c55e" },
    { name: "GymFit Gò Vấp", value: 2341, pct: "18.8%", color: "#f59e0b" },
    { name: "GymFit Bình Thạnh", value: 2527, pct: "20.3%", color: "#a855f7" },
    { name: "GymFit Thủ Đức", value: 2183, pct: "17.5%", color: "#f43f5e" },
];

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

function RevenueChart() {
    const [range, setRange] = useState("6 tháng");
    return (
        <div className="panel panel-revenue">
            <div className="panel-head">
                <h3 className="panel-title">Doanh thu 6 tháng gần nhất</h3>
                <div className="select-wrap">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="select"
                    >
                        <option>6 tháng</option>
                        <option>3 tháng</option>
                        <option>12 tháng</option>
                    </select>
                    <ChevronDown size={13} className="select-chevron" />
                </div>
            </div>

            <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
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

function BranchDonut() {
    const total = BRANCH_DATA.reduce((s, b) => s + b.value, 0);
    return (
        <div className="panel panel-branch">
            <h3 className="panel-title">Hội viên theo chi nhánh</h3>

            <div className="donut-row">
                <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={BRANCH_DATA}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={2}
                                stroke="none"
                            >
                                {BRANCH_DATA.map((b, i) => (
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
                    {BRANCH_DATA.map((b) => (
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

            {/* stat cards */}
            <div className="stat-grid">
                {STATS.map((s) => (
                    <StatCard key={s.label} stat={s} />
                ))}
            </div>

            {/* charts */}
            <div className="charts-row">
                <RevenueChart />
                <BranchDonut />
            </div>
        </div>
    );
}