import { useEffect, useRef, useState } from "react";
import cashierApi from "../../../api/cashierApi";

// ============================================================
// THEME — tông màu đồng bộ với trang đăng nhập (StaffLogin): nền navy
// #0F172A/#1E293B, accent cyan #06B6D4, viền slate #334155.
// ============================================================
const T = {
    bgDeep: "#0F172A",
    panelDark: "#1E293B",
    panelDarkSoft: "#1A2744",
    panelDarkSofter: "#243352",
    cyan: "#06B6D4",
    cyanLight: "#67E8F9",
    cyanDark: "#0891B2",
    cyanSoft: "rgba(6, 182, 212, 0.14)",
    cyanSoftStrong: "rgba(6, 182, 212, 0.22)",
    cyanBorder: "rgba(6, 182, 212, 0.35)",
    cyanGlow: "rgba(6, 182, 212, 0.35)",
    blue: "#6366F1",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    border: "rgba(51, 65, 85, 0.8)",
    borderSoft: "rgba(51, 65, 85, 0.5)",
    bgPage: "#0F172A",
    bgCard: "#1E293B",
    bgSubtle: "rgba(6, 182, 212, 0.06)",
    amber: "#F59E0B",
    amberBg: "rgba(245, 158, 11, 0.14)",
    amberBorder: "rgba(245, 158, 11, 0.4)",
    amberText: "#FBBF6D",
    // Tông màu riêng cho khuyến mãi GIẢM GIÁ (GiamTienMat / GiamPhanTram) — xanh ngọc (mint),
    // tách biệt với tông hổ phách (amber) dùng cho khuyến mãi TẶNG NGÀY (TangNgay / TangChuKy)
    // để nhân viên phân biệt nhanh bằng màu sắc + icon mà không cần đọc kỹ mô tả.
    discount: "#34D399",
    discountBg: "rgba(52, 211, 153, 0.14)",
    discountBorder: "rgba(52, 211, 153, 0.4)",
    discountText: "#6EE7B7",
    danger: "#F87171",
    dangerBg: "rgba(220, 38, 38, 0.14)",
    dangerBorder: "rgba(248, 113, 113, 0.4)",
    success: "#34D399",
};

// ============================================================
// HELPERS
// ============================================================
// Chuyển dataURL (ảnh chụp từ canvas) thành File để đưa vào FormData
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
const PHONE_REGEX = /^(0|\+84)\d{9}$/;
const PAYMENT_METHODS = [
    { id: "Cash", label: "Tiền mặt", icon: "💵" },
    { id: "BankTransfer", label: "Chuyển khoản", icon: "🏦" },
];
const CURRENT_BRANCH_NAME = "Chi nhánh Quận 1";
const fmt = (n) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// Chuẩn hoá 1 khuyến mãi trả về từ GET /api/plans/{planId}/applicable-promotions
// thành 1 shape cố định để UI dùng. Response thật từ BE có dạng:
// { promotionId, tenKhuyenMai, promoType, phanTramGiam, soTienGiam, mucGiamToiDa,
//   soNgayTang, soChuKyTang, moTa }
//
// LƯU Ý NGHIỆP VỤ:
// - Với CẢ "TangNgay" lẫn "TangChuKy": BE luôn tính sẵn số ngày tặng thực tế vào
//   field soNgayTang (vd "mua 3 tháng tặng 1 chu kỳ" -> soNgayTang = 30) -> ưu tiên
//   dùng thẳng giá trị này. soChuKyTang chỉ là fallback phòng khi BE không trả
//   soNgayTang (giá trị null) — lúc đó mới tự nhân soChuKyTang * planDurationDays.
// - Giảm giá: phanTramGiam (%) có thể bị giới hạn bởi mucGiamToiDa (số tiền giảm tối đa);
//   soTienGiam là số tiền giảm cố định.
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

