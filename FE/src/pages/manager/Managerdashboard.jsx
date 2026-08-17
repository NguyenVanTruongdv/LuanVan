import {
    AlertTriangle,
    ChevronDown,
    Minus,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
    Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import adminApi from "../../api/managerApi"; // TODO: đổi path cho đúng dự án

/**
 * ManagerDashboardOverview
 * ------------------------------------------------------------------
 * Trang "Tổng quan" cho Manager — dùng làm children của layout Manager.
 * Gọi GET /api/dashboard/manager, BE tự lọc theo branchId trong token.
 * Không dùng Tailwind, style thuần CSS nhúng trong <style>.
 * ------------------------------------------------------------------
 */

const RANGE_OPTIONS = [
    { label: "Hôm nay", value: "today" },
    { label: "7 ngày qua", value: "7d" },
    { label: "30 ngày qua", value: "30d" },
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
    return `${sign}${rounded}% so với kỳ trước`;
}

function trendFromPercent(percent) {
    if (!percent) return "flat";
    return percent > 0 ? "up" : "down";
}

function TrendBadge({ trend, children }) {
    const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const cls = trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-flat";
    return (
        <span className={`trend-badge ${cls}`}>
            <Icon size={13} />
            {children}
        </span>
    );
}

function StatCard({ label, value, change, trend, icon: Icon, color }) {
    return (
        <div className="stat-card">
            <div className="stat-card-head">
                <div className={`stat-icon stat-icon--${color}`}>
                    <Icon size={18} strokeWidth={2} />
                </div>
                <p className="stat-label">{label}</p>
            </div>
            <p className="stat-value">{value}</p>
            <div className="stat-change">
                <TrendBadge trend={trend}>{change}</TrendBadge>
            </div>
        </div>
    );
}

/**
 * Vòng tròn tiến độ đơn giản bằng SVG.
 *
 * FIX: trước đây `pct` bị Math.min(1, ...) nên MỌI giá trị >= 100%
 * (kỳ này bằng hoặc vượt kỳ trước) đều hiển thị đúng "100%", không
 * phân biệt được tăng 5% hay tăng 500%.
 *
 * Giờ đây:
 * - `value` truyền vào KHÔNG bị cap ở BE nữa (xem fix BuildManagerKpi ở BE),
 *   nên có thể > 1 (ví dụ 1.5 = tăng 150% so với kỳ trước).
 * - Số hiển thị ở giữa vòng tròn (`displayPct`) luôn đúng thực tế, không cap.
 * - Riêng phần VẼ vòng tròn (`ringPct`) vẫn phải cap ở 1 vòng tròn đầy (100%)
 *   vì mặt hình học không thể vẽ "vượt" quá 1 vòng — nhưng khi vượt mốc
 *   100% sẽ đổi màu + thêm icon nhỏ báo hiệu để không gây hiểu lầm là
 *   "đúng bằng kỳ trước".
 */
function ProgressRing({ label, value, colorFrom, colorTo, overflowColor = "#16a34a" }) {
    const rawValue = value || 0;
    const isOverflow = rawValue > 1;

    const ringPct = Math.max(0, Math.min(1, rawValue)); // chỉ dùng để vẽ, luôn 0–100%
    const displayPct = Math.round(rawValue * 100); // số thật hiển thị, không cap

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - ringPct);
    const gradientId = `ring-${label.replace(/\s/g, "-")}`;

    return (
        <div className="ring-item">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={isOverflow ? overflowColor : colorFrom} />
                        <stop offset="100%" stopColor={isOverflow ? overflowColor : colorTo} />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                />
                <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a">
                    {displayPct}%
                </text>
            </svg>
            {isOverflow && (
                <span className="ring-overflow-badge" style={{ color: overflowColor }}>
                    ▲ Vượt kỳ trước
                </span>
            )}
            <p className="ring-label">{label}</p>
        </div>
    );
}

