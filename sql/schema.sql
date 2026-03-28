-- --------------------------------------------------------
-- Ganzhou Travel Platform database init script
-- Database: ganzhou_travel_platform
-- Charset: utf8mb4
-- --------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `ganzhou_travel_platform`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `ganzhou_travel_platform`;

DROP TABLE IF EXISTS `ai_copywriting_logs`;
DROP TABLE IF EXISTS `ai_trip_logs`;
DROP TABLE IF EXISTS `ai_chat_logs`;
DROP TABLE IF EXISTS `home_recommends`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `scenic_spots`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `system_configs`;
DROP TABLE IF EXISTS `admins`;

CREATE TABLE `admins` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'super_admin',
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_username` (`username`),
  KEY `idx_admins_status` (`status`),
  KEY `idx_admins_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_code` (`code`),
  KEY `idx_categories_type` (`type`),
  KEY `idx_categories_status` (`status`),
  KEY `idx_categories_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `scenic_spots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `region` VARCHAR(100) NOT NULL,
  `category_id` BIGINT DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `gallery_images` TEXT,
  `intro` TEXT,
  `culture_desc` TEXT,
  `open_time` VARCHAR(100) DEFAULT NULL,
  `ticket_info` VARCHAR(100) DEFAULT NULL,
  `suggested_duration` VARCHAR(50) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `traffic_guide` TEXT,
  `tips` TEXT,
  `tags` VARCHAR(255) DEFAULT NULL,
  `recommend_flag` TINYINT NOT NULL DEFAULT 0,
  `hot_score` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scenic_category_id` (`category_id`),
  KEY `idx_scenic_region` (`region`),
  KEY `idx_scenic_status` (`status`),
  KEY `idx_scenic_recommend_flag` (`recommend_flag`),
  KEY `idx_scenic_hot_score` (`hot_score`),
  KEY `idx_scenic_created_at` (`created_at`),
  CONSTRAINT `fk_scenic_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `articles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `category_id` BIGINT DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `summary` TEXT,
  `content` LONGTEXT,
  `source` VARCHAR(255) DEFAULT NULL,
  `author` VARCHAR(100) DEFAULT NULL,
  `tags` VARCHAR(255) DEFAULT NULL,
  `recommend_flag` TINYINT NOT NULL DEFAULT 0,
  `view_count` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_articles_category_id` (`category_id`),
  KEY `idx_articles_status` (`status`),
  KEY `idx_articles_recommend_flag` (`recommend_flag`),
  KEY `idx_articles_created_at` (`created_at`),
  CONSTRAINT `fk_articles_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `banners` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `link_type` VARCHAR(50) DEFAULT NULL,
  `link_target` VARCHAR(255) DEFAULT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_status` (`status`),
  KEY `idx_banners_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `home_recommends` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `module_name` VARCHAR(50) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` BIGINT NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_home_recommends_module_name` (`module_name`),
  KEY `idx_home_recommends_target_type` (`target_type`),
  KEY `idx_home_recommends_target_id` (`target_id`),
  KEY `idx_home_recommends_status` (`status`),
  KEY `idx_home_recommends_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `question` TEXT NOT NULL,
  `answer` LONGTEXT,
  `matched_context` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `ip` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_trip_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `days` INT NOT NULL,
  `preferences` VARCHAR(255) DEFAULT NULL,
  `departure_area` VARCHAR(100) DEFAULT NULL,
  `pace` VARCHAR(50) DEFAULT NULL,
  `extra_requirement` TEXT,
  `result_content` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_trip_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_copywriting_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` BIGINT DEFAULT NULL,
  `input_data` LONGTEXT,
  `output_content` LONGTEXT,
  `prompt_text` LONGTEXT,
  `model_name` VARCHAR(100) DEFAULT NULL,
  `token_usage` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_copywriting_logs_target_type` (`target_type`),
  KEY `idx_ai_copywriting_logs_target_id` (`target_id`),
  KEY `idx_ai_copywriting_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_configs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` LONGTEXT,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_system_configs_key` (`config_key`),
  KEY `idx_system_configs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`id`, `username`, `password`, `nickname`, `avatar`, `role`, `status`) VALUES
(1, 'admin', 'pbkdf2$100000$cd2919c1a89fedf6ef46a4274a0178c5$86f053d04f766d120e3334878232a530e8fbd47a4261f54d072883c5e5c5a7e6', 'System Admin', '/uploads/default-avatar.png', 'super_admin', 1);

INSERT INTO `categories` (`id`, `name`, `code`, `type`, `sort`, `status`) VALUES
(1, 'Nature Scenic', 'scenic_nature', 'scenic', 1, 1),
(2, 'History Scenic', 'scenic_history', 'scenic', 2, 1),
(3, 'Ganzhou Food', 'food', 'article', 1, 1),
(4, 'Intangible Heritage', 'heritage', 'article', 2, 1),
(5, 'Red Culture', 'red_culture', 'article', 3, 1);

INSERT INTO `scenic_spots` (
  `id`, `name`, `region`, `category_id`, `cover_image`, `gallery_images`, `intro`, `culture_desc`,
  `open_time`, `ticket_info`, `suggested_duration`, `address`, `traffic_guide`, `tips`, `tags`,
  `recommend_flag`, `hot_score`, `status`
) VALUES
(1, 'Tongtianyan', 'Zhanggong', 2, '/uploads/scenic/tongtianyan-cover.jpg', '["/uploads/scenic/tongtianyan-1.jpg","/uploads/scenic/tongtianyan-2.jpg"]', 'Tongtianyan is a classic Ganzhou scenic spot known for grotto carvings and local history.', 'The site combines stone carvings, local history, and cultural tourism value.', '08:30-17:30', 'Reference 50 CNY', '2-3 hours', 'Zhanggong District, Ganzhou', 'Taxi or self-drive from downtown is recommended.', 'Stone steps may be slippery after rain.', 'grotto,history,weekend', 1, 98, 1),
(2, 'Yugutai', 'Zhanggong', 2, '/uploads/scenic/yugutai-cover.jpg', '["/uploads/scenic/yugutai-1.jpg","/uploads/scenic/yugutai-2.jpg"]', 'Yugutai is a landmark in Ganzhou old city and works well for city walking routes.', 'The tower carries Song dynasty memory and local literary heritage.', 'All day', 'Free', '1-2 hours', 'Yugutai historic block, Ganzhou', 'You can visit it together with the old floating bridge.', 'Public holidays are usually crowded.', 'old-city,history,citywalk', 1, 95, 1),
(3, 'Ancient Floating Bridge', 'Zhanggong', 2, '/uploads/scenic/gufuqiao-cover.jpg', '["/uploads/scenic/gufuqiao-1.jpg","/uploads/scenic/gufuqiao-2.jpg"]', 'The ancient floating bridge is one of the most recognizable landmarks in Ganzhou.', 'It reflects traditional traffic wisdom and old city structure.', 'All day', 'Free', '1 hour', 'Along Zhang River, Ganzhou', 'Best visited on foot from nearby old city spots.', 'Be careful on rainy days.', 'bridge,landmark,photo', 1, 90, 1),
(4, 'Sanbaishan', 'Anyuan', 1, '/uploads/scenic/sanbaishan-cover.jpg', '["/uploads/scenic/sanbaishan-1.jpg","/uploads/scenic/sanbaishan-2.jpg"]', 'Sanbaishan is known for mountain scenery, forest views, and ecological tourism.', 'It is one of the representative natural destinations in southern Jiangxi.', '08:00-17:00', 'Reference 90 CNY', 'Half day to 1 day', 'Anyuan County, Ganzhou', 'Self-drive is recommended for this route.', 'Wear comfortable shoes for mountain paths.', 'nature,forest,eco-tour', 1, 93, 1),
(5, 'Hakka Culture City', 'Ganxian', 2, '/uploads/scenic/hakka-city-cover.jpg', '["/uploads/scenic/hakka-city-1.jpg","/uploads/scenic/hakka-city-2.jpg"]', 'This scenic area focuses on Hakka architecture, customs, and cultural display.', 'It is useful for understanding Hakka migration history and folk culture.', '09:00-17:00', 'Reference 60 CNY', '2-3 hours', 'Ganxian District, Ganzhou', 'Can be visited together with nearby cultural spots.', 'Check opening times before visiting.', 'hakka,culture,family', 0, 85, 1),
(6, 'Yashan Scenic Area', 'Dayu', 1, '/uploads/scenic/yashan-cover.jpg', '["/uploads/scenic/yashan-1.jpg","/uploads/scenic/yashan-2.jpg"]', 'Yashan is suitable for leisure trips, holiday travel, and family outings.', 'It combines mountain landscape with light vacation experiences.', '08:30-17:30', 'Reference 80 CNY', 'Half day to 1 day', 'Dayu County, Ganzhou', 'Check weather before departure.', 'Bring water and light outdoor gear.', 'vacation,nature,wellness', 0, 82, 1);

INSERT INTO `articles` (
  `id`, `title`, `category_id`, `cover_image`, `summary`, `content`, `source`, `author`, `tags`,
  `recommend_flag`, `view_count`, `status`
) VALUES
(1, 'Ganzhou Fried Fish', 3, '/uploads/article/xiaochaoyu-cover.jpg', 'A classic Ganzhou local dish with sour and fresh flavor.', 'Ganzhou fried fish is a common local food choice for first-time visitors and is easy to present in travel content.', 'platform', 'system', 'food,hakka,local-dish', 1, 128, 1),
(2, 'Ningdu Meatball', 3, '/uploads/article/ningdou-rouwan-cover.jpg', 'A traditional local snack with a firm and elastic texture.', 'This dish often appears in local family meals and festival scenes, which gives it cultural storytelling value.', 'platform', 'system', 'food,ningdu,snack', 1, 96, 1),
(3, 'Gannan Tea-picking Opera', 4, '/uploads/article/gan-nan-tea-opera-cover.jpg', 'A representative local opera form with strong regional style.', 'The opera grew from folk song and tea culture performance, and is suitable for heritage content display.', 'platform', 'system', 'heritage,opera,folk-art', 1, 150, 1),
(4, 'Hakka Leicha', 4, '/uploads/article/lei-cha-cover.jpg', 'A Hakka tea-based food culture that is both social and regional.', 'Leicha is useful for explaining daily Hakka life, hospitality, and food heritage.', 'platform', 'system', 'heritage,hakka,tea', 0, 88, 1),
(5, 'Ruijin Red Sites', 5, '/uploads/article/ruijin-red-cover.jpg', 'Ruijin is a major red culture destination with important revolutionary memory.', 'This article is useful for red tourism, history introduction, and study-tour content.', 'platform', 'system', 'red-culture,history,study-tour', 1, 166, 1),
(6, 'Long March Spirit in Southern Jiangxi', 5, '/uploads/article/long-march-cover.jpg', 'A topic that connects local memory with present-day cultural communication.', 'This content works well for red culture explanation and tourism education scenarios.', 'platform', 'system', 'red-culture,long-march,ganzhou', 0, 103, 1);

INSERT INTO `banners` (`id`, `title`, `image_url`, `link_type`, `link_target`, `sort`, `status`) VALUES
(1, 'Explore Ganzhou Culture', '/uploads/banner/banner-1.jpg', 'scenic', '/scenic/1', 1, 1),
(2, 'Taste Food and Heritage', '/uploads/banner/banner-2.jpg', 'article', '/food/1', 2, 1);

INSERT INTO `home_recommends` (`id`, `module_name`, `target_type`, `target_id`, `sort`, `status`) VALUES
(1, 'scenic', 'scenic', 1, 1, 1),
(2, 'scenic', 'scenic', 2, 2, 1),
(3, 'food', 'article', 1, 1, 1),
(4, 'food', 'article', 2, 2, 1),
(5, 'heritage', 'article', 3, 1, 1),
(6, 'heritage', 'article', 4, 2, 1),
(7, 'red_culture', 'article', 5, 1, 1),
(8, 'red_culture', 'article', 6, 2, 1);

INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `remark`) VALUES
(1, 'site_name', 'Ganzhou Travel Platform', 'site name'),
(2, 'site_description', 'Ganzhou travel and culture smart service platform', 'site description'),
(3, 'ai_model_name', 'gpt-4o-mini', 'ai model placeholder');

SET FOREIGN_KEY_CHECKS = 1;
