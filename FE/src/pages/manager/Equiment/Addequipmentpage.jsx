// src/pages/manager/Equiment/AddEquipmentPage.jsx
//
// Trang thêm thiết bị mới — khớp với EquipmentService.CreateAsync.
// - Admin: chọn branchId tự do trong danh sách chi nhánh (vẫn được BE validate tồn tại).
// - Manager: chỉ được chọn trong các chi nhánh mình quản lý (managedBranches).
// - Staff/Guest: không có quyền, nên chặn truy cập trang này ở phía route (không xử lý ở đây).
//
// FIX: file này thực tế nằm ở src/pages/manager/Equiment/AddEquipmentPage.jsx
// (có thêm cấp "manager/"), nên phải lùi ĐÚNG 3 cấp tới src/ rồi vào api/managerApi:
// "../../../api/managerApi". Lùi 2 cấp như trước sẽ ra ngoài src/ -> Vite báo
// "Failed to resolve import" và toàn bộ trang crash ngay khi load.
//
// CẬP NHẬT LẦN NÀY: đổi theme màu đồng bộ với sidebar Manager Portal (nền
// trắng/xám nhạt, viền đậm, điểm nhấn xanh lá-ngọc #10B981, shadow mạnh hơn).
//
// TODO: nếu app đã có route guard chặn Staff/Guest vào trang này thì bỏ qua phần check role ở đây.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// CSS dùng chung layout/màu với EquipmentListPage (tông trắng + xanh lá giống sidebar).
// Viết thẳng trong file, nhúng qua thẻ <style> bên dưới — không tách file .css riêng.
const EQUIPMENT_STYLES = `
:root {
    /* Đồng bộ với sidebar Manager Portal: nền trắng/xám nhạt, viền đậm, nhấn xanh lá-ngọc */
    --eqm-navy-900: #eef2f7;
    --eqm-navy-800: #ffffff;
    --eqm-navy-700: #f1f5f9;
    --eqm-cyan-500: #10b981;
    --eqm-cyan-600: #059669;
    --eqm-cyan-100: rgba(16, 185, 129, 0.16);

    --eqm-bg: var(--eqm-navy-900);
    --eqm-surface: var(--eqm-navy-800);
    --eqm-surface-muted: var(--eqm-navy-700);
    --eqm-surface-hover: #e7fbf3;
    --eqm-border: #34d399;
    --eqm-border-strong: #059669;

    --eqm-text-900: #0f172a;
    --eqm-text-600: #475569;
    --eqm-text-400: #64748b;

    --eqm-danger: #dc2626;
    --eqm-danger-bg: rgba(220, 38, 38, 0.1);
    --eqm-success: #059669;
    --eqm-success-bg: rgba(5, 150, 105, 0.12);

    --eqm-radius: 14px;
    --eqm-radius-sm: 10px;
    --eqm-shadow: 0 1px 0 rgba(255, 255, 255, 0.6), 0 24px 48px -18px rgba(15, 23, 42, 0.45), 0 6px 16px -6px rgba(15, 23, 42, 0.18);
}

.eqm-page {
    min-height: 100%;
    background: var(--eqm-bg);
    padding: 28px 24px 60px;
    color: var(--eqm-text-900);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
}

.eqm-container { max-width: 1180px; margin: 0 auto; }

.eqm-back-link {
    background: none; border: none; color: var(--eqm-cyan-600);
    font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 16px;
}
.eqm-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

.eqm-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.eqm-header-titles { display: flex; align-items: center; gap: 14px; }
.eqm-header-icon {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(16, 185, 129, 0.08));
    box-shadow: inset 0 0 0 1.5px rgba(16, 185, 129, 0.45);
}
.eqm-header-titles h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--eqm-text-900); }
.eqm-header-titles p { margin: 2px 0 0; font-size: 13.5px; color: var(--eqm-text-400); }

.eqm-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border: none; border-radius: var(--eqm-radius-sm); padding: 10px 18px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: transform 0.05s ease, filter 0.15s ease, background 0.15s ease;
}
.eqm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.eqm-btn:active:not(:disabled) { transform: translateY(1px); }
.eqm-btn-primary { background: linear-gradient(135deg, var(--eqm-cyan-500), var(--eqm-cyan-600)); color: #fff; box-shadow: 0 10px 20px -8px rgba(5, 150, 105, 0.55); }
.eqm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.eqm-btn-secondary { background: var(--eqm-surface-muted); color: var(--eqm-text-600); box-shadow: inset 0 0 0 1.5px var(--eqm-border-strong); }
.eqm-btn-secondary:hover:not(:disabled) { background: var(--eqm-surface-hover); }
.eqm-btn-danger { background: var(--eqm-danger-bg); color: var(--eqm-danger); box-shadow: inset 0 0 0 1.5px rgba(220, 38, 38, 0.35); }
.eqm-btn-danger:hover:not(:disabled) { filter: brightness(0.97); }

.eqm-banner { border-radius: var(--eqm-radius-sm); padding: 12px 16px; font-size: 13.5px; font-weight: 500; margin-bottom: 18px; box-shadow: 0 8px 20px -10px rgba(15, 23, 42, 0.25); }
.eqm-banner-error { background: var(--eqm-danger-bg); color: var(--eqm-danger); box-shadow: inset 0 0 0 1.5px rgba(220, 38, 38, 0.3), 0 8px 20px -10px rgba(220, 38, 38, 0.25); }
.eqm-banner-success { background: var(--eqm-success-bg); color: var(--eqm-success); box-shadow: inset 0 0 0 1.5px rgba(5, 150, 105, 0.3), 0 8px 20px -10px rgba(5, 150, 105, 0.25); }
.eqm-banner-actions { margin-top: 8px; display: flex; gap: 8px; }
.eqm-banner-link { background: none; border: none; padding: 0; font: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; color: inherit; }

.eqm-form-card { background: var(--eqm-surface); border: 1.5px solid var(--eqm-border-strong); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow); padding: 26px; }
.eqm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 20px; }
.eqm-field-full { grid-column: 1 / -1; }
.eqm-field { display: flex; flex-direction: column; gap: 6px; }
.eqm-field label { font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--eqm-text-600); }
.eqm-required { color: var(--eqm-danger); }

.eqm-input, .eqm-textarea {
    border: 1.5px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    box-shadow: 0 2px 6px -2px rgba(15, 23, 42, 0.12);
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit;
    accent-color: var(--eqm-cyan-500);
}
.eqm-input:focus, .eqm-textarea:focus { border-color: var(--eqm-border-strong); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-input:disabled { background: var(--eqm-surface-muted); color: var(--eqm-text-400); cursor: not-allowed; }
.eqm-textarea { min-height: 96px; resize: vertical; }
.eqm-input::placeholder, .eqm-textarea::placeholder { color: var(--eqm-text-400); }
.eqm-error-text { font-size: 12px; color: var(--eqm-danger); }
.eqm-hint-text { font-size: 12px; color: var(--eqm-text-400); }

/* Custom dropdown (thay cho <select> mặc định của trình duyệt) */
.eqm-cselect { position: relative; width: 100%; font-family: inherit; }
.eqm-cselect-trigger {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
    border: 1.5px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); cursor: pointer;
    box-shadow: 0 2px 6px -2px rgba(15, 23, 42, 0.12);
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit; text-align: left;
}
.eqm-cselect-trigger:hover:not(.eqm-cselect-disabled) { border-color: var(--eqm-border-strong); }
.eqm-cselect-trigger.eqm-cselect-open { border-color: var(--eqm-border-strong); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-cselect-trigger.eqm-cselect-disabled { background: var(--eqm-surface-muted); color: var(--eqm-text-400); cursor: not-allowed; }
.eqm-cselect-placeholder { color: var(--eqm-text-400); }
.eqm-cselect-arrow { width: 16px; height: 16px; flex-shrink: 0; color: var(--eqm-cyan-600); transition: transform 0.15s ease; }
.eqm-cselect-arrow-open { transform: rotate(180deg); }
.eqm-cselect-menu {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 30;
    background: var(--eqm-surface); border: 1.5px solid var(--eqm-border-strong); border-radius: var(--eqm-radius-sm);
    box-shadow: 0 22px 44px -18px rgba(5, 150, 105, 0.4), 0 8px 20px -8px rgba(15, 23, 42, 0.25);
    max-height: 240px; overflow-y: auto; padding: 6px;
}
.eqm-cselect-option {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 9px 10px; border-radius: 8px; font-size: 14px; color: var(--eqm-text-900); cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
}
.eqm-cselect-option:hover { background: var(--eqm-cyan-100); color: var(--eqm-cyan-600); }
.eqm-cselect-option-selected, .eqm-cselect-option-selected:hover { background: var(--eqm-cyan-500); color: #fff; font-weight: 600; }
.eqm-cselect-check { font-size: 12px; }

.eqm-dropzone {
    display: flex; align-items: center; gap: 14px; border: 2px dashed var(--eqm-border);
    border-radius: var(--eqm-radius-sm); padding: 16px; cursor: pointer; background: var(--eqm-surface-muted);
    box-shadow: 0 2px 8px -3px rgba(15, 23, 42, 0.15);
    transition: border-color 0.15s ease, background 0.15s ease;
}
.eqm-dropzone:hover { border-color: var(--eqm-cyan-500); }
.eqm-dropzone-active { border-color: var(--eqm-cyan-500); background: var(--eqm-cyan-100); }
.eqm-dropzone-preview {
    display: flex; align-items: center; justify-content: center; width: 56px; height: 56px;
    border-radius: 10px; overflow: hidden; background: var(--eqm-surface);
    box-shadow: inset 0 0 0 1.5px var(--eqm-border-strong); flex-shrink: 0;
}
.eqm-dropzone-preview img { width: 100%; height: 100%; object-fit: cover; }
.eqm-dropzone-text { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.eqm-dropzone-text strong { color: var(--eqm-text-900); font-size: 14px; }
.eqm-dropzone-text span { color: var(--eqm-text-400); }

.eqm-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 18px; border-top: 1.5px solid var(--eqm-border-strong); }

@media (max-width: 720px) {
    .eqm-form-grid { grid-template-columns: 1fr; }
    .eqm-page { padding: 18px 14px 48px; }
}
`;

