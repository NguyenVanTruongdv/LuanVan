import { Route, Routes } from "react-router-dom";
import MemberLogin from "../pages/auth/Login/MemberLogin";
import Register from "../pages/auth/Register";
//Nhân viên 
import CashierLayout from "../layouts/CashierLayout";
import StaffLogin from "../pages/auth/Login/StaffLogin";
import Dashboard from "../pages/cashier/CashierDashboard";
import Checkin from "../pages/cashier/checkin/Checkin";
import GymMemberRegistration from "../pages/cashier/member/RegisterMember";
function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/member/register"
                element={<Register />}
            />
            <Route
                path="/member/login"
                element={<MemberLogin />}
            />
            {/* của nhân viên */}
            <Route
                path="/staff/login"
                element={<StaffLogin />}
            />
            {/* <Route element={<ProtectedRoute />}> */}
            <Route path="/cashier" element={<CashierLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="checkin" element={<Checkin />} />
                <Route path="register-member" element={<GymMemberRegistration></GymMemberRegistration>} />
            </Route>

            {/* </Route> */}
        </Routes>
    );
}

export default AppRoutes;