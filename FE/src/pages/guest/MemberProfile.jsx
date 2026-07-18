import { useState } from "react";
import Footer from "../../component/Footer";
import Header from "../../component/Header";
// Lưu ý: chỉnh lại 2 đường dẫn import phía trên cho khớp vị trí thực tế của
// Header.jsx / Footer.jsx so với file này (MemberProfile) trong dự án của bạn.

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
};

/* ============================================================
   MOCK DATA — thay bằng dữ liệu thật khi tích hợp API
   ============================================================ */

const USER = {
  name: "Nguyễn Văn Luận",
  memberId: "HV-2024-08813",
  tier: "Hội viên Premium",
  since: "12/03/2024",
  phone: "0912 345 678",
  gender: "Nam",
  faceId: {
    verified: true,
    lastSync: "15/07/2026 · 07:42",
    branch: "Chi nhánh Quận 7",
  },
};

const PACKAGE = {
  name: "Gói Tự Do 12 Tháng",
  price: "6.990.000đ",
  start: "12/03/2026",
  end: "12/03/2027",
  daysLeft: 238,
  totalDays: 365,
  perks: ["Không giới hạn giờ tập", "Miễn phí gửi đồ & khăn tập", "1 buổi PT đánh giá thể trạng /tháng", "Ưu tiên đặt máy tập qua app"],
};

// Lịch sử cập nhật — mô phỏng dạng nhật ký thao tác (giống ảnh mẫu):
// mỗi mục có nhãn (tag), nhân viên thực hiện, thời gian, và nội dung.
// Riêng mục "faceid" hiển thị khung ảnh TRƯỚC / SAU + lý do cập nhật.
const UPDATE_HISTORY = [
  {
    date: "15/07/2026",
    time: "07:42",
    tag: "faceid",
    staff: "NhanVien Quận 7",
    reason: "Đồng bộ lại khuôn mặt định kỳ theo yêu cầu chi nhánh",
    beforeCaptured: false,
    afterCaptured: true,
  },
  {
    date: "02/07/2026",
    time: "14:10",
    tag: "info",
    staff: "NhanVien Quận 7",
    log: "UPDATE_INFO: Số điện thoại 0908 111 222 → 0912 345 678",
  },
  {
    date: "20/06/2026",
    time: "09:05",
    tag: "package",
    staff: "NhanVien Quận 7",
    log: "RENEW_PACKAGE: Gói Tự Do 12 Tháng - hết hạn 12/03/2026 → Gia hạn 'Gói Tự Do 12 Tháng' - Hóa đơn HD202606201090512 - Nối tiếp",
  },
  {
    date: "03/05/2026",
    time: "16:22",
    tag: "info",
    staff: "NhanVien Thủ Đức",
    log: "UPDATE_INFO: Chi nhánh tập chính Thủ Đức → Quận 7",
  },
  {
    date: "12/03/2026",
    time: "10:00",
    tag: "package",
    staff: "NhanVien Quận 7",
    log: "ACTIVATE_MEMBER: PendingActivation → Kích hoạt hội viên - Tạo gói tập + FaceID - Hóa đơn HD202603121090501 - NV kích hoạt: NhanVien Quận 7",
  },
];

// Lịch sử giao dịch — dạng danh sách dòng (list row), không phải bảng.
const TRANSACTIONS = [
  {
    name: "Nguyễn Văn Luận",
    phone: "0912 345 678",
    package: "Gói Tự Do 12 Tháng",
    channel: "Online",
    start: "20/06/2026",
    end: "20/06/2027",
    amount: "6.990.000đ",
    status: "success",
    invoiceId: "HD202606201090512",
  },
  {
    name: "Nguyễn Văn Luận",
    phone: "0912 345 678",
    package: "Buổi PT bổ sung (2 buổi)",
    channel: "Ví MoMo",
    start: "18/04/2026",
    end: "18/04/2026",
    amount: "800.000đ",
    status: "success",
    invoiceId: "HD202604181090433",
  },
  {
    name: "Nguyễn Văn Luận",
    phone: "0912 345 678",
    package: "Gói Tự Do 12 Tháng",
    channel: "Tại quầy",
    start: "12/03/2026",
    end: "12/03/2027",
    amount: "6.990.000đ",
    status: "success",
    invoiceId: "HD202603121090501",
  },
  {
    name: "Nguyễn Văn Luận",
    phone: "0912 345 678",
    package: "Đặt cọc lớp Yoga",
    channel: "Tiền mặt",
    start: "28/02/2026",
    end: "28/02/2026",
    amount: "150.000đ",
    status: "refunded",
    invoiceId: "HD202602281090388",
  },
  {
    name: "Nguyễn Văn Luận",
    phone: "0912 345 678",
    package: "Phí đăng ký hồ sơ hội viên",
    channel: "Online",
    start: "05/02/2026",
    end: "05/02/2026",
    amount: "50.000đ",
    status: "cancelled",
    invoiceId: "HD202602051090350",
  },
];

