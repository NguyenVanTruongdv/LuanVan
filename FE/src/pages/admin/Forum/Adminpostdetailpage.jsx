import {
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    CornerDownRight,
    Heart,
    MessageCircle,
    ShieldAlert,
    Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import adminApi from "../../../api/adminApi";
import { getInitials, mapApiPost } from "./AdminForumFeedPage";

/* ============================================================================
   AdminPostDetailPage — chi tiết 1 bài viết trong "Quản lý diễn đàn" (Admin).
   ----------------------------------------------------------------------------
   - Không có ô nhập bình luận / nút thích: đây là màn hình xem + kiểm duyệt,
     không phải trải nghiệm tương tác của hội viên.
   - MỌI bình luận / trả lời (kể cả lồng nhiều cấp, được làm phẳng hiển thị
     giống bản hội viên) đều có nút "Xoá" — admin toàn quyền, không so sánh
     chủ sở hữu như PostDetailPage.jsx bên app hội viên.
   - Xoá bài viết gốc cũng nằm ngay trong khối bài viết, thao tác 1 lần.
   ============================================================================ */

const DEFAULT_BACK_TARGET = "/admin/forum";

function formatRelativeTime(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN");
}

/* Làm phẳng cây bình luận (root + toàn bộ hậu duệ) để hiển thị 1 cấp trả lời
   giống bản hội viên — dữ liệu thật ở BE vẫn là cây n-cấp, chỉ UI làm phẳng. */
function flattenCommentTree(dto) {
    const flat = [];
    const visit = (node) => {
        flat.push({
            id: node.commentId ?? node.id,
            memberId: node.memberId,
            author: node.memberName ?? "Hội viên",
            avatar: node.memberAvatar || null,
            createdAt: node.createdAt,
            time: formatRelativeTime(node.createdAt),
            content: node.content ?? "",
            likes: node.likeCount ?? 0,
            replyToName: node.replyToMemberName || null,
        });
        (node.replies || []).forEach(visit);
    };
    const root = {
        id: dto.commentId ?? dto.id,
        memberId: dto.memberId,
        author: dto.memberName ?? "Hội viên",
        avatar: dto.memberAvatar || null,
        createdAt: dto.createdAt,
        time: formatRelativeTime(dto.createdAt),
        content: dto.content ?? "",
        likes: dto.likeCount ?? 0,
    };
    (dto.replies || []).forEach(visit);
    flat.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return { root, replies: flat };
}

function countAllComments(list) {
    return list.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
}

export default function AdminPostDetailPage() {
    const { id } = useParams();
    const location = useLocation();
    const backTarget = location.state?.backTo || DEFAULT_BACK_TARGET;

    const [post, setPost] = useState(null);
    const [postLoading, setPostLoading] = useState(true);
    const [postError, setPostError] = useState(null);
    const [deletingPost, setDeletingPost] = useState(false);

    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentsError, setCommentsError] = useState(null);
    const [collapsed, setCollapsed] = useState({});
    const [deletingCommentId, setDeletingCommentId] = useState(null);

    useEffect(() => {
        let mounted = true;
        setPostLoading(true);
        setPostError(null);
        adminApi
            .getForumPostById(id)
            .then((res) => {
                if (!mounted) return;
                setPost(mapApiPost(res?.data ?? res));
            })
            .catch((err) => {
                console.error("Không thể tải bài viết:", err);
                if (!mounted) return;
                setPostError("Không thể tải bài viết, vui lòng thử lại.");
            })
            .finally(() => mounted && setPostLoading(false));
        return () => {
            mounted = false;
        };
    }, [id]);

    const loadComments = async () => {
        setCommentsLoading(true);
        setCommentsError(null);
        try {
            const res = await adminApi.getForumComments(id, { pageSize: 200 });
            const raw = res?.data ?? res;
            const list = Array.isArray(raw) ? raw : raw?.items ?? [];
            setComments(list.map((dto) => {
                const { root, replies } = flattenCommentTree(dto);
                return { ...root, replies };
            }));
        } catch (err) {
            console.error("Không thể tải bình luận:", err);
            setCommentsError("Không thể tải bình luận, vui lòng thử lại.");
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        loadComments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const totalComments = useMemo(() => countAllComments(comments), [comments]);
    const toggleCollapse = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

    const handleDeletePost = async () => {
        if (!post) return;
        const ok = window.confirm(`Xoá vĩnh viễn bài viết "${post.title}" cùng toàn bộ ${totalComments} bình luận?`);
        if (!ok) return;
        setDeletingPost(true);
        try {
            await adminApi.deleteForumPost(post.id);
            window.location.href = backTarget;
        } catch (err) {
            console.error("Không thể xoá bài viết:", err);
            alert("Xoá bài viết thất bại, vui lòng thử lại.");
            setDeletingPost(false);
        }
    };

    /* Xoá 1 bình luận/trả lời — admin toàn quyền, không kiểm tra chủ sở hữu */
    const handleDeleteComment = async (commentId) => {
        const ok = window.confirm("Xoá  bình luận này?");
        if (!ok) return;
        setDeletingCommentId(commentId);
        try {
            await adminApi.deleteForumComment(commentId);
            await loadComments();
        } catch (err) {
            console.error("Không thể xoá bình luận:", err);
            alert("Xoá bình luận thất bại, vui lòng thử lại.");
        } finally {
            setDeletingCommentId(null);
        }
    };

    return (
        <div className="apd">
            <style>{CSS}</style>

            <header className="apd-header">
                <Link to={backTarget} className="apd-header__back" aria-label="Quay lại">
                    <ArrowLeft size={20} />
                </Link>
                <span className="apd-header__title">Chi tiết bài viết</span>
                <span className="apd-header__spacer" />
            </header>

            {postLoading && <div className="apd-panel apd-empty">Đang tải bài viết...</div>}
            {!postLoading && postError && <div className="apd-panel apd-empty apd-empty--error">{postError}</div>}

            {!postLoading && !postError && post && (
                <>
                    <article className="apd-panel apd-post">
                        <header className="apd-post__header">
                            {post.avatar ? (
                                <img src={post.avatar} alt="" className="apd-post__avatar" />
                            ) : (
                                <div className="apd-post__avatar apd-post__avatar--initial">{getInitials(post.author)}</div>
                            )}
                            <div className="apd-post__meta">
                                <div className="apd-post__author-row">
                                    <span className="apd-post__author">{post.author}</span>
                                    {post.tag && <span className="apd-post__tag">{post.tag}</span>}
                                </div>
                                <span className="apd-post__time">{post.time}</span>
                            </div>

                            <button type="button" className="apd-delete-btn" disabled={deletingPost} onClick={handleDeletePost}>
                                <Trash2 size={14} />
                                {deletingPost ? "Đang xoá..." : "Xoá bài viết"}
                            </button>
                        </header>

                        <h1 className="apd-post__title">{post.title}</h1>
                        <p className="apd-post__content">{post.content}</p>

                        {post.images.length > 0 && (
                            <div className="apd-post__images">
                                {post.images.map((src, i) => (
                                    <img key={i} src={src} alt="" />
                                ))}
                            </div>
                        )}

                        <div className="apd-post__totals">
                            <span><Heart size={14} /> {post.likes} lượt thích</span>
                            <span><MessageCircle size={14} /> {totalComments} bình luận</span>
                        </div>
                    </article>

                    <div className="apd-panel apd-notice">
                        <ShieldAlert size={16} />
                        Bạn đang xem với quyền Admin
                    </div>

                    <div className="apd-panel apd-comments">
                        <h2 className="apd-comments__heading">Tất cả bình luận ({totalComments})</h2>

                        {commentsLoading && <p className="apd-comments__empty">Đang tải bình luận...</p>}
                        {!commentsLoading && commentsError && (
                            <p className="apd-comments__empty apd-comments__empty--error">{commentsError}</p>
                        )}
                        {!commentsLoading && !commentsError && comments.length === 0 && (
                            <p className="apd-comments__empty">Bài viết này chưa có bình luận nào.</p>
                        )}

                        {!commentsLoading && !commentsError && comments.length > 0 && (
                            <ul className="apd-comment-list">
                                {comments.map((c) => {
                                    const hasReplies = c.replies && c.replies.length > 0;
                                    const isCollapsed = collapsed[c.id] !== false;
                                    return (
                                        <li key={c.id} className="apd-comment">
                                            {c.avatar ? (
                                                <img src={c.avatar} alt="" className="apd-comment__avatar" />
                                            ) : (
                                                <div className="apd-comment__avatar apd-post__avatar--initial">{getInitials(c.author)}</div>
                                            )}
                                            <div className="apd-comment__body">
                                                <div className="apd-comment__bubble">
                                                    <span className="apd-comment__author">{c.author}</span>
                                                    <p className="apd-comment__text">{c.content}</p>
                                                </div>
                                                <div className="apd-comment__row-actions">
                                                    <span className="apd-comment__time">{c.time}</span>
                                                    {c.likes > 0 && <span className="apd-comment__likes"><Heart size={11} /> {c.likes}</span>}
                                                    <button
                                                        className="apd-comment__delete"
                                                        disabled={deletingCommentId === c.id}
                                                        onClick={() => handleDeleteComment(c.id)}
                                                    >
                                                        <Trash2 size={12} /> {deletingCommentId === c.id ? "Đang xoá..." : "Xoá"}
                                                    </button>
                                                </div>

                                                {hasReplies && (
                                                    <button type="button" className="apd-comment__toggle-replies" onClick={() => toggleCollapse(c.id)}>
                                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                        {isCollapsed ? `Xem ${c.replies.length} câu trả lời` : "Ẩn câu trả lời"}
                                                    </button>
                                                )}

                                                {hasReplies && !isCollapsed && (
                                                    <ul className="apd-reply-list">
                                                        {c.replies.map((r) => (
                                                            <li key={r.id} className="apd-reply">
                                                                <CornerDownRight size={13} className="apd-reply__corner" />
                                                                {r.avatar ? (
                                                                    <img src={r.avatar} alt="" className="apd-reply__avatar" />
                                                                ) : (
                                                                    <div className="apd-reply__avatar apd-post__avatar--initial">{getInitials(r.author)}</div>
                                                                )}
                                                                <div className="apd-reply__body">
                                                                    <div className="apd-comment__bubble apd-reply__bubble">
                                                                        <span className="apd-comment__author">
                                                                            {r.author}
                                                                            {r.replyToName && r.replyToName !== c.author && (
                                                                                <span className="apd-reply__to"> → {r.replyToName}</span>
                                                                            )}
                                                                        </span>
                                                                        <p className="apd-comment__text">{r.content}</p>
                                                                    </div>
                                                                    <div className="apd-comment__row-actions">
                                                                        <span className="apd-comment__time">{r.time}</span>
                                                                        {r.likes > 0 && <span className="apd-comment__likes"><Heart size={11} /> {r.likes}</span>}
                                                                        <button
                                                                            className="apd-comment__delete"
                                                                            disabled={deletingCommentId === r.id}
                                                                            onClick={() => handleDeleteComment(r.id)}
                                                                        >
                                                                            <Trash2 size={12} /> {deletingCommentId === r.id ? "Đang xoá..." : "Xoá"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* CSS — đồng bộ tông xanh lá + bo góc lớn + đổ bóng mạnh với trang danh sách */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --apd-accent: #10B981;
  --apd-accent-dark: #059669;
  --apd-accent-soft: rgba(16, 185, 129, 0.12);
  --apd-danger: #EF4444;
  --apd-danger-soft: rgba(239, 68, 68, 0.10);
  --apd-bg: #F4F6F8;
  --apd-panel: #FFFFFF;
  --apd-border: #E9EDF1;
  --apd-text: #101828;
  --apd-text-sub: #475467;
  --apd-text-muted: #98A2B3;
  --apd-shadow: 0 18px 40px rgba(16, 24, 40, 0.08), 0 4px 10px rgba(16, 24, 40, 0.05);
}

.apd { background: var(--apd-bg); padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 18px; max-width: 780px; margin: 0 auto; }

.apd-panel { background: var(--apd-panel); border: 1px solid var(--apd-border); border-radius: 20px; box-shadow: var(--apd-shadow); }
.apd-empty { padding: 40px 20px; text-align: center; color: var(--apd-text-muted); font-size: 14px; }
.apd-empty--error { color: var(--apd-danger); }

.apd-header { display: flex; align-items: center; gap: 12px; }
.apd-header__back {
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  color: var(--apd-text); background: var(--apd-panel); border: 1px solid var(--apd-border);
  box-shadow: var(--apd-shadow); flex-shrink: 0; text-decoration: none;
}
.apd-header__back:hover { color: var(--apd-accent-dark); border-color: var(--apd-accent); }
.apd-header__title { font-size: 18px; font-weight: 800; flex: 1; color: var(--apd-text); }
.apd-header__spacer { width: 38px; }

.apd-post { padding: 22px 24px; border-left: 4px solid var(--apd-accent); }
.apd-post__header { display: flex; align-items: center; gap: 12px; }
.apd-post__avatar { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.apd-post__avatar--initial {
  display: grid; place-items: center; font-size: 17px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--apd-accent), var(--apd-accent-dark));
}
.apd-post__meta { flex: 1; min-width: 0; }
.apd-post__author-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.apd-post__author { font-weight: 700; font-size: 14.5px; color: var(--apd-text); }
.apd-post__tag { font-size: 11px; font-weight: 700; color: var(--apd-accent-dark); background: var(--apd-accent-soft); padding: 2px 9px; border-radius: 999px; }
.apd-post__time { font-size: 12px; color: var(--apd-text-muted); }

.apd-delete-btn {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  border: 1px solid var(--apd-danger); background: var(--apd-danger-soft); color: var(--apd-danger);
  border-radius: 10px; padding: 9px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer;
}
.apd-delete-btn:hover { background: var(--apd-danger); color: #fff; }
.apd-delete-btn:disabled { opacity: .55; cursor: not-allowed; }

.apd-post__title { font-size: 21px; font-weight: 800; margin: 18px 0 8px; color: var(--apd-text); line-height: 1.35; }
.apd-post__content { font-size: 14.5px; color: var(--apd-text-sub); line-height: 1.7; margin: 0 0 14px; white-space: pre-wrap; }

.apd-post__images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.apd-post__images img { width: 100%; height: 160px; object-fit: cover; border-radius: 14px; }

.apd-post__totals {
  display: flex; align-items: center; gap: 18px; margin-top: 16px; padding-top: 14px;
  border-top: 1px solid var(--apd-border); font-size: 13px; color: var(--apd-text-sub); flex-wrap: wrap;
}
.apd-post__totals span { display: flex; align-items: center; gap: 5px; }

.apd-notice {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px;
  border-left: 4px solid var(--apd-danger); color: #7A1F1F; background: var(--apd-danger-soft);
  font-size: 13px; font-weight: 600;
}

.apd-comments { padding: 20px 22px 24px; }
.apd-comments__heading { font-size: 15px; font-weight: 800; margin: 0 0 14px; color: var(--apd-text); }
.apd-comments__empty { font-size: 13.5px; color: var(--apd-text-muted); text-align: center; padding: 18px 0; }
.apd-comments__empty--error { color: var(--apd-danger); }

.apd-comment-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.apd-comment { display: flex; gap: 10px; }
.apd-comment__avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 13px; }
.apd-comment__body { flex: 1; min-width: 0; }

.apd-comment__bubble { background: var(--apd-bg); border-radius: 14px; padding: 9px 13px; display: inline-block; max-width: 100%; }
.apd-comment__author { display: block; font-size: 13px; font-weight: 700; color: var(--apd-text); margin-bottom: 2px; }
.apd-reply__to { font-weight: 600; color: var(--apd-text-muted); font-size: 12px; }
.apd-comment__text { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--apd-text); word-break: break-word; }

.apd-comment__row-actions { display: flex; align-items: center; gap: 14px; margin: 6px 2px 0; font-size: 12px; color: var(--apd-text-muted); }
.apd-comment__likes { display: flex; align-items: center; gap: 3px; }
.apd-comment__delete {
  display: flex; align-items: center; gap: 4px; margin-left: auto;
  border: none; background: transparent; color: var(--apd-danger); font-weight: 700; font-size: 12px; cursor: pointer; padding: 0;
}
.apd-comment__delete:hover { text-decoration: underline; }
.apd-comment__delete:disabled { opacity: .5; cursor: not-allowed; }

.apd-comment__toggle-replies {
  display: flex; align-items: center; gap: 4px; margin: 10px 0 0 2px; border: none; background: transparent;
  color: var(--apd-accent-dark); font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 0;
}

.apd-reply-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.apd-reply { display: flex; align-items: flex-start; gap: 8px; padding-left: 8px; }
.apd-reply__corner { color: var(--apd-text-muted); flex-shrink: 0; margin-top: 10px; }
.apd-reply__avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 11px; }
.apd-reply__body { flex: 1; min-width: 0; }
.apd-reply__bubble { padding: 8px 12px; }
`;