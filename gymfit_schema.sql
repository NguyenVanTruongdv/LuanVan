SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ---------------------------------------------------------------------
-- 1. roles
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` tinyint NOT NULL AUTO_INCREMENT COMMENT 'Mã vai trò',
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên vai trò: Staff, Manager, Admin',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vai trò của nhân viên';

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'Staff'),
(2, 'Manager'),
(3, 'Admin');

-- ---------------------------------------------------------------------
-- 2. branches
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `branch_id` int NOT NULL AUTO_INCREMENT,
  `branch_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi nhánh phòng gym';

INSERT INTO `branches` (`branch_id`, `branch_name`, `address`, `phone`, `status`, `created_at`) VALUES
(1, 'GymFit Quận 1', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '02838221234', 'Active', '2026-07-01 08:00:00'),
(2, 'GymFit Quận 7', '456 Nguyễn Thị Thập, Quận 7, TP.HCM', '02837776655', 'Active', '2026-07-01 08:00:00'),
(3, 'GymFit Bình Thạnh', '135 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM', '02835554433', 'Active', '2026-07-01 08:00:00');

-- ---------------------------------------------------------------------
-- 3. employees (KHÔNG còn phone/email/password_hash; ĐÃ thêm lại status)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `employee_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái làm việc của nhân viên: Active = đang làm việc, Inactive = đã nghỉ việc/ngưng hoạt động',
  `role_id` tinyint NOT NULL COMMENT 'FK tới roles.role_id',
  `created_by` bigint DEFAULT NULL COMMENT 'Nhân viên tạo tài khoản này — tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `fk_employee_role` (`role_id`),
  KEY `fk_employee_creator` (`created_by`),
  CONSTRAINT `fk_employee_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  CONSTRAINT `fk_employee_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ nhân viên — thông tin đăng nhập nằm ở bảng accounts';

INSERT INTO `employees` (`employee_id`, `full_name`, `gender`, `status`, `role_id`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Nguyễn Văn Admin', 'Male', 'Active', 3, NULL, '2026-07-01 08:00:00', '2026-07-01 08:00:00'),
(2, 'Trần Thị Quản Lý', 'Female', 'Active', 2, 1, '2026-07-01 08:10:00', '2026-07-01 08:10:00'),
(3, 'Lê Văn Nhân Viên', 'Male', 'Active', 1, 2, '2026-07-01 08:20:00', '2026-07-01 08:20:00');

-- ---------------------------------------------------------------------
-- 4. members (KHÔNG còn phone/password_hash; status bỏ Expired & Suspended)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `member_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PendingActivation','Active') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingActivation' COMMENT 'PendingActivation=chờ kích hoạt, Active=đang hoạt động. Việc khóa đăng nhập nay do accounts.status quản lý, không còn Expired/Suspended ở đây.',
  `internal_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú nội bộ, hội viên không thấy',
  `created_by` bigint DEFAULT NULL COMMENT 'Nhân viên tạo hồ sơ hội viên — FK tới employees.employee_id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  KEY `fk_member_creator` (`created_by`),
  CONSTRAINT `fk_member_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ hội viên — thông tin đăng nhập nằm ở bảng accounts';

