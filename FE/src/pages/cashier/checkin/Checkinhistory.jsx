import { useState, useMemo } from "react";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:        #1E6B45;
  --green-dark:   #155235;
  --green-light:  #E8F5EE;
  --green-border: rgba(30,107,69,0.18);

  --bg:        #F4F6F8;
  --surface:   #FFFFFF;
  --border:    #E4EAF0;
  --border-md: #C9D4DF;
  --text-1:    #111827;
  --text-2:    #4B5563;
  --text-3:    #9CA3AF;

  --radius:    12px;
  --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03);
  --shadow-md: 0 4px 16px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04);
}

html, body { height: 100%; font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text-1); -webkit-font-smoothing: antialiased; }

.main { max-width: 1100px; margin: 0 auto; padding: 32px 28px 60px; }

/* ── Page header ── */
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.page-head-left { display: flex; align-items: center; gap: 14px; }
.page-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(30,107,69,0.28);
}
.page-title { font-size: 22px; font-weight: 800; color: var(--text-1); letter-spacing: -0.5px; line-height: 1; }
.page-subtitle { font-size: 13px; color: var(--text-2); margin-top: 3px; font-weight: 500; }

.branch-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--green-light); border: 1px solid var(--green-border);
  color: var(--green); font-size: 12px; font-weight: 700;
  padding: 6px 14px; border-radius: 999px;
}
.branch-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* ── Toolbar: search + filter ── */
.toolbar {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px;
  box-shadow: var(--shadow-sm); margin-bottom: 16px;
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
}

.search-wrap {
  flex: 1; min-width: 200px; position: relative; display: flex; align-items: center;
}
.search-icon { position: absolute; left: 12px; color: var(--text-3); width: 16px; height: 16px; flex-shrink: 0; }
.search-input {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 12px 9px 36px;
  font-size: 14px; color: var(--text-1); font-family: 'Inter', sans-serif; font-weight: 500;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.search-input::placeholder { color: var(--text-3); font-weight: 400; }
.search-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(30,107,69,0.10); background: #fff; }
.search-clear {
  position: absolute; right: 10px; background: none; border: none; cursor: pointer;
  color: var(--text-3); display: flex; align-items: center; padding: 2px;
  border-radius: 4px; transition: color .15s;
}
.search-clear:hover { color: var(--text-1); }

.filter-tabs {
  display: flex; gap: 4px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 4px;
}
.filter-tab {
  padding: 7px 14px; border-radius: 6px; border: none;
  background: transparent; font-size: 13px; font-weight: 600;
  color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.filter-tab:hover { background: var(--surface); color: var(--text-1); }
.filter-tab.active { background: var(--green); color: #fff; }

/* ── Results info ── */
.results-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.results-count { font-size: 13px; color: var(--text-2); font-weight: 500; }
.results-count strong { color: var(--text-1); font-weight: 700; }

/* ── Table ── */
.table-wrap {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden;
}

table { width: 100%; border-collapse: collapse; }

thead tr {
  background: var(--bg); border-bottom: 1px solid var(--border);
}
th {
  padding: 11px 16px; text-align: left;
  font-size: 11px; font-weight: 700; color: var(--text-3);
  letter-spacing: 0.7px; text-transform: uppercase; white-space: nowrap;
}

tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #FAFBFC; }

td { padding: 13px 16px; font-size: 14px; color: var(--text-1); vertical-align: middle; }

/* member cell */
.member-cell { display: flex; align-items: center; gap: 11px; }
.avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
}
.member-name { font-size: 14px; font-weight: 700; color: var(--text-1); }
.member-phone { font-size: 12px; color: var(--text-2); margin-top: 1px; }

/* status pill */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700; border: 1px solid;
}

/* time */
.time-primary { font-size: 14px; font-weight: 600; color: var(--text-1); }
.time-secondary { font-size: 12px; color: var(--text-2); margin-top: 1px; }

/* duration */
.duration-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; padding: 3px 9px;
  font-size: 12px; font-weight: 600; color: var(--text-2);
}

/* package badge */
.pkg-badge {
  display: inline-block; background: var(--green-light);
  border: 1px solid var(--green-border); color: var(--green);
  border-radius: 6px; padding: 3px 9px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
}

