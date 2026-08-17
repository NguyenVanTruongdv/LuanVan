import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, Info, Loader2, Percent, Repeat, Ticket, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi"; // chỉnh lại đường dẫn cho khớp project của bạn

/**
 * VoucherCreatePage
 * ------------------------------------------------------------------
 * Trang "Tạo voucher" (khuyến mãi mới), gắn với route /admin/voucher-create
 * đã khai báo sẵn trong AdminLayout (mục "Quản lý voucher" > "Tạo voucher").
 * Chỉ render PHẦN NỘI DUNG — Sidebar/Header đã có sẵn ở AdminLayout, trang
 * này render bên trong <Outlet />.
 *
 * Danh sách gói tập lấy qua adminApi.getMembershipPlans() (GET /api/packages).
 *
 * TRẠNG THÁI: 4 giá trị khớp CHÍNH XÁC với CHECK constraint của cột TrangThai
 * trong DB — NhapLieu / HoatDong / TamDung / HetHan. 3 trạng thái đầu do BE
 * TỰ ĐỘNG tính theo NgayBatDau/NgayKetThuc, FE KHÔNG được chọn tuỳ ý. Chỉ có
 * "Tạm dừng" (TamDung) là thao tác thủ công — cho phép tạo và ẩn ngay từ đầu.
 * Trước đây field này gửi sai giá trị "TamNgung" (không tồn tại trong DB),
 * nay đã sửa đúng thành "TamDung".
 *
 * Tạo khuyến mãi qua adminApi.createPromotion() (POST /api/promotions), khớp
 * CreatePromotionRequest (BE.Dtos.Promotion). Các field số liệu chỉ gửi đúng
 * theo PromoType đang chọn, các field khác để null — khớp quy tắc validate ở
 * PromotionService.ValidatePromotionData để tránh round-trip lỗi 400.
 * ------------------------------------------------------------------
 */

