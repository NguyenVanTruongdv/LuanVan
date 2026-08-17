import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import memberApi from "../../api/memberApi"; // chỉnh lại đường dẫn cho đúng project của bạn
import Footer from "../../component/Footer"; // chỉnh lại đường dẫn cho đúng project của bạn
import Header from "../../component/Header"; // chỉnh lại đường dẫn cho đúng project của bạn

// Phải TRÙNG với PAYMENT_SESSION_KEY bên Payment.jsx: đây là session client-side (sessionStorage)
// mà Payment.jsx tự lưu để giữ nguyên màn QR khi khách F5. Bất cứ khi nào trang này điều hướng
// sang /payment để bắt đầu MỘT GIAO DỊCH MỚI (không phải "tiếp tục thanh toán" đơn cũ), phải xóa
// session này trước, nếu không Payment.jsx sẽ tưởng nhầm đang F5 giữa chừng và tự khôi phục lại
// QR của đơn cũ (đơn vừa bị hủy ở đây, hoặc một đơn không còn liên quan).
const PAYMENT_SESSION_KEY = "gym_payment_checkout_session";

function clearLocalPaymentSession() {
    try {
        sessionStorage.removeItem(PAYMENT_SESSION_KEY);
    } catch (e) {
        // ignore
    }
}

function formatVnd(n) {
    return Number(n || 0).toLocaleString("vi-VN");
}

function plateLabel(days) {
    if (!days) return "";
    if (days % 30 === 0) return `${days / 30}TH`;
    return `${days}N`;
}

// Description trả về từ API là 1 chuỗi, các ý cách nhau bởi dấu "."
// -> tách thành từng dòng để hiển thị dạng danh sách
function splitDescription(desc) {
    if (!desc) return [];
    return desc
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);
}

// Chuẩn hoá 1 record gói tập từ API (BE trả camelCase đúng chuẩn JS)
// API còn trả kèm memberPackages/promotionPlans/promotionUsages/transactions
// nhưng trang này chưa cần dùng nên bỏ qua, chỉ lấy field cần thiết.
function normalizePlan(raw) {
    return {
        planId: raw.planId,
        planName: raw.planName ?? "",
        price: raw.price ?? 0,
        durationDays: raw.durationDays ?? 0,
        description: raw.description ?? "",
        status: raw.status ?? "OnSale",
        createdAt: raw.createdAt,
        // BE hiện chưa có field "featured" -> tạm đánh dấu nổi bật cho gói 3 tháng
        // (nếu sau này BE có field riêng, thay điều kiện này bằng raw.featured)
        featured: raw.isPopular ?? false
    };
}

function PlanCard({ plan, onBuy, loading }) {
    const onSale = plan.status === "OnSale";
    const lines = splitDescription(plan.description);

    return (
        <div className={`mp-plan${plan.featured ? " mp-plan--hi" : ""}`}>
            {plan.featured && <span className="mp-plan__badge">Phổ biến nhất</span>}

            <div className="mp-plan__plate">{plateLabel(plan.durationDays)}</div>

            <h3 className="mp-plan__name">{plan.planName}</h3>



            <div className="mp-plan__price">
                <span className="mp-plan__amt">{formatVnd(plan.price)}</span>
                <span className="mp-plan__unit">đ</span>
            </div>
            <div className="mp-plan__duration">Thời hạn {plan.durationDays} ngày</div>

            <ul className="mp-plan__list">
                {lines.map((line, i) => (
                    <li key={i}>{line}</li>
                ))}
            </ul>

            <button
                className={`mp-btn${plan.featured ? " mp-btn--primary" : " mp-btn--ghost"} mp-plan__cta`}
                disabled={!onSale || loading}
                onClick={() => onSale && onBuy(plan)}
            >
                {!onSale ? "Ngừng bán" : loading ? "Đang kiểm tra..." : "Chọn mua"}
            </button>
        </div>
    );
}

