import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import memberApi from "../../api/memberApi"; // chỉnh lại đường dẫn cho đúng project của bạn
import Footer from "../../component/Footer";
import Header from "../../component/Header";
const styles = `
  .co-root{
    --bg:#0a0a0d; --bg-soft:#101013; --card:#16161a; --border:#26262d; --border-hi:#35353d;
    --text:#f4f4f6; --text-dim:#9a9aa4; --text-faint:#64646d;
    --accent:#ff5a2e; --accent-2:#ff8a50; --accent-dim:#3a2015; --teal:#3fd6c0; --green:#33c47e;
    font-family:'Be Vietnam Pro', sans-serif;
    background:
      radial-gradient(900px 500px at 15% -10%, rgba(255,90,46,0.10), transparent 60%),
      radial-gradient(700px 500px at 100% 0%, rgba(63,214,192,0.06), transparent 55%),
      var(--bg);
    color:var(--text);
    min-height:100%;
    padding:28px 16px 70px;
  }
  .co-root *{ box-sizing:border-box; }
  .co-wrap{ max-width:1080px; margin:0 auto; }
  .co-disp{ font-family:'Space Grotesk', sans-serif; }

  .co-back{
    display:inline-flex; align-items:center; gap:7px; background:transparent; border:1px solid var(--border-hi);
    color:var(--text-dim); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer;
    margin-bottom:18px; transition:color .15s, border-color .15s;
  }
  .co-back:hover{ color:var(--text); border-color:var(--text-faint); }

  .co-stepper{ display:flex; align-items:center; justify-content:center; margin:8px 0 32px; }
  .co-step{ display:flex; align-items:center; gap:9px; }
  .co-dot{
    width:29px; height:29px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:12.5px; font-weight:700; border:1.5px solid var(--border-hi); color:var(--text-faint);
    background:var(--card); transition:all .3s ease; flex-shrink:0;
  }
  .co-step-label{ font-size:12.5px; color:var(--text-faint); font-weight:600; white-space:nowrap; }
  .co-step.active .co-dot{ border-color:var(--accent); background:var(--accent); color:#0a0a0d; box-shadow:0 0 0 4px var(--accent-dim); }
  .co-step.active .co-step-label{ color:var(--text); }
  .co-step.done .co-dot{ border-color:var(--green); background:var(--green); color:#04150c; }
  .co-step.done .co-step-label{ color:var(--text-dim); }
  .co-line{ width:40px; height:1.5px; background:var(--border-hi); margin:0 8px; transition:background .3s; }
  .co-line.done{ background:var(--green); }
  @media (max-width:600px){ .co-step-label{ display:none; } .co-line{ width:20px; } }

  .co-title{ font-size:25px; font-weight:700; margin:0 0 4px; letter-spacing:-.3px; text-align:center; }
  .co-sub{ color:var(--text-dim); font-size:14px; margin:0 0 26px; text-align:center; }

  .co-grid{ display:grid; grid-template-columns:1.35fr 1fr; gap:18px; align-items:start; }
  @media (max-width:860px){ .co-grid{ grid-template-columns:1fr; } }

  .co-card{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; margin-bottom:16px; }
  .co-card-title{ font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-dim); margin:0 0 16px; display:flex; align-items:center; gap:8px; }
  .co-bar{ width:3px; height:13px; background:var(--accent); border-radius:2px; display:inline-block; }

  .co-pkg-row{ display:flex; align-items:center; gap:12px; }
  .co-pkg-box{ flex:1; border:1px solid var(--border); border-radius:12px; padding:13px 15px; background:var(--bg-soft); }
  .co-pkg-box.new{ border-color:rgba(255,90,46,0.45); background:linear-gradient(180deg, rgba(255,90,46,0.08), transparent); }
  .co-pkg-tag{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text-faint); margin-bottom:5px; }
  .co-pkg-box.new .co-pkg-tag{ color:var(--accent-2); }
  .co-pkg-name{ font-size:16px; font-weight:700; }
  .co-pkg-meta{ font-size:12px; color:var(--text-dim); margin-top:3px; }

  .co-timeline{ margin-top:18px; }
  .co-track{ position:relative; height:8px; border-radius:5px; background:var(--border); overflow:hidden; }
  .co-fill-old{ position:absolute; left:0; top:0; height:100%; background:var(--border-hi); }
  .co-fill-new{ position:absolute; top:0; height:100%; background:linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius:5px; }
  .co-tl-labels{ display:flex; justify-content:space-between; margin-top:9px; font-size:11px; color:var(--text-faint); }
  .co-tl-pt{ display:flex; flex-direction:column; align-items:center; gap:2px; }
  .co-tl-pt b{ color:var(--text); font-weight:600; font-size:11.5px; }

  .co-promo{ display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px dashed rgba(63,214,192,0.4); background:rgba(63,214,192,0.06); border-radius:12px; padding:12px 15px; margin-top:16px; }
  .co-promo-left{ display:flex; align-items:center; gap:11px; }
  .co-promo-icon{ width:32px; height:32px; border-radius:9px; background:rgba(63,214,192,0.15); display:flex; align-items:center; justify-content:center; color:var(--teal); flex-shrink:0; }
  .co-promo-name{ font-weight:700; font-size:13px; }
  .co-promo-desc{ font-size:11.5px; color:var(--text-dim); margin-top:2px; }
  .co-promo-val{ font-weight:700; color:var(--teal); font-size:13.5px; white-space:nowrap; }

  .co-price-list{ margin-top:16px; border-top:1px solid var(--border); padding-top:12px; }
  .co-price-row{ display:flex; justify-content:space-between; font-size:13px; color:var(--text-dim); padding:5px 0; }
  .co-price-row.discount{ color:var(--teal); }
  .co-price-row.total{ margin-top:6px; padding-top:11px; border-top:1px solid var(--border); font-size:15px; color:var(--text); font-weight:700; }
  .co-price-row.total .val{ color:var(--accent-2); font-size:19px; }

  .co-user{ display:flex; align-items:center; gap:12px; }
  .co-avatar{ width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, var(--accent), #b8340f); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; }
  .co-user-name{ font-weight:700; font-size:14px; }
  .co-user-sub{ font-size:12px; color:var(--text-dim); margin-top:2px; }

  .co-info-line{ display:flex; justify-content:space-between; font-size:12.5px; padding:8px 0; border-bottom:1px solid var(--border); color:var(--text-dim); gap:12px; }
  .co-info-line:last-child{ border-bottom:none; }
  .co-info-line span:first-child{ flex-shrink:0; }
  .co-info-line span:last-child{ color:var(--text); font-weight:500; text-align:right; }

  .co-btn{ width:100%; border:none; border-radius:12px; padding:14px 16px; font-weight:700; font-size:14.5px; cursor:pointer; transition:transform .15s, box-shadow .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .co-btn-primary{ background:linear-gradient(135deg, var(--accent), #e64a1f); color:#fff; box-shadow:0 8px 22px -8px rgba(255,90,46,0.55); }
  .co-btn-primary:hover{ transform:translateY(-1px); }
  .co-btn-primary:disabled{ opacity:.6; cursor:not-allowed; transform:none; }
  .co-btn-ghost{ background:transparent; border:1px solid var(--border-hi); color:var(--text-dim); }
  .co-btn-ghost:hover{ color:var(--text); border-color:var(--text-faint); }

  .co-fine{ font-size:11px; color:var(--text-faint); text-align:center; margin-top:11px; line-height:1.5; }
  .co-fine b{ color:var(--text-dim); }

  .co-qr-wrap{ display:flex; justify-content:center; }
  .co-qr-card{ max-width:440px; width:100%; text-align:center; }
  .co-qr-amount{ font-size:28px; font-weight:700; color:var(--accent-2); margin:2px 0; }
  .co-qr-box{ width:200px; height:200px; margin:16px auto 12px; background:#fff; border-radius:14px; padding:10px; }
  .co-order{ font-size:12px; color:var(--text-dim); }
  .co-order b{ color:var(--text); letter-spacing:.4px; }
  .co-status-pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 15px; border-radius:999px; background:rgba(255,90,46,0.1); border:1px solid rgba(255,90,46,0.3); font-size:12.5px; font-weight:600; color:var(--accent-2); margin-top:16px; }
  .co-pulse{ width:7px; height:7px; border-radius:50%; background:var(--accent); animation:coPulse 1.4s ease-in-out infinite; }
  @keyframes coPulse{ 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.4; transform:scale(1.3);} }
  .co-countdown{ font-size:12px; color:var(--text-faint); margin-top:9px; }

  .co-success{ max-width:460px; margin:0 auto; text-align:center; padding:10px 0; }
  .co-check-circle{ width:74px; height:74px; border-radius:50%; margin:0 auto 20px; background:radial-gradient(circle, rgba(51,196,126,0.18), transparent 70%); display:flex; align-items:center; justify-content:center; position:relative; }
  .co-check-circle::before{ content:''; position:absolute; inset:0; border-radius:50%; border:2px solid var(--green); animation:coRing 1s ease-out; }
  @keyframes coRing{ 0%{ transform:scale(.6); opacity:0;} 60%{ opacity:1;} 100%{ transform:scale(1); opacity:1;} }
  .co-success-title{ font-size:21px; font-weight:700; margin:0 0 6px; }
  .co-success-sub{ color:var(--text-dim); font-size:13.5px; margin:0 0 22px; }

  .co-fade{ animation:coFade .35s ease; }
  @keyframes coFade{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }

  .co-state{ text-align:center; color:var(--text-dim); font-size:14px; padding:60px 16px; }
  .co-state--error{ color:var(--accent-2); }

  .co-skel{ display:inline-block; height:12px; width:90px; border-radius:4px; background:var(--border-hi); position:relative; overflow:hidden; }
  .co-skel::after{ content:''; position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); animation:coSkel 1.2s infinite; }
  @keyframes coSkel{ 0%{ transform:translateX(-100%);} 100%{ transform:translateX(100%);} }
`;