INSERT INTO `members` (`member_id`, `full_name`, `gender`, `status`, `internal_notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Nguyễn Văn Trường', 'Male', 'Active', NULL, 1, '2026-07-05 09:00:00', '2026-07-05 09:00:00'),
(2, 'Trần Thị Hương', 'Female', 'Active', NULL, 1, '2026-07-06 10:00:00', '2026-07-06 10:00:00'),
(3, 'Phạm Văn Long', 'Male', 'PendingActivation', NULL, 2, '2026-07-10 11:00:00', '2026-07-10 11:00:00');

-- ---------------------------------------------------------------------
-- 5. accounts — tài khoản đăng nhập dùng chung cho member và employee.
--    Mỗi account chỉ gắn với đúng 1 trong 2.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `accounts`;
CREATE TABLE `accounts` (
  `account_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã tài khoản — khóa chính tự tăng',
  `member_id` bigint DEFAULT NULL COMMENT 'Hội viên sở hữu tài khoản — FK tới members.member_id. NULL nếu đây là tài khoản nhân viên',
  `employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên sở hữu tài khoản — FK tới employees.employee_id. NULL nếu đây là tài khoản hội viên',
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Số điện thoại — dùng làm tên đăng nhập, duy nhất toàn hệ thống',
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email, dùng khôi phục mật khẩu/nhận thông báo, có thể NULL nhưng phải duy nhất nếu có',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mật khẩu đã mã hóa bcrypt, không lưu bản rõ',
  `status` enum('Active','Suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái đăng nhập: Active = được phép đăng nhập, Suspended = bị khóa',
  `suspend_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Lý do khóa — bắt buộc điền khi status = Suspended',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_account_phone` (`phone`),
  UNIQUE KEY `uq_account_email` (`email`),
  UNIQUE KEY `uq_account_member` (`member_id`) COMMENT 'Mỗi hội viên chỉ có 1 tài khoản',
  UNIQUE KEY `uq_account_employee` (`employee_id`) COMMENT 'Mỗi nhân viên chỉ có 1 tài khoản',
  CONSTRAINT `fk_account_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_account_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `chk_account_owner` CHECK (
    (`member_id` IS NOT NULL AND `employee_id` IS NULL) OR
    (`member_id` IS NULL AND `employee_id` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản đăng nhập dùng chung cho hội viên và nhân viên';

INSERT INTO `accounts` (`account_id`, `member_id`, `employee_id`, `phone`, `email`, `password_hash`, `status`, `suspend_reason`, `created_at`, `updated_at`) VALUES
(1, NULL, 1, '0900000001', 'admin@gymfit.vn', '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-01 08:00:00', '2026-07-01 08:00:00'),
(2, NULL, 2, '0900000002', 'manager.q1@gymfit.vn', '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-01 08:10:00', '2026-07-01 08:10:00'),
(3, NULL, 3, '0900000003', 'staff.q1@gymfit.vn', '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-01 08:20:00', '2026-07-01 08:20:00'),
(4, 1, NULL, '0911000001', NULL, '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-05 09:00:00', '2026-07-05 09:00:00'),
(5, 2, NULL, '0911000002', NULL, '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-06 10:00:00', '2026-07-06 10:00:00'),
(6, 3, NULL, '0911000003', NULL, '$2a$11$oQ1Zt6Kx8mR3vLp9YhTq5eB0aC7dF2gH4iJ6kL8mN1oP3qR5sT7uV', 'Active', NULL, '2026-07-10 11:00:00', '2026-07-10 11:00:00');

-- ---------------------------------------------------------------------
-- 6. employee_branches
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `employee_branches`;
CREATE TABLE `employee_branches` (
  `employee_id` bigint NOT NULL,
  `branch_id` int NOT NULL,
  `branch_role` enum('Manager','Staff') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`employee_id`,`branch_id`),
  KEY `fk_employee_branches_branch` (`branch_id`),
  CONSTRAINT `fk_employee_branches_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_branches_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `employee_branches` (`employee_id`, `branch_id`, `branch_role`) VALUES
(2, 1, 'Manager'),
(3, 1, 'Staff');

-- ---------------------------------------------------------------------
-- 7. equipment_categories
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_categories`;
CREATE TABLE `equipment_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_ten_danh_muc` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục phân loại thiết bị';

INSERT INTO `equipment_categories` (`category_id`, `category_name`, `description`) VALUES
(1, 'Cardio', 'Thiết bị hỗ trợ luyện tập tim mạch và đốt mỡ.'),
(2, 'Chest Machines', 'Máy tập phát triển cơ ngực.'),
(3, 'Back Machines', 'Máy tập phát triển cơ lưng và xô.'),
(4, 'Leg Machines', 'Máy tập cơ chân và mông.'),
(5, 'Free Weights', 'Khu vực tạ tự do gồm tạ đơn, tạ đòn.');

-- ---------------------------------------------------------------------
-- 8. equipment
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `equipment`;
CREATE TABLE `equipment` (
  `equipment_id` int NOT NULL AUTO_INCREMENT,
  `equipment_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `status` enum('Active','Deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `description` text COLLATE utf8mb4_unicode_ci,
  `added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`equipment_id`),
  KEY `fk_thietbi_danhmuc` (`category_id`),
  KEY `fk_thietbi_chinhanh` (`branch_id`),
  CONSTRAINT `fk_thietbi_danhmuc` FOREIGN KEY (`category_id`) REFERENCES `equipment_categories` (`category_id`),
  CONSTRAINT `fk_thietbi_chinhanh` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thiết bị tập luyện lắp đặt tại các chi nhánh';

INSERT INTO `equipment` (`equipment_id`, `equipment_name`, `category_id`, `branch_id`, `status`, `description`, `added_at`) VALUES
(1, 'Máy chạy bộ (Treadmill)', 1, 1, 'Active', 'Thiết bị cardio hỗ trợ chạy bộ và đi bộ.', '2026-07-01 09:00:00'),
(2, 'Xe đạp tập (Exercise Bike)', 1, 1, 'Active', 'Thiết bị cardio mô phỏng đạp xe.', '2026-07-01 09:05:00'),
(3, 'Máy đẩy ngực (Chest Press)', 2, 1, 'Active', 'Tập nhóm cơ ngực, vai trước, tay sau.', '2026-07-01 09:10:00'),
(4, 'Máy đạp chân (Leg Press)', 4, 1, 'Active', 'Tập cơ đùi và mông.', '2026-07-01 09:15:00'),
(5, 'Tạ đơn (Dumbbell Rack)', 5, 2, 'Active', 'Bộ tạ tự do nhiều mức trọng lượng.', '2026-07-01 09:20:00');

-- ---------------------------------------------------------------------
-- 9. equipment_images
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `equipment_images`;
CREATE TABLE `equipment_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_anh_tb` (`equipment_id`),
  CONSTRAINT `fk_anh_tb` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Album ảnh của từng thiết bị';

INSERT INTO `equipment_images` (`image_id`, `equipment_id`, `image_url`, `sort_order`, `uploaded_at`) VALUES
(1, 1, 'https://gym-face-recognition.s3.amazonaws.com/equipments/01_treadmill.png', 0, '2026-07-01 09:00:00'),
(2, 3, 'https://gym-face-recognition.s3.amazonaws.com/equipments/05_chest_press.png', 0, '2026-07-01 09:10:00');

-- ---------------------------------------------------------------------
-- 10. branch_images
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `branch_images`;
CREATE TABLE `branch_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_anh_cn` (`branch_id`),
  CONSTRAINT `fk_anh_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Album ảnh các khu vực của từng chi nhánh';

INSERT INTO `branch_images` (`image_id`, `branch_id`, `image_url`, `image_type`, `sort_order`, `uploaded_at`) VALUES
(1, 1, 'https://gym-face-recognition.s3.amazonaws.com/branches/1/reception.jpg', 'Lễ tân', 1, '2026-07-01 10:00:00'),
(2, 1, 'https://gym-face-recognition.s3.amazonaws.com/branches/1/floor.jpg', 'Phòng tập', 2, '2026-07-01 10:05:00');

-- ---------------------------------------------------------------------
-- 11. membership_plans (đã bỏ cột plan_type)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `membership_plans`;
CREATE TABLE `membership_plans` (
  `plan_id` int NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,0) NOT NULL,
  `duration_days` smallint NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('OnSale','Discontinued') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OnSale',
  `is_popular` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh sách gói tập — không còn phân loại Customer/Internal';

INSERT INTO `membership_plans` (`plan_id`, `plan_name`, `price`, `duration_days`, `description`, `status`, `is_popular`, `created_at`) VALUES
(1, 'Gói 1 Tháng', 300000, 30, 'Phù hợp cho người mới bắt đầu, không giới hạn số lần tập.', 'OnSale', 0, '2026-07-01 08:00:00'),
(2, 'Gói 3 Tháng', 800000, 90, 'Tiết kiệm hơn khi đăng ký dài hạn, tặng 1 buổi hướng dẫn cùng PT.', 'OnSale', 1, '2026-07-01 08:00:00'),
(3, 'Gói 6 Tháng', 1500000, 180, 'Bao gồm 3 buổi PT và đo chỉ số cơ thể định kỳ.', 'OnSale', 0, '2026-07-01 08:00:00'),
(4, 'Gói 12 Tháng', 2800000, 365, 'Gói đầy đủ quyền lợi, 10 buổi PT, ưu đãi dịch vụ đi kèm.', 'OnSale', 0, '2026-07-01 08:00:00');

-- ---------------------------------------------------------------------
-- 12. promotions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `promotion_id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `ten_khuyen_mai` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `promo_type` enum('GiamPhanTram','GiamTienMat','TangNgay','TangChuKy') COLLATE utf8mb4_unicode_ci NOT NULL,
  `phan_tram_giam` decimal(5,2) DEFAULT NULL,
  `muc_giam_toi_da` decimal(12,0) DEFAULT NULL,
  `so_tien_giam` decimal(12,0) DEFAULT NULL,
  `so_ngay_tang` smallint DEFAULT NULL,
  `so_chu_ky_tang` tinyint DEFAULT NULL,
  `ngay_bat_dau` datetime NOT NULL,
  `ngay_ket_thuc` datetime NOT NULL,
  `gioi_han_luot` int DEFAULT NULL,
  `so_luot_da_dung` int NOT NULL DEFAULT '0',
  `trang_thai` enum('NhapLieu','HoatDong','TamDung','HetHan') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NhapLieu',
  `nguoi_tao` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  KEY `idx_km_trangthai_thoigian` (`trang_thai`,`ngay_bat_dau`,`ngay_ket_thuc`),
  KEY `fk_km_nguoi_tao` (`nguoi_tao`),
  KEY `fk_promotions_plan` (`plan_id`),
  CONSTRAINT `fk_km_nguoi_tao` FOREIGN KEY (`nguoi_tao`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_promotions_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chương trình khuyến mãi';

INSERT INTO `promotions` (`promotion_id`, `plan_id`, `ten_khuyen_mai`, `mo_ta`, `promo_type`, `phan_tram_giam`, `muc_giam_toi_da`, `so_tien_giam`, `so_ngay_tang`, `so_chu_ky_tang`, `ngay_bat_dau`, `ngay_ket_thuc`, `gioi_han_luot`, `so_luot_da_dung`, `trang_thai`, `nguoi_tao`, `created_at`, `updated_at`) VALUES
(1, 1, 'Ưu đãi khai trương - Tặng 5 ngày', 'Đăng ký Gói 1 Tháng được tặng thêm 5 ngày.', 'TangNgay', NULL, NULL, NULL, 5, NULL, '2026-07-01 00:00:00', '2026-12-31 23:59:59', NULL, 1, 'HoatDong', 1, '2026-07-01 08:00:00', '2026-07-05 09:05:00'),
(2, 2, 'Giảm 10% Gói 3 Tháng', 'Đăng ký Gói 3 Tháng được giảm 10%, tối đa 100.000đ.', 'GiamPhanTram', 10.00, 100000, NULL, NULL, NULL, '2026-07-01 00:00:00', '2026-12-31 23:59:59', NULL, 1, 'HoatDong', 1, '2026-07-01 08:00:00', '2026-07-06 10:05:00');

-- ---------------------------------------------------------------------
-- 13. transactions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `order_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_reference_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_id` bigint NOT NULL,
  `plan_id` int NOT NULL,
  `promotion_id` int DEFAULT NULL,
  `branch_id` int NOT NULL,
  `payment_method` enum('Cash','BankTransfer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` enum('Pending','Paid','Cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `gia_goc` decimal(12,0) NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `receipt_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `order_code` (`order_code`),
  UNIQUE KEY `UX_Transactions_BankReferenceCode` (`bank_reference_code`),
  KEY `fk_gd_hv` (`member_id`),
  KEY `fk_gd_goi` (`plan_id`),
  KEY `fk_transaction_promotion` (`promotion_id`),
  KEY `fk_transactions_branch` (`branch_id`),
  KEY `fk_transactions_employee` (`employee_id`),
  CONSTRAINT `fk_gd_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_gd_goi` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  CONSTRAINT `fk_transaction_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  CONSTRAINT `fk_transactions_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_transactions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giao dịch thanh toán mua hoặc gia hạn gói tập';

INSERT INTO `transactions` (`transaction_id`, `order_code`, `bank_reference_code`, `member_id`, `plan_id`, `promotion_id`, `branch_id`, `payment_method`, `payment_status`, `gia_goc`, `amount`, `receipt_image`, `employee_id`, `created_at`, `updated_at`) VALUES
(1, 'HD20260705090001', NULL, 1, 1, 1, 1, 'Cash', 'Paid', 300000, 300000, NULL, 3, '2026-07-05 09:05:00', '2026-07-05 09:05:00'),
(2, 'HD20260706100001', NULL, 2, 2, 2, 1, 'BankTransfer', 'Paid', 800000, 720000, NULL, 3, '2026-07-06 10:05:00', '2026-07-06 10:05:00');

-- ---------------------------------------------------------------------
-- 14. member_packages
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `member_packages`;
CREATE TABLE `member_packages` (
  `member_package_id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `member_id` bigint NOT NULL,
  `transaction_id` bigint NOT NULL,
  `plan_id` int NOT NULL,
  `promotion_id` int DEFAULT NULL,
  `gia_goc` decimal(12,0) NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `so_ngay_tang_thuc_te` smallint NOT NULL DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `package_status` enum('PendingActivation','Active','Expired','Cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingActivation',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_package_id`),
  KEY `fk_mp_member` (`member_id`),
  KEY `fk_mp_transaction` (`transaction_id`),
  KEY `fk_mp_plan` (`plan_id`),
  KEY `fk_mp_promotion` (`promotion_id`),
  KEY `fk_member_packages_branch` (`branch_id`),
  CONSTRAINT `fk_mp_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_mp_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`),
  CONSTRAINT `fk_mp_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  CONSTRAINT `fk_mp_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  CONSTRAINT `fk_member_packages_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gói tập đã mua của từng hội viên. LƯU Ý: package_status (trạng thái của gói tập cụ thể) vẫn giữ Expired — đây khác với members.status (trạng thái tài khoản hội viên nói chung), cái đã bỏ Expired theo yêu cầu.';

INSERT INTO `member_packages` (`member_package_id`, `branch_id`, `member_id`, `transaction_id`, `plan_id`, `promotion_id`, `gia_goc`, `amount`, `so_ngay_tang_thuc_te`, `start_date`, `expiry_date`, `package_status`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 1, 300000, 300000, 5, '2026-07-05', '2026-08-09', 'Active', '2026-07-05 09:05:00', '2026-07-05 09:05:00'),
(2, 1, 2, 2, 2, 2, 800000, 720000, 0, '2026-07-06', '2026-10-04', 'Active', '2026-07-06 10:05:00', '2026-07-06 10:05:00');

-- ---------------------------------------------------------------------
-- 15. promotion_usages
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `promotion_usages`;
CREATE TABLE `promotion_usages` (
  `usage_id` bigint NOT NULL AUTO_INCREMENT,
  `promotion_id` int NOT NULL,
  `member_package_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `plan_id` int NOT NULL,
  `so_tien_da_giam` decimal(12,0) NOT NULL DEFAULT '0',
  `so_ngay_duoc_tang` smallint NOT NULL DEFAULT '0',
  `ap_dung_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usage_id`),
  UNIQUE KEY `uq_su_dung_package` (`member_package_id`),
  KEY `fk_su_dung_km` (`promotion_id`),
  KEY `fk_su_dung_hv` (`member_id`),
  KEY `fk_su_dung_goi` (`plan_id`),
  CONSTRAINT `fk_su_dung_km` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  CONSTRAINT `fk_su_dung_package` FOREIGN KEY (`member_package_id`) REFERENCES `member_packages` (`member_package_id`),
  CONSTRAINT `fk_su_dung_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_su_dung_goi` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử áp dụng khuyến mãi';

INSERT INTO `promotion_usages` (`usage_id`, `promotion_id`, `member_package_id`, `member_id`, `plan_id`, `so_tien_da_giam`, `so_ngay_duoc_tang`, `ap_dung_luc`) VALUES
(1, 1, 1, 1, 1, 0, 5, '2026-07-05 09:05:00'),
(2, 2, 2, 2, 2, 80000, 0, '2026-07-06 10:05:00');

-- ---------------------------------------------------------------------
-- 16. face_data — hồ sơ khuôn mặt hiện tại của hội viên
--     do nhân viên (created_by) trực tiếp tạo/đăng ký
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `face_data`;
CREATE TABLE `face_data` (
  `face_data_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `face_id_aws` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint NOT NULL COMMENT 'Nhân viên đã đăng ký/tạo faceId này — FK tới employees.employee_id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`face_data_id`),
  UNIQUE KEY `uq_face_member` (`member_id`),
  UNIQUE KEY `uq_face_id_aws` (`face_id_aws`),
  KEY `fk_face_creator` (`created_by`),
  CONSTRAINT `fk_face_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_face_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dữ liệu nhận diện khuôn mặt hội viên (AWS Rekognition) — chỉ nhân viên mới được tạo faceId';

INSERT INTO `face_data` (`face_data_id`, `member_id`, `face_id_aws`, `profile_image`, `created_by`, `created_at`) VALUES
(1, 1, 'faceid-0000-0000-0000-000000000001', 'https://gym-face-recognition.s3.amazonaws.com/members/faces/member1.jpg', 3, '2026-07-05 09:10:00');

-- ---------------------------------------------------------------------
-- 17. face_update_history — ghi lại mọi lần tạo/cập nhật faceId,
--     luôn gắn với nhân viên (performed_by) thực hiện thao tác
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `face_update_history`;
CREATE TABLE `face_update_history` (
  `history_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `old_face_id_aws` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_face_id_aws` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `performed_by` bigint NOT NULL COMMENT 'Nhân viên thực hiện tạo/cập nhật faceId — FK tới employees.employee_id',
  `performed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `old_profile_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_profile_image` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`history_id`),
  KEY `fk_facehistory_member` (`member_id`),
  KEY `fk_facehistory_staff` (`performed_by`),
  CONSTRAINT `fk_facehistory_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_facehistory_staff` FOREIGN KEY (`performed_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử mỗi lần tạo/cập nhật khuôn mặt hội viên — chỉ ghi thêm, không sửa/xóa';

INSERT INTO `face_update_history` (`history_id`, `member_id`, `old_face_id_aws`, `new_face_id_aws`, `reason`, `performed_by`, `performed_at`, `old_profile_image`, `new_profile_image`) VALUES
(1, 1, NULL, 'faceid-0000-0000-0000-000000000001', 'Đăng ký khuôn mặt lần đầu', 3, '2026-07-05 09:10:00', NULL, 'https://gym-face-recognition.s3.amazonaws.com/members/faces/member1.jpg');

-- ---------------------------------------------------------------------
-- 18. check_ins
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `check_ins`;
CREATE TABLE `check_ins` (
  `check_in_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `member_package_id` bigint NOT NULL,
  `branch_id` int NOT NULL,
  `check_in_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `method` enum('Auto','Manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint DEFAULT NULL,
  `manual_reason` text COLLATE utf8mb4_unicode_ci,
  `check_out_time` datetime DEFAULT NULL,
  `check_out_method` enum('Auto','Manual') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_out_staff_id` bigint DEFAULT NULL,
  `check_out_manual_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`check_in_id`),
  KEY `fk_checkin_hv` (`member_id`),
  KEY `fk_checkin_package` (`member_package_id`),
  KEY `fk_checkin_cn` (`branch_id`),
  KEY `fk_checkin_nv` (`staff_id`),
  KEY `fk_checkout_nv` (`check_out_staff_id`),
  CONSTRAINT `fk_checkin_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_checkin_package` FOREIGN KEY (`member_package_id`) REFERENCES `member_packages` (`member_package_id`),
  CONSTRAINT `fk_checkin_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_checkin_nv` FOREIGN KEY (`staff_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_checkout_nv` FOREIGN KEY (`check_out_staff_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử check-in / check-out';

INSERT INTO `check_ins` (`check_in_id`, `member_id`, `member_package_id`, `branch_id`, `check_in_time`, `method`, `staff_id`, `manual_reason`, `check_out_time`, `check_out_method`, `check_out_staff_id`, `check_out_manual_reason`) VALUES
(1, 1, 1, 1, '2026-07-15 07:00:00', 'Auto', NULL, NULL, '2026-07-15 08:00:00', 'Auto', NULL, NULL);

-- ---------------------------------------------------------------------
-- 19. gym_density
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gym_density`;
CREATE TABLE `gym_density` (
  `density_id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `recorded_at` datetime NOT NULL,
  `headcount` smallint NOT NULL,
  PRIMARY KEY (`density_id`),
  KEY `idx_mat_do_cn_tg` (`branch_id`,`recorded_at`),
  CONSTRAINT `fk_md_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Snapshot mật độ người tập theo thời gian';

INSERT INTO `gym_density` (`density_id`, `branch_id`, `recorded_at`, `headcount`) VALUES
(1, 1, '2026-07-15 07:00:00', 1),
(2, 1, '2026-07-15 08:00:00', 0);

-- ---------------------------------------------------------------------
-- 20. home_images
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `home_images`;
CREATE TABLE `home_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `uploaded_by` bigint NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `fk_home_img_nv` (`uploaded_by`),
  CONSTRAINT `fk_home_img_nv` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh hiển thị trên trang chủ (banner/slideshow)';

INSERT INTO `home_images` (`image_id`, `image_url`, `title`, `link_url`, `sort_order`, `status`, `uploaded_by`, `uploaded_at`) VALUES
(1, 'https://gym-face-recognition.s3.amazonaws.com/home-images/free-weights.jpg', 'Khu tạ tự do', NULL, 1, 'Active', 1, '2026-07-01 10:00:00'),
(2, 'https://gym-face-recognition.s3.amazonaws.com/home-images/cardio.jpg', 'Máy cardio hiện đại', NULL, 2, 'Active', 1, '2026-07-01 10:05:00');

-- ---------------------------------------------------------------------
-- 21. incidents
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `incidents`;
CREATE TABLE `incidents` (
  `incident_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` int NOT NULL,
  `equipment_id` int DEFAULT NULL,
  `reported_by_member_id` bigint DEFAULT NULL,
  `reported_by_employee_id` bigint DEFAULT NULL,
  `status` enum('PendingApproval','Approved','Completed','Cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingApproval',
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incident_id`),
  KEY `fk_su_co_cn` (`branch_id`),
  KEY `fk_su_co_tb` (`equipment_id`),
  KEY `fk_su_co_hv` (`reported_by_member_id`),
  KEY `fk_su_co_nv` (`reported_by_employee_id`),
  KEY `fk_su_co_approved` (`approved_by`),
  CONSTRAINT `fk_su_co_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  CONSTRAINT `fk_su_co_tb` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`),
  CONSTRAINT `fk_su_co_hv` FOREIGN KEY (`reported_by_member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_su_co_nv` FOREIGN KEY (`reported_by_employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_su_co_approved` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Báo cáo sự cố';

INSERT INTO `incidents` (`incident_id`, `title`, `description`, `branch_id`, `equipment_id`, `reported_by_member_id`, `reported_by_employee_id`, `status`, `reject_reason`, `approved_by`, `created_at`, `updated_at`) VALUES
(1, 'Máy lạnh khu vực Cardio bị hỏng', 'Máy lạnh khu vực Cardio không mát, cần kiểm tra bảo trì.', 1, 1, NULL, 3, 'PendingApproval', NULL, NULL, '2026-07-12 09:00:00', '2026-07-12 09:00:00');

-- ---------------------------------------------------------------------
-- 22. incident_medias
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `incident_medias`;
CREATE TABLE `incident_medias` (
  `media_id` int NOT NULL AUTO_INCREMENT,
  `incident_id` int NOT NULL,
  `media_type` enum('Image','Video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`media_id`),
  KEY `fk_incident_media_incident` (`incident_id`),
  CONSTRAINT `fk_incident_media_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`incident_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `incident_medias` (`media_id`, `incident_id`, `media_type`, `media_url`, `created_at`) VALUES
(1, 1, 'Image', 'https://gym-face-recognition.s3.amazonaws.com/incidents/images/incident1.png', '2026-07-12 09:00:00');

-- ---------------------------------------------------------------------
-- 23. member_update_logs
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `member_update_logs`;
CREATE TABLE `member_update_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `update_session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_id` bigint NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by_employee_id` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mul_session` (`update_session_id`),
  KEY `idx_mul_member` (`member_id`,`field_name`),
  KEY `fk_mul_employee` (`updated_by_employee_id`),
  CONSTRAINT `fk_mul_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_mul_employee` FOREIGN KEY (`updated_by_employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử cập nhật thông tin hội viên — chỉ ghi thêm';

INSERT INTO `member_update_logs` (`id`, `update_session_id`, `member_id`, `field_name`, `old_value`, `new_value`, `updated_by_employee_id`, `updated_at`) VALUES
(1, '11111111-1111-1111-1111-111111111111', 1, 'CREATE_MEMBER', NULL, 'Tạo hội viên \'Nguyễn Văn Trường\' - Hóa đơn HD20260705090001', 3, '2026-07-05 09:00:00'),
(2, '22222222-2222-2222-2222-222222222222', 2, 'CREATE_MEMBER', NULL, 'Tạo hội viên \'Trần Thị Hương\' - Hóa đơn HD20260706100001', 3, '2026-07-06 10:00:00');

-- ---------------------------------------------------------------------
-- 24. news
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `news`;
CREATE TABLE `news` (
  `news_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Hidden') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_by` bigint NOT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`news_id`),
  KEY `idx_news_status` (`status`),
  KEY `fk_news_nv` (`created_by`),
  KEY `FK_news_branch` (`branch_id`),
  CONSTRAINT `fk_news_nv` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `FK_news_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tin tức hiển thị cho hội viên';

INSERT INTO `news` (`news_id`, `title`, `summary`, `content`, `status`, `created_by`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 'Khai trương chi nhánh Quận 1', 'GymFit chính thức đi vào hoạt động.', 'Chi nhánh GymFit Quận 1 chính thức khai trương và đón hội viên từ ngày 01/07/2026.', 'Active', 1, 1, '2026-07-01 08:00:00', '2026-07-01 08:00:00');

-- ---------------------------------------------------------------------
-- 25. forum_categories
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_categories`;
CREATE TABLE `forum_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `forum_categories` (`category_id`, `category_name`, `slug`, `icon`, `display_order`, `status`, `created_at`) VALUES
(1, 'Tập luyện', 'tap-luyen', 'fitness', 1, 'Active', '2026-07-01 08:00:00'),
(2, 'Dinh dưỡng', 'dinh-duong', 'restaurant', 2, 'Active', '2026-07-01 08:00:00'),
(3, 'Giảm cân', 'giam-can', 'monitor_weight', 3, 'Active', '2026-07-01 08:00:00'),
(4, 'Tăng cơ', 'tang-co', 'sports_gymnastics', 4, 'Active', '2026-07-01 08:00:00'),
(5, 'Chia sẻ kinh nghiệm', 'chia-se', 'forum', 5, 'Active', '2026-07-01 08:00:00'),
(6, 'Hỏi đáp', 'hoi-dap', 'help', 6, 'Active', '2026-07-01 08:00:00'),
(7, 'Thông báo', 'thong-bao', 'campaign', 7, 'Active', '2026-07-01 08:00:00');

-- ---------------------------------------------------------------------
-- 26. forum_posts
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_posts`;
CREATE TABLE `forum_posts` (
  `post_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `post_type` enum('Original','Repost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Original',
  `original_post_id` bigint DEFAULT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `comment_count` int NOT NULL DEFAULT '0',
  `repost_count` int NOT NULL DEFAULT '0',
  `status` enum('Active','Hidden','Deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`),
  KEY `idx_post_member` (`member_id`,`status`,`created_at`),
  KEY `idx_post_original` (`original_post_id`),
  KEY `idx_forum_posts_category` (`category_id`),
  CONSTRAINT `fk_post_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  CONSTRAINT `fk_forum_posts_category` FOREIGN KEY (`category_id`) REFERENCES `forum_categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_forum_posts_original` FOREIGN KEY (`original_post_id`) REFERENCES `forum_posts` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bài đăng cộng đồng';

INSERT INTO `forum_posts` (`post_id`, `member_id`, `title`, `category_id`, `content`, `post_type`, `original_post_id`, `like_count`, `comment_count`, `repost_count`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Lịch tập cho người mới', 1, 'Mọi người cho mình xin lịch tập gym 3 buổi/tuần dành cho người mới với.', 'Original', NULL, 1, 1, 0, 'Active', '2026-07-08 10:00:00', '2026-07-08 12:00:00'),
(2, 2, 'Ăn gì để tăng cơ?', 2, 'Mình nặng 60kg, nên ăn bao nhiêu protein mỗi ngày để tăng cơ?', 'Original', NULL, 0, 0, 0, 'Active', '2026-07-09 11:00:00', '2026-07-09 11:00:00');

-- ---------------------------------------------------------------------
-- 27. forum_comments
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_comments`;
CREATE TABLE `forum_comments` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `parent_comment_id` bigint DEFAULT NULL,
  `reply_to_member_id` bigint DEFAULT NULL,
  `content` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `status` enum('Active','Hidden','Deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `IX_forum_comments_post_id` (`post_id`),
  KEY `IX_forum_comments_parent_comment_id` (`parent_comment_id`),
  KEY `IX_forum_comments_member_id` (`member_id`),
  KEY `IX_forum_comments_reply_to_member_id` (`reply_to_member_id`),
  CONSTRAINT `FK_forum_comments_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_forum_comments_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_forum_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_forum_comments_reply_to` FOREIGN KEY (`reply_to_member_id`) REFERENCES `members` (`member_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bình luận bài viết cộng đồng, hỗ trợ trả lời 2 cấp';

INSERT INTO `forum_comments` (`comment_id`, `post_id`, `member_id`, `parent_comment_id`, `reply_to_member_id`, `content`, `like_count`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 2, NULL, NULL, 'Bạn nên tập 3 buổi/tuần theo lịch full-body cho người mới nhé.', 0, 'Active', '2026-07-08 12:00:00', '2026-07-08 12:00:00');

-- ---------------------------------------------------------------------
-- 28. forum_comment_likes
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_comment_likes`;
CREATE TABLE `forum_comment_likes` (
  `like_id` bigint NOT NULL AUTO_INCREMENT,
  `comment_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `UQ_forum_comment_likes` (`comment_id`,`member_id`),
  KEY `IX_forum_comment_likes_member_id` (`member_id`),
  CONSTRAINT `FK_comment_likes_comment` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_comment_likes_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lượt tym bình luận';

-- ---------------------------------------------------------------------
-- 29. forum_likes
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_likes`;
CREATE TABLE `forum_likes` (
  `like_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uq_like_post_member` (`post_id`,`member_id`),
  KEY `idx_like_member` (`member_id`),
  CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_like_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lượt tym bài đăng forum';

INSERT INTO `forum_likes` (`like_id`, `post_id`, `member_id`, `created_at`) VALUES
(1, 1, 3, '2026-07-08 13:00:00');

-- ---------------------------------------------------------------------
-- 30. forum_notifications
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_notifications`;
CREATE TABLE `forum_notifications` (
  `notification_id` bigint NOT NULL AUTO_INCREMENT,
  `recipient_member_id` bigint NOT NULL,
  `actor_member_id` bigint NOT NULL,
  `notify_type` enum('Like','Comment','Reply') COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` bigint NOT NULL,
  `comment_id` bigint DEFAULT NULL,
  `like_id` bigint DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `IX_forum_notifications_recipient` (`recipient_member_id`,`is_read`),
  KEY `IX_forum_notifications_actor` (`actor_member_id`),
  KEY `IX_forum_notifications_post` (`post_id`),
  KEY `IX_forum_notifications_comment` (`comment_id`),
  KEY `FK_notifications_like` (`like_id`),
  CONSTRAINT `FK_notifications_recipient` FOREIGN KEY (`recipient_member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_notifications_actor` FOREIGN KEY (`actor_member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_notifications_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_notifications_comment` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_notifications_like` FOREIGN KEY (`like_id`) REFERENCES `forum_likes` (`like_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo tương tác trong cộng đồng';

INSERT INTO `forum_notifications` (`notification_id`, `recipient_member_id`, `actor_member_id`, `notify_type`, `post_id`, `comment_id`, `like_id`, `is_read`, `created_at`) VALUES
(1, 1, 3, 'Like', 1, NULL, 1, 0, '2026-07-08 13:00:00');

-- ---------------------------------------------------------------------
-- 31. forum_post_images
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `forum_post_images`;
CREATE TABLE `forum_post_images` (
  `image_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_postimg_post` (`post_id`),
  CONSTRAINT `fk_postimg_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh đính kèm trong bài đăng forum';

-- ---------------------------------------------------------------------
-- 32. refresh_tokens — trỏ tới accounts.account_id
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `token_id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL COMMENT 'Tài khoản sở hữu token — FK tới accounts.account_id',
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Role tại thời điểm đăng nhập, VD: Member, Staff, Manager, Admin',
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `idx_rt_account` (`account_id`),
  CONSTRAINT `fk_rt_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh token — dữ liệu tạm thời, không cần seed';

-- ---------------------------------------------------------------------
-- 33. otp
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `otp`;
CREATE TABLE `otp` (
  `otp_id` bigint NOT NULL AUTO_INCREMENT,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('DangKy','QuenMatKhau','DoiSoDienThoai') COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `failed_attempts` tinyint NOT NULL DEFAULT '0',
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_otp_phone_purpose` (`phone`,`purpose`),
  KEY `idx_otp_het_han` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mã OTP xác thực một lần — dữ liệu tạm thời, không cần seed';

-- ---------------------------------------------------------------------
-- 34. transaction_adjustment_logs
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `transaction_adjustment_logs`;
CREATE TABLE `transaction_adjustment_logs` (
  `adjustment_id` bigint NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint NOT NULL,
  `old_plan_id` int NOT NULL,
  `new_plan_id` int NOT NULL,
  `old_gia_goc` decimal(18,2) NOT NULL,
  `new_gia_goc` decimal(18,2) NOT NULL,
  `old_amount` decimal(18,2) NOT NULL,
  `new_amount` decimal(18,2) NOT NULL,
  `old_promotion_id` int DEFAULT NULL,
  `new_promotion_id` int DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adjusted_by` bigint NOT NULL,
  `adjusted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adjustment_id`),
  KEY `fk_adjustment_transaction` (`transaction_id`),
  KEY `fk_adjustment_old_plan` (`old_plan_id`),
  KEY `fk_adjustment_new_plan` (`new_plan_id`),
  KEY `fk_adjustment_old_promotion` (`old_promotion_id`),
  KEY `fk_adjustment_new_promotion` (`new_promotion_id`),
  KEY `fk_adjustment_employee` (`adjusted_by`),
  CONSTRAINT `fk_adjustment_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`),
  CONSTRAINT `fk_adjustment_old_plan` FOREIGN KEY (`old_plan_id`) REFERENCES `membership_plans` (`plan_id`),
  CONSTRAINT `fk_adjustment_new_plan` FOREIGN KEY (`new_plan_id`) REFERENCES `membership_plans` (`plan_id`),
  CONSTRAINT `fk_adjustment_old_promotion` FOREIGN KEY (`old_promotion_id`) REFERENCES `promotions` (`promotion_id`),
  CONSTRAINT `fk_adjustment_new_promotion` FOREIGN KEY (`new_promotion_id`) REFERENCES `promotions` (`promotion_id`),
  CONSTRAINT `fk_adjustment_employee` FOREIGN KEY (`adjusted_by`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử chỉnh sửa giao dịch — không cần seed';

-- =====================================================================
-- GHI CHÚ CÁC THAY ĐỔI SO VỚI BẢN TRƯỚC:
-- 1. Đã BỎ bảng `account_lock_log` theo yêu cầu (không còn log khóa/mở
--    khóa tài khoản riêng). Nếu sau này cần lại, có thể bổ sung bảng
--    trỏ FK tới `accounts.account_id` và `employees.employee_id`.
-- 2. Bảng `employees` đã có lại cột `status` (Active/Inactive) để quản
--    lý trạng thái làm việc của nhân viên, tách biệt với
--    `accounts.status` (Active/Suspended) vốn chỉ quản lý việc được
--    phép đăng nhập hay không.
-- 3. `face_data` và `face_update_history` vẫn giữ nguyên thiết kế:
--    chỉ nhân viên (employees, qua `created_by` / `performed_by`) mới
--    được tạo/cập nhật faceId, và mọi lần tạo/cập nhật đều được ghi
--    lại đầy đủ trong `face_update_history`.
-- 4. Đã LOẠI BỎ stored procedure `sp_gan_khuyen_mai_vao_goi` của bản
--    cũ vì nó thao tác trên bảng `promotion_plans` (quan hệ nhiều-
--    nhiều khuyến mãi <-> gói tập) — bảng này không tồn tại trong dump
--    gốc; `promotions` trong schema thực tế đã có sẵn cột `plan_id`
--    quan hệ 1-1 với gói, nên logic gắn khuyến mãi vào gói không còn
--    cần thủ tục này nữa.
-- =====================================================================

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
