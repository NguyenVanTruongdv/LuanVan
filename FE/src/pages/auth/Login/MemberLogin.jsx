import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../../../api/authApi";

export default function MemberLogin() {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneError, setPhoneError] = useState(false);
    const [error, setError] = useState(""); // lỗi từ server (sai pass, bị khóa,...)
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        // Reset lỗi cũ
        setError("");

        // Validate client-side
        if (!phone.trim()) {
            setPhoneError(true);
            return;
        }

        setLoading(true);
        try {
            // Gọi API — api.js tự lưu token + fullName vào localStorage
            await authApi.loginMember({ phone: phone.trim(), password });

            // Chuyển sang trang Home, truyền state để Home biết vừa login
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message || "Đăng nhập thất bại, vui lòng thử lại");
        } finally {
            setLoading(false);
        }
    };

    // Cho phép nhấn Enter để đăng nhập
    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleLogin();
    };

    return (
        <div style={styles.root}>
            <div style={styles.pageWrap} className="vtgym-wrap">
                {/* Left panel */}
                <div style={styles.leftPanel} className="vtgym-left">
                    <div style={styles.logoMark} className="vtgym-logomark">
                        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                            <rect x="2" y="13" width="6" height="6" rx="1.5" fill="white" />
                            <rect x="13" y="2" width="6" height="28" rx="2" fill="white" />
                            <rect x="24" y="13" width="6" height="6" rx="1.5" fill="white" />
                            <rect x="2" y="15" width="28" height="2" fill="rgba(255,255,255,0.4)" />
                        </svg>
                    </div>
                    <h2 style={styles.panelTitle} className="vtgym-paneltitle">Member Portal</h2>
                    <p style={styles.panelDesc} className="vtgym-paneldesc">Quản lý tài khoản thành viên và theo dõi hành trình luyện tập của bạn</p>

                    <p style={styles.sysLabel} className="vtgym-syslabel">VT Gym Management System v2.1</p>
                </div>

                {/* Right panel / form */}
                <div style={styles.rightPanel} className="vtgym-right">
                    <div style={styles.logoArea}>
                        <div style={styles.logoText}>
                            VT<span style={styles.logoAccent}>GYM</span>
                        </div>
                    </div>

                    <h1 style={styles.heading} className="vtgym-heading">Đăng nhập</h1>
                    <p style={styles.subheading}>Chào mừng trở lại, vui lòng xác thực để tiếp tục</p>

                    {/* Lỗi từ server */}
                    {error && (
                        <div style={styles.errorBanner}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Phone */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>SỐ ĐIỆN THOẠI THÀNH VIÊN</label>
                        <div style={styles.inputWrap}>
                            <span style={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </span>
                            <input
                                style={{ ...styles.input, ...(phoneError ? styles.inputError : {}) }}
                                type="tel"
                                placeholder="0901 234 567"
                                value={phone}
                                onChange={e => { setPhone(e.target.value); setPhoneError(false); setError(""); }}
                                onKeyDown={handleKeyDown}
                                onFocus={e => { if (!phoneError) { e.target.style.borderColor = "#ff5a3c"; e.target.style.boxShadow = "0 0 0 3px rgba(255,90,60,0.15)"; e.target.style.background = "#242424"; } }}
                                onBlur={e => { if (!phoneError) { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; e.target.style.background = "#1c1c1c"; } }}
                                disabled={loading}
                            />
                        </div>
                        {phoneError && <p style={styles.errorText}>Vui lòng nhập số điện thoại</p>}
                    </div>

                    {/* Password */}
                    <div style={styles.formGroup}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <label style={{ ...styles.label, marginBottom: 0 }}>MẬT KHẨU</label>
                            <button
                                style={styles.forgotBtn}
                                onClick={() => navigate("/member/forgot-password")}
                                tabIndex={-1}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                        <div style={styles.inputWrap}>
                            <span style={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input
                                style={{ ...styles.input, paddingRight: "44px" }}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(""); }}
                                onKeyDown={handleKeyDown}
                                onFocus={e => { e.target.style.borderColor = "#ff5a3c"; e.target.style.boxShadow = "0 0 0 3px rgba(255,90,60,0.15)"; e.target.style.background = "#242424"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; e.target.style.background = "#1c1c1c"; }}
                                disabled={loading}
                            />
                            <button style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                {showPassword ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        style={{
                            ...styles.loginBtn,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                        onClick={handleLogin}
                        disabled={loading}
                        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "#ff7a54"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,90,60,0.5)"; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#ff5a3c"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(255,90,60,0.35)"; }}
                    >
                        {loading ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
                    </button>

                    <p style={styles.sslNote}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }}>
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        Phiên đăng nhập được mã hóa SSL
                    </p>

                    <div style={styles.bottom}>
                        <span style={styles.bottomText}>Chưa có tài khoản?</span>
                        <span style={styles.sep}>·</span>
                        <button
                            style={styles.registerBtn}
                            onClick={() => navigate("/member/register")}
                            onMouseEnter={e => { e.currentTarget.style.color = "#ff5a3c"; e.currentTarget.style.borderColor = "#ff5a3c"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#8a8a8a"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                            Đăng ký thành viên
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                * { box-sizing: border-box; }

                .vtgym-wrap { transition: all 0.2s; }

                @media (max-width: 720px) {
                    .vtgym-wrap {
                        flex-direction: column !important;
                        max-width: 460px !important;
                    }
                    .vtgym-left {
                        flex: none !important;
                        width: 100% !important;
                        border-radius: 20px 20px 0 0 !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        padding: 28px 24px !important;
                    }
                    .vtgym-right {
                        border-radius: 0 0 20px 20px !important;
                        padding: 28px 24px !important;
                    }
                    .vtgym-logomark {
                        width: 44px !important;
                        height: 44px !important;
                        margin-bottom: 18px !important;
                    }
                    .vtgym-paneltitle {
                        font-size: 19px !important;
                        margin-bottom: 8px !important;
                    }
                    .vtgym-paneldesc {
                        font-size: 13px !important;
                    }
                    .vtgym-syslabel {
                        margin-top: 20px !important;
                    }
                    .vtgym-heading {
                        font-size: 24px !important;
                    }
                }

                @media (max-width: 420px) {
                    .vtgym-wrap {
                        border-radius: 16px !important;
                    }
                    .vtgym-left, .vtgym-right {
                        padding: 22px 18px !important;
                    }
                    .vtgym-heading {
                        font-size: 21px !important;
                    }
                }

                input::placeholder { color: #5a5a5a; }
            `}</style>
        </div>
    );
}

const styles = {
    root: {
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
        padding: "24px 16px",
    },
    pageWrap: {
        display: "flex",
        width: "100%",
        maxWidth: "860px",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    },
    leftPanel: {
        flex: "0 0 340px",
        background: "#151515",
        padding: "44px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    logoMark: {
        width: "52px",
        height: "52px",
        background: "linear-gradient(135deg, #ff5a3c, #b8341a)",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "24px",
        boxShadow: "0 6px 20px rgba(255,90,60,0.3)",
    },
    panelTitle: {
        fontSize: "22px",
        fontWeight: 800,
        color: "#ffffff",
        margin: "0 0 12px",
        letterSpacing: "-0.3px",
    },
    panelDesc: {
        fontSize: "14px",
        color: "#8a8a8a",
        lineHeight: 1.6,
        margin: "0 0 auto",
    },
    sysLabel: {
        fontSize: "12px",
        color: "#3a3a3a",
        marginTop: "32px",
    },
    rightPanel: {
        flex: 1,
        background: "#181818",
        padding: "44px 40px",
    },
    logoArea: {
        marginBottom: "28px",
    },
    logoText: {
        fontSize: "18px",
        fontWeight: 800,
        letterSpacing: "3px",
        color: "#ffffff",
    },
    logoAccent: {
        color: "#ff5a3c",
    },
    heading: {
        fontSize: "28px",
        fontWeight: 800,
        color: "#ffffff",
        letterSpacing: "-0.5px",
        margin: "0 0 8px",
    },
    subheading: {
        fontSize: "14px",
        color: "#8a8a8a",
        margin: "0 0 32px",
    },
    errorBanner: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(255,90,60,0.1)",
        border: "1px solid rgba(255,90,60,0.3)",
        borderRadius: "10px",
        padding: "11px 14px",
        fontSize: "13.5px",
        color: "#ff5a3c",
        marginBottom: "20px",
    },
    formGroup: {
        marginBottom: "20px",
    },
    label: {
        display: "block",
        fontSize: "11px",
        fontWeight: 700,
        color: "#8a8a8a",
        letterSpacing: "0.8px",
        marginBottom: "8px",
    },
    forgotBtn: {
        background: "none",
        border: "none",
        color: "#ff5a3c",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        padding: 0,
        fontFamily: "inherit",
    },
    inputWrap: {
        position: "relative",
        display: "flex",
        alignItems: "center",
    },
    inputIcon: {
        position: "absolute",
        left: "14px",
        color: "#5a5a5a",
        pointerEvents: "none",
        display: "flex",
    },
    input: {
        width: "100%",
        background: "#1c1c1c",
        border: "1.5px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "13px 14px 13px 44px",
        fontSize: "15px",
        fontFamily: "inherit",
        color: "#f0f0f0",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        boxSizing: "border-box",
    },
    inputError: {
        borderColor: "#f05050",
        boxShadow: "0 0 0 3px rgba(240,80,80,0.15)",
    },
    errorText: {
        fontSize: "12px",
        color: "#f05050",
        marginTop: "6px",
    },
    eyeBtn: {
        position: "absolute",
        right: "14px",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
    },
    loginBtn: {
        width: "100%",
        padding: "15px",
        background: "#ff5a3c",
        border: "none",
        borderRadius: "12px",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: 800,
        fontFamily: "inherit",
        letterSpacing: "0.5px",
        transition: "all 0.2s",
        boxShadow: "0 4px 18px rgba(255,90,60,0.35)",
        marginTop: "8px",
        marginBottom: "16px",
    },
    sslNote: {
        fontSize: "12px",
        color: "#5a5a5a",
        textAlign: "center",
        marginBottom: "24px",
        lineHeight: 1.5,
    },
    bottom: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap",
    },
    bottomText: {
        fontSize: "13px",
        color: "#5a5a5a",
    },
    sep: {
        color: "#3a3a3a",
    },
    registerBtn: {
        background: "none",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        color: "#8a8a8a",
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        padding: "7px 16px",
        transition: "all 0.2s",
    },
};