import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Loader2,
    Pencil,
    Plus,
    Save,
    Search,
    Ticket,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi"; // chỉnh lại đường dẫn cho khớp project của bạn

/**
 * VoucherListPage
 * ------------------------------------------------------------------
 * Trang "Danh sách voucher", gắn với route /admin/voucher-list (hoặc route
 * bạn đã khai báo trong AdminLayout). Render bên trong <Outlet />.
 *
 * Gọi GET /api/promotions?keyword=&planId=&page=&pageSize= qua
 * adminApi.getPromotions() — BE trả PagedResult<PromotionListItem>, xử lý
 * linh hoạt nhiều shape response (items/total hoặc mảng thẳng) để không vỡ
 * nếu BE đổi format nhẹ.
 *
 * Ẩn/hiện: PATCH /api/promotions/{id}/visibility qua
 * adminApi.setPromotionVisibility(id, an).
 * Sửa: PUT /api/promotions/{id} qua adminApi.updatePromotion(id, data).
 *
 * [ĐÃ SỬA THEO YÊU CẦU]
 * - KHÔNG có chức năng xóa voucher.
 * - "Xem" chuyển sang màn chi tiết NGAY TRONG TRANG NÀY (state `view`,
 *   không dùng navigate/route khác).
 * - "Sửa" KHÔNG điều hướng sang trang khác nữa — bấm "Sửa" sẽ bật chế độ
 *   chỉnh sửa NGAY TRÊN MÀN CHI TIẾT (các ô input hiện ra thay cho text
 *   tĩnh). Bấm "Lưu" sẽ gọi thẳng adminApi.updatePromotion(id, data) rồi
 *   cập nhật lại dữ liệu hiển thị, không rời khỏi trang.
 * - 4 trạng thái (NhapLieu / HoatDong / TamDung / HetHan) mỗi loại có một
 *   màu badge riêng (vàng hổ phách / xanh lá / xám / đỏ) kèm chấm tròn,
 *   viền và shadow màu theo trạng thái để dễ phân biệt bằng mắt.
 * ------------------------------------------------------------------
 */

const PAGE_SIZE = 10;

const PROMO_TYPE_LABELS = {
    GiamPhanTram: "Giảm theo %",
    GiamTienMat: "Giảm tiền mặt",
    TangNgay: "Tặng ngày",
    TangChuKy: "Tặng chu kỳ",
};

// NhapLieu hiển thị là "Chờ hoạt động" thay vì "Chưa bắt đầu" theo yêu cầu.
const STATUS_LABELS = {
    NhapLieu: "Chờ hoạt động",
    HoatDong: "Hoạt động",
    TamDung: "Tạm dừng",
    HetHan: "Hết hạn",
};

// Mỗi trạng thái map sang 1 class CSS riêng, để có màu badge khác nhau.
const STATUS_CLASS_MAP = {
    NhapLieu: "vl-status-pending",
    HoatDong: "vl-status-active",
    TamDung: "vl-status-paused",
    HetHan: "vl-status-expired",
};

function getStatusClassName(status) {
    return STATUS_CLASS_MAP[status] ?? "vl-status-off";
}

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

function getField(obj, keys, fallback = undefined) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return fallback;
}

function formatCurrency(n) {
    if (n === undefined || n === null) return "-";
    return Number(n).toLocaleString("vi-VN") + "đ";
}

function formatDate(d) {
    if (!d) return "…";
    const s = String(d).slice(0, 10);
    const [y, m, day] = s.split("-");
    if (!y || !m || !day) return s;
    return `${day}/${m}/${y}`;
}

// yyyy-MM-dd cho input type="date".
function toDateInputValue(d) {
    if (!d) return "";
    return String(d).slice(0, 10);
}

function formatDateTime(d) {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
}

function getPromoId(p) {
    return getField(p, ["promotionId", "PromotionId", "id", "Id"]);
}

function getPromoName(p) {
    return getField(p, ["tenKhuyenMai", "TenKhuyenMai", "name", "Name"], "(Không có tên)");
}

function getPlanId(p) {
    return getField(p, ["planId", "PlanId"]);
}

function getPlanLabel(p) {
    return getField(
        p,
        ["tenGoi", "TenGoi", "tenGoiTap", "TenGoiTap", "planName", "PlanName", "packageName", "PackageName"],
        getPlanId(p) ? `Gói #${getPlanId(p)}` : "-"
    );
}

function getPromoType(p) {
    return getField(p, ["promoType", "PromoType"]);
}

function getStatus(p) {
    return getField(p, ["trangThai", "TrangThai"], "HoatDong");
}

function getStatusLabel(status) {
    return STATUS_LABELS[status] ?? status ?? "-";
}

