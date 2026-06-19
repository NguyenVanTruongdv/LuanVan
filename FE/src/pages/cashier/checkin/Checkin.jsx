import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  LogIn,
  Phone,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* =========================================================================
 * DỮ LIỆU MẪU — thay bằng dữ liệu thật khi gắn API
 * ======================================================================= */
const SAMPLE_MEMBERS = [
  { id: "M001", fullName: "Nguyễn Văn An", phone: "0901234567", memberCode: "GYM-0001", package: "Gói 12 tháng — Premium", expiryDate: "01/12/2026", status: "active" },
  { id: "M002", fullName: "Trần Thị Bích", phone: "0912345678", memberCode: "GYM-0002", package: "Gói 6 tháng — Standard", expiryDate: "05/07/2026", status: "expiring" },
  { id: "M003", fullName: "Lê Hoàng Cường", phone: "0987654321", memberCode: "GYM-0003", package: "Gói 1 tháng", expiryDate: "10/06/2026", status: "expired" },
  { id: "M004", fullName: "Phạm Thị Dung", phone: "0978123456", memberCode: "GYM-0004", package: "Gói 12 tháng — VIP", expiryDate: "20/01/2027", status: "active" },
  { id: "M005", fullName: "Hoàng Minh Đức", phone: "0966112233", memberCode: "GYM-0005", package: "Gói 3 tháng", expiryDate: "15/08/2026", status: "active" },
  { id: "M006", fullName: "Vũ Thị Hoa", phone: "0945667788", memberCode: "GYM-0006", package: "Gói 6 tháng — Standard", expiryDate: "20/06/2026", status: "expiring" },
];

