import { useCallback, useEffect, useMemo, useState } from "react";
import managerApi from "../../../api/managerApi";

const STATUS_LABEL = {
    PendingApproval: "Chờ duyệt",
    Approved: "Đã duyệt",
    Completed: "Hoàn tất",
    Cancelled: "Đã hủy",
};

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "PendingApproval", label: "Chờ duyệt" },
    { value: "Approved", label: "Đã duyệt" },
    { value: "Completed", label: "Hoàn tất" },
    { value: "Cancelled", label: "Đã hủy" },
];

// Các bước chuyển hợp lệ tiếp theo cho từng trạng thái hiện tại
// (khớp với allowedTransitions phía BE - UpdateStatusAsync)
const NEXT_STATUS = {
    PendingApproval: ["Approved", "Cancelled"],
    Approved: ["Completed", "Cancelled"],
    Completed: [],
    Cancelled: [],
};

const PAGE_SIZE = 10;

// Bóc tách mảng dữ liệu khỏi response, xử lý được nhiều dạng trả về:
// - res là mảng trực tiếp: [ {...}, {...} ]
// - res.data là mảng: { data: [ {...}, {...} ] }
// - res.data.data là mảng (bọc thêm 1 lớp ApiResponse): { data: { data: [...] } }
function extractList(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.items)) return res.items;
    return [];
}

// Bóc tách object chi tiết khỏi response (tương tự extractList nhưng cho 1 object)
function extractItem(res) {
    if (res && typeof res === "object" && !Array.isArray(res)) {
        if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
            if (res.data.data && typeof res.data.data === "object") return res.data.data;
            return res.data;
        }
        return res;
    }
    return null;
}

function StatusBadge({ status }) {
    const cls = `status-badge status-${status?.toLowerCase() || "unknown"}`;
    return <span className={cls}>{STATUS_LABEL[status] || status}</span>;
}


