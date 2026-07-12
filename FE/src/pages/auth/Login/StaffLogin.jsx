import { useState } from "react";
  import { useNavigate } from "react-router-dom";
  import authApi from "../../../api/authApi";

  // Map role trả về từ BE -> route tương ứng sau khi đăng nhập.
  // ⚠️ Kiểm tra lại đúng giá trị chuỗi role mà BE trả (vd: "Manager", "MANAGER",
  // "manager"...) rồi chỉnh key cho khớp. Có thể để so sánh không phân biệt hoa/thường
  // bằng cách .toLowerCase() như bên dưới cho an toàn.
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

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
      setError("");

      if (!phone || !password) {
        setError("Vui lòng nhập đầy đủ số điện thoại và mật khẩu");
        return;
      }

      setLoading(true);
      try {
        // ⚠️ Kiểm tra lại tên field backend yêu cầu (phoneNumber/phone/username...)
        // authApi.loginEmployee() trả thẳng data JSON từ BE (không phải response
        // axios), dạng { accessToken, refreshToken, fullName, role, entityType, status }
        // — saveTokens() bên trong authApi đã lưu role vào localStorage rồi, ở đây
        // chỉ cần đọc thẳng data.role để điều hướng.
        const data = await authApi.loginEmployee({
            phone,
             password,
        });

        navigate(getHomeRouteByRole(data?.role));
      } catch (err) {
        setError(err.message || "Đăng nhập thất bại");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={styles.root}>
        {/* Decorative background shapes */}
        <div style={styles.bgCircle1} />
        <div style={styles.bgCircle2} />

        <div style={styles.container}>
          {/* Left accent panel */}
          <div style={styles.sidePanel}>
            <div style={styles.sidePanelInner}>
              <div style={styles.brandMark}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="12" fill="rgba(6,182,212,0.15)" />
                  <path d="M8 22h6M30 22h6M14 14v16M30 14v16M14 18h16M14 26h16" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 style={styles.sideTitle}>Staff Portal</h2>
              <p style={styles.sideDesc}>Quản lý phòng gym chuyên nghiệp dành cho đội ngũ nội bộ</p>

              <div style={styles.sideStats}>
                <div style={styles.statItem}>
                  <span style={styles.statNum}>248</span>
                  <span style={styles.statLabel}>Members Active</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                  <span style={styles.statNum}>12</span>
                  <span style={styles.statLabel}>Sessions Today</span>
                </div>
              </div>

              <div style={styles.sideFooterTag}>VT Gym Management System v2.1</div>
            </div>
          </div>

          {/* Right login form */}
          <div style={styles.formPanel}>
            <div style={styles.formInner}>
              <div style={styles.formHeader}>
                <h1 style={styles.formTitle}>Đăng nhập</h1>
                <p style={styles.formSubtitle}>Chào mừng trở lại, vui lòng xác thực để tiếp tục</p>
              </div>

              {/* Phone */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Số Điện Thoại Nhân Viên</label>
                <div style={styles.inputWrapper}>
                  <svg style={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={e => { e.target.style.borderColor = "#06B6D4"; e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Mật khẩu</label>
                <div style={styles.inputWrapper}>
                  <svg style={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    style={styles.input}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    onFocus={e => { e.target.style.borderColor = "#06B6D4"; e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
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
              {error && (
                <div style={{ color: "#F87171", fontSize: "13px", marginBottom: "16px" }}>
                  {error}
                </div>
              )}

              {/* Login button */}
              <button
                style={{ ...styles.loginBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                onClick={handleLogin}
                disabled={loading}
                onMouseEnter={e => { if (!loading) { e.target.style.background = "#0891B2"; e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 8px 24px rgba(6,182,212,0.35)"; } }}
                onMouseLeave={e => { e.target.style.background = "#06B6D4"; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 16px rgba(6,182,212,0.2)"; }}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
              </button>

              {/* Security notice */}
              <div style={styles.securityNote}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Phiên đăng nhập được mã hóa SSL · Chỉ dành cho nhân viên nội bộ</span>
              </div>

              {/* Forgot */}
              <div style={styles.forgotRow}>
                <button
                  style={styles.forgotBtn}
                  onMouseEnter={e => { e.target.style.color = "#06B6D4"; }}
                  onMouseLeave={e => { e.target.style.color = "#64748B"; }}
                >
                  Quên mật khẩu? Liên hệ Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const styles = {
    root: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    bgCircle1: {
      position: "absolute",
      top: "-200px",
      left: "-200px",
      width: "600px",
      height: "600px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    bgCircle2: {
      position: "absolute",
      bottom: "-150px",
      right: "-150px",
      width: "500px",
      height: "500px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
      pointerEvents: "none",
    },
    container: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      width: "860px",
      background: "#1E293B",
      borderRadius: "24px",
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(51,65,85,0.8)",
    },
    sidePanel: {
      width: "320px",
      flexShrink: 0,
      background: "linear-gradient(160deg, #0F172A 0%, #1a2744 100%)",
      borderRight: "1px solid rgba(51,65,85,0.6)",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
    },
    sidePanelInner: {
      padding: "48px 36px",
      position: "relative",
      zIndex: 1,
      width: "100%",
    },
    brandMark: {
      marginBottom: "24px",
    },
    sideTitle: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#F1F5F9",
      margin: "0 0 12px",
      letterSpacing: "-0.5px",
    },
    sideDesc: {
      fontSize: "14px",
      color: "#64748B",
      lineHeight: "1.7",
      margin: "0 0 36px",
    },
    sideStats: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      background: "rgba(6,182,212,0.06)",
      border: "1px solid rgba(6,182,212,0.15)",
      borderRadius: "12px",
      padding: "16px 20px",
      marginBottom: "auto",
    },
    statItem: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    statNum: {
      fontSize: "22px",
      fontWeight: 700,
      color: "#06B6D4",
    },
    statLabel: {
      fontSize: "11px",
      color: "#64748B",
      letterSpacing: "0.5px",
    },
    statDivider: {
      width: "1px",
      height: "36px",
      background: "rgba(51,65,85,0.8)",
    },
    sideFooterTag: {
      marginTop: "40px",
      fontSize: "11px",
      color: "#334155",
      letterSpacing: "0.3px",
    },
    formPanel: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    formInner: {
      width: "100%",
      maxWidth: "380px",
      padding: "48px 40px",
    },
    formHeader: {
      marginBottom: "28px",
    },
    formTitle: {
      fontSize: "26px",
      fontWeight: 700,
      color: "#F1F5F9",
      margin: "0 0 6px",
      letterSpacing: "-0.5px",
    },
    formSubtitle: {
      fontSize: "14px",
      color: "#64748B",
      margin: 0,
    },
    roleSelector: {
      display: "flex",
      gap: "8px",
      marginBottom: "28px",
      background: "#0F172A",
      borderRadius: "10px",
      padding: "4px",
    },
    roleBtn: {
      flex: 1,
      padding: "8px",
      background: "transparent",
      border: "none",
      borderRadius: "7px",
      color: "#64748B",
      fontSize: "13px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
      fontFamily: "inherit",
    },
    roleBtnActive: {
      background: "#1E293B",
      color: "#06B6D4",
      fontWeight: 600,
      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    },
    formGroup: {
      marginBottom: "18px",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "#94A3B8",
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "14px",
      pointerEvents: "none",
    },
    input: {
      width: "100%",
      background: "#0F172A",
      border: "1px solid #334155",
      borderRadius: "10px",
      padding: "13px 14px 13px 42px",
      fontSize: "15px",
      color: "#F1F5F9",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxSizing: "border-box",
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
    rememberRow: {
      marginBottom: "20px",
    },
    checkLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    checkbox: {
      accentColor: "#06B6D4",
      width: "15px",
      height: "15px",
    },
    checkText: {
      fontSize: "14px",
      color: "#64748B",
    },
    loginBtn: {
      width: "100%",
      padding: "14px",
      background: "#06B6D4",
      border: "none",
      borderRadius: "10px",
      color: "#0F172A",
      fontSize: "15px",
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: "0 4px 16px rgba(6,182,212,0.2)",
      letterSpacing: "0.3px",
      marginBottom: "16px",
      fontFamily: "inherit",
    },
    securityNote: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "12px",
      color: "#475569",
      marginBottom: "20px",
    },
    forgotRow: {
      textAlign: "center",
    },
    forgotBtn: {
      background: "none",
      border: "none",
      color: "#64748B",
      fontSize: "13px",
      cursor: "pointer",
      transition: "color 0.2s",
      fontFamily: "inherit",
      textDecoration: "underline",
      textDecorationColor: "transparent",
    },
  };