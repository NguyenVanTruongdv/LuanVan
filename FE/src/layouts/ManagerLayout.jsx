import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import managerApi from "../api/ManagerApi"; // đổi lại path cho khớp cấu trúc thư mục thực tế
import authApi from "../api/authApi"; // dùng để gọi API đăng xuất
import logo from "../assets/logo.png";

// Outline SVG icons (no color — inherits currentColor)
const Icons = {
    dashboard: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    members: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    staff: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    equipment: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    ),
    incidents: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    news: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
        </svg>
    ),
    reports: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
        </svg>
    ),
    profile: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
    ),
    list: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    checkin: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    packages: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
    history: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    edit: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    add: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    ),
    wrench: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    ),
    report: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
    ),
    revenue: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    idCard: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="11" r="2" />
            <path d="M4 17c.7-1.8 2.2-3 4-3s3.3 1.2 4 3" /><line x1="14" y1="9" x2="19" y2="9" /><line x1="14" y1="13" x2="19" y2="13" />
        </svg>
    ),
    logout: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    chevronDown: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    bell: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    chevronSmall: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    branchPin: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
};

// Cấu trúc menu — mỗi item có thể chứa "children", và children lại có thể
// chứa "children" (nested nhiều cấp), ví dụ "Quản lý gói tập" bên trong "Hội viên".
const NAV_ITEMS = [
    { id: "dashboard", icon: Icons.dashboard, label: "Tổng quan", path: "/manager" },
    {
        id: "members",
        icon: Icons.members,
        label: "Hội viên",
        matchPrefix: "/manager/member",
        children: [
            { id: "members-list", icon: Icons.list, label: "Danh sách hội viên", path: "/manager/member/member-list" },
            { id: "members-checkin", icon: Icons.checkin, label: "Check-in", path: "/manager/member/checkin-history" },
            {
                id: "members-packages",
                icon: Icons.packages,
                label: "Quản lý gói tập",
                matchPrefix: "/manager/members/packages",
                children: [
                    { id: "packages-history", icon: Icons.history, label: "Lịch sử đăng ký gói tập", path: "/manager/members/packages/history" },
                    { id: "packages-adjust", icon: Icons.edit, label: "Điều chỉnh gói tập", path: "/manager/members/packages/adjust" },
                ],
            },
        ],
    },
    {
        id: "staff",
        icon: Icons.staff,
        label: "Nhân viên",
        matchPrefix: "/manager/staff",
        children: [
            { id: "staff-list", icon: Icons.list, label: "Danh sách nhân viên", path: "/manager/staff" },
        ],
    },
    {
        id: "equipment",
        icon: Icons.equipment,
        label: "Thiết bị",
        matchPrefix: "/manager/equipment",
        children: [
            { id: "equipment-list", icon: Icons.list, label: "Danh sách thiết bị", path: "/manager/equipment" },
            { id: "equipment-add", icon: Icons.add, label: "Thêm thiết bị", path: "/manager/equipment/add" },
        ],
    },
    {
        id: "incidents",
        icon: Icons.incidents,
        label: "Sự cố",
        matchPrefix: "/manager/incidents",
        children: [
            { id: "incidents-list", icon: Icons.list, label: "Danh sách sự cố", path: "/manager/incidents" },
        ],
    },
    {
        id: "news",
        icon: Icons.news,
        label: "Tin tức",
        matchPrefix: "/manager/news",
        children: [
            { id: "news-list", icon: Icons.list, label: "Danh sách bài viết", path: "/manager/news" },
            { id: "news-create", icon: Icons.add, label: "Tạo bài viết", path: "/manager/news/create" },
        ],
    },
    {
        id: "reports",
        icon: Icons.reports,
        label: "Báo cáo",
        matchPrefix: "/manager/reports",
        children: [
            { id: "reports-revenue", icon: Icons.revenue, label: "Doanh thu", path: "/manager/reports/revenue" },
            { id: "reports-members", icon: Icons.members, label: "Hội viên", path: "/manager/reports/members" },
            { id: "reports-equipment", icon: Icons.wrench, label: "Thiết bị", path: "/manager/reports/equipment" },
        ],
    },
    {
        id: "profile",
        icon: Icons.profile,
        label: "Hồ sơ",
        matchPrefix: "/manager/profile",
        children: [
            { id: "profile-info", icon: Icons.idCard, label: "Thông tin cá nhân", path: "/manager/profile" },
        ],
    },
];

