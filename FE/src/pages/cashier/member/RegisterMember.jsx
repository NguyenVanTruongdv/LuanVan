import { useEffect, useRef, useState } from "react";
import cashierApi from "../../../api/cashierApi";
import memberApi from "../../../api/memberApi";

// ============================================================
// THEME — tông màu đồng bộ với logo VT Gym (xanh rêu/teal đậm)
// ============================================================
const T = {
    // Nền tối riêng cho khung camera (giữ tối để hình ảnh nổi bật, giống viewfinder)
    camBg1: "#0B1F17",
    camBg2: "#13291F",

    // Nền/khối UI chung — sáng, đồng bộ với sidebar VT Gym
    bgDeep: "#F5F7F4",
    panelDark: "#F3F4F6",
    panelDarkSoft: "#F8FAF9",
    panelDarkSofter: "#E5E7EB",

    // Tông xanh rêu/teal đậm giống logo VT Gym, bớt tươi, bớt chói
    cyan: "#166534",
    cyanLight: "#2F8F52",
    cyanDark: "#0F4C2C",
    cyanSoft: "rgba(22, 101, 52, 0.07)",
    cyanSoftStrong: "rgba(22, 101, 52, 0.13)",
    cyanBorder: "rgba(22, 101, 52, 0.22)",
    cyanGlow: "rgba(22, 101, 52, 0.16)",
    onAccent: "#FFFFFF",

    blue: "#6366F1",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    border: "#E5E7EB",
    borderSoft: "rgba(229, 231, 235, 0.9)",
    bgPage: "#F9FAFB",
    bgCard: "#FFFFFF",
    bgSubtle: "rgba(22, 101, 52, 0.04)",
    amber: "#F59E0B",
    amberBg: "rgba(245, 158, 11, 0.12)",
    amberBorder: "rgba(245, 158, 11, 0.35)",
    amberText: "#B45309",
    discount: "#0D9488",
    discountBg: "rgba(13, 148, 136, 0.10)",
    discountBorder: "rgba(13, 148, 136, 0.35)",
    discountText: "#0F766E",
    danger: "#EF4444",
    dangerBg: "rgba(239, 68, 68, 0.10)",
    dangerBorder: "rgba(239, 68, 68, 0.35)",
    success: "#059669",
    successBg: "rgba(5, 150, 105, 0.10)",
};

// ============================================================
// HELPERS
// ============================================================
function dataUrlToFile(dataUrl, filename) {
    if (!dataUrl) return null;
    const [meta, base64] = dataUrl.split(",");
    const mimeMatch = meta.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bin = atob(base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], filename, { type: mime });
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
}
const PAYMENT_METHODS = [
    { id: "Cash", label: "Tiền mặt", icon: "💵" },
    { id: "BankTransfer", label: "Chuyển khoản", icon: "🏦" },
];
const fmt = (n) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function normalizePromotion(p, planDurationDays = 0) {
    const bonusDays =
        p.soNgayTang != null
            ? p.soNgayTang
            : p.soChuKyTang != null
                ? p.soChuKyTang * planDurationDays
                : 0;
    return {
        id: p.promotionId,
        name: p.tenKhuyenMai || "Khuyến mãi",
        description: p.moTa || "",
        promoType: p.promoType,
        bonusDays,
        discountPercent: p.phanTramGiam ?? 0,
        discountAmount: p.soTienGiam ?? 0,
        discountCap: p.mucGiamToiDa ?? null,
    };
}
function isBonusDaysPromo(type) {
    return type === "TangNgay" || type === "TangChuKy";
}
function promoShortLabel(promo) {
    if (!promo) return "—";
    switch (promo.promoType) {
        case "TangNgay":
        case "TangChuKy":
            return `+${promo.bonusDays} ngày`;
        case "GiamTienMat":
            return `-${fmt(promo.discountAmount)}`;
        case "GiamPhanTram":
            return `-${promo.discountPercent}%`;
        default:
            return "—";
    }
}

// ============================================================
// SHARED VALIDATION-HINT HELPERS
// Trạng thái check dùng chung cho cả SĐT lẫn FaceID:
//   idle | checking | ok/valid | duplicate/invalid/error
// Gộp lại để không phải viết lặp khối hiển thị 2 lần.
// ============================================================
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const OK_STATUSES = new Set(["ok", "valid"]);
const DANGER_STATUSES = new Set(["duplicate", "invalid", "error"]);

function SpinnerDot() {
    return <span style={{ display: "inline-block", marginRight: 6 }}>⏳</span>;
}

/** Hiển thị 1 dòng hint theo status (checking/ok/danger) — dùng chung cho SĐT và FaceID. */
function StatusMessage({ status, message }) {
    if (!message) return null;
    if (status === "checking") {
        return <p style={g.hintChecking}><SpinnerDot /> {message}</p>;
    }
    if (OK_STATUSES.has(status)) {
        return <p style={g.hintOk}>✓ {message}</p>;
    }
    if (DANGER_STATUSES.has(status)) {
        return <p style={g.hintDanger}>{message}</p>;
    }
    return null;
}

