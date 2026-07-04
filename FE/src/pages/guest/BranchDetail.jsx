import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Footer from "../../component/Footer"; // chỉnh lại path cho đúng project của bạn
import Header from "../../component/Header"; // chỉnh lại path cho đúng project của bạn

/* ─── Design tokens (đồng bộ với BranchList) ─── */
const C = {
    bg: "#0d0d0d",
    surface: "#1b1b1b",
    border: "rgba(255,255,255,0.08)",
    accent: "#ff4d1c",
    accentDark: "#c23200",
    text: "#f3f3f0",
    muted: "#a3a39a",
    subtle: "#6b6b64",
    green: "#4ade80",
};

/* ─── Mock fetch — thay bằng API: GET /api/branches/{id} ───
   Field map theo model BE.Models.Branch + BranchImage:
   branchId, branchName, address, phone, managerId, status, createdAt,
   manager {fullName}, branchImages [{imageId, imageUrl, caption}] */
const MOCK_DETAILS = {
    1: {
        branchId: 1,
        branchName: "VTGYM Quận 1",
        address: "12 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",
        phone: "028 3822 1234",
        managerId: 101,
        manager: { fullName: "Nguyễn Văn An" },
        status: "Active",
        createdAt: "2022-03-14T00:00:00",
        lat: 10.7745,
        lng: 106.7032,
        branchImages: [
            { imageId: 1, imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80", caption: "Khu vực tạ tự do" },
            { imageId: 2, imageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80", caption: "Khu cardio" },
            { imageId: 3, imageUrl: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=900&q=80", caption: "Sảnh chính" },
        ],
    },
};

function useBreakpoint() {
    const [bp, setBp] = useState(() => getBp());
    function getBp() {
        const w = window.innerWidth;
        if (w < 520) return "mobile";
        if (w < 900) return "tablet";
        return "desktop";
    }
    useEffect(() => {
        const onResize = () => setBp(getBp());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return bp;
}

function gmapsUrl(branch) {
    if (branch.lat && branch.lng) {
        return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`;
}

function gmapsEmbed(branch) {
    if (branch.lat && branch.lng) return `https://maps.google.com/maps?q=${branch.lat},${branch.lng}&z=15&output=embed`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(branch.address)}&z=15&output=embed`;
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStyles(bp) {
    const isMobile = bp === "mobile";
    const isTablet = bp !== "desktop";
    return {
        page: {
            minHeight: "100vh",
            background: `radial-gradient(1100px 560px at 8% -8%, #1a1a1a 0%, ${C.bg} 55%)`,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        },
        container: { maxWidth: "1180px", margin: "0 auto", padding: isMobile ? "24px 16px 56px" : "40px 28px 72px" },
        backLink: {
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: C.muted,
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginBottom: "20px",
            fontFamily: "inherit",
        },
        heroRow: {
            display: "flex",
            flexDirection: isTablet ? "column" : "row",
            gap: isMobile ? "16px" : "24px",
            alignItems: isTablet ? "flex-start" : "center",
            justifyContent: "space-between",
            marginBottom: isMobile ? "22px" : "30px",
        },
        titleBlock: { display: "flex", flexDirection: "column", gap: "10px" },
        statusChip: (active) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            alignSelf: "flex-start",
            background: active ? "rgba(74,222,128,0.14)" : "rgba(163,163,154,0.14)",
            color: active ? C.green : C.muted,
            border: `1px solid ${active ? "rgba(74,222,128,0.35)" : "rgba(163,163,154,0.3)"}`,
            fontSize: "11px",
            fontWeight: 800,
            padding: "5px 12px",
            borderRadius: "20px",
            letterSpacing: "0.3px",
        }),
        dot: (active) => ({ width: "6px", height: "6px", borderRadius: "50%", background: active ? C.green : C.muted }),
        heading: { fontSize: isMobile ? "24px" : "32px", fontWeight: 900, color: C.text, margin: 0, textTransform: "uppercase", letterSpacing: "-0.4px" },
        metaLine: { fontSize: "13px", color: C.subtle, margin: 0 },
        heroActions: { display: "flex", gap: "10px", flexShrink: 0 },
        primaryBtn: {
            padding: "12px 20px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            color: "#0d0d0d",
            border: "none",
            borderRadius: "11px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            textDecoration: "none",
            boxShadow: "0 8px 20px rgba(255,77,28,0.3)",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
        },
        secondaryBtn: {
            padding: "12px 20px",
            background: "none",
            color: C.text,
            border: `1.5px solid ${C.border}`,
            borderRadius: "11px",
            fontSize: "13.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            textDecoration: "none",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
        },
        layout: { display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1.3fr 1fr", gap: isMobile ? "18px" : "26px" },
        col: { display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "20px" },
        panel: {
            background: "linear-gradient(180deg, #181818 0%, #131313 100%)",
            border: `1px solid ${C.border}`,
            borderRadius: "18px",
            padding: isMobile ? "18px" : "24px",
            boxShadow: "0 18px 44px rgba(0,0,0,0.4)",
        },
        panelTitle: { fontSize: "13px", fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 16px" },
        galleryMain: { width: "100%", height: isMobile ? "220px" : "320px", borderRadius: "14px", objectFit: "cover", display: "block", border: `1px solid ${C.border}` },
        galleryCaption: { fontSize: "12.5px", color: C.muted, marginTop: "10px" },
        thumbRow: { display: "flex", gap: "8px", marginTop: "10px", overflowX: "auto" },
        thumb: (active) => ({
            width: "64px",
            height: "48px",
            borderRadius: "8px",
            objectFit: "cover",
            cursor: "pointer",
            flexShrink: 0,
            border: `2px solid ${active ? C.accent : "transparent"}`,
            opacity: active ? 1 : 0.6,
            transition: "opacity 0.15s ease",
        }),
        infoGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "16px" },
        infoItem: { display: "flex", flexDirection: "column", gap: "4px" },
        infoLabel: { fontSize: "11px", fontWeight: 700, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.5px" },
        infoValue: { fontSize: "14px", color: C.text, fontWeight: 600, lineHeight: 1.5 },
        mapFrame: { width: "100%", height: isMobile ? "200px" : "240px", border: 0, borderRadius: "14px", display: "block", filter: "grayscale(0.4) contrast(1.1) brightness(0.85)" },
        notFound: { color: C.muted, textAlign: "center", padding: "80px 20px", fontSize: "14px" },
    };
}

function BranchDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const bp = useBreakpoint();
    const S = getStyles(bp);

    // Ưu tiên data truyền qua state (từ list), fallback mock theo id — sau này thay bằng fetch API thật
    const passedBranch = location.state?.branch;
    const branch = MOCK_DETAILS[id] || passedBranch;

    const [activeImg, setActiveImg] = useState(0);

    if (!branch) {
        return (
            <div style={S.page}>
                <Header active="branch" />
                <div style={S.container}>
                    <p style={S.notFound}>Không tìm thấy chi nhánh.</p>
                </div>
                <Footer />
            </div>
        );
    }

    const images = branch.branchImages || [];
    const isActive = branch.status === "Active";

    return (
        <div style={S.page}>
            <Header active="branch" />

            <div style={S.container}>
                <button style={S.backLink} onClick={() => navigate(-1)}>
                    ← Quay lại danh sách
                </button>

                <div style={S.heroRow}>
                    <div style={S.titleBlock}>
                        <span style={S.statusChip(isActive)}>
                            <span style={S.dot(isActive)} />
                            {isActive ? "Đang hoạt động" : "Tạm đóng"}
                        </span>
                        <h1 style={S.heading}>{branch.branchName}</h1>
                        <p style={S.metaLine}>Hoạt động từ {formatDate(branch.createdAt)}</p>
                    </div>

                    <div style={S.heroActions}>
                        {branch.phone && (
                            <a href={`tel:${branch.phone.replace(/\s/g, "")}`} style={S.secondaryBtn}>
                                📞 {branch.phone}
                            </a>
                        )}
                        <a href={gmapsUrl(branch)} target="_blank" rel="noopener noreferrer" style={S.primaryBtn}>
                            🗺️ Chỉ đường
                        </a>
                    </div>
                </div>

                <div style={S.layout}>
                    {/* Cột trái: gallery + info */}
                    <div style={S.col}>
                        {images.length > 0 && (
                            <div style={S.panel}>
                                <h2 style={S.panelTitle}>Hình ảnh chi nhánh</h2>
                                <img src={images[activeImg].imageUrl} alt={images[activeImg].caption || branch.branchName} style={S.galleryMain} />
                                {images[activeImg].caption && <p style={S.galleryCaption}>{images[activeImg].caption}</p>}
                                {images.length > 1 && (
                                    <div style={S.thumbRow}>
                                        {images.map((img, i) => (
                                            <img
                                                key={img.imageId}
                                                src={img.imageUrl}
                                                alt={img.caption || `Ảnh ${i + 1}`}
                                                style={S.thumb(i === activeImg)}
                                                onClick={() => setActiveImg(i)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={S.panel}>
                            <h2 style={S.panelTitle}>Thông tin chi nhánh</h2>
                            <div style={S.infoGrid}>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Mã chi nhánh</span>
                                    <span style={S.infoValue}>#{branch.branchId}</span>
                                </div>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Trạng thái</span>
                                    <span style={S.infoValue}>{isActive ? "Đang hoạt động" : "Tạm đóng"}</span>
                                </div>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Địa chỉ</span>
                                    <span style={S.infoValue}>{branch.address}</span>
                                </div>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Số điện thoại</span>
                                    <span style={S.infoValue}>{branch.phone || "—"}</span>
                                </div>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Quản lý chi nhánh</span>
                                    <span style={S.infoValue}>{branch.manager?.fullName || `#${branch.managerId}`}</span>
                                </div>
                                <div style={S.infoItem}>
                                    <span style={S.infoLabel}>Ngày tạo</span>
                                    <span style={S.infoValue}>{formatDate(branch.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: bản đồ */}
                    <div style={S.col}>
                        <div style={S.panel}>
                            <h2 style={S.panelTitle}>Vị trí trên bản đồ</h2>
                            <iframe
                                title={`map-detail-${branch.branchId}`}
                                src={gmapsEmbed(branch)}
                                style={S.mapFrame}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                            <a href={gmapsUrl(branch)} target="_blank" rel="noopener noreferrer" style={{ ...S.primaryBtn, width: "100%", justifyContent: "center", marginTop: "14px", boxSizing: "border-box" }}>
                                🗺️ Mở trong Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default BranchDetail;