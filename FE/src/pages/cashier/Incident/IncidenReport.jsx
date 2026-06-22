import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ImageIcon,
    RotateCcw,
    Search,
    Upload,
    Video as VideoIcon,
    Wrench,
    X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

// ─── Mock equipment list (replace with real API call) ─────────────────────────
// Shape must match: { equipment_id: number, code: string, name: string, location?: string }
const MOCK_EQUIPMENT = [
    { equipment_id: 1, code: "TB001", name: "Máy chạy bộ #01", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 2, code: "TB002", name: "Máy chạy bộ #02", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 3, code: "TB003", name: "Máy chạy bộ #03", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 4, code: "TB004", name: "Máy chạy bộ #04", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 5, code: "XD001", name: "Xe đạp cố định #01", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 6, code: "XD002", name: "Xe đạp cố định #02", location: "Tầng 1 – Khu Cardio" },
    { equipment_id: 7, code: "TL001", name: "Tạ đòn 20kg", location: "Tầng 2 – Khu Free Weight" },
    { equipment_id: 8, code: "TL002", name: "Tạ đòn 40kg", location: "Tầng 2 – Khu Free Weight" },
    { equipment_id: 9, code: "SM001", name: "Smith Machine #01", location: "Tầng 2 – Khu Máy" },
    { equipment_id: 10, code: "DX001", name: "Dây kéo cáp #01", location: "Tầng 2 – Khu Máy" },
    { equipment_id: 11, code: "DX002", name: "Dây kéo cáp #02", location: "Tầng 2 – Khu Máy" },
    { equipment_id: 12, code: "LP001", name: "Leg Press #01", location: "Tầng 2 – Khu Máy" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .vt-app {
        --bg: #F0F4FA;
        --card: #FFFFFF;
        --field: #F7F9FC;
        --field-focus: #FFFFFF;
        --border: #DDE3EE;
        --border-focus: #3B82F6;
        --text: #475569;
        --text-soft: #6B7A99;
        --teal: #0EA5E9;
        --teal-dark: #0284C7;
        --teal-light: #E0F2FE;
        --accent: #6366F1;
        --accent-light: #EEF2FF;
        --success: #10B981;
        --danger: #EF4444;
        --danger-light: #FEF2F2;
        background: var(--bg);
        color: var(--text);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        min-height: 100vh;
    }
    .vt-app *, .vt-app *::before, .vt-app *::after { box-sizing: border-box; margin: 0; }

    .vt-page {
        min-height: 100vh;
        display: flex; align-items: flex-start; justify-content: center;
        padding: 0px 20px 60px;
    }
    .vt-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 4px 6px -1px rgba(15,23,41,0.06), 0 10px 40px -10px rgba(15,23,41,0.10);
        width: 100%; max-width: 680px;
        padding: 40px 44px;
    }

    /* ── Header ── */
    .vt-header {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 28px; padding-bottom: 24px;
        border-bottom: 1px solid var(--border);
    }
    .vt-logo {
        width: 48px; height: 48px; border-radius: 14px;
        background: linear-gradient(135deg, var(--teal), var(--teal-dark));
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(14,165,233,0.35);
    }
    .vt-brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
    .vt-brand-name span { color: var(--teal); }
    .vt-brand-sub { font-size: 12px; color: var(--text-soft); margin-top: 3px; font-weight: 500; }
    .vt-pill {
        margin-left: auto;
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--teal-light); border: 1px solid rgba(14,165,233,0.25);
        color: var(--teal-dark); font-size: 11px; font-weight: 700;
        letter-spacing: 0.07em; padding: 6px 14px; border-radius: 999px; white-space: nowrap;
    }
    .vt-pill-dot {
        width: 6px; height: 6px; border-radius: 50%; background: var(--teal);
        animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── Labels / sections ── */
    .vt-section { margin-bottom: 24px; }
    .vt-label {
        display: block; font-size: 11px; font-weight: 700;
        letter-spacing: 0.08em; color: var(--text-soft);
        margin-bottom: 8px; text-transform: uppercase;
    }
    .vt-required { color: var(--danger); margin-left: 2px; }
    .vt-optional {
        font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
        color: var(--text-soft); background: var(--field);
        border: 1px solid var(--border); border-radius: 4px;
        padding: 1px 6px; margin-left: 6px; text-transform: uppercase; vertical-align: middle;
    }

    /* ── Inputs ── */
    .vt-input, .vt-textarea {
        width: 100%; background: var(--field); border: 1.5px solid var(--border);
        border-radius: 12px; padding: 13px 16px; font-size: 14px; color: var(--text);
        outline: none; transition: border-color .15s, background .15s, box-shadow .15s;
        font-family: 'Inter', sans-serif; font-weight: 500;
    }
    .vt-textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
    .vt-input::placeholder, .vt-textarea::placeholder { color: #B0BAD0; font-weight: 400; }
    .vt-input:focus, .vt-textarea:focus {
        border-color: var(--border-focus); background: var(--field-focus);
        box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .vt-input.has-error, .vt-textarea.has-error {
        border-color: var(--danger); background: var(--danger-light);
        box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
    }
    .vt-error {
        font-size: 12px; color: var(--danger); margin-top: 7px;
        font-weight: 600; display: flex; align-items: center; gap: 5px;
    }
    .vt-counter { font-size: 11.5px; color: var(--text-soft); text-align: right; margin-top: 6px; font-weight: 500; }

    /* ── Equipment picker ── */
    .eq-wrapper { position: relative; }

    .eq-trigger {
        width: 100%; background: var(--field); border: 1.5px solid var(--border);
        border-radius: 12px; padding: 13px 16px; font-size: 14px; color: var(--text);
        outline: none; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;
        font-weight: 500; display: flex; align-items: center; gap: 10px;
        transition: border-color .15s, background .15s, box-shadow .15s;
    }
    .eq-trigger:hover, .eq-trigger.is-open {
        border-color: var(--border-focus); background: var(--field-focus);
        box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .eq-trigger-label { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .eq-trigger-placeholder { color: #B0BAD0; font-weight: 400; }
    .eq-trigger-chevron { color: var(--text-soft); flex-shrink: 0; transition: transform .15s; }
    .eq-trigger.is-open .eq-trigger-chevron { transform: rotate(180deg); }

    .eq-selected-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--accent-light); border: 1px solid rgba(99,102,241,0.25);
        color: var(--accent); border-radius: 8px; padding: 3px 10px;
        font-size: 12px; font-weight: 700; flex-shrink: 0;
    }

    /* Clear selected btn */
    .eq-clear {
        width: 18px; height: 18px; border-radius: 50%; border: none; cursor: pointer;
        background: rgba(99,102,241,0.15); color: var(--accent);
        display: flex; align-items: center; justify-content: center;
        transition: background .1s; flex-shrink: 0;
    }
    .eq-clear:hover { background: rgba(239,68,68,0.15); color: var(--danger); }

    .eq-dropdown {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 200;
        background: var(--card); border: 1.5px solid var(--border);
        border-radius: 14px; box-shadow: 0 8px 30px -4px rgba(15,23,41,0.14);
        overflow: hidden;
    }

    .eq-search-wrap {
        padding: 10px 10px 8px;
        border-bottom: 1px solid var(--border);
        display: flex; align-items: center; gap: 8px;
        background: var(--field);
    }
    .eq-search {
        flex: 1; border: none; background: transparent; outline: none;
        font-size: 13.5px; color: var(--text); font-family: 'Inter', sans-serif; font-weight: 500;
    }
    .eq-search::placeholder { color: #B0BAD0; font-weight: 400; }

    .eq-list { max-height: 220px; overflow-y: auto; padding: 6px; }
    .eq-list::-webkit-scrollbar { width: 4px; }
    .eq-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .eq-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 12px; border-radius: 9px; cursor: pointer;
        transition: background .1s;
    }
    .eq-option:hover { background: var(--field); }
    .eq-option.is-selected { background: var(--accent-light); }

    .eq-option-code {
        font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
        color: var(--accent); background: var(--accent-light);
        border: 1px solid rgba(99,102,241,0.2);
        border-radius: 6px; padding: 2px 7px; flex-shrink: 0;
    }
    .eq-option-info { flex: 1; min-width: 0; }
    .eq-option-name { font-size: 13.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .eq-option-loc { font-size: 11.5px; color: var(--text-soft); margin-top: 1px; font-weight: 400; }
    .eq-option-check { color: var(--accent); flex-shrink: 0; }
    .eq-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--text-soft); font-weight: 500; }

    .eq-none-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 12px; border-radius: 9px; cursor: pointer;
        transition: background .1s; color: var(--text-soft); font-size: 13px; font-weight: 500;
        border-top: 1px solid var(--border); margin-top: 4px;
    }
    .eq-none-option:hover { background: var(--field); }

    /* ── Media ── */
    .vt-media-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .vt-media-count {
        font-size: 12px; color: var(--text-soft); font-weight: 600;
        background: var(--field); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px;
    }
    .vt-img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .vt-thumb {
        position: relative; border-radius: 10px; overflow: hidden;
        aspect-ratio: 1/1; background: var(--field); border: 1.5px solid var(--border);
    }
    .vt-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .vt-thumb-remove {
        position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%;
        background: rgba(255,255,255,0.92); color: var(--danger);
        display: flex; align-items: center; justify-content: center;
        border: none; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: background .1s;
    }
    .vt-thumb-remove:hover { background: var(--danger-light); }
    .vt-img-slot {
        aspect-ratio: 1/1; border: 1.5px dashed var(--border); border-radius: 10px;
        background: var(--field); display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 6px; cursor: pointer; transition: border-color .15s, background .15s;
        color: var(--text-soft);
    }
    .vt-img-slot:hover, .vt-img-slot.drag-active { border-color: var(--teal); background: var(--teal-light); color: var(--teal-dark); }
    .vt-img-slot span { font-size: 11px; font-weight: 600; }
    .vt-img-empty { aspect-ratio: 1/1; border: 1.5px dashed var(--border); border-radius: 10px; background: var(--field); opacity: .4; }
    .vt-video-drop {
        border: 1.5px dashed var(--border); border-radius: 12px; background: var(--field);
        padding: 20px; display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 7px; cursor: pointer; text-align: center;
        transition: border-color .15s, background .15s;
    }
    .vt-video-drop:hover, .vt-video-drop.drag-active { border-color: var(--accent); background: var(--accent-light); }
    .vt-video-drop .title { font-size: 13.5px; font-weight: 600; color: var(--text); }
    .vt-video-drop .title span { color: var(--accent); }
    .vt-video-drop .sub { font-size: 11.5px; color: var(--text-soft); font-weight: 500; }
    .vt-video-thumb {
        position: relative; border-radius: 12px; overflow: hidden;
        aspect-ratio: 16/9; border: 1.5px solid var(--border); background: #000;
    }
    .vt-video-thumb video { width: 100%; height: 100%; object-fit: contain; display: block; }
    .vt-video-thumb .vt-thumb-remove { top: 8px; right: 8px; width: 26px; height: 26px; }
    .vt-hint { font-size: 11.5px; color: var(--text-soft); margin-top: 8px; font-weight: 500; }
    .vt-divider { height: 1px; background: var(--border); margin: 4px 0 24px; }

    /* ── Submit ── */
    .vt-submit {
        width: 100%; background: linear-gradient(135deg, #0EA5E9, #0284C7);
        color: #fff; font-weight: 700; font-size: 15px; padding: 14px 0;
        border-radius: 12px; border: none; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        transition: filter .15s, transform .1s; box-shadow: 0 4px 14px rgba(14,165,233,0.35);
        letter-spacing: .01em;
    }
    .vt-submit:hover { filter: brightness(1.06); }
    .vt-submit:active { transform: translateY(1px); }

    /* ── Success ── */
    .vt-success-icon {
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg,#10B981,#059669);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px; box-shadow: 0 4px 16px rgba(16,185,129,0.35);
    }
    .vt-summary {
        background: var(--field); border: 1px solid var(--border);
        border-radius: 12px; padding: 14px 18px; margin: 18px 0 22px;
    }
    .vt-summary-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; font-size: 13px; }
    .vt-summary-row + .vt-summary-row { margin-top: 10px; }
    .vt-summary-row .key { color: var(--text-soft); font-weight: 500; }
    .vt-summary-row .val { font-weight: 700; text-align: right; }
`;

// ─── Equipment Picker component ───────────────────────────────────────────────
function EquipmentPicker({ value, onChange, equipmentList }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapRef = useRef(null);
    const searchRef = useRef(null);

    const selected = equipmentList.find((e) => e.equipment_id === value) ?? null;

    const filtered = equipmentList.filter((e) => {
        const q = search.toLowerCase();
        return (
            e.code.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            (e.location ?? "").toLowerCase().includes(q)
        );
    });

    // Close when clicking outside
    useEffect(() => {
        function handle(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
        else setSearch("");
    }, [open]);

    function select(id) {
        onChange(id);
        setOpen(false);
    }

    return (
        <div className="eq-wrapper" ref={wrapRef}>
            {/* Trigger */}
            <button
                type="button"
                className={`eq-trigger ${open ? "is-open" : ""}`}
                onClick={() => setOpen((o) => !o)}
            >
                <Wrench size={15} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                {selected ? (
                    <>
                        <span className="eq-trigger-label">
                            <span className="eq-selected-badge">{selected.code}</span>
                            {" "}{selected.name}
                        </span>
                        <button
                            type="button"
                            className="eq-clear"
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                            title="Bỏ chọn"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>
                    </>
                ) : (
                    <span className="eq-trigger-label eq-trigger-placeholder">
                        Chọn thiết bị liên quan (tuỳ chọn)
                    </span>
                )}
                <ChevronDown size={15} className="eq-trigger-chevron" />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="eq-dropdown">
                    {/* Search */}
                    <div className="eq-search-wrap">
                        <Search size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                        <input
                            ref={searchRef}
                            className="eq-search"
                            placeholder="Nhập mã hoặc tên thiết bị..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button type="button" className="eq-clear" onClick={() => setSearch("")}>
                                <X size={10} strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="eq-list">
                        {filtered.length === 0 ? (
                            <p className="eq-empty">Không tìm thấy thiết bị phù hợp</p>
                        ) : (
                            filtered.map((eq) => (
                                <div
                                    key={eq.equipment_id}
                                    className={`eq-option ${value === eq.equipment_id ? "is-selected" : ""}`}
                                    onClick={() => select(eq.equipment_id)}
                                >
                                    <span className="eq-option-code">{eq.code}</span>
                                    <div className="eq-option-info">
                                        <div className="eq-option-name">{eq.name}</div>
                                        {eq.location && <div className="eq-option-loc">{eq.location}</div>}
                                    </div>
                                    {value === eq.equipment_id && (
                                        <CheckCircle2 size={15} className="eq-option-check" />
                                    )}
                                </div>
                            ))
                        )}
                        {/* None option */}
                        <div
                            className="eq-none-option"
                            onClick={() => select(null)}
                        >
                            <X size={14} style={{ opacity: .5 }} />
                            Không liên quan thiết bị cụ thể
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ data, onReset }) {
    return (
        <div className="vt-app">
            <style>{STYLES}</style>
            <div className="vt-page" style={{ alignItems: "center" }}>
                <div className="vt-card" style={{ maxWidth: 480, textAlign: "center" }}>
                    <div className="vt-success-icon">
                        <CheckCircle2 size={26} color="#fff" strokeWidth={2.5} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Báo cáo đã được gửi!</h2>
                    <p style={{ fontSize: 14, color: "var(--text-soft)", marginTop: 8, lineHeight: 1.6 }}>
                        Sự cố đã được ghi nhận và sẽ được xử lý sớm.
                    </p>
                    <div className="vt-summary">
                        <div className="vt-summary-row">
                            <span className="key">Tiêu đề</span>
                            <span className="val">{data.title}</span>
                        </div>
                        {data.equipmentCode && (
                            <div className="vt-summary-row">
                                <span className="key">Thiết bị</span>
                                <span className="val">{data.equipmentCode} – {data.equipmentName}</span>
                            </div>
                        )}
                        <div className="vt-summary-row">
                            <span className="key">Minh chứng</span>
                            <span className="val">{data.imageCount} ảnh{data.hasVideo ? " • 1 video" : ""}</span>
                        </div>
                    </div>
                    <button className="vt-submit" onClick={onReset}>
                        <RotateCcw size={15} /> Gửi báo cáo khác
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function IncidentReportForm() {
    // ── Form state ──
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [equipmentId, setEquipmentId] = useState(null);   // number | null → maps to EquipmentId
    const [images, setImages] = useState([]);
    const [video, setVideo] = useState(null);

    // ── UI state ──
    const [imageError, setImageError] = useState("");
    const [videoError, setVideoError] = useState("");
    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(null);
    const [imgDragActive, setImgDragActive] = useState(false);
    const [vidDragActive, setVidDragActive] = useState(false);

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    // ── Validation ──
    const errors = {
        title: !title.trim() ? "Vui lòng nhập tiêu đề sự cố" : "",
        description: !description.trim() ? "Vui lòng mô tả chi tiết sự cố" : "",
    };
    const isValid = !errors.title && !errors.description;

    // ── Image handlers ──
    function addImages(fileList) {
        const list = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
        if (!list.length) { setImageError("Chỉ chấp nhận file hình ảnh"); return; }
        const room = MAX_IMAGES - images.length;
        if (room <= 0) { setImageError(`Đã đạt giới hạn ${MAX_IMAGES} hình ảnh`); return; }
        const oversize = list.find((f) => f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
        if (oversize) { setImageError(`Hình "${oversize.name}" vượt quá ${MAX_IMAGE_SIZE_MB}MB`); return; }
        const toAdd = list.slice(0, room).map((f) => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            file: f, url: URL.createObjectURL(f),
        }));
        setImages((prev) => [...prev, ...toAdd]);
        setImageError(list.length > room ? `Chỉ thêm được ${room} ảnh nữa` : "");
    }

    function removeImage(id) {
        setImages((prev) => {
            const t = prev.find((i) => i.id === id);
            if (t) URL.revokeObjectURL(t.url);
            return prev.filter((i) => i.id !== id);
        });
        setImageError("");
    }

    // ── Video handlers ──
    function addVideo(fileList) {
        const file = (fileList || [])[0];
        if (!file) return;
        if (!file.type.startsWith("video/")) { setVideoError("Chỉ chấp nhận file video"); return; }
        if (video) { setVideoError("Hãy xoá video hiện tại trước khi thêm mới"); return; }
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) { setVideoError(`Video vượt quá ${MAX_VIDEO_SIZE_MB}MB`); return; }
        setVideo({ file, url: URL.createObjectURL(file) });
        setVideoError("");
    }

    function removeVideo() {
        if (video) URL.revokeObjectURL(video.url);
        setVideo(null); setVideoError("");
    }

    // ── Submit ──
    // buildPayload() returns the object you POST to the API.
    // Attach images/video as FormData separately if your API needs multipart.
    function buildPayload() {
        return {
            title: title.trim(),
            description: description.trim(),
            equipment_id: equipmentId,          // number | null → maps to EquipmentId
            // images and video are File objects — upload via FormData
            image_files: images.map((i) => i.file),
            video_file: video?.file ?? null,
        };
    }

    function handleSubmit(e) {
        e.preventDefault();
        setTouched({ title: true, description: true });
        if (!isValid) return;

        const payload = buildPayload();
        // TODO: replace with real API call
        // const fd = new FormData();
        // fd.append("title",        payload.title);
        // fd.append("description",  payload.description);
        // if (payload.equipment_id) fd.append("equipment_id", payload.equipment_id);
        // payload.image_files.forEach((f) => fd.append("images", f));
        // if (payload.video_file)   fd.append("video", payload.video_file);
        // await fetch("/api/incidents", { method: "POST", body: fd });
        console.log("📤 Payload:", payload);

        const eq = MOCK_EQUIPMENT.find((e) => e.equipment_id === equipmentId);
        setSubmitted({
            title: payload.title,
            equipmentCode: eq?.code ?? null,
            equipmentName: eq?.name ?? null,
            imageCount: images.length,
            hasVideo: !!video,
        });
    }

    function resetForm() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        if (video) URL.revokeObjectURL(video.url);
        setTitle(""); setDescription(""); setEquipmentId(null);
        setImages([]); setVideo(null);
        setImageError(""); setVideoError(""); setTouched({}); setSubmitted(null);
    }

    if (submitted) return <SuccessScreen data={submitted} onReset={resetForm} />;

    // ── Image grid (always 3 slots) ──
    const imageSlots = [];
    for (let i = 0; i < MAX_IMAGES; i++) {
        if (i < images.length) {
            imageSlots.push(
                <div key={images[i].id} className="vt-thumb">
                    <img src={images[i].url} alt={`Ảnh ${i + 1}`} />
                    <button type="button" className="vt-thumb-remove" onClick={() => removeImage(images[i].id)}>
                        <X size={11} strokeWidth={3} />
                    </button>
                </div>
            );
        } else if (i === images.length) {
            imageSlots.push(
                <div
                    key="add"
                    className={`vt-img-slot ${imgDragActive ? "drag-active" : ""}`}
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setImgDragActive(true); }}
                    onDragLeave={() => setImgDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setImgDragActive(false); addImages(e.dataTransfer.files); }}
                >
                    <Upload size={16} />
                    <span>Thêm ảnh</span>
                </div>
            );
        } else {
            imageSlots.push(<div key={`empty-${i}`} className="vt-img-empty" />);
        }
    }

    // ── Render ──
    return (
        <div className="vt-app">
            <style>{STYLES}</style>
            <div className="vt-page">
                <div className="vt-card">
                    {/* Header */}
                    <div className="vt-header">
                        <div className="vt-logo">
                            <span style={{ color: "#fff", fontWeight: 900, fontSize: 20, lineHeight: 1 }}>+</span>
                        </div>
                        <div>
                            <div className="vt-brand-name">VT<span>GYM</span></div>
                            <div className="vt-brand-sub">Quản lý cơ sở vật chất</div>
                        </div>
                        <div className="vt-pill">
                            <span className="vt-pill-dot" /> BÁO CÁO SỰ CỐ
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>

                        {/* ── Tiêu đề ── */}
                        <div className="vt-section">
                            <label className="vt-label">
                                TIÊU ĐỀ SỰ CỐ <span className="vt-required">*</span>
                            </label>
                            <input
                                className={`vt-input ${touched.title && errors.title ? "has-error" : ""}`}
                                placeholder="VD: Máy chạy bộ #04 phát tiếng kêu lạ"
                                value={title}
                                maxLength={150}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                            />
                            {touched.title && errors.title && (
                                <p className="vt-error"><AlertTriangle size={13} /> {errors.title}</p>
                            )}
                        </div>

                        {/* ── Mô tả ── */}
                        <div className="vt-section">
                            <label className="vt-label">
                                MÔ TẢ CHI TIẾT <span className="vt-required">*</span>
                            </label>
                            <textarea
                                className={`vt-textarea ${touched.description && errors.description ? "has-error" : ""}`}
                                rows={4}
                                maxLength={1000}
                                placeholder="Sự cố xảy ra từ khi nào, ảnh hưởng thế nào đến hội viên hoặc nhân viên..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                            />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                {touched.description && errors.description
                                    ? <p className="vt-error"><AlertTriangle size={13} /> {errors.description}</p>
                                    : <span />}
                                <p className="vt-counter">{description.length}/1000</p>
                            </div>
                        </div>

                        {/* ── Thiết bị ── */}
                        <div className="vt-section">
                            <label className="vt-label">
                                THIẾT BỊ LIÊN QUAN
                                <span className="vt-optional">Tuỳ chọn</span>
                            </label>
                            <EquipmentPicker
                                value={equipmentId}
                                onChange={setEquipmentId}
                                equipmentList={MOCK_EQUIPMENT}
                            />
                            <p className="vt-hint" style={{ marginTop: 7 }}>
                                Để trống nếu sự cố không liên quan đến thiết bị cụ thể
                            </p>
                        </div>

                        <div className="vt-divider" />

                        {/* ── Hình ảnh ── */}
                        <div className="vt-section">
                            <div className="vt-media-header">
                                <label className="vt-label" style={{ marginBottom: 0 }}>
                                    <ImageIcon size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
                                    HÌNH ẢNH MINH CHỨNG
                                </label>
                                <span className="vt-media-count">{images.length} / {MAX_IMAGES}</span>
                            </div>
                            <div className="vt-img-grid">{imageSlots}</div>
                            <input ref={imageInputRef} type="file" accept="image/*" multiple hidden
                                onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                            <p className="vt-hint">Tối đa {MAX_IMAGES} ảnh · mỗi ảnh dưới {MAX_IMAGE_SIZE_MB}MB</p>
                            {imageError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={13} /> {imageError}</p>}
                        </div>

                        {/* ── Video ── */}
                        <div className="vt-section">
                            <div className="vt-media-header">
                                <label className="vt-label" style={{ marginBottom: 0 }}>
                                    <VideoIcon size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
                                    VIDEO MINH CHỨNG
                                </label>
                                <span className="vt-media-count">{video ? 1 : 0} / 1</span>
                            </div>
                            {!video ? (
                                <div
                                    className={`vt-video-drop ${vidDragActive ? "drag-active" : ""}`}
                                    onClick={() => videoInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setVidDragActive(true); }}
                                    onDragLeave={() => setVidDragActive(false)}
                                    onDrop={(e) => { e.preventDefault(); setVidDragActive(false); addVideo(e.dataTransfer.files); }}
                                >
                                    <VideoIcon size={22} style={{ color: "var(--accent)", opacity: .7 }} />
                                    <p className="title">Kéo thả video vào đây hoặc <span>bấm để chọn</span></p>
                                    <p className="sub">Tối đa 1 video · dưới {MAX_VIDEO_SIZE_MB}MB</p>
                                </div>
                            ) : (
                                <div className="vt-video-thumb">
                                    <video src={video.url} controls />
                                    <button type="button" className="vt-thumb-remove" onClick={removeVideo}>
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                            <input ref={videoInputRef} type="file" accept="video/*" hidden
                                onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
                            {videoError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={13} /> {videoError}</p>}
                        </div>

                        <button type="submit" className="vt-submit">Gửi báo cáo</button>
                    </form>
                </div>
            </div>
        </div>
    );
}