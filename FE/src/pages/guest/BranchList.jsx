import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ─── Design tokens (đồng bộ với trang đăng ký) ─── */
const C = {
  bg: "#0c1520",
  card: "#13202f",
  surface: "#162030",
  border: "rgba(255,255,255,0.08)",
  accent: "#00c2cb",
  accentDark: "#007b9e",
  text: "#e0eaf2",
  muted: "#5a7a94",
  subtle: "#3d5a72",
  dim: "#2d4459",
};

/* ─── Mock branches (sau này thay bằng API: GET /api/branches) ─── */
const BRANCHES = [
  {
    id: "q1",
    name: "VTGYM Quận 1",
    address: "12 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",
    phone: "028 3822 1234",
    hours: "05:00 - 22:00 (Hằng ngày)",
    lat: 10.7745,
    lng: 106.7032,
  },
  {
    id: "q7",
    name: "VTGYM Quận 7",
    address: "88 Nguyễn Thị Thập, Tân Phú, Quận 7, TP.HCM",
    phone: "028 3771 5678",
    hours: "05:00 - 22:00 (Hằng ngày)",
    lat: 10.7329,
    lng: 106.7218,
  },
  {
    id: "binh-thanh",
    name: "VTGYM Bình Thạnh",
    address: "245 Điện Biên Phủ, Bình Thạnh, TP.HCM",
    phone: "028 3514 9090",
    hours: "05:00 - 22:00 (Hằng ngày)",
    lat: 10.8033,
    lng: 106.7128,
  },
  {
    id: "tan-binh",
    name: "VTGYM Tân Bình",
    address: "56 Cộng Hòa, Tân Bình, TP.HCM",
    phone: "028 3948 1122",
    hours: "05:00 - 22:00 (Hằng ngày)",
    lat: 10.8011,
    lng: 106.6528,
  },
  {
    id: "thu-duc",
    name: "VTGYM Thủ Đức",
    address: "120 Võ Văn Ngân, Thủ Đức, TP.HCM",
    phone: "028 3722 3344",
    hours: "05:00 - 22:00 (Hằng ngày)",
    lat: 10.8494,
    lng: 106.7717,
  },
];

