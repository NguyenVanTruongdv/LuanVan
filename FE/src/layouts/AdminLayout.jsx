import {
    AlertTriangle,
    BarChart3,
    Building2,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Dumbbell,
    History,
    LayoutDashboard,
    ListTree,
    LogOut,
    Menu,
    MessageSquare,
    Newspaper,
    Package,
    Receipt,
    Ticket,
    UserCog,
    Users,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import adminApi from "../api/adminApi"; // ⚠️ sửa lại đường dẫn cho đúng vị trí file adminApi thật của bạn
import authApi from "../api/authApi"; // ⚠️ sửa lại đường dẫn cho đúng vị trí file authApi thật của bạn
import logo from "../assets/logo.png";

/**
 * AdminLayout
 * ------------------------------------------------------------------
 * Layout khung cho trang Admin (Sidebar + Header + vùng nội dung).
 * Viết bằng CSS thuần (không dùng Tailwind) — toàn bộ CSS được gộp
 * chung vào file này qua thẻ <style>.
 * - Tông màu sáng: nền xám nhạt (#F1F5F9), sidebar/header trắng,
 *   viền slate nhạt (#E2E8F0), điểm nhấn xanh lá (#059669),
 *   chữ tối (#1E293B / #64748B / #94A3B8).
 * - Responsive: sidebar ẩn thành drawer trên mobile/tablet (< 1024px).
 * - Điều hướng bằng react-router-dom: bấm menu -> navigate(path) ->
 *   <Outlet /> tự render trang con tương ứng (khai báo route ở AppRoute).
 * - Active state tự động theo location.pathname / matchPrefix.
 * - Đăng xuất: gọi authApi.logout() (tự xoá token + gọi BE), rồi
 *   điều hướng về /staff/login.
 * - Thông tin tài khoản (tên, vai trò, avatar) lấy từ
 *   adminApi.getEmployeeProfile() thay vì hardcode "Admin".
 * ------------------------------------------------------------------
 */

const NAV_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tổng quan", path: "/admin" },
    {
        id: "branches",
        icon: Building2,
        label: "Quản lý chi nhánh",
        matchPrefix: "/admin/branch",
        children: [
            { id: "branches-list", icon: ListTree, label: "Danh sách chi nhánh", path: "/admin/branches" },
            { id: "branches-add", icon: ListTree, label: "Thêm chi nhánh", path: "/admin/branch-create" },
            { id: "branches-img", icon: ListTree, label: "Hình ảnh chi nhánh", path: "/admin/branches-img" },
        ],
    },
    {
        id: "home",
        icon: Building2,
        label: "Quản lý trang chủ",
        matchPrefix: "/admin/homepage",
        children: [
            { id: "home", icon: ListTree, label: "Hình ảnh trang chủ", path: "/admin/homepage/images" },

        ],
    },

    {
        id: "staff",
        icon: UserCog,
        label: "Quản lý nhân viên",
        matchPrefix: "/admin/staff",
        children: [
            { id: "staff/system", icon: ListTree, label: "Tài khoản hệ thống", path: "/admin/employees/system" },
            { id: "staff/employees", icon: ListTree, label: "Hồ sơ nhân viên", path: "/admin/employees" },
            { id: "staff-add", icon: ListTree, label: "Tạo nhân viên", path: "/admin/employees/create" },

        ],
    },
    {
        id: "members",
        icon: Users,
        label: "Quản lý hội viên",
        matchPrefix: "/admin/member",
        children: [
            { id: "members-list", icon: ListTree, label: "Danh sách hội viên", path: "/admin/members" },

        ],
    },
    {
        id: "packages",
        icon: Package,
        label: "Quản lý gói tập",
        matchPrefix: "/admin/package",
        children: [
            { id: "packages-list", icon: ListTree, label: "Danh sách gói tập", path: "/admin/packages" },
            { id: "packages-add", icon: ListTree, label: "Tạo gói tập", path: "/admin/package-create" },
        ],
    },
    {
        id: "history",
        icon: History,
        label: "Lịch sử",
        matchPrefix: "/admin/history",
        children: [
            { id: "packages-history", icon: History, label: "Lịch sử đăng ký gói tập", path: "/admin/package-history" },
            // TODO: bạn tự khai báo route admin tương ứng, path dưới chỉ là gợi ý
            { id: "members-checkin", icon: CheckSquare, label: "Lịch sử Check-in / Check-out", path: "/admin/checkin-history" },
        ],
    },
    {
        id: "vouchers",
        icon: Ticket,
        label: "Quản lý voucher",
        matchPrefix: "/admin/voucher",
        children: [
            { id: "vouchers-list", icon: ListTree, label: "Danh sách voucher", path: "/admin/vouchers" },
            { id: "vouchers-add", icon: ListTree, label: "Tạo voucher", path: "/admin/voucher-create" },
            { id: "vouchers-history", icon: ListTree, label: "Lịch sử sử dụng", path: "/admin/voucher-history" },
        ],
    },
    {
        id: "equipment-types",
        icon: ListTree,
        label: "Quản lý DM thiết bị",
        matchPrefix: "/admin/equipment-type",
        children: [
            { id: "equipment-types-list", icon: ListTree, label: "Danh sách danh mục", path: "/admin/equipment-types" },
            { id: "equipment-types-add", icon: ListTree, label: "Tạo danh mục", path: "/admin/equipment-type-create" },
        ],
    },
    {
        id: "equipment",
        icon: Dumbbell,
        label: "Quản lý thiết bị",
        matchPrefix: "/admin/equipment",
        children: [
            { id: "equipment-list", icon: ListTree, label: "Danh sách thiết bị", path: "/admin/equipments" },
            { id: "equipment-add", icon: ListTree, label: "Tạo thiết bị", path: "/admin/equipment-create" },
        ],
    },
    {
        id: "incidents",
        icon: AlertTriangle,
        label: "Quản lý sự cố",
        matchPrefix: "/admin/incident",
        children: [
            { id: "incidents-list", icon: ListTree, label: "Danh sách sự cố", path: "/admin/incidents" },
        ],
    },
    {
        id: "news",
        icon: Newspaper,
        label: "Quản lý tin tức",
        matchPrefix: "/admin/news",
        children: [
            { id: "news-list", icon: ListTree, label: "Danh sách tin tức", path: "/admin/news" },
            { id: "news-add", icon: ListTree, label: "Tạo tin tức mới", path: "/admin/news-create" },
        ],
    },
    {
        id: "forum",
        icon: MessageSquare,
        label: "Quản lý diễn đàn",
        matchPrefix: "/admin/forum",
        children: [
            { id: "forum-posts", icon: ListTree, label: "Diễn đàn", path: "/admin/forum" },
            { id: "forum-categories", icon: ListTree, label: "Danh mục diễn đàn", path: "/admin/forum-categories" },
        ],
    },
    { id: "invoices", icon: Receipt, label: "Hóa đơn", path: "/admin/invoices" },
    { id: "stats", icon: BarChart3, label: "Báo cáo", path: "/admin/reports" },
];

