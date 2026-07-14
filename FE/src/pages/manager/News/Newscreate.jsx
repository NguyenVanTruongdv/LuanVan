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

export default function NewsCreate() {
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
                setBranches(profile?.branches ?? []);
                if (profile?.defaultBranchId) {
                    setForm((prev) => ({ ...prev, branchId: String(profile.defaultBranchId) }));
                }
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
            setTimeout(() => navigate("/manager/news"), 900);
        } catch (err) {
            setError("Tạo bài viết thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="news-create">
            <style>{`
                .news-create {
                    --nc-bg-panel: #141a29;
                    --nc-bg-card: #1a2233;
                    --nc-border: #262f45;
                    --nc-text-primary: #e7ecf5;
                    --nc-text-secondary: #8b95ab;
                    --nc-teal: #2dd4bf;
                    --nc-cyan: #22d3ee;
                    --nc-red: #f87171;
                    --nc-green: #34d399;
                    --nc-radius: 14px;

                    max-width: 720px;
                    margin: 0 auto;
                    padding: 28px;
                    color: var(--nc-text-primary);
                    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                }

                .news-create__header {
                    margin-bottom: 22px;
                }

                .news-create__title {
                    margin: 0 0 4px;
                    font-size: 22px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                }

                .news-create__subtitle {
                    margin: 0;
                    font-size: 13.5px;
                    color: var(--nc-text-secondary);
                }

                .news-create__form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    padding: 24px;
                    background: var(--nc-bg-card);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius);
                }

                .news-create__field {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .news-create__label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--nc-text-primary);
                }

                .news-create__required {
                    color: var(--nc-red);
                }

                .news-create__input,
                .news-create__textarea {
                    width: 100%;
                    padding: 11px 14px;
                    border-radius: 10px;
                    border: 1px solid var(--nc-border);
                    background: var(--nc-bg-panel);
                    color: var(--nc-text-primary);
                    font-size: 13.5px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.15s ease;
                    box-sizing: border-box;
                }

                .news-create__input::placeholder,
                .news-create__textarea::placeholder {
                    color: #5b6478;
                }

                .news-create__input:focus,
                .news-create__textarea:focus {
                    border-color: var(--nc-teal);
                }

                .news-create__textarea {
                    resize: vertical;
                    min-height: 160px;
                    line-height: 1.55;
                }

                select.news-create__input {
                    cursor: pointer;
                }

                /* Messages */
                .news-create__message {
                    padding: 10px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .news-create__message--error {
                    background: rgba(248, 113, 113, 0.1);
                    border: 1px solid rgba(248, 113, 113, 0.35);
                    color: var(--nc-red);
                }

                .news-create__message--success {
                    background: rgba(52, 211, 153, 0.1);
                    border: 1px solid rgba(52, 211, 153, 0.35);
                    color: var(--nc-green);
                }

                /* Actions */
                .news-create__actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 4px;
                }

                .news-create__cancel-btn {
                    padding: 11px 20px;
                    border-radius: 10px;
                    border: 1px solid var(--nc-border);
                    background: transparent;
                    color: var(--nc-text-secondary);
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: border-color 0.15s ease, color 0.15s ease;
                }

                .news-create__cancel-btn:hover {
                    border-color: #3a4460;
                    color: var(--nc-text-primary);
                }

                .news-create__submit-btn {
                    padding: 11px 22px;
                    border-radius: 10px;
                    border: none;
                    background: linear-gradient(135deg, var(--nc-cyan), var(--nc-teal));
                    color: #04211d;
                    font-size: 13.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: filter 0.15s ease, transform 0.15s ease;
                }

                .news-create__submit-btn:hover:not(:disabled) {
                    filter: brightness(1.08);
                    transform: translateY(-1px);
                }

                .news-create__submit-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                /* ---------- Responsive ---------- */
                @media (max-width: 640px) {
                    .news-create {
                        padding: 18px;
                    }

                    .news-create__form {
                        padding: 18px;
                        border-radius: 12px;
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

            <div className="news-create__header">
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
                        <option value="">Tất cả chi nhánh</option>
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
                        rows={10}
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
                        onClick={() => navigate("/manager/news")}
                    >
                        Hủy
                    </button>
                    <button type="submit" className="news-create__submit-btn" disabled={submitting}>
                        {submitting ? "Đang đăng..." : "Đăng bài viết"}
                    </button>
                </div>
            </form>
        </div>
    );
}