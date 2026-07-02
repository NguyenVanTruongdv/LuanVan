import {
    Bell,
    Heart,
    Home,
    Image as ImageIcon,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Repeat2,
    Send,
    Smile,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Đổi lại 2 đường dẫn import bên dưới cho khớp với vị trí thật của
 * Header / Footer trong project của bạn (ví dụ "../layout/Header").
 * Vì 2 file này chưa có trong sandbox nên khung xem trước ở đây sẽ
 * báo lỗi "module not found" — nhưng khi bạn thả ForumFeed.jsx vào
 * đúng project đã có sẵn Header/Footer thì sẽ chạy bình thường.
 *
 * LƯU Ý QUAN TRỌNG VỀ RESPONSIVE:
 * Bản trước dùng @container (container query) để đổi layout, nhưng
 * container query chỉ "nhìn thấy" chiều rộng thật nếu phần tử cha
 * (do Header/Footer bọc ngoài) có width: 100% / flex: 1 rõ ràng.
 * Nếu Header/Footer bọc component này trong 1 div không giãn hết
 * chiều ngang, container sẽ luôn bị đo hẹp -> layout tụt về bản
 * mobile dù màn hình rộng (đúng lỗi bạn gặp trong ảnh chụp).
 * Bản này đổi sang @media (dựa theo kích thước MÀN HÌNH thật) để
 * chắc chắn hoạt động đúng bất kể Header/Footer bọc kiểu gì.
 *
 * BẢN CẬP NHẬT TÔNG MÀU (theo ảnh Header/Hero bạn gửi):
 * - Nền đen tuyền giữ nguyên, đổi màu nhấn chính (nút, viền active,
 *   badge HLV...) sang cam-đỏ giống chữ "TỰ DO" / nút "Xem gói tập".
 * - Trái tim (thích) dùng riêng một màu đỏ thuần để luôn nổi bật,
 *   tách biệt với màu cam-đỏ dùng cho các hành động khác.
 * - Đã bỏ ô tìm kiếm trên thanh desktop và icon kính lúp trên thanh
 *   mobile theo yêu cầu.
 * - Icon "Hoạt động" trên thanh mobile đổi từ trái tim sang chuông
 *   thông báo, đồng bộ với chuông ở thanh desktop.
 */
import Footer from "../../component/Footer";
import Header from "../../component/Header";

// ---- Design tokens -------------------------------------------------------
const ACCENT = "#FF4620"; // cam-đỏ — hành động chính (đăng, nút, viền active), khớp tông ảnh
const ACCENT_TEAL = "#14B8A6"; // xanh ngọc — huấn luyện viên
const LIKE_RED = "#EF4444"; // đỏ riêng cho trái tim (thích)
const CURRENT_USER = "Quang"; // TODO: thay bằng user thật khi có auth

const AVATAR_COLORS = ["#FF4620", "#5B8C5A", "#A64AC9", "#D4A017", "#4A5FC1", "#14B8A6"];
const EMOJI_QUICK = ["💪", "🔥", "🏋️", "🎯", "👏", "😅"];

function avatarColor(name) {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name) {
    const parts = name.trim().split(" ");
    return parts.slice(-2).map((w) => w[0]).join("").toUpperCase();
}

function Avatar({ name, size = 40, ring = false }) {
    const core = (
        <div
            style={{
                width: size,
                height: size,
                minWidth: size,
                borderRadius: "50%",
                background: avatarColor(name),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.38,
                fontWeight: 700,
                color: "#06070a",
            }}
        >
            {initials(name)}
        </div>
    );
    if (!ring) return core;
    const pad = Math.max(2, Math.round(size * 0.06));
    return (
        <div
            style={{
                width: size + pad * 2,
                height: size + pad * 2,
                borderRadius: "50%",
                padding: pad,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_TEAL})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {core}
        </div>
    );
}

// ---- Seed data -------------------------------------------------------------
const seedPosts = [
    {
        id: 1,
        user: { name: "Minh Trường", badge: "HLV" },
        time: "2 giờ",
        text: "PR mới: Deadlift 140kg x 3! 3 tháng trước mình còn kéo không nổi thanh không tạ đúng form. Cứ từ từ mà lên anh em ơi 💪",
        image: null,
        likes: 128,
        liked: false,
        comments: 14,
        reposts: 6,
        replies: [{ id: 101, user: { name: "Hải Đăng" }, time: "1 giờ", text: "Quá đỉnh! Cho em xin giáo án với ạ" }],
    },
    {
        id: 2,
        user: { name: "Thu Hà" },
        time: "5 giờ",
        text: "Có ai tập ở chi nhánh Q7 buổi tối không, rủ tập cùng cho có động lực 🙌",
        image: null,
        likes: 34,
        liked: false,
        comments: 9,
        reposts: 1,
        replies: [],
    },
    {
        id: 3,
        user: { name: "Quốc Bảo", badge: "HLV" },
        time: "1 ngày",
        text: "Mẹo nhỏ: trước khi squat nặng, dành 5 phút mobilize hông + mắt cá. Giảm hẳn nguy cơ chấn thương mà form cũng đẹp hơn nhiều.",
        image: null,
        likes: 256,
        liked: true,
        comments: 22,
        reposts: 18,
        replies: [{ id: 301, user: { name: "Ngọc Anh" }, time: "20 giờ", text: "Cảm ơn anh, đúng vấn đề em đang gặp luôn" }],
    },
    {
        id: 4,
        user: { name: "Anh Tuấn" },
        time: "1 ngày",
        text: "Tự tập không PT vẫn xuống được 8kg trong 2 tháng nhờ theo dõi số liệu ở mục Thống kê. Motivation cả app luôn 🔥",
        image: null,
        likes: 87,
        liked: false,
        comments: 11,
        reposts: 3,
        replies: [],
    },
];

const newPostsPool = [
    {
        user: { name: "Diệu Linh" },
        text: "Vừa hoàn thành buổi HIIT 30 phút đầu tiên, tim đập như trống hội nhưng sướng ghê 😆",
    },
    {
        user: { name: "Hoàng Long", badge: "HLV" },
        text: "Nhắc nhở: uống đủ nước trước - trong - sau buổi tập nhé anh em, đừng đợi khát mới uống.",
    },
    {
        user: { name: "Kim Ngân" },
        text: "Tháng này tăng được 3kg cơ theo InBody, cảm ơn team đã động viên mỗi ngày 🙏",
    },
];

const seedNotifications = [
    { id: 1, user: "Hải Đăng", text: "đã bình luận vào bài viết của bạn: \"Quá đỉnh! Cho em xin giáo án với ạ\"", time: "1 giờ", read: false },
    { id: 2, user: "Ngọc Anh", text: "đã bình luận vào bài viết của bạn", time: "20 giờ", read: false },
    { id: 3, user: "Thu Hà", text: "đã thích bài viết của bạn", time: "1 ngày", read: true },
];

// ---- Nav bars ---------------------------------------------------------------
// Nội dung danh sách thông báo dùng chung cho cả chuông desktop và chuông mobile
function NotificationList({ notifications }) {
    return (
        <>
            <div className="notif-dropdown-title">Thông báo</div>
            {notifications.length === 0 ? (
                <div className="notif-empty">Chưa có thông báo nào</div>
            ) : (
                notifications.map((n) => (
                    <div key={n.id} className={`notif-row ${n.read ? "" : "unread"}`}>
                        <Avatar name={n.user} size={32} />
                        <div className="notif-text-col">
                            <span className="notif-text">
                                <strong>{n.user}</strong> {n.text}
                            </span>
                            <span className="notif-time">{n.time}</span>
                        </div>
                    </div>
                ))
            )}
        </>
    );
}

// Desktop: thanh trên kiểu Facebook (logo + Home + avatar + chuông), đã bỏ ô tìm kiếm
function NotificationBell({ notifications, onMarkAllRead }) {
    const [open, setOpen] = useState(false);
    const unreadCount = notifications.filter((n) => !n.read).length;

    function toggle() {
        setOpen((v) => {
            const next = !v;
            if (next) onMarkAllRead();
            return next;
        });
    }

    return (
        <div className="notif-wrap">
            <button className="topnav-home-btn" onClick={toggle} title="Thông báo" aria-label="Thông báo">
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <NotificationList notifications={notifications} />
                </div>
            )}
        </div>
    );
}

