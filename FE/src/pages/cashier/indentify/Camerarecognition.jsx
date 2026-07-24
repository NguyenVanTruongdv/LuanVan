import {
    AlertCircle,
    Camera,
    CameraOff,
    CheckCircle2,
    ChevronDown,
    DoorOpen,
    LogIn,
    Phone,
    ShieldAlert,
    UserRound,
    X,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import cashierApi from "../../../api/cashierApi";

/* =========================================================================
 * TRANG GỘP CHECK-IN + CHECK-OUT
 * - Camera CHỈ quét khuôn mặt theo từng đợt lấy mẫu (poll) mỗi
 *   CK_POLL_INTERVAL_MS (mặc định 300ms), KHÔNG quét liên tục theo từng
 *   khung hình. Ưu tiên dùng Shape Detection API (`window.FaceDetector`)
 *   có sẵn trong trình duyệt (hiếm khi có, nằm sau cờ thử nghiệm); nếu
 *   không có thì dùng MediaPipe Tasks Vision (model BlazeFace của Google)
 *   làm phương án dự phòng chính — chạy hoàn toàn cục bộ bằng WASM/GPU,
 *   độ chính xác cao hơn nhiều so với các thư viện kiểu cũ (tracking.js).
 * - Chỉ khi phát hiện ĐÚNG 1 khuôn mặt và khuôn mặt đó đứng yên (tâm +
 *   kích thước không đổi nhiều) liên tục tối thiểu CK_STABLE_HOLD_MS
 *   (mặc định 500ms) thì mới chụp khung hình đầy đủ & gửi lên BE để
 *   nhận diện.
 * - Sau khi gọi BE xong (dù thành công/lỗi/không nhận diện được), trang
 *   giữ kết quả hiển thị trên khung camera trong CK_PAUSE_AFTER_CALL_MS
 *   (mặc định 1.2s) rồi mới dọn overlay & quét tiếp — áp dụng GIỐNG HỆT
 *   nhau cho cả Check-in lẫn Check-out.
 * - LOG: chỉ ghi console.log ở các mốc quan trọng (phát hiện đủ điều kiện
 *   gửi BE, gọi API, nhận kết quả) — KHÔNG log ở mỗi vòng poll (300ms/lần)
 *   để tránh console phình to khi camera chạy 24/7.
 * - QUAN TRỌNG — khớp với BE (bảng `check_ins` + `RekognitionFaceService`):
 *   Check-in và Check-out CÙNG dùng 1 bảng `check_ins`: 1 dòng = 1 lượt
 *   "vào tập" (check_in_time bắt buộc) và có thể được CẬP NHẬT thêm
 *   check_out_time khi hội viên ra về (chứ KHÔNG tạo dòng mới). Vì vậy BE
 *   chỉ cần 1 endpoint DUY NHẤT cho cả 2 trạm camera:
 *     POST /api/identify   { image, action: "checkin"|"checkout", branchId }
 *   BE tự làm hết trong 1 request: nhận diện khuôn mặt qua AWS Rekognition
 *   (SearchFacesByImage trên RekognitionFaceService — KHÔNG gửi FaceId từ
 *   FE, FE chỉ gửi ẢNH) -> map ra memberId (hoặc employeeId nếu khuôn mặt
 *   là của nhân viên) -> kiểm tra điều kiện -> nếu action=checkin thì
 *   INSERT dòng check_ins mới; nếu action=checkout thì tìm dòng check_ins
 *   đang mở (check_out_time IS NULL) của hội viên đó và UPDATE
 *   check_out_time/check_out_method.
 *   BE có thể trả về `isEmployee: true` kèm object `employee` (thay vì
 *   `member`) khi khuôn mặt nhận diện được là của NHÂN VIÊN chứ không
 *   phải hội viên — trường hợp này KHÔNG tạo/khớp bản ghi check_ins nào
 *   cả (nhân viên không cần check-in/check-out tập luyện), FE chỉ hiển
 *   thị thông tin nhận diện được cho nhân viên đứng gác biết.
 * - Toàn bộ lời gọi dữ liệu dùng chung `cashierApi` (import từ ./cashierApi,
 *   vốn đã bọc authApi để tự đính kèm Authorization header).
 * ======================================================================= */

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

/* Khuôn mặt phải đứng yên liên tục tối thiểu bằng này thì mới chụp khung
 * hình đầy đủ & gửi lên BE để nhận diện (dùng chung cho cả check-in &
 * check-out) */
const CK_STABLE_HOLD_MS = 500;
/* Sai khác tối đa (tỉ lệ theo cạnh video, 0-1) giữa tâm/kích thước khuôn
 * mặt ở 2 lần lấy mẫu liên tiếp để còn coi là "đứng yên" */
const CK_BOX_MOVE_THRESHOLD = 0.02;
/* Chu kỳ lấy mẫu để dò khuôn mặt (ms). Đây là điểm mấu chốt để KHÔNG chạy
 * liên tục: giữa 2 lần lấy mẫu, trang hoàn toàn không làm gì (không dùng
 * camera, không tính toán) — chỉ "thức dậy" mỗi CK_POLL_INTERVAL_MS để
 * kiểm tra 1 lần rồi nghỉ tiếp. */
const CK_POLL_INTERVAL_MS = 300;
/* Sau khi đã gọi BE xong (bất kể kết quả gì), tạm dừng quét trong khoảng
 * thời gian này rồi mới quét tiếp cho lượt kế tiếp. Cũng là thời gian giữ
 * hiển thị kết quả (thành công/lỗi) trên camera. Dùng chung cho CẢ
 * Check-in lẫn Check-out. */
const CK_PAUSE_AFTER_CALL_MS = 1200;

/* MediaPipe Tasks Vision — FaceDetector (model BlazeFace) của Google.
 * Đây là phương án dự phòng khi trình duyệt không có Shape Detection API
 * native (`window.FaceDetector`, vốn luôn bị tắt mặc định trừ khi người
 * dùng tự bật cờ thử nghiệm chrome://flags). Tải qua ESM CDN bằng dynamic
 * import(), không cần thẻ <script> UMD. */
const MEDIAPIPE_VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const MEDIAPIPE_WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MEDIAPIPE_FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

/* Chi nhánh nơi đặt 2 camera này (check_ins.branch_id là cột bắt buộc,
 * không nullable). TODO: thay bằng branchId lấy từ thông tin đăng nhập
 * của nhân viên / context chi nhánh thực tế thay vì hằng số cứng. */

function StatusBadge({ status }) {
    const s = PACKAGE_STATUS_MAP[status] || PACKAGE_STATUS_MAP.active;
    return <span className={`rec-badge ${s.cls}`}>{s.label}</span>;
}
function AccountStatusBadge({ status }) {
    const s = ACCOUNT_STATUS_MAP[status] || ACCOUNT_STATUS_MAP.Active;
    return <span className={`rec-badge ${s.cls}`}>{s.label}</span>;
}
function initials(name) {
    return (name || "").split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
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
/* Lưu ý: điều kiện được phép check-out (vd. tài khoản bị khoá/hết hạn vẫn
 * cho check-out vì đang có mặt trong gym, chỉ chặn tài khoản chưa kích
 * hoạt) do BE tự kiểm tra trong endpoint cashierApi.identifyAttendance và
 * trả về status "ineligible"/"no_open_session" kèm `reason` — FE không
 * cần hàm canCheckout/getCheckoutIneligibleReason phía client. */

/* =========================================================================
 * Hàm dùng chung cho cả 2 camera (check-in & check-out) để khởi tạo cơ chế
 * nhận diện khuôn mặt (native FaceDetector hoặc MediaPipe dự phòng) và để
 * dò khuôn mặt one-shot trên 1 khung video. Tách ra ngoài component để 2
 * camera có thể tự khởi tạo model riêng của mình (chạy độc lập, không
 * tranh chấp timestamp khi gọi detectForVideo).
 * ======================================================================= */
async function setupFaceDetector(isCancelled) {
    // 1) Ưu tiên Shape Detection API native của trình duyệt — nhẹ, không
    // cần tải thêm dữ liệu qua mạng. Hiện vẫn nằm sau cờ thử nghiệm nên
    // hầu hết trình duyệt sẽ KHÔNG có sẵn.
    if (typeof window !== "undefined" && "FaceDetector" in window) {
        try {
            const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
            return { mode: "native", detector };
        } catch (_) {
            // rơi xuống phương án dự phòng bên dưới nếu khởi tạo lỗi
        }
    }
    // 2) Phương án dự phòng: MediaPipe FaceDetector (model BlazeFace),
    // dò one-shot theo từng đợt lấy mẫu, không chạy requestAnimationFrame
    // liên tục.
    const { FaceDetector, FilesetResolver } = await import(/* webpackIgnore: true */ MEDIAPIPE_VISION_URL);
    if (isCancelled()) return null;

    const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
    if (isCancelled()) return null;

    // Ưu tiên chạy bằng GPU (nhanh hơn); nếu thiết bị/driver không hỗ trợ
    // WebGL phù hợp, rơi xuống CPU để vẫn chạy được.
    try {
        const detector = await FaceDetector.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: MEDIAPIPE_FACE_MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
        });
        return { mode: "mediapipe", detector };
    } catch (gpuErr) {
        if (isCancelled()) return null;
        const detector = await FaceDetector.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: MEDIAPIPE_FACE_MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO",
        });
        return { mode: "mediapipe", detector };
    }
}

