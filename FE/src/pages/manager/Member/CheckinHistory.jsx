import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import managerApi from "../../../api/managerApi";

/* ─────────────────────────────────────────────
   STYLES — bảng cao hơn, header bảng có màu,
   viền từng khối phân biệt màu, các khối khác
   thu gọn lại để nhường chỗ cho bảng.
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:        #059669;
  --green-dark:   #047857;
  --green-dim:    #F0FDF4;
  --green-border: #A7F3D0;

  --teal:        #0891B2;
  --teal-dark:   #0E7490;
  --teal-dim:    #ECFEFF;
  --teal-border: #A5F3FC;

  --purple:        #7C3AED;
  --purple-dark:   #6D28D9;
  --purple-dim:    #F5F3FF;
  --purple-border: #DDD6FE;

  --bg:        #F1F5F9;
  --surface:   #FFFFFF;
  --surface-2: #F8FAFC;
  --border:    #E2E8F0;

  --text-1: #1E293B;
  --text-2: #64748B;
  --text-3: #94A3B8;

  --radius:    12px;
  --radius-sm: 8px;
  --shadow-md: 0 12px 24px -10px rgba(15,23,42,0.18), 0 4px 10px -3px rgba(15,23,42,0.10);
  --shadow-lg: 0 18px 36px -12px rgba(15,23,42,0.24), 0 8px 16px -6px rgba(15,23,42,0.14);
}

.checkin-shell { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

.page-shell {
  background: var(--bg);
  border: 1.5px solid var(--green-border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  padding: 16px 0 6px;
  margin: 4px 0 20px;
}

.main { max-width: 1180px; margin: 0 auto; padding: 0 22px 24px; color: var(--text-1); display: flex; flex-direction: column; height: 82vh; min-height: 560px; }

/* ── Header nhỏ gọn ── */
.page-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-shrink: 0; }
.page-icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(5,150,105,0.32);
}
.page-title { font-size: 17px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; line-height: 1.1; }
.page-subtitle { font-size: 11.5px; color: var(--text-2); font-weight: 500; }

/* ── Toolbar: gộp tìm kiếm + chi nhánh + loại người + bộ lọc ngày + số liệu nhanh + làm mới ── */
.toolbar {
  background: var(--surface); border: 1.5px solid var(--teal-border);
  border-radius: var(--radius-sm); padding: 8px 10px;
  box-shadow: var(--shadow-md); margin-bottom: 10px;
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center; flex-shrink: 0;
}

.search-wrap { flex: 1; min-width: 180px; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-3); width: 14px; height: 14px; flex-shrink: 0; }
.search-input {
  width: 100%; background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: 7px; padding: 6px 10px 6px 30px;
  font-size: 13px; color: var(--text-1); font-family: 'Inter', sans-serif; font-weight: 500;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.search-input::placeholder { color: var(--text-3); font-weight: 400; }
.search-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-dim); }
.search-clear {
  position: absolute; right: 8px; background: none; border: none; cursor: pointer;
  color: var(--text-3); display: flex; align-items: center; padding: 2px; border-radius: 4px;
}
.search-clear:hover { color: var(--text-1); }

.branch-select-wrap { position: relative; display: flex; align-items: center; }
.branch-select-icon { position: absolute; left: 9px; color: var(--teal-dark); width: 13px; height: 13px; pointer-events: none; }
.branch-select {
  appearance: none; -webkit-appearance: none;
  background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: 7px; padding: 6px 26px 6px 28px;
  font-size: 12.5px; font-weight: 600; color: var(--text-1); font-family: 'Inter', sans-serif;
  outline: none; cursor: pointer; min-width: 150px;
}
.branch-select:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-dim); }
.branch-select-caret { position: absolute; right: 8px; color: var(--text-3); width: 12px; height: 12px; pointer-events: none; }

.person-select-wrap { position: relative; display: flex; align-items: center; }
.person-select-icon { position: absolute; left: 9px; color: var(--purple-dark); width: 13px; height: 13px; pointer-events: none; }
.person-select {
  appearance: none; -webkit-appearance: none;
  background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: 7px; padding: 6px 26px 6px 28px;
  font-size: 12.5px; font-weight: 600; color: var(--text-1); font-family: 'Inter', sans-serif;
  outline: none; cursor: pointer; min-width: 130px;
}
.person-select:focus { border-color: var(--purple); box-shadow: 0 0 0 3px var(--purple-dim); }
.person-select-caret { position: absolute; right: 8px; color: var(--text-3); width: 12px; height: 12px; pointer-events: none; }

