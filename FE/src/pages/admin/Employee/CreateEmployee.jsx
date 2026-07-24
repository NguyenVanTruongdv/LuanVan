import { useEffect, useMemo, useState } from "react";
import managerApi from "../../../api/managerApi";

/* =========================================================================
 * THEME TOKENS — đồng bộ với trang Login / trang danh sách nhân viên
 * ========================================================================= */
const THEME = {
  bg: "#0B1120",
  panel: "#1E293B",
  border: "#334155",
  accent: "#06B6D4",
  accentDark: "#0891B2",
  accentSoft: "rgba(6,182,212,0.14)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.14)",
  success: "#34D399",
  successSoft: "rgba(52,211,153,0.14)",
};

// ⚠️ Giả định mapping RoleId <-> tên vai trò vì BE chưa cung cấp API danh sách Role.
// Thay bằng dữ liệu thật (gọi API roles) nếu hệ thống của bạn có endpoint tương ứng.
const ROLE_OPTIONS = [
  { id: 1, name: "Admin" },
  { id: 2, name: "Manager" },
  { id: 3, name: "Staff" },
];
const STAFF_ROLE_ID = 3;
const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];

/* ---------------------------- Icons ---------------------------- */
const Icon = {
  Plus: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
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
  Camera: (p) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 8a2 2 0 012-2h1.2l.9-1.5A2 2 0 019.8 3.5h4.4a2 2 0 011.7 1L16.8 6H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  ),
};

