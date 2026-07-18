import { useEffect, useMemo, useRef, useState } from "react";
import adminApi from "../../../api/AdminApi";
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
                <svg {...common}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            );
        case "phone":
            return (
                <svg {...common}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "search":
            return (
                <svg {...common} width="16" height="16">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
        case "x":
            return (
                <svg {...common} width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            );
        case "users":
            return (
                <svg {...common}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case "check":
            return (
                <svg {...common} width="14" height="14">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            );
        case "chevron":
            return (
                <svg {...common} width="16" height="16">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        default:
            return null;
    }
}

const IMAGE_TYPES = ["Mặt tiền", "Không gian bên trong", "Bảng hiệu", "Khác"];

export default function AddBranch() {
    const [form, setForm] = useState({
        branch_name: "",
        address: "",
        phone: "",
    });
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const [images, setImages] = useState([]); // { id, src, name, file, type }
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const [managerIds, setManagerIds] = useState([]);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState("");

    const [employees, setEmployees] = useState([]);
    const [managersLoading, setManagersLoading] = useState(false);
    const [managersError, setManagersError] = useState(null);

    // Lấy danh sách nhân viên có thể làm quản lý
    const fetchManagers = async () => {
        setManagersLoading(true);
        setManagersError(null);
        try {
            const res = await adminApi.getAvailableManager();
            const data = res?.data ?? res;
            const list = Array.isArray(data) ? data : data?.items ?? [];
            setEmployees(list);
        } catch (err) {
            console.error(err);
            setManagersError("Không thể tải danh sách nhân viên.");
            setEmployees([]);
        } finally {
            setManagersLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((err) => ({ ...err, [field]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.branch_name.trim()) next.branch_name = "Vui lòng nhập tên chi nhánh";
        else if (form.branch_name.length > 150) next.branch_name = "Tối đa 150 ký tự";
        if (!form.address.trim()) next.address = "Vui lòng nhập địa chỉ";
        if (form.phone && form.phone.length > 15) next.phone = "Tối đa 15 ký tự";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // Khớp CreateBranchDto: BranchName, Address, Phone, ManagerIds[], Images[], ImageTypes[]
    const buildFormData = () => {
        const fd = new FormData();
        fd.append("BranchName", form.branch_name.trim());
        fd.append("Address", form.address.trim());
        if (form.phone.trim()) fd.append("Phone", form.phone.trim());

        managerIds.forEach((id) => fd.append("ManagerIds", id));

        images.forEach((img) => {
            fd.append("Images", img.file);
            fd.append("ImageTypes", img.type);
        });

        return fd;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            const formData = buildFormData();
            await adminApi.createBranch(formData);
            setSubmitted(true);
            handleCancel();
            setTimeout(() => setSubmitted(false), 2500);
        } catch (err) {
            console.error(err);
            setSubmitError(
                err?.response?.data?.message || "Tạo chi nhánh thất bại. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setForm({ branch_name: "", address: "", phone: "" });
        setErrors({});
        setImages([]);
        setManagerIds([]);
        setManagerSearch("");
    };

    const addFiles = (fileList) => {
        const files = Array.from(fileList).filter((f) => /image\/(jpeg|png)/.test(f.type));
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                setImages((imgs) => [
                    ...imgs,
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        src: reader.result,
                        name: file.name,
                        file,
                        type: IMAGE_TYPES[0],
                    },
                ]);
            };
            reader.readAsDataURL(file);
        });
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

    const removeImage = (id) => setImages((imgs) => imgs.filter((i) => i.id !== id));

    const setImageType = (id, type) =>
        setImages((imgs) => imgs.map((i) => (i.id === id ? { ...i, type } : i)));

    const toggleManager = (id) => {
        setManagerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    };

    // Chuẩn hoá field tên/chức vụ vì chưa chắc backend đặt tên fullName/position hay name/role
    const normalizedEmployees = useMemo(
        () =>
            employees.map((e) => ({
                id: e.employeeId ?? e.id,
                name: e.fullName ?? e.name ?? "",
                role: e.position ?? e.role ?? e.roleName ?? "",
            })),
        [employees]
    );

    const filteredEmployees = useMemo(() => {
        const q = managerSearch.trim().toLowerCase();
        if (!q) return normalizedEmployees;
        return normalizedEmployees.filter(
            (e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
        );
    }, [managerSearch, normalizedEmployees]);

    const selectedManagers = normalizedEmployees.filter((e) => managerIds.includes(e.id));

    return (
        <div className="ab-root">
            <style>{`
        .ab-root {
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
          --red-bg: rgba(248, 113, 113, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 28px;
          box-sizing: border-box;
          color: var(--ink);
        }
        .ab-root * { box-sizing: border-box; }

        .ab-header { margin-bottom: 22px; }
        .ab-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; color: var(--ink); }
        .ab-subtitle { font-size: 14px; color: var(--muted); margin: 0; font-weight: 500; }

        .ab-form { max-width: 1200px; }

        .ab-layout {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .ab-col-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ab-card {
          background: var(--card-bg);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 26px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        }
        .ab-card-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 22px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink);
        }
        .ab-card-title svg { color: var(--cyan); }

        .ab-section-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 16px;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ab-section-title svg { color: var(--cyan); }

        .ab-field { margin-bottom: 20px; }
        .ab-field:last-child { margin-bottom: 0; }
        .ab-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .ab-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--ink);
        }
        .ab-label .req { color: var(--red); margin-left: 2px; }
        .ab-hint { font-size: 12px; color: var(--muted); margin-top: 6px; font-weight: 500; }

        .ab-input-wrap {
          position: relative;
        }
        .ab-input-wrap svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }
        .ab-input-wrap input,
        .ab-input-wrap textarea,
        .ab-input-wrap select {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          font-family: inherit;
          color: var(--ink);
          background: var(--input-bg);
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
        }
        .ab-input-wrap.no-icon input,
        .ab-input-wrap.no-icon select { padding-left: 14px; }
        .ab-input-wrap textarea { padding-left: 14px; resize: vertical; min-height: 88px; }
        .ab-input-wrap input::placeholder,
        .ab-input-wrap textarea::placeholder { color: var(--muted-dim); font-weight: 500; }
        .ab-input-wrap input:focus,
        .ab-input-wrap textarea:focus,
        .ab-input-wrap select:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px var(--cyan-soft);
        }
        .ab-input-wrap.has-error input,
        .ab-input-wrap.has-error textarea,
        .ab-input-wrap.has-error select {
          border-color: var(--red);
        }
        .ab-input-wrap.has-error input:focus,
        .ab-input-wrap.has-error textarea:focus {
          box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
        }

        .ab-error {
          font-size: 12px;
          color: var(--red);
          margin-top: 6px;
          font-weight: 500;
        }

        .ab-counter {
          font-size: 12px;
          color: var(--muted);
          text-align: right;
          margin-top: 6px;
          font-weight: 500;
        }

        /* Manager multi-select */
        .ab-manager-box { position: relative; }
        .ab-manager-trigger {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 14px;
          background: var(--input-bg);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          gap: 10px;
          min-height: 44px;
        }
        .ab-manager-trigger:hover { border-color: var(--cyan); }
        .ab-manager-trigger svg.chev { color: var(--muted); transition: transform 0.15s; flex-shrink: 0; }
        .ab-manager-trigger.open svg.chev { transform: rotate(180deg); }
        .ab-manager-placeholder { color: var(--muted-dim); font-size: 14px; font-weight: 500; }
        .ab-manager-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .ab-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--cyan-soft);
          color: var(--cyan);
          border: 1px solid rgba(6, 182, 212, 0.35);
          border-radius: 999px;
          padding: 4px 6px 4px 10px;
          font-size: 12.5px;
          font-weight: 600;
        }
        .ab-chip button {
          border: none;
          background: transparent;
          color: var(--cyan);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 50%;
        }
        .ab-chip button:hover { background: rgba(6, 182, 212, 0.25); }

        .ab-manager-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--card-bg);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.45);
          z-index: 10;
          overflow: hidden;
        }
        .ab-manager-search {
          padding: 10px;
          border-bottom: 1px solid var(--line);
        }
        .ab-manager-search .ab-input-wrap input { padding-top: 9px; padding-bottom: 9px; }
        .ab-manager-list {
          max-height: 220px;
          overflow-y: auto;
          padding: 6px;
        }
        .ab-manager-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .ab-manager-option:hover { background: var(--input-bg); }
        .ab-manager-check {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: transparent;
        }
        .ab-manager-option.selected .ab-manager-check {
          background: var(--cyan);
          border-color: var(--cyan);
          color: #04222B;
        }
        .ab-manager-name { font-size: 14px; font-weight: 600; color: var(--ink); }
        .ab-manager-role { font-size: 12px; color: var(--muted); }
        .ab-manager-empty { padding: 16px; text-align: center; font-size: 13px; color: var(--muted); }
        .ab-manager-loading { padding: 16px; text-align: center; font-size: 13px; color: var(--muted); }
        .ab-manager-error { padding: 12px 16px; text-align: center; font-size: 13px; color: var(--red); }
        .ab-manager-retry {
          margin-top: 6px;
          border: 1px solid var(--line);
          background: var(--input-bg);
          color: var(--ink);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }

        /* Upload section */
        .ab-dropzone {
          border: 2px dashed var(--line);
          border-radius: 12px;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          cursor: pointer;
          background: var(--input-bg);
          transition: border-color 0.15s, background 0.15s;
        }
        .ab-dropzone.drag-over {
          border-color: var(--cyan);
          background: var(--cyan-soft);
        }
        .ab-dropzone svg { color: var(--muted); }
        .ab-dropzone-title { font-size: 14px; font-weight: 600; color: var(--ink); }
        .ab-dropzone-btn {
          margin-top: 4px;
          border: 1px solid var(--cyan);
          color: var(--cyan);
          background: transparent;
          border-radius: 8px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .ab-dropzone-btn:hover { background: var(--cyan-soft); }
        .ab-dropzone-meta {
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
          line-height: 1.5;
          margin-top: 2px;
        }

        .ab-preview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 14px;
        }
        .ab-preview-item {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: var(--input-bg);
        }
        .ab-preview-thumb { position: relative; aspect-ratio: 4 / 3; }
        .ab-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ab-preview-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(11, 17, 32, 0.75);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ab-preview-remove:hover { background: rgba(11, 17, 32, 0.92); }
        .ab-preview-type {
          padding: 8px;
          border-top: 1px solid var(--line);
        }
        .ab-preview-type input {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
          background: var(--card-bg);
          font-family: inherit;
          outline: none;
        }
        .ab-preview-type input:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px var(--cyan-soft);
        }
        .ab-preview-type input::placeholder { color: var(--muted-dim); font-weight: 500; }

        .ab-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }
        .ab-btn {
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--line);
          background: var(--card-bg);
          color: var(--ink);
          transition: background 0.15s, border-color 0.15s;
        }
        .ab-btn:hover { background: var(--input-bg); }
        .ab-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ab-btn-primary {
          background: var(--cyan);
          border-color: var(--cyan);
          color: #04222B;
        }
        .ab-btn-primary:hover { background: var(--cyan-dark); border-color: var(--cyan-dark); color: #F1F5F9; }

        .ab-toast {
          max-width: 1200px;
          margin-top: 16px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #4ADE80;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
        }
        .ab-toast-error {
          max-width: 1200px;
          margin-top: 16px;
          background: rgba(248, 113, 113, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.35);
          color: #F87171;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .ab-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 720px) {
          .ab-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .ab-root { padding: 16px; }
          .ab-card { padding: 20px; }
          .ab-title { font-size: 22px; }
          .ab-actions { flex-direction: column-reverse; }
          .ab-btn { width: 100%; text-align: center; }
        }
      `}</style>

            <datalist id="ab-image-type-options">
                {IMAGE_TYPES.map((t) => (
                    <option key={t} value={t} />
                ))}
            </datalist>

            <div className="ab-header">
                <h1 className="ab-title">Thêm chi nhánh</h1>
                <p className="ab-subtitle">Nhập thông tin để thêm chi nhánh mới vào hệ thống.</p>
            </div>

            <form className="ab-form" onSubmit={handleSubmit} noValidate>
                <div className="ab-layout">
                    <div className="ab-card">
                        <h2 className="ab-card-title">
                            <Icon name="building" />
                            Thông tin chi nhánh
                        </h2>

                        <div className="ab-field">
                            <label className="ab-label" htmlFor="branch_name">
                                Tên chi nhánh<span className="req">*</span>
                            </label>
                            <div className={`ab-input-wrap${errors.branch_name ? " has-error" : ""}`}>
                                <Icon name="building" />
                                <input
                                    id="branch_name"
                                    type="text"
                                    maxLength={150}
                                    placeholder="Nhập tên chi nhánh"
                                    value={form.branch_name}
                                    onChange={handleChange("branch_name")}
                                />
                            </div>
                            {errors.branch_name ? (
                                <div className="ab-error">{errors.branch_name}</div>
                            ) : (
                                <div className="ab-counter">{form.branch_name.length}/150</div>
                            )}
                        </div>

                        <div className="ab-field">
                            <label className="ab-label" htmlFor="address">
                                Địa chỉ<span className="req">*</span>
                            </label>
                            <div className={`ab-input-wrap${errors.address ? " has-error" : ""}`}>
                                <Icon name="pin" />
                                <textarea
                                    id="address"
                                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                                    value={form.address}
                                    onChange={handleChange("address")}
                                />
                            </div>
                            {errors.address && <div className="ab-error">{errors.address}</div>}
                        </div>

                        <div className="ab-field">
                            <label className="ab-label" htmlFor="phone">
                                Số điện thoại
                            </label>
                            <div className={`ab-input-wrap${errors.phone ? " has-error" : ""}`}>
                                <Icon name="phone" />
                                <input
                                    id="phone"
                                    type="tel"
                                    maxLength={15}
                                    placeholder="Nhập số điện thoại (nếu có)"
                                    value={form.phone}
                                    onChange={handleChange("phone")}
                                />
                            </div>
                            {errors.phone ? (
                                <div className="ab-error">{errors.phone}</div>
                            ) : (
                                <div className="ab-hint">Có thể bỏ trống</div>
                            )}
                        </div>

                        <div className="ab-field">
                            <label className="ab-label" htmlFor="managers">
                                Quản lý chi nhánh
                            </label>
                            <div className="ab-manager-box">
                                <div
                                    id="managers"
                                    className={`ab-manager-trigger${managerMenuOpen ? " open" : ""}`}
                                    onClick={() => setManagerMenuOpen((v) => !v)}
                                >
                                    {selectedManagers.length === 0 ? (
                                        <span className="ab-manager-placeholder">Chọn nhân viên làm quản lý (nếu có)</span>
                                    ) : (
                                        <div className="ab-manager-chips">
                                            {selectedManagers.map((m) => (
                                                <span className="ab-chip" key={m.id}>
                                                    {m.name}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); toggleManager(m.id); }}
                                                        aria-label={`Bỏ chọn ${m.name}`}
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
                                    <div className="ab-manager-menu">
                                        <div className="ab-manager-search">
                                            <div className="ab-input-wrap no-icon">
                                                <Icon name="search" />
                                                <input
                                                    type="text"
                                                    placeholder="Tìm nhân viên theo tên hoặc chức vụ..."
                                                    value={managerSearch}
                                                    onChange={(e) => setManagerSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="ab-manager-list">
                                            {managersLoading ? (
                                                <div className="ab-manager-loading">Đang tải danh sách nhân viên...</div>
                                            ) : managersError ? (
                                                <div className="ab-manager-error">
                                                    {managersError}
                                                    <br />
                                                    <button type="button" className="ab-manager-retry" onClick={fetchManagers}>
                                                        Thử lại
                                                    </button>
                                                </div>
                                            ) : filteredEmployees.length === 0 ? (
                                                <div className="ab-manager-empty">Không tìm thấy nhân viên phù hợp</div>
                                            ) : (
                                                filteredEmployees.map((emp) => {
                                                    const selected = managerIds.includes(emp.id);
                                                    return (
                                                        <div
                                                            key={emp.id}
                                                            className={`ab-manager-option${selected ? " selected" : ""}`}
                                                            onClick={() => toggleManager(emp.id)}
                                                        >
                                                            <span className="ab-manager-check"><Icon name="check" /></span>
                                                            <span>
                                                                <div className="ab-manager-name">{emp.name}</div>
                                                                <div className="ab-manager-role">{emp.role}</div>
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="ab-hint">Không bắt buộc — có thể gán quản lý sau</div>
                        </div>
                    </div>

                    <div className="ab-col-right">
                        <div className="ab-card">
                            <h3 className="ab-section-title">
                                <Icon name="image" />
                                Hình ảnh chi nhánh
                            </h3>
                            <div
                                className={`ab-dropzone${dragOver ? " drag-over" : ""}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                <Icon name="upload" />
                                <div className="ab-dropzone-title">Kéo thả ảnh vào đây hoặc</div>
                                <button type="button" className="ab-dropzone-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    Chọn ảnh
                                </button>
                                <div className="ab-dropzone-meta">
                                    Định dạng: JPG, PNG. Kích thước tối đa: 5MB<br />
                                    Kích thước khuyến nghị: 1200 x 800px
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    multiple
                                    hidden
                                    onChange={handleFileInput}
                                />
                            </div>

                            {images.length > 0 && (
                                <div className="ab-preview-grid">
                                    {images.map((img) => (
                                        <div className="ab-preview-item" key={img.id}>
                                            <div className="ab-preview-thumb">
                                                <img src={img.src} alt={img.name} />
                                                <button type="button" className="ab-preview-remove" onClick={() => removeImage(img.id)} aria-label="Xóa ảnh">
                                                    <Icon name="x" />
                                                </button>
                                            </div>
                                            <div className="ab-preview-type">
                                                <input
                                                    type="text"
                                                    list="ab-image-type-options"
                                                    value={img.type}
                                                    onChange={(e) => setImageType(img.id, e.target.value)}
                                                    placeholder="Nhập loại ảnh..."
                                                    aria-label="Loại ảnh"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="ab-actions">
                    <button type="button" className="ab-btn" onClick={handleCancel} disabled={submitting}>
                        Hủy bỏ
                    </button>
                    <button type="submit" className="ab-btn ab-btn-primary" disabled={submitting}>
                        {submitting ? "Đang lưu..." : "Lưu chi nhánh"}
                    </button>
                </div>
            </form>

            {submitted && <div className="ab-toast">Đã lưu chi nhánh thành công.</div>}
            {submitError && <div className="ab-toast-error">{submitError}</div>}
        </div>
    );
}