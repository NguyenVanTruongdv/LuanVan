import { useEffect, useRef, useState } from "react";
import adminApi from "../../../api/adminApi";

const HIM_STYLES = `
/* ==========================================================================
   HomeImageManagement — tông trắng + xanh lá nhạt
   ========================================================================== */

.him-page {
    --him-green-50:  #f2faf5;
    --him-green-100: #e2f5e9;
    --him-green-200: #c9ecd6;
    --him-green-300: #a3ddb8;
    --him-green-400: #74c893;
    --him-green-500: #4cae72;
    --him-green-600: #38935c;
    --him-green-700: #2d754a;
    --him-green-900: #1c4a30;

    --him-ink: #1f2a24;
    --him-muted: #6b7c72;
    --him-border: #e0ece4;
    --him-danger: #d94c4c;
    --him-danger-bg: #fdeceb;

    --him-radius-lg: 18px;
    --him-radius-md: 12px;
    --him-radius-sm: 8px;

    --him-shadow-sm: 0 1px 2px rgba(28, 74, 48, 0.06);
    --him-shadow-md: 0 6px 20px rgba(28, 74, 48, 0.08);
    --him-shadow-lg: 0 12px 32px rgba(28, 74, 48, 0.12);

    max-width: 1280px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    background: linear-gradient(180deg, var(--him-green-50) 0%, #ffffff 220px);
    color: var(--him-ink);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
}

.him-page *,
.him-page *::before,
.him-page *::after {
    box-sizing: border-box;
}

/* ---------------------------------- Header ---------------------------------- */

.him-header {
    margin-bottom: 24px;
}

.him-title {
    margin: 0 0 6px;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--him-green-900);
}

.him-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--him-muted);
}

/* ---------------------------------- Alert ---------------------------------- */

.him-alert {
    padding: 12px 16px;
    border-radius: var(--him-radius-sm);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 20px;
    border: 1px solid transparent;
    animation: him-fade-in 0.2s ease;
}

.him-alert--success {
    background: var(--him-green-100);
    border-color: var(--him-green-300);
    color: var(--him-green-700);
}

.him-alert--error {
    background: var(--him-danger-bg);
    border-color: #f5c6c3;
    color: #a83232;
}

@keyframes him-fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ---------------------------------- Layout grid ---------------------------------- */

.him-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 24px;
    align-items: start;
}

@media (max-width: 900px) {
    .him-grid {
        grid-template-columns: 1fr;
    }
}

/* ---------------------------------- Card ---------------------------------- */

.him-card {
    background: #ffffff;
    border: 1px solid var(--him-border);
    border-radius: var(--him-radius-lg);
    box-shadow: var(--him-shadow-md);
    padding: 24px;
}

.him-card-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: var(--him-green-900);
}

.him-card-hint {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--him-muted);
}

/* ---------------------------------- Upload / Dropzone ---------------------------------- */

.him-upload-card {
    position: sticky;
    top: 24px;
}

@media (max-width: 900px) {
    .him-upload-card {
        position: static;
    }
}

.him-dropzone {
    border: 2px dashed var(--him-green-300);
    border-radius: var(--him-radius-md);
    background: var(--him-green-50);
    padding: 36px 20px;
    text-align: center;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.him-dropzone--active {
    border-color: var(--him-green-500);
    background: var(--him-green-100);
    transform: scale(1.01);
}

.him-dropzone-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--him-green-100);
    color: var(--him-green-600);
    font-size: 20px;
}

.him-dropzone-text {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--him-ink);
}

.him-dropzone-or {
    margin: 8px 0;
    font-size: 12px;
    color: var(--him-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* ---------------------------------- Buttons ---------------------------------- */

.him-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 18px;
    border-radius: var(--him-radius-sm);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
}

.him-btn:active {
    transform: translateY(1px);
}

.him-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.him-btn--primary {
    background: var(--him-green-500);
    color: #ffffff;
    box-shadow: var(--him-shadow-sm);
}

.him-btn--primary:hover:not(:disabled) {
    background: var(--him-green-600);
}

.him-btn--outline {
    background: #ffffff;
    border-color: var(--him-green-300);
    color: var(--him-green-700);
}

.him-btn--outline:hover:not(:disabled) {
    background: var(--him-green-50);
    border-color: var(--him-green-500);
}

.him-btn--ghost {
    background: transparent;
    color: var(--him-muted);
    border-color: var(--him-border);
}

.him-btn--ghost:hover:not(:disabled) {
    background: #f5f7f6;
    color: var(--him-ink);
}

.him-btn--sm {
    padding: 7px 14px;
    font-size: 13px;
}

/* ---------------------------------- List header ---------------------------------- */

.him-list-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

/* ---------------------------------- Table ---------------------------------- */

.him-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--him-border);
    border-radius: var(--him-radius-md);
}

.him-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 680px;
    font-size: 14px;
}

.him-table thead th {
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--him-green-700);
    background: var(--him-green-50);
    padding: 12px 14px;
    border-bottom: 1px solid var(--him-border);
    position: sticky;
    top: 0;
}

.him-table thead th:first-child {
    border-top-left-radius: var(--him-radius-md);
}

.him-table thead th:last-child {
    border-top-right-radius: var(--him-radius-md);
}

.him-table tbody td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--him-border);
    vertical-align: middle;
    color: var(--him-ink);
}

.him-table tbody tr:last-child td {
    border-bottom: none;
}

.him-table tbody tr:hover {
    background: var(--him-green-50);
}

.him-row--dirty {
    background: #fbfdf9;
    box-shadow: inset 3px 0 0 var(--him-green-400);
}

.him-row--pending {
    background: #f6fbf8;
    box-shadow: inset 3px 0 0 var(--him-green-300);
}

.him-col-index {
    width: 40px;
    color: var(--him-muted);
}

.him-col-order {
    width: 110px;
}

.him-col-actions {
    width: 100px;
}

.him-empty {
    text-align: center;
    padding: 40px 16px;
    color: var(--him-muted);
    font-style: italic;
}

/* ---------------------------------- Thumbnail ---------------------------------- */

.him-thumb-wrap {
    position: relative;
    width: 84px;
    height: 56px;
    border-radius: var(--him-radius-sm);
    overflow: hidden;
    box-shadow: var(--him-shadow-sm);
    border: 1px solid var(--him-border);
}

.him-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.him-thumb-replace {
    position: absolute;
    inset: auto 0 0 0;
    border: none;
    background: rgba(28, 74, 48, 0.72);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 0;
    cursor: pointer;
    backdrop-filter: blur(1px);
}

.him-thumb-replace:hover {
    background: rgba(28, 74, 48, 0.88);
}

/* ---------------------------------- Text cell / inputs ---------------------------------- */

.him-text-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 260px;
}

.him-text-title {
    font-weight: 600;
    color: var(--him-ink);
}

.him-text-link {
    font-size: 12px;
    color: var(--him-green-600);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.him-edit-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 200px;
}

.him-input,
.him-select {
    width: 100%;
    font-size: 13px;
    padding: 8px 10px;
    border-radius: var(--him-radius-sm);
    border: 1px solid var(--him-border);
    background: #ffffff;
    color: var(--him-ink);
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.him-input:focus,
.him-select:focus {
    border-color: var(--him-green-400);
    box-shadow: 0 0 0 3px var(--him-green-100);
}

/* ---------------------------------- Badge ---------------------------------- */

.him-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}

.him-badge--on {
    background: var(--him-green-100);
    color: var(--him-green-700);
}

.him-badge--off {
    background: #eef1ef;
    color: var(--him-muted);
}

.him-badge--new {
    background: #fff4d9;
    color: #9a6b00;
}

/* ---------------------------------- Stepper ---------------------------------- */

.him-stepper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--him-green-50);
    border: 1px solid var(--him-border);
    border-radius: 999px;
    padding: 3px;
}

.him-step-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: #ffffff;
    color: var(--him-green-700);
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    box-shadow: var(--him-shadow-sm);
    transition: background 0.15s ease, color 0.15s ease;
}

.him-step-btn:hover {
    background: var(--him-green-500);
    color: #ffffff;
}

.him-step-value {
    min-width: 18px;
    text-align: center;
    font-weight: 600;
    font-size: 13px;
}

/* ---------------------------------- Row actions ---------------------------------- */

.him-row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.him-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--him-radius-sm);
    border: 1px solid var(--him-border);
    background: #ffffff;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.him-icon-btn:hover {
    background: var(--him-green-50);
    border-color: var(--him-green-400);
    color: var(--him-green-700);
}

.him-icon-btn--danger:hover {
    background: var(--him-danger-bg);
    border-color: #f0aeae;
    color: var(--him-danger);
}

/* ---------------------------------- Bottom action bar ---------------------------------- */

.him-actions-bar {
    position: sticky;
    bottom: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding: 14px 18px;
    background: #ffffff;
    border: 1px solid var(--him-border);
    border-radius: var(--him-radius-md);
    box-shadow: var(--him-shadow-lg);
}

/* ---------------------------------- Responsive ---------------------------------- */

@media (max-width: 640px) {
    .him-page {
        padding: 20px 14px 48px;
    }

    .him-title {
        font-size: 22px;
    }

    .him-card {
        padding: 18px;
    }

    .him-list-header {
        flex-direction: column;
        align-items: stretch;
    }

    .him-list-header .him-btn {
        align-self: flex-start;
    }

    .him-actions-bar {
        flex-direction: column-reverse;
        position: static;
    }

    .him-actions-bar .him-btn {
        width: 100%;
    }

    .him-edit-fields {
        min-width: 160px;
    }
}

`;

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

