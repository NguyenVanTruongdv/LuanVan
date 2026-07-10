import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gift,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import cashierApi from "../../../api/cashierApi";

/* ------------------------------------------------------------------ */
/*  Danh mục gói tập — lấy từ API GET /api/packages (cashierApi.getAllPackage) */
/*  Chuẩn hoá field trả về từ BE (tên field có thể khác nhau tuỳ style   */
/*  serialize — PascalCase hay camelCase) về 1 shape thống nhất dùng UI. */
/* ------------------------------------------------------------------ */

// BE trả về: { planId, planName, price, durationDays, description }
// FIX: ép kiểu số (Number(...) || 0) để tránh price/durationDays undefined
// làm hỏng các phép tính tiền/ngày phía sau (nguyên nhân gây lỗi
// "Cannot read properties of undefined (reading 'toLocaleString')").
function normalizePackage(p) {
  const { planId, planName, price, durationDays } = p;
  const days = Number(durationDays) || 0;
  const duration = days > 0 && days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`;

  return {
    id: `plan-${planId}`,
    planId,
    name: planName,
    duration,
    durationDays: days,
    price: Number(price) || 0,
  };
}

// Khuyến mãi áp dụng cho 1 gói — lấy từ GET /api/plans/{planId}/applicable-promotions
// (cashierApi.getApplicablePromotions). Nghiệp vụ hiện tại đảm bảo mỗi gói chỉ có
// tối đa 1 khuyến mãi hiệu lực tại 1 thời điểm -> FE luôn lấy phần tử đầu tiên và
// ÁP DỤNG TỰ ĐỘNG, không cho nhân viên chọn thủ công.
// Giả định BE trả về: { promotionId, name, type, value } trong đó
// type = "ExtraDays" (tặng thêm N ngày sử dụng) hoặc "Discount" (giảm thẳng N đồng).
// Nếu tên field/shape thực tế khác, chỉ cần chỉnh lại hàm này.
function normalizePromotion(p) {
  const { promotionId, name, type, value } = p;
  return {
    id: `promotion-${promotionId}`,
    promotionId,
    name,
    type, // "ExtraDays" | "Discount"
    value: Number(value) || 0,
  };
}

// Tính lại thời hạn + số tiền sau khi áp dụng khuyến mãi (nếu có) cho 1 gói tập.
// FIX: ép kiểu số cho mọi giá trị đầu vào (price, durationDays, promotion.value)
// để không bao giờ trả về NaN/undefined lan sang currency().
function computePricing(pkg, promotion, today) {
  if (!pkg) return null;
  const price = Number(pkg.price) || 0;
  const durationDays = Number(pkg.durationDays) || 0;
  const promoValue = Number(promotion?.value) || 0;
  const bonusDays = promotion?.type === "ExtraDays" ? promoValue : 0;
  const discount = promotion?.type === "Discount" ? Math.min(promoValue, price) : 0;
  const totalDays = durationDays + bonusDays;
  const finalAmount = price - discount;
  return {
    bonusDays,
    discount,
    totalDays,
    finalAmount,
    expiry: addDays(today, totalDays),
  };
}

const PAYMENT_METHODS = [
  { id: "Cash", label: "Tiền mặt", icon: Banknote },
  { id: "BankTransfer", label: "Chuyển khoản", icon: CreditCard },
];

// FIX: currency() giờ luôn an toàn — nếu n là undefined/null/NaN/chuỗi rác,
// tự động fallback về 0 thay vì crash khi gọi .toLocaleString().
const currency = (n) => {
  const num = Number(n);
  return (Number.isFinite(num) ? num : 0).toLocaleString("vi-VN") + " đ";
};

const initials = (name) =>
  (name || "HV")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
function avatarColor(id) {
  const idx = parseInt(String(id ?? "0").replace(/\D/g, "") || "0") % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// d/M/yyyy — dùng để hiển thị, khớp format trên màn gia hạn (10/7/2026)
function formatDateVN(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
}

// Chuyển dataURL (ảnh chụp) thành Blob để gửi multipart/form-data.
// Trả về null nếu là ảnh minh họa (không có camera thật — chế độ demo).
async function dataUrlToBlob(dataUrl) {
  if (!dataUrl || dataUrl === "placeholder") return null;
  const res = await fetch(dataUrl);
  return res.blob();
}

// BE MemberListItem -> shape dùng trong UI của trang này
function normalizeMember(m) {
  const pkg = m.currentPackages?.[0];
  return {
    id: m.memberId,
    name: m.fullName,
    phone: m.phone,
    avatar: m.profileImage || "",
    color: avatarColor(m.memberId),
    packageName: pkg?.planName || null,
  };
}

/* ------------------------------------------------------------------ */
/*  Trang 1 — Danh sách hội viên chờ kích hoạt                        */
/* ------------------------------------------------------------------ */

function MemberList({ members, loading, error, onActivate, onRetry }) {
  const [query, setQuery] = useState("");

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) || m.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  });

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1>Kích hoạt hội viên</h1>
          <p>Danh sách hội viên đang chờ kích hoạt tài khoản</p>
        </div>
      </div>

      <div className="search-bar">
        <Search size={17} className="search-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc số điện thoại"
        />
        <span className="search-count">
          {loading ? "Đang tải…" : `${filtered.length} hội viên`}
        </span>
      </div>

      {error && (
        <div className="empty" style={{ color: "var(--danger)", display: "flex", flexDirection: "column", gap: 10 }}>
          {error}
          <button className="btn-secondary" style={{ alignSelf: "center" }} onClick={onRetry}>
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {!error && (
        <div className="member-list">
          {!loading && filtered.length === 0 && (
            <div className="empty">Không tìm thấy hội viên phù hợp.</div>
          )}
          {filtered.map((m) => (
            <div className="member-row" key={m.id}>
              <div className="avatar" style={{ background: m.avatar ? undefined : m.color, backgroundImage: m.avatar ? `url(${m.avatar})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                {!m.avatar && initials(m.name)}
              </div>
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-meta">
                  <span>
                    <Phone size={13} /> {m.phone}
                  </span>
                </div>
              </div>
              <div className="member-status">
                {m.packageName ? (
                  <span className="badge badge-ok">{m.packageName}</span>
                ) : (
                  <span className="badge badge-warn">Chưa có gói tập</span>
                )}
              </div>
              <button className="btn-activate" onClick={() => onActivate(m)}>
                Kích hoạt <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bước — Chọn gói tập (bố cục "chuyển đổi gói" + timeline + KM tự     */
/*  động + phương thức thanh toán)                                     */
/* ------------------------------------------------------------------ */

function PackageStep({
  member,
  packages,
  loadingPackages,
  packagesError,
  onRetryPackages,
  selected,
  onSelect,
  promotion,
  loadingPromotion,
  promotionError,
  paymentMethod,
  onSelectPaymentMethod,
}) {
  const currentPackageName = member.packageName || "Chưa có gói nào";
  const today = new Date();
  const pricing = selected ? computePricing(selected, promotion, today) : null;
  const totalDays = pricing ? pricing.totalDays : 0;
  const basePct = pricing && totalDays > 0 ? (selected.durationDays / totalDays) * 100 : selected ? 100 : 6;
  const bonusPct = pricing && totalDays > 0 ? (pricing.bonusDays / totalDays) * 100 : 0;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-title">Chọn gói tập cho hội viên</div>
        <div className="card-head-sub">
          Hội viên này chưa đăng ký gói tập. Vui lòng chọn một gói để tiếp tục kích hoạt.
        </div>
      </div>

      {/* Chuyển đổi gói: gói hiện tại -> gói muốn mua */}
      <div className="pkg-switch">
        <div className="pkg-switch-box">
          <div className="pkg-switch-label">Gói hiện tại</div>
          <div className="pkg-switch-value">{currentPackageName}</div>
        </div>
        <div className="pkg-switch-arrow">
          <ChevronRight size={18} />
        </div>
        <div className={"pkg-switch-box pkg-switch-new" + (selected ? " filled" : "")}>
          <div className="pkg-switch-label">Gói muốn mua</div>
          <div className="pkg-switch-value">{selected ? selected.name : "Chưa chọn gói"}</div>
          {selected && <div className="pkg-switch-duration">Thời hạn {selected.duration}</div>}
        </div>
      </div>

      {/* Mốc thời gian */}
      <div className="pkg-timeline">
        <div className="pkg-timeline-bar">
          <span className="bar-base" style={{ width: selected ? `${basePct}%` : "6%" }} />
          {pricing && pricing.bonusDays > 0 && (
            <span className="bar-bonus" style={{ width: `${bonusPct}%` }} />
          )}
        </div>
        {pricing && pricing.bonusDays > 0 && (
          <div className="pkg-timeline-legend">
            <span className="legend-dot legend-bonus" />
            {pricing.bonusDays} ngày được tặng thêm từ khuyến mãi
          </div>
        )}
        <div className="pkg-timeline-dates">
          <div>
            <span>Hôm nay</span>
            <strong>{formatDateVN(today)}</strong>
          </div>
          <div>
            <span>Bắt đầu gói mới</span>
            <strong>{selected ? formatDateVN(today) : "—"}</strong>
          </div>
          <div>
            <span>Kết thúc gói mới</span>
            <strong>{pricing ? formatDateVN(pricing.expiry) : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="pkg-list-title">Chọn gói khác</div>

      {loadingPackages && (
        <div className="empty" style={{ padding: "20px 0" }}>Đang tải danh sách gói tập…</div>
      )}

      {!loadingPackages && packagesError && (
        <div className="empty" style={{ color: "var(--danger)", display: "flex", flexDirection: "column", gap: 10, padding: "20px 0" }}>
          {packagesError}
          <button className="btn-secondary" style={{ alignSelf: "center" }} onClick={onRetryPackages}>
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {!loadingPackages && !packagesError && (
        <div className="package-list">
          {packages.length === 0 && (
            <div className="empty" style={{ padding: "20px 0" }}>Chưa có gói tập nào.</div>
          )}
          {packages.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                className={"package-row" + (active ? " active" : "")}
                onClick={() => onSelect(p)}
              >
                <div className="package-row-radio">{active && <Check size={12} />}</div>
                <div className="package-row-info">
                  <div className="package-row-name">
                    {p.name}
                    {p.tag && <span className="package-row-tag">{p.tag}</span>}
                  </div>
                  <div className="package-row-duration">Thời hạn {p.duration}</div>
                </div>
                <div className="package-row-price">{currency(p.price)}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Khuyến mãi — tra tự động theo gói đã chọn (GET /api/plans/{planId}/applicable-promotions).
          Mỗi gói chỉ có tối đa 1 khuyến mãi -> áp dụng luôn, KHÔNG cho chọn thủ công. */}
      {selected && (
        <>
          <div className="pkg-list-title pkg-list-title-icon">
            <Gift size={13} /> Khuyến mãi áp dụng
          </div>

          {loadingPromotion && (
            <div className="empty" style={{ padding: "20px 0" }}>Đang kiểm tra khuyến mãi…</div>
          )}

          {!loadingPromotion && promotionError && (
            <div className="empty" style={{ color: "var(--danger)", padding: "20px 0" }}>
              {promotionError}
            </div>
          )}

          {!loadingPromotion && !promotionError && (
            promotion ? (
              <div
                className={
                  "voucher-row voucher-row-static" +
                  (promotion.type === "ExtraDays" ? " voucher-days" : " voucher-discount")
                }
              >
                <div className="voucher-row-icon">
                  {promotion.type === "ExtraDays" ? <CalendarPlus size={16} /> : <Tag size={16} />}
                </div>
                <div className="voucher-row-info">
                  <div className="voucher-row-name">{promotion.name}</div>
                  <div className="voucher-row-desc">
                    {promotion.type === "ExtraDays"
                      ? `Tặng ${promotion.value} ngày sử dụng`
                      : `Giảm ${currency(promotion.value)}`}
                  </div>
                </div>
                <div className="voucher-row-check">
                  <Check size={12} />
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: "16px 0" }}>Gói này hiện không có khuyến mãi.</div>
            )
          )}
        </>
      )}

      {selected && pricing && (
        <div className="pkg-total">
          <span>Thành tiền</span>
          {pricing.discount > 0 ? (
            <div className="pkg-total-price">
              <span className="pkg-total-original">{currency(selected.price)}</span>
              <strong>{currency(pricing.finalAmount)}</strong>
            </div>
          ) : (
            <strong>{currency(selected.price)}</strong>
          )}
        </div>
      )}

      {/* Phương thức thanh toán */}
      <div className="pkg-list-title" style={{ marginTop: 22 }}>Phương thức thanh toán</div>
      <div className="payment-methods">
        {PAYMENT_METHODS.map((pm) => {
          const Icon = pm.icon;
          const active = paymentMethod === pm.id;
          return (
            <button
              key={pm.id}
              className={"payment-method-btn" + (active ? " active" : "")}
              onClick={() => onSelectPaymentMethod(pm.id)}
            >
              <Icon size={17} />
              <span>{pm.label}</span>
              {active && <Check size={13} className="payment-method-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bước — Chụp Face ID                                                */
/* ------------------------------------------------------------------ */

function FaceIdStep({ member, capturedImage, onCapture, onRetake }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("idle"); // idle | loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");

  const startCamera = useCallback(async () => {
    setCameraState("loading");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (err) {
      setCameraState("error");
      setErrorMsg(
        "Không thể truy cập camera (có thể do trình duyệt chặn quyền truy cập). Bạn vẫn có thể dùng ảnh minh họa để tiếp tục demo."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!capturedImage) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && cameraState === "ready") {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      stopCamera();
      onCapture(dataUrl);
    } else {
      // fallback demo capture khi không có camera
      onCapture("placeholder");
    }
  };

  const handleRetake = () => {
    onRetake();
    startCamera();
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-title">Chụp ảnh Face ID</div>
        <div className="card-head-sub">
          Yêu cầu hội viên nhìn thẳng vào camera, giữ khuôn mặt trong khung để nhận diện chính xác.
        </div>
      </div>

      <div className="faceid-wrap">
        <div className="faceid-frame">
          {capturedImage ? (
            capturedImage === "placeholder" ? (
              <div className="faceid-placeholder">
                <User size={72} strokeWidth={1.2} />
              </div>
            ) : (
              <img src={capturedImage} alt="Face ID đã chụp" className="faceid-media" />
            )
          ) : (
            <>
              <video
                ref={videoRef}
                className="faceid-media faceid-video"
                muted
                playsInline
                style={{ display: cameraState === "ready" ? "block" : "none" }}
              />
              {cameraState !== "ready" && (
                <div className="faceid-silhouette">
                  <svg viewBox="0 0 200 240" width="150" height="180">
                    <ellipse cx="100" cy="70" rx="46" ry="54" fill="rgba(255,255,255,0.14)" />
                    <path
                      d="M20 240 C20 165 52 140 100 140 C148 140 180 165 180 240 Z"
                      fill="rgba(255,255,255,0.14)"
                    />
                  </svg>
                  {cameraState === "loading" && (
                    <div className="faceid-loading">Đang mở camera…</div>
                  )}
                  {cameraState === "error" && (
                    <div className="faceid-error">
                      <AlertTriangle size={22} />
                      <span>Không có quyền truy cập camera</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* khung ngắm góc kiểu face-scan */}
          <div className="scan-corners">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
          </div>
          {!capturedImage && cameraState === "ready" && <div className="scan-line" />}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="faceid-side">
          <div className="faceid-tips">
            <div className="faceid-tips-title">
              <Sparkles size={15} /> Mẹo để có ảnh Face ID tốt
            </div>
            <ul>
              <li>Đảm bảo ánh sáng đủ, tránh ngược sáng</li>
              <li>Bỏ khẩu trang, kính râm, mũ che mặt</li>
              <li>Giữ khuôn mặt nằm giữa khung quét</li>
              <li>Giữ yên trong 1–2 giây khi chụp</li>
            </ul>
          </div>

          <div className="faceid-member">
            <div
              className="avatar avatar-sm"
              style={{ background: member.avatar ? undefined : member.color, backgroundImage: member.avatar ? `url(${member.avatar})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              {!member.avatar && initials(member.name)}
            </div>
            <div>
              <div className="member-name">{member.name}</div>
              <div className="member-meta"><span>{member.phone}</span></div>
            </div>
          </div>

          <div className="faceid-actions">
            {capturedImage ? (
              <button className="btn-secondary" onClick={handleRetake}>
                <RefreshCw size={15} /> Chụp lại
              </button>
            ) : (
              <button className="btn-primary" onClick={handleCapture}>
                <Camera size={16} /> Chụp ảnh
              </button>
            )}
          </div>
          {errorMsg && cameraState === "error" && !capturedImage && (
            <div className="hint-error">{errorMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bước — Xác nhận                                                    */
/* ------------------------------------------------------------------ */

function ConfirmStep({
  member,
  selectedPackage,
  promotion,
  paymentMethod,
  pricing,
  capturedImage,
  submitting,
  error,
}) {
  const pkg = member.packageName
    ? { name: member.packageName }
    : selectedPackage;

  const paymentLabel = PAYMENT_METHODS.find((pm) => pm.id === paymentMethod)?.label || paymentMethod;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-title">Xác nhận kích hoạt</div>
        <div className="card-head-sub">
          Kiểm tra lại thông tin trước khi hoàn tất kích hoạt hội viên.
        </div>
      </div>

      <div className="confirm-grid">
        <div className="confirm-face">
          {capturedImage === "placeholder" ? (
            <div className="faceid-placeholder small">
              <User size={40} strokeWidth={1.2} />
            </div>
          ) : (
            <img src={capturedImage} alt="Face ID" />
          )}
          <span className="confirm-face-check">
            <CheckCircle2 size={16} />
          </span>
        </div>

        <div className="confirm-info">
          <div className="confirm-row">
            <span className="confirm-label">Họ và tên</span>
            <span className="confirm-value">{member.name}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Số điện thoại</span>
            <span className="confirm-value">{member.phone}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Gói tập</span>
            <span className="confirm-value">{pkg?.name || "—"}</span>
          </div>
          {selectedPackage && (
            <div className="confirm-row">
              <span className="confirm-label">Phương thức thanh toán</span>
              <span className="confirm-value">{paymentLabel}</span>
            </div>
          )}
          {promotion && (
            <div className="confirm-row">
              <span className="confirm-label">Khuyến mãi</span>
              <span className="confirm-value">
                {promotion.name} (
                {promotion.type === "ExtraDays"
                  ? `+${promotion.value} ngày`
                  : `-${currency(promotion.value)}`}
                )
              </span>
            </div>
          )}
          {selectedPackage && pricing && (
            <div className="confirm-row">
              <span className="confirm-label">Thành tiền</span>
              <span className="confirm-value">{currency(pricing.finalAmount)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Face ID</span>
            <span className="confirm-value confirm-value-ok">
              <CheckCircle2 size={14} /> Đã chụp thành công
            </span>
          </div>
        </div>
      </div>

      {submitting && (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}>Đang kích hoạt…</div>
      )}
      {error && (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trang thông tin hội viên (điều phối các bước)                      */
/* ------------------------------------------------------------------ */

function MemberActivationFlow({
  member,
  needsPackage,
  packages,
  loadingPackages,
  packagesError,
  onRetryPackages,
  onBack,
  onComplete,
}) {
  const steps = needsPackage
    ? ["Chọn gói tập", "Chụp Face ID", "Xác nhận"]
    : ["Chụp Face ID", "Xác nhận"];

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Khuyến mãi áp dụng cho gói đang chọn — tra tự động mỗi khi đổi gói,
  // KHÔNG cho nhân viên chọn thủ công (mỗi gói chỉ có tối đa 1 KM).
  const [promotion, setPromotion] = useState(null);
  const [loadingPromotion, setLoadingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [capturedImage, setCapturedImage] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const currentKey = steps[stepIndex];
  const pricing = selectedPackage ? computePricing(selectedPackage, promotion, new Date()) : null;

  // GET /api/plans/{planId}/applicable-promotions — mỗi khi chọn gói khác thì
  // tra lại khuyến mãi áp dụng cho gói đó và áp dụng luôn nếu có.
  useEffect(() => {
    if (!selectedPackage) {
      setPromotion(null);
      setPromotionError("");
      return;
    }
    let cancelled = false;
    setLoadingPromotion(true);
    setPromotionError("");
    cashierApi
      .getApplicablePromotions(selectedPackage.planId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setPromotion(list.length > 0 ? normalizePromotion(list[0]) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setPromotion(null);
          setPromotionError("Không kiểm tra được khuyến mãi cho gói này.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPromotion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPackage]);

  const canGoNext = () => {
    if (currentKey === "Chọn gói tập") return !!selectedPackage && !!paymentMethod;
    if (currentKey === "Chụp Face ID") return !!capturedImage;
    return !submitting;
  };

  // Kích hoạt hội viên — khớp đúng MemberService.ActivateWithPackageAsync /
  // ActivateFaceIdOnlyAsync. BE tự tính StartDate/ExpiryDate/SoNgayTangThucTe
  // (từ Plan + Promotion) nên FE KHÔNG gửi 3 field này.
  //   - needsPackage=true  -> POST /api/members/{id}/activate-with-package
  //                           (PlanId, GiaGoc, Amount, PaymentMethod, PromotionId, ProfileImage)
  //   - needsPackage=false -> POST /api/members/{id}/activate-face-id
  //                           (chỉ ProfileImage — BE tự kích hoạt gói Pending/gói còn hạn)
  const submitActivation = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const imageBlob = await dataUrlToBlob(capturedImage);

      if (needsPackage) {
        const formData = new FormData();
        if (imageBlob) formData.append("ProfileImage", imageBlob, "faceid.png");
        formData.append("PlanId", selectedPackage.planId);
        formData.append("PaymentMethod", paymentMethod);
        formData.append("GiaGoc", selectedPackage.price);
        formData.append("Amount", pricing ? pricing.finalAmount : selectedPackage.price);
        if (promotion) formData.append("PromotionId", promotion.promotionId);

        await cashierApi.activateWithPackage(member.id, formData);
      } else {
        const formData = new FormData();
        if (imageBlob) formData.append("ProfileImage", imageBlob, "faceid.png");

        await cashierApi.activateFaceIdOnly(member.id, formData);
      }

      setDone(true);
    } catch (e) {
      setSubmitError(
        e?.response?.data?.message || "Kích hoạt thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentKey === "Xác nhận") {
      submitActivation();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handlePrev = () => {
    if (stepIndex === 0) {
      onBack();
    } else {
      setStepIndex((i) => Math.max(i - 1, 0));
    }
  };

  if (done) {
    return (
      <div className="page">
        <div className="success-wrap">
          <div className="success-icon">
            <CheckCircle2 size={46} />
          </div>
          <h2>Kích hoạt thành công</h2>
          <p>
            Hội viên <strong>{member.name}</strong> đã được kích hoạt
            {selectedPackage ? <> với <strong>{selectedPackage.name}</strong></> : null}.
          </p>
          <button
            className="btn-primary"
            onClick={() => onComplete(member)}
          >
            Về danh sách hội viên
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="back-link" onClick={handlePrev}>
        <ArrowLeft size={16} /> {stepIndex === 0 ? "Danh sách hội viên" : "Quay lại"}
      </button>

      <div className="page-head">
        <div className="page-head-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1>Kích hoạt hội viên</h1>
          <p>Hoàn tất các bước dưới đây để kích hoạt tài khoản</p>
        </div>
      </div>

      <div className="stepper">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div
              className={
                "step" +
                (i === stepIndex ? " step-active" : "") +
                (i < stepIndex ? " step-done" : "")
              }
            >
              <div className="step-circle">
                {i < stepIndex ? <Check size={13} /> : i + 1}
              </div>
              <span>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="step-line" />}
          </React.Fragment>
        ))}
      </div>

      <div className="layout">
        <div className="layout-main">
          {currentKey === "Chọn gói tập" && (
            <PackageStep
              member={member}
              packages={packages}
              loadingPackages={loadingPackages}
              packagesError={packagesError}
              onRetryPackages={onRetryPackages}
              selected={selectedPackage}
              onSelect={setSelectedPackage}
              promotion={promotion}
              loadingPromotion={loadingPromotion}
              promotionError={promotionError}
              paymentMethod={paymentMethod}
              onSelectPaymentMethod={setPaymentMethod}
            />
          )}
          {currentKey === "Chụp Face ID" && (
            <FaceIdStep
              member={member}
              capturedImage={capturedImage}
              onCapture={setCapturedImage}
              onRetake={() => setCapturedImage(null)}
            />
          )}
          {currentKey === "Xác nhận" && (
            <ConfirmStep
              member={member}
              selectedPackage={selectedPackage}
              promotion={promotion}
              paymentMethod={paymentMethod}
              pricing={pricing}
              capturedImage={capturedImage}
              submitting={submitting}
              error={submitError}
            />
          )}
        </div>

        <div className="layout-side">
          <div className="summary-card">
            <div className="summary-title">HỘI VIÊN</div>
            <div className="summary-member">
              <div
                className="avatar avatar-sm"
                style={{ background: member.avatar ? undefined : member.color, backgroundImage: member.avatar ? `url(${member.avatar})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
              >
                {!member.avatar && initials(member.name)}
              </div>
              <div>
                <div className="member-name">{member.name}</div>
                <div className="member-meta"><span>{member.phone}</span></div>
              </div>
            </div>
            <div className="summary-divider" />
            <div className="summary-row">
              <span>Gói tập</span>
              <strong>
                {member.packageName || selectedPackage?.name || "Chưa chọn"}
              </strong>
            </div>
            {(selectedPackage || member.packageName) && (
              <div className="summary-row">
                <span>Học phí</span>
                <strong>
                  {/* FIX: dùng optional chaining pricing?.finalAmount — currency() giờ đã
                      tự xử lý undefined/NaN nên dòng này không còn crash kể cả khi
                      pricing chưa sẵn sàng hoặc dữ liệu gói thiếu field price. */}
                  {selectedPackage ? currency(pricing?.finalAmount) : "—"}
                </strong>
              </div>
            )}
            {promotion && (
              <div className="summary-row">
                <span>Khuyến mãi</span>
                <strong className="ok">
                  {promotion.type === "ExtraDays"
                    ? `+${promotion.value} ngày`
                    : `-${currency(promotion.value)}`}
                </strong>
              </div>
            )}
            {selectedPackage && (
              <div className="summary-row">
                <span>Thanh toán</span>
                <strong>{PAYMENT_METHODS.find((pm) => pm.id === paymentMethod)?.label}</strong>
              </div>
            )}
            <div className="summary-row">
              <span>Face ID</span>
              <strong className={capturedImage ? "ok" : ""}>
                {capturedImage ? "Đã chụp" : "Chưa chụp"}
              </strong>
            </div>

            <button
              className="btn-primary btn-block"
              disabled={!canGoNext() || submitting}
              onClick={handleNext}
            >
              {currentKey === "Xác nhận"
                ? (submitting ? "Đang kích hoạt…" : "Hoàn tất kích hoạt")
                : "Tiếp theo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export default function MemberActive() {
  const [members, setMembers] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [activeMember, setActiveMember] = useState(null);
  const [needsPackage, setNeedsPackage] = useState(false);
  const [checkingActivate, setCheckingActivate] = useState(false);

  // Danh sách gói tập lấy từ API (GET /api/packages) — dùng chung cho
  // bước "Chọn gói tập" của luồng kích hoạt.
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesError, setPackagesError] = useState("");

  const fetchPending = useCallback(() => {
    setLoadingList(true);
    setListError("");
    return cashierApi
      .getPendingMembers()
      .then((data) => setMembers((data || []).map(normalizeMember)))
      .catch(() => setListError("Không tải được danh sách hội viên chờ kích hoạt."))
      .finally(() => setLoadingList(false));
  }, []);

  const fetchPackages = useCallback(() => {
    setLoadingPackages(true);
    setPackagesError("");
    return cashierApi
      .getAllPackage()
      .then((data) => setPackages((data || []).map(normalizePackage)))
      .catch(() => setPackagesError("Không tải được danh sách gói tập."))
      .finally(() => setLoadingPackages(false));
  }, []);

  useEffect(() => {
    fetchPending();
    fetchPackages();
  }, [fetchPending, fetchPackages]);

  // Kiểm tra hội viên đã có gói tập chưa (GET /api/members/{id}/has-package)
  // trước khi mở luồng kích hoạt, để hiển thị đúng số bước cần thiết.
  // LƯU Ý: BE trả về boolean thô (Ok(hasPackage)), không bọc trong object.
  const handleActivate = async (member) => {
    setCheckingActivate(true);
    try {
      const hasPackage = await cashierApi.hasPackage(member.id);
      setNeedsPackage(!hasPackage);
      setActiveMember(member);
    } catch (e) {
      setListError("Không kiểm tra được trạng thái gói tập của hội viên. Vui lòng thử lại.");
    } finally {
      setCheckingActivate(false);
    }
  };

  const handleBack = () => {
    setActiveMember(null);
  };

  const handleComplete = () => {
    setActiveMember(null);
    fetchPending(); // tải lại danh sách — hội viên vừa kích hoạt sẽ biến mất khỏi danh sách chờ
  };

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      {activeMember ? (
        <MemberActivationFlow
          // FIX: key theo member.id để React unmount/remount hoàn toàn khi
          // chuyển sang hội viên khác, tránh việc state cũ (selectedPackage,
          // promotion, capturedImage...) của hội viên trước bị giữ lại.
          key={activeMember.id}
          member={activeMember}
          needsPackage={needsPackage}
          packages={packages}
          loadingPackages={loadingPackages}
          packagesError={packagesError}
          onRetryPackages={fetchPackages}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      ) : (
        <MemberList
          members={members}
          loading={loadingList || checkingActivate}
          error={listError}
          onActivate={handleActivate}
          onRetry={fetchPending}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles — tông màu theo layout Cashier Portal (navy + cyan),        */
/*  nền tổng thể vẫn sáng để không bị quá tối.                          */
/* ------------------------------------------------------------------ */

const CSS = `
:root{
  --ink:#152238;
  --muted:#66758c;
  --primary:#0891b2;
  --primary-dark:#0e7490;
  --primary-light:#e0f7fa;
  --navy:#0f1b2d;
  --navy-light:#17263f;
  --surface:#ffffff;
  --bg:#eef2f6;
  --border:#dde3ea;
  --danger:#d64545;
  --warn:#b8862f;
  --warn-bg:#fbf1e0;
  --bonus:#f59e0b;
  --bonus-bg:#fef3e2;
  --discount:#10b981;
  --discount-bg:#e3f9f0;
}
*{box-sizing:border-box;}
.app-shell{
  min-height:100vh;
  background:var(--bg);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:var(--ink);
  padding:32px 24px 60px;
}
.page{max-width:1080px;margin:0 auto;}
.back-link{
  display:inline-flex;align-items:center;gap:6px;
  background:none;border:none;color:var(--muted);
  font-size:13.5px;font-weight:500;cursor:pointer;padding:6px 0 18px;
}
.back-link:hover{color:var(--ink);}

.page-head{
  display:flex;gap:14px;align-items:flex-start;margin-bottom:24px;
  background:linear-gradient(135deg,var(--navy),var(--navy-light));
  border-radius:16px;padding:20px 24px;
}
.page-head-icon{
  width:42px;height:42px;border-radius:12px;background:rgba(34,211,238,0.16);
  color:#22d3ee;display:flex;align-items:center;justify-content:center;flex:none;
}
.page-head h1{font-size:21px;font-weight:700;margin:0 0 4px;letter-spacing:-0.01em;color:#fff;}
.page-head p{font-size:13.5px;color:rgba(255,255,255,0.62);margin:0;}

.search-bar{
  display:flex;align-items:center;gap:10px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:12px;padding:12px 16px;margin-bottom:18px;
}
.search-bar input{
  flex:1;border:none;outline:none;font-size:14px;background:transparent;color:var(--ink);
}
.search-icon{color:var(--muted);flex:none;}
.search-count{font-size:12.5px;color:var(--muted);flex:none;}

.member-list{display:flex;flex-direction:column;gap:10px;}
.member-row{
  display:flex;align-items:center;gap:14px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:14px;padding:14px 16px;transition:border-color .15s;
}
.member-row:hover{border-color:var(--primary);}
.avatar{
  width:42px;height:42px;border-radius:50%;color:#fff;font-weight:700;font-size:14px;
  display:flex;align-items:center;justify-content:center;flex:none;
}
.avatar-sm{width:34px;height:34px;font-size:12.5px;}
.member-info{flex:1;min-width:0;}
.member-name{font-weight:600;font-size:14.5px;}
.member-meta{display:flex;gap:16px;font-size:12.5px;color:var(--muted);margin-top:3px;flex-wrap:wrap;}
.member-meta span{display:inline-flex;align-items:center;gap:5px;}

.member-status{flex:none;}
.badge{font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;white-space:nowrap;}
.badge-ok{background:var(--primary-light);color:var(--primary-dark);}
.badge-warn{background:var(--warn-bg);color:var(--warn);}

.btn-activate{
  flex:none;display:inline-flex;align-items:center;gap:4px;
  background:var(--primary);color:#fff;border:none;border-radius:10px;
  padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .15s;
}
.btn-activate:hover{background:var(--primary-dark);}
.empty{padding:40px;text-align:center;color:var(--muted);font-size:14px;}

/* Stepper */
.stepper{display:flex;align-items:center;margin:8px 0 26px;}
.step{display:flex;align-items:center;gap:8px;flex:none;}
.step span{font-size:13px;color:var(--muted);font-weight:500;}
.step-circle{
  width:26px;height:26px;border-radius:50%;background:var(--surface);
  border:2px solid var(--border);display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:var(--muted);flex:none;
}
.step-active .step-circle{border-color:var(--primary);color:var(--primary);background:var(--primary-light);}
.step-active span{color:var(--ink);font-weight:700;}
.step-done .step-circle{background:var(--primary);border-color:var(--primary);color:#fff;}
.step-done span{color:var(--ink);}
.step-line{flex:1;height:2px;background:var(--border);margin:0 12px;min-width:24px;}

/* Layout */
.layout{display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;}
@media (max-width:820px){.layout{grid-template-columns:1fr;}}
.layout-main{min-width:0;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;}
.card-head-title{font-size:16px;font-weight:700;margin-bottom:4px;}
.card-head-sub{font-size:13px;color:var(--muted);margin-bottom:20px;}

/* Package — chuyển đổi gói + timeline */
.pkg-switch{display:flex;align-items:stretch;gap:12px;margin-bottom:20px;}
.pkg-switch-box{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:0;}
.pkg-switch-new.filled{border-color:var(--primary);background:var(--primary-light);}
.pkg-switch-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;}
.pkg-switch-value{font-weight:700;font-size:14.5px;overflow-wrap:anywhere;}
.pkg-switch-duration{font-size:12px;color:var(--primary-dark);margin-top:3px;}
.pkg-switch-arrow{display:flex;align-items:center;justify-content:center;color:var(--muted);flex:none;}

.pkg-timeline{margin-bottom:24px;}
.pkg-timeline-bar{display:flex;height:6px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:10px;}
.pkg-timeline-bar .bar-base{display:block;height:100%;background:var(--primary);transition:width .2s;}
.pkg-timeline-bar .bar-bonus{display:block;height:100%;background:var(--bonus);transition:width .2s;}
.pkg-timeline-legend{
  display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bonus);
  font-weight:600;margin-bottom:10px;
}
.legend-dot{width:8px;height:8px;border-radius:50%;flex:none;}
.legend-dot.legend-bonus{background:var(--bonus);}
.pkg-timeline-dates{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.pkg-timeline-dates div{display:flex;flex-direction:column;gap:3px;}
.pkg-timeline-dates span{font-size:11.5px;color:var(--muted);}
.pkg-timeline-dates strong{font-size:13px;color:var(--ink);}

.pkg-list-title{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.pkg-list-title-icon{display:flex;align-items:center;gap:6px;margin-top:22px;}
.pkg-list-title-optional{font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted);font-size:11.5px;}
.package-list{display:flex;flex-direction:column;gap:8px;}
.package-row{
  display:flex;align-items:center;gap:12px;text-align:left;width:100%;
  background:var(--bg);border:1.5px solid var(--border);border-radius:12px;
  padding:12px 14px;cursor:pointer;transition:all .15s;
}
.package-row:hover{border-color:var(--primary);}
.package-row.active{border-color:var(--primary);background:var(--primary-light);}
.package-row-radio{
  width:18px;height:18px;border-radius:50%;border:2px solid var(--border);
  display:flex;align-items:center;justify-content:center;flex:none;color:#fff;
}
.package-row.active .package-row-radio{background:var(--primary);border-color:var(--primary);}
.package-row-info{flex:1;min-width:0;}
.package-row-name{font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.package-row-tag{font-size:10px;font-weight:700;color:var(--primary-dark);background:var(--primary-light);padding:2px 8px;border-radius:999px;}
.package-row-duration{font-size:12px;color:var(--muted);margin-top:2px;}
.package-row-price{font-weight:700;font-size:14px;color:var(--primary-dark);flex:none;}

/* Khuyến mãi tự động (thay cho voucher chọn thủ công trước đây) */
.voucher-row{
  display:flex;align-items:center;gap:12px;text-align:left;width:100%;
  background:var(--bg);border:1.5px solid var(--border);border-left-width:4px;
  border-radius:12px;padding:12px 14px;transition:all .15s;
}
.voucher-row-static{cursor:default;}
.voucher-row-icon{
  width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;
}
.voucher-row.voucher-days{border-left-color:var(--bonus);background:var(--bonus-bg);}
.voucher-row.voucher-days .voucher-row-icon{background:#fff;color:var(--bonus);}
.voucher-row.voucher-discount{border-left-color:var(--discount);background:var(--discount-bg);}
.voucher-row.voucher-discount .voucher-row-icon{background:#fff;color:var(--discount);}
.voucher-row-info{flex:1;min-width:0;}
.voucher-row-name{font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.voucher-row-code{
  font-size:10px;font-weight:700;color:var(--muted);background:var(--surface);
  border:1px solid var(--border);padding:2px 7px;border-radius:999px;letter-spacing:.03em;
}
.voucher-row-desc{font-size:12px;color:var(--muted);margin-top:2px;}
.voucher-row-check{
  width:18px;height:18px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;flex:none;color:#fff;
}
.voucher-row.voucher-days .voucher-row-check{background:var(--bonus);}
.voucher-row.voucher-discount .voucher-row-check{background:var(--discount);}

.pkg-total{
  display:flex;justify-content:space-between;align-items:center;
  padding-top:16px;margin-top:22px;border-top:1px dashed var(--border);font-size:14px;
}
.pkg-total strong{font-size:18px;color:var(--primary-dark);}
.pkg-total-price{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.pkg-total-original{font-size:12.5px;color:var(--muted);text-decoration:line-through;}

/* Phương thức thanh toán */
.payment-methods{display:flex;gap:10px;flex-wrap:wrap;}
.payment-method-btn{
  flex:1;min-width:150px;display:flex;align-items:center;gap:9px;
  background:var(--bg);border:1.5px solid var(--border);border-radius:12px;
  padding:12px 14px;cursor:pointer;font-size:13.5px;font-weight:600;color:var(--ink);
  transition:all .15s;position:relative;
}
.payment-method-btn:hover{border-color:var(--primary);}
.payment-method-btn.active{border-color:var(--primary);background:var(--primary-light);color:var(--primary-dark);}
.payment-method-check{margin-left:auto;color:var(--primary);}

/* Face ID */
.faceid-wrap{display:flex;gap:24px;}
@media (max-width:700px){.faceid-wrap{flex-direction:column;}}
.faceid-frame{
  position:relative;width:320px;height:320px;border-radius:20px;overflow:hidden;
  background:linear-gradient(160deg,var(--navy-light),var(--navy));flex:none;
}
.faceid-media{width:100%;height:100%;object-fit:cover;}
.faceid-video{transform:scaleX(-1);}
.faceid-silhouette{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;color:#fff;gap:14px;
}
.faceid-placeholder{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(160deg,var(--navy-light),var(--navy));color:rgba(255,255,255,0.65);
}
.faceid-placeholder.small{width:100%;height:100%;border-radius:12px;}
.faceid-loading{font-size:12.5px;color:rgba(255,255,255,0.7);}
.faceid-error{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  font-size:12px;color:#ffd8d8;text-align:center;padding:0 20px;
}
.scan-corners{position:absolute;inset:22px;pointer-events:none;}
.corner{position:absolute;width:22px;height:22px;border:2.5px solid rgba(34,211,238,0.9);}
.corner.tl{top:0;left:0;border-right:none;border-bottom:none;border-top-left-radius:6px;}
.corner.tr{top:0;right:0;border-left:none;border-bottom:none;border-top-right-radius:6px;}
.corner.bl{bottom:0;left:0;border-right:none;border-top:none;border-bottom-left-radius:6px;}
.corner.br{bottom:0;right:0;border-left:none;border-top:none;border-bottom-right-radius:6px;}
.scan-line{
  position:absolute;left:22px;right:22px;height:2px;
  background:linear-gradient(90deg,transparent,#22d3ee,transparent);
  box-shadow:0 0 8px 1px #22d3ee;
  animation:scanmove 2.2s ease-in-out infinite;
}
@keyframes scanmove{
  0%{top:26px;} 50%{top:calc(100% - 26px);} 100%{top:26px;}
}

.faceid-side{flex:1;display:flex;flex-direction:column;gap:16px;min-width:0;}
.faceid-tips{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;}
.faceid-tips-title{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;margin-bottom:8px;color:var(--primary-dark);}
.faceid-tips ul{margin:0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.7;}
.faceid-member{display:flex;align-items:center;gap:10px;}
.faceid-actions{margin-top:auto;display:flex;gap:10px;}
.hint-error{font-size:12px;color:var(--danger);}

.btn-primary{
  background:var(--primary);color:#fff;border:none;border-radius:10px;
  padding:11px 18px;font-size:13.5px;font-weight:700;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:background .15s;
}
.btn-primary:hover{background:var(--primary-dark);}
.btn-primary:disabled{background:#a9b7c4;cursor:not-allowed;}
.btn-block{width:100%;}
.btn-secondary{
  background:var(--surface);color:var(--ink);border:1.5px solid var(--border);border-radius:10px;
  padding:11px 18px;font-size:13.5px;font-weight:600;cursor:pointer;
  display:inline-flex;align-items:center;gap:7px;
}
.btn-secondary:hover{border-color:var(--primary);color:var(--primary-dark);}

/* Confirm */
.confirm-grid{display:flex;gap:22px;align-items:flex-start;}
@media (max-width:560px){.confirm-grid{flex-direction:column;}}
.confirm-face{position:relative;width:140px;height:140px;border-radius:16px;overflow:hidden;flex:none;background:var(--navy);}
.confirm-face img{width:100%;height:100%;object-fit:cover;}
.confirm-face-check{
  position:absolute;bottom:6px;right:6px;background:var(--primary);color:#fff;
  border-radius:50%;padding:3px;display:flex;
}
.confirm-info{flex:1;display:flex;flex-direction:column;gap:11px;min-width:0;}
.confirm-row{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;border-bottom:1px dashed var(--border);padding-bottom:8px;}
.confirm-label{color:var(--muted);}
.confirm-value{font-weight:600;text-align:right;}
.confirm-value-ok{color:var(--primary-dark);display:inline-flex;align-items:center;gap:5px;}

/* Summary side */
.layout-side{position:sticky;top:24px;}
.summary-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;}
.summary-title{font-size:11.5px;font-weight:700;letter-spacing:.06em;color:var(--muted);margin-bottom:14px;}
.summary-member{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.summary-divider{height:1px;background:var(--border);margin:6px 0 14px;}
.summary-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;color:var(--muted);}
.summary-row strong{color:var(--ink);font-weight:700;}
.summary-row strong.ok{color:var(--primary-dark);}
.summary-card .btn-primary{margin-top:8px;}

/* Success */
.success-wrap{
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:80px 20px;gap:14px;
}
.success-icon{
  width:84px;height:84px;border-radius:50%;background:var(--primary-light);
  color:var(--primary);display:flex;align-items:center;justify-content:center;
}
.success-wrap h2{font-size:21px;margin:6px 0 0;}
.success-wrap p{color:var(--muted);font-size:14px;margin:0 0 10px;max-width:360px;}
`;