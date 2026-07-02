import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({
    allowedRoles,
    loginPath = "/login",
}) {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("role");

    // Chưa đăng nhập
    if (!token) {
        return <Navigate to={loginPath} replace />;
    }

    // Có yêu cầu role nhưng không đúng quyền
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;