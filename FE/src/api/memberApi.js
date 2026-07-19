import authApi from "./authApi";

const memberApi = {
    // =========================================================================
    // TIN TỨC & TRANG CHỦ
    // =========================================================================
    getListNews() {
        return authApi.get("/api/news", false);
    },
    getHomeImages() {
        return authApi.get("/api/home-images/all", false);
    },
    getBranchesImage(id) {
        return authApi.get(`/api/branches/${id}/images`)
    },
    // =========================================================================
    // CHI NHÁNH
    // =========================================================================
    getBranches(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/branches?${query}` : "/api/branches";
        return authApi.get(url, false);
    },
    getBranchDetail(id) {
        return authApi.get(`/api/branches/${id}`, false);
    },

    // =========================================================================
    // THIẾT BỊ
    // =========================================================================
    getAllEquipmentCategory() {
        return authApi.get("/api/EquipmentCategory", false);
    },
    getAll(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/equipment?${query}` : "/api/equipment";
        return authApi.get(url, true);
    },

    // =========================================================================
    // GÓI TẬP
    // =========================================================================
    getAllPackage() {
        return authApi.get("/api/packages", false);
    },

    // =========================================================================
    // THANH TOÁN
    // =========================================================================
    createPayment(planId, branchId) {
        return authApi.post("/api/payment/create", {
            planId,
            branchId,
        });
    },
    getPaymentStatus(orderCode) {
        return authApi.get(`/api/payment/status/${orderCode}`);
    },
    getMyinfoToPayment() {
        return authApi.get("/api/payment/my-info");
    },
    getPendingPayment() {
        return authApi.get("/api/payment/pending");
    },
    cancelPayment(orderCode) {
        return authApi.post(`/api/payment/cancel/${orderCode}`);
    },
    checkPendingPurchaseStatus() {
        return authApi.get("/api/payment/pending-purchase-status");
    },

    // =========================================================================
    // SỰ CỐ (Incidents)
    // =========================================================================
    createIncident(formData) {
        return authApi.post("/api/incidents", formData);
    },

    // =========================================================================
    // THỐNG KÊ (trang ThongKe)
    // =========================================================================
    getGymDensity(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/thong-ke/mat-do-phong-tap?${query}`
            : "/api/thong-ke/mat-do-phong-tap";
        return authApi.get(url, false);
    },
    // Lượng người tập theo giờ của 1 chi nhánh — dùng cho biểu đồ "Lượng người tập theo giờ"
    // ở trang chủ. Khớp với GymDensityController.GetDensityByBranch (BE):
    //   GET /api/GymDensity/branch/{branchId}?hoursCount=5
    // Trả về mảng: [{ hourSlot, headcount }, ...] theo thứ tự tăng dần thời gian.
    getGymDensityByBranch(branchId, hoursCount = 5) {
        const query = new URLSearchParams(
            Object.entries({ hoursCount }).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/GymDensity/branch/${branchId}?${query}`
            : `/api/GymDensity/branch/${branchId}`;
        return authApi.get(url, false);
    },
    getThongKeSummary() {
        return authApi.get("/api/thong-ke/tong-quan");
    },
    getCheckInHistory(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/thong-ke/lich-su-check-in?${query}`
            : "/api/thong-ke/lich-su-check-in";
        return authApi.get(url);
    },

    // =========================================================================
    // FORUM — DANH MỤC (sidebar "DANH MỤC")
    // =========================================================================
    getForumCategories() {
        return authApi.get("/api/forumCategory", false);
    },

    // =========================================================================
    // FORUM — BÀI VIẾT (feed "Diễn đàn")
    // =========================================================================
    getForumPosts(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/ForumPost?${query}` : "/api/ForumPost";
        return authApi.get(url, true);
    },
    getForumPostById(postId) {
        return authApi.get(`/api/ForumPost/${postId}`, true);
    },
    createForumPost(payload) {
        return authApi.post("/api/ForumPost", payload);
    },
    repostForumPost(payload) {
        return authApi.post("/api/ForumPost/repost", payload);
    },
    updateForumPost(postId, payload) {
        return authApi.put(`/api/ForumPost/${postId}`, payload);
    },
    deleteForumPost(postId) {
        return authApi.delete(`/api/ForumPost/${postId}`);
    },

    getForumTopMembers(range = "week") {
        return authApi.get(`/api/ForumPost/top-members?range=${range}`, false);
    },

    // =========================================================================
    // FORUM — TYM (LIKE) BÀI VIẾT
    // =========================================================================
    toggleForumPostLike(postId) {
        return authApi.post(`/api/forum-posts/${postId}/like`);
    },
    getForumPostLikeStatus(postId) {
        return authApi.get(`/api/forum-posts/${postId}/like/status`);
    },

    // =========================================================================
    // FORUM — BÌNH LUẬN
    // =========================================================================
    // Danh sách bình luận gốc (+ replies n cấp, dựng cây) của 1 bài viết.
    // params: { page, pageSize }
    getForumComments(postId, params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/forum/comments/post/${postId}?${query}`
            : `/api/forum/comments/post/${postId}`;
        return authApi.get(url, true);
    },
    // Tạo bình luận gốc hoặc trả lời. payload: { postId, content, parentCommentId }
    // (replyToMemberId được BE tự suy ra từ chủ của parentCommentId, không cần gửi lên)
    createForumComment(payload) {
        return authApi.post("/api/forum/comments", payload);
    },
    updateForumComment(commentId, payload) {
        return authApi.put(`/api/forum/comments/${commentId}`, payload);
    },
    deleteForumComment(commentId) {
        return authApi.delete(`/api/forum/comments/${commentId}`);
    },
    // Tym / bỏ tym 1 bình luận (toggle). Trả về { isLiked, likeCount }
    // NOTE: khớp với ForumCommentService.ToggleLikeAsync ở BE — nếu route thật
    // của bạn khác, chỉ cần đổi lại chuỗi URL bên dưới.
    toggleForumCommentLike(commentId) {
        return authApi.post(`/api/forum/comments/${commentId}/like`);
    },

    // =========================================================================
    // FORUM — THÔNG BÁO
    // =========================================================================
    getForumNotifications(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/forum-notifications?${query}` : "/api/forum-notifications";
        return authApi.get(url);
    },
    getForumUnreadNotificationCount() {
        return authApi.get("/api/forum-notifications/unread-count");
    },
    markForumNotificationAsRead(notificationId) {
        return authApi.put(`/api/forum-notifications/${notificationId}/read`);
    },
    markAllForumNotificationsAsRead() {
        return authApi.put("/api/forum-notifications/read-all");
    },

    getMyForumPosts() {
        return authApi.get("/api/ForumPost/my-posts");
    },
    deleteForumPost(postId) {
        return authApi.delete(`/api/ForumPost/${postId}`);
    },
    getForumStats() {
        return authApi.get("/api/ForumPost/stats", false);
    },
    getForumFeaturedPosts(top = 3) {
        return authApi.get(`/api/ForumPost/featured?top=${top}`, true);
    },

    getMyProfile() {
        return authApi.get("/api/members/me");
    },
    getMe() {
        return authApi.get("/api/members/my-profile")
    },
    updateMember(payload) {
        return authApi.put("/api/members/me", payload)
    },
    getInvoice(transactionId) {
        return authApi.getBlob(`/api/transactions/${transactionId}/invoice`);
    },
    getApplicablePromotions(planId) {
        return authApi.get(`/api/plans/${planId}/applicable-promotions`);
    },
};

export default memberApi;