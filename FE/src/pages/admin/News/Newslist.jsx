import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// NOTE: đổi lại đường dẫn import managerApi cho khớp cấu trúc thư mục thật
// của bạn nếu component này không nằm ở pages/news/.

const STATUS_LABEL = {
    Active: "Đang hoạt động",
    Hidden: "Đã ẩn",
};

const FILTER_DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---- Sub-components dùng chung để giảm lặp JSX ----

function StatusPill({ status }) {
    const isActive = status === "Active";
    return (
        <span className={`news-card__status news-card__status--${isActive ? "active" : "hidden"}`}>
            <span className="news-card__status-dot" aria-hidden="true" />
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function Field({ label, children }) {
    return (
        <div className="news-detail__field">
            <label className="news-detail__label">{label}</label>
            {children}
        </div>
    );
}

export default function NewsListOfAdmin() {
    const [branches, setBranches] = useState([]);
    const [newsItems, setNewsItems] = useState([]);
    const [branchId, setBranchId] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hidingId, setHidingId] = useState(null);
    const [activatingId, setActivatingId] = useState(null);

    // ---- Phân trang phía client: 10 tin / trang ----
    const [currentPage, setCurrentPage] = useState(1);

    // ---- SỬA NGAY TRONG TRANG, dạng màn hình chi tiết (không navigate sang route khác) ----
    const [view, setView] = useState("list"); // "list" | "edit"
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ title: "", summary: "", content: "", branchId: "" });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState(null);

    // Lấy danh sách chi nhánh của manager từ hồ sơ đăng nhập
    useEffect(() => {
        managerApi
            .getEmployeeProfile()
            .then((res) => setBranches((res?.data ?? res)?.branches ?? []))
            .catch((err) => {
                console.error("getEmployeeProfile error:", err?.status, err?.message ?? err);
                setBranches([]);
            });
    }, []);

    const fetchNews = async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getListNews(params);
            const payload = res?.data ?? res;
            setNewsItems(Array.isArray(payload) ? payload : []);
            // Mỗi lần danh sách gốc thay đổi (lọc mới, tải lại...) thì quay về trang 1
            // để tránh đứng ở 1 trang trống nếu kết quả lọc ít hơn trước.
            setCurrentPage(1);
        } catch (err) {
            console.error("[NewsList] getListNews error:", err?.status, err?.message ?? err, err);
            setError("Không thể tải danh sách bài viết. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // ---- Lọc tự động: không cần bấm nút "Lọc" ----
    // - keyword: debounce để tránh gọi API liên tục khi đang gõ.
    // - branchId: lọc ngay khi người dùng đổi lựa chọn.
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        const timer = setTimeout(() => {
            fetchNews({ branchId: branchId || undefined, keyword: keyword.trim() || undefined });
        }, FILTER_DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, keyword]);

    useEffect(() => {
        fetchNews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReset = () => {
        setBranchId("");
        setKeyword("");
        fetchNews();
    };

    const setItemStatus = (id, status) =>
        setNewsItems((prev) => prev.map((n) => (n.newsId === id ? { ...n, status } : n)));

    const handleHide = async (id) => {
        if (!window.confirm("Ẩn bài viết này khỏi trang hiển thị cho hội viên?")) return;
        setHidingId(id);
        try {
            await managerApi.hideNews(id);
            setItemStatus(id, "Hidden");
        } catch (err) {
            console.error("[NewsList] hideNews error:", err?.status, err?.message ?? err, err);
            window.alert("Ẩn bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setHidingId(null);
        }
    };

    const handleActivate = async (id) => {
        setActivatingId(id);
        try {
            await managerApi.activateNews(id);
            setItemStatus(id, "Active");
        } catch (err) {
            console.error("[NewsList] activateNews error:", err?.status, err?.message ?? err, err);
            window.alert("Kích hoạt lại bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setActivatingId(null);
        }
    };

    // ---- Chuyển sang màn hình chi tiết/sửa riêng trong trang (không đổi route) ----
    const handleEdit = (item) => {
        setEditingId(item.newsId);
        setEditError(null);

        // Chi nhánh của bài viết có thể không còn nằm trong danh sách chi nhánh
        // mà Manager hiện tại được quản lý (vd bài cũ gán cho chi nhánh khác, hoặc
        // branchId null / "áp dụng tất cả"). Nếu vậy, dropdown chỉ hiển thị được
        // các chi nhánh hợp lệ nên PHẢI đồng bộ lại state theo đúng option đang
        // hiển thị — nếu không, state vẫn giữ giá trị cũ không khớp option nào,
        // và khi Lưu sẽ gửi đi branchId sai dù trên UI trông như đã chọn đúng.
        const isValidBranch = branches.some((b) => String(b.branchId) === String(item.branchId));
        setEditForm({
            title: item.title ?? "",
            summary: item.summary ?? "",
            content: item.content ?? "",
            branchId: isValidBranch ? item.branchId : branches[0]?.branchId ?? "",
        });
        setView("edit");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditError(null);
        setView("list");
    };

    const handleEditFieldChange = (field) => (e) =>
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSaveEdit = async (id) => {
        setSavingEdit(true);
        setEditError(null);
        try {
            await managerApi.updateNews(id, {
                title: editForm.title,
                summary: editForm.summary,
                content: editForm.content,
                branchId: editForm.branchId || undefined,
            });
            setNewsItems((prev) =>
                prev.map((n) =>
                    n.newsId === id
                        ? {
                            ...n,
                            ...editForm,
                            branchName:
                                branches.find((b) => String(b.branchId) === String(editForm.branchId))
                                    ?.branchName ?? n.branchName,
                        }
                        : n
                )
            );
            setEditingId(null);
            setView("list");
        } catch (err) {
            console.error("[NewsList] updateNews error:", err?.status, err?.message ?? err, err);
            setEditError("Cập nhật bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setSavingEdit(false);
        }
    };

    const showEmpty = !loading && !error && newsItems.length === 0;

    // ---- Cắt danh sách theo trang hiện tại (10 tin / trang) ----
    const totalPages = Math.max(1, Math.ceil(newsItems.length / PAGE_SIZE));
    const pagedItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return newsItems.slice(start, start + PAGE_SIZE);
    }, [newsItems, currentPage]);

    const goToPage = (page) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

    // Danh sách số trang rút gọn kiểu 1 ... 4 5 [6] 7 8 ... 12
    const pageNumbers = useMemo(() => {
        const pages = [1];
        if (currentPage - 1 > 2) pages.push("ellipsis-start");
        for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
            pages.push(p);
        }
        if (currentPage + 1 < totalPages - 1) pages.push("ellipsis-end");
        if (totalPages > 1) pages.push(totalPages);
        return pages;
    }, [currentPage, totalPages]);

    return (
        <div className="news-list">
            <style>{`
                .news-list {
                    --nl-bg-page: #eef1f8;
                    --nl-bg-card: #ffffff;
                    --nl-bg-card-hover: #fbfcfe;
                    --nl-bg-input: #f7f9fc;
                    --nl-border: #e8ecf3;
                    --nl-text-primary: #1b2233;
                    --nl-text-secondary: #8a93a6;
                    --nl-teal: #16a34a;
                    --nl-cyan: #4ade80;
                    --nl-green-tint: #bbf7d0;
                    --nl-red: #ef4444;
                    --nl-blue: #3b82f6;
                    --nl-radius: 20px;
                    --nl-shadow: 0 20px 40px -16px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.05);
                    --nl-shadow-hover: 0 24px 48px -16px rgba(15, 23, 42, 0.2), 0 6px 16px rgba(15, 23, 42, 0.06);
                    --nl-shadow-page: 0 32px 70px -20px rgba(15, 23, 42, 0.28), 0 12px 28px -8px rgba(15, 23, 42, 0.12);

                    min-height: 100%;
                    padding: 40px 32px;
                    background: var(--nl-bg-page);
                    color: var(--nl-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    box-sizing: border-box;
                }
                .news-list *, .news-list *::before, .news-list *::after { box-sizing: border-box; }

                /* Khối nội dung chính nổi lên trên nền trang nhờ đổ bóng lớn xung quanh. */
                .news-list__shell {
                    max-width: 960px;
                    margin: 0 auto;
                    padding: 28px;
                    background: var(--nl-bg-card);
                    border-radius: 24px;
                    box-shadow: var(--nl-shadow-page);
                }

                /* ---- Header ---- */
                .news-list__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
                .news-list__title { margin: 0 0 4px; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
                .news-list__subtitle { margin: 0; font-size: 13.5px; color: var(--nl-text-secondary); }
                .news-list__create-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 10px 18px; border-radius: 12px;
                    background: linear-gradient(135deg, var(--nl-cyan), var(--nl-teal));
                    color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap;
                    box-shadow: 0 12px 24px -10px rgba(34, 197, 94, 0.55);
                    transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }
                .news-list__create-btn:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 16px 28px -10px rgba(34, 197, 94, 0.6); }
                .news-list__create-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; font-size: 16px; line-height: 1; }

                /* ---- Input dùng chung: filter search/select + form input/textarea/select ---- */
                .nl-input {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1.5px solid var(--nl-green-tint);
                    background: var(--nl-bg-input);
                    color: var(--nl-text-primary);
                    font-size: 13.5px;
                    font-family: inherit;
                    outline: none;
                    box-sizing: border-box;
                    box-shadow: 0 10px 24px -14px rgba(22, 163, 74, 0.28), 0 2px 6px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                }
                .nl-input::placeholder { color: #a7afc0; }
                .nl-input:hover { border-color: #86efac; }
                .nl-input:focus { border-color: var(--nl-teal); box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16); background: #fff; }
                select.nl-input { cursor: pointer; }
                textarea.nl-input { resize: vertical; min-height: 160px; line-height: 1.5; }

                /* ---- Filters ---- */
                .news-list__filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
                .news-list__search { flex: 1 1 260px; min-width: 200px; }
                .news-list__select { min-width: 180px; }
                .news-list__filter-status { font-size: 12.5px; color: var(--nl-text-secondary); white-space: nowrap; }
                .news-list__reset-btn { padding: 10px 16px; border-radius: 12px; border: 1.5px solid transparent; background: transparent; color: var(--nl-text-secondary); font-size: 13.5px; font-weight: 600; cursor: pointer; }
                .news-list__reset-btn:hover { color: var(--nl-text-primary); }

                /* ---- Body / states ---- */
                .news-list__body { display: flex; flex-direction: column; gap: 14px; }
                .news-list__count { margin: -6px 0 2px; font-size: 12.5px; color: var(--nl-text-secondary); }
                .news-list__state { padding: 32px 16px; text-align: center; color: var(--nl-text-secondary); background: var(--nl-bg-page); border: 1px dashed var(--nl-border); border-radius: var(--nl-radius); font-size: 13.5px; }
                .news-list__state--error { color: var(--nl-red); border-color: rgba(239, 68, 68, 0.3); }

                /* ---- Card ---- */
                .news-card {
                    display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
                    padding: 20px 22px; border-radius: var(--nl-radius);
                    background: var(--nl-bg-card); border: 1px solid var(--nl-border); box-shadow: var(--nl-shadow);
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }
                .news-card:hover { background: var(--nl-bg-card-hover); border-color: #d7deec; box-shadow: var(--nl-shadow-hover); transform: translateY(-2px); }
                .news-card__main { min-width: 0; flex: 1; }
                .news-card__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
                .news-card__title { margin: 0; font-size: 15.5px; font-weight: 700; }

                .news-card__summary, .news-card__content {
                    margin: 0 0 10px; font-size: 13.5px; color: var(--nl-text-secondary);
                    display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;
                }
                .news-card__summary { -webkit-line-clamp: 2; }
                .news-card__content { -webkit-line-clamp: 3; font-size: 13px; color: var(--nl-text-primary); line-height: 1.5; }
                .news-card__content-label { font-weight: 700; color: var(--nl-text-secondary); margin-right: 4px; }

                .news-card__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; color: var(--nl-text-secondary); }
                .news-card__dot { color: #c7cede; }

                .news-card__status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
                .news-card__status--active { background: rgba(34, 197, 94, 0.12); color: var(--nl-teal); }
                .news-card__status--hidden { background: rgba(138, 147, 166, 0.12); color: var(--nl-text-secondary); }
                .news-card__status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

                /* ---- Buttons dùng chung: edit / hide / activate (card) + cancel / save (detail) ---- */
                .news-card__actions { flex-shrink: 0; display: flex; gap: 8px; }
                .nl-btn {
                    padding: 8px 16px; border-radius: 10px; border: 1.5px solid transparent;
                    font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
                    background: var(--nl-btn-bg); color: var(--nl-btn-fg); border-color: var(--nl-btn-border);
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                }
                .nl-btn:hover:not(:disabled) { background: var(--nl-btn-bg-hover); box-shadow: 0 8px 18px -10px var(--nl-btn-shadow); }
                .nl-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

                .nl-btn--edit     { --nl-btn-bg: rgba(59,130,246,.08);  --nl-btn-border: rgba(59,130,246,.35);  --nl-btn-fg: var(--nl-blue); --nl-btn-bg-hover: rgba(59,130,246,.16);  --nl-btn-shadow: rgba(59,130,246,.5); }
                .nl-btn--hide     { --nl-btn-bg: rgba(239,68,68,.08);   --nl-btn-border: rgba(239,68,68,.35);   --nl-btn-fg: var(--nl-red);  --nl-btn-bg-hover: rgba(239,68,68,.16);   --nl-btn-shadow: rgba(239,68,68,.5); }
                .nl-btn--activate { --nl-btn-bg: rgba(34,197,94,.08);   --nl-btn-border: rgba(34,197,94,.35);   --nl-btn-fg: var(--nl-teal); --nl-btn-bg-hover: rgba(34,197,94,.16);   --nl-btn-shadow: rgba(34,197,94,.5); }
                .nl-btn--cancel   { --nl-btn-bg: #ffffff; --nl-btn-border: var(--nl-border); --nl-btn-fg: var(--nl-text-secondary); --nl-btn-bg-hover: #ffffff; --nl-btn-shadow: transparent; padding: 10px 20px; font-size: 14px; }
                .nl-btn--save     { padding: 10px 22px; font-size: 14px; border: none; color: #fff; background: linear-gradient(135deg, var(--nl-cyan), var(--nl-teal)); box-shadow: 0 12px 24px -10px rgba(34, 197, 94, 0.55); }
                .nl-btn--save:hover:not(:disabled) { box-shadow: 0 16px 28px -10px rgba(34, 197, 94, 0.6); }

                /* ---- Phân trang ---- */
                .news-list__pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
                .news-list__page-btn {
                    min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px;
                    border: 1.5px solid var(--nl-border); background: var(--nl-bg-card); color: var(--nl-text-secondary);
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
                }
                .news-list__page-btn:hover:not(:disabled) { border-color: #86efac; color: var(--nl-teal); }
                .news-list__page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                .news-list__page-btn--active { background: linear-gradient(135deg, var(--nl-cyan), var(--nl-teal)); border-color: transparent; color: #fff; box-shadow: 0 8px 18px -10px rgba(34, 197, 94, 0.55); }
                .news-list__page-ellipsis { min-width: 24px; text-align: center; color: var(--nl-text-secondary); font-size: 13px; user-select: none; }

                /* ---- Màn hình Sửa dạng chi tiết (thay thế toàn bộ list) ---- */
                .news-detail__header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
                .news-detail__back {
                    display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;
                    border-radius: 11px; border: 1.5px solid var(--nl-border); background: var(--nl-bg-card);
                    color: var(--nl-text-primary); font-size: 16px; cursor: pointer; flex-shrink: 0;
                    box-shadow: 0 8px 20px -14px rgba(15, 23, 42, 0.3); transition: border-color 0.15s ease, color 0.15s ease;
                }
                .news-detail__back:hover { border-color: var(--nl-teal); color: var(--nl-teal); }
                .news-detail__title { margin: 0; font-size: 21px; font-weight: 800; }
                .news-detail__card { max-width: 720px; padding: 26px; border-radius: var(--nl-radius); background: var(--nl-bg-card); border: 1px solid var(--nl-border); box-shadow: var(--nl-shadow); display: flex; flex-direction: column; gap: 18px; }
                .news-detail__field { display: flex; flex-direction: column; gap: 6px; }
                .news-detail__label { font-size: 13px; font-weight: 700; color: var(--nl-text-secondary); }
                .news-detail__error { font-size: 13px; font-weight: 600; color: var(--nl-red); }
                .news-detail__actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--nl-border); margin-top: 4px; padding-top: 18px; }

                @media (max-width: 720px) {
                    .news-list { padding: 18px; }
                    .news-list__shell { padding: 18px; border-radius: 18px; }
                    .news-list__header { flex-direction: column; align-items: stretch; }
                    .news-list__create-btn { justify-content: center; }
                    .news-list__filters { flex-direction: column; align-items: stretch; }
                    .news-card { flex-direction: column; align-items: stretch; }
                    .news-card__actions { justify-content: flex-end; }
                    .news-detail__card { max-width: none; padding: 18px; }
                }
            `}</style>

            <div className="news-list__shell">
                {view === "edit" ? (
                    <>
                        <div className="news-detail__header">
                            <button
                                type="button"
                                className="news-detail__back"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                                aria-label="Quay lại danh sách"
                            >
                                ←
                            </button>
                            <h1 className="news-detail__title">Chỉnh sửa bài viết</h1>
                        </div>

                        <div className="news-detail__card">
                            <Field label="Tiêu đề">
                                <input
                                    type="text"
                                    className="nl-input"
                                    placeholder="Tiêu đề"
                                    value={editForm.title}
                                    onChange={handleEditFieldChange("title")}
                                />
                            </Field>

                            <Field label="Tóm tắt">
                                <input
                                    type="text"
                                    className="nl-input"
                                    placeholder="Tóm tắt"
                                    value={editForm.summary}
                                    onChange={handleEditFieldChange("summary")}
                                />
                            </Field>

                            <Field label="Nội dung">
                                <textarea
                                    className="nl-input"
                                    placeholder="Nội dung"
                                    value={editForm.content}
                                    onChange={handleEditFieldChange("content")}
                                />
                            </Field>

                            <Field label="Chi nhánh">
                                <select className="nl-input" value={editForm.branchId} onChange={handleEditFieldChange("branchId")}>
                                    {branches.map((b) => (
                                        <option key={b.branchId} value={b.branchId}>
                                            {b.branchName}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            {editError && <div className="news-detail__error">{editError}</div>}

                            <div className="news-detail__actions">
                                <button type="button" className="nl-btn nl-btn--cancel" onClick={handleCancelEdit} disabled={savingEdit}>
                                    Hủy
                                </button>
                                <button type="button" className="nl-btn nl-btn--save" onClick={() => handleSaveEdit(editingId)} disabled={savingEdit}>
                                    {savingEdit ? "Đang lưu..." : "Lưu"}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="news-list__header">
                            <div>
                                <h1 className="news-list__title">Danh sách bài viết</h1>
                                <p className="news-list__subtitle">Quản lý tin tức hiển thị cho hội viên</p>
                            </div>
                            <Link to="/admin/news-create" className="news-list__create-btn">
                                <span className="news-list__create-icon" aria-hidden="true">+</span>
                                Tạo bài viết
                            </Link>
                        </div>

                        <div className="news-list__filters">
                            <input
                                type="text"
                                className="nl-input news-list__search"
                                placeholder="Tìm theo tiêu đề, nội dung..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                            <select
                                className="nl-input news-list__select"
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                aria-label="Lọc theo chi nhánh"
                            >
                                <option value="">Tất cả chi nhánh</option>
                                {branches.map((b) => (
                                    <option key={b.branchId} value={b.branchId}>
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
                            {loading && <span className="news-list__filter-status">Đang lọc...</span>}
                            {(keyword || branchId) && (
                                <button type="button" className="news-list__reset-btn" onClick={handleReset}>
                                    Xóa lọc
                                </button>
                            )}
                        </div>

                        <div className="news-list__body">
                            {loading && <div className="news-list__state">Đang tải bài viết...</div>}
                            {error && <div className="news-list__state news-list__state--error">{error}</div>}
                            {showEmpty && <div className="news-list__state">Chưa có bài viết nào. Hãy tạo bài viết đầu tiên.</div>}

                            {!loading && !error && newsItems.length > 0 && (
                                <p className="news-list__count">
                                    {newsItems.length} bài viết{totalPages > 1 ? ` • Trang ${currentPage}/${totalPages}` : ""}
                                </p>
                            )}

                            {!loading &&
                                !error &&
                                pagedItems.map((item) => (
                                    <article key={item.newsId} className="news-card">
                                        <div className="news-card__main">
                                            <div className="news-card__top">
                                                <h2 className="news-card__title">{item.title}</h2>
                                                <StatusPill status={item.status} />
                                            </div>

                                            {item.summary && <p className="news-card__summary">{item.summary}</p>}

                                            {item.content && (
                                                <p className="news-card__content">
                                                    <span className="news-card__content-label">Nội dung:</span>
                                                    {item.content}
                                                </p>
                                            )}

                                            <div className="news-card__meta">
                                                <span>{item.createdByName ?? "—"}</span>
                                                <span className="news-card__dot" aria-hidden="true">•</span>
                                                <span>{item.branchName ?? "Tất cả chi nhánh"}</span>
                                                <span className="news-card__dot" aria-hidden="true">•</span>
                                                <span>{formatDate(item.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div className="news-card__actions">
                                            <button type="button" className="nl-btn nl-btn--edit" onClick={() => handleEdit(item)}>
                                                Sửa
                                            </button>

                                            {item.status === "Active" ? (
                                                <button
                                                    type="button"
                                                    className="nl-btn nl-btn--hide"
                                                    disabled={hidingId === item.newsId}
                                                    onClick={() => handleHide(item.newsId)}
                                                >
                                                    {hidingId === item.newsId ? "Đang ẩn..." : "Ẩn"}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="nl-btn nl-btn--activate"
                                                    disabled={activatingId === item.newsId}
                                                    onClick={() => handleActivate(item.newsId)}
                                                >
                                                    {activatingId === item.newsId ? "Đang kích hoạt..." : "Kích hoạt"}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))}

                            {!loading && !error && totalPages > 1 && (
                                <nav className="news-list__pagination" aria-label="Phân trang danh sách bài viết">
                                    <button
                                        type="button"
                                        className="news-list__page-btn"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        aria-label="Trang trước"
                                    >
                                        ‹
                                    </button>

                                    {pageNumbers.map((p, idx) =>
                                        typeof p === "number" ? (
                                            <button
                                                key={p}
                                                type="button"
                                                className={`news-list__page-btn ${p === currentPage ? "news-list__page-btn--active" : ""}`}
                                                onClick={() => goToPage(p)}
                                                aria-current={p === currentPage ? "page" : undefined}
                                            >
                                                {p}
                                            </button>
                                        ) : (
                                            <span key={`${p}-${idx}`} className="news-list__page-ellipsis">…</span>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className="news-list__page-btn"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        aria-label="Trang sau"
                                    >
                                        ›
                                    </button>
                                </nav>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}