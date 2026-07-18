import {
    Apple,
    Award,
    Bell,
    CheckCheck,
    Clock,
    Dumbbell,
    FileText,
    Flame,
    Heart,
    HelpCircle,
    Home,
    MessageCircle,
    Package,
    Plus,
    Sparkles,
    Star,
    TrendingDown,
    Trophy,
    Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import memberApi from "../../../api/memberApi";
/* npm install lucide-react
   Bộ icon 1 màu (theo currentColor), thay cho emoji nhiều màu — nhìn gọn
   và đồng bộ với tông màu tối/cam-đỏ của giao diện thay vì "màu mè". */

/* ============================================================================
   WE FIT GYM — Layout (1 file duy nhất: header + 2 sidebar + Outlet + CSS)
   ----------------------------------------------------------------------------
   CẬP NHẬT MỚI:

   1) Danh mục (Chủ đề): load từ ForumCategoryService.GetAllAsync().

   2) Top thành viên: ForumPostService.GetTopMembersAsync(range, top) trả về
      TopMemberDto { memberId, memberName, memberAvatar, postCount, rank }.
      Có avatar thật (S3), fallback chữ cái đầu nếu null/lỗi ảnh.

   3) Thông báo: ForumNotificationService — bell hiển thị badge = unreadCount,
      bấm chuông mở dropdown load danh sách, bấm vào 1 thông báo sẽ đánh dấu
      đã đọc + điều hướng tới bài viết/bình luận tương ứng.

   4) Thống kê cộng đồng: GET /api/ForumPost/stats -> ForumStatsDto
      { totalMembers, totalPosts, totalComments, totalLikes }.

   5) Bộ lọc dùng chung style với "Chủ đề" (topic-btn) cho đồng bộ.

   6) Avatar cá nhân ở header: GET /api/member/me -> MemberProfileDto
      { memberId, fullName, avatar }. Avatar lấy từ FaceDatum.ProfileImage
      (S3), nếu null hoặc load ảnh lỗi thì fallback về chữ cái đầu tên thay
      vì để icon vỡ.

   7) Bài viết nổi bật: GET /api/ForumPost/featured?top=3 -> trả về
      List<ForumPostDto> thật (không còn mock FEATURED_POSTS). Ưu tiên nhiều
      lượt thích -> nhiều bình luận -> mới nhất, trong 30 ngày gần đây.

   8) Ẩn thanh cuộn (scrollbar) trên toàn bộ vùng cuộn (sidebar trái,
      sidebar phải, nội dung chính, dropdown thông báo, và toàn trang ở
      mobile) nhưng VẪN CUỘN ĐƯỢC BÌNH THƯỜNG bằng chuột/trackpad/vuốt.
      Tổng chiều cao layout luôn = 100% chiều cao màn hình (100vh/100dvh).

   9) MỚI — Avatar cá nhân ở header (desktop) giờ bấm vào sẽ điều hướng
      tới trang cá nhân "/forum/profile" (bọc trong <button> + navigate()).

   10) MỚI — Bottom nav mobile đổi lại còn 3 mục theo yêu cầu:
       - "Trang chủ": bấm vào khi ĐANG Ở "/" thì reload lại trang thật
         (window.location.reload()) thay vì không làm gì; nếu đang ở trang
         khác thì điều hướng về "/" như bình thường.
       - "Thông báo" (chuông) bị XOÁ khỏi bottom nav, thay bằng nút "+"
         (icon Plus) — bấm vào sẽ điều hướng về "/" kèm
         state.openComposer = true để CommunityFeedPage tự mở overlay
         "Tạo bài viết" (xem useEffect đọc location.state trong trang đó).
       - "Tôi": điều hướng tới "/forum/profile" (đồng bộ với avatar desktop).

   11) MỚI — Làm đẹp lại dropdown "Tuần này / Tháng này / Tất cả" (range-select)
       ở card "Top thành viên": bỏ giao diện <select> mặc định của trình
       duyệt (appearance: none), thêm mũi tên chevron riêng, bo tròn dạng
       pill, đổi màu khi hover/focus, và style lại danh sách option cho
       đồng bộ theme tối/cam-đỏ của toàn app.

   Responsive:
   - Desktop (>1180px): 3 cột — trái 272px | nội dung | phải 320px
   - Tablet (861–1180px): ẩn cột phải
   - Mobile (<=860px): ẩn 2 sidebar tĩnh, HEADER VẪN HIỂN THỊ kèm nút quay
     về trang chủ bên trái logo, hiện bottom nav cố định chỉ còn 3 mục:
     Trang chủ / Tạo bài viết (+) / Tôi.

   Yêu cầu: npm install react-router-dom lucide-react
   ============================================================================ */

/* Tra icon lucide theo field `icon` (string) mà admin nhập khi tạo danh mục.
   Key nên viết kebab-case, ví dụ: "dumbbell", "trending-down", "help-circle". */
const ICON_MAP = {
    dumbbell: Dumbbell,
    apple: Apple,
    "trending-down": TrendingDown,
    flame: Flame,
    package: Package,
    "help-circle": HelpCircle,
    award: Award,
    home: Home,
    users: Users,
    heart: Heart,
    star: Star,
    trophy: Trophy,
    sparkles: Sparkles,
    clock: Clock,
    bell: Bell,
    "file-text": FileText,
    "message-circle": MessageCircle,
};
/* Nếu field `icon` trống hoặc không khớp ICON_MAP thì xoay vòng qua đây */
const FALLBACK_ICONS = [Dumbbell, Apple, TrendingDown, Flame, Package, HelpCircle, Award];

function resolveCategoryIcon(iconKey, fallbackIndex) {
    if (iconKey) {
        const normalized = String(iconKey).trim().toLowerCase();
        if (ICON_MAP[normalized]) return ICON_MAP[normalized];
    }
    return FALLBACK_ICONS[fallbackIndex % FALLBACK_ICONS.length];
}

/* Avatar chữ cái đầu — dùng khi không có ảnh đại diện hoặc ảnh lỗi.
   Lấy chữ cái đầu của TỪ CUỐI trong tên (kiểu VN: "Nguyễn Văn A" -> "A"). */
function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || "?").charAt(0).toUpperCase();
}

