import {
    ChevronDown,
    Eye,
    Loader2,
    Lock,
    MapPin,
    Plus,
    Search,
    Unlock,
    Users,
    X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";

// Vai trò cố định trong hệ thống (ít khi thay đổi nên để tĩnh ở FE).
// roleId phải khớp với role_id trong bảng roles bên DB.
// roleName PHẢI khớp CHÍNH XÁC với Role.RoleName trong DB (BE dùng để so sánh/gán quyền),
// label chỉ là chữ hiển thị tiếng Việt cho đẹp, không được dùng để so khớp với dữ liệu BE trả về.
const ROLES = [
    { roleId: 3, roleName: "Admin", label: "Admin" },
    { roleId: 2, roleName: "Manager", label: "Quản lý" },
    { roleId: 1, roleName: "Staff", label: "Lễ tân" },
];

function roleLabel(roleName) {
    return ROLES.find((r) => r.roleName === roleName)?.label || roleName;
}

// API danh sách có thể trả về mảng thuần, { data: [...] }, { items: [...] }
// hoặc { data: { items: [...] } } tuỳ endpoint — xử lý mọi hình dạng có thể gặp.
function extractList(res) {
    const root = res?.data ?? res;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.items)) return root.items;
    if (Array.isArray(root?.data)) return root.data;
    if (Array.isArray(root?.data?.items)) return root.data.items;
    return [];
}

/* ============================================================================
   PLAIN CSS — tông màu ĐỒNG BỘ với sidebar.
   Các khối chính (header / filters / table / modal) đều có viền xanh lá
   đậm 4 cạnh để tạo điểm nhấn đồng bộ. Header của bảng có nền màu.
   ============================================================================ */

