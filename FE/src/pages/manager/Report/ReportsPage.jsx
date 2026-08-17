import { useCallback, useEffect, useMemo, useState } from "react";

import adminApi from "../../../api/adminApi";

/* ============================================================================
 * Styles — gộp chung CSS vào JSX (không cần file .css riêng)
 * ==========================================================================*/

const RPT_STYLES = `
.rpt {
    --bg: #f2f8f4;
    --bg-alt: #eaf5ee;
    --card-bg: #ffffff;

    /* Tông chủ đạo — xanh lá rừng đậm, đồng bộ với sidebar Manager Portal */
    --primary: #1f8a4f;
    --primary-dark: #146238;
    --primary-darker: #0e3f26;
    --primary-light: #e3f5e9;
    --accent-soft: #dcf3e3;
    --accent-soft-2: #cdeeda;

    --text-main: #142a1e;
    --text-muted: #5c7268;
    --text-soft: #86988e;
    --border: #d9ebe0;
    --danger: #d64545;
    --warning: #c98a1f;
    --info: #2f77c9;

    --radius-lg: 20px;
    --radius-md: 14px;
    --radius-sm: 10px;

    --shadow-card: 0 8px 22px rgba(14, 63, 38, 0.08);
    --shadow-soft: 0 2px 10px rgba(14, 63, 38, 0.06);
    --shadow-hover: 0 14px 30px rgba(14, 63, 38, 0.14);

    min-height: 100vh;
    background:
        radial-gradient(1100px 420px at 100% -10%, rgba(31, 138, 79, 0.07), transparent 60%),
        radial-gradient(900px 380px at -10% 0%, rgba(47, 119, 201, 0.05), transparent 55%),
        var(--bg);
    color: var(--text-main);
    font-family: "Segoe UI", "Inter", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    padding: 28px clamp(16px, 4vw, 40px) 60px;
    box-sizing: border-box;
}

.rpt * { box-sizing: border-box; }

/* ---------------- Category accent themes ----------------
   Mỗi nhóm dữ liệu có một tông màu viền/nhấn riêng để dễ phân biệt
   nhưng vẫn hài hoà với tông xanh lá chủ đạo của Manager Portal. */

.rpt-accent-green   { --accent:#1f8a4f; --accent-dark:#146238; --accent-soft:#dcf3e3; --accent-soft-2:#c8ecd7; --accent-shadow: rgba(31,138,79,0.18); }
.rpt-accent-blue    { --accent:#2f77c9; --accent-dark:#1f5a9e; --accent-soft:#dfeafc; --accent-soft-2:#c6dffa; --accent-shadow: rgba(47,119,201,0.18); }
.rpt-accent-violet  { --accent:#7c5cd6; --accent-dark:#5b3fb0; --accent-soft:#ece5fb; --accent-soft-2:#ded1f8; --accent-shadow: rgba(124,92,214,0.18); }
.rpt-accent-amber   { --accent:#c98a1f; --accent-dark:#9c6a14; --accent-soft:#faf0da; --accent-soft-2:#f3e2b8; --accent-shadow: rgba(201,138,31,0.18); }
.rpt-accent-red     { --accent:#d64545; --accent-dark:#ad2e2e; --accent-soft:#fbe4e4; --accent-soft-2:#f6c9c9; --accent-shadow: rgba(214,69,69,0.18); }
.rpt-accent-teal    { --accent:#1f9c8a; --accent-dark:#15776a; --accent-soft:#daf4f0; --accent-soft-2:#bfe9e2; --accent-shadow: rgba(31,156,138,0.18); }
.rpt-accent-indigo  { --accent:#4a5fd6; --accent-dark:#3444ab; --accent-soft:#e3e6fb; --accent-soft-2:#ccd3f7; --accent-shadow: rgba(74,95,214,0.18); }

/* ---------------- Header ---------------- */

.rpt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 22px;
}

.rpt-header-left { display: flex; align-items: center; gap: 16px; }

.rpt-logo {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: linear-gradient(155deg, var(--primary) 0%, var(--primary-darker) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex: none;
    box-shadow: 0 8px 18px rgba(14, 63, 38, 0.28);
}

.rpt-title {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-main);
}

.rpt-subtitle { margin: 4px 0 0; font-size: 14px; color: var(--text-muted); }

.rpt-date-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1.5px solid var(--accent-soft-2, var(--border));
    color: var(--primary-dark);
    font-weight: 700;
    font-size: 14px;
    padding: 10px 18px;
    border-radius: 999px;
    box-shadow: var(--shadow-soft);
    white-space: nowrap;
}

/* ---------------- Filter bar ---------------- */

.rpt-filter-bar {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--border);
    border-top: 3px solid var(--primary);
    box-shadow: var(--shadow-soft);
    padding: 18px 22px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
}

.rpt-filter-group { display: flex; flex-direction: column; gap: 8px; }

.rpt-filter-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--primary-dark);
}

.rpt-select,
.rpt-date-input {
    appearance: none;
    border: 1.5px solid var(--border);
    background: #fbfefc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%231f8a4f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 14px center;
    border-radius: var(--radius-sm);
    padding: 11px 38px 11px 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.rpt-date-input { background-image: none; padding-right: 14px; cursor: default; }

.rpt-select:focus,
.rpt-date-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(31, 138, 79, 0.14);
}

.rpt-custom-range { display: flex; align-items: center; gap: 8px; }
.rpt-custom-range span { color: var(--text-soft); font-size: 13px; }

/* ---------------- Tabs ---------------- */

.rpt-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 6px;
    margin-bottom: 22px;
    scrollbar-width: thin;
    background: var(--card-bg);
    border: 1.5px solid var(--border);
    border-radius: 999px;
    box-shadow: var(--shadow-soft);
    width: fit-content;
    max-width: 100%;
}

.rpt-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    border: 1.5px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 14px;
    padding: 10px 18px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.rpt-tab:hover { background: var(--accent-soft, var(--accent-soft)); color: var(--accent-dark, var(--primary-dark)); border-color: var(--accent-soft-2, transparent); }

.rpt-tab.active {
    background: linear-gradient(155deg, var(--accent, var(--primary)) 0%, var(--accent-dark, var(--primary-dark)) 100%);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 8px 16px var(--accent-shadow, rgba(31, 138, 79, 0.3));
}

/* ---------------- Stat cards ---------------- */

.rpt-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 18px;
    margin-bottom: 22px;
}

.rpt-stat-card {
    position: relative;
    overflow: hidden;
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--accent-soft-2, var(--border));
    box-shadow: var(--shadow-card);
    padding: 22px 22px 20px;
    border-top: 3px solid var(--accent, var(--primary));
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.rpt-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 30px var(--accent-shadow, rgba(14, 63, 38, 0.14));
    border-color: var(--accent, var(--primary));
}

.rpt-stat-card::after {
    content: "";
    position: absolute;
    top: -30px;
    right: -30px;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: var(--accent-soft, var(--accent-soft));
    opacity: 0.55;
}

.rpt-stat-icon {
    position: relative;
    z-index: 1;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--accent-soft, var(--accent-soft));
    color: var(--accent-dark, var(--primary-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.rpt-stat-value {
    position: relative;
    z-index: 1;
    font-size: 28px;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.01em;
    line-height: 1.15;
}

.rpt-stat-label { position: relative; z-index: 1; font-size: 14.5px; font-weight: 700; color: var(--text-main); margin-top: 4px; }
.rpt-stat-sub { position: relative; z-index: 1; font-size: 12.5px; color: var(--text-soft); margin-top: 4px; line-height: 1.4; }

.rpt-stat-trend {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    margin-top: 10px;
    background: var(--accent-soft-2, var(--accent-soft-2));
    color: var(--accent-dark, var(--primary-dark));
}

.rpt-stat-trend.down { background: #fbe6e6; color: var(--danger); }

/* ---------------- Section / panel cards ---------------- */

.rpt-panel-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 18px;
    margin-bottom: 18px;
}

@media (max-width: 900px) {
    .rpt-panel-grid { grid-template-columns: 1fr; }
}

.rpt-panel {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--accent-soft-2, var(--border));
    box-shadow: var(--shadow-card);
    padding: 22px;
    border-top: 3px solid var(--accent, var(--primary));
    transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.rpt-panel:hover { box-shadow: var(--shadow-hover); border-color: var(--accent, var(--primary)); }

.rpt-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 10px; }
.rpt-panel-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--text-main); }
.rpt-panel-meta {
    font-size: 11.5px;
    color: var(--accent-dark, var(--text-soft));
    font-weight: 700;
    background: var(--accent-soft, transparent);
    padding: 3px 10px;
    border-radius: 999px;
}

/* ---------------- Bar trend chart (CSS-only) ---------------- */

.rpt-trend {
    margin-top: 18px;
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 180px;
    padding-bottom: 2px;
    border-bottom: 1.5px solid var(--border);
}

.rpt-trend-col { flex: 1 1 0; min-width: 4px; display: flex; align-items: flex-end; justify-content: center; height: 100%; position: relative; }

.rpt-trend-bar {
    width: 100%;
    max-width: 26px;
    border-radius: 6px 6px 2px 2px;
    background: linear-gradient(180deg, var(--accent, var(--primary)) 0%, var(--accent-dark, var(--primary-dark)) 100%);
    transition: transform 0.15s ease, opacity 0.15s ease;
    min-height: 3px;
}

.rpt-trend-col:hover .rpt-trend-bar { opacity: 0.85; transform: scaleX(1.08); }

.rpt-trend-tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent-dark, var(--primary-darker));
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 8px;
    border-radius: 6px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
    z-index: 2;
}

.rpt-trend-col:hover .rpt-trend-tooltip { opacity: 1; }

.rpt-trend-axis { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-soft); font-weight: 600; }

/* ---------------- Ranked / breakdown lists ---------------- */

.rpt-ranked-list { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
.rpt-ranked-item-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13.5px; margin-bottom: 6px; }
.rpt-ranked-item-name { font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; }

.rpt-rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--accent-soft, var(--primary-light));
    color: var(--accent-dark, var(--primary-dark));
    font-size: 11px;
    font-weight: 800;
    flex: none;
}

.rpt-ranked-item-value { font-weight: 800; color: var(--accent-dark, var(--primary-dark)); white-space: nowrap; }

.rpt-ranked-track { height: 8px; border-radius: 999px; background: var(--accent-soft, var(--accent-soft)); overflow: hidden; }

.rpt-ranked-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent, var(--primary)) 0%, var(--accent-dark, var(--primary-dark)) 100%);
    transition: width 0.4s ease;
}

/* ---------------- Status breakdown (stacked bar + legend) ---------------- */

.rpt-status-bar {
    display: flex;
    width: 100%;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 16px;
    background: var(--accent-soft, var(--accent-soft));
    border: 1px solid var(--accent-soft-2, transparent);
}

.rpt-status-seg { height: 100%; transition: width 0.4s ease; }

.rpt-status-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; }
.rpt-status-legend-item { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-muted); font-weight: 600; }
.rpt-status-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.rpt-status-legend-value { color: var(--text-main); font-weight: 800; }

/* ---------------- Table ---------------- */

.rpt-table-wrap { overflow-x: auto; margin-top: 16px; border: 1.5px solid var(--border); border-radius: var(--radius-md); }

.rpt-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }

.rpt-table th {
    text-align: left;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-dark, var(--text-soft));
    font-weight: 700;
    padding: 12px;
    background: var(--accent-soft, var(--bg-alt));
    border-bottom: 1.5px solid var(--border);
    white-space: nowrap;
}

.rpt-table td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text-main); font-weight: 600; white-space: nowrap; }
.rpt-table tr:last-child td { border-bottom: none; }
.rpt-table tr:hover td { background: var(--accent-soft, transparent); }
.rpt-table td.num { text-align: right; font-variant-numeric: tabular-nums; }

/* ---------------- Empty / loading / error states ---------------- */

.rpt-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 46px 16px; color: var(--text-soft); }
.rpt-empty-icon { color: var(--accent, var(--text-soft)); opacity: 0.6; }
.rpt-empty-title { font-weight: 700; color: var(--text-muted); font-size: 14px; }
.rpt-empty-sub { font-size: 12.5px; max-width: 320px; }

.rpt-skeleton {
    background: linear-gradient(90deg, var(--accent-soft) 25%, #f2fbf5 37%, var(--accent-soft) 63%);
    background-size: 400% 100%;
    animation: rpt-shimmer 1.3s ease infinite;
    border-radius: var(--radius-sm);
    border: 1.5px solid var(--accent-soft-2, var(--border));
}

@keyframes rpt-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

.rpt-stat-skel { height: 128px; border-radius: var(--radius-lg); }
.rpt-panel-skel { height: 320px; border-radius: var(--radius-lg); }

.rpt-error-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fdecec;
    border: 1.5px solid #f6c8c8;
    color: var(--danger);
    font-weight: 600;
    font-size: 13.5px;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    margin-bottom: 18px;
}

.rpt-retry-btn {
    margin-left: auto;
    border: 1.5px solid var(--danger);
    background: #fff;
    color: var(--danger);
    font-weight: 700;
    font-size: 12.5px;
    padding: 6px 14px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.rpt-retry-btn:hover { background: var(--danger); color: #fff; }

/* ---------------- Responsive ---------------- */

@media (max-width: 560px) {
    .rpt-header { flex-direction: column; }
    .rpt-title { font-size: 21px; }
    .rpt-stat-value { font-size: 23px; }
    .rpt-tabs { width: 100%; }
}
`;

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

