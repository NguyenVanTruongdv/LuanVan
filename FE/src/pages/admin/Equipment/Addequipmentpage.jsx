// src/pages/manager/Equiment/AddEquipmentPage.jsx
//
// Trang thêm thiết bị mới — khớp với EquipmentService.CreateAsync.
// - Admin: chọn branchId tự do trong danh sách chi nhánh (vẫn được BE validate tồn tại).
// - Manager: chỉ được chọn trong các chi nhánh mình quản lý (managedBranches).
// - Staff/Guest: không có quyền, nên chặn truy cập trang này ở phía route (không xử lý ở đây).
//
// FIX: "TypeError: branches.map is not a function"
// managerApi.getEquipmentCategories() / managerApi.getBranches() không trả
// thẳng về MẢNG mà trả về OBJECT dạng { items: [...] } (giống hệt bug đã
// gặp ở EquipmentListPage.jsx). Code cũ gán thẳng response vào state
// (setBranches(brs ?? [])) rồi gọi .map() trong <select> -> crash.
// => Thêm hàm unwrapList() để luôn chuẩn hoá response về mảng trước khi
//    setState, dù BE trả mảng thẳng hay bọc trong { items }/{ data }/...
//
// FIX: file này thực tế nằm ở src/pages/manager/Equiment/AddEquipmentPage.jsx
// (có thêm cấp "manager/"), nên phải lùi ĐÚNG 3 cấp tới src/ rồi vào api/managerApi:
// "../../../api/managerApi".
//
// STYLE: đồng bộ giao diện với NewsCreateOfAdmin.jsx — khung viền emerald bo tròn,
// tiêu đề Source Serif 4, form card trắng, input nền xám nhạt bo tròn.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// ---------------------------------------------------------------------------
// unwrapList: chuẩn hoá mọi response API về dạng MẢNG, bất kể BE trả thẳng
// mảng (`[...]`) hay bọc trong object phân trang (`{ items: [...] }`,
// `{ data: [...] }`,...). Luôn trả về mảng để .map() không bao giờ crash,
// kể cả khi API lỗi/null/undefined.
// ---------------------------------------------------------------------------
function unwrapList(res) {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.branches)) return res.branches;
    if (res && Array.isArray(res.categories)) return res.categories;
    if (res && Array.isArray(res.equipments)) return res.equipments;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
}

const MAX_IMAGE_MB = 5;

