import { useEffect, useRef, useState } from "react";
import cashierApi from "../../../api/cashierApi";
import memberApi from "../../../api/memberApi";

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

const PAYMENT_METHODS = [
    { id: "Cash", label: "Tiền mặt", icon: "💵" },
    { id: "BankTransfer", label: "Chuyển khoản", icon: "🏦" },
];

// TODO: đây là danh sách DEMO để test giao diện thanh thời hạn 2 màu.
// Khi có API khuyến mãi thật (theo PlanId đã chọn), thay toàn bộ mảng này bằng
// dữ liệu trả về từ API. promotionId phải là ID thật trong DB — các option DEMO
// đang để promotionId = null nên sẽ KHÔNG được gửi lên BE (an toàn).
const VOUCHER_OPTIONS = [
    { id: "none", promotionId: null, label: "Không áp dụng voucher", bonusDays: 0 },
    { id: "demo-7d", promotionId: null, label: "[DEMO] Tặng thêm 7 ngày", bonusDays: 7 },
    { id: "demo-15d", promotionId: null, label: "[DEMO] Tặng thêm 15 ngày", bonusDays: 15 },
];

const CURRENT_BRANCH_NAME = "Chi nhánh Quận 1";

const fmt = (n) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
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
                    <img src={photo} alt="Ảnh hội viên" style={cs.photo} />
                )}

                {camState === "idle" && (
                    <div style={cs.placeholder}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2">
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
                                    stroke={camState === "captured" ? "rgba(255,255,255,0.85)" : "#34d399"}
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

const cs = {
    wrap: { display: "flex", flexDirection: "column", gap: 10, height: "100%" },
    header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2 },
    headerIcon: {
        width: 26, height: 26, borderRadius: 8, background: "#d1fae5",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    headerText: { fontSize: 12, fontWeight: 800, color: "#065f46", letterSpacing: "0.05em", textTransform: "uppercase" },
    frame: {
        flex: 1,
        minHeight: 320,
        background: "#ffffff",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        border: "1.5px solid #cbd5e1",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    // Lật gương preview để người dùng canh mặt tự nhiên (giống nhìn vào gương).
    // Ảnh THẬT SỰ được lưu/gửi lên BE đã được lật lại đúng chiều trong hàm capture().
    video: { width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scaleX(-1)" },
    photo: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
    placeholderText: { color: "#94a3b8", fontSize: 14, margin: 0 },
    aimOverlay: { position: "absolute", inset: 0, pointerEvents: "none" },
    faceGuide: {
        position: "absolute",
        top: "48%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "58%",
        height: "72%",
        pointerEvents: "none",
    },
    corner: { position: "absolute", width: 26, height: 26 },
    cTL: { top: 16, left: 16, borderTop: "3px solid #34d399", borderLeft: "3px solid #34d399", borderRadius: "3px 0 0 0" },
    cTR: { top: 16, right: 16, borderTop: "3px solid #34d399", borderRight: "3px solid #34d399", borderRadius: "0 3px 0 0" },
    cBL: { bottom: 16, left: 16, borderBottom: "3px solid #34d399", borderLeft: "3px solid #34d399", borderRadius: "0 0 0 3px" },
    cBR: { bottom: 16, right: 16, borderBottom: "3px solid #34d399", borderRight: "3px solid #34d399", borderRadius: "0 0 3px 0" },
    caption: {
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        color: "#6ee7b7", fontSize: 13, fontWeight: 700, textAlign: "center",
        textShadow: "0 1px 4px rgba(0,0,0,.6)", whiteSpace: "nowrap",
    },
    liveBadge: {
        position: "absolute", top: 12, left: 12,
        background: "rgba(16,185,129,.92)", color: "#022c22",
        fontSize: 11, fontWeight: 800, padding: "3px 9px",
        borderRadius: 5, display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.1em",
    },
    liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#022c22", flexShrink: 0 },
    capturedBadge: {
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        background: "rgba(5,150,105,.94)", color: "#fff",
        fontSize: 13, fontWeight: 700, padding: "5px 16px",
        borderRadius: 20,
    },
    camErr: { color: "#dc2626", fontSize: 12, textAlign: "center", margin: 0 },
    btnRow: { display: "flex", gap: 8 },
    btnStart: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: "#059669", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnUpload: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: "#fff", color: "#065f46",
        border: "1.5px solid #a7f3d0", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnUploadGhost: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 0", background: "#fff", color: "#065f46",
        border: "1.5px solid #a7f3d0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    btnCapture: {
        flex: 2, padding: "12px 0", background: "#059669", color: "#fff",
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnCancel: {
        flex: 1, padding: "12px 0", background: "#f0fdf4", color: "#065f46",
        border: "1px solid #bbf7d0", borderRadius: 12, fontSize: 14, cursor: "pointer",
    },
    btnRetake: {
        flex: 1, padding: "12px 0", background: "#f0fdf4", color: "#065f46",
        border: "1px solid #bbf7d0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
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
            {error && <p style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{error}</p>}
        </div>
    );
}

// ============================================================
// STEP 1 — THÔNG TIN HỘI VIÊN
// ============================================================
function StepMemberInfo({ formData, setFormData, savedPhoto, onNext }) {
    const cam = useCamera(savedPhoto);
    const [errors, setErrors] = useState({});
    const [checkingPhone, setCheckingPhone] = useState(false);

    const set = (k) => (ev) => {
        setFormData((f) => ({ ...f, [k]: ev.target.value }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!formData.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
        if (!/^(0|\+84)\d{9}$/.test(formData.phone.trim())) e.phone = "Số điện thoại không hợp lệ";
        if (!formData.gender) e.gender = "Vui lòng chọn giới tính";
        if (!cam.photo) e.photo = "Vui lòng chụp ảnh hội viên";
        return e;
    };

    const handleNext = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }

        setCheckingPhone(true);
        try {
            const res = await cashierApi.checkPhoneExists(formData.phone.trim());
            const exists = res?.exists ?? res?.data?.exists ?? false;
            if (exists) {
                setErrors((prev) => ({ ...prev, phone: "Số điện thoại đã được sử dụng" }));
                return;
            }
            onNext({ photo: cam.photo });
        } catch (err) {
            setErrors((prev) => ({ ...prev, phone: "Không kiểm tra được số điện thoại, vui lòng thử lại" }));
        } finally {
            setCheckingPhone(false);
        }
    };

    return (
        <div style={g.card}>
            <h2 style={g.cardTitle}>Đăng ký hội viên mới</h2>

            <div style={g.twoCol}>
                <div style={g.leftCol}>
                    <CameraPanel cam={cam} />
                    {errors.photo && <p style={{ color: "#dc2626", fontSize: 11, marginTop: 6 }}>{errors.photo}</p>}
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
                            style={{ ...g.input, ...(errors.phone ? g.inputErr : {}) }}
                            placeholder="0901234567"
                            value={formData.phone}
                            onChange={set("phone")}
                            inputMode="tel"
                        />
                    </Field>

                    <Field label="Giới tính *" error={errors.gender}>
                        <div style={{ display: "flex", gap: 24, marginTop: 2 }}>
                            {[["Male", "Nam"], ["Female", "Nữ"], ["Other", "Khác"]].map(([v, l]) => (
                                <label key={v} style={g.radioLabel}>
                                    <input
                                        type="radio" name="gender" value={v}
                                        checked={formData.gender === v}
                                        onChange={set("gender")}
                                        style={{ marginRight: 6, accentColor: "#059669" }}
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
                    style={{ ...g.btnPrimary, opacity: checkingPhone ? 0.7 : 1 }}
                    onClick={handleNext}
                    disabled={checkingPhone}
                >
                    {checkingPhone ? "Đang kiểm tra số điện thoại…" : "Tiếp theo — Chọn gói tập →"}
                </button>
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
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoadingPackages(true);
        memberApi
            .getAllPackage()
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

    const setPkg = (pkg) => { setPkgData((d) => ({ ...d, selectedPkg: pkg })); setError(""); };
    const setPayment = (pm) => { setPkgData((d) => ({ ...d, payment: pm })); setError(""); };

    const selectedVoucherId = pkgData.voucherId || "none";
    const selectedVoucher = VOUCHER_OPTIONS.find((v) => v.id === selectedVoucherId) || VOUCHER_OPTIONS[0];

    const onVoucherChange = (e) => {
        const opt = VOUCHER_OPTIONS.find((v) => v.id === e.target.value) || VOUCHER_OPTIONS[0];
        setPkgData((d) => ({ ...d, voucherId: opt.id }));
    };

    const selectedPkg = pkgData.selectedPkg;
    const payment = pkgData.payment;

    // ------ Tính thời hạn dự kiến (chỉ để hiển thị preview — ngày thật do BE tính) ------
    const today = new Date();
    const planDays = selectedPkg?.durationDays || 0;
    const bonusDays = selectedVoucher?.bonusDays || 0;
    const totalDays = planDays + bonusDays;
    const endDatePreview = totalDays > 0 ? addDays(today, totalDays) : null;
    const basePct = totalDays > 0 ? (planDays / totalDays) * 100 : 100;
    const bonusPct = totalDays > 0 ? (bonusDays / totalDays) * 100 : 0;

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
            // Chỉ gửi PromotionId khi voucher có promotionId THẬT (từ API sau này).
            // Các option DEMO có promotionId = null nên không gửi, tránh sai dữ liệu.
            if (selectedVoucher?.promotionId) fd.append("PromotionId", selectedVoucher.promotionId);

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

    return (
        <div style={g.card}>
            {/* ============== HEADER — chỉ nút back + tiêu đề, KHÔNG có avatar ============== */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #f1f5f9" }}>
                <button style={g.backBtn} onClick={onBack}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Chọn gói tập</h2>
            </div>

            <div style={g.pkgPageLayout}>
                {/* ============== CỘT TRÁI: THỜI HẠN (lên trên) rồi DANH SÁCH GÓI ============== */}
                <div style={{ flex: "1 1 0" }}>
                    <p style={g.secLabel}>Thời hạn gói tập</p>
                    {!selectedPkg ? (
                        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>
                            Chọn gói tập bên dưới để xem thời hạn dự kiến.
                        </p>
                    ) : (
                        <div style={{ ...g.timelineBox, marginBottom: 24 }}>
                            <div style={g.timelineLabels}>
                                <div>
                                    <div style={g.timelineLabelSmall}>Hôm nay</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(today)}</div>
                                </div>
                                <div>
                                    <div style={g.timelineLabelSmall}>Bắt đầu gói</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(today)}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={g.timelineLabelSmall}>Kết thúc gói</div>
                                    <div style={g.timelineLabelDate}>{fmtDate(endDatePreview)}</div>
                                </div>
                            </div>

                            <div style={g.timelineBar}>
                                <div style={{ ...g.timelineSegBase, width: `${basePct}%` }} />
                                {bonusDays > 0 && (
                                    <div style={{ ...g.timelineSegBonus, width: `${bonusPct}%` }} />
                                )}
                            </div>

                            <div style={g.timelineLegend}>
                                <span style={g.legendItem}>
                                    <span style={{ ...g.legendDot, background: "#059669" }} />
                                    Gói tập: {planDays} ngày
                                </span>
                                {bonusDays > 0 && (
                                    <span style={g.legendItem}>
                                        <span style={{ ...g.legendDot, background: "#f59e0b" }} />
                                        Voucher tặng thêm: {bonusDays} ngày
                                    </span>
                                )}
                            </div>

                            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, marginBottom: 0 }}>
                                * Ngày bắt đầu/kết thúc chính xác sẽ do hệ thống tính khi xác nhận.
                            </p>
                        </div>
                    )}

                    <p style={g.secLabel}>Gói tập *</p>

                    {loadingPackages && <p style={{ color: "#64748b", fontSize: 13 }}>Đang tải danh sách gói tập…</p>}
                    {loadError && <p style={{ color: "#dc2626", fontSize: 13 }}>{loadError}</p>}

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
                                    <div style={{ ...g.pkgRowPrice, ...(sel ? { color: "#059669" } : {}) }}>
                                        {fmt(pkg.price)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ============== CỘT PHẢI: AVATAR + VOUCHER + THANH TOÁN + TỔNG KẾT ============== */}
                <div style={g.orderBox}>
                    <div style={g.orderMember}>
                        {memberPhoto
                            ? <img src={memberPhoto} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #059669" }} />
                            : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                        }
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{memberForm.fullName}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{memberForm.phone}</div>
                        </div>
                    </div>

                    <div style={g.orderRow}>
                        <span style={{ color: "#64748b", fontSize: 13 }}>Chi nhánh</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{CURRENT_BRANCH_NAME}</span>
                    </div>

                    <div style={g.divider} />

                    <p style={{ ...g.secLabel, marginBottom: 10 }}>Mã voucher</p>
                    <select style={g.voucherSelect} value={selectedVoucherId} onChange={onVoucherChange}>
                        {VOUCHER_OPTIONS.map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                    </select>

                    <div style={g.divider} />

                    <p style={{ ...g.secLabel, marginBottom: 10 }}>Phương thức thanh toán *</p>
                    <div style={g.pmGrid}>
                        {PAYMENT_METHODS.map((pm) => (
                            <div
                                key={pm.id}
                                style={{ ...g.pmCard, ...(payment === pm.id ? g.pmSel : {}) }}
                                onClick={() => setPayment(pm.id)}
                            >
                                <span style={{ fontSize: 24 }}>{pm.icon}</span>
                                <span style={{ fontSize: 12, marginTop: 5, fontWeight: payment === pm.id ? 700 : 400 }}>{pm.label}</span>
                            </div>
                        ))}
                    </div>

                    <div style={g.divider} />

                    {[
                        ["Gói tập", selectedPkg ? selectedPkg.planName : <span style={{ color: "#94a3b8" }}>Chưa chọn</span>],
                        ["Thời hạn", selectedPkg ? `${totalDays} ngày` : "—"],
                    ].map(([k, v]) => (
                        <div key={k} style={g.orderRow}>
                            <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                        </div>
                    ))}

                    <div style={g.divider} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Tổng tiền</span>
                        <span style={{ fontWeight: 800, fontSize: 22, color: "#059669" }}>
                            {selectedPkg ? fmt(selectedPkg.price) : "—"}
                        </span>
                    </div>

                    {error && <div style={g.errBox}>{error}</div>}

                    <button
                        style={{ ...g.btnPrimary, marginTop: 18, opacity: submitting ? 0.7 : 1 }}
                        onClick={confirm}
                        disabled={submitting}
                    >
                        {submitting ? "Đang xử lý…" : "✓ Hoàn tất — Tạo hội viên"}
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
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 10px", color: "#0f172a" }}>
                Tạo hội viên thành công!
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 12 }}>
                Hội viên <strong>{member?.fullName || "mới"}</strong> đã được đăng ký và kích hoạt gói tập.
            </p>
            {member?.generatedPassword && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 24px", display: "inline-block", marginBottom: 14, color: "#92400e", fontWeight: 700, fontSize: 14 }}>
                    Mật khẩu tạm thời: {member.generatedPassword}
                </div>
            )}
            <br />
            {member?.memberId && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 28px", display: "inline-block", marginBottom: 28, color: "#15803d", fontWeight: 700, fontSize: 15 }}>
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
                        <div style={{ ...g.dot, background: i <= step ? "#059669" : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>
                            {i < step ? "✓" : i + 1}
                        </div>
                        <span style={{ fontSize: 13, color: i <= step ? "#0f172a" : "#94a3b8", fontWeight: i === step ? 700 : 400 }}>
                            {label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{ flex: 1, height: 2, margin: "0 12px", background: i < step ? "#059669" : "#e2e8f0", borderRadius: 2 }} />
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

    const [pkgData, setPkgData] = useState({ selectedPkg: null, payment: "", voucherId: "none" });

    const [result, setResult] = useState(null);

    const reset = () => {
        setStep(0);
        setMemberForm({ fullName: "", phone: "", gender: "", internalNotes: "" });
        setMemberPhoto(null);
        setPkgData({ selectedPkg: null, payment: "", voucherId: "none" });
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
    root: { minHeight: "100vh", background: "#f0fdf4", fontFamily: "'Inter','Segoe UI',sans-serif" },
    header: {
        background: "#022c22", color: "#fff",
        padding: "15px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    logo: { fontWeight: 800, fontSize: 21, letterSpacing: "-0.5px" },

    container: {
        maxWidth: 1100,
        margin: "0 auto",
        padding: "28px 24px 64px",
    },

    progress: {
        display: "flex", alignItems: "center",
        background: "#fff", borderRadius: 14,
        padding: "16px 28px", marginBottom: 22,
        boxShadow: "0 1px 3px rgba(5,150,105,.08)",
        border: "1px solid #d1fae5",
    },
    dot: {
        width: 28, height: 28, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
        transition: "background .25s",
    },

    card: {
        background: "#fff", borderRadius: 18,
        padding: "32px 36px 28px",
        boxShadow: "0 1px 4px rgba(5,150,105,.06), 0 8px 24px rgba(5,150,105,.08)",
        border: "1px solid #ecfdf5",
    },
    cardTitle: {
        fontSize: 22, fontWeight: 800, color: "#065f46",
        marginBottom: 28, paddingBottom: 18,
        borderBottom: "1px solid #d1fae5",
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
        fontSize: 11, fontWeight: 700, color: "#059669",
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 12, marginTop: 0,
    },
    fieldLabel: {
        display: "block", fontSize: 13, fontWeight: 600,
        color: "#374151", marginBottom: 6,
    },
    input: {
        width: "100%", padding: "10px 14px",
        border: "1.5px solid #d1fae5", borderRadius: 10,
        fontSize: 14, outline: "none", boxSizing: "border-box",
        background: "#f0fdf4", transition: "border .15s",
        fontFamily: "inherit",
    },
    inputErr: { borderColor: "#dc2626", background: "#fff5f5" },
    radioLabel: { display: "flex", alignItems: "center", fontSize: 14, cursor: "pointer", color: "#374151" },
    branchBadge: {
        display: "flex", alignItems: "center", gap: 8,
        background: "#ecfdf5", border: "1px solid #a7f3d0",
        borderRadius: 10, padding: "10px 14px", marginTop: 4,
    },
    footer: {},

    // -------- Package selection (Step 2) --------
    pkgPageLayout: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 28,
        alignItems: "start",
    },

    pkgList: { display: "flex", flexDirection: "column", gap: 10 },
    pkgRow: {
        display: "flex", alignItems: "center", gap: 14,
        border: "1.5px solid #d1fae5", borderRadius: 12,
        padding: "14px 16px", cursor: "pointer",
        background: "#f0fdf4",
        transition: "border .15s, background .15s, box-shadow .15s",
    },
    pkgRowSel: {
        border: "1.5px solid #059669", background: "#ecfdf5",
        boxShadow: "0 0 0 3px rgba(5,150,105,.08)",
    },
    pkgRadio: {
        width: 20, height: 20, borderRadius: "50%",
        border: "2px solid #a7f3d0", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff",
    },
    pkgRadioSel: { borderColor: "#059669" },
    pkgRadioDot: { width: 10, height: 10, borderRadius: "50%", background: "#059669" },
    pkgRowName: { fontWeight: 700, fontSize: 14, color: "#0f172a" },
    pkgRowDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
    pkgRowPrice: { fontWeight: 800, fontSize: 15, color: "#0f172a", whiteSpace: "nowrap" },
    pkgPopular: {
        background: "#059669", color: "#fff", fontSize: 10, fontWeight: 700,
        padding: "2px 7px", borderRadius: 6, letterSpacing: "0.03em",
    },

    // -------- Thanh thời hạn gói tập (2 màu) --------
    timelineBox: {
        background: "#f0fdf4", border: "1px solid #d1fae5",
        borderRadius: 14, padding: "16px 18px",
    },
    timelineLabels: {
        display: "flex", justifyContent: "space-between",
        marginBottom: 10,
    },
    timelineLabelSmall: { fontSize: 11, color: "#94a3b8" },
    timelineLabelDate: { fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 },
    timelineBar: {
        display: "flex", width: "100%", height: 10,
        background: "#d1fae5", borderRadius: 6, overflow: "hidden",
    },
    timelineSegBase: { background: "#059669", height: "100%" },
    timelineSegBonus: { background: "#f59e0b", height: "100%" },
    timelineLegend: { display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap" },
    legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" },
    legendDot: { width: 9, height: 9, borderRadius: "50%", display: "inline-block" },

    // -------- Order box (cột phải) --------
    orderMember: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
    pmGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 },
    pmCard: {
        border: "2px solid #d1fae5", borderRadius: 12, padding: "10px 6px",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", background: "#f0fdf4", transition: "border .15s",
    },
    pmSel: { border: "2px solid #059669", background: "#ecfdf5" },

    orderBox: {
        background: "#f0fdf4", border: "1px solid #d1fae5",
        borderRadius: 14, padding: "22px 20px",
        position: "sticky", top: 20,
    },
    divider: { height: 1, background: "#d1fae5", margin: "12px 0" },
    orderRow: {
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 8,
    },

    voucherSelect: {
        width: "100%", padding: "10px 12px",
        border: "1.5px solid #d1fae5", borderRadius: 10,
        fontSize: 13, outline: "none", background: "#fff",
        fontFamily: "inherit", color: "#0f172a", cursor: "pointer",
        appearance: "auto",
    },

    memberAvatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #059669" },
    memberAvatarFb: { width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },

    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        background: "#f0fdf4", border: "1px solid #d1fae5",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        color: "#065f46",
    },

    btnPrimary: {
        display: "block", width: "100%", padding: "14px",
        background: "#059669", color: "#fff",
        border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 700, cursor: "pointer",
        letterSpacing: "0.01em",
    },

    errBox: {
        background: "#fff5f5", border: "1px solid #fecaca",
        borderRadius: 8, padding: "10px 14px",
        color: "#dc2626", fontSize: 13, marginTop: 14,
    },
};