import { useState } from "react";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:         #1E6B45;
  --green-dark:    #155235;
  --green-light:   #E8F5EE;
  --green-border:  rgba(30,107,69,0.18);

  --bg:        #F4F6F8;
  --surface:   #FFFFFF;
  --border:    #E4EAF0;
  --border-md: #C9D4DF;
  --text-1:    #111827;
  --text-2:    #4B5563;
  --text-3:    #9CA3AF;

  --s-pending-stripe: #F59E0B;
  --s-pending-bg:     #FFFBEB;
  --s-pending-text:   #92400E;
  --s-pending-border: #FCD34D;

  --s-assigned-stripe: #3B82F6;
  --s-assigned-bg:     #EFF6FF;
  --s-assigned-text:   #1E40AF;
  --s-assigned-border: #93C5FD;

  --s-resolved-stripe: #10B981;
  --s-resolved-bg:     #ECFDF5;
  --s-resolved-text:   #065F46;
  --s-resolved-border: #6EE7B7;

  --s-rejected-stripe: #EF4444;
  --s-rejected-bg:     #FEF2F2;
  --s-rejected-text:   #991B1B;
  --s-rejected-border: #FCA5A5;

  --radius:    12px;
  --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03);
  --shadow-md: 0 4px 16px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04);
  --shadow-lg: 0 12px 40px rgba(0,0,0,.11), 0 4px 12px rgba(0,0,0,.05);
}

html, body { height: 100%; font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text-1); -webkit-font-smoothing: antialiased; }

.shell { min-height: 100vh; display: flex; flex-direction: column; }

/* ── Main ── */
.main { flex: 1; max-width: 1100px; width: 100%; margin: 0 auto; padding: 32px 28px 60px; }

/* ── Page header ── */
.page-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
}
.page-head-left { display: flex; align-items: center; gap: 14px; }
.page-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(30,107,69,0.28);
}
.page-title { font-size: 22px; font-weight: 800; color: var(--text-1); letter-spacing: -0.5px; line-height: 1; }
.page-subtitle { font-size: 13px; color: var(--text-2); margin-top: 3px; font-weight: 500; }

/* stat chips */
.stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 13px; border-radius: 20px;
  background: var(--surface); border: 1px solid var(--border);
  font-size: 12px; font-weight: 700; color: var(--text-2);
  box-shadow: var(--shadow-sm);
}
.stat-dot { width: 7px; height: 7px; border-radius: 50%; }

/* ── Filter bar ── */
.filter-bar {
  display: flex; gap: 4px; margin-bottom: 18px; flex-wrap: wrap;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 5px;
  box-shadow: var(--shadow-sm);
}
.filter-tab {
  padding: 7px 16px; border-radius: 8px; border: none;
  background: transparent; font-size: 13px; font-weight: 600;
  color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.filter-tab:hover { background: var(--bg); color: var(--text-1); }
.filter-tab.active { background: var(--green); color: #fff; }

/* ── Incident cards ── */
.incident-list { display: flex; flex-direction: column; gap: 8px; }

.inc-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow-sm);
  display: flex; overflow: hidden;
  transition: box-shadow 0.18s, transform 0.18s;
}
.inc-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

.inc-stripe { width: 4px; flex-shrink: 0; }

.inc-body {
  flex: 1; padding: 16px 20px;
  display: flex; align-items: center; gap: 18px; min-width: 0;
}

.inc-info { flex: 1; min-width: 0; }

.inc-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.inc-id { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.7px; }

.status-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 700; border: 1px solid;
}

.inc-title {
  font-size: 14.5px; font-weight: 700; color: var(--text-1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;
}

.inc-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.meta-tag {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--text-2); font-weight: 500;
}
.meta-tag strong { color: var(--text-1); font-weight: 600; }

.inc-thumb {
  width: 64px; height: 48px; border-radius: 8px; overflow: hidden;
  flex-shrink: 0; border: 1.5px solid var(--border);
}
.inc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* actions */
.inc-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.btn-ghost {
  padding: 7px 14px; border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-md); background: var(--surface);
  color: var(--text-1); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-ghost:hover { border-color: var(--text-1); background: var(--bg); }

