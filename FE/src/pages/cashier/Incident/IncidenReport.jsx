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

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

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

const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .vt-app {
        --green: #1E6B45;
        --green-dark: #155235;
        --green-mid: #237A4F;
        --green-light: #E8F5EE;
        --green-border: rgba(30,107,69,0.2);
        --bg: #F4F6F8;
        --card: #FFFFFF;
        --field: #F7F9FC;
        --field-focus: #FFFFFF;
        --border: #DDE3EE;
        --border-focus: #1E6B45;
        --text: #111827;
        --text-soft: #6B7280;
        --danger: #DC2626;
        --danger-light: #FEF2F2;
        --success: #1E6B45;
        background: var(--bg);
        color: var(--text);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        min-height: 100vh;
    }
    .vt-app *, .vt-app *::before, .vt-app *::after { box-sizing: border-box; margin: 0; }

    /* ── Page layout: full-width 2-col ── */
    .vt-page {
        min-height: 100vh;
        padding: 28px 32px 60px;
    }

    .vt-page-header {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 24px; padding-bottom: 20px;
        border-bottom: 1px solid var(--border);
    }
    .vt-logo {
        width: 40px; height: 40px; border-radius: 10px;
        background: linear-gradient(135deg, var(--green), var(--green-dark));
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(30,107,69,0.3);
    }
    .vt-page-title { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
    .vt-page-sub { font-size: 13px; color: var(--text-soft); margin-top: 1px; }
    .vt-pill {
        margin-left: auto;
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--green-light); border: 1px solid var(--green-border);
        color: var(--green); font-size: 11px; font-weight: 700;
        letter-spacing: 0.07em; padding: 5px 12px; border-radius: 999px; white-space: nowrap;
    }
    .vt-pill-dot {
        width: 6px; height: 6px; border-radius: 50%; background: var(--green);
        animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── 2-col grid ── */
    .vt-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: start;
    }

    .vt-col {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 28px 30px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    .vt-col-title {
        font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
        color: var(--green); text-transform: uppercase;
        margin-bottom: 20px; padding-bottom: 12px;
        border-bottom: 2px solid var(--green-light);
        display: flex; align-items: center; gap: 8px;
    }

    /* ── Sections / fields ── */
    .vt-section { margin-bottom: 20px; }
    .vt-section:last-child { margin-bottom: 0; }

    .vt-label {
        display: block; font-size: 12px; font-weight: 700;
        color: var(--text); margin-bottom: 7px;
    }
    .vt-required { color: var(--danger); margin-left: 2px; }
    .vt-optional {
        font-size: 10px; font-weight: 600;
        color: var(--text-soft); background: var(--field);
        border: 1px solid var(--border); border-radius: 4px;
        padding: 1px 6px; margin-left: 6px; vertical-align: middle;
        text-transform: uppercase;
    }

    .vt-input, .vt-textarea {
        width: 100%; background: var(--field); border: 1.5px solid var(--border);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: var(--text);
        outline: none; transition: border-color .15s, background .15s, box-shadow .15s;
        font-family: 'Inter', sans-serif; font-weight: 500;
    }
    .vt-textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
    .vt-input::placeholder, .vt-textarea::placeholder { color: #B0BAD0; font-weight: 400; }
    .vt-input:focus, .vt-textarea:focus {
        border-color: var(--border-focus); background: var(--field-focus);
        box-shadow: 0 0 0 3px rgba(30,107,69,0.10);
    }
    .vt-input.has-error, .vt-textarea.has-error {
        border-color: var(--danger); background: var(--danger-light);
    }
    .vt-error {
        font-size: 12px; color: var(--danger); margin-top: 6px;
        font-weight: 600; display: flex; align-items: center; gap: 5px;
    }
    .vt-counter { font-size: 11px; color: var(--text-soft); text-align: right; margin-top: 5px; }
    .vt-hint { font-size: 11.5px; color: var(--text-soft); margin-top: 6px; }

    /* ── Equipment picker ── */
    .eq-wrapper { position: relative; }
    .eq-trigger {
        width: 100%; background: var(--field); border: 1.5px solid var(--border);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: var(--text);
        outline: none; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;
        font-weight: 500; display: flex; align-items: center; gap: 10px;
        transition: border-color .15s, box-shadow .15s;
    }
    .eq-trigger:hover, .eq-trigger.is-open {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px rgba(30,107,69,0.10);
    }
    .eq-trigger-label { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .eq-trigger-placeholder { color: #B0BAD0; font-weight: 400; }
    .eq-trigger-chevron { color: var(--text-soft); flex-shrink: 0; transition: transform .15s; }
    .eq-trigger.is-open .eq-trigger-chevron { transform: rotate(180deg); }

    .eq-selected-badge {
        display: inline-flex; align-items: center;
        background: var(--green-light); border: 1px solid var(--green-border);
        color: var(--green); border-radius: 6px; padding: 2px 8px;
        font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .eq-clear {
        width: 18px; height: 18px; border-radius: 50%; border: none; cursor: pointer;
        background: rgba(30,107,69,0.1); color: var(--green);
        display: flex; align-items: center; justify-content: center;
        transition: background .1s; flex-shrink: 0;
    }
    .eq-clear:hover { background: rgba(220,38,38,0.12); color: var(--danger); }

    .eq-dropdown {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 200;
        background: var(--card); border: 1.5px solid var(--border);
        border-radius: 12px; box-shadow: 0 8px 24px -4px rgba(0,0,0,0.12);
        overflow: hidden;
    }
    .eq-search-wrap {
        padding: 10px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; gap: 8px; background: var(--field);
    }
    .eq-search {
        flex: 1; border: none; background: transparent; outline: none;
        font-size: 13px; color: var(--text); font-family: 'Inter', sans-serif; font-weight: 500;
    }
    .eq-search::placeholder { color: #B0BAD0; font-weight: 400; }
    .eq-list { max-height: 200px; overflow-y: auto; padding: 6px; }
    .eq-list::-webkit-scrollbar { width: 4px; }
    .eq-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .eq-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 8px; cursor: pointer;
        transition: background .1s;
    }
    .eq-option:hover { background: var(--field); }
    .eq-option.is-selected { background: var(--green-light); }
    .eq-option-code {
        font-size: 11px; font-weight: 700; color: var(--green);
        background: var(--green-light); border: 1px solid var(--green-border);
        border-radius: 5px; padding: 2px 6px; flex-shrink: 0;
    }
    .eq-option-info { flex: 1; min-width: 0; }
    .eq-option-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .eq-option-loc { font-size: 11px; color: var(--text-soft); margin-top: 1px; }
    .eq-option-check { color: var(--green); flex-shrink: 0; }
    .eq-empty { padding: 18px; text-align: center; font-size: 13px; color: var(--text-soft); }
    .eq-none-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 8px; cursor: pointer;
        transition: background .1s; color: var(--text-soft); font-size: 13px;
        border-top: 1px solid var(--border); margin-top: 4px;
    }
    .eq-none-option:hover { background: var(--field); }

    /* ── Media ── */
    .vt-media-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .vt-media-count {
        font-size: 11px; color: var(--text-soft); font-weight: 700;
        background: var(--field); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px;
    }
    .vt-img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .vt-thumb {
        position: relative; border-radius: 8px; overflow: hidden;
        aspect-ratio: 1/1; background: var(--field); border: 1.5px solid var(--border);
    }
    .vt-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .vt-thumb-remove {
        position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 50%;
        background: rgba(255,255,255,0.92); color: var(--danger);
        display: flex; align-items: center; justify-content: center;
        border: none; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .vt-img-slot {
        aspect-ratio: 1/1; border: 1.5px dashed var(--border); border-radius: 8px;
        background: var(--field); display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 5px; cursor: pointer; transition: border-color .15s, background .15s;
        color: var(--text-soft);
    }
    .vt-img-slot:hover, .vt-img-slot.drag-active { border-color: var(--green); background: var(--green-light); color: var(--green); }
    .vt-img-slot span { font-size: 11px; font-weight: 600; }
    .vt-img-empty { aspect-ratio: 1/1; border: 1.5px dashed var(--border); border-radius: 8px; background: var(--field); opacity: .35; }

    .vt-video-drop {
        border: 1.5px dashed var(--border); border-radius: 10px; background: var(--field);
        padding: 22px; display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 6px; cursor: pointer; text-align: center;
        transition: border-color .15s, background .15s;
    }
    .vt-video-drop:hover, .vt-video-drop.drag-active { border-color: var(--green); background: var(--green-light); }
    .vt-video-drop .title { font-size: 13px; font-weight: 600; color: var(--text); }
    .vt-video-drop .title span { color: var(--green); }
    .vt-video-drop .sub { font-size: 11.5px; color: var(--text-soft); }
    .vt-video-thumb {
        position: relative; border-radius: 10px; overflow: hidden;
        aspect-ratio: 16/9; border: 1.5px solid var(--border); background: #000;
    }
    .vt-video-thumb video { width: 100%; height: 100%; object-fit: contain; display: block; }
    .vt-video-thumb .vt-thumb-remove { top: 8px; right: 8px; width: 24px; height: 24px; }

    /* ── Submit ── */
    .vt-submit-row { margin-top: 20px; }
    .vt-submit {
        width: 100%; background: linear-gradient(135deg, var(--green), var(--green-dark));
        color: #fff; font-weight: 700; font-size: 15px; padding: 13px 0;
        border-radius: 10px; border: none; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        transition: filter .15s, transform .1s; box-shadow: 0 4px 14px rgba(30,107,69,0.3);
    }
    .vt-submit:hover { filter: brightness(1.07); }
    .vt-submit:active { transform: translateY(1px); }

    /* ── Success ── */
    .vt-success-wrap {
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        padding: 40px 20px;
    }
    .vt-success-card {
        background: var(--card); border: 1px solid var(--border); border-radius: 16px;
        padding: 40px; max-width: 440px; width: 100%; text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    .vt-success-icon {
        width: 52px; height: 52px; border-radius: 50%;
        background: linear-gradient(135deg, var(--green), var(--green-dark));
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px; box-shadow: 0 4px 14px rgba(30,107,69,0.3);
    }
    .vt-summary {
        background: var(--field); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px 16px; margin: 16px 0 20px; text-align: left;
    }
    .vt-summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    .vt-summary-row + .vt-summary-row { margin-top: 9px; }
    .vt-summary-row .key { color: var(--text-soft); }
    .vt-summary-row .val { font-weight: 700; text-align: right; }

    @media (max-width: 900px) {
        .vt-grid { grid-template-columns: 1fr; }
        .vt-page { padding: 20px 16px 60px; }
    }
`;

// ─── Equipment Picker ──────────────────────────────────────────────────────────
function EquipmentPicker({ value, onChange, equipmentList }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapRef = useRef(null);
    const searchRef = useRef(null);

    const selected = equipmentList.find((e) => e.equipment_id === value) ?? null;
    const filtered = equipmentList.filter((e) => {
        const q = search.toLowerCase();
        return e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || (e.location ?? "").toLowerCase().includes(q);
    });

    useEffect(() => {
        function handle(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
        else setSearch("");
    }, [open]);

    function select(id) { onChange(id); setOpen(false); }

    return (
        <div className="eq-wrapper" ref={wrapRef}>
            <button type="button" className={`eq-trigger ${open ? "is-open" : ""}`} onClick={() => setOpen((o) => !o)}>
                <Wrench size={14} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                {selected ? (
                    <>
                        <span className="eq-trigger-label">
                            <span className="eq-selected-badge">{selected.code}</span>{" "}{selected.name}
                        </span>
                        <button type="button" className="eq-clear" onClick={(e) => { e.stopPropagation(); onChange(null); }}>
                            <X size={10} strokeWidth={3} />
                        </button>
                    </>
                ) : (
                    <span className="eq-trigger-label eq-trigger-placeholder">Chọn thiết bị liên quan (tuỳ chọn)</span>
                )}
                <ChevronDown size={14} className="eq-trigger-chevron" />
            </button>
            {open && (
                <div className="eq-dropdown">
                    <div className="eq-search-wrap">
                        <Search size={13} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
                        <input ref={searchRef} className="eq-search" placeholder="Nhập mã hoặc tên thiết bị..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button type="button" className="eq-clear" onClick={() => setSearch("")}><X size={10} strokeWidth={3} /></button>}
                    </div>
                    <div className="eq-list">
                        {filtered.length === 0 ? (
                            <p className="eq-empty">Không tìm thấy thiết bị</p>
                        ) : (
                            filtered.map((eq) => (
                                <div key={eq.equipment_id} className={`eq-option ${value === eq.equipment_id ? "is-selected" : ""}`} onClick={() => select(eq.equipment_id)}>
                                    <span className="eq-option-code">{eq.code}</span>
                                    <div className="eq-option-info">
                                        <div className="eq-option-name">{eq.name}</div>
                                        {eq.location && <div className="eq-option-loc">{eq.location}</div>}
                                    </div>
                                    {value === eq.equipment_id && <CheckCircle2 size={14} className="eq-option-check" />}
                                </div>
                            ))
                        )}
                        <div className="eq-none-option" onClick={() => select(null)}>
                            <X size={13} style={{ opacity: .5 }} /> Không liên quan thiết bị cụ thể
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ data, onReset }) {
    return (
        <div className="vt-app">
            <style>{STYLES}</style>
            <div className="vt-success-wrap">
                <div className="vt-success-card">
                    <div className="vt-success-icon"><CheckCircle2 size={24} color="#fff" strokeWidth={2.5} /></div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Báo cáo đã được gửi!</h2>
                    <p style={{ fontSize: 13.5, color: "var(--text-soft)", marginTop: 6, lineHeight: 1.6 }}>
                        Sự cố đã được ghi nhận và sẽ được xử lý sớm.
                    </p>
                    <div className="vt-summary">
                        <div className="vt-summary-row"><span className="key">Tiêu đề</span><span className="val">{data.title}</span></div>
                        {data.equipmentCode && <div className="vt-summary-row"><span className="key">Thiết bị</span><span className="val">{data.equipmentCode} – {data.equipmentName}</span></div>}
                        <div className="vt-summary-row"><span className="key">Minh chứng</span><span className="val">{data.imageCount} ảnh{data.hasVideo ? " • 1 video" : ""}</span></div>
                    </div>
                    <button className="vt-submit" onClick={onReset}><RotateCcw size={14} /> Gửi báo cáo khác</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main form ─────────────────────────────────────────────────────────────────
export default function IncidentReportForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [equipmentId, setEquipmentId] = useState(null);
    const [images, setImages] = useState([]);
    const [video, setVideo] = useState(null);
    const [imageError, setImageError] = useState("");
    const [videoError, setVideoError] = useState("");
    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(null);
    const [imgDragActive, setImgDragActive] = useState(false);
    const [vidDragActive, setVidDragActive] = useState(false);

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const errors = {
        title: !title.trim() ? "Vui lòng nhập tiêu đề sự cố" : "",
        description: !description.trim() ? "Vui lòng mô tả chi tiết sự cố" : "",
    };
    const isValid = !errors.title && !errors.description;

    function addImages(fileList) {
        const list = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
        if (!list.length) { setImageError("Chỉ chấp nhận file hình ảnh"); return; }
        const room = MAX_IMAGES - images.length;
        if (room <= 0) { setImageError(`Đã đạt giới hạn ${MAX_IMAGES} hình ảnh`); return; }
        const oversize = list.find((f) => f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
        if (oversize) { setImageError(`Hình "${oversize.name}" vượt quá ${MAX_IMAGE_SIZE_MB}MB`); return; }
        const toAdd = list.slice(0, room).map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f, url: URL.createObjectURL(f) }));
        setImages((prev) => [...prev, ...toAdd]);
        setImageError(list.length > room ? `Chỉ thêm được ${room} ảnh nữa` : "");
    }

    function removeImage(id) {
        setImages((prev) => { const t = prev.find((i) => i.id === id); if (t) URL.revokeObjectURL(t.url); return prev.filter((i) => i.id !== id); });
        setImageError("");
    }

    function addVideo(fileList) {
        const file = (fileList || [])[0];
        if (!file) return;
        if (!file.type.startsWith("video/")) { setVideoError("Chỉ chấp nhận file video"); return; }
        if (video) { setVideoError("Hãy xoá video hiện tại trước khi thêm mới"); return; }
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) { setVideoError(`Video vượt quá ${MAX_VIDEO_SIZE_MB}MB`); return; }
        setVideo({ file, url: URL.createObjectURL(file) });
        setVideoError("");
    }

    function removeVideo() { if (video) URL.revokeObjectURL(video.url); setVideo(null); setVideoError(""); }

    function handleSubmit(e) {
        e.preventDefault();
        setTouched({ title: true, description: true });
        if (!isValid) return;
        const eq = MOCK_EQUIPMENT.find((e) => e.equipment_id === equipmentId);
        setSubmitted({ title: title.trim(), equipmentCode: eq?.code ?? null, equipmentName: eq?.name ?? null, imageCount: images.length, hasVideo: !!video });
    }

    function resetForm() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        if (video) URL.revokeObjectURL(video.url);
        setTitle(""); setDescription(""); setEquipmentId(null);
        setImages([]); setVideo(null);
        setImageError(""); setVideoError(""); setTouched({}); setSubmitted(null);
    }

    if (submitted) return <SuccessScreen data={submitted} onReset={resetForm} />;

    // Image grid slots
    const imageSlots = [];
    for (let i = 0; i < MAX_IMAGES; i++) {
        if (i < images.length) {
            imageSlots.push(
                <div key={images[i].id} className="vt-thumb">
                    <img src={images[i].url} alt={`Ảnh ${i + 1}`} />
                    <button type="button" className="vt-thumb-remove" onClick={() => removeImage(images[i].id)}><X size={10} strokeWidth={3} /></button>
                </div>
            );
        } else if (i === images.length) {
            imageSlots.push(
                <div key="add" className={`vt-img-slot ${imgDragActive ? "drag-active" : ""}`}
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setImgDragActive(true); }}
                    onDragLeave={() => setImgDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setImgDragActive(false); addImages(e.dataTransfer.files); }}>
                    <Upload size={15} />
                    <span>Thêm ảnh</span>
                </div>
            );
        } else {
            imageSlots.push(<div key={`empty-${i}`} className="vt-img-empty" />);
        }
    }

    return (
        <div className="vt-app">
            <style>{STYLES}</style>
            <div className="vt-page">
                {/* Page header */}
                <div className="vt-page-header">
                    <div className="vt-logo">
                        <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>+</span>
                    </div>
                    <div>
                        <div className="vt-page-title">Báo cáo sự cố</div>
                        <div className="vt-page-sub">Ghi nhận và xử lý sự cố thiết bị, cơ sở vật chất</div>
                    </div>
                    <div className="vt-pill"><span className="vt-pill-dot" /> BÁO CÁO SỰ CỐ</div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="vt-grid">

                        {/* ── Cột trái: Thông tin sự cố ── */}
                        <div className="vt-col">
                            <div className="vt-col-title">
                                <AlertTriangle size={13} /> Thông tin sự cố
                            </div>

                            <div className="vt-section">
                                <label className="vt-label">Tiêu đề sự cố <span className="vt-required">*</span></label>
                                <input
                                    className={`vt-input ${touched.title && errors.title ? "has-error" : ""}`}
                                    placeholder="VD: Máy chạy bộ #04 phát tiếng kêu lạ"
                                    value={title} maxLength={150}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                                />
                                {touched.title && errors.title && <p className="vt-error"><AlertTriangle size={12} /> {errors.title}</p>}
                            </div>

                            <div className="vt-section">
                                <label className="vt-label">Mô tả chi tiết <span className="vt-required">*</span></label>
                                <textarea
                                    className={`vt-textarea ${touched.description && errors.description ? "has-error" : ""}`}
                                    rows={5} maxLength={1000}
                                    placeholder="Sự cố xảy ra từ khi nào, ảnh hưởng thế nào đến hội viên hoặc nhân viên..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                                />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                    {touched.description && errors.description
                                        ? <p className="vt-error"><AlertTriangle size={12} /> {errors.description}</p>
                                        : <span />}
                                    <p className="vt-counter">{description.length}/1000</p>
                                </div>
                            </div>

                            <div className="vt-section">
                                <label className="vt-label">
                                    Thiết bị liên quan
                                    <span className="vt-optional">Tuỳ chọn</span>
                                </label>
                                <EquipmentPicker value={equipmentId} onChange={setEquipmentId} equipmentList={MOCK_EQUIPMENT} />
                                <p className="vt-hint">Để trống nếu sự cố không liên quan đến thiết bị cụ thể</p>
                            </div>

                            <div className="vt-submit-row">
                                <button type="submit" className="vt-submit">
                                    <CheckCircle2 size={15} /> Gửi báo cáo
                                </button>
                            </div>
                        </div>

                        {/* ── Cột phải: Minh chứng ── */}
                        <div className="vt-col">
                            <div className="vt-col-title">
                                <ImageIcon size={13} /> Hình ảnh & Video minh chứng
                            </div>

                            {/* Images */}
                            <div className="vt-section">
                                <div className="vt-media-header">
                                    <label className="vt-label" style={{ marginBottom: 0 }}>
                                        Hình ảnh minh chứng
                                    </label>
                                    <span className="vt-media-count">{images.length} / {MAX_IMAGES}</span>
                                </div>
                                <div className="vt-img-grid">{imageSlots}</div>
                                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden
                                    onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                                <p className="vt-hint">Tối đa {MAX_IMAGES} ảnh · mỗi ảnh dưới {MAX_IMAGE_SIZE_MB}MB</p>
                                {imageError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {imageError}</p>}
                            </div>

                            {/* Video */}
                            <div className="vt-section" style={{ marginTop: 20 }}>
                                <div className="vt-media-header">
                                    <label className="vt-label" style={{ marginBottom: 0 }}>
                                        Video minh chứng
                                    </label>
                                    <span className="vt-media-count">{video ? 1 : 0} / 1</span>
                                </div>
                                {!video ? (
                                    <div className={`vt-video-drop ${vidDragActive ? "drag-active" : ""}`}
                                        onClick={() => videoInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setVidDragActive(true); }}
                                        onDragLeave={() => setVidDragActive(false)}
                                        onDrop={(e) => { e.preventDefault(); setVidDragActive(false); addVideo(e.dataTransfer.files); }}>
                                        <VideoIcon size={20} style={{ color: "var(--green)", opacity: .7 }} />
                                        <p className="title">Kéo thả video vào đây hoặc <span>bấm để chọn</span></p>
                                        <p className="sub">Tối đa 1 video · dưới {MAX_VIDEO_SIZE_MB}MB</p>
                                    </div>
                                ) : (
                                    <div className="vt-video-thumb">
                                        <video src={video.url} controls />
                                        <button type="button" className="vt-thumb-remove" onClick={removeVideo}><X size={11} strokeWidth={3} /></button>
                                    </div>
                                )}
                                <input ref={videoInputRef} type="file" accept="video/*" hidden
                                    onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
                                {videoError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {videoError}</p>}
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
}