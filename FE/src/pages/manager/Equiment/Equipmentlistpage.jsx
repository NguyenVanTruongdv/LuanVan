// src/pages/manager/Equiment/EquipmentListPage.jsx
//
// Trang danh sách thiết bị — khớp với EquipmentService.GetListAsync / SetStatusAsync.
//
// CẬP NHẬT LẦN NÀY:
// - Đổi theme màu sang bộ Navy/Slate/Cyan đồng bộ với trang login:
//   nền #0B1120, khối/panel #1E293B, viền #334155, điểm nhấn cyan #06B6D4
//   (thay cho gradient tím-indigo cũ), chữ tiêu đề #F1F5F9, chữ phụ
//   #94A3B8 / #64748B.
// - Đổi bố cục hiển thị thiết bị từ dạng LƯỚI THẺ (grid card) sang DẠNG LIST
//   (bảng hàng ngang: ảnh nhỏ | tên + mô tả | danh mục | chi nhánh | trạng thái
//   | hành động), có header cột trên desktop.
// - Responsive cho điện thoại: mỗi hàng list tự bọc lại thành dạng "card dọc",
//   ẩn header cột, hiện nhãn (label) trước từng giá trị, nút hành động full-width.
// - Thay <select> gốc của trình duyệt bằng CustomSelect (tự vẽ dropdown) cho
//   bộ lọc "Danh mục" và "Chi nhánh" -> style được toàn bộ danh sách khi mở,
//   không còn bị giao diện mặc định xấu của browser.
// - BỎ HẲN AddEquipmentPage.jsx. Form "Thêm thiết bị" / "Sửa thiết bị" giờ
//   được viết thẳng trong file này (component EquipmentForm ở dưới) và render
//   ngay trong cùng trang (đổi viewMode, không đổi route, không gọi ra file khác).
// - LƯU Ý QUAN TRỌNG: lỗi "Ẩn/Kích hoạt thiết bị" báo
//     TypeError: authApi.patch is not a function
//   không nằm ở file này, mà do authApi.js hiện chưa có method `patch`.
//   managerApi.hideEquipment / activateEquipmentItem (và cả hideEmployee /
//   activateEmployee) đang gọi authApi.patch(...) nhưng method đó không tồn tại.
//   => Cần bổ sung method `patch` vào authApi.js (gửi file đó để mình sửa khớp
//      với cấu trúc axios instance bạn đang dùng).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import managerApi from "../../../api/managerApi";