// CSS được nhúng thẳng trong component (chỉ 1 file, không cần import .css riêng)
const INCIDENT_PAGE_CSS = `
/* =========================================================
   IncidentPage.css
   Trang danh sách sự cố + chi tiết (gộp chung 1 trang, không modal)
   Tông màu tối, đồng bộ với giao diện Manager Portal
   ========================================================= */

:root {
    --incident-bg: #0b1220;
    --incident-card-bg: #141c2e;
    --incident-card-bg-alt: #101828;
    --incident-border: #232d42;
    --incident-text: #e7ebf3;
    --incident-muted: #8a94a6;
    --incident-primary: #38bdf8;
    --incident-primary-dark: #0ea5e9;
    --incident-primary-bg: rgba(56, 189, 248, 0.12);
    --incident-danger: #f87171;
    --incident-danger-bg: rgba(248, 113, 113, 0.14);
    --incident-success: #34d399;
    --incident-success-bg: rgba(52, 211, 153, 0.14);
    --incident-warning: #fbbf24;
    --incident-warning-bg: rgba(251, 191, 36, 0.14);
    --incident-radius: 12px;
    --incident-shadow: 0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25);
}

.incident-page {
    padding: 24px;
    background: var(--incident-bg);
    min-height: 100vh;
    color: var(--incident-text);
    box-sizing: border-box;
}

.incident-page * {
    box-sizing: border-box;
}

/* ---------- Header ---------- */
.incident-header h1 {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 700;
    color: var(--incident-text);
}

.incident-subtitle {
    margin: 0 0 20px;
    color: var(--incident-muted);
    font-size: 14px;
}

/* ---------- Thống kê ---------- */
.incident-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;
}

.stat-card {
    background: var(--incident-card-bg);
    border: 1px solid var(--incident-border);
    border-radius: var(--incident-radius);
    box-shadow: var(--incident-shadow);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.stat-icon-total { background: rgba(129, 140, 248, 0.14); color: #818cf8; }
.stat-icon-pending { background: var(--incident-warning-bg); color: var(--incident-warning); }
.stat-icon-approved { background: var(--incident-primary-bg); color: var(--incident-primary); }
.stat-icon-done { background: var(--incident-success-bg); color: var(--incident-success); }

.stat-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--incident-text);
}

.stat-label {
    font-size: 12.5px;
    color: var(--incident-muted);
}

/* ---------- Bộ lọc ---------- */
.incident-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 18px;
}

.filter-input {
    flex: 1 1 260px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--incident-card-bg);
    border: 1px solid var(--incident-border);
    border-radius: 10px;
    padding: 0 12px;
}

.filter-input input {
    border: none;
    outline: none;
    padding: 10px 0;
    width: 100%;
    font-size: 14px;
    background: transparent;
    color: var(--incident-text);
}

.filter-input input::placeholder {
    color: var(--incident-muted);
}

.filter-icon {
    opacity: 0.6;
}

.incident-filters select {
    border: 1px solid var(--incident-border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    background: var(--incident-card-bg);
    color: var(--incident-text);
    min-width: 170px;
}

.btn-reset {
    border: 1px solid var(--incident-border);
    background: var(--incident-card-bg);
    color: var(--incident-text);
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease;
}

.btn-reset:hover {
    background: #1b2438;
}

/* ---------- Khu vực chính: 2 cột list + detail ---------- */
.incident-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
    gap: 18px;
    align-items: start;
}

.incident-list-col {
    min-width: 0;
}

.incident-detail-col {
    position: sticky;
    top: 24px;
}

/* ---------- Bảng ---------- */
.incident-table-wrapper {
    background: var(--incident-card-bg);
    border: 1px solid var(--incident-border);
    border-radius: var(--incident-radius);
    box-shadow: var(--incident-shadow);
    overflow: hidden;
}

.incident-error {
    padding: 14px 16px;
    background: var(--incident-danger-bg);
    color: var(--incident-danger);
    font-size: 14px;
}

.incident-empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--incident-muted);
    font-size: 14px;
}

.incident-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.incident-table th {
    text-align: left;
    padding: 12px 14px;
    background: var(--incident-card-bg-alt);
    border-bottom: 1px solid var(--incident-border);
    color: var(--incident-muted);
    font-weight: 600;
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.incident-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--incident-border);
    vertical-align: middle;
    color: var(--incident-text);
}

.incident-table tbody tr {
    cursor: pointer;
    transition: background 0.12s ease;
}

.incident-table tbody tr:hover {
    background: #182238;
}

.incident-table tbody tr.row-selected {
    background: rgba(56, 189, 248, 0.1);
}

.incident-table tbody tr:last-child td {
    border-bottom: none;
}

.incident-title-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.incident-thumb {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: #232d42;
}

.incident-title-text {
    font-weight: 600;
    color: var(--incident-text);
}

.incident-muted {
    color: var(--incident-muted);
    font-size: 12px;
}

.btn-view {
    border: 1px solid var(--incident-border);
    background: transparent;
    color: var(--incident-text);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12.5px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-view:hover {
    background: var(--incident-primary);
    border-color: var(--incident-primary);
    color: #06202b;
}

.btn-view-full {
    width: 100%;
    margin-top: 10px;
    padding: 9px 10px;
}

/* ---------- Cards mobile (danh sách) ---------- */
.incident-cards {
    display: none;
}

.incident-card {
    background: var(--incident-card-bg);
    border: 1px solid var(--incident-border);
    border-radius: 10px;
    padding: 14px;
    margin: 10px;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
}

.incident-card.card-selected {
    border-color: var(--incident-primary);
    background: rgba(56, 189, 248, 0.08);
}

.incident-card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.incident-card-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 4px;
    color: var(--incident-text);
}

.incident-card-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 0;
    color: var(--incident-muted);
}

.incident-card-row span:last-child {
    color: var(--incident-text);
    text-align: right;
}

/* ---------- Phân trang ---------- */
.incident-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 16px;
}

.incident-pagination button {
    border: 1px solid var(--incident-border);
    background: var(--incident-card-bg);
    color: var(--incident-text);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13.5px;
    cursor: pointer;
}

.incident-pagination button:not(:disabled):hover {
    background: #1b2438;
}

.incident-pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.incident-pagination span {
    font-size: 13.5px;
    color: var(--incident-muted);
}

/* ---------- Badge trạng thái (dùng chung) ---------- */
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.status-pendingapproval {
    background: var(--incident-warning-bg);
    color: var(--incident-warning);
}

.status-approved {
    background: var(--incident-primary-bg);
    color: var(--incident-primary);
}

.status-completed {
    background: var(--incident-success-bg);
    color: var(--incident-success);
}

.status-cancelled {
    background: var(--incident-danger-bg);
    color: var(--incident-danger);
}

/* =========================================================
   Panel chi tiết (thay cho modal cũ — nằm cùng trang)
   ========================================================= */
.detail-panel {
    background: var(--incident-card-bg);
    border: 1px solid var(--incident-border);
    border-radius: var(--incident-radius);
    box-shadow: var(--incident-shadow);
    padding: 18px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
}

.detail-back-btn {
    display: none;
    border: none;
    background: transparent;
    color: var(--incident-primary);
    font-size: 14px;
    font-weight: 600;
    padding: 0 0 14px;
    cursor: pointer;
}

.detail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--incident-muted);
    padding: 60px 20px;
    font-size: 14px;
    gap: 10px;
}

.detail-placeholder-icon {
    font-size: 34px;
    opacity: 0.5;
}

.detail-error {
    color: var(--incident-danger);
}

.detail-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
}

.detail-title-row h3 {
    margin: 0;
    font-size: 18px;
    line-height: 1.35;
    color: var(--incident-text);
}

.detail-description {
    color: var(--incident-muted);
    font-size: 14px;
    line-height: 1.55;
    margin: 0 0 18px;
    white-space: pre-wrap;
}

.detail-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 18px;
}

.detail-info-grid > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 13.5px;
    color: var(--incident-text);
}

.detail-info-label {
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--incident-muted);
    font-weight: 600;
}

.detail-reject-reason {
    background: var(--incident-danger-bg);
    color: var(--incident-danger);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 13.5px;
    margin-bottom: 18px;
}

.detail-media {
    margin-bottom: 18px;
}

.detail-media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
    margin-top: 8px;
}

.detail-media-item {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
    background: #232d42;
    border: 1px solid var(--incident-border);
}

.detail-actions {
    border-top: 1px solid var(--incident-border);
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.detail-actions-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.detail-actions-row select {
    flex: 1 1 180px;
    border: 1px solid var(--incident-border);
    border-radius: 8px;
    padding: 9px 10px;
    font-size: 13.5px;
    background: var(--incident-card-bg-alt);
    color: var(--incident-text);
}

.btn-primary {
    background: var(--incident-primary);
    color: #06202b;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
    background: var(--incident-primary-dark);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-approve {
    background: var(--incident-success-bg);
    color: var(--incident-success);
    border: 1px solid var(--incident-success);
    border-radius: 8px;
    padding: 9px 14px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
}

.btn-approve:hover:not(:disabled) {
    background: rgba(52, 211, 153, 0.22);
}

.btn-approve:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.detail-reason-input {
    width: 100%;
    min-height: 70px;
    border: 1px solid var(--incident-border);
    border-radius: 8px;
    padding: 10px;
    font-size: 13.5px;
    font-family: inherit;
    resize: vertical;
    background: var(--incident-card-bg-alt);
    color: var(--incident-text);
}

.detail-reason-input::placeholder {
    color: var(--incident-muted);
}

.detail-submit-error {
    background: var(--incident-danger-bg);
    color: var(--incident-danger);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13px;
}

.detail-final-note {
    border-top: 1px solid var(--incident-border);
    padding-top: 16px;
    color: var(--incident-muted);
    font-size: 13.5px;
    text-align: center;
}

/* =========================================================
   Responsive
   ========================================================= */

/* Tablet: giảm cột thống kê, thu hẹp panel chi tiết */
@media (max-width: 1100px) {
    .incident-stats {
        grid-template-columns: repeat(2, 1fr);
    }

    .incident-workspace {
        grid-template-columns: 1fr;
    }

    .incident-detail-col {
        position: static;
    }

    .detail-panel {
        max-height: none;
    }
}

/* Mobile: bảng -> card, panel chi tiết trở thành overlay toàn màn hình */
@media (max-width: 720px) {
    .incident-page {
        padding: 14px;
    }

    .incident-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .stat-card {
        padding: 12px;
    }

    .incident-filters {
        flex-direction: column;
    }

    .incident-filters select,
    .btn-reset {
        width: 100%;
    }

    .incident-table {
        display: none;
    }

    .incident-cards {
        display: block;
    }

    .incident-card {
        margin: 10px 12px;
    }

    .detail-info-grid {
        grid-template-columns: 1fr;
    }

    /* Ẩn cột chi tiết mặc định trên mobile, chỉ hiện khi người dùng chọn 1 sự cố */
    .incident-detail-col {
        display: none;
    }

    .detail-back-btn {
        display: inline-block;
    }

    .incident-workspace.show-detail-mobile .incident-list-col {
        display: none;
    }

    .incident-workspace.show-detail-mobile .incident-detail-col {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 50;
        background: var(--incident-bg);
        padding: 14px;
        overflow-y: auto;
    }

    .incident-workspace.show-detail-mobile .detail-panel {
        max-height: none;
        border-radius: 0;
        min-height: 100%;
    }
}

`;

