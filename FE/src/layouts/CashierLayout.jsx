import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
    { id: "dashboard", icon: "🏠", label: "Dashboard", path: "/cashier" },
    {
        id: "members",
        icon: "👥",
        label: "Hội viên",
        matchPrefix: "cashier/members",
        children: [
            { id: "members-list", icon: "📃", label: "Danh sách hội viên", path: "members" },
            { id: "members-activate", icon: "✅", label: "Kích hoạt hội viên", path: "member-activate" },
            { id: "members-create", icon: "➕", label: "Tạo hội viên mới", path: "member-create" },
        ],
    },
    {
        id: "packages",
        icon: "📦",
        label: "Gói tập",
        matchPrefix: "/packages",
        children: [
            { id: "packages-renew", icon: "🔄", label: "Gia hạn gói tập", path: "/packages/renew" },
            { id: "packages-history", icon: "🗂️", label: "Lịch sử đăng ký", path: "/packages/history" },
        ],
    },
    {
        id: "checkin",
        icon: "📷",
        label: "Check-in",
        matchPrefix: "/cashier/checkin",
        children: [
            { id: "checkin-action", icon: "📷", label: "Check-in", path: "/cashier/checkin" },
            { id: "checkin-history", icon: "🕒", label: "Lịch sử check-in", path: "/checkin/history" },
        ],
    },
    {
        id: "incidents",
        icon: "⚠️",
        label: "Sự cố",
        matchPrefix: "/incidents",
        children: [
            { id: "incidents-report", icon: "📝", label: "Báo cáo sự cố", path: "/incidents/report" },
            { id: "incidents-list", icon: "📋", label: "Danh sách sự cố", path: "/incidents/list" },
        ],
    },
];

