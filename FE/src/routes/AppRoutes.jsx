import { Route, Routes } from "react-router-dom";
import MemberLogin from "../pages/auth/Login/MemberLogin";
import Register from "../pages/auth/Register";
import BranchList from "../pages/guest/BranchList";
//Nhân viên 
import CashierLayout from "../layouts/CashierLayout";
import StaffLogin from "../pages/auth/Login/StaffLogin";
import Dashboard from "../pages/cashier/CashierDashboard";
import Checkin from "../pages/cashier/checkin/Checkin";
import IncidentReportForm from "../pages/cashier/Incident/IncidenReport";
import MemberListPage from "../pages/cashier/member/ListMember";
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
            <Route path="/member/branches" element={<BranchList></BranchList>} />
            {/* của nhân viên */}
            <Route
                path="/staff/login"
                element={<StaffLogin />}
            />
            {/* <Route element={<ProtectedRoute />}> */}
            <Route path="/cashier" element={<CashierLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="checkin" element={<Checkin />} />
                <Route path="member-create" element={<GymMemberRegistration></GymMemberRegistration>} />
                <Route path="members" element={<MemberListPage></MemberListPage>} />
                <Route path="incident-report" element={<IncidentReportForm></IncidentReportForm>} />
            </Route>

            {/* </Route> */}
        </Routes>
    );
}

export default AppRoutes;