import {
    Activity,
    ArrowLeft, ArrowRight, Award,
    Camera, Check, Clock,
    Eye, FileText, KeyRound, Lock, MapPin, Pencil, Phone, RotateCcw, Search,
    ShieldAlert, TrendingUp, Unlock,
    User, Users,
    Video,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Đường dẫn từ src/pages/admin/Member/ListMember.jsx tới src/api/adminApi.js
import adminApi from "../../../api/adminApi";

/* ── DESIGN TOKENS – nền sáng (trắng/xám nhạt), tông xanh lá rêu (forest
      green) đồng bộ với giao diện Hotel Booking Portal trong ảnh mẫu.
      Các hành động liên quan FaceID dùng tông xanh dương để phân biệt
      với tông xanh lá chủ đạo (info/thao tác chính). ── */
const C = {
    bg: "#F5F7FA",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    cardAlt: "#F6F8FB",
    border: "#E4E9F0",
    borderDark: "#CBD5E1",
    // ── Nền/viền riêng cho các ô nhập & ô hiển thị dữ liệu, đậm hơn nền card
    //     một chút để "nổi" lên rõ ràng thay vì gần như hòa vào nền trắng ──
    fieldBg: "#EEF2F7",
    fieldBorder: "#D7DEE8",
    ink: "#182233",
    inkSoft: "#4A5568",
    inkMuted: "#8A95A5",
    accent: "#1F7A5B",
    accentDark: "#155E45",
    accentRGB: "31,122,91",
    accentSoft: "rgba(31,122,91,0.10)",
    accentGradient: "linear-gradient(135deg, #155E45 0%, #1F7A5B 55%, #2FA47C 100%)",
    accentRing: "rgba(31,122,91,0.22)",
    // ── Xanh dương, dùng riêng cho các hành động liên quan FaceID ──
    faceGreen: "#2C7BE5",
    faceGreenRGB: "44,123,229",
    faceGreenGradient: "linear-gradient(135deg, #1D5FC4 0%, #2C7BE5 55%, #5B9BF0 100%)",
    faceGreenSoft: "rgba(44,123,229,0.10)",
    faceGreenRing: "rgba(44,123,229,0.24)",
    green: "#15803D",
    greenBg: "rgba(21,128,61,0.10)",
    greenBorder: "rgba(21,128,61,0.30)",
    amber: "#B45309",
    amberBg: "rgba(180,83,9,0.10)",
    amberBorder: "rgba(180,83,9,0.30)",
    red: "#DC2626",
    redBg: "rgba(220,38,38,0.09)",
    redBorder: "rgba(220,38,38,0.28)",
    shadow: "0 1px 2px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.05)",
    shadowMd: "0 2px 6px rgba(15,23,42,0.06), 0 14px 30px rgba(15,23,42,0.09)",
};

// Danh sách chi nhánh mặc định — chỉ dùng khi chưa tải được dữ liệu hội viên nào.
// Khi đã có members, danh sách chi nhánh thật sự lấy trực tiếp từ BranchName trả về bởi BE.
const CHI_NHANH_FALLBACK = ["Quận 1", "Quận 3", "Bình Thạnh", "Thủ Đức"];

const FACEID_REASONS = ["Nhận diện kém", "Khác"];

/* ══════════════════════════════════════════════════════════
   MAP DỮ LIỆU API (tiếng Anh) <-> UI (tiếng Việt)
   Khớp với BE: BE.Dtos.Member (MemberListItem / MemberResponse)
   ══════════════════════════════════════════════════════════ */
const STATUS_MAP = {
    PendingActivation: "Chờ hoạt động",
    Active: "Đang hoạt động",
    Suspended: "Tạm ngưng",
};
const GENDER_MAP = { Male: "Nam", Female: "Nữ", Other: "Khác" };
const GENDER_MAP_REVERSE = { Nam: "Male", Nữ: "Female", Khác: "Other" };

// Khớp với FieldName ghi trong MemberUpdateLog (BE: MemberService.UpdateMemberInfoAsync)
const FIELD_LABELS = {
    full_name: "Họ và tên",
    phone: "Số điện thoại",
    gender: "Giới tính",
    internal_notes: "Ghi chú nội bộ",
    CREATE_MEMBER: "Tạo hội viên",
};
function normalizeListItem(m) {
    const pkg = m.currentPackages?.[0];
    return {
        id: m.memberId,
        hoTen: m.fullName || "",   // ← thêm fallback
        sdt: m.phone || "",        // ← thêm fallback
        chiNhanh: m.branchName || "",
        goiTap: pkg?.planName || "Chưa có gói",
        trangThai: STATUS_MAP[m.status] || m.status,
        gioiTinh: "",
        ghiChu: "",
        avatar: m.profileImage || "",
        ngayDangKy: pkg?.startDate || "",
    };

}

function normalizeDetail(m) {
    return {
        id: m.memberId,
        hoTen: m.fullName,
        sdt: m.phone,
        chiNhanh: m.branchName,
        goiTap: m.currentMemberPackageId || "Chưa có gói",
        trangThai: STATUS_MAP[m.status] || m.status,
        gioiTinh: GENDER_MAP[m.gender] || "",
        ghiChu: m.internalNotes || "",
        avatar: m.profileImage || "",
        ngayDangKy: m.createdAt || "",
    };
}

// UI -> payload PUT /api/members/{id}
// Đã confirm theo MemberService.UpdateMemberInfoAsync: backend CHỈ đọc 4 field này,
// không có branchId, không có status.
function toUpdatePayload(draft) {
    return {
        fullName: draft.hoTen,
        phone: draft.sdt,
        gender: GENDER_MAP_REVERSE[draft.gioiTinh] || draft.gioiTinh,
        internalNotes: draft.ghiChu,
    };
}

function initials(name) {
    return (name || "HV").split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}
function formatDate(iso) {
    if (!iso) return "—";
    const datePart = iso.split("T")[0];
    const [y, m, d] = datePart.split("-");
    if (!y || !m || !d) return "—";
    return `${d}/${m}/${y}`;
}
function formatDateTime(iso) {
    if (!iso) return "—";
    const [datePart, timePart] = iso.split("T");
    const [y, m, d] = (datePart || "").split("-");
    const hm = (timePart || "").slice(0, 5);
    if (!y || !m || !d) return "—";
    return `${d}/${m}/${y}${hm ? " " + hm : ""}`;
}

// Chuyển dataURL (ảnh chụp/upload) thành Blob để gửi multipart/form-data
async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
}