/* empty state */
.empty { text-align: center; padding: 60px 20px; color: var(--text-3); }
.empty-icon { font-size: 36px; margin-bottom: 10px; }
.empty-title { font-size: 15px; font-weight: 700; color: var(--text-2); margin-bottom: 4px; }
.empty-sub { font-size: 13px; }

/* pagination */
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-top: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px;
}
.page-info { font-size: 13px; color: var(--text-2); font-weight: 500; }
.page-btns { display: flex; gap: 6px; }
.page-btn {
  padding: 6px 12px; border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-md); background: var(--surface);
  font-size: 13px; font-weight: 600; color: var(--text-1);
  cursor: pointer; transition: all .15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--green); color: var(--green); background: var(--green-light); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-btn.active { background: var(--green); color: #fff; border-color: var(--green); }

@media (max-width: 768px) {
  .main { padding: 20px 16px 48px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  th:nth-child(4), td:nth-child(4),
  th:nth-child(5), td:nth-child(5) { display: none; }
}
`;

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

// Nhân viên đang đăng nhập — chỉ thấy chi nhánh này
const CURRENT_BRANCH = { id: 1, name: "Chi nhánh Quận 1" };

const AVATAR_COLORS = ["#1E6B45","#2563EB","#7C3AED","#DB2777","#D97706","#0891B2","#DC2626","#059669"];

const PACKAGES = ["Gói Tháng","Gói 3 Tháng","Gói 6 Tháng","Gói Năm","Gói Ngày"];

const MEMBERS = [
    { id: 1, name: "Nguyễn Văn An",    phone: "0912 345 678", packageName: "Gói 3 Tháng", branchId: 1 },
    { id: 2, name: "Trần Thị Bích",    phone: "0908 765 432", packageName: "Gói Tháng",   branchId: 1 },
    { id: 3, name: "Lê Minh Cường",    phone: "0977 111 222", packageName: "Gói Năm",     branchId: 1 },
    { id: 4, name: "Phạm Thị Dung",    phone: "0933 444 555", packageName: "Gói 6 Tháng", branchId: 1 },
    { id: 5, name: "Hoàng Văn Em",     phone: "0945 666 777", packageName: "Gói Tháng",   branchId: 1 },
    { id: 6, name: "Vũ Thị Phương",    phone: "0962 888 999", packageName: "Gói 3 Tháng", branchId: 1 },
    { id: 7, name: "Đặng Quốc Hùng",   phone: "0918 222 333", packageName: "Gói Ngày",    branchId: 1 },
    { id: 8, name: "Bùi Thị Lan",      phone: "0901 000 111", packageName: "Gói Năm",     branchId: 1 },
    { id: 9, name: "Ngô Thanh Long",   phone: "0985 333 444", packageName: "Gói Tháng",   branchId: 1 },
    { id: 10, name: "Lý Mỹ Linh",      phone: "0971 555 666", packageName: "Gói 6 Tháng", branchId: 1 },
    // Chi nhánh 2 — nhân viên hiện tại KHÔNG thấy
    { id: 11, name: "Cao Văn Minh",    phone: "0939 777 888", packageName: "Gói Tháng",   branchId: 2 },
    { id: 12, name: "Đinh Thị Nga",    phone: "0904 999 000", packageName: "Gói 3 Tháng", branchId: 2 },
];

// Tạo dữ liệu check-in mẫu
function makeCheckins() {
    const rows = [];
    let id = 1;
    const now = new Date("2025-06-23T18:00:00");

    const scenarios = [
        // hôm nay
        { mId: 1, hoursAgo: 0.5, dur: 75,  status: "CheckedIn" },
        { mId: 2, hoursAgo: 1,   dur: null, status: "CheckedIn" },
        { mId: 3, hoursAgo: 2,   dur: 60,  status: "CheckedOut" },
        { mId: 4, hoursAgo: 3,   dur: 90,  status: "CheckedOut" },
        { mId: 5, hoursAgo: 4,   dur: 45,  status: "CheckedOut" },
        { mId: 6, hoursAgo: 5,   dur: 120, status: "CheckedOut" },
        { mId: 7, hoursAgo: 6,   dur: 30,  status: "CheckedOut" },
        { mId: 8, hoursAgo: 7,   dur: 80,  status: "CheckedOut" },
        // hôm qua
        { mId: 1, hoursAgo: 24,  dur: 65,  status: "CheckedOut" },
        { mId: 3, hoursAgo: 25,  dur: 55,  status: "CheckedOut" },
        { mId: 9, hoursAgo: 26,  dur: 100, status: "CheckedOut" },
        { mId: 10, hoursAgo: 27, dur: 70,  status: "CheckedOut" },
        { mId: 2, hoursAgo: 28,  dur: 50,  status: "CheckedOut" },
        // 2 ngày trước
        { mId: 4, hoursAgo: 50,  dur: 85,  status: "CheckedOut" },
        { mId: 5, hoursAgo: 51,  dur: 40,  status: "CheckedOut" },
        { mId: 6, hoursAgo: 52,  dur: 110, status: "CheckedOut" },
        { mId: 7, hoursAgo: 53,  dur: 60,  status: "CheckedOut" },
        { mId: 8, hoursAgo: 54,  dur: 75,  status: "CheckedOut" },
        { mId: 1, hoursAgo: 55,  dur: 90,  status: "CheckedOut" },
        // chi nhánh 2 — sẽ bị lọc
        { mId: 11, hoursAgo: 1,  dur: 60,  status: "CheckedOut" },
        { mId: 12, hoursAgo: 2,  dur: 45,  status: "CheckedOut" },
    ];

    for (const s of scenarios) {
        const member = MEMBERS.find(m => m.id === s.mId);
        const checkInTime = new Date(now.getTime() - s.hoursAgo * 3600 * 1000);
        const checkOutTime = s.status === "CheckedOut" && s.dur
            ? new Date(checkInTime.getTime() + s.dur * 60 * 1000)
            : null;
        rows.push({
            id: id++,
            memberId: s.mId,
            member,
            branchId: member.branchId,
            checkInAt: checkInTime.toISOString(),
            checkOutAt: checkOutTime ? checkOutTime.toISOString() : null,
            durationMin: s.dur,
            status: s.status,
        });
    }
    return rows.sort((a, b) => new Date(b.checkInAt) - new Date(a.checkInAt));
}

const ALL_CHECKINS = makeCheckins();

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmtDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};
const fmtDuration = (min) => {
    if (!min) return null;
    if (min < 60) return `${min} phút`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
};
const initials = (name) => name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const PAGE_SIZE = 10;

const DATE_FILTERS = [
    { key: "all",       label: "Tất cả" },
    { key: "today",     label: "Hôm nay" },
    { key: "yesterday", label: "Hôm qua" },
    { key: "week",      label: "7 ngày" },
];

const STATUS_STYLE = {
    CheckedIn:  { label: "Đang tập", bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7", dot: "#10B981" },
    CheckedOut: { label: "Đã ra",    bg: "#F0F9FF", text: "#0C4A6E", border: "#7DD3FC", dot: "#0EA5E9" },
};

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function CheckinHistory() {
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("today");
    const [page, setPage] = useState(1);

    // Chỉ lấy check-in của chi nhánh hiện tại
    const branchCheckins = useMemo(
        () => ALL_CHECKINS.filter(c => c.branchId === CURRENT_BRANCH.id),
        []
    );

    const todayStr = fmtDate(new Date().toISOString());
    const yesterdayStr = fmtDate(new Date(Date.now() - 86400000).toISOString());

    const filtered = useMemo(() => {
        let rows = branchCheckins;

        // Date filter
        if (dateFilter === "today") {
            rows = rows.filter(r => fmtDate(r.checkInAt) === todayStr);
        } else if (dateFilter === "yesterday") {
            rows = rows.filter(r => fmtDate(r.checkInAt) === yesterdayStr);
        } else if (dateFilter === "week") {
            const cutoff = new Date(Date.now() - 7 * 86400000);
            rows = rows.filter(r => new Date(r.checkInAt) >= cutoff);
        }

        // Search by name or phone (normalize spaces/dashes)
        const q = search.trim().toLowerCase().replace(/[\s\-\.]/g, "");
        if (q) {
            rows = rows.filter(r => {
                const name = r.member.name.toLowerCase().replace(/\s/g, "");
                const phone = r.member.phone.replace(/[\s\-\.]/g, "");
                return name.includes(q) || phone.includes(q);
            });
        }

        return rows;
    }, [branchCheckins, dateFilter, search, todayStr, yesterdayStr]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const checkedInNow = branchCheckins.filter(c => c.status === "CheckedIn").length;

    const handleSearch = (v) => { setSearch(v); setPage(1); };
    const handleDate   = (k) => { setDateFilter(k); setPage(1); };

    return (
        <>
            <style>{css}</style>
            <div className="main">

                {/* ── Page header ── */}
                <div className="page-head">
                    <div className="page-head-left">
                        <div className="page-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                            </svg>
                        </div>
                        <div>
                            <div className="page-title">Lịch sử check-in</div>
                            <div className="page-subtitle">{CURRENT_BRANCH.name} · {checkedInNow} hội viên đang tập</div>
                        </div>
                    </div>
                    <div className="branch-badge">
                        <span className="branch-dot" />
                        {CURRENT_BRANCH.name}
                    </div>
                </div>

                {/* ── Toolbar ── */}
                <div className="toolbar">
                    {/* Search */}
                    <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            className="search-input"
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                        />
                        {search && (
                            <button className="search-clear" onClick={() => handleSearch("")}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                    </div>

                    {/* Date filter */}
                    <div className="filter-tabs">
                        {DATE_FILTERS.map(f => (
                            <button
                                key={f.key}
                                className={`filter-tab${dateFilter === f.key ? " active" : ""}`}
                                onClick={() => handleDate(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Results bar ── */}
                <div className="results-bar">
                    <p className="results-count">
                        Tìm thấy <strong>{filtered.length}</strong> lượt check-in
                        {search && <> cho "<strong>{search}</strong>"</>}
                    </p>
                </div>

                {/* ── Table ── */}
                <div className="table-wrap">
                    {pageRows.length === 0 ? (
                        <div className="empty">
                            <div className="empty-icon">🔍</div>
                            <div className="empty-title">Không tìm thấy kết quả</div>
                            <div className="empty-sub">Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc thời gian</div>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Hội viên</th>
                                    <th>Gói tập</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Thời gian tập</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(row => {
                                    const ss = STATUS_STYLE[row.status] || STATUS_STYLE.CheckedOut;
                                    return (
                                        <tr key={row.id}>
                                            {/* Member */}
                                            <td>
                                                <div className="member-cell">
                                                    <div className="avatar" style={{ background: avatarColor(row.memberId) }}>
                                                        {initials(row.member.name)}
                                                    </div>
                                                    <div>
                                                        <div className="member-name">{row.member.name}</div>
                                                        <div className="member-phone">{row.member.phone}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Package */}
                                            <td><span className="pkg-badge">{row.member.packageName}</span></td>

                                            {/* Check-in time */}
                                            <td>
                                                <div className="time-primary">{fmtTime(row.checkInAt)}</div>
                                                <div className="time-secondary">{fmtDate(row.checkInAt)}</div>
                                            </td>

                                            {/* Check-out time */}
                                            <td>
                                                {row.checkOutAt ? (
                                                    <>
                                                        <div className="time-primary">{fmtTime(row.checkOutAt)}</div>
                                                        <div className="time-secondary">{fmtDate(row.checkOutAt)}</div>
                                                    </>
                                                ) : (
                                                    <span style={{ color: "var(--text-3)", fontSize: 13 }}>—</span>
                                                )}
                                            </td>

                                            {/* Duration */}
                                            <td>
                                                {row.durationMin ? (
                                                    <span className="duration-badge">⏱ {fmtDuration(row.durationMin)}</span>
                                                ) : (
                                                    <span style={{ color: "var(--text-3)", fontSize: 13 }}>Đang tập</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <span className="status-pill" style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot, display: "inline-block" }} />
                                                    {ss.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {filtered.length > PAGE_SIZE && (
                        <div className="pagination">
                            <p className="page-info">
                                Trang {safePage} / {totalPages} · {filtered.length} kết quả
                            </p>
                            <div className="page-btns">
                                <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>← Trước</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .reduce((acc, p, i, arr) => {
                                        if (i > 0 && p - arr[i-1] > 1) acc.push("...");
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) =>
                                        p === "..." ? (
                                            <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-3)", lineHeight: "34px" }}>…</span>
                                        ) : (
                                            <button key={p} className={`page-btn${safePage === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                                        )
                                    )
                                }
                                <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Sau →</button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}