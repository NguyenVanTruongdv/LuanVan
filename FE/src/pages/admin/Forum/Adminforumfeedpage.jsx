import {
    Flame,
    Heart,
    MessageCircle,
    MessagesSquare,
    Search,
    Trash2,
    TrendingUp,
    Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import adminApi from "../../../api/adminApi";

/* ============================================================================
   AdminForumFeedPage — "Quản lý diễn đàn" trong Admin Panel.
   ----------------------------------------------------------------------------
   - Cùng tông màu / bố cục thẻ với trang "Tổng quan" của Admin Panel: nền
     xám nhạt, thẻ trắng bo góc lớn, đổ bóng mạnh để nổi khối, điểm nhấn màu
     xanh lá — không dùng lại theme cam của app hội viên.
   - KHÁC bản hội viên (CommunityFeedPage.jsx): đây là màn hình KIỂM DUYỆT,
     không có ô đăng bài. Mỗi bài viết luôn có nút "Xoá" hiển thị công khai —
     admin có toàn quyền xoá bất kỳ bài viết nào, không cần so sánh chủ bài
     viết như bên member.
   - mapApiPost / formatRelativeTime / getInitials viết lại gọn ngay trong
     file này (độc lập với app hội viên) để tránh phụ thuộc chéo 2 codebase.
   - CẬP NHẬT: statCards giờ đọc từ adminApi.getForumOverview(), là alias của
     getForumStats() -> GET /api/ForumPost/stats (route THẬT, cùng route mà
     Layout.jsx bên member đang dùng cho card "Thống kê cộng đồng"). DTO trả
     về chỉ có { totalMembers, totalPosts, totalComments, totalLikes } — KHÔNG
     có "postsToday" / "activeMembers" như bản đoán trước đó, nên 4 thẻ bên
     dưới đã đổi lại cho khớp: Tổng bài viết / Tổng bình luận / Tổng lượt
     thích / Tổng hội viên.
   - REFRESH GIAO DIỆN: nâng cấp bảng màu + viền thẻ (mỗi khối có viền + dải
     màu accent riêng theo vai trò), thêm chiều sâu bằng shadow phân lớp,
     bo góc nhất quán, hover/transition mượt hơn cho toàn bộ trang.
   ============================================================================ */

const SORT_TABS = [
    { key: "newest", label: "Mới nhất" },
    { key: "trending", label: "Thịnh hành" },
];

function formatRelativeTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
}

export function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || "?").charAt(0).toUpperCase();
}

export function mapApiPost(p) {
    return {
        id: p.postId,
        authorId: p.memberId,
        author: p.memberName ?? "Ẩn danh",
        avatar: p.memberAvatar || null,
        tag: p.categoryName ?? "",
        time: formatRelativeTime(p.createdAt),
        title: p.title ?? "",
        content: p.content ?? "",
        images: p.imageUrls ?? [],
        likes: p.likeCount ?? 0,
        comments: p.commentCount ?? 0,
        postType: p.postType,
    };
}

function PostAuthorAvatar({ name, avatar }) {
    if (avatar) return <img src={avatar} alt="" className="afp-post__avatar" />;
    return <div className="afp-post__avatar afp-post__avatar--initial">{getInitials(name)}</div>;
}

/* Thẻ số liệu nhanh phía trên — cùng style với thẻ "Tổng hội viên / Doanh thu..."
   ở trang Tổng quan: icon vuông bo góc màu nhạt + số lớn + nhãn. */
function StatCard({ icon, label, value, tone }) {
    return (
        <div className={`afp-stat afp-stat--${tone}`}>
            <div className="afp-stat__icon">{icon}</div>
            <div>
                <p className="afp-stat__label">{label}</p>
                <p className="afp-stat__value">{value}</p>
            </div>
        </div>
    );
}

