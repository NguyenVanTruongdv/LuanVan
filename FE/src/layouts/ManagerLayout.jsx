import {
    AlertTriangle,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Dumbbell,
    History,
    LayoutDashboard,
    ListTree,
    LogOut,
    MapPin,
    Menu,
    Newspaper,
    Receipt,
    ShieldCheck,
    UserCog,
    Users,
    Wrench,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import authApi from "../api/authApi"; // dùng để gọi API đăng xuất
import managerApi from "../api/managerApi"; // đổi lại path cho khớp cấu trúc thư mục thực tế
import logo from "../assets/logo.png";

/**
 * ManagerLayout
 * ------------------------------------------------------------------
 * Layout khung cho trang Manager (Sidebar + Header + vùng nội dung).
 * Đồng bộ 1:1 với hệ thống thiết kế của AdminLayout (bản sáng):
 * nền xám nhạt (#F1F5F9), sidebar/header trắng, viền xanh mint nhạt
 * (#A7F3D0 / #E2E8F0), điểm nhấn xanh lá (#059669), chữ tối
 * (#1E293B / #64748B / #94A3B8), cùng bo góc / khoảng cách / bóng đổ
 * giống Admin. CSS thuần gộp vào 1 file qua thẻ <style>, icon từ
 * lucide-react.
 * Khác biệt so với Admin (đặc thù của Manager, được giữ nguyên):
 * - Menu hỗ trợ lồng nhiều cấp (Hội viên > Quản lý gói tập > ...).
 * - Header hiển thị danh sách chi nhánh (chỉ xem, lấy từ profile API).
 * - Sidebar có nút Đăng xuất thật (gọi authApi.logout()).
 * - Header/sidebar hiển thị thông tin nhân viên quản lý (tên, vai trò,
 *   avatar) kèm skeleton loading trong lúc chờ API.
 * ------------------------------------------------------------------
 */

const NAV_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tổng quan", path: "/manager" },
    {
        id: "members",
        icon: Users,
        label: "Hội viên",
        matchPrefix: "/manager/member",
        children: [
            { id: "members-list", icon: ListTree, label: "Danh sách hội viên", path: "/manager/member/member-list" },
        ],
    },
    {
        id: "history",
        icon: History,
        label: "Lịch sử",
        matchPrefix: "/manager/statistics",
        children: [
            { id: "packages-history", icon: History, label: "Lịch sử đăng ký gói tập", path: "/manager/members/packages/history" },
            { id: "members-checkin", icon: CheckSquare, label: "Lịch sử Check-in /Out", path: "/manager/member/checkin-history" },
        ],
    },
    {
        id: "transactions",
        icon: Receipt,
        label: "Giao dịch",
        matchPrefix: "/manager/members/transactions",
        children: [
            { id: "invoice", icon: Receipt, label: "Hóa đơn", path: "/manager/members/transactions/invoice" },
        ],
    },
    {
        id: "staff",
        icon: UserCog,
        label: "Nhân viên",
        matchPrefix: "/manager/staff",
        children: [
            { id: "staff-list", icon: ListTree, label: "Nhân viên", path: "/manager/employees" },
            // TODO: đổi path cho khớp route thực tế của "Tạo nhân viên"
            { id: "staff-create", icon: ShieldCheck, label: "Tạo nhân viên", path: "/manager/employee/create" },
        ],
    },
    {
        id: "equipment",
        icon: Dumbbell,
        label: "Thiết bị",
        matchPrefix: "/manager/equipment",
        children: [
            { id: "equipment-list", icon: ListTree, label: "Danh sách thiết bị", path: "/manager/equipment" },
            { id: "equipment-add", icon: Wrench, label: "Thêm thiết bị", path: "/manager/equipment/add" },
        ],
    },
    {
        id: "incidents",
        icon: AlertTriangle,
        label: "Sự cố",
        matchPrefix: "/manager/incidents",
        children: [
            { id: "incidents-list", icon: ListTree, label: "Danh sách sự cố", path: "/manager/incidents" },
        ],
    },
    {
        id: "news",
        icon: Newspaper,
        label: "Tin tức",
        matchPrefix: "/manager/news",
        children: [
            { id: "news-list", icon: ListTree, label: "Danh sách bài viết", path: "/manager/news" },
            { id: "news-create", icon: ListTree, label: "Tạo bài viết", path: "/manager/news/create" },
        ],
    },
    {
        id: "reports",
        icon: ListTree, // TODO: cân nhắc đổi sang icon riêng (vd: BarChart3) nếu đã import
        label: "Báo cáo ",
        matchPrefix: "/manager/reports",
        children: [
            { id: "reports-overview", icon: ListTree, label: "Báo cáo tổng quan", path: "/manager/reports" },
        ],
    },
];