function formatVnd(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(d) {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString("vi-VN");
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || "?";
}

// Deterministic pseudo-QR pattern dùng làm fallback khi chưa có ảnh QR thật từ cổng thanh toán
function FakeQR({ seed = "GYM" }) {
    const size = 21;
    let s = 0;
    for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i) * (i + 7);
    const rand = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
    const cell = 8;
    const finder = (x, y) => (
        <g key={`f-${x}-${y}`}>
            <rect x={x} y={y} width={cell * 7} height={cell * 7} fill="#0a0a0d" />
            <rect x={x + cell} y={y + cell} width={cell * 5} height={cell * 5} fill="#fff" />
            <rect x={x + cell * 2} y={y + cell * 2} width={cell * 3} height={cell * 3} fill="#0a0a0d" />
        </g>
    );
    const modules = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const inFinder =
                (r < 7 && c < 7) || (r < 7 && c > size - 8) || (r > size - 8 && c < 7);
            if (inFinder) continue;
            if (rand() > 0.56) {
                modules.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0a0a0d" />);
            }
        }
    }
    const px = size * cell;
    return (
        <svg viewBox={`0 0 ${px} ${px}`} width="100%" height="100%">
            <rect width={px} height={px} fill="#fff" />
            {modules}
            {finder(0, 0)}
            {finder(px - cell * 7, 0)}
            {finder(0, px - cell * 7)}
        </svg>
    );
}

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();

    // Gói vừa chọn từ trang MembershipPlansPage: navigate("/payment", { state: { plan } })
    const selectedPlan = location.state?.plan ?? null;

    const [step, setStep] = useState(1);

    // Gói hiện tại của hội viên (nếu có), lấy từ API
    const [currentPackage, setCurrentPackage] = useState(null);
    const [loadingCurrent, setLoadingCurrent] = useState(true);

    // Thông tin cá nhân người mua (tên, sdt, chi nhánh đăng ký ban đầu...)
    // TODO: thay bằng gọi API thật memberApi.getMyInfo() -> GET /api/member/me
    // (id lấy từ token phía BE, FE không cần truyền id).
    const [myInfo, setMyInfo] = useState(null);
    const [loadingMyInfo, setLoadingMyInfo] = useState(true);

    // Đơn hàng tạo ra sau khi bấm "Xác nhận & Thanh toán"
    const [order, setOrder] = useState(null); // { orderId, amount, qrImageUrl, bankInfo, expiresAt }
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [orderError, setOrderError] = useState(null);

    const [seconds, setSeconds] = useState(0);
    const countdownRef = useRef(null);
    const pollRef = useRef(null);

    // Chưa có gói nào được chọn (ví dụ user vào thẳng /payment) -> quay lại trang gói tập
    useEffect(() => {
        if (!selectedPlan) return;
    }, [selectedPlan]);

    // Lấy gói tập hiện tại của hội viên để hiển thị block "chuyển đổi gói"
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoadingCurrent(true);
                // TODO: đổi tên method này cho khớp API thật, ví dụ:
                // memberApi.getCurrentPackage() -> GET /api/member/current-package
                const res = await memberApi.getCurrentPackage?.();
                const raw = Array.isArray(res) ? res[0] : res?.data ?? res ?? null;
                if (mounted) setCurrentPackage(raw || null);
            } catch (err) {
                // Không có gói hiện tại (hội viên mới) hoặc API chưa sẵn sàng -> bỏ qua, không chặn luồng thanh toán
                console.warn("Không lấy được gói hiện tại:", err);
                if (mounted) setCurrentPackage(null);
            } finally {
                if (mounted) setLoadingCurrent(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Lấy thông tin cá nhân hội viên (tên, sdt, chi nhánh đăng ký ban đầu)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoadingMyInfo(true);

                // ── Khi có API thật, bỏ mock bên dưới và dùng đoạn này ──
                // memberApi.getMyInfo() -> GET /api/member/me (BE tự lấy id từ token trong header Authorization)
                // const res = await memberApi.getMyInfo?.();
                // const raw = res?.data ?? res ?? null;
                // if (mounted && raw) {
                //     setMyInfo({
                //         fullName: raw.fullName,
                //         phone: raw.phone,
                //         initialBranchName: raw.initialBranchName ?? raw.branchName ?? raw.registeredBranch,
                //     });
                // }

                // ── Mock tạm thời ──
                await new Promise((r) => setTimeout(r, 300));
                if (mounted) {
                    setMyInfo({
                        fullName: "Nguyễn Văn A",
                        phone: "0901 234 567",
                        initialBranchName: "Chi nhánh Quận 1",
                    });
                }
            } catch (err) {
                console.warn("Không lấy được thông tin cá nhân:", err);
                if (mounted) setMyInfo(null);
            } finally {
                if (mounted) setLoadingMyInfo(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Tạo đơn hàng khi bước sang màn hình QR
    const handleConfirmPayment = async () => {
        if (!selectedPlan) return;
        try {
            setCreatingOrder(true);
            setOrderError(null);

            // TODO: đổi tên method + payload cho khớp API thật, ví dụ:
            // memberApi.createOrder({ planId }) -> POST /api/orders { planId }
            const res = await memberApi.createOrder?.({ planId: selectedPlan.planId });
            const raw = res?.data ?? res;

            if (!raw) throw new Error("Không nhận được dữ liệu đơn hàng từ server");

            setOrder({
                orderId: raw.orderId ?? raw.id ?? `GYM${selectedPlan.planId}${Date.now()}`,
                amount: raw.amount ?? selectedPlan.price,
                qrImageUrl: raw.qrImageUrl ?? null, // nếu BE trả sẵn ảnh QR thì dùng, không thì fallback FakeQR
                bankName: raw.bankName ?? "",
                accountName: raw.accountName ?? "",
                accountNumber: raw.accountNumber ?? "",
                transferContent: raw.transferContent ?? raw.orderId ?? "",
                expiresInSeconds: raw.expiresInSeconds ?? 299,
            });

            setStep(2);
        } catch (err) {
            console.error("Lỗi khi tạo đơn hàng:", err);
            setOrderError("Không thể tạo đơn hàng. Vui lòng thử lại.");
        } finally {
            setCreatingOrder(false);
        }
    };

    // Đếm ngược thời gian hết hạn QR
    useEffect(() => {
        if (step === 2 && order) {
            setSeconds(order.expiresInSeconds ?? 299);
            countdownRef.current = setInterval(() => {
                setSeconds((s) => (s > 0 ? s - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(countdownRef.current);
    }, [step, order]);

    // Poll trạng thái đơn hàng để tự động chuyển sang bước 3 khi thanh toán thành công
    useEffect(() => {
        if (step === 2 && order) {
            pollRef.current = setInterval(async () => {
                try {
                    // TODO: đổi tên method cho khớp API thật, ví dụ:
                    // memberApi.getOrderStatus(orderId) -> GET /api/orders/{orderId}/status
                    const res = await memberApi.getOrderStatus?.(order.orderId);
                    const status = res?.data?.status ?? res?.status;
                    if (status === "Paid" || status === "Success") {
                        clearInterval(pollRef.current);
                        setStep(3);
                    }
                } catch (err) {
                    console.warn("Lỗi khi kiểm tra trạng thái đơn hàng:", err);
                }
            }, 3000);
        }
        return () => clearInterval(pollRef.current);
    }, [step, order]);

    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");

    // Tính mốc thời gian hiệu lực gói mới
    const today = new Date();
    const newStart = currentPackage?.endDate ? new Date(currentPackage.endDate) : today;
    const newEnd = selectedPlan ? addDays(newStart, selectedPlan.durationDays) : null;

    const goToPackages = () => navigate("/packages");

    return (
        <>
            {/* Header không có route /payment riêng trong NAV_LINKS nên dùng prop `active="packages"`
                để ép highlight mục "Gói tập" trên thanh nav trong suốt luồng thanh toán */}
            <Header active="packages" />
            <div className="co-root">
                <style>{styles}</style>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
                />
                <div className="co-wrap">
                    {/* Stepper */}
                    <div className="co-stepper">
                        <div className={`co-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
                            <div className="co-dot co-disp">{step > 1 ? <Check size={14} /> : "1"}</div>
                            <div className="co-step-label">Thông tin đơn hàng</div>
                        </div>
                        <div className={`co-line ${step > 1 ? "done" : ""}`} />
                        <div className={`co-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
                            <div className="co-dot co-disp">{step > 2 ? <Check size={14} /> : "2"}</div>
                            <div className="co-step-label">Quét mã thanh toán</div>
                        </div>
                        <div className={`co-line ${step > 2 ? "done" : ""}`} />
                        <div className={`co-step ${step === 3 ? "active" : ""}`}>
                            <div className="co-dot co-disp">3</div>
                            <div className="co-step-label">Hoàn tất</div>
                        </div>
                    </div>

                    {/* Chưa có gói nào được chọn */}
                    {!selectedPlan && (
                        <div className="co-state co-state--error">
                            Không tìm thấy thông tin gói tập bạn muốn mua.
                            <div style={{ marginTop: 16 }}>
                                <button className="co-btn co-btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={goToPackages}>
                                    Quay lại chọn gói
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 1 */}
                    {selectedPlan && step === 1 && (
                        <div className="co-fade">
                            <button className="co-back" onClick={goToPackages}>
                                <ArrowLeft size={15} /> Quay lại chọn gói
                            </button>

                            <h1 className="co-title co-disp">Xác nhận đơn hàng</h1>
                            <p className="co-sub">Kiểm tra lại thông tin gói tập trước khi thanh toán</p>

                            <div className="co-grid">
                                <div>
                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Chuyển đổi gói tập</div>
                                        <div className="co-pkg-row">
                                            <div className="co-pkg-box">
                                                <div className="co-pkg-tag">Gói hiện tại</div>
                                                {loadingCurrent ? (
                                                    <div className="co-pkg-meta">Đang tải...</div>
                                                ) : currentPackage ? (
                                                    <>
                                                        <div className="co-pkg-name co-disp">{currentPackage.planName}</div>
                                                        <div className="co-pkg-meta">Kết thúc {formatDate(currentPackage.endDate)}</div>
                                                    </>
                                                ) : (
                                                    <div className="co-pkg-meta">Chưa có gói nào</div>
                                                )}
                                            </div>
                                            <ArrowRight size={18} color="#64646d" style={{ flexShrink: 0 }} />
                                            <div className="co-pkg-box new">
                                                <div className="co-pkg-tag">Gói muốn mua</div>
                                                <div className="co-pkg-name co-disp">{selectedPlan.planName}</div>
                                                <div className="co-pkg-meta">Thời hạn {selectedPlan.durationDays} ngày</div>
                                            </div>
                                        </div>

                                        <div className="co-timeline">
                                            <div className="co-track">
                                                <div className="co-fill-old" style={{ width: currentPackage ? "22%" : "0%" }} />
                                                <div className="co-fill-new" style={{ left: currentPackage ? "22%" : "0%", width: currentPackage ? "78%" : "100%" }} />
                                            </div>
                                            <div className="co-tl-labels">
                                                <div className="co-tl-pt">Hôm nay<br /><b>{formatDate(today)}</b></div>
                                                <div className="co-tl-pt">Bắt đầu gói mới<br /><b>{formatDate(newStart)}</b></div>
                                                <div className="co-tl-pt">Kết thúc gói mới<br /><b>{formatDate(newEnd)}</b></div>
                                            </div>
                                        </div>

                                        <div className="co-price-list">
                                            <div className="co-price-row"><span>Giá {selectedPlan.planName}</span><span>{formatVnd(selectedPlan.price)}</span></div>
                                            <div className="co-price-row total"><span>Thành tiền</span><span className="val co-disp">{formatVnd(selectedPlan.price)}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {/* Thông tin cá nhân — mock tạm thời, sau này lấy từ memberApi.getMyInfo() (id theo token) */}
                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Thông tin cá nhân</div>
                                        <div className="co-user">
                                            <div className="co-avatar co-disp">{loadingMyInfo ? "" : getInitials(myInfo?.fullName)}</div>
                                            <div>
                                                <div className="co-user-name">
                                                    {loadingMyInfo ? <span className="co-skel" /> : (myInfo?.fullName || "—")}
                                                </div>
                                                <div className="co-user-sub">
                                                    {loadingMyInfo ? <span className="co-skel" style={{ width: 70 }} /> : (myInfo?.phone || "—")}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 14 }}>
                                            <div className="co-info-line">
                                                <span>Số điện thoại</span>
                                                <span>{loadingMyInfo ? <span className="co-skel" /> : (myInfo?.phone || "—")}</span>
                                            </div>
                                            <div className="co-info-line">
                                                <span>Chi nhánh đăng ký ban đầu</span>
                                                <span>{loadingMyInfo ? <span className="co-skel" /> : (myInfo?.initialBranchName || "—")}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="co-card">
                                        <div className="co-card-title"><span className="co-bar" />Thanh toán</div>
                                        <div className="co-info-line">
                                            <span>Tổng cộng</span>
                                            <span className="co-disp" style={{ fontSize: 17, color: "#ff8a50" }}>{formatVnd(selectedPlan.price)}</span>
                                        </div>

                                        {orderError && (
                                            <div className="co-fine" style={{ color: "var(--accent-2)", marginTop: 10 }}>{orderError}</div>
                                        )}

                                        <button
                                            className="co-btn co-btn-primary"
                                            style={{ marginTop: 14 }}
                                            disabled={creatingOrder}
                                            onClick={handleConfirmPayment}
                                        >
                                            {creatingOrder ? "Đang tạo đơn..." : "Xác nhận & Thanh toán"}
                                        </button>
                                        <div className="co-fine">
                                            Bằng việc xác nhận, gói mới sẽ được kích hoạt từ <b>{formatDate(newStart)}</b>{currentPackage ? " ngay sau khi gói hiện tại kết thúc." : "."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 2 */}
                    {selectedPlan && step === 2 && order && (
                        <div className="co-fade">
                            <h1 className="co-title co-disp">Quét mã để thanh toán</h1>
                            <p className="co-sub">Mở app ngân hàng hoặc ví điện tử và quét mã QR bên dưới</p>

                            <div className="co-qr-wrap">
                                <div className="co-card co-qr-card">
                                    <div className="co-qr-amount co-disp">{formatVnd(order.amount)}</div>
                                    <div style={{ fontSize: 12, color: "#64646d" }}>Số tiền cần thanh toán</div>

                                    <div className="co-qr-box">
                                        {order.qrImageUrl ? (
                                            <img src={order.qrImageUrl} alt="QR thanh toán" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                        ) : (
                                            <FakeQR seed={order.orderId} />
                                        )}
                                    </div>

                                    <div className="co-order">Mã đơn hàng <b>#{order.orderId}</b></div>

                                    <div style={{ textAlign: "left", marginTop: 18 }}>
                                        {order.bankName && <div className="co-info-line"><span>Ngân hàng</span><span>{order.bankName}</span></div>}
                                        {order.accountName && <div className="co-info-line"><span>Chủ tài khoản</span><span>{order.accountName}</span></div>}
                                        {order.accountNumber && <div className="co-info-line"><span>Số tài khoản</span><span>{order.accountNumber}</span></div>}
                                        <div className="co-info-line"><span>Nội dung CK</span><span>{order.transferContent}</span></div>
                                    </div>

                                    <div className="co-status-pill"><span className="co-pulse" />Đang chờ thanh toán...</div>
                                    <div className="co-countdown co-disp">Mã QR hết hạn sau {mm}:{ss}</div>

                                    <button className="co-btn co-btn-ghost" style={{ marginTop: 18 }} onClick={() => setStep(1)}>
                                        <ArrowLeft size={15} /> Quay lại đơn hàng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 3 */}
                    {selectedPlan && step === 3 && (
                        <div className="co-fade co-success">
                            <div className="co-check-circle">
                                <Check size={34} color="#33c47e" strokeWidth={3} />
                            </div>
                            <h1 className="co-success-title co-disp">Thanh toán thành công!</h1>
                            <p className="co-success-sub">{selectedPlan.planName} sẽ tự động kích hoạt vào {formatDate(newStart)}</p>

                            <div className="co-card" style={{ textAlign: "left" }}>
                                <div className="co-card-title"><span className="co-bar" />Chi tiết giao dịch</div>
                                <div className="co-info-line"><span>Gói tập</span><span>{selectedPlan.planName}</span></div>
                                <div className="co-info-line"><span>Thời hạn</span><span>{formatDate(newStart)} &ndash; {formatDate(newEnd)}</span></div>
                                <div className="co-info-line"><span>Mã đơn hàng</span><span>#{order?.orderId}</span></div>
                                <div className="co-info-line"><span>Số tiền đã thanh toán</span><span style={{ color: "#ff8a50", fontWeight: 700 }}>{formatVnd(order?.amount ?? selectedPlan.price)}</span></div>
                            </div>

                            <button className="co-btn co-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/")}>
                                Về trang chủ
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}