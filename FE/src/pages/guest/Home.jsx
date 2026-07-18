import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../component/Footer";
import Header from "../../component/Header";
// ⚠️ Chỉnh lại đường dẫn import bên dưới cho đúng với vị trí thực tế của memberApi trong project
import memberApi from "../../api/memberApi";

/* =========================================================================
 * MOCK DATA
 * Chỉ còn lại phần chưa có API thật (ảnh hero). Chi nhánh và lượng người tập
 * theo giờ giờ đã gọi API thật, xem phần "DATA FETCHERS" bên dưới.
 * ========================================================================= */

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80",
];



const fmt = (n) => n.toLocaleString("vi-VN") + "đ";

// Số ngày -> nhãn chu kỳ hiển thị cạnh giá (vd: 30 -> "/tháng", 90 -> "/3 tháng", 365 -> "/năm")
function formatPeriod(days) {
  if (!days) return "";
  if (days === 365) return "/năm";
  if (days === 30) return "/tháng";
  if (days % 30 === 0) return `/${days / 30} tháng`;
  return `/${days} ngày`;
}

/* =========================================================================
 * DATA FETCHERS
 * Mỗi hàm trả về đúng shape mà UI đang dùng. Tất cả đã gọi API thật qua
 * memberApi. Khi cần đổi field mapping (BE đổi tên trường), chỉ cần sửa
 * bên trong hàm tương ứng, phần UI/component không cần đổi gì thêm.
 * ========================================================================= */

// Lấy danh sách chi nhánh — GET /api/branches (memberApi.getBranches)
// Response mẫu từ BE:
// { "items": [ { "branchId": 6, "branchName": "GymFit Quận 1", "address": "...", ... } ], ... }
async function fetchBranches() {
  const res = await memberApi.getBranches({ status: "Active" });

  // Tuỳ theo cách authApi trả về (axios response .data, hoặc trả thẳng object),
  // xử lý linh hoạt cho chắc.
  const data = res?.data ?? res;
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

  return items.map((b) => ({
    id: b.branchId ?? b.BranchId,
    name: b.branchName ?? b.BranchName ?? "",
    address: b.address ?? b.Address ?? "",
    href: `/chi-nhanh/${b.branchId ?? b.BranchId}`,
  }));
}


async function fetchPackages() {
  const res = await memberApi.getAllPackage();

  // Tuỳ theo cách memberApi trả về (axios response .data, hoặc trả thẳng mảng),
  // xử lý linh hoạt cả 2 trường hợp cho chắc.
  const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const normalize = (p, i) => {
    const description = p.description ?? p.Description ?? "";
    // Tách mô tả theo dấu "," hoặc "." thành các cụm ngắn, bỏ khoảng trắng thừa và cụm rỗng
    const parts = description
      .split(/[.,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const durationDays = p.durationDays ?? p.DurationDays ?? 30;
    const planId = p.planId ?? p.PlanId ?? i;

    return {
      id: planId,
      name: p.planName ?? p.PlanName ?? "",
      price: p.price ?? p.Price ?? 0,
      period: formatPeriod(durationDays),
      highlighted: !!(p.isPopular ?? p.IsPopular),
      href: `/goi-tap/${planId}`,
      desc: parts[0] || description,
      features: parts.length > 1 ? parts.slice(1) : parts,
      status: p.status ?? p.Status ?? "OnSale",
      // Giữ nguyên bản gốc để mang đủ dữ liệu sang trang /payment (giống MembershipPlansPage)
      durationDays,
      rawDescription: description,
    };
  };

  const active = raw
    .filter((p) => (p.status ?? p.Status ?? "OnSale") === "OnSale")
    .map(normalize);

  // Đảm bảo gói phổ biến (isPopular) luôn có mặt trong danh sách hiển thị,
  // sau đó bù thêm các gói khác cho đủ tối đa 3 gói.
  const popular = active.filter((p) => p.highlighted);
  const others = active.filter((p) => !p.highlighted);
  const top3 = [...popular, ...others].slice(0, 3);

  // Hiển thị theo giá tăng dần cho tự nhiên
  return top3.sort((a, b) => a.price - b.price);
  // (Nếu API sau này tự trả về đúng 3 gói kèm cờ isPopular, có thể bỏ bớt bước lọc/cắt ở trên.)
}


async function fetchGallery() {
  const res = await memberApi.getHomeImages();

  // Tuỳ theo cách memberApi trả về (axios response .data, hoặc trả thẳng mảng),
  // xử lý linh hoạt cả 2 trường hợp cho chắc.
  const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  return raw
    .filter((img) => (img.status ?? img.Status ?? "Active") === "Active")
    .sort((a, b) => (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0))
    .map((img, i) => ({
      id: img.imageId ?? img.ImageId ?? i,
      src: img.imageUrl ?? img.ImageUrl ?? "",
      label: img.title ?? img.Title ?? "",
      href: img.linkUrl ?? img.LinkUrl ?? null,
    }));
}

async function fetchEquipment() {
  const data = await memberApi.getAllEquipmentCategory();
  const icons = [  //icon 
    "🚴", // Cardio
    "🏋️", // Tạ tự do
    "⚙️", // Máy kháng lực
    "🤸", // Functional
    "🧘", // Core & Stretching
    "🎒", // Phụ kiện
  ];
  return data.map((item, index) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    description: item.description,
    equipment: item.equipment,

    // Lấy icon theo vị trí, nếu nhiều hơn 6 danh mục thì lặp lại
    icon: icons[index % icons.length],
  }));
}

/**
 * Lấy dữ liệu lượng người tập theo chi nhánh — GET /api/GymDensity/branch/{branchId}
 * (memberApi.getGymDensityByBranch), khớp với GymDensityController ở BE.
 * Response mẫu: [ { "hourSlot": "2026-07-17T06:00:00", "headcount": 28 }, ... ]
 * trả về đúng shape { values: number[], labels: string[] } mà TrafficChart đang dùng.
 */
async function fetchTraffic(branchId) {
  if (!branchId) return { values: [], labels: [] };

  const res = await memberApi.getGymDensityByBranch(branchId, 5);

  // Tuỳ theo cách authApi trả về (axios response .data, hoặc trả thẳng mảng),
  // xử lý linh hoạt cả 2 trường hợp cho chắc.
  const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const values = raw.map((x) => x.headcount ?? x.Headcount ?? 0);
  const labels = raw.map((x) => {
    const d = new Date(x.hourSlot ?? x.HourSlot);
    return d.getHours().toString().padStart(2, "0") + ":00";
  });

  return { values, labels };
}