const STATUS_MAP = {
  active: { label: "Còn hạn", cls: "badge-success" },
  expiring: { label: "Sắp hết hạn", cls: "badge-warning" },
  expired: { label: "Hết hạn", cls: "badge-danger" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active;
  return <span className={`ck-badge ${s.cls}`}>{s.label}</span>;
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}

export default function Checkin() {
  /* ── Camera state ── */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState("");

  /* ── Stop camera helper (used in multiple places) ── */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  /* ── Lấy danh sách camera ── */
  useEffect(() => {
    async function loadDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(s => s.getTracks().forEach(t => t.stop()))
          .catch(() => { });
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

  /* ── Dừng camera khi chuyển tab / ẩn trang ── */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopCamera();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [stopCamera]);

  /* ── Cleanup khi unmount (navigate sang trang khác) ── */
  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const constraints = {
        video: selectedDevId ? { deviceId: { exact: selectedDevId } } : { facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
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

  /* ── Nhận diện → check-in ngay, không cần modal xác nhận ── */
  const [cameraResult, setCameraResult] = useState(null);
  const [cameraCheckin, setCameraCheckin] = useState(null); // "loading" | "success" | "error"

  const handleMockRecognize = async () => {
    if (!isCameraOn) return;
    captureFrame();
    // TODO: gửi base64 lên POST /api/face-recognize
    setCameraResult(null);
    setCameraCheckin("loading");

    await new Promise(r => setTimeout(r, 500)); // giả lập nhận diện
    const member = SAMPLE_MEMBERS[Math.floor(Math.random() * SAMPLE_MEMBERS.length)];
    setCameraResult(member);

    if (member.status === "expired") {
      setCameraCheckin("error");
      showToast("error", `${member.fullName} — Thẻ đã hết hạn`);
    } else {
      // TODO API: POST /api/checkins { memberId: member.id, method: "camera" }
      await new Promise(r => setTimeout(r, 300));
      setCameraCheckin("success");
      showToast("success", `Check-in thành công — ${member.fullName}`);
    }

    setTimeout(() => setCameraCheckin(null), 3000);
  };

  /* ── Phone lookup ── */
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [checkinState, setCheckinState] = useState(null);

  const handlePhoneLookup = async () => {
    const phone = phoneInput.trim();
    setPhoneError("");
    if (!/^0\d{9}$/.test(phone)) {
      setPhoneError("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return;
    }
    setLookupLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const member = SAMPLE_MEMBERS.find(m => m.phone === phone) || null;
    setLookupLoading(false);
    if (member) {
      setModal({ member, source: "phone" });
    } else {
      setPhoneError("Không tìm thấy hội viên với số điện thoại này.");
    }
  };

  const closeModal = () => { setModal(null); setCheckinState(null); };

  const handleConfirmCheckin = async () => {
    if (!modal) return;
    setCheckinState("loading");
    await new Promise(r => setTimeout(r, 600));
    const ok = modal.member.status !== "expired";
    setCheckinState(ok ? "success" : "error");
    if (ok) {
      showToast("success", `Check-in thành công — ${modal.member.fullName}`);
      setTimeout(closeModal, 1200);
    }
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
          display: inline-flex; align-items: center; gap: 5px;
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
        .ck-phone-input-block { display: flex; gap: 8px; align-items: stretch; }
        .ck-input-wrap {
          flex: 1; display: flex; align-items: center; gap: 7px;
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

        /* ── Quick list ── */
        .ck-hint {
          font-size: 11px; color: var(--text-muted); font-weight: 600;
          text-transform: uppercase; letter-spacing: .04em; margin-bottom: 7px;
        }
        .ck-quick-list { display: flex; flex-direction: column; gap: 5px; }
        .ck-quick-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: #fff;
          cursor: pointer; transition: background .12s; font-size: 13px;
        }
        .ck-quick-item:hover { background: var(--surface-alt); }
        .ck-quick-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--primary-light); color: var(--primary-dark);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 11px;
          flex-shrink: 0;
        }
        .ck-quick-name  { font-weight: 600; font-size: 12.5px; }
        .ck-quick-phone { font-size: 11px; color: var(--text-muted); }

        /* ── Badge ── */
        .ck-badge {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
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
          display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
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
        .ck-info-row {
          display: flex; justify-content: space-between; gap: 8px;
          padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 13px;
        }
        .ck-info-row:last-child { border-bottom: none; }
        .ck-info-label { color: var(--text-muted); }
        .ck-info-value { font-weight: 600; text-align: right; }
        .ck-modal-expired-warn {
          margin-top: 12px; padding: 9px 10px;
          background: var(--danger-light); color: var(--danger);
          border-radius: var(--radius-sm); font-size: 12px;
          display: flex; align-items: flex-start; gap: 7px; font-weight: 500;
        }
        .ck-modal-foot {
          padding: 12px 16px 14px;
          display: flex; gap: 8px; justify-content: flex-end;
          border-top: 1px solid var(--border);
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
                <p>Thẻ hết hạn<br />{cameraResult.fullName}</p>
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
              <Sparkles size={13} /> Giả lập nhận diện
            </button>
          </div>

          {/* Last result bar */}
          {cameraResult && cameraCheckin !== "loading" && (
            <div className="ck-cam-result">
              <div className="ck-cam-result-avatar">{initials(cameraResult.fullName)}</div>
              <div style={{ flex: 1 }}>
                <div className="ck-cam-result-name">{cameraResult.fullName}</div>
                <div className="ck-cam-result-sub">
                  {cameraCheckin === "success" ? "✓ Đã check-in" : cameraCheckin === "error" ? "✗ Thẻ hết hạn" : "Lần nhận diện gần nhất"}
                </div>
              </div>
              <StatusBadge status={cameraResult.status} />
            </div>
          )}
        </div>

        {/* ── Right: Phone lookup ── */}
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

          <div>
            <p className="ck-hint">Gợi ý nhanh</p>
            <div className="ck-quick-list">
              {SAMPLE_MEMBERS.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  className="ck-quick-item"
                  onClick={() => { setPhoneInput(m.phone); setPhoneError(""); setModal({ member: m, source: "phone" }); }}
                >
                  <div className="ck-quick-avatar">{initials(m.fullName)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="ck-quick-name">{m.fullName}</div>
                    <div className="ck-quick-phone">{m.phone}</div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal xác nhận check-in (phone) ── */}
      {modal && (
        <div className="ck-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="ck-modal">
            <div className="ck-modal-head">
              <h3>Xác nhận check-in</h3>
              <button className="ck-modal-close" onClick={closeModal}><X size={13} /></button>
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
            {checkinState === "error" && (
              <div>
                <div className="ck-checkin-state" style={{ paddingBottom: 0 }}>
                  <XCircle size={44} color="var(--danger)" />
                  <p style={{ color: "var(--danger)" }}>Check-in thất bại. Thẻ hội viên đã hết hạn.</p>
                </div>
                <div className="ck-modal-foot">
                  <button className="ck-btn-cancel" onClick={closeModal}>Đóng</button>
                </div>
              </div>
            )}

            {!checkinState && (
              <>
                <div className="ck-modal-body">
                  <div className="ck-modal-member-top">
                    <div className="ck-modal-avatar">{initials(modal.member.fullName)}</div>
                    <div>
                      <p className="ck-modal-name">{modal.member.fullName}</p>
                      <StatusBadge status={modal.member.status} />
                    </div>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Mã hội viên</span>
                    <span className="ck-info-value">{modal.member.memberCode}</span>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Số điện thoại</span>
                    <span className="ck-info-value">{modal.member.phone}</span>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Gói tập</span>
                    <span className="ck-info-value">{modal.member.package}</span>
                  </div>
                  <div className="ck-info-row">
                    <span className="ck-info-label">Ngày hết hạn</span>
                    <span className="ck-info-value">{modal.member.expiryDate}</span>
                  </div>
                  {modal.member.status === "expired" && (
                    <div className="ck-modal-expired-warn">
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      Thẻ hội viên đã hết hạn. Không thể check-in.
                    </div>
                  )}
                </div>
                <div className="ck-modal-foot">
                  <button className="ck-btn-cancel" onClick={closeModal}>Huỷ</button>
                  <button
                    className="ck-btn ck-btn-primary"
                    onClick={handleConfirmCheckin}
                    disabled={modal.member.status === "expired"}
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
