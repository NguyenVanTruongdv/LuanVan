import {
    Activity,
    ArrowLeft, Award,
    Building2,
    Camera, Check,
    Eye, FileText, MapPin, Pencil, Phone, RotateCcw, Search,
    TrendingUp,
    User, Users,
    Video,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── DESIGN TOKENS – white theme, indigo/violet accent ── */
const C = {
    bg: "#F4F7F7",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    cardAlt: "#F4FAF9",
    border: "#D7E2E1",
    borderDark: "#A9BFBC",
    ink: "#0A1A16",          // ← đậm hơn
    inkSoft: "#1E3530",      // ← đậm hơn (thay vì #5C7572)
    inkMuted: "#3D5C57",     // ← đậm hơn (thay vì #92ABA8)
    accent: "#6366F1",
    accentDark: "#4F46E5",
    accentRGB: "99,102,241",
    accentGlow: "rgba(99,102,241,0.14)",
    accentSoft: "rgba(99,102,241,0.09)",
    accentGradient: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #C084FC 100%)",
    accentRing: "rgba(99,102,241,0.2)",
    green: "#15803D",        // ← đậm hơn
    greenBg: "#F0FDF4",
    greenBorder: "#BBF7D0",
    amber: "#B45309",        // ← đậm hơn
    amberBg: "#FFFBEB",
    amberBorder: "#FDE68A",
    red: "#B91C1C",          // ← đậm hơn
    redBg: "#FEF2F2",
    redBorder: "#FECACA",
    shadow: "0 1px 4px rgba(16,35,31,0.06), 0 4px 16px rgba(16,35,31,0.05)",
    shadowMd: "0 2px 8px rgba(16,35,31,0.08), 0 8px 26px rgba(16,35,31,0.07)",
};

const CHI_NHANH = ["Quận 1", "Quận 3", "Bình Thạnh", "Thủ Đức"];

const seedMembers = [
    { id: "HV0001", hoTen: "Nguyễn Thị Lan", sdt: "0901234567", chiNhanh: "Quận 1", ngayDangKy: "2023-02-14", goiTap: "Gold", trangThai: "Đang hoạt động", gioiTinh: "Nữ", ghiChu: "", avatar: "" },
    { id: "HV0002", hoTen: "Trần Văn Minh", sdt: "0912345678", chiNhanh: "Quận 3", ngayDangKy: "2022-11-02", goiTap: "Platinum", trangThai: "Đang hoạt động", gioiTinh: "Nam", ghiChu: "Đau lưng, tránh deadlift", avatar: "" },
    { id: "HV0003", hoTen: "Lê Thị Hồng", sdt: "0987654321", chiNhanh: "Bình Thạnh", ngayDangKy: "2024-01-20", goiTap: "Silver", trangThai: "Tạm ngưng", gioiTinh: "Nữ", ghiChu: "", avatar: "" },
    { id: "HV0004", hoTen: "Phạm Quốc Anh", sdt: "0934567890", chiNhanh: "Thủ Đức", ngayDangKy: "2023-07-09", goiTap: "Gold", trangThai: "Đang hoạt động", gioiTinh: "Nam", ghiChu: "", avatar: "" },
    { id: "HV0005", hoTen: "Hoàng Thị Mai", sdt: "0945678901", chiNhanh: "Quận 1", ngayDangKy: "2024-03-30", goiTap: "Basic", trangThai: "Đang hoạt động", gioiTinh: "Nữ", ghiChu: "Dị ứng nhẹ với latex", avatar: "" },
    { id: "HV0006", hoTen: "Đặng Văn Hùng", sdt: "0956789012", chiNhanh: "Quận 3", ngayDangKy: "2021-06-18", goiTap: "Platinum", trangThai: "Hết hạn", gioiTinh: "Nam", ghiChu: "", avatar: "" },
    { id: "HV0007", hoTen: "Vũ Thị Thu", sdt: "0967890123", chiNhanh: "Bình Thạnh", ngayDangKy: "2023-10-05", goiTap: "Silver", trangThai: "Đang hoạt động", gioiTinh: "Nữ", ghiChu: "", avatar: "" },
    { id: "HV0008", hoTen: "Bùi Minh Tuấn", sdt: "0978901234", chiNhanh: "Thủ Đức", ngayDangKy: "2022-02-28", goiTap: "Gold", trangThai: "Đang hoạt động", gioiTinh: "Nam", ghiChu: "", avatar: "" },
];

const memberApi = {
    async list() {
        await new Promise(r => setTimeout(r, 250));
        return seedMembers;
    },
    async updateInfo(id, patch) {
        await new Promise(r => setTimeout(r, 400));
        return { id, ...patch };
    },
    async uploadAvatar(id, imageDataUrl) {
        await new Promise(r => setTimeout(r, 500));
        return imageDataUrl;
    },
};

function initials(name) {
    return (name || "HV").split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}
function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

const AVATAR_PALETTES = [
    ["#6366F1", "#22D3EE"], ["#0EA5E9", "#38BDF8"],
    ["#EC4899", "#F472B6"], ["#10B981", "#34D399"],
    ["#F59E0B", "#FCD34D"], ["#EF4444", "#F87171"],
];
function avatarPalette(id) {
    const idx = parseInt((id || "0").replace(/\D/g, "")) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[idx];
}

const GOI_STYLE = {
    "Basic": { bg: "#E2E8F0", fg: "#1E293B", border: "#94A3B8" },
    "Silver": { bg: "#E2E8F0", fg: "#0F172A", border: "#64748B" },
    "Gold": { bg: "#FEF3C7", fg: "#78350F", border: "#F59E0B" },
    "Platinum": { bg: "#CFFAFE", fg: "#0C4A6E", border: "#22D3EE" },
};
const STATUS_STYLE = {
    "Đang hoạt động": { bg: C.greenBg, fg: C.green, border: C.greenBorder, dot: C.green },
    "Tạm ngưng": { bg: C.amberBg, fg: C.amber, border: C.amberBorder, dot: C.amber },
    "Hết hạn": { bg: C.redBg, fg: C.red, border: C.redBorder, dot: C.red },
};

function StatusBadge({ value }) {
    const s = STATUS_STYLE[value] || STATUS_STYLE["Đang hoạt động"];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999,
            background: s.bg, color: s.fg, fontSize: 12, fontWeight: 800, border: `1px solid ${s.border}`, whiteSpace: "nowrap"
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
            {value}
        </span>
    );
}
function GoiBadge({ value }) {
    const s = GOI_STYLE[value] || GOI_STYLE["Basic"];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 7,
            background: s.bg, color: s.fg, fontSize: 12, fontWeight: 800, border: `1px solid ${s.border}`, letterSpacing: 0.3
        }}>
            {value}
        </span>
    );
}
function Avatar({ name, src, id, size = 40 }) {
    const [c1, c2] = avatarPalette(id || name);
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
            background: src ? undefined : `linear-gradient(135deg,${c1},${c2})`,
            backgroundImage: src ? `url(${src})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: size * 0.34,
            boxShadow: `0 0 0 2.5px #fff, 0 0 0 4px ${c1}66`,
        }}>
            {!src && initials(name)}
        </div>
    );
}

