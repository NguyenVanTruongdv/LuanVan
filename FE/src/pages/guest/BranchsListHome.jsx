import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../component/Footer"; // chỉnh lại path cho đúng project của bạn
import Header from "../../component/Header"; // chỉnh lại path cho đúng project của bạn

/* ─── Design tokens — phẳng, tối giản, đồng bộ pricing card ─── */
const C = {
  bg: "#0d0d0d",
  card: "#121212",
  border: "#262626",
  borderActive: "#ff4d1c",
  accent: "#ff4d1c",
  text: "#f3f3f0",
  muted: "#9a9a92",
  subtle: "#6b6b64",
  green: "#4ade80",
};

/* ─── Mock branches (sau này thay bằng API: GET /api/branches) ─── */
const BRANCHES = [
  { branchId: 1, branchName: "VTGYM Quận 1", address: "12 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM", phone: "028 3822 1234", status: "Active", lat: 10.7745, lng: 106.7032 },
  { branchId: 2, branchName: "VTGYM Quận 7", address: "88 Nguyễn Thị Thập, Tân Phú, Quận 7, TP.HCM", phone: "028 3771 5678", status: "Active", lat: 10.7329, lng: 106.7218 },
  { branchId: 3, branchName: "VTGYM Bình Thạnh", address: "245 Điện Biên Phủ, Bình Thạnh, TP.HCM", phone: "028 3514 9090", status: "Active", lat: 10.8033, lng: 106.7128 },
  { branchId: 4, branchName: "VTGYM Tân Bình", address: "56 Cộng Hòa, Tân Bình, TP.HCM", phone: "028 3948 1122", status: "Inactive", lat: 10.8011, lng: 106.6528 },
  { branchId: 5, branchName: "VTGYM Thủ Đức", address: "120 Võ Văn Ngân, Thủ Đức, TP.HCM", phone: "028 3722 3344", status: "Active", lat: 10.8494, lng: 106.7717 },
];

/* ─── Responsive helpers ─── */
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

function getStyles(bp) {
  const isMobile = bp === "mobile";
  const isTablet = bp !== "desktop";
  return {
    page: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif" },
    container: { maxWidth: "1180px", margin: "0 auto", padding: isMobile ? "28px 16px 56px" : "48px 28px 72px" },
    header: { marginBottom: isMobile ? "24px" : "34px", textAlign: isMobile ? "left" : "center" },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      background: "rgba(255,77,28,0.08)",
      color: C.accent,
      fontSize: "11px",
      fontWeight: 800,
      letterSpacing: "1.2px",
      padding: "6px 14px",
      borderRadius: "20px",
      marginBottom: "16px",
      border: "1px solid rgba(255,77,28,0.25)",
      textTransform: "uppercase",
    },
    badgeDot: { width: "6px", height: "6px", background: C.accent, borderRadius: "50%", display: "inline-block" },
    heading: {
      fontSize: isMobile ? "26px" : "34px",
      fontWeight: 900,
      color: C.text,
      margin: "0 0 10px",
      lineHeight: 1.15,
      letterSpacing: "-0.4px",
      textTransform: "uppercase",
    },
    accentWord: { color: C.accent },
    subheading: {
      fontSize: isMobile ? "13.5px" : "14.5px",
      color: C.muted,
      margin: isMobile ? 0 : "0 auto",
      lineHeight: 1.6,
      maxWidth: "520px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isTablet ? "1fr" : "repeat(3, 1fr)",
      gap: isMobile ? "16px" : "20px",
      alignItems: "start",
    },
  };
}