.filter-tabs { display: flex; gap: 3px; background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 7px; padding: 3px; }
.filter-tab { padding: 5px 11px; border-radius: 5px; border: none; background: transparent; font-size: 12px; font-weight: 600; color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.filter-tab:hover { background: var(--surface); color: var(--green-dark); }
.filter-tab.active { background: var(--green); color: #FFFFFF; }

.refresh-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--surface); border: 1.5px solid var(--teal-border);
  color: var(--teal-dark); font-size: 12.5px; font-weight: 600;
  padding: 6px 10px; border-radius: 7px; cursor: pointer; transition: all .15s;
}
.refresh-btn:hover { background: var(--teal-dim); }
.refresh-btn:disabled { opacity: .5; cursor: default; }
.refresh-btn svg.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }

.results-count { font-size: 12px; color: var(--text-2); font-weight: 500; margin-bottom: 6px; flex-shrink: 0; }
.results-count strong { color: var(--text-1); font-weight: 700; }

/* ── Bảng: chiếm phần lớn chiều cao còn lại ── */
.table-wrap { background: var(--surface); border: 1.5px solid var(--green-border); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.table-scroll { overflow-y: auto; flex: 1; min-height: 0; }
table { width: 100%; border-collapse: collapse; }
thead { position: sticky; top: 0; z-index: 1; }
thead tr { background: linear-gradient(135deg, var(--green), var(--teal-dark)); }
th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.6px; text-transform: uppercase; white-space: nowrap; }
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.12s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--green-dim); }
td { padding: 10px 16px; font-size: 13.5px; color: var(--text-1); vertical-align: middle; }

.member-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; color: #FFFFFF; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.member-name { font-size: 13.5px; font-weight: 700; color: var(--text-1); }
.member-phone { font-size: 11.5px; color: var(--text-2); margin-top: 1px; }

.person-tag { display: inline-block; border-radius: 6px; padding: 1px 7px; font-size: 10px; font-weight: 700; margin-top: 2px; }
.person-tag.member { background: var(--green-dim); border: 1px solid var(--green-border); color: var(--green-dark); }
.person-tag.employee { background: var(--purple-dim); border: 1px solid var(--purple-border); color: var(--purple-dark); }

.branch-tag { display: inline-block; background: var(--teal-dim); border: 1px solid var(--teal-border); color: var(--teal-dark); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; }

.status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid; }

.time-primary { font-size: 13.5px; font-weight: 600; color: var(--text-1); }
.time-secondary { font-size: 11.5px; color: var(--text-2); margin-top: 1px; }
.method-tag { font-size: 10.5px; color: var(--text-3); margin-top: 2px; }

.duration-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; font-size: 12px; font-weight: 600; color: var(--text-2); }

.empty { text-align: center; padding: 50px 20px; color: var(--text-3); }
.empty-icon { font-size: 32px; margin-bottom: 8px; }
.empty-title { font-size: 14px; font-weight: 700; color: var(--text-2); margin-bottom: 4px; }
.empty-sub { font-size: 12.5px; }

