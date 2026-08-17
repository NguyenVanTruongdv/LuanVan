import {
    ArrowLeft,
    Calendar,
    Check,
    ChevronDown,
    History,
    Loader2,
    Lock,
    MapPin,
    Pencil,
    Plus,
    Users,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

// Nhãn tiếng Việt cho FieldName trong bảng employee_update_logs (BE trả về đúng tên field gốc).
const FIELD_LABELS = {
    FullName: "Họ và tên",
    Phone: "Số điện thoại liên hệ",
    Gender: "Giới tính",
    RoleId: "Vai trò",
    Status: "Trạng thái làm việc",
    Branches: "Chi nhánh phụ trách",
    LoginEmail: "Email đăng nhập",
    Password: "Mật khẩu",
    AccountStatus: "Trạng thái tài khoản",
};

function fieldLabel(fieldName) {
    return FIELD_LABELS[fieldName] || fieldName;
}

// Các field thuộc nhóm "tài khoản đăng nhập" — dùng để gắn tag màu tím cho
// mỗi phiên cập nhật trong lịch sử. Field còn lại mặc định thuộc nhóm
// "thông tin cá nhân" (tag màu xanh lá).
const ACCOUNT_FIELDS = new Set(["LoginEmail", "Password", "AccountStatus"]);

function sessionTag(changes) {
    const isAccountChange = (changes || []).some((c) => ACCOUNT_FIELDS.has(c.fieldName));
    return isAccountChange
        ? { label: "Cập nhật tài khoản", icon: Lock, variant: "account" }
        : { label: "Cập nhật thông tin", icon: Pencil, variant: "personal" };
}

function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN");
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
   PLAIN CSS — tông màu ĐỒNG BỘ với sidebar / trang danh sách.
   Mỗi card (Thông tin cá nhân / Tài khoản) có 1 màu nhấn riêng
   (viền trên + đổ bóng màu) để dễ phân biệt khi xếp cạnh nhau.
   ============================================================================ */

const styles = `
  * { box-sizing: border-box; }

  .elp-page {
    --elp-accent: #10B981;
    --elp-accent-dark: #059669;
    --elp-accent-bg: #ECFDF5;
    --elp-accent-border: #A7F3D0;

    --elp-account: #8B5CF6;
    --elp-account-dark: #7C3AED;
    --elp-account-bg: #F5F3FF;
    --elp-account-border: #DDD6FE;

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

  .elp-wrap-narrow { margin: 0 auto; max-width: 672px; }
  .elp-wrap-wide { max-width: 960px; }

  .elp-title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }
  .elp-subtitle { font-size: 14px; color: #64748B; margin: 2px 0 0; }
  .elp-top-bar {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .elp-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    border: none;
    background: var(--elp-account);
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 16px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  .elp-back-btn:hover {
    background: var(--elp-account-dark);
    box-shadow: 0 6px 18px rgba(139, 92, 246, 0.45);
    transform: translateY(-1px);
  }
  .elp-history-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    border: 1px solid var(--elp-account-border);
    background: var(--elp-account-bg);
    color: var(--elp-account-dark);
    font-size: 14px;
    font-weight: 600;
    padding: 10px 16px;
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  .elp-history-btn:hover {
    background: #EDE9FE;
    transform: translateY(-1px);
  }

  /* Modal Lịch sử cập nhật — theo mẫu: overlay tối, card trắng bo góc lớn,
     danh sách các phiên cập nhật là card nền xanh nhạt xếp dọc. */
  .elp-history-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.5);
    padding: 16px;
  }
  .elp-history-modal {
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    background: #FFFFFF;
    box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.35);
    overflow: hidden;
  }
  .elp-history-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 12px;
    flex-shrink: 0;
  }
  .elp-history-modal-head h3 { margin: 0; font-size: 18px; font-weight: 700; color: #0F172A; }
  .elp-modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  .elp-modal-close:hover { color: #0F172A; background: #F1F5F9; }

  .elp-history-list {
    overflow-y: auto;
    padding: 4px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .elp-history-loading, .elp-history-empty {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #64748B;
    padding: 24px 0;
    justify-content: center;
  }

  .elp-history-card {
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .elp-history-card--personal { background: var(--elp-accent-bg); border: 1px solid var(--elp-accent-border); }
  .elp-history-card--account { background: var(--elp-account-bg); border: 1px solid var(--elp-account-border); }

  .elp-history-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .elp-history-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 700;
  }
  .elp-history-tag--personal { background: #FFFFFF; color: var(--elp-accent-dark); }
  .elp-history-tag--account { background: #FFFFFF; color: var(--elp-account-dark); }
  .elp-history-time { font-size: 12px; color: #64748B; white-space: nowrap; }

  .elp-history-actor { margin: 0; font-size: 13px; font-weight: 700; color: #0F172A; }

  .elp-history-changes { display: flex; flex-direction: column; gap: 3px; }
  .elp-history-change-row { font-size: 13px; color: #334155; }
  .elp-history-change-field { font-weight: 600; margin-right: 4px; color: #0F172A; }
  .elp-history-change-old {
    color: #94A3B8;
    text-decoration: line-through;
    margin-right: 4px;
  }
  .elp-history-change-new { color: #0F172A; font-weight: 600; }

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
  .btn-danger {
    background: var(--elp-danger);
    color: #FFFFFF;
    padding: 10px 16px;
  }
  .btn-danger:hover:not(:disabled) { background: var(--elp-danger-dark); }

  .spin { animation: elp-spin 0.8s linear infinite; }
  @keyframes elp-spin { to { transform: rotate(360deg); } }

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

  .elp-modal-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }

  /* 2 card xếp cạnh nhau (thông tin / tài khoản) */
  .elp-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 720px) {
    .elp-cards { grid-template-columns: 1fr; }
  }

  .elp-form-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 16px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    padding: 80px 0;
    font-size: 14px;
    color: #64748B;
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
    color: #64748B;
  }
  .elp-field-hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #94A3B8;
  }
  .elp-readonly {
    display: flex;
    align-items: center;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    padding: 10px 14px;
    font-size: 14px;
    color: #64748B;
  }

  .elp-branch-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #64748B;
    font-size: 14px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .elp-branch-toggle:hover { background: #F8FAFC; }
  .elp-branch-toggle-active {
    border-color: var(--elp-accent);
    background: var(--elp-accent-bg);
    color: var(--elp-accent-dark);
  }

  .elp-error {
    margin: 0;
    border-radius: 12px;
    border: 1px solid var(--elp-danger-border);
    background: var(--elp-danger-bg);
    padding: 10px 14px;
    font-size: 14px;
    color: var(--elp-danger-dark);
  }
  .elp-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }

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

  /* Trang xem chi tiết */
  .elp-detail-head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .elp-meta-row {
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    font-size: 12px;
    color: #64748B;
  }
  .elp-meta-item { display: inline-flex; align-items: center; gap: 6px; }
  .elp-meta-item strong { font-weight: 600; color: #334155; }
  .elp-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .elp-detail-label { margin: 0 0 4px; font-size: 12px; color: #64748B; }
  .elp-detail-value { margin: 0; font-size: 14px; color: #0F172A; }

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

  /* Mỗi khối là 1 card riêng: thông tin cá nhân / tài khoản.
     Viền trên + đổ bóng đổi màu theo elp-card--* để phân biệt nhanh giữa các cột. */
  .elp-card {
    border-radius: 16px;
    border: 2px solid #E2E8F0;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  }
  .elp-card:hover {
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
    transform: translateY(-3px);
  }
  .elp-card--personal {
    border-color: var(--elp-accent);
    box-shadow: 0 12px 36px rgba(16, 185, 129, 0.30);
  }
  .elp-card--personal:hover { box-shadow: 0 20px 52px rgba(16, 185, 129, 0.38); }
  .elp-card--account {
    border-color: var(--elp-account);
    box-shadow: 0 12px 36px rgba(139, 92, 246, 0.30);
  }
  .elp-card--account:hover { box-shadow: 0 20px 52px rgba(139, 92, 246, 0.38); }

  .elp-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .elp-card-head-left { display: flex; align-items: center; gap: 10px; }
  .elp-card-icon {
    display: flex;
    height: 32px;
    width: 32px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: var(--elp-accent-bg);
    color: var(--elp-accent-dark);
  }
  .elp-card-icon--personal { background: var(--elp-accent-bg); color: var(--elp-accent-dark); }
  .elp-card-icon--account { background: var(--elp-account-bg); color: var(--elp-account-dark); }

  .elp-card-title { margin: 0; font-size: 15px; font-weight: 600; color: #0F172A; }
  .elp-round-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid var(--elp-accent-border);
    background: var(--elp-accent-bg);
    color: var(--elp-accent-dark);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .elp-round-btn:hover { background: #D1FAE5; }
  .elp-round-btn:disabled { opacity: 0.5; cursor: default; }
  .elp-round-btn-danger {
    border: 1px solid var(--elp-danger-border);
    background: var(--elp-danger-bg);
    color: var(--elp-danger-dark);
  }
  .elp-round-btn-danger:hover { background: #FEE2E2; }
  .elp-account-empty { margin: 0; font-size: 13px; color: #94A3B8; }
  .elp-card-form { display: flex; flex-direction: column; gap: 12px; }
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
   MODAL — LỊCH SỬ CẬP NHẬT
   Mỗi phiên cập nhật hiển thị dạng card: tag loại thay đổi (xanh lá = thông
   tin cá nhân, tím = tài khoản đăng nhập), thời gian, người thực hiện, và
   danh sách field đã đổi (giá trị cũ gạch ngang -> giá trị mới).
   ============================================================================ */

function UpdateHistoryModal({ onClose, loading, error, items }) {
    return (
        <div className="elp-history-overlay" onClick={onClose}>
            <div className="elp-history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="elp-history-modal-head">
                    <h3>Lịch sử cập nhật</h3>
                    <button onClick={onClose} className="elp-modal-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="elp-history-list">
                    {loading && (
                        <div className="elp-history-loading">
                            <Loader2 size={14} className="spin" />
                            Đang tải lịch sử cập nhật...
                        </div>
                    )}

                    {!loading && error && <p className="elp-error">{error}</p>}

                    {!loading && !error && items && items.length === 0 && (
                        <div className="elp-history-empty">Chưa có lịch sử cập nhật cho nhân viên này.</div>
                    )}

                    {!loading &&
                        !error &&
                        items &&
                        items.map((item) => {
                            const tag = sessionTag(item.changes);
                            const TagIcon = tag.icon;
                            return (
                                <div key={item.updateSessionId} className={`elp-history-card elp-history-card--${tag.variant}`}>
                                    <div className="elp-history-card-top">
                                        <span className={`elp-history-tag elp-history-tag--${tag.variant}`}>
                                            <TagIcon size={12} />
                                            {tag.label}
                                        </span>
                                        <span className="elp-history-time">{formatDateTime(item.updatedAt)}</span>
                                    </div>

                                    <p className="elp-history-actor">{item.updatedByName || "Hệ thống"}</p>

                                    <div className="elp-history-changes">
                                        {item.changes.map((change, idx) => (
                                            <div key={`${item.updateSessionId}-${idx}`} className="elp-history-change-row">
                                                <span className="elp-history-change-field">{fieldLabel(change.fieldName)}:</span>
                                                {change.oldValue && (
                                                    <>
                                                        <span className="elp-history-change-old">{change.oldValue}</span>
                                                        <span> → </span>
                                                    </>
                                                )}
                                                <span className="elp-history-change-new">{change.newValue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   CARD 1 — THÔNG TIN CÁ NHÂN (cột 1 — màu xanh lá)
   Gọi adminApi.updateEmployeeAccountInfo — PUT /api/employee/{id}/account-info
   (đúng luồng ACCOUNT, không đụng FaceID).
   ============================================================================ */

function PersonalInfoCard({ employeeId, profile, branches, isAdmin, onChanged }) {
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
            await adminApi.updateEmployeeAccountInfo(employeeId, {
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
        <div className="elp-card elp-card--personal">
            <div className="elp-card-head">
                <div className="elp-card-head-left">
                    <div className="elp-card-icon elp-card-icon--personal">
                        <Users size={16} />
                    </div>
                    <h3 className="elp-card-title">Thông tin cá nhân</h3>
                </div>
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
                <div className="elp-card-form">
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
   CARD 2 — TÀI KHOẢN ĐĂNG NHẬP (cột 2 — màu tím)
   Nút Khóa/Mở khóa tách biệt với form sửa email/mật khẩu. Khóa tài khoản
   giờ chỉ cần xác nhận, KHÔNG còn nhập lý do khóa.
   ============================================================================ */

function AccountCard({ employeeId, profile, account, onChanged }) {
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
                // PUT /api/employee/{id}/account
                await adminApi.updateEmployeeAccount(employeeId, {
                    loginPhone: profile.phone,
                    loginEmail: form.loginEmail.trim() || null,
                    newPassword: form.password.trim() || undefined,
                });
            } else {
                // POST /api/employee/{id}/account
                await adminApi.addEmployeeAccount(employeeId, {
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
        <div className="elp-card elp-card--account">
            <div className="elp-card-head">
                <div className="elp-card-head-left">
                    <div className="elp-card-icon elp-card-icon--account">
                        <Lock size={16} />
                    </div>
                    <h3 className="elp-card-title">Tài khoản đăng nhập hệ thống</h3>
                </div>
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

            {!editing && (
                <>
                    {hasAccount ? (
                        <div className="elp-detail-grid">
                            <div>
                                <p className="elp-detail-label">Email</p>
                                <p className="elp-detail-value">{account.loginEmail || "—"}</p>
                            </div>
                            <div>
                                <p className="elp-detail-label">Trạng thái</p>
                                <StatusBadge status={account.accountStatus} />
                            </div>
                        </div>
                    ) : (
                        <p className="elp-account-empty">Nhân viên chưa có tài khoản đăng nhập hệ thống.</p>
                    )}
                </>
            )}

            {editing && (
                <div className="elp-card-form">
                    <p className="elp-field-hint" style={{ margin: 0 }}>
                        SĐT đăng nhập dùng chung với số điện thoại liên hệ ở card "Thông tin cá nhân" ({profile.phone}).
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
   NỘI DUNG CHẾ ĐỘ XEM/SỬA — nhân viên đã tồn tại (2 card xếp cạnh nhau)
   Gọi adminApi.getEmployeeAccountProfile — GET /api/employee/{id}/account
   (hồ sơ info + login của nhân viên thuộc luồng ACCOUNT).
   Profile kỳ vọng có thêm 3 field: createdAt, createdBy, updatedAt.
   ============================================================================ */

function ExistingEmployeeContent({ employeeId, branches, isAdmin }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await adminApi.getEmployeeAccountProfile(employeeId);
            const data = res?.data ?? res;
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

    if (loading) {
        return (
            <div className="elp-form-loading">
                <Loader2 size={16} className="spin" />
                Đang tải thông tin...
            </div>
        );
    }

    if (loadError) {
        return <div className="elp-form-loading" style={{ color: "#DC2626" }}>{loadError}</div>;
    }

    return (
        <>
            <div className="elp-detail-head">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={profile.fullName} />
                    <div>
                        <h1 className="elp-title">{profile.fullName}</h1>
                        <p className="elp-subtitle">
                            {roleLabel(profile.role)} · Mã NV #{profile.employeeId}
                        </p>
                    </div>
                </div>
            </div>

            <div className="elp-meta-row">
                <span className="elp-meta-item">
                    <Calendar size={13} />
                    Ngày tạo: <strong>{formatDateTime(profile.createdAt)}</strong>
                </span>
                <span className="elp-meta-item">
                    <Users size={13} />
                    Người tạo: <strong>{profile.createdBy || "—"}</strong>
                </span>
                <span className="elp-meta-item">
                    <History size={13} />
                    Cập nhật lần cuối: <strong>{formatDateTime(profile.updatedAt)}</strong>
                </span>
            </div>

            <div className="elp-cards">
                <PersonalInfoCard
                    employeeId={profile.employeeId}
                    profile={profile}
                    branches={branches}
                    isAdmin={isAdmin}
                    onChanged={fetchProfile}
                />

                <AccountCard
                    employeeId={profile.employeeId}
                    profile={profile}
                    account={
                        profile.accountId
                            ? {
                                accountId: profile.accountId,
                                loginPhone: profile.loginPhone,
                                loginEmail: profile.loginEmail,
                                accountStatus: profile.accountStatus,
                            }
                            : null
                    }
                    onChanged={fetchProfile}
                />
            </div>
        </>
    );
}

/* ============================================================================
   ROOT TRANG CHI TIẾT
   Route: /employees/new  -> điều hướng sang trang tạo tài khoản riêng
          /employees/:employeeId -> chế độ xem/sửa
   Tự fetch profile hiện tại (để biết isAdmin) + danh sách chi nhánh dùng cho form.

   LƯU Ý: BE hiện chỉ có 2 luồng tạo nhân viên — POST with-account (bắt buộc
   email/mật khẩu ngay lúc tạo) hoặc POST with-faceid (bắt buộc ảnh) — không
   còn endpoint "tạo info trước, thêm tài khoản sau" như bản cũ. Vì trang này
   thuộc luồng ACCOUNT, khi vào chế độ tạo mới sẽ điều hướng thẳng sang trang
   tạo tài khoản (CreateAccountPage) thay vì hiển thị form tạo tại chỗ.
   ============================================================================ */

export default function AccountsystemDetailOfAdmin() {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const isCreateMode = !employeeId || employeeId === "new";

    const [boot, setBoot] = useState({ status: "loading" });
    // Modal lịch sử cập nhật nhân viên — gọi adminApi.getEmployeeUpdateHistory khi mở modal.
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyItems, setHistoryItems] = useState(null);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError("");
        try {
            const res = await adminApi.getEmployeeUpdateHistory(employeeId);
            const data = res?.data ?? res;
            setHistoryItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setHistoryError(err?.data?.message || err?.message || "Không tải được lịch sử cập nhật.");
        } finally {
            setHistoryLoading(false);
        }
    }, [employeeId]);

    const openHistory = () => {
        setHistoryOpen(true);
        if (historyItems === null) {
            loadHistory();
        }
    };

    // Đổi sang xem nhân viên khác thì reset lại modal lịch sử.
    useEffect(() => {
        setHistoryOpen(false);
        setHistoryItems(null);
        setHistoryError("");
    }, [employeeId]);

    // Chế độ tạo mới đã chuyển hẳn sang trang riêng (bắt buộc tài khoản đăng
    // nhập ngay lúc tạo theo đúng route POST /api/employee/with-account).
    useEffect(() => {
        if (isCreateMode) {
            navigate("/admin/employees/system/create", { replace: true });
        }
    }, [isCreateMode, navigate]);

    useEffect(() => {
        if (isCreateMode) return;
        (async () => {
            try {
                const [meRes, rawBranches] = await Promise.all([
                    adminApi.getEmployeeProfile(),
                    adminApi.getBranches(),
                ]);
                const myProfile = meRes?.data ?? meRes;
                const allBranches = extractList(rawBranches);

                setBoot({
                    status: "ready",
                    currentRole: myProfile.role,
                    myBranches: myProfile.branches || [],
                    branches: allBranches,
                });
            } catch (err) {
                setBoot({
                    status: "error",
                    message: err?.data?.message || err?.message || "Không tải được dữ liệu ban đầu. Vui lòng thử lại.",
                });
            }
        })();
    }, [isCreateMode]);

    if (isCreateMode) {
        return (
            <div className="elp-boot">
                <style>{styles}</style>
                <Loader2 size={16} className="spin" />
                Đang chuyển sang trang tạo nhân viên...
            </div>
        );
    }

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
    const formBranches = isAdmin ? boot.branches : boot.myBranches;

    return (
        <div className="elp-page">
            <style>{styles}</style>
            <div className="elp-wrap-narrow elp-wrap-wide">
                <div className="elp-top-bar">
                    <button onClick={() => navigate("/admin/employees/system")} className="elp-back-btn">
                        <ArrowLeft size={16} />
                        Quay lại danh sách
                    </button>

                    <button type="button" onClick={openHistory} className="elp-history-btn">
                        <History size={16} />
                        Lịch sử cập nhật
                    </button>
                </div>

                <ExistingEmployeeContent employeeId={employeeId} branches={formBranches} isAdmin={isAdmin} />
            </div>

            {historyOpen && (
                <UpdateHistoryModal
                    onClose={() => setHistoryOpen(false)}
                    loading={historyLoading}
                    error={historyError}
                    items={historyItems}
                />
            )}
        </div>
    );
}