/* ─── Responsive helper ─── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 860);
  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth < 860);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isTablet;
}

function getStyles(isMobile, isTablet) {
  return {
    page: {
      minHeight: "100vh",
      background: C.bg,
      padding: isMobile ? "16px 12px 40px" : "32px 24px 56px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
      maxWidth: "1100px",
      margin: "0 auto 24px",
    },
    backBtn: {
      background: "none",
      border: "none",
      color: C.muted,
      fontSize: "13px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "0 0 16px",
      fontWeight: "600",
      fontFamily: "inherit",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "rgba(0,194,203,0.1)",
      color: C.accent,
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.8px",
      padding: "5px 12px",
      borderRadius: "20px",
      marginBottom: "14px",
      border: `1px solid rgba(0,194,203,0.2)`,
    },
    badgeDot: {
      width: "6px",
      height: "6px",
      background: C.accent,
      borderRadius: "50%",
      display: "inline-block",
    },
    heading: {
      fontSize: isMobile ? "24px" : "30px",
      fontWeight: "800",
      color: C.text,
      margin: "0 0 8px",
      lineHeight: 1.2,
      letterSpacing: "-0.3px",
    },
    subheading: {
      fontSize: isMobile ? "13px" : "14px",
      color: C.muted,
      margin: 0,
      lineHeight: 1.5,
      maxWidth: "560px",
    },
    grid: {
      maxWidth: "1100px",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: isTablet ? "1fr" : "repeat(2, 1fr)",
      gap: isMobile ? "14px" : "20px",
    },
    card: {
      background: C.card,
      borderRadius: isMobile ? "16px" : "18px",
      border: `1px solid ${C.border}`,
      overflow: "hidden",
      boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
      display: "flex",
      flexDirection: "column",
    },
    mapWrap: {
      width: "100%",
      height: isMobile ? "160px" : "190px",
      background: C.surface,
      position: "relative",
    },
    mapIframe: {
      width: "100%",
      height: "100%",
      border: 0,
      display: "block",
      filter: "grayscale(0.15) contrast(1.05)",
    },
    body: {
      padding: isMobile ? "16px 18px 18px" : "18px 22px 22px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    nameRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    pin: {
      width: "34px",
      height: "34px",
      flexShrink: 0,
      borderRadius: "10px",
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      boxShadow: "0 6px 16px rgba(0,194,203,0.3)",
    },
    branchName: {
      fontSize: isMobile ? "16px" : "17px",
      fontWeight: "800",
      color: C.text,
      margin: 0,
    },
    infoLine: {
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      fontSize: "13px",
      color: C.muted,
      lineHeight: 1.5,
    },
    infoIcon: { flexShrink: 0, color: C.subtle, fontSize: "13px", marginTop: "1px" },
    actions: {
      display: "flex",
      gap: "10px",
      marginTop: "6px",
    },
    mapBtn: {
      flex: 1,
      padding: isMobile ? "11px" : "12px",
      background: C.accent,
      color: C.bg,
      border: "none",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: "800",
      letterSpacing: "0.3px",
      cursor: "pointer",
      textAlign: "center",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      boxShadow: "0 6px 18px rgba(0,194,203,0.3)",
      fontFamily: "inherit",
    },
    callBtn: {
      flex: 1,
      padding: isMobile ? "11px" : "12px",
      background: "none",
      color: C.muted,
      border: `1.5px solid ${C.border}`,
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
      textAlign: "center",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      fontFamily: "inherit",
    },
    registerBtn: {
      display: "block",
      margin: "28px auto 0",
      padding: isMobile ? "13px 20px" : "14px 28px",
      background: C.accent,
      color: C.bg,
      border: "none",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "800",
      letterSpacing: "0.4px",
      cursor: "pointer",
      boxShadow: "0 6px 20px rgba(0,194,203,0.35)",
      fontFamily: "inherit",
    },
    footerWrap: { maxWidth: "1100px", margin: "0 auto", textAlign: "center" },
  };
}

/* ─── Branch Card ─── */
function BranchCard({ branch, isMobile }) {
  const S = getStyles(isMobile, false);

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
  const embedUrl = `https://maps.google.com/maps?q=${branch.lat},${branch.lng}&z=15&output=embed`;
  const telHref = `tel:${branch.phone.replace(/\s/g, "")}`;

  return (
    <div style={S.card}>
      <div style={S.mapWrap}>
        <iframe
          title={`map-${branch.id}`}
          src={embedUrl}
          style={S.mapIframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div style={S.body}>
        <div style={S.nameRow}>
          <span style={S.pin}>📍</span>
          <h3 style={S.branchName}>{branch.name}</h3>
        </div>
        <div style={S.infoLine}>
          <span style={S.infoIcon}>🏠</span>
          <span>{branch.address}</span>
        </div>
        <div style={S.infoLine}>
          <span style={S.infoIcon}>🕒</span>
          <span>{branch.hours}</span>
        </div>
        <div style={S.infoLine}>
          <span style={S.infoIcon}>📞</span>
          <span>{branch.phone}</span>
        </div>
        <div style={S.actions}>
          <a href={telHref} style={S.callBtn}>📞 Gọi ngay</a>
          <a
            href={mapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={S.mapBtn}
          >
            🗺 Mở Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
function BranchList() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const S = getStyles(isMobile, isTablet);
  const navigate = useNavigate();
  const location = useLocation();

  // Thông tin người dùng đã nhập ở trang đăng ký (nếu có), truyền qua khi điều hướng tới đây
  const formData = location.state?.formData;

  const goBackToRegister = () => {
    navigate("/member/register", { state: { formData } });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={goBackToRegister}>
          ← Quay lại
        </button>
        <div style={S.badge}><span style={S.badgeDot} /> HỆ THỐNG CHI NHÁNH</div>
        <h1 style={S.heading}>Danh sách chi nhánh VTGYM 🏋️</h1>
        <p style={S.subheading}>
          Chọn chi nhánh gần bạn nhất để xem địa chỉ, giờ hoạt động và chỉ đường nhanh trên Google Maps.
        </p>
      </div>

      <div style={S.grid}>
        {BRANCHES.map((b) => (
          <BranchCard key={b.id} branch={b} isMobile={isMobile} />
        ))}
      </div>

      <div style={S.footerWrap}>
        <button
          style={S.registerBtn}
          onClick={goBackToRegister}
        >
          ← Quay lại đăng ký
        </button>
      </div>
    </div>
  );
}

export default BranchList;