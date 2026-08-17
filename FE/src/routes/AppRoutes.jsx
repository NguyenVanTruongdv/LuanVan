import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Public
import BranchDetail from "../pages/guest/BranchDetail";
import BranchListt from "../pages/guest/BranchsListHome";
import MayTapPage from "../pages/guest/EquiptMent";
import Home from "../pages/guest/Home";
import MembershipPlansPage from "../pages/guest/PackageList";
import Payment from "../pages/guest/Payment";

// Auth
import ForgotPassword from "../pages/auth/Forgotpassword";
import MemberLogin from "../pages/auth/Login/MemberLogin";
import StaffLogin from "../pages/auth/Login/StaffLogin";
import Register from "../pages/auth/Register";

// Member
import BranchList from "../pages/guest/BranchList";
import CommunityFeedPage from "../pages/guest/Forum/Communityfeedpage";
import Layout from "../pages/guest/Forum/Layout";
import PostDetailPage from "../pages/guest/Forum/PostDetailPage";
import ProfilePage from "../pages/guest/Forum/ProfilePage";
import IssueReportForm from "../pages/guest/Issuereportform";
import MemberProfilePage from "../pages/guest/MemberProfile";
import ThongKe from "../pages/guest/Thongke";

// Staff / Cashier
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
import InvoiceOfCashier from "../pages/cashier/packages/Invoice";
import RenewPage from "../pages/cashier/packages/Renewpage";
import CashierReport from "../pages/cashier/Report/CashierReportpage";

// Manager
import ManagerLayout from "../layouts/ManagerLayout";
// ⚠️ Trang thiết bị: dùng CHUNG 1 component đã fix (form Thêm/Sửa nằm inline
// bên trong, không tách route riêng nữa). Xoá hẳn import AddEquipmentPage
// và Equipmentlistpage cũ để tránh nhầm sang bản chưa fix.
import EmployeeListPageOfManager from "../pages/manager/Employee/EmployeeListpage";
import EquipmentListPageOfManager from "../pages/manager/Equiment/EquipmentListPage";
import IncidentPage from "../pages/manager/Incident/Incidentlist";
import ManagerDashboard from "../pages/manager/Managerdashboard";
import CheckinHistoryOfManager from "../pages/manager/Member/CheckinHistory";
import Invoice from "../pages/manager/Member/Invoice";
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
import AccountSystemPageOfAdmin from "../pages/admin/Employee/AccountSystem";
import AccountsystemDetailOfAdmin from "../pages/admin/Employee/AccountSystemdetail";
import CreateAccountPageOfAdmin from "../pages/admin/Employee/Createaccountpage";
import CreateEmployeePageOfAdmin from "../pages/admin/Employee/CreateEmployee";
import EmployeeDetailPage from "../pages/admin/Employee/Employeedetailpage";
import EmployeeListAdmin from "../pages/admin/Employee/EmployeeListpage";
import AddEquipmentPageOfAdmin from "../pages/admin/Equipment/Addequipmentpage";
import EquipmentListPageOfAdmin from "../pages/admin/Equipment/Equipmentlistpage";
import EquipmentCategoryCreatePage from "../pages/admin/EquipmentCategories/Equipmentcategorycreatepage";
import EquipmentCategoryListPage from "../pages/admin/EquipmentCategories/Equipmentcategorylistpage";
import AdminForumFeedPage from "../pages/admin/Forum/Adminforumfeedpage";
import AdminPostDetailPage from "../pages/admin/Forum/Adminpostdetailpage";
import ForumCategoryAdmin from "../pages/admin/Forum/Forumcategoryadmin";
import HomeImageManagement from "../pages/admin/HomeImg/HomeImage";

import CheckinHistoryOfAdmin from "../pages/admin/Identify/CheckinHistory";
import IncidentPageOfAdmin from "../pages/admin/Incident/Incident";
import InvoiceOfAdmin from "../pages/admin/Invoice/AdminInvoice";
import ListMemberOfAdmin from "../pages/admin/Member/ListMember";
import NewsCreateOfAdmin from "../pages/admin/News/Newscreate";
import NewsListOfAdmin from "../pages/admin/News/Newslist";
import MembershipPlanCreate from "../pages/admin/Package/createMembershipplan";
import LichSuDangKyGoiTapOfAdmin from "../pages/admin/Package/HistoryRegis";
import MembershipPlansAdmin from "../pages/admin/Package/Membershipplansadmin";
import ReportDashboard from "../pages/admin/Report/Report";
import PromotionUsageHistory from "../pages/admin/Voucher/Promotionusagehistory";
import VoucherCreatePage from "../pages/admin/Voucher/Vouchercreatepage";
import VoucherListPage from "../pages/admin/Voucher/VoucherListPage";
import CreateEmployeePageOfMana from "../pages/manager/Employee/CreateEmployee";
import EmployeeDetailPageOfMana from "../pages/manager/Employee/Employeedetailpage";
import AddEquipmentPageofManager from "../pages/manager/Equiment/Addequipmentpage";
import ListMemberOfMana from "../pages/manager/Member/ListMember";

