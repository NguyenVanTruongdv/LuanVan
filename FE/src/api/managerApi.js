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

// Helper build multipart/form-data cho tạo nhân viên — BE luôn bắt buộc ProfileImage
// (CreateEmployeeWithAccountDto / CreateEmployeeWithFaceIdDto đều [Required] IFormFile ProfileImage)
// vì mọi nhân viên tạo mới đều phải đăng ký FaceID ngay. withAccount = true thì gửi kèm
// LoginPhone/LoginEmail/Password để BE tạo luôn tài khoản đăng nhập (CreateWithAccountAsync),
// false thì chỉ tạo hồ sơ + FaceID, chưa có tài khoản (CreateWithFaceIdAsync).
function buildEmployeeFormData(payload = {}, withAccount) {
    const formData = new FormData();
    formData.append("FullName", payload.fullName ?? "");
    formData.append("Phone", payload.phone ?? "");
    formData.append("Gender", payload.gender ?? "");
    formData.append("RoleId", payload.roleId ?? "");
    (payload.branchIds || []).forEach((id) => formData.append("BranchIds", id));

    if (payload.profileImage instanceof File) {
        formData.append("ProfileImage", payload.profileImage);
    }
    if (payload.faceIdReason) {
        formData.append("FaceIdReason", payload.faceIdReason);
    }

    if (withAccount) {
        formData.append("LoginPhone", payload.loginPhone ?? "");
        if (payload.loginEmail) formData.append("LoginEmail", payload.loginEmail);
        formData.append("Password", payload.password ?? "");
    }

    return formData;
}