function RevenueTrendChart({ data, range, onRangeChange }) {
    return (
        <div className="panel panel-revenue">
            <div className="panel-head">
                <h3 className="panel-title">Doanh thu theo thời gian</h3>
                <div className="select-wrap">
                    <select value={range} onChange={(e) => onRangeChange(e.target.value)} className="select">
                        {RANGE_OPTIONS.map((opt) => (
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
                            <linearGradient id="mgrRevenueFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}K`}
                        />
                        <Tooltip
                            formatter={(v) => [`${(v * 1000).toLocaleString("vi-VN")} đ`, "Doanh thu"]}
                            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            fill="url(#mgrRevenueFill)"
                            dot={{ r: 3, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

const STATUS_LABEL = { active: "Còn hạn", expiring: "Sắp hết hạn", expired: "Hết hạn" };
const STATUS_CLASS = { active: "badge-ok", expiring: "badge-warn", expired: "badge-danger" };

function RecentMembersPanel({ members }) {
    return (
        <div className="panel panel-members">
            <h3 className="panel-title">Hội viên check-in gần đây</h3>
            <div className="table-wrap table-wrap--scroll">
                <table className="mini-table">
                    <thead>
                        <tr>
                            <th>Hội viên</th>
                            <th>Gói tập</th>
                            <th>Giờ check-in</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 && (
                            <tr><td colSpan={4} className="empty-cell">Chưa có check-in nào</td></tr>
                        )}
                        {members.map((m, i) => (
                            <tr key={i}>
                                <td>{m.memberName}</td>
                                <td>{m.planName || "—"}</td>
                                <td>{new Date(m.checkInTime).toLocaleString("vi-VN")}</td>
                                <td>
                                    <span className={`badge ${STATUS_CLASS[m.status] || "badge-warn"}`}>
                                        {STATUS_LABEL[m.status] || m.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const SEVERITY_CLASS = { high: "badge-danger", medium: "badge-warn", low: "badge-ok" };
const SEVERITY_LABEL = { high: "Cao", medium: "Trung bình", low: "Thấp" };

function IssuesPanel({ issues }) {
    return (
        <div className="panel panel-issues">
            <div className="panel-head">
                <h3 className="panel-title">
                    <AlertTriangle size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Sự cố chưa xử lý
                </h3>
                <span className="count-pill">{issues.length}</span>
            </div>
            <div className="issue-list">
                {issues.length === 0 && <p className="empty-cell">Không có sự cố nào đang chờ xử lý 🎉</p>}
                {issues.map((i) => (
                    <div key={i.issueId} className="issue-row">
                        <div className="issue-row-top">
                            <span className="issue-title">{i.title}</span>
                            <span className={`badge ${SEVERITY_CLASS[i.severity] || "badge-warn"}`}>
                                {SEVERITY_LABEL[i.severity] || i.severity}
                            </span>
                        </div>
                        <p className="issue-desc">{i.description}</p>
                        <div className="issue-row-meta">
                            <span>{i.area}</span>
                            <span>•</span>
                            <span>{i.reporter}</span>
                            <span>•</span>
                            <span>{new Date(i.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const EQUIPMENT_CLASS = { ok: "badge-ok", warn: "badge-warn", danger: "badge-danger" };
const EQUIPMENT_LABEL = { ok: "Hoạt động tốt", warn: "Cần bảo trì", danger: "Ngừng hoạt động" };

function EquipmentPanel({ equipment }) {
    return (
        <div className="panel panel-equipment">
            <h3 className="panel-title">
                <Wrench size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                Tình trạng thiết bị
            </h3>
            <div className="equipment-list">
                {equipment.length === 0 && <p className="empty-cell">Chưa có thiết bị nào</p>}
                {equipment.map((e) => (
                    <div key={e.equipmentId} className="equipment-row">
                        <div className="equipment-row-main">
                            <span className="equipment-name">{e.name}</span>
                            <span className="equipment-meta">{e.category} • {e.area}</span>
                            {e.note && <span className="equipment-note">{e.note}</span>}
                        </div>
                        <span className={`badge ${EQUIPMENT_CLASS[e.status] || "badge-ok"}`}>
                            {EQUIPMENT_LABEL[e.status] || e.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ManagerDashboardOverview() {
    const [range, setRange] = useState("7d");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function fetchDashboard() {
            setLoading(true);
            setError(null);
            try {
                const res = await adminApi.getManagerDashboard({ range });
                const payload = res?.data ?? res;
                if (!ignore) setData(payload);
            } catch (err) {
                console.error("Lỗi khi tải dashboard quản lý:", err);
                if (!ignore) setError("Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        fetchDashboard();
        return () => { ignore = true; };
    }, [range]);

    const kpi = data?.kpi;

    const STATS = [
        {
            label: "Doanh thu",
            value: kpi ? formatCurrencyVnd(kpi.totalRevenue) : "—",
            change: formatChangeText(kpi?.revenueChangePercent),
            trend: trendFromPercent(kpi?.revenueChangePercent),
            icon: Wallet,
            color: "emerald",
        },
        {
            label: "Hội viên hoạt động",
            value: kpi ? String(kpi.activeMembersCount) : "—",
            change: kpi ? `${Math.round((kpi.activeMemberRatio || 0) * 100)}% trong danh sách gần đây` : "—",
            trend: "flat",
            icon: Users,
            color: "indigo",
        },
        {
            label: "Sự cố chưa xử lý",
            value: kpi ? String(kpi.unresolvedIssuesCount) : "—",
            change: kpi && kpi.unresolvedIssuesCount > 0 ? "Cần xử lý sớm" : "Không có sự cố",
            trend: kpi && kpi.unresolvedIssuesCount > 0 ? "down" : "flat",
            icon: AlertTriangle,
            color: "orange",
        },
    ];

    const revenueChartData = (data?.revenueTrend ?? []).map((r) => ({
        label: new Date(r.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        value: Math.round((Number(r.revenue) || 0) / 1000),
    }));

    return (
        <div className="mgr-dashboard">
            <style>{`
        .mgr-dashboard, .mgr-dashboard *, .mgr-dashboard *::before, .mgr-dashboard *::after {
          box-sizing: border-box;
        }
        .mgr-dashboard {
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

        .welcome-title { display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 700; margin: 0; }
        .welcome-sub { margin: 4px 0 0; font-size: 14px; color: #64748b; font-weight: 500; }

        .error-banner {
          border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2;
          color: #b91c1c; padding: 10px 14px; font-size: 13px; font-weight: 500;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
          gap: 16px;
        }
        .stat-card {
          min-width: 0; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff;
          padding: 16px; box-shadow: 0 4px 14px rgba(15,23,42,0.1), 0 1px 3px rgba(15,23,42,0.08);
        }
        .stat-card-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .stat-icon {
          display: flex; height: 40px; width: 40px; flex-shrink: 0;
          align-items: center; justify-content: center; border-radius: 8px;
        }
        .stat-icon--indigo { color: #4f46e5; background: #eef2ff; }
        .stat-icon--emerald { color: #059669; background: #ecfdf5; }
        .stat-icon--orange  { color: #ea580c; background: #fff7ed; }
        .stat-label { font-size: 14px; color: #475569; font-weight: 500; margin: 0; min-width: 70px; overflow-wrap: break-word; }
        .stat-value { margin: 12px 0 0; font-size: clamp(18px, 2.2vw, 24px); font-weight: 700; overflow-wrap: break-word; }
        .stat-change { margin-top: 6px; }
        .stat-change .trend-badge { flex-wrap: wrap; }
        .trend-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
        .trend-up { color: #059669; }
        .trend-down { color: #e11d48; }
        .trend-flat { color: #94a3b8; }

        /* rings */
        .ring-panel {
          border-radius: 12px; border: 1px solid #cbd5e1; background: #fff;
          padding: 20px; box-shadow: 0 4px 14px rgba(15,23,42,0.1), 0 1px 3px rgba(15,23,42,0.08);
          display: flex; flex-wrap: wrap; justify-content: space-around; gap: 16px;
        }
        .ring-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ring-label { font-size: 13px; color: #475569; font-weight: 500; margin: 0; text-align: center; }
        .ring-overflow-badge {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
          margin-top: -4px;
        }

        .charts-row { display: flex; flex-wrap: wrap; gap: 24px; }
        .charts-row > .panel-revenue { flex: 2 1 420px; min-width: 0; }

        .panel {
          min-width: 0; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff;
          padding: 20px; box-shadow: 0 4px 14px rgba(15,23,42,0.1), 0 1px 3px rgba(15,23,42,0.08);
        }
        .panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
        .panel-title { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0; overflow-wrap: break-word; display: flex; align-items: center; }

        .select-wrap { position: relative; flex-shrink: 0; }
        .select {
          appearance: none; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
          padding: 6px 30px 6px 12px; font-size: 12px; font-weight: 500; color: #475569; cursor: pointer; max-width: 100%;
        }
        .select:focus { outline: none; box-shadow: 0 0 0 2px #e0e7ff; }
        .select-chevron { pointer-events: none; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }

        .chart-box { margin-top: 16px; width: 100%; height: clamp(180px, 28vw, 260px); }

        .bottom-row { display: flex; flex-wrap: wrap; gap: 24px; }
        .bottom-row > .panel-members { flex: 3 1 480px; min-width: 0; }
        .bottom-row > .panel-issues  { flex: 2 1 320px; min-width: 0; }

        .table-wrap { margin-top: 12px; overflow-x: auto; }
        .table-wrap--scroll { max-height: 340px; overflow-y: auto; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .mini-table th {
          text-align: left; padding: 8px 10px; color: #64748b; font-weight: 600;
          border-bottom: 1px solid #e2e8f0; white-space: nowrap;
          position: sticky; top: 0; background: #fff; z-index: 1;
        }
        .mini-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }

        .badge {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
        }
        .badge-ok { color: #059669; background: #ecfdf5; }
        .badge-warn { color: #d97706; background: #fffbeb; }
        .badge-danger { color: #e11d48; background: #fff1f2; }

        .count-pill {
          background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700;
          padding: 2px 10px; border-radius: 999px;
        }

        .issue-list { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
        .issue-row { border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px; }
        .issue-row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .issue-title { font-size: 13px; font-weight: 600; color: #0f172a; }
        .issue-desc { margin: 6px 0 0; font-size: 12px; color: #64748b; }
        .issue-row-meta { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: #94a3b8; }

        .equipment-list {
          margin-top: 12px; display: flex; flex-direction: column; gap: 8px;
          max-height: 340px; overflow-y: auto;
        }
        .equipment-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px;
        }
        .equipment-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .equipment-name { font-size: 13px; font-weight: 600; color: #0f172a; }
        .equipment-meta { font-size: 12px; color: #64748b; }
        .equipment-note { font-size: 11px; color: #94a3b8; font-style: italic; }

        .empty-cell { text-align: center; color: #94a3b8; font-size: 13px; padding: 16px 0; }
      `}</style>

            <div>
                <h1 className="welcome-title">
                    Xin chào, Quản lý <span>👋</span>
                </h1>
                <p className="welcome-sub">
                    {data ? `Chi nhánh: ${data.branchName}` : "Đang tải thông tin chi nhánh..."}
                </p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="stat-grid">
                {STATS.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            <div className="ring-panel">
                <ProgressRing
                    label="Doanh thu so với kỳ trước"
                    value={kpi?.revenueGoalProgress}
                    colorFrom="#6366f1"
                    colorTo="#a855f7"
                />
                <ProgressRing
                    label="Tỉ lệ hội viên còn hạn"
                    value={kpi?.activeMemberRatio}
                    colorFrom="#22c55e"
                    colorTo="#059669"
                />
                <ProgressRing
                    label="Tỉ lệ sự cố đã xử lý"
                    value={kpi?.issueResolvedRatio}
                    colorFrom="#f59e0b"
                    colorTo="#ea580c"
                />
            </div>

            <div className="charts-row">
                <RevenueTrendChart data={revenueChartData} range={range} onRangeChange={setRange} />
            </div>

            <div className="bottom-row">
                <RecentMembersPanel members={data?.recentMembers ?? []} />
                <IssuesPanel issues={data?.unresolvedIssues ?? []} />
            </div>

            <EquipmentPanel equipment={data?.equipmentStatus ?? []} />

            {loading && !data && (
                <p className="welcome-sub" style={{ textAlign: "center" }}>Đang tải dữ liệu...</p>
            )}
        </div>
    );
}