const MAX_IMAGE_MB = 5;

// Dropdown tự vẽ để đồng bộ màu xanh lá cho danh sách option
// (thay cho <select> mặc định vì trình duyệt tự render option, không style được).
function CustomSelect({ id, value, onChange, options, placeholder, disabled }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const selected = options.find((o) => String(o.value) === String(value));

    return (
        <div className="eqm-cselect" ref={wrapperRef}>
            <button
                type="button"
                id={id}
                className={`eqm-cselect-trigger ${open ? "eqm-cselect-open" : ""} ${disabled ? "eqm-cselect-disabled" : ""
                    }`}
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={selected ? "" : "eqm-cselect-placeholder"}>
                    {selected ? selected.label : placeholder}
                </span>
                <svg
                    className={`eqm-cselect-arrow ${open ? "eqm-cselect-arrow-open" : ""}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        fill="currentColor"
                    />
                </svg>
            </button>

            {open && !disabled && (
                <div className="eqm-cselect-menu" role="listbox">
                    {options.map((o) => {
                        const isSelected = String(o.value) === String(value);
                        return (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={isSelected}
                                className={`eqm-cselect-option ${isSelected ? "eqm-cselect-option-selected" : ""}`}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >
                                <span>{o.label}</span>
                                {isSelected && <span className="eqm-cselect-check">✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function AddEquipmentPageofManager() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [role, setRole] = useState(null); // "Admin" | "Manager" | "Staff"
    const isManager = role === "Manager";

    const [categories, setCategories] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [form, setForm] = useState({
        equipmentName: "",
        categoryId: "",
        branchId: "",
        description: "",
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState(null); // { type: "success" | "error", message }

    const loadOptions = async () => {
        setLoadingOptions(true);
        setLoadError(false);
        setBanner(null);
        try {
            const profile = await managerApi.getEmployeeProfile();
            setRole(profile.role);

            const [cats, brs] = await Promise.all([
                managerApi.getEquipmentCategories().catch(() => []),
                profile.role === "Manager"
                    ? Promise.resolve(profile.branches ?? [])
                    : managerApi.getBranches().catch(() => []),
            ]);
            setCategories(cats ?? []);
            setBranches(brs ?? []);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Không tải được thông tin tài khoản / danh mục / chi nhánh:", err);
            setLoadError(true);
            setBanner({
                type: "error",
                message:
                    err?.response?.data?.message ||
                    "Không tải được thông tin tài khoản. Vui lòng thử lại.",
            });
        } finally {
            setLoadingOptions(false);
        }
    };

    useEffect(() => {
        loadOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErrors((e) => ({ ...e, image: "Vui lòng chọn file hình ảnh" }));
            return;
        }
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setErrors((e) => ({ ...e, image: `Ảnh phải nhỏ hơn ${MAX_IMAGE_MB}MB` }));
            return;
        }
        setErrors((e) => ({ ...e, image: undefined }));
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        handleFile(e.dataTransfer.files?.[0]);
    };

    const validate = () => {
        const next = {};
        if (!form.equipmentName.trim()) next.equipmentName = "Vui lòng nhập tên thiết bị";
        if (!form.categoryId) next.categoryId = "Vui lòng chọn danh mục";
        if (!form.branchId) next.branchId = "Vui lòng chọn chi nhánh";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBanner(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            await managerApi.createEquipment({ ...form, image: imageFile });
            setBanner({ type: "success", message: "Thêm thiết bị thành công." });
            setTimeout(() => navigate("/manager/equipment"), 800);
        } catch (err) {
            setBanner({
                type: "error",
                message:
                    err?.response?.data?.message ||
                    "Không thể thêm thiết bị. Vui lòng kiểm tra lại thông tin.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="eqm-page">
            <style>{EQUIPMENT_STYLES}</style>
            <div className="eqm-container">
                <button className="eqm-back-link" onClick={() => navigate("/admin/equipment")}>
                    ← Quay lại danh sách
                </button>

                <div className="eqm-header">
                    <div className="eqm-header-titles">
                        <span className="eqm-header-icon" aria-hidden="true">➕</span>
                        <div>
                            <h1>Thêm thiết bị mới</h1>
                            <p>Điền thông tin thiết bị và tải ảnh minh hoạ (nếu có)</p>
                        </div>
                    </div>
                </div>

                {banner && (
                    <div className={`eqm-banner eqm-banner-${banner.type}`}>
                        {banner.message}
                        {loadError && banner.type === "error" && (
                            <div className="eqm-banner-actions">
                                <button className="eqm-banner-link" onClick={loadOptions}>
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <form className="eqm-form-card" onSubmit={handleSubmit}>
                    <div className="eqm-form-grid">
                        <div className="eqm-field eqm-field-full">
                            <label htmlFor="eqm-name">
                                Tên thiết bị <span className="eqm-required">*</span>
                            </label>
                            <input
                                id="eqm-name"
                                className="eqm-input"
                                placeholder="VD: Máy chạy bộ Life Fitness T5"
                                value={form.equipmentName}
                                onChange={(e) => setField("equipmentName", e.target.value)}
                            />
                            {errors.equipmentName && (
                                <span className="eqm-error-text">{errors.equipmentName}</span>
                            )}
                        </div>

                        <div className="eqm-field">
                            <label htmlFor="eqm-category">
                                Danh mục <span className="eqm-required">*</span>
                            </label>
                            <CustomSelect
                                id="eqm-category"
                                value={form.categoryId}
                                onChange={(v) => setField("categoryId", v)}
                                options={categories.map((c) => ({
                                    value: c.categoryId,
                                    label: c.categoryName,
                                }))}
                                placeholder="-- Chọn danh mục --"
                                disabled={loadingOptions}
                            />
                            {errors.categoryId && <span className="eqm-error-text">{errors.categoryId}</span>}
                        </div>

                        <div className="eqm-field">
                            <label htmlFor="eqm-branch">
                                Chi nhánh <span className="eqm-required">*</span>
                            </label>
                            <CustomSelect
                                id="eqm-branch"
                                value={form.branchId}
                                onChange={(v) => setField("branchId", v)}
                                options={branches.map((b) => ({
                                    value: b.branchId,
                                    label: b.branchName,
                                }))}
                                placeholder="-- Chọn chi nhánh --"
                                disabled={loadingOptions}
                            />
                            {errors.branchId && <span className="eqm-error-text">{errors.branchId}</span>}
                            {isManager && (
                                <span className="eqm-hint-text">Chỉ hiện các chi nhánh bạn đang quản lý</span>
                            )}
                        </div>

                        <div className="eqm-field eqm-field-full">
                            <label htmlFor="eqm-desc">Mô tả</label>
                            <textarea
                                id="eqm-desc"
                                className="eqm-textarea"
                                placeholder="Thông số kỹ thuật, tình trạng, ghi chú bảo trì..."
                                value={form.description}
                                onChange={(e) => setField("description", e.target.value)}
                            />
                        </div>

                        <div className="eqm-field eqm-field-full">
                            <label>Hình ảnh</label>
                            <div
                                className={`eqm-dropzone ${dragActive ? "eqm-dropzone-active" : ""}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragActive(true);
                                }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                            >
                                <div className="eqm-dropzone-preview">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Xem trước" />
                                    ) : (
                                        <span style={{ fontSize: 22 }}>📷</span>
                                    )}
                                </div>
                                <div className="eqm-dropzone-text">
                                    <strong>{imageFile ? imageFile.name : "Kéo thả ảnh vào đây"}</strong>
                                    <span>hoặc bấm để chọn file (JPG, PNG, tối đa {MAX_IMAGE_MB}MB)</span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) => handleFile(e.target.files?.[0])}
                                />
                            </div>
                            {errors.image && <span className="eqm-error-text">{errors.image}</span>}
                        </div>
                    </div>

                    <div className="eqm-form-actions">
                        <button
                            type="button"
                            className="eqm-btn eqm-btn-secondary"
                            onClick={() => navigate("/manager/equipment")}
                            disabled={submitting}
                        >
                            Huỷ
                        </button>
                        <button type="submit" className="eqm-btn eqm-btn-primary" disabled={submitting}>
                            {submitting ? "Đang lưu…" : "Lưu thiết bị"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}