.skeleton-row td { padding: 13px 16px; }
.skeleton-bar { height: 12px; border-radius: 4px; background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.error-box { background: rgba(220,38,38,0.06); border: 1.5px solid rgba(220,38,38,0.28); color: #B91C1C; padding: 9px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-top: 1.5px solid var(--green-border); background: var(--green-dim); flex-wrap: wrap; gap: 8px; flex-shrink: 0; }
.page-info { font-size: 12px; color: var(--text-2); font-weight: 500; }
.page-btns { display: flex; gap: 5px; }
.page-btn { padding: 5px 10px; border-radius: 6px; border: 1.5px solid var(--border); background: var(--surface); font-size: 12.5px; font-weight: 600; color: var(--text-1); cursor: pointer; transition: all .15s; }
.page-btn:hover:not(:disabled) { border-color: var(--green); color: var(--green-dark); }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-btn.active { background: var(--green); color: #FFFFFF; border-color: var(--green); }
.page-ellipsis { padding: 0 3px; color: var(--text-3); line-height: 30px; font-size: 12.5px; }

@media (max-width: 768px) {
  .page-shell { border-radius: 14px; margin: 0 0 16px; }
  .main { padding: 0 14px 20px; height: auto; min-height: 0; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .branch-select, .person-select { width: 100%; }
  th:nth-child(3), td:nth-child(3) { display: none; }
}
`;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const AVATAR_COLORS = ["#22D3EE", "#16A34A", "#A78BFA", "#F472B6", "#FBBF24", "#38BDF8", "#FB7185", "#34D399"];
const PAGE_SIZE = 10;

const DATE_FILTERS = [
    { key: "today", label: "Hôm nay" },
    { key: "yesterday", label: "Hôm qua" },
    { key: "week", label: "7 ngày" },
    { key: "all", label: "Tất cả" },
];

// Lọc theo loại người check-in — khớp với BE: PersonType = "member" | "employee" | "" (tất cả)
const PERSON_FILTERS = [
    { key: "", label: "Tất cả" },
    { key: "member", label: "Hội viên" },
    { key: "employee", label: "Nhân viên" },
];

const STATUS_STYLE = {
    in: { label: "Đang tập", bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC", dot: "#0891B2" },
    out: { label: "Đã ra", bg: "#F0FDF4", text: "#047857", border: "#A7F3D0", dot: "#059669" },
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : null);
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null);
const fmtDuration = (checkIn, checkOut) => {
    if (!checkOut) return null;
    const min = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    if (min < 60) return `${min} phút`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
};
const initials = (name = "") => name.trim().split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
const avatarColor = (id) => AVATAR_COLORS[Number(id || 0) % AVATAR_COLORS.length];

// BE giờ trả toàn bộ danh sách khớp bộ lọc (không phân trang): { items, totalCount }.
// Vẫn xử lý linh hoạt hình dạng response: res.data.items (axios chuẩn) hoặc res.items (đã unwrap sẵn)
const unwrapHistoryResponse = (res) => {
    const body = Array.isArray(res?.items) ? res : res?.data;
    return {
        items: Array.isArray(body?.items) ? body.items : [],
        totalCount: body?.totalCount || 0,
    };
};

// Format ngày yyyy-MM-dd theo giờ LOCAL (không dùng toISOString để tránh lệch múi giờ VN +7)
const toDateOnlyStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

function getDateRange(key) {
    const now = new Date();
    if (key === "today") return { fromDate: toDateOnlyStr(now), toDate: toDateOnlyStr(now) };
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

// Danh sách số trang hiển thị dạng: 1 … 4 5 [6] 7 8 … 20
function getPageNumbers(page, totalPages) {
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    }
    const result = [];
    pages.forEach((p, i) => {
        if (i > 0 && p - pages[i - 1] > 1) result.push("...");
        result.push(p);
    });
    return result;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function CheckinHistoryOfManager() {
    const outletCtx = useOutletContext() || {};

    // Outlet context có thể ở nhiều hình dạng tuỳ layout cha (đôi khi thẳng object nhân viên
    // ở top-level, đôi khi bọc trong { profile } hoặc { employee }) -> thử lần lượt.
    const contextBranches = useMemo(() => {
        if (Array.isArray(outletCtx.branches)) return outletCtx.branches;
        if (Array.isArray(outletCtx.profile?.branches)) return outletCtx.profile.branches;
        if (Array.isArray(outletCtx.employee?.branches)) return outletCtx.employee.branches;
        return null;
    }, [outletCtx]);

    const [branches, setBranches] = useState(contextBranches || []);

    // Nếu context đã có sẵn branches thì dùng luôn, không cần gọi API.
    useEffect(() => {
        if (contextBranches && contextBranches.length > 0) {
            setBranches(contextBranches);
            return;
        }

        // Fallback: context không có (hoặc rỗng) -> tự gọi API lấy profile nhân viên.
        managerApi
            .getEmployeeProfile()
            .then((res) => {
                const body = res?.data ?? res;
                setBranches(Array.isArray(body?.branches) ? body.branches : []);
            })
            .catch(() => setBranches([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextBranches]);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("today");
    const [branchId, setBranchId] = useState("");
    const [personType, setPersonType] = useState(""); // "" | "member" | "employee"
    const [page, setPage] = useState(1);

    // allItems: TOÀN BỘ danh sách khớp bộ lọc server (BE không phân trang nữa, FE tự cắt trang).
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadTick, setReloadTick] = useState(0);

    const requestIdRef = useRef(0);

    // Debounce ô tìm kiếm
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    // Đổi bất kỳ bộ lọc nào thì về trang 1
    useEffect(() => setPage(1), [dateFilter, branchId, personType, debouncedSearch]);

    // Gọi API mỗi khi bộ lọc server đổi — KHÔNG gửi page/pageSize, BE trả full danh sách khớp filter.
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
                personType: personType || undefined,
            })
            .then((res) => {
                if (currentId === requestIdRef.current) setAllItems(unwrapHistoryResponse(res).items);
            })
            .catch((err) => {
                if (currentId === requestIdRef.current) {
                    setError(err?.response?.data?.message || "Không tải được lịch sử check-in. Vui lòng thử lại.");
                }
            })
            .finally(() => {
                if (currentId === requestIdRef.current) setLoading(false);
            });
    }, [debouncedSearch, dateFilter, branchId, personType, reloadTick]);

    // Phân trang xử lý hoàn toàn ở FE trên tập dữ liệu đã tải về.
    const totalCount = allItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const items = useMemo(
        () => allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [allItems, page]
    );

    return (
        <div className="checkin-shell">
            <style>{css}</style>
            <div className="page-shell">
                <div className="main">
                    <div className="page-head">
                        <div className="page-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
                            </svg>
                        </div>
                        <div>
                            <div className="page-title">Lịch sử check-in</div>
                            <div className="page-subtitle">Theo dõi lượt ra/vào của hội viên & nhân viên theo chi nhánh</div>
                        </div>
                    </div>

                    <div className="toolbar">
                        <div className="search-wrap">
                            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                className="search-input"
                                placeholder="Tìm theo tên (hội viên/nhân viên) hoặc số điện thoại..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button className="search-clear" onClick={() => setSearch("")}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                                <select className="branch-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
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

                        <div className="person-select-wrap">
                            <svg className="person-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <select className="person-select" value={personType} onChange={(e) => setPersonType(e.target.value)}>
                                {PERSON_FILTERS.map((f) => (
                                    <option key={f.key || "all"} value={f.key}>{f.label}</option>
                                ))}
                            </select>
                            <svg className="person-select-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>

                        <div className="filter-tabs">
                            {DATE_FILTERS.map((f) => (
                                <button
                                    key={f.key}
                                    className={`filter-tab${dateFilter === f.key ? " active" : ""}`}
                                    onClick={() => setDateFilter(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <button className="refresh-btn" onClick={() => setReloadTick((t) => t + 1)} disabled={loading}>
                            <svg className={loading ? "spin" : ""} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 11-2.64-6.36" /><path d="M21 3v6h-6" />
                            </svg>
                            Làm mới
                        </button>
                    </div>

                    <p className="results-count">
                        {loading ? "Đang tải..." : (
                            <>Tìm thấy <strong>{totalCount}</strong> lượt check-in{debouncedSearch && <> cho "<strong>{debouncedSearch}</strong>"</>}</>
                        )}
                    </p>

                    {error && (
                        <div className="error-box">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="table-wrap">
                        <div className="table-scroll">
                            {loading ? (
                                <table>
                                    <thead>
                                        <tr><th>Người check-in</th><th>Chi nhánh</th><th>Check-in</th><th>Check-out</th><th>Thời gian</th><th>Trạng thái</th></tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: 8 }).map((_, i) => (
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
                                    <div className="empty-sub">Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc thời gian / chi nhánh / loại người</div>
                                </div>
                            ) : !error ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Người check-in</th><th>Chi nhánh</th><th>Check-in</th><th>Check-out</th><th>Thời gian</th><th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row) => {
                                            const ss = row.checkOutTime ? STATUS_STYLE.out : STATUS_STYLE.in;
                                            const isEmployee = !!row.isEmployee;
                                            const name = isEmployee ? row.employeeName : row.memberName;
                                            const id = isEmployee ? row.employeeId : row.memberId;
                                            const avatarUrl = isEmployee ? null : row.memberAvatar;

                                            return (
                                                <tr key={row.checkInId}>
                                                    <td>
                                                        <div className="member-cell">
                                                            <div className="avatar" style={avatarUrl ? undefined : { background: avatarColor(id) }}>
                                                                {avatarUrl ? <img src={avatarUrl} alt={name} /> : initials(name)}
                                                            </div>
                                                            <div>
                                                                <div className="member-name">{name}</div>
                                                                {!isEmployee && <div className="member-phone">{row.memberPhone}</div>}
                                                                <span className={`person-tag ${isEmployee ? "employee" : "member"}`}>
                                                                    {isEmployee ? "Nhân viên" : "Hội viên"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className="branch-tag">{row.branchName}</span></td>
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
                                                            <span style={{ color: "var(--text-3)", fontSize: 13 }}>Đang ở trong</span>
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
                        </div>

                        {!loading && !error && totalCount > PAGE_SIZE && (
                            <div className="pagination">
                                <p className="page-info">Trang {page} / {totalPages} · {totalCount} kết quả</p>
                                <div className="page-btns">
                                    <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button>
                                    {getPageNumbers(page, totalPages).map((p, i) =>
                                        p === "..." ? (
                                            <span key={`e${i}`} className="page-ellipsis">…</span>
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