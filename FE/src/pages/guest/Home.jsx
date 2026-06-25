import { useEffect, useRef, useState } from "react";

const CURRENT_USER = {
    name: "Nguyễn Văn A",
    plan: "Hội viên Tự Do",
};

const NAV_LINKS = [
    { label: "Gói tập", href: "/goi-tap" },
    { label: "Máy tập", href: "/may-tap" },
    { label: "Chi nhánh", href: "/chi-nhanh" },
    { label: "Check-in", href: "/check-in" },
    { label: "Thống kê", href: "/thong-ke" },
];

const BRANCHES = [
    { id: "q1", name: "VTGym Quận 1", address: "123 Nguyễn Huệ, Q.1, TP.HCM", href: "/chi-nhanh/q1" },
    { id: "q7", name: "VTGym Quận 7", address: "456 Nguyễn Thị Thập, Q.7, TP.HCM", href: "/chi-nhanh/q7" },
    { id: "bth", name: "VTGym Bình Thạnh", address: "78 Xô Viết Nghệ Tĩnh, Q.BT, TP.HCM", href: "/chi-nhanh/binh-thanh" },
    { id: "td", name: "VTGym Thủ Đức", address: "321 Võ Văn Ngân, TP.Thủ Đức", href: "/chi-nhanh/thu-duc" },
];

const TRAFFIC_DATA = {
    q1: [28, 41, 55, 62, 48],
    q7: [18, 30, 44, 50, 37],
    bth: [22, 35, 49, 58, 43],
    td: [12, 24, 38, 45, 30],
};

const HERO_IMAGES = [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80",
];

// Gallery images — gym equipment, atmosphere, people training
const GALLERY_IMAGES = [
    {
        src: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=900&q=80",
        label: "Khu tạ tự do",
    },
    {
        src: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80",
        label: "Máy cardio hiện đại",
    },
    {
        src: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80",
        label: "Không gian rộng rãi",
    },
    {
        src: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80",
        label: "Khu Functional Training",
    },
    {
        src: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=900&q=80",
        label: "Phòng tập sạch sẽ",
    },
    {
        src: "https://images.unsplash.com/photo-1567598508481-65985588e295?w=900&q=80",
        label: "Máy lạnh toàn khu",
    },
];

const EQUIPMENT_CATEGORIES = [
    { icon: "🏋️", name: "Tạ tự do", desc: "Dumbbells 2–60kg, barbell, EZ bar, hex bar", href: "/may-tap#ta-tu-do" },
    { icon: "🚴", name: "Cardio", desc: "Treadmill, bike, elliptical, rowing machine", href: "/may-tap#cardio" },
    { icon: "⚙️", name: "Máy kháng lực", desc: "Cable crossover, smith machine, leg press", href: "/may-tap#may-khang-luc" },
    { icon: "🤸", name: "Functional", desc: "TRX, battle rope, kettlebell, plyo box", href: "/may-tap#functional" },
];

function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" />
            <path d="M4.5 19.2c1.4-3.3 4.3-5 7.5-5s6.1 1.7 7.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}
function MenuIcon() {
    return (
        <svg viewBox="0 0 24 24" width="22" height="22">
            <line x1="3" y1="6.5" x2="21" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="17.5" x2="21" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" width="22" height="22">
            <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function LocationIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function TrafficChart({ branchId }) {
    const data = TRAFFIC_DATA[branchId] || TRAFFIC_DATA.q1;
    const max = Math.max(...data) || 1;
    const now = new Date();
    const labels = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(now);
        d.setHours(d.getHours() - (4 - i));
        return d.getHours().toString().padStart(2, "0") + ":00";
    });
    return (
        <div className="vt-chart">
            <div className="vt-chart__bars">
                {data.map((val, i) => (
                    <div className="vt-chart__col" key={i}>
                        <span className="vt-chart__val">{val}</span>
                        <div className="vt-chart__bar-wrap">
                            <div
                                className="vt-chart__bar"
                                style={{ height: `${(val / max) * 100}%`, background: i === 4 ? "var(--accent)" : "var(--steel-soft)" }}
                            />
                        </div>
                        <span className="vt-chart__label">{labels[i]}</span>
                    </div>
                ))}
            </div>
            <p className="vt-chart__note">Số người đang tập · 5 khung giờ gần nhất</p>
        </div>
    );
}