function TopNavBar({ onOpenProfile, onGoHome, notifications, onMarkAllRead }) {
    return (
        <div className="topnav">
            <div className="topnav-inner">
                <div className="topnav-identity">
                    <button className="topnav-profile-btn" onClick={onOpenProfile} title="Trang cá nhân" aria-label="Trang cá nhân">
                        <Avatar name={CURRENT_USER} size={36} />
                        <span className="topnav-profile-name">{CURRENT_USER}</span>
                    </button>

                    <button className="topnav-home-btn" onClick={onGoHome} title="Về đầu trang & tải bài mới" aria-label="Về đầu trang & tải bài mới">
                        <Home size={20} />
                    </button>
                </div>

                {/* Đẩy chuông sát mép phải, đối xứng với cụm avatar/Quang bên
                    trái (topnav-inner có padding trái/phải bằng nhau nên 2 bên
                    sẽ cân đối tự động). Ô tìm kiếm đã được bỏ theo yêu cầu. */}
                <div className="topnav-bell-slot">
                    <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />
                </div>
            </div>
        </div>
    );
}

// Mobile: thanh dưới cố định kiểu Threads (Home / Đăng / Thông báo / Cá nhân)
// Đã bỏ icon kính lúp và đổi icon trái tim thành chuông thông báo.
function BottomNavBar({ onOpenProfile, onCompose, notifications, onMarkAllRead }) {
    const [notifOpen, setNotifOpen] = useState(false);
    const unreadCount = notifications.filter((n) => !n.read).length;

    function toggleNotif() {
        setNotifOpen((v) => {
            const next = !v;
            if (next) onMarkAllRead();
            return next;
        });
    }

    return (
        <>
            {notifOpen && (
                <div className="mobile-notif-sheet">
                    <NotificationList notifications={notifications} />
                </div>
            )}

            <div className="bottomnav">
                <button
                    className="bottomnav-btn active"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    aria-label="Trang chủ"
                >
                    <Home size={24} />
                </button>
                <button className="bottomnav-btn" onClick={onCompose} aria-label="Đăng bài">
                    <Plus size={24} />
                </button>
                <button className="bottomnav-btn bottomnav-notif-wrap" onClick={toggleNotif} aria-label="Thông báo">
                    <Bell size={24} />
                    {unreadCount > 0 && <span className="notif-dot bottomnav-notif-dot">{unreadCount}</span>}
                </button>
                <button className="bottomnav-btn bottomnav-avatar" onClick={onOpenProfile} aria-label="Trang cá nhân">
                    <Avatar name={CURRENT_USER} size={26} />
                </button>
            </div>
        </>
    );
}