.btn-primary {
  padding: 7px 16px; border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  color: #fff; font-size: 13px; font-weight: 600; border: none;
  cursor: pointer; transition: filter 0.15s; white-space: nowrap;
  box-shadow: 0 2px 8px rgba(30,107,69,0.25);
}
.btn-primary:hover { filter: brightness(1.07); }

.btn-danger {
  padding: 7px 14px; border-radius: var(--radius-sm);
  border: 1.5px solid #EF4444; background: #fff; color: #DC2626;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-danger:hover { background: #FEF2F2; }

.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface); border: 1.5px solid var(--border-md);
  color: var(--text-1); font-size: 13px; font-weight: 600;
  padding: 7px 14px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-back:hover { border-color: var(--green); color: var(--green); background: var(--green-light); }

/* empty */
.empty { text-align: center; padding: 80px 20px; color: var(--text-3); }
.empty-icon { font-size: 40px; margin-bottom: 10px; }
.empty-label { font-size: 15px; font-weight: 600; }

/* ── DETAIL PAGE ── */
.detail-layout {
  display: grid; grid-template-columns: 1fr 380px;
  gap: 24px; align-items: start;
}

.detail-topbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 22px;
}

/* media */
.media-main {
  border-radius: var(--radius); overflow: hidden; background: #0F172A;
  aspect-ratio: 16/9; margin-bottom: 8px; box-shadow: var(--shadow-md); position: relative;
}
.media-main img, .media-main video { width: 100%; height: 100%; object-fit: cover; display: block; }

.media-type-badge {
  position: absolute; top: 10px; left: 10px;
  background: rgba(0,0,0,0.5); color: #fff;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 8px; border-radius: 20px; backdrop-filter: blur(4px);
}

.media-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.thumb {
  aspect-ratio: 16/10; border-radius: 8px; overflow: hidden;
  cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s, opacity 0.15s;
  background: #0F172A; position: relative;
}
.thumb:hover { opacity: 0.85; }
.thumb.active { border-color: var(--green); }
.thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.thumb-video-icon {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35); color: #fff; font-size: 18px;
}

/* info card */
.info-col { position: sticky; top: 24px; }

.info-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden;
}

.info-card-head {
  padding: 20px 22px 18px; border-bottom: 1px solid var(--border);
  border-top: 4px solid var(--green);
}

.info-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.info-id { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.8px; }
.info-title { font-size: 18px; font-weight: 800; color: var(--text-1); line-height: 1.3; letter-spacing: -0.3px; }
.info-desc { font-size: 13.5px; color: var(--text-2); line-height: 1.65; margin-top: 10px; }

.info-card-body { padding: 18px 22px; }

.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 3px; }
.field-label { font-size: 10.5px; font-weight: 700; color: var(--text-3); letter-spacing: 0.8px; text-transform: uppercase; }
.field-value { font-size: 13.5px; font-weight: 600; color: var(--text-1); }

.info-card-actions { padding: 14px 22px; border-top: 1px solid var(--border); }

/* Timeline */
.timeline {
  margin-top: 16px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-sm); padding: 18px 20px;
}
.timeline-title {
  font-size: 11px; font-weight: 700; color: var(--text-3);
  letter-spacing: 0.7px; text-transform: uppercase; margin-bottom: 16px;
}
.tl-item { display: flex; gap: 12px; position: relative; }
.tl-item:not(:last-child) { padding-bottom: 16px; }
.tl-item:not(:last-child)::before {
  content: ''; position: absolute; left: 9px; top: 20px; bottom: 0;
  width: 1px; background: var(--border);
}
.tl-dot {
  width: 20px; height: 20px; border-radius: 50%; background: var(--green-light);
  border: 2px solid var(--green-border); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 10px;
}
.tl-content { flex: 1; }
.tl-label { font-size: 13px; font-weight: 600; color: var(--text-1); }
.tl-time { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }

/* Confirm overlay */
.overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px;
}
.confirm-box {
  background: var(--surface); border-radius: 16px; padding: 30px 26px;
  max-width: 360px; width: 100%; box-shadow: var(--shadow-lg);
  text-align: center; animation: popIn 0.18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.confirm-icon { font-size: 36px; margin-bottom: 12px; }
.confirm-title { font-size: 17px; font-weight: 800; color: var(--text-1); margin-bottom: 7px; letter-spacing: -0.3px; }
.confirm-text { font-size: 13.5px; color: var(--text-2); line-height: 1.6; margin-bottom: 22px; }
.confirm-actions { display: flex; gap: 10px; }
.confirm-actions > * { flex: 1; padding: 10px; text-align: center; }

.page-enter { animation: fadeSlide 0.2s ease; }
@keyframes fadeSlide { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }

@media (max-width: 860px) {
  .detail-layout { grid-template-columns: 1fr; }
  .info-col { position: static; }
  .inc-body { flex-direction: column; align-items: flex-start; gap: 12px; }
  .inc-thumb { display: none; }
  .main { padding: 20px 16px 48px; }
}
`;

/* ── Data & helpers ── */
const STATUS_META = {
  PendingApproval: { label: "Chờ duyệt", stripe: "#F59E0B", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" },
  Assigned: { label: "Đã phân công", stripe: "#3B82F6", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  Resolved: { label: "Đã xử lý", stripe: "#10B981", bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
  Rejected: { label: "Bị từ chối", stripe: "#EF4444", bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
};

const SAMPLE_INCIDENTS = [
  {
    incidentId: 1001,
    title: "Máy điều hòa tầng 2 ngừng hoạt động",
    description: "Máy điều hòa phòng họp tầng 2 đột ngột ngừng hoạt động, không thổi hơi lạnh. Nhiệt độ phòng tăng cao, ảnh hưởng nghiêm trọng đến buổi họp ban chiều. Đã thử khởi động lại nhiều lần nhưng không thành công.",
    branchId: 1, equipmentId: 204, status: "PendingApproval", reportedBy: 10021,
    createdAt: "2025-06-18T08:30:00", resolvedAt: null,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=900&q=80" },
      { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=300&q=60" },
    ],
  },
  {
    incidentId: 1002,
    title: "Rò rỉ nước khu vực nhà bếp",
    description: "Phát hiện vũng nước lớn tại khu bếp nhân viên, nghi do đường ống bị hỏng. Nguy cơ trơn trượt cao, cần xử lý khẩn cấp.",
    branchId: 2, equipmentId: null, status: "Assigned", reportedBy: 10033,
    createdAt: "2025-06-17T14:15:00", resolvedAt: null,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80" },
      { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1612160609504-334bc0380bfc?w=300&q=60" },
    ],
  },
  {
    incidentId: 1003,
    title: "Thang máy số 1 mất điện giữa chừng",
    description: "Thang máy số 1 dừng đột ngột giữa tầng 3 và tầng 4. Đã di tản toàn bộ nhân sự bên trong an toàn. Cần kiểm tra hệ thống điện và cơ cấu phanh khẩn cấp.",
    branchId: 1, equipmentId: 115, status: "Resolved", reportedBy: 10045,
    createdAt: "2025-06-15T09:00:00", resolvedAt: "2025-06-15T16:45:00",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1545259742-b0de67e74f06?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=900&q=80" },
      { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=300&q=60" },
    ],
  },
  {
    incidentId: 1004,
    title: "Mất kết nối Internet toàn bộ văn phòng",
    description: "Toàn bộ kết nối internet tại văn phòng bị ngắt từ 9:00 sáng. ISP xác nhận sự cố đường truyền tại tổng đài. Ảnh hưởng nghiêm trọng đến công việc.",
    branchId: 3, equipmentId: 312, status: "Rejected", reportedBy: 10058,
    createdAt: "2025-06-16T09:00:00", resolvedAt: null,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=900&q=80" },
      { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300&q=60" },
    ],
  },
  {
    incidentId: 1005,
    title: "Đèn chiếu sáng hành lang tắt",
    description: "Toàn bộ đèn hành lang tầng 1 bị tắt từ tối hôm qua. Ảnh hưởng đến di chuyển và an ninh khu vực ngoài giờ làm việc.",
    branchId: 2, equipmentId: 211, status: "PendingApproval", reportedBy: 10022,
    createdAt: "2025-06-19T07:45:00", resolvedAt: null,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1558470598-a5dda9640f68?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=900&q=80" },
      { type: "video", url: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&q=60" },
    ],
  },
];

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "PendingApproval", label: "Chờ duyệt" },
  { key: "Assigned", label: "Đã phân công" },
  { key: "Resolved", label: "Đã xử lý" },
  { key: "Rejected", label: "Bị từ chối" },
];

/* ── StatusPill ── */
function StatusPill({ status }) {
  const m = STATUS_META[status] || {};
  return (
    <span className="status-pill" style={{ background: m.bg, color: m.text, borderColor: m.border }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.stripe, display: "inline-block" }} />
      {m.label}
    </span>
  );
}

/* ── Detail page ── */
function DetailPage({ incident, onBack, onCancel }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = incident.media[activeIdx];

  const timelineItems = [
    { icon: "📋", label: "Báo cáo được tạo", time: fmtDate(incident.createdAt), show: true },
    { icon: "⏳", label: "Đang chờ phê duyệt", time: "Chờ quản lý xác nhận", show: incident.status === "PendingApproval" },
    { icon: "👤", label: "Đã phân công kỹ thuật viên", time: "Kỹ thuật viên đang xử lý", show: incident.status === "Assigned" },
    { icon: "✅", label: "Xử lý hoàn tất", time: fmtDate(incident.resolvedAt), show: incident.status === "Resolved" && incident.resolvedAt },
    { icon: "🚫", label: "Báo cáo bị từ chối", time: "Quản lý đã từ chối xử lý", show: incident.status === "Rejected" },
  ].filter(i => i.show);

  return (
    <div className="main page-enter">
      {/* back bar */}
      <div className="detail-topbar">
        <button className="btn-back" onClick={onBack}>
          ← Danh sách sự cố
        </button>
        <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
          Chi tiết sự cố #{incident.incidentId}
        </span>
      </div>

      <div className="detail-layout">
        {/* LEFT: Media */}
        <div>
          <div className="media-main">
            {active.type === "video"
              ? <video src={active.url} controls style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
              : <img src={active.url} alt="Minh chứng" />
            }
            <span className="media-type-badge">{active.type === "video" ? "▶ VIDEO" : "📷 ẢNH"}</span>
          </div>
          <div className="media-thumbs">
            {incident.media.map((m, i) => (
              <div key={i} className={`thumb${activeIdx === i ? " active" : ""}`} onClick={() => setActiveIdx(i)}>
                {m.type === "video"
                  ? <><img src={m.thumb} alt="" /><div className="thumb-video-icon">▶</div></>
                  : <img src={m.url} alt="" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Info */}
        <div className="info-col">
          <div className="info-card">
            <div className="info-card-head">
              <div className="info-badge-row">
                <span className="info-id">#{incident.incidentId}</span>
                <StatusPill status={incident.status} />
              </div>
              <div className="info-title">{incident.title}</div>
              <div className="info-desc">{incident.description}</div>
            </div>

            <div className="info-card-body">
              <div className="field-grid">
                <div className="field">
                  <span className="field-label">Chi nhánh</span>
                  <span className="field-value">Chi nhánh {incident.branchId}</span>
                </div>
                <div className="field">
                  <span className="field-label">Thiết bị</span>
                  <span className="field-value">{incident.equipmentId ? `#${incident.equipmentId}` : "Không xác định"}</span>
                </div>
                <div className="field">
                  <span className="field-label">Người báo cáo</span>
                  <span className="field-value">NV-{incident.reportedBy}</span>
                </div>
                <div className="field">
                  <span className="field-label">Thời gian tạo</span>
                  <span className="field-value">{fmtDate(incident.createdAt)}</span>
                </div>
                {incident.resolvedAt && (
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Xử lý hoàn tất</span>
                    <span className="field-value" style={{ color: "#065F46" }}>{fmtDate(incident.resolvedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {incident.status === "PendingApproval" && (
              <div className="info-card-actions">
                <button className="btn-danger" style={{ width: "100%", padding: "10px" }} onClick={() => onCancel(incident)}>
                  Hủy báo cáo
                </button>
              </div>
            )}
          </div>

          <div className="timeline">
            <div className="timeline-title">Lịch sử trạng thái</div>
            {timelineItems.map((item, i) => (
              <div key={i} className="tl-item">
                <div className="tl-dot">{item.icon}</div>
                <div className="tl-content">
                  <div className="tl-label">{item.label}</div>
                  <div className="tl-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Root ── */
export default function App() {
  const [incidents, setIncidents] = useState(SAMPLE_INCIDENTS);
  const [filter, setFilter] = useState("all");
  const [viewingId, setViewingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const filtered = filter === "all" ? incidents : incidents.filter(i => i.status === filter);
  const viewing = viewingId ? incidents.find(i => i.incidentId === viewingId) : null;

  const doCancel = (id) => {
    setIncidents(p => p.filter(i => i.incidentId !== id));
    setConfirmCancel(null);
    setViewingId(null);
  };

  const counts = {
    PendingApproval: incidents.filter(i => i.status === "PendingApproval").length,
    Assigned: incidents.filter(i => i.status === "Assigned").length,
    Resolved: incidents.filter(i => i.status === "Resolved").length,
  };

  return (
    <>
      <style>{css}</style>
      <div className="shell">

        {/* LIST PAGE */}
        {!viewing && (
          <div className="main page-enter">
            {/* Header */}
            <div className="page-head">
              <div className="page-head-left">
                <div className="page-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="page-title">Danh sách sự cố</div>
                  <div className="page-subtitle">{incidents.length} báo cáo tổng cộng</div>
                </div>
              </div>
              <div className="stats-row">
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#F59E0B" }} />{counts.PendingApproval} chờ duyệt</div>
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#3B82F6" }} />{counts.Assigned} đang xử lý</div>
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#10B981" }} />{counts.Resolved} hoàn tất</div>
              </div>
            </div>

            {/* Filter */}
            <div className="filter-bar">
              {FILTERS.map(f => (
                <button key={f.key} className={`filter-tab${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="incident-list">
              {filtered.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-label">Không có sự cố nào.</div>
                </div>
              )}
              {filtered.map(inc => {
                const sm = STATUS_META[inc.status] || {};
                const thumb = inc.media.find(m => m.type === "image") || inc.media[0];
                return (
                  <div className="inc-card" key={inc.incidentId}>
                    <div className="inc-stripe" style={{ background: sm.stripe }} />
                    <div className="inc-body">
                      {/* thumb preview */}
                      <div className="inc-thumb">
                        <img src={thumb.url || thumb.thumb} alt="" />
                      </div>

                      <div className="inc-info">
                        <div className="inc-eyebrow">
                          <span className="inc-id">#{inc.incidentId}</span>
                          <StatusPill status={inc.status} />
                        </div>
                        <div className="inc-title">{inc.title}</div>
                        <div className="inc-meta">
                          <span className="meta-tag">🏢 <strong>Chi nhánh {inc.branchId}</strong></span>
                          {inc.equipmentId && <span className="meta-tag">⚙️ <strong>#{inc.equipmentId}</strong></span>}
                          <span className="meta-tag">👤 NV-{inc.reportedBy}</span>
                          <span className="meta-tag">🕐 {fmtDate(inc.createdAt)}</span>
                        </div>
                      </div>

                      <div className="inc-actions">
                        {inc.status === "PendingApproval" && (
                          <button className="btn-danger" onClick={() => setConfirmCancel(inc)}>Hủy</button>
                        )}
                        <button className="btn-primary" onClick={() => setViewingId(inc.incidentId)}>
                          Xem chi tiết →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETAIL */}
        {viewing && (
          <DetailPage
            key={viewing.incidentId}
            incident={viewing}
            onBack={() => setViewingId(null)}
            onCancel={(inc) => setConfirmCancel(inc)}
          />
        )}
      </div>

      {/* Confirm dialog */}
      {confirmCancel && (
        <div className="overlay" onClick={() => setConfirmCancel(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <div className="confirm-title">Hủy báo cáo?</div>
            <div className="confirm-text">
              Bạn sắp hủy sự cố <strong>"{confirmCancel.title}"</strong>.<br />
              Thao tác này không thể khôi phục.
            </div>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={() => setConfirmCancel(null)}>Quay lại</button>
              <button className="btn-danger" onClick={() => doCancel(confirmCancel.incidentId)}>Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}