-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 03, 2026 at 09:17 PM
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
-- Database: `bini`
--

-- --------------------------------------------------------

--
-- Table structure for table `carts`
--

CREATE DATABASE IF NOT EXISTS `bini` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `bini`;


CREATE TABLE `carts` (
  `cart_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `carts`
--

INSERT INTO `carts` (`cart_id`, `user_id`, `community_id`, `created_at`) VALUES
(3, 7, 1, '2025-12-26 00:40:11'),
(4, 8, 1, '2026-01-08 12:37:59'),
(5, 9, 1, '2026-01-08 13:47:01'),
(6, 10, 1, '2026-01-30 01:46:14'),
(9, 20, 2, '2026-03-03 16:54:45');

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `item_id` int(11) NOT NULL,
  `cart_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cart_items`
--

INSERT INTO `cart_items` (`item_id`, `cart_id`, `variant_id`, `quantity`, `created_at`) VALUES
(6, 4, 1, 1, '2026-01-08 12:38:02'),
(17, 6, 7, 2, '2026-02-05 07:01:34'),
(24, 3, 10, 1, '2026-03-01 15:14:20'),
(25, 3, 1, 1, '2026-03-01 15:32:49'),
(27, 3, 11, 7, '2026-03-01 16:08:21');

-- --------------------------------------------------------

--
-- Table structure for table `collections`
--

CREATE TABLE `collections` (
  `collection_id` int(11) NOT NULL,
  `group_community_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `img_url` varchar(250) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `collections`
--

INSERT INTO `collections` (`collection_id`, `group_community_id`, `name`, `img_url`, `description`, `created_at`) VALUES
(1, 1, 'BiniVerse ', 'https://th.bing.com/th/id/OIP.zqP7PjZvldppMNNBP-D2AwHaHa?w=166&h=180&c=7&r=0&o=7&pid=1.7&rm=3', NULL, '2025-12-24 19:17:28'),
(3, 1, 'Binified', 'https://store.abs-cbn.com/cdn/shop/collections/BINIfied_Website_Thumbnail.jpg?v=1763106912&width=1500', 'test', '2026-01-12 09:52:31'),
(4, 2, 'test', 'test', 'test', '2026-03-04 00:37:35'),
(5, 2, 'test2', NULL, NULL, '2026-03-04 03:24:19');

-- --------------------------------------------------------

--
-- Table structure for table `collection_categories`
--

CREATE TABLE `collection_categories` (
  `category_id` int(11) NOT NULL,
  `collection_id` int(11) NOT NULL,
  `category_name` varchar(120) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `comment_id` int(11) NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `parent_comment_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`comment_id`, `post_id`, `user_id`, `content`, `parent_comment_id`, `created_at`, `community_id`) VALUES
(30, 79, 29, 'guys please like and share...', NULL, '2025-06-02 13:15:23', NULL),
(31, 79, 30, 'hi sis ganda mu', NULL, '2025-06-02 13:19:22', NULL),
(32, 80, 31, 'Wow', NULL, '2025-06-02 13:25:51', NULL),
(33, 79, 31, 'hihihi', NULL, '2025-06-02 13:26:09', NULL),
(34, 81, 31, 'ganda gurl', NULL, '2025-06-02 13:29:43', NULL),
(35, 91, 14, 'try', NULL, '2026-02-20 11:55:04', NULL),
(36, 91, 14, 'try', NULL, '2026-02-20 11:55:58', NULL),
(37, 91, 14, 'gana na ba?', NULL, '2026-02-20 11:56:57', NULL),
(38, 1, 14, 'try', NULL, '2026-02-20 11:57:17', NULL),
(39, 90, 14, 'kupal', NULL, '2026-02-20 11:57:33', NULL),
(40, 92, 14, 'yow', NULL, '2026-02-20 12:51:26', NULL),
(41, 92, 14, 'try nga', 40, '2026-02-20 12:51:36', NULL),
(42, 5, 7, 'asdakdjksahdjsa', NULL, '2026-03-02 12:17:06', NULL),
(43, NULL, 7, 'sdasdsadas', 2147483647, '2026-03-02 12:17:13', NULL),
(44, 111, 8, 'dkjskdfj', NULL, '2026-03-02 14:59:44', NULL),
(45, 115, 28, 'kmfkdfmd', NULL, '2026-03-04 02:01:32', 1),
(46, 115, 28, 'sdasd', 45, '2026-03-04 02:01:39', 1),
(47, 112, 7, 'dfsdfs', NULL, '2026-03-04 02:13:02', 1),
(48, 6, 7, 'sadsadas', NULL, '2026-03-04 02:15:52', 1),
(49, NULL, 7, 'adasd', 2147483647, '2026-03-04 02:15:58', 1);

-- --------------------------------------------------------

--
-- Table structure for table `communities`
--

CREATE TABLE `communities` (
  `community_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `communities`
--

INSERT INTO `communities` (`community_id`, `name`, `description`, `created_at`) VALUES
(1, 'bini', 'BINI is an 8-member Filipino girl group formed by ABS-CBN Star Hunt Academy. Known for their powerful vocals, synchronized choreography, and inspiring message of empowerment.', '2025-12-24 19:14:00'),
(2, 'juan', 'test', '2026-03-04 00:20:36');

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
-- Table structure for table `community_table`
--

CREATE TABLE `community_table` (
  `community_id` int(11) NOT NULL,
  `site_name` varchar(150) NOT NULL,
  `domain` varchar(180) NOT NULL,
  `status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_table`
--

INSERT INTO `community_table` (`community_id`, `site_name`, `domain`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Bini', 'bini-website', 'active', '2026-03-03 16:35:08', '2026-03-03 16:35:08'),
(2, 'juan_direction', 'juan-website', 'active', '2026-03-03 16:36:06', '2026-03-03 20:14:36');

-- --------------------------------------------------------

--
-- Table structure for table `community_threads`
--

CREATE TABLE `community_threads` (
  `id` int(11) NOT NULL,
  `community_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `venue` text NOT NULL,
  `date` date NOT NULL,
  `author` varchar(50) NOT NULL,
  `is_pinned` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_threads`
--

INSERT INTO `community_threads` (`id`, `community_id`, `title`, `venue`, `date`, `author`, `is_pinned`, `created_at`, `updated_at`) VALUES
(1, NULL, 'BINI Cosmetics Livestream', 'BINI.Global Livestream', '2026-06-11', 'Admin', 0, '2026-02-18 19:52:07', '2026-03-02 12:09:29'),
(3, NULL, 'Enervon Z+ X BINI', 'Livestream', '2026-02-26', 'Admin', 0, '2026-02-18 19:52:51', '2026-03-02 12:09:29'),
(4, NULL, 'Enervon Z+ X BINI', 'Livestream', '2026-02-26', 'Admin', 0, '2026-02-18 19:52:53', '2026-03-02 12:10:40'),
(6, 1, 'Complete the BINI FLAMES experience with the newest merch!', '’t miss your chance to own the limited-edition BINI FLAMES Shirt. BINI Global Members can also avail the BINI Global-exclusive FLAMES Lyrics Shirt.\n\nGet yours now and keep the FLAMES era alive!', '2026-03-11', 'Admin', 1, '2026-03-02 13:38:55', '2026-03-04 00:18:40');

-- --------------------------------------------------------

--
-- Table structure for table `daily_revenue`
--

CREATE TABLE `daily_revenue` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `time` time DEFAULT NULL,
  `total_amount` float(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `daily_revenue`
--

INSERT INTO `daily_revenue` (`id`, `order_id`, `date`, `time`, `total_amount`, `created_at`) VALUES
(0, 9, '2026-03-02', '00:45:55', 200.00, '2026-03-01 16:45:55'),
(0, 8, '2026-03-02', '12:04:50', 300.00, '2026-03-02 04:04:50'),
(0, 11, '2026-03-04', '02:56:45', 200.00, '2026-03-03 18:56:45'),
(0, 12, '2026-03-04', '03:35:56', 600.00, '2026-03-03 19:35:56');

-- --------------------------------------------------------

--
-- Table structure for table `discography`
--

CREATE TABLE `discography` (
  `album_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `songs` int(100) NOT NULL,
  `year` year(4) NOT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `album_link` text NOT NULL,
  `description` text DEFAULT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `discography`
--

INSERT INTO `discography` (`album_id`, `title`, `songs`, `year`, `cover_image`, `album_link`, `description`, `community_id`) VALUES
(4, 'Flames', 7, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772443809/uploads/mrchkjei0tj6mfqxdum9.png', 'https://open.spotify.com/album/42s2X3WQppxdHafUT2dfmF?si=1&nd=1&dlsi=9b6451ab7eb84595', NULL, 1),
(5, 'First Luv', 1, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772443948/uploads/hzwflhcbuvoqb532yzw8.png', 'https://open.spotify.com/album/6hR079yVpoqUG4sOswANT4?si=0zC90Ht_QYmXqpseDZ54Yw&nd=1&dlsi=dffd42571b1842e7', NULL, 1),
(6, 'Shagidi', 1, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444079/uploads/amwk3ojmmp33c9hq9blp.png', 'https://open.spotify.com/album/14xJ5Qg9sEbCJmg2vBRCUZ?si=PwivRmyaTzG1hoDqCSUBpw&nd=1&dlsi=4359504da9d849ee', NULL, 1),
(7, 'Blink Twice', 1, '2015', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444186/uploads/v0ca82ede66bbfh0emih.png', 'https://open.spotify.com/album/29rcLP1Uni7elTtxuiXF1J?si=1&nd=1&dlsi=542a4f7303764535', NULL, 1),
(8, 'Cherry on top', 1, '2024', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444279/uploads/uxqpbnon3sn8hrai1koh.png', 'https://open.spotify.com/album/3ZIjUhwlei1sT2yetvypvJ?si=T8mpLAroQpSfJqeoBBp9Ew&nd=1&dlsi=d9ccbcb175cb4d0f', NULL, 1),
(9, 'Talaarawan', 6, '2024', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444388/uploads/wvskulgfuajgleflki4b.png', 'https://open.spotify.com/album/2eT1XApzS0GmkJLMlCBdVv?si=1&nd=1&dlsi=2e4b8be088a24ef8', NULL, 1),
(10, 'Feel Good', 7, '2022', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444559/uploads/jxdatozr2zkeirrfyysa.png', 'https://open.spotify.com/album/7H64wogfyQUcRqFZFbMV9S?si=1&nd=1&dlsi=6aae2534c88542b3', NULL, 1),
(11, 'Born to win', 7, '2021', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444649/uploads/gdlwwz0nvhwh5dvtzc61.png', 'https://open.spotify.com/album/28rgW6IXDsrk4YtTcFtGGK?si=1&nd=1&dlsi=e0494459ea1c4242', NULL, 1),
(12, 'Pantropiko', 1, '2023', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444748/uploads/ct7rk0mpwa9m0bwl9xoi.png', 'https://open.spotify.com/album/3NYOeU6Uwj2FP1Zz1rWVz8?si=1&nd=1&dlsi=d5617df4860e4716', NULL, 2),
(16, 'AAAAAAAAAAAAAAAAAAA', 12, '2021', 'http://localhost:5173/fanhub/juan-website#music', 'http://localhost:5173/fanhub/juan-website#music', 'test', 2);

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `event_id` int(11) NOT NULL,
  `ticket_link` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`event_id`, `ticket_link`, `image_url`, `community_id`) VALUES
(1, 'https://www.ticketnet.com.ph/event-detail/BINIfied', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448361/uploads/lpvxoohb6rwiosuhtlpp.png', NULL),
(2, 'https://www.ticketnet.com.ph/event-detail/BINIverse-The-First-Solo-Concert', 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407990/1000010193_ueru7w.png', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `follows`
--

CREATE TABLE `follows` (
  `follow_id` int(11) NOT NULL,
  `follower_id` int(11) DEFAULT NULL,
  `followed_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `follows`
--

INSERT INTO `follows` (`follow_id`, `follower_id`, `followed_id`, `created_at`, `community_id`) VALUES
(58, 28, 9, '2026-03-04 02:06:10', NULL),
(59, 7, 28, '2026-03-04 02:12:12', 1),
(60, 7, 9, '2026-03-04 02:12:53', 1),
(61, 7, 8, '2026-03-04 02:14:36', 1),
(62, 9, 7, '2026-03-04 02:47:48', 1);

-- --------------------------------------------------------

--
-- Table structure for table `hashtags`
--

CREATE TABLE `hashtags` (
  `hashtag_id` int(11) NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `tag` varchar(255) NOT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `hashtags`
--

INSERT INTO `hashtags` (`hashtag_id`, `post_id`, `tag`, `community_id`) VALUES
(1, 100, '#hello_world', NULL),
(2, 110, '#gago', NULL),
(3, 115, '#good', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE `likes` (
  `like_id` int(11) NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `like_type` varchar(20) NOT NULL DEFAULT 'post',
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `likes`
--

INSERT INTO `likes` (`like_id`, `post_id`, `user_id`, `created_at`, `like_type`, `community_id`) VALUES
(51, 115, 28, '2026-03-04 02:01:27', 'post', 1),
(52, 112, 7, '2026-03-04 02:12:56', 'post', 1),
(53, 120, 9, '2026-03-04 02:30:25', 'post', 1);

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`message_id`, `sender_id`, `receiver_id`, `content`, `created_at`, `is_read`, `read_at`, `community_id`) VALUES
(1, 32, 31, 'hi', '2025-06-02 17:26:28', 0, NULL, NULL),
(2, 32, 31, 'hi', '2025-06-02 18:00:37', 0, NULL, NULL),
(3, 31, 32, 'bakit', '2025-06-02 18:16:14', 0, NULL, NULL),
(4, 32, 31, 'oy', '2025-06-02 18:37:18', 0, NULL, NULL),
(5, 31, 32, 'oy', '2025-06-02 18:37:40', 0, NULL, NULL),
(6, 32, 31, 'hi', '2025-06-02 18:42:37', 0, NULL, NULL),
(7, 31, 32, 'oh', '2025-06-02 18:43:00', 0, NULL, NULL),
(8, 32, 31, 'ml', '2025-06-02 19:03:40', 0, NULL, NULL),
(9, 31, 32, 'pogi mo jamin pa kiss', '2025-06-02 19:12:09', 0, NULL, NULL),
(10, 34, 32, 'pre?', '2025-06-02 19:21:32', 0, NULL, NULL),
(11, 32, 31, 'pass am taken', '2025-06-02 19:27:13', 0, NULL, NULL),
(12, 33, 32, 'pre', '2025-06-02 23:34:35', 0, NULL, NULL),
(13, 32, 34, 'bakit pre', '2025-06-02 23:44:28', 0, NULL, NULL),
(14, 32, 34, 'pre', '2025-06-03 09:42:12', 0, NULL, NULL),
(15, 32, 34, 'labyou papa', '2025-06-03 09:42:16', 0, NULL, NULL),
(16, 32, 33, 'ow', '2025-06-05 16:05:57', 0, NULL, NULL),
(17, 34, 32, 'PRE CRUSH KO SI JUSTINE', '2025-06-05 20:42:09', 0, NULL, NULL),
(18, 37, 39, 'hi', '2025-10-29 19:49:15', 1, '2025-11-18 00:22:43', NULL),
(19, 39, 37, 'hi po', '2025-10-29 19:50:40', 1, '2025-11-14 05:18:08', NULL),
(20, 39, 37, 'online nako', '2025-10-30 06:13:20', 1, '2025-11-14 05:18:08', NULL),
(21, 37, 39, 'sakin offline parin hahaha', '2025-10-30 06:13:46', 1, '2025-11-18 00:22:43', NULL),
(22, 37, 39, 'sakin offline parin hahaha', '2025-10-30 06:13:46', 1, '2025-11-18 00:22:43', NULL),
(23, 39, 37, 'online naba', '2025-10-30 06:43:12', 1, '2025-11-14 05:18:08', NULL),
(24, 37, 39, 'hndi pa', '2025-10-30 06:43:24', 1, '2025-11-18 00:22:43', NULL),
(25, 39, 37, 'oka na?', '2025-10-30 06:45:04', 1, '2025-11-14 05:18:08', NULL),
(26, 37, 39, 'hndi pa offline parin', '2025-10-30 06:45:19', 1, '2025-11-18 00:22:43', NULL),
(27, 39, 37, 'test', '2025-10-30 06:48:40', 1, '2025-11-14 05:18:08', NULL),
(28, 37, 39, 'test', '2025-10-30 06:48:52', 1, '2025-11-18 00:22:43', NULL),
(29, 39, 37, 'testing online c123', '2025-10-30 06:59:24', 1, '2025-11-14 05:18:08', NULL),
(30, 37, 39, 'offline parin hahaha', '2025-10-30 06:59:38', 1, '2025-11-18 00:22:43', NULL),
(31, 37, 39, 'ahahaha', '2025-10-30 07:04:09', 1, '2025-11-18 00:22:43', NULL),
(32, 37, 39, 'hahaha', '2025-10-30 07:08:48', 1, '2025-11-18 00:22:43', NULL),
(33, 39, 37, 'hahahaha', '2025-10-30 07:09:05', 1, '2025-11-14 05:18:08', NULL),
(34, 39, 37, 'teswt', '2025-10-30 07:11:28', 1, '2025-11-14 05:18:08', NULL),
(35, 37, 39, 'bat undefined?', '2025-10-30 07:12:05', 1, '2025-11-18 00:22:43', NULL),
(36, 39, 37, 'ewan ko nga ewe', '2025-10-30 07:12:21', 1, '2025-11-14 05:18:08', NULL),
(37, 37, 39, 'nye', '2025-10-30 07:12:52', 1, '2025-11-18 00:22:43', NULL),
(38, 39, 37, 'sana ma online haha', '2025-10-30 07:33:04', 1, '2025-11-14 05:18:08', NULL),
(39, 37, 39, 'offline parin hahaha', '2025-10-30 07:33:15', 1, '2025-11-18 00:22:43', NULL),
(40, 37, 39, 'off parin', '2025-10-30 07:33:30', 1, '2025-11-18 00:22:43', NULL),
(41, 39, 37, 'kaya nga ee', '2025-10-30 07:33:40', 1, '2025-11-14 05:18:08', NULL),
(42, 37, 39, 'pero sa console online', '2025-10-30 07:34:38', 1, '2025-11-18 00:22:43', NULL),
(43, 39, 37, 'gara nyan hahaha', '2025-10-30 07:34:56', 1, '2025-11-14 05:18:08', NULL),
(44, 37, 39, 'hahaha', '2025-10-30 07:35:20', 1, '2025-11-18 00:22:43', NULL),
(45, 39, 37, 'awit', '2025-10-30 07:36:11', 1, '2025-11-14 05:18:08', NULL),
(46, 39, 37, 'off parin?', '2025-10-30 07:59:25', 1, '2025-11-14 05:18:08', NULL),
(47, 37, 39, 'oo ee', '2025-10-30 07:59:40', 1, '2025-11-18 00:22:43', NULL),
(48, 37, 39, 'balita', '2025-10-30 08:32:09', 1, '2025-11-18 00:22:43', NULL),
(49, 37, 39, 'uy', '2025-10-30 08:39:25', 1, '2025-11-18 00:22:43', NULL),
(50, 39, 37, 'sorry hahaha wal parin', '2025-10-30 08:39:51', 1, '2025-11-14 05:18:08', NULL),
(51, 37, 39, 'gagi working na kulay green na hahaha', '2025-10-30 08:40:32', 1, '2025-11-18 00:22:43', NULL),
(52, 37, 39, 'back to work hahah', '2025-10-30 13:59:19', 1, '2025-11-18 00:22:43', NULL),
(53, 39, 37, 'okie hahahah', '2025-10-30 13:59:39', 1, '2025-11-14 05:18:08', NULL),
(54, 39, 37, 'sup?', '2025-10-30 14:08:23', 1, '2025-11-14 05:18:08', NULL),
(55, 37, 39, 'wait', '2025-10-30 14:08:34', 1, '2025-11-18 00:22:43', NULL),
(56, 39, 37, 'test123', '2025-10-30 14:12:39', 1, '2025-11-14 05:18:08', NULL),
(57, 39, 37, 'sup sun?', '2025-10-30 14:50:48', 1, '2025-11-14 05:18:08', NULL),
(58, 39, 37, 'sup sun?', '2025-10-30 14:50:48', 1, '2025-11-14 05:18:08', NULL),
(59, 37, 39, 'sup nik', '2025-10-30 14:51:04', 1, '2025-11-18 00:22:43', NULL),
(60, 39, 37, 'sup niko', '2025-10-30 15:10:34', 1, '2025-11-14 05:18:08', NULL),
(61, 37, 39, 'goodeve', '2025-10-30 20:42:36', 1, '2025-11-18 00:22:43', NULL),
(62, 39, 37, 'goodeve din', '2025-10-30 20:43:26', 1, '2025-11-14 05:18:08', NULL),
(63, 37, 39, 'typing...', '2025-10-30 20:45:44', 1, '2025-11-18 00:22:43', NULL),
(64, 39, 37, 'test typing', '2025-10-30 20:46:38', 1, '2025-11-14 05:18:08', NULL),
(65, 37, 39, 'diko nakikita yung 3dots hahah', '2025-10-30 20:47:07', 1, '2025-11-18 00:22:43', NULL),
(66, 39, 37, 'nye haha', '2025-10-30 20:48:07', 1, '2025-11-14 05:18:08', NULL),
(67, 37, 39, 'eto try natin console', '2025-10-30 20:59:44', 1, '2025-11-18 00:22:43', NULL),
(68, 39, 37, 'gesi gesi', '2025-10-30 20:59:58', 1, '2025-11-14 05:18:08', NULL),
(69, 39, 37, 'testing testing', '2025-10-30 21:15:02', 1, '2025-11-14 05:18:08', NULL),
(70, 37, 39, 'alaws naman hahah', '2025-10-30 21:15:21', 1, '2025-11-18 00:22:43', NULL),
(71, 37, 39, 'fvsvs', '2025-10-30 21:36:18', 1, '2025-11-18 00:22:43', NULL),
(72, 37, 39, 'gumana na hahaha ayos', '2025-10-30 21:40:09', 1, '2025-11-18 00:22:43', NULL),
(73, 39, 37, 'hahaha oo nga', '2025-10-30 21:40:25', 1, '2025-11-14 05:18:08', NULL),
(74, 37, 39, 'testing 3dots bouncing', '2025-10-30 22:16:40', 1, '2025-11-18 00:22:43', NULL),
(75, 39, 37, 'wala sa labas ng profile hahah', '2025-10-30 22:16:59', 1, '2025-11-14 05:18:08', NULL),
(76, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43', NULL),
(77, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43', NULL),
(78, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43', NULL),
(79, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43', NULL),
(80, 39, 37, 'idont kniw hahahaha', '2025-10-30 22:21:30', 1, '2025-11-14 05:18:08', NULL),
(81, 37, 39, 'goodmorning', '2025-10-31 06:20:31', 1, '2025-11-18 00:22:43', NULL),
(82, 39, 37, 'goodmorning', '2025-10-31 06:20:43', 1, '2025-11-14 05:18:08', NULL),
(83, 39, 37, 'test123', '2025-10-31 06:51:50', 1, '2025-11-14 05:18:08', NULL),
(84, 37, 39, 'okie okei sana gumana', '2025-10-31 06:52:13', 1, '2025-11-18 00:22:43', NULL),
(85, 39, 37, 'gumana na hahah thankyou Lord', '2025-10-31 06:52:40', 1, '2025-11-14 05:18:08', NULL),
(86, 37, 39, 'yun sa wakas kaso naka invalidate date hahah may error na aayusin nanaman hahaha', '2025-10-31 06:53:29', 1, '2025-11-18 00:22:43', NULL),
(87, 37, 39, 'timestamp test', '2025-10-31 07:08:40', 1, '2025-11-18 00:22:43', NULL),
(88, 39, 37, 'oka na hahaha di na invalid date sa wakas', '2025-10-31 07:09:06', 1, '2025-11-14 05:18:08', NULL),
(89, 37, 39, 'wait a minute haha', '2025-10-31 07:09:31', 1, '2025-11-18 00:22:43', NULL),
(90, 39, 37, 'bakit', '2025-10-31 07:09:39', 1, '2025-11-14 05:18:08', NULL),
(91, 39, 37, 'test123', '2025-10-31 07:10:15', 1, '2025-11-14 05:18:08', NULL),
(92, 37, 39, 'test123', '2025-10-31 07:10:23', 1, '2025-11-18 00:22:43', NULL),
(93, 37, 39, 'hahaha ang kulet', '2025-10-31 07:10:56', 1, '2025-11-18 00:22:43', NULL),
(94, 37, 39, 'umay kala ko ok na', '2025-10-31 07:11:39', 1, '2025-11-18 00:22:43', NULL),
(95, 39, 37, 'nyeknyek', '2025-10-31 07:11:50', 1, '2025-11-14 05:18:08', NULL),
(96, 39, 37, 'testing', '2025-10-31 07:24:46', 1, '2025-11-14 05:18:08', NULL),
(97, 37, 39, 'niloloko tyo ng gawa natin hahah', '2025-10-31 07:25:13', 1, '2025-11-18 00:22:43', NULL),
(98, 39, 37, 'kaya nga haha', '2025-10-31 07:25:53', 1, '2025-11-14 05:18:08', NULL),
(99, 39, 37, 'sana gumana', '2025-10-31 07:34:45', 1, '2025-11-14 05:18:08', NULL),
(100, 37, 39, 'ok na gumana na sa waakas', '2025-10-31 07:34:58', 1, '2025-11-18 00:22:43', NULL),
(101, 37, 39, 'umay', '2025-10-31 07:35:32', 1, '2025-11-18 00:22:43', NULL),
(102, 39, 37, 'umay', '2025-10-31 07:35:42', 1, '2025-11-14 05:18:08', NULL),
(103, 37, 39, 'haysst', '2025-10-31 07:36:35', 1, '2025-11-18 00:22:43', NULL),
(104, 39, 37, 'huhu', '2025-10-31 07:37:00', 1, '2025-11-14 05:18:08', NULL),
(105, 37, 39, 'haha', '2025-10-31 07:42:20', 1, '2025-11-18 00:22:43', NULL),
(106, 39, 37, 'huhu', '2025-10-31 07:42:29', 1, '2025-11-14 05:18:08', NULL),
(107, 37, 39, 'hahah', '2025-10-31 07:42:40', 1, '2025-11-18 00:22:43', NULL),
(108, 37, 39, 'test', '2025-10-31 07:45:18', 1, '2025-11-18 00:22:43', NULL),
(109, 39, 37, 'test', '2025-10-31 07:45:28', 1, '2025-11-14 05:18:08', NULL),
(110, 37, 39, 'ee', '2025-10-31 07:45:38', 1, '2025-11-18 00:22:43', NULL),
(111, 39, 37, 'eee', '2025-10-31 07:45:44', 1, '2025-11-14 05:18:08', NULL),
(112, 37, 39, 'gulo ni gpt', '2025-10-31 08:08:13', 1, '2025-11-18 00:22:43', NULL),
(113, 39, 37, 'kayan ga ee kakabaliw', '2025-10-31 08:08:24', 1, '2025-11-14 05:18:08', NULL),
(114, 37, 39, 'testing', '2025-10-31 09:37:18', 1, '2025-11-18 00:22:43', NULL),
(115, 39, 37, 'ok naman lahat sa ngaun hahah', '2025-10-31 09:37:30', 1, '2025-11-14 05:18:08', NULL),
(116, 37, 39, 'yung invalid date parin pero mabuti naman maayos na structure ng spa', '2025-10-31 09:37:54', 1, '2025-11-18 00:22:43', NULL),
(117, 37, 39, 'testt', '2025-10-31 11:08:26', 1, '2025-11-18 00:22:43', NULL),
(118, 37, 39, 'dcd', '2025-10-31 13:20:18', 1, '2025-11-18 00:22:43', NULL),
(119, 39, 37, 'testing ulit hahah', '2025-10-31 14:22:45', 1, '2025-11-14 05:18:08', NULL),
(120, 37, 39, 'pagod nako', '2025-10-31 17:15:51', 1, '2025-11-18 00:22:43', NULL),
(121, 39, 37, 'same', '2025-10-31 17:16:01', 1, '2025-11-14 05:18:08', NULL),
(122, 39, 37, 'testing online 12', '2025-10-31 17:44:40', 1, '2025-11-14 05:18:08', NULL),
(123, 37, 39, 'wala parin', '2025-10-31 17:44:53', 1, '2025-11-18 00:22:43', NULL),
(124, 37, 39, 'borat', '2025-10-31 20:18:38', 1, '2025-11-18 00:22:43', NULL),
(125, 37, 39, 'ggbfdf', '2025-10-31 20:19:19', 1, '2025-11-18 00:22:43', NULL),
(126, 37, 39, 'goodmorning', '2025-11-01 08:15:48', 1, '2025-11-18 00:22:43', NULL),
(127, 39, 37, 'offline ka hhahaah', '2025-11-01 08:15:58', 1, '2025-11-14 05:18:08', NULL),
(128, 39, 37, 'online check', '2025-11-01 10:44:51', 1, '2025-11-14 05:18:08', NULL),
(129, 37, 39, 'wala offline parin hahah', '2025-11-01 10:45:00', 1, '2025-11-18 00:22:43', NULL),
(130, 37, 39, 'testing testing', '2025-11-02 05:12:40', 1, '2025-11-18 00:22:43', NULL),
(131, 39, 37, 'okie oike', '2025-11-02 05:12:47', 1, '2025-11-14 05:18:08', NULL),
(132, 37, 39, 'green', '2025-11-02 05:59:52', 1, '2025-11-18 00:22:43', NULL),
(133, 39, 37, 'gray', '2025-11-02 05:59:58', 1, '2025-11-14 05:18:08', NULL),
(134, 39, 37, 'ee', '2025-11-02 06:00:38', 1, '2025-11-14 05:18:08', NULL),
(135, 39, 37, 'testing', '2025-11-02 06:54:19', 1, '2025-11-14 05:18:08', NULL),
(136, 37, 39, 'nawala naman profile mo haha', '2025-11-02 06:54:30', 1, '2025-11-18 00:22:43', NULL),
(137, 37, 39, 'milo testing', '2025-11-02 06:58:49', 1, '2025-11-18 00:22:43', NULL),
(138, 39, 37, 'sira pa', '2025-11-02 06:58:57', 1, '2025-11-14 05:18:08', NULL),
(139, 39, 37, 'tisting', '2025-11-02 07:08:23', 1, '2025-11-14 05:18:08', NULL),
(140, 39, 37, 'dsvvs', '2025-11-02 07:09:22', 1, '2025-11-14 05:18:08', NULL),
(141, 39, 37, 'vbr', '2025-11-02 07:09:41', 1, '2025-11-14 05:18:08', NULL),
(142, 37, 39, 'f', '2025-11-02 07:15:53', 1, '2025-11-18 00:22:43', NULL),
(143, 37, 39, 'u', '2025-11-02 07:15:58', 1, '2025-11-18 00:22:43', NULL),
(144, 39, 37, 'u', '2025-11-02 07:16:02', 1, '2025-11-14 05:18:08', NULL),
(145, 39, 37, 'f', '2025-11-02 07:16:05', 1, '2025-11-14 05:18:08', NULL),
(146, 39, 37, 'bg', '2025-11-02 07:17:56', 1, '2025-11-14 05:18:08', NULL),
(147, 37, 39, 'vf', '2025-11-02 07:18:00', 1, '2025-11-18 00:22:43', NULL),
(148, 37, 39, 'brrr', '2025-11-02 07:33:10', 1, '2025-11-18 00:22:43', NULL),
(149, 39, 37, 'ggg', '2025-11-02 07:33:31', 1, '2025-11-14 05:18:08', NULL),
(150, 39, 37, 'gsd', '2025-11-02 07:37:05', 1, '2025-11-14 05:18:08', NULL),
(151, 37, 39, 'dasddd', '2025-11-02 07:37:19', 1, '2025-11-18 00:22:43', NULL),
(152, 37, 39, 'ddddd', '2025-11-02 07:37:38', 1, '2025-11-18 00:22:43', NULL),
(153, 39, 37, 'bdfvdccasa', '2025-11-02 07:37:47', 1, '2025-11-14 05:18:08', NULL),
(154, 37, 39, 'ddd', '2025-11-02 07:42:50', 1, '2025-11-18 00:22:43', NULL),
(155, 39, 37, 'ss', '2025-11-02 07:42:54', 1, '2025-11-14 05:18:08', NULL),
(156, 39, 37, 'fff', '2025-11-02 08:41:22', 1, '2025-11-14 05:18:08', NULL),
(157, 39, 37, 'www', '2025-11-02 08:48:14', 1, '2025-11-14 05:18:08', NULL),
(158, 37, 39, 'www', '2025-11-02 08:48:17', 1, '2025-11-18 00:22:43', NULL),
(159, 39, 37, 'qqqq', '2025-11-02 08:48:56', 1, '2025-11-14 05:18:08', NULL),
(160, 37, 39, 'ttttt', '2025-11-02 08:49:03', 1, '2025-11-18 00:22:43', NULL),
(161, 39, 37, 'fff', '2025-11-02 09:16:54', 1, '2025-11-14 05:18:08', NULL),
(162, 37, 39, 'ahaha', '2025-11-02 11:02:36', 1, '2025-11-18 00:22:43', NULL),
(163, 39, 37, 'ahahaha', '2025-11-02 11:02:44', 1, '2025-11-14 05:18:08', NULL),
(164, 37, 40, 'hi mr inspector', '2025-11-02 13:57:41', 1, '2025-11-14 04:45:26', NULL),
(165, 40, 37, 'hilo', '2025-11-02 13:58:07', 1, '2025-11-14 02:02:56', NULL),
(166, 37, 39, 'push ko na to haha', '2025-11-02 18:36:01', 1, '2025-11-18 00:22:43', NULL),
(167, 39, 37, 'sge sge', '2025-11-02 18:36:15', 1, '2025-11-14 05:18:08', NULL),
(168, 37, 39, 'ang cute prehahahah', '2025-11-03 17:44:42', 1, '2025-11-18 00:22:43', NULL),
(169, 39, 37, 'hahah oo kaso wala yung typing indicator', '2025-11-03 17:44:58', 1, '2025-11-14 05:18:08', NULL),
(170, 37, 39, 'pre haha anyare?', '2025-11-03 18:07:43', 1, '2025-11-18 00:22:43', NULL),
(171, 39, 37, 'idk haha', '2025-11-03 18:07:51', 1, '2025-11-14 05:18:08', NULL),
(172, 37, 39, 'vvvfvfvscxxxxxxxxx', '2025-11-04 09:41:38', 1, '2025-11-18 00:22:43', NULL),
(173, 39, 37, 'ok na ahahahahahahahahahahaha', '2025-11-04 09:59:42', 1, '2025-11-14 05:18:08', NULL),
(174, 39, 37, 'testing', '2025-11-04 10:05:30', 1, '2025-11-14 05:18:08', NULL),
(175, 37, 39, 'wala nawala yung bouncing hahah', '2025-11-04 10:05:45', 1, '2025-11-18 00:22:43', NULL),
(176, 37, 39, 'sssssss', '2025-11-04 12:40:42', 1, '2025-11-18 00:22:43', NULL),
(177, 39, 37, 'cvdvccs', '2025-11-04 12:48:16', 1, '2025-11-14 05:18:08', NULL),
(178, 39, 37, 'saana', '2025-11-04 12:50:25', 1, '2025-11-14 05:18:08', NULL),
(179, 39, 37, '22', '2025-11-04 18:50:49', 1, '2025-11-14 05:18:08', NULL),
(180, 37, 39, '2323232323', '2025-11-04 19:12:59', 1, '2025-11-18 00:22:43', NULL),
(181, 39, 37, 'wala pa yung 3dot bouncing man', '2025-11-04 19:13:26', 1, '2025-11-14 05:18:08', NULL),
(182, 37, 39, 'wala parin', '2025-11-04 19:30:08', 1, '2025-11-18 00:22:43', NULL),
(183, 39, 37, 'bakit hahaha', '2025-11-04 19:30:15', 1, '2025-11-14 05:18:08', NULL),
(184, 39, 37, 'gumana ka haha wala parin', '2025-11-04 19:41:07', 1, '2025-11-14 05:18:08', NULL),
(185, 37, 39, 'tert', '2025-11-04 19:42:42', 1, '2025-11-18 00:22:43', NULL),
(186, 39, 37, 'dddddds', '2025-11-04 19:53:53', 1, '2025-11-14 05:18:08', NULL),
(187, 39, 37, 'ww', '2025-11-05 05:11:16', 1, '2025-11-14 05:18:08', NULL),
(188, 37, 39, 'eee', '2025-11-05 05:11:21', 1, '2025-11-18 00:22:43', NULL),
(189, 39, 37, 'dcdcsd', '2025-11-05 05:24:26', 1, '2025-11-14 05:18:08', NULL),
(190, 39, 37, 'wow ite wroking now hahaha', '2025-11-05 05:28:48', 1, '2025-11-14 05:18:08', NULL),
(191, 37, 39, 'isee  i see', '2025-11-05 05:28:58', 1, '2025-11-18 00:22:43', NULL),
(192, 39, 37, 'perfect', '2025-11-05 05:30:04', 1, '2025-11-14 05:18:08', NULL),
(193, 37, 39, 'bat doble haha', '2025-11-05 05:30:14', 1, '2025-11-18 00:22:43', NULL),
(194, 39, 37, 'bug siguro na refresh ko naman hahaha', '2025-11-05 05:30:47', 1, '2025-11-14 05:18:08', NULL),
(195, 39, 37, 'goodmorning', '2025-11-05 05:59:05', 1, '2025-11-14 05:18:08', NULL),
(196, 37, 39, 'duplicate test 123', '2025-11-05 06:25:37', 1, '2025-11-18 00:22:43', NULL),
(197, 39, 37, '332221', '2025-11-05 06:35:37', 1, '2025-11-14 05:18:08', NULL),
(198, 37, 39, '11122233', '2025-11-05 06:50:36', 1, '2025-11-18 00:22:43', NULL),
(199, 37, 39, '22222', '2025-11-05 07:08:05', 1, '2025-11-18 00:22:43', NULL),
(200, 39, 37, '33333', '2025-11-05 07:08:15', 1, '2025-11-14 05:18:08', NULL),
(201, 37, 39, '111111', '2025-11-05 07:08:20', 1, '2025-11-18 00:22:43', NULL),
(202, 39, 37, '222222', '2025-11-09 10:38:43', 1, '2025-11-14 05:18:08', NULL),
(203, 37, 39, '3333', '2025-11-09 10:38:48', 1, '2025-11-18 00:22:43', NULL),
(204, 39, 37, 'goodmorning', '2025-11-10 08:17:06', 1, '2025-11-14 05:18:08', NULL),
(205, 37, 39, 'goodmorning', '2025-11-10 08:17:18', 1, '2025-11-18 00:22:43', NULL),
(206, 39, 37, 'huhhaha', '2025-11-10 09:43:53', 1, '2025-11-14 05:18:08', NULL),
(207, 37, 39, 'huhuahah', '2025-11-10 09:44:00', 1, '2025-11-18 00:22:43', NULL),
(208, 37, 39, 'ok na hahha', '2025-11-10 09:49:38', 1, '2025-11-18 00:22:43', NULL),
(209, 39, 37, 'goodmorning', '2025-11-11 10:26:48', 1, '2025-11-14 05:18:08', NULL),
(210, 39, 37, 'hello', '2025-11-11 10:26:57', 1, '2025-11-14 05:18:08', NULL),
(211, 40, 37, 'sup?', '2025-11-12 17:25:00', 1, '2025-11-14 02:02:56', NULL),
(212, 37, 40, 'sup?', '2025-11-12 17:25:33', 1, '2025-11-14 04:45:26', NULL),
(213, 40, 37, 'hi there', '2025-11-14 10:01:18', 1, '2025-11-14 02:02:56', NULL),
(214, 37, 40, 'hello', '2025-11-14 10:02:21', 1, '2025-11-14 04:45:26', NULL),
(215, 40, 37, 'hi', '2025-11-14 10:02:42', 1, '2025-11-14 02:02:56', NULL),
(216, 40, 37, 'meow', '2025-11-14 10:05:26', 1, '2025-11-14 05:18:11', NULL),
(217, 40, 37, 'meow', '2025-11-14 10:05:57', 1, '2025-11-14 05:18:11', NULL),
(218, 37, 40, 'awaw', '2025-11-14 10:17:34', 1, '2025-11-14 04:45:26', NULL),
(219, 37, 40, 'awawawawaw', '2025-11-14 10:18:40', 1, '2025-11-14 04:45:26', NULL),
(220, 37, 40, 'wowowow', '2025-11-14 10:20:34', 1, '2025-11-14 04:45:26', NULL),
(221, 40, 37, 'wewewewewew', '2025-11-14 10:48:13', 1, '2025-11-14 05:18:11', NULL),
(222, 37, 40, 'hohohoho', '2025-11-14 11:02:06', 1, '2025-11-14 04:45:26', NULL),
(223, 37, 40, 'heheheeh', '2025-11-14 11:02:45', 1, '2025-11-14 04:45:26', NULL),
(224, 37, 40, 'hihi', '2025-11-14 11:04:00', 1, '2025-11-14 04:45:26', NULL),
(225, 37, 40, 'huhuhaha', '2025-11-14 11:15:57', 1, '2025-11-14 04:45:26', NULL),
(226, 40, 37, 'huhuhaha', '2025-11-14 11:16:58', 1, '2025-11-14 05:18:11', NULL),
(227, 40, 37, 'huhuhaha', '2025-11-14 11:17:20', 1, '2025-11-14 05:18:11', NULL),
(228, 40, 37, 'ereretddd', '2025-11-14 11:44:23', 1, '2025-11-14 05:18:11', NULL),
(229, 40, 37, 'wefergrbg', '2025-11-14 11:44:40', 1, '2025-11-14 05:18:11', NULL),
(230, 40, 37, 'svebwfw', '2025-11-14 11:47:47', 1, '2025-11-14 05:18:11', NULL),
(231, 37, 40, 'testing', '2025-11-14 12:01:02', 1, '2025-11-14 04:45:26', NULL),
(232, 37, 40, 'testing again', '2025-11-14 12:12:05', 1, '2025-11-14 04:45:26', NULL),
(233, 40, 37, 'testitng', '2025-11-14 12:27:30', 1, '2025-11-14 05:18:11', NULL),
(234, 40, 37, 'testing', '2025-11-14 12:45:32', 1, '2025-11-14 05:18:11', NULL),
(235, 40, 37, 'grrrrrrr', '2025-11-14 12:48:10', 1, '2025-11-14 05:18:11', NULL),
(236, 40, 37, 'yow', '2025-11-14 13:18:23', 1, '2025-11-14 14:02:56', NULL),
(237, 40, 37, 'goodmorning', '2025-11-17 07:09:13', 1, '2025-11-16 23:09:50', NULL),
(238, 40, 37, 'dfrghh', '2025-11-17 07:41:53', 1, '2025-11-16 23:44:43', NULL),
(239, 37, 40, 'dgnyj', '2025-11-17 07:51:10', 1, '2025-11-16 23:51:20', NULL),
(240, 40, 37, 'awawawaw', '2025-11-17 07:58:07', 1, '2025-11-17 00:01:54', NULL),
(241, 37, 40, 'dhbsdchbca', '2025-11-17 08:05:28', 1, '2025-11-17 00:05:45', NULL),
(242, 40, 37, 'fhdhkwdvd', '2025-11-17 08:06:01', 1, '2025-11-17 00:06:17', NULL),
(243, 40, 37, 'milo', '2025-11-17 08:07:47', 1, '2025-11-17 00:07:58', NULL),
(244, 40, 37, 'nila', '2025-11-17 08:09:55', 1, '2025-11-17 00:10:40', NULL),
(245, 40, 37, 'mila', '2025-11-17 08:18:26', 1, '2025-11-17 00:18:35', NULL),
(246, 37, 40, 'fhkbrfevdlk', '2025-11-17 08:34:33', 1, '2025-11-17 00:34:41', NULL),
(247, 40, 37, 'gorvjfuhjkdscs', '2025-11-17 08:39:58', 1, '2025-11-17 00:40:07', NULL),
(248, 37, 40, 'dbogfcnwierldsc', '2025-11-17 08:40:52', 1, '2025-11-17 00:41:00', NULL),
(249, 40, 37, 'bwahahahaha', '2025-11-17 10:18:17', 1, '2025-11-17 03:04:20', NULL),
(250, 40, 37, 'testing123', '2025-11-17 11:04:08', 1, '2025-11-17 03:04:20', NULL),
(251, 40, 37, '123test', '2025-11-17 11:04:37', 1, '2025-11-17 03:05:17', NULL),
(252, 40, 37, 'sdveb', '2025-11-17 11:05:30', 1, '2025-11-17 03:06:24', NULL),
(253, 40, 37, 'vefbv', '2025-11-17 11:06:08', 1, '2025-11-17 03:06:24', NULL),
(254, 40, 37, 'sdvef', '2025-11-17 11:06:32', 1, '2025-11-17 03:08:00', NULL),
(255, 40, 37, 'sdvefbds', '2025-11-17 11:08:04', 1, '2025-11-17 03:28:00', NULL),
(256, 40, 37, 'dfbnthnbfvec', '2025-11-17 11:27:40', 1, '2025-11-17 03:28:00', NULL),
(257, 37, 40, 'sdgyjtbfvbh', '2025-11-17 11:28:06', 1, '2025-11-17 03:28:42', NULL),
(258, 37, 40, 'dsbgnhnh', '2025-11-17 11:28:27', 1, '2025-11-17 03:28:42', NULL),
(259, 37, 40, 'dfbthj', '2025-11-17 11:28:49', 1, '2025-11-17 03:30:47', NULL),
(260, 37, 40, 'hyhyhyhy', '2025-11-17 11:30:21', 1, '2025-11-17 03:30:47', NULL),
(261, 40, 37, 'jvjdcdc', '2025-11-17 11:30:54', 1, '2025-11-17 03:32:12', NULL),
(262, 37, 40, 'dhvsdjv', '2025-11-17 11:31:03', 1, '2025-11-17 03:31:21', NULL),
(263, 37, 40, 'csd', '2025-11-17 11:31:09', 1, '2025-11-17 03:31:21', NULL),
(264, 37, 40, 'dvfbfd', '2025-11-17 11:31:25', 1, '2025-11-17 03:32:22', NULL),
(265, 40, 37, 'fgmhnfg', '2025-11-17 11:32:28', 1, '2025-11-17 23:47:41', NULL),
(266, 37, 40, 'dgfhdfdfd', '2025-11-17 11:32:56', 1, '2025-11-17 23:47:24', NULL),
(267, 40, 37, 'goodmorning', '2025-11-18 07:47:31', 1, '2025-11-17 23:47:41', NULL),
(268, 37, 40, 'goodmorning din', '2025-11-18 07:47:49', 1, '2025-11-17 23:48:28', NULL),
(269, 40, 37, 'nagkaon kna', '2025-11-18 07:49:01', 1, '2025-11-17 23:51:43', NULL),
(270, 37, 40, 'hndi pa', '2025-11-18 07:51:55', 1, '2025-11-18 00:20:01', NULL),
(271, 40, 37, 'bakit', '2025-11-18 08:20:05', 1, '2025-11-18 00:20:22', NULL),
(272, 37, 40, 'ewan', '2025-11-18 08:20:30', 1, '2025-11-18 00:21:08', NULL),
(273, 40, 37, 'hahahaha', '2025-11-18 08:20:42', 1, '2025-11-18 00:21:01', NULL),
(274, 39, 37, 'musta', '2025-11-18 08:22:50', 1, '2025-11-18 00:23:37', NULL),
(275, 39, 37, 'seen?', '2025-11-18 08:23:49', 1, '2025-11-18 00:24:08', NULL),
(276, 37, 39, 'uy hahaha', '2025-11-18 08:24:13', 1, '2025-11-18 00:24:22', NULL),
(277, 37, 39, 'huhuhaha', '2025-11-18 08:42:40', 1, '2025-11-18 00:42:48', NULL),
(278, 39, 37, 'huuhuhahha', '2025-11-18 08:43:04', 1, '2025-11-18 00:44:07', NULL),
(279, 37, 39, 'ok naba?', '2025-11-18 08:43:20', 1, '2025-11-18 00:59:03', NULL),
(280, 39, 37, 'i think so', '2025-11-18 08:43:37', 1, '2025-11-18 00:44:07', NULL),
(281, 37, 39, 'testing', '2025-11-18 08:43:44', 1, '2025-11-18 00:59:03', NULL),
(282, 39, 37, 'testing123', '2025-11-18 08:59:09', 1, '2025-11-18 00:59:18', NULL),
(283, 37, 39, 'next naman hahah', '2025-11-18 08:59:27', 1, '2025-11-18 00:59:57', NULL),
(284, 39, 37, 'medyo ok naman so far so good', '2025-11-18 08:59:52', 1, '2025-11-18 00:59:55', NULL),
(285, 37, 39, 'goods yan hahah', '2025-11-18 09:00:09', 1, '2025-11-18 01:00:14', NULL),
(286, 37, 39, 'damn ok na hahaha', '2025-11-18 09:00:27', 1, '2025-11-18 01:00:40', NULL),
(287, 39, 37, 'nicenice', '2025-11-18 09:00:36', 1, '2025-11-18 01:00:47', NULL),
(288, 40, 37, 'testing', '2025-11-18 10:24:28', 1, '2025-11-18 02:25:02', NULL),
(289, 37, 40, 'gdfgdfgdffgg', '2025-11-18 10:25:34', 1, '2025-11-18 02:26:11', NULL),
(290, 40, 37, 'dfgghhhg', '2025-11-18 10:26:25', 1, '2025-11-18 02:26:50', NULL),
(291, 14, 16, 'message nga', '2026-02-22 14:59:14', 1, '2026-02-22 07:07:20', NULL),
(292, 16, 14, 'try lang', '2026-02-22 15:07:37', 1, '2026-02-22 07:10:01', NULL),
(293, 16, 14, 'sige nga', '2026-02-22 15:10:06', 1, '2026-02-22 07:55:31', NULL),
(294, 14, 16, 'okay', '2026-02-22 15:49:12', 1, '2026-02-22 07:49:52', NULL),
(295, 8, 7, 'hey', '2026-03-02 14:28:21', 1, '2026-03-02 06:28:29', NULL),
(296, 7, 8, 'titi', '2026-03-02 14:28:31', 1, '2026-03-02 06:28:40', NULL),
(297, 9, 7, 'adasdsad', '2026-03-04 02:13:39', 1, '2026-03-03 18:13:46', NULL),
(298, 7, 9, 'sfsfsdfs', '2026-03-04 02:13:50', 1, '2026-03-03 18:47:14', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `music`
--

CREATE TABLE `music` (
  `music_id` int(11) NOT NULL,
  `album_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `duration` time DEFAULT NULL,
  `audio_url` varchar(255) DEFAULT NULL,
  `lyrics` text DEFAULT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `activity_type` enum('like','comment','repost','follow','warning','suspended') NOT NULL,
  `source_user_id` int(11) DEFAULT NULL,
  `post_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `activity_type`, `source_user_id`, `post_id`, `created_at`, `community_id`) VALUES
(125, 7, 'like', 9, 120, '2026-03-04 02:30:25', NULL),
(126, 7, 'repost', 9, 120, '2026-03-04 02:34:06', 1),
(127, 7, 'follow', 9, NULL, '2026-03-04 02:47:48', 1),
(128, 7, 'warning', 1, NULL, '2026-03-04 03:52:45', NULL),
(129, 7, 'warning', 1, NULL, '2026-03-04 03:53:37', NULL),
(130, 7, 'warning', 1, NULL, '2026-03-04 04:02:13', 1),
(131, 7, 'suspended', 1, NULL, '2026-03-04 04:02:45', 1);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `shipping_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`shipping_address`)),
  `status` varchar(50) DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `community_id`, `subtotal`, `shipping_fee`, `total`, `payment_method`, `shipping_address`, `status`, `created_at`) VALUES
(12, 9, 1, 500.00, 100.00, 600.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Nueva Ecija\",\"city\":\"Licab\",\"barangay\":\"Santa Maria\",\"zip\":\"0000\"}', 'completed', '2026-03-04 03:26:21');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `variant_id`, `quantity`, `price`, `total`, `created_at`) VALUES
(14, 12, 4, 10, 1, 500.00, 500.00, '2026-03-04 03:26:21');

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
-- Table structure for table `posts`
--

CREATE TABLE `posts` (
  `post_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `img_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `repost_id` int(11) DEFAULT NULL,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `posts`
--

INSERT INTO `posts` (`post_id`, `user_id`, `content`, `img_url`, `created_at`, `updated_at`, `repost_id`, `community_id`) VALUES
(112, 9, 'test', NULL, '2026-03-04 01:20:14', '2026-03-04 01:20:14', NULL, 1),
(113, 9, 'test', NULL, '2026-03-04 01:21:25', '2026-03-04 01:31:25', 112, 1),
(114, 20, 'test', NULL, '2026-03-04 01:31:07', '2026-03-04 01:31:07', NULL, 2),
(115, 9, '', NULL, '2026-03-04 01:37:32', '2026-03-04 01:37:32', NULL, 1),
(116, 28, 'Original post content unavailable', NULL, '2026-03-04 02:01:43', '2026-03-04 02:01:43', 115, NULL),
(117, 28, 'test with pic', NULL, '2026-03-04 02:01:52', '2026-03-04 02:01:52', NULL, 1),
(118, 28, 'lnnknlk', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772560980/uploads/dek1ey8k224vtbmvujrw.png', '2026-03-04 02:02:58', '2026-03-04 02:02:58', NULL, 1),
(119, 9, 'lnnknlk', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772560980/uploads/dek1ey8k224vtbmvujrw.png', '2026-03-04 02:14:47', '2026-03-04 02:14:47', 118, NULL),
(120, 7, 'sdasdas', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772562030/uploads/ghchzuldjhlw5jgyqhz1.webp', '2026-03-04 02:20:28', '2026-03-04 02:20:28', NULL, 1),
(121, 9, 'sdasdas', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772562030/uploads/ghchzuldjhlw5jgyqhz1.webp', '2026-03-04 02:34:06', '2026-03-04 02:34:06', 120, NULL),
(123, 7, 'panot', NULL, '2026-03-04 02:42:07', '2026-03-04 02:42:07', NULL, 1),
(124, 7, 'dump', NULL, '2026-03-04 02:42:31', '2026-03-04 02:42:31', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `collection_id` int(11) DEFAULT NULL,
  `product_category` varchar(100) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `name`, `collection_id`, `product_category`, `image_url`, `created_at`, `community_id`) VALUES
(1, 'BINIverse World Tour - T-Shirt', 4, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINI_World_Tour_SHIRT_BACK.png?v=1738236935&width=493', '2025-12-24 19:18:04', 2),
(2, 'BiniFied T-shirt', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-TShirt-Back.png?v=1763017728&width=360', '2026-01-12 09:55:10', 1),
(3, 'BIniFied Pullover', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-LongSleeves-Front.png?v=1763018103&width=360', '2026-01-12 09:56:22', 1),
(4, 'BiniFied Cap', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-Cap_0621ebe1-b936-4e6d-bead-bbd6a705980c.png?v=1763016405&width=360', '2026-01-12 09:57:07', 1),
(5, 'music muna itest baitn', 3, 'Accessories', NULL, '2026-03-01 22:02:03', 1),
(6, 'testing', 4, 'Accessories', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772565494/uploads/n4vsrd3grl1nliyrgvmu.webp', '2026-03-04 03:18:12', 2);

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `variant_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_name` varchar(150) DEFAULT NULL,
  `variant_values` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `weight_g` decimal(10,2) NOT NULL DEFAULT 0.00,
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`variant_id`, `product_id`, `variant_name`, `variant_values`, `price`, `stock`, `weight_g`, `community_id`) VALUES
(1, 1, 'Size', 'Small', 100.00, 99, 10.00, 2),
(2, 1, 'Size', 'Medium', 80.00, 100, 10.00, 1),
(3, 1, 'Size', 'Large', 120.00, 100, 10.00, 1),
(4, 2, 'Size', 'Small', 1299.00, 99, 10.00, 1),
(5, 2, 'Size', 'Medium', 1500.00, 100, 10.00, 1),
(6, 2, 'Size', 'Large', 2000.00, 100, 10.00, 1),
(7, 3, 'Size', 'Small', 1499.00, 1, 10.00, 1),
(8, 3, 'Size', 'Medium', 2000.00, 100, 10.00, 1),
(9, 3, 'Size', 'Large', 3000.00, 100, 10.00, 1),
(10, 4, 'Size', 'Small', 500.00, 99, 10.00, 1),
(11, 5, 'size', 'small', 100.00, 100, 10.00, 1),
(13, 6, 'size', 'small', 100.00, 100, 11.00, NULL);

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
-- Table structure for table `registration_verifications`
--

CREATE TABLE `registration_verifications` (
  `email` varchar(100) NOT NULL,
  `otp` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registration_verifications`
--

INSERT INTO `registration_verifications` (`email`, `otp`, `expires_at`, `created_at`) VALUES
('jobertest@gmail.com', '792353', '2026-03-04 02:05:00', '2026-03-04 02:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reported_user_id` int(11) NOT NULL,
  `report_type` enum('chat','post') NOT NULL,
  `message_id` int(11) DEFAULT NULL,
  `post_id` int(11) DEFAULT NULL,
  `reason` enum('harassment','sending fake links','inappropriate chat','malicious photo','inappropriate picture') NOT NULL,
  `status` enum('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`report_id`, `reporter_id`, `reported_user_id`, `report_type`, `message_id`, `post_id`, `reason`, `status`, `admin_notes`, `created_at`, `updated_at`, `community_id`) VALUES
(1, 7, 14, 'post', NULL, 105, 'harassment', 'resolved', '[2026-03-02T06:25:14.205Z] admin:1 action:warning reason:Warning: 2 more reports and your account will be banned.', '2026-03-01 13:49:51', '2026-03-02 06:25:14', NULL),
(2, 8, 7, 'chat', NULL, NULL, '', 'resolved', '[2026-03-03T20:02:45.370Z] admin:1 action:suspend reason:jjj', '2026-03-02 06:28:50', '2026-03-03 20:02:45', NULL),
(3, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:31:43', '2026-03-02 07:11:08', NULL),
(4, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:40:53', '2026-03-02 07:11:08', NULL),
(5, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:44:21', '2026-03-02 07:11:08', NULL),
(6, 7, 8, 'post', NULL, 111, 'harassment', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:49:36', '2026-03-02 07:11:08', NULL),
(7, 7, 16, 'post', NULL, 106, 'harassment', 'pending', NULL, '2026-03-02 07:17:44', '2026-03-02 07:17:44', NULL),
(8, 9, 28, 'post', NULL, 118, 'harassment', 'pending', NULL, '2026-03-03 18:17:05', '2026-03-03 18:17:05', NULL),
(9, 7, 28, 'post', NULL, 118, '', 'pending', NULL, '2026-03-03 18:25:38', '2026-03-03 18:25:38', 1),
(10, 7, 8, 'chat', 296, NULL, 'inappropriate chat', 'pending', NULL, '2026-03-03 18:26:05', '2026-03-03 18:26:05', 1),
(11, 7, 28, 'post', NULL, 118, 'harassment', 'pending', NULL, '2026-03-03 18:35:06', '2026-03-03 18:35:06', 1),
(12, 9, 7, 'post', NULL, 124, 'harassment', 'resolved', '[2026-03-03T20:02:45.370Z] admin:1 action:suspend reason:jjj', '2026-03-03 19:52:25', '2026-03-03 20:02:45', 1),
(13, 9, 7, 'post', NULL, 124, '', 'resolved', '[2026-03-03T20:02:45.370Z] admin:1 action:suspend reason:jjj', '2026-03-03 19:52:29', '2026-03-03 20:02:45', 1),
(14, 9, 7, 'post', NULL, 124, '', 'resolved', '[2026-03-03T20:02:45.370Z] admin:1 action:suspend reason:jjj', '2026-03-03 19:52:32', '2026-03-03 20:02:45', 1);

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
  `community_id` int(11) DEFAULT NULL,
  `short_bio` text NOT NULL,
  `description` text NOT NULL,
  `status` enum('active','suspended','deleted') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sites`
--

INSERT INTO `sites` (`site_id`, `site_name`, `domain`, `community_id`, `short_bio`, `description`, `status`, `created_at`) VALUES
(1, 'Bini', 'bini-website', 1, 'BINI is an eight-member Filipino girl group formed by ABS-CBN’s Star Hunt Academy.', 'The group consists of Aiah, Colet, Maloi, Gwen, Stacey, Mikha, Jhoanna, and Sheena. Known for their synchronized choreography, polished vocals, and vibrant concepts, BINI blends K-pop-inspired training systems with distinctly Filipino language and cultural elements.\n\nTheir breakout tracks such as “Pantropiko” and “Salamin, Salamin” significantly expanded their audience both locally and internationally, positioning them as a major force in Southeast Asian pop music.', 'active', '2026-02-28 19:27:56'),
(2, 'blankpink', 'blankpink-website', NULL, '', '', 'active', '2026-02-28 22:23:14'),
(7, 'juan_direction', 'juan-website', 2, 'test test test test test test test test test test test test test test test test test test', 'test test test test test test test test test test test test test test test test test test', 'active', '2026-03-02 16:45:42');

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `community_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_members`
--

INSERT INTO `site_members` (`member_id`, `site_id`, `name`, `role`, `description`, `image_profile`, `created_at`, `updated_at`, `community_id`) VALUES
(3, 7, 'miko', 'manager', 'pogi', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772441142/websites/members/ycvwvotftexafylx0wsz.jpg', '2026-03-02 08:45:42', '2026-03-02 08:45:42', NULL),
(14, 1, 'Aiah', 'Main Rapper • Visual • Sub-Vocalist', 'Aiah is known for her charismatic stage presence and sharp rap delivery.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772447947/uploads/nfniuhyrh5b713jkhijl.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(15, 1, 'Gwen', 'Lead Vocalist • Lead Rapper', 'Gwen\'s versatility allows her to switch seamlessly between powerful vocals and rap verses.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772447987/uploads/yobjbve3bgonhdch0aul.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(16, 1, 'Maloi', 'Main Vocalist • Lead Dancer • Lead Rapper', 'Maloi\'s powerful voice and emotional delivery have captured the hearts of fans.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448030/uploads/yqz1ltnausasdszwgamq.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(17, 1, 'Colet', 'Main Vocalist', 'Colet\'s wide vocal range and stability make her one of the group\'s strongest singers.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448065/uploads/qcpfmge7yokapwscawqj.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(18, 1, 'Mikha', 'Main Rapper • Lead Dancer • Visual', 'Mikha\'s sharp dance moves and confident rap lines add edge to BINI\'s performances.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448096/uploads/r0qyueaczkln3q27wsvp.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(19, 1, 'Stacey', 'Lead Dancer • Sub Vocalist • Sub Rapper', 'Stacey brings energy and precision to every stage. Her bubbly personality off-stage balances her fierce performance persona.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448135/uploads/u1otcqhslebkqxqsg6ev.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(20, 1, 'Sheena', 'Main Dancer • Sub-Vocalist', 'Sheena\'s dance skills are top-notch, often leading rehearsals and creating freestyle pieces.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448172/uploads/p7seo7m3o8o6ailel5se.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL),
(21, 1, 'Jhoanna', 'Leader • Lead Vocalist • Lead Rapper', 'As the leader, Jhoanna ensures the group stays united and focused.', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448207/uploads/cqoiieemwfsubzdfjsmd.webp', '2026-03-02 14:01:11', '2026-03-02 14:01:11', NULL);

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

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `community_id` int(11) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `fullname` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `auth_provider` enum('local','google') NOT NULL DEFAULT 'local',
  `failed_login_attempts` int(11) NOT NULL DEFAULT 0,
  `role` enum('customer','main_admin') NOT NULL DEFAULT 'customer',
  `created_at` datetime DEFAULT current_timestamp(),
  `reset_otp` varchar(10) DEFAULT NULL,
  `reset_expr` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `community_id`, `email`, `fullname`, `password`, `profile_picture`, `google_id`, `auth_provider`, `failed_login_attempts`, `role`, `created_at`, `reset_otp`, `reset_expr`) VALUES
(7, 1, 'jamino179@gmail.com', 'jamin omar', 'a89cf4ac962edffef451ae5224b6e1d8baa423bb463b19e6d0dd597b95ff9b03', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772456514/uploads/jdtusc8g5dkbps7x3una.jpg', '108469309788281447418', 'google', 0, 'main_admin', '2025-12-24 21:05:53', NULL, NULL),
(8, 1, 'mikoalvarado@gmail.com', 'miko alvarado', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772366832/uploads/bkiihsojcfyfi5eikvus.jpg', NULL, 'local', 0, 'customer', '2026-01-08 20:37:32', NULL, NULL),
(9, 1, 'yvan@gmail.com', 'yvan mayor', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'customer', '2026-01-08 21:46:39', NULL, NULL),
(10, 1, 'desd85531@gmail.com', 'des desdiaz', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'customer', '2026-01-28 12:13:18', NULL, NULL),
(14, 1, 'wilson@gmail.com', 'esmabe wilson', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'https://lh3.googleusercontent.com/a/ACg8ocKNKFJ1FbHXcY6qyfUBswAS3DKCKoqFnJ0gCFo-iDRVslo_Cjw=s96-c', NULL, 'local', 0, 'customer', '2026-02-19 21:21:35', NULL, NULL),
(15, NULL, 'wilsonesmabe2003@gmail.com', 'Esmabe C.', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'none', NULL, 'local', 0, 'customer', '2026-02-20 13:07:01', NULL, NULL),
(16, 2, 'bago@gmail.com', 'bago lang', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'https://lh3.googleusercontent.com/a/ACg8ocKYuFWwaCl-fkHACM9xrj7YN1TtUvW3tqotwTbqhyoDzhAeSg=s96-c', NULL, 'local', 2, 'main_admin', '2026-02-20 14:34:35', NULL, NULL),
(18, 1, 'ericamayor0@gmail.com', 'Erica Mayor', 'ccc8530a8d8e6da4271206a1d9de829fc95a168e0bb643b2ba621a9be87624a7', 'https://lh3.googleusercontent.com/a/ACg8ocK5_6nucmu9lIdxMVnf9k6IiFxlPSIaSy2MyzXzfUfTpAKp8Nw=s96-c', NULL, 'local', 1, 'customer', '2026-03-01 11:24:24', NULL, NULL),
(20, 2, 'justin@gmail.com', 'justin cortez', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'main_admin', '2026-03-01 14:23:33', NULL, NULL),
(23, 1, 'abesamischrisaaron@gmail.com', 'chris aaron Abesamis', '32f5113cad712e167da3d86f0c4a897fa90c90be30454251033c99e531a0afa8', 'https://lh3.googleusercontent.com/a/ACg8ocIPjf0OzIXL4YQIimgcariAenSwmPE3RDa6Xb1H5nIDlsCBU9E=s96-c', '108028491461499683145', 'google', 0, 'customer', '2026-03-01 15:06:37', NULL, NULL),
(28, 1, 'marcyvanmayor@gmail.com', 'Marc Yvan Mayor', '546a79a5c8d293afb940e0a2ca39b49cc2e2447b164e2dbccc4245beb6f66cf0', 'https://lh3.googleusercontent.com/a/ACg8ocLBGQL8_UTJeTN2WzHiPM27A31fDzA69naKCHNvqif3t6om1g=s96-c', '100596293037269441367', 'google', 0, 'customer', '2026-03-04 02:01:04', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_suspensions`
--

CREATE TABLE `user_suspensions` (
  `suspension_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `imposed_by_admin_id` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `starts_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ends_at` datetime NOT NULL,
  `duration_days` int(11) NOT NULL DEFAULT 3,
  `status` enum('active','expired','lifted') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_suspensions`
--

INSERT INTO `user_suspensions` (`suspension_id`, `user_id`, `imposed_by_admin_id`, `reason`, `starts_at`, `ends_at`, `duration_days`, `status`, `created_at`, `updated_at`) VALUES
(0, 8, 1, 'asd', '2026-03-02 15:01:21', '2026-03-05 15:11:08', 3, 'active', '2026-03-02 15:01:21', '2026-03-02 15:11:08'),
(0, 7, 1, 'jjj', '2026-03-04 04:02:45', '2026-03-07 04:02:45', 3, 'active', '2026-03-04 04:02:45', '2026-03-04 04:02:45');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`cart_id`),
  ADD UNIQUE KEY `unique_user_community` (`user_id`,`community_id`),
  ADD KEY `fk_cart_community` (`community_id`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`item_id`),
  ADD UNIQUE KEY `unique_cart_variant` (`cart_id`,`variant_id`),
  ADD KEY `fk_cartitem_variant` (`variant_id`);

--
-- Indexes for table `collections`
--
ALTER TABLE `collections`
  ADD PRIMARY KEY (`collection_id`),
  ADD KEY `group_community_id` (`group_community_id`);

--
-- Indexes for table `collection_categories`
--
ALTER TABLE `collection_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uniq_collection_category` (`collection_id`,`category_name`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `communities`
--
ALTER TABLE `communities`
  ADD PRIMARY KEY (`community_id`);

--
-- Indexes for table `community_suggestions`
--
ALTER TABLE `community_suggestions`
  ADD PRIMARY KEY (`suggestion_id`),
  ADD KEY `idx_suggestions_read_created` (`is_read`,`created_at`);

--
-- Indexes for table `community_table`
--
ALTER TABLE `community_table`
  ADD PRIMARY KEY (`community_id`),
  ADD UNIQUE KEY `uq_community_table_domain` (`domain`);

--
-- Indexes for table `community_threads`
--
ALTER TABLE `community_threads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_community_threads_community_id` (`community_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `daily_revenue`
--
ALTER TABLE `daily_revenue`
  ADD UNIQUE KEY `uq_daily_revenue_order_id` (`order_id`);

--
-- Indexes for table `discography`
--
ALTER TABLE `discography`
  ADD PRIMARY KEY (`album_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `follows`
--
ALTER TABLE `follows`
  ADD PRIMARY KEY (`follow_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `hashtags`
--
ALTER TABLE `hashtags`
  ADD PRIMARY KEY (`hashtag_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`like_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `music`
--
ALTER TABLE `music`
  ADD PRIMARY KEY (`music_id`),
  ADD KEY `album_id` (`album_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `community_id` (`community_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `platform_admins`
--
ALTER TABLE `platform_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_platform_admins_email` (`email`),
  ADD KEY `idx_otp_expiry` (`otp_expiry`);

--
-- Indexes for table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `collection_id` (`collection_id`),
  ADD KEY `idx_community_id` (`community_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `idx_community_id` (`community_id`);

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
-- Indexes for table `registration_verifications`
--
ALTER TABLE `registration_verifications`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `idx_community_id` (`community_id`);

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
  ADD UNIQUE KEY `domain` (`domain`),
  ADD KEY `idx_sites_community_id` (`community_id`);

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
  ADD KEY `fk_site_members_site` (`site_id`),
  ADD KEY `idx_community_id` (`community_id`);

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
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_community_id` (`community_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `cart_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `collection_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `collection_categories`
--
ALTER TABLE `collection_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `comment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `communities`
--
ALTER TABLE `communities`
  MODIFY `community_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `community_suggestions`
--
ALTER TABLE `community_suggestions`
  MODIFY `suggestion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `community_threads`
--
ALTER TABLE `community_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `discography`
--
ALTER TABLE `discography`
  MODIFY `album_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `follows`
--
ALTER TABLE `follows`
  MODIFY `follow_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `hashtags`
--
ALTER TABLE `hashtags`
  MODIFY `hashtag_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `likes`
--
ALTER TABLE `likes`
  MODIFY `like_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=299;

--
-- AUTO_INCREMENT for table `music`
--
ALTER TABLE `music`
  MODIFY `music_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=132;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `platform_admins`
--
ALTER TABLE `platform_admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `posts`
--
ALTER TABLE `posts`
  MODIFY `post_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=125;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

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
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

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
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `fk_cartitem_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cartitem_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE;

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