export default function AddEquipmentPageOfAdmin() {
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

            // getEquipmentCategories() / getBranches() có thể trả thẳng mảng
            // hoặc trả object phân trang { items: [...] } tuỳ endpoint ->
            // luôn unwrapList() trước khi setState để tránh crash ở .map().
            const [catsRaw, brsRaw] = await Promise.all([
                managerApi.getEquipmentCategories().catch(() => []),
                profile.role === "Manager"
                    ? Promise.resolve(profile.branches ?? [])
                    : managerApi.getBranches().catch(() => []),
            ]);

            let branchList = unwrapList(brsRaw);
            // Trường hợp Manager: nếu profile.branches rỗng/không hợp lệ,
            // thử gọi API /branches như fallback rồi unwrap tiếp.
            if (profile.role === "Manager" && branchList.length === 0) {
                const fallbackBrs = await managerApi.getBranches().catch(() => []);
                branchList = unwrapList(fallbackBrs);
            }

            setCategories(unwrapList(catsRaw));
            setBranches(branchList);
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');

                .eqm-page {
                    /* ---- palette : white page, bold framed border, editorial emerald ---- */
                    --eqm-page-bg: #ffffff;
                    --eqm-frame-border: #0f766e;
                    --eqm-bg-card: #ffffff;
                    --eqm-bg-input: #f7faf9;
                    --eqm-border-soft: #dceee7;
                    --eqm-border-input: #dbe4e0;
                    --eqm-text-primary: #101815;
                    --eqm-text-secondary: #6b756f;

                    --eqm-accent-1: #047857;
                    --eqm-accent-2: #10b981;
                    --eqm-accent-soft: #d7f3e3;
                    --eqm-red: #e11d48;
                    --eqm-red-soft: rgba(225, 29, 72, 0.08);
                    --eqm-green-soft: rgba(5, 150, 105, 0.08);

                    --eqm-radius-lg: 20px;
                    --eqm-radius-md: 12px;

                    --eqm-shadow-card:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 14px 30px -14px rgba(4, 120, 87, 0.22),
                        0 30px 60px -30px rgba(15, 23, 42, 0.16);

                    min-height: 100%;
                    margin: 0 auto;
                    padding: 16px;
                    background: var(--eqm-page-bg);
                    color: var(--eqm-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    box-sizing: border-box;
                }

                .eqm-inner {
                    max-width: 760px;
                    margin: 0 auto;
                    padding: 18px;
                    border: 2px solid var(--eqm-frame-border);
                    border-radius: 20px;
                    background:
                        radial-gradient(600px 260px at 100% 0%, rgba(16, 185, 129, 0.07), transparent 70%),
                        #ffffff;
                    box-shadow:
                        0 0 0 6px rgba(16, 185, 129, 0.08),
                        0 30px 60px -30px rgba(4, 120, 87, 0.35);
                }

                .eqm-back-link {
                    background: none;
                    border: none;
                    color: var(--eqm-accent-1);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 0;
                    margin-bottom: 14px;
                }
                .eqm-back-link:hover { text-decoration: underline; filter: brightness(1.1); }

                .eqm-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    padding: 3px 9px;
                    border-radius: 999px;
                    background: var(--eqm-accent-soft);
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    color: var(--eqm-accent-1);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .eqm-header { margin-bottom: 14px; }

                .eqm-title {
                    margin: 0 0 4px;
                    font-family: "Source Serif 4", Georgia, serif;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    color: var(--eqm-text-primary);
                }

                .eqm-subtitle {
                    margin: 0;
                    font-size: 12.5px;
                    color: var(--eqm-text-secondary);
                }

                .eqm-banner {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: var(--eqm-radius-md);
                    padding: 11px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 14px;
                }
                .eqm-banner-error {
                    background: var(--eqm-red-soft);
                    border: 1px solid rgba(225, 29, 72, 0.22);
                    color: var(--eqm-red);
                }
                .eqm-banner-success {
                    background: var(--eqm-green-soft);
                    border: 1px solid rgba(5, 150, 105, 0.22);
                    color: var(--eqm-accent-1);
                }
                .eqm-banner-actions { margin-top: 8px; display: flex; gap: 8px; }
                .eqm-banner-link {
                    background: none; border: none; padding: 0; font: inherit;
                    font-weight: 700; text-decoration: underline; cursor: pointer; color: inherit;
                }

                .eqm-form-card {
                    position: relative;
                    background: var(--eqm-bg-card);
                    border: 1.5px solid var(--eqm-border-soft);
                    border-radius: var(--eqm-radius-lg);
                    box-shadow: var(--eqm-shadow-card);
                    padding: 18px 20px;
                    overflow: hidden;
                }
                .eqm-form-card::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--eqm-accent-1), var(--eqm-accent-2) 60%, #6ee7b7);
                }

                .eqm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
                .eqm-field-full { grid-column: 1 / -1; }
                .eqm-field { display: flex; flex-direction: column; gap: 6px; }
                .eqm-field label {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--eqm-text-primary);
                }
                .eqm-required { color: var(--eqm-red); }

                .eqm-input, .eqm-select, .eqm-textarea {
                    width: 100%;
                    padding: 9px 12px;
                    border-radius: var(--eqm-radius-md);
                    border: 1.5px solid var(--eqm-border-input);
                    background: var(--eqm-bg-input);
                    color: var(--eqm-text-primary);
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                    box-sizing: border-box;
                }
                .eqm-input:hover, .eqm-select:hover, .eqm-textarea:hover { border-color: #b9c4d6; }
                .eqm-input::placeholder, .eqm-textarea::placeholder { color: #a7afc0; }
                .eqm-input:focus, .eqm-select:focus, .eqm-textarea:focus {
                    border-color: var(--eqm-accent-1);
                    background: #ffffff;
                    box-shadow: 0 0 0 4px var(--eqm-accent-soft);
                }
                .eqm-input:disabled, .eqm-select:disabled {
                    background: var(--eqm-border-soft);
                    color: var(--eqm-text-secondary);
                    cursor: not-allowed;
                }
                .eqm-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }

                .eqm-select {
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237c869c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    padding-right: 34px;
                }

                .eqm-error-text { font-size: 12px; color: var(--eqm-red); }
                .eqm-hint-text { font-size: 12px; color: var(--eqm-text-secondary); }

                .eqm-dropzone {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    border: 1.5px dashed var(--eqm-border-soft);
                    border-radius: var(--eqm-radius-md);
                    padding: 14px;
                    cursor: pointer;
                    background: var(--eqm-bg-input);
                    transition: border-color 0.15s ease, background 0.15s ease;
                }
                .eqm-dropzone:hover { border-color: var(--eqm-accent-1); }
                .eqm-dropzone-active { border-color: var(--eqm-accent-1); background: var(--eqm-accent-soft); }
                .eqm-dropzone-preview {
                    display: flex; align-items: center; justify-content: center;
                    width: 52px; height: 52px; border-radius: 10px; overflow: hidden;
                    background: #ffffff; box-shadow: inset 0 0 0 1px var(--eqm-border-input); flex-shrink: 0;
                }
                .eqm-dropzone-preview img { width: 100%; height: 100%; object-fit: cover; }
                .eqm-dropzone-text { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
                .eqm-dropzone-text strong { color: var(--eqm-text-primary); font-size: 13.5px; }
                .eqm-dropzone-text span { color: var(--eqm-text-secondary); font-size: 12px; }

                .eqm-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 4px;
                    padding-top: 12px;
                    border-top: 1px solid var(--eqm-border-soft);
                }

                .eqm-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    border: none; border-radius: var(--eqm-radius-md); padding: 9px 18px;
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    transition: transform 0.05s ease, filter 0.15s ease, box-shadow 0.15s ease;
                }
                .eqm-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }
                .eqm-btn:active:not(:disabled) { transform: translateY(0); }
                .eqm-btn-primary {
                    background: linear-gradient(135deg, var(--eqm-accent-2), var(--eqm-accent-1));
                    color: #ffffff;
                    box-shadow: 0 14px 26px -12px rgba(5, 150, 105, 0.55);
                }
                .eqm-btn-primary:hover:not(:disabled) {
                    filter: brightness(1.05);
                    transform: translateY(-1px);
                    box-shadow: 0 18px 30px -12px rgba(5, 150, 105, 0.6);
                }
                .eqm-btn-secondary {
                    background: #ffffff;
                    color: var(--eqm-text-secondary);
                    border: 1.5px solid var(--eqm-border-input);
                }
                .eqm-btn-secondary:hover:not(:disabled) {
                    border-color: #b9c4d6;
                    color: var(--eqm-text-primary);
                    box-shadow: 0 6px 16px -8px rgba(15, 23, 42, 0.18);
                }

                .eqm-input:focus-visible, .eqm-select:focus-visible, .eqm-textarea:focus-visible,
                .eqm-btn:focus-visible {
                    outline: 2px solid var(--eqm-accent-2);
                    outline-offset: 2px;
                }

                @media (max-width: 640px) {
                    .eqm-page { padding: 20px 16px 28px; }
                    .eqm-title { font-size: 22px; }
                    .eqm-form-grid { grid-template-columns: 1fr; }
                    .eqm-form-card { padding: 18px 16px; border-radius: 18px; }
                    .eqm-form-actions { flex-direction: column-reverse; }
                    .eqm-btn { width: 100%; text-align: center; }
                }
            `}</style>

            <div className="eqm-inner">
                <button className="eqm-back-link" onClick={() => navigate("/manager/equipment")}>
                    ← Quay lại danh sách
                </button>

                <div className="eqm-header">
                    <span className="eqm-eyebrow">Thiết bị mới</span>
                    <h1 className="eqm-title">Thêm thiết bị</h1>
                    <p className="eqm-subtitle">Điền thông tin thiết bị và tải ảnh minh hoạ (nếu có)</p>
                </div>

                {banner && (
                    <div className={`eqm-banner eqm-banner-${banner.type}`}>
                        <div>
                            {banner.message}
                            {loadError && banner.type === "error" && (
                                <div className="eqm-banner-actions">
                                    <button className="eqm-banner-link" onClick={loadOptions}>
                                        Thử lại
                                    </button>
                                </div>
                            )}
                        </div>
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
                                        <span style={{ fontSize: 20 }}>📷</span>
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