/**
 * Hàm lấy tin tức hiển thị trên trang chủ.
 * Gọi API thật qua memberApi.getListNews() -> GET /api/news
 * Response từ backend có các trường: Title, Summary, Content (PascalCase).
 * Hàm này chuẩn hoá lại thành { id, title, summary, content } để UI dùng.
 */
async function fetchAnnouncements() {
  const res = await memberApi.getListNews();

  // Tuỳ theo cách authApi trả về (axios response .data, hoặc trả thẳng mảng),
  // xử lý linh hoạt cả 2 trường hợp cho chắc.
  const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  return raw.map((n, i) => ({
    id: n.Id ?? n.id ?? i,
    title: n.Title ?? n.title ?? "",
    summary: n.Summary ?? n.summary ?? "",
    content: n.Content ?? n.content ?? "",
  }));
}

/* =========================================================================
 * UI COMPONENTS
 * ========================================================================= */

function TrafficChart({ values, labels, loading, error }) {
  if (loading) {
    return <div className="h-chart h-chart--state">Đang tải dữ liệu...</div>;
  }
  if (error) {
    return <div className="h-chart h-chart--state h-chart--err">Không tải được dữ liệu. Vui lòng thử lại.</div>;
  }
  if (!values.length) {
    return <div className="h-chart h-chart--state">Chưa có dữ liệu cho chi nhánh này.</div>;
  }

  const max = Math.max(...values) || 1;
  return (
    <div className="h-chart">
      <div className="h-chart__bars">
        {values.map((val, i) => (
          <div className="h-chart__col" key={i}>
            <span className="h-chart__val">{val}</span>
            <div className="h-chart__wrap">
              <div className="h-chart__bar" style={{ height: `${(val / max) * 100}%`, background: i === values.length - 1 ? "var(--accent)" : "var(--steel-soft)" }} />
            </div>
            <span className="h-chart__lbl">{labels[i]}</span>
          </div>
        ))}
      </div>
      <p className="h-chart__note">Số người đang tập · 5 khung giờ gần nhất</p>
    </div>
  );
}

// Thẻ hiển thị 1 tin tức: dùng Title làm tiêu đề, Summary (fallback Content) làm mô tả ngắn.
// Bấm vào thẻ sẽ mở modal xem đầy đủ nội dung (qua onClick truyền từ ngoài vào).
function AnnouncementPill({ a, onClick }) {
  return (
    <div
      className="h-annc"
      onClick={() => onClick?.(a)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(a);
      }}
    >
      <span className="h-annc__icon">📰</span>
      <div className="h-annc__body">
        <span className="h-annc__branch">{a.title}</span>
        <span className="h-annc__text">{a.summary}</span>
        <span className="h-annc__text"> {a.content}</span>
      </div>
    </div>
  );
}

const ANNC_INTERVAL = 4500;
const ANNC_MAX_CARDS = 3; // số thẻ tối đa hiển thị cùng lúc trên desktop
const ANNC_MAX_HEIGHT = 260; // chiều cao tối đa của khung tin tức (px) — không thẻ nào được vượt quá phần này
const ANNC_GAP = 12; // phải khớp với gap trong CSS .h-annc-scroll

function AnnouncementRail({ items, loading, error, onSelect }) {
  if (loading) {
    return (
      <>
        <div className="h-annc-rail h-annc-rail--desktop">
          <div className="h-annc-scroll">
            <div className="h-annc h-annc--skeleton" />
            <div className="h-annc h-annc--skeleton" />
          </div>
        </div>
        <div className="h-annc-rail h-annc-rail--mobile">
          <div className="h-annc h-annc--skeleton" />
        </div>
      </>
    );
  }
  if (error || !items.length) return null;

  return (
    <>
      <AnnouncementListDesktop items={items} onSelect={onSelect} />
      <AnnouncementCarouselMobile items={items} onSelect={onSelect} />
    </>
  );
}

