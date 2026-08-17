// src/pages/admin/EquipmentCategory/EquipmentCategoryCreatePage.jsx
//
// Trang tạo danh mục thiết bị mới — khớp với
// EquipmentCategoryController POST /api/EquipmentCategory
// (CategoryName, Description).
//
// STYLE: đồng bộ giao diện với AddEquipmentPage.jsx (manager) — khung viền
// emerald bo tròn "eqc-inner", tiêu đề Source Serif 4, banner lỗi/thành công,
// form card trắng với dải gradient trên cùng, input nền xám nhạt bo tròn.
// Toàn bộ class đổi tiền tố "eqm-" -> "eqc-" để tránh đụng CSS ở trang khác.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";

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
            setTimeout(() => navigate("/admin/equipment-types"), 700);
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
        <div className="eqc-page">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');

                .eqc-page {
                    --eqc-page-bg: #ffffff;
                    --eqc-frame-border: #0f766e;
                    --eqc-bg-card: #ffffff;
                    --eqc-bg-input: #f7faf9;
                    --eqc-border-soft: #dceee7;
                    --eqc-border-input: #dbe4e0;
                    --eqc-text-primary: #101815;
                    --eqc-text-secondary: #6b756f;

                    --eqc-accent-1: #047857;
                    --eqc-accent-2: #10b981;
                    --eqc-accent-soft: #d7f3e3;
                    --eqc-red: #e11d48;
                    --eqc-red-soft: rgba(225, 29, 72, 0.08);
                    --eqc-green-soft: rgba(5, 150, 105, 0.08);

                    --eqc-radius-lg: 20px;
                    --eqc-radius-md: 12px;

                    --eqc-shadow-card:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 14px 30px -14px rgba(4, 120, 87, 0.22),
                        0 30px 60px -30px rgba(15, 23, 42, 0.16);

                    min-height: 100%;
                    margin: 0 auto;
                    padding: 16px;
                    background: var(--eqc-page-bg);
                    color: var(--eqc-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    box-sizing: border-box;
                }
                .eqc-page * { box-sizing: border-box; }

                .eqc-inner {
                    max-width: 640px;
                    margin: 0 auto;
                    padding: 18px;
                    border: 2px solid var(--eqc-frame-border);
                    border-radius: 20px;
                    background:
                        radial-gradient(600px 260px at 100% 0%, rgba(16, 185, 129, 0.07), transparent 70%),
                        #ffffff;
                    box-shadow:
                        0 0 0 6px rgba(16, 185, 129, 0.08),
                        0 30px 60px -30px rgba(4, 120, 87, 0.35);
                }

                .eqc-back-link {
                    background: none;
                    border: none;
                    color: var(--eqc-accent-1);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 0;
                    margin-bottom: 14px;
                }
                .eqc-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

                .eqc-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    padding: 3px 9px;
                    border-radius: 999px;
                    background: var(--eqc-accent-soft);
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    color: var(--eqc-accent-1);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .eqc-header { margin-bottom: 14px; }

                .eqc-title {
                    margin: 0 0 4px;
                    font-family: "Source Serif 4", Georgia, serif;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    color: var(--eqc-text-primary);
                }

                .eqc-subtitle {
                    margin: 0;
                    font-size: 12.5px;
                    color: var(--eqc-text-secondary);
                }

                .eqc-banner {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: var(--eqc-radius-md);
                    padding: 11px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 14px;
                }
                .eqc-banner-error {
                    background: var(--eqc-red-soft);
                    border: 1px solid rgba(225, 29, 72, 0.22);
                    color: var(--eqc-red);
                }
                .eqc-banner-success {
                    background: var(--eqc-green-soft);
                    border: 1px solid rgba(5, 150, 105, 0.22);
                    color: var(--eqc-accent-1);
                }

                .eqc-form-card {
                    position: relative;
                    background: var(--eqc-bg-card);
                    border: 1.5px solid var(--eqc-border-soft);
                    border-radius: var(--eqc-radius-lg);
                    box-shadow: var(--eqc-shadow-card);
                    padding: 18px 20px;
                    overflow: hidden;
                }

                .eqc-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
                .eqc-field:last-of-type { margin-bottom: 0; }
                .eqc-field label {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--eqc-text-primary);
                }
                .eqc-required { color: var(--eqc-red); margin-left: 2px; }

                .eqc-input, .eqc-textarea {
                    width: 100%;
                    padding: 9px 12px;
                    border-radius: var(--eqc-radius-md);
                    border: 1.5px solid var(--eqc-border-input);
                    background: var(--eqc-bg-input);
                    color: var(--eqc-text-primary);
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                }
                .eqc-input:hover, .eqc-textarea:hover { border-color: #b9c4d6; }
                .eqc-input::placeholder, .eqc-textarea::placeholder { color: #a7afc0; }
                .eqc-input:focus, .eqc-textarea:focus {
                    border-color: var(--eqc-accent-1);
                    background: #ffffff;
                    box-shadow: 0 0 0 4px var(--eqc-accent-soft);
                }
                .eqc-input:disabled, .eqc-textarea:disabled {
                    background: var(--eqc-border-soft);
                    color: var(--eqc-text-secondary);
                    cursor: not-allowed;
                }
                .eqc-textarea { resize: vertical; min-height: 110px; line-height: 1.55; }

                .eqc-field-error { font-size: 12px; color: var(--eqc-red); }
                .eqc-field-hint { font-size: 12px; color: var(--eqc-text-secondary); }

                .eqc-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 4px;
                    padding-top: 12px;
                    border-top: 1px solid var(--eqc-border-soft);
                }

                .eqc-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    border: none; border-radius: var(--eqc-radius-md); padding: 9px 18px;
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    transition: transform 0.05s ease, filter 0.15s ease, box-shadow 0.15s ease;
                }
                .eqc-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
                .eqc-btn:active:not(:disabled) { transform: translateY(0); }
                .eqc-btn-primary {
                    background: linear-gradient(135deg, var(--eqc-accent-2), var(--eqc-accent-1));
                    color: #ffffff;
                    box-shadow: 0 14px 26px -12px rgba(5, 150, 105, 0.55);
                }
                .eqc-btn-primary:hover:not(:disabled) {
                    filter: brightness(1.05);
                    transform: translateY(-1px);
                    box-shadow: 0 18px 30px -12px rgba(5, 150, 105, 0.6);
                }
                .eqc-btn-secondary {
                    background: #ffffff;
                    color: var(--eqc-text-secondary);
                    border: 1.5px solid var(--eqc-border-input);
                }
                .eqc-btn-secondary:hover:not(:disabled) {
                    border-color: #b9c4d6;
                    color: var(--eqc-text-primary);
                    box-shadow: 0 6px 16px -8px rgba(15, 23, 42, 0.18);
                }

                .eqc-input:focus-visible, .eqc-textarea:focus-visible, .eqc-btn:focus-visible {
                    outline: 2px solid var(--eqc-accent-2);
                    outline-offset: 2px;
                }

                @media (max-width: 640px) {
                    .eqc-page { padding: 20px 16px 28px; }
                    .eqc-title { font-size: 22px; }
                    .eqc-form-card { padding: 18px 16px; border-radius: 18px; }
                    .eqc-form-actions { flex-direction: column-reverse; }
                    .eqc-btn { width: 100%; text-align: center; }
                }
            `}</style>

            <div className="eqc-inner">
                <button className="eqc-back-link" onClick={() => navigate("/admin/equipment-types")}>
                    ← Quay lại danh sách
                </button>

                <div className="eqc-header">
                    <span className="eqc-eyebrow">Danh mục mới</span>
                    <h1 className="eqc-title">Thêm danh mục</h1>
                    <p className="eqc-subtitle">Danh mục dùng để phân loại thiết bị trong hệ thống</p>
                </div>

                {banner && <div className={`eqc-banner eqc-banner-${banner.type}`}>{banner.message}</div>}

                <form className="eqc-form-card" onSubmit={handleSubmit}>
                    <div className="eqc-field">
                        <label htmlFor="eqc-cat-name">
                            Tên danh mục <span className="eqc-required">*</span>
                        </label>
                        <input
                            id="eqc-cat-name"
                            className="eqc-input"
                            placeholder="VD: Máy chạy bộ, Tạ tay, Máy tập cơ..."
                            value={form.categoryName}
                            onChange={(e) => setField("categoryName", e.target.value)}
                            autoFocus
                        />
                        {errors.categoryName && <span className="eqc-field-error">{errors.categoryName}</span>}
                    </div>

                    <div className="eqc-field">
                        <label htmlFor="eqc-cat-desc">Mô tả</label>
                        <textarea
                            id="eqc-cat-desc"
                            className="eqc-textarea"
                            placeholder="Mô tả ngắn về nhóm thiết bị này (không bắt buộc)..."
                            value={form.description}
                            onChange={(e) => setField("description", e.target.value)}
                        />
                        <span className="eqc-field-hint">Giúp nhân viên dễ nhận biết khi chọn danh mục lúc thêm thiết bị.</span>
                    </div>

                    <div className="eqc-form-actions">
                        <button
                            type="button"
                            className="eqc-btn eqc-btn-secondary"
                            onClick={() => navigate("/admin/equipment-types")}
                            disabled={submitting}
                        >
                            Huỷ
                        </button>
                        <button type="submit" className="eqc-btn eqc-btn-primary" disabled={submitting}>
                            {submitting ? "Đang lưu..." : "Thêm danh mục"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}