const styles = `
  * { box-sizing: border-box; }

  .elp-page {
    --elp-accent: #10B981;
    --elp-accent-dark: #059669;
    --elp-accent-bg: #ECFDF5;
    --elp-accent-border: #A7F3D0;
    --elp-danger: #EF4444;
    --elp-danger-dark: #DC2626;
    --elp-danger-bg: #FEF2F2;
    --elp-danger-border: #FECACA;
    --elp-warning: #F59E0B;
    --elp-warning-bg: #FFFBEB;
    --elp-warning-border: #FDE68A;

    min-height: 100vh;
    background: #F8FAFC;
    padding: 24px;
    color: #0F172A;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  @media (min-width: 640px) {
    .elp-page { padding: 32px; }
  }

  .elp-wrap { margin: 0 auto; max-width: 1152px; }

  /* Header */
  .elp-header {
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-radius: 16px;
    border: 3px solid var(--elp-accent);
    background: #FFFFFF;
    padding: 16px 20px;
    box-shadow: 0 10px 28px rgba(16, 185, 129, 0.16);
  }
  .elp-header-left { display: flex; align-items: center; gap: 12px; }
  .elp-header-icon {
    display: flex;
    height: 44px;
    width: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: var(--elp-accent);
    color: #FFFFFF;
    flex-shrink: 0;
  }
  .elp-title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }
  .elp-subtitle { font-size: 14px; color: #64748B; margin: 2px 0 0; }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background-color 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
  }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn-primary {
    background: var(--elp-accent);
    color: #FFFFFF;
    padding: 10px 16px;
  }
  .btn-primary:hover:not(:disabled) { background: var(--elp-accent-dark); }
  .btn-outline {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #334155;
    padding: 10px 16px;
  }
  .btn-outline:hover:not(:disabled) { background: #F1F5F9; }
  .btn-sm-outline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #334155;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .btn-sm-outline:hover { background: #F1F5F9; }
  .btn-sm-lock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid var(--elp-danger-border);
    background: var(--elp-danger-bg);
    color: var(--elp-danger-dark);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-sm-lock:hover:not(:disabled) { background: #FEE2E2; }
  .btn-sm-lock:disabled { opacity: 0.5; cursor: default; }
  .btn-sm-unlock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid var(--elp-accent-border);
    background: var(--elp-accent-bg);
    color: var(--elp-accent-dark);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-sm-unlock:hover:not(:disabled) { background: #D1FAE5; }
  .btn-sm-unlock:disabled { opacity: 0.5; cursor: default; }

  .spin { animation: elp-spin 0.8s linear infinite; }
  @keyframes elp-spin { to { transform: rotate(360deg); } }

  /* Filters bar */
  .elp-filters {
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    border-radius: 16px;
    border: 3px solid var(--elp-accent);
    background: #FFFFFF;
    padding: 12px;
    box-shadow: 0 10px 28px rgba(16, 185, 129, 0.16);
  }
  .elp-search { position: relative; min-width: 240px; flex: 1; }
  .elp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94A3B8;
    pointer-events: none;
  }
  .elp-input {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    padding: 10px 14px;
    font-size: 14px;
    color: #0F172A;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .elp-input::placeholder { color: #94A3B8; }
  .elp-input:focus {
    border-color: var(--elp-accent);
    box-shadow: 0 0 0 3px var(--elp-accent-bg);
  }
  .elp-input-pl { padding-left: 36px; }
  .elp-select-wrap { position: relative; }
  .elp-select {
    appearance: none;
    padding-right: 36px;
  }
  .elp-select-caret {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94A3B8;
    pointer-events: none;
  }

  .elp-count { margin-bottom: 12px; font-size: 14px; color: #64748B; }
  .elp-count strong { font-weight: 600; color: #0F172A; }

  /* Table */
  .elp-table {
    overflow: hidden;
    border-radius: 16px;
    border: 3px solid var(--elp-accent);
    background: #FFFFFF;
    box-shadow: 0 10px 28px rgba(16, 185, 129, 0.16);
  }
  .elp-row-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1.4fr 1fr 1.2fr;
    gap: 16px;
  }
  .elp-thead {
    border-bottom: 3px solid var(--elp-accent);
    background: var(--elp-accent);
    padding: 12px 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #FFFFFF;
  }
  .elp-th-right { text-align: right; }
  .elp-trow {
    align-items: center;
    border-bottom: 1px solid #EEF2F6;
    padding: 16px 20px;
    transition: background-color 0.15s ease;
  }
  .elp-trow:last-child { border-bottom: none; }
  .elp-trow:hover { background: #F8FAFC; }
  .elp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 64px 0;
    font-size: 14px;
    color: #64748B;
  }
  .elp-empty-static {
    padding: 64px 0;
    text-align: center;
    font-size: 14px;
    color: #94A3B8;
  }

  .elp-emp-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .elp-avatar {
    display: flex;
    height: 40px;
    width: 40px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: linear-gradient(to bottom right, #34D399, var(--elp-accent-dark));
    font-size: 14px;
    font-weight: 700;
    color: #FFFFFF;
    overflow: hidden;
  }
  .elp-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .elp-emp-name {
    margin: 0;
    font-weight: 600;
    color: #0F172A;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .elp-emp-phone { margin: 0; font-size: 12px; color: #94A3B8; }
  .elp-role { font-size: 14px; color: #334155; }

  .elp-branches { display: flex; flex-wrap: wrap; gap: 6px; }
  .elp-branch-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 8px;
    background: var(--elp-accent-bg);
    padding: 2px 8px;
    font-size: 12px;
    color: var(--elp-accent-dark);
  }
  .elp-branch-more {
    border-radius: 8px;
    background: #F1F5F9;
    padding: 2px 8px;
    font-size: 12px;
    color: #64748B;
  }

  .elp-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .elp-badge-active { background: var(--elp-accent-bg); color: var(--elp-accent-dark); }
  .elp-badge-suspended { background: var(--elp-danger-bg); color: var(--elp-danger-dark); }
  .elp-dot { height: 6px; width: 6px; border-radius: 999px; }
  .elp-dot-active { background: var(--elp-accent); }
  .elp-dot-suspended { background: var(--elp-danger); }

  .elp-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }

  /* Modal */
  .elp-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.45);
    padding: 16px;
  }
  .elp-modal {
    width: 100%;
    max-width: 384px;
    border-radius: 16px;
    border: 3px solid var(--elp-accent);
    background: #FFFFFF;
    padding: 20px;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
  }
  .elp-modal-head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .elp-modal-head h3 { margin: 0; font-weight: 600; color: #0F172A; }
  .elp-modal-close {
    background: none;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .elp-modal-close:hover { color: #0F172A; }
  .elp-modal-desc { margin: 0 0 16px; font-size: 14px; color: #64748B; }
  .elp-modal-desc strong { font-weight: 500; color: #0F172A; }
  .elp-modal-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    background: var(--elp-danger);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-danger:hover:not(:disabled) { background: var(--elp-danger-dark); }
  .btn-danger:disabled { opacity: 0.5; cursor: default; }

  .elp-boot {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #F8FAFC;
    color: #64748B;
    font-size: 14px;
  }
  .elp-boot-error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #F8FAFC;
    color: var(--elp-danger-dark);
    font-size: 14px;
    padding: 24px;
    text-align: center;
  }
  .elp-list-error {
    margin-bottom: 16px;
    border-radius: 12px;
    border: 1px solid var(--elp-danger-border);
    background: var(--elp-danger-bg);
    padding: 10px 14px;
    font-size: 14px;
    color: var(--elp-danger-dark);
  }
`;

