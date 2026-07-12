import authApi from "./authApi";

const managerApi = {
    // =========================================================================
    // NHÂN VIÊN — thông tin cá nhân đang đăng nhập
    // =========================================================================
    // GET /api/employee/profile
    // -> response: { employeeId, fullName, phone, email, gender, status,
    //                suspendReason, role, branches: string[] }
    getEmployeeProfile() {
        return authApi.get(`/api/employee/profile`);
    },

    //HỘI VIÊN
    getListMembers(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();
        return authApi.get(`/api/members${query ? `?${query}` : ""}`);
    },
    getMemberDetail(id) {
        return authApi.get(`/api/members/${id}`);
    },
    getUpdateHistory(id) {
        return authApi.get(`/api/members/${id}/update-history`);
    },
    getIdentifyHistory(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();
        return authApi.get(`/api/identify${query ? `?${query}` : ""}`);
    },
    getInvoice(transactionId) {
        return authApi.getBlob(`/api/transactions/${transactionId}/invoice`);
    },
    getHisRegisPack(formData = {}) {
        const query = new URLSearchParams(
            Object.entries(formData).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();
        return authApi.get(`/api/packages/history${query ? `?${query}` : ""}`);
    },

    // =========================================================================
    // GIAO DỊCH — xem chi tiết & điều chỉnh lại gói tập (khi nhân viên bán nhầm)
    // =========================================================================
    // GET /api/transactions/{id}
    // -> response: { transactionId, orderCode, memberId, memberName, planId,
    //                planName, giaGoc, amount, paymentMethod, paymentStatus,
    //                bankReferenceCode, invoiceUrl, createdAt }
    getTransactionDetail(transactionId) {
        return authApi.get(`/api/transactions/${transactionId}`);
    },

    // GET /api/transactions/{id}/adjust-plan-preview?newPlanId=X
    // BE tự tra + tính khuyến mãi hiệu lực tại thời điểm giao dịch gốc được tạo,
    // KHÔNG lưu DB — chỉ để FE hiển thị xem trước trước khi nhân viên xác nhận.
    // -> response: { newPlanId, newPlanName, giaGoc, discountAmount, amount,
    //                bonusDays, promotionId, promotionName, newExpiryDate }
    previewAdjustTransactionPlan(transactionId, newPlanId) {
        return authApi.get(
            `/api/transactions/${transactionId}/adjust-plan-preview?newPlanId=${newPlanId}`
        );
    },

    // PUT /api/transactions/{id}/adjust-plan
    // payload: { newPlanId, reason } — không còn newPromotionId, BE tự áp KM.
    adjustTransactionPlan(transactionId, payload) {
        return authApi.put(`/api/transactions/${transactionId}/adjust-plan`, payload);
    },

    // =========================================================================
    // GÓI TẬP — danh sách gói tập để chọn khi điều chỉnh giao dịch
    // =========================================================================
    // GET /api/plans
    getPlans() {
        return authApi.get(`/api/packages`);
    },
};

export default managerApi;