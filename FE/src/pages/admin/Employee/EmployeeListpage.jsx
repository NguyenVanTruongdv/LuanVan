import {
    ArrowLeft,
    Check,
    ChevronDown,
    Eye,
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

/* ============================================================================
   PLAIN CSS — thay thế toàn bộ Tailwind utility classes.
   Bảng màu đồng bộ với trang login: nền navy đậm, panel slate, viền slate,
   điểm nhấn cyan, và bộ 3 màu chữ #F1F5F9 / #94A3B8 / #64748B.
   ============================================================================ */

const styles = `
  * { box-sizing: border-box; }

  .elp-page {
    min-height: 100vh;
    background: #0B1120;
    padding: 24px;
    color: #F1F5F9;
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
    background: rgba(6, 182, 212, 0.15);
    color: #06B6D4;
    flex-shrink: 0;
  }
  .elp-title { font-size: 20px; font-weight: 700; color: #F1F5F9; margin: 0; }
  .elp-subtitle { font-size: 14px; color: #94A3B8; margin: 2px 0 0; }
  .elp-back {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #94A3B8;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .elp-back:hover { color: #F1F5F9; }

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
    background: #06B6D4;
    color: #0B1120;
    padding: 10px 16px;
  }
  .btn-primary:hover:not(:disabled) { background: #22D3EE; }
  .btn-outline {
    background: transparent;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 10px 16px;
  }
  .btn-outline:hover:not(:disabled) { background: rgba(51, 65, 85, 0.4); }
  .btn-sm-outline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    border: 1px solid #334155;
    background: transparent;
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .btn-sm-outline:hover { background: rgba(51, 65, 85, 0.5); }
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
    border: 1px solid rgba(6, 182, 212, 0.3);
    background: transparent;
    color: #06B6D4;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }
  .btn-sm-unlock:hover:not(:disabled) { background: rgba(6, 182, 212, 0.1); }
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
    border: 1px solid #334155;
    background: #1E293B;
    padding: 12px;
  }
  .elp-search { position: relative; min-width: 240px; flex: 1; }
  .elp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748B;
    pointer-events: none;
  }
  .elp-input {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #334155;
    background: rgba(11, 17, 32, 0.6);
    padding: 10px 14px;
    font-size: 14px;
    color: #F1F5F9;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .elp-input::placeholder { color: #64748B; }
  .elp-input:focus {
    border-color: rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
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
    color: #64748B;
    pointer-events: none;
  }

  .elp-count { margin-bottom: 12px; font-size: 14px; color: #94A3B8; }
  .elp-count strong { font-weight: 600; color: #F1F5F9; }

  /* Table */
  .elp-table {
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid #334155;
    background: #1E293B;
  }
  .elp-row-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1.4fr 1fr 1.2fr;
    gap: 16px;
  }
  .elp-thead {
    border-bottom: 1px solid #334155;
    background: rgba(15, 23, 42, 0.4);
    padding: 12px 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94A3B8;
  }
  .elp-th-right { text-align: right; }
  .elp-trow {
    align-items: center;
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    padding: 16px 20px;
    transition: background-color 0.15s ease;
  }
  .elp-trow:last-child { border-bottom: none; }
  .elp-trow:hover { background: rgba(51, 65, 85, 0.25); }
  .elp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 64px 0;
    font-size: 14px;
    color: #94A3B8;
  }
  .elp-empty-static {
    padding: 64px 0;
    text-align: center;
    font-size: 14px;
    color: #64748B;
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
    background: linear-gradient(to bottom right, #22D3EE, #0891B2);
    font-size: 14px;
    font-weight: 700;
    color: #0B1120;
    overflow: hidden;
  }
  .elp-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .elp-emp-name {
    margin: 0;
    font-weight: 600;
    color: #F1F5F9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .elp-emp-phone { margin: 0; font-size: 12px; color: #64748B; }
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
    background: rgba(51, 65, 85, 0.5);
    padding: 2px 8px;
    font-size: 12px;
    color: #94A3B8;
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
  .elp-badge-active { background: rgba(6, 182, 212, 0.15); color: #06B6D4; }
  .elp-badge-suspended { background: rgba(244, 63, 94, 0.15); color: #fda4af; }
  .elp-dot { height: 6px; width: 6px; border-radius: 999px; }
  .elp-dot-active { background: #06B6D4; }
  .elp-dot-suspended { background: #fb7185; }

  .elp-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }

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
    border: 1px solid #334155;
    background: #1E293B;
    padding: 20px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  }
  .elp-modal-head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .elp-modal-head h3 { margin: 0; font-weight: 600; color: #F1F5F9; }
  .elp-modal-close {
    background: none;
    border: none;
    color: #64748B;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .elp-modal-close:hover { color: #F1F5F9; }
  .elp-modal-desc { margin: 0 0 16px; font-size: 14px; color: #94A3B8; }
  .elp-modal-desc strong { font-weight: 500; color: #F1F5F9; }
  .elp-textarea {
    width: 100%;
    resize: vertical;
    border-radius: 12px;
    border: 1px solid #334155;
    background: rgba(11, 17, 32, 0.6);
    padding: 10px 14px;
    font-size: 14px;
    color: #F1F5F9;
    outline: none;
    font-family: inherit;
  }
  .elp-textarea::placeholder { color: #64748B; }
  .elp-textarea:focus {
    border-color: rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
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
    border: 1px solid #334155;
    background: #1E293B;
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
    border: 1px solid #334155;
    background: #1E293B;
    padding: 80px 0;
    font-size: 14px;
    color: #94A3B8;
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
    color: #94A3B8;
  }
  .elp-field-hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #64748B;
  }
  .elp-readonly {
    display: flex;
    align-items: center;
    border-radius: 12px;
    border: 1px solid rgba(51, 65, 85, 0.4);
    background: rgba(15, 23, 42, 0.4);
    padding: 10px 14px;
    font-size: 14px;
    color: #94A3B8;
  }

  .elp-branch-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    border: 1px solid #334155;
    background: transparent;
    color: #94A3B8;
    font-size: 14px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .elp-branch-toggle:hover { background: rgba(51, 65, 85, 0.4); }
  .elp-branch-toggle-active {
    border-color: rgba(6, 182, 212, 0.5);
    background: rgba(6, 182, 212, 0.15);
    color: #06B6D4;
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
    background: #0B1120;
    color: #94A3B8;
    font-size: 14px;
  }
  .elp-boot-error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #0B1120;
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

  /* File input (upload ảnh FaceID) */
  .elp-file-input {
    width: 100%;
    border-radius: 12px;
    border: 1px dashed #334155;
    background: rgba(11, 17, 32, 0.6);
    padding: 10px 14px;
    font-size: 13px;
    color: #94A3B8;
  }

  /* Trang xem chi tiết */
  .elp-detail-head {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .elp-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .elp-detail-label { margin: 0 0 4px; font-size: 12px; color: #94A3B8; }
  .elp-detail-value { margin: 0; font-size: 14px; color: #F1F5F9; }

  /* Khối thông tin cá nhân / tài khoản đăng nhập + nút tròn thêm/sửa */
  .elp-section-box {
    border-radius: 12px;
    border: 1px solid #334155;
    background: rgba(15, 23, 42, 0.4);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .elp-section-head { display: flex; align-items: center; justify-content: space-between; }
  .elp-section-title { margin: 0; font-size: 14px; font-weight: 600; color: #F1F5F9; }
  .elp-round-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid rgba(6, 182, 212, 0.4);
    background: rgba(6, 182, 212, 0.12);
    color: #06B6D4;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .elp-round-btn:hover { background: rgba(6, 182, 212, 0.25); }
  .elp-account-empty { margin: 0; font-size: 13px; color: #64748B; }
  .elp-section-form { display: flex; flex-direction: column; gap: 12px; }
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
   Đã bỏ nút "Sửa" ở mỗi hàng — sửa thông tin nhân viên giờ thực hiện ngay
   trong trang Xem chi tiết (nút tròn cạnh từng khối thông tin), nên danh sách
   chỉ còn 2 thao tác: Xem và Khóa/Mở khóa.
   ============================================================================ */

function EmployeeListView({ branches, onView, onCreate }) {
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
                                    <button onClick={() => onView(emp.employeeId)} className="btn-sm-outline">
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
   KHỐI THÔNG TIN CÁ NHÂN — thay thế trang "Sửa" riêng cũ.
   Hiển thị Họ tên / SĐT liên hệ / Giới tính / Vai trò / Chi nhánh, có nút tròn
   bút chì để sửa ngay tại chỗ (giống khối tài khoản đăng nhập bên dưới).
   Gọi PUT /api/employee/{id} (UpdateEmployeeDto — không có Email/Password).
   Vai trò: chỉ Admin mới sửa được (khớp EmployeeService — Manager không có
   quyền điều chỉnh vai trò dưới mọi hình thức, kể cả role_id giống nhau).
   Chi nhánh: dùng đúng danh sách chi nhánh được phép chọn (branches truyền
   vào từ ngoài) — Admin chọn trong toàn bộ chi nhánh, Manager chỉ chọn trong
   chi nhánh mình đang phụ trách.
   ============================================================================ */

function PersonalInfoSection({ employeeId, profile, branches, isAdmin, onChanged }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ fullName: "", phone: "", gender: "Nam", roleId: null, branchIds: [] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const currentRoleId = ROLES.find((r) => r.roleName === profile.role)?.roleId ?? null;

    const openForm = () => {
        setForm({
            fullName: profile.fullName,
            phone: profile.phone,
            gender: profile.gender,
            roleId: currentRoleId,
            branchIds: profile.branches.map((b) => b.branchId),
        });
        setError("");
        setEditing(true);
    };

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
        setSaving(true);
        try {
            await managerApi.updateEmployee(employeeId, {
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                gender: form.gender,
                roleId: form.roleId,
                branchIds: form.branchIds,
            });
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err?.data?.message || err?.message || "Lưu thông tin nhân viên thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="elp-section-box">
            <div className="elp-section-head">
                <h3 className="elp-section-title">Thông tin cá nhân</h3>
                {!editing && (
                    <button type="button" onClick={openForm} className="elp-round-btn" title="Sửa thông tin cá nhân">
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {!editing ? (
                <div className="elp-detail-grid">
                    <div>
                        <p className="elp-detail-label">Họ và tên</p>
                        <p className="elp-detail-value">{profile.fullName}</p>
                    </div>
                    <div>
                        <p className="elp-detail-label">Số điện thoại liên hệ</p>
                        <p className="elp-detail-value">{profile.phone}</p>
                    </div>
                    <div>
                        <p className="elp-detail-label">Giới tính</p>
                        <p className="elp-detail-value">{profile.gender}</p>
                    </div>
                    <div>
                        <p className="elp-detail-label">Vai trò</p>
                        <p className="elp-detail-value">{roleLabel(profile.role)}</p>
                    </div>
                    <div>
                        <p className="elp-detail-label">Trạng thái làm việc</p>
                        <StatusBadge status={profile.status} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <p className="elp-detail-label">Chi nhánh phụ trách</p>
                        <div className="elp-branches">
                            {profile.branches.map((b) => (
                                <span key={b.branchId} className="elp-branch-tag">
                                    <MapPin size={10} />
                                    {b.branchName}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="elp-section-form">
                    <div className="elp-form-grid">
                        <Field label="Họ và tên">
                            <input
                                className="elp-input"
                                value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                placeholder="Nguyễn Văn A"
                            />
                        </Field>
                        <Field label="Số điện thoại liên hệ">
                            <input
                                className="elp-input"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="09xxxxxxxx"
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
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="elp-select-caret" />
                                </div>
                            </Field>
                        ) : (
                            <Field label="Vai trò" hint="Chỉ Admin mới có quyền thay đổi">
                                <div className="elp-readonly">{roleLabel(profile.role)}</div>
                            </Field>
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

                    <div className="elp-modal-actions" style={{ marginTop: 0 }}>
                        <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">
                            Hủy
                        </button>
                        <button type="button" onClick={submit} disabled={saving} className="btn btn-primary">
                            {saving && <Loader2 size={14} className="spin" />}
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================================
   KHỐI ẢNH FACEID — hiển thị ảnh đã đăng ký (nếu có) + nút tròn để đăng
   ký/đổi ảnh mới. Gọi PUT /api/employee/{id}/face (UpdateEmployeeFaceIdDto:
   bắt buộc ProfileImage, Reason tùy chọn) — dùng chung cho cả trường hợp
   nhân viên CHƯA có FaceID (đăng ký lần đầu) và ĐÃ có (đổi/đăng ký lại).
   ============================================================================ */

function FaceIdSection({ employeeId, profile, onChanged }) {
    const [editing, setEditing] = useState(false);
    const [file, setFile] = useState(null);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const openForm = () => {
        setFile(null);
        setReason("");
        setError("");
        setEditing(true);
    };

    const submit = async () => {
        setError("");
        if (!file) {
            setError("Vui lòng chọn ảnh để đăng ký/cập nhật FaceID.");
            return;
        }
        setSaving(true);
        try {
            await managerApi.updateEmployeeFace(employeeId, {
                profileImage: file,
                reason: reason.trim() || undefined,
            });
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err?.data?.message || err?.message || "Cập nhật FaceID thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="elp-section-box">
            <div className="elp-section-head">
                <h3 className="elp-section-title">Ảnh FaceID</h3>
                {!editing && (
                    <button
                        type="button"
                        onClick={openForm}
                        className="elp-round-btn"
                        title={profile.hasFaceId ? "Đổi ảnh FaceID" : "Đăng ký FaceID"}
                    >
                        {profile.hasFaceId ? <Pencil size={14} /> : <Plus size={16} />}
                    </button>
                )}
            </div>

            {!editing ? (
                profile.hasFaceId ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div className="elp-avatar" style={{ width: 64, height: 64 }}>
                            {profile.faceProfileImage ? (
                                <img src={profile.faceProfileImage} alt={profile.fullName} />
                            ) : (
                                <Check size={22} />
                            )}
                        </div>
                        <p className="elp-detail-value" style={{ margin: 0 }}>Đã đăng ký FaceID</p>
                    </div>
                ) : (
                    <p className="elp-account-empty">Nhân viên chưa đăng ký FaceID.</p>
                )
            ) : (
                <div className="elp-section-form">
                    <Field label="Ảnh khuôn mặt mới" hint="Bắt buộc — dùng để nhận diện khuôn mặt khi chấm công">
                        <input
                            type="file"
                            accept="image/*"
                            className="elp-file-input"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </Field>
                    <Field label="Lý do cập nhật" hint="Không bắt buộc">
                        <input
                            className="elp-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="VD: Đổi ảnh do khuôn mặt thay đổi, ảnh cũ mờ..."
                        />
                    </Field>

                    {error && <p className="elp-error">{error}</p>}

                    <div className="elp-modal-actions" style={{ marginTop: 0 }}>
                        <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">
                            Hủy
                        </button>
                        <button type="button" onClick={submit} disabled={saving} className="btn btn-primary">
                            {saving && <Loader2 size={14} className="spin" />}
                            {profile.hasFaceId ? "Lưu ảnh mới" : "Đăng ký FaceID"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================================
   KHỐI TÀI KHOẢN ĐĂNG NHẬP — chỉ còn Email + Mật khẩu.
   SĐT đăng nhập không còn là field riêng nhập tay ở đây nữa — dùng LUÔN số
   điện thoại liên hệ ở khối "Thông tin cá nhân" (profile.phone) làm SĐT đăng
   nhập, gửi ngầm xuống BE (AddEmployeeAccountDto/UpdateEmployeeAccountDto vẫn
   cần LoginPhone nên FE tự điền, người dùng không phải nhập lại).
   ============================================================================ */

function AccountSection({ employeeId, profile, account, onChanged }) {
    const hasAccount = !!account?.accountId;
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ loginEmail: "", password: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const openForm = () => {
        setForm({
            loginEmail: account?.loginEmail || "",
            password: "",
        });
        setError("");
        setEditing(true);
    };

    const submit = async () => {
        setError("");
        if (!hasAccount && form.password.trim().length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (hasAccount && form.password.trim() && form.password.trim().length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }
        setSaving(true);
        try {
            if (hasAccount) {
                await managerApi.updateEmployeeAccount(employeeId, {
                    loginPhone: profile.phone,
                    loginEmail: form.loginEmail.trim() || null,
                    newPassword: form.password.trim() || undefined,
                });
            } else {
                await managerApi.addEmployeeAccount(employeeId, {
                    loginPhone: profile.phone,
                    loginEmail: form.loginEmail.trim() || null,
                    password: form.password.trim(),
                });
            }
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err?.data?.message || err?.message || "Lưu tài khoản đăng nhập thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="elp-section-box">
            <div className="elp-section-head">
                <h3 className="elp-section-title">Tài khoản đăng nhập hệ thống</h3>
                {!editing && (
                    <button
                        type="button"
                        onClick={openForm}
                        className="elp-round-btn"
                        title={hasAccount ? "Sửa tài khoản đăng nhập" : "Thêm tài khoản đăng nhập"}
                    >
                        {hasAccount ? <Pencil size={14} /> : <Plus size={16} />}
                    </button>
                )}
            </div>

            {!editing ? (
                hasAccount ? (
                    <div className="elp-detail-grid">
                        <div>
                            <p className="elp-detail-label">Email</p>
                            <p className="elp-detail-value">{account.loginEmail || "—"}</p>
                        </div>
                        <div>
                            <p className="elp-detail-label">Trạng thái</p>
                            <StatusBadge status={account.accountStatus} />
                        </div>
                        {account.accountStatus !== "Active" && account.suspendReason && (
                            <div>
                                <p className="elp-detail-label">Lý do khóa</p>
                                <p className="elp-detail-value">{account.suspendReason}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="elp-account-empty">Nhân viên chưa có tài khoản đăng nhập hệ thống.</p>
                )
            ) : (
                <div className="elp-section-form">
                    <p className="elp-field-hint" style={{ margin: 0 }}>
                        SĐT đăng nhập dùng chung với số điện thoại liên hệ ở khối "Thông tin cá nhân" ({profile.phone}).
                    </p>
                    <Field label="Email">
                        <input
                            className="elp-input"
                            value={form.loginEmail}
                            onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
                            placeholder="email@vtgym.vn"
                        />
                    </Field>
                    <Field
                        label={hasAccount ? "Mật khẩu mới" : "Mật khẩu"}
                        hint={hasAccount ? "Để trống nếu không đổi mật khẩu" : "Tối thiểu 6 ký tự"}
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

                    {error && <p className="elp-error">{error}</p>}

                    <div className="elp-modal-actions" style={{ marginTop: 0 }}>
                        <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">
                            Hủy
                        </button>
                        <button type="button" onClick={submit} disabled={saving} className="btn btn-primary">
                            {saving && <Loader2 size={14} className="spin" />}
                            {hasAccount ? "Lưu thay đổi" : "Tạo tài khoản"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ============================================================================
   TRANG XEM CHI TIẾT NHÂN VIÊN — gọi thẳng GET /api/employee/{id}
   (EmployeeController.GetById / EmployeeProfileDto). Không còn nút "Sửa
   thông tin" ở đầu trang — sửa thông tin cá nhân và tài khoản đăng nhập đều
   thực hiện ngay tại chỗ qua 2 khối bên dưới (mỗi khối có nút tròn riêng).
   ============================================================================ */

function EmployeeDetailView({ employeeId, branches, isAdmin, onBack }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const data = await managerApi.getEmployeeDetail(employeeId);
            setProfile(data);
        } catch (err) {
            setLoadError(err?.data?.message || err?.message || "Không tải được thông tin nhân viên.");
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return (
        <div className="elp-page">
            <style>{styles}</style>
            <div className="elp-wrap-narrow">
                <button onClick={onBack} className="elp-back">
                    <ArrowLeft size={16} />
                    Quay lại danh sách
                </button>

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
                    <>
                        <div className="elp-detail-head">
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Avatar name={profile.fullName} imageUrl={profile.faceProfileImage} />
                                <div>
                                    <h1 className="elp-title">{profile.fullName}</h1>
                                    <p className="elp-subtitle">
                                        {roleLabel(profile.role)} · Mã NV #{profile.employeeId}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="elp-form-card">
                            <PersonalInfoSection
                                employeeId={profile.employeeId}
                                profile={profile}
                                branches={branches}
                                isAdmin={isAdmin}
                                onChanged={fetchProfile}
                            />

                            <FaceIdSection
                                employeeId={profile.employeeId}
                                profile={profile}
                                onChanged={fetchProfile}
                            />

                            <AccountSection
                                employeeId={profile.employeeId}
                                profile={profile}
                                account={
                                    profile.accountId
                                        ? {
                                            accountId: profile.accountId,
                                            loginPhone: profile.loginPhone,
                                            loginEmail: profile.loginEmail,
                                            accountStatus: profile.accountStatus,
                                            suspendReason: profile.suspendReason,
                                        }
                                        : null
                                }
                                onChanged={fetchProfile}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ============================================================================
   FORM THÊM NHÂN VIÊN MỚI
   BE bắt buộc ảnh để đăng ký FaceID ngay khi tạo (CreateEmployeeWithFaceIdDto
   [Required] ProfileImage) nên form thêm bắt buộc chọn ảnh; tài khoản đăng
   nhập được thêm sau ở trang Xem chi tiết (nút tròn +).
   Quản lý (Manager) tạo nhân viên thì role luôn là Staff — EmployeeService đã
   tự ép ở BE, nên FE không hiển thị ô chọn vai trò cho Manager, chỉ Admin
   mới thấy và được chọn vai trò tùy ý.
   ============================================================================ */

function EmployeeCreateView({ branches, isAdmin, onBack, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        gender: "Nam",
        roleId: ROLES.find((r) => r.roleName === "Staff").roleId,
        branchIds: [],
        profileImage: null,
    });

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
        if (!form.profileImage) {
            setError("Vui lòng chọn ảnh để đăng ký FaceID cho nhân viên.");
            return;
        }
        setSaving(true);
        try {
            const created = await managerApi.createEmployeeWithFaceId({
                fullName: form.fullName,
                phone: form.phone,
                gender: form.gender,
                roleId: form.roleId,
                branchIds: form.branchIds,
                profileImage: form.profileImage,
            });
            onSaved(created.employeeId);
        } catch (err) {
            setError(err?.data?.message || err?.message || "Tạo nhân viên thất bại.");
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
                        <Plus size={20} />
                    </div>
                    <div>
                        <h1 className="elp-title">Thêm nhân viên mới</h1>
                    </div>
                </div>

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
                        <Field label="Số điện thoại liên hệ">
                            <input
                                className="elp-input"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="09xxxxxxxx"
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
                        {isAdmin && (
                            <Field label="Vai trò">
                                <div className="elp-select-wrap">
                                    <select
                                        className="elp-input elp-select"
                                        value={form.roleId}
                                        onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r.roleId} value={r.roleId}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="elp-select-caret" />
                                </div>
                            </Field>
                        )}
                        <Field label="Ảnh đăng ký FaceID" hint="Bắt buộc — dùng để nhận diện khuôn mặt khi chấm công">
                            <input
                                type="file"
                                accept="image/*"
                                className="elp-file-input"
                                onChange={(e) => setForm({ ...form, profileImage: e.target.files?.[0] || null })}
                            />
                        </Field>
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

                    {!isAdmin && (
                        <p className="elp-field-hint" style={{ margin: 0 }}>
                            Quản lý tạo nhân viên sẽ luôn có vai trò Lễ tân (Staff).
                        </p>
                    )}
                    <p className="elp-field-hint" style={{ margin: 0 }}>
                        Tài khoản đăng nhập hệ thống (email/mật khẩu) sẽ được thêm ở bước tiếp theo, ngay sau khi tạo xong.
                    </p>

                    {error && <p className="elp-error">{error}</p>}

                    <div className="elp-form-actions">
                        <button onClick={onBack} className="btn btn-outline">
                            Hủy
                        </button>
                        <button onClick={submit} disabled={saving} className="btn btn-primary">
                            {saving && <Loader2 size={14} className="spin" />}
                            Tạo nhân viên
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   ROOT — điều hướng giữa Danh sách / Xem / Thêm.
   Không còn route "edit" riêng — sửa thông tin cá nhân và tài khoản đăng
   nhập đều làm ngay trong trang Xem chi tiết.
   Danh sách chi nhánh gọi thẳng managerApi.getBranches() (GET /api/branches)
   thay vì suy luận gián tiếp từ danh sách nhân viên như trước.
   ============================================================================ */

export default function EmployeeListAdmin() {
    const [route, setRoute] = useState({ name: "list" }); // {name:'list'} | {name:'view', id} | {name:'create'}
    const [boot, setBoot] = useState({ status: "loading" });

    useEffect(() => {
        (async () => {
            try {
                // Lưu ý QUAN TRỌNG: authApi.get() dùng fetch thuần và trả THẲNG
                // dữ liệu JSON đã parse — KHÔNG bọc trong { data: ... } như axios.
                const [profile, rawBranches] = await Promise.all([
                    managerApi.getEmployeeProfile(),
                    managerApi.getBranches(),
                ]);

                // GET /api/branches có thể trả thẳng mảng, hoặc bọc trong
                // { data: [...] } / { items: [...] } tùy cách BE viết —
                // chuẩn hóa về mảng ở đây để tránh crash "branches.map is not a function".
                const allBranches = Array.isArray(rawBranches)
                    ? rawBranches
                    : rawBranches?.data || rawBranches?.items || rawBranches?.branches || [];

                setBoot({
                    status: "ready",
                    currentRole: profile.role,
                    myBranches: profile.branches || [],
                    branches: allBranches,
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
    // với luật ở EmployeeService.EnsureBranchScope bên BE); Admin được chọn
    // trong toàn bộ danh sách chi nhánh (gọi thẳng từ GET /api/branches).
    const formBranches = isAdmin ? boot.branches : boot.myBranches;

    if (route.name === "view") {
        return (
            <EmployeeDetailView
                employeeId={route.id}
                branches={formBranches}
                isAdmin={isAdmin}
                onBack={() => setRoute({ name: "list" })}
            />
        );
    }

    if (route.name === "create") {
        return (
            <EmployeeCreateView
                branches={formBranches}
                isAdmin={isAdmin}
                onBack={() => setRoute({ name: "list" })}
                onSaved={(id) => setRoute({ name: "view", id })}
            />
        );
    }

    return (
        <EmployeeListView
            branches={boot.branches}
            onView={(id) => setRoute({ name: "view", id })}
            onCreate={() => setRoute({ name: "create" })}
        />
    );
}