export default function MembershipPlansPage() {
    const navigate = useNavigate();

    // Trang này là trang công khai (public) để xem bảng giá -> không tự động gọi API
    // kiểm tra transaction Pending khi vừa vào trang nữa. Việc kiểm tra chỉ thực hiện
    // ngay tại thời điểm khách bấm "Chọn mua" một gói cụ thể.
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // planId đang được kiểm tra pending (để disable + đổi label nút của đúng thẻ đó)
    const [checkingPlanId, setCheckingPlanId] = useState(null);

    // Khi phát hiện có giao dịch Pending -> lưu lại { plan (gói khách vừa bấm), pending (đơn cũ) }
    // để hiển thị modal hỏi khách muốn tiếp tục thanh toán đơn cũ hay hủy để mua gói mới.
    const [pendingInfo, setPendingInfo] = useState(null);
    const [switchingPlan, setSwitchingPlan] = useState(false);
    const [pendingActionError, setPendingActionError] = useState(null);

    // Khi tài khoản đang PendingActivation VÀ đã có sẵn 1 gói tập PendingActivation (đã mua
    // online trước đó, chưa từng ra quầy) -> chặn mua thêm, chỉ hiển thị thông báo yêu cầu
    // ra quầy kích hoạt. Không có "plan" đi kèm vì đây không phải lỗi của riêng 1 gói cụ thể.
    const [blockedByPendingPackage, setBlockedByPendingPackage] = useState(false);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await memberApi.getAllPackage();

                // Tuỳ authApi có unwrap response.data sẵn hay không:
                // - Nếu authApi trả thẳng response.data -> res chính là mảng
                // - Nếu authApi trả nguyên response của axios -> res.data là mảng
                // - Phòng thêm trường hợp BE bọc thêm { data: [...] }
                const rawList = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.data?.data)
                            ? res.data.data
                            : [];

                if (mounted) {
                    setPlans(rawList.map(normalizePlan));
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách gói tập:", err);
                if (mounted) setError("Không thể tải danh sách gói tập. Vui lòng thử lại sau.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // Ẩn hẳn các gói đã ngừng bán (Discontinued) khỏi trang
    const visiblePlans = plans.filter((p) => p.status !== "Discontinued");
    const onSaleCount = visiblePlans.filter((p) => p.status === "OnSale").length;

    // Bấm "Chọn mua": kiểm tra theo đúng thứ tự ưu tiên nghiệp vụ:
    //   1) Tài khoản đang PendingActivation và đã có sẵn 1 gói Pending (mua online trước đó)
    //      -> CHẶN LUÔN, không cho tạo giao dịch mới, yêu cầu ra quầy kích hoạt trước.
    //      API thật: memberApi.checkPendingPurchaseStatus() -> GET /api/payment/pending-purchase-status
    //   2) Nếu qua được bước 1 -> kiểm tra tiếp có transaction Pending (đã tạo QR nhưng chưa
    //      chuyển khoản) hay không như cũ, để hỏi khách tiếp tục thanh toán đơn cũ hay huỷ.
    //      API thật: memberApi.getPendingPayment() -> GET /api/payment/pending
    const handleBuy = async (plan) => {
        try {
            setCheckingPlanId(plan.planId);
            setPendingActionError(null);

            const statusRes = await memberApi.checkPendingPurchaseStatus();
            const status = statusRes?.data ?? statusRes;

            // status.canPurchasePackage === false chỉ xảy ra khi tài khoản đang Pending
            // và đã có sẵn 1 gói Pending -> chặn, hiện thông báo, dừng luôn tại đây.
            if (status && status.canPurchasePackage === false) {
                setBlockedByPendingPackage(true);
                return;
            }

            const res = await memberApi.getPendingPayment();
            const pending = res?.data ?? res;

            if (pending?.hasPending) {
                setPendingInfo({ plan, pending });
            } else {
                // Không có giao dịch Pending nào -> chắc chắn là mua mới, không phải resume.
                // Dọn session QR cũ (nếu có sót lại từ trước) để Payment.jsx không hiểu nhầm
                // là đang F5 giữa chừng một đơn cũ.
                clearLocalPaymentSession();
                navigate("/payment", { state: { plan } });
            }
        } catch (err) {
            console.warn("Không kiểm tra được điều kiện mua gói:", err);
            // Lỗi khi kiểm tra thì vẫn cho khách qua trang thanh toán bình thường,
            // trang đó sẽ tự xử lý nếu có vấn đề khi tạo đơn (BE vẫn chặn lại lần nữa
            // nếu thực sự đang bị giới hạn 1 gói Pending).
            clearLocalPaymentSession();
            navigate("/payment", { state: { plan } });
        } finally {
            setCheckingPlanId(null);
        }
    };

    // Khách chọn "Tiếp tục thanh toán" đơn Pending có sẵn -> qua thẳng trang thanh toán,
    // trang đó sẽ hiển thị lại màn QR với đầy đủ thông tin cá nhân + gói tập của đơn cũ.
    const handleContinuePending = () => {
        if (!pendingInfo) return;
        navigate("/payment", {
            state: { resumePending: true, pending: pendingInfo.pending },
        });
    };

    // Khách chọn "Không" -> hủy giao dịch cũ (dùng chung API hủy với nút hủy ở trang QR),
    // sau đó mới cho qua trang thanh toán để mua gói mới vừa bấm.
    // API thật: memberApi.cancelPayment(orderCode) -> POST /api/payment/cancel/{orderCode}
    const handleCancelPendingAndBuyNew = async () => {
        if (!pendingInfo) return;
        try {
            setSwitchingPlan(true);
            setPendingActionError(null);

            await memberApi.cancelPayment(pendingInfo.pending.orderCode);

            const newPlan = pendingInfo.plan;
            setPendingInfo(null);

            // Đơn cũ vừa bị hủy ở trên -> QUAN TRỌNG: xóa luôn session QR mà Payment.jsx đã lưu
            // cho đơn đó. Nếu không, khi Payment.jsx mount lại với state chỉ có { plan } (không
            // phải resumePending), nó sẽ không thấy resumePending nên rơi xuống nhánh kiểm tra
            // sessionStorage, thấy session cũ còn sót lại và tưởng nhầm là đang F5 giữa chừng ->
            // tự động khôi phục lại QR của đơn đã hủy thay vì cho tạo đơn mới. Đây chính là bug
            // "bấm hủy giao dịch nhưng qua payment vẫn nhảy vào QR" cần fix.
            clearLocalPaymentSession();

            navigate("/payment", { state: { plan: newPlan } });
        } catch (err) {
            console.error("Lỗi khi hủy giao dịch cũ:", err);
            setPendingActionError("Không thể hủy giao dịch cũ. Vui lòng thử lại.");
        } finally {
            setSwitchingPlan(false);
        }
    };

    return (
        <>
            <Header />
            <div className="mp-page">
                <style>{`
            .mp-page{
            background: var(--bg, #0c0c0d);
            color: var(--text, #f2f1ee);
            font-family: var(--font-body, 'Inter', sans-serif);
            min-height: 100vh;
            }
            .mp-page *{ box-sizing:border-box; }

            .mp-hero{ padding: 64px 32px 8px; max-width:1280px; margin:0 auto; }
            .mp-title{
            font-family: var(--font-display, 'Oswald', sans-serif);
            font-weight:800;
            text-transform:uppercase;
            font-size: clamp(34px, 5vw, 56px);
            letter-spacing:-.5px;
            line-height:1.05;
            margin-bottom:18px;
            }
            .mp-eyebrow{
            display:inline-flex; align-items:center; gap:8px;
            border:1px solid rgba(255,79,43,.25);
            background: var(--accent-soft, rgba(255,79,43,.08));
            color: var(--accent, #ff4f2b);
            font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
            padding:5px 14px; border-radius:100px;
            }
            .mp-sub{ margin-top:22px; color: var(--text-dim, #9a9a9e); font-size:16px; max-width:620px; line-height:1.6; }

            .mp-controls{
            max-width:1280px; margin:0 auto; padding:24px 32px 8px;
            display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
            }
            .mp-count{ color: var(--text-dim, #9a9a9e); font-size:14px; }
            .mp-legend{ display:flex; gap:18px; flex-wrap:wrap; }
            .mp-legend span{ display:flex; align-items:center; gap:7px; font-size:13px; color: var(--text-dim, #9a9a9e); }
            .mp-legend i{ width:9px; height:9px; border-radius:50%; display:inline-block; }

            .mp-plans{
            max-width:1280px; margin:0 auto; padding:24px 32px 90px;
            display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;
            }

            .mp-state{
            max-width:1280px; margin:0 auto; padding:40px 32px; color: var(--text-dim, #9a9a9e);
            }
            .mp-state--error{ color: var(--accent, #ff4f2b); }

            .mp-plan{
            position:relative;
            display:flex; flex-direction:column; gap:14px;
            background: var(--bg-soft, #171718);
            border:1px solid var(--line, #2a2a2c);
            border-radius: var(--radius, 14px);
            padding:30px 24px 26px;
            transition: transform .2s ease, border-color .2s ease;
            }
            .mp-plan:hover{ transform: translateY(-4px); border-color: var(--steel, #5bb8cc); }
            .mp-plan--hi{
            border-color: var(--accent, #ff4f2b);
            background: linear-gradient(180deg, var(--accent-soft, rgba(255,79,43,.08)) 0%, var(--bg-soft, #171718) 65%);
            }
            .mp-plan--hi:hover{ border-color: var(--accent, #ff4f2b); }

            .mp-plan__badge{
            position:absolute; top:-12px; left:24px;
            background: var(--accent, #ff4f2b); color:#fff;
            font-size:11px; font-weight:700; letter-spacing:.03em;
            padding:4px 12px; border-radius:100px;
            }
            .mp-plan__plate{
            width:44px; height:44px; border-radius:50%;
            border:3px solid var(--accent, #ff4f2b);
            display:flex; align-items:center; justify-content:center;
            font-family: var(--font-display, 'Oswald'); font-weight:700; font-size:11px;
            color: var(--accent, #ff4f2b);
            }
            .mp-plan__name{
            font-family: var(--font-display, 'Oswald', sans-serif);
            font-weight:800; text-transform:uppercase;
            font-size:20px; letter-spacing:.01em; margin:0;
            }
            .mp-plan__status{
            display:inline-flex; align-items:center; gap:6px; width:fit-content;
            font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em;
            color: var(--steel, #5bb8cc);
            }
            .mp-plan__status i{ width:7px; height:7px; border-radius:50%; background: var(--steel, #5bb8cc); box-shadow:0 0 8px var(--steel, #5bb8cc); }
            .mp-plan__status--off{ color:#8a8a8e; }
            .mp-plan__status--off i{ background:#5a5a5e; box-shadow:none; }

            .mp-plan__price{ display:flex; align-items:baseline; gap:6px; }
            .mp-plan__amt{ font-family: var(--font-display, 'Oswald'); font-size:26px; font-weight:800; }
            .mp-plan__unit{ color: var(--text-dim, #9a9a9e); font-size:13px; }
            .mp-plan__duration{ color: var(--text-dim, #9a9a9e); font-size:13px; margin-top:-8px; }

            .mp-plan__list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; flex:1; }
            .mp-plan__list li{ font-size:13px; line-height:1.6; padding-left:20px; position:relative; color:#c7c6c3; }
            .mp-plan__list li::before{ content:"✓"; position:absolute; left:0; color: var(--steel, #5bb8cc); font-weight:700; }

            .mp-btn{
            width:100%; text-align:center; padding:13px; border-radius:9px;
            font-weight:600; font-size:14px; cursor:pointer;
            border:1px solid var(--line, #2a2a2c);
            background:transparent; color: var(--text, #f2f1ee);
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
            }
            .mp-btn--ghost{ background: rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); }
            .mp-btn--primary{
            background: var(--accent, #ff4f2b); border:none; color:#fff;
            box-shadow: 0 4px 20px rgba(255,79,43,.3);
            }
            .mp-btn:hover:not(:disabled){ transform: translateY(-2px); filter:brightness(1.05); }
            .mp-btn:disabled{ opacity:.5; cursor:not-allowed; }

            .mp-modal-overlay{
            position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(2px);
            display:flex; align-items:center; justify-content:center; z-index:50; padding:16px;
            }
            .mp-modal{
            background: var(--bg-soft, #171718); border:1px solid var(--line, #2a2a2c); border-radius:14px;
            padding:24px; width:100%; max-width:400px; animation: mpFade .2s ease;
            }
            @keyframes mpFade{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }
            .mp-modal h3{ font-family: var(--font-display, 'Oswald'); margin:0 0 10px; font-size:19px; text-transform:uppercase; }
            .mp-modal p{ color: var(--text-dim, #9a9a9e); font-size:13.5px; line-height:1.6; margin:0; }
            .mp-modal-error{ color: var(--accent, #ff4f2b); font-size:12.5px; margin-top:12px; }
            .mp-modal-actions{ display:flex; gap:10px; margin-top:20px; }
            .mp-modal-actions .mp-btn{ flex:1; }

            @media (max-width: 1100px){
            .mp-plans{ grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 760px){
            .mp-hero{ padding: 40px 20px 4px; }
            .mp-controls{ padding: 16px 20px 8px; }
            .mp-plans{ padding: 16px 20px 60px; grid-template-columns: 1fr; gap:16px; }
            }
        `}</style>

                <section className="mp-hero">
                    <h1 className="mp-title">Gói tập</h1>
                    <div className="mp-eyebrow">⚡ Bảng giá hội viên</div>
                    <p className="mp-sub">
                        Chọn gói phù hợp với mục tiêu của bạn — từ thử sức ngắn hạn đến cam
                        kết dài hơi với mức giá tốt nhất.
                    </p>
                </section>

                {!loading && !error && (
                    <div className="mp-controls">
                        <div className="mp-count">{onSaleCount} gói đang bán</div>

                    </div>
                )}

                {loading && <div className="mp-state">Đang tải danh sách gói tập...</div>}

                {!loading && error && <div className="mp-state mp-state--error">{error}</div>}

                {!loading && !error && visiblePlans.length === 0 && (
                    <div className="mp-state">Hiện chưa có gói tập nào đang bán.</div>
                )}

                {!loading && !error && visiblePlans.length > 0 && (
                    <section className="mp-plans">
                        {visiblePlans.map((plan) => (
                            <PlanCard
                                key={plan.planId}
                                plan={plan}
                                onBuy={handleBuy}
                                loading={checkingPlanId === plan.planId}
                            />
                        ))}
                    </section>
                )}
            </div>

            {/* Modal: tài khoản đang chờ kích hoạt và đã có sẵn 1 gói tập Pending -> chặn mua thêm */}
            {blockedByPendingPackage && (
                <div
                    className="mp-modal-overlay"
                    onClick={() => setBlockedByPendingPackage(false)}
                >
                    <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Bạn đã đăng ký gói tập</h3>
                        <p>
                            Bạn đã đăng ký một gói tập và đang chờ kích hoạt. Vui lòng đến quầy
                            thu ngân tại phòng gym để kích hoạt tài khoản và đăng ký FaceID
                            trước khi mua thêm gói khác.
                        </p>

                        <div className="mp-modal-actions">
                            <button
                                className="mp-btn mp-btn--primary"
                                onClick={() => setBlockedByPendingPackage(false)}
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: phát hiện có giao dịch Pending khi khách bấm "Chọn mua" */}
            {pendingInfo && (
                <div
                    className="mp-modal-overlay"
                    onClick={() => !switchingPlan && setPendingInfo(null)}
                >
                    <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Giao dịch chưa hoàn thành</h3>
                        <p>
                            Bạn có giao dịch <b style={{ color: "var(--text, #f2f1ee)" }}>#{pendingInfo.pending.orderCode}</b> chưa hoàn thành. Bạn có muốn tiếp tục thanh toán không?
                        </p>

                        {pendingActionError && (
                            <div className="mp-modal-error">{pendingActionError}</div>
                        )}

                        <div className="mp-modal-actions">
                            <button
                                className="mp-btn mp-btn--ghost"
                                disabled={switchingPlan}
                                onClick={handleCancelPendingAndBuyNew}
                            >
                                {switchingPlan ? "Đang hủy..." : "Không, hủy giao dịch cũ"}
                            </button>
                            <button
                                className="mp-btn mp-btn--primary"
                                disabled={switchingPlan}
                                onClick={handleContinuePending}
                            >
                                Tiếp tục thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}