import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  History,
  Hourglass,
  Loader2,
  Phone,
  Printer,
  Search,
  Store,
  User,
  X,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import cashierApi from "../../../api/cashierApi";

// ---------------------------------------------------------------------------
// Config: map trạng thái / kênh mua trả về từ BE sang label + màu hiển thị
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "#fffbeb", color: "#b45309" },
  Paid: { label: "Đang hiệu lực", icon: CheckCircle2, bg: "#ecfdf5", color: "#047857" },
  Expired: { label: "Hết hạn", icon: Clock, bg: "#f1f5f9", color: "#64748b" },
  Cancelled: { label: "Đã hủy", icon: XCircle, bg: "#fff1f2", color: "#be123c" },
};

// BE trả về purchaseChannel dạng chuỗi hiển thị sẵn: "Online" | "Tại quầy"
const CHANNEL_CONFIG = {
  "Online": { label: "Online", icon: Globe, bg: "#f0f9ff", color: "#0369a1" },
  "Tại quầy": { label: "Tại quầy", icon: Store, bg: "#ecfdf5", color: "#047857" },
};

function formatCurrency(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("vi-VN") + "đ";
}

function formatDate(d) {
  if (!d) return "—";
  const datePart = d.split("T")[0];
  const [y, m, dd] = datePart.split("-");
  if (!y || !m || !dd) return d;
  return `${dd}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Styles object
/// ... (toàn bộ import và các phần khác giữ nguyên) ...

const S = {
  root: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  main: { flex: 1, overflow: "hidden", padding: "24px 32px", display: "flex", flexDirection: "column" },

  pageTitle: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  pageTitleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#065f46", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 },
  pageDesc: { fontSize: 13, color: "#64748b", margin: 0 },

  filterPanel: { marginBottom: 20, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12 },
  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  searchInput: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "10px 36px 10px 36px", fontSize: 13, color: "#334155", outline: "none" },
  clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 2 },
  select: { borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "10px 12px", fontSize: 13, color: "#334155", outline: "none", cursor: "pointer" },
  resetBtn: { borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" },

  card: { borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "14px 20px" },
  countText: { fontSize: 13, color: "#64748b" },
  countBold: { fontWeight: 600, color: "#0f172a" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" },
  th: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textTransform: "uppercase", whiteSpace: "nowrap" },
  thRight: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textAlign: "right", textTransform: "uppercase" },
  thCenter: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textAlign: "center", textTransform: "uppercase" },
  td: { padding: "14px 20px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle" },
  tdRight: { padding: "14px 20px", borderBottom: "1px solid #f8fafc", textAlign: "right", verticalAlign: "middle" },
  tdCenter: { padding: "14px 20px", borderBottom: "1px solid #f8fafc", textAlign: "center", verticalAlign: "middle" },
  memberRow: { display: "flex", alignItems: "center", gap: 10 },
  avatarImg: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e2e8f0" },
  avatarFallback: { width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#94a3b8" },
  memberName: { fontWeight: 600, color: "#0f172a", fontSize: 13 },
  memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", marginTop: 2 },
  planName: { color: "#334155" },
  dateRange: { color: "#475569", whiteSpace: "nowrap" },
  amountMain: { fontWeight: 600, color: "#0f172a" },
  amountOld: { fontSize: 11, color: "#94a3b8", textDecoration: "line-through" },

  badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600, backgroundColor: bg, color }),

  invoiceBtn: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "#0369a1", cursor: "pointer", whiteSpace: "nowrap" },
  invoiceBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: "#475569" },
  emptyDesc: { fontSize: 11, color: "#94a3b8" },

  loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" },
  errorState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
  retryBtn: { marginTop: 8, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" },

  scrollArea: { flex: 1, minHeight: 0, overflowY: "auto" },
  stickyHead: { position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 },

  // ---- Modal xem hóa đơn ----
  // Kích thước co giãn theo viewport (vw/vh) thay vì set cứng px, để hiển thị
  // hợp lý trên nhiều loại thiết bị (laptop, màn lớn, tablet...). Mobile nhỏ
  // được xử lý riêng bằng class "invoice-modal-box" trong <style> bên dưới.
  modalBackdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "4vh 4vw" },
  modalBox: {
    width: "clamp(320px, 60vw, 760px)",
    height: "clamp(420px, 85vh, 900px)",
    backgroundColor: "#fff",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  modalTitle: { fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 },
  modalHeaderActions: { display: "flex", alignItems: "center", gap: 8 },
  modalIconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "6px 10px", fontSize: 12, fontWeight: 500, color: "#475569", cursor: "pointer" },
  modalBody: { flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: "#fff" },
  invoiceFrame: { width: "100%", height: "100%", border: "none", display: "block", backgroundColor: "#fff" },
  invoiceImgWrap: { width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", backgroundColor: "#f1f5f9" },
  invoiceImg: { maxWidth: "100%", display: "block" },
};

// ---------------------------------------------------------------------------
// Badge components
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  const Icon = cfg.icon;
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <Icon size={12} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG["Online"];
  const Icon = cfg.icon;
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <Icon size={12} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function Avatar({ src, alt }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <span style={S.avatarFallback}>
        <User size={16} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "avatar"}
      style={S.avatarImg}
      onError={() => setErrored(true)}
    />
  );
}

function InvoiceButton({ item, onView, loading }) {
  return (
    <button
      style={{ ...S.invoiceBtn, ...(loading ? S.invoiceBtnDisabled : {}) }}
      className="invoice-btn"
      disabled={loading}
      onClick={() => onView(item)}
    >
      {loading ? <Loader2 className="spin" size={13} /> : <FileText size={13} />}
      Xem hóa đơn
    </button>
  );
}

function InvoiceModal({ state, onClose, onPrint, onDownload }) {
  if (!state.open) return null;

  const isPdf = state.contentType?.includes("pdf");
  const isHtml = state.contentType?.includes("html");
  const isImage = state.contentType?.startsWith("image/");
  const showIframe = isPdf || isHtml;

  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalBox} className="invoice-modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <p style={S.modalTitle}>
            Hóa đơn{state.item?.fullName ? ` - ${state.item.fullName}` : ""}
          </p>
          <div style={S.modalHeaderActions}>
            {!state.loading && !state.error && (
              <>
                <button style={S.modalIconBtn} onClick={onDownload}>
                  <Download size={13} /> Tải về
                </button>
                {showIframe && (
                  <button style={S.modalIconBtn} onClick={onPrint}>
                    <Printer size={13} /> In
                  </button>
                )}
              </>
            )}
            <button style={S.modalIconBtn} onClick={onClose}>
              <X size={13} /> Đóng
            </button>
          </div>
        </div>

        <div style={S.modalBody}>
          {state.loading ? (
            <div style={S.loadingState}>
              <Loader2 className="spin" size={28} color="#94a3b8" />
              <p style={S.emptyTitle}>Đang tải hóa đơn...</p>
            </div>
          ) : state.error ? (
            <div style={S.errorState}>
              <XCircle size={28} color="#f43f5e" />
              <p style={S.emptyTitle}>{state.error}</p>
            </div>
          ) : showIframe ? (
            <iframe
              id="invoice-print-frame"
              title="Hóa đơn"
              src={state.blobUrl}
              style={S.invoiceFrame}
            />
          ) : isImage ? (
            <div style={S.invoiceImgWrap}>
              <img src={state.blobUrl} alt="Hóa đơn" style={S.invoiceImg} />
            </div>
          ) : (
            <div style={S.errorState}>
              <XCircle size={28} color="#f43f5e" />
              <p style={S.emptyTitle}>Định dạng hóa đơn không được hỗ trợ xem trực tiếp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LichSuDangKyGoiTap() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    loading: false,
    error: null,
    blobUrl: "",
    contentType: "",
    item: null,
  });
  const loadingItemRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formData = useMemo(() => ({
    keyword: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    channel: channelFilter !== "all" ? channelFilter : undefined,
  }), [debouncedSearch, statusFilter, channelFilter]);

  async function fetchHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await cashierApi.getHisRegisPack(formData);
      const raw = res?.data ?? res;
      const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setHistory(data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải lịch sử đăng ký gói tập");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  function resetFilters() {
    setSearchTerm(""); setDebouncedSearch(""); setStatusFilter("all"); setChannelFilter("all");
  }

  async function handleViewInvoice(item) {
    const transactionId = item.transactionId ?? item.id;
    if (!transactionId) {
      alert("Không tìm thấy mã giao dịch");
      return;
    }

    loadingItemRef.current = item;
    setInvoiceModal({ open: true, loading: true, error: null, blobUrl: "", contentType: "", item });

    try {
      const { blob, contentType } = await cashierApi.getInvoice(transactionId);
      const blobUrl = URL.createObjectURL(blob);
      setInvoiceModal({ open: true, loading: false, error: null, blobUrl, contentType, item });
    } catch (err) {
      setInvoiceModal({
        open: true,
        loading: false,
        error: err?.message || "Không thể tải hóa đơn",
        blobUrl: "",
        contentType: "",
        item,
      });
    } finally {
      loadingItemRef.current = null;
    }
  }

  function closeInvoiceModal() {
    if (invoiceModal.blobUrl) {
      URL.revokeObjectURL(invoiceModal.blobUrl);
    }
    setInvoiceModal({ open: false, loading: false, error: null, blobUrl: "", contentType: "", item: null });
  }

  function handlePrintInvoice() {
    const iframe = document.getElementById("invoice-print-frame");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  function handleDownloadInvoice() {
    if (!invoiceModal.blobUrl) return;
    const a = document.createElement("a");
    a.href = invoiceModal.blobUrl;
    let ext = "jpg";
    if (invoiceModal.contentType?.includes("pdf")) ext = "pdf";
    else if (invoiceModal.contentType?.includes("html")) ext = "html";
    else if (invoiceModal.contentType?.includes("png")) ext = "png";
    a.download = `hoa-don-${invoiceModal.item?.transactionId ?? invoiceModal.item?.id ?? "invoice"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }
        input:focus { border-color: #059669 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.12) !important; }
        select:focus { border-color: #059669 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.12) !important; }
        tr:hover td { background-color: rgba(248,250,252,0.8); }
        .table-wrap { display: block; overflow-x: auto; }
        .mobile-cards { display: none; }
        .spin { animation: spin 0.8s linear infinite; }
        .invoice-btn:hover { background-color: #f0f9ff !important; border-color: #bae6fd !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .table-wrap { display: none !important; }
          .mobile-cards { display: flex !important; flex-direction: column; gap: 12px; padding: 16px; }
          .filter-grid { grid-template-columns: 1fr !important; }
          .main-pad { padding: 16px !important; }
        }
        /* Modal hóa đơn: trên màn hình nhỏ chiếm gần full màn hình để dễ đọc/thao tác */
        @media (max-width: 640px) {
          .invoice-modal-box {
            width: 96vw !important;
            height: 92vh !important;
          }
        }
      `}</style>

      <div style={S.root}>
        <main className="main-pad" style={S.main}>
          <div style={S.pageTitle}>
            <div style={S.pageTitleIcon}>
              <History size={20} color="#fff" />
            </div>
            <div>
              <h1 style={S.h1}>Lịch sử đăng ký gói tập</h1>
              <p style={S.pageDesc}>Xem lại lịch sử mua và gia hạn gói tập của hội viên</p>
            </div>
          </div>

          <div style={S.filterPanel}>
            <div className="filter-grid" style={S.filterGrid}>
              <div style={S.searchWrap}>
                <span style={S.searchIcon}><Search size={16} /></span>
                <input
                  style={S.searchInput}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); }}
                  placeholder="Tìm theo tên hội viên hoặc số điện thoại..."
                />
                {searchTerm && (
                  <button style={S.clearBtn} onClick={() => setSearchTerm("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <select style={S.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }}>
                <option value="all">Tất cả trạng thái</option>
                <option value="Pending">Chờ thanh toán</option>
                <option value="Paid">Đang hiệu lực</option>
                <option value="Cancelled">Đã hủy</option>
                <option value="Expired">Hết hạn</option>
              </select>

              <select style={S.select} value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); }}>
                <option value="all">Tất cả kênh mua</option>
                <option value="Online">Online</option>
                <option value="Tại quầy">Tại quầy</option>
              </select>

              <button style={S.resetBtn} onClick={resetFilters}>Đặt lại</button>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <p style={S.countText}>
                {loading ? "Đang tải..." : (
                  <>Tìm thấy <span style={S.countBold}>{history.length}</span> giao dịch</>
                )}
              </p>
            </div>

            {loading ? (
              <div style={S.loadingState}>
                <Loader2 className="spin" size={28} color="#94a3b8" />
                <p style={S.emptyTitle}>Đang tải lịch sử đăng ký...</p>
              </div>
            ) : error ? (
              <div style={S.errorState}>
                <XCircle size={28} color="#f43f5e" />
                <p style={S.emptyTitle}>{error}</p>
                <button style={S.retryBtn} onClick={fetchHistory}>Thử lại</button>
              </div>
            ) : history.length === 0 ? (
              <div style={S.emptyState}>
                <Search size={28} color="#cbd5e1" />
                <p style={S.emptyTitle}>Không tìm thấy giao dịch phù hợp</p>
                <p style={S.emptyDesc}>Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng</p>
              </div>
            ) : (
              <>
                <div className="table-wrap" style={S.scrollArea}>
                  <table style={S.table}>
                    <thead style={S.stickyHead}>
                      <tr>
                        <th style={S.th}>Hội viên</th>
                        <th style={S.th}>Gói tập</th>
                        <th style={S.th}>Kênh mua</th>
                        <th style={S.th}>Thời hạn</th>
                        <th style={S.thRight}>Số tiền</th>
                        <th style={S.th}>Trạng thái</th>
                        <th style={S.thCenter}>Hóa đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, idx) => {
                        const rowKey = `${item.phone}-${item.planName}-${item.startDate}-${idx}`;
                        const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === item;
                        return (
                          <tr key={rowKey}>
                            <td style={S.td}>
                              <div style={S.memberRow}>
                                <Avatar src={item.urlImg} alt={item.fullName} />
                                <div>
                                  <p style={S.memberName}>{item.fullName}</p>
                                  <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td style={S.td}><span style={S.planName}>{item.planName}</span></td>
                            <td style={S.td}><ChannelBadge channel={item.purchaseChannel} /></td>
                            <td style={S.td}><span style={S.dateRange}>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span></td>
                            <td style={S.tdRight}>
                              <p style={S.amountMain}>{formatCurrency(item.amount)}</p>
                              {item.amount !== item.originalAmount && (
                                <p style={S.amountOld}>{formatCurrency(item.originalAmount)}</p>
                              )}
                            </td>
                            <td style={S.td}><StatusBadge status={item.status} /></td>
                            <td style={S.tdCenter}>
                              <InvoiceButton item={item} onView={handleViewInvoice} loading={isThisLoading} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-cards" style={S.scrollArea}>
                  {history.map((item, idx) => {
                    const rowKey = `${item.phone}-${item.planName}-${item.startDate}-${idx}`;
                    const isThisLoading = invoiceModal.open && invoiceModal.loading && invoiceModal.item === item;
                    return (
                      <div key={rowKey} style={{ borderRadius: 12, border: "1px solid #f1f5f9", padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={S.memberRow}>
                            <Avatar src={item.urlImg} alt={item.fullName} />
                            <div>
                              <p style={S.memberName}>{item.fullName}</p>
                              <p style={S.memberPhone}><Phone size={10} />{item.phone}</p>
                            </div>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
                          <span style={{ color: "#475569" }}>{item.planName}</span>
                          <ChannelBadge channel={item.purchaseChannel} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#64748b" }}>
                          <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{formatCurrency(item.amount)}</span>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                          <InvoiceButton item={item} onView={handleViewInvoice} loading={isThisLoading} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <InvoiceModal
        state={invoiceModal}
        onClose={closeInvoiceModal}
        onPrint={handlePrintInvoice}
        onDownload={handleDownloadInvoice}
      />
    </>
  );
}