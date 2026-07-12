import {
    AlertTriangle,
    CheckCircle2,
    ImageIcon,
    Loader2,
    Upload,
    Video as VideoIcon,
    X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// Adjust these two paths if this file doesn't sit next to the "component" folder
import memberApi from "../../api/memberApi"; // chỉnh lại path cho đúng vị trí thật
import Footer from "../../component/Footer";
import Header from "../../component/Header";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

// authApi trả thẳng body (không có wrapper axios .data), nhưng để an toàn
// vẫn kiểm tra cả trường hợp có .data. Đồng thời chuẩn hoá 3 shape phổ biến:
// mảng thẳng, { items: [...] }, hoặc { data: [...] }.
function extractList(res) {
    const body = res?.data !== undefined ? res.data : res;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.data)) return body.data;
    return [];
}

// Scoped styles — reuses the design tokens (--bg, --accent, --line, etc.)
// that Header.jsx already injects into :root, so this page stays visually
// consistent with the rest of the site without redefining the palette.
const STYLES = `
    .vt-issue {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font-body);
        min-height: 100vh;
    }
    .vt-issue *, .vt-issue *::before, .vt-issue *::after { box-sizing: border-box; margin: 0; }

    .vt-issue-hero {
        padding: 40px 32px 8px;
        max-width: 1280px; margin: 0 auto;
    }
    .vt-issue-eyebrow {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--accent-soft); border: 1px solid rgba(255,79,43,0.28);
        color: var(--accent); font-size: 11px; font-weight: 700;
        letter-spacing: 0.06em; padding: 5px 12px; border-radius: 999px;
        text-transform: uppercase;
    }
    .vt-issue-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
    .vt-issue-title {
        font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em;
        font-size: 34px; color: var(--text); margin-top: 14px; text-transform: uppercase;
    }
    .vt-issue-sub { font-size: 14px; color: var(--text-dim); margin-top: 6px; max-width: 560px; line-height: 1.6; }

    .vt-issue-page {
        padding: 20px 32px 64px;
        max-width: 1280px; margin: 0 auto; width: 100%;
    }

    .vt-issue-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: stretch;
    }

    .vt-issue-col {
        background: var(--bg-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: 28px 30px;
    }

    .vt-issue-col-title {
        font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
        color: var(--accent); text-transform: uppercase;
        margin-bottom: 20px; padding-bottom: 12px;
        border-bottom: 1px solid var(--line);
        display: flex; align-items: center; gap: 8px;
    }

    .vt-issue-section { margin-bottom: 20px; }
    .vt-issue-section:last-child { margin-bottom: 0; }

    .vt-issue-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    .vt-issue-label {
        display: block; font-size: 12.5px; font-weight: 600;
        color: var(--text); margin-bottom: 7px;
    }
    .vt-issue-required { color: var(--accent); margin-left: 2px; }
    .vt-issue-optional {
        font-size: 10px; font-weight: 700;
        color: var(--text-dim); background: var(--bg-elevated);
        border: 1px solid var(--line); border-radius: 4px;
        padding: 1px 6px; margin-left: 6px; vertical-align: middle;
        text-transform: uppercase;
    }

    .vt-issue-input, .vt-issue-textarea, .vt-issue-select {
        width: 100%; background: var(--bg-elevated); border: 1.5px solid var(--line);
        border-radius: 10px; padding: 11px 14px; font-size: 14px; color: var(--text);
        outline: none; transition: border-color .15s, box-shadow .15s;
        font-family: var(--font-body); font-weight: 500;
    }
    .vt-issue-select { cursor: pointer; }
    .vt-issue-select:disabled { cursor: not-allowed; opacity: .6; }
    .vt-issue-textarea { resize: vertical; min-height: 130px; line-height: 1.6; }
    .vt-issue-input::placeholder, .vt-issue-textarea::placeholder { color: var(--text-dim); font-weight: 400; }
    .vt-issue-input:focus, .vt-issue-textarea:focus, .vt-issue-select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .vt-issue-input.has-error, .vt-issue-textarea.has-error, .vt-issue-select.has-error {
        border-color: var(--accent); background: var(--accent-soft);
    }
    .vt-issue-error {
        font-size: 12px; color: var(--accent); margin-top: 6px;
        font-weight: 600; display: flex; align-items: center; gap: 5px;
    }
    .vt-issue-counter { font-size: 11px; color: var(--text-dim); text-align: right; margin-top: 5px; }
    .vt-issue-hint { font-size: 11.5px; color: var(--text-dim); margin-top: 6px; }

    /* ── Media ── */
    .vt-issue-media-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .vt-issue-media-count {
        font-size: 11px; color: var(--text-dim); font-weight: 700;
        background: var(--bg-elevated); border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px;
    }
    .vt-issue-img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .vt-issue-thumb {
        position: relative; border-radius: 8px; overflow: hidden;
        aspect-ratio: 1/1; background: var(--bg-elevated); border: 1.5px solid var(--line);
    }
    .vt-issue-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .vt-issue-thumb-remove {
        position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 50%;
        background: rgba(0,0,0,0.65); color: #fff;
        display: flex; align-items: center; justify-content: center;
        border: none; cursor: pointer;
    }
    .vt-issue-img-slot {
        aspect-ratio: 1/1; border: 1.5px dashed var(--line); border-radius: 8px;
        background: var(--bg-elevated); display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 5px; cursor: pointer; transition: border-color .15s, background .15s;
        color: var(--text-dim);
    }
    .vt-issue-img-slot:hover, .vt-issue-img-slot.drag-active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
    .vt-issue-img-slot span { font-size: 11px; font-weight: 600; }
    .vt-issue-img-empty { aspect-ratio: 1/1; border: 1.5px dashed var(--line); border-radius: 8px; background: var(--bg-elevated); opacity: .3; }

    .vt-issue-video-drop {
        border: 1.5px dashed var(--line); border-radius: 10px; background: var(--bg-elevated);
        padding: 22px; display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 6px; cursor: pointer; text-align: center;
        transition: border-color .15s, background .15s;
    }
    .vt-issue-video-drop:hover, .vt-issue-video-drop.drag-active { border-color: var(--accent); background: var(--accent-soft); }
    .vt-issue-video-drop .title { font-size: 13px; font-weight: 600; color: var(--text); }
    .vt-issue-video-drop .title span { color: var(--accent); }
    .vt-issue-video-drop .sub { font-size: 11.5px; color: var(--text-dim); }
    .vt-issue-video-thumb {
        position: relative; border-radius: 10px; overflow: hidden;
        aspect-ratio: 16/9; border: 1.5px solid var(--line); background: #000;
    }
    .vt-issue-video-thumb video { width: 100%; height: 100%; object-fit: contain; display: block; }
    .vt-issue-video-thumb .vt-issue-thumb-remove { top: 8px; right: 8px; width: 24px; height: 24px; }

    /* ── Submit ── */
    .vt-issue-submit-row { margin-top: 20px; display: flex; justify-content: center; }
    .vt-issue-submit {
        width: 100%; max-width: 320px; background: var(--accent);
        color: #fff; font-weight: 700; font-size: 15px; padding: 14px 0;
        border-radius: 10px; border: none; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        transition: filter .15s, transform .1s;
    }
    .vt-issue-submit:hover { filter: brightness(1.1); }
    .vt-issue-submit:active { transform: translateY(1px); }
    .vt-issue-submit:disabled { opacity: .65; cursor: not-allowed; }

    .vt-issue-spin { animation: vt-spin 0.8s linear infinite; }
    @keyframes vt-spin { to { transform: rotate(360deg); } }

    /* ── Success ── */
    .vt-issue-success-wrap {
        min-height: 70vh; display: flex; align-items: center; justify-content: center;
        padding: 40px 20px;
    }
    .vt-issue-success-card {
        background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius);
        padding: 40px; max-width: 440px; width: 100%; text-align: center;
    }
    .vt-issue-success-icon {
        width: 52px; height: 52px; border-radius: 50%;
        background: var(--accent);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
    }
    .vt-issue-summary {
        background: var(--bg-elevated); border: 1px solid var(--line);
        border-radius: 10px; padding: 14px 16px; margin: 16px 0 20px; text-align: left;
    }
    .vt-issue-summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    .vt-issue-summary-row + .vt-issue-summary-row { margin-top: 9px; }
    .vt-issue-summary-row .key { color: var(--text-dim); }
    .vt-issue-summary-row .val { font-weight: 700; text-align: right; color: var(--text); }

    @media (max-width: 900px) {
        .vt-issue-grid { grid-template-columns: 1fr; }
        .vt-issue-row { grid-template-columns: 1fr; }
        .vt-issue-page { padding: 16px 16px 48px; }
        .vt-issue-hero { padding: 28px 16px 4px; }
        .vt-issue-title { font-size: 27px; }
    }
    @media (max-width: 420px) {
        .vt-issue-img-grid { gap: 6px; }
        .vt-issue-col { padding: 20px 18px; }
    }
`;

