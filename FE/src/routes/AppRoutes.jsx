import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Public
import BranchDetail from "../pages/guest/BranchDetail";
import BranchListt from "../pages/guest/BranchsListHome";
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
import CommunityFeedPage from "../pages/guest/Forum/Communityfeedpage";
import Layout from "../pages/guest/Forum/Layout";
import PostDetailPage from "../pages/guest/Forum/PostDetailPage";
import IssueReportForm from "../pages/guest/Issuereportform";
import ThongKe from "../pages/guest/Thongke";
// Staff
import { getCurrentUser, isLoggedIn } from "../api/authApi";
import CashierLayout from "../layouts/CashierLayout";
import Dashboard from "../pages/cashier/CashierDashboard";
import CreatePackPage from "../pages/cashier/Employee/CreatePack";
import ListEmployee from "../pages/cashier/Employee/ListEmployee";
import IncidentReportForm from "../pages/cashier/Incident/IncidenReport";
import IncidentList from "../pages/cashier/Incident/IncidentList";
import CameraRecognition from "../pages/cashier/indentify/Camerarecognition";
import CheckinHistory from "../pages/cashier/indentify/History";
import MemberActive from "../pages/cashier/member/ActiveMember";
import MemberListPage from "../pages/cashier/member/ListMember";
import GymMemberRegistration from "../pages/cashier/member/RegisterMember";
import LichSuDangKyGoiTap from "../pages/cashier/packages/History";
import InvoiceOfCashier from "../pages/cashier/packages/Invoice";
import RenewPage from "../pages/cashier/packages/Renewpage";
//manager
import ManagerLayout from "../layouts/ManagerLayout";
import EmployeeListPageOfAdmin from "../pages/admin/Employee/EmpoyeeSystemListpage";
import ProfilePage from "../pages/guest/Forum/ProfilePage";
import MemberProfilePage from "../pages/guest/MemberProfile";
import ListEmployeeOfMana from "../pages/manager/Employee/EmployeeOfMana";
import EmployeeListPage from "../pages/manager/Employee/EmployeeSystemListpage";
import AddEquipmentPage from "../pages/manager/Equiment/Addequipmentpage";
import EquipmentListPage from "../pages/manager/Equiment/Equipmentlistpage";
import IncidentPage from "../pages/manager/Incident/Incidentlist";
import CheckinHistoryOfManager from "../pages/manager/Member/CheckinHistory";
import Invoice from "../pages/manager/Member/Invoice";
import ListMemberOfManager from "../pages/manager/Member/ListMember";
import LichSuDangKyGoiTapOfManager from "../pages/manager/Member/Package/HistoryRegis";
import NewsCreate from "../pages/manager/News/Newscreate";
import NewsList from "../pages/manager/News/Newslist";
import ReportsPage from "../pages/manager/Report/ReportsPage";
// Admin
import AdminLayout from "../layouts/AdminLayout";
import BranchDetailOfAdmin from "../pages/admin/Branch/BranchDetail";
import BranchImages from "../pages/admin/Branch/Branchimages";
import BranchListAdmin from "../pages/admin/Branch/BranchList";
import AddBranch from "../pages/admin/Branch/CreateBranch";
import DashboardOverview from "../pages/admin/Dashboard";
import CreateEmployeeAdmin from "../pages/admin/Employee/CreateEmployee";
import ListEmployeeOfAdmin from "../pages/admin/Employee/EmployeeOfAdmin";
import ListMemberOfAdmin from "../pages/admin/Member/ListMember";
import GymMemberRegistrationStaff from "../pages/cashier/Employee/CreateEmployee";
function AppRoutes() {
    return (
        <Routes>
            {/* ================= PUBLIC ================= */}

            <Route path="/" element={<Home />} />
            <Route path="/equiptment" element={<MayTapPage />} />
            <Route path="/packages" element={<MembershipPlansPage />} />

            <Route path="/branch" element={<BranchListt />} />
            <Route path="/branch/:id" element={<BranchDetail />} />
            <Route path="" element={<Layout />} >
                <Route path="/forum" element={<CommunityFeedPage />} />
                <Route path="/bai-viet/:id" element={<PostDetailPage />} />
                <Route path="/forum/profile" element={<ProfilePage />} />
            </Route>


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
                <Route path="my-info" element={<MemberProfilePage />} />

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
                    <Route path="packages/invoice" element={<InvoiceOfCashier />} />
                    <Route path="staffs" element={<ListEmployee />} />
                    <Route path="staff-create" element={<GymMemberRegistrationStaff />} />
                    <Route path="staff/create-pack" element={<CreatePackPage />} />
                </Route>
            </Route>

            {/* ================= MANAGER ================= */}
            {/* 1) ProtectedRoute chặn user chưa đăng nhập / sai role vào thẳng /manager
                2) BranchProvider bọc bên trong, chỉ tồn tại khi ở khu Manager */}
            <Route element={<ProtectedRoute allowedRoles={["Manager"]} loginPath="/staff/login" />} >
                <Route path="/manager" element={<ManagerLayout />} >
                    <Route index element={<Dashboard />} />
                    <Route path="member/member-list" element={<ListMemberOfManager />} />
                    <Route path="member/checkin-history" element={<CheckinHistoryOfManager />} />
                    <Route path="members/transactions/invoice" element={<Invoice />} />
                    <Route path="members/packages/history" element={<LichSuDangKyGoiTapOfManager />} />
                    <Route path="staff/system" element={<EmployeeListPage />} />
                    <Route path="staff" element={<ListEmployeeOfMana />} />
                    <Route path="equipment" element={<EquipmentListPage />} />
                    <Route path="equipment/add" element={<AddEquipmentPage />} />
                    <Route path="news" element={<NewsList />} />
                    <Route path="news/create" element={<NewsCreate />} />
                    <Route path="incidents" element={<IncidentPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>
            </Route>
            {/* ================= Admin ================= */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardOverview />} />

                <Route path="branches" element={<BranchListAdmin />} />
                <Route path="branch-create" element={<AddBranch />} />
                <Route path="branches-img" element={<BranchImages />} />staffs
                <Route path="branches/:id" element={<BranchDetailOfAdmin />} />
                <Route path="staffs/system" element={<EmployeeListPageOfAdmin />} />
                <Route path="staffs" element={<ListEmployeeOfAdmin />} />
                <Route path="staff-create" element={<CreateEmployeeAdmin />} />
                <Route path="members" element={<ListMemberOfAdmin />} />
                <Route path="forum" element={<CommunityFeedPage />} />
            </Route>
        </Routes>
    );
}
export default AppRoutes;