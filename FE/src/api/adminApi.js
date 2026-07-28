import authApi from "./authApi";

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
    getDetailBranch(id) {
        return authApi.get(`/api/branches/${id}`)
    },
    getAvailableManager() {
        return authApi.get(`/api/branches/available-managers`)
    },
    createBranch(formData) {
        return authApi.post("/api/branches", formData)
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
    createEmployee(formData) {
        return authApi.post("/api/employee", formData);
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
    checkEmployeeFace(formData) {
        return authApi.post("/api/employee/check", formData);
    },
};


export default adminApi;