function AppRoutes() {
    return (
        <Routes>
            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<Home />} />
            <Route path="/equiptment" element={<MayTapPage />} />
            <Route path="/packages" element={<MembershipPlansPage />} />
            <Route path="/branch" element={<BranchListt />} />
            <Route path="/branch/:id" element={<BranchDetail />} />
            <Route element={<Layout />}>
                <Route path="/forum" element={<CommunityFeedPage />} />
                <Route path="/bai-viet/:id" element={<PostDetailPage />} />
            </Route>

            {/* ================= AUTH ================= */}
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/register" element={<Register />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/member/forgot-password" element={<ForgotPassword />} />

            {/* ================= MEMBER ================= */}
            <Route element={<ProtectedRoute allowedRoles={["Member"]} loginPath="/member/login" />}>
                <Route path="/member/branches" element={<BranchList />} />
                <Route path="/thong-ke" element={<ThongKe />} />
                <Route path="/issue" element={<IssueReportForm />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/my-profile" element={<MemberProfilePage />} />
                <Route path="/forum/profile" element={<ProfilePage />} />
            </Route>

            {/* ================= STAFF / CASHIER ================= */}
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
                    <Route path="packages/transactions" element={<InvoiceOfCashier />} />
                    <Route path="reports" element={<CashierReport />} />
                </Route>
            </Route>

            {/* ================= MANAGER ================= */}
            <Route element={<ProtectedRoute allowedRoles={["Manager"]} loginPath="/staff/login" />}>
                <Route path="/manager" element={<ManagerLayout />}>
                    <Route index element={<ManagerDashboard />} />
                    <Route path="member/member-list" element={<ListMemberOfMana />} />
                    <Route path="member/checkin-history" element={<CheckinHistoryOfManager />} />
                    <Route path="members/transactions/invoice" element={<Invoice />} />
                    <Route path="members/packages/history" element={<LichSuDangKyGoiTapOfManager />} />
                    <Route path="employees" element={<EmployeeListPageOfManager />} />
                    <Route path="employees/:employeeId" element={<EmployeeDetailPageOfMana />} />
                    <Route path="employee/create" element={<CreateEmployeePageOfMana />} />
                    <Route path="equipment" element={<EquipmentListPageOfManager />} />
                    <Route path="equipment/add" element={<AddEquipmentPageofManager />} />
                    <Route path="news" element={<NewsList />} />
                    <Route path="news/create" element={<NewsCreate />} />
                    <Route path="incidents" element={<IncidentPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>
            </Route>

            {/* ================= ADMIN ================= */}
            <Route element={<ProtectedRoute allowedRoles={["Admin"]} loginPath="/staff/login" />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="branches" element={<BranchListAdmin />} />
                    <Route path="branch-create" element={<AddBranch />} />
                    <Route path="branches-img" element={<BranchImages />} />
                    <Route path="branches/:id" element={<BranchDetailOfAdmin />} />
                    <Route path="homepage/images" element={<HomeImageManagement />} />
                    <Route path="employees" element={<EmployeeListAdmin />} />
                    <Route path="employees/system" element={<AccountSystemPageOfAdmin />} />
                    <Route path="employees/:employeeId" element={<EmployeeDetailPage />} />
                    <Route path="employees/system/:employeeId" element={<AccountsystemDetailOfAdmin />} />
                    <Route path="employees/create" element={<CreateEmployeePageOfAdmin />} />
                    <Route path="employees/system/create" element={<CreateAccountPageOfAdmin />} />
                    <Route path="members" element={<ListMemberOfAdmin />} />
                    <Route path="forum">
                        <Route index element={<AdminForumFeedPage />} />
                        <Route path="bai-viet/:id" element={<AdminPostDetailPage />} />
                    </Route>
                    <Route path="forum-categories" element={<ForumCategoryAdmin />} />
                    <Route path="package-history" element={<LichSuDangKyGoiTapOfAdmin />} />
                    <Route path="packages" element={<MembershipPlansAdmin />} />
                    <Route path="package-create" element={<MembershipPlanCreate />} />
                    <Route path="checkin-history" element={<CheckinHistoryOfAdmin />} />
                    <Route path="vouchers" element={<VoucherListPage />} />
                    <Route path="voucher-create" element={<VoucherCreatePage />} />
                    <Route path="voucher-history" element={<PromotionUsageHistory />} />
                    {/* Cùng 1 component với Manager, đã fix branches.map is not
                        a function + form Thêm/Sửa inline -> không còn route
                        "equipment-create" riêng nữa. */}
                    <Route path="equipments" element={<EquipmentListPageOfAdmin />} />
                    <Route path="equipment-create" element={<AddEquipmentPageOfAdmin />} />
                    <Route path="equipment-types" element={<EquipmentCategoryListPage />} />
                    <Route path="equipment-type-create" element={<EquipmentCategoryCreatePage />} />
                    <Route path="news" element={<NewsListOfAdmin />} />
                    <Route path="news-create" element={<NewsCreateOfAdmin />} />
                    <Route path="invoices" element={<InvoiceOfAdmin />} />
                    <Route path="reports" element={<ReportDashboard />} />
                    <Route path="incidents" element={<IncidentPageOfAdmin />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default AppRoutes;