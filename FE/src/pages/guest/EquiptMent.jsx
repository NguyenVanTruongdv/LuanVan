import { ChevronDown, Dumbbell, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import equipmentApi from "../../api/memberApi"; // TODO: sửa lại đường dẫn import cho đúng project của bạn
import Footer from "../../component/Footer";
import Header from "../../component/Header";

const TAT_CA_CHI_NHANH = { id: "all", ten: "Tất cả chi nhánh" };
const TAT_CA_NHOM = { id: "all", ten: "Tất cả nhóm" };

// Một số project cấu hình interceptor cho axios tự bóc response.data trước rồi,
// nên hàm này chấp nhận cả 2 trường hợp: res là { data: [...] } hoặc res đã là mảng luôn.
const layMangTuResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const trangThaiHienThi = (status) => {
  if (status === "Active") return "Hoạt động";
  if (status === "Deleted") return "Đã xóa";
  return status;
};

// Tách "Máy chạy bộ (Treadmill)" -> { chinh: "Máy chạy bộ", phu: "Treadmill" }
// Nếu không có ngoặc thì phu rỗng.
const tachTenMay = (ten) => {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(ten || "");
  if (m) return { chinh: m[1].trim(), phu: m[2].trim() };
  return { chinh: (ten || "").trim(), phu: "" };
};

const soThuTu = (i) => String(i + 1).padStart(2, "0");

export default function MayTapPage() {
  const [chiNhanh, setChiNhanh] = useState("all");
  const [nhom, setNhom] = useState("all");
  const [tuKhoa, setTuKhoa] = useState("");
  const [tuKhoaDeBounce, setTuKhoaDeBounce] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [dsChiNhanh, setDsChiNhanh] = useState([TAT_CA_CHI_NHANH]);
  const [dsNhom, setDsNhom] = useState([TAT_CA_NHOM]);
  const [ketQua, setKetQua] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState(null);

  // Debounce ô tìm kiếm để tránh gọi API liên tục theo từng ký tự gõ
  useEffect(() => {
    const timer = setTimeout(() => setTuKhoaDeBounce(tuKhoa.trim()), 400);
    return () => clearTimeout(timer);
  }, [tuKhoa]);

  // Lấy danh mục thiết bị (nhóm máy) từ API riêng để đổ vào bộ lọc
  useEffect(() => {
    equipmentApi
      .getAllEquipmentCategory()
      .then((res) => {
        const data = layMangTuResponse(res);
        setDsNhom([
          TAT_CA_NHOM,
          ...data.map((c) => ({ id: String(c.categoryId), ten: c.categoryName })),
        ]);
      })
      .catch((err) => {
        console.error("Lỗi lấy danh mục thiết bị:", err);
      });
  }, []);

  // Lấy 1 lần danh sách chi nhánh thực tế đang có thiết bị, để đổ vào bộ lọc
  useEffect(() => {
    equipmentApi
      .getAll({})
      .then((res) => {
        const data = layMangTuResponse(res);

        const chiNhanhMap = new Map();
        data.forEach((item) => {
          if (!chiNhanhMap.has(item.branchId)) chiNhanhMap.set(String(item.branchId), item.branchName);
        });

        setDsChiNhanh([
          TAT_CA_CHI_NHANH,
          ...[...chiNhanhMap].map(([id, ten]) => ({ id, ten })),
        ]);
      })
      .catch((err) => {
        console.error("Lỗi lấy danh sách chi nhánh:", err);
      });
  }, []);

  // Gọi API lấy danh sách máy mỗi khi filter thay đổi
  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi(null);

    equipmentApi
      .getAll({
        name: tuKhoaDeBounce || undefined,
        branchId: chiNhanh !== "all" ? chiNhanh : undefined,
        categoryId: nhom !== "all" ? nhom : undefined,
      })
      .then((res) => {
        if (!huy) setKetQua(layMangTuResponse(res));
      })
      .catch((err) => {
        console.error("Lỗi lấy danh sách thiết bị:", err);
        if (!huy) setLoi("Không tải được danh sách thiết bị. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, [chiNhanh, nhom, tuKhoaDeBounce]);

  const reset = () => {
    setChiNhanh("all");
    setNhom("all");
    setTuKhoa("");
  };

  const tenCN = (id) => dsChiNhanh.find((c) => c.id === id)?.ten ?? id;
  const tenNhom = (id) => dsNhom.find((n) => n.id === id)?.ten ?? id;

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
            <Dropdown icon={<MapPin size={13} />} value={chiNhanh} onChange={setChiNhanh} options={dsChiNhanh} />
            <Dropdown icon={<Dumbbell size={13} />} value={nhom} onChange={setNhom} options={dsNhom} />
          </div>

          {/* chips */}
          <div className="mtp-chips">
            {dsChiNhanh.map(c => (
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

          {dangTai ? (
            <SkeletonGrid />
          ) : loi ? (
            <div className="mtp-empty">
              <p className="mtp-empty__ttl">{loi}</p>
              <button className="mtp-empty__btn" onClick={() => setTuKhoaDeBounce((v) => v)}>Thử lại</button>
            </div>
          ) : ketQua.length === 0 ? (
            <Empty onReset={reset} />
          ) : (
            <div className="mtp-panel">
              <div className="mtp-panel__hd">
                <span className="mtp-panel__bar" />
                <h2 className="mtp-panel__ttl">Thiết bị trong phòng gym</h2>
                <span className="mtp-panel__bar" />
              </div>
              <div className="mtp-grid">
                {ketQua.map((m, i) => <Card key={m.equipmentId} may={m} index={i} />)}
              </div>
            </div>
          )}
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
              {dsChiNhanh.map(c => (
                <button key={c.id} onClick={() => setChiNhanh(c.id)}
                  className={`mtp-dchip${chiNhanh === c.id ? " mtp-dchip--on" : ""}`}>{c.ten}</button>
              ))}
            </div>
            <p className="mtp-drawer__lbl">Nhóm máy</p>
            <div className="mtp-dchips">
              {dsNhom.map(n => (
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
        .mtp-ph__inner { max-width:1180px; margin:0 auto; }
        .mtp-eyebrow   { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,79,43,.28); background:var(--accent-soft); color:var(--accent); padding:4px 13px; border-radius:999px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; margin-bottom:14px; }
        .mtp-title     { font-family:var(--font-display); font-size:clamp(24px,5vw,34px); font-weight:900; letter-spacing:-.025em; line-height:1.1; margin:0 0 8px; text-transform:uppercase; }
        .mtp-sub       { font-size:14px; line-height:1.65; color:var(--text-dim); max-width:460px; margin:0; }

        /* content */
        .mtp-content { max-width:1180px; margin:0 auto; padding:24px 20px 64px; }

        /* toolbar */
        .mtp-toolbar { display:flex; gap:8px; align-items:stretch; margin-bottom:12px; }
        .mtp-sw      { position:relative; flex:1; min-width:0; }
        .mtp-si      { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-dim); pointer-events:none; display:flex; }
        .mtp-sinput  { width:100%; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 14px 10px 36px; font-size:14px; color:var(--text); outline:none; font-family:var(--font-body); transition:border-color .15s; }
        .mtp-sinput::placeholder { color:var(--text-dim); }
        .mtp-sinput:focus { border-color:rgba(255,79,43,.5); }
        .mtp-fbtn    { display:none; align-items:center; justify-content:center; gap:6px; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 14px; font-size:13px; font-weight:500; color:var(--text); cursor:pointer; flex-shrink:0; font-family:var(--font-body); }

        /* dropdown filter (chi nhánh / nhóm máy) */
        .mtp-dd        { position:relative; flex-shrink:0; }
        .mtp-dd__btn   { display:flex; align-items:center; gap:8px; border:1px solid var(--line); background:var(--bg-soft); border-radius:11px; padding:10px 14px; font-size:13px; color:var(--text); cursor:pointer; font-family:var(--font-body); white-space:nowrap; transition:border-color .15s,background .15s; }
        .mtp-dd__btn:hover  { border-color:rgba(255,255,255,.22); background:var(--bg-elevated); }
        .mtp-dd__ic    { display:flex; color:var(--text-dim); }
        .mtp-dd__lbl   { max-width:150px; overflow:hidden; text-overflow:ellipsis; }
        .mtp-dd__chev  { color:var(--text-dim); transition:transform .18s; flex-shrink:0; }
        .mtp-dd__chev--up { transform:rotate(180deg); }
        .mtp-dd__panel { position:absolute; top:calc(100% + 6px); left:0; min-width:190px; max-height:280px; overflow-y:auto; background:var(--bg-elevated); border:1px solid var(--line); border-radius:12px; padding:6px; box-shadow:0 16px 40px rgba(0,0,0,.5); z-index:60; list-style:none; margin:0; }
        .mtp-dd__panel::-webkit-scrollbar { width:6px; }
        .mtp-dd__panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:999px; }
        .mtp-dd__item  { display:block; width:100%; text-align:left; border:none; background:transparent; color:var(--text); padding:9px 12px; border-radius:8px; font-size:13px; cursor:pointer; font-family:var(--font-body); transition:background .12s; }
        .mtp-dd__item:hover  { background:rgba(255,255,255,.06); }
        .mtp-dd__item--on    { background:var(--accent-soft); color:var(--accent); font-weight:700; }

        /* chips */
        .mtp-chips  { display:flex; gap:7px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; margin-bottom:18px; }
        .mtp-chips::-webkit-scrollbar { display:none; }
        .mtp-chip   { flex-shrink:0; border:1px solid var(--line); background:var(--bg-soft); color:var(--text-dim); padding:6px 15px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; font-family:var(--font-body); }
        .mtp-chip:hover  { border-color:rgba(255,255,255,.24); color:var(--text); }
        .mtp-chip--on    { border-color:var(--accent); background:var(--accent); color:#000; }

        .mtp-summary { font-size:12.5px; color:var(--text-dim); margin-bottom:12px; }
        .mtp-summary strong { color:rgba(255,255,255,.6); font-weight:600; }

        /* skeleton loading */
        .mtp-skeleton-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .mtp-skel     { border:1px solid var(--line); background:var(--bg-soft); border-radius:14px; overflow:hidden; }
        .mtp-skel__img{ aspect-ratio:4/3; background:linear-gradient(100deg,var(--bg-elevated) 30%,rgba(255,255,255,.06) 50%,var(--bg-elevated) 70%); background-size:200% 100%; animation:mtp-shimmer 1.3s infinite; }
        .mtp-skel__ln { height:11px; margin:12px 12px 8px; border-radius:4px; background:var(--bg-elevated); }
        .mtp-skel__ln--sm { width:55%; margin-bottom:12px; }
        @keyframes mtp-shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

        /* panel wrapping the whole equipment grid, styled like the reference board */
        .mtp-panel     { border:1px solid var(--line); background:var(--bg-soft); border-radius:20px; padding:26px 22px 30px; }
        .mtp-panel__hd { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:22px; }
        .mtp-panel__bar{ flex:1; max-width:60px; height:2px; background:linear-gradient(90deg,transparent,var(--accent)); }
        .mtp-panel__hd .mtp-panel__bar:last-child { background:linear-gradient(90deg,var(--accent),transparent); }
        .mtp-panel__ttl{ font-family:var(--font-display); font-size:clamp(16px,2.6vw,21px); font-weight:900; letter-spacing:.04em; text-transform:uppercase; margin:0; white-space:nowrap; }

        /* grid of equipment cards */
        .mtp-grid   { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }

        /* card */
        .mtp-card   { border:1px solid var(--line); background:var(--bg-elevated); border-radius:14px; overflow:hidden; transition:border-color .2s,transform .2s; }
        .mtp-card:hover { border-color:rgba(255,255,255,.2); transform:translateY(-2px); }
        .mtp-thumb  { position:relative; aspect-ratio:4/3; background:#000; overflow:hidden; }
        .mtp-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s ease; }
        .mtp-card:hover .mtp-thumb img { transform:scale(1.08); }
        .mtp-thumb-empty { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-elevated); color:var(--text-dim); }
        .mtp-dot    { position:absolute; right:8px; top:8px; width:9px; height:9px; border-radius:50%; border:2px solid rgba(0,0,0,.6); }
        .mtp-dot--on  { background:#10b981; }
        .mtp-dot--off { background:#eab308; }
        .mtp-body   { padding:12px 13px 14px; display:flex; align-items:flex-start; gap:10px; }
        .mtp-num    { flex-shrink:0; font-family:var(--font-display); font-size:13px; font-weight:900; color:var(--accent); line-height:1.3; }
        .mtp-sep    { flex-shrink:0; width:1.5px; align-self:stretch; background:var(--line); margin-top:2px; }
        .mtp-txt    { min-width:0; }
        .mtp-name   { font-size:13.5px; font-weight:700; line-height:1.3; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mtp-name-en{ font-size:11.5px; color:var(--text-dim); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mtp-status { display:inline-block; font-size:10px; font-weight:700; margin-top:5px; }
        .mtp-status--on  { color:#10b981; }
        .mtp-status--off { color:#eab308; }

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
        @media (max-width:900px) {
          .mtp-grid, .mtp-skeleton-grid { grid-template-columns:repeat(3,1fr); }
        }
        @media (max-width:600px) {
          .mtp-dd     { display:none; }
          .mtp-fbtn   { display:flex; }
          .mtp-grid, .mtp-skeleton-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
          .mtp-panel  { padding:20px 14px 24px; border-radius:16px; }
          .mtp-name, .mtp-name-en { white-space:normal; }
        }
      `}</style>
    </div>
  );
}

function Dropdown({ icon, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const dangChon = options.find((o) => o.id === value) ?? options[0];

  return (
    <div className="mtp-dd" ref={wrapRef}>
      <button type="button" className="mtp-dd__btn" onClick={() => setOpen((v) => !v)}>
        <span className="mtp-dd__ic">{icon}</span>
        <span className="mtp-dd__lbl">{dangChon?.ten}</span>
        <ChevronDown size={13} className={`mtp-dd__chev${open ? " mtp-dd__chev--up" : ""}`} />
      </button>

      {open && (
        <ul className="mtp-dd__panel">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={`mtp-dd__item${o.id === value ? " mtp-dd__item--on" : ""}`}
                onClick={() => { onChange(o.id); setOpen(false); }}
              >
                {o.ten}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ may, index }) {
  const on = may.status === "Active";
  const anh = may.imageUrls?.[0];
  const { chinh, phu } = tachTenMay(may.equipmentName);

  return (
    <div className="mtp-card">
      <div className="mtp-thumb">
        {anh ? (
          <img src={anh} alt={may.equipmentName} loading="lazy" />
        ) : (
          <div className="mtp-thumb-empty" role="img" aria-label={may.equipmentName}>
            <Dumbbell size={22} />
          </div>
        )}
        <span className={`mtp-dot mtp-dot--${on ? "on" : "off"}`} />
      </div>
      <div className="mtp-body">
        <span className="mtp-num">{soThuTu(index)}</span>
        <span className="mtp-sep" />
        <div className="mtp-txt">
          <p className="mtp-name">{chinh}</p>
          {phu && <p className="mtp-name-en">{phu}</p>}
          <span className={`mtp-status mtp-status--${on ? "on" : "off"}`}>{trangThaiHienThi(may.status)}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="mtp-skeleton-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="mtp-skel" key={i}>
          <div className="mtp-skel__img" />
          <div className="mtp-skel__ln" />
          <div className="mtp-skel__ln mtp-skel__ln--sm" />
        </div>
      ))}
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