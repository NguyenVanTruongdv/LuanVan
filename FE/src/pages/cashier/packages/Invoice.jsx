import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    FileText,
    Globe,
    History,
    Loader2,
    MapPin,
    Phone,
    Printer,
    Search,
    Store,
    User,
    X,
    XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import managerApi from "../../../api/managerApi";

/*
  =========================================================================
  TRANG HÓA ĐƠN (dành cho thu ngân)
  =========================================================================
  Trang này có 2 "màn hình" chuyển qua lại bằng 1 biến state tên là "view":
    - view = "list"   -> hiển thị danh sách giao dịch dạng bảng (có phân trang)
    - view = "detail"  -> hiển thị chi tiết 1 giao dịch mà người dùng vừa bấm

  Bố cục file (đọc từ trên xuống dưới):
    1. Dữ liệu/hàm dùng chung: format tiền, format ngày, cấu hình màu trạng thái
    2. Các component nhỏ, tái sử dụng nhiều lần: StatusBadge, ChannelBadge, Avatar
    3. Component chính InvoiceOfCashier (nơi chứa toàn bộ logic + giao diện)
    4. Khối CSS ở cuối cùng (viết bằng CSS thường, không dùng thư viện ngoài)
  =========================================================================
*/

// -------------------------------------------------------------------------
// 1. DỮ LIỆU / HÀM DÙNG CHUNG
// -------------------------------------------------------------------------

// Số giao dịch hiển thị trên mỗi trang
const PAGE_SIZE = 10;

// Mỗi trạng thái giao dịch sẽ hiển thị 1 chữ, 1 màu, 1 icon riêng
const STATUS_INFO = {
    Pending: { text: "Chờ thanh toán", color: "#b45309", icon: Clock },
    Paid: { text: "Đã thanh toán", color: "#047857", icon: CheckCircle2 },
    Cancelled: { text: "Đã hủy", color: "#be123c", icon: XCircle },
};

// Mỗi kênh mua hàng cũng hiển thị 1 chữ, 1 màu, 1 icon riêng
const CHANNEL_INFO = {
    Online: { text: "Online", color: "#0369a1", icon: Globe },
    "Tại quầy": { text: "Tại quầy", color: "#047857", icon: Store },
};

// Đổi số tiền thành chuỗi có dấu chấm ngăn cách, ví dụ: 500000 -> "500.000đ"
function formatMoney(value) {
    const number = Number(value) || 0;
    return number.toLocaleString("vi-VN") + "đ";
}

// Đổi ngày dạng "2026-08-16T00:00:00" thành "16/08/2026"
function formatDate(isoDate) {
    if (!isoDate) return "—";
    const [year, month, day] = isoDate.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
}

// -------------------------------------------------------------------------
// 2. CÁC COMPONENT NHỎ, DÙNG LẠI NHIỀU LẦN
// -------------------------------------------------------------------------

// Nhãn màu tròn tròn hiển thị trạng thái giao dịch, ví dụ: "Đã thanh toán"
function StatusBadge({ status }) {
    const info = STATUS_INFO[status] || STATUS_INFO.Pending;
    const Icon = info.icon;
    return (
        <span className="badge" style={{ color: info.color, backgroundColor: info.color + "1f" }}>
            <Icon size={12} />
            {info.text}
        </span>
    );
}

// Nhãn màu tròn tròn hiển thị kênh mua hàng (Online / Tại quầy)
function ChannelBadge({ channel }) {
    const info = CHANNEL_INFO[channel] || CHANNEL_INFO.Online;
    const Icon = info.icon;
    return (
        <span className="badge" style={{ color: info.color, backgroundColor: info.color + "1f" }}>
            <Icon size={12} />
            {info.text}
        </span>
    );
}

// Ảnh đại diện hội viên. Nếu không có ảnh (hoặc ảnh lỗi) thì hiện icon người thay thế.
function Avatar({ src, name, size }) {
    const [loadError, setLoadError] = useState(false);
    const avatarSize = size || 36;

    if (!src || loadError) {
        return (
            <span className="avatar avatar-empty" style={{ width: avatarSize, height: avatarSize }}>
                <User size={avatarSize / 2} />
            </span>
        );
    }

    return (
        <img
            className="avatar"
            style={{ width: avatarSize, height: avatarSize }}
            src={src}
            alt={name}
            onError={() => setLoadError(true)}
        />
    );
}

