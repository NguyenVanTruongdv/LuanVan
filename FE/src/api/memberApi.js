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
    getMyinfoToPayment() {
        return authApi.get("/api/payment/my-info")
    },
    getPendingPayment() {
        return authApi.get("/api/payment/pending")
    },
    cancelPayment(orderCode) {
        return authApi.post(`/api/payment/cancel/${orderCode}`);
    }

    // Ví dụ sau này
    // getProfile() {
    //     return authApi.get("/api/member/profile");
    // },

    // updateProfile(payload) {
    //     return authApi.put("/api/member/profile", payload);
    // },
};

export default memberApi;