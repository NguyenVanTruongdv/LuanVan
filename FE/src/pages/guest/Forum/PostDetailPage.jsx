import {
    ArrowLeft,
    Bookmark,
    ChevronDown,
    ChevronUp,
    CornerDownRight,
    Heart,
    MessageCircle,
    MoreHorizontal,
    Send,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import memberApi from "../../../api/memberApi";
import { getInitials, mapApiPost } from "./Communityfeedpage";
/* npm install lucide-react react-router-dom */

/* ============================================================================
   PostDetailPage — trang chi tiết 1 bài viết trong Cộng đồng.
   ----------------------------------------------------------------------------
   CẬP NHẬT — bình luận & tym bình luận giờ gọi API THẬT (memberApi):
   - getForumComments(postId)  -> BE (ForumCommentService.GetByPostIdAsync) trả
     về danh sách bình luận gốc, mỗi bình luận có cây "replies" lồng n-cấp.
     Trang này "làm phẳng" (flatten) toàn bộ hậu duệ của 1 bình luận gốc
     thành MỘT danh sách trả lời duy nhất hiển thị bên dưới (giống Facebook),
     nhưng khi người dùng bấm "Trả lời" trên 1 câu trả lời, parentCommentId
     gửi lên vẫn là ĐÚNG id của câu trả lời đó -> dữ liệu ở BE vẫn là cây
     n-cấp thật sự, chỉ có UI hiển thị phẳng.
   - createForumComment({ postId, content, parentCommentId }) -> BE tự suy ra
     replyToMemberId từ chủ của parentCommentId, FE không cần gửi lên.
   - toggleForumCommentLike(commentId) -> tym / bỏ tym 1 bình luận (khớp với
     ForumCommentService.ToggleLikeAsync). Nếu route thật khác, chỉ cần sửa
     lại trong memberApi.js.
   - deleteForumComment(commentId) -> hội viên tự xoá bình luận của mình.
   - Bài viết (post) + tym bài viết vẫn dùng mapApiPost/toggleForumPostLike
     giống hệt trước, đồng bộ với CommunityFeedPage.jsx.

   MỚI — Nhảy thẳng tới bình luận khi bấm vào từ dropdown thông báo:
   - Layout.jsx điều hướng tới `/bai-viet/{postId}#comment-{commentId}`.
   - Trang này gắn id="comment-{id}" cho MỖI bình luận gốc lẫn trả lời.
   - Sau khi danh sách bình luận tải xong, đọc `location.hash`:
       + Nếu target nằm trong phần "replies" đang bị thu gọn của 1 bình luận
         gốc -> tự mở rộng trước.
       + Đợi DOM cập nhật xong rồi scrollIntoView tới đúng bình luận, và
         chớp nền (highlight) 2 giây để người dùng dễ nhận ra.
   - Theo dõi thêm `location.hash` (qua useLocation) để trường hợp bấm 1
     thông báo khác trỏ tới CÙNG bài viết (chỉ đổi hash, component không bị
     remount) vẫn tự scroll lại đúng chỗ.

   MỚI — Nút "Quay lại" giờ nhớ ĐÚNG nơi người dùng vừa đến từ đó:
   - Khi điều hướng tới trang này (từ CommunityFeedPage hoặc ProfilePage),
     nơi gọi navigate/Link cần kèm theo `state.backTo` là đường dẫn của
     chính trang đó (ví dụ "/forum" hoặc "/trang-ca-nhan/123?tab=posts").
   - PostDetailPage đọc `location.state.backTo`; nếu có thì nút quay lại sẽ
     trỏ về đúng đó (feed hay profile tuỳ nơi xuất phát). Nếu người dùng vào
     thẳng bằng URL (không có state, ví dụ mở link chia sẻ) thì mặc định
     quay về trang Cộng đồng ("/forum").
   ============================================================================ */

const FALLBACK_USER = {
    memberId: null,
    name: "Bạn",
    avatar: "https://i.pravatar.cc/80?img=68",
};

/* Nơi quay lại mặc định khi không có state.backTo (vào thẳng bằng URL/link chia sẻ) */
const DEFAULT_BACK_TARGET = "/forum";

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

function formatRelativeTime(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;

    return date.toLocaleDateString("vi-VN");
}

/* Chuyển 1 ForumCommentDto (kèm cây "replies" n-cấp) thành:
   { root, flatReplies } — root là bình luận gốc, flatReplies là TOÀN BỘ
   hậu duệ được duyệt DFS rồi sắp lại theo thời gian tạo (createdAt). */
function flattenCommentTree(dto) {
    const flat = [];

    const visit = (node) => {
        const mapped = {
            id: node.commentId ?? node.id,
            memberId: node.memberId,
            author: node.memberName ?? "Hội viên",
            avatar: node.memberAvatar || null,
            createdAt: node.createdAt,
            time: formatRelativeTime(node.createdAt),
            content: node.content ?? "",
            likes: node.likeCount ?? 0,
            liked: !!node.isLikedByCurrentUser,
            replyToName: node.replyToMemberName || null,
        };
        flat.push(mapped);
        (node.replies || []).forEach(visit);
    };

    const rootNode = {
        id: dto.commentId ?? dto.id,
        memberId: dto.memberId,
        author: dto.memberName ?? "Hội viên",
        avatar: dto.memberAvatar || null,
        createdAt: dto.createdAt,
        time: formatRelativeTime(dto.createdAt),
        content: dto.content ?? "",
        likes: dto.likeCount ?? 0,
        liked: !!dto.isLikedByCurrentUser,
    };

    (dto.replies || []).forEach(visit);
    flat.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return { root: rootNode, replies: flat };
}

/* Đếm tổng bình luận gồm cả các trả lời lồng bên trong */
function countAllComments(list) {
    return list.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
}

export default function PostDetailPage() {
    const { id } = useParams();
    const location = useLocation();

    /* MỚI — nơi quay lại: ưu tiên state.backTo (do CommunityFeedPage hoặc
       ProfilePage truyền qua khi điều hướng tới đây), nếu không có thì mặc
       định về trang Cộng đồng. */
    const backTarget = location.state?.backTo || DEFAULT_BACK_TARGET;

    const [post, setPost] = useState(null);
    const [postLoading, setPostLoading] = useState(true);
    const [postError, setPostError] = useState(null);

    const [currentUser, setCurrentUser] = useState(FALLBACK_USER);

    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentsError, setCommentsError] = useState(null);

    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [replyTarget, setReplyTarget] = useState(null); // { commentId, author }
    const [collapsed, setCollapsed] = useState({}); // commentId -> true nếu đang ẩn bớt trả lời

    /* Fetch bài viết thật từ API — dùng chung mapApiPost với trang feed */
    useEffect(() => {
        let mounted = true;
        setPostLoading(true);
        setPostError(null);
        memberApi
            .getForumPostById(id)
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res;
                setPost(mapApiPost(raw));
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

    /* Lấy thông tin hội viên đang đăng nhập để hiện avatar/tên trong ô nhập bình luận */
    useEffect(() => {
        let mounted = true;
        memberApi
            .getMyProfile()
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res;
                if (raw) {
                    setCurrentUser({
                        memberId: raw.memberId ?? raw.id ?? null,
                        name: raw.fullName || raw.name || FALLBACK_USER.name,
                        avatar: raw.avatar || raw.profileImage || FALLBACK_USER.avatar,
                    });
                }
            })
            .catch(() => {
                /* Chưa đăng nhập hoặc lỗi -> giữ nguyên FALLBACK_USER */
            });
        return () => {
            mounted = false;
        };
    }, []);

    /* Fetch danh sách bình luận (n-cấp) rồi làm phẳng để hiển thị */
    const loadComments = useCallback(async () => {
        if (!id) return;
        setCommentsLoading(true);
        setCommentsError(null);
        try {
            const res = await memberApi.getForumComments(id, { pageSize: 200 });
            const raw = res?.data ?? res;
            const list = Array.isArray(raw) ? raw : raw?.items ?? [];
            const mapped = list.map((dto) => {
                const { root, replies } = flattenCommentTree(dto);
                return { ...root, replies };
            });
            setComments(mapped);
        } catch (err) {
            console.error("Không thể tải bình luận:", err);
            setCommentsError("Không thể tải bình luận, vui lòng thử lại.");
        } finally {
            setCommentsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const totalComments = useMemo(() => countAllComments(comments), [comments]);

    /* MỚI — Nhảy tới bình luận được trỏ tới từ dropdown thông báo (#comment-{id}).
       Chạy lại mỗi khi: danh sách bình luận tải xong LẦN ĐẦU, hoặc hash trên URL
       đổi (trường hợp bấm 1 thông báo khác trỏ tới cùng bài viết, component
       không bị remount nên effect theo [id] ở trên sẽ không tự chạy lại). */
    useEffect(() => {
        if (commentsLoading || comments.length === 0) return;

        const hash = location.hash; // ví dụ: "#comment-123"
        if (!hash || !hash.startsWith("#comment-")) return;

        const targetId = hash.replace("#comment-", "");

        // Nếu target là 1 câu trả lời đang nằm trong danh sách bị thu gọn -> mở ra trước
        const parent = comments.find((c) =>
            c.replies?.some((r) => String(r.id) === targetId)
        );
        if (parent && collapsed[parent.id] !== false) {
            setCollapsed((prev) => ({ ...prev, [parent.id]: false }));
        }

        // Đợi DOM render xong (đặc biệt là sau khi mở rộng phần trả lời) rồi mới scroll
        const timer = setTimeout(() => {
            const el = document.getElementById(`comment-${targetId}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("pd-comment--highlight");
                setTimeout(() => el.classList.remove("pd-comment--highlight"), 2000);
            }
        }, 150);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [commentsLoading, comments, location.hash]);

    /* Tym bài viết — gọi thật ForumLikeService qua memberApi, giống CommunityFeedPage */
    const togglePostLike = async () => {
        if (!post) return;
        try {
            const res = await memberApi.toggleForumPostLike(post.id);
            const data = res?.data ?? res;
            setPost((prev) => ({ ...prev, likes: data.likeCount, isLiked: data.isLiked }));
        } catch (err) {
            console.error("Không thể tym bài viết:", err);
        }
    };

    /* Tym / bỏ tym 1 bình luận — cập nhật đúng phần tử dù nó là bình luận gốc hay trả lời */
    const toggleCommentLike = async (commentId) => {
        // Optimistic update để UI phản hồi tức thì
        const applyLike = (isLiked, likeCount) =>
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === commentId) return { ...c, liked: isLiked, likes: likeCount };
                    return {
                        ...c,
                        replies: c.replies.map((r) =>
                            r.id === commentId ? { ...r, liked: isLiked, likes: likeCount } : r
                        ),
                    };
                })
            );

        try {
            const res = await memberApi.toggleForumCommentLike(commentId);
            const data = res?.data ?? res;
            applyLike(!!data.isLiked, data.likeCount ?? 0);
        } catch (err) {
            console.error("Không thể tym bình luận:", err);
        }
    };

    /* MỚI — Xác định 1 bình luận/trả lời có phải của người đang đăng nhập hay không,
       để chỉ hiện nút "Xóa" cho đúng chủ bình luận. So sánh bằng String() để
       tránh lệch kiểu dữ liệu (number vs string) giữa getMyProfile() và BE. */
    const isMine = (comment) =>
        currentUser.memberId != null &&
        comment.memberId != null &&
        String(comment.memberId) === String(currentUser.memberId);

    /* MỚI — Xóa 1 bình luận (gốc hoặc trả lời) của chính mình rồi tải lại danh sách */
    const deleteComment = async (commentId) => {
        if (!window.confirm("Xóa bình luận này?")) return;
        try {
            await memberApi.deleteForumComment(commentId);
            await loadComments();
        } catch (err) {
            console.error("Không thể xóa bình luận:", err);
        }
    };

    const toggleCollapse = (commentId) =>
        setCollapsed((prev) => ({ ...prev, [commentId]: !prev[commentId] }));

    const startReply = (commentId, authorName) => setReplyTarget({ commentId, author: authorName });
    const cancelReply = () => setReplyTarget(null);

    /* Gửi bình luận gốc hoặc trả lời — luôn gọi API thật rồi tải lại danh sách,
       đảm bảo cây bình luận (kể cả trả lời-của-trả lời) luôn khớp với BE. */
    const submitComment = async () => {
        const text = commentText.trim();
        if (!text || !post || submitting) return;

        setSubmitting(true);
        try {
            const payload = { postId: post.id, content: text };
            if (replyTarget) payload.parentCommentId = replyTarget.commentId;

            await memberApi.createForumComment(payload);

            setCommentText("");
            if (replyTarget) setCollapsed((prev) => ({ ...prev, [replyTarget.commentId]: false }));
            setReplyTarget(null);
            await loadComments();
        } catch (err) {
            console.error("Không thể gửi bình luận:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleComposerKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    };

    return (
        <div className="post-detail">
            <style>{CSS}</style>

            {/* ================= Header ================= */}
            <header className="pd-header">
                <Link to={backTarget} className="pd-header__back" aria-label="Quay lại">
                    <ArrowLeft size={20} />
                </Link>
                <span className="pd-header__title">Bài viết</span>
                <span className="pd-header__spacer" />
            </header>

            {postLoading && (
                <div className="panel" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    Đang tải bài viết...
                </div>
            )}

            {!postLoading && postError && (
                <div className="panel" style={{ textAlign: "center", color: "var(--accent)" }}>
                    {postError}
                </div>
            )}

            {!postLoading && !postError && post && (
                <>
                    {/* ================= Nội dung bài viết ================= */}
                    <article className="panel pd-post">
                        <header className="pd-post__header">
                            {post.avatar ? (
                                <img src={post.avatar} alt="" className="pd-post__avatar" />
                            ) : (
                                <div className="pd-post__avatar pd-post__avatar--initial">
                                    {getInitials(post.author)}
                                </div>
                            )}
                            <div className="pd-post__meta">
                                <div className="pd-post__author-row">
                                    <span className="pd-post__author">{post.author}</span>
                                    <span className="pd-post__tag">{post.tag}</span>
                                </div>
                                <span className="pd-post__time">{post.time}</span>
                            </div>
                            <button className="pd-post__more" aria-label="Tùy chọn">
                                <MoreHorizontal size={18} />
                            </button>
                        </header>

                        <h1 className="pd-post__title">{post.title}</h1>
                        <p className="pd-post__content">{post.content}</p>

                        {post.images.length > 0 && (
                            <div className="pd-post__images">
                                {post.images.map((src, i) => (
                                    <img key={i} src={src} alt="" />
                                ))}
                            </div>
                        )}

                        <div className="pd-post__totals">
                            <span><Heart size={14} /> {post.likes} lượt thích</span>
                            <span><MessageCircle size={14} /> {totalComments} bình luận</span>
                        </div>

                        <div className="pd-post__actions">
                            <button
                                className={"pd-action-btn" + (post.isLiked ? " is-active" : "")}
                                onClick={togglePostLike}
                            >
                                <Heart size={16} fill={post.isLiked ? "currentColor" : "none"} /> Thích
                            </button>
                            <button className="pd-action-btn" onClick={() => setReplyTarget(null)}>
                                <MessageCircle size={16} /> Bình luận
                            </button>
                            <button className="pd-action-btn pd-action-btn--icon-only" aria-label="Lưu bài viết">
                                <Bookmark size={16} />
                            </button>
                        </div>
                    </article>

                    {/* ================= Ô nhập bình luận ================= */}
                    <div className="panel pd-composer">
                        {replyTarget && (
                            <div className="pd-composer__reply-tag">
                                Đang trả lời <strong>{replyTarget.author}</strong>
                                <button aria-label="Huỷ trả lời" onClick={cancelReply}>
                                    <X size={13} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                        <div className="pd-composer__row">
                            <img src={currentUser.avatar} alt="" className="pd-composer__avatar" />
                            <textarea
                                className="pd-composer__input"
                                rows={1}
                                placeholder={replyTarget ? `Trả lời ${replyTarget.author}...` : "Viết bình luận..."}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleComposerKeyDown}
                                disabled={submitting}
                            />
                            <button
                                className="pd-composer__send"
                                aria-label="Gửi bình luận"
                                disabled={!commentText.trim() || submitting}
                                onClick={submitComment}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ================= Danh sách bình luận phân cấp ================= */}
                    <div className="panel pd-comments">
                        <h2 className="pd-comments__heading">Tất cả bình luận ({totalComments})</h2>

                        {commentsLoading && (
                            <p className="pd-comments__empty">Đang tải bình luận...</p>
                        )}

                        {!commentsLoading && commentsError && (
                            <p className="pd-comments__empty" style={{ color: "var(--accent)" }}>
                                {commentsError}
                            </p>
                        )}

                        {!commentsLoading && !commentsError && comments.length === 0 && (
                            <p className="pd-comments__empty">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
                        )}

                        {!commentsLoading && !commentsError && comments.length > 0 && (
                            <ul className="pd-comment-list">
                                {comments.map((c) => {
                                    const hasReplies = c.replies && c.replies.length > 0;
                                    const isCollapsed = collapsed[c.id] !== false;

                                    return (
                                        <li key={c.id} id={`comment-${c.id}`} className="pd-comment">
                                            {c.avatar ? (
                                                <img src={c.avatar} alt="" className="pd-comment__avatar" />
                                            ) : (
                                                <div className="pd-comment__avatar pd-post__avatar--initial">
                                                    {getInitials(c.author)}
                                                </div>
                                            )}
                                            <div className="pd-comment__body">
                                                <div className="pd-comment__bubble">
                                                    <span className="pd-comment__author">{c.author}</span>
                                                    <p className="pd-comment__text">{c.content}</p>
                                                </div>
                                                <div className="pd-comment__row-actions">
                                                    <span className="pd-comment__time">{c.time}</span>
                                                    <button
                                                        className={"pd-comment__like" + (c.liked ? " is-active" : "")}
                                                        onClick={() => toggleCommentLike(c.id)}
                                                    >
                                                        Thích{c.likes > 0 ? ` · ${c.likes}` : ""}
                                                    </button>
                                                    <button className="pd-comment__reply" onClick={() => startReply(c.id, c.author)}>
                                                        Trả lời
                                                    </button>
                                                    {isMine(c) && (
                                                        <button
                                                            className="pd-comment__delete"
                                                            onClick={() => deleteComment(c.id)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>

                                                {hasReplies && (
                                                    <button
                                                        type="button"
                                                        className="pd-comment__toggle-replies"
                                                        onClick={() => toggleCollapse(c.id)}
                                                    >
                                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                        {isCollapsed
                                                            ? `Xem ${c.replies.length} câu trả lời`
                                                            : "Ẩn câu trả lời"}
                                                    </button>
                                                )}

                                                {hasReplies && !isCollapsed && (
                                                    <ul className="pd-reply-list">
                                                        {c.replies.map((r) => (
                                                            <li key={r.id} id={`comment-${r.id}`} className="pd-reply">
                                                                <CornerDownRight size={13} className="pd-reply__corner" />
                                                                {r.avatar ? (
                                                                    <img src={r.avatar} alt="" className="pd-reply__avatar" />
                                                                ) : (
                                                                    <div className="pd-reply__avatar pd-post__avatar--initial">
                                                                        {getInitials(r.author)}
                                                                    </div>
                                                                )}
                                                                <div className="pd-reply__body">
                                                                    <div className="pd-comment__bubble pd-reply__bubble">
                                                                        <span className="pd-comment__author">
                                                                            {r.author}
                                                                            {r.replyToName && r.replyToName !== c.author && (
                                                                                <span className="pd-reply__to"> → {r.replyToName}</span>
                                                                            )}
                                                                        </span>
                                                                        <p className="pd-comment__text">{r.content}</p>
                                                                    </div>
                                                                    <div className="pd-comment__row-actions">
                                                                        <span className="pd-comment__time">{r.time}</span>
                                                                        <button
                                                                            className={"pd-comment__like" + (r.liked ? " is-active" : "")}
                                                                            onClick={() => toggleCommentLike(r.id)}
                                                                        >
                                                                            Thích{r.likes > 0 ? ` · ${r.likes}` : ""}
                                                                        </button>
                                                                        <button
                                                                            className="pd-comment__reply"
                                                                            onClick={() => startReply(r.id, r.author)}
                                                                        >
                                                                            Trả lời
                                                                        </button>
                                                                        {isMine(r) && (
                                                                            <button
                                                                                className="pd-comment__delete"
                                                                                onClick={() => deleteComment(r.id)}
                                                                            >
                                                                                Xóa
                                                                            </button>
                                                                        )}
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
/* CSS                                                                     */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --accent: #FF5722;
  --accent-start: #FF7A3D;
  --accent-end: #FF4B1F;
  --accent-soft: rgba(255, 87, 34, 0.14);
}

.post-detail { display: flex; flex-direction: column; gap: 16px; max-width: 720px; margin: 0 auto; }

.pd-header { display: flex; align-items: center; gap: 10px; padding: 4px 0 2px; }
.pd-header__back {
  width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
  color: var(--text-primary); background: var(--bg-panel-hover); flex-shrink: 0; text-decoration: none;
}
.pd-header__back:hover { background: var(--accent-soft); color: var(--accent); }
.pd-header__title { font-size: 17px; font-weight: 800; flex: 1; }
.pd-header__spacer { width: 36px; }

@media (max-width: 860px) {
  .post-detail { gap: 0; }
  .pd-header {
    position: sticky; top: 0; z-index: 20;
    background: var(--bg-app); padding: 10px 4px; margin: -8px -16px 8px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .pd-header__title { text-align: center; }
}

.pd-post { padding: 20px 22px; }
@media (max-width: 860px) {
  .pd-post { padding: 16px; border-radius: 0; border-left: none; border-right: none; }
}

.pd-post__header { display: flex; align-items: center; gap: 10px; }
.pd-post__avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.pd-post__avatar--initial {
  display: grid; place-items: center; font-size: 17px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}
.pd-post__meta { flex: 1; min-width: 0; }
.pd-post__author-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pd-post__author { font-weight: 700; font-size: 14.5px; }
.pd-post__tag {
  font-size: 11px; font-weight: 700; color: var(--accent); background: var(--accent-soft);
  padding: 2px 8px; border-radius: 999px;
}
.pd-post__time { font-size: 12px; color: var(--text-muted); }
.pd-post__more { border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: grid; place-items: center; }

.pd-post__title { font-size: 20px; font-weight: 800; margin: 16px 0 8px; line-height: 1.35; }
.pd-post__content { font-size: 14.5px; color: var(--text-secondary); line-height: 1.7; margin: 0 0 14px; white-space: pre-wrap; }

.pd-post__images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pd-post__images img { width: 100%; height: 160px; object-fit: cover; border-radius: var(--radius-md); }
@media (max-width: 480px) {
  .pd-post__images { grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .pd-post__images img { height: 92px; border-radius: var(--radius-sm); }
}

.pd-post__totals {
  display: flex; align-items: center; gap: 18px; margin-top: 16px; padding-top: 14px;
  border-top: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-secondary); flex-wrap: wrap;
}
.pd-post__totals span { display: flex; align-items: center; gap: 5px; }

.pd-post__actions { display: flex; gap: 8px; margin-top: 12px; }
.pd-action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid var(--border-subtle); background: var(--bg-panel-hover);
  color: var(--text-secondary); border-radius: var(--radius-md); padding: 10px; font-size: 13.5px;
  font-weight: 600; cursor: pointer;
}
.pd-action-btn:hover { color: var(--text-primary); }
.pd-action-btn.is-active { color: var(--accent); background: var(--accent-soft); border-color: transparent; }
.pd-action-btn--icon-only { flex: 0 0 auto; width: 42px; padding: 10px; }

.pd-composer { padding: 14px 16px; }
@media (max-width: 860px) {
  .pd-composer { border-radius: 0; border-left: none; border-right: none; position: sticky; bottom: 0; z-index: 15; }
}
.pd-composer__reply-tag {
  display: flex; align-items: center; gap: 6px; font-size: 12.5px;
  background: var(--accent-soft); color: var(--accent); border-radius: var(--radius-sm);
  padding: 6px 10px; margin-bottom: 10px; width: fit-content;
}
.pd-composer__reply-tag button {
  border: none; background: rgba(0,0,0,.12); color: inherit; width: 16px; height: 16px;
  border-radius: 50%; display: grid; place-items: center; cursor: pointer; margin-left: 2px;
}
.pd-composer__row { display: flex; align-items: flex-end; gap: 10px; }
.pd-composer__avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.pd-composer__input {
  flex: 1; resize: none; border: 1px solid var(--border-subtle); background: var(--bg-input);
  border-radius: 18px; padding: 9px 14px; color: var(--text-primary); font-size: 13.5px;
  font-family: inherit; outline: none; max-height: 120px; line-height: 1.5;
}
.pd-composer__input:focus { border-color: var(--accent); }
.pd-composer__input:disabled { opacity: .6; }
.pd-composer__send {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: #fff;
  display: grid; place-items: center; cursor: pointer;
}
.pd-composer__send:disabled { opacity: .4; cursor: not-allowed; }

.pd-comments { padding: 18px 20px 22px; }
@media (max-width: 860px) {
  .pd-comments { padding: 14px 16px 24px; border-radius: 0; border-left: none; border-right: none; }
}
.pd-comments__heading { font-size: 15px; font-weight: 800; margin: 0 0 14px; }
.pd-comments__empty { font-size: 13.5px; color: var(--text-muted); text-align: center; padding: 18px 0; }

.pd-comment-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.pd-comment { display: flex; gap: 10px; scroll-margin-top: 80px; border-radius: var(--radius-md); }
.pd-comment__avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 13px; }
.pd-comment__body { flex: 1; min-width: 0; }

.pd-comment__bubble {
  background: var(--bg-panel-hover); border-radius: var(--radius-md); padding: 9px 13px; display: inline-block; max-width: 100%;
}
.pd-comment__author { display: block; font-size: 13px; font-weight: 700; margin-bottom: 2px; }
.pd-reply__to { font-weight: 600; color: var(--text-muted); font-size: 12px; }
.pd-comment__text { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-primary); word-break: break-word; }

.pd-comment__row-actions { display: flex; align-items: center; gap: 14px; margin: 6px 2px 0; font-size: 12px; color: var(--text-muted); }
.pd-comment__time { flex-shrink: 0; }
.pd-comment__like, .pd-comment__reply {
  border: none; background: transparent; color: var(--text-muted); font-weight: 700; font-size: 12px; cursor: pointer; padding: 0;
}
.pd-comment__like:hover, .pd-comment__reply:hover { color: var(--text-primary); }
.pd-comment__like.is-active { color: var(--accent); }
.pd-comment__delete {
  border: none; background: transparent; color: var(--text-muted);
  font-weight: 700; font-size: 12px; cursor: pointer; padding: 0;
}
.pd-comment__delete:hover { color: #ff4d4d; }

.pd-comment__toggle-replies {
  display: flex; align-items: center; gap: 4px; margin: 10px 0 0 2px; border: none; background: transparent;
  color: var(--accent); font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 0;
}

.pd-reply-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.pd-reply { display: flex; align-items: flex-start; gap: 8px; padding-left: 8px; scroll-margin-top: 80px; border-radius: var(--radius-md); }
.pd-reply__corner { color: var(--text-muted); flex-shrink: 0; margin-top: 10px; }
.pd-reply__avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 11px; }
.pd-reply__body { flex: 1; min-width: 0; }
.pd-reply__bubble { padding: 8px 12px; }

/* MỚI — chớp nền khi vừa nhảy tới bình luận từ thông báo */
.pd-comment--highlight .pd-comment__bubble,
.pd-comment--highlight .pd-reply__bubble {
  animation: pd-highlight-flash 2s ease;
}
@keyframes pd-highlight-flash {
  0%   { background: var(--accent-soft); }
  100% { background: var(--bg-panel-hover); }
}

@media (max-width: 860px) {
  .pd-comment__avatar { width: 32px; height: 32px; }
  .pd-reply { padding-left: 4px; }
  .pd-reply__avatar { width: 26px; height: 26px; }
  .pd-comment-list { gap: 14px; }
}
`;