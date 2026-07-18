import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authApi from "../../api/authApi";
import memberApi from "../../api/memberApi";

/* ─── Design tokens (đồng bộ tông cam-đỏ / nền tối như trang Đăng nhập) ─── */
const C = {
    bg: "#0a0a0c",
    card: "#161616",
    panel: "#111113",
    surface: "#eef2fa",       // nền input sáng
    surfaceFocus: "#ffffff",
    border: "rgba(255,255,255,0.08)",
    borderFocus: "#ff5a2e",
    accent: "#ff5a2e",
    accentDark: "#e6390f",
    text: "#ffffff",
    textInput: "#16202e",     // chữ trong input sáng
    muted: "#8a94a6",
    subtle: "#6b7688",
    dim: "#3a3f47",
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

function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (e) => {
            if (!ref.current || ref.current.contains(e.target)) return;
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
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
            boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            border: `1px solid ${C.border}`,
        },
        badge: {
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255,90,46,0.12)",
            color: C.accent,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.8px",
            padding: "5px 12px",
            borderRadius: "20px",
            marginBottom: "16px",
            border: `1px solid rgba(255,90,46,0.25)`,
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
            color: "#7c8798",
            fontSize: "15px",
            pointerEvents: "none",
            lineHeight: 1,
        },
        input: {
            width: "100%",
            padding: isMobile ? "12px 12px 12px 38px" : "13px 14px 13px 40px",
            border: `1.5px solid transparent`,
            borderRadius: "12px",
            fontSize: isMobile ? "15px" : "14px",
            color: C.textInput,
            background: C.surface,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color .2s, box-shadow .2s, background .2s",
            fontFamily: "inherit",
            WebkitAppearance: "none",
        },
        inputFocus: {
            borderColor: C.borderFocus,
            boxShadow: "0 0 0 3px rgba(255,90,46,0.18)",
            background: C.surfaceFocus,
        },
        inputError: {
            borderColor: C.error,
            background: "#fdeceb",
        },
        eyeBtn: {
            position: "absolute",
            right: "12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#7c8798",
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
            color: "#ff8a7a",
            marginTop: "5px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
        },
        helperLink: {
            fontSize: "12px",
            color: C.accent,
            marginTop: "6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            textDecoration: "none",
            fontWeight: "700",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "inherit",
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
            background: active ? "rgba(255,90,46,0.14)" : "rgba(255,255,255,0.03)",
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
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: "800",
            letterSpacing: "0.5px",
            cursor: "pointer",
            marginTop: "8px",
            transition: "all .2s",
            boxShadow: "0 10px 28px rgba(255,90,46,0.35)",
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
            border: `2px solid ${active ? C.accent : filled ? "rgba(255,90,46,0.45)" : "transparent"}`,
            borderRadius: "14px",
            fontSize: isMobile ? "20px" : "24px",
            fontWeight: "700",
            color: C.textInput,
            textAlign: "center",
            background: active ? "#ffffff" : filled ? "#fff1ec" : C.surface,
            outline: "none",
            boxSizing: "border-box",
            caretColor: C.accent,
            transition: "border-color .18s, background .18s",
            boxShadow: active ? "0 0 0 3px rgba(255,90,46,0.18)" : "none",
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
            color: "#ffffff",
            fontWeight: 900,
            boxShadow: "0 10px 30px rgba(255,90,46,0.35)",
        },

        /* Branch picker (custom select) */
        branchTrigger: (open, hasError) => ({
            width: "100%",
            padding: isMobile ? "12px 14px" : "13px 16px",
            border: `1.5px solid ${open ? C.borderFocus : hasError ? C.error : "transparent"}`,
            borderRadius: "12px",
            fontSize: isMobile ? "15px" : "14px",
            color: C.textInput,
            background: open ? "#ffffff" : C.surface,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            boxShadow: open ? "0 0 0 3px rgba(255,90,46,0.18)" : "none",
            transition: "border-color .2s, box-shadow .2s, background .2s",
        }),
        branchDropdown: {
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            border: "1px solid rgba(0,0,0,0.06)",
            zIndex: 30,
            overflow: "hidden",
        },
        branchList: {
            maxHeight: "236px",
            overflowY: "auto",
            padding: "6px",
        },
        branchItem: (active) => ({
            padding: "10px 12px",
            borderRadius: "10px",
            cursor: "pointer",
            background: active ? "rgba(255,90,46,0.10)" : "transparent",
            transition: "background .12s",
        }),
        branchItemName: (active) => ({
            fontSize: "14px",
            fontWeight: active ? "800" : "600",
            color: active ? C.accentDark : C.textInput,
            marginBottom: "2px",
        }),
        branchItemAddr: {
            fontSize: "11.5px",
            color: "#8892a0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
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

/* ─── Chuẩn hoá dữ liệu chi nhánh từ API ─── */
function mapBranch(b) {
    return {
        id: String(b.branchId),
        name: b.branchName,
        address: b.address,
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
                boxShadow: "0 8px 22px rgba(255,90,46,0.35)", flexShrink: 0,
            }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="13" width="6" height="6" rx="1.5" fill="white" />
                    <rect x="13" y="2" width="6" height="28" rx="2" fill="white" />
                    <rect x="24" y="13" width="6" height="6" rx="1.5" fill="white" />
                    <rect x="2" y="15" width="28" height="2" fill="rgba(255,255,255,0.4)" />
                </svg>
            </div>
            <span style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "2px", color: "#ffffff" }}>
                VT<span style={{ color: C.accent }}>GYM</span>
            </span>
        </div>
    );
}

