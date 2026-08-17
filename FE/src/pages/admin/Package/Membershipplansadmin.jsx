import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../../../api/adminApi";
const STYLES = `
:root {
  --mp-bg: #f1f5f9;
  --mp-panel: #ffffff;
  --mp-panel-alt: #ecfdf3;
  --mp-border: #cbd5e1;
  --mp-accent: #16a34a;
  --mp-accent-hover: #15803d;
  --mp-accent-soft: rgba(22, 163, 74, 0.12);
  --mp-text-title: #0f172a;
  --mp-text-sub: #64748b;
  --mp-text-muted: #94a3b8;
  --mp-danger: #dc2626;
  --mp-danger-soft: rgba(220, 38, 38, 0.08);
  --mp-success: #15803d;
  --mp-success-soft: rgba(22, 163, 74, 0.12);
  --mp-radius: 10px;
  --mp-radius-sm: 6px;
}
.mp-page { min-height: 100%; background: var(--mp-bg); color: var(--mp-text-title); padding: 28px; font-family: "Inter","Segoe UI",system-ui,-apple-system,sans-serif; box-sizing: border-box; }
.mp-page * { box-sizing: border-box; }
.mp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.mp-header-titles h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: var(--mp-text-title); letter-spacing: -0.01em; }
.mp-header-titles p { margin: 0; font-size: 13.5px; color: var(--mp-text-sub); }
.mp-breadcrumb { font-size: 12.5px; color: var(--mp-text-muted); margin-bottom: 6px; }
.mp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: var(--mp-radius-sm); border: 1.5px solid var(--mp-border); background: var(--mp-panel); color: var(--mp-text-title); font-size: 13.5px; font-weight: 600; padding: 9px 16px; cursor: pointer; transition: background .15s, border-color .15s, color .15s, transform .05s; white-space: nowrap; }
.mp-btn:hover { border-color: var(--mp-accent); color: var(--mp-accent-hover); }
.mp-btn:active { transform: translateY(1px); }
.mp-btn:disabled { opacity: .55; cursor: not-allowed; }
.mp-btn-primary { background: var(--mp-accent); border-color: var(--mp-accent); color: #ffffff; }
.mp-btn-primary:hover { background: var(--mp-accent-hover); border-color: var(--mp-accent-hover); color: #ffffff; }
.mp-btn-danger { color: var(--mp-danger); }
.mp-btn-danger:hover { border-color: var(--mp-danger); background: var(--mp-danger-soft); color: var(--mp-danger); }
.mp-btn-ghost { border-color: var(--mp-border); color: var(--mp-text-sub); padding: 9px 10px; background: var(--mp-panel); }
.mp-btn-ghost:hover { background: var(--mp-panel-alt); color: var(--mp-accent-hover); border-color: var(--mp-accent); }
.mp-btn-sm { padding: 6px 10px; font-size: 12.5px; }
.mp-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.mp-search { position: relative; flex: 1 1 260px; max-width: 360px; }
.mp-search input { width: 100%; background: var(--mp-panel); border: 1.5px solid var(--mp-border); border-radius: var(--mp-radius-sm); color: var(--mp-text-title); font-size: 13.5px; padding: 10px 12px 10px 36px; outline: none; transition: border-color .15s, box-shadow .15s; }
.mp-search input::placeholder { color: var(--mp-text-muted); }
.mp-search input:focus { border-color: var(--mp-accent); box-shadow: 0 0 0 3px var(--mp-accent-soft); }
.mp-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--mp-accent-hover); pointer-events: none; }
.mp-panel { background: var(--mp-panel); border: 1.5px solid var(--mp-border); border-top: 3px solid var(--mp-accent); border-radius: var(--mp-radius); overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); }
.mp-table-wrap { width: 100%; overflow-x: auto; }
.mp-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.mp-table thead th { text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--mp-accent-hover); padding: 14px 18px; border-bottom: 1.5px solid var(--mp-border); background: var(--mp-panel-alt); }
.mp-table tbody td { padding: 14px 18px; font-size: 13.5px; color: var(--mp-text-title); border-bottom: 1px solid var(--mp-border); vertical-align: middle; }
.mp-table tbody tr:last-child td { border-bottom: none; }
.mp-table tbody tr { transition: background .12s; }
.mp-table tbody tr:hover { background: var(--mp-panel-alt); }
.mp-plan-name { font-weight: 600; color: var(--mp-text-title); }
.mp-plan-sub { font-size: 12px; color: var(--mp-text-muted); margin-top: 2px; }
.mp-cell-actions { display: flex; gap: 6px; justify-content: flex-end; }
.mp-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px; border: 1px solid transparent; }
.mp-badge-popular { background: var(--mp-accent-soft); color: var(--mp-accent-hover); border-color: rgba(22,163,74,.35); }
.mp-badge-onsale { background: var(--mp-success-soft); color: var(--mp-success); border-color: rgba(22,163,74,.35); }
.mp-badge-discontinued { background: rgba(100,116,139,.1); color: var(--mp-text-sub); border-color: var(--mp-border); }
.mp-state { padding: 60px 20px; text-align: center; color: var(--mp-text-sub); font-size: 14px; }
.mp-state strong { display: block; color: var(--mp-text-title); font-size: 15px; margin-bottom: 6px; }
.mp-error-banner { background: var(--mp-danger-soft); border: 1.5px solid rgba(220,38,38,.35); color: var(--mp-danger); border-radius: var(--mp-radius-sm); padding: 12px 14px; font-size: 13px; margin-bottom: 16px; }
.mp-list-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; font-size: 12.5px; color: var(--mp-text-muted); flex-wrap: wrap; gap: 8px; }
.mp-spinner { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--mp-border); border-top-color: var(--mp-accent); animation: mp-spin .7s linear infinite; margin: 0 auto 14px; }
@keyframes mp-spin { to { transform: rotate(360deg); } }

/* Modal dùng chung cho cả Xem chi tiết và Sửa gói (gộp vào trang list) */
.mp-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
.mp-modal { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; background: var(--mp-panel); border: 1.5px solid var(--mp-border); border-top: 4px solid var(--mp-accent); border-radius: var(--mp-radius); padding: 24px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25); }
.mp-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.mp-modal-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--mp-text-title); }
.mp-modal-close { background: transparent; border: none; color: var(--mp-text-muted); font-size: 20px; line-height: 1; cursor: pointer; padding: 4px; }
.mp-modal-close:hover { color: var(--mp-text-title); }
.mp-price { font-size: 28px; font-weight: 700; color: var(--mp-accent-hover); margin: 14px 0 4px; }
.mp-price span { font-size: 13.5px; font-weight: 500; color: var(--mp-text-sub); margin-left: 6px; }
.mp-modal-desc { color: var(--mp-text-sub); font-size: 13.5px; line-height: 1.65; margin: 14px 0 18px; white-space: pre-wrap; }
.mp-field-list { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1.5px solid var(--mp-border); border-radius: 10px; background: var(--mp-panel-alt); }
.mp-field-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.mp-field-label { color: var(--mp-text-muted); }
.mp-field-value { color: var(--mp-text-title); font-weight: 600; text-align: right; }
.mp-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 18px; border-top: 1.5px solid var(--mp-border); }

/* Form (dùng trong modal khi Sửa) */
.mp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.mp-form-field { display: flex; flex-direction: column; gap: 6px; }
.mp-form-field.mp-span-2 { grid-column: 1 / -1; }
.mp-form-field label { font-size: 12.5px; font-weight: 600; color: var(--mp-text-sub); }
.mp-required { color: var(--mp-danger); margin-left: 2px; }
.mp-input, .mp-textarea { width: 100%; background: var(--mp-bg); border: 1.5px solid var(--mp-border); border-radius: var(--mp-radius-sm); color: var(--mp-text-title); font-size: 13.5px; padding: 10px 12px; outline: none; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
.mp-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
.mp-input:focus, .mp-textarea:focus { border-color: var(--mp-accent); box-shadow: 0 0 0 3px var(--mp-accent-soft); }
.mp-input.mp-input-error, .mp-textarea.mp-input-error { border-color: var(--mp-danger); }
.mp-field-error { font-size: 12px; color: var(--mp-danger); }
.mp-input-prefix { position: relative; }
.mp-input-prefix span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--mp-text-muted); }
.mp-input-prefix input { padding-left: 32px; }
.mp-checkbox-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.mp-checkbox-row input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--mp-accent); cursor: pointer; }
.mp-checkbox-row label { font-size: 13.5px; color: var(--mp-text-title); cursor: pointer; }

@media (max-width: 720px) {
  .mp-page { padding: 16px; }
  .mp-header { flex-direction: column; align-items: stretch; }
  .mp-header-titles h1 { font-size: 19px; }
  .mp-toolbar { flex-direction: column; align-items: stretch; }
  .mp-search { max-width: none; }
  .mp-table-wrap { overflow: visible; }
  .mp-table { min-width: 0; }
  .mp-table thead { display: none; }
  .mp-table, .mp-table tbody, .mp-table tr, .mp-table td { display: block; width: 100%; }
  .mp-table tr { border-bottom: 1.5px solid var(--mp-border); padding: 14px 16px; }
  .mp-table tbody tr:hover { background: transparent; }
  .mp-table td { border-bottom: none; padding: 6px 0; }
  .mp-table td[data-label]::before { content: attr(data-label); display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--mp-text-muted); margin-bottom: 3px; }
  .mp-cell-actions { justify-content: flex-start; margin-top: 6px; }
  .mp-modal { padding: 18px; }
  .mp-form-grid { grid-template-columns: 1fr; }
}
`;

