import { ChevronDown, Dumbbell, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import Footer from "../../component/Footer";
import Header from "../../component/Header";

const CHI_NHANH = [
  { id: "all", ten: "Tất cả chi nhánh" },
  { id: "q1", ten: "Quận 1" },
  { id: "q7", ten: "Quận 7" },
  { id: "binh-thanh", ten: "Bình Thạnh" },
  { id: "thu-duc", ten: "Thủ Đức" },
];
const NHOM_MAY = [
  { id: "all", ten: "Tất cả nhóm" },
  { id: "suc-manh", ten: "Sức mạnh" },
  { id: "cardio", ten: "Cardio" },
  { id: "ta-tu-do", ten: "Tạ tự do" },
  { id: "may-day", ten: "Máy dây cáp" },
];
const DANH_SACH_MAY = [
  { id: 1, ten: "Smith Machine", nhom: "suc-manh", chiNhanh: ["q1", "binh-thanh"], soLuong: 2, trangThai: "Hoạt động", moTa: "Khung tạ cố định theo đường trượt thẳng, phù hợp tập squat, bench press an toàn.", anh: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop" },
  { id: 2, ten: "Máy chạy bộ Life Fitness", nhom: "cardio", chiNhanh: ["q1", "q7", "thu-duc"], soLuong: 6, trangThai: "Hoạt động", moTa: "Băng tải giảm chấn, màn hình cảm ứng theo dõi nhịp tim và quãng đường.", anh: "https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=900&auto=format&fit=crop" },
  { id: 3, ten: "Cáp ròng rọc đa năng", nhom: "may-day", chiNhanh: ["q1", "binh-thanh", "thu-duc"], soLuong: 3, trangThai: "Hoạt động", moTa: "Hệ thống cáp hai bên, hỗ trợ hơn 50 bài tập từ ngực, lưng đến tay.", anh: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=900&auto=format&fit=crop" },
  { id: 4, ten: "Bộ tạ đơn 2.5–50kg", nhom: "ta-tu-do", chiNhanh: ["q1", "q7", "binh-thanh", "thu-duc"], soLuong: 1, trangThai: "Hoạt động", moTa: "Bộ tạ đơn lục giác đầy đủ trọng lượng, kèm giá đỡ sắp xếp theo thứ tự.", anh: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?q=80&w=900&auto=format&fit=crop" },
  { id: 5, ten: "Xe đạp Assault Bike", nhom: "cardio", chiNhanh: ["q7", "thu-duc"], soLuong: 4, trangThai: "Bảo trì", moTa: "Cường độ tăng theo lực đạp, lý tưởng cho bài tập HIIT ngắn và mạnh.", anh: "https://images.unsplash.com/photo-1591291621164-2c6367723315?q=80&w=900&auto=format&fit=crop" },
  { id: 6, ten: "Ghế đẩy ngực Hammer", nhom: "suc-manh", chiNhanh: ["q1", "q7"], soLuong: 2, trangThai: "Hoạt động", moTa: "Cơ chế bản lề mô phỏng chuyển động tự nhiên, tải trọng độc lập hai bên.", anh: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=900&auto=format&fit=crop" },
  { id: 7, ten: "Thanh xà đa năng", nhom: "ta-tu-do", chiNhanh: ["q1", "binh-thanh", "thu-duc"], soLuong: 3, trangThai: "Hoạt động", moTa: "Khung kéo xà, đẩy tay sau, treo bụng — một trạm nhiều bài tập.", anh: "https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?q=80&w=900&auto=format&fit=crop" },
  { id: 8, ten: "Máy chèo thuyền Concept2", nhom: "cardio", chiNhanh: ["q1", "thu-duc"], soLuong: 3, trangThai: "Hoạt động", moTa: "Bài tập toàn thân ít chấn động, đo công suất theo thời gian thực.", anh: "https://images.unsplash.com/photo-1620188467120-5042ed1eb5da?q=80&w=900&auto=format&fit=crop" },
];

const tenCN = (id) => CHI_NHANH.find(c => c.id === id)?.ten ?? id;
const tenNhom = (id) => NHOM_MAY.find(n => n.id === id)?.ten ?? id;

export default function MayTapPage() {
  const [chiNhanh, setChiNhanh] = useState("all");
  const [nhom, setNhom] = useState("all");
  const [tuKhoa, setTuKhoa] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const ketQua = useMemo(() => DANH_SACH_MAY.filter(m =>
    (chiNhanh === "all" || m.chiNhanh.includes(chiNhanh)) &&
    (nhom === "all" || m.nhom === nhom) &&
    (tuKhoa.trim() === "" || m.ten.toLowerCase().includes(tuKhoa.trim().toLowerCase()))
  ), [chiNhanh, nhom, tuKhoa]);

  const reset = () => { setChiNhanh("all"); setNhom("all"); setTuKhoa(""); };

  return (
    <div className="mtp-page">
      <Header />

      <main className="mtp-main">
        {/* page header */}
        <div className="mtp-ph">
          <div className="mtp-ph__inner">
            <div className="mtp-eyebrow"><Dumbbell size={11} />Thiết bị theo chi nhánh</div>
            <h1 className="mtp-title">Máy tập</h1>
            <p className="mtp-sub">Lọc theo chi nhánh để xem đúng thiết bị đang có tại phòng của bạn.</p>
          </div>
        </div>

        <div className="mtp-content">
          {/* toolbar */}
          <div className="mtp-toolbar">
            <div className="mtp-sw">
              <span className="mtp-si"><Search size={14} /></span>
              <input className="mtp-sinput" placeholder="Tìm theo tên máy…" value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} />
            </div>
            <button className="mtp-fbtn" onClick={() => setDrawerOpen(true)}><SlidersHorizontal size={14} />Lọc</button>
            <Sel icon={<MapPin size={13} />} value={chiNhanh} onChange={setChiNhanh} options={CHI_NHANH} />
            <Sel icon={<Dumbbell size={13} />} value={nhom} onChange={setNhom} options={NHOM_MAY} />
          </div>

          {/* chips */}
          <div className="mtp-chips">
            {CHI_NHANH.map(c => (
              <button key={c.id} onClick={() => setChiNhanh(c.id)}
                className={`mtp-chip${chiNhanh === c.id ? " mtp-chip--on" : ""}`}>
                {c.ten}
              </button>
            ))}
          </div>

          <p className="mtp-summary">
            <strong>{ketQua.length}</strong> máy
            {chiNhanh !== "all" && <> tại <strong>{tenCN(chiNhanh)}</strong></>}
            {nhom !== "all" && <> · <strong>{tenNhom(nhom)}</strong></>}
          </p>

          {ketQua.length === 0
            ? <Empty onReset={reset} />
            : <div className="mtp-list">{ketQua.map(m => <Card key={m.id} may={m} />)}</div>
          }
        </div>
      </main>

      <Footer />

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="mtp-overlay">
          <div className="mtp-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="mtp-drawer">
            <div className="mtp-drawer__hd">
              <p className="mtp-drawer__ttl">Lọc thiết bị</p>
              <button className="mtp-drawer__cls" onClick={() => setDrawerOpen(false)}><X size={16} /></button>
            </div>
            <p className="mtp-drawer__lbl">Chi nhánh</p>
            <div className="mtp-dchips">
              {CHI_NHANH.map(c => (
                <button key={c.id} onClick={() => setChiNhanh(c.id)}
                  className={`mtp-dchip${chiNhanh === c.id ? " mtp-dchip--on" : ""}`}>{c.ten}</button>
              ))}
            </div>
            <p className="mtp-drawer__lbl">Nhóm máy</p>
            <div className="mtp-dchips">
              {NHOM_MAY.map(n => (
                <button key={n.id} onClick={() => setNhom(n.id)}
                  className={`mtp-dchip${nhom === n.id ? " mtp-dchip--on" : ""}`}>{n.ten}</button>
              ))}
            </div>
            <button className="mtp-drawer__apply" onClick={() => setDrawerOpen(false)}>Xem {ketQua.length} kết quả</button>
          </div>
        </div>
      )}

      <style>{`
        .mtp-page  { display:flex; flex-direction:column; min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-body); }
        .mtp-main  { flex:1; }

        /* page header */
        .mtp-ph        { border-bottom:1px solid var(--line); padding:36px 20px 28px; }
        .mtp-ph__inner { max-width:860px; margin:0 auto; }
        .mtp-eyebrow   { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,79,43,.28); background:var(--accent-soft); color:var(--accent); padding:4px 13px; border-radius:999px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; margin-bottom:14px; }
        .mtp-title     { font-family:var(--font-display); font-size:clamp(24px,5vw,34px); font-weight:900; letter-spacing:-.025em; line-height:1.1; margin:0 0 8px; text-transform:uppercase; }
        .mtp-sub       { font-size:14px; line-height:1.65; color:var(--text-dim); max-width:460px; margin:0; }

        /* content */
        .mtp-content { max-width:860px; margin:0 auto; padding:24px 20px 64px; }

        /* toolbar */
        .mtp-toolbar { display:flex; gap:8px; align-items:stretch; margin-bottom:12px; }
        .mtp-sw      { position:relative; flex:1; min-width:0; }
        .mtp-si      { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-dim); pointer-events:none; display:flex; }
        .mtp-sinput  { width:100%; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 14px 10px 36px; font-size:14px; color:var(--text); outline:none; font-family:var(--font-body); transition:border-color .15s; }
        .mtp-sinput::placeholder { color:var(--text-dim); }
        .mtp-sinput:focus { border-color:rgba(255,79,43,.5); }
        .mtp-fbtn    { display:none; align-items:center; justify-content:center; gap:6px; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 14px; font-size:13px; font-weight:500; color:var(--text); cursor:pointer; flex-shrink:0; font-family:var(--font-body); }

        /* select */
        .mtp-sel-w   { position:relative; flex-shrink:0; }
        .mtp-sel-il  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--text-dim); pointer-events:none; display:flex; }
        .mtp-sel-ir  { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--text-dim); pointer-events:none; display:flex; }
        .mtp-sel     { appearance:none; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 30px 10px 32px; font-size:13px; color:var(--text); outline:none; cursor:pointer; font-family:var(--font-body); transition:border-color .15s; }
        .mtp-sel:hover { border-color:rgba(255,255,255,.2); }
        .mtp-sel:focus { border-color:rgba(255,79,43,.5); }
        .mtp-sel option { background:var(--bg-soft); color:var(--text); }

        /* chips */
        .mtp-chips  { display:flex; gap:7px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; margin-bottom:18px; }
        .mtp-chips::-webkit-scrollbar { display:none; }
        .mtp-chip   { flex-shrink:0; border:1px solid var(--line); background:var(--bg-soft); color:var(--text-dim); padding:6px 15px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; font-family:var(--font-body); }
        .mtp-chip:hover  { border-color:rgba(255,255,255,.24); color:var(--text); }
        .mtp-chip--on    { border-color:var(--accent); background:var(--accent); color:#000; }

        .mtp-summary { font-size:12.5px; color:var(--text-dim); margin-bottom:12px; }
        .mtp-summary strong { color:rgba(255,255,255,.6); font-weight:600; }

        /* list */
        .mtp-list   { display:flex; flex-direction:column; gap:10px; }

        /* card */
        .mtp-card   { display:grid; grid-template-columns:96px 1fr; border:1px solid var(--line); background:var(--bg-soft); border-radius:16px; overflow:hidden; transition:border-color .2s,background .2s; }
        .mtp-card:hover { border-color:rgba(255,255,255,.15); background:var(--bg-elevated); }
        .mtp-thumb  { position:relative; background:var(--bg-elevated); }
        .mtp-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .4s ease; }
        .mtp-card:hover .mtp-thumb img { transform:scale(1.06); }
        .mtp-dot    { position:absolute; right:7px; bottom:7px; width:10px; height:10px; border-radius:50%; border:2px solid var(--bg-soft); }
        .mtp-dot--on  { background:#10b981; }
        .mtp-dot--off { background:#eab308; }
        .mtp-body   { padding:14px 16px; display:flex; flex-direction:column; gap:5px; min-width:0; }
        .mtp-row    { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
        .mtp-name   { font-size:15px; font-weight:700; line-height:1.3; }
        .mtp-meta   { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .mtp-qty    { background:var(--bg-elevated); color:var(--text-dim); border-radius:6px; padding:2px 8px; font-size:11px; font-weight:700; }
        .mtp-status { font-size:11px; font-weight:700; }
        .mtp-status--on  { color:#10b981; }
        .mtp-status--off { color:#eab308; }
        .mtp-desc   { font-size:13px; line-height:1.55; color:var(--text-dim); }
        .mtp-tags   { display:flex; flex-wrap:wrap; gap:5px; margin-top:2px; }
        .mtp-tag    { display:inline-flex; align-items:center; gap:4px; border:1px solid var(--line); background:var(--bg); color:var(--text-dim); padding:2px 9px; border-radius:999px; font-size:11px; }
        .mtp-tag--g { border-color:rgba(255,79,43,.25); background:var(--accent-soft); color:var(--accent); }

        /* empty */
        .mtp-empty  { display:flex; flex-direction:column; align-items:center; border:1px solid var(--line); background:var(--bg-soft); border-radius:16px; padding:72px 20px; text-align:center; }
        .mtp-empty__ico { color:var(--text-dim); margin-bottom:14px; }
        .mtp-empty__ttl { font-size:15px; font-weight:700; color:var(--text-dim); margin-bottom:6px; }
        .mtp-empty__sub { font-size:13px; color:var(--text-dim); margin-bottom:20px; }
        .mtp-empty__btn { border:none; background:var(--accent); color:#000; padding:10px 22px; border-radius:11px; font-size:13px; font-weight:700; cursor:pointer; font-family:var(--font-body); }

        /* drawer */
        .mtp-overlay  { position:fixed; inset:0; z-index:200; display:flex; align-items:flex-end; }
        .mtp-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.7); }
        .mtp-drawer   { position:relative; width:100%; background:var(--bg-soft); border-radius:20px 20px 0 0; border-top:1px solid var(--line); padding:20px 20px 36px; }
        .mtp-drawer__hd  { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .mtp-drawer__ttl { font-size:15px; font-weight:700; }
        .mtp-drawer__cls { border:none; background:var(--bg-elevated); color:var(--text-dim); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .mtp-drawer__lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-dim); margin-bottom:10px; }
        .mtp-dchips      { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:22px; }
        .mtp-dchip       { border:1px solid var(--line); background:var(--bg-soft); color:var(--text-dim); padding:7px 14px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; font-family:var(--font-body); }
        .mtp-dchip--on   { border-color:var(--accent); background:var(--accent); color:#000; }
        .mtp-drawer__apply { width:100%; border:none; background:var(--accent); color:#000; padding:13px; border-radius:11px; font-size:14px; font-weight:700; cursor:pointer; font-family:var(--font-body); }

        /* responsive */
        @media (max-width:600px) {
          .mtp-sel-w  { display:none; }
          .mtp-fbtn   { display:flex; }
          .mtp-card   { grid-template-columns:80px 1fr; }
          .mtp-desc,.mtp-tags,.mtp-status { display:none; }
          .mtp-body   { padding:12px; }
        }
      `}</style>
    </div>
  );
}

function Sel({ icon, value, onChange, options }) {
  return (
    <div className="mtp-sel-w">
      <span className="mtp-sel-il">{icon}</span>
      <select className="mtp-sel" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.id} value={o.id}>{o.ten}</option>)}
      </select>
      <span className="mtp-sel-ir"><ChevronDown size={12} /></span>
    </div>
  );
}

