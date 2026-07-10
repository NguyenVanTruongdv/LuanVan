import authApi from "./authApi";

const cashierApi = {
    // =========================================================================
    // NHÂN VIÊN — thông tin cá nhân đang đăng nhập
    // =========================================================================
    // GET /api/employee/profile
    // -> response: { employeeId, fullName, phone, email, gender, status,
    //                suspendReason, role, branches: string[] }
    getEmployeeProfile() {
        return authApi.get(`/api/employee/profile`);
    },

    // =========================================================================
    // HỘI VIÊN — danh sách, chi tiết, tạo/sửa
    // =========================================================================
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

    checkPhoneExists(phone) {
        return authApi.get(`/api/members/check-phone?phone=${encodeURIComponent(phone)}`);
    },

    createMember(formData) {
        return authApi.post(`/api/members`, formData);
    },

    updateMember(id, data) {
        return authApi.put(`/api/members/${id}`, data);
    },

    getUpdateHistory(id) {
        return authApi.get(`/api/members/${id}/update-history`);
    },

    // =========================================================================
    // HỘI VIÊN — kích hoạt, khoá/mở khoá tài khoản
    // =========================================================================
    getPendingMembers(params = {}) {
        const query = new URLSearchParams(
            Object.entries(params).filter(
                ([, v]) => v !== undefined && v !== null && v !== ""
            )
        ).toString();
        return authApi.get(`/api/members/pending${query ? `?${query}` : ""}`);
    },

    // GET /api/members/{id}/has-package -> trả về boolean THÔ (Ok(hasPackage)),
    // KHÔNG phải { hasPackage: bool }. Nơi gọi phải dùng thẳng giá trị trả về.
    // LƯU Ý NGHIỆP VỤ: hàm BE Haspackage() chỉ kiểm tra gói đang PendingActivation
    // (đã mua online, chưa kích hoạt) — KHÔNG phải "có bất kỳ gói nào". Dùng đúng
    // cho trang kích hoạt vì hội viên PendingActivation không thể có gói Active/Expired cũ.
    hasPackage(id) {
        return authApi.get(`/api/members/${id}/has-package`);
    },

    // POST /api/members/{id}/activate-with-package -> MemberService.ActivateWithPackageAsync
    // Dùng khi hội viên CHƯA có gói (kể cả Pending): chọn gói + đăng ký FaceID cùng lúc.
    // formData cần: PlanId, PromotionId (optional), GiaGoc, Amount, PaymentMethod, ProfileImage.
    // KHÔNG gửi StartDate/ExpiryDate/SoNgayTangThucTe — BE tự tính từ Plan + Promotion.
    activateWithPackage(id, formData) {
        return authApi.post(`/api/members/${id}/activate-with-package`, formData);
    },

    // POST /api/members/{id}/activate-face-id -> MemberService.ActivateFaceIdOnlyAsync
    // Dùng khi hội viên ĐÃ có gói (Pending mua online, hoặc gói cũ còn hạn): chỉ đăng ký FaceID.
    // BE tự kích hoạt gói Pending (nếu có) hoặc dùng gói còn hạn hiện tại.
    // formData chỉ cần: ProfileImage.
    activateFaceIdOnly(id, formData) {
        return authApi.post(`/api/members/${id}/activate-face-id`, formData);
    },

    lockMember(id, data) {
        return authApi.put(`/api/members/${id}/lock`, data);
    },

    unlockMember(id, data) {
        return authApi.put(`/api/members/${id}/unlock`, data);
    },

    // =========================================================================
    // HỘI VIÊN — khuôn mặt (Face ID)
    // =========================================================================
    // PUT /api/members/{id}/face-id — chỉ nhân viên được gọi (xem MembersController.cs).
    // formData: multipart/form-data, field ảnh là "ProfileImage".
    updateFaceId(id, formData) {
        return authApi.put(`/api/members/${id}/face-id`, formData);
    },

    // =========================================================================
    // GÓI TẬP
    // =========================================================================
    getCurrentMemberPack(id) {
        return authApi.get(`/api/members/${id}/packages`);
    },

    getAllPackage() {
        return authApi.get("/api/packages", false);
    },

    // POST /api/members/{memberId}/packages/renew — dùng chung cho cả "gia hạn"
    // lẫn "gán gói lần đầu" (hội viên activate chưa có gói cũ nào để gia hạn).
    renewMembership(memberId, formData) {
        return authApi.post(`/api/members/${memberId}/packages/renew`, formData);
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
    // HOÁ ĐƠN / GIAO DỊCH
    // =========================================================================
    // GET /api/transactions/{id}/invoice – BE proxy file từ S3, trả về bytes kèm
    // Content-Type thật (image/jpeg, image/png, application/pdf...). Trả về
    // { blob, contentType }. Phải gọi qua authApi (có Authorization header) và
    // nhận dạng blob, KHÔNG dùng window.open trực tiếp vì endpoint có [Authorize].
    getInvoice(transactionId) {
        return authApi.getBlob(`/api/transactions/${transactionId}/invoice`);
    },

    // =========================================================================
    // CHECK-IN / CHECK-OUT — camera tự động (nhận diện khuôn mặt)
    // =========================================================================
    // POST /api/identify   body: { image, action: "checkin" | "checkout", branchId }
    // Dùng chung cho cả 2 camera check-in và check-out — chỉ khác giá trị `action`.
    // BE tự nhận diện khuôn mặt qua AWS Rekognition, tra hội viên, kiểm tra điều
    // kiện, rồi ghi nhận check-in hoặc check-out. FE chỉ gửi ảnh, không tự tính
    // memberId.
    // -> response: { status, member, checkInId, reason }
    //    status: "success" | "no_face" | "not_recognized" | "ineligible" | "no_open_session"
    identifyAttendance(imageBase64, action, branchId) {
        return authApi.post(`/api/identify`, { image: imageBase64, action, branchId }, false);
    },

    // =========================================================================
    // CHECK-IN / CHECK-OUT — tra cứu & thao tác thủ công tại quầy
    // =========================================================================
    // GET /api/members/lookup?phone=...
    // Tra cứu hội viên theo SĐT (dùng ở quầy check-in khi camera không nhận diện được)
    lookupMemberByPhone(phone) {
        return authApi.get(`/api/members/lookup?phone=${encodeURIComponent(phone)}`);
    },

    // POST /api/checkins   body: { memberId, manualReason, branchId }
    // Check-in thủ công do nhân viên thực hiện (method = "Manual")
    checkinManual(memberId, manualReason, branchId) {
        return authApi.post(`/api/checkins`, { memberId, manualReason, branchId });
    },

    // =========================================================================
    // CHECK-IN / CHECK-OUT — cửa ra vào
    // =========================================================================
    // POST /api/doors/open   body: { side: "checkin" | "checkout", branchId }
    openDoor(side, branchId) {
        return authApi.post(`/api/doors/open`, { side, branchId });
    },

     getApplicablePromotions(planId) {
        return authApi.get(`/api/plans/${planId}/applicable-promotions`);
    },
};

export default cashierApi;