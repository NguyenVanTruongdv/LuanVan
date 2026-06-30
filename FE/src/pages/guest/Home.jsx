import { useCallback, useEffect, useState } from "react";
import Footer from "../../component/Footer";
import Header from "../../component/Header";

const BRANCHES = [
  { id: "q1", name: "VTGym Quận 1", address: "123 Nguyễn Huệ, Q.1, TP.HCM", href: "/chi-nhanh/q1" },
  { id: "q7", name: "VTGym Quận 7", address: "456 Nguyễn Thị Thập, Q.7, TP.HCM", href: "/chi-nhanh/q7" },
  { id: "bth", name: "VTGym Bình Thạnh", address: "78 Xô Viết Nghệ Tĩnh, Q.BT, TP.HCM", href: "/chi-nhanh/binh-thanh" },
  { id: "td", name: "VTGym Thủ Đức", address: "321 Võ Văn Ngân, TP.Thủ Đức", href: "/chi-nhanh/thu-duc" },
];

const MOCK_PACKAGES = [
  {
    id: "1-thang", name: "1 Tháng", price: 350000, period: "/tháng", highlighted: false, href: "/goi-tap/1-thang",
    desc: "Phù hợp để trải nghiệm trước khi gắn bó lâu dài.",
    features: ["Tự do giờ tập 24/7", "Sử dụng tại tất cả chi nhánh", "Không ràng buộc hợp đồng"]
  },
  {
    id: "6-thang", name: "6 Tháng", price: 1800000, period: "/6 tháng", highlighted: true, href: "/goi-tap/6-thang",
    desc: "Lựa chọn được chọn nhiều nhất — tiết kiệm hơn gói tháng.",
    features: ["Tự do giờ tập 24/7", "Sử dụng tại cả chi nhánh", "Phòng tắm miễn phí"]
  },
  {
    id: "12-thang", name: "12 Tháng", price: 3200000, period: "/năm", highlighted: false, href: "/goi-tap/12-thang",
    desc: "Tiết kiệm tối đa cho người tập luyện lâu dài.",
    features: ["Tự do giờ tập 24/7", "Sử dụng tại cả chi nhánh", "Tủ khóa gửi đồ miễn phí"]
  },
];

// Dữ liệu giả lập — sau này thay bằng API thật trong hàm fetchTraffic() bên dưới
const MOCK_TRAFFIC = { q1: [28, 41, 55, 62, 48], q7: [18, 30, 44, 50, 37], bth: [22, 35, 49, 58, 43], td: [12, 24, 38, 45, 30] };

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80",
];

