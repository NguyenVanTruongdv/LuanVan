import { useNavigate } from "react-router-dom";
import Footer from "../../component/Footer"; // chỉnh lại đường dẫn cho đúng project của bạn
import Header from "../../component/Header"; // chỉnh lại đường dẫn cho đúng project của bạn

// Dữ liệu mẫu theo đúng các field của model MembershipPlan (BE.Models)
// PlanId, PlanName, Price, DurationDays, Description, Status, CreatedAt
const PLANS = [
    {
        planId: 1,
        planName: "Gói 1 Tháng",
        price: 399000,
        durationDays: 30,
        description:
            "Phù hợp người mới bắt đầu, trải nghiệm đầy đủ máy tập tại 1 chi nhánh bất kỳ. Không ràng buộc dài hạn.",
        status: "OnSale",
    },
    {
        planId: 2,
        planName: "Gói PRO 3 Tháng",
        price: 999000,
        durationDays: 90,
        description:
            "Tiết kiệm hơn 15% so với gói tháng. Truy cập mọi chi nhánh, ưu tiên đặt lịch huấn luyện viên cá nhân.",
        status: "OnSale",
        featured: true,
    },
    {
        planId: 3,
        planName: "Gói 6 Tháng",
        price: 1799000,
        durationDays: 180,
        description:
            "Cam kết trung hạn, tặng kèm 2 buổi tư vấn dinh dưỡng và đo chỉ số InBody miễn phí mỗi tháng.",
        status: "OnSale",
    },
    {
        planId: 4,
        planName: "Gói VIP 1 Năm",
        price: 3299000,
        durationDays: 365,
        description:
            "Quyền lợi cao nhất: khăn tập riêng, tủ đồ cố định, ưu tiên giờ vàng tại mọi chi nhánh trong hệ thống.",
        status: "Discontinued",
    },
];

function formatVnd(n) {
    return n.toLocaleString("vi-VN");
}

function plateLabel(days) {
    if (days % 30 === 0) return `${days / 30}TH`;
    return `${days}N`;
}

