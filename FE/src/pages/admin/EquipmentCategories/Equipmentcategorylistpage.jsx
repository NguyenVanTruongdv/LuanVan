// src/pages/admin/EquipmentCategory/EquipmentCategoryListPage.jsx
//
// Trang danh sách danh mục thiết bị — khớp với EquipmentCategoryController
// (GET /api/EquipmentCategory, PUT /api/EquipmentCategory/{id},
//  DELETE /api/EquipmentCategory/{id}).
//
// - Sửa danh mục: mở modal chỉnh sửa ngay trong trang (không đổi route).
// - Xóa danh mục: có modal xác nhận. BE sẽ trả 400 kèm message nếu danh mục
//   đang có thiết bị sử dụng ("Không thể xóa danh mục vì đang có thiết bị
//   sử dụng") -> FE hiển thị đúng message đó qua toast, không phải lỗi chung.
// - Tạo danh mục mới: sang trang riêng EquipmentCategoryCreatePage.jsx
//   (nút "+ Thêm danh mục" điều hướng qua route create).
// - Theme đồng bộ Navy/Slate/Cyan với các trang quản lý thiết bị khác.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";

// ---------------------------------------------------------------------------
// unwrapList: chuẩn hoá response API về MẢNG, dù BE trả thẳng mảng hay bọc
// trong object dạng { items: [...] }. GET /api/EquipmentCategory hiện trả
// thẳng mảng, nhưng vẫn unwrap phòng hờ để tránh crash nếu BE đổi shape.
// ---------------------------------------------------------------------------
function unwrapList(res) {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.categories)) return res.categories;
    return [];
}

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
    position: relative;
}

.eqm-container { max-width: 960px; margin: 0 auto; }

.eqm-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.eqm-header-titles { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1 1 260px; }
.eqm-header-titles > div { min-width: 0; }
.eqm-header > .eqm-btn-primary { flex-shrink: 0; }
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

.eqm-field { display: flex; flex-direction: column; gap: 6px; }
.eqm-field label { font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--eqm-text-600); }
.eqm-required { color: var(--eqm-danger); }