const GALLERY_IMAGES = [
  { src: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=900&q=80", label: "Khu tạ tự do" },
  { src: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80", label: "Máy cardio hiện đại" },
  { src: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80", label: "Không gian rộng rãi" },
  { src: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80", label: "Khu Functional Training" },
  { src: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=900&q=80", label: "Phòng tập sạch sẽ" },
  { src: "https://images.unsplash.com/photo-1567598508481-65985588e295?w=900&q=80", label: "Máy lạnh toàn khu" },
];

const EQUIPMENT_CATEGORIES = [
  { icon: "🏋️", name: "Tạ tự do", desc: "Dumbbells 2–60kg, barbell, EZ bar, hex bar", href: "/may-tap#ta-tu-do" },
  { icon: "🚴", name: "Cardio", desc: "Treadmill, bike, elliptical, rowing machine", href: "/may-tap#cardio" },
  { icon: "⚙️", name: "Máy kháng lực", desc: "Cable crossover, smith machine, leg press", href: "/may-tap#may-khang-luc" },
  { icon: "🤸", name: "Functional", desc: "TRX, battle rope, kettlebell, plyo box", href: "/may-tap#functional" },
];

const fmt = (n) => n.toLocaleString("vi-VN") + "đ";

/**
 * Hàm lấy dữ liệu lượng người tập theo chi nhánh.
 * Hiện tại đang trả về dữ liệu mock (giả lập độ trễ mạng).
 * Khi có API thật, chỉ cần thay phần bên trong bằng:
 *
 *   const res = await fetch(`/api/branches/${branchId}/traffic`);
 *   if (!res.ok) throw new Error("Không lấy được dữ liệu lượng người tập");
 *   const json = await res.json();
 *   return { values: json.values, labels: json.labels };
 *
 * miễn là trả về đúng shape { values: number[], labels: string[] }.
 */
async function fetchTraffic(branchId) {
  await new Promise((r) => setTimeout(r, 300)); // giả lập độ trễ network
  const values = MOCK_TRAFFIC[branchId] || MOCK_TRAFFIC.q1;
  const now = new Date();
  const labels = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now);
    d.setHours(d.getHours() - (4 - i));
    return d.getHours().toString().padStart(2, "0") + ":00";
  });
  return { values, labels };
}

function TrafficChart({ values, labels, loading, error }) {
  if (loading) {
    return <div className="h-chart h-chart--state">Đang tải dữ liệu...</div>;
  }
  if (error) {
    return <div className="h-chart h-chart--state h-chart--err">Không tải được dữ liệu. Vui lòng thử lại.</div>;
  }

  const max = Math.max(...values) || 1;
  return (
    <div className="h-chart">
      <div className="h-chart__bars">
        {values.map((val, i) => (
          <div className="h-chart__col" key={i}>
            <span className="h-chart__val">{val}</span>
            <div className="h-chart__wrap">
              <div className="h-chart__bar" style={{ height: `${(val / max) * 100}%`, background: i === values.length - 1 ? "var(--accent)" : "var(--steel-soft)" }} />
            </div>
            <span className="h-chart__lbl">{labels[i]}</span>
          </div>
        ))}
      </div>
      <p className="h-chart__note">Số người đang tập · 5 khung giờ gần nhất</p>
    </div>
  );
}

export default function Home() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [activeBranch] = useState(BRANCHES[0]);

  const [traffic, setTraffic] = useState({ values: [], labels: [] });
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficError, setTrafficError] = useState(null);

  const loadTraffic = useCallback(async (branchId) => {
    setTrafficLoading(true);
    setTrafficError(null);
    try {
      const data = await fetchTraffic(branchId);
      setTraffic(data);
    } catch (err) {
      setTrafficError(err);
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTraffic(activeBranch.id);
  }, [activeBranch.id, loadTraffic]);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-page">
      <Header />
      <main>

        {/* ── HERO ── */}
        <section className="h-hero">
          {HERO_IMAGES.map((src, i) => (
            <div key={i} className="h-hero__bg"
              style={{ backgroundImage: `url(${src})`, opacity: i === heroIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
          ))}
          <div className="h-hero__overlay" />
          <div className="h-hero__inner">
            <p className="h-eyebrow">Không gói PT bắt buộc &middot; Tập theo cách của bạn</p>
            <h1 className="h-hero__title">Tự tập.<br /><span className="h-red">Tự do.</span><br />Tự vượt giới hạn.</h1>
            <p className="h-hero__desc">Không ép lớp, không ép PT — chỉ có bạn, mục tiêu của bạn, và không gian tập đủ chuẩn để bứt phá.</p>
            <a href="/goi-tap" className="h-btn h-btn--primary">Xem gói tập</a>
            <div className="h-hero__dots">
              {HERO_IMAGES.map((_, i) => (
                <button key={i} className={`h-dot${i === heroIdx ? " h-dot--on" : ""}`} onClick={() => setHeroIdx(i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="h-stats">
          {[{ n: "24/7", l: "Giờ hoạt động" }, { n: "4", l: "Chi nhánh" }, { n: "200+", l: "Máy tập" }, { n: "0", l: "Lớp bắt buộc" }].map((s, i) => (
            <div className="h-stats__item" key={i}>
              <span className="h-stats__num">{s.n}</span>
              <span className="h-stats__lbl">{s.l}</span>
            </div>
          ))}
        </section>

        {/* ── TRAFFIC (đã chuyển lên trên Gói tập) ── */}
        <section className="h-traffic">
          <div className="h-inner" style={{ maxWidth: 900 }}>
            <div className="h-traffic__hd">
              <div>
                <h2 className="h-title">Lượng người tập theo giờ</h2>
                <p className="h-sub">Dữ liệu thực tế — cập nhật mỗi 15 phút</p>
              </div>
              <div className="h-live"><span className="h-pulse" />Live</div>
            </div>
            <TrafficChart
              values={traffic.values}
              labels={traffic.labels}
              loading={trafficLoading}
              error={trafficError}
            />
          </div>
        </section>

        {/* ── PACKAGES ── */}
        <section className="h-plans">
          <div className="h-inner">
            <div className="h-head">
              <h2 className="h-title">Gói tập</h2>
              <p className="h-sub">Chọn gói phù hợp — không phụ phí ẩn, không ràng buộc dài hạn.</p>
            </div>
            <div className="h-plans__grid">
              {MOCK_PACKAGES.map(p => (
                <div className={`h-plan${p.highlighted ? " h-plan--hi" : ""}`} key={p.id}>
                  {p.highlighted && <span className="h-plan__badge">Phổ biến nhất</span>}
                  <h3 className="h-plan__name">{p.name}</h3>
                  <div className="h-plan__price">
                    <span className="h-plan__amt">{fmt(p.price)}</span>
                    <span className="h-plan__per">{p.period}</span>
                  </div>
                  <p className="h-plan__desc">{p.desc}</p>
                  <ul className="h-plan__list">
                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <a href={p.href} className={`h-btn ${p.highlighted ? "h-btn--primary" : "h-btn--ghost"} h-plan__cta`}>Chọn gói này</a>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <a href="/goi-tap" className="h-btn h-btn--ghost">Xem tất cả gói tập →</a>
            </div>
          </div>
        </section>

        {/* ── GALLERY ── */}
        <section className="h-gallery">
          <div className="h-inner">
            <div className="h-gallery__hd">
              <h2 className="h-title">Không gian tập luyện</h2>
              <a href="/chi-nhanh" className="h-arrow">Xem tất cả chi nhánh →</a>
            </div>
            <div className="h-gallery__grid">
              {GALLERY_IMAGES.map((img, i) => (
                <div className={`h-gallery__item${i === 0 ? " h-gallery__item--wide" : ""}`} key={i}>
                  <img src={img.src} alt={img.label} loading="lazy" />
                  <div className="h-gallery__cap">{img.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EQUIPMENT ── */}
        <section className="h-equip">
          <div className="h-inner">
            <div className="h-equip__hd">
              <div>
                <h2 className="h-title">Danh mục máy tập</h2>
                <p className="h-sub">Nhập khẩu Mỹ &amp; Châu Âu — bảo trì hàng tuần.</p>
              </div>
              <a href="/may-tap" className="h-btn h-btn--ghost" style={{ whiteSpace: "nowrap" }}>Xem toàn bộ →</a>
            </div>
            <div className="h-equip__grid">
              {EQUIPMENT_CATEGORIES.map((eq, i) => (
                <a href={eq.href} className="h-eq" key={i}>
                  <span className="h-eq__icon">{eq.icon}</span>
                  <strong className="h-eq__name">{eq.name}</strong>
                  <p className="h-eq__desc">{eq.desc}</p>
                  <span className="h-eq__arr">→</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="h-feat">
          <div className="h-inner">
            <h2 className="h-title" style={{ textAlign: "center", marginBottom: 8 }}>Tại sao chọn VTGym?</h2>
            <p className="h-sub" style={{ textAlign: "center", marginBottom: 40 }}>Không điều khoản ẩn. Không ràng buộc. Chỉ có tập luyện.</p>
            <div className="h-feat__grid">
              {[
                { icon: "⚡", title: "Tự do, không ràng buộc", desc: "Bạn chọn giờ, chọn bài, chọn tốc độ. Không lớp cố định, không lịch ép buộc — 24/7 không giới hạn." },
                { icon: "🤝", title: "PT ngoài được chào đón", desc: "Mang PT riêng vào tập? Hoàn toàn được — PT của bạn vào cùng quyền lợi như hội viên thông thường." },
                { icon: "📊", title: "Theo dõi tiến độ", desc: "Check-in một chạm. Thống kê số buổi, calo ước tính, xu hướng tiến bộ hàng tuần." },
                { icon: "🏋️", title: "Thiết bị nhập khẩu", desc: "Máy tập từ Mỹ & Châu Âu, bảo trì định kỳ. Khu tạ, cardio, functional đều đủ chỗ." },
                { icon: "❄️", title: "Môi trường đỉnh", desc: "Máy lạnh toàn khu, wifi 500 Mbps, phòng tắm sạch, tủ khóa cá nhân — một giá, tất cả." },
                { icon: "📍", title: "1 thẻ — 4 chi nhánh", desc: "Thẻ hội viên dùng được ở Quận 1, Quận 7, Bình Thạnh và Thủ Đức. Đến đâu tập đó." },
              ].map((c, i) => (
                <div className="h-card" key={i}>
                  <div className="h-card__icon">{c.icon}</div>
                  <h3 className="h-card__title">{c.title}</h3>
                  <p className="h-card__desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BRANCHES STRIP ── */}
        <section className="h-bstrip">
          <div className="h-inner">
            <div className="h-bstrip__box">
              <h2 className="h-title">4 chi nhánh trải khắp TP.HCM</h2>
              <p className="h-sub">Một thẻ hội viên — tập được ở tất cả cơ sở, không phụ phí đổi chi nhánh.</p>
              <div className="h-bstrip__pills">
                {BRANCHES.map(b => (
                  <a href={b.href} key={b.id} className="h-pill">
                    <span className="h-pill__dot" />
                    <span>{b.name}</span>
                    <span className="h-pill__arr">→</span>
                  </a>
                ))}
              </div>
              <a href="/chi-nhanh" className="h-btn h-btn--primary" style={{ alignSelf: "flex-start" }}>Xem tất cả chi nhánh</a>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        /* ── page shell ── */
        .h-page { background:var(--bg); color:var(--text); min-height:100vh; }

        /* shared utils */
        .h-inner    { max-width:1280px; margin:0 auto; }
        .h-title    { font-family:var(--font-display); font-size:28px; font-weight:800; text-transform:uppercase; letter-spacing:.3px; }
        .h-sub      { font-size:14px; color:var(--text-dim); margin-top:6px; }
        .h-red      { color:var(--accent); }
        .h-arrow    { font-size:13px; font-weight:600; color:var(--steel); transition:color .15s; }
        .h-arrow:hover { color:var(--text); }
        .h-btn      { display:inline-block; padding:13px 26px; border-radius:9px; font-size:14px; font-weight:600; font-family:var(--font-body); transition:transform .15s, box-shadow .15s; }
        .h-btn--primary { background:var(--accent); color:#fff; box-shadow:0 4px 20px rgba(255,79,43,.3); }
        .h-btn--primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(255,79,43,.45); }
        .h-btn--ghost   { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); color:var(--text); }
        .h-btn--ghost:hover { transform:translateY(-2px); border-color:var(--steel); color:var(--steel); }
        .h-head     { margin-bottom:28px; text-align:center; }
        .h-head .h-sub { max-width:480px; margin:8px auto 0; }

        /* hero */
        .h-hero     { position:relative; min-height:90vh; display:flex; align-items:center; overflow:hidden; }
        .h-hero__bg { position:absolute; inset:0; background-size:cover; background-position:center; }
        .h-hero__overlay { position:absolute; inset:0; background:linear-gradient(105deg,rgba(8,9,11,.92) 40%,rgba(8,9,11,.5) 100%); }
        .h-hero__inner { position:relative; max-width:660px; padding:110px 32px 90px 7vw; }
        .h-eyebrow  { display:inline-block; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--accent); background:var(--accent-soft); border:1px solid rgba(255,79,43,.25); padding:5px 14px; border-radius:100px; margin-bottom:22px; }
        .h-hero__title { font-family:var(--font-display); font-size:clamp(52px,8vw,96px); font-weight:800; line-height:.98; letter-spacing:-1px; margin:0 0 24px; text-transform:uppercase; }
        .h-hero__desc  { font-size:16px; line-height:1.7; color:var(--text-dim); max-width:480px; margin:0 0 36px; }
        .h-hero__dots  { display:flex; gap:8px; margin-top:36px; }
        .h-dot      { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.2); border:none; cursor:pointer; transition:background .2s,transform .2s; }
        .h-dot--on  { background:var(--accent); transform:scale(1.4); }

        /* stats */
        .h-stats    { display:grid; grid-template-columns:repeat(4,1fr); background:var(--bg-soft); border-bottom:1px solid var(--line); }
        .h-stats__item { display:flex; flex-direction:column; align-items:center; gap:4px; padding:22px 10px; border-right:1px solid var(--line); }
        .h-stats__item:last-child { border-right:none; }
        .h-stats__num { font-family:var(--font-display); font-size:32px; font-weight:800; color:var(--accent); }
        .h-stats__lbl { font-size:12px; color:var(--text-dim); text-align:center; }

        /* plans */
        .h-plans    { padding:42px 32px 0; }
        .h-plans__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .h-plan     { position:relative; display:flex; flex-direction:column; gap:14px; background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:30px 24px 26px; transition:transform .2s,border-color .2s; }
        .h-plan:hover { transform:translateY(-4px); border-color:var(--steel); }
        .h-plan--hi { border-color:var(--accent); background:linear-gradient(180deg,var(--accent-soft) 0%,var(--bg-soft) 65%); }
        .h-plan--hi:hover { border-color:var(--accent); }
        .h-plan__badge { position:absolute; top:-12px; left:24px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; padding:4px 12px; border-radius:100px; }
        .h-plan__name  { font-family:var(--font-display); font-size:22px; font-weight:800; text-transform:uppercase; }
        .h-plan__price { display:flex; align-items:baseline; gap:6px; }
        .h-plan__amt   { font-size:26px; font-weight:800; }
        .h-plan__per   { font-size:13px; color:var(--text-dim); }
        .h-plan__desc  { font-size:13.5px; color:var(--text-dim); line-height:1.6; }
        .h-plan__list  { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; flex:1; }
        .h-plan__list li { font-size:13px; padding-left:20px; position:relative; }
        .h-plan__list li::before { content:"✓"; position:absolute; left:0; color:var(--steel); font-weight:700; }
        .h-plan__cta   { width:100%; text-align:center; }

        /* gallery */
        .h-gallery  { padding:72px 32px; }
        .h-gallery__hd { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:24px; }
        .h-gallery__grid { display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:240px 240px; gap:10px; }
        .h-gallery__item { position:relative; overflow:hidden; border-radius:var(--radius); background:var(--bg-elevated); }
        .h-gallery__item--wide { grid-column:1/3; grid-row:1/3; }
        .h-gallery__item img { width:100%; height:100%; object-fit:cover; transition:transform .5s ease; display:block; }
        .h-gallery__item:hover img { transform:scale(1.04); }
        .h-gallery__cap { position:absolute; bottom:0; left:0; right:0; padding:10px 14px; background:linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%); font-size:13px; font-weight:600; color:#fff; }

        /* equipment */
        .h-equip    { padding:0 32px 72px; }
        .h-equip__hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
        .h-equip__grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .h-eq       { display:flex; flex-direction:column; gap:8px; padding:22px 20px; border-radius:var(--radius); background:var(--bg-soft); border:1px solid var(--line); transition:border-color .2s,transform .2s; position:relative; }
        .h-eq:hover { border-color:var(--steel); transform:translateY(-3px); }
        .h-eq__icon { font-size:26px; }
        .h-eq__name { font-size:15px; font-weight:700; }
        .h-eq__desc { font-size:12.5px; color:var(--text-dim); line-height:1.5; flex:1; }
        .h-eq__arr  { position:absolute; top:20px; right:18px; color:var(--text-dim); font-size:16px; transition:color .2s,transform .2s; }
        .h-eq:hover .h-eq__arr { color:var(--steel); transform:translateX(3px); }

        /* traffic */
        .h-traffic  { padding:64px 32px 0px; }
        .h-traffic__hd { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; gap:16px; flex-wrap:wrap; }
        .h-live     { display:flex; align-items:center; gap:7px; padding:6px 14px; border-radius:100px; background:rgba(91,184,204,.1); border:1px solid rgba(91,184,204,.2); color:var(--steel); font-size:12px; font-weight:700; flex-shrink:0; }
        .h-pulse    { width:7px; height:7px; border-radius:50%; background:var(--steel); animation:h-pulse 1.6s ease infinite; }
        @keyframes h-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.65)} }
        .h-chart    { background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:24px 28px 16px; }
        .h-chart--state { display:flex; align-items:center; justify-content:center; height:140px; font-size:13px; color:var(--text-dim); }
        .h-chart--err  { color:var(--accent); }
        .h-chart__bars { display:flex; align-items:flex-end; gap:14px; height:140px; }
        .h-chart__col  { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; }
        .h-chart__val  { font-size:12px; font-weight:700; }
        .h-chart__wrap { flex:1; width:100%; display:flex; align-items:flex-end; background:var(--bg-elevated); border-radius:6px; overflow:hidden; }
        .h-chart__bar  { width:100%; border-radius:6px 6px 0 0; transition:height .6s cubic-bezier(.34,1.56,.64,1); min-height:4px; }
        .h-chart__lbl  { font-size:11px; color:var(--text-dim); white-space:nowrap; }
        .h-chart__note { font-size:12px; color:var(--text-dim); margin-top:12px; text-align:right; }

        /* features */
        .h-feat     { padding:0 32px 72px; }
        .h-feat__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .h-card     { background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:24px 22px; transition:transform .2s,border-color .2s; }
        .h-card:hover { transform:translateY(-4px); border-color:rgba(255,79,43,.3); }
        .h-card__icon  { font-size:22px; margin-bottom:12px; }
        .h-card__title { font-size:15px; font-weight:700; margin-bottom:9px; }
        .h-card__desc  { font-size:13.5px; line-height:1.65; color:var(--text-dim); }

        /* branches strip */
        .h-bstrip   { padding:0 32px 80px; }
        .h-bstrip__box { background:var(--bg-soft); border:1px solid var(--line); border-radius:16px; padding:36px 40px; display:flex; flex-direction:column; gap:20px; }
        .h-bstrip__pills { display:flex; flex-wrap:wrap; gap:10px; }
        .h-pill     { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border-radius:9px; background:var(--bg-elevated); border:1px solid var(--line); font-size:13.5px; font-weight:500; color:var(--text-dim); transition:border-color .2s,color .2s; }
        .h-pill:hover { border-color:var(--steel); color:var(--text); }
        .h-pill__dot { width:8px; height:8px; border-radius:50%; background:var(--steel); flex-shrink:0; }
        .h-pill__arr { color:var(--text-dim); margin-left:4px; font-size:14px; }

        /* responsive */
        @media (max-width:1024px) {
          .h-equip__grid  { grid-template-columns:repeat(2,1fr); }
          .h-plans__grid  { grid-template-columns:1fr 1fr; }
          .h-plan--hi     { grid-column:1/3; }
        }
        @media (max-width:900px) {
          .h-feat__grid   { grid-template-columns:1fr 1fr; }
          .h-gallery__grid{ grid-template-columns:1fr 1fr; grid-template-rows:200px 200px 200px; }
          .h-gallery__item--wide { grid-column:1/3; grid-row:1/2; }
        }
        @media (max-width:700px) {
          .h-stats        { grid-template-columns:repeat(2,1fr); }
          .h-stats__item:nth-child(2) { border-right:none; }
          .h-stats__item:nth-child(1),.h-stats__item:nth-child(2) { border-bottom:1px solid var(--line); }
          .h-hero__inner  { padding:80px 20px 60px; }
          .h-gallery,.h-plans,.h-equip,.h-traffic,.h-feat,.h-bstrip { padding-left:18px; padding-right:18px; }
          .h-plans__grid  { grid-template-columns:1fr; }
          .h-plan--hi     { grid-column:auto; }
          .h-equip__grid  { grid-template-columns:1fr 1fr; }
          .h-feat__grid   { grid-template-columns:1fr; }
          .h-gallery__grid{ grid-template-columns:1fr; grid-template-rows:auto; }
          .h-gallery__item{ height:200px; }
          .h-gallery__item--wide { grid-column:auto; grid-row:auto; }
          .h-bstrip__box  { padding:24px 22px; }
          .h-chart__bars  { gap:8px; }
        }
      `}</style>
    </div>
  );
}