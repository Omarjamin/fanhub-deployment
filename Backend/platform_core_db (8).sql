-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 02, 2026 at 06:43 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `platform_core_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `community_suggestions`
--

CREATE TABLE `community_suggestions` (
  `suggestion_id` int(11) NOT NULL,
  `community_name` varchar(150) NOT NULL,
  `suggestion_text` text NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_suggestions`
--

INSERT INTO `community_suggestions` (`suggestion_id`, `community_name`, `suggestion_text`, `contact_email`, `is_read`, `read_at`, `created_at`) VALUES
(1, 'test', 'test', 'tes@gmail.com', 1, '2026-03-02 23:24:33', '2026-03-02 15:23:45'),
(2, 'test', 'test', 'test@gmail.com', 0, NULL, '2026-03-02 15:24:20');

-- --------------------------------------------------------

--
-- Table structure for table `platform_admins`
--

CREATE TABLE `platform_admins` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','admin') NOT NULL DEFAULT 'admin',
  `otp` varchar(10) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `platform_admins`
--

INSERT INTO `platform_admins` (`id`, `email`, `password_hash`, `role`, `otp`, `otp_expiry`, `created_at`, `updated_at`) VALUES
(1, 'jamino179@gmail.com', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'admin', NULL, NULL, '2026-03-01 13:09:52', '2026-03-01 13:36:20');

-- --------------------------------------------------------

--
-- Table structure for table `provinces`
--