// ── Bảng màu tối hiện đại — lấy cảm hứng từ màn hình đăng nhập (navy + cyan glow) ──
const C = {
    bgDeep: "#080B14",
    panel: "rgba(18, 26, 46, 0.72)",
    panelSolid: "#0F1729",
    panelBorder: "rgba(148, 163, 184, 0.12)",
    cyan: "#22D3EE",
    cyanDark: "#0E7490",
    cyanSoft: "rgba(34, 211, 238, 0.14)",
    cyanGlow: "rgba(34, 211, 238, 0.35)",
    blue: "#3B82F6",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    danger: "#F87171",
    dangerBg: "rgba(248, 113, 113, 0.1)",
    dangerBorder: "rgba(248, 113, 113, 0.28)",
    // Nền vùng nội dung chính — trước là màu sáng (#F4F6F8), giờ đổi tông tối
    // để đồng bộ với topbar/sidebar, tránh "lòi" mảng trắng ra giữa layout tối.
    surfaceMain: "#0C1322",
};

function getInitials(fullName) {
    if (!fullName) return "QL";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_LABELS = {
    Staff: "Cashier",
    Manager: "Quản lý",
    Admin: "Quản trị viên",
};

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
function collectOpenAncestors(items, pathname, acc = new Set()) {
    for (const item of items) {
        if (!item.children) continue;
        const childActive = hasActiveDescendant(item, pathname) || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
        if (childActive) acc.add(item.id);
        collectOpenAncestors(item.children, pathname, acc);
    }
    return acc;
}

export default function ManagerLayout() {
    document.title = "VT Gym Manager";

    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState(() =>
        collectOpenAncestors(NAV_ITEMS, location.pathname)
    );
    const [loggingOut, setLoggingOut] = useState(false);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(false);

    // branches: mảng object { branchId, branchName } lấy từ API — chỉ hiển thị, không thao tác gì thêm
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            setProfileLoading(true);
            setProfileError(false);
            try {
                // Nếu authApi trả nguyên response axios thay vì unwrap sẵn,
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

    const isItemActive = (item) => {
        if (item.id === "dashboard") return location.pathname === "/manager";
        if (item.path && location.pathname === item.path) return true;
        return item.matchPrefix
            ? location.pathname.startsWith(item.matchPrefix)
            : false;
    };

    const toggleSubmenu = (id) => {
        setOpenSubmenus((cur) => {
            const next = new Set(cur);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleItemClick = (item) => {
        if (item.children) {
            toggleSubmenu(item.id);
        } else {
            if (item.newTab) {
                window.open(item.path, "_blank");
            } else {
                navigate(item.path);
            }
            setSidebarOpen(false);
        }
    };

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

    // Render đệ quy — hỗ trợ menu lồng nhau ở mọi cấp (Hội viên > Quản lý gói tập > ...)
    const renderNavItem = (item, depth = 0) => {
        const active = isItemActive(item);
        const isOpen = openSubmenus.has(item.id);
        const isTop = depth === 0;

        return (
            <div key={item.id}>
                <button
                    className={`nav-item-btn depth-${depth}${active ? " nav-item-active" : ""}`}
                    style={{
                        ...(isTop ? S.navItem : S.subItem),
                        ...(isTop
                            ? active
                                ? S.navItemActive
                                : S.navItemInactive
                            : active
                                ? S.subItemActive
                                : S.subItemInactive),
                        ...(depth > 1 ? { paddingLeft: 12 + depth * 10 } : {}),
                    }}
                    onClick={() => handleItemClick(item)}
                    title={item.newTab ? "Mở ở tab mới" : undefined}
                >
                    <span
                        style={{
                            ...(isTop ? S.navIconWrap : { display: "flex", flexShrink: 0 }),
                            color: isTop ? (active ? "#04222B" : C.textSecondary) : active ? C.cyan : C.textMuted,
                        }}
                    >
                        {item.icon}
                    </span>
                    <span style={isTop ? S.navLabel : S.subLabel}>{item.label}</span>
                    {item.children && (
                        <span
                            style={{
                                ...S.chevron,
                                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                color: isTop ? (active ? "rgba(4,34,43,0.7)" : C.textMuted) : C.textMuted,
                            }}
                        >
                            {Icons.chevronDown}
                        </span>
                    )}
                    {item.newTab && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    )}
                </button>

                {item.children && isOpen && (
                    <div style={{ ...S.submenu, paddingLeft: isTop ? 12 : 10 }}>
                        {item.children.map((child) => renderNavItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={S.page}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }

        .hamburger-btn { display: none; }

        .nav-item-btn.depth-0 { transition: background 0.15s, color 0.15s !important; }
        .nav-item-btn.depth-0:hover:not(.nav-item-active) {
          background: rgba(148, 163, 184, 0.08) !important;
          color: ${C.textPrimary} !important;
        }
        .nav-item-btn:not(.depth-0) { transition: background 0.15s, color 0.15s !important; }
        .nav-item-btn:not(.depth-0):hover:not(.nav-item-active) {
          background: rgba(148, 163, 184, 0.08) !important;
          color: ${C.textPrimary} !important;
        }
        .logout-btn { transition: background 0.15s, border-color 0.15s !important; }
        .logout-btn:hover {
          background: rgba(248, 113, 113, 0.18) !important;
          border-color: rgba(248, 113, 113, 0.45) !important;
        }
        .logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .icon-btn { transition: background 0.15s !important; }
        .icon-btn:hover { background: rgba(148, 163, 184, 0.1) !important; }

        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .skeleton {
          animation: skeleton-pulse 1.4s ease-in-out infinite;
          background: rgba(148, 163, 184, 0.18);
          border-radius: 4px;
        }

        @media (max-width: 767px) {
          .hamburger-btn { display: flex !important; }
          .app-sidebar {
            position: fixed !important;
            top: 84px; bottom: 16px; left: 16px;
            transform: translateX(-120%);
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
            z-index: 200;
          }
          .app-sidebar.is-open { transform: translateX(0); }
          .staff-info-text { display: none !important; }
          .branch-row { display: none !important; }
        }
        @media (min-width: 768px) {
          .app-sidebar { position: relative !important; transform: none !important; }
        }
      `}</style>

            {/* Glow nền — mô phỏng ánh sáng teal/blue của màn hình đăng nhập */}
            <div style={S.glowTopLeft} />
            <div style={S.glowBottomRight} />

            <div style={S.shell}>
                {/* ── TOPBAR ── */}
                <header style={S.topbar}>
                    <div style={S.topbarLeft}>
                        <button
                            className="hamburger-btn"
                            style={S.hamburger}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle menu"
                        >
                            <span style={S.hamburgerLine} />
                            <span style={S.hamburgerLine} />
                            <span style={S.hamburgerLine} />
                        </button>

                        <div style={S.logo}>
                            <div style={S.logoIconBox}>
                                <img src={logo} alt="Logo" style={S.logoImage} />
                            </div>
                            <div style={S.logoText}>
                                <span style={S.logoTitle}>VT Gym</span>
                                <span style={S.logoSub}>Manager Portal</span>
                            </div>
                        </div>

                        {/* Danh sách chi nhánh — chỉ hiển thị, không thao tác (lọc thật nằm trong trang Check-in) */}
                        <div className="branch-row" style={S.branchRow}>
                            {profileLoading ? (
                                <>
                                    <span className="skeleton" style={{ width: 90, height: 26, borderRadius: 999 }} />
                                    <span className="skeleton" style={{ width: 90, height: 26, borderRadius: 999 }} />
                                </>
                            ) : branches.length > 0 ? (
                                branches.map((b) => (
                                    <span key={b.branchId} style={S.branchChip}>
                                        <span style={{ color: C.cyan, display: "flex" }}>{Icons.branchPin}</span>
                                        {b.branchName}
                                    </span>
                                ))
                            ) : (
                                <span style={S.branchEmpty}>
                                    {profileError ? "Không tải được chi nhánh" : "Chưa có chi nhánh"}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={S.topbarRight}>
                        <button className="icon-btn" style={S.iconBtn} aria-label="Thông báo">
                            <span style={{ color: C.textSecondary }}>{Icons.bell}</span>
                        </button>

                        {/* Staff */}
                        <div style={S.staffBadge}>
                            <div style={S.avatar}>
                                {profileLoading ? (
                                    <span className="skeleton" style={{ width: 20, height: 12, background: "rgba(255,255,255,0.35)" }} />
                                ) : (
                                    <span style={S.avatarText}>{staffInitials}</span>
                                )}
                            </div>
                            <div className="staff-info-text" style={S.staffInfo}>
                                {profileLoading ? (
                                    <>
                                        <span className="skeleton" style={{ width: 100, height: 12, marginBottom: 4 }} />
                                        <span className="skeleton" style={{ width: 60, height: 10 }} />
                                    </>
                                ) : (
                                    <>
                                        <span style={S.staffName}>{staffName}</span>
                                        <span style={S.staffRole}>{staffRole}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div style={S.body}>
                    {sidebarOpen && (
                        <div style={S.overlay} onClick={() => setSidebarOpen(false)} />
                    )}

                    {/* ── SIDEBAR ── */}
                    <aside className={`app-sidebar ${sidebarOpen ? "is-open" : ""}`} style={S.sidebar}>
                        <div style={S.menuLabel}>MENU CHÍNH</div>

                        <nav style={S.nav}>
                            <div style={S.navColumn}>
                                {NAV_ITEMS.map((item) => renderNavItem(item, 0))}
                            </div>

                            {/* Logout */}
                            <button
                                className="logout-btn"
                                style={S.logoutBtn}
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                                <span style={{ color: C.danger }}>{Icons.logout}</span>
                                <span style={S.logoutLabel}>
                                    {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                                </span>
                            </button>
                        </nav>
                    </aside>

                    {/* ── PAGE CONTENT ── */}
                    <main style={S.main}>
                        <Outlet context={{ profile }} />
                    </main>
                </div>
            </div>
        </div>
    );
}

const S = {
    page: {
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: C.bgDeep,
        fontFamily: "'Inter', sans-serif",
    },
    glowTopLeft: {
        position: "absolute",
        top: -180,
        left: -180,
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0) 70%)",
        filter: "blur(10px)",
        pointerEvents: "none",
        zIndex: 0,
    },
    glowBottomRight: {
        position: "absolute",
        bottom: -220,
        right: -220,
        width: 560,
        height: 560,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 70%)",
        filter: "blur(10px)",
        pointerEvents: "none",
        zIndex: 0,
    },

    shell: {
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 16,
        gap: 16,
    },

    topbar: {
        height: 68,
        flexShrink: 0,
        background: C.panel,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        gap: 16,
    },
    topbarLeft: {
        display: "flex",
        alignItems: "center",
        gap: 18,
        minWidth: 0,
        flex: 1,
    },
    topbarRight: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
    },

    logo: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
    },
    logoIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${C.cyanDark}, #0B4A57)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 0 0 1px rgba(34,211,238,0.25) inset`,
    },
    logoImage: {
        height: 22,
        width: 22,
        objectFit: "contain",
    },
    logoText: {
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.2,
    },
    logoTitle: {
        fontSize: 14,
        fontWeight: 800,
        color: C.textPrimary,
        letterSpacing: "-0.2px",
        whiteSpace: "nowrap",
    },
    logoSub: {
        fontSize: 11,
        fontWeight: 500,
        color: C.cyan,
        whiteSpace: "nowrap",
    },

    hamburger: {
        flexDirection: "column",
        gap: 5,
        padding: "7px 8px",
        cursor: "pointer",
    },
    hamburgerLine: {
        display: "block",
        width: 20,
        height: 2,
        background: C.textSecondary,
        borderRadius: 2,
    },

    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
    },

    // Hàng chi nhánh — chỉ hiển thị, không có tương tác
    branchRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        overflowX: "auto",
        paddingLeft: 14,
        marginLeft: 4,
        borderLeft: `1px solid ${C.panelBorder}`,
        minWidth: 0,
    },
    branchChip: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${C.panelBorder}`,
        background: "rgba(34, 211, 238, 0.06)",
        color: C.textSecondary,
        fontSize: 12.5,
        fontWeight: 500,
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    branchEmpty: {
        fontSize: 12.5,
        color: C.textMuted,
        whiteSpace: "nowrap",
    },

    staffBadge: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        paddingLeft: 10,
        borderLeft: `1px solid ${C.panelBorder}`,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.cyan}, ${C.blue})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 0 0 3px ${C.cyanSoft}`,
    },
    avatarText: {
        color: "#04222B",
        fontWeight: 800,
        fontSize: 12,
    },
    staffInfo: {
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.3,
    },
    staffName: {
        fontSize: 13,
        fontWeight: 600,
        color: C.textPrimary,
        whiteSpace: "nowrap",
    },
    staffRole: {
        fontSize: 11,
        color: C.textMuted,
        fontWeight: 400,
    },

    body: {
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
        gap: 16,
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,16,0.6)",
        zIndex: 150,
        backdropFilter: "blur(2px)",
    },

    sidebar: {
        width: 250,
        background: C.panel,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
    },
    menuLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: C.textMuted,
        letterSpacing: "0.08em",
        padding: "20px 16px 10px",
        textTransform: "uppercase",
    },
    nav: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "4px 10px 16px",
        gap: 2,
    },
    navColumn: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
        flex: 1,
    },

    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        fontSize: 14.5,
        fontWeight: 600,
        textAlign: "left",
    },
    navItemActive: {
        background: `linear-gradient(135deg, ${C.cyan}, #38BDF8)`,
        color: "#04222B",
        boxShadow: `0 4px 16px ${C.cyanGlow}`,
    },
    navItemInactive: {
        background: "transparent",
        color: C.textSecondary,
    },
    navIconWrap: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
    },
    navLabel: { flex: 1 },
    chevron: {
        display: "flex",
        alignItems: "center",
        transition: "transform 0.2s ease",
        flexShrink: 0,
    },

    submenu: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
        marginTop: 1,
        marginBottom: 2,
    },
    subItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        fontSize: 13.5,
        textAlign: "left",
    },
    subItemActive: {
        background: C.cyanSoft,
        color: C.cyan,
        fontWeight: 700,
    },
    subItemInactive: {
        background: "transparent",
        color: C.textSecondary,
        fontWeight: 500,
    },
    subLabel: { flex: 1 },

    logoutBtn: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: "auto",
        padding: "10px 12px",
        borderRadius: 10,
        background: C.dangerBg,
        border: `1px solid ${C.dangerBorder}`,
        width: "100%",
        marginTop: 8,
    },
    logoutLabel: {
        fontSize: 14.5,
        fontWeight: 600,
        color: C.danger,
    },

    main: {
        flex: 1,
        background: C.surfaceMain,
        borderRadius: 18,
        border: `1px solid ${C.panelBorder}`,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "28px 32px",
        minWidth: 0,
        height: "100%",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
    },
};