export default function CashierLayout({ branchName = "Chi nhánh Quận 1" }) {
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
        if (item.id === "dashboard") {
            return location.pathname === "/cashier";
        }

        return item.matchPrefix
            ? location.pathname.startsWith(item.matchPrefix)
            : location.pathname.startsWith(item.path);
    };

    const handleTopClick = (item) => {
        if (item.children) {
            setOpenSubmenus((current) => {
                const next = new Set(current);
                if (next.has(item.id)) {
                    next.delete(item.id);
                } else {
                    next.add(item.id);
                }
                return next;
            });
        } else {
            navigate(item.path);
            setSidebarOpen(false);
        }
    };

    const handleChildClick = (path) => {
        navigate(path);
        setSidebarOpen(false);
    };

    return (
        <div style={styles.root}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F0F2F8; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }

        .hamburger-btn { display: none; }

        /* Nav item hover/focus */
        .nav-item-btn:hover:not(.nav-item-active) {
          background: #F1F0FE !important;
          color: #4F46E5 !important;
          transform: translateX(2px);
        }
        .nav-item-btn:focus-visible {
          outline: 2px solid #6366F1;
          outline-offset: 2px;
        }
        .nav-item-btn {
          transition: background 0.15s, color 0.15s, transform 0.15s, box-shadow 0.15s !important;
        }

        /* Sub item hover/focus */
        .sub-item-btn:hover:not(.sub-item-active) {
          background: #F1F0FE !important;
          color: #4338CA !important;
        }
        .sub-item-btn:focus-visible {
          outline: 2px solid #6366F1;
          outline-offset: 2px;
        }
        .sub-item-btn {
          transition: background 0.15s, color 0.15s !important;
        }

        /* Logout hover */
        .logout-btn:hover {
          background: #FEE2E2 !important;
          border-color: #FCA5A5 !important;
          transform: translateX(2px);
        }
        .logout-btn:focus-visible {
          outline: 2px solid #EF4444;
          outline-offset: 2px;
        }
        .logout-btn {
          transition: background 0.15s, border-color 0.15s, transform 0.15s !important;
        }

        /* Staff badge hover */
        .staff-badge:hover {
          background: #F8FAFF;
          border-radius: 12px;
        }
        .staff-badge {
          transition: background 0.15s;
          padding: 6px 8px;
          margin-right: -8px;
          cursor: pointer;
        }

        /* Branch badge pulse on hover */
        .branch-badge:hover {
          background: #E0E7FF !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .branch-badge {
          transition: background 0.15s, box-shadow 0.15s !important;
        }

        /* Hamburger button hover */
        .hamburger-btn:hover {
          background: #F1F0FE;
        }
        .hamburger-btn:focus-visible {
          outline: 2px solid #6366F1;
          outline-offset: 2px;
        }
        .hamburger-btn {
          transition: background 0.15s;
          border-radius: 10px;
        }

        @media (max-width: 767px) {
          .hamburger-btn { display: flex !important; }
          .app-sidebar {
            position: fixed !important;
            top: 64px;
            bottom: 0;
            left: 0;
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
            <header style={styles.topbar}>
                <div style={styles.topbarLeft}>
                    <button
                        className="hamburger-btn"
                        style={styles.hamburger}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle menu"
                    >
                        <span style={styles.hamburgerLine} />
                        <span style={styles.hamburgerLine} />
                        <span style={styles.hamburgerLine} />
                    </button>

                    <div style={styles.logo}>
                        <div style={styles.logoIconWrap}>
                            <span style={styles.logoIcon}>🏋️</span>
                        </div>
                        <span style={styles.logoText}>VT <span style={styles.logoAccent}>Gym</span></span>
                    </div>

                    {/* Divider */}
                    <div style={styles.topbarDivider} />

                    {/* Branch badge — moved closer to logo */}
                    <div className="branch-badge" style={styles.branchBadge} title="Chi nhánh hiện tại">
                        <span style={styles.branchPin}>📍</span>
                        <span style={styles.branchName}>{branchName}</span>
                    </div>
                </div>

                {/* Staff badge */}
                <div className="staff-badge" style={styles.staffBadge}>
                    <div style={styles.avatar}>
                        <span style={styles.avatarText}>NA</span>
                    </div>
                    <div style={styles.staffInfo}>
                        <span style={styles.staffName}>Nguyễn Văn A</span>
                        <span style={styles.staffRole}>
                            <span style={styles.staffRoleDot} />
                            Cashier
                        </span>
                    </div>
                </div>
            </header>

            <div style={styles.body}>
                {sidebarOpen && (
                    <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
                )}

                {/* ── SIDEBAR ── */}
                <aside className={`app-sidebar ${sidebarOpen ? "is-open" : ""}`} style={styles.sidebar}>
                    <nav style={styles.nav}>
                        <div style={styles.navColumn}>
                            {NAV_ITEMS.map((item) => {
                                const active = isItemActive(item);
                                const isOpen = openSubmenus.has(item.id);
                                return (
                                    <div key={item.id}>
                                        <button
                                            className={`nav-item-btn${active ? " nav-item-active" : ""}`}
                                            style={{
                                                ...styles.navItem,
                                                ...(active ? styles.navItemActive : styles.navItemInactive),
                                            }}
                                            onClick={() => handleTopClick(item)}
                                        >
                                            <span style={styles.navIconWrap}>{item.icon}</span>
                                            <span style={styles.navLabel}>{item.label}</span>
                                            {item.children && (
                                                <span
                                                    style={{
                                                        ...styles.chevron,
                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                        color: active ? "rgba(255,255,255,0.7)" : "#94A3B8",
                                                    }}
                                                >
                                                    ▾
                                                </span>
                                            )}
                                        </button>

                                        {item.children && isOpen && (
                                            <div
                                                style={{
                                                    ...styles.submenu,
                                                    ...(active ? styles.submenuActive : null),
                                                }}
                                            >
                                                {item.children.map((child) => {
                                                    const childActive = location.pathname === child.path;
                                                    return (
                                                        <button
                                                            key={child.id}
                                                            className={`sub-item-btn${childActive ? " sub-item-active" : ""}`}
                                                            style={{
                                                                ...styles.subItem,
                                                                ...(childActive
                                                                    ? styles.subItemActive
                                                                    : styles.subItemInactive),
                                                            }}
                                                            onClick={() => handleChildClick(child.path)}
                                                        >
                                                            <span style={styles.subIcon}>{child.icon}</span>
                                                            <span style={styles.subLabel}>{child.label}</span>
                                                            {childActive && <span style={styles.subActiveDot} />}
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
                            style={styles.logoutBtn}
                            onClick={() => alert("Đăng xuất")}
                        >
                            <span style={styles.logoutIcon}>🚪</span>
                            <span style={styles.logoutLabel}>Đăng xuất</span>
                        </button>
                    </nav>
                </aside>

                {/* ── PAGE CONTENT ── */}
                <main style={styles.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

const styles = {
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        background: "#F0F2F8",
    },

    // ── TOPBAR ──
    topbar: {
        height: 64,
        flexShrink: 0,
        background: "white",
        borderBottom: "1px solid #E8ECF4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 110,
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        gap: 8,
    },
    topbarLeft: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    topbarDivider: {
        width: 1,
        height: 28,
        background: "#E2E8F0",
        flexShrink: 0,
        marginLeft: 2,
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
        background: "#475569",
        borderRadius: 2,
    },

    // ── LOGO ──
    logo: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        flexShrink: 0,
    },
    logoIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(79,70,229,0.28)",
        flexShrink: 0,
    },
    logoIcon: {
        fontSize: 18,
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
    },
    logoText: {
        fontWeight: 800,
        fontSize: 19,
        color: "#0F172A",
        letterSpacing: "-0.5px",
        lineHeight: 1,
    },
    logoAccent: {
        color: "#4F46E5",
    },

    // ── BRANCH BADGE ──
    branchBadge: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 999,
        background: "#EEF2FF",
        color: "#4338CA",
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        userSelect: "none",
        cursor: "default",
        border: "1px solid #C7D2FE",
    },
    branchPin: { fontSize: 13 },
    branchName: {
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },

    // ── STAFF BADGE ──
    staffBadge: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
        flexShrink: 0,
        border: "2px solid white",
    },
    avatarText: {
        color: "white",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.3px",
    },
    staffInfo: {
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.3,
    },
    staffName: {
        fontSize: 14,
        fontWeight: 700,
        color: "#0F172A",
        whiteSpace: "nowrap",
    },
    staffRole: {
        fontSize: 11.5,
        color: "#64748B",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    staffRoleDot: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#22C55E",
        display: "inline-block",
        boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
    },

    // ── BODY ──
    body: {
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
        height: "calc(100vh - 64px)",
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 150,
        backdropFilter: "blur(2px)",
    },

    // ── SIDEBAR ──
    sidebar: {
        width: 260,
        background: "white",
        borderRight: "1px solid #E8ECF4",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
        boxShadow: "1px 0 0 #E8ECF4",
    },
    nav: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px 12px",
        gap: 12,
    },
    navColumn: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
    },

    // Nav items
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "11px 14px",
        borderRadius: 12,
        fontSize: 14.5,
        fontWeight: 600,
        textAlign: "left",
        letterSpacing: "-0.1px",
    },
    navItemActive: {
        background: "linear-gradient(135deg, #4F46E5 0%, #6D28D9 100%)",
        color: "white",
        boxShadow: "0 6px 16px rgba(79,70,229,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
    },
    navItemInactive: {
        background: "transparent",
        color: "#334155",
    },
    navIconWrap: {
        fontSize: 20,
        lineHeight: 1,
        flexShrink: 0,
        width: 24,
        textAlign: "center",
    },
    navLabel: { flex: 1 },
    chevron: {
        fontSize: 12,
        transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
    },

    // Submenu
    submenu: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "4px 0 4px 16px",
        marginLeft: 16,
        borderLeft: "2px solid #EEF2FF",
        marginTop: 2,
        borderRadius: 10,
        transition: "background 0.15s, border-color 0.15s",
    },
    submenuActive: {
        background: "#EEF2FF",
        borderLeft: "2px solid #818CF8",
    },
    subItem: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        padding: "9px 12px",
        borderRadius: 9,
        fontSize: 13.5,
        textAlign: "left",
    },
    subItemActive: {
        background: "#EEF2FF",
        color: "#4338CA",
        fontWeight: 700,
    },
    subItemInactive: {
        background: "transparent",
        color: "#64748B",
        fontWeight: 500,
    },
    subIcon: {
        fontSize: 15,
        width: 18,
        textAlign: "center",
        flexShrink: 0,
    },
    subLabel: { flex: 1 },
    subActiveDot: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "#4F46E5",
        flexShrink: 0,
    },

    // Logout
    logoutBtn: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        marginTop: "auto",
        padding: "11px 14px",
        borderRadius: 12,
        background: "#FFF5F5",
        border: "1px solid #FECACA",
        width: "100%",
    },
    logoutIcon: { fontSize: 20, lineHeight: 1, flexShrink: 0 },
    logoutLabel: {
        fontSize: 14.5,
        fontWeight: 600,
        color: "#DC2626",
        flex: 1,
        textAlign: "left",
    },

    // Main content
    main: {
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "28px 32px",
        minWidth: 0,
        height: "100%",
    },
};
