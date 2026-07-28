const BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5231";

// ─────────────────────────────────────────────
// JWT Decode Helper
// ─────────────────────────────────────────────
// Giải mã phần payload của access token (KHÔNG xác thực chữ ký — chỉ đọc claim
// để FE dùng hiển thị/logic, việc xác thực thật sự vẫn do BE đảm nhiệm).
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────
// Token Helpers
// ─────────────────────────────────────────────

export function getAccessToken() {
    return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
    return localStorage.getItem("refreshToken");
}

export function saveTokens(data) {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("fullName", data.fullName || "");
    localStorage.setItem("role", data.role || "");
    localStorage.setItem("entityType", data.entityType || "");
    localStorage.setItem("status", data.status || "");

    // MỚI: accountId và branchIds không nằm trong response body (BE không đổi
    // LoginResponseDto), mà nằm trong claim "account_id" / "BranchId" của access
    // token — giải mã ra để FE dùng khi cần (hiển thị chi nhánh, lọc dữ liệu...).
    const payload = decodeJwtPayload(data.accessToken);
    const accountId = payload?.account_id || "";
    // Nhân viên có thể thuộc nhiều chi nhánh → BE nhét nhiều claim "BranchId" cùng
    // tên, JWT gộp thành mảng nếu >1 giá trị, hoặc string đơn nếu chỉ 1 — chuẩn hoá
    // về mảng cho FE dùng thống nhất.
    const branchIds = payload ? [].concat(payload["BranchId"] || []) : [];

    localStorage.setItem("accountId", accountId);
    localStorage.setItem("branchIds", JSON.stringify(branchIds));
}

export function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("fullName");
    localStorage.removeItem("role");
    localStorage.removeItem("entityType");
    localStorage.removeItem("status");
    localStorage.removeItem("accountId");
    localStorage.removeItem("branchIds");
}

export function isLoggedIn() {
    return !!getAccessToken();
}

export function getCurrentUser() {
    return {
        fullName: localStorage.getItem("fullName") || "",
        role: localStorage.getItem("role") || "",
        entityType: localStorage.getItem("entityType") || "",
        status: localStorage.getItem("status") || "",
        accountId: localStorage.getItem("accountId") || "",
        branchIds: JSON.parse(localStorage.getItem("branchIds") || "[]"),
    };
}
// ─────────────────────────────────────────────
// Base Request (JSON)
// ─────────────────────────────────────────────

async function request(method, path, body = null, auth = false) {
    // QUAN TRỌNG: nếu body là FormData (upload ảnh/file), KHÔNG được tự set
    // Content-Type. Trình duyệt cần tự sinh ra "multipart/form-data; boundary=..."
    // — tự set "application/json" (hoặc tự set multipart tay, thiếu boundary) sẽ
    // làm server không parse được file trong request (IFormFile luôn nhận về null).
    const isFormData = body instanceof FormData;

    const headers = {};
    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (auth) {
        headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    let res = await fetch(`${BASE_URL}${path}`, options);

    // AccessToken hết hạn
    if (res.status === 401 && auth) {
        try {
            await authApi.refreshToken({
                refreshToken: getRefreshToken(),
            });

            headers.Authorization = `Bearer ${getAccessToken()}`;

            res = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers,
            });
        } catch {
            clearTokens();
            const entityType = localStorage.getItem("entityType");

            if (entityType === "Employee") {
                window.location.href = "/staff/login";
            } else {
                window.location.href = "/member/login";
            }
            throw new Error("Phiên đăng nhập đã hết hạn");
        }
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const err = new Error(
            data?.message ||
            data?.title ||
            "Có lỗi xảy ra"
        );

        err.status = res.status;
        err.errors = data?.errors;
        err.data = data;

        throw err;
    }

    return data;
}

// ─────────────────────────────────────────────
// Base Request (Blob) — dùng cho endpoint trả về file (ảnh, PDF...)
// như GET /api/transactions/{id}/invoice. Không thể tái dùng request()
// ở trên vì nó luôn ép res.json().
// ─────────────────────────────────────────────

async function requestBlob(method, path, auth = true) {
    const headers = {};
    if (auth) {
        headers.Authorization = `Bearer ${getAccessToken()}`;
    }

    const options = { method, headers };

    let res = await fetch(`${BASE_URL}${path}`, options);

    // AccessToken hết hạn — refresh rồi gọi lại, giống hệt logic của request()
    if (res.status === 401 && auth) {
        try {
            await authApi.refreshToken({
                refreshToken: getRefreshToken(),
            });

            headers.Authorization = `Bearer ${getAccessToken()}`;

            res = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers,
            });
        } catch {
            clearTokens();
            window.location.href = "/member/login";
            throw new Error("Phiên đăng nhập đã hết hạn");
        }
    }

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
        // BE trả lỗi dạng JSON (vd 404 { message: "..." }) chứ không phải file
        let message = "Có lỗi xảy ra";
        if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => null);
            message = data?.message || data?.title || message;
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }

    const blob = await res.blob();
    return { blob, contentType };
}

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────

const authApi = {

    // ===== OTP =====

    sendOtp(payload) {
        return request(
            "POST",
            "/api/auth/send-otp",
            payload
        );
    },

    verifyRegisterOtp(payload) {
        return request(
            "POST",
            "/api/auth/verify-otp",
            payload
        );
    },
    sendForgotPasswordOtp(phone) {
        return authApi.post("/api/auth/forgot-password/send-otp", { phone }, false);
    },
 resetPassword({ phone, otp, newPassword }) {
    return authApi.post(
      "/api/auth/forgot-password/reset",
      { phone, otp, newPassword },
      false
    );
  },
    // ===== LOGIN =====

    async loginMember(payload) {
        const data = await request(
            "POST",
            "/api/auth/member/login",
            payload
        );

        saveTokens(data);
        return data;
    },

    async loginEmployee(payload) {
        const data = await request(
            "POST",
            "/api/auth/employee/login",
            payload
        );

        saveTokens(data);
        return data;
    },

    // ===== REFRESH TOKEN =====

    async refreshToken(payload) {
        const data = await request(
            "POST",
            "/api/auth/refresh-token",
            payload
        );

        saveTokens(data);
        return data;
    },

    // ===== LOGOUT =====

    async logout() {
        const refreshToken = getRefreshToken();

        if (refreshToken) {
            try {
                await request(
                    "POST",
                    "/api/auth/logout",
                    { refreshToken }
                );
            } catch {
                // ignore
            }
        }

        clearTokens();
    },

    // ===== AUTH FETCH (JSON) =====
    // body có thể là object thường (JSON) HOẶC FormData (upload file) —
    // request() tự nhận diện, không cần truyền thêm cờ gì ở đây.

    get(path, auth = true) {
        return request(
            "GET",
            path,
            null,
            auth
        );
    },

    post(path, body, auth = true) {
        return request(
            "POST",
            path,
            body,
            auth
        );
    },

    put(path, body, auth = true) {
        return request(
            "PUT",
            path,
            body,
            auth
        );
    },

    patch(path, body, auth = true) {
        return request(
            "PATCH",
            path,
            body,
            auth
        );
    },

    delete(path, auth = true) {
        return request(
            "DELETE",
            path,
            null,
            auth
        );
    },

    // ===== AUTH FETCH (BLOB) =====
    // Dùng cho endpoint trả về file thật (ảnh/PDF...) như xem hóa đơn.
    // Trả về { blob, contentType } thay vì JSON.

    getBlob(path, auth = true) {
        return requestBlob("GET", path, auth);
    },

};

export default authApi;