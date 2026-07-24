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
// CẬP NHẬT LẦN NÀY: đổi theme màu đồng bộ với EquipmentListPage.jsx — nền
// navy #0B1120, khối/panel #1E293B, viền slate #334155, điểm nhấn cyan
// #06B6D4 (thay cho gradient tím-indigo cũ), chữ tiêu đề #F1F5F9, chữ phụ
// #94A3B8 / #64748B.
//
// TODO: nếu app đã có route guard chặn Staff/Guest vào trang này thì bỏ qua phần check role ở đây.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// CSS dùng chung layout/màu với EquipmentListPage (tông navy + cyan giống sidebar).
// Viết thẳng trong file, nhúng qua thẻ <style> bên dưới — không tách file .css riêng.
const EQUIPMENT_STYLES = `
:root {
    /* Đồng bộ hẳn với nền/tông của sidebar (navy đậm), không chỉ mượn màu nhấn */
    --eqm-navy-900: #0b1120;
    --eqm-navy-800: #1e293b;
    --eqm-navy-700: #24304a;
    --eqm-cyan-500: #06b6d4;
    --eqm-cyan-600: #0891b2;
    --eqm-cyan-100: rgba(6, 182, 212, 0.16);

    --eqm-bg: var(--eqm-navy-900);
    --eqm-surface: var(--eqm-navy-800);
    --eqm-surface-muted: var(--eqm-navy-700);
    --eqm-surface-hover: #2b3a54;
    --eqm-border: #334155;

    --eqm-text-900: #f1f5f9;
    --eqm-text-600: #94a3b8;
    --eqm-text-400: #64748b;

    --eqm-danger: #f87171;
    --eqm-danger-bg: rgba(248, 113, 113, 0.14);
    --eqm-success: #34d399;
    --eqm-success-bg: rgba(52, 211, 153, 0.14);

    --eqm-radius: 14px;
    --eqm-radius-sm: 10px;
    --eqm-shadow: 0 1px 0 rgba(255, 255, 255, 0.03), 0 14px 28px -16px rgba(0, 0, 0, 0.7);
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
    background: none; border: none; color: var(--eqm-cyan-500);
    font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 16px;
}
.eqm-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

.eqm-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.eqm-header-titles { display: flex; align-items: center; gap: 14px; }
.eqm-header-icon {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.08));
    box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.4);
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
.eqm-btn-primary { background: linear-gradient(135deg, var(--eqm-cyan-500), var(--eqm-cyan-600)); color: #fff; }
.eqm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.eqm-btn-secondary { background: var(--eqm-surface-muted); color: var(--eqm-text-600); box-shadow: inset 0 0 0 1px var(--eqm-border); }
.eqm-btn-secondary:hover:not(:disabled) { background: var(--eqm-surface-hover); }
.eqm-btn-danger { background: var(--eqm-danger-bg); color: var(--eqm-danger); }
.eqm-btn-danger:hover:not(:disabled) { filter: brightness(0.97); }

.eqm-banner { border-radius: var(--eqm-radius-sm); padding: 12px 16px; font-size: 13.5px; font-weight: 500; margin-bottom: 18px; }
.eqm-banner-error { background: var(--eqm-danger-bg); color: var(--eqm-danger); }
.eqm-banner-success { background: var(--eqm-success-bg); color: var(--eqm-success); }
.eqm-banner-actions { margin-top: 8px; display: flex; gap: 8px; }
.eqm-banner-link { background: none; border: none; padding: 0; font: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; color: inherit; }

.eqm-form-card { background: var(--eqm-surface); border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow); padding: 26px; }
.eqm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 20px; }
.eqm-field-full { grid-column: 1 / -1; }
.eqm-field { display: flex; flex-direction: column; gap: 6px; }
.eqm-field label { font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--eqm-text-600); }
.eqm-required { color: var(--eqm-danger); }

.eqm-input, .eqm-select, .eqm-textarea {
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit;
}
.eqm-input:focus, .eqm-select:focus, .eqm-textarea:focus { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-input:disabled, .eqm-select:disabled { background: var(--eqm-surface-muted); color: var(--eqm-text-400); cursor: not-allowed; }
.eqm-textarea { min-height: 96px; resize: vertical; }
.eqm-input::placeholder, .eqm-textarea::placeholder { color: var(--eqm-text-400); }
.eqm-error-text { font-size: 12px; color: var(--eqm-danger); }
.eqm-hint-text { font-size: 12px; color: var(--eqm-text-400); }

.eqm-dropzone {
    display: flex; align-items: center; gap: 14px; border: 1.5px dashed var(--eqm-border);
    border-radius: var(--eqm-radius-sm); padding: 16px; cursor: pointer; background: var(--eqm-surface-muted);
    transition: border-color 0.15s ease, background 0.15s ease;
}
.eqm-dropzone:hover { border-color: var(--eqm-cyan-500); }
.eqm-dropzone-active { border-color: var(--eqm-cyan-500); background: var(--eqm-cyan-100); }
.eqm-dropzone-preview {
    display: flex; align-items: center; justify-content: center; width: 56px; height: 56px;
    border-radius: 10px; overflow: hidden; background: var(--eqm-surface);
    box-shadow: inset 0 0 0 1px var(--eqm-border); flex-shrink: 0;
}
.eqm-dropzone-preview img { width: 100%; height: 100%; object-fit: cover; }
.eqm-dropzone-text { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.eqm-dropzone-text strong { color: var(--eqm-text-900); font-size: 14px; }
.eqm-dropzone-text span { color: var(--eqm-text-400); }

.eqm-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--eqm-border); }

@media (max-width: 720px) {
    .eqm-form-grid { grid-template-columns: 1fr; }
    .eqm-page { padding: 18px 14px 48px; }
}
`;

const MAX_IMAGE_MB = 5;

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
                            <select
                                id="eqm-category"
                                className="eqm-select"
                                value={form.categoryId}
                                onChange={(e) => setField("categoryId", e.target.value)}
                                disabled={loadingOptions}
                            >
                                <option value="">-- Chọn danh mục --</option>
                                {categories.map((c) => (
                                    <option key={c.categoryId} value={c.categoryId}>
                                        {c.categoryName}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && <span className="eqm-error-text">{errors.categoryId}</span>}
                        </div>

                        <div className="eqm-field">
                            <label htmlFor="eqm-branch">
                                Chi nhánh <span className="eqm-required">*</span>
                            </label>
                            <select
                                id="eqm-branch"
                                className="eqm-select"
                                value={form.branchId}
                                onChange={(e) => setField("branchId", e.target.value)}
                                disabled={loadingOptions}
                            >
                                <option value="">-- Chọn chi nhánh --</option>
                                {branches.map((b) => (
                                    <option key={b.branchId} value={b.branchId}>
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
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