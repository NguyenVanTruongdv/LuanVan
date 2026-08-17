import {
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    Clock,
    Leaf,
    MapPin,
    Package,
    Repeat,
    Smartphone,
    UserCheck,
    UserPlus,
    Users,
    Wallet,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import cashierApi from "../../../api/cashierApi";

/* ============================================================
   CONST
   ============================================================ */

const RANGE_PRESETS = [
    { key: "7d", label: "7 ngày qua", days: 7 },
    { key: "30d", label: "30 ngày qua", days: 30 },
    { key: "90d", label: "90 ngày qua", days: 90 },
    { key: "custom", label: "Tùy chỉnh (chọn ngày cụ thể)", days: null },
];

const PIE_COLORS = ["#f2921f", "#2f7fe0", "#7c4dff", "#1ea34f", "#e0413b"];

// Mặc định giờ bắt đầu / kết thúc khi mở trang lần đầu (đơn vị: giây).
const DEFAULT_SHIFT_START = "08:00:00";
const DEFAULT_SHIFT_END = "17:00:00";

/* ============================================================
   FORMAT / DATE HELPERS
   ============================================================ */

function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function fmtShortDate(isoOrDate) {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return "";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
function toISODate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDaysToDateStr(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return toISODate(d);
}
// Ghép ngày + giờ (kèm giây) thành chuỗi datetime "naive" (không kèm timezone)
// — BE dùng đúng giá trị này để lọc, chính xác đến từng giây.
function combineDateTime(dateStr, timeStr) {
    const [h, m, s] = (timeStr || "00:00:00").split(":");
    return `${dateStr}T${pad(Number(h) || 0)}:${pad(Number(m) || 0)}:${pad(Number(s) || 0)}`;
}
function removeDiacritics(str) {
    return (str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

const currencyFmt = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat("vi-VN");
const fmtMoney = (n) => currencyFmt.format(Number(n) || 0);
const fmtMoneyShort = (n) => {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "tr";
    if (n >= 1000) return Math.round(n / 1000) + "k";
    return `${n}`;
};
const fmtNumber = (n) => numberFmt.format(Number(n) || 0);

// Khoảng thời gian cho chế độ "Theo ca làm việc" — luôn dựa trên giờ bắt đầu /
// kết thúc do người dùng tự chỉnh, chính xác đến giây.
function buildShiftRange(dateStr, startTime, endTime) {
    const start = startTime || "00:00:00";
    const end = endTime || "23:59:59";
    const crossesMidnight = end <= start; // vd. ca tối 22:00:00 -> 06:00:00 hôm sau

    return {
        from: combineDateTime(dateStr, start),
        to: combineDateTime(crossesMidnight ? addDaysToDateStr(dateStr, 1) : dateStr, end),
    };
}

// Khoảng thời gian cho chế độ "Theo khoảng ngày" (báo cáo tổng hợp nhiều ngày).
function buildRangeFromPreset(presetKey, customFrom, customTo) {
    if (presetKey === "custom") {
        return { from: combineDateTime(customFrom, "00:00:00"), to: combineDateTime(customTo, "23:59:59") };
    }
    const preset = RANGE_PRESETS.find((p) => p.key === presetKey) || RANGE_PRESETS[1];
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (preset.days - 1));
    return { from: combineDateTime(toISODate(fromDate), "00:00:00"), to: combineDateTime(toISODate(toDate), "23:59:59") };
}

function fmtRangeLabel(range) {
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
    const sameDay = toISODate(from) === toISODate(to);
    const dateFmt = (d) => d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFmt = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (sameDay) return `${dateFmt(from)} · ${timeFmt(from)} – ${timeFmt(to)}`;
    return `${dateFmt(from)} ${timeFmt(from)} → ${dateFmt(to)} ${timeFmt(to)}`;
}

/* ============================================================
   SMALL REUSABLE COMPONENTS
   ============================================================ */

function FieldSelect({ label, icon, value, onChange, options }) {
    return (
        <div className="field">
            <label className="field__label">{icon} {label}</label>
            <div className="select-wrap">
                <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <ChevronDown size={15} className="select-chevron" />
            </div>
        </div>
    );
}

// Ô chọn giờ luôn hiển thị 24h (00-23), dùng input number (chỉ có nút mũi tên
// nhỏ lên/xuống, KHÔNG có list xổ xuống) thay vì <select> — tránh hẳn việc
// trình duyệt tự vẽ dropdown to che UI. value/onChange vẫn dùng chuỗi
// "HH:MM:SS" giống input type="time" cũ nên chỗ gọi không cần đổi gì thêm.
function clampNum(v, min, max) {
    const n = Number(v);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
}

function Time24Field({ label, value, onChange }) {
    const [h, m, s] = (value || "00:00:00").split(":");
    const hh = h || "00";
    const mm = m || "00";
    const ss = s || "00";

    const update = (nh, nm, ns) => onChange(`${nh}:${nm}:${ns}`);

    const handlePart = (raw, min, max, otherA, otherB, which) => {
        const clamped = pad(clampNum(raw, min, max));
        if (which === "h") update(clamped, otherA, otherB);
        if (which === "m") update(otherA, clamped, otherB);
        if (which === "s") update(otherA, otherB, clamped);
    };

    return (
        <div className="field">
            <label className="field__label"><Clock size={13} /> {label}</label>
            <div className="time24">
                <input
                    type="number"
                    className="time24__input"
                    min={0}
                    max={23}
                    value={hh}
                    onChange={(e) => handlePart(e.target.value, 0, 23, mm, ss, "h")}
                    onFocus={(e) => e.target.select()}
                />
                <span className="time24__colon">:</span>
                <input
                    type="number"
                    className="time24__input"
                    min={0}
                    max={59}
                    value={mm}
                    onChange={(e) => handlePart(e.target.value, 0, 59, hh, ss, "m")}
                    onFocus={(e) => e.target.select()}
                />
                <span className="time24__colon">:</span>
                <input
                    type="number"
                    className="time24__input"
                    min={0}
                    max={59}
                    value={ss}
                    onChange={(e) => handlePart(e.target.value, 0, 59, hh, mm, "s")}
                    onFocus={(e) => e.target.select()}
                />
            </div>
        </div>
    );
}

function KpiCard({ icon, value, label, desc, colorVar }) {
    return (
        <div
            className="kpi-card"
            style={{
                "--kpi-bg": `var(${colorVar})`,
                "--kpi-border": `var(${colorVar})`,
                "--kpi-fg": "var(--white)",
                "--kpi-fg-muted": "rgba(255,255,255,0.72)",
                "--kpi-icon-bg": "rgba(255,255,255,0.18)",
                "--kpi-icon-fg": "var(--white)",
            }}
        >
            <div className="kpi-card__body">
                <div className="kpi-card__top">
                    <div className="kpi-card__icon">{icon}</div>
                </div>
                <div className="kpi-card__value">{value}</div>
                <div className="kpi-card__label">{label}</div>
                {desc ? <div className="kpi-card__desc">{desc}</div> : null}
            </div>
        </div>
    );
}

function CompareList({ items, labelKey, valueKey, formatValue = fmtNumber, subText }) {
    if (!items || items.length === 0) return <p className="empty-note">Chưa có dữ liệu.</p>;
    const max = Math.max(...items.map((it) => Number(it[valueKey]) || 0), 1);
    return (
        <div className="compare-block">
            {items.map((it, i) => {
                const v = Number(it[valueKey]) || 0;
                const color = PIE_COLORS[i % PIE_COLORS.length];
                return (
                    <div className="compare-row" key={i}>
                        <span className="compare-row__name" title={it[labelKey]}>{it[labelKey]}</span>
                        <div className="compare-row__track">
                            <div className="compare-row__fill" style={{ width: `${(v / max) * 100}%`, background: color }} />
                        </div>
                        <span className="compare-row__val">
                            {formatValue(v)}
                            {subText ? <em>{subText(it)}</em> : null}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function AreaTrend({ data, dateKey, valueKey, formatTooltip = fmtNumber, tickFormatter = fmtNumber }) {
    if (!data || data.length === 0) return <p className="empty-note">Không có dữ liệu trong khoảng thời gian đã chọn.</p>;
    const chartData = data.map((d) => ({ ...d, label: fmtShortDate(d[dateKey]) }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="rptRevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1ea34f" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#1ea34f" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f7ea" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5c6b62" }} axisLine={{ stroke: "#c3ecd0" }} tickLine={false} />
                <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11, fill: "#5c6b62" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                    formatter={(v) => [formatTooltip(v), ""]}
                    contentStyle={{ borderRadius: 14, border: "2px solid #c3ecd0", boxShadow: "0 8px 20px rgba(20,30,25,0.16)", fontSize: 13 }}
                />
                <Area type="monotone" dataKey={valueKey} stroke="#0f6b32" strokeWidth={2.5} fill="url(#rptRevGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function BarTrend({ data, dateKey, valueKey, color = "#2f7fe0" }) {
    if (!data || data.length === 0) return <p className="empty-note">Không có dữ liệu trong khoảng thời gian đã chọn.</p>;
    const chartData = data.map((d) => ({ ...d, label: fmtShortDate(d[dateKey]) }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6f7ea" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5c6b62" }} axisLine={{ stroke: "#c3ecd0" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5c6b62" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "2px solid #c3ecd0", fontSize: 12.5 }} />
                <Bar dataKey={valueKey} fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Tách doanh thu ca thành 2 nhóm: Tiền mặt và Chuyển khoản/khác — đủ để thu
// ngân đối chiếu nhanh khi kết ca, không cần nhập đếm tay hay in biên bản.
function CashSplitCard({ revenue, rangeLabel }) {
    const byMethod = revenue?.revenueByPaymentMethod ?? [];
    const isCash = (m) => /tien\s?mat|cash/.test(removeDiacritics(m.paymentMethod));

    const cashAmount = byMethod.filter(isCash).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const transferAmount = byMethod.filter((m) => !isCash(m)).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const total = cashAmount + transferAmount;
    const cashPct = total > 0 ? Math.round((cashAmount / total) * 100) : 0;
    const transferPct = total > 0 ? 100 - cashPct : 0;

    return (
        <div className="card cash-split-card">
            <div className="card__head">
                <h3 className="card__title"><Wallet size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Tiền mặt / Chuyển khoản</h3>
                <span className="card__hint">{rangeLabel}</span>
            </div>

            <div className="cash-split-grid">
                <div className="cash-split-block cash-split-block--cash">
                    <span className="cash-split-block__label">Tiền mặt</span>
                    <strong className="cash-split-block__value">{fmtMoney(cashAmount)}</strong>
                    <span className="cash-split-block__pct">{cashPct}% doanh thu ca</span>
                </div>
                <div className="cash-split-block cash-split-block--transfer">
                    <span className="cash-split-block__label">Chuyển khoản / khác</span>
                    <strong className="cash-split-block__value">{fmtMoney(transferAmount)}</strong>
                    <span className="cash-split-block__pct">{transferPct}% doanh thu ca</span>
                </div>
            </div>

            <div className="cash-split-bar">
                <div className="cash-split-bar__cash" style={{ width: `${cashPct}%` }} />
                <div className="cash-split-bar__transfer" style={{ width: `${transferPct}%` }} />
            </div>
        </div>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function CashierReport() {
    // Chi nhánh của thu ngân đang đăng nhập được BE tự xác định từ employeeId
    // trong token (xem ReportsController.BuildCashierFilterAsync) — FE không
    // cần tự gửi branchId lên nữa.

    // Chế độ lọc: "shift" phục vụ kết ca, "range" phục vụ báo cáo tổng hợp nhiều ngày.
    const [mode, setMode] = useState("shift");

    // --- Theo ca làm việc (luôn tự chỉnh giờ, chính xác đến giây) ---
    const [shiftDate, setShiftDate] = useState(toISODate(new Date()));
    const [customStart, setCustomStart] = useState(DEFAULT_SHIFT_START);
    const [customEnd, setCustomEnd] = useState(DEFAULT_SHIFT_END);

    // --- Theo khoảng ngày ---
    const [presetKey, setPresetKey] = useState("30d");
    const [customFrom, setCustomFrom] = useState(toISODate(new Date(Date.now() - 29 * 86400000)));
    const [customTo, setCustomTo] = useState(toISODate(new Date()));

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const range = useMemo(() => {
        if (mode === "shift") return buildShiftRange(shiftDate, customStart, customEnd);
        return buildRangeFromPreset(presetKey, customFrom, customTo);
    }, [mode, shiftDate, customStart, customEnd, presetKey, customFrom, customTo]);

    const rangeLabel = useMemo(() => fmtRangeLabel(range), [range]);

    // Chặn gọi API trùng lặp: chỉ fetch khi from/to thực sự đổi so với lần gọi
    // gần nhất, và debounce 350ms để không bắn nhiều request khi người dùng
    // đang gõ giờ/ngày (mỗi lần gõ 1 ký tự là 1 lần re-render).
    const lastFetchedKeyRef = useRef(null);

    const fetchData = useCallback((from, to) => {
        if (!from || !to) return;
        const key = `${from}|${to}`;
        if (lastFetchedKeyRef.current === key) return;
        lastFetchedKeyRef.current = key;

        setLoading(true);
        setError("");
        cashierApi
            .getCashierReport({ from, to })
            .then((res) => setDashboard(res?.data ?? res ?? null))
            .catch((err) => {
                console.error(err);
                setError("Không tải được báo cáo. Vui lòng thử lại.");
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!range?.from || !range?.to) return;
        const timer = setTimeout(() => fetchData(range.from, range.to), 350);
        return () => clearTimeout(timer);
    }, [range?.from, range?.to, fetchData]);

    const member = dashboard?.memberReport;
    const checkin = dashboard?.checkInReport;
    const revenue = dashboard?.revenueReport;

    return (
        <div className="rpt">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

        :root {
          --white: #ffffff;
          --bg-page: #f3f6f4;
          --green-50:  #e6f7ea; --green-100: #c3ecd0; --green-300: #6cca86;
          --green-500: #1ea34f; --green-700: #0f6b32; --green-800: #0c5427; --green-900: #0a3f1e;
          --blue-100: #c7e0fa; --blue-500: #2f7fe0; --blue-700: #1a4f9c;
          --amber-100: #ffdfb0; --amber-500: #f2921f; --amber-700: #b3620a;
          --red-100: #f7c9c9; --red-500: #e0413b; --red-600: #c22f2a;
          --violet-100: #ddd0fc; --violet-500: #7c4dff; --violet-700: #4f22bf;
          --slate-50: #f1f2f4; --slate-100: #dfe2e6; --slate-300: #aeb4bc; --slate-700: #3d434a;
          --text-dark: #1a2b22; --text-muted: #5c6b62;
          --border-soft: var(--slate-100); --border-strong: var(--slate-300);
          --shadow-color: rgba(20, 30, 25, 0.12); --shadow-strong: rgba(20, 30, 25, 0.24);
        }

        .rpt, .rpt * , .rpt *::before, .rpt *::after { box-sizing: border-box; }
        .rpt {
          font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--bg-page); color: var(--text-dark); min-height: 100vh; padding: 0 0 60px;
        }

        .rpt__header {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
          margin: 0 0 26px; padding: 26px clamp(16px, 4vw, 48px);
          background: linear-gradient(120deg, var(--green-700) 0%, var(--green-900) 100%);
          box-shadow: 0 18px 40px var(--shadow-strong);
        }
        .rpt__title-wrap { display: flex; align-items: center; gap: 14px; }
        .rpt__logo {
          width: 46px; height: 46px; border-radius: 16px; background: var(--green-300);
          display: flex; align-items: center; justify-content: center; color: var(--green-900);
          box-shadow: 0 8px 18px rgba(0,0,0,0.25);
        }
        .rpt__title { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--white); }
        .rpt__subtitle { margin: 2px 0 0; color: var(--green-100); font-size: 13.5px; font-weight: 500; }
        .rpt__date-pill {
          background: var(--green-300); border: 2px solid var(--green-100);
          border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 700; color: var(--green-900);
          box-shadow: 0 6px 18px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px;
        }
        .rpt__body { padding: 0 clamp(16px, 4vw, 48px); }

        .card {
          background: var(--white); border-radius: 22px; border: 2px solid var(--border-soft);
          box-shadow: 0 16px 36px var(--shadow-color); padding: 22px;
        }
        .card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
        .card__title { font-size: 15.5px; font-weight: 700; margin: 0; display: flex; align-items: center; }
        .card__hint { font-size: 12px; color: var(--text-muted); font-weight: 600; }

        /* --- Mode toggle --- */
        .mode-toggle {
          display: inline-flex; background: var(--slate-50); border: 2px solid var(--border-soft);
          border-radius: 999px; padding: 4px; margin-bottom: 18px; gap: 4px;
        }
        .mode-toggle__btn {
          border: none; background: transparent; padding: 9px 18px; border-radius: 999px;
          font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-muted); cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .mode-toggle__btn.active { background: var(--green-700); color: var(--white); box-shadow: 0 6px 14px rgba(15,107,50,0.28); }

        .filters { margin-bottom: 22px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; align-items: start; }
        .field { display: flex; flex-direction: column; gap: 8px; }
        .field__label {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--green-700);
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .select-wrap { position: relative; }
        .select, .input-text {
          width: 100%; appearance: none; -webkit-appearance: none; border: 2px solid var(--border-soft);
          background: var(--green-50); color: var(--text-dark); border-radius: 14px; padding: 11px 14px;
          font-size: 13.5px; font-weight: 600; font-family: inherit; cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .select { padding-right: 38px; }
        .select:hover, .input-text:hover { border-color: var(--green-300); }
        .select:focus, .input-text:focus { outline: none; border-color: var(--green-700); box-shadow: 0 0 0 4px var(--green-100); cursor: text; }
        .select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--green-700); pointer-events: none; }

        /* --- Bộ chọn giờ 24h (thay input type=time) --- */
        .time24 {
          display: inline-flex; align-items: center; gap: 2px;
          border: 2px solid var(--border-soft); background: var(--green-50);
          border-radius: 12px; padding: 4px 8px; width: fit-content;
        }
        .time24:focus-within { border-color: var(--green-700); box-shadow: 0 0 0 4px var(--green-100); }
        .time24__input {
          appearance: textfield; -moz-appearance: textfield; border: none; background: transparent;
          color: var(--text-dark); font-family: inherit; font-size: 13px; font-weight: 700;
          padding: 4px 0; border-radius: 6px; text-align: center; width: 26px;
        }
        .time24__input::-webkit-outer-spin-button,
        .time24__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .time24__input:hover { background: var(--green-100); }
        .time24__input:focus { outline: none; background: var(--green-100); }
        .time24__colon { font-weight: 800; color: var(--green-700); font-size: 12px; }
        .custom-range {
          grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px;
          background: var(--green-50); border: 2px dashed var(--border-strong); border-radius: 16px; padding: 14px 16px; margin-top: 2px;
        }
        .custom-range .field { min-width: 180px; }

        .shift-quick { display: flex; gap: 8px; grid-column: 1 / -1; }
        .shift-quick__btn {
          border: 2px solid var(--border-soft); background: var(--white); border-radius: 12px; padding: 8px 14px;
          font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--green-700); cursor: pointer;
        }
        .shift-quick__btn:hover { border-color: var(--green-300); }
        .range-readout {
          grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; font-size: 12.5px;
          font-weight: 700; color: var(--green-800); background: var(--green-50); border-radius: 12px; padding: 10px 14px;
        }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 22px; }
        .kpi-card {
          background: var(--kpi-bg, var(--white)); border-radius: 22px; border: 2px solid var(--kpi-border, var(--border-soft));
          box-shadow: 0 16px 36px var(--shadow-color); position: relative; overflow: hidden;
        }
        .kpi-card__body { padding: 20px 20px 22px; position: relative; }
        .kpi-card__body::after {
          content: ""; position: absolute; right: -26px; top: -22px; width: 100px; height: 100px; border-radius: 50%;
          background: var(--kpi-icon-bg, var(--green-50)); z-index: 0; opacity: .55;
        }
        .kpi-card__top { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
        .kpi-card__icon {
          width: 38px; height: 38px; border-radius: 12px; background: var(--kpi-icon-bg, var(--green-100));
          color: var(--kpi-icon-fg, var(--green-700)); display: flex; align-items: center; justify-content: center;
        }
        .kpi-card__value { font-size: 22px; font-weight: 800; margin: 14px 0 2px; position: relative; z-index: 1; letter-spacing: -0.01em; color: var(--kpi-fg, var(--text-dark)); }
        .kpi-card__label { font-size: 13px; color: var(--kpi-fg, var(--text-dark)); font-weight: 700; position: relative; z-index: 1; }
        .kpi-card__desc { font-size: 11.5px; color: var(--kpi-fg-muted, var(--text-muted)); font-weight: 500; margin-top: 3px; position: relative; z-index: 1; }

        .row-2col { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; margin-bottom: 18px; }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .pie-legend { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
        .pie-legend__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
        .pie-legend__name { display: flex; align-items: center; color: var(--text-dark); font-weight: 600; }
        .pie-legend__val { color: var(--text-dark); font-weight: 700; }

        .compare-block { display: flex; flex-direction: column; gap: 12px; }
        .compare-row { display: flex; align-items: center; gap: 10px; }
        .compare-row__name { width: 120px; font-size: 12.5px; font-weight: 600; color: var(--text-dark); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .compare-row__track { flex: 1; background: var(--slate-50); border-radius: 999px; height: 12px; overflow: hidden; }
        .compare-row__fill { height: 100%; border-radius: 999px; }
        .compare-row__val { width: 130px; text-align: right; font-size: 12px; font-weight: 700; color: var(--green-700); flex-shrink: 0; white-space: nowrap; }
        .compare-row__val em { display: block; font-style: normal; font-weight: 500; color: var(--text-muted); font-size: 11px; }

        /* --- Tiền mặt / Chuyển khoản --- */
        .cash-split-card { border-color: var(--green-500); margin-bottom: 18px; }
        .cash-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .cash-split-block { border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
        .cash-split-block--cash { background: var(--green-50); }
        .cash-split-block--transfer { background: var(--blue-100); }
        .cash-split-block__label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
        .cash-split-block__value { font-size: 20px; font-weight: 800; color: var(--text-dark); }
        .cash-split-block__pct { font-size: 11.5px; color: var(--text-muted); font-weight: 600; }
        .cash-split-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--slate-50); }
        .cash-split-bar__cash { background: var(--green-500); }
        .cash-split-bar__transfer { background: var(--blue-500); }

        .detail-toggle { margin-top: 30px; }
        .detail-toggle > summary {
          cursor: pointer; font-size: 15px; font-weight: 800; color: var(--green-800); padding: 4px 0;
          list-style: none; display: flex; align-items: center; gap: 8px;
        }
        .detail-toggle > summary::-webkit-details-marker { display: none; }
        .detail-toggle > summary::before { content: "▸"; transition: transform 0.15s ease; }
        .detail-toggle[open] > summary::before { transform: rotate(90deg); }
        .detail-toggle p { margin: 4px 0 16px; color: var(--text-muted); font-size: 13px; }

        .section-heading { margin: 22px 0 16px; }
        .section-heading h2 { font-size: 17px; font-weight: 800; margin: 0 0 4px; }
        .section-heading p { margin: 0; color: var(--text-muted); font-size: 13px; }

        .empty-note { text-align: center; color: var(--text-muted); font-size: 13px; padding: 28px 0; }
        .error-note { text-align: center; color: var(--white); background: var(--red-600); border-radius: 14px; font-size: 13px; padding: 12px 0; font-weight: 700; margin-bottom: 14px; }
        .loading-note { text-align: center; color: var(--text-muted); font-size: 13px; padding: 28px 0; }
        .footer-note { text-align: center; color: var(--text-muted); font-size: 11.5px; margin-top: 30px; display: flex; align-items: center; justify-content: center; gap: 6px; }

        @media (max-width: 980px) { .row-2col { grid-template-columns: 1fr; } .filters { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .filters { grid-template-columns: 1fr; } .rpt__body { padding: 0 14px; } }
      `}</style>

            {/* Header */}
            <div className="rpt__header">
                <div className="rpt__title-wrap">
                    <div className="rpt__logo"><Leaf size={24} /></div>
                    <div>
                        <h1 className="rpt__title">Báo cáo Thu ngân</h1>
                        <p className="rpt__subtitle">Chốt ca &amp; doanh thu — lọc theo ca làm việc hoặc theo khoảng ngày</p>
                    </div>
                </div>
                <div className="rpt__date-pill">
                    <CalendarClock size={15} />
                    {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
            </div>

            <div className="rpt__body">
                {/* Filters */}
                <div className="card">
                    <div className="mode-toggle">
                        <button type="button" className={`mode-toggle__btn ${mode === "shift" ? "active" : ""}`} onClick={() => setMode("shift")}>
                            Theo ca làm việc
                        </button>
                        <button type="button" className={`mode-toggle__btn ${mode === "range" ? "active" : ""}`} onClick={() => setMode("range")}>
                            Theo khoảng ngày
                        </button>
                    </div>

                    {mode === "shift" ? (
                        <div className="filters">
                            <div className="field">
                                <label className="field__label"><CalendarClock size={13} /> Ngày làm việc</label>
                                <input type="date" className="input-text" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
                            </div>
                            <Time24Field label="Giờ bắt đầu" value={customStart} onChange={setCustomStart} />
                            <Time24Field label="Giờ kết thúc" value={customEnd} onChange={setCustomEnd} />

                            <div className="shift-quick">
                                <button type="button" className="shift-quick__btn" onClick={() => setShiftDate(toISODate(new Date()))}>Hôm nay</button>
                                <button type="button" className="shift-quick__btn" onClick={() => setShiftDate(toISODate(new Date(Date.now() - 86400000)))}>Hôm qua</button>
                            </div>

                            <div className="range-readout"><Clock size={14} /> Đang xem: {rangeLabel}</div>
                        </div>
                    ) : (
                        <div className="filters">
                            <FieldSelect
                                label="Thời gian"
                                icon={<CalendarClock size={13} />}
                                value={presetKey}
                                onChange={setPresetKey}
                                options={RANGE_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
                            />
                            {presetKey === "custom" && (
                                <div className="custom-range">
                                    <div className="field">
                                        <label className="field__label">Từ ngày</label>
                                        <input type="date" className="input-text" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                                    </div>
                                    <div className="field">
                                        <label className="field__label">Đến ngày</label>
                                        <input type="date" className="input-text" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && <p className="error-note">{error}</p>}
                {loading && !dashboard && <p className="loading-note">Đang tải dữ liệu...</p>}

                {dashboard && (
                    <>
                        {/* ===== Chốt ca ===== */}
                        {mode === "shift" && <CashSplitCard revenue={revenue} rangeLabel={rangeLabel} />}

                        {/* ===== Doanh thu ===== */}
                        <div className="kpi-grid">
                            <KpiCard icon={<Wallet size={18} />} value={fmtMoney(revenue?.totalRevenue)} label="Tổng doanh thu" desc="Trong khoảng đã lọc" colorVar="--green-800" />
                            <KpiCard icon={<Repeat size={18} />} value={fmtNumber(revenue?.totalPaidTransactions)} label="Giao dịch đã thanh toán" desc={`Giá gốc ${fmtMoney(revenue?.totalOriginalPrice)}`} colorVar="--violet-500" />
                            <KpiCard icon={<Clock size={18} />} value={fmtNumber(revenue?.totalPendingTransactions)} label="Đang chờ thanh toán" colorVar="--amber-500" />
                            <KpiCard icon={<XCircle size={18} />} value={fmtNumber(revenue?.totalCancelledTransactions)} label="Đã huỷ" colorVar="--red-500" />
                        </div>

                        <div className="row-2col">
                            <div className="card">
                                <div className="card__head">
                                    <h3 className="card__title">Xu hướng doanh thu theo ngày</h3>
                                    <span className="card__hint">{(revenue?.revenueByDay ?? []).length} ngày có dữ liệu</span>
                                </div>
                                <AreaTrend data={revenue?.revenueByDay} dateKey="date" valueKey="amount" formatTooltip={fmtMoney} tickFormatter={fmtMoneyShort} />
                            </div>
                            <div className="card">
                                <div className="card__head"><h3 className="card__title">Theo phương thức thanh toán</h3></div>
                                {(revenue?.revenueByPaymentMethod ?? []).length ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={190}>
                                            <PieChart>
                                                <Pie data={revenue.revenueByPaymentMethod} dataKey="amount" nameKey="paymentMethod" innerRadius={52} outerRadius={80} paddingAngle={4}>
                                                    {revenue.revenueByPaymentMethod.map((entry, idx) => (
                                                        <Cell key={entry.paymentMethod} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 14, border: "2px solid #c3ecd0", fontSize: 12.5 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pie-legend">
                                            {revenue.revenueByPaymentMethod.map((m, idx) => (
                                                <div className="pie-legend__row" key={m.paymentMethod}>
                                                    <span className="pie-legend__name">
                                                        <span className="legend-dot" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                        {m.paymentMethod}
                                                    </span>
                                                    <span className="pie-legend__val">{fmtMoney(m.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="empty-note">Không có dữ liệu.</p>
                                )}
                            </div>
                        </div>

                        <div className="row-2col">
                            <div className="card">
                                <div className="card__head"><h3 className="card__title"><MapPin size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Theo chi nhánh</h3></div>
                                <CompareList items={revenue?.revenueByBranch ?? []} labelKey="branchName" valueKey="amount" formatValue={fmtMoney} />
                            </div>
                            <div className="card">
                                <div className="card__head"><h3 className="card__title"><Package size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Theo gói tập</h3></div>
                                <CompareList
                                    items={revenue?.revenueByPlan ?? []}
                                    labelKey="planName"
                                    valueKey="amount"
                                    formatValue={fmtMoney}
                                    subText={(it) => `${fmtNumber(it.transactionCount)} giao dịch`}
                                />
                            </div>
                        </div>

                        {/* ===== Hội viên & Check-in — thu gọn, không phải trọng tâm khi chốt ca ===== */}
                        <details className="detail-toggle">
                            <summary>Chi tiết hội viên &amp; check-in</summary>
                            <p>Chỉ liên quan đến kết ca gián tiếp — mở rộng nếu cần đối chiếu thêm.</p>

                            <div className="section-heading">
                                <h2>Hội viên</h2>
                            </div>
                            <div className="kpi-grid">
                                <KpiCard icon={<Users size={18} />} value={fmtNumber(member?.totalMembers)} label="Tổng hội viên" colorVar="--green-700" />
                                <KpiCard icon={<UserCheck size={18} />} value={fmtNumber(member?.activeMembers)} label="Đang hoạt động" colorVar="--blue-500" />
                                <KpiCard icon={<Clock size={18} />} value={fmtNumber(member?.pendingActivationMembers)} label="Chờ kích hoạt" colorVar="--amber-500" />
                                <KpiCard icon={<UserPlus size={18} />} value={fmtNumber(member?.newMembersInRange)} label="Hội viên mới" desc="Trong khoảng thời gian đã lọc" colorVar="--violet-500" />
                            </div>
                            <div className="card" style={{ marginBottom: 18 }}>
                                <div className="card__head"><h3 className="card__title">Hội viên mới theo ngày</h3></div>
                                <BarTrend data={member?.newMembersByDay} dateKey="date" valueKey="count" color="#7c4dff" />
                            </div>

                            <div className="section-heading">
                                <h2>Check-in</h2>
                            </div>
                            <div className="kpi-grid">
                                <KpiCard icon={<CheckCircle2 size={18} />} value={fmtNumber(checkin?.totalCheckIns)} label="Tổng lượt check-in" colorVar="--green-700" />
                                <KpiCard icon={<Smartphone size={18} />} value={fmtNumber(checkin?.autoCheckIns)} label="Tự động" colorVar="--blue-500" />
                                <KpiCard icon={<UserCheck size={18} />} value={fmtNumber(checkin?.manualCheckIns)} label="Thủ công" colorVar="--amber-500" />
                            </div>
                            <div className="row-2col">
                                <div className="card">
                                    <div className="card__head"><h3 className="card__title">Check-in theo ngày</h3></div>
                                    <BarTrend data={checkin?.checkInsByDay} dateKey="date" valueKey="count" color="#2f7fe0" />
                                </div>
                                <div className="card">
                                    <div className="card__head"><h3 className="card__title"><MapPin size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Theo chi nhánh</h3></div>
                                    <CompareList items={checkin?.checkInsByBranch ?? []} labelKey="branchName" valueKey="count" />
                                </div>
                            </div>
                        </details>
                    </>
                )}

                <div className="footer-note">
                    <Leaf size={12} /> Dữ liệu từ hệ thống — cập nhật theo bộ lọc đã chọn
                </div>
            </div>
        </div>
    );
}