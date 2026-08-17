import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../../../api/authApi";

const ROLE_HOME_ROUTES = {
  manager: "/manager",
  admin: "/admin",
  staff: "/cashier",
};

function getHomeRouteByRole(role) {
  if (!role) return "/cashier";
  const key = String(role).toLowerCase();
  return ROLE_HOME_ROUTES[key] || "/cashier";
}

export default function StaffLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.loginEmployee({ email, password });
      navigate(getHomeRouteByRole(data?.role));
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sl-root">
      {/* CSS responsive - đặt 1 lần, dùng className thay vì object style cho phần layout */}
      <style>{`
        .sl-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 16px;
          box-sizing: border-box;
        }
        .sl-bg-circle-1 {
          position: absolute; top: -200px; left: -200px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .sl-bg-circle-2 {
          position: absolute; bottom: -150px; right: -150px;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .sl-container {
          position: relative;
          z-index: 1;
          display: flex;
          width: 860px;
          max-width: 100%;
          background: #1E293B;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(51,65,85,0.8);
        }
        .sl-side-panel {
          width: 320px;
          flex-shrink: 0;
          background: linear-gradient(160deg, #0F172A 0%, #1a2744 100%);
          border-right: 1px solid rgba(51,65,85,0.6);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .sl-side-panel-inner {
          padding: 48px 36px;
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .sl-brand-mark { margin-bottom: 24px; }
        .sl-side-title {
          font-size: 24px; font-weight: 700; color: #F1F5F9;
          margin: 0 0 12px; letter-spacing: -0.5px;
        }
        .sl-side-desc {
          font-size: 14px; color: #64748B; line-height: 1.7; margin: 0 0 36px;
        }
        .sl-side-stats {
          display: flex; align-items: center; gap: 20px;
          background: rgba(6,182,212,0.06);
          border: 1px solid rgba(6,182,212,0.15);
          border-radius: 12px; padding: 16px 20px; margin-bottom: auto;
        }
        .sl-stat-item { display: flex; flex-direction: column; gap: 2px; }
        .sl-stat-num { font-size: 22px; font-weight: 700; color: #06B6D4; }
        .sl-stat-label { font-size: 11px; color: #64748B; letter-spacing: 0.5px; }
        .sl-stat-divider { width: 1px; height: 36px; background: rgba(51,65,85,0.8); }
        .sl-side-footer-tag { margin-top: 40px; font-size: 11px; color: #334155; letter-spacing: 0.3px; }

        .sl-form-panel { flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0; }
        .sl-form-inner { width: 100%; max-width: 380px; padding: 48px 40px; box-sizing: border-box; }
        .sl-form-header { margin-bottom: 28px; }
        .sl-form-title { font-size: 26px; font-weight: 700; color: #F1F5F9; margin: 0 0 6px; letter-spacing: -0.5px; }
        .sl-form-subtitle { font-size: 14px; color: #64748B; margin: 0; }

        .sl-form-group { margin-bottom: 18px; }
        .sl-label {
          display: block; font-size: 12px; font-weight: 600; color: #94A3B8;
          letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px;
        }
        .sl-input-wrapper { position: relative; display: flex; align-items: center; }
        .sl-input-icon { position: absolute; left: 14px; pointer-events: none; }
        .sl-input {
          width: 100%; background: #0F172A; border: 1px solid #334155;
          border-radius: 10px; padding: 13px 14px 13px 42px; font-size: 15px;
          color: #F1F5F9; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .sl-input:focus {
          border-color: #06B6D4;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.12);
        }
        .sl-eye-btn {
          position: absolute; right: 14px; background: none; border: none;
          cursor: pointer; padding: 4px; display: flex; align-items: center;
        }

        .sl-login-btn {
          width: 100%; padding: 14px; background: #06B6D4; border: none;
          border-radius: 10px; color: #0F172A; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(6,182,212,0.2);
          letter-spacing: 0.3px; margin-bottom: 16px; font-family: inherit;
        }
        .sl-login-btn:hover:not(:disabled) {
          background: #0891B2; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(6,182,212,0.35);
        }
        .sl-login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .sl-security-note {
          display: flex; align-items: center; gap: 6px; font-size: 12px;
          color: #475569; margin-bottom: 20px;
        }
        .sl-forgot-row { text-align: center; }
        .sl-forgot-btn {
          background: none; border: none; color: #64748B; font-size: 13px;
          cursor: pointer; transition: color 0.2s; font-family: inherit;
          text-decoration: underline; text-decoration-color: transparent;
        }
        .sl-forgot-btn:hover { color: #06B6D4; }

        .sl-error { color: #F87171; font-size: 13px; margin-bottom: 16px; }

        /* ===== Responsive ===== */
        @media (max-width: 900px) {
          .sl-side-panel { width: 240px; }
          .sl-side-panel-inner { padding: 36px 24px; }
          .sl-form-inner { padding: 40px 32px; }
        }

        @media (max-width: 640px) {
          .sl-root { padding: 12px; }
          .sl-container {
            flex-direction: column;
            width: 100%;
            border-radius: 18px;
          }
          .sl-side-panel {
            display: none; /* ẩn panel giới thiệu trên mobile để tập trung vào form */
          }
          .sl-form-inner {
            max-width: 100%;
            padding: 32px 20px;
          }
          .sl-form-title { font-size: 22px; }
        }

        @media (max-width: 380px) {
          .sl-form-inner { padding: 24px 16px; }
        }
      `}</style>

      <div className="sl-bg-circle-1" />
      <div className="sl-bg-circle-2" />

      <div className="sl-container">
        {/* Left accent panel */}
        <div className="sl-side-panel">
          <div className="sl-side-panel-inner">
            <div className="sl-brand-mark">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="12" fill="rgba(6,182,212,0.15)" />
                <path d="M8 22h6M30 22h6M14 14v16M30 14v16M14 18h16M14 26h16" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="sl-side-title">Staff Portal</h2>
            <p className="sl-side-desc">Quản lý phòng gym chuyên nghiệp dành cho đội ngũ nội bộ</p>

            <div className="sl-side-stats">
              <div className="sl-stat-item">
                <span className="sl-stat-num">248</span>
                <span className="sl-stat-label">Members Active</span>
              </div>
              <div className="sl-stat-divider" />
              <div className="sl-stat-item">
                <span className="sl-stat-num">12</span>
                <span className="sl-stat-label">Sessions Today</span>
              </div>
            </div>

            <div className="sl-side-footer-tag">VT Gym Management System v2.1</div>
          </div>
        </div>

        {/* Right login form */}
        <div className="sl-form-panel">
          <div className="sl-form-inner">
            <div className="sl-form-header">
              <h1 className="sl-form-title">Đăng nhập</h1>
              <p className="sl-form-subtitle">Chào mừng trở lại, vui lòng xác thực để tiếp tục</p>
            </div>

            {/* Email */}
            <div className="sl-form-group">
              <label className="sl-label">Email Nhân Viên</label>
              <div className="sl-input-wrapper">
                <svg className="sl-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  className="sl-input"
                  type="email"
                  placeholder="nhanvien@vtgym.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="sl-form-group">
              <label className="sl-label">Mật khẩu</label>
              <div className="sl-input-wrapper">
                <svg className="sl-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  className="sl-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                />
                <button
                  type="button"
                  className="sl-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && <div className="sl-error">{error}</div>}

            {/* Login button */}
            <button
              className="sl-login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
            </button>

            {/* Security notice */}
            <div className="sl-security-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Phiên đăng nhập được mã hóa SSL · Chỉ dành cho nhân viên nội bộ</span>
            </div>

            {/* Forgot */}
            <div className="sl-forgot-row">
              <button className="sl-forgot-btn">
                Quên mật khẩu? Liên hệ Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}