const AVATAR_PALETTES = [
    ["#0EA5E9", "#22D3EE"], ["#0891B2", "#38BDF8"],
    ["#EC4899", "#F472B6"], ["#10B981", "#34D399"],
    ["#F59E0B", "#FCD34D"], ["#EF4444", "#F87171"],
];
function avatarPalette(id) {
    const idx = parseInt(String(id ?? "0").replace(/\D/g, "") || "0") % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[idx];
}

const GOI_STYLE = {
    "Basic": { bg: "#F1F5F9", fg: "#475569", border: "#E2E8F0" },
    "Silver": { bg: "#F1F5F9", fg: "#334155", border: "#E2E8F0" },
    "Gold": { bg: "#FEF3C7", fg: "#92400E", border: "#FDE68A" },
    "Platinum": { bg: "#E0F2FE", fg: "#075985", border: "#BAE6FD" },
};
const DEFAULT_GOI_STYLE = { bg: C.accentSoft, fg: C.accentDark, border: C.accentRing };

const STATUS_STYLE = {
    "Đang hoạt động": { bg: C.greenBg, fg: C.green, border: C.greenBorder, dot: C.green },
    "Chờ hoạt động": { bg: C.amberBg, fg: C.amber, border: C.amberBorder, dot: C.amber },
    "Tạm ngưng": { bg: C.redBg, fg: C.red, border: C.redBorder, dot: C.red },

};

// ── Badge phân biệt loại phiên trong lịch sử cập nhật: INFO (thông tin) vs FACEID (khuôn mặt) ──
const SESSION_TYPE_STYLE = {
    INFO: { label: "Cập nhật thông tin", bg: C.accentSoft, fg: C.accentDark, border: "rgba(31,122,91,0.24)", icon: Pencil },
    FACEID: { label: "Cập nhật FaceID", bg: C.faceGreenSoft, fg: C.faceGreen, border: C.faceGreenRing, icon: Camera },
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
    const s = GOI_STYLE[value] || DEFAULT_GOI_STYLE;
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
            boxShadow: `0 0 0 2.5px ${C.card}, 0 0 0 4px ${c1}66`,
        }}>
            {!src && initials(name)}
        </div>
    );
}

const inp = {
    fontSize: 13.5, padding: "9px 12px", borderRadius: 12,
    border: `1.5px solid ${C.fieldBorder}`, outline: "none", color: C.ink,
    background: C.fieldBg, fontFamily: "inherit", width: "100%", boxSizing: "border-box",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.045)",
    transition: "border-color .15s, box-shadow .15s",
};
const btnAccent = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "9px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", border: "none", background: C.accentGradient, color: "#fff", boxShadow: `0 3px 10px rgba(${C.accentRGB},0.26)` };
// ── Nút xanh dương, dùng cho các hành động liên quan FaceID ──
const btnGreen = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "9px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", border: "none", background: C.faceGreenGradient, color: "#fff", boxShadow: `0 3px 10px rgba(${C.faceGreenRGB},0.26)` };
const btnOutline = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "9px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: C.surface, color: C.inkSoft, border: `1.5px solid ${C.border}` };
const btnDanger = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "9px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: C.redBg, color: C.red, border: `1.5px solid ${C.redBorder}` };
// ── Nút "Hủy" tông trung tính nhạt, dùng khi đứng cạnh nút Lưu để không lấn át hành động chính ──
const btnCancelSoft = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "9px 13px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: C.surface, color: C.inkMuted, border: `1.5px solid ${C.border}` };