/* Định dạng thời gian tương đối kiểu "5 phút trước", "2 giờ trước"... cho thông báo */
function formatRelativeTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN");
}

/* Định dạng số lượt thích rút gọn kiểu "1.2K" cho bài viết nổi bật */
function formatCompactNumber(n) {
    const num = Number(n) || 0;
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(num);
}

/* Nội dung hiển thị cho từng loại thông báo (Like / Comment / Reply...) */
function getNotificationText(n) {
    switch (n.notifyType) {
        case "Like":
            return "đã thích bài viết của bạn";
        case "Comment":
            return "đã bình luận về bài viết của bạn";
        case "Reply":
            return "đã trả lời bình luận của bạn";
        default:
            return "đã tương tác với bạn";
    }
}

const FILTERS = [
    { key: "newest", label: "Mới nhất", icon: Clock },
    { key: "featured", label: "Nổi bật", icon: Sparkles },
    { key: "most-commented", label: "Nhiều bình luận", icon: MessageCircle },
    { key: "most-liked", label: "Nhiều lượt thích", icon: Heart },
];

/* Bottom nav mobile — 3 mục: Trang chủ / Tạo bài viết (+) / Tôi.
   "isHome" và "isCompose" đánh dấu 2 mục có xử lý đặc biệt (không phải
   NavLink điều hướng đơn thuần) khi render bên dưới. */
const NAV_ITEMS = [
    { key: "home", to: "/", label: "Trang chủ", icon: Home, isHome: true },
    { key: "compose", label: "Tạo bài viết", icon: Plus, isCompose: true },
    { key: "profile", to: "/forum/profile", label: "Tôi", icon: Users },
];

const RANK_COLOR = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };

/* ---------------------------------------------------------------------- */
/* Component chính                                                        */
/* ---------------------------------------------------------------------- */

