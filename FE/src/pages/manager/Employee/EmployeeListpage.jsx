import {
    ArrowLeft,
    Check,
    ChevronDown,
    Loader2,
    Lock,
    MapPin,
    Pencil,
    Plus,
    Search,
    Unlock,
    Users,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import managerApi from "../../../api/managerApi";

// Vai trò cố định trong hệ thống (ít khi thay đổi nên để tĩnh ở FE).
// roleId phải khớp với role_id trong bảng roles bên DB.
const ROLES = [
    { roleId: 3, roleName: "Admin" },
    { roleId: 2, roleName: "Manager" },
    { roleId: 1, roleName: "Lễ tân" },

];

/* ============================================================================
   PLAIN CSS — thay thế toàn bộ Tailwind utility classes.
   ============================================================================ */

const styles = `
  * { box-sizing: border-box; }

  .elp-page {
    min-height: 100vh;
    background: #0a0f1a;
    padding: 24px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  @media (min-width: 640px) {
    .elp-page { padding: 32px; }
  }

  .elp-wrap { margin: 0 auto; max-width: 1152px; }
  .elp-wrap-narrow { margin: 0 auto; max-width: 672px; }

  /* Header */
  .elp-header {
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .elp-header-left { display: flex; align-items: center; gap: 12px; }
  .elp-header-icon {
    display: flex;
    height: 44px;
    width: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(45, 212, 191, 0.15);
    color: #5eead4;
    flex-shrink: 0;
  }
  .elp-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
  .elp-subtitle { font-size: 14px; color: #94a3b8; margin: 2px 0 0; }
  .elp-back {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #94a3b8;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .elp-back:hover { color: #fff; }

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
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn-primary {
    background: #14b8a6;
    color: #0f172a;
    padding: 10px 16px;
  }
  .btn-primary:hover:not(:disabled) { background: #2dd4bf; }
  .btn-outline {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #cbd5e1;
    padding: 10px 16px;
  }
  .btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.05); }
  .btn-sm-outline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .btn-sm-outline:hover { background: rgba(255,255,255,0.1); }
  .btn-sm-lock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid rgba(251, 113, 133, 0.3);
    background: transparent;
    color: #fda4af;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-sm-lock:hover:not(:disabled) { background: rgba(244, 63, 94, 0.1); }
  .btn-sm-lock:disabled { opacity: 0.5; cursor: default; }
  .btn-sm-unlock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid rgba(45, 212, 191, 0.3);
    background: transparent;
    color: #5eead4;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-sm-unlock:hover:not(:disabled) { background: rgba(20, 184, 166, 0.1); }
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
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    padding: 12px;
  }
  .elp-search { position: relative; min-width: 240px; flex: 1; }
  .elp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
  }
  .elp-input {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(15, 23, 42, 0.7);
    padding: 10px 14px;
    font-size: 14px;
    color: #fff;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .elp-input::placeholder { color: #64748b; }
  .elp-input:focus {
    border-color: rgba(45, 212, 191, 0.6);
    box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.2);
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
    color: #64748b;
    pointer-events: none;
  }

  .elp-count { margin-bottom: 12px; font-size: 14px; color: #94a3b8; }
  .elp-count strong { font-weight: 600; color: #fff; }

  /* Table */
  .elp-table {
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
  }
  .elp-row-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1.4fr 1fr 1.2fr;
    gap: 16px;
  }
  .elp-thead {
    border-bottom: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    padding: 12px 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }
  .elp-th-right { text-align: right; }
  .elp-trow {
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding: 16px 20px;
    transition: background-color 0.15s ease;
  }
  .elp-trow:last-child { border-bottom: none; }
  .elp-trow:hover { background: rgba(255,255,255,0.02); }
  .elp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 64px 0;
    font-size: 14px;
    color: #94a3b8;
  }
  .elp-empty-static {
    padding: 64px 0;
    text-align: center;
    font-size: 14px;
    color: #64748b;
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
    background: linear-gradient(to bottom right, #2dd4bf, #0891b2);
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .elp-emp-name {
    margin: 0;
    font-weight: 600;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .elp-emp-phone { margin: 0; font-size: 12px; color: #64748b; }
  .elp-role { font-size: 14px; color: #cbd5e1; }

  .elp-branches { display: flex; flex-wrap: wrap; gap: 6px; }
  .elp-branch-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 8px;
    background: rgba(6, 182, 212, 0.1);
    padding: 2px 8px;
    font-size: 12px;
    color: #67e8f9;
  }
  .elp-branch-more {
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    padding: 2px 8px;
    font-size: 12px;
    color: #94a3b8;
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
  .elp-badge-active { background: rgba(20, 184, 166, 0.15); color: #5eead4; }
  .elp-badge-suspended { background: rgba(244, 63, 94, 0.15); color: #fda4af; }
  .elp-dot { height: 6px; width: 6px; border-radius: 999px; }
  .elp-dot-active { background: #2dd4bf; }
  .elp-dot-suspended { background: #fb7185; }

  .elp-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

  /* Modal */
  .elp-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.6);
    padding: 16px;
  }
  .elp-modal {
    width: 100%;
    max-width: 384px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: #0f1626;
    padding: 20px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  }
  .elp-modal-head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .elp-modal-head h3 { margin: 0; font-weight: 600; color: #fff; }
  .elp-modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .elp-modal-close:hover { color: #fff; }
  .elp-modal-desc { margin: 0 0 16px; font-size: 14px; color: #94a3b8; }
  .elp-modal-desc strong { font-weight: 500; color: #fff; }
  .elp-textarea {
    width: 100%;
    resize: vertical;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(15, 23, 42, 0.7);
    padding: 10px 14px;
    font-size: 14px;
    color: #fff;
    outline: none;
    font-family: inherit;
  }
  .elp-textarea::placeholder { color: #64748b; }
  .elp-textarea:focus {
    border-color: rgba(45, 212, 191, 0.6);
    box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.2);
  }
  .elp-modal-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    background: #f43f5e;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-danger:hover:not(:disabled) { background: #fb7185; }
  .btn-danger:disabled { opacity: 0.5; cursor: default; }

  /* Form */
  .elp-form-card {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .elp-form-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
    padding: 80px 0;
    font-size: 14px;
    color: #94a3b8;
  }
  .elp-form-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .elp-form-grid { grid-template-columns: 1fr 1fr; }
  }
  .elp-field-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
  }
  .elp-field-hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #64748b;
  }
  .elp-readonly {
    display: flex;
    align-items: center;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
    padding: 10px 14px;
    font-size: 14px;
    color: #94a3b8;
  }

  .elp-branch-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: #94a3b8;
    font-size: 14px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .elp-branch-toggle:hover { background: rgba(255,255,255,0.05); }
  .elp-branch-toggle-active {
    border-color: rgba(45, 212, 191, 0.5);
    background: rgba(20, 184, 166, 0.15);
    color: #5eead4;
  }

  .elp-error {
    margin: 0;
    border-radius: 12px;
    border: 1px solid rgba(251, 113, 133, 0.3);
    background: rgba(244, 63, 94, 0.1);
    padding: 10px 14px;
    font-size: 14px;
    color: #fda4af;
  }
  .elp-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }

  .elp-boot {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #0a0f1a;
    color: #94a3b8;
    font-size: 14px;
  }
  .elp-boot-error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #0a0f1a;
    color: #fda4af;
    font-size: 14px;
    padding: 24px;
    text-align: center;
  }
  .elp-list-error {
    margin-bottom: 16px;
    border-radius: 12px;
    border: 1px solid rgba(251, 113, 133, 0.3);
    background: rgba(244, 63, 94, 0.1);
    padding: 10px 14px;
    font-size: 14px;
    color: #fda4af;
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

function Avatar({ name }) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    return <div className="elp-avatar">{initials}</div>;
}

function Field({ label, children, hint }) {
    return (
        <label style={{ display: "block" }}>
            <span className="elp-field-label">{label}</span>
            {children}
            {hint && <span className="elp-field-hint">{hint}</span>}
        </label>
    );
}

/* ============================================================================
   DANH SÁCH NHÂN VIÊN
   ============================================================================ */

function EmployeeListView({ branches, onEdit, onCreate }) {
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
            // GHI CHÚ: authApi dùng fetch thuần, hàm request() trả THẲNG dữ liệu JSON
            // đã parse (không bọc trong { data: ... } như axios) — nên ở đây dùng
            // thẳng kết quả trả về, KHÔNG được đọc `.data`.
            const employeeList = await managerApi.getListEmployees({
                name: f.name || undefined,
                status: f.status || undefined,
                branchId: f.branchId || undefined,
            });
            setEmployees(employeeList || []);
        } catch (err) {
            setEmployees([]);
            setListError(err?.data?.message || err?.message || "Không tải được danh sách nhân viên.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
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

    // Mỗi hàng gọi khóa/mở khóa độc lập theo employeeId của chính hàng đó (closure),
    // không dùng biến id dùng chung nên không lo bấm nhầm hàng khác.
    const toggleStatus = async (emp) => {
        if (emp.status === "Active") {
            setConfirmLock({ employeeId: emp.employeeId, fullName: emp.fullName });
            return;
        }
        setBusyId(emp.employeeId);
        try {
            await managerApi.activateEmployee(emp.employeeId);
            await fetchList(filters);
        } catch (err) {
            setListError(err?.data?.message || err?.message || "Mở khóa tài khoản thất bại.");
        } finally {
            setBusyId(null);
        }
    };

    const confirmHide = async (reason) => {
        if (!confirmLock) return;
        setBusyId(confirmLock.employeeId);
        try {
            await managerApi.hideEmployee(confirmLock.employeeId, reason);
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
                {/* Header */}
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
                    <button onClick={onCreate} className="btn btn-primary">
                        <Plus size={16} />
                        Thêm nhân viên
                    </button>
                </div>

                {/* Filters */}
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

                {/* Table */}
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
                                    <Avatar name={emp.fullName} />
                                    <div style={{ minWidth: 0 }}>
                                        <p className="elp-emp-name">{emp.fullName}</p>
                                        <p className="elp-emp-phone">{emp.phone}</p>
                                    </div>
                                </div>

                                <span className="elp-role">{emp.role}</span>

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
                                    <button onClick={() => onEdit(emp.employeeId)} className="btn-sm-outline">
                                        <Pencil size={13} />
                                        Sửa
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
                <LockReasonModal
                    fullName={confirmLock.fullName}
                    onCancel={() => setConfirmLock(null)}
                    onConfirm={confirmHide}
                />
            )}
        </div>
    );
}

function LockReasonModal({ fullName, onCancel, onConfirm }) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        await onConfirm(reason.trim());
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
                    Nhập lý do khóa tài khoản của <strong>{fullName}</strong>.
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="VD: Nghỉ việc, vi phạm nội quy..."
                    className="elp-textarea"
                />
                <div className="elp-modal-actions">
                    <button onClick={onCancel} className="btn btn-outline">
                        Hủy
                    </button>
                    <button onClick={submit} disabled={!reason.trim() || submitting} className="btn-danger">
                        {submitting && <Loader2 size={14} className="spin" />}
                        Xác nhận khóa
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   FORM SỬA / THÊM NHÂN VIÊN
   Nhận đúng 1 employeeId cố định khi vào trang (giống việc điều hướng sang
   route /employee/edit/:id) — không đọc/ghi lên một state "đang chọn" dùng
   chung giữa các hàng, nên không xảy ra tình trạng sửa nhầm nhân viên khác.
   ============================================================================ */

function EmployeeFormView({ employeeId, branches, currentRole, onBack, onSaved }) {
    const isEdit = employeeId != null;
    const isAdmin = currentRole === "Admin";
    const [loading, setLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        gender: "Nam",
        roleId: ROLES[2].roleId,
        branchIds: [],
    });

    React.useEffect(() => {
        if (!isEdit) return;
        (async () => {
            try {
                // BE chưa có endpoint lấy chi tiết theo id, nên lấy danh sách rồi lọc,
                // giống hệt cách trang danh sách đang lấy dữ liệu.
                // Lưu ý: authApi trả thẳng mảng JSON, không bọc trong { data: ... }.
                const employeeList = await managerApi.getListEmployees({});
                const emp = employeeList.find((e) => e.employeeId === employeeId);
                if (emp) {
                    setForm({
                        fullName: emp.fullName,
                        phone: emp.phone,
                        email: emp.email || "",
                        password: "",
                        gender: emp.gender,
                        roleId: ROLES.find((r) => r.roleName === emp.role)?.roleId || ROLES[2].roleId,
                        branchIds: emp.branches.map((b) => b.branchId),
                    });
                } else {
                    setLoadError("Không tìm thấy nhân viên này.");
                }
            } catch (err) {
                setLoadError(err?.data?.message || err?.message || "Không tải được thông tin nhân viên.");
            } finally {
                setLoading(false);
            }
        })();
    }, [employeeId, isEdit]);

    const toggleBranch = (branchId) => {
        setForm((f) => ({
            ...f,
            branchIds: f.branchIds.includes(branchId)
                ? f.branchIds.filter((id) => id !== branchId)
                : [...f.branchIds, branchId],
        }));
    };

    const submit = async () => {
        setError("");
        if (!form.fullName.trim() || !form.phone.trim()) {
            setError("Vui lòng nhập họ tên và số điện thoại.");
            return;
        }
        if (form.branchIds.length === 0) {
            setError("Chọn ít nhất 1 chi nhánh phụ trách.");
            return;
        }
        if (!isEdit && form.password.trim().length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (isEdit && form.password.trim() && form.password.trim().length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                // Chỉ gửi mật khẩu lên khi người dùng thực sự nhập mật khẩu mới,
                // để trống thì backend sẽ giữ nguyên mật khẩu cũ.
                const payload = { ...form };
                if (!payload.password.trim()) delete payload.password;
                await managerApi.updateEmployee(employeeId, payload);
            } else {
                await managerApi.createEmployee(form);
            }
            onSaved();
        } catch (err) {
            setError(err?.data?.message || err?.message || "Lưu thông tin nhân viên thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="elp-page">
            <style>{styles}</style>
            <div className="elp-wrap-narrow">
                <button onClick={onBack} className="elp-back">
                    <ArrowLeft size={16} />
                    Quay lại danh sách
                </button>

                <div className="elp-header-left" style={{ marginBottom: 24 }}>
                    <div className="elp-header-icon">
                        <Pencil size={20} />
                    </div>
                    <div>
                        <h1 className="elp-title">{isEdit ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</h1>
                        {isEdit && <p className="elp-subtitle" style={{ color: "#64748b" }}>Mã nhân viên #{employeeId}</p>}
                    </div>
                </div>

                {loading ? (
                    <div className="elp-form-loading">
                        <Loader2 size={16} className="spin" />
                        Đang tải thông tin...
                    </div>
                ) : loadError ? (
                    <div className="elp-form-loading" style={{ color: "#fda4af" }}>
                        {loadError}
                    </div>
                ) : (
                    <div className="elp-form-card">
                        <div className="elp-form-grid">
                            <Field label="Họ và tên">
                                <input
                                    className="elp-input"
                                    value={form.fullName}
                                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Nguyễn Văn A"
                                />
                            </Field>
                            <Field label="Số điện thoại" hint="Dùng làm tên đăng nhập">
                                <input
                                    className="elp-input"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="09xxxxxxxx"
                                />
                            </Field>
                            <Field label="Email">
                                <input
                                    className="elp-input"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="email@vtgym.vn"
                                />
                            </Field>
                            <Field
                                label={isEdit ? "Đổi mật khẩu" : "Mật khẩu"}
                                hint={isEdit ? "Để trống nếu không muốn đổi mật khẩu" : undefined}
                            >
                                <input
                                    type="password"
                                    className="elp-input"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Tối thiểu 6 ký tự"
                                    autoComplete="new-password"
                                />
                            </Field>
                            <Field label="Giới tính">
                                <div className="elp-select-wrap">
                                    <select
                                        className="elp-input elp-select"
                                        value={form.gender}
                                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                    >
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                    <ChevronDown size={15} className="elp-select-caret" />
                                </div>
                            </Field>
                            {isAdmin ? (
                                <Field label="Vai trò">
                                    <div className="elp-select-wrap">
                                        <select
                                            className="elp-input elp-select"
                                            value={form.roleId}
                                            onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r.roleId} value={r.roleId}>
                                                    {r.roleName}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="elp-select-caret" />
                                    </div>
                                </Field>
                            ) : (
                                isEdit && (
                                    <Field label="Vai trò" hint="Chỉ Admin mới có quyền thay đổi">
                                        <div className="elp-readonly">
                                            {ROLES.find((r) => r.roleId === form.roleId)?.roleName || "—"}
                                        </div>
                                    </Field>
                                )
                            )}
                        </div>

                        <Field label="Chi nhánh phụ trách">
                            <div className="elp-branches" style={{ gap: 8 }}>
                                {branches.map((b) => {
                                    const checked = form.branchIds.includes(b.branchId);
                                    return (
                                        <button
                                            type="button"
                                            key={b.branchId}
                                            onClick={() => toggleBranch(b.branchId)}
                                            className={`elp-branch-toggle ${checked ? "elp-branch-toggle-active" : ""}`}
                                        >
                                            {checked && <Check size={14} />}
                                            <MapPin size={13} />
                                            {b.branchName}
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>

                        {error && <p className="elp-error">{error}</p>}

                        <div className="elp-form-actions">
                            <button onClick={onBack} className="btn btn-outline">
                                Hủy
                            </button>
                            <button onClick={submit} disabled={saving} className="btn btn-primary">
                                {saving && <Loader2 size={14} className="spin" />}
                                {isEdit ? "Lưu thay đổi" : "Tạo nhân viên"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================================
   ROOT — điều hướng giữa Danh sách / Sửa / Thêm.
   editingId chỉ được set đúng 1 lần tại thời điểm bấm nút của hàng đó,
   tương đương việc chuyển route sang /employee/edit/{id}.
   ============================================================================ */

export default function EmployeeListPage() {
    const [route, setRoute] = useState({ name: "list" }); // {name:'list'} | {name:'edit', id} | {name:'create'}
    const [boot, setBoot] = useState({ status: "loading" });

    useEffect(() => {
        (async () => {
            try {
                // Lưu ý QUAN TRỌNG: authApi.get() dùng fetch thuần và trả THẲNG
                // dữ liệu JSON đã parse (vd { employeeId, fullName, role, branches })
                // — KHÔNG bọc trong { data: ... } như axios. Trước đây code đọc
                // profileRes.data.branches khiến branches luôn là undefined và
                // ném lỗi, làm màn hình rơi vào trạng thái boot "error".
                const profile = await managerApi.getEmployeeProfile();
                const myBranches = profile.branches || [];
                let branches = myBranches;

                // BE hiện chưa có endpoint GET /api/branches riêng, nên với Admin ta
                // suy ra danh sách đầy đủ chi nhánh bằng cách gộp từ toàn bộ nhân viên
                // đang có (Admin thấy hết nhân viên nên cũng thấy hết chi nhánh có người).
                if (profile.role === "Admin") {
                    try {
                        const employeeList = await managerApi.getListEmployees({});
                        const map = new Map();
                        (employeeList || []).forEach((e) => e.branches.forEach((b) => map.set(b.branchId, b)));
                        if (map.size > 0) branches = Array.from(map.values()).sort((a, b) => a.branchId - b.branchId);
                    } catch {
                        // Không lấy được cũng không sao — vẫn cho vào app, chỉ là bộ lọc/chọn chi nhánh sẽ rỗng.
                    }
                }

                setBoot({
                    status: "ready",
                    currentRole: profile.role,
                    myBranches,
                    branches,
                });
            } catch (err) {
                setBoot({
                    status: "error",
                    message: err?.data?.message || err?.message || "Không tải được dữ liệu ban đầu. Vui lòng thử lại.",
                });
            }
        })();
    }, []);

    if (boot.status === "loading") {
        return (
            <div className="elp-boot">
                <style>{styles}</style>
                <Loader2 size={16} className="spin" />
                Đang tải dữ liệu...
            </div>
        );
    }

    if (boot.status === "error") {
        return (
            <div className="elp-boot-error">
                <style>{styles}</style>
                <p>{boot.message}</p>
            </div>
        );
    }

    const isAdmin = boot.currentRole === "Admin";
    // Manager chỉ được gán nhân viên vào chi nhánh mình đang phụ trách (khớp
    // với luật ở EmployeeService.EnsureCanManageTargetAsync bên BE); Admin
    // được chọn trong toàn bộ danh sách chi nhánh.
    const formBranches = isAdmin ? boot.branches : boot.myBranches;

    if (route.name === "edit") {
        return (
            <EmployeeFormView
                employeeId={route.id}
                branches={formBranches}
                currentRole={boot.currentRole}
                onBack={() => setRoute({ name: "list" })}
                onSaved={() => setRoute({ name: "list" })}
            />
        );
    }

    if (route.name === "create") {
        return (
            <EmployeeFormView
                employeeId={null}
                branches={formBranches}
                currentRole={boot.currentRole}
                onBack={() => setRoute({ name: "list" })}
                onSaved={() => setRoute({ name: "list" })}
            />
        );
    }

    return (
        <EmployeeListView
            branches={boot.branches}
            onEdit={(id) => setRoute({ name: "edit", id })}
            onCreate={() => setRoute({ name: "create" })}
        />
    );
}