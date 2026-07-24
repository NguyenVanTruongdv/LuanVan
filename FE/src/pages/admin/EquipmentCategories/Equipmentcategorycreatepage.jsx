// src/pages/admin/EquipmentCategory/EquipmentCategoryCreatePage.jsx
//
// Trang tạo danh mục thiết bị mới — khớp với
// EquipmentCategoryController POST /api/EquipmentCategory
// (CategoryName, Description).
//
// Theme đồng bộ Navy/Slate/Cyan với EquipmentCategoryListPage.jsx và các
// trang quản lý thiết bị khác.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";

const CAT_STYLES = `
:root {
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

.eqm-container { max-width: 640px; margin: 0 auto; }

.eqm-back-link {
    background: none; border: none; color: var(--eqm-cyan-500);
    font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 16px;
}
.eqm-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

.eqm-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.eqm-header-icon {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.08));
    box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.4);
}
.eqm-header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--eqm-text-900); }
.eqm-header p { margin: 2px 0 0; font-size: 13.5px; color: var(--eqm-text-400); }

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

.eqm-banner { border-radius: var(--eqm-radius-sm); padding: 12px 16px; font-size: 13.5px; font-weight: 500; margin-bottom: 18px; }
.eqm-banner-error { background: var(--eqm-danger-bg); color: var(--eqm-danger); }
.eqm-banner-success { background: var(--eqm-success-bg); color: var(--eqm-success); }

.eqm-form-card { background: var(--eqm-surface); border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow); padding: 26px; }
.eqm-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.eqm-field:last-of-type { margin-bottom: 0; }
.eqm-field label { font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--eqm-text-600); }
.eqm-required { color: var(--eqm-danger); }

.eqm-input, .eqm-textarea {
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit;
}
.eqm-input:focus, .eqm-textarea:focus { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-input::placeholder, .eqm-textarea::placeholder { color: var(--eqm-text-400); }
.eqm-textarea { min-height: 110px; resize: vertical; }
.eqm-field-error { font-size: 12px; color: var(--eqm-danger); }
.eqm-field-hint { font-size: 12px; color: var(--eqm-text-400); }

.eqm-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--eqm-border); }

@media (max-width: 560px) {
    .eqm-page { padding: 18px 14px 48px; }
    .eqm-form-actions { flex-direction: column-reverse; }
    .eqm-form-actions .eqm-btn { width: 100%; }
}
`;

const EMPTY_FORM = { categoryName: "", description: "" };

export default function EquipmentCategoryCreatePage() {
    const navigate = useNavigate();

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState(null); // { type: "success" | "error", message }

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.categoryName.trim()) next.categoryName = "Vui lòng nhập tên danh mục.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBanner(null);
        if (!validate()) return;

        setSubmitting(true);
        try {
            await adminApi.createEquipmentCategory({
                categoryName: form.categoryName.trim(),
                description: form.description,
            });
            setBanner({ type: "success", message: "Đã thêm danh mục thành công." });
            setTimeout(() => navigate("/admin/equipment-categories"), 700);
        } catch (err) {
            console.error("Lỗi tạo danh mục:", err?.response?.status, err?.response?.data, err);
            const serverMessage =
                typeof err?.response?.data === "string" ? err.response.data : err?.response?.data?.message;
            setBanner({
                type: "error",
                message: serverMessage || "Không thể tạo danh mục. Vui lòng thử lại.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="eqm-page">
            <style>{CAT_STYLES}</style>
            <div className="eqm-container">
                <button className="eqm-back-link" onClick={() => navigate("/admin/equipment-types")}>
                    ← Quay lại danh sách
                </button>

                <div className="eqm-header">
                    <span className="eqm-header-icon" aria-hidden="true">🗂️</span>
                    <div>
                        <h1>Thêm danh mục mới</h1>
                        <p>Danh mục dùng để phân loại thiết bị trong hệ thống</p>
                    </div>
                </div>

                {banner && <div className={`eqm-banner eqm-banner-${banner.type}`}>{banner.message}</div>}

                <form className="eqm-form-card" onSubmit={handleSubmit}>
                    <div className="eqm-field">
                        <label htmlFor="eqm-cat-name">
                            Tên danh mục <span className="eqm-required">*</span>
                        </label>
                        <input
                            id="eqm-cat-name"
                            className="eqm-input"
                            placeholder="VD: Máy chạy bộ, Tạ tay, Máy tập cơ..."
                            value={form.categoryName}
                            onChange={(e) => setField("categoryName", e.target.value)}
                            autoFocus
                        />
                        {errors.categoryName && <span className="eqm-field-error">{errors.categoryName}</span>}
                    </div>

                    <div className="eqm-field">
                        <label htmlFor="eqm-cat-desc">Mô tả</label>
                        <textarea
                            id="eqm-cat-desc"
                            className="eqm-textarea"
                            placeholder="Mô tả ngắn về nhóm thiết bị này (không bắt buộc)..."
                            value={form.description}
                            onChange={(e) => setField("description", e.target.value)}
                        />
                        <span className="eqm-field-hint">Giúp nhân viên dễ nhận biết khi chọn danh mục lúc thêm thiết bị.</span>
                    </div>

                    <div className="eqm-form-actions">
                        <button
                            type="button"
                            className="eqm-btn eqm-btn-secondary"
                            onClick={() => navigate("/admin/equipment-categories")}
                            disabled={submitting}
                        >
                            Huỷ
                        </button>
                        <button type="submit" className="eqm-btn eqm-btn-primary" disabled={submitting}>
                            {submitting ? "Đang lưu..." : "Thêm danh mục"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}