/* Màu nhấn riêng cho từng nhóm dữ liệu — dùng để tô viền/khối card */
const TAB_ACCENTS = {
    overview: "green",
    members: "blue",
    employees: "violet",
    incidents: "red",
    equipment: "teal",
    checkins: "indigo",
    revenue: "green",
};

/* ============================================================================
 * Small reusable UI pieces
 * ==========================================================================*/

function StatCard({ icon: Icon, value, label, sub, trend, accent = "green" }) {
    return (
        <div className={`rpt-stat-card rpt-accent-${accent}`}>
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

function Panel({ title, meta, children, accent = "green" }) {
    return (
        <div className={`rpt-panel rpt-accent-${accent}`}>
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
            <style>{RPT_STYLES}</style>

            {/* -------- Header -------- */}
            <div className="rpt-header">
                <div className="rpt-header-left">
                    <div className="rpt-logo">
                        <IconLeaf size={26} />
                    </div>
                    <div>
                        <h1 className="rpt-title">Báo cáo Quản lý</h1>
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
            <div className={`rpt-tabs rpt-accent-${TAB_ACCENTS[activeTab]}`}>
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
                    accent="green"
                    icon={IconWallet}
                    value={formatCurrency(revenue?.totalRevenue)}
                    label="Tổng doanh thu"
                    sub={`${formatNumber(revenue?.totalPaidTransactions)} giao dịch đã thanh toán`}
                />
                <StatCard
                    accent="blue"
                    icon={IconUsers}
                    value={formatNumber(member?.totalMembers)}
                    label="Hội viên"
                    sub={`${formatNumber(member?.activeMembers)} đang hoạt động · +${formatNumber(member?.newMembersInRange)} mới`}
                />
                <StatCard
                    accent="violet"
                    icon={IconBriefcase}
                    value={formatNumber(employee?.totalEmployees)}
                    label="Nhân viên"
                    sub={`${formatNumber(employee?.activeEmployees)} đang làm việc`}
                />
                <StatCard
                    accent="red"
                    icon={IconAlert}
                    value={formatNumber(incident?.totalIncidents)}
                    label="Sự cố"
                    sub={`${formatNumber(incident?.pendingApproval)} đang chờ duyệt`}
                />
                <StatCard
                    accent="teal"
                    icon={IconBox}
                    value={formatNumber(equipment?.totalEquipment)}
                    label="Thiết bị"
                    sub={`${formatNumber(equipment?.activeEquipment)} đang sử dụng`}
                />
                <StatCard
                    accent="indigo"
                    icon={IconLogin}
                    value={formatNumber(checkins?.totalCheckIns)}
                    label="Lượt check-in"
                    sub={`${formatNumber(checkins?.currentlyCheckedIn)} đang có mặt tại phòng tập`}
                />
            </div>

            <div className="rpt-panel-grid">
                <Panel accent="green" title="Xu hướng doanh thu theo ngày" meta={`${revenue?.revenueByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={revenue?.revenueByDay} dateKey="date" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
                <Panel accent="red" title="Sự cố theo trạng thái">
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
                <Panel accent="green" title="Doanh thu theo chi nhánh" meta="Top chi nhánh">
                    <RankedBarList
                        items={(revenue?.revenueByBranch ?? []).slice(0, 6)}
                        labelKey="branchName"
                        valueKey="amount"
                        formatValue={formatCurrency}
                    />
                </Panel>
                <Panel accent="violet" title="Nhân viên theo vai trò">
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
                <StatCard accent="blue" icon={IconUsers} value={formatNumber(member?.totalMembers)} label="Tổng hội viên" />
                <StatCard accent="blue" icon={IconUsers} value={formatNumber(member?.activeMembers)} label="Đang hoạt động" />
                <StatCard accent="blue" icon={IconUsers} value={formatNumber(member?.pendingActivationMembers)} label="Chờ kích hoạt" />
                <StatCard accent="blue" icon={IconUsers} value={formatNumber(member?.suspendedMembers)} label="Đang tạm ngưng" />
                <StatCard accent="blue" icon={IconUsers} value={formatNumber(member?.newMembersInRange)} label="Hội viên mới" sub="Trong khoảng thời gian đã lọc" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="blue" title="Hội viên mới theo ngày" meta={`${member?.newMembersByDay?.length ?? 0} ngày có dữ liệu`}>
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
                <StatCard accent="violet" icon={IconBriefcase} value={formatNumber(employee?.totalEmployees)} label="Tổng nhân viên" />
                <StatCard accent="violet" icon={IconBriefcase} value={formatNumber(employee?.activeEmployees)} label="Đang làm việc" />
                <StatCard accent="violet" icon={IconBriefcase} value={formatNumber(employee?.inactiveEmployees)} label="Ngừng làm việc" />
                <StatCard accent="violet" icon={IconBriefcase} value={formatNumber(employee?.newEmployeesInRange)} label="Nhân viên mới" sub="Trong khoảng thời gian đã lọc" />
            </div>
            <div className="rpt-panel-grid">
                <Panel accent="violet" title="Theo vai trò">
                    <RankedBarList items={employee?.employeesByRole ?? []} labelKey="roleName" valueKey="count" />
                </Panel>
                <Panel accent="violet" title="Theo chi nhánh">
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
                <StatCard accent="red" icon={IconAlert} value={formatNumber(incident?.totalIncidents)} label="Tổng sự cố" />
                <StatCard accent="red" icon={IconAlert} value={formatNumber(incident?.pendingApproval)} label="Chờ duyệt" />
                <StatCard accent="red" icon={IconAlert} value={formatNumber(incident?.approved)} label="Đã duyệt" />
                <StatCard accent="red" icon={IconAlert} value={formatNumber(incident?.completed)} label="Hoàn thành" />
                <StatCard accent="red" icon={IconAlert} value={formatNumber(incident?.cancelled)} label="Đã huỷ" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="red" title="Sự cố theo ngày" meta={`${incident?.incidentsByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={incident?.incidentsByDay} dateKey="date" valueKey="count" />
                </Panel>
            </div>
            <div className="rpt-panel-grid">
                <Panel accent="red" title="Theo chi nhánh">
                    <RankedBarList items={incident?.incidentsByBranch ?? []} labelKey="branchName" valueKey="count" />
                </Panel>
                <Panel accent="red" title="Thiết bị gặp sự cố nhiều nhất">
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
                <StatCard accent="teal" icon={IconBox} value={formatNumber(equipment?.totalEquipment)} label="Tổng thiết bị" />
                <StatCard accent="teal" icon={IconBox} value={formatNumber(equipment?.activeEquipment)} label="Đang sử dụng" />
                <StatCard accent="teal" icon={IconBox} value={formatNumber(equipment?.deletedEquipment)} label="Đã ngừng dùng" />
            </div>
            <div className="rpt-panel-grid">
                <Panel accent="teal" title="Theo danh mục">
                    <RankedBarList items={equipment?.equipmentByCategory ?? []} labelKey="categoryName" valueKey="count" />
                </Panel>
                <Panel accent="teal" title="Theo chi nhánh">
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
                <StatCard accent="indigo" icon={IconLogin} value={formatNumber(checkins?.totalCheckIns)} label="Tổng lượt check-in" />
                <StatCard accent="indigo" icon={IconLogin} value={formatNumber(checkins?.autoCheckIns)} label="Check-in tự động" />
                <StatCard accent="indigo" icon={IconLogin} value={formatNumber(checkins?.manualCheckIns)} label="Check-in thủ công" />
                <StatCard accent="indigo" icon={IconLogin} value={formatNumber(checkins?.currentlyCheckedIn)} label="Đang có mặt" sub="Chưa check-out" />
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="indigo" title="Check-in theo ngày" meta={`${checkins?.checkInsByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={checkins?.checkInsByDay} dateKey="date" valueKey="count" />
                </Panel>
            </div>
            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="indigo" title="Theo chi nhánh">
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
                <StatCard accent="green" icon={IconWallet} value={formatCurrency(revenue?.totalRevenue)} label="Tổng doanh thu" />
                <StatCard accent="green" icon={IconWallet} value={formatCurrency(revenue?.totalDiscount)} label="Tổng chiết khấu" />
                <StatCard accent="green" icon={IconWallet} value={formatNumber(revenue?.totalPaidTransactions)} label="Giao dịch đã thanh toán" />
                <StatCard accent="amber" icon={IconWallet} value={formatNumber(revenue?.totalPendingTransactions)} label="Đang chờ thanh toán" />
                <StatCard accent="red" icon={IconWallet} value={formatNumber(revenue?.totalCancelledTransactions)} label="Đã huỷ" />
            </div>

            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="green" title="Doanh thu theo ngày" meta={`${revenue?.revenueByDay?.length ?? 0} ngày có dữ liệu`}>
                    <DailyTrendChart data={revenue?.revenueByDay} dateKey="date" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
            </div>

            <div className="rpt-panel-grid">
                <Panel accent="green" title="Theo chi nhánh">
                    <RankedBarList items={revenue?.revenueByBranch ?? []} labelKey="branchName" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
                <Panel accent="green" title="Theo gói tập">
                    <RankedBarList items={revenue?.revenueByPlan ?? []} labelKey="planName" valueKey="amount" formatValue={formatCurrency} />
                </Panel>
            </div>

            <div className="rpt-panel-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Panel accent="green" title="Theo phương thức thanh toán">
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