function GlobalStyles() {
    return (
        <style>{`
            .gw-input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentRing}; }
            .gw-input:hover { border-color: ${C.borderDark}; }
            .gw-input-green:focus { border-color: ${C.faceGreen} !important; box-shadow: 0 0 0 3px ${C.faceGreenRing}; }
            .gw-input-green:hover { border-color: ${C.faceGreen}; }
            .gw-photo-col { width: 260px; }
            .gw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
            .gw-table-scroll {
                max-height: 480px;
                overflow-y: auto;
                overflow-x: auto;
            }
            .gw-table-scroll thead th {
                position: sticky;
                top: 0;
                z-index: 2;
                background: ${C.cardAlt};
            }
            .gw-modal-backdrop {
                position: fixed; inset: 0; background: rgba(15,23,42,0.45);
                display: flex; align-items: center; justify-content: center;
                z-index: 50; padding: 20px;
            }
            .gw-modal {
                background: ${C.surface}; border-radius: 18px; border: 1px solid ${C.border};
                box-shadow: ${C.shadowMd}; width: 100%; max-width: 400px; padding: 20px;
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

function Eyebrow({ icon: Icon, children, color = C.accent, bg = C.accentSoft }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={13} color={color} />
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
    const [reason, setReason] = useState("");
    const [reasonOther, setReasonOther] = useState("");

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

    const retake = () => { setCaptured(null); setReason(""); setReasonOther(""); startCam(); };

    const pickFile = e => {
        const f = e.target.files[0]; if (!f) return;
        stop();
        const r = new FileReader();
        r.onload = ev => setCaptured(ev.target.result);
        r.readAsDataURL(f);
        e.target.value = "";
    };

    const cancel = () => { stop(); onCancel(); };

    const finalReason = reason === "Khác" ? reasonOther.trim() : reason;
    const canSave = !!captured && !!finalReason;

    const save = () => { if (canSave) onSave(captured, finalReason); };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{
                position: "relative", width: "100%", aspectRatio: aspect, borderRadius: 16, overflow: "hidden",
                background: "linear-gradient(135deg, #0B1224 0%, #082F49 100%)",
                border: `1.5px solid ${C.border}`, boxShadow: C.shadow
            }}>
                {captured ? (
                    <img src={captured} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <>
                        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: ready ? 1 : 0, transition: "opacity .3s" }} />
                        {ready && (
                            <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                                <ellipse cx="150" cy="150" rx="80" ry="105" fill="none" stroke={`rgba(${C.faceGreenRGB},0.9)`} strokeWidth="2.5" strokeDasharray="10 7" />
                                {[[40, 40, 1, 1], [260, 40, -1, 1], [40, 260, 1, -1], [260, 260, -1, -1]].map(([x, y, dx, dy], i) => (
                                    <path key={i} d={`M${x} ${y + dy * 24} v${-dy * 24} h${dx * 24}`} stroke={C.faceGreen} strokeWidth="3" fill="none" strokeLinecap="round" />
                                ))}
                            </svg>
                        )}
                        {!ready && !err && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> Đang mở camera…</span>
                            </div>
                        )}
                        {ready && (
                            <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", color: "#93C5FD", fontSize: 12, fontWeight: 600 }}>
                                Canh mặt vào khung bầu dục
                            </div>
                        )}
                    </>
                )}
                {captured && (
                    <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "5px 11px" }}>
                        <Check size={12} color="#93C5FD" />
                        <span style={{ color: "#DBEAFE", fontSize: 11.5, fontWeight: 700 }}>Ảnh đã chụp</span>
                    </div>
                )}
                {err && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.5)" }}>
                        <span style={{ color: "#FCA5A5", fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>{err}</span>
                    </div>
                )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickFile} />

            {captured && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "13px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.cardAlt }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.inkSoft }}>Lý do cập nhật FaceID <span style={{ color: C.red }}>*</span></span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {FACEID_REASONS.map(r => (
                            <label key={r} style={{
                                display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer",
                                color: reason === r ? C.faceGreen : C.inkSoft, fontWeight: reason === r ? 800 : 600
                            }}>
                                <input type="radio" name="faceid-reason" checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: C.faceGreen, width: 15, height: 15 }} />
                                {r}
                            </label>
                        ))}
                        {reason === "Khác" && (
                            <input
                                className="gw-input-green"
                                style={{ ...inp, marginLeft: 23, width: "calc(100% - 23px)" }}
                                placeholder="Nhập lý do cụ thể…"
                                value={reasonOther}
                                onChange={e => setReasonOther(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            )}

            {!captured ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={shoot} disabled={!ready} style={{ ...btnGreen, flex: 1, justifyContent: "center", opacity: ready ? 1 : 0.4 }}>
                            <Camera size={15} /> Chụp ảnh
                        </button>
                        <button onClick={() => fileRef.current?.click()} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>
                            <Pencil size={13} /> Tải ảnh lên
                        </button>
                    </div>
                    <button onClick={cancel} style={{ ...btnCancelSoft, width: "100%", justifyContent: "center" }}>
                        <X size={14} /> Hủy
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={retake} disabled={saving} style={{ ...btnOutline, width: "100%", justifyContent: "center" }}>
                        <RotateCcw size={13} /> Chụp lại
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={save} disabled={saving || !canSave} style={{ ...btnGreen, flex: 1, justifyContent: "center", opacity: (saving || !canSave) ? 0.5 : 1 }}>
                            <Check size={15} /> {saving ? "Đang lưu…" : "Lưu"}
                        </button>
                        <button onClick={cancel} disabled={saving} style={{ ...btnCancelSoft, flex: "0 0 96px", justifyContent: "center" }}>
                            <X size={14} /> Hủy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── PasswordEditor: card "Đổi mật khẩu" — bấm để hiện 2 ô nhập + nút Lưu ── */
function PasswordEditor({ onSave, onCancel, saving = false }) {
    const [pwd1, setPwd1] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [touched, setTouched] = useState(false);

    const tooShort = pwd1.length > 0 && pwd1.length < 6;
    const mismatch = touched && pwd2.length > 0 && pwd1 !== pwd2;
    const canSave = pwd1.length >= 6 && pwd1 === pwd2;

    const save = () => { if (canSave) onSave(pwd1); };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Mật khẩu mới" required icon={KeyRound}>
                <input
                    className="gw-input" type="password" style={inp} value={pwd1}
                    placeholder="Tối thiểu 6 ký tự"
                    onChange={e => setPwd1(e.target.value)}
                />
            </Field>
            <Field label="Xác nhận mật khẩu mới" required icon={KeyRound}>
                <input
                    className="gw-input" type="password" style={inp} value={pwd2}
                    placeholder="Nhập lại mật khẩu mới"
                    onChange={e => setPwd2(e.target.value)}
                    onBlur={() => setTouched(true)}
                />
            </Field>
            {tooShort && <span style={{ fontSize: 12.5, color: C.amber, fontWeight: 700 }}>Mật khẩu cần tối thiểu 6 ký tự.</span>}
            {mismatch && <span style={{ fontSize: 12.5, color: C.red, fontWeight: 700 }}>Hai mật khẩu chưa khớp nhau.</span>}
            <div style={{ display: "flex", gap: 8 }}>
                <button onClick={save} disabled={saving || !canSave} style={{ ...btnAccent, flex: 1, justifyContent: "center", opacity: (saving || !canSave) ? 0.5 : 1 }}>
                    <Check size={15} /> {saving ? "Đang lưu…" : "Lưu mật khẩu"}
                </button>
                <button onClick={onCancel} disabled={saving} style={{ ...btnCancelSoft, flex: "0 0 96px", justifyContent: "center" }}>
                    <X size={14} /> Hủy
                </button>
            </div>
        </div>
    );
}

function Field({ label, required, full, icon: Icon, children }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "span 1", display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                {Icon && <Icon size={13} color={C.accent} style={{ flexShrink: 0 }} />}
                {label}{required && <span style={{ color: C.red }}> *</span>}
            </label>
            {children}
        </div>
    );
}

function ReadField({ label, value, icon: Icon, full }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "span 1", display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
                {Icon && <Icon size={12} color={C.accent} style={{ flexShrink: 0 }} />}
                {label}
            </span>
            <div style={{
                fontSize: 13.5, padding: "9px 12px", borderRadius: 12, border: `1.5px solid ${C.fieldBorder}`,
                background: C.fieldBg, color: C.ink, fontWeight: 700, minHeight: 19,
                boxShadow: "inset 0 1px 2px rgba(15,23,42,0.045)",
                display: "flex", alignItems: "center", lineHeight: 1.4
            }}>
                {value || "—"}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, bgColor }) {
    return (
        <div style={{
            position: "relative", overflow: "hidden",
            background: C.card, border: `1.5px solid ${color}30`, borderRadius: 16, padding: "12px 16px 12px 20px",
            display: "flex", alignItems: "center", gap: 12, flex: "1 1 150px",
            boxShadow: `0 6px 16px ${color}26, ${C.shadow}`
        }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: color }} />
            <div style={{ width: 38, height: 38, borderRadius: 12, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: -0.5 }}>{value}</div>
                <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 1, fontWeight: 600 }}>{label}</div>
            </div>
        </div>
    );
}

// Thumbnail ảnh khuôn mặt trong lịch sử (trước/sau) — placeholder khi chưa có ảnh
function FaceHistoryThumb({ src, label }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <div style={{
                width: "100%", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden",
                border: `1.5px solid ${C.border}`, background: src ? "#0B1224" : C.cardAlt,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                {src
                    ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Camera size={18} color={C.inkMuted} style={{ opacity: 0.5 }} />
                }
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.inkMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
        </div>
    );
}

// Panel lịch sử cập nhật — khớp với GET /api/members/{id}/update-history
// (MemberService.GetUpdateHistoryAsync). Mỗi phiên có sessionType: "INFO" | "FACEID".
// - INFO: đổi trực tiếp field (fullName, phone, gender, internal_notes, hoặc CREATE_MEMBER)
// - FACEID: đổi ảnh khuôn mặt, có oldImageUrl/newImageUrl + reason, changes luôn rỗng
function HistoryModal({ sessions, loading, onClose }) {
    return (
        <div className="gw-modal-backdrop" onClick={onClose}>
            <div className="gw-modal" style={{ maxWidth: 560, maxHeight: "82vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 16.5, fontWeight: 800, color: C.ink }}>Lịch sử cập nhật</span>
                    <button onClick={onClose} style={{ ...btnOutline, padding: "7px 9px" }}><X size={14} /></button>
                </div>
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    {loading && <div style={{ color: C.inkMuted, textAlign: "center", padding: 24 }}>Đang tải…</div>}
                    {!loading && sessions.length === 0 && (
                        <div style={{ color: C.inkMuted, textAlign: "center", padding: 24 }}>Chưa có lịch sử cập nhật.</div>
                    )}
                    {!loading && sessions.map(s => {
                        const typeStyle = SESSION_TYPE_STYLE[s.sessionType] || SESSION_TYPE_STYLE.INFO;
                        const TypeIcon = typeStyle.icon;
                        const isFaceId = s.sessionType === "FACEID";
                        return (
                            <div key={s.sessionId} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: C.cardAlt }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
                                        background: typeStyle.bg, color: typeStyle.fg, fontSize: 11.5, fontWeight: 800, border: `1px solid ${typeStyle.border}`
                                    }}>
                                        <TypeIcon size={11} /> {typeStyle.label}
                                    </span>
                                    <span style={{ fontSize: 12, color: C.inkMuted, fontWeight: 700 }}>{formatDateTime(s.updatedAt)}</span>
                                </div>

                                <div style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600, marginBottom: 10 }}>
                                    {s.employeeName || "Hội viên tự cập nhật"}
                                </div>

                                {!isFaceId ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {s.changes.map((c, i) => (
                                            <div key={i} style={{ fontSize: 13.5, color: C.inkSoft }}>
                                                <b>{FIELD_LABELS[c.fieldName] || c.fieldName}:</b>{" "}
                                                {c.fieldName === "CREATE_MEMBER"
                                                    ? c.newValue
                                                    : <>{c.oldValue || "—"} → {c.newValue || "—"}</>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <FaceHistoryThumb src={s.oldImageUrl} label="Trước" />
                                            <ArrowRight size={15} color={C.inkMuted} style={{ flexShrink: 0 }} />
                                            <FaceHistoryThumb src={s.newImageUrl} label="Sau" />
                                        </div>
                                        {s.reason && (
                                            <div style={{
                                                fontSize: 13, color: C.faceGreen, fontWeight: 700, background: C.faceGreenSoft,
                                                border: `1px solid ${C.faceGreenRing}`, borderRadius: 8, padding: "7px 11px"
                                            }}>
                                                Lý do: {s.reason}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Modal xác nhận khóa / mở khóa hội viên.
// Khi KHÓA: bắt buộc nhập lý do (khớp AccountService.LockAccountAsync — "Phải cung cấp lý do khi khóa tài khoản").
// Khi MỞ KHÓA: không cần lý do.
function LockConfirmModal({ locking, isLocked, onConfirm, onClose }) {
    const [reason, setReason] = useState("");
    const canConfirm = isLocked || reason.trim().length > 0;

    return (
        <div className="gw-modal-backdrop" onClick={onClose}>
            <div className="gw-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.redBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ShieldAlert size={18} color={C.red} />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
                        {isLocked ? "Mở khóa hội viên?" : "Khóa hội viên?"}
                    </span>
                </div>
                <p style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.6, marginBottom: isLocked ? 20 : 12 }}>
                    {isLocked
                        ? "Hội viên sẽ được mở khóa và có thể sử dụng dịch vụ trở lại."
                        : "Hội viên sẽ tạm thời không thể check-in hoặc sử dụng dịch vụ cho đến khi được mở khóa."}
                </p>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, display: "block", marginBottom: 5 }}>
                        {isLocked ? "Ghi chú mở khóa" : "Lý do khóa"} {!isLocked && <span style={{ color: C.red }}>*</span>}
                        {isLocked && <span style={{ color: C.inkMuted, fontWeight: 600 }}> (không bắt buộc)</span>}
                    </label>
                    <textarea
                        className="gw-input"
                        rows={2}
                        style={{ ...inp, resize: "vertical" }}
                        placeholder={isLocked ? "VD: Hội viên đã đóng phí đầy đủ…" : "VD: Vi phạm nội quy, nợ phí…"}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        autoFocus
                    />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => onConfirm(reason.trim())} disabled={locking || !canConfirm}
                        style={{ ...(isLocked ? btnAccent : btnDanger), flex: 1, justifyContent: "center", opacity: (locking || !canConfirm) ? 0.6 : 1 }}
                    >
                        {isLocked ? <Unlock size={15} /> : <Lock size={15} />} {locking ? "Đang xử lý…" : isLocked ? "Mở khóa" : "Khóa hội viên"}
                    </button>
                    <button onClick={onClose} disabled={locking} style={{ ...btnCancelSoft, flex: "0 0 96px", justifyContent: "center" }}>
                        <X size={14} /> Hủy
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── LIST PAGE ── */
function ListPage({ members, onView, onEdit, loading = false }) {
    const [fName, setFName] = useState("");
    const [fPhone, setFPhone] = useState("");
    const [fBranch, setFBranch] = useState("Tất cả");

    // Chi nhánh lấy trực tiếp từ dữ liệu BE trả về (BranchName), tránh lệch với danh sách chi nhánh thật.
    const branchOptions = useMemo(() => {
        const fromData = Array.from(new Set(members.map(m => m.chiNhanh).filter(Boolean)));
        return fromData.length > 0 ? fromData : CHI_NHANH_FALLBACK;
    }, [members]);

    const filtered = useMemo(() => members.filter(m =>
        (m.hoTen || "").toLowerCase().includes(fName.trim().toLowerCase())
        && (m.sdt || "").includes(fPhone.trim())
        && (fBranch === "Tất cả" || m.chiNhanh === fBranch)
    ), [members, fName, fPhone, fBranch]);

    const active = members.filter(m => m.trangThai === "Đang hoạt động").length;
    const pending = members.filter(m => m.trangThai === "Chờ hoạt động").length;
    const expired = members.filter(m => m.trangThai === "Tạm ngưng").length;

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 21, fontWeight: 900, color: C.ink, letterSpacing: -0.5 }}>Danh sách hội viên</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 3, fontWeight: 600 }}>
                    {loading ? "Đang tải danh sách hội viên…" : `${filtered.length} / ${members.length} hội viên được hiển thị`}
                </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <StatCard icon={Users} label="Tổng hội viên" value={members.length} color={C.accentDark} bgColor={C.accentSoft} />
                <StatCard icon={Activity} label="Đang hoạt động" value={active} color={C.green} bgColor={C.greenBg} />
                <StatCard icon={TrendingUp} label="Chờ hoạt động" value={pending} color={C.amber} bgColor={C.amberBg} />
                <StatCard icon={TrendingUp} label="Tạm ngưng" value={expired} color={C.red} bgColor={C.redBg} />
            </div>

            <div className="gw-filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "10px 12px", marginBottom: 14, boxShadow: C.shadow }}>
                <div style={{ position: "relative", flex: "1 1 0" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted }} />
                    <input className="gw-input" placeholder="Tìm theo tên…" value={fName} onChange={e => setFName(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14 }} />
                </div>
                <div style={{ position: "relative", flex: "1 1 0" }}>
                    <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted }} />
                    <input className="gw-input" placeholder="Số điện thoại…" value={fPhone} onChange={e => setFPhone(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14 }} />
                </div>
                <div style={{ position: "relative", flex: "1 1 0" }}>
                    <MapPin size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkMuted, zIndex: 1 }} />
                    <select className="gw-input" value={fBranch} onChange={e => setFBranch(e.target.value)} style={{ ...inp, paddingLeft: 35, fontSize: 14, appearance: "none" }}>
                        <option>Tất cả</option>
                        {branchOptions.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <button onClick={() => { setFName(""); setFPhone(""); setFBranch("Tất cả"); }} style={{ ...btnOutline, padding: "10px 14px", flex: "0 0 auto" }}>
                    <RotateCcw size={13} /> Xóa lọc
                </button>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", background: C.card, boxShadow: C.shadow }}>
                <div className="gw-table-scroll">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                        <thead>
                            <tr>
                                {["Hội viên", "Số điện thoại", "Chi nhánh", "Gói tập", "Trạng thái", ""].map((h, i) => (
                                    <th key={i} style={{
                                        padding: "10px 14px", fontSize: 10.5, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.7,
                                        textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, textAlign: i === 5 ? "right" : "left", whiteSpace: "nowrap"
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(m => (
                                <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background .1s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = `rgba(${C.accentRGB},0.06)`}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "9px 14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <Avatar name={m.hoTen} src={m.avatar} id={m.id} size={34} />
                                            <div>
                                                <div style={{ fontWeight: 800, color: C.ink }}>{m.hoTen}</div>
                                                <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1, fontWeight: 600 }}>HV{String(m.id).padStart(4, "0")}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "9px 14px", color: C.inkSoft, fontWeight: 700 }}>{m.sdt}</td>
                                    <td style={{ padding: "9px 14px", color: C.inkSoft, fontWeight: 700 }}>{m.chiNhanh}</td>
                                    <td style={{ padding: "9px 14px" }}><GoiBadge value={m.goiTap} /></td>
                                    <td style={{ padding: "9px 14px" }}><StatusBadge value={m.trangThai} /></td>
                                    <td style={{ padding: "9px 14px" }}>
                                        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
                                            <button onClick={() => onView(m)} style={{ ...btnOutline, padding: "6px 11px", fontSize: 12.5 }}><Eye size={12.5} /> Xem</button>
                                            <button onClick={() => onEdit(m)} style={{ ...btnAccent, padding: "6px 11px", fontSize: 12.5 }}><Pencil size={12.5} /> Cập nhật</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: "44px 16px", textAlign: "center", color: C.inkMuted }}>
                                    <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
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
function DetailPage({ memberId, listSnapshot, onBack, onSave, initialEditingInfo = false }) {
    const [member, setMember] = useState(listSnapshot);
    const [draft, setDraft] = useState(listSnapshot);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [editingPhoto, setEditingPhoto] = useState(false);
    const [editingInfo, setEditingInfo] = useState(initialEditingInfo);
    const [editingPassword, setEditingPassword] = useState(false);
    const [flash, setFlash] = useState("");
    const [error, setError] = useState("");
    const [savingPhoto, setSavingPhoto] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Khóa / mở khóa hội viên
    const [showLockConfirm, setShowLockConfirm] = useState(false);
    const [locking, setLocking] = useState(false);

    // Lịch sử cập nhật — khớp GET /api/members/{id}/update-history
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySessions, setHistorySessions] = useState([]);

    const fetchDetail = useCallback(() => {
        setLoadingDetail(true);
        setError("");
        return adminApi.getMemberDetail(memberId)
            .then(res => {
                const detail = normalizeDetail(res);
                setMember(detail);
                setDraft(detail);
                return detail;
            })
            .catch(() => { setError("Không tải được thông tin chi tiết hội viên."); })
            .finally(() => setLoadingDetail(false));
    }, [memberId]);

    useEffect(() => {
        fetchDetail();
        setEditingPhoto(false);
        setEditingInfo(initialEditingInfo);
        setEditingPassword(false);
    }, [memberId, fetchDetail, initialEditingInfo]);

    const set = k => e => setDraft(d => ({ ...d, [k]: typeof e === "string" ? e : e.target.value }));

    const showFlash = msg => { setFlash(msg); setTimeout(() => setFlash(""), 2200); };

    // Chỉ cho phép 1 khối chỉnh sửa (Ảnh/FaceID, Thông tin, Mật khẩu) mở tại một thời điểm.
    // Khi chuyển sang chỉnh sửa khối khác trong lúc khối hiện tại chưa lưu, khối cũ sẽ bị
    // reset về dữ liệu gốc và đóng lại (dữ liệu chưa lưu sẽ mất).
    const closeAllEdits = () => {
        setEditingPhoto(false);
        setEditingInfo(false);
        setEditingPassword(false);
        setDraft(member);
        setError("");
    };
    const startEditPhoto = () => { closeAllEdits(); setEditingPhoto(true); };
    const startEditInfo = () => { closeAllEdits(); setDraft(member); setEditingInfo(true); };
    const startEditPassword = () => { closeAllEdits(); setEditingPassword(true); };

    // dataUrl: ảnh chụp/upload (base64) | reason: lý do cập nhật FaceID (bắt buộc)
    const handleCapture = async (dataUrl, reason) => {
        setError(""); setSavingPhoto(true);
        try {
            const blob = await dataUrlToBlob(dataUrl);
            const formData = new FormData();
            formData.append("ProfileImage", blob, "faceid.jpg");
            formData.append("Reason", reason);
            await adminApi.updateFaceId(memberId, formData);
            const updated = await fetchDetail();
            if (updated) onSave(updated);
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
            await adminApi.updateMember(memberId, toUpdatePayload(draft));
            setMember(draft);
            onSave(draft);
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

    // Đổi mật khẩu hội viên — PUT /api/members/{id}/password/reset { newPassword }.
    // BE dùng lại AccountService.ResetPasswordAsync (đặt lại mật khẩu kiểu admin,
    // không cần mật khẩu cũ, tự thu hồi hết refresh token của tài khoản đó).
    const handleSavePassword = async (newPassword) => {
        setError(""); setSavingPassword(true);
        try {
            await adminApi.changeMemberPassword(memberId, { newPassword });
            setEditingPassword(false);
            showFlash("Đã đổi mật khẩu hội viên!");
        } catch (e) {
            setError("Đổi mật khẩu thất bại. Vui lòng thử lại.");
        } finally {
            setSavingPassword(false);
        }
    };

    // Khóa / mở khóa hội viên — PUT /api/members/{id}/lock { reason } | PUT /api/members/{id}/unlock
    const isLocked = member?.trangThai === "Tạm ngưng";
    const handleToggleLock = async (reason) => {
        setLocking(true); setError("");
        try {
            if (isLocked) {
                await adminApi.unlockMember(memberId, reason);
            } else {
                await adminApi.lockMember(memberId, reason);
            }
            const updated = await fetchDetail();
            if (updated) onSave(updated);
            showFlash(isLocked ? "Đã mở khóa hội viên!" : "Đã khóa hội viên!");
        } catch (e) {
            setError("Thao tác khóa/mở khóa thất bại. Vui lòng thử lại.");
        } finally {
            setLocking(false);
            setShowLockConfirm(false);
        }
    };

    const openHistory = async () => {
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const data = await adminApi.getUpdateHistory(memberId);
            setHistorySessions(data || []);
        } catch (e) {
            setHistorySessions([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const [c1, c2] = avatarPalette(memberId);

    if (loadingDetail) {
        return (
            <div style={{ textAlign: "center", padding: 80, color: C.inkMuted, fontWeight: 600 }}>
                Đang tải thông tin hội viên…
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={onBack} style={{ ...btnOutline, padding: "8px 10px" }}><ArrowLeft size={15} /></button>
                    <div>
                        <div style={{ fontSize: 18.5, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>Chi tiết hội viên</div>
                        <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 2, fontWeight: 600 }}>Mã: HV{String(memberId).padStart(4, "0")}</div>
                    </div>
                </div>
                <button onClick={openHistory} style={{ ...btnOutline, padding: "8px 13px" }}>
                    <Clock size={13} /> Lịch sử cập nhật
                </button>
            </div>

            {flash && (
                <div style={{ marginBottom: 12, padding: "10px 15px", borderRadius: 12, background: C.greenBg, color: C.green, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.greenBorder}` }}>
                    <Check size={15} /> {flash}
                </div>
            )}
            {error && (
                <div style={{ marginBottom: 12, padding: "10px 15px", borderRadius: 12, background: C.redBg, color: C.red, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.redBorder}` }}>
                    <X size={15} /> {error}
                </div>
            )}

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 22, overflow: "hidden", boxShadow: C.shadowMd }}>
                <div style={{ display: "flex", flexWrap: "wrap" }}>

                    {/* ── PHOTO COLUMN ── */}
                    <div className="gw-photo-col" style={{
                        flexShrink: 0, padding: "18px 18px", borderRight: `1px solid ${C.border}`,
                        background: C.cardAlt, display: "flex", flexDirection: "column"
                    }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                            {editingPhoto ? (
                                <>
                                    <Eyebrow icon={Camera} color={C.faceGreen} bg={C.faceGreenSoft}>Chụp FaceID mới</Eyebrow>
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
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                                <button onClick={startEditPhoto} style={{ ...btnGreen, width: "100%", justifyContent: "center" }}>
                                    <Camera size={14} /> Cập nhật FaceID
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── INFO COLUMN ── */}
                    <div style={{ flex: "1 1 440px", minWidth: 0, padding: "18px 20px 16px", display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                                paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${C.border}`
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 15.5, fontWeight: 800, color: C.ink }}>{draft.hoTen}</span>
                                    <StatusBadge value={draft.trangThai} />
                                    <GoiBadge value={draft.goiTap} />
                                </div>
                            </div>

                            {!editingInfo ? (
                                <div className="gw-grid-2" style={{ gap: "10px 14px" }}>
                                    <ReadField icon={User} label="Họ và tên" value={draft.hoTen} full />
                                    <ReadField icon={Phone} label="Số điện thoại" value={draft.sdt} />
                                    <ReadField label="Giới tính" value={draft.gioiTinh} />
                                    <ReadField label="Ngày đăng ký" value={formatDate(draft.ngayDangKy)} />
                                    <ReadField icon={Award} label="Gói tập" value={draft.goiTap} />
                                    <ReadField icon={Activity} label="Trạng thái" value={draft.trangThai} />
                                    <ReadField icon={FileText} label="Ghi chú nội bộ" value={draft.ghiChu} full />
                                </div>
                            ) : (
                                <div className="gw-grid-2" style={{ gap: "12px 14px" }}>
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
                                                    color: draft.gioiTinh === g ? C.accentDark : C.inkSoft, fontWeight: draft.gioiTinh === g ? 800 : 600
                                                }}>
                                                    <input type="radio" name="gt-detail" checked={draft.gioiTinh === g} onChange={() => setDraft(d => ({ ...d, gioiTinh: g }))} style={{ accentColor: C.accent, width: 15, height: 15 }} />
                                                    {g}
                                                </label>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label="Ghi chú nội bộ" full icon={FileText}>
                                        <textarea className="gw-input" rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                                            placeholder="Dị ứng, yêu cầu đặc biệt…" value={draft.ghiChu} onChange={set("ghiChu")} />
                                    </Field>
                                </div>
                            )}
                        </div>

                        <div className="gw-actions-mobile" style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                            {editingInfo ? (
                                <>
                                    <button onClick={handleSaveInfo} disabled={savingInfo} style={{ ...btnAccent, fontSize: 13.5, padding: "9px 20px", opacity: savingInfo ? 0.7 : 1 }}>
                                        <Check size={15} /> {savingInfo ? "Đang lưu…" : "Lưu thay đổi"}
                                    </button>
                                    <button onClick={handleCancelInfo} disabled={savingInfo} style={{ ...btnCancelSoft, fontSize: 13, padding: "9px 16px" }}>
                                        <X size={13} /> Hủy
                                    </button>
                                </>
                            ) : !editingPassword ? (
                                <>
                                    <button onClick={startEditInfo} style={{ ...btnAccent, fontSize: 13.5, padding: "9px 20px" }}>
                                        <Pencil size={14} /> Cập nhật thông tin
                                    </button>
                                    <button
                                        onClick={() => setShowLockConfirm(true)}
                                        style={{ ...(isLocked ? btnAccent : btnDanger), fontSize: 13.5, padding: "9px 16px" }}
                                    >
                                        {isLocked ? <Unlock size={14} /> : <Lock size={14} />} {isLocked ? "Mở khóa" : "Khóa hội viên"}
                                    </button>
                                    <button onClick={startEditPassword} style={{ ...btnOutline, fontSize: 13.5, padding: "9px 16px" }}>
                                        <KeyRound size={14} /> Đổi mật khẩu
                                    </button>
                                </>
                            ) : (
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.inkMuted, display: "flex", alignItems: "center", gap: 7, padding: "9px 0" }}>
                                    <KeyRound size={14} color={C.accent} /> Đổi mật khẩu hội viên
                                </span>
                            )}
                        </div>

                        {editingPassword && (
                            <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px solid ${C.border}`, maxWidth: 360 }}>
                                <PasswordEditor
                                    onSave={handleSavePassword}
                                    onCancel={() => setEditingPassword(false)}
                                    saving={savingPassword}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showHistory && (
                <HistoryModal
                    sessions={historySessions}
                    loading={historyLoading}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {showLockConfirm && (
                <LockConfirmModal
                    locking={locking}
                    isLocked={isLocked}
                    onConfirm={handleToggleLock}
                    onClose={() => !locking && setShowLockConfirm(false)}
                />
            )}
        </div>
    );
}

/* ── APP SHELL ── */
export default function ListMemberOfAdmin() {
    const [members, setMembers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [listError, setListError] = useState("");
    const [route, setRoute] = useState({ page: "list" });

    const fetchList = useCallback(() => {
        setLoadingList(true);
        setListError("");
        return adminApi.getListMembers({})
            .then(data => setMembers((data || []).map(normalizeListItem)))
            .catch(() => setListError("Không tải được danh sách hội viên."))
            .finally(() => setLoadingList(false));
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const listSnapshot = useMemo(() => {
        if (!route.id) return null;
        return members.find(m => m.id === route.id) || null;
    }, [route.id, members]);

    const goList = () => {
        setRoute({ page: "list" });
        fetchList();
    };
    const goDetail = m => setRoute({ page: "detail", id: m.id, editMode: false });
    const goEdit = m => setRoute({ page: "detail", id: m.id, editMode: true });

    const handleInlineSave = updated => {
        setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    };

    return (
        <div style={{ minHeight: "100%", background: C.bg, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color: C.ink }}>
            <GlobalStyles />
            <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
                {route.page === "detail" && listSnapshot && (
                    <DetailPage
                        memberId={route.id}
                        listSnapshot={listSnapshot}
                        onBack={goList}
                        onSave={handleInlineSave}
                        initialEditingInfo={route.editMode === true}
                    />
                )}
                {route.page === "detail" && !listSnapshot && !loadingList && (
                    <div style={{ textAlign: "center", padding: 80, color: C.inkMuted }}>
                        Không tìm thấy hội viên.
                        <div style={{ marginTop: 16 }}><button onClick={goList} style={btnOutline}>← Về danh sách</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}