import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ChevronDown,
    Dumbbell,
    ImagePlus,
    PenLine,
    RotateCcw,
    Send,
    Upload,
    Video as VideoIcon,
    X,
} from "lucide-react";
import { useRef, useState } from "react";

/* ----------------------------------------------------------------------- */
/* Mock data — thay bằng dữ liệu thật từ API (chi nhánh, thiết bị...)      */
/* ----------------------------------------------------------------------- */

const BRANCHES = [
    { id: 1, name: "Chi nhánh Quận 1" },
    { id: 2, name: "Chi nhánh Quận 7" },
    { id: 3, name: "Chi nhánh Thủ Đức" },
];

const EQUIPMENT_BY_BRANCH = {
    1: [
        { id: 101, name: "Máy chạy bộ #04" },
        { id: 102, name: "Giàn tập Cable Crossover" },
        { id: 103, name: "Xe đạp tập #02" },
    ],
    2: [
        { id: 201, name: "Máy Smith Machine" },
        { id: 202, name: "Máy Elliptical #01" },
    ],
    3: [
        { id: 301, name: "Giàn Squat Rack #03" },
        { id: 302, name: "Máy chạy bộ #07" },
    ],
};

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

/* ----------------------------------------------------------------------- */
/* Style chung                                                             */
/* ----------------------------------------------------------------------- */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  .ir-app {
    --bg: #FFFFFF;
    --surface: #F7F8FC;
    --surface-2: #F0F1F9;
    --border: #E7E9F5;
    --ink: #181B34;
    --ink-soft: #6E7191;
    --violet: #6D5DFB;
    --violet-dark: #5747E0;
    --violet-tint: #EFF0FF;
    --teal: #14C38E;
    --teal-dark: #0EA374;
    --teal-tint: #E6FBF3;
    --amber: #FFB627;
    --amber-dark: #C98300;
    --amber-tint: #FFF6E0;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    position: relative;
  }
  .ir-app *, .ir-app *::before, .ir-app *::after { box-sizing: border-box; }
  .ir-display { font-family: 'Poppins', system-ui, sans-serif; }

  .ir-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(24,27,52,0.03), 0 6px 16px -8px rgba(24,27,52,0.05);
  }

  .ir-badge {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .ir-label { font-size: 12.5px; font-weight: 600; color: var(--ink); margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }

  .ir-input, .ir-select, .ir-textarea {
    width: 100%;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13.5px;
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    transition: border-color .15s, background .15s, box-shadow .15s;
    outline: none;
  }
  .ir-textarea { resize: vertical; min-height: 84px; line-height: 1.5; }
  .ir-input::placeholder, .ir-textarea::placeholder { color: #A4A7C4; }
  .ir-input:focus, .ir-select:focus, .ir-textarea:focus {
    border-color: var(--violet);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(109,93,251,0.12);
  }
  .ir-input.ir-error, .ir-textarea.ir-error, .ir-select.ir-error {
    border-color: var(--amber-dark);
    background: var(--amber-tint);
  }
  .ir-select { appearance: none; cursor: pointer; }
  .ir-select:disabled { cursor: not-allowed; opacity: .55; }

  .ir-error-text { font-size: 12px; color: var(--amber-dark); margin-top: 5px; display: flex; align-items: center; gap: 4px; font-weight: 600; }

  .ir-dropzone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    background: var(--surface);
    transition: border-color .15s, background .15s;
    cursor: pointer;
  }
  .ir-dropzone:hover { border-color: var(--violet); background: var(--violet-tint); }
  .ir-dropzone.is-active { border-color: var(--violet); background: var(--violet-tint); }

  .ir-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    width: 100%;
    background: var(--violet);
    color: #fff;
    font-weight: 600;
    font-size: 13.5px;
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    transition: background .15s, transform .1s;
  }
  .ir-btn-primary:hover { background: var(--violet-dark); }
  .ir-btn-primary:active { transform: translateY(1px); }

  .ir-thumb { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 1 / 1; background: var(--surface-2); border: 1px solid var(--border); }
  .ir-thumb img, .ir-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ir-thumb-remove { position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 50%; background: rgba(24,27,52,0.6); color: #fff; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
  .ir-thumb-remove:hover { background: var(--ink); }

  @media (prefers-reduced-motion: reduce) {
    .ir-btn-primary, .ir-dropzone { transition: none; }
  }
`;

/* ----------------------------------------------------------------------- */
/* Thành phần nhỏ                                                          */
/* ----------------------------------------------------------------------- */

function SectionHeading({ icon, tint, title, subtitle }) {
    return (
        <div className="flex items-start gap-2.5" style={{ marginBottom: 14 }}>
            <div className="ir-badge" style={{ background: tint }}>
                {icon}
            </div>
            <div>
                <h2 className="ir-display" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
                    {title}
                </h2>
                {subtitle && <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{subtitle}</p>}
            </div>
        </div>
    );
}

function PreviewRow({ label, value, placeholder = "Chưa có", alwaysShow }) {
    const has = alwaysShow ? true : !!value;
    return (
        <div className="flex items-start justify-between gap-3">
            <span style={{ fontSize: 12, color: "var(--ink-soft)", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: has ? "var(--ink)" : "#AEB1CC", textAlign: "right", fontStyle: has ? "normal" : "italic" }}>
                {value || placeholder}
            </span>
        </div>
    );
}

function Bg() {
    return (
        <>
            <div style={{ position: "fixed", top: -110, right: -100, width: 280, height: 280, borderRadius: "50%", background: "var(--violet)", opacity: 0.06, filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "fixed", bottom: -120, left: -110, width: 300, height: 300, borderRadius: "50%", background: "var(--teal)", opacity: 0.06, filter: "blur(65px)", pointerEvents: "none", zIndex: 0 }} />
        </>
    );
}

/* ----------------------------------------------------------------------- */
/* Màn hình sau khi gửi                                                    */
/* ----------------------------------------------------------------------- */

function SuccessScreen({ data, onReset }) {
    return (
        <div className="ir-app min-h-screen flex items-center justify-center px-4 py-10">
            <style>{STYLES}</style>
            <Bg />
            <div className="ir-card" style={{ maxWidth: 360, width: "100%", position: "relative", zIndex: 1, padding: "28px 24px" }}>
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--violet)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                    }}
                >
                    <CheckCircle2 size={24} color="#fff" />
                </div>
                <h2 className="ir-display" style={{ fontSize: 18, fontWeight: 800, textAlign: "center", color: "var(--ink)" }}>
                    Đã gửi đến quản lý!
                </h2>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
                    Quản lý chi nhánh sẽ xem và phản hồi báo cáo này sớm nhất có thể.
                </p>

                <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", marginTop: 18, marginBottom: 18 }}>
                    <div className="flex flex-col gap-2">
                        <PreviewRow label="Tiêu đề" value={data.title} alwaysShow />
                        <PreviewRow label="Chi nhánh" value={data.branchName} alwaysShow />
                        <PreviewRow label="Minh chứng" value={`${data.imageCount} ảnh${data.hasVideo ? " • 1 video" : ""}`} alwaysShow />
                    </div>
                </div>

                <button type="button" className="ir-btn-primary" onClick={onReset}>
                    <RotateCcw size={14} /> Gửi báo cáo khác
                </button>
            </div>
        </div>
    );
}

/* ----------------------------------------------------------------------- */
/* Form chính                                                               */
/* ----------------------------------------------------------------------- */

export default function IncidentReportForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [branchId, setBranchId] = useState("");
    const [equipmentId, setEquipmentId] = useState("");
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

    const branch = BRANCHES.find((b) => String(b.id) === String(branchId));
    const equipmentList = branchId ? EQUIPMENT_BY_BRANCH[branchId] || [] : [];
    const equipment = equipmentList.find((e) => String(e.id) === String(equipmentId));

    const errors = {
        title: !title.trim() ? "Vui lòng nhập tiêu đề sự cố" : "",
        description: !description.trim() ? "Vui lòng mô tả chi tiết sự cố" : "",
        branchId: !branchId ? "Vui lòng chọn chi nhánh" : "",
    };
    const isValid = !errors.title && !errors.description && !errors.branchId;

    function handleBranchChange(e) {
        setBranchId(e.target.value);
        setEquipmentId("");
    }

    function addImages(fileList) {
        const list = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
        if (list.length === 0) {
            setImageError("Chỉ chấp nhận file hình ảnh");
            return;
        }
        const room = MAX_IMAGES - images.length;
        if (room <= 0) {
            setImageError(`Chỉ được thêm tối đa ${MAX_IMAGES} hình ảnh`);
            return;
        }
        const oversize = list.find((f) => f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
        if (oversize) {
            setImageError(`Hình "${oversize.name}" vượt quá ${MAX_IMAGE_SIZE_MB}MB`);
            return;
        }
        const toAdd = list.slice(0, room).map((f) => ({
            id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
            file: f,
            url: URL.createObjectURL(f),
        }));
        setImages((prev) => [...prev, ...toAdd]);
        setImageError(list.length > room ? `Chỉ thêm được ${room} ảnh, đã đạt giới hạn ${MAX_IMAGES} hình` : "");
    }

    function removeImage(id) {
        setImages((prev) => {
            const target = prev.find((i) => i.id === id);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((i) => i.id !== id);
        });
        setImageError("");
    }

    function addVideo(fileList) {
        const file = (fileList || [])[0];
        if (!file) return;
        if (!file.type.startsWith("video/")) {
            setVideoError("Chỉ chấp nhận file video");
            return;
        }
        if (video) {
            setVideoError("Đã có 1 video — vui lòng xoá video hiện tại trước khi thêm mới");
            return;
        }
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            setVideoError(`Video vượt quá ${MAX_VIDEO_SIZE_MB}MB`);
            return;
        }
        setVideo({ file, url: URL.createObjectURL(file) });
        setVideoError("");
    }

    function removeVideo() {
        if (video) URL.revokeObjectURL(video.url);
        setVideo(null);
        setVideoError("");
    }

    function handleSubmit(e) {
        e.preventDefault();
        setTouched({ title: true, description: true, branchId: true });
        if (!isValid) return;
        setSubmitted({
            title,
            branchName: branch?.name,
            imageCount: images.length,
            hasVideo: !!video,
        });
    }

    function resetForm() {
        images.forEach((i) => URL.revokeObjectURL(i.url));
        if (video) URL.revokeObjectURL(video.url);
        setTitle("");
        setDescription("");
        setBranchId("");
        setEquipmentId("");
        setImages([]);
        setVideo(null);
        setImageError("");
        setVideoError("");
        setTouched({});
        setSubmitted(null);
    }

    if (submitted) {
        return <SuccessScreen data={submitted} onReset={resetForm} />;
    }

    return (
        <div className="ir-app min-h-screen">
            <style>{STYLES}</style>
            <Bg />

            <div className="max-w-4xl mx-auto px-4 sm:px-5 py-5 sm:py-6" style={{ position: "relative", zIndex: 1 }}>
                <div className="flex items-center gap-2 text-sm mb-2.5">
                    <span style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>Sự cố</span>
                    <span style={{ color: "#D2D4EA" }}>/</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 12.5 }}>Báo cáo sự cố</span>
                </div>

                <div className="flex items-start gap-2.5 mb-5">
                    <div className="ir-badge" style={{ width: 38, height: 38, borderRadius: 11, background: "var(--violet-tint)" }}>
                        <AlertTriangle size={18} strokeWidth={2.3} style={{ color: "var(--violet)" }} />
                    </div>
                    <div>
                        <h1 className="ir-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                            Báo cáo sự cố
                        </h1>
                        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 2 }}>
                            Gửi thông tin sự cố đến quản lý chi nhánh để được xem xét và phê duyệt.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4">
                        {/* Nội dung */}
                        <div className="ir-card p-4 sm:p-5">
                            <SectionHeading
                                icon={<PenLine size={15} style={{ color: "var(--violet)" }} />}
                                tint="var(--violet-tint)"
                                title="Chuyện gì đã xảy ra?"
                                subtitle="Mô tả ngắn gọn và rõ ràng để quản lý dễ hiểu"
                            />

                            <div className="mb-3.5">
                                <label className="ir-label">
                                    Tiêu đề sự cố <span style={{ color: "var(--violet)" }}>*</span>
                                </label>
                                <input
                                    className={`ir-input ${touched.title && errors.title ? "ir-error" : ""}`}
                                    placeholder="VD: Máy chạy bộ #04 phát tiếng kêu lạ"
                                    value={title}
                                    maxLength={150}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                                />
                                {touched.title && errors.title && (
                                    <p className="ir-error-text">
                                        <AlertTriangle size={12} /> {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="ir-label">
                                    Mô tả chi tiết <span style={{ color: "var(--violet)" }}>*</span>
                                </label>
                                <textarea
                                    className={`ir-textarea ${touched.description && errors.description ? "ir-error" : ""}`}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Sự cố xảy ra ở đâu, từ khi nào, ảnh hưởng thế nào đến hội viên hoặc nhân viên..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                                />
                                <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                                    <div>
                                        {touched.description && errors.description && (
                                            <p className="ir-error-text">
                                                <AlertTriangle size={12} /> {errors.description}
                                            </p>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>{description.length}/1000</p>
                                </div>
                            </div>
                        </div>

                        {/* Vị trí */}
                        <div className="ir-card p-4 sm:p-5">
                            <SectionHeading
                                icon={<Building2 size={15} style={{ color: "var(--teal-dark)" }} />}
                                tint="var(--teal-tint)"
                                title="Sự cố xảy ra ở đâu?"
                                subtitle="Chọn chi nhánh và thiết bị liên quan (nếu có)"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="ir-label">
                                        Chi nhánh <span style={{ color: "var(--violet)" }}>*</span>
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <select
                                            className={`ir-select ${touched.branchId && errors.branchId ? "ir-error" : ""}`}
                                            value={branchId}
                                            onChange={handleBranchChange}
                                            onBlur={() => setTouched((t) => ({ ...t, branchId: true }))}
                                        >
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {BRANCHES.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-soft)" }} />
                                    </div>
                                    {touched.branchId && errors.branchId && (
                                        <p className="ir-error-text">
                                            <AlertTriangle size={12} /> {errors.branchId}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="ir-label">
                                        <Dumbbell size={12.5} /> Thiết bị liên quan
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <select className="ir-select" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} disabled={!branchId}>
                                            <option value="">{branchId ? "-- Không liên quan thiết bị cụ thể --" : "Chọn chi nhánh trước"}</option>
                                            {equipmentList.map((eq) => (
                                                <option key={eq.id} value={eq.id}>{eq.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-soft)" }} />
                                    </div>
                                    <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 5 }}>Bỏ qua nếu không liên quan thiết bị cụ thể</p>
                                </div>
                            </div>
                        </div>

                        {/* Hình ảnh & video */}
                        <div className="ir-card p-4 sm:p-5">
                            <SectionHeading
                                icon={<ImagePlus size={15} style={{ color: "var(--amber-dark)" }} />}
                                tint="var(--amber-tint)"
                                title="Hình ảnh & video minh chứng"
                                subtitle="Giúp quản lý hình dung sự cố rõ và nhanh hơn"
                            />

                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="ir-label" style={{ marginBottom: 0 }}>Hình ảnh</label>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)" }}>{images.length}/{MAX_IMAGES}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2" style={{ maxWidth: 320 }}>
                                    {images.map((img) => (
                                        <div key={img.id} className="ir-thumb">
                                            <img src={img.url} alt="Minh chứng sự cố" />
                                            <button type="button" className="ir-thumb-remove" onClick={() => removeImage(img.id)} aria-label="Xoá ảnh">
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < MAX_IMAGES && (
                                        <div
                                            className={`ir-dropzone ${imgDragActive ? "is-active" : ""}`}
                                            style={{ aspectRatio: "1 / 1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 6, textAlign: "center" }}
                                            onClick={() => imageInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setImgDragActive(true); }}
                                            onDragLeave={() => setImgDragActive(false)}
                                            onDrop={(e) => { e.preventDefault(); setImgDragActive(false); addImages(e.dataTransfer.files); }}
                                        >
                                            <Upload size={15} style={{ color: "var(--violet)" }} />
                                            <span style={{ fontSize: 10.5, color: "var(--ink-soft)", lineHeight: 1.25 }}>Thêm ảnh</span>
                                        </div>
                                    )}
                                </div>

                                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                                <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>Tối đa {MAX_IMAGES} ảnh, mỗi ảnh dưới {MAX_IMAGE_SIZE_MB}MB</p>
                                {imageError && (
                                    <p className="ir-error-text">
                                        <AlertTriangle size={12} /> {imageError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="ir-label" style={{ marginBottom: 0 }}>Video</label>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)" }}>{video ? 1 : 0}/1</span>
                                </div>

                                {!video ? (
                                    <div
                                        className={`ir-dropzone ${vidDragActive ? "is-active" : ""}`}
                                        style={{ padding: "16px 14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, textAlign: "center" }}
                                        onClick={() => videoInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setVidDragActive(true); }}
                                        onDragLeave={() => setVidDragActive(false)}
                                        onDrop={(e) => { e.preventDefault(); setVidDragActive(false); addVideo(e.dataTransfer.files); }}
                                    >
                                        <VideoIcon size={17} style={{ color: "var(--violet)" }} />
                                        <span style={{ fontSize: 12, color: "var(--ink)" }}>
                                            Kéo thả video vào đây hoặc <span style={{ color: "var(--violet)", fontWeight: 600 }}>bấm để chọn</span>
                                        </span>
                                        <span style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Tối đa 1 video, dưới {MAX_VIDEO_SIZE_MB}MB</span>
                                    </div>
                                ) : (
                                    <div className="ir-thumb" style={{ aspectRatio: "16 / 9", maxWidth: 320 }}>
                                        <video src={video.url} controls />
                                        <button type="button" className="ir-thumb-remove" onClick={removeVideo} aria-label="Xoá video">
                                            <X size={11} />
                                        </button>
                                    </div>
                                )}

                                <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => { addVideo(e.target.files); e.target.value = ""; }} />
                                {videoError && (
                                    <p className="ir-error-text">
                                        <AlertTriangle size={12} /> {videoError}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tóm tắt & gửi */}
                        <div className="ir-card p-4 sm:p-5">
                            <div className="flex flex-col gap-2 mb-3" style={{ background: "var(--surface)", borderRadius: 10, padding: "10px 12px" }}>
                                <PreviewRow label="Tiêu đề" value={title} placeholder="Chưa nhập" />
                                <PreviewRow label="Chi nhánh" value={branch?.name} placeholder="Chưa chọn" />
                                <PreviewRow label="Thiết bị" value={equipment?.name} placeholder="Không liên quan" />
                                <PreviewRow label="Minh chứng" value={`${images.length} ảnh${video ? " • 1 video" : ""}`} alwaysShow />
                            </div>

                            <button type="submit" className="ir-btn-primary">
                                <Send size={14} /> Gửi cho quản lý duyệt
                            </button>
                            <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 8 }}>
                                Sau khi gửi, báo cáo sẽ ở trạng thái chờ quản lý duyệt
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}