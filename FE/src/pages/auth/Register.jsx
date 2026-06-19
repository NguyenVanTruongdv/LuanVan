import { useEffect, useRef, useState } from "react";
import authApi from "../../api/authApi";

/* ─── Design tokens ─── */
const C = {
    bg: "#0c1520",
    card: "#13202f",
    panel: "#111e2d",
    surface: "#162030",
    surfaceFocus: "#1e2e42",
    border: "rgba(255,255,255,0.08)",
    borderFocus: "#00c2cb",
    accent: "#00c2cb",
    accentDark: "#007b9e",
    text: "#e0eaf2",
    muted: "#5a7a94",
    subtle: "#3d5a72",
    dim: "#2d4459",
    error: "#f05050",
};

/* ─── Responsive helpers ─── */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 480);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);
    return isMobile;
}

/* ─── Styles (mobile-first, dynamic) ─── */
function getStyles(isMobile) {
    return {
        page: {
            minHeight: "100vh",
            background: C.bg,
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "center",
            padding: isMobile ? "16px 12px 32px" : "24px 16px",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        },
        card: {
            background: C.card,
            borderRadius: isMobile ? "16px" : "20px",
            padding: isMobile ? "24px 20px" : "40px 36px",
            width: "100%",
            maxWidth: isMobile ? "100%" : "440px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            border: `1px solid ${C.border}`,
        },
        badge: {
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(0,194,203,0.1)",
            color: C.accent,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.8px",
            padding: "5px 12px",
            borderRadius: "20px",
            marginBottom: "16px",
            border: `1px solid rgba(0,194,203,0.2)`,
        },
        badgeDot: {
            width: "6px",
            height: "6px",
            background: C.accent,
            borderRadius: "50%",
            display: "inline-block",
        },
        heading: {
            fontSize: isMobile ? "22px" : "26px",
            fontWeight: "800",
            color: C.text,
            margin: "0 0 6px",
            lineHeight: 1.2,
            letterSpacing: "-0.3px",
        },
        subheading: {
            fontSize: isMobile ? "13px" : "14px",
            color: C.muted,
            margin: "0 0 22px",
            lineHeight: 1.5,
        },
        fieldGroup: { marginBottom: isMobile ? "14px" : "16px" },
        label: {
            display: "block",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.8px",
            color: C.subtle,
            marginBottom: "6px",
        },
        inputWrap: { position: "relative", display: "flex", alignItems: "center" },
        inputIcon: {
            position: "absolute",
            left: "13px",
            color: C.subtle,
            fontSize: "15px",
            pointerEvents: "none",
            lineHeight: 1,
        },
        input: {
            width: "100%",
            padding: isMobile ? "12px 12px 12px 38px" : "13px 14px 13px 40px",
            border: `1.5px solid ${C.border}`,
            borderRadius: "12px",
            fontSize: isMobile ? "15px" : "14px",
            color: C.text,
            background: C.surface,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color .2s, box-shadow .2s, background .2s",
            fontFamily: "inherit",
            WebkitAppearance: "none",
        },
        inputFocus: {
            borderColor: C.borderFocus,
            boxShadow: "0 0 0 3px rgba(0,194,203,0.15)",
            background: C.surfaceFocus,
        },
        inputError: {
            borderColor: C.error,
            background: "rgba(240,80,80,0.05)",
        },
        eyeBtn: {
            position: "absolute",
            right: "12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.muted,
            fontSize: "16px",
            padding: "4px",
            lineHeight: 1,
            minWidth: "32px",
            minHeight: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        errorMsg: {
            fontSize: "12px",
            color: C.error,
            marginTop: "5px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
        },
        genderRow: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: isMobile ? "6px" : "8px",
        },
        genderBtn: (active) => ({
            padding: isMobile ? "9px 4px" : "10px",
            border: `1.5px solid ${active ? C.accent : C.border}`,
            borderRadius: "10px",
            background: active ? "rgba(0,194,203,0.12)" : C.surface,
            color: active ? C.accent : C.muted,
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: active ? "700" : "500",
            cursor: "pointer",
            transition: "all .18s",
            textAlign: "center",
            fontFamily: "inherit",
            WebkitAppearance: "none",
        }),
        btnPrimary: {
            width: "100%",
            padding: isMobile ? "14px" : "15px",
            background: C.accent,
            color: C.bg,
            border: "none",
            borderRadius: "12px",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: "800",
            letterSpacing: "0.5px",
            cursor: "pointer",
            marginTop: "8px",
            transition: "all .2s",
            boxShadow: "0 6px 20px rgba(0,194,203,0.35)",
            fontFamily: "inherit",
            WebkitAppearance: "none",
            touchAction: "manipulation",
        },
        btnSecondary: (isMobile) => ({
            flex: 1,
            padding: isMobile ? "14px" : "15px",
            border: `1.5px solid ${C.border}`,
            borderRadius: "12px",
            background: "none",
            color: C.muted,
            fontSize: isMobile ? "13px" : "14px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all .18s",
            touchAction: "manipulation",
            WebkitAppearance: "none",
        }),
        footer: {
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: C.subtle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
        },
        loginLink: {
            border: `1.5px solid ${C.border}`,
            borderRadius: "10px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: "700",
            color: C.muted,
            background: "none",
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-block",
            fontFamily: "inherit",
            transition: "all .18s",
        },
        copyright: {
            textAlign: "center",
            marginTop: "24px",
            fontSize: "12px",
            color: C.dim,
        },

        /* OTP */
        otpDesc: {
            fontSize: isMobile ? "13px" : "14px",
            color: C.muted,
            margin: "0 0 20px",
            lineHeight: 1.6,
        },
        otpPhone: { color: C.accent, fontWeight: "700" },
        otpGrid: {
            display: "flex",
            gap: isMobile ? "7px" : "10px",
            justifyContent: "center",
            margin: "0 0 8px",
        },
        otpCell: (active, filled) => ({
            width: isMobile ? "44px" : "52px",
            height: isMobile ? "54px" : "60px",
            border: `2px solid ${active ? C.accent : filled ? "rgba(0,194,203,0.4)" : C.border}`,
            borderRadius: "14px",
            fontSize: isMobile ? "20px" : "24px",
            fontWeight: "700",
            color: C.text,
            textAlign: "center",
            background: active ? C.surfaceFocus : filled ? "rgba(0,194,203,0.08)" : C.surface,
            outline: "none",
            boxSizing: "border-box",
            caretColor: C.accent,
            transition: "border-color .18s, background .18s",
            boxShadow: active ? "0 0 0 3px rgba(0,194,203,0.15)" : "none",
            fontFamily: "inherit",
            WebkitAppearance: "none",
        }),
        resendRow: {
            textAlign: "center",
            marginTop: "12px",
            fontSize: "13px",
            color: C.muted,
        },
        resendBtn: (enabled) => ({
            background: "none",
            border: "none",
            color: enabled ? C.accent : C.dim,
            fontWeight: "700",
            cursor: enabled ? "pointer" : "not-allowed",
            fontSize: "13px",
            padding: 0,
            fontFamily: "inherit",
        }),
        backBtn: {
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 0 16px",
            fontWeight: "600",
            fontFamily: "inherit",
        },
        successBox: { textAlign: "center", padding: "20px 0 8px" },
        successIcon: {
            width: "72px",
            height: "72px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "32px",
            color: C.bg,
            fontWeight: 900,
            boxShadow: "0 8px 28px rgba(0,194,203,0.35)",
        },
    };
}

