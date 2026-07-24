import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";
const STYLES = `
:root {
  --mp-bg: #0b1120;
  --mp-panel: #1e293b;
  --mp-border: #334155;
  --mp-accent: #06b6d4;
  --mp-accent-hover: #0891b2;
  --mp-accent-soft: rgba(6, 182, 212, 0.12);
  --mp-text-title: #f1f5f9;
  --mp-text-sub: #94a3b8;
  --mp-text-muted: #64748b;
  --mp-danger: #f87171;
  --mp-danger-soft: rgba(248, 113, 113, 0.12);
  --mp-radius: 10px;
  --mp-radius-sm: 6px;
}
.mp-page { min-height: 100%; background: var(--mp-bg); color: var(--mp-text-title); padding: 28px; font-family: "Inter","Segoe UI",system-ui,-apple-system,sans-serif; box-sizing: border-box; }
.mp-page * { box-sizing: border-box; }
.mp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.mp-header-titles h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: var(--mp-text-title); letter-spacing: -0.01em; }
.mp-header-titles p { margin: 0; font-size: 13.5px; color: var(--mp-text-sub); }
.mp-breadcrumb { font-size: 12.5px; color: var(--mp-text-muted); margin-bottom: 6px; }
.mp-breadcrumb a { color: var(--mp-text-sub); text-decoration: none; }
.mp-breadcrumb a:hover { color: var(--mp-accent); }
.mp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: var(--mp-radius-sm); border: 1px solid var(--mp-border); background: transparent; color: var(--mp-text-title); font-size: 13.5px; font-weight: 600; padding: 9px 16px; cursor: pointer; transition: background .15s, border-color .15s, color .15s, transform .05s; white-space: nowrap; }
.mp-btn:hover { border-color: var(--mp-accent); color: var(--mp-accent); }
.mp-btn:active { transform: translateY(1px); }
.mp-btn:disabled { opacity: .55; cursor: not-allowed; }
.mp-btn-primary { background: var(--mp-accent); border-color: var(--mp-accent); color: #06202a; }
.mp-btn-primary:hover { background: var(--mp-accent-hover); border-color: var(--mp-accent-hover); color: #06202a; }
.mp-error-banner { background: var(--mp-danger-soft); border: 1px solid rgba(248,113,113,.35); color: var(--mp-danger); border-radius: var(--mp-radius-sm); padding: 12px 14px; font-size: 13px; margin-bottom: 16px; }

.mp-form { background: var(--mp-panel); border: 1px solid var(--mp-border); border-radius: var(--mp-radius); padding: 26px; max-width: 640px; }
.mp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.mp-form-field { display: flex; flex-direction: column; gap: 6px; }
.mp-form-field.mp-span-2 { grid-column: 1 / -1; }
.mp-form-field label { font-size: 12.5px; font-weight: 600; color: var(--mp-text-sub); }
.mp-required { color: var(--mp-danger); margin-left: 2px; }
.mp-input, .mp-textarea { width: 100%; background: var(--mp-bg); border: 1px solid var(--mp-border); border-radius: var(--mp-radius-sm); color: var(--mp-text-title); font-size: 13.5px; padding: 10px 12px; outline: none; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
.mp-textarea { resize: vertical; min-height: 96px; line-height: 1.55; }
.mp-input:focus, .mp-textarea:focus { border-color: var(--mp-accent); box-shadow: 0 0 0 3px var(--mp-accent-soft); }
.mp-input.mp-input-error, .mp-textarea.mp-input-error { border-color: var(--mp-danger); }
.mp-input.mp-input-error:focus, .mp-textarea.mp-input-error:focus { box-shadow: 0 0 0 3px var(--mp-danger-soft); }
.mp-field-error { font-size: 12px; color: var(--mp-danger); }
.mp-input-prefix { position: relative; }
.mp-input-prefix span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--mp-text-muted); }
.mp-input-prefix input { padding-left: 32px; }
.mp-checkbox-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.mp-checkbox-row input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--mp-accent); cursor: pointer; }
.mp-checkbox-row label { font-size: 13.5px; color: var(--mp-text-title); cursor: pointer; }
.mp-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--mp-border); }

@media (max-width: 900px) {
  .mp-form-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mp-page { padding: 16px; }
  .mp-header { flex-direction: column; align-items: stretch; }
  .mp-header-titles h1 { font-size: 19px; }
  .mp-form { padding: 18px; }
}
`;

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
    const [submitError, setSubmitError] = useState("");

    const handleChange = (field) => (e) => {
        const value = field === "isPopular" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError("");

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
            navigate("/admin/packages");
        } catch (err) {
            setSubmitError(err?.response?.data?.message || "Tạo gói tập thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mp-page">
            <style>{STYLES}</style>

            <div className="mp-breadcrumb">
                <Link to="/admin/packages">Gói tập</Link> / Tạo mới
            </div>

            <div className="mp-header">
                <div className="mp-header-titles">
                    <h1>Tạo gói tập mới</h1>
                    <p>Điền thông tin để thêm gói tập mới vào danh sách bán.</p>
                </div>
            </div>

            {submitError && <div className="mp-error-banner">{submitError}</div>}

            <form className="mp-form" onSubmit={handleSubmit} noValidate>
                <div className="mp-form-grid">
                    <div className="mp-form-field mp-span-2">
                        <label htmlFor="planName">
                            Tên gói tập<span className="mp-required">*</span>
                        </label>
                        <input
                            id="planName"
                            type="text"
                            className={`mp-input ${errors.planName ? "mp-input-error" : ""}`}
                            placeholder="VD: Gói tập 3 tháng"
                            value={form.planName}
                            onChange={handleChange("planName")}
                            disabled={saving}
                        />
                        {errors.planName && <span className="mp-field-error">{errors.planName}</span>}
                    </div>

                    <div className="mp-form-field">
                        <label htmlFor="price">
                            Giá<span className="mp-required">*</span>
                        </label>
                        <div className="mp-input-prefix">
                            <span>đ</span>
                            <input
                                id="price"
                                type="number"
                                min="0"
                                step="1000"
                                className={`mp-input ${errors.price ? "mp-input-error" : ""}`}
                                placeholder="0"
                                value={form.price}
                                onChange={handleChange("price")}
                                disabled={saving}
                            />
                        </div>
                        {errors.price && <span className="mp-field-error">{errors.price}</span>}
                    </div>

                    <div className="mp-form-field">
                        <label htmlFor="durationDays">
                            Thời hạn (ngày)<span className="mp-required">*</span>
                        </label>
                        <input
                            id="durationDays"
                            type="number"
                            min="1"
                            step="1"
                            className={`mp-input ${errors.durationDays ? "mp-input-error" : ""}`}
                            placeholder="VD: 90"
                            value={form.durationDays}
                            onChange={handleChange("durationDays")}
                            disabled={saving}
                        />
                        {errors.durationDays && <span className="mp-field-error">{errors.durationDays}</span>}
                    </div>

                    <div className="mp-form-field mp-span-2">
                        <label htmlFor="description">Mô tả</label>
                        <textarea
                            id="description"
                            className="mp-textarea"
                            placeholder="Mô tả quyền lợi, đối tượng phù hợp của gói tập..."
                            value={form.description}
                            onChange={handleChange("description")}
                            disabled={saving}
                        />
                    </div>

                    <div className="mp-form-field mp-span-2">
                        <div className="mp-checkbox-row">
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

                <div className="mp-form-actions">
                    <button type="button" className="mp-btn" onClick={() => navigate("/admin/packages")} disabled={saving}>
                        Hủy
                    </button>
                    <button type="submit" className="mp-btn mp-btn-primary" disabled={saving}>
                        {saving ? "Đang lưu..." : "Tạo gói tập"}
                    </button>
                </div>
            </form>
        </div>
    );
}