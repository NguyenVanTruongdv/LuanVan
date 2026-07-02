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
 * TRANG GỘP CHECK-IN + CHECK-OUT
 * - 2 khung camera độc lập (Check-in: xanh lá / Check-out: đỏ)
 * - Bố cục 2 HÀNG (không phải 2 cột): hàng 1 = Check-in (camera | thông
 *   tin), hàng 2 = Check-out (camera | thông tin).
 * - Mỗi khung có: chọn camera, Bắt đầu, Dừng, Mở Cửa (demo)
 * - Camera đang được khung KIA sử dụng sẽ bị disable trong danh sách chọn.
 * - Check-in: giữ tra cứu theo SĐT + thông tin hội viên đầy đủ kèm avatar.
 * - Check-out: chỉ hiển thị avatar + tên người vừa check-out (tối giản).
 * - Toàn bộ lời gọi dữ liệu được tách ra object `api` bên dưới — sau này
 *   chỉ cần thay thân từng hàm bằng fetch() thật, KHÔNG cần sửa UI.
 * ======================================================================= */

/* ── Dữ liệu mẫu — thay bằng dữ liệu thật khi gắn API ── */
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
        photoUrl: null,
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
        photoUrl: "https://i.pravatar.cc/300?img=47",
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
        photoUrl: "https://i.pravatar.cc/300?img=12",
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
        photoUrl: "https://i.pravatar.cc/300?img=32",
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
        photoUrl: null,
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
        photoUrl: "https://i.pravatar.cc/300?img=44",
    },
];

const MANUAL_REASON_OPTIONS = [
    { value: "no_recognition", label: "Không nhận diện được khuôn mặt" },
    { value: "renewed", label: "Khách vừa gia hạn" },
    { value: "other", label: "Khác" },
];

const PACKAGE_STATUS_MAP = {
    active: { label: "Còn hạn", cls: "badge-success" },
    expiring: { label: "Sắp hết hạn", cls: "badge-warning" },
    expired: { label: "Hết hạn", cls: "badge-danger" },
};

const ACCOUNT_STATUS_MAP = {
    PendingActivation: { label: "Chờ kích hoạt", cls: "badge-warning" },
    Active: { label: "Đang hoạt động", cls: "badge-success" },
    Expired: { label: "Hết hạn", cls: "badge-danger" },
    Suspended: { label: "Đã bị khoá", cls: "badge-danger" },
};

/* =========================================================================
 * API SERVICE LAYER
 * Toàn bộ thao tác cần dữ liệu (nhận diện khuôn mặt, tra cứu SĐT, ghi
 * check-in/out) đi qua đây. Hiện tại là mock (setTimeout + dữ liệu mẫu).
 * Khi có backend thật, chỉ cần thay THÂN của từng hàm bằng fetch(...) —
 * chữ ký hàm (tham số / Promise trả về) giữ nguyên nên UI phía dưới
 * KHÔNG cần sửa gì thêm.
 * ======================================================================= */
const api = {
    // POST /api/face-recognize  { image, type: "checkin" | "checkout" }
    // -> { member }  (member = null nếu không nhận diện được ai)
    async recognizeFace(imageBase64, type) {
        await new Promise(r => setTimeout(r, 500));
        const member = SAMPLE_MEMBERS[Math.floor(Math.random() * SAMPLE_MEMBERS.length)];
        return { member };
    },

    // GET /api/members/lookup?phone={phone}  -> { member }  (null nếu không thấy)
    async lookupMemberByPhone(phone) {
        await new Promise(r => setTimeout(r, 400));
        const member = SAMPLE_MEMBERS.find(m => m.phone === phone) || null;
        return { member };
    },

    // POST /api/checkins  { memberId, method: "camera" }
    async checkinByCamera(memberId) {
        await new Promise(r => setTimeout(r, 300));
        return { success: true };
    },

    // POST /api/checkins  { memberId, method: "phone", manualReason }
    async checkinManual(memberId, manualReason) {
        await new Promise(r => setTimeout(r, 600));
        return { success: true };
    },

    // POST /api/checkouts  { memberId, method: "camera" }
    async checkoutByCamera(memberId) {
        await new Promise(r => setTimeout(r, 300));
        return { success: true };
    },
};

function StatusBadge({ status }) {
    const s = PACKAGE_STATUS_MAP[status] || PACKAGE_STATUS_MAP.active;
    return <span className={`rec-badge ${s.cls}`}>{s.label}</span>;
}
function AccountStatusBadge({ status }) {
    const s = ACCOUNT_STATUS_MAP[status] || ACCOUNT_STATUS_MAP.Active;
    return <span className={`rec-badge ${s.cls}`}>{s.label}</span>;
}
function initials(name) {
    return name.split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}

function MemberAvatar({ member, className = "rec-lc-avatar", onView }) {
    const hasPhoto = !!member?.photoUrl;
    return (
        <div
            className={`${className}${hasPhoto ? " has-photo" : ""}`}
            onClick={hasPhoto ? () => onView?.(member) : undefined}
            role={hasPhoto ? "button" : undefined}
            title={hasPhoto ? "Bấm để xem ảnh" : undefined}
        >
            {hasPhoto ? <img src={member.photoUrl} alt={member.fullName} /> : initials(member?.fullName || "")}
        </div>
    );
}

function MemberTop({ member, extraTopContent, nameContent, onViewPhoto }) {
    return (
        <div className="rec-lc-top">
            {extraTopContent}
            <MemberAvatar member={member} onView={onViewPhoto} />
            <div>{nameContent}</div>
        </div>
    );
}

function canCheckin(member) {
    if (!member) return false;
    if (member.accountStatus === "Suspended") return false;
    if (member.accountStatus === "Expired") return false;
    if (member.packageStatus === "expired") return false;
    return true;
}
function getIneligibleReason(member) {
    if (!member) return "";
    if (member.accountStatus === "Suspended") {
        return `Tài khoản đã bị khoá${member.suspendReason ? `: ${member.suspendReason}` : "."}`;
    }
    if (member.accountStatus === "Expired") return "Tài khoản đã hết hạn sử dụng. Không thể check-in.";
    if (member.packageStatus === "expired") return "Gói tập đã hết hạn. Vui lòng gia hạn trước khi check-in.";
    return "";
}
/* Hội viên bị khoá/hết hạn vẫn cho phép check-out (đang có mặt trong gym),
 * chỉ chặn tài khoản chưa từng kích hoạt. */
function canCheckout(member) {
    if (!member) return false;
    if (member.accountStatus === "PendingActivation") return false;
    return true;
}