const EQUIPMENT_STYLES = `
:root {
    --eqm-navy-900: #0b1120;
    --eqm-navy-800: #1e293b;
    --eqm-navy-700: #24304a;
    --eqm-cyan-500: #06b6d4;
    --eqm-cyan-600: #0891b2;
    --eqm-cyan-100: rgba(6, 182, 212, 0.16);

    --eqm-bg: var(--eqm-navy-900);
    --eqm-surface: var(--eqm-navy-800);
    --eqm-surface-muted: var(--eqm-navy-700);
    --eqm-surface-hover: #2b3a54;
    --eqm-border: #334155;

    --eqm-text-900: #f1f5f9;
    --eqm-text-600: #94a3b8;
    --eqm-text-400: #64748b;

    --eqm-danger: #f87171;
    --eqm-danger-bg: rgba(248, 113, 113, 0.14);
    --eqm-success: #34d399;
    --eqm-success-bg: rgba(52, 211, 153, 0.14);

    --eqm-radius: 14px;
    --eqm-radius-sm: 10px;
    --eqm-shadow: 0 1px 0 rgba(255, 255, 255, 0.03), 0 14px 28px -16px rgba(0, 0, 0, 0.7);
}

.eqm-page {
    min-height: 100%;
    background: var(--eqm-bg);
    padding: 28px 24px 60px;
    color: var(--eqm-text-900);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    position: relative;
}

.eqm-container { max-width: 1180px; margin: 0 auto; }

.eqm-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.eqm-header-titles { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1 1 260px; }
.eqm-header-titles > div { min-width: 0; }
.eqm-header > .eqm-btn-primary { flex-shrink: 0; }
.eqm-header-icon {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.08));
    box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.4);
}
.eqm-header-titles h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--eqm-text-900); }
.eqm-header-titles p { margin: 2px 0 0; font-size: 13.5px; color: var(--eqm-text-400); }

.eqm-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border: none; border-radius: var(--eqm-radius-sm); padding: 10px 18px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: transform 0.05s ease, filter 0.15s ease, background 0.15s ease;
}
.eqm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.eqm-btn:active:not(:disabled) { transform: translateY(1px); }
.eqm-btn-primary { background: linear-gradient(135deg, var(--eqm-cyan-500), var(--eqm-cyan-600)); color: #fff; }
.eqm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.eqm-btn-secondary { background: var(--eqm-surface-muted); color: var(--eqm-text-600); box-shadow: inset 0 0 0 1px var(--eqm-border); }
.eqm-btn-secondary:hover:not(:disabled) { background: var(--eqm-surface-hover); }
.eqm-btn-danger { background: var(--eqm-danger-bg); color: var(--eqm-danger); }
.eqm-btn-danger:hover:not(:disabled) { filter: brightness(0.97); }

.eqm-field { display: flex; flex-direction: column; gap: 6px; }
.eqm-field label { font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--eqm-text-600); }

.eqm-input {
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 10px 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit;
}
.eqm-input:focus { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-input::placeholder { color: var(--eqm-text-400); }

.eqm-filters {
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px;
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    padding: 18px 20px; margin-bottom: 20px;
    border: 1px solid var(--eqm-border);
}
.eqm-filters .eqm-field { min-width: 190px; }

.eqm-checkbox-field { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--eqm-text-600); padding-bottom: 10px; }
.eqm-checkbox-field input { width: 16px; height: 16px; accent-color: var(--eqm-cyan-500); }

/* ---------- Custom dropdown (thay cho <select> gốc) ---------- */
.eqm-dropdown { position: relative; min-width: 190px; }
.eqm-dropdown-trigger {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm);
    padding: 10px 12px; font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface);
    cursor: pointer; font-family: inherit; text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.eqm-dropdown-trigger:hover:not(:disabled) { background: var(--eqm-surface-hover); }
.eqm-dropdown-open .eqm-dropdown-trigger { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-dropdown-trigger:disabled { background: var(--eqm-surface-muted); color: var(--eqm-text-400); cursor: not-allowed; }
.eqm-dropdown-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-dropdown-placeholder { color: var(--eqm-text-400); }
.eqm-dropdown-arrow { flex-shrink: 0; color: var(--eqm-text-400); transition: transform 0.15s ease; }
.eqm-dropdown-open .eqm-dropdown-arrow { transform: rotate(180deg); color: var(--eqm-cyan-500); }

.eqm-dropdown-menu {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 45;
    background: var(--eqm-surface-muted); border: 1px solid var(--eqm-border);
    border-radius: var(--eqm-radius-sm); box-shadow: var(--eqm-shadow);
    max-height: 260px; overflow-y: auto; padding: 6px;
    animation: eqm-dropdown-in 0.12s ease-out;
}
@keyframes eqm-dropdown-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.eqm-dropdown-option {
    padding: 9px 10px; border-radius: 8px; font-size: 13.5px; color: var(--eqm-text-600);
    cursor: pointer; transition: background 0.12s ease, color 0.12s ease;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.eqm-dropdown-option:hover { background: var(--eqm-cyan-100); color: var(--eqm-text-900); }
.eqm-dropdown-option-active { background: var(--eqm-cyan-100); color: var(--eqm-cyan-500); font-weight: 600; }

.eqm-dropdown-menu::-webkit-scrollbar { width: 8px; }
.eqm-dropdown-menu::-webkit-scrollbar-thumb { background: var(--eqm-surface-hover); border-radius: 8px; }

/* ---------- Danh sách dạng LIST (thay cho lưới thẻ) ---------- */
.eqm-list {
    display: flex; flex-direction: column;
    background: var(--eqm-surface); border-radius: var(--eqm-radius);
    box-shadow: var(--eqm-shadow); border: 1px solid var(--eqm-border);
    overflow: hidden;
}

.eqm-list-header, .eqm-list-row {
    display: grid;
    grid-template-columns: 56px minmax(180px, 2.3fr) minmax(110px, 1fr) minmax(110px, 1fr) 108px 190px;
    align-items: center; gap: 16px; padding: 14px 20px;
}
.eqm-list-header {
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    color: var(--eqm-text-400); background: var(--eqm-surface-muted);
    border-bottom: 1px solid var(--eqm-border);
}
.eqm-list-row { border-bottom: 1px solid var(--eqm-border); transition: background 0.12s ease, opacity 0.15s ease; }
.eqm-list-row:last-child { border-bottom: none; }
.eqm-list-row:hover { background: var(--eqm-surface-hover); }
.eqm-list-row-busy { opacity: 0.55; pointer-events: none; }

.eqm-list-thumb {
    width: 52px; height: 52px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
    background: var(--eqm-surface-muted); display: flex; align-items: center; justify-content: center;
}
.eqm-list-thumb img { width: 100%; height: 100%; object-fit: cover; }
.eqm-list-thumb-placeholder { font-size: 17px; opacity: 0.45; }

.eqm-list-main { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.eqm-list-name { font-size: 14.5px; font-weight: 700; color: var(--eqm-text-900); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-list-desc { font-size: 12.5px; color: var(--eqm-text-400); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-list-meta-mobile { display: none; }

.eqm-list-cell { font-size: 13px; color: var(--eqm-text-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eqm-list-cell-label { display: none; }

.eqm-badge { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; display: inline-flex; }
.eqm-badge-active { background: var(--eqm-success-bg); color: var(--eqm-success); }
.eqm-badge-deleted { background: var(--eqm-danger-bg); color: var(--eqm-danger); }

.eqm-list-actions { display: flex; gap: 8px; justify-content: flex-end; }
.eqm-list-actions .eqm-btn { padding: 7px 12px; font-size: 12.5px; }

.eqm-skeleton-row {
    height: 80px;
    background: linear-gradient(100deg, var(--eqm-surface-muted) 30%, var(--eqm-surface-hover) 50%, var(--eqm-surface-muted) 70%);
    background-size: 200% 100%; animation: eqm-shimmer 1.3s ease-in-out infinite;
    border-bottom: 1px solid var(--eqm-border);
}
.eqm-skeleton-row:last-child { border-bottom: none; }
@keyframes eqm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.eqm-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px;
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    border: 1px solid var(--eqm-border);
    padding: 48px 20px; color: var(--eqm-text-400);
}
.eqm-state strong { color: var(--eqm-text-900); font-size: 15px; }
.eqm-state-error strong { color: var(--eqm-danger); }

/* ---------- Toast ---------- */
.eqm-toast-stack {
    position: fixed; top: 20px; right: 20px; z-index: 100;
    display: flex; flex-direction: column; gap: 10px; max-width: 340px;
}
.eqm-toast {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: var(--eqm-radius-sm); box-shadow: var(--eqm-shadow);
    font-size: 13.5px; font-weight: 500; color: #fff;
    animation: eqm-toast-in 0.18s ease-out;
}
.eqm-toast-success { background: #0f3d33; border: 1px solid rgba(52, 211, 153, 0.4); color: #7be8c6; }
.eqm-toast-error { background: #3d1414; border: 1px solid rgba(248, 113, 113, 0.4); color: #ffb3b3; }
@keyframes eqm-toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

/* ---------- Confirm modal ---------- */
.eqm-modal-overlay {
    position: fixed; inset: 0; background: rgba(4, 8, 18, 0.6); z-index: 90;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: eqm-fade-in 0.15s ease-out;
}
@keyframes eqm-fade-in { from { opacity: 0; } to { opacity: 1; } }
.eqm-modal {
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    border: 1px solid var(--eqm-border);
    padding: 22px; max-width: 380px; width: 100%;
}
.eqm-modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--eqm-text-900); }
.eqm-modal p { margin: 0 0 20px; font-size: 13.5px; color: var(--eqm-text-600); line-height: 1.5; }
.eqm-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* ---------- Form Thêm / Sửa thiết bị (inline, không đổi trang) ---------- */
.eqm-back-link {
    display: inline-flex; align-items: center; gap: 6px; background: none; border: none; padding: 0;
    color: var(--eqm-cyan-500); font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 18px;
}
.eqm-back-link:hover { filter: brightness(1.1); text-decoration: underline; }

.eqm-form-card {
    background: var(--eqm-surface); border-radius: var(--eqm-radius); box-shadow: var(--eqm-shadow);
    border: 1px solid var(--eqm-border);
    padding: 26px 26px 24px;
}
.eqm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 4px; }
.eqm-form-grid .eqm-field { min-width: 0; }
.eqm-required { color: var(--eqm-danger); }
.eqm-field-hint { font-size: 12px; color: var(--eqm-text-400); margin-top: -2px; }

.eqm-textarea {
    border: 1px solid var(--eqm-border); border-radius: var(--eqm-radius-sm); padding: 12px;
    font-size: 14px; color: var(--eqm-text-900); background: var(--eqm-surface); outline: none;
    font-family: inherit; resize: vertical; min-height: 96px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.eqm-textarea:focus { border-color: var(--eqm-cyan-500); box-shadow: 0 0 0 3px var(--eqm-cyan-100); }
.eqm-textarea::placeholder { color: var(--eqm-text-400); }

.eqm-field-error { font-size: 12px; color: var(--eqm-danger); }

.eqm-dropzone {
    border: 1.5px dashed var(--eqm-border); border-radius: var(--eqm-radius-sm);
    background: var(--eqm-surface-muted); padding: 26px 16px; display: flex; align-items: center; gap: 14px;
    cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease;
}
.eqm-dropzone:hover, .eqm-dropzone-active {
    border-color: var(--eqm-cyan-500); background: var(--eqm-cyan-100);
}
.eqm-dropzone-icon {
    width: 44px; height: 44px; flex-shrink: 0; border-radius: 10px; background: var(--eqm-surface-hover);
    display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.eqm-dropzone-text strong { display: block; font-size: 14px; color: var(--eqm-text-900); }
.eqm-dropzone-text span { font-size: 12.5px; color: var(--eqm-text-400); }
.eqm-dropzone input[type="file"] { display: none; }

.eqm-image-preview {
    position: relative; display: inline-flex; border-radius: var(--eqm-radius-sm); overflow: hidden;
    border: 1px solid var(--eqm-border); width: 160px; max-width: 100%; height: 120px; background: var(--eqm-navy-700);
}
.eqm-image-preview img { width: 100%; height: 100%; object-fit: cover; }
.eqm-image-remove {
    position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%;
    border: none; background: rgba(4, 8, 18, 0.75); color: #fff; font-size: 14px; line-height: 1;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.eqm-image-remove:hover { background: rgba(4, 8, 18, 0.95); }

.eqm-form-actions {
    display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
    padding-top: 18px; border-top: 1px solid var(--eqm-border);
}
.eqm-form-actions .eqm-btn { min-width: 120px; }

.eqm-form-loading {
    display: flex; align-items: center; justify-content: center; padding: 60px 20px; color: var(--eqm-text-400);
}

/* ================= RESPONSIVE ================= */

/* Tablet ngang / màn nhỏ hơn container tối đa */
@media (max-width: 1024px) {
    .eqm-container { max-width: 100%; }
    .eqm-list-header, .eqm-list-row {
        grid-template-columns: 52px minmax(160px, 2fr) minmax(90px, 1fr) minmax(90px, 1fr) 96px 170px;
        gap: 12px;
    }
}

/* Tablet đứng / mobile ngang: bộ lọc xếp dọc, list chuyển sang dạng "card dọc" */
@media (max-width: 760px) {
    .eqm-page { padding: 20px 16px 48px; }

    .eqm-header { align-items: flex-start; }
    .eqm-header-titles { flex: 1 1 100%; }
    .eqm-header > .eqm-btn-primary { width: 100%; }

    .eqm-filters {
        flex-direction: column; align-items: stretch; padding: 16px;
    }
    .eqm-filters .eqm-field { min-width: 0; width: 100%; }
    .eqm-dropdown { min-width: 0; width: 100%; }
    .eqm-checkbox-field { padding-bottom: 0; }

    /* List -> mỗi hàng tự bọc lại thành 1 "card" dọc, ẩn header cột */
    .eqm-list-header { display: none; }
    .eqm-list-row {
        display: flex; flex-wrap: wrap; align-items: flex-start;
        gap: 4px 14px; padding: 14px 16px;
    }
    .eqm-list-thumb { order: 1; width: 48px; height: 48px; }
    .eqm-list-main { order: 2; flex: 1 1 calc(100% - 62px); min-width: 140px; }
    .eqm-list-name { white-space: normal; }
    .eqm-list-meta-mobile {
        display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
        margin-top: 4px; font-size: 12px; color: var(--eqm-text-400);
    }
    .eqm-list-cell { display: none; }
    .eqm-list-actions {
        order: 4; flex: 1 1 100%; justify-content: stretch; margin-top: 10px;
    }
    .eqm-list-actions .eqm-btn { flex: 1; }

    .eqm-form-card { padding: 20px 18px; }
    .eqm-form-grid { grid-template-columns: 1fr; gap: 16px; }

    .eqm-toast-stack { left: 14px; right: 14px; max-width: none; top: 14px; }
    .eqm-modal { padding: 18px; }
}

/* Điện thoại nhỏ: control full-width, dễ bấm bằng ngón tay */
@media (max-width: 480px) {
    .eqm-header-icon { width: 38px; height: 38px; font-size: 17px; }
    .eqm-header-titles h1 { font-size: 19px; }
    .eqm-header-titles p { font-size: 12.5px; }

    .eqm-list-row { padding: 12px 14px; }
    .eqm-list-actions { flex-direction: column; }

    .eqm-dropzone { flex-direction: column; text-align: center; padding: 22px 14px; }

    .eqm-form-actions { flex-direction: column-reverse; }
    .eqm-form-actions .eqm-btn { width: 100%; }

    .eqm-modal { max-width: none; }
    .eqm-modal-actions { flex-direction: column-reverse; gap: 8px; }
    .eqm-modal-actions .eqm-btn { width: 100%; }
}
`;

