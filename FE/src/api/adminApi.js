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
};

export default adminApi;