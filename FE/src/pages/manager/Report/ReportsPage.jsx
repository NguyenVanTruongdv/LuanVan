import { useCallback, useEffect, useMemo, useState } from "react";
import managerApi from "../../../api/managerApi";

// ============================================================================
// CSS thuần cho trang Báo cáo — nhúng trực tiếp trong file này (1 file duy
// nhất, không cần import .css riêng). Tông màu navy tối + accent cyan đồng bộ
// với Manager Portal.
// ============================================================================
const REPORTS_PAGE_CSS = `
.rp-page {
    --rp-bg: #0b1220;
    --rp-panel: #101a2e;
    --rp-panel-alt: #16233b;
    --rp-border: rgba(255, 255, 255, 0.08);
    --rp-text: #eef2f8;
    --rp-text-muted: #8b96ac;
    --rp-cyan: #22d3ee;
    --rp-cyan-strong: #0891b2;
    --rp-green: #34d399;
    --rp-orange: #f59e0b;
    --rp-red: #f87171;

    min-height: 100%;
    padding: 28px 32px 60px;
    background: var(--rp-bg);
    color: var(--rp-text);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
}

.rp-page * {
    box-sizing: border-box;
}

/* ---------- Header ---------- */

.rp-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
}

.rp-title {
    margin: 0 0 4px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.01em;
}

.rp-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--rp-text-muted);
}

.rp-filters {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
}

.rp-presets {
    display: flex;
    gap: 8px;
}

.rp-preset-btn {
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--rp-text-muted);
    background: var(--rp-panel);
    border: 1px solid var(--rp-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.rp-preset-btn:hover {
    color: var(--rp-text);
    border-color: rgba(34, 211, 238, 0.4);
}

.rp-preset-btn.is-active {
    color: #06222b;
    background: var(--rp-cyan);
    border-color: var(--rp-cyan);
}

.rp-date-range {
    display: flex;
    align-items: center;
    gap: 8px;
}

.rp-date-input {
    padding: 8px 10px;
    font-size: 13px;
    color: var(--rp-text);
    background: var(--rp-panel);
    border: 1px solid var(--rp-border);
    border-radius: 8px;
    outline: none;
    color-scheme: dark;
}

.rp-date-input:focus {
    border-color: var(--rp-cyan);
}

.rp-date-sep {
    color: var(--rp-text-muted);
    font-size: 13px;
}

.rp-apply-btn {
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    color: #06222b;
    background: linear-gradient(135deg, var(--rp-cyan), var(--rp-cyan-strong));
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.rp-apply-btn:hover {
    opacity: 0.9;
}

.rp-apply-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

/* ---------- Tabs ---------- */

.rp-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 22px;
    padding: 4px;
    width: fit-content;
    background: var(--rp-panel);
    border: 1px solid var(--rp-border);
    border-radius: 10px;
}

.rp-tab {
    padding: 9px 20px;
    font-size: 14px;
    font-weight: 600;
    color: var(--rp-text-muted);
    background: transparent;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.rp-tab:hover {
    color: var(--rp-text);
}

.rp-tab.is-active {
    color: #06222b;
    background: linear-gradient(135deg, var(--rp-cyan), var(--rp-cyan-strong));
}

/* ---------- Loading / error / empty ---------- */

.rp-loading {
    padding: 60px 0;
    text-align: center;
    color: var(--rp-text-muted);
    font-size: 14px;
}

.rp-error {
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #fecaca;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 8px;
}

.rp-empty {
    padding: 28px 0;
    text-align: center;
    color: var(--rp-text-muted);
    font-size: 13px;
}

/* ---------- Stat cards ---------- */

.rp-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
}

.rp-stat-grid-3 {
    grid-template-columns: repeat(3, 1fr);
}

.rp-stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    background: var(--rp-panel);
    border: 1px solid var(--rp-border);
    border-radius: 14px;
}

.rp-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    font-size: 18px;
}

.rp-tone-cyan {
    color: var(--rp-cyan);
    background: rgba(34, 211, 238, 0.14);
}

.rp-tone-green {
    color: var(--rp-green);
    background: rgba(52, 211, 153, 0.14);
}

.rp-tone-orange {
    color: var(--rp-orange);
    background: rgba(245, 158, 11, 0.14);
}

.rp-tone-red {
    color: var(--rp-red);
    background: rgba(248, 113, 113, 0.14);
}

.rp-stat-value {
    font-size: 21px;
    font-weight: 800;
    line-height: 1.2;
}

.rp-stat-label {
    margin-top: 2px;
    font-size: 12.5px;
    color: var(--rp-text-muted);
}

/* ---------- Panel ---------- */

.rp-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.rp-panel {
    background: var(--rp-panel);
    border: 1px solid var(--rp-border);
    border-radius: 14px;
    padding: 20px;
}

.rp-panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
}

.rp-panel-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
}

.rp-panel-count {
    font-size: 12.5px;
    color: var(--rp-text-muted);
}

/* ---------- Bar list (ngày / tháng / check-in) ---------- */

.rp-bar-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.rp-bar-row {
    display: grid;
    grid-template-columns: 56px 1fr 130px 90px;
    align-items: center;
    gap: 12px;
}

.rp-bar-label {
    font-size: 12.5px;
    color: var(--rp-text-muted);
    font-variant-numeric: tabular-nums;
}

.rp-bar-label-wide {
    grid-column: span 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.rp-bar-track {
    position: relative;
    height: 10px;
    background: var(--rp-panel-alt);
    border-radius: 999px;
    overflow: hidden;
}

.rp-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
}

.rp-tone-cyan-fill {
    background: linear-gradient(90deg, var(--rp-cyan-strong), var(--rp-cyan));
}

.rp-tone-green-fill {
    background: linear-gradient(90deg, #0f9e6f, var(--rp-green));
}

.rp-tone-orange-fill {
    background: linear-gradient(90deg, #b3720b, var(--rp-orange));
}

.rp-bar-value {
    font-size: 13px;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.rp-bar-sub {
    font-size: 12px;
    color: var(--rp-text-muted);
    text-align: right;
    white-space: nowrap;
}

/* ---------- Table ---------- */

.rp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.rp-table thead th {
    padding: 10px 12px;
    text-align: left;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--rp-text-muted);
    background: var(--rp-panel-alt);
    border-bottom: 1px solid var(--rp-border);
}

.rp-table thead th:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}

.rp-table thead th:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}

.rp-table tbody td {
    padding: 12px;
    border-bottom: 1px solid var(--rp-border);
    color: var(--rp-text);
    font-variant-numeric: tabular-nums;
}

.rp-table tbody tr:last-child td {
    border-bottom: none;
}

.rp-table tbody tr:hover td {
    background: rgba(255, 255, 255, 0.02);
}

.rp-table-name {
    font-weight: 600;
}

.rp-table-bar-col {
    width: 140px;
}

.rp-mini-bar-track {
    position: relative;
    height: 8px;
    background: var(--rp-panel-alt);
    border-radius: 999px;
    overflow: hidden;
}

.rp-mini-bar-fill {
    height: 100%;
    border-radius: 999px;
}

/* ---------- Badges ---------- */

.rp-badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
}

.rp-badge-green {
    color: var(--rp-green);
    background: rgba(52, 211, 153, 0.14);
}

.rp-badge-orange {
    color: var(--rp-orange);
    background: rgba(245, 158, 11, 0.14);
}

.rp-badge-red {
    color: var(--rp-red);
    background: rgba(248, 113, 113, 0.14);
}

/* ---------- Responsive ---------- */

@media (max-width: 1024px) {
    .rp-stat-grid,
    .rp-stat-grid-3 {
        grid-template-columns: repeat(2, 1fr);
    }

    .rp-header {
        flex-direction: column;
    }

    .rp-filters {
        align-items: flex-start;
    }
}

@media (max-width: 640px) {
    .rp-page {
        padding: 20px 16px 40px;
    }

    .rp-stat-grid,
    .rp-stat-grid-3 {
        grid-template-columns: 1fr;
    }

    .rp-bar-row {
        grid-template-columns: 44px 1fr;
        row-gap: 4px;
    }

    .rp-bar-value,
    .rp-bar-sub {
        grid-column: 2;
        text-align: left;
    }

    .rp-table {
        font-size: 12.5px;
    }
}
`;

