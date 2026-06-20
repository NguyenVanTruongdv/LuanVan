import React, { useEffect, useState, useMemo } from "react";
import { MapPin, Search, Phone, Loader2, AlertCircle, ExternalLink } from "lucide-react";

// ===== CẤU HÌNH =====
// 👉 Thay URL này bằng endpoint API thực tế trả về danh sách chi nhánh
const API_URL = "https://your-api.com/api/branches";

// Lấy giá trị field linh hoạt, hỗ trợ nhiều tên field khác nhau tuỳ theo
// API/Database của bạn đặt tên (vd: "address" hoặc "diaChi")
function getField(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

// Tạo link Google Maps cho 1 chi nhánh.
// Ưu tiên: link có sẵn trong DB > toạ độ lat/lng > địa chỉ dạng text
function getGoogleMapsUrl(branch) {
  const directUrl = getField(branch, ["googleMapsUrl", "mapUrl", "gmapUrl", "map_url"]);
  if (directUrl) return directUrl;

  const lat = getField(branch, ["lat", "latitude", "vido"]);
  const lng = getField(branch, ["lng", "longitude", "kinhdo"]);
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const address = getField(branch, ["address", "diaChi", "dia_chi", "location"]);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchBranches() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`Lỗi ${res.status}: không thể tải danh sách chi nhánh`);
        const data = await res.json();
        // Hỗ trợ cả trường hợp API trả mảng trực tiếp hoặc bọc trong { data: [...] }
        const list = Array.isArray(data) ? data : data.data || data.branches || data.results || [];
        if (!cancelled) setBranches(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "Đã có lỗi xảy ra khi tải dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return branches;
    const q = search.toLowerCase();
    return branches.filter((b) => {
      const name = getField(b, ["name", "tenChiNhanh", "ten_chi_nhanh"]).toLowerCase();
      const address = getField(b, ["address", "diaChi", "dia_chi", "location"]).toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  }, [branches, search]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Hệ thống chi nhánh</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tìm địa chỉ và mở chỉ đường Google Maps cho từng chi nhánh.
          </p>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc địa chỉ chi nhánh..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-slate-400"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tải danh sách chi nhánh...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Không tải được dữ liệu</p>
              <p className="mt-0.5 text-red-600">{error}</p>
              <p className="mt-1 text-red-400">
                Kiểm tra lại API_URL ở đầu file và đảm bảo endpoint cho phép gọi từ trình duyệt (CORS).
              </p>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-400">Không tìm thấy chi nhánh phù hợp.</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((branch, idx) => {
              const id = getField(branch, ["id", "_id", "branchId"], idx);
              const name = getField(branch, ["name", "tenChiNhanh", "ten_chi_nhanh"], "Chi nhánh");
              const address = getField(branch, ["address", "diaChi", "dia_chi", "location"], "Chưa cập nhật địa chỉ");
              const phone = getField(branch, ["phone", "soDienThoai", "so_dien_thoai", "hotline"]);
              const mapsUrl = getGoogleMapsUrl(branch);

              return (
                <li
                  key={id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{name}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{address}</p>
                      {phone && (
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          {phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    Xem bản đồ
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}