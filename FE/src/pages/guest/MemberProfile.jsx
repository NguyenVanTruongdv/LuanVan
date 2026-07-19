import { useEffect, useState } from "react";
import memberApi from "../../api/memberApi";
import Footer from "../../component/Footer";
import Header from "../../component/Header";
// Lưu ý: chỉnh lại 3 đường dẫn import phía trên cho khớp vị trí thực tế của
// Header.jsx / Footer.jsx / memberApi.js so với file này (MemberProfile) trong dự án của bạn.

/* ============================================================
   DESIGN TOKENS
   Nền gần đen, chữ trắng ngà, điểm nhấn cam-đỏ (đồng bộ với
   trang chủ phòng tập). Font tiêu đề condensed-bold, font nội
   dung Inter cho rõ ràng, dễ đọc số liệu.
   ============================================================ */

const ICONS = {
  face: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="6" height="6" rx="1" strokeLinecap="round" />
      <rect x="15" y="3" width="6" height="6" rx="1" strokeLinecap="round" />
      <rect x="3" y="15" width="6" height="6" rx="1" strokeLinecap="round" />
      <rect x="15" y="15" width="6" height="6" rx="1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" strokeLinecap="round" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 9.5h19" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3v18l2.2-1.4L9.4 21l2.2-1.4L13.8 21l2.2-1.4L18.2 21V3H5Z" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 12.5 9 17.5 20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15.5 4.5 19 8l-10 10L5 19l1-4Z" strokeLinejoin="round" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.4 4.3M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.9-.9M9.5 9.6a3 3 0 0 0 4.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 5l14 14M19 5 5 19" strokeLinecap="round" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9Z" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7 9.5 4h5L16 7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.4" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h3l1.5 4.5L8 9.5a11 11 0 0 0 6.5 6.5l2-2.5L21 15v3a2 2 0 0 1-2 2C11.5 20 4 12.5 4 5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  ),
};

const TAG_STYLE = {
  faceid: { label: "Cập nhật FaceID", color: "var(--accent)", icon: ICONS.face },
  info: { label: "Cập nhật thông tin", color: "#7FB2FF", icon: ICONS.edit },
  package: { label: "Gói tập", color: "#35C77E", icon: ICONS.card },
};

const STATUS_STYLE = {
  success: { label: "Thành công", color: "#35C77E" },
  paid: { label: "Đã thanh toán", color: "#35C77E" },
  pending: { label: "Chờ xử lý", color: "#FFB020" },
  refunded: { label: "Đã hoàn tiền", color: "#FFB020" },
  cancelled: { label: "Đã hủy", color: "#FF5A5A" },
  failed: { label: "Thất bại", color: "#FF5A5A" },
};

const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];
// API trả gender dạng "Male" / "Female" / khác — map sang nhãn hiển thị tiếng Việt
const GENDER_API_TO_LABEL = { Male: "Nam", Female: "Nữ" };
const GENDER_LABEL_TO_API = { Nam: "Male", Nữ: "Female", Khác: "Other" };

/* ============================================================
   HELPERS — chuyển đổi dữ liệu thô từ API sang cấu trúc UI
   ============================================================ */

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