export default function CameraRecognition() {
    /* Tiêu đề tab trình duyệt. Đây chỉ đổi title lúc component mount — nếu
     * muốn tiêu đề đúng ngay từ lần tải trang đầu tiên (trước khi React
     * chạy), hãy sửa luôn thẻ <title> trong index.html của dự án. */
    useEffect(() => {
        document.title = "Nhận diện Camera — Check-in / Check-out";
    }, []);

    /* ============================ DÙNG CHUNG ============================ */
    const [devices, setDevices] = useState([]);
    const [toast, setToast] = useState(null);
    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3500);
    };
    const [photoViewMember, setPhotoViewMember] = useState(null);

    useEffect(() => {
        async function loadDevices() {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    .then(s => s.getTracks().forEach(t => t.stop()))
                    .catch(() => { });
                const all = await navigator.mediaDevices.enumerateDevices();
                setDevices(all.filter(d => d.kind === "videoinput"));
            } catch (_) { }
        }
        loadDevices();
        navigator.mediaDevices.addEventListener?.("devicechange", loadDevices);
        return () => navigator.mediaDevices.removeEventListener?.("devicechange", loadDevices);
    }, []);

    /* ============================ CHECK-IN CAMERA ============================ */
    const ckVideoRef = useRef(null);
    const ckCanvasRef = useRef(null);
    const ckStreamRef = useRef(null);
    const [ckCameraOn, setCkCameraOn] = useState(false);
    const [ckCameraError, setCkCameraError] = useState("");
    const [ckSelectedDevId, setCkSelectedDevId] = useState("");
    const [ckActiveDevId, setCkActiveDevId] = useState(null); // camera đang thực sự chạy

    /* ============================ CHECK-OUT CAMERA ============================ */
    const coVideoRef = useRef(null);
    const coCanvasRef = useRef(null);
    const coStreamRef = useRef(null);
    const [coCameraOn, setCoCameraOn] = useState(false);
    const [coCameraError, setCoCameraError] = useState("");
    const [coSelectedDevId, setCoSelectedDevId] = useState("");
    const [coActiveDevId, setCoActiveDevId] = useState(null);

    /* Gán mặc định: check-in lấy camera đầu tiên, check-out lấy camera kế tiếp
     * (nếu có), tránh trùng ngay từ đầu. */
    useEffect(() => {
        if (devices.length === 0) return;
        setCkSelectedDevId(cur => cur || devices[0].deviceId);
        setCoSelectedDevId(cur => cur || (devices[1]?.deviceId ?? devices[0].deviceId));
    }, [devices]);

    const startCkCamera = useCallback(async (devIdParam) => {
        setCkCameraError("");
        const devId = devIdParam || ckSelectedDevId;
        if (!devId) return;
        if (devId === coActiveDevId) {
            setCkCameraError("Camera này đang được dùng ở khung Check-out. Vui lòng chọn camera khác.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devId } }, audio: false });
            ckStreamRef.current = stream;
            if (ckVideoRef.current) ckVideoRef.current.srcObject = stream;
            setCkCameraOn(true);
            setCkActiveDevId(devId);
        } catch {
            setCkCameraError("Không thể truy cập camera. Kiểm tra quyền truy cập trình duyệt.");
        }
    }, [ckSelectedDevId, coActiveDevId]);

    const stopCkCamera = useCallback(() => {
        ckStreamRef.current?.getTracks().forEach(t => t.stop());
        ckStreamRef.current = null;
        if (ckVideoRef.current) ckVideoRef.current.srcObject = null;
        setCkCameraOn(false);
        setCkActiveDevId(null);
    }, []);

    const handleCkDeviceChange = (e) => {
        const devId = e.target.value;
        setCkSelectedDevId(devId);
        if (ckCameraOn) {
            stopCkCamera();
            setTimeout(() => startCkCamera(devId), 100);
        }
    };

    const startCoCamera = useCallback(async (devIdParam) => {
        setCoCameraError("");
        const devId = devIdParam || coSelectedDevId;
        if (!devId) return;
        if (devId === ckActiveDevId) {
            setCoCameraError("Camera này đang được dùng ở khung Check-in. Vui lòng chọn camera khác.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devId } }, audio: false });
            coStreamRef.current = stream;
            if (coVideoRef.current) coVideoRef.current.srcObject = stream;
            setCoCameraOn(true);
            setCoActiveDevId(devId);
        } catch {
            setCoCameraError("Không thể truy cập camera. Kiểm tra quyền truy cập trình duyệt.");
        }
    }, [coSelectedDevId, ckActiveDevId]);

    const stopCoCamera = useCallback(() => {
        coStreamRef.current?.getTracks().forEach(t => t.stop());
        coStreamRef.current = null;
        if (coVideoRef.current) coVideoRef.current.srcObject = null;
        setCoCameraOn(false);
        setCoActiveDevId(null);
    }, []);

    const handleCoDeviceChange = (e) => {
        const devId = e.target.value;
        setCoSelectedDevId(devId);
        if (coCameraOn) {
            stopCoCamera();
            setTimeout(() => startCoCamera(devId), 100);
        }
    };

    // Dừng cả 2 camera khi rời trang (trang này mở riêng ở tab mới nên không
    // cần giữ stream sống qua điều hướng SPA như trước).
    useEffect(() => {
        return () => {
            ckStreamRef.current?.getTracks().forEach(t => t.stop());
            coStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const ckCaptureFrame = () => {
        const video = ckVideoRef.current, canvas = ckCanvasRef.current;
        if (!video || !canvas) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8);
    };
    const coCaptureFrame = () => {
        const video = coVideoRef.current, canvas = coCanvasRef.current;
        if (!video || !canvas) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8);
    };

    /* ============================ CHECK-IN: logic nghiệp vụ ============================ */
    const [lastCheckin, setLastCheckin] = useState(null); // { member, source, result, reason, at }
    const recordCheckin = (member, source, result, reason) => {
        setPhoneLookupResult(null);
        setLastCheckin({ member, source, result, reason, at: new Date() });
    };

    const [ckRecognizeResult, setCkRecognizeResult] = useState(null);
    const [ckRecognizeStatus, setCkRecognizeStatus] = useState(null); // "loading" | "success" | "error"

    const handleCkRecognize = async () => {
        if (!ckCameraOn) return;
        const frame = ckCaptureFrame();
        setCkRecognizeResult(null);
        setCkRecognizeStatus("loading");

        const { member } = await api.recognizeFace(frame, "checkin");
        setCkRecognizeResult(member);

        if (!canCheckin(member)) {
            setCkRecognizeStatus("error");
            showToast("error", `${member.fullName} — không thể check-in`);
            recordCheckin(member, "camera", "error");
        } else {
            await api.checkinByCamera(member.memberId);
            setCkRecognizeStatus("success");
            showToast("success", `Check-in thành công — ${member.fullName}`);
            recordCheckin(member, "camera", "success");
        }
        setTimeout(() => setCkRecognizeStatus(null), 3000);
    };

    /* Tra cứu theo SĐT */
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

        const { member } = await api.lookupMemberByPhone(phone);
        setLookupLoading(false);

        if (member) setPhoneLookupResult({ member });
        else setPhoneError("Không tìm thấy hội viên với số điện thoại này.");
    };

    const dismissLookupResult = () => {
        setPhoneLookupResult(null);
        setPhoneInput("");
        setPhoneError("");
    };

    /* Modal check-in thủ công (chọn lý do) */
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [reasonType, setReasonType] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [manualCheckinState, setManualCheckinState] = useState(null); // "loading" | "success"

    const openReasonModal = () => {
        if (!phoneLookupResult || !canCheckin(phoneLookupResult.member)) return;
        setReasonType("");
        setCustomReason("");
        setManualCheckinState(null);
        setReasonModalOpen(true);
    };
    const closeReasonModal = () => {
        setReasonModalOpen(false);
        setReasonType("");
        setCustomReason("");
        setManualCheckinState(null);
    };
    const isReasonValid = !!reasonType && (reasonType !== "other" || customReason.trim().length > 0);

    const handleConfirmManualCheckin = async () => {
        if (!phoneLookupResult || !isReasonValid) return;
        const member = phoneLookupResult.member;
        const reasonLabel = reasonType === "other"
            ? customReason.trim()
            : MANUAL_REASON_OPTIONS.find(r => r.value === reasonType)?.label;

        setManualCheckinState("loading");
        await api.checkinManual(member.memberId, reasonLabel);
        setManualCheckinState("success");
        recordCheckin(member, "phone", "success", reasonLabel);
        showToast("success", `Check-in thành công — ${member.fullName}`);
        setTimeout(() => {
            closeReasonModal();
            setPhoneLookupResult(null);
            setPhoneInput("");
        }, 1200);
    };

    const ckInfoMember = phoneLookupResult ? phoneLookupResult.member : lastCheckin?.member;
    const ckInfoIsLookup = !!phoneLookupResult;

    /* ============================ CHECK-OUT: logic nghiệp vụ ============================ */
    const [lastCheckout, setLastCheckout] = useState(null); // { member, result, at }
    const [coRecognizeResult, setCoRecognizeResult] = useState(null);
    const [coRecognizeStatus, setCoRecognizeStatus] = useState(null); // "loading" | "success" | "error"

    const handleCoRecognize = async () => {
        if (!coCameraOn) return;
        const frame = coCaptureFrame();
        setCoRecognizeResult(null);
        setCoRecognizeStatus("loading");

        const { member } = await api.recognizeFace(frame, "checkout");
        setCoRecognizeResult(member);

        if (!canCheckout(member)) {
            setCoRecognizeStatus("error");
            showToast("error", `${member.fullName} — không thể check-out`);
            setLastCheckout({ member, result: "error", at: new Date() });
        } else {
            await api.checkoutByCamera(member.memberId);
            setCoRecognizeStatus("success");
            showToast("success", `Check-out thành công — ${member.fullName}`);
            setLastCheckout({ member, result: "success", at: new Date() });
        }
        setTimeout(() => setCoRecognizeStatus(null), 3000);
    };

    const coInfoMember = lastCheckout?.member;

    /* ============================ RENDER ============================ */
    return (
        <div className="rec-wrap">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg: #ffffff; --surface: #f8fafc; --surface-alt: #eef2f5; --border: #e2e8f0;
          --text: #0f172a; --text-muted: #64748b;
          --primary: #0ea975; --primary-dark: #067a56; --primary-light: #e3f8ef;
          --warning: #d97706; --warning-light: #fef3c7;
          --danger: #dc2626; --danger-light: #fee2e2;
          --indigo: #6366f1; --indigo-light: #eef2ff;
          --cko-primary: #dc2626; --cko-primary-dark: #b91c1c; --cko-primary-light: #fee2e2;
          --radius-lg: 14px; --radius-md: 10px; --radius-sm: 7px;
        }
        .rec-wrap *, .rec-wrap *::before, .rec-wrap *::after { box-sizing: border-box; }
        .rec-wrap {
          font-family: 'Inter', system-ui, sans-serif; color: var(--text);
          width: 100%; padding: 8px 8px 32px; background: var(--bg);
          display: flex; flex-direction: column; gap: 18px;
        }

        /* ── Tiêu đề trang ── */
        .rec-page-head { display: flex; align-items: center; gap: 10px; padding: 2px 4px 0; }
        .rec-page-head h1 {
          font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; margin: 0;
        }
        .rec-page-head span {
          font-size: 12px; color: var(--text-muted); font-weight: 500;
        }

        /* ── Section header (phân biệt Check-in / Check-out) ── */
        .rec-section-head {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: var(--radius-md);
          margin-bottom: 6px;
        }
        .rec-section-head.checkin  { background: var(--primary-light); border-left: 4px solid var(--primary); }
        .rec-section-head.checkout { background: var(--cko-primary-light); border-left: 4px solid var(--cko-primary); }
        .rec-section-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .rec-section-head.checkin .rec-section-dot  { background: var(--primary); }
        .rec-section-head.checkout .rec-section-dot { background: var(--cko-primary); }
        .rec-section-head h2 {
          font-family: 'Outfit', sans-serif; font-size: 14.5px; font-weight: 800; margin: 0;
        }
        .rec-section-head.checkin h2  { color: var(--primary-dark); }
        .rec-section-head.checkout h2 { color: var(--cko-primary-dark); }
        .rec-section-head .rec-section-sub { font-size: 11.5px; color: var(--text-muted); font-weight: 500; }

        /* ── Grid dùng chung cho cả 2 khu vực (mỗi khu vực là 1 hàng: camera | thông tin) ── */
        .rec-grid {
          display: grid; grid-template-columns: 1.3fr 1fr; gap: 8px;
          align-items: stretch; height: 700px;
        }
        @media (max-width: 820px) {
          .rec-grid { grid-template-columns: 1fr; height: auto; }
        }
        /* Hàng Check-out cao tương đương để camera vuông hơn */
        .rec-grid.checkout-row { height: 620px; }
        @media (max-width: 820px) {
          .rec-grid.checkout-row { height: auto; }
        }

        /* Khung camera + khung thông tin trong cùng 1 hàng cao bằng nhau
         * (grid align-items: stretch). Viền màu chỉ nằm ở khung camera bên
         * trong (rec-viewport), không phải viền ngoài của cả card. */
        .rec-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 10px;
          display: flex; flex-direction: column; min-height: 0; height: 100%;
        }
        .rec-card-title {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px; gap: 8px; flex-wrap: wrap; flex-shrink: 0;
        }
        .rec-card-title h3 { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; margin: 0; }

        /* Khối tiêu đề phía trên khung màu (camera / thẻ thông tin) — có
         * chiều cao cố định theo từng hàng để 2 khung màu xanh (hoặc đỏ)
         * bên dưới luôn bắt đầu ngang hàng nhau, bất kể bên nào có nhiều
         * nội dung hơn (vd bên info có thêm ô tra cứu SĐT). */
        .rec-panel-header { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
        .rec-panel-header .rec-card-title,
        .rec-panel-header .rec-select-wrap,
        .rec-panel-header .rec-phone-input-block,
        .rec-panel-header .rec-info-panel-head { margin-bottom: 0; }
        .rec-panel-header.row-in  { min-height: 108px; }
        .rec-panel-header.row-out { min-height: 74px; }

        .rec-status-pill { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--text-muted); }
        .rec-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
        .rec-dot.on.checkin  { background: var(--primary); animation: rec-pulse-g 1.6s infinite; }
        .rec-dot.on.checkout { background: var(--cko-primary); animation: rec-pulse-r 1.6s infinite; }
        @keyframes rec-pulse-g { 0%,100% { box-shadow: 0 0 0 0 rgba(14,169,117,.45);} 50% { box-shadow: 0 0 0 5px rgba(14,169,117,0);} }
        @keyframes rec-pulse-r { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.45);} 50% { box-shadow: 0 0 0 5px rgba(220,38,38,0);} }

        .rec-select-wrap { position: relative; margin-bottom: 8px; flex-shrink: 0; }
        .rec-select-wrap select {
          appearance: none; width: 100%; padding: 7px 32px 7px 10px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: #fff; font-size: 12px; color: var(--text);
          font-family: 'Inter', sans-serif; cursor: pointer; outline: none; transition: border-color .15s;
        }
        .rec-select-wrap select:focus { border-color: var(--primary); }
        .rec-select-wrap .rec-chevron { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); }

        .rec-viewport {
          position: relative; aspect-ratio: 1 / 1; width: auto; height: 100%;
          max-width: 100%; margin: 0 auto; flex-shrink: 1; min-height: 0;
          background: #0f172a; border-radius: var(--radius-md); overflow: hidden;
          border: 2px solid var(--border); transition: border-color .2s;
        }
        @media (max-width: 820px) {
          .rec-viewport { width: 100%; height: auto; }
        }
        .rec-viewport.checkin  { border-color: var(--primary); }
        .rec-viewport.checkout { border-color: var(--cko-primary); }
        .rec-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .rec-placeholder {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px; color: #94a3b8;
        }
        .rec-placeholder svg { width: 28px; height: 28px; }
        .rec-placeholder p { margin: 0; font-weight: 600; font-size: 13px; color: #cbd5e1; }
        .rec-placeholder span { font-size: 11px; }
        .rec-scan {
          position: absolute; left: 0; width: 100%; height: 2px;
          animation: rec-scan 2.2s ease-in-out infinite;
        }
        .rec-scan.checkin  { background: linear-gradient(90deg, transparent, var(--primary), transparent); }
        .rec-scan.checkout { background: linear-gradient(90deg, transparent, var(--cko-primary), transparent); }
        @keyframes rec-scan { 0% { top: 4%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 94%; opacity: 0; } }

        .rec-viewport-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px; backdrop-filter: blur(2px);
        }
        .rec-viewport-overlay.loading { background: rgba(15,23,42,.5); }
        .rec-viewport-overlay.success.checkin  { background: rgba(6,122,86,.7); }
        .rec-viewport-overlay.success.checkout { background: rgba(185,28,28,.7); }
        .rec-viewport-overlay.error   { background: rgba(220,38,38,.7); }
        .rec-viewport-overlay p { margin: 0; color: #fff; font-weight: 700; font-size: 13px; text-align: center; padding: 0 12px; }

        .rec-cam-error {
          margin-top: 8px; padding: 8px 10px; border-radius: var(--radius-sm);
          background: var(--danger-light); color: var(--danger); font-size: 12px;
          display: flex; align-items: flex-start; gap: 7px; flex-shrink: 0;
        }

        .rec-btn-row { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; flex-shrink: 0; }
        .rec-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 6px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;
          cursor: pointer; border: 1px solid transparent; transition: all .15s; font-family: 'Inter', sans-serif;
        }
        .rec-btn:disabled { opacity: .4; cursor: not-allowed; }
        .rec-btn-primary.checkin  { background: var(--primary); color: #fff; }
        .rec-btn-primary.checkin:hover:not(:disabled)  { background: var(--primary-dark); }
        .rec-btn-primary.checkout { background: var(--cko-primary); color: #fff; }
        .rec-btn-primary.checkout:hover:not(:disabled) { background: var(--cko-primary-dark); }
        .rec-btn-danger { background: #fff; border-color: #fecaca; color: var(--danger); }
        .rec-btn-danger:hover:not(:disabled) { background: var(--danger-light); }
        .rec-btn-indigo { background: #fff; border-color: #c7d2fe; color: var(--indigo); }
        .rec-btn-indigo:hover:not(:disabled) { background: var(--indigo-light); }

        /* ── Panel phải: check-in (SĐT + info) / check-out (chỉ tên) ── */
        .rec-side-panel { display: flex; flex-direction: column; gap: 8px; height: 100%; min-height: 0; }
        .rec-phone-input-block { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; flex-shrink: 0; }
        .rec-input-wrap {
          flex: 1; min-width: 160px; display: flex; align-items: center; gap: 7px;
          border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px;
          background: #fff; transition: border-color .15s;
        }
        .rec-input-wrap:focus-within { border-color: var(--primary); }
        .rec-input-wrap input {
          border: none; outline: none; padding: 9px 0; flex: 1; font-size: 13px;
          background: transparent; color: var(--text); font-family: 'Inter', sans-serif;
        }
        .rec-input-wrap svg { color: var(--text-muted); flex-shrink: 0; }
        .rec-phone-error { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: var(--danger); font-weight: 500; flex-shrink: 0; }

        .rec-hint { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 7px; }
        .rec-info-panel-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .rec-info-panel-head .rec-hint { margin-bottom: 0; }
        .rec-info-close {
          width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: var(--surface-alt); border: none; cursor: pointer; color: var(--text-muted); transition: background .15s; flex-shrink: 0;
        }
        .rec-info-close:hover { background: var(--border); }

        .rec-info-area {
          flex: 1 1 0% !important; min-height: 0 !important; height: 100% !important;
          display: flex !important; flex-direction: column !important;
        }
        /* Khung camera có hàng nút Bắt đầu/Dừng/Mở cửa bên dưới, khung info
         * thì không -> thêm 1 khoảng đệm vô hình cao bằng hàng nút đó, để
         * điểm KẾT THÚC của khung màu bên info bằng với khung màu camera. */
        .rec-footer-spacer { flex-shrink: 0; height: 33px; }
        .rec-lastcheckin-empty {
          flex: 1 1 0% !important; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; text-align: center; padding: 28px 12px;
          border: 1.5px dashed var(--border); border-radius: var(--radius-md); color: var(--text-muted);
        }
        .rec-lastcheckin-empty p { margin: 0; font-size: 12.5px; font-weight: 600; }
        .rec-lastcheckin-empty span { font-size: 11px; }

        .rec-lc-card {
          flex: 1 1 0% !important; min-height: 0 !important; height: 100% !important;
          border-radius: var(--radius-md); border: 1.5px solid var(--border); background: #fff;
          overflow: hidden; display: flex; flex-direction: column;
        }
        .rec-lc-card.success.checkin        { border-color: var(--primary); }
        .rec-lc-card.success.checkout       { border-color: var(--cko-primary); }
        .rec-lc-card.error                  { border-color: var(--danger); }
        .rec-lc-card.lookup-ok              { border-color: var(--primary); }
        .rec-lc-card.lookup-blocked         { border-color: var(--danger); }

        /* Thẻ check-out tối giản: căn giữa toàn bộ nội dung theo chiều dọc */
        .rec-lc-card.checkout-minimal { align-items: stretch; justify-content: center; }

        .rec-lc-top {
          position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 12px 10px 10px; background: var(--surface-alt); text-align: center; flex-shrink: 0;
        }
        .rec-lc-card.success.checkin .rec-lc-top,
        .rec-lc-card.lookup-ok .rec-lc-top      { background: var(--primary-light); }
        .rec-lc-card.success.checkout .rec-lc-top { background: var(--cko-primary-light); }
        .rec-lc-card.error .rec-lc-top,
        .rec-lc-card.lookup-blocked .rec-lc-top { background: var(--danger-light); }
        .rec-lc-card.checkout-minimal .rec-lc-top { flex: 1; justify-content: center; padding: 16px 10px; }

        .rec-lc-avatar {
          width: 34%; aspect-ratio: 1 / 1; max-width: 130px; min-width: 64px; border-radius: 20%;
          background: var(--primary-dark); color: #fff; display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 2em; flex-shrink: 0; overflow: hidden; position: relative;
        }
        .rec-lc-avatar.has-photo { cursor: pointer; background: var(--surface-alt); }
        .rec-lc-avatar.has-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .15s; }
        .rec-lc-avatar.has-photo:hover img { transform: scale(1.06); }
        .rec-lc-card.error .rec-lc-avatar,
        .rec-lc-card.lookup-blocked .rec-lc-avatar { background: var(--danger); }
        .rec-lc-card.success.checkout .rec-lc-avatar { background: var(--cko-primary-dark); }

        .rec-lc-name { font-weight: 700; font-size: 13.5px; margin: 0; word-break: break-word; }
        .rec-lc-card.checkout-minimal .rec-lc-name { font-size: 16px; margin-bottom: 2px; }
        .rec-lc-result-line { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11.5px; font-weight: 700; }
        .rec-lc-result-line.success.checkin  { color: var(--primary-dark); }
        .rec-lc-result-line.success.checkout { color: var(--cko-primary-dark); }
        .rec-lc-result-line.error   { color: var(--danger); }
        .rec-lc-checkout-time { margin: 6px 0 0; font-size: 11px; color: var(--text-muted); font-weight: 600; }

        .rec-lc-source {
          position: absolute; top: 10px; right: 10px; flex-shrink: 0;
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          background: #fff; border: 1px solid var(--border); padding: 2px 7px; border-radius: 999px; white-space: nowrap;
        }

        .rec-lc-body { padding: 6px 12px 10px; flex: 1; overflow-y: auto; min-height: 0; }
        .rec-lc-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 5px 0; border-bottom: 1px dashed var(--border); font-size: 12px; }
        .rec-lc-row:last-of-type { border-bottom: none; }
        .rec-lc-row-label { color: var(--text-muted); flex-shrink: 0; }
        .rec-lc-row-value { font-weight: 600; text-align: right; word-break: break-word; }

        .rec-lc-internal-note {
          margin-top: 10px; padding: 9px 10px; border-radius: var(--radius-sm);
          background: var(--danger-light); border: 1px solid #fca5a5; display: flex; align-items: flex-start; gap: 7px;
        }
        .rec-lc-internal-note svg { flex-shrink: 0; margin-top: 1px; color: var(--danger); }
        .rec-lc-internal-note-text { font-size: 12px; font-weight: 700; color: var(--danger); line-height: 1.45; word-break: break-word; }
        .rec-lc-internal-note-label { display: block; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--danger); margin-bottom: 2px; }

        .rec-lc-suspend-note {
          margin-top: 8px; padding: 9px 10px; border-radius: var(--radius-sm);
          background: #fff7ed; border: 1px solid #fed7aa; font-size: 12px; color: var(--warning); font-weight: 600;
          display: flex; align-items: flex-start; gap: 7px;
        }
        .rec-lc-suspend-note svg { flex-shrink: 0; margin-top: 1px; }

        .rec-lc-checkin-btn { width: 100%; margin-top: 10px; padding: 9px 12px; font-size: 13px; }
        .rec-lc-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }

        .rec-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .badge-success { background: var(--primary-light); color: var(--primary-dark); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-danger  { background: var(--danger-light);  color: var(--danger); }

        /* ── Modal (chung) ── */
        .rec-overlay {
          position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,.45);
          display: flex; align-items: center; justify-content: center; padding: 16px; animation: rec-fade-in .15s ease;
        }
        @keyframes rec-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .rec-modal {
          background: #fff; border-radius: var(--radius-lg); width: 100%; max-width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: rec-slide-up .2s ease; overflow: hidden;
          max-height: 90vh; overflow-y: auto;
        }
        @keyframes rec-slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .rec-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 12px; border-bottom: 1px solid var(--border); }
        .rec-modal-head h3 { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin: 0; }
        .rec-modal-close {
          width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: var(--surface-alt); border: none; cursor: pointer; color: var(--text-muted); transition: background .15s;
        }
        .rec-modal-close:hover { background: var(--border); }
        .rec-modal-body { padding: 16px; }
        .rec-modal-member-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .rec-modal-avatar {
          width: 64px; height: 64px; border-radius: 18px; background: var(--primary-light); color: var(--primary-dark);
          display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-weight: 700;
          font-size: 20px; flex-shrink: 0; overflow: hidden;
        }
        .rec-modal-avatar.has-photo { cursor: pointer; background: var(--surface-alt); }
        .rec-modal-avatar.has-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .rec-modal-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin: 0 0 4px; }
        .rec-modal-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .rec-info-row { display: flex; justify-content: space-between; gap: 8px; padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 13px; }
        .rec-info-row:last-child { border-bottom: none; }
        .rec-info-label { color: var(--text-muted); flex-shrink: 0; }
        .rec-info-value { font-weight: 600; text-align: right; word-break: break-word; }

        .rec-reason-field { margin-top: 14px; }
        .rec-reason-label { display: block; font-size: 12.5px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .rec-reason-textarea {
          width: 100%; margin-top: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 8px 10px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); resize: vertical;
          outline: none; transition: border-color .15s;
        }
        .rec-reason-textarea:focus { border-color: var(--primary); }

        .rec-modal-foot { padding: 12px 16px 14px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border); flex-wrap: wrap; }
        .rec-btn-cancel {
          background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
          padding: 8px 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background .15s; font-family: 'Inter', sans-serif;
        }
        .rec-btn-cancel:hover { background: var(--surface-alt); }
        .rec-checkin-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px; text-align: center; }
        .rec-checkin-state p { margin: 0; font-weight: 600; font-size: 13px; }

        .rec-photo-modal {
          background: transparent; border-radius: var(--radius-lg); width: auto; max-width: 92vw; box-shadow: none;
          animation: rec-slide-up .2s ease; overflow: visible; display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .rec-photo-modal img { max-width: 92vw; max-height: 78vh; border-radius: var(--radius-md); display: block; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
        .rec-photo-modal-close {
          align-self: flex-end; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: #fff; border: none; cursor: pointer; color: var(--text); transition: background .15s;
        }
        .rec-photo-modal-close:hover { background: var(--surface-alt); }
        .rec-photo-modal-name { color: #fff; font-weight: 700; font-size: 14px; text-align: center; margin: 0; }

        .rec-toast {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1100;
          display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px;
          font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.15); animation: rec-toast-in .2s ease;
          white-space: nowrap; max-width: calc(100vw - 32px); overflow: hidden; text-overflow: ellipsis;
        }
        @keyframes rec-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .rec-toast.success { background: var(--primary); color: #fff; }
        .rec-toast.error   { background: var(--danger);  color: #fff; }

        .rec-spinner { border-radius: 50%; border: 3px solid var(--primary-light); border-top-color: var(--primary); animation: rec-spin .7s linear infinite; }
        @keyframes rec-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .rec-wrap { padding: 8px; }
          .rec-card { padding: 12px; }
          .rec-lc-row { font-size: 12px; }
        }
      `}</style>



            {/* ============================ HÀNG 1: CHECK-IN ============================ */}
            <div>
                <div className="rec-section-head checkin">
                    <span className="rec-section-dot" />
                    <h2>CHECK-IN</h2>
                    <span className="rec-section-sub">Nhận diện qua camera hoặc tra cứu theo số điện thoại</span>
                </div>

                <div className="rec-grid">
                    {/* Camera check-in */}
                    <div className="rec-card checkin">
                        <canvas ref={ckCanvasRef} style={{ display: "none" }} />
                        <div className="rec-panel-header row-in">
                            <div className="rec-card-title">
                                <h3>Camera Check-in</h3>
                                <span className="rec-status-pill">
                                    <span className={`rec-dot checkin ${ckCameraOn ? "on" : ""}`} />
                                    {ckCameraOn ? "Đang hoạt động" : "Đã tắt"}
                                </span>
                            </div>

                            <div className="rec-select-wrap">
                                <select value={ckSelectedDevId} onChange={handleCkDeviceChange} disabled={devices.length === 0}>
                                    {devices.length === 0 && <option>Chưa phát hiện camera</option>}
                                    {devices.map(d => {
                                        const usedByOther = d.deviceId === coActiveDevId;
                                        return (
                                            <option key={d.deviceId} value={d.deviceId} disabled={usedByOther}>
                                                {(d.label || `Camera ${d.deviceId.slice(0, 8)}…`)}{usedByOther ? " (đang dùng ở Check-out)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown size={13} className="rec-chevron" />
                            </div>
                        </div>

                        <div className={`rec-viewport checkin ${ckCameraOn ? "on" : ""}`}>
                            <video ref={ckVideoRef} autoPlay playsInline muted className="rec-video" style={{ display: ckCameraOn ? "block" : "none" }} />
                            {!ckCameraOn && (
                                <div className="rec-placeholder">
                                    <CameraOff size={28} />
                                    <p>Camera đang tắt</p>
                                    <span>Nhấn "Bắt đầu" để mở camera</span>
                                </div>
                            )}
                            {ckCameraOn && !ckRecognizeStatus && <div className="rec-scan checkin" />}
                            {ckRecognizeStatus === "loading" && (
                                <div className="rec-viewport-overlay loading">
                                    <div className="rec-spinner" style={{ width: 32, height: 32 }} />
                                    <p>Đang nhận diện &amp; check-in…</p>
                                </div>
                            )}
                            {ckRecognizeStatus === "success" && ckRecognizeResult && (
                                <div className="rec-viewport-overlay success checkin">
                                    <CheckCircle2 size={40} color="#fff" />
                                    <p>Check-in thành công!<br />{ckRecognizeResult.fullName}</p>
                                </div>
                            )}
                            {ckRecognizeStatus === "error" && ckRecognizeResult && (
                                <div className="rec-viewport-overlay error">
                                    <XCircle size={40} color="#fff" />
                                    <p>Không thể check-in<br />{ckRecognizeResult.fullName}</p>
                                </div>
                            )}
                        </div>

                        {ckCameraError && (
                            <div className="rec-cam-error"><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{ckCameraError}</div>
                        )}

                        <div className="rec-btn-row">
                            <button className="rec-btn rec-btn-primary checkin" onClick={() => startCkCamera()} disabled={ckCameraOn}>
                                <Camera size={13} /> Bắt đầu
                            </button>
                            <button className="rec-btn rec-btn-danger" onClick={stopCkCamera} disabled={!ckCameraOn}>
                                <CameraOff size={13} /> Dừng
                            </button>
                            <button className="rec-btn rec-btn-indigo" onClick={handleCkRecognize} disabled={!ckCameraOn || ckRecognizeStatus === "loading"}>
                                <Sparkles size={13} /> Mở Cửa ( Demo )
                            </button>
                        </div>
                    </div>

                    {/* Tra cứu SĐT + thông tin hội viên đầy đủ */}
                    <div className="rec-card checkin rec-side-panel">
                        <div className="rec-panel-header row-in">
                            <div className="rec-card-title"><h3>Tra cứu &amp; thông tin hội viên</h3></div>

                            <div className="rec-phone-input-block">
                                <div className="rec-input-wrap">
                                    <Phone size={13} />
                                    <input
                                        type="tel"
                                        placeholder="Nhập SĐT, ví dụ: 0901234567"
                                        value={phoneInput}
                                        onChange={e => { setPhoneInput(e.target.value); setPhoneError(""); }}
                                        onKeyDown={e => e.key === "Enter" && handlePhoneLookup()}
                                    />
                                </div>
                                <button className="rec-btn rec-btn-primary checkin" onClick={handlePhoneLookup} disabled={lookupLoading} style={{ whiteSpace: "nowrap" }}>
                                    {lookupLoading ? <span className="rec-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <UserRound size={13} />}
                                    Tra cứu
                                </button>
                            </div>

                            {phoneError && (
                                <div className="rec-phone-error"><XCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{phoneError}</div>
                            )}

                            <div className="rec-info-panel-head">
                                <p className="rec-hint">Thông tin hội viên</p>
                                {ckInfoIsLookup && (
                                    <button className="rec-info-close" onClick={dismissLookupResult} title="Đóng"><X size={12} /></button>
                                )}
                            </div>
                        </div>

                        <div className="rec-info-area">
                            {!ckInfoMember ? (
                                <div className="rec-lastcheckin-empty">
                                    <UserRound size={22} />
                                    <p>Chưa có thông tin hội viên</p>
                                    <span>Tra cứu bằng SĐT hoặc nhận diện qua camera để xem tại đây</span>
                                </div>
                            ) : ckInfoIsLookup ? (
                                <div className={`rec-lc-card ${canCheckin(ckInfoMember) ? "lookup-ok" : "lookup-blocked"}`}>
                                    <MemberTop
                                        member={ckInfoMember}
                                        onViewPhoto={setPhotoViewMember}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{ckInfoMember.fullName}</p>
                                                <div className="rec-lc-badges">
                                                    <StatusBadge status={ckInfoMember.packageStatus} />
                                                    <AccountStatusBadge status={ckInfoMember.accountStatus} />
                                                </div>
                                            </>
                                        }
                                    />
                                    <div className="rec-lc-body">
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Mã hội viên</span><span className="rec-lc-row-value">#{ckInfoMember.memberId}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Số điện thoại</span><span className="rec-lc-row-value">{ckInfoMember.phone}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Chi nhánh</span><span className="rec-lc-row-value">{ckInfoMember.branchName}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Gói tập</span><span className="rec-lc-row-value">{ckInfoMember.package}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Hết hạn gói</span><span className="rec-lc-row-value">{ckInfoMember.expiryDate}</span></div>

                                        {ckInfoMember.internalNotes && (
                                            <div className="rec-lc-internal-note">
                                                <AlertCircle size={15} />
                                                <div className="rec-lc-internal-note-text">
                                                    <span className="rec-lc-internal-note-label">Ghi chú nội bộ</span>
                                                    {ckInfoMember.internalNotes}
                                                </div>
                                            </div>
                                        )}
                                        {!canCheckin(ckInfoMember) && (
                                            <div className="rec-lc-suspend-note">
                                                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                                {getIneligibleReason(ckInfoMember)}
                                            </div>
                                        )}
                                        <button className="rec-btn rec-btn-primary checkin rec-lc-checkin-btn" onClick={openReasonModal} disabled={!canCheckin(ckInfoMember)}>
                                            <LogIn size={13} /> Check-in cho hội viên này
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`rec-lc-card ${lastCheckin.result} checkin`}>
                                    <MemberTop
                                        member={ckInfoMember}
                                        onViewPhoto={setPhotoViewMember}
                                        extraTopContent={<span className="rec-lc-source">{lastCheckin.source === "camera" ? "📷 Camera" : "📞 SĐT"}</span>}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{ckInfoMember.fullName}</p>
                                                <div className={`rec-lc-result-line checkin ${lastCheckin.result}`}>
                                                    {lastCheckin.result === "success" ? <><CheckCircle2 size={13} /> Check-in thành công</> : <><XCircle size={13} /> Không thể check-in</>}
                                                </div>
                                            </>
                                        }
                                    />
                                    <div className="rec-lc-body">
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Mã hội viên</span><span className="rec-lc-row-value">#{ckInfoMember.memberId}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Số điện thoại</span><span className="rec-lc-row-value">{ckInfoMember.phone}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Chi nhánh</span><span className="rec-lc-row-value">{ckInfoMember.branchName}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Gói tập</span><span className="rec-lc-row-value">{ckInfoMember.package}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Hết hạn gói</span><span className="rec-lc-row-value">{ckInfoMember.expiryDate}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Trạng thái tài khoản</span><span className="rec-lc-row-value"><AccountStatusBadge status={ckInfoMember.accountStatus} /></span></div>

                                        {lastCheckin.reason && (
                                            <div className="rec-lc-row"><span className="rec-lc-row-label">Lý do check-in thủ công</span><span className="rec-lc-row-value">{lastCheckin.reason}</span></div>
                                        )}
                                        {ckInfoMember.accountStatus === "Suspended" && ckInfoMember.suspendReason && (
                                            <div className="rec-lc-suspend-note"><ShieldAlert size={13} /><span>Lý do khoá: {ckInfoMember.suspendReason}</span></div>
                                        )}
                                        {ckInfoMember.internalNotes && (
                                            <div className="rec-lc-internal-note">
                                                <AlertCircle size={15} />
                                                <div className="rec-lc-internal-note-text">
                                                    <span className="rec-lc-internal-note-label">Ghi chú nội bộ</span>
                                                    {ckInfoMember.internalNotes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="rec-footer-spacer" aria-hidden="true" />
                    </div>
                </div>
            </div>

            {/* ============================ HÀNG 2: CHECK-OUT ============================ */}
            <div>
                <div className="rec-section-head checkout">
                    <span className="rec-section-dot" />
                    <h2>CHECK-OUT</h2>
                    <span className="rec-section-sub">Nhận diện qua camera — chỉ hiển thị tên người vừa check-out</span>
                </div>

                <div className="rec-grid checkout-row">
                    {/* Camera check-out */}
                    <div className="rec-card checkout">
                        <canvas ref={coCanvasRef} style={{ display: "none" }} />
                        <div className="rec-panel-header row-out">
                            <div className="rec-card-title">
                                <h3>Camera Check-out</h3>
                                <span className="rec-status-pill">
                                    <span className={`rec-dot checkout ${coCameraOn ? "on" : ""}`} />
                                    {coCameraOn ? "Đang hoạt động" : "Đã tắt"}
                                </span>
                            </div>

                            <div className="rec-select-wrap">
                                <select value={coSelectedDevId} onChange={handleCoDeviceChange} disabled={devices.length === 0}>
                                    {devices.length === 0 && <option>Chưa phát hiện camera</option>}
                                    {devices.map(d => {
                                        const usedByOther = d.deviceId === ckActiveDevId;
                                        return (
                                            <option key={d.deviceId} value={d.deviceId} disabled={usedByOther}>
                                                {(d.label || `Camera ${d.deviceId.slice(0, 8)}…`)}{usedByOther ? " (đang dùng ở Check-in)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown size={13} className="rec-chevron" />
                            </div>
                        </div>

                        <div className={`rec-viewport checkout ${coCameraOn ? "on" : ""}`}>
                            <video ref={coVideoRef} autoPlay playsInline muted className="rec-video" style={{ display: coCameraOn ? "block" : "none" }} />
                            {!coCameraOn && (
                                <div className="rec-placeholder">
                                    <CameraOff size={28} />
                                    <p>Camera đang tắt</p>
                                    <span>Nhấn "Bắt đầu" để mở camera</span>
                                </div>
                            )}
                            {coCameraOn && !coRecognizeStatus && <div className="rec-scan checkout" />}
                            {coRecognizeStatus === "loading" && (
                                <div className="rec-viewport-overlay loading">
                                    <div className="rec-spinner" style={{ width: 32, height: 32 }} />
                                    <p>Đang nhận diện &amp; check-out…</p>
                                </div>
                            )}
                            {coRecognizeStatus === "success" && coRecognizeResult && (
                                <div className="rec-viewport-overlay success checkout">
                                    <CheckCircle2 size={40} color="#fff" />
                                    <p>Check-out thành công!<br />{coRecognizeResult.fullName}</p>
                                </div>
                            )}
                            {coRecognizeStatus === "error" && coRecognizeResult && (
                                <div className="rec-viewport-overlay error">
                                    <XCircle size={40} color="#fff" />
                                    <p>Không thể check-out<br />{coRecognizeResult.fullName}</p>
                                </div>
                            )}
                        </div>

                        {coCameraError && (
                            <div className="rec-cam-error"><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{coCameraError}</div>
                        )}

                        <div className="rec-btn-row">
                            <button className="rec-btn rec-btn-primary checkout" onClick={() => startCoCamera()} disabled={coCameraOn}>
                                <Camera size={13} /> Bắt đầu
                            </button>
                            <button className="rec-btn rec-btn-danger" onClick={stopCoCamera} disabled={!coCameraOn}>
                                <CameraOff size={13} /> Dừng
                            </button>
                            <button className="rec-btn rec-btn-indigo" onClick={handleCoRecognize} disabled={!coCameraOn || coRecognizeStatus === "loading"}>
                                <Sparkles size={13} /> Check-out ( Demo )
                            </button>
                        </div>
                    </div>

                    {/* Chỉ tên người vừa check-out — tối giản */}
                    <div className="rec-card checkout rec-side-panel">
                        <div className="rec-panel-header row-out">
                            <div className="rec-card-title"><h3>Người vừa check-out</h3></div>
                        </div>

                        <div className="rec-info-area">
                            {!coInfoMember ? (
                                <div className="rec-lastcheckin-empty">
                                    <UserRound size={22} />
                                    <p>Chưa có lượt check-out nào</p>
                                    <span>Dùng camera nhận diện để check-out — tên hội viên sẽ hiện tại đây</span>
                                </div>
                            ) : (
                                <div className={`rec-lc-card ${lastCheckout.result} checkout checkout-minimal`}>
                                    <MemberTop
                                        member={coInfoMember}
                                        onViewPhoto={setPhotoViewMember}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{coInfoMember.fullName}</p>
                                                <div className={`rec-lc-result-line checkout ${lastCheckout.result}`}>
                                                    {lastCheckout.result === "success" ? <><CheckCircle2 size={13} /> Check-out thành công</> : <><XCircle size={13} /> Không thể check-out</>}
                                                </div>
                                                <p className="rec-lc-checkout-time">
                                                    {lastCheckout.at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        <div className="rec-footer-spacer" aria-hidden="true" />
                    </div>
                </div>
            </div>

            {/* ── Modal "Check-in thủ công" (chỉ dùng cho luồng SĐT của Check-in) ── */}
            {reasonModalOpen && phoneLookupResult && (
                <div className="rec-overlay" onClick={e => e.target === e.currentTarget && closeReasonModal()}>
                    <div className="rec-modal">
                        <div className="rec-modal-head">
                            <h3>Check-in thủ công</h3>
                            <button className="rec-modal-close" onClick={closeReasonModal}><X size={13} /></button>
                        </div>

                        {manualCheckinState === "loading" && (
                            <div className="rec-checkin-state" style={{ padding: "36px 16px" }}>
                                <div className="rec-spinner" style={{ width: 28, height: 28 }} />
                                <p>Đang xử lý check-in…</p>
                            </div>
                        )}
                        {manualCheckinState === "success" && (
                            <div className="rec-checkin-state" style={{ padding: "36px 16px" }}>
                                <CheckCircle2 size={44} color="var(--primary)" />
                                <p style={{ color: "var(--primary-dark)" }}>Check-in thành công!</p>
                            </div>
                        )}

                        {!manualCheckinState && (
                            <>
                                <div className="rec-modal-body">
                                    <div className="rec-modal-member-top">
                                        <MemberAvatar member={phoneLookupResult.member} className="rec-modal-avatar" onView={setPhotoViewMember} />
                                        <div>
                                            <p className="rec-modal-name">{phoneLookupResult.member.fullName}</p>
                                            <div className="rec-modal-badges">
                                                <StatusBadge status={phoneLookupResult.member.packageStatus} />
                                                <AccountStatusBadge status={phoneLookupResult.member.accountStatus} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rec-info-row"><span className="rec-info-label">Mã hội viên</span><span className="rec-info-value">#{phoneLookupResult.member.memberId}</span></div>
                                    <div className="rec-info-row"><span className="rec-info-label">Số điện thoại</span><span className="rec-info-value">{phoneLookupResult.member.phone}</span></div>
                                    <div className="rec-info-row"><span className="rec-info-label">Chi nhánh</span><span className="rec-info-value">{phoneLookupResult.member.branchName}</span></div>

                                    <div className="rec-reason-field">
                                        <label className="rec-reason-label">Lý do check-in thủ công <span style={{ color: "var(--danger)" }}>*</span></label>
                                        <div className="rec-select-wrap" style={{ margin: 0 }}>
                                            <select value={reasonType} onChange={e => { setReasonType(e.target.value); if (e.target.value !== "other") setCustomReason(""); }}>
                                                <option value="">-- Chọn lý do --</option>
                                                {MANUAL_REASON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                            <ChevronDown size={13} className="rec-chevron" />
                                        </div>
                                        {reasonType === "other" && (
                                            <textarea className="rec-reason-textarea" placeholder="Nhập lý do check-in thủ công…" value={customReason} onChange={e => setCustomReason(e.target.value)} rows={2} />
                                        )}
                                    </div>
                                </div>
                                <div className="rec-modal-foot">
                                    <button className="rec-btn-cancel" onClick={closeReasonModal}>Huỷ</button>
                                    <button className="rec-btn rec-btn-primary checkin" onClick={handleConfirmManualCheckin} disabled={!isReasonValid}>
                                        <LogIn size={13} /> Xác nhận check-in
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal xem ảnh hội viên (chung cho cả 2 khu vực) ── */}
            {photoViewMember && (
                <div className="rec-overlay" onClick={e => e.target === e.currentTarget && setPhotoViewMember(null)}>
                    <div className="rec-photo-modal">
                        <button className="rec-photo-modal-close" onClick={() => setPhotoViewMember(null)} title="Đóng"><X size={15} /></button>
                        <img src={photoViewMember.photoUrl} alt={photoViewMember.fullName} />
                        <p className="rec-photo-modal-name">{photoViewMember.fullName}</p>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={`rec-toast ${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {toast.text}
                </div>
            )}
        </div>
    );
}