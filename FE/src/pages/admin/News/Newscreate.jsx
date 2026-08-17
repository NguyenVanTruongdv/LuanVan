import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import managerApi from "../../../api/managerApi";

// NOTE: đổi lại đường dẫn import managerApi cho khớp cấu trúc thư mục thật
// của bạn nếu component này không nằm ở pages/news/.

const initialForm = {
    title: "",
    summary: "",
    content: "",
    branchId: "",
};

export default function NewsCreateOfAdmin() {
    const navigate = useNavigate();
    const [branches, setBranches] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Lấy danh sách chi nhánh + chi nhánh mặc định từ hồ sơ đăng nhập
    // (tự nhận diện cả 2 kiểu response: axios {data: {...}} hoặc fetch trả thẳng object)
    useEffect(() => {
        managerApi
            .getEmployeeProfile()
            .then((res) => {
                const profile = res?.data ?? res;
                const branchList = profile?.branches ?? [];
                setBranches(branchList);
                // Không còn option "Tất cả chi nhánh" nữa, nên dropdown luôn hiển thị
                // sẵn 1 chi nhánh cụ thể — phải đồng bộ state theo đúng cái đang hiển
                // thị, nếu không lúc submit sẽ gửi giá trị khác với UI đang cho thấy.
                const resolvedBranchId = profile?.defaultBranchId
                    ? String(profile.defaultBranchId)
                    : branchList[0]?.branchId
                        ? String(branchList[0].branchId)
                        : "";
                setForm((prev) => ({ ...prev, branchId: resolvedBranchId }));
            })
            .catch((err) => {
                console.error("getEmployeeProfile error:", err?.response?.status, err?.response?.data ?? err);
                setBranches([]);
            });
    }, []);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            setError("Vui lòng nhập tiêu đề và nội dung bài viết.");
            setSuccess(false);
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await managerApi.createNews({
                title: form.title.trim(),
                summary: form.summary.trim() || null,
                content: form.content.trim(),
                branchId: form.branchId ? Number(form.branchId) : null,
            });
            setSuccess(true);
            setTimeout(() => navigate("/admin/news"), 900);
        } catch (err) {
            setError("Tạo bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="news-create">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');

                .news-create {
                    /* ---- palette : white page, bold framed border, editorial emerald ---- */
                    --nc-page-bg: #ffffff;
                    --nc-frame-border: #0f766e;
                    --nc-bg-card: #ffffff;
                    --nc-bg-input: #f7faf9;
                    --nc-border-soft: #dceee7;
                    --nc-border-input: #dbe4e0;
                    --nc-text-primary: #101815;
                    --nc-text-secondary: #6b756f;

                    --nc-accent-1: #047857;
                    --nc-accent-2: #10b981;
                    --nc-accent-soft: #d7f3e3;
                    --nc-red: #e11d48;
                    --nc-red-soft: rgba(225, 29, 72, 0.08);
                    --nc-green-soft: rgba(5, 150, 105, 0.08);

                    --nc-radius-lg: 20px;
                    --nc-radius-md: 12px;

                    --nc-shadow-card:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 14px 30px -14px rgba(4, 120, 87, 0.22),
                        0 30px 60px -30px rgba(15, 23, 42, 0.16);

                    margin: 0 auto;
                    padding: 16px;
                    background: var(--nc-page-bg);
                    color: var(--nc-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    box-sizing: border-box;
                }

                /* the "tô viền trang" signature: a bold colored frame around the whole page */
                .news-create__inner {
                    max-width: 620px;
                    margin: 0 auto;
                    padding: 18px;
                    border: 2px solid var(--nc-frame-border);
                    border-radius: 20px;
                    background:
                        radial-gradient(600px 260px at 100% 0%, rgba(16, 185, 129, 0.07), transparent 70%),
                        #ffffff;
                    box-shadow:
                        0 0 0 6px rgba(16, 185, 129, 0.08),
                        0 30px 60px -30px rgba(4, 120, 87, 0.35);
                }

                .news-create__eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    padding: 3px 9px;
                    border-radius: 999px;
                    background: var(--nc-accent-soft);
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    color: var(--nc-accent-1);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .news-create__header {
                    margin-bottom: 14px;
                }

                .news-create__title {
                    margin: 0 0 4px;
                    font-family: "Source Serif 4", Georgia, serif;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    color: var(--nc-text-primary);
                }

                .news-create__subtitle {
                    margin: 0;
                    font-size: 12.5px;
                    color: var(--nc-text-secondary);
                }

                .news-create__form {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 18px 20px 18px;
                    background: var(--nc-bg-card);
                    border: 1.5px solid var(--nc-border-soft);
                    border-radius: var(--nc-radius-lg);
                    box-shadow: var(--nc-shadow-card);
                    overflow: hidden;
                }

                .news-create__form::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--nc-accent-1), var(--nc-accent-2) 60%, #6ee7b7);
                }

                .news-create__field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .news-create__label {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--nc-text-primary);
                }

                .news-create__required {
                    color: var(--nc-red);
                }

                .news-create__input,
                .news-create__textarea {
                    width: 100%;
                    padding: 9px 12px;
                    border-radius: var(--nc-radius-md);
                    border: 1.5px solid var(--nc-border-input);
                    background: var(--nc-bg-input);
                    color: var(--nc-text-primary);
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                    box-sizing: border-box;
                }

                .news-create__input:hover,
                .news-create__textarea:hover {
                    border-color: #b9c4d6;
                }

                .news-create__input::placeholder,
                .news-create__textarea::placeholder {
                    color: #a7afc0;
                }

                .news-create__input:focus,
                .news-create__textarea:focus {
                    border-color: var(--nc-accent-1);
                    background: #ffffff;
                    box-shadow: 0 0 0 4px var(--nc-accent-soft);
                }

                .news-create__textarea {
                    resize: vertical;
                    min-height: 90px;
                    line-height: 1.55;
                }

                select.news-create__input {
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237c869c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 14px center;
                    padding-right: 38px;
                }

                /* Messages */
                .news-create__message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 11px 14px;
                    border-radius: var(--nc-radius-md);
                    font-size: 13px;
                    font-weight: 600;
                }

                .news-create__message--error {
                    background: var(--nc-red-soft);
                    border: 1px solid rgba(225, 29, 72, 0.22);
                    color: var(--nc-red);
                }

                .news-create__message--success {
                    background: var(--nc-green-soft);
                    border: 1px solid rgba(5, 150, 105, 0.22);
                    color: var(--nc-accent-1);
                }

                /* Actions */
                .news-create__actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 2px;
                    padding-top: 12px;
                    border-top: 1px solid var(--nc-border-soft);
                }

                .news-create__cancel-btn {
                    padding: 9px 16px;
                    border-radius: var(--nc-radius-md);
                    border: 1.5px solid var(--nc-border-input);
                    background: #ffffff;
                    color: var(--nc-text-secondary);
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
                }

                .news-create__cancel-btn:hover {
                    border-color: #b9c4d6;
                    color: var(--nc-text-primary);
                    box-shadow: 0 6px 16px -8px rgba(15, 23, 42, 0.18);
                }

                .news-create__submit-btn {
                    padding: 9px 18px;
                    border-radius: var(--nc-radius-md);
                    border: none;
                    background: linear-gradient(135deg, var(--nc-accent-2), var(--nc-accent-1));
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 14px 26px -12px rgba(5, 150, 105, 0.55);
                    transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }

                .news-create__submit-btn:hover:not(:disabled) {
                    filter: brightness(1.05);
                    transform: translateY(-1px);
                    box-shadow: 0 18px 30px -12px rgba(5, 150, 105, 0.6);
                }

                .news-create__submit-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                .news-create__submit-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .news-create__input:focus-visible,
                .news-create__textarea:focus-visible,
                .news-create__cancel-btn:focus-visible,
                .news-create__submit-btn:focus-visible {
                    outline: 2px solid var(--nc-accent-2);
                    outline-offset: 2px;
                }

                /* ---------- Responsive ---------- */
                @media (max-width: 640px) {
                    .news-create {
                        padding: 20px 16px 28px;
                    }

                    .news-create__title {
                        font-size: 22px;
                    }

                    .news-create__form {
                        padding: 18px 16px;
                        border-radius: 18px;
                    }

                    .news-create__actions {
                        flex-direction: column-reverse;
                    }

                    .news-create__cancel-btn,
                    .news-create__submit-btn {
                        width: 100%;
                        text-align: center;
                    }
                }
            `}</style>

            <div className="news-create__inner">
                <div className="news-create__header">
                    <span className="news-create__eyebrow">Bài viết mới</span>
                    <h1 className="news-create__title">Tạo bài viết</h1>
                    <p className="news-create__subtitle">Bài viết sẽ hiển thị công khai cho hội viên sau khi đăng</p>
                </div>

                <form className="news-create__form" onSubmit={handleSubmit} noValidate>
                    <div className="news-create__field">
                        <label className="news-create__label" htmlFor="news-title">
                            Tiêu đề <span className="news-create__required">*</span>
                        </label>
                        <input
                            id="news-title"
                            type="text"
                            className="news-create__input"
                            placeholder="Nhập tiêu đề bài viết"
                            value={form.title}
                            onChange={handleChange("title")}
                            maxLength={200}
                        />
                    </div>

                    <div className="news-create__field">
                        <label className="news-create__label" htmlFor="news-branch">
                            Chi nhánh áp dụng
                        </label>
                        <select
                            id="news-branch"
                            className="news-create__input"
                            value={form.branchId}
                            onChange={handleChange("branchId")}
                        >
                            {branches.map((b) => (
                                <option key={b.branchId} value={b.branchId}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="news-create__field">
                        <label className="news-create__label" htmlFor="news-summary">
                            Tóm tắt
                        </label>
                        <input
                            id="news-summary"
                            type="text"
                            className="news-create__input"
                            placeholder="Mô tả ngắn gọn hiển thị ở danh sách bài viết"
                            value={form.summary}
                            onChange={handleChange("summary")}
                            maxLength={300}
                        />
                    </div>

                    <div className="news-create__field">
                        <label className="news-create__label" htmlFor="news-content">
                            Nội dung <span className="news-create__required">*</span>
                        </label>
                        <textarea
                            id="news-content"
                            className="news-create__textarea"
                            placeholder="Nhập nội dung chi tiết bài viết"
                            rows={8}
                            value={form.content}
                            onChange={handleChange("content")}
                        />
                    </div>

                    {error && <div className="news-create__message news-create__message--error">{error}</div>}
                    {success && (
                        <div className="news-create__message news-create__message--success">
                            Đăng bài viết thành công!
                        </div>
                    )}

                    <div className="news-create__actions">
                        <button
                            type="button"
                            className="news-create__cancel-btn"
                            onClick={() => navigate("/admin/news")}
                        >
                            Hủy
                        </button>
                        <button type="submit" className="news-create__submit-btn" disabled={submitting}>
                            {submitting ? "Đang đăng..." : "Đăng bài viết"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}