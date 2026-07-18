import {
    BarChart3,
    Building2,
    ChevronDown,
    ChevronRight,
    Dumbbell,
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
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import authApi from "../api/authApi"; // ⚠️ sửa lại đường dẫn cho đúng vị trí file authApi thật của bạn
import logo from "../assets/logo.png";

/**
 * AdminLayout
 * ------------------------------------------------------------------
 * Layout khung cho trang Admin (Sidebar + Header + vùng nội dung).
 * Viết bằng CSS thuần (không dùng Tailwind) — toàn bộ CSS được gộp
 * chung vào file này qua thẻ <style>.
 * - Tông màu đồng bộ với trang đăng nhập nhân viên: nền navy đậm
 *   (#0F172A / #1E293B), viền slate (#334155), điểm nhấn cyan
 *   (#06B6D4), chữ sáng (#F1F5F9 / #94A3B8 / #64748B).
 * - Responsive: sidebar ẩn thành drawer trên mobile/tablet (< 1024px).
 * - Điều hướng bằng react-router-dom: bấm menu -> navigate(path) ->
 *   <Outlet /> tự render trang con tương ứng (khai báo route ở AppRoute).
 * - Active state tự động theo location.pathname / matchPrefix.
 * - Đăng xuất: gọi authApi.logout() (tự xoá token + gọi BE), rồi
 *   điều hướng về /staff/login.
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
        id: "staff",
        icon: UserCog,
        label: "Quản lý nhân viên",
        matchPrefix: "/admin/staff",
        children: [
            { id: "staff/system", icon: ListTree, label: "Nhân viên hệ thống", path: "/admin/staffs/system" },
            { id: "staff-list", icon: ListTree, label: "Nhân viên ", path: "/admin/staffs" },
            { id: "staff-add", icon: ListTree, label: "Tạo nhân viên hệ thống", path: "/admin/staff-create" },
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
            { id: "packages-history", icon: ListTree, label: "Lịch sử đăng ký", path: "/admin/package-history" },
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
    { id: "stats", icon: BarChart3, label: "Thống kê hệ thống", path: "/admin/stats" },
];

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

function Sidebar({ openMenus, toggleMenu, mobileOpen, closeMobile, onLogout, loggingOut }) {
    const location = useLocation();
    const navigate = useNavigate();

    const isPathActive = (path) => location.pathname === path;

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
                        <div className="al-avatar">A</div>
                        <div className="al-account-text">
                            <p className="al-account-name">Admin</p>
                            <p className="al-account-role">Super Admin</p>
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

function Header({ onMenuClick, onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);

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
                            <div className="al-avatar al-avatar-small">A</div>
                            <div className="al-user-text">
                                <p className="al-user-name">Admin</p>
                                <p className="al-user-role">Super Admin</p>
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
            />

            <div className="al-main-col">
                <Header
                    onMenuClick={() => setMobileOpen(true)}
                    onLogout={handleLogout}
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
 * Tông màu: đồng bộ theo trang StaffLogin — nền navy đậm, viền slate,
 * điểm nhấn cyan (#06B6D4).
 * Sidebar được thu hẹp lại (240px) để vùng nội dung trang con rộng hơn.
 * ------------------------------------------------------------------ */
const CSS = `
* { box-sizing: border-box; }

.al-root {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #0B1120;
  color: #F1F5F9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

/* ---------- Sidebar ---------- */
.al-sidebar {
  position: fixed;
  top: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 40;
  width: 240px;
  display: flex;
  flex-direction: column;
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 18px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.55), 0 8px 16px -6px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  transform: translateX(calc(-100% - 32px));
  transition: transform 0.2s ease;
}

.al-sidebar-open {
  transform: translateX(0);
}

.al-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(2, 6, 23, 0.6);
}

.al-sidebar-head {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #334155;
}

.al-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.al-logo-badge {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #0E7490, #0B4A57);
  box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.25) inset;
}

.al-logo-img { height: 22px; width: 22px; object-fit: contain; }

.al-logo-text { line-height: 1.2; min-width: 0; }
.al-logo-title { margin: 0; font-size: 14px; font-weight: 800; color: #F1F5F9; letter-spacing: -0.2px; white-space: nowrap; }
.al-logo-sub { margin: 0; font-size: 11px; color: #06B6D4; font-weight: 500; white-space: nowrap; }

.al-close-btn {
  border: none;
  background: none;
  padding: 6px;
  border-radius: 6px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
.al-close-btn:hover { background: #0F172A; }

.al-nav {
  flex: 1;
  overflow-y: auto;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}
.al-nav::-webkit-scrollbar { display: none; width: 0; height: 0; } /* Chrome/Safari */

.al-submenu {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.al-navlink {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #94A3B8;
  text-align: left;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.al-navlink:hover { background: #0F172A; color: #F1F5F9; }

.al-navlink-sub { padding-left: 32px; font-size: 13px; }

.al-navlink-active {
  background: #06B6D4;
  color: #0F172A;
  font-weight: 700;
  box-shadow: 0 10px 20px -6px rgba(6, 182, 212, 0.45), 0 2px 6px rgba(6, 182, 212, 0.3);
  transform: translateY(-1px);
}

.al-navlink-active:hover { background: #06B6D4; color: #0F172A; }

.al-navlink-icon { color: #64748B; flex-shrink: 0; }
.al-navlink-active .al-navlink-icon { color: #0F172A; }

.al-navdot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #475569;
  flex-shrink: 0;
}
.al-navdot-active { background: #0F172A; }

.al-navlink-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-navlink-chevron { color: #64748B; flex-shrink: 0; }
.al-navlink-active .al-navlink-chevron { color: #0F172A; }

.al-sidebar-foot {
  border-top: 1px solid #334155;
  padding: 12px;
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
.al-account-btn:hover { background: #0F172A; }

.al-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #334155;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.al-avatar-small { width: 34px; height: 34px; font-size: 13px; background: rgba(6, 182, 212, 0.15); color: #06B6D4; }

.al-account-text { min-width: 0; flex: 1; line-height: 1.2; }
.al-account-name { margin: 0; font-size: 14px; font-weight: 700; color: #F1F5F9; }
.al-account-role { margin: 0; font-size: 11.5px; color: #64748B; font-weight: 500; }

/* ---------- Logout button (sidebar) ---------- */
.al-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #334155;
  background: none;
  cursor: pointer;
  margin-top: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #F87171;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.al-logout-btn:hover { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.4); }
.al-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.al-logout-icon { flex-shrink: 0; }

/* ---------- Main column ---------- */
.al-main-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 16px;
  overflow: hidden;
}

/* ---------- Header ---------- */
.al-header {
  flex-shrink: 0;
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 18px;
  box-shadow: 0 20px 40px -14px rgba(0, 0, 0, 0.5), 0 6px 14px -4px rgba(0, 0, 0, 0.25);
}

.al-header-top {
  height: 68px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
}

.al-menu-btn {
  border: none;
  background: none;
  padding: 8px;
  border-radius: 8px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
}
.al-menu-btn:hover { background: #0F172A; }

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
.al-user-btn:hover { background: #0F172A; }

.al-user-text { display: none; text-align: left; line-height: 1.25; }
.al-user-name { margin: 0; font-size: 14px; font-weight: 700; color: #F1F5F9; }
.al-user-role { margin: 0; font-size: 11.5px; color: #64748B; font-weight: 500; }
.al-user-chevron { display: none; color: #64748B; }

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
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 12px;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.55);
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
  font-size: 13.5px;
  font-weight: 600;
  color: #F87171;
  text-align: left;
}
.al-user-menu-item:hover { background: rgba(248, 113, 113, 0.1); }

/* ---------- Content ---------- */
.al-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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
  border: 1px dashed #334155;
  border-radius: 20px;
  background: #1E293B;
  box-shadow: 0 20px 40px -16px rgba(0, 0, 0, 0.4);
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
  .al-content { padding: 24px; }
  .al-header-top { padding: 0 24px; }
}
`;