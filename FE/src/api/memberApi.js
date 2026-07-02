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
        return authApi.get("/api/packages",false)
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