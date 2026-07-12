import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Public
import BranchDetail from "../pages/guest/BranchDetail";
import BranchListt from "../pages/guest/BranchsListHome";
import ForumFeed from "../pages/guest/Comunity";
import MayTapPage from "../pages/guest/EquiptMent";
import Home from "../pages/guest/Home";
import MembershipPlansPage from "../pages/guest/PackageList";
import Payment from "../pages/guest/Payment";

// Auth
import MemberLogin from "../pages/auth/Login/MemberLogin";
import StaffLogin from "../pages/auth/Login/StaffLogin";
import Register from "../pages/auth/Register";

// Member
import BranchList from "../pages/guest/BranchList";
import IssueReportForm from "../pages/guest/Issuereportform";
import ThongKe from "../pages/guest/Thongke";

// Staff
import { getCurrentUser, isLoggedIn } from "../api/authApi";
import CashierLayout from "../layouts/CashierLayout";
import Dashboard from "../pages/cashier/CashierDashboard";
import IncidentReportForm from "../pages/cashier/Incident/IncidenReport";
import IncidentList from "../pages/cashier/Incident/IncidentList";
import CameraRecognition from "../pages/cashier/indentify/Camerarecognition";
import CheckinHistory from "../pages/cashier/indentify/History";
import MemberActive from "../pages/cashier/member/ActiveMember";
import MemberListPage from "../pages/cashier/member/ListMember";
import GymMemberRegistration from "../pages/cashier/member/RegisterMember";
import LichSuDangKyGoiTap from "../pages/cashier/packages/History";
import RenewPage from "../pages/cashier/packages/Renewpage";

import ManagerLayout from "../layouts/ManagerLayout";
import CheckinHistoryOfManager from "../pages/manager/Member/CheckinHistory";
import ListMemberOfManager from "../pages/manager/Member/ListMember";
import AdjustTransactionPlan from "../pages/manager/Member/Package/Adjusttransaction";
import LichSuDangKyGoiTapOfManager from "../pages/manager/Member/Package/HistoryRegis";

function AppRoutes() {
    return (
        <Routes>
            {/* ================= PUBLIC ================= */}

            <Route path="/" element={<Home />} />
            <Route path="/equiptment" element={<MayTapPage />} />
            <Route path="/packages" element={<MembershipPlansPage />} />

            <Route path="/branch" element={<BranchListt />} />
            <Route path="/branch/:id" element={<BranchDetail />} />
            <Route path="/comunity" element={<ForumFeed />} />
            <Route path="/member/branches" element={<BranchList />} />
            {/* ================= AUTH ================= */}

            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/register" element={<Register />} />
            <Route path="/staff/login" element={<StaffLogin />} />

            {/* ================= MEMBER ================= */}

            <Route
                element={
                    <ProtectedRoute allowedRoles={["Member"]} loginPath="/member/login" />}>

                <Route path="/member/branches" element={<BranchList />} />
                <Route path="/thong-ke" element={<ThongKe />} />
                <Route path="/issue" element={isLoggedIn() && getCurrentUser().status === "Active" ? < IssueReportForm /> : <Navigate to="/" replace />} />
                <Route path="/payment" element={<Payment />} />
            </Route>

            {/* ================= STAFF ================= */}

            <Route element={<ProtectedRoute allowedRoles={["Staff",]} loginPath="/staff/login" />}  >
                <Route path="/indentify" element={<CameraRecognition />} />
                <Route path="/cashier" element={<CashierLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="checkin-history" element={<CheckinHistory />} />
                    <Route path="member-create" element={<GymMemberRegistration />} />
                    <Route path="member-active" element={<MemberActive />} />
                    <Route path="members" element={<MemberListPage />} />
                    <Route path="incidents-report" element={<IncidentReportForm />} />
                    <Route path="incidents-list" element={<IncidentList />} />
                    <Route path="packages/renew" element={<RenewPage />} />
                    <Route path="packages/history" element={<LichSuDangKyGoiTap />} />
                </Route>
            </Route>

            {/* ================= MANAGER ================= */}
            {/* 1) ProtectedRoute chặn user chưa đăng nhập / sai role vào thẳng /manager
                2) BranchProvider bọc bên trong, chỉ tồn tại khi ở khu Manager */}
            <Route element={<ProtectedRoute allowedRoles={["Manager"]} loginPath="/staff/login" />} >
                <Route
                    path="/manager"
                    element={

                        <ManagerLayout />

                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="member/member-list" element={<ListMemberOfManager />} />
                    <Route path="member/checkin-history" element={<CheckinHistoryOfManager />} />
                    <Route path="members/packages/history" element={<LichSuDangKyGoiTapOfManager />} />
                    <Route path="members/packages/adjust" element={<AdjustTransactionPlan />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default AppRoutes;