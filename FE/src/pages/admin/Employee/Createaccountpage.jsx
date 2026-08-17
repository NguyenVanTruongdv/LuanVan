import { useEffect, useMemo, useState } from "react";
import managerApi from "../../../api/managerApi"; // ⚠️ chỉnh lại path nếu khác vị trí thực tế

/* =========================================================================
 * THEME TOKENS — tông trắng + xanh lá nhạt (đồng bộ với trang danh sách)
 * ========================================================================= */
const THEME = {
  bg: "#EEFBF3",
  panel: "#FFFFFF",
  border: "#BBEBCB",
  borderStrong: "#86D9A4",
  accent: "#16A34A",
  accentDark: "#15803D",
  accentSoft: "rgba(22,163,74,0.08)",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.08)",
  success: "#16A34A",
  successSoft: "rgba(22,163,74,0.08)",
};

// ⚠️ Giả định mapping RoleId <-> tên vai trò vì BE chưa cung cấp API danh sách Role.
const ROLE_OPTIONS = [
  { id: 1, name: "Admin" },
  { id: 2, name: "Manager" },
  { id: 3, name: "Staff" },
];
const STAFF_ROLE_ID = 3;
const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];

/* ---------------------------- Icons ---------------------------- */
const Icon = {
  X: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  ArrowLeft: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Alert: (p) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  ),
};

/* ---------------------------- Primitives ---------------------------- */
const inputStyle = {
  background: "#F6FDF8",
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: THEME.textPrimary,
  fontSize: 13.5,
  outline: "none",
  width: "100%",
};