// Một ô thông tin trong trang chi tiết, ví dụ: icon + "Số tiền" + "500.000đ"
function InfoBox({ icon: Icon, label, value, color }) {
    return (
        <div className="info-box" style={{ borderTopColor: color }}>
            <span className="info-box-icon" style={{ backgroundColor: color }}>
                <Icon size={18} />
            </span>
            <div>
                <p className="info-box-label" style={{ color }}>{label}</p>
                <p className="info-box-value">{value}</p>
            </div>
        </div>
    );
}

// Thanh điều hướng phân trang (Trước / các số trang / Sau)
function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    // Tính danh sách số trang sẽ hiển thị (tối đa 5 số, có dấu "..." nếu nhiều trang)
    function getPageNumbers() {
        const pages = [];
        const windowSize = 1; // số trang hiển thị mỗi bên của trang hiện tại

        pages.push(1);
        if (page - windowSize > 2) pages.push("...");
        for (let p = Math.max(2, page - windowSize); p <= Math.min(totalPages - 1, page + windowSize); p++) {
            pages.push(p);
        }
        if (page + windowSize < totalPages - 1) pages.push("...");
        if (totalPages > 1) pages.push(totalPages);

        return pages;
    }

    return (
        <div className="pagination">
            <button
                className="btn btn-outline btn-small"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
            >
                <ChevronLeft size={14} /> Trước
            </button>

            <div className="pagination-pages">
                {getPageNumbers().map((p, index) =>
                    p === "..." ? (
                        <span key={`dots-${index}`} className="pagination-dots">…</span>
                    ) : (
                        <button
                            key={p}
                            className={`pagination-page ${p === page ? "active" : ""}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    )
                )}
            </div>

            <button
                className="btn btn-outline btn-small"
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                Sau <ChevronRight size={14} />
            </button>
        </div>
    );
}

// -------------------------------------------------------------------------
// 3. COMPONENT CHÍNH
// -------------------------------------------------------------------------

export default function InvoiceOfCashier() {
    // ----- State: dữ liệu danh sách giao dịch -----
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);

    // ----- State: các bộ lọc -----
    const [keyword, setKeyword] = useState(""); // người dùng đang gõ
    const [searchKeyword, setSearchKeyword] = useState(""); // giá trị dùng để gọi API (debounce)
    const [statusFilter, setStatusFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");

    // ----- State: đang xem màn hình nào -----
    // view = "list"  -> bảng danh sách
    // view = "detail" -> chi tiết 1 giao dịch
    const [view, setView] = useState("list");
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // ----- State: phân trang (mỗi trang hiển thị 10 giao dịch) -----
    const [page, setPage] = useState(1);

    // ----- State: cửa sổ xem hóa đơn (modal) -----
    const [invoice, setInvoice] = useState({
        open: false,
        loading: false,
        error: null,
        fileUrl: "",
        fileType: "",
        transaction: null,
    });

    // Debounce ô tìm kiếm: chờ người dùng ngừng gõ 400ms rồi mới cập nhật
    // searchKeyword (tránh gọi API liên tục theo từng phím bấm)
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchKeyword(keyword.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [keyword]);

    // Gọi API lấy danh sách giao dịch mỗi khi 1 trong các bộ lọc thay đổi
    useEffect(() => {
        loadTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchKeyword, statusFilter, channelFilter]);

    // Mỗi khi đổi bộ lọc thì quay về trang 1 (tránh đứng ở trang trống)
    useEffect(() => {
        setPage(1);
    }, [searchKeyword, statusFilter, channelFilter]);

    async function loadTransactions() {
        setLoading(true);
        setErrorMessage(null);
        try {
            const params = {
                keyword: searchKeyword || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                channel: channelFilter !== "all" ? channelFilter : undefined,
            };
            const res = await managerApi.getTransactions(params);
            const raw = res?.data ?? res;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            setTransactions(list);
        } catch (err) {
            setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải hóa đơn");
        } finally {
            setLoading(false);
        }
    }

    function resetFilters() {
        setKeyword("");
        setSearchKeyword("");
        setStatusFilter("all");
        setChannelFilter("all");
    }

    // Tính nhanh vài con số thống kê từ TOÀN BỘ danh sách (không phụ thuộc trang hiện tại)
    const totalCount = transactions.length;
    const paidTransactions = transactions.filter((t) => t.status === "Paid");
    const pendingCount = transactions.filter((t) => t.status === "Pending").length;
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Phân trang: cắt mảng transactions ra thành từng trang PAGE_SIZE giao dịch
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safePage = Math.min(page, totalPages); // tránh đứng ở trang trống khi dữ liệu thay đổi
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const pageTransactions = transactions.slice(startIndex, startIndex + PAGE_SIZE);

    // Chuyển sang màn hình chi tiết
    function openDetail(transaction) {
        setSelectedTransaction(transaction);
        setView("detail");
    }

    // Quay lại màn hình danh sách
    function backToList() {
        setView("list");
        setSelectedTransaction(null);
    }

    // Mở cửa sổ xem hóa đơn (gọi API lấy file hóa đơn về)
    async function openInvoice(transaction) {
        const transactionId = transaction.transactionId ?? transaction.id;
        if (!transactionId) {
            alert("Không tìm thấy mã giao dịch");
            return;
        }

        setInvoice({ open: true, loading: true, error: null, fileUrl: "", fileType: "", transaction });

        try {
            const { blob, contentType } = await managerApi.getInvoice(transactionId);
            const fileUrl = URL.createObjectURL(blob);
            setInvoice({ open: true, loading: false, error: null, fileUrl, fileType: contentType, transaction });
        } catch (err) {
            setInvoice({
                open: true,
                loading: false,
                error: err?.message || "Không thể tải hóa đơn",
                fileUrl: "",
                fileType: "",
                transaction,
            });
        }
    }

    function closeInvoice() {
        if (invoice.fileUrl) URL.revokeObjectURL(invoice.fileUrl);
        setInvoice({ open: false, loading: false, error: null, fileUrl: "", fileType: "", transaction: null });
    }

    function printInvoice() {
        const iframe = document.getElementById("invoice-frame");
        if (iframe) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    }

    function downloadInvoice() {
        if (!invoice.fileUrl) return;
        let extension = "jpg";
        if (invoice.fileType.includes("pdf")) extension = "pdf";
        else if (invoice.fileType.includes("html")) extension = "html";
        else if (invoice.fileType.includes("png")) extension = "png";

        const link = document.createElement("a");
        link.href = invoice.fileUrl;
        link.download = `hoa-don-${invoice.transaction?.transactionId ?? "invoice"}.${extension}`;
        link.click();
    }

    function goToPage(newPage) {
        const clamped = Math.max(1, Math.min(newPage, totalPages));
        setPage(clamped);
        // Cuộn lên đầu bảng cho dễ nhìn khi đổi trang
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <div className="page">
            <style>{CSS}</style>

            {view === "detail" ? (
                <DetailScreen
                    transaction={selectedTransaction}
                    onBack={backToList}
                    onOpenInvoice={openInvoice}
                />
            ) : (
                <ListScreen
                    transactions={pageTransactions}
                    loading={loading}
                    errorMessage={errorMessage}
                    onRetry={loadTransactions}
                    totalCount={totalCount}
                    totalRevenue={totalRevenue}
                    paidCount={paidTransactions.length}
                    pendingCount={pendingCount}
                    keyword={keyword}
                    onKeywordChange={setKeyword}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    channelFilter={channelFilter}
                    onChannelChange={setChannelFilter}
                    onResetFilters={resetFilters}
                    onOpenDetail={openDetail}
                    onOpenInvoice={openInvoice}
                    page={safePage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    startIndex={startIndex}
                />
            )}

            {invoice.open && (
                <InvoiceModal
                    invoice={invoice}
                    onClose={closeInvoice}
                    onPrint={printInvoice}
                    onDownload={downloadInvoice}
                />
            )}
        </div>
    );
}

// -------------------------------------------------------------------------
// MÀN HÌNH DANH SÁCH GIAO DỊCH
// -------------------------------------------------------------------------
function ListScreen(props) {
    const {
        transactions, loading, errorMessage, onRetry,
        totalCount, totalRevenue, paidCount, pendingCount,
        keyword, onKeywordChange, statusFilter, onStatusChange,
        channelFilter, onChannelChange, onResetFilters,
        onOpenDetail, onOpenInvoice,
        page, totalPages, onPageChange, startIndex,
    } = props;

    return (
        <>
            {/* ----- Tiêu đề trang ----- */}
            <div className="page-title">
                <span className="page-title-icon"><History size={20} color="#fff" /></span>
                <div>
                    <h1>Hóa đơn</h1>
                    <p className="muted">Xem lại và tra cứu hóa đơn giao dịch của hội viên</p>
                </div>
            </div>

            {/* ----- 3 ô thống kê nhanh ----- */}
            <div className="stats">
                <div className="stat-box" style={{ borderTopColor: "#0ea5e9" }}>
                    <span className="stat-icon" style={{ backgroundColor: "#0ea5e9" }}><Banknote size={18} /></span>
                    <div>
                        <p className="stat-label">Tổng giao dịch</p>
                        <p className="stat-value">{loading ? "—" : totalCount}</p>
                    </div>
                </div>
                <div className="stat-box" style={{ borderTopColor: "#059669" }}>
                    <span className="stat-icon" style={{ backgroundColor: "#059669" }}><Banknote size={18} /></span>
                    <div>
                        <p className="stat-label">Doanh thu đã thu</p>
                        <p className="stat-value">{loading ? "—" : formatMoney(totalRevenue)}</p>
                        <p className="stat-sub">{loading ? "" : `${paidCount} giao dịch đã thanh toán`}</p>
                    </div>
                </div>
                <div className="stat-box" style={{ borderTopColor: "#f59e0b" }}>
                    <span className="stat-icon" style={{ backgroundColor: "#f59e0b" }}><Clock size={18} /></span>
                    <div>
                        <p className="stat-label">Chờ thanh toán</p>
                        <p className="stat-value">{loading ? "—" : pendingCount}</p>
                    </div>
                </div>
            </div>

            {/* ----- Bộ lọc: tìm kiếm + trạng thái + kênh mua ----- */}
            <div className="filter-box">
                <div className="search-input">
                    <Search size={16} className="search-icon" />
                    <input
                        value={keyword}
                        onChange={(e) => onKeywordChange(e.target.value)}
                        placeholder="Tìm theo tên, số điện thoại hoặc mã giao dịch..."
                    />
                    {keyword && (
                        <button className="clear-btn" onClick={() => onKeywordChange("")}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Dùng thẻ <select> có sẵn của HTML cho đơn giản, dễ hiểu */}
                <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="Pending">Chờ thanh toán</option>
                    <option value="Paid">Đã thanh toán</option>
                    <option value="Cancelled">Đã hủy</option>
                </select>

                <select value={channelFilter} onChange={(e) => onChannelChange(e.target.value)}>
                    <option value="all">Tất cả kênh mua</option>
                    <option value="Online">Online</option>
                    <option value="Tại quầy">Tại quầy</option>
                </select>

                <button className="btn btn-outline" onClick={onResetFilters}>Đặt lại</button>
            </div>

            {/* ----- Bảng danh sách giao dịch ----- */}
            <div className="table-card">
                <div className="table-card-header">
                    {loading ? (
                        "Đang tải..."
                    ) : totalCount === 0 ? (
                        <>Tìm thấy <b>0</b> giao dịch</>
                    ) : (
                        <>
                            Hiển thị <b>{startIndex + 1}–{Math.min(startIndex + transactions.length, totalCount)}</b> trên tổng <b>{totalCount}</b> giao dịch
                        </>
                    )}
                </div>

                {loading ? (
                    <div className="state-box">
                        <Loader2 className="spin" size={28} />
                        <p>Đang tải danh sách giao dịch...</p>
                    </div>
                ) : errorMessage ? (
                    <div className="state-box">
                        <XCircle size={28} color="#e11d48" />
                        <p>{errorMessage}</p>
                        <button className="btn btn-outline" onClick={onRetry}>Thử lại</button>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="state-box">
                        <Search size={28} color="#c7d3ce" />
                        <p>Không tìm thấy giao dịch phù hợp</p>
                    </div>
                ) : (
                    <>
                        {/* Bảng cho màn hình lớn (máy tính) */}
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Hội viên</th>
                                        <th>Mã giao dịch</th>
                                        <th style={{ textAlign: "right" }}>Số tiền</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: "right" }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((item, index) => (
                                        <TransactionRow
                                            key={index}
                                            item={item}
                                            onOpenDetail={onOpenDetail}
                                            onOpenInvoice={onOpenInvoice}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Danh sách dạng thẻ cho màn hình nhỏ (điện thoại) */}
                        <div className="cards-wrap">
                            {transactions.map((item, index) => (
                                <TransactionCard
                                    key={index}
                                    item={item}
                                    onOpenDetail={onOpenDetail}
                                    onOpenInvoice={onOpenInvoice}
                                />
                            ))}
                        </div>

                        {/* ----- Thanh phân trang ----- */}
                        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
                    </>
                )}
            </div>
        </>
    );
}

// 1 dòng trong bảng (dùng cho máy tính)
function TransactionRow({ item, onOpenDetail, onOpenInvoice }) {
    return (
        <tr>
            <td>
                <div className="member-cell">
                    <Avatar src={item.urlImg} name={item.fullName} />
                    <div>
                        <p className="member-name">{item.fullName}</p>
                        <p className="member-phone"><Phone size={10} />{item.phone}</p>
                    </div>
                </div>
            </td>
            <td className="mono">{item.orderCode}</td>
            <td style={{ textAlign: "right" }}>
                <p className="amount">{formatMoney(item.amount)}</p>
                {item.amount !== item.originalAmount && (
                    <p className="amount-old">{formatMoney(item.originalAmount)}</p>
                )}
            </td>
            <td><StatusBadge status={item.status} /></td>
            <td style={{ textAlign: "right" }}>
                <div className="row-actions">
                    <button className="btn btn-outline btn-small" onClick={() => onOpenInvoice(item)}>
                        <FileText size={13} />
                    </button>
                    <button className="btn btn-primary btn-small" onClick={() => onOpenDetail(item)}>
                        Chi tiết
                    </button>
                </div>
            </td>
        </tr>
    );
}

// 1 thẻ trong danh sách (dùng cho điện thoại)
function TransactionCard({ item, onOpenDetail, onOpenInvoice }) {
    const statusColor = (STATUS_INFO[item.status] || STATUS_INFO.Pending).color;
    return (
        <div className="member-card" style={{ borderLeftColor: statusColor }}>
            <div className="member-card-top">
                <div className="member-cell">
                    <Avatar src={item.urlImg} name={item.fullName} />
                    <div>
                        <p className="member-name">{item.fullName}</p>
                        <p className="member-phone"><Phone size={10} />{item.phone}</p>
                    </div>
                </div>
                <StatusBadge status={item.status} />
            </div>
            <div className="member-card-row">
                <span className="mono">{item.orderCode}</span>
                <span className="amount">{formatMoney(item.amount)}</span>
            </div>
            <div className="member-card-actions">
                <button className="btn btn-outline btn-small" onClick={() => onOpenInvoice(item)}>
                    <FileText size={13} /> Hóa đơn
                </button>
                <button className="btn btn-primary btn-small" onClick={() => onOpenDetail(item)}>
                    Chi tiết
                </button>
            </div>
        </div>
    );
}

// -------------------------------------------------------------------------
// MÀN HÌNH CHI TIẾT 1 GIAO DỊCH
// -------------------------------------------------------------------------
function DetailScreen({ transaction, onBack, onOpenInvoice }) {
    if (!transaction) return null;

    const hasDiscount = transaction.amount !== transaction.originalAmount && transaction.originalAmount != null;

    return (
        <div className="detail-screen">
            <div className="detail-header">
                <div className="detail-header-left">
                    <button className="btn btn-outline" onClick={onBack}>
                        <ArrowLeft size={15} /> Quay lại
                    </button>
                    <div>
                        <h1>Chi tiết giao dịch</h1>
                        <p className="muted">Mã: {transaction.orderCode}</p>
                    </div>
                </div>
                <div className="detail-header-right">
                    <StatusBadge status={transaction.status} />
                    <button className="btn btn-outline" onClick={() => onOpenInvoice(transaction)}>
                        <FileText size={13} /> Xem hóa đơn
                    </button>
                </div>
            </div>

            {/* Khối thông tin hội viên */}
            <div className="profile-box">
                <Avatar src={transaction.urlImg} name={transaction.fullName} size={64} />
                <div>
                    <p className="profile-name">{transaction.fullName}</p>
                    <p className="profile-phone"><Phone size={13} />{transaction.phone}</p>
                </div>
            </div>

            {/* Các ô thông tin giao dịch, mỗi ô 1 màu để dễ nhìn */}
            <p className="section-label">Thông tin giao dịch</p>
            <div className="info-grid">
                <InfoBox icon={Banknote} label="Số tiền" color="#059669"
                    value={
                        <>
                            {formatMoney(transaction.amount)}
                            {hasDiscount && (
                                <span className="info-box-sub"> (giá gốc {formatMoney(transaction.originalAmount)})</span>
                            )}
                        </>
                    }
                />
                <InfoBox icon={ChannelIcon(transaction.purchaseChannel)} label="Kênh mua" color="#0d9488"
                    value={(CHANNEL_INFO[transaction.purchaseChannel] || CHANNEL_INFO.Online).text}
                />
                {transaction.bankReferenceCode && (
                    <InfoBox icon={Banknote} label="Mã tham chiếu ngân hàng" color="#3b82f6"
                        value={transaction.bankReferenceCode}
                    />
                )}
            </div>

            <p className="section-label">Gói tập & chi nhánh</p>
            <div className="info-grid">
                <InfoBox icon={FileText} label="Gói tập" color="#8b5cf6" value={transaction.planName || "—"} />
                <InfoBox icon={MapPin} label="Chi nhánh" color="#0ea5e9" value={transaction.branchName || "—"} />
                <InfoBox icon={Clock} label="Thời hạn sử dụng" color="#f59e0b"
                    value={`${formatDate(transaction.startDate)} → ${formatDate(transaction.expiryDate)}`}
                />
            </div>
        </div>
    );
}

// Chọn icon phù hợp cho kênh mua hàng
function ChannelIcon(channel) {
    return channel === "Tại quầy" ? Store : Globe;
}

// -------------------------------------------------------------------------
// CỬA SỔ (MODAL) XEM HÓA ĐƠN
// -------------------------------------------------------------------------
function InvoiceModal({ invoice, onClose, onPrint, onDownload }) {
    const isPdfOrHtml = invoice.fileType.includes("pdf") || invoice.fileType.includes("html");
    const isImage = invoice.fileType.startsWith("image/");

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <p>Hóa đơn{invoice.transaction?.fullName ? ` - ${invoice.transaction.fullName}` : ""}</p>
                    <div className="modal-header-actions">
                        {!invoice.loading && !invoice.error && (
                            <>
                                <button className="btn btn-outline btn-small" onClick={onDownload}>
                                    <Download size={13} /> Tải về
                                </button>
                                {isPdfOrHtml && (
                                    <button className="btn btn-outline btn-small" onClick={onPrint}>
                                        <Printer size={13} /> In
                                    </button>
                                )}
                            </>
                        )}
                        <button className="btn btn-outline btn-small" onClick={onClose}>
                            <X size={13} /> Đóng
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    {invoice.loading ? (
                        <div className="state-box">
                            <Loader2 className="spin" size={28} />
                            <p>Đang tải hóa đơn...</p>
                        </div>
                    ) : invoice.error ? (
                        <div className="state-box">
                            <XCircle size={28} color="#e11d48" />
                            <p>{invoice.error}</p>
                        </div>
                    ) : isPdfOrHtml ? (
                        <iframe id="invoice-frame" title="Hóa đơn" src={invoice.fileUrl} className="invoice-frame" />
                    ) : isImage ? (
                        <div className="invoice-image-wrap">
                            <img src={invoice.fileUrl} alt="Hóa đơn" />
                        </div>
                    ) : (
                        <div className="state-box">
                            <XCircle size={28} color="#e11d48" />
                            <p>Định dạng hóa đơn không được hỗ trợ xem trực tiếp</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// -------------------------------------------------------------------------
// 4. CSS CHO TOÀN BỘ TRANG (dùng CSS thường, không dùng thư viện ngoài)
// -------------------------------------------------------------------------
const CSS = `
  * { box-sizing: border-box; }
  .page { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; background: #f4f7f5; min-height: 100vh; padding: 24px 32px; }
  .muted { color: #5b6b64; font-size: 13px; margin: 0; }

  /* ---------- Tiêu đề trang ---------- */
  .page-title { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .page-title-icon { width: 44px; height: 44px; border-radius: 12px; background: #059669; display: flex; align-items: center; justify-content: center; }
  .page-title h1 { font-size: 22px; margin: 0; color: #0f2419; }

  /* ---------- 3 ô thống kê ---------- */
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-box { display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid #e3e8e6; border-top: 4px solid; border-radius: 14px; padding: 16px; }
  .stat-icon { width: 40px; height: 40px; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-label { font-size: 11px; text-transform: uppercase; color: #5b6b64; margin: 0; font-weight: 700; }
  .stat-value { font-size: 18px; font-weight: 800; color: #0f2419; margin: 2px 0 0 0; }
  .stat-sub { font-size: 11px; color: #93a29b; margin: 0; }

  /* ---------- Bộ lọc ---------- */
  .filter-box { display: grid; grid-template-columns: 1fr auto auto auto; gap: 10px; background: #fff; border: 1.5px solid #e3e8e6; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
  .search-input { position: relative; display: flex; align-items: center; }
  .search-input input { width: 100%; border: 1.5px solid #e3e8e6; border-radius: 8px; padding: 9px 34px; font-size: 13px; }
  .search-icon { position: absolute; left: 10px; color: #93a29b; }
  .clear-btn { position: absolute; right: 8px; border: none; background: none; cursor: pointer; color: #93a29b; }
  .filter-box select { border: 1.5px solid #e3e8e6; border-radius: 8px; padding: 9px 10px; font-size: 13px; background: #fff; }

  /* ---------- Nút bấm ---------- */
  .btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; }
  .btn-outline { background: #fff; border-color: #e3e8e6; color: #5b6b64; }
  .btn-outline:hover { border-color: #059669; color: #047857; }
  .btn-outline:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-outline:disabled:hover { border-color: #e3e8e6; color: #5b6b64; }
  .btn-primary { background: #059669; color: #fff; }
  .btn-primary:hover { background: #047857; }
  .btn-small { padding: 6px 10px; font-size: 12px; }

  /* ---------- Khối bảng ---------- */
  .table-card { background: #fff; border: 1.5px solid #e3e8e6; border-radius: 14px; overflow: hidden; }
  .table-card-header { padding: 12px 18px; border-bottom: 1px solid #e3e8e6; font-size: 13px; color: #5b6b64; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 18px; font-size: 10px; text-transform: uppercase; color: #047857; background: #f4faf7; border-bottom: 2px solid #cdece1; white-space: nowrap; }
  td { padding: 12px 18px; border-bottom: 1px solid #eef1ef; vertical-align: middle; }
  .mono { font-family: 'Courier New', monospace; }

  .member-cell { display: flex; align-items: center; gap: 10px; }
  .member-name { font-weight: 700; margin: 0; font-size: 13px; color: #0f2419; }
  .member-phone { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #5b6b64; margin: 2px 0 0 0; }
  .amount { font-weight: 700; margin: 0; color: #0f2419; }
  .amount-old { font-size: 11px; color: #93a29b; text-decoration: line-through; margin: 0; }
  .row-actions { display: flex; justify-content: flex-end; gap: 6px; }

  .avatar { border-radius: 50%; object-fit: cover; border: 1.5px solid #cdece1; flex-shrink: 0; }
  .avatar-empty { background: #f4faf7; display: flex; align-items: center; justify-content: center; color: #93a29b; }

  .badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px; padding: 4px 10px; font-size: 11px; font-weight: 700; }

  .state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 50px 20px; text-align: center; color: #5b6b64; font-size: 13px; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ---------- Thẻ dùng cho điện thoại ---------- */
  .cards-wrap { display: none; flex-direction: column; gap: 12px; padding: 16px; }
  .member-card { border: 1.5px solid #e3e8e6; border-left: 4px solid; border-radius: 12px; padding: 14px; background: #fff; }
  .member-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
  .member-card-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; }
  .member-card-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

  /* ---------- Phân trang ---------- */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 18px; border-top: 1px solid #e3e8e6; flex-wrap: wrap; }
  .pagination-pages { display: flex; align-items: center; gap: 4px; }
  .pagination-page { min-width: 32px; height: 32px; padding: 0 6px; border-radius: 8px; border: 1.5px solid #e3e8e6; background: #fff; color: #5b6b64; font-size: 13px; font-weight: 600; cursor: pointer; }
  .pagination-page:hover { border-color: #059669; color: #047857; }
  .pagination-page.active { background: #059669; border-color: #059669; color: #fff; }
  .pagination-dots { padding: 0 4px; color: #93a29b; font-size: 13px; }

  /* ---------- Trang chi tiết ---------- */
  .detail-screen { display: flex; flex-direction: column; }
  .detail-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
  .detail-header-left { display: flex; align-items: center; gap: 14px; }
  .detail-header-left h1 { font-size: 20px; margin: 0; color: #0f2419; }
  .detail-header-right { display: flex; align-items: center; gap: 10px; }

  .profile-box { display: flex; align-items: center; gap: 16px; background: #fff; border: 1.5px solid #e3e8e6; border-top: 4px solid #059669; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
  .profile-name { font-size: 17px; font-weight: 800; margin: 0; color: #0f2419; }
  .profile-phone { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #5b6b64; margin: 4px 0 0 0; }

  .section-label { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #93a29b; margin: 0 0 10px 0; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 22px; }
  .info-box { display: flex; align-items: flex-start; gap: 12px; background: #fff; border: 1.5px solid #e3e8e6; border-top: 4px solid; border-radius: 12px; padding: 14px; }
  .info-box-icon { width: 36px; height: 36px; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .info-box-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; margin: 0; }
  .info-box-value { font-size: 14px; font-weight: 700; margin: 3px 0 0 0; color: #0f2419; }
  .info-box-sub { font-size: 11.5px; font-weight: 400; color: #5b6b64; }

  /* ---------- Cửa sổ xem hóa đơn ---------- */
  .modal-overlay { position: fixed; inset: 0; background: rgba(15,36,25,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 4vh 4vw; }
  .modal-box { width: min(760px, 90vw); height: min(85vh, 900px); background: #fff; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #e3e8e6; font-size: 14px; font-weight: 700; color: #0f2419; }
  .modal-header-actions { display: flex; gap: 8px; }
  .modal-body { flex: 1; min-height: 0; }
  .invoice-frame { width: 100%; height: 100%; border: none; }
  .invoice-image-wrap { width: 100%; height: 100%; overflow: auto; display: flex; justify-content: center; background: #f4faf7; }
  .invoice-image-wrap img { max-width: 100%; }

  /* ---------- Responsive: màn hình nhỏ (điện thoại) ---------- */
  @media (max-width: 768px) {
    .page { padding: 16px; }
    .stats { grid-template-columns: 1fr; }
    .filter-box { grid-template-columns: 1fr; }
    .table-wrap { display: none; }
    .cards-wrap { display: flex; }
    .pagination { padding: 14px; }
  }
`;