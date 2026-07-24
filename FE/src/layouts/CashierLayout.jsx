import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import authApi from "../api/authApi"; // dùng để gọi API logout thật (clear token + hủy refresh token ở BE)
import cashierApi from "../api/cashierApi"; // đổi lại path cho khớp cấu trúc thư mục thực tế
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
    packages: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
    recognition: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5a2 2 0 0 1 2-2h2" /><path d="M4 17v2a2 2 0 0 0 2 2h2" />
            <path d="M20 7V5a2 2 0 0 0-2-2h-2" /><path d="M20 17v2a2 2 0 0 1-2 2h-2" />
            <circle cx="12" cy="11" r="3" /><path d="M8 17c.7-1.6 2.2-2.5 4-2.5s3.3.9 4 2.5" />
        </svg>
    ),
    camera: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    ),
    incidents: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    list: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    activate: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    add: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    ),
    renew: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    history: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    report: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
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
    chevronSmall: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
};

const NAV_ITEMS = [
    { id: "dashboard", icon: Icons.dashboard, label: "Tổng quan", path: "/cashier" },
    {
        id: "members",
        icon: Icons.members,
        label: "Hội viên",
        matchPrefix: "/cashier/member",
        children: [
            { id: "members-list", icon: Icons.list, label: "Danh sách hội viên", path: "/cashier/members" },
            { id: "members-activate", icon: Icons.activate, label: "Kích hoạt hội viên", path: "/cashier/member-active" },
            { id: "members-create", icon: Icons.add, label: "Tạo hội viên mới", path: "/cashier/member-create" },
        ],
    },
    {
        id: "packages",
        icon: Icons.packages,
        label: "Gói tập",
        matchPrefix: "/cashier/packages",
        children: [
            { id: "packages-renew", icon: Icons.renew, label: "Gia hạn gói tập", path: "/cashier/packages/renew" },

            { id: "packages-history", icon: Icons.history, label: "Lịch sử đăng ký", path: "/cashier/packages/history" },
            { id: "packages-invoice", icon: Icons.history, label: "Hóa đơn", path: "/cashier/packages/invoice" },
        ],
    },
    {
        id: "recognition",
        icon: Icons.recognition,
        label: "Nhận diện",
        matchPrefix: "/cashier/checkin",
        children: [
            { id: "camera-recognition", icon: Icons.camera, label: "Camera nhận diện", path: "/indentify", newTab: true },
            { id: "checkin-history", icon: Icons.history, label: "Lịch sử", path: "/cashier/checkin-history" },
        ],
    },
    {
        id: "incidents",
        icon: Icons.incidents,
        label: "Sự cố",
        matchPrefix: "/cashier/incidents",
        children: [
            { id: "incidents-report", icon: Icons.report, label: "Báo cáo sự cố", path: "/cashier/incidents-report" },
            { id: "incidents-list", icon: Icons.list, label: "Danh sách sự cố", path: "/cashier/incidents-list" },
        ],
    },
    {
        id: "report",
        icon: Icons.Staff,
        label: "Báo cáo",
        matchPrefix: "/cashier/reports",
        children: [
            { id: "reports", icon: Icons.report, label: "Báo cáo", path: "/cashier/reports" },

        ],
    },
];

// ── Bảng màu tối — đồng bộ với màn hình đăng nhập (navy sâu + cyan accent) ──
const C = {
    bgDeep: "#0B1120",
    panel: "#1E293B",
    panelSolid: "#1E293B",
    panelBorder: "#334155",
    cyan: "#06B6D4",
    cyanDark: "#0E7490",
    cyanSoft: "rgba(6, 182, 212, 0.14)",
    cyanGlow: "rgba(6, 182, 212, 0.35)",
    blue: "#0891B2",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    danger: "#F87171",
    dangerBg: "rgba(248, 113, 113, 0.1)",
    dangerBorder: "rgba(248, 113, 113, 0.28)",
    // Content panel dùng cùng tông #1E293B như sidebar/topbar (giống panel
    // bên trái của trang login) để đồng bộ toàn bộ layout.
    surfaceLight: "#1E293B",
};

