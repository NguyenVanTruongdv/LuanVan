import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ allowedRoles }) {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("role");

    // Chưa đăng nhập
    if (!token) {
        return <Navigate to="/staff/login" replace />;
    }

    // Có role yêu cầu nhưng không đúng quyền
    if (
        allowedRoles &&
        !allowedRoles.includes(role)
    ) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;