async function detectFacesWith(mode, detector, video) {
    if (!video?.videoWidth || !detector) return [];
    if (mode === "native") {
        try {
            const faces = await detector.detect(video);
            return (faces || []).map(f => ({
                x: f.boundingBox.x,
                y: f.boundingBox.y,
                width: f.boundingBox.width,
                height: f.boundingBox.height,
            }));
        } catch (_) {
            return [];
        }
    }
    if (mode === "mediapipe") {
        try {
            // detectForVideo yêu cầu timestamp tăng dần đơn điệu —
            // performance.now() đáp ứng đúng yêu cầu này.
            const result = detector.detectForVideo(video, performance.now());
            return (result?.detections || []).map(d => ({
                x: d.boundingBox.originX,
                y: d.boundingBox.originY,
                width: d.boundingBox.width,
                height: d.boundingBox.height,
            }));
        } catch (_) {
            return [];
        }
    }
    return [];
}

export default function CameraRecognition() {
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

    const handleOpenDoor = async (side) => {
        try {
            await cashierApi.openDoor(side);
            showToast("success", "Đã gửi lệnh mở cửa");
        } catch (err) {
            showToast("error", "Mở cửa thất bại. Vui lòng thử lại.");
        }
    };

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
    const [ckActiveDevId, setCkActiveDevId] = useState(null);

    /* Trạng thái sẵn sàng của cơ chế nhận diện khuôn mặt:
     * "loading" | "ready" | "error"
     * - Nếu trình duyệt có sẵn `window.FaceDetector` (Shape Detection API),
     *   dùng luôn API native này -> "ready" ngay, KHÔNG tải thêm gì cả.
     * - Nếu không có (trường hợp phổ biến nhất), tải MediaPipe FaceDetector
     *   (model BlazeFace) làm phương án dự phòng. */
    const [ckLibStatus, setCkLibStatus] = useState("loading");
    /* "native" (FaceDetector API) | "mediapipe" (MediaPipe Tasks Vision) */
    const ckDetectModeRef = useRef(null);
    const ckFaceDetectorRef = useRef(null); // instance window.FaceDetector HOẶC MediaPipe FaceDetector
    const ckLastBoxRef = useRef(null);      // { cx, cy, size } của khuôn mặt ở lần xử lý trước

    useEffect(() => {
        let cancelled = false;
        async function setup() {
            try {
                const result = await setupFaceDetector(() => cancelled);
                if (cancelled || !result) return;
                ckFaceDetectorRef.current = result.detector;
                ckDetectModeRef.current = result.mode;
                setCkLibStatus("ready");
            } catch (err) {
                console.error("[CheckIn] Lỗi tải mô hình nhận diện khuôn mặt:", err);
                if (!cancelled) setCkLibStatus("error");
            }
        }
        setup();
        return () => {
            cancelled = true;
            // Giải phóng model khi unmount (nếu đã tải xong)
            try { ckFaceDetectorRef.current?.close?.(); } catch (_) { }
        };
    }, []);

    /* ============================ CHECK-OUT CAMERA ============================ */
    const coVideoRef = useRef(null);
    const coCanvasRef = useRef(null);
    const coStreamRef = useRef(null);
    const [coCameraOn, setCoCameraOn] = useState(false);
    const [coCameraError, setCoCameraError] = useState("");
    const [coSelectedDevId, setCoSelectedDevId] = useState("");
    const [coActiveDevId, setCoActiveDevId] = useState(null);

    /* Giống hệt cơ chế bên Check-in: dò khuôn mặt theo từng đợt lấy mẫu
     * (poll), chỉ chụp & gửi BE khi có đúng 1 khuôn mặt và khuôn mặt đó
     * đứng yên đủ CK_STABLE_HOLD_MS. Camera check-out có model riêng
     * (không dùng chung instance với check-in) để 2 camera chạy độc lập. */
    const [coLibStatus, setCoLibStatus] = useState("loading");
    const coDetectModeRef = useRef(null);
    const coFaceDetectorRef = useRef(null);
    const coLastBoxRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        async function setup() {
            try {
                const result = await setupFaceDetector(() => cancelled);
                if (cancelled || !result) return;
                coFaceDetectorRef.current = result.detector;
                coDetectModeRef.current = result.mode;
                setCoLibStatus("ready");
            } catch (err) {
                console.error("[CheckOut] Lỗi tải mô hình nhận diện khuôn mặt:", err);
                if (!cancelled) setCoLibStatus("error");
            }
        }
        setup();
        return () => {
            cancelled = true;
            try { coFaceDetectorRef.current?.close?.(); } catch (_) { }
        };
    }, []);

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
        setCkRecognizeStatus(null);
        setCkRecognizeResult(null);
        setCkRecognizeReason("");
        ckLastBoxRef.current = null;
        ckStableStartRef.current = null;
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
        setCoRecognizeStatus(null);
        setCoRecognizeResult(null);
        setCoRecognizeReason("");
        coLastBoxRef.current = null;
        coStableStartRef.current = null;
    }, []);

    const handleCoDeviceChange = (e) => {
        const devId = e.target.value;
        setCoSelectedDevId(devId);
        if (coCameraOn) {
            stopCoCamera();
            setTimeout(() => startCoCamera(devId), 100);
        }
    };

    useEffect(() => {
        return () => {
            ckStreamRef.current?.getTracks().forEach(t => t.stop());
            coStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const ckCaptureFrame = () => {
        const video = ckVideoRef.current, canvas = ckCanvasRef.current;
        if (!video || !canvas || !video.videoWidth) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8);
    };
    const coCaptureFrame = () => {
        const video = coVideoRef.current, canvas = coCanvasRef.current;
        if (!video || !canvas || !video.videoWidth) return null;
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
    const [ckRecognizeStatus, setCkRecognizeStatus] = useState(null); // "loading" | "success" | "error" | "employee"
    const [ckRecognizeReason, setCkRecognizeReason] = useState(""); // lý do không check-in được, hiển thị ngay trên khung camera

    /* Cờ điều khiển vòng lặp quét tự động của camera check-in (giống hệt
     * check-out):
     * - ckProcessingRef: đang có 1 request nhận diện đang bay, tránh gửi
     *   chồng
     * - ckPausedRef: đang tạm dừng quét trong CK_PAUSE_AFTER_CALL_MS sau
     *   khi vừa gọi BE xong, để giữ hiển thị kết quả (thành công/lỗi) đủ
     *   lâu cho nhân viên nhìn thấy trước khi quét tiếp
     * - ckLastBoxRef / ckStableStartRef: theo dõi vị trí khuôn mặt (phát
     *   hiện THẬT bằng FaceDetector/MediaPipe, không phải suy đoán qua độ
     *   lệch pixel) qua các lần lấy mẫu để chỉ gửi ảnh lên BE khi khuôn
     *   mặt đứng yên đủ CK_STABLE_HOLD_MS
     */
    const ckProcessingRef = useRef(false);
    const ckPausedRef = useRef(false);
    const ckStableStartRef = useRef(null);

    /* Chạy dò khuôn mặt 1 lần (one-shot) bằng cơ chế đang có sẵn (native
     * FaceDetector hoặc MediaPipe), trả về mảng { x, y, width, height }
     * theo toạ độ khung hình gốc của video. */
    const detectFacesOnce = useCallback(async (video) => {
        return detectFacesWith(ckDetectModeRef.current, ckFaceDetectorRef.current, video);
    }, []);

    /* Xử lý kết quả của 1 lần lấy mẫu (poll) — được gọi mỗi CK_POLL_INTERVAL_MS,
     * KHÔNG chạy theo requestAnimationFrame, nên khi không có khuôn mặt thì
     * giữa 2 lần gọi trang hoàn toàn không tốn thêm tài nguyên nào.
     * LƯU Ý VỀ LOG: cố tình KHÔNG log ở đây khi chưa có gì đáng chú ý (mỗi
     * vòng poll chạy 300ms/lần, log ở đây sẽ làm phình console khi camera
     * chạy 24/7). Chỉ log tại đúng 2 mốc: (1) xác nhận đứng yên đủ lâu và
     * chuẩn bị gửi BE, (2) nhận được kết quả từ BE. */
    const handleCkPoll = useCallback(async (video) => {
        if (ckProcessingRef.current || ckPausedRef.current) return;

        const faces = await detectFacesOnce(video);

        if (faces.length !== 1 || !video?.videoWidth) {
            // Không có khuôn mặt nào trong khung (hoặc nhiều hơn 1 người) -> chưa gửi BE
            ckStableStartRef.current = null;
            ckLastBoxRef.current = null;
            return;
        }

        const now = performance.now();
        const f = faces[0];
        const cx = (f.x + f.width / 2) / video.videoWidth;
        const cy = (f.y + f.height / 2) / video.videoHeight;
        const size = f.width / video.videoWidth;

        const last = ckLastBoxRef.current;
        ckLastBoxRef.current = { cx, cy, size };

        if (!last) {
            ckStableStartRef.current = now;
            return;
        }

        const moved =
            Math.abs(cx - last.cx) > CK_BOX_MOVE_THRESHOLD ||
            Math.abs(cy - last.cy) > CK_BOX_MOVE_THRESHOLD ||
            Math.abs(size - last.size) > CK_BOX_MOVE_THRESHOLD;

        if (moved) {
            // Khuôn mặt còn đang di chuyển (mới bước vào / đổi tư thế) -> tính lại từ đầu
            ckStableStartRef.current = now;
            return;
        }
        if (ckStableStartRef.current === null) {
            ckStableStartRef.current = now;
        }

        const stableFor = now - ckStableStartRef.current;
        if (stableFor < CK_STABLE_HOLD_MS) {
            return; // chưa đứng yên đủ lâu -> chưa gửi BE
        }

        // Đã xác nhận có khuôn mặt & đứng yên đủ lâu -> chụp khung hình đầy đủ & gửi BE
        const frame = ckCaptureFrame();
        if (!frame) return;

        console.log("[CheckIn] Phát hiện khuôn mặt đứng yên — gửi ảnh lên BE để nhận diện...");

        // Khoá vòng poll ngay lập tức để tránh gửi chồng request, và tạm
        // dừng quét — dù kết quả là gì, hàm finally bên dưới sẽ mở khoá lại
        // sau đúng CK_PAUSE_AFTER_CALL_MS.
        ckProcessingRef.current = true;
        ckPausedRef.current = true;
        setCkRecognizeStatus("loading");
        setCkRecognizeResult(null);
        setCkRecognizeReason("");

        try {
            // 1 lệnh gọi DUY NHẤT: BE tự nhận diện khuôn mặt (Rekognition) +
            // kiểm tra điều kiện + ghi nhận check-in, không cần FE tự lấy
            // memberId rồi gọi thêm getMemberById/checkinByCamera nữa.
            const result = await cashierApi.identifyAttendance(frame, "checkin");
            console.log("[CheckIn] BE trả về:", result.status);

            // Khuôn mặt nhận diện được là NHÂN VIÊN chứ không phải hội viên
            // -> không có bản ghi check_ins nào liên quan, chỉ hiển thị
            // thông tin nhận diện cho nhân viên đứng camera biết, không
            // ghi vào lịch sử "check-in gần nhất".
            if (result.isEmployee) {
                setCkRecognizeResult(result.employee);
                setCkRecognizeStatus("employee");
                showToast("info", `Nhân viên — ${result.employee?.fullName || ""}`);
                console.log("[CheckIn] Nhận diện là nhân viên (bỏ qua check-in):", result.employee?.fullName);
                return;
            }

            if (result.status === "no_face" || result.status === "not_recognized") {
                // Không có khuôn mặt rõ ràng, hoặc có mặt nhưng không khớp hội
                // viên nào -> im lặng bỏ qua.
                setCkRecognizeStatus(null);
                return;
            }

            if (result.status === "ineligible") {
                setCkRecognizeResult(result.member);
                setCkRecognizeStatus("error");
                setCkRecognizeReason(result.reason || "");
                showToast("error", `${result.member.fullName} — không thể check-in`);
                recordCheckin(result.member, "camera", "error", result.reason);
                console.log("[CheckIn] Không đủ điều kiện check-in:", result.reason);
                return;
            }

            // status === "success"
            setCkRecognizeResult(result.member);
            setCkRecognizeStatus("success");
            showToast("success", `Check-in thành công — ${result.member.fullName}`);
            recordCheckin(result.member, "camera", "success");
            console.log("[CheckIn] Check-in thành công cho:", result.member.fullName);
        } catch (err) {
            console.error("[CheckIn] Lỗi nhận diện khuôn mặt (check-in):", err);
            setCkRecognizeStatus(null);
        } finally {
            ckProcessingRef.current = false;
            // Giữ overlay kết quả trên camera trong CK_PAUSE_AFTER_CALL_MS
            // rồi mới dọn dẹp & cho phép quét lượt kế tiếp.
            setTimeout(() => {
                setCkRecognizeStatus(null);
                setCkRecognizeResult(null);
                setCkRecognizeReason("");
                ckPausedRef.current = false;
                ckStableStartRef.current = null;
                ckLastBoxRef.current = null;
            }, CK_PAUSE_AFTER_CALL_MS);
        }
    }, []);

    // Bật/tắt vòng lấy mẫu (poll) theo trạng thái camera check-in và trạng
    // thái sẵn sàng của cơ chế dò khuôn mặt. Đây là một `setInterval` đơn
    // giản, KHÔNG phải vòng lặp requestAnimationFrame liên tục — giữa 2 lần
    // gọi (CK_POLL_INTERVAL_MS), trang hoàn toàn rảnh, không tốn CPU/dữ liệu.
    // Nếu đang xử lý 1 lượt nhận diện (ckProcessingRef) hoặc đang trong thời
    // gian tạm dừng sau khi gọi BE (ckPausedRef), lượt poll đó bị bỏ qua
    // ngay từ đầu hàm handleCkPoll.
    useEffect(() => {
        if (!ckCameraOn || ckLibStatus !== "ready") return;
        const video = ckVideoRef.current;
        if (!video) return;

        ckPausedRef.current = false;
        ckStableStartRef.current = null;
        ckLastBoxRef.current = null;

        let cancelled = false;
        let inFlight = false;
        const intervalId = setInterval(() => {
            if (cancelled || inFlight) return;
            inFlight = true;
            Promise.resolve(handleCkPoll(video)).finally(() => { inFlight = false; });
        }, CK_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [ckCameraOn, ckLibStatus, handleCkPoll]);

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

        try {
            const { member } = await cashierApi.lookupMemberByPhone(phone);
            if (member) setPhoneLookupResult({ member });
            else setPhoneError("Không tìm thấy hội viên với số điện thoại này.");
        } catch (err) {
            setPhoneError("Có lỗi khi tra cứu. Vui lòng thử lại.");
        } finally {
            setLookupLoading(false);
        }
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
        try {
            await cashierApi.checkinManual(member.memberId, reasonLabel);
            setManualCheckinState("success");
            recordCheckin(member, "phone", "success", reasonLabel);
            showToast("success", `Check-in thành công — ${member.fullName}`);
            setTimeout(() => {
                closeReasonModal();
                setPhoneLookupResult(null);
                setPhoneInput("");
            }, 1200);
        } catch (err) {
            setManualCheckinState(null);
            showToast("error", "Check-in thất bại. Vui lòng thử lại.");
        }
    };

    const ckInfoMember = phoneLookupResult ? phoneLookupResult.member : lastCheckin?.member;
    const ckInfoIsLookup = !!phoneLookupResult;

    /* ============================ CHECK-OUT: logic nghiệp vụ ============================
     * Giống hệt Check-in: camera tự động quét theo poll, chỉ gửi ảnh lên
     * BE khi phát hiện đúng 1 khuôn mặt đứng yên đủ lâu, rồi tạm dừng
     * CK_PAUSE_AFTER_CALL_MS trước khi quét tiếp. Khác biệt DUY NHẤT so
     * với Check-in là gọi cashierApi.identifyAttendance(frame, "checkout",
     * ...) thay vì "checkin" — BE tự xét điều kiện (đủ điều kiện hay
     * không, có phiên check-in nào đang mở để đóng lại hay không) và trả
     * về qua các status "ineligible" / "no_open_session" kèm `reason`.
     * Cũng như Check-in, nếu khuôn mặt là của NHÂN VIÊN (result.isEmployee)
     * thì chỉ hiển thị thông tin nhận diện, không xử lý check-out.
     */
    const [lastCheckout, setLastCheckout] = useState(null); // { member, result, at }
    const [coRecognizeResult, setCoRecognizeResult] = useState(null);
    const [coRecognizeStatus, setCoRecognizeStatus] = useState(null); // "loading" | "success" | "error" | "employee"
    const [coRecognizeReason, setCoRecognizeReason] = useState(""); // lý do không check-out được, hiển thị ngay trên khung camera

    const coProcessingRef = useRef(false);
    const coPausedRef = useRef(false);
    const coStableStartRef = useRef(null);

    const detectFacesOnceCo = useCallback(async (video) => {
        return detectFacesWith(coDetectModeRef.current, coFaceDetectorRef.current, video);
    }, []);

    const handleCoPoll = useCallback(async (video) => {
        if (coProcessingRef.current || coPausedRef.current) return;

        const faces = await detectFacesOnceCo(video);

        if (faces.length !== 1 || !video?.videoWidth) {
            coStableStartRef.current = null;
            coLastBoxRef.current = null;
            return;
        }

        const now = performance.now();
        const f = faces[0];
        const cx = (f.x + f.width / 2) / video.videoWidth;
        const cy = (f.y + f.height / 2) / video.videoHeight;
        const size = f.width / video.videoWidth;

        const last = coLastBoxRef.current;
        coLastBoxRef.current = { cx, cy, size };

        if (!last) {
            coStableStartRef.current = now;
            return;
        }

        const moved =
            Math.abs(cx - last.cx) > CK_BOX_MOVE_THRESHOLD ||
            Math.abs(cy - last.cy) > CK_BOX_MOVE_THRESHOLD ||
            Math.abs(size - last.size) > CK_BOX_MOVE_THRESHOLD;

        if (moved) {
            coStableStartRef.current = now;
            return;
        }
        if (coStableStartRef.current === null) {
            coStableStartRef.current = now;
        }

        const stableFor = now - coStableStartRef.current;
        if (stableFor < CK_STABLE_HOLD_MS) {
            return;
        }

        const frame = coCaptureFrame();
        if (!frame) return;

        console.log("[CheckOut] Phát hiện khuôn mặt đứng yên — gửi ảnh lên BE để nhận diện...");

        coProcessingRef.current = true;
        coPausedRef.current = true;
        setCoRecognizeStatus("loading");
        setCoRecognizeResult(null);
        setCoRecognizeReason("");

        try {
            // Cùng 1 endpoint với check-in, chỉ khác action="checkout" — BE
            // sẽ tìm dòng check_ins đang mở (check_out_time NULL) của hội
            // viên này và cập nhật check_out_time, không tạo dòng mới.
            const result = await cashierApi.identifyAttendance(frame, "checkout");
            console.log("[CheckOut] BE trả về:", result.status);

            // Khuôn mặt là của NHÂN VIÊN -> không có phiên check_ins nào để
            // đóng lại, chỉ hiển thị thông tin nhận diện.
            if (result.isEmployee) {
                setCoRecognizeResult(result.employee);
                setCoRecognizeStatus("employee");
                showToast("info", `Nhân viên — ${result.employee?.fullName || ""}`);
                console.log("[CheckOut] Nhận diện là nhân viên (bỏ qua check-out):", result.employee?.fullName);
                return;
            }

            if (result.status === "no_face" || result.status === "not_recognized") {
                setCoRecognizeStatus(null);
                return;
            }

            if (result.status === "no_open_session") {
                setCoRecognizeResult(result.member);
                setCoRecognizeStatus("error");
                setCoRecognizeReason(result.reason || "Hội viên chưa check-in nên không thể check-out.");
                showToast("error", `${result.member.fullName} — chưa check-in nên không thể check-out`);
                setLastCheckout({ member: result.member, result: "error", reason: result.reason || "Chưa check-in nên không thể check-out", at: new Date() });
                console.log("[CheckOut] Hội viên không có phiên check-in nào đang mở:", result.member.fullName);
                return;
            }

            if (result.status === "ineligible") {
                setCoRecognizeResult(result.member);
                setCoRecognizeStatus("error");
                setCoRecognizeReason(result.reason || "");
                showToast("error", `${result.member.fullName} — không thể check-out`);
                setLastCheckout({ member: result.member, result: "error", reason: result.reason, at: new Date() });
                console.log("[CheckOut] Không đủ điều kiện check-out:", result.reason);
                return;
            }

            // status === "success"
            setCoRecognizeResult(result.member);
            setCoRecognizeStatus("success");
            showToast("success", `Check-out thành công — ${result.member.fullName}`);
            setLastCheckout({ member: result.member, result: "success", at: new Date() });
            console.log("[CheckOut] Check-out thành công cho:", result.member.fullName);
        } catch (err) {
            console.error("[CheckOut] Lỗi nhận diện khuôn mặt (check-out):", err);
            setCoRecognizeStatus(null);
        } finally {
            coProcessingRef.current = false;
            setTimeout(() => {
                setCoRecognizeStatus(null);
                setCoRecognizeReason("");
                coPausedRef.current = false;
                coStableStartRef.current = null;
                coLastBoxRef.current = null;
            }, CK_PAUSE_AFTER_CALL_MS);
        }
    }, []);

    useEffect(() => {
        if (!coCameraOn || coLibStatus !== "ready") return;
        const video = coVideoRef.current;
        if (!video) return;

        coPausedRef.current = false;
        coStableStartRef.current = null;
        coLastBoxRef.current = null;

        let cancelled = false;
        let inFlight = false;
        const intervalId = setInterval(() => {
            if (cancelled || inFlight) return;
            inFlight = true;
            Promise.resolve(handleCoPoll(video)).finally(() => { inFlight = false; });
        }, CK_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [coCameraOn, coLibStatus, handleCoPoll]);

    const coInfoMember = lastCheckout?.member;

    /* ============================ RENDER ============================ */
    return (
        <div className="rec-wrap">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg: #ffffff; --surface: #f8fafc; --surface-alt: #eef2f5; --border: #e2e8f0;
          --text: #0f172a; --text-muted: #64748b;
          --primary: #0891b2; --primary-dark: #0e5a6b; --primary-light: #e0f7fb;
          --warning: #d97706; --warning-light: #fef3c7;
          --danger: #dc2626; --danger-light: #fee2e2;
          --indigo: #6366f1; --indigo-light: #eef2ff; --indigo-dark: #4338ca;
          --cko-primary: #dc2626; --cko-primary-dark: #b91c1c; --cko-primary-light: #fee2e2;
          --radius-lg: 14px; --radius-md: 10px; --radius-sm: 7px;
        }
        .rec-wrap *, .rec-wrap *::before, .rec-wrap *::after { box-sizing: border-box; }
        .rec-wrap {
          font-family: 'Inter', system-ui, sans-serif; color: var(--text);
          width: 100%; padding: 8px 8px 32px; background: var(--bg);
          display: flex; flex-direction: column; gap: 18px;
        }

        .rec-section {
          display: flex; flex-direction: column;
          min-height: 90vh; min-height: 90dvh;
        }

        .rec-page-head { display: flex; align-items: center; gap: 10px; padding: 2px 4px 0; }
        .rec-page-head h1 {
          font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; margin: 0;
        }
        .rec-page-head span {
          font-size: 12px; color: var(--text-muted); font-weight: 500;
        }

        .rec-section-head {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: var(--radius-md);
          margin-bottom: 6px; flex-shrink: 0;
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

        .rec-grid {
          display: grid; grid-template-columns: 1.3fr 1fr; gap: 8px;
          align-items: stretch; flex: 1 1 auto; min-height: 0;
        }
        @media (max-width: 820px) {
          .rec-grid { grid-template-columns: 1fr; flex: none; min-height: 70vh; }
        }

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
        @keyframes rec-pulse-g { 0%,100% { box-shadow: 0 0 0 0 rgba(8,145,178,.45);} 50% { box-shadow: 0 0 0 5px rgba(8,145,178,0);} }
        @keyframes rec-pulse-r { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.45);} 50% { box-shadow: 0 0 0 5px rgba(220,38,38,0);} }

        .rec-face-api-note {
          display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: var(--warning);
          background: var(--warning-light); border: 1px solid #fde68a; border-radius: var(--radius-sm);
          padding: 6px 8px; margin-bottom: 8px; flex-shrink: 0;
        }
        .rec-face-api-note svg { flex-shrink: 0; margin-top: 1px; }

        .rec-select-wrap { position: relative; margin-bottom: 8px; flex-shrink: 0; }
        .rec-select-wrap select {
          appearance: none; width: 100%; padding: 7px 32px 7px 10px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: #fff; font-size: 12px; color: var(--text);
          font-family: 'Inter', sans-serif; cursor: pointer; outline: none; transition: border-color .15s;
        }
        .rec-select-wrap select:focus { border-color: var(--primary); }
        .rec-select-wrap .rec-chevron { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); }

        .rec-viewport-wrap {
          flex: 1 1 auto; min-height: 0; display: flex;
          align-items: center; justify-content: center; overflow: hidden;
        }
        .rec-viewport {
          position: relative; aspect-ratio: 1 / 1;
          width: min(100%, 60vh); height: min(100%, 60vh);
          margin: 0 auto;
          background: #0f172a; border-radius: var(--radius-md); overflow: hidden;
          border: 2px solid var(--border); transition: border-color .2s;
        }
        @media (max-width: 820px) {
          .rec-viewport { width: 100%; height: auto; max-height: 60vh; }
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
          padding: 12px;
        }
        .rec-viewport-overlay.transparent { background: transparent; backdrop-filter: none; }
        .rec-viewport-overlay.loading { background: rgba(15,23,42,.5); }
        .rec-viewport-overlay.success.checkout { background: rgba(185,28,28,.7); }
        .rec-viewport-overlay.error   { background: rgba(220,38,38,.7); }
        .rec-viewport-overlay.employee { background: rgba(67,56,202,.7); }
        .rec-viewport-overlay p { margin: 0; color: #fff; font-weight: 700; font-size: 13px; text-align: center; padding: 0 12px; }
        .rec-viewport-overlay .rec-overlay-reason { margin-top: 2px; font-weight: 500; font-size: 11.5px; opacity: .92; }

        .rec-overlay-note {
          margin-top: 4px; padding: 9px 12px; border-radius: var(--radius-sm);
          background: #fff; border: 1px solid #fca5a5; display: flex; align-items: flex-start; gap: 7px;
          max-width: 92%; text-align: left; box-shadow: 0 6px 18px rgba(0,0,0,.28);
        }
        .rec-overlay-note svg { flex-shrink: 0; margin-top: 1px; color: var(--danger); }
        .rec-overlay-note-text { font-size: 12.5px; font-weight: 700; color: var(--danger); line-height: 1.42; word-break: break-word; }
        .rec-overlay-note-label { display: block; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--danger); margin-bottom: 2px; }

        .rec-overlay-note.success { border-color: #a7e3ee; box-shadow: 0 6px 18px rgba(0,0,0,.2); }
        .rec-overlay-note.success svg { color: var(--primary-dark); }
        .rec-overlay-note.success .rec-overlay-note-text,
        .rec-overlay-note.success .rec-overlay-note-label { color: var(--primary-dark); }

        .rec-overlay-note.employee { border-color: #c7d2fe; box-shadow: 0 6px 18px rgba(0,0,0,.2); }
        .rec-overlay-note.employee svg { color: var(--indigo-dark); }
        .rec-overlay-note.employee .rec-overlay-note-text,
        .rec-overlay-note.employee .rec-overlay-note-label { color: var(--indigo-dark); }

        /* Đẩy nội dung overlay (icon + tên) xuống sát mép dưới của khung
         * camera thay vì canh giữa — dùng cho overlay kết quả check-in */
        .rec-viewport-overlay.bottom-align {
          justify-content: flex-end;
          padding-bottom: 22px;
        }

        .rec-door-btn {
          margin-left: auto;
          background: #fff; color: var(--text);
        }
        .rec-door-btn.checkin  { border-color: var(--primary); color: var(--primary-dark); }
        .rec-door-btn.checkin:hover  { background: var(--primary-light); }
        .rec-door-btn.checkout { border-color: var(--cko-primary); color: var(--cko-primary-dark); }
        .rec-door-btn.checkout:hover { background: var(--cko-primary-light); }

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
        .rec-lc-card.employee               { border-color: var(--indigo); }
        .rec-lc-card.lookup-ok              { border-color: var(--primary); }
        .rec-lc-card.lookup-blocked         { border-color: var(--danger); }

        .rec-lc-top {
          position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 12px 10px 10px; background: var(--surface-alt); text-align: center; flex-shrink: 0;
        }
        .rec-lc-card.success.checkin .rec-lc-top,
        .rec-lc-card.lookup-ok .rec-lc-top      { background: var(--primary-light); }
        .rec-lc-card.success.checkout .rec-lc-top { background: var(--cko-primary-light); }
        .rec-lc-card.error .rec-lc-top,
        .rec-lc-card.lookup-blocked .rec-lc-top { background: var(--danger-light); }
        .rec-lc-card.employee .rec-lc-top       { background: var(--indigo-light); }

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
        .rec-lc-card.employee .rec-lc-avatar { background: var(--indigo-dark); }

        .rec-lc-name { font-weight: 700; font-size: 13.5px; margin: 0; word-break: break-word; }
        .rec-lc-result-line { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11.5px; font-weight: 700; }
        .rec-lc-result-line.success.checkin  { color: var(--primary-dark); }
        .rec-lc-result-line.success.checkout { color: var(--cko-primary-dark); }
        .rec-lc-result-line.error   { color: var(--danger); }
        .rec-lc-result-line.employee { color: var(--indigo-dark); }

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

        .rec-lc-employee-note {
          margin-top: 10px; padding: 9px 10px; border-radius: var(--radius-sm);
          background: var(--indigo-light); border: 1px solid #c7d2fe; display: flex; align-items: flex-start; gap: 7px;
        }
        .rec-lc-employee-note svg { flex-shrink: 0; margin-top: 1px; color: var(--indigo-dark); }
        .rec-lc-employee-note-text { font-size: 12px; font-weight: 600; color: var(--indigo-dark); line-height: 1.45; word-break: break-word; }

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
        .badge-indigo  { background: var(--indigo-light);  color: var(--indigo-dark); }

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
        .rec-toast.info    { background: var(--indigo-dark); color: #fff; }

        .rec-spinner { border-radius: 50%; border: 3px solid var(--primary-light); border-top-color: var(--primary); animation: rec-spin .7s linear infinite; }
        @keyframes rec-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .rec-wrap { padding: 8px; }
          .rec-card { padding: 12px; }
          .rec-lc-row { font-size: 12px; }
        }
      `}</style>

            {/* ============================ HÀNG 1: CHECK-IN (90% màn hình) ============================ */}
            <div className="rec-section">
                <div className="rec-section-head checkin">
                    <span className="rec-section-dot" />
                    <h2>CHECK-IN</h2>
                    <span className="rec-section-sub">Camera tự động quét — chỉ chụp khi phát hiện khuôn mặt và đứng yên ≥0.5s — hoặc tra cứu theo số điện thoại</span>
                </div>

                <div className="rec-grid">
                    {/* Camera check-in */}
                    <div className="rec-card checkin">
                        <canvas ref={ckCanvasRef} style={{ display: "none" }} />
                        <div className="rec-panel-header row-in">
                            <div className="rec-card-title">
                                <h3>Camera Check-in</h3>
                                <span className="rec-status-pill">
                                    <span className={`rec-dot checkin ${ckCameraOn && ckLibStatus === "ready" ? "on" : ""}`} />
                                    {ckCameraOn ? (ckLibStatus === "ready" ? "Đang quét tự động" : "Chưa sẵn sàng quét") : "Đã tắt"}
                                </span>
                            </div>

                            {ckLibStatus === "loading" && (
                                <div className="rec-face-api-note">
                                    <AlertCircle size={13} />
                                    Đang tải mô hình nhận diện khuôn mặt…
                                </div>
                            )}
                            {ckLibStatus === "error" && (
                                <div className="rec-face-api-note">
                                    <AlertCircle size={13} />
                                    Không tải được mô hình nhận diện khuôn mặt (kiểm tra kết nối mạng tới cdn.jsdelivr.net và storage.googleapis.com). Camera vẫn bật được nhưng sẽ không tự động quét cho tới khi tải lại trang thành công.
                                </div>
                            )}

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

                        <div className="rec-viewport-wrap">
                            <div className={`rec-viewport checkin ${ckCameraOn ? "on" : ""}`}>
                                <video ref={ckVideoRef} autoPlay playsInline muted className="rec-video" style={{ display: ckCameraOn ? "block" : "none" }} />
                                {!ckCameraOn && (
                                    <div className="rec-placeholder">
                                        <CameraOff size={28} />
                                        <p>Camera đang tắt</p>
                                        <span>Nhấn "Bắt đầu" để tự động quét khuôn mặt</span>
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
                                    <div className="rec-viewport-overlay transparent bottom-align">
                                        <div className="rec-overlay-note success">
                                            <CheckCircle2 size={18} />
                                            <div className="rec-overlay-note-text">
                                                <span className="rec-overlay-note-label">Check-in thành công</span>
                                                {ckRecognizeResult.fullName}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {ckRecognizeStatus === "error" && ckRecognizeResult && (
                                    <div className="rec-viewport-overlay transparent bottom-align">
                                        <div className="rec-overlay-note">
                                            <XCircle size={18} />
                                            <div className="rec-overlay-note-text">
                                                <span className="rec-overlay-note-label">Không thể check-in</span>
                                                {ckRecognizeResult.fullName}
                                                {ckRecognizeReason ? ` — ${ckRecognizeReason}` : ""}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {ckRecognizeStatus === "employee" && ckRecognizeResult && (
                                    <div className="rec-viewport-overlay transparent bottom-align">
                                        <div className="rec-overlay-note employee">
                                            <ShieldAlert size={18} />
                                            <div className="rec-overlay-note-text">
                                                <span className="rec-overlay-note-label">Nhận diện nhân viên</span>
                                                {ckRecognizeResult.fullName} — không cần check-in
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                            <button className="rec-btn rec-door-btn checkin" onClick={() => handleOpenDoor("checkin")} title="Mở cửa">
                                <DoorOpen size={13} /> Mở cửa
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
                                    <span>Tra cứu bằng SĐT hoặc để camera tự nhận diện</span>
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
                            ) : ckRecognizeStatus === "employee" && ckRecognizeResult ? (
                                <div className="rec-lc-card employee">
                                    <MemberTop
                                        member={ckRecognizeResult}
                                        onViewPhoto={setPhotoViewMember}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{ckRecognizeResult.fullName}</p>
                                                <div className="rec-lc-result-line employee">
                                                    <ShieldAlert size={13} /> Nhân viên — không cần check-in
                                                </div>
                                                <div className="rec-lc-badges">
                                                    <span className="rec-badge badge-indigo">{ckRecognizeResult.status || "Active"}</span>
                                                </div>
                                            </>
                                        }
                                    />
                                    <div className="rec-lc-body">
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Mã nhân viên</span><span className="rec-lc-row-value">#{ckRecognizeResult.employeeId}</span></div>
                                        <div className="rec-lc-employee-note">
                                            <ShieldAlert size={15} />
                                            <div className="rec-lc-employee-note-text">
                                                Khuôn mặt nhận diện được là của nhân viên, không phải hội viên nên hệ thống không tạo lượt check-in.
                                            </div>
                                        </div>
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
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Gói tập</span><span className="rec-lc-row-value">{ckInfoMember.package}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Hết hạn gói</span><span className="rec-lc-row-value">{ckInfoMember.expiryDate}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Trạng thái tài khoản</span><span className="rec-lc-row-value"><AccountStatusBadge status={ckInfoMember.accountStatus} /></span></div>

                                        {lastCheckin.reason && lastCheckin.result === "error" && (
                                            <div className="rec-lc-internal-note">
                                                <AlertCircle size={15} />
                                                <div className="rec-lc-internal-note-text">
                                                    <span className="rec-lc-internal-note-label">Lý do không thể check-in</span>
                                                    {lastCheckin.reason}
                                                </div>
                                            </div>
                                        )}
                                        {lastCheckin.reason && lastCheckin.result === "success" && (
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

            {/* ============================ HÀNG 2: CHECK-OUT (90% màn hình) ============================ */}
            <div className="rec-section">
                <div className="rec-section-head checkout">
                    <span className="rec-section-dot" />
                    <h2>CHECK-OUT</h2>
                    <span className="rec-section-sub">Camera tự động quét — chỉ chụp khi phát hiện khuôn mặt và đứng yên ≥0.5s — chỉ hiển thị tên người vừa check-out</span>
                </div>

                <div className="rec-grid">
                    {/* Camera check-out */}
                    <div className="rec-card checkout">
                        <canvas ref={coCanvasRef} style={{ display: "none" }} />
                        <div className="rec-panel-header row-out">
                            <div className="rec-card-title">
                                <h3>Camera Check-out</h3>
                                <span className="rec-status-pill">
                                    <span className={`rec-dot checkout ${coCameraOn && coLibStatus === "ready" ? "on" : ""}`} />
                                    {coCameraOn ? (coLibStatus === "ready" ? "Đang quét tự động" : "Chưa sẵn sàng quét") : "Đã tắt"}
                                </span>
                            </div>

                            {coLibStatus === "loading" && (
                                <div className="rec-face-api-note">
                                    <AlertCircle size={13} />
                                    Đang tải mô hình nhận diện khuôn mặt…
                                </div>
                            )}
                            {coLibStatus === "error" && (
                                <div className="rec-face-api-note">
                                    <AlertCircle size={13} />
                                    Không tải được mô hình nhận diện khuôn mặt (kiểm tra kết nối mạng tới cdn.jsdelivr.net và storage.googleapis.com). Camera vẫn bật được nhưng sẽ không tự động quét cho tới khi tải lại trang thành công.
                                </div>
                            )}

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

                        <div className="rec-viewport-wrap">
                            <div className={`rec-viewport checkout ${coCameraOn ? "on" : ""}`}>
                                <video ref={coVideoRef} autoPlay playsInline muted className="rec-video" style={{ display: coCameraOn ? "block" : "none" }} />
                                {!coCameraOn && (
                                    <div className="rec-placeholder">
                                        <CameraOff size={28} />
                                        <p>Camera đang tắt</p>
                                        <span>Nhấn "Bắt đầu" để tự động quét khuôn mặt</span>
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
                                {coRecognizeStatus === "error" && (
                                    <div className="rec-viewport-overlay error">
                                        <XCircle size={40} color="#fff" />
                                        <p>
                                            Không thể check-out{coRecognizeResult ? <><br />{coRecognizeResult.fullName}</> : null}
                                            {coRecognizeReason && <span className="rec-overlay-reason"><br />{coRecognizeReason}</span>}
                                        </p>
                                    </div>
                                )}
                                {coRecognizeStatus === "employee" && coRecognizeResult && (
                                    <div className="rec-viewport-overlay employee">
                                        <ShieldAlert size={40} color="#fff" />
                                        <p>Nhận diện nhân viên<br />{coRecognizeResult.fullName}</p>
                                    </div>
                                )}
                            </div>
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
                            <button className="rec-btn rec-door-btn checkout" onClick={() => handleOpenDoor("checkout")} title="Mở cửa">
                                <DoorOpen size={13} /> Mở cửa
                            </button>
                        </div>
                    </div>

                    {/* Thông tin đầy đủ của người vừa check-out — giống Check-in */}
                    <div className="rec-card checkout rec-side-panel">
                        <div className="rec-panel-header row-out">
                            <div className="rec-card-title"><h3>Người vừa check-out</h3></div>
                        </div>

                        <div className="rec-info-area">
                            {coRecognizeStatus === "employee" && coRecognizeResult ? (
                                <div className="rec-lc-card employee">
                                    <MemberTop
                                        member={coRecognizeResult}
                                        onViewPhoto={setPhotoViewMember}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{coRecognizeResult.fullName}</p>
                                                <div className="rec-lc-result-line employee">
                                                    <ShieldAlert size={13} /> Nhân viên — không cần check-out
                                                </div>
                                                <div className="rec-lc-badges">
                                                    <span className="rec-badge badge-indigo">{coRecognizeResult.status || "Active"}</span>
                                                </div>
                                            </>
                                        }
                                    />
                                    <div className="rec-lc-body">
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Mã nhân viên</span><span className="rec-lc-row-value">#{coRecognizeResult.employeeId}</span></div>
                                        <div className="rec-lc-employee-note">
                                            <ShieldAlert size={15} />
                                            <div className="rec-lc-employee-note-text">
                                                Khuôn mặt nhận diện được là của nhân viên, không phải hội viên nên hệ thống không tìm/đóng phiên check-out.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : !coInfoMember ? (
                                <div className="rec-lastcheckin-empty">
                                    <UserRound size={22} />
                                    <p>Chưa có lượt check-out nào</p>
                                    <span>Camera sẽ tự nhận diện — thông tin hội viên sẽ hiện tại đây</span>
                                </div>
                            ) : (
                                <div className={`rec-lc-card ${lastCheckout.result} checkout`}>
                                    <MemberTop
                                        member={coInfoMember}
                                        onViewPhoto={setPhotoViewMember}
                                        nameContent={
                                            <>
                                                <p className="rec-lc-name">{coInfoMember.fullName}</p>
                                                <div className={`rec-lc-result-line checkout ${lastCheckout.result}`}>
                                                    {lastCheckout.result === "success" ? <><CheckCircle2 size={13} /> Check-out thành công</> : <><XCircle size={13} /> Không thể check-out</>}
                                                </div>
                                                <div className="rec-lc-badges">
                                                    <StatusBadge status={coInfoMember.packageStatus} />
                                                    <AccountStatusBadge status={coInfoMember.accountStatus} />
                                                </div>
                                            </>
                                        }
                                    />
                                    <div className="rec-lc-body">
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Mã hội viên</span><span className="rec-lc-row-value">#{coInfoMember.memberId}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Số điện thoại</span><span className="rec-lc-row-value">{coInfoMember.phone}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Gói tập</span><span className="rec-lc-row-value">{coInfoMember.package}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Hết hạn gói</span><span className="rec-lc-row-value">{coInfoMember.expiryDate}</span></div>
                                        <div className="rec-lc-row"><span className="rec-lc-row-label">Giờ check-out</span><span className="rec-lc-row-value">{lastCheckout.at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>

                                        {lastCheckout.reason && lastCheckout.result === "error" && (
                                            <div className="rec-lc-internal-note">
                                                <AlertCircle size={15} />
                                                <div className="rec-lc-internal-note-text">
                                                    <span className="rec-lc-internal-note-label">Lý do không thể check-out</span>
                                                    {lastCheckout.reason}
                                                </div>
                                            </div>
                                        )}
                                        {coInfoMember.accountStatus === "Suspended" && coInfoMember.suspendReason && (
                                            <div className="rec-lc-suspend-note"><ShieldAlert size={13} /><span>Lý do khoá: {coInfoMember.suspendReason}</span></div>
                                        )}
                                        {coInfoMember.internalNotes && (
                                            <div className="rec-lc-internal-note">
                                                <AlertCircle size={15} />
                                                <div className="rec-lc-internal-note-text">
                                                    <span className="rec-lc-internal-note-label">Ghi chú nội bộ</span>
                                                    {coInfoMember.internalNotes}
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

            {/* ── Modal "Check-in thủ công" ── */}
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

            {/* ── Modal xem ảnh hội viên ── */}
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
                    {toast.type === "success" ? <CheckCircle2 size={14} /> : toast.type === "error" ? <XCircle size={14} /> : <ShieldAlert size={14} />}
                    {toast.text}
                </div>
            )}
        </div>
    );
}