// Helper build multipart/form-data cho sửa/đăng ký lại FaceID — PUT /api/employee/{id}/face
// (UpdateEmployeeFaceIdDto: [Required] IFormFile ProfileImage, string? Reason).
function buildFaceIdFormData(payload = {}) {
    const formData = new FormData();
    if (payload.profileImage instanceof File) {
        formData.append("ProfileImage", payload.profileImage);
    }
    if (payload.reason) {
        formData.append("Reason", payload.reason);
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
    // NHÂN VIÊN — map 1-1 với EmployeeController (BE).
    // =========================================================================
    getEmployeeProfile() {
        return authApi.get(`/api/employee/profile`);
    },
    getListEmployees(params = {}) {
        const query = toQuery(params);
        return authApi.get(`/api/employee${query ? `?${query}` : ""}`);
    },
    // Xem chi tiết 1 nhân viên — GET /api/employee/{id} (EmployeeController.GetById).
    getEmployeeDetail(employeeId) {
        return authApi.get(`/api/employee/${employeeId}`);
    },
    // Tạo nhân viên + FaceID + tài khoản đăng nhập ngay — POST /api/employee/with-account.
    createEmployeeWithAccount(payload) {
        return authApi.post(`/api/employee/with-account`, buildEmployeeFormData(payload, true));
    },
    // Tạo nhân viên + FaceID, CHƯA cấp tài khoản đăng nhập — POST /api/employee/with-faceid.
    // Dùng cái này làm mặc định cho form "Thêm nhân viên"; tài khoản đăng nhập sẽ được
    // thêm sau ở trang Xem chi tiết (nút tròn +).
    createEmployeeWithFaceId(payload) {
        return authApi.post(`/api/employee/with-faceid`, buildEmployeeFormData(payload, false));
    },
    // Sửa thông tin cơ bản (không đụng Account/FaceID) — PUT /api/employee/{id}.
    // Chỉ gửi đúng 5 field UpdateEmployeeDto nhận, không gửi email/password (BE sẽ bỏ qua
    // nếu gửi thừa, nhưng gửi đúng cho rõ ràng và tránh nhầm lẫn khi đọc code).
    updateEmployee(employeeId, payload) {
        return authApi.put(`/api/employee/${employeeId}`, {
            fullName: payload.fullName,
            phone: payload.phone,
            gender: payload.gender,
            roleId: payload.roleId,
            branchIds: payload.branchIds,
        });
    },
    // Thêm tài khoản đăng nhập cho nhân viên CHƯA có — POST /api/employee/{id}/account.
    addEmployeeAccount(employeeId, payload) {
        return authApi.post(`/api/employee/${employeeId}/account`, {
            loginPhone: payload.loginPhone,
            loginEmail: payload.loginEmail || null,
            password: payload.password,
        });
    },
    // Sửa tài khoản đăng nhập ĐÃ có — PUT /api/employee/{id}/account.
    // newPassword để trống/undefined thì BE giữ nguyên mật khẩu cũ.
    updateEmployeeAccount(employeeId, payload) {
        return authApi.put(`/api/employee/${employeeId}/account`, {
            loginPhone: payload.loginPhone,
            loginEmail: payload.loginEmail || null,
            newPassword: payload.newPassword || undefined,
        });
    },
    // Sửa / đăng ký lại FaceID cho nhân viên — PUT /api/employee/{id}/face (multipart/form-data).
    // profileImage bắt buộc (BE [Required]); reason tùy chọn, không truyền thì BE dùng lý do mặc định.
    updateEmployeeFace(employeeId, payload) {
        return authApi.put(`/api/employee/${employeeId}/face`, buildFaceIdFormData(payload));
    },
    // Lịch sử cập nhật FaceID của nhân viên — GET /api/employee/{id}/face-history.
    getEmployeeFaceHistory(employeeId) {
        return authApi.get(`/api/employee/${employeeId}/face-history`);
    },
    // Khóa toàn diện nhân viên (Employee.Status + Account nếu có) — PATCH /api/employee/{id}/hide.
    hideEmployee(employeeId, reason) {
        return authApi.patch(`/api/employee/${employeeId}/hide`, { reason });
    },
    // Mở khóa toàn diện nhân viên — PATCH /api/employee/{id}/activate.
    activateEmployee(employeeId) {
        return authApi.patch(`/api/employee/${employeeId}/activate`);
    },
    // Khóa/mở khóa CHỈ tài khoản đăng nhập, không đụng Employee.Status — dự phòng cho sau
    // này nếu cần nút riêng ở trang chi tiết (chưa gắn UI ở bước này).
    lockAccountOnly(employeeId, reason) {
        return authApi.patch(`/api/employee/${employeeId}/account/lock`, { reason });
    },
    unlockAccountOnly(employeeId) {
        return authApi.patch(`/api/employee/${employeeId}/account/unlock`);
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
    // MANAGER DASHBOARD
    // =========================================================================

    // GET /api/dashboard/manager
    // Dashboard tổng quan dành cho Quản lý chi nhánh.
    // params:
    //   range : "today" | "7d" | "30d" | "custom"
    //   start : ISO DateTime (chỉ dùng khi range = "custom")
    //   end   : ISO DateTime (chỉ dùng khi range = "custom")
    getManagerDashboard({ range = "7d", start, end } = {}) {
        const params = new URLSearchParams();

        params.append("range", range);

        if (range === "custom") {
            if (start) {
                params.append(
                    "start",
                    start instanceof Date ? start.toISOString() : start
                );
            }

            if (end) {
                params.append(
                    "end",
                    end instanceof Date ? end.toISOString() : end
                );
            }
        }

        return authApi.get(`/api/dashboard/manager?${params.toString()}`);
    },

    // =========================================================================
    // MANAGER DASHBOARD - KPI
    // Tổng doanh thu, số hội viên hoạt động,
    // số sự cố chưa xử lý,...
    // =========================================================================
    getManagerKpi({ range = "7d", start, end } = {}) {
        return this.getManagerDashboard({ range, start, end });
    },

    // =========================================================================
    // MANAGER DASHBOARD - Revenue Chart
    // Biểu đồ doanh thu theo ngày.
    // FE lấy response.RevenueTrend
    // =========================================================================
    getRevenueTrend({ range = "7d", start, end } = {}) {
        return this.getManagerDashboard({ range, start, end });
    },

    // =========================================================================
    // MANAGER DASHBOARD - Hội viên check-in gần đây
    // FE lấy response.RecentMembers
    // =========================================================================
    getRecentMembers({ range = "7d", start, end } = {}) {
        return this.getManagerDashboard({ range, start, end });
    },

    // =========================================================================
    // MANAGER DASHBOARD - Danh sách sự cố chưa xử lý
    // FE lấy response.UnresolvedIssues
    // =========================================================================
    getUnresolvedIssues({ range = "7d", start, end } = {}) {
        return this.getManagerDashboard({ range, start, end });
    },

    // =========================================================================
    // MANAGER DASHBOARD - Tình trạng thiết bị
    // FE lấy response.EquipmentStatus
    // =========================================================================
    getEquipmentStatus({ range = "7d", start, end } = {}) {
        return this.getManagerDashboard({ range, start, end });
    },
    // GET: api/dashboard/manager?range=today|7d|30d|custom&start=&end=
    getManagerDashboard(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();

        const url = query
            ? `/api/dashboard/manager?${query}`
            : "/api/dashboard/manager";
        return authApi.get(url);
    },
    getAdjustmentHistory(transactionId) {
    return authApi.get(`/api/transactions/${transactionId}/adjustment-history`);  // cái hàm này dùng để lấy lịch sủ
    //  giao dịch cho trang admin chú  manager k dùng
    },
};

export default managerApi;