function Post({ post, onToggleLike, replyOpen, onOpenReply, replyDraft, onReplyDraftChange, onSubmitReply }) {
    const hasReplies = post.replies.length > 0;
    const isCoach = post.user.badge === "HLV";

    return (
        <div className="post">
            <div className="post-row">
                <div className="post-avatar-col">
                    <Avatar name={post.user.name} ring={isCoach} />
                    {(hasReplies || replyOpen) && <div className="thread-line" />}
                </div>

                <div className="post-body">
                    <div className="post-header">
                        <span className="post-name">{post.user.name}</span>
                        {post.user.badge && <span className="badge">{post.user.badge}</span>}
                        <span className="dot">·</span>
                        <span className="post-time">{post.time}</span>
                        <button className="more-icon" aria-label="Thêm tùy chọn">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    <p className="post-text">{post.text}</p>

                    {post.image && <img src={post.image} alt="" className="post-image" />}

                    <div className="action-row">
                        <button className="action-btn" onClick={() => onToggleLike(post.id)} aria-label="Thích">
                            <Heart size={18} fill={post.liked ? LIKE_RED : "none"} color={post.liked ? LIKE_RED : "#9297a3"} />
                            <span style={{ color: post.liked ? LIKE_RED : "#9297a3" }}>{post.likes}</span>
                        </button>
                        <button className={`action-btn ${replyOpen ? "active" : ""}`} onClick={() => onOpenReply(post.id)} aria-label="Bình luận">
                            <MessageCircle size={18} color={replyOpen ? ACCENT : "#9297a3"} />
                            <span style={{ color: replyOpen ? ACCENT : "#9297a3" }}>{post.comments}</span>
                        </button>
                        <button className="action-btn" aria-label="Chia sẻ lại">
                            <Repeat2 size={18} color="#9297a3" />
                            <span>{post.reposts}</span>
                        </button>
                        <button className="action-btn" aria-label="Gửi">
                            <Send size={17} color="#9297a3" />
                        </button>
                    </div>

                    {hasReplies && (
                        <div className="reply-preview">
                            <Avatar name={post.replies[0].user.name} size={26} />
                            <div className="reply-text-col">
                                <span className="reply-name">
                                    {post.replies[0].user.name} <span className="dot">·</span> <span className="post-time">{post.replies[0].time}</span>
                                </span>
                                <p className="post-text small">{post.replies[0].text}</p>
                            </div>
                        </div>
                    )}
                    {post.replies.length > 1 && <div className="more-replies">Xem thêm {post.replies.length - 1} bình luận</div>}

                    {replyOpen && (
                        <div className="inline-reply">
                            <Avatar name={CURRENT_USER} size={26} />
                            <div className="inline-reply-input">
                                <textarea
                                    autoFocus
                                    placeholder={`Trả lời ${post.user.name}...`}
                                    value={replyDraft}
                                    onChange={(e) => onReplyDraftChange(e.target.value)}
                                    rows={1}
                                />
                                <button className="send-icon-btn" disabled={!replyDraft.trim()} onClick={() => onSubmitReply(post.id)} aria-label="Gửi bình luận">
                                    <Send size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Composer({ onSubmit, openSignal }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Cho phép BottomNavBar (nút "+") mở composer từ xa: mỗi lần openSignal
    // tăng lên (khác 0), composer sẽ tự mở ra.
    useEffect(() => {
        if (openSignal) setOpen(true);
    }, [openSignal]);

    function handleImagePick(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setImagePreview(URL.createObjectURL(file));
    }

    function reset() {
        setDraft("");
        setImagePreview(null);
        setEmojiOpen(false);
        setOpen(false);
    }

    function submit() {
        if (!draft.trim() && !imagePreview) return;
        onSubmit({ text: draft.trim(), image: imagePreview });
        reset();
    }

    return (
        <div className="composer-wrap">
            {!open ? (
                <div className="composer-collapsed" onClick={() => setOpen(true)}>
                    <Avatar name={CURRENT_USER} size={38} />
                    <span>{CURRENT_USER} ơi, bạn đang tập gì thế?</span>
                    <div className="composer-collapsed-icons">
                        <ImageIcon size={18} color={ACCENT_TEAL} />
                    </div>
                </div>
            ) : (
                <div className="composer-open">
                    <div className="composer-open-row">
                        <Avatar name={CURRENT_USER} size={38} />
                        <textarea
                            autoFocus
                            placeholder="Chia sẻ buổi tập, thành tích hay câu hỏi của bạn..."
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                    </div>

                    {imagePreview && (
                        <div className="image-preview-wrap">
                            <img src={imagePreview} alt="Ảnh đính kèm" />
                            <button className="image-remove-btn" onClick={() => setImagePreview(null)} aria-label="Xóa ảnh">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {emojiOpen && (
                        <div className="emoji-row">
                            {EMOJI_QUICK.map((e) => (
                                <button key={e} className="emoji-btn" onClick={() => setDraft((d) => d + e)}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="composer-actions">
                        <div className="composer-actions-left">
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
                            <button className="icon-pill" onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm ảnh">
                                <ImageIcon size={16} color={ACCENT_TEAL} />
                            </button>
                            <button className={`icon-pill ${emojiOpen ? "active" : ""}`} onClick={() => setEmojiOpen((v) => !v)} aria-label="Chèn biểu tượng cảm xúc">
                                <Smile size={16} color={ACCENT} />
                            </button>
                        </div>

                        <div className="composer-actions-right">
                            <button className="btn-ghost" onClick={reset}>
                                Hủy
                            </button>
                            <button className="btn-accent" disabled={!draft.trim() && !imagePreview} onClick={submit}>
                                Đăng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- Main page --------------------------------------------------------------
export default function ForumFeed() {
    const [posts, setPosts] = useState(seedPosts);
    const [openReplyId, setOpenReplyId] = useState(null);
    const [replyDraft, setReplyDraft] = useState("");
    const [composeSignal, setComposeSignal] = useState(0);
    const [newPostIndex, setNewPostIndex] = useState(0);
    const [notifications, setNotifications] = useState(seedNotifications);

    function markAllNotificationsRead() {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }

    function toggleLike(id) {
        setPosts(posts.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p)));
    }

    function addPost({ text, image }) {
        const newPost = {
            id: Date.now(),
            user: { name: CURRENT_USER },
            time: "Vừa xong",
            text,
            image,
            likes: 0,
            liked: false,
            comments: 0,
            reposts: 0,
            replies: [],
        };
        setPosts([newPost, ...posts]);
    }

    function openReply(id) {
        setOpenReplyId(openReplyId === id ? null : id);
        setReplyDraft("");
    }

    function submitReply(id) {
        if (!replyDraft.trim()) return;
        setPosts(
            posts.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        comments: p.comments + 1,
                        replies: [...p.replies, { id: Date.now(), user: { name: CURRENT_USER }, time: "Vừa xong", text: replyDraft.trim() }],
                    }
                    : p
            )
        );
        setReplyDraft("");
        setOpenReplyId(null);
    }

    function handleCompose() {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setComposeSignal((c) => c + 1);
    }

    function handleGoHome() {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // TODO: thay đoạn giả lập này bằng gọi API lấy bài viết mới thật.
        const template = newPostsPool[newPostIndex % newPostsPool.length];
        const newPost = {
            id: Date.now(),
            user: template.user,
            time: "Vừa xong",
            text: template.text,
            image: null,
            likes: 0,
            liked: false,
            comments: 0,
            reposts: 0,
            replies: [],
        };
        setPosts((prev) => [newPost, ...prev]);
        setNewPostIndex((i) => i + 1);
    }

    return (
        <>
            <Header />

            <div className="forum-root">
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

          .forum-root {
            background: #08090b;
            min-height: 100vh;
            width: 100%;
            color: #f5f6f8;
            font-family: 'Inter', system-ui, sans-serif;
            padding-bottom: 76px; /* chừa chỗ cho bottomnav trên mobile */
            box-sizing: border-box;
          }
          .forum-root *, .forum-root *::before, .forum-root *::after { box-sizing: border-box; }
          .forum-root button { font-family: inherit; }
          .forum-root textarea:focus, .forum-root button:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
          .forum-root input:focus { outline: none; }

          /* ============== DESKTOP TOP NAV (kiểu Facebook) ============== */
          .topnav {
            display: none; /* mặc định ẩn, chỉ hiện ở desktop */
            /* Thanh này "nổi lên" nhưng phải nằm NGAY DƯỚI Header thật của
               web (Trang Chủ / Gói tập / .../ Cộng Đồng), không đè lên nó.
               Vì không biết chiều cao thật của Header đó, mình cho sticky
               cách đỉnh màn hình một khoảng = --site-header-height. Bạn
               chỉnh số px này bằng đúng chiều cao Header thật (đo bằng
               DevTools) để 2 thanh luôn dính khít nhau khi cuộn trang. */
            --site-header-height: 62px;
            position: sticky; top: var(--site-header-height); z-index: 30;
            background: transparent;
            padding: 0 20px 6px;
          }
          .topnav-inner {
            position: relative;
            max-width: 1120px; margin: 0 auto; padding: 10px 20px;
            display: flex; align-items: center; gap: 16px;
            background: linear-gradient(180deg, #14161c, #101216);
            border: 1px solid #262a33;
            border-radius: 0 0 18px 18px;
            box-shadow: 0 10px 28px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.03) inset;
          }
          .topnav-identity { display: flex; align-items: center; gap: 6px; }
          /* Ô tìm kiếm đã bỏ, chuông đẩy sát mép phải để cân đối với cụm
             avatar/Quang bên trái. */
          .topnav-bell-slot {
            margin-left: auto;
            display: flex; align-items: center;
          }
          .topnav-profile-btn {
            display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer;
            padding: 4px 12px 4px 4px; border-radius: 999px; transition: background .15s;
          }
          .topnav-profile-btn:hover { background: #14161b; }
          .topnav-profile-name { font-size: 14px; font-weight: 700; color: #e6e7eb; white-space: nowrap; font-family: 'Sora', sans-serif; line-height: 1; }
          .topnav-home-btn {
            display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
            background: none; border: none; color: ${ACCENT}; cursor: pointer; border-radius: 10px; transition: background .15s;
          }
          .topnav-home-btn:hover { background: #14161b; }
          .notif-wrap { position: relative; }
          .notif-dot {
            position: absolute; top: 2px; right: 2px; min-width: 15px; height: 15px; padding: 0 3px;
            border-radius: 999px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
            display: flex; align-items: center; justify-content: center; line-height: 1;
          }
          .notif-dropdown {
            position: absolute; top: calc(100% + 10px); right: 0; width: 320px; z-index: 40;
            background: #111318; border: 1px solid #23262e; border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5); overflow: hidden;
          }
          .notif-dropdown-title { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px; padding: 14px 16px; border-bottom: 1px solid #1c1e24; }
          .notif-empty { padding: 20px 16px; color: #6c7280; font-size: 13px; text-align: center; }
          .notif-row { display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #16181e; }
          .notif-row:last-child { border-bottom: none; }
          .notif-row.unread { background: rgba(255,70,32,0.07); }
          .notif-text-col { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
          .notif-text { font-size: 13px; color: #d0d2d9; line-height: 1.4; }
          .notif-text strong { color: #f5f6f8; font-weight: 700; }
          .notif-time { font-size: 11.5px; color: #6c7280; }

          /* ============== MOBILE BOTTOM NAV (kiểu Threads) ============== */
          .bottomnav {
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
            display: flex; align-items: center; justify-content: space-around;
            background: rgba(8,9,11,0.96); backdrop-filter: blur(10px);
            border-top: 1px solid #1c1e24;
            padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
          }
          .bottomnav-btn {
            background: none; border: none; color: #9297a3; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            padding: 8px 18px; border-radius: 10px; transition: background .15s, color .15s;
          }
          .bottomnav-btn:hover { background: #14161b; }
          .bottomnav-btn.active { color: #f5f6f8; }
          .bottomnav-avatar { padding: 4px 14px; }
          .bottomnav-notif-wrap { position: relative; }
          .bottomnav-notif-dot { top: 2px; right: 8px; }

          .mobile-notif-sheet {
            position: fixed; left: 10px; right: 10px; bottom: 74px; z-index: 35;
            background: #111318; border: 1px solid #23262e; border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.55); overflow: hidden; max-height: 60vh; overflow-y: auto;
          }

          /* ============== LAYOUT ============== */
          /* Không còn sidebar trái/phải nên chỉ còn 1 cột nội dung, nới
             chiều rộng tối đa lên để bài viết không bị hẹp/ngắn. */
          .layout { max-width: 900px; margin: 0 auto; padding: 16px; width: 100%; }
          .main-col { max-width: 720px; margin: 0 auto; width: 100%; }

          @media (min-width: 760px) {
            .forum-root { padding-bottom: 0; }
            .topnav { display: block; }
            .bottomnav { display: none; }
            .mobile-notif-sheet { display: none; }
            .layout { padding-top: 24px; padding-left: 24px; padding-right: 24px; }
          }

          /* composer */
          .composer-wrap { margin-top: 4px; margin-bottom: 18px; }
          .composer-collapsed {
            display: flex; align-items: center; gap: 12px;
            background: #111318; border: 1px solid #1e2129; border-radius: 999px;
            padding: 10px 14px; cursor: text; transition: border-color .15s;
          }
          .composer-collapsed:hover { border-color: #2c303a; }
          .composer-collapsed span { flex: 1; color: #7d8290; font-size: 14px; }
          .composer-collapsed-icons { display: flex; }
          .composer-open { background: #111318; border: 1px solid #1e2129; border-radius: 18px; padding: 16px; }
          .composer-open-row { display: flex; gap: 12px; }
          .composer-open textarea {
            flex: 1; background: transparent; border: none; color: #f5f6f8;
            font-size: 15px; resize: none; min-height: 64px; font-family: inherit; line-height: 1.5;
          }
          .composer-open textarea::placeholder { color: #636874; }

          .image-preview-wrap { position: relative; margin-top: 10px; margin-left: 50px; }
          .image-preview-wrap img { width: 100%; max-height: 320px; object-fit: cover; border-radius: 14px; display: block; }
          .image-remove-btn {
            position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%;
            background: rgba(0,0,0,0.65); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
          }

          .emoji-row { display: flex; gap: 6px; margin: 10px 0 0 50px; }
          .emoji-btn { background: #181a20; border: 1px solid #23262e; border-radius: 10px; font-size: 17px; padding: 4px 8px; cursor: pointer; }
          .emoji-btn:hover { border-color: ${ACCENT}; }

          .composer-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #1c1e24; }
          .composer-actions-left { display: flex; gap: 8px; }
          .icon-pill { width: 34px; height: 34px; border-radius: 10px; background: transparent; border: 1px solid #23262e; display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .icon-pill:hover, .icon-pill.active { background: #181a20; }
          .composer-actions-right { display: flex; gap: 10px; }
          .btn-ghost { padding: 7px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; background: transparent; color: #b5b8c1; border: 1px solid #262a33; cursor: pointer; }
          .btn-accent { padding: 7px 18px; border-radius: 999px; font-size: 13px; font-weight: 700; background: ${ACCENT}; color: #fff; border: none; cursor: pointer; }
          .btn-accent:disabled { background: #1c2431; color: #4d5563; cursor: default; }

          /* feed */
          .feed { display: flex; flex-direction: column; gap: 10px; }
          .post { background: #0c0d10; border: 1px solid #1a1c22; border-radius: 16px; padding: 16px; transition: border-color .15s; }
          .post:hover { border-color: #23262e; }
          .post-row { display: flex; gap: 12px; }
          .post-avatar-col { display: flex; flex-direction: column; align-items: center; }
          .thread-line { width: 2px; flex: 1; background: linear-gradient(180deg, #23262e, transparent); margin-top: 6px; min-height: 20px; }
          .post-body { flex: 1; min-width: 0; }
          .post-header { display: flex; align-items: center; gap: 6px; }
          .post-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14.5px; }
          .badge { font-size: 10.5px; font-weight: 700; color: ${ACCENT_TEAL}; border: 1px solid rgba(20,184,166,0.4); background: rgba(20,184,166,0.08); border-radius: 5px; padding: 1px 6px; }
          .dot { color: #4b4f5a; font-size: 13px; }
          .post-time { color: #6c7280; font-size: 13px; }
          .more-icon { margin-left: auto; background: none; border: none; color: #5a5f6b; cursor: pointer; display: flex; padding: 2px; }
          .more-icon:hover { color: #9297a3; }
          .post-text { margin: 6px 0 10px; font-size: 14.5px; line-height: 1.55; color: #e6e7eb; white-space: pre-line; }
          .post-text.small { margin: 0; font-size: 14px; color: #cfd1d8; }
          .post-image { width: 100%; max-height: 420px; object-fit: cover; border-radius: 14px; display: block; margin: 4px 0 10px; }
          .action-row { display: flex; align-items: center; gap: 22px; }
          .action-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: #9297a3; font-size: 13px; padding: 4px 0; }
          .action-btn.active { color: ${ACCENT}; }
          .reply-preview { display: flex; gap: 10px; margin-top: 12px; }
          .reply-text-col { flex: 1; }
          .reply-name { font-size: 13px; font-weight: 600; color: #d0d2d9; }
          .more-replies { margin: 8px 0 0 36px; font-size: 13px; color: #6c7280; cursor: pointer; }
          .more-replies:hover { color: ${ACCENT}; }
          .inline-reply { display: flex; gap: 10px; margin-top: 12px; align-items: flex-start; }
          .inline-reply-input { flex: 1; display: flex; align-items: flex-end; gap: 8px; background: #131519; border: 1px solid #23262e; border-radius: 12px; padding: 8px 10px; }
          .inline-reply-input textarea { flex: 1; background: transparent; border: none; color: #f5f6f8; font-size: 13.5px; resize: none; font-family: inherit; min-height: 20px; }
          .inline-reply-input textarea::placeholder { color: #636874; }
          .send-icon-btn { width: 30px; height: 30px; min-width: 30px; border-radius: 50%; background: ${ACCENT}; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
          .send-icon-btn:disabled { background: #1c2431; color: #4d5563; cursor: default; }
        `}</style>

                <TopNavBar
                    onOpenProfile={() => console.log("Mở trang cá nhân")}
                    onGoHome={handleGoHome}
                    notifications={notifications}
                    onMarkAllRead={markAllNotificationsRead}
                />

                <div className="layout">
                    <div className="main-col">
                        <Composer onSubmit={addPost} openSignal={composeSignal} />

                        <div className="feed">
                            {posts.map((post) => (
                                <Post
                                    key={post.id}
                                    post={post}
                                    onToggleLike={toggleLike}
                                    replyOpen={openReplyId === post.id}
                                    onOpenReply={openReply}
                                    replyDraft={replyDraft}
                                    onReplyDraftChange={setReplyDraft}
                                    onSubmitReply={submitReply}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <BottomNavBar
                    onOpenProfile={() => console.log("Mở trang cá nhân")}
                    onCompose={handleCompose}
                    notifications={notifications}
                    onMarkAllRead={markAllNotificationsRead}
                />
            </div>

            <Footer />
        </>
    );
}