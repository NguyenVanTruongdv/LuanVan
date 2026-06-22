import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  LogIn,
  Phone,
  ShieldAlert,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* =========================================================================
 * DỮ LIỆU MẪU — thay bằng dữ liệu thật khi gắn API
 * Cấu trúc field được đặt tên bám theo entity `Member` ở BE (BE.Models.Member)
 * để khi nối API thật, chỉ cần map response → state, không cần đổi UI.
 *
 *   memberId        ← Member.MemberId
 *   fullName        ← Member.FullName
 *   phone           ← Member.Phone
 *   gender          ← Member.Gender
 *   branchName      ← Member.Branch?.BranchName
 *   accountStatus   ← Member.Status            ("PendingActivation" | "Active" | "Expired" | "Suspended")
 *   suspendReason   ← Member.SuspendReason
 *   internalNotes   ← Member.InternalNotes      (CHỈ nhân viên thấy — hiển thị nổi bật màu đỏ)
 *   package         ← MemberPackage hiện tại (tên gói)
 *   expiryDate      ← MemberPackage hiện tại (ngày hết hạn)
 *   packageStatus   ← suy ra từ expiryDate: "active" | "expiring" | "expired" (dùng cho badge)
 * ======================================================================= */
const SAMPLE_MEMBERS = [
  {
    memberId: 1,
    fullName: "Nguyễn Văn An",
    phone: "0901234567",
    gender: "Male",
    branchName: "VTGYM Quận 1",
    accountStatus: "Active",
    suspendReason: null,
    internalNotes: null,
    package: "Gói 12 tháng — Premium",
    expiryDate: "01/12/2026",
    packageStatus: "active",
  },
  {
    memberId: 2,
    fullName: "Trần Thị Bích",
    phone: "0912345678",
    gender: "Female",
    branchName: "VTGYM Quận 7",
    accountStatus: "Active",
    suspendReason: null,
    internalNotes: "Hay khiếu nại về máy tập, cần ưu tiên hỗ trợ khi đến gym.",
    package: "Gói 6 tháng — Standard",
    expiryDate: "05/07/2026",
    packageStatus: "expiring",
  },
  {
    memberId: 3,
    fullName: "Lê Hoàng Cường",
    phone: "0987654321",
    gender: "Male",
    branchName: "VTGYM Quận 1",
    accountStatus: "Expired",
    suspendReason: null,
    internalNotes: null,
    package: "Gói 1 tháng",
    expiryDate: "10/06/2026",
    packageStatus: "expired",
  },
  {
    memberId: 4,
    fullName: "Phạm Thị Dung",
    phone: "0978123456",
    gender: "Female",
    branchName: "VTGYM Bình Thạnh",
    accountStatus: "Active",
    suspendReason: null,
    internalNotes: "Hội viên VIP — ưu tiên hỗ trợ riêng, không xếp lớp đông.",
    package: "Gói 12 tháng — VIP",
    expiryDate: "20/01/2027",
    packageStatus: "active",
  },
  {
    memberId: 5,
    fullName: "Hoàng Minh Đức",
    phone: "0966112233",
    gender: "Male",
    branchName: "VTGYM Tân Bình",
    accountStatus: "Suspended",
    suspendReason: "Vi phạm nội quy phòng tập (gây mất an toàn cho hội viên khác).",
    internalNotes: "Đã nhắc nhở 2 lần trước đó, lần này tạm khóa 30 ngày.",
    package: "Gói 3 tháng",
    expiryDate: "15/08/2026",
    packageStatus: "active",
  },
  {
    memberId: 6,
    fullName: "Vũ Thị Hoa",
    phone: "0945667788",
    gender: "Female",
    branchName: "VTGYM Thủ Đức",
    accountStatus: "Active",
    suspendReason: null,
    internalNotes: null,
    package: "Gói 6 tháng — Standard",
    expiryDate: "20/06/2026",
    packageStatus: "expiring",
  },
];

/* ── Lý do check-in thủ công (khi nhân viên tra cứu bằng SĐT) ── */
const MANUAL_REASON_OPTIONS = [
  { value: "no_recognition", label: "Không nhận diện được khuôn mặt" },
  { value: "renewed", label: "Khách vừa gia hạn" },
  { value: "other", label: "Khác" },
];

/* ── Badge trạng thái gói tập (hiển thị nhanh trên UI check-in) ── */
const PACKAGE_STATUS_MAP = {
  active: { label: "Còn hạn", cls: "badge-success" },
  expiring: { label: "Sắp hết hạn", cls: "badge-warning" },
  expired: { label: "Hết hạn", cls: "badge-danger" },
};

/* ── Nhãn hiển thị cho Member.Status (accountStatus) ── */
const ACCOUNT_STATUS_MAP = {
  PendingActivation: { label: "Chờ kích hoạt", cls: "badge-warning" },
  Active: { label: "Đang hoạt động", cls: "badge-success" },
  Expired: { label: "Hết hạn", cls: "badge-danger" },
  Suspended: { label: "Đã bị khoá", cls: "badge-danger" },
};