// ============================================================
// CAMERA HOOK
// ============================================================
function useCamera(initialPhoto = null) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [camState, setCamState] = useState(initialPhoto ? "captured" : "idle");
    const [photo, setPhoto] = useState(initialPhoto);
    const [camError, setCamError] = useState("");
    useEffect(() => {
        if (camState !== "on") return;
        let cancelled = false;
        (async () => {
            try {
                setCamError("");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
                });
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => { });
                }
            } catch (err) {
                if (!cancelled) {
                    setCamError("Không thể mở camera: " + (err.message || err.name));
                    setCamState("idle");
                }
            }
        })();
        return () => { cancelled = true; };
    }, [camState]);
    useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);
    const start = () => { setPhoto(null); setCamState("on"); };
    const stop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamState("idle");
    };
    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 960;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setPhoto(dataUrl);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamState("captured");
    };
    const retake = () => { setPhoto(null); setCamState("on"); };
    const loadFromFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setCamError("Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP...).");
            return;
        }
        // HEIC/HEIF (ảnh chụp mặc định trên iPhone) không được trình duyệt giải mã
        // qua thẻ <img>, và cũng không được AWS Rekognition hỗ trợ -> chặn sớm.
        const lowerName = (file.name || "").toLowerCase();
        if (file.type === "image/heic" || file.type === "image/heif" ||
            lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
            setCamError("Không hỗ trợ định dạng HEIC/HEIF. Vui lòng chọn ảnh JPG hoặc PNG.");
            return;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const reader = new FileReader();
        reader.onload = () => {
            // Chuẩn hoá mọi ảnh tải lên về JPEG qua canvas (giống ảnh chụp từ camera),
            // vì AWS Rekognition chỉ chấp nhận JPEG/PNG -> tránh lỗi
            // "Request has invalid image format" khi người dùng tải lên WEBP, BMP, v.v.
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) {
                    setPhoto(reader.result);
                    setCamError("");
                    setCamState("captured");
                    return;
                }
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
                setPhoto(dataUrl);
                setCamError("");
                setCamState("captured");
            };
            img.onerror = () => setCamError("Không đọc được tệp ảnh, vui lòng thử lại với ảnh khác.");
            img.src = reader.result;
        };
        reader.onerror = () => setCamError("Không đọc được tệp ảnh, vui lòng thử lại.");
        reader.readAsDataURL(file);
    };
    return { videoRef, canvasRef, camState, photo, camError, start, stop, capture, retake, loadFromFile };
}

// ============================================================
// CAMERA PANEL
// ============================================================
function CamSVG() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 7, flexShrink: 0 }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}
function UploadSVG() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 7, flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}

function CameraPanel({ cam }) {
    const { videoRef, canvasRef, camState, photo, camError, start, stop, capture, retake, loadFromFile } = cam;
    const fileInputRef = useRef(null);
    const openFilePicker = () => fileInputRef.current?.click();
    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        loadFromFile(file);
        e.target.value = "";
    };
    return (
        <div style={cs.wrap}>
            <div style={cs.header}>
                <span style={cs.headerIcon}><CamSVG /></span>
                <span style={cs.headerText}>Chụp FaceID mới</span>
            </div>
            <div style={cs.frame}>
                <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{ ...cs.video, display: camState === "on" ? "block" : "none" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {camState === "captured" && photo && (
                    <img src={photo} alt="Ảnh hội viên" style={cs.photo} />
                )}
                {camState === "idle" && (
                    <div style={cs.placeholder}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <p style={cs.placeholderText}>Chưa có ảnh</p>
                    </div>
                )}
                {(camState === "on" || camState === "captured") && (
                    <div style={cs.aimOverlay}>
                        {["TL", "TR", "BL", "BR"].map((p) => <div key={p} style={{ ...cs.corner, ...cs[`c${p}`] }} />)}
                        <div style={cs.faceGuide}>
                            <svg width="100%" height="100%" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet">
                                <ellipse
                                    cx="100" cy="120" rx="72" ry="98"
                                    fill="none"
                                    stroke={camState === "captured" ? "rgba(255,255,255,0.9)" : T.cyan}
                                    strokeWidth="3.5" strokeDasharray="9 8" strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        {camState === "on" && <div style={cs.caption}>Canh mặt vào khung bầu dục</div>}
                    </div>
                )}
                {camState === "on" && <div style={cs.liveBadge}><span style={cs.liveDot} />LIVE</div>}
                {camState === "captured" && <div style={cs.capturedBadge}>✓ Đã chụp</div>}
            </div>
            {camError && <p style={cs.camErr}>{camError}</p>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={onFileChange} />
            <div style={cs.btnRow}>
                {camState === "idle" && (
                    <>
                        <button style={cs.btnStart} onClick={start}><CamSVG /> Chụp ảnh</button>
                        <button style={cs.btnUpload} onClick={openFilePicker}><UploadSVG /> Tải ảnh lên</button>
                    </>
                )}
                {camState === "on" && (
                    <>
                        <button style={cs.btnCapture} onClick={capture}>⚬ Chụp ảnh</button>
                        <button style={cs.btnCancel} onClick={stop}>✕ Huỷ</button>
                    </>
                )}
                {camState === "captured" && (
                    <>
                        <button style={cs.btnRetake} onClick={retake}>🔄 Chụp lại</button>
                        <button style={cs.btnUploadGhost} onClick={openFilePicker}><UploadSVG /> Tải ảnh khác</button>
                    </>
                )}
            </div>
        </div>
    );
}

function CalendarPlusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
            <line x1="12" y1="14" x2="12" y2="19" />
            <line x1="9.5" y1="16.5" x2="14.5" y2="16.5" />
        </svg>
    );
}
function BanknoteIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 10v.01" />
            <path d="M18 14v.01" />
        </svg>
    );
}
function PercentTagIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.82 0l4.6-4.6a2 2 0 0 0 0-2.82Z" />
            <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
    );
}
function promoIconFor(type) {
    if (type === "TangNgay" || type === "TangChuKy") return <CalendarPlusIcon />;
    if (type === "GiamTienMat") return <BanknoteIcon />;
    if (type === "GiamPhanTram") return <PercentTagIcon />;
    return <CalendarPlusIcon />;
}

