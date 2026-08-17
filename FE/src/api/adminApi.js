import authApi from "./authApi";
const buildQuery = (params = {}) =>
    new URLSearchParams(
        Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && v !== ""
        )
    ).toString();
const adminApi = {
    getBranches(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/branches?${query}` : "/api/branches";
        return authApi.get(url, false);
    },
    getBranchesForAdmin(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/branches/admin?${query}` : "/api/branches/admin";
        return authApi.get(url);
    },
    getDetailBranch(id) {
        return authApi.get(`/api/branches/${id}`)
    },
    getAvailableManager() {
        return authApi.get(`/api/branches/available-managers`)
    },
    createBranch(formData) {
        return authApi.post("/api/branches", formData)
    },
     getEmployeeProfile() {
        return authApi.get("/api/employee/profile");
    },


    // PUT: api/branches/{id} — cập nhật thông tin chi nhánh (tên, địa chỉ, SĐT...)
    // TODO: kiểm tra lại đúng field BE nhận (branchName, address, phone, ...)
    updateBranch(id, data) {
        return authApi.put(`/api/branches/${id}`, data);
    },

    // PUT: api/branches/{id}/lock — khóa (tạm ngừng) chi nhánh
    // TODO: xác nhận lại route thật ở BE, đang đặt theo cùng pattern với lockMember
    lockBranch(id, reason) {
        return authApi.delete(`/api/branches/${id}`);
    },

    // PUT: api/branches/{id}/unlock — mở khóa chi nhánh
    // TODO: xác nhận lại route thật ở BE, đang đặt theo cùng pattern với unlockMember
    unlockBranch(id) {
        return authApi.put(`/api/branches/${id}/unlock`, {});
    },

    // Sửa lại cho đúng route BE: GET /api/branches/{id}/images (số nhiều, khớp BranchImagesController)
    getImagesBranch(id) {
        return authApi.get(`/api/branches/${id}/images`);
    },

    // Tải lên 1 hoặc nhiều ảnh cho 1 chi nhánh.
    // formData phải chứa field "Images" (nhiều file, append cùng key) và "ImageTypes" (append từng string theo đúng thứ tự với Images).
    addBranchImages(branchId, formData) {
        return authApi.post(`/api/branches/${branchId}/images`, formData);
    },

    // Cập nhật 1 ảnh: đổi loại ảnh / đổi file / đổi sortOrder.
    // formData chỉ cần chứa field nào muốn đổi (ImageType, Image, SortOrder).
    updateBranchImage(imageId, formData) {
        return authApi.put(`/api/branch-images/${imageId}`, formData);
    },

    // Xóa 1 ảnh.
    deleteBranchImage(imageId) {
        return authApi.delete(`/api/branch-images/${imageId}`);
    },

    // Đổi thứ tự nhiều ảnh cùng lúc.
    // items: [{ imageId, sortOrder }, ...]
    reorderBranchImages(branchId, items) {
        return authApi.put(`/api/branches/${branchId}/images/reorder`, { items });
    },

    // =========================================================================
    // EMPLOYEE (api/employee — EmployeeController ở BE)
    // Có 2 luồng tạo/quản lý nhân viên song song, KHÔNG trộn lẫn:
    //   - Luồng "Account": nhân viên có tài khoản đăng nhập (email/mật khẩu), không đụng FaceID.
    //   - Luồng "FaceID": nhân viên đăng ký khuôn mặt để chấm công, không đụng tài khoản đăng nhập.
    // Danh sách nhân viên cũng tách riêng theo 2 luồng (GET / vs GET /accounts).
    // =========================================================================

    // ----- Xem hồ sơ / danh sách -----

    // GET: api/employee/profile — hồ sơ (info + FaceID) của chính mình.
    getEmployeeProfile() {
        return authApi.get("/api/employee/profile");
    },

    // GET: api/employee/{id} — hồ sơ (info + FaceID) của người khác. Admin/Manager.
    getEmployeeById(id) {
        return authApi.get(`/api/employee/${id}`);
    },

    // GET: api/employee/{id}/account — hồ sơ (info + login) của 1 nhân viên thuộc luồng Account.
    getEmployeeAccountProfile(id) {
        return authApi.get(`/api/employee/${id}/account`);
    },

    // GET: api/employee?fullName=&phone=&branchId=&status=... — danh sách luồng FACEID
    // (chỉ những nhân viên CHƯA có Account).
    getEmployeeList(params = {}) {
        const query = buildQuery(params);
        const url = query ? `/api/employee?${query}` : "/api/employee";
        return authApi.get(url);
    },

    // GET: api/employee/accounts?... — danh sách luồng ACCOUNT
    // (chỉ những nhân viên ĐÃ có Account).
    getEmployeeAccountList(params = {}) {
        const query = buildQuery(params);
        const url = query ? `/api/employee/accounts?${query}` : "/api/employee/accounts";
        return authApi.get(url);
    },

    // ----- Tạo nhân viên -----

    // POST: api/employee/with-account — Luồng 1: tạo nhân viên KÈM tài khoản đăng nhập.
    // body JSON, không đụng FaceID. data: { fullName, phone, gender, roleId, branchIds, loginEmail, password }
    createEmployeeWithAccount(data) {
        return authApi.post("/api/employee/with-account", data);
    },

    // POST: api/employee/with-faceid (multipart/form-data) — Luồng 2: tạo nhân viên KÈM FaceID
    // (ảnh bắt buộc), không đụng tài khoản đăng nhập.
    // formData: FullName, Phone, Gender, RoleId, BranchIds, ProfileImage (bắt buộc), FaceIdReason
    createEmployeeWithFaceId(formData) {
        return authApi.post("/api/employee/with-faceid", formData);
    },

    // ----- Sửa thông tin cơ bản -----

    // PUT: api/employee/{id}/account-info — sửa info của nhân viên thuộc luồng ACCOUNT, không đụng FaceID.
    updateEmployeeAccountInfo(id, data) {
        return authApi.put(`/api/employee/${id}/account-info`, data);
    },

    // PUT: api/employee/{id}/info — sửa info của nhân viên thuộc luồng FACEID, không đụng tài khoản.
    updateEmployeeInfo(id, data) {
        return authApi.put(`/api/employee/${id}/info`, data);
    },

    // ----- Tài khoản đăng nhập -----

    // POST: api/employee/{id}/account — thêm tài khoản đăng nhập cho nhân viên đã có info nhưng chưa có account.
    addEmployeeAccount(id, data) {
        return authApi.post(`/api/employee/${id}/account`, data);
    },

    // PUT: api/employee/{id}/account — sửa tài khoản đăng nhập đã có (email đăng nhập, mật khẩu...).
    updateEmployeeAccount(id, data) {
        return authApi.put(`/api/employee/${id}/account`, data);
    },

    // PATCH: api/employee/{id}/account/lock — khóa CHỈ tài khoản đăng nhập (không đụng Employee.Status / FaceID).
    // Bắt buộc phải có reason.
    lockEmployeeAccountOnly(id, reason) {
        return authApi.patch(`/api/employee/${id}/account/lock`, { reason });
    },

    // PATCH: api/employee/{id}/account/unlock — mở khóa CHỈ tài khoản đăng nhập.
    unlockEmployeeAccountOnly(id) {
        return authApi.patch(`/api/employee/${id}/account/unlock`, {});
    },

    // ----- FaceID -----

    // PUT: api/employee/{id}/face (multipart/form-data) — sửa / đăng ký lại FaceID cho nhân viên.
    // formData: ProfileImage (file), Reason
    updateEmployeeFace(id, formData) {
        return authApi.put(`/api/employee/${id}/face`, formData);
    },

    // GET: api/employee/{id}/face-history — lịch sử cập nhật FaceID của nhân viên.
    getEmployeeFaceHistory(id) {
        return authApi.get(`/api/employee/${id}/face-history`);
    },

    // POST: api/faceid/employee/check (multipart/form-data) — kiểm tra trùng khuôn mặt trước khi
    // đăng ký/cập nhật FaceID. Route này KHÔNG thuộc EmployeeController (thuộc FaceId controller riêng)
    // nhưng vẫn để chung ở đây vì được dùng trực tiếp trong luồng FaceID.
    checkEmployeeFace(formData) {
        return authApi.post("/api/faceid/employee/check", formData);
    },

    // ----- Khóa / mở khóa toàn diện -----

    // PATCH: api/employee/{id}/hide — khóa toàn diện nhân viên (Employee.Status + Account nếu có).
    // Bắt buộc phải có reason.
    hideEmployee(id, reason) {
        return authApi.patch(`/api/employee/${id}/hide`, { reason });
    },

    // PATCH: api/employee/{id}/activate — mở khóa toàn diện nhân viên.
    activateEmployee(id) {
        return authApi.patch(`/api/employee/${id}/activate`, {});
    },

    // ----- Lịch sử cập nhật chung -----

    // GET: api/employee/{id}/history — lịch sử cập nhật chung (info/account/faceid...) của nhân viên.
    getEmployeeUpdateHistory(id) {
        return authApi.get(`/api/employee/${id}/history`);
    },

    // ===== Home Images (api/home-images — HomeImageController ở BE) =====
    // Quản lý ảnh hiển thị trên trang chủ (banner/slider).

    // GET: api/home-images — public, chỉ trả ảnh Status = "Active", đã sort theo SortOrder
    getHomeImages() {
        return authApi.get("/api/home-images", false);
    },

    // GET: api/home-images/all — admin, trả toàn bộ ảnh kể cả Inactive
    getAllHomeImages() {
        return authApi.get("/api/home-images/all");
    },

    // GET: api/home-images/{id}
    getHomeImageDetail(id) {
        return authApi.get(`/api/home-images/${id}`);
    },

    // POST: api/home-images (multipart/form-data)
    // formData: File, Title, LinkUrl, SortOrder
    createHomeImage(formData) {
        return authApi.post("/api/home-images", formData);
    },

    // PUT: api/home-images/{id} (multipart/form-data)
    // formData chỉ cần chứa field nào muốn đổi: File, Title, LinkUrl, SortOrder, Status
    updateHomeImage(id, formData) {
        return authApi.put(`/api/home-images/${id}`, formData);
    },

    // DELETE: api/home-images/{id} — xóa cả trên S3 lẫn DB
    deleteHomeImage(id) {
        return authApi.delete(`/api/home-images/${id}`);
    },

    // ===== Membership Plans (api/packages — MembershipPlanController ở BE) =====

    // GET: api/packages?packageName=...
    getMembershipPlans(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/packages?${query}` : "/api/packages";
        return authApi.get(url, false);
    },

    // GET: api/packages/{id}
    getMembershipPlanDetail(id) {
        return authApi.get(`/api/packages/${id}`);
    },

    // POST: api/packages
    createMembershipPlan(data) {
        return authApi.post("/api/packages", data);
    },

    // PUT: api/packages/{id}
    updateMembershipPlan(id, data) {
        return authApi.put(`/api/packages/${id}`, data);
    },

    // DELETE: api/packages/{id} (soft delete - chuyển Status sang Discontinued)
    deleteMembershipPlan(id) {
        return authApi.delete(`/api/packages/${id}`);
    },

    // ===== Equipment Categories (api/EquipmentCategory — EquipmentCategoryController ở BE) =====

    // GET: api/EquipmentCategory
    // BE trả thẳng List<EquipmentCategory> (không bọc { items }), nhưng FE
    // vẫn nên unwrap phòng hờ ở phía component để tránh crash nếu BE đổi shape sau này.
    getEquipmentCategories() {
        return authApi.get("/api/EquipmentCategory");
    },

    // GET: api/EquipmentCategory/{id}
    getEquipmentCategoryDetail(id) {
        return authApi.get(`/api/EquipmentCategory/${id}`);
    },

    createEquipmentCategory(data) {
        return authApi.post("/api/EquipmentCategory", data);
    },

    updateEquipmentCategory(id, data) {
        return authApi.put(`/api/EquipmentCategory/${id}`, data);
    },


    deleteEquipmentCategory(id) {
        return authApi.delete(`/api/EquipmentCategory/${id}`);
    },

    // ===== Members (api/members — MemberController ở BE) =====
    // Dùng chung cho các trang quản lý hội viên (admin/manager/cashier).
    // managerApi.js chỉ là lớp tái sử dụng lại các hàm này, không viết lại logic gọi API.

    // GET: api/members?fullName=&phone=&branchId=&status=...
    getListMembers(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/members?${query}` : "/api/members";
        return authApi.get(url);
    },

    // GET: api/members/{id}
    getMemberDetail(id) {
        return authApi.get(`/api/members/${id}`);
    },

    // PUT: api/members/{id}
    // BE (MemberService.UpdateMemberInfoAsync) chỉ đọc 4 field: fullName, phone, gender, internalNotes.
    updateMember(id, data) {
        return authApi.put(`/api/members/${id}`, data);
    },

    // PUT: api/members/{id}/faceid (multipart/form-data)
    // formData: ProfileImage (file), Reason (string, bắt buộc)
    updateFaceId(id, formData) {
        return authApi.put(`/api/members/${id}/faceid`, formData);
    },

    // GET: api/members/{id}/update-history
    // Trả về danh sách "phiên" cập nhật, mỗi phiên có sessionType: "INFO" | "FACEID"
    getUpdateHistory(id) {
        return authApi.get(`/api/members/${id}/update-history`);
    },
    lockMember(id, reason) {
        return authApi.put(`/api/members/${id}/lock`, { reason });
    },

    // PUT: api/members/{id}/unlock — không cần reason
    unlockMember(id) {
        return authApi.put(`/api/members/${id}/unlock`, {});
    },

    // PUT: api/members/{id}/password/reset — body { newPassword }
    changeMemberPassword(id, data) {
        return authApi.put(`/api/members/${id}/password/reset`, data);
    },
    // ===== Promotions (api/promotions — PromotionsController ở BE) =====

    // GET: api/promotions?keyword=&planId=&page=&pageSize=
    getPromotions(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/promotions?${query}` : "/api/promotions";
        return authApi.get(url);
    },

    // GET: api/promotions/{id}
    getPromotionDetail(id) {
        return authApi.get(`/api/promotions/${id}`);
    },

    // GET: api/promotions/applicable/{planId}
    getApplicablePromotions(planId) {
        return authApi.get(`/api/promotions/applicable/${planId}`);
    },

    // GET: api/promotions/usage-history?promotionId=&memberId=&planId=&fromDate=&toDate=&page=&pageSize=
    // Lịch sử áp dụng khuyến mãi (khớp PromotionService.GetPromotionUsageHistoryAsync ở BE).
    getUsageHistoryPromotion(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/promotions/usage-history?${query}`
            : "/api/promotions/usage-history";
        return authApi.get(url);
    },

    // POST: api/promotions
    createPromotion(data) {
        return authApi.post("/api/promotions", data);
    },

    // PUT: api/promotions/{id}
    updatePromotion(id, data) {
        return authApi.put(`/api/promotions/${id}`, data);
    },

    // PATCH: api/promotions/{id}/visibility — body { an: true|false }
    setPromotionVisibility(id, an) {
        return authApi.patch(`/api/promotions/${id}/visibility`, { an });
    },

    // DELETE: api/promotions/{id}
    deletePromotion(id) {
        return authApi.delete(`/api/promotions/${id}`);
    },

    // =========================================================================
    // FORUM — dùng cho "Quản lý diễn đàn" (AdminForumFeedPage / AdminPostDetailPage)
    // Copy lại logic từ memberApi.js, giữ nguyên endpoint vì đây là cùng 1 bộ
    // API — admin chỉ khác ở quyền (token admin) nên có thể xoá bài / bình
    // luận của bất kỳ ai mà không cần so sánh chủ sở hữu.
    // =========================================================================

    // GET: api/ForumPost?categoryId=&sort=&search=...
    getForumPosts(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/ForumPost?${query}` : "/api/ForumPost";
        return authApi.get(url, true);
    },

    // GET: api/ForumPost/{postId}
    getForumPostById(postId) {
        return authApi.get(`/api/ForumPost/${postId}`, true);
    },

    // DELETE: api/ForumPost/{postId} — admin xoá bài viết bất kỳ, không cần
    // kiểm tra chủ bài viết như bên member.
    deleteForumPost(postId) {
        return authApi.delete(`/api/ForumPost/${postId}`);
    },

    // GET: api/ForumPost/stats -> ForumStatsDto { totalMembers, totalPosts,
    // totalComments, totalLikes }. Đây là route THẬT, đã dùng ở Layout.jsx
    // (memberApi.getForumStats()) cho card "Thống kê cộng đồng" bên hội viên.
    getForumStats() {
        return authApi.get("/api/ForumPost/stats", false);
    },

    // getForumOverview — ALIAS của getForumStats(), gọi cùng route thật
    // /api/ForumPost/stats (khớp với Layout.jsx bên member) thay vì route
    // /api/ForumPost/overview mình đoán trước đó (không có thật ở BE).
    // Field trả về: { totalMembers, totalPosts, totalComments, totalLikes }
    // — KHÔNG có postsToday/activeMembers, xem lại mapping ở AdminForumFeedPage.
    getForumOverview() {
        return this.getForumStats();
    },

    // GET: api/forum/comments/post/{postId}?page=&pageSize=
    // Danh sách bình luận gốc (+ replies n cấp, dựng cây) của 1 bài viết.
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

    // DELETE: api/forum/comments/{commentId} — admin xoá bình luận/trả lời
    // bất kỳ, không cần kiểm tra chủ sở hữu như bên member.
    deleteForumComment(commentId) {
        return authApi.delete(`/api/forum/comments/${commentId}`);
    },
    // GET: api/ForumCategory?includeInactive=true|false
    getForumCategories(includeInactive = false) {
        return authApi.get(`/api/ForumCategory?includeInactive=${includeInactive}`, false);
    },

    // GET: api/ForumCategory/{id}
    getForumCategoryDetail(id) {
        return authApi.get(`/api/ForumCategory/${id}`);
    },

    // POST: api/ForumCategory
    // body: { categoryName, icon, displayOrder }
    createForumCategory(data) {
        return authApi.post(`/api/ForumCategory`, data);
    },

    // PUT: api/ForumCategory/{id}
    // body: { categoryName, icon, displayOrder, status }
    updateForumCategory(id, data) {
        return authApi.put(`/api/ForumCategory/${id}`, data);
    },

    // DELETE: api/ForumCategory/{id}
    deleteForumCategory(id) {
        return authApi.delete(`/api/ForumCategory/${id}`);
    },
    getAdminOverview(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/dashboard/admin-overview?${query}`
            : "/api/dashboard/admin-overview";
        return authApi.get(url);
    },
    getFilterableBranches() {
        return authApi.get(`/api/reports/manager/branches`);
    },


    // Gọi 1 lần, lấy đủ: hội viên, nhân viên, sự cố, thiết bị, doanh thu
    getManagerDashboard(params = {}) {
        const query = buildQuery(params); // { from, to, branchId }
        const url = query
            ? `/api/reports/manager/dashboard?${query}`
            : `/api/reports/manager/dashboard`;
        return authApi.get(url);
    },

    getEmployeeReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/manager/employees?${query}`
            : `/api/reports/manager/employees`;
        return authApi.get(url);
    },

    getIncidentReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/manager/incidents?${query}`
            : `/api/reports/manager/incidents`;
        return authApi.get(url);
    },

    getEquipmentReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/manager/equipment?${query}`
            : `/api/reports/manager/equipment`;
        return authApi.get(url);
    },

    getManagerRevenueReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/manager/revenue?${query}`
            : `/api/reports/manager/revenue`;
        return authApi.get(url);
    },

    // ================= THU NGÂN (dùng lại cho check-in) =================
    // Route cashier/checkins cho phép cả role Cashier, Manager, Admin gọi
    // (xem [Authorize(Roles = "Cashier,Manager,Admin")] ở BE) nên Quản lý/Admin
    // dùng chung route này để lấy dữ liệu check-in.

    getCheckInReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/cashier/checkins?${query}`
            : `/api/reports/cashier/checkins`;
        return authApi.get(url);
    },

    getMemberReport(params = {}) {
        const query = buildQuery(params);
        const url = query
            ? `/api/reports/cashier/members?${query}`
            : `/api/reports/cashier/members`;
        return authApi.get(url);
    },

};


export default adminApi;