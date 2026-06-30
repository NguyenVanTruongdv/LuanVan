import { CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell, LogIn, LogOut, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Footer from "../../component/Footer";
import Header from "../../component/Header";

// ============ DỮ LIỆU MẪU ============

const DAYS = [
  { key: "T2", label: "Thứ 2" },
  { key: "T3", label: "Thứ 3" },
  { key: "T4", label: "Thứ 4" },
  { key: "T5", label: "Thứ 5" },
  { key: "T6", label: "Thứ 6" },
  { key: "T7", label: "Thứ 7" },
  { key: "CN", label: "Chủ nhật" },
];

const HOURLY_SLOTS = Array.from({ length: 24 }, (_, h) => {
  const start = String(h).padStart(2, "0");
  const end = String((h + 1) % 24).padStart(2, "0");
  return `${start}:00-${end}:00`;
});

const SLOTS_PER_VIEW = 6;

function genMockSlotData() {
  const data = {};
  DAYS.forEach((d) => {
    data[d.key] = HOURLY_SLOTS.map((s, h) => {
      let base = 3;
      if (h >= 6 && h <= 7) base = 18;
      if (h >= 17 && h <= 20) base = 22;
      if (h >= 11 && h <= 13) base = 8;
      if (h >= 0 && h <= 5) base = 1;
      const weekendBoost = d.key === "T7" || d.key === "CN" ? 5 : 0;
      const noise = ((d.key.charCodeAt(0) + h * 3) % 7) - 3;
      return { slot: s, luot: Math.max(0, base + weekendBoost + noise) };
    });
  });
  return data;
}

const mockSlotData = genMockSlotData();

const myHistory = [
  { id: 1, date: "30/06/2026", checkIn: "06:12", checkOut: "07:45", duration: "1h 33m" },
  { id: 2, date: "28/06/2026", checkIn: "18:05", checkOut: "19:30", duration: "1h 25m" },
  { id: 3, date: "26/06/2026", checkIn: "17:50", checkOut: null, duration: null },
  { id: 4, date: "24/06/2026", checkIn: "06:30", checkOut: "08:00", duration: "1h 30m" },
  { id: 5, date: "22/06/2026", checkIn: "19:00", checkOut: "20:20", duration: "1h 20m" },
  { id: 6, date: "20/06/2026", checkIn: "06:00", checkOut: "07:10", duration: "1h 10m" },
  { id: 7, date: "18/06/2026", checkIn: "17:30", checkOut: "19:00", duration: "1h 30m" },
  { id: 8, date: "16/06/2026", checkIn: "06:15", checkOut: "07:50", duration: "1h 35m" },
  { id: 9, date: "14/06/2026", checkIn: "18:30", checkOut: "20:00", duration: "1h 30m" },
  { id: 10, date: "12/06/2026", checkIn: "06:00", checkOut: "07:30", duration: "1h 30m" },
];

// ============ STAT CARD ============

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${accent}1a`, border: `1px solid ${accent}33`, color: accent }}>
        {icon}
      </div>
      <div>
        <div style={styles.statValue}>
          {value}
          {sub && <span style={styles.statSub}> · {sub}</span>}
        </div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ============ CUSTOM TOOLTIP ============

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={styles.tooltip}>
      <div style={{ color: "#9a9aa2", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
        {payload[0].value} <span style={{ color: "#9a9aa2", fontWeight: 400, fontSize: 12 }}>người</span>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function ThongKe() {
  const [activeDay, setActiveDay] = useState("T2");
  const [viewStart, setViewStart] = useState(0);

  const dayData = mockSlotData[activeDay] || [];
  const chartData = useMemo(() => dayData.slice(viewStart, viewStart + SLOTS_PER_VIEW), [dayData, viewStart]);
  const canPrev = viewStart > 0;
  const canNext = viewStart + SLOTS_PER_VIEW < HOURLY_SLOTS.length;
  const tongLuot = useMemo(() => chartData.reduce((s, d) => s + d.luot, 0), [chartData]);
  const dongNhat = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((max, d) => (d.luot > max.luot ? d : max), chartData[0]);
  }, [chartData]);

  return (
    <div style={styles.page}>
      <Header />

      {/* Page hero strip */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroBadge}>
            <span style={styles.heroDot} />
            THỐNG KÊ PHÒNG TẬP
          </div>
          <h1 style={styles.heroTitle}>Theo dõi lịch tập của bạn</h1>
          <p style={styles.heroSub}>Xem mật độ phòng tập theo giờ và lịch sử check-in của bản thân</p>
        </div>
      </div>

      <main style={styles.main}>

        {/* Summary stats row */}
        <div style={styles.summaryRow} className="summary-row">
          <StatCard icon={<Clock size={18} />} label="Buổi tập tháng này" value="10" accent="#e0622f" />
          <StatCard icon={<Users size={18} />} label="Tổng giờ tập" value="14h 23m" accent="#3d8bfd" />
          <StatCard icon={<LogIn size={18} />} label="Buổi sáng sớm (trước 8h)" value="6" accent="#2fbf71" />
          <StatCard icon={<Dumbbell size={18} />} label="Streak hiện tại" value="3 ngày" accent="#a855f7" />
        </div>

        {/* Day selector */}
        <div style={styles.dayRow}>
          <CalendarDays size={15} color="#9a9aa2" style={{ flexShrink: 0 }} />
          <span style={styles.dayRowLabel}>Tuần này</span>
          <div style={styles.dayTabs}>
            {DAYS.map((d) => (
              <button
                key={d.key}
                onClick={() => { setActiveDay(d.key); setViewStart(0); }}
                style={{ ...styles.dayBtn, ...(activeDay === d.key ? styles.dayBtnActive : {}) }}
              >
                <span style={styles.dayShort} className="day-short">{d.key}</span>
                <span style={styles.dayFull} className="day-full">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart card */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Mật độ phòng tập</h2>
              <p style={styles.cardSub}>{DAYS.find((d) => d.key === activeDay)?.label} · {chartData[0]?.slot.split("-")[0]} – {chartData[chartData.length - 1]?.slot.split("-")[1]}</p>
            </div>
            <div style={styles.navGroup}>
              <button onClick={() => canPrev && setViewStart((v) => Math.max(0, v - SLOTS_PER_VIEW))} disabled={!canPrev}
                style={{ ...styles.navBtn, ...(canPrev ? {} : styles.navBtnDisabled) }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => canNext && setViewStart((v) => Math.min(HOURLY_SLOTS.length - SLOTS_PER_VIEW, v + SLOTS_PER_VIEW))} disabled={!canNext}
                style={{ ...styles.navBtn, ...(canNext ? {} : styles.navBtnDisabled) }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Mini stat pills */}
          <div style={styles.chartPills}>
            <div style={styles.pill}>
              <span style={{ ...styles.pillDot, background: "#3d8bfd" }} />
              Tổng lượt: <strong>{tongLuot}</strong>
            </div>
            {dongNhat && (
              <div style={styles.pill}>
                <span style={{ ...styles.pillDot, background: "#e0622f" }} />
                Đông nhất: <strong>{dongNhat.slot}</strong> · {dongNhat.luot} người
              </div>
            )}
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ left: -10, right: 10, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c21" vertical={false} />
                <XAxis dataKey="slot" stroke="#5b5b62" fontSize={10.5} tickLine={false} axisLine={false} />
                <YAxis stroke="#5b5b62" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(224,98,47,0.06)" }} />
                <Bar dataKey="luot" name="Số người" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={dongNhat && entry.slot === dongNhat.slot ? "#e0622f" : "#3d8bfd"} fillOpacity={dongNhat && entry.slot === dongNhat.slot ? 1 : 0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* History card */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Lịch sử check-in</h2>
              <p style={styles.cardSub}>{myHistory.length} buổi gần nhất</p>
            </div>
            <button style={styles.exportBtn}>Xuất CSV ↓</button>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ngày</th>
                  <th style={styles.th}><span style={styles.thInner}><LogIn size={12} color="#e0622f" /> Check-in</span></th>
                  <th style={styles.th}><span style={styles.thInner}><LogOut size={12} color="#3d8bfd" /> Check-out</span></th>
                  <th style={styles.th}>Thời lượng</th>
                  <th style={styles.th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.map((log, i) => (
                  <tr key={log.id} style={{ ...styles.tr, animationDelay: `${i * 0.04}s` }}>
                    <td style={styles.td}><span style={styles.dateCell}>{log.date}</span></td>
                    <td style={styles.td}><span style={styles.timeChip}>{log.checkIn}</span></td>
                    <td style={styles.td}>
                      {log.checkOut
                        ? <span style={styles.timeChip}>{log.checkOut}</span>
                        : <span style={styles.dash}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {log.duration
                        ? <span style={styles.duration}>{log.duration}</span>
                        : <span style={styles.dash}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {log.checkOut
                        ? <span style={styles.tagDone}>Đã ra</span>
                        : <span style={styles.tagActive}>Đang tập</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <Footer />

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:translateY(0);} }
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0c; }
        .hamburger-btn { display: none; }
        @media (max-width: 768px) {
          .day-short { display: inline !important; }
          .day-full { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .desktop-nav { display: none !important; }
          .desktop-login { display: none !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .summary-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .summary-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ============ STYLES ============

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0c",
    color: "#f2f2f3",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  hero: {
    background: "#0a0a0c",
    borderBottom: "1px solid #1c1c21",
    padding: "48px 24px 40px",
    position: "relative",
    overflow: "hidden",
  },
  heroInner: { maxWidth: 1200, margin: "0 auto", position: "relative" },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 7,
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em",
    color: "#e0622f", textTransform: "uppercase",
    background: "rgba(224,98,47,0.1)", border: "1px solid rgba(224,98,47,0.25)",
    borderRadius: 999, padding: "5px 12px", marginBottom: 14,
  },
  heroDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#e0622f",
    boxShadow: "0 0 8px #e0622f",
    animation: "pulse 2s infinite",
  },
  heroTitle: { fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, margin: "0 0 10px", lineHeight: 1.15 },
  heroSub: { color: "#9a9aa2", fontSize: 14, margin: 0 },

  main: { maxWidth: 1200, margin: "0 auto", padding: "32px 24px" },

  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14, marginBottom: 28,
  },
  statCard: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#101014", border: "1px solid #1c1c21",
    borderRadius: 14, padding: "16px 18px",
    transition: "border-color .2s",
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  statValue: { fontSize: 18, fontWeight: 700, lineHeight: 1.15 },
  statSub: { fontSize: 12, color: "#9a9aa2", fontWeight: 400 },
  statLabel: { fontSize: 11.5, color: "#5b5b62", marginTop: 2 },

  dayRow: {
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 20, overflowX: "auto", paddingBottom: 2,
  },
  dayRowLabel: { fontSize: 12, color: "#5b5b62", whiteSpace: "nowrap" },
  dayTabs: { display: "flex", gap: 6, flexWrap: "nowrap" },
  dayBtn: {
    border: "1px solid #1c1c21", background: "#10101a",
    color: "#9a9aa2", fontSize: 12.5, padding: "7px 14px",
    borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
    transition: "all .15s",
  },
  dayBtnActive: { background: "#e0622f", color: "#fff", borderColor: "#e0622f", boxShadow: "0 0 12px rgba(224,98,47,0.3)" },
  dayShort: { display: "none" },
  dayFull: { display: "inline" },

  card: {
    background: "#10101a", border: "1px solid #1c1c21",
    borderRadius: 18, padding: "22px 22px 16px",
    marginBottom: 22,
  },
  cardHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 12, marginBottom: 16, flexWrap: "wrap",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 3px" },
  cardSub: { fontSize: 12, color: "#5b5b62", margin: 0 },

  navGroup: { display: "flex", gap: 6 },
  navBtn: {
    border: "1px solid #232328", background: "#1c1c21", color: "#f2f2f3",
    width: 32, height: 32, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  navBtnDisabled: { color: "#3a3a40", cursor: "not-allowed", opacity: 0.5 },

  chartPills: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  pill: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, color: "#9a9aa2",
    background: "#1a1a20", borderRadius: 999, padding: "5px 12px",
  },
  pillDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  exportBtn: {
    border: "1px solid #232328", background: "none", color: "#9a9aa2",
    fontSize: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
    alignSelf: "flex-start",
  },

  tableWrap: {
    overflowY: "auto",
    maxHeight: 340,
    borderRadius: 10,
    border: "1px solid #1c1c21",
    scrollbarWidth: "thin",
    scrollbarColor: "#232328 transparent",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 500 },
  th: {
    textAlign: "left", fontSize: 11, color: "#5b5b62", fontWeight: 600,
    padding: "10px 14px", background: "#0d0d10",
    position: "sticky", top: 0, zIndex: 2,
    boxShadow: "0 1px 0 0 #1c1c21",
    whiteSpace: "nowrap",
  },
  thInner: { display: "inline-flex", alignItems: "center", gap: 5 },
  tr: { animation: "fadeUp .3s ease both", borderBottom: "1px solid #14141a" },
  td: { padding: "12px 14px", fontSize: 13.5, whiteSpace: "nowrap" },
  dateCell: { color: "#9a9aa2", fontSize: 13 },
  timeChip: {
    background: "#1a1a20", borderRadius: 6,
    padding: "3px 8px", fontSize: 13, fontFamily: "monospace",
  },
  duration: { color: "#9a9aa2", fontSize: 13 },
  dash: { color: "#3a3a40" },
  tagDone: {
    fontSize: 11.5, color: "#2fbf71", background: "rgba(47,191,113,0.1)",
    padding: "3px 10px", borderRadius: 999, fontWeight: 600,
  },
  tagActive: {
    fontSize: 11.5, color: "#e0622f", background: "rgba(224,98,47,0.12)",
    padding: "3px 10px", borderRadius: 999, fontWeight: 600,
  },

  tooltip: {
    background: "#1c1c21", border: "1px solid #2c2c33",
    borderRadius: 10, padding: "8px 12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
};