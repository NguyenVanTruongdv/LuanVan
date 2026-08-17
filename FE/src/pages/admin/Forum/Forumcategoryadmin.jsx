import {
    Activity,
    AlertTriangle,
    Apple,
    Award,
    Bell,
    Bike,
    BookOpen,
    Calendar,
    Camera,
    Check, ChevronDown,
    Coffee, Droplet,
    Dumbbell,
    Flame,
    Folder,
    Heart,
    HelpCircle,
    Home,
    Loader2,
    Medal,
    MessageCircle,
    Music,
    Pencil,
    Plus,
    Salad,
    Search,
    ShieldCheck, Smile,
    Star,
    Target,
    ThumbsUp,
    Timer,
    Trash2,
    TrendingUp,
    Trophy, Users,
    Utensils,
    X,
    Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import adminApi from "../../../api/adminApi";

/* ---------------------------------------------------------
   ICON MAP
   Chỉ lưu TÊN icon (string) trong database (vd: "Dumbbell").
   Khi render, tra map này để lấy component tương ứng.
--------------------------------------------------------- */
const ICON_MAP = {
    Dumbbell, Apple, MessageCircle, HelpCircle, Heart, Utensils,
    Activity, Trophy, Users, Flame, Zap, Target, Calendar, Star,
    Bell, BookOpen, Coffee, Droplet, Home, ShieldCheck, Smile,
    ThumbsUp, TrendingUp, Award, Music, Camera, Salad, Bike,
    Timer, Medal, Folder
};
const ICON_NAMES = Object.keys(ICON_MAP);

/* ---------------------------------------------------------
   PALETTE THEO DANH MỤC
   Mỗi danh mục được gán 1 màu theo id để bảng đỡ đơn điệu.
--------------------------------------------------------- */
const CAT_PALETTE = [
    { accent: "#16a34a", soft: "#e8f7ee" }, // green
    { accent: "#2563eb", soft: "#eaf1ff" }, // blue
    { accent: "#f59e0b", soft: "#fef3e2" }, // orange
    { accent: "#8b5cf6", soft: "#f3edff" }, // purple
    { accent: "#e11d48", soft: "#fdecee" }, // red
    { accent: "#0891b2", soft: "#e3f7fb" }, // cyan
    { accent: "#db2777", soft: "#fde7f3" }, // pink
    { accent: "#65a30d", soft: "#f0f7e3" }, // lime
];

function getCatColor(cat) {
    const seed = cat?.categoryId ?? cat?.categoryName?.length ?? 0;
    return CAT_PALETTE[seed % CAT_PALETTE.length];
}

function CategoryIcon({ name, size = 18, className = "" }) {
    const Comp = ICON_MAP[name] || Folder;
    return <Comp size={size} className={className} />;
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN");
}

// Backend (ForumCategoryDto) không có field "slug" - chỉ hiển thị tên/icon/thứ tự/trạng thái.
const emptyForm = { categoryId: null, categoryName: "", icon: "Folder", displayOrder: 1, status: "Active" };

export default function ForumCategoryAdmin() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [statusTab, setStatusTab] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [iconSearch, setIconSearch] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2600);
    };

    // Luôn lấy cả Active + Inactive (includeInactive=true), lọc theo tab ở client
    // để chuyển tab không cần gọi lại API.
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await adminApi.getForumCategories(true);
            // authApi.get có thể trả về response Axios (res.data là mảng)
            // hoặc trả thẳng dữ liệu đã unwrap (res đã là mảng) - xử lý cả 2 trường hợp
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            setCategories(list);
        } catch (err) {
            console.error(err);
            setLoadError("Không thể tải danh sách danh mục. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const stats = useMemo(() => ({
        total: categories.length,
        active: categories.filter(c => c.status === "Active").length,
        inactive: categories.filter(c => c.status === "Inactive").length,
        posts: categories.reduce((sum, c) => sum + (c.postCount || 0), 0),
    }), [categories]);

    const filtered = useMemo(() => {
        return categories
            .filter(c => statusTab === "all" ? true : c.status === statusTab)
            .filter(c => c.categoryName.toLowerCase().includes(search.trim().toLowerCase()))
            .sort((a, b) => a.displayOrder - b.displayOrder);
    }, [categories, search, statusTab]);

    const openCreate = () => {
        setForm({ ...emptyForm, displayOrder: categories.length + 1 });
        setErrors({});
        setShowForm(true);
    };

    const openEdit = (cat) => {
        setForm({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            icon: cat.icon,
            displayOrder: cat.displayOrder,
            status: cat.status,
        });
        setErrors({});
        setShowForm(true);
    };

    const closeForm = () => setShowForm(false);

    const handleNameChange = (value) => {
        setForm(f => ({ ...f, categoryName: value }));
    };

    const validate = () => {
        const errs = {};
        if (!form.categoryName.trim()) errs.categoryName = "Tên danh mục không được để trống";
        else if (categories.some(c => c.categoryName.toLowerCase() === form.categoryName.trim().toLowerCase() && c.categoryId !== form.categoryId))
            errs.categoryName = "Tên danh mục đã tồn tại";
        if (!form.displayOrder || form.displayOrder < 1) errs.displayOrder = "Thứ tự phải lớn hơn 0";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (form.categoryId) {
                await adminApi.updateForumCategory(form.categoryId, {
                    categoryName: form.categoryName.trim(),
                    icon: form.icon,
                    displayOrder: form.displayOrder,
                    status: form.status,
                });
                showToast("Đã cập nhật danh mục");
            } else {
                await adminApi.createForumCategory({
                    categoryName: form.categoryName.trim(),
                    icon: form.icon,
                    displayOrder: form.displayOrder,
                });
                showToast("Đã thêm danh mục mới");
            }
            setShowForm(false);
            await fetchCategories();
        } catch (err) {
            const message = err?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
            showToast(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat) => {
        try {
            await adminApi.deleteForumCategory(cat.categoryId);
            showToast("Đã xóa danh mục");
            setConfirmDelete(null);
            await fetchCategories();
        } catch (err) {
            const message = err?.response?.data?.message || "Không thể xóa vì vẫn còn bài viết thuộc danh mục này";
            showToast(message, "error");
            setConfirmDelete(null);
        }
    };

    const toggleStatus = async (cat) => {
        const nextStatus = cat.status === "Active" ? "Inactive" : "Active";
        // update lạc quan trên UI, rollback nếu lỗi
        setCategories(prev => prev.map(c => c.categoryId === cat.categoryId ? { ...c, status: nextStatus } : c));
        try {
            await adminApi.updateForumCategory(cat.categoryId, {
                categoryName: cat.categoryName,
                icon: cat.icon,
                displayOrder: cat.displayOrder,
                status: nextStatus,
            });
        } catch (err) {
            setCategories(prev => prev.map(c => c.categoryId === cat.categoryId ? { ...c, status: cat.status } : c));
            showToast("Không thể đổi trạng thái, vui lòng thử lại", "error");
        }
    };

    const visibleIcons = ICON_NAMES.filter(n => n.toLowerCase().includes(iconSearch.trim().toLowerCase()));

    return (
        <div className="fc-page">
            <style>{`
        .fc-page {
          --primary: #16a34a;
          --primary-dark: #0f8a3c;
          --primary-soft: #e8f7ee;
          --blue: #2563eb;
          --blue-soft: #eaf1ff;
          --orange: #f59e0b;
          --orange-soft: #fef3e2;
          --purple: #8b5cf6;
          --purple-soft: #f3edff;
          --red: #e11d48;
          --red-soft: #fdecee;
          --ink: #1f2937;
          --muted: #6b7280;
          --line: #eef1f0;
          --bg: #f6f8f8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: var(--ink);
          background: var(--bg);
          min-height: 100vh;
          padding: 28px 32px;
          box-sizing: border-box;
        }
        .fc-page * { box-sizing: border-box; }

        .fc-header { margin-bottom: 22px; }
        .fc-header h1 { font-size: 26px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px; }
        .fc-header p { margin: 0; color: var(--muted); font-size: 14.5px; }

        .fc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }
        .fc-stat-card {
          background: #fff; border-radius: 16px; padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
          box-shadow: 0 1px 2px rgba(16,24,40,.04);
          border-left: 4px solid var(--accent);
        }
        .fc-stat-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: var(--accent-soft); color: var(--accent); flex-shrink: 0;
        }
        .fc-stat-label { color: var(--muted); font-size: 13px; margin: 0 0 2px; }
        .fc-stat-value { font-size: 22px; font-weight: 800; margin: 0; }

        .fc-toolbar {
          background: #fff; border-radius: 18px; padding: 18px 20px;
          box-shadow: 0 1px 2px rgba(16,24,40,.04); margin-bottom: 18px;
          border-top: 3px solid var(--primary);
        }
        .fc-toolbar-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .fc-search {
          flex: 1; min-width: 240px; display: flex; align-items: center; gap: 10px;
          background: var(--bg); border: 1px solid var(--line); border-radius: 12px;
          padding: 10px 14px; color: var(--muted);
        }
        .fc-search input { border: none; background: transparent; outline: none; width: 100%; font-size: 14px; color: var(--ink); }
        .fc-search svg { flex-shrink: 0; }

        .fc-tabs { display: flex; gap: 8px; }
        .fc-tab {
          border: 1px solid transparent; background: var(--bg); color: var(--muted);
          padding: 9px 16px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .fc-tab.active { background: var(--primary); color: #fff; box-shadow: 0 4px 10px rgba(22,163,74,.28); }
        .fc-tab:hover:not(.active) { background: #ecefee; border-color: var(--line); }

        .fc-add-btn {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border: none;
          padding: 10px 18px; border-radius: 12px; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all .15s; white-space: nowrap;
          box-shadow: 0 4px 12px rgba(22,163,74,.3);
        }
        .fc-add-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .fc-add-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        .fc-table-wrap {
          background: #fff; border-radius: 18px; overflow: hidden;
          box-shadow: 0 1px 2px rgba(16,24,40,.04);
          border: 1px solid var(--line);
        }
        table.fc-table { width: 100%; border-collapse: collapse; }
        .fc-table thead th {
          text-align: left; font-size: 12.5px; text-transform: uppercase;
          letter-spacing: .04em; color: #fff; font-weight: 700;
          padding: 14px 20px;
          background: linear-gradient(135deg, var(--primary), #0d7a35);
        }
        .fc-table thead th:first-child { border-top-left-radius: 0; }
        .fc-table tbody td { padding: 14px 20px; border-bottom: 1px solid var(--line); font-size: 14px; vertical-align: middle; }
        .fc-table tbody tr:last-child td { border-bottom: none; }
        .fc-table tbody tr { border-left: 4px solid transparent; transition: background .15s, border-color .15s; }
        .fc-table tbody tr:hover { background: #fafcfb; border-left-color: var(--row-accent, var(--primary)); }

        .fc-cat-cell { display: flex; align-items: center; gap: 12px; }
        .fc-cat-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--cat-soft, var(--primary-soft)); color: var(--cat-accent, var(--primary));
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.03);
        }
        .fc-cat-name { font-weight: 700; margin: 0; }

        .fc-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 700;
          cursor: pointer; user-select: none; border: 1.5px solid transparent;
        }
        .fc-badge.active { background: var(--primary-soft); color: var(--primary); border-color: rgba(22,163,74,.25); }
        .fc-badge.inactive { background: #f1f2f4; color: var(--muted); border-color: rgba(107,114,128,.2); }
        .fc-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        .fc-order-pill {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--cat-soft, var(--bg)); color: var(--cat-accent, var(--ink));
          font-weight: 800; font-size: 13px;
        }

        .fc-actions { display: flex; gap: 8px; }
        .fc-icon-btn {
          width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--line);
          background: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--muted); transition: all .15s;
        }
        .fc-icon-btn:hover { background: var(--blue-soft); color: var(--blue); border-color: rgba(37,99,235,.25); }
        .fc-icon-btn.danger:hover { background: var(--red-soft); color: var(--red); border-color: rgba(225,29,72,.25); }

        .fc-empty, .fc-loading { padding: 60px 20px; text-align: center; color: var(--muted); }
        .fc-empty p, .fc-loading p { margin: 4px 0 0; font-size: 14px; }
        .fc-spin { animation: fc-spin 1s linear infinite; }
        @keyframes fc-spin { to { transform: rotate(360deg); } }

        /* Overlay & Modal */
        .fc-overlay {
          position: fixed; inset: 0; background: rgba(17, 24, 28, .45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px; backdrop-filter: blur(2px);
        }
        .fc-modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 460px;
          max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.25);
          border-top: 4px solid var(--primary);
        }
        .fc-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 22px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: #fff;
        }
        .fc-modal-header h2 { font-size: 17px; font-weight: 800; margin: 0; }
        .fc-close-btn {
          width: 32px; height: 32px; border-radius: 9px; border: none; background: var(--bg);
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--muted);
        }
        .fc-close-btn:hover { background: #ecefee; color: var(--ink); }

        .fc-modal-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
        .fc-field label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 7px; color: var(--ink); }
        .fc-field input, .fc-field select {
          width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line);
          font-size: 14px; outline: none; transition: border-color .15s; background: #fff; color: var(--ink);
        }
        .fc-field input:focus, .fc-field select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(22,163,74,.12); }
        .fc-field .fc-hint { font-size: 12px; color: var(--muted); margin-top: 5px; }
        .fc-field .fc-error { font-size: 12px; color: var(--red); margin-top: 5px; }

        .fc-icon-pick-trigger {
          display: flex; align-items: center; gap: 12px; padding: 11px 13px;
          border: 1px solid var(--line); border-radius: 10px; cursor: pointer; background: #fff;
        }
        .fc-icon-pick-trigger:hover { border-color: var(--primary); }
        .fc-icon-pick-trigger .fc-cat-icon { width: 32px; height: 32px; }
        .fc-icon-pick-trigger span { font-size: 13.5px; color: var(--muted); flex: 1; }

        .fc-status-toggle { display: flex; gap: 10px; }
        .fc-status-opt {
          flex: 1; text-align: center; padding: 10px; border-radius: 10px; border: 1px solid var(--line);
          cursor: pointer; font-size: 13.5px; font-weight: 700; color: var(--muted); transition: all .15s;
        }
        .fc-status-opt.selected.active-opt { background: var(--primary-soft); border-color: var(--primary); color: var(--primary); }
        .fc-status-opt.selected.inactive-opt { background: #f1f2f4; border-color: #d7dad9; color: var(--ink); }

        .fc-modal-footer {
          display: flex; gap: 10px; padding: 18px 22px; border-top: 1px solid var(--line);
          position: sticky; bottom: 0; background: #fff;
        }
        .fc-btn {
          flex: 1; padding: 12px; border-radius: 11px; font-size: 14px; font-weight: 700;
          border: none; cursor: pointer; transition: all .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .fc-btn.ghost { background: var(--bg); color: var(--ink); }
        .fc-btn.ghost:hover { background: #ecefee; }
        .fc-btn.primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,.3); }
        .fc-btn.primary:hover { filter: brightness(1.05); }
        .fc-btn.primary:disabled { opacity: .7; cursor: not-allowed; }
        .fc-btn.danger { background: linear-gradient(135deg, var(--red), #b8123c); color: #fff; box-shadow: 0 4px 12px rgba(225,29,72,.3); }
        .fc-btn.danger:hover { filter: brightness(1.05); }

        /* Icon picker modal */
        .fc-icon-modal { max-width: 520px; }
        .fc-icon-search {
          margin: 0 22px 14px; display: flex; align-items: center; gap: 10px;
          background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px;
        }
        .fc-icon-search input { border: none; background: transparent; outline: none; width: 100%; font-size: 13.5px; }
        .fc-icon-grid {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;
          padding: 0 22px 22px; max-height: 320px; overflow-y: auto;
        }
        .fc-icon-opt {
          width: 100%; aspect-ratio: 1; border-radius: 12px; border: 1.5px solid var(--line);
          background: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ink); transition: all .12s; position: relative;
        }
        .fc-icon-opt:hover { border-color: var(--primary); background: var(--primary-soft); }
        .fc-icon-opt.selected { border-color: var(--primary); background: var(--primary); color: #fff; }
        .fc-icon-opt.selected::after {
          content: ''; position: absolute; top: -5px; right: -5px; width: 16px; height: 16px;
          background: var(--primary); border-radius: 50%; border: 2px solid #fff;
        }

        /* Confirm delete */
        .fc-confirm-icon {
          width: 52px; height: 52px; border-radius: 14px; background: var(--red-soft); color: var(--red);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
        }
        .fc-confirm-body { padding: 26px 22px 6px; text-align: center; }
        .fc-confirm-body h2 { font-size: 16.5px; margin: 0 0 8px; }
        .fc-confirm-body p { font-size: 13.5px; color: var(--muted); margin: 0; line-height: 1.5; }

        /* Toast */
        .fc-toast {
          position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
          padding: 13px 22px; border-radius: 12px; font-size: 14px; font-weight: 600;
          box-shadow: 0 10px 30px rgba(0,0,0,.18); z-index: 1100;
          display: flex; align-items: center; gap: 10px; color: #fff;
        }
        .fc-toast.success { background: var(--primary); }
        .fc-toast.error { background: var(--red); }

        @media (max-width: 900px) {
          .fc-stats { grid-template-columns: repeat(2, 1fr); }
          .fc-table thead { display: none; }
          .fc-table, .fc-table tbody, .fc-table tbody tr, .fc-table tbody td { display: block; width: 100%; }
          .fc-table tbody tr { padding: 14px 18px; }
          .fc-table tbody td { border: none; padding: 6px 0; }
        }
      `}</style>

            {/* Header */}
            <div className="fc-header">
                <h1>Danh mục diễn đàn</h1>
                <p>Quản lý các danh mục bài viết trong cộng đồng hội viên.</p>
            </div>

            {/* Stats */}
            <div className="fc-stats">
                <div className="fc-stat-card" style={{ "--accent": "var(--primary)", "--accent-soft": "var(--primary-soft)" }}>
                    <div className="fc-stat-icon"><Folder size={20} /></div>
                    <div>
                        <p className="fc-stat-label">Tổng danh mục</p>
                        <p className="fc-stat-value">{stats.total}</p>
                    </div>
                </div>
                <div className="fc-stat-card" style={{ "--accent": "var(--blue)", "--accent-soft": "var(--blue-soft)" }}>
                    <div className="fc-stat-icon"><Check size={20} /></div>
                    <div>
                        <p className="fc-stat-label">Đang hoạt động</p>
                        <p className="fc-stat-value">{stats.active}</p>
                    </div>
                </div>
                <div className="fc-stat-card" style={{ "--accent": "var(--orange)", "--accent-soft": "var(--orange-soft)" }}>
                    <div className="fc-stat-icon"><X size={20} /></div>
                    <div>
                        <p className="fc-stat-label">Tạm ngừng</p>
                        <p className="fc-stat-value">{stats.inactive}</p>
                    </div>
                </div>
                <div className="fc-stat-card" style={{ "--accent": "var(--purple)", "--accent-soft": "var(--purple-soft)" }}>
                    <div className="fc-stat-icon"><MessageCircle size={20} /></div>
                    <div>
                        <p className="fc-stat-label">Tổng bài viết</p>
                        <p className="fc-stat-value">{stats.posts}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="fc-toolbar">
                <div className="fc-toolbar-row">
                    <div className="fc-search">
                        <Search size={17} />
                        <input
                            placeholder="Tìm theo tên danh mục..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="fc-tabs">
                        <button className={`fc-tab ${statusTab === "all" ? "active" : ""}`} onClick={() => setStatusTab("all")}>Tất cả</button>
                        <button className={`fc-tab ${statusTab === "Active" ? "active" : ""}`} onClick={() => setStatusTab("Active")}>Hoạt động</button>
                        <button className={`fc-tab ${statusTab === "Inactive" ? "active" : ""}`} onClick={() => setStatusTab("Inactive")}>Tạm ngừng</button>
                    </div>
                    <button className="fc-add-btn" onClick={openCreate} disabled={loading}>
                        <Plus size={17} /> Thêm danh mục
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="fc-table-wrap">
                {loading ? (
                    <div className="fc-loading">
                        <Loader2 size={28} className="fc-spin" style={{ opacity: .5 }} />
                        <p>Đang tải danh mục...</p>
                    </div>
                ) : loadError ? (
                    <div className="fc-empty">
                        <AlertTriangle size={32} style={{ opacity: .4 }} />
                        <p>{loadError}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="fc-empty">
                        <Folder size={32} style={{ opacity: .4 }} />
                        <p>Không tìm thấy danh mục nào phù hợp.</p>
                    </div>
                ) : (
                    <table className="fc-table">
                        <thead>
                            <tr>
                                <th>Danh mục</th>
                                <th>Thứ tự</th>
                                <th>Bài viết</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th style={{ textAlign: "right" }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((cat) => {
                                const color = getCatColor(cat);
                                return (
                                    <tr
                                        key={cat.categoryId}
                                        style={{ "--row-accent": color.accent }}
                                    >
                                        <td>
                                            <div className="fc-cat-cell">
                                                <div
                                                    className="fc-cat-icon"
                                                    style={{ "--cat-soft": color.soft, "--cat-accent": color.accent }}
                                                >
                                                    <CategoryIcon name={cat.icon} size={19} />
                                                </div>
                                                <p className="fc-cat-name">{cat.categoryName}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className="fc-order-pill"
                                                style={{ "--cat-soft": color.soft, "--cat-accent": color.accent }}
                                            >
                                                {cat.displayOrder}
                                            </span>
                                        </td>
                                        <td>{cat.postCount}</td>
                                        <td>
                                            <button
                                                className={`fc-badge ${cat.status === "Active" ? "active" : "inactive"}`}
                                                onClick={() => toggleStatus(cat)}
                                                title="Bấm để đổi trạng thái"
                                            >
                                                <span className="dot" />
                                                {cat.status === "Active" ? "Hoạt động" : "Tạm ngừng"}
                                            </button>
                                        </td>
                                        <td>{formatDate(cat.createdAt)}</td>
                                        <td>
                                            <div className="fc-actions" style={{ justifyContent: "flex-end" }}>
                                                <button className="fc-icon-btn" onClick={() => openEdit(cat)} title="Sửa">
                                                    <Pencil size={16} />
                                                </button>
                                                <button className="fc-icon-btn danger" onClick={() => setConfirmDelete(cat)} title="Xóa">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit form modal */}
            {showForm && (
                <div className="fc-overlay" onClick={closeForm}>
                    <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fc-modal-header">
                            <h2>{form.categoryId ? "Sửa danh mục" : "Thêm danh mục mới"}</h2>
                            <button className="fc-close-btn" onClick={closeForm}><X size={18} /></button>
                        </div>

                        <div className="fc-modal-body">
                            <div className="fc-field">
                                <label>Tên danh mục</label>
                                <input
                                    value={form.categoryName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="VD: Dinh dưỡng"
                                />
                                {errors.categoryName && <p className="fc-error">{errors.categoryName}</p>}
                            </div>

                            <div className="fc-field">
                                <label>Icon</label>
                                <div className="fc-icon-pick-trigger" onClick={() => { setIconSearch(""); setShowIconPicker(true); }}>
                                    <div className="fc-cat-icon"><CategoryIcon name={form.icon} size={17} /></div>
                                    <span>{form.icon}</span>
                                    <ChevronDown size={16} color="var(--muted)" />
                                </div>
                            </div>

                            <div className="fc-field">
                                <label>Thứ tự hiển thị</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.displayOrder}
                                    onChange={(e) => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                                />
                                {errors.displayOrder && <p className="fc-error">{errors.displayOrder}</p>}
                            </div>

                            <div className="fc-field">
                                <label>Trạng thái</label>
                                <div className="fc-status-toggle">
                                    <div
                                        className={`fc-status-opt ${form.status === "Active" ? "selected active-opt" : ""}`}
                                        onClick={() => setForm(f => ({ ...f, status: "Active" }))}
                                    >
                                        Hoạt động
                                    </div>
                                    <div
                                        className={`fc-status-opt ${form.status === "Inactive" ? "selected inactive-opt" : ""}`}
                                        onClick={() => setForm(f => ({ ...f, status: "Inactive" }))}
                                    >
                                        Tạm ngừng
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="fc-modal-footer">
                            <button className="fc-btn ghost" onClick={closeForm} disabled={saving}>Hủy</button>
                            <button className="fc-btn primary" onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 size={15} className="fc-spin" />}
                                {form.categoryId ? "Lưu thay đổi" : "Thêm danh mục"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Icon picker modal */}
            {showIconPicker && (
                <div className="fc-overlay" onClick={() => setShowIconPicker(false)}>
                    <div className="fc-modal fc-icon-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fc-modal-header">
                            <h2>Chọn icon</h2>
                            <button className="fc-close-btn" onClick={() => setShowIconPicker(false)}><X size={18} /></button>
                        </div>
                        <div className="fc-icon-search">
                            <Search size={15} color="var(--muted)" />
                            <input
                                autoFocus
                                placeholder="Tìm icon..."
                                value={iconSearch}
                                onChange={(e) => setIconSearch(e.target.value)}
                            />
                        </div>
                        <div className="fc-icon-grid">
                            {visibleIcons.map((name) => (
                                <button
                                    key={name}
                                    className={`fc-icon-opt ${form.icon === name ? "selected" : ""}`}
                                    title={name}
                                    onClick={() => { setForm(f => ({ ...f, icon: name })); setShowIconPicker(false); }}
                                >
                                    <CategoryIcon name={name} size={19} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className="fc-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="fc-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
                        <div className="fc-confirm-body">
                            <div className="fc-confirm-icon"><AlertTriangle size={24} /></div>
                            <h2>Xóa "{confirmDelete.categoryName}"?</h2>
                            <p>
                                {confirmDelete.postCount > 0
                                    ? `Danh mục này đang có ${confirmDelete.postCount} bài viết. Hãy chuyển bài viết sang danh mục khác trước khi xóa.`
                                    : "Hành động này không thể hoàn tác."}
                            </p>
                        </div>
                        <div className="fc-modal-footer">
                            <button className="fc-btn ghost" onClick={() => setConfirmDelete(null)}>Hủy</button>
                            <button className="fc-btn danger" onClick={() => handleDelete(confirmDelete)}>Xóa danh mục</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fc-toast ${toast.type}`}>
                    {toast.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}