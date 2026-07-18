import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import managerApi from "../../../api/managerApi";

/* ─────────────────────────────────────────────
   STYLES — tông tối, đồng bộ với sidebar (navy + cyan + green)
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --cyan:        #22D3EE;
  --cyan-dim:    rgba(34,211,238,0.14);
  --cyan-border: rgba(34,211,238,0.30);

  --green:       #16A34A;
  --green-dim:   rgba(22,163,74,0.16);
  --green-border:rgba(22,163,74,0.32);

  --bg:        #0B1220;
  --surface:   #101B2D;
  --surface-2: #16233A;
  --border:    #1F2E47;
  --border-md: #2A3B58;

  --text-1: #F1F5F9;
  --text-2: #93A4BD;
  --text-3: #5B6B85;

  --radius:    12px;
  --radius-sm: 8px;
  --shadow-md: 0 8px 24px rgba(0,0,0,.35);
}

.checkin-shell { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

/* Khung bọc toàn trang: nổi bật hẳn lên so với nền trắng/xám của layout tổng */
.page-shell {
  background: var(--bg);
  border: 1px solid var(--border-md);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(2,6,23,0.28), 0 0 0 1px rgba(34,211,238,0.06);
  padding: 26px 0 6px;
  margin: 4px 0 24px;
}

.main { max-width: 1180px; margin: 0 auto; padding: 0 28px 40px; color: var(--text-1); }

.toolbar {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px;
  box-shadow: var(--shadow-md); margin-bottom: 18px;
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
}

.search-wrap { flex: 1; min-width: 220px; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: var(--text-3); width: 16px; height: 16px; flex-shrink: 0; }
.search-input {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 12px 9px 36px;
  font-size: 14px; color: var(--text-1); font-family: 'Inter', sans-serif; font-weight: 500;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.search-input::placeholder { color: var(--text-3); font-weight: 400; }
.search-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.12); }
.search-clear {
  position: absolute; right: 10px; background: none; border: none; cursor: pointer;
  color: var(--text-3); display: flex; align-items: center; padding: 2px;
  border-radius: 4px; transition: color .15s;
}
.search-clear:hover { color: var(--text-1); }

.branch-select-wrap { position: relative; display: flex; align-items: center; }
.branch-select-icon { position: absolute; left: 11px; color: var(--cyan); width: 15px; height: 15px; pointer-events: none; }
.branch-select {
  appearance: none; -webkit-appearance: none;
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 30px 9px 34px;
  font-size: 13px; font-weight: 600; color: var(--text-1); font-family: 'Inter', sans-serif;
  outline: none; cursor: pointer; transition: border-color .15s, box-shadow .15s;
  min-width: 168px;
}
.branch-select:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.12); }
.branch-select-caret { position: absolute; right: 10px; color: var(--text-3); width: 14px; height: 14px; pointer-events: none; }

