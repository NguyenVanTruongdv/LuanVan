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

// Manager
import ManagerLayout from "../layouts/ManagerLayout";
import ProfilePage from "../pages/guest/Forum/ProfilePage";
import MemberProfilePage from "../pages/guest/MemberProfile";
import CreateEmployeePage from "../pages/manager/Employee/CreateEmployee";
import EmployeeListManager from "../pages/manager/Employee/EmployeeListpage";
// ⚠️ Trang thiết bị: dùng CHUNG 1 component đã fix (form Thêm/Sửa nằm inline
// bên trong, không tách route riêng nữa). Xoá hẳn import AddEquipmentPage
// và Equipmentlistpage cũ để tránh nhầm sang bản chưa fix.
import EquipmentListPageOfManager from "../pages/manager/Equiment/EquipmentListPage";
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
import CreateEmployeePageOfAdmin from "../pages/admin/Employee/CreateEmployee";
import EmployeeListAdmin from "../pages/admin/Employee/EmployeeListpage";
import AddEquipmentPageOfAdmin from "../pages/admin/Equipment/Addequipmentpage";
import EquipmentListPageOfAdmin from "../pages/admin/Equipment/Equipmentlistpage";
import EquipmentCategoryCreatePage from "../pages/admin/EquipmentCategories/Equipmentcategorycreatepage";
import EquipmentCategoryListPage from "../pages/admin/EquipmentCategories/Equipmentcategorylistpage";
import ListMemberOfAdmin from "../pages/admin/Member/ListMember";
import MembershipPlanCreate from "../pages/admin/Package/createMembershipplan";
import LichSuDangKyGoiTapOfAdmin from "../pages/admin/Package/HistoryRegis";
import MembershipPlansAdmin from "../pages/admin/Package/Membershipplansadmin";
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
            <Route path="" element={<Layout />}>
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

            <Route element={<ProtectedRoute allowedRoles={["Member"]} loginPath="/member/login" />}>
                <Route path="/member/branches" element={<BranchList />} />
                <Route path="/thong-ke" element={<ThongKe />} />
                <Route
                    path="/issue"
                    element={
                        isLoggedIn() && getCurrentUser().status === "Active" ? (
                            <IssueReportForm />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />
                <Route path="/payment" element={<Payment />} />
                <Route path="my-profile" element={<MemberProfilePage />} />
            </Route>

            {/* ================= STAFF ================= */}

            <Route element={<ProtectedRoute allowedRoles={["Staff"]} loginPath="/staff/login" />}>
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
            <Route element={<ProtectedRoute allowedRoles={["Manager"]} loginPath="/staff/login" />}>
                <Route path="/manager" element={<ManagerLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="member/member-list" element={<ListMemberOfManager />} />
                    <Route path="member/checkin-history" element={<CheckinHistoryOfManager />} />
                    <Route path="members/transactions/invoice" element={<Invoice />} />
                    <Route path="members/packages/history" element={<LichSuDangKyGoiTapOfManager />} />

                    <Route path="staff" element={<EmployeeListManager />} />
                    <Route path="staff/create" element={<CreateEmployeePage />} />

                    {/* Thêm/Sửa thiết bị giờ nằm inline trong chính trang này
                        (đổi viewMode nội bộ) -> chỉ cần 1 route duy nhất. */}
                    <Route path="equipment" element={<EquipmentListPageOfManager />} />
                    <Route path="equipment/add" element={<AddEquipmentPageOfAdmin />} />
                    <Route path="news" element={<NewsList />} />
                    <Route path="news/create" element={<NewsCreate />} />
                    <Route path="incidents" element={<IncidentPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>
            </Route>

            {/* ================= ADMIN ================= */}

            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardOverview />} />

                <Route path="branches" element={<BranchListAdmin />} />
                <Route path="branch-create" element={<AddBranch />} />
                <Route path="branches-img" element={<BranchImages />} />
                <Route path="branches/:id" element={<BranchDetailOfAdmin />} />
                <Route path="staffs" element={<EmployeeListAdmin />} />
                <Route path="staff-create" element={<CreateEmployeePageOfAdmin />} />
                <Route path="members" element={<ListMemberOfAdmin />} />
                <Route path="forum" element={<CommunityFeedPage />} />
                <Route path="package-history" element={<LichSuDangKyGoiTapOfAdmin />} />
                <Route path="packages" element={<MembershipPlansAdmin />} />
                <Route path="package-create" element={<MembershipPlanCreate />} />

                {/* Cùng 1 component với Manager, đã fix branches.map is not
                    a function + form Thêm/Sửa inline -> không còn route
                    "equipment-create" riêng nữa. */}
                <Route path="equipments" element={<EquipmentListPageOfAdmin />} />
                <Route path="equipment-create" element={<AddEquipmentPageOfAdmin />} />
                <Route path="equipment-types" element={<EquipmentCategoryListPage />} />
                <Route path="equipment-type-create" element={<EquipmentCategoryCreatePage />} />
                <Route path="news" element={<NewsList />} />
                <Route path="news-create" element={<NewsCreate />} />

                
            </Route>
        </Routes>
    );
}

export default AppRoutes;