function StatusBadge({ status }) {
  const s = PACKAGE_STATUS_MAP[status] || PACKAGE_STATUS_MAP.active;
  return <span className={`ck-badge ${s.cls}`}>{s.label}</span>;
}

function AccountStatusBadge({ status }) {
  const s = ACCOUNT_STATUS_MAP[status] || ACCOUNT_STATUS_MAP.Active;
  return <span className={`ck-badge ${s.cls}`}>{s.label}</span>;
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}

/* ── Có cho phép check-in hay không, dựa trên accountStatus + packageStatus ── */
function canCheckin(member) {
  if (!member) return false;
  if (member.accountStatus === "Suspended") return false;
  if (member.accountStatus === "Expired") return false;
  if (member.packageStatus === "expired") return false;
  return true;
}

/* ── Lý do KHÔNG cho phép check-in, dùng để hiển thị dòng đỏ bên dưới nút ── */
function getIneligibleReason(member) {
  if (!member) return "";
  if (member.accountStatus === "Suspended") {
    return `Tài khoản đã bị khoá${member.suspendReason ? `: ${member.suspendReason}` : "."}`;
  }
  if (member.accountStatus === "Expired") {
    return "Tài khoản đã hết hạn sử dụng. Không thể check-in.";
  }
  if (member.packageStatus === "expired") {
    return "Gói tập đã hết hạn. Vui lòng gia hạn trước khi check-in.";
  }
  return "";
}

/* =========================================================================
 * CAMERA STREAM — lưu ở module-level (ngoài component) để sống sót qua việc
 * unmount/remount khi chuyển route trong SPA (vd: qua trang "Danh sách hội
 * viên" rồi quay lại). Stream KHÔNG bị dừng tự động khi đổi tab hay đổi
 * trang — chỉ dừng khi người dùng bấm nút "Dừng" tường minh.
 * ======================================================================= */
const cameraStore = {
  stream: null,
  deviceId: null,
};