.filter-tabs { display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; }
.filter-tab { padding: 7px 14px; border-radius: 6px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.filter-tab:hover { background: var(--surface-2); color: var(--text-1); }
.filter-tab.active { background: var(--cyan); color: #04222B; }

.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 16px; flex-wrap: wrap; }
.page-head-left { display: flex; align-items: center; gap: 14px; }
.page-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: linear-gradient(135deg, var(--green), #0F7B37);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 3px 14px rgba(22,163,74,0.35);
}
.page-title { font-size: 22px; font-weight: 800; color: var(--text-1); letter-spacing: -0.4px; line-height: 1; }
.page-subtitle { font-size: 13px; color: var(--text-2); margin-top: 4px; font-weight: 500; }

/* ── Stat cards: làm nổi bật số hội viên đang tập & chi nhánh ── */
.stats-row { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  flex: 1; min-width: 220px; position: relative; overflow: hidden;
  background: linear-gradient(150deg, var(--surface), var(--surface-2));
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  box-shadow: var(--shadow-md);
}
.stat-card::after {
  content: ""; position: absolute; right: -30px; top: -30px;
  width: 100px; height: 100px; border-radius: 50%; opacity: 0.10;
}
.stat-card.active-now { border-color: var(--green-border); box-shadow: 0 0 0 1px var(--green-border), var(--shadow-md); }
.stat-card.active-now::after { background: var(--green); }
.stat-card.branch-now { border-color: var(--cyan-border); box-shadow: 0 0 0 1px var(--cyan-border), var(--shadow-md); }
.stat-card.branch-now::after { background: var(--cyan); }

.stat-icon-wrap { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1; }
.stat-icon-wrap.green { background: var(--green-dim); color: #6EE7B7; }
.stat-icon-wrap.cyan { background: var(--cyan-dim); color: #67E8F9; }

.stat-body { z-index: 1; min-width: 0; }
.stat-value { font-size: 30px; font-weight: 900; line-height: 1; letter-spacing: -0.5px; }
.stat-value.green { color: #6EE7B7; }
.stat-value.cyan { color: #67E8F9; font-size: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-label { font-size: 11.5px; font-weight: 700; color: var(--text-2); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.6px; }
.stat-pulse { width: 7px; height: 7px; border-radius: 50%; background: #22C55E; display: inline-block; margin-right: 6px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

.results-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.results-count { font-size: 13px; color: var(--text-2); font-weight: 500; }
.results-count strong { color: var(--text-1); font-weight: 700; }
.refresh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface); border: 1.5px solid var(--border);
  color: var(--text-2); font-size: 13px; font-weight: 600;
  padding: 7px 12px; border-radius: var(--radius-sm); cursor: pointer; transition: all .15s;
}
.refresh-btn:hover { border-color: var(--cyan); color: var(--cyan); }
.refresh-btn:disabled { opacity: .5; cursor: default; }
.refresh-btn svg.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }

.table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: var(--surface-2); border-bottom: 1px solid var(--border); }
th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.7px; text-transform: uppercase; white-space: nowrap; }
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.12s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--surface-2); }
td { padding: 13px 16px; font-size: 14px; color: var(--text-1); vertical-align: middle; }

.member-cell { display: flex; align-items: center; gap: 11px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #04141F; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.member-name { font-size: 14px; font-weight: 700; color: var(--text-1); }
.member-phone { font-size: 12px; color: var(--text-2); margin-top: 1px; }

.branch-tag { display: inline-block; background: var(--cyan-dim); border: 1px solid var(--cyan-border); color: var(--cyan); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; margin-top: 3px; }

.status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid; }

.time-primary { font-size: 14px; font-weight: 600; color: var(--text-1); }
.time-secondary { font-size: 12px; color: var(--text-2); margin-top: 1px; }
.method-tag { font-size: 11px; color: var(--text-3); margin-top: 2px; }

.duration-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; font-size: 12px; font-weight: 600; color: var(--text-2); }

.empty, .state-box { text-align: center; padding: 60px 20px; color: var(--text-3); }
.empty-icon { font-size: 36px; margin-bottom: 10px; }
.empty-title { font-size: 15px; font-weight: 700; color: var(--text-2); margin-bottom: 4px; }
.empty-sub { font-size: 13px; }