function Card({ may }) {
  const on = may.trangThai === "Hoạt động";
  return (
    <div className="mtp-card">
      <div className="mtp-thumb">
        <img src={may.anh} alt={may.ten} loading="lazy" />
        <span className={`mtp-dot mtp-dot--${on ? "on" : "off"}`} />
      </div>
      <div className="mtp-body">
        <div className="mtp-row">
          <p className="mtp-name">{may.ten}</p>
          <div className="mtp-meta">
            <span className={`mtp-status mtp-status--${on ? "on" : "off"}`}>{may.trangThai}</span>
            <span className="mtp-qty">×{may.soLuong}</span>
          </div>
        </div>
        <p className="mtp-desc">{may.moTa}</p>
        <div className="mtp-tags">
          <span className="mtp-tag mtp-tag--g">{tenNhom(may.nhom)}</span>
          {may.chiNhanh.map(id => <span key={id} className="mtp-tag"><MapPin size={9} />{tenCN(id)}</span>)}
        </div>
      </div>
    </div>
  );
}

function Empty({ onReset }) {
  return (
    <div className="mtp-empty">
      <Dumbbell size={28} className="mtp-empty__ico" />
      <p className="mtp-empty__ttl">Không tìm thấy máy phù hợp</p>
      <p className="mtp-empty__sub">Thử đổi chi nhánh, nhóm máy hoặc từ khóa.</p>
      <button className="mtp-empty__btn" onClick={onReset}>Xóa bộ lọc</button>
    </div>
  );
}