function PlanCard({ plan, onBuy }) {
    const onSale = plan.status === "OnSale";

    return (
        <div className={`ht-plan-card ${plan.featured ? "featured" : ""}`}>
            {plan.featured && <div className="ribbon">PHỔ BIẾN</div>}

            <div className="plate">{plateLabel(plan.durationDays)}</div>

            <div className="plan-name">{plan.planName}</div>

            <div className={`status-tag ${onSale ? "" : "off"}`}>
                <i /> {onSale ? "Đang bán" : "Ngừng bán"}
            </div>

            <div className="price-row">
                <div className="price">{formatVnd(plan.price)}</div>
                <div className="price-unit">đ</div>
            </div>
            <div className="duration">Thời hạn {plan.durationDays} ngày</div>

            <div className="desc">{plan.description}</div>

            <button
                className={`cta ${plan.featured ? "primary" : ""}`}
                disabled={!onSale}
                onClick={() => onSale && onBuy(plan)}
                style={!onSale ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
                {onSale ? "Chọn mua" : "Ngừng bán"}
            </button>
        </div>
    );
}

export default function MembershipPlansPage() {
    const navigate = useNavigate();
    const onSaleCount = PLANS.filter((p) => p.status === "OnSale").length;

    const handleBuy = (plan) => {
        // Chuyển qua trang thông tin/chuẩn bị thanh toán, mang theo dữ liệu gói đã chọn
        navigate("/thanh-toan", { state: { plan } });
    };

    return (
        <>
            <Header />
            <div className="ht-root">
                <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .ht-root{
          --bg:#0c0c0d;
          --panel-solid:#171718;
          --line:#2a2a2c;
          --accent:#ff4b2b;
          --accent-2:#ff8a3d;
          --text:#f2f1ee;
          --muted:#9a9a9e;
          --green:#3ddc84;
          background:
            radial-gradient(900px 500px at 85% -10%, rgba(255,75,43,0.10), transparent 60%),
            radial-gradient(700px 400px at -10% 20%, rgba(255,138,61,0.06), transparent 55%),
            var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }
        .ht-root *{ box-sizing: border-box; }
        .ht-root a{ text-decoration:none; }

        .ht-hero{ padding: 64px 48px 40px; max-width:1400px; margin:0 auto; }
        .ht-title{
          font-family:'Oswald', sans-serif;
          font-weight:700;
          text-transform:uppercase;
          font-size: clamp(34px, 5vw, 56px);
          letter-spacing:.01em;
          line-height:1.05;
          margin-bottom:18px;
        }
        .ht-eyebrow{
          display:inline-flex; align-items:center; gap:8px;
          border:1px solid rgba(255,75,43,0.4);
          background:rgba(255,75,43,0.08);
          color: var(--accent-2);
          font-size:12px; font-weight:700; letter-spacing:.08em;
          padding:7px 16px; border-radius:999px;
          position:relative;
        }
        .ht-eyebrow::after{
          content:"";
          position:absolute; left:0; bottom:-14px;
          width:46px; height:4px; border-radius:4px;
          background:linear-gradient(90deg, var(--accent), var(--accent-2));
        }
        .ht-sub{ margin-top:26px; color:var(--muted); font-size:16px; max-width:640px; line-height:1.6; }

        .ht-controls{
          max-width:1400px; margin:0 auto; padding:0 48px 8px;
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
        }
        .ht-count{ color:var(--muted); font-size:14px; }
        .ht-legend{ display:flex; gap:18px; flex-wrap:wrap; }
        .ht-legend span{ display:flex; align-items:center; gap:7px; font-size:13px; color:var(--muted); }
        .ht-legend i{ width:9px; height:9px; border-radius:50%; display:inline-block; }

        .ht-plans{
          max-width:1400px; margin:0 auto; padding:28px 48px 90px;
          display:grid; grid-template-columns:repeat(4, 1fr); gap:22px;
        }

        .ht-plan-card{
          position:relative;
          background:linear-gradient(180deg, var(--panel-solid), #121213);
          border:1px solid var(--line);
          border-radius:18px;
          padding:30px 26px 26px;
          display:flex; flex-direction:column;
          transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
          overflow:hidden;
        }
        .ht-plan-card:hover{ transform: translateY(-6px); border-color: rgba(255,75,43,0.45); box-shadow: 0 18px 40px rgba(0,0,0,0.45); }
        .ht-plan-card.featured{
          border-color: rgba(255,138,61,0.55);
          background: linear-gradient(180deg, #1c1410, #15110d 60%, #121213);
        }
        .ribbon{
          position:absolute; top:18px; right:-34px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color:#fff; font-size:11px; font-weight:700; letter-spacing:.05em;
          padding:6px 40px; transform:rotate(40deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .plate{
          width:46px; height:46px; border-radius:50%;
          border:3px solid var(--accent);
          display:flex; align-items:center; justify-content:center;
          font-family:'Oswald'; font-weight:600; font-size:11px; color: var(--accent-2);
          margin-bottom:18px;
          background: radial-gradient(circle at 35% 30%, rgba(255,138,61,0.18), transparent 65%);
        }
        .plan-name{
          font-family:'Oswald', sans-serif; font-weight:600; text-transform:uppercase;
          font-size:20px; letter-spacing:.02em; margin-bottom:6px;
        }
        .status-tag{
          display:inline-flex; align-items:center; gap:6px;
          font-size:11px; font-weight:600; color: var(--green);
          margin-bottom:18px;
        }
        .status-tag i{ width:7px; height:7px; border-radius:50%; background: var(--green); display:inline-block; box-shadow: 0 0 8px var(--green); }
        .status-tag.off{ color:#8a8a8e; }
        .status-tag.off i{ background:#5a5a5e; box-shadow:none; }

        .price-row{ display:flex; align-items:baseline; gap:6px; margin-bottom:4px; }
        .price{ font-family:'Oswald'; font-size:32px; font-weight:700; }
        .price-unit{ color: var(--muted); font-size:13px; }
        .duration{ color: var(--muted); font-size:13px; margin-bottom:22px; }
        .desc{ color:#c7c6c3; font-size:13.5px; line-height:1.7; margin-bottom:22px; flex-grow:1; }

        .cta{
          width:100%; text-align:center; padding:13px; border-radius:11px;
          font-weight:600; font-size:14px; cursor:pointer; border:1px solid var(--line);
          background:transparent; color: var(--text);
          transition: all .2s ease;
        }
        .cta.primary{
          background: linear-gradient(135deg, var(--accent), #c92f17);
          border:none; color:#fff;
          box-shadow: 0 8px 20px rgba(255,75,43,0.3);
        }
        .cta:hover:not(:disabled){ filter:brightness(1.1); transform: translateY(-1px); }

        @media (max-width: 1100px){
          .ht-plans{ grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 760px){
          .ht-hero{ padding: 40px 20px 24px; }
          .ht-controls{ padding: 0 20px 8px; }
          .ht-plans{ padding: 20px 20px 60px; grid-template-columns: 1fr; gap:18px; }
        }
      `}</style>

                <section className="ht-hero">
                    <h1 className="ht-title">Gói tập</h1>
                    <div className="ht-eyebrow">⚡ BẢNG GIÁ HỘI VIÊN</div>
                    <p className="ht-sub">
                        Chọn gói phù hợp với mục tiêu của bạn — từ thử sức ngắn hạn đến cam
                        kết dài hơi với mức giá tốt nhất.
                    </p>
                </section>

                <div className="ht-controls">
                    <div className="ht-count">{onSaleCount} gói đang bán</div>
                    <div className="ht-legend">
                        <span>
                            <i style={{ background: "#3ddc84" }} /> Đang bán
                        </span>
                        <span>
                            <i style={{ background: "#5a5a5e" }} /> Ngừng bán
                        </span>
                    </div>
                </div>

                <section className="ht-plans">
                    {PLANS.map((plan) => (
                        <PlanCard key={plan.planId} plan={plan} onBuy={handleBuy} />
                    ))}
                </section>
            </div>
            <Footer />
        </>
    );
}