.skeleton-row td { padding: 16px; }
.skeleton-bar { height: 14px; border-radius: 4px; background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.error-box { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
.page-info { font-size: 13px; color: var(--text-2); font-weight: 500; }
.page-btns { display: flex; gap: 6px; }
.page-btn { padding: 6px 12px; border-radius: var(--radius-sm); border: 1.5px solid var(--border-md); background: var(--surface); font-size: 13px; font-weight: 600; color: var(--text-1); cursor: pointer; transition: all .15s; }
.page-btn:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-btn.active { background: var(--cyan); color: #04222B; border-color: var(--cyan); }

@media (max-width: 768px) {
  .page-shell { border-radius: 14px; margin: 0 0 16px; }
  .main { padding: 0 16px 32px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .branch-select { width: 100%; }
  th:nth-child(3), td:nth-child(3) { display: none; }
}
`;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const AVATAR_COLORS = ["#22D3EE", "#16A34A", "#A78BFA", "#F472B6", "#FBBF24", "#38BDF8", "#FB7185", "#34D399"];

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
const fmtDuration = (checkIn, checkOut) => {
    if (!checkOut) return null;
    const min = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    if (min < 60) return `${min} phút`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
};
const initials = (name = "") => name.trim().split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
const avatarColor = (id) => AVATAR_COLORS[Number(id) % AVATAR_COLORS.length];

// Xử lý linh hoạt hình dạng response: có thể là res.data (axios chuẩn)
// hoặc res đã được interceptor unwrap sẵn (res chính là { items, totalCount, ... })
function unwrapHistoryResponse(res) {
    if (res?.data && Array.isArray(res.data.items)) return res.data;
    if (Array.isArray(res?.items)) return res;
    return { items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE };
}

const PAGE_SIZE = 10;

const DATE_FILTERS = [
    { key: "today", label: "Hôm nay" },
    { key: "yesterday", label: "Hôm qua" },
    { key: "week", label: "7 ngày" },
    { key: "all", label: "Tất cả" },
];

const STATUS_STYLE = {
    in: { label: "Đang tập", bg: "rgba(34,211,238,0.12)", text: "#67E8F9", border: "rgba(34,211,238,0.35)", dot: "#22D3EE" },
    out: { label: "Đã ra", bg: "rgba(22,163,74,0.12)", text: "#6EE7B7", border: "rgba(22,163,74,0.35)", dot: "#16A34A" },
};

// Format ngày kiểu yyyy-MM-dd theo giờ LOCAL của trình duyệt (KHÔNG qua .toISOString())
// -> .toISOString() convert sang UTC, ở VN (+7) sẽ làm lùi ngày => lọc sai.
const toDateOnlyStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Tính khoảng ngày cho từng filter — trả về { fromDate, toDate } dạng "yyyy-MM-dd", undefined nếu "Tất cả"
function getDateRange(key) {
    const now = new Date();

    if (key === "today") {
        return { fromDate: toDateOnlyStr(now), toDate: toDateOnlyStr(now) };
    }
    if (key === "yesterday") {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { fromDate: toDateOnlyStr(y), toDate: toDateOnlyStr(y) };
    }
    if (key === "week") {
        const from = new Date(now); from.setDate(from.getDate() - 6);
        return { fromDate: toDateOnlyStr(from), toDate: toDateOnlyStr(now) };
    }
    return { fromDate: undefined, toDate: undefined }; // "all"
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function CheckinHistoryOfManager() {
    // ManagerLayout đã gọi managerApi.getEmployeeProfile() và truyền xuống qua
    // <Outlet context={{ profile }} /> — profile.branches chính là danh sách
    // chi nhánh của manager (cùng nguồn dữ liệu render các chip ở topbar).
    const { profile } = useOutletContext() || {};
    const branches = useMemo(
        () => (Array.isArray(profile?.branches) ? profile.branches : []),
        [profile]
    );

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("today");
    const [page, setPage] = useState(1);

    // Chi nhánh đang chọn để lọc ("" = tất cả chi nhánh của manager)
    const [branchId, setBranchId] = useState("");

    const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tăng số này mỗi khi bấm "Làm mới" để CHỦ ĐỘNG kích hoạt lại fetch effect
    // (đổi data/page bằng cùng giá trị cũ sẽ KHÔNG re-run effect vì React bail-out
    // khi state không đổi — cần 1 dependency thực sự thay đổi).
    const [reloadTick, setReloadTick] = useState(0);

    const requestIdRef = useRef(0);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [dateFilter, branchId]);

    useEffect(() => {
        const currentId = ++requestIdRef.current;
        const { fromDate, toDate } = getDateRange(dateFilter);

        setLoading(true);
        setError(null);

        managerApi
            .getIdentifyHistory({
                fromDate,
                toDate,
                branchId: branchId || undefined,
                keyword: debouncedSearch || undefined,
                page,
                pageSize: PAGE_SIZE,
            })
            .then((res) => {
                if (currentId !== requestIdRef.current) return;
                setData(unwrapHistoryResponse(res));
            })
            .catch((err) => {
                if (currentId !== requestIdRef.current) return;
                setError(
                    err?.response?.data?.message || "Không tải được lịch sử check-in. Vui lòng thử lại."
                );
            })
            .finally(() => {
                if (currentId === requestIdRef.current) setLoading(false);
            });
    }, [debouncedSearch, dateFilter, branchId, page, reloadTick]);

    const items = data.items || [];
    const totalCount = data.totalCount || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const checkedInNow = items.filter((r) => !r.checkOutTime).length;

    // Nhãn chi nhánh nổi bật ở khu vực stat-card: ưu tiên chi nhánh đang lọc,
    // nếu "tất cả" thì suy ra từ dữ liệu trả về hoặc từ danh sách branches đã nạp.
    const branchLabel = useMemo(() => {
        if (branchId) {
            const found = branches.find((b) => String(b.branchId) === String(branchId));
            if (found) return found.branchName;
        }
        const names = [...new Set(items.map((r) => r.branchName).filter(Boolean))];
        if (names.length === 1) return names[0];
        if (names.length > 1) return `${names.length} chi nhánh`;
        return branches.length > 0 ? `${branches.length} chi nhánh` : "Chi nhánh của bạn";
    }, [branchId, branches, items]);

    const handleSearch = (v) => setSearch(v);
    const handleDate = (k) => setDateFilter(k);
    const handleBranch = (v) => setBranchId(v);
    const forceReload = () => setReloadTick((t) => t + 1);

    return (
        <div className="checkin-shell">
            <style>{css}</style>
            <div className="page-shell">
                <div className="main">
                    <div className="page-head">
                        <div className="page-head-left">
                            <div className="page-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <polyline points="12 7 12 12 15.5 14" />
                                </svg>
                            </div>
                            <div>
                                <div className="page-title">Lịch sử check-in</div>
                                <div className="page-subtitle">Theo dõi lượt ra/vào của hội viên theo chi nhánh</div>
                            </div>
                        </div>
                    </div>

                    <div className="stats-row">
                        <div className="stat-card active-now">
                            <div className="stat-icon-wrap green">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div className="stat-body">
                                <div className="stat-value green"><span className="stat-pulse" />{checkedInNow}</div>
                                <div className="stat-label">Hội viên đang tập</div>
                            </div>
                        </div>

                        <div className="stat-card branch-now">
                            <div className="stat-icon-wrap cyan">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div className="stat-body">
                                <div className="stat-value cyan" title={branchLabel}>{branchLabel}</div>
                                <div className="stat-label">Chi nhánh</div>
                            </div>
                        </div>
                    </div>

                    <div className="toolbar">
                        <div className="search-wrap">
                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                className="search-input"
                                placeholder="Tìm theo tên hội viên hoặc số điện thoại..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {search && (
                                <button className="search-clear" onClick={() => handleSearch("")}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {branches.length > 0 && (
                            <div className="branch-select-wrap">
                                <svg className="branch-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <select className="branch-select" value={branchId} onChange={(e) => handleBranch(e.target.value)}>
                                    <option value="">Tất cả chi nhánh</option>
                                    {branches.map((b) => (
                                        <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
                                    ))}
                                </select>
                                <svg className="branch-select-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        )}

                        <div className="filter-tabs">
                            {DATE_FILTERS.map((f) => (
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

                    <div className="results-bar">
                        <p className="results-count">
                            {loading ? "Đang tải..." : (
                                <>Tìm thấy <strong>{totalCount}</strong> lượt check-in{debouncedSearch && <> cho "<strong>{debouncedSearch}</strong>"</>}</>
                            )}
                        </p>
                        <button className="refresh-btn" onClick={forceReload} disabled={loading}>
                            <svg className={loading ? "spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 11-2.64-6.36" /><path d="M21 3v6h-6" />
                            </svg>
                            Làm mới
                        </button>
                    </div>

                    {error && (
                        <div className="error-box">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="table-wrap">
                        {loading ? (
                            <table>
                                <thead>
                                    <tr><th>Hội viên</th><th>Chi nhánh</th><th>Check-in</th><th>Check-out</th><th>Thời gian tập</th><th>Trạng thái</th></tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="skeleton-row">
                                            <td><div className="skeleton-bar" style={{ width: "70%" }} /></td>
                                            <td><div className="skeleton-bar" style={{ width: "50%" }} /></td>
                                            <td><div className="skeleton-bar" style={{ width: "60%" }} /></td>
                                            <td><div className="skeleton-bar" style={{ width: "60%" }} /></td>
                                            <td><div className="skeleton-bar" style={{ width: "40%" }} /></td>
                                            <td><div className="skeleton-bar" style={{ width: "50%" }} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : items.length === 0 && !error ? (
                            <div className="empty">
                                <div className="empty-icon">🔍</div>
                                <div className="empty-title">Không tìm thấy kết quả</div>
                                <div className="empty-sub">Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc thời gian / chi nhánh</div>
                            </div>
                        ) : !error ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Hội viên</th>
                                        <th>Chi nhánh</th>
                                        <th>Check-in</th>
                                        <th>Check-out</th>
                                        <th>Thời gian tập</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => {
                                        const isCheckedIn = !row.checkOutTime;
                                        const ss = isCheckedIn ? STATUS_STYLE.in : STATUS_STYLE.out;
                                        return (
                                            <tr key={row.checkInId}>
                                                <td>
                                                    <div className="member-cell">
                                                        <div className="avatar" style={row.memberAvatar ? undefined : { background: avatarColor(row.memberId) }}>
                                                            {row.memberAvatar ? (
                                                                <img src={row.memberAvatar} alt={row.memberName} />
                                                            ) : (
                                                                initials(row.memberName)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="member-name">{row.memberName}</div>
                                                            <div className="member-phone">{row.memberPhone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="branch-tag">{row.branchName}</span>
                                                </td>
                                                <td>
                                                    <div className="time-primary">{fmtTime(row.checkInTime)}</div>
                                                    <div className="time-secondary">{fmtDate(row.checkInTime)}</div>
                                                    <div className="method-tag">
                                                        {row.checkInMethod === "Manual" ? `Thủ công${row.checkInStaffName ? ` · ${row.checkInStaffName}` : ""}` : "Tự động"}
                                                    </div>
                                                </td>
                                                <td>
                                                    {row.checkOutTime ? (
                                                        <>
                                                            <div className="time-primary">{fmtTime(row.checkOutTime)}</div>
                                                            <div className="time-secondary">{fmtDate(row.checkOutTime)}</div>
                                                            <div className="method-tag">
                                                                {row.checkOutMethod === "Manual" ? `Thủ công${row.checkOutStaffName ? ` · ${row.checkOutStaffName}` : ""}` : "Tự động"}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: "var(--text-3)", fontSize: 13 }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {row.checkOutTime ? (
                                                        <span className="duration-badge">⏱ {fmtDuration(row.checkInTime, row.checkOutTime)}</span>
                                                    ) : (
                                                        <span style={{ color: "var(--text-3)", fontSize: 13 }}>Đang tập</span>
                                                    )}
                                                </td>
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
                        ) : null}

                        {!loading && !error && totalCount > PAGE_SIZE && (
                            <div className="pagination">
                                <p className="page-info">Trang {page} / {totalPages} · {totalCount} kết quả</p>
                                <div className="page-btns">
                                    <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                        .reduce((acc, p, i, arr) => {
                                            if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, i) =>
                                            p === "..." ? (
                                                <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-3)", lineHeight: "34px" }}>…</span>
                                            ) : (
                                                <button key={p} className={`page-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                                            )
                                        )}
                                    <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Sau →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}