/* ─── helpers ─── */
const GENDERS = [
    { value: "Male", label: "Nam 👨" },
    { value: "Female", label: "Nữ 👩" },
    { value: "Other", label: "Khác 🧑" },
];

function useInputFocus() {
    const [focused, setFocused] = useState(null);
    return {
        isFocused: (name) => focused === name,
        bind: (name) => ({
            onFocus: () => setFocused(name),
            onBlur: () => setFocused(null),
        }),
    };
}

/* ─── Logo ─── */
function Logo() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div style={{
                width: "44px", height: "44px",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                borderRadius: "13px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 18px rgba(0,194,203,0.3)", flexShrink: 0,
            }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="13" width="6" height="6" rx="1.5" fill="white" />
                    <rect x="13" y="2" width="6" height="28" rx="2" fill="white" />
                    <rect x="24" y="13" width="6" height="6" rx="1.5" fill="white" />
                    <rect x="2" y="15" width="28" height="2" fill="rgba(255,255,255,0.4)" />
                </svg>
            </div>
            <span style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "2px", color: "#e0eaf2" }}>
                VT<span style={{ color: C.accent }}>GYM</span>
            </span>
        </div>
    );
}

/* ─── OTP Step ─── */
function OTPStep({ phone, fullName, password, gender, onBack, onSuccess }) {
    const OTP_LEN = 6;
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);

    const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
    const [activeIdx, setActiveIdx] = useState(0);
    const [countdown, setCountdown] = useState(60);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const refs = useRef([]);

    useEffect(() => { refs.current[0]?.focus(); }, []);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleKey = (e, idx) => {
        if (e.key === "Backspace") {
            if (otp[idx]) {
                const next = [...otp]; next[idx] = ""; setOtp(next);
            } else if (idx > 0) {
                refs.current[idx - 1]?.focus(); setActiveIdx(idx - 1);
            }
            return;
        }
        if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
        if (e.key === "ArrowRight" && idx < OTP_LEN - 1) refs.current[idx + 1]?.focus();
    };

    const handleChange = (e, idx) => {
        const val = e.target.value.replace(/\D/g, "").slice(-1);
        if (!val) return;
        const next = [...otp]; next[idx] = val; setOtp(next);
        if (idx < OTP_LEN - 1) { refs.current[idx + 1]?.focus(); setActiveIdx(idx + 1); }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
        const next = Array(OTP_LEN).fill("");
        pasted.split("").forEach((c, i) => (next[i] = c));
        setOtp(next);
        const lastFilled = Math.min(pasted.length, OTP_LEN - 1);
        refs.current[lastFilled]?.focus(); setActiveIdx(lastFilled);
    };

    const handleVerify = async () => {
        const code = otp.join("");
        if (code.length < OTP_LEN) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
        setError(""); setLoading(true);
        try {
            await authApi.verifyRegisterOtp({
                phone,
                otp: code,
                fullName,
                password,
                gender,
            });
            onSuccess();
        } catch (err) {
            setError(err.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
        } finally { setLoading(false); }
    };

    // OTPStep — handleResend()
    const handleResend = async () => {
        setOtp(Array(OTP_LEN).fill(""));
        setError("");
        refs.current[0]?.focus();
        setActiveIdx(0);
        setCountdown(60);
        // Thêm dòng này:
        await authApi.sendOtp({ phone });
    };

    return (
        <>
            <button style={S.backBtn} onClick={onBack}>← Quay lại</button>
            <div style={S.badge}><span style={S.badgeDot} /> XÁC THỰC OTP</div>
            <h2 style={S.heading}>Xác minh số điện thoại 📲</h2>
            <p style={S.otpDesc}>
                Chúng tôi đã gửi mã gồm 6 chữ số đến{" "}
                <span style={S.otpPhone}>{phone}</span>. Mã có hiệu lực trong 5 phút.
            </p>
            <div style={S.otpGrid}>
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => (refs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        style={S.otpCell(activeIdx === i, !!digit)}
                        onFocus={() => setActiveIdx(i)}
                        onChange={(e) => handleChange(e, i)}
                        onKeyDown={(e) => handleKey(e, i)}
                        onPaste={handlePaste}
                    />
                ))}
            </div>
            {error && (
                <div style={{ ...S.errorMsg, justifyContent: "center", marginBottom: "8px" }}>
                    ⚠ {error}
                </div>
            )}
            <div style={S.resendRow}>
                {countdown > 0 ? (
                    <>Gửi lại mã sau <strong style={{ color: C.accent }}>{countdown}s</strong></>
                ) : (
                    <>Chưa nhận được mã? <button style={S.resendBtn(true)} onClick={handleResend}>Gửi lại</button></>
                )}
            </div>
            <button
                style={{ ...S.btnPrimary, marginTop: "20px", opacity: loading ? 0.75 : 1 }}
                onClick={handleVerify}
                disabled={loading}
            >
                {loading ? "Đang xác thực…" : "XÁC NHẬN"}
            </button>
        </>
    );
}