// Ảnh chờ tải lên: chưa gửi API, chỉ tồn tại ở client cho tới khi bấm "Lưu hình ảnh"
function createPendingItem(file, sortOrder) {
    return {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        isPending: true,
        file,
        previewUrl: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, ""),
        linkUrl: "",
        sortOrder,
        status: "Active",
    };
}

export default function HomeImageManagement() {
    const [images, setImages] = useState([]); // ảnh đã có trên server
    const [edits, setEdits] = useState({}); // { [imageId]: { title?, linkUrl?, sortOrder?, status?, file?, previewUrl? } }
    const [pendingItems, setPendingItems] = useState([]); // ảnh mới, chưa upload
    const [editingRowId, setEditingRowId] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
    const fileInputRef = useRef(null);
    const replaceInputRef = useRef(null);
    const replaceTargetId = useRef(null);

    useEffect(() => {
        loadImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadImages() {
        setLoading(true);
        try {
            const data = await adminApi.getAllHomeImages();
            setImages(Array.isArray(data) ? data : data?.items || []);
        } catch (err) {
            setMessage({ type: "error", text: "Không tải được danh sách hình ảnh." });
        } finally {
            setLoading(false);
        }
    }

    function nextSortOrder() {
        return images.length + pendingItems.length + 1;
    }

    function validateFiles(fileList) {
        const valid = [];
        const errors = [];
        Array.from(fileList).forEach((file) => {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: định dạng không hỗ trợ (chỉ JPG, PNG, WEBP).`);
                return;
            }
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                errors.push(`${file.name}: vượt quá ${MAX_SIZE_MB}MB.`);
                return;
            }
            valid.push(file);
        });
        if (errors.length) setMessage({ type: "error", text: errors.join(" ") });
        return valid;
    }

    function addFiles(fileList) {
        const valid = validateFiles(fileList);
        if (!valid.length) return;
        setPendingItems((prev) => {
            let sortOrder = images.length + prev.length + 1;
            const items = valid.map((file) => {
                const item = createPendingItem(file, sortOrder);
                sortOrder += 1;
                return item;
            });
            return [...prev, ...items];
        });
        setMessage(null);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    }

    function handleBrowseChange(e) {
        if (e.target.files?.length) addFiles(e.target.files);
        e.target.value = "";
    }

    function removePendingItem(id) {
        setPendingItems((prev) => {
            const item = prev.find((p) => p.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((p) => p.id !== id);
        });
    }

    function updatePendingField(id, field, value) {
        setPendingItems((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
        );
    }

    function stepPendingSortOrder(id, delta) {
        setPendingItems((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, sortOrder: Math.max(1, p.sortOrder + delta) } : p
            )
        );
    }

    function getExistingValue(image, field) {
        const editValue = edits[image.imageId]?.[field];
        return editValue !== undefined ? editValue : image[field];
    }

    function updateExistingEdit(imageId, field, value) {
        setEdits((prev) => ({
            ...prev,
            [imageId]: { ...prev[imageId], [field]: value },
        }));
    }

    function stepExistingSortOrder(image, delta) {
        const current = getExistingValue(image, "sortOrder") ?? 0;
        updateExistingEdit(image.imageId, "sortOrder", Math.max(1, current + delta));
    }

    function openReplaceDialog(imageId) {
        replaceTargetId.current = imageId;
        replaceInputRef.current?.click();
    }

    function handleReplaceFileChange(e) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const valid = validateFiles([file]);
        if (!valid.length) return;
        const previewUrl = URL.createObjectURL(file);
        updateExistingEdit(replaceTargetId.current, "file", file);
        updateExistingEdit(replaceTargetId.current, "previewUrl", previewUrl);
    }

    function hasUnsavedChanges() {
        return pendingItems.length > 0 || Object.keys(edits).length > 0;
    }

    function discardChanges() {
        pendingItems.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPendingItems([]);
        setEdits({});
        setEditingRowId(null);
        setMessage(null);
    }

    async function handleDeleteExisting(image) {
        if (!window.confirm(`Xóa ảnh "${image.title || "này"}"? Hành động không thể hoàn tác.`)) {
            return;
        }
        try {
            await adminApi.deleteHomeImage(image.imageId);
            setImages((prev) => prev.filter((i) => i.imageId !== image.imageId));
            setEdits((prev) => {
                const next = { ...prev };
                delete next[image.imageId];
                return next;
            });
            setMessage({ type: "success", text: "Đã xóa ảnh." });
        } catch (err) {
            setMessage({ type: "error", text: "Xóa ảnh thất bại. Vui lòng thử lại." });
        }
    }

    async function handleSaveAll() {
        setSaving(true);
        setMessage(null);
        try {
            // 1) Tạo mới các ảnh đang chờ
            for (const item of pendingItems) {
                const formData = new FormData();
                formData.append("File", item.file);
                formData.append("Title", item.title || "");
                formData.append("LinkUrl", item.linkUrl || "");
                formData.append("SortOrder", item.sortOrder);
                await adminApi.createHomeImage(formData);
            }

            // 2) Cập nhật các ảnh đã chỉnh sửa
            const editEntries = Object.entries(edits);
            for (const [imageId, changes] of editEntries) {
                if (!Object.keys(changes).length) continue;
                const formData = new FormData();
                if (changes.title !== undefined) formData.append("Title", changes.title);
                if (changes.linkUrl !== undefined) formData.append("LinkUrl", changes.linkUrl);
                if (changes.sortOrder !== undefined) formData.append("SortOrder", changes.sortOrder);
                if (changes.status !== undefined) formData.append("Status", changes.status);
                if (changes.file) formData.append("File", changes.file);
                await adminApi.updateHomeImage(imageId, formData);
            }

            pendingItems.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPendingItems([]);
            setEdits({});
            setEditingRowId(null);
            await loadImages();
            setMessage({ type: "success", text: "Đã lưu hình ảnh thành công." });
        } catch (err) {
            setMessage({ type: "error", text: "Lưu thất bại. Vui lòng kiểm tra lại và thử lại." });
        } finally {
            setSaving(false);
        }
    }

    const totalRows = images.length + pendingItems.length;

    return (
        <div className="him-page">
            <style>{HIM_STYLES}</style>
            <div className="him-header">
                <h1 className="him-title">Quản lý hình ảnh trang chủ</h1>
                <p className="him-subtitle">
                    Quản lý banner / hình ảnh hiển thị trên trang chủ website
                </p>
            </div>

            {message && (
                <div className={`him-alert him-alert--${message.type}`}>{message.text}</div>
            )}

            <div className="him-grid">
                {/* Cột trái: Upload */}
                <section className="him-card him-upload-card">
                    <h2 className="him-card-title">Tải lên hình ảnh</h2>
                    <p className="him-card-hint">Hỗ trợ JPG, PNG, WEBP (tối đa {MAX_SIZE_MB}MB/ảnh)</p>

                    <div
                        className={`him-dropzone ${dragActive ? "him-dropzone--active" : ""}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                    >
                        <div className="him-dropzone-icon">⬆</div>
                        <p className="him-dropzone-text">Kéo thả ảnh vào đây</p>
                        <p className="him-dropzone-or">hoặc</p>
                        <button
                            type="button"
                            className="him-btn him-btn--outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Chọn ảnh từ máy tính
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={handleBrowseChange}
                        />
                    </div>
                </section>

                {/* Cột phải: Danh sách */}
                <section className="him-card him-list-card">
                    <div className="him-list-header">
                        <div>
                            <h2 className="him-card-title">Danh sách hình ảnh đã tải lên</h2>
                            <p className="him-card-hint">{totalRows} ảnh trên trang chủ</p>
                        </div>
                        <button
                            type="button"
                            className="him-btn him-btn--primary him-btn--sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            + Thêm ảnh
                        </button>
                    </div>

                    <div className="him-table-wrap">
                        <table className="him-table">
                            <thead>
                                <tr>
                                    <th className="him-col-index">#</th>
                                    <th>Ảnh</th>
                                    <th>Tiêu đề / Liên kết</th>
                                    <th>Trạng thái</th>
                                    <th className="him-col-order">Thứ tự</th>
                                    <th className="him-col-actions">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="him-empty">Đang tải...</td>
                                    </tr>
                                )}

                                {!loading && totalRows === 0 && (
                                    <tr>
                                        <td colSpan={6} className="him-empty">Chưa có hình ảnh nào.</td>
                                    </tr>
                                )}

                                {!loading &&
                                    images.map((image, idx) => {
                                        const isEditing = editingRowId === image.imageId;
                                        const title = getExistingValue(image, "title");
                                        const linkUrl = getExistingValue(image, "linkUrl");
                                        const sortOrder = getExistingValue(image, "sortOrder");
                                        const status = getExistingValue(image, "status");
                                        const previewUrl = edits[image.imageId]?.previewUrl || image.imageUrl;
                                        const isDirty = !!edits[image.imageId];

                                        return (
                                            <tr key={image.imageId} className={isDirty ? "him-row--dirty" : ""}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <div className="him-thumb-wrap">
                                                        <img src={previewUrl} alt={title || "home image"} className="him-thumb" />
                                                        {isEditing && (
                                                            <button
                                                                type="button"
                                                                className="him-thumb-replace"
                                                                onClick={() => openReplaceDialog(image.imageId)}
                                                            >
                                                                Đổi ảnh
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <div className="him-edit-fields">
                                                            <input
                                                                type="text"
                                                                className="him-input"
                                                                placeholder="Tiêu đề"
                                                                value={title || ""}
                                                                onChange={(e) =>
                                                                    updateExistingEdit(image.imageId, "title", e.target.value)
                                                                }
                                                            />
                                                            <input
                                                                type="text"
                                                                className="him-input"
                                                                placeholder="Liên kết (URL)"
                                                                value={linkUrl || ""}
                                                                onChange={(e) =>
                                                                    updateExistingEdit(image.imageId, "linkUrl", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="him-text-cell">
                                                            <span className="him-text-title">{title || "(Chưa có tiêu đề)"}</span>
                                                            {linkUrl && <span className="him-text-link">{linkUrl}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <select
                                                            className="him-select"
                                                            value={status}
                                                            onChange={(e) =>
                                                                updateExistingEdit(image.imageId, "status", e.target.value)
                                                            }
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="Inactive">Inactive</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`him-badge him-badge--${status === "Active" ? "on" : "off"}`}>
                                                            {status === "Active" ? "Đang hiển thị" : "Đã ẩn"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="him-stepper">
                                                        <button
                                                            type="button"
                                                            className="him-step-btn"
                                                            onClick={() => stepExistingSortOrder(image, -1)}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="him-step-value">{sortOrder}</span>
                                                        <button
                                                            type="button"
                                                            className="him-step-btn"
                                                            onClick={() => stepExistingSortOrder(image, 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="him-row-actions">
                                                        <button
                                                            type="button"
                                                            className="him-icon-btn"
                                                            title={isEditing ? "Xong" : "Sửa"}
                                                            onClick={() =>
                                                                setEditingRowId(isEditing ? null : image.imageId)
                                                            }
                                                        >
                                                            {isEditing ? "✓" : "✎"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="him-icon-btn him-icon-btn--danger"
                                                            title="Xóa"
                                                            onClick={() => handleDeleteExisting(image)}
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                {!loading &&
                                    pendingItems.map((item, idx) => (
                                        <tr key={item.id} className="him-row--pending">
                                            <td>{images.length + idx + 1}</td>
                                            <td>
                                                <div className="him-thumb-wrap">
                                                    <img src={item.previewUrl} alt={item.title} className="him-thumb" />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="him-edit-fields">
                                                    <input
                                                        type="text"
                                                        className="him-input"
                                                        placeholder="Tiêu đề"
                                                        value={item.title}
                                                        onChange={(e) =>
                                                            updatePendingField(item.id, "title", e.target.value)
                                                        }
                                                    />
                                                    <input
                                                        type="text"
                                                        className="him-input"
                                                        placeholder="Liên kết (URL)"
                                                        value={item.linkUrl}
                                                        onChange={(e) =>
                                                            updatePendingField(item.id, "linkUrl", e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <span className="him-badge him-badge--new">Chưa lưu</span>
                                            </td>
                                            <td>
                                                <div className="him-stepper">
                                                    <button
                                                        type="button"
                                                        className="him-step-btn"
                                                        onClick={() => stepPendingSortOrder(item.id, -1)}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="him-step-value">{item.sortOrder}</span>
                                                    <button
                                                        type="button"
                                                        className="him-step-btn"
                                                        onClick={() => stepPendingSortOrder(item.id, 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="him-row-actions">
                                                    <button
                                                        type="button"
                                                        className="him-icon-btn him-icon-btn--danger"
                                                        title="Bỏ ảnh này"
                                                        onClick={() => removePendingItem(item.id)}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleReplaceFileChange}
            />

            <div className="him-actions-bar">
                <button
                    type="button"
                    className="him-btn him-btn--ghost"
                    disabled={saving || !hasUnsavedChanges()}
                    onClick={discardChanges}
                >
                    Hủy bỏ
                </button>
                <button
                    type="button"
                    className="him-btn him-btn--primary"
                    disabled={saving || !hasUnsavedChanges()}
                    onClick={handleSaveAll}
                >
                    {saving ? "Đang lưu..." : "Lưu hình ảnh"}
                </button>
            </div>
        </div>
    );
}