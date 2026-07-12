import { useEffect, useState } from "react";
import cashierApi from "../../../api/cashierApi";

/* ─────────────────────────────────────────────
   STYLES — đồng bộ tông với CashierLayout
   (nền content sáng #F4F6F8, accent cyan #22D3EE
   giống hệt bảng màu C trong CashierLayout.jsx)
───────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --cyan:          #22D3EE;
  --cyan-dark:     #0E7490;
  --cyan-soft:     rgba(34,211,238,0.14);
  --cyan-border:   rgba(34,211,238,0.35);
  --blue:          #3B82F6;

  --bg:        #F4F6F8;
  --surface:   #FFFFFF;
  --border:    #E4EAF0;
  --border-md: #C9D4DF;
  --text-1:    #111827;
  --text-2:    #4B5563;
  --text-3:    #9CA3AF;

  --danger:        #DC2626;
  --danger-bg:     #FEF2F2;
  --danger-border: #FCA5A5;

  --radius:    12px;
  --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.03);
  --shadow-md: 0 4px 16px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04);
  --shadow-lg: 0 12px 40px rgba(0,0,0,.11), 0 4px 12px rgba(0,0,0,.05);
}

html, body { height: 100%; font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text-1); -webkit-font-smoothing: antialiased; }

.shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.main { flex: 1; max-width: 1100px; width: 100%; margin: 0 auto; padding: 32px 28px 60px; }

.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.page-head-left { display: flex; align-items: center; gap: 14px; }
.page-icon { width: 42px; height: 42px; border-radius: 11px; background: linear-gradient(135deg, var(--cyan), var(--cyan-dark)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 3px 10px rgba(34,211,238,0.35); }
.page-title { font-size: 22px; font-weight: 800; color: var(--text-1); letter-spacing: -0.5px; line-height: 1; }
.page-subtitle { font-size: 13px; color: var(--text-2); margin-top: 3px; font-weight: 500; }

.stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-chip { display: flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 20px; background: var(--surface); border: 1px solid var(--border); font-size: 12px; font-weight: 700; color: var(--text-2); box-shadow: var(--shadow-sm); }
.stat-dot { width: 7px; height: 7px; border-radius: 50%; }

.toolbar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; justify-content: space-between; }

.filter-bar { display: flex; gap: 4px; flex-wrap: wrap; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px; box-shadow: var(--shadow-sm); }
.filter-tab { padding: 7px 16px; border-radius: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: var(--text-2); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.filter-tab:hover { background: var(--bg); color: var(--text-1); }
.filter-tab.active { background: linear-gradient(135deg, var(--cyan), var(--cyan-dark)); color: #04222B; }

.search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 14px; box-shadow: var(--shadow-sm); min-width: 220px; }
.search-box input { border: none; outline: none; font-size: 13px; font-family: inherit; flex: 1; background: transparent; color: var(--text-1); }
.search-box input:focus { outline: none; }

.incident-list { display: flex; flex-direction: column; gap: 8px; }

.inc-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); display: flex; overflow: hidden; transition: box-shadow 0.18s, transform 0.18s; }
.inc-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.inc-stripe { width: 4px; flex-shrink: 0; }
.inc-body { flex: 1; padding: 16px 20px; display: flex; align-items: center; gap: 18px; min-width: 0; }
.inc-info { flex: 1; min-width: 0; }
.inc-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.inc-id { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.7px; }
.status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid; }
.inc-title { font-size: 14.5px; font-weight: 700; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; }
.inc-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.meta-tag { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-2); font-weight: 500; }
.meta-tag strong { color: var(--text-1); font-weight: 600; }
.inc-thumb { width: 64px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; border: 1.5px solid var(--border); background: #EEF1F4; display: flex; align-items: center; justify-content: center; color: var(--text-3); font-size: 18px; }
.inc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.inc-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.btn-ghost { padding: 7px 14px; border-radius: var(--radius-sm); border: 1.5px solid var(--border-md); background: var(--surface); color: var(--text-1); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.btn-ghost:hover { border-color: var(--text-1); background: var(--bg); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { padding: 7px 16px; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--cyan), var(--cyan-dark)); color: #04222B; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: filter 0.15s; white-space: nowrap; box-shadow: 0 2px 8px rgba(34,211,238,0.3); }
.btn-primary:hover { filter: brightness(1.06); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-danger { padding: 7px 14px; border-radius: var(--radius-sm); border: 1.5px solid #EF4444; background: #fff; color: var(--danger); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.btn-danger:hover { background: var(--danger-bg); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-back { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1.5px solid var(--border-md); color: var(--text-1); font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.btn-back:hover { border-color: var(--cyan-dark); color: var(--cyan-dark); background: var(--cyan-soft); }

.empty { text-align: center; padding: 80px 20px; color: var(--text-3); }
.empty-icon { font-size: 40px; margin-bottom: 10px; }
.empty-label { font-size: 15px; font-weight: 600; }
.err-box { text-align: center; padding: 40px 20px; color: #991B1B; background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius); font-size: 13.5px; font-weight: 600; }

.detail-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }
.detail-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }

.media-main { border-radius: var(--radius); overflow: hidden; background: #0F172A; aspect-ratio: 16/9; margin-bottom: 8px; box-shadow: var(--shadow-md); position: relative; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 13px; font-weight: 600; }
.media-main img, .media-main video { width: 100%; height: 100%; object-fit: cover; display: block; }
.media-type-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 20px; backdrop-filter: blur(4px); }

.media-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.thumb { aspect-ratio: 16/10; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s, opacity 0.15s; background: #0F172A; position: relative; }
.thumb:hover { opacity: 0.85; }
.thumb.active { border-color: var(--cyan); }
.thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.thumb-video-icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); color: #fff; font-size: 18px; }

.info-col { position: sticky; top: 24px; }
.info-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
.info-card-head { padding: 20px 22px 18px; border-bottom: 1px solid var(--border); border-top: 4px solid var(--cyan); }
.info-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.info-id { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.8px; }
.info-title { font-size: 18px; font-weight: 800; color: var(--text-1); line-height: 1.3; letter-spacing: -0.3px; }
.info-desc { font-size: 13.5px; color: var(--text-2); line-height: 1.65; margin-top: 10px; white-space: pre-wrap; }
.info-card-body { padding: 18px 22px; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 3px; }
.field-label { font-size: 10.5px; font-weight: 700; color: var(--text-3); letter-spacing: 0.8px; text-transform: uppercase; }
.field-value { font-size: 13.5px; font-weight: 600; color: var(--text-1); }
.info-card-actions { padding: 14px 22px; border-top: 1px solid var(--border); }

.timeline { margin-top: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 18px 20px; }
.timeline-title { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: 0.7px; text-transform: uppercase; margin-bottom: 16px; }
.tl-item { display: flex; gap: 12px; position: relative; }
.tl-item:not(:last-child) { padding-bottom: 16px; }
.tl-item:not(:last-child)::before { content: ''; position: absolute; left: 9px; top: 20px; bottom: 0; width: 1px; background: var(--border); }
.tl-dot { width: 20px; height: 20px; border-radius: 50%; background: var(--cyan-soft); border: 2px solid var(--cyan-border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.tl-content { flex: 1; }
.tl-label { font-size: 13px; font-weight: 600; color: var(--text-1); }
.tl-time { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }

.overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.confirm-box { background: var(--surface); border-radius: 16px; padding: 30px 26px; max-width: 380px; width: 100%; box-shadow: var(--shadow-lg); text-align: center; animation: popIn 0.18s cubic-bezier(.34,1.56,.64,1); }
@keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.confirm-icon { font-size: 36px; margin-bottom: 12px; }
.confirm-title { font-size: 17px; font-weight: 800; color: var(--text-1); margin-bottom: 7px; letter-spacing: -0.3px; }
.confirm-text { font-size: 13.5px; color: var(--text-2); line-height: 1.6; margin-bottom: 16px; }
.confirm-reason { width: 100%; min-height: 72px; border: 1.5px solid var(--border-md); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 13px; font-family: inherit; resize: vertical; margin-bottom: 8px; }
.confirm-reason:focus { outline: none; border-color: var(--cyan-dark); }
.confirm-err { font-size: 12px; color: var(--danger); font-weight: 600; margin-bottom: 14px; text-align: left; min-height: 16px; }
.confirm-actions { display: flex; gap: 10px; }
.confirm-actions > * { flex: 1; padding: 10px; text-align: center; }

.spinner-row { display: flex; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-3); font-size: 13.5px; font-weight: 600; }

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

/* ── Trạng thái thật theo DB (Incident.Status) ──
   PendingApproval | Approved | Completed | Cancelled */