/* ─── Confirm Step ─── */
function ConfirmStep({ formData, onConfirm, onBack }) {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ConfirmStep — handleConfirm()
    const handleConfirm = async () => {
        setError(""); setLoading(true);
        try {
            // Chỉ gửi OTP, không tạo account
            await authApi.sendOtp({ phone: formData.phone });
            onConfirm(); // chuyển sang OTPStep
        } catch (err) {
            setError(err.message || "Có lỗi xảy ra, thử lại sau.");
        } finally { setLoading(false); }
    };

    const infoRows = [
        { icon: "👤", label: "HỌ VÀ TÊN", value: formData.fullName, highlight: false },
        { icon: "📞", label: "SỐ ĐIỆN THOẠI", value: formData.phone, highlight: true },
        { icon: "🧑", label: "GIỚI TÍNH", value: GENDERS.find((g) => g.value === formData.gender)?.label, highlight: false },
    ];

    return (
        <>
            <button style={S.backBtn} onClick={onBack}>← Quay lại</button>
            <div style={S.badge}><span style={S.badgeDot} /> XÁC NHẬN THÔNG TIN</div>
            <h2 style={S.heading}>Kiểm tra lại thông tin 📋</h2>
            <p style={{ ...S.subheading, marginBottom: "20px" }}>
                Vui lòng xác nhận trước khi nhận mã OTP.
            </p>

            {/* Info card */}
            <div style={{
                background: C.surface,
                border: `1.5px solid ${C.border}`,
                borderRadius: "14px",
                padding: "6px 16px",
                marginBottom: "16px",
            }}>
                {infoRows.map(({ icon, label, value, highlight }, idx) => (
                    <div key={label} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "13px 0",
                        borderBottom: idx < infoRows.length - 1 ? `1px solid ${C.border}` : "none",
                    }}>
                        <span style={{
                            width: "36px", height: "36px", flexShrink: 0,
                            background: highlight ? "rgba(0,194,203,0.12)" : "rgba(255,255,255,0.04)",
                            borderRadius: "10px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "17px",
                            border: `1px solid ${highlight ? "rgba(0,194,203,0.25)" : C.border}`,
                        }}>
                            {icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: "10px", fontWeight: "700",
                                letterSpacing: "0.7px", color: C.subtle, marginBottom: "2px",
                            }}>
                                {label}
                            </div>
                            <div style={{
                                fontSize: isMobile ? "14px" : "15px",
                                fontWeight: highlight ? "800" : "600",
                                color: highlight ? C.accent : C.text,
                                letterSpacing: highlight ? "0.5px" : "normal",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}>
                                {value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* OTP notice banner */}
            <div style={{
                background: "rgba(0,194,203,0.07)",
                border: `1.5px solid rgba(0,194,203,0.2)`,
                borderRadius: "12px",
                padding: "13px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
            }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>📲</span>
                <div>
                    <div style={{ fontSize: "12px", color: C.muted, marginBottom: "3px" }}>
                        Mã OTP sẽ được gửi đến SĐT
                    </div>
                    <div style={{
                        fontSize: isMobile ? "16px" : "17px",
                        fontWeight: "800",
                        color: C.accent,
                        letterSpacing: "1.5px",
                    }}>
                        {formData.phone}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    ...S.errorMsg, marginBottom: "16px",
                    padding: "10px 14px",
                    background: "rgba(240,80,80,0.1)",
                    borderRadius: "10px",
                }}>
                    ⚠ {error}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                    style={S.btnSecondary(isMobile)}
                    onClick={onBack}
                    disabled={loading}
                >
                    ← Quay lại
                </button>
                <button
                    style={{
                        flex: 2,
                        padding: isMobile ? "14px" : "15px",
                        background: C.accent,
                        color: C.bg,
                        border: "none",
                        borderRadius: "12px",
                        fontSize: isMobile ? "13px" : "14px",
                        fontWeight: "800",
                        letterSpacing: "0.4px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all .2s",
                        boxShadow: "0 6px 20px rgba(0,194,203,0.35)",
                        fontFamily: "inherit",
                        WebkitAppearance: "none",
                        touchAction: "manipulation",
                        opacity: loading ? 0.75 : 1,
                    }}
                    onClick={handleConfirm}
                    disabled={loading}
                >
                    {loading ? "Đang xử lý…" : "XÁC NHẬN & GỬI OTP →"}
                </button>
            </div>
        </>
    );
}