// authApi có thể trả về response axios ({ data: ... }) hoặc trả thẳng data,
// unwrap() xử lý cả hai trường hợp để component không phụ thuộc chi tiết đó.
function unwrap(res) {
    return res && typeof res === "object" && "data" in res ? res.data : res;
}

function pad(n) {
    return String(n).padStart(2, "0");
}

function toInputDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatCurrency(value) {
    const n = Number(value) || 0;
    return n.toLocaleString("vi-VN") + "₫";
}

function formatNumber(value) {
    return (Number(value) || 0).toLocaleString("vi-VN");
}

function formatDayLabel(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

const TABS = [
    { key: "revenue", label: "Doanh thu" },
    { key: "members", label: "Hội viên" },
    { key: "equipment", label: "Thiết bị" },
];

const PRESETS = [
    { key: "7d", label: "7 ngày", days: 7 },
    { key: "30d", label: "30 ngày", days: 30 },
    { key: "90d", label: "90 ngày", days: 90 },
];

function buildDefaultRange(days = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    return { fromDate: toInputDate(from), toDate: toInputDate(to) };
}

export default function ReportsPage() {
    const [range, setRange] = useState(() => buildDefaultRange(30));
    const [activePreset, setActivePreset] = useState("30d");
    const [activeTab, setActiveTab] = useState("revenue");

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    const [revenue, setRevenue] = useState(null);
    const [members, setMembers] = useState(null);
    const [equipment, setEquipment] = useState(null);

    const fetchAll = useCallback(async (currentRange) => {
        setLoading(true);
        const nextErrors = {};

        const [revenueRes, memberRes, equipmentRes] = await Promise.allSettled([
            managerApi.getRevenueReport(currentRange),
            managerApi.getMemberSummary(currentRange),
            managerApi.getEquipmentByBranch(currentRange),
        ]);

        if (revenueRes.status === "fulfilled") {
            setRevenue(unwrap(revenueRes.value));
        } else {
            nextErrors.revenue = "Không tải được báo cáo doanh thu.";
        }

        if (memberRes.status === "fulfilled") {
            setMembers(unwrap(memberRes.value));
        } else {
            nextErrors.members = "Không tải được báo cáo hội viên.";
        }

        if (equipmentRes.status === "fulfilled") {
            setEquipment(unwrap(equipmentRes.value));
        } else {
            nextErrors.equipment = "Không tải được báo cáo thiết bị.";
        }

        setErrors(nextErrors);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAll(range);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePreset = (preset) => {
        setActivePreset(preset.key);
        const next = buildDefaultRange(preset.days);
        setRange(next);
        fetchAll(next);
    };

    const handleApply = () => {
        setActivePreset(null);
        fetchAll(range);
    };

    const maxDayRevenue = useMemo(() => {
        const days = revenue?.revenueByDay ?? revenue?.RevenueByDay ?? [];
        return Math.max(1, ...days.map((d) => Number(d.revenue ?? d.Revenue) || 0));
    }, [revenue]);

    const maxMonthRevenue = useMemo(() => {
        const months = revenue?.revenueByMonth ?? revenue?.RevenueByMonth ?? [];
        return Math.max(1, ...months.map((m) => Number(m.revenue ?? m.Revenue) || 0));
    }, [revenue]);

    const maxBranchRevenue = useMemo(() => {
        const branches = revenue?.revenueByBranch ?? revenue?.RevenueByBranch ?? [];
        return Math.max(1, ...branches.map((b) => Number(b.revenue ?? b.Revenue) || 0));
    }, [revenue]);

    const maxCheckIn = useMemo(() => {
        const branches = members?.checkInsByBranch ?? members?.CheckInsByBranch ?? [];
        return Math.max(1, ...branches.map((b) => Number(b.checkInCount ?? b.CheckInCount) || 0));
    }, [members]);

    const maxEquipment = useMemo(() => {
        const branches = equipment?.branches ?? equipment?.Branches ?? [];
        return Math.max(1, ...branches.map((b) => Number(b.totalEquipment ?? b.TotalEquipment) || 0));
    }, [equipment]);

    const g = (obj, camel, pascal) => obj?.[camel] ?? obj?.[pascal];

    return (
        <>
            <style>{REPORTS_PAGE_CSS}</style>

            <div className="rp-page">
                <div className="rp-header">
                    <div>
                        <h1 className="rp-title">Báo cáo</h1>
                        <p className="rp-subtitle">Doanh thu, hội viên và thiết bị theo chi nhánh bạn quản lý</p>
                    </div>

                    <div className="rp-filters">
                        <div className="rp-presets">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    className={`rp-preset-btn ${activePreset === p.key ? "is-active" : ""}`}
                                    onClick={() => handlePreset(p)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="rp-date-range">
                            <input
                                type="date"
                                className="rp-date-input"
                                value={range.fromDate}
                                max={range.toDate}
                                onChange={(e) => {
                                    setActivePreset(null);
                                    setRange((r) => ({ ...r, fromDate: e.target.value }));
                                }}
                            />
                            <span className="rp-date-sep">→</span>
                            <input
                                type="date"
                                className="rp-date-input"
                                value={range.toDate}
                                min={range.fromDate}
                                onChange={(e) => {
                                    setActivePreset(null);
                                    setRange((r) => ({ ...r, toDate: e.target.value }));
                                }}
                            />
                            <button type="button" className="rp-apply-btn" onClick={handleApply} disabled={loading}>
                                {loading ? "Đang tải..." : "Áp dụng"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rp-tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`rp-tab ${activeTab === t.key ? "is-active" : ""}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading && !revenue && !members && !equipment ? (
                    <div className="rp-loading">Đang tải báo cáo...</div>
                ) : (
                    <>
                        {activeTab === "revenue" && (
                            <RevenueTab
                                revenue={revenue}
                                error={errors.revenue}
                                maxDayRevenue={maxDayRevenue}
                                maxMonthRevenue={maxMonthRevenue}
                                maxBranchRevenue={maxBranchRevenue}
                                g={g}
                            />
                        )}
                        {activeTab === "members" && (
                            <MembersTab members={members} error={errors.members} maxCheckIn={maxCheckIn} g={g} />
                        )}
                        {activeTab === "equipment" && (
                            <EquipmentTab
                                equipment={equipment}
                                error={errors.equipment}
                                maxEquipment={maxEquipment}
                                g={g}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}

function ErrorBox({ message }) {
    if (!message) return null;
    return <div className="rp-error">{message}</div>;
}

function StatCard({ icon, tone, value, label }) {
    return (
        <div className="rp-stat-card">
            <div className={`rp-stat-icon rp-tone-${tone}`}>{icon}</div>
            <div>
                <div className="rp-stat-value">{value}</div>
                <div className="rp-stat-label">{label}</div>
            </div>
        </div>
    );
}

function RevenueTab({ revenue, error, maxDayRevenue, maxMonthRevenue, maxBranchRevenue, g }) {
    if (!revenue) return <ErrorBox message={error || "Chưa có dữ liệu."} />;

    const totalRevenue = g(revenue, "totalRevenue", "TotalRevenue") ?? 0;
    const totalTransactions = g(revenue, "totalTransactions", "TotalTransactions") ?? 0;
    const avgValue = g(revenue, "averageTransactionValue", "AverageTransactionValue") ?? 0;
    const growth = g(revenue, "growthPercentage", "GrowthPercentage") ?? 0;
    const byDay = g(revenue, "revenueByDay", "RevenueByDay") ?? [];
    const byMonth = g(revenue, "revenueByMonth", "RevenueByMonth") ?? [];
    const byBranch = g(revenue, "revenueByBranch", "RevenueByBranch") ?? [];

    return (
        <div className="rp-section">
            <ErrorBox message={error} />

            <div className="rp-stat-grid">
                <StatCard icon="₫" tone="cyan" value={formatCurrency(totalRevenue)} label="Tổng doanh thu" />
                <StatCard icon="≡" tone="green" value={formatNumber(totalTransactions)} label="Tổng giao dịch" />
                <StatCard icon="⌀" tone="orange" value={formatCurrency(avgValue)} label="Giá trị TB / giao dịch" />
                <StatCard
                    icon={growth >= 0 ? "↗" : "↘"}
                    tone={growth >= 0 ? "green" : "red"}
                    value={`${growth > 0 ? "+" : ""}${growth}%`}
                    label="So với kỳ trước"
                />
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Doanh thu theo ngày</h2>
                    <span className="rp-panel-count">{byDay.length} ngày</span>
                </div>
                {byDay.length === 0 ? (
                    <div className="rp-empty">Không có dữ liệu trong khoảng thời gian này.</div>
                ) : (
                    <div className="rp-bar-list">
                        {byDay.map((d, i) => {
                            const rev = Number(g(d, "revenue", "Revenue")) || 0;
                            const count = g(d, "transactionCount", "TransactionCount") ?? 0;
                            const dateVal = g(d, "date", "Date");
                            return (
                                <div className="rp-bar-row" key={i}>
                                    <div className="rp-bar-label">{formatDayLabel(dateVal)}</div>
                                    <div className="rp-bar-track">
                                        <div
                                            className="rp-bar-fill rp-tone-cyan-fill"
                                            style={{ width: `${(rev / maxDayRevenue) * 100}%` }}
                                        />
                                    </div>
                                    <div className="rp-bar-value">{formatCurrency(rev)}</div>
                                    <div className="rp-bar-sub">{count} GD</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Doanh thu theo tháng</h2>
                    <span className="rp-panel-count">{byMonth.length} tháng</span>
                </div>
                {byMonth.length === 0 ? (
                    <div className="rp-empty">Không có dữ liệu trong khoảng thời gian này.</div>
                ) : (
                    <div className="rp-bar-list">
                        {byMonth.map((m, i) => {
                            const rev = Number(g(m, "revenue", "Revenue")) || 0;
                            const count = g(m, "transactionCount", "TransactionCount") ?? 0;
                            const label = g(m, "monthLabel", "MonthLabel") ?? `${g(m, "month", "Month")}/${g(m, "year", "Year")}`;
                            return (
                                <div className="rp-bar-row" key={i}>
                                    <div className="rp-bar-label">{label}</div>
                                    <div className="rp-bar-track">
                                        <div
                                            className="rp-bar-fill rp-tone-green-fill"
                                            style={{ width: `${(rev / maxMonthRevenue) * 100}%` }}
                                        />
                                    </div>
                                    <div className="rp-bar-value">{formatCurrency(rev)}</div>
                                    <div className="rp-bar-sub">{count} GD</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Doanh thu theo chi nhánh</h2>
                    <span className="rp-panel-count">{byBranch.length} chi nhánh</span>
                </div>
                {byBranch.length === 0 ? (
                    <div className="rp-empty">Không có dữ liệu trong khoảng thời gian này.</div>
                ) : (
                    <table className="rp-table">
                        <thead>
                            <tr>
                                <th>Chi nhánh</th>
                                <th>Doanh thu</th>
                                <th>Số giao dịch</th>
                                <th>TB / giao dịch</th>
                                <th className="rp-table-bar-col">Tỷ trọng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byBranch.map((b, i) => {
                                const rev = Number(g(b, "revenue", "Revenue")) || 0;
                                return (
                                    <tr key={i}>
                                        <td className="rp-table-name">{g(b, "branchName", "BranchName")}</td>
                                        <td>{formatCurrency(rev)}</td>
                                        <td>{formatNumber(g(b, "transactionCount", "TransactionCount"))}</td>
                                        <td>{formatCurrency(g(b, "averageTransactionValue", "AverageTransactionValue"))}</td>
                                        <td className="rp-table-bar-col">
                                            <div className="rp-mini-bar-track">
                                                <div
                                                    className="rp-mini-bar-fill rp-tone-cyan-fill"
                                                    style={{ width: `${(rev / maxBranchRevenue) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function MembersTab({ members, error, maxCheckIn, g }) {
    if (!members) return <ErrorBox message={error || "Chưa có dữ liệu."} />;

    const totalMembers = g(members, "totalMembers", "TotalMembers") ?? 0;
    const totalActive = g(members, "totalActiveMembers", "TotalActiveMembers") ?? 0;
    const totalCheckIns = g(members, "totalCheckIns", "TotalCheckIns") ?? 0;
    const membersByBranch = g(members, "membersByBranch", "MembersByBranch") ?? [];
    const checkInsByBranch = g(members, "checkInsByBranch", "CheckInsByBranch") ?? [];

    return (
        <div className="rp-section">
            <ErrorBox message={error} />

            <div className="rp-stat-grid rp-stat-grid-3">
                <StatCard icon="👤" tone="cyan" value={formatNumber(totalMembers)} label="Tổng hội viên" />
                <StatCard icon="✓" tone="green" value={formatNumber(totalActive)} label="Đang hoạt động" />
                <StatCard icon="⏱" tone="orange" value={formatNumber(totalCheckIns)} label="Tổng lượt check-in" />
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Hội viên theo chi nhánh</h2>
                    <span className="rp-panel-count">{membersByBranch.length} chi nhánh</span>
                </div>
                {membersByBranch.length === 0 ? (
                    <div className="rp-empty">Không có dữ liệu.</div>
                ) : (
                    <table className="rp-table">
                        <thead>
                            <tr>
                                <th>Chi nhánh</th>
                                <th>Tổng hội viên</th>
                                <th>Đang hoạt động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {membersByBranch.map((b, i) => (
                                <tr key={i}>
                                    <td className="rp-table-name">{g(b, "branchName", "BranchName")}</td>
                                    <td>{formatNumber(g(b, "memberCount", "MemberCount"))}</td>
                                    <td>
                                        <span className="rp-badge rp-badge-green">
                                            {formatNumber(g(b, "activeMemberCount", "ActiveMemberCount"))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Check-in theo chi nhánh</h2>
                    <span className="rp-panel-count">{checkInsByBranch.length} chi nhánh</span>
                </div>
                {checkInsByBranch.length === 0 ? (
                    <div className="rp-empty">Không có lượt check-in trong khoảng thời gian này.</div>
                ) : (
                    <div className="rp-bar-list">
                        {checkInsByBranch.map((b, i) => {
                            const count = Number(g(b, "checkInCount", "CheckInCount")) || 0;
                            return (
                                <div className="rp-bar-row" key={i}>
                                    <div className="rp-bar-label rp-bar-label-wide">{g(b, "branchName", "BranchName")}</div>
                                    <div className="rp-bar-track">
                                        <div
                                            className="rp-bar-fill rp-tone-orange-fill"
                                            style={{ width: `${(count / maxCheckIn) * 100}%` }}
                                        />
                                    </div>
                                    <div className="rp-bar-value">{formatNumber(count)} lượt</div>
                                    <div className="rp-bar-sub">
                                        {formatNumber(g(b, "uniqueMemberCount", "UniqueMemberCount"))} hội viên
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function EquipmentTab({ equipment, error, maxEquipment, g }) {
    if (!equipment) return <ErrorBox message={error || "Chưa có dữ liệu."} />;

    const branches = g(equipment, "branches", "Branches") ?? [];
    const totalEquipment = branches.reduce((s, b) => s + (Number(g(b, "totalEquipment", "TotalEquipment")) || 0), 0);
    const totalActive = branches.reduce((s, b) => s + (Number(g(b, "activeCount", "ActiveCount")) || 0), 0);
    const totalIncidents = branches.reduce(
        (s, b) => s + (Number(g(b, "incidentCountInPeriod", "IncidentCountInPeriod")) || 0),
        0
    );

    return (
        <div className="rp-section">
            <ErrorBox message={error} />

            <div className="rp-stat-grid rp-stat-grid-3">
                <StatCard icon="🛠" tone="cyan" value={formatNumber(totalEquipment)} label="Tổng thiết bị" />
                <StatCard icon="✓" tone="green" value={formatNumber(totalActive)} label="Đang hoạt động" />
                <StatCard icon="⚠" tone="red" value={formatNumber(totalIncidents)} label="Sự cố trong kỳ" />
            </div>

            <div className="rp-panel">
                <div className="rp-panel-header">
                    <h2>Thiết bị theo chi nhánh</h2>
                    <span className="rp-panel-count">{branches.length} chi nhánh</span>
                </div>
                {branches.length === 0 ? (
                    <div className="rp-empty">Không có dữ liệu.</div>
                ) : (
                    <table className="rp-table">
                        <thead>
                            <tr>
                                <th>Chi nhánh</th>
                                <th>Tổng thiết bị</th>
                                <th>Đang hoạt động</th>
                                <th>Đã xóa</th>
                                <th>Sự cố trong kỳ</th>
                                <th>Chờ duyệt</th>
                                <th className="rp-table-bar-col">Tỷ trọng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map((b, i) => {
                                const total = Number(g(b, "totalEquipment", "TotalEquipment")) || 0;
                                return (
                                    <tr key={i}>
                                        <td className="rp-table-name">{g(b, "branchName", "BranchName")}</td>
                                        <td>{formatNumber(total)}</td>
                                        <td>
                                            <span className="rp-badge rp-badge-green">
                                                {formatNumber(g(b, "activeCount", "ActiveCount"))}
                                            </span>
                                        </td>
                                        <td>{formatNumber(g(b, "deletedCount", "DeletedCount"))}</td>
                                        <td>
                                            <span className="rp-badge rp-badge-red">
                                                {formatNumber(g(b, "incidentCountInPeriod", "IncidentCountInPeriod"))}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="rp-badge rp-badge-orange">
                                                {formatNumber(g(b, "pendingApprovalIncidentCount", "PendingApprovalIncidentCount"))}
                                            </span>
                                        </td>
                                        <td className="rp-table-bar-col">
                                            <div className="rp-mini-bar-track">
                                                <div
                                                    className="rp-mini-bar-fill rp-tone-cyan-fill"
                                                    style={{ width: `${(total / maxEquipment) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}