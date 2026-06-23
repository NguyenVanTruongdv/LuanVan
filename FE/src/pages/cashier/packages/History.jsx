import { useMemo, useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LayoutGrid,
  Users,
  ListChecks,
  CheckSquare,
  UserPlus,
  Package,
  RefreshCw,
  History,
  Camera,
  ScanLine,
  Clock,
  AlertTriangle,
  FileText,
  List,
  LogOut,
  Globe,
  Store,
  CheckCircle2,
  XCircle,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
} from "lucide-react";

/**
 * Trang "Lịch sử đăng ký gói tập" — VT Gym Cashier Portal
 * ----------------------------------------------------------------
 * Mapping với model BE.Models.MemberPackage:
 *   memberPackageId   -> MemberPackageId
 *   member.fullName   -> Member.FullName      (join qua MemberId)
 *   member.phone      -> Member.Phone
 *   member.email      -> Member.Email
 *   planName          -> MembershipPlan.PlanName (join qua PlanId)
 *   giaGoc            -> GiaGoc
 *   amount            -> Amount
 *   soNgayTangThucTe  -> SoNgayTangThucTe
 *   startDate         -> StartDate
 *   expiryDate        -> ExpiryDate
 *   status            -> PackageStatus  ('Pending' | 'Active' | 'Expired' | 'Cancelled')
 *   purchaseChannel   -> (CỘT MỚI ĐỀ XUẤT) PurchaseChannel nvarchar(20)
 *                        giá trị gợi ý: 'Online' | 'Counter'
 *                        Ghi nhận kênh hội viên dùng khi mua/gia hạn gói.
 *   createdAt         -> CreatedAt
 *
 * Khi đội backend bổ sung cột PurchaseChannel vào bảng member_packages,
 * chỉ cần trả field này trong API — UI bên dưới đã có sẵn badge + filter
 * cho 2 giá trị "Online" / "Tại quầy", không cần đổi gì thêm ở phần hiển thị.
 *
 * TODO khi nối API thật:
 *   GET /api/member-packages/history?search=&status=&channel=&page=&pageSize=
 *   Thay MOCK_HISTORY + useMemo filter bằng state từ response, giữ nguyên
 *   phần state (searchTerm, statusFilter, channelFilter, page) đã viết sẵn.
 */

// ---------------------------------------------------------------------------
// Mock data — xoá phần này khi nối API thật
// ---------------------------------------------------------------------------
const MOCK_HISTORY = [
  {
    memberPackageId: 1042,
    member: { fullName: "Nguyễn Văn An", phone: "0912 345 678", email: "an.nguyen@gmail.com" },
    planName: "Gói 1 Tháng",
    purchaseChannel: "Online",
    giaGoc: 350000,
    amount: 350000,
    soNgayTangThucTe: 0,
    startDate: "2025-07-01",
    expiryDate: "2025-07-31",
    status: "Active",
    createdAt: "2025-07-01T08:12:00",
  },
  {
    memberPackageId: 1041,
    member: { fullName: "Nguyễn Văn An", phone: "0912 345 678", email: "an.nguyen@gmail.com" },
    planName: "Gói 3 Tháng",
    purchaseChannel: "Counter",
    giaGoc: 950000,
    amount: 855000,
    soNgayTangThucTe: 7,
    startDate: "2025-04-01",
    expiryDate: "2025-07-01",
    status: "Expired",
    createdAt: "2025-04-01T09:30:00",
  },
  {
    memberPackageId: 1040,
    member: { fullName: "Trần Thị Bích", phone: "0987 654 321", email: "bich.tran@gmail.com" },
    planName: "Gói 6 Tháng",
    purchaseChannel: "Counter",
    giaGoc: 1800000,
    amount: 1700000,
    soNgayTangThucTe: 15,
    startDate: "2025-06-15",
    expiryDate: "2025-12-15",
    status: "Active",
    createdAt: "2025-06-15T14:05:00",
  },
  {
    memberPackageId: 1039,
    member: { fullName: "Lê Hoàng Phúc", phone: "0934 112 233", email: "phuc.le@gmail.com" },
    planName: "Gói 1 Tháng",
    purchaseChannel: "Online",
    giaGoc: 350000,
    amount: 350000,
    soNgayTangThucTe: 0,
    startDate: "2025-06-20",
    expiryDate: "2025-07-20",
    status: "Pending",
    createdAt: "2025-06-20T19:42:00",
  },
  {
    memberPackageId: 1038,
    member: { fullName: "Phạm Thu Hà", phone: "0978 223 344", email: "ha.pham@gmail.com" },
    planName: "Gói 1 Năm",
    purchaseChannel: "Online",
    giaGoc: 3600000,
    amount: 3200000,
    soNgayTangThucTe: 30,
    startDate: "2025-01-10",
    expiryDate: "2026-01-09",
    status: "Active",
    createdAt: "2025-01-10T10:00:00",
  },
  {
    memberPackageId: 1037,
    member: { fullName: "Đỗ Minh Quân", phone: "0909 887 766", email: "quan.do@gmail.com" },
    planName: "Gói 3 Tháng",
    purchaseChannel: "Counter",
    giaGoc: 950000,
    amount: 950000,
    soNgayTangThucTe: 0,
    startDate: "2025-02-01",
    expiryDate: "2025-05-01",
    status: "Cancelled",
    createdAt: "2025-02-01T11:20:00",
  },
  {
    memberPackageId: 1036,
    member: { fullName: "Vũ Ngọc Lan", phone: "0966 554 433", email: "lan.vu@gmail.com" },
    planName: "Gói 1 Tháng",
    purchaseChannel: "Counter",
    giaGoc: 350000,
    amount: 315000,
    soNgayTangThucTe: 3,
    startDate: "2025-05-05",
    expiryDate: "2025-06-08",
    status: "Expired",
    createdAt: "2025-05-05T16:48:00",
  },
  {
    memberPackageId: 1035,
    member: { fullName: "Hoàng Gia Bảo", phone: "0945 667 788", email: "bao.hoang@gmail.com" },
    planName: "Gói 6 Tháng",
    purchaseChannel: "Online",
    giaGoc: 1800000,
    amount: 1800000,
    soNgayTangThucTe: 0,
    startDate: "2025-06-01",
    expiryDate: "2025-12-01",
    status: "Active",
    createdAt: "2025-06-01T08:55:00",
  },
];