// Khuyến mãi loại "tặng ngày sử dụng" (TangNgay / TangChuKy) — hiển thị tông hổ phách
// + icon lịch. Các loại còn lại (GiamTienMat / GiamPhanTram) là giảm giá tiền —
// hiển thị tông xanh ngọc + icon tương ứng (tiền mặt / phần trăm).
function isBonusDaysPromo(type) {
    return type === "TangNgay" || type === "TangChuKy";
}

// Nhãn ngắn gọn thể hiện giá trị khuyến mãi theo đúng loại, dùng ở khối tóm tắt
// nhân viên bên phải và ở từng dòng khuyến mãi.
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
    // Camera trước (facingMode: "user") được hiển thị LẬT GƯƠNG bằng CSS (xem cs.video)
    // để người dùng canh mặt tự nhiên như soi gương. Tuy nhiên, ảnh XUẤT RA để gửi lên BE
    // phải là ảnh ĐÚNG CHIỀU THẬT NGOÀI ĐỜI (không lật), khớp với ảnh mà hệ thống
    // nhận diện khuôn mặt (FaceID) đang lưu/so khớp — nếu không sẽ bị lệch trái/phải và
    // không nhận diện được. Vì vậy khi capture, ta lật ảnh lại một lần nữa để triệt tiêu
    // hiệu ứng mirror của preview trước khi vẽ vào canvas.
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
        ctx.scale(-1, 1); // lật lại để bù trừ mirror của preview -> ảnh xuất ra không bị lật
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setPhoto(dataUrl);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamState("captured");
    };
    const retake = () => { setPhoto(null); setCamState("on"); };
    // Ảnh tải lên từ file KHÔNG qua camera trực tiếp nên giữ nguyên, không áp dụng mirror.
    const loadFromFile = (file) => {
        if (!file) return;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const reader = new FileReader();
        reader.onload = () => {
            setPhoto(reader.result);
            setCamError("");
            setCamState("captured");
        };
        reader.onerror = () => setCamError("Không đọc được tệp ảnh, vui lòng thử lại.");
        reader.readAsDataURL(file);
    };
    return { videoRef, canvasRef, camState, photo, camError, start, stop, capture, retake, loadFromFile };
}

