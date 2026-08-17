import {
    AlertTriangle,
    ArrowLeft,
    Check,
    ChevronDown,
    History,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    ScanFace,
    Users,
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
    FaceID: "Ảnh FaceID",
    LockReason: "Lý do khóa",
};

function fieldLabel(fieldName) {
    return FIELD_LABELS[fieldName] || fieldName;
}

/* ============================================================================
   PLAIN CSS — tông màu ĐỒNG BỘ với sidebar / trang danh sách.
   Mỗi card (Thông tin cá nhân / FaceID) có 1 màu nhấn riêng
   (viền trên + đổ bóng màu) để dễ phân biệt khi xếp cột.
   ============================================================================ */

const styles = `
  * { box-sizing: border-box; }

  .elp-page {
    --elp-accent: #10B981;
    --elp-accent-dark: #059669;
    --elp-accent-bg: #ECFDF5;
    --elp-accent-border: #A7F3D0;

    --elp-face: #3B82F6;
    --elp-face-dark: #2563EB;
    --elp-face-bg: #EFF6FF;
    --elp-face-border: #BFDBFE;

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
  @media (max-width: 380px) {
    .elp-page { padding: 14px; }
    .elp-card { padding: 16px 16px; }
  }

  .elp-wrap-narrow { margin: 0 auto; max-width: 672px; }
  .elp-wrap-wide { max-width: 900px; }

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
  @media (max-width: 480px) {
    .elp-top-bar { flex-direction: column; align-items: stretch; }
    .elp-back-btn, .elp-history-btn { justify-content: center; width: 100%; }
  }
  .elp-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    border: none;
    background: var(--elp-face);
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 16px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  .elp-back-btn:hover {
    background: var(--elp-face-dark);
    box-shadow: 0 6px 18px rgba(59, 130, 246, 0.45);
    transform: translateY(-1px);
  }
  .elp-history-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    border: 1px solid var(--elp-face-border);
    background: var(--elp-face-bg);
    color: var(--elp-face-dark);
    font-size: 14px;
    font-weight: 600;
    padding: 10px 16px;
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  .elp-history-btn:hover {
    background: #DBEAFE;
    transform: translateY(-1px);
  }
  .elp-history-panel {
    margin-bottom: 20px;
    border-radius: 12px;
    border: 1px solid var(--elp-face-border);
    background: var(--elp-face-bg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 360px;
    overflow-y: auto;
  }
  .elp-history-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--elp-face-dark);
  }
  .elp-history-empty { margin: 0; font-size: 13px; color: var(--elp-face-dark); }
  .elp-history-item {
    border-radius: 10px;
    background: #FFFFFF;
    border: 1px solid var(--elp-face-border);
    padding: 10px 14px;
  }
  .elp-history-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: #64748B;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .elp-history-time { font-weight: 600; color: var(--elp-face-dark); }
  .elp-history-changes { display: flex; flex-direction: column; gap: 4px; }
  .elp-history-change-row { font-size: 13px; color: #0F172A; }
  .elp-history-change-field { font-weight: 600; margin-right: 4px; }
  .elp-history-change-old {
    color: #94A3B8;
    text-decoration: line-through;
    margin-right: 4px;
  }
  .elp-history-change-new { color: var(--elp-face-dark); font-weight: 600; }

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

  .spin { animation: elp-spin 0.8s linear infinite; }
  @keyframes elp-spin { to { transform: rotate(360deg); } }

  .elp-input {
    width: 100%;
    border-radius: 12px;
    border: 1.5px solid #94A3B8;
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

  /* 2 cards xếp cạnh nhau (thông tin / faceid) */
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
    border: 1.5px solid #94A3B8;
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
    border: 1.5px solid #94A3B8;
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

  /* File input (upload ảnh FaceID) */
  .elp-file-input {
    width: 100%;
    border-radius: 12px;
    border: 1.5px dashed #94A3B8;
    background: #F8FAFC;
    padding: 10px 14px;
    font-size: 13px;
    color: #64748B;
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
  @media (max-width: 420px) {
    .elp-detail-grid { grid-template-columns: 1fr; }
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

  /* Mỗi khối là 1 card riêng: thông tin cá nhân / faceid.
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
  .elp-card--face {
    border-color: var(--elp-face);
    box-shadow: 0 12px 36px rgba(59, 130, 246, 0.30);
  }
  .elp-card--face:hover { box-shadow: 0 20px 52px rgba(59, 130, 246, 0.38); }

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
  .elp-card-icon--face { background: var(--elp-face-bg); color: var(--elp-face-dark); }

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
  .elp-account-empty { margin: 0; font-size: 13px; color: #94A3B8; }
  .elp-card-form { display: flex; flex-direction: column; gap: 12px; }

  /* Trạng thái kiểm tra FaceID (checkFaceId) */
  .elp-facecheck {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.4;
  }
  .elp-facecheck-checking { background: #F8FAFC; border: 1px solid #E2E8F0; color: #64748B; }
  .elp-facecheck-ok { background: var(--elp-accent-bg); border: 1px solid var(--elp-accent-border); color: var(--elp-accent-dark); }
  .elp-facecheck-warn { background: var(--elp-warning-bg); border: 1px solid var(--elp-warning-border); color: #B45309; }
  .elp-facecheck-error { background: var(--elp-danger-bg); border: 1px solid var(--elp-danger-border); color: var(--elp-danger-dark); }
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
   CARD 1 — THÔNG TIN CÁ NHÂN
   PUT: api/employee/{id}/info (adminApi.updateEmployeeInfo) — luồng FACEID,
   không đụng tài khoản đăng nhập.
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
            // PUT: api/employee/{id}/info — BE nhận JSON nhưng bind theo đúng tên field
            // C# (PascalCase, phân biệt hoa-thường vì JSON serializer không bật
            // case-insensitive) — PHẢI gửi FullName/Phone/Gender/RoleId/BranchIds,
            // gửi camelCase (fullName/gender...) sẽ bị lỗi 400 "Gender field is required."
            // Gửi multipart/form-data ở route này cũng sai (415 Unsupported Media Type).
            await adminApi.updateEmployeeInfo(employeeId, {
                FullName: form.fullName.trim(),
                Phone: form.phone.trim(),
                Gender: form.gender,
                RoleId: form.roleId,
                BranchIds: form.branchIds,
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
   CARD 2 — ẢNH FACEID
   Trước khi cho lưu, ảnh mới chọn PHẢI được kiểm tra qua adminApi.checkEmployeeFace
   (gửi dạng FormData — không phải object thường, vì BE nhận multipart/form-data).

   Response thật của BE:
   {
     isValid: boolean,
     hasFace: boolean,
     isDuplicate: boolean,
     duplicateOwnerType: string | null,
     duplicateMemberId: number | null,
     duplicateEmployeeId: number | null,
     similarity: number | null,
     message: string
   }

   Nút "Lưu" chỉ bật khi isValid === true && isDuplicate !== true.
   Mỗi lần đổi ảnh khác, trạng thái kiểm tra cũ được reset và phải kiểm tra lại từ đầu.
   Lưu qua PUT: api/employee/{id}/face (adminApi.updateEmployeeFace, multipart/form-data:
   ProfileImage, Reason).
   ============================================================================ */

function FaceIdCard({ employeeId, profile, onChanged }) {
    const [editing, setEditing] = useState(false);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [checking, setChecking] = useState(false);
    // checkResult shape thật từ BE: { isValid, hasFace, isDuplicate, duplicateOwnerType,
    // duplicateMemberId, duplicateEmployeeId, similarity, message }
    const [checkResult, setCheckResult] = useState(null);
    const [checkError, setCheckError] = useState("");

    const openForm = () => {
        setFile(null);
        setPreviewUrl(null);
        setReason("");
        setError("");
        setCheckResult(null);
        setCheckError("");
        setEditing(true);
    };

    const runCheck = useCallback(
        async (selectedFile) => {
            setChecking(true);
            setCheckError("");
            setCheckResult(null);
            try {
                // BE nhận multipart/form-data, PHẢI gửi FormData (không phải object thường),
                // nếu không sẽ bị lỗi 415 Unsupported Media Type.
                const fd = new FormData();
                fd.append("ProfileImage", selectedFile);
                fd.append("EmployeeId", employeeId);

                const res = await adminApi.checkEmployeeFace(fd);
                const data = res?.data ?? res;
                setCheckResult(data);
            } catch (err) {
                setCheckError(err?.data?.message || err?.message || "Không kiểm tra được ảnh FaceID.");
            } finally {
                setChecking(false);
            }
        },
        [employeeId]
    );

    const onPickFile = (selectedFile) => {
        setFile(selectedFile || null);
        setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
        setCheckResult(null);
        setCheckError("");
        if (selectedFile) {
            runCheck(selectedFile);
        }
    };

    // Chỉ cho lưu khi BE xác nhận ảnh hợp lệ VÀ không trùng với ai khác.
    const canSave =
        !!file &&
        !checking &&
        checkResult?.isValid === true &&
        checkResult?.isDuplicate !== true;

    const submit = async () => {
        setError("");
        if (!file) {
            setError("Vui lòng chọn ảnh để đăng ký/cập nhật FaceID.");
            return;
        }
        if (!canSave) {
            setError("Ảnh chưa được xác nhận hợp lệ qua bước kiểm tra FaceID ở trên.");
            return;
        }
        setSaving(true);
        try {
            // PUT: api/employee/{id}/face (multipart/form-data) — ProfileImage, Reason
            const fd = new FormData();
            fd.append("ProfileImage", file);
            if (reason.trim()) {
                fd.append("Reason", reason.trim());
            }
            await adminApi.updateEmployeeFace(employeeId, fd);
            setEditing(false);
            await onChanged();
        } catch (err) {
            setError(err?.data?.message || err?.message || "Cập nhật FaceID thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="elp-card elp-card--face">
            <div className="elp-card-head">
                <div className="elp-card-head-left">
                    <div className="elp-card-icon elp-card-icon--face">
                        <ScanFace size={16} />
                    </div>
                    <h3 className="elp-card-title">Ảnh FaceID</h3>
                </div>
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
                <div className="elp-card-form">
                    <Field label="Ảnh khuôn mặt mới" hint="Bắt buộc — dùng để nhận diện khuôn mặt khi chấm công">
                        <input
                            type="file"
                            accept="image/*"
                            className="elp-file-input"
                            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                        />
                    </Field>

                    {previewUrl && (
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div className="elp-avatar" style={{ width: 64, height: 64 }}>
                                <img src={previewUrl} alt="Xem trước ảnh FaceID" />
                            </div>

                            {checking && (
                                <div className="elp-facecheck elp-facecheck-checking">
                                    <Loader2 size={14} className="spin" />
                                    Đang kiểm tra khuôn mặt...
                                </div>
                            )}

                            {!checking && checkError && (
                                <div className="elp-facecheck elp-facecheck-error">
                                    <AlertTriangle size={14} />
                                    {checkError}
                                </div>
                            )}

                            {/* Trùng khuôn mặt với người/thành viên khác đã đăng ký */}
                            {!checking && !checkError && checkResult?.isDuplicate === true && (
                                <div className="elp-facecheck elp-facecheck-warn">
                                    <AlertTriangle size={14} />
                                    {checkResult.message || "Khuôn mặt này đã tồn tại trong hệ thống."}
                                    {checkResult.duplicateEmployeeId
                                        ? ` (Mã NV #${checkResult.duplicateEmployeeId})`
                                        : checkResult.duplicateMemberId
                                            ? ` (Mã hội viên #${checkResult.duplicateMemberId})`
                                            : ""}
                                </div>
                            )}

                            {/* Không phải trùng, nhưng ảnh không hợp lệ / không thấy mặt rõ */}
                            {!checking &&
                                !checkError &&
                                checkResult?.isDuplicate === false &&
                                checkResult?.isValid === false && (
                                    <div className="elp-facecheck elp-facecheck-error">
                                        <AlertTriangle size={14} />
                                        {checkResult.message || "Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại."}
                                    </div>
                                )}

                            {/* Hợp lệ, không trùng — có thể lưu */}
                            {!checking &&
                                !checkError &&
                                checkResult?.isValid === true &&
                                checkResult?.isDuplicate === false && (
                                    <div className="elp-facecheck elp-facecheck-ok">
                                        <Check size={14} />
                                        {checkResult.message || "Ảnh hợp lệ, có thể lưu."}
                                    </div>
                                )}
                        </div>
                    )}

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
                        <button type="button" onClick={submit} disabled={saving || !canSave} className="btn btn-primary">
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
   NỘI DUNG CHẾ ĐỘ XEM/SỬA — nhân viên đã tồn tại (2 card: thông tin / FaceID).
   GET: api/employee/{id} (adminApi.getEmployeeById) — hồ sơ luồng FACEID,
   không đụng tài khoản đăng nhập.
   ============================================================================ */

