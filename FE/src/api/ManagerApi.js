import authApi from "./authApi";

// Helper dùng chung cho Create/Update thiết bị — build multipart/form-data
// vì BE nhận ảnh qua IFormFile (EquipmentService.CreateAsync / UpdateAsync).
function buildEquipmentFormData(payload = {}) {
    const formData = new FormData();
    if (payload.equipmentName !== undefined) {
        formData.append("EquipmentName", payload.equipmentName);
    }
    if (payload.categoryId !== undefined && payload.categoryId !== "") {
        formData.append("CategoryId", payload.categoryId);
    }
    if (payload.branchId !== undefined && payload.branchId !== "") {
        formData.append("BranchId", payload.branchId);
    }
    if (payload.description !== undefined) {
        formData.append("Description", payload.description ?? "");
    }
    if (payload.image instanceof File) {
        formData.append("Image", payload.image);
    }
    return formData;
}

function toQuery(params = {}) {
    return new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
}

const managerApi = {
    // =========================================================================
    // NHÂN VIÊN
    // =========================================================================
    getEmployeeProfile() {
        return authApi.get(`/api/employee/profile`);
    },
    getListEmployees(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/employee${query ? `?${query}` : ""}`);
    },
    createEmployee(payload) {
        return authApi.post(`/api/employee`, payload);
    },
    updateEmployee(employeeId, payload) {
        return authApi.put(`/api/employee/${employeeId}`, payload);
    },
    hideEmployee(employeeId, reason) {
        return authApi.patch(`/api/employee/${employeeId}/hide`, { reason });
    },
    activateEmployee(employeeId) {
        return authApi.patch(`/api/employee/${employeeId}/activate`);
    },

    // =========================================================================
    // HỘI VIÊN / GIAO DỊCH / GÓI TẬP (giữ nguyên, không đổi)
    // =========================================================================
    getListMembers(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/members${query ? `?${query}` : ""}`);
    },
    getMemberDetail(id) {
        return authApi.get(`/api/members/${id}`);
    },
    getUpdateHistory(id) {
        return authApi.get(`/api/members/${id}/update-history`);
    },
    getIdentifyHistory(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/identify${query ? `?${query}` : ""}`);
    },
    getTransactions(formData = {}) {
        const query = toQuery(formData);
        return authApi.get(`/api/transactions/history${query ? `?${query}` : ""}`);
    },
    getInvoice(transactionId) {
        return authApi.getBlob(`/api/transactions/${transactionId}/invoice`);
    },
    getMemberPackagesHistory(formData = {}) {
        const query = toQuery(formData);
        return authApi.get(`/api/member-packages/history${query ? `?${query}` : ""}`);
    },
    getTransactionDetail(transactionId) {
        return authApi.get(`/api/transactions/${transactionId}`);
    },
    previewAdjustTransactionPlan(transactionId, newPlanId) {
        return authApi.get(`/api/transactions/${transactionId}/adjust-plan-preview?newPlanId=${newPlanId}`);
    },
    adjustTransactionPlan(transactionId, payload) {
        return authApi.put(`/api/transactions/${transactionId}/adjust-plan`, payload);
    },
    getPlans() {
        return authApi.get(`/api/packages`);
    },
    getApplicablePromotions(planId) {
        return authApi.get(`/api/plans/${planId}/applicable-promotions`);
    },

    // =========================================================================
    // THIẾT BỊ — map 1-1 với EquipmentController (BE). Danh sách route thật sự
    // tồn tại ở BE (đối chiếu lại để KHÔNG bao giờ gọi nhầm route nữa):
    //   GET   /api/equipment
    //   GET   /api/equipment/{id}
    //   POST  /api/equipment                 (multipart/form-data)
    //   PUT   /api/equipment/{id}             (multipart/form-data)
    //   PATCH /api/equipment/{id}/hide
    //   PATCH /api/equipment/{id}/activate
    // KHÔNG có route /api/equipment/{id}/status — nếu sau này cần đổi, phải sửa
    // ở BE (EquipmentController) trước rồi mới thêm hàm tương ứng ở đây.
    // =========================================================================
    getListEquipments(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/equipment${query ? `?${query}` : ""}`);
    },
    getEquipmentDetail(equipmentId) {
        return authApi.get(`/api/equipment/${equipmentId}`);
    },
    createEquipment(payload) {
        return authApi.post(`/api/equipment`, buildEquipmentFormData(payload));
    },
    updateEquipment(equipmentId, payload) {
        return authApi.put(`/api/equipment/${equipmentId}`, buildEquipmentFormData(payload));
    },
    hideEquipment(equipmentId) {
        return authApi.patch(`/api/equipment/${equipmentId}/hide`);
    },
    activateEquipmentItem(equipmentId) {
        return authApi.patch(`/api/equipment/${equipmentId}/activate`);
    },

    // =========================================================================
    // DANH MỤC THIẾT BỊ / CHI NHÁNH
    // =========================================================================
    getEquipmentCategories() {
        return authApi.get("/api/EquipmentCategory", false);
    },
    getBranches() {
        return authApi.get(`/api/branches`);
    },

    // =========================================================================
    // TIN TỨC — map 1-1 với NewsController (BE):
    //   GET   /api/news/manage          (GetStaffListAsync — dành riêng cho
    //                                     Admin/Manager. Admin xem tất cả,
    //                                     Manager chỉ xem tin mình tạo; hỗ trợ
    //                                     query branchId, keyword)
    //   POST  /api/news                 (CreateAsync — Admin/Manager)
    //   PUT   /api/news/{id}            (UpdateAsync — Admin sửa tất cả,
    //                                     Manager chỉ sửa bài mình tạo)
    //   PATCH /api/news/{id}/hide       (HideAsync — soft delete, cùng quyền
    //                                     như sửa)
    // LƯU Ý: GET /api/news (không có /manage) là route CÔNG KHAI cho khách
    // hàng (GetPublicListAsync) — không dùng route này ở trang quản lý.
    // NẾU sau này cần đổi route, phải sửa NewsController/NewsService ở BE
    // trước rồi mới thêm hàm tương ứng ở đây.
    // =========================================================================
    getListNews(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/news/manage${query ? `?${query}` : ""}`);
    },
    createNews(payload) {
        return authApi.post(`/api/news`, payload);
    },
    updateNews(newsId, payload) {
        return authApi.put(`/api/news/${newsId}`, payload);
    },
    hideNews(newsId) {
        return authApi.patch(`/api/news/${newsId}/hide`);
    },
    activateNews(newsId) {   // 👈 thêm hàm này
        return authApi.patch(`/api/news/${newsId}/activate`);
    },


    // incident
     getListIncidents(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/incidents${query ? `?${query}` : ""}`);
    },
    getIncidentDetail(incidentId) {
        return authApi.get(`/api/incidents/${incidentId}`);
    },
    updateIncidentStatus(incidentId, payload) {
        return authApi.put(`/api/incidents/${incidentId}/status`, payload);
    },
};

export default managerApi;