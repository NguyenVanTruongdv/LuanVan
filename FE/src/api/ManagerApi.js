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

// Chuẩn hoá Date -> "yyyy-MM-dd" để khớp kiểu DateTime FromDate/ToDate ở BE
// (ReportService.GetRevenueReportAsync/GetMemberReportAsync/GetEquipmentReportAsync).
function toDateParam(date) {
    if (!date) return undefined;
    if (typeof date === "string") return date;
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Build query { fromDate, toDate } chung cho mọi endpoint báo cáo
function toReportQuery({ fromDate, toDate } = {}) {
    return toQuery({ fromDate: toDateParam(fromDate), toDate: toDateParam(toDate) });
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
    updateMember(id, data) {
        return authApi.put(`/api/members/${id}`, data);
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
    // cashierApi.js
    cancelInternalPackage(memberId) {
        return authApi.post(`/api/members/${memberId}/packages/cancel-internal`);
    },
    // =========================================================================
    // THIẾT BỊ — map 1-1 với EquipmentController (BE).
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
    // TIN TỨC
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
    activateNews(newsId) {
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
    updateIncidentInfo(incidentId, payload) {
        return authApi.put(`/api/incidents/${incidentId}`, payload);
    },

    // =========================================================================
    // BÁO CÁO — map 1-1 với ReportsController (BE):
    //   GET /api/reports/revenue                (tổng quan doanh thu, có sẵn
    //                                             RevenueByDay/RevenueByMonth/
    //                                             RevenueByBranch)
    //   GET /api/reports/revenue/by-day
    //   GET /api/reports/revenue/by-month
    //   GET /api/reports/revenue/by-branch
    //   GET /api/reports/members                (tổng quan hội viên)
    //   GET /api/reports/members/summary        (tổng hội viên + check-in theo
    //                                             chi nhánh)
    //   GET /api/reports/equipment               (tổng quan thiết bị)
    //   GET /api/reports/equipment/by-branch     (thiết bị theo chi nhánh)
    // Tất cả đều nhận query { fromDate, toDate } dạng yyyy-MM-dd.
    // =========================================================================
    getRevenueReport(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/revenue${query ? `?${query}` : ""}`);
    },
    getRevenueByDay(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/revenue/by-day${query ? `?${query}` : ""}`);
    },
    getRevenueByMonth(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/revenue/by-month${query ? `?${query}` : ""}`);
    },
    getRevenueByBranch(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/revenue/by-branch${query ? `?${query}` : ""}`);
    },
    getMemberReport(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/members${query ? `?${query}` : ""}`);
    },
    getMemberSummary(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/members/summary${query ? `?${query}` : ""}`);
    },
    getEquipmentReport(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/equipment${query ? `?${query}` : ""}`);
    },
    getEquipmentByBranch(range = {}) {
        const query = toReportQuery(range);
        return authApi.get(`/api/reports/equipment/by-branch${query ? `?${query}` : ""}`);
    },
};

export default managerApi;