const inp = {
    fontSize: 14.5, padding: "10px 13px", borderRadius: 10,
    border: `1.5px solid ${C.border}`, outline: "none", color: C.ink,
    background: C.surface, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
    transition: "border-color .15s",
};
const btnAccent = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: "none", background: C.accentGradient, color: "#fff", boxShadow: `0 3px 12px rgba(${C.accentRGB},0.32)` };
const btnOutline = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: C.surface, color: C.inkSoft, border: `1.5px solid ${C.border}` };
const btnDanger = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: C.redBg, color: C.red, border: `1.5px solid ${C.redBorder}` };

function GlobalStyles() {
    return (
        <style>{`
            .gw-input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentRing}; }
            .gw-input:hover { border-color: ${C.borderDark}; }
            .gw-photo-col { width: 320px; }
            .gw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
            /* Bảng cuộn: chiều cao tối đa, phần header cố định */
            .gw-table-scroll {
                max-height: 480px;
                overflow-y: auto;
                overflow-x: auto;
            }
            .gw-table-scroll thead th {
                position: sticky;
                top: 0;
                z-index: 2;
                background: #EDF4F3;
            }
            @media (max-width: 760px) {
                .gw-photo-col { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border}; }
                .gw-grid-2 { grid-template-columns: 1fr !important; }
                .gw-grid-2 > [data-full="1"] { grid-column: 1 / -1 !important; }
                .gw-stack-mobile { flex-wrap: wrap !important; }
                .gw-actions-mobile { width: 100%; }
                .gw-actions-mobile button { flex: 1; justify-content: center; }
                .gw-table-scroll { max-height: 360px; }
            }
            @media (max-width: 480px) {
                .gw-filter-bar > * { flex: 1 1 100% !important; }
            }
        `}</style>
    );
}

