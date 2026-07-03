import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import memberApi from "../../api/memberApi"; // chỉnh lại đường dẫn cho đúng project của bạn
import Footer from "../../component/Footer"; // chỉnh lại đường dẫn cho đúng project của bạn
import Header from "../../component/Header"; // chỉnh lại đường dẫn cho đúng project của bạn

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

function PlanCard({ plan, onBuy }) {
    const onSale = plan.status === "OnSale";
    const lines = splitDescription(plan.description);

    return (
        <div className={`mp-plan${plan.featured ? " mp-plan--hi" : ""}`}>
            {plan.featured && <span className="mp-plan__badge">Phổ biến nhất</span>}

            <div className="mp-plan__plate">{plateLabel(plan.durationDays)}</div>

            <h3 className="mp-plan__name">{plan.planName}</h3>

            <div className={`mp-plan__status${onSale ? "" : " mp-plan__status--off"}`}>
                <i /> {onSale ? "Đang bán" : "Ngừng bán"}
            </div>

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
                disabled={!onSale}
                onClick={() => onSale && onBuy(plan)}
            >
                {onSale ? "Chọn mua" : "Ngừng bán"}
            </button>
        </div>
    );
}

export default function MembershipPlansPage() {
    const navigate = useNavigate();

    // Kiểm tra ngay khi vào trang: member có transaction đang Pending không.
    // Nếu có -> redirect thẳng sang /payment (trang đó sẽ tự resume màn QR từ pending),
    // không cho xem/chọn gói ở đây nữa. checkingPending=true trong lúc chờ kết quả
    // để tránh flash danh sách gói ra rồi mới điều hướng.
    const [checkingPending, setCheckingPending] = useState(true);

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await memberApi.getPendingPayment();
                const pending = res?.data ?? res;

                if (mounted && pending?.hasPending) {
                    navigate("/payment", { replace: true });
                    return; // không setCheckingPending(false) để không render trang này ra trước khi chuyển hướng xong
                }
            } catch (err) {
                console.warn("Không kiểm tra được đơn hàng đang chờ:", err);
                // Lỗi thì vẫn cho xem trang gói tập bình thường, không chặn người dùng
            } finally {
                if (mounted) setCheckingPending(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    useEffect(() => {
        // Chỉ tải danh sách gói sau khi đã chắc chắn không có đơn Pending nào,
        // tránh gọi API thừa nếu chuẩn bị bị redirect sang /payment.
        if (checkingPending) return;

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
    }, [checkingPending]);

    // Ẩn hẳn các gói đã ngừng bán (Discontinued) khỏi trang
    const visiblePlans = plans.filter((p) => p.status !== "Discontinued");
    const onSaleCount = visiblePlans.filter((p) => p.status === "OnSale").length;

    const handleBuy = (plan) => {
        navigate("/payment", { state: { plan } });
    };

    // Đang kiểm tra pending (hoặc chuẩn bị redirect) -> chỉ hiện loading, không render gì khác
    if (checkingPending) {
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
        `}</style>
                    <div style={{ padding: "80px 32px", textAlign: "center", color: "var(--text-dim, #9a9a9e)" }}>
                        Đang kiểm tra thông tin...
                    </div>
                </div>
                <Footer />
            </>
        );
    }

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
                        <div className="mp-legend">
                            <span>
                                <i style={{ background: "var(--steel, #5bb8cc)" }} /> Đang bán
                            </span>
                            <span>
                                <i style={{ background: "#5a5a5e" }} /> Ngừng bán
                            </span>
                        </div>
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
                            <PlanCard key={plan.planId} plan={plan} onBuy={handleBuy} />
                        ))}
                    </section>
                )}
            </div>
            <Footer />
        </>
    );
}