// Map role trả về từ BE -> nhãn hiển thị tiếng Việt (tuỳ chỉnh thêm nếu có role khác)
const ROLE_LABELS = {
    Manager: "Quản lý",
    Admin: "Quản trị viên",
    Staff: "Nhân viên",
};

function cx(...c) {
    return c.filter(Boolean).join(" ");
}

function Logo() {
    return (
        <div className="al-logo">
            <div className="al-logo-badge">
                <img src={logo} alt="Logo" className="al-logo-img" />
            </div>
            <div className="al-logo-text">
                <p className="al-logo-title">VT Gym</p>
                <p className="al-logo-sub">Admin Panel</p>
            </div>
        </div>
    );
}

function NavLink({ item, active, expanded, onClick, level = 0 }) {
    const Icon = item.icon;
    const hasChildren = !!item.children?.length;

    return (
        <button
            onClick={() => onClick(item)}
            className={cx("al-navlink", level > 0 && "al-navlink-sub", active && "al-navlink-active")}
        >
            {level === 0 && Icon ? (
                <Icon size={18} strokeWidth={2} className="al-navlink-icon" />
            ) : level > 0 ? (
                <span className={cx("al-navdot", active && "al-navdot-active")} />
            ) : null}
            <span className="al-navlink-label">{item.label}</span>
            {hasChildren &&
                (expanded ? <ChevronDown size={15} className="al-navlink-chevron" /> : (
                    <ChevronRight size={15} className="al-navlink-chevron" />
                ))}
        </button>
    );
}

