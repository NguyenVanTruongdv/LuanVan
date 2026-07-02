const BASE_URL =
import.meta.env.VITE_API_BASE_URL || "http://localhost:5231";

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
}

export function clearTokens() {
localStorage.removeItem("accessToken");
localStorage.removeItem("refreshToken");
localStorage.removeItem("fullName");
localStorage.removeItem("role");
localStorage.removeItem("entityType");
}

export function isLoggedIn() {
return !!getAccessToken();
}

export function getCurrentUser() {
return {
fullName: localStorage.getItem("fullName") || "",
role: localStorage.getItem("role") || "",
entityType: localStorage.getItem("entityType") || "",
};
}

// ─────────────────────────────────────────────
// Base Request
// ─────────────────────────────────────────────

async function request(method, path, body = null, auth = false) {
const headers = {
"Content-Type": "application/json",
};

if (auth) {
    headers.Authorization = `Bearer ${getAccessToken()}`;
}

const options = {
    method,
    headers,
};

if (body) {
    options.body = JSON.stringify(body);
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
        window.location.href = "/member/login";
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

// ===== AUTH FETCH =====

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

delete(path, auth = true) {
    return request(
        "DELETE",
        path,
        null,
        auth
    );
},


};

export default authApi;