const cs = {
    wrap: { display: "flex", flexDirection: "column", gap: 10, height: "100%" },
    header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2 },
    headerIcon: {
        width: 26, height: 26, borderRadius: 8, background: T.cyanSoft,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: T.cyan,
    },
    headerText: { fontSize: 12, fontWeight: 800, color: T.cyanDark, letterSpacing: "0.05em", textTransform: "uppercase" },
    frame: {
        flex: 1,
        minHeight: 340,
        background: `linear-gradient(160deg, ${T.camBg1}, ${T.camBg2})`,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        border: `2px solid ${T.cyanBorder}`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.15), 0 10px 30px rgba(16,185,129,0.12), inset 0 0 40px rgba(16,185,129,0.05)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    video: {
        width: "100%", height: "100%", objectFit: "cover", display: "block",
        transform: "scaleX(-1)", filter: "contrast(1.08) brightness(1.05) saturate(1.05)",
    },
    photo: {
        width: "100%", height: "100%", objectFit: "cover", display: "block",
        filter: "contrast(1.08) brightness(1.03) saturate(1.05)",
    },
    placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
    placeholderText: { color: T.textMuted, fontSize: 14, margin: 0 },
    aimOverlay: { position: "absolute", inset: 0, pointerEvents: "none" },
    faceGuide: {
        position: "absolute",
        top: "48%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "58%",
        height: "72%",
        pointerEvents: "none",
    },
    corner: { position: "absolute", width: 30, height: 30 },
    cTL: { top: 16, left: 16, borderTop: `4px solid ${T.cyan}`, borderLeft: `4px solid ${T.cyan}`, borderRadius: "4px 0 0 0", filter: `drop-shadow(0 0 4px ${T.cyanGlow})` },
    cTR: { top: 16, right: 16, borderTop: `4px solid ${T.cyan}`, borderRight: `4px solid ${T.cyan}`, borderRadius: "0 4px 0 0", filter: `drop-shadow(0 0 4px ${T.cyanGlow})` },
    cBL: { bottom: 16, left: 16, borderBottom: `4px solid ${T.cyan}`, borderLeft: `4px solid ${T.cyan}`, borderRadius: "0 0 0 4px", filter: `drop-shadow(0 0 4px ${T.cyanGlow})` },
    cBR: { bottom: 16, right: 16, borderBottom: `4px solid ${T.cyan}`, borderRight: `4px solid ${T.cyan}`, borderRadius: "0 0 4px 0", filter: `drop-shadow(0 0 4px ${T.cyanGlow})` },
    caption: {
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        color: T.cyanLight, fontSize: 13, fontWeight: 700, textAlign: "center",
        textShadow: "0 1px 4px rgba(0,0,0,.8)", whiteSpace: "nowrap",
    },
    liveBadge: {
        position: "absolute", top: 12, left: 12,
        background: "rgba(16,185,129,.92)", color: T.onAccent,
        fontSize: 11, fontWeight: 800, padding: "3px 9px",
        borderRadius: 5, display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.1em",
    },
    liveDot: { width: 7, height: 7, borderRadius: "50%", background: T.onAccent, flexShrink: 0 },
    capturedBadge: {
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        background: "rgba(5,150,105,.94)", color: "#fff",
        fontSize: 13, fontWeight: 700, padding: "5px 16px",
        borderRadius: 20,
    },
    camErr: { color: T.danger, fontSize: 12, textAlign: "center", margin: 0 },
    btnRow: { display: "flex", gap: 8 },
    btnStart: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: T.onAccent,
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
        boxShadow: `0 4px 14px ${T.cyanGlow}`,
    },
    btnUpload: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: T.panelDarkSoft, color: T.cyanDark,
        border: `1.5px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnUploadGhost: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: T.panelDarkSoft, color: T.cyanDark,
        border: `1.5px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    btnCapture: {
        flex: 2, padding: "12px 0", background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: T.onAccent,
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
        boxShadow: `0 4px 14px ${T.cyanGlow}`,
    },
    btnCancel: {
        flex: 1, padding: "12px 0", background: T.panelDarkSoft, color: T.cyanDark,
        border: `1px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, cursor: "pointer",
    },
    btnRetake: {
        flex: 1, padding: "12px 0", background: T.panelDarkSoft, color: T.cyanDark,
        border: `1px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
};

// ============================================================
// SHARED FIELD
// ============================================================
function Field({ label, error, children }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={g.fieldLabel}>{label}</label>
            {children}
            {error && <p style={{ color: T.danger, fontSize: 11, marginTop: 3 }}>{error}</p>}
        </div>
    );
}

