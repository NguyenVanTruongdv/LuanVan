-- ============================================================
--  CƠ SỞ DỮ LIỆU: gym_management
--  Phiên bản đã sửa lỗi đầy đủ
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
-- ============================================================
CREATE TABLE employees (
  employee_id    BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã nhân viên — khóa chính tự tăng',
  full_name      VARCHAR(100) NOT NULL                 COMMENT 'Họ và tên đầy đủ của nhân viên',
  phone          VARCHAR(15)  NOT NULL                 COMMENT 'Số điện thoại — dùng làm tên đăng nhập, phải duy nhất',
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
--  check_out_time cho phép NULL vì không có cơ chế tự động
--  xác định thời điểm hội viên rời khỏi phòng tập.
--  gym_density sẽ do job ngoài tính toán riêng.
--  method = Auto → nhận diện khuôn mặt.
--  method = Manual → nhân viên check in thủ công, bắt buộc
--                    có staff_id và manual_reason.
-- ============================================================
CREATE TABLE check_ins (
  check_in_id       BIGINT    NOT NULL AUTO_INCREMENT  COMMENT 'Mã lần check-in — khóa chính tự tăng',

  member_id         BIGINT    NOT NULL                 COMMENT 'Hội viên check in — FK tới members.member_id',
  member_package_id BIGINT    NOT NULL                 COMMENT 'Gói tập đang còn hiệu lực tại thời điểm check in — FK tới member_packages.member_package_id',
  branch_id         INT       NOT NULL                 COMMENT 'Chi nhánh hội viên vào tập — FK tới branches.branch_id',

  check_in_time     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm hội viên vào tập',
  check_out_time    DATETIME  NULL                     COMMENT 'Thời điểm hội viên ra về. NULL = chưa check out hoặc không xác định được',

  method            ENUM('Auto','Manual') NOT NULL     COMMENT 'Phương thức check in: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công',

  staff_id          BIGINT    NULL                     COMMENT 'Nhân viên thực hiện check in thủ công — FK tới employees.employee_id. NULL nếu method = Auto',
  manual_reason     TEXT      NULL                     COMMENT 'Lý do check in thủ công, VD: camera lỗi, hội viên chưa đăng ký khuôn mặt. Bắt buộc khi method = Manual',

  PRIMARY KEY (check_in_id),

  CONSTRAINT fk_checkin_hv
    FOREIGN KEY (member_id)         REFERENCES members         (member_id),
  CONSTRAINT fk_checkin_package
    FOREIGN KEY (member_package_id) REFERENCES member_packages (member_package_id),
  CONSTRAINT fk_checkin_cn
    FOREIGN KEY (branch_id)         REFERENCES branches        (branch_id),
  CONSTRAINT fk_checkin_nv
    FOREIGN KEY (staff_id)          REFERENCES employees       (employee_id)
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
--  BẢNG 16: incidents  (Báo cáo sự cố)
--
--  Vòng đời: PendingApproval → Assigned → Resolved | Rejected
--  Khi incident_assignments.work_status = Completed,
--  ứng dụng phải đồng thời cập nhật incidents.status = Resolved
--  và điền resolved_at để đảm bảo nhất quán.
-- ============================================================
CREATE TABLE incidents (
  incident_id  INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã sự cố — khóa chính tự tăng',
  title        VARCHAR(255) NOT NULL                 COMMENT 'Tiêu đề ngắn gọn mô tả sự cố',
  description  TEXT         NOT NULL                 COMMENT 'Mô tả chi tiết hiện trạng sự cố',
  image_url    TEXT         NULL                     COMMENT 'URL ảnh minh chứng sự cố lưu trên S3, có thể NULL',
  branch_id    INT          NOT NULL                 COMMENT 'Chi nhánh xảy ra sự cố — FK tới branches.branch_id',
  equipment_id INT          NULL                     COMMENT 'Thiết bị liên quan — FK tới equipment.equipment_id. NULL nếu sự cố không liên quan thiết bị cụ thể',
  status       ENUM('PendingApproval','Assigned','Resolved','Rejected')
               NOT NULL DEFAULT 'PendingApproval'   COMMENT 'Trạng thái xử lý: PendingApproval=chờ duyệt, Assigned=đã phân công, Resolved=đã xử lý xong, Rejected=bị từ chối. Phải đồng bộ với incident_assignments.work_status',
  reported_by  BIGINT       NOT NULL                 COMMENT 'Nhân viên báo cáo sự cố — FK tới employees.employee_id',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo báo cáo sự cố',
  resolved_at  DATETIME     NULL                     COMMENT 'Thời điểm sự cố được xử lý hoàn tất — điền khi status = Resolved',
  PRIMARY KEY (incident_id),
  CONSTRAINT fk_su_co_cn
    FOREIGN KEY (branch_id)    REFERENCES branches   (branch_id),
  CONSTRAINT fk_su_co_tb
    FOREIGN KEY (equipment_id) REFERENCES equipment  (equipment_id),
  CONSTRAINT fk_su_co_nv
    FOREIGN KEY (reported_by)  REFERENCES employees  (employee_id)
) ENGINE=InnoDB COMMENT='Báo cáo sự cố thiết bị và cơ sở vật chất tại các chi nhánh';


-- ============================================================
--  BẢNG 17: incident_assignments  (Phân công xử lý sự cố)
--
--  Mỗi sự cố chỉ có đúng một phân công (UNIQUE incident_id).
--  Khi work_status chuyển thành Completed, ứng dụng phải
--  cập nhật incidents.status = Resolved và incidents.resolved_at
--  đồng thời để đảm bảo nhất quán giữa hai bảng.
-- ============================================================
CREATE TABLE incident_assignments (
  assignment_id   INT      NOT NULL AUTO_INCREMENT  COMMENT 'Mã phân công — khóa chính tự tăng',
  incident_id     INT      NOT NULL                 COMMENT 'Sự cố cần xử lý — FK tới incidents.incident_id, mỗi sự cố chỉ có 1 phân công',
  technician_id   BIGINT   NOT NULL                 COMMENT 'Kỹ thuật viên được giao việc — FK tới employees.employee_id',
  manager_id      BIGINT   NOT NULL                 COMMENT 'Quản lý thực hiện phân công — FK tới employees.employee_id',
  work_status     ENUM('NotStarted','InProgress','WaitingForParts','Completed')
                  NOT NULL DEFAULT 'NotStarted'     COMMENT 'Tiến độ công việc: NotStarted=chưa bắt đầu, InProgress=đang sửa, WaitingForParts=chờ linh kiện, Completed=hoàn thành. Khi Completed phải cập nhật incidents.status=Resolved',
  work_notes      TEXT     NULL                     COMMENT 'Ghi chú tiến độ do kỹ thuật viên cập nhật',
  after_image     TEXT     NULL                     COMMENT 'URL ảnh sau khi sửa xong, dùng để xác nhận hoàn tất',
  assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm quản lý thực hiện phân công',
  completed_at    DATETIME NULL                     COMMENT 'Thời điểm kỹ thuật viên hoàn thành — điền khi work_status = Completed',
  PRIMARY KEY (assignment_id),
  UNIQUE KEY uq_phan_cong_su_co (incident_id),
  CONSTRAINT fk_pc_su_co
    FOREIGN KEY (incident_id)   REFERENCES incidents (incident_id),
  CONSTRAINT fk_pc_ktv
    FOREIGN KEY (technician_id) REFERENCES employees (employee_id),
  CONSTRAINT fk_pc_ql
    FOREIGN KEY (manager_id)    REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Phân công kỹ thuật viên xử lý sự cố. Khi Completed phải đồng bộ incidents.status';


-- ============================================================
--  BẢNG 18: member_groups  (Nhóm hội viên)
--
--  Hỗ trợ tính năng send_type = ByGroup của notifications.
--  Quản lý tạo nhóm và thêm hội viên vào nhóm để gửi
--  thông báo có chọn lọc.
-- ============================================================
CREATE TABLE member_groups (
  group_id    INT          NOT NULL AUTO_INCREMENT  COMMENT 'Mã nhóm — khóa chính tự tăng',
  group_name  VARCHAR(150) NOT NULL                 COMMENT 'Tên nhóm hội viên, VD: Khách VIP, Học sinh sinh viên',
  description TEXT         NULL                     COMMENT 'Mô tả mục đích hoặc tiêu chí của nhóm',
  created_by  BIGINT       NOT NULL                 COMMENT 'Nhân viên tạo nhóm — FK tới employees.employee_id',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo nhóm',
  PRIMARY KEY (group_id),
  CONSTRAINT fk_nhom_nguoi_tao
    FOREIGN KEY (created_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Nhóm hội viên dùng để gửi thông báo theo nhóm (ByGroup)';


-- ============================================================
--  BẢNG 19: member_group_members  (Thành viên trong nhóm)
-- ============================================================
CREATE TABLE member_group_members (
  id        BIGINT  NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  group_id  INT     NOT NULL                 COMMENT 'Nhóm hội viên — FK tới member_groups.group_id',
  member_id BIGINT  NOT NULL                 COMMENT 'Hội viên thuộc nhóm — FK tới members.member_id',
  PRIMARY KEY (id),
  UNIQUE KEY uq_nhom_hv (group_id, member_id),
  CONSTRAINT fk_nhom_tv_nhom
    FOREIGN KEY (group_id)  REFERENCES member_groups (group_id) ON DELETE CASCADE,
  CONSTRAINT fk_nhom_tv_hv
    FOREIGN KEY (member_id) REFERENCES members       (member_id)
) ENGINE=InnoDB COMMENT='Bảng trung gian liên kết hội viên với nhóm';


-- ============================================================
--  BẢNG 20: notifications  (Thông báo)
-- ============================================================
CREATE TABLE notifications (
  notification_id BIGINT       NOT NULL AUTO_INCREMENT  COMMENT 'Mã thông báo — khóa chính tự tăng',
  title           VARCHAR(255) NOT NULL                 COMMENT 'Tiêu đề ngắn gọn của thông báo',
  content         TEXT         NOT NULL                 COMMENT 'Nội dung đầy đủ của thông báo',
  send_type       ENUM('All','ByBranch','ByGroup') NOT NULL COMMENT 'Đối tượng nhận: All=toàn bộ hội viên, ByBranch=theo chi nhánh, ByGroup=theo nhóm',
  branch_id       INT          NULL                     COMMENT 'Chi nhánh nhận thông báo — FK tới branches.branch_id. Bắt buộc khi send_type = ByBranch, NULL trong trường hợp khác',
  group_id        INT          NULL                     COMMENT 'Nhóm nhận thông báo — FK tới member_groups.group_id. Bắt buộc khi send_type = ByGroup, NULL trong trường hợp khác',
  created_by      BIGINT       NOT NULL                 COMMENT 'Quản lý tạo thông báo — FK tới employees.employee_id',
  scheduled_at    DATETIME     NOT NULL                 COMMENT 'Thời điểm hẹn gửi thông báo',
  is_sent         TINYINT(1)   NOT NULL DEFAULT 0       COMMENT '0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo thông báo',
  PRIMARY KEY (notification_id),
  CONSTRAINT fk_tb_cn
    FOREIGN KEY (branch_id)  REFERENCES branches      (branch_id),
  CONSTRAINT fk_tb_nhom
    FOREIGN KEY (group_id)   REFERENCES member_groups (group_id),
  CONSTRAINT fk_tb_nguoi_tao
    FOREIGN KEY (created_by) REFERENCES employees     (employee_id)
) ENGINE=InnoDB COMMENT='Thông báo đẩy gửi đến hội viên theo đối tượng';


-- ============================================================
--  BẢNG 21: notification_recipients  (Danh sách nhận thông báo)
-- ============================================================
CREATE TABLE notification_recipients (
  id              BIGINT     NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  notification_id BIGINT     NOT NULL                 COMMENT 'Thông báo được gửi — FK tới notifications.notification_id',
  member_id       BIGINT     NOT NULL                 COMMENT 'Hội viên nhận thông báo — FK tới members.member_id',
  is_read         TINYINT(1) NOT NULL DEFAULT 0       COMMENT '0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tb_hv (notification_id, member_id),
  CONSTRAINT fk_nr_tb
    FOREIGN KEY (notification_id) REFERENCES notifications (notification_id),
  CONSTRAINT fk_nr_hv
    FOREIGN KEY (member_id)       REFERENCES members       (member_id)
) ENGINE=InnoDB COMMENT='Danh sách hội viên nhận từng thông báo và trạng thái đã đọc';


-- ============================================================
--  BẢNG 22: account_lock_log  (Lịch sử khóa/mở tài khoản)
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
--  BẢNG 23: phone_change_log  (Lịch sử đổi số điện thoại)
-- ============================================================
CREATE TABLE phone_change_log (
  log_id     BIGINT      NOT NULL AUTO_INCREMENT  COMMENT 'Mã bản ghi — khóa chính tự tăng',
  member_id  BIGINT      NOT NULL                 COMMENT 'Hội viên được đổi số điện thoại — FK tới members.member_id',
  old_phone  VARCHAR(15) NOT NULL                 COMMENT 'Số điện thoại cũ trước khi thay đổi',
  new_phone  VARCHAR(15) NOT NULL                 COMMENT 'Số điện thoại mới sau khi thay đổi',
  changed_by BIGINT      NOT NULL                 COMMENT 'Quản lý thực hiện đổi số — FK tới employees.employee_id',
  changed_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thực hiện đổi số điện thoại',
  PRIMARY KEY (log_id),
  CONSTRAINT fk_dl_hv
    FOREIGN KEY (member_id)  REFERENCES members   (member_id),
  CONSTRAINT fk_dl_ql
    FOREIGN KEY (changed_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử thay đổi số điện thoại hội viên — chỉ Manager thực hiện được';


-- ============================================================
--  BẢNG 24: otp  (Mã xác thực một lần)
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
--  BẢNG 25: gym_density  (Mật độ người tập)
--
--  Snapshot số người đang có mặt được ghi bởi job ngoài
--  (cảm biến, camera đếm người, hoặc logic nghiệp vụ riêng)
--  vì check_ins không có check_out_time đáng tin cậy.
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
--  BẢNG 26: branch_images  (Hình ảnh chi nhánh)
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
--  BẢNG 27: refresh_tokens  (Token xác thực)
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