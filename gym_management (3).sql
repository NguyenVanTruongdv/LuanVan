-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jul 25, 2026 at 05:57 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gym_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
CREATE TABLE IF NOT EXISTS `accounts` (
  `account_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Mã tài khoản — khóa chính tự tăng',
  `member_id` bigint DEFAULT NULL COMMENT 'Hội viên sở hữu tài khoản — FK tới members.member_id. NULL nếu đây là tài khoản nhân viên',
  `employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên sở hữu tài khoản — FK tới employees.employee_id. NULL nếu đây là tài khoản hội viên',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email, dùng khôi phục mật khẩu/nhận thông báo, có thể NULL nhưng phải duy nhất nếu có',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mật khẩu đã mã hóa bcrypt, không lưu bản rõ',
  `status` enum('Active','Suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái đăng nhập: Active = được phép đăng nhập, Suspended = bị khóa',
  `suspend_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Lý do khóa — bắt buộc điền khi status = Suspended',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_account_phone` (`phone`),
  UNIQUE KEY `uq_account_email` (`email`),
  UNIQUE KEY `uq_account_member` (`member_id`) COMMENT 'Mỗi hội viên chỉ có 1 tài khoản',
  UNIQUE KEY `uq_account_employee` (`employee_id`) COMMENT 'Mỗi nhân viên chỉ có 1 tài khoản'
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `member_id`, `employee_id`, `phone`, `email`, `password_hash`, `status`, `suspend_reason`, `created_at`, `updated_at`) VALUES
(1, 7, NULL, '0339570150', NULL, '$2a$11$c06Im60pC4.EY3snMK/P/OXaU3de3na8nr17EqAiBi7iPgXs47VCS', 'Active', NULL, '2026-07-26 00:43:04', '2026-07-26 00:43:04'),
(19, NULL, 14, '0901000001', 'staff@gmail.com', '$2a$11$c06Im60pC4.EY3snMK/P/OXaU3de3na8nr17EqAiBi7iPgXs47VCS', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:55:31'),
(20, NULL, 15, '0901000002', NULL, '$2a$11$c06Im60pC4.EY3snMK/P/OXaU3de3na8nr17EqAiBi7iPgXs47VCS', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:54:08'),
(21, NULL, 16, '0901000003', NULL, '$2a$11$c06Im60pC4.EY3snMK/P/OXaU3de3na8nr17EqAiBi7iPgXs47VCS', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:54:10'),
(22, NULL, 17, '0901000004', NULL, '$2a$11$c06Im60pC4.EY3snMK/P/OXaU3de3na8nr17EqAiBi7iPgXs47VCS', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:54:13'),
(23, NULL, 18, '0901000005', NULL, '<HASH>', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:53:52'),
(24, NULL, 19, '0901000006', NULL, '<HASH>', 'Active', NULL, '2026-07-26 00:53:52', '2026-07-26 00:53:52');

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
CREATE TABLE IF NOT EXISTS `branches` (
  `branch_id` int NOT NULL AUTO_INCREMENT,
  `branch_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi nhánh phòng gym';

-- --------------------------------------------------------

--
-- Table structure for table `branch_images`
--

DROP TABLE IF EXISTS `branch_images`;
CREATE TABLE IF NOT EXISTS `branch_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_anh_cn` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Album ảnh các khu vực của từng chi nhánh';

-- --------------------------------------------------------

--
-- Table structure for table `check_ins`
--

DROP TABLE IF EXISTS `check_ins`;
CREATE TABLE IF NOT EXISTS `check_ins` (
  `check_in_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL COMMENT 'Hội viên check-in — FK tới members.member_id. NULL nếu đây là lượt check-in của nhân viên',
  `employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên tự check-in (chấm công) — FK tới employees.employee_id. NULL nếu đây là lượt check-in của hội viên',
  `member_package_id` bigint DEFAULT NULL COMMENT 'Gói tập được dùng để check-in — FK tới member_packages.member_package_id. NULL nếu đây là lượt check-in của nhân viên',
  `branch_id` int NOT NULL,
  `check_in_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `method` enum('Auto','Manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint DEFAULT NULL COMMENT 'Nhân viên thực hiện thao tác check-in hộ (trường hợp Manual)',
  `manual_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `check_out_time` datetime DEFAULT NULL,
  `check_out_method` enum('Auto','Manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_out_staff_id` bigint DEFAULT NULL,
  `check_out_manual_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`check_in_id`),
  KEY `fk_checkin_hv` (`member_id`),
  KEY `fk_checkin_employee` (`employee_id`),
  KEY `fk_checkin_package` (`member_package_id`),
  KEY `fk_checkin_cn` (`branch_id`),
  KEY `fk_checkin_nv` (`staff_id`),
  KEY `fk_checkout_nv` (`check_out_staff_id`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
CREATE TABLE IF NOT EXISTS `employees` (
  `employee_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('Male','Female','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active' COMMENT 'Trạng thái làm việc của nhân viên: Active = đang làm việc, Inactive = đã nghỉ việc/ngưng hoạt động',
  `role_id` tinyint NOT NULL COMMENT 'FK tới roles.role_id',
  `created_by` bigint DEFAULT NULL COMMENT 'Nhân viên tạo tài khoản này — tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `fk_employee_role` (`role_id`),
  KEY `fk_employee_creator` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ nhân viên — thông tin đăng nhập nằm ở bảng accounts';

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `full_name`, `phone`, `gender`, `status`, `role_id`, `created_by`, `created_at`, `updated_at`) VALUES
(14, 'Nguyễn Văn An', '0901000001', 'Male', 'Active', 1, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07'),
(15, 'Trần Thị Bình', '0901000002', 'Female', 'Active', 1, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07'),
(16, 'Lê Minh Cường', '0901000003', 'Male', 'Active', 2, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07'),
(17, 'Phạm Thị Dung', '0901000004', 'Female', 'Active', 2, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07'),
(18, 'Hoàng Quốc Huy', '0901000005', 'Male', 'Active', 3, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07'),
(19, 'Võ Thị Lan', '0901000006', 'Female', 'Active', 3, NULL, '2026-07-26 00:52:07', '2026-07-26 00:52:07');

-- --------------------------------------------------------

--
-- Table structure for table `employee_branches`
--

DROP TABLE IF EXISTS `employee_branches`;
CREATE TABLE IF NOT EXISTS `employee_branches` (
  `employee_id` bigint NOT NULL,
  `branch_id` int NOT NULL,
  `branch_role` enum('Manager','Staff') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`employee_id`,`branch_id`),
  KEY `fk_employee_branches_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_update_logs`
--

DROP TABLE IF EXISTS `employee_update_logs`;
CREATE TABLE IF NOT EXISTS `employee_update_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `update_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` bigint NOT NULL COMMENT 'Nhân viên bị thay đổi thông tin — FK tới employees.employee_id',
  `field_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `new_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by_employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên thực hiện thay đổi — FK tới employees.employee_id',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eul_session` (`update_session_id`),
  KEY `idx_eul_employee` (`employee_id`,`field_name`),
  KEY `fk_eul_updated_by` (`updated_by_employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử cập nhật thông tin nhân viên — chỉ ghi thêm';

-- --------------------------------------------------------

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
CREATE TABLE IF NOT EXISTS `equipment` (
  `equipment_id` int NOT NULL AUTO_INCREMENT,
  `equipment_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `status` enum('Active','Deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ảnh thiết bị — quan hệ 1-1, mỗi thiết bị chỉ có 1 ảnh',
  `added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`equipment_id`),
  KEY `fk_thietbi_danhmuc` (`category_id`),
  KEY `fk_thietbi_chinhanh` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thiết bị tập luyện lắp đặt tại các chi nhánh';

-- --------------------------------------------------------

--
-- Table structure for table `equipment_categories`
--

DROP TABLE IF EXISTS `equipment_categories`;
CREATE TABLE IF NOT EXISTS `equipment_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_ten_danh_muc` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục phân loại thiết bị';

-- --------------------------------------------------------

--
-- Table structure for table `face_data`
--

DROP TABLE IF EXISTS `face_data`;
CREATE TABLE IF NOT EXISTS `face_data` (
  `face_data_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL COMMENT 'Hội viên sở hữu faceId — FK tới members.member_id. NULL nếu đây là faceId của nhân viên',
  `employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên sở hữu faceId — FK tới employees.employee_id. NULL nếu đây là faceId của hội viên',
  `face_id_aws` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint NOT NULL COMMENT 'Nhân viên đã đăng ký/tạo faceId này — FK tới employees.employee_id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`face_data_id`),
  UNIQUE KEY `uq_face_id_aws` (`face_id_aws`),
  UNIQUE KEY `uq_face_member` (`member_id`),
  UNIQUE KEY `uq_face_employee` (`employee_id`),
  KEY `fk_face_creator` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `face_update_history`
--

DROP TABLE IF EXISTS `face_update_history`;
CREATE TABLE IF NOT EXISTS `face_update_history` (
  `history_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint DEFAULT NULL COMMENT 'Hội viên liên quan — FK tới members.member_id. NULL nếu đây là lịch sử của nhân viên',
  `employee_id` bigint DEFAULT NULL COMMENT 'Nhân viên liên quan (chủ sở hữu faceId) — FK tới employees.employee_id. NULL nếu đây là lịch sử của hội viên',
  `old_face_id_aws` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_face_id_aws` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `performed_by` bigint NOT NULL COMMENT 'Nhân viên thực hiện tạo/cập nhật faceId — FK tới employees.employee_id',
  `performed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `old_profile_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_profile_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`history_id`),
  KEY `fk_facehistory_member` (`member_id`),
  KEY `fk_facehistory_employee` (`employee_id`),
  KEY `fk_facehistory_staff` (`performed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_categories`
--

DROP TABLE IF EXISTS `forum_categories`;
CREATE TABLE IF NOT EXISTS `forum_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_comments`
--

DROP TABLE IF EXISTS `forum_comments`;
CREATE TABLE IF NOT EXISTS `forum_comments` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `parent_comment_id` bigint DEFAULT NULL,
  `reply_to_member_id` bigint DEFAULT NULL,
  `content` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `status` enum('Active','Hidden','Deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `IX_forum_comments_post_id` (`post_id`),
  KEY `IX_forum_comments_parent_comment_id` (`parent_comment_id`),
  KEY `IX_forum_comments_member_id` (`member_id`),
  KEY `IX_forum_comments_reply_to_member_id` (`reply_to_member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bình luận bài viết cộng đồng, hỗ trợ trả lời 2 cấp';

-- --------------------------------------------------------

--
-- Table structure for table `forum_comment_likes`
--

DROP TABLE IF EXISTS `forum_comment_likes`;
CREATE TABLE IF NOT EXISTS `forum_comment_likes` (
  `like_id` bigint NOT NULL AUTO_INCREMENT,
  `comment_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `UQ_forum_comment_likes` (`comment_id`,`member_id`),
  KEY `IX_forum_comment_likes_member_id` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lượt tym bình luận';

-- --------------------------------------------------------

--
-- Table structure for table `forum_likes`
--

DROP TABLE IF EXISTS `forum_likes`;
CREATE TABLE IF NOT EXISTS `forum_likes` (
  `like_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `member_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `uq_like_post_member` (`post_id`,`member_id`),
  KEY `idx_like_member` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lượt tym bài đăng forum';

-- --------------------------------------------------------

--
-- Table structure for table `forum_notifications`
--

DROP TABLE IF EXISTS `forum_notifications`;
CREATE TABLE IF NOT EXISTS `forum_notifications` (
  `notification_id` bigint NOT NULL AUTO_INCREMENT,
  `recipient_member_id` bigint NOT NULL,
  `actor_member_id` bigint NOT NULL,
  `notify_type` enum('Like','Comment','Reply') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
  KEY `FK_notifications_like` (`like_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông báo tương tác trong cộng đồng';

-- --------------------------------------------------------

--
-- Table structure for table `forum_posts`
--

DROP TABLE IF EXISTS `forum_posts`;
CREATE TABLE IF NOT EXISTS `forum_posts` (
  `post_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `post_type` enum('Original','Repost') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Original',
  `original_post_id` bigint DEFAULT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `comment_count` int NOT NULL DEFAULT '0',
  `repost_count` int NOT NULL DEFAULT '0',
  `status` enum('Active','Hidden','Deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`),
  KEY `idx_post_member` (`member_id`,`status`,`created_at`),
  KEY `idx_post_original` (`original_post_id`),
  KEY `idx_forum_posts_category` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bài đăng cộng đồng';

-- --------------------------------------------------------

--
-- Table structure for table `forum_post_images`
--

DROP TABLE IF EXISTS `forum_post_images`;
CREATE TABLE IF NOT EXISTS `forum_post_images` (
  `image_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_postimg_post` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh đính kèm trong bài đăng forum';

-- --------------------------------------------------------

--
-- Table structure for table `gym_density`
--

DROP TABLE IF EXISTS `gym_density`;
CREATE TABLE IF NOT EXISTS `gym_density` (
  `density_id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `recorded_at` datetime NOT NULL,
  `headcount` smallint NOT NULL,
  PRIMARY KEY (`density_id`),
  KEY `idx_mat_do_cn_tg` (`branch_id`,`recorded_at`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Snapshot mật độ người tập theo thời gian';

-- --------------------------------------------------------

--
-- Table structure for table `home_images`
--

DROP TABLE IF EXISTS `home_images`;
CREATE TABLE IF NOT EXISTS `home_images` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` tinyint NOT NULL DEFAULT '0',
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `uploaded_by` bigint NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `fk_home_img_nv` (`uploaded_by`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh hiển thị trên trang chủ (banner/slideshow)';

-- --------------------------------------------------------

--
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
CREATE TABLE IF NOT EXISTS `incidents` (
  `incident_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` int NOT NULL,
  `equipment_id` int DEFAULT NULL,
  `reported_by_member_id` bigint DEFAULT NULL,
  `reported_by_employee_id` bigint DEFAULT NULL,
  `status` enum('PendingApproval','Approved','Completed','Cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingApproval',
  `reject_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incident_id`),
  KEY `fk_su_co_cn` (`branch_id`),
  KEY `fk_su_co_tb` (`equipment_id`),
  KEY `fk_su_co_hv` (`reported_by_member_id`),
  KEY `fk_su_co_nv` (`reported_by_employee_id`),
  KEY `fk_su_co_approved` (`approved_by`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Báo cáo sự cố';

-- --------------------------------------------------------

--
-- Table structure for table `incident_medias`
--

DROP TABLE IF EXISTS `incident_medias`;
CREATE TABLE IF NOT EXISTS `incident_medias` (
  `media_id` int NOT NULL AUTO_INCREMENT,
  `incident_id` int NOT NULL,
  `media_type` enum('Image','Video') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`media_id`),
  KEY `fk_incident_media_incident` (`incident_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
CREATE TABLE IF NOT EXISTS `members` (
  `member_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('Male','Female','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PendingActivation','Active') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingActivation' COMMENT 'PendingActivation=chờ kích hoạt, Active=đang hoạt động. Việc khóa đăng nhập nay do accounts.status quản lý, không còn Expired/Suspended ở đây.',
  `internal_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú nội bộ, hội viên không thấy',
  `created_by` bigint DEFAULT NULL COMMENT 'Nhân viên tạo hồ sơ hội viên — FK tới employees.employee_id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  KEY `fk_member_creator` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ hội viên — thông tin đăng nhập nằm ở bảng accounts';

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`member_id`, `full_name`, `gender`, `status`, `internal_notes`, `created_by`, `created_at`, `updated_at`) VALUES
(7, 'Nguyễn Văn Trường 01A683', 'Male', 'PendingActivation', NULL, NULL, '2026-07-26 00:43:04', '2026-07-26 00:46:53');

-- --------------------------------------------------------

--
-- Table structure for table `membership_plans`
--

DROP TABLE IF EXISTS `membership_plans`;
CREATE TABLE IF NOT EXISTS `membership_plans` (
  `plan_id` int NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,0) NOT NULL,
  `duration_days` smallint NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('OnSale','Discontinued') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OnSale',
  `is_popular` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh sách gói tập — không còn phân loại Customer/Internal';

--
-- Dumping data for table `membership_plans`
--

INSERT INTO `membership_plans` (`plan_id`, `plan_name`, `price`, `duration_days`, `description`, `status`, `is_popular`, `created_at`) VALUES
(6, 'Gói tập 10K', 10000, 30, 'Gói tập dùng để kiểm thử', 'OnSale', 0, '2026-07-26 00:45:10'),
(7, 'Gói tập 50K', 50000, 30, 'Gói tập cơ bản', 'OnSale', 1, '2026-07-26 00:45:10'),
(8, 'Gói tập 100K', 100000, 90, 'Gói tập 3 tháng', 'OnSale', 1, '2026-07-26 00:45:10'),
(9, 'Gói tập 200K', 200000, 180, 'Gói tập 6 tháng', 'OnSale', 0, '2026-07-26 00:45:10');

-- --------------------------------------------------------

--
-- Table structure for table `member_packages`
--

DROP TABLE IF EXISTS `member_packages`;
CREATE TABLE IF NOT EXISTS `member_packages` (
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
  `package_status` enum('PendingActivation','Active','Expired','Cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PendingActivation',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_package_id`),
  KEY `fk_mp_member` (`member_id`),
  KEY `fk_mp_transaction` (`transaction_id`),
  KEY `fk_mp_plan` (`plan_id`),
  KEY `fk_mp_promotion` (`promotion_id`),
  KEY `fk_member_packages_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gói tập đã mua của từng hội viên. LƯU Ý: package_status (trạng thái của gói tập cụ thể) vẫn giữ Expired — đây khác với members.status (trạng thái tài khoản hội viên nói chung), cái đã bỏ Expired theo yêu cầu.';

-- --------------------------------------------------------

--
-- Table structure for table `member_update_logs`
--

DROP TABLE IF EXISTS `member_update_logs`;
CREATE TABLE IF NOT EXISTS `member_update_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `update_session_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_id` bigint NOT NULL,
  `field_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `new_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by_employee_id` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mul_session` (`update_session_id`),
  KEY `idx_mul_member` (`member_id`,`field_name`),
  KEY `fk_mul_employee` (`updated_by_employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử cập nhật thông tin hội viên — chỉ ghi thêm';

-- --------------------------------------------------------

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
CREATE TABLE IF NOT EXISTS `news` (
  `news_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Hidden') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_by` bigint NOT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`news_id`),
  KEY `idx_news_status` (`status`),
  KEY `fk_news_nv` (`created_by`),
  KEY `FK_news_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tin tức hiển thị cho hội viên';

-- --------------------------------------------------------

--
-- Table structure for table `otp`
--

DROP TABLE IF EXISTS `otp`;
CREATE TABLE IF NOT EXISTS `otp` (
  `otp_id` bigint NOT NULL AUTO_INCREMENT,
  `phone` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` enum('DangKy','QuenMatKhau','DoiSoDienThoai') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `failed_attempts` tinyint NOT NULL DEFAULT '0',
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_otp_phone_purpose` (`phone`,`purpose`),
  KEY `idx_otp_het_han` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mã OTP xác thực một lần — dữ liệu tạm thời, không cần seed';

--
-- Dumping data for table `otp`
--

INSERT INTO `otp` (`otp_id`, `phone`, `otp_code`, `purpose`, `expires_at`, `failed_attempts`, `is_used`, `created_at`) VALUES
(4, '0339570150', '353323', 'DangKy', '2026-07-25 17:47:41', 0, 1, '2026-07-25 17:42:41');

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
CREATE TABLE IF NOT EXISTS `promotions` (
  `promotion_id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `ten_khuyen_mai` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `promo_type` enum('GiamPhanTram','GiamTienMat','TangNgay','TangChuKy') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phan_tram_giam` decimal(5,2) DEFAULT NULL,
  `muc_giam_toi_da` decimal(12,0) DEFAULT NULL,
  `so_tien_giam` decimal(12,0) DEFAULT NULL,
  `so_ngay_tang` smallint DEFAULT NULL,
  `so_chu_ky_tang` tinyint DEFAULT NULL,
  `ngay_bat_dau` datetime NOT NULL,
  `ngay_ket_thuc` datetime NOT NULL,
  `gioi_han_luot` int DEFAULT NULL,
  `so_luot_da_dung` int NOT NULL DEFAULT '0',
  `trang_thai` enum('NhapLieu','HoatDong','TamDung','HetHan') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NhapLieu',
  `nguoi_tao` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  KEY `idx_km_trangthai_thoigian` (`trang_thai`,`ngay_bat_dau`,`ngay_ket_thuc`),
  KEY `fk_km_nguoi_tao` (`nguoi_tao`),
  KEY `fk_promotions_plan` (`plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chương trình khuyến mãi';

-- --------------------------------------------------------

--
-- Table structure for table `promotion_usages`
--

DROP TABLE IF EXISTS `promotion_usages`;
CREATE TABLE IF NOT EXISTS `promotion_usages` (
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
  KEY `fk_su_dung_goi` (`plan_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử áp dụng khuyến mãi';

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `token_id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL COMMENT 'Tài khoản sở hữu token — FK tới accounts.account_id',
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Role tại thời điểm đăng nhập, VD: Member, Staff, Manager, Admin',
  `token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `idx_rt_account` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Refresh token — dữ liệu tạm thời, không cần seed';

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`token_id`, `account_id`, `role`, `token_hash`, `expires_at`, `revoked_at`, `created_at`) VALUES
(67, 1, 'Member', 'e9ca5b043e3f0a7e32c28a9bdcdd6ac5c67754d662f4ef5e075f362c36fc7c6f', '2026-08-01 17:43:07', NULL, '2026-07-26 00:43:06'),
(68, 19, 'Staff', '822d96a61f018b2a57f4a1b086d801a3fd4f736148f7bb7f4889b2937cc9b0ed', '2026-08-24 17:55:39', NULL, '2026-07-26 00:55:39');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` tinyint NOT NULL AUTO_INCREMENT COMMENT 'Mã vai trò',
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên vai trò: Staff, Manager, Admin',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vai trò của nhân viên';

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(3, 'Admin'),
(2, 'Manager'),
(1, 'Staff');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE IF NOT EXISTS `transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `order_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_reference_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_id` bigint NOT NULL,
  `plan_id` int NOT NULL,
  `promotion_id` int DEFAULT NULL,
  `branch_id` int NOT NULL,
  `payment_method` enum('Cash','BankTransfer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` enum('Pending','Paid','Cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `gia_goc` decimal(12,0) NOT NULL,
  `amount` decimal(12,0) NOT NULL,
  `receipt_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  KEY `fk_transactions_employee` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Giao dịch thanh toán mua hoặc gia hạn gói tập';

-- --------------------------------------------------------

--
-- Table structure for table `transaction_adjustment_logs`
--

DROP TABLE IF EXISTS `transaction_adjustment_logs`;
CREATE TABLE IF NOT EXISTS `transaction_adjustment_logs` (
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
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adjusted_by` bigint NOT NULL,
  `adjusted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adjustment_id`),
  KEY `fk_adjustment_transaction` (`transaction_id`),
  KEY `fk_adjustment_old_plan` (`old_plan_id`),
  KEY `fk_adjustment_new_plan` (`new_plan_id`),
  KEY `fk_adjustment_old_promotion` (`old_promotion_id`),
  KEY `fk_adjustment_new_promotion` (`new_promotion_id`),
  KEY `fk_adjustment_employee` (`adjusted_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử chỉnh sửa giao dịch — không cần seed';

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `fk_account_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_account_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`);

--
-- Constraints for table `branch_images`
--
ALTER TABLE `branch_images`
  ADD CONSTRAINT `fk_anh_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `check_ins`
--
ALTER TABLE `check_ins`
  ADD CONSTRAINT `fk_checkin_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_checkin_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_checkin_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_checkin_nv` FOREIGN KEY (`staff_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_checkin_package` FOREIGN KEY (`member_package_id`) REFERENCES `member_packages` (`member_package_id`),
  ADD CONSTRAINT `fk_checkout_nv` FOREIGN KEY (`check_out_staff_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employee_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_employee_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

--
-- Constraints for table `employee_branches`
--
ALTER TABLE `employee_branches`
  ADD CONSTRAINT `fk_employee_branches_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_employee_branches_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_update_logs`
--
ALTER TABLE `employee_update_logs`
  ADD CONSTRAINT `fk_eul_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_eul_updated_by` FOREIGN KEY (`updated_by_employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `equipment`
--
ALTER TABLE `equipment`
  ADD CONSTRAINT `fk_thietbi_chinhanh` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_thietbi_danhmuc` FOREIGN KEY (`category_id`) REFERENCES `equipment_categories` (`category_id`);

--
-- Constraints for table `face_data`
--
ALTER TABLE `face_data`
  ADD CONSTRAINT `fk_face_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_face_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_face_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`);

--
-- Constraints for table `face_update_history`
--
ALTER TABLE `face_update_history`
  ADD CONSTRAINT `fk_facehistory_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_facehistory_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_facehistory_staff` FOREIGN KEY (`performed_by`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `forum_comments`
--
ALTER TABLE `forum_comments`
  ADD CONSTRAINT `FK_forum_comments_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `FK_forum_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_forum_comments_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_forum_comments_reply_to` FOREIGN KEY (`reply_to_member_id`) REFERENCES `members` (`member_id`) ON DELETE SET NULL;

--
-- Constraints for table `forum_comment_likes`
--
ALTER TABLE `forum_comment_likes`
  ADD CONSTRAINT `FK_comment_likes_comment` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_comment_likes_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE;

--
-- Constraints for table `forum_likes`
--
ALTER TABLE `forum_likes`
  ADD CONSTRAINT `fk_like_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `forum_notifications`
--
ALTER TABLE `forum_notifications`
  ADD CONSTRAINT `FK_notifications_actor` FOREIGN KEY (`actor_member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notifications_comment` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`comment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notifications_like` FOREIGN KEY (`like_id`) REFERENCES `forum_likes` (`like_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT `FK_notifications_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notifications_recipient` FOREIGN KEY (`recipient_member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE;

--
-- Constraints for table `forum_posts`
--
ALTER TABLE `forum_posts`
  ADD CONSTRAINT `fk_forum_posts_category` FOREIGN KEY (`category_id`) REFERENCES `forum_categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_forum_posts_original` FOREIGN KEY (`original_post_id`) REFERENCES `forum_posts` (`post_id`),
  ADD CONSTRAINT `fk_post_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`);

--
-- Constraints for table `forum_post_images`
--
ALTER TABLE `forum_post_images`
  ADD CONSTRAINT `fk_postimg_post` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `gym_density`
--
ALTER TABLE `gym_density`
  ADD CONSTRAINT `fk_md_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `home_images`
--
ALTER TABLE `home_images`
  ADD CONSTRAINT `fk_home_img_nv` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `incidents`
--
ALTER TABLE `incidents`
  ADD CONSTRAINT `fk_su_co_approved` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_su_co_cn` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_su_co_hv` FOREIGN KEY (`reported_by_member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_su_co_nv` FOREIGN KEY (`reported_by_employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_su_co_tb` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`equipment_id`);

--
-- Constraints for table `incident_medias`
--
ALTER TABLE `incident_medias`
  ADD CONSTRAINT `fk_incident_media_incident` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`incident_id`);

--
-- Constraints for table `members`
--
ALTER TABLE `members`
  ADD CONSTRAINT `fk_member_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `member_packages`
--
ALTER TABLE `member_packages`
  ADD CONSTRAINT `fk_member_packages_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_mp_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_mp_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  ADD CONSTRAINT `fk_mp_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  ADD CONSTRAINT `fk_mp_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`);

--
-- Constraints for table `member_update_logs`
--
ALTER TABLE `member_update_logs`
  ADD CONSTRAINT `fk_mul_employee` FOREIGN KEY (`updated_by_employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_mul_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`);

--
-- Constraints for table `news`
--
ALTER TABLE `news`
  ADD CONSTRAINT `FK_news_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_news_nv` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `promotions`
--
ALTER TABLE `promotions`
  ADD CONSTRAINT `fk_km_nguoi_tao` FOREIGN KEY (`nguoi_tao`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_promotions_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`);

--
-- Constraints for table `promotion_usages`
--
ALTER TABLE `promotion_usages`
  ADD CONSTRAINT `fk_su_dung_goi` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  ADD CONSTRAINT `fk_su_dung_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_su_dung_km` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  ADD CONSTRAINT `fk_su_dung_package` FOREIGN KEY (`member_package_id`) REFERENCES `member_packages` (`member_package_id`);

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_gd_goi` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`plan_id`),
  ADD CONSTRAINT `fk_gd_hv` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`),
  ADD CONSTRAINT `fk_transaction_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`),
  ADD CONSTRAINT `fk_transactions_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_transactions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL;

--
-- Constraints for table `transaction_adjustment_logs`
--
ALTER TABLE `transaction_adjustment_logs`
  ADD CONSTRAINT `fk_adjustment_employee` FOREIGN KEY (`adjusted_by`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_adjustment_new_plan` FOREIGN KEY (`new_plan_id`) REFERENCES `membership_plans` (`plan_id`),
  ADD CONSTRAINT `fk_adjustment_new_promotion` FOREIGN KEY (`new_promotion_id`) REFERENCES `promotions` (`promotion_id`),
  ADD CONSTRAINT `fk_adjustment_old_plan` FOREIGN KEY (`old_plan_id`) REFERENCES `membership_plans` (`plan_id`),
  ADD CONSTRAINT `fk_adjustment_old_promotion` FOREIGN KEY (`old_promotion_id`) REFERENCES `promotions` (`promotion_id`),
  ADD CONSTRAINT `fk_adjustment_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
