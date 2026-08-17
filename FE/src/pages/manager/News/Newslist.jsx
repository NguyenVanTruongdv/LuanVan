import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// NOTE: đổi lại đường dẫn import managerApi cho khớp cấu trúc thư mục thật
// của bạn nếu component này không nằm ở pages/news/.

const STATUS_LABEL = {
    Active: "Đang hoạt động",
    Hidden: "Đã ẩn",
};

const FILTER_DEBOUNCE_MS = 400;

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function NewsList() {
    const [branches, setBranches] = useState([]);
    const [newsItems, setNewsItems] = useState([]);
    const [branchId, setBranchId] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hidingId, setHidingId] = useState(null);
    const [activatingId, setActivatingId] = useState(null);

    // ---- SỬA NGAY TRONG TRANG, dạng màn hình chi tiết (không navigate sang route khác) ----
    // view: "list" | "edit"
    const [view, setView] = useState("list");
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ title: "", summary: "", content: "", branchId: "" });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState(null);

    // Lấy danh sách chi nhánh của manager từ hồ sơ đăng nhập
    useEffect(() => {
        managerApi
            .getEmployeeProfile()
            .then((res) => {
                const profile = res?.data ?? res;
                setBranches(profile?.branches ?? []);
            })
            .catch((err) => {
                console.error("getEmployeeProfile error:", err?.status, err?.message ?? err);
                setBranches([]);
            });
    }, []);

    const fetchNews = async (params = {}) => {
        console.log("[NewsList] fetchNews called with params:", params);
        setLoading(true);
        setError(null);
        try {
            const res = await managerApi.getListNews(params);
            console.log("[NewsList] getListNews response:", res);
            const payload = res?.data ?? res;
            setNewsItems(Array.isArray(payload) ? payload : []);
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
            // Lần chạy đầu tiên đã có fetchNews() riêng ở dưới, tránh gọi trùng.
            isFirstRun.current = false;
            return;
        }
        const timer = setTimeout(() => {
            fetchNews({
                branchId: branchId || undefined,
                keyword: keyword.trim() || undefined,
            });
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

    const handleHide = async (id) => {
        if (!window.confirm("Ẩn bài viết này khỏi trang hiển thị cho hội viên?")) return;
        console.log("[NewsList] handleHide fired for id =", id);
        setHidingId(id);
        try {
            const res = await managerApi.hideNews(id);
            console.log("[NewsList] hideNews response:", res);
            setNewsItems((prev) =>
                prev.map((n) => (n.newsId === id ? { ...n, status: "Hidden" } : n))
            );
        } catch (err) {
            console.error("[NewsList] hideNews error:", err?.status, err?.message ?? err, err);
            window.alert("Ẩn bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setHidingId(null);
        }
    };

    const handleActivate = async (id) => {
        console.log("[NewsList] handleActivate fired for id =", id);
        setActivatingId(id);
        try {
            const res = await managerApi.activateNews(id);
            console.log("[NewsList] activateNews response:", res);
            setNewsItems((prev) =>
                prev.map((n) => (n.newsId === id ? { ...n, status: "Active" } : n))
            );
        } catch (err) {
            console.error("[NewsList] activateNews error:", err?.status, err?.message ?? err, err);
            window.alert("Kích hoạt lại bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setActivatingId(null);
        }
    };

    // ---- Chuyển sang màn hình chi tiết/sửa riêng trong trang (không đổi route) ----
    const handleEdit = (item) => {
        console.log("[NewsList] handleEdit fired for item:", item);
        setEditingId(item.newsId);
        setEditError(null);

        // Chi nhánh của bài viết có thể không còn nằm trong danh sách chi nhánh
        // mà Manager hiện tại được quản lý (vd bài cũ gán cho chi nhánh khác, hoặc
        // branchId null / "áp dụng tất cả"). Nếu vậy, dropdown chỉ hiển thị được
        // các chi nhánh hợp lệ nên PHẢI đồng bộ lại state theo đúng option đang
        // hiển thị — nếu không, state vẫn giữ giá trị cũ không khớp option nào,
        // và khi Lưu sẽ gửi đi branchId sai dù trên UI trông như đã chọn đúng.
        const isValidBranch = branches.some(
            (b) => String(b.branchId) === String(item.branchId)
        );
        const resolvedBranchId = isValidBranch
            ? item.branchId
            : branches[0]?.branchId ?? "";

        setEditForm({
            title: item.title ?? "",
            summary: item.summary ?? "",
            content: item.content ?? "",
            branchId: resolvedBranchId,
        });
        setView("edit");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditError(null);
        setView("list");
    };

    const handleEditFieldChange = (field) => (e) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSaveEdit = async (id) => {
        console.log("[NewsList] handleSaveEdit fired for id =", id, "payload =", editForm);
        setSavingEdit(true);
        setEditError(null);
        try {
            const res = await managerApi.updateNews(id, {
                title: editForm.title,
                summary: editForm.summary,
                content: editForm.content,
                branchId: editForm.branchId || undefined,
            });
            console.log("[NewsList] updateNews response:", res);
            setNewsItems((prev) =>
                prev.map((n) =>
                    n.newsId === id
                        ? {
                            ...n,
                            title: editForm.title,
                            summary: editForm.summary,
                            content: editForm.content,
                            branchId: editForm.branchId,
                            branchName:
                                branches.find((b) => String(b.branchId) === String(editForm.branchId))
                                    ?.branchName ?? n.branchName,
                        }
                        : n
                )
            );
            setEditingId(null);
            setView("list"); // lưu xong thì quay về danh sách
        } catch (err) {
            console.error("[NewsList] updateNews error:", err?.status, err?.message ?? err, err);
            setEditError("Cập nhật bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setSavingEdit(false);
        }
    };

    const showEmpty = !loading && !error && newsItems.length === 0;

    return (
        <div className="news-list">
            <style>{`
                .news-list {
                    --nl-bg-page: #f4f6fb;
                    --nl-bg-card: #ffffff;
                    --nl-bg-card-hover: #fbfcfe;
                    --nl-bg-input: #f7f9fc;
                    --nl-border: #e8ecf3;
                    --nl-text-primary: #1b2233;
                    --nl-text-secondary: #8a93a6;
                    --nl-teal: #16a34a;
                    --nl-cyan: #4ade80;
                    --nl-green-tint: #bbf7d0;
                    --nl-green-tint-soft: rgba(34, 197, 94, 0.16);
                    --nl-red: #ef4444;
                    --nl-green: #16a34a;
                    --nl-radius: 20px;
                    --nl-shadow: 0 20px 40px -16px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.05);
                    --nl-shadow-hover: 0 24px 48px -16px rgba(15, 23, 42, 0.2), 0 6px 16px rgba(15, 23, 42, 0.06);

                    padding: 28px;
                    max-width: 960px;
                    min-height: 100%;
                    margin: 0 auto;
                    background: var(--nl-bg-page);
                    color: var(--nl-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                }

                .news-list__header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }

                .news-list__title {
                    margin: 0 0 4px;
                    font-size: 24px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    color: var(--nl-text-primary);
                }

                .news-list__subtitle {
                    margin: 0;
                    font-size: 13.5px;
                    color: var(--nl-text-secondary);
                }

                .news-list__create-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 18px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, var(--nl-cyan), var(--nl-teal));
                    color: #ffffff;
                    font-weight: 700;
                    font-size: 14px;
                    text-decoration: none;
                    white-space: nowrap;
                    box-shadow: 0 12px 24px -10px rgba(34, 197, 94, 0.55);
                    transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }

                .news-list__create-btn:hover {
                    filter: brightness(1.05);
                    transform: translateY(-1px);
                    box-shadow: 0 16px 28px -10px rgba(34, 197, 94, 0.6);
                }

                .news-list__create-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    font-size: 16px;
                    line-height: 1;
                }

                .news-list__filters {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                    align-items: center;
                }

                .news-list__search {
                    flex: 1 1 260px;
                    min-width: 200px;
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1.5px solid var(--nl-green-tint);
                    background: var(--nl-bg-card);
                    color: var(--nl-text-primary);
                    font-size: 13.5px;
                    outline: none;
                    box-shadow: 0 10px 24px -14px rgba(22, 163, 74, 0.28), 0 2px 6px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .news-list__search:hover {
                    border-color: #86efac;
                }

                .news-list__search::placeholder {
                    color: #a7afc0;
                }

                .news-list__search:focus {
                    border-color: var(--nl-teal);
                    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
                }

                .news-list__select {
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: 1.5px solid var(--nl-green-tint);
                    background: var(--nl-bg-card);
                    color: var(--nl-text-primary);
                    font-size: 13.5px;
                    min-width: 180px;
                    outline: none;
                    cursor: pointer;
                    box-shadow: 0 10px 24px -14px rgba(22, 163, 74, 0.28), 0 2px 6px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .news-list__select:hover {
                    border-color: #86efac;
                }

                .news-list__select:focus {
                    border-color: var(--nl-teal);
                    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
                }

                .news-list__filter-status {
                    font-size: 12.5px;
                    color: var(--nl-text-secondary);
                    white-space: nowrap;
                }

                .news-list__reset-btn {
                    padding: 10px 16px;
                    border-radius: 12px;
                    border: 1.5px solid transparent;
                    background: transparent;
                    color: var(--nl-text-secondary);
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .news-list__reset-btn:hover {
                    color: var(--nl-text-primary);
                }

                .news-list__body {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .news-list__state {
                    padding: 32px 16px;
                    text-align: center;
                    color: var(--nl-text-secondary);
                    background: var(--nl-bg-card);
                    border: 1px dashed var(--nl-border);
                    border-radius: var(--nl-radius);
                    font-size: 13.5px;
                }

                .news-list__state--error {
                    color: var(--nl-red);
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .news-card {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    padding: 20px 22px;
                    border-radius: var(--nl-radius);
                    background: var(--nl-bg-card);
                    border: 1px solid var(--nl-border);
                    box-shadow: var(--nl-shadow);
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }

                .news-card:hover {
                    background: var(--nl-bg-card-hover);
                    border-color: #d7deec;
                    box-shadow: var(--nl-shadow-hover);
                    transform: translateY(-2px);
                }

                .news-card__main {
                    min-width: 0;
                    flex: 1;
                }

                .news-card__top {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 6px;
                }

                .news-card__title {
                    margin: 0;
                    font-size: 15.5px;
                    font-weight: 700;
                    color: var(--nl-text-primary);
                }

                .news-card__summary {
                    margin: 0 0 10px;
                    font-size: 13.5px;
                    color: var(--nl-text-secondary);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .news-card__meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    font-size: 12.5px;
                    color: var(--nl-text-secondary);
                }

                .news-card__dot {
                    color: #c7cede;
                }

                .news-card__status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .news-card__status--active {
                    background: rgba(34, 197, 94, 0.12);
                    color: var(--nl-teal);
                }

                .news-card__status--hidden {
                    background: rgba(138, 147, 166, 0.12);
                    color: var(--nl-text-secondary);
                }

                .news-card__status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .news-card__actions {
                    flex-shrink: 0;
                    display: flex;
                    gap: 8px;
                }

                .news-card__edit-btn {
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1.5px solid rgba(59, 130, 246, 0.35);
                    background: rgba(59, 130, 246, 0.08);
                    color: #3b82f6;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                    white-space: nowrap;
                }

                .news-card__edit-btn:hover {
                    background: rgba(59, 130, 246, 0.16);
                    box-shadow: 0 8px 18px -10px rgba(59, 130, 246, 0.5);
                }

                .news-card__hide-btn {
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1.5px solid rgba(239, 68, 68, 0.35);
                    background: rgba(239, 68, 68, 0.08);
                    color: var(--nl-red);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                    white-space: nowrap;
                }

                .news-card__hide-btn:hover:not(:disabled) {
                    background: rgba(239, 68, 68, 0.16);
                    box-shadow: 0 8px 18px -10px rgba(239, 68, 68, 0.5);
                }

                .news-card__hide-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .news-card__activate-btn {
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1.5px solid rgba(34, 197, 94, 0.35);
                    background: rgba(34, 197, 94, 0.08);
                    color: var(--nl-teal);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                    white-space: nowrap;
                }

                .news-card__activate-btn:hover:not(:disabled) {
                    background: rgba(34, 197, 94, 0.16);
                    box-shadow: 0 8px 18px -10px rgba(34, 197, 94, 0.5);
                }

                .news-card__activate-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* ---- Màn hình Sửa dạng chi tiết (thay thế toàn bộ list) ---- */
                .news-detail__header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 22px;
                }

                .news-detail__back {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    border: 1.5px solid var(--nl-border);
                    background: var(--nl-bg-card);
                    color: var(--nl-text-primary);
                    font-size: 16px;
                    cursor: pointer;
                    flex-shrink: 0;
                    box-shadow: 0 8px 20px -14px rgba(15, 23, 42, 0.3);
                    transition: border-color 0.15s ease, color 0.15s ease;
                }

                .news-detail__back:hover {
                    border-color: var(--nl-teal);
                    color: var(--nl-teal);
                }

                .news-detail__title {
                    margin: 0;
                    font-size: 21px;
                    font-weight: 800;
                }

                .news-detail__card {
                    max-width: 720px;
                    padding: 26px;
                    border-radius: var(--nl-radius);
                    background: var(--nl-bg-card);
                    border: 1px solid var(--nl-border);
                    box-shadow: var(--nl-shadow);
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .news-detail__field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .news-detail__label {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--nl-text-secondary);
                }

                .news-detail__input,
                .news-detail__textarea,
                .news-detail__select {
                    width: 100%;
                    padding: 11px 14px;
                    border-radius: 12px;
                    border: 1.5px solid var(--nl-green-tint);
                    background: #ffffff;
                    color: var(--nl-text-primary);
                    font-size: 14px;
                    font-family: inherit;
                    outline: none;
                    box-sizing: border-box;
                    box-shadow: 0 8px 18px -14px rgba(22, 163, 74, 0.3), inset 0 1px 2px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                }

                .news-detail__input:hover,
                .news-detail__textarea:hover,
                .news-detail__select:hover {
                    border-color: #86efac;
                }

                .news-detail__input:focus,
                .news-detail__textarea:focus,
                .news-detail__select:focus {
                    border-color: var(--nl-teal);
                    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
                    background: #ffffff;
                }

                .news-detail__textarea {
                    resize: vertical;
                    min-height: 160px;
                    line-height: 1.5;
                }

                .news-detail__error {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--nl-red);
                }

                .news-detail__actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid var(--nl-border);
                    margin-top: 4px;
                    padding-top: 18px;
                }

                .news-detail__cancel-btn {
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: 1.5px solid var(--nl-border);
                    background: #ffffff;
                    color: var(--nl-text-secondary);
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .news-detail__save-btn {
                    padding: 10px 22px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, var(--nl-cyan), var(--nl-teal));
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 12px 24px -10px rgba(34, 197, 94, 0.55);
                }

                .news-detail__save-btn:disabled,
                .news-detail__cancel-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                @media (max-width: 720px) {
                    .news-detail__card {
                        max-width: none;
                        padding: 18px;
                    }
                }

                @media (max-width: 720px) {
                    .news-list {
                        max-width: none;
                        padding: 18px;
                    }

                    .news-list__header {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .news-list__create-btn {
                        justify-content: center;
                    }

                    .news-list__filters {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .news-list__select,
                    .news-list__search {
                        width: 100%;
                    }

                    .news-card {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .news-card__actions {
                        justify-content: flex-end;
                    }
                }
            `}</style>

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
                        <div className="news-detail__field">
                            <label className="news-detail__label">Tiêu đề</label>
                            <input
                                type="text"
                                className="news-detail__input"
                                placeholder="Tiêu đề"
                                value={editForm.title}
                                onChange={handleEditFieldChange("title")}
                            />
                        </div>

                        <div className="news-detail__field">
                            <label className="news-detail__label">Tóm tắt</label>
                            <input
                                type="text"
                                className="news-detail__input"
                                placeholder="Tóm tắt"
                                value={editForm.summary}
                                onChange={handleEditFieldChange("summary")}
                            />
                        </div>

                        <div className="news-detail__field">
                            <label className="news-detail__label">Nội dung</label>
                            <textarea
                                className="news-detail__textarea"
                                placeholder="Nội dung"
                                value={editForm.content}
                                onChange={handleEditFieldChange("content")}
                            />
                        </div>

                        <div className="news-detail__field">
                            <label className="news-detail__label">Chi nhánh</label>
                            <select
                                className="news-detail__select"
                                value={editForm.branchId}
                                onChange={handleEditFieldChange("branchId")}
                            >
                                {branches.map((b) => (
                                    <option key={b.branchId} value={b.branchId}>
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {editError && <div className="news-detail__error">{editError}</div>}

                        <div className="news-detail__actions">
                            <button
                                type="button"
                                className="news-detail__cancel-btn"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="news-detail__save-btn"
                                onClick={() => handleSaveEdit(editingId)}
                                disabled={savingEdit}
                            >
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
                        <Link to="/manager/news/create" className="news-list__create-btn">
                            <span className="news-list__create-icon" aria-hidden="true">
                                +
                            </span>
                            Tạo bài viết
                        </Link>
                    </div>

                    <div className="news-list__filters">
                        <input
                            type="text"
                            className="news-list__search"
                            placeholder="Tìm theo tiêu đề, nội dung..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                        <select
                            className="news-list__select"
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
                        {showEmpty && (
                            <div className="news-list__state">Chưa có bài viết nào. Hãy tạo bài viết đầu tiên.</div>
                        )}

                        {!loading &&
                            !error &&
                            newsItems.map((item) => (
                                <article key={item.newsId} className="news-card">
                                    <div className="news-card__main">
                                        <div className="news-card__top">
                                            <h2 className="news-card__title">{item.title}</h2>
                                            <span
                                                className={`news-card__status news-card__status--${item.status === "Active" ? "active" : "hidden"
                                                    }`}
                                            >
                                                <span className="news-card__status-dot" aria-hidden="true" />
                                                {STATUS_LABEL[item.status] ?? item.status}
                                            </span>
                                        </div>

                                        {item.summary && <p className="news-card__summary">{item.summary}</p>}

                                        <div className="news-card__meta">
                                            <span>{item.createdByName ?? "—"}</span>
                                            <span className="news-card__dot" aria-hidden="true">
                                                •
                                            </span>
                                            <span>{item.branchName ?? "Tất cả chi nhánh"}</span>
                                            <span className="news-card__dot" aria-hidden="true">
                                                •
                                            </span>
                                            <span>{formatDate(item.createdAt)}</span>
                                        </div>
                                    </div>

                                    <div className="news-card__actions">
                                        <button
                                            type="button"
                                            className="news-card__edit-btn"
                                            onClick={() => handleEdit(item)}
                                        >
                                            Sửa
                                        </button>

                                        {item.status === "Active" ? (
                                            <button
                                                type="button"
                                                className="news-card__hide-btn"
                                                disabled={hidingId === item.newsId}
                                                onClick={() => handleHide(item.newsId)}
                                            >
                                                {hidingId === item.newsId ? "Đang ẩn..." : "Ẩn"}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="news-card__activate-btn"
                                                disabled={activatingId === item.newsId}
                                                onClick={() => handleActivate(item.newsId)}
                                            >
                                                {activatingId === item.newsId ? "Đang kích hoạt..." : "Kích hoạt"}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}