import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
    // "Nhận diện" (face recognition) parent icon — scan/face frame
    recognition: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5a2 2 0 0 1 2-2h2" /><path d="M4 17v2a2 2 0 0 0 2 2h2" />
            <path d="M20 7V5a2 2 0 0 0-2-2h-2" /><path d="M20 17v2a2 2 0 0 1-2 2h-2" />
            <circle cx="12" cy="11" r="3" /><path d="M8 17c.7-1.6 2.2-2.5 4-2.5s3.3.9 4 2.5" />
        </svg>
    ),
    // Camera icon — opens the face-recognition camera page in a new tab
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
    bell: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
            { id: "members-activate", icon: Icons.activate, label: "Kích hoạt hội viên", path: "/cashier/member-activate" },
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
        ],
    },
    {
        id: "recognition",
        icon: Icons.recognition,
        label: "Nhận diện",
        matchPrefix: "/cashier/checkin",
        children: [
            // Mở trang camera nhận diện (route "/indentify" -> <CameraRecognition />) ở tab mới
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
];

// Green palette matching reference image
const GREEN = {
    primary: "#1B6B52",      // dark green active bg
    primaryHover: "#154f3d",
    light: "#E8F5F0",        // light green hover bg
    accent: "#1B6B52",
    border: "#d0e8df",
    text: "#1B6B52",
};

export default function CashierLayout({ branchName = "Chi nhánh Quận 1" }) {
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

    return (
        <div style={S.root}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F4F6F8; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }

        .hamburger-btn { display: none; }

        .nav-item-btn {
          transition: background 0.15s, color 0.15s !important;
        }
        .nav-item-btn:hover:not(.nav-item-active) {
          background: ${GREEN.light} !important;
          color: ${GREEN.primary} !important;
        }
        .sub-item-btn {
          transition: background 0.15s, color 0.15s !important;
        }
        .sub-item-btn:hover:not(.sub-item-active) {
          background: ${GREEN.light} !important;
          color: ${GREEN.primary} !important;
        }
        .logout-btn:hover {
          background: #FEE2E2 !important;
          border-color: #FCA5A5 !important;
        }
        .logout-btn { transition: background 0.15s, border-color 0.15s !important; }

        @media (max-width: 767px) {
          .hamburger-btn { display: flex !important; }
          .app-sidebar {
            position: fixed !important;
            top: 60px; bottom: 0; left: 0;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
            z-index: 200;
          }
          .app-sidebar.is-open { transform: translateX(0); }
        }
        @media (min-width: 768px) {
          .app-sidebar { position: sticky !important; transform: none !important; }
        }
      `}</style>

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

                    {/* Logo — compact size */}
                    <div style={S.logo}>
                        <img src={logo} alt="Logo" style={S.logoImage} />
                        <div style={S.logoText}>
                            <span style={S.logoTitle}>VT Gym</span>
                            <span style={S.logoSub}>Cashier Portal</span>
                        </div>
                    </div>
                </div>

                <div style={S.topbarRight}>
                    {/* Bell */}
                    <button style={S.iconBtn} aria-label="Thông báo">
                        <span style={{ color: "#64748B" }}>{Icons.bell}</span>
                    </button>

                    {/* Branch selector */}
                    <div style={S.branchSelect}>
                        <span style={S.branchName}>{branchName}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>

                    {/* Staff */}
                    <div style={S.staffBadge}>
                        <div style={S.avatar}>
                            <span style={S.avatarText}>NA</span>
                        </div>
                        <div style={S.staffInfo}>
                            <span style={S.staffName}>NhanVien TanQuy</span>
                            <span style={S.staffRole}>Cashier</span>
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
                    {/* Menu label */}
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
                                            <span style={{ ...S.navIconWrap, color: active ? "white" : "#64748B" }}>
                                                {item.icon}
                                            </span>
                                            <span style={S.navLabel}>{item.label}</span>
                                            {item.children && (
                                                <span style={{
                                                    ...S.chevron,
                                                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                    color: active ? "rgba(255,255,255,0.8)" : "#94A3B8",
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
                                                            <span style={{ color: childActive ? GREEN.primary : "#94A3B8", flexShrink: 0 }}>
                                                                {child.icon}
                                                            </span>
                                                            <span style={S.subLabel}>{child.label}</span>
                                                            {child.newTab && (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
                            style={S.logoutBtn}
                            onClick={() => alert("Đăng xuất")}
                        >
                            <span style={{ color: "#DC2626" }}>{Icons.logout}</span>
                            <span style={S.logoutLabel}>Đăng xuất</span>
                        </button>
                    </nav>
                </aside>

                {/* ── PAGE CONTENT ── */}
                <main style={S.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

const S = {
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        background: "#F4F6F8",
    },

    // TOPBAR
    topbar: {
        height: 60,
        flexShrink: 0,
        background: "white",
        borderBottom: "1px solid #E8ECF4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px 0 0",
        zIndex: 110,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    topbarLeft: {
        display: "flex",
        alignItems: "center",
        gap: 0,
    },
    topbarRight: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },

    // Logo — fits nicely in sidebar width
    logo: {
        width: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 10,
        padding: "0 20px",
        borderRight: "1px solid #E8ECF4",
        height: 60,
        flexShrink: 0,
    },
    logoImage: {
        height: 34,
        width: "auto",
        objectFit: "contain",
        flexShrink: 0,
    },
    logoText: {
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.2,
    },
    logoTitle: {
        fontSize: 13,
        fontWeight: 800,
        color: "#0D1117",
        letterSpacing: "-0.2px",
        whiteSpace: "nowrap",
    },
    logoSub: {
        fontSize: 11,
        fontWeight: 500,
        color: "#1B6B52",
        whiteSpace: "nowrap",
    },

    hamburger: {
        flexDirection: "column",
        gap: 5,
        padding: "7px 8px",
        cursor: "pointer",
        marginLeft: 8,
    },
    hamburgerLine: {
        display: "block",
        width: 20,
        height: 2,
        background: "#475569",
        borderRadius: 2,
    },

    // Bell button
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        cursor: "pointer",
    },

    // Branch selector
    branchSelect: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid #E2E8F0",
        background: "white",
        cursor: "pointer",
        color: "#334155",
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
    },
    branchName: {
        color: "#334155",
        fontSize: 13,
    },

    // Staff badge
    staffBadge: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: GREEN.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    avatarText: {
        color: "white",
        fontWeight: 700,
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
        color: "#0F172A",
        whiteSpace: "nowrap",
    },
    staffRole: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: 400,
    },

    // BODY
    body: {
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
        height: "calc(100vh - 60px)",
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        zIndex: 150,
        backdropFilter: "blur(2px)",
    },

    // SIDEBAR
    sidebar: {
        width: 240,
        background: "white",
        borderRight: "1px solid #E8ECF4",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
    },
    menuLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: "#64748B",
        letterSpacing: "0.08em",
        padding: "20px 16px 8px",
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

    // Nav items
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: 14.5,
        fontWeight: 600,
        textAlign: "left",
    },
    navItemActive: {
        background: GREEN.primary,
        color: "white",
    },
    navItemInactive: {
        background: "transparent",
        color: "#0D1117",
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

    // Submenu
    submenu: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
        paddingLeft: 12,
        marginTop: 1,
        marginBottom: 2,
    },
    subItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 7,
        fontSize: 13.5,
        textAlign: "left",
    },
    subItemActive: {
        background: GREEN.light,
        color: GREEN.primary,
        fontWeight: 700,
    },
    subItemInactive: {
        background: "transparent",
        color: "#1E293B",
        fontWeight: 500,
    },
    subLabel: { flex: 1 },

    // Logout
    logoutBtn: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: "auto",
        padding: "9px 12px",
        borderRadius: 8,
        background: "#FFF5F5",
        border: "1px solid #FECACA",
        width: "100%",
        marginTop: 8,
    },
    logoutLabel: {
        fontSize: 14.5,
        fontWeight: 600,
        color: "#DC2626",
    },

    // Main
    main: {
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "28px 32px",
        minWidth: 0,
        height: "100%",
    },
};