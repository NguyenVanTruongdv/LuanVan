import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi"; // ⚠️ chỉnh lại path nếu khác vị trí thực tế
/* =========================================================================
 * THEME TOKENS — tông trắng + xanh lá, viền chia theo từng nhóm nội dung
 * cho dễ phân biệt (xanh lá = thông tin cơ bản, xanh dương = FaceID).
 * ========================================================================= */
const THEME = {
  bg: "#EEFBF3",
  panel: "#FFFFFF",
  border: "#CDEED9",
  borderStrong: "#4ADE80",
  accent: "#16A34A",
  accentDark: "#15803D",
  accentSoft: "rgba(22,163,74,0.08)",

  face: "#2563EB",
  faceDark: "#1D4ED8",
  faceBorder: "#BFDBFE",
  faceBorderStrong: "#60A5FA",
  faceSoft: "rgba(37,99,235,0.08)",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.08)",
  success: "#16A34A",
  successSoft: "rgba(22,163,74,0.08)",
};

// ⚠️ Mặc định vai trò Staff cho mọi nhân viên tạo mới — không cho chọn vai trò trên UI này.
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
  Camera: (p) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 8a2 2 0 012-2h1.2l.9-1.5A2 2 0 019.8 3.5h4.4a2 2 0 011.7 1L16.8 6H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <circle cx="12" cy="13" r="3.4" />
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
    outline: { background: "#FFFFFF", borderColor: THEME.borderStrong, color: THEME.textSecondary },
    ghost: { background: "transparent", color: THEME.textSecondary },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------- Face check badge ---------------------------- */