const PROMO_TYPES = [
    {
        value: "GiamPhanTram",
        label: "Giảm theo %",
        desc: "Giảm giá theo phần trăm giá gói, có thể giới hạn mức giảm tối đa.",
        icon: Percent,
    },
    {
        value: "GiamTienMat",
        label: "Giảm tiền mặt",
        desc: "Trừ thẳng một số tiền cố định vào giá gói.",
        icon: Wallet,
    },
    {
        value: "TangNgay",
        label: "Tặng ngày",
        desc: "Cộng thêm số ngày tập lẻ vào thời hạn gói.",
        icon: CalendarDays,
    },
    {
        value: "TangChuKy",
        label: "Tặng chu kỳ",
        desc: "Cộng thêm nguyên chu kỳ (1 chu kỳ = 30 ngày cố định).",
        icon: Repeat,
    },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const initialForm = {
    tenKhuyenMai: "",
    planId: "",
    promoType: "GiamPhanTram",
    phanTramGiam: "",
    mucGiamToiDa: "",
    soTienGiam: "",
    soNgayTang: "",
    soChuKyTang: "",
    ngayBatDau: todayStr(),
    ngayKetThuc: "",
    gioiHanLuot: "",
    moTa: "",
    trangThai: "", // "" = để BE tự tính theo ngày; "TamDung" = tạo và ẩn luôn
};

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

// Lấy id gói tập, thử qua nhiều key vì BE có thể trả PascalCase hoặc camelCase
// tuỳ cấu hình JSON serializer.
function getPlanId(p) {
    return p.planId ?? p.PlanId ?? p.id ?? p.Id ?? p.packageId ?? p.PackageId;
}

// Lấy tên hiển thị của gói tập, thử qua nhiều key phổ biến. Nếu không khớp
// key nào, in ra console để bạn soi field thật trong response rồi bổ sung
// thêm key vào mảng bên dưới.
function getPlanLabel(p) {
    const candidates = [
        p.tenGoi, p.TenGoi,
        p.name, p.Name,
        p.packageName, p.PackageName,
        p.tenGoiTap, p.TenGoiTap,
        p.planName, p.PlanName,
        p.title, p.Title,
    ];
    const found = candidates.find((v) => typeof v === "string" && v.trim() !== "");
    if (!found) {
        // eslint-disable-next-line no-console
        console.warn("[VoucherCreatePage] Không tìm thấy field tên gói trong object:", p);
    }
    return found ?? `Gói #${getPlanId(p)}`;
}

export default function VoucherCreatePage() {
    const navigate = useNavigate();

    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansError, setPlansError] = useState(null);

    const [form, setForm] = useState(initialForm);
    const [touched, setTouched] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Lấy danh sách gói tập để chọn PlanId, qua adminApi.getMembershipPlans()
    // (GET /api/packages — MembershipPlanController ở BE).
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setPlansLoading(true);
                setPlansError(null);
                const data = await adminApi.getMembershipPlans();
                const list = Array.isArray(data) ? data : data?.items ?? [];
                if (!cancelled) setPlans(list);
            } catch (err) {
                if (!cancelled) {
                    setPlansError(
                        err?.response?.data?.message || err.message || "Không tải được danh sách gói tập."
                    );
                }
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const setField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setSubmitSuccess(false);
    };

    const markTouched = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

    // ---------------- Validate phía FE, phản chiếu đúng luật ở BE ----------------
    const errors = useMemo(() => {
        const e = {};

        if (!form.tenKhuyenMai.trim()) e.tenKhuyenMai = "Vui lòng nhập tên khuyến mãi.";
        if (!form.planId) e.planId = "Vui lòng chọn gói tập áp dụng.";
        if (!form.ngayBatDau) e.ngayBatDau = "Vui lòng chọn ngày bắt đầu.";
        if (!form.ngayKetThuc) e.ngayKetThuc = "Vui lòng chọn ngày kết thúc.";
        if (form.ngayBatDau && form.ngayKetThuc && form.ngayKetThuc < form.ngayBatDau) {
            e.ngayKetThuc = "Ngày kết thúc không được trước ngày bắt đầu.";
        }

        switch (form.promoType) {
            case "GiamPhanTram": {
                const v = Number(form.phanTramGiam);
                if (!form.phanTramGiam || v <= 0) e.phanTramGiam = "Phải lớn hơn 0.";
                if (v > 100) e.phanTramGiam = "Không được vượt quá 100%.";
                break;
            }
            case "GiamTienMat": {
                const v = Number(form.soTienGiam);
                if (!form.soTienGiam || v <= 0) e.soTienGiam = "Phải lớn hơn 0.";
                break;
            }
            case "TangNgay": {
                const v = Number(form.soNgayTang);
                if (!form.soNgayTang || v <= 0) e.soNgayTang = "Phải lớn hơn 0.";
                else if (v >= 30 && v % 30 === 0) {
                    e.soNgayTang = `${v} là bội số của 30 — hệ thống sẽ từ chối. Dùng "Tặng chu kỳ" thay vì "Tặng ngày".`;
                } else if (v > 32767) {
                    e.soNgayTang = "Số ngày quá lớn.";
                }
                break;
            }
            case "TangChuKy": {
                const v = Number(form.soChuKyTang);
                if (!form.soChuKyTang || v <= 0) e.soChuKyTang = "Phải lớn hơn 0.";
                else if (v > 127) e.soChuKyTang = "Tối đa 127 chu kỳ.";
                break;
            }
            default:
                break;
        }

        if (form.gioiHanLuot !== "" && Number(form.gioiHanLuot) <= 0) {
            e.gioiHanLuot = "Nếu nhập, phải lớn hơn 0.";
        }

        return e;
    }, [form]);

    const hasErrors = Object.keys(errors).length > 0;

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        setTouched({
            tenKhuyenMai: true,
            planId: true,
            ngayBatDau: true,
            ngayKetThuc: true,
            phanTramGiam: true,
            soTienGiam: true,
            soNgayTang: true,
            soChuKyTang: true,
            gioiHanLuot: true,
        });
        if (hasErrors) return;

        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        // Chỉ gửi kèm field số liệu tương ứng đúng PromoType, các field còn lại để
        // null — khớp quy tắc "không được set field của loại khác" ở BE.
        const payload = {
            tenKhuyenMai: form.tenKhuyenMai.trim(),
            planId: Number(form.planId),
            promoType: form.promoType,
            phanTramGiam: form.promoType === "GiamPhanTram" ? Number(form.phanTramGiam) : null,
            mucGiamToiDa:
                form.promoType === "GiamPhanTram" && form.mucGiamToiDa !== ""
                    ? Number(form.mucGiamToiDa)
                    : null,
            soTienGiam: form.promoType === "GiamTienMat" ? Number(form.soTienGiam) : null,
            soNgayTang: form.promoType === "TangNgay" ? Number(form.soNgayTang) : null,
            soChuKyTang: form.promoType === "TangChuKy" ? Number(form.soChuKyTang) : null,
            ngayBatDau: form.ngayBatDau,
            ngayKetThuc: form.ngayKetThuc,
            gioiHanLuot: form.gioiHanLuot !== "" ? Number(form.gioiHanLuot) : null,
            moTa: form.moTa.trim() || null,
            // BE sẽ TỰ TÍNH lại NhapLieu/HoatDong/HetHan theo ngày — chỉ tôn trọng
            // "TamDung" nếu admin chủ động chọn tạo và ẩn ngay.
            trangThai: form.trangThai === "TamDung" ? "TamDung" : "HoatDong",
            // TODO: thay bằng id nhân viên đang đăng nhập thực tế (lấy từ context/auth),
            // hiện đang hardcode tạm để form chạy được độc lập.
            nguoiTao: 1,
        };

        try {
            await adminApi.createPromotion(payload);
            setSubmitSuccess(true);
            setForm(initialForm);
            setTouched({});
        } catch (err) {
            setSubmitError(
                err?.response?.data?.message || err.message || "Tạo khuyến mãi thất bại. Vui lòng kiểm tra lại thông tin."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const selectedType = PROMO_TYPES.find((t) => t.value === form.promoType);

    return (
        <div className="vc-root">
            <style>{CSS}</style>

            <div className="vc-topbar">
                <button type="button" className="vc-back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={17} />
                    <span>Quay lại</span>
                </button>
                <div>
                    <h1 className="vc-title">Tạo voucher mới</h1>
                    <p className="vc-subtitle">Thiết lập một chương trình khuyến mãi áp dụng cho gói tập.</p>
                </div>
            </div>

            {submitSuccess && (
                <div className="vc-banner vc-banner-success">
                    <CheckCircle2 size={18} />
                    <span>Tạo khuyến mãi thành công.</span>
                </div>
            )}

            {submitError && (
                <div className="vc-banner vc-banner-error">
                    <AlertCircle size={18} />
                    <span>{submitError}</span>
                </div>
            )}

            <form className="vc-form" onSubmit={handleSubmit} noValidate>
                {/* ---------------- Thông tin cơ bản ---------------- */}
                <section className="vc-card">
                    <div className="vc-card-head">
                        <h2 className="vc-card-title">Thông tin cơ bản</h2>
                        <p className="vc-card-desc">Tên hiển thị, gói tập áp dụng và mô tả cho khách.</p>
                    </div>

                    <div className="vc-field">
                        <label className="vc-label">Tên khuyến mãi</label>
                        <input
                            className={cx("vc-input", touched.tenKhuyenMai && errors.tenKhuyenMai && "vc-input-error")}
                            placeholder="VD: Ưu đãi hè 2026"
                            value={form.tenKhuyenMai}
                            onChange={(e) => setField("tenKhuyenMai", e.target.value)}
                            onBlur={() => markTouched("tenKhuyenMai")}
                        />
                        {touched.tenKhuyenMai && errors.tenKhuyenMai && (
                            <p className="vc-error-text">{errors.tenKhuyenMai}</p>
                        )}
                    </div>

                    <div className="vc-grid-2">
                        <div className="vc-field">
                            <label className="vc-label">Gói tập áp dụng</label>
                            <select
                                className={cx("vc-input", touched.planId && errors.planId && "vc-input-error")}
                                value={form.planId}
                                onChange={(e) => setField("planId", e.target.value)}
                                onBlur={() => markTouched("planId")}
                                disabled={plansLoading}
                            >
                                <option value="">
                                    {plansLoading ? "Đang tải danh sách gói..." : "-- Chọn gói tập --"}
                                </option>
                                {plans.map((p) => (
                                    <option key={getPlanId(p)} value={getPlanId(p)}>
                                        {getPlanLabel(p)}
                                    </option>
                                ))}
                            </select>
                            {touched.planId && errors.planId && <p className="vc-error-text">{errors.planId}</p>}
                            {plansError && (
                                <p className="vc-hint-text vc-hint-error">
                                    <Info size={13} /> {plansError}
                                </p>
                            )}
                        </div>


                    </div>

                    <div className="vc-field">
                        <label className="vc-label">
                            Mô tả <span className="vc-label-optional">(không bắt buộc)</span>
                        </label>
                        <textarea
                            className="vc-input vc-textarea"
                            placeholder="Mô tả ngắn hiển thị cho khách hàng..."
                            value={form.moTa}
                            onChange={(e) => setField("moTa", e.target.value)}
                            rows={3}
                        />
                    </div>
                </section>

                {/* ---------------- Loại khuyến mãi ---------------- */}
                <section className="vc-card">
                    <div className="vc-card-head">
                        <h2 className="vc-card-title">Loại khuyến mãi</h2>
                        <p className="vc-card-desc">Chọn 1 loại — các trường bên dưới sẽ đổi theo lựa chọn.</p>
                    </div>

                    <div className="vc-type-grid">
                        {PROMO_TYPES.map((t) => {
                            const Icon = t.icon;
                            const active = form.promoType === t.value;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    className={cx("vc-type-card", active && "vc-type-card-active")}
                                    onClick={() => setField("promoType", t.value)}
                                >
                                    <span className={cx("vc-type-icon", active && "vc-type-icon-active")}>
                                        <Icon size={18} />
                                    </span>
                                    <span className="vc-type-label">{t.label}</span>
                                    <span className="vc-type-desc">{t.desc}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="vc-type-fields">
                        {form.promoType === "GiamPhanTram" && (
                            <div className="vc-grid-2">
                                <div className="vc-field">
                                    <label className="vc-label">Phần trăm giảm (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className={cx(
                                            "vc-input",
                                            touched.phanTramGiam && errors.phanTramGiam && "vc-input-error"
                                        )}
                                        placeholder="VD: 15"
                                        value={form.phanTramGiam}
                                        onChange={(e) => setField("phanTramGiam", e.target.value)}
                                        onBlur={() => markTouched("phanTramGiam")}
                                    />
                                    {touched.phanTramGiam && errors.phanTramGiam && (
                                        <p className="vc-error-text">{errors.phanTramGiam}</p>
                                    )}
                                </div>
                                <div className="vc-field">
                                    <label className="vc-label">
                                        Mức giảm tối đa <span className="vc-label-optional">(không bắt buộc)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="vc-input"
                                        placeholder="VD: 200000"
                                        value={form.mucGiamToiDa}
                                        onChange={(e) => setField("mucGiamToiDa", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {form.promoType === "GiamTienMat" && (
                            <div className="vc-field">
                                <label className="vc-label">Số tiền giảm (VNĐ)</label>
                                <input
                                    type="number"
                                    min={0}
                                    className={cx(
                                        "vc-input",
                                        touched.soTienGiam && errors.soTienGiam && "vc-input-error"
                                    )}
                                    placeholder="VD: 100000"
                                    value={form.soTienGiam}
                                    onChange={(e) => setField("soTienGiam", e.target.value)}
                                    onBlur={() => markTouched("soTienGiam")}
                                />
                                {touched.soTienGiam && errors.soTienGiam && (
                                    <p className="vc-error-text">{errors.soTienGiam}</p>
                                )}
                            </div>
                        )}

                        {form.promoType === "TangNgay" && (
                            <div className="vc-field">
                                <label className="vc-label">Số ngày tặng</label>
                                <input
                                    type="number"
                                    min={1}
                                    className={cx(
                                        "vc-input",
                                        touched.soNgayTang && errors.soNgayTang && "vc-input-error"
                                    )}
                                    placeholder="VD: 7"
                                    value={form.soNgayTang}
                                    onChange={(e) => setField("soNgayTang", e.target.value)}
                                    onBlur={() => markTouched("soNgayTang")}
                                />
                                {touched.soNgayTang && errors.soNgayTang ? (
                                    <p className="vc-error-text">{errors.soNgayTang}</p>
                                ) : (
                                    <p className="vc-hint-text">
                                        <Info size={13} /> Dùng cho số ngày lẻ. Bội số của 30 sẽ bị từ chối — chọn
                                        "Tặng chu kỳ" cho trường hợp đó.
                                    </p>
                                )}
                            </div>
                        )}

                        {form.promoType === "TangChuKy" && (
                            <div className="vc-field">
                                <label className="vc-label">Số chu kỳ tặng</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={127}
                                    className={cx(
                                        "vc-input",
                                        touched.soChuKyTang && errors.soChuKyTang && "vc-input-error"
                                    )}
                                    placeholder="VD: 1"
                                    value={form.soChuKyTang}
                                    onChange={(e) => setField("soChuKyTang", e.target.value)}
                                    onBlur={() => markTouched("soChuKyTang")}
                                />
                                {touched.soChuKyTang && errors.soChuKyTang ? (
                                    <p className="vc-error-text">{errors.soChuKyTang}</p>
                                ) : (
                                    <p className="vc-hint-text">
                                        <Info size={13} /> 1 chu kỳ = 30 ngày cố định
                                        {form.soChuKyTang ? ` → tặng ${Number(form.soChuKyTang) * 30} ngày.` : "."}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* ---------------- Thời gian & giới hạn ---------------- */}
                <section className="vc-card">
                    <div className="vc-card-head">
                        <h2 className="vc-card-title">Thời gian &amp; giới hạn</h2>
                        <p className="vc-card-desc">Hiệu lực áp dụng và số lượt sử dụng tối đa.</p>
                    </div>

                    <div className="vc-grid-2">
                        <div className="vc-field">
                            <label className="vc-label">Ngày bắt đầu</label>
                            <input
                                type="date"
                                className={cx("vc-input", touched.ngayBatDau && errors.ngayBatDau && "vc-input-error")}
                                value={form.ngayBatDau}
                                onChange={(e) => setField("ngayBatDau", e.target.value)}
                                onBlur={() => markTouched("ngayBatDau")}
                            />
                            {touched.ngayBatDau && errors.ngayBatDau && (
                                <p className="vc-error-text">{errors.ngayBatDau}</p>
                            )}
                        </div>
                        <div className="vc-field">
                            <label className="vc-label">Ngày kết thúc</label>
                            <input
                                type="date"
                                className={cx("vc-input", touched.ngayKetThuc && errors.ngayKetThuc && "vc-input-error")}
                                value={form.ngayKetThuc}
                                onChange={(e) => setField("ngayKetThuc", e.target.value)}
                                onBlur={() => markTouched("ngayKetThuc")}
                            />
                            {touched.ngayKetThuc && errors.ngayKetThuc && (
                                <p className="vc-error-text">{errors.ngayKetThuc}</p>
                            )}
                        </div>
                    </div>

                    <div className="vc-field vc-field-narrow">
                        <label className="vc-label">
                            Giới hạn lượt dùng <span className="vc-label-optional">(bỏ trống = không giới hạn)</span>
                        </label>
                        <input
                            type="number"
                            min={1}
                            className={cx("vc-input", touched.gioiHanLuot && errors.gioiHanLuot && "vc-input-error")}
                            placeholder="VD: 100"
                            value={form.gioiHanLuot}
                            onChange={(e) => setField("gioiHanLuot", e.target.value)}
                            onBlur={() => markTouched("gioiHanLuot")}
                        />
                        {touched.gioiHanLuot && errors.gioiHanLuot && (
                            <p className="vc-error-text">{errors.gioiHanLuot}</p>
                        )}
                    </div>
                </section>

                {/* ---------------- Footer actions ---------------- */}
                <div className="vc-footer">
                    <div className="vc-footer-summary">
                        <Ticket size={16} className="vc-footer-icon" />
                        <span>
                            {selectedType?.label ?? "Khuyến mãi"} — áp dụng từ{" "}
                            <strong>{form.ngayBatDau || "…"}</strong> đến{" "}
                            <strong>{form.ngayKetThuc || "…"}</strong>
                        </span>
                    </div>
                    <div className="vc-footer-actions">
                        <button
                            type="button"
                            className="vc-btn vc-btn-ghost"
                            onClick={() => navigate(-1)}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button type="submit" className="vc-btn vc-btn-primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="vc-spin" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                <span>Tạo khuyến mãi</span>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ------------------------------------------------------------------
 * CSS thuần, prefix "vc-" (Voucher Create). Tông màu lấy nguyên từ
 * AdminLayout để đồng bộ: nền #F1F5F9, card trắng viền xanh nhạt #A7F3D0
 * cho nổi bật, accent xanh lá #059669/#047857, chữ #1E293B/#475569/#64748B/#94A3B8,
 * đỏ cảnh báo #DC2626. Shadow được tăng độ đậm + phủ tint xanh để card nổi khối rõ hơn.
 * ------------------------------------------------------------------ */
const CSS = `
.vc-root {
  max-width: 880px;
  margin: 0 auto;
  color: #1E293B;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.vc-topbar {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

.vc-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
  color: #475569;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.vc-back-btn:hover { background: #F0FDF4; color: #059669; border-color: #A7F3D0; }

.vc-title {
  margin: 0 0 2px 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #1E293B;
}

.vc-subtitle {
  margin: 0;
  font-size: 13.5px;
  color: #64748B;
}

.vc-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 16px;
}
.vc-banner-success { background: #ECFDF5; color: #059669; box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.25); }
.vc-banner-error { background: #FEF2F2; color: #DC2626; box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.2); }

.vc-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.vc-card {
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 14px 32px -12px rgba(5, 150, 105, 0.28);
}

.vc-card-head { margin-bottom: 14px; }
.vc-card-title { margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #1E293B; }
.vc-card-desc { margin: 0; font-size: 12.5px; color: #94A3B8; }

.vc-field { margin-bottom: 14px; }
.vc-field:last-child { margin-bottom: 0; }
.vc-field-narrow { max-width: 320px; }

.vc-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.vc-grid-2:last-child { margin-bottom: 0; }
.vc-grid-2 .vc-field { margin-bottom: 0; }

.vc-label {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 6px;
}
.vc-label-optional { font-weight: 500; color: #94A3B8; }

.vc-input {
  width: 100%;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  border-radius: 9px;
  padding: 9px 11px;
  font-size: 13.5px;
  color: #1E293B;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.vc-input::placeholder { color: #94A3B8; }
.vc-input:focus {
  outline: none;
  border-color: #059669;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.14);
}
.vc-input-error { border-color: #FCA5A5; background: #FEF2F2; }
.vc-input-error:focus { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12); }

.vc-textarea { resize: vertical; min-height: 64px; }

.vc-error-text { margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #DC2626; }
.vc-hint-text {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 6px 0 0 0;
  font-size: 12px;
  color: #64748B;
  line-height: 1.4;
}
.vc-hint-text svg { flex-shrink: 0; margin-top: 1px; }
.vc-hint-error { color: #DC2626; }

.vc-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.vc-type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  border: 1.5px solid #A7F3D0;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  box-shadow: 0 6px 16px -8px rgba(5, 150, 105, 0.18);
}
.vc-type-card:hover {
  border-color: #6EE7B7;
  background: #F0FDF4;
  box-shadow: 0 10px 22px -8px rgba(5, 150, 105, 0.3);
}
.vc-type-card-active {
  border-color: #059669;
  background: #ECFDF5;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18), 0 10px 24px -8px rgba(5, 150, 105, 0.35);
}

.vc-type-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #E2E8F0;
  color: #64748B;
}
.vc-type-icon-active { background: linear-gradient(135deg, #059669, #047857); color: #FFFFFF; }

.vc-type-label { font-size: 13px; font-weight: 700; color: #1E293B; }
.vc-type-desc { font-size: 11.5px; color: #94A3B8; line-height: 1.35; }

.vc-type-fields {
  border-top: 1px dashed #A7F3D0;
  padding-top: 14px;
}

.vc-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: 0 -10px 24px -14px rgba(5, 150, 105, 0.22), 0 12px 26px -14px rgba(5, 150, 105, 0.2);
}

.vc-footer-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #64748B;
  min-width: 0;
}
.vc-footer-icon { color: #059669; flex-shrink: 0; }
.vc-footer-summary strong { color: #1E293B; }

.vc-footer-actions { display: flex; gap: 8px; flex-shrink: 0; }

.vc-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, box-shadow 0.15s;
}
.vc-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.vc-btn-ghost {
  background: #F1F5F9;
  color: #475569;
}
.vc-btn-ghost:hover:not(:disabled) { background: #E2E8F0; }

.vc-btn-primary {
  background: linear-gradient(135deg, #059669, #047857);
  color: #FFFFFF;
  box-shadow: 0 6px 14px -6px rgba(5, 150, 105, 0.5);
}
.vc-btn-primary:hover:not(:disabled) { box-shadow: 0 8px 18px -6px rgba(5, 150, 105, 0.6); }

.vc-spin { animation: vc-spin 0.8s linear infinite; }
@keyframes vc-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .vc-grid-2 { grid-template-columns: 1fr; }
  .vc-type-grid { grid-template-columns: 1fr 1fr; }
  .vc-footer { flex-direction: column; align-items: stretch; }
  .vc-footer-actions { justify-content: flex-end; }
}

@media (max-width: 460px) {
  .vc-type-grid { grid-template-columns: 1fr; }
}
`;