/* ---------------------------- Primitives (dùng chung style) ---------------------------- */
const inputStyle = {
  background: "#0f172a",
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
function Button({ variant = "solid", tone = "accent", children, style, ...rest }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13.5,
    fontWeight: 600,
    borderRadius: 10,
    padding: "10px 18px",
    cursor: rest.disabled ? "not-allowed" : "pointer",
    opacity: rest.disabled ? 0.5 : 1,
    transition: "all .15s ease",
    border: "1px solid transparent",
  };
  const variants = {
    solid: { background: tone === "danger" ? THEME.danger : THEME.accent, color: tone === "danger" ? "#2a0a0a" : "#042a30" },
    outline: { background: "transparent", borderColor: THEME.border, color: THEME.textPrimary },
    ghost: { background: "transparent", color: THEME.textSecondary },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------- Main Page ---------------------------- */
export default function CreateEmployeePageOfAdmin({ onCreated, onBack }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingMe, setLoadingMe] = useState(true);

  const [showAccount, setShowAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successName, setSuccessName] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    gender: GENDER_OPTIONS[0],
    roleId: STAFF_ROLE_ID,
    branchIds: [],
    faceIdReason: "",
    loginEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({});

  const isManager = currentUser?.role === "Manager";
  const isAdmin = currentUser?.role === "Admin";
  // Manager: dùng ĐÚNG danh sách chi nhánh trả về trong getEmployeeProfile() (currentUser.branches)
  // làm nguồn duy nhất — không đối chiếu qua API getBranches() nữa để tránh lệch dữ liệu.
  // Admin: dùng danh sách đầy đủ từ getBranches().
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
        // authApi.get() ở một số dự án đã tự unwrap sẵn thành object JSON (không còn lớp .data),
        // nên ở đây tự nhận diện cả 2 trường hợp để tránh currentUser bị undefined.
        const me = meRes?.data && typeof meRes.data === "object" && "role" in meRes.data ? meRes.data : meRes;
        const branchList = Array.isArray(branchRes?.data) ? branchRes.data : Array.isArray(branchRes) ? branchRes : [];
        // eslint-disable-next-line no-console
        console.log("[CreateEmployeePage] profile:", me);
        // eslint-disable-next-line no-console
        console.log("[CreateEmployeePage] branches:", branchList);
        setCurrentUser(me);
        setBranches(branchList);
      } catch (e) {
        setSubmitError("Không tải được thông tin tài khoản / chi nhánh.");
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  // Manager luôn bị BE ép về Staff -> khoá roleId, và nếu chỉ phụ trách đúng 1 chi nhánh thì tự chọn sẵn.
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

  const handleImage = (file) => {
    setImageError("");
    if (file && !file.type.startsWith("image/")) {
      setImageError("Vui lòng chọn 1 file ảnh hợp lệ.");
      return;
    }
    setImageFile(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const toggleBranch = (id) => {
    if (isStaffRole) {
      update({ branchIds: [id] }); // Staff chỉ được đúng 1 chi nhánh
      return;
    }
    setForm((f) => {
      const has = f.branchIds.includes(id);
      return { ...f, branchIds: has ? f.branchIds.filter((x) => x !== id) : [...f.branchIds, id] };
    });
  };

  // Khi đổi sang vai trò Staff mà đang chọn nhiều chi nhánh -> tự rút về 1
  useEffect(() => {
    if (isStaffRole && form.branchIds.length > 1) {
      update({ branchIds: [form.branchIds[0]] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaffRole]);

  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  // Tài khoản nhân viên đăng nhập bằng Email — bắt buộc phải có Email.
  const hasLoginContact = form.loginEmail.trim().length > 0;

  const errors = {
    fullName: !form.fullName.trim() ? "Vui lòng nhập họ tên." : "",
    phone: !form.phone.trim() ? "Vui lòng nhập số điện thoại." : "",
    branchIds: form.branchIds.length === 0 ? "Chọn ít nhất 1 chi nhánh." : "",
    image: !imageFile ? "Bắt buộc có ảnh để đăng ký FaceID." : "",
    loginContact: showAccount && !hasLoginContact ? "Vui lòng nhập Email đăng nhập." : "",
    password: showAccount && !form.password ? "Vui lòng nhập mật khẩu." : "",
    confirmPassword: showAccount && form.password && !passwordsMatch ? "Mật khẩu nhập lại không khớp." : "",
  };
  const hasBlockingError = Object.values(errors).some(Boolean);

  const toggleAccountSection = () => {
    setShowAccount((s) => {
      const next = !s;
      if (!next) {
        // đóng lại thì xoá dữ liệu tài khoản đã nhập để tránh gửi nhầm
        update({ loginEmail: "", password: "", confirmPassword: "" });
        setTouched((t) => ({ ...t, loginContact: false, password: false, confirmPassword: false }));
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      phone: "",
      gender: GENDER_OPTIONS[0],
      roleId: isManager ? STAFF_ROLE_ID : STAFF_ROLE_ID,
      branchIds: isManager && myBranchIds.length === 1 ? [myBranchIds[0]] : [],
      faceIdReason: "",
      loginEmail: "",
      password: "",
      confirmPassword: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setShowAccount(false);
    setTouched({});
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    setTouched({
      fullName: true, phone: true, branchIds: true, image: true,
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
        profileImage: imageFile,
        faceIdReason: form.faceIdReason || undefined,
      };
      if (showAccount) {
        payload.loginEmail = form.loginEmail.trim();
        payload.password = form.password;
        await managerApi.createEmployeeWithAccount(payload);
      } else {
        await managerApi.createEmployeeWithFaceId(payload);
      }
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

  return (
    <div className="cew-root">
      <GlobalStyle />
      <div className="cew-page">
        <div className="cew-topbar">
          <button className="cew-back" onClick={() => (onBack ? onBack() : window.history.back())}>
            <Icon.ArrowLeft /> Quay lại danh sách
          </button>
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
          {/* Ảnh FaceID */}
          <div className="cew-section">
            <div className="cew-section-title">Ảnh FaceID <span style={{ color: THEME.accent }}>*</span></div>
            <div className="cew-face-row">
              <label className="cew-face-drop" style={imagePreview ? { padding: 0, border: "none" } : {}}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="cew-face-preview" />
                ) : (
                  <>
                    <Icon.Camera style={{ color: THEME.textMuted }} />
                    <span>Chọn ảnh chân dung</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => { handleImage(e.target.files?.[0]); markTouched("image"); }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: THEME.textSecondary, fontSize: 12.5, lineHeight: 1.6 }}>
                  Mọi nhân viên tạo mới đều <b style={{ color: THEME.textPrimary }}>bắt buộc</b> đăng ký FaceID ngay
                  bằng một ảnh chân dung rõ mặt. Ảnh này dùng để nhận diện khi chấm công / ra vào.
                </div>
                {imageFile && (
                  <button type="button" className="cew-remove-img" onClick={() => handleImage(null)}>
                    <Icon.X /> Xoá ảnh đã chọn
                  </button>
                )}
                {touched.image && errors.image && (
                  <div style={{ color: THEME.danger, fontSize: 11.5, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon.Alert /> {errors.image}
                  </div>
                )}
              </div>
            </div>
          </div>

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

            <Field label="Lý do đăng ký FaceID" hint="Không bắt buộc — bỏ trống sẽ dùng lý do mặc định của hệ thống.">
              <TextInput
                value={form.faceIdReason}
                onChange={(e) => update({ faceIdReason: e.target.value })}
                placeholder="VD: Đăng ký FaceID khi tạo hồ sơ nhân viên"
              />
            </Field>
          </div>

          {/* Tài khoản đăng nhập — tuỳ chọn qua nút tròn */}
          <div className="cew-section">
            <div className="cew-account-toggle-row">
              <div>
                <div className="cew-section-title" style={{ marginBottom: 2 }}>Tài khoản đăng nhập</div>
                <div style={{ color: THEME.textMuted, fontSize: 12 }}>
                  Không bắt buộc — có thể thêm sau ở trang chi tiết nhân viên.
                </div>
              </div>
              <button
                type="button"
                className={`cew-round-btn ${showAccount ? "cew-round-btn-active" : ""}`}
                onClick={toggleAccountSection}
                aria-label={showAccount ? "Ẩn phần tài khoản đăng nhập" : "Thêm tài khoản đăng nhập"}
                title={showAccount ? "Ẩn tài khoản đăng nhập" : "Thêm tài khoản đăng nhập"}
              >
                {showAccount ? <Icon.X /> : <Icon.Plus />}
              </button>
            </div>

            {showAccount && (
              <div className="cew-account-panel">
                <div style={{ color: THEME.textMuted, fontSize: 11.5, marginTop: -6 }}>
                  Tài khoản nhân viên đăng nhập bằng Email — bắt buộc phải nhập Email.
                </div>
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
                        <span
                          className="cew-match-icon"
                          style={{ color: passwordsMatch ? THEME.success : THEME.danger }}
                        >
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
            )}
          </div>

          <div className="cew-actions">
            <Button type="button" variant="outline" onClick={resetForm}>Làm mới</Button>
            <Button type="submit" disabled={saving}>{saving ? "Đang tạo..." : "Tạo nhân viên"}</Button>
          </div>
        </form>
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
        background: radial-gradient(1200px 600px at 100% -10%, #0f1b30 0%, ${THEME.bg} 55%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
        padding: 32px 20px 60px;
        display: flex;
        justify-content: center;
      }
      .cew-page { width: 100%; max-width: 780px; }
      .cew-topbar { margin-bottom: 20px; }
      .cew-back {
        display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none;
        color: ${THEME.textSecondary}; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 14px;
      }
      .cew-back:hover { color: ${THEME.accent}; }
      .cew-title { color: ${THEME.textPrimary}; font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .cew-subtitle { color: ${THEME.textMuted}; font-size: 13px; margin: 0; }

      .cew-success {
        display: flex; align-items: center; gap: 8px;
        background: ${THEME.successSoft}; color: ${THEME.success};
        border: 1px solid rgba(52,211,153,0.35); border-radius: 10px; padding: 12px 16px; font-size: 13.5; margin-bottom: 16px;
      }
      .cew-error-banner {
        display: flex; align-items: center; gap: 8px;
        background: ${THEME.dangerSoft}; color: ${THEME.danger};
        border: 1px solid rgba(248,113,113,0.35); border-radius: 10px; padding: 12px 16px; font-size: 13.5; margin-bottom: 16px;
      }

      .cew-card {
        background: ${THEME.panel}; border: 1px solid ${THEME.border}; border-radius: 16px;
        padding: 26px; display: flex; flex-direction: column; gap: 26px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.35);
      }
      .cew-section { display: flex; flex-direction: column; gap: 14px; padding-bottom: 22px; border-bottom: 1px solid ${THEME.border}; }
      .cew-section:last-of-type { border-bottom: none; padding-bottom: 0; }
      .cew-section-title { color: ${THEME.textPrimary}; font-size: 14px; font-weight: 700; }

      .cew-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      @media (max-width: 560px) { .cew-grid { grid-template-columns: 1fr; } }

      .cew-input:focus { border-color: ${THEME.accent} !important; box-shadow: 0 0 0 3px ${THEME.accentSoft}; }
      .cew-input:disabled { opacity: .6; cursor: not-allowed; }

      .cew-face-row { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
      .cew-face-drop {
        width: 96px; height: 96px; border-radius: 14px; border: 1.5px dashed ${THEME.border};
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
        color: ${THEME.textMuted}; font-size: 10.5px; text-align: center; cursor: pointer; flex-shrink: 0;
        overflow: hidden; background: #0f172a; transition: border-color .15s ease;
      }
      .cew-face-drop:hover { border-color: ${THEME.accent}; color: ${THEME.accent}; }
      .cew-face-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
      .cew-remove-img {
        margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; background: transparent;
        border: 1px solid ${THEME.border}; color: ${THEME.textSecondary}; font-size: 12px; font-weight: 600;
        border-radius: 8px; padding: 5px 10px; cursor: pointer;
      }
      .cew-remove-img:hover { color: ${THEME.danger}; border-color: ${THEME.danger}; }

      .cew-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .cew-chip {
        border: 1px solid ${THEME.border}; background: #0f172a; color: ${THEME.textSecondary};
        padding: 7px 14px; border-radius: 999px; font-size: 12.5; cursor: pointer; font-weight: 600; transition: all .15s ease;
      }
      .cew-chip-active { border-color: ${THEME.accent}; color: ${THEME.accent}; background: ${THEME.accentSoft}; }

      .cew-account-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
      .cew-round-btn {
        width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
        border: 1px solid ${THEME.border}; background: #0f172a; color: ${THEME.accent};
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: all .15s ease;
      }
      .cew-round-btn:hover { border-color: ${THEME.accent}; box-shadow: 0 0 0 4px ${THEME.accentSoft}; }
      .cew-round-btn-active { background: ${THEME.accent}; color: #042a30; border-color: ${THEME.accent}; }

      .cew-account-panel {
        background: #0f172a; border: 1px solid ${THEME.border}; border-radius: 12px; padding: 18px;
        animation: cew-fade .18s ease;
      }
      @keyframes cew-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

      .cew-match-icon {
        position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
        display: flex; align-items: center; justify-content: center;
      }

      .cew-actions { display: flex; justify-content: flex-end; gap: 10px; }

      @media (max-width: 480px) {
        .cew-card { padding: 18px; }
        .cew-face-row { flex-direction: column; }
      }
    `}</style>
  );
}