function TextInput(props) {
  return <input {...props} className="cew-input" style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select(props) {
  return (
    <select {...props} className="cew-input" style={{ ...inputStyle, ...(props.style || {}) }}>
      {props.children}
    </select>
  );
}
function Field({ label, required, children, hint, error }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
      <span style={{ color: THEME.textSecondary, fontWeight: 600 }}>
        {label} {required && <span style={{ color: THEME.accent }}>*</span>}
      </span>
      {children}
      {error ? (
        <span style={{ color: THEME.danger, fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon.Alert /> {error}
        </span>
      ) : hint ? (
        <span style={{ color: THEME.textMuted, fontSize: 11.5 }}>{hint}</span>
      ) : null}
    </label>
  );
}
function Button({ variant = "solid", tone = "accent", size = "md", children, style, ...rest }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: size === "sm" ? 12.5 : 13.5,
    fontWeight: 600,
    borderRadius: 10,
    padding: size === "sm" ? "8px 14px" : "10px 18px",
    cursor: rest.disabled ? "not-allowed" : "pointer",
    opacity: rest.disabled ? 0.5 : 1,
    transition: "all .15s ease",
    border: "1px solid transparent",
  };
  const variants = {
    solid: {
      background: tone === "danger" ? THEME.danger : THEME.accent,
      color: "#FFFFFF",
      boxShadow: tone === "danger" ? "0 6px 16px rgba(220,38,38,0.25)" : "0 6px 16px rgba(22,163,74,0.25)",
    },
    outline: { background: "#FFFFFF", borderColor: THEME.border, color: THEME.textSecondary },
    ghost: { background: "transparent", color: THEME.textSecondary },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------- Helpers ---------------------------- */
// ⚠️ API danh sách chi nhánh trả về dạng { items: [...] } (xem response mẫu),
// không phải mảng thuần hay { data: [...] }. Hàm này xử lý mọi hình dạng có thể gặp.
function extractList(res) {
  const root = res?.data ?? res;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.data?.items)) return root.data.items;
  return [];
}

/* ---------------------------- Main Page ---------------------------- */
// Giống trang tạo nhân viên gốc, nhưng:
// - KHÔNG có phần đăng ký FaceID.
// - Tài khoản đăng nhập (Email + Mật khẩu) là BẮT BUỘC, luôn hiển thị, không có nút bật/tắt.
export default function CreateAccountPageOfAdmin({ onCreated, onBack }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingMe, setLoadingMe] = useState(true);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successName, setSuccessName] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    gender: GENDER_OPTIONS[0],
    roleId: STAFF_ROLE_ID,
    branchIds: [],
    loginEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({});

  const isManager = currentUser?.role === "Manager";
  const isAdmin = currentUser?.role === "Admin";
  const availableBranches = useMemo(
    () => (isAdmin ? branches : currentUser?.branches || []),
    [isAdmin, branches, currentUser]
  );
  const myBranchIds = useMemo(() => (currentUser?.branches || []).map((b) => b.branchId), [currentUser]);
  const isStaffRole = Number(form.roleId) === STAFF_ROLE_ID;

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      try {
        const [meRes, branchRes] = await Promise.all([managerApi.getEmployeeProfile(), managerApi.getBranches()]);
        const me = meRes?.data && typeof meRes.data === "object" && "role" in meRes.data ? meRes.data : meRes;
        const branchList = extractList(branchRes);
        setCurrentUser(me);
        setBranches(branchList);
      } catch (e) {
        setSubmitError("Không tải được thông tin tài khoản / chi nhánh.");
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isManager) {
      setForm((f) => ({
        ...f,
        roleId: STAFF_ROLE_ID,
        branchIds: myBranchIds.length === 1 ? [myBranchIds[0]] : f.branchIds.filter((id) => myBranchIds.includes(id)),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, myBranchIds.join(",")]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const toggleBranch = (id) => {
    if (isStaffRole) {
      update({ branchIds: [id] });
      return;
    }
    setForm((f) => {
      const has = f.branchIds.includes(id);
      return { ...f, branchIds: has ? f.branchIds.filter((x) => x !== id) : [...f.branchIds, id] };
    });
  };

  useEffect(() => {
    if (isStaffRole && form.branchIds.length > 1) {
      update({ branchIds: [form.branchIds[0]] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaffRole]);

  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const hasLoginContact = form.loginEmail.trim().length > 0;

  // Tài khoản đăng nhập luôn bắt buộc (không còn tuỳ chọn ẩn/hiện).
  const errors = {
    fullName: !form.fullName.trim() ? "Vui lòng nhập họ tên." : "",
    phone: !form.phone.trim() ? "Vui lòng nhập số điện thoại." : "",
    branchIds: form.branchIds.length === 0 ? "Chọn ít nhất 1 chi nhánh." : "",
    loginContact: !hasLoginContact ? "Vui lòng nhập Email đăng nhập." : "",
    password: !form.password ? "Vui lòng nhập mật khẩu." : "",
    confirmPassword: form.password && !passwordsMatch ? "Mật khẩu nhập lại không khớp." : "",
  };
  const hasBlockingError = Object.values(errors).some(Boolean);

  const resetForm = () => {
    setForm({
      fullName: "",
      phone: "",
      gender: GENDER_OPTIONS[0],
      roleId: STAFF_ROLE_ID,
      branchIds: isManager && myBranchIds.length === 1 ? [myBranchIds[0]] : [],
      loginEmail: "",
      password: "",
      confirmPassword: "",
    });
    setTouched({});
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    setTouched({
      fullName: true, phone: true, branchIds: true,
      loginContact: true, password: true, confirmPassword: true,
    });
    if (hasBlockingError) return;

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        roleId: form.roleId,
        branchIds: form.branchIds,
        loginEmail: form.loginEmail.trim(),
        password: form.password,
      };
      await managerApi.createEmployeeWithAccount(payload);
      setSuccessName(form.fullName.trim());
      const created = { ...form };
      resetForm();
      if (onCreated) onCreated(created);
    } catch (e) {
      setSubmitError(e?.response?.data?.message || "Tạo nhân viên thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !saving;

  return (
    <div className="cew-root">
      <GlobalStyle />
      <div className="cew-page">
        <div className="cew-shell">
          <div className="cew-topbar">
            <Button variant="outline" size="sm" onClick={() => (onBack ? onBack() : window.history.back())} style={{ marginBottom: 14 }}>
              <Icon.ArrowLeft /> Quay lại danh sách
            </Button>
            <div>
              <h1 className="cew-title">Thêm nhân viên</h1>
              <p className="cew-subtitle">
                {loadingMe
                  ? "Đang tải thông tin tài khoản..."
                  : isManager
                    ? "Bạn đang tạo nhân viên (Staff) trong phạm vi chi nhánh mình phụ trách."
                    : "Tạo hồ sơ nhân viên mới cho hệ thống."}
              </p>
            </div>
          </div>

          {successName && (
            <div className="cew-success">
              <Icon.Check /> Đã tạo nhân viên <b>&nbsp;{successName}&nbsp;</b> thành công.
            </div>
          )}
          {submitError && (
            <div className="cew-error-banner">
              <Icon.Alert /> {submitError}
            </div>
          )}

          <form className="cew-card" onSubmit={submit}>
            {/* Thông tin cơ bản */}
            <div className="cew-section">
              <div className="cew-section-title">Thông tin cơ bản</div>
              <div className="cew-grid">
                <Field label="Họ và tên" required error={touched.fullName && errors.fullName}>
                  <TextInput
                    value={form.fullName}
                    onChange={(e) => update({ fullName: e.target.value })}
                    onBlur={() => markTouched("fullName")}
                    placeholder="Nguyễn Văn A"
                  />
                </Field>
                <Field label="Số điện thoại liên hệ" required error={touched.phone && errors.phone}>
                  <TextInput
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    onBlur={() => markTouched("phone")}
                    placeholder="09xxxxxxxx"
                  />
                </Field>
                <Field label="Giới tính">
                  <Select value={form.gender} onChange={(e) => update({ gender: e.target.value })}>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </Field>
                {isAdmin && (
                  <Field label="Vai trò">
                    <Select value={form.roleId} onChange={(e) => update({ roleId: Number(e.target.value) })}>
                      {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  </Field>
                )}
                {isManager && (
                  <Field label="Vai trò">
                    <TextInput value="Staff (mặc định)" disabled />
                  </Field>
                )}
              </div>

              <Field
                label={isStaffRole ? "Chi nhánh (chỉ chọn 1 — vai trò Staff)" : "Chi nhánh"}
                required
                error={touched.branchIds && errors.branchIds}
              >
                <div className="cew-chip-row">
                  {availableBranches.length === 0 && (
                    <span style={{ color: THEME.textMuted, fontSize: 12.5 }}>Không có chi nhánh khả dụng.</span>
                  )}
                  {availableBranches.map((b) => (
                    <button
                      type="button"
                      key={b.branchId}
                      className={form.branchIds.includes(b.branchId) ? "cew-chip cew-chip-active" : "cew-chip"}
                      onClick={() => { toggleBranch(b.branchId); markTouched("branchIds"); }}
                    >
                      {b.branchName}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Tài khoản đăng nhập — bắt buộc, luôn hiển thị */}
            <div className="cew-section">
              <div className="cew-section-title">Tài khoản đăng nhập</div>
              <div style={{ color: THEME.textMuted, fontSize: 12, marginTop: -8 }}>
                Bắt buộc — nhân viên đăng nhập bằng Email và mật khẩu được tạo ở đây.
              </div>

              <div className="cew-account-panel">
                <div className="cew-grid">
                  <Field label="Email đăng nhập" required error={touched.loginContact && errors.loginContact}>
                    <TextInput
                      type="email"
                      value={form.loginEmail}
                      onChange={(e) => update({ loginEmail: e.target.value })}
                      onBlur={() => markTouched("loginContact")}
                    />
                  </Field>
                  <Field label="Mật khẩu" required error={touched.password && errors.password}>
                    <TextInput
                      type="password"
                      value={form.password}
                      onChange={(e) => update({ password: e.target.value })}
                      onBlur={() => markTouched("password")}
                    />
                  </Field>
                  <Field label="Nhập lại mật khẩu" required error={touched.confirmPassword && errors.confirmPassword}>
                    <div style={{ position: "relative" }}>
                      <TextInput
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => update({ confirmPassword: e.target.value })}
                        onBlur={() => markTouched("confirmPassword")}
                        style={{
                          paddingRight: 34,
                          borderColor: passwordMismatch ? THEME.danger : passwordsMatch ? THEME.success : THEME.border,
                        }}
                      />
                      {form.confirmPassword.length > 0 && (
                        <span className="cew-match-icon" style={{ color: passwordsMatch ? THEME.success : THEME.danger }}>
                          {passwordsMatch ? <Icon.Check /> : <Icon.X />}
                        </span>
                      )}
                    </div>
                    {form.confirmPassword.length > 0 && (
                      <span style={{ fontSize: 11.5, color: passwordsMatch ? THEME.success : THEME.danger }}>
                        {passwordsMatch ? "Mật khẩu khớp." : "Mật khẩu không khớp."}
                      </span>
                    )}
                  </Field>
                </div>
              </div>
            </div>

            <div className="cew-actions">
              <Button type="button" variant="outline" onClick={resetForm}>Làm mới</Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Đang tạo..." : "Tạo nhân viên"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Global CSS ---------------------------- */
function GlobalStyle() {
  return (
    <style>{`
      .cew-root {
        min-height: 100vh;
        background: radial-gradient(1200px 600px at 100% -10%, #DAF5E3 0%, ${THEME.bg} 55%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
        padding: 32px 20px 60px;
        display: flex;
        justify-content: center;
      }
      .cew-page { width: 100%; max-width: 800px; }

      .cew-shell {
        background: ${THEME.panel};
        border: 1.5px solid ${THEME.borderStrong};
        border-radius: 22px;
        padding: 24px 24px 28px;
        box-shadow: 0 24px 50px rgba(22,163,74,0.12), 0 2px 8px rgba(22,163,74,0.06);
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .cew-topbar { }
      .cew-title { color: ${THEME.textPrimary}; font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .cew-subtitle { color: ${THEME.textMuted}; font-size: 13px; margin: 0; }

      .cew-success {
        display: flex; align-items: center; gap: 8px;
        background: ${THEME.successSoft}; color: ${THEME.success};
        border: 1px solid rgba(22,163,74,0.3); border-radius: 10px; padding: 12px 16px; font-size: 13.5;
      }
      .cew-error-banner {
        display: flex; align-items: center; gap: 8px;
        background: ${THEME.dangerSoft}; color: ${THEME.danger};
        border: 1px solid rgba(220,38,38,0.3); border-radius: 10px; padding: 12px 16px; font-size: 13.5;
      }

      .cew-card {
        background: #FCFFFD;
        border: 1.5px solid ${THEME.border};
        border-radius: 18px;
        padding: 26px;
        display: flex; flex-direction: column; gap: 26px;
        box-shadow: 0 14px 30px rgba(22,163,74,0.08);
      }
      .cew-section { display: flex; flex-direction: column; gap: 14px; padding-bottom: 22px; border-bottom: 1px solid ${THEME.border}; }
      .cew-section:last-of-type { border-bottom: none; padding-bottom: 0; }
      .cew-section-title { color: ${THEME.textPrimary}; font-size: 14px; font-weight: 700; }

      .cew-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      @media (max-width: 560px) { .cew-grid { grid-template-columns: 1fr; } }

      .cew-input:focus { border-color: ${THEME.accent} !important; box-shadow: 0 0 0 3px ${THEME.accentSoft}; }
      .cew-input:disabled { opacity: .6; cursor: not-allowed; }

      .cew-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .cew-chip {
        border: 1.5px solid ${THEME.border}; background: #F6FDF8; color: ${THEME.textSecondary};
        padding: 7px 14px; border-radius: 999px; font-size: 12.5; cursor: pointer; font-weight: 600; transition: all .15s ease;
      }
      .cew-chip:hover { border-color: ${THEME.borderStrong}; }
      .cew-chip-active { border-color: ${THEME.accent}; color: ${THEME.accent}; background: ${THEME.accentSoft}; box-shadow: 0 0 0 3px ${THEME.accentSoft}; }

      .cew-account-panel {
        background: #F6FDF8; border: 1.5px solid ${THEME.border}; border-radius: 12px; padding: 18px;
      }

      .cew-match-icon {
        position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
        display: flex; align-items: center; justify-content: center;
      }

      .cew-actions { display: flex; justify-content: flex-end; gap: 10px; }

      @media (max-width: 480px) {
        .cew-shell { padding: 16px; border-radius: 18px; }
        .cew-card { padding: 18px; }
      }
    `}</style>
  );
}