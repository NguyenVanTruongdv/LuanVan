import { useCallback, useEffect, useMemo, useState } from "react";
import adminApi from "../../../api/adminApi";

// Nhãn + màu badge cho từng loại khuyến mãi, khớp PromoType lưu ở BE
// (PromotionService.ValidatePromotionData): GiamPhanTram, GiamTienMat,
// TangNgay, TangChuKy.
const PROMO_TYPE_META = {
    GiamPhanTram: { label: "Giảm %", tone: "blue" },
    GiamTienMat: { label: "Giảm tiền mặt", tone: "orange" },
    TangNgay: { label: "Tặng ngày", tone: "green" },
    TangChuKy: { label: "Tặng chu kỳ", tone: "purple" },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatCurrency(value) {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const emptyFilters = {
    promotionId: "",
    memberId: "",
    planId: "",
    fromDate: "",
    toDate: "",
};

// ============================================================
// Style của trang được nhúng ngay tại đây (thẻ <style>) để cả
// JSX + CSS nằm chung 1 file. Toàn bộ class được tiền tố "puh-"
// để tránh đụng độ với style khác trong app.
// Tông màu khớp Admin Panel hiện có: nền kem nhạt, card trắng bo
// góc mềm, accent xanh mint (#0f9d58), badge phân loại theo màu
// donut chart trên trang Tổng quan (xanh dương/cam/xanh lá/tím).
// ============================================================
const PUH_STYLES = `
.puh-page {
    --puh-bg: #f4f2ec;
    --puh-card: #ffffff;
    --puh-border: #ecebe4;
    --puh-text: #1f2430;
    --puh-text-soft: #6b7280;
    --puh-green: #0f9d58;
    --puh-green-soft: #e6f7ee;
    --puh-blue: #4f7df3;
    --puh-blue-soft: #eaf0fe;
    --puh-orange: #f2a53c;
    --puh-orange-soft: #fdf1de;
    --puh-purple: #8b7cf6;
    --puh-purple-soft: #f1eefe;
    --puh-red: #ef5b5b;
    --puh-red-soft: #fdecec;
    --puh-gray-soft: #f1f1ef;

    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--puh-text);
    background: var(--puh-bg);
    padding: 28px 32px 48px;
    min-height: 100%;
    box-sizing: border-box;
}

.puh-page * {
    box-sizing: border-box;
}

/* ---------------- Header ---------------- */

.puh-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
}

.puh-title {
    margin: 0 0 6px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.01em;
}

.puh-subtitle {
    margin: 0;
    color: var(--puh-text-soft);
    font-size: 14.5px;
}

.puh-summary-pill {
    display: flex;
    align-items: baseline;
    gap: 8px;
    background: var(--puh-green-soft);
    color: var(--puh-green);
    border-radius: 999px;
    padding: 10px 20px;
    white-space: nowrap;
    box-shadow: 0 10px 24px -8px rgba(15, 157, 88, 0.35);
}

.puh-summary-value {
    font-size: 20px;
    font-weight: 800;
}

.puh-summary-label {
    font-size: 13px;
    font-weight: 600;
}

/* ---------------- Filter card ---------------- */

.puh-filter-card {
    background: var(--puh-card);
    border: 1.5px solid #dcdad0;
    border-radius: 18px;
    padding: 20px 22px;
    margin-bottom: 20px;
    box-shadow: 0 24px 48px -20px rgba(31, 36, 48, 0.22), 0 8px 16px -8px rgba(31, 36, 48, 0.1);
}

.puh-filter-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
}

.puh-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.puh-field label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--puh-text-soft);
}

.puh-field input {
    border: 1.5px solid #d7d5cb;
    background: #fafaf8;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 14px;
    color: var(--puh-text);
    outline: none;
    box-shadow: 0 6px 14px -8px rgba(31, 36, 48, 0.18);
    transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.puh-field input:focus {
    background: #ffffff;
    border-color: var(--puh-green);
    box-shadow: 0 0 0 3px rgba(15, 157, 88, 0.18), 0 6px 14px -6px rgba(15, 157, 88, 0.3);
}

.puh-filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
}

/* ---------------- Buttons ---------------- */

.puh-btn {
    border-radius: 10px;
    padding: 9px 18px;
    font-size: 14px;
    font-weight: 600;
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}

.puh-btn-primary {
    background: var(--puh-green);
    color: #ffffff;
    border-color: #0c8148;
    box-shadow: 0 14px 26px -10px rgba(15, 157, 88, 0.55);
}

.puh-btn-primary:hover {
    background: #0c8148;
    box-shadow: 0 18px 32px -10px rgba(15, 157, 88, 0.6);
    transform: translateY(-1px);
}

.puh-btn-ghost {
    background: #ffffff;
    color: var(--puh-text);
    border-color: #d7d5cb;
    box-shadow: 0 10px 22px -10px rgba(31, 36, 48, 0.22);
}

.puh-btn-ghost:hover {
    background: var(--puh-gray-soft);
    border-color: #c4c2b6;
    box-shadow: 0 12px 26px -10px rgba(31, 36, 48, 0.28);
    transform: translateY(-1px);
}

.puh-btn-sm {
    padding: 6px 14px;
    font-size: 13px;
}

.puh-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

/* ---------------- Table card ---------------- */

.puh-table-card {
    background: var(--puh-card);
    border: 1.5px solid #dcdad0;
    border-radius: 18px;
    padding: 20px 22px 14px;
    box-shadow: 0 28px 56px -22px rgba(31, 36, 48, 0.24), 0 10px 20px -10px rgba(31, 36, 48, 0.12);
}

.puh-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.puh-table-toolbar-title {
    font-size: 15.5px;
    font-weight: 700;
}

.puh-page-size {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--puh-text-soft);
}

.puh-page-size select {
    border: 1.5px solid #d7d5cb;
    border-radius: 8px;
    padding: 5px 8px;
    font-size: 13px;
    background: #fafaf8;
    color: var(--puh-text);
    box-shadow: 0 4px 10px -6px rgba(31, 36, 48, 0.15);
}

.puh-alert {
    background: var(--puh-red-soft);
    color: #b03434;
    border: 1.5px solid #f2b8b8;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13.5px;
    margin-bottom: 14px;
    box-shadow: 0 14px 28px -14px rgba(239, 91, 91, 0.4);
}

.puh-table-scroll {
    overflow-x: auto;
}

.puh-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
    font-size: 13.8px;
}

.puh-table thead th {
    text-align: left;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--puh-text-soft);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 10px 12px;
    border: none;
    border-bottom: 1.5px solid #dcdad0;
    white-space: nowrap;
}

.puh-table tbody td {
    padding: 13px 12px;
    border-top: 1.5px solid #e6e4da;
    border-bottom: 1.5px solid #e6e4da;
    vertical-align: top;
}

.puh-table tbody tr {
    background: #ffffff;
    box-shadow: 0 6px 16px -12px rgba(31, 36, 48, 0.18);
    transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.puh-table tbody tr:nth-child(even) {
    background: #fafaf8;
}

.puh-table tbody tr:hover {
    background: #ffffff;
    box-shadow: 0 16px 28px -14px rgba(31, 36, 48, 0.28);
    transform: translateY(-1px);
}

.puh-table tbody tr:hover td {
    border-color: #cfe9db;
}

.puh-table tbody td:first-child {
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
    border-left: 1.5px solid #e6e4da;
}

.puh-table tbody td:last-child {
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
    border-right: 1.5px solid #e6e4da;
}

.puh-col-right {
    text-align: right;
}

.puh-mono {
    font-variant-numeric: tabular-nums;
    color: var(--puh-text-soft);
}

.puh-promo-name,
.puh-member-name {
    font-weight: 600;
    color: var(--puh-text);
}

.puh-promo-id {
    font-size: 12px;
    color: var(--puh-text-soft);
    margin-top: 2px;
}

.puh-state-cell {
    text-align: center;
    padding: 36px 12px;
    color: var(--puh-text-soft);
    font-size: 14px;
}

/* ---------------- Badges (khớp màu donut chart Tổng quan) ---------------- */

.puh-badge {
    display: inline-block;
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
}

.puh-badge-blue {
    background: var(--puh-blue-soft);
    color: var(--puh-blue);
}

.puh-badge-orange {
    background: var(--puh-orange-soft);
    color: #b6791f;
}

.puh-badge-green {
    background: var(--puh-green-soft);
    color: var(--puh-green);
}

.puh-badge-purple {
    background: var(--puh-purple-soft);
    color: #6c5ce0;
}

.puh-badge-gray {
    background: var(--puh-gray-soft);
    color: var(--puh-text-soft);
}

/* ---------------- Pagination ---------------- */

.puh-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 2px 4px;
}

.puh-pagination-info {
    font-size: 13px;
    color: var(--puh-text-soft);
}

.puh-pagination-controls {
    display: flex;
    gap: 8px;
}

/* ---------------- Responsive ---------------- */

@media (max-width: 1100px) {
    .puh-filter-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 720px) {
    .puh-page {
        padding: 20px 16px 36px;
    }

    .puh-header {
        flex-direction: column;
    }

    .puh-filter-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .puh-filter-actions {
        justify-content: stretch;
    }

    .puh-filter-actions .puh-btn {
        flex: 1;
    }
}

@media (max-width: 480px) {
    .puh-filter-grid {
        grid-template-columns: 1fr;
    }
}
`;

export default function PromotionUsageHistory() {
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(totalItems / pageSize)),
        [totalItems, pageSize]
    );

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                promotionId: appliedFilters.promotionId || undefined,
                memberId: appliedFilters.memberId || undefined,
                planId: appliedFilters.planId || undefined,
                fromDate: appliedFilters.fromDate || undefined,
                toDate: appliedFilters.toDate || undefined,
                page,
                pageSize,
            };
            const res = await adminApi.getUsageHistoryPromotion(params);
            const data = res?.data ?? res;
            setItems(data?.items ?? []);
            setTotalItems(data?.totalItems ?? 0);
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                "Không tải được lịch sử sử dụng voucher. Vui lòng thử lại."
            );
            setItems([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, page, pageSize]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    function handleFilterChange(field, value) {
        setFilters((prev) => ({ ...prev, [field]: value }));
    }

    function handleApplyFilters(e) {
        e.preventDefault();
        setPage(1);
        setAppliedFilters(filters);
    }

    function handleResetFilters() {
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setPage(1);
    }

    function goToPage(next) {
        if (next < 1 || next > totalPages) return;
        setPage(next);
    }

    return (
        <div className="puh-page">
            <style>{PUH_STYLES}</style>

            <div className="puh-header">
                <div>
                    <h1 className="puh-title">Lịch sử sử dụng voucher</h1>
                    <p className="puh-subtitle">
                        Theo dõi từng lượt khuyến mãi đã được áp dụng cho hội viên.
                    </p>
                </div>
                <div className="puh-summary-pill">
                    <span className="puh-summary-value">{totalItems}</span>
                    <span className="puh-summary-label">lượt sử dụng</span>
                </div>
            </div>

            <form className="puh-filter-card" onSubmit={handleApplyFilters}>
                <div className="puh-filter-grid">
                    <div className="puh-field">
                        <label htmlFor="promotionId">Mã khuyến mãi</label>
                        <input
                            id="promotionId"
                            type="number"
                            min="1"
                            placeholder="VD: 12"
                            value={filters.promotionId}
                            onChange={(e) =>
                                handleFilterChange("promotionId", e.target.value)
                            }
                        />
                    </div>

                    <div className="puh-field">
                        <label htmlFor="memberId">Mã hội viên</label>
                        <input
                            id="memberId"
                            type="number"
                            min="1"
                            placeholder="VD: 1042"
                            value={filters.memberId}
                            onChange={(e) => handleFilterChange("memberId", e.target.value)}
                        />
                    </div>

                    <div className="puh-field">
                        <label htmlFor="planId">Gói tập</label>
                        <input
                            id="planId"
                            type="number"
                            min="1"
                            placeholder="VD: 3"
                            value={filters.planId}
                            onChange={(e) => handleFilterChange("planId", e.target.value)}
                        />
                    </div>

                    <div className="puh-field">
                        <label htmlFor="fromDate">Từ ngày</label>
                        <input
                            id="fromDate"
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                        />
                    </div>

                    <div className="puh-field">
                        <label htmlFor="toDate">Đến ngày</label>
                        <input
                            id="toDate"
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange("toDate", e.target.value)}
                        />
                    </div>
                </div>

                <div className="puh-filter-actions">
                    <button type="button" className="puh-btn puh-btn-ghost" onClick={handleResetFilters}>
                        Xoá lọc
                    </button>
                    <button type="submit" className="puh-btn puh-btn-primary">
                        Lọc kết quả
                    </button>
                </div>
            </form>

            <div className="puh-table-card">
                <div className="puh-table-toolbar">
                    <span className="puh-table-toolbar-title">Danh sách lượt sử dụng</span>
                    <div className="puh-page-size">
                        <label htmlFor="pageSize">Hiển thị</label>
                        <select
                            id="pageSize"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                        <span>dòng / trang</span>
                    </div>
                </div>

                {error && <div className="puh-alert">{error}</div>}

                <div className="puh-table-scroll">
                    <table className="puh-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Khuyến mãi</th>
                                <th>Loại</th>
                                <th>Hội viên</th>
                                <th>Gói tập</th>
                                <th className="puh-col-right">Số tiền giảm</th>
                                <th className="puh-col-right">Số ngày tặng</th>
                                <th>Thời điểm áp dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="puh-state-cell">
                                        Đang tải lịch sử sử dụng…
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && items.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="puh-state-cell">
                                        Chưa có lượt sử dụng voucher nào khớp bộ lọc hiện tại.
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                items.map((item) => {
                                    const meta =
                                        PROMO_TYPE_META[item.promoType] || {
                                            label: item.promoType,
                                            tone: "gray",
                                        };
                                    return (
                                        <tr key={item.usageId}>
                                            <td className="puh-mono">#{item.usageId}</td>
                                            <td>
                                                <div className="puh-promo-name">
                                                    {item.tenKhuyenMai}
                                                </div>
                                                <div className="puh-promo-id">
                                                    KM #{item.promotionId}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`puh-badge puh-badge-${meta.tone}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="puh-member-name">
                                                    {item.memberName}
                                                </div>
                                                <div className="puh-promo-id">
                                                    HV #{item.memberId}
                                                </div>
                                            </td>
                                            <td>{item.tenGoiTap || `Gói #${item.planId}`}</td>
                                            <td className="puh-col-right puh-mono">
                                                {item.soTienDaGiam > 0
                                                    ? formatCurrency(item.soTienDaGiam)
                                                    : "—"}
                                            </td>
                                            <td className="puh-col-right puh-mono">
                                                {item.soNgayDuocTang > 0
                                                    ? `${item.soNgayDuocTang} ngày`
                                                    : "—"}
                                            </td>
                                            <td>{formatDateTime(item.apDungLuc)}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>

                <div className="puh-pagination">
                    <span className="puh-pagination-info">
                        Trang {page} / {totalPages} · {totalItems} lượt sử dụng
                    </span>
                    <div className="puh-pagination-controls">
                        <button
                            className="puh-btn puh-btn-ghost puh-btn-sm"
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1 || loading}
                        >
                            Trước
                        </button>
                        <button
                            className="puh-btn puh-btn-ghost puh-btn-sm"
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= totalPages || loading}
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}