// API có thể trả thẳng mảng/obj (fetch thuần) hoặc bọc trong { data: ... } (axios).
// Hàm này xử lý cả 2 kiểu để tránh set nhầm state rỗng dù API đã có dữ liệu.
function unwrap(res) {
    if (res == null) return res;
    if (Array.isArray(res)) return res;
    if (typeof res === "object" && "data" in res && res.data !== undefined) {
        return res.data;
    }
    return res;
}

function formatCurrency(value) {
    const n = Number(value) || 0;
    return n.toLocaleString("vi-VN") + " đ";
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }) {
    if (status === "Discontinued") {
        return <span className="mp-badge mp-badge-discontinued">Ngừng bán</span>;
    }
    return <span className="mp-badge mp-badge-onsale">Đang bán</span>;
}

function validateForm(form) {
    const errors = {};
    if (!form.planName.trim()) errors.planName = "Vui lòng nhập tên gói tập.";
    if (form.price === "" || Number.isNaN(Number(form.price))) {
        errors.price = "Vui lòng nhập giá hợp lệ.";
    } else if (Number(form.price) < 0) {
        errors.price = "Giá không được nhỏ hơn 0.";
    }
    if (form.durationDays === "" || Number.isNaN(Number(form.durationDays))) {
        errors.durationDays = "Vui lòng nhập số ngày hợp lệ.";
    } else if (Number(form.durationDays) <= 0) {
        errors.durationDays = "Thời hạn phải lớn hơn 0 ngày.";
    }
    return errors;
}