// ============================================================
// BANNER
// ============================================================
function PageBanner({ title, subtitle }) {
    return (
        <div style={g.banner}>
            <div style={g.bannerGlow} />
            <span style={g.bannerIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                    <path d="M9 12l2 2 4-4" />
                </svg>
            </span>
            <div>
                <div style={g.bannerTitle}>{title}</div>
                <div style={g.bannerSubtitle}>{subtitle}</div>
            </div>
        </div>
    );
}

// ============================================================
// STEP 1 — THÔNG TIN HỘI VIÊN
// Auto-check SĐT (debounce 500ms) + auto-check FaceID (ngay khi có ảnh mới).
// SĐT trùng -> ẩn nút "Tiếp theo", thay bằng khối chặn ở footer.
// ============================================================
function StepMemberInfo({ formData, setFormData, savedPhoto, onNext }) {
    const cam = useCamera(savedPhoto);
    const [errors, setErrors] = useState({});

    const [phoneCheck, setPhoneCheck] = useState({ status: "idle", message: "" });
    const [faceCheck, setFaceCheck] = useState({ status: "idle", message: "" });

    const debouncedPhone = useDebouncedValue(formData.phone.trim(), 500);

    const set = (k) => (ev) => {
        setFormData((f) => ({ ...f, [k]: ev.target.value }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    // ---- AUTO-CHECK SĐT: chạy khi giá trị debounce thay đổi và đúng định dạng ----
    useEffect(() => {
        if (!/^(0|\+84)\d{9}$/.test(debouncedPhone)) {
            setPhoneCheck({ status: "idle", message: "" });
            return;
        }
        let cancelled = false;
        setPhoneCheck({ status: "checking", message: "Đang kiểm tra số điện thoại…" });
        (async () => {
            try {
                const res = await cashierApi.checkPhoneExists(debouncedPhone);
                const exists = res?.exists ?? res?.data?.exists ?? false;
                if (cancelled) return;
                setPhoneCheck(
                    exists
                        ? { status: "duplicate", message: "Số điện thoại này đã được sử dụng bởi một hội viên khác." }
                        : { status: "ok", message: "Số điện thoại hợp lệ, chưa có ai sử dụng" }
                );
            } catch {
                if (!cancelled) setPhoneCheck({ status: "error", message: "Không kiểm tra được số điện thoại, vui lòng thử lại" });
            }
        })();
        return () => { cancelled = true; };
    }, [debouncedPhone]);

    // ---- AUTO-CHECK FACEID: chạy ngay khi có ảnh mới (chụp/tải lên) ----
    useEffect(() => {
        if (!cam.photo) {
            setFaceCheck({ status: "idle", message: "" });
            return;
        }
        let cancelled = false;
        setFaceCheck({ status: "checking", message: "Đang kiểm tra khuôn mặt…" });
        (async () => {
            try {
                const file = dataUrlToFile(cam.photo, `face-check-${Date.now()}.jpg`);
                const fd = new FormData();
                fd.append("ProfileImage", file);
                // Đăng ký hội viên MỚI -> không loại trừ ai (không gửi ExcludeMemberId)
                const res = await cashierApi.checkMemberFace(fd);
                const data = res?.data ?? res;
                if (cancelled) return;
                setFaceCheck(
                    data.isValid
                        ? { status: "valid", message: data.message || "Ảnh hợp lệ, có thể đăng ký." }
                        : { status: "invalid", message: data.message || "Ảnh không hợp lệ." }
                );
            } catch {
                if (!cancelled) setFaceCheck({ status: "error", message: "Không kiểm tra được khuôn mặt, vui lòng thử lại." });
            }
        })();
        return () => { cancelled = true; };
    }, [cam.photo]);

    const validate = () => {
        const e = {};
        if (!formData.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";

        if (!/^(0|\+84)\d{9}$/.test(formData.phone.trim())) {
            e.phone = "Số điện thoại không hợp lệ";
        } else if (phoneCheck.status === "duplicate" || phoneCheck.status === "error") {
            e.phone = phoneCheck.message;
        } else if (phoneCheck.status === "checking") {
            e.phone = "Đang kiểm tra số điện thoại, vui lòng đợi…";
        }

        if (!formData.gender) e.gender = "Vui lòng chọn giới tính";

        if (!cam.photo) {
            e.photo = "Vui lòng chụp ảnh hội viên";
        } else if (faceCheck.status === "invalid" || faceCheck.status === "error") {
            e.photo = faceCheck.message;
        } else if (faceCheck.status === "checking") {
            e.photo = "Đang kiểm tra khuôn mặt, vui lòng đợi…";
        }

        return e;
    };

    const handleNext = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        onNext({ photo: cam.photo });
    };

    const isBusy = phoneCheck.status === "checking" || faceCheck.status === "checking";
    const isPhoneDuplicate = phoneCheck.status === "duplicate";

    return (
        <div style={g.card}>
            <h2 style={g.cardTitle}>Đăng ký hội viên mới</h2>
            <div style={g.twoCol}>
                <div style={g.leftCol}>
                    <CameraPanel cam={cam} />
                    {errors.photo && <p style={{ color: T.danger, fontSize: 11, marginTop: 6 }}>{errors.photo}</p>}
                    {!errors.photo && <StatusMessage status={faceCheck.status} message={faceCheck.message} />}
                </div>
                <div style={g.rightCol}>
                    <Field label="Họ và tên *" error={errors.fullName}>
                        <input
                            style={{ ...g.input, ...(errors.fullName ? g.inputErr : {}) }}
                            placeholder="Nguyễn Văn A"
                            value={formData.fullName}
                            onChange={set("fullName")}
                        />
                    </Field>
                    <Field label="Số điện thoại *" error={errors.phone}>
                        <input
                            style={{ ...g.input, ...(errors.phone || isPhoneDuplicate ? g.inputErr : {}) }}
                            placeholder="0901234567"
                            value={formData.phone}
                            onChange={set("phone")}
                            inputMode="tel"
                        />
                        {!errors.phone && <StatusMessage status={phoneCheck.status} message={phoneCheck.message} />}
                        {!errors.phone && isPhoneDuplicate && (
                            <div style={g.duplicateBanner}>
                                <span style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
                                <div>
                                    <div style={g.duplicateTitle}>Số điện thoại đã tồn tại</div>
                                    <div style={g.duplicateDesc}>
                                        {phoneCheck.message} Vui lòng kiểm tra lại hoặc dùng một số điện thoại khác
                                        để tiếp tục đăng ký.
                                    </div>
                                </div>
                            </div>
                        )}
                    </Field>
                    <Field label="Giới tính *" error={errors.gender}>
                        <div style={{ display: "flex", gap: 24, marginTop: 2 }}>
                            {[["Male", "Nam"], ["Female", "Nữ"], ["Other", "Khác"]].map(([v, l]) => (
                                <label key={v} style={g.radioLabel}>
                                    <input
                                        type="radio" name="gender" value={v}
                                        checked={formData.gender === v}
                                        onChange={set("gender")}
                                        style={{ marginRight: 6, accentColor: T.cyan }}
                                    />
                                    {l}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <Field label="Ghi chú nội bộ">
                        <textarea
                            style={{ ...g.input, minHeight: 100, resize: "vertical" }}
                            placeholder="Dị ứng, yêu cầu đặc biệt…"
                            value={formData.internalNotes}
                            onChange={set("internalNotes")}
                        />
                    </Field>
                </div>
            </div>
            <div style={g.footer}>
                {isPhoneDuplicate ? (
                    <div style={g.errBox}>
                        Không thể tiếp tục vì số điện thoại đã được sử dụng. Hãy sửa lại số điện thoại
                        (hoặc dùng chức năng tra cứu hội viên) trước khi chọn gói tập.
                    </div>
                ) : (
                    <button
                        style={{ ...g.btnPrimary, opacity: isBusy ? 0.7 : 1 }}
                        onClick={handleNext}
                        disabled={isBusy}
                    >
                        {isBusy ? "Đang kiểm tra…" : "Tiếp theo — Chọn gói tập →"}
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================
// STEP 2 — GÓI TẬP + THANH TOÁN
// ============================================================
function StepPackage({ memberForm, memberPhoto, pkgData, setPkgData, onBack, onDone }) {
    const [packages, setPackages] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [promotions, setPromotions] = useState([]);
    const [loadingPromos, setLoadingPromos] = useState(false);
    const [promoError, setPromoError] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoadingPackages(true);
        memberApi
            .getAllPackage()
            .then((res) => {
                if (cancelled) return;
                const list = Array.isArray(res) ? res : res?.data || [];
                setPackages(list.filter((p) => p.status === "OnSale"));
            })
            .catch(() => { if (!cancelled) setLoadError("Không tải được danh sách gói tập."); })
            .finally(() => { if (!cancelled) setLoadingPackages(false); });
        return () => { cancelled = true; };
    }, []);

    const setPkg = (pkg) => {
        setPkgData((d) => ({ ...d, selectedPkg: pkg, promotionId: null }));
        setError("");
    };
    const setPayment = (pm) => { setPkgData((d) => ({ ...d, payment: pm })); setError(""); };

    const selectedPkg = pkgData.selectedPkg;
    const payment = pkgData.payment;

    useEffect(() => {
        if (!selectedPkg?.planId) { setPromotions([]); return; }
        let cancelled = false;
        setLoadingPromos(true);
        setPromoError("");
        cashierApi
            .getApplicablePromotions(selectedPkg.planId)
            .then((res) => {
                if (cancelled) return;
                const list = Array.isArray(res) ? res : res?.data || [];
                const normalized = list.map((p) => normalizePromotion(p, selectedPkg.durationDays || 0));
                setPromotions(normalized);
                setPkgData((d) => ({ ...d, promotionId: normalized[0]?.id ?? null }));
            })
            .catch(() => {
                if (cancelled) return;
                setPromotions([]);
                setPromoError("Không tải được khuyến mãi áp dụng cho gói này.");
            })
            .finally(() => { if (!cancelled) setLoadingPromos(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPkg?.planId]);

    const selectedPromotion = promotions.find((p) => p.id === pkgData.promotionId) || null;

    const today = new Date();
    const planDays = selectedPkg?.durationDays || 0;
    const bonusDays = selectedPromotion?.bonusDays || 0;
    const totalDays = planDays + bonusDays;
    const endDatePreview = totalDays > 0 ? addDays(today, totalDays) : null;
    const basePct = totalDays > 0 ? (planDays / totalDays) * 100 : 100;
    const bonusPct = totalDays > 0 ? (bonusDays / totalDays) * 100 : 0;

    const rawPrice = selectedPkg?.price || 0;
    let discountFromPercent = selectedPromotion?.discountPercent
        ? (rawPrice * selectedPromotion.discountPercent) / 100
        : 0;
    if (selectedPromotion?.discountCap != null) {
        discountFromPercent = Math.min(discountFromPercent, selectedPromotion.discountCap);
    }
    const discountFromAmount = selectedPromotion?.discountAmount || 0;
    const finalPrice = Math.max(0, rawPrice - discountFromAmount - discountFromPercent);

    const confirm = async () => {
        if (!selectedPkg) { setError("Vui lòng chọn gói tập"); return; }
        if (!payment) { setError("Vui lòng chọn phương thức thanh toán"); return; }
        setError("");
        setSubmitting(true);
        try {
            const pkg = selectedPkg;
            const fd = new FormData();
            fd.append("FullName", memberForm.fullName);
            fd.append("Phone", memberForm.phone);
            fd.append("Gender", memberForm.gender);
            if (memberForm.internalNotes) fd.append("InternalNotes", memberForm.internalNotes);
            const profileFile = dataUrlToFile(memberPhoto, `member-${Date.now()}.jpg`);
            if (profileFile) fd.append("ProfileImage", profileFile);
            fd.append("PlanId", pkg.planId);
            if (selectedPromotion?.id) fd.append("PromotionId", selectedPromotion.id);
            fd.append("PaymentMethod", payment);
            fd.append("PaymentStatus", payment === "Cash" ? "Paid" : "Pending");
            fd.append("GiaGoc", pkg.price);
            fd.append("Amount", pkg.price);
            const result = await cashierApi.createMember(fd);
            onDone(result);
        } catch (err) {
            setError(err?.message || err?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <PageBanner
                title="Chọn gói tập cho hội viên"
                subtitle="Hội viên chưa đăng ký gói tập. Vui lòng chọn một gói để tiếp tục kích hoạt."
            />

            <div style={g.pkgPageLayout}>
                <div style={g.leftPkgCol}>
                    <div style={g.compareRow}>
                        <div style={g.compareCard}>
                            <div style={g.compareLabel}>GÓI HIỆN TẠI</div>
                            <div style={g.compareName}>Chưa có gói nào</div>
                        </div>
                        <div style={g.compareArrow}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>
                        <div style={{ ...g.compareCard, ...g.compareCardSel }}>
                            <div style={{ ...g.compareLabel, color: T.cyanDark }}>GÓI MUỐN MUA</div>
                            <div style={g.compareName}>
                                {selectedPkg ? selectedPkg.planName : <span style={{ color: T.textMuted, fontWeight: 500 }}>Chưa chọn gói</span>}
                            </div>
                            {selectedPkg && <div style={g.compareSub}>Thời hạn {selectedPkg.durationDays} ngày</div>}
                        </div>
                    </div>

                    {selectedPkg && (
                        <div style={g.timelineBox}>
                            {bonusDays > 0 && (
                                <div style={g.bonusPill}>
                                    <span style={g.bonusDot} />
                                    {bonusDays} ngày được tặng thêm từ khuyến mãi
                                </div>
                            )}
                            <div style={g.timelineBar}>
                                <div style={{ ...g.timelineSegBase, width: `${basePct}%` }} />
                                {bonusDays > 0 && <div style={{ ...g.timelineSegBonus, width: `${bonusPct}%` }} />}
                            </div>
                            <div style={g.timelineLabels}>
                                <div>
                                    <div style={g.timelineLabelSmall}>Hôm nay</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(today)}</div>
                                </div>
                                <div>
                                    <div style={g.timelineLabelSmall}>Bắt đầu gói mới</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(today)}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={g.timelineLabelSmall}>Kết thúc gói mới</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(endDatePreview)}</div>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: T.textMuted, marginTop: 8, marginBottom: 0 }}>
                                * Ngày bắt đầu/kết thúc chính xác sẽ do hệ thống tính khi xác nhận.
                            </p>
                        </div>
                    )}

                    <p style={g.secLabel}>CHỌN GÓI KHÁC</p>
                    {loadingPackages && <p style={{ color: T.textSecondary, fontSize: 13 }}>Đang tải danh sách gói tập…</p>}
                    {loadError && <p style={{ color: T.danger, fontSize: 13 }}>{loadError}</p>}
                    <div style={g.pkgList}>
                        {packages.map((pkg) => {
                            const sel = selectedPkg?.planId === pkg.planId;
                            return (
                                <div
                                    key={pkg.planId}
                                    style={{ ...g.pkgRow, ...(sel ? g.pkgRowSel : {}) }}
                                    onClick={() => setPkg(pkg)}
                                >
                                    <span style={{ ...g.pkgRadio, ...(sel ? g.pkgRadioSel : {}) }}>
                                        {sel && <span style={g.pkgRadioDot} />}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={g.pkgRowName}>{pkg.planName}</span>
                                            {pkg.isPopular && <span style={g.pkgPopular}>PHỔ BIẾN</span>}
                                        </div>
                                        <div style={g.pkgRowDesc}>
                                            Thời hạn {pkg.durationDays} ngày{pkg.description ? ` · ${pkg.description}` : ""}
                                        </div>
                                    </div>
                                    <div style={{ ...g.pkgRowPrice, ...(sel ? { color: T.cyanDark } : {}) }}>
                                        {fmt(pkg.price)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedPkg && (
                        <>
                            <p style={g.secLabel}>KHUYẾN MÃI ÁP DỤNG</p>
                            {loadingPromos && <p style={{ color: T.textSecondary, fontSize: 13 }}>Đang kiểm tra khuyến mãi…</p>}
                            {promoError && <p style={{ color: T.danger, fontSize: 13 }}>{promoError}</p>}
                            {!loadingPromos && !promoError && promotions.length === 0 && (
                                <p style={{ color: T.textMuted, fontSize: 13 }}>Gói này hiện không có khuyến mãi áp dụng.</p>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {promotions.map((promo) => {
                                    const sel = promo.id === pkgData.promotionId;
                                    const bonus = isBonusDaysPromo(promo.promoType);
                                    const boxBase = bonus ? g.promoBoxDays : g.promoBoxDiscount;
                                    const iconWrapVariant = bonus ? g.promoIconWrapDays : g.promoIconWrapDiscount;
                                    const accentColor = bonus ? T.amberText : T.discountText;
                                    return (
                                        <div
                                            key={promo.id}
                                            style={{ ...boxBase, ...(sel ? {} : g.promoBoxInactive) }}
                                            onClick={() => setPkgData((d) => ({ ...d, promotionId: promo.id }))}
                                        >
                                            <span style={{ ...g.promoIconWrap, ...iconWrapVariant }}>
                                                {promoIconFor(promo.promoType)}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ ...g.promoTitle, color: accentColor }}>{promo.name}</div>
                                                {promo.description && (
                                                    <div style={{ ...g.promoDesc, color: accentColor }}>{promo.description}</div>
                                                )}
                                            </div>
                                            <span style={{ ...g.promoValue, color: accentColor }}>
                                                {promoShortLabel(promo)}
                                            </span>
                                            {sel && (
                                                <span style={{ ...g.promoCheck, background: bonus ? T.amber : T.discount }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {selectedPkg && (
                        <>
                            <div style={g.divider} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Thành tiền</span>
                                <span style={{ fontWeight: 800, fontSize: 20, color: T.cyanDark }}>{fmt(finalPrice)}</span>
                            </div>
                        </>
                    )}

                    <p style={{ ...g.secLabel, marginTop: 20 }}>PHƯƠNG THỨC THANH TOÁN</p>
                    <div style={g.pmRow}>
                        {PAYMENT_METHODS.map((pm) => {
                            const sel = payment === pm.id;
                            return (
                                <div key={pm.id} style={{ ...g.pmCard, ...(sel ? g.pmSel : {}) }} onClick={() => setPayment(pm.id)}>
                                    <span style={{ fontSize: 18 }}>{pm.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? T.cyanDark : T.textSecondary }}>{pm.label}</span>
                                    {sel && (
                                        <span style={g.pmCheck}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <button style={g.btnGhost} onClick={onBack}>← Quay lại thông tin hội viên</button>
                    </div>
                </div>

                <div style={g.orderBox}>
                    <p style={g.secLabel}>HỘI VIÊN</p>
                    <div style={g.orderMember}>
                        {memberPhoto
                            ? <img src={memberPhoto} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.cyan}` }} />
                            : <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.panelDarkSofter, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                        }
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{memberForm.fullName || "—"}</div>
                            <div style={{ fontSize: 12, color: T.textMuted }}>{memberForm.phone || "—"}</div>
                        </div>
                    </div>
                    <div style={g.divider} />
                    {[
                        ["Gói tập", selectedPkg ? selectedPkg.planName : <span style={{ color: T.textMuted }}>Chưa chọn</span>],
                        ["Học phí", selectedPkg ? fmt(finalPrice) : "—"],
                        ["Khuyến mãi", selectedPromotion ? promoShortLabel(selectedPromotion) : "—"],
                        ["Thanh toán", PAYMENT_METHODS.find((p) => p.id === payment)?.label || <span style={{ color: T.textMuted }}>Chưa chọn</span>],
                        ["Face ID", memberPhoto ? <span style={{ color: T.cyanDark, fontWeight: 700 }}>Đã chụp</span> : <span style={{ color: T.danger }}>Chưa chụp</span>],
                    ].map(([k, v]) => (
                        <div key={k} style={g.orderRow}>
                            <span style={{ color: T.textMuted, fontSize: 13 }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", maxWidth: "58%", color: T.textPrimary }}>{v}</span>
                        </div>
                    ))}
                    {error && <div style={g.errBox}>{error}</div>}
                    <button
                        style={{ ...g.btnPrimary, marginTop: 18, opacity: submitting ? 0.7 : 1 }}
                        onClick={confirm}
                        disabled={submitting}
                    >
                        {submitting ? "Đang xử lý…" : "Tiếp theo"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// STEP 3 — THÀNH CÔNG
// ============================================================
function StepSuccess({ result, onNew }) {
    const member = result?.member ?? result;
    return (
        <div style={{ ...g.card, textAlign: "center", padding: "64px 40px" }}>
            <div style={{ fontSize: 72 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 10px", color: T.textPrimary }}>
                Tạo hội viên thành công!
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 15, marginBottom: 12 }}>
                Hội viên <strong>{member?.fullName || "mới"}</strong> đã được đăng ký và kích hoạt gói tập.
            </p>
            {member?.generatedPassword && (
                <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 12, padding: "10px 24px", display: "inline-block", marginBottom: 14, color: T.amberText, fontWeight: 700, fontSize: 14 }}>

                </div>
            )}
            <br />
            {member?.memberId && (
                <div style={{ background: T.cyanSoft, border: `1px solid ${T.cyanBorder}`, borderRadius: 12, padding: "12px 28px", display: "inline-block", marginBottom: 28, color: T.cyanDark, fontWeight: 700, fontSize: 15 }}>
                    Mã hội viên: #{member.memberId}
                </div>
            )}
            <br />
            <button style={{ ...g.btnPrimary, maxWidth: 260, margin: "0 auto" }} onClick={onNew}>
                + Tạo hội viên mới
            </button>
        </div>
    );
}

// ============================================================
// PROGRESS BAR
// ============================================================
function ProgressBar({ step }) {
    const steps = ["Thông tin", "Gói tập", "Hoàn tất"];
    return (
        <div style={g.progress}>
            {steps.map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div style={{ ...g.dot, background: i <= step ? `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})` : T.panelDarkSofter, color: i <= step ? T.onAccent : T.textMuted }}>
                            {i < step ? "✓" : i + 1}
                        </div>
                        <span style={{ fontSize: 13, color: i <= step ? T.textPrimary : T.textMuted, fontWeight: i === step ? 700 : 400 }}>
                            {label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{ flex: 1, height: 2, margin: "0 12px", background: i < step ? T.cyanDark : T.border, borderRadius: 2 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ============================================================
// ROOT
// ============================================================
export default function GymMemberRegistration() {
    const [step, setStep] = useState(0);
    const [memberForm, setMemberForm] = useState({
        fullName: "", phone: "", gender: "", internalNotes: "",
    });
    const [memberPhoto, setMemberPhoto] = useState(null);
    const [pkgData, setPkgData] = useState({ selectedPkg: null, payment: "", promotionId: null });
    const [result, setResult] = useState(null);
    const reset = () => {
        setStep(0);
        setMemberForm({ fullName: "", phone: "", gender: "", internalNotes: "" });
        setMemberPhoto(null);
        setPkgData({ selectedPkg: null, payment: "", promotionId: null });
        setResult(null);
    };
    return (
        <div style={g.root}>
            <div style={g.container}>
                {step < 2 && <ProgressBar step={step} />}
                {step === 0 && (
                    <StepMemberInfo
                        formData={memberForm}
                        setFormData={setMemberForm}
                        savedPhoto={memberPhoto}
                        onNext={({ photo }) => {
                            setMemberPhoto(photo);
                            setStep(1);
                        }}
                    />
                )}
                {step === 1 && (
                    <StepPackage
                        memberForm={memberForm}
                        memberPhoto={memberPhoto}
                        pkgData={pkgData}
                        setPkgData={setPkgData}
                        onBack={() => setStep(0)}
                        onDone={(r) => { setResult(r); setStep(2); }}
                    />
                )}
                {step === 2 && <StepSuccess result={result} onNew={reset} />}
            </div>
        </div>
    );
}

// ============================================================
// GLOBAL STYLES
// ============================================================
const g = {
    root: { minHeight: "100vh", background: T.bgPage, fontFamily: "'Inter','Segoe UI',sans-serif" },
    container: { maxWidth: 1100, margin: "0 auto", padding: "28px 24px 64px" },
    progress: {
        display: "flex", alignItems: "center",
        background: T.bgCard, borderRadius: 14,
        padding: "16px 28px", marginBottom: 22,
        boxShadow: "0 4px 16px rgba(16,24,40,.06)",
        border: `1.5px solid ${T.cyanBorder}`,
    },
    dot: {
        width: 28, height: 28, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
        transition: "background .25s",
    },
    card: {
        background: T.bgCard, borderRadius: 18,
        padding: "32px 36px 28px",
        boxShadow: "0 1px 4px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)",
        border: `1.5px solid ${T.cyanBorder}`,
    },
    cardTitle: {
        fontSize: 22, fontWeight: 800, color: T.textPrimary,
        marginBottom: 28, paddingBottom: 18,
        borderBottom: `1px solid ${T.border}`,
    },
    twoCol: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 36, marginBottom: 28, alignItems: "start" },
    leftCol: { paddingTop: 5 },
    rightCol: {},
    secLabel: {
        fontSize: 11, fontWeight: 700, color: T.cyanDark,
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 12, marginTop: 20,
    },
    fieldLabel: { display: "block", fontSize: 13, fontWeight: 600, color: T.textSecondary, marginBottom: 6 },
    input: {
        width: "100%", padding: "10px 14px",
        border: `1.5px solid ${T.cyanBorder}`, borderRadius: 10,
        fontSize: 14, outline: "none", boxSizing: "border-box",
        background: T.panelDarkSoft, color: T.textPrimary, transition: "border .15s",
        fontFamily: "inherit",
    },
    inputErr: { borderColor: T.danger, background: T.dangerBg },
    radioLabel: { display: "flex", alignItems: "center", fontSize: 14, cursor: "pointer", color: T.textSecondary },
    footer: {},

    hintChecking: { fontSize: 12, color: T.textSecondary, marginTop: 6, marginBottom: 0, display: "flex", alignItems: "center" },
    hintOk: { fontSize: 12, color: T.success, marginTop: 6, marginBottom: 0, fontWeight: 600 },
    hintDanger: { fontSize: 12, color: T.danger, marginTop: 6, marginBottom: 0, fontWeight: 600 },

    duplicateBanner: {
        display: "flex", alignItems: "flex-start", gap: 8,
        background: T.dangerBg, border: `1.5px solid ${T.dangerBorder}`,
        borderRadius: 10, padding: "10px 12px", marginTop: 8,
    },
    duplicateTitle: { fontSize: 12.5, fontWeight: 800, color: T.danger, marginBottom: 2 },
    duplicateDesc: { fontSize: 11.5, color: T.textSecondary, lineHeight: 1.5 },

    banner: {
        position: "relative",
        display: "flex", alignItems: "center", gap: 14,
        background: `linear-gradient(135deg, #ECFDF5, #F0FDF4)`,
        border: `1px solid ${T.cyanBorder}`,
        borderRadius: 16, padding: "20px 24px", marginBottom: 22,
        overflow: "hidden", boxShadow: "0 4px 16px rgba(16,185,129,.10)",
    },
    bannerGlow: {
        position: "absolute", top: -60, right: -60, width: 200, height: 200,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.cyanGlow} 0%, rgba(16,185,129,0) 70%)`,
        pointerEvents: "none",
    },
    bannerIcon: {
        width: 44, height: 44, borderRadius: 12,
        background: T.cyanSoft, border: `1px solid ${T.cyanBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, position: "relative", zIndex: 1,
    },
    bannerTitle: { fontSize: 17, fontWeight: 800, color: T.textPrimary, position: "relative", zIndex: 1 },
    bannerSubtitle: { fontSize: 13, color: T.textSecondary, marginTop: 2, position: "relative", zIndex: 1 },

    pkgPageLayout: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" },
    leftPkgCol: {
        background: T.bgCard, border: `2px solid ${T.cyan}`, borderRadius: 18,
        padding: "24px 26px", boxShadow: "0 1px 4px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)",
    },

    compareRow: { display: "flex", alignItems: "stretch", gap: 12, marginBottom: 20 },
    compareCard: { flex: 1, border: `2px solid ${T.cyanBorder}`, borderRadius: 12, padding: "12px 14px", background: T.panelDarkSoft },
    compareCardSel: { border: `2px solid ${T.cyan}`, background: T.cyanSoft },
    compareLabel: { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: T.textMuted, marginBottom: 6 },
    compareName: { fontSize: 14, fontWeight: 700, color: T.textPrimary },
    compareSub: { fontSize: 12, color: T.textMuted, marginTop: 2 },
    compareArrow: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 24 },

    pkgList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 },
    pkgRow: {
        display: "flex", alignItems: "center", gap: 14,
        border: `2px solid ${T.cyanBorder}`, borderRadius: 12,
        padding: "14px 16px", cursor: "pointer",
        background: T.panelDarkSoft, transition: "border .15s, background .15s, box-shadow .15s",
    },
    pkgRowSel: { border: `2px solid ${T.cyan}`, background: T.cyanSoftStrong, boxShadow: `0 0 0 3px ${T.cyanSoft}` },
    pkgRadio: {
        width: 20, height: 20, borderRadius: "50%",
        border: `2px solid ${T.cyanBorder}`, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", background: T.panelDark,
    },
    pkgRadioSel: { borderColor: T.cyan },
    pkgRadioDot: { width: 10, height: 10, borderRadius: "50%", background: T.cyan },
    pkgRowName: { fontWeight: 700, fontSize: 14, color: T.textPrimary },
    pkgRowDesc: { fontSize: 12, color: T.textMuted, marginTop: 2 },
    pkgRowPrice: { fontWeight: 800, fontSize: 15, color: T.textPrimary, whiteSpace: "nowrap" },
    pkgPopular: {
        background: T.cyanDark, color: "#fff", fontSize: 10, fontWeight: 700,
        padding: "2px 7px", borderRadius: 6, letterSpacing: "0.03em",
    },

    timelineBox: { background: T.cyanSoft, border: `2px solid ${T.cyan}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 },
    bonusPill: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: T.amberText, marginBottom: 10 },
    bonusDot: { width: 6, height: 6, borderRadius: "50%", background: T.amber, flexShrink: 0 },
    timelineLabels: { display: "flex", justifyContent: "space-between", marginTop: 10 },
    timelineLabelSmall: { fontSize: 11, color: T.textMuted },
    timelineLabelDate: { fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 2 },
    timelineBar: { display: "flex", width: "100%", height: 8, background: "rgba(16, 185, 129, 0.15)", borderRadius: 6, overflow: "hidden" },
    timelineSegBase: { background: T.cyan, height: "100%" },
    timelineSegBonus: { background: T.amber, height: "100%" },

    promoBoxDays: {
        display: "flex", alignItems: "flex-start", gap: 10,
        background: T.amberBg, border: `2px solid ${T.amber}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
    },
    promoBoxDiscount: {
        display: "flex", alignItems: "flex-start", gap: 10,
        background: T.discountBg, border: `2px solid ${T.discount}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
    },
    promoBoxInactive: { opacity: 0.55 },
    promoIconWrap: { width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    promoIconWrapDays: { background: "rgba(245,158,11,0.18)", color: T.amberText },
    promoIconWrapDiscount: { background: "rgba(52,211,153,0.18)", color: T.discountText },
    promoTitle: { fontSize: 13.5, fontWeight: 700 },
    promoDesc: { fontSize: 12, opacity: 0.85, marginTop: 2 },
    promoValue: { fontSize: 13, fontWeight: 800, flexShrink: 0, alignSelf: "center", whiteSpace: "nowrap" },
    promoCheck: { width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

    pmRow: { display: "flex", gap: 10 },
    pmCard: {
        flex: 1, position: "relative",
        display: "flex", alignItems: "center", gap: 10,
        border: `2px solid ${T.cyanBorder}`, borderRadius: 12,
        padding: "12px 14px", cursor: "pointer",
        background: T.panelDarkSoft, transition: "border .15s",
    },
    pmSel: { border: `2px solid ${T.cyan}`, background: T.cyanSoftStrong },
    pmCheck: {
        position: "absolute", right: 12, width: 18, height: 18, borderRadius: "50%",
        background: T.cyan, display: "flex", alignItems: "center", justifyContent: "center",
    },

    orderMember: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 },
    orderBox: {
        background: T.bgCard, border: `2px solid ${T.cyan}`,
        borderRadius: 18, padding: "22px 20px",
        position: "sticky", top: 20,
        boxShadow: "0 1px 4px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)",
    },
    divider: { height: 1, background: T.border, margin: "14px 0" },
    orderRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },

    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        background: T.panelDarkSoft, border: `1px solid ${T.cyanBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, color: T.cyanDark,
    },
    btnPrimary: {
        display: "block", width: "100%", padding: "14px",
        background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: T.onAccent,
        border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 700, cursor: "pointer",
        letterSpacing: "0.01em", boxShadow: `0 4px 16px ${T.cyanGlow}`,
    },
    btnGhost: { background: "transparent", border: "none", color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0" },
    errBox: {
        background: T.dangerBg, border: `1px solid ${T.dangerBorder}`,
        borderRadius: 8, padding: "10px 14px",
        color: T.danger, fontSize: 13, marginTop: 14,
    },
}; 