function getUsageCount(p) {
    return getField(p, ["soLuotDaDung", "SoLuotDaDung", "daSuDung", "usageCount"], 0);
}

function getUsageLimit(p) {
    return getField(p, ["gioiHanLuot", "GioiHanLuot"]);
}

function getDescription(p) {
    return getField(p, ["moTa", "MoTa"]);
}

function getCreator(p) {
    return getField(p, ["nguoiTao", "NguoiTao"]);
}

function getCreatedAt(p) {
    return getField(p, ["createdAt", "CreatedAt"]);
}

function getUpdatedAt(p) {
    return getField(p, ["updatedAt", "UpdatedAt"]);
}

function getPhanTramGiam(p) {
    return getField(p, ["phanTramGiam", "PhanTramGiam"]);
}
function getMucGiamToiDa(p) {
    return getField(p, ["mucGiamToiDa", "MucGiamToiDa"]);
}
function getSoTienGiam(p) {
    return getField(p, ["soTienGiam", "SoTienGiam"]);
}
function getSoNgayTang(p) {
    return getField(p, ["soNgayTang", "SoNgayTang"]);
}
function getSoChuKyTang(p) {
    return getField(p, ["soChuKyTang", "SoChuKyTang"]);
}
function getNgayBatDau(p) {
    return getField(p, ["ngayBatDau", "NgayBatDau"]);
}
function getNgayKetThuc(p) {
    return getField(p, ["ngayKetThuc", "NgayKetThuc"]);
}

function getValueLabel(p) {
    const type = getPromoType(p);
    switch (type) {
        case "GiamPhanTram": {
            const pct = getPhanTramGiam(p);
            const cap = getMucGiamToiDa(p);
            return `${pct ?? "-"}%${cap ? ` (tối đa ${formatCurrency(cap)})` : ""}`;
        }
        case "GiamTienMat":
            return formatCurrency(getSoTienGiam(p));
        case "TangNgay":
            return `${getSoNgayTang(p) ?? "-"} ngày`;
        case "TangChuKy": {
            const cycles = getSoChuKyTang(p);
            return `${cycles ?? "-"} chu kỳ${cycles ? ` (${Number(cycles) * 30} ngày)` : ""}`;
        }
        default:
            return "-";
    }
}

// Khởi tạo form chỉnh sửa từ 1 promo (dùng khi bấm "Sửa").
function buildEditForm(p) {
    return {
        tenKhuyenMai: getPromoName(p) === "(Không có tên)" ? "" : getPromoName(p),
        moTa: getDescription(p) || "",
        planId: getPlanId(p) ?? "",
        promoType: getPromoType(p) || "GiamPhanTram",
        phanTramGiam: getPhanTramGiam(p) ?? "",
        mucGiamToiDa: getMucGiamToiDa(p) ?? "",
        soTienGiam: getSoTienGiam(p) ?? "",
        soNgayTang: getSoNgayTang(p) ?? "",
        soChuKyTang: getSoChuKyTang(p) ?? "",
        ngayBatDau: toDateInputValue(getNgayBatDau(p)),
        ngayKetThuc: toDateInputValue(getNgayKetThuc(p)),
        gioiHanLuot: getUsageLimit(p) ?? "",
    };
}

// Chuyển form -> payload gửi lên BE. Chỉ giữ lại các cột số liệu tương ứng
// với promoType đã chọn, các cột không liên quan gửi null — khớp với
// ValidatePromotionData ở PromotionService (mỗi loại chỉ được set đúng bộ cột của nó).
function buildUpdatePayload(form, currentStatus) {
    const base = {
        tenKhuyenMai: form.tenKhuyenMai.trim(),
        moTa: form.moTa.trim() || null,
        planId: form.planId ? Number(form.planId) : null,
        promoType: form.promoType,
        phanTramGiam: null,
        mucGiamToiDa: null,
        soTienGiam: null,
        soNgayTang: null,
        soChuKyTang: null,
        ngayBatDau: form.ngayBatDau,
        ngayKetThuc: form.ngayKetThuc,
        gioiHanLuot: form.gioiHanLuot === "" ? null : Number(form.gioiHanLuot),
        // Giữ nguyên trạng thái TamDung nếu đang tạm dừng, để không vô tình
        // "hiện lại" khuyến mãi chỉ vì bấm Lưu (BE tự tính lại các trạng thái
        // còn lại theo ngày).
        trangThai: currentStatus === "TamDung" ? "TamDung" : undefined,
    };

    switch (form.promoType) {
        case "GiamPhanTram":
            base.phanTramGiam = form.phanTramGiam === "" ? null : Number(form.phanTramGiam);
            base.mucGiamToiDa = form.mucGiamToiDa === "" ? null : Number(form.mucGiamToiDa);
            break;
        case "GiamTienMat":
            base.soTienGiam = form.soTienGiam === "" ? null : Number(form.soTienGiam);
            break;
        case "TangNgay":
            base.soNgayTang = form.soNgayTang === "" ? null : Number(form.soNgayTang);
            break;
        case "TangChuKy":
            base.soChuKyTang = form.soChuKyTang === "" ? null : Number(form.soChuKyTang);
            break;
        default:
            break;
    }

    return base;
}

