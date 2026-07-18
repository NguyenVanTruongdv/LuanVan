import {
    Award,
    Bookmark,
    Calendar,
    Camera,
    Flame,
    Heart,
    Home,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Phone,
    ThumbsUp,
    Trash2,
    UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import memberApi from "../../../api/memberApi";
import { getInitials, mapApiPost } from "./Communityfeedpage";

/* npm install lucide-react react-router-dom */

/* ============================================================================
   ProfilePage — trang cá nhân hội viên trong Cộng đồng.
   ----------------------------------------------------------------------------
   Giao diện tối màu (dark) + tông cam, theo đúng ảnh thiết kế:
   - Nút "Trang chủ" (quay lại /forum) nổi ở góc trên-trái ảnh bìa.
   - Ảnh bìa (cover) là ảnh phòng gym tối màu, phủ lớp overlay đen.
   - Avatar tròn lớn đè lên mép dưới ảnh bìa, có nút đổi ảnh (camera).
   - Nút "Chỉnh sửa hồ sơ" (hoặc "Theo dõi" nếu là người khác) nằm góc trên
     bên phải của thẻ hồ sơ.
   - Tên, số điện thoại, ngày tham gia.
   - 1 chỉ số duy nhất: số bài viết, hiển thị to, màu cam, trong khung riêng.
   - Thanh tab 4 mục: Bài viết của tôi / Bình luận / Đã thích / Đã lưu.
   - Danh sách bài viết dạng thẻ tối màu, có ảnh, cụm reaction (thích + lửa)
     và bình luận. Nút "..." mở menu Xoá bài viết (chỉ với bài của chính mình).

   NGUỒN DỮ LIỆU:
   - Hồ sơ (tên, avatar, phone, joinedAt, postCount): memberApi.getMyProfile()
     -> GET /api/Member/... trả về MemberProfileDto (đã bỏ phân trang, thêm
     Phone/JoinedAt/PostCount ở BE).
   - Tab "Bài viết của tôi" (chính mình): memberApi.getMyForumPosts()
     -> GET /api/ForumPost/my-posts, KHÔNG còn phân trang, trả nguyên
     { items }.
   - Xoá bài viết: memberApi.deleteForumPost(postId)
     -> DELETE /api/ForumPost/{postId}.
   ============================================================================ */

const TABS = [
    { key: "posts", label: "Bài viết của tôi", icon: Award },
    { key: "comments", label: "Bình luận", icon: MessageCircle },
    { key: "liked", label: "Đã thích", icon: Heart },
    { key: "saved", label: "Đã lưu", icon: Bookmark },
];

const FALLBACK_AVATAR = "https://i.pravatar.cc/160?img=68";
const COVER_IMAGE =
    "https://images.unsplash.com/photo-1683889843123-5eca2abfd882?fm=jpg&q=70&w=1600&auto=format&fit=crop";

/* Nơi quay lại mặc định khi không có state.backTo (vào thẳng bằng URL/link chia sẻ) */
const DEFAULT_BACK_TARGET = "/forum";

function formatJoinDate(dateInput) {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `Tham gia ngày ${mm}/${d.getFullYear()}`;
}

export default function ProfilePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(null);

    const [activeTab, setActiveTab] = useState("posts");
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [itemsError, setItemsError] = useState(null);

    /* Menu "..." đang mở cho bài viết nào (postId), null nếu không mở cái nào */
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const menuRef = useRef(null);

    /* Đường "Quay lại" cho chính trang cá nhân này — ưu tiên state.backTo
       (do nơi điều hướng tới đây truyền vào), nếu không có thì mặc định về
       trang Cộng đồng. */
    const backTarget = location.state?.backTo || DEFAULT_BACK_TARGET;

    /* Đóng menu "..." khi click ra ngoài */
    useEffect(() => {
        if (!openMenuId) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuId]);

    /* Tải hồ sơ hội viên. Nếu không có :id trên URL (route dạng /trang-ca-nhan)
       thì đây là hồ sơ của chính mình -> gọi getMyProfile, để chắc chắn hoạt
       động cả khi getMemberProfile("me") chưa có. */
    useEffect(() => {
        let mounted = true;
        setProfileLoading(true);
        setProfileError(null);

        const request = id
            ? memberApi.getMemberProfile(id)
            : memberApi.getMyProfile();

        request
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res;
                setProfile(raw);
            })
            .catch((err) => {
                console.error("Không thể tải hồ sơ:", err);
                if (!mounted) return;
                setProfileError("Không thể tải hồ sơ, vui lòng thử lại.");
            })
            .finally(() => mounted && setProfileLoading(false));

        return () => {
            mounted = false;
        };
    }, [id]);

    const memberId = profile?.memberId ?? profile?.id ?? id ?? null;
    const isOwnProfile = !id; // route /trang-ca-nhan (không kèm id) luôn là chính mình

    /* Tải danh sách theo tab đang chọn.
       Tab "posts" của chính mình gọi thẳng memberApi.getMyForumPosts()
       (API không còn phân trang, trả về toàn bộ bài viết của mình).
       Các tab còn lại (bình luận/đã thích/đã lưu) và trường hợp xem hồ sơ
       người khác vẫn dùng memberId như cũ. */
    const loadTabItems = useCallback(async () => {
        if (!memberId && !isOwnProfile) return;
        setItemsLoading(true);
        setItemsError(null);
        try {
            let res;
            switch (activeTab) {
                case "comments":
                    res = await memberApi.getMemberComments(memberId);
                    break;
                case "liked":
                    res = await memberApi.getMemberLikedPosts(memberId);
                    break;
                case "saved":
                    res = await memberApi.getMemberSavedPosts(memberId);
                    break;
                case "posts":
                default:
                    res = isOwnProfile
                        ? await memberApi.getMyForumPosts()
                        : await memberApi.getMemberPosts(memberId);
                    break;
            }
            const raw = res?.data ?? res;
            const list = Array.isArray(raw) ? raw : raw?.items ?? [];
            setItems(list.map(mapApiPost));
        } catch (err) {
            console.error("Không thể tải danh sách:", err);
            setItemsError("Không thể tải dữ liệu, vui lòng thử lại.");
        } finally {
            setItemsLoading(false);
        }
    }, [activeTab, memberId, isOwnProfile]);

    useEffect(() => {
        loadTabItems();
    }, [loadTabItems]);

    const postCount = profile?.postCount ?? 0;

    const goToPost = (postId) => {
        navigate(`/bai-viet/${postId}`, {
            state: { backTo: `${location.pathname}${location.search}` },
        });
    };

    const toggleFollow = async () => {
        if (!memberId) return;
        try {
            const res = await memberApi.toggleFollowMember(memberId);
            const data = res?.data ?? res;
            setProfile((prev) => ({
                ...prev,
                isFollowedByCurrentUser: data.isFollowing,
                followerCount: data.followerCount ?? prev.followerCount,
            }));
        } catch (err) {
            console.error("Không thể theo dõi hội viên:", err);
        }
    };

    /* Xoá bài viết (chỉ áp dụng cho bài của chính mình, tab "posts").
       Gọi memberApi.deleteForumPost, xoá lạc quan khỏi danh sách khi thành công. */
    const handleDeletePost = async (postId) => {
        setOpenMenuId(null);
        const confirmDelete = window.confirm("Bạn có chắc muốn xoá bài viết này?");
        if (!confirmDelete) return;

        setDeletingId(postId);
        try {
            await memberApi.deleteForumPost(postId);
            setItems((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("Không thể xoá bài viết:", err);
            alert("Xoá bài viết thất bại, vui lòng thử lại.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="profile-page">
            <style>{CSS}</style>

            {profileLoading && (
                <div className="panel pf-state">Đang tải hồ sơ...</div>
            )}

            {!profileLoading && profileError && (
                <div className="panel pf-state pf-state--error">{profileError}</div>
            )}

            {!profileLoading && !profileError && profile && (
                <>
                    {/* ================= Thẻ hồ sơ ================= */}
                    <section className="panel pf-card">
                        <div
                            className="pf-cover"
                            style={{ backgroundImage: `url(${COVER_IMAGE})` }}
                        >
                            <div className="pf-cover__overlay" />

                            <button
                                className="pf-home-btn"
                                onClick={() => navigate(backTarget)}
                            >
                                <Home size={15} /> Cộng đồng
                            </button>

                            {isOwnProfile ? (
                                <button className="pf-edit-btn">
                                    <Pencil size={14} /> Chỉnh sửa hồ sơ
                                </button>
                            ) : (
                                <button
                                    className={"pf-edit-btn" + (profile.isFollowedByCurrentUser ? " is-active" : "")}
                                    onClick={toggleFollow}
                                >
                                    <UserPlus size={14} />
                                    {profile.isFollowedByCurrentUser ? "Đang theo dõi" : "Theo dõi"}
                                </button>
                            )}
                        </div>

                        <div className="pf-card__body">
                            <div className="pf-avatar-wrap">
                                {profile.avatar ? (
                                    <img src={profile.avatar || FALLBACK_AVATAR} alt="" className="pf-avatar" />
                                ) : (
                                    <div className="pf-avatar pf-avatar--initial">
                                        {getInitials(profile.fullName || profile.name)}
                                    </div>
                                )}
                                {isOwnProfile && (
                                    <button className="pf-avatar__camera" aria-label="Đổi ảnh đại diện">
                                        <Camera size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="pf-card__info">
                                <h1 className="pf-name">{profile.fullName || profile.name}</h1>

                                <div className="pf-meta-row">
                                    {profile.phone && (
                                        <span>
                                            <Phone size={14} /> {profile.phone}
                                        </span>
                                    )}
                                    {profile.joinedAt && (
                                        <span>
                                            <Calendar size={14} /> {formatJoinDate(profile.joinedAt)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pf-stat">
                                <span className="pf-stat__value">{postCount}</span>
                                <span className="pf-stat__label">Bài viết</span>
                            </div>
                        </div>
                    </section>

                    {/* ================= Tabs ================= */}
                    <nav className="panel pf-tabs">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const isActive = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    className={"pf-tab" + (isActive ? " is-active" : "")}
                                    onClick={() => setActiveTab(t.key)}
                                >
                                    {Icon && <Icon size={15} />}
                                    {t.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* ================= Danh sách bài viết theo tab ================= */}
                    <div className="pf-list">
                        {itemsLoading && <div className="panel pf-list__empty">Đang tải...</div>}

                        {!itemsLoading && itemsError && (
                            <div className="panel pf-list__empty pf-list__empty--error">{itemsError}</div>
                        )}

                        {!itemsLoading && !itemsError && items.length === 0 && (
                            <div className="panel pf-list__empty">Chưa có nội dung nào ở mục này.</div>
                        )}

                        {!itemsLoading &&
                            !itemsError &&
                            items.map((post) => (
                                <article
                                    key={post.id}
                                    className={"panel pf-post" + (deletingId === post.id ? " is-deleting" : "")}
                                    onClick={() => goToPost(post.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <header className="pf-post__header">
                                        {post.avatar ? (
                                            <img src={post.avatar} alt="" className="pf-post__avatar" />
                                        ) : (
                                            <div className="pf-post__avatar pf-avatar--initial">
                                                {getInitials(post.author)}
                                            </div>
                                        )}
                                        <div className="pf-post__meta">
                                            <div className="pf-post__author-row">
                                                <span className="pf-post__author">{post.author}</span>
                                                <span className="pf-post__tag">{post.tag}</span>
                                            </div>
                                            <span className="pf-post__time">{post.time}</span>
                                        </div>

                                        {isOwnProfile && activeTab === "posts" && (
                                            <div className="pf-post__more-wrap" ref={openMenuId === post.id ? menuRef : null}>
                                                <button
                                                    className="pf-post__more"
                                                    aria-label="Tùy chọn"
                                                    disabled={deletingId === post.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId((prev) => (prev === post.id ? null : post.id));
                                                    }}
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>

                                                {openMenuId === post.id && (
                                                    <div className="pf-post__menu" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className="pf-post__menu-item pf-post__menu-item--danger"
                                                            onClick={() => handleDeletePost(post.id)}
                                                        >
                                                            <Trash2 size={14} /> Xoá bài viết
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </header>

                                    <h2 className="pf-post__title">{post.title}</h2>
                                    <p className="pf-post__content">{post.content}</p>

                                    {post.images?.length > 0 && (
                                        <div className="pf-post__images">
                                            {post.images.slice(0, 3).map((src, i) => (
                                                <img key={i} src={src} alt="" />
                                            ))}
                                        </div>
                                    )}

                                    <div className="pf-post__totals">
                                        <span className="pf-post__reactions">
                                            <span className="pf-post__reaction-icon pf-post__reaction-icon--like">
                                                <ThumbsUp size={11} />
                                            </span>
                                            <span className="pf-post__reaction-icon pf-post__reaction-icon--fire">
                                                <Flame size={11} />
                                            </span>
                                            {post.likes}
                                        </span>
                                        <span>
                                            <MessageCircle size={15} /> {post.commentCount ?? 0}
                                        </span>
                                    </div>
                                </article>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* CSS — dark theme + tông cam, theo đúng ảnh thiết kế                    */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --pf-bg: #0c0c0d;
  --pf-panel: #17171a;
  --pf-panel-hover: #1f1f23;
  --pf-border: #2a2a2e;
  --pf-text-primary: #f5f5f5;
  --pf-text-secondary: #b7b7bd;
  --pf-text-muted: #86868c;
  --pf-accent: #f5730f;
  --pf-accent-soft: rgba(245, 115, 15, 0.14);
  --pf-danger: #e8482f;
  --pf-danger-soft: rgba(232, 72, 47, 0.12);
  --pf-radius-lg: 16px;
  --pf-radius-md: 10px;
  --pf-radius-sm: 8px;
}

.profile-page {
  display: flex; flex-direction: column; gap: 16px; max-width: 720px; margin: 0 auto;
  background: var(--pf-bg); padding: 16px; color: var(--pf-text-primary);
  font-family: inherit;
}

.panel {
  background: var(--pf-panel); border: 1px solid var(--pf-border); border-radius: var(--pf-radius-lg);
}

.pf-state { text-align: center; color: var(--pf-text-muted); padding: 40px 0; }
.pf-state--error { color: var(--pf-accent); }

.pf-card { position: relative; padding: 0 0 22px; overflow: hidden; }
.pf-cover {
  height: 176px; background-size: cover; background-position: center; position: relative;
}
.pf-cover__overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(10,10,11,0.35) 0%, rgba(10,10,11,0.55) 55%, rgba(17,17,20,0.98) 100%);
}

.pf-home-btn,
.pf-edit-btn {
  position: absolute; top: 14px; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  background: rgba(20,20,22,0.55); backdrop-filter: blur(6px);
  color: var(--pf-text-primary); border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.pf-home-btn { left: 14px; }
.pf-edit-btn { right: 14px; }

.pf-home-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(20,20,22,0.75); }
.pf-edit-btn:hover { border-color: var(--pf-accent); color: var(--pf-accent); }
.pf-edit-btn.is-active { color: var(--pf-accent); background: var(--pf-accent-soft); border-color: transparent; }

.pf-card__body { display: flex; align-items: flex-end; gap: 18px; padding: 0 24px; }

.pf-avatar-wrap { position: relative; width: 108px; flex-shrink: 0; margin-top: -54px; z-index: 2; }
.pf-avatar {
  width: 108px; height: 108px; border-radius: 50%; object-fit: cover;
  border: 4px solid var(--pf-panel); display: block; background: var(--pf-panel);
  box-shadow: 0 4px 14px rgba(0,0,0,0.35);
}
.pf-avatar--initial {
  display: grid; place-items: center; font-size: 32px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--pf-accent), #b8500a);
}
.pf-avatar__camera {
  position: absolute; right: 2px; bottom: 2px; width: 28px; height: 28px; border-radius: 50%;
  background: #1d1d20; border: 2px solid var(--pf-panel); color: var(--pf-text-primary);
  display: grid; place-items: center; cursor: pointer;
}
.pf-avatar__camera:hover { color: var(--pf-accent); }

.pf-card__info { flex: 1; min-width: 0; padding-bottom: 4px; }
.pf-name {
  font-size: 24px; font-weight: 800; margin: 0; color: var(--pf-text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.pf-meta-row {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 8px;
  font-size: 13px; color: var(--pf-text-secondary);
}
.pf-meta-row span { display: flex; align-items: center; gap: 6px; }
.pf-meta-row svg { color: var(--pf-text-muted); flex-shrink: 0; }

.pf-stat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 20px; margin-bottom: 4px; flex-shrink: 0;
  background: var(--pf-accent-soft); border: 1px solid rgba(245,115,15,0.25); border-radius: var(--pf-radius-md);
}
.pf-stat__value { font-size: 26px; font-weight: 800; color: var(--pf-accent); line-height: 1.1; }
.pf-stat__label { font-size: 11.5px; color: var(--pf-text-secondary); white-space: nowrap; }

.pf-tabs { display: flex; padding: 6px; gap: 4px; }
.pf-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  border: none; background: transparent; color: var(--pf-text-muted); font-size: 13px;
  font-weight: 700; padding: 12px 6px; border-radius: var(--pf-radius-sm); cursor: pointer;
  border-bottom: 2px solid transparent;
}
.pf-tab:hover { color: var(--pf-text-primary); }
.pf-tab.is-active { color: var(--pf-accent); border-bottom-color: var(--pf-accent); }

.pf-list { display: flex; flex-direction: column; gap: 14px; }
.pf-list__empty { text-align: center; color: var(--pf-text-muted); padding: 30px 0; }
.pf-list__empty--error { color: var(--pf-accent); }

.pf-post { padding: 16px 18px; cursor: pointer; transition: opacity 0.15s ease, border-color 0.15s ease; }
.pf-post:hover { border-color: var(--pf-accent); }
.pf-post.is-deleting { opacity: 0.45; pointer-events: none; }

.pf-post__header { display: flex; align-items: center; gap: 10px; }
.pf-post__avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; font-size: 13px; }
.pf-post__meta { flex: 1; min-width: 0; }
.pf-post__author-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pf-post__author { font-weight: 700; font-size: 13.5px; color: var(--pf-text-primary); }
.pf-post__tag {
  font-size: 10.5px; font-weight: 700; color: var(--pf-accent); background: var(--pf-accent-soft);
  padding: 3px 9px; border-radius: 999px;
}
.pf-post__time { font-size: 11.5px; color: var(--pf-text-muted); }

.pf-post__more-wrap { position: relative; }
.pf-post__more {
  border: none; background: transparent; color: var(--pf-text-muted); cursor: pointer;
  display: grid; place-items: center; padding: 4px; border-radius: 6px;
}
.pf-post__more:hover { color: var(--pf-text-primary); background: var(--pf-panel-hover); }
.pf-post__more:disabled { opacity: 0.5; cursor: not-allowed; }

.pf-post__menu {
  position: absolute; top: 100%; right: 0; margin-top: 6px; z-index: 10;
  background: #1c1c1f; border: 1px solid var(--pf-border); border-radius: var(--pf-radius-sm);
  min-width: 160px; padding: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.45);
}
.pf-post__menu-item {
  width: 100%; display: flex; align-items: center; gap: 8px; text-align: left;
  border: none; background: transparent; color: var(--pf-text-primary); font-size: 13px; font-weight: 600;
  padding: 9px 10px; border-radius: 6px; cursor: pointer;
}
.pf-post__menu-item:hover { background: var(--pf-panel-hover); }
.pf-post__menu-item--danger { color: var(--pf-danger); }
.pf-post__menu-item--danger:hover { background: var(--pf-danger-soft); }

.pf-post__title { font-size: 15.5px; font-weight: 800; margin: 12px 0 4px; line-height: 1.4; color: var(--pf-text-primary); }
.pf-post__content {
  font-size: 13.5px; color: var(--pf-text-secondary); line-height: 1.6; margin: 0 0 10px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.pf-post__images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pf-post__images img { width: 100%; height: 120px; object-fit: cover; border-radius: var(--pf-radius-sm); }

.pf-post__totals {
  display: flex; align-items: center; gap: 20px; margin-top: 12px; padding-top: 10px;
  border-top: 1px solid var(--pf-border); font-size: 13px; color: var(--pf-text-secondary);
}
.pf-post__totals > span { display: flex; align-items: center; gap: 6px; }
.pf-post__reactions { display: flex; align-items: center; gap: 4px; }
.pf-post__reaction-icon {
  width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; color: #fff;
}
.pf-post__reaction-icon--like { background: #e8482f; margin-right: -6px; z-index: 1; }
.pf-post__reaction-icon--fire { background: var(--pf-accent); }
.pf-post__reactions { margin-right: 4px; }

@media (max-width: 640px) {
  .profile-page { padding: 0; gap: 0; }
  .pf-card, .pf-tabs, .pf-post { border-radius: 0; border-left: none; border-right: none; }
  .pf-tabs { position: sticky; top: 0; z-index: 15; }
  .pf-card__body { flex-wrap: wrap; }
  .pf-stat { margin-left: auto; }
}
`;