function formatDateTime(iso) {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toLocaleDateString("vi-VN"),
    time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatCurrency(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("vi-VN") + "đ";
}

function sessionTypeToTag(sessionType) {
  if (sessionType === "FACEID") return "faceid";
  if (sessionType === "PACKAGE_ADJUST") return "package";
  return "info";
}

function buildLogText(changes) {
  if (!changes || changes.length === 0) return "";
  return changes
    .map((c) => `${c.fieldName}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`)
    .join(" · ");
}

// Map response thô từ getMe() -> state dùng cho UI
function mapProfileResponse(raw) {
  if (!raw) return null;

  const genderLabel = GENDER_API_TO_LABEL[raw.gender] || raw.gender || "Khác";

  const user = {
    memberId: raw.memberId,
    name: raw.fullName || "",
    tier: raw.membershipPlanReponse?.planName || "Hội viên",
    since: formatDate(raw.joinedAt),
    phone: raw.phone || "",
    gender: genderLabel,
    avatar: raw.avatar || null,
    branchName: raw.branchName || "—",
    faceId: {
      verified: !!raw.avatar,
      lastSync: raw.update || "—",
      branch: raw.branchName || "—",
    },
  };

  const plan = raw.membershipPlanReponse;
  let pkg = null;
  if (plan) {
    const totalDays = plan.startDate && plan.endDate
      ? Math.max(1, Math.round((new Date(plan.endDate) - new Date(plan.startDate)) / 86400000))
      : 0;
    const daysLeft = plan.endDate
      ? Math.max(0, Math.round((new Date(plan.endDate) - new Date()) / 86400000))
      : 0;
    pkg = {
      name: plan.planName,
      price: formatCurrency(plan.price),
      start: formatDate(plan.startDate),
      end: formatDate(plan.endDate),
      daysLeft,
      totalDays: totalDays || 1,
      description: plan.description,
      perks: [],
    };
  }

  const history = (raw.updateHistory || []).map((h) => {
    const { date, time } = formatDateTime(h.updatedAt);
    return {
      sessionId: h.sessionId,
      date,
      time,
      tag: sessionTypeToTag(h.sessionType),
      staff: h.employeeName,
      reason: h.reason,
      log: buildLogText(h.changes),
      oldImageUrl: h.oldImageUrl,
      newImageUrl: h.newImageUrl,
    };
  });

  // avatar: đọc theo nhiều tên field phòng trường hợp BE trả tên khác nhau
  // tuỳ endpoint (urlImg / avatar / image...).
  const transactions = (raw.historyTransaction || []).map((t) => ({
    transactionId: t.transactionId,
    name: t.fullName,
    phone: t.phone,
    avatar: t.urlImg || t.avatar || t.image || null,
    package: t.planName,
    channel: t.purchaseChannel,
    start: formatDate(t.startDate),
    end: formatDate(t.expiryDate),
    amount: formatCurrency(t.amount),
    originalAmount: t.originalAmount,
    status: (t.status || "").toLowerCase(),
    invoiceId: t.orderCode,
  }));

  return { user, pkg, history, transactions };
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function MemberProfilePage() {
  const [tab, setTab] = useState("info");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [profile, setProfile] = useState(null); // { name, gender, phone, ... }
  const [pkg, setPkg] = useState(null);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [saveError, setSaveError] = useState(null);
  const [showFaceView, setShowFaceView] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal xem hóa đơn giao dịch
  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    loading: false,
    error: null,
    blobUrl: "",
    contentType: "",
    item: null,
  });

  const fetchProfile = () => {
    setLoading(true);
    setLoadError(null);
    memberApi
      .getMe()
      .then((res) => {
        const mapped = mapProfileResponse(res?.data ?? res);
        if (!mapped) throw new Error("Dữ liệu hồ sơ trống");
        setProfile(mapped.user);
        setPkg(mapped.pkg);
        setHistory(mapped.history);
        setTransactions(mapped.transactions);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message || err?.message || "Không thể tải hồ sơ hội viên.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const progress = pkg ? Math.round(((pkg.totalDays - pkg.daysLeft) / pkg.totalDays) * 100) : 0;

  const FIELDS = [
    { key: "name", label: "Họ và tên", type: "text" },
    { key: "gender", label: "Giới tính", type: "select", options: GENDER_OPTIONS },
    { key: "phone", label: "Số điện thoại", type: "tel" },
  ];

  const startEdit = () => {
    setDraft({ ...profile, password: "", confirmPassword: "" });
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setSaveError(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  const updateDraft = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  // Trạng thái so khớp mật khẩu — tính lại mỗi lần render dựa trên draft hiện tại,
  // dùng để hiện chỉ báo real-time (không cần đợi bấm "Lưu thay đổi").
  const passwordsFilled = !!(draft?.password || draft?.confirmPassword);
  const passwordsBothFilled = !!(draft?.password && draft?.confirmPassword);
  const passwordsMatch = passwordsBothFilled && draft.password === draft.confirmPassword;

  const saveEdit = () => {
    if (!draft) return;

    // Chỉ bắt buộc khớp mật khẩu nếu người dùng có nhập mật khẩu mới
    if (draft.password || draft.confirmPassword) {
      if (draft.password.length < 6) {
        setSaveError("Mật khẩu mới phải có ít nhất 6 ký tự.");
        return;
      }
      if (draft.password !== draft.confirmPassword) {
        setSaveError("Mật khẩu nhập lại không khớp.");
        return;
      }
    }

    setSaveError(null);
    setSaveState("saving");

    const payload = {
      fullName: draft.name,
      gender: GENDER_LABEL_TO_API[draft.gender] || draft.gender,
      phone: draft.phone,
    };
    if (draft.password) {
      payload.password = draft.password;
      payload.confirmPassword = draft.confirmPassword;
    }

    memberApi
      .updateMember(payload)
      .then(() => {
        setProfile((p) => ({ ...p, name: draft.name, gender: draft.gender, phone: draft.phone }));
        setIsEditing(false);
        setShowPassword(false);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1800);
      })
      .catch((err) => {
        setSaveError(err?.response?.data?.message || err?.message || "Cập nhật thất bại, vui lòng thử lại.");
        setSaveState("idle");
      });
  };

  const renderLog = (log) => {
    const idx = log.indexOf(":");
    if (idx === -1) return <>{log}</>;
    return (
      <>
        <strong>{log.slice(0, idx)}:</strong>
        {log.slice(idx + 1)}
      </>
    );
  };

  // Mở modal + gọi API lấy hóa đơn (memberApi.getInvoice cần trả về { blob, contentType },
  // tương tự cách managerApi.getInvoice đang làm ở trang quản lý).
  const handleViewInvoice = (tx) => {
    const transactionId = tx.transactionId;
    if (!transactionId) return;

    setInvoiceModal({ open: true, loading: true, error: null, blobUrl: "", contentType: "", item: tx });

    memberApi
      .getInvoice(transactionId)
      .then(({ blob, contentType }) => {
        const blobUrl = URL.createObjectURL(blob);
        setInvoiceModal({ open: true, loading: false, error: null, blobUrl, contentType, item: tx });
      })
      .catch((err) => {
        setInvoiceModal({
          open: true,
          loading: false,
          error: err?.response?.data?.message || err?.message || "Không thể tải hóa đơn.",
          blobUrl: "",
          contentType: "",
          item: tx,
        });
      });
  };

  const closeInvoiceModal = () => {
    if (invoiceModal.blobUrl) URL.revokeObjectURL(invoiceModal.blobUrl);
    setInvoiceModal({ open: false, loading: false, error: null, blobUrl: "", contentType: "", item: null });
  };

  const downloadInvoice = () => {
    if (!invoiceModal.blobUrl) return;
    const a = document.createElement("a");
    a.href = invoiceModal.blobUrl;
    let ext = "jpg";
    if (invoiceModal.contentType?.includes("pdf")) ext = "pdf";
    else if (invoiceModal.contentType?.includes("html")) ext = "html";
    else if (invoiceModal.contentType?.includes("png")) ext = "png";
    a.download = `hoa-don-${invoiceModal.item?.transactionId ?? "invoice"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const TABS = [
    { id: "info", label: "Thông tin cá nhân", icon: ICONS.user },
    { id: "package", label: "Gói tập hiện tại", icon: ICONS.card },
    { id: "history", label: "Lịch sử cập nhật", icon: ICONS.clock },
    { id: "transactions", label: "Lịch sử giao dịch", icon: ICONS.receipt },
  ];

  if (loading) {
    return (
      <>
        <Header />
        <div className="mp-root">
          <style>{ROOT_VARS_ONLY}</style>
          <div className="mp-shell mp-state-center">Đang tải hồ sơ hội viên…</div>
        </div>
        <Footer />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Header />
        <div className="mp-root">
          <style>{ROOT_VARS_ONLY}</style>
          <div className="mp-shell mp-state-center">
            <p style={{ color: "#FF5A5A", marginBottom: 14 }}>{loadError}</p>
            <button className="mp-btn solid" onClick={fetchProfile}>Thử lại</button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <Header />
      <div className="mp-root">
        <style>{FULL_STYLE}</style>

        <div className="mp-shell">
          {/* HERO */}
          <div className="mp-hero">
            <div className="mp-avatar-wrap">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="mp-avatar mp-avatar-img" />
              ) : (
                <div className="mp-avatar">{profile.name.trim().split(" ").slice(-1)[0]?.[0] || "?"}</div>
              )}
              {profile.faceId.verified && <div className="mp-face-badge">{ICONS.check}</div>}
            </div>
            <div className="mp-hero-info">
              <div className="mp-eyebrow">Hồ sơ hội viên</div>
              <h1 className="mp-name">{profile.name}</h1>
              <div className="mp-meta">
                <span>Mã hội viên: <b>{profile.memberId}</b></span>
                <span>SĐT: <b>{profile.phone}</b></span>
              </div>
            </div>
            <div className="mp-hero-cta">
              <span className="mp-tier-pill">{profile.tier}</span>
              <span className="mp-since">Thành viên từ {profile.since}</span>
            </div>
          </div>

          {/* TABS */}
          <div className="mp-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={"mp-tab" + (tab === t.id ? " active" : "")}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* PERSONAL INFO */}
          {tab === "info" && (
            <>
              <div className="mp-card">
                <div className="mp-card-title">{ICONS.face} Xác thực FaceID</div>
                <div className="mp-face-panel">
                  <div className="mp-scan-frame" onClick={() => setShowFaceView(true)} title="Xem ảnh FaceID">
                    <div className="mp-scan-corner tl" />
                    <div className="mp-scan-corner tr" />
                    <div className="mp-scan-corner bl" />
                    <div className="mp-scan-corner br" />
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="FaceID" className="mp-scan-face-img" />
                    ) : (
                      <div className="mp-scan-face">
                        <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <circle cx="12" cy="9" r="4" />
                          <path d="M5 20c1.5-4.2 4.3-6 7-6s5.5 1.8 7 6" />
                        </svg>
                      </div>
                    )}
                    <div className="mp-scan-line" />
                  </div>
                  <div className="mp-face-detail">
                    <div className="mp-face-status">
                      <span className="mp-status-dot" style={{ background: profile.faceId.verified ? "var(--success)" : "var(--text-faint)" }} />
                      <span className="mp-face-status-text" style={{ color: profile.faceId.verified ? "var(--success)" : "var(--text-muted)" }}>
                        {profile.faceId.verified ? "Đã xác thực" : "Chưa đăng ký FaceID"}
                      </span>
                    </div>
                    <div className="mp-face-sub">
                      Lần cập nhật gần nhất: {profile.faceId.lastSync}<br />
                      Chi nhánh: {profile.faceId.branch}
                    </div>
                    <button className="mp-btn" onClick={() => setShowFaceView(true)} disabled={!profile.avatar}>
                      {ICONS.eye} Xem ảnh FaceID
                    </button>
                  </div>
                </div>
              </div>

              <div className="mp-card">
                <div className="mp-info-head">
                  <div className="mp-card-title" style={{ marginBottom: 0 }}>{ICONS.user} Thông tin cá nhân</div>
                  {!isEditing && saveState === "idle" && (
                    <button className="mp-btn" onClick={startEdit}>{ICONS.edit} Chỉnh sửa</button>
                  )}
                  {saveState === "saved" && (
                    <span className="mp-saved-badge">{ICONS.check} Đã lưu thay đổi</span>
                  )}
                </div>

                <div className="mp-grid" style={{ marginTop: 20 }}>
                  {FIELDS.map((f) => (
                    <div className="mp-field" key={f.key}>
                      <label>{f.label}</label>
                      {isEditing ? (
                        f.type === "select" ? (
                          <select
                            className="mp-select"
                            value={draft[f.key]}
                            onChange={(e) => updateDraft(f.key, e.target.value)}
                          >
                            {f.options.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="mp-input"
                            type={f.type}
                            value={draft[f.key]}
                            onChange={(e) => updateDraft(f.key, e.target.value)}
                          />
                        )
                      ) : (
                        <div>{profile[f.key]}</div>
                      )}
                    </div>
                  ))}

                  {/* Mật khẩu — chỉ hiện khi đang chỉnh sửa */}
                  {isEditing && (
                    <>
                      <div className="mp-field full mp-pw-divider">
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {ICONS.lock} Đổi mật khẩu (tùy chọn — để trống nếu không đổi)
                        </label>
                      </div>
                      <div className="mp-field">
                        <label>Mật khẩu mới</label>
                        <div className="mp-pw-wrap">
                          <input
                            className={
                              "mp-input" +
                              (passwordsBothFilled ? (passwordsMatch ? " mp-input-ok" : " mp-input-bad") : "")
                            }
                            type={showPassword ? "text" : "password"}
                            placeholder="Để trống nếu không đổi mật khẩu"
                            value={draft.password}
                            onChange={(e) => updateDraft("password", e.target.value)}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="mp-pw-toggle"
                            onClick={() => setShowPassword((s) => !s)}
                            tabIndex={-1}
                          >
                            {showPassword ? ICONS.eyeOff : ICONS.eye}
                          </button>
                        </div>
                      </div>
                      <div className="mp-field">
                        <label>Nhập lại mật khẩu mới</label>
                        <input
                          className={
                            "mp-input" +
                            (passwordsBothFilled ? (passwordsMatch ? " mp-input-ok" : " mp-input-bad") : "")
                          }
                          type={showPassword ? "text" : "password"}
                          placeholder="Nhập lại mật khẩu mới"
                          value={draft.confirmPassword}
                          onChange={(e) => updateDraft("confirmPassword", e.target.value)}
                          autoComplete="new-password"
                        />
                        {/* Chỉ báo so khớp mật khẩu real-time, không cần đợi bấm Lưu */}
                        {passwordsFilled && (
                          <div className={"mp-pw-match" + (passwordsBothFilled ? (passwordsMatch ? " ok" : " bad") : "")}>
                            {!passwordsBothFilled ? (
                              <span className="mp-pw-hint">Nhập đủ cả hai ô để kiểm tra khớp</span>
                            ) : passwordsMatch ? (
                              <>{ICONS.check} Mật khẩu khớp</>
                            ) : (
                              <>{ICONS.close} Mật khẩu không khớp</>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {saveError && <div className="mp-error-text">{saveError}</div>}

                {isEditing && (
                  <div className="mp-edit-actions">
                    <button
                      className="mp-btn solid"
                      onClick={saveEdit}
                      disabled={saveState === "saving" || (passwordsBothFilled && !passwordsMatch)}
                    >
                      {saveState === "saving" ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                    <button className="mp-btn ghost" onClick={cancelEdit} disabled={saveState === "saving"}>
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* PACKAGE */}
          {tab === "package" && (
            <div className="mp-card">
              {pkg ? (
                <>
                  <div className="mp-pkg-top">
                    <div>
                      <h2 className="mp-pkg-name">{pkg.name}</h2>
                      <div className="mp-pkg-dates">Hiệu lực {pkg.start} – {pkg.end}</div>
                    </div>
                    <div className="mp-pkg-price">{pkg.price}</div>
                  </div>

                  <div className="mp-progress-wrap">
                    <div className="mp-progress-labels">
                      <span>Đã sử dụng {progress}%</span>
                      <span>Còn lại {pkg.daysLeft} ngày</span>
                    </div>
                    <div className="mp-progress-track">
                      <div className="mp-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                    </div>
                  </div>

                  {pkg.description && <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 16 }}>{pkg.description}</p>}

                  <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                    <button className="mp-btn solid">Gia hạn gói tập</button>
                    <button className="mp-btn">Xem chi tiết gói</button>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>Bạn chưa có gói tập nào đang hoạt động.</p>
              )}
            </div>
          )}

          {/* UPDATE HISTORY */}
          {tab === "history" && (
            <div className="mp-card">
              <div className="mp-card-title">{ICONS.clock} Lịch sử cập nhật</div>

              {history.length === 0 && <p style={{ color: "var(--text-muted)" }}>Chưa có lịch sử cập nhật.</p>}

              {history.map((item) => {
                const tg = TAG_STYLE[item.tag];
                return (
                  <div className="mp-log-item" key={item.sessionId}>
                    <div className="mp-log-top">
                      <span className="mp-log-tag" style={{ color: tg.color, background: tg.color + "22" }}>
                        {tg.icon}{tg.label}
                      </span>
                      <span className="mp-log-time">{item.date} {item.time}</span>
                    </div>
                    <div className="mp-log-staff">{item.staff}</div>

                    {item.tag === "faceid" ? (
                      <>
                        <div className="mp-face-compare">
                          <div className="mp-face-box">
                            {item.oldImageUrl ? (
                              <img src={item.oldImageUrl} alt="Trước" className="mp-face-box-img" />
                            ) : (
                              ICONS.camera
                            )}
                            <span className="mp-face-box-label">Trước</span>
                          </div>
                          <span className="mp-face-arrow">→</span>
                          <div className="mp-face-box filled">
                            {item.newImageUrl ? (
                              <img src={item.newImageUrl} alt="Sau" className="mp-face-box-img" />
                            ) : (
                              ICONS.face
                            )}
                            <span className="mp-face-box-label" style={{ color: "var(--accent)" }}>Sau</span>
                          </div>
                        </div>
                        {item.reason && <div className="mp-face-reason">Lý do: {item.reason}</div>}
                      </>
                    ) : (
                      <div className="mp-log-text">{renderLog(item.log)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TRANSACTIONS */}
          {tab === "transactions" && (
            <div className="mp-card">
              <div className="mp-card-title">{ICONS.receipt} Lịch sử giao dịch</div>
              <div className="mp-tx-list">
                {transactions.length === 0 && <p style={{ color: "var(--text-muted)" }}>Chưa có giao dịch nào.</p>}
                {transactions.map((tx) => {
                  const st = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
                  const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === tx;
                  return (
                    <div className="mp-tx-row" key={tx.transactionId}>
                      <div className="mp-tx-package">{tx.package}</div>
                      <span className="mp-tx-channel">{ICONS.globe}{tx.channel}</span>
                      <div className="mp-tx-dates">
                        <div className="mp-tx-date-row"><span className="mp-tx-date-label">Từ</span>{tx.start}</div>
                        <div className="mp-tx-date-row"><span className="mp-tx-date-label">Đến</span>{tx.end}</div>
                      </div>
                      <div className="mp-tx-amount">{tx.amount}</div>
                      <span className="mp-tx-status" style={{ color: st.color, background: st.color + "1A" }}>
                        {st.label}
                      </span>
                      <button
                        className="mp-tx-invoice-btn"
                        disabled={isThisLoading}
                        onClick={() => handleViewInvoice(tx)}
                      >
                        {ICONS.receipt} {isThisLoading ? "Đang tải..." : "Xem hóa đơn"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FACEID VIEW MODAL — chỉ xem, không cho cập nhật */}
        {showFaceView && (
          <div className="mp-modal-backdrop" onClick={() => setShowFaceView(false)}>
            <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mp-modal-head">
                <span className="mp-modal-title">Ảnh FaceID</span>
                <button className="mp-modal-close" onClick={() => setShowFaceView(false)}>{ICONS.close}</button>
              </div>
              <div className="mp-modal-face">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="FaceID" className="mp-modal-face-img" />
                ) : (
                  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M5 20c1.5-4.2 4.3-6 7-6s5.5 1.8 7 6" />
                  </svg>
                )}
              </div>
              <div className="mp-modal-meta">
                <div>Trạng thái: <b style={{ color: profile.faceId.verified ? "var(--success)" : "var(--text-muted)" }}>
                  {profile.faceId.verified ? "Đã xác thực" : "Chưa đăng ký"}
                </b></div>
                <div>Lần cập nhật gần nhất: <b>{profile.faceId.lastSync}</b></div>
                <div>Chi nhánh: <b>{profile.faceId.branch}</b></div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE VIEW MODAL — xem hóa đơn giao dịch (PDF/HTML dùng iframe, ảnh hiện trực tiếp) */}
        {invoiceModal.open && (
          <div className="mp-modal-backdrop" onClick={closeInvoiceModal}>
            <div className="mp-inv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mp-modal-head">
                <span className="mp-modal-title">
                  Hóa đơn{invoiceModal.item?.name ? ` - ${invoiceModal.item.name}` : ""}
                </span>
                <div className="mp-inv-head-actions">
                  {!invoiceModal.loading && !invoiceModal.error && (
                    <button className="mp-btn" onClick={downloadInvoice}>{ICONS.download} Tải về</button>
                  )}
                  <button className="mp-modal-close" onClick={closeInvoiceModal}>{ICONS.close}</button>
                </div>
              </div>
              <div className="mp-inv-body">
                {invoiceModal.loading ? (
                  <div className="mp-inv-state">Đang tải hóa đơn…</div>
                ) : invoiceModal.error ? (
                  <div className="mp-inv-state error">{invoiceModal.error}</div>
                ) : invoiceModal.contentType?.includes("pdf") || invoiceModal.contentType?.includes("html") ? (
                  <iframe title="Hóa đơn" src={invoiceModal.blobUrl} className="mp-inv-frame" />
                ) : (
                  <div className="mp-inv-img-wrap">
                    <img src={invoiceModal.blobUrl} alt="Hóa đơn" className="mp-inv-img" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const ROOT_VARS_ONLY = `
  .mp-root {
    --bg: #0B0B0D;
    --bg-card: #1A1B1F;
    --bg-card-2: #202126;
    --border: #2A2B30;
    --text: #F2F1ED;
    --text-muted: #96959D;
    --text-faint: #5C5B63;
    --accent: #FF4D2E;
    --accent-dim: rgba(255, 77, 46, 0.14);
    --success: #35C77E;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 32px 20px 80px;
    box-sizing: border-box;
  }
  .mp-shell { max-width: 980px; margin: 0 auto; }
  .mp-state-center { text-align: center; padding: 80px 20px; color: var(--text-muted); }
  .mp-btn.solid {
    background: var(--accent); color: #1A0A05; border: none;
    padding: 9px 16px; border-radius: 10px; font-weight: 600; font-size: 13px;
    cursor: pointer; font-family: inherit;
  }
`;

const FULL_STYLE = `
        .mp-root {
          --bg: #0B0B0D;
          --bg-card: #1A1B1F;
          --bg-card-2: #202126;
          --border: #2A2B30;
          --text: #F2F1ED;
          --text-muted: #96959D;
          --text-faint: #5C5B63;
          --accent: #FF4D2E;
          --accent-dim: rgba(255, 77, 46, 0.14);
          --success: #35C77E;

          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 32px 20px 80px;
          box-sizing: border-box;
        }
        .mp-root * { box-sizing: border-box; }
        .mp-shell { max-width: 980px; margin: 0 auto; }

        /* ---------- HERO ---------- */
        .mp-hero {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background:
            radial-gradient(circle at 15% 20%, rgba(255,77,46,0.18), transparent 45%),
            linear-gradient(135deg, #17181B 0%, #0E0E10 100%);
          border: 1px solid var(--border);
          padding: 30px 28px;
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .mp-avatar-wrap { position: relative; flex-shrink: 0; }
        .mp-avatar {
          width: 92px; height: 92px; border-radius: 50%;
          background: linear-gradient(145deg, #2A2B30, #17181B);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Oswald', sans-serif;
          font-size: 32px; font-weight: 700; color: var(--accent);
          border: 2px solid var(--border);
        }
        .mp-avatar-img { object-fit: cover; }
        .mp-face-badge {
          position: absolute; bottom: -2px; right: -2px;
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--success);
          border: 3px solid var(--bg);
          display: flex; align-items: center; justify-content: center;
          color: #06170F;
        }
        .mp-hero-info { flex: 1; min-width: 200px; }
        .mp-eyebrow {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--accent); font-weight: 700; margin-bottom: 6px;
        }
        .mp-name {
          font-family: 'Oswald', sans-serif;
          font-size: 30px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.01em; margin: 0 0 6px;
          line-height: 1.05;
        }
        .mp-meta { display: flex; gap: 18px; flex-wrap: wrap; color: var(--text-muted); font-size: 13px; }
        .mp-meta b { color: var(--text); font-weight: 600; }
        .mp-hero-cta {
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
        }
        .mp-tier-pill {
          background: var(--accent); color: #1A0A05;
          font-weight: 700; font-size: 12.5px;
          padding: 7px 14px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .mp-since { font-size: 12px; color: var(--text-faint); }

        /* ---------- TABS ---------- */
        .mp-tabs {
          display: flex; gap: 6px; margin: 26px 0 22px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 14px; padding: 6px; overflow-x: auto;
        }
        .mp-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px;
          background: transparent; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 13.5px; font-weight: 600;
          white-space: nowrap; transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .mp-tab:hover { color: var(--text); }
        .mp-tab.active { background: var(--accent-dim); color: var(--accent); }

        /* ---------- CARD BASE ---------- */
        .mp-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 16px; padding: 24px;
        }
        .mp-card + .mp-card { margin-top: 16px; }
        .mp-card-title {
          font-family: 'Oswald', sans-serif; text-transform: uppercase;
          font-size: 15px; letter-spacing: 0.04em; font-weight: 600;
          margin: 0 0 18px; display: flex; align-items: center; gap: 8px;
        }
        .mp-card-title svg { color: var(--accent); }

        /* ---------- FACEID PANEL ---------- */
        .mp-face-panel { display: flex; gap: 24px; flex-wrap: wrap; align-items: center; }
        .mp-scan-frame {
          width: 130px; height: 130px; position: relative; flex-shrink: 0;
          border-radius: 18px; background: #0E0F12; cursor: pointer; overflow: hidden;
        }
        .mp-scan-face-img { width: 100%; height: 100%; object-fit: cover; }
        .mp-scan-corner {
          position: absolute; width: 22px; height: 22px; z-index: 2;
          border: 2.5px solid var(--accent);
        }
        .mp-scan-corner.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; border-top-left-radius: 8px; }
        .mp-scan-corner.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; border-top-right-radius: 8px; }
        .mp-scan-corner.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; border-bottom-left-radius: 8px; }
        .mp-scan-corner.br { bottom: 8px; right: 8px; border-left: none; border-top: none; border-bottom-right-radius: 8px; }
        .mp-scan-line {
          position: absolute; left: 12px; right: 12px; height: 2px; z-index: 2;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          animation: mp-scan 2.6s ease-in-out infinite;
          box-shadow: 0 0 8px var(--accent);
        }
        @keyframes mp-scan {
          0%, 100% { top: 16px; opacity: 0.3; }
          50% { top: 112px; opacity: 1; }
        }
        .mp-scan-face { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #3A3B41; }
        .mp-face-detail { flex: 1; min-width: 200px; }
        .mp-face-status { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .mp-status-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(53,199,126,0.15); }
        .mp-face-status-text { font-weight: 700; font-size: 14px; }
        .mp-face-sub { color: var(--text-muted); font-size: 13px; line-height: 1.6; }
        .mp-btn {
          margin-top: 14px; display: inline-flex; align-items: center; gap: 7px;
          background: transparent; color: var(--accent); border: 1px solid var(--accent);
          padding: 9px 16px; border-radius: 10px; font-weight: 600; font-size: 13px;
          cursor: pointer; font-family: inherit; transition: background 0.15s;
        }
        .mp-btn:hover { background: var(--accent-dim); }
        .mp-btn.solid { background: var(--accent); color: #1A0A05; border: none; }
        .mp-btn.solid:hover { filter: brightness(1.08); }

        /* ---------- INFO GRID ---------- */
        .mp-info-head { display: flex; justify-content: space-between; align-items: center; }
        .mp-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 28px;
          margin-top: 4px;
        }
        .mp-field label {
          display: block; font-size: 11.5px; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-faint); margin-bottom: 5px; font-weight: 600;
        }
        .mp-field div { font-size: 14.5px; color: var(--text); }
        .mp-field.full { grid-column: 1 / -1; }
        .mp-pw-divider { border-top: 1px solid var(--border); padding-top: 16px; margin-top: 4px; }
        .mp-pw-divider label { color: var(--text-muted); font-size: 12.5px; text-transform: none; letter-spacing: 0; }
        .mp-pw-wrap { position: relative; }
        .mp-pw-wrap .mp-input { padding-right: 38px; }
        .mp-pw-toggle {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: transparent; border: none; color: var(--text-faint); cursor: pointer;
          padding: 4px; display: flex;
        }
        .mp-pw-toggle:hover { color: var(--text-muted); }
        .mp-input, .mp-select {
          width: 100%; background: var(--bg-card-2); color: var(--text);
          border: 1px solid var(--border); border-radius: 9px;
          padding: 9px 11px; font-size: 14px; font-family: inherit;
          outline: none; transition: border-color 0.15s;
        }
        .mp-input:focus, .mp-select:focus { border-color: var(--accent); }
        .mp-select { appearance: none; cursor: pointer; }
        .mp-input-ok { border-color: var(--success) !important; }
        .mp-input-bad { border-color: #FF5A5A !important; }
        .mp-pw-match {
          margin-top: 7px; font-size: 12.5px; font-weight: 600;
          display: flex; align-items: center; gap: 6px; color: var(--text-faint);
        }
        .mp-pw-match.ok { color: var(--success); }
        .mp-pw-match.bad { color: #FF5A5A; }
        .mp-pw-hint { font-weight: 500; color: var(--text-faint); }
        .mp-edit-actions { display: flex; gap: 10px; margin-top: 22px; }
        .mp-error-text { color: #FF5A5A; font-size: 13px; margin-top: 14px; }
        .mp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .mp-btn.ghost { border-color: var(--border); color: var(--text-muted); }
        .mp-btn.ghost:hover { color: var(--text); background: var(--bg-card-2); }
        .mp-saved-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 600; color: var(--success);
          background: rgba(53,199,126,0.14); padding: 5px 11px; border-radius: 999px;
        }

        /* ---------- PACKAGE ---------- */
        .mp-pkg-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
        .mp-pkg-name { font-family: 'Oswald', sans-serif; font-size: 22px; text-transform: uppercase; margin: 0; }
        .mp-pkg-price { color: var(--accent); font-weight: 700; font-size: 20px; }
        .mp-pkg-dates { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
        .mp-progress-wrap { margin: 20px 0 4px; }
        .mp-progress-labels { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-muted); margin-bottom: 7px; }
        .mp-progress-track { height: 8px; background: #101114; border-radius: 999px; overflow: hidden; border: 1px solid var(--border); }
        .mp-progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #FF8A5B); border-radius: 999px; }

        /* ---------- UPDATE HISTORY (log style) ---------- */
        .mp-log-item {
          background: var(--bg-card-2); border: 1px solid var(--border);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 14px;
        }
        .mp-log-item:last-child { margin-bottom: 0; }
        .mp-log-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .mp-log-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 999px;
        }
        .mp-log-time { font-size: 12px; color: var(--text-faint); white-space: nowrap; }
        .mp-log-staff { font-size: 12.5px; color: var(--text-muted); margin: 10px 0 4px; font-weight: 600; }
        .mp-log-text { font-size: 13.5px; color: var(--text-muted); line-height: 1.6; }
        .mp-log-text strong { color: var(--text); }

        .mp-face-compare { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
        .mp-face-box {
          flex: 1 1 0; min-width: 0; max-width: 160px; height: 130px; border-radius: 12px;
          background: #101114; border: 1px solid var(--border); overflow: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; color: var(--text-faint); position: relative;
        }
        .mp-face-box.filled {
          background: linear-gradient(160deg, #2A2B30, #17181B);
          color: var(--accent);
        }
        .mp-face-box-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .mp-face-box-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--text-faint); font-weight: 700; text-align: center;
          position: relative; z-index: 1; background: rgba(0,0,0,0.55); padding: 2px 8px; border-radius: 999px;
        }
        .mp-face-arrow { color: var(--text-faint); flex-shrink: 0; }
        .mp-face-reason {
          margin-top: 12px; background: rgba(53,199,126,0.1);
          border: 1px solid rgba(53,199,126,0.25); color: var(--success);
          border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600;
        }

        /* ---------- FACEID VIEW MODAL ---------- */
        .mp-modal-backdrop {
          position: fixed; inset: 0; background: rgba(6,6,7,0.72);
          backdrop-filter: blur(2px); display: flex; align-items: center;
          justify-content: center; z-index: 100; padding: 20px;
        }
        .mp-modal {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 18px; padding: 24px; width: 100%; max-width: 380px;
          text-align: center;
        }
        .mp-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .mp-modal-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 15px; letter-spacing: 0.04em; }
        .mp-modal-close { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: inline-flex; }
        .mp-modal-close:hover { color: var(--text); }
        .mp-modal-face {
          width: 100%; height: 220px; border-radius: 14px; margin-bottom: 16px; overflow: hidden;
          background: linear-gradient(160deg, #2A2B30, #17181B);
          display: flex; align-items: center; justify-content: center; color: var(--accent);
        }
        .mp-modal-face-img { width: 100%; height: 100%; object-fit: cover; }
        .mp-modal-meta { text-align: left; font-size: 13px; color: var(--text-muted); line-height: 1.7; }
        .mp-modal-meta b { color: var(--text); }

        /* ---------- INVOICE VIEW MODAL ---------- */
        .mp-inv-modal {
          width: clamp(320px, 60vw, 760px);
          height: clamp(420px, 85vh, 900px);
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 18px; padding: 20px; display: flex; flex-direction: column;
          overflow: hidden;
        }
        .mp-inv-head-actions { display: flex; align-items: center; gap: 8px; }
        .mp-inv-head-actions .mp-btn { margin-top: 0; padding: 7px 12px; font-size: 12.5px; }
        .mp-inv-body {
          flex: 1; min-height: 0; margin-top: 16px; border-radius: 12px; overflow: hidden;
          background: #fff; display: flex; align-items: center; justify-content: center;
        }
        .mp-inv-frame { width: 100%; height: 100%; border: none; display: block; }
        .mp-inv-img-wrap { width: 100%; height: 100%; overflow: auto; display: flex; align-items: flex-start; justify-content: center; background: #f1f5f9; }
        .mp-inv-img { max-width: 100%; display: block; }
        .mp-inv-state { color: var(--text-muted); font-size: 13.5px; text-align: center; padding: 24px; }
        .mp-inv-state.error { color: #FF5A5A; }

        /* ---------- TRANSACTIONS (list rows) ---------- */
        .mp-tx-list { display: flex; flex-direction: column; }
        .mp-tx-row {
          display: grid;
          /* Cột cố định (không dùng "auto") vì mỗi .mp-tx-row là một grid container
             riêng biệt — nếu để "auto" thì mỗi hàng tự co giãn theo nội dung của
             chính nó, khiến các cột giữa các hàng lệch nhau. Dùng width cố định /
             minmax để toàn bộ các hàng luôn thẳng cột. */
          grid-template-columns: minmax(160px, 1fr) 112px 128px 112px 128px 150px;
          grid-template-areas: "package channel dates amount status button";
          align-items: center; column-gap: 14px; row-gap: 8px;
          padding: 16px 4px; border-bottom: 1px solid var(--border);
        }
        .mp-tx-row:last-child { border-bottom: none; }
        .mp-tx-package { grid-area: package; font-size: 13.5px; color: var(--text); min-width: 0; font-weight: 600; }
        .mp-tx-channel {
          grid-area: channel; justify-self: start;
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(127,178,255,0.14); color: #7FB2FF;
          font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px;
          white-space: nowrap;
        }
        .mp-tx-dates { grid-area: dates; display: flex; flex-direction: column; gap: 2px; }
        .mp-tx-date-row { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
        .mp-tx-date-label { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; margin-right: 5px; }
        .mp-tx-amount { grid-area: amount; font-weight: 700; font-size: 13.5px; text-align: right; white-space: nowrap; }
        .mp-tx-status {
          grid-area: status; justify-self: start;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 999px;
          white-space: nowrap;
        }
        .mp-tx-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .mp-tx-invoice-btn {
          grid-area: button; justify-self: end;
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid var(--border); color: var(--text-muted);
          padding: 7px 13px; border-radius: 9px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: border-color 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .mp-tx-invoice-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .mp-tx-invoice-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 640px) {
          .mp-grid { grid-template-columns: 1fr; }
          .mp-hero { flex-direction: column; align-items: flex-start; padding: 22px 18px; gap: 16px; }
          .mp-hero-cta { align-items: flex-start; width: 100%; flex-direction: row; justify-content: space-between; }
          .mp-name { font-size: 22px; }
          .mp-meta { gap: 10px 16px; font-size: 12.5px; }

          .mp-tabs { margin: 18px 0 16px; -webkit-overflow-scrolling: touch; }
          .mp-tab { padding: 9px 12px; font-size: 12.5px; }

          .mp-card { padding: 18px; border-radius: 14px; }

          .mp-face-panel { gap: 16px; }
          .mp-scan-frame { width: 100px; height: 100px; }
          .mp-face-detail { min-width: 0; width: 100%; }

          .mp-log-item { padding: 14px; }
          .mp-face-box { max-width: none; height: 110px; }

          .mp-modal { padding: 18px; max-width: 100%; }
          .mp-modal-face { height: 170px; }
          .mp-inv-modal { width: 96vw; height: 92vh; padding: 14px; }

          .mp-tx-row {
            grid-template-columns: 1fr auto;
            grid-template-areas:
              "package status"
              "channel dates"
              "amount button";
            row-gap: 10px; padding: 16px 2px;
          }
          .mp-tx-dates { align-items: flex-end; }
          .mp-tx-amount { justify-self: start; text-align: left; }
          .mp-tx-invoice-btn { justify-self: end; }
        }

        @media (max-width: 400px) {
          .mp-name { font-size: 19px; }
          .mp-tab span, .mp-tab { font-size: 11.5px; }
        }
`;