const TAG_STYLE = {
  faceid: { label: "Cập nhật FaceID", color: "var(--accent)", icon: ICONS.face },
  info: { label: "Cập nhật thông tin", color: "#7FB2FF", icon: ICONS.edit },
  package: { label: "Gói tập", color: "#35C77E", icon: ICONS.card },
};

const STATUS_STYLE = {
  success: { label: "Thành công", color: "#35C77E" },
  refunded: { label: "Đã hoàn tiền", color: "#FFB020" },
  cancelled: { label: "Đã hủy", color: "#FF5A5A" },
  failed: { label: "Thất bại", color: "#FF5A5A" },
};

/* ============================================================
   COMPONENT
   ============================================================ */

export default function MemberProfilePage() {
  const [tab, setTab] = useState("info");
  const progress = Math.round(((PACKAGE.totalDays - PACKAGE.daysLeft) / PACKAGE.totalDays) * 100);

  // Dữ liệu hồ sơ đang hiển thị + bản nháp khi chỉnh sửa
  const [profile, setProfile] = useState(USER);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(USER);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [showFaceView, setShowFaceView] = useState(false);

  const FIELDS = [
    { key: "name", label: "Họ và tên", type: "text" },
    { key: "gender", label: "Giới tính", type: "select", options: ["Nam", "Nữ", "Khác"] },
    { key: "phone", label: "Số điện thoại", type: "tel" },
  ];

  const startEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const updateDraft = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const saveEdit = () => {
    setSaveState("saving");
    // Giả lập gọi API cập nhật thông tin — thay bằng call thực tế khi tích hợp backend
    setTimeout(() => {
      setProfile(draft);
      setIsEditing(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    }, 500);
  };

  // Tách phần "KEY: nội dung" ở đầu dòng log để in đậm, giống ảnh mẫu
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

  const TABS = [
    { id: "info", label: "Thông tin cá nhân", icon: ICONS.user },
    { id: "package", label: "Gói tập hiện tại", icon: ICONS.card },
    { id: "history", label: "Lịch sử cập nhật", icon: ICONS.clock },
    { id: "transactions", label: "Lịch sử giao dịch", icon: ICONS.receipt },
  ];

  return (
    <>
      <Header />
      <div className="mp-root">
        <style>{`
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
          border-radius: 18px; background: #0E0F12; cursor: pointer;
        }
        .mp-scan-corner {
          position: absolute; width: 22px; height: 22px;
          border: 2.5px solid var(--accent);
        }
        .mp-scan-corner.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; border-top-left-radius: 8px; }
        .mp-scan-corner.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; border-top-right-radius: 8px; }
        .mp-scan-corner.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; border-bottom-left-radius: 8px; }
        .mp-scan-corner.br { bottom: 8px; right: 8px; border-left: none; border-top: none; border-bottom-right-radius: 8px; }
        .mp-scan-line {
          position: absolute; left: 12px; right: 12px; height: 2px;
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
        .mp-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px rgba(53,199,126,0.15); }
        .mp-face-status-text { font-weight: 700; color: var(--success); font-size: 14px; }
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
        .mp-input, .mp-select {
          width: 100%; background: var(--bg-card-2); color: var(--text);
          border: 1px solid var(--border); border-radius: 9px;
          padding: 9px 11px; font-size: 14px; font-family: inherit;
          outline: none; transition: border-color 0.15s;
        }
        .mp-input:focus, .mp-select:focus { border-color: var(--accent); }
        .mp-select { appearance: none; cursor: pointer; }
        .mp-edit-actions { display: flex; gap: 10px; margin-top: 22px; }
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
        .mp-perks { list-style: none; padding: 0; margin: 20px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mp-perks li { display: flex; gap: 8px; align-items: flex-start; font-size: 13.5px; color: var(--text-muted); }
        .mp-perks svg { color: var(--success); margin-top: 2px; flex-shrink: 0; }

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
          background: #101114; border: 1px solid var(--border);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; color: var(--text-faint);
        }
        .mp-face-box.filled {
          background: linear-gradient(160deg, #2A2B30, #17181B);
          color: var(--accent);
        }
        .mp-face-box-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--text-faint); font-weight: 700; text-align: center;
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
        .mp-modal-close { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .mp-modal-close:hover { color: var(--text); }
        .mp-modal-face {
          width: 100%; height: 220px; border-radius: 14px; margin-bottom: 16px;
          background: linear-gradient(160deg, #2A2B30, #17181B);
          display: flex; align-items: center; justify-content: center; color: var(--accent);
        }
        .mp-modal-meta { text-align: left; font-size: 13px; color: var(--text-muted); line-height: 1.7; }
        .mp-modal-meta b { color: var(--text); }

        /* ---------- TRANSACTIONS (list rows) ---------- */
        .mp-tx-list { display: flex; flex-direction: column; }
        .mp-tx-row {
          display: grid;
          grid-template-columns: 40px 180px 1fr auto auto 110px auto auto;
          grid-template-areas: "avatar who package channel dates amount status button";
          align-items: center; column-gap: 14px; row-gap: 8px;
          padding: 16px 4px; border-bottom: 1px solid var(--border);
        }
        .mp-tx-row:last-child { border-bottom: none; }
        .mp-tx-avatar {
          grid-area: avatar;
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(145deg, #2A2B30, #17181B);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 15px; color: var(--accent);
          border: 1px solid var(--border);
        }
        .mp-tx-who { grid-area: who; min-width: 0; }
        .mp-tx-name { font-weight: 700; font-size: 13.5px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-tx-phone { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-faint); margin-top: 2px; }
        .mp-tx-package { grid-area: package; font-size: 13.5px; color: var(--text); min-width: 0; }
        .mp-tx-channel {
          grid-area: channel; justify-self: start;
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(127,178,255,0.14); color: #7FB2FF;
          font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px;
          white-space: nowrap;
        }
        .mp-tx-dates { grid-area: dates; font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
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
        .mp-tx-invoice-btn:hover { border-color: var(--accent); color: var(--accent); }

        @media (max-width: 640px) {
          .mp-grid, .mp-perks { grid-template-columns: 1fr; }
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

          /* Danh sách giao dịch xếp lại theo 4 hàng cho màn hình hẹp */
          .mp-tx-row {
            grid-template-columns: 40px 1fr auto;
            grid-template-areas:
              "avatar who status"
              "package package package"
              "channel channel dates"
              "amount amount button";
            row-gap: 10px; padding: 16px 2px;
          }
          .mp-tx-who { padding-right: 6px; }
          .mp-tx-name { white-space: normal; }
          .mp-tx-dates { justify-self: end; text-align: right; }
          .mp-tx-amount { justify-self: start; text-align: left; }
          .mp-tx-invoice-btn { justify-self: end; }
        }

        @media (max-width: 400px) {
          .mp-name { font-size: 19px; }
          .mp-tab span, .mp-tab { font-size: 11.5px; }
          .mp-tx-row {
            grid-template-columns: 34px 1fr auto;
          }
          .mp-tx-avatar { width: 34px; height: 34px; font-size: 13px; }
        }
      `}</style>

        <div className="mp-shell">
          {/* HERO */}
          <div className="mp-hero">
            <div className="mp-avatar-wrap">
              <div className="mp-avatar">{profile.name.trim().split(" ").slice(-1)[0][0]}</div>
              <div className="mp-face-badge">{ICONS.check}</div>
            </div>
            <div className="mp-hero-info">
              <div className="mp-eyebrow">Hồ sơ hội viên</div>
              <h1 className="mp-name">{profile.name}</h1>
              <div className="mp-meta">
                <span>Mã hội viên: <b>{USER.memberId}</b></span>
                <span>SĐT: <b>{profile.phone}</b></span>
              </div>
            </div>
            <div className="mp-hero-cta">
              <span className="mp-tier-pill">{USER.tier}</span>
              <span className="mp-since">Thành viên từ {USER.since}</span>
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
                    <div className="mp-scan-face">
                      <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <circle cx="12" cy="9" r="4" />
                        <path d="M5 20c1.5-4.2 4.3-6 7-6s5.5 1.8 7 6" />
                      </svg>
                    </div>
                    <div className="mp-scan-line" />
                  </div>
                  <div className="mp-face-detail">
                    <div className="mp-face-status">
                      <span className="mp-status-dot" />
                      <span className="mp-face-status-text">Đã xác thực</span>
                    </div>
                    <div className="mp-face-sub">
                      Lần đồng bộ gần nhất: {USER.faceId.lastSync}<br />
                      Địa điểm: {USER.faceId.branch}
                    </div>
                    <button className="mp-btn" onClick={() => setShowFaceView(true)}>
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
                    <div className={"mp-field" + (f.full ? " full" : "")} key={f.key}>
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
                            placeholder={f.placeholder}
                            value={draft[f.key]}
                            onChange={(e) => updateDraft(f.key, e.target.value)}
                          />
                        )
                      ) : (
                        <div>{profile[f.key]}</div>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="mp-edit-actions">
                    <button className="mp-btn solid" onClick={saveEdit} disabled={saveState === "saving"}>
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
              <div className="mp-pkg-top">
                <div>
                  <h2 className="mp-pkg-name">{PACKAGE.name}</h2>
                  <div className="mp-pkg-dates">Hiệu lực {PACKAGE.start} – {PACKAGE.end}</div>
                </div>
                <div className="mp-pkg-price">{PACKAGE.price}</div>
              </div>

              <div className="mp-progress-wrap">
                <div className="mp-progress-labels">
                  <span>Đã sử dụng {progress}%</span>
                  <span>Còn lại {PACKAGE.daysLeft} ngày</span>
                </div>
                <div className="mp-progress-track">
                  <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <ul className="mp-perks">
                {PACKAGE.perks.map((p) => (
                  <li key={p}>{ICONS.check}{p}</li>
                ))}
              </ul>

              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <button className="mp-btn solid">Gia hạn gói tập</button>
                <button className="mp-btn">Xem chi tiết gói</button>
              </div>
            </div>
          )}

          {/* UPDATE HISTORY — dạng nhật ký thao tác */}
          {tab === "history" && (
            <div className="mp-card">
              <div className="mp-card-title">{ICONS.clock} Lịch sử cập nhật</div>

              {UPDATE_HISTORY.map((item, i) => {
                const tg = TAG_STYLE[item.tag];
                return (
                  <div className="mp-log-item" key={i}>
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
                            {ICONS.camera}
                            <span className="mp-face-box-label">Trước</span>
                          </div>
                          <span className="mp-face-arrow">→</span>
                          <div className="mp-face-box filled">
                            {ICONS.face}
                            <span className="mp-face-box-label" style={{ color: "var(--accent)" }}>Sau</span>
                          </div>
                        </div>
                        <div className="mp-face-reason">Lý do: {item.reason}</div>
                      </>
                    ) : (
                      <div className="mp-log-text">{renderLog(item.log)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TRANSACTIONS — dạng danh sách dòng */}
          {tab === "transactions" && (
            <div className="mp-card">
              <div className="mp-card-title">{ICONS.receipt} Lịch sử giao dịch</div>
              <div className="mp-tx-list">
                {TRANSACTIONS.map((tx, i) => {
                  const st = STATUS_STYLE[tx.status];
                  return (
                    <div className="mp-tx-row" key={i}>
                      <div className="mp-tx-avatar">{tx.name.trim().split(" ").slice(-1)[0][0]}</div>
                      <div className="mp-tx-who">
                        <div className="mp-tx-name">{tx.name}</div>
                        <div className="mp-tx-phone">{ICONS.phone}{tx.phone}</div>
                      </div>
                      <div className="mp-tx-package">{tx.package}</div>
                      <span className="mp-tx-channel">{ICONS.globe}{tx.channel}</span>
                      <div className="mp-tx-dates">{tx.start} → {tx.end}</div>
                      <div className="mp-tx-amount">{tx.amount}</div>
                      <span className="mp-tx-status" style={{ color: st.color, background: st.color + "1A" }}>
                        {st.label}
                      </span>
                      <button className="mp-tx-invoice-btn">{ICONS.receipt} Xem hóa đơn</button>
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
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <circle cx="12" cy="9" r="4" />
                  <path d="M5 20c1.5-4.2 4.3-6 7-6s5.5 1.8 7 6" />
                </svg>
              </div>
              <div className="mp-modal-meta">
                <div>Trạng thái: <b style={{ color: "var(--success)" }}>Đã xác thực</b></div>
                <div>Lần đồng bộ gần nhất: <b>{USER.faceId.lastSync}</b></div>
                <div>Địa điểm: <b>{USER.faceId.branch}</b></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}