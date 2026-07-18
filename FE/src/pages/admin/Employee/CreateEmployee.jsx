import { useEffect, useMemo, useState } from "react";
import adminApi from "../../../api/adminApi";

const ROLE_LIMIT = { 1: 1, 2: 3, 3: Infinity }; // Staff / Manager / Admin
const ROLE_NAME = { 1: "Staff", 2: "Manager", 3: "Admin" };

const INITIAL_FORM = {
  FullName: "",
  Phone: "",
  Email: "",
  Password: "",
  Gender: "",
  RoleId: "",
};
export default function CreateEmployeeAdmin() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState(null); // { message, isError }
  const [submitting, setSubmitting] = useState(false);

  const roleId = form.RoleId ? Number(form.RoleId) : "";
  const limit = roleId ? ROLE_LIMIT[roleId] : undefined;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await adminApi.getBranches();
        // Hỗ trợ cả 2 trường hợp: adminApi trả về response axios đầy đủ (res.data.items)
        // hoặc trả thẳng data đã unwrap (res.items).
        const list = res?.data?.items || res?.items || res?.data || res || [];
        if (mounted) setBranches(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Không tải được danh sách chi nhánh:", err);
        if (mounted) setBranches([]);
      } finally {
        if (mounted) setBranchesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Khi Admin -> tự động chọn toàn bộ chi nhánh
  useEffect(() => {
    if (roleId === 3) {
      setSelectedIds(branches.map((b) => b.branchId));
    } else if (limit !== undefined && selectedIds.length > limit) {
      setSelectedIds((prev) => prev.slice(0, limit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, branches]);

  const branchHint = useMemo(() => {
    if (!roleId) return { text: "Chọn vai trò để xem giới hạn chi nhánh", active: false };
    if (roleId === 3) return { text: "Admin: mặc định toàn bộ chi nhánh", active: true };
    return { text: `${ROLE_NAME[roleId]}: chọn tối đa ${limit} chi nhánh (${selectedIds.length}/${limit})`, active: true };
  }, [roleId, limit, selectedIds]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleBranch(id) {
    if (roleId === 3) return; // Admin: khoá, không cho bỏ chọn

    setSelectedIds((prev) => {
      const isChecked = prev.includes(id);
      if (isChecked) return prev.filter((x) => x !== id);
      if (roleId === 1) return [id]; // Staff: chỉ 1, thay thế lựa chọn cũ
      if (prev.length >= limit) return prev; // đã đạt giới hạn Manager
      return [...prev, id];
    });
    setErrors((prev) => ({ ...prev, branches: "" }));
  }

  function validate(payload) {
    const next = {};
    if (!payload.FullName.trim()) next.fullName = "Vui lòng nhập họ tên.";
    if (!payload.Phone.trim()) next.phone = "Vui lòng nhập số điện thoại.";
    if (!payload.Password || payload.Password.length < 6) next.password = "Mật khẩu tối thiểu 6 ký tự.";
    if (!payload.Gender) next.gender = "Vui lòng chọn giới tính.";
    if (!payload.RoleId) next.roleId = "Vui lòng chọn vai trò.";
    if (!payload.BranchIds.length) next.branches = "Vui lòng chọn ít nhất 1 chi nhánh.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      FullName: form.FullName.trim(),
      Phone: form.Phone.trim(),
      Email: form.Email.trim() || null,
      Password: form.Password,
      Gender: form.Gender,
      RoleId: form.RoleId ? Number(form.RoleId) : null,
      BranchIds: selectedIds,
    };

    const nextErrors = validate(payload);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setToast({ message: "Vui lòng kiểm tra lại thông tin.", isError: true });
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createEmployee(payload);
      console.log("BE response:", res?.data);
      setToast({ message: `Đã tạo nhân viên "${payload.FullName}" thành công.`, isError: false });
      setForm(INITIAL_FORM);
      setSelectedIds([]);
    } catch (err) {
      console.error("Lỗi tạo nhân viên:", err?.response?.data || err);
      const beMessage = err?.response?.data?.message || err?.response?.data?.title;
      setToast({ message: beMessage || "Tạo nhân viên thất bại. Vui lòng thử lại.", isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setSelectedIds([]);
    setErrors({});
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="ce-employee-form">
      <style>{`
        .ce-employee-form {
          --bg: #0b1120;
          --panel: #1e293b;
          --border: #334155;
          --accent: #06b6d4;
          --accent-soft: rgba(6, 182, 212, 0.14);
          --text-heading: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --danger: #f87171;

          display: flex;
          justify-content: center;
          color: var(--text-heading);
          font-family: "Inter", "Segoe UI", system-ui, sans-serif;
        }

        .ce-employee-form * {
          box-sizing: border-box;
        }

        .ce-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          max-width: 720px;
          width: 100%;
        }

        .ce-card-head {
          padding: 22px 26px 4px;
        }

        .ce-card-head h1 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-heading);
          margin: 0 0 4px;
        }

        .ce-card-head p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }

        .ce-form {
          padding: 18px 26px 26px;
        }

        .ce-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 18px;
        }

        .ce-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 14px;
        }

        .ce-field--full {
          grid-column: 1 / -1;
        }

        .ce-field label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .ce-field label .req {
          color: var(--accent);
        }

        .ce-field input,
        .ce-field select {
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-heading);
          border-radius: 9999px;
          padding: 10px 16px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .ce-field input::placeholder {
          color: var(--text-muted);
        }

        .ce-field input:focus,
        .ce-field select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        .ce-field select option {
          background: var(--panel);
          color: var(--text-heading);
        }

        .ce-error {
          font-size: 11.5px;
          color: var(--danger);
          min-height: 14px;
          display: block;
        }

        .ce-branch-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ce-branch-hint {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .ce-branch-hint.is-limit {
          color: var(--accent);
        }

        .ce-branch-box {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ce-branch-empty {
          font-size: 12.5px;
          color: var(--text-muted);
          margin: 4px 0;
        }

        .ce-branch-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: 13.5px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }

        .ce-branch-chip:hover:not(.is-disabled) {
          border-color: var(--text-muted);
          color: var(--text-heading);
        }

        .ce-branch-chip.is-checked {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-soft);
        }

        .ce-branch-chip.is-disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .ce-chip-check {
          color: var(--accent);
          flex-shrink: 0;
        }

        .ce-chip-pin {
          color: currentColor;
          opacity: 0.75;
          flex-shrink: 0;
        }

        .ce-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid var(--border);
        }

        .ce-btn {
          padding: 10px 20px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: opacity 0.15s ease, background 0.15s ease;
        }

        .ce-btn--ghost {
          background: transparent;
          border-color: var(--border);
          color: var(--text-secondary);
        }

        .ce-btn--ghost:hover {
          color: var(--text-heading);
          border-color: var(--text-muted);
        }

        .ce-btn--primary {
          background: var(--accent);
          color: #06222b;
        }

        .ce-btn--primary:hover {
          opacity: 0.9;
        }

        .ce-btn--primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ce-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--panel);
          border: 1px solid var(--accent);
          color: var(--text-heading);
          padding: 12px 18px;
          border-radius: 9px;
          font-size: 13px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          transform: translateY(16px);
          opacity: 0;
          pointer-events: none;
          transition: all 0.25s ease;
        }

        .ce-toast.is-error {
          border-color: var(--danger);
        }

        .ce-toast.show {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

      <div className="ce-card">
        <div className="ce-card-head">
          <h1>Tạo nhân viên</h1>
          <p>Nhập thông tin để thêm nhân viên mới vào hệ thống.</p>
        </div>

        <form className="ce-form" onSubmit={handleSubmit} noValidate>
          <div className="ce-grid">
            <div className="ce-field">
              <label htmlFor="fullName">Họ và tên <span className="req">*</span></label>
              <input
                id="fullName"
                name="FullName"
                type="text"
                placeholder="Nguyễn Văn A"
                value={form.FullName}
                onChange={handleChange}
              />
              <span className="ce-error">{errors.fullName}</span>
            </div>

            <div className="ce-field">
              <label htmlFor="phone">Số điện thoại <span className="req">*</span></label>
              <input
                id="phone"
                name="Phone"
                type="tel"
                placeholder="09xxxxxxxx"
                value={form.Phone}
                onChange={handleChange}
              />
              <span className="ce-error">{errors.phone}</span>
            </div>

            <div className="ce-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="Email"
                type="email"
                placeholder="ten@congty.com"
                value={form.Email}
                onChange={handleChange}
              />
              <span className="ce-error">{errors.email}</span>
            </div>

            <div className="ce-field">
              <label htmlFor="password">Mật khẩu <span className="req">*</span></label>
              <input
                id="password"
                name="Password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.Password}
                onChange={handleChange}
              />
              <span className="ce-error">{errors.password}</span>
            </div>

            <div className="ce-field">
              <label htmlFor="gender">Giới tính <span className="req">*</span></label>
              <select id="gender" name="Gender" value={form.Gender} onChange={handleChange}>
                <option value="" disabled>Chọn giới tính</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
              <span className="ce-error">{errors.gender}</span>
            </div>

            <div className="ce-field">
              <label htmlFor="roleId">Vai trò <span className="req">*</span></label>
              <select id="roleId" name="RoleId" value={form.RoleId} onChange={handleChange}>
                <option value="" disabled>Chọn vai trò</option>
                <option value="1">Staff</option>
                <option value="2">Manager</option>
                <option value="3">Admin</option>
              </select>
              <span className="ce-error">{errors.roleId}</span>
            </div>
          </div>

          <div className="ce-field ce-field--full">
            <div className="ce-branch-head">
              <label>Chi nhánh <span className="req">*</span></label>
              <span className={`ce-branch-hint ${branchHint.active ? "is-limit" : ""}`}>
                {branchHint.text}
              </span>
            </div>

            <div className="ce-branch-box">
              {branchesLoading && <p className="ce-branch-empty">Đang tải danh sách chi nhánh...</p>}
              {!branchesLoading && branches.length === 0 && (
                <p className="ce-branch-empty">Không có chi nhánh nào.</p>
              )}
              {!branchesLoading && branches.map((b) => {
                const checked = selectedIds.includes(b.branchId);
                const isAdmin = roleId === 3;
                const disabled = isAdmin || (!checked && roleId && selectedIds.length >= limit);
                return (
                  <button
                    key={b.branchId}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleBranch(b.branchId)}
                    className={`ce-branch-chip ${checked ? "is-checked" : ""} ${disabled ? "is-disabled" : ""}`}
                  >
                    {checked && (
                      <svg className="ce-chip-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    <svg className="ce-chip-pin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {b.branchName}
                  </button>
                );
              })}
            </div>
            <span className="ce-error">{errors.branches}</span>
          </div>

          <div className="ce-form-actions">
            <button type="button" className="ce-btn ce-btn--ghost" onClick={handleReset}>
              Huỷ
            </button>
            <button type="submit" className="ce-btn ce-btn--primary" disabled={submitting}>
              {submitting ? "Đang tạo..." : "Tạo nhân viên"}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`ce-toast show ${toast.isError ? "is-error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}