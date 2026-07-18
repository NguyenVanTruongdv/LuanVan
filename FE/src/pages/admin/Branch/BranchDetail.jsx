import { useMemo, useState } from "react";
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
        default:
            return null;
    }
}



export default function BranchDetailOfAdmin() {
    const [branch, setBranch] = useState(INITIAL_BRANCH);
    const [activeImage, setActiveImage] = useState(0);
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState(null);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState("");

    const managers = useMemo(
        () => EMPLOYEES.filter((e) => branch.managerIds.includes(e.id)),
        [branch.managerIds]
    );

    const openEdit = () => {
        setDraft({ ...branch, managerIds: [...branch.managerIds] });
        setEditOpen(true);
    };

    const saveEdit = () => {
        setBranch(draft);
        setEditOpen(false);
    };

    const toggleDraftManager = (id) => {
        setDraft((d) => ({
            ...d,
            managerIds: d.managerIds.includes(id)
                ? d.managerIds.filter((x) => x !== id)
                : [...d.managerIds, id],
        }));
    };

    const filteredEmployees = useMemo(() => {
        const q = managerSearch.trim().toLowerCase();
        if (!q) return EMPLOYEES;
        return EMPLOYEES.filter((e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
    }, [managerSearch]);

    return (
        <div className="bd-root">
            <style>{`
        .bd-root {
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
          --red-soft: rgba(248, 113, 113, 0.12);
          --green: #4ADE80;
          --green-soft: rgba(74, 222, 128, 0.12);
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
        .bd-breadcrumb .current { color: var(--cyan); font-weight: 600; }
        .bd-breadcrumb .sep { color: var(--muted-dim); }

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
          border: 1px solid var(--line);
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
          color: rgba(241,245,249,0.55);
        }
        .bd-gallery-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(11, 17, 32, 0.7);
          color: var(--ink);
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
          color: rgba(241,245,249,0.5);
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
          border: 1px solid var(--line);
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
        .bd-manage-images-btn:hover { border-color: var(--cyan); color: var(--cyan); }

        /* Info panel */
        .bd-info-card {
          position: relative;
          background: var(--card-bg);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 28px 26px 24px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.35);
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
        .bd-pill { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
        .bd-pill.active { background: var(--green-soft); color: var(--green); }
        .bd-pill.inactive { background: var(--red-soft); color: var(--red); }
        .bd-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        .bd-edit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--line);
          background: var(--input-bg);
          color: var(--ink);
          border-radius: 9px;
          padding: 7px 13px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .bd-edit-btn:hover { border-color: var(--cyan); color: var(--cyan); }

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
        .bd-address svg { color: var(--cyan); flex-shrink: 0; margin-top: 3px; }

        .bd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 16px;
          padding: 18px 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
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
        .bd-grid-item .value svg { color: var(--cyan); }

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
        .bd-section-title svg { color: var(--cyan); }

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
          color: var(--cyan);
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
          background: rgba(2, 6, 15, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 20px;
          overflow-y: auto;
        }
        .bd-modal {
          background: var(--card-bg);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 26px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .bd-modal h3 { margin: 0 0 20px; font-size: 17px; font-weight: 700; color: var(--ink); }
        .bd-field { margin-bottom: 16px; }
        .bd-field label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 7px; }
        .bd-field input, .bd-field textarea {
          width: 100%;
          border: 1px solid var(--line);
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
          border: 1px solid var(--line);
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
        .bd-manager-trigger svg.chev { color: var(--muted); transition: transform 0.15s; flex-shrink: 0; }
        .bd-manager-trigger.open svg.chev { transform: rotate(180deg); }
        .bd-manager-placeholder { color: var(--muted-dim); font-size: 13.5px; font-weight: 500; }
        .bd-manager-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .bd-chip {
          display: flex; align-items: center; gap: 6px;
          background: var(--cyan-soft); color: var(--cyan);
          border: 1px solid rgba(6, 182, 212, 0.35);
          border-radius: 999px; padding: 3px 6px 3px 10px;
          font-size: 12px; font-weight: 600;
        }
        .bd-chip button { border: none; background: transparent; color: var(--cyan); cursor: pointer; display: flex; align-items: center; padding: 2px; border-radius: 50%; }
        .bd-chip button:hover { background: rgba(6, 182, 212, 0.25); }

        .bd-manager-menu {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: var(--card-bg); border: 1px solid var(--line); border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.45); z-index: 10; overflow: hidden;
        }
        .bd-manager-search { padding: 9px; border-bottom: 1px solid var(--line); }
        .bd-manager-search input {
          width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px 8px 32px;
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
        .bd-manager-option.selected .bd-manager-check { background: var(--cyan); border-color: var(--cyan); color: #04222B; }

        .bd-status-toggle { display: flex; gap: 8px; }
        .bd-status-opt {
          flex: 1; text-align: center; padding: 9px; border-radius: 9px; border: 1px solid var(--line);
          background: var(--input-bg); color: var(--muted); font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .bd-status-opt.selected.active { border-color: var(--green); color: var(--green); background: var(--green-soft); }
        .bd-status-opt.selected.inactive { border-color: var(--red); color: var(--red); background: var(--red-soft); }

        .bd-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
        .bd-btn {
          border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer;
          border: 1px solid var(--line); background: var(--card-bg); color: var(--ink);
        }
        .bd-btn:hover { background: var(--input-bg); }
        .bd-btn-primary { background: var(--cyan); border-color: var(--cyan); color: #04222B; }
        .bd-btn-primary:hover { background: var(--cyan-dark); border-color: var(--cyan-dark); color: var(--ink); }

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
                <span>Trang chủ</span>
                <span className="sep">›</span>
                <span>Quản lý chi nhánh</span>
                <span className="sep">›</span>
                <span className="current">Chi tiết chi nhánh</span>
            </div>

            <div className="bd-layout">
                <div>
                    <div className="bd-gallery-main">
                        <div className="bd-gallery-tag"><Icon name="image" size={13} /> Ảnh</div>
                        <div className="bd-gallery-placeholder" style={{ background: `linear-gradient(135deg, ${GALLERY[activeImage].tone}, #0B1120)` }}>
                            <Icon name="building" size={56} />
                        </div>
                    </div>
                    <div className="bd-thumbs">
                        {GALLERY.map((g, idx) => (
                            <div
                                key={g.id}
                                className={`bd-thumb${idx === activeImage ? " active" : ""}`}
                                onClick={() => setActiveImage(idx)}
                            >
                                <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${g.tone}, #0B1120)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon name="building" size={22} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <a href="/admin/branches-img" className="bd-manage-images-btn">
                        <Icon name="images-stack" />
                        Quản lý hình ảnh chi nhánh
                        <Icon name="arrow-right" />
                    </a>
                </div>

                <div className="bd-info-card">
                    <div className="bd-info-top">
                        <div className="bd-code-row">
                            <span className="bd-code">#{branch.code}</span>
                            <span className={`bd-pill ${branch.status}`}>
                                <span className="dot" />
                                {branch.status === "active" ? "Đang hoạt động" : "Ngưng hoạt động"}
                            </span>
                        </div>
                        <button type="button" className="bd-edit-btn" onClick={openEdit}>
                            <Icon name="edit" /> Chỉnh sửa thông tin
                        </button>
                    </div>

                    <h1 className="bd-name">{branch.branch_name}</h1>
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
                            <div className="value"><Icon name="calendar" />{branch.createdAt}</div>
                        </div>
                        <div className="bd-grid-item">
                            <div className="label">Số quản lý</div>
                            <div className="value"><Icon name="users" />{managers.length} người</div>
                        </div>
                        <div className="bd-grid-item">
                            <div className="label">Mã chi nhánh</div>
                            <div className="value">#{branch.code}</div>
                        </div>
                    </div>

                    <div className="bd-section-title"><Icon name="users" /> Quản lý chi nhánh</div>
                    <div className="bd-manager-list">
                        {managers.length === 0 ? (
                            <div className="bd-manager-empty">Chưa gán quản lý cho chi nhánh này.</div>
                        ) : (
                            managers.map((m) => (
                                <div className="bd-manager-item" key={m.id}>
                                    <div className="bd-manager-avatar">{m.name.split(" ").slice(-1)[0][0]}</div>
                                    <div>
                                        <div className="bd-manager-name">{m.name}</div>
                                        <div className="bd-manager-role">{m.role}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {editOpen && draft && (
                <div className="bd-modal-overlay" onClick={() => setEditOpen(false)}>
                    <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Chỉnh sửa thông tin chi nhánh</h3>

                        <div className="bd-field">
                            <label>Tên chi nhánh</label>
                            <input
                                type="text"
                                value={draft.branch_name}
                                onChange={(e) => setDraft((d) => ({ ...d, branch_name: e.target.value }))}
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
                                    className={`bd-status-opt${draft.status === "active" ? " selected active" : ""}`}
                                    onClick={() => setDraft((d) => ({ ...d, status: "active" }))}
                                >
                                    Đang hoạt động
                                </div>
                                <div
                                    className={`bd-status-opt${draft.status === "inactive" ? " selected inactive" : ""}`}
                                    onClick={() => setDraft((d) => ({ ...d, status: "inactive" }))}
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
                                            {EMPLOYEES.filter((e) => draft.managerIds.includes(e.id)).map((m) => (
                                                <span className="bd-chip" key={m.id}>
                                                    {m.name}
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleDraftManager(m.id); }}>
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
                                            {filteredEmployees.map((emp) => {
                                                const selected = draft.managerIds.includes(emp.id);
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        className={`bd-manager-option${selected ? " selected" : ""}`}
                                                        onClick={() => toggleDraftManager(emp.id)}
                                                    >
                                                        <span className="bd-manager-check"><Icon name="check" /></span>
                                                        <span>
                                                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{emp.name}</div>
                                                            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{emp.role}</div>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bd-modal-actions">
                            <button type="button" className="bd-btn" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button type="button" className="bd-btn bd-btn-primary" onClick={saveEdit}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}