// ─── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ data, onBackHome }) {
    return (
        <div className="vt-issue">
            <style>{STYLES}</style>
            <Header />
            <div className="vt-issue-success-wrap">
                <div className="vt-issue-success-card">
                    <div className="vt-issue-success-icon"><CheckCircle2 size={24} color="#fff" strokeWidth={2.5} /></div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "var(--text)" }}>
                        Cảm ơn bạn đã phản hồi!
                    </h2>
                    <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 8, lineHeight: 1.6 }}>
                        Chúng tôi đã tiếp nhận vấn đề bạn gặp phải và sẽ xử lý trong thời gian sớm nhất.
                    </p>
                    <div className="vt-issue-summary">
                        <div className="vt-issue-summary-row"><span className="key">Tiêu đề</span><span className="val">{data.title}</span></div>
                        <div className="vt-issue-summary-row">
                            <span className="key">Minh chứng</span>
                            <span className="val">{data.imageCount > 0 || data.hasVideo ? `${data.imageCount} ảnh${data.hasVideo ? " • 1 video" : ""}` : "Không có"}</span>
                        </div>
                    </div>
                    <button className="vt-issue-submit" onClick={onBackHome}>Quay về trang chủ</button>
                </div>
            </div>
            <Footer />
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function IssueReport() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [branchId, setBranchId] = useState("");
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(true);

    const [equipmentId, setEquipmentId] = useState("");
    const [equipments, setEquipments] = useState([]);
    const [equipmentsLoading, setEquipmentsLoading] = useState(false);

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

    // Lấy danh sách chi nhánh khi vào trang
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await memberApi.getBranches({ status: "Active" });
                if (mounted) setBranches(extractList(res));
            } catch (err) {
                if (mounted) setBranches([]);
            } finally {
                if (mounted) setBranchesLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Lấy danh sách thiết bị theo chi nhánh đã chọn (optional field)
    // Lấy danh sách thiết bị theo chi nhánh đã chọn (optional field)
    useEffect(() => {
        if (!branchId) {
            setEquipments([]);
            setEquipmentId("");
            return;
        }
        let mounted = true;
        setEquipmentsLoading(true);
        setEquipmentId("");
        (async () => {
            try {
                const res = await memberApi.getAll({ branchId, pageSize: 100 });
                if (mounted) setEquipments(extractList(res));
            } catch (err) {
                if (mounted) setEquipments([]);
            } finally {
                if (mounted) setEquipmentsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [branchId]);

    const errors = {
        title: !title.trim() ? "Vui lòng nhập tiêu đề vấn đề" : "",
        description: !description.trim() ? "Vui lòng mô tả chi tiết vấn đề" : "",
        branchId: !branchId ? "Vui lòng chọn chi nhánh" : "",
    };
    const isValid = !errors.title && !errors.description && !errors.branchId;

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
        setTouched({ title: true, description: true, branchId: true });
        setSubmitError("");
        if (!isValid) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("Title", title.trim());
            formData.append("Description", description.trim());
            formData.append("BranchId", branchId);
            if (equipmentId) formData.append("EquipmentId", equipmentId);
            images.forEach((img) => formData.append("Images", img.file));
            if (video) formData.append("Video", video.file);

            await memberApi.createIncident(formData);

            setSubmitted({ title: title.trim(), imageCount: images.length, hasVideo: !!video });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data || "Gửi báo cáo thất bại, vui lòng thử lại.";
            setSubmitError(typeof msg === "string" ? msg : "Gửi báo cáo thất bại, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleBackHome() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        if (video) URL.revokeObjectURL(video.url);
        navigate("/");
    }

    if (submitted) return <SuccessScreen data={submitted} onBackHome={handleBackHome} />;

    // Image grid slots
    const imageSlots = [];
    for (let i = 0; i < MAX_IMAGES; i++) {
        if (i < images.length) {
            imageSlots.push(
                <div key={images[i].id} className="vt-issue-thumb">
                    <img src={images[i].url} alt={`Ảnh ${i + 1}`} />
                    <button type="button" className="vt-issue-thumb-remove" onClick={() => removeImage(images[i].id)}><X size={10} strokeWidth={3} /></button>
                </div>
            );
        } else if (i === images.length) {
            imageSlots.push(
                <div key="add" className={`vt-issue-img-slot ${imgDragActive ? "drag-active" : ""}`}
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setImgDragActive(true); }}
                    onDragLeave={() => setImgDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setImgDragActive(false); addImages(e.dataTransfer.files); }}>
                    <Upload size={15} />
                    <span>Thêm ảnh</span>
                </div>
            );
        } else {
            imageSlots.push(<div key={`empty-${i}`} className="vt-issue-img-empty" />);
        }
    }

    return (
        <div className="vt-issue">
            <style>{STYLES}</style>

            <Header />

            <div className="vt-issue-hero">
                <div className="vt-issue-eyebrow"><span className="vt-issue-dot" /> Báo cáo vấn đề</div>
                <h1 className="vt-issue-title">Báo cáo vấn đề</h1>
                <p className="vt-issue-sub">Gặp vấn đề khi tập luyện? Cho chúng tôi biết để hỗ trợ bạn nhanh nhất.</p>
            </div>

            <div className="vt-issue-page">
                <form onSubmit={handleSubmit}>
                    <div className="vt-issue-grid">

                        {/* ── Cột trái: Thông tin vấn đề ── */}
                        <div className="vt-issue-col">
                            <div className="vt-issue-col-title">
                                <AlertTriangle size={13} /> Thông tin vấn đề
                            </div>

                            <div className="vt-issue-section">
                                <div className="vt-issue-row">
                                    <div>
                                        <label className="vt-issue-label">Chi nhánh <span className="vt-issue-required">*</span></label>
                                        <select
                                            className={`vt-issue-select ${touched.branchId && errors.branchId ? "has-error" : ""}`}
                                            value={branchId}
                                            disabled={branchesLoading}
                                            onChange={(e) => setBranchId(e.target.value)}
                                            onBlur={() => setTouched((t) => ({ ...t, branchId: true }))}
                                        >
                                            <option value="">
                                                {branchesLoading ? "Đang tải..." : "-- Chọn chi nhánh --"}
                                            </option>
                                            {branches.map((b) => (
                                                <option key={b.branchId} value={b.branchId}>
                                                    {b.branchName}
                                                </option>
                                            ))}
                                        </select>
                                        {touched.branchId && errors.branchId && <p className="vt-issue-error"><AlertTriangle size={12} /> {errors.branchId}</p>}
                                    </div>

                                    <div>
                                        <label className="vt-issue-label">
                                            Thiết bị liên quan
                                            <span className="vt-issue-optional">Không bắt buộc</span>
                                        </label>
                                        <select
                                            className="vt-issue-select"
                                            value={equipmentId}
                                            disabled={!branchId || equipmentsLoading}
                                            onChange={(e) => setEquipmentId(e.target.value)}
                                        >
                                            <option value="">
                                                {!branchId
                                                    ? "-- Chọn chi nhánh trước --"
                                                    : equipmentsLoading
                                                        ? "Đang tải..."
                                                        : "-- Không chọn --"}
                                            </option>
                                            {equipments.map((eq) => (
                                                <option key={eq.equipmentId ?? eq.id} value={eq.equipmentId ?? eq.id}>
                                                    {eq.equipmentName ?? eq.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="vt-issue-section">
                                <label className="vt-issue-label">Tiêu đề vấn đề <span className="vt-issue-required">*</span></label>
                                <input
                                    className={`vt-issue-input ${touched.title && errors.title ? "has-error" : ""}`}
                                    placeholder="VD: Máy chạy bộ #04 phát tiếng kêu lạ"
                                    value={title} maxLength={150}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                                />
                                {touched.title && errors.title && <p className="vt-issue-error"><AlertTriangle size={12} /> {errors.title}</p>}
                            </div>

                            <div className="vt-issue-section">
                                <label className="vt-issue-label">Mô tả chi tiết <span className="vt-issue-required">*</span></label>
                                <textarea
                                    className={`vt-issue-textarea ${touched.description && errors.description ? "has-error" : ""}`}
                                    rows={6} maxLength={1000}
                                    placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải, điều đó sẽ giúp chúng tôi giải quyết vấn đề nhanh hơn."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                                />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                    {touched.description && errors.description
                                        ? <p className="vt-issue-error"><AlertTriangle size={12} /> {errors.description}</p>
                                        : <span />}
                                    <p className="vt-issue-counter">{description.length}/1000</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Cột phải: Minh chứng ── */}
                        <div className="vt-issue-col">
                            <div className="vt-issue-col-title">
                                <ImageIcon size={13} /> Hình ảnh & Video minh chứng
                                <span className="vt-issue-optional" style={{ marginLeft: "auto" }}>Không bắt buộc</span>
                            </div>

                            {/* Images */}
                            <div className="vt-issue-section">
                                <div className="vt-issue-media-header">
                                    <label className="vt-issue-label" style={{ marginBottom: 0 }}>
                                        Hình ảnh minh chứng
                                    </label>
                                    <span className="vt-issue-media-count">{images.length} / {MAX_IMAGES}</span>
                                </div>
                                <div className="vt-issue-img-grid">{imageSlots}</div>
                                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden
                                    onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                                <p className="vt-issue-hint">Tối đa {MAX_IMAGES} ảnh · mỗi ảnh dưới {MAX_IMAGE_SIZE_MB}MB</p>
                                {imageError && <p className="vt-issue-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {imageError}</p>}
                            </div>

                            {/* Video */}
                            <div className="vt-issue-section" style={{ marginTop: 20 }}>
                                <div className="vt-issue-media-header">
                                    <label className="vt-issue-label" style={{ marginBottom: 0 }}>
                                        Video minh chứng
                                    </label>
                                    <span className="vt-issue-media-count">{video ? 1 : 0} / 1</span>
                                </div>
                                {!video ? (
                                    <div className={`vt-issue-video-drop ${vidDragActive ? "drag-active" : ""}`}
                                        onClick={() => videoInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setVidDragActive(true); }}
                                        onDragLeave={() => setVidDragActive(false)}
                                        onDrop={(e) => { e.preventDefault(); setVidDragActive(false); addVideo(e.dataTransfer.files); }}>
                                        <VideoIcon size={20} style={{ color: "var(--accent)", opacity: .85 }} />
                                        <p className="title">Kéo thả video vào đây hoặc <span>bấm để chọn</span></p>
                                        <p className="sub">Tối đa 1 video · dưới {MAX_VIDEO_SIZE_MB}MB</p>
                                    </div>
                                ) : (
                                    <div className="vt-issue-video-thumb">
                                        <video src={video.url} controls />
                                        <button type="button" className="vt-issue-thumb-remove" onClick={removeVideo}><X size={11} strokeWidth={3} /></button>
                                    </div>
                                )}
                                <input ref={videoInputRef} type="file" accept="video/*" hidden
                                    onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
                                {videoError && <p className="vt-issue-error" style={{ marginTop: 8 }}><AlertTriangle size={12} /> {videoError}</p>}
                            </div>
                        </div>

                    </div>

                    {submitError && (
                        <p className="vt-issue-error" style={{ marginTop: 16, justifyContent: "center", display: "flex" }}>
                            <AlertTriangle size={12} /> {submitError}
                        </p>
                    )}

                    <div className="vt-issue-submit-row">
                        <button type="submit" className="vt-issue-submit" disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={15} className="vt-issue-spin" /> Đang gửi...</>
                                : <><CheckCircle2 size={15} /> Gửi báo cáo</>}
                        </button>
                    </div>
                </form>
            </div>

            <Footer />
        </div>
    );
}