function getInitials(fullName) {
    if (!fullName) return "NV";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_LABELS = {
    Staff: "Cashier",
    Manager: "Quản lý",
    Admin: "Quản trị viên",
};

export default function CashierLayout() {
    document.title = "VT Gym Cashier";

    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState(() => {
        const match = NAV_ITEMS.find(
            (i) => i.matchPrefix && location.pathname.startsWith(i.matchPrefix)
        );
        return match ? new Set([match.id]) : new Set();
    });

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(false);

    // branches: [{ branchId, branchName }]
    const [branches, setBranches] = useState([]);
    // selectedBranch: { branchId, branchName } | null
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branchMenuOpen, setBranchMenuOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            setProfileLoading(true);
            setProfileError(false);
            try {
                // Nếu authApi trả nguyên response axios thay vì unwrap sẵn,
                // đổi thành: const data = (await cashierApi.getEmployeeProfile()).data;
                const data = await cashierApi.getEmployeeProfile();

                if (cancelled) return;

                setProfile(data);

                // Chuẩn hóa dữ liệu chi nhánh: phòng trường hợp BE trả về
                // PascalCase (BranchId/BranchName) thay vì camelCase, hoặc vẫn
                // còn trả mảng string cũ (["Chi nhánh 1", ...]) — nếu không
                // chuẩn hóa thì branchId/branchName sẽ undefined và UI luôn
                // rơi vào nhánh "Chưa có chi nhánh" dù BE có dữ liệu.
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

                // Ưu tiên chi nhánh mặc định BE trả về (defaultBranchId),
                // nếu không có thì lấy chi nhánh đầu tiên trong danh sách.
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

    const isItemActive = (item) => {
        if (item.id === "dashboard") return location.pathname === "/cashier";
        return item.matchPrefix
            ? location.pathname.startsWith(item.matchPrefix)
            : location.pathname.startsWith(item.path);
    };

    const handleTopClick = (item) => {
        if (item.children) {
            setOpenSubmenus((cur) => {
                const next = new Set(cur);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
            });
        } else {
            navigate(item.path);
            setSidebarOpen(false);
        }
    };

    const handleChildClick = (child) => {
        if (child.newTab) {
            window.open(child.path, "_blank");
            setSidebarOpen(false);
            return;
        }
        navigate(child.path);
        setSidebarOpen(false);
    };

    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            // authApi.logout() tự gọi API /api/auth/logout để hủy refreshToken
            // ở BE, đồng thời luôn clearTokens() ở finally của chính nó dù API
            // lỗi hay không (xem authApi.js) — nên FE không cần tự clear thêm.
            await authApi.logout();
        } catch (err) {
            console.error("Đăng xuất lỗi:", err);
        } finally {
            setLoggingOut(false);
            // Đổi lại route đăng nhập cho khớp thực tế (vd: /employee/login)
            navigate("/staff/login", { replace: true });
        }
    };

    const handleSelectBranch = (branch) => {
        setSelectedBranch(branch);
        setBranchMenuOpen(false);
        // TODO: nếu các trang con (danh sách hội viên, gói tập, sự cố...) cần lọc
        // dữ liệu theo chi nhánh, dùng branch.branchId khi gọi API tương ứng.
        // Có thể lưu thêm vào localStorage/BranchContext nếu muốn giữ lựa chọn
        // xuyên suốt phiên làm việc.
    };

    const staffName = profile?.fullName || (profileLoading ? "Đang tải..." : "Nhân viên");
    const staffRole = ROLE_LABELS[profile?.role] || profile?.role || "Cashier";
    const staffInitials = getInitials(profile?.fullName);

    return (
        <div style={S.page}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }

        .hamburger-btn { display: none; }

        .nav-item-btn { transition: background 0.15s, color 0.15s !important; }
        .nav-item-btn:hover:not(.nav-item-active) {
          background: rgba(148, 163, 184, 0.08) !important;
          color: ${C.textPrimary} !important;
        }
        .sub-item-btn { transition: background 0.15s, color 0.15s !important; }
        .sub-item-btn:hover:not(.sub-item-active) {
          background: rgba(148, 163, 184, 0.08) !important;
          color: ${C.textPrimary} !important;
        }
        .logout-btn { transition: background 0.15s, border-color 0.15s !important; }
        .logout-btn:hover {
          background: rgba(248, 113, 113, 0.18) !important;
          border-color: rgba(248, 113, 113, 0.45) !important;
        }
        .branch-select-btn { transition: border-color 0.15s, background 0.15s !important; }
        .branch-select-btn:hover:not(:disabled) {
          border-color: ${C.cyan} !important;
          background: rgba(6, 182, 212, 0.06) !important;
        }
        .branch-select-btn:focus-visible {
          outline: none;
          border-color: ${C.cyan} !important;
          box-shadow: 0 0 0 3px ${C.cyanSoft};
        }
        .branch-menu-item { transition: background 0.15s, color 0.15s !important; }
        .branch-menu-item:hover {
          background: rgba(6, 182, 212, 0.1) !important;
          color: ${C.cyan} !important;
        }
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
          .staff-info-text, .branch-name-text { display: none !important; }
        }
        @media (min-width: 768px) {
          .app-sidebar { position: relative !important; transform: none !important; }
        }
      `}</style>

            {/* Glow nền — mô phỏng ánh sáng cyan/teal của màn hình đăng nhập */}
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
                                <span style={S.logoSub}>Cashier Portal</span>
                            </div>
                        </div>
                    </div>

                    <div style={S.topbarRight}>
                        {/* Branch selector */}
                        <div style={{ position: "relative" }}>
                            <button
                                className="branch-select-btn"
                                style={S.branchSelect}
                                onClick={() => branches.length > 1 && setBranchMenuOpen((o) => !o)}
                                disabled={branches.length <= 1}
                            >
                                {profileLoading ? (
                                    <span className="skeleton" style={{ width: 110, height: 14 }} />
                                ) : (
                                    <span className="branch-name-text" style={S.branchName}>
                                        {selectedBranch?.branchName ||
                                            (profileError ? "Không tải được chi nhánh" : "Chưa có chi nhánh")}
                                    </span>
                                )}
                                {branches.length > 1 && (
                                    <span style={{ color: C.textSecondary, display: "flex" }}>{Icons.chevronSmall}</span>
                                )}
                            </button>

                            {branchMenuOpen && branches.length > 1 && (
                                <div style={S.branchMenu}>
                                    {branches.map((b) => (
                                        <button
                                            key={b.branchId}
                                            className="branch-menu-item"
                                            style={{
                                                ...S.branchMenuItem,
                                                ...(b.branchId === selectedBranch?.branchId
                                                    ? { color: C.cyan, fontWeight: 700, background: C.cyanSoft }
                                                    : {}),
                                            }}
                                            onClick={() => handleSelectBranch(b)}
                                        >
                                            {b.branchName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

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
                                {NAV_ITEMS.map((item) => {
                                    const active = isItemActive(item);
                                    const isOpen = openSubmenus.has(item.id);
                                    return (
                                        <div key={item.id}>
                                            <button
                                                className={`nav-item-btn${active ? " nav-item-active" : ""}`}
                                                style={{
                                                    ...S.navItem,
                                                    ...(active ? S.navItemActive : S.navItemInactive),
                                                }}
                                                onClick={() => handleTopClick(item)}
                                            >
                                                <span style={{ ...S.navIconWrap, color: active ? "#04222B" : C.textSecondary }}>
                                                    {item.icon}
                                                </span>
                                                <span style={S.navLabel}>{item.label}</span>
                                                {item.children && (
                                                    <span style={{
                                                        ...S.chevron,
                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                        color: active ? "rgba(4,34,43,0.7)" : C.textMuted,
                                                    }}>
                                                        {Icons.chevronDown}
                                                    </span>
                                                )}
                                            </button>

                                            {item.children && isOpen && (
                                                <div style={S.submenu}>
                                                    {item.children.map((child) => {
                                                        const childActive = !child.newTab && location.pathname === child.path;
                                                        return (
                                                            <button
                                                                key={child.id}
                                                                className={`sub-item-btn${childActive ? " sub-item-active" : ""}`}
                                                                style={{
                                                                    ...S.subItem,
                                                                    ...(childActive ? S.subItemActive : S.subItemInactive),
                                                                }}
                                                                onClick={() => handleChildClick(child)}
                                                                title={child.newTab ? "Mở ở tab mới" : undefined}
                                                            >
                                                                <span style={{ color: childActive ? C.cyan : C.textMuted, flexShrink: 0 }}>
                                                                    {child.icon}
                                                                </span>
                                                                <span style={S.subLabel}>{child.label}</span>
                                                                {child.newTab && (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                        <polyline points="15 3 21 3 21 9" />
                                                                        <line x1="10" y1="14" x2="21" y2="3" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Logout */}
                            <button
                                className="logout-btn"
                                style={{ ...S.logoutBtn, opacity: loggingOut ? 0.6 : 1, cursor: loggingOut ? "default" : "pointer" }}
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                                <span style={{ color: C.danger }}>{Icons.logout}</span>
                                <span style={S.logoutLabel}>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                            </button>
                        </nav>
                    </aside>

                    {/* ── PAGE CONTENT ── */}
                    <main style={S.main}>
                        <Outlet context={{ profile, branches, selectedBranch }} />
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
        background: "radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0) 70%)",
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
        background: "radial-gradient(circle, rgba(8,145,178,0.18) 0%, rgba(8,145,178,0) 70%)",
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
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
    },
    topbarLeft: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    topbarRight: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },

    logo: {
        display: "flex",
        alignItems: "center",
        gap: 10,
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
        boxShadow: `0 0 0 1px rgba(6,182,212,0.25) inset`,
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

    branchSelect: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        border: `1px solid ${C.panelBorder}`,
        background: "rgba(255,255,255,0.03)",
        color: C.textSecondary,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
        minHeight: 38,
    },
    branchName: {
        color: C.textSecondary,
        fontSize: 13,
    },
    branchMenu: {
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        background: C.panelSolid,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        minWidth: 200,
        zIndex: 120,
        overflow: "hidden",
        padding: 6,
    },
    branchMenuItem: {
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "9px 12px",
        fontSize: 13,
        borderRadius: 8,
        color: C.textSecondary,
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
    // line-height đồng bộ với .al-account-text / .al-user-text bên Admin (1.2)
    staffInfo: {
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.2,
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

    // width 240 để khớp .al-sidebar bên Admin (trước đây là 250)
    sidebar: {
        width: 240,
        background: C.panel,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
    },
    // padding dưới giảm nhẹ để khoảng cách tới nav gần với nhịp 18px của
    // .al-nav bên Admin (trước đây "20px 16px 10px")
    menuLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: C.textMuted,
        letterSpacing: "0.08em",
        padding: "16px 16px 8px",
        textTransform: "uppercase",
    },
    // padding + gap khớp .al-nav bên Admin (18px 10px / gap 6px)
    nav: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "10px 10px 16px",
        gap: 6,
    },
    navColumn: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flex: 1,
    },

    // padding + fontSize khớp .al-navlink bên Admin (10px 12px / 14px)
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        textAlign: "left",
    },
    navItemActive: {
        background: `linear-gradient(135deg, ${C.cyan}, ${C.cyanDark})`,
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

    // bỏ paddingLeft ở container, dồn hết phần thụt lề vào subItem (giống
    // .al-submenu / .al-navlink-sub bên Admin: indent 32px nằm trên chính nút)
    submenu: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
        marginTop: 4,
        marginBottom: 4,
    },
    // padding-left 32px + fontSize 13 khớp .al-navlink-sub bên Admin
    subItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "10px 12px 10px 32px",
        borderRadius: 8,
        fontSize: 13,
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

    // đã bỏ khóa marginTop trùng lặp ("auto" rồi "8") — trước đây khóa sau
    // ghi đè khóa trước khiến nút Đăng xuất không được đẩy xuống đáy sidebar
    // như ý đồ ban đầu (giống .al-sidebar-foot bên Admin nằm cố định ở đáy).
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
    },
    logoutLabel: {
        fontSize: 14.5,
        fontWeight: 600,
        color: C.danger,
    },

    // Khối chứa nội dung chính: KHÔNG tự vẽ card (không background/border/
    // shadow/padding riêng) — chỉ là vùng chứa trung lập. Lý do: từng trang
    // con (Outlet) đã tự có card riêng của nó (vd .vt-card trong
    // IncidentReportForm), nếu main cũng vẽ card y hệt sẽ bị lồng 2 lớp
    // nền + viền giống hệt nhau, tạo viền mảnh thừa bao quanh (double
    // border). Nếu có trang con nào KHÔNG tự vẽ card, style riêng cho trang
    // đó thay vì thêm lại style card ở đây.
    main: {
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        minWidth: 0,
        height: "100%",
    },
};