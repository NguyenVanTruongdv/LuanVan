import { useCallback, useEffect, useRef, useState } from "react";
import adminApi from "../../../api/AdminApi";

function Icon({ name }) {
    const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
    switch (name) {
        case "building":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="16" height="18" rx="1" />
                    <line x1="9" y1="7" x2="9" y2="7.01" />
                    <line x1="15" y1="7" x2="15" y2="7.01" />
                    <line x1="9" y1="11" x2="9" y2="11.01" />
                    <line x1="15" y1="11" x2="15" y2="11.01" />
                    <line x1="9" y1="15" x2="9" y2="15.01" />
                    <line x1="15" y1="15" x2="15" y2="15.01" />
                    <line x1="10" y1="21" x2="10" y2="17" />
                    <line x1="14" y1="21" x2="14" y2="17" />
                </svg>
            );
        case "check":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12l3 3 5-6" />
                </svg>
            );
        case "pause":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="10" y1="9" x2="10" y2="15" />
                    <line x1="14" y1="9" x2="14" y2="15" />
                </svg>
            );
        case "users":
            return (
                <svg {...common}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case "search":
            return (
                <svg {...common} width="17" height="17">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            );
        case "plus":
            return (
                <svg {...common} width="16" height="16" stroke="#0F172A">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            );
        case "phone":
            return (
                <svg {...common} width="16" height="16">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "pin":
            return (
                <svg {...common} width="16" height="16">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            );
        case "refresh":
            return (
                <svg {...common} width="15" height="15">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
            );
        case "dots":
            return (
                <svg {...common} width="18" height="18">
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                </svg>
            );
        case "chevronLeft":
            return (
                <svg {...common} width="16" height="16">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            );
        case "chevronRight":
            return (
                <svg {...common} width="16" height="16">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            );
        case "chevronDown":
            return (
                <svg {...common} width="14" height="14">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        default:
            return null;
    }
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initials(name) {
    if (!name) return "?";
    return name.trim().charAt(0).toUpperCase();
}

export default function BranchListAdmin() {
    const [branches, setBranches] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [nameInput, setNameInput] = useState("");
    const [name, setName] = useState(""); // debounced value actually sent to API
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debounceRef = useRef(null);

    // Debounce search input -> name (triggers fetch), reset về trang 1 mỗi lần đổi filter
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setName(nameInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [nameInput]);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminApi.getBranches({
                Name: name || undefined,
                Status: status || undefined,
                Page: page,
                PageSize: pageSize,
            });

            const data = res?.data ?? res; // phòng trường hợp authApi trả về {data: ...} hoặc trả thẳng

            const items = data?.items ?? [];
            setBranches(items);
            setTotalItems(data?.totalCount ?? data?.totalItems ?? data?.total ?? items.length);
            setTotalPages(
                data?.totalPages ??
                Math.max(1, Math.ceil((data?.totalCount ?? items.length) / pageSize))
            );
        } catch (err) {
            console.error(err);
            setError("Không thể tải danh sách chi nhánh. Vui lòng thử lại.");
            setBranches([]);
        } finally {
            setLoading(false);
        }
    }, [name, status, page, pageSize]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const handleClearFilters = () => {
        setNameInput("");
        setName("");
        setStatus("");
        setPage(1);
    };

    // Thống kê tạm tính theo dữ liệu đang tải (best-effort).
    // Nếu backend có endpoint riêng trả về số liệu tổng hợp toàn hệ thống, nên thay bằng gọi API đó.
    const activeCount = branches.filter((b) => b.status === "Active").length;
    const inactiveCount = branches.filter((b) => b.status === "Inactive").length;
    const managerCount = new Set(
        branches.flatMap((b) => (b.managers || []).map((m) => m.employeeId))
    ).size;

    const stats = [
        { label: "Tổng chi nhánh", value: totalItems, icon: "building", tone: "teal" },
        { label: "Đang hoạt động (trang này)", value: activeCount, icon: "check", tone: "green" },
        { label: "Tạm ngừng (trang này)", value: inactiveCount, icon: "pause", tone: "orange" },
        { label: "Quản lý chi nhánh (trang này)", value: managerCount, icon: "users", tone: "rose" },
    ];

    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    return (
        <div className="bl-root">
            <style>{`
        .bl-root {
          --cyan: #06B6D4;
          --cyan-dark: #0891B2;
          --bg: #0B1120;
          --card: #1E293B;
          --card-soft: #0F172A;
          --line: #334155;
          --ink: #F1F5F9;
          --muted: #94A3B8;
          --muted-2: #64748B;
          --green: #22C55E;
          --green-bg: rgba(34, 197, 94, 0.14);
          --orange: #F59E0B;
          --orange-bg: rgba(245, 158, 11, 0.14);
          --teal-bg: rgba(6, 182, 212, 0.14);
          --rose: #FB7185;
          --rose-bg: rgba(251, 113, 133, 0.14);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 28px;
          box-sizing: border-box;
          color: var(--ink);
        }
        .bl-root * { box-sizing: border-box; }

        .bl-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .bl-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; color: var(--ink); letter-spacing: -0.01em; }
        .bl-subtitle { font-size: 14px; color: var(--muted-2); margin: 0; }

        .bl-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bl-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid var(--line);
          background: var(--card);
          color: var(--ink);
          white-space: nowrap;
        }
        .bl-btn:hover { background: #253248; }
        .bl-btn-primary {
          background: var(--cyan);
          border-color: var(--cyan);
          color: #0F172A;
          font-weight: 700;
          box-shadow: 0 8px 20px -8px rgba(6, 182, 212, 0.5);
        }
        .bl-btn-primary:hover { background: var(--cyan-dark); border-color: var(--cyan-dark); }

        .bl-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .bl-stat-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .bl-stat-card:hover {
          transform: translateY(-3px);
          border-color: #475569;
          box-shadow: 0 14px 28px -12px rgba(0, 0, 0, 0.5);
        }

        .bl-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tone-teal .bl-stat-icon { background: var(--teal-bg); color: var(--cyan); }
        .tone-green .bl-stat-icon { background: var(--green-bg); color: var(--green); }
        .tone-orange .bl-stat-icon { background: var(--orange-bg); color: var(--orange); }
        .tone-rose .bl-stat-icon { background: var(--rose-bg); color: var(--rose); }

        .bl-stat-value { font-size: 26px; font-weight: 800; margin: 0; line-height: 1.15; letter-spacing: -0.01em; color: var(--ink); }
        .bl-stat-label { font-size: 13px; color: var(--muted); margin: 2px 0 0; font-weight: 500; }

        .bl-filter-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .bl-filter-input {
          flex: 1 1 200px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--card-soft);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 16px;
          color: var(--muted);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .bl-filter-input:focus-within {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.14);
        }
        .bl-filter-input input,
        .bl-filter-input select {
          border: none;
          outline: none;
          font-size: 14px;
          width: 100%;
          background: transparent;
          color: var(--ink);
          appearance: none;
          cursor: pointer;
        }
        .bl-filter-input input::placeholder { color: var(--muted-2); }
        .bl-filter-input input { cursor: text; }
        .bl-filter-input svg { flex-shrink: 0; color: var(--muted-2); }
        .bl-filter-input .chev { margin-left: auto; }

        .bl-clear-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--card-soft);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          cursor: pointer;
          white-space: nowrap;
        }
        .bl-clear-btn:hover { background: #182338; border-color: #475569; }
        .bl-clear-btn svg { color: var(--muted); }

        .bl-table-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          overflow: hidden;
        }
        .bl-table-header {
          padding: 18px 22px;
          font-size: 16px;
          font-weight: 700;
          border-bottom: 1px solid var(--line);
          color: var(--ink);
        }

        .bl-table-scroll { overflow-x: auto; }
        table.bl-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        table.bl-table th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: var(--muted-2);
          font-weight: 600;
          padding: 12px 22px;
          background: var(--card-soft);
          border-bottom: 1px solid var(--line);
        }
        table.bl-table td {
          padding: 14px 22px;
          border-bottom: 1px solid var(--line);
          font-size: 14px;
          vertical-align: middle;
          color: var(--ink);
        }
        table.bl-table tr:last-child td { border-bottom: none; }
        table.bl-table tr:hover td { background: #202c42; }

        .bl-branch-cell { display: flex; align-items: center; gap: 12px; }
        .bl-branch-thumb {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
          background: #334155;
        }
        .bl-branch-thumb-fallback {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          background: var(--teal-bg);
          color: var(--cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
        }
        .bl-branch-name { font-weight: 600; color: var(--ink); }

        .bl-addr { color: var(--muted); max-width: 260px; }

        .bl-phone { display: flex; align-items: center; gap: 8px; color: var(--ink); white-space: nowrap; }
        .bl-phone svg { color: var(--muted-2); }

        .bl-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .bl-status-active { background: var(--green-bg); color: var(--green); }
        .bl-status-inactive { background: var(--orange-bg); color: var(--orange); }
        .bl-status-deleted { background: var(--rose-bg); color: var(--rose); }
        .bl-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        .bl-manager { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
        .bl-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--teal-bg);
          color: var(--cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bl-avatar svg { width: 15px; height: 15px; }
        .bl-manager-name { font-weight: 500; font-size: 14px; color: var(--ink); }
        .bl-manager-role { font-size: 12px; color: var(--muted-2); }
        .bl-no-manager { color: var(--muted-2); font-size: 13px; }

        .bl-date { color: var(--muted); white-space: nowrap; }

        .bl-dots-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--muted);
          padding: 4px;
          border-radius: 6px;
        }
        .bl-dots-btn:hover { background: var(--card-soft); color: var(--ink); }

        .bl-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px 22px;
        }
        .bl-page-size { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
        .bl-page-size select {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 14px;
          background: var(--card-soft);
          color: var(--ink);
        }
        .bl-pagination { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--muted); }
        .bl-page-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--card-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--muted);
        }
        .bl-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .bl-page-btn.active {
          background: var(--cyan);
          border-color: var(--cyan);
          color: #0F172A;
        }
        .bl-page-btn:hover:not(.active):not(:disabled) { background: #253248; color: var(--ink); }

        .bl-empty, .bl-loading, .bl-error {
          padding: 40px 22px;
          text-align: center;
          color: var(--muted);
          font-size: 14px;
        }
        .bl-error { color: var(--rose); }
        .bl-retry-btn {
          margin-top: 10px;
          display: inline-flex;
          border: 1px solid var(--line);
          background: var(--card-soft);
          color: var(--ink);
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          font-size: 13px;
        }

        @media (max-width: 1024px) {
          .bl-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .bl-root { padding: 16px; }
          .bl-stats { grid-template-columns: 1fr; }
          .bl-header { flex-direction: column; align-items: stretch; }
          .bl-actions { width: 100%; }
          .bl-filter-input { flex-basis: 100%; }
          .bl-clear-btn { flex-basis: 100%; justify-content: center; }
          .bl-title { font-size: 22px; }
          .bl-footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

            <div className="bl-header">
                <div>
                    <h1 className="bl-title">Danh sách chi nhánh</h1>
                    <p className="bl-subtitle">Quản lý thông tin tất cả chi nhánh trong hệ thống.</p>
                </div>
                <div className="bl-actions">
                    <button className="bl-btn bl-btn-primary">
                        <Icon name="plus" />
                        Thêm chi nhánh
                    </button>
                </div>
            </div>

            <div className="bl-stats">
                {stats.map((s) => (
                    <div className={`bl-stat-card tone-${s.tone}`} key={s.label}>
                        <div className="bl-stat-icon">
                            <Icon name={s.icon} />
                        </div>
                        <div>
                            <p className="bl-stat-value">{s.value}</p>
                            <p className="bl-stat-label">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bl-filter-card">
                <div className="bl-filter-input">
                    <Icon name="search" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                    />
                </div>
                <div className="bl-filter-input">
                    <Icon name="pin" />
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Tất cả</option>
                        <option value="Active">Đang hoạt động</option>
                        <option value="Inactive">Tạm ngừng</option>
                        <option value="Deleted">Đã xóa</option>
                    </select>
                    <span className="chev"><Icon name="chevronDown" /></span>
                </div>
                <button className="bl-clear-btn" onClick={handleClearFilters}>
                    <Icon name="refresh" />
                    Xóa lọc
                </button>
            </div>

            <div className="bl-table-card">
                <div className="bl-table-header">Danh sách chi nhánh</div>

                {loading && <div className="bl-loading">Đang tải dữ liệu...</div>}

                {!loading && error && (
                    <div className="bl-error">
                        {error}
                        <br />
                        <button className="bl-retry-btn" onClick={fetchBranches}>Thử lại</button>
                    </div>
                )}

                {!loading && !error && branches.length === 0 && (
                    <div className="bl-empty">Không tìm thấy chi nhánh nào.</div>
                )}

                {!loading && !error && branches.length > 0 && (
                    <div className="bl-table-scroll">
                        <table className="bl-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Chi nhánh</th>
                                    <th>Địa chỉ</th>
                                    <th>Số điện thoại</th>
                                    <th>Trạng thái</th>
                                    <th>Quản lý</th>
                                    <th>Ngày tạo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map((b, idx) => {
                                    const manager = (b.managers || [])[0];
                                    const rawImg = (b.images || [])[0];
                                    const imgUrl =
                                        typeof rawImg === "string"
                                            ? rawImg
                                            : rawImg?.url ??
                                            rawImg?.imageUrl ??
                                            rawImg?.imagePath ??
                                            rawImg?.path ??
                                            null;
                                    const statusClass =
                                        b.status === "Active"
                                            ? "bl-status-active"
                                            : b.status === "Inactive"
                                                ? "bl-status-inactive"
                                                : "bl-status-deleted";
                                    const statusLabel =
                                        b.status === "Active"
                                            ? "Đang hoạt động"
                                            : b.status === "Inactive"
                                                ? "Tạm ngừng"
                                                : b.status;
                                    return (
                                        <tr key={b.branchId}>
                                            <td>{from + idx}</td>
                                            <td>
                                                <div className="bl-branch-cell">
                                                    {imgUrl ? (
                                                        <img className="bl-branch-thumb" src={imgUrl} alt={b.branchName} />
                                                    ) : (
                                                        <div className="bl-branch-thumb-fallback">
                                                            {initials(b.branchName)}
                                                        </div>
                                                    )}
                                                    <span className="bl-branch-name">{b.branchName}</span>
                                                </div>
                                            </td>
                                            <td className="bl-addr">{b.address}</td>
                                            <td>
                                                <span className="bl-phone">
                                                    <Icon name="phone" />
                                                    {b.phone}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`bl-status ${statusClass}`}>
                                                    <span className="bl-status-dot" />
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                {manager ? (
                                                    <div className="bl-manager">
                                                        <span className="bl-avatar">
                                                            <Icon name="users" />
                                                        </span>
                                                        <div>
                                                            <div className="bl-manager-name">{manager.fullName}</div>
                                                            <div className="bl-manager-role">{manager.phone}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="bl-no-manager">Chưa có quản lý</span>
                                                )}
                                            </td>
                                            <td className="bl-date">{formatDate(b.createdAt)}</td>
                                            <td>
                                                <button className="bl-dots-btn">
                                                    <Icon name="dots" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="bl-footer">
                    <div className="bl-page-size">
                        Hiển thị
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        kết quả
                    </div>
                    <div className="bl-pagination">
                        <span>
                            {from} - {to} của {totalItems}
                        </span>
                        <button
                            className="bl-page-btn"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <Icon name="chevronLeft" />
                        </button>
                        <button className="bl-page-btn active">{page}</button>
                        <button
                            className="bl-page-btn"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            <Icon name="chevronRight" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}