export default function AdminForumFeedPage() {
    const location = useLocation();

    const [categories, setCategories] = useState([{ key: "all", label: "Tất cả" }]);
    const [activeTopic, setActiveTopic] = useState("all");
    const [activeSort, setActiveSort] = useState("newest");
    const [search, setSearch] = useState("");

    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // DTO thật: { totalMembers, totalPosts, totalComments, totalLikes }
    const [overview, setOverview] = useState(null);

    const [deletingId, setDeletingId] = useState(null);
    const feedBackTo = `${location.pathname}${location.search}`;

    /* Danh mục để lọc — tách riêng khỏi phần data bài viết để trang vẫn hiển
       thị được dù API danh mục lỗi (chỉ mất bộ lọc, không mất danh sách bài) */
    useEffect(() => {
        adminApi
            .getForumCategories()
            .then((res) => {
                const raw = res?.data ?? res ?? [];
                const list = Array.isArray(raw) ? raw : raw.items ?? [];
                setCategories([
                    { key: "all", label: "Tất cả" },
                    ...list.map((c) => ({ key: String(c.categoryId ?? c.id), label: c.categoryName ?? c.name })),
                ]);
            })
            .catch((err) => console.error("Không thể tải danh mục:", err));
    }, []);

    /* Số liệu tổng quan diễn đàn — GET /api/ForumPost/stats (qua getForumOverview) */
    useEffect(() => {
        adminApi
            .getForumOverview()
            .then((res) => {
                const data = res?.data ?? res ?? {};
                setOverview({
                    totalMembers: data.totalMembers ?? 0,
                    totalPosts: data.totalPosts ?? 0,
                    totalComments: data.totalComments ?? 0,
                    totalLikes: data.totalLikes ?? 0,
                });
            })
            .catch((err) => console.error("Không thể tải thống kê diễn đàn:", err));
    }, [refreshKey]);

    /* Danh sách bài viết */
    useEffect(() => {
        let mounted = true;
        setPostsLoading(true);
        setPostsError(null);
        const params = {
            ...(activeTopic !== "all" ? { categoryId: Number(activeTopic) } : {}),
            ...(activeSort === "trending" ? { sort: "trending" } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
        };
        adminApi
            .getForumPosts(params)
            .then((res) => {
                if (!mounted) return;
                const payload = res?.data ?? res ?? [];
                const raw = Array.isArray(payload) ? payload : payload.items ?? payload.Items ?? [];
                setPosts(raw.map(mapApiPost));
            })
            .catch((err) => {
                console.error("Không thể tải bài viết:", err);
                if (!mounted) return;
                setPostsError("Không thể tải bài viết, vui lòng thử lại.");
                setPosts([]);
            })
            .finally(() => mounted && setPostsLoading(false));
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTopic, activeSort, refreshKey]);

    /* Tìm kiếm gõ-tới-đâu-lọc-tới-đó, debounce nhẹ để đỡ spam API */
    useEffect(() => {
        const t = setTimeout(() => setRefreshKey((k) => k + 1), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    /* Xoá bài viết — admin có toàn quyền, luôn hỏi xác nhận trước khi xoá vĩnh viễn */
    const handleDeletePost = async (postId, title) => {
        const ok = window.confirm(`Xoá vĩnh viễn bài viết "${title}"? Hành động này không thể hoàn tác.`);
        if (!ok) return;
        setDeletingId(postId);
        try {
            await adminApi.deleteForumPost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("Không thể xoá bài viết:", err);
            alert("Xoá bài viết thất bại, vui lòng thử lại.");
        } finally {
            setDeletingId(null);
        }
    };

    /* CẬP NHẬT — 4 thẻ giờ khớp đúng field của ForumStatsDto thật:
       Tổng bài viết / Tổng bình luận / Tổng lượt thích / Tổng hội viên.
       (Đã bỏ "Bài viết hôm nay" vì BE không trả postsToday.) */
    const statCards = useMemo(
        () => [
            {
                icon: <MessagesSquare size={20} />,
                label: "Tổng bài viết",
                value: overview?.totalPosts?.toLocaleString("vi-VN") ?? "—",
                tone: "green",
            },
            {
                icon: <MessageCircle size={20} />,
                label: "Tổng bình luận",
                value: overview?.totalComments?.toLocaleString("vi-VN") ?? "—",
                tone: "blue",
            },
            {
                icon: <TrendingUp size={20} />,
                label: "Tổng lượt thích",
                value: overview?.totalLikes?.toLocaleString("vi-VN") ?? "—",
                tone: "orange",
            },
            {
                icon: <Users size={20} />,
                label: "Tổng hội viên",
                value: overview?.totalMembers?.toLocaleString("vi-VN") ?? "—",
                tone: "purple",
            },
        ],
        [overview]
    );

    return (
        <div className="afp">
            <style>{CSS}</style>

            <div className="afp-heading">
                <span className="afp-heading__eyebrow">Admin Panel</span>
                <h1>Quản lý diễn đàn</h1>
                <p>Theo dõi, kiểm duyệt và xử lý bài viết trong cộng đồng hội viên.</p>
            </div>

            <div className="afp-stats-grid">
                {statCards.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            <div className="afp-panel afp-toolbar">
                <div className="afp-search">
                    <Search size={16} className="afp-search__icon" />
                    <input
                        placeholder="Tìm theo tiêu đề hoặc nội dung bài viết..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="afp-topics">
                    {categories.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTopic(t.key)}
                            className={"afp-topic-pill" + (activeTopic === t.key ? " is-active" : "")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="afp-sort-tabs">
                    {SORT_TABS.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setActiveSort(s.key)}
                            className={"afp-sort-tab" + (activeSort === s.key ? " is-active" : "")}
                        >
                            {s.key === "trending" && <Flame size={13} />} {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="afp-list">
                {postsLoading && (
                    <div className="afp-panel afp-empty">
                        <span className="afp-spinner" aria-hidden="true" />
                        Đang tải bài viết...
                    </div>
                )}
                {!postsLoading && postsError && <div className="afp-panel afp-empty afp-empty--error">{postsError}</div>}
                {!postsLoading && !postsError && posts.length === 0 && (
                    <div className="afp-panel afp-empty">Không có bài viết nào phù hợp.</div>
                )}

                {!postsLoading &&
                    !postsError &&
                    posts.map((post) => (
                        <article key={post.id} className={"afp-panel afp-post" + (deletingId === post.id ? " is-deleting" : "")}>
                            <header className="afp-post__header">
                                <PostAuthorAvatar name={post.author} avatar={post.avatar} />
                                <div className="afp-post__meta">
                                    <div className="afp-post__author-row">
                                        <span className="afp-post__author">{post.author}</span>
                                        {post.tag && <span className="afp-post__tag">{post.tag}</span>}
                                    </div>
                                    <span className="afp-post__time">{post.time}</span>
                                </div>

                                {/* Admin — nút xoá LUÔN hiển thị, không cần kiểm tra chủ bài viết */}
                                <button
                                    type="button"
                                    className="afp-delete-btn"
                                    disabled={deletingId === post.id}
                                    onClick={() => handleDeletePost(post.id, post.title)}
                                >
                                    <Trash2 size={14} />
                                    {deletingId === post.id ? "Đang xoá..." : "Xoá bài viết"}
                                </button>
                            </header>

                            <Link to={`/admin/forum/bai-viet/${post.id}`} state={{ backTo: feedBackTo }} className="afp-post__title-link">
                                <h3 className="afp-post__title">{post.title}</h3>
                            </Link>
                            <p className="afp-post__content">{post.content}</p>

                            {post.images.length > 0 && (
                                <div className="afp-post__images">
                                    {post.images.map((src, i) => (
                                        <img key={i} src={src} alt="" />
                                    ))}
                                </div>
                            )}

                            <div className="afp-post__stats">
                                <span>
                                    <Heart size={14} /> {post.likes} lượt thích
                                </span>
                                <Link to={`/admin/forum/bai-viet/${post.id}`} state={{ backTo: feedBackTo }} className="afp-post__stat-link">
                                    <MessageCircle size={14} /> {post.comments} bình luận
                                </Link>
                            </div>
                        </article>
                    ))}
            </div>
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* CSS — tông màu đồng bộ với Admin Panel (xanh lá VT Gym), bo góc lớn,   */
/* viền + dải màu accent riêng cho từng khối, đổ bóng phân lớp để tạo    */
/* chiều sâu, hover/transition mượt trên toàn trang.                     */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --afp-accent: #10B981;
  --afp-accent-dark: #059669;
  --afp-accent-light: #34D399;
  --afp-accent-soft: rgba(16, 185, 129, 0.12);
  --afp-danger: #EF4444;
  --afp-danger-dark: #DC2626;
  --afp-danger-soft: rgba(239, 68, 68, 0.10);
  --afp-bg: #EEF2F4;
  --afp-panel: #FFFFFF;
  --afp-border: #E4E9EE;
  --afp-border-strong: #D7DEE5;
  --afp-text: #101828;
  --afp-text-sub: #475467;
  --afp-text-muted: #98A2B3;
  --afp-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 28px rgba(16, 24, 40, 0.07);
  --afp-shadow-hover: 0 4px 10px rgba(16, 24, 40, 0.06), 0 22px 44px rgba(16, 24, 40, 0.12);
}

* { box-sizing: border-box; }

.afp { background: var(--afp-bg); padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 22px; min-height: 100%; }

.afp-heading__eyebrow {
  display: inline-block; font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  color: var(--afp-accent-dark); background: var(--afp-accent-soft); border: 1px solid rgba(16,185,129,.25);
  border-radius: 999px; padding: 4px 12px; margin-bottom: 10px;
}
.afp-heading h1 { margin: 0 0 6px; font-size: 27px; font-weight: 800; color: var(--afp-text); letter-spacing: -0.01em; }
.afp-heading p { margin: 0; font-size: 14px; color: var(--afp-text-sub); }

.afp-panel {
  background: var(--afp-panel);
  border: 1px solid var(--afp-border);
  border-radius: 20px;
  box-shadow: var(--afp-shadow);
}

.afp-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
@media (max-width: 1100px) { .afp-stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .afp-stats-grid { grid-template-columns: 1fr; } }

.afp-stat {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  background: var(--afp-panel);
  border: 1px solid var(--afp-border);
  border-radius: 18px; padding: 18px 20px 18px 22px;
  box-shadow: var(--afp-shadow);
  overflow: hidden;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.afp-stat::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
  background: linear-gradient(180deg, var(--tone-a), var(--tone-b));
}
.afp-stat:hover { transform: translateY(-3px); box-shadow: var(--afp-shadow-hover); border-color: var(--afp-border-strong); }

.afp-stat--green  { --tone-a: #34D399; --tone-b: #059669; }
.afp-stat--blue   { --tone-a: #60A5FA; --tone-b: #2563EB; }
.afp-stat--orange { --tone-a: #FBBF24; --tone-b: #B45309; }
.afp-stat--purple { --tone-a: #A78BFA; --tone-b: #6D28D9; }

.afp-stat__icon {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  display: grid; place-items: center;
  background: linear-gradient(135deg, var(--tone-a), var(--tone-b));
  color: #fff;
  box-shadow: 0 6px 14px -4px var(--tone-b);
}

.afp-stat__label { margin: 0 0 3px; font-size: 12.5px; color: var(--afp-text-sub); font-weight: 600; }
.afp-stat__value { margin: 0; font-size: 23px; font-weight: 800; color: var(--afp-text); letter-spacing: -0.01em; }

.afp-toolbar { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; border-top: 3px solid var(--afp-accent); }

.afp-search {
  display: flex; align-items: center; gap: 10px;
  background: var(--afp-bg); border: 1.5px solid var(--afp-border);
  border-radius: 14px; padding: 11px 16px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.afp-search:focus-within { border-color: var(--afp-accent); box-shadow: 0 0 0 4px var(--afp-accent-soft); background: var(--afp-panel); }
.afp-search__icon { color: var(--afp-text-muted); flex-shrink: 0; }
.afp-search input { flex: 1; border: none; background: transparent; outline: none; font-size: 14px; color: var(--afp-text); }
.afp-search input::placeholder { color: var(--afp-text-muted); }

.afp-topics { display: flex; gap: 8px; flex-wrap: wrap; }
.afp-topic-pill {
  border: 1.5px solid var(--afp-border); background: var(--afp-panel); color: var(--afp-text-sub);
  border-radius: 999px; padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all .15s ease;
}
.afp-topic-pill:hover { border-color: var(--afp-accent-light); color: var(--afp-accent-dark); }
.afp-topic-pill.is-active {
  background: linear-gradient(135deg, var(--afp-accent-light), var(--afp-accent-dark));
  border-color: transparent; color: #fff;
  box-shadow: 0 8px 18px -4px rgba(16,185,129,.45);
}

.afp-sort-tabs { display: flex; gap: 20px; border-top: 1px solid var(--afp-border); padding-top: 14px; }
.afp-sort-tab {
  display: flex; align-items: center; gap: 6px;
  border: none; background: transparent; color: var(--afp-text-muted); font-size: 13.5px; font-weight: 700;
  cursor: pointer; padding: 0 0 8px; position: relative; transition: color .15s ease;
}
.afp-sort-tab:hover { color: var(--afp-accent-dark); }
.afp-sort-tab.is-active { color: var(--afp-accent-dark); }
.afp-sort-tab.is-active::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2.5px; border-radius: 2px;
  background: linear-gradient(90deg, var(--afp-accent-light), var(--afp-accent-dark));
}

.afp-list { display: flex; flex-direction: column; gap: 18px; }
.afp-empty {
  padding: 44px 20px; text-align: center; color: var(--afp-text-muted); font-size: 14px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
}
.afp-empty--error { color: var(--afp-danger-dark); border-color: rgba(239,68,68,.3); background: var(--afp-danger-soft); }

.afp-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2.5px solid var(--afp-accent-soft); border-top-color: var(--afp-accent);
  animation: afp-spin .7s linear infinite;
}
@keyframes afp-spin { to { transform: rotate(360deg); } }

.afp-post {
  padding: 20px 22px 22px;
  border: 1.5px solid var(--afp-accent-light);
  transition: opacity .15s ease, box-shadow .18s ease, border-color .18s ease, transform .18s ease;
}
.afp-post:hover { box-shadow: var(--afp-shadow-hover); border-color: var(--afp-accent-dark); transform: translateY(-2px); }
.afp-post.is-deleting { opacity: .5; pointer-events: none; }

.afp-post__header { display: flex; align-items: center; gap: 12px; }
.afp-post__avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid var(--afp-border); }
.afp-post__avatar--initial {
  display: grid; place-items: center; font-size: 15px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--afp-accent-light), var(--afp-accent-dark));
  border: 2px solid transparent;
}
.afp-post__meta { flex: 1; min-width: 0; }
.afp-post__author-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.afp-post__author { font-weight: 700; font-size: 14.5px; color: var(--afp-text); }
.afp-post__tag {
  font-size: 11px; font-weight: 700; color: var(--afp-accent-dark); background: var(--afp-accent-soft);
  border: 1px solid rgba(16,185,129,.25);
  padding: 2px 9px; border-radius: 999px;
}
.afp-post__time { font-size: 12px; color: var(--afp-text-muted); }

.afp-delete-btn {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  border: 1.5px solid var(--afp-danger); background: var(--afp-danger-soft); color: var(--afp-danger-dark);
  border-radius: 10px; padding: 8px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer;
  transition: all .15s ease;
}
.afp-delete-btn:hover { background: var(--afp-danger); border-color: var(--afp-danger); color: #fff; box-shadow: 0 6px 14px -4px rgba(239,68,68,.5); }
.afp-delete-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

.afp-post__title-link { text-decoration: none; }
.afp-post__title { font-size: 17.5px; font-weight: 800; margin: 14px 0 6px; color: var(--afp-text); letter-spacing: -0.005em; }
.afp-post__title-link:hover .afp-post__title { color: var(--afp-accent-dark); }
.afp-post__content { font-size: 13.5px; color: var(--afp-text-sub); line-height: 1.65; margin: 0 0 12px; }

.afp-post__images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.afp-post__images img {
  width: 100%; height: 140px; object-fit: cover; border-radius: 12px;
  border: 1px solid var(--afp-border); transition: transform .2s ease;
}
.afp-post__images img:hover { transform: scale(1.02); }

.afp-post__stats {
  display: flex; align-items: center; gap: 20px; margin-top: 14px; padding-top: 14px;
  border-top: 1px solid var(--afp-border); font-size: 13px; color: var(--afp-text-sub);
}
.afp-post__stats span { display: flex; align-items: center; gap: 5px; }
.afp-post__stat-link { display: flex; align-items: center; gap: 5px; text-decoration: none; color: var(--afp-text-sub); transition: color .15s ease; }
.afp-post__stat-link:hover { color: var(--afp-accent-dark); }
`;