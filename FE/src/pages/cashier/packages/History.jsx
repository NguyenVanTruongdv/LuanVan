import {
  CheckCircle2,
  ChevronLeft, ChevronRight,
  Clock,
  Globe,
  History,
  Hourglass,
  Phone,
  Search,
  Store,
  X,
  XCircle
} from "lucide-react";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_HISTORY = [
  { memberPackageId: 1042, member: { fullName: "Nguyễn Văn An", phone: "0912 345 678", email: "an.nguyen@gmail.com" }, planName: "Gói 1 Tháng", purchaseChannel: "Online", giaGoc: 350000, amount: 350000, soNgayTangThucTe: 0, startDate: "2025-07-01", expiryDate: "2025-07-31", status: "Active", createdAt: "2025-07-01T08:12:00" },
  { memberPackageId: 1041, member: { fullName: "Nguyễn Văn An", phone: "0912 345 678", email: "an.nguyen@gmail.com" }, planName: "Gói 3 Tháng", purchaseChannel: "Counter", giaGoc: 950000, amount: 855000, soNgayTangThucTe: 7, startDate: "2025-04-01", expiryDate: "2025-07-01", status: "Active", createdAt: "2025-04-01T09:30:00" },
  { memberPackageId: 1040, member: { fullName: "Trần Thị Bích", phone: "0987 654 321", email: "bich.tran@gmail.com" }, planName: "Gói 6 Tháng", purchaseChannel: "Counter", giaGoc: 1800000, amount: 1700000, soNgayTangThucTe: 15, startDate: "2025-06-15", expiryDate: "2025-12-15", status: "Active", createdAt: "2025-06-15T14:05:00" },
  { memberPackageId: 1039, member: { fullName: "Lê Hoàng Phúc", phone: "0934 112 233", email: "phuc.le@gmail.com" }, planName: "Gói 1 Tháng", purchaseChannel: "Online", giaGoc: 350000, amount: 350000, soNgayTangThucTe: 0, startDate: "2025-06-20", expiryDate: "2025-07-20", status: "Pending", createdAt: "2025-06-20T19:42:00" },
  { memberPackageId: 1038, member: { fullName: "Phạm Thu Hà", phone: "0978 223 344", email: "ha.pham@gmail.com" }, planName: "Gói 1 Năm", purchaseChannel: "Online", giaGoc: 3600000, amount: 3200000, soNgayTangThucTe: 30, startDate: "2025-01-10", expiryDate: "2026-01-09", status: "Active", createdAt: "2025-01-10T10:00:00" },
  { memberPackageId: 1037, member: { fullName: "Đỗ Minh Quân", phone: "0909 887 766", email: "quan.do@gmail.com" }, planName: "Gói 3 Tháng", purchaseChannel: "Counter", giaGoc: 950000, amount: 950000, soNgayTangThucTe: 0, startDate: "2025-02-01", expiryDate: "2025-05-01", status: "Cancelled", createdAt: "2025-02-01T11:20:00" },
  { memberPackageId: 1036, member: { fullName: "Vũ Ngọc Lan", phone: "0966 554 433", email: "lan.vu@gmail.com" }, planName: "Gói 1 Tháng", purchaseChannel: "Counter", giaGoc: 350000, amount: 315000, soNgayTangThucTe: 3, startDate: "2025-05-05", expiryDate: "2025-06-08", status: "Expired", createdAt: "2025-05-05T16:48:00" },
  { memberPackageId: 1035, member: { fullName: "Hoàng Gia Bảo", phone: "0945 667 788", email: "bao.hoang@gmail.com" }, planName: "Gói 6 Tháng", purchaseChannel: "Online", giaGoc: 1800000, amount: 1800000, soNgayTangThucTe: 0, startDate: "2025-06-01", expiryDate: "2025-12-01", status: "Active", createdAt: "2025-06-01T08:55:00" },
];

const STATUS_CONFIG = {
  Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  Active: { label: "Đang hiệu lực", icon: CheckCircle2, bg: "#ecfdf5", color: "#047857", dot: "#10b981" },
  Expired: { label: "Hết hạn", icon: Clock, bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
  Cancelled: { label: "Đã hủy", icon: XCircle, bg: "#fff1f2", color: "#be123c", dot: "#f43f5e" },
};

const CHANNEL_CONFIG = {
  Online: { label: "Online", icon: Globe, bg: "#f0f9ff", color: "#0369a1" },
  Counter: { label: "Tại quầy", icon: Store, bg: "#ecfdf5", color: "#047857" },
};

const PAGE_SIZE = 5;

function formatCurrency(v) { return v.toLocaleString("vi-VN") + "đ"; }
function formatDate(d) { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }
function stripDiacritics(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); }
function normalizePhone(p) { return p.replace(/\s|-/g, ""); }

