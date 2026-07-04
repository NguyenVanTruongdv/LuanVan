import {
    Apple,
    ArrowLeft,
    Bell,
    ChevronDown,
    Dumbbell,
    Flame,
    Heart,
    HeartPulse,
    HelpCircle,
    Home,
    Loader2,
    LogOut,
    MessageCircle,
    Newspaper,
    Plus,
    RotateCcw,
    Search,
    Trophy,
    Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// 999 -> "999", 1000 -> "1k", 1100 -> "1.1k", 2500 -> "2.5k"
function formatCount(n) {
    if (n < 1000) return String(n);
    const val = Math.round((n / 1000) * 10) / 10;
    const text = Number.isInteger(val) ? val.toString() : val.toFixed(1);
    return text + "k";
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function hexToRgba(hex, alpha = 1) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Look up a category's brand color, either by id or by its display label
// (posts store categoryId, the trending mock only stores the label — both
// paths are supported so either shape works once the API is live).
function getCategoryColor(categories, { id, label } = {}) {
    const match = categories.find((c) => (id && c.id === id) || (label && c.label === label));
    return match ? match.color : "#6C63FF";
}

// ---------------------------------------------------------------------------
// Mock data — this is what the API layer below currently returns.
// When a real backend is ready, delete this block and let the api.* methods
// fetch from the server instead.
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES = [
    { id: "all", label: "Tất cả chủ đề", count: 128, icon: Dumbbell, color: "#6C63FF" },
    { id: "training", label: "Tập luyện", count: 128, icon: Dumbbell, color: "#4c8dff" },
    { id: "nutrition", label: "Dinh dưỡng", count: 95, icon: Apple, color: "#f5a524" },
    { id: "health", label: "Sức khỏe", count: 64, icon: HeartPulse, color: "#22c55e" },
    { id: "recovery", label: "Phục hồi", count: 42, icon: RotateCcw, color: "#06b6d4" },
    { id: "qa", label: "Hỏi đáp", count: 58, icon: HelpCircle, color: "#a78bfa" },
    { id: "achievements", label: "Thành quả", count: 27, icon: Trophy, color: "#eab308" },
    { id: "news", label: "Tin tức & Sự kiện", count: 16, icon: Newspaper, color: "#ef4444" },
];


// On phones the tab bar doubles as the entry point for the two sidebar
// widgets (desktop shows them permanently in the right column) — tapping
// "TV tích cực" / "Chủ đề nổi bật" swaps the feed content instead of
// cluttering the page with extra strips above the posts.
// The first two tabs show on every screen size. "TV tích cực" is a
// phone-only extra tab (mobileOnly) — on PC/tablet the active-members
// widget is already permanently visible in the right sidebar, so it
// doesn't need its own tab there; on phone it does, since the right
// sidebar is hidden.
const MOBILE_TABS = [
    { id: "latest", label: "Mới nhất" },
    { id: "trending", label: "Thịnh hành" },
    { id: "active-members", label: "TV tích cực", mobileOnly: true },
];

const MOCK_POSTS = [
    {
        id: "p1",
        categoryId: "training",
        tag: "Tập luyện",
        title: "Lịch tập 5 buổi/tuần cho người mới bắt đầu",
        excerpt:
            "Xin chào mọi người, mình là người mới tập gym, muốn tìm lịch tập 5 buổi/tuần...",
        author: "minhduc210",
        time: "2 giờ trước",
        comments: 25,
        views: 1200,
    },
    {
        id: "p2",
        categoryId: "nutrition",
        tag: "Dinh dưỡng",
        title: "Thực đơn giảm mỡ hiệu quả cho nam giới",
        excerpt:
            "Mình cao 1m75 nặng 75kg, mục tiêu giảm mỡ còn 68kg. Anh em có thể gợi ý...",
        author: "fitfoodie",
        time: "5 giờ trước",
        comments: 18,
        views: 856,
    },
    {
        id: "p3",
        categoryId: "health",
        tag: "Sức khỏe",
        title: "Đau vai khi tập ngực – Nguyên nhân và cách khắc phục",
        excerpt:
            "Mỗi lần tập ngực xong vai mình bị đau, nhất là bài đẩy tạ. Có ai gặp tình trạng...",
        author: "dr.hung",
        time: "1 ngày trước",
        comments: 31,
        views: 1500,
    },
    {
        id: "p4",
        categoryId: "achievements",
        tag: "Thành quả",
        title: "Chia sẻ quá trình 6 tháng transformation",
        excerpt:
            "Mình bắt đầu tập từ tháng 1, đây là kết quả sau 6 tháng. Cố gắng không ngừng!",
        author: "thanhfit",
        time: "2 ngày trước",
        comments: 42,
        views: 2300,
    },
    {
        id: "p5",
        categoryId: "recovery",
        tag: "Phục hồi",
        title: "Creatine – Uống như thế nào là đúng?",
        excerpt:
            "Mình mới mua creatine về nhưng chưa rõ liều lượng và thời điểm sử dụng hợp lý...",
        author: "gym.bro",
        time: "3 ngày trước",
        comments: 12,
        views: 692,
    },
];

const MOCK_MEMBERS = [
    { rank: 1, name: "minhduc210", postCount: 82, medal: "gold" },
    { rank: 2, name: "thanhfit", postCount: 65, medal: "silver" },
    { rank: 3, name: "coach.huy", postCount: 54, medal: "bronze" },
    { rank: 4, name: "gym.bro", postCount: 31 },
    { rank: 5, name: "fitfoodie", postCount: 24 },
];

const MEMBER_RANGES = [
    { id: "week", label: "Tuần" },
    { id: "month", label: "Tháng" },
    { id: "all", label: "Tất cả" },
];

// ---------------------------------------------------------------------------
// API layer
// ---------------------------------------------------------------------------
// Everything the UI needs goes through here. Right now each method just
// resolves the mock data above after a short fake delay so the loading
// states are visible. To wire up a real backend, replace the body of each
// method with a fetch() call and keep the same return shape — no other
// component needs to change.
//
//   async getPosts({ categoryId, tabId, page }) {
//     const params = new URLSearchParams({ category: categoryId, tab: tabId, page });
//     const res = await fetch(`${API_BASE}/posts?${params}`);
//     if (!res.ok) throw new Error("Không tải được danh sách chủ đề");
//     return res.json(); // -> { items: [...], page, hasMore }
//   }
// ---------------------------------------------------------------------------

const API_BASE = "/api"; // update when the real backend is ready

const api = {
    async getCategories() {
        await delay(200);
        return MOCK_CATEGORIES;
    },

    async getPosts({ categoryId = "all", tabId = "latest", page = 1 } = {}) {
        await delay(450);
        let items = MOCK_POSTS;
        if (categoryId !== "all") {
            items = items.filter((p) => p.categoryId === categoryId);
        }
        // tabId would normally be sent to the server to sort/filter server-side
        return { items, page, hasMore: false, tabId, categoryId };
    },

    async getMembers({ range = "week" } = {}) {
        await delay(200);
        return { items: MOCK_MEMBERS, range };
    },

    async getTrending() {
        await delay(200);
        // A real endpoint would return full post objects too — keeping the
        // shape identical to getPosts() means the "Chủ đề nổi bật" view can
        // reuse <PostCard> directly instead of a separate mini-widget.
        return [...MOCK_POSTS]
            .sort((a, b) => b.views - a.views)
            .slice(0, 3)
            .map((post, i) => ({ ...post, rank: i + 1 }));
    },
};

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Avatar({ letter, size = 32, medal }) {
    return (
        <div
            className={`avatar${medal ? " avatar-ring avatar-" + medal : ""}`}
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {letter}
        </div>
    );
}

function Tag({ label, color }) {
    const style = color
        ? { color, background: hexToRgba(color, 0.16) }
        : undefined;
    return (
        <span className="tag" style={style}>
            {label}
        </span>
    );
}

function Spinner({ size = 16 }) {
    return <Loader2 size={size} className="spinner" />;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({ onLogoClick }) {
    return (
        <header className="header">
            <a href="/" className="back-btn" title="Quay lại trang chủ Gym">
                <ArrowLeft size={18} className="back-btn-icon" />
                <LogOut size={18} className="menu-icon" />
                <span className="back-btn-label">Trang chủ Gym</span>
            </a>

            <div className="divider" />

            <button
                className="brand"
                onClick={onLogoClick}
                title="Về đầu diễn đàn & tải chủ đề mới"
            >
                <div className="brand-icon">
                    <Dumbbell size={18} color="#fff5f0" />
                </div>
                <div className="brand-text">
                    <div className="brand-title">GYM</div>
                    <div className="brand-sub">FORUM</div>
                </div>
            </button>

            <div className="header-spacer" />

            <button className="icon-btn search-btn">
                <Search size={18} />
            </button>

            <button className="icon-btn notif-btn">
                <Bell size={18} />
                <span className="dot" />
            </button>

            <button className="user-btn">
                <Avatar letter="M" size={32} />
                <span className="user-name">minhduc210</span>
                <ChevronDown size={16} className="icon-faint" />
            </button>
        </header>
    );
}

// ---------------------------------------------------------------------------
// Left sidebar
// ---------------------------------------------------------------------------

function Sidebar({ categories, activeCategoryId, onSelectCategory, loading }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-label">DANH MỤC</div>
            <nav className="category-list">
                {loading && categories.length === 0
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="category-item skeleton" />
                    ))
                    : categories.map((c) => {
                        const Icon = c.icon;
                        const isActive = c.id === activeCategoryId;
                        return (
                            <button
                                key={c.id}
                                className={`category-item${isActive ? " active" : ""}`}
                                onClick={() => onSelectCategory(c.id)}
                                style={{ "--cat-color": c.color, "--cat-bg": hexToRgba(c.color, 0.18) }}
                            >
                                <span className="category-left">
                                    <span className="category-icon-circle">
                                        <Icon size={16} className="category-icon" />
                                    </span>
                                    <span className="category-label">{c.label}</span>
                                </span>
                                <span className="category-count">{c.count}</span>
                            </button>
                        );
                    })}
            </nav>

            <button className="btn-primary sidebar-cta">
                <Plus size={16} />
                Tạo chủ đề mới
            </button>
        </aside>
    );
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

function PostCard({ post, categories }) {
    const color = getCategoryColor(categories, { id: post.categoryId });
    return (
        <div className="post-card">
            <div className="post-thumb">
                <span className="post-thumb-tag">
                    <Tag label={post.tag} color={color} />
                </span>
            </div>
            <div className="post-body">
                <div className="post-top">
                    <Tag label={post.tag} color={color} />
                    <h3 className="post-title">{post.title}</h3>
                </div>
                <p className="post-excerpt">{post.excerpt}</p>
                <div className="post-meta">
                    <span className="post-author">
                        <Avatar letter={post.author[0].toUpperCase()} size={20} />
                        {post.author} · {post.time}
                    </span>
                    <span className="post-stat">
                        <MessageCircle size={13} /> {formatCount(post.comments)}
                    </span>
                    <span className="post-stat">
                        <Heart size={13} /> {formatCount(post.views)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function PostSkeleton() {
    return (
        <div className="post-card">
            <div className="post-thumb skeleton" />
            <div className="post-body">
                <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "70%", height: 14, marginTop: 10 }} />
                <div className="skeleton-line" style={{ width: "90%", height: 12, marginTop: 10 }} />
            </div>
        </div>
    );
}

function MainFeed({
    feedRef,
    activeTabId,
    onTabChange,
    posts,
    loading,
    error,
    onRetry,
    categories,
    members,
    membersLoading,
    memberRange,
    onMemberRangeChange,
    trending,
    trendingLoading,
}) {
    const showMembers = activeTabId === "active-members";
    const showPopular = activeTabId === "popular-topics";

    return (
        <main className="feed" ref={feedRef}>
            <div className="feed-head">
                <h1>Diễn đàn</h1>
                <p>Nơi chia sẻ kinh nghiệm, kiến thức và truyền cảm hứng luyện tập mỗi ngày.</p>
            </div>

            {/* "Mới nhất" / "Thịnh hành" show on every screen size. "TV tích
                cực" is an extra tab that only appears on phone (hidden on
                PC/tablet via CSS) since desktop already shows that widget
                permanently in the right sidebar. */}
            <div className="tab-bar">
                {MOBILE_TABS.map((t) => (
                    <button
                        key={t.id}
                        className={`tab-btn${t.id === activeTabId ? " active" : ""}${t.mobileOnly ? " tab-mobile-only" : ""}`}
                        onClick={() => onTabChange(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {showMembers ? (
                <ActiveMembers
                    members={members}
                    range={memberRange}
                    onRangeChange={onMemberRangeChange}
                    loading={membersLoading}
                />
            ) : showPopular ? (
                <div className="post-list">
                    {trendingLoading
                        ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                        : trending.map((p) => <PostCard key={p.id} post={p} categories={categories} />)}
                </div>
            ) : error ? (
                <div className="feed-error">
                    <p>{error}</p>
                    <button className="btn-primary" onClick={onRetry}>
                        Thử lại
                    </button>
                </div>
            ) : (
                <div className="post-list">
                    {loading
                        ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                        : posts.length === 0
                            ? <p className="feed-empty">Chưa có chủ đề nào trong danh mục này.</p>
                            : posts.map((p) => <PostCard key={p.id} post={p} categories={categories} />)}
                </div>
            )}
        </main>
    );
}

// ---------------------------------------------------------------------------
// Right sidebar
// ---------------------------------------------------------------------------

function BannerCard() {
    return (
        <div className="banner-card">
            <img
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&auto=format&fit=crop"
                alt=""
                className="banner-img"
            />
            <div className="banner-overlay" />
            <div className="banner-content">
                <h3 className="banner-title">
                    TẬP LUYỆN
                    <br />
                    KIẾN TẠO
                    <br />
                    PHIÊN BẢN
                    <br />
                    <span className="banner-accent">TỐT HƠN</span>
                </h3>
            </div>
            <button className="btn-primary banner-cta">
                <Plus size={15} />
                Tạo chủ đề
            </button>
        </div>
    );
}

function ActiveMembers({ members, range, onRangeChange, loading }) {
    return (
        <div className="panel-card">
            <div className="panel-head">
                <div className="panel-label">
                    <Users size={13} />
                    THÀNH VIÊN TÍCH CỰC
                </div>
                <button className="link-btn">Xem tất cả</button>
            </div>

            <div className="segment">
                {MEMBER_RANGES.map((r) => (
                    <button
                        key={r.id}
                        className={`segment-btn${r.id === range ? " active" : ""}`}
                        onClick={() => onRangeChange(r.id)}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <div className="member-list">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="skeleton-line" style={{ width: "100%", height: 26 }} />
                    ))
                    : members.map((m) => (
                        <div key={m.name} className="member-row">
                            <span className={`member-rank${m.medal ? " medal-" + m.medal : ""}`}>
                                {m.rank}
                            </span>
                            <Avatar letter={m.name[0].toUpperCase()} size={26} medal={m.medal} />
                            <span className="member-name">{m.name}</span>
                            <span className="member-points">{formatCount(m.postCount)} bài đăng</span>
                        </div>
                    ))}
            </div>
        </div>
    );
}

function TrendingTopics({ trending, loading, categories }) {
    return (
        <div className="panel-card">
            <div className="panel-head">
                <div className="panel-label">
                    <Flame size={13} />
                    CHỦ ĐỀ NỔI BẬT
                </div>
                <button className="link-btn">Xem tất cả</button>
            </div>

            <div className="trending-list">
                {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton-line" style={{ width: "100%", height: 36 }} />
                    ))
                    : trending.map((t) => (
                        <div key={t.title} className="trending-row">
                            <span className="trending-rank">{t.rank}</span>
                            <div className="trending-body">
                                <p className="trending-title">{t.title}</p>
                                <div className="trending-meta">
                                    <Tag label={t.tag} color={getCategoryColor(categories, { label: t.tag })} />
                                    <span className="post-stat">
                                        <MessageCircle size={11} /> {formatCount(t.comments)}
                                    </span>
                                    <span className="post-stat">
                                        <Heart size={11} /> {formatCount(t.views)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

function RightSidebar({ members, memberRange, onMemberRangeChange, membersLoading, trending, trendingLoading, categories }) {
    return (
        <aside className="right-sidebar">
            <BannerCard />
            <ActiveMembers
                members={members}
                range={memberRange}
                onRangeChange={onMemberRangeChange}
                loading={membersLoading}
            />
            <TrendingTopics trending={trending} loading={trendingLoading} categories={categories} />
        </aside>
    );
}

// ---------------------------------------------------------------------------
// Mobile bottom navigation (hidden on desktop/tablet via CSS)
// ---------------------------------------------------------------------------

function BottomNav({ onHomeClick }) {
    const items = [
        { key: "home", icon: Home, label: "Trang chủ", onClick: onHomeClick },
        { key: "notif", icon: Bell, label: "Thông báo" },
        { key: "create", icon: Plus, label: null, isCta: true },
    ];
    return (
        <nav className="bottom-nav">
            {items.map((item) => {
                const Icon = item.icon;
                if (item.isCta) {
                    return (
                        <button key={item.key} className="bottom-nav-cta" onClick={item.onClick}>
                            <Icon size={22} />
                        </button>
                    );
                }
                return (
                    <button key={item.key} className="bottom-nav-item" onClick={item.onClick}>
                        <Icon size={19} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

// ---------------------------------------------------------------------------
// Styles (plain CSS, no Tailwind)
// ---------------------------------------------------------------------------

const styles = `
html, body {
  height: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  background: #0a0a0a;
}

* { box-sizing: border-box; }

.gym-forum {
  --bg: #0a0a0a;
  --panel: #131313;
  --panel-2: #17181a;
  --border: #262626;
  --text: #f2f0ec;
  --text-dim: #9a9a97;
  --text-faint: #66655f;
  --accent: #6C63FF;
  --accent-2: #8B7CF6;
  --accent-dim: rgba(108, 99, 255, 0.14);
  --accent-border: rgba(108, 99, 255, 0.35);
  --accent-text: #f5f3ff;

  height: 100%;
  min-height: 100%;
  width: 100%;
  background: var(--bg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---------- Header ---------- */

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem;
  height: 4rem;
  flex-shrink: 0;
  background: #0d0d0d;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-dim);
  text-decoration: none;
  background: transparent;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.back-btn:hover { background: var(--panel-2); color: var(--text); }

.divider {
  width: 1px;
  height: 1.5rem;
  background: var(--border);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.375rem;
  border-radius: 0.625rem;
  transition: background 0.15s;
}
.brand:hover { background: var(--panel-2); }
.brand-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
}
.brand-text { line-height: 1.1; text-align: left; }
.brand-title { font-weight: 800; font-size: 0.875rem; color: var(--text); letter-spacing: 0.5px; }
.brand-sub { font-weight: 800; font-size: 0.625rem; color: var(--accent); letter-spacing: 2px; }

.header-spacer { flex: 1; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  cursor: pointer;
  color: var(--accent-text);
  font-weight: 700;
  font-size: 0.875rem;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  border-radius: 0.75rem;
  transition: filter 0.15s, transform 0.1s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:active { transform: scale(0.98); }

.icon-btn {
  position: relative;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: var(--panel-2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  cursor: pointer;
  flex-shrink: 0;
}
.icon-btn .dot {
  position: absolute;
  top: 0.5625rem;
  right: 0.6875rem;
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background: var(--accent);
}
.menu-icon { display: none; }
.search-btn { display: none; }

.user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border-radius: 0.75rem;
  color: var(--text);
  flex-shrink: 0;
}
.user-name { font-size: 0.875rem; font-weight: 500; }
.icon-faint { color: var(--text-faint); }

.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--accent-text);
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  flex-shrink: 0;
}
.avatar-ring { box-shadow: 0 0 0 2px #0d0d0d, 0 0 0 3px var(--ring-color); }
.avatar-gold { --ring-color: #f4b740; }
.avatar-silver { --ring-color: #c7ccd8; }
.avatar-bronze { --ring-color: #d98a4f; }

.tag {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent-2);
  background: var(--accent-dim);
  padding: 0.1875rem 0.5625rem;
  border-radius: 0.4375rem;
  white-space: nowrap;
}

/* ---------- Layout ---------- */

.body-wrap {
  display: flex;
  flex-wrap: nowrap;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 90rem;
  width: 100%;
  margin: 0 auto;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* shared scroll behaviour for the three columns */
.sidebar,
.feed,
.right-sidebar {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.sidebar::-webkit-scrollbar,
.feed::-webkit-scrollbar,
.right-sidebar::-webkit-scrollbar { width: 6px; }
.sidebar::-webkit-scrollbar-thumb,
.feed::-webkit-scrollbar-thumb,
.right-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ---------- Sidebar ---------- */

.sidebar {
  flex: 0 0 16rem;
  max-width: 16rem;
  min-width: 12rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-right: 0.25rem;
}
.sidebar-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-faint);
  padding: 0 0.25rem;
  margin-bottom: 0.25rem;
}
.category-list { display: flex; flex-direction: column; gap: 0.25rem; }
.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.category-item:hover { background: var(--panel-2); }
.category-item.active {
  background: var(--accent-dim);
  color: #ffffff;
  border-color: var(--accent-border);
}
.category-item.skeleton { height: 2.5rem; background: var(--panel-2); border: none; }
.category-left { display: flex; align-items: center; gap: 0.625rem; }
.category-icon-circle { display: inline-flex; align-items: center; justify-content: center; }
.category-icon { color: var(--cat-color, var(--text-faint)); }
.category-label { }
.category-count {
  font-size: 0.75rem;
  padding: 0.125rem 0.4375rem;
  border-radius: 0.4375rem;
  background: var(--panel-2);
  color: var(--text-faint);
}
.category-item.active .category-count { background: var(--accent); color: var(--accent-text); }

.sidebar-cta { height: 2.75rem; justify-content: center; margin-top: 0.25rem; flex-shrink: 0; }

/* ---------- Feed ---------- */

.feed { flex: 1 1 auto; min-width: 0; padding-right: 0.5rem; }
.feed-head { margin-bottom: 1.25rem; }
.feed-head h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.25rem; color: var(--text); }
.feed-head p { font-size: 0.875rem; color: var(--text-dim); margin: 0; }

.tab-bar {
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: var(--panel);
  border: 1px solid var(--border);
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
/* "TV tích cực" is a phone-only extra tab — on tablet/desktop the
   active-members widget is already permanently visible in the right
   sidebar, so this tab is hidden there and only the first two tabs show */
.tab-mobile-only { display: none; }
.tab-btn {
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-dim);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5625rem;
  transition: background 0.15s, color 0.15s;
}
.tab-btn.active { background: var(--accent); color: var(--accent-text); font-weight: 700; }

.post-list { display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 1rem; }
.post-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 1rem;
  background: var(--panel);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s;
}
.post-card:hover { border-color: var(--accent-border); }
.post-thumb {
  position: relative;
  width: 5rem;
  height: 5rem;
  border-radius: 0.75rem;
  background: var(--panel-2);
  flex-shrink: 0;
}
.post-thumb-tag { display: none; }
.post-body { flex: 1; min-width: 0; }
.post-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; flex-wrap: wrap; }
.post-title { font-size: 0.9375rem; font-weight: 600; color: var(--text); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-excerpt {
  font-size: 0.875rem;
  color: var(--text-dim);
  margin: 0 0 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; color: var(--text-faint); flex-wrap: wrap; }
.post-author { display: flex; align-items: center; gap: 0.5rem; }
.post-stat { display: flex; align-items: center; gap: 0.25rem; }

.feed-empty { color: var(--text-dim); font-size: 0.875rem; padding: 1rem 0; }
.feed-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 1rem;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.875rem;
}
.feed-error .btn-primary { height: 2.25rem; padding: 0 1rem; }

/* skeleton loading */
.skeleton, .skeleton-line {
  background: linear-gradient(90deg, var(--panel-2) 25%, #202020 37%, var(--panel-2) 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
  border-radius: 0.5rem;
}
@keyframes skeleton-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.spinner { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- Right sidebar ---------- */

.right-sidebar {
  flex: 0 0 20rem;
  max-width: 20rem;
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-right: 0.25rem;
}

.banner-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid var(--border);
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
  flex-shrink: 0;
}
.banner-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%) contrast(1.2) brightness(0.5);
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(10,10,10,0.95) 20%, rgba(10,10,10,0.6) 55%, rgba(10,10,10,0.25) 100%);
}
.banner-content { position: relative; z-index: 1; }
.banner-title { font-size: 1.3125rem; font-weight: 800; line-height: 1.25; color: #ffffff; margin: 0; }
.banner-accent { color: var(--accent-2); }
.banner-cta { position: relative; z-index: 1; align-self: flex-start; height: 2.5rem; padding: 0 1rem; }

.panel-card {
  border-radius: 1rem;
  padding: 1rem;
  background: var(--panel);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.panel-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--text-faint);
}
.link-btn { border: none; background: transparent; cursor: pointer; font-size: 0.75rem; font-weight: 500; color: var(--accent-2); }

.segment { display: flex; align-items: center; padding: 0.25rem; border-radius: 0.625rem; background: var(--panel-2); margin-bottom: 0.75rem; }
.segment-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-faint);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0;
  border-radius: 0.5rem;
  transition: background 0.15s, color 0.15s;
}
.segment-btn.active { background: var(--accent); color: var(--accent-text); font-weight: 700; }

.member-list { display: flex; flex-direction: column; gap: 0.625rem; }
.member-row { display: flex; align-items: center; gap: 0.625rem; }
.member-rank { width: 1.25rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-faint); }
.member-rank.medal-gold { color: #f4b740; }
.member-rank.medal-silver { color: #c7ccd8; }
.member-rank.medal-bronze { color: #d98a4f; }
.member-name { flex: 1; font-size: 0.875rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-points { font-size: 0.75rem; color: var(--text-faint); white-space: nowrap; }

.trending-list { display: flex; flex-direction: column; gap: 0.875rem; }
.trending-row { display: flex; gap: 0.625rem; }
.trending-rank {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.4375rem;
  background: var(--panel-2);
  color: var(--accent-2);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.trending-body { min-width: 0; }
.trending-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 0.375rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trending-meta { display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap; }

/* ---------- Mobile bottom navigation ---------- */

.bottom-nav { display: none; }

/* ===========================================================================
   Responsive
   - >1100px  : three independent-scroll columns (desktop, as designed above)
   - 701–1100px: single scrolling column; categories become a horizontal
                 pill bar above the feed; banner/trending stack below the
                 post list
   - ≤700px   : same stacked layout, further compacted for phones; this is
                 also the only width where the "TV tích cực" tab and the
                 "Tạo chủ đề mới" sidebar button are shown/hidden per the
                 mobile-only rules below
   =========================================================================== */

@media (max-width: 1100px) {
  .gym-forum { height: auto; min-height: 100%; overflow: visible; }

  .header { position: sticky; top: 0; z-index: 10; }

  .body-wrap {
    flex-direction: column;
    overflow: visible;
    height: auto;
    padding: 1rem;
    gap: 1rem;
  }

  .sidebar,
  .feed,
  .right-sidebar {
    height: auto;
    max-width: 100%;
    min-width: 0;
    width: 100%;
    overflow: visible;
    flex: 1 1 auto;
    padding-right: 0;
  }

  /* categories collapse into a horizontally-scrollable pill bar */
  .sidebar { gap: 0.625rem; }
  .sidebar-label { display: none; }
  .category-list {
    flex-direction: row;
    overflow-x: auto;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }
  .category-item {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 0.5rem 0.875rem;
  }
  .category-item.skeleton { flex-shrink: 0; width: 8rem; height: 2.25rem; }
  .sidebar-cta { width: auto; padding: 0 1.25rem; align-self: flex-start; }

  .feed { order: 1; }
  .right-sidebar {
    order: 2;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .right-sidebar .banner-card { flex: 1 1 16rem; aspect-ratio: auto; min-height: 12rem; }
  .right-sidebar .panel-card { flex: 1 1 16rem; }

  .tab-bar { overflow-x: auto; max-width: 100%; }
  .tab-btn { white-space: nowrap; }
}

@media (max-width: 700px) {
  /* header: exit/back icon + centered logo + search + avatar */
  .back-btn-label { display: none; }
  .back-btn-icon { display: none; }
  .menu-icon { display: block; }
  .back-btn { padding: 0.5rem; }
  .user-name { display: none; }
  .header { padding: 0 0.75rem; gap: 0.625rem; }
  .divider { display: none; }
  .brand { flex: 1; justify-content: center; }
  .header-spacer { flex: 0; }
  .search-btn { display: flex; }
  .notif-btn { display: none; }

  .body-wrap { padding: 0.75rem; gap: 0.875rem; padding-bottom: 0; }
  .feed { padding-bottom: 5.5rem; }

  /* "Tạo chủ đề mới" lives only in the bottom-nav + on desktop/tablet */
  .sidebar-cta { display: none; }

  /* on phone, the third tab ("TV tích cực") becomes visible too */
  .tab-mobile-only { display: inline-block; }

  /* categories become icon-on-top circular chips */
  .category-item {
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem 0.5rem;
    min-width: 4.5rem;
    border-radius: 1rem;
  }
  .category-left { flex-direction: column; gap: 0.375rem; }
  .category-icon-circle {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: var(--cat-bg);
  }
  .category-label {
    font-size: 0.6875rem;
    text-align: center;
    line-height: 1.15;
    white-space: normal;
    max-width: 4rem;
  }
  .category-count { display: none; }

  /* on phone, the right column widgets are reached via the tabs instead */
  .right-sidebar { display: none; }

  /* post cards: full-width image on top with the tag overlaid on it */
  .post-card { flex-direction: column; padding: 0; overflow: hidden; gap: 0; }
  .post-thumb { width: 100%; height: 9rem; border-radius: 0; }
  .post-thumb-tag { display: inline-flex; position: absolute; top: 0.625rem; left: 0.625rem; z-index: 1; }
  .post-body { padding: 0.875rem; }
  .post-top { flex-direction: column; align-items: flex-start; gap: 0.25rem; margin-bottom: 0.5rem; }
  .post-top > .tag { display: none; }
  .post-title {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .post-excerpt { display: none; }
  .post-meta { gap: 0.625rem; }

  .feed-head h1 { font-size: 1.25rem; }
  .feed-head p { font-size: 0.8125rem; }

  /* bottom tab bar */
  .bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4.25rem;
    padding: 0 0.5rem;
    background: #0d0d0d;
    border-top: 1px solid var(--border);
    z-index: 20;
  }
  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    border: none;
    background: transparent;
    color: var(--text-faint);
    font-size: 0.625rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
  }
  .bottom-nav-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    color: #fff5f0;
    background: linear-gradient(135deg, var(--accent-2), var(--accent));
    transform: translateY(-0.75rem);
    box-shadow: 0 6px 16px var(--accent-dim);
  }
}
`;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function GymForum() {
    const feedRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState("all");

    const [activeTabId, setActiveTabId] = useState("latest");

    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState(null);

    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [memberRange, setMemberRange] = useState("week");

    const [trending, setTrending] = useState([]);
    const [trendingLoading, setTrendingLoading] = useState(true);

    // ---- data loaders -----------------------------------------------------

    async function loadPosts({ categoryId, tabId, scrollTop = false } = {}) {
        setPostsLoading(true);
        setPostsError(null);
        try {
            const data = await api.getPosts({
                categoryId: categoryId ?? activeCategoryId,
                tabId: tabId ?? activeTabId,
                page: 1,
            });
            setPosts(data.items);
        } catch (err) {
            setPostsError("Không tải được danh sách chủ đề. Vui lòng thử lại.");
        } finally {
            setPostsLoading(false);
            if (scrollTop && feedRef.current) {
                feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
        }
    }

    async function loadMembers(range) {
        setMembersLoading(true);
        try {
            const data = await api.getMembers({ range: range ?? memberRange });
            setMembers(data.items);
        } finally {
            setMembersLoading(false);
        }
    }

    async function loadTrending() {
        setTrendingLoading(true);
        try {
            const data = await api.getTrending();
            setTrending(data);
        } finally {
            setTrendingLoading(false);
        }
    }

    // ---- initial load ------------------------------------------------------

    useEffect(() => {
        (async () => {
            setCategoriesLoading(true);
            const cats = await api.getCategories();
            setCategories(cats);
            setCategoriesLoading(false);
        })();
        loadPosts({ scrollTop: false });
        loadMembers();
        loadTrending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- handlers -----------------------------------------------------------

    function handleSelectCategory(categoryId) {
        setActiveCategoryId(categoryId);
        loadPosts({ categoryId, scrollTop: true });
    }

    function handleTabChange(tabId) {
        setActiveTabId(tabId);
        loadPosts({ tabId, scrollTop: true });
    }

    function handleMemberRangeChange(range) {
        setMemberRange(range);
        loadMembers(range);
    }

    // Clicking the "GYM FORUM" logo: reset filters, jump back to the top of
    // the feed, and pull a fresh copy of the topic list — same code path a
    // real "refresh" action would use once the API is live.
    function handleLogoClick() {
        setActiveCategoryId("all");
        setActiveTabId("latest");
        loadPosts({ categoryId: "all", tabId: "latest", scrollTop: true });
    }

    return (
        <div className="gym-forum">
            <style>{styles}</style>
            <Header onLogoClick={handleLogoClick} />
            <div className="body-wrap">
                <Sidebar
                    categories={categories}
                    activeCategoryId={activeCategoryId}
                    onSelectCategory={handleSelectCategory}
                    loading={categoriesLoading}
                />
                <MainFeed
                    feedRef={feedRef}
                    activeTabId={activeTabId}
                    onTabChange={handleTabChange}
                    posts={posts}
                    loading={postsLoading}
                    error={postsError}
                    onRetry={() => loadPosts({ scrollTop: false })}
                    categories={categories}
                    members={members}
                    membersLoading={membersLoading}
                    memberRange={memberRange}
                    onMemberRangeChange={handleMemberRangeChange}
                    trending={trending}
                    trendingLoading={trendingLoading}
                />
                <RightSidebar
                    members={members}
                    memberRange={memberRange}
                    onMemberRangeChange={handleMemberRangeChange}
                    membersLoading={membersLoading}
                    trending={trending}
                    trendingLoading={trendingLoading}
                    categories={categories}
                />
            </div>
            <BottomNav onHomeClick={handleLogoClick} />
        </div>
    );
}