function IncidentPageStyle() {
    return <style>{INCIDENT_PAGE_CSS}</style>;
}

export default function IncidentPage() {
    // ----- danh sách -----
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);

    // ----- chi tiết (hiển thị cùng trang, không dùng modal) -----
    const [selectedId, setSelectedId] = useState(null);
    const [incident, setIncident] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [nextStatus, setNextStatus] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // dùng để bật panel chi tiết dạng overlay toàn màn hình trên mobile
    const [showDetailMobile, setShowDetailMobile] = useState(false);

    const fetchIncidents = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await managerApi.getListIncidents({
                Keyword: keyword,
                Status: status,
                Page: page,
                PageSize: PAGE_SIZE,
            });
            setIncidents(extractList(res));
        } catch (err) {
            setError(
                err?.response?.data?.message || "Không tải được danh sách sự cố."
            );
        } finally {
            setLoading(false);
        }
    }, [keyword, status, page]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const fetchDetail = useCallback(async (id) => {
        if (!id) return;
        setDetailLoading(true);
        setDetailError("");
        try {
            const res = await managerApi.getIncidentDetail(id);
            setIncident(extractItem(res));
            setNextStatus("");
            setRejectReason("");
            setSubmitError("");
        } catch (err) {
            setDetailError(
                err?.response?.data?.message || "Không tải được chi tiết sự cố."
            );
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedId) fetchDetail(selectedId);
    }, [selectedId, fetchDetail]);

    // Thống kê nhanh dựa trên dữ liệu đang tải (trang hiện tại),
    // vì API danh sách chưa trả về tổng số theo trạng thái.
    const stats = useMemo(() => {
        const base = { total: incidents.length, pending: 0, approved: 0, done: 0 };
        incidents.forEach((i) => {
            if (i.status === "PendingApproval") base.pending += 1;
            else if (i.status === "Approved") base.approved += 1;
            else if (i.status === "Completed" || i.status === "Cancelled") base.done += 1;
        });
        return base;
    }, [incidents]);

    const handleResetFilters = () => {
        setKeyword("");
        setStatus("");
        setPage(1);
    };

    const handleSelectIncident = (id) => {
        setSelectedId(id);
        setShowDetailMobile(true);
    };

    const handleBackToList = () => {
        setShowDetailMobile(false);
    };

    const handleUpdateStatus = async (statusToApply) => {
        if (!statusToApply || !selectedId) return;

        if (statusToApply === "Cancelled" && !rejectReason.trim()) {
            setSubmitError("Vui lòng nhập lý do hủy.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        try {
            await managerApi.updateIncidentStatus(selectedId, {
                status: statusToApply,
                rejectReason: statusToApply === "Cancelled" ? rejectReason : null,
            });
            await fetchDetail(selectedId);
            await fetchIncidents();
        } catch (err) {
            setSubmitError(
                err?.response?.data?.message || "Cập nhật trạng thái thất bại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const availableNext = incident ? NEXT_STATUS[incident.status] || [] : [];

    return (
        <div className="incident-page">
            <IncidentPageStyle />
            <div className="incident-header">
                <h1>Danh sách sự cố</h1>
                <p className="incident-subtitle">
                    {incidents.length} sự cố được hiển thị (trang {page})
                </p>
            </div>

            <div className="incident-stats">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-total">⚠</div>
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Tổng sự cố (trang này)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-pending">⏳</div>
                    <div>
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">Chờ duyệt</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-approved">✓</div>
                    <div>
                        <div className="stat-value">{stats.approved}</div>
                        <div className="stat-label">Đã duyệt</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon stat-icon-done">◆</div>
                    <div>
                        <div className="stat-value">{stats.done}</div>
                        <div className="stat-label">Đã kết thúc</div>
                    </div>
                </div>
            </div>

            <div className="incident-filters">
                <div className="filter-input">
                    <span className="filter-icon">🔎</span>
                    <input
                        type="text"
                        placeholder="Tìm theo tiêu đề, mô tả..."
                        value={keyword}
                        onChange={(e) => {
                            setPage(1);
                            setKeyword(e.target.value);
                        }}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => {
                        setPage(1);
                        setStatus(e.target.value);
                    }}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <button className="btn-reset" onClick={handleResetFilters}>
                    ↻ Xóa lọc
                </button>
            </div>

            {/* ================= Khu vực chính: danh sách + chi tiết trên cùng 1 trang ================= */}
            <div
                className={`incident-workspace ${showDetailMobile ? "show-detail-mobile" : ""
                    }`}
            >
                {/* ----- Cột danh sách ----- */}
                <div className="incident-list-col">
                    <div className="incident-table-wrapper">
                        {error && <div className="incident-error">{error}</div>}

                        {loading ? (
                            <div className="incident-empty">Đang tải dữ liệu...</div>
                        ) : incidents.length === 0 ? (
                            <div className="incident-empty">
                                Không có sự cố nào phù hợp.
                            </div>
                        ) : (
                            <>
                                {/* Bảng cho màn hình rộng */}
                                <table className="incident-table">
                                    <thead>
                                        <tr>
                                            <th>Sự cố</th>
                                            <th>Chi nhánh</th>
                                            <th>Người báo cáo</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày tạo</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incidents.map((item) => (
                                            <tr
                                                key={item.incidentId}
                                                className={
                                                    item.incidentId === selectedId
                                                        ? "row-selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    handleSelectIncident(item.incidentId)
                                                }
                                            >
                                                <td>
                                                    <div className="incident-title-cell">
                                                        {item.thumbnail && (
                                                            <img
                                                                src={item.thumbnail}
                                                                alt=""
                                                                className="incident-thumb"
                                                            />
                                                        )}
                                                        <span className="incident-title-text">
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{item.branchName}</td>
                                                <td>
                                                    <div>{item.reporterName}</div>
                                                    <div className="incident-muted">
                                                        {item.reporterPhone}
                                                    </div>
                                                </td>
                                                <td>
                                                    <StatusBadge status={item.status} />
                                                </td>
                                                <td>
                                                    {item.createdAt
                                                        ? new Date(
                                                            item.createdAt
                                                        ).toLocaleDateString("vi-VN")
                                                        : "—"}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-view"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectIncident(
                                                                item.incidentId
                                                            );
                                                        }}
                                                    >
                                                        👁 Xem
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Card cho màn hình nhỏ (mobile) */}
                                <div className="incident-cards">
                                    {incidents.map((item) => (
                                        <div
                                            className={`incident-card ${item.incidentId === selectedId
                                                    ? "card-selected"
                                                    : ""
                                                }`}
                                            key={item.incidentId}
                                            onClick={() =>
                                                handleSelectIncident(item.incidentId)
                                            }
                                        >
                                            <div className="incident-card-head">
                                                {item.thumbnail && (
                                                    <img
                                                        src={item.thumbnail}
                                                        alt=""
                                                        className="incident-thumb"
                                                    />
                                                )}
                                                <div>
                                                    <div className="incident-card-title">
                                                        {item.title}
                                                    </div>
                                                    <StatusBadge status={item.status} />
                                                </div>
                                            </div>
                                            <div className="incident-card-row">
                                                <span>Chi nhánh</span>
                                                <span>{item.branchName}</span>
                                            </div>
                                            <div className="incident-card-row">
                                                <span>Người báo cáo</span>
                                                <span>{item.reporterName}</span>
                                            </div>
                                            <button
                                                className="btn-view btn-view-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectIncident(item.incidentId);
                                                }}
                                            >
                                                👁 Xem chi tiết
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="incident-pagination">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ← Trước
                        </button>
                        <span>Trang {page}</span>
                        <button
                            disabled={incidents.length < PAGE_SIZE}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Sau →
                        </button>
                    </div>
                </div>

                {/* ----- Cột chi tiết (thay thế modal, nằm chung trang) ----- */}
                <div className="incident-detail-col">
                    <div className="detail-panel">
                        <button
                            type="button"
                            className="detail-back-btn"
                            onClick={handleBackToList}
                        >
                            ← Quay lại danh sách
                        </button>

                        {!selectedId ? (
                            <div className="detail-placeholder">
                                <div className="detail-placeholder-icon">📋</div>
                                <p>Chọn một sự cố ở danh sách để xem chi tiết.</p>
                            </div>
                        ) : detailLoading ? (
                            <div className="detail-placeholder">Đang tải...</div>
                        ) : detailError ? (
                            <div className="detail-placeholder detail-error">
                                {detailError}
                            </div>
                        ) : incident ? (
                            <div className="detail-content">
                                <div className="detail-title-row">
                                    <h3>{incident.title}</h3>
                                    <span
                                        className={`status-badge status-${incident.status?.toLowerCase()}`}
                                    >
                                        {STATUS_LABEL[incident.status] || incident.status}
                                    </span>
                                </div>

                                <p className="detail-description">
                                    {incident.description}
                                </p>

                                <div className="detail-info-grid">
                                    <div>
                                        <span className="detail-info-label">
                                            Chi nhánh
                                        </span>
                                        <span>{incident.branchName}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">
                                            Thiết bị
                                        </span>
                                        <span>{incident.equipmentName || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">
                                            Người báo cáo
                                        </span>
                                        <span>
                                            {incident.reporterName} (
                                            {incident.reporterRole === "Member"
                                                ? "Hội viên"
                                                : "Nhân viên"}
                                            )
                                        </span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">
                                            Số điện thoại
                                        </span>
                                        <span>{incident.reporterPhone || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">
                                            Ngày tạo
                                        </span>
                                        <span>
                                            {incident.createdAt
                                                ? new Date(
                                                    incident.createdAt
                                                ).toLocaleString("vi-VN")
                                                : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">
                                            Cập nhật lúc
                                        </span>
                                        <span>
                                            {incident.updatedAt
                                                ? new Date(
                                                    incident.updatedAt
                                                ).toLocaleString("vi-VN")
                                                : "—"}
                                        </span>
                                    </div>
                                </div>

                                {incident.status === "Cancelled" &&
                                    incident.rejectReason && (
                                        <div className="detail-reject-reason">
                                            <strong>Lý do hủy:</strong>{" "}
                                            {incident.rejectReason}
                                        </div>
                                    )}

                                {incident.medias && incident.medias.length > 0 && (
                                    <div className="detail-media">
                                        <span className="detail-info-label">
                                            Hình ảnh / Video
                                        </span>
                                        <div className="detail-media-grid">
                                            {incident.medias.map((m, idx) =>
                                                m.mediaType === "Video" ? (
                                                    <video
                                                        key={idx}
                                                        src={m.mediaUrl}
                                                        controls
                                                        className="detail-media-item"
                                                    />
                                                ) : (
                                                    <img
                                                        key={idx}
                                                        src={m.mediaUrl}
                                                        alt=""
                                                        className="detail-media-item"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {availableNext.length > 0 ? (
                                    <div className="detail-actions">
                                        <span className="detail-info-label">
                                            Cập nhật trạng thái
                                        </span>

                                        <div className="detail-actions-row">
                                            <select
                                                value={nextStatus}
                                                onChange={(e) => {
                                                    setNextStatus(e.target.value);
                                                    setSubmitError("");
                                                }}
                                            >
                                                <option value="">
                                                    -- Chọn trạng thái mới --
                                                </option>
                                                {availableNext.map((s) => (
                                                    <option key={s} value={s}>
                                                        {STATUS_LABEL[s]}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                className="btn-primary"
                                                disabled={!nextStatus || submitting}
                                                onClick={() =>
                                                    handleUpdateStatus(nextStatus)
                                                }
                                            >
                                                {submitting ? "Đang lưu..." : "Cập nhật"}
                                            </button>
                                        </div>

                                        {nextStatus === "Cancelled" && (
                                            <textarea
                                                className="detail-reason-input"
                                                placeholder="Nhập lý do hủy..."
                                                value={rejectReason}
                                                onChange={(e) =>
                                                    setRejectReason(e.target.value)
                                                }
                                            />
                                        )}

                                        {submitError && (
                                            <div className="detail-submit-error">
                                                {submitError}
                                            </div>
                                        )}

                                        {incident.status === "PendingApproval" && (
                                            <button
                                                className="btn-approve"
                                                disabled={submitting}
                                                onClick={() =>
                                                    handleUpdateStatus("Approved")
                                                }
                                            >
                                                ✓ Duyệt nhanh
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="detail-final-note">
                                        Báo cáo này đã kết thúc, không thể thay đổi
                                        trạng thái.
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}