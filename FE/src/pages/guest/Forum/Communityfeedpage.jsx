import {
    ArrowLeft,
    AtSign,
    Bookmark,
    ChevronRight,
    Heart,
    ImagePlus,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import memberApi from "../../../api/memberApi";
/* npm install lucide-react react-router-dom — dùng cùng bộ icon 1 màu với Layout.jsx */

/* ============================================================================
   CommunityFeedPage — nội dung render vào <Outlet/> của Layout.jsx
   ----------------------------------------------------------------------------
   CẬP NHẬT — ĐỐI CHIẾU LẠI VỚI BE THẬT (ForumPostService, ForumLikeService):

   - ForumPostDto thật sự có: postId, memberId, memberName, memberAvatar,
     title, categoryId, categoryName, content, postType, originalPostId,
     originalPost, likeCount, commentCount, repostCount, status,
     isLikedByCurrentUser, imageUrls, createdAt, updatedAt. KHÔNG CÓ
     viewCount — nên bản này bỏ hẳn "lượt xem".

   - memberAvatar lấy từ FaceDatum.ProfileImage bên BE -> CÓ THỂ NULL nếu
     hội viên chưa đăng ký khuôn mặt. FE luôn fallback về avatar chữ cái
     đầu (getInitials) khi memberAvatar là null/rỗng, thay vì hiển thị ảnh
     vỡ hoặc để trống.

   - GetFeedAsync chỉ hỗ trợ 2 kiểu sort thật: "trending" và mặc định (mới
     nhất theo CreatedAt) — chỉ còn "Mới nhất" / "Thịnh hành".

   - CategoryId ở BE là số nguyên -> ép Number(activeTopic)/Number(postTopic)
     trước khi gửi lên API.

   - Nút "Thích" gọi thật ForumLikeService qua memberApi.toggleForumPostLike
     (trả về { isLiked, likeCount }), cập nhật lại state ngay khi có phản hồi.

   - activeTopic/setActiveTopic/categories lấy từ Layout qua useOutletContext()
     — chọn danh mục ở đây hoặc ở sidebar trái đều đồng bộ 2 chiều.

   - formatRelativeTime / getInitials / mapApiPost được EXPORT để
     PostDetailPage.jsx dùng lại y hệt, đảm bảo 2 trang luôn hiển thị
     đồng bộ dữ liệu (không lệch field khi BE đổi DTO).

   MỚI — Nút "Quay lại" ở PostDetailPage nhớ đúng nơi xuất phát:
   - Mỗi Link trỏ tới `/bai-viet/{id}` (tiêu đề, số bình luận, nút "Bình
     luận") giờ kèm `state.backTo` = đường dẫn hiện tại của trang Feed này
     (bao gồm cả query nếu có). PostDetailPage đọc lại state này để nút
     quay lại trỏ đúng về đây, giống hệt cách ProfilePage đã làm.

   FIX (quan trọng) — Lỗi 400 "The Title field is required":
   - Backend action Create() dùng [FromForm] ForumPostCreateDto + List<IFormFile>?
     images -> BẮT BUỘC request phải là Content-Type: multipart/form-data.
   - Trước đây handleSubmitPost gửi 1 object JS thường (title, categoryId,
     content, imageUrls: [blobURL...]) -> nếu memberApi gửi dạng JSON thì
     model binder [FromForm] không đọc được field nào cả (kể cả Title) ->
     400 "Title field is required".
   - Ảnh trước đây chỉ lưu blob URL tạm (URL.createObjectURL) chứ không giữ
     lại File gốc -> không có gì để đính kèm thật vào multipart cho server
     upload lên S3.
   - Sửa: handleFiles giữ lại `file` gốc trong state ảnh; handleSubmitPost
     build FormData đúng tên field mà DTO/action cần (Title, CategoryId,
     Content, images) rồi gọi memberApi.createForumPost(formData). Bỏ hẳn
     việc tự gửi imageUrls từ FE (server tự upload file thật rồi set
     dto.ImageUrls ở phía BE).
   - LƯU Ý: memberApi.createForumPost cần đảm bảo KHÔNG set cứng
     "Content-Type: application/json" khi body là FormData — để axios/fetch
     tự set "multipart/form-data; boundary=..." (xem ghi chú cuối file).

   MỚI — Thu nhỏ chiều cao khung "Hôm nay bạn muốn chia sẻ điều gì?" (desktop,
   trạng thái thu gọn chưa bấm vào) cho gọn hơn, và cho phép bấm vào ảnh
   trong bài viết để xem to (lightbox) — xem state `lightboxImage` +
   component `ImageLightbox` cuối file.

   MỚI — Xác định bài viết có phải của chính mình để hiện nút "..." xoá bài:
   - mapApiPost giờ map thêm `authorId` (= p.memberId) cho mỗi bài viết.
   - Khi vào trang, gọi memberApi.getMyProfile() một lần để biết
     `currentMemberId` (id của người đang đăng nhập) — LƯU Ý: nếu dự án đã
     có sẵn context/hook auth (ví dụ AuthContext, hoặc decode từ JWT) thì
     nên dùng lại thay vì gọi thêm API này, tránh gọi dư thừa.
   - Nút "..." trong header mỗi bài viết chỉ hiện MENU xoá khi
     `post.authorId === currentMemberId`. Bấm "Xoá bài viết" sẽ hỏi xác
     nhận rồi gọi memberApi.deleteForumPost(postId), xoá lạc quan khỏi
     danh sách khi thành công.

   Responsive (breakpoint 860px, đồng bộ với Layout.jsx).
   ============================================================================ */

const SORT_TABS = [
    { key: "newest", label: "Mới nhất" },
    { key: "trending", label: "Thịnh hành" },
];

const MAX_IMAGES = 4;

/* Chuyển ISO date -> "x giờ trước" kiểu tiếng Việt, đơn giản không cần thư viện */
export function formatRelativeTime(dateString) {
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

/* Avatar chữ cái đầu — dùng khi memberAvatar null (hội viên chưa đăng ký khuôn mặt) */
export function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || "?").charAt(0).toUpperCase();
}