/* ─── Branch select (custom, đẹp hơn <select> mặc định) ─── */
function BranchSelect({ value, branches, loading, error, onChange, isFocused, onOpenChange, hasError }) {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useOnClickOutside(wrapRef, () => setOpen(false));

    const selected = branches.find((b) => b.id === value);

    const toggle = () => {
        if (loading) return;
        setOpen((o) => !o);
        onOpenChange && onOpenChange(!open);
    };

    return (
        <div style={{ position: "relative" }} ref={wrapRef}>
            <div style={S.inputWrap}>
                <span style={S.inputIcon}>📍</span>
                <div
                    style={{
                        ...S.branchTrigger(open || isFocused, hasError),
                        paddingLeft: "38px",
                        opacity: loading ? 0.7 : 1,
                    }}
                    onClick={toggle}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
                >
                    <span style={{
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: selected ? C.textInput : "#8892a0", fontWeight: selected ? 600 : 400,
                    }}>
                        {loading
                            ? "Đang tải chi nhánh…"
                            : selected
                                ? selected.name
                                : "— Chọn chi nhánh gần bạn —"}
                    </span>
                    <span style={{
                        color: "#8892a0", fontSize: "11px", flexShrink: 0,
                        transform: open ? "rotate(180deg)" : "none", transition: "transform .18s",
                    }}>▾</span>
                </div>
            </div>

            {open && !loading && (
                <div style={S.branchDropdown}>
                    {error && (
                        <div style={{ padding: "12px 14px", fontSize: "12.5px", color: C.error }}>
                            {error}
                        </div>
                    )}
                    {!error && branches.length === 0 && (
                        <div style={{ padding: "12px 14px", fontSize: "12.5px", color: "#8892a0" }}>
                            Không có chi nhánh nào.
                        </div>
                    )}
                    {!error && branches.length > 0 && (
                        <div style={S.branchList}>
                            {branches.map((b) => {
                                const active = b.id === value;
                                return (
                                    <div
                                        key={b.id}
                                        style={S.branchItem(active)}
                                        onClick={() => { onChange(b.id); setOpen(false); }}
                                    >
                                        <div style={S.branchItemName(active)}>
                                            {active ? "✓ " : ""}{b.name}
                                        </div>
                                        {b.address && <div style={S.branchItemAddr}>{b.address}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── OTP Step ─── */
function OTPStep({ phone, fullName, password, gender, branchId, onBack, onSuccess }) {
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
                branchId,
            });
            onSuccess();
        } catch (err) {
            setError(err.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        setOtp(Array(OTP_LEN).fill(""));
        setError("");
        refs.current[0]?.focus();
        setActiveIdx(0);
        setCountdown(60);
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
function ConfirmStep({ formData, branches, onConfirm, onBack }) {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleConfirm = async () => {
        setError(""); setLoading(true);
        try {
            await authApi.sendOtp({ phone: formData.phone });
            onConfirm();
        } catch (err) {
            setError(err.message || "Có lỗi xảy ra, thử lại sau.");
        } finally { setLoading(false); }
    };

    const branchName = branches.find((b) => b.id === formData.branchId)?.name || "—";

    const infoRows = [
        { icon: "👤", label: "HỌ VÀ TÊN", value: formData.fullName, highlight: false },
        { icon: "📞", label: "SỐ ĐIỆN THOẠI", value: formData.phone, highlight: true },
        { icon: "🧑", label: "GIỚI TÍNH", value: GENDERS.find((g) => g.value === formData.gender)?.label, highlight: false },
        { icon: "🏋️", label: "CHI NHÁNH", value: branchName, highlight: false },
    ];

    return (
        <>
            <button style={S.backBtn} onClick={onBack}>← Quay lại</button>
            <div style={S.badge}><span style={S.badgeDot} /> XÁC NHẬN THÔNG TIN</div>
            <h2 style={S.heading}>Kiểm tra lại thông tin 📋</h2>
            <p style={{ ...S.subheading, marginBottom: "20px" }}>
                Vui lòng xác nhận trước khi nhận mã OTP.
            </p>

            <div style={{
                background: "rgba(255,255,255,0.03)",
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
                            background: highlight ? "rgba(255,90,46,0.14)" : "rgba(255,255,255,0.05)",
                            borderRadius: "10px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "17px",
                            border: `1px solid ${highlight ? "rgba(255,90,46,0.3)" : C.border}`,
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

            <div style={{
                background: "rgba(255,90,46,0.08)",
                border: `1.5px solid rgba(255,90,46,0.25)`,
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
                    background: "rgba(240,80,80,0.12)",
                    borderRadius: "10px",
                }}>
                    ⚠ {error}
                </div>
            )}

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
                        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: isMobile ? "13px" : "14px",
                        fontWeight: "800",
                        letterSpacing: "0.4px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all .2s",
                        boxShadow: "0 10px 28px rgba(255,90,46,0.35)",
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
    const navigate = useNavigate();
    return (
        <div style={S.successBox}>
            <div style={S.successIcon}>✓</div>
            <h2 style={{ ...S.heading, marginBottom: "10px" }}>Đăng ký thành công! 🎉</h2>
            <p style={{ ...S.subheading, marginBottom: "28px" }}>
                Chào mừng bạn đến với VTGYM. Hành trình của bạn bắt đầu từ đây.
            </p>
            <button
                style={S.btnPrimary}
                onClick={() => navigate("/member/login")}
            >
                ĐĂNG NHẬP NGAY
            </button>
        </div>
    );
}

/* ─── Lưu tạm dữ liệu đăng ký để không bị mất khi rời trang (xem chi nhánh, ...) ─── */
const REGISTER_DRAFT_KEY = "vtgym_register_draft";

function loadDraft() {
    try {
        const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveDraft(data) {
    try {
        sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

function clearDraft() {
    try {
        sessionStorage.removeItem(REGISTER_DRAFT_KEY);
    } catch {
        /* ignore */
    }
}

/* ─── Register Step ─── */
function RegisterStep({ onSendOTP, initialData, branches, branchesLoading, branchesError }) {
    const isMobile = useIsMobile();
    const S = getStyles(isMobile);
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState(
        location.state?.formData || initialData || loadDraft() || {
            fullName: "", phone: "", password: "", confirmPassword: "", gender: "Male", branchId: "",
        }
    );
    const [errors, setErrors] = useState({});
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { isFocused, bind } = useInputFocus();

    useEffect(() => { saveDraft(formData); }, [formData]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleBranchChange = (id) => setFormData((f) => ({ ...f, branchId: id }));

    const validate = () => {
        const errs = {};
        if (!formData.fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên.";
        if (!formData.phone.trim()) errs.phone = "Vui lòng nhập số điện thoại.";
        else if (!/^0\d{9}$/.test(formData.phone)) errs.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";
        if (!formData.password) errs.password = "Vui lòng nhập mật khẩu.";
        else if (formData.password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự.";
        if (formData.confirmPassword !== formData.password) errs.confirmPassword = "Mật khẩu xác nhận không khớp.";
        if (!formData.branchId) errs.branchId = "Vui lòng chọn chi nhánh.";
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
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

                {/* Chọn chi nhánh */}
                <div style={S.fieldGroup}>
                    <label style={S.label}>CHI NHÁNH TẬP LUYỆN</label>
                    <BranchSelect
                        value={formData.branchId}
                        branches={branches}
                        loading={branchesLoading}
                        error={branchesError}
                        hasError={!!errors.branchId}
                        onChange={handleBranchChange}
                    />
                    {errors.branchId && <div style={S.errorMsg}>⚠ {errors.branchId}</div>}
                    <button
                        type="button"
                        style={S.helperLink}
                        onClick={() => navigate("/member/branches", { state: { formData } })}
                    >
                        Xem danh sách chi nhánh →
                    </button>
                </div>

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
                <button type="button" style={{ ...S.loginLink, fontFamily: "inherit" }} onClick={() => navigate("/member/login")}>
                    Đăng nhập
                </button>
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

    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(true);
    const [branchesError, setBranchesError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setBranchesLoading(true);
            setBranchesError("");
            try {
                const res = await memberApi.getBranches({ status: "Active" });
                const items = res?.items || [];
                if (!cancelled) setBranches(items.map(mapBranch));
            } catch (err) {
                if (!cancelled) setBranchesError(err.message || "Không thể tải danh sách chi nhánh.");
            } finally {
                if (!cancelled) setBranchesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleGoConfirm = (data) => { setFormData(data); setStep("confirm"); };
    const handleConfirmed = () => setStep("otp");
    const handleBackToRegister = () => setStep("register");
    const handleBackToConfirm = () => setStep("confirm");
    const handleSuccess = () => { clearDraft(); setStep("success"); };

    return (
        <div style={S.page}>
            <div style={S.card}>
                <Logo />

                {step === "register" && (
                    <RegisterStep
                        onSendOTP={handleGoConfirm}
                        initialData={formData}
                        branches={branches}
                        branchesLoading={branchesLoading}
                        branchesError={branchesError}
                    />
                )}
                {step === "confirm" && (
                    <ConfirmStep
                        formData={formData}
                        branches={branches}
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
                        branchId={formData.branchId}
                        onBack={handleBackToConfirm}
                        onSuccess={handleSuccess}
                    />
                )}
                {step === "success" && <SuccessStep isMobile={isMobile} />}

                <div style={S.copyright}>© 2026 VTGYM. All rights reserved.</div>
            </div>

            <style>{`
            * { box-sizing: border-box; }
            input::placeholder { color: #9aa4b2; }
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