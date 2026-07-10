import authApi from "./authApi";

const memberApi = {
    // Tin tức
    getListNews() {
        return authApi.get("/api/news", false);
    },
    //Lấy danh mục thiết bị tập. 
    getAllEquipmentCategory() {
        return authApi.get("/api/EquipmentCategory", false);
    },
    getAllPackage() {
        return authApi.get("/api/packages", false)
    },
    getHomeImages() {
        return authApi.get("/api/home-images/all", false)
    },
    createPayment(planId) {
        return authApi.post("/api/payment/create", {
            planId,
        });
    },
    getPaymentStatus(orderCode) {
        return authApi.get(`/api/payment/status/${orderCode}`);
    },
    getAll(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query ? `/api/equipment?${query}` : "/api/equipment";
        return authApi.get(url, false);
    },
    getMyinfoToPayment() {
        return authApi.get("/api/payment/my-info")
    },
    getPendingPayment() {
        return authApi.get("/api/payment/pending")
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

    // Ví dụ sau này
    // getProfile() {
    //     return authApi.get("/api/member/profile");
    // },

    // updateProfile(payload) {
    //     return authApi.put("/api/member/profile", payload);
    // },
};

export default memberApi;