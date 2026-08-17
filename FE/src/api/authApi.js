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
// Redirect Helper (theo entityType)
// ─────────────────────────────────────────────
// admin / manager / staff (entityType = "Employee") → /staff/login
// member (entityType khác, vd "Member") → /member/login
//
// QUAN TRỌNG: nhận entityType qua tham số thay vì tự đọc localStorage.
// Trước đây hàm tự đọc localStorage.getItem("entityType"), nhưng nếu gọi
// SAU clearTokens() thì giá trị đã bị xoá → luôn rơi về nhánh else → luôn
// redirect nhầm về /member/login kể cả khi đang là Employee. Truyền tham số
// vào để loại bỏ hoàn toàn phụ thuộc thứ tự gọi.
function redirectToLogin(entityType) {
    if (entityType === "Employee") {
        window.location.href = "/staff/login";
    } else {
        window.location.href = "/member/login";
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

    // accountId và branchIds không nằm trong response body (BE không đổi
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
// Refresh Token Lock (XUYÊN TAB)
// ─────────────────────────────────────────────
// VẤN ĐỀ: quầy thu ngân (cashier) thường mở CÙNG LÚC 2 tab (vd 1 tab bán
// hàng, 1 tab tra cứu). accessToken/refreshToken lưu ở localStorage nên
// dùng chung giữa các tab, nhưng 1 biến JS thường (như refreshPromise kiểu
// cũ) chỉ tồn tại RIÊNG trong từng tab — không share được. Do đó nếu cả 2 tab
// cùng lúc gặp 401 (token vừa hết hạn), MỖI tab vẫn tự gọi
// /api/auth/refresh-token độc lập. Nếu BE rotate refreshToken (thu hồi cái
// cũ, cấp cái mới mỗi lần refresh) thì tab refresh sau sẽ dùng phải
// refreshToken đã bị tab kia làm thu hồi → bị BE từ chối → tab đó bị đá ra
// dù user vẫn đang thao tác bình thường.
//
// FIX: dùng Web Locks API (navigator.locks) — khoá (mutex) hoạt động xuyên
// suốt TẤT CẢ tab của cùng 1 origin, trình duyệt hiện đại đều hỗ trợ. Tab nào
// giữ được khoá mới được refresh; tab còn lại tự động đợi đến lượt. Kèm theo
// 1 lớp dự phòng bằng localStorage cho trình duyệt cũ không có Web Locks API.
//
// Thêm 1 lớp bảo vệ nữa: TRƯỚC khi thực sự gọi refresh, so sánh accessToken
// hiện tại với accessToken lúc request bị 401 (tokenAtFailure). Nếu đã khác
// nghĩa là tab kia (hoặc request khác trong cùng tab) VỪA refresh xong rồi —
// bỏ qua, không gọi BE thêm lần nữa, dùng luôn token mới nhất. Nhờ vậy dù có
// bao nhiêu tab/request cùng hết hạn 1 lúc, chỉ có ĐÚNG 1 lần gọi
// /api/auth/refresh-token lên BE.

const REFRESH_LOCK_NAME = "kimly-auth-refresh-lock";
const REFRESH_LOCK_FALLBACK_KEY = "authRefreshLockFallback";
const REFRESH_LOCK_STALE_MS = 8000; // coi khoá là "bỏ hoang" nếu quá cũ (vd tab crash giữa chừng)

function hasWebLocks() {
    return typeof navigator !== "undefined" && !!navigator.locks?.request;
}

// Dự phòng cho trình duyệt không có Web Locks API (Safari cũ, hoặc chạy
// không phải secure context). Không hoàn hảo 100% (localStorage không có
// test-and-set nguyên tử thật sự), nhưng đủ giảm mạnh khả năng đụng độ,
// kết hợp với guard so sánh tokenAtFailure ở trên thì vẫn an toàn cho việc
// tránh gọi refresh trùng.
async function withFallbackLock(fn) {
    const myId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const start = Date.now();

    // Chờ đến khi không có tab nào khác đang giữ khoá (hoặc khoá đã quá cũ).
    // Poll mỗi 120ms, tối đa ~10s rồi cứ tự chiếm khoá để tránh treo vĩnh viễn.
    while (Date.now() - start < 10000) {
        const raw = localStorage.getItem(REFRESH_LOCK_FALLBACK_KEY);
        const lock = raw ? JSON.parse(raw) : null;
        const isStale = !lock || Date.now() - lock.ts > REFRESH_LOCK_STALE_MS;

        if (isStale) {
            localStorage.setItem(
                REFRESH_LOCK_FALLBACK_KEY,
                JSON.stringify({ id: myId, ts: Date.now() })
            );
            // Đọc lại để giảm rủi ro 2 tab cùng ghi đè nhau trong khe hẹp.
            await new Promise((r) => setTimeout(r, 30));
            const check = JSON.parse(
                localStorage.getItem(REFRESH_LOCK_FALLBACK_KEY) || "null"
            );
            if (check?.id === myId) break; // mình chiếm được khoá
        }

        await new Promise((r) => setTimeout(r, 120));
    }

    try {
        return await fn();
    } finally {
        const raw = localStorage.getItem(REFRESH_LOCK_FALLBACK_KEY);
        const lock = raw ? JSON.parse(raw) : null;
        if (lock?.id === myId) {
            localStorage.removeItem(REFRESH_LOCK_FALLBACK_KEY);
        }
    }
}

function withRefreshLock(fn) {
    if (hasWebLocks()) {
        return navigator.locks.request(REFRESH_LOCK_NAME, fn);
    }
    return withFallbackLock(fn);
}

// tokenAtFailure: accessToken đang dùng tại thời điểm request gặp 401.
// Dùng để phát hiện "đã có tab/request khác refresh xong trong lúc mình chờ
// khoá chưa" — nếu rồi thì khỏi cần gọi BE lại.
function refreshAccessToken(tokenAtFailure) {
    return withRefreshLock(async () => {
        const current = getAccessToken();
        if (current && current !== tokenAtFailure) {
            // Tab/request khác đã refresh xong trong lúc mình chờ khoá.
            return;
        }
        await authApi.refreshToken({ refreshToken: getRefreshToken() });
    });
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
        // Đọc entityType TRƯỚC khi có khả năng bị clearTokens() xoá mất, để
        // redirectToLogin() ở nhánh catch bên dưới còn dùng được.
        const entityType = localStorage.getItem("entityType");
        // Token đang dùng lúc bị 401 — dùng để so sánh xem tab/request khác
        // đã refresh xong chưa (xem giải thích ở refreshAccessToken()).
        const tokenAtFailure = getAccessToken();

        try {
            // Khoá xuyên tab: tránh nhiều tab/request cùng refresh gây thu hồi
            // refreshToken chéo nhau (xem chi tiết ở phần Refresh Token Lock).
            await refreshAccessToken(tokenAtFailure);

            headers.Authorization = `Bearer ${getAccessToken()}`;

            res = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers,
            });
        } catch {
            clearTokens();
            redirectToLogin(entityType);
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
        const entityType = localStorage.getItem("entityType");
        const tokenAtFailure = getAccessToken();

        try {
            // Dùng chung khoá xuyên tab với request() ở trên.
            await refreshAccessToken(tokenAtFailure);

            headers.Authorization = `Bearer ${getAccessToken()}`;

            res = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers,
            });
        } catch {
            clearTokens();
            redirectToLogin(entityType);
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
    // Lưu ý: hàm này được gọi thông qua refreshAccessToken() (mutex) ở trên,
    // không nên gọi trực tiếp từ nhiều nơi cùng lúc để tránh race condition.

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

        // Đọc entityType TRƯỚC khi clearTokens(), vì clear xong sẽ không còn
        // lấy được giá trị này để biết redirect về đâu.
        const entityType = localStorage.getItem("entityType");
        clearTokens();

        redirectToLogin(entityType);
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