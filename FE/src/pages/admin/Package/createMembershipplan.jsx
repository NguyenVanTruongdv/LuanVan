// src/pages/admin/Package/MembershipPlanCreate.jsx
//
// Trang tạo gói tập mới.
// STYLE: đồng bộ giao diện với AddEquipmentPage.jsx (manager) — khung viền
// emerald bo tròn "eqm-inner", tiêu đề Source Serif 4, banner lỗi/thành công,
// form card trắng với dải gradient trên cùng, input nền xám nhạt bo tròn.
// Toàn bộ class đổi tiền tố "eqm-" -> "mpc-" để tránh đụng CSS ở trang khác,
// nhưng token màu / bố cục giữ y hệt.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";

const emptyForm = {
    planName: "",
    price: "",
    durationDays: "",
    description: "",
    isPopular: false,
};

function validate(form) {
    const errors = {};

    if (!form.planName.trim()) {
        errors.planName = "Vui lòng nhập tên gói tập.";
    }

    if (form.price === "" || Number.isNaN(Number(form.price))) {
        errors.price = "Vui lòng nhập giá hợp lệ.";
    } else if (Number(form.price) < 0) {
        errors.price = "Giá không được nhỏ hơn 0.";
    }

    if (form.durationDays === "" || Number.isNaN(Number(form.durationDays))) {
        errors.durationDays = "Vui lòng nhập số ngày hợp lệ.";
    } else if (Number(form.durationDays) <= 0) {
        errors.durationDays = "Thời hạn phải lớn hơn 0 ngày.";
    }

    return errors;
}