export default function Checkin() {
  /* ── Camera state ── */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(!!cameraStore.stream);
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState(cameraStore.deviceId || "");

  /* ── Stop camera helper — CHỈ được gọi khi người dùng bấm "Dừng" tường minh ── */
  const stopCamera = useCallback(() => {
    cameraStore.stream?.getTracks().forEach(t => t.stop());
    cameraStore.stream = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  /* ── Nếu đã có stream từ trước (do chuyển trang rồi quay lại), gắn lại vào <video> ── */
  useEffect(() => {
    if (cameraStore.stream && videoRef.current) {
      videoRef.current.srcObject = cameraStore.stream;
      setIsCameraOn(true);
    }
  }, []);

  /* ── Lấy danh sách camera ── */
  useEffect(() => {
    async function loadDevices() {
      try {
        if (!cameraStore.stream) {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(s => s.getTracks().forEach(t => t.stop()))
            .catch(() => { });
        }
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter(d => d.kind === "videoinput");
        setDevices(cams);
        if (cams.length > 0 && !selectedDevId) setSelectedDevId(cams[0].deviceId);
      } catch (_) { }
    }
    loadDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", loadDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", loadDevices);
  }, []);

  // Lưu ý: KHÔNG dừng camera khi tab ẩn (visibilitychange) và KHÔNG dừng khi
  // component unmount (chuyển sang trang khác trong app). Hội viên check-in
  // liên tục nên camera phải luôn sẵn sàng cho đến khi nhân viên bấm "Dừng".

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const constraints = {
        video: selectedDevId ? { deviceId: { exact: selectedDevId } } : { facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStore.stream = stream;
      cameraStore.deviceId = selectedDevId;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    } catch {
      setCameraError("Không thể truy cập camera. Kiểm tra quyền truy cập trình duyệt.");
    }
  }, [selectedDevId]);

  const handleDeviceChange = (e) => {
    setSelectedDevId(e.target.value);
    if (isCameraOn) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  /* ── Capture frame ── */
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  /* ── Toast ── */
  const [toast, setToast] = useState(null);
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  /* =====================================================================
   * THÔNG TIN NGƯỜI CHECK-IN GẦN NHẤT
   * Dùng chung cho cả 2 luồng (camera nhận diện & tra cứu SĐT) — chỉ cần
   * gọi setLastCheckin(member, { source, success }) sau khi BE trả kết quả.
   * ===================================================================== */
  const [lastCheckin, setLastCheckin] = useState(null);
  // lastCheckin = { member, source: "camera" | "phone", result: "success" | "error", reason?, at: Date }

  const recordCheckin = (member, source, result, reason) => {
    setLastCheckin({ member, source, result, reason, at: new Date() });
  };

  /* ── Camera → nhận diện → check-in ngay, không cần modal xác nhận ── */
  const [cameraResult, setCameraResult] = useState(null);
  const [cameraCheckin, setCameraCheckin] = useState(null); // "loading" | "success" | "error"

  const handleMockRecognize = async () => {
    if (!isCameraOn) return;
    captureFrame();
    // TODO API: gửi base64 lên POST /api/face-recognize → trả về member tương ứng
    setCameraResult(null);
    setCameraCheckin("loading");

    await new Promise(r => setTimeout(r, 500)); // giả lập nhận diện
    const member = SAMPLE_MEMBERS[Math.floor(Math.random() * SAMPLE_MEMBERS.length)];
    setCameraResult(member);

    if (!canCheckin(member)) {
      setCameraCheckin("error");
      showToast("error", `${member.fullName} — không thể check-in`);
      recordCheckin(member, "camera", "error");
    } else {
      // TODO API: POST /api/checkins { memberId: member.memberId, method: "camera" }
      await new Promise(r => setTimeout(r, 300));
      setCameraCheckin("success");
      showToast("success", `Check-in thành công — ${member.fullName}`);
      recordCheckin(member, "camera", "success");
    }

    setTimeout(() => setCameraCheckin(null), 3000);
  };

  /* ── Phone lookup — kết quả hiển thị NGAY tại khu vực "người check-in gần
   * nhất", đẩy thông tin lượt check-in trước đó xuống dưới. ── */
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [phoneLookupResult, setPhoneLookupResult] = useState(null); // { member }

  const handlePhoneLookup = async () => {
    const phone = phoneInput.trim();
    setPhoneError("");
    if (!/^0\d{9}$/.test(phone)) {
      setPhoneError("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return;
    }
    setLookupLoading(true);
    setPhoneLookupResult(null);
    // TODO API: GET /api/members/lookup?phone={phone}
    await new Promise(r => setTimeout(r, 400));
    const member = SAMPLE_MEMBERS.find(m => m.phone === phone) || null;
    setLookupLoading(false);
    if (member) {
      setPhoneLookupResult({ member });
    } else {
      setPhoneError("Không tìm thấy hội viên với số điện thoại này.");
    }
  };

  const dismissLookupResult = () => {
    setPhoneLookupResult(null);
    setPhoneInput("");
    setPhoneError("");
  };

  /* ── Modal "Check-in thủ công" — chọn lý do trước khi xác nhận ── */
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonType, setReasonType] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [checkinState, setCheckinState] = useState(null); // "loading" | "success" | null

  const openReasonModal = () => {
    if (!phoneLookupResult || !canCheckin(phoneLookupResult.member)) return;
    setReasonType("");
    setCustomReason("");
    setCheckinState(null);
    setReasonModalOpen(true);
  };

  const closeReasonModal = () => {
    setReasonModalOpen(false);
    setReasonType("");
    setCustomReason("");
    setCheckinState(null);
  };

  const isReasonValid = !!reasonType && (reasonType !== "other" || customReason.trim().length > 0);

  const handleConfirmManualCheckin = async () => {
    if (!phoneLookupResult || !isReasonValid) return;
    const member = phoneLookupResult.member;
    const reasonLabel = reasonType === "other"
      ? customReason.trim()
      : MANUAL_REASON_OPTIONS.find(r => r.value === reasonType)?.label;

    setCheckinState("loading");
    // TODO API: POST /api/checkins { memberId: member.memberId, method: "phone", manualReason: reasonLabel }
    await new Promise(r => setTimeout(r, 600));
    setCheckinState("success");
    recordCheckin(member, "phone", "success", reasonLabel);
    showToast("success", `Check-in thành công — ${member.fullName}`);

    setTimeout(() => {
      closeReasonModal();
      setPhoneLookupResult(null);
      setPhoneInput("");
    }, 1200);
  };

  /* ── Render ── */
  return (
    <div className="ck-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg: #ffffff;
          --surface: #f8fafc;
          --surface-alt: #eef2f5;
          --border: #e2e8f0;
          --text: #0f172a;
          --text-muted: #64748b;
          --primary: #0ea975;
          --primary-dark: #067a56;
          --primary-light: #e3f8ef;
          --warning: #d97706;
          --warning-light: #fef3c7;
          --danger: #dc2626;
          --danger-light: #fee2e2;
          --indigo: #6366f1;
          --indigo-light: #eef2ff;
          --radius-lg: 14px;
          --radius-md: 10px;
          --radius-sm: 7px;
        }

        .ck-wrap *, .ck-wrap *::before, .ck-wrap *::after { box-sizing: border-box; }
        .ck-wrap {
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--text);
          width: 100%;
          padding: 12px;
          background: var(--bg);
        }

        /* ── Grid ── */
        .ck-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 12px;
          align-items: start;
        }
        @media (max-width: 820px) {
          .ck-grid { grid-template-columns: 1fr; }
        }

        /* ── Card ── */
        .ck-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px;
        }
        .ck-card-title {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ck-card-title h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 700; margin: 0;
        }

        /* ── Camera status pill ── */
        .ck-status-pill {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; color: var(--text-muted);
        }
        .ck-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
        .ck-dot.on { background: var(--primary); animation: ck-pulse 1.6s infinite; }
        @keyframes ck-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(14,169,117,.45); }
          50%      { box-shadow: 0 0 0 5px rgba(14,169,117,0); }
        }

        /* ── Device selector ── */
        .ck-device-select-wrap { position: relative; margin-bottom: 10px; }
        .ck-device-select-wrap select {
          appearance: none; width: 100%;
          padding: 7px 32px 7px 10px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: #fff; font-size: 12px; color: var(--text);
          font-family: 'Inter', sans-serif; cursor: pointer; outline: none;
          transition: border-color .15s;
        }
        .ck-device-select-wrap select:focus { border-color: var(--primary); }
        .ck-device-select-wrap .ck-chevron {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--text-muted);
        }

        /* ── Viewport ── */
        .ck-viewport {
          position: relative; width: 100%; aspect-ratio: 4/3;
          background: #0f172a; border-radius: var(--radius-md);
          overflow: hidden; border: 2px solid var(--border);
          transition: border-color .2s;
        }
        .ck-viewport.on { border-color: var(--primary); }
        .ck-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .ck-placeholder {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; color: #94a3b8;
        }
        .ck-placeholder p    { margin: 0; font-weight: 600; font-size: 13px; color: #cbd5e1; }
        .ck-placeholder span { font-size: 11px; }
        .ck-scan {
          position: absolute; left: 0; width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
          animation: ck-scan 2.2s ease-in-out infinite;
        }
        @keyframes ck-scan {
          0%   { top: 4%;  opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { top: 94%; opacity: 0; }
        }

        /* ── Camera checkin overlay ── */
        .ck-viewport-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; backdrop-filter: blur(2px);
        }
        .ck-viewport-overlay.loading { background: rgba(15,23,42,.5); }
        .ck-viewport-overlay.success { background: rgba(6,122,86,.7); }
        .ck-viewport-overlay.error   { background: rgba(220,38,38,.7); }
        .ck-viewport-overlay p {
          margin: 0; color: #fff; font-weight: 700; font-size: 13px; text-align: center;
          padding: 0 12px;
        }

        .ck-cam-error {
          margin-top: 8px; padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: var(--danger-light); color: var(--danger);
          font-size: 12px; display: flex; align-items: flex-start; gap: 7px;
        }

        /* ── Buttons ── */
        .ck-btn-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .ck-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 7px 12px; border-radius: var(--radius-sm);
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          border: 1px solid transparent; transition: all .15s; font-family: 'Inter', sans-serif;
        }
        .ck-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ck-btn-primary { background: var(--primary); color: #fff; }
        .ck-btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
        .ck-btn-danger  { background: #fff; border-color: #fecaca; color: var(--danger); }
        .ck-btn-danger:hover:not(:disabled)  { background: var(--danger-light); }
        .ck-btn-indigo  { background: #fff; border-color: #c7d2fe; color: var(--indigo); }
        .ck-btn-indigo:hover:not(:disabled)  { background: var(--indigo-light); }

        /* ── Camera last result bar ── */
        .ck-cam-result {
          margin-top: 10px; padding: 9px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--primary);
          background: var(--primary-light);
          display: flex; align-items: center; gap: 10px;
        }
        .ck-cam-result-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--primary-dark); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 11px;
          flex-shrink: 0;
        }
        .ck-cam-result-name { font-weight: 700; font-size: 13px; }
        .ck-cam-result-sub  { font-size: 11px; color: var(--primary-dark); margin-top: 1px; }

        /* ── Phone panel ── */
        .ck-phone-panel { display: flex; flex-direction: column; gap: 12px; }
        .ck-phone-input-block { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
        .ck-input-wrap {
          flex: 1; min-width: 160px; display: flex; align-items: center; gap: 7px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 0 10px; background: #fff; transition: border-color .15s;
        }
        .ck-input-wrap:focus-within { border-color: var(--primary); }
        .ck-input-wrap input {
          border: none; outline: none; padding: 9px 0; flex: 1;
          font-size: 13px; background: transparent; color: var(--text);
          font-family: 'Inter', sans-serif;
        }
        .ck-input-wrap svg { color: var(--text-muted); flex-shrink: 0; }
        .ck-phone-error {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 12px; color: var(--danger); font-weight: 500;
        }

        /* ── Hint label ── */
        .ck-hint {
          font-size: 11px; color: var(--text-muted); font-weight: 600;
          text-transform: uppercase; letter-spacing: .04em; margin-bottom: 7px;
        }

        /* ── Khối kết quả tra cứu SĐT (hiện ngay khi tìm thấy hội viên) ── */
        .ck-lookup-block { display: flex; flex-direction: column; gap: 0; }
        .ck-lookup-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 7px;
        }
        .ck-lookup-head .ck-hint { margin-bottom: 0; }
        .ck-lookup-close {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-alt); border: none; cursor: pointer;
          color: var(--text-muted); transition: background .15s; flex-shrink: 0;
        }
        .ck-lookup-close:hover { background: var(--border); }

        .ck-lookup-card {
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: #fff;
          overflow: hidden;
        }
        .ck-lookup-card.ok      { border-color: var(--primary); }
        .ck-lookup-card.blocked { border-color: var(--danger); }

        .ck-lookup-top {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--surface-alt);
        }
        .ck-lookup-card.ok .ck-lookup-top      { background: var(--primary-light); }
        .ck-lookup-card.blocked .ck-lookup-top { background: var(--danger-light); }

        .ck-lookup-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--primary-dark); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px;
          flex-shrink: 0;
        }
        .ck-lookup-card.blocked .ck-lookup-avatar { background: var(--danger); }
        .ck-lookup-name { font-weight: 700; font-size: 13.5px; margin: 0 0 5px; word-break: break-word; }

        .ck-lookup-body { padding: 4px 14px 14px; }
        .ck-lookup-reason-blocked {
          margin-top: 4px; padding: 9px 10px;
          border-radius: var(--radius-sm);
          background: var(--danger-light); color: var(--danger);
          font-size: 12px; font-weight: 600;
          display: flex; align-items: flex-start; gap: 7px;
        }
        .ck-lookup-checkin-btn { width: 100%; margin-top: 10px; padding: 9px 12px; font-size: 13px; }

        /* ── Panel: thông tin người check-in gần nhất ── */
        .ck-lastcheckin-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; text-align: center;
          padding: 28px 12px;
          border: 1.5px dashed var(--border); border-radius: var(--radius-md);
          color: var(--text-muted);
        }
        .ck-lastcheckin-empty p { margin: 0; font-size: 12.5px; font-weight: 600; }
        .ck-lastcheckin-empty span { font-size: 11px; }

        .ck-lc-card {
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: #fff;
          overflow: hidden;
        }
        .ck-lc-card.success { border-color: var(--primary); }
        .ck-lc-card.error   { border-color: var(--danger); }

        .ck-lc-top {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--surface-alt);
        }
        .ck-lc-card.success .ck-lc-top { background: var(--primary-light); }
        .ck-lc-card.error   .ck-lc-top { background: var(--danger-light); }

        .ck-lc-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--primary-dark); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px;
          flex-shrink: 0;
        }
        .ck-lc-card.error .ck-lc-avatar { background: var(--danger); }

        .ck-lc-name { font-weight: 700; font-size: 13.5px; margin: 0 0 3px; word-break: break-word; }
        .ck-lc-result-line {
          display: flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 700;
        }
        .ck-lc-result-line.success { color: var(--primary-dark); }
        .ck-lc-result-line.error   { color: var(--danger); }

        .ck-lc-source {
          margin-left: auto; flex-shrink: 0;
          font-size: 10.5px; font-weight: 600; color: var(--text-muted);
          background: #fff; border: 1px solid var(--border);
          padding: 3px 8px; border-radius: 999px; white-space: nowrap;
        }

        .ck-lc-body { padding: 4px 14px 12px; }
        .ck-lc-row {
          display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
          padding: 7px 0; border-bottom: 1px dashed var(--border);
          font-size: 12.5px;
        }
        .ck-lc-row:last-of-type { border-bottom: none; }
        .ck-lc-row-label { color: var(--text-muted); flex-shrink: 0; }
        .ck-lc-row-value { font-weight: 600; text-align: right; word-break: break-word; }

        /* Ghi chú nội bộ — luôn nổi bật màu đỏ, chỉ nhân viên thấy */
        .ck-lc-internal-note {
          margin-top: 10px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          background: var(--danger-light);
          border: 1px solid #fca5a5;
          display: flex; align-items: flex-start; gap: 7px;
        }
        .ck-lc-internal-note svg { flex-shrink: 0; margin-top: 1px; color: var(--danger); }
        .ck-lc-internal-note-text {
          font-size: 12px; font-weight: 700; color: var(--danger);
          line-height: 1.45; word-break: break-word;
        }
        .ck-lc-internal-note-label {
          display: block; font-size: 10px; font-weight: 800; letter-spacing: .04em;
          text-transform: uppercase; color: var(--danger); margin-bottom: 2px;
        }

        .ck-lc-suspend-note {
          margin-top: 8px; padding: 9px 10px;
          border-radius: var(--radius-sm);
          background: #fff7ed; border: 1px solid #fed7aa;
          font-size: 12px; color: var(--warning); font-weight: 600;
          display: flex; align-items: flex-start; gap: 7px;
        }
        .ck-lc-suspend-note svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Badge ── */
        .ck-badge {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 700; white-space: nowrap;
        }
        .badge-success { background: var(--primary-light); color: var(--primary-dark); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-danger  { background: var(--danger-light);  color: var(--danger); }

        /* ── Modal ── */
        .ck-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(15,23,42,.45);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; animation: ck-fade-in .15s ease;
        }
        @keyframes ck-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .ck-modal {
          background: #fff; border-radius: var(--radius-lg);
          width: 100%; max-width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,.2);
          animation: ck-slide-up .2s ease; overflow: hidden;
          max-height: 90vh; overflow-y: auto;
        }
        @keyframes ck-slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .ck-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 12px; border-bottom: 1px solid var(--border);
        }
        .ck-modal-head h3 {
          font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin: 0;
        }
        .ck-modal-close {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-alt); border: none; cursor: pointer;
          color: var(--text-muted); transition: background .15s;
        }
        .ck-modal-close:hover { background: var(--border); }
        .ck-modal-body { padding: 16px; }
        .ck-modal-member-top {
          display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .ck-modal-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--primary-light); color: var(--primary-dark);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px;
          flex-shrink: 0;
        }
        .ck-modal-name {
          font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin: 0 0 4px;
        }
        .ck-modal-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .ck-info-row {
          display: flex; justify-content: space-between; gap: 8px;
          padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 13px;
        }
        .ck-info-row:last-child { border-bottom: none; }
        .ck-info-label { color: var(--text-muted); flex-shrink: 0; }
        .ck-info-value { font-weight: 600; text-align: right; word-break: break-word; }

        /* ── Chọn lý do check-in thủ công, trong modal ── */
        .ck-reason-field { margin-top: 14px; }
        .ck-reason-label {
          display: block; font-size: 12.5px; font-weight: 700; color: var(--text);
          margin-bottom: 6px;
        }
        .ck-reason-textarea {
          width: 100%; margin-top: 8px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 8px 10px; font-size: 13px; font-family: 'Inter', sans-serif;
          color: var(--text); resize: vertical; outline: none;
          transition: border-color .15s;
        }
        .ck-reason-textarea:focus { border-color: var(--primary); }

        .ck-modal-foot {
          padding: 12px 16px 14px;
          display: flex; gap: 8px; justify-content: flex-end;
          border-top: 1px solid var(--border); flex-wrap: wrap;
        }
        .ck-btn-cancel {
          background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
          padding: 8px 14px; border-radius: var(--radius-sm);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background .15s; font-family: 'Inter', sans-serif;
        }
        .ck-btn-cancel:hover { background: var(--surface-alt); }
        .ck-checkin-state {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 28px 16px; text-align: center;
        }
        .ck-checkin-state p { margin: 0; font-weight: 600; font-size: 13px; }

        /* ── Toast ── */
        .ck-toast {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          z-index: 1100;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 999px;
          font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,.15);
          animation: ck-toast-in .2s ease; white-space: nowrap;
          max-width: calc(100vw - 32px); overflow: hidden; text-overflow: ellipsis;
        }
        @keyframes ck-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .ck-toast.success { background: var(--primary); color: #fff; }
        .ck-toast.error   { background: var(--danger);  color: #fff; }

        /* ── Spinner ── */
        .ck-spinner {
          border-radius: 50%; border: 3px solid var(--primary-light);
          border-top-color: var(--primary); animation: ck-spin .7s linear infinite;
        }
        @keyframes ck-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .ck-wrap { padding: 8px; }
          .ck-card { padding: 12px; }
          .ck-lc-row { font-size: 12px; }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="ck-grid">
        {/* ── Left: Camera ── */}
        <div className="ck-card">
          <div className="ck-card-title">
            <h2>Camera nhận diện</h2>
            <span className="ck-status-pill">
              <span className={`ck-dot ${isCameraOn ? "on" : ""}`} />
              {isCameraOn ? "Đang hoạt động" : "Đã tắt"}
            </span>
          </div>

          <div className="ck-device-select-wrap">
            <select value={selectedDevId} onChange={handleDeviceChange} disabled={devices.length === 0}>
              {devices.length === 0
                ? <option>Chưa phát hiện camera</option>
                : devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 8)}…`}
                  </option>
                ))
              }
            </select>
            <ChevronDown size={13} className="ck-chevron" />
          </div>

          <div className={`ck-viewport ${isCameraOn ? "on" : ""}`}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="ck-video"
              style={{ display: isCameraOn ? "block" : "none" }}
            />
            {!isCameraOn && (
              <div className="ck-placeholder">
                <CameraOff size={32} />
                <p>Camera đang tắt</p>
                <span>Nhấn "Bắt đầu" để mở camera</span>
              </div>
            )}
            {isCameraOn && !cameraCheckin && <div className="ck-scan" />}

            {/* Overlay kết quả check-in ngay trên viewport */}
            {cameraCheckin === "loading" && (
              <div className="ck-viewport-overlay loading">
                <div className="ck-spinner" style={{ width: 32, height: 32 }} />
                <p>Đang nhận diện &amp; check-in…</p>
              </div>
            )}
            {cameraCheckin === "success" && cameraResult && (
              <div className="ck-viewport-overlay success">
                <CheckCircle2 size={40} color="#fff" />
                <p>Check-in thành công!<br />{cameraResult.fullName}</p>
              </div>
            )}
            {cameraCheckin === "error" && cameraResult && (
              <div className="ck-viewport-overlay error">
                <XCircle size={40} color="#fff" />
                <p>Không thể check-in<br />{cameraResult.fullName}</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="ck-cam-error">
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {cameraError}
            </div>
          )}

          <div className="ck-btn-row">
            <button className="ck-btn ck-btn-primary" onClick={startCamera} disabled={isCameraOn}>
              <Camera size={13} /> Bắt đầu
            </button>
            <button className="ck-btn ck-btn-danger" onClick={stopCamera} disabled={!isCameraOn}>
              <CameraOff size={13} /> Dừng
            </button>
            <button
              className="ck-btn ck-btn-indigo"
              onClick={handleMockRecognize}
              disabled={!isCameraOn || cameraCheckin === "loading"}
            >
              <Sparkles size={13} /> Mở Cửa ( Demo )
            </button>
          </div>

          {/* Last camera result bar (riêng cho camera, hiển thị ngay dưới khung hình) */}
          {cameraResult && cameraCheckin !== "loading" && (
            <div className="ck-cam-result">
              <div className="ck-cam-result-avatar">{initials(cameraResult.fullName)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ck-cam-result-name">{cameraResult.fullName}</div>
                <div className="ck-cam-result-sub">
                  {cameraCheckin === "success" ? "✓ Đã check-in" : cameraCheckin === "error" ? "✗ Không thể check-in" : "Lần nhận diện gần nhất"}
                </div>
              </div>
              <StatusBadge status={cameraResult.packageStatus} />
            </div>
          )}
        </div>

        {/* ── Right: Phone lookup + kết quả tra cứu + Thông tin check-in gần nhất ── */}
        <div className="ck-card ck-phone-panel">
          <div className="ck-card-title">
            <h2>Check-in bằng số điện thoại</h2>
          </div>

          <div className="ck-phone-input-block">
            <div className="ck-input-wrap">
              <Phone size={13} />
              <input
                type="tel"
                placeholder="Nhập SĐT, ví dụ: 0901234567"
                value={phoneInput}
                onChange={e => { setPhoneInput(e.target.value); setPhoneError(""); }}
                onKeyDown={e => e.key === "Enter" && handlePhoneLookup()}
              />
            </div>
            <button
              className="ck-btn ck-btn-primary"
              onClick={handlePhoneLookup}
              disabled={lookupLoading}
              style={{ whiteSpace: "nowrap" }}
            >
              {lookupLoading
                ? <span className="ck-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                : <UserRound size={13} />}
              Tra cứu
            </button>
          </div>

          {phoneError && (
            <div className="ck-phone-error">
              <XCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {phoneError}
            </div>
          )}

          {/* ── Kết quả tra cứu SĐT — hiện ngay tại đây, đẩy "người check-in gần nhất" xuống dưới ── */}
          {phoneLookupResult && (
            <div className="ck-lookup-block">
              <div className="ck-lookup-head">
                <p className="ck-hint">Kết quả tra cứu</p>
                <button className="ck-lookup-close" onClick={dismissLookupResult} title="Đóng">
                  <X size={12} />
                </button>
              </div>

              <div className={`ck-lookup-card ${canCheckin(phoneLookupResult.member) ? "ok" : "blocked"}`}>
                <div className="ck-lookup-top">
                  <div className="ck-lookup-avatar">{initials(phoneLookupResult.member.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="ck-lookup-name">{phoneLookupResult.member.fullName}</p>
                    <div className="ck-modal-badges">
                      <StatusBadge status={phoneLookupResult.member.packageStatus} />
                      <AccountStatusBadge status={phoneLookupResult.member.accountStatus} />
                    </div>
                  </div>
                </div>

                <div className="ck-lookup-body">
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Mã hội viên</span>
                    <span className="ck-lc-row-value">#{phoneLookupResult.member.memberId}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Số điện thoại</span>
                    <span className="ck-lc-row-value">{phoneLookupResult.member.phone}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Chi nhánh</span>
                    <span className="ck-lc-row-value">{phoneLookupResult.member.branchName}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Gói tập</span>
                    <span className="ck-lc-row-value">{phoneLookupResult.member.package}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Hết hạn gói</span>
                    <span className="ck-lc-row-value">{phoneLookupResult.member.expiryDate}</span>
                  </div>

                  {/* Ghi chú nội bộ — luôn nổi bật màu đỏ, chỉ nhân viên thấy */}
                  {phoneLookupResult.member.internalNotes && (
                    <div className="ck-lc-internal-note">
                      <AlertCircle size={15} />
                      <div className="ck-lc-internal-note-text">
                        <span className="ck-lc-internal-note-label">Ghi chú nội bộ</span>
                        {phoneLookupResult.member.internalNotes}
                      </div>
                    </div>
                  )}

                  {/* Dòng lý do màu đỏ khi không đủ điều kiện check-in */}
                  {!canCheckin(phoneLookupResult.member) && (
                    <div className="ck-lookup-reason-blocked">
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      {getIneligibleReason(phoneLookupResult.member)}
                    </div>
                  )}

                  <button
                    className="ck-btn ck-btn-primary ck-lookup-checkin-btn"
                    onClick={openReasonModal}
                    disabled={!canCheckin(phoneLookupResult.member)}
                  >
                    <LogIn size={13} /> Check-in cho hội viên này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Thông tin người check-in gần nhất ── */}
          <div>
            <p className="ck-hint">Người check-in gần nhất</p>

            {!lastCheckin ? (
              <div className="ck-lastcheckin-empty">
                <UserRound size={22} />
                <p>Chưa có lượt check-in nào</p>
                <span>Thông tin hội viên sẽ hiện ra đây sau khi check-in</span>
              </div>
            ) : (
              <div className={`ck-lc-card ${lastCheckin.result}`}>
                <div className="ck-lc-top">
                  <div className="ck-lc-avatar">{initials(lastCheckin.member.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="ck-lc-name">{lastCheckin.member.fullName}</p>
                    <div className={`ck-lc-result-line ${lastCheckin.result}`}>
                      {lastCheckin.result === "success"
                        ? <><CheckCircle2 size={13} /> Check-in thành công</>
                        : <><XCircle size={13} /> Không thể check-in</>}
                    </div>
                  </div>
                  <span className="ck-lc-source">
                    {lastCheckin.source === "camera" ? "📷 Camera" : "📞 SĐT"}
                  </span>
                </div>

                <div className="ck-lc-body">
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Mã hội viên</span>
                    <span className="ck-lc-row-value">#{lastCheckin.member.memberId}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Số điện thoại</span>
                    <span className="ck-lc-row-value">{lastCheckin.member.phone}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Chi nhánh</span>
                    <span className="ck-lc-row-value">{lastCheckin.member.branchName}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Gói tập</span>
                    <span className="ck-lc-row-value">{lastCheckin.member.package}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Hết hạn gói</span>
                    <span className="ck-lc-row-value">{lastCheckin.member.expiryDate}</span>
                  </div>
                  <div className="ck-lc-row">
                    <span className="ck-lc-row-label">Trạng thái tài khoản</span>
                    <span className="ck-lc-row-value">
                      <AccountStatusBadge status={lastCheckin.member.accountStatus} />
                    </span>
                  </div>

                  {/* Lý do check-in thủ công — chỉ có khi check-in qua tra cứu SĐT */}
                  {lastCheckin.reason && (
                    <div className="ck-lc-row">
                      <span className="ck-lc-row-label">Lý do check-in thủ công</span>
                      <span className="ck-lc-row-value">{lastCheckin.reason}</span>
                    </div>
                  )}

                  {lastCheckin.member.accountStatus === "Suspended" && lastCheckin.member.suspendReason && (
                    <div className="ck-lc-suspend-note">
                      <ShieldAlert size={13} />
                      <span>Lý do khoá: {lastCheckin.member.suspendReason}</span>
                    </div>
                  )}

                  {/* Ghi chú nội bộ — luôn nổi bật màu đỏ, chỉ nhân viên thấy, hội viên không thấy */}
                  {lastCheckin.member.internalNotes && (
                    <div className="ck-lc-internal-note">
                      <AlertCircle size={15} />
                      <div className="ck-lc-internal-note-text">
                        <span className="ck-lc-internal-note-label">Ghi chú nội bộ</span>
                        {lastCheckin.member.internalNotes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal "Check-in thủ công" — chọn lý do trước khi xác nhận check-in qua SĐT ── */}
      {reasonModalOpen && phoneLookupResult && (
        <div className="ck-overlay" onClick={e => e.target === e.currentTarget && closeReasonModal()}>
          <div className="ck-modal">
            <div className="ck-modal-head">
              <h3>Check-in thủ công</h3>
              <button className="ck-modal-close" onClick={closeReasonModal}><X size={13} /></button>
            </div>

            {checkinState === "loading" && (
              <div className="ck-checkin-state" style={{ padding: "36px 16px" }}>
                <div className="ck-spinner" style={{ width: 28, height: 28 }} />
                <p>Đang xử lý check-in…</p>
              </div>
            )}
            {checkinState === "success" && (
              <div className="ck-checkin-state" style={{ padding: "36px 16px" }}>
                <CheckCircle2 size={44} color="var(--primary)" />
                <p style={{ color: "var(--primary-dark)" }}>Check-in thành công!</p>
              </div>
            )}

            {!checkinState && (
              <>
                <div className="ck-modal-body">
                  <div className="ck-modal-member-top">
                    <div className="ck-modal-avatar">{initials(phoneLookupResult.member.fullName)}</div>
                    <div>
                      <p className="ck-modal-name">{phoneLookupResult.member.fullName}</p>
                      <div className="ck-modal-badges">
                        <StatusBadge status={phoneLookupResult.member.packageStatus} />
                        <AccountStatusBadge status={phoneLookupResult.member.accountStatus} />
                      </div>
                    </div>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Mã hội viên</span>
                    <span className="ck-info-value">#{phoneLookupResult.member.memberId}</span>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Số điện thoại</span>
                    <span className="ck-info-value">{phoneLookupResult.member.phone}</span>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Chi nhánh</span>
                    <span className="ck-info-value">{phoneLookupResult.member.branchName}</span>
                  </div>

                  <div className="ck-reason-field">
                    <label className="ck-reason-label">
                      Lý do check-in thủ công <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <div className="ck-device-select-wrap" style={{ margin: 0 }}>
                      <select
                        value={reasonType}
                        onChange={e => {
                          setReasonType(e.target.value);
                          if (e.target.value !== "other") setCustomReason("");
                        }}
                      >
                        <option value="">-- Chọn lý do --</option>
                        {MANUAL_REASON_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="ck-chevron" />
                    </div>

                    {reasonType === "other" && (
                      <textarea
                        className="ck-reason-textarea"
                        placeholder="Nhập lý do check-in thủ công…"
                        value={customReason}
                        onChange={e => setCustomReason(e.target.value)}
                        rows={2}
                      />
                    )}
                  </div>
                </div>
                <div className="ck-modal-foot">
                  <button className="ck-btn-cancel" onClick={closeReasonModal}>Huỷ</button>
                  <button
                    className="ck-btn ck-btn-primary"
                    onClick={handleConfirmManualCheckin}
                    disabled={!isReasonValid}
                  >
                    <LogIn size={13} /> Xác nhận check-in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`ck-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}