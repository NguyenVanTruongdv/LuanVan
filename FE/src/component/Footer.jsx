import logo from "../assets/logo.png";

const BRANCHES = [
    { id: "q1", name: "VTGym Quận 1", address: "123 Nguyễn Huệ, Q.1, TP.HCM", href: "/chi-nhanh/q1" },
    { id: "q7", name: "VTGym Quận 7", address: "456 Nguyễn Thị Thập, Q.7, TP.HCM", href: "/chi-nhanh/q7" },
    { id: "bth", name: "VTGym Bình Thạnh", address: "78 Xô Viết Nghệ Tĩnh, Q.BT, TP.HCM", href: "/chi-nhanh/binh-thanh" },
    { id: "td", name: "VTGym Thủ Đức", address: "321 Võ Văn Ngân, TP.Thủ Đức", href: "/chi-nhanh/thu-duc" },
];

function LocationIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

export default function Footer() {
    return (
        <>
            <style>{`
                /* ── FOOTER ── */
                .vt-footer {
                    border-top: 1px solid var(--line);
                    background: var(--bg-soft);
                    padding: 56px 32px 32px;
                }
                .vt-footer__inner { max-width: 1280px; margin: 0 auto; }
                .vt-footer__top {
                    display: grid;
                    grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
                    gap: 40px;
                    margin-bottom: 48px;
                }

                /* FIX: brand col thiếu layout + logo không bị giới hạn kích thước
                   khiến ảnh logo render theo size gốc (rất lớn), phá vỡ toàn bộ grid */
                .vt-footer__brand-col { display: flex; flex-direction: column; min-width: 0; }
                .vt-logo__img { height: 34px; width: auto; display: block; }

                .vt-footer__brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
                .vt-footer__tagline { font-size: 14px; color: var(--text-dim); line-height: 1.6; margin-bottom: 20px; }
                .vt-footer__socials { display: flex; gap: 10px; }
                .vt-social {
                    display: flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 9px;
                    background: var(--bg-elevated); border: 1px solid var(--line);
                    color: var(--text-dim); transition: border-color .2s, color .2s;
                    flex-shrink: 0;
                }
                .vt-social:hover { color: var(--text); border-color: var(--steel); }
                .vt-footer__col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
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
                    border-top: 1px solid var(--line); padding-top: 24px;
                    gap: 16px; flex-wrap: wrap;
                }
                .vt-footer__copy { font-size: 13px; color: var(--text-dim); }
                .vt-footer__bottom-links { display: flex; gap: 20px; }
                .vt-footer__bottom-link { font-size: 13px; color: var(--text-dim); transition: color .15s; }
                .vt-footer__bottom-link:hover { color: var(--text); }

                /* ── RESPONSIVE — FOOTER ── */
                @media (max-width: 1024px) {
                    .vt-footer__top { grid-template-columns: 1fr 1fr; gap: 32px; }
                }
                @media (max-width: 700px) {
                    .vt-footer { padding: 40px 18px 24px; }
                    .vt-footer__top { grid-template-columns: 1fr; gap: 28px; }
                }
            `}</style>

            <footer className="vt-footer">
                <div className="vt-footer__inner">
                    <div className="vt-footer__top">
                        {/* Brand col */}
                        <div className="vt-footer__brand-col">
                            <div className="vt-footer__brand">
                                <img src={logo} alt="VTGym" className="vt-logo__img" />
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
        </>
    );
}