export default function MembershipPlanList() {
    const navigate = useNavigate();

    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Modal state — dùng chung cho Xem chi tiết và Sửa gói, đều gộp trong trang list
    const [selectedId, setSelectedId] = useState(null);
    const [modalMode, setModalMode] = useState("view"); // "view" | "edit"
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [form, setForm] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const handle = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
        return () => clearTimeout(handle);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;

        async function fetchPlans() {
            setLoading(true);
            setError("");
            try {
                const res = await adminApi.getMembershipPlans({ packageName: searchTerm || undefined });
                const list = unwrap(res);
                if (!cancelled) setPlans(Array.isArray(list) ? list : []);
            } catch (err) {
                if (!cancelled) {
                    setError(err?.response?.data?.message || "Không tải được danh sách gói tập. Vui lòng thử lại.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchPlans();
        return () => {
            cancelled = true;
        };
    }, [searchTerm]);

    const loadDetail = async (planId) => {
        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        try {
            const res = await adminApi.getMembershipPlanDetail(planId);
            const plan = unwrap(res);
            setDetail(plan);
            return plan;
        } catch (err) {
            setDetailError(err?.response?.data?.message || "Không tải được chi tiết gói tập.");
            return null;
        } finally {
            setDetailLoading(false);
        }
    };

    const openView = async (planId) => {
        setSelectedId(planId);
        setModalMode("view");
        setSaveError("");
        await loadDetail(planId);
    };

    const openEdit = async (planId) => {
        setSelectedId(planId);
        setModalMode("edit");
        setSaveError("");
        const plan = await loadDetail(planId);
        if (plan) {
            setForm({
                planName: plan.planName ?? "",
                price: plan.price ?? "",
                durationDays: plan.durationDays ?? "",
                description: plan.description ?? "",
                isPopular: Boolean(plan.isPopular),
            });
            setFormErrors({});
        }
    };

    const switchToEdit = () => {
        if (!detail) return;
        setModalMode("edit");
        setSaveError("");
        setForm({
            planName: detail.planName ?? "",
            price: detail.price ?? "",
            durationDays: detail.durationDays ?? "",
            description: detail.description ?? "",
            isPopular: Boolean(detail.isPopular),
        });
        setFormErrors({});
    };

    const closeModal = () => {
        setSelectedId(null);
        setModalMode("view");
        setDetail(null);
        setDetailError("");
        setForm(null);
        setFormErrors({});
        setSaveError("");
    };

    const handleFormChange = (field) => (e) => {
        const value = field === "isPopular" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSaveError("");

        const validationErrors = validateForm(form);
        setFormErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const payload = {
            planName: form.planName.trim(),
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            description: form.description.trim(),
            isPopular: form.isPopular,
        };

        setSaving(true);
        try {
            await adminApi.updateMembershipPlan(selectedId, payload);
            const updatedPlan = { ...detail, ...payload };
            setDetail(updatedPlan);
            setPlans((prev) => prev.map((p) => (p.planId === selectedId ? { ...p, ...payload } : p)));
            setModalMode("view");
        } catch (err) {
            setSaveError(err?.response?.data?.message || "Cập nhật gói tập thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (plan) => {
        const ok = window.confirm(`Ngừng bán gói "${plan.planName}"? Gói sẽ không còn hiển thị trong danh sách bán.`);
        if (!ok) return;

        setDeletingId(plan.planId);
        setError("");
        try {
            await adminApi.deleteMembershipPlan(plan.planId);
            setPlans((prev) => prev.filter((p) => p.planId !== plan.planId));
            if (selectedId === plan.planId) closeModal();
        } catch (err) {
            setError(err?.response?.data?.message || "Xóa gói tập thất bại. Vui lòng thử lại.");
        } finally {
            setDeletingId(null);
        }
    };

    const isEmpty = useMemo(() => !loading && plans.length === 0, [loading, plans]);

    return (
        <div className="mp-page">
            <style>{STYLES}</style>

            <div className="mp-header">
                <div className="mp-header-titles">
                    <div className="mp-breadcrumb">Quản trị / Gói tập</div>
                    <h1>Danh sách gói tập</h1>
                    <p>Quản lý các gói tập đang bán cho hội viên.</p>
                </div>
                <button type="button" className="mp-btn mp-btn-primary" onClick={() => navigate("/admin/packages/new")}>
                    + Tạo gói tập
                </button>
            </div>

            <div className="mp-toolbar">
                <div className="mp-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm theo tên gói tập..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="mp-error-banner">{error}</div>}

            <div className="mp-panel">
                {loading ? (
                    <div className="mp-state">
                        <div className="mp-spinner" />
                        Đang tải danh sách gói tập...
                    </div>
                ) : isEmpty ? (
                    <div className="mp-state">
                        <strong>Chưa có gói tập nào</strong>
                        {searchTerm ? "Không tìm thấy gói tập phù hợp với từ khóa tìm kiếm." : "Bắt đầu bằng cách tạo gói tập đầu tiên."}
                    </div>
                ) : (
                    <div className="mp-table-wrap">
                        <table className="mp-table">
                            <thead>
                                <tr>
                                    <th>Tên gói</th>
                                    <th>Giá</th>
                                    <th>Thời hạn</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: "right" }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((plan) => (
                                    <tr key={plan.planId}>
                                        <td data-label="Tên gói">
                                            <div className="mp-plan-name">
                                                {plan.planName}
                                                {plan.isPopular && (
                                                    <span className="mp-badge mp-badge-popular" style={{ marginLeft: 8 }}>★ Phổ biến</span>
                                                )}
                                            </div>
                                            {plan.description && (
                                                <div className="mp-plan-sub">
                                                    {plan.description.length > 60 ? plan.description.slice(0, 60) + "..." : plan.description}
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Giá">{formatCurrency(plan.price)}</td>
                                        <td data-label="Thời hạn">{plan.durationDays} ngày</td>
                                        <td data-label="Trạng thái">
                                            <StatusBadge status={plan.status} />
                                        </td>
                                        <td data-label="Thao tác">
                                            <div className="mp-cell-actions">
                                                <button type="button" className="mp-btn mp-btn-ghost mp-btn-sm" onClick={() => openView(plan.planId)}>
                                                    Xem
                                                </button>
                                                <button type="button" className="mp-btn mp-btn-ghost mp-btn-sm" onClick={() => openEdit(plan.planId)}>
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    className="mp-btn mp-btn-danger mp-btn-sm"
                                                    disabled={deletingId === plan.planId}
                                                    onClick={() => handleDelete(plan)}
                                                >
                                                    {deletingId === plan.planId ? "Đang xóa..." : "Xóa"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!loading && plans.length > 0 && (
                <div className="mp-list-footer">
                    <span>{plans.length} gói tập</span>
                </div>
            )}

            {selectedId && (
                <div className="mp-modal-overlay" onClick={closeModal}>
                    <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
                        {detailLoading ? (
                            <div className="mp-state">
                                <div className="mp-spinner" />
                                Đang tải dữ liệu gói tập...
                            </div>
                        ) : detailError ? (
                            <>
                                <div className="mp-error-banner">{detailError}</div>
                                <div className="mp-modal-actions">
                                    <button type="button" className="mp-btn" onClick={closeModal}>Đóng</button>
                                </div>
                            </>
                        ) : modalMode === "view" && detail ? (
                            <>
                                <div className="mp-modal-header">
                                    <h2>{detail.planName}</h2>
                                    <button type="button" className="mp-modal-close" onClick={closeModal} aria-label="Đóng">×</button>
                                </div>

                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <StatusBadge status={detail.status} />
                                    {detail.isPopular && <span className="mp-badge mp-badge-popular">★ Phổ biến</span>}
                                </div>

                                <div className="mp-price">
                                    {formatCurrency(detail.price)}
                                    <span>/ {detail.durationDays} ngày</span>
                                </div>

                                <div className="mp-modal-desc">
                                    {detail.description || "Chưa có mô tả cho gói tập này."}
                                </div>

                                <div className="mp-field-list">
                                    <div className="mp-field-row">
                                        <span className="mp-field-label">Mã gói</span>
                                        <span className="mp-field-value">#{detail.planId}</span>
                                    </div>
                                    <div className="mp-field-row">
                                        <span className="mp-field-label">Ngày tạo</span>
                                        <span className="mp-field-value">{formatDate(detail.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="mp-modal-actions">
                                    <button type="button" className="mp-btn" onClick={closeModal}>Đóng</button>
                                    <button type="button" className="mp-btn mp-btn-primary" onClick={switchToEdit}>
                                        Sửa gói tập
                                    </button>
                                </div>
                            </>
                        ) : modalMode === "edit" && form ? (
                            <form onSubmit={handleSaveEdit}>
                                <div className="mp-modal-header">
                                    <h2>Sửa gói tập</h2>
                                    <button type="button" className="mp-modal-close" onClick={closeModal} aria-label="Đóng">×</button>
                                </div>

                                {saveError && <div className="mp-error-banner">{saveError}</div>}

                                <div className="mp-form-grid">
                                    <div className="mp-form-field mp-span-2">
                                        <label htmlFor="edit-planName">
                                            Tên gói tập<span className="mp-required">*</span>
                                        </label>
                                        <input
                                            id="edit-planName"
                                            type="text"
                                            className={`mp-input ${formErrors.planName ? "mp-input-error" : ""}`}
                                            value={form.planName}
                                            onChange={handleFormChange("planName")}
                                            disabled={saving}
                                        />
                                        {formErrors.planName && <span className="mp-field-error">{formErrors.planName}</span>}
                                    </div>

                                    <div className="mp-form-field">
                                        <label htmlFor="edit-price">
                                            Giá<span className="mp-required">*</span>
                                        </label>
                                        <div className="mp-input-prefix">
                                            <span>đ</span>
                                            <input
                                                id="edit-price"
                                                type="number"
                                                min="0"
                                                step="1000"
                                                className={`mp-input ${formErrors.price ? "mp-input-error" : ""}`}
                                                value={form.price}
                                                onChange={handleFormChange("price")}
                                                disabled={saving}
                                            />
                                        </div>
                                        {formErrors.price && <span className="mp-field-error">{formErrors.price}</span>}
                                    </div>

                                    <div className="mp-form-field">
                                        <label htmlFor="edit-durationDays">
                                            Thời hạn (ngày)<span className="mp-required">*</span>
                                        </label>
                                        <input
                                            id="edit-durationDays"
                                            type="number"
                                            min="1"
                                            step="1"
                                            className={`mp-input ${formErrors.durationDays ? "mp-input-error" : ""}`}
                                            value={form.durationDays}
                                            onChange={handleFormChange("durationDays")}
                                            disabled={saving}
                                        />
                                        {formErrors.durationDays && <span className="mp-field-error">{formErrors.durationDays}</span>}
                                    </div>

                                    <div className="mp-form-field mp-span-2">
                                        <label htmlFor="edit-description">Mô tả</label>
                                        <textarea
                                            id="edit-description"
                                            className="mp-textarea"
                                            value={form.description}
                                            onChange={handleFormChange("description")}
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="mp-form-field mp-span-2">
                                        <div className="mp-checkbox-row">
                                            <input
                                                id="edit-isPopular"
                                                type="checkbox"
                                                checked={form.isPopular}
                                                onChange={handleFormChange("isPopular")}
                                                disabled={saving}
                                            />
                                            <label htmlFor="edit-isPopular">Đánh dấu là gói tập phổ biến (Popular)</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mp-modal-actions">
                                    <button type="button" className="mp-btn" onClick={() => setModalMode("view")} disabled={saving}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="mp-btn mp-btn-primary" disabled={saving}>
                                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}