// ============================================================
// CAMERA PANEL
// ============================================================
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
                <span style={cs.headerIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </span>
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
                    // Ảnh đã chụp hiển thị ĐÚNG CHIỀU THẬT (không mirror) — chính là ảnh
                    // sẽ được gửi lên BE, để nhân viên kiểm tra đúng những gì hệ thống nhận.
                    <img src={photo} alt="Ảnh Nhân viên" style={cs.photo} />
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
                        {camState === "on" && (
                            <div style={cs.caption}>Canh mặt vào khung bầu dục</div>
                        )}
                    </div>
                )}
                {camState === "on" && (
                    <div style={cs.liveBadge}><span style={cs.liveDot} />LIVE</div>
                )}
                {camState === "captured" && (
                    <div style={cs.capturedBadge}>✓ Đã chụp</div>
                )}
            </div>
            {camError && <p style={cs.camErr}>{camError}</p>}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onFileChange}
            />
            <div style={cs.btnRow}>
                {camState === "idle" && (
                    <>
                        <button style={cs.btnStart} onClick={start}>
                            <CamSVG /> Chụp ảnh
                        </button>
                        <button style={cs.btnUpload} onClick={openFilePicker}>
                            <UploadSVG /> Tải ảnh lên
                        </button>
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
                        <button style={cs.btnUploadGhost} onClick={openFilePicker}>
                            <UploadSVG /> Tải ảnh khác
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
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

// ------------------------------------------------------------
// Icon riêng cho từng loại khuyến mãi (dùng trong khối "Khuyến mãi áp dụng")
// ------------------------------------------------------------
// TangNgay / TangChuKy — tặng thêm ngày sử dụng -> icon lịch có dấu "+"
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
// GiamTienMat — giảm thẳng số tiền -> icon tờ tiền
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
// GiamPhanTram — giảm theo % -> icon thẻ giá / tag phần trăm
function PercentTagIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.82 0l4.6-4.6a2 2 0 0 0 0-2.82Z" />
            <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
    );
}
// Chọn icon phù hợp theo promoType — có fallback an toàn nếu BE trả loại lạ.
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
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    headerText: { fontSize: 12, fontWeight: 800, color: T.cyanLight, letterSpacing: "0.05em", textTransform: "uppercase" },
    // Khung camera: nền tối sâu hơn khối card xung quanh + viền cyan rõ nét hơn
    // để video/ảnh nổi bật, dễ nhìn thấy chi tiết khuôn mặt hơn so với nền trắng cũ.
    frame: {
        flex: 1,
        minHeight: 340,
        background: `linear-gradient(160deg, ${T.bgDeep}, ${T.panelDark})`,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        border: `2px solid ${T.cyanBorder}`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.45), inset 0 0 40px rgba(6,182,212,0.05)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    // Lật gương preview để người dùng canh mặt tự nhiên (giống nhìn vào gương).
    // Ảnh THẬT SỰ được lưu/gửi lên BE đã được lật lại đúng chiều trong hàm capture().
    // filter tăng nhẹ tương phản/độ nét để hình ảnh rõ hơn trên nền tối.
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
        background: "rgba(6,182,212,.92)", color: "#04222B",
        fontSize: 11, fontWeight: 800, padding: "3px 9px",
        borderRadius: 5, display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.1em",
    },
    liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#04222B", flexShrink: 0 },
    capturedBadge: {
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        background: "rgba(8,145,178,.94)", color: "#fff",
        fontSize: 13, fontWeight: 700, padding: "5px 16px",
        borderRadius: 20,
    },
    camErr: { color: T.danger, fontSize: 12, textAlign: "center", margin: 0 },
    btnRow: { display: "flex", gap: 8 },
    btnStart: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: "#04222B",
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnUpload: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: T.panelDarkSoft, color: T.cyanLight,
        border: `1.5px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnUploadGhost: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: T.panelDarkSoft, color: T.cyanLight,
        border: `1.5px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    btnCapture: {
        flex: 2, padding: "12px 0", background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: "#04222B",
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnCancel: {
        flex: 1, padding: "12px 0", background: T.panelDarkSoft, color: T.cyanLight,
        border: `1px solid ${T.cyanBorder}`, borderRadius: 12, fontSize: 14, cursor: "pointer",
    },
    btnRetake: {
        flex: 1, padding: "12px 0", background: T.panelDarkSoft, color: T.cyanLight,
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
// BANNER — dải tiêu đề navy/cyan (đồng bộ trang đăng nhập)
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
// STEP 1 — THÔNG TIN NHÂN VIÊN
// ============================================================
function StepMemberInfo({ formData, setFormData, savedPhoto, onNext }) {
    const cam = useCamera(savedPhoto);
    const [errors, setErrors] = useState({});
    // Kiểm tra trùng SĐT TỰ ĐỘNG ngay khi nhập xong (debounce), không đợi bấm "Tiếp theo" nữa.
    // status: idle | checking | ok | exists | error
    const [phoneCheck, setPhoneCheck] = useState({ status: "idle" });
    const set = (k) => (ev) => {
        setFormData((f) => ({ ...f, [k]: ev.target.value }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    // Tự động gọi checkPhoneExists mỗi khi SĐT hợp lệ đủ 10 số và người dùng ngừng gõ ~500ms.
    useEffect(() => {
        const phone = formData.phone.trim();
        if (!PHONE_REGEX.test(phone)) {
            setPhoneCheck({ status: "idle" });
            return;
        }
        let cancelled = false;
        setPhoneCheck({ status: "checking" });
        const t = setTimeout(async () => {
            try {
                const res = await cashierApi.checkPhoneExists(phone);
                if (cancelled) return;
                const exists = res?.exists ?? res?.data?.exists ?? false;
                if (exists) {
                    setPhoneCheck({ status: "exists" });
                    setErrors((e) => ({ ...e, phone: "Số điện thoại đã được sử dụng" }));
                } else {
                    setPhoneCheck({ status: "ok" });
                    setErrors((e) => ({ ...e, phone: undefined }));
                }
            } catch (err) {
                if (cancelled) return;
                setPhoneCheck({ status: "error" });
                setErrors((e) => ({ ...e, phone: "Không kiểm tra được số điện thoại, vui lòng thử lại" }));
            }
        }, 500);
        return () => { cancelled = true; clearTimeout(t); };
    }, [formData.phone]);

    const validate = () => {
        const e = {};
        if (!formData.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
        if (!PHONE_REGEX.test(formData.phone.trim())) e.phone = "Số điện thoại không hợp lệ";
        if (!formData.gender) e.gender = "Vui lòng chọn giới tính";
        if (!cam.photo) e.photo = "Vui lòng chụp ảnh nhân viên";
        return e;
    };
    const handleNext = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        // SĐT hợp lệ nhưng vẫn đang kiểm tra trùng ở nền -> chặn lại, đợi kết quả.
        if (phoneCheck.status === "checking") return;
        if (phoneCheck.status === "exists") {
            setErrors((prev) => ({ ...prev, phone: "Số điện thoại đã được sử dụng" }));
            return;
        }
        onNext({ photo: cam.photo });
    };
    const isCheckingPhone = phoneCheck.status === "checking";
    return (
        <div style={g.card}>
            <h2 style={g.cardTitle}>Đăng ký nhân viên mới</h2>
            <div style={g.twoCol}>
                <div style={g.leftCol}>
                    <CameraPanel cam={cam} />
                    {errors.photo && <p style={{ color: T.danger, fontSize: 11, marginTop: 6 }}>{errors.photo}</p>}
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
                        <div style={{ position: "relative" }}>
                            <input
                                style={{
                                    ...g.input,
                                    paddingRight: 36,
                                    ...(errors.phone ? g.inputErr : {}),
                                    ...(phoneCheck.status === "ok" ? { borderColor: T.success } : {}),
                                }}
                                placeholder="0901234567"
                                value={formData.phone}
                                onChange={set("phone")}
                                inputMode="tel"
                            />
                            <span style={g.phoneStatusIcon}>
                                {phoneCheck.status === "checking" && <span style={g.miniSpinner} />}
                                {phoneCheck.status === "ok" && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </span>
                        </div>
                        {!errors.phone && phoneCheck.status === "ok" && (
                            <p style={{ color: T.success, fontSize: 11, marginTop: 3 }}>Số điện thoại hợp lệ, chưa được sử dụng</p>
                        )}
                        {!errors.phone && phoneCheck.status === "checking" && (
                            <p style={{ color: T.textMuted, fontSize: 11, marginTop: 3 }}>Đang kiểm tra số điện thoại…</p>
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
                    <div style={g.branchBadge}>
                        <span style={{ fontSize: 16 }}>📍</span>
                        <span style={{ fontSize: 13 }}>Chi nhánh: <strong>{CURRENT_BRANCH_NAME}</strong></span>
                    </div>
                </div>
            </div>
            <div style={g.footer}>
                <button
                    style={{ ...g.btnPrimary, opacity: isCheckingPhone ? 0.7 : 1 }}
                    onClick={handleNext}
                    disabled={isCheckingPhone}
                >
                    {isCheckingPhone ? "Đang kiểm tra số điện thoại…" : "Tiếp theo — Chọn gói tập →"}
                </button>
            </div>
        </div>
    );
}

// ============================================================
// STEP 2 — GÓI TẬP + THANH TOÁN (bố cục theo mẫu "Kích hoạt nhân viên")
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
        cashierApi
            .getPackOfStaff()
            .then((res) => {
                if (cancelled) return;
                // API trả về mảng plan: { planId, planName, price, durationDays, description, status, isPopular, ... }
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

    // ------ Lấy khuyến mãi áp dụng cho gói đã chọn: GET /api/plans/{planId}/applicable-promotions ------
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
                // Mặc định áp dụng khuyến mãi đầu tiên hệ thống trả về (nếu có)
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

    // ------ Tính thời hạn + thành tiền dự kiến (chỉ để hiển thị preview — BE tính giá trị thật) ------
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
    // Giới hạn mức giảm theo mucGiamToiDa (nếu BE có trả về giá trị này)
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
            // BranchId KHÔNG gửi từ FE — BE tự lấy theo chi nhánh của nhân viên đăng nhập
            if (memberForm.internalNotes) fd.append("InternalNotes", memberForm.internalNotes);
            const profileFile = dataUrlToFile(memberPhoto, `member-${Date.now()}.jpg`);
            if (profileFile) fd.append("ProfileImage", profileFile);
            fd.append("PlanId", pkg.planId);
            // Chỉ gửi PromotionId khi có khuyến mãi thật được chọn từ API applicable-promotions.
            if (selectedPromotion?.id) fd.append("PromotionId", selectedPromotion.id);
            fd.append("PaymentMethod", payment);
            fd.append("PaymentStatus", payment === "Cash" ? "Paid" : "Pending");
            fd.append("GiaGoc", pkg.price);
            fd.append("Amount", pkg.price);
            // ĐÃ BỎ: SoNgayTangThucTe, StartDate, ExpiryDate — BE tự tính toàn bộ
            // dựa vào PlanId (DurationDays) + PromotionId, không nhận các giá trị này từ FE.
            const result = await cashierApi.createMember(fd);
            onDone(result);
        } catch (err) {
            setError(err?.message || err?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    const otherPackages = packages.filter((p) => p.planId !== selectedPkg?.planId);

    return (
        <div>
            <PageBanner
                title="Chọn gói cho nhân viên"
                subtitle="Nhân viên chưa đăng ký gói . Vui lòng chọn một gói để tiếp tục kích hoạt."
            />

            <div style={g.pkgPageLayout}>
                {/* ============== CỘT TRÁI ============== */}
                <div style={g.leftPkgCol}>
                    {/* So sánh gói hiện tại / gói muốn mua */}
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
                            <div style={{ ...g.compareLabel, color: T.cyanLight }}>GÓI MUỐN MUA</div>
                            <div style={g.compareName}>
                                {selectedPkg ? selectedPkg.planName : <span style={{ color: T.textMuted, fontWeight: 500 }}>Chưa chọn gói</span>}
                            </div>
                            {selectedPkg && (
                                <div style={g.compareSub}>Thời hạn {selectedPkg.durationDays} ngày</div>
                            )}
                        </div>
                    </div>

                    {/* Thanh thời hạn + bonus ngày khuyến mãi */}
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

                    {/* Danh sách gói khác */}
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
                                    <div style={{ ...g.pkgRowPrice, ...(sel ? { color: T.cyanLight } : {}) }}>
                                        {fmt(pkg.price)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Khuyến mãi áp dụng — từ getApplicablePromotions(planId).
                        Mỗi dòng được tô màu + icon khác nhau tuỳ loại:
                        - TangNgay / TangChuKy (tặng ngày): tông hổ phách, icon lịch.
                        - GiamTienMat (giảm thẳng tiền): tông xanh ngọc, icon tờ tiền.
                        - GiamPhanTram (giảm %): tông xanh ngọc, icon tag phần trăm. */}
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
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#04222B" strokeWidth="3">
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
                                <span style={{ fontWeight: 800, fontSize: 20, color: T.cyanLight }}>{fmt(finalPrice)}</span>
                            </div>
                        </>
                    )}

                    {/* Phương thức thanh toán */}
                    <p style={{ ...g.secLabel, marginTop: 20 }}>PHƯƠNG THỨC THANH TOÁN</p>
                    <div style={g.pmRow}>
                        {PAYMENT_METHODS.map((pm) => {
                            const sel = payment === pm.id;
                            return (
                                <div key={pm.id} style={{ ...g.pmCard, ...(sel ? g.pmSel : {}) }} onClick={() => setPayment(pm.id)}>
                                    <span style={{ fontSize: 18 }}>{pm.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? T.cyanLight : T.textSecondary }}>{pm.label}</span>
                                    {sel && (
                                        <span style={g.pmCheck}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04222B" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <button style={g.btnGhost} onClick={onBack}>← Quay lại thông tin nhân viên</button>
                    </div>
                </div>

                {/* ============== CỘT PHẢI — TÓM TẮT NHÂN VIÊN ============== */}
                <div style={g.orderBox}>
                    <p style={g.secLabel}>NHÂN VIÊN</p>
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
                        ["Face ID", memberPhoto ? <span style={{ color: T.cyanLight, fontWeight: 700 }}>Đã chụp</span> : <span style={{ color: T.danger }}>Chưa chụp</span>],
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
    // Điều chỉnh tuỳ theo shape thật của MemberResponse trả về từ BE
    const member = result?.member ?? result;
    return (
        <div style={{ ...g.card, textAlign: "center", padding: "64px 40px" }}>
            <div style={{ fontSize: 72 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 10px", color: T.textPrimary }}>
                Tạo nhân viên thành công!
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 15, marginBottom: 12 }}>
                Nhân viên <strong>{member?.fullName || "mới"}</strong> đã được đăng ký và kích hoạt gói/
            </p>
            {member?.generatedPassword && (
                <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 12, padding: "10px 24px", display: "inline-block", marginBottom: 14, color: T.amberText, fontWeight: 700, fontSize: 14 }}>
                    Mật khẩu tạm thời: {member.generatedPassword}
                </div>
            )}
            <br />
            {member?.memberId && (
                <div style={{ background: T.cyanSoft, border: `1px solid ${T.cyanBorder}`, borderRadius: 12, padding: "12px 28px", display: "inline-block", marginBottom: 28, color: T.cyanLight, fontWeight: 700, fontSize: 15 }}>
                    Mã  viên: #{member.memberId}
                </div>
            )}
            <br />
            <button style={{ ...g.btnPrimary, maxWidth: 260, margin: "0 auto" }} onClick={onNew}>
                + Tạo nhân mới
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
                        <div style={{ ...g.dot, background: i <= step ? `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})` : T.panelDarkSofter, color: i <= step ? "#04222B" : T.textMuted }}>
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
export default function GymMemberRegistrationStaff() {
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
    container: {
        maxWidth: 1100,
        margin: "0 auto",
        padding: "28px 24px 64px",
    },
    progress: {
        display: "flex", alignItems: "center",
        background: T.bgCard, borderRadius: 14,
        padding: "16px 28px", marginBottom: 22,
        boxShadow: "0 4px 16px rgba(0,0,0,.25)",
        border: `1px solid ${T.border}`,
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
        boxShadow: "0 1px 4px rgba(0,0,0,.2), 0 12px 32px rgba(0,0,0,.35)",
        border: `1px solid ${T.borderSoft}`,
    },
    cardTitle: {
        fontSize: 22, fontWeight: 800, color: T.textPrimary,
        marginBottom: 28, paddingBottom: 18,
        borderBottom: `1px solid ${T.border}`,
    },
    twoCol: {
        display: "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap: 36,
        marginBottom: 28,
        alignItems: "start",
    },
    leftCol: { paddingTop: 5 },
    rightCol: {},
    secLabel: {
        fontSize: 11, fontWeight: 700, color: T.cyanLight,
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 12, marginTop: 20,
    },
    fieldLabel: {
        display: "block", fontSize: 13, fontWeight: 600,
        color: T.textSecondary, marginBottom: 6,
    },
    input: {
        width: "100%", padding: "10px 14px",
        border: `1.5px solid ${T.border}`, borderRadius: 10,
        fontSize: 14, outline: "none", boxSizing: "border-box",
        background: T.panelDarkSoft, color: T.textPrimary, transition: "border .15s",
        fontFamily: "inherit",
    },
    inputErr: { borderColor: T.danger, background: T.dangerBg },
    // -------- Icon trạng thái kiểm tra SĐT trùng (spinner / dấu tick) --------
    phoneStatusIcon: {
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
    },
    miniSpinner: {
        width: 14, height: 14, borderRadius: "50%",
        border: `2px solid ${T.borderSoft}`, borderTopColor: T.cyan,
        animation: "spin .7s linear infinite",
    },
    radioLabel: { display: "flex", alignItems: "center", fontSize: 14, cursor: "pointer", color: T.textSecondary },
    branchBadge: {
        display: "flex", alignItems: "center", gap: 8,
        background: T.cyanSoft, border: `1px solid ${T.cyanBorder}`,
        borderRadius: 10, padding: "10px 14px", marginTop: 4,
        color: T.textPrimary,
    },
    footer: {},

    // -------- Banner --------
    banner: {
        position: "relative",
        display: "flex", alignItems: "center", gap: 14,
        background: `linear-gradient(135deg, ${T.bgDeep}, ${T.panelDarkSoft})`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 22,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,.4)",
    },
    bannerGlow: {
        position: "absolute",
        top: -60, right: -60,
        width: 200, height: 200,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.cyanGlow} 0%, rgba(6,182,212,0) 70%)`,
        pointerEvents: "none",
    },
    bannerIcon: {
        width: 44, height: 44, borderRadius: 12,
        background: T.cyanSoft,
        border: `1px solid ${T.cyanBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, position: "relative", zIndex: 1,
    },
    bannerTitle: { fontSize: 17, fontWeight: 800, color: "#F1F5F9", position: "relative", zIndex: 1 },
    bannerSubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 2, position: "relative", zIndex: 1 },

    // -------- Package selection (Step 2) --------
    pkgPageLayout: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 24,
        alignItems: "start",
    },
    leftPkgCol: {
        background: T.bgCard,
        border: `1px solid ${T.borderSoft}`,
        borderRadius: 18,
        padding: "24px 26px",
        boxShadow: "0 1px 4px rgba(0,0,0,.2), 0 12px 32px rgba(0,0,0,.35)",
    },

    compareRow: { display: "flex", alignItems: "stretch", gap: 12, marginBottom: 20 },
    compareCard: {
        flex: 1, border: `1.5px solid ${T.border}`, borderRadius: 12,
        padding: "12px 14px", background: T.panelDarkSoft,
    },
    compareCardSel: { border: `1.5px solid ${T.cyanBorder}`, background: T.cyanSoft },
    compareLabel: { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: T.textMuted, marginBottom: 6 },
    compareName: { fontSize: 14, fontWeight: 700, color: T.textPrimary },
    compareSub: { fontSize: 12, color: T.textMuted, marginTop: 2 },
    compareArrow: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 24 },

    pkgList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 },
    pkgRow: {
        display: "flex", alignItems: "center", gap: 14,
        border: `1.5px solid ${T.border}`, borderRadius: 12,
        padding: "14px 16px", cursor: "pointer",
        background: T.panelDarkSoft,
        transition: "border .15s, background .15s, box-shadow .15s",
    },
    pkgRowSel: {
        border: `1.5px solid ${T.cyan}`, background: T.cyanSoftStrong,
        boxShadow: `0 0 0 3px ${T.cyanSoft}`,
    },
    pkgRadio: {
        width: 20, height: 20, borderRadius: "50%",
        border: `2px solid ${T.cyanBorder}`, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: T.panelDark,
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

    // -------- Thanh thời hạn gói tập --------
    timelineBox: {
        background: T.cyanSoft, border: `1px solid ${T.cyanBorder}`,
        borderRadius: 14, padding: "16px 18px", marginBottom: 20,
    },
    bonusPill: {
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 700, color: T.amberText, marginBottom: 10,
    },
    bonusDot: { width: 6, height: 6, borderRadius: "50%", background: T.amber, flexShrink: 0 },
    timelineLabels: { display: "flex", justifyContent: "space-between", marginTop: 10 },
    timelineLabelSmall: { fontSize: 11, color: T.textMuted },
    timelineLabelDate: { fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 2 },
    timelineBar: {
        display: "flex", width: "100%", height: 8,
        background: "rgba(6, 182, 212, 0.18)", borderRadius: 6, overflow: "hidden",
    },
    timelineSegBase: { background: T.cyan, height: "100%" },
    timelineSegBonus: { background: T.amber, height: "100%" },

    // -------- Khuyến mãi áp dụng — 2 biến thể màu theo loại KM --------
    // TangNgay / TangChuKy (tặng ngày): tông hổ phách (amber)
    promoBoxDays: {
        display: "flex", alignItems: "flex-start", gap: 10,
        background: T.amberBg, border: `1.5px solid ${T.amberBorder}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
    },
    // GiamTienMat / GiamPhanTram (giảm giá tiền): tông xanh ngọc (mint)
    promoBoxDiscount: {
        display: "flex", alignItems: "flex-start", gap: 10,
        background: T.discountBg, border: `1.5px solid ${T.discountBorder}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
    },
    promoBoxInactive: { background: T.panelDarkSoft, border: `1.5px solid ${T.border}`, opacity: 0.7 },
    promoIconWrap: {
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    promoIconWrapDays: { background: "rgba(245,158,11,0.18)", color: T.amberText },
    promoIconWrapDiscount: { background: "rgba(52,211,153,0.18)", color: T.discountText },
    promoTitle: { fontSize: 13.5, fontWeight: 700 },
    promoDesc: { fontSize: 12, opacity: 0.85, marginTop: 2 },
    promoValue: { fontSize: 13, fontWeight: 800, flexShrink: 0, alignSelf: "center", whiteSpace: "nowrap" },
    promoCheck: {
        width: 20, height: 20, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },

    // -------- Phương thức thanh toán --------
    pmRow: { display: "flex", gap: 10 },
    pmCard: {
        flex: 1, position: "relative",
        display: "flex", alignItems: "center", gap: 10,
        border: `1.5px solid ${T.border}`, borderRadius: 12,
        padding: "12px 14px", cursor: "pointer",
        background: T.panelDarkSoft, transition: "border .15s",
    },
    pmSel: { border: `1.5px solid ${T.cyan}`, background: T.cyanSoftStrong },
    pmCheck: {
        position: "absolute", right: 12, width: 18, height: 18, borderRadius: "50%",
        background: T.cyan, display: "flex", alignItems: "center", justifyContent: "center",
    },

    // -------- Order box (cột phải) --------
    orderMember: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 },
    orderBox: {
        background: T.bgCard, border: `1px solid ${T.borderSoft}`,
        borderRadius: 18, padding: "22px 20px",
        position: "sticky", top: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,.2), 0 12px 32px rgba(0,0,0,.35)",
    },
    divider: { height: 1, background: T.border, margin: "14px 0" },
    orderRow: {
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10,
    },

    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        background: T.panelDarkSoft, border: `1px solid ${T.cyanBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        color: T.cyanLight,
    },
    btnPrimary: {
        display: "block", width: "100%", padding: "14px",
        background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLight})`, color: "#04222B",
        border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 700, cursor: "pointer",
        letterSpacing: "0.01em",
        boxShadow: `0 4px 16px ${T.cyanGlow}`,
    },
    btnGhost: {
        background: "transparent", border: "none", color: T.textMuted,
        fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0",
    },
    errBox: {
        background: T.dangerBg, border: `1px solid ${T.dangerBorder}`,
        borderRadius: 8, padding: "10px 14px",
        color: T.danger, fontSize: 13, marginTop: 14,
    },
};