import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Khớp với ReportRole trong IncidentFilterDto (BE) - chỉ có Staff / Member
const ROLE_OPTIONS = [
    { value: "", label: "Tất cả vai trò" },
    { value: "Staff", label: "Nhân viên" },
    { value: "Member", label: "Hội viên" },
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

// ============================================================
// CSS nhúng trực tiếp trong file (không tách riêng .css)
// Nền: #0B1120 | Khối: #1E293B | Viền: #334155
// Điểm nhấn: #06B6D4 (cyan) | Chữ chính: #F1F5F9 | Chữ phụ: #94A3B8 / #64748B
// ============================================================
const STYLES = `
.incident-page {
    background: #0B1120;
    color: #F1F5F9;
    min-height: 100%;
    padding: 28px 32px;
    font-family: inherit;
}

/* ---------- Header ---------- */
.incident-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 20px;
}

.incident-header h1 {
    color: #F1F5F9;
    font-size: 26px;
    font-weight: 700;
    margin: 0;
}

.incident-subtitle {
    color: #94A3B8;
    font-size: 14px;
    margin: 0;
}

/* ---------- Stat pills ---------- */
.incident-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 14px 18px;
    flex: 1 1 180px;
}

.stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    background: rgba(6, 182, 212, 0.12);
    color: #06B6D4;
}

.stat-icon-total { background: rgba(6, 182, 212, 0.12); color: #06B6D4; }
.stat-icon-pending { background: rgba(245, 158, 11, 0.14); color: #F59E0B; }
.stat-icon-approved { background: rgba(59, 130, 246, 0.14); color: #3B82F6; }
.stat-icon-done { background: rgba(16, 185, 129, 0.14); color: #10B981; }

.stat-value {
    color: #F1F5F9;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
}

.stat-label {
    color: #94A3B8;
    font-size: 12px;
    margin-top: 2px;
}

/* ---------- Filters row ---------- */
.incident-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 22px;
}

.filter-input {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px 14px;
    flex: 1 1 240px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus-within {
    border-color: #06B6D4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.18);
}

.filter-icon {
    color: #64748B;
    font-size: 14px;
}

.filter-input input {
    background: transparent;
    border: none;
    outline: none;
    color: #F1F5F9;
    font-size: 14px;
    width: 100%;
}

.filter-input input::placeholder {
    color: #64748B;
}

.btn-reset {
    background: #1E293B;
    border: 1px solid #334155;
    color: #94A3B8;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
}

.btn-reset:hover {
    border-color: #06B6D4;
    color: #06B6D4;
}

/* ---------- Custom select ---------- */
.custom-select {
    position: relative;
    min-width: 170px;
}

.custom-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    color: #F1F5F9;
    font-size: 14px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.custom-select.open .custom-select-trigger {
    border-color: #06B6D4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.18);
}

.custom-select-value.is-placeholder {
    color: #64748B;
}

.custom-select-arrow {
    color: #64748B;
    font-size: 12px;
    transition: transform 0.15s ease;
}

.custom-select.open .custom-select-arrow {
    transform: rotate(180deg);
    color: #06B6D4;
}

.custom-select-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 10px;
    overflow: hidden;
    z-index: 20;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}

.custom-select-option {
    padding: 10px 14px;
    font-size: 14px;
    color: #CBD5E1;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
}

.custom-select-option:hover {
    background: rgba(6, 182, 212, 0.10);
    color: #F1F5F9;
}

.custom-select-option.selected {
    background: rgba(6, 182, 212, 0.16);
    color: #06B6D4;
    font-weight: 600;
}

/* ---------- Status badges ---------- */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.status-badge::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.status-pendingapproval { background: rgba(245, 158, 11, 0.14); color: #F59E0B; }
.status-approved { background: rgba(59, 130, 246, 0.14); color: #3B82F6; }
.status-completed { background: rgba(6, 182, 212, 0.14); color: #06B6D4; }
.status-cancelled { background: rgba(239, 68, 68, 0.14); color: #EF4444; }
.status-unknown { background: rgba(148, 163, 184, 0.14); color: #94A3B8; }

/* ---------- Workspace layout ---------- */
.incident-workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

.incident-detail-col { display: none; }
.incident-workspace.show-detail .incident-list-col { display: none; }
.incident-workspace.show-detail .incident-detail-col { display: block; }

/* ---------- List ---------- */
.incident-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #FCA5A5;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 14px;
    font-size: 14px;
}

.incident-empty {
    text-align: center;
    color: #64748B;
    padding: 48px 0;
    font-size: 14px;
}

.incident-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 10px;
}

.incident-table thead th {
    text-align: left;
    color: #64748B;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0 16px 8px;
}

.incident-table tbody tr {
    background: #1E293B;
    border: 1px solid #334155;
    border-left: 3px solid #334155;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.1s ease;
}

.incident-table tbody tr:hover {
    border-color: #06B6D4;
    border-left-color: #06B6D4;
}

.incident-table tbody tr td {
    padding: 14px 16px;
    color: #CBD5E1;
    font-size: 14px;
}

.incident-table tbody tr td:first-child { border-radius: 12px 0 0 12px; }
.incident-table tbody tr td:last-child { border-radius: 0 12px 12px 0; }

.incident-title-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.incident-thumb {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
    background: #0B1120;
    border: 1px solid #334155;
}

.incident-title-text {
    color: #F1F5F9;
    font-weight: 600;
}

.incident-muted {
    color: #64748B;
    font-size: 12px;
    margin-top: 2px;
}

.btn-view {
    background: rgba(6, 182, 212, 0.10);
    border: 1px solid rgba(6, 182, 212, 0.4);
    color: #06B6D4;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.btn-view:hover {
    background: #06B6D4;
    color: #0B1120;
}

.incident-cards {
    display: none;
    flex-direction: column;
    gap: 14px;
}

.incident-card {
    background: #1E293B;
    border: 1px solid #334155;
    border-left: 3px solid #334155;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: border-color 0.15s ease;
}

.incident-card:hover {
    border-color: #06B6D4;
    border-left-color: #06B6D4;
}

.incident-card-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.incident-card-title {
    color: #F1F5F9;
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 6px;
}

.incident-card-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #94A3B8;
    padding: 6px 0;
    border-top: 1px solid #334155;
}

.btn-view-full {
    width: 100%;
    margin-top: 10px;
    text-align: center;
    padding: 10px;
}

@media (max-width: 860px) {
    .incident-table { display: none; }
    .incident-cards { display: flex; }
}

/* ---------- Pagination ---------- */
.incident-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 18px;
    color: #94A3B8;
    font-size: 14px;
}

.incident-pagination button {
    background: #1E293B;
    border: 1px solid #334155;
    color: #CBD5E1;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
}

.incident-pagination button:hover:not(:disabled) {
    border-color: #06B6D4;
    color: #06B6D4;
}

.incident-pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ---------- Detail panel ---------- */
.detail-panel {
    background: #1E293B;
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 24px;
}

.detail-back-btn {
    background: transparent;
    border: 1px solid #334155;
    color: #94A3B8;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    margin-bottom: 18px;
    transition: all 0.15s ease;
}

.detail-back-btn:hover {
    border-color: #06B6D4;
    color: #06B6D4;
}

.detail-placeholder {
    text-align: center;
    color: #64748B;
    padding: 60px 20px;
    font-size: 14px;
}

.detail-placeholder-icon {
    font-size: 32px;
    margin-bottom: 12px;
}

.detail-error { color: #FCA5A5; }

.detail-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
}

.detail-title-row h3 {
    color: #F1F5F9;
    font-size: 20px;
    margin: 0;
}

.detail-description {
    color: #CBD5E1;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 14px;
}

.detail-edit-btn { margin-bottom: 18px; }

.detail-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px 20px;
    background: #0B1120;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 18px 0;
}

.detail-info-grid > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.detail-info-label {
    color: #64748B;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.detail-info-grid > div > span:last-child {
    color: #F1F5F9;
    font-size: 14px;
}

.detail-reject-reason {
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #FCA5A5;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    margin-bottom: 16px;
}

.detail-media { margin-bottom: 20px; }

.detail-media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.detail-media-item {
    width: 100%;
    height: 110px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #334155;
}

/* ---------- Edit form ---------- */
.detail-edit-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 18px;
}

.detail-edit-label {
    color: #94A3B8;
    font-size: 12px;
    margin-bottom: 6px;
}

.detail-edit-input,
.detail-reason-input {
    width: 100%;
    background: #0B1120;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px 14px;
    color: #F1F5F9;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
}

.detail-reason-input {
    min-height: 90px;
    resize: vertical;
    font-family: inherit;
    margin-top: 10px;
}

.detail-edit-input:focus,
.detail-reason-input:focus {
    border-color: #06B6D4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.18);
}

.detail-edit-input::placeholder,
.detail-reason-input::placeholder {
    color: #64748B;
}

.detail-edit-actions {
    display: flex;
    gap: 10px;
}

.detail-submit-error {
    color: #FCA5A5;
    font-size: 13px;
    margin-top: 8px;
}

/* ---------- Status update actions ---------- */
.detail-actions {
    background: #0B1120;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.detail-actions-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.detail-actions-row .custom-select {
    flex: 1 1 220px;
}

.btn-primary {
    background: #06B6D4;
    border: 1px solid #06B6D4;
    color: #0B1120;
    font-weight: 700;
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    transition: filter 0.15s ease;
    white-space: nowrap;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-approve {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid #10B981;
    color: #10B981;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    align-self: flex-start;
}

.btn-approve:hover:not(:disabled) { background: #10B981; color: #0B1120; }
.btn-approve:disabled { opacity: 0.45; cursor: not-allowed; }

.detail-final-note {
    background: #0B1120;
    border: 1px solid #334155;
    color: #64748B;
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    text-align: center;
}
`;

function StatusBadge({ status }) {
    const cls = `status-badge status-${status?.toLowerCase() || "unknown"}`;
    return <span className={cls}>{STATUS_LABEL[status] || status}</span>;
}

// Dropdown tùy biến dùng chung, thay thế <select> mặc định của trình duyệt
function CustomSelect({ options, value, onChange, placeholder = "Chọn...", className = "" }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selected = options.find((o) => o.value === value);

    return (
        <div className={`custom-select ${open ? "open" : ""} ${className}`} ref={rootRef}>
            <div className="custom-select-trigger" onClick={() => setOpen((o) => !o)}>
                <span className={`custom-select-value ${!selected ? "is-placeholder" : ""}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <span className="custom-select-arrow">▾</span>
            </div>
            {open && (
                <div className="custom-select-menu">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`custom-select-option ${opt.value === value ? "selected" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function IncidentPage() {
    // ----- danh sách -----
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [branchId, setBranchId] = useState("");
    const [reportRole, setReportRole] = useState("");
    const [page, setPage] = useState(1);

    // ----- danh sách chi nhánh (đổ vào dropdown lọc) -----
    const [branches, setBranches] = useState([]);

    // ----- chi tiết (chuyển hẳn sang trang riêng, không dùng modal) -----
    const [selectedId, setSelectedId] = useState(null);
    const [incident, setIncident] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [nextStatus, setNextStatus] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // ----- sửa nội dung (chỉ cho phép khi trạng thái là Chờ duyệt) -----
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [savingInfo, setSavingInfo] = useState(false);
    const [saveInfoError, setSaveInfoError] = useState("");

    // true = đang ở màn hình chi tiết (ẩn hoàn toàn danh sách), false = đang ở danh sách
    const [showDetail, setShowDetail] = useState(false);

    const branchOptions = useMemo(
        () => [
            { value: "", label: "Tất cả chi nhánh" },
            ...branches.map((b) => ({
                value: String(b.branchId ?? b.id ?? ""),
                label: b.branchName ?? b.name ?? `Chi nhánh #${b.branchId ?? b.id}`,
            })),
        ],
        [branches]
    );

    useEffect(() => {
        managerApi
            .getBranches?.()
            .then((res) => setBranches(extractList(res)))
            .catch(() => setBranches([]));
    }, []);

    const fetchIncidents = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await managerApi.getListIncidents({
                Keyword: keyword,
                BranchId: branchId ? Number(branchId) : null,
                ReportRole: reportRole || null,
                Status: status,
                Page: page,
                PageSize: PAGE_SIZE,
            });
            setIncidents(extractList(res));
        } catch (err) {
            setError(err?.response?.data?.message || "Không tải được danh sách sự cố.");
        } finally {
            setLoading(false);
        }
    }, [keyword, status, branchId, reportRole, page]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const fetchDetail = useCallback(async (id) => {
        if (!id) return;
        setDetailLoading(true);
        setDetailError("");
        try {
            const res = await managerApi.getIncidentDetail(id);
            const data = extractItem(res);
            setIncident(data);
            setNextStatus("");
            setRejectReason("");
            setSubmitError("");
            setEditMode(false);
            setEditTitle(data?.title || "");
            setEditDescription(data?.description || "");
            setSaveInfoError("");
        } catch (err) {
            setDetailError(err?.response?.data?.message || "Không tải được chi tiết sự cố.");
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
        setBranchId("");
        setReportRole("");
        setPage(1);
    };

    // Bấm "Xem" -> chuyển hẳn sang trang chi tiết, ẩn danh sách
    const handleSelectIncident = (id) => {
        setSelectedId(id);
        setShowDetail(true);
    };

    // Bấm "Quay lại" -> về danh sách
    const handleBackToList = () => {
        setShowDetail(false);
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
            console.error("updateIncidentInfo error:", err?.response?.status, err?.response?.data, err);
            setSaveInfoError(err?.response?.data?.message || "Cập nhật nội dung thất bại.");
        } finally {
            setSubmitting(false);
        }
    };

    // Chỉ cho phép sửa Title/Description khi sự cố đang ở trạng thái Chờ duyệt
    const canEditInfo = incident?.status === "PendingApproval";

    const handleSaveInfo = async () => {
        if (!editTitle.trim() || !editDescription.trim()) {
            setSaveInfoError("Vui lòng nhập đầy đủ tiêu đề và mô tả.");
            return;
        }
        if (editTitle.trim().length > 200) {
            setSaveInfoError("Tiêu đề tối đa 200 ký tự.");
            return;
        }
        if (editDescription.trim().length > 2000) {
            setSaveInfoError("Mô tả tối đa 2000 ký tự.");
            return;
        }

        setSavingInfo(true);
        setSaveInfoError("");
        try {
            // Gọi PUT /api/incidents/{id} (khớp UpdateIncidentDto phía BE)
            await managerApi.updateIncidentInfo(selectedId, {
                title: editTitle.trim(),
                description: editDescription.trim(),
            });
            setEditMode(false);
            await fetchDetail(selectedId);
            await fetchIncidents();
        } catch (err) {
            console.error("SAVE INFO ERROR:", err);
            setSaveInfoError(err?.response?.data?.message || "Cập nhật nội dung thất bại.");
        } finally {
            setSavingInfo(false);
        }
    };

    const handleCancelEditInfo = () => {
        setEditMode(false);
        setEditTitle(incident?.title || "");
        setEditDescription(incident?.description || "");
        setSaveInfoError("");
    };

    const availableNext = incident ? NEXT_STATUS[incident.status] || [] : [];

    return (
        <div className="incident-page">
            <style>{STYLES}</style>

            {/* Ẩn header/thống kê/bộ lọc khi đang xem chi tiết để tập trung vào nội dung */}
            {!showDetail && (
                <>
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

                        <CustomSelect
                            className="custom-select-status-filter"
                            options={STATUS_OPTIONS}
                            value={status}
                            onChange={(v) => {
                                setPage(1);
                                setStatus(v);
                            }}
                        />

                        <CustomSelect
                            className="custom-select-branch-filter"
                            options={branchOptions}
                            value={branchId}
                            onChange={(v) => {
                                setPage(1);
                                setBranchId(v);
                            }}
                        />

                        <CustomSelect
                            className="custom-select-role-filter"
                            options={ROLE_OPTIONS}
                            value={reportRole}
                            onChange={(v) => {
                                setPage(1);
                                setReportRole(v);
                            }}
                        />

                        <button className="btn-reset" onClick={handleResetFilters}>
                            ↻ Xóa lọc
                        </button>
                    </div>
                </>
            )}

            {/* ================= Khu vực chính: chỉ hiện DANH SÁCH hoặc CHI TIẾT ================= */}
            <div className={`incident-workspace ${showDetail ? "show-detail" : ""}`}>
                {/* ----- Danh sách ----- */}
                <div className="incident-list-col">
                    <div className="incident-table-wrapper">
                        {error && <div className="incident-error">{error}</div>}

                        {loading ? (
                            <div className="incident-empty">Đang tải dữ liệu...</div>
                        ) : incidents.length === 0 ? (
                            <div className="incident-empty">Không có sự cố nào phù hợp.</div>
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
                                            <tr key={item.incidentId} onClick={() => handleSelectIncident(item.incidentId)}>
                                                <td>
                                                    <div className="incident-title-cell">
                                                        {item.thumbnail && (
                                                            <img src={item.thumbnail} alt="" className="incident-thumb" />
                                                        )}
                                                        <span className="incident-title-text">{item.title}</span>
                                                    </div>
                                                </td>
                                                <td>{item.branchName}</td>
                                                <td>
                                                    <div>{item.reporterName}</div>
                                                    <div className="incident-muted">{item.reporterPhone}</div>
                                                </td>
                                                <td>
                                                    <StatusBadge status={item.status} />
                                                </td>
                                                <td>
                                                    {item.createdAt
                                                        ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                                                        : "—"}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-view"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectIncident(item.incidentId);
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
                                            className="incident-card"
                                            key={item.incidentId}
                                            onClick={() => handleSelectIncident(item.incidentId)}
                                        >
                                            <div className="incident-card-head">
                                                {item.thumbnail && (
                                                    <img src={item.thumbnail} alt="" className="incident-thumb" />
                                                )}
                                                <div>
                                                    <div className="incident-card-title">{item.title}</div>
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
                        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            ← Trước
                        </button>
                        <span>Trang {page}</span>
                        <button disabled={incidents.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
                            Sau →
                        </button>
                    </div>
                </div>

                {/* ----- Chi tiết (trang riêng, thay thế hẳn danh sách) ----- */}
                <div className="incident-detail-col">
                    <div className="detail-panel">
                        <button type="button" className="detail-back-btn" onClick={handleBackToList}>
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
                            <div className="detail-placeholder detail-error">{detailError}</div>
                        ) : incident ? (
                            <div className="detail-content">
                                {editMode ? (
                                    <div className="detail-edit-form">
                                        <div>
                                            <div className="detail-edit-label">Tiêu đề</div>
                                            <input
                                                className="detail-edit-input"
                                                value={editTitle}
                                                maxLength={200}
                                                placeholder="Nhập tiêu đề sự cố"
                                                onChange={(e) => setEditTitle(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <div className="detail-edit-label">Mô tả</div>
                                            <textarea
                                                className="detail-reason-input"
                                                value={editDescription}
                                                maxLength={2000}
                                                placeholder="Nhập mô tả sự cố"
                                                onChange={(e) => setEditDescription(e.target.value)}
                                            />
                                        </div>

                                        {saveInfoError && <div className="detail-submit-error">{saveInfoError}</div>}

                                        <div className="detail-edit-actions">
                                            <button className="btn-primary" disabled={savingInfo} onClick={handleSaveInfo}>
                                                {savingInfo ? "Đang lưu..." : "💾 Lưu nội dung"}
                                            </button>
                                            <button className="btn-reset" disabled={savingInfo} onClick={handleCancelEditInfo}>
                                                Hủy
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="detail-title-row">
                                            <h3>{incident.title}</h3>
                                            <span className={`status-badge status-${incident.status?.toLowerCase()}`}>
                                                {STATUS_LABEL[incident.status] || incident.status}
                                            </span>
                                        </div>

                                        <p className="detail-description">{incident.description}</p>

                                        {canEditInfo && (
                                            <button className="btn-view detail-edit-btn" onClick={() => setEditMode(true)}>
                                                ✎ Sửa nội dung
                                            </button>
                                        )}
                                    </>
                                )}

                                <div className="detail-info-grid">
                                    <div>
                                        <span className="detail-info-label">Chi nhánh</span>
                                        <span>{incident.branchName}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">Thiết bị</span>
                                        <span>{incident.equipmentName || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">Người báo cáo</span>
                                        <span>
                                            {incident.reporterName} (
                                            {incident.reporterRole === "Member" ? "Hội viên" : "Nhân viên"})
                                        </span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">Số điện thoại</span>
                                        <span>{incident.reporterPhone || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">Ngày tạo</span>
                                        <span>
                                            {incident.createdAt
                                                ? new Date(incident.createdAt).toLocaleString("vi-VN")
                                                : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="detail-info-label">Cập nhật lúc</span>
                                        <span>
                                            {incident.updatedAt
                                                ? new Date(incident.updatedAt).toLocaleString("vi-VN")
                                                : "—"}
                                        </span>
                                    </div>
                                </div>

                                {incident.status === "Cancelled" && incident.rejectReason && (
                                    <div className="detail-reject-reason">
                                        <strong>Lý do hủy:</strong> {incident.rejectReason}
                                    </div>
                                )}

                                {incident.medias && incident.medias.length > 0 && (
                                    <div className="detail-media">
                                        <span className="detail-info-label">Hình ảnh / Video</span>
                                        <div className="detail-media-grid">
                                            {incident.medias.map((m, idx) =>
                                                m.mediaType === "Video" ? (
                                                    <video key={idx} src={m.mediaUrl} controls className="detail-media-item" />
                                                ) : (
                                                    <img key={idx} src={m.mediaUrl} alt="" className="detail-media-item" />
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {availableNext.length > 0 ? (
                                    <div className="detail-actions">
                                        <span className="detail-info-label">Cập nhật trạng thái</span>

                                        <div className="detail-actions-row">
                                            <CustomSelect
                                                className="custom-select-status-action"
                                                placeholder="-- Chọn trạng thái mới --"
                                                options={availableNext.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                                                value={nextStatus}
                                                onChange={(v) => {
                                                    setNextStatus(v);
                                                    setSubmitError("");
                                                }}
                                            />

                                            <button
                                                className="btn-primary"
                                                disabled={!nextStatus || submitting}
                                                onClick={() => handleUpdateStatus(nextStatus)}
                                            >
                                                {submitting ? "Đang lưu..." : "Cập nhật"}
                                            </button>
                                        </div>

                                        {nextStatus === "Cancelled" && (
                                            <textarea
                                                className="detail-reason-input"
                                                placeholder="Nhập lý do hủy..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                            />
                                        )}

                                        {submitError && <div className="detail-submit-error">{submitError}</div>}

                                        {incident.status === "PendingApproval" && (
                                            <button
                                                className="btn-approve"
                                                disabled={submitting}
                                                onClick={() => handleUpdateStatus("Approved")}
                                            >
                                                ✓ Duyệt nhanh
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="detail-final-note">
                                        Báo cáo này đã kết thúc, không thể thay đổi trạng thái.
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