function getCardStyles(bp) {
  const isMobile = bp === "mobile";
  return {
    card: {
      background: C.card,
      borderRadius: "16px",
      border: `1px solid ${C.border}`,
      padding: isMobile ? "24px 20px" : "28px 26px",
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      position: "relative",
      transition: "border-color 0.2s ease",
    },
    statusChip: (active) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      alignSelf: "flex-start",
      fontSize: "11px",
      fontWeight: 700,
      color: active ? C.green : C.subtle,
    }),
    dot: (active) => ({ width: "6px", height: "6px", borderRadius: "50%", background: active ? C.green : C.subtle }),
    branchName: { fontSize: "19px", fontWeight: 800, color: C.text, margin: 0, textTransform: "uppercase", letterSpacing: "0.3px" },
    address: { fontSize: "13.5px", color: C.muted, lineHeight: 1.6, margin: 0 },
    divider: { height: "1px", background: C.border, border: "none", margin: 0 },
    infoList: { display: "flex", flexDirection: "column", gap: "11px", margin: 0, padding: 0, listStyle: "none" },
    infoRow: { display: "flex", alignItems: "flex-start", gap: "9px", fontSize: "13.5px", color: C.text },
    check: { color: "#36c5f0", fontWeight: 700, flexShrink: 0, lineHeight: 1.5 },
    actions: { display: "flex", flexDirection: "column", gap: "9px", marginTop: "4px" },
    detailBtn: {
      width: "100%",
      padding: "13px",
      background: "#1f1f1f",
      color: C.text,
      border: `1px solid ${C.border}`,
      borderRadius: "10px",
      fontSize: "13.5px",
      fontWeight: 800,
      cursor: "pointer",
      textAlign: "center",
      fontFamily: "inherit",
      boxSizing: "border-box",
      transition: "border-color 0.2s ease, color 0.2s ease",
    },
    mapLink: {
      width: "100%",
      padding: "13px",
      background: "none",
      color: C.muted,
      border: `1px solid ${C.border}`,
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
      textAlign: "center",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
  };
}

/* ─── Branch Card ─── */
function BranchCard({ branch, bp }) {
  const S = getCardStyles(bp);
  const navigate = useNavigate();
  const isActive = branch.status === "Active";

  return (
    <div
      style={S.card}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderActive)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
    >
      <span style={S.statusChip(isActive)}>
        <span style={S.dot(isActive)} />
        {isActive ? "Đang hoạt động" : "Tạm đóng"}
      </span>

      <div>
        <h3 style={S.branchName}>{branch.branchName}</h3>
        <p style={S.address}>{branch.address}</p>
      </div>

      <hr style={S.divider} />

      <ul style={S.infoList}>
        <li style={S.infoRow}>
          <span style={S.check}>✓</span>
          <span>{branch.phone || "Chưa cập nhật số điện thoại"}</span>
        </li>
        <li style={S.infoRow}>
          <span style={S.check}>✓</span>
          <span>Sử dụng chung cho tất cả hội viên VTGYM</span>
        </li>
        <li style={S.infoRow}>
          <span style={S.check}>✓</span>
          <span>Tự do giờ tập 24/7</span>
        </li>
      </ul>

      <div style={S.actions}>
        <button
          style={S.detailBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.borderActive;
            e.currentTarget.style.color = C.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.text;
          }}
          onClick={() => navigate(`/branch/${branch.branchId}`, { state: { branch } })}
        >
          Xem chi tiết
        </button>
        <a
          href={gmapsUrl(branch)}
          target="_blank"
          rel="noopener noreferrer"
          style={S.mapLink}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderActive)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          Chỉ đường
        </a>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
function BranchListHome() {
  const bp = useBreakpoint();
  const S = getStyles(bp);

  return (
    <div style={S.page}>
      <Header />

      <div style={S.container}>
        <div style={S.header}>
          <div style={S.badge}>
            <span style={S.badgeDot} /> Hệ thống chi nhánh
          </div>
          <h1 style={S.heading}>
            Danh sách <span style={S.accentWord}>chi nhánh</span> VTGYM
          </h1>
          <p style={S.subheading}>
            Chọn chi nhánh gần bạn nhất để xem địa chỉ, trạng thái hoạt động và thông tin chi tiết.
          </p>
        </div>

        <div style={S.grid}>
          {BRANCHES.map((b) => (
            <BranchCard key={b.branchId} branch={b} bp={bp} />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default BranchListHome;