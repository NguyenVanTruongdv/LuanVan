import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import adminApi from "../../../api/adminApi";

function Icon({ name, size = 18 }) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };
    switch (name) {
        case "building":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="16" height="18" rx="1" />
                    <line x1="9" y1="7" x2="9" y2="7.01" />
                    <line x1="15" y1="7" x2="15" y2="7.01" />
                    <line x1="9" y1="11" x2="9" y2="11.01" />
                    <line x1="15" y1="11" x2="15" y2="11.01" />
                    <line x1="10" y1="21" x2="10" y2="17" />
                    <line x1="14" y1="21" x2="14" y2="17" />
                </svg>
            );
        case "pin":
            return (
                <svg {...common} width="14" height="14">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            );
        case "phone":
            return (
                <svg {...common} width="14" height="14">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "upload":
            return (
                <svg {...common} width="26" height="26">
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    <polyline points="7 9 12 4 17 9" />
                    <line x1="12" y1="4" x2="12" y2="15" />
                </svg>
            );
        case "image":
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            );
        case "plus":
            return (
                <svg {...common} width="13" height="13">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            );
        case "minus":
            return (
                <svg {...common} width="13" height="13">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            );
        case "chevron":
            return (
                <svg {...common} width="16" height="16">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        case "edit":
            return (
                <svg {...common} width="15" height="15">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            );
        case "trash":
            return (
                <svg {...common} width="15" height="15">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
            );
        case "grip":
            return (
                <svg {...common} width="13" height="13" strokeWidth={0} fill="currentColor">
                    <circle cx="6" cy="5" r="1.4" />
                    <circle cx="6" cy="12" r="1.4" />
                    <circle cx="6" cy="19" r="1.4" />
                    <circle cx="12" cy="5" r="1.4" />
                    <circle cx="12" cy="12" r="1.4" />
                    <circle cx="12" cy="19" r="1.4" />
                </svg>
            );
        case "external":
            return (
                <svg {...common} width="14" height="14">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            );
        case "info":
            return (
                <svg {...common} width="14" height="14">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="8.01" />
                </svg>
            );
        default:
            return null;
    }
}

const COVER_LABEL = "Ảnh đại diện";
const DEFAULT_IMAGE_TYPE = "Ảnh chi nhánh";

// BranchImageDto (BE) -> model dùng trong UI
function mapDtoToImage(dto) {
    const imageType = dto.imageType ?? dto.ImageType;
    return {
        id: dto.imageId ?? dto.ImageId,
        src: dto.imageUrl ?? dto.ImageUrl,
        category: imageType,
        imageType,
        isCover: imageType === COVER_LABEL,
        order: dto.sortOrder ?? dto.SortOrder,
        file: null,
    };
}

// Chuẩn hoá nhiều dạng response BE có thể trả về (mảng thuần, { data: [...] },
// { data: { items: [...] } }, { items: [...] }, { data: { data: [...] } }, ...)
function normalizeList(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
}