.eqm-input, .eqm-textarea {
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit;
}
.eqm-input:focus, .eqm-textarea:focus { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-input::placeholder, .eqm-textarea::placeholder { color: var(--eqm-text-400); }
.eqm-textarea { min-height: 88px; resize: vertical; }
.eqm-field-error { font-size: 12px; color: var(--eqm-danger); }

.eqm-search-bar {
    display: flex; gap: 12px; align-items: flex-end;
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    padding: 16px 20px; margin-bottom: 20px; border: 1px solid var(--eqm-border);
}
.eqm-search-bar .eqm-field { flex: 1; min-width: 0; }

/* ---------- Danh sách dạng LIST ---------- */
.eqm-list {
    display: flex; flex-direction: column;
    background: var(--eqm-surface); border-radius: var(--eqm-radius);
    box-shadow: var(--eqm-shadow); border: 1px solid var(--eqm-border);
    overflow: hidden;
}

.eqm-list-header, .eqm-list-row {
    display: grid;
    grid-template-columns: minmax(160px, 1.4fr) minmax(200px, 2fr) 88px 170px;
    align-items: center; gap: 16px; padding: 14px 20px;
}
.eqm-list-header {
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    color: var(--eqm-text-400); background: var(--eqm-surface-muted);
    border-bottom: 1px solid var(--eqm-border);
}
.eqm-list-row { border-bottom: 1px solid var(--eqm-border); transition: background 0.12s ease, opacity 0.15s ease; }
.eqm-list-row:last-child { border-bottom: none; }
.eqm-list-row:hover { background: var(--eqm-surface-hover); }
.eqm-list-row-busy { opacity: 0.55; pointer-events: none; }

.eqm-list-name { font-size: 14.5px; font-weight: 700; color: var(--eqm-text-900); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-list-desc { font-size: 13px; color: var(--eqm-text-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-list-desc-empty { color: var(--eqm-text-400); font-style: italic; }
.eqm-list-cell-label { display: none; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--eqm-text-400); }

.eqm-badge { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; display: inline-flex; }
.eqm-badge-count { background: var(--eqm-cyan-100); color: var(--eqm-cyan-500); }

.eqm-list-actions { display: flex; gap: 8px; justify-content: flex-end; }
.eqm-list-actions .eqm-btn { padding: 7px 12px; font-size: 12.5px; }

.eqm-skeleton-row {
    height: 64px;
    background: linear-gradient(100deg, var(--eqm-surface-muted) 30%, var(--eqm-surface-hover) 50%, var(--eqm-surface-muted) 70%);
    background-size: 200% 100%; animation: eqm-shimmer 1.3s ease-in-out infinite;
    border-bottom: 1px solid var(--eqm-border);
}
.eqm-skeleton-row:last-child { border-bottom: none; }
@keyframes eqm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.eqm-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px;
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    border: 1px solid var(--eqm-border);
    padding: 48px 20px; color: var(--eqm-text-400);
}
.eqm-state strong { color: var(--eqm-text-900); font-size: 15px; }
.eqm-state-error strong { color: var(--eqm-danger); }

/* ---------- Toast ---------- */
.eqm-toast-stack {
    position: fixed; top: 20px; right: 20px; z-index: 100;
    display: flex; flex-direction: column; gap: 10px; max-width: 340px;
}
.eqm-toast {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: var(--eqm-radius-sm); box-shadow: var(--eqm-shadow);
    font-size: 13.5px; font-weight: 500; color: #fff;
    animation: eqm-toast-in 0.18s ease-out;
}
.eqm-toast-success { background: #0f3d33; border: 1px solid rgba(52, 211, 153, 0.4); color: #7be8c6; }
.eqm-toast-error { background: #3d1414; border: 1px solid rgba(248, 113, 113, 0.4); color: #ffb3b3; }
@keyframes eqm-toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

/* ---------- Modal (dùng chung cho confirm xóa + form sửa) ---------- */
.eqm-modal-overlay {
    position: fixed; inset: 0; background: rgba(4, 8, 18, 0.6); z-index: 90;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: eqm-fade-in 0.15s ease-out;
}
@keyframes eqm-fade-in { from { opacity: 0; } to { opacity: 1; } }
.eqm-modal {
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    border: 1px solid var(--eqm-border);
    padding: 22px; max-width: 420px; width: 100%;
}
.eqm-modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--eqm-text-900); }
.eqm-modal p { margin: 0 0 20px; font-size: 13.5px; color: var(--eqm-text-600); line-height: 1.5; }
.eqm-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.eqm-modal-fields { display: flex; flex-direction: column; gap: 16px; }

/* ================= RESPONSIVE ================= */
@media (max-width: 720px) {
    .eqm-page { padding: 20px 16px 48px; }
    .eqm-header { align-items: flex-start; }
    .eqm-header-titles { flex: 1 1 100%; }
    .eqm-header > .eqm-btn-primary { width: 100%; }
    .eqm-search-bar { flex-direction: column; align-items: stretch; }

    .eqm-list-header { display: none; }
    .eqm-list-row {
        display: flex; flex-wrap: wrap; align-items: flex-start;
        gap: 6px 14px; padding: 14px 16px;
    }
    .eqm-list-name { flex: 1 1 100%; white-space: normal; }
    .eqm-list-desc { flex: 1 1 100%; white-space: normal; }
    .eqm-badge { order: 3; }
    .eqm-list-actions { order: 4; flex: 1 1 100%; margin-top: 8px; }
    .eqm-list-actions .eqm-btn { flex: 1; }

    .eqm-toast-stack { left: 14px; right: 14px; max-width: none; top: 14px; }
    .eqm-modal { padding: 18px; }
}
`;

function ToastStack({ toasts }) {
    if (toasts.length === 0) return null;
    return (
        <div className="eqm-toast-stack">
            {toasts.map((t) => (
                <div key={t.id} className={`eqm-toast eqm-toast-${t.type}`}>
                    {t.type === "success" ? "✅" : "⚠️"} {t.message}
                </div>
            ))}
        </div>
    );
}

function ConfirmDeleteModal({ open, category, onConfirm, onCancel, busy }) {
    if (!open) return null;
    return (
        <div className="eqm-modal-overlay" onClick={busy ? undefined : onCancel}>
            <div className="eqm-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Xóa danh mục?</h3>
                <p>
                    "{category?.categoryName}" sẽ bị xóa vĩnh viễn. Nếu danh mục đang có
                    thiết bị sử dụng, hệ thống sẽ từ chối và không xóa được.
                </p>
                <div className="eqm-modal-actions">
                    <button className="eqm-btn eqm-btn-secondary" onClick={onCancel} disabled={busy}>
                        Huỷ
                    </button>
                    <button className="eqm-btn eqm-btn-danger" onClick={onConfirm} disabled={busy}>
                        {busy ? "Đang xóa..." : "Xóa danh mục"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EditCategoryModal({ open, category, onSaved, onCancel, pushToast }) {
    const [form, setForm] = useState({ categoryName: "", description: "" });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (category) {
            setForm({
                categoryName: category.categoryName ?? "",
                description: category.description ?? "",
            });
            setErrors({});
        }
    }, [category]);

    if (!open) return null;

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
        if (!validate()) return;

        setSubmitting(true);
        try {
            await adminApi.updateEquipmentCategory(category.categoryId, {
                categoryName: form.categoryName.trim(),
                description: form.description,
            });
            onSaved(`Đã cập nhật danh mục "${form.categoryName.trim()}".`);
        } catch (err) {
            console.error("Lỗi cập nhật danh mục:", err?.response?.status, err?.response?.data, err);
            pushToast(
                "error",
                err?.response?.data?.message || err?.response?.data || "Không cập nhật được danh mục."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="eqm-modal-overlay" onClick={submitting ? undefined : onCancel}>
            <div className="eqm-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Sửa danh mục</h3>
                <form onSubmit={handleSubmit}>
                    <div className="eqm-modal-fields">
                        <div className="eqm-field">
                            <label htmlFor="eqm-cat-name">
                                Tên danh mục <span className="eqm-required">*</span>
                            </label>
                            <input
                                id="eqm-cat-name"
                                className="eqm-input"
                                placeholder="VD: Máy chạy bộ"
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
                                placeholder="Mô tả ngắn về danh mục (không bắt buộc)..."
                                value={form.description}
                                onChange={(e) => setField("description", e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="eqm-modal-actions">
                        <button type="button" className="eqm-btn eqm-btn-secondary" onClick={onCancel} disabled={submitting}>
                            Huỷ
                        </button>
                        <button type="submit" className="eqm-btn eqm-btn-primary" disabled={submitting}>
                            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EquipmentCategoryListPage() {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");

    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);
    const pushToast = useCallback((type, message) => {
        const id = ++toastIdRef.current;
        setToasts((t) => [...t, { id, type, message }]);
        setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3200);
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getEquipmentCategories();
            setCategories(unwrapList(data));
        } catch (err) {
            console.error("Lỗi tải danh mục thiết bị:", err?.response?.status, err?.response?.data, err);
            setError(
                err?.response?.data?.message || "Không tải được danh sách danh mục. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = categories.filter((c) =>
        (c.categoryName ?? "").toLowerCase().includes(search.trim().toLowerCase())
    );

    const handleSaved = (message) => {
        setEditTarget(null);
        fetchCategories();
        if (message) pushToast("success", message);
    };

    const confirmDelete = async () => {
        const category = deleteTarget;
        if (!category) return;

        setDeleteBusy(true);
        try {
            await adminApi.deleteEquipmentCategory(category.categoryId);
            setCategories((prev) => prev.filter((c) => c.categoryId !== category.categoryId));
            pushToast("success", `Đã xóa danh mục "${category.categoryName}".`);
            setDeleteTarget(null);
        } catch (err) {
            console.error("Lỗi xóa danh mục:", err?.response?.status, err?.response?.data, err);
            // BE trả 400 kèm message dạng text thuần khi danh mục còn thiết bị
            // sử dụng (BadRequest(ex.Message)) -> ưu tiên đọc trực tiếp data.
            const serverMessage =
                typeof err?.response?.data === "string"
                    ? err.response.data
                    : err?.response?.data?.message;
            pushToast("error", serverMessage || "Không xóa được danh mục. Vui lòng thử lại.");
        } finally {
            setDeleteBusy(false);
        }
    };

    const skeletons = Array.from({ length: 5 });

    return (
        <div className="eqm-page">
            <style>{CAT_STYLES}</style>
            <ToastStack toasts={toasts} />

            <ConfirmDeleteModal
                open={Boolean(deleteTarget)}
                category={deleteTarget}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                busy={deleteBusy}
            />

            <EditCategoryModal
                open={Boolean(editTarget)}
                category={editTarget}
                onSaved={handleSaved}
                onCancel={() => setEditTarget(null)}
                pushToast={pushToast}
            />

            <div className="eqm-container">
                <div className="eqm-header">
                    <div className="eqm-header-titles">
                        <span className="eqm-header-icon" aria-hidden="true">🗂️</span>
                        <div>
                            <h1>Danh mục thiết bị</h1>
                            <p>Quản lý các danh mục dùng để phân loại thiết bị</p>
                        </div>
                    </div>
                    <button
                        className="eqm-btn eqm-btn-primary"
                        onClick={() => navigate("/admin/equipment-type-create")}
                    >
                        + Thêm danh mục
                    </button>
                </div>

                <div className="eqm-search-bar">
                    <div className="eqm-field">
                        <label htmlFor="eqm-cat-search">Tìm danh mục</label>
                        <input
                            id="eqm-cat-search"
                            className="eqm-input"
                            placeholder="Tìm theo tên danh mục..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading && (
                    <div className="eqm-list">
                        {skeletons.map((_, i) => (
                            <div className="eqm-skeleton-row" key={i} />
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="eqm-state eqm-state-error">
                        <strong>Đã có lỗi xảy ra</strong>
                        <span>{error}</span>
                        <button className="eqm-btn eqm-btn-secondary" onClick={fetchCategories} style={{ marginTop: 8 }}>
                            Thử lại
                        </button>
                    </div>
                )}

                {!loading && !error && filteredCategories.length === 0 && (
                    <div className="eqm-state">
                        <strong>Không tìm thấy danh mục nào</strong>
                        <span>Thử tìm với từ khóa khác, hoặc thêm danh mục mới.</span>
                    </div>
                )}

                {!loading && !error && filteredCategories.length > 0 && (
                    <div className="eqm-list">
                        <div className="eqm-list-header">
                            <span>Tên danh mục</span>
                            <span>Mô tả</span>
                            <span>Số TB</span>
                            <span></span>
                        </div>
                        {filteredCategories.map((cat) => (
                            <div className="eqm-list-row" key={cat.categoryId}>
                                <span className="eqm-list-name">{cat.categoryName}</span>
                                <span className={`eqm-list-desc ${!cat.description ? "eqm-list-desc-empty" : ""}`}>
                                    {cat.description || "Không có mô tả"}
                                </span>
                                <span>
                                    {typeof cat.equipmentCount === "number" ? (
                                        <span className="eqm-badge eqm-badge-count">{cat.equipmentCount}</span>
                                    ) : (
                                        <span className="eqm-list-desc-empty">—</span>
                                    )}
                                </span>
                                <div className="eqm-list-actions">
                                    <button className="eqm-btn eqm-btn-secondary" onClick={() => setEditTarget(cat)}>
                                        Sửa
                                    </button>
                                    <button className="eqm-btn eqm-btn-danger" onClick={() => setDeleteTarget(cat)}>
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}