// ---------------------------------------------------------------------------
// Styles object
// ---------------------------------------------------------------------------
const S = {
  // Layout
  root: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  main: { flex: 1, overflowY: "auto", padding: "24px 32px" },

  // Header
  header: { display: "flex", height: 64, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "0 24px", flexShrink: 0 },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 13, fontWeight: 700, color: "#fff" },
  brandName: { fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 },
  brandSub: { fontSize: 11, fontWeight: 600, color: "#047857" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  iconBtn: { padding: 8, borderRadius: 9999, border: "none", background: "none", cursor: "pointer", color: "#94a3b8", display: "flex" },
  branchBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#334155" },
  avatar: { width: 32, height: 32, borderRadius: 9999, backgroundColor: "#065f46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" },
  userName: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  userRole: { fontSize: 11, color: "#94a3b8" },

  // Page title
  pageTitle: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  pageTitleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#065f46", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  h1: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 },
  pageDesc: { fontSize: 13, color: "#64748b", margin: 0 },

  // Filter panel
  filterPanel: { marginBottom: 20, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: 20 },
  filterGrid: { display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12 },
  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" },
  searchInput: { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "10px 36px 10px 36px", fontSize: 13, color: "#334155", outline: "none" },
  clearBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 2 },
  select: { borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "10px 12px", fontSize: 13, color: "#334155", outline: "none", cursor: "pointer" },
  resetBtn: { borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" },

  // Results card
  card: { borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "14px 20px" },
  countText: { fontSize: 13, color: "#64748b" },
  countBold: { fontWeight: 600, color: "#0f172a" },

  // Table
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" },
  th: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textTransform: "uppercase", whiteSpace: "nowrap" },
  thRight: { padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9", textAlign: "right", textTransform: "uppercase" },
  td: { padding: "14px 20px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle" },
  tdRight: { padding: "14px 20px", borderBottom: "1px solid #f8fafc", textAlign: "right", verticalAlign: "middle" },
  memberName: { fontWeight: 600, color: "#0f172a", fontSize: 13 },
  memberPhone: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", marginTop: 2 },
  planName: { color: "#334155" },
  dateRange: { color: "#475569", whiteSpace: "nowrap" },
  amountMain: { fontWeight: 600, color: "#0f172a" },
  amountOld: { fontSize: 11, color: "#94a3b8", textDecoration: "line-through" },

  // Badges
  badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600, backgroundColor: bg, color }),

  // Empty state
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 24px", textAlign: "center" },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: "#475569" },
  emptyDesc: { fontSize: 11, color: "#94a3b8" },

  // Pagination
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", padding: "14px 20px" },
  pageInfo: { fontSize: 11, color: "#94a3b8" },
  pageButtons: { display: "flex", alignItems: "center", gap: 8 },
  pageBtn: (disabled) => ({ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: 13, fontWeight: 500, color: disabled ? "#cbd5e1" : "#475569", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }),

  // Mobile cards
  mobileList: { display: "flex", flexDirection: "column", gap: 12, padding: 16 },
  mobileCard: { borderRadius: 12, border: "1px solid #f1f5f9", padding: 16 },
  mobileCardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  mobileCardMid: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 13 },
  mobileCardBot: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#64748b" },
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
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.Counter;
  const Icon = cfg.icon;
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <Icon size={12} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}