export default function MembershipPlanCreate() {
    const navigate = useNavigate();

    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [banner, setBanner] = useState(null); // { type: "success" | "error", message }

    const handleChange = (field) => (e) => {
        const value = field === "isPopular" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBanner(null);

        const validationErrors = validate(form);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const payload = {
            planName: form.planName.trim(),
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            description: form.description.trim(),
            isPopular: form.isPopular,
        };

        setSaving(true);
        try {
            await adminApi.createMembershipPlan(payload);
            setBanner({ type: "success", message: "Tạo gói tập thành công." });
            setTimeout(() => navigate("/admin/packages"), 800);
        } catch (err) {
            setBanner({
                type: "error",
                message: err?.response?.data?.message || "Tạo gói tập thất bại. Vui lòng thử lại.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mpc-page">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');

                .mpc-page {
                    --mpc-page-bg: #ffffff;
                    --mpc-frame-border: #0f766e;
                    --mpc-bg-card: #ffffff;
                    --mpc-bg-input: #f7faf9;
                    --mpc-border-soft: #dceee7;
                    --mpc-border-input: #dbe4e0;
                    --mpc-text-primary: #101815;
                    --mpc-text-secondary: #6b756f;

                    --mpc-accent-1: #047857;
                    --mpc-accent-2: #10b981;
                    --mpc-accent-soft: #d7f3e3;
                    --mpc-red: #e11d48;
                    --mpc-red-soft: rgba(225, 29, 72, 0.08);
                    --mpc-green-soft: rgba(5, 150, 105, 0.08);

                    --mpc-radius-lg: 20px;
                    --mpc-radius-md: 12px;

                    --mpc-shadow-card:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 14px 30px -14px rgba(4, 120, 87, 0.22),
                        0 30px 60px -30px rgba(15, 23, 42, 0.16);

                    min-height: 100%;
                    margin: 0 auto;
                    padding: 16px;
                    background: var(--mpc-page-bg);
                    color: var(--mpc-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    box-sizing: border-box;
                }
                .mpc-page * { box-sizing: border-box; }

                .mpc-inner {
                    max-width: 760px;
                    margin: 0 auto;
                    padding: 18px;
                    border: 2px solid var(--mpc-frame-border);
                    border-radius: 20px;
                    background:
                        radial-gradient(600px 260px at 100% 0%, rgba(16, 185, 129, 0.07), transparent 70%),
                        #ffffff;
                    box-shadow:
                        0 0 0 6px rgba(16, 185, 129, 0.08),
                        0 30px 60px -30px rgba(4, 120, 87, 0.35);
                }

                .mpc-back-link {
                    background: none;
                    border: none;
                    color: var(--mpc-accent-1);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 0;
                    margin-bottom: 14px;
                }
                .mpc-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

                .mpc-breadcrumb {
                    font-size: 12px;
                    color: var(--mpc-text-secondary);
                    margin-bottom: 10px;
                }
                .mpc-breadcrumb a { color: var(--mpc-accent-1); text-decoration: none; font-weight: 600; }
                .mpc-breadcrumb a:hover { text-decoration: underline; }

                .mpc-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    padding: 3px 9px;
                    border-radius: 999px;
                    background: var(--mpc-accent-soft);
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    color: var(--mpc-accent-1);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .mpc-header { margin-bottom: 14px; }

                .mpc-title {
                    margin: 0 0 4px;
                    font-family: "Source Serif 4", Georgia, serif;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    color: var(--mpc-text-primary);
                }

                .mpc-subtitle {
                    margin: 0;
                    font-size: 12.5px;
                    color: var(--mpc-text-secondary);
                }

                .mpc-banner {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: var(--mpc-radius-md);
                    padding: 11px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 14px;
                }
                .mpc-banner-error {
                    background: var(--mpc-red-soft);
                    border: 1px solid rgba(225, 29, 72, 0.22);
                    color: var(--mpc-red);
                }
                .mpc-banner-success {
                    background: var(--mpc-green-soft);
                    border: 1px solid rgba(5, 150, 105, 0.22);
                    color: var(--mpc-accent-1);
                }

                .mpc-form-card {
                    position: relative;
                    background: var(--mpc-bg-card);
                    border: 1.5px solid var(--mpc-border-soft);
                    border-radius: var(--mpc-radius-lg);
                    box-shadow: var(--mpc-shadow-card);
                    padding: 18px 20px;
                    overflow: hidden;
                }
                .mpc-form-card::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--mpc-accent-1), var(--mpc-accent-2) 60%, #6ee7b7);
                }

                .mpc-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
                .mpc-field-full { grid-column: 1 / -1; }
                .mpc-field { display: flex; flex-direction: column; gap: 6px; }
                .mpc-field label {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--mpc-text-primary);
                }
                .mpc-required { color: var(--mpc-red); margin-left: 2px; }

                .mpc-input, .mpc-textarea {
                    width: 100%;
                    padding: 9px 12px;
                    border-radius: var(--mpc-radius-md);
                    border: 1.5px solid var(--mpc-border-input);
                    background: var(--mpc-bg-input);
                    color: var(--mpc-text-primary);
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                }
                .mpc-input:hover, .mpc-textarea:hover { border-color: #b9c4d6; }
                .mpc-input::placeholder, .mpc-textarea::placeholder { color: #a7afc0; }
                .mpc-input:focus, .mpc-textarea:focus {
                    border-color: var(--mpc-accent-1);
                    background: #ffffff;
                    box-shadow: 0 0 0 4px var(--mpc-accent-soft);
                }
                .mpc-input:disabled, .mpc-textarea:disabled {
                    background: var(--mpc-border-soft);
                    color: var(--mpc-text-secondary);
                    cursor: not-allowed;
                }
                .mpc-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }

                .mpc-input-prefix { position: relative; }
                .mpc-input-prefix span {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 13px;
                    color: var(--mpc-text-secondary);
                    pointer-events: none;
                }
                .mpc-input-prefix input { padding-left: 30px; }

                .mpc-input.mpc-input-error, .mpc-textarea.mpc-input-error {
                    border-color: var(--mpc-red);
                }
                .mpc-input.mpc-input-error:focus, .mpc-textarea.mpc-input-error:focus {
                    box-shadow: 0 0 0 4px var(--mpc-red-soft);
                }

                .mpc-error-text { font-size: 12px; color: var(--mpc-red); }

                .mpc-checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: var(--mpc-bg-input);
                    border: 1.5px solid var(--mpc-border-input);
                    border-radius: var(--mpc-radius-md);
                }
                .mpc-checkbox-row input[type="checkbox"] {
                    width: 17px;
                    height: 17px;
                    accent-color: var(--mpc-accent-1);
                    cursor: pointer;
                }
                .mpc-checkbox-row label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--mpc-text-primary);
                    cursor: pointer;
                }

                .mpc-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 4px;
                    padding-top: 12px;
                    border-top: 1px solid var(--mpc-border-soft);
                }

                .mpc-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    border: none; border-radius: var(--mpc-radius-md); padding: 9px 18px;
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    transition: transform 0.05s ease, filter 0.15s ease, box-shadow 0.15s ease;
                }
                .mpc-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
                .mpc-btn:active:not(:disabled) { transform: translateY(0); }
                .mpc-btn-primary {
                    background: linear-gradient(135deg, var(--mpc-accent-2), var(--mpc-accent-1));
                    color: #ffffff;
                    box-shadow: 0 14px 26px -12px rgba(5, 150, 105, 0.55);
                }
                .mpc-btn-primary:hover:not(:disabled) {
                    filter: brightness(1.05);
                    transform: translateY(-1px);
                    box-shadow: 0 18px 30px -12px rgba(5, 150, 105, 0.6);
                }
                .mpc-btn-secondary {
                    background: #ffffff;
                    color: var(--mpc-text-secondary);
                    border: 1.5px solid var(--mpc-border-input);
                }
                .mpc-btn-secondary:hover:not(:disabled) {
                    border-color: #b9c4d6;
                    color: var(--mpc-text-primary);
                    box-shadow: 0 6px 16px -8px rgba(15, 23, 42, 0.18);
                }

                .mpc-input:focus-visible, .mpc-textarea:focus-visible, .mpc-btn:focus-visible {
                    outline: 2px solid var(--mpc-accent-2);
                    outline-offset: 2px;
                }

                @media (max-width: 640px) {
                    .mpc-page { padding: 20px 16px 28px; }
                    .mpc-title { font-size: 22px; }
                    .mpc-form-grid { grid-template-columns: 1fr; }
                    .mpc-form-card { padding: 18px 16px; border-radius: 18px; }
                    .mpc-form-actions { flex-direction: column-reverse; }
                    .mpc-btn { width: 100%; text-align: center; }
                }
            `}</style>

            <div className="mpc-inner">
                <button className="mpc-back-link" onClick={() => navigate("/admin/packages")}>
                    ← Quay lại danh sách
                </button>

                <div className="mpc-breadcrumb">
                    <Link to="/admin/packages">Gói tập</Link> / Tạo mới
                </div>

                <div className="mpc-header">
                    <span className="mpc-eyebrow">Gói tập mới</span>
                    <h1 className="mpc-title">Tạo gói tập</h1>
                    <p className="mpc-subtitle">Điền thông tin để thêm gói tập mới vào danh sách bán</p>
                </div>

                {banner && (
                    <div className={`mpc-banner mpc-banner-${banner.type}`}>
                        <div>{banner.message}</div>
                    </div>
                )}

                <form className="mpc-form-card" onSubmit={handleSubmit} noValidate>
                    <div className="mpc-form-grid">
                        <div className="mpc-field mpc-field-full">
                            <label htmlFor="planName">
                                Tên gói tập <span className="mpc-required">*</span>
                            </label>
                            <input
                                id="planName"
                                type="text"
                                className={`mpc-input ${errors.planName ? "mpc-input-error" : ""}`}
                                placeholder="VD: Gói tập 3 tháng"
                                value={form.planName}
                                onChange={handleChange("planName")}
                                disabled={saving}
                            />
                            {errors.planName && <span className="mpc-error-text">{errors.planName}</span>}
                        </div>

                        <div className="mpc-field">
                            <label htmlFor="price">
                                Giá <span className="mpc-required">*</span>
                            </label>
                            <div className="mpc-input-prefix">
                                <span>đ</span>
                                <input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    className={`mpc-input ${errors.price ? "mpc-input-error" : ""}`}
                                    placeholder="0"
                                    value={form.price}
                                    onChange={handleChange("price")}
                                    disabled={saving}
                                />
                            </div>
                            {errors.price && <span className="mpc-error-text">{errors.price}</span>}
                        </div>

                        <div className="mpc-field">
                            <label htmlFor="durationDays">
                                Thời hạn (ngày) <span className="mpc-required">*</span>
                            </label>
                            <input
                                id="durationDays"
                                type="number"
                                min="1"
                                step="1"
                                className={`mpc-input ${errors.durationDays ? "mpc-input-error" : ""}`}
                                placeholder="VD: 90"
                                value={form.durationDays}
                                onChange={handleChange("durationDays")}
                                disabled={saving}
                            />
                            {errors.durationDays && <span className="mpc-error-text">{errors.durationDays}</span>}
                        </div>

                        <div className="mpc-field mpc-field-full">
                            <label htmlFor="description">Mô tả</label>
                            <textarea
                                id="description"
                                className="mpc-textarea"
                                placeholder="Mô tả quyền lợi, đối tượng phù hợp của gói tập..."
                                value={form.description}
                                onChange={handleChange("description")}
                                disabled={saving}
                            />
                        </div>

                        <div className="mpc-field mpc-field-full">
                            <div className="mpc-checkbox-row">
                                <input
                                    id="isPopular"
                                    type="checkbox"
                                    checked={form.isPopular}
                                    onChange={handleChange("isPopular")}
                                    disabled={saving}
                                />
                                <label htmlFor="isPopular">Đánh dấu là gói tập phổ biến (Popular)</label>
                            </div>
                        </div>
                    </div>

                    <div className="mpc-form-actions">
                        <button
                            type="button"
                            className="mpc-btn mpc-btn-secondary"
                            onClick={() => navigate("/admin/packages")}
                            disabled={saving}
                        >
                            Huỷ
                        </button>
                        <button type="submit" className="mpc-btn mpc-btn-primary" disabled={saving}>
                            {saving ? "Đang lưu…" : "Tạo gói tập"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}