import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ImageIcon,
    Loader2,
    RotateCcw,
    Search,
    Upload,
    Video as VideoIcon,
    Wrench,
    X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Chỉnh lại path cho đúng vị trí thật trong project của bạn
import cashierApi from "../../../api/cashierApi";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

// API trả thẳng mảng { equipmentId, equipmentName } hoặc { items: [...] } /
// { data: [...] } tuỳ endpoint — chuẩn hoá lại cho an toàn.
function extractList(res) {
    const body = res?.data !== undefined ? res.data : res;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.data)) return body.data;
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES: đồng bộ theme trắng/xanh lá + viền đậm với các trang còn lại
// Nền trang: #EFECE4 | Khối: #FFFFFF | Viền: #94A3B8 (đậm) | Điểm nhấn: #16A34A
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
    .vt-app {
        --accent: #16A34A;
        --accent-dark: #15803D;
        --accent-soft: rgba(22,163,74,0.14);
        --accent-border: rgba(22,163,74,0.4);
        --page-bg: #EFECE4;
        --bg: #EFECE4;
        --bg-soft: #FFFFFF;
        --bg-elevated: #F1F5F9;
        --line: #94A3B8;
        --line-md: #64748B;
        --text: #1E293B;
        --text-dim: #64748B;
        --text-dimmer: #94A3B8;
        --radius: 20px;

        background: transparent;
        color: var(--text);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .vt-app *, .vt-app *::before, .vt-app *::after { box-sizing: border-box; margin: 0; }

    /* ── Khung ngoài trang — viền đậm, cao 80% màn hình ── */
    .shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--page-bg); padding: 24px; }
    .page-frame { flex: 1; display: flex; }
    .main-card {
        flex: 1; background: var(--bg-soft); border: 1.5px solid var(--line); border-radius: var(--radius);
        box-shadow: 0 4px 16px rgba(15,23,42,.12), 0 1px 4px rgba(15,23,42,.08);
        height: 80vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .main-card-scroll { flex: 1; overflow-y: auto; padding: 32px 36px; }
    .main-card-center { display: flex; align-items: center; justify-content: center; }

    .vt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }

    .vt-col-title {
        font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
        color: var(--accent-dark); text-transform: uppercase;
        margin-bottom: 20px; padding-bottom: 12px;
        border-bottom: 1.5px solid var(--line);
        display: flex; align-items: center; gap: 8px;
    }

    .vt-section { margin-bottom: 20px; }
    .vt-section:last-child { margin-bottom: 0; }

    .vt-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 7px; }
    .vt-required { color: var(--accent-dark); margin-left: 2px; }
    .vt-optional {
        font-size: 10px; font-weight: 700;
        color: var(--text-dim); background: var(--bg-elevated);
        border: 1.5px solid var(--line); border-radius: 4px;
        padding: 1px 6px; margin-left: 6px; vertical-align: middle;
        text-transform: uppercase;
    }

    .vt-input, .vt-textarea {
        width: 100%; background: var(--bg-elevated); border: 1.5px solid var(--line);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: var(--text);
        outline: none; transition: border-color .15s, box-shadow .15s;
        font-family: 'Inter', system-ui, sans-serif; font-weight: 500;
    }
    .vt-textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
    .vt-input::placeholder, .vt-textarea::placeholder { color: var(--text-dimmer); font-weight: 400; }
    .vt-input:focus, .vt-textarea:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .vt-input.has-error, .vt-textarea.has-error { border-color: #DC2626; background: rgba(220,38,38,0.06); }
    .vt-error { font-size: 12px; color: #DC2626; margin-top: 6px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
    .vt-counter { font-size: 11px; color: var(--text-dimmer); text-align: right; margin-top: 5px; }
    .vt-hint { font-size: 11.5px; color: var(--text-dimmer); margin-top: 6px; }

    /* ── Equipment picker ── */
    .eq-wrapper { position: relative; }
    .eq-trigger {
        width: 100%; background: var(--bg-elevated); border: 1.5px solid var(--line);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: var(--text);
        outline: none; cursor: pointer; text-align: left; font-family: 'Inter', system-ui, sans-serif;
        font-weight: 500; display: flex; align-items: center; gap: 10px;
        transition: border-color .15s, box-shadow .15s;
    }
    .eq-trigger:hover, .eq-trigger.is-open { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .eq-trigger:disabled { cursor: not-allowed; opacity: .6; }
    .eq-trigger-label { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .eq-trigger-placeholder { color: var(--text-dimmer); font-weight: 400; }
    .eq-trigger-chevron { color: var(--text-dim); flex-shrink: 0; transition: transform .15s; }
    .eq-trigger.is-open .eq-trigger-chevron { transform: rotate(180deg); }

    .eq-selected-badge {
        display: inline-flex; align-items: center;
        background: var(--accent-soft); border: 1.5px solid var(--accent-border);
        color: var(--accent-dark); border-radius: 6px; padding: 2px 8px;
        font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .eq-clear {
        width: 18px; height: 18px; border-radius: 50%; border: none; cursor: pointer;
        background: var(--accent-soft); color: var(--accent-dark);
        display: flex; align-items: center; justify-content: center;
        transition: opacity .1s; flex-shrink: 0;
    }
    .eq-clear:hover { opacity: .75; }

    .eq-dropdown {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 200;
        background: var(--bg-soft); border: 1.5px solid var(--accent-border);
        border-radius: 12px; box-shadow: 0 12px 28px -6px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.05);
        overflow: hidden;
    }
    .eq-search-wrap {
        padding: 10px; border-bottom: 1.5px solid var(--line);
        display: flex; align-items: center; gap: 8px; background: var(--bg-elevated);
    }
    .eq-search { flex: 1; border: none; background: transparent; outline: none; font-size: 13px; color: var(--text); font-family: 'Inter', system-ui, sans-serif; font-weight: 500; }
    .eq-search::placeholder { color: var(--text-dimmer); font-weight: 400; }
    .eq-list { max-height: 140px; overflow-y: auto; padding: 6px; }
    .eq-list::-webkit-scrollbar { width: 4px; }
    .eq-list::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

    .eq-option { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: background .1s; }
    .eq-option:hover { background: var(--bg-elevated); }
    .eq-option.is-selected { background: var(--accent-soft); }
    .eq-option-code {
        font-size: 11px; font-weight: 700; color: var(--accent-dark);
        background: var(--accent-soft); border: 1.5px solid var(--accent-border);
        border-radius: 5px; padding: 2px 6px; flex-shrink: 0;
    }
    .eq-option-info { flex: 1; min-width: 0; }
    .eq-option-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .eq-option-loc { font-size: 11px; color: var(--text-dimmer); margin-top: 1px; }
    .eq-option-check { color: var(--accent-dark); flex-shrink: 0; }
    .eq-empty { padding: 18px; text-align: center; font-size: 13px; color: var(--text-dimmer); }
    .eq-none-option {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 8px; cursor: pointer;
        transition: background .1s; color: var(--text-dim); font-size: 13px;
        border-top: 1.5px solid var(--line); margin-top: 4px;
    }
    .eq-none-option:hover { background: var(--bg-elevated); }

    /* ── Media ── */
    .vt-media-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .vt-media-count { font-size: 11px; color: var(--text-dim); font-weight: 700; background: var(--bg-elevated); border: 1.5px solid var(--line); border-radius: 999px; padding: 2px 10px; }
    .vt-img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .vt-thumb { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1/1; background: var(--bg-elevated); border: 1.5px solid var(--line); }
    .vt-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .vt-thumb-remove {
        position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 50%;
        background: rgba(15,23,42,0.65); color: #fff;
        display: flex; align-items: center; justify-content: center;
        border: none; cursor: pointer;
    }
    .vt-img-slot {
        aspect-ratio: 1/1; border: 1.5px dashed var(--line); border-radius: 8px;
        background: var(--bg-elevated); display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 5px; cursor: pointer; transition: border-color .15s, background .15s;
        color: var(--text-dim);
    }
    .vt-img-slot:hover, .vt-img-slot.drag-active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-dark); }
    .vt-img-slot span { font-size: 11px; font-weight: 600; }
    .vt-img-empty { aspect-ratio: 1/1; border: 1.5px dashed var(--line); border-radius: 8px; background: var(--bg-elevated); opacity: .35; }

    .vt-video-drop {
        border: 1.5px dashed var(--line); border-radius: 10px; background: var(--bg-elevated);
        padding: 22px; display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 6px; cursor: pointer; text-align: center;
        transition: border-color .15s, background .15s;
    }
    .vt-video-drop:hover, .vt-video-drop.drag-active { border-color: var(--accent); background: var(--accent-soft); }
    .vt-video-drop .title { font-size: 13px; font-weight: 600; color: var(--text); }
    .vt-video-drop .title span { color: var(--accent-dark); }
    .vt-video-drop .sub { font-size: 11.5px; color: var(--text-dimmer); }
    .vt-video-thumb { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 16/9; border: 1.5px solid var(--line); background: #000; }
    .vt-video-thumb video { width: 100%; height: 100%; object-fit: contain; display: block; }
    .vt-video-thumb .vt-thumb-remove { top: 8px; right: 8px; width: 24px; height: 24px; }

    /* ── Submit ── */
    .vt-submit-row { margin-top: 20px; }
    .vt-submit {
        width: 100%; background: linear-gradient(135deg, var(--accent), var(--accent-dark));
        color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 13px 0;
        border-radius: 10px; border: 1.5px solid var(--accent-dark); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        transition: filter .15s, transform .1s;
        box-shadow: 0 2px 8px rgba(22,163,74,0.3);
    }
    .vt-submit:hover { filter: brightness(1.06); }
    .vt-submit:active { transform: translateY(1px); }
    .vt-submit:disabled { opacity: .65; cursor: not-allowed; }

    .vt-spin { animation: vt-spin 0.8s linear infinite; }
    @keyframes vt-spin { to { transform: rotate(360deg); } }

    /* ── Success ── */
    .vt-success-card {
        background: var(--bg-soft); border: 1.5px solid var(--line); border-radius: var(--radius);
        padding: 40px; max-width: 440px; width: 100%; text-align: center;
        box-shadow: 0 4px 16px rgba(15,23,42,.12), 0 1px 4px rgba(15,23,42,.08);
    }
    .vt-success-icon {
        width: 52px; height: 52px; border-radius: 50%;
        background: linear-gradient(135deg, var(--accent), var(--accent-dark));
        border: 1.5px solid var(--accent-dark);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
    }
    .vt-summary { background: var(--bg-elevated); border: 1.5px solid var(--line); border-radius: 10px; padding: 14px 16px; margin: 16px 0 20px; text-align: left; }
    .vt-summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    .vt-summary-row + .vt-summary-row { margin-top: 9px; }
    .vt-summary-row .key { color: var(--text-dimmer); }
    .vt-summary-row .val { font-weight: 700; text-align: right; color: var(--text); }

    @media (max-width: 900px) {
        .vt-grid { grid-template-columns: 1fr; }
        .main-card { height: 85vh; }
        .main-card-scroll { padding: 20px 16px 26px; }
        .shell { padding: 12px; }
    }
`;

// ─── Equipment Picker ──────────────────────────────────────────────────────────
function EquipmentPicker({ value, onChange, equipmentList, disabled, loading }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapRef = useRef(null);
    const searchRef = useRef(null);

    const selected = equipmentList.find((e) => e.equipmentId === value) ?? null;
    const filtered = equipmentList.filter((e) => {
        const q = search.toLowerCase();
        return (e.equipmentName ?? "").toLowerCase().includes(q);
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
            <button type="button" className={`eq-trigger ${open ? "is-open" : ""}`} disabled={disabled} onClick={() => setOpen((o) => !o)}>
                <Wrench size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                {loading ? (
                    <span className="eq-trigger-label eq-trigger-placeholder">Đang tải danh sách thiết bị...</span>
                ) : selected ? (
                    <>
                        <span className="eq-trigger-label">{selected.equipmentName}</span>
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
                        <Search size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                        <input ref={searchRef} className="eq-search" placeholder="Nhập tên thiết bị..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button type="button" className="eq-clear" onClick={() => setSearch("")}><X size={10} strokeWidth={3} /></button>}
                    </div>
                    <div className="eq-list">
                        {filtered.length === 0 ? (
                            <p className="eq-empty">Không tìm thấy thiết bị</p>
                        ) : (
                            filtered.map((eq) => (
                                <div key={eq.equipmentId} className={`eq-option ${value === eq.equipmentId ? "is-selected" : ""}`} onClick={() => select(eq.equipmentId)}>
                                    <div className="eq-option-info">
                                        <div className="eq-option-name">{eq.equipmentName}</div>
                                    </div>
                                    {value === eq.equipmentId && <CheckCircle2 size={14} className="eq-option-check" />}
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
            <div className="shell">
                <div className="page-frame">
                    <div className="main-card main-card-center">
                        <div className="vt-success-card">
                            <div className="vt-success-icon"><CheckCircle2 size={24} color="#FFFFFF" strokeWidth={2.5} /></div>
                            <h2 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--text)" }}>
                                Báo cáo đã được gửi!
                            </h2>
                            <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.6 }}>
                                Sự cố đã được ghi nhận và sẽ được xử lý sớm.
                            </p>
                            <div className="vt-summary">
                                <div className="vt-summary-row"><span className="key">Tiêu đề</span><span className="val">{data.title}</span></div>
                                {data.equipmentName && <div className="vt-summary-row"><span className="key">Thiết bị</span><span className="val">{data.equipmentName}</span></div>}
                                <div className="vt-summary-row"><span className="key">Minh chứng</span><span className="val">{data.imageCount} ảnh{data.hasVideo ? " • 1 video" : ""}</span></div>
                            </div>
                            <button className="vt-submit" onClick={onReset}><RotateCcw size={14} /> Gửi báo cáo khác</button>
                        </div>
                    </div>
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

    const [equipmentList, setEquipmentList] = useState([]);
    const [equipmentLoading, setEquipmentLoading] = useState(true);
    const [equipmentError, setEquipmentError] = useState("");

    const [images, setImages] = useState([]);
    const [video, setVideo] = useState(null);
    const [imageError, setImageError] = useState("");
    const [videoError, setVideoError] = useState("");
    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(null);
    const [imgDragActive, setImgDragActive] = useState(false);
    const [vidDragActive, setVidDragActive] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    // Lấy branchId từ profile nhân viên đang đăng nhập.
    // GET /api/employee/profile -> { ..., branchId: number, branches: string[] }
    // Lưu ý: "branchId" là field trả thẳng (số) — dùng field này.
    // "branches" chỉ là mảng TÊN chi nhánh để hiển thị (vd "GymFit Quận 1"),
    // KHÔNG phải id, nên không được dùng branches[0] làm branchId.
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const profileRes = await cashierApi.getEmployeeProfile();
                const profile = profileRes?.data ?? profileRes;

                const branchId =
                    profile?.defaultBranchId ??
                    profile?.branches?.[0]?.branchId ??
                    null;

                if (!branchId) {
                    if (mounted) {
                        setEquipmentError("Không xác định được chi nhánh của nhân viên.");
                        setEquipmentList([]);
                        setEquipmentLoading(false);
                    }
                    return;
                }

                const res = await cashierApi.getAllEquipment({ branchId });

                if (mounted) {
                    setEquipmentList(extractList(res));
                }
            } catch (err) {
                console.error(err);

                if (mounted) {
                    setEquipmentError("Không tải được danh sách thiết bị.");
                }
            } finally {
                if (mounted) {
                    setEquipmentLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

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

    async function handleSubmit(e) {
        e.preventDefault();
        setTouched({ title: true, description: true });
        setSubmitError("");
        if (!isValid) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("Title", title.trim());
            formData.append("Description", description.trim());
            // KHÔNG append BranchId — BE tự lấy theo chi nhánh của nhân viên đang đăng nhập.
            if (equipmentId) formData.append("EquipmentId", equipmentId);
            images.forEach((img) => formData.append("Images", img.file));
            if (video) formData.append("Video", video.file);

            await cashierApi.createIncident(formData);

            const eq = equipmentList.find((e) => e.equipmentId === equipmentId);
            setSubmitted({
                title: title.trim(),
                equipmentName: eq?.equipmentName ?? null,
                imageCount: images.length,
                hasVideo: !!video,
            });
        } catch (err) {
            const msg = err?.data?.message || err?.message || "Gửi báo cáo thất bại, vui lòng thử lại.";
            setSubmitError(typeof msg === "string" ? msg : "Gửi báo cáo thất bại, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    function resetForm() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        if (video) URL.revokeObjectURL(video.url);
        setTitle(""); setDescription(""); setEquipmentId(null);
        setImages([]); setVideo(null);
        setImageError(""); setVideoError(""); setTouched({}); setSubmitted(null);
        setSubmitError("");
    }

    if (submitted) return <SuccessScreen data={submitted} onReset={resetForm} />;

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
            <div className="shell">
                <div className="page-frame">
                    <div className="main-card">
                        <div className="main-card-scroll">
                            <form onSubmit={handleSubmit}>
                                <div className="vt-grid">

                                    <div>
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
                                            <EquipmentPicker
                                                value={equipmentId}
                                                onChange={setEquipmentId}
                                                equipmentList={equipmentList}
                                                disabled={equipmentLoading}
                                                loading={equipmentLoading}
                                            />
                                            <p className="vt-hint">Để trống nếu sự cố không liên quan đến thiết bị cụ thể</p>
                                            {equipmentError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {equipmentError}</p>}
                                        </div>

                                        {submitError && (
                                            <p className="vt-error" style={{ marginBottom: 12 }}>
                                                <AlertTriangle size={12} /> {submitError}
                                            </p>
                                        )}

                                        <div className="vt-submit-row">
                                            <button type="submit" className="vt-submit" disabled={submitting}>
                                                {submitting
                                                    ? <><Loader2 size={15} className="vt-spin" /> Đang gửi...</>
                                                    : <><CheckCircle2 size={15} /> Gửi báo cáo</>}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="vt-col-title">
                                            <ImageIcon size={13} /> Hình ảnh & Video minh chứng
                                        </div>

                                        <div className="vt-section">
                                            <div className="vt-media-header">
                                                <label className="vt-label" style={{ marginBottom: 0 }}>Hình ảnh minh chứng</label>
                                                <span className="vt-media-count">{images.length} / {MAX_IMAGES}</span>
                                            </div>
                                            <div className="vt-img-grid">{imageSlots}</div>
                                            <input ref={imageInputRef} type="file" accept="image/*" multiple hidden
                                                onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                                            <p className="vt-hint">Tối đa {MAX_IMAGES} ảnh · mỗi ảnh dưới {MAX_IMAGE_SIZE_MB}MB</p>
                                            {imageError && <p className="vt-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {imageError}</p>}
                                        </div>

                                        <div className="vt-section" style={{ marginTop: 20 }}>
                                            <div className="vt-media-header">
                                                <label className="vt-label" style={{ marginBottom: 0 }}>Video minh chứng</label>
                                                <span className="vt-media-count">{video ? 1 : 0} / 1</span>
                                            </div>
                                            {!video ? (
                                                <div className={`vt-video-drop ${vidDragActive ? "drag-active" : ""}`}
                                                    onClick={() => videoInputRef.current?.click()}
                                                    onDragOver={(e) => { e.preventDefault(); setVidDragActive(true); }}
                                                    onDragLeave={() => setVidDragActive(false)}
                                                    onDrop={(e) => { e.preventDefault(); setVidDragActive(false); addVideo(e.dataTransfer.files); }}>
                                                    <VideoIcon size={20} style={{ color: "var(--accent-dark)", opacity: .85 }} />
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
                </div>
            </div>
        </div>
    );
}