CREATE TABLE `provinces` (
  `id` int(10) UNSIGNED NOT NULL,
  `prv_code` varchar(10) NOT NULL,
  `reg_code` varchar(10) NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provinces`
--

INSERT INTO `provinces` (`id`, `prv_code`, `reg_code`, `name`) VALUES
(1, '0102800000', '0100000000', 'Ilocos Norte'),
(2, '0102900000', '0100000000', 'Ilocos Sur'),
(3, '0103300000', '0100000000', 'La Union'),
(4, '0105500000', '0100000000', 'Pangasinan'),
(5, '0200900000', '0200000000', 'Batanes'),
(6, '0201500000', '0200000000', 'Cagayan'),
(7, '0203100000', '0200000000', 'Isabela'),
(8, '0205000000', '0200000000', 'Nueva Vizcaya'),
(9, '0205700000', '0200000000', 'Quirino'),
(10, '0300800000', '0300000000', 'Bataan'),
(11, '0301400000', '0300000000', 'Bulacan'),
(12, '0304900000', '0300000000', 'Nueva Ecija'),
(13, '0305400000', '0300000000', 'Pampanga'),
(14, '0306900000', '0300000000', 'Tarlac'),
(15, '0307100000', '0300000000', 'Zambales'),
(16, '0307700000', '0300000000', 'Aurora'),
(17, '0401000000', '0400000000', 'Batangas'),
(18, '0402100000', '0400000000', 'Cavite'),
(19, '0403400000', '0400000000', 'Laguna'),
(20, '0405600000', '0400000000', 'Quezon'),
(21, '0405800000', '0400000000', 'Rizal'),
(22, '1704000000', '1700000000', 'Marinduque'),
(23, '1705100000', '1700000000', 'Occidental Mindoro'),
(24, '1705200000', '1700000000', 'Oriental Mindoro'),
(25, '1705300000', '1700000000', 'Palawan'),
(26, '1705900000', '1700000000', 'Romblon'),
(27, '0500500000', '0500000000', 'Albay'),
(28, '0501600000', '0500000000', 'Camarines Norte'),
(29, '0501700000', '0500000000', 'Camarines Sur'),
(30, '0502000000', '0500000000', 'Catanduanes'),
(31, '0504100000', '0500000000', 'Masbate'),
(32, '0506200000', '0500000000', 'Sorsogon'),
(33, '0600400000', '0600000000', 'Aklan'),
(34, '0600600000', '0600000000', 'Antique'),
(35, '0601900000', '0600000000', 'Capiz'),
(36, '0603000000', '0600000000', 'Iloilo'),
(37, '0604500000', '0600000000', 'Negros Occidental'),
(38, '0607900000', '0600000000', 'Guimaras'),
(39, '0701200000', '0700000000', 'Bohol'),
(40, '0702200000', '0700000000', 'Cebu'),
(41, '0704600000', '0700000000', 'Negros Oriental'),
(42, '0706100000', '0700000000', 'Siquijor'),
(43, '0802600000', '0800000000', 'Eastern Samar'),
(44, '0803700000', '0800000000', 'Leyte'),
(45, '0804800000', '0800000000', 'Northern Samar'),
(46, '0806000000', '0800000000', 'Samar'),
(47, '0806400000', '0800000000', 'Southern Leyte'),
(48, '0807800000', '0800000000', 'Biliran'),
(49, '0907200000', '0900000000', 'Zamboanga del Norte'),
(50, '0907300000', '0900000000', 'Zamboanga del Sur'),
(51, '0908300000', '0900000000', 'Zamboanga Sibugay'),
(52, '1001300000', '1000000000', 'Bukidnon'),
(53, '1001800000', '1000000000', 'Camiguin'),
(54, '1003500000', '1000000000', 'Lanao del Norte'),
(55, '1004200000', '1000000000', 'Misamis Occidental'),
(56, '1004300000', '1000000000', 'Misamis Oriental'),
(57, '1102300000', '1100000000', 'Davao del Norte'),
(58, '1102400000', '1100000000', 'Davao del Sur'),
(59, '1102500000', '1100000000', 'Davao Oriental'),
(60, '1108200000', '1100000000', 'Davao de Oro'),
(61, '1108600000', '1100000000', 'Davao Occidental'),
(62, '1204700000', '1200000000', 'Cotabato'),
(63, '1206300000', '1200000000', 'South Cotabato'),
(64, '1206500000', '1200000000', 'Sultan Kudarat'),
(65, '1208000000', '1200000000', 'Sarangani'),
(66, '1400100000', '1400000000', 'Abra'),
(67, '1401100000', '1400000000', 'Benguet'),
(68, '1402700000', '1400000000', 'Ifugao'),
(69, '1403200000', '1400000000', 'Kalinga'),
(70, '1404400000', '1400000000', 'Mountain Province'),
(71, '1408100000', '1400000000', 'Apayao'),
(72, '1600200000', '1600000000', 'Agusan del Norte'),
(73, '1600300000', '1600000000', 'Agusan del Sur'),
(74, '1606700000', '1600000000', 'Surigao del Norte'),
(75, '1606800000', '1600000000', 'Surigao del Sur'),
(76, '1608500000', '1600000000', 'Dinagat Islands'),
(77, '1900700000', '1900000000', 'Basilan'),
(78, '1903600000', '1900000000', 'Lanao del Sur'),
(79, '1906600000', '1900000000', 'Sulu'),
(80, '1907000000', '1900000000', 'Tawi-Tawi'),
(81, '1908700000', '1900000000', 'Maguindanao del Norte'),
(82, '1908800000', '1900000000', 'Maguindanao del Sur');

-- --------------------------------------------------------

--
-- Table structure for table `regions`
--

CREATE TABLE `regions` (
  `id` int(10) UNSIGNED NOT NULL,
  `reg_code` varchar(10) NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `regions`
--

INSERT INTO `regions` (`id`, `reg_code`, `name`) VALUES
(1, '0100000000', 'Region I (Ilocos Region)'),
(2, '0200000000', 'Region II (Cagayan Valley)'),
(3, '0300000000', 'Region III (Central Luzon)'),
(4, '0400000000', 'Region IV-A (CALABARZON)'),
(5, '1700000000', 'MIMAROPA Region'),
(6, '0500000000', 'Region V (Bicol Region)'),
(7, '0600000000', 'Region VI (Western Visayas)'),
(8, '0700000000', 'Region VII (Central Visayas)'),
(9, '0800000000', 'Region VIII (Eastern Visayas)'),
(10, '0900000000', 'Region IX (Zamboanga Peninsula)'),
(11, '1000000000', 'Region X (Northern Mindanao)'),
(12, '1100000000', 'Region XI (Davao Region)'),
(13, '1200000000', 'Region XII (SOCCSKSARGEN)'),
(14, '1300000000', 'National Capital Region (NCR)'),
(15, '1400000000', 'Cordillera Administrative Region (CAR)'),
(16, '1600000000', 'Region XIII (Caraga)'),
(17, '1900000000', 'Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)');

-- --------------------------------------------------------

--
-- Table structure for table `shipping_region_rates`
--

CREATE TABLE `shipping_region_rates` (
  `region` enum('Luzon','VisMin') NOT NULL,
  `rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shipping_region_rates`
--

INSERT INTO `shipping_region_rates` (`region`, `rate`, `updated_at`) VALUES
('Luzon', 100.00, '2026-03-01 15:04:06'),
('VisMin', 200.00, '2026-03-01 15:04:06');

-- --------------------------------------------------------

--
-- Table structure for table `sites`
--

CREATE TABLE `sites` (
  `site_id` int(11) NOT NULL,
  `site_name` varchar(100) NOT NULL,
  `domain` varchar(150) NOT NULL,
  `short_bio` text NOT NULL,
  `description` text NOT NULL,
  `status` enum('active','suspended','deleted') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sites`
--

INSERT INTO `sites` (`site_id`, `site_name`, `domain`, `short_bio`, `description`, `status`, `created_at`) VALUES
(1, 'Bini', 'bini-website', 'BINI is an eight-member Filipino girl group formed by ABS-CBN’s Star Hunt Academy.', 'The group consists of Aiah, Colet, Maloi, Gwen, Stacey, Mikha, Jhoanna, and Sheena. Known for their synchronized choreography, polished vocals, and vibrant concepts, BINI blends K-pop-inspired training systems with distinctly Filipino language and cultural elements.\n\nTheir breakout tracks such as “Pantropiko” and “Salamin, Salamin” significantly expanded their audience both locally and internationally, positioning them as a major force in Southeast Asian pop music.', 'active', '2026-02-28 19:27:56'),
(2, 'blankpink', 'blankpink-website', '', '', 'active', '2026-02-28 22:23:14'),
(7, 'juan_direction', 'juan-website', 'test test test test test test test test test test test test test test test test test test', 'test test test test test test test test test test test test test test test test test test', 'active', '2026-03-02 16:45:42');

-- --------------------------------------------------------

--
-- Table structure for table `sites_setting`
--

CREATE TABLE `sites_setting` (
  `site_id` int(11) NOT NULL,
  `primary_color` varchar(50) DEFAULT NULL,
  `secondary_color` varchar(50) DEFAULT NULL,
  `accent_color` varchar(50) DEFAULT NULL,
  `button_style` varchar(50) DEFAULT NULL,
  `font_style` varchar(50) DEFAULT NULL,
  `nav_position` varchar(50) DEFAULT NULL,
  `logo` text DEFAULT NULL,
  `banner` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sites_setting`
--

INSERT INTO `sites_setting` (`site_id`, `primary_color`, `secondary_color`, `accent_color`, `button_style`, `font_style`, `nav_position`, `logo`, `banner`) VALUES
(1, '#ff70b8', '#f8c9c9', '#f9d7d7', '', 'Times New Roman', 'top', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1771947212/BINI_logo.svg_cmyyvy.png', 'https://www.youtube.com/watch?v=wufUX5P2Ds8&list=RDwufUX5P2Ds8&start_radio=1'),
(7, '#0f67f5', '#DEDEDE', '#28C745', 'square', 'Times New Roman', 'top', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772441142/websites/wy7ybfa2fectbxusicd3.webp', 'https://www.youtube.com/watch?v=ZFcWYt6-CyE&list=RDZFcWYt6-CyE&start_radio=1');

-- --------------------------------------------------------

--
-- Table structure for table `site_databases`
--

CREATE TABLE `site_databases` (
  `site_id` int(11) NOT NULL,
  `db_host` varchar(100) DEFAULT 'localhost',
  `db_name` varchar(100) NOT NULL,
  `db_user` varchar(100) NOT NULL,
  `db_password` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_databases`
--

INSERT INTO `site_databases` (`site_id`, `db_host`, `db_name`, `db_user`, `db_password`, `created_at`) VALUES
(7, 'localhost', 'juan-direction', 'root', '', '2026-03-02 16:45:42');

-- --------------------------------------------------------

--
-- Table structure for table `site_members`
--

CREATE TABLE `site_members` (
  `member_id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_profile` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_members`
--

INSERT INTO `site_members` (`member_id`, `site_id`, `name`, `role`, `description`, `image_profile`, `created_at`, `updated_at`) VALUES
(3, 7, 'miko', 'manager', 'pogi', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772441142/websites/members/ycvwvotftexafylx0wsz.jpg', '2026-03-02 08:45:42', '2026-03-02 08:45:42'),
(14, 1, 'Aiah', 'Main Rapper • Visual • Sub-Vocalist', 'Aiah is known for her charismatic stage presence and sharp rap delivery.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772447947/uploads/nfniuhyrh5b713jkhijl.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(15, 1, 'Gwen', 'Lead Vocalist • Lead Rapper', 'Gwen\'s versatility allows her to switch seamlessly between powerful vocals and rap verses.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772447987/uploads/yobjbve3bgonhdch0aul.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(16, 1, 'Maloi', 'Main Vocalist • Lead Dancer • Lead Rapper', 'Maloi\'s powerful voice and emotional delivery have captured the hearts of fans.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448030/uploads/yqz1ltnausasdszwgamq.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(17, 1, 'Colet', 'Main Vocalist', 'Colet\'s wide vocal range and stability make her one of the group\'s strongest singers.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448065/uploads/qcpfmge7yokapwscawqj.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(18, 1, 'Mikha', 'Main Rapper • Lead Dancer • Visual', 'Mikha\'s sharp dance moves and confident rap lines add edge to BINI\'s performances.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448096/uploads/r0qyueaczkln3q27wsvp.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(19, 1, 'Stacey', 'Lead Dancer • Sub Vocalist • Sub Rapper', 'Stacey brings energy and precision to every stage. Her bubbly personality off-stage balances her fierce performance persona.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448135/uploads/u1otcqhslebkqxqsg6ev.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(20, 1, 'Sheena', 'Main Dancer • Sub-Vocalist', 'Sheena\'s dance skills are top-notch, often leading rehearsals and creating freestyle pieces.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448172/uploads/p7seo7m3o8o6ailel5se.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11'),
(21, 1, 'Jhoanna', 'Leader • Lead Vocalist • Lead Rapper', 'As the leader, Jhoanna ensures the group stays united and focused.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448207/uploads/cqoiieemwfsubzdfjsmd.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11');

-- --------------------------------------------------------

--
-- Table structure for table `site_province_shipping_regions`
--

CREATE TABLE `site_province_shipping_regions` (
  `id` int(11) NOT NULL,
  `site_slug` varchar(120) NOT NULL,
  `province_name` varchar(120) NOT NULL,
  `shipping_region` enum('Luzon','VisMin') NOT NULL DEFAULT 'VisMin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_province_shipping_regions`
--

INSERT INTO `site_province_shipping_regions` (`id`, `site_slug`, `province_name`, `shipping_region`, `created_at`, `updated_at`) VALUES
(243, '__global__', 'Abra', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(244, '__global__', 'Agusan del Norte', 'VisMin', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(245, '__global__', 'Agusan del Sur', 'VisMin', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(246, '__global__', 'Apayao', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(247, '__global__', 'Aurora', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(248, '__global__', 'Bataan', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(249, '__global__', 'Benguet', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(250, '__global__', 'Bulacan', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(251, '__global__', 'Caloocan', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(252, '__global__', 'Dinagat Islands', 'VisMin', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(253, '__global__', 'Ifugao', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(254, '__global__', 'Kalinga', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(255, '__global__', 'Las Pinas', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(256, '__global__', 'Makati', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(257, '__global__', 'Malabon', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(258, '__global__', 'Mandaluyong', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(259, '__global__', 'Manila', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(260, '__global__', 'Marikina', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(261, '__global__', 'Mountain Province', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(262, '__global__', 'Muntinlupa', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(263, '__global__', 'Navotas', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(264, '__global__', 'Nueva Ecija', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(265, '__global__', 'Pampanga', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(266, '__global__', 'Paranaque', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(267, '__global__', 'Pasay', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(268, '__global__', 'Pasig', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(269, '__global__', 'Quezon City', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(270, '__global__', 'San Juan', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(271, '__global__', 'Surigao del Norte', 'VisMin', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(272, '__global__', 'Surigao del Sur', 'VisMin', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(273, '__global__', 'Taguig', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(274, '__global__', 'Tarlac', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(275, '__global__', 'Valenzuela', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21'),
(276, '__global__', 'Zambales', 'Luzon', '2026-03-02 10:47:21', '2026-03-02 10:47:21');

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `template_id` int(11) NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `site_setting_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `templates`
--

INSERT INTO `templates` (`template_id`, `template_name`, `site_setting_id`, `created_at`) VALUES
(1, 'Bini_Template', 1, '2026-02-28 11:27:15');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `community_suggestions`
--
ALTER TABLE `community_suggestions`
  ADD PRIMARY KEY (`suggestion_id`),
  ADD KEY `idx_suggestions_read_created` (`is_read`,`created_at`);

--
-- Indexes for table `platform_admins`
--
ALTER TABLE `platform_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_platform_admins_email` (`email`),
  ADD KEY `idx_otp_expiry` (`otp_expiry`);

--
-- Indexes for table `provinces`
--
ALTER TABLE `provinces`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prv_code` (`prv_code`),
  ADD KEY `idx_reg_code` (`reg_code`);

--
-- Indexes for table `regions`
--
ALTER TABLE `regions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reg_code` (`reg_code`);

--
-- Indexes for table `shipping_region_rates`
--
ALTER TABLE `shipping_region_rates`
  ADD PRIMARY KEY (`region`);

--
-- Indexes for table `sites`
--
ALTER TABLE `sites`
  ADD PRIMARY KEY (`site_id`),
  ADD UNIQUE KEY `domain` (`domain`);

--
-- Indexes for table `sites_setting`
--
ALTER TABLE `sites_setting`
  ADD PRIMARY KEY (`site_id`);

--
-- Indexes for table `site_databases`
--
ALTER TABLE `site_databases`
  ADD PRIMARY KEY (`site_id`);

--
-- Indexes for table `site_members`
--
ALTER TABLE `site_members`
  ADD PRIMARY KEY (`member_id`),
  ADD KEY `fk_site_members_site` (`site_id`);

--
-- Indexes for table `site_province_shipping_regions`
--
ALTER TABLE `site_province_shipping_regions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_site_province_region` (`site_slug`,`province_name`),
  ADD KEY `idx_site_slug` (`site_slug`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`template_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `community_suggestions`
--
ALTER TABLE `community_suggestions`
  MODIFY `suggestion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `platform_admins`
--
ALTER TABLE `platform_admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `provinces`
--
ALTER TABLE `provinces`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT for table `regions`
--
ALTER TABLE `regions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `sites`
--
ALTER TABLE `sites`
  MODIFY `site_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `site_members`
--
ALTER TABLE `site_members`
  MODIFY `member_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `site_province_shipping_regions`
--
ALTER TABLE `site_province_shipping_regions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=277;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `template_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `provinces`
--
ALTER TABLE `provinces`
  ADD CONSTRAINT `fk_province_region` FOREIGN KEY (`reg_code`) REFERENCES `regions` (`reg_code`) ON UPDATE CASCADE;

--
-- Constraints for table `sites_setting`
--
ALTER TABLE `sites_setting`
  ADD CONSTRAINT `sites_setting_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `sites` (`site_id`);

--
-- Constraints for table `site_databases`
--
ALTER TABLE `site_databases`
  ADD CONSTRAINT `site_databases_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `sites` (`site_id`) ON DELETE CASCADE;

--
-- Constraints for table `site_members`
--
ALTER TABLE `site_members`
  ADD CONSTRAINT `fk_site_members_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`site_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