const ROLE_LABELS = {
    Staff: "Cashier",
    Manager: "Quản lý",
    Admin: "Quản trị viên",
};

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

function getInitials(fullName) {
    if (!fullName) return "QL";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Kiểm tra xem 1 item (hoặc bất kỳ item con nào ở mọi cấp) có đang active không
function hasActiveDescendant(item, pathname) {
    if (!item.children) return false;
    return item.children.some(
        (child) =>
            (child.path && pathname === child.path) ||
            (child.matchPrefix && pathname.startsWith(child.matchPrefix)) ||
            hasActiveDescendant(child, pathname)
    );
}

// Thu thập id của mọi nhóm cha (ở mọi cấp) đang chứa route hiện tại,
// để tự động mở submenu tương ứng khi load trang / đổi route.
function collectOpenAncestors(items, pathname, acc = []) {
    for (const item of items) {
        if (!item.children) continue;
        const childActive =
            hasActiveDescendant(item, pathname) || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
        if (childActive && !acc.includes(item.id)) acc.push(item.id);
        collectOpenAncestors(item.children, pathname, acc);
    }
    return acc;
}

function Logo() {
    return (
        <div className="ml-logo">
            <div className="ml-logo-badge">
                <img src={logo} alt="Logo" className="ml-logo-img" />
            </div>
            <div className="ml-logo-text">
                <p className="ml-logo-title">VT Gym</p>
                <p className="ml-logo-sub">Manager Portal</p>
            </div>
        </div>
    );
}

// Render đệ quy — hỗ trợ menu lồng nhau ở mọi cấp
// (Hội viên > Quản lý gói tập > Lịch sử / Hóa đơn).
function NavLink({ item, active, expanded, onClick, level = 0 }) {
    const Icon = item.icon;
    const hasChildren = !!item.children?.length;

    return (
        <button
            onClick={() => onClick(item)}
            className={cx("ml-navlink", level > 0 && "ml-navlink-sub", active && "ml-navlink-active")}
            style={level > 1 ? { paddingLeft: 30 + (level - 1) * 18 } : undefined}
        >
            {level === 0 && Icon ? (
                <Icon size={18} strokeWidth={2} className="ml-navlink-icon" />
            ) : level > 0 ? (
                <span className={cx("ml-navdot", active && "ml-navdot-active")} />
            ) : null}
            <span className="ml-navlink-label">{item.label}</span>
            {hasChildren &&
                (expanded ? <ChevronDown size={15} className="ml-navlink-chevron" /> : (
                    <ChevronRight size={15} className="ml-navlink-chevron" />
                ))}
        </button>
    );
}

function Sidebar({
    openMenus,
    toggleMenu,
    mobileOpen,
    closeMobile,
    staffName,
    staffRole,
    staffInitials,
    profileLoading,
    loggingOut,
    onLogout,
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const isPathActive = (path) => location.pathname === path;

    // Render đệ quy 1 nhánh menu (item + children ở mọi cấp)
    const renderItem = (item, level = 0) => {
        const hasChildren = !!item.children?.length;
        const isParentActive = hasChildren
            ? hasActiveDescendant(item, location.pathname) ||
            (item.matchPrefix && location.pathname.startsWith(item.matchPrefix))
            : isPathActive(item.path);
        const expanded = openMenus.includes(item.id);

        return (
            <div key={item.id}>
                <NavLink
                    item={item}
                    level={level}
                    active={isParentActive && !hasChildren}
                    expanded={expanded}
                    onClick={(it) => {
                        if (hasChildren) {
                            toggleMenu(it.id);
                        } else {
                            navigate(it.path);
                            closeMobile();
                        }
                    }}
                />
                {hasChildren && expanded && (
                    <div className="ml-submenu">
                        {item.children.map((child) => renderItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {mobileOpen && <div className="ml-overlay" onClick={closeMobile} />}

            <aside className={cx("ml-sidebar", mobileOpen && "ml-sidebar-open")}>
                <div className="ml-sidebar-head">
                    <Logo />
                    <button onClick={closeMobile} className="ml-close-btn">
                        <X size={18} />
                    </button>
                </div>

                <nav className="ml-nav">
                    {NAV_ITEMS.map((item) => renderItem(item, 0))}
                </nav>

                <div className="ml-sidebar-foot">


                    <button className="ml-logout-btn" onClick={onLogout} disabled={loggingOut}>
                        <LogOut size={16} className="ml-logout-icon" />
                        <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function Header({ onMenuClick, branches, branchesLoading, branchesError, staffName, staffRole, staffInitials, profileLoading }) {
    return (
        <header className="ml-header">
            <div className="ml-header-top">
                <button onClick={onMenuClick} className="ml-menu-btn">
                    <Menu size={20} />
                </button>

                {/* Danh sách chi nhánh — chỉ hiển thị, không thao tác (lọc thật nằm trong trang Check-in) */}
                <div className="ml-branch-row">
                    {branchesLoading ? (
                        <>
                            <span className="ml-skeleton" style={{ width: 90, height: 26, borderRadius: 999 }} />
                            <span className="ml-skeleton" style={{ width: 90, height: 26, borderRadius: 999 }} />
                        </>
                    ) : branches.length > 0 ? (
                        branches.map((b) => (
                            <span key={b.branchId} className="ml-branch-chip">
                                <MapPin size={13} />
                                {b.branchName}
                            </span>
                        ))
                    ) : (
                        <span className="ml-branch-empty">
                            {branchesError ? "Không tải được chi nhánh" : "Chưa có chi nhánh"}
                        </span>
                    )}
                </div>

                <div className="ml-header-right">
                    <button className="ml-user-btn">
                        <div className="ml-avatar ml-avatar-small">
                            {profileLoading ? (
                                <span className="ml-skeleton" style={{ width: 16, height: 9 }} />
                            ) : (
                                staffInitials
                            )}
                        </div>
                        <div className="ml-user-text">
                            {profileLoading ? (
                                <>
                                    <span className="ml-skeleton" style={{ width: 90, height: 11, marginBottom: 3 }} />
                                    <span className="ml-skeleton" style={{ width: 50, height: 9 }} />
                                </>
                            ) : (
                                <>
                                    <p className="ml-user-name">{staffName}</p>
                                    <p className="ml-user-role">{staffRole}</p>
                                </>
                            )}
                        </div>
                        <ChevronDown size={14} className="ml-user-chevron" />
                    </button>
                </div>
            </div>
        </header>
    );
}

export default function ManagerLayout() {
    document.title = "VT Gym Manager";

    const location = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState(() => collectOpenAncestors(NAV_ITEMS, location.pathname));
    const [loggingOut, setLoggingOut] = useState(false);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(false);

    // branches: mảng object { branchId, branchName } lấy từ API — chỉ hiển thị, không thao tác gì thêm
    const [branches, setBranches] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            setProfileLoading(true);
            setProfileError(false);
            try {
                // Nếu managerApi trả nguyên response axios thay vì unwrap sẵn,
                // đổi thành: const data = (await managerApi.getEmployeeProfile()).data;
                const data = await managerApi.getEmployeeProfile();
                if (cancelled) return;

                setProfile(data);
                const branchList = Array.isArray(data.branches) ? data.branches : [];
                setBranches(branchList);
            } catch (err) {
                if (!cancelled) setProfileError(true);
                console.error("Không thể tải thông tin quản lý:", err);
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        }

        fetchProfile();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleMenu = (id) =>
        setOpenMenus((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));

    // Gọi API đăng xuất (huỷ refresh token ở BE + xoá token/local storage phía
    // client, xem authApi.logout()), sau đó điều hướng về trang đăng nhập.
    // authApi.logout() tự nuốt lỗi mạng/API bên trong nên luôn có thể clear +
    // chuyển trang an toàn dù request logout thất bại.
    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await authApi.logout();
        } finally {
            setLoggingOut(false);
            navigate("/staff/login", { replace: true }); // đổi lại path cho khớp route đăng nhập thực tế
        }
    };

    const staffName = profile?.fullName || (profileLoading ? "Đang tải..." : "Quản lý");
    const staffRole = ROLE_LABELS[profile?.role] || profile?.role || "Quản lý";
    const staffInitials = getInitials(profile?.fullName);

    return (
        <div className="ml-root">
            <style>{CSS}</style>

            <Sidebar
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                mobileOpen={mobileOpen}
                closeMobile={() => setMobileOpen(false)}
                staffName={staffName}
                staffRole={staffRole}
                staffInitials={staffInitials}
                profileLoading={profileLoading}
                loggingOut={loggingOut}
                onLogout={handleLogout}
            />

            <div className="ml-main-col">
                <Header
                    onMenuClick={() => setMobileOpen(true)}
                    branches={branches}
                    branchesLoading={profileLoading}
                    branchesError={profileError}
                    staffName={staffName}
                    staffRole={staffRole}
                    staffInitials={staffInitials}
                    profileLoading={profileLoading}
                />

                <main className="ml-content">
                    <Outlet context={{ profile }} />
                </main>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
 * CSS thuần, gộp chung vào file này.
 * Prefix "ml-" (Manager Layout) — đồng bộ 1:1 bảng màu / kích thước
 * với "al-" của AdminLayout: nền sáng, sidebar/header trắng, viền
 * xanh mint nhạt, điểm nhấn xanh lá (#059669).
 * ------------------------------------------------------------------ */
const CSS = `
* { box-sizing: border-box; }

.ml-root {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #F1F5F9;
  color: #1E293B;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}

@keyframes ml-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
.ml-skeleton {
  display: inline-block;
  animation: ml-pulse 1.4s ease-in-out infinite;
  background: rgba(148, 163, 184, 0.25);
  border-radius: 4px;
}

/* ---------- Sidebar ---------- */
.ml-sidebar {
  position: fixed;
  top: 10px;
  bottom: 10px;
  left: 10px;
  z-index: 40;
  width: 230px;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.28), 0 8px 16px -6px rgba(15, 23, 42, 0.16);
  overflow: hidden;
  transform: translateX(calc(-100% - 20px));
  transition: transform 0.2s ease;
}

.ml-sidebar-open {
  transform: translateX(0);
}

.ml-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.35);
}

.ml-sidebar-head {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #E2E8F0;
}

.ml-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ml-logo-badge {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 0 0 1px rgba(5, 150, 105, 0.2) inset;
}

.ml-logo-img { height: 20px; width: 20px; object-fit: contain; }

.ml-logo-text { line-height: 1.2; min-width: 0; }
.ml-logo-title { margin: 0; font-size: 14px; font-weight: 800; color: #1E293B; letter-spacing: -0.2px; white-space: nowrap; }
.ml-logo-sub { margin: 0; font-size: 11px; color: #059669; font-weight: 500; white-space: nowrap; }

.ml-close-btn {
  border: none;
  background: none;
  padding: 6px;
  border-radius: 6px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
.ml-close-btn:hover { background: #F1F5F9; }

.ml-nav {
  flex: 1;
  overflow-y: auto;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ml-nav::-webkit-scrollbar { display: none; width: 0; height: 0; }

.ml-submenu {
  margin-top: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ml-navlink {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: #475569;
  text-align: left;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.ml-navlink:hover { background: #F0FDF4; color: #059669; }

.ml-navlink-sub { padding-left: 30px; font-size: 12.5px; }

.ml-navlink-active {
  background: #ECFDF5;
  color: #059669;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.25);
}

.ml-navlink-active:hover { background: #ECFDF5; color: #059669; }

.ml-navlink-icon { color: #94A3B8; flex-shrink: 0; }
.ml-navlink-active .ml-navlink-icon { color: #059669; }

.ml-navdot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #CBD5E1;
  flex-shrink: 0;
}
.ml-navdot-active { background: #059669; }

.ml-navlink-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ml-navlink-chevron { color: #94A3B8; flex-shrink: 0; }
.ml-navlink-active .ml-navlink-chevron { color: #059669; }

.ml-sidebar-foot {
  border-top: 1px solid #E2E8F0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ml-account-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  text-align: left;
}
.ml-account-btn:hover { background: #F1F5F9; }

.ml-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1.5px solid #A7F3D0;
  background: #E2E8F0;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.ml-avatar-small { width: 32px; height: 32px; font-size: 12.5px; background: rgba(5, 150, 105, 0.12); color: #059669; border: 1.5px solid #6EE7B7; }

.ml-account-text { min-width: 0; flex: 1; line-height: 1.2; }
.ml-account-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; }
.ml-account-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }

/* ---------- Logout button (sidebar) ---------- */
.ml-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px solid #FCA5A5;
  background: rgba(220, 38, 38, 0.06);
  cursor: pointer;
  margin-top: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: #DC2626;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.ml-logout-btn:hover { background: rgba(220, 38, 38, 0.12); border-color: #F87171; }
.ml-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ml-logout-icon { flex-shrink: 0; }

/* ---------- Main column ---------- */
.ml-main-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}

/* ---------- Header ---------- */
.ml-header {
  flex-shrink: 0;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.24), 0 6px 14px -4px rgba(15, 23, 42, 0.14);
}

.ml-header-top {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
}

.ml-menu-btn {
  border: none;
  background: none;
  padding: 8px;
  border-radius: 8px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
.ml-menu-btn:hover { background: #F1F5F9; }

.ml-branch-row {
  display: none;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  min-width: 0;
  flex: 1;
}
.ml-branch-row::-webkit-scrollbar { display: none; }

.ml-branch-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #A7F3D0;
  background: #F0FDF4;
  color: #047857;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.ml-branch-chip svg { color: #059669; flex-shrink: 0; }

.ml-branch-empty {
  font-size: 12.5px;
  color: #64748B;
  white-space: nowrap;
}

.ml-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ml-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 6px 8px 6px 4px;
  border-radius: 8px;
}
.ml-user-btn:hover { background: #F1F5F9; }

.ml-user-text { display: none; text-align: left; line-height: 1.25; }
.ml-user-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; }
.ml-user-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }
.ml-user-chevron { display: none; color: #94A3B8; }

/* ---------- Content ---------- */
.ml-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ml-content::-webkit-scrollbar { display: none; width: 0; height: 0; }

/* ---------- Responsive breakpoints ---------- */
@media (min-width: 640px) {
  .ml-user-text { display: block; }
  .ml-user-chevron { display: block; }
}

@media (min-width: 900px) {
  .ml-branch-row { display: flex; }
}

@media (min-width: 1024px) {
  .ml-sidebar { position: static; transform: none; z-index: 0; height: 100%; }
  .ml-overlay { display: none; }
  .ml-close-btn { display: none; }
  .ml-menu-btn { display: none; }
  .ml-content { padding: 12px; }
  .ml-header-top { padding: 0 18px; }
}
`;