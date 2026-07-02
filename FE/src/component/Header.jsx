import { useEffect, useRef, useState } from "react";
import authApi, { isLoggedIn as checkIsLoggedIn, getCurrentUser } from "../api/authApi";
import logo from "../assets/logo.png";
// Lưu ý: chỉnh lại đường dẫn "../api/authApi" cho khớp vị trí thực tế của Header.jsx trong dự án.

const ROLE_LABEL = {
    Member: "Hội viên",
    Employee: "Nhân viên",
};

/* requireAuth: true -> chỉ hiện khi đã đăng nhập */
const NAV_LINKS = [
    { label: "Trang Chủ", href: "/" },
    { label: "Gói tập", href: "/packages" },
    { label: "Máy tập", href: "/equiptment" },
    { label: "Chi nhánh", href: "/branch" },
    { label: "Thống kê", href: "/thong-ke", requireAuth: true },
    { label: "Báo cáo vấn đề", href: "/issue", requireAuth: true },
    { label: "Cộng Đồng", href: "/comunity" },
];

/* ─── icons ─── */
function IconUser() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4.5 19.5c1.5-3.5 4.5-5.5 7.5-5.5s6 2 7.5 5.5"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}
function IconPin() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width="13" height="13" style={{ flexShrink: 0 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

export default function Header() {
    document.title = "VT Gym"

    const [menuOpen, setMenuOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [activePath, setActivePath] = useState(
        typeof window !== "undefined" ? window.location.pathname : "/"
    );
    const userRef = useRef(null);

    /* ── auth state: lấy từ authApi (accessToken/fullName/role trong localStorage) ── */
    const [authed, setAuthed] = useState(false);
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        if (checkIsLoggedIn()) {
            const { fullName, role } = getCurrentUser();
            setAuthed(true);
            setUserName(fullName || "Thành viên");
            setUserRole(role || "");
        } else {
            setAuthed(false);
            setUserName("");
            setUserRole("");
        }
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.logout(); // gọi API + tự clearTokens() bên trong
        } catch {
            // vẫn tiếp tục đăng xuất phía client dù API lỗi
        }
        setAuthed(false);
        setUserName("");
        setUserRole("");
        setUserOpen(false);
        setMenuOpen(false);
        window.location.href = "/member/login";
    };

    /* danh sách nav hiển thị theo trạng thái đăng nhập */
    const visibleNavLinks = NAV_LINKS.filter(link => !link.requireAuth || authed);

    /* close user dropdown on outside click */
    useEffect(() => {
        const fn = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
        };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    /* lock body scroll when mobile menu open */
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    /* close drawer automatically if viewport grows back to desktop */
    useEffect(() => {
        const onResize = () => { if (window.innerWidth > 900) setMenuOpen(false); };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const close = () => setMenuOpen(false);

    return (
        <>
            {/* ─── GLOBAL TOKENS + FONTS ─── injected once by Header for all pages */}
            <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap");

        :root {
          --bg:           #0d0e11;
          --bg-soft:      #16181e;
          --bg-elevated:  #1e2028;
          --line:         rgba(255,255,255,.08);
          --text:         #e8eaf0;
          --text-dim:     rgba(255,255,255,.42);
          --accent:       #ff4f2b;
          --accent-soft:  rgba(255,79,43,.12);
          --steel:        #5bb8cc;
          --steel-soft:   rgba(91,184,204,.45);
          --radius:       12px;
          --font-display: "Barlow Condensed", "Arial Narrow", Arial, sans-serif;
          --font-body:    "DM Sans", system-ui, sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }

        /* ══ HEADER SHELL ══ */
        .vt-hdr {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,14,17,.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--line);
        }
        .vt-hdr__row {
          position: relative;
          max-width: 1280px; margin: 0 auto;
          height: 62px;
          display: flex; align-items: center;
          padding: 0 32px; gap: 0;
        }

        /* logo — left slot */
        .vt-hdr__logo {
          display: flex; align-items: center; flex-shrink: 0;
          margin-right: auto;
        }
        .vt-hdr__logo img { height: 34px; width: auto; display: block; }

        /* nav — centre slot */
        .vt-hdr__nav {
          display: flex; align-items: stretch; gap: 2px;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .vt-hdr__link {
          font-family: var(--font-body);
          font-size: 14px; font-weight: 500;
          line-height: 1;
          display: inline-flex; align-items: center;
          color: var(--text-dim);
          padding: 7px 13px; border-radius: 8px;
          transition: color .15s, background .15s;
          white-space: nowrap;
        }
        .vt-hdr__link:hover  { color: var(--text); background: var(--bg-elevated); }
        .vt-hdr__link--active { color: var(--accent) !important; background: var(--accent-soft) !important; }

        /* actions — right slot */
        .vt-hdr__actions {
          display: flex; align-items: center; gap: 10px;
          margin-left: auto;
        }

        /* login link (chưa đăng nhập, desktop) */
        .vt-login-btn {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-body);
          font-size: 13px; font-weight: 600;
          color: var(--text-dim);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 7px 14px;
          background: var(--bg-elevated);
          transition: color .15s, border-color .15s;
        }
        .vt-login-btn:hover { color: var(--accent); border-color: var(--accent); }

        /* ── user button + dropdown ── */
        .vt-usr { position: relative; }
        .vt-usr__btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--text-dim); cursor: pointer;
          transition: border-color .2s, color .2s;
        }
        .vt-usr__btn:hover { color: var(--accent); border-color: var(--accent); }

        .vt-usr__drop {
          position: absolute; right: 0; top: calc(100% + 10px);
          width: 220px; background: var(--bg-soft);
          border: 1px solid var(--line); border-radius: var(--radius);
          box-shadow: 0 8px 32px rgba(0,0,0,.6);
          padding: 14px;
          animation: hdr-fade-down .15s ease;
        }
        .vt-usr__info { display: flex; align-items: center; gap: 10px; }
        .vt-usr__avatar {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--steel); flex-shrink: 0;
        }
        .vt-usr__name { font-size: 14px; font-weight: 600; }
        .vt-usr__plan { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .vt-usr__hr   { border: none; border-top: 1px solid var(--line); margin: 10px 0; }
        .vt-usr__item {
          display: block; padding: 8px 0;
          font-size: 13px; color: var(--text-dim);
          transition: color .15s;
        }
        .vt-usr__item:hover { color: var(--text); }
        .vt-usr__out {
          width: 100%; background: transparent; cursor: pointer;
          border: 1px solid var(--line); color: var(--accent);
          font-family: var(--font-body); font-size: 13px; font-weight: 600;
          padding: 8px; border-radius: 8px; margin-top: 6px;
          transition: background .2s, border-color .2s;
        }
        .vt-usr__out:hover { background: var(--accent-soft); border-color: var(--accent); }

        /* ── hamburger (mobile only) ── */
        .vt-burger {
          position: relative;
          z-index: 2;
          display: none;
          align-items: center; justify-content: center; flex-direction: column; gap: 5px;
          width: 38px; height: 38px; border-radius: 8px;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--text); cursor: pointer;
          transition: border-color .2s;
        }
        .vt-burger:hover { border-color: var(--steel); }
        .vt-burger span {
          display: block; width: 18px; height: 2px;
          background: currentColor; border-radius: 2px;
          transition: transform .25s, opacity .25s;
        }
        .vt-burger--open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .vt-burger--open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .vt-burger--open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── mobile drawer ── (chỉ render khi menuOpen=true, không cần display:none nữa) */
        .vt-drawer {
          position: fixed; inset: 0 0 0 auto;
          width: 80%; max-width: 300px;
          height: 100dvh;
          background: var(--bg-soft); border-left: 1px solid var(--line);
          display: flex; flex-direction: column;
          z-index: 200; padding: 0 0 28px; overflow-y: auto;
          animation: hdr-slide-in .28s cubic-bezier(.4,0,.2,1);
        }
        @keyframes hdr-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }

        .vt-drawer__top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid var(--line);
          position: sticky; top: 0; background: var(--bg-soft); z-index: 1;
        }
        .vt-drawer__user {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px; border-bottom: 1px solid var(--line);
        }
        .vt-drawer__login {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin: 16px 20px;
          padding: 11px; border-radius: 10px;
          border: 1px solid var(--line);
          color: var(--text); font-size: 14px; font-weight: 600;
          background: var(--bg-elevated);
        }
        .vt-drawer__nav { display: flex; flex-direction: column; padding: 8px 0; }
        .vt-drawer__nav .vt-hdr__link {
          padding: 13px 20px; border-radius: 0;
          border-bottom: 1px solid var(--line);
          font-size: 15px;
        }
        .vt-drawer__nav .vt-hdr__link:last-child { border-bottom: none; }

        .vt-drawer__section { padding: 18px 20px 0; }
        .vt-drawer__label {
          font-size: 10.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .8px; color: var(--text-dim); margin-bottom: 8px;
        }
        .vt-drawer__branch {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 0; font-size: 14px; color: var(--text-dim);
          border-bottom: 1px solid var(--line);
          transition: color .15s;
        }
        .vt-drawer__branch:last-child { border-bottom: none; }
        .vt-drawer__branch:hover { color: var(--text); }
        .vt-drawer__foot { padding: 20px 20px 0; margin-top: auto; }

        .vt-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(2px);
          z-index: 150;
        }

        @keyframes hdr-fade-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .vt-hdr__nav { display: none; }
          .vt-usr      { display: none; }
          .vt-login-btn { display: none; }
          .vt-burger   { display: flex; }
        }
        @media (min-width: 901px) {
          .vt-drawer, .vt-backdrop { display: none !important; }
        }
        @media (max-width: 600px) {
          .vt-hdr__row { padding: 0 16px; }
        }
      `}</style>

            <header className="vt-hdr">
                <div className="vt-hdr__row">

                    {/* LOGO */}
                    <a href="/" className="vt-hdr__logo" onClick={() => setActivePath("/")}>
                        <img src={logo} alt="VTGym" />
                    </a>

                    {/* DESKTOP NAV */}
                    <nav className="vt-hdr__nav">
                        {visibleNavLinks.map(({ label, href }) => (
                            <a
                                key={href}
                                href={href}
                                className={`vt-hdr__link${activePath === href ? " vt-hdr__link--active" : ""}`}
                                onClick={() => setActivePath(href)}
                            >
                                {label}
                            </a>
                        ))}
                    </nav>

                    {/* ACTIONS */}
                    <div className="vt-hdr__actions">
                        {authed ? (
                            /* user dropdown — desktop, chỉ hiện khi đã đăng nhập */
                            <div className="vt-usr" ref={userRef}>
                                <button className="vt-usr__btn" onClick={() => setUserOpen(v => !v)} aria-label="Tài khoản">
                                    <IconUser />
                                </button>
                                {userOpen && (
                                    <div className="vt-usr__drop">
                                        <div className="vt-usr__info">
                                            <span className="vt-usr__avatar"><IconUser /></span>
                                            <div>
                                                <p className="vt-usr__name">{userName}</p>
                                                <p className="vt-usr__plan">{ROLE_LABEL[userRole] || userRole || "Hội viên"}</p>
                                            </div>
                                        </div>
                                        <hr className="vt-usr__hr" />
                                        <a href="/my-info" className="vt-usr__item">Thông tin cá nhân</a>
                                        <a href="/thong-ke" className="vt-usr__item">Thống kê</a>
                                        <button className="vt-usr__out" onClick={handleLogout}>Đăng xuất</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* chưa đăng nhập — nút đăng nhập thay cho avatar */
                            <a href="/member/login" className="vt-login-btn">
                                <IconUser />
                                Đăng nhập
                            </a>
                        )}

                        {/* hamburger — mobile */}
                        <button
                            className={`vt-burger${menuOpen ? " vt-burger--open" : ""}`}
                            onClick={() => setMenuOpen(v => !v)}
                            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
                            aria-expanded={menuOpen}
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>

                {/* MOBILE DRAWER — chỉ render khi menuOpen = true (fix triệt để lỗi kẹt mở) */}
                {menuOpen && (
                    <>
                        <div className="vt-backdrop" onClick={close} aria-hidden />
                        <div className="vt-drawer" role="dialog" aria-label="Menu">
                            <div className="vt-drawer__top">
                                <a href="/" className="vt-hdr__logo" onClick={close}>
                                    <img src={logo} alt="VTGym" />
                                </a>
                                <button
                                    className="vt-burger vt-burger--open"
                                    onClick={close}
                                    aria-label="Đóng menu"
                                    style={{ marginLeft: "auto" }}
                                >
                                    <span /><span /><span />
                                </button>
                            </div>

                            {authed ? (
                                <div className="vt-drawer__user">
                                    <span className="vt-usr__avatar"><IconUser /></span>
                                    <div>
                                        <p className="vt-usr__name">{userName}</p>
                                        <p className="vt-usr__plan">{ROLE_LABEL[userRole] || userRole || "Hội viên"}</p>
                                    </div>
                                </div>
                            ) : (
                                <a href="/member/login" className="vt-drawer__login" onClick={close}>
                                    <IconUser />
                                    Đăng nhập
                                </a>
                            )}

                            <nav className="vt-drawer__nav">
                                {visibleNavLinks.map(({ label, href }) => (
                                    <a
                                        key={href}
                                        href={href}
                                        className={`vt-hdr__link${activePath === href ? " vt-hdr__link--active" : ""}`}
                                        onClick={() => { setActivePath(href); close(); }}
                                    >
                                        {label}
                                    </a>
                                ))}
                            </nav>

                            {authed && (
                                <div className="vt-drawer__foot">
                                    <button className="vt-usr__out" style={{ width: "100%" }} onClick={handleLogout}>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </header>
        </>
    );
}