export default function BranchImages() {
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [images, setImages] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loadingImages, setLoadingImages] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [editingImage, setEditingImage] = useState(null); // { id, category, isCover }
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    const branch = branches.find((b) => b.id === selectedBranchId) || branches.find((b) => b.branchId === selectedBranchId);

    // --- Load danh sách chi nhánh ---
    useEffect(() => {
        setLoadingBranches(true);
        adminApi
            .getBranches()
            .then((res) => {
                const list = normalizeList(res);
                setBranches(list);
                if (list.length > 0) {
                    setSelectedBranchId(list[0].id ?? list[0].branchId);
                } else {
                    setErrorMsg("Không có chi nhánh nào được trả về từ server.");
                }
            })
            .catch(() => setErrorMsg("Không tải được danh sách chi nhánh."))
            .finally(() => setLoadingBranches(false));
    }, []);

    // --- Load ảnh của chi nhánh đang chọn ---
    const loadImages = useCallback((branchId) => {
        if (!branchId) return;
        setLoadingImages(true);
        adminApi
            .getImagesBranch(branchId)
            .then((res) => {
                const list = normalizeList(res);
                setImages(list.map(mapDtoToImage));
            })
            .catch(() => setErrorMsg("Không tải được hình ảnh của chi nhánh."))
            .finally(() => setLoadingImages(false));
    }, []);

    useEffect(() => {
        if (selectedBranchId) loadImages(selectedBranchId);
    }, [selectedBranchId, loadImages]);

    const sortedImages = useMemo(() => [...images].sort((a, b) => a.order - b.order), [images]);

    // --- Thêm ảnh: upload lên BE ngay khi chọn/kéo thả file ---
    const addFiles = async (fileList) => {
        const files = Array.from(fileList).filter((f) => /image\/(jpeg|png|webp)/.test(f.type));
        if (files.length === 0 || !selectedBranchId) return;

        const formData = new FormData();
        files.forEach((file) => {
            formData.append("Images", file);
            formData.append("ImageTypes", DEFAULT_IMAGE_TYPE); // mặc định "Ảnh chi nhánh" khi mới thêm, người dùng tự sửa sau
        });

        setErrorMsg("");
        try {
            await adminApi.addBranchImages(selectedBranchId, formData);
            loadImages(selectedBranchId);
        } catch {
            setErrorMsg("Tải ảnh lên thất bại. Vui lòng thử lại.");
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files) addFiles(e.target.files);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    };

    // --- Xóa ảnh: gọi BE ngay ---
    const removeImage = async (id) => {
        setErrorMsg("");
        try {
            await adminApi.deleteBranchImage(id);
            setImages((imgs) => imgs.filter((i) => i.id !== id));
        } catch {
            setErrorMsg("Xóa ảnh thất bại. Vui lòng thử lại.");
        }
    };

    // --- Đổi thứ tự: chỉ cập nhật state cục bộ, gọi API khi bấm "Lưu hình ảnh" ---
    const moveImage = (id, direction) => {
        setImages((imgs) => {
            const sorted = [...imgs].sort((a, b) => a.order - b.order);
            const idx = sorted.findIndex((i) => i.id === id);
            const swapIdx = idx + direction;
            if (swapIdx < 0 || swapIdx >= sorted.length) return imgs;
            const tmp = sorted[idx].order;
            sorted[idx].order = sorted[swapIdx].order;
            sorted[swapIdx].order = tmp;
            return sorted;
        });
    };

    const openEdit = (img) => setEditingImage({ id: img.id, category: img.category, isCover: img.isCover });

    // --- Lưu chỉnh sửa loại ảnh: gọi BE ngay ---
    // Lưu ý: không xử lý phần "đặt làm ảnh đại diện" ở đây theo yêu cầu trước đó
    // (BE chưa có ràng buộc "chỉ 1 ảnh đại diện / chi nhánh").
    const saveEdit = async () => {
        if (!editingImage) return;
        const formData = new FormData();
        formData.append("ImageType", editingImage.category);

        setErrorMsg("");
        try {
            await adminApi.updateBranchImage(editingImage.id, formData);
            loadImages(selectedBranchId);
        } catch {
            setErrorMsg("Cập nhật ảnh thất bại. Vui lòng thử lại.");
        } finally {
            setEditingImage(null);
        }
    };

    // --- Lưu hình ảnh: đẩy thứ tự hiện tại lên BE ---
    const handleSave = async () => {
        if (!selectedBranchId) return;
        setSaving(true);
        setErrorMsg("");
        try {
            const items = sortedImages.map((img, idx) => ({ imageId: img.id, sortOrder: idx + 1 }));
            await adminApi.reorderBranchImages(selectedBranchId, items);
            loadImages(selectedBranchId);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setErrorMsg("Lưu thứ tự ảnh thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    // --- Hủy bỏ: bỏ qua thay đổi thứ tự chưa lưu, tải lại từ BE ---
    const handleCancel = () => {
        if (selectedBranchId) loadImages(selectedBranchId);
    };

    if (loadingBranches) {
        return <div className="bi-root">Đang tải danh sách chi nhánh...</div>;
    }

    if (!branch) {
        return (
            <div className="bi-root">
                {errorMsg || "Không có chi nhánh nào."}
            </div>
        );
    }

    return (
        <div className="bi-root">
            <style>{`
        .bi-root {
          --cyan: #06B6D4;
          --cyan-dark: #0E7490;
          --cyan-soft: rgba(6, 182, 212, 0.14);
          --ink: #F1F5F9;
          --muted: #94A3B8;
          --muted-dim: #64748B;
          --line: #334155;
          --bg: #0B1120;
          --card-bg: #1E293B;
          --input-bg: #0F172A;
          --red: #F87171;
          --green: #4ADE80;
          --green-soft: rgba(74, 222, 128, 0.12);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 28px;
          box-sizing: border-box;
          color: var(--ink);
        }
        .bi-root * { box-sizing: border-box; }
        .bi-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 18px; flex-wrap: wrap; }
        .bi-breadcrumb span.current { color: var(--cyan); font-weight: 600; }
        .bi-breadcrumb .sep { color: var(--muted-dim); }
        .bi-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; }
        .bi-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; color: var(--ink); }
        .bi-subtitle { font-size: 14px; color: var(--muted); margin: 0; font-weight: 500; }
        .bi-branch-picker { min-width: 260px; }
        .bi-branch-picker label { display: block; font-size: 12.5px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
        .bi-select-wrap { position: relative; }
        .bi-select-wrap svg.chev { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
        .bi-select-wrap select { width: 100%; appearance: none; border: 1px solid var(--line); border-radius: 10px; padding: 10px 34px 10px 14px; font-size: 14px; font-weight: 600; color: var(--ink); background: var(--card-bg); cursor: pointer; outline: none; }
        .bi-select-wrap select:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-soft); }
        .bi-branch-card { background: var(--card-bg); border: 1px solid var(--line); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 20px; margin-bottom: 22px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); flex-wrap: wrap; }
        .bi-branch-thumb { width: 84px; height: 84px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: rgba(241,245,249,0.75); }
        .bi-branch-info { flex: 1; min-width: 200px; }
        .bi-branch-name { font-size: 17px; font-weight: 700; margin: 0 0 6px; color: var(--ink); }
        .bi-branch-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--muted); font-weight: 500; }
        .bi-branch-meta .item { display: flex; align-items: center; gap: 6px; }
        .bi-branch-meta svg { color: var(--cyan); flex-shrink: 0; }
        .bi-status-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; color: var(--muted); font-weight: 500; }
        .bi-pill { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
        .bi-pill.active { background: var(--green-soft); color: var(--green); }
        .bi-pill.inactive { background: rgba(148, 163, 184, 0.15); color: var(--muted); }
        .bi-detail-btn { display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: var(--input-bg); color: var(--ink); border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .bi-detail-btn:hover { border-color: var(--cyan); color: var(--cyan); }
        .bi-layout { display: grid; grid-template-columns: 0.85fr 1.3fr; gap: 20px; align-items: start; }
        .bi-card { background: var(--card-bg); border: 1px solid var(--line); border-radius: 14px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .bi-card-title { font-size: 15px; font-weight: 700; margin: 0 0 4px; color: var(--ink); }
        .bi-card-sub { font-size: 12.5px; color: var(--muted); margin: 0 0 18px; font-weight: 500; }
        .bi-dropzone { border: 2px dashed var(--line); border-radius: 12px; padding: 30px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; cursor: pointer; background: var(--input-bg); transition: border-color 0.15s, background 0.15s; }
        .bi-dropzone.drag-over { border-color: var(--cyan); background: var(--cyan-soft); }
        .bi-dropzone svg { color: var(--muted); }
        .bi-dropzone-title { font-size: 14px; font-weight: 600; color: var(--ink); }
        .bi-dropzone-btn { margin-top: 4px; border: 1px solid var(--cyan); color: var(--cyan); background: transparent; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .bi-dropzone-btn:hover { background: var(--cyan-soft); }
        .bi-dropzone-meta { font-size: 12px; color: var(--muted); font-weight: 500; }
        .bi-legend { margin-top: 18px; background: var(--input-bg); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
        .bi-legend-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .bi-legend-title svg { color: var(--cyan); }
        .bi-legend ul { margin: 0; padding-left: 18px; }
        .bi-legend li { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-bottom: 4px; }
        .bi-legend li b { color: var(--ink); }
        .bi-list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .bi-add-btn { display: flex; align-items: center; gap: 6px; background: var(--cyan); color: #04222B; border: none; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .bi-add-btn:hover { background: var(--cyan-dark); color: var(--ink); }
        .bi-empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 13.5px; font-weight: 500; }
        .bi-table { width: 100%; border-collapse: collapse; }
        .bi-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); font-weight: 700; padding: 0 10px 10px; border-bottom: 1px solid var(--line); }
        .bi-table td { padding: 12px 10px; border-bottom: 1px solid var(--line); font-size: 13.5px; vertical-align: middle; }
        .bi-table tr:last-child td { border-bottom: none; }
        .bi-row-idx { display: flex; align-items: center; gap: 8px; color: var(--muted); font-weight: 600; }
        .bi-row-idx svg { color: var(--muted-dim); cursor: grab; }
        .bi-thumb { width: 56px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: rgba(241,245,249,0.7); background: var(--input-bg); }
        .bi-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bi-type-label { font-weight: 600; color: var(--ink); }
        .bi-type-label.cover { color: var(--cyan); }
        .bi-order-stepper { display: flex; align-items: center; gap: 8px; }
        .bi-step-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--line); background: var(--input-bg); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .bi-step-btn:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); }
        .bi-step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .bi-order-val { min-width: 18px; text-align: center; font-weight: 700; color: var(--ink); }
        .bi-cover-badge { font-size: 11.5px; font-weight: 700; color: var(--cyan); background: var(--cyan-soft); padding: 3px 9px; border-radius: 999px; border: none; }
        .bi-row-actions { display: flex; gap: 6px; }
        .bi-icon-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: var(--input-bg); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .bi-icon-btn:hover { border-color: var(--cyan); color: var(--cyan); }
        .bi-icon-btn.danger:hover { border-color: var(--red); color: var(--red); }
        .bi-actions-bar { display: flex; justify-content: center; gap: 10px; margin-top: 22px; }
        .bi-btn { border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1px solid var(--line); background: var(--card-bg); color: var(--ink); }
        .bi-btn:hover { background: var(--input-bg); }
        .bi-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .bi-btn-primary { background: var(--cyan); border-color: var(--cyan); color: #04222B; }
        .bi-btn-primary:hover { background: var(--cyan-dark); border-color: var(--cyan-dark); color: var(--ink); }
        .bi-toast { max-width: 1400px; margin-top: 16px; background: var(--green-soft); border: 1px solid rgba(74, 222, 128, 0.35); color: var(--green); padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; text-align: center; }
        .bi-error { max-width: 1400px; margin-top: 16px; background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.35); color: var(--red); padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; text-align: center; }
        .bi-modal-overlay { position: fixed; inset: 0; background: rgba(2, 6, 15, 0.65); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .bi-modal { background: var(--card-bg); border: 1px solid var(--line); border-radius: 14px; padding: 24px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .bi-modal h3 { margin: 0 0 18px; font-size: 16px; font-weight: 700; color: var(--ink); }
        .bi-modal label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
        .bi-modal select, .bi-modal .bi-text-input { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; font-size: 14px; font-weight: 500; color: var(--ink); background: var(--input-bg); margin-bottom: 16px; appearance: none; }
        .bi-modal .bi-text-input:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-soft); }
        .bi-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
        @media (max-width: 1024px) { .bi-layout { grid-template-columns: 1fr; } }
        @media (max-width: 640px) {
          .bi-root { padding: 16px; }
          .bi-card { padding: 18px; }
          .bi-title { font-size: 22px; }
          .bi-branch-card { padding: 16px; }
          .bi-actions-bar { flex-direction: column-reverse; }
          .bi-btn { width: 100%; text-align: center; }
          .bi-table { font-size: 12.5px; }
        }
      `}</style>

            <div className="bi-breadcrumb">
                <span>Trang chủ</span>
                <span className="sep">›</span>
                <span>Quản lý chi nhánh</span>
                <span className="sep">›</span>
                <span className="current">Hình ảnh chi nhánh</span>
            </div>

            <div className="bi-header">
                <div>
                    <h1 className="bi-title">Hình ảnh chi nhánh</h1>
                    <p className="bi-subtitle">Quản lý và tải lên hình ảnh hiển thị cho chi nhánh.</p>
                </div>
                <div className="bi-branch-picker">
                    <label htmlFor="branch-filter">Lọc theo chi nhánh</label>
                    <div className="bi-select-wrap">
                        <select
                            id="branch-filter"
                            value={selectedBranchId ?? ""}
                            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                        >
                            {branches.map((b) => (
                                <option key={b.id ?? b.branchId} value={b.id ?? b.branchId}>
                                    {b.name ?? b.branchName}
                                </option>
                            ))}
                        </select>
                        <Icon name="chevron" />
                    </div>
                </div>
            </div>

            <div className="bi-branch-card">
                <div className="bi-branch-thumb" style={{ background: "linear-gradient(135deg, #0E7490, #0B1120)" }}>
                    <Icon name="building" size={32} />
                </div>
                <div className="bi-branch-info">
                    <h2 className="bi-branch-name">{branch.name ?? branch.branchName}</h2>
                    <div className="bi-branch-meta">
                        <span className="item"><Icon name="pin" /> {branch.address}</span>
                        <span className="item"><Icon name="phone" /> {branch.phone ?? branch.phoneNumber}</span>
                    </div>
                    <div className="bi-status-row">
                        Trạng thái:
                        <span className={`bi-pill ${branch.status === "Active" || branch.status === "active" ? "active" : "inactive"}`}>
                            {branch.status}
                        </span>
                    </div>
                </div>
                <button type="button" className="bi-detail-btn" onClick={(e) => e.preventDefault()}>
                    Xem chi tiết chi nhánh <Icon name="external" />
                </button>
            </div>

            <div className="bi-layout">
                <div className="bi-card">
                    <h3 className="bi-card-title">Tải lên hình ảnh</h3>
                    <p className="bi-card-sub">Hỗ trợ JPG, PNG, WEBP (tối đa 5MB/ảnh)</p>

                    <div
                        className={`bi-dropzone${dragOver ? " drag-over" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <Icon name="upload" />
                        <div className="bi-dropzone-title">Kéo thả ảnh vào đây</div>
                        <div className="bi-dropzone-meta">hoặc</div>
                        <button type="button" className="bi-dropzone-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            Chọn ảnh từ máy tính
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            multiple
                            hidden
                            onChange={handleFileInput}
                        />
                    </div>
                </div>

                <div className="bi-card">
                    <div className="bi-list-header">
                        <div>
                            <h3 className="bi-card-title" style={{ marginBottom: 2 }}>Danh sách hình ảnh đã tải lên</h3>
                            <p className="bi-card-sub" style={{ marginBottom: 0 }}>
                                {loadingImages ? "Đang tải..." : `${sortedImages.length} ảnh cho ${branch.name ?? branch.branchName}`}
                            </p>
                        </div>
                        <button type="button" className="bi-add-btn" onClick={() => fileInputRef.current?.click()}>
                            <Icon name="plus" /> Thêm ảnh
                        </button>
                    </div>

                    {sortedImages.length === 0 ? (
                        <div className="bi-empty">
                            {loadingImages ? "Đang tải hình ảnh..." : "Chưa có hình ảnh nào cho chi nhánh này. Hãy tải ảnh lên ở bên trái."}
                        </div>
                    ) : (
                        <table className="bi-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Ảnh</th>
                                    <th>Loại ảnh</th>
                                    <th>Thứ tự</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedImages.map((img, idx) => (
                                    <tr key={img.id}>
                                        <td>
                                            <span className="bi-row-idx"><Icon name="grip" />{idx + 1}</span>
                                        </td>
                                        <td>
                                            <div className="bi-thumb">
                                                {img.src ? <img src={img.src} alt={img.imageType} /> : <Icon name="image" size={18} />}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`bi-type-label${img.isCover ? " cover" : ""}`}>
                                                {img.imageType}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="bi-order-stepper">
                                                <button type="button" className="bi-step-btn" disabled={idx === 0} onClick={() => moveImage(img.id, -1)}><Icon name="minus" /></button>
                                                <span className="bi-order-val">{idx + 1}</span>
                                                <button type="button" className="bi-step-btn" disabled={idx === sortedImages.length - 1} onClick={() => moveImage(img.id, 1)}><Icon name="plus" /></button>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="bi-row-actions">
                                                <button type="button" className="bi-icon-btn" onClick={() => openEdit(img)} aria-label="Chỉnh sửa ảnh">
                                                    <Icon name="edit" />
                                                </button>
                                                <button type="button" className="bi-icon-btn danger" onClick={() => removeImage(img.id)} aria-label="Xóa ảnh">
                                                    <Icon name="trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="bi-actions-bar">
                <button type="button" className="bi-btn" onClick={handleCancel} disabled={saving}>Hủy bỏ</button>
                <button type="button" className="bi-btn bi-btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu hình ảnh"}
                </button>
            </div>

            {saved && <div className="bi-toast">Đã lưu hình ảnh chi nhánh thành công.</div>}
            {errorMsg && <div className="bi-error">{errorMsg}</div>}

            {editingImage && (
                <div className="bi-modal-overlay" onClick={() => setEditingImage(null)}>
                    <div className="bi-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Chỉnh sửa ảnh</h3>
                        <label htmlFor="edit-category">Loại ảnh</label>
                        <input
                            id="edit-category"
                            type="text"
                            className="bi-text-input"
                            value={editingImage.category}
                            onChange={(e) => setEditingImage((s) => ({ ...s, category: e.target.value }))}
                            placeholder="Nhập loại ảnh, ví dụ: Ảnh bìa, Ảnh cơ sở vật chất..."
                        />
                        <div className="bi-modal-actions">
                            <button type="button" className="bi-btn" onClick={() => setEditingImage(null)}>Hủy</button>
                            <button type="button" className="bi-btn bi-btn-primary" onClick={saveEdit}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}