/* ─── Success Step ─── */
function SuccessStep({ isMobile }) {
    const S = getStyles(isMobile);
    return (
        <div style={S.successBox}>
            <div style={S.successIcon}>✓</div>
            <h2 style={{ ...S.heading, marginBottom: "10px" }}>Đăng ký thành công! 🎉</h2>
            <p style={{ ...S.subheading, marginBottom: "28px" }}>
                Chào mừng bạn đến với VTGYM. Hành trình của bạn bắt đầu từ đây.
            </p>
            <button
                style={S.btnPrimary}
                onClick={() => (window.location.href = "/member/login")}
            >
                ĐĂNG NHẬP NGAY
            </button>
        </div>
    );
}

/* ─── Register Step ─── */
function RegisterStep({ onSendOTP, initialData }) {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);

    const [formData, setFormData] = useState(
        initialData || {
            fullName: "", phone: "", password: "", confirmPassword: "", gender: "Male",
        }
    );
    const [errors, setErrors] = useState({});
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { isFocused, bind } = useInputFocus();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const validate = () => {
        const errs = {};
        if (!formData.fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên.";
        if (!formData.phone.trim()) errs.phone = "Vui lòng nhập số điện thoại.";
        else if (!/^0\d{9}$/.test(formData.phone)) errs.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";
        if (!formData.password) errs.password = "Vui lòng nhập mật khẩu.";
        else if (formData.password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự.";
        if (formData.confirmPassword !== formData.password) errs.confirmPassword = "Mật khẩu xác nhận không khớp.";
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        // Không gọi API ở đây — chuyển sang bước Confirm
        onSendOTP({ ...formData });
    };

    const field = (name, label, icon, type = "text", extra = {}) => {
        const isPass = type === "password";
        const showState = name === "password" ? showPass : showConfirm;
        const setShow = name === "password" ? setShowPass : setShowConfirm;
        return (
            <div style={S.fieldGroup}>
                <label style={S.label}>{label}</label>
                <div style={S.inputWrap}>
                    <span style={S.inputIcon}>{icon}</span>
                    <input
                        type={isPass ? (showState ? "text" : "password") : type}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        style={{
                            ...S.input,
                            ...(isFocused(name) ? S.inputFocus : {}),
                            ...(errors[name] ? S.inputError : {}),
                            ...(isPass ? { paddingRight: "44px" } : {}),
                        }}
                        {...bind(name)}
                        {...extra}
                    />
                    {isPass && (
                        <button
                            type="button"
                            style={S.eyeBtn}
                            onClick={() => setShow(!showState)}
                            tabIndex={-1}
                        >
                            {showState ? "🙈" : "👁"}
                        </button>
                    )}
                </div>
                {errors[name] && <div style={S.errorMsg}>⚠ {errors[name]}</div>}
            </div>
        );
    };

    return (
        <>
            <div style={S.badge}><span style={S.badgeDot} /> CỔNG THÀNH VIÊN</div>
            <h2 style={S.heading}>Tạo tài khoản mới ✨</h2>
            <p style={S.subheading}>Điền thông tin để bắt đầu hành trình cùng VTGYM</p>

            <form onSubmit={handleSubmit} noValidate>
                {field("fullName", "HỌ VÀ TÊN", "👤", "text", { placeholder: "Nguyễn Văn A" })}
                {field("phone", "SỐ ĐIỆN THOẠI", "📞", "tel", { placeholder: "0901 234 567" })}
                {field("password", "MẬT KHẨU", "🔒", "password", { placeholder: "Tối thiểu 6 ký tự" })}
                {field("confirmPassword", "XÁC NHẬN MẬT KHẨU", "🔒", "password", { placeholder: "Nhập lại mật khẩu" })}

                <div style={S.fieldGroup}>
                    <label style={S.label}>GIỚI TÍNH</label>
                    <div style={S.genderRow}>
                        {GENDERS.map((g) => (
                            <button
                                key={g.value}
                                type="button"
                                style={S.genderBtn(formData.gender === g.value)}
                                onClick={() => setFormData({ ...formData, gender: g.value })}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" style={S.btnPrimary}>
                    ĐĂNG KÝ
                </button>
            </form>

            <div style={S.footer}>
                <span>Đã có tài khoản?</span>
                <span style={{ color: C.dim }}>·</span>
                <a href="/member/login" style={S.loginLink}>Đăng nhập</a>
            </div>
        </>
    );
}

/* ─── Main ─── */
function Register() {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);

    const [step, setStep] = useState("register");   // "register" | "confirm" | "otp" | "success"
    const [formData, setFormData] = useState(null);

    const handleGoConfirm = (data) => { setFormData(data); setStep("confirm"); };
    const handleConfirmed = () => setStep("otp");
    const handleBackToRegister = () => setStep("register");
    const handleBackToConfirm = () => setStep("confirm");
    const handleSuccess = () => setStep("success");

    return (
        <div style={S.page}>
            <div style={S.card}>
                <Logo />

                {step === "register" && (
                    <RegisterStep onSendOTP={handleGoConfirm} initialData={formData} />
                )}
                {step === "confirm" && (
                    <ConfirmStep
                        formData={formData}
                        onConfirm={handleConfirmed}
                        onBack={handleBackToRegister}
                    />
                )}
                {step === "otp" && (
                    <OTPStep
                        phone={formData.phone}
                        fullName={formData.fullName}
                        password={formData.password}
                        gender={formData.gender}
                        onBack={handleBackToConfirm}
                        onSuccess={handleSuccess}
                    />
                )}
                {step === "success" && <SuccessStep isMobile={isMobile} />}

                <div style={S.copyright}>© 2026 VTGYM. All rights reserved.</div>
            </div>

            <style>{`
            * { box-sizing: border-box; }
            input::placeholder { color: #3d5a72; }
            input:focus { outline: none; }
            button:active { transform: scale(0.98); }
            button, a { touch-action: manipulation; }
            @media (max-height: 700px) {
            body { overflow-y: auto; }
            }
        `}</style>
        </div>
    );
}

export default Register;