function ExistingEmployeeContent({ employeeId, branches, isAdmin, onBack }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const res = await adminApi.getEmployeeById(employeeId);
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
                    <Avatar name={profile.fullName} imageUrl={profile.faceProfileImage} />
                    <div>
                        <h1 className="elp-title">{profile.fullName}</h1>
                        <p className="elp-subtitle">
                            {roleLabel(profile.role)} · Mã NV #{profile.employeeId}
                        </p>
                    </div>
                </div>
            </div>

            <div className="elp-cards">
                <PersonalInfoCard
                    employeeId={profile.employeeId}
                    profile={profile}
                    branches={branches}
                    isAdmin={isAdmin}
                    onChanged={fetchProfile}
                />

                <FaceIdCard employeeId={profile.employeeId} profile={profile} onChanged={fetchProfile} />
            </div>
        </>
    );
}

/* ============================================================================
   NỘI DUNG CHẾ ĐỘ TẠO MỚI
   POST: api/employee/with-faceid (multipart/form-data) — adminApi.createEmployeeWithFaceId
   formData: FullName, Phone, Gender, RoleId, BranchIds, ProfileImage (bắt buộc), FaceIdReason
   ============================================================================ */

function NewEmployeeContent({ branches, isAdmin, onCreated }) {
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
            const fd = new FormData();
            fd.append("FullName", form.fullName.trim());
            fd.append("Phone", form.phone.trim());
            fd.append("Gender", form.gender);
            fd.append("RoleId", form.roleId);
            form.branchIds.forEach((id) => fd.append("BranchIds", id));
            fd.append("ProfileImage", form.profileImage);

            const res = await adminApi.createEmployeeWithFaceId(fd);
            const created = res?.data ?? res;
            onCreated(created.employeeId);
        } catch (err) {
            setError(err?.data?.message || err?.message || "Tạo nhân viên thất bại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="elp-header-left" style={{ marginBottom: 24 }}>
                <div className="elp-card-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
                    <Plus size={20} />
                </div>
                <div>
                    <h1 className="elp-title">Thêm nhân viên mới</h1>
                </div>
            </div>

            <div className="elp-card">
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

                {error && <p className="elp-error">{error}</p>}

                <div className="elp-form-actions">
                    <button onClick={submit} disabled={saving} className="btn btn-primary">
                        {saving && <Loader2 size={14} className="spin" />}
                        Tạo nhân viên
                    </button>
                </div>
            </div>
        </>
    );
}

