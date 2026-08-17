import { useCallback, useEffect, useMemo, useState } from "react";

import adminApi from "../../../api/adminApi";
import "./ReportDashboard.css";

/* ============================================================================
 * Helpers
 * ==========================================================================*/

const currencyFmt = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat("vi-VN");

const formatCurrency = (n) => currencyFmt.format(Number(n) || 0);
const formatNumber = (n) => numberFmt.format(Number(n) || 0);

const toISODate = (d) => {
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatShortDate = (isoOrDate) => {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const WEEKDAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const formatFullDateVi = (d) => {
    const pad = (x) => String(x).padStart(2, "0");
    return `${WEEKDAYS_VI[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const PRESETS = [
    { key: "7d", label: "7 ngày qua", days: 7 },
    { key: "30d", label: "30 ngày qua", days: 30 },
    { key: "90d", label: "90 ngày qua", days: 90 },
    { key: "custom", label: "Tùy chọn khoảng ngày", days: null },
];

const getPresetRange = (presetKey) => {
    const preset = PRESETS.find((p) => p.key === presetKey) || PRESETS[1];
    if (!preset.days) return null;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (preset.days - 1));
    return { from: toISODate(from), to: toISODate(to) };
};

/* ============================================================================
 * Icons (inline SVG — không phụ thuộc thư viện ngoài)
 * ==========================================================================*/

const iconProps = (size) => ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
});

const IconLeaf = ({ size = 24 }) => (
    <svg {...iconProps(size)}>
        <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-10 1 6 3 9 3 13a7 7 0 0 1-5 4Z" />
        <path d="M11.5 10.5 4.5 17.5" />
    </svg>
);
const IconCalendar = ({ size = 16 }) => (
    <svg {...iconProps(size)}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
);
const IconWallet = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M16 13h3v3h-3a1.5 1.5 0 0 1 0-3Z" />
    </svg>
);
const IconUsers = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.2A3.2 3.2 0 0 1 16.5 10.5" />
        <path d="M15.5 14.2A5.8 5.8 0 0 1 21.5 20" />
    </svg>
);
const IconBriefcase = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.5" />
        <path d="M8 7.5V6a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 16 6v1.5" />
        <path d="M2.5 13h19" />
    </svg>
);
const IconAlert = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <path d="M10.6 3.9 2.4 18a1.8 1.8 0 0 0 1.55 2.7h16.1A1.8 1.8 0 0 0 21.6 18L13.4 3.9a1.8 1.8 0 0 0-3 0Z" />
        <path d="M12 9.5v4M12 17h.01" />
    </svg>
);
const IconBox = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
    </svg>
);
const IconLogin = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <path d="M10 17V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2Z" />
        <path d="M2 12h11.5M9.5 8.5 13 12l-3.5 3.5" />
    </svg>
);
const IconBranch = ({ size = 16 }) => (
    <svg {...iconProps(size)}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
);
const IconChart = ({ size = 20 }) => (
    <svg {...iconProps(size)}>
        <path d="M4 20V10M11 20V4M18 20v-7" />
        <path d="M2 20h20" />
    </svg>
);
const IconTrendUp = ({ size = 12 }) => (
    <svg {...iconProps(size)}>
        <path d="m3 16 6-6 4 4 8-8" />
        <path d="M15 6h6v6" />
    </svg>
);
const IconInbox = ({ size = 34 }) => (
    <svg {...iconProps(size)}>
        <path d="M3 12h4.5l2 3h5l2-3H21" />
        <path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l2.5-7Z" />
    </svg>
);
const IconRefresh = ({ size = 14 }) => (
    <svg {...iconProps(size)}>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
    </svg>
);

const TAB_ICONS = {
    overview: IconChart,
    members: IconUsers,
    employees: IconBriefcase,
    incidents: IconAlert,
    equipment: IconBox,
    checkins: IconLogin,
    revenue: IconWallet,
};

/* ============================================================================
 * Small reusable UI pieces
 * ==========================================================================*/

function StatCard({ icon: Icon, value, label, sub, trend }) {
    return (
        <div className="rpt-stat-card">
            <div className="rpt-stat-icon">
                <Icon size={20} />
            </div>
            <div className="rpt-stat-value">{value}</div>
            <div className="rpt-stat-label">{label}</div>
            {sub ? <div className="rpt-stat-sub">{sub}</div> : null}
            {trend ? (
                <div className={`rpt-stat-trend${trend.down ? " down" : ""}`}>
                    <IconTrendUp size={11} /> {trend.text}
                </div>
            ) : null}
        </div>
    );
}

function StatSkeleton({ count = 4 }) {
    return (
        <div className="rpt-stat-grid">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rpt-skeleton rpt-stat-skel" />
            ))}
        </div>
    );
}

function EmptyState({ title = "Không có dữ liệu", sub = "Không có dữ liệu trong khoảng thời gian đã chọn." }) {
    return (
        <div className="rpt-empty">
            <div className="rpt-empty-icon">
                <IconInbox />
            </div>
            <div className="rpt-empty-title">{title}</div>
            <div className="rpt-empty-sub">{sub}</div>
        </div>
    );
}

function Panel({ title, meta, children }) {
    return (
        <div className="rpt-panel">
            <div className="rpt-panel-head">
                <h3 className="rpt-panel-title">{title}</h3>
                {meta ? <span className="rpt-panel-meta">{meta}</span> : null}
            </div>
            {children}
        </div>
    );
}

/** Biểu đồ cột theo ngày, dựng bằng CSS thuần (không cần thư viện chart). */
function DailyTrendChart({ data, dateKey = "date", valueKey = "value", formatValue = formatNumber }) {
    if (!data || data.length === 0) {
        return <EmptyState title="Chưa có xu hướng" sub="Không có dữ liệu trong khoảng thời gian đã chọn." />;
    }
    const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
    const showEvery = data.length > 14 ? Math.ceil(data.length / 10) : 1;

    return (
        <>
            <div className="rpt-trend">
                {data.map((d, i) => {
                    const v = Number(d[valueKey]) || 0;
                    const h = Math.max((v / max) * 100, v > 0 ? 4 : 1.5);
                    return (
                        <div className="rpt-trend-col" key={i}>
                            <div className="rpt-trend-tooltip">
                                {formatShortDate(d[dateKey])} · {formatValue(v)}
                            </div>
                            <div className="rpt-trend-bar" style={{ height: `${h}%` }} />
                        </div>
                    );
                })}
            </div>
            <div className="rpt-trend-axis">
                {data
                    .filter((_, i) => i % showEvery === 0 || i === data.length - 1)
                    .map((d, i) => (
                        <span key={i}>{formatShortDate(d[dateKey])}</span>
                    ))}
            </div>
        </>
    );
}

/** Danh sách xếp hạng dạng thanh ngang (theo chi nhánh, vai trò, danh mục...) */
function RankedBarList({ items, labelKey = "label", valueKey = "value", formatValue = formatNumber, emptyTitle = "Chưa có dữ liệu" }) {
    if (!items || items.length === 0) {
        return <EmptyState title={emptyTitle} sub="Không có dữ liệu trong khoảng thời gian đã chọn." />;
    }
    const max = Math.max(...items.map((it) => Number(it[valueKey]) || 0), 1);
    return (
        <div className="rpt-ranked-list">
            {items.map((it, i) => {
                const v = Number(it[valueKey]) || 0;
                return (
                    <div key={i}>
                        <div className="rpt-ranked-item-head">
                            <span className="rpt-ranked-item-name">
                                <span className="rpt-rank-badge">{i + 1}</span>
                                {it[labelKey]}
                            </span>
                            <span className="rpt-ranked-item-value">{formatValue(v)}</span>
                        </div>
                        <div className="rpt-ranked-track">
                            <div className="rpt-ranked-fill" style={{ width: `${(v / max) * 100}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const STATUS_COLORS = ["#1f8a4f", "#2f9e5e", "#c98a1f", "#d64545", "#8a9c92", "#2f77c9"];

/** Thanh trạng thái dạng stacked bar + chú thích (ví dụ: sự cố theo trạng thái) */
function StatusBreakdown({ segments }) {
    const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0);
    if (total === 0) {
        return <EmptyState title="Chưa có dữ liệu trạng thái" sub="Không có dữ liệu trong khoảng thời gian đã chọn." />;
    }
    return (
        <>
            <div className="rpt-status-bar">
                {segments.map((seg, i) =>
                    seg.value > 0 ? (
                        <div
                            key={i}
                            className="rpt-status-seg"
                            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
                            title={`${seg.label}: ${formatNumber(seg.value)}`}
                        />
                    ) : null
                )}
            </div>
            <div className="rpt-status-legend">
                {segments.map((seg, i) => (
                    <span className="rpt-status-legend-item" key={i}>
                        <span className="rpt-status-dot" style={{ background: seg.color }} />
                        {seg.label}: <span className="rpt-status-legend-value">{formatNumber(seg.value)}</span>
                    </span>
                ))}
            </div>
        </>
    );
}

function DataTable({ columns, rows, emptyTitle = "Chưa có dữ liệu" }) {
    if (!rows || rows.length === 0) {
        return <EmptyState title={emptyTitle} sub="Không có dữ liệu trong khoảng thời gian đã chọn." />;
    }
    return (
        <div className="rpt-table-wrap">
            <table className="rpt-table">
                <thead>
                    <tr>
                        {columns.map((c) => (
                            <th key={c.key} className={c.num ? "num" : ""}>
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i}>
                            {columns.map((c) => (
                                <td key={c.key} className={c.num ? "num" : ""}>
                                    {c.render ? c.render(row) : row[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ============================================================================
 * Main component
 * ==========================================================================*/

const TABS = [
    { key: "overview", label: "Tổng quan" },
    { key: "members", label: "Hội viên" },
    { key: "employees", label: "Nhân viên" },
    { key: "incidents", label: "Sự cố" },
    { key: "equipment", label: "Thiết bị" },
    { key: "checkins", label: "Check-in" },
    { key: "revenue", label: "Doanh thu" },
];

export default function ReportDashboard() {
    const [activeTab, setActiveTab] = useState("overview");

    const [preset, setPreset] = useState("30d");
    const [customFrom, setCustomFrom] = useState(toISODate(new Date(Date.now() - 29 * 86400000)));
    const [customTo, setCustomTo] = useState(toISODate(new Date()));
    const [branchId, setBranchId] = useState("");

    const [branches, setBranches] = useState([]);
    const [dashboard, setDashboard] = useState(null); // { memberReport, employeeReport, incidentReport, equipmentReport, revenueReport }
    const [checkins, setCheckins] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const range = useMemo(() => {
        if (preset === "custom") return { from: customFrom, to: customTo };
        return getPresetRange(preset);
    }, [preset, customFrom, customTo]);

    // Lấy danh sách chi nhánh 1 lần khi mount (Admin: tất cả | Quản lý: chi nhánh được quản lý)
    useEffect(() => {
        let mounted = true;
        adminApi
            .getFilterableBranches()
            .then((res) => {
                if (mounted) setBranches(res?.data ?? res ?? []);
            })
            .catch(() => {
                /* không chặn trang nếu lấy danh sách chi nhánh lỗi */
            });
        return () => {
            mounted = false;
        };
    }, []);

    const fetchData = useCallback(() => {
        setLoading(true);
        setError("");

        const params = {
            from: range?.from,
            to: range?.to,
            branchId: branchId || undefined,
        };

        Promise.all([adminApi.getManagerDashboard(params), adminApi.getCheckInReport(params)])
            .then(([dashboardRes, checkinRes]) => {
                setDashboard(dashboardRes?.data ?? dashboardRes ?? null);
                setCheckins(checkinRes?.data ?? checkinRes ?? null);
            })
            .catch((err) => {
                console.error(err);
                setError("Không tải được dữ liệu báo cáo. Vui lòng thử lại.");
            })
            .finally(() => setLoading(false));
    }, [range?.from, range?.to, branchId]);

    useEffect(() => {
        if (!range?.from || !range?.to) return;
        fetchData();
    }, [fetchData, range?.from, range?.to]);

    const member = dashboard?.memberReport;
    const employee = dashboard?.employeeReport;
    const incident = dashboard?.incidentReport;
    const equipment = dashboard?.equipmentReport;
    const revenue = dashboard?.revenueReport;

    const today = new Date();

    return (
        <div className="rpt">
            {/* -------- Header -------- */}
            <div className="rpt-header">
                <div className="rpt-header-left">
                    <div className="rpt-logo">
                        <IconLeaf size={26} />
                    </div>
                    <div>
                        <h1 className="rpt-title">Báo cáo  Admin</h1>
                        <p className="rpt-subtitle">
                            Hội viên, nhân viên, sự cố, thiết bị, check-in &amp; doanh thu — cập nhật theo bộ lọc bên dưới
                        </p>
                    </div>
                </div>
                <div className="rpt-date-badge">
                    <IconCalendar size={16} />
                    {formatFullDateVi(today)}
                </div>
            </div>

            {/* -------- Filter bar -------- */}
            <div className="rpt-filter-bar">
                <div className="rpt-filter-group">
                    <label className="rpt-filter-label">
                        <IconCalendar size={13} /> Thời gian
                    </label>
                    <select className="rpt-select" value={preset} onChange={(e) => setPreset(e.target.value)}>
                        {PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>

                {preset === "custom" ? (
                    <div className="rpt-filter-group">
                        <label className="rpt-filter-label">Khoảng ngày</label>
                        <div className="rpt-custom-range">
                            <input
                                type="date"
                                className="rpt-date-input"
                                value={customFrom}
                                max={customTo}
                                onChange={(e) => setCustomFrom(e.target.value)}
                            />
                            <span>đến</span>
                            <input
                                type="date"
                                className="rpt-date-input"
                                value={customTo}
                                min={customFrom}
                                onChange={(e) => setCustomTo(e.target.value)}
                            />
                        </div>
                    </div>
                ) : null}

                <div className="rpt-filter-group">
                    <label className="rpt-filter-label">
                        <IconBranch size={13} /> Chi nhánh
                    </label>
                    <select className="rpt-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                        <option value="">Tất cả chi nhánh</option>
                        {branches.map((b) => (
                            <option key={b.branchId} value={b.branchId}>
                                {b.branchName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* -------- Tabs -------- */}
            <div className="rpt-tabs">
                {TABS.map((t) => {
                    const Icon = TAB_ICONS[t.key];
                    return (
                        <button
                            key={t.key}
                            type="button"
                            className={`rpt-tab${activeTab === t.key ? " active" : ""}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            <Icon size={15} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* -------- Error -------- */}
            {error ? (
                <div className="rpt-error-banner">
                    <IconAlert size={16} />
                    {error}
                    <button type="button" className="rpt-retry-btn" onClick={fetchData}>
                        <IconRefresh size={12} /> Thử lại
                    </button>
                </div>
            ) : null}

            {/* -------- Content -------- */}
            {loading ? (
                <>
                    <StatSkeleton count={4} />
                    <div className="rpt-panel-grid">
                        <div className="rpt-skeleton rpt-panel-skel" />
                        <div className="rpt-skeleton rpt-panel-skel" />
                    </div>
                </>
            ) : (
                <>
                    {activeTab === "overview" && (
                        <OverviewTab member={member} employee={employee} incident={incident} equipment={equipment} checkins={checkins} revenue={revenue} />
                    )}
                    {activeTab === "members" && <MembersTab member={member} />}
                    {activeTab === "employees" && <EmployeesTab employee={employee} />}
                    {activeTab === "incidents" && <IncidentsTab incident={incident} />}
                    {activeTab === "equipment" && <EquipmentTab equipment={equipment} />}
                    {activeTab === "checkins" && <CheckinsTab checkins={checkins} />}
                    {activeTab === "revenue" && <RevenueTab revenue={revenue} />}
                </>
            )}
        </div>
    );
}

/* ============================================================================
 * Tabs
 * ==========================================================================*/

function OverviewTab({ member, employee, incident, equipment, checkins, revenue }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard
                    icon={IconWallet}
                    value={formatCurrency(revenue?.totalRevenue)}
                    label="Tổng doanh thu"
                    sub={`${formatNumber(revenue?.totalPaidTransactions)} giao dịch đã thanh toán`}
                />
                <StatCard
                    icon={IconUsers}
                    value={formatNumber(member?.totalMembers)}
                    label="Hội viên"
                    sub={`${formatNumber(member?.activeMembers)} đang hoạt động · +${formatNumber(member?.newMembersInRange)} mới`}
                />
                <StatCard
                    icon={IconBriefcase}
                    value={formatNumber(employee?.totalEmployees)}
                    label="Nhân viên"
                    sub={`${formatNumber(employee?.activeEmployees)} đang làm việc`}
                />
                <StatCard
                    icon={IconAlert}
                    value={formatNumber(incident?.totalIncidents)}
                    label="Sự cố"
                    sub={`${formatNumber(incident?.pendingApproval)} đang chờ duyệt`}
                />
                <StatCard
                    icon={IconBox}
                    value={formatNumber(equipment?.totalEquipment)}
                    label="Thiết bị"
                    sub={`${formatNumber(equipment?.activeEquipment)} đang sử dụng`}
                />
                <StatCard
                    icon={IconLogin}
                    value={formatNumber(checkins?.totalCheckIns)}
                    label="Lượt check-in"
                    sub={`${formatNumber(checkins?.currentlyCheckedIn)} đang có mặt tại phòng tập`}
                />
            </div>

            <div className="rpt-panel-grid">
                <Panel title="Xu hướng doanh thu theo ngày" meta={`${revenue?.revenueByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={revenue?.revenueByDay} dateKey="date" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
                <Panel title="Sự cố theo trạng thái">
                    <StatusBreakdown
                        segments={[
                            { label: "Chờ duyệt", value: incident?.pendingApproval ?? 0, color: STATUS_COLORS[2] },
                            { label: "Đã duyệt", value: incident?.approved ?? 0, color: STATUS_COLORS[1] },
                            { label: "Hoàn thành", value: incident?.completed ?? 0, color: STATUS_COLORS[0] },
                            { label: "Đã huỷ", value: incident?.cancelled ?? 0, color: STATUS_COLORS[3] },
                        ]}
                    />
                </Panel>
            </div>

            <div className="rpt-panel-grid">
                <Panel title="Doanh thu theo chi nhánh" meta="Top chi nhánh">
                    <RankedBarList
                        items={(revenue?.revenueByBranch ?? []).slice(0, 6)}
                        labelKey="branchName"
                        valueKey="amount"
                        formatValue={formatCurrency}
                    />
                </Panel>
                <Panel title="Nhân viên theo vai trò">
                    <RankedBarList items={employee?.employeesByRole ?? []} labelKey="roleName" valueKey="count" />
                </Panel>
            </div>
        </>
    );
}

function MembersTab({ member }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconUsers} value={formatNumber(member?.totalMembers)} label="Tổng hội viên" />
                <StatCard icon={IconUsers} value={formatNumber(member?.activeMembers)} label="Đang hoạt động" />
                <StatCard icon={IconUsers} value={formatNumber(member?.pendingActivationMembers)} label="Chờ kích hoạt" />
                <StatCard icon={IconUsers} value={formatNumber(member?.suspendedMembers)} label="Đang tạm ngưng" />
                <StatCard icon={IconUsers} value={formatNumber(member?.newMembersInRange)} label="Hội viên mới" sub="Trong khoảng thời gian đã lọc" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Hội viên mới theo ngày" meta={`${member?.newMembersByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={member?.newMembersByDay} dateKey="date" valueKey="count" />
                </Panel>
            </div>
        </>
    );
}

function EmployeesTab({ employee }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconBriefcase} value={formatNumber(employee?.totalEmployees)} label="Tổng nhân viên" />
                <StatCard icon={IconBriefcase} value={formatNumber(employee?.activeEmployees)} label="Đang làm việc" />
                <StatCard icon={IconBriefcase} value={formatNumber(employee?.inactiveEmployees)} label="Ngừng làm việc" />
                <StatCard icon={IconBriefcase} value={formatNumber(employee?.newEmployeesInRange)} label="Nhân viên mới" sub="Trong khoảng thời gian đã lọc" />
            </div>
            <div className="rpt-panel-grid">
                <Panel title="Theo vai trò">
                    <RankedBarList items={employee?.employeesByRole ?? []} labelKey="roleName" valueKey="count" />
                </Panel>
                <Panel title="Theo chi nhánh">
                    <RankedBarList items={employee?.employeesByBranch ?? []} labelKey="branchName" valueKey="count" />
                </Panel>
            </div>
        </>
    );
}

function IncidentsTab({ incident }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconAlert} value={formatNumber(incident?.totalIncidents)} label="Tổng sự cố" />
                <StatCard icon={IconAlert} value={formatNumber(incident?.pendingApproval)} label="Chờ duyệt" />
                <StatCard icon={IconAlert} value={formatNumber(incident?.approved)} label="Đã duyệt" />
                <StatCard icon={IconAlert} value={formatNumber(incident?.completed)} label="Hoàn thành" />
                <StatCard icon={IconAlert} value={formatNumber(incident?.cancelled)} label="Đã huỷ" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Sự cố theo ngày" meta={`${incident?.incidentsByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={incident?.incidentsByDay} dateKey="date" valueKey="count" />
                </Panel>
            </div>
            <div className="rpt-panel-grid">
                <Panel title="Theo chi nhánh">
                    <RankedBarList items={incident?.incidentsByBranch ?? []} labelKey="branchName" valueKey="count" />
                </Panel>
                <Panel title="Thiết bị gặp sự cố nhiều nhất">
                    <RankedBarList
                        items={incident?.topEquipmentByIncidents ?? []}
                        labelKey="equipmentName"
                        valueKey="incidentCount"
                        emptyTitle="Chưa có thiết bị nào gặp sự cố"
                    />
                </Panel>
            </div>
        </>
    );
}

function EquipmentTab({ equipment }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconBox} value={formatNumber(equipment?.totalEquipment)} label="Tổng thiết bị" />
                <StatCard icon={IconBox} value={formatNumber(equipment?.activeEquipment)} label="Đang sử dụng" />
                <StatCard icon={IconBox} value={formatNumber(equipment?.deletedEquipment)} label="Đã ngừng dùng" />
            </div>
            <div className="rpt-panel-grid">
                <Panel title="Theo danh mục">
                    <RankedBarList items={equipment?.equipmentByCategory ?? []} labelKey="categoryName" valueKey="count" />
                </Panel>
                <Panel title="Theo chi nhánh">
                    <RankedBarList items={equipment?.equipmentByBranch ?? []} labelKey="branchName" valueKey="count" />
                </Panel>
            </div>
        </>
    );
}

function CheckinsTab({ checkins }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconLogin} value={formatNumber(checkins?.totalCheckIns)} label="Tổng lượt check-in" />
                <StatCard icon={IconLogin} value={formatNumber(checkins?.autoCheckIns)} label="Check-in tự động" />
                <StatCard icon={IconLogin} value={formatNumber(checkins?.manualCheckIns)} label="Check-in thủ công" />
                <StatCard icon={IconLogin} value={formatNumber(checkins?.currentlyCheckedIn)} label="Đang có mặt" sub="Chưa check-out" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Check-in theo ngày" meta={`${checkins?.checkInsByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={checkins?.checkInsByDay} dateKey="date" valueKey="count" />
                </Panel>
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Theo chi nhánh">
                    <RankedBarList items={checkins?.checkInsByBranch ?? []} labelKey="branchName" valueKey="count" />
                </Panel>
            </div>
        </>
    );
}

function RevenueTab({ revenue }) {
    return (
        <>
            <div className="rpt-stat-grid">
                <StatCard icon={IconWallet} value={formatCurrency(revenue?.totalRevenue)} label="Tổng doanh thu" />
                <StatCard icon={IconWallet} value={formatCurrency(revenue?.totalDiscount)} label="Tổng chiết khấu" />
                <StatCard icon={IconWallet} value={formatNumber(revenue?.totalPaidTransactions)} label="Giao dịch đã thanh toán" />
                <StatCard icon={IconWallet} value={formatNumber(revenue?.totalPendingTransactions)} label="Đang chờ thanh toán" />
                <StatCard icon={IconWallet} value={formatNumber(revenue?.totalCancelledTransactions)} label="Đã huỷ" />
            </div>

            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Doanh thu theo ngày" meta={`${revenue?.revenueByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={revenue?.revenueByDay} dateKey="date" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
            </div>

            <div className="rpt-panel-grid">
                <Panel title="Theo chi nhánh">
                    <RankedBarList items={revenue?.revenueByBranch ?? []} labelKey="branchName" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
                <Panel title="Theo gói tập">
                    <RankedBarList items={revenue?.revenueByPlan ?? []} labelKey="planName" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
            </div>

            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel title="Theo phương thức thanh toán">
                    <DataTable
                        columns={[
                            { key: "paymentMethod", header: "Phương thức" },
                            { key: "transactionCount", header: "Số giao dịch", num: true, render: (r) => formatNumber(r.transactionCount) },
                            { key: "amount", header: "Doanh thu", num: true, render: (r) => formatCurrency(r.amount) },
                        ]}
                        rows={revenue?.revenueByPaymentMethod ?? []}
                        emptyTitle="Chưa có dữ liệu thanh toán"
                    />
                </Panel>
            </div>
        </>
    );
}