const STATUS_META = {
  PendingApproval: { label: "Chờ duyệt", stripe: "#F59E0B", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" },
  Approved: { label: "Đã duyệt", stripe: "#3B82F6", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  Completed: { label: "Hoàn tất", stripe: "#22D3EE", bg: "#ECFEFF", text: "#0E7490", border: "#67E8F9" },
  Cancelled: { label: "Đã hủy", stripe: "#EF4444", bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "PendingApproval", label: "Chờ duyệt" },
  { key: "Approved", label: "Đã duyệt" },
  { key: "Completed", label: "Hoàn tất" },
  { key: "Cancelled", label: "Đã hủy" },
];

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// NOTE: nếu authApi (axios instance) của bạn đã có interceptor trả thẳng
// response.data thì cashierApi.getX(...) trả về data luôn — bỏ unwrap().
// Nếu authApi trả nguyên response axios thì cần .data — unwrap() xử lý cả 2
// trường hợp cho an toàn, bạn có thể xóa nếu chắc chắn shape trả về.
const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

function StatusPill({ status }) {
  const m = STATUS_META[status] || {};
  return (
    <span className="status-pill" style={{ background: m.bg, color: m.text, borderColor: m.border }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.stripe, display: "inline-block" }} />
      {m.label || status}
    </span>
  );
}

/* ── Popup xác nhận hủy (yêu cầu nhập lý do — BE bắt buộc RejectReason) ── */
function CancelDialog({ incident, submitting, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const showErr = touched && !trimmed;

  return (
    <div className="overlay" onClick={submitting ? undefined : onClose}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-title">Hủy báo cáo?</div>
        <div className="confirm-text">
          Bạn sắp hủy sự cố <strong>"{incident.title}"</strong>. Vui lòng nhập lý do hủy.
        </div>
        <textarea
          className="confirm-reason"
          placeholder="Nhập lý do hủy báo cáo..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
        />
        <div className="confirm-err">{showErr ? "Vui lòng nhập lý do hủy." : ""}</div>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onClose} disabled={submitting}>Quay lại</button>
          <button
            className="btn-danger"
            disabled={submitting || !trimmed}
            onClick={() => onConfirm(trimmed)}
          >
            {submitting ? "Đang hủy..." : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Trang chi tiết — LUÔN fetch riêng theo id, vì IncidentListDto
   không có Description/BranchId/Medias đầy đủ như IncidentDetailDto ── */
function DetailPage({ incidentId, onBack, onRequestCancel }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setActiveIdx(0);

    cashierApi.getIncidentDetail(incidentId)
      .then((res) => { if (alive) setDetail(unwrap(res)); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message || e?.message || "Không tải được chi tiết báo cáo."); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="main page-enter">
        <div className="detail-topbar">
          <button className="btn-back" onClick={onBack}>← Danh sách sự cố</button>
        </div>
        <div className="spinner-row">Đang tải chi tiết báo cáo...</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="main page-enter">
        <div className="detail-topbar">
          <button className="btn-back" onClick={onBack}>← Danh sách sự cố</button>
        </div>
        <div className="err-box">{error || "Không tìm thấy báo cáo."}</div>
      </div>
    );
  }

  const medias = detail.medias || [];
  const active = medias[activeIdx];

  const timelineItems = [
    { icon: "📋", label: "Báo cáo được tạo", time: fmtDate(detail.createdAt), show: true },
    { icon: "⏳", label: "Đang chờ phê duyệt", time: "Chờ quản lý xác nhận", show: detail.status === "PendingApproval" },
    { icon: "✅", label: "Đã duyệt, đang chờ xử lý", time: fmtDate(detail.updatedAt), show: detail.status === "Approved" },
    { icon: "🏁", label: "Xử lý hoàn tất", time: fmtDate(detail.updatedAt), show: detail.status === "Completed" },
    { icon: "🚫", label: `Báo cáo bị hủy${detail.rejectReason ? `: ${detail.rejectReason}` : ""}`, time: fmtDate(detail.updatedAt), show: detail.status === "Cancelled" },
  ].filter((i) => i.show);

  return (
    <div className="main page-enter">
      <div className="detail-topbar">
        <button className="btn-back" onClick={onBack}>← Danh sách sự cố</button>
        <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
          Chi tiết sự cố #{detail.incidentId}
        </span>
      </div>

      <div className="detail-layout">
        <div>
          <div className="media-main">
            {!active && "Không có ảnh/video minh chứng"}
            {active && active.mediaType === "Video" && (
              <video src={active.mediaUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            )}
            {active && active.mediaType === "Image" && <img src={active.mediaUrl} alt="Minh chứng" />}
            {active && <span className="media-type-badge">{active.mediaType === "Video" ? "▶ VIDEO" : "📷 ẢNH"}</span>}
          </div>
          {medias.length > 0 && (
            <div className="media-thumbs">
              {medias.map((m, i) => (
                <div key={i} className={`thumb${activeIdx === i ? " active" : ""}`} onClick={() => setActiveIdx(i)}>
                  {m.mediaType === "Video"
                    ? <div className="thumb-video-icon" style={{ position: "static", background: "#0F172A" }}>▶</div>
                    : <img src={m.mediaUrl} alt="" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="info-col">
          <div className="info-card">
            <div className="info-card-head">
              <div className="info-badge-row">
                <span className="info-id">#{detail.incidentId}</span>
                <StatusPill status={detail.status} />
              </div>
              <div className="info-title">{detail.title}</div>
              <div className="info-desc">{detail.description}</div>
            </div>

            <div className="info-card-body">
              <div className="field-grid">
                <div className="field">
                  <span className="field-label">Chi nhánh</span>
                  <span className="field-value">{detail.branchName}</span>
                </div>
                <div className="field">
                  <span className="field-label">Thiết bị</span>
                  <span className="field-value">{detail.equipmentName || "Không xác định"}</span>
                </div>
                <div className="field">
                  <span className="field-label">Người báo cáo</span>
                  <span className="field-value">{detail.reporterName}</span>
                </div>
                <div className="field">
                  <span className="field-label">Thời gian tạo</span>
                  <span className="field-value">{fmtDate(detail.createdAt)}</span>
                </div>
                {detail.status === "Cancelled" && detail.rejectReason && (
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Lý do hủy</span>
                    <span className="field-value" style={{ color: "#991B1B" }}>{detail.rejectReason}</span>
                  </div>
                )}
              </div>
            </div>

            {detail.status === "PendingApproval" && (
              <div className="info-card-actions">
                <button className="btn-danger" style={{ width: "100%", padding: "10px" }} onClick={() => onRequestCancel(detail)}>
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
export default function IncidentPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [viewingId, setViewingId] = useState(null);

  // Popup hủy: incident cần đủ field (title/description/branchId/equipmentId)
  // nên khi bấm "Hủy" từ CARD danh sách (dữ liệu rút gọn), phải fetch chi tiết
  // trước rồi mới mở popup. Khi bấm từ trang chi tiết thì đã có sẵn.
  const [confirmCancel, setConfirmCancel] = useState(null); // { ...detail }
  const [cancelFetchingId, setCancelFetchingId] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: filter !== "all" ? filter : undefined,
        keyword: keyword || undefined,
        page: 1,
        pageSize: 50,
      };
      const res = await cashierApi.getIncidents(params);
      setIncidents(unwrap(res) || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Không tải được danh sách báo cáo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, [filter, keyword]);

  // debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput.trim()), 400);
    return () => clearTimeout(t);
  }, [keywordInput]);

  async function handleRequestCancelFromCard(inc) {
    setCancelFetchingId(inc.incidentId);
    try {
      const res = await cashierApi.getIncidentDetail(inc.incidentId);
      setConfirmCancel(unwrap(res));
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Không tải được thông tin báo cáo.");
    } finally {
      setCancelFetchingId(null);
    }
  }

  async function doCancel(reason) {
    if (!confirmCancel) return;
    setCancelSubmitting(true);
    try {
      await cashierApi.updateIncident(confirmCancel.incidentId, {
        title: confirmCancel.title,
        description: confirmCancel.description,
        branchId: confirmCancel.branchId,
        equipmentId: confirmCancel.equipmentId,
        status: "Cancelled",
        rejectReason: reason,
      });
      setConfirmCancel(null);
      if (viewingId === confirmCancel.incidentId) setViewingId(null);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Hủy báo cáo thất bại.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  const counts = {
    PendingApproval: incidents.filter((i) => i.status === "PendingApproval").length,
    Approved: incidents.filter((i) => i.status === "Approved").length,
    Completed: incidents.filter((i) => i.status === "Completed").length,
  };

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        {!viewingId && (
          <div className="main page-enter">
            <div className="page-head">
              <div className="page-head-left">
                <div className="page-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#04222B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="page-title">Lịch sử báo cáo sự cố</div>
                  <div className="page-subtitle">{incidents.length} báo cáo của bạn</div>
                </div>
              </div>
              <div className="stats-row">
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#F59E0B" }} />{counts.PendingApproval} chờ duyệt</div>
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#3B82F6" }} />{counts.Approved} đã duyệt</div>
                <div className="stat-chip"><span className="stat-dot" style={{ background: "#22D3EE" }} />{counts.Completed} hoàn tất</div>
              </div>
            </div>

            <div className="toolbar">
              <div className="filter-bar">
                {FILTERS.map((f) => (
                  <button key={f.key} className={`filter-tab${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="search-box">
                🔍
                <input
                  placeholder="Tìm theo tiêu đề, mô tả..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                />
              </div>
            </div>

            {loading && <div className="spinner-row">Đang tải danh sách báo cáo...</div>}
            {!loading && error && <div className="err-box">{error}</div>}

            {!loading && !error && (
              <div className="incident-list">
                {incidents.length === 0 && (
                  <div className="empty">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-label">Không có sự cố nào.</div>
                  </div>
                )}
                {incidents.map((inc) => {
                  const sm = STATUS_META[inc.status] || {};
                  return (
                    <div className="inc-card" key={inc.incidentId}>
                      <div className="inc-stripe" style={{ background: sm.stripe }} />
                      <div className="inc-body">
                        <div className="inc-thumb">
                          {inc.thumbnail ? <img src={inc.thumbnail} alt="" /> : "📷"}
                        </div>

                        <div className="inc-info">
                          <div className="inc-eyebrow">
                            <span className="inc-id">#{inc.incidentId}</span>
                            <StatusPill status={inc.status} />
                          </div>
                          <div className="inc-title">{inc.title}</div>
                          <div className="inc-meta">
                            <span className="meta-tag">🏢 <strong>{inc.branchName}</strong></span>
                            {inc.equipmentName && <span className="meta-tag">⚙️ <strong>{inc.equipmentName}</strong></span>}
                            <span className="meta-tag">👤 {inc.reporterName}</span>
                            <span className="meta-tag">🕐 {fmtDate(inc.createdAt)}</span>
                          </div>
                        </div>

                        <div className="inc-actions">
                          {inc.status === "PendingApproval" && (
                            <button
                              className="btn-danger"
                              disabled={cancelFetchingId === inc.incidentId}
                              onClick={() => handleRequestCancelFromCard(inc)}
                            >
                              {cancelFetchingId === inc.incidentId ? "Đang tải..." : "Hủy"}
                            </button>
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
            )}
          </div>
        )}

        {viewingId && (
          <DetailPage
            key={viewingId}
            incidentId={viewingId}
            onBack={() => setViewingId(null)}
            onRequestCancel={(detail) => setConfirmCancel(detail)}
          />
        )}
      </div>

      {confirmCancel && (
        <CancelDialog
          incident={confirmCancel}
          submitting={cancelSubmitting}
          onClose={() => (cancelSubmitting ? null : setConfirmCancel(null))}
          onConfirm={doCancel}
        />
      )}
    </>
  );
}