// ---------------------------------------------------------------------------
// Top Header
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LichSuDangKyGoiTap() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = stripDiacritics(searchTerm.trim());
    const keywordDigits = normalizePhone(searchTerm.trim());
    return MOCK_HISTORY.filter((item) => {
      const matchesKeyword = keyword === ""
        ? true
        : stripDiacritics(item.member.fullName).includes(keyword) ||
        normalizePhone(item.member.phone).includes(keywordDigits);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesChannel = channelFilter === "all" || item.purchaseChannel === channelFilter;
      return matchesKeyword && matchesStatus && matchesChannel;
    });
  }, [searchTerm, statusFilter, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearchTerm(""); setStatusFilter("all"); setChannelFilter("all"); setPage(1);
  }

  // Responsive: detect mobile by window width (simple approach)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
        @media (max-width: 768px) {
          .table-wrap { display: none !important; }
          .mobile-cards { display: flex !important; flex-direction: column; gap: 12px; padding: 16px; }
          .filter-grid { grid-template-columns: 1fr !important; }
          .main-pad { padding: 16px !important; }
        }
      `}</style>

      <div style={S.root}>
        <main className="main-pad" style={S.main}>
          {/* Page title */}
          <div style={S.pageTitle}>
            <div style={S.pageTitleIcon}>
              <History size={20} color="#fff" />
            </div>
            <div>
              <h1 style={S.h1}>Lịch sử đăng ký gói tập</h1>
              <p style={S.pageDesc}>Xem lại lịch sử mua và gia hạn gói tập của hội viên</p>
            </div>
          </div>

          {/* Filters */}
          <div style={S.filterPanel}>
            <div className="filter-grid" style={S.filterGrid}>
              <div style={S.searchWrap}>
                <span style={S.searchIcon}><Search size={16} /></span>
                <input
                  style={S.searchInput}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  placeholder="Tìm theo tên hội viên hoặc số điện thoại..."
                />
                {searchTerm && (
                  <button style={S.clearBtn} onClick={() => setSearchTerm("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <select style={S.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="all">Tất cả trạng thái</option>
                <option value="Pending">Chờ thanh toán</option>
                <option value="Active">Đang hiệu lực</option>
                <option value="Active">Đang hiệu lục</option>
                <option value="Cancelled">Đã hủy</option>
              </select>

              <select style={S.select} value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}>
                <option value="all">Tất cả kênh mua</option>
                <option value="Online">Online</option>
                <option value="Counter">Tại quầy</option>
              </select>

              <button style={S.resetBtn} onClick={resetFilters}>Đặt lại</button>
            </div>
          </div>

          {/* Results */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <p style={S.countText}>
                Tìm thấy <span style={S.countBold}>{filtered.length}</span> giao dịch
              </p>
            </div>

            {filtered.length === 0 ? (
              <div style={S.emptyState}>
                <Search size={28} color="#cbd5e1" />
                <p style={S.emptyTitle}>Không tìm thấy giao dịch phù hợp</p>
                <p style={S.emptyDesc}>Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="table-wrap">
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Hội viên</th>
                        <th style={S.th}>Gói tập</th>
                        <th style={S.th}>Kênh mua</th>
                        <th style={S.th}>Thời hạn</th>
                        <th style={S.thRight}>Số tiền</th>
                        <th style={S.th}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
                        <tr key={item.memberPackageId}>
                          <td style={S.td}>
                            <p style={S.memberName}>{item.member.fullName}</p>
                            <p style={S.memberPhone}><Phone size={10} />{item.member.phone}</p>
                          </td>
                          <td style={S.td}><span style={S.planName}>{item.planName}</span></td>
                          <td style={S.td}><ChannelBadge channel={item.purchaseChannel} /></td>
                          <td style={S.td}><span style={S.dateRange}>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span></td>
                          <td style={S.tdRight}>
                            <p style={S.amountMain}>{formatCurrency(item.amount)}</p>
                            {item.amount !== item.giaGoc && <p style={S.amountOld}>{formatCurrency(item.giaGoc)}</p>}
                          </td>
                          <td style={S.td}><StatusBadge status={item.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mobile-cards">
                  {pageItems.map((item) => (
                    <div key={item.memberPackageId} style={S.mobileCard}>
                      <div style={S.mobileCardTop}>
                        <div>
                          <p style={S.memberName}>{item.member.fullName}</p>
                          <p style={S.memberPhone}><Phone size={10} />{item.member.phone}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div style={S.mobileCardMid}>
                        <span style={{ color: "#475569" }}>{item.planName}</span>
                        <ChannelBadge channel={item.purchaseChannel} />
                      </div>
                      <div style={S.mobileCardBot}>
                        <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div style={S.pagination}>
                  <p style={S.pageInfo}>Trang {currentPage} / {totalPages}</p>
                  <div style={S.pageButtons}>
                    <button
                      style={S.pageBtn(currentPage === 1)}
                      disabled={currentPage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Trước
                    </button>
                    <button
                      style={S.pageBtn(currentPage === totalPages)}
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Sau <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}