/* ============================================================================
   UI PRIMITIVES
   ============================================================================ */

function StatusBadge({ status }) {
    const isActive = status === "Active";
    return (
        <span className={`elp-badge ${isActive ? "elp-badge-active" : "elp-badge-suspended"}`}>
            <span className={`elp-dot ${isActive ? "elp-dot-active" : "elp-dot-suspended"}`} />
            {isActive ? "Đang hoạt động" : "Đã khóa"}
        </span>
    );
}

function Avatar({ name, imageUrl }) {
    if (imageUrl) {
        return (
            <div className="elp-avatar">
                <img src={imageUrl} alt={name} />
            </div>
        );
    }
    const initials = (name || "")
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    return <div className="elp-avatar">{initials}</div>;
}

/* ============================================================================
   MODAL XÁC NHẬN KHÓA TÀI KHOẢN
   Không còn nhập lý do — chỉ hỏi xác nhận có/không.
   ============================================================================ */

function ConfirmLockModal({ fullName, onCancel, onConfirm }) {
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        await onConfirm();
        setSubmitting(false);
    };

    return (
        <div className="elp-overlay">
            <div className="elp-modal">
                <div className="elp-modal-head">
                    <h3>Khóa tài khoản</h3>
                    <button onClick={onCancel} className="elp-modal-close">
                        <X size={18} />
                    </button>
                </div>
                <p className="elp-modal-desc">
                    Bạn có chắc chắn muốn khóa tài khoản của <strong>{fullName}</strong>?
                </p>
                <div className="elp-modal-actions">
                    <button onClick={onCancel} className="btn btn-outline">
                        Hủy
                    </button>
                    <button onClick={submit} disabled={submitting} className="btn-danger">
                        {submitting && <Loader2 size={14} className="spin" />}
                        Xác nhận khóa
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   TRANG DANH SÁCH TÀI KHOẢN HỆ THỐNG (AccountSystem)
   Route: /employees
   Gọi thẳng adminApi (luồng ACCOUNT — chỉ nhân viên ĐÃ có tài khoản đăng nhập),
   không còn qua managerApi.
   - "Thêm nhân viên" -> điều hướng sang trang tạo mới (/admin/employees/system/create)
   - "Xem" -> điều hướng sang trang chi tiết (/admin/employees/:id)
   ============================================================================ */

export default function AccountSystemPageOfAdmin() {
    const navigate = useNavigate();

    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [filters, setFilters] = useState({ name: "", status: "", branchId: "" });
    const [confirmLock, setConfirmLock] = useState(null); // { employeeId, fullName }
    const [busyId, setBusyId] = useState(null);

    const fetchList = useCallback(async (f) => {
        setLoading(true);
        setListError("");
        try {
            // GET /api/employee/accounts — danh sách nhân viên thuộc luồng Account.
            const res = await adminApi.getEmployeeAccountList({
                name: f.name || undefined,
                status: f.status || undefined,
                branchId: f.branchId || undefined,
            });
            setEmployees(extractList(res));
        } catch (err) {
            setEmployees([]);
            setListError(err?.data?.message || err?.message || "Không tải được danh sách nhân viên.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const rawBranches = await adminApi.getBranches();
                setBranches(extractList(rawBranches));
            } catch (err) {
                setListError(err?.data?.message || err?.message || "Không tải được danh sách chi nhánh.");
            }
        })();
        fetchList(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyFilters = (next) => {
        setFilters(next);
        fetchList(next);
    };

    const resetFilters = () => {
        const next = { name: "", status: "", branchId: "" };
        setFilters(next);
        fetchList(next);
    };

    const toggleStatus = async (emp) => {
        if (emp.status === "Active") {
            setConfirmLock({ employeeId: emp.employeeId, fullName: emp.fullName });
            return;
        }
        setBusyId(emp.employeeId);
        try {
            // PATCH /api/employee/{id}/activate — mở khóa toàn diện.
            await adminApi.activateEmployee(emp.employeeId);
            await fetchList(filters);
        } catch (err) {
            setListError(err?.data?.message || err?.message || "Mở khóa tài khoản thất bại.");
        } finally {
            setBusyId(null);
        }
    };

    const confirmHide = async () => {
        if (!confirmLock) return;
        setBusyId(confirmLock.employeeId);
        try {
            // PATCH /api/employee/{id}/hide — khóa toàn diện, không còn cần reason.
            await adminApi.hideEmployee(confirmLock.employeeId);
            setConfirmLock(null);
            await fetchList(filters);
        } catch (err) {
            setListError(err?.data?.message || err?.message || "Khóa tài khoản thất bại.");
            setConfirmLock(null);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="elp-page">
            <style>{styles}</style>
            <div className="elp-wrap">
                <div className="elp-header">
                    <div className="elp-header-left">
                        <div className="elp-header-icon">
                            <Users size={22} />
                        </div>
                        <div>
                            <h1 className="elp-title">Danh sách nhân viên</h1>
                            <p className="elp-subtitle">Quản lý tài khoản nhân viên vận hành phòng gym</p>
                        </div>
                    </div>
                    <button onClick={() => navigate("/admin/employees/system/create")} className="btn btn-primary">
                        <Plus size={16} />
                        Thêm nhân viên
                    </button>
                </div>

                <div className="elp-filters">
                    <div className="elp-search">
                        <Search size={16} className="elp-search-icon" />
                        <input
                            value={filters.name}
                            onChange={(e) => applyFilters({ ...filters, name: e.target.value })}
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            className="elp-input elp-input-pl"
                        />
                    </div>

                    <div className="elp-select-wrap">
                        <select
                            value={filters.status}
                            onChange={(e) => applyFilters({ ...filters, status: e.target.value })}
                            className="elp-input elp-select"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="Active">Đang hoạt động</option>
                            <option value="Suspended">Đã khóa</option>
                        </select>
                        <ChevronDown size={15} className="elp-select-caret" />
                    </div>

                    <div className="elp-select-wrap">
                        <select
                            value={filters.branchId}
                            onChange={(e) => applyFilters({ ...filters, branchId: e.target.value })}
                            className="elp-input elp-select"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.branchId} value={b.branchId}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={15} className="elp-select-caret" />
                    </div>

                    <button onClick={resetFilters} className="btn btn-outline">
                        Đặt lại
                    </button>
                </div>

                {listError && <p className="elp-list-error">{listError}</p>}

                <p className="elp-count">
                    Tìm thấy <strong>{employees.length}</strong> nhân viên
                </p>

                <div className="elp-table">
                    <div className="elp-row-grid elp-thead">
                        <span>Nhân viên</span>
                        <span>Vai trò</span>
                        <span>Chi nhánh</span>
                        <span>Trạng thái</span>
                        <span className="elp-th-right">Thao tác</span>
                    </div>

                    {loading ? (
                        <div className="elp-empty">
                            <Loader2 size={16} className="spin" />
                            Đang tải danh sách...
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="elp-empty-static">Không tìm thấy nhân viên nào phù hợp bộ lọc.</div>
                    ) : (
                        employees.map((emp) => (
                            <div key={emp.employeeId} className="elp-row-grid elp-trow">
                                <div className="elp-emp-cell">
                                    <Avatar name={emp.fullName} imageUrl={emp.faceProfileImage} />
                                    <div style={{ minWidth: 0 }}>
                                        <p className="elp-emp-name">{emp.fullName}</p>
                                        <p className="elp-emp-phone">{emp.phone}</p>
                                    </div>
                                </div>

                                <span className="elp-role">{roleLabel(emp.role)}</span>

                                <div className="elp-branches">
                                    {emp.branches.slice(0, 2).map((b) => (
                                        <span key={b.branchId} className="elp-branch-tag">
                                            <MapPin size={10} />
                                            {b.branchName}
                                        </span>
                                    ))}
                                    {emp.branches.length > 2 && (
                                        <span className="elp-branch-more">+{emp.branches.length - 2}</span>
                                    )}
                                </div>

                                <StatusBadge status={emp.status} />

                                <div className="elp-actions">
                                    <button
                                        onClick={() => navigate(`/admin/employees/system/${emp.employeeId}`)}
                                        className="btn-sm-outline"
                                    >
                                        <Eye size={13} />
                                        Xem
                                    </button>
                                    <button
                                        disabled={busyId === emp.employeeId}
                                        onClick={() => toggleStatus(emp)}
                                        className={emp.status === "Active" ? "btn-sm-lock" : "btn-sm-unlock"}
                                    >
                                        {busyId === emp.employeeId ? (
                                            <Loader2 size={13} className="spin" />
                                        ) : emp.status === "Active" ? (
                                            <Lock size={13} />
                                        ) : (
                                            <Unlock size={13} />
                                        )}
                                        {emp.status === "Active" ? "Khóa" : "Mở khóa"}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {confirmLock && (
                <ConfirmLockModal
                    fullName={confirmLock.fullName}
                    onCancel={() => setConfirmLock(null)}
                    onConfirm={confirmHide}
                />
            )}
        </div>
    );
}