/* ============================================================================
   ROOT TRANG CHI TIẾT
   Route: /employees/new  -> chế độ tạo mới
          /employees/:employeeId -> chế độ xem/sửa
   Tự fetch profile hiện tại (để biết isAdmin) + danh sách chi nhánh dùng cho form.
   ============================================================================ */

export default function EmployeeDetailPageOfMana() {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const isCreateMode = !employeeId || employeeId === "new";

    const [boot, setBoot] = useState({ status: "loading" });
    // Bảng lịch sử cập nhật nhân viên — gọi adminApi.getEmployeeUpdateHistory khi mở panel.
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [historyItems, setHistoryItems] = useState(null);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError("");
        try {
            // GET: api/employee/{id}/history
            const res = await adminApi.getEmployeeUpdateHistory(employeeId);
            const data = res?.data ?? res;
            setHistoryItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setHistoryError(err?.data?.message || err?.message || "Không tải được lịch sử cập nhật.");
        } finally {
            setHistoryLoading(false);
        }
    }, [employeeId]);

    const toggleHistory = () => {
        const opening = !historyOpen;
        setHistoryOpen(opening);
        if (opening && historyItems === null) {
            loadHistory();
        }
    };

    // Đổi sang xem nhân viên khác thì reset lại panel lịch sử.
    useEffect(() => {
        setHistoryOpen(false);
        setHistoryItems(null);
        setHistoryError("");
    }, [employeeId]);

    useEffect(() => {
        (async () => {
            try {
                const [profileRes, branchesRes] = await Promise.all([
                    adminApi.getEmployeeProfile(),
                    adminApi.getBranches(),
                ]);

                const myProfile = profileRes?.data ?? profileRes;
                const rawBranches = branchesRes?.data ?? branchesRes;

                const allBranches = Array.isArray(rawBranches)
                    ? rawBranches
                    : rawBranches?.items || rawBranches?.branches || [];

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
    const formBranches = isAdmin ? boot.branches : boot.myBranches;

    return (
        <div className="elp-page">
            <style>{styles}</style>
            <div className={`elp-wrap-narrow ${!isCreateMode ? "elp-wrap-wide" : ""}`}>
                <div className="elp-top-bar">
                    <button onClick={() => navigate("/manager/employees")} className="elp-back-btn">
                        <ArrowLeft size={16} />
                        Quay lại danh sách
                    </button>

                    {!isCreateMode && (
                        <button
                            type="button"
                            onClick={toggleHistory}
                            className="elp-history-btn"
                        >
                            <History size={16} />
                            Lịch sử cập nhật
                        </button>
                    )}
                </div>

                {!isCreateMode && historyOpen && (
                    <div className="elp-history-panel">
                        {historyLoading && (
                            <div className="elp-history-loading">
                                <Loader2 size={14} className="spin" />
                                Đang tải lịch sử cập nhật...
                            </div>
                        )}

                        {!historyLoading && historyError && <p className="elp-error">{historyError}</p>}

                        {!historyLoading && !historyError && historyItems && historyItems.length === 0 && (
                            <p className="elp-history-empty">Chưa có lịch sử cập nhật cho nhân viên này.</p>
                        )}

                        {!historyLoading &&
                            !historyError &&
                            historyItems &&
                            historyItems.map((item) => (
                                <div key={item.updateSessionId} className="elp-history-item">
                                    <div className="elp-history-meta">
                                        <span className="elp-history-time">
                                            {new Date(item.updatedAt).toLocaleString("vi-VN")}
                                        </span>
                                        <span>{item.updatedByName ? `Người thực hiện: ${item.updatedByName}` : "Hệ thống"}</span>
                                    </div>
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
                            ))}
                    </div>
                )}

                {isCreateMode ? (
                    <NewEmployeeContent
                        branches={formBranches}
                        isAdmin={isAdmin}
                        onCreated={(newId) => navigate(`/admin/employees/${newId}`, { replace: true })}
                    />
                ) : (
                    <ExistingEmployeeContent
                        employeeId={employeeId}
                        branches={formBranches}
                        isAdmin={isAdmin}
                        onBack={() => navigate("/admin/employees")}
                    />
                )}
            </div>
        </div>
    );
}