/* Chuẩn hoá 1 ForumPostDto từ API sang field UI dùng bên dưới.
   EXPORT để PostDetailPage.jsx gọi lại đúng logic này khi fetch chi tiết 1 bài. */
export function mapApiPost(p) {
    return {
        id: p.postId,
        authorId: p.memberId, // MỚI — dùng để so sánh "có phải bài của mình không"
        author: p.memberName ?? "Ẩn danh",
        avatar: p.memberAvatar || null, // null/rỗng -> FE fallback chữ cái đầu
        tag: p.categoryName ?? "",
        time: formatRelativeTime(p.createdAt),
        title: p.title ?? "",
        content: p.content ?? "",
        images: p.imageUrls ?? [],
        likes: p.likeCount ?? 0,
        comments: p.commentCount ?? 0,
        isLiked: p.isLikedByCurrentUser ?? false,
        postType: p.postType,
    };
}

/* ---------------------------------------------------------------------- */
/* Form đăng bài — DÙNG CHUNG cho cả desktop (inline) và mobile (overlay). */
/* ---------------------------------------------------------------------- */
function PostComposerForm({ variant, title, setTitle, topic, setTopic, content, setContent, images, addImages, removeImage, topicOptions, onCancel, onSubmit, submitting }) {
    const fileInputRef = useRef(null);

    const openFilePicker = () => fileInputRef.current?.click();

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const next = files.slice(0, Math.max(0, MAX_IMAGES - images.length)).map((file) => ({
            id: `${Date.now()}-${Math.random()}`,
            url: URL.createObjectURL(file),
            // FIX: giữ lại File gốc để gửi thật lên server qua FormData (field "images").
            // Trước đây chỉ có `url` (blob tạm trên trình duyệt) nên không có gì đính kèm
            // thật khi submit -> server không upload được ảnh lên S3.
            file,
        }));
        addImages(next);
        e.target.value = "";
    };

    return (
        <div className={"composer-form composer-form--" + variant}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFiles}
            />

            <label className="composer-field">
                <span className="composer-label">Tiêu đề</span>
                <input
                    className="composer-input"
                    placeholder="Nhập tiêu đề bài viết..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </label>

            <label className="composer-field">
                <span className="composer-label">Chủ đề</span>
                <div className="composer-select-wrap">
                    <select
                        className="composer-select"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    >
                        <option value="">Chọn chủ đề</option>
                        {topicOptions.map((t) => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                    </select>
                    <ChevronRight size={16} className="composer-select-chevron" />
                </div>
            </label>

            <label className="composer-field">
                <span className="composer-label">Nội dung</span>
                <textarea
                    className="composer-textarea"
                    placeholder="Chia sẻ kinh nghiệm, câu chuyện của bạn..."
                    rows={variant === "desktop" ? 4 : 5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </label>

            <div className="composer-images">
                {images.map((img) => (
                    <div key={img.id} className="composer-image-thumb">
                        <img src={img.url} alt="" />
                        <button
                            type="button"
                            className="composer-image-remove"
                            aria-label="Xoá ảnh"
                            onClick={() => removeImage(img.id)}
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                ))}
                {images.length < MAX_IMAGES && (
                    <button type="button" className="composer-image-add" onClick={openFilePicker} aria-label="Thêm ảnh">
                        <Plus size={20} />
                    </button>
                )}
            </div>

            <div className="composer-toolbar">
                <div className="composer-toolbar__tools">
                    <button type="button" className="feed-tool-btn" onClick={openFilePicker}>
                        <ImagePlus size={15} /> Ảnh / Video
                    </button>
                    <button type="button" className="feed-tool-btn">
                        <AtSign size={15} /> Gắn thẻ
                    </button>
                </div>
                {variant === "desktop" && (
                    <div className="composer-toolbar__actions">
                        <button type="button" className="feed-cancel-btn" onClick={onCancel}>Hủy</button>
                        <button type="button" className="feed-post-btn" onClick={onSubmit} disabled={submitting}>
                            {submitting ? "Đang đăng..." : "Đăng bài"}
                        </button>
                    </div>
                )}
            </div>

            {variant === "mobile" && (
                <button
                    type="button"
                    className="feed-post-btn feed-post-btn--block composer-submit--mobile"
                    onClick={onSubmit}
                    disabled={submitting}
                >
                    {submitting ? "Đang đăng..." : "Đăng bài"}
                </button>
            )}
        </div>
    );
}

/* Avatar tác giả dùng chung cho card bài viết trong feed — ưu tiên ảnh thật
   (memberAvatar/FaceDatum.ProfileImage), fallback chữ cái đầu khi null. */
function PostAuthorAvatar({ name, avatar }) {
    if (avatar) {
        return <img src={avatar} alt="" className="feed-post__avatar" />;
    }
    return (
        <div className="feed-post__avatar feed-post__avatar--initial">
            {getInitials(name)}
        </div>
    );
}

/* MỚI — Lightbox xem ảnh to khi bấm vào ảnh trong bài viết. Bấm nền tối,
   nút X, hoặc phím Esc đều đóng lại. */
function ImageLightbox({ src, onClose }) {
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    if (!src) return null;

    return (
        <div className="image-lightbox" onClick={onClose}>
            <button
                type="button"
                className="image-lightbox__close"
                aria-label="Đóng"
                onClick={onClose}
            >
                <X size={22} />
            </button>
            <img
                src={src}
                alt=""
                className="image-lightbox__img"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

export default function CommunityFeedPage() {
    /* activeTopic/setActiveTopic/categories đến từ Layout (sidebar trái) */
    const { activeTopic, setActiveTopic, categories } = useOutletContext();
    const topicOptions = categories.filter((c) => c.key !== "all"); // dùng cho select "Chủ đề" khi đăng bài

    /* MỚI — cần location để gắn state.backTo vào các Link trỏ tới bài viết,
       giúp PostDetailPage biết quay lại đúng trang Feed này (kèm query nếu có). */
    const location = useLocation();
    /* MỚI — khi được điều hướng từ nút "+" ở bottom nav (Layout), tự mở overlay tạo bài viết */
    useEffect(() => {
        if (location.state?.openComposer) {
            setComposerOpen(true);
            // xoá state để lần back/forward sau không tự mở lại
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);
    const feedBackTo = `${location.pathname}${location.search}`;

    const [activeSort, setActiveSort] = useState("newest");
    const [search, setSearch] = useState("");
    const [composerOpen, setComposerOpen] = useState(false);
    const [desktopComposerOpen, setDesktopComposerOpen] = useState(false);

    /* MỚI — ảnh đang được xem to (lightbox), null = không mở */
    const [lightboxImage, setLightboxImage] = useState(null);

    /* State của form đăng bài — dùng chung giữa bản desktop và modal mobile */
    const [postTitle, setPostTitle] = useState("");
    const [postTopic, setPostTopic] = useState("");
    const [postContent, setPostContent] = useState("");
    const [postImages, setPostImages] = useState([]); // { id, url, file }
    const [submitting, setSubmitting] = useState(false);

    /* Danh sách bài viết — GỌI API, lọc theo activeTopic + activeSort */
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    /* MỚI (Cách B) — id của người đang đăng nhập, lấy qua memberApi.getMyProfile().
       Dùng để so sánh post.authorId === currentMemberId, quyết định có hiện
       nút "..." xoá bài hay không. Nếu dự án đã có context/hook auth sẵn
       (AuthContext, JWT decode...) thì nên thay đoạn này bằng cái đó. */
    const [currentMemberId, setCurrentMemberId] = useState(null);

    useEffect(() => {
        let mounted = true;
        memberApi
            .getMyProfile()
            .then((res) => {
                if (!mounted) return;
                const raw = res?.data ?? res;
                setCurrentMemberId(raw?.memberId ?? raw?.id ?? null);
            })
            .catch((err) => {
                console.error("Không thể xác định người dùng hiện tại:", err);
            });
        return () => {
            mounted = false;
        };
    }, []);

    /* MỚI — menu "..." (xoá bài viết) đang mở cho bài nào, null = không mở */
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const menuRef = useRef(null);

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

    useEffect(() => {
        let mounted = true;
        setPostsLoading(true);
        setPostsError(null);
        const params = {
            // CategoryId ở BE là số nguyên, category.key đang là string -> ép Number
            ...(activeTopic !== "all" ? { categoryId: Number(activeTopic) } : {}),
            // GetFeedAsync chỉ nhận biết "trending", còn lại mặc định là mới nhất
            ...(activeSort === "trending" ? { sort: "trending" } : {}),
        };
        memberApi
            .getForumPosts(params)
            .then((res) => {
                if (!mounted) return;
                const payload = res?.data ?? res ?? [];
                // BE trả về { items, total } (do GetFeedAsync trả tuple Items/Total)
                // nhưng cũng phòng trường hợp API map thẳng thành mảng.
                const raw = Array.isArray(payload)
                    ? payload
                    : payload.items ?? payload.Items ?? payload.data ?? [];
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
    }, [activeTopic, activeSort, refreshKey]);

    const addImages = (next) => setPostImages((prev) => [...prev, ...next]);
    const removeImage = (id) =>
        setPostImages((prev) => {
            const target = prev.find((img) => img.id === id);
            if (target?.url) URL.revokeObjectURL(target.url); // dọn blob URL tránh leak bộ nhớ
            return prev.filter((img) => img.id !== id);
        });

    const resetPostForm = () => {
        postImages.forEach((img) => img.url && URL.revokeObjectURL(img.url));
        setPostTitle("");
        setPostTopic("");
        setPostContent("");
        setPostImages([]);
    };

    const handleDesktopCancel = () => {
        resetPostForm();
        setDesktopComposerOpen(false);
    };

    const handleSubmitPost = async () => {
        if (!postTitle.trim() || !postTopic || submitting) return;
        setSubmitting(true);
        try {
            /* FIX — action BE dùng [FromForm] ForumPostCreateDto + List<IFormFile>? images,
               nên PHẢI gửi multipart/form-data, không phải JSON. Field name phải khớp với
               property của ForumPostCreateDto (Title, CategoryId, Content...) — ASP.NET Core
               model binding không phân biệt hoa/thường nên "title" vẫn khớp "Title". */
            const formData = new FormData();
            formData.append("Title", postTitle);
            formData.append("CategoryId", String(Number(postTopic)));
            formData.append("Content", postContent ?? "");
            // Field "images" khớp với tham số [FromForm] List<IFormFile>? images của action.
            // Gửi File gốc, KHÔNG gửi blob URL — server tự upload rồi set ImageUrls.
            postImages.forEach((img) => {
                if (img.file) formData.append("images", img.file);
            });

            await memberApi.createForumPost(formData);
            resetPostForm();
            setDesktopComposerOpen(false);
            setComposerOpen(false);
            setRefreshKey((k) => k + 1); // refetch danh sách bài viết
        } catch (err) {
            console.error("Đăng bài thất bại:", err);
        } finally {
            setSubmitting(false);
        }
    };

    /* Tym / bỏ tym — gọi thật ForumLikeService.ToggleLikeAsync qua
       memberApi.toggleForumPostLike, trả về ForumLikeToggleResultDto
       { isLiked, likeCount } -> cập nhật lại đúng bài viết trong state. */
    const handleToggleLike = async (postId) => {
        try {
            const res = await memberApi.toggleForumPostLike(postId);
            const data = res?.data ?? res;
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, likes: data.likeCount, isLiked: data.isLiked } : p
                )
            );
        } catch (err) {
            console.error("Không thể tym bài viết:", err);
        }
    };

    /* MỚI — Xoá bài viết (chỉ hiện được cho bài của chính mình, xem điều
       kiện render nút "..." bên dưới). Xoá lạc quan khỏi danh sách khi
       server xác nhận thành công. */
    const handleDeletePost = async (postId) => {
        setOpenMenuId(null);
        const confirmDelete = window.confirm("Bạn có chắc muốn xoá bài viết này?");
        if (!confirmDelete) return;

        setDeletingId(postId);
        try {
            await memberApi.deleteForumPost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("Không thể xoá bài viết:", err);
            alert("Xoá bài viết thất bại, vui lòng thử lại.");
        } finally {
            setDeletingId(null);
        }
    };

    const composerProps = {
        title: postTitle, setTitle: setPostTitle,
        topic: postTopic, setTopic: setPostTopic,
        content: postContent, setContent: setPostContent,
        images: postImages, addImages, removeImage,
        topicOptions,
        onSubmit: handleSubmitPost,
        submitting,
    };

    return (
        <div className="feed">
            <style>{CSS}</style>

            {/* ================= DESKTOP: thu gọn 1 dòng, bấm vào mới "to ra" thành form ================= */}
            <div className="panel feed-composer desktop-only">
                {!desktopComposerOpen ? (
                    <button
                        type="button"
                        className="feed-composer__row feed-composer__row--trigger"
                        onClick={() => setDesktopComposerOpen(true)}
                    >
                        <img src="https://i.pravatar.cc/80?img=13" alt="" className="feed-composer__avatar" />
                        <span className="feed-composer__placeholder">Hôm nay bạn muốn chia sẻ điều gì?</span>
                    </button>
                ) : (
                    <>
                        <div className="feed-composer__row">
                            <img src="https://i.pravatar.cc/80?img=13" alt="" className="feed-composer__avatar" />
                            <p className="feed-composer__heading">Hôm nay bạn muốn chia sẻ điều gì?</p>
                        </div>
                        <PostComposerForm variant="desktop" {...composerProps} onCancel={handleDesktopCancel} />
                    </>
                )}
            </div>

            {/* ================= MOBILE: hero (ảnh nền + tiêu đề + CTA + search) ================= */}
            <div className="mobile-only feed-mobile-hero">
                <div className="feed-mobile-hero__bg" />
                <div className="feed-mobile-hero__content">
                    <h1 className="feed-mobile-hero__title">
                        Cộng <span>Đồng</span>
                    </h1>
                    <p className="feed-mobile-hero__desc">
                        Chia sẻ hành trình, kinh nghiệm và động lực tập luyện mỗi ngày.
                    </p>
                    <button className="feed-post-btn feed-post-btn--block" onClick={() => setComposerOpen(true)}>
                        <Plus size={16} strokeWidth={2.5} /> Tạo bài viết
                    </button>
                    <div className="feed-search">
                        <Search size={16} className="feed-search__icon-left" />
                        <input
                            placeholder="Tìm kiếm bài viết..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button className="feed-search__btn" aria-label="Tìm kiếm">
                            <Search size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ================= MOBILE: màn hình "Tạo bài viết" toàn màn hình ================= */}
            {composerOpen && (
                <div className="mobile-composer-overlay mobile-only">
                    <header className="mobile-composer__header">
                        <button className="mobile-composer__back" aria-label="Quay lại" onClick={() => setComposerOpen(false)}>
                            <ArrowLeft size={20} />
                        </button>
                        <span className="mobile-composer__title">Tạo bài viết</span>
                        <span className="mobile-composer__spacer" />
                    </header>
                    <div className="mobile-composer__body">
                        <PostComposerForm variant="mobile" {...composerProps} />
                    </div>
                </div>
            )}

            {/* ================= Tab chủ đề (desktop: pill chữ cuộn ngang) — dùng chung với sidebar ================= */}
            <div className="feed-topics desktop-only">
                <div className="feed-topics__scroll">
                    {categories.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTopic(t.key)}
                            className={"feed-topic-pill" + (activeTopic === t.key ? " is-active" : "")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <button className="feed-topics__arrow" aria-label="Xem thêm">›</button>
            </div>

            {/* ================= Tab chủ đề (mobile: icon tròn cuộn ngang) — dùng chung với sidebar ================= */}
            <div className="feed-topics-mobile mobile-only">
                {categories.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTopic(t.key)}
                        className={"feed-topic-chip" + (activeTopic === t.key ? " is-active" : "")}
                    >
                        <span className="feed-topic-chip__icon">
                            <t.icon size={18} strokeWidth={2} />
                        </span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ================= Tab sắp xếp (BE chỉ hỗ trợ "newest" mặc định + "trending") ================= */}
            <div className="feed-sort-tabs">
                {SORT_TABS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setActiveSort(s.key)}
                        className={"feed-sort-tab" + (activeSort === s.key ? " is-active" : "")}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ================= Danh sách bài viết ================= */}
            <div className="feed-list">
                {postsLoading && (
                    <div className="panel" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        Đang tải bài viết...
                    </div>
                )}
                {!postsLoading && postsError && (
                    <div className="panel" style={{ textAlign: "center", color: "var(--accent)" }}>
                        {postsError}
                    </div>
                )}
                {!postsLoading && !postsError && posts.length === 0 && (
                    <div className="panel" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        Chưa có bài viết nào trong danh mục này.
                    </div>
                )}
                {!postsLoading && !postsError && posts.map((post) => {
                    // MỚI — bài viết này có phải của chính mình không (so sánh authorId với currentMemberId)
                    const isOwnPost =
                        currentMemberId != null &&
                        post.authorId != null &&
                        String(post.authorId) === String(currentMemberId);

                    return (
                        <article
                            key={post.id}
                            className={"panel feed-post" + (deletingId === post.id ? " is-deleting" : "")}
                        >
                            <header className="feed-post__header">
                                <PostAuthorAvatar name={post.author} avatar={post.avatar} />
                                <div className="feed-post__meta">
                                    <div className="feed-post__author-row">
                                        <span className="feed-post__author">{post.author}</span>
                                        <span className="feed-post__tag">{post.tag}</span>
                                    </div>
                                    <span className="feed-post__time">{post.time}</span>
                                </div>

                                {/* MỚI — chỉ hiện nút "..." xoá bài khi đây là bài viết của chính mình */}
                                {isOwnPost && (
                                    <div
                                        className="feed-post__more-wrap"
                                        ref={openMenuId === post.id ? menuRef : null}
                                    >
                                        <button
                                            className="feed-post__more"
                                            aria-label="Tùy chọn"
                                            disabled={deletingId === post.id}
                                            onClick={() =>
                                                setOpenMenuId((prev) => (prev === post.id ? null : post.id))
                                            }
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>

                                        {openMenuId === post.id && (
                                            <div className="feed-post__menu">
                                                <button
                                                    className="feed-post__menu-item feed-post__menu-item--danger"
                                                    onClick={() => handleDeletePost(post.id)}
                                                >
                                                    <Trash2 size={14} /> Xoá bài viết
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </header>

                            {/* MỚI — kèm state.backTo để PostDetailPage quay lại đúng Feed này */}
                            <Link
                                to={`/bai-viet/${post.id}`}
                                state={{ backTo: feedBackTo }}
                                className="feed-post__title-link"
                            >
                                <h3 className="feed-post__title">{post.title}</h3>
                            </Link>
                            <p className="feed-post__content">{post.content}</p>

                            {post.images.length > 0 && (
                                <div className="feed-post__images">
                                    {post.images.map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt=""
                                            // MỚI — bấm vào ảnh để xem to (lightbox), không điều hướng đi đâu khác
                                            onClick={() => setLightboxImage(src)}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="feed-post__stats">
                                <button
                                    className={"feed-post__like-btn" + (post.isLiked ? " is-liked" : "")}
                                    onClick={() => handleToggleLike(post.id)}
                                    aria-label="Tym bài viết"
                                >
                                    <Heart size={14} fill={post.isLiked ? "currentColor" : "none"} /> {post.likes}
                                </button>
                                {/* MỚI — kèm state.backTo */}
                                <Link
                                    to={`/bai-viet/${post.id}`}
                                    state={{ backTo: feedBackTo }}
                                    className="feed-post__stat-link"
                                >
                                    <MessageCircle size={14} /> {post.comments}
                                </Link>
                                <button className="feed-post__save mobile-only" aria-label="Lưu bài viết">
                                    <Bookmark size={17} />
                                </button>
                            </div>

                            <div className="feed-post__actions desktop-only">
                                <button
                                    className={"feed-action-btn" + (post.isLiked ? " is-liked" : "")}
                                    onClick={() => handleToggleLike(post.id)}
                                >
                                    <Heart size={15} fill={post.isLiked ? "currentColor" : "none"} /> Thích
                                </button>
                                {/* MỚI — kèm state.backTo */}
                                <Link
                                    to={`/bai-viet/${post.id}`}
                                    state={{ backTo: feedBackTo }}
                                    className="feed-action-btn feed-action-btn--link"
                                >
                                    <MessageCircle size={15} /> Bình luận
                                </Link>
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* MỚI — Lightbox xem ảnh to, render ở cuối để luôn nằm trên cùng */}
            <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* CSS — nhúng trực tiếp, dùng chung biến màu với Layout.jsx (:root)      */
/* ---------------------------------------------------------------------- */

const CSS = `
:root {
  --accent: #FF5722;
  --accent-start: #FF7A3D;
  --accent-end: #FF4B1F;
  --accent-soft: rgba(255, 87, 34, 0.14);
}

.feed { display: flex; flex-direction: column; gap: 16px; }

.desktop-only { display: block; }
.mobile-only { display: none; }
@media (max-width: 860px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }
}

.feed-composer { padding: 22px 24px; }
.feed-composer__row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.feed-composer__avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.feed-composer__heading { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }

/* MỚI — khung thu gọn "Hôm nay bạn muốn chia sẻ điều gì?" thấp lại cho gọn:
   giảm padding trên dưới + thu nhỏ avatar riêng cho trạng thái này. */
.feed-composer__row--trigger {
  width: 100%; border: none; background: var(--bg-input); cursor: pointer;
  margin-bottom: 0; padding: 8px 16px; border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle); text-align: left;
}
.feed-composer__row--trigger:hover { border-color: var(--accent); }
.feed-composer__row--trigger .feed-composer__avatar { width: 36px; height: 36px; }
.feed-composer__placeholder { font-size: 15px; color: var(--text-muted); }

.composer-toolbar__actions { display: flex; align-items: center; gap: 10px; }
.feed-cancel-btn {
  border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary);
  border-radius: var(--radius-md); padding: 11px 20px; font-weight: 600; font-size: 14px; cursor: pointer;
}
.feed-cancel-btn:hover { color: var(--text-primary); background: var(--bg-panel-hover); }

.feed-tool-btn {
  display: flex; align-items: center; gap: 6px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 6px 4px;
}
.feed-tool-btn:hover { color: var(--text-primary); }

.feed-post-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: none; border-radius: var(--radius-md); padding: 11px 26px; font-weight: 700; font-size: 14px;
  color: #fff; cursor: pointer; white-space: nowrap;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}
.feed-post-btn:disabled { opacity: .6; cursor: not-allowed; }
.feed-post-btn--block { width: 100%; padding: 14px; margin-bottom: 14px; font-size: 15px; }

.composer-form { display: flex; flex-direction: column; gap: 16px; }
.composer-form--desktop { gap: 18px; }

.composer-field { display: flex; flex-direction: column; gap: 8px; }
.composer-label { font-size: 12.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .3px; }

.composer-input, .composer-textarea {
  width: 100%; border: 1px solid var(--border-subtle); background: var(--bg-input);
  border-radius: var(--radius-md); padding: 12px 14px; color: var(--text-primary);
  font-size: 14px; outline: none; font-family: inherit;
}
.composer-form--desktop .composer-input,
.composer-form--desktop .composer-textarea { padding: 14px 16px; font-size: 15px; }
.composer-input::placeholder, .composer-textarea::placeholder { color: var(--text-muted); }
.composer-textarea { resize: vertical; line-height: 1.6; }

.composer-select-wrap { position: relative; }
.composer-select {
  width: 100%; appearance: none; border: 1px solid var(--border-subtle); background: var(--bg-input);
  border-radius: var(--radius-md); padding: 12px 36px 12px 14px; color: var(--text-primary);
  font-size: 14px; outline: none; font-family: inherit; cursor: pointer;
}
.composer-form--desktop .composer-select { padding: 14px 40px 14px 16px; font-size: 15px; }
.composer-select:invalid, .composer-select option[value=""] { color: var(--text-muted); }
.composer-select-chevron {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%) rotate(90deg);
  color: var(--text-muted); pointer-events: none;
}

.composer-images { display: flex; gap: 10px; flex-wrap: wrap; }
.composer-image-thumb, .composer-image-add {
  width: 76px; height: 76px; border-radius: var(--radius-md); flex-shrink: 0; position: relative;
  overflow: hidden;
}
.composer-form--desktop .composer-image-thumb,
.composer-form--desktop .composer-image-add { width: 92px; height: 92px; }
.composer-image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.composer-image-remove {
  position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%;
  border: none; background: rgba(0,0,0,.65); color: #fff; display: grid; place-items: center; cursor: pointer;
}
.composer-image-add {
  border: 1.5px dashed var(--border-subtle); background: var(--bg-input); color: var(--text-muted);
  display: grid; place-items: center; cursor: pointer;
}
.composer-image-add:hover { color: var(--accent); border-color: var(--accent); }

.composer-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.composer-toolbar__tools { display: flex; gap: 18px; }

.composer-submit--mobile { margin-top: 4px; }

.feed-mobile-hero {
  position: relative;
  margin: -20px -16px 0;
  padding: 28px 16px 18px;
  overflow: hidden;
}
.feed-mobile-hero__bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(180deg, rgba(12,12,14,.55) 0%, var(--bg-app) 92%),
    url(https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=900&auto=format&fit=crop);
  background-size: cover; background-position: center 30%;
  filter: saturate(1.05);
}
.feed-mobile-hero__content { position: relative; z-index: 1; }
.feed-mobile-hero__title { font-size: 28px; font-weight: 800; margin: 0 0 8px; color: #fff; }
.feed-mobile-hero__title span { color: var(--accent); }
.feed-mobile-hero__desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; line-height: 1.5; max-width: 320px; }

.feed-search {
  display: flex; align-items: center; gap: 8px; border: 1px solid var(--border-subtle);
  background: var(--bg-input); border-radius: var(--radius-md); padding: 6px 6px 6px 14px;
}
.feed-search__icon-left { color: var(--text-muted); flex-shrink: 0; }
.feed-search input {
  border: none; background: transparent; outline: none; color: var(--text-primary);
  font-size: 14px; flex: 1; min-width: 0;
}
.feed-search__btn {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: var(--radius-sm); border: none;
  background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; cursor: pointer;
}

.mobile-composer-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: var(--bg-app);
  display: flex; flex-direction: column;
}
.mobile-composer__header {
  flex: 0 0 auto; height: 56px; display: flex; align-items: center; justify-content: center;
  position: relative; border-bottom: 1px solid var(--border-subtle); background: var(--bg-panel);
}
.mobile-composer__back {
  position: absolute; left: 12px; width: 34px; height: 34px; border-radius: 50%;
  border: none; background: transparent; color: var(--text-primary); display: grid; place-items: center; cursor: pointer;
}
.mobile-composer__title { font-size: 15px; font-weight: 700; }
.mobile-composer__spacer { width: 34px; }
.mobile-composer__body { flex: 1 1 auto; overflow-y: auto; padding: 18px 16px 28px; }

.feed-topics {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-panel); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); padding: 8px 8px 8px 10px;
}
.feed-topics__scroll {
  display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; flex: 1;
}
.feed-topics__scroll::-webkit-scrollbar { display: none; }
.feed-topic-pill {
  flex-shrink: 0; border: none; border-radius: 999px; padding: 8px 16px; font-size: 13px;
  font-weight: 600; color: var(--text-secondary); background: var(--bg-panel-hover); cursor: pointer;
  white-space: nowrap;
}
.feed-topic-pill.is-active {
  color: #fff; background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}
.feed-topics__arrow {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border-subtle);
  background: var(--bg-panel-hover); color: var(--text-secondary); cursor: pointer;
}

.feed-topics-mobile {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: flex-start;
  gap: 18px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 16px 6px;
  scrollbar-width: none;
}
.feed-topics-mobile::-webkit-scrollbar { display: none; }
.feed-topic-chip {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  border: none; background: transparent; color: var(--text-muted); font-size: 11.5px; cursor: pointer;
  padding: 0; white-space: nowrap;
}
.feed-topic-chip__icon {
  width: 44px; height: 44px; display: grid; place-items: center;
  border-radius: 50%; background: var(--bg-panel-hover); color: var(--text-secondary);
  transition: background .15s, color .15s;
}
.feed-topic-chip.is-active { color: var(--accent); font-weight: 700; }
.feed-topic-chip.is-active .feed-topic-chip__icon {
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  color: #fff;
}

.feed-sort-tabs {
  display: flex; flex-wrap: nowrap; gap: 24px; overflow-x: auto; scrollbar-width: none;
  padding: 4px 16px 10px; border-bottom: 1px solid var(--border-subtle);
}
.feed-sort-tabs::-webkit-scrollbar { display: none; }
@media (min-width: 861px) {
  .feed-sort-tabs { padding: 0; margin-top: -4px; }
}
.feed-sort-tab {
  flex: 0 0 auto;
  border: none; background: transparent; color: var(--text-muted); font-size: 14px; font-weight: 600;
  cursor: pointer; padding: 0 0 10px; position: relative; white-space: nowrap;
}
.feed-sort-tab.is-active { color: var(--accent); }
.feed-sort-tab.is-active::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent);
}

.feed-list { display: flex; flex-direction: column; gap: 16px; }
@media (max-width: 860px) {
  .feed-list { gap: 0; }
  .feed-post { border-radius: 0; border-left: none; border-right: none; border-bottom-width: 6px; }
}

.feed-post { transition: opacity .15s ease; }
.feed-post.is-deleting { opacity: .45; pointer-events: none; }

.feed-post__header { display: flex; align-items: center; gap: 10px; }
.feed-post__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.feed-post__avatar--initial {
  display: grid; place-items: center; font-size: 15px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
}
.feed-post__meta { flex: 1; min-width: 0; }
.feed-post__author-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.feed-post__author { font-weight: 700; font-size: 14px; }
.feed-post__tag {
  font-size: 11px; font-weight: 700; color: var(--accent); background: var(--accent-soft);
  padding: 2px 8px; border-radius: 999px;
}
.feed-post__time { font-size: 12px; color: var(--text-muted); }

/* MỚI — nút "..." + menu xoá bài viết */
.feed-post__more-wrap { position: relative; }
.feed-post__more {
  border: none; background: transparent; color: var(--text-muted); cursor: pointer;
  display: grid; place-items: center; padding: 4px; border-radius: 6px;
}
.feed-post__more:hover { color: var(--text-primary); background: var(--bg-panel-hover); }
.feed-post__more:disabled { opacity: .5; cursor: not-allowed; }

.feed-post__menu {
  position: absolute; top: 100%; right: 0; margin-top: 6px; z-index: 10;
  background: var(--bg-panel-hover); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); min-width: 160px; padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.feed-post__menu-item {
  width: 100%; display: flex; align-items: center; gap: 8px; text-align: left;
  border: none; background: transparent; color: var(--text-primary); font-size: 13px; font-weight: 600;
  padding: 9px 10px; border-radius: 6px; cursor: pointer;
}
.feed-post__menu-item:hover { background: rgba(255,255,255,0.06); }
.feed-post__menu-item--danger { color: #e8482f; }
.feed-post__menu-item--danger:hover { background: rgba(232,72,47,0.12); }

.feed-post__title-link { text-decoration: none; }
.feed-post__title { font-size: 16px; font-weight: 700; margin: 12px 0 6px; color: var(--text-primary); }
.feed-post__title-link:hover .feed-post__title { color: var(--accent); }
.feed-post__content { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 12px; }

.feed-post__images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
/* MỚI — con trỏ tay + hiệu ứng nhẹ khi hover để gợi ý bấm vào xem ảnh to */
.feed-post__images img {
  width: 100%; height: 140px; object-fit: cover; border-radius: var(--radius-md);
  cursor: pointer; transition: opacity .15s;
}
.feed-post__images img:hover { opacity: .88; }
@media (max-width: 480px) {
  .feed-post__images { grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .feed-post__images img { height: 90px; border-radius: var(--radius-sm); }
}

.feed-post__stats {
  display: flex; align-items: center; gap: 18px; margin-top: 14px; font-size: 13px; color: var(--text-secondary);
}
.feed-post__stats span { display: flex; align-items: center; gap: 5px; }
.feed-post__stat-link {
  display: flex; align-items: center; gap: 5px; text-decoration: none; color: var(--text-secondary);
}
.feed-post__stat-link:hover { color: var(--accent); }
.feed-post__like-btn {
  display: flex; align-items: center; gap: 5px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; cursor: pointer; padding: 0;
}
.feed-post__like-btn.is-liked { color: var(--accent); }
.feed-post__save {
  margin-left: auto; border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; display: grid; place-items: center;
}

.feed-post__actions {
  display: flex; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-subtle);
}
.feed-action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid var(--border-subtle); background: var(--bg-panel-hover);
  color: var(--text-secondary); border-radius: var(--radius-md); padding: 9px; font-size: 13.5px;
  font-weight: 600; cursor: pointer; text-decoration: none;
}
.feed-action-btn:hover { color: var(--text-primary); }
.feed-action-btn.is-liked { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.feed-action-btn--link { box-sizing: border-box; }

/* MỚI — Lightbox xem ảnh to toàn màn hình */
.image-lightbox {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0, 0, 0, .88);
  display: flex; align-items: center; justify-content: center;
  padding: 32px; cursor: zoom-out;
}
.image-lightbox__img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  border-radius: var(--radius-md); cursor: default;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.image-lightbox__close {
  position: absolute; top: 18px; right: 18px; width: 40px; height: 40px; border-radius: 50%;
  border: none; background: rgba(255,255,255,.12); color: #fff; display: grid; place-items: center;
  cursor: pointer;
}
.image-lightbox__close:hover { background: rgba(255,255,255,.2); }
@media (max-width: 480px) {
  .image-lightbox { padding: 16px; }
}
`;