function Sidebar({ openMenus, toggleMenu, mobileOpen, closeMobile, onLogout, loggingOut, profile, profileLoading }) {
    const location = useLocation();
    const navigate = useNavigate();

    const isPathActive = (path) => location.pathname === path;

    const displayName = profileLoading ? "Đang tải..." : profile?.fullName || "Nhân viên";
    const displayRole = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : "";
    const avatarChar = profile?.fullName?.trim()?.charAt(0)?.toUpperCase() || "A";

    return (
        <>
            {mobileOpen && <div className="al-overlay" onClick={closeMobile} />}

            <aside className={cx("al-sidebar", mobileOpen && "al-sidebar-open")}>
                <div className="al-sidebar-head">
                    <Logo />
                    <button onClick={closeMobile} className="al-close-btn">
                        <X size={18} />
                    </button>
                </div>

                <nav className="al-nav">
                    {NAV_ITEMS.map((item) => {
                        const hasChildren = !!item.children?.length;
                        const isParentActive = hasChildren
                            ? item.children.some((c) => isPathActive(c.path)) ||
                            (item.matchPrefix && location.pathname.startsWith(item.matchPrefix))
                            : isPathActive(item.path);
                        const expanded = openMenus.includes(item.id);

                        return (
                            <div key={item.id}>
                                <NavLink
                                    item={item}
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
                                    <div className="al-submenu">
                                        {item.children.map((child) => (
                                            <NavLink
                                                key={child.id}
                                                item={child}
                                                level={1}
                                                active={isPathActive(child.path)}
                                                onClick={() => {
                                                    navigate(child.path);
                                                    closeMobile();
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="al-sidebar-foot">
                    <button className="al-account-btn">
                        <div className="al-avatar">{avatarChar}</div>
                        <div className="al-account-text">
                            <p className="al-account-name">{displayName}</p>
                            <p className="al-account-role">{displayRole}</p>
                        </div>
                    </button>

                    <button
                        className="al-logout-btn"
                        onClick={onLogout}
                        disabled={loggingOut}
                    >
                        <LogOut size={16} className="al-logout-icon" />
                        <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function Header({ onMenuClick, onLogout, profile, profileLoading }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const displayName = profileLoading ? "Đang tải..." : profile?.fullName || "Nhân viên";
    const displayRole = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : "";
    const avatarChar = profile?.fullName?.trim()?.charAt(0)?.toUpperCase() || "A";

    return (
        <header className="al-header">
            <div className="al-header-top">
                <button onClick={onMenuClick} className="al-menu-btn">
                    <Menu size={20} />
                </button>

                <div className="al-header-right">
                    <div className="al-user-menu-wrap">
                        <button
                            className="al-user-btn"
                            onClick={() => setMenuOpen((v) => !v)}
                        >
                            <div className="al-avatar al-avatar-small">{avatarChar}</div>
                            <div className="al-user-text">
                                <p className="al-user-name">{displayName}</p>
                                <p className="al-user-role">{displayRole}</p>
                            </div>
                            <ChevronDown size={14} className="al-user-chevron" />
                        </button>

                        {menuOpen && (
                            <>
                                <div
                                    className="al-user-menu-overlay"
                                    onClick={() => setMenuOpen(false)}
                                />
                                <div className="al-user-menu">
                                    <button
                                        className="al-user-menu-item"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onLogout();
                                        }}
                                    >
                                        <LogOut size={15} />
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Tự động mở sẵn menu cha tương ứng với path hiện tại khi vào trang / F5
    const initialOpenMenus = NAV_ITEMS.filter(
        (item) =>
            item.children?.length &&
            (item.children.some((c) => c.path === location.pathname) ||
                (item.matchPrefix && location.pathname.startsWith(item.matchPrefix)))
    ).map((item) => item.id);

    const [openMenus, setOpenMenus] = useState(initialOpenMenus);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // ─────────────────────────────────────────────
    // Thông tin tài khoản đăng nhập (tên, vai trò, avatar...)
    // Gọi 1 lần khi layout mount, dùng chung cho Sidebar + Header.
    // ─────────────────────────────────────────────
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            try {
                const res = await adminApi.getEmployeeProfile();
                // authApi.get có thể trả thẳng data (đã unwrap) hoặc trả nguyên response axios (res.data)
                const data = res?.employeeId !== undefined ? res : res?.data;
                if (mounted) setProfile(data || null);
            } catch (err) {
                console.error("getEmployeeProfile error:", err);
                // giữ profile = null -> UI tự fallback hiển thị mặc định
            } finally {
                if (mounted) setProfileLoading(false);
            }
        };

        fetchProfile();

        return () => {
            mounted = false;
        };
    }, []);

    const toggleMenu = (id) =>
        setOpenMenus((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));

    // ─────────────────────────────────────────────
    // Đăng xuất
    // authApi.logout() tự gọi POST /api/auth/logout (kèm refreshToken)
    // và tự clearTokens() ở localStorage — ở đây chỉ cần chờ xong rồi
    // điều hướng người dùng về trang login nhân viên.
    // Dùng try/finally để dù API lỗi (mất mạng, token hết hạn...) thì
    // vẫn đưa được người dùng ra khỏi khu vực admin.
    // ─────────────────────────────────────────────
    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await authApi.logout();
        } catch {
            // ignore lỗi gọi API, vẫn điều hướng ra ngoài
        } finally {
            setLoggingOut(false);
            navigate("/staff/login", { replace: true });
        }
    };

    return (
        <div className="al-root">
            <style>{CSS}</style>

            <Sidebar
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                mobileOpen={mobileOpen}
                closeMobile={() => setMobileOpen(false)}
                onLogout={handleLogout}
                loggingOut={loggingOut}
                profile={profile}
                profileLoading={profileLoading}
            />

            <div className="al-main-col">
                <Header
                    onMenuClick={() => setMobileOpen(true)}
                    onLogout={handleLogout}
                    profile={profile}
                    profileLoading={profileLoading}
                />

                <main className="al-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
 * CSS thuần, gộp chung vào file này.
 * Prefix "al-" (Admin Layout) để tránh đụng class với phần còn lại
 * của ứng dụng.
 * Tông màu: nền sáng, sidebar/header trắng, viền slate nhạt,
 * điểm nhấn xanh lá (#059669) — đồng bộ phong cách "Hotel Booking".
 * Margin/padding tổng thể được giảm để vùng nội dung (trang con)
 * rộng rãi hơn.
 * ------------------------------------------------------------------ */
const CSS = `
* { box-sizing: border-box; }

.al-root {
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

/* ---------- Sidebar ---------- */
.al-sidebar {
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

.al-sidebar-open {
  transform: translateX(0);
}

.al-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.35);
}

.al-sidebar-head {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #E2E8F0;
}

.al-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.al-logo-badge {
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

.al-logo-img { height: 20px; width: 20px; object-fit: contain; }

.al-logo-text { line-height: 1.2; min-width: 0; }
.al-logo-title { margin: 0; font-size: 14px; font-weight: 800; color: #1E293B; letter-spacing: -0.2px; white-space: nowrap; }
.al-logo-sub { margin: 0; font-size: 11px; color: #059669; font-weight: 500; white-space: nowrap; }

.al-close-btn {
  border: none;
  background: none;
  padding: 6px;
  border-radius: 6px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
.al-close-btn:hover { background: #F1F5F9; }

.al-nav {
  flex: 1;
  overflow-y: auto;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}
.al-nav::-webkit-scrollbar { display: none; width: 0; height: 0; } /* Chrome/Safari */

.al-submenu {
  margin-top: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.al-navlink {
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

.al-navlink:hover { background: #F0FDF4; color: #059669; }

.al-navlink-sub { padding-left: 30px; font-size: 12.5px; }

.al-navlink-active {
  background: #ECFDF5;
  color: #059669;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.25);
}

.al-navlink-active:hover { background: #ECFDF5; color: #059669; }

.al-navlink-icon { color: #94A3B8; flex-shrink: 0; }
.al-navlink-active .al-navlink-icon { color: #059669; }

.al-navdot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #CBD5E1;
  flex-shrink: 0;
}
.al-navdot-active { background: #059669; }

.al-navlink-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-navlink-chevron { color: #94A3B8; flex-shrink: 0; }
.al-navlink-active .al-navlink-chevron { color: #059669; }

.al-sidebar-foot {
  border-top: 1px solid #E2E8F0;
  padding: 10px;
}

.al-account-btn {
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
.al-account-btn:hover { background: #F1F5F9; }

.al-avatar {
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

.al-avatar-small { width: 32px; height: 32px; font-size: 12.5px; background: rgba(5, 150, 105, 0.12); color: #059669; border: 1.5px solid #6EE7B7; }

.al-account-text { min-width: 0; flex: 1; line-height: 1.2; }
.al-account-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-account-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }

/* ---------- Logout button (sidebar) ---------- */
.al-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px solid #FCA5A5;
  background: rgba(220, 38, 38, 0.06);
  cursor: pointer;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: #DC2626;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.al-logout-btn:hover { background: rgba(220, 38, 38, 0.12); border-color: #F87171; }
.al-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.al-logout-icon { flex-shrink: 0; }

/* ---------- Main column ---------- */
.al-main-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}

/* ---------- Header ---------- */
.al-header {
  flex-shrink: 0;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.24), 0 6px 14px -4px rgba(15, 23, 42, 0.14);
}

.al-header-top {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
}

.al-menu-btn {
  border: none;
  background: none;
  padding: 8px;
  border-radius: 8px;
  color: #64748B;
  cursor: pointer;
  display: flex;
}
.al-menu-btn:hover { background: #F1F5F9; }

.al-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.al-user-menu-wrap {
  position: relative;
}

.al-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 6px 8px 6px 4px;
  border-radius: 8px;
}
.al-user-btn:hover { background: #F1F5F9; }

.al-user-text { display: none; text-align: left; line-height: 1.25; }
.al-user-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-user-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }
.al-user-chevron { display: none; color: #94A3B8; }

/* ---------- User dropdown menu (Header) ---------- */
.al-user-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: transparent;
}

.al-user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  min-width: 160px;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.16);
  padding: 6px;
}

.al-user-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #DC2626;
  text-align: left;
}
.al-user-menu-item:hover { background: rgba(220, 38, 38, 0.06); }

/* ---------- Content ---------- */
.al-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}
.al-content::-webkit-scrollbar { display: none; width: 0; height: 0; } /* Chrome/Safari */

.al-empty {
  height: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #CBD5E1;
  border-radius: 16px;
  background: #FFFFFF;
  box-shadow: 0 8px 20px -12px rgba(15, 23, 42, 0.08);
  color: #64748B;
  font-size: 14px;
}

/* ---------- Responsive breakpoints ---------- */
@media (min-width: 640px) {
  .al-user-text { display: block; }
  .al-user-chevron { display: block; }
}

@media (min-width: 1024px) {
  .al-sidebar { position: static; transform: none; z-index: 0; height: 100%; }
  .al-overlay { display: none; }
  .al-close-btn { display: none; }
  .al-menu-btn { display: none; }
  .al-content { padding: 12px; }
  .al-header-top { padding: 0 18px; }
}
`;