// PC: danh sách xếp chồng, cuộn được (tự động + cuộn tay), tối đa hiển thị ~3 thẻ trong khung.
// Khác với bản cũ: chiều cao khung được TÍNH ĐỘNG dựa trên chiều cao thật của thẻ đang ở trên
// cùng, nên khung luôn vừa khít trọn vẹn các thẻ (2-3 thẻ, ít hơn nếu tin dài) — không còn cảnh
// thẻ cuối bị cắt/đè ngang như trước. Tự cuộn xuống mỗi vài giây, hết thì quay lại đầu; vẫn
// cuộn tay được, tạm dừng tự cuộn khi người dùng thao tác rồi tiếp tục đúng vị trí đang xem.
function AnnouncementListDesktop({ items, onSelect }) {
  const scrollRef = useRef(null);
  const itemRefs = useRef([]);
  const pauseTimer = useRef(null);
  const [paused, setPaused] = useState(false);
  const [heights, setHeights] = useState([]); // chiều cao thật của từng thẻ, song song với items
  const [topIndex, setTopIndex] = useState(0); // index thẻ đang ở trên cùng khung nhìn
  const [containerHeight, setContainerHeight] = useState(null);

  // Đo chiều cao thật của từng thẻ (đã render sẵn trong danh sách cuộn)
  useLayoutEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
    setHeights(items.map((_, i) => itemRefs.current[i]?.offsetHeight || 0));
  }, [items]);

  // Từ thẻ đang ở trên cùng, gộp tối đa ANNC_MAX_CARDS thẻ liên tiếp sao cho tổng chiều cao
  // <= ANNC_MAX_HEIGHT, rồi lấy đúng tổng đó làm chiều cao khung (không dư, không thiếu).
  useEffect(() => {
    if (heights.length !== items.length || items.length === 0) return;
    let total = 0;
    let count = 0;
    for (let i = 0; i < Math.min(ANNC_MAX_CARDS, items.length); i++) {
      const h = heights[(topIndex + i) % items.length];
      const next = total + (i > 0 ? ANNC_GAP : 0) + h;
      if (next > ANNC_MAX_HEIGHT && count > 0) break;
      total = next;
      count++;
    }
    setContainerHeight(Math.max(total - 1, heights[topIndex] || 0));
  }, [heights, topIndex, items.length]);

  // Tự động cuộn xuống thẻ kế tiếp mỗi vài giây, hết danh sách thì quay lại đầu
  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const t = setInterval(() => {
      setTopIndex((i) => {
        const next = (i + 1) % items.length;
        const el = scrollRef.current;
        const target = itemRefs.current[next];
        if (el) {
          el.scrollTo({ top: next === 0 ? 0 : (target?.offsetTop ?? 0), behavior: "smooth" });
        }
        return next;
      });
    }, ANNC_INTERVAL);
    return () => clearInterval(t);
  }, [items.length, paused]);

  const handleUserScroll = () => {
    setPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      // Xác định lại thẻ đang ở trên cùng theo vị trí cuộn thực tế, để khi tự cuộn tiếp tục
      // sẽ đúng chỗ người dùng vừa xem thay vì nhảy ngược về đầu danh sách.
      const el = scrollRef.current;
      if (el && heights.length === items.length && items.length > 0) {
        let acc = 0;
        let idx = items.length - 1;
        for (let i = 0; i < items.length; i++) {
          if (acc >= el.scrollTop - 4) { idx = i; break; }
          acc += heights[i] + ANNC_GAP;
        }
        setTopIndex(idx);
      }
      setPaused(false);
    }, 6000);
  };

  return (
    <div className="h-annc-rail h-annc-rail--desktop">
      <div
        className="h-annc-scroll"
        ref={scrollRef}
        style={containerHeight ? { maxHeight: containerHeight } : undefined}
        onWheel={handleUserScroll}
        onTouchStart={handleUserScroll}
        onMouseDown={handleUserScroll}
      >
        {items.map((a, i) => (
          <div className="h-annc-item" ref={(el) => (itemRefs.current[i] = el)} key={a.id}>
            <AnnouncementPill a={a} onClick={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobile: carousel 1 thẻ/lần, tự chạy, vuốt được
function AnnouncementCarouselMobile({ items, onSelect }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ANNC_INTERVAL);
    return () => clearInterval(t);
  }, [items.length, paused]);

  const goTo = (i) => setIdx(((i % items.length) + items.length) % items.length);
  const resumeSoon = () => setTimeout(() => setPaused(false), 5000);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));
    touchX.current = null;
    resumeSoon();
  };

  return (
    <div className="h-annc-rail h-annc-rail--mobile" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="h-annc-viewport">
        <div className="h-annc-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {items.map((a) => (
            <div className="h-annc-slide" key={a.id}>
              <AnnouncementPill a={a} onClick={onSelect} />
            </div>
          ))}
        </div>
      </div>
      {items.length > 1 && (
        <div className="h-annc-dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Thông báo ${i + 1}`}
              className={`h-annc-dotbtn${i === idx ? " h-annc-dotbtn--on" : ""}`}
              onClick={() => { goTo(i); setPaused(true); resumeSoon(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [heroIdx, setHeroIdx] = useState(0);

  // Chi nhánh
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);

  // Gói tập
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState(null);

  // Kiểm tra điều kiện mua gói khi bấm "Chọn gói này" — giống hệt MembershipPlansPage.
  // planId đang được kiểm tra (để disable + đổi label đúng nút đang bấm)
  const [checkingPlanId, setCheckingPlanId] = useState(null);
  // Có transaction Pending (đã tạo QR nhưng chưa chuyển khoản) -> hỏi khách tiếp tục hay huỷ
  const [pendingInfo, setPendingInfo] = useState(null);
  const [switchingPlan, setSwitchingPlan] = useState(false);
  const [pendingActionError, setPendingActionError] = useState(null);
  // Tài khoản đang PendingActivation và đã có sẵn 1 gói PendingActivation -> chặn mua thêm
  const [blockedByPendingPackage, setBlockedByPendingPackage] = useState(false);

  // Thư viện ảnh
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState(null);

  // Danh mục máy tập
  const [equipment, setEquipment] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentError, setEquipmentError] = useState(null);

  // Lượng người tập
  const [traffic, setTraffic] = useState({ values: [], labels: [] });
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficError, setTrafficError] = useState(null);

  // Tin tức / thông báo
  const [announcements, setAnnouncements] = useState([]);
  const [anncLoading, setAnncLoading] = useState(true);
  const [anncError, setAnncError] = useState(null);
  // Tin tức đang được chọn để xem đầy đủ trong modal (null = đang đóng)
  const [selectedAnnc, setSelectedAnnc] = useState(null);

  const loadTraffic = useCallback(async (branchId) => {
    setTrafficLoading(true);
    setTrafficError(null);
    try {
      const data = await fetchTraffic(branchId);
      setTraffic(data);
    } catch (err) {
      setTrafficError(err);
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  // Tải chi nhánh, gói tập, gallery, máy tập ngay khi vào trang
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBranchesLoading(true);
      setBranchesError(null);
      try {
        const data = await fetchBranches();
        if (!cancelled) {
          setBranches(data);
          setActiveBranch(data[0] || null);
        }
      } catch (err) {
        if (!cancelled) setBranchesError(err);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();

    (async () => {
      setPackagesLoading(true);
      setPackagesError(null);
      try {
        const data = await fetchPackages();
        if (!cancelled) setPackages(data);
      } catch (err) {
        if (!cancelled) setPackagesError(err);
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();

    (async () => {
      setGalleryLoading(true);
      setGalleryError(null);
      try {
        const data = await fetchGallery();
        if (!cancelled) setGallery(data);
      } catch (err) {
        if (!cancelled) setGalleryError(err);
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    })();

    (async () => {
      setEquipmentLoading(true);
      setEquipmentError(null);
      try {
        const data = await fetchEquipment();
        if (!cancelled) setEquipment(data);
      } catch (err) {
        if (!cancelled) setEquipmentError(err);
      } finally {
        if (!cancelled) setEquipmentLoading(false);
      }
    })();

    (async () => {
      setAnncLoading(true);
      setAnncError(null);
      try {
        const data = await fetchAnnouncements();
        if (!cancelled) setAnnouncements(data);
      } catch (err) {
        if (!cancelled) setAnncError(err);
      } finally {
        if (!cancelled) setAnncLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Tải lại lượng người tập mỗi khi chi nhánh đang chọn đổi
  useEffect(() => {
    if (activeBranch?.id) loadTraffic(activeBranch.id);
  }, [activeBranch?.id, loadTraffic]);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Bấm "Chọn gói này" -> kiểm tra theo đúng thứ tự ưu tiên nghiệp vụ, y hệt
  // MembershipPlansPage.handleBuy:
  //   1) Tài khoản đang PendingActivation và đã có sẵn 1 gói Pending (mua online trước đó)
  //      -> CHẶN LUÔN, yêu cầu ra quầy kích hoạt trước.
  //      API thật: memberApi.checkPendingPurchaseStatus() -> GET /api/payment/pending-purchase-status
  //   2) Nếu qua được bước 1 -> kiểm tra tiếp có transaction Pending (đã tạo QR nhưng chưa
  //      chuyển khoản) hay không, để hỏi khách tiếp tục thanh toán đơn cũ hay huỷ.
  //      API thật: memberApi.getPendingPayment() -> GET /api/payment/pending
  //   3) Không vướng gì -> chuyển sang /payment kèm state.plan như cũ.
  const handleBuyPackage = async (p) => {
    const plan = {
      planId: p.id,
      planName: p.name,
      price: p.price,
      durationDays: p.durationDays,
      description: p.rawDescription,
      status: p.status,
      featured: p.highlighted,
    };

    try {
      setCheckingPlanId(p.id);
      setPendingActionError(null);

      const statusRes = await memberApi.checkPendingPurchaseStatus();
      const status = statusRes?.data ?? statusRes;

      // status.canPurchasePackage === false chỉ xảy ra khi tài khoản đang Pending
      // và đã có sẵn 1 gói Pending -> chặn, hiện thông báo, dừng luôn tại đây.
      if (status && status.canPurchasePackage === false) {
        setBlockedByPendingPackage(true);
        return;
      }

      const res = await memberApi.getPendingPayment();
      const pending = res?.data ?? res;

      if (pending?.hasPending) {
        setPendingInfo({ plan, pending });
      } else {
        navigate("/payment", { state: { plan } });
      }
    } catch (err) {
      console.warn("Không kiểm tra được điều kiện mua gói:", err);
      // Lỗi khi kiểm tra thì vẫn cho khách qua trang thanh toán bình thường,
      // trang đó sẽ tự xử lý nếu có vấn đề khi tạo đơn (BE vẫn chặn lại lần nữa
      // nếu thực sự đang bị giới hạn 1 gói Pending).
      navigate("/payment", { state: { plan } });
    } finally {
      setCheckingPlanId(null);
    }
  };

  // Khách chọn "Tiếp tục thanh toán" đơn Pending có sẵn -> qua thẳng trang thanh toán,
  // trang đó sẽ hiển thị lại màn QR với đầy đủ thông tin cá nhân + gói tập của đơn cũ.
  const handleContinuePending = () => {
    if (!pendingInfo) return;
    navigate("/payment", {
      state: { resumePending: true, pending: pendingInfo.pending },
    });
  };

  // Khách chọn "Không" -> hủy giao dịch cũ (dùng chung API hủy với nút hủy ở trang QR),
  // sau đó mới cho qua trang thanh toán để mua gói mới vừa bấm.
  // API thật: memberApi.cancelPayment(orderCode) -> POST /api/payment/cancel/{orderCode}
  const handleCancelPendingAndBuyNew = async () => {
    if (!pendingInfo) return;
    try {
      setSwitchingPlan(true);
      setPendingActionError(null);

      await memberApi.cancelPayment(pendingInfo.pending.orderCode);

      const newPlan = pendingInfo.plan;
      setPendingInfo(null);
      navigate("/payment", { state: { plan: newPlan } });
    } catch (err) {
      console.error("Lỗi khi hủy giao dịch cũ:", err);
      setPendingActionError("Không thể hủy giao dịch cũ. Vui lòng thử lại.");
    } finally {
      setSwitchingPlan(false);
    }
  };

  return (
    <div className="h-page">
      <Header />
      <main>

        {/* ── HERO ── */}
        <section className="h-hero">
          {HERO_IMAGES.map((src, i) => (
            <div key={i} className="h-hero__bg"
              style={{ backgroundImage: `url(${src})`, opacity: i === heroIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
          ))}
          <div className="h-hero__overlay" />
          <AnnouncementRail
            items={announcements}
            loading={anncLoading}
            error={anncError}
            onSelect={setSelectedAnnc}
          />
          <div className="h-hero__inner">
            <p className="h-eyebrow">Không gói PT bắt buộc &middot; Tập theo cách của bạn</p>
            <h1 className="h-hero__title">Tự tập.<br /><span className="h-red">Tự do.</span><br />Tự vượt giới hạn.</h1>
            <p className="h-hero__desc">Không ép lớp, không ép PT — chỉ có bạn, mục tiêu của bạn, và không gian tập đủ chuẩn để bứt phá.</p>
            <a href="/packages" className="h-btn h-btn--primary">Xem gói tập</a>
            <div className="h-hero__dots">
              {HERO_IMAGES.map((_, i) => (
                <button key={i} className={`h-dot${i === heroIdx ? " h-dot--on" : ""}`} onClick={() => setHeroIdx(i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="h-stats">
          {[{ n: "24/7", l: "Giờ hoạt động" }, { n: String(branches.length || 4), l: "Chi nhánh" }, { n: "200+", l: "Máy tập" }, { n: "0", l: "Lớp bắt buộc" }].map((s, i) => (
            <div className="h-stats__item" key={i}>
              <span className="h-stats__num">{s.n}</span>
              <span className="h-stats__lbl">{s.l}</span>
            </div>
          ))}
        </section>

        {/* ── TRAFFIC ── */}
        <section className="h-traffic">
          <div className="h-inner" style={{ maxWidth: 900 }}>
            <div className="h-traffic__hd">
              <div>
                <h2 className="h-title">Lượng người tập theo giờ</h2>
                <p className="h-sub">{activeBranch ? activeBranch.name : "Đang chọn chi nhánh..."} · cập nhật mỗi 15 phút</p>
              </div>
              <div className="h-live"><span className="h-pulse" />Live</div>
            </div>

            {/* Lọc biểu đồ theo chi nhánh */}
            {!branchesLoading && !branchesError && branches.length > 0 && (
              <div className="h-traffic__filter">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`h-chip${activeBranch?.id === b.id ? " h-chip--active" : ""}`}
                    onClick={() => setActiveBranch(b)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            <TrafficChart
              values={traffic.values}
              labels={traffic.labels}
              loading={trafficLoading}
              error={trafficError}
            />
          </div>
        </section>

        {/* ── PACKAGES ── */}
        <section className="h-plans">
          <div className="h-inner">
            <div className="h-head">
              <h2 className="h-title">Gói tập</h2>
              <p className="h-sub">Chọn gói phù hợp — không phụ phí ẩn, không ràng buộc dài hạn.</p>
            </div>

            {packagesLoading && (
              <div className="h-plans__grid">
                {[0, 1, 2].map((i) => <div className="h-plan h-skel" key={i} style={{ minHeight: 300 }} />)}
              </div>
            )}

            {!packagesLoading && packagesError && (
              <p className="h-empty">Không tải được danh sách gói tập. Vui lòng thử lại sau.</p>
            )}

            {!packagesLoading && !packagesError && (
              <div className="h-plans__grid">
                {packages.map(p => (
                  <div className={`h-plan${p.highlighted ? " h-plan--hi" : ""}`} key={p.id}>
                    {p.highlighted && <span className="h-plan__badge">Phổ biến nhất</span>}
                    <h3 className="h-plan__name">{p.name}</h3>
                    <div className="h-plan__price">
                      <span className="h-plan__amt">{fmt(p.price)}</span>
                      <span className="h-plan__per">{p.period}</span>
                    </div>
                    <p className="h-plan__desc">{p.desc}</p>
                    <ul className="h-plan__list">
                      {p.features.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <button
                      type="button"
                      className={`h-btn ${p.highlighted ? "h-btn--primary" : "h-btn--ghost"} h-plan__cta`}
                      disabled={checkingPlanId === p.id}
                      onClick={() => handleBuyPackage(p)}
                    >
                      {checkingPlanId === p.id ? "Đang kiểm tra..." : "Chọn gói này"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <a href="/packages" className="h-btn h-btn--ghost">Xem tất cả gói tập →</a>
            </div>
          </div>
        </section>

        {/* ── GALLERY ── */}
        <section className="h-gallery">
          <div className="h-inner">
            <div className="h-gallery__hd">
              <h2 className="h-title">Không gian tập luyện</h2>
              <a href="/chi-nhanh" className="h-arrow">Xem tất cả chi nhánh →</a>
            </div>

            {galleryLoading && (
              <div className="h-gallery__grid">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div className={`h-gallery__item h-skel${i === 0 ? " h-gallery__item--wide" : ""}`} key={i} />
                ))}
              </div>
            )}

            {!galleryLoading && galleryError && (
              <p className="h-empty">Không tải được hình ảnh phòng tập.</p>
            )}

            {!galleryLoading && !galleryError && (
              <div className="h-gallery__grid">
                {gallery.map((img, i) => (
                  <div className={`h-gallery__item${i === 0 ? " h-gallery__item--wide" : ""}`} key={img.id ?? i}>
                    <img src={img.src} alt={img.label} loading="lazy" />
                    <div className="h-gallery__cap">{img.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── EQUIPMENT ── */}
        <section className="h-equip">
          <div className="h-inner">
            <div className="h-equip__hd">
              <div>
                <h2 className="h-title">Danh mục máy tập</h2>
                <p className="h-sub">Nhập khẩu Mỹ &amp; Châu Âu — bảo trì hàng tuần.</p>
              </div>
              <a href="/may-tap" className="h-btn h-btn--ghost" style={{ whiteSpace: "nowrap" }}>Xem toàn bộ →</a>
            </div>

            {equipmentLoading && (
              <div className="h-equip__grid">
                {[0, 1, 2, 3].map((i) => <div className="h-eq h-skel" key={i} style={{ minHeight: 120 }} />)}
              </div>
            )}

            {!equipmentLoading && equipmentError && (
              <p className="h-empty">Không tải được danh mục máy tập.</p>
            )}

            {!equipmentLoading && !equipmentError && (
              <div className="h-equip__grid">
                {equipment.slice(0, 4).map(eq => (
                  <div className="h-eq" key={eq.categoryId}>
                    <span className="h-eq__icon">{eq.icon}</span>

                    <strong className="h-eq__name">
                      {eq.categoryName}
                    </strong>

                    <p className="h-eq__desc">
                      {eq.description}
                    </p>

                    <span className="h-eq__arr">→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="h-feat">
          <div className="h-inner">
            <h2 className="h-title" style={{ textAlign: "center", marginBottom: 8 }}>Tại sao chọn VTGym?</h2>
            <p className="h-sub" style={{ textAlign: "center", marginBottom: 40 }}>Không điều khoản ẩn. Không ràng buộc. Chỉ có tập luyện.</p>
            <div className="h-feat__grid">
              {[
                { icon: "⚡", title: "Tự do, không ràng buộc", desc: "Bạn chọn giờ, chọn bài, chọn tốc độ. Không lớp cố định, không lịch ép buộc — 24/7 không giới hạn." },
                { icon: "🤝", title: "PT ngoài được chào đón", desc: "Mang PT riêng vào tập? Hoàn toàn được — PT của bạn vào cùng quyền lợi như hội viên thông thường." },
                { icon: "📊", title: "Theo dõi tiến độ", desc: "Check-in một chạm. Thống kê số buổi, calo ước tính, xu hướng tiến bộ hàng tuần." },
                { icon: "🏋️", title: "Thiết bị nhập khẩu", desc: "Máy tập từ Mỹ & Châu Âu, bảo trì định kỳ. Khu tạ, cardio, functional đều đủ chỗ." },
                { icon: "❄️", title: "Môi trường đỉnh", desc: "Máy lạnh toàn khu, wifi 500 Mbps, phòng tắm sạch, tủ khóa cá nhân — một giá, tất cả." },
                { icon: "📍", title: "1 thẻ — 4 chi nhánh", desc: "Thẻ hội viên dùng được ở Quận 1, Quận 7, Bình Thạnh và Thủ Đức. Đến đâu tập đó." },
              ].map((c, i) => (
                <div className="h-card" key={i}>
                  <div className="h-card__icon">{c.icon}</div>
                  <h3 className="h-card__title">{c.title}</h3>
                  <p className="h-card__desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BRANCHES STRIP ── */}
        <section className="h-bstrip">
          <div className="h-inner">
            <div className="h-bstrip__box">
              <h2 className="h-title">{branches.length || 4} chi nhánh trải khắp TP.HCM</h2>
              <p className="h-sub">Một thẻ hội viên — tập được ở tất cả cơ sở, không phụ phí đổi chi nhánh.</p>

              {branchesLoading && (
                <div className="h-bstrip__pills">
                  {[0, 1, 2, 3].map((i) => <div className="h-pill h-skel" key={i} style={{ width: 140, height: 34 }} />)}
                </div>
              )}

              {!branchesLoading && branchesError && (
                <p className="h-empty">Không tải được danh sách chi nhánh.</p>
              )}

              {!branchesLoading && !branchesError && (
                <div className="h-bstrip__pills">
                  {branches.map(b => (
                    <a
                      href={b.href}
                      key={b.id}
                      className={`h-pill${activeBranch?.id === b.id ? " h-pill--active" : ""}`}
                      onClick={(e) => { e.preventDefault(); setActiveBranch(b); }}
                    >
                      <span className="h-pill__dot" />
                      <span>{b.name}</span>
                      <span className="h-pill__arr">→</span>
                    </a>
                  ))}
                </div>
              )}

              <a href="/chi-nhanh" className="h-btn h-btn--primary" style={{ alignSelf: "flex-start" }}>Xem tất cả chi nhánh</a>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      {/* Modal: xem đầy đủ nội dung 1 tin tức được chọn từ hero */}
      {selectedAnnc && (
        <div className="mp-modal-overlay" onClick={() => setSelectedAnnc(null)}>
          <div
            className="mp-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3>{selectedAnnc.title}</h3>
            {selectedAnnc.summary && (
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                {selectedAnnc.summary}
              </p>
            )}
            <p style={{ whiteSpace: "pre-line" }}>{selectedAnnc.content}</p>
            <div className="mp-modal-actions">
              <button className="h-btn h-btn--primary" onClick={() => setSelectedAnnc(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: tài khoản đang chờ kích hoạt và đã có sẵn 1 gói tập Pending -> chặn mua thêm */}
      {blockedByPendingPackage && (
        <div
          className="mp-modal-overlay"
          onClick={() => setBlockedByPendingPackage(false)}
        >
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Bạn đã đăng ký gói tập</h3>
            <p>
              Bạn đã đăng ký một gói tập và đang chờ kích hoạt. Vui lòng đến quầy
              thu ngân tại phòng gym để kích hoạt tài khoản và đăng ký FaceID
              trước khi mua thêm gói khác.
            </p>

            <div className="mp-modal-actions">
              <button
                className="h-btn h-btn--primary"
                onClick={() => setBlockedByPendingPackage(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: phát hiện có giao dịch Pending khi khách bấm "Chọn gói này" */}
      {pendingInfo && (
        <div
          className="mp-modal-overlay"
          onClick={() => !switchingPlan && setPendingInfo(null)}
        >
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Giao dịch chưa hoàn thành</h3>
            <p>
              Bạn có giao dịch <b style={{ color: "var(--text)" }}>#{pendingInfo.pending.orderCode}</b> chưa hoàn thành. Bạn có muốn tiếp tục thanh toán không?
            </p>

            {pendingActionError && (
              <div className="mp-modal-error">{pendingActionError}</div>
            )}

            <div className="mp-modal-actions">
              <button
                className="h-btn h-btn--ghost"
                disabled={switchingPlan}
                onClick={handleCancelPendingAndBuyNew}
              >
                {switchingPlan ? "Đang hủy..." : "Không, hủy giao dịch cũ"}
              </button>
              <button
                className="h-btn h-btn--primary"
                disabled={switchingPlan}
                onClick={handleContinuePending}
              >
                Tiếp tục thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── page shell ── */
        .h-page { background:var(--bg); color:var(--text); min-height:100vh; }

        /* shared utils */
        .h-inner    { max-width:1280px; margin:0 auto; }
        .h-title    { font-family:var(--font-display); font-size:28px; font-weight:800; text-transform:uppercase; letter-spacing:.3px; }
        .h-sub      { font-size:14px; color:var(--text-dim); margin-top:6px; }
        .h-red      { color:var(--accent); }
        .h-arrow    { font-size:13px; font-weight:600; color:var(--steel); transition:color .15s; }
        .h-arrow:hover { color:var(--text); }
        .h-btn      { display:inline-block; padding:13px 26px; border-radius:9px; font-size:14px; font-weight:600; font-family:var(--font-body); border:none; cursor:pointer; transition:transform .15s, box-shadow .15s; }
        .h-btn--primary { background:var(--accent); color:#fff; box-shadow:0 4px 20px rgba(255,79,43,.3); }
        .h-btn--primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(255,79,43,.45); }
        .h-btn--ghost   { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); color:var(--text); }
        .h-btn--ghost:hover { transform:translateY(-2px); border-color:var(--steel); color:var(--steel); }
        .h-btn:disabled { opacity:.5; cursor:not-allowed; }
        .h-btn:disabled:hover { transform:none; box-shadow:none; }
        .h-head     { margin-bottom:28px; text-align:center; }
        .h-head .h-sub { max-width:480px; margin:8px auto 0; }
        .h-empty    { font-size:13.5px; color:var(--text-dim); text-align:center; padding:24px 0; }

        /* generic loading skeleton */
        .h-skel     { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); animation:h-skel-shimmer 1.4s ease infinite; }
        @keyframes h-skel-shimmer { 0%,100%{opacity:.5;} 50%{opacity:1;} }

        /* hero */
        .h-hero     { position:relative; min-height:90vh; display:flex; align-items:center; overflow:hidden; }
        .h-hero__bg { position:absolute; inset:0; background-size:cover; background-position:center; }
        .h-hero__overlay { position:absolute; inset:0; background:linear-gradient(105deg,rgba(8,9,11,.92) 40%,rgba(8,9,11,.5) 100%); }
        .h-hero__inner { position:relative; max-width:660px; padding:110px 32px 90px 7vw; }
        .h-eyebrow  { display:inline-block; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--accent); background:var(--accent-soft); border:1px solid rgba(255,79,43,.25); padding:5px 14px; border-radius:100px; margin-bottom:22px; }
        .h-hero__title { font-family:var(--font-display); font-size:clamp(52px,8vw,96px); font-weight:800; line-height:.98; letter-spacing:-1px; margin:0 0 24px; text-transform:uppercase; }
        .h-hero__desc  { font-size:16px; line-height:1.7; color:var(--text-dim); max-width:480px; margin:0 0 36px; }
        .h-hero__dots  { display:flex; gap:8px; margin-top:36px; }
        .h-dot      { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.2); border:none; cursor:pointer; transition:background .2s,transform .2s; }
        .h-dot--on  { background:var(--accent); transform:scale(1.4); }

        /* hero announcements */
        .h-annc-rail--mobile  { display:none; }
        .h-annc-rail--desktop { position:absolute; top:110px; right:5vw; z-index:3; width:320px; overflow:hidden; border-radius:16px; }

        /* PC: xếp chồng, cuộn dọc mượt (chiều cao khung được set động qua JS, không cắt thẻ) */
        .h-annc-scroll   { display:flex; flex-direction:column; gap:12px; overflow-y:auto; padding-right:2px; scrollbar-width:none; -ms-overflow-style:none; scroll-behavior:smooth; -webkit-overflow-scrolling:touch; scroll-snap-type:y proximity; scroll-padding-block:4px; }
        .h-annc-scroll::-webkit-scrollbar { width:0; height:0; display:none; }
        .h-annc-item     { scroll-snap-align:start; }

        /* Mobile: carousel 1 thẻ/lần, tự chạy, vuốt được, trượt bằng transform (không có thanh cuộn) */
        .h-annc-viewport { overflow:hidden; border-radius:16px; }
        .h-annc-track    { display:flex; transition:transform .5s cubic-bezier(.4,0,.2,1); }
        .h-annc-slide    { flex:0 0 100%; width:100%; box-sizing:border-box; }

        .h-annc          { display:flex; align-items:flex-start; gap:10px; padding:12px 18px; border-radius:16px; background:rgba(20,21,24,.72); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.1); box-shadow:0 6px 24px rgba(0,0,0,.35); box-sizing:border-box; width:100%; min-height:64px; flex-shrink:0; cursor:pointer; transition:border-color .15s,transform .15s; }
        .h-annc:hover    { border-color:var(--steel); transform:translateY(-1px); }
        .h-annc__icon    { flex-shrink:0; font-size:15px; line-height:1; margin-top:1px; }
        .h-annc__body    { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .h-annc__branch  { font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.3px; color:var(--text-dim); }
        .h-annc__text    { font-size:12.5px; line-height:1.45; color:var(--text); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .h-annc--skeleton{ min-height:64px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); border-radius:16px; animation:h-annc-shimmer 1.4s ease infinite; cursor:default; }
        @keyframes h-annc-shimmer { 0%,100%{opacity:.5;} 50%{opacity:1;} }
        .h-annc-dots     { display:flex; gap:6px; justify-content:flex-end; padding-right:2px; margin-top:10px; }
        .h-annc-dotbtn   { width:6px; height:6px; padding:0; border:none; border-radius:50%; background:rgba(255,255,255,.25); cursor:pointer; transition:background .2s,transform .2s; }
        .h-annc-dotbtn--on { background:var(--accent); transform:scale(1.4); }

        /* stats */
        .h-stats    { display:grid; grid-template-columns:repeat(4,1fr); background:var(--bg-soft); border-bottom:1px solid var(--line); }
        .h-stats__item { display:flex; flex-direction:column; align-items:center; gap:4px; padding:22px 10px; border-right:1px solid var(--line); }
        .h-stats__item:last-child { border-right:none; }
        .h-stats__num { font-family:var(--font-display); font-size:32px; font-weight:800; color:var(--accent); }
        .h-stats__lbl { font-size:12px; color:var(--text-dim); text-align:center; }

        /* plans */
        .h-plans    { padding:42px 32px 0; }
        .h-plans__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .h-plan     { position:relative; display:flex; flex-direction:column; gap:14px; background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:30px 24px 26px; transition:transform .2s,border-color .2s; }
        .h-plan:hover { transform:translateY(-4px); border-color:var(--steel); }
        .h-plan--hi { border-color:var(--accent); background:linear-gradient(180deg,var(--accent-soft) 0%,var(--bg-soft) 65%); }
        .h-plan--hi:hover { border-color:var(--accent); }
        .h-plan__badge { position:absolute; top:-12px; left:24px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; padding:4px 12px; border-radius:100px; }
        .h-plan__name  { font-family:var(--font-display); font-size:22px; font-weight:800; text-transform:uppercase; }
        .h-plan__price { display:flex; align-items:baseline; gap:6px; }
        .h-plan__amt   { font-size:26px; font-weight:800; }
        .h-plan__per   { font-size:13px; color:var(--text-dim); }
        .h-plan__desc  { font-size:13.5px; color:var(--text-dim); line-height:1.6; }
        .h-plan__list  { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; flex:1; }
        .h-plan__list li { font-size:13px; padding-left:20px; position:relative; }
        .h-plan__list li::before { content:"✓"; position:absolute; left:0; color:var(--steel); font-weight:700; }
        .h-plan__cta   { width:100%; text-align:center; }

        /* gallery */
        .h-gallery  { padding:72px 32px; }
        .h-gallery__hd { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:24px; }
        .h-gallery__grid { display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:240px 240px; gap:10px; }
        .h-gallery__item { position:relative; overflow:hidden; border-radius:var(--radius); background:var(--bg-elevated); }
        .h-gallery__item--wide { grid-column:1/3; grid-row:1/3; }
        .h-gallery__item img { width:100%; height:100%; object-fit:cover; transition:transform .5s ease; display:block; }
        .h-gallery__item:hover img { transform:scale(1.04); }
        .h-gallery__cap { position:absolute; bottom:0; left:0; right:0; padding:10px 14px; background:linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%); font-size:13px; font-weight:600; color:#fff; }

        /* equipment */
        .h-equip    { padding:0 32px 72px; }
        .h-equip__hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
        .h-equip__grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .h-eq       { display:flex; flex-direction:column; gap:8px; padding:22px 20px; border-radius:var(--radius); background:var(--bg-soft); border:1px solid var(--line); transition:border-color .2s,transform .2s; position:relative; }
        .h-eq:hover { border-color:var(--steel); transform:translateY(-3px); }
        .h-eq__icon { font-size:26px; }
        .h-eq__name { font-size:15px; font-weight:700; }
        .h-eq__desc { font-size:12.5px; color:var(--text-dim); line-height:1.5; flex:1; }
        .h-eq__arr  { position:absolute; top:20px; right:18px; color:var(--text-dim); font-size:16px; transition:color .2s,transform .2s; }
        .h-eq:hover .h-eq__arr { color:var(--steel); transform:translateX(3px); }

        /* traffic */
        .h-traffic  { padding:64px 32px 0px; }
        .h-traffic__hd { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; flex-wrap:wrap; }
        .h-live     { display:flex; align-items:center; gap:7px; padding:6px 14px; border-radius:100px; background:rgba(91,184,204,.1); border:1px solid rgba(91,184,204,.2); color:var(--steel); font-size:12px; font-weight:700; flex-shrink:0; }
        .h-pulse    { width:7px; height:7px; border-radius:50%; background:var(--steel); animation:h-pulse 1.6s ease infinite; }
        @keyframes h-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.65)} }
        .h-traffic__filter { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
        .h-chip     { padding:8px 16px; border-radius:100px; background:var(--bg-elevated); border:1px solid var(--line); font-size:13px; font-weight:600; color:var(--text-dim); cursor:pointer; transition:border-color .15s,color .15s,background .15s; }
        .h-chip:hover { border-color:var(--steel); color:var(--text); }
        .h-chip--active { border-color:var(--accent); background:var(--accent-soft); color:var(--text); }
        .h-chart    { background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:24px 28px 16px; }
        .h-chart--state { display:flex; align-items:center; justify-content:center; height:140px; font-size:13px; color:var(--text-dim); }
        .h-chart--err  { color:var(--accent); }
        .h-chart__bars { display:flex; align-items:flex-end; gap:14px; height:140px; }
        .h-chart__col  { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; }
        .h-chart__val  { font-size:12px; font-weight:700; }
        .h-chart__wrap { flex:1; width:100%; display:flex; align-items:flex-end; background:var(--bg-elevated); border-radius:6px; overflow:hidden; }
        .h-chart__bar  { width:100%; border-radius:6px 6px 0 0; transition:height .6s cubic-bezier(.34,1.56,.64,1); min-height:4px; }
        .h-chart__lbl  { font-size:11px; color:var(--text-dim); white-space:nowrap; }
        .h-chart__note { font-size:12px; color:var(--text-dim); margin-top:12px; text-align:right; }

        /* features */
        .h-feat     { padding:0 32px 72px; }
        .h-feat__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .h-card     { background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:24px 22px; transition:transform .2s,border-color .2s; }
        .h-card:hover { transform:translateY(-4px); border-color:rgba(255,79,43,.3); }
        .h-card__icon  { font-size:22px; margin-bottom:12px; }
        .h-card__title { font-size:15px; font-weight:700; margin-bottom:9px; }
        .h-card__desc  { font-size:13.5px; line-height:1.65; color:var(--text-dim); }

        /* branches strip */
        .h-bstrip   { padding:0 32px 80px; }
        .h-bstrip__box { background:var(--bg-soft); border:1px solid var(--line); border-radius:16px; padding:36px 40px; display:flex; flex-direction:column; gap:20px; }
        .h-bstrip__pills { display:flex; flex-wrap:wrap; gap:10px; }
        .h-pill     { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border-radius:9px; background:var(--bg-elevated); border:1px solid var(--line); font-size:13.5px; font-weight:500; color:var(--text-dim); transition:border-color .2s,color .2s; text-decoration:none; }
        .h-pill:hover { border-color:var(--steel); color:var(--text); }
        .h-pill--active { border-color:var(--accent); color:var(--text); }
        .h-pill__dot { width:8px; height:8px; border-radius:50%; background:var(--steel); flex-shrink:0; }
        .h-pill__arr { color:var(--text-dim); margin-left:4px; font-size:14px; }

        /* modal: dùng chung style cho "tin tức", "gói Pending" + "giao dịch Pending" */
        .mp-modal-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(2px);
          display:flex; align-items:center; justify-content:center; z-index:50; padding:16px;
        }
        .mp-modal{
          background: var(--bg-soft, #171718); border:1px solid var(--line, #2a2a2c); border-radius:14px;
          padding:24px; width:100%; max-width:400px; animation: mpFade .2s ease;
        }
        @keyframes mpFade{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }
        .mp-modal h3{ font-family: var(--font-display, 'Oswald'); margin:0 0 10px; font-size:19px; text-transform:uppercase; }
        .mp-modal p{ color: var(--text-dim, #9a9a9e); font-size:13.5px; line-height:1.6; margin:0; }
        .mp-modal-error{ color: var(--accent, #ff4f2b); font-size:12.5px; margin-top:12px; }
        .mp-modal-actions{ display:flex; gap:10px; margin-top:20px; }
        .mp-modal-actions .h-btn{ flex:1; }

        /* responsive */
        @media (max-width:1024px) {
          .h-equip__grid  { grid-template-columns:repeat(2,1fr); }
          .h-plans__grid  { grid-template-columns:1fr 1fr; }
          .h-plan--hi     { grid-column:1/3; }
          .h-annc-rail--desktop { width:280px; right:24px; top:90px; }
        }
        @media (max-width:900px) {
          .h-feat__grid   { grid-template-columns:1fr 1fr; }
          .h-gallery__grid{ grid-template-columns:1fr 1fr; grid-template-rows:200px 200px 200px; }
          .h-gallery__item--wide { grid-column:1/3; grid-row:1/2; }
        }
        @media (max-width:700px) {
          .h-stats        { grid-template-columns:repeat(2,1fr); }
          .h-stats__item:nth-child(2) { border-right:none; }
          .h-stats__item:nth-child(1),.h-stats__item:nth-child(2) { border-bottom:1px solid var(--line); }
          .h-hero        { flex-direction:column; align-items:stretch; padding-top:88px; min-height:0; }
          .h-hero__inner  { order:1; padding:24px 20px 32px; max-width:none; }
          .h-annc-rail--desktop { display:none; }
          .h-annc-rail--mobile  { display:flex; flex-direction:column; gap:10px; order:2; position:static; z-index:1; width:auto; margin:0 20px 24px; }
          .h-annc-dots    { justify-content:center; }
          .h-annc         { padding:10px 14px; }
          .h-gallery,.h-plans,.h-equip,.h-traffic,.h-feat,.h-bstrip { padding-left:18px; padding-right:18px; }
          .h-plans__grid  { grid-template-columns:1fr; }
          .h-plan--hi     { grid-column:auto; }
          .h-equip__grid  { grid-template-columns:1fr 1fr; }
          .h-feat__grid   { grid-template-columns:1fr; }
          .h-gallery__grid{ grid-template-columns:1fr; grid-template-rows:auto; }
          .h-gallery__item{ height:200px; }
          .h-gallery__item--wide { grid-column:auto; grid-row:auto; }
          .h-bstrip__box  { padding:24px 22px; }
          .h-chart__bars  { gap:8px; }
        }
      `}</style>
    </div >
  );
}