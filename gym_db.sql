-- ============================================================
--  CƠ SỞ DỮ LIỆU: gym_management
--  Phiên bản đã chỉnh sửa theo yêu cầu mới
--  Toàn bộ chú thích bằng tiếng Việt
-- ============================================================

CREATE DATABASE IF NOT EXISTS gym_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gym_management;


-- ============================================================
--  BẢNG 1: roles  (Vai trò nhân viên)
-- ============================================================
CREATE TABLE roles (
  role_id    TINYINT     NOT NULL AUTO_INCREMENT  COMMENT 'Mã vai trò — khóa chính tự tăng',
  role_name  VARCHAR(50) NOT NULL                 COMMENT 'Tên vai trò, VD: Staff, Manager, Admin, Technician',
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_role_name (role_name)
) ENGINE=InnoDB COMMENT='Vai trò của nhân viên trong hệ thống';

INSERT INTO roles (role_name) VALUES
  ('Staff'),
  ('Manager'),
  ('Admin'),
  ('Technician');


-- ============================================================
--  BẢNG 2: employees  (Nhân viên)
--  ĐÃ SỬA: thêm trường email
-- ============================================================
CREATE TABLE employees (
  employee_id    BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã nhân viên — khóa chính tự tăng',
  full_name      VARCHAR(100) NOT NULL                 COMMENT 'Họ và tên đầy đủ của nhân viên',
  phone          VARCHAR(15)  NOT NULL                 COMMENT 'Số điện thoại — dùng làm tên đăng nhập, phải duy nhất',
  email          VARCHAR(150) NULL                     COMMENT 'Địa chỉ email của nhân viên, dùng để nhận thông báo/khôi phục mật khẩu, có thể NULL nhưng phải duy nhất nếu có',
  password_hash  VARCHAR(255) NOT NULL                 COMMENT 'Mật khẩu đã mã hóa bcrypt, không lưu bản rõ',
  gender         ENUM('Male','Female','Other') NOT NULL COMMENT 'Giới tính của nhân viên',
  role_id        TINYINT      NOT NULL                 COMMENT 'Vai trò của nhân viên — FK tới roles.role_id',
  status         ENUM('Active','Suspended') NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái tài khoản: Active = đang hoạt động, Suspended = bị tạm khóa',
  suspend_reason TEXT         NULL                     COMMENT 'Lý do tạm khóa — bắt buộc điền khi status = Suspended',
  created_by     BIGINT       NULL                     COMMENT 'Nhân viên tạo tài khoản này — FK tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo tài khoản',
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',
  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employee_phone (phone),
  UNIQUE KEY uq_employee_email (email),
  CONSTRAINT fk_employee_role
    FOREIGN KEY (role_id)    REFERENCES roles     (role_id),
  CONSTRAINT fk_employee_creator
    FOREIGN KEY (created_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Tài khoản nhân viên vận hành phòng gym';


-- ============================================================
--  BẢNG 3: branches  (Chi nhánh)
-- ============================================================
CREATE TABLE branches (
  branch_id    INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã chi nhánh — khóa chính tự tăng',
  branch_name  VARCHAR(150) NOT NULL                 COMMENT 'Tên hiển thị của chi nhánh',
  address      TEXT         NOT NULL                 COMMENT 'Địa chỉ đầy đủ của chi nhánh',
  phone        VARCHAR(15)  NULL                     COMMENT 'Số điện thoại liên hệ của chi nhánh, có thể NULL',
  manager_id   BIGINT       NOT NULL                 COMMENT 'Quản lý phụ trách chi nhánh — FK tới employees.employee_id',
  status       ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái hoạt động: Active = đang mở, Inactive = đã đóng',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thêm chi nhánh vào hệ thống',
  PRIMARY KEY (branch_id),
  CONSTRAINT fk_branch_manager
    FOREIGN KEY (manager_id) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Chi nhánh phòng gym';


-- ============================================================
--  BẢNG 4: members  (Hội viên)
-- ============================================================
CREATE TABLE members (
  member_id       BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã hội viên — khóa chính tự tăng',
  full_name       VARCHAR(100) NOT NULL                 COMMENT 'Họ và tên đầy đủ của hội viên',
  phone           VARCHAR(15)  NOT NULL                 COMMENT 'Số điện thoại — dùng làm tên đăng nhập, phải duy nhất',
  password_hash   VARCHAR(255) NOT NULL                 COMMENT 'Mật khẩu đã mã hóa bcrypt, không lưu bản rõ',
  gender          ENUM('Male','Female','Other') NOT NULL COMMENT 'Giới tính của hội viên',
  branch_id       INT          NULL                     COMMENT 'Chi nhánh hội viên đăng ký — FK tới branches.branch_id, NULL nếu chưa gán',
  status          ENUM('PendingActivation','Active','Expired','Suspended')
                  NOT NULL DEFAULT 'PendingActivation'  COMMENT 'Trạng thái tài khoản: PendingActivation=chờ kích hoạt, Active=đang hoạt động, Expired=hết hạn, Suspended=bị khóa',
  suspend_reason  TEXT         NULL                     COMMENT 'Lý do tạm khóa — bắt buộc điền khi status = Suspended',
  internal_notes  TEXT         NULL                     COMMENT 'Ghi chú nội bộ dành cho nhân viên, hội viên không thấy',
  created_by      BIGINT       NULL                     COMMENT 'Nhân viên tạo tài khoản hội viên này — FK tới employees.employee_id',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo tài khoản',
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',
  PRIMARY KEY (member_id),
  UNIQUE KEY uq_member_phone (phone),
  CONSTRAINT fk_member_branch
    FOREIGN KEY (branch_id)  REFERENCES branches  (branch_id),
  CONSTRAINT fk_member_creator
    FOREIGN KEY (created_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Hội viên phòng gym';


-- ============================================================
--  BẢNG 5: face_data  (Dữ liệu khuôn mặt)
-- ============================================================
CREATE TABLE face_data (
  face_data_id   BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  member_id      BIGINT       NOT NULL                 COMMENT 'Hội viên sở hữu khuôn mặt — FK tới members.member_id, quan hệ 1-1',
  face_id_aws    VARCHAR(100) NOT NULL                 COMMENT 'Face ID do AWS Rekognition trả về sau khi đăng ký',
  profile_image  VARCHAR(500) NULL                     COMMENT 'URL ảnh đại diện lưu trên S3, có thể NULL',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm đăng ký khuôn mặt',
  created_by     BIGINT       NOT NULL                 COMMENT 'Nhân viên thực hiện đăng ký khuôn mặt — FK tới employees.employee_id',
  PRIMARY KEY (face_data_id),
  UNIQUE KEY uq_face_member  (member_id),
  UNIQUE KEY uq_face_id_aws  (face_id_aws),
  CONSTRAINT fk_face_member
    FOREIGN KEY (member_id)  REFERENCES members   (member_id),
  CONSTRAINT fk_face_creator
    FOREIGN KEY (created_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Dữ liệu nhận diện khuôn mặt hội viên liên kết với AWS Rekognition';


-- ============================================================
--  BẢNG 6: face_update_history  (Lịch sử cập nhật khuôn mặt)
-- ============================================================
CREATE TABLE face_update_history (
  history_id      BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  member_id       BIGINT       NOT NULL                 COMMENT 'Hội viên được cập nhật khuôn mặt — FK tới members.member_id',
  old_face_id_aws VARCHAR(100) NULL                     COMMENT 'Face ID cũ trên AWS — NULL nếu đây là lần đăng ký đầu tiên',
  new_face_id_aws VARCHAR(100) NOT NULL                 COMMENT 'Face ID mới trên AWS sau khi cập nhật',
  reason          TEXT         NULL                     COMMENT 'Lý do thay đổi khuôn mặt, VD: ảnh cũ không rõ, hội viên yêu cầu',
  performed_by    BIGINT       NOT NULL                 COMMENT 'Nhân viên thực hiện thao tác — FK tới employees.employee_id',
  performed_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thực hiện thay đổi',
  PRIMARY KEY (history_id),
  CONSTRAINT fk_facehistory_member
    FOREIGN KEY (member_id)    REFERENCES members   (member_id),
  CONSTRAINT fk_facehistory_staff
    FOREIGN KEY (performed_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử mỗi lần cập nhật khuôn mặt hội viên';


-- ============================================================
--  BẢNG 7: membership_plans  (Gói tập)
-- ============================================================
CREATE TABLE membership_plans (
  plan_id       INT            NOT NULL AUTO_INCREMENT  COMMENT 'Mã gói tập — khóa chính tự tăng',
  plan_name     VARCHAR(150)   NOT NULL                 COMMENT 'Tên hiển thị của gói tập, VD: Gói 1 Tháng, Gói PRO 3 Tháng',
  price         DECIMAL(12,0)  NOT NULL                 COMMENT 'Giá niêm yết của gói (VNĐ), không có số thập phân',
  duration_days SMALLINT       NOT NULL                 COMMENT 'Thời hạn gói tính bằng số ngày kể từ ngày bắt đầu',
  description   TEXT           NULL                     COMMENT 'Mô tả quyền lợi gói tập hiển thị cho hội viên',
  status        ENUM('OnSale','Discontinued') NOT NULL DEFAULT 'OnSale' COMMENT 'Trạng thái bán: OnSale = đang bán, Discontinued = ngừng bán',
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo gói tập',
  PRIMARY KEY (plan_id)
) ENGINE=InnoDB COMMENT='Danh sách gói tập phòng gym';


-- ============================================================
--  BẢNG 8: promotions  (Chương trình khuyến mãi)
--
--  Quy tắc điền cột theo từng loại promo_type:
--    GiamPhanTram : điền phan_tram_giam, muc_giam_toi_da (tuỳ chọn)
--    GiamTienMat  : điền so_tien_giam
--    TangNgay     : điền so_ngay_tang
--    TangChuKy    : điền so_chu_ky_tang
--    → Các cột không dùng để NULL
--
--  Công thức tính ngày hết hạn:
--    GiamPhanTram / GiamTienMat : expiry = start_date + duration_days
--    TangNgay                   : expiry = start_date + duration_days + so_ngay_tang
--    TangChuKy                  : expiry = start_date + duration_days + (so_chu_ky_tang × duration_days)
-- ============================================================
CREATE TABLE promotions (
  promotion_id        INT            NOT NULL AUTO_INCREMENT  COMMENT 'Mã khuyến mãi — khóa chính tự tăng',
  ten_khuyen_mai      VARCHAR(200)   NOT NULL                 COMMENT 'Tên hiển thị chương trình, VD: Giảm 50% Gói PRO tháng 6',
  mo_ta               TEXT           NULL                     COMMENT 'Mô tả chi tiết quyền lợi hiển thị cho hội viên',

  promo_type          ENUM(
                        'GiamPhanTram',
                        'GiamTienMat',
                        'TangNgay',
                        'TangChuKy'
                      ) NOT NULL                              COMMENT 'Loại khuyến mãi: GiamPhanTram=giảm %, GiamTienMat=giảm tiền cố định, TangNgay=tặng N ngày, TangChuKy=tặng N chu kỳ',

  phan_tram_giam      DECIMAL(5,2)   NULL                    COMMENT '[GiamPhanTram] Phần trăm giảm, VD: 50.00 = giảm 50%. NULL nếu không phải loại này',
  muc_giam_toi_da     DECIMAL(12,0)  NULL                    COMMENT '[GiamPhanTram] Số tiền giảm tối đa (VNĐ). NULL = không giới hạn mức giảm',

  so_tien_giam        DECIMAL(12,0)  NULL                    COMMENT '[GiamTienMat] Số tiền giảm cố định (VNĐ). NULL nếu không phải loại này',

  so_ngay_tang        SMALLINT       NULL                    COMMENT '[TangNgay] Số ngày tặng thêm vào ngày hết hạn. NULL nếu không phải loại này',

  so_chu_ky_tang      TINYINT        NULL                    COMMENT '[TangChuKy] Số chu kỳ tặng thêm, 1 chu kỳ = duration_days của gói. NULL nếu không phải loại này',

  ngay_bat_dau        DATETIME       NOT NULL                COMMENT 'Thời điểm bắt đầu áp dụng khuyến mãi',
  ngay_ket_thuc       DATETIME       NOT NULL                COMMENT 'Thời điểm kết thúc — sau mốc này không áp dụng nữa',

  gioi_han_luot       INT            NULL                    COMMENT 'Tổng số lượt dùng tối đa toàn chương trình. NULL = không giới hạn',
  so_luot_da_dung     INT            NOT NULL DEFAULT 0      COMMENT 'Số lượt đã dùng, tự tăng mỗi khi khuyến mãi được áp dụng thành công',

  trang_thai          ENUM('NhapLieu','HoatDong','TamDung','HetHan')
                      NOT NULL DEFAULT 'NhapLieu'            COMMENT 'Trạng thái: NhapLieu=đang soạn, HoatDong=đang chạy, TamDung=tạm dừng, HetHan=đã kết thúc',
  nguoi_tao           BIGINT         NOT NULL                COMMENT 'Nhân viên (Admin/Manager) tạo chương trình — FK tới employees.employee_id',
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo chương trình',
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',

  PRIMARY KEY (promotion_id),
  INDEX idx_km_trangthai_thoigian (trang_thai, ngay_bat_dau, ngay_ket_thuc),

  CONSTRAINT fk_km_nguoi_tao
    FOREIGN KEY (nguoi_tao) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Chương trình khuyến mãi do Admin/Manager tạo';


-- ============================================================
--  BẢNG 9: promotion_plans  (Gói tập được áp khuyến mãi)
--
--  Ràng buộc "không trùng thời gian" được kiểm tra qua
--  stored procedure sp_gan_khuyen_mai_vao_goi — không INSERT trực tiếp.
-- ============================================================
CREATE TABLE promotion_plans (
  id           INT    NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  promotion_id INT    NOT NULL                 COMMENT 'Mã khuyến mãi — FK tới promotions.promotion_id',
  plan_id      INT    NOT NULL                 COMMENT 'Mã gói tập được gắn vào khuyến mãi — FK tới membership_plans.plan_id',
  PRIMARY KEY (id),
  UNIQUE KEY uq_km_goi (promotion_id, plan_id),
  INDEX idx_pp_goi (plan_id),

  CONSTRAINT fk_pp_khuyen_mai
    FOREIGN KEY (promotion_id) REFERENCES promotions      (promotion_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pp_goi_tap
    FOREIGN KEY (plan_id)      REFERENCES membership_plans (plan_id)
) ENGINE=InnoDB COMMENT='Liên kết nhiều-nhiều giữa khuyến mãi và gói tập. Mỗi gói chỉ có 1 KM active tại 1 thời điểm — kiểm tra qua stored procedure';


-- ============================================================
--  BẢNG 10: transactions  (Giao dịch thanh toán)
--
--  Ghi lại một lần thanh toán. Mỗi transaction chỉ chứa
--  đúng 1 gói tập (plan_id). Nếu hội viên mua nhiều gói
--  cùng lúc thì tạo nhiều transaction riêng biệt.
--  amount = số tiền thực thu sau khuyến mãi.
-- ============================================================
CREATE TABLE transactions (
  transaction_id   BIGINT         NOT NULL AUTO_INCREMENT  COMMENT 'Mã giao dịch — khóa chính tự tăng',
  member_id        BIGINT         NOT NULL                 COMMENT 'Hội viên thực hiện giao dịch — FK tới members.member_id',
  branch_id        INT            NOT NULL                 COMMENT 'Chi nhánh xử lý giao dịch — FK tới branches.branch_id',
  plan_id          INT            NOT NULL                 COMMENT 'Gói tập được mua trong giao dịch này — FK tới membership_plans.plan_id',

  transaction_type ENUM('NewPurchase','Renewal') NOT NULL COMMENT 'Loại giao dịch: NewPurchase = mua mới, Renewal = gia hạn',

  payment_method   ENUM('Cash','BankTransfer') NOT NULL   COMMENT 'Phương thức thanh toán: Cash = tiền mặt, BankTransfer = chuyển khoản',
  payment_status   ENUM('Pending','Paid','Failed')
                   NOT NULL DEFAULT 'Pending'             COMMENT 'Trạng thái thanh toán: Pending=chờ xác nhận, Paid=đã thanh toán, Failed=thất bại',

  gia_goc          DECIMAL(12,0)  NOT NULL                COMMENT 'Giá niêm yết của gói trước khi áp khuyến mãi (VNĐ)',
  amount           DECIMAL(12,0)  NOT NULL                COMMENT 'Số tiền thực thu sau khi áp khuyến mãi (VNĐ). Bằng gia_goc nếu không có KM',

  receipt_image    VARCHAR(500)   NULL                    COMMENT 'URL ảnh biên lai / chứng từ chuyển khoản lưu trên S3',

  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo giao dịch',
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',

  PRIMARY KEY (transaction_id),

  CONSTRAINT fk_gd_hv
    FOREIGN KEY (member_id)  REFERENCES members           (member_id),
  CONSTRAINT fk_gd_cn
    FOREIGN KEY (branch_id)  REFERENCES branches          (branch_id),
  CONSTRAINT fk_gd_goi
    FOREIGN KEY (plan_id)    REFERENCES membership_plans  (plan_id)
) ENGINE=InnoDB COMMENT='Giao dịch thanh toán mua hoặc gia hạn gói tập';


-- ============================================================
--  BẢNG 11: member_packages  (Gói tập của hội viên)
--
--  Một bản ghi = một gói tập đang hoặc đã được kích hoạt
--  cho hội viên. Nguồn dữ liệu duy nhất cho ngày hết hạn.
--
--  so_ngay_tang_thuc_te: ứng dụng tính sẵn rồi lưu vào đây
--    TangNgay  → so_ngay_tang của promotion
--    TangChuKy → so_chu_ky_tang × duration_days của gói
--    Không có KM → 0
--  expiry_date = start_date + duration_days + so_ngay_tang_thuc_te
-- ============================================================
CREATE TABLE member_packages (
  member_package_id      BIGINT         NOT NULL AUTO_INCREMENT  COMMENT 'Mã gói hội viên — khóa chính tự tăng',

  member_id              BIGINT         NOT NULL                 COMMENT 'Hội viên sở hữu gói — FK tới members.member_id',
  transaction_id         BIGINT         NOT NULL                 COMMENT 'Giao dịch thanh toán tương ứng — FK tới transactions.transaction_id',
  plan_id                INT            NOT NULL                 COMMENT 'Gói tập được mua — FK tới membership_plans.plan_id',
  promotion_id           INT            NULL                     COMMENT 'Khuyến mãi được áp dụng — FK tới promotions.promotion_id, NULL nếu không có',

  gia_goc                DECIMAL(12,0)  NOT NULL                COMMENT 'Giá niêm yết của gói tại thời điểm mua (VNĐ)',
  amount                 DECIMAL(12,0)  NOT NULL                COMMENT 'Số tiền thực thu sau khuyến mãi (VNĐ), sao chép từ transactions.amount',

  so_ngay_tang_thuc_te   SMALLINT       NOT NULL DEFAULT 0      COMMENT 'Số ngày tặng thêm đã quy đổi thực tế: TangNgay=so_ngay_tang, TangChuKy=so_chu_ky_tang×duration_days, không KM=0',

  start_date             DATE           NOT NULL                COMMENT 'Ngày bắt đầu có hiệu lực của gói',
  expiry_date            DATE           NOT NULL                COMMENT 'Ngày hết hạn = start_date + duration_days + so_ngay_tang_thuc_te',

  package_status         ENUM('Pending','Active','Expired','Cancelled')
                         NOT NULL DEFAULT 'Pending'            COMMENT 'Trạng thái gói: Pending=chờ thanh toán, Active=đang hiệu lực, Expired=hết hạn, Cancelled=đã hủy',

  created_at             DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo bản ghi',
  updated_at             DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',

  PRIMARY KEY (member_package_id),

  CONSTRAINT fk_mp_member
    FOREIGN KEY (member_id)       REFERENCES members           (member_id),
  CONSTRAINT fk_mp_transaction
    FOREIGN KEY (transaction_id)  REFERENCES transactions      (transaction_id),
  CONSTRAINT fk_mp_plan
    FOREIGN KEY (plan_id)         REFERENCES membership_plans  (plan_id),
  CONSTRAINT fk_mp_promotion
    FOREIGN KEY (promotion_id)    REFERENCES promotions        (promotion_id)
) ENGINE=InnoDB COMMENT='Gói tập đã mua của từng hội viên, lưu ngày hiệu lực và trạng thái';


-- ============================================================
--  BẢNG 12: promotion_usages  (Lịch sử áp dụng khuyến mãi)
--
--  Chỉ ghi nhận thông tin khuyến mãi. Không lưu lại
--  gia_goc hay so_ngay ở đây vì đã có trong member_packages.
--  Bảng này chỉ thêm, không sửa, không xóa.
-- ============================================================
CREATE TABLE promotion_usages (
  usage_id            BIGINT         NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',

  promotion_id        INT            NOT NULL                 COMMENT 'Khuyến mãi được áp dụng — FK tới promotions.promotion_id',
  member_package_id   BIGINT         NOT NULL                 COMMENT 'Gói hội viên được hưởng khuyến mãi — FK tới member_packages.member_package_id',
  member_id           BIGINT         NOT NULL                 COMMENT 'Hội viên được hưởng — FK tới members.member_id, lưu để truy vấn nhanh',
  plan_id             INT            NOT NULL                 COMMENT 'Gói tập tương ứng — FK tới membership_plans.plan_id, lưu để truy vấn nhanh',

  so_tien_da_giam     DECIMAL(12,0)  NOT NULL DEFAULT 0      COMMENT 'Số tiền thực tế được giảm (VNĐ). = 0 nếu loại TangNgay hoặc TangChuKy',
  so_ngay_duoc_tang   SMALLINT       NOT NULL DEFAULT 0      COMMENT 'Số ngày thực tế được cộng thêm vào ngày hết hạn. = 0 nếu loại GiamPhanTram hoặc GiamTienMat',

  ap_dung_luc         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm khuyến mãi được áp dụng',

  PRIMARY KEY (usage_id),
  UNIQUE KEY uq_su_dung_package (member_package_id)          COMMENT 'Mỗi gói hội viên chỉ được áp dụng 1 khuyến mãi duy nhất',

  CONSTRAINT fk_su_dung_km
    FOREIGN KEY (promotion_id)      REFERENCES promotions      (promotion_id),
  CONSTRAINT fk_su_dung_package
    FOREIGN KEY (member_package_id) REFERENCES member_packages (member_package_id),
  CONSTRAINT fk_su_dung_hv
    FOREIGN KEY (member_id)         REFERENCES members         (member_id),
  CONSTRAINT fk_su_dung_goi
    FOREIGN KEY (plan_id)           REFERENCES membership_plans(plan_id)
) ENGINE=InnoDB COMMENT='Lịch sử áp dụng khuyến mãi — chỉ ghi thêm, không sửa xóa';


-- ============================================================
--  BẢNG 13: check_ins  (Lịch sử check-in / check-out)
--
--  ĐÃ SỬA: gộp lại check-in và check-out vào chung 1 bảng
--  (không tách bảng riêng nữa). Mỗi bản ghi = 1 lượt vào tập,
--  check_out_* để NULL cho tới khi hội viên check out.
--  method / staff_id / manual_reason áp dụng cho lượt CHECK IN.
--  check_out_method / check_out_staff_id / check_out_manual_reason
--  áp dụng riêng cho lượt CHECK OUT (có thể khác người/khác cách
--  với check in, nên tách cột riêng thay vì dùng chung).
-- ============================================================
CREATE TABLE check_ins (
  check_in_id             BIGINT    NOT NULL AUTO_INCREMENT  COMMENT 'Mã lần check-in — khóa chính tự tăng',

  member_id               BIGINT    NOT NULL                 COMMENT 'Hội viên check in — FK tới members.member_id',
  member_package_id       BIGINT    NOT NULL                 COMMENT 'Gói tập đang còn hiệu lực tại thời điểm check in — FK tới member_packages.member_package_id',
  branch_id               INT       NOT NULL                 COMMENT 'Chi nhánh hội viên vào tập — FK tới branches.branch_id',

  check_in_time            DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm hội viên vào tập',
  method                   ENUM('Auto','Manual') NOT NULL     COMMENT 'Phương thức check in: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công',
  staff_id                 BIGINT    NULL                     COMMENT 'Nhân viên thực hiện check in thủ công — FK tới employees.employee_id. NULL nếu method = Auto',
  manual_reason            TEXT      NULL                     COMMENT 'Lý do check in thủ công, VD: camera lỗi, hội viên chưa đăng ký khuôn mặt. Bắt buộc khi method = Manual',

  check_out_time           DATETIME  NULL                     COMMENT 'Thời điểm hội viên ra về. NULL = chưa check out',
  check_out_method          ENUM('Auto','Manual') NULL        COMMENT 'Phương thức check out: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công. NULL nếu chưa check out',
  check_out_staff_id        BIGINT    NULL                     COMMENT 'Nhân viên thực hiện check out thủ công — FK tới employees.employee_id. NULL nếu check_out_method = Auto hoặc chưa check out',
  check_out_manual_reason   TEXT      NULL                     COMMENT 'Lý do check out thủ công. Bắt buộc khi check_out_method = Manual',

  PRIMARY KEY (check_in_id),

  CONSTRAINT fk_checkin_hv
    FOREIGN KEY (member_id)         REFERENCES members         (member_id),
  CONSTRAINT fk_checkin_package
    FOREIGN KEY (member_package_id) REFERENCES member_packages (member_package_id),
  CONSTRAINT fk_checkin_cn
    FOREIGN KEY (branch_id)         REFERENCES branches        (branch_id),
  CONSTRAINT fk_checkin_nv
    FOREIGN KEY (staff_id)          REFERENCES employees       (employee_id),
  CONSTRAINT fk_checkout_nv
    FOREIGN KEY (check_out_staff_id) REFERENCES employees      (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử check-in và check-out của hội viên tại các chi nhánh';


-- ============================================================
--  BẢNG 14: equipment_categories  (Danh mục thiết bị)
-- ============================================================
CREATE TABLE equipment_categories (
  category_id   INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã danh mục — khóa chính tự tăng',
  category_name VARCHAR(100) NOT NULL                 COMMENT 'Tên danh mục thiết bị, VD: Cardio, Tạ tự do, Máy tập',
  description   TEXT         NULL                     COMMENT 'Mô tả chi tiết về danh mục thiết bị',
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_ten_danh_muc (category_name)
) ENGINE=InnoDB COMMENT='Danh mục phân loại thiết bị tập luyện';


-- ============================================================
--  BẢNG 15: equipment  (Thiết bị)
--
--  Vòng đời: Active → Broken → UnderMaintenance → Active
-- ============================================================
CREATE TABLE equipment (
  equipment_id   INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã thiết bị — khóa chính tự tăng',
  equipment_name VARCHAR(150) NOT NULL                 COMMENT 'Tên thiết bị, VD: Máy chạy bộ TechnoGym Run 700',
  category_id    INT          NOT NULL                 COMMENT 'Danh mục thiết bị — FK tới equipment_categories.category_id',
  branch_id      INT          NOT NULL                 COMMENT 'Chi nhánh đang đặt thiết bị — FK tới branches.branch_id',
  status         ENUM('Active','Broken','UnderMaintenance')
                 NOT NULL DEFAULT 'Active'             COMMENT 'Trạng thái: Active=đang hoạt động, Broken=bị hỏng, UnderMaintenance=đang sửa chữa',
  description    TEXT         NULL                     COMMENT 'Mô tả thêm về thiết bị, VD: serial number, năm mua',
  added_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày thiết bị được thêm vào hệ thống',
  PRIMARY KEY (equipment_id),
  CONSTRAINT fk_thietbi_danhmuc
    FOREIGN KEY (category_id) REFERENCES equipment_categories (category_id),
  CONSTRAINT fk_thietbi_chinhanh
    FOREIGN KEY (branch_id)   REFERENCES branches             (branch_id)
) ENGINE=InnoDB COMMENT='Thiết bị tập luyện được lắp đặt tại các chi nhánh';


-- ============================================================
--  BẢNG 16: equipment_images  (Hình ảnh thiết bị)  -- BẢNG MỚI
-- ============================================================
CREATE TABLE equipment_images (
  image_id     INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã ảnh — khóa chính tự tăng',
  equipment_id INT          NOT NULL                 COMMENT 'Thiết bị sở hữu ảnh — FK tới equipment.equipment_id',
  image_url    VARCHAR(500) NOT NULL                 COMMENT 'URL ảnh lưu trên S3',
  sort_order   TINYINT      NOT NULL DEFAULT 0       COMMENT 'Thứ tự hiển thị, số nhỏ hiển thị trước',
  uploaded_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tải ảnh lên',
  PRIMARY KEY (image_id),
  INDEX idx_anh_tb (equipment_id),
  CONSTRAINT fk_anh_tb
    FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id)
) ENGINE=InnoDB COMMENT='Album ảnh của từng thiết bị';


-- ============================================================
--  BẢNG 17: incidents  (Báo cáo sự cố)  -- ĐÃ SỬA
--
--  ĐÃ SỬA:
--   - Cho phép cả hội viên (khách hàng) và nhân viên tạo
--     báo cáo sự cố → tách 2 cột reported_by_member_id /
--     reported_by_employee_id, ràng buộc CHECK chỉ 1 trong 2.
--   - Bỏ workflow kỹ thuật viên (không còn incident_assignments).
--   - Vòng đời rút gọn còn 3 trạng thái:
--       PendingApproval = chờ duyệt
--       Assigned        = đã phân công (điền assigned_to)
--       Rejected        = bị từ chối (điền reject_reason)
-- ============================================================
CREATE TABLE incidents (
  incident_id              INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã sự cố — khóa chính tự tăng',
  title                    VARCHAR(255) NOT NULL                 COMMENT 'Tiêu đề ngắn gọn mô tả sự cố',
  description              TEXT         NOT NULL                 COMMENT 'Mô tả chi tiết hiện trạng sự cố',
  image_url                TEXT         NULL                     COMMENT 'URL ảnh minh chứng sự cố lưu trên S3, có thể NULL',
  branch_id                INT          NOT NULL                 COMMENT 'Chi nhánh xảy ra sự cố — FK tới branches.branch_id',
  equipment_id             INT          NULL                     COMMENT 'Thiết bị liên quan — FK tới equipment.equipment_id. NULL nếu sự cố không liên quan thiết bị cụ thể',

  reported_by_member_id    BIGINT       NULL                     COMMENT 'Hội viên báo cáo sự cố — FK tới members.member_id. Điền khi người báo cáo là hội viên',
  reported_by_employee_id  BIGINT       NULL                     COMMENT 'Nhân viên báo cáo sự cố — FK tới employees.employee_id. Điền khi người báo cáo là nhân viên',

  status                   ENUM('PendingApproval','Assigned','Rejected')
                           NOT NULL DEFAULT 'PendingApproval'   COMMENT 'Trạng thái: PendingApproval=chờ duyệt, Assigned=đã phân công, Rejected=bị từ chối',

  assigned_to              BIGINT       NULL                     COMMENT 'Nhân viên/kỹ thuật được phân công xử lý — FK tới employees.employee_id. Bắt buộc điền khi status = Assigned',
  reject_reason            TEXT         NULL                     COMMENT 'Lý do từ chối sự cố — bắt buộc điền khi status = Rejected',
  approved_by              BIGINT       NULL                     COMMENT 'Nhân viên (Manager/Admin) duyệt hoặc từ chối sự cố — FK tới employees.employee_id',

  created_at                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo báo cáo sự cố',
  updated_at                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật trạng thái gần nhất',

  PRIMARY KEY (incident_id),

  CONSTRAINT chk_incident_reporter
    CHECK (
      (reported_by_member_id IS NOT NULL AND reported_by_employee_id IS NULL) OR
      (reported_by_member_id IS NULL AND reported_by_employee_id IS NOT NULL)
    ),

  CONSTRAINT fk_su_co_cn
    FOREIGN KEY (branch_id)               REFERENCES branches   (branch_id),
  CONSTRAINT fk_su_co_tb
    FOREIGN KEY (equipment_id)            REFERENCES equipment  (equipment_id),
  CONSTRAINT fk_su_co_hv
    FOREIGN KEY (reported_by_member_id)   REFERENCES members    (member_id),
  CONSTRAINT fk_su_co_nv
    FOREIGN KEY (reported_by_employee_id) REFERENCES employees  (employee_id),
  CONSTRAINT fk_su_co_assigned
    FOREIGN KEY (assigned_to)             REFERENCES employees  (employee_id),
  CONSTRAINT fk_su_co_approved
    FOREIGN KEY (approved_by)             REFERENCES employees  (employee_id)
) ENGINE=InnoDB COMMENT='Báo cáo sự cố thiết bị/cơ sở vật chất — hội viên hoặc nhân viên đều có thể tạo';


-- ============================================================
--  BẢNG 18: notifications  (Thông báo hết hạn gói tập)  -- ĐÃ SỬA
--
--  ĐÃ SỬA: notifications giờ chỉ dùng cho MỘT mục đích duy
--  nhất — nhắc hội viên khi gói tập sắp hết hạn. Bỏ hoàn
--  toàn send_type/branch_id/group_id (đa đối tượng) và bỏ
--  luôn notification_recipients vì mỗi thông báo giờ gắn
--  trực tiếp với 1 hội viên + 1 gói tập.
--  Thường do background job tự sinh dựa trên member_packages.expiry_date
--  (VD: nhắc trước 7, 3, 1 ngày).
-- ============================================================
CREATE TABLE notifications (
  notification_id     BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã thông báo — khóa chính tự tăng',

  member_id           BIGINT       NOT NULL                 COMMENT 'Hội viên nhận thông báo — FK tới members.member_id',
  member_package_id   BIGINT       NOT NULL                 COMMENT 'Gói tập sắp hết hạn tương ứng — FK tới member_packages.member_package_id',

  days_before_expiry  SMALLINT     NOT NULL                 COMMENT 'Số ngày còn lại trước khi hết hạn tại thời điểm gửi, VD: 7, 3, 1, 0',

  title                VARCHAR(255) NOT NULL                COMMENT 'Tiêu đề thông báo, VD: Gói tập của bạn sắp hết hạn',
  content               TEXT        NOT NULL                COMMENT 'Nội dung chi tiết thông báo',

  scheduled_at          DATETIME    NOT NULL                COMMENT 'Thời điểm hẹn gửi thông báo',
  is_sent                TINYINT(1) NOT NULL DEFAULT 0      COMMENT '0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job',
  sent_at                DATETIME   NULL                    COMMENT 'Thời điểm thực tế đã gửi',
  is_read                TINYINT(1) NOT NULL DEFAULT 0      COMMENT '0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo',

  created_at             DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo thông báo',

  PRIMARY KEY (notification_id),
  UNIQUE KEY uq_notif_goi_nguong (member_package_id, days_before_expiry)
    COMMENT 'Mỗi gói hội viên chỉ nhận 1 thông báo cho mỗi mốc số-ngày-còn-lại, tránh gửi trùng',
  INDEX idx_notif_hv (member_id, is_read),

  CONSTRAINT fk_tb_hv
    FOREIGN KEY (member_id)         REFERENCES members        (member_id),
  CONSTRAINT fk_tb_goi_hv
    FOREIGN KEY (member_package_id) REFERENCES member_packages (member_package_id)
) ENGINE=InnoDB COMMENT='Thông báo nhắc hội viên khi gói tập sắp hết hạn — do background job tự sinh';


-- ============================================================
--  BẢNG 19: account_lock_log  (Lịch sử khóa/mở tài khoản)
--
--  Tách thành hai cột riêng biệt thay vì dùng polymorphic
--  entity_id + entity_type để đảm bảo ràng buộc FK.
--  Chỉ một trong hai (member_id hoặc employee_id) được điền,
--  cột còn lại để NULL. Ràng buộc CHECK đảm bảo điều này.
--  Bảng này chỉ ghi thêm, không sửa, không xóa.
-- ============================================================
CREATE TABLE account_lock_log (
  log_id       BIGINT   NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  member_id    BIGINT   NULL                     COMMENT 'Hội viên bị tác động — FK tới members.member_id. Điền khi khóa/mở tài khoản hội viên, NULL nếu là nhân viên',
  employee_id  BIGINT   NULL                     COMMENT 'Nhân viên bị tác động — FK tới employees.employee_id. Điền khi khóa/mở tài khoản nhân viên, NULL nếu là hội viên',
  action       ENUM('Lock','Unlock') NOT NULL    COMMENT 'Hành động thực hiện: Lock = khóa tài khoản, Unlock = mở khóa tài khoản',
  reason       TEXT     NULL                     COMMENT 'Lý do khóa hoặc mở khóa tài khoản',
  performed_by BIGINT   NOT NULL                 COMMENT 'Nhân viên thực hiện thao tác — FK tới employees.employee_id',
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thực hiện',
  PRIMARY KEY (log_id),
  CONSTRAINT chk_lock_target
    CHECK (
      (member_id IS NOT NULL AND employee_id IS NULL) OR
      (member_id IS NULL AND employee_id IS NOT NULL)
    ),
  CONSTRAINT fk_kl_hv
    FOREIGN KEY (member_id)   REFERENCES members   (member_id),
  CONSTRAINT fk_kl_nv_target
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
  CONSTRAINT fk_kl_nv
    FOREIGN KEY (performed_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử khóa/mở tài khoản hội viên và nhân viên — chỉ ghi thêm';


-- ============================================================
--  BẢNG 20: member_update_logs  (Lịch sử cập nhật thông tin hội viên)
--
--  update_session_id dùng để gộp các field_name cùng thay đổi
--  trong 1 lần cập nhật (ứng dụng tự sinh UUID cho mỗi lần lưu).
--  Bảng này chỉ ghi thêm, không sửa, không xóa.
-- ============================================================
CREATE TABLE member_update_logs (
  id                      BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  update_session_id       CHAR(36)     NOT NULL                 COMMENT 'Mã phiên cập nhật (UUID) — nhóm các field_name cùng thay đổi trong 1 lần lưu',
  member_id               BIGINT       NOT NULL                 COMMENT 'Hội viên được cập nhật thông tin — FK tới members.member_id',
  field_name              VARCHAR(100) NOT NULL                 COMMENT 'Tên trường dữ liệu bị thay đổi, VD: phone, full_name, gender',
  old_value               TEXT         NULL                     COMMENT 'Giá trị cũ trước khi thay đổi — NULL nếu trường trước đó chưa có giá trị',
  new_value                TEXT        NOT NULL                 COMMENT 'Giá trị mới sau khi thay đổi',
  updated_by_employee_id   BIGINT      NOT NULL                 COMMENT 'Nhân viên thực hiện cập nhật — FK tới employees.employee_id',
  updated_at               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thực hiện cập nhật',
  PRIMARY KEY (id),
  INDEX idx_mul_session (update_session_id),
  INDEX idx_mul_member  (member_id, field_name),
  CONSTRAINT fk_mul_member
    FOREIGN KEY (member_id)             REFERENCES members   (member_id),
  CONSTRAINT fk_mul_employee
    FOREIGN KEY (updated_by_employee_id) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử cập nhật thông tin hội viên (theo từng field) — chỉ ghi thêm, không sửa xóa';


-- ============================================================
--  BẢNG 21: otp  (Mã xác thực một lần)
-- ============================================================
CREATE TABLE otp (
  otp_id          BIGINT      NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  phone           VARCHAR(15) NOT NULL                 COMMENT 'Số điện thoại nhận OTP',
  otp_code        VARCHAR(10) NOT NULL                 COMMENT 'Mã OTP gửi cho người dùng (lưu dạng hash nếu cần bảo mật cao hơn)',
  purpose         ENUM('DangKy','QuenMatKhau','DoiSoDienThoai') NOT NULL COMMENT 'Mục đích: DangKy=đăng ký mới, QuenMatKhau=đặt lại mật khẩu, DoiSoDienThoai=xác nhận đổi số',
  expires_at      DATETIME    NOT NULL                 COMMENT 'Thời điểm OTP hết hạn — thường 5 phút kể từ lúc tạo',
  failed_attempts TINYINT     NOT NULL DEFAULT 0       COMMENT 'Số lần nhập sai liên tiếp — ứng dụng khóa sau N lần',
  is_used         TINYINT(1)  NOT NULL DEFAULT 0       COMMENT '0 = chưa dùng, 1 = đã dùng thành công',
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo và gửi OTP',
  PRIMARY KEY (otp_id),
  INDEX idx_otp_phone_purpose (phone, purpose),
  INDEX idx_otp_het_han       (expires_at)
) ENGINE=InnoDB COMMENT='Mã OTP xác thực một lần gửi qua SMS';


-- ============================================================
--  BẢNG 22: gym_density  (Mật độ người tập)
--
--  Snapshot số người đang có mặt được ghi bởi job ngoài
--  (cảm biến, camera đếm người, hoặc logic nghiệp vụ riêng).
-- ============================================================
CREATE TABLE gym_density (
  density_id   BIGINT   NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  branch_id    INT      NOT NULL                 COMMENT 'Chi nhánh được ghi nhận — FK tới branches.branch_id',
  recorded_at  DATETIME NOT NULL                 COMMENT 'Thời điểm ghi nhận snapshot, VD: mỗi 15 phút job tự chạy',
  headcount    SMALLINT NOT NULL                 COMMENT 'Số người đang có mặt tại chi nhánh tại thời điểm ghi nhận',
  PRIMARY KEY (density_id),
  INDEX idx_mat_do_cn_tg (branch_id, recorded_at),
  CONSTRAINT fk_md_cn
    FOREIGN KEY (branch_id) REFERENCES branches (branch_id)
) ENGINE=InnoDB COMMENT='Snapshot mật độ người tập theo thời gian — dữ liệu do job ngoài hoặc cảm biến ghi vào';


-- ============================================================
--  BẢNG 23: branch_images  (Hình ảnh chi nhánh)
-- ============================================================
CREATE TABLE branch_images (
  image_id    INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã ảnh — khóa chính tự tăng',
  branch_id   INT          NOT NULL                 COMMENT 'Chi nhánh sở hữu ảnh — FK tới branches.branch_id',
  image_url   VARCHAR(500) NOT NULL                 COMMENT 'URL ảnh lưu trên S3',
  image_type  VARCHAR(100) NOT NULL                 COMMENT 'Khu vực trong ảnh, VD: Lễ tân, Phòng tập, Phòng thay đồ, Hồ bơi',
  sort_order  TINYINT      NOT NULL DEFAULT 0       COMMENT 'Thứ tự hiển thị trong cùng image_type, số nhỏ hiển thị trước',
  uploaded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tải ảnh lên',
  PRIMARY KEY (image_id),
  INDEX idx_anh_cn (branch_id),
  CONSTRAINT fk_anh_cn
    FOREIGN KEY (branch_id) REFERENCES branches (branch_id)
) ENGINE=InnoDB COMMENT='Album ảnh các khu vực của từng chi nhánh — chỉ Admin quản lý';


-- ============================================================
--  BẢNG 24: home_images  (Hình ảnh trang chủ)  -- BẢNG MỚI
--
--  Chỉ dùng để lưu ảnh hiển thị cho trang home (banner,
--  slideshow...), không gắn với chi nhánh/thiết bị cụ thể.
-- ============================================================
CREATE TABLE home_images (
  image_id    INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã ảnh — khóa chính tự tăng',
  image_url   VARCHAR(500) NOT NULL                 COMMENT 'URL ảnh lưu trên S3',
  title       VARCHAR(255) NULL                     COMMENT 'Tiêu đề/chú thích hiển thị kèm ảnh, có thể NULL',
  link_url    VARCHAR(500) NULL                     COMMENT 'Đường dẫn khi người dùng bấm vào ảnh (VD: liên kết tới gói tập, khuyến mãi), có thể NULL',
  sort_order  TINYINT      NOT NULL DEFAULT 0       COMMENT 'Thứ tự hiển thị trên trang home, số nhỏ hiển thị trước',
  status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái hiển thị: Active = đang hiện, Inactive = đang ẩn',
  uploaded_by BIGINT       NOT NULL                 COMMENT 'Nhân viên (Admin) tải ảnh lên — FK tới employees.employee_id',
  uploaded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tải ảnh lên',
  PRIMARY KEY (image_id),
  CONSTRAINT fk_home_img_nv
    FOREIGN KEY (uploaded_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Ảnh hiển thị trên trang chủ (banner/slideshow) — chỉ Admin quản lý';


-- ============================================================
--  BẢNG 25: news  (Tin tức)  -- BẢNG MỚI
-- ============================================================
CREATE TABLE news (
  news_id        INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã tin tức — khóa chính tự tăng',
  title          VARCHAR(255) NOT NULL                 COMMENT 'Tiêu đề tin tức',
  summary        VARCHAR(500) NULL                     COMMENT 'Tóm tắt ngắn hiển thị ở danh sách tin tức',
  content        TEXT         NOT NULL                 COMMENT 'Nội dung đầy đủ của bài tin tức',
  thumbnail_url  VARCHAR(500) NULL                     COMMENT 'URL ảnh đại diện bài viết lưu trên S3',
  status         ENUM('Draft','Published','Hidden') NOT NULL DEFAULT 'Draft'
                 COMMENT 'Trạng thái: Draft=đang soạn, Published=đã đăng, Hidden=đã ẩn',
  created_by     BIGINT       NOT NULL                 COMMENT 'Nhân viên soạn bài — FK tới employees.employee_id',
  published_at   DATETIME     NULL                     COMMENT 'Thời điểm bài viết được đăng — điền khi status = Published',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm tạo bài viết',
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật gần nhất',
  PRIMARY KEY (news_id),
  INDEX idx_news_status (status, published_at),
  CONSTRAINT fk_news_nv
    FOREIGN KEY (created_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Tin tức / bài viết hiển thị cho hội viên';


-- ============================================================
--  BẢNG 26: refresh_tokens  (Token xác thực)
--
--  Tách thành hai cột riêng biệt thay vì dùng polymorphic
--  entity_id + entity_type để đảm bảo ràng buộc FK.
--  Chỉ một trong hai (member_id hoặc employee_id) được điền.
-- ============================================================
CREATE TABLE refresh_tokens (
  token_id      BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Mã token — khóa chính tự tăng',

  entity_id     BIGINT NOT NULL COMMENT 'ID của tài khoản sở hữu token (member_id hoặc employee_id)',

  entity_type   ENUM('Member','Employee') NOT NULL
                COMMENT 'Loại tài khoản sở hữu token',

  role          VARCHAR(50) NOT NULL
                COMMENT 'Role tại thời điểm đăng nhập',

  token_hash    VARCHAR(255) NOT NULL
                COMMENT 'SHA-256 hash của refresh token',

  expires_at    DATETIME NOT NULL
                COMMENT 'Thời điểm token hết hạn',

  revoked_at    DATETIME NULL
                COMMENT 'Thời điểm token bị thu hồi',

  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                COMMENT 'Thời điểm tạo token',

  PRIMARY KEY (token_id),

  UNIQUE KEY uq_token_hash (token_hash),

  INDEX idx_rt_entity (entity_id, entity_type)

) ENGINE=InnoDB
COMMENT='Refresh token cho hội viên và nhân viên';


-- ============================================================
--  BẢNG 27: forum_posts  (Bài đăng forum)
--
--  Hỗ trợ cả bài gốc và "đăng lại" (repost/share):
--    post_type = Original → bài viết gốc, original_post_id = NULL
--    post_type = Repost   → bài chia sẻ lại 1 bài khác, bắt buộc
--                            điền original_post_id, content có thể
--                            NULL nếu chỉ chia sẻ không kèm lời bình
--  like_count / comment_count / repost_count là số đếm được đồng
--  bộ bởi ứng dụng (hoặc trigger) mỗi khi có like/comment/repost
--  mới — tránh phải COUNT(*) mỗi lần hiển thị danh sách bài viết.
-- ============================================================
CREATE TABLE forum_posts (
  post_id           BIGINT   NOT NULL AUTO_INCREMENT  COMMENT 'Mã bài đăng — khóa chính tự tăng',
  member_id         BIGINT   NOT NULL                 COMMENT 'Hội viên tạo bài đăng — FK tới members.member_id',

  content           TEXT     NULL                     COMMENT 'Nội dung bài viết. Có thể NULL nếu là Repost không kèm lời bình',

  post_type         ENUM('Original','Repost') NOT NULL DEFAULT 'Original'
                     COMMENT 'Loại bài: Original = bài gốc, Repost = đăng lại bài của người khác',
  original_post_id  BIGINT   NULL                     COMMENT 'Bài viết gốc được đăng lại — FK tự tham chiếu tới forum_posts.post_id. Bắt buộc khi post_type = Repost, NULL khi Original',

  like_count        INT      NOT NULL DEFAULT 0       COMMENT 'Số lượt tym — đồng bộ mỗi khi forum_likes thay đổi',
  comment_count     INT      NOT NULL DEFAULT 0       COMMENT 'Số lượt bình luận — đồng bộ mỗi khi forum_comments thay đổi',
  repost_count      INT      NOT NULL DEFAULT 0       COMMENT 'Số lượt được đăng lại — đồng bộ mỗi khi có bài Repost mới trỏ tới bài này',

  status            ENUM('Active','Hidden','Deleted') NOT NULL DEFAULT 'Active'
                     COMMENT 'Trạng thái: Active=đang hiển thị, Hidden=bị Admin ẩn do vi phạm, Deleted=hội viên tự xóa (soft delete)',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm đăng bài',
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm chỉnh sửa gần nhất',

  PRIMARY KEY (post_id),
  INDEX idx_post_member (member_id, status, created_at)  COMMENT 'Phục vụ truy vấn trang cá nhân: bài của 1 hội viên, mới nhất trước',
  INDEX idx_post_original (original_post_id),

  CONSTRAINT chk_post_repost
    CHECK (
      (post_type = 'Repost'   AND original_post_id IS NOT NULL) OR
      (post_type = 'Original' AND original_post_id IS NULL)
    ),

  CONSTRAINT fk_post_member
    FOREIGN KEY (member_id)        REFERENCES members     (member_id),
  CONSTRAINT fk_post_original
    FOREIGN KEY (original_post_id) REFERENCES forum_posts (post_id)
) ENGINE=InnoDB COMMENT='Bài đăng trên forum của hội viên, gồm cả bài gốc và bài đăng lại';


-- ============================================================
--  BẢNG 28: forum_post_images  (Hình ảnh bài đăng)
-- ============================================================
CREATE TABLE forum_post_images (
  image_id    BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã ảnh — khóa chính tự tăng',
  post_id     BIGINT       NOT NULL                 COMMENT 'Bài đăng sở hữu ảnh — FK tới forum_posts.post_id',
  image_url   VARCHAR(500) NOT NULL                 COMMENT 'URL ảnh lưu trên S3',
  sort_order  TINYINT      NOT NULL DEFAULT 0       COMMENT 'Thứ tự hiển thị trong bài (ảnh 1, ảnh 2...), số nhỏ hiển thị trước',
  uploaded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tải ảnh lên',
  PRIMARY KEY (image_id),
  INDEX idx_postimg_post (post_id),
  CONSTRAINT fk_postimg_post
    FOREIGN KEY (post_id) REFERENCES forum_posts (post_id)
    ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Ảnh đính kèm trong bài đăng forum, 1 bài có thể có nhiều ảnh';


-- ============================================================
--  BẢNG 29: forum_likes  (Lượt tym bài đăng)
--
--  Mỗi hội viên chỉ được tym 1 lần / 1 bài viết (UNIQUE).
--  Bỏ tym = xóa bản ghi (không dùng cột trạng thái) vì đây
--  là dữ liệu có thể xóa/thêm lại tự do, không cần lưu lịch sử.
-- ============================================================
CREATE TABLE forum_likes (
  like_id     BIGINT   NOT NULL AUTO_INCREMENT  COMMENT 'Mã lượt tym — khóa chính tự tăng',
  post_id     BIGINT   NOT NULL                 COMMENT 'Bài đăng được tym — FK tới forum_posts.post_id',
  member_id   BIGINT   NOT NULL                 COMMENT 'Hội viên thực hiện tym — FK tới members.member_id',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tym',
  PRIMARY KEY (like_id),
  UNIQUE KEY uq_like_post_member (post_id, member_id) COMMENT 'Mỗi hội viên chỉ tym 1 lần cho mỗi bài viết',
  INDEX idx_like_member (member_id),
  CONSTRAINT fk_like_post
    FOREIGN KEY (post_id)   REFERENCES forum_posts (post_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_like_member
    FOREIGN KEY (member_id) REFERENCES members     (member_id)
) ENGINE=InnoDB COMMENT='Lượt tym (yêu thích) bài đăng forum của hội viên';


-- ============================================================
--  BẢNG 30: forum_comments  (Bình luận bài đăng)
--
--  parent_comment_id  : bình luận GỐC của cả nhánh — dùng để gom
--                        nhóm hiển thị (cây 1 cấp, mọi reply trong
--                        cùng nhánh đều trỏ thẳng về bình luận gốc,
--                        không lồng nhiều cấp). NULL nếu bản thân
--                        nó là bình luận gốc.
--  reply_to_member_id : hội viên ĐANG ĐƯỢC TRẢ LỜI đích danh — dùng
--                        để hiển thị "Trả lời @Tên" và để biết gửi
--                        thông báo Reply cho ai. Khác với
--                        parent_comment_id vì khi trả lời 1 reply
--                        (không phải bình luận gốc), parent_comment_id
--                        vẫn trỏ về gốc nhưng reply_to_member_id phải
--                        trỏ đúng người vừa được trả lời (không phải
--                        chủ bình luận gốc). NULL nếu đây là bình
--                        luận gốc (không trả lời ai).
-- ============================================================
CREATE TABLE forum_comments (
  comment_id          BIGINT   NOT NULL AUTO_INCREMENT  COMMENT 'Mã bình luận — khóa chính tự tăng',
  post_id              BIGINT   NOT NULL                 COMMENT 'Bài đăng được bình luận — FK tới forum_posts.post_id',
  member_id            BIGINT   NOT NULL                 COMMENT 'Hội viên bình luận — FK tới members.member_id',
  parent_comment_id    BIGINT   NULL                     COMMENT 'Bình luận gốc của nhánh — FK tự tham chiếu tới forum_comments.comment_id, NULL nếu bản thân là bình luận gốc',
  reply_to_member_id   BIGINT   NULL                     COMMENT 'Hội viên đang được trả lời đích danh — FK tới members.member_id. Bắt buộc điền khi là reply, NULL nếu là bình luận gốc',

  content              TEXT     NOT NULL                 COMMENT 'Nội dung bình luận',
  status               ENUM('Active','Deleted') NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái: Active=đang hiển thị, Deleted=đã xóa (soft delete)',

  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP      COMMENT 'Thời điểm bình luận',
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm chỉnh sửa gần nhất',

  PRIMARY KEY (comment_id),
  INDEX idx_comment_post (post_id, created_at),
  INDEX idx_comment_parent (parent_comment_id),

  CONSTRAINT chk_comment_reply
    CHECK (
      (parent_comment_id IS NULL AND reply_to_member_id IS NULL) OR
      (parent_comment_id IS NOT NULL AND reply_to_member_id IS NOT NULL)
    ),

  CONSTRAINT fk_comment_post
    FOREIGN KEY (post_id)             REFERENCES forum_posts    (post_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comment_member
    FOREIGN KEY (member_id)           REFERENCES members        (member_id),
  CONSTRAINT fk_comment_parent
    FOREIGN KEY (parent_comment_id)   REFERENCES forum_comments (comment_id),
  CONSTRAINT fk_comment_reply_to
    FOREIGN KEY (reply_to_member_id)  REFERENCES members        (member_id)
) ENGINE=InnoDB COMMENT='Bình luận trong bài đăng forum, hỗ trợ trả lời 1 cấp và @ đích danh người được trả lời';


-- ============================================================
--  BẢNG 31: forum_notifications  (Thông báo forum)
--
--  Sinh ra khi có người khác tym, bình luận, hoặc trả lời đích
--  danh bình luận của hội viên. recipient_member_id = người NHẬN
--  thông báo, actor_member_id = người vừa thực hiện hành động.
--  Không tạo thông báo khi actor_member_id = recipient_member_id
--  (tự tym/cmt/trả lời chính mình).
--
--  Quy tắc xác định recipient_member_id theo notify_type:
--    Like    → chủ bài viết (forum_posts.member_id)
--    Comment → chủ bài viết (forum_posts.member_id) — dùng cho
--              bình luận GỐC (parent_comment_id NULL)
--    Reply   → forum_comments.reply_to_member_id — dùng cho lượt
--              trả lời đích danh 1 bình luận cụ thể. Nếu người
--              được trả lời cũng chính là chủ bài viết thì CHỈ
--              tạo 1 thông báo Reply, không tạo thêm Comment,
--              tránh trùng lặp.
-- ============================================================
CREATE TABLE forum_notifications (
  notification_id     BIGINT     NOT NULL AUTO_INCREMENT  COMMENT 'Mã thông báo — khóa chính tự tăng',

  recipient_member_id BIGINT     NOT NULL                 COMMENT 'Hội viên nhận thông báo — FK tới members.member_id',
  actor_member_id     BIGINT     NOT NULL                 COMMENT 'Hội viên thực hiện hành động (người tym/bình luận/trả lời) — FK tới members.member_id',

  notify_type          ENUM('Like','Comment','Reply') NOT NULL COMMENT 'Loại thông báo: Like=có người tym bài, Comment=có người bình luận bài, Reply=có người trả lời đích danh bình luận của mình',

  post_id               BIGINT    NOT NULL                COMMENT 'Bài đăng liên quan — FK tới forum_posts.post_id',
  comment_id            BIGINT    NULL                     COMMENT 'Bình luận liên quan — FK tới forum_comments.comment_id. Bắt buộc điền khi notify_type = Comment, NULL khi notify_type = Like',

  is_read                TINYINT(1) NOT NULL DEFAULT 0    COMMENT '0 = chưa đọc, 1 = đã đọc',
  created_at              DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm phát sinh thông báo',

  PRIMARY KEY (notification_id),
  INDEX idx_forumnotif_recipient (recipient_member_id, is_read, created_at),

  CONSTRAINT fk_forumnotif_recipient
    FOREIGN KEY (recipient_member_id) REFERENCES members        (member_id),
  CONSTRAINT fk_forumnotif_actor
    FOREIGN KEY (actor_member_id)     REFERENCES members        (member_id),
  CONSTRAINT fk_forumnotif_post
    FOREIGN KEY (post_id)             REFERENCES forum_posts    (post_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_forumnotif_comment
    FOREIGN KEY (comment_id)          REFERENCES forum_comments (comment_id)
) ENGINE=InnoDB COMMENT='Thông báo cho hội viên khi bài viết của họ được tym hoặc bình luận';


-- ============================================================
--  STORED PROCEDURE: sp_gan_khuyen_mai_vao_goi
--
--  Gắn một gói tập vào chương trình khuyến mãi.
--  Kiểm tra xem gói đó đã có KM nào trùng thời gian chưa
--  trước khi INSERT vào promotion_plans.
--  PHẢI dùng procedure này thay cho INSERT trực tiếp.
-- ============================================================
DELIMITER $$

CREATE PROCEDURE sp_gan_khuyen_mai_vao_goi (
  IN p_promotion_id INT,
  IN p_plan_id      INT
)
BEGIN
  DECLARE v_so_trung      INT      DEFAULT 0;
  DECLARE v_ngay_bat_dau  DATETIME;
  DECLARE v_ngay_ket_thuc DATETIME;

  -- Lấy thời gian của khuyến mãi muốn gắn
  SELECT ngay_bat_dau, ngay_ket_thuc
    INTO v_ngay_bat_dau, v_ngay_ket_thuc
    FROM promotions
   WHERE promotion_id = p_promotion_id;

  -- Kiểm tra gói này có KM nào khác trùng thời gian không
  -- Bỏ qua KM ở trạng thái NhapLieu và HetHan
  SELECT COUNT(*) INTO v_so_trung
    FROM promotion_plans pp
    JOIN promotions km ON km.promotion_id = pp.promotion_id
   WHERE pp.plan_id        = p_plan_id
     AND pp.promotion_id  != p_promotion_id
     AND km.trang_thai    NOT IN ('NhapLieu', 'HetHan')
     AND km.ngay_bat_dau  <= v_ngay_ket_thuc
     AND km.ngay_ket_thuc >= v_ngay_bat_dau;

  IF v_so_trung > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT =
        'Gói tập này đã có khuyến mãi khác đang hoạt động trong khoảng thời gian trùng. '
        'Vui lòng điều chỉnh ngày bắt đầu hoặc ngày kết thúc trước khi gắn.';
  ELSE
    INSERT INTO promotion_plans (promotion_id, plan_id)
    VALUES (p_promotion_id, p_plan_id);
  END IF;
END$$

DELIMITER ;