export default function Home() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [heroIdx, setHeroIdx] = useState(0);
    const [activeBranch] = useState(BRANCHES[0]);
    const userMenuRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        function outside(e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        }
        document.addEventListener("mousedown", outside);
        return () => document.removeEventListener("mousedown", outside);
    }, []);

    // Lock body scroll when mobile menu open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    return (
        <div className="vt-page">
            {/* HEADER */}
            <header className="vt-header">
                <div className="vt-header__inner">
                    <a href="/" className="vt-logo">
                        <span className="vt-logo__mark">VT</span>
                        <span className="vt-logo__text">VTGym<span className="vt-logo__dot">.</span></span>
                    </a>

                    <nav className="vt-nav vt-nav--desktop">
                        {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="vt-nav__link">{l.label}</a>)}
                    </nav>

                    <div className="vt-header__actions">
                        {/* User menu — desktop only */}
                        <div className="vt-user vt-user--desktop" ref={userMenuRef}>
                            <button className="vt-user__trigger" onClick={() => setUserMenuOpen(v => !v)}>
                                <UserIcon />
                            </button>
                            {userMenuOpen && (
                                <div className="vt-user__dropdown">
                                    <div className="vt-user__info">
                                        <span className="vt-user__avatar"><UserIcon /></span>
                                        <div>
                                            <p className="vt-user__name">{CURRENT_USER.name}</p>
                                            <p className="vt-user__plan">{CURRENT_USER.plan}</p>
                                        </div>
                                    </div>
                                    <hr className="vt-user__divider" />
                                    <a href="/lich-su" className="vt-user__menu-link">Lịch sử tập</a>
                                    <a href="/thong-ke" className="vt-user__menu-link">Thống kê</a>
                                    <button className="vt-user__logout" onClick={() => console.log("logout")}>Đăng xuất</button>
                                </div>
                            )}
                        </div>
                        {/* Hamburger — mobile only */}
                        <button className="vt-burger" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><MenuIcon /></button>
                    </div>
                </div>

                {/* Mobile drawer — only renders/shows on mobile */}
                <div className={`vt-mobile ${mobileOpen ? "vt-mobile--open" : ""}`} aria-hidden={!mobileOpen}>
                    <div className="vt-mobile__top">
                        <a href="/" className="vt-logo" onClick={() => setMobileOpen(false)}>
                            <span className="vt-logo__mark">VT</span>
                            <span className="vt-logo__text">VTGym<span className="vt-logo__dot">.</span></span>
                        </a>
                        <button className="vt-burger" onClick={() => setMobileOpen(false)}><CloseIcon /></button>
                    </div>

                    {/* User info in mobile drawer */}
                    <div className="vt-mobile__user">
                        <span className="vt-user__avatar"><UserIcon /></span>
                        <div>
                            <p className="vt-user__name">{CURRENT_USER.name}</p>
                            <p className="vt-user__plan">{CURRENT_USER.plan}</p>
                        </div>
                    </div>

                    <nav className="vt-nav vt-nav--mobile">
                        {NAV_LINKS.map(l => (
                            <a key={l.href} href={l.href} className="vt-nav__link" onClick={() => setMobileOpen(false)}>{l.label}</a>
                        ))}
                        <a href="/thong-ke" className="vt-nav__link" onClick={() => setMobileOpen(false)}>Thống kê</a>
                        <a href="/lich-su" className="vt-nav__link" onClick={() => setMobileOpen(false)}>Lịch sử tập</a>
                    </nav>

                    <div className="vt-mobile__branches">
                        <p className="vt-mobile__section-label">Chi nhánh</p>
                        {BRANCHES.map(b => (
                            <a key={b.id} href={b.href} className="vt-mobile__branch-item" onClick={() => setMobileOpen(false)}>
                                <LocationIcon />{b.name}
                            </a>
                        ))}
                    </div>

                    <div className="vt-mobile__footer">
                        <button className="vt-user__logout" onClick={() => console.log("logout")}>Đăng xuất</button>
                    </div>
                </div>
                {mobileOpen && <div className="vt-mobile__backdrop" onClick={() => setMobileOpen(false)} />}
            </header>

            <main>
                {/* HERO */}
                <section className="vt-hero">
                    {HERO_IMAGES.map((src, i) => (
                        <div key={i} className="vt-hero__bg" style={{ backgroundImage: `url(${src})`, opacity: i === heroIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
                    ))}
                    <div className="vt-hero__overlay" />
                    <div className="vt-hero__inner">
                        <p className="vt-eyebrow">Không gói PT bắt buộc &middot; Tập theo cách của bạn</p>
                        <h1 className="vt-hero__title">
                            Tự tập.<br />
                            <span className="vt-accent">Tự do.</span><br />
                            Tự vượt giới hạn.
                        </h1>
                        <p className="vt-hero__desc">
                            Không ép lớp, không ép PT — chỉ có bạn, mục tiêu của bạn, và không gian tập đủ chuẩn để bứt phá. Minh bạch từ giá đến thiết bị.
                        </p>
                        <div className="vt-hero__cta">
                            <a href="/check-in" className="vt-btn vt-btn--primary">Check-in ngay</a>
                            <a href="/goi-tap" className="vt-btn vt-btn--ghost">Xem gói tập</a>
                        </div>
                        <div className="vt-hero__dots">
                            {HERO_IMAGES.map((_, i) => (
                                <button key={i} className={`vt-hero__dot ${i === heroIdx ? "vt-hero__dot--active" : ""}`} onClick={() => setHeroIdx(i)} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* STATS STRIP */}
                <section className="vt-statsbar">
                    {[
                        { num: "24/7", label: "Giờ hoạt động" },
                        { num: "4", label: "Chi nhánh" },
                        { num: "200+", label: "Máy tập" },
                        { num: "0", label: "Lớp bắt buộc" },
                    ].map((s, i) => (
                        <div className="vt-statsbar__item" key={i}>
                            <span className="vt-statsbar__num">{s.num}</span>
                            <span className="vt-statsbar__label">{s.label}</span>
                        </div>
                    ))}
                </section>

                {/* GALLERY */}
                <section className="vt-gallery">
                    <div className="vt-gallery__inner">
                        <div className="vt-gallery__header">
                            <h2 className="vt-section-title">Không gian tập luyện</h2>
                            <a href="/chi-nhanh" className="vt-link-arrow">Xem tất cả chi nhánh →</a>
                        </div>
                        <div className="vt-gallery__grid">
                            {GALLERY_IMAGES.map((img, i) => (
                                <div className={`vt-gallery__item ${i === 0 ? "vt-gallery__item--wide" : ""}`} key={i}>
                                    <img src={img.src} alt={img.label} loading="lazy" />
                                    <div className="vt-gallery__label">{img.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* EQUIPMENT */}
                <section className="vt-equipment">
                    <div className="vt-equipment__inner">
                        <div className="vt-equipment__head">
                            <div>
                                <h2 className="vt-section-title">Danh mục máy tập</h2>
                                <p className="vt-section-sub">Nhập khẩu Mỹ &amp; Châu Âu — bảo trì hàng tuần, không bao giờ lỗi thời.</p>
                            </div>
                            <a href="/may-tap" className="vt-btn vt-btn--ghost" style={{ whiteSpace: "nowrap" }}>Xem toàn bộ →</a>
                        </div>
                        <div className="vt-equipment__grid">
                            {EQUIPMENT_CATEGORIES.map((eq, i) => (
                                <a href={eq.href} className="vt-eq-card" key={i}>
                                    <span className="vt-eq-card__icon">{eq.icon}</span>
                                    <strong className="vt-eq-card__name">{eq.name}</strong>
                                    <p className="vt-eq-card__desc">{eq.desc}</p>
                                    <span className="vt-eq-card__arrow">→</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* LIVE TRAFFIC */}
                <section className="vt-traffic">
                    <div className="vt-traffic__inner">
                        <div className="vt-traffic__head">
                            <div>
                                <h2 className="vt-section-title">Lượng người tập theo giờ</h2>
                                <p className="vt-section-sub">Dữ liệu thực tế — cập nhật mỗi 15 phút</p>
                            </div>
                            <div className="vt-traffic__badge">
                                <span className="vt-pulse" />Live
                            </div>
                        </div>
                        <TrafficChart branchId={activeBranch.id} />
                    </div>
                </section>

                {/* FEATURES */}
                <section className="vt-features">
                    <div className="vt-features__inner">
                        <h2 className="vt-section-title" style={{ textAlign: "center", marginBottom: 8 }}>Tại sao chọn VTGym?</h2>
                        <p className="vt-section-sub" style={{ textAlign: "center", marginBottom: 40 }}>Không điều khoản ẩn. Không ràng buộc. Chỉ có tập luyện.</p>
                        <div className="vt-features__grid">
                            {[
                                { icon: "⚡", title: "Tự do, không ràng buộc", desc: "Bạn chọn giờ, chọn bài, chọn tốc độ. Không lớp cố định, không lịch ép buộc — 24/7 không giới hạn." },
                                { icon: "🤝", title: "PT ngoài được chào đón", desc: "Mang PT riêng vào tập? Hoàn toàn được — PT của bạn vào cùng quyền lợi như hội viên thông thường." },
                                { icon: "📊", title: "Theo dõi tiến độ", desc: "Check-in một chạm. Thống kê số buổi, calo ước tính, xu hướng tiến bộ hàng tuần." },
                                { icon: "🏋️", title: "Thiết bị nhập khẩu", desc: "Máy tập từ Mỹ &amp; Châu Âu, bảo trì định kỳ. Khu tạ, cardio, functional đều đủ chỗ." },
                                { icon: "❄️", title: "Môi trường đỉnh", desc: "Máy lạnh toàn khu, wifi 500 Mbps, phòng tắm sạch, tủ khóa cá nhân — một giá, tất cả." },
                                { icon: "📍", title: "1 thẻ — 4 chi nhánh", desc: "Thẻ hội viên dùng được ở Quận 1, Quận 7, Bình Thạnh và Thủ Đức. Đến đâu tập đó." },
                            ].map((c, i) => (
                                <div className="vt-card" key={i}>
                                    <div className="vt-card__icon">{c.icon}</div>
                                    <h3>{c.title}</h3>
                                    <p dangerouslySetInnerHTML={{ __html: c.desc }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* BRANCHES CTA STRIP */}
                <section className="vt-branches-strip">
                    <div className="vt-branches-strip__inner">
                        <div className="vt-branches-strip__text">
                            <h2 className="vt-section-title">4 chi nhánh trải khắp TP.HCM</h2>
                            <p className="vt-section-sub">Một thẻ hội viên — tập được ở tất cả cơ sở, không phụ phí đổi chi nhánh.</p>
                        </div>
                        <div className="vt-branches-strip__list">
                            {BRANCHES.map(b => (
                                <a href={b.href} key={b.id} className="vt-branch-pill">
                                    <span className="vt-branch-pill__dot" />
                                    <span>{b.name}</span>
                                    <span className="vt-branch-pill__arrow">→</span>
                                </a>
                            ))}
                        </div>
                        <a href="/chi-nhanh" className="vt-btn vt-btn--primary" style={{ alignSelf: "flex-start" }}>Xem tất cả chi nhánh</a>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="vt-footer">
                <div className="vt-footer__inner">
                    <div className="vt-footer__top">
                        {/* Brand col */}
                        <div className="vt-footer__brand-col">
                            <div className="vt-footer__brand">
                                <span className="vt-logo__mark">VT</span>
                                <span className="vt-logo__text" style={{ fontWeight: 800, fontSize: 18 }}>VTGym<span className="vt-logo__dot">.</span></span>
                            </div>
                            <p className="vt-footer__tagline">Tập theo cách của bạn.<br />Không ràng buộc — không áp lực.</p>
                            <div className="vt-footer__socials">
                                <a href="https://facebook.com" className="vt-social" aria-label="Facebook">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                </a>
                                <a href="https://instagram.com" className="vt-social" aria-label="Instagram">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                </a>
                                <a href="https://tiktok.com" className="vt-social" aria-label="TikTok">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" /></svg>
                                </a>
                            </div>
                        </div>

                        {/* Nav col */}
                        <div className="vt-footer__col">
                            <p className="vt-footer__col-title">Dịch vụ</p>
                            <a href="/goi-tap" className="vt-footer__link">Gói tập</a>
                            <a href="/may-tap" className="vt-footer__link">Danh mục máy tập</a>
                            <a href="/check-in" className="vt-footer__link">Check-in</a>
                            <a href="/thong-ke" className="vt-footer__link">Thống kê cá nhân</a>
                            <a href="/lich-su" className="vt-footer__link">Lịch sử tập</a>
                        </div>

                        {/* Branches col */}
                        <div className="vt-footer__col">
                            <p className="vt-footer__col-title">Chi nhánh</p>
                            {BRANCHES.map(b => (
                                <a key={b.id} href={b.href} className="vt-footer__link">
                                    <LocationIcon />{b.name}
                                </a>
                            ))}
                            <a href="/chi-nhanh" className="vt-footer__link vt-footer__link--accent">Xem tất cả →</a>
                        </div>

                        {/* Contact col */}
                        <div className="vt-footer__col">
                            <p className="vt-footer__col-title">Liên hệ</p>
                            <p className="vt-footer__contact">Hotline: <a href="tel:19001234" className="vt-footer__contact-link">1900 1234</a></p>
                            <p className="vt-footer__contact">Email: <a href="mailto:hello@vtgym.vn" className="vt-footer__contact-link">hello@vtgym.vn</a></p>
                            <p className="vt-footer__contact" style={{ marginTop: 12, color: "var(--text-dim)", fontSize: 13 }}>Mở cửa 24/7<br />Kể cả lễ Tết</p>
                            <a href="/check-in" className="vt-btn vt-btn--primary" style={{ marginTop: 18, display: "inline-block", padding: "10px 22px", fontSize: 13 }}>Check-in ngay</a>
                        </div>
                    </div>

                    <div className="vt-footer__bottom">
                        <p className="vt-footer__copy">© {new Date().getFullYear()} VTGym. Tất cả quyền được bảo lưu.</p>
                        <div className="vt-footer__bottom-links">
                            <a href="/chinh-sach" className="vt-footer__bottom-link">Chính sách</a>
                            <a href="/dieu-khoan" className="vt-footer__bottom-link">Điều khoản</a>
                            <a href="/bao-mat" className="vt-footer__bottom-link">Bảo mật</a>
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap");

        :root {
          --bg: #0d0e11;
          --bg-soft: #16181e;
          --bg-elevated: #1e2028;
          --line: #272a33;
          --text: #e8eaf0;
          --text-dim: #7d8494;
          --accent: #ff4f2b;
          --accent-soft: rgba(255,79,43,0.12);
          --steel: #5bb8cc;
          --steel-soft: rgba(91,184,204,0.45);
          --radius: 12px;
          --shadow: 0 0 0 1px var(--line), 0 8px 32px rgba(0,0,0,0.6);
          --font-display: "Barlow Condensed", Arial Narrow, Arial, sans-serif;
          --font-body: "DM Sans", system-ui, sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .vt-page {
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
        }

        .vt-page a { text-decoration: none; color: inherit; }
        .vt-page button { font-family: inherit; cursor: pointer; border: none; background: none; }

        /* ── HEADER ── */
        .vt-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,14,17,0.9);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--line);
        }
        .vt-header__inner {
          max-width: 1280px; margin: 0 auto;
          height: 62px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 32px;
        }

        /* Logo */
        .vt-logo { display: flex; align-items: center; gap: 10px; }
        .vt-logo__mark {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          background: var(--accent); color: #fff;
          font-family: var(--font-display); font-weight: 800; font-size: 15px; letter-spacing: 0.5px;
        }
        .vt-logo__text { font-family: var(--font-display); font-weight: 700; font-size: 20px; letter-spacing: 1px; }
        .vt-logo__dot { color: var(--accent); }

        /* Desktop nav */
        .vt-nav--desktop { display: flex; gap: 4px; }
        .vt-nav__link {
          font-size: 14px; font-weight: 500; color: var(--text-dim);
          padding: 6px 12px; border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .vt-nav__link:hover { color: var(--text); background: var(--bg-elevated); }

        .vt-header__actions { display: flex; align-items: center; gap: 10px; }

        /* User menu — desktop */
        .vt-user--desktop { position: relative; }
        .vt-user__trigger {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--text-dim); transition: border-color .2s, color .2s;
        }
        .vt-user__trigger:hover { color: var(--accent); border-color: var(--accent); }
        .vt-user__dropdown {
          position: absolute; right: 0; top: calc(100% + 10px);
          width: 220px; background: var(--bg-soft);
          border: 1px solid var(--line); border-radius: var(--radius);
          box-shadow: var(--shadow); padding: 14px;
          animation: fadeDown .15s ease;
        }
        .vt-user__info { display: flex; align-items: center; gap: 10px; }
        .vt-user__avatar {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--steel); flex-shrink: 0;
        }
        .vt-user__name { font-size: 14px; font-weight: 600; }
        .vt-user__plan { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .vt-user__divider { border: none; border-top: 1px solid var(--line); margin: 10px 0; }
        .vt-user__menu-link {
          display: block; padding: 8px 0; font-size: 13px; color: var(--text-dim);
          transition: color .15s;
        }
        .vt-user__menu-link:hover { color: var(--text); }
        .vt-user__logout {
          width: 100%; background: transparent; border: 1px solid var(--line);
          color: var(--accent); font-size: 13px; font-weight: 600;
          padding: 8px; border-radius: 8px; margin-top: 6px;
          transition: background .2s, border-color .2s;
        }
        .vt-user__logout:hover { background: var(--accent-soft); border-color: var(--accent); }

        /* Hamburger — mobile only */
        .vt-burger {
          display: none; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--bg-elevated); border: 1px solid var(--line); color: var(--text);
        }

        /* Mobile drawer */
        .vt-mobile {
          display: none; /* Hidden on desktop entirely */
        }
        .vt-mobile__backdrop { display: none; }

        /* ── HERO ── */
        .vt-hero {
          position: relative; min-height: 90vh;
          display: flex; align-items: center; overflow: hidden;
        }
        .vt-hero__bg {
          position: absolute; inset: 0;
          background-size: cover; background-position: center;
        }
        .vt-hero__overlay {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, rgba(8,9,11,.92) 40%, rgba(8,9,11,.5) 100%);
        }
        .vt-hero__inner {
          position: relative; max-width: 660px;
          padding: 110px 32px 90px 7vw;
        }
        .vt-eyebrow {
          display: inline-block; font-size: 11px; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; color: var(--accent);
          background: var(--accent-soft); border: 1px solid rgba(255,79,43,.25);
          padding: 5px 14px; border-radius: 100px; margin-bottom: 22px;
          font-family: var(--font-body);
        }
        .vt-hero__title {
          font-family: var(--font-display);
          font-size: clamp(52px, 8vw, 96px); font-weight: 800;
          line-height: .98; letter-spacing: -1px; margin-bottom: 24px;
          text-transform: uppercase;
        }
        .vt-accent { color: var(--accent); }
        .vt-hero__desc {
          font-size: 16px; line-height: 1.7; color: var(--text-dim);
          max-width: 480px; margin-bottom: 36px;
        }
        .vt-hero__cta { display: flex; gap: 12px; flex-wrap: wrap; }
        .vt-btn {
          padding: 13px 26px; border-radius: 9px;
          font-size: 14px; font-weight: 600; font-family: var(--font-body);
          transition: transform .15s, box-shadow .15s, background .15s;
          display: inline-block;
        }
        .vt-btn--primary {
          background: var(--accent); color: #fff;
          box-shadow: 0 4px 20px rgba(255,79,43,.3);
        }
        .vt-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(255,79,43,.45); }
        .vt-btn--ghost {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.15); color: var(--text);
        }
        .vt-btn--ghost:hover { transform: translateY(-2px); border-color: var(--steel); color: var(--steel); }
        .vt-hero__dots { display: flex; gap: 8px; margin-top: 36px; }
        .vt-hero__dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(255,255,255,.2); border: none; cursor: pointer;
          transition: background .2s, transform .2s;
        }
        .vt-hero__dot--active { background: var(--accent); transform: scale(1.4); }

        /* ── STATS BAR ── */
        .vt-statsbar {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid var(--line);
          background: var(--bg-soft);
        }
        .vt-statsbar__item {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 22px 10px; border-right: 1px solid var(--line);
        }
        .vt-statsbar__item:last-child { border-right: none; }
        .vt-statsbar__num {
          font-family: var(--font-display); font-size: 32px; font-weight: 800;
          color: var(--accent); letter-spacing: -0.5px;
        }
        .vt-statsbar__label { font-size: 12px; color: var(--text-dim); text-align: center; }

        /* ── GALLERY ── */
        .vt-gallery { padding: 72px 32px; }
        .vt-gallery__inner { max-width: 1280px; margin: 0 auto; }
        .vt-gallery__header {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 24px;
        }
        .vt-section-title {
          font-family: var(--font-display); font-size: 28px; font-weight: 800;
          letter-spacing: 0.3px; text-transform: uppercase;
        }
        .vt-section-sub { font-size: 14px; color: var(--text-dim); margin-top: 6px; }
        .vt-link-arrow {
          font-size: 13px; font-weight: 600; color: var(--steel);
          transition: color .15s;
        }
        .vt-link-arrow:hover { color: var(--text); }
        .vt-gallery__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: 240px 240px;
          gap: 10px;
        }
        .vt-gallery__item {
          position: relative; overflow: hidden; border-radius: var(--radius);
          background: var(--bg-elevated);
        }
        .vt-gallery__item--wide {
          grid-column: 1 / 3;
          grid-row: 1 / 3;
        }
        .vt-gallery__item img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform .5s ease;
          display: block;
        }
        .vt-gallery__item:hover img { transform: scale(1.04); }
        .vt-gallery__label {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px 14px;
          background: linear-gradient(0deg, rgba(0,0,0,.75) 0%, transparent 100%);
          font-size: 13px; font-weight: 600; color: #fff;
        }

        /* ── EQUIPMENT ── */
        .vt-equipment { padding: 0 32px 72px; }
        .vt-equipment__inner { max-width: 1280px; margin: 0 auto; }
        .vt-equipment__head {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
        }
        .vt-equipment__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .vt-eq-card {
          display: flex; flex-direction: column; gap: 8px;
          padding: 22px 20px; border-radius: var(--radius);
          background: var(--bg-soft); border: 1px solid var(--line);
          transition: border-color .2s, transform .2s;
          position: relative;
        }
        .vt-eq-card:hover { border-color: var(--steel); transform: translateY(-3px); }
        .vt-eq-card__icon { font-size: 26px; }
        .vt-eq-card__name { font-size: 15px; font-weight: 700; }
        .vt-eq-card__desc { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; flex: 1; }
        .vt-eq-card__arrow {
          position: absolute; top: 20px; right: 18px;
          color: var(--text-dim); font-size: 16px;
          transition: color .2s, transform .2s;
        }
        .vt-eq-card:hover .vt-eq-card__arrow { color: var(--steel); transform: translateX(3px); }

        /* ── TRAFFIC ── */
        .vt-traffic { padding: 0 32px 72px; }
        .vt-traffic__inner { max-width: 900px; margin: 0 auto; }
        .vt-traffic__head {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 28px; gap: 16px; flex-wrap: wrap;
        }
        .vt-traffic__badge {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(91,184,204,.1); border: 1px solid rgba(91,184,204,.2);
          color: var(--steel); font-size: 12px; font-weight: 700;
          flex-shrink: 0;
        }
        .vt-pulse {
          width: 7px; height: 7px; border-radius: 50%; background: var(--steel);
          animation: pulse 1.6s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .35; transform: scale(.65); }
        }
        .vt-chart {
          background: var(--bg-soft); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 24px 28px 16px;
        }
        .vt-chart__bars { display: flex; align-items: flex-end; gap: 14px; height: 140px; }
        .vt-chart__col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
        .vt-chart__val { font-size: 12px; font-weight: 700; color: var(--text); }
        .vt-chart__bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; background: var(--bg-elevated); border-radius: 6px; overflow: hidden; }
        .vt-chart__bar { width: 100%; border-radius: 6px 6px 0 0; transition: height .6s cubic-bezier(.34,1.56,.64,1); min-height: 4px; }
        .vt-chart__label { font-size: 11px; color: var(--text-dim); white-space: nowrap; }
        .vt-chart__note { font-size: 12px; color: var(--text-dim); margin-top: 12px; text-align: right; }

        /* ── FEATURES ── */
        .vt-features { padding: 0 32px 72px; }
        .vt-features__inner { max-width: 1280px; margin: 0 auto; }
        .vt-features__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .vt-card {
          background: var(--bg-soft); border: 1px solid var(--line);
          border-radius: var(--radius); padding: 24px 22px;
          transition: transform .2s, border-color .2s;
        }
        .vt-card:hover { transform: translateY(-4px); border-color: rgba(255,79,43,.3); }
        .vt-card__icon { font-size: 22px; margin-bottom: 12px; }
        .vt-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 9px; }
        .vt-card p { font-size: 13.5px; line-height: 1.65; color: var(--text-dim); }

        /* ── BRANCHES STRIP ── */
        .vt-branches-strip { padding: 0 32px 80px; }
        .vt-branches-strip__inner {
          max-width: 1280px; margin: 0 auto;
          background: var(--bg-soft); border: 1px solid var(--line);
          border-radius: 16px; padding: 36px 40px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .vt-branches-strip__list { display: flex; flex-wrap: wrap; gap: 10px; }
        .vt-branch-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 16px; border-radius: 9px;
          background: var(--bg-elevated); border: 1px solid var(--line);
          font-size: 13.5px; font-weight: 500; color: var(--text-dim);
          transition: border-color .2s, color .2s;
        }
        .vt-branch-pill:hover { border-color: var(--steel); color: var(--text); }
        .vt-branch-pill__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--steel); flex-shrink: 0; }
        .vt-branch-pill__arrow { color: var(--text-dim); margin-left: 4px; font-size: 14px; }

        /* ── FOOTER ── */
        .vt-footer { border-top: 1px solid var(--line); background: var(--bg-soft); padding: 56px 32px 32px; }
        .vt-footer__inner { max-width: 1280px; margin: 0 auto; }
        .vt-footer__top {
          display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
          gap: 40px; margin-bottom: 48px;
        }
        .vt-footer__brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .vt-footer__tagline { font-size: 14px; color: var(--text-dim); line-height: 1.6; margin-bottom: 20px; }
        .vt-footer__socials { display: flex; gap: 10px; }
        .vt-social {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 9px;
          background: var(--bg-elevated); border: 1px solid var(--line);
          color: var(--text-dim); transition: border-color .2s, color .2s;
        }
        .vt-social:hover { color: var(--text); border-color: var(--steel); }
        .vt-footer__col { display: flex; flex-direction: column; gap: 2px; }
        .vt-footer__col-title {
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px;
        }
        .vt-footer__link {
          display: flex; align-items: center; gap: 6px;
          font-size: 13.5px; color: var(--text-dim); padding: 5px 0;
          transition: color .15s;
        }
        .vt-footer__link:hover { color: var(--text); }
        .vt-footer__link--accent { color: var(--steel); margin-top: 4px; }
        .vt-footer__link--accent:hover { color: var(--text); }
        .vt-footer__contact { font-size: 13.5px; color: var(--text-dim); margin-bottom: 4px; line-height: 1.6; }
        .vt-footer__contact-link { color: var(--text); font-weight: 600; }
        .vt-footer__contact-link:hover { color: var(--accent); }
        .vt-footer__bottom {
          display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid var(--line); padding-top: 24px; gap: 16px; flex-wrap: wrap;
        }
        .vt-footer__copy { font-size: 13px; color: var(--text-dim); }
        .vt-footer__bottom-links { display: flex; gap: 20px; }
        .vt-footer__bottom-link { font-size: 13px; color: var(--text-dim); transition: color .15s; }
        .vt-footer__bottom-link:hover { color: var(--text); }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .vt-equipment__grid { grid-template-columns: repeat(2, 1fr); }
          .vt-footer__top { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 900px) {
          .vt-nav--desktop { display: none; }
          .vt-user--desktop { display: none; }
          .vt-burger { display: flex; }
          .vt-features__grid { grid-template-columns: 1fr 1fr; }
          .vt-gallery__grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 200px 200px 200px;
          }
          .vt-gallery__item--wide { grid-column: 1 / 3; grid-row: 1 / 2; }

          /* Mobile drawer — only displayed on small screens */
          .vt-mobile {
            display: flex; flex-direction: column;
            position: fixed; top: 0; right: 0; height: 100vh;
            width: 82%; max-width: 320px;
            background: var(--bg-soft); border-left: 1px solid var(--line);
            transform: translateX(100%); transition: transform .28s ease;
            z-index: 200; padding: 20px 18px; overflow-y: auto;
          }
          .vt-mobile--open { transform: translateX(0); }
          .vt-mobile__backdrop {
            display: block;
            position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 150;
          }
          .vt-mobile__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .vt-mobile__user {
            display: flex; align-items: center; gap: 10px;
            padding: 14px 0; border-bottom: 1px solid var(--line); margin-bottom: 8px;
          }
          .vt-nav--mobile { display: flex; flex-direction: column; gap: 0; flex: 1; }
          .vt-nav--mobile .vt-nav__link {
            display: block; padding: 13px 4px; border-bottom: 1px solid var(--line);
            font-size: 15px; color: var(--text-dim); background: none;
          }
          .vt-nav--mobile .vt-nav__link:hover { color: var(--text); background: none; }
          .vt-mobile__branches { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
          .vt-mobile__section-label { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; }
          .vt-mobile__branch-item {
            display: flex; align-items: center; gap: 8px;
            padding: 10px 0; font-size: 14px; color: var(--text-dim);
            border-bottom: 1px solid var(--line);
          }
          .vt-mobile__branch-item:hover { color: var(--text); }
          .vt-mobile__footer { margin-top: 20px; }
        }
        @media (max-width: 700px) {
          .vt-header__inner { padding: 0 18px; }
          .vt-statsbar { grid-template-columns: repeat(2, 1fr); }
          .vt-statsbar__item:nth-child(2) { border-right: none; }
          .vt-statsbar__item:nth-child(1),
          .vt-statsbar__item:nth-child(2) { border-bottom: 1px solid var(--line); }
          .vt-hero__inner { padding: 80px 20px 60px; }
          .vt-gallery { padding: 48px 18px; }
          .vt-equipment { padding: 0 18px 56px; }
          .vt-equipment__grid { grid-template-columns: 1fr 1fr; }
          .vt-traffic { padding: 0 18px 56px; }
          .vt-features { padding: 0 18px 56px; }
          .vt-features__grid { grid-template-columns: 1fr; }
          .vt-branches-strip { padding: 0 18px 56px; }
          .vt-branches-strip__inner { padding: 24px 22px; }
          .vt-footer { padding: 40px 18px 24px; }
          .vt-footer__top { grid-template-columns: 1fr; gap: 28px; }
          .vt-gallery__grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }
          .vt-gallery__item { height: 200px; }
          .vt-gallery__item--wide { grid-column: auto; grid-row: auto; }
          .vt-chart__bars { gap: 8px; }
        }
      `}</style>
        </div>
    );
}