export default function Layout() {
    const navigate = useNavigate();

    /* Hồ sơ cá nhân (avatar thật ở header) — load từ MemberService.GetMyProfileAsync() */
    const [myProfile, setMyProfile] = useState(null);

    /* Danh mục (chủ đề) — load từ ForumCategoryService.GetAllAsync() */
    const [apiCategories, setApiCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    /* activeTopic/activeFilter được CHIA SẺ với trang con qua Outlet context */
    const [activeTopic, setActiveTopic] = useState("all");
    const [activeFilter, setActiveFilter] = useState("newest");

    /* Top thành viên — load từ ForumPostService.GetTopMembersAsync(range) */
    const [topMembers, setTopMembers] = useState([]);
    const [membersRange, setMembersRange] = useState("week"); // week | month | all
    const [membersLoading, setMembersLoading] = useState(true);

    /* Bài viết nổi bật — load từ ForumPostService.GetFeaturedPostsAsync() */
    const [featuredPosts, setFeaturedPosts] = useState([]);
    const [featuredLoading, setFeaturedLoading] = useState(true);

    /* Thống kê cộng đồng — load từ ForumPostService.GetCommunityStatsAsync() */
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    /* Thông báo — badge số chưa đọc + dropdown danh sách */
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef(null);

    /* Hồ sơ cá nhân (avatar header) */
    useEffect(() => {
        let mounted = true;
        memberApi
            .getMyProfile()
            .then((res) => {
                if (!mounted) return;
                const data = res?.data ?? res ?? {};
                setMyProfile({
                    fullName: data.fullName ?? "",
                    avatar: data.avatar || null,
                });
            })
            .catch((err) => console.error("Không thể tải hồ sơ cá nhân:", err));
        return () => {
            mounted = false;
        };
    }, []);

    /* Danh mục */
    useEffect(() => {
        let mounted = true;
        setCategoriesLoading(true);
        memberApi
            .getForumCategories()
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res ?? [];
                const mapped = raw.map((c, i) => ({
                    key: String(c.categoryId),
                    label: c.categoryName,
                    count: c.postCount ?? 0,
                    icon: resolveCategoryIcon(c.icon, i),
                }));
                setApiCategories(mapped);
            })
            .catch((err) => {
                console.error("Không thể tải danh mục diễn đàn:", err);
                setApiCategories([]);
            })
            .finally(() => mounted && setCategoriesLoading(false));
        return () => {
            mounted = false;
        };
    }, []);

    /* Top thành viên */
    useEffect(() => {
        let mounted = true;
        setMembersLoading(true);
        memberApi
            .getForumTopMembers(membersRange)
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res ?? [];
                const list = raw.map((m) => ({
                    id: m.memberId,
                    name: m.memberName,
                    avatar: m.memberAvatar || null,
                    postCount: m.postCount ?? 0,
                    rank: m.rank,
                }));
                setTopMembers(list);
            })
            .catch((err) => {
                console.error("Không thể tải top thành viên:", err);
                setTopMembers([]);
            })
            .finally(() => mounted && setMembersLoading(false));
        return () => {
            mounted = false;
        };
    }, [membersRange]);

    /* Bài viết nổi bật */
    useEffect(() => {
        let mounted = true;
        setFeaturedLoading(true);
        memberApi
            .getForumFeaturedPosts(3)
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res ?? [];
                const list = raw.map((p, i) => ({
                    rank: i + 1,
                    postId: p.postId,
                    title: p.title,
                    author: p.memberName,
                    likes: p.likeCount ?? 0,
                    comments: p.commentCount ?? 0,
                    img: p.imageUrls?.[0] || null,
                }));
                setFeaturedPosts(list);
            })
            .catch((err) => {
                console.error("Không thể tải bài viết nổi bật:", err);
                setFeaturedPosts([]);
            })
            .finally(() => mounted && setFeaturedLoading(false));
        return () => {
            mounted = false;
        };
    }, []);

    /* Thống kê cộng đồng */
    useEffect(() => {
        let mounted = true;
        setStatsLoading(true);
        memberApi
            .getForumStats()
            .then((res) => {
                if (!mounted) return;
                const data = res?.data ?? res ?? {};
                setStats({
                    totalMembers: data.totalMembers ?? 0,
                    totalPosts: data.totalPosts ?? 0,
                    totalComments: data.totalComments ?? 0,
                    totalLikes: data.totalLikes ?? 0,
                });
            })
            .catch((err) => {
                console.error("Không thể tải thống kê cộng đồng:", err);
                setStats({ totalMembers: 0, totalPosts: 0, totalComments: 0, totalLikes: 0 });
            })
            .finally(() => mounted && setStatsLoading(false));
        return () => {
            mounted = false;
        };
    }, []);

    /* Số thông báo chưa đọc — load ngay khi vào trang */
    useEffect(() => {
        let mounted = true;
        memberApi
            .getForumUnreadNotificationCount()
            .then((res) => {
                if (!mounted) return;
                const data = res?.data ?? res ?? {};
                setUnreadCount(data.unreadCount ?? 0);
            })
            .catch((err) => console.error("Không thể tải số thông báo chưa đọc:", err));
        return () => {
            mounted = false;
        };
    }, []);

    /* Đóng dropdown thông báo khi bấm ra ngoài */
    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Bấm chuông -> mở/đóng dropdown; mở thì load danh sách thông báo mới nhất
    function handleToggleNotif() {
        const willOpen = !notifOpen;
        setNotifOpen(willOpen);
        if (willOpen) {
            setNotifLoading(true);
            memberApi
                .getForumNotifications({ page: 1, pageSize: 10 })
                .then((res) => {
                    const data = res?.data ?? res ?? {};
                    setNotifications(data.items ?? []);
                })
                .catch((err) => console.error("Không thể tải thông báo:", err))
                .finally(() => setNotifLoading(false));
        }
    }

    // Bấm vào 1 thông báo -> đánh dấu đã đọc + điều hướng tới bài viết/bình luận
    function handleNotificationClick(n) {
        setNotifOpen(false);

        if (!n.isRead) {
            memberApi.markForumNotificationAsRead(n.notificationId).catch((err) =>
                console.error("Không thể đánh dấu đã đọc:", err)
            );
            setNotifications((prev) =>
                prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        const target = n.commentId
            ? `/bai-viet/${n.postId}#comment-${n.commentId}`
            : `/bai-viet/${n.postId}`;
        navigate(target);
    }

    // Đánh dấu tất cả đã đọc
    function handleMarkAllRead() {
        memberApi
            .markAllForumNotificationsAsRead()
            .then(() => {
                setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
                setUnreadCount(0);
            })
            .catch((err) => console.error("Không thể đánh dấu tất cả đã đọc:", err));
    }

    // MỚI — bấm avatar cá nhân (desktop) -> điều hướng tới trang cá nhân
    function handleGoToProfile() {
        navigate("/forum/profile");
    }

    // MỚI — bấm "Trang chủ" ở bottom nav mobile: nếu ĐANG ở "/" thì reload
    // lại trang thật (đảm bảo dữ liệu mới nhất), còn không thì để NavLink
    // tự điều hướng về "/" như bình thường.
    function handleHomeNavClick(e) {
        if (window.location.pathname === "/") {
            e.preventDefault();
            window.location.reload();
        }
    }

    // MỚI — bấm "+" ở bottom nav mobile: điều hướng về trang chủ kèm
    // state.openComposer = true để CommunityFeedPage tự mở overlay "Tạo bài viết"
    function handleComposeNavClick() {
        navigate("/forum", { state: { openComposer: true } });
    }

    const totalPostCount = apiCategories.reduce((sum, c) => sum + (c.count || 0), 0);
    const topics = [
        { key: "all", label: "Tất cả", count: totalPostCount, icon: Home },
        ...apiCategories,
    ];

    const STATS_VIEW = stats
        ? [
            { label: "Thành viên", value: stats.totalMembers.toLocaleString("vi-VN"), icon: Users },
            { label: "Bài viết", value: stats.totalPosts.toLocaleString("vi-VN"), icon: FileText },
            { label: "Bình luận", value: stats.totalComments.toLocaleString("vi-VN"), icon: MessageCircle },
            { label: "Lượt thích", value: stats.totalLikes.toLocaleString("vi-VN"), icon: Heart },
        ]
        : [];

    return (
        <div className="app-shell">
            <style>{CSS}</style>

            {/* Header — hiển thị ở CẢ desktop lẫn mobile */}
            <header className="app-header">
                <div className="app-header__brand">
                    <NavLink to="/" className="back-btn" aria-label="Về trang chủ">
                        ←
                    </NavLink>
                    <span className="app-header__brand-mark">VT</span>
                    <span>
                        VT GYM
                        <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>
                            BE STRONGER
                        </div>
                    </span>
                </div>
                <div className="app-header__actions">
                    {/* Chuông thông báo + dropdown */}
                    <div className="notif-wrap" ref={notifRef}>
                        <button className="icon-btn" aria-label="Thông báo" onClick={handleToggleNotif}>
                            <Bell size={18} strokeWidth={2} />
                            {unreadCount > 0 && <span className="icon-btn__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                        </button>

                        {notifOpen && (
                            <div className="notif-dropdown">
                                <div className="notif-dropdown__header">
                                    <p className="notif-dropdown__title">Thông báo</p>
                                    {unreadCount > 0 && (
                                        <button className="notif-dropdown__mark-all" onClick={handleMarkAllRead}>
                                            <CheckCheck size={13} strokeWidth={2} /> Đánh dấu tất cả
                                        </button>
                                    )}
                                </div>

                                <div className="notif-dropdown__list">
                                    {notifLoading && <p className="notif-empty">Đang tải...</p>}
                                    {!notifLoading && notifications.length === 0 && (
                                        <p className="notif-empty">Chưa có thông báo nào.</p>
                                    )}
                                    {!notifLoading &&
                                        notifications.map((n) => (
                                            <button
                                                key={n.notificationId}
                                                className={"notif-item" + (!n.isRead ? " is-unread" : "")}
                                                onClick={() => handleNotificationClick(n)}
                                            >
                                                <NotifAvatarImg avatar={n.actorAvatar} name={n.actorName} />
                                                <div className="notif-item__body">
                                                    <p className="notif-item__text">
                                                        <strong>{n.actorName}</strong> {getNotificationText(n)}
                                                        {n.commentPreview && (
                                                            <span className="notif-item__preview"> "{n.commentPreview}"</span>
                                                        )}
                                                    </p>
                                                    <p className="notif-item__time">{formatRelativeTime(n.createdAt)}</p>
                                                </div>
                                                {!n.isRead && <span className="notif-item__dot" />}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Avatar cá nhân — MỚI: bọc trong button, bấm vào chuyển tới "/forum/profile".
                        Ảnh thật từ MemberService.GetMyProfileAsync(), fallback chữ cái đầu. */}
                    <button
                        type="button"
                        className="header-avatar-btn"
                        onClick={handleGoToProfile}
                        aria-label="Trang cá nhân"
                    >
                        <MyAvatarImg avatar={myProfile?.avatar} name={myProfile?.fullName} />
                    </button>
                </div>
            </header>

            <div className="app-body">
                {/* ---------------- Sidebar trái: MỘT CARD DUY NHẤT ---------------- */}
                <aside className="side-col side-col--left">
                    <div className="panel panel--stack">
                        {/* Chủ đề */}
                        <div className="panel-section">
                            <p className="panel__title">Chủ đề</p>
                            {categoriesLoading && topics.length === 1 ? (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Đang tải...</p>
                            ) : (
                                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                                    {topics.map((t) => (
                                        <li key={t.key}>
                                            <button
                                                onClick={() => setActiveTopic(t.key)}
                                                className={"topic-btn" + (activeTopic === t.key ? " is-active" : "")}
                                            >
                                                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <t.icon size={17} strokeWidth={2} />
                                                    {t.label}
                                                </span>
                                                <span style={{ fontSize: 12, opacity: activeTopic === t.key ? 0.9 : 0.7 }}>
                                                    {t.count}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>


                        {/* Tham gia cộng đồng */}
                        <div className="panel-section panel-section--divider cta-section">
                            <p className="panel__title" style={{ marginBottom: 2 }}>Tham gia cộng đồng</p>
                            <p style={{ fontWeight: 700, margin: "10px 0 4px", fontSize: 14 }}>
                                Chia sẻ hành trình của bạn
                            </p>
                            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-secondary)" }}>
                                Nhận động lực mỗi ngày!
                            </p>

                        </div>
                    </div>
                </aside>

                {/* ---------------- Nội dung trang con ---------------- */}
                <main className="app-body__main">
                    <Outlet context={{ activeTopic, setActiveTopic, activeFilter, setActiveFilter, categories: topics }} />
                </main>

                {/* ---------------- Sidebar phải: 3 card riêng ---------------- */}
                <aside className="side-col side-col--right">
                    <div className="panel">
                        <p className="panel__title"><Star size={14} strokeWidth={2} /> Bài viết nổi bật</p>
                        <div style={{ display: "grid", gap: 14 }}>
                            {featuredLoading && (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Đang tải...</p>
                            )}
                            {!featuredLoading && featuredPosts.length === 0 && (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Chưa có bài viết nổi bật.</p>
                            )}
                            {!featuredLoading &&
                                featuredPosts.map((p) => (
                                    <div
                                        key={p.postId ?? p.rank}
                                        style={{ display: "flex", gap: 10, cursor: "pointer" }}
                                        onClick={() => navigate(`/bai-viet/${p.postId}`)}
                                    >
                                        <div className="rank-badge" style={{ background: RANK_COLOR[p.rank] }}>
                                            {p.rank}
                                        </div>
                                        {p.img ? (
                                            <img src={p.img} alt="" className="post-thumb" />
                                        ) : (
                                            <div className="post-thumb post-thumb--empty">
                                                <FileText size={20} strokeWidth={1.5} />
                                            </div>
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                                                {p.title}
                                            </p>
                                            <p style={{ margin: "4px 0", fontSize: 12, color: "var(--text-muted)" }}>
                                                {p.author}
                                            </p>
                                            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 10 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                    <Heart size={12} /> {formatCompactNumber(p.likes)}
                                                </span>
                                                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                    <MessageCircle size={12} /> {p.comments}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>

                    </div>

                    <div className="panel">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p className="panel__title" style={{ margin: 0 }}><Trophy size={14} strokeWidth={2} /> Top thành viên (số bài đăng)</p>

                            {/* MỚI — dropdown khoảng thời gian đã được style lại đẹp hơn (xem .range-select-wrap / .range-select trong CSS) */}
                            <div className="range-select-wrap">
                                <select
                                    value={membersRange}
                                    onChange={(e) => setMembersRange(e.target.value)}
                                    className="range-select"
                                    aria-label="Khoảng thời gian"
                                >
                                    <option value="week">Tuần này</option>
                                    <option value="month">Tháng này</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                            {membersLoading && (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Đang tải...</p>
                            )}
                            {!membersLoading && topMembers.length === 0 && (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Chưa có dữ liệu.</p>
                            )}
                            {topMembers.map((m) => (
                                <div key={m.id ?? m.rank} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div className="rank-badge rank-badge--sm" style={{ background: RANK_COLOR[m.rank] }}>
                                        {m.rank}
                                    </div>
                                    <MemberAvatarImg avatar={m.avatar} name={m.name} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{m.name}</p>
                                        <p style={{ margin: 0, fontSize: 11, color: "var(--accent)" }}>{m.postCount} bài viết</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="link-btn">Xem bảng xếp hạng ›</button>
                    </div>

                    <div className="panel">
                        <p className="panel__title">Thống kê cộng đồng</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {statsLoading && (
                                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, gridColumn: "1 / -1" }}>
                                    Đang tải...
                                </p>
                            )}
                            {!statsLoading &&
                                STATS_VIEW.map((s) => (
                                    <div key={s.label} className="stat-box">
                                        <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)" }}><s.icon size={18} strokeWidth={2} /></div>
                                        <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 0 2px" }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* ---------------- Bottom nav mobile — Trang chủ / Tạo bài viết (+) / Tôi ---------------- */}
            <nav className="mobile-bottom-nav">
                {NAV_ITEMS.map((item) =>
                    item.isCompose ? (
                        // MỚI — nút "+" thay cho "Thông báo": điều hướng về trang chủ kèm
                        // state.openComposer để tự mở overlay tạo bài viết
                        <button
                            key={item.key}
                            type="button"
                            className="mobile-bottom-nav__item mobile-bottom-nav__item--compose"
                            onClick={handleComposeNavClick}
                        >
                            <span className="mobile-bottom-nav__icon mobile-bottom-nav__icon--compose">
                                <item.icon size={20} strokeWidth={2.5} />
                            </span>
                            <span className="mobile-bottom-nav__label">{item.label}</span>
                        </button>
                    ) : (
                        <NavLink
                            key={item.key}
                            to={item.to}
                            end={item.to === "/"}
                            onClick={item.isHome ? handleHomeNavClick : undefined}
                            className={({ isActive }) => "mobile-bottom-nav__item" + (isActive ? " is-active" : "")}
                        >
                            <span className="mobile-bottom-nav__icon">
                                <item.icon size={20} strokeWidth={2} />
                            </span>
                            <span className="mobile-bottom-nav__label">{item.label}</span>
                        </NavLink>
                    )
                )}
            </nav>
        </div>
    );
}

/* Avatar của chính người dùng ở header — ảnh thật, fallback chữ cái đầu nếu chưa có ảnh khuôn mặt hoặc ảnh lỗi */
function MyAvatarImg({ avatar, name }) {
    const [error, setError] = useState(false);

    useEffect(() => setError(false), [avatar]);

    if (!avatar || error) {
        return <div className="avatar avatar--fallback">{getInitials(name)}</div>;
    }

    return <img src={avatar} alt="Ảnh đại diện" className="avatar" onError={() => setError(true)} />;
}

/* Avatar thành viên (Top thành viên): ảnh thật, fallback chữ cái đầu nếu không có URL hoặc ảnh lỗi */
function MemberAvatarImg({ avatar, name }) {
    const [error, setError] = useState(false);

    useEffect(() => setError(false), [avatar]);

    if (!avatar || error) {
        return <div className="member-avatar">{getInitials(name)}</div>;
    }

    return (
        <img
            src={avatar}
            alt={name}
            className="member-avatar member-avatar--img"
            onError={() => setError(true)}
        />
    );
}

/* Avatar người thực hiện hành động trong dropdown thông báo: ảnh thật, fallback chữ cái đầu */
function NotifAvatarImg({ avatar, name }) {
    const [error, setError] = useState(false);

    useEffect(() => setError(false), [avatar]);

    if (!avatar || error) {
        return <div className="member-avatar notif-item__avatar">{getInitials(name)}</div>;
    }

    return (
        <img
            src={avatar}
            alt=""
            className="notif-item__avatar"
            onError={() => setError(true)}
        />
    );
}

/* ---------------------------------------------------------------------- */
/* CSS — nhúng trong <style> ngay trong component, không cần file .css    */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --bg-app: #0c0c0e;
  --bg-panel: #17171a;
  --bg-panel-hover: #1e1e22;
  --bg-input: #201f23;
  --border-subtle: #2a2a2e;

  --text-primary: #f5f5f6;
  --text-secondary: #9a9aa2;
  --text-muted: #6c6c74;

  --accent-start: #ff5b2e;
  --accent-end: #ff2d55;
  --accent: #ff4d2d;
  --accent-soft: rgba(255, 77, 45, 0.12);

  --gold: #f5b942;
  --silver: #c7c9d1;
  --bronze: #d98a4b;

  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 8px;

  --header-h: 64px;
  --bottomnav-h: 64px;
  --left-w: 272px;
  --right-w: 320px;
}

* { box-sizing: border-box; }

html, body, #root { height: 100%; }

/* Ẩn thanh cuộn toàn cục nhưng vẫn cuộn được (áp dụng cho mọi phần tử scroll trong layout) */
.app-shell, .app-shell * {
  scrollbar-width: none;       /* Firefox */
  -ms-overflow-style: none;    /* IE / Edge cũ */
}
.app-shell::-webkit-scrollbar,
.app-shell *::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;               /* Chrome / Safari / Edge (Chromium) */
}

.app-shell {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

.app-shell button, .app-shell a { font-family: inherit; }

.app-header {
  flex: 0 0 var(--header-h);
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 40;
}
.app-header__brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: .5px; font-size: 15px; }
.app-header__brand-mark {
  width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  font-size: 12px; font-weight: 900; color: #fff; flex-shrink: 0;
}
.app-header__actions { display: flex; align-items: center; gap: 16px; }

.back-btn {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  border: 1px solid var(--border-subtle); background: var(--bg-panel-hover);
  color: var(--text-primary); display: grid; place-items: center;
  text-decoration: none; font-size: 16px; margin-right: 2px;
}
.back-btn:hover { background: var(--accent-soft); color: var(--accent); }

.icon-btn {
  position: relative; width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid var(--border-subtle); background: var(--bg-panel-hover);
  color: var(--text-secondary); display: grid; place-items: center; cursor: pointer;
}
.icon-btn__badge {
  position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px; background: var(--accent); font-size: 10px; font-weight: 700;
  display: grid; place-items: center; color: #fff;
}
.avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-subtle); }
.avatar--fallback {
  display: grid; place-items: center; font-size: 14px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}

/* MỚI — nút bọc avatar cá nhân ở header (bấm vào -> "/forum/profile") */
.header-avatar-btn {
  border: none; background: none; padding: 0; margin: 0; line-height: 0;
  border-radius: 50%; cursor: pointer;
}
.header-avatar-btn:hover .avatar,
.header-avatar-btn:hover .avatar--fallback { border-color: var(--accent); }
.header-avatar-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Dropdown thông báo */
.notif-wrap { position: relative; }
.notif-dropdown {
  position: absolute; top: calc(100% + 12px); right: 0; width: 340px; max-width: 90vw;
  background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0,0,0,.4); z-index: 60; overflow: hidden;
}
.notif-dropdown__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border-subtle);
}
.notif-dropdown__title { margin: 0; font-size: 14px; font-weight: 800; }
.notif-dropdown__mark-all {
  display: flex; align-items: center; gap: 4px; background: none; border: none;
  color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0;
}
.notif-dropdown__list { max-height: 380px; overflow-y: auto; }
.notif-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: var(--text-muted); margin: 0; }

.notif-item {
  width: 100%; display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px;
  border: none; background: transparent; cursor: pointer; text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--bg-panel-hover); }
.notif-item.is-unread { background: var(--accent-soft); }
.notif-item__avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 13px; }
.notif-item__body { flex: 1; min-width: 0; }
.notif-item__text { margin: 0; font-size: 13px; line-height: 1.4; color: var(--text-primary); }
.notif-item__preview { color: var(--text-muted); font-style: italic; }
.notif-item__time { margin: 4px 0 0; font-size: 11px; color: var(--text-muted); }
.notif-item__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 5px; }

.app-body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--left-w) minmax(0, 1fr) var(--right-w);
  gap: 20px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 24px;
  overflow: hidden;
}

.app-body__main { min-width: 0; height: 100%; overflow-y: auto; padding-right: 2px; }

.side-col {
  height: 100%;
  overflow-y: auto;
  padding-right: 2px;
}

.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 18px;
}
.panel + .panel { margin-top: 16px; }
.panel__title {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase;
  color: var(--accent); margin: 0 0 14px;
}

/* MỚI — dropdown "Tuần này / Tháng này / Tất cả" được làm đẹp lại:
   bỏ giao diện <select> mặc định (appearance: none), thêm mũi tên chevron
   riêng bằng SVG nền, bo tròn dạng pill, đổi màu khi hover/focus. */
.range-select-wrap { position: relative; display: inline-flex; }
.range-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  background-color: var(--bg-panel-hover);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239a9aa2' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 6px 26px 6px 14px;
  cursor: pointer;
  outline: none;
  transition: border-color .15s ease, background-color .15s ease, color .15s ease;
}
.range-select:hover {
  color: var(--text-primary);
  border-color: var(--accent);
  background-color: var(--accent-soft);
}
.range-select:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
/* Style cho danh sách option khi mở dropdown (áp dụng được trên hầu hết Chromium/Firefox) */
.range-select option {
  background: var(--bg-panel);
  color: var(--text-primary);
  padding: 10px;
}
.range-select option:checked {
  background: var(--accent-soft);
  color: var(--accent);
}

.panel--stack { padding: 0; overflow: hidden; }
.panel-section { padding: 18px; }
.panel-section--divider { border-top: 1px solid var(--border-subtle); }
.cta-section {
  text-align: left;
  background-image: linear-gradient(180deg, rgba(12,12,14,0) 0%, rgba(12,12,14,.92) 78%),
    url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop);
  background-size: cover; background-position: center;
  min-height: 240px; display: flex; flex-direction: column; justify-content: flex-end;
}

.topic-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: var(--radius-md); border: none; cursor: pointer;
  font-size: 14px; font-weight: 500; color: var(--text-secondary); background: transparent;
  text-align: left;
}
.topic-btn.is-active {
  color: #fff; font-weight: 700;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}

.cta-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: none; border-radius: var(--radius-md); padding: 12px; font-weight: 700; font-size: 14px;
  color: #fff; cursor: pointer;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}

.rank-badge {
  width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%;
  color: #1a1a1a; font-size: 12px; font-weight: 800; display: grid; place-items: center;
  background: var(--border-subtle);
}
.rank-badge--sm { width: 20px; height: 20px; font-size: 11px; }
.post-thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
.post-thumb--empty {
  display: grid; place-items: center; background: var(--bg-panel-hover); color: var(--text-muted);
}
.link-btn {
  margin-top: 14px; width: 100%; background: none; border: none;
  color: var(--accent); font-weight: 700; font-size: 13px; cursor: pointer; text-align: left;
}
.stat-box {
  background: var(--bg-panel-hover); border-radius: var(--radius-md); padding: 12px 10px; text-align: center;
}

/* Avatar chữ cái đầu (fallback) hoặc ảnh thật (member-avatar--img) — dùng ở Top thành viên */
.member-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}
.member-avatar--img { object-fit: cover; background: var(--bg-panel-hover); }

@media (max-width: 1180px) {
  .app-body { grid-template-columns: var(--left-w) minmax(0, 1fr); }
  .side-col--right { display: none; }
}

@media (max-width: 860px) {
  .app-header { padding: 0 16px; height: 60px; flex-basis: 60px; }
  .app-body {
    display: block;
    padding: 0;
    height: calc(100% - var(--bottomnav-h));
    overflow-y: auto;
  }
  .side-col--left { display: none; }
  .app-body__main { height: auto; overflow: visible; padding: 0 0 16px; }
  .notif-dropdown { position: fixed; top: 60px; right: 8px; left: 8px; width: auto; }
}

.mobile-bottom-nav { display: none; }
@media (max-width: 860px) {
  .mobile-bottom-nav {
    flex: 0 0 var(--bottomnav-h);
    height: var(--bottomnav-h); display: grid; grid-template-columns: repeat(3, 1fr);
    background: var(--bg-panel); border-top: 1px solid var(--border-subtle);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
.mobile-bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; text-decoration: none; color: var(--text-muted); font-size: 12px;
  border: none; background: transparent; cursor: pointer; font-family: inherit; padding: 0;
}
.mobile-bottom-nav__item.is-active { color: var(--accent); }
.mobile-bottom-nav__icon { position: relative; font-size: 20px; line-height: 1; }

/* MỚI — nút "+" (Tạo bài viết) nổi bật hơn 2 mục còn lại trong bottom nav */
.mobile-bottom-nav__icon--compose {
  width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  color: #fff; background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  margin-top: -2px;
}
.mobile-bottom-nav__item--compose:hover .mobile-bottom-nav__icon--compose,
.mobile-bottom-nav__item--compose:active .mobile-bottom-nav__icon--compose { filter: brightness(1.08); }

.mobile-bottom-nav__badge {
  position: absolute; top: -6px; right: -8px; min-width: 14px; height: 14px; padding: 0 3px;
  border-radius: 999px; background: var(--accent); color: #fff; font-size: 9px; font-weight: 700;
  display: grid; place-items: center;
}

.mobile-page-header { display: none; }
@media (max-width: 860px) {
  .mobile-page-header {
    display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 16px;
    background: var(--bg-app); border-bottom: 1px solid var(--border-subtle);
  }
  .mobile-page-header__title { font-weight: 700; font-size: 16px; }
}
`;