function FaceCheckBadge({ status, message, duplicateName }) {
  if (status === "idle") return null;
  const map = {
    checking: { color: THEME.face, bg: THEME.faceSoft, text: "Đang kiểm tra khuôn mặt..." },
    ok: { color: THEME.success, bg: THEME.successSoft, text: message || "Ảnh hợp lệ, có thể lưu." },
    duplicate: {
      color: THEME.danger,
      bg: THEME.dangerSoft,
      text: `${message || "Khuôn mặt này đã tồn tại trong hệ thống."}${duplicateName ? ` — ${duplicateName}` : ""}`,
    },
    // isValid === false (không phải trùng, mà là không nhận diện được khuôn mặt rõ ràng...)
    invalid: {
      color: THEME.danger,
      bg: THEME.dangerSoft,
      text: message || "Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại.",
    },
    error: { color: THEME.danger, bg: THEME.dangerSoft, text: message || "Không thể kiểm tra khuôn mặt lúc này." },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status === "checking" ? (
        <span className="cew-spinner" />
      ) : status === "duplicate" || status === "invalid" || status === "error" ? (
        <Icon.Alert />
      ) : (
        <Icon.Check />
      )}
      {cfg.text}
    </div>
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
export default function CreateEmployeePageOfAdmin({ onCreated, onBack }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingMe, setLoadingMe] = useState(true);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successName, setSuccessName] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");

  const [faceCheck, setFaceCheck] = useState({ status: "idle", message: "", duplicateName: "" });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    gender: GENDER_OPTIONS[0],
    roleId: STAFF_ROLE_ID,
    branchIds: [],
    faceIdReason: "",
  });
  const [touched, setTouched] = useState({});

  const isManager = currentUser?.role === "Manager";
  const isAdmin = currentUser?.role === "Admin";
  const availableBranches = useMemo(
    () => (isAdmin ? branches : currentUser?.branches || []),
    [isAdmin, branches, currentUser]
  );
  const myBranchIds = useMemo(() => (currentUser?.branches || []).map((b) => b.branchId), [currentUser]);

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      try {
        const [meRes, branchRes] = await Promise.all([adminApi.getEmployeeProfile(), adminApi.getBranches()]);
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

  const runFaceCheck = async (file) => {
    setFaceCheck({ status: "checking", message: "", duplicateName: "" });
    try {
      const fd = new FormData();
      fd.append("ProfileImage", file);
      const res = await adminApi.checkEmployeeFace(fd);
      const data = res?.data ?? res;
      // Response thật từ BE: { isValid, hasFace, isDuplicate, duplicateOwnerType,
      // duplicateMemberId, duplicateEmployeeId, similarity, message }
      // Chỉ coi là hợp lệ khi isValid === true VÀ isDuplicate !== true — không được
      // chỉ dựa vào isDuplicate như trước (ảnh không thấy mặt rõ nhưng không trùng
      // vẫn bị tính "ok" là sai).
      if (data?.isDuplicate) {
        setFaceCheck({
          status: "duplicate",
          message: data?.message || "Khuôn mặt này đã tồn tại trong hệ thống.",
          duplicateName: data?.employeeName || data?.matchedEmployeeName || "",
        });
      } else if (data?.isValid !== true) {
        setFaceCheck({
          status: "invalid",
          message: data?.message || "Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại.",
          duplicateName: "",
        });
      } else {
        setFaceCheck({ status: "ok", message: data?.message || "", duplicateName: "" });
      }
    } catch (e) {
      setFaceCheck({
        status: "error",
        message: e?.response?.data?.message || "Không thể kiểm tra khuôn mặt lúc này.",
        duplicateName: "",
      });
    }
  };

  const handleImage = (file) => {
    setImageError("");
    setFaceCheck({ status: "idle", message: "", duplicateName: "" });
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Vui lòng chọn 1 file ảnh hợp lệ.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    runFaceCheck(file);
  };

  const toggleBranch = (id) => {
    setForm((f) => {
      const has = f.branchIds.includes(id);
      return { ...f, branchIds: has ? f.branchIds.filter((x) => x !== id) : [...f.branchIds, id] };
    });
  };

  const errors = {
    fullName: !form.fullName.trim() ? "Vui lòng nhập họ tên." : "",
    phone: !form.phone.trim() ? "Vui lòng nhập số điện thoại." : "",
    branchIds: form.branchIds.length === 0 ? "Chọn ít nhất 1 chi nhánh." : "",
    // Ảnh FaceID không còn bắt buộc — nhưng nếu ĐÃ chọn ảnh thì phải kiểm tra xong và hợp lệ
    // (isValid === true, isDuplicate !== true) mới cho submit.
    faceCheck:
      imageFile && faceCheck.status === "checking"
        ? "Vui lòng chờ kiểm tra khuôn mặt hoàn tất."
        : imageFile && faceCheck.status === "duplicate"
          ? faceCheck.message || "Khuôn mặt trùng với nhân viên đã tồn tại."
          : imageFile && faceCheck.status === "invalid"
            ? faceCheck.message || "Ảnh không nhận diện được khuôn mặt rõ ràng. Vui lòng chụp lại."
            : imageFile && faceCheck.status === "error"
              ? faceCheck.message || "Không thể kiểm tra khuôn mặt lúc này."
              : "",
  };
  const hasBlockingError = Object.values(errors).some(Boolean);

  const resetForm = () => {
    setForm({
      fullName: "",
      phone: "",
      gender: GENDER_OPTIONS[0],
      roleId: STAFF_ROLE_ID,
      branchIds: isManager && myBranchIds.length === 1 ? [myBranchIds[0]] : [],
      faceIdReason: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setFaceCheck({ status: "idle", message: "", duplicateName: "" });
    setTouched({});
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    setTouched({ fullName: true, phone: true, branchIds: true });
    if (hasBlockingError) return;

    setSaving(true);
    try {
      // POST: api/employee/with-faceid (multipart/form-data)
      const fd = new FormData();
      fd.append("FullName", form.fullName.trim());
      fd.append("Phone", form.phone.trim());
      fd.append("Gender", form.gender);
      fd.append("RoleId", form.roleId);
      form.branchIds.forEach((id) => fd.append("BranchIds", id));
      if (imageFile) {
        fd.append("ProfileImage", imageFile);
        if (form.faceIdReason.trim()) {
          fd.append("FaceIdReason", form.faceIdReason.trim());
        }
      }

      const res = await adminApi.createEmployeeWithFaceId(fd);
      const created = res?.data ?? res;
      setSuccessName(form.fullName.trim());
      resetForm();
      if (onCreated) onCreated(created);
    } catch (e) {
      setSubmitError(e?.response?.data?.message || "Tạo nhân viên thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !saving && faceCheck.status !== "checking";

  return (
    <div className="cew-root">
      <GlobalStyle />
      <div className="cew-page">
        <div className="cew-shell">
          <div className="cew-topbar">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/employees")} style={{ marginBottom: 14 }}>
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
            {/* Ảnh FaceID */}
            <div className="cew-section cew-section-face">
              <div className="cew-section-title cew-section-title-face">Ảnh FaceID</div>
              <div className="cew-face-row">
                <label className="cew-face-drop" style={imagePreview ? { padding: 0, border: "none" } : {}}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="cew-face-preview" />
                  ) : (
                    <>
                      <Icon.Camera style={{ color: THEME.face }} />
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
                    Đăng ký FaceID <b style={{ color: THEME.textPrimary }}>không bắt buộc</b> — bạn có thể chọn ảnh
                    chân dung ngay bây giờ, hoặc bỏ qua và đăng ký FaceID sau ở trang chi tiết nhân viên. Nếu chọn
                    ảnh, hệ thống sẽ kiểm tra trùng khuôn mặt trước khi tạo.
                  </div>
                  {imageError && (
                    <div style={{ color: THEME.danger, fontSize: 11.5, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon.Alert /> {imageError}
                    </div>
                  )}
                  {imageFile && (
                    <button type="button" className="cew-remove-img" onClick={() => handleImage(null)}>
                      <Icon.X /> Xoá ảnh đã chọn
                    </button>
                  )}
                  <FaceCheckBadge status={faceCheck.status} message={faceCheck.message} duplicateName={faceCheck.duplicateName} />
                  {touched.image && errors.faceCheck && (
                    <div style={{ color: THEME.danger, fontSize: 11.5, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon.Alert /> {errors.faceCheck}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thông tin cơ bản */}
            <div className="cew-section cew-section-basic">
              <div className="cew-section-title cew-section-title-basic">Thông tin cơ bản</div>
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
              </div>

              <Field
                label="Chi nhánh"
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

              {imageFile && (
                <Field label="Lý do đăng ký FaceID" hint="Không bắt buộc — bỏ trống sẽ dùng lý do mặc định của hệ thống.">
                  <TextInput
                    value={form.faceIdReason}
                    onChange={(e) => update({ faceIdReason: e.target.value })}
                    placeholder="VD: Đăng ký FaceID khi tạo hồ sơ nhân viên"
                  />
                </Field>
              )}
            </div>

            <div className="cew-actions">
              <Button type="button" variant="outline" onClick={resetForm}>Làm mới</Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Đang tạo..." : faceCheck.status === "checking" ? "Đang kiểm tra khuôn mặt..." : "Tạo nhân viên"}
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
        box-shadow: 0 24px 50px rgba(22,163,74,0.14), 0 2px 8px rgba(22,163,74,0.08);
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
        border: 1px solid rgba(22,163,74,0.35); border-radius: 10px; padding: 12px 16px; font-size: 13.5;
      }
      .cew-error-banner {
        display: flex; align-items: center; gap: 8px;
        background: ${THEME.dangerSoft}; color: ${THEME.danger};
        border: 1px solid rgba(220,38,38,0.35); border-radius: 10px; padding: 12px 16px; font-size: 13.5;
      }

      .cew-card {
        background: #FCFFFD;
        border: 1.5px solid ${THEME.border};
        border-radius: 18px;
        padding: 26px;
        display: flex; flex-direction: column; gap: 26px;
        box-shadow: 0 14px 30px rgba(22,163,74,0.10);
      }

      /* Mỗi section có viền trái màu riêng để phân biệt nhanh: xanh dương = FaceID, xanh lá = thông tin cơ bản */
      .cew-section {
        display: flex; flex-direction: column; gap: 14px;
        padding: 4px 0 22px 18px;
        border-bottom: 1px solid ${THEME.border};
        border-left: 3px solid transparent;
      }
      .cew-section:last-of-type { border-bottom: none; padding-bottom: 0; }

      .cew-section-face {
        border-left-color: ${THEME.faceBorderStrong};
      }
      .cew-section-basic {
        border-left-color: ${THEME.borderStrong};
      }

      .cew-section-title { color: ${THEME.textPrimary}; font-size: 14px; font-weight: 700; }
      .cew-section-title-face { color: ${THEME.faceDark}; }
      .cew-section-title-basic { color: ${THEME.accentDark}; }

      .cew-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      @media (max-width: 560px) { .cew-grid { grid-template-columns: 1fr; } }

      .cew-input:focus { border-color: ${THEME.accent} !important; box-shadow: 0 0 0 3px ${THEME.accentSoft}; }
      .cew-input:disabled { opacity: .6; cursor: not-allowed; }

      .cew-face-row { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
      .cew-face-drop {
        width: 96px; height: 96px; border-radius: 14px; border: 1.5px dashed ${THEME.faceBorderStrong};
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
        color: ${THEME.textMuted}; font-size: 10.5px; text-align: center; cursor: pointer; flex-shrink: 0;
        overflow: hidden; background: #F5F9FF; transition: all .15s ease;
      }
      .cew-face-drop:hover { border-color: ${THEME.face}; color: ${THEME.face}; box-shadow: 0 0 0 4px ${THEME.faceSoft}; }
      .cew-face-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; border: 1.5px solid ${THEME.faceBorderStrong}; }
      .cew-remove-img {
        margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF;
        border: 1px solid ${THEME.faceBorder}; color: ${THEME.textSecondary}; font-size: 12px; font-weight: 600;
        border-radius: 8px; padding: 5px 10px; cursor: pointer;
      }
      .cew-remove-img:hover { color: ${THEME.danger}; border-color: ${THEME.danger}; }

      .cew-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .cew-chip {
        border: 1.5px solid ${THEME.border}; background: #F6FDF8; color: ${THEME.textSecondary};
        padding: 7px 14px; border-radius: 999px; font-size: 12.5; cursor: pointer; font-weight: 600; transition: all .15s ease;
      }
      .cew-chip:hover { border-color: ${THEME.borderStrong}; }
      .cew-chip-active { border-color: ${THEME.accent}; color: ${THEME.accent}; background: ${THEME.accentSoft}; box-shadow: 0 0 0 3px ${THEME.accentSoft}; }

      .cew-match-icon {
        position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
        display: flex; align-items: center; justify-content: center;
      }

      .cew-spinner {
        width: 12px; height: 12px; border-radius: 50%;
        border: 2px solid ${THEME.faceSoft}; border-top-color: ${THEME.face};
        animation: cew-spin .7s linear infinite;
      }
      @keyframes cew-spin { to { transform: rotate(360deg); } }

      .cew-actions { display: flex; justify-content: flex-end; gap: 10px; }

      @media (max-width: 480px) {
        .cew-shell { padding: 16px; border-radius: 18px; }
        .cew-card { padding: 18px; }
        .cew-face-row { flex-direction: column; }
      }
    `}</style>
  );
}