function Eyebrow({ icon: Icon, children }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={13} color={C.accent} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.8, textTransform: "uppercase" }}>{children}</span>
        </div>
    );
}

/* ── FaceIdCapture ── */
function FaceIdCapture({ onSave, onCancel, aspect = "4/5", saving = false }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState("");
    const [captured, setCaptured] = useState(null);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null; setReady(false);
    }, []);

    const startCam = useCallback(async () => {
        setErr("");
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 720 }, audio: false });
            streamRef.current = s;
            if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
            setReady(true);
        } catch {
            setErr("Không truy cập được camera. Vui lòng cấp quyền.");
        }
    }, []);

    useEffect(() => {
        startCam();
        return () => stop();
    }, []);

    const shoot = () => {
        const v = videoRef.current; if (!v) return;
        const sz = Math.min(v.videoWidth, v.videoHeight);
        const cvs = document.createElement("canvas"); cvs.width = 600; cvs.height = 600;
        const ctx = cvs.getContext("2d");
        ctx.translate(600, 0); ctx.scale(-1, 1);
        ctx.drawImage(v, (v.videoWidth - sz) / 2, (v.videoHeight - sz) / 2, sz, sz, 0, 0, 600, 600);
        stop();
        setCaptured(cvs.toDataURL("image/jpeg", 0.92));
    };

    const retake = () => { setCaptured(null); startCam(); };

    const pickFile = e => {
        const f = e.target.files[0]; if (!f) return;
        stop();
        const r = new FileReader();
        r.onload = ev => setCaptured(ev.target.result);
        r.readAsDataURL(f);
        e.target.value = "";
    };

    const cancel = () => { stop(); onCancel(); };
    const save = () => { if (captured) onSave(captured); };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{
                position: "relative", width: "100%", aspectRatio: aspect, borderRadius: 16, overflow: "hidden",
                background: "linear-gradient(135deg, #0B1224 0%, #1E1B4B 100%)",
                border: `1.5px solid ${C.border}`, boxShadow: C.shadow
            }}>
                {captured ? (
                    <img src={captured} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <>
                        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: ready ? 1 : 0, transition: "opacity .3s" }} />
                        {ready && (
                            <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                                <ellipse cx="150" cy="150" rx="80" ry="105" fill="none" stroke={`rgba(${C.accentRGB},0.9)`} strokeWidth="2.5" strokeDasharray="10 7" />
                                {[[40, 40, 1, 1], [260, 40, -1, 1], [40, 260, 1, -1], [260, 260, -1, -1]].map(([x, y, dx, dy], i) => (
                                    <path key={i} d={`M${x} ${y + dy * 24} v${-dy * 24} h${dx * 24}`} stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" />
                                ))}
                            </svg>
                        )}
                        {!ready && !err && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> Đang mở camera…</span>
                            </div>
                        )}
                        {ready && (
                            <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", color: "#A5B4FC", fontSize: 12, fontWeight: 600 }}>
                                Canh mặt vào khung bầu dục
                            </div>
                        )}
                    </>
                )}
                {captured && (
                    <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "5px 11px" }}>
                        <Check size={12} color="#A5B4FC" />
                        <span style={{ color: "#E0E7FF", fontSize: 11.5, fontWeight: 700 }}>Ảnh đã chụp</span>
                    </div>
                )}
                {err && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.5)" }}>
                        <span style={{ color: "#FCA5A5", fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>{err}</span>
                    </div>
                )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickFile} />

            {!captured ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={shoot} disabled={!ready} style={{ ...btnAccent, flex: 1, justifyContent: "center", opacity: ready ? 1 : 0.4 }}>
                            <Camera size={15} /> Chụp ảnh
                        </button>
                        <button onClick={() => fileRef.current?.click()} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>
                            <Pencil size={13} /> Tải ảnh lên
                        </button>
                    </div>
                    <button onClick={cancel} style={{ ...btnDanger, width: "100%", justifyContent: "center" }}>
                        <X size={14} /> Hủy
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={save} disabled={saving} style={{ ...btnAccent, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                            <Check size={15} /> {saving ? "Đang lưu…" : "Lưu"}
                        </button>
                        <button onClick={retake} disabled={saving} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>
                            <RotateCcw size={13} /> Chụp lại
                        </button>
                    </div>
                    <button onClick={cancel} disabled={saving} style={{ ...btnDanger, width: "100%", justifyContent: "center" }}>
                        <X size={14} /> Hủy
                    </button>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, full, icon: Icon, children }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "span 1", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                {Icon && <Icon size={13} color={C.accent} style={{ flexShrink: 0 }} />}
                {label}{required && <span style={{ color: C.red }}> *</span>}
            </label>
            {children}
        </div>
    );
}

