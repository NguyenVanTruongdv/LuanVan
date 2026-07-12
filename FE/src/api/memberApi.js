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

    // =========================================================================
    // CHI NHÁNH
    // =========================================================================
    // Danh sách chi nhánh — hỗ trợ lọc name/status + phân trang (page, pageSize)
    getBranches(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/branches?${query}` : "/api/branches";
        return authApi.get(url, false);
    },

    // =========================================================================
    // THIẾT BỊ
    // =========================================================================
    // Lấy danh mục thiết bị tập.
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
    // Kiểm tra tài khoản đang PendingActivation có sẵn 1 gói tập chờ kích hoạt hay chưa.
    // memberId lấy từ JWT ở BE, không truyền id từ FE.
    // API thật: GET /api/payment/pending-purchase-status
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
    // HỘI VIÊN — hồ sơ cá nhân (chưa triển khai, để tham khảo)
    // =========================================================================
    // getProfile() {
    //     return authApi.get("/api/member/profile");
    // },
    // updateProfile(payload) {
    //     return authApi.put("/api/member/profile", payload);
    // },
};

export default memberApi;