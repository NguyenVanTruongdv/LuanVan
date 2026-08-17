import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
                <svg {...common} width="15" height="15">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "calendar":
            return (
                <svg {...common} width="15" height="15">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            );
        case "users":
            return (
                <svg {...common} width="15" height="15">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case "edit":
            return (
                <svg {...common} width="15" height="15">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            );
        case "image":
            return (
                <svg {...common} width="15" height="15">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            );
        case "images-stack":
            return (
                <svg {...common} width="16" height="16">
                    <rect x="2" y="6" width="15" height="13" rx="2" />
                    <path d="M7 3h13a1 1 0 0 1 1 1v13" />
                </svg>
            );
        case "chevron":
            return (
                <svg {...common} width="16" height="16">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        case "check":
            return (
                <svg {...common} width="14" height="14">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            );
        case "x":
            return (
                <svg {...common} width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            );
        case "search":
            return (
                <svg {...common} width="16" height="16">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            );
        case "arrow-right":
            return (
                <svg {...common} width="15" height="15">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                </svg>
            );
        case "arrow-left":
            return (
                <svg {...common} width="15" height="15">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
            );
        default:
            return null;
    }
}

function formatDate(iso) {
    if (!iso) return "Chưa cập nhật";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function getImageUrl(rawImg) {
    if (!rawImg) return null;
    if (typeof rawImg === "string") return rawImg;
    return rawImg.url ?? rawImg.imageUrl ?? rawImg.imagePath ?? rawImg.path ?? null;
}

function getImageId(rawImg, idx) {
    if (rawImg && typeof rawImg === "object") {
        return rawImg.id ?? rawImg.imageId ?? idx;
    }
    return idx;
}

export default function BranchDetailOfAdmin() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [branch, setBranch] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeImage, setActiveImage] = useState(0);

    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);

    const [availableManagers, setAvailableManagers] = useState([]);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState("");

    // Tải chi tiết chi nhánh + ảnh chi nhánh từ API thật
    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [detailRes, imagesRes] = await Promise.all([
                    adminApi.getDetailBranch(id),
                    adminApi.getImagesBranch(id).catch(() => null), // ảnh có thể chưa có, không chặn trang
                ]);

                const detail = detailRes?.data ?? detailRes;
                const imgsRaw = imagesRes?.data ?? imagesRes ?? [];
                const imgs = Array.isArray(imgsRaw) ? imgsRaw : imgsRaw?.items ?? [];

                if (!cancelled) {
                    setBranch(detail);
                    setImages(imgs);
                    setActiveImage(0);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) setError("Không thể tải thông tin chi nhánh. Vui lòng thử lại.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const managers = branch?.managers ?? [];

    // Danh sách nhân viên có thể chọn làm quản lý trong modal sửa: gộp danh sách
    // "còn trống" từ BE với các quản lý hiện tại của chi nhánh (để họ vẫn hiện ra đã được chọn sẵn)
    const managerOptions = useMemo(() => {
        const map = new Map();
        availableManagers.forEach((m) => map.set(m.employeeId ?? m.id, m));
        managers.forEach((m) => map.set(m.employeeId ?? m.id, m));
        return Array.from(map.values());
    }, [availableManagers, managers]);

    const filteredManagerOptions = useMemo(() => {
        const q = managerSearch.trim().toLowerCase();
        if (!q) return managerOptions;
        return managerOptions.filter(
            (e) =>
                (e.fullName || "").toLowerCase().includes(q) ||
                (e.role || e.roleName || "").toLowerCase().includes(q)
        );
    }, [managerOptions, managerSearch]);

    const openEdit = async () => {
        if (!branch) return;
        setDraft({
            branchName: branch.branchName,
            address: branch.address,
            phone: branch.phone,
            status: branch.status,
            managerIds: managers.map((m) => m.employeeId ?? m.id),
        });
        setEditOpen(true);

        if (availableManagers.length === 0) {
            try {
                const res = await adminApi.getAvailableManager();
                setAvailableManagers(res?.data ?? res ?? []);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const saveEdit = async () => {
        if (!branch || !draft) return;
        setSaving(true);
        try {
            // TODO: xác nhận lại với BE field chính xác nhận trong body updateBranch
            // (branchName/address/phone/status có khớp tên field BE mong đợi không).
            // Việc gán quản lý (managerIds) hiện gửi kèm ở đây — nếu BE có endpoint
            // riêng để gán quản lý chi nhánh, cần tách ra gọi endpoint đó thay vì
            // gộp chung vào updateBranch.
            await adminApi.updateBranch(branch.branchId, {
                branchName: draft.branchName,
                address: draft.address,
                phone: draft.phone,
                status: draft.status,
                managerIds: draft.managerIds,
            });

            const detailRes = await adminApi.getDetailBranch(branch.branchId);
            setBranch(detailRes?.data ?? detailRes);
            setEditOpen(false);
        } catch (err) {
            console.error(err);
            alert("Cập nhật chi nhánh thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const toggleDraftManager = (id) => {
        setDraft((d) => ({
            ...d,
            managerIds: d.managerIds.includes(id)
                ? d.managerIds.filter((x) => x !== id)
                : [...d.managerIds, id],
        }));
    };

    return (
        <div className="bd-root">
            <style>{`
        .bd-root {
          --cyan: #16A34A;
          --cyan-dark: #15803D;
          --cyan-soft: rgba(22, 163, 74, 0.12);
          --ink: #0F172A;
          --muted: #64748B;
          --muted-dim: #94A3B8;
          --line: #CBD5E1;
          --bg: #F1F5F9;
          --card-bg: #FFFFFF;
          --input-bg: #F8FAFC;
          --red: #DC2626;
          --red-soft: rgba(220, 38, 38, 0.1);
          --green: #15803D;
          --green-soft: rgba(22, 163, 74, 0.12);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 28px;
          box-sizing: border-box;
          color: var(--ink);
        }
        .bd-root * { box-sizing: border-box; }

        .bd-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .bd-breadcrumb .current { color: var(--cyan-dark); font-weight: 700; }
        .bd-breadcrumb .sep { color: var(--muted-dim); }
        .bd-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .bd-back-btn:hover { color: var(--cyan-dark); }

        .bd-state {
          background: var(--card-bg);
          border: 1.5px solid var(--line);
          border-radius: 16px;
          padding: 60px 24px;
          text-align: center;
          color: var(--muted);
          font-size: 14px;
        }
        .bd-state.error { color: var(--red); border-color: rgba(220, 38, 38, 0.35); }
        .bd-retry-btn {
          margin-top: 12px;
          display: inline-flex;
          border: 1.5px solid var(--line);
          background: var(--input-bg);
          color: var(--ink);
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
        }

        .bd-layout {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 22px;
          align-items: start;
          max-width: 1320px;
        }

        /* Gallery */
        .bd-gallery-main {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1.5px solid var(--line);
          aspect-ratio: 16 / 10;
          background: var(--card-bg);
        }
        .bd-gallery-main img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .bd-gallery-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted-dim);
          background: var(--input-bg);
        }
        .bd-gallery-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.65);
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 6px 12px;
          border-radius: 8px;
          text-transform: uppercase;
        }

        .bd-thumbs {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .bd-thumb {
          flex: 0 0 auto;
          width: 140px;
          aspect-ratio: 16 / 10;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid var(--line);
          cursor: pointer;
          background: var(--card-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted-dim);
          transition: border-color 0.15s;
        }
        .bd-thumb.active { border-color: var(--cyan); }
        .bd-thumb:hover { border-color: var(--cyan-dark); }
        .bd-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .bd-manage-images-btn {
          margin-top: 16px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1.5px solid var(--line);
          background: var(--card-bg);
          color: var(--ink);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .bd-manage-images-btn:hover { border-color: var(--cyan); color: var(--cyan-dark); }

        /* Info panel */
        .bd-info-card {
          position: relative;
          background: var(--card-bg);
          border: 1.5px solid var(--line);
          border-radius: 16px;
          padding: 28px 26px 24px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
        }
        .bd-info-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--cyan), var(--cyan-dark));
        }

        .bd-info-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .bd-code-row { display: flex; align-items: center; gap: 10px; }
        .bd-code { font-size: 14px; font-weight: 700; color: var(--muted); }
        .bd-pill { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; border: 1px solid transparent; }
        .bd-pill.active { background: var(--green-soft); color: var(--green); border-color: rgba(22, 163, 74, 0.35); }
        .bd-pill.inactive { background: var(--red-soft); color: var(--red); border-color: rgba(220, 38, 38, 0.35); }
        .bd-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        .bd-edit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1.5px solid var(--line);
          background: var(--input-bg);
          color: var(--ink);
          border-radius: 9px;
          padding: 7px 13px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .bd-edit-btn:hover { border-color: var(--cyan); color: var(--cyan-dark); }

        .bd-name { font-size: 22px; font-weight: 700; margin: 0 0 10px; color: var(--ink); }
        .bd-address {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 14px;
          color: var(--muted);
          font-weight: 500;
          margin-bottom: 22px;
          line-height: 1.5;
        }
        .bd-address svg { color: var(--cyan-dark); flex-shrink: 0; margin-top: 3px; }

        .bd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 16px;
          padding: 18px;
          border: 1.5px solid var(--line);
          border-radius: 12px;
          background: var(--input-bg);
          margin-bottom: 22px;
        }
        .bd-grid-item .label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--muted-dim);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .bd-grid-item .value {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bd-grid-item .value svg { color: var(--cyan-dark); }

        .bd-section-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--muted-dim);
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .bd-section-title svg { color: var(--cyan-dark); }

        .bd-manager-list { display: flex; flex-direction: column; gap: 14px; }
        .bd-manager-item { display: flex; gap: 12px; align-items: flex-start; position: relative; }
        .bd-manager-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 15px;
          top: 32px;
          bottom: -14px;
          width: 1px;
          background: var(--line);
        }
        .bd-manager-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--cyan-soft);
          color: var(--cyan-dark);
          border: 1.5px solid rgba(22, 163, 74, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          z-index: 1;
        }
        .bd-manager-name { font-size: 14px; font-weight: 700; color: var(--ink); }
        .bd-manager-role { font-size: 12.5px; color: var(--muted); font-weight: 500; }
        .bd-manager-empty { font-size: 13px; color: var(--muted); font-weight: 500; }

        /* Edit modal */
        .bd-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 20px;
          overflow-y: auto;
        }
        .bd-modal {
          background: var(--card-bg);
          border: 1.5px solid var(--line);
          border-top: 4px solid var(--cyan);
          border-radius: 14px;
          padding: 26px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
        }
        .bd-modal h3 { margin: 0 0 20px; font-size: 17px; font-weight: 700; color: var(--ink); }
        .bd-field { margin-bottom: 16px; }
        .bd-field label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 7px; }
        .bd-field input, .bd-field textarea {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          background: var(--input-bg);
          outline: none;
          font-family: inherit;
        }
        .bd-field input:focus, .bd-field textarea:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-soft); }
        .bd-field textarea { resize: vertical; min-height: 64px; }

        .bd-manager-box { position: relative; }
        .bd-manager-trigger {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 9px 13px;
          background: var(--input-bg);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          gap: 10px;
          min-height: 42px;
        }
        .bd-manager-trigger:hover { border-color: var(--cyan); }
        .bd-manager-trigger.open svg.chev { transform: rotate(180deg); }
        .bd-manager-placeholder { color: var(--muted-dim); font-size: 13.5px; font-weight: 500; }
        .bd-manager-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .bd-chip {
          display: flex; align-items: center; gap: 6px;
          background: var(--cyan-soft); color: var(--cyan-dark);
          border: 1px solid rgba(22, 163, 74, 0.3);
          border-radius: 999px; padding: 3px 6px 3px 10px;
          font-size: 12px; font-weight: 600;
        }
        .bd-chip button { border: none; background: transparent; color: var(--cyan-dark); cursor: pointer; display: flex; align-items: center; padding: 2px; border-radius: 50%; }
        .bd-chip button:hover { background: rgba(22, 163, 74, 0.2); }

        .bd-manager-menu {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: var(--card-bg); border: 1.5px solid var(--line); border-radius: 12px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14); z-index: 10; overflow: hidden;
        }
        .bd-manager-search { padding: 9px; border-bottom: 1.5px solid var(--line); }
        .bd-manager-search input {
          width: 100%; border: 1.5px solid var(--line); border-radius: 8px; padding: 8px 10px 8px 32px;
          font-size: 13.5px; color: var(--ink); background: var(--input-bg); outline: none;
        }
        .bd-manager-search-wrap { position: relative; }
        .bd-manager-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); }
        .bd-manager-list-menu { max-height: 200px; overflow-y: auto; padding: 6px; }
        .bd-manager-option { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 8px; cursor: pointer; }
        .bd-manager-option:hover { background: var(--input-bg); }
        .bd-manager-check {
          width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid var(--line);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: transparent;
        }
        .bd-manager-option.selected .bd-manager-check { background: var(--cyan); border-color: var(--cyan); color: #FFFFFF; }
        .bd-manager-empty-option { padding: 10px; font-size: 13px; color: var(--muted); text-align: center; }

        .bd-status-toggle { display: flex; gap: 8px; }
        .bd-status-opt {
          flex: 1; text-align: center; padding: 9px; border-radius: 9px; border: 1.5px solid var(--line);
          background: var(--input-bg); color: var(--muted); font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .bd-status-opt.selected.active { border-color: var(--green); color: var(--green); background: var(--green-soft); }
        .bd-status-opt.selected.inactive { border-color: var(--red); color: var(--red); background: var(--red-soft); }

        .bd-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        .bd-btn {
          border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer;
          border: 1.5px solid var(--line); background: var(--card-bg); color: var(--ink);
        }
        .bd-btn:hover { background: var(--input-bg); border-color: var(--muted); }
        .bd-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .bd-btn-primary { background: var(--cyan); border-color: var(--cyan); color: #FFFFFF; }
        .bd-btn-primary:hover { background: var(--cyan-dark); border-color: var(--cyan-dark); color: #FFFFFF; }

        @media (max-width: 1024px) {
          .bd-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .bd-root { padding: 16px; }
          .bd-info-card { padding: 22px 18px 20px; }
          .bd-name { font-size: 19px; }
          .bd-grid { grid-template-columns: 1fr 1fr; gap: 14px; }
          .bd-thumb { width: 100px; }
          .bd-info-top { flex-direction: column; }
          .bd-edit-btn { align-self: flex-start; }
        }
      `}</style>

            <div className="bd-breadcrumb">
                <button type="button" className="bd-back-btn" onClick={() => navigate(-1)}>
                    <Icon name="arrow-left" size={14} /> Quay lại
                </button>
                <span className="sep">›</span>
                <span>Quản lý chi nhánh</span>
                <span className="sep">›</span>
                <span className="current">Chi tiết chi nhánh</span>
            </div>

            {loading && <div className="bd-state">Đang tải thông tin chi nhánh...</div>}

            {!loading && error && (
                <div className="bd-state error">
                    {error}
                    <br />
                    <button className="bd-retry-btn" onClick={() => navigate(0)}>Thử lại</button>
                </div>
            )}

            {!loading && !error && !branch && (
                <div className="bd-state">Không tìm thấy chi nhánh này.</div>
            )}

            {!loading && !error && branch && (
                <div className="bd-layout">
                    <div>
                        <div className="bd-gallery-main">
                            <div className="bd-gallery-tag"><Icon name="image" size={13} /> Ảnh</div>
                            {getImageUrl(images[activeImage]) ? (
                                <img src={getImageUrl(images[activeImage])} alt={branch.branchName} />
                            ) : (
                                <div className="bd-gallery-placeholder">
                                    <Icon name="building" size={56} />
                                </div>
                            )}
                        </div>

                        {images.length > 0 && (
                            <div className="bd-thumbs">
                                {images.map((img, idx) => (
                                    <div
                                        key={getImageId(img, idx)}
                                        className={`bd-thumb${idx === activeImage ? " active" : ""}`}
                                        onClick={() => setActiveImage(idx)}
                                    >
                                        {getImageUrl(img) ? (
                                            <img src={getImageUrl(img)} alt="" />
                                        ) : (
                                            <Icon name="building" size={22} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            className="bd-manage-images-btn"
                            onClick={() => navigate(`/admin/branches-img`)}
                        >
                            <Icon name="images-stack" />
                            Quản lý hình ảnh chi nhánh
                            <Icon name="arrow-right" />
                        </button>
                    </div>

                    <div className="bd-info-card">
                        <div className="bd-info-top">
                            <div className="bd-code-row">
                                <span className="bd-code">#{branch.branchId}</span>
                                <span className={`bd-pill ${branch.status === "Active" ? "active" : "inactive"}`}>
                                    <span className="dot" />
                                    {branch.status === "Active" ? "Đang hoạt động" : "Ngưng hoạt động"}
                                </span>
                            </div>
                            <button type="button" className="bd-edit-btn" onClick={openEdit}>
                                <Icon name="edit" /> Chỉnh sửa thông tin
                            </button>
                        </div>

                        <h1 className="bd-name">{branch.branchName}</h1>
                        <div className="bd-address">
                            <Icon name="pin" />
                            {branch.address}
                        </div>

                        <div className="bd-grid">
                            <div className="bd-grid-item">
                                <div className="label">Số điện thoại</div>
                                <div className="value"><Icon name="phone" />{branch.phone || "Chưa cập nhật"}</div>
                            </div>
                            <div className="bd-grid-item">
                                <div className="label">Ngày tạo</div>
                                <div className="value"><Icon name="calendar" />{formatDate(branch.createdAt)}</div>
                            </div>
                            <div className="bd-grid-item">
                                <div className="label">Số quản lý</div>
                                <div className="value"><Icon name="users" />{managers.length} người</div>
                            </div>
                            <div className="bd-grid-item">
                                <div className="label">Mã chi nhánh</div>
                                <div className="value">#{branch.branchId}</div>
                            </div>
                        </div>

                        <div className="bd-section-title"><Icon name="users" /> Quản lý chi nhánh</div>
                        <div className="bd-manager-list">
                            {managers.length === 0 ? (
                                <div className="bd-manager-empty">Chưa gán quản lý cho chi nhánh này.</div>
                            ) : (
                                managers.map((m) => (
                                    <div className="bd-manager-item" key={m.employeeId ?? m.id}>
                                        <div className="bd-manager-avatar">
                                            {(m.fullName || "?").trim().split(" ").slice(-1)[0][0]}
                                        </div>
                                        <div>
                                            <div className="bd-manager-name">{m.fullName}</div>
                                            <div className="bd-manager-role">{m.phone || m.role || ""}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editOpen && draft && (
                <div className="bd-modal-overlay" onClick={() => !saving && setEditOpen(false)}>
                    <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Chỉnh sửa thông tin chi nhánh</h3>

                        <div className="bd-field">
                            <label>Tên chi nhánh</label>
                            <input
                                type="text"
                                value={draft.branchName}
                                onChange={(e) => setDraft((d) => ({ ...d, branchName: e.target.value }))}
                            />
                        </div>

                        <div className="bd-field">
                            <label>Địa chỉ</label>
                            <textarea
                                value={draft.address}
                                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                            />
                        </div>

                        <div className="bd-field">
                            <label>Số điện thoại</label>
                            <input
                                type="tel"
                                maxLength={15}
                                value={draft.phone}
                                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                            />
                        </div>

                        <div className="bd-field">
                            <label>Trạng thái</label>
                            <div className="bd-status-toggle">
                                <div
                                    className={`bd-status-opt${draft.status === "Active" ? " selected active" : ""}`}
                                    onClick={() => setDraft((d) => ({ ...d, status: "Active" }))}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`bd-status-opt${draft.status === "Inactive" ? " selected inactive" : ""}`}
                                    onClick={() => setDraft((d) => ({ ...d, status: "Inactive" }))}
                                >
                                    Ngưng hoạt động
                                </div>
                            </div>
                        </div>

                        <div className="bd-field">
                            <label>Quản lý chi nhánh</label>
                            <div className="bd-manager-box">
                                <div
                                    className={`bd-manager-trigger${managerMenuOpen ? " open" : ""}`}
                                    onClick={() => setManagerMenuOpen((v) => !v)}
                                >
                                    {draft.managerIds.length === 0 ? (
                                        <span className="bd-manager-placeholder">Chọn nhân viên làm quản lý</span>
                                    ) : (
                                        <div className="bd-manager-chips">
                                            {managerOptions
                                                .filter((e) => draft.managerIds.includes(e.employeeId ?? e.id))
                                                .map((m) => (
                                                    <span className="bd-chip" key={m.employeeId ?? m.id}>
                                                        {m.fullName}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleDraftManager(m.employeeId ?? m.id);
                                                            }}
                                                        >
                                                            <Icon name="x" />
                                                        </button>
                                                    </span>
                                                ))}
                                        </div>
                                    )}
                                    <Icon name="chevron" size={16} />
                                </div>

                                {managerMenuOpen && (
                                    <div className="bd-manager-menu">
                                        <div className="bd-manager-search">
                                            <div className="bd-manager-search-wrap">
                                                <Icon name="search" />
                                                <input
                                                    type="text"
                                                    placeholder="Tìm nhân viên..."
                                                    value={managerSearch}
                                                    onChange={(e) => setManagerSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="bd-manager-list-menu">
                                            {filteredManagerOptions.length === 0 ? (
                                                <div className="bd-manager-empty-option">Không có nhân viên phù hợp.</div>
                                            ) : (
                                                filteredManagerOptions.map((emp) => {
                                                    const empId = emp.employeeId ?? emp.id;
                                                    const selected = draft.managerIds.includes(empId);
                                                    return (
                                                        <div
                                                            key={empId}
                                                            className={`bd-manager-option${selected ? " selected" : ""}`}
                                                            onClick={() => toggleDraftManager(empId)}
                                                        >
                                                            <span className="bd-manager-check"><Icon name="check" /></span>
                                                            <span>
                                                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{emp.fullName}</div>
                                                                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{emp.role || emp.roleName || emp.phone || ""}</div>
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bd-modal-actions">
                            <button type="button" className="bd-btn" onClick={() => setEditOpen(false)} disabled={saving}>Hủy</button>
                            <button type="button" className="bd-btn bd-btn-primary" onClick={saveEdit} disabled={saving}>
                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}