const STATUS_ACTIVE = "Active";
const STATUS_DELETED = "Deleted";

// ---------------------------------------------------------------------------
// CustomSelect: dropdown tự vẽ, thay cho <select> gốc để style được toàn bộ
// danh sách khi mở (browser mặc định không cho style phần này).
// ---------------------------------------------------------------------------
function CustomSelect({ value, onChange, options, placeholder, disabled, getOptionValue, getOptionLabel, showAllOption = true }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        function handleOutside(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        function handleEsc(e) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    const selected = options.find((o) => String(getOptionValue(o)) === String(value));
    const label = selected ? getOptionLabel(selected) : placeholder;

    return (
        <div
            className={`eqm-dropdown ${open ? "eqm-dropdown-open" : ""}`}
            ref={rootRef}
        >
            <button
                type="button"
                className="eqm-dropdown-trigger"
                onClick={() => setOpen((o) => !o)}
                disabled={disabled}
            >
                <span className={`eqm-dropdown-label ${selected ? "" : "eqm-dropdown-placeholder"}`}>
                    {label}
                </span>
                <svg className="eqm-dropdown-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && !disabled && (
                <div className="eqm-dropdown-menu" role="listbox">
                    {showAllOption && (
                        <div
                            className={`eqm-dropdown-option ${!value ? "eqm-dropdown-option-active" : ""}`}
                            onClick={() => { onChange(""); setOpen(false); }}
                        >
                            {placeholder}
                        </div>
                    )}
                    {options.map((o) => {
                        const v = getOptionValue(o);
                        const active = String(v) === String(value);
                        return (
                            <div
                                key={v}
                                className={`eqm-dropdown-option ${active ? "eqm-dropdown-option-active" : ""}`}
                                onClick={() => { onChange(v); setOpen(false); }}
                            >
                                {getOptionLabel(o)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Toast: thay cho alert(). Tự biến mất sau vài giây, không chặn thao tác.
// ---------------------------------------------------------------------------
function ToastStack({ toasts }) {
    if (toasts.length === 0) return null;
    return (
        <div className="eqm-toast-stack">
            {toasts.map((t) => (
                <div key={t.id} className={`eqm-toast eqm-toast-${t.type}`}>
                    {t.type === "success" ? "✅" : "⚠️"} {t.message}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal xác nhận: thay cho window.confirm(). Không bị trình duyệt chặn popup.
// ---------------------------------------------------------------------------
function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div className="eqm-modal-overlay" onClick={onCancel}>
            <div className="eqm-modal" onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="eqm-modal-actions">
                    <button className="eqm-btn eqm-btn-secondary" onClick={onCancel}>
                        Huỷ
                    </button>
                    <button className="eqm-btn eqm-btn-primary" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// EquipmentForm: form Thêm mới / Sửa thiết bị — nằm ngay trong trang này,
// không còn tách sang AddEquipmentPage.jsx / route riêng nữa.
// ---------------------------------------------------------------------------
const EMPTY_FORM = { equipmentName: "", categoryId: "", branchId: "", description: "" };

function EquipmentForm({ equipmentId, categories, branches, onSaved, onCancel, pushToast }) {
    const isEdit = Boolean(equipmentId);

    const [loadingDetail, setLoadingDetail] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null); // ảnh mới chọn (object URL) hoặc ảnh cũ (URL từ server)
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        if (!isEdit) {
            setForm(EMPTY_FORM);
            setImagePreview(null);
            setImageFile(null);
            setLoadingDetail(false);
            return;
        }
        setLoadingDetail(true);
        managerApi
            .getEquipmentDetail(equipmentId)
            .then((detail) => {
                if (cancelled || !detail) return;
                setForm({
                    equipmentName: detail.equipmentName ?? "",
                    categoryId: detail.categoryId ?? "",
                    branchId: detail.branchId ?? "",
                    description: detail.description ?? "",
                });
                setImagePreview(detail.imageUrls?.[0] ?? null);
            })
            .catch((err) => {
                console.error("Lỗi tải chi tiết thiết bị:", err?.response?.status, err);
                pushToast("error", "Không tải được thông tin thiết bị để sửa.");
            })
            .finally(() => {
                if (!cancelled) setLoadingDetail(false);
            });
        return () => {
            cancelled = true;
        };
    }, [equipmentId, isEdit, pushToast]);

    // dọn object URL khi đổi ảnh / unmount, tránh leak bộ nhớ
    useEffect(() => {
        return () => {
            if (imageFile && imagePreview) URL.revokeObjectURL(imagePreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageFile]);

    const setField = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const applyFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            pushToast("error", "Chỉ chấp nhận file ảnh (JPG, PNG...).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            pushToast("error", "Ảnh tối đa 5MB.");
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleFileInput = (e) => {
        applyFile(e.target.files?.[0]);
        e.target.value = "";
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        applyFile(e.dataTransfer.files?.[0]);
    };
    const removeImage = (e) => {
        e.stopPropagation();
        setImageFile(null);
        setImagePreview(null);
    };

    const validate = () => {
        const nextErrors = {};
        if (!form.equipmentName.trim()) nextErrors.equipmentName = "Vui lòng nhập tên thiết bị.";
        if (!form.categoryId) nextErrors.categoryId = "Vui lòng chọn danh mục.";
        if (!form.branchId) nextErrors.branchId = "Vui lòng chọn chi nhánh.";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        const payload = {
            equipmentName: form.equipmentName.trim(),
            categoryId: form.categoryId,
            branchId: form.branchId,
            description: form.description,
            image: imageFile,
        };
EquipmentListPageOfManager
        try {
            if (isEdit) {
                await managerApi.updateEquipment(equipmentId, payload);
                onSaved(`Đã cập nhật "${payload.equipmentName}".`);
            } else {
                await managerApi.createEquipment(payload);
                onSaved(`Đã thêm thiết bị "${payload.equipmentName}".`);
            }
        } catch (err) {
            console.error("Lỗi lưu thiết bị:", err?.response?.status, err?.response?.data, err);
            pushToast(
                "error",
                err?.response?.data?.message || "Không lưu được thiết bị. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <button type="button" className="eqm-back-link" onClick={onCancel}>
                ← Quay lại danh sách
            </button>

            <div className="eqm-header">
                <div className="eqm-header-titles">
                    <span className="eqm-header-icon" aria-hidden="true">{isEdit ? "✏️" : "+"}</span>
                    <div>
                        <h1>{isEdit ? "Sửa thiết bị" : "Thêm thiết bị mới"}</h1>
                        <p>Điền thông tin thiết bị và tải ảnh minh hoạ (nếu có)</p>
                    </div>
                </div>
            </div>

            <div className="eqm-form-card">
                {loadingDetail ? (
                    <div className="eqm-form-loading">Đang tải thông tin thiết bị...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="eqm-field">
                            <label htmlFor="eqm-eq-name">
                                Tên thiết bị <span className="eqm-required">*</span>
                            </label>
                            <input
                                id="eqm-eq-name"
                                className="eqm-input"
                                placeholder="VD: Máy chạy bộ Life Fitness T5"
                                value={form.equipmentName}
                                onChange={(e) => setField("equipmentName", e.target.value)}
                            />
                            {errors.equipmentName && <span className="eqm-field-error">{errors.equipmentName}</span>}
                        </div>

                        <div className="eqm-form-grid">
                            <div className="eqm-field">
                                <label htmlFor="eqm-eq-category">
                                    Danh mục <span className="eqm-required">*</span>
                                </label>
                                <CustomSelect
                                    value={form.categoryId}
                                    onChange={(v) => setField("categoryId", v)}
                                    options={categories}
                                    placeholder="-- Chọn danh mục --"
                                    getOptionValue={(c) => c.categoryId}
                                    getOptionLabel={(c) => c.categoryName}
                                />
                                {errors.categoryId && <span className="eqm-field-error">{errors.categoryId}</span>}
                            </div>

                            <div className="eqm-field">
                                <label htmlFor="eqm-eq-branch">
                                    Chi nhánh <span className="eqm-required">*</span>
                                </label>
                                <CustomSelect
                                    value={form.branchId}
                                    onChange={(v) => setField("branchId", v)}
                                    options={branches}
                                    placeholder="-- Chọn chi nhánh --"
                                    getOptionValue={(b) => b.branchId}
                                    getOptionLabel={(b) => b.branchName}
                                />
                                <span className="eqm-field-hint">Chỉ hiện các chi nhánh bạn đang quản lý</span>
                                {errors.branchId && <span className="eqm-field-error">{errors.branchId}</span>}
                            </div>
                        </div>

                        <div className="eqm-field" style={{ marginTop: 18 }}>
                            <label htmlFor="eqm-eq-desc">Mô tả</label>
                            <textarea
                                id="eqm-eq-desc"
                                className="eqm-textarea"
                                placeholder="Thông số kỹ thuật, tình trạng, ghi chú bảo trì..."
                                value={form.description}
                                onChange={(e) => setField("description", e.target.value)}
                            />
                        </div>

                        <div className="eqm-field" style={{ marginTop: 18 }}>
                            <label>Hình ảnh</label>
                            {imagePreview ? (
                                <div className="eqm-image-preview">
                                    <img src={imagePreview} alt="Xem trước" />
                                    <button type="button" className="eqm-image-remove" onClick={removeImage} title="Xoá ảnh">
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={`eqm-dropzone ${dragActive ? "eqm-dropzone-active" : ""}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={handleDrop}
                                >
                                    <span className="eqm-dropzone-icon" aria-hidden="true">📷</span>
                                    <div className="eqm-dropzone-text">
                                        <strong>Kéo thả ảnh vào đây</strong>
                                        <span>hoặc bấm để chọn file (JPG, PNG, tối đa 5MB)</span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileInput}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="eqm-form-actions">
                            <button type="button" className="eqm-btn eqm-btn-secondary" onClick={onCancel} disabled={submitting}>
                                Huỷ
                            </button>
                            <button type="submit" className="eqm-btn eqm-btn-primary" disabled={submitting}>
                                {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm thiết bị"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// EquipmentListRow: một hàng trong danh sách (thay cho EquipmentCard dạng
// lưới trước đây). Desktop hiển thị dạng bảng theo cột; mobile tự bọc lại
// thành "card dọc" qua CSS (xem media query max-width: 760px).
// ---------------------------------------------------------------------------
function EquipmentListRow({ equipment, canManage, busy, onEdit, onToggleStatus }) {
    const isDeleted = equipment.status === STATUS_DELETED;
    const thumbnail = equipment.imageUrls?.[0];

    return (
        <div className={`eqm-list-row ${busy ? "eqm-list-row-busy" : ""}`}>
            <div className="eqm-list-thumb">
                {thumbnail ? (
                    <img src={thumbnail} alt={equipment.equipmentName} loading="lazy" />
                ) : (
                    <span className="eqm-list-thumb-placeholder" aria-hidden="true">🏋️</span>
                )}
            </div>

            <div className="eqm-list-main">
                <span className="eqm-list-name">{equipment.equipmentName}</span>
                {equipment.description && <span className="eqm-list-desc">{equipment.description}</span>}
                <div className="eqm-list-meta-mobile">
                    {equipment.categoryName && <span>📦 {equipment.categoryName}</span>}
                    {equipment.branchName && <span>📍 {equipment.branchName}</span>}
                    <span className={`eqm-badge ${isDeleted ? "eqm-badge-deleted" : "eqm-badge-active"}`}>
                        {isDeleted ? "Đã ẩn" : "Đang dùng"}
                    </span>
                </div>
            </div>

            <div className="eqm-list-cell">
                <span className="eqm-list-cell-label">Danh mục: </span>
                {equipment.categoryName || "—"}
            </div>

            <div className="eqm-list-cell">
                <span className="eqm-list-cell-label">Chi nhánh: </span>
                {equipment.branchName || "—"}
            </div>

            <div className="eqm-list-cell">
                <span className={`eqm-badge ${isDeleted ? "eqm-badge-deleted" : "eqm-badge-active"}`}>
                    {isDeleted ? "Đã ẩn" : "Đang dùng"}
                </span>
            </div>

            {canManage ? (
                <div className="eqm-list-actions">
                    <button className="eqm-btn eqm-btn-secondary" onClick={onEdit} disabled={busy}>
                        Sửa
                    </button>
                    <button
                        className={`eqm-btn ${isDeleted ? "eqm-btn-secondary" : "eqm-btn-danger"}`}
                        onClick={onToggleStatus}
                        disabled={busy}
                    >
                        {isDeleted ? "Kích hoạt" : "Ẩn"}
                    </button>
                </div>
            ) : (
                <div />
            )}
        </div>
    );
}

export default  function EquipmentListPageOfManager () {
    const [role, setRole] = useState(null);
    const canManage = role === "Admin" || role === "Manager";

    const [equipments, setEquipments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [branches, setBranches] = useState([]);
    const [contextLoading, setContextLoading] = useState(true);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const [viewMode, setViewMode] = useState("list"); // "list" | "add" | "edit"
    const [editingEquipmentId, setEditingEquipmentId] = useState(null);

    const [filters, setFilters] = useState({
        name: "",
        categoryId: "",
        branchId: "",
        includeDeleted: false,
    });
    const [nameInput, setNameInput] = useState("");

    const [confirmTarget, setConfirmTarget] = useState(null); // equipment đang chờ xác nhận ẩn/kích hoạt

    // ---- Toast helpers -----------------------------------------------------
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);
    const pushToast = useCallback((type, message) => {
        const id = ++toastIdRef.current;
        setToasts((t) => [...t, { id, type, message }]);
        setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3200);
    }, []);

    // debounce ô tìm kiếm tên
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, name: nameInput }));
        }, 350);
        return () => clearTimeout(t);
    }, [nameInput]);

    // Đánh dấu đã áp mặc định "chi nhánh đầu tiên" hay chưa, để không ghi đè
    // lựa chọn của người dùng mỗi khi loadContext chạy lại.
    const defaultBranchAppliedRef = useRef(false);

    const loadContext = useCallback(async () => {
        setContextLoading(true);
        let profile = null;
        try {
            profile = await managerApi.getEmployeeProfile();
        } catch (err) {
            console.error("Không lấy được thông tin tài khoản:", err?.response?.status, err);
        }
        const currentRole = profile?.role ?? "Guest";
        setRole(currentRole);

        const cats = await managerApi.getEquipmentCategories().catch(() => []);
        setCategories(cats ?? []);

        let branchList = [];
        if (currentRole === "Manager") {
            branchList = profile?.branches ?? [];
            if (branchList.length === 0) {
                branchList = await managerApi.getBranches().catch(() => []);
            }
        } else {
            branchList = await managerApi.getBranches().catch(() => []);
        }
        branchList = branchList ?? [];
        setBranches(branchList);

        // Mặc định chọn CHI NHÁNH ĐẦU TIÊN thay vì "Tất cả chi nhánh" — càng
        // nhiều thiết bị trùng tên giữa các chi nhánh, để mặc định "Tất cả"
        // càng dễ nhầm lẫn khi Sửa/Ẩn. Chỉ áp 1 lần lúc tải trang, không ghi
        // đè nếu người dùng đã tự đổi bộ lọc.
        if (!defaultBranchAppliedRef.current && branchList.length > 0) {
            defaultBranchAppliedRef.current = true;
            setFilters((f) => (f.branchId ? f : { ...f, branchId: String(branchList[0].branchId) }));
        }

        setContextLoading(false);
    }, []);

    useEffect(() => {
        loadContext();
    }, [loadContext]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await managerApi.getListEquipments(filters);
            let list = data ?? [];
            // BE bỏ qua branchId khi caller là Manager -> FE tự lọc lại cho đúng.
            if (role === "Manager" && filters.branchId) {
                list = list.filter((e) => String(e.branchId) === String(filters.branchId));
            }
            setEquipments(list);
        } catch (err) {
            console.error("Lỗi tải danh sách thiết bị:", err?.response?.status, err?.response?.data, err);
            setError(
                err?.response?.data?.message || "Không tải được danh sách thiết bị. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    }, [filters, role]);

    useEffect(() => {
        if (viewMode === "list") fetchList();
    }, [fetchList, viewMode]);

    // ---- Ẩn / Kích hoạt: optimistic update + rollback nếu lỗi --------------
    const requestToggleStatus = (equipment) => setConfirmTarget(equipment);

    const cancelToggle = () => setConfirmTarget(null);

    const confirmToggle = async () => {
        const equipment = confirmTarget;
        setConfirmTarget(null);
        if (!equipment) return;

        const isDeleted = equipment.status === STATUS_DELETED;
        const nextStatus = isDeleted ? STATUS_ACTIVE : STATUS_DELETED;

        setBusyId(equipment.equipmentId);
        // Cập nhật UI ngay lập tức (optimistic)
        setEquipments((prev) =>
            prev.map((e) => (e.equipmentId === equipment.equipmentId ? { ...e, status: nextStatus } : e))
        );

        try {
            if (isDeleted) {
                await managerApi.activateEquipmentItem(equipment.equipmentId);
            } else {
                await managerApi.hideEquipment(equipment.equipmentId);
            }
            pushToast(
                "success",
                isDeleted
                    ? `Đã kích hoạt lại "${equipment.equipmentName}".`
                    : `Đã ẩn "${equipment.equipmentName}".`
            );
        } catch (err) {
            console.error(
                "Lỗi ẩn/kích hoạt thiết bị:",
                err?.response?.status,
                err?.response?.data,
                err
            );
            // Rollback về trạng thái cũ vì API thất bại
            setEquipments((prev) =>
                prev.map((e) => (e.equipmentId === equipment.equipmentId ? { ...e, status: equipment.status } : e))
            );
            pushToast(
                "error",
                err?.response?.data?.message ||
                (err instanceof TypeError
                    ? `Lỗi FE: ${err.message} (kiểm tra lại authApi.js đã có method patch chưa)`
                    : "Thao tác thất bại. Vui lòng thử lại.")
            );
        } finally {
            setBusyId(null);
        }
    };

    const openEdit = (equipment) => {
        setEditingEquipmentId(equipment.equipmentId);
        setViewMode("edit");
    };
    const openAdd = () => {
        setEditingEquipmentId(null);
        setViewMode("add");
    };
    const closeForm = () => {
        setViewMode("list");
        setEditingEquipmentId(null);
    };
    const handleSaved = (message) => {
        closeForm();
        fetchList();
        if (message) pushToast("success", message);
    };

    const skeletons = useMemo(() => Array.from({ length: 6 }), []);

    if (viewMode === "add" || viewMode === "edit") {
        return (
            <div className="eqm-page">
                <style>{EQUIPMENT_STYLES}</style>
                <ToastStack toasts={toasts} />
                <div className="eqm-container">
                    <EquipmentForm
                        equipmentId={viewMode === "edit" ? editingEquipmentId : null}
                        categories={categories}
                        branches={branches}
                        onSaved={handleSaved}
                        onCancel={closeForm}
                        pushToast={pushToast}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="eqm-page">
            <style>{EQUIPMENT_STYLES}</style>
            <ToastStack toasts={toasts} />
            <ConfirmModal
                open={Boolean(confirmTarget)}
                title={confirmTarget?.status === STATUS_DELETED ? "Kích hoạt lại thiết bị?" : "Ẩn thiết bị?"}
                message={
                    confirmTarget?.status === STATUS_DELETED
                        ? `"${confirmTarget?.equipmentName}" sẽ hiển thị lại trong danh sách sử dụng.`
                        : `"${confirmTarget?.equipmentName}" sẽ được ẩn khỏi danh sách sử dụng. Bạn có thể kích hoạt lại bất cứ lúc nào.`
                }
                confirmLabel={confirmTarget?.status === STATUS_DELETED ? "Kích hoạt" : "Ẩn thiết bị"}
                onConfirm={confirmToggle}
                onCancel={cancelToggle}
            />

            <div className="eqm-container">
                <div className="eqm-header">
                    <div className="eqm-header-titles">
                        <span className="eqm-header-icon" aria-hidden="true">🏋️</span>
                        <div>
                            <h1>Danh sách thiết bị</h1>
                            <p>
                                {canManage
                                    ? "Quản lý danh sách thiết bị theo chi nhánh"
                                    : "Danh sách thiết bị hiện có tại các chi nhánh"}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <button className="eqm-btn eqm-btn-primary" onClick={openAdd}>
                            + Thêm thiết bị
                        </button>
                    )}
                </div>

                <div className="eqm-filters">
                    <div className="eqm-field">
                        <label htmlFor="eqm-search-name">Tên thiết bị</label>
                        <input
                            id="eqm-search-name"
                            className="eqm-input"
                            placeholder="Tìm theo tên..."
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                        />
                    </div>

                    <div className="eqm-field">
                        <label htmlFor="eqm-filter-category">Danh mục</label>
                        <CustomSelect
                            value={filters.categoryId}
                            onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
                            options={categories}
                            placeholder="Tất cả danh mục"
                            getOptionValue={(c) => c.categoryId}
                            getOptionLabel={(c) => c.categoryName}
                        />
                    </div>

                    <div className="eqm-field">
                        <label htmlFor="eqm-filter-branch">Chi nhánh</label>
                        <CustomSelect
                            value={filters.branchId}
                            onChange={(v) => setFilters((f) => ({ ...f, branchId: v }))}
                            options={branches}
                            placeholder={contextLoading ? "Đang tải..." : "-- Chọn chi nhánh --"}
                            disabled={contextLoading}
                            getOptionValue={(b) => b.branchId}
                            getOptionLabel={(b) => b.branchName}
                            showAllOption={false}
                        />
                    </div>

                    {canManage && (
                        <div className="eqm-checkbox-field">
                            <input
                                type="checkbox"
                                id="eqm-include-deleted"
                                checked={filters.includeDeleted}
                                onChange={(e) => setFilters((f) => ({ ...f, includeDeleted: e.target.checked }))}
                            />
                            <label htmlFor="eqm-include-deleted">Hiện cả thiết bị đã ẩn</label>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="eqm-list">
                        {skeletons.map((_, i) => (
                            <div className="eqm-skeleton-row" key={i} />
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="eqm-state eqm-state-error">
                        <strong>Đã có lỗi xảy ra</strong>
                        <span>{error}</span>
                        <button className="eqm-btn eqm-btn-secondary" onClick={fetchList} style={{ marginTop: 8 }}>
                            Thử lại
                        </button>
                    </div>
                )}

                {!loading && !error && equipments.length === 0 && (
                    <div className="eqm-state">
                        <strong>Không tìm thấy thiết bị nào</strong>
                        <span>Thử điều chỉnh lại bộ lọc phía trên.</span>
                    </div>
                )}

                {!loading && !error && equipments.length > 0 && (
                    <div className="eqm-list">
                        <div className="eqm-list-header">
                            <span></span>
                            <span>Tên thiết bị</span>
                            <span>Danh mục</span>
                            <span>Chi nhánh</span>
                            <span>Trạng thái</span>
                            <span></span>
                        </div>
                        {equipments.map((eq) => (
                            <EquipmentListRow
                                key={eq.equipmentId}
                                equipment={eq}
                                canManage={canManage}
                                busy={busyId === eq.equipmentId}
                                onEdit={() => openEdit(eq)}
                                onToggleStatus={() => requestToggleStatus(eq)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}