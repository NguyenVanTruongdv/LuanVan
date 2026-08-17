import {
    Bell,
    Boxes,
    Camera,
    ChevronDown,
    ChevronRight,
    History,
    LayoutDashboard,
    ListTree,
    LogOut,
    Menu,
    Package,
    PlusCircle,
    Receipt,
    RefreshCw,
    ScanFace,
    TriangleAlert,
    UserCheck,
    UserPlus,
    Users,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import authApi from "../api/authApi"; // ⚠️ sửa lại đường dẫn cho đúng vị trí file authApi thật của bạn
import cashierApi from "../api/cashierApi"; // ⚠️ sửa lại đường dẫn cho đúng vị trí file cashierApi thật của bạn
import logo from "../assets/logo.png";

/**
 * CashierLayout
 * ------------------------------------------------------------------
 * Layout khung cho trang Cashier (Sidebar + Header + vùng nội dung).
 * Đồng bộ 1-1 với AdminLayout: cùng cấu trúc, cùng bảng màu sáng
 * (nền xám nhạt #F1F5F9, sidebar/header trắng, viền slate/emerald
 * nhạt, điểm nhấn xanh lá #059669), cùng cách viết CSS thuần gộp
 * trong file qua thẻ <style>. Class được đặt tiền tố "cl-" (Cashier
 * Layout) để tránh đụng với "al-" bên Admin.
 * - Vẫn giữ nguyên toàn bộ nghiệp vụ riêng của Cashier: lấy thông
 *   tin nhân viên (cashierApi.getEmployeeProfile), chọn chi nhánh
 *   làm việc, mở camera nhận diện ở tab mới, đăng xuất qua authApi.
 * ------------------------------------------------------------------
 */

const NAV_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tổng quan", path: "/cashier" },
    {
        id: "members",
        icon: Users,
        label: "Hội viên",
        matchPrefix: "/cashier/member",
        children: [
            { id: "members-list", icon: ListTree, label: "Danh sách hội viên", path: "/cashier/members" },
            { id: "members-activate", icon: UserCheck, label: "Kích hoạt hội viên", path: "/cashier/member-active" },
            { id: "members-create", icon: UserPlus, label: "Tạo hội viên mới", path: "/cashier/member-create" },
        ],
    },
    {
        id: "packages",
        icon: Package,
        label: "Gói tập",
        matchPrefix: "/cashier/packages",
        children: [
            { id: "packages-renew", icon: RefreshCw, label: "Gia hạn gói tập", path: "/cashier/packages/renew" },
            { id: "packages-history", icon: History, label: "Lịch sử đăng ký", path: "/cashier/packages/history" },
            { id: "packages-invoice", icon: Receipt, label: "Giao dịch", path: "/cashier/packages/transactions" },
        ],
    },
    {
        id: "recognition",
        icon: ScanFace,
        label: "Nhận diện",
        matchPrefix: "/cashier/checkin",
        children: [
            { id: "camera-recognition", icon: Camera, label: "Camera nhận diện", path: "/indentify", newTab: true },
            { id: "checkin-history", icon: History, label: "Lịch sử", path: "/cashier/checkin-history" },
        ],
    },
    {
        id: "incidents",
        icon: TriangleAlert,
        label: "Sự cố",
        matchPrefix: "/cashier/incidents",
        children: [
            { id: "incidents-report", icon: PlusCircle, label: "Báo cáo sự cố", path: "/cashier/incidents-report" },
            { id: "incidents-list", icon: ListTree, label: "Danh sách sự cố", path: "/cashier/incidents-list" },
        ],
    },
    {
        id: "reports",
        icon: Boxes,
        label: "Báo cáo",
        matchPrefix: "/cashier/reports",
        children: [
            { id: "reports", icon: Receipt, label: "Báo cáo", path: "/cashier/reports" },
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
    if (!fullName) return "NV";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Logo() {
    return (
        <div className="cl-logo">
            <div className="cl-logo-badge">
                <img src={logo} alt="Logo" className="cl-logo-img" />
            </div>
            <div className="cl-logo-text">
                <p className="cl-logo-title">VT Gym</p>
                <p className="cl-logo-sub">Cashier Portal</p>
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
            className={cx("cl-navlink", level > 0 && "cl-navlink-sub", active && "cl-navlink-active")}
            title={item.newTab ? "Mở ở tab mới" : undefined}
        >
            {level === 0 && Icon ? (
                <Icon size={18} strokeWidth={2} className="cl-navlink-icon" />
            ) : level > 0 ? (
                <span className={cx("cl-navdot", active && "cl-navdot-active")} />
            ) : null}
            <span className="cl-navlink-label">{item.label}</span>
            {item.newTab && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cl-navlink-external">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            )}
            {hasChildren &&
                (expanded ? <ChevronDown size={15} className="cl-navlink-chevron" /> : (
                    <ChevronRight size={15} className="cl-navlink-chevron" />
                ))}
        </button>
    );
}

function Sidebar({
    openMenus,
    toggleMenu,
    mobileOpen,
    closeMobile,
    onLogout,
    loggingOut,
    profile,
    profileLoading,
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const isPathActive = (path) => location.pathname === path;

    const staffName = profile?.fullName || (profileLoading ? "Đang tải..." : "Nhân viên");
    const staffRole = ROLE_LABELS[profile?.role] || profile?.role || "Cashier";
    const staffInitials = getInitials(profile?.fullName);

    return (
        <>
            {mobileOpen && <div className="cl-overlay" onClick={closeMobile} />}

            <aside className={cx("cl-sidebar", mobileOpen && "cl-sidebar-open")}>
                <div className="cl-sidebar-head">
                    <Logo />
                    <button onClick={closeMobile} className="cl-close-btn">
                        <X size={18} />
                    </button>
                </div>

                <nav className="cl-nav">
                    {NAV_ITEMS.map((item) => {
                        const hasChildren = !!item.children?.length;
                        const isParentActive = hasChildren
                            ? item.children.some((c) => !c.newTab && isPathActive(c.path)) ||
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
                                    <div className="cl-submenu">
                                        {item.children.map((child) => (
                                            <NavLink
                                                key={child.id}
                                                item={child}
                                                level={1}
                                                active={!child.newTab && isPathActive(child.path)}
                                                onClick={() => {
                                                    if (child.newTab) {
                                                        window.open(child.path, "_blank");
                                                        closeMobile();
                                                        return;
                                                    }
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

                <div className="cl-sidebar-foot">
                    <button className="cl-account-btn">
                        <div className="cl-avatar">
                            {profileLoading ? <span className="cl-skeleton cl-skeleton-avatar" /> : staffInitials}
                        </div>
                        <div className="cl-account-text">
                            {profileLoading ? (
                                <>
                                    <span className="cl-skeleton" style={{ width: 90, height: 11, marginBottom: 5, display: "block" }} />
                                    <span className="cl-skeleton" style={{ width: 56, height: 10, display: "block" }} />
                                </>
                            ) : (
                                <>
                                    <p className="cl-account-name">{staffName}</p>
                                    <p className="cl-account-role">{staffRole}</p>
                                </>
                            )}
                        </div>
                    </button>

                    <button
                        className="cl-logout-btn"
                        onClick={onLogout}
                        disabled={loggingOut}
                    >
                        <LogOut size={16} className="cl-logout-icon" />
                        <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function BranchSelect({ branches, selectedBranch, onSelect, loading, error }) {
    const [open, setOpen] = useState(false);
    const canToggle = branches.length > 1;

    return (
        <div className="cl-branch-wrap">
            <button
                className={cx("cl-branch-btn", !canToggle && "cl-branch-btn-static")}
                onClick={() => canToggle && setOpen((v) => !v)}
                disabled={!canToggle}
            >
                {loading ? (
                    <span className="cl-skeleton" style={{ width: 100, height: 12 }} />
                ) : (
                    <span className="cl-branch-name">
                        {selectedBranch?.branchName || (error ? "Không tải được chi nhánh" : "Chưa có chi nhánh")}
                    </span>
                )}
                {canToggle && <ChevronDown size={14} className="cl-branch-chevron" />}
            </button>

            {open && canToggle && (
                <>
                    <div className="cl-user-menu-overlay" onClick={() => setOpen(false)} />
                    <div className="cl-branch-menu">
                        {branches.map((b) => (
                            <button
                                key={b.branchId}
                                className={cx(
                                    "cl-branch-menu-item",
                                    b.branchId === selectedBranch?.branchId && "cl-branch-menu-item-active"
                                )}
                                onClick={() => {
                                    onSelect(b);
                                    setOpen(false);
                                }}
                            >
                                {b.branchName}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function Header({ onMenuClick, onLogout, branches, selectedBranch, onSelectBranch, profileLoading, profileError, profile }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const staffName = profile?.fullName || (profileLoading ? "Đang tải..." : "Nhân viên");
    const staffRole = ROLE_LABELS[profile?.role] || profile?.role || "Cashier";
    const staffInitials = getInitials(profile?.fullName);

    return (
        <header className="cl-header">
            <div className="cl-header-top">
                <button onClick={onMenuClick} className="cl-menu-btn">
                    <Menu size={20} />
                </button>

                <div className="cl-header-right">
                    <BranchSelect
                        branches={branches}
                        selectedBranch={selectedBranch}
                        onSelect={onSelectBranch}
                        loading={profileLoading}
                        error={profileError}
                    />

                    <button className="cl-icon-btn" aria-label="Thông báo">
                        <Bell size={17} />
                    </button>

                    <div className="cl-user-menu-wrap">
                        <button
                            className="cl-user-btn"
                            onClick={() => setMenuOpen((v) => !v)}
                        >
                            <div className="cl-avatar cl-avatar-small">
                                {profileLoading ? <span className="cl-skeleton cl-skeleton-avatar-sm" /> : staffInitials}
                            </div>
                            <div className="cl-user-text">
                                <p className="cl-user-name">{staffName}</p>
                                <p className="cl-user-role">{staffRole}</p>
                            </div>
                            <ChevronDown size={14} className="cl-user-chevron" />
                        </button>

                        {menuOpen && (
                            <>
                                <div
                                    className="cl-user-menu-overlay"
                                    onClick={() => setMenuOpen(false)}
                                />
                                <div className="cl-user-menu">
                                    <button
                                        className="cl-user-menu-item"
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

export default function CashierLayout() {
    document.title = "VT Gym Cashier";

    const location = useLocation();
    const navigate = useNavigate();

    const initialOpenMenus = NAV_ITEMS.filter(
        (item) =>
            item.children?.length &&
            (item.children.some((c) => !c.newTab && c.path === location.pathname) ||
                (item.matchPrefix && location.pathname.startsWith(item.matchPrefix)))
    ).map((item) => item.id);

    const [openMenus, setOpenMenus] = useState(initialOpenMenus);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(false);

    // branches: [{ branchId, branchName }]
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);

    const toggleMenu = (id) =>
        setOpenMenus((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));

    // ─────────────────────────────────────────────
    // Lấy thông tin nhân viên + danh sách chi nhánh
    // ─────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            setProfileLoading(true);
            setProfileError(false);
            try {
                // Nếu cashierApi trả nguyên response axios thay vì unwrap sẵn,
                // đổi thành: const data = (await cashierApi.getEmployeeProfile()).data;
                const data = await cashierApi.getEmployeeProfile();

                if (cancelled) return;

                setProfile(data);

                // Chuẩn hóa dữ liệu chi nhánh: phòng trường hợp BE trả về
                // PascalCase (BranchId/BranchName) thay vì camelCase, hoặc vẫn
                // còn trả mảng string cũ (["Chi nhánh 1", ...]).
                const rawBranches = data.branches ?? data.Branches ?? [];
                const branchList = Array.isArray(rawBranches)
                    ? rawBranches.map((b) =>
                        typeof b === "string"
                            ? { branchId: b, branchName: b }
                            : {
                                branchId: b.branchId ?? b.BranchId,
                                branchName: b.branchName ?? b.BranchName ?? "",
                            }
                    )
                    : [];

                if (import.meta.env.DEV && branchList.length === 0) {
                    console.warn(
                        "[CashierLayout] Không tìm thấy chi nhánh nào trong response profile:",
                        data
                    );
                }

                setBranches(branchList);

                const defaultBranchId = data.defaultBranchId ?? data.DefaultBranchId;
                const defaultBranch =
                    branchList.find((b) => b.branchId === defaultBranchId) ||
                    branchList[0] ||
                    null;
                setSelectedBranch(defaultBranch);
            } catch (err) {
                if (!cancelled) setProfileError(true);
                console.error("Không thể tải thông tin nhân viên:", err);
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        }

        fetchProfile();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSelectBranch = (branch) => {
        setSelectedBranch(branch);
        // TODO: nếu các trang con (danh sách hội viên, gói tập, sự cố...) cần lọc
        // dữ liệu theo chi nhánh, dùng branch.branchId khi gọi API tương ứng.
    };

    // ─────────────────────────────────────────────
    // Đăng xuất
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
        <div className="cl-root">
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

            <div className="cl-main-col">
                <Header
                    onMenuClick={() => setMobileOpen(true)}
                    onLogout={handleLogout}
                    branches={branches}
                    selectedBranch={selectedBranch}
                    onSelectBranch={handleSelectBranch}
                    profileLoading={profileLoading}
                    profileError={profileError}
                    profile={profile}
                />

                <main className="cl-content">
                    <Outlet context={{ profile, branches, selectedBranch }} />
                </main>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
 * CSS thuần, gộp chung vào file này.
 * Prefix "cl-" (Cashier Layout). Bảng màu, kích thước, bo góc, đổ
 * bóng... được sao y hệt AdminLayout để hai khu vực Admin/Cashier
 * đồng bộ hoàn toàn về giao diện, chỉ khác nội dung menu.
 * ------------------------------------------------------------------ */
const CSS = `
* { box-sizing: border-box; }

.cl-root {
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
.cl-sidebar {
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

.cl-sidebar-open {
  transform: translateX(0);
}

.cl-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.35);
}

.cl-sidebar-head {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #E2E8F0;
}

.cl-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cl-logo-badge {
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

.cl-logo-img { height: 20px; width: 20px; object-fit: contain; }

.cl-logo-text { line-height: 1.2; min-width: 0; }
.cl-logo-title { margin: 0; font-size: 14px; font-weight: 800; color: #1E293B; letter-spacing: -0.2px; white-space: nowrap; }
.cl-logo-sub { margin: 0; font-size: 11px; color: #059669; font-weight: 500; white-space: nowrap; }

.cl-close-btn {
  border: none;
  background: none;
  padding: 6px;
  border-radius: 6px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
.cl-close-btn:hover { background: #F1F5F9; }

.cl-nav {
  flex: 1;
  overflow-y: auto;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cl-nav::-webkit-scrollbar { display: none; width: 0; height: 0; }

.cl-submenu {
  margin-top: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cl-navlink {
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

.cl-navlink:hover { background: #F0FDF4; color: #059669; }

.cl-navlink-sub { padding-left: 30px; font-size: 12.5px; }

.cl-navlink-active {
  background: #ECFDF5;
  color: #059669;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(5, 150, 105, 0.25);
}

.cl-navlink-active:hover { background: #ECFDF5; color: #059669; }

.cl-navlink-icon { color: #94A3B8; flex-shrink: 0; }
.cl-navlink-active .cl-navlink-icon { color: #059669; }

.cl-navdot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #CBD5E1;
  flex-shrink: 0;
}
.cl-navdot-active { background: #059669; }

.cl-navlink-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-navlink-chevron { color: #94A3B8; flex-shrink: 0; }
.cl-navlink-active .cl-navlink-chevron { color: #059669; }
.cl-navlink-external { color: #94A3B8; flex-shrink: 0; }

.cl-sidebar-foot {
  border-top: 1px solid #E2E8F0;
  padding: 10px;
}

.cl-account-btn {
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
.cl-account-btn:hover { background: #F1F5F9; }

.cl-avatar {
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
  overflow: hidden;
}

.cl-avatar-small { width: 32px; height: 32px; font-size: 12.5px; background: rgba(5, 150, 105, 0.12); color: #059669; border: 1.5px solid #6EE7B7; }

.cl-account-text { min-width: 0; flex: 1; line-height: 1.2; }
.cl-account-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-account-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }

/* ---------- Logout button (sidebar) ---------- */
.cl-logout-btn {
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
.cl-logout-btn:hover { background: rgba(220, 38, 38, 0.12); border-color: #F87171; }
.cl-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cl-logout-icon { flex-shrink: 0; }

/* ---------- Main column ---------- */
.cl-main-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}

/* ---------- Header ---------- */
.cl-header {
  flex-shrink: 0;
  background: #FFFFFF;
  border: 1.5px solid #A7F3D0;
  border-radius: 14px;
  box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.24), 0 6px 14px -4px rgba(15, 23, 42, 0.14);
}

.cl-header-top {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
}

.cl-menu-btn {
  border: none;
  background: none;
  padding: 8px;
  border-radius: 8px;
  color: #64748B;
  cursor: pointer;
  display: flex;
}
.cl-menu-btn:hover { background: #F1F5F9; }

.cl-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ---------- Branch selector ---------- */
.cl-branch-wrap { position: relative; }

.cl-branch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid #E2E8F0;
  background: #F8FAFC;
  cursor: pointer;
  padding: 7px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  transition: border-color 0.15s, background 0.15s;
}
.cl-branch-btn:hover:not(:disabled) { border-color: #6EE7B7; background: #F0FDF4; }
.cl-branch-btn-static { cursor: default; }
.cl-branch-btn-static:hover { border-color: #E2E8F0; background: #F8FAFC; }
.cl-branch-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
.cl-branch-chevron { color: #94A3B8; flex-shrink: 0; }

.cl-branch-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  min-width: 200px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.2);
  padding: 6px;
}

.cl-branch-menu-item {
  width: 100%;
  display: block;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}
.cl-branch-menu-item:hover { background: #F0FDF4; color: #059669; }
.cl-branch-menu-item-active { background: #ECFDF5; color: #059669; font-weight: 700; }

/* ---------- Notification icon ---------- */
.cl-icon-btn {
  border: none;
  background: none;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cl-icon-btn:hover { background: #F1F5F9; color: #059669; }

.cl-user-menu-wrap {
  position: relative;
}

.cl-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 6px 8px 6px 4px;
  border-radius: 8px;
}
.cl-user-btn:hover { background: #F1F5F9; }

.cl-user-text { display: none; text-align: left; line-height: 1.25; }
.cl-user-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #1E293B; }
.cl-user-role { margin: 0; font-size: 11px; color: #64748B; font-weight: 500; }
.cl-user-chevron { display: none; color: #94A3B8; }

/* ---------- User dropdown menu (Header) ---------- */
.cl-user-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: transparent;
}

.cl-user-menu {
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

.cl-user-menu-item {
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
.cl-user-menu-item:hover { background: rgba(220, 38, 38, 0.06); }

/* ---------- Skeleton loading ---------- */
.cl-skeleton {
  display: inline-block;
  border-radius: 4px;
  background: #E2E8F0;
  animation: cl-pulse 1.4s ease-in-out infinite;
}
.cl-skeleton-avatar { width: 20px; height: 12px; background: rgba(5,150,105,0.18); }
.cl-skeleton-avatar-sm { width: 18px; height: 11px; background: rgba(5,150,105,0.18); }
@keyframes cl-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---------- Content ---------- */
.cl-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cl-content::-webkit-scrollbar { display: none; width: 0; height: 0; }

/* ---------- Responsive breakpoints ---------- */
@media (min-width: 640px) {
  .cl-user-text { display: block; }
  .cl-user-chevron { display: block; }
}

@media (max-width: 640px) {
  .cl-branch-name { max-width: 90px; }
}

@media (min-width: 1024px) {
  .cl-sidebar { position: static; transform: none; z-index: 0; height: 100%; }
  .cl-overlay { display: none; }
  .cl-close-btn { display: none; }
  .cl-menu-btn { display: none; }
  .cl-content { padding: 12px; }
  .cl-header-top { padding: 0 18px; }
}
`;