function ReadField({ label, value, icon: Icon, full }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "span 1", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
                {Icon && <Icon size={12} color={C.accent} style={{ flexShrink: 0 }} />}
                {label}
            </span>
            <div style={{
                fontSize: 14.5, padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: C.cardAlt, color: C.ink, fontWeight: 700, minHeight: 21,
                display: "flex", alignItems: "center", lineHeight: 1.5
            }}>
                {value || "—"}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bgColor }) {
    return (
        <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14, flex: "1 1 160px", boxShadow: C.shadow
        }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={21} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: -0.6 }}>{value}</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 1, fontWeight: 600 }}>{label}</div>
            </div>
        </div>
    );
}

/* ── LIST PAGE ── */
function ListPage({ members, onView, onEdit, loading = false }) {
    const [fName, setFName] = useState("");
    const [fPhone, setFPhone] = useState("");
    const [fBranch, setFBranch] = useState("Tất cả");

    const filtered = useMemo(() => members.filter(m =>
        m.hoTen.toLowerCase().includes(fName.trim().toLowerCase())
        && m.sdt.includes(fPhone.trim())
        && (fBranch === "Tất cả" || m.chiNhanh === fBranch)
    ), [members, fName, fPhone, fBranch]);

    const active = members.filter(m => m.trangThai === "Đang hoạt động").length;
    const expired = members.filter(m => m.trangThai === "Hết hạn").length;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: -0.5 }}>Danh sách hội viên</div>
                <div style={{ fontSize: 13.5, color: C.inkMuted, marginTop: 4, fontWeight: 600 }}>
                    {loading ? "Đang tải danh sách hội viên…" : `${filtered.length} / ${members.length} hội viên được hiển thị`}
                </div>
            </div>

            <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
                <StatCard icon={Users} label="Tổng hội viên" value={members.length} color={C.accent} bgColor={C.accentSoft} />
                <StatCard icon={Activity} label="Đang hoạt động" value={active} color={C.green} bgColor={C.greenBg} />
                <StatCard icon={TrendingUp} label="Hết hạn" value={expired} color={C.red} bgColor={C.redBg} />
            </div>

            <div className="gw-filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 18, boxShadow: C.shadow }}>
                <div style={{ position: "relative", flex: "1 1 200px" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted }} />
                    <input className="gw-input" placeholder="Tìm theo tên…" value={fName} onChange={e => setFName(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14 }} />
                </div>
                <div style={{ position: "relative", flex: "1 1 180px" }}>
                    <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted }} />
                    <input className="gw-input" placeholder="Số điện thoại…" value={fPhone} onChange={e => setFPhone(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14 }} />
                </div>
                <div style={{ position: "relative", flex: "1 1 160px" }}>
                    <MapPin size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted, zIndex: 1 }} />
                    <select className="gw-input" value={fBranch} onChange={e => setFBranch(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14, appearance: "none" }}>
                        <option>Tất cả</option>
                        {CHI_NHANH.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <button onClick={() => { setFName(""); setFPhone(""); setFBranch("Tất cả"); }} style={{ ...btnOutline, padding: "10px 14px" }}>
                    <RotateCcw size={13} /> Xóa lọc
                </button>
            </div>

            {/* ── Bảng có thể cuộn ── */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", background: C.card, boxShadow: C.shadow }}>
                <div className="gw-table-scroll">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr>
                                {["Hội viên", "Số điện thoại", "Chi nhánh", "Gói tập", "Trạng thái", ""].map((h, i) => (
                                    <th key={i} style={{
                                        padding: "12px 16px", fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.7,
                                        textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, textAlign: i === 5 ? "right" : "left", whiteSpace: "nowrap"
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(m => (
                                <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background .1s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#EDF6F4"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                            <Avatar name={m.hoTen} src={m.avatar} id={m.id} size={38} />
                                            <div>
                                                <div style={{ fontWeight: 800, color: C.ink }}>{m.hoTen}</div>
                                                <div style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 1, fontWeight: 600 }}>{m.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "13px 16px", color: C.inkSoft, fontWeight: 700 }}>{m.sdt}</td>
                                    <td style={{ padding: "13px 16px", color: C.inkSoft, fontWeight: 700 }}>{m.chiNhanh}</td>
                                    <td style={{ padding: "13px 16px" }}><GoiBadge value={m.goiTap} /></td>
                                    <td style={{ padding: "13px 16px" }}><StatusBadge value={m.trangThai} /></td>
                                    <td style={{ padding: "13px 16px" }}>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            <button onClick={() => onView(m)} style={{ ...btnOutline, padding: "7px 12px", fontSize: 13 }}><Eye size={13} /> Xem</button>
                                            <button onClick={() => onEdit(m)} style={{ ...btnAccent, padding: "7px 12px", fontSize: 13 }}><Pencil size={13} /> Cập nhật</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: "52px 16px", textAlign: "center", color: C.inkMuted }}>
                                    <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                                    Không tìm thấy hội viên phù hợp.
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ── DETAIL PAGE ── */
function DetailPage({ member, onBack, onSave, initialEditingInfo = false }) {
    const [editingPhoto, setEditingPhoto] = useState(false);
    const [editingInfo, setEditingInfo] = useState(initialEditingInfo);
    const [draft, setDraft] = useState(member);
    const [flash, setFlash] = useState("");
    const [error, setError] = useState("");
    const [savingPhoto, setSavingPhoto] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    useEffect(() => {
        setDraft(member);
        setEditingPhoto(false);
        setEditingInfo(initialEditingInfo);
        setError("");
    }, [member.id]);

    const set = k => e => setDraft(d => ({ ...d, [k]: typeof e === "string" ? e : e.target.value }));

    const showFlash = msg => { setFlash(msg); setTimeout(() => setFlash(""), 2200); };

    const handleCapture = async dataUrl => {
        setError(""); setSavingPhoto(true);
        try {
            const avatarUrl = await memberApi.uploadAvatar(member.id, dataUrl);
            const updated = { ...member, avatar: avatarUrl };
            setDraft(updated);
            onSave(updated);
            setEditingPhoto(false);
            showFlash("Đã cập nhật ảnh FaceID!");
        } catch (e) {
            setError("Tải ảnh lên thất bại. Vui lòng thử lại.");
        } finally {
            setSavingPhoto(false);
        }
    };

    const handleSaveInfo = async () => {
        setError(""); setSavingInfo(true);
        try {
            const result = await memberApi.updateInfo(member.id, draft);
            onSave({ ...draft, ...result });
            setEditingInfo(false);
            showFlash("Đã lưu thông tin hội viên!");
        } catch (e) {
            setError("Lưu thông tin thất bại. Vui lòng thử lại.");
        } finally {
            setSavingInfo(false);
        }
    };

    const handleCancelInfo = () => {
        setDraft(member);
        setEditingInfo(false);
        setError("");
    };

    const [c1, c2] = avatarPalette(member.id);

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <button onClick={onBack} style={{ ...btnOutline, padding: "9px 11px" }}><ArrowLeft size={16} /></button>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>Chi tiết hội viên</div>
                    <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 3, fontWeight: 600 }}>Mã: {member.id}</div>
                </div>
            </div>

            {flash && (
                <div style={{ marginBottom: 18, padding: "12px 18px", borderRadius: 12, background: C.greenBg, color: C.green, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 9, border: `1px solid ${C.greenBorder}` }}>
                    <Check size={16} /> {flash}
                </div>
            )}
            {error && (
                <div style={{ marginBottom: 18, padding: "12px 18px", borderRadius: 12, background: C.redBg, color: C.red, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 9, border: `1px solid ${C.redBorder}` }}>
                    <X size={16} /> {error}
                </div>
            )}

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: C.shadowMd }}>
                <div style={{ display: "flex", flexWrap: "wrap" }}>

                    {/* ── PHOTO COLUMN ── */}
                    <div className="gw-photo-col" style={{
                        flexShrink: 0, padding: "28px 26px", borderRight: `1px solid ${C.border}`,
                        background: C.cardAlt, display: "flex", flexDirection: "column"
                    }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
                            {editingPhoto ? (
                                <>
                                    <Eyebrow icon={Camera}>Chụp FaceID mới</Eyebrow>
                                    <FaceIdCapture
                                        aspect="4/5"
                                        onSave={handleCapture}
                                        onCancel={() => setEditingPhoto(false)}
                                        saving={savingPhoto}
                                    />
                                </>
                            ) : (
                                <>
                                    <Eyebrow icon={Camera}>Ảnh / FaceID hội viên</Eyebrow>
                                    <div style={{
                                        position: "relative", width: "100%", aspectRatio: "4/5", borderRadius: 16, overflow: "hidden",
                                        background: draft.avatar ? "#0B1224" : `linear-gradient(135deg,${c1},${c2})`,
                                        border: `1.5px solid ${C.border}`, boxShadow: C.shadow,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        {draft.avatar
                                            ? <img src={draft.avatar} alt={draft.hoTen} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            : <span style={{ fontSize: 60, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{initials(draft.hoTen)}</span>
                                        }
                                    </div>
                                </>
                            )}
                        </div>

                        {!editingPhoto && (
                            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                                <button onClick={() => setEditingPhoto(true)} style={{ ...btnAccent, width: "100%", justifyContent: "center" }}>
                                    <Camera size={15} /> Cập nhật FaceID
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── INFO COLUMN ── */}
                    <div style={{ flex: "1 1 440px", minWidth: 0, padding: "28px 28px 24px", display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                                paddingBottom: 14, marginBottom: 18, borderBottom: `1px solid ${C.border}`
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{draft.hoTen}</span>
                                    <StatusBadge value={draft.trangThai} />
                                    <GoiBadge value={draft.goiTap} />
                                </div>
                            </div>

                            {!editingInfo ? (
                                <div className="gw-grid-2" style={{ gap: "16px 20px" }}>
                                    <ReadField icon={User} label="Họ và tên" value={draft.hoTen} full />
                                    <ReadField icon={Phone} label="Số điện thoại" value={draft.sdt} />
                                    <ReadField label="Giới tính" value={draft.gioiTinh} />
                                    <ReadField icon={Building2} label="Chi nhánh đăng ký" value={draft.chiNhanh} />
                                    <ReadField label="Ngày đăng ký" value={formatDate(draft.ngayDangKy)} />
                                    <ReadField icon={Award} label="Gói tập" value={draft.goiTap} />
                                    <ReadField icon={Activity} label="Trạng thái" value={draft.trangThai} />
                                    <ReadField icon={FileText} label="Ghi chú nội bộ" value={draft.ghiChu} full />
                                </div>
                            ) : (
                                <div className="gw-grid-2" style={{ gap: "18px 20px" }}>
                                    <Field label="Họ và tên" required full icon={User}>
                                        <input className="gw-input" style={inp} value={draft.hoTen} onChange={set("hoTen")} placeholder="Nguyễn Văn A" />
                                    </Field>
                                    <Field label="Số điện thoại" required icon={Phone}>
                                        <input className="gw-input" style={inp} value={draft.sdt} onChange={set("sdt")} placeholder="0901234567" />
                                    </Field>
                                    <Field label="Giới tính" required>
                                        <div style={{ display: "flex", gap: 18, alignItems: "center", height: 43 }}>
                                            {["Nam", "Nữ", "Khác"].map(g => (
                                                <label key={g} style={{
                                                    display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer",
                                                    color: draft.gioiTinh === g ? C.accent : C.inkSoft, fontWeight: draft.gioiTinh === g ? 800 : 600
                                                }}>
                                                    <input type="radio" name="gt-detail" checked={draft.gioiTinh === g} onChange={() => setDraft(d => ({ ...d, gioiTinh: g }))} style={{ accentColor: C.accent, width: 15, height: 15 }} />
                                                    {g}
                                                </label>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label="Chi nhánh" required icon={Building2}>
                                        <select className="gw-input" style={inp} value={draft.chiNhanh} onChange={set("chiNhanh")}>
                                            {CHI_NHANH.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Gói tập" icon={Award}>
                                        <select className="gw-input" style={inp} value={draft.goiTap} onChange={set("goiTap")}>
                                            {["Basic", "Silver", "Gold", "Platinum"].map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Trạng thái" icon={Activity}>
                                        <select className="gw-input" style={inp} value={draft.trangThai} onChange={set("trangThai")}>
                                            {["Đang hoạt động", "Tạm ngưng", "Hết hạn"].map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Ghi chú nội bộ" full icon={FileText}>
                                        <textarea className="gw-input" rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                                            placeholder="Dị ứng, yêu cầu đặc biệt…" value={draft.ghiChu} onChange={set("ghiChu")} />
                                    </Field>
                                </div>
                            )}
                        </div>

                        <div className="gw-actions-mobile" style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
                            {!editingInfo ? (
                                <button onClick={() => { setDraft(member); setEditingInfo(true); }} style={{ ...btnAccent, fontSize: 14.5, padding: "11px 26px" }}>
                                    <Pencil size={15} /> Cập nhật thông tin
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleSaveInfo} disabled={savingInfo} style={{ ...btnAccent, fontSize: 14.5, padding: "11px 26px", opacity: savingInfo ? 0.7 : 1 }}>
                                        <Check size={16} /> {savingInfo ? "Đang lưu…" : "Lưu thay đổi"}
                                    </button>
                                    <button onClick={handleCancelInfo} disabled={savingInfo} style={{ ...btnOutline, fontSize: 14, padding: "11px 18px" }}>
                                        <X size={14} /> Hủy
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── APP SHELL ── */
export default function MemberManagementApp() {
    const [members, setMembers] = useState(seedMembers);
    const [loadingList, setLoadingList] = useState(false);
    const [listError, setListError] = useState("");
    const [route, setRoute] = useState({ page: "list" });

    useEffect(() => {
        let active = true;
        setLoadingList(true);
        memberApi.list()
            .then(data => { if (active) setMembers(data); })
            .catch(() => { if (active) setListError("Không tải được danh sách hội viên."); })
            .finally(() => { if (active) setLoadingList(false); });
        return () => { active = false; };
    }, []);

    const currentMember = useMemo(() => {
        if (!route.id) return null;
        return members.find(m => m.id === route.id) || null;
    }, [route.id, members]);

    const goList = () => setRoute({ page: "list" });
    const goDetail = m => setRoute({ page: "detail", id: m.id, editMode: false });
    const goEdit = m => setRoute({ page: "detail", id: m.id, editMode: true });

    const handleInlineSave = updated => {
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    };

    return (
        <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color: C.ink }}>
            <GlobalStyles />
            <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, boxShadow: "0 1px 4px rgba(16,35,31,0.06)" }} />

            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 28px 80px" }}>
                {route.page === "list" && (
                    <>
                        {listError && (
                            <div style={{ marginBottom: 18, padding: "12px 18px", borderRadius: 12, background: C.redBg, color: C.red, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 9, border: `1px solid ${C.redBorder}` }}>
                                <X size={16} /> {listError}
                            </div>
                        )}
                        <ListPage members={members} onView={goDetail} onEdit={goEdit} loading={loadingList} />
                    </>
                )}
                {route.page === "detail" && currentMember && (
                    <DetailPage
                        member={currentMember}
                        onBack={goList}
                        onSave={handleInlineSave}
                        initialEditingInfo={route.editMode === true}
                    />
                )}
                {route.page !== "list" && !currentMember && (
                    <div style={{ textAlign: "center", padding: 80, color: C.inkMuted }}>
                        Không tìm thấy hội viên.
                        <div style={{ marginTop: 16 }}><button onClick={goList} style={btnOutline}>← Về danh sách</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}