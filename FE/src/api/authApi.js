const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5231";

async function request(method, path, body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}/api/auth${path}`, options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const err = new Error(data?.message || data?.title || "Có lỗi xảy ra");
        err.status = res.status;
        err.errors = data?.errors || null;
        err.data = data;
        throw err;
    }

    return data;
}

const authApi = {
    // Flow đăng ký: sendOtp → verifyOtp (tạo account luôn)
    sendOtp(payload) {
        return request("POST", "/send-otp", payload);        // { phone }
    },
    verifyRegisterOtp(payload) {
        return request("POST", "/verify-otp", payload);      // { phone, otp, fullName, password, gender }
    },

    loginMember(payload) {
        return request("POST", "/member/login", payload);    // { phone, password }
    },
    loginEmployee(payload) {
        return request("POST", "/employee/login", payload);  // { phone, password }
    },
    refreshToken(payload) {
        return request("POST", "/refresh-token", payload);   // { refreshToken }
    },
    logout(payload) {
        return request("POST", "/logout", payload);          // { refreshToken }
    },
};

export default authApi;