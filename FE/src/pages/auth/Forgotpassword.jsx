import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authApi from "../../api/authApi";

// Các bước của luồng quên mật khẩu
const STEP_PHONE = "phone";
const STEP_RESET = "reset";
const STEP_DONE = "done";

const PHONE_REGEX = /^0\d{9}$/;
const RESEND_SECONDS = 60;

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState(STEP_PHONE);
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cooldown, setCooldown] = useState(0);

    const timerRef = useRef(null);

    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const startCooldown = () => {
        setCooldown(RESEND_SECONDS);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Lấy message lỗi từ BE (BadRequestException / UnauthorizedException...)
    const getErrorMessage = (err, fallback) => {
        return (
            err?.response?.data?.message ||
            err?.response?.data?.Message ||
            err?.message ||
            fallback
        );
    };

    // ── Bước 1: Gửi OTP về số điện thoại ──────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError("");

        if (!PHONE_REGEX.test(phone)) {
            setError("Số điện thoại không hợp lệ (VD: 0912000001)");
            return;
        }

        setLoading(true);
        try {
            await authApi.sendForgotPasswordOtp(phone);
            setStep(STEP_RESET);
            startCooldown();
        } catch (err) {
            setError(getErrorMessage(err, "Không thể gửi OTP. Vui lòng thử lại."));
        } finally {
            setLoading(false);
        }
    };

    // ── Gửi lại OTP ────────────────────────────────────────────────
    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setError("");
        setLoading(true);
        try {
            await authApi.sendForgotPasswordOtp(phone);
            startCooldown();
        } catch (err) {
            setError(getErrorMessage(err, "Không thể gửi lại OTP."));
        } finally {
            setLoading(false);
        }
    };

    // ── Bước 2: Xác nhận OTP + đặt mật khẩu mới ───────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");

        if (!/^\d{6}$/.test(otp)) {
            setError("Mã OTP gồm 6 chữ số");
            return;
        }
        if (newPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Xác nhận mật khẩu không khớp");
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword({
                phone,
                otp,
                newPassword,
            });
            setStep(STEP_DONE);
        } catch (err) {
            setError(getErrorMessage(err, "Đặt lại mật khẩu thất bại."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
        /* ── Design tokens (đồng bộ với trang đăng nhập) ───────────────── */
        .fp-page {
          --fp-bg: #0a0a0d;
          --fp-card: #141417;
          --fp-card-border: rgba(255, 255, 255, 0.06);
          --fp-text: #f5f5f5;
          --fp-text-muted: #9a9aa2;
          --fp-label: #b8b8c0;
          --fp-input-bg: #eef1fb;
          --fp-input-text: #1a1a2e;
          --fp-accent-1: #ff6a3d;
          --fp-accent-2: #ff3d3d;
          --fp-accent-soft: rgba(255, 90, 61, 0.12);
          --fp-error: #ff6b6b;
          --fp-radius-lg: 20px;
          --fp-radius-md: 14px;
        }

        .fp-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--fp-bg);
          padding: 24px;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .fp-page *,
        .fp-page *::before,
        .fp-page *::after {
          box-sizing: border-box;
        }

        .fp-card {
          width: 100%;
          max-width: 440px;
          background: var(--fp-card);
          border: 1px solid var(--fp-card-border);
          border-radius: var(--fp-radius-lg);
          padding: 40px 36px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }

        .fp-logo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--fp-accent-1), var(--fp-accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 20px rgba(255, 74, 61, 0.3);
        }

        .fp-logo-icon {
          color: #fff;
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
        }

        .fp-title {
          color: var(--fp-text);
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .fp-subtitle {
          color: var(--fp-text-muted);
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 28px;
        }

        .fp-subtitle b {
          color: var(--fp-text);
        }

        .fp-label {
          display: block;
          color: var(--fp-label);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          margin: 18px 0 8px;
        }

        .fp-label:first-of-type {
          margin-top: 0;
        }

        .fp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .fp-input-icon {
          position: absolute;
          left: 14px;
          color: #6b6b78;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .fp-input {
          width: 100%;
          height: 52px;
          background: var(--fp-input-bg);
          color: var(--fp-input-text);
          border: 1.5px solid transparent;
          border-radius: var(--fp-radius-md);
          padding: 0 44px;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .fp-input::placeholder {
          color: #9295a8;
          font-weight: 400;
        }

        .fp-input:focus {
          border-color: var(--fp-accent-1);
          box-shadow: 0 0 0 4px var(--fp-accent-soft);
        }

        .fp-otp-input {
          letter-spacing: 0.5em;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          padding-left: 44px;
        }

        .fp-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #6b6b78;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          border-radius: 8px;
        }

        .fp-eye-btn:hover {
          color: #1a1a2e;
        }

        .fp-resend-row {
          display: flex;
          justify-content: flex-end;
          margin: 8px 0 4px;
        }

        .fp-resend-link {
          background: none;
          border: none;
          color: var(--fp-accent-1);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
        }

        .fp-resend-link:disabled {
          color: var(--fp-text-muted);
          cursor: not-allowed;
        }

        .fp-error {
          color: var(--fp-error);
          font-size: 13px;
          font-weight: 500;
          margin: 14px 0 0;
          line-height: 1.4;
        }

        .fp-submit {
          width: 100%;
          height: 52px;
          margin-top: 24px;
          border: none;
          border-radius: var(--fp-radius-md);
          background: linear-gradient(135deg, var(--fp-accent-1), var(--fp-accent-2));
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(255, 74, 61, 0.28);
          transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
        }

        .fp-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(255, 74, 61, 0.36);
        }

        .fp-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .fp-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .fp-back-step {
          display: block;
          width: 100%;
          background: none;
          border: none;
          margin-top: 16px;
          color: var(--fp-text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
        }

        .fp-back-step:hover {
          color: var(--fp-text);
        }

        .fp-footer {
          margin-top: 28px;
          text-align: center;
        }

        .fp-footer-link {
          color: var(--fp-accent-1);
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
        }

        .fp-footer-link:hover {
          text-decoration: underline;
        }

        .fp-success {
          text-align: center;
        }

        .fp-success-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: rgba(56, 209, 128, 0.12);
          color: #38d180;
          font-size: 30px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Responsive ─────────────────────────────────────────────────── */
        @media (max-width: 480px) {
          .fp-card {
            padding: 32px 22px 26px;
            border-radius: 18px;
          }

          .fp-title {
            font-size: 22px;
          }

          .fp-input,
          .fp-submit {
            height: 48px;
          }
        }

        /* ── Accessibility: focus vòng ngoài rõ ràng cho bàn phím ────────── */
        .fp-page a:focus-visible,
        .fp-page button:focus-visible,
        .fp-page input:focus-visible {
          outline: 2px solid var(--fp-accent-1);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .fp-page * {
            transition: none !important;
          }
        }
      `}</style>

            <div className="fp-page">
                <div className="fp-card">
                    <div className="fp-logo">
                        <span className="fp-logo-icon">+</span>
                    </div>

                    {step === STEP_PHONE && (
                        <>
                            <h1 className="fp-title">Quên mật khẩu</h1>
                            <p className="fp-subtitle">
                                Nhập số điện thoại thành viên để nhận mã OTP đặt lại mật khẩu
                            </p>

                            <form onSubmit={handleSendOtp} noValidate>
                                <label className="fp-label">SỐ ĐIỆN THOẠI THÀNH VIÊN</label>
                                <div className="fp-input-wrap">
                                    <span className="fp-input-icon">
                                        <PhoneIcon />
                                    </span>
                                    <input
                                        className="fp-input"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="0912000001"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.trim())}
                                        autoFocus
                                    />
                                </div>

                                {error && <p className="fp-error">{error}</p>}

                                <button className="fp-submit" type="submit" disabled={loading}>
                                    {loading ? "Đang gửi..." : "Gửi mã OTP"}
                                </button>
                            </form>
                        </>
                    )}

                    {step === STEP_RESET && (
                        <>
                            <h1 className="fp-title">Xác thực &amp; đặt lại</h1>
                            <p className="fp-subtitle">
                                Mã OTP đã được gửi đến số <b>{phone}</b>
                            </p>

                            <form onSubmit={handleResetPassword} noValidate>
                                <label className="fp-label">MÃ OTP</label>
                                <div className="fp-input-wrap">
                                    <span className="fp-input-icon">
                                        <ShieldIcon />
                                    </span>
                                    <input
                                        className="fp-input fp-otp-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="••••••"
                                        value={otp}
                                        onChange={(e) =>
                                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                                        }
                                        autoFocus
                                    />
                                </div>

                                <div className="fp-resend-row">
                                    <button
                                        type="button"
                                        className="fp-resend-link"
                                        onClick={handleResendOtp}
                                        disabled={cooldown > 0 || loading}
                                    >
                                        {cooldown > 0
                                            ? `Gửi lại mã sau ${cooldown}s`
                                            : "Gửi lại mã OTP"}
                                    </button>
                                </div>

                                <label className="fp-label">MẬT KHẨU MỚI</label>
                                <div className="fp-input-wrap">
                                    <span className="fp-input-icon">
                                        <LockIcon />
                                    </span>
                                    <input
                                        className="fp-input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Tối thiểu 6 ký tự"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="fp-eye-btn"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label="Hiện/ẩn mật khẩu"
                                    >
                                        <EyeIcon off={!showPassword} />
                                    </button>
                                </div>

                                <label className="fp-label">XÁC NHẬN MẬT KHẨU</label>
                                <div className="fp-input-wrap">
                                    <span className="fp-input-icon">
                                        <LockIcon />
                                    </span>
                                    <input
                                        className="fp-input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>

                                {error && <p className="fp-error">{error}</p>}

                                <button className="fp-submit" type="submit" disabled={loading}>
                                    {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                                </button>

                                <button
                                    type="button"
                                    className="fp-back-step"
                                    onClick={() => {
                                        setStep(STEP_PHONE);
                                        setError("");
                                    }}
                                >
                                    ← Đổi số điện thoại khác
                                </button>
                            </form>
                        </>
                    )}

                    {step === STEP_DONE && (
                        <div className="fp-success">
                            <div className="fp-success-icon">✓</div>
                            <h1 className="fp-title">Thành công!</h1>
                            <p className="fp-subtitle">
                                Mật khẩu của bạn đã được đặt lại. Vui lòng đăng nhập lại bằng
                                mật khẩu mới.
                            </p>
                            <button
                                className="fp-submit"
                                type="button"
                                onClick={() => navigate("/member/login")}
                            >
                                Về trang đăng nhập
                            </button>
                        </div>
                    )}

                    {step !== STEP_DONE && (
                        <div className="fp-footer">
                            <Link to="/member/login" className="fp-footer-link">
                                ← Quay lại đăng nhập
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ── Icon nội tuyến (không phụ thuộc thư viện ngoài) ─────────────
function PhoneIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect
                x="5"
                y="11"
                width="14"
                height="9"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.6"
            />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path
                d="M9 12.2l2 2 4-4.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function EyeIcon({ off }) {
    if (off) {
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                    d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.5 6.7C4.4 8.1 2.9 10 2 12c1.6 3.8 5.4 7 10 7 1.7 0 3.3-.4 4.7-1.1M9.9 4.2A10.6 10.6 0 0 1 12 4c4.6 0 8.4 3.2 10 7-.5 1.2-1.2 2.4-2.1 3.4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M2 12c1.6-3.8 5.4-7 10-7s8.4 3.2 10 7c-1.6 3.8-5.4 7-10 7s-8.4-3.2-10-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}