// ---------------------------------------------------------------------------
// Cấu hình hiển thị trạng thái & kênh mua
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  Pending: { label: "Chờ thanh toán", icon: Hourglass, bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Active: { label: "Đang hiệu lực", icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Expired: { label: "Hết hạn", icon: Clock, bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  Cancelled: { label: "Đã hủy", icon: XCircle, bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

const CHANNEL_CONFIG = {
  Online: { label: "Online", icon: Globe, bg: "bg-sky-50", text: "text-sky-700" },
  Counter: { label: "Tại quầy", icon: Store, bg: "bg-emerald-50", text: "text-emerald-700" },
};

const PAGE_SIZE = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(value) {
  return value.toLocaleString("vi-VN") + "đ";
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
function stripDiacritics(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function normalizePhone(phone) {
  return phone.replace(/\s|-/g, "");
}

// ---------------------------------------------------------------------------
// Badge components
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={13} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.Counter;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={13} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (giữ nguyên cấu trúc menu như Cashier Portal)
// ---------------------------------------------------------------------------
function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 pt-6 pb-2">
        <p className="text-[11px] font-bold tracking-wider text-slate-400">MENU CHÍNH</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 text-[14px]">
        <SidebarLink icon={LayoutGrid} label="Tổng quan" />

        <SidebarGroup icon={Users} label="Hội viên">
          <SidebarLink icon={List} label="Danh sách hội viên" sub />
          <SidebarLink icon={CheckSquare} label="Kích hoạt hội viên" sub />
          <SidebarLink icon={UserPlus} label="Tạo hội viên mới" sub />
        </SidebarGroup>

        <SidebarGroup icon={Package} label="Gói tập">
          <SidebarLink icon={RefreshCw} label="Gia hạn gói tập" sub />
          <SidebarLink icon={History} label="Lịch sử đăng ký" sub active />
        </SidebarGroup>

        <SidebarGroup icon={Camera} label="Check-in">
          <SidebarLink icon={ScanLine} label="Check-in" sub />
          <SidebarLink icon={Clock} label="Lịch sử check-in" sub />
        </SidebarGroup>

        <SidebarGroup icon={AlertTriangle} label="Sự cố">
          <SidebarLink icon={FileText} label="Báo cáo sự cố" sub />
          <SidebarLink icon={List} label="Danh sách sự cố" sub />
        </SidebarGroup>
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button className="flex w-full items-center gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function SidebarGroup({ icon: Icon, label, children }) {
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between rounded-lg px-2 py-2 text-slate-700">
        <span className="flex items-center gap-2 font-medium">
          <Icon size={17} className="text-slate-500" />
          {label}
        </span>
        <ChevronDown size={15} className="text-slate-400" />
      </div>
      <div className="ml-1 border-l border-slate-100 pl-2">{children}</div>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, sub, active }) {
  return (
    <a
      href="#"
      className={`mt-0.5 flex items-center gap-2 rounded-lg px-3 py-2 ${sub ? "ml-1" : ""} ${
        active
          ? "bg-emerald-50 font-semibold text-emerald-800"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} className={active ? "text-emerald-700" : "text-slate-400"} />
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Top header
// ---------------------------------------------------------------------------
function TopHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
          <span className="text-sm font-bold text-white">VT</span>
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold text-slate-900">VT Gym</p>
          <p className="text-xs font-medium text-emerald-700">Cashier Portal</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button className="rounded-full p-2 text-slate-400 hover:bg-slate-50">
          <Bell size={19} />
        </button>
        <button className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex">
          Chi nhánh Quận 1
          <ChevronDown size={15} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
            NA
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-slate-800">thuphuongdn2</p>
            <p className="text-xs text-slate-400">Đối tác</p>
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Page content — Lịch sử đăng ký gói tập
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
      const matchesKeyword =
        keyword === ""
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
    setSearchTerm("");
    setStatusFilter("all");
    setChannelFilter("all");
    setPage(1);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {/* Tiêu đề trang */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800">
              <History size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Lịch sử đăng ký gói tập</h1>
              <p className="text-sm text-slate-500">Xem lại lịch sử mua và gia hạn gói tập của hội viên</p>
            </div>
          </div>

          {/* Bộ lọc / tìm kiếm */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo tên hội viên hoặc số điện thoại..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Pending">Chờ thanh toán</option>
                <option value="Active">Đang hiệu lực</option>
                <option value="Expired">Hết hạn</option>
                <option value="Cancelled">Đã hủy</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">Tất cả kênh mua</option>
                <option value="Online">Online</option>
                <option value="Counter">Tại quầy</option>
              </select>

              <button
                onClick={resetFilters}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Đặt lại
              </button>
            </div>
          </div>

          {/* Kết quả */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <p className="text-sm text-slate-500">
                Tìm thấy <span className="font-semibold text-slate-800">{filtered.length}</span> giao dịch
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <Search size={28} className="text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Không tìm thấy giao dịch phù hợp</p>
                <p className="text-xs text-slate-400">Thử đổi từ khóa hoặc xóa bộ lọc đang áp dụng</p>
              </div>
            ) : (
              <>
                {/* Bảng — desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-3 font-semibold">Hội viên</th>
                        <th className="px-5 py-3 font-semibold">Gói tập</th>
                        <th className="px-5 py-3 font-semibold">Kênh mua</th>
                        <th className="px-5 py-3 font-semibold">Thời hạn</th>
                        <th className="px-5 py-3 text-right font-semibold">Số tiền</th>
                        <th className="px-5 py-3 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
                        <tr key={item.memberPackageId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800">{item.member.fullName}</p>
                            <p className="flex items-center gap-1 text-xs text-slate-400">
                              <Phone size={11} /> {item.member.phone}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">{item.planName}</td>
                          <td className="px-5 py-3.5">
                            <ChannelBadge channel={item.purchaseChannel} />
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(item.startDate)} → {formatDate(item.expiryDate)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="font-semibold text-slate-800">{formatCurrency(item.amount)}</p>
                            {item.amount !== item.giaGoc && (
                              <p className="text-xs text-slate-400 line-through">{formatCurrency(item.giaGoc)}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Danh sách thẻ — mobile */}
                <div className="flex flex-col gap-3 p-4 md:hidden">
                  {pageItems.map((item) => (
                    <div key={item.memberPackageId} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{item.member.fullName}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone size={11} /> {item.member.phone}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.planName}</span>
                        <ChannelBadge channel={item.purchaseChannel} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(item.startDate)} → {formatDate(item.expiryDate)}</span>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phân trang */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                  <p className="text-xs text-slate-400">
                    Trang {currentPage} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} /> Trước
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sau <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}