export default function VoucherListPage() {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const [keywordInput, setKeywordInput] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [appliedKeyword, setAppliedKeyword] = useState("");

    const [plans, setPlans] = useState([]);

    const [actionMessage, setActionMessage] = useState(null);
    const [busyId, setBusyId] = useState(null);

    // ----- 2 màn hình nội bộ: "list" (bảng) và "detail" (chi tiết) -----
    const [view, setView] = useState("list");
    const [selectedPromo, setSelectedPromo] = useState(null);

    // ----- Chế độ chỉnh sửa ngay trong màn chi tiết -----
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await adminApi.getMembershipPlans();
                const list = Array.isArray(data) ? data : data?.items ?? [];
                if (!cancelled) setPlans(list);
            } catch {
                // Bộ lọc theo gói không bắt buộc.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchList = async (opts = {}) => {
        const nextPage = opts.page ?? page;
        const nextKeyword = opts.keyword ?? appliedKeyword;
        const nextPlanId = opts.planId ?? planFilter;

        setLoading(true);
        setLoadError(null);
        try {
            const data = await adminApi.getPromotions({
                keyword: nextKeyword || undefined,
                planId: nextPlanId || undefined,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });

            const list = Array.isArray(data) ? data : data?.items ?? [];
            const total = Array.isArray(data)
                ? data.length
                : data?.totalCount ?? data?.total ?? list.length;

            setItems(list);
            setTotalCount(total);
            return list;
        } catch (err) {
            setLoadError(
                err?.response?.data?.message || err.message || "Không tải được danh sách khuyến mãi."
            );
            setItems([]);
            setTotalCount(0);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList({ page });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleSearch = (ev) => {
        ev.preventDefault();
        setAppliedKeyword(keywordInput.trim());
        setPage(1);
        fetchList({ page: 1, keyword: keywordInput.trim(), planId: planFilter });
    };

    const handleResetFilter = () => {
        setKeywordInput("");
        setPlanFilter("");
        setAppliedKeyword("");
        setPage(1);
        fetchList({ page: 1, keyword: "", planId: "" });
    };

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

    const handleToggleVisibility = async (promo) => {
        const id = getPromoId(promo);
        const isActive = getStatus(promo) === "HoatDong";
        setBusyId(id);
        setActionMessage(null);
        try {
            await adminApi.setPromotionVisibility(id, isActive);
            setActionMessage({
                type: "success",
                text: isActive ? "Đã ẩn khuyến mãi." : "Đã hiện lại khuyến mãi.",
            });
            const list = await fetchList();
            const fresh = list.find((it) => String(getPromoId(it)) === String(id));
            setSelectedPromo((cur) => (cur && getPromoId(cur) === id ? fresh || cur : cur));
        } catch (err) {
            setActionMessage({
                type: "error",
                text: err?.response?.data?.message || err.message || "Không thể cập nhật trạng thái.",
            });
        } finally {
            setBusyId(null);
        }
    };

    // Bấm "Xem" -> chuyển sang view chi tiết NGAY TRONG TRANG NÀY, không điều hướng route khác.
    const handleViewDetail = (promo) => {
        setActionMessage(null);
        setSelectedPromo(promo);
        setIsEditing(false);
        setSaveError(null);
        setView("detail");
    };

    const handleBackToList = () => {
        setSelectedPromo(null);
        setIsEditing(false);
        setSaveError(null);
        setView("list");
    };

    // Bấm "Sửa" -> KHÔNG điều hướng, chỉ bật form chỉnh sửa ngay tại màn chi tiết.
    const handleStartEdit = () => {
        setSaveError(null);
        setEditForm(buildEditForm(selectedPromo));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm(null);
        setSaveError(null);
    };

    const handleEditFieldChange = (field, value) => {
        setEditForm((cur) => ({ ...cur, [field]: value }));
    };

    // Bấm "Lưu" -> gọi thẳng API PUT /api/promotions/{id}, không rời trang.
    const handleSaveEdit = async () => {
        const id = getPromoId(selectedPromo);
        setSaveError(null);

        if (!editForm.tenKhuyenMai.trim()) {
            setSaveError("Tên khuyến mãi không được để trống.");
            return;
        }
        if (!editForm.ngayBatDau || !editForm.ngayKetThuc) {
            setSaveError("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
            return;
        }
        if (editForm.ngayKetThuc < editForm.ngayBatDau) {
            setSaveError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
            return;
        }

        const payload = buildUpdatePayload(editForm, getStatus(selectedPromo));

        setSaving(true);
        try {
            const updated = await adminApi.updatePromotion(id, payload);

            // BE có thể trả về Promotion đã cập nhật, hoặc không trả gì đáng kể —
            // để chắc ăn, merge dữ liệu form vào promo hiện tại làm nguồn hiển thị chính,
            // đồng thời ưu tiên field nào BE trả về (nếu có).
            const merged = {
                ...selectedPromo,
                ...(updated && typeof updated === "object" ? updated : {}),
                tenKhuyenMai: payload.tenKhuyenMai,
                TenKhuyenMai: payload.tenKhuyenMai,
                moTa: payload.moTa,
                MoTa: payload.moTa,
                planId: payload.planId,
                PlanId: payload.planId,
                promoType: payload.promoType,
                PromoType: payload.promoType,
                phanTramGiam: payload.phanTramGiam,
                PhanTramGiam: payload.phanTramGiam,
                mucGiamToiDa: payload.mucGiamToiDa,
                MucGiamToiDa: payload.mucGiamToiDa,
                soTienGiam: payload.soTienGiam,
                SoTienGiam: payload.soTienGiam,
                soNgayTang: payload.soNgayTang,
                SoNgayTang: payload.soNgayTang,
                soChuKyTang: payload.soChuKyTang,
                SoChuKyTang: payload.soChuKyTang,
                ngayBatDau: payload.ngayBatDau,
                NgayBatDau: payload.ngayBatDau,
                ngayKetThuc: payload.ngayKetThuc,
                NgayKetThuc: payload.ngayKetThuc,
                gioiHanLuot: payload.gioiHanLuot,
                GioiHanLuot: payload.gioiHanLuot,
            };

            setSelectedPromo(merged);
            setIsEditing(false);
            setEditForm(null);
            setActionMessage({ type: "success", text: "Đã lưu thay đổi khuyến mãi." });

            // Đồng bộ lại danh sách nền để khi quay lại bảng dữ liệu đã mới nhất.
            fetchList();
        } catch (err) {
            setSaveError(
                err?.response?.data?.message || err.message || "Không thể lưu thay đổi. Vui lòng thử lại."
            );
        } finally {
            setSaving(false);
        }
    };

    // ================== MÀN CHI TIẾT ==================
    if (view === "detail" && selectedPromo) {
        const p = selectedPromo;
        const id = getPromoId(p);
        const status = getStatus(p);
        const isActive = status === "HoatDong";
        const isBusy = busyId === id;
        const usageLimit = getUsageLimit(p);

        return (
            <div className="vl-root">
                <style>{CSS}</style>

                <div className="vl-detail-topbar">
                    <button
                        type="button"
                        className="vl-btn vl-btn-ghost"
                        onClick={handleBackToList}
                        disabled={saving}
                    >
                        <ArrowLeft size={16} />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>

                {actionMessage && !isEditing && (
                    <div className={cx("vl-banner", actionMessage.type === "success" ? "vl-banner-success" : "vl-banner-error")}>
                        {actionMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{actionMessage.text}</span>
                    </div>
                )}

                {saveError && (
                    <div className="vl-banner vl-banner-error">
                        <AlertCircle size={18} />
                        <span>{saveError}</span>
                    </div>
                )}

                <div className="vl-detail-card">
                    <div className="vl-detail-header">
                        <div>
                            {isEditing ? (
                                <input
                                    className="vl-input vl-edit-title-input"
                                    value={editForm.tenKhuyenMai}
                                    onChange={(e) => handleEditFieldChange("tenKhuyenMai", e.target.value)}
                                    placeholder="Tên khuyến mãi"
                                />
                            ) : (
                                <h2 className="vl-detail-name">{getPromoName(p)}</h2>
                            )}
                            <span className={cx("vl-status", getStatusClassName(status))}>
                                {getStatusLabel(status)}
                            </span>
                        </div>
                        <div className="vl-detail-header-actions">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        className="vl-btn vl-btn-primary"
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={15} className="vl-spin" /> : <Save size={15} />}
                                        <span>Lưu</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="vl-btn vl-btn-ghost"
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                    >
                                        <X size={15} />
                                        <span>Hủy</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className="vl-btn vl-btn-primary" onClick={handleStartEdit}>
                                        <Pencil size={15} />
                                        <span>Sửa</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="vl-btn vl-btn-ghost"
                                        onClick={() => handleToggleVisibility(p)}
                                        disabled={isBusy}
                                    >
                                        {isBusy ? (
                                            <Loader2 size={15} className="vl-spin" />
                                        ) : isActive ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                        <span>{isActive ? "Ẩn" : "Hiện"}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {!isEditing ? (
                        <div className="vl-detail-panel">
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Gói áp dụng</span>
                                <span className="vl-detail-value">{getPlanLabel(p)}</span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Loại khuyến mãi</span>
                                <span className="vl-detail-value">
                                    {PROMO_TYPE_LABELS[getPromoType(p)] ?? getPromoType(p) ?? "-"}
                                </span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Giá trị</span>
                                <span className="vl-detail-value">{getValueLabel(p)}</span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Hiệu lực</span>
                                <span className="vl-detail-value">
                                    {formatDate(getNgayBatDau(p))} {" → "} {formatDate(getNgayKetThuc(p))}
                                </span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Lượt dùng</span>
                                <span className="vl-detail-value">
                                    {getUsageCount(p)}
                                    {usageLimit ? ` / ${usageLimit}` : " / ∞"}
                                </span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Người tạo</span>
                                <span className="vl-detail-value">{getCreator(p) || "-"}</span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Ngày tạo</span>
                                <span className="vl-detail-value">{formatDateTime(getCreatedAt(p))}</span>
                            </div>
                            <div className="vl-detail-item">
                                <span className="vl-detail-label">Cập nhật lần cuối</span>
                                <span className="vl-detail-value">{formatDateTime(getUpdatedAt(p))}</span>
                            </div>
                            <div className="vl-detail-item vl-detail-item-full">
                                <span className="vl-detail-label">Mô tả</span>
                                <span className="vl-detail-value">{getDescription(p) || "Không có mô tả."}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="vl-edit-form">
                            <div className="vl-edit-field">
                                <label className="vl-label">Gói áp dụng</label>
                                <select
                                    className="vl-input"
                                    value={editForm.planId}
                                    onChange={(e) => handleEditFieldChange("planId", e.target.value)}
                                >
                                    <option value="">-- Chọn gói --</option>
                                    {plans.map((pl) => (
                                        <option key={getPlanId(pl)} value={getPlanId(pl)}>
                                            {getPlanLabel(pl)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="vl-edit-field">
                                <label className="vl-label">Loại khuyến mãi</label>
                                <select
                                    className="vl-input"
                                    value={editForm.promoType}
                                    onChange={(e) => handleEditFieldChange("promoType", e.target.value)}
                                >
                                    {Object.entries(PROMO_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {editForm.promoType === "GiamPhanTram" && (
                                <>
                                    <div className="vl-edit-field">
                                        <label className="vl-label">Phần trăm giảm (%)</label>
                                        <input
                                            type="number"
                                            className="vl-input"
                                            value={editForm.phanTramGiam}
                                            onChange={(e) => handleEditFieldChange("phanTramGiam", e.target.value)}
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <div className="vl-edit-field">
                                        <label className="vl-label">Mức giảm tối đa (đ)</label>
                                        <input
                                            type="number"
                                            className="vl-input"
                                            value={editForm.mucGiamToiDa}
                                            onChange={(e) => handleEditFieldChange("mucGiamToiDa", e.target.value)}
                                            min="0"
                                        />
                                    </div>
                                </>
                            )}

                            {editForm.promoType === "GiamTienMat" && (
                                <div className="vl-edit-field">
                                    <label className="vl-label">Số tiền giảm (đ)</label>
                                    <input
                                        type="number"
                                        className="vl-input"
                                        value={editForm.soTienGiam}
                                        onChange={(e) => handleEditFieldChange("soTienGiam", e.target.value)}
                                        min="0"
                                    />
                                </div>
                            )}

                            {editForm.promoType === "TangNgay" && (
                                <div className="vl-edit-field">
                                    <label className="vl-label">Số ngày tặng</label>
                                    <input
                                        type="number"
                                        className="vl-input"
                                        value={editForm.soNgayTang}
                                        onChange={(e) => handleEditFieldChange("soNgayTang", e.target.value)}
                                        min="0"
                                    />
                                </div>
                            )}

                            {editForm.promoType === "TangChuKy" && (
                                <div className="vl-edit-field">
                                    <label className="vl-label">Số chu kỳ tặng (1 chu kỳ = 30 ngày)</label>
                                    <input
                                        type="number"
                                        className="vl-input"
                                        value={editForm.soChuKyTang}
                                        onChange={(e) => handleEditFieldChange("soChuKyTang", e.target.value)}
                                        min="0"
                                    />
                                </div>
                            )}

                            <div className="vl-edit-field">
                                <label className="vl-label">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    className="vl-input"
                                    value={editForm.ngayBatDau}
                                    onChange={(e) => handleEditFieldChange("ngayBatDau", e.target.value)}
                                />
                            </div>

                            <div className="vl-edit-field">
                                <label className="vl-label">Ngày kết thúc</label>
                                <input
                                    type="date"
                                    className="vl-input"
                                    value={editForm.ngayKetThuc}
                                    onChange={(e) => handleEditFieldChange("ngayKetThuc", e.target.value)}
                                />
                            </div>

                            <div className="vl-edit-field">
                                <label className="vl-label">Giới hạn lượt dùng (để trống = không giới hạn)</label>
                                <input
                                    type="number"
                                    className="vl-input"
                                    value={editForm.gioiHanLuot}
                                    onChange={(e) => handleEditFieldChange("gioiHanLuot", e.target.value)}
                                    min="1"
                                />
                            </div>

                            <div className="vl-edit-field vl-edit-field-full">
                                <label className="vl-label">Mô tả</label>
                                <textarea
                                    className="vl-input vl-textarea"
                                    rows={3}
                                    value={editForm.moTa}
                                    onChange={(e) => handleEditFieldChange("moTa", e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ================== MÀN DANH SÁCH ==================
    return (
        <div className="vl-root">
            <style>{CSS}</style>

            <div className="vl-topbar">
                <div>
                    <h1 className="vl-title">Danh sách voucher</h1>
                    <p className="vl-subtitle">Quản lý toàn bộ chương trình khuyến mãi đang có trong hệ thống.</p>
                </div>
                <button
                    type="button"
                    className="vl-btn vl-btn-primary"
                    onClick={() => navigate("/admin/voucher-create")}
                >
                    <Plus size={16} />
                    <span>Tạo voucher</span>
                </button>
            </div>

            {actionMessage && (
                <div className={cx("vl-banner", actionMessage.type === "success" ? "vl-banner-success" : "vl-banner-error")}>
                    {actionMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{actionMessage.text}</span>
                </div>
            )}

            {/* ---------------- Bộ lọc ---------------- */}
            <form className="vl-filter-card" onSubmit={handleSearch}>
                <div className="vl-filter-field vl-filter-field-grow">
                    <label className="vl-label">Tìm theo tên</label>
                    <div className="vl-search-input-wrap">
                        <Search size={15} className="vl-search-icon" />
                        <input
                            className="vl-input vl-search-input"
                            placeholder="VD: Ưu đãi hè..."
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                        />
                    </div>
                </div>

                <div className="vl-filter-field">
                    <label className="vl-label">Gói tập</label>
                    <select
                        className="vl-input"
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                    >
                        <option value="">Tất cả gói</option>
                        {plans.map((p) => (
                            <option key={getPlanId(p)} value={getPlanId(p)}>
                                {getPlanLabel(p)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="vl-filter-actions">
                    <button type="submit" className="vl-btn vl-btn-primary">
                        <Search size={15} />
                        <span>Tìm</span>
                    </button>
                    <button type="button" className="vl-btn vl-btn-ghost" onClick={handleResetFilter}>
                        Xóa lọc
                    </button>
                </div>
            </form>

            {/* ---------------- Bảng danh sách ---------------- */}
            <div className="vl-table-card">
                {loading ? (
                    <div className="vl-state">
                        <Loader2 size={22} className="vl-spin" />
                        <span>Đang tải danh sách...</span>
                    </div>
                ) : loadError ? (
                    <div className="vl-state vl-state-error">
                        <AlertCircle size={22} />
                        <span>{loadError}</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="vl-state">
                        <Ticket size={22} />
                        <span>Chưa có khuyến mãi nào phù hợp.</span>
                    </div>
                ) : (
                    <div className="vl-table-scroll">
                        <table className="vl-table">
                            <thead>
                                <tr>
                                    <th>Tên khuyến mãi</th>
                                    <th>Gói áp dụng</th>
                                    <th>Loại</th>
                                    <th>Giá trị</th>
                                    <th>Hiệu lực</th>
                                    <th>Lượt dùng</th>
                                    <th>Trạng thái</th>
                                    <th className="vl-th-actions">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((p) => {
                                    const id = getPromoId(p);
                                    const status = getStatus(p);
                                    const isActive = status === "HoatDong";
                                    const isBusy = busyId === id;
                                    const usageLimit = getUsageLimit(p);

                                    return (
                                        <tr key={id}>
                                            <td className="vl-td-name">
                                                <span className="vl-name-text">{getPromoName(p)}</span>
                                            </td>
                                            <td>{getPlanLabel(p)}</td>
                                            <td>{PROMO_TYPE_LABELS[getPromoType(p)] ?? getPromoType(p) ?? "-"}</td>
                                            <td className="vl-td-value">{getValueLabel(p)}</td>
                                            <td className="vl-td-dates">
                                                {formatDate(getNgayBatDau(p))} {" → "} {formatDate(getNgayKetThuc(p))}
                                            </td>
                                            <td>
                                                {getUsageCount(p)}
                                                {usageLimit ? ` / ${usageLimit}` : " / ∞"}
                                            </td>
                                            <td>
                                                <span className={cx("vl-status", getStatusClassName(status))}>
                                                    {getStatusLabel(status)}
                                                </span>
                                            </td>
                                            <td className="vl-td-actions">
                                                <button
                                                    type="button"
                                                    className="vl-btn vl-btn-ghost vl-btn-sm"
                                                    onClick={() => handleViewDetail(p)}
                                                >
                                                    <Eye size={14} />
                                                    <span>Xem</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="vl-btn vl-btn-ghost vl-btn-sm"
                                                    onClick={() => handleToggleVisibility(p)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? (
                                                        <Loader2 size={14} className="vl-spin" />
                                                    ) : isActive ? (
                                                        <EyeOff size={14} />
                                                    ) : (
                                                        <Eye size={14} />
                                                    )}
                                                    <span>{isActive ? "Ẩn" : "Hiện"}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !loadError && items.length > 0 && (
                    <div className="vl-pagination">
                        <span className="vl-pagination-info">
                            Trang {page}/{totalPages} — {totalCount} khuyến mãi
                        </span>
                        <div className="vl-pagination-actions">
                            <button
                                type="button"
                                className="vl-btn vl-btn-ghost"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft size={16} />
                                <span>Trước</span>
                            </button>
                            <button
                                type="button"
                                className="vl-btn vl-btn-ghost"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                <span>Sau</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
 * CSS thuần, prefix "vl-" (Voucher List). Đồng bộ tông màu với
 * VoucherCreatePage: nền #F1F5F9, card viền xanh nhạt #A7F3D0, accent
 * xanh lá #059669/#047857, chữ #1E293B/#475569/#64748B/#94A3B8, đỏ
 * cảnh báo #DC2626, shadow tint xanh cho khối nổi bật.
 *
 * Badge trạng thái (4 màu riêng biệt):
 *   - Chờ hoạt động (NhapLieu): vàng hổ phách #D97706
 *   - Hoạt động (HoatDong):     xanh lá        #059669
 *   - Tạm dừng (TamDung):       xám xanh       #64748B
 *   - Hết hạn (HetHan):         đỏ             #DC2626
 * ------------------------------------------------------------------ */
const CSS = `
.vl-root {
  max-width: 1180px;
  margin: 0 auto;
  color: #1E293B;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.vl-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.vl-title {
  margin: 0 0 2px 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #1E293B;
}

.vl-subtitle {
  margin: 0;
  font-size: 13.5px;
  color: #64748B;
}

.vl-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 16px;
}
.vl-banner-success { background: #ECFDF5; color: #059669; box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.25); }
.vl-banner-error { background: #FEF2F2; color: #DC2626; box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.2); }

.vl-filter-card {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 16px;
  box-shadow: 0 14px 32px -14px rgba(5, 150, 105, 0.26);
}

.vl-filter-field { display: flex; flex-direction: column; min-width: 180px; }
.vl-filter-field-grow { flex: 1 1 260px; }

.vl-filter-actions { display: flex; gap: 8px; }

.vl-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 6px;
}

.vl-input {
  border: 1.5px solid #94A3B8;
  background: #FFFFFF;
  border-radius: 9px;
  padding: 9px 11px;
  font-size: 13.5px;
  color: #1E293B;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  width: 100%;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.vl-input:hover { border-color: #64748B; }
.vl-input:focus {
  outline: none;
  border-color: #059669;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18);
}
.vl-input::placeholder { color: #94A3B8; }

.vl-textarea { resize: vertical; font-family: inherit; }

.vl-search-input-wrap { position: relative; }
.vl-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94A3B8; }
.vl-search-input { width: 100%; padding-left: 32px; }

.vl-table-card {
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 14px 32px -14px rgba(5, 150, 105, 0.26);
  overflow: hidden;
}

.vl-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 20px;
  color: #94A3B8;
  font-size: 13.5px;
}
.vl-state-error { color: #DC2626; }

.vl-table-scroll { overflow-x: auto; }

.vl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.vl-table thead th {
  text-align: left;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748B;
  background: #F0FDF4;
  padding: 11px 14px;
  border-bottom: 1.5px solid #A7F3D0;
  white-space: nowrap;
}
.vl-th-actions { text-align: right; }

.vl-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #F1F5F9;
  color: #1E293B;
  vertical-align: top;
}
.vl-table tbody tr:last-child td { border-bottom: none; }
.vl-table tbody tr:hover { background: #F8FAFC; }

.vl-td-name { min-width: 180px; }
.vl-name-text { display: block; font-weight: 700; }

.vl-td-value { font-weight: 700; color: #047857; white-space: nowrap; }
.vl-td-dates { white-space: nowrap; color: #475569; }

/* ---- Badge trạng thái: chấm tròn + viền + shadow màu theo trạng thái ---- */
.vl-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px 4px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  border: 1.5px solid transparent;
  white-space: nowrap;
}
.vl-status::before {
  content: "";
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 2.5px color-mix(in srgb, currentColor 18%, transparent);
}

/* Hoạt động — xanh lá */
.vl-status-active {
  background: #ECFDF5;
  color: #059669;
  border-color: #A7F3D0;
  box-shadow: 0 2px 8px -3px rgba(5, 150, 105, 0.45);
}
/* Chờ hoạt động (NhapLieu) — vàng hổ phách */
.vl-status-pending {
  background: #FFFBEB;
  color: #D97706;
  border-color: #FDE68A;
  box-shadow: 0 2px 8px -3px rgba(217, 119, 6, 0.4);
}
/* Tạm dừng — xám xanh */
.vl-status-paused {
  background: #F1F5F9;
  color: #64748B;
  border-color: #CBD5E1;
  box-shadow: 0 2px 8px -3px rgba(100, 116, 139, 0.3);
}
/* Hết hạn — đỏ */
.vl-status-expired {
  background: #FEF2F2;
  color: #DC2626;
  border-color: #FECACA;
  box-shadow: 0 2px 8px -3px rgba(220, 38, 38, 0.4);
}
/* fallback nếu gặp trạng thái lạ */
.vl-status-off { background: #F1F5F9; color: #64748B; border-color: #E2E8F0; }

.vl-td-actions { text-align: right; white-space: nowrap; }

.vl-btn-sm { padding: 6px 10px; font-size: 12.5px; margin-left: 6px; }

.vl-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1.5px solid #A7F3D0;
  background: #F8FAFC;
}
.vl-pagination-info { font-size: 12.5px; color: #64748B; }
.vl-pagination-actions { display: flex; gap: 8px; }

.vl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, box-shadow 0.15s, transform 0.1s;
  white-space: nowrap;
}
.vl-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.vl-btn:active:not(:disabled) { transform: translateY(1px); }

.vl-btn-ghost {
  background: #F1F5F9;
  color: #475569;
  border: 1.5px solid #E2E8F0;
}
.vl-btn-ghost:hover:not(:disabled) { background: #E2E8F0; border-color: #CBD5E1; }

.vl-btn-primary {
  background: linear-gradient(135deg, #059669, #047857);
  color: #FFFFFF;
  box-shadow: 0 6px 14px -6px rgba(5, 150, 105, 0.5);
}
.vl-btn-primary:hover:not(:disabled) { box-shadow: 0 8px 18px -6px rgba(5, 150, 105, 0.6); }

.vl-spin { animation: vl-spin 0.8s linear infinite; }
@keyframes vl-spin { to { transform: rotate(360deg); } }

/* ---------------- Màn chi tiết ---------------- */
.vl-detail-topbar { margin-bottom: 16px; }

.vl-detail-card {
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 14px 32px -14px rgba(5, 150, 105, 0.26);
  padding: 22px 24px;
}

.vl-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1.5px solid #F1F5F9;
}

.vl-detail-name {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 800;
  color: #1E293B;
}

.vl-edit-title-input {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  max-width: 360px;
}

.vl-detail-header-actions { display: flex; gap: 8px; }

.vl-detail-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px 24px;
}

.vl-detail-item { display: flex; flex-direction: column; gap: 4px; }
.vl-detail-item-full { grid-column: 1 / -1; }
.vl-detail-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #94A3B8; }
.vl-detail-value { font-size: 14px; color: #1E293B; word-break: break-word; }

.vl-edit-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px 20px;
}
.vl-edit-field { display: flex; flex-direction: column; }
.vl-edit-field-full { grid-column: 1 / -1; }

@media (max-width: 720px) {
  .vl-topbar { flex-direction: column; align-items: stretch; }
  .vl-filter-card { flex-direction: column; align-items: stretch; }
  .vl-filter-actions { justify-content: flex-end; }
  .vl-detail-header { flex-direction: column; }
}
`;