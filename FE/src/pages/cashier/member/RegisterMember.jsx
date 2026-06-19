import { useEffect, useRef, useState } from "react";

// ============================================================
// API LAYER — chỉ đổi BASE_URL là xong
// ============================================================
const BASE_URL = "https://your-api.com/api";

const api = {
    getPackages: () =>
        fetch(`${BASE_URL}/packages`).then((r) => r.json()),

    createMemberWithSubscription: (payload) =>
        fetch(`${BASE_URL}/members/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }).then((r) => {
            if (!r.ok) return r.json().then((e) => Promise.reject(e));
            return r.json();
        }),
};

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_PACKAGES = [
    { packageId: 1, name: "Gói 1 tháng", durationDays: 30, price: 350000, description: "Tập không giới hạn 30 ngày" },
    { packageId: 2, name: "Gói 3 tháng", durationDays: 90, price: 900000, description: "Tiết kiệm 14% so với gói tháng" },
    { packageId: 3, name: "Gói 6 tháng", durationDays: 180, price: 1600000, description: "Tiết kiệm 24% — phổ biến nhất" },
    { packageId: 4, name: "Gói 1 năm", durationDays: 365, price: 2800000, description: "Tiết kiệm 33% — cam kết dài hạn" },
];

const PAYMENT_METHODS = [
    { id: "cash", label: "Tiền mặt", icon: "💵" },
    { id: "bank_transfer", label: "Chuyển khoản", icon: "🏦" },
    { id: "momo", label: "MoMo", icon: "📱" },
    { id: "vnpay", label: "VNPay", icon: "💳" },
];

const CURRENT_BRANCH_ID = 1;
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
    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setPhoto(dataUrl);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamState("captured");
    };
    const retake = () => { setPhoto(null); setCamState("on"); };

    return { videoRef, canvasRef, camState, photo, camError, start, stop, capture, retake };
}

// ============================================================
// CAMERA PANEL
// ============================================================
function CameraPanel({ cam }) {
    const { videoRef, canvasRef, camState, photo, camError, start, stop, capture, retake } = cam;

    return (
        <div style={cs.wrap}>
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
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <p style={cs.placeholderText}>Chưa có ảnh</p>
                    </div>
                )}

                {camState === "on" && (
                    <div style={cs.aimOverlay}>
                        {["TL", "TR", "BL", "BR"].map((p) => <div key={p} style={{ ...cs.corner, ...cs[`c${p}`] }} />)}
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

            <div style={cs.btnRow}>
                {camState === "idle" && (
                    <button style={cs.btnStart} onClick={start}>
                        <CamSVG /> Bật camera
                    </button>
                )}
                {camState === "on" && (
                    <>
                        <button style={cs.btnCapture} onClick={capture}>⚬ Chụp ảnh</button>
                        <button style={cs.btnCancel} onClick={stop}>Huỷ</button>
                    </>
                )}
                {camState === "captured" && (
                    <button style={cs.btnRetake} onClick={retake}>🔄 Chụp lại</button>
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

const cs = {
    wrap: { display: "flex", flexDirection: "column", gap: 10, height: "100%" },
    frame: {
        flex: 1,
        minHeight: 300,
        background: "#0f172a",
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
        border: "2px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    video: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    photo: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
    placeholderText: { color: "#475569", fontSize: 14, margin: 0 },
    aimOverlay: { position: "absolute", inset: 0, pointerEvents: "none" },
    corner: { position: "absolute", width: 28, height: 28 },
    cTL: { top: 18, left: 18, borderTop: "3px solid #ef4444", borderLeft: "3px solid #ef4444", borderRadius: "3px 0 0 0" },
    cTR: { top: 18, right: 18, borderTop: "3px solid #ef4444", borderRight: "3px solid #ef4444", borderRadius: "0 3px 0 0" },
    cBL: { bottom: 18, left: 18, borderBottom: "3px solid #ef4444", borderLeft: "3px solid #ef4444", borderRadius: "0 0 0 3px" },
    cBR: { bottom: 18, right: 18, borderBottom: "3px solid #ef4444", borderRight: "3px solid #ef4444", borderRadius: "0 0 3px 0" },
    liveBadge: {
        position: "absolute", top: 12, left: 12,
        background: "rgba(220,38,38,.9)", color: "#fff",
        fontSize: 11, fontWeight: 800, padding: "3px 9px",
        borderRadius: 5, display: "flex", alignItems: "center", gap: 5, letterSpacing: "0.1em",
    },
    liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#fff", flexShrink: 0 },
    capturedBadge: {
        position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
        background: "rgba(22,163,74,.92)", color: "#fff",
        fontSize: 13, fontWeight: 700, padding: "5px 16px",
        borderRadius: 20,
    },
    camErr: { color: "#ef4444", fontSize: 12, textAlign: "center", margin: 0 },
    btnRow: { display: "flex", gap: 8 },
    btnStart: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "11px 0", background: "#1e293b", color: "#f1f5f9",
        border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    btnCapture: {
        flex: 2, padding: "11px 0", background: "#dc2626", color: "#fff",
        border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    btnCancel: {
        flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#374151",
        border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, cursor: "pointer",
    },
    btnRetake: {
        flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#374151",
        border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
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
// Nhận formData + setFormData từ root để KHÔNG mất data khi quay lại
// ============================================================
function StepMemberInfo({ formData, setFormData, savedPhoto, onNext }) {
    const cam = useCamera(savedPhoto);
    const [errors, setErrors] = useState({});

    const set = (k) => (ev) => {
        setFormData((f) => ({ ...f, [k]: ev.target.value }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!formData.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
        if (!/^(0|\+84)\d{9}$/.test(formData.phone.trim())) e.phone = "Số điện thoại không hợp lệ";
        if (!formData.gender) e.gender = "Vui lòng chọn giới tính";
        return e;
    };

    const handleNext = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        onNext({ photo: cam.photo });
    };

    return (
        <div style={g.card}>
            <h2 style={g.cardTitle}>Đăng ký hội viên mới</h2>

            <div style={g.twoCol}>
                {/* LEFT — camera */}
                <div style={g.leftCol}>
                    <p style={g.secLabel}>Ảnh hội viên</p>
                    <CameraPanel cam={cam} />
                </div>

                {/* RIGHT — form */}
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
                                        style={{ marginRight: 6, accentColor: "#dc2626" }}
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
                <button style={g.btnPrimary} onClick={handleNext}>
                    Tiếp theo — Chọn gói tập →
                </button>
            </div>
        </div>
    );
}

// ============================================================
// STEP 2 — GÓI TẬP + THANH TOÁN
// pkgData + setPkgData từ root để giữ lựa chọn khi quay lại
// ============================================================
function StepPackage({ memberForm, memberPhoto, pkgData, setPkgData, onBack, onDone }) {
    const [packages, setPackages] = useState(MOCK_PACKAGES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getPackages().then(setPackages).catch(() => { });
    }, []);

    const setPkg = (pkg) => { setPkgData((d) => ({ ...d, selectedPkg: pkg })); setError(""); };
    const setPayment = (pm) => { setPkgData((d) => ({ ...d, payment: pm })); setError(""); };

    const confirm = async () => {
        if (!pkgData.selectedPkg) { setError("Vui lòng chọn gói tập"); return; }
        if (!pkgData.payment) { setError("Vui lòng chọn phương thức thanh toán"); return; }
        setError("");
        setLoading(true);
        try {
            const result = await api.createMemberWithSubscription({
                member: {
                    fullName: memberForm.fullName,
                    phone: memberForm.phone,
                    gender: memberForm.gender,
                    branchId: CURRENT_BRANCH_ID,
                    internalNotes: memberForm.internalNotes || null,
                    photoBase64: memberPhoto || null,
                },
                subscription: {
                    packageId: pkgData.selectedPkg.packageId,
                    paymentMethod: pkgData.payment,
                },
            });
            onDone(result);
        } catch (err) {
            setError(err?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const selectedPkg = pkgData.selectedPkg;
    const payment = pkgData.payment;

    return (
        <div style={g.card}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #f1f5f9" }}>
                <button style={g.backBtn} onClick={onBack}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {memberPhoto
                        ? <img src={memberPhoto} alt="" style={g.memberAvatar} />
                        : <div style={g.memberAvatarFb}>👤</div>
                    }
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>{memberForm.fullName}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{memberForm.phone}</div>
                    </div>
                </div>
                <h2 style={{ marginLeft: "auto", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Chọn gói tập</h2>
            </div>

            <div style={g.pkgPageLayout}>
                {/* Gói tập */}
                <div style={{ flex: "1 1 0" }}>
                    <p style={g.secLabel}>Gói tập *</p>
                    <div style={g.pkgGrid}>
                        {packages.map((pkg) => {
                            const sel = selectedPkg?.packageId === pkg.packageId;
                            return (
                                <div key={pkg.packageId} style={{ ...g.pkgCard, ...(sel ? g.pkgSel : {}) }} onClick={() => setPkg(pkg)}>
                                    {sel && <span style={g.pkgTick}>✓</span>}
                                    <div style={g.pkgName}>{pkg.name}</div>
                                    <div style={g.pkgPrice}>{fmt(pkg.price)}</div>
                                    <div style={g.pkgDesc}>{pkg.durationDays} ngày · {pkg.description}</div>
                                </div>
                            );
                        })}
                    </div>

                    <p style={{ ...g.secLabel, marginTop: 22 }}>Phương thức thanh toán *</p>
                    <div style={g.pmGrid}>
                        {PAYMENT_METHODS.map((pm) => (
                            <div
                                key={pm.id}
                                style={{ ...g.pmCard, ...(payment === pm.id ? g.pmSel : {}) }}
                                onClick={() => setPayment(pm.id)}
                            >
                                <span style={{ fontSize: 28 }}>{pm.icon}</span>
                                <span style={{ fontSize: 12, marginTop: 5, fontWeight: payment === pm.id ? 700 : 400 }}>{pm.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tóm tắt đơn hàng */}
                <div style={g.orderBox}>
                    <p style={{ ...g.secLabel, marginBottom: 14 }}>Tóm tắt đơn hàng</p>

                    <div style={g.orderMember}>
                        {memberPhoto
                            ? <img src={memberPhoto} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #dc2626" }} />
                            : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                        }
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{memberForm.fullName}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{memberForm.phone}</div>
                        </div>
                    </div>

                    <div style={g.divider} />

                    {[
                        ["Chi nhánh", CURRENT_BRANCH_NAME],
                        ["Gói tập", selectedPkg ? selectedPkg.name : <span style={{ color: "#94a3b8" }}>Chưa chọn</span>],
                        ["Thời hạn", selectedPkg ? `${selectedPkg.durationDays} ngày` : "—"],
                        ["Thanh toán", payment ? PAYMENT_METHODS.find((p) => p.id === payment)?.label : <span style={{ color: "#94a3b8" }}>Chưa chọn</span>],
                    ].map(([k, v]) => (
                        <div key={k} style={g.orderRow}>
                            <span style={{ color: "#64748b", fontSize: 13 }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                        </div>
                    ))}

                    <div style={g.divider} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Tổng tiền</span>
                        <span style={{ fontWeight: 800, fontSize: 22, color: "#dc2626" }}>
                            {selectedPkg ? fmt(selectedPkg.price) : "—"}
                        </span>
                    </div>

                    {error && <div style={g.errBox}>{error}</div>}

                    <button
                        style={{ ...g.btnPrimary, marginTop: 18, opacity: loading ? 0.7 : 1 }}
                        onClick={confirm}
                        disabled={loading}
                    >
                        {loading ? "Đang xử lý…" : "✓ Hoàn tất — Tạo hội viên"}
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
    return (
        <div style={{ ...g.card, textAlign: "center", padding: "64px 40px" }}>
            <div style={{ fontSize: 72 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 10px", color: "#0f172a" }}>
                Tạo hội viên thành công!
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>
                Hội viên <strong>{result?.member?.fullName || "mới"}</strong> đã được đăng ký và kích hoạt gói tập.
            </p>
            {result?.member?.memberId && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 28px", display: "inline-block", marginBottom: 28, color: "#15803d", fontWeight: 700, fontSize: 15 }}>
                    Mã hội viên: #{result.member.memberId}
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
                        <div style={{ ...g.dot, background: i <= step ? "#dc2626" : "#e2e8f0", color: i <= step ? "#fff" : "#94a3b8" }}>
                            {i < step ? "✓" : i + 1}
                        </div>
                        <span style={{ fontSize: 13, color: i <= step ? "#0f172a" : "#94a3b8", fontWeight: i === step ? 700 : 400 }}>
                            {label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{ flex: 1, height: 2, margin: "0 12px", background: i < step ? "#dc2626" : "#e2e8f0", borderRadius: 2 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ============================================================
// ROOT — state được giữ ở đây để không mất khi đi lại giữa step
// ============================================================
export default function GymMemberRegistration() {
    const [step, setStep] = useState(0);

    // Step 1 data — persist khi quay lại
    const [memberForm, setMemberForm] = useState({
        fullName: "", phone: "", gender: "", internalNotes: "",
    });
    const [memberPhoto, setMemberPhoto] = useState(null);

    // Step 2 data — persist khi quay lại
    const [pkgData, setPkgData] = useState({ selectedPkg: null, payment: "" });

    const [result, setResult] = useState(null);

    const reset = () => {
        setStep(0);
        setMemberForm({ fullName: "", phone: "", gender: "", internalNotes: "" });
        setMemberPhoto(null);
        setPkgData({ selectedPkg: null, payment: "" });
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
    root: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',sans-serif" },
    header: {
        background: "#0f172a", color: "#fff",
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
        boxShadow: "0 1px 3px rgba(0,0,0,.07)",
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
        boxShadow: "0 1px 4px rgba(0,0,0,.07), 0 8px 24px rgba(0,0,0,.06)",
    },
    cardTitle: {
        fontSize: 22, fontWeight: 800, color: "#0f172a",
        marginBottom: 28, paddingBottom: 18,
        borderBottom: "1px solid #f1f5f9",
    },

    /* Step 1 layout */
    twoCol: {
        display: "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap: 36,
        marginBottom: 28,
        alignItems: "start",
    },
    leftCol: {},
    rightCol: {},

    secLabel: {
        fontSize: 11, fontWeight: 700, color: "#64748b",
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 12, marginTop: 0,
    },
    fieldLabel: {
        display: "block", fontSize: 13, fontWeight: 600,
        color: "#374151", marginBottom: 6,
    },
    input: {
        width: "100%", padding: "10px 14px",
        border: "1.5px solid #e2e8f0", borderRadius: 10,
        fontSize: 14, outline: "none", boxSizing: "border-box",
        background: "#f8fafc", transition: "border .15s",
        fontFamily: "inherit",
    },
    inputErr: { borderColor: "#dc2626", background: "#fff5f5" },
    radioLabel: { display: "flex", alignItems: "center", fontSize: 14, cursor: "pointer", color: "#374151" },
    branchBadge: {
        display: "flex", alignItems: "center", gap: 8,
        background: "#eff6ff", border: "1px solid #bfdbfe",
        borderRadius: 10, padding: "10px 14px", marginTop: 4,
    },
    footer: {},

    /* Step 2 layout */
    pkgPageLayout: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 28,
        alignItems: "start",
    },

    pkgGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    pkgCard: {
        border: "2px solid #e2e8f0", borderRadius: 12,
        padding: "16px 14px", cursor: "pointer",
        position: "relative", background: "#f8fafc",
        transition: "border .15s, box-shadow .15s",
    },
    pkgSel: {
        border: "2px solid #dc2626", background: "#fff5f5",
        boxShadow: "0 0 0 3px rgba(220,38,38,.09)",
    },
    pkgTick: { position: "absolute", top: 10, right: 12, color: "#dc2626", fontWeight: 900, fontSize: 15 },
    pkgName: { fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 },
    pkgPrice: { fontWeight: 800, fontSize: 20, color: "#dc2626", marginBottom: 4 },
    pkgDesc: { fontSize: 12, color: "#64748b" },

    pmGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
    pmCard: {
        border: "2px solid #e2e8f0", borderRadius: 12, padding: "14px 8px",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", background: "#f8fafc", transition: "border .15s",
    },
    pmSel: { border: "2px solid #dc2626", background: "#fff5f5" },

    /* Order summary box */
    orderBox: {
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 14, padding: "22px 20px",
        position: "sticky", top: 20,
    },
    orderMember: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
    divider: { height: 1, background: "#e2e8f0", margin: "12px 0" },
    orderRow: {
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 8,
    },

    memberAvatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #dc2626" },
    memberAvatarFb: { width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },

    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        background: "#f1f5f9", border: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        color: "#374151",
    },

    btnPrimary: {
        display: "block", width: "100%", padding: "14px",
        background: "#dc2626", color: "#fff",
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
