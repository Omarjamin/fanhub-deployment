-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 02, 2026 at 04:28 PM
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
USE railway;


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
(7, 17, 0, '2026-03-01 03:17:44');

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
(8, 5, 1, 1, '2026-01-12 02:00:38'),
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
(3, 1, 'Binified', 'https://store.abs-cbn.com/cdn/shop/collections/BINIfied_Website_Thumbnail.jpg?v=1763106912&width=1500', 'test', '2026-01-12 09:52:31');

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
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`comment_id`, `post_id`, `user_id`, `content`, `parent_comment_id`, `created_at`) VALUES
(30, 79, 29, 'guys please like and share...', NULL, '2025-06-02 13:15:23'),
(31, 79, 30, 'hi sis ganda mu', NULL, '2025-06-02 13:19:22'),
(32, 80, 31, 'Wow', NULL, '2025-06-02 13:25:51'),
(33, 79, 31, 'hihihi', NULL, '2025-06-02 13:26:09'),
(34, 81, 31, 'ganda gurl', NULL, '2025-06-02 13:29:43'),
(35, 91, 14, 'try', NULL, '2026-02-20 11:55:04'),
(36, 91, 14, 'try', NULL, '2026-02-20 11:55:58'),
(37, 91, 14, 'gana na ba?', NULL, '2026-02-20 11:56:57'),
(38, 1, 14, 'try', NULL, '2026-02-20 11:57:17'),
(39, 90, 14, 'kupal', NULL, '2026-02-20 11:57:33'),
(40, 92, 14, 'yow', NULL, '2026-02-20 12:51:26'),
(41, 92, 14, 'try nga', 40, '2026-02-20 12:51:36'),
(42, 5, 7, 'asdakdjksahdjsa', NULL, '2026-03-02 12:17:06'),
(43, NULL, 7, 'sdasdsadas', 2147483647, '2026-03-02 12:17:13'),
(44, 111, 8, 'dkjskdfj', NULL, '2026-03-02 14:59:44');

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
(1, 'bini', 'BINI is an 8-member Filipino girl group formed by ABS-CBN Star Hunt Academy. Known for their powerful vocals, synchronized choreography, and inspiring message of empowerment.', '2025-12-24 19:14:00');

-- --------------------------------------------------------

--
-- Table structure for table `community_threads`
--

CREATE TABLE `community_threads` (
  `id` int(11) NOT NULL,
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

INSERT INTO `community_threads` (`id`, `title`, `venue`, `date`, `author`, `is_pinned`, `created_at`, `updated_at`) VALUES
(1, 'BINI Cosmetics Livestream', 'BINI.Global Livestream', '2026-06-11', 'Admin', 0, '2026-02-18 19:52:07', '2026-03-02 12:09:29'),
(3, 'Enervon Z+ X BINI', 'Livestream', '2026-02-26', 'Admin', 0, '2026-02-18 19:52:51', '2026-03-02 12:09:29'),
(4, 'Enervon Z+ X BINI', 'Livestream', '2026-02-26', 'Admin', 0, '2026-02-18 19:52:53', '2026-03-02 12:10:40'),
(6, 'Complete the BINI FLAMES experience with the newest merch!', '’t miss your chance to own the limited-edition BINI FLAMES Shirt. BINI Global Members can also avail the BINI Global-exclusive FLAMES Lyrics Shirt.\n\nGet yours now and keep the FLAMES era alive!', '2026-03-11', 'Admin', 1, '2026-03-02 13:38:55', '2026-03-02 18:49:40');

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
(0, 8, '2026-03-02', '12:04:50', 300.00, '2026-03-02 04:04:50');

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
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `discography`
--

INSERT INTO `discography` (`album_id`, `title`, `songs`, `year`, `cover_image`, `album_link`, `description`) VALUES
(4, 'Flames', 7, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772443809/uploads/mrchkjei0tj6mfqxdum9.png', 'https://open.spotify.com/album/42s2X3WQppxdHafUT2dfmF?si=1&nd=1&dlsi=9b6451ab7eb84595', NULL),
(5, 'First Luv', 1, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772443948/uploads/hzwflhcbuvoqb532yzw8.png', 'https://open.spotify.com/album/6hR079yVpoqUG4sOswANT4?si=0zC90Ht_QYmXqpseDZ54Yw&nd=1&dlsi=dffd42571b1842e7', NULL),
(6, 'Shagidi', 1, '2025', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444079/uploads/amwk3ojmmp33c9hq9blp.png', 'https://open.spotify.com/album/14xJ5Qg9sEbCJmg2vBRCUZ?si=PwivRmyaTzG1hoDqCSUBpw&nd=1&dlsi=4359504da9d849ee', NULL),
(7, 'Blink Twice', 1, '2015', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444186/uploads/v0ca82ede66bbfh0emih.png', 'https://open.spotify.com/album/29rcLP1Uni7elTtxuiXF1J?si=1&nd=1&dlsi=542a4f7303764535', NULL),
(8, 'Cherry on top', 1, '2024', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444279/uploads/uxqpbnon3sn8hrai1koh.png', 'https://open.spotify.com/album/3ZIjUhwlei1sT2yetvypvJ?si=T8mpLAroQpSfJqeoBBp9Ew&nd=1&dlsi=d9ccbcb175cb4d0f', NULL),
(9, 'Talaarawan', 6, '2024', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444388/uploads/wvskulgfuajgleflki4b.png', 'https://open.spotify.com/album/2eT1XApzS0GmkJLMlCBdVv?si=1&nd=1&dlsi=2e4b8be088a24ef8', NULL),
(10, 'Feel Good', 7, '2022', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444559/uploads/jxdatozr2zkeirrfyysa.png', 'https://open.spotify.com/album/7H64wogfyQUcRqFZFbMV9S?si=1&nd=1&dlsi=6aae2534c88542b3', NULL),
(11, 'Born to win', 7, '2021', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444649/uploads/gdlwwz0nvhwh5dvtzc61.png', 'https://open.spotify.com/album/28rgW6IXDsrk4YtTcFtGGK?si=1&nd=1&dlsi=e0494459ea1c4242', NULL),
(12, 'Pantropiko', 1, '2023', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772444748/uploads/ct7rk0mpwa9m0bwl9xoi.png', 'https://open.spotify.com/album/3NYOeU6Uwj2FP1Zz1rWVz8?si=1&nd=1&dlsi=d5617df4860e4716', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `event_id` int(11) NOT NULL,
  `ticket_link` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`event_id`, `ticket_link`, `image_url`) VALUES
(1, 'https://www.ticketnet.com.ph/event-detail/BINIfied', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772448361/uploads/lpvxoohb6rwiosuhtlpp.png'),
(2, 'https://www.ticketnet.com.ph/event-detail/BINIverse-The-First-Solo-Concert', 'https://res.cloudinary.com/dfuglnaz2/image/upload/v1759407990/1000010193_ueru7w.png');

-- --------------------------------------------------------

--
-- Table structure for table `follows`
--

CREATE TABLE `follows` (
  `follow_id` int(11) NOT NULL,
  `follower_id` int(11) DEFAULT NULL,
  `followed_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `follows`
--

INSERT INTO `follows` (`follow_id`, `follower_id`, `followed_id`, `created_at`) VALUES
(25, 32, 31, '2025-06-02 13:33:18'),
(26, 32, 30, '2025-06-02 15:18:55'),
(27, 34, 32, '2025-06-02 19:21:05'),
(28, 33, 32, '2025-06-02 19:25:05'),
(29, 33, 31, '2025-06-02 19:25:13'),
(30, 32, 34, '2025-06-02 23:38:48'),
(31, 32, 36, '2025-06-05 21:38:49'),
(32, 37, 39, '2025-10-29 19:46:37'),
(33, 39, 37, '2025-10-30 06:06:36'),
(34, 37, 40, '2025-11-02 13:55:55'),
(35, 40, 39, '2025-11-02 13:56:30'),
(36, 40, 37, '2025-11-02 13:56:37'),
(37, 39, 40, '2025-11-02 13:59:19'),
(38, 41, 37, '2025-11-02 14:03:23'),
(39, 41, 39, '2025-11-02 14:03:27'),
(40, 41, 40, '2025-11-02 14:03:32'),
(41, 39, 41, '2025-11-02 14:03:49'),
(42, 40, 41, '2025-11-02 14:04:43'),
(43, 37, 41, '2025-11-02 14:05:21'),
(44, 42, 37, '2025-11-02 14:07:18'),
(45, 42, 39, '2025-11-02 14:07:25'),
(46, 42, 40, '2025-11-02 14:07:29'),
(47, 42, 41, '2025-11-02 14:07:35'),
(48, 40, 42, '2025-11-02 14:07:57'),
(49, 39, 42, '2025-11-02 14:09:05'),
(50, 37, 42, '2025-11-02 14:09:38'),
(51, 41, 42, '2025-11-02 14:10:06'),
(53, 16, 14, '2026-02-20 16:28:05'),
(54, 16, 9, '2026-02-22 16:27:15'),
(55, 7, 8, '2026-03-02 14:28:05');

-- --------------------------------------------------------

--
-- Table structure for table `hashtags`
--

CREATE TABLE `hashtags` (
  `hashtag_id` int(11) NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `tag` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `hashtags`
--

INSERT INTO `hashtags` (`hashtag_id`, `post_id`, `tag`) VALUES
(1, 100, '#hello_world'),
(2, 110, '#gago');

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE `likes` (
  `like_id` int(11) NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `like_type` varchar(20) NOT NULL DEFAULT 'post'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `likes`
--

INSERT INTO `likes` (`like_id`, `post_id`, `user_id`, `created_at`, `like_type`) VALUES
(19, 79, 29, '2025-06-02 13:15:03', 'post'),
(20, 80, 29, '2025-06-02 13:17:04', 'post'),
(21, 79, 30, '2025-06-02 13:19:04', 'post'),
(22, 81, 30, '2025-06-02 13:24:13', 'post'),
(23, 80, 30, '2025-06-02 13:24:16', 'post'),
(25, 79, 31, '2025-06-02 13:25:59', 'post'),
(27, 83, 31, '2025-06-02 13:29:23', 'post'),
(28, 82, 31, '2025-06-02 13:29:27', 'post'),
(29, 81, 31, '2025-06-02 13:29:35', 'post'),
(30, 79, 32, '2025-06-02 13:33:04', 'post'),
(31, 83, 32, '2025-06-02 13:34:05', 'post'),
(32, 83, 34, '2025-06-05 20:32:04', 'post'),
(34, 92, 14, '2026-02-20 12:51:17', 'post'),
(35, 93, 14, '2026-02-20 12:51:20', 'post'),
(36, 105, 16, '2026-02-22 16:26:55', 'post'),
(43, 106, 7, '2026-03-02 21:37:45', 'post'),
(44, 106, 7, '2026-03-02 21:37:45', 'post'),
(45, 106, 7, '2026-03-02 21:37:45', 'post'),
(46, 105, 7, '2026-03-02 21:38:02', 'post'),
(47, 111, 7, '2026-03-02 21:39:26', 'post'),
(49, 110, 7, '2026-03-02 21:39:30', 'post');

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
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`message_id`, `sender_id`, `receiver_id`, `content`, `created_at`, `is_read`, `read_at`) VALUES
(1, 32, 31, 'hi', '2025-06-02 17:26:28', 0, NULL),
(2, 32, 31, 'hi', '2025-06-02 18:00:37', 0, NULL),
(3, 31, 32, 'bakit', '2025-06-02 18:16:14', 0, NULL),
(4, 32, 31, 'oy', '2025-06-02 18:37:18', 0, NULL),
(5, 31, 32, 'oy', '2025-06-02 18:37:40', 0, NULL),
(6, 32, 31, 'hi', '2025-06-02 18:42:37', 0, NULL),
(7, 31, 32, 'oh', '2025-06-02 18:43:00', 0, NULL),
(8, 32, 31, 'ml', '2025-06-02 19:03:40', 0, NULL),
(9, 31, 32, 'pogi mo jamin pa kiss', '2025-06-02 19:12:09', 0, NULL),
(10, 34, 32, 'pre?', '2025-06-02 19:21:32', 0, NULL),
(11, 32, 31, 'pass am taken', '2025-06-02 19:27:13', 0, NULL),
(12, 33, 32, 'pre', '2025-06-02 23:34:35', 0, NULL),
(13, 32, 34, 'bakit pre', '2025-06-02 23:44:28', 0, NULL),
(14, 32, 34, 'pre', '2025-06-03 09:42:12', 0, NULL),
(15, 32, 34, 'labyou papa', '2025-06-03 09:42:16', 0, NULL),
(16, 32, 33, 'ow', '2025-06-05 16:05:57', 0, NULL),
(17, 34, 32, 'PRE CRUSH KO SI JUSTINE', '2025-06-05 20:42:09', 0, NULL),
(18, 37, 39, 'hi', '2025-10-29 19:49:15', 1, '2025-11-18 00:22:43'),
(19, 39, 37, 'hi po', '2025-10-29 19:50:40', 1, '2025-11-14 05:18:08'),
(20, 39, 37, 'online nako', '2025-10-30 06:13:20', 1, '2025-11-14 05:18:08'),
(21, 37, 39, 'sakin offline parin hahaha', '2025-10-30 06:13:46', 1, '2025-11-18 00:22:43'),
(22, 37, 39, 'sakin offline parin hahaha', '2025-10-30 06:13:46', 1, '2025-11-18 00:22:43'),
(23, 39, 37, 'online naba', '2025-10-30 06:43:12', 1, '2025-11-14 05:18:08'),
(24, 37, 39, 'hndi pa', '2025-10-30 06:43:24', 1, '2025-11-18 00:22:43'),
(25, 39, 37, 'oka na?', '2025-10-30 06:45:04', 1, '2025-11-14 05:18:08'),
(26, 37, 39, 'hndi pa offline parin', '2025-10-30 06:45:19', 1, '2025-11-18 00:22:43'),
(27, 39, 37, 'test', '2025-10-30 06:48:40', 1, '2025-11-14 05:18:08'),
(28, 37, 39, 'test', '2025-10-30 06:48:52', 1, '2025-11-18 00:22:43'),
(29, 39, 37, 'testing online c123', '2025-10-30 06:59:24', 1, '2025-11-14 05:18:08'),
(30, 37, 39, 'offline parin hahaha', '2025-10-30 06:59:38', 1, '2025-11-18 00:22:43'),
(31, 37, 39, 'ahahaha', '2025-10-30 07:04:09', 1, '2025-11-18 00:22:43'),
(32, 37, 39, 'hahaha', '2025-10-30 07:08:48', 1, '2025-11-18 00:22:43'),
(33, 39, 37, 'hahahaha', '2025-10-30 07:09:05', 1, '2025-11-14 05:18:08'),
(34, 39, 37, 'teswt', '2025-10-30 07:11:28', 1, '2025-11-14 05:18:08'),
(35, 37, 39, 'bat undefined?', '2025-10-30 07:12:05', 1, '2025-11-18 00:22:43'),
(36, 39, 37, 'ewan ko nga ewe', '2025-10-30 07:12:21', 1, '2025-11-14 05:18:08'),
(37, 37, 39, 'nye', '2025-10-30 07:12:52', 1, '2025-11-18 00:22:43'),
(38, 39, 37, 'sana ma online haha', '2025-10-30 07:33:04', 1, '2025-11-14 05:18:08'),
(39, 37, 39, 'offline parin hahaha', '2025-10-30 07:33:15', 1, '2025-11-18 00:22:43'),
(40, 37, 39, 'off parin', '2025-10-30 07:33:30', 1, '2025-11-18 00:22:43'),
(41, 39, 37, 'kaya nga ee', '2025-10-30 07:33:40', 1, '2025-11-14 05:18:08'),
(42, 37, 39, 'pero sa console online', '2025-10-30 07:34:38', 1, '2025-11-18 00:22:43'),
(43, 39, 37, 'gara nyan hahaha', '2025-10-30 07:34:56', 1, '2025-11-14 05:18:08'),
(44, 37, 39, 'hahaha', '2025-10-30 07:35:20', 1, '2025-11-18 00:22:43'),
(45, 39, 37, 'awit', '2025-10-30 07:36:11', 1, '2025-11-14 05:18:08'),
(46, 39, 37, 'off parin?', '2025-10-30 07:59:25', 1, '2025-11-14 05:18:08'),
(47, 37, 39, 'oo ee', '2025-10-30 07:59:40', 1, '2025-11-18 00:22:43'),
(48, 37, 39, 'balita', '2025-10-30 08:32:09', 1, '2025-11-18 00:22:43'),
(49, 37, 39, 'uy', '2025-10-30 08:39:25', 1, '2025-11-18 00:22:43'),
(50, 39, 37, 'sorry hahaha wal parin', '2025-10-30 08:39:51', 1, '2025-11-14 05:18:08'),
(51, 37, 39, 'gagi working na kulay green na hahaha', '2025-10-30 08:40:32', 1, '2025-11-18 00:22:43'),
(52, 37, 39, 'back to work hahah', '2025-10-30 13:59:19', 1, '2025-11-18 00:22:43'),
(53, 39, 37, 'okie hahahah', '2025-10-30 13:59:39', 1, '2025-11-14 05:18:08'),
(54, 39, 37, 'sup?', '2025-10-30 14:08:23', 1, '2025-11-14 05:18:08'),
(55, 37, 39, 'wait', '2025-10-30 14:08:34', 1, '2025-11-18 00:22:43'),
(56, 39, 37, 'test123', '2025-10-30 14:12:39', 1, '2025-11-14 05:18:08'),
(57, 39, 37, 'sup sun?', '2025-10-30 14:50:48', 1, '2025-11-14 05:18:08'),
(58, 39, 37, 'sup sun?', '2025-10-30 14:50:48', 1, '2025-11-14 05:18:08'),
(59, 37, 39, 'sup nik', '2025-10-30 14:51:04', 1, '2025-11-18 00:22:43'),
(60, 39, 37, 'sup niko', '2025-10-30 15:10:34', 1, '2025-11-14 05:18:08'),
(61, 37, 39, 'goodeve', '2025-10-30 20:42:36', 1, '2025-11-18 00:22:43'),
(62, 39, 37, 'goodeve din', '2025-10-30 20:43:26', 1, '2025-11-14 05:18:08'),
(63, 37, 39, 'typing...', '2025-10-30 20:45:44', 1, '2025-11-18 00:22:43'),
(64, 39, 37, 'test typing', '2025-10-30 20:46:38', 1, '2025-11-14 05:18:08'),
(65, 37, 39, 'diko nakikita yung 3dots hahah', '2025-10-30 20:47:07', 1, '2025-11-18 00:22:43'),
(66, 39, 37, 'nye haha', '2025-10-30 20:48:07', 1, '2025-11-14 05:18:08'),
(67, 37, 39, 'eto try natin console', '2025-10-30 20:59:44', 1, '2025-11-18 00:22:43'),
(68, 39, 37, 'gesi gesi', '2025-10-30 20:59:58', 1, '2025-11-14 05:18:08'),
(69, 39, 37, 'testing testing', '2025-10-30 21:15:02', 1, '2025-11-14 05:18:08'),
(70, 37, 39, 'alaws naman hahah', '2025-10-30 21:15:21', 1, '2025-11-18 00:22:43'),
(71, 37, 39, 'fvsvs', '2025-10-30 21:36:18', 1, '2025-11-18 00:22:43'),
(72, 37, 39, 'gumana na hahaha ayos', '2025-10-30 21:40:09', 1, '2025-11-18 00:22:43'),
(73, 39, 37, 'hahaha oo nga', '2025-10-30 21:40:25', 1, '2025-11-14 05:18:08'),
(74, 37, 39, 'testing 3dots bouncing', '2025-10-30 22:16:40', 1, '2025-11-18 00:22:43'),
(75, 39, 37, 'wala sa labas ng profile hahah', '2025-10-30 22:16:59', 1, '2025-11-14 05:18:08'),
(76, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43'),
(77, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43'),
(78, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43'),
(79, 37, 39, 'wala hahaha umay bakit wala', '2025-10-30 22:18:24', 1, '2025-11-18 00:22:43'),
(80, 39, 37, 'idont kniw hahahaha', '2025-10-30 22:21:30', 1, '2025-11-14 05:18:08'),
(81, 37, 39, 'goodmorning', '2025-10-31 06:20:31', 1, '2025-11-18 00:22:43'),
(82, 39, 37, 'goodmorning', '2025-10-31 06:20:43', 1, '2025-11-14 05:18:08'),
(83, 39, 37, 'test123', '2025-10-31 06:51:50', 1, '2025-11-14 05:18:08'),
(84, 37, 39, 'okie okei sana gumana', '2025-10-31 06:52:13', 1, '2025-11-18 00:22:43'),
(85, 39, 37, 'gumana na hahah thankyou Lord', '2025-10-31 06:52:40', 1, '2025-11-14 05:18:08'),
(86, 37, 39, 'yun sa wakas kaso naka invalidate date hahah may error na aayusin nanaman hahaha', '2025-10-31 06:53:29', 1, '2025-11-18 00:22:43'),
(87, 37, 39, 'timestamp test', '2025-10-31 07:08:40', 1, '2025-11-18 00:22:43'),
(88, 39, 37, 'oka na hahaha di na invalid date sa wakas', '2025-10-31 07:09:06', 1, '2025-11-14 05:18:08'),
(89, 37, 39, 'wait a minute haha', '2025-10-31 07:09:31', 1, '2025-11-18 00:22:43'),
(90, 39, 37, 'bakit', '2025-10-31 07:09:39', 1, '2025-11-14 05:18:08'),
(91, 39, 37, 'test123', '2025-10-31 07:10:15', 1, '2025-11-14 05:18:08'),
(92, 37, 39, 'test123', '2025-10-31 07:10:23', 1, '2025-11-18 00:22:43'),
(93, 37, 39, 'hahaha ang kulet', '2025-10-31 07:10:56', 1, '2025-11-18 00:22:43'),
(94, 37, 39, 'umay kala ko ok na', '2025-10-31 07:11:39', 1, '2025-11-18 00:22:43'),
(95, 39, 37, 'nyeknyek', '2025-10-31 07:11:50', 1, '2025-11-14 05:18:08'),
(96, 39, 37, 'testing', '2025-10-31 07:24:46', 1, '2025-11-14 05:18:08'),
(97, 37, 39, 'niloloko tyo ng gawa natin hahah', '2025-10-31 07:25:13', 1, '2025-11-18 00:22:43'),
(98, 39, 37, 'kaya nga haha', '2025-10-31 07:25:53', 1, '2025-11-14 05:18:08'),
(99, 39, 37, 'sana gumana', '2025-10-31 07:34:45', 1, '2025-11-14 05:18:08'),
(100, 37, 39, 'ok na gumana na sa waakas', '2025-10-31 07:34:58', 1, '2025-11-18 00:22:43'),
(101, 37, 39, 'umay', '2025-10-31 07:35:32', 1, '2025-11-18 00:22:43'),
(102, 39, 37, 'umay', '2025-10-31 07:35:42', 1, '2025-11-14 05:18:08'),
(103, 37, 39, 'haysst', '2025-10-31 07:36:35', 1, '2025-11-18 00:22:43'),
(104, 39, 37, 'huhu', '2025-10-31 07:37:00', 1, '2025-11-14 05:18:08'),
(105, 37, 39, 'haha', '2025-10-31 07:42:20', 1, '2025-11-18 00:22:43'),
(106, 39, 37, 'huhu', '2025-10-31 07:42:29', 1, '2025-11-14 05:18:08'),
(107, 37, 39, 'hahah', '2025-10-31 07:42:40', 1, '2025-11-18 00:22:43'),
(108, 37, 39, 'test', '2025-10-31 07:45:18', 1, '2025-11-18 00:22:43'),
(109, 39, 37, 'test', '2025-10-31 07:45:28', 1, '2025-11-14 05:18:08'),
(110, 37, 39, 'ee', '2025-10-31 07:45:38', 1, '2025-11-18 00:22:43'),
(111, 39, 37, 'eee', '2025-10-31 07:45:44', 1, '2025-11-14 05:18:08'),
(112, 37, 39, 'gulo ni gpt', '2025-10-31 08:08:13', 1, '2025-11-18 00:22:43'),
(113, 39, 37, 'kayan ga ee kakabaliw', '2025-10-31 08:08:24', 1, '2025-11-14 05:18:08'),
(114, 37, 39, 'testing', '2025-10-31 09:37:18', 1, '2025-11-18 00:22:43'),
(115, 39, 37, 'ok naman lahat sa ngaun hahah', '2025-10-31 09:37:30', 1, '2025-11-14 05:18:08'),
(116, 37, 39, 'yung invalid date parin pero mabuti naman maayos na structure ng spa', '2025-10-31 09:37:54', 1, '2025-11-18 00:22:43'),
(117, 37, 39, 'testt', '2025-10-31 11:08:26', 1, '2025-11-18 00:22:43'),
(118, 37, 39, 'dcd', '2025-10-31 13:20:18', 1, '2025-11-18 00:22:43'),
(119, 39, 37, 'testing ulit hahah', '2025-10-31 14:22:45', 1, '2025-11-14 05:18:08'),
(120, 37, 39, 'pagod nako', '2025-10-31 17:15:51', 1, '2025-11-18 00:22:43'),
(121, 39, 37, 'same', '2025-10-31 17:16:01', 1, '2025-11-14 05:18:08'),
(122, 39, 37, 'testing online 12', '2025-10-31 17:44:40', 1, '2025-11-14 05:18:08'),
(123, 37, 39, 'wala parin', '2025-10-31 17:44:53', 1, '2025-11-18 00:22:43'),
(124, 37, 39, 'borat', '2025-10-31 20:18:38', 1, '2025-11-18 00:22:43'),
(125, 37, 39, 'ggbfdf', '2025-10-31 20:19:19', 1, '2025-11-18 00:22:43'),
(126, 37, 39, 'goodmorning', '2025-11-01 08:15:48', 1, '2025-11-18 00:22:43'),
(127, 39, 37, 'offline ka hhahaah', '2025-11-01 08:15:58', 1, '2025-11-14 05:18:08'),
(128, 39, 37, 'online check', '2025-11-01 10:44:51', 1, '2025-11-14 05:18:08'),
(129, 37, 39, 'wala offline parin hahah', '2025-11-01 10:45:00', 1, '2025-11-18 00:22:43'),
(130, 37, 39, 'testing testing', '2025-11-02 05:12:40', 1, '2025-11-18 00:22:43'),
(131, 39, 37, 'okie oike', '2025-11-02 05:12:47', 1, '2025-11-14 05:18:08'),
(132, 37, 39, 'green', '2025-11-02 05:59:52', 1, '2025-11-18 00:22:43'),
(133, 39, 37, 'gray', '2025-11-02 05:59:58', 1, '2025-11-14 05:18:08'),
(134, 39, 37, 'ee', '2025-11-02 06:00:38', 1, '2025-11-14 05:18:08'),
(135, 39, 37, 'testing', '2025-11-02 06:54:19', 1, '2025-11-14 05:18:08'),
(136, 37, 39, 'nawala naman profile mo haha', '2025-11-02 06:54:30', 1, '2025-11-18 00:22:43'),
(137, 37, 39, 'milo testing', '2025-11-02 06:58:49', 1, '2025-11-18 00:22:43'),
(138, 39, 37, 'sira pa', '2025-11-02 06:58:57', 1, '2025-11-14 05:18:08'),
(139, 39, 37, 'tisting', '2025-11-02 07:08:23', 1, '2025-11-14 05:18:08'),
(140, 39, 37, 'dsvvs', '2025-11-02 07:09:22', 1, '2025-11-14 05:18:08'),
(141, 39, 37, 'vbr', '2025-11-02 07:09:41', 1, '2025-11-14 05:18:08'),
(142, 37, 39, 'f', '2025-11-02 07:15:53', 1, '2025-11-18 00:22:43'),
(143, 37, 39, 'u', '2025-11-02 07:15:58', 1, '2025-11-18 00:22:43'),
(144, 39, 37, 'u', '2025-11-02 07:16:02', 1, '2025-11-14 05:18:08'),
(145, 39, 37, 'f', '2025-11-02 07:16:05', 1, '2025-11-14 05:18:08'),
(146, 39, 37, 'bg', '2025-11-02 07:17:56', 1, '2025-11-14 05:18:08'),
(147, 37, 39, 'vf', '2025-11-02 07:18:00', 1, '2025-11-18 00:22:43'),
(148, 37, 39, 'brrr', '2025-11-02 07:33:10', 1, '2025-11-18 00:22:43'),
(149, 39, 37, 'ggg', '2025-11-02 07:33:31', 1, '2025-11-14 05:18:08'),
(150, 39, 37, 'gsd', '2025-11-02 07:37:05', 1, '2025-11-14 05:18:08'),
(151, 37, 39, 'dasddd', '2025-11-02 07:37:19', 1, '2025-11-18 00:22:43'),
(152, 37, 39, 'ddddd', '2025-11-02 07:37:38', 1, '2025-11-18 00:22:43'),
(153, 39, 37, 'bdfvdccasa', '2025-11-02 07:37:47', 1, '2025-11-14 05:18:08'),
(154, 37, 39, 'ddd', '2025-11-02 07:42:50', 1, '2025-11-18 00:22:43'),
(155, 39, 37, 'ss', '2025-11-02 07:42:54', 1, '2025-11-14 05:18:08'),
(156, 39, 37, 'fff', '2025-11-02 08:41:22', 1, '2025-11-14 05:18:08'),
(157, 39, 37, 'www', '2025-11-02 08:48:14', 1, '2025-11-14 05:18:08'),
(158, 37, 39, 'www', '2025-11-02 08:48:17', 1, '2025-11-18 00:22:43'),
(159, 39, 37, 'qqqq', '2025-11-02 08:48:56', 1, '2025-11-14 05:18:08'),
(160, 37, 39, 'ttttt', '2025-11-02 08:49:03', 1, '2025-11-18 00:22:43'),
(161, 39, 37, 'fff', '2025-11-02 09:16:54', 1, '2025-11-14 05:18:08'),
(162, 37, 39, 'ahaha', '2025-11-02 11:02:36', 1, '2025-11-18 00:22:43'),
(163, 39, 37, 'ahahaha', '2025-11-02 11:02:44', 1, '2025-11-14 05:18:08'),
(164, 37, 40, 'hi mr inspector', '2025-11-02 13:57:41', 1, '2025-11-14 04:45:26'),
(165, 40, 37, 'hilo', '2025-11-02 13:58:07', 1, '2025-11-14 02:02:56'),
(166, 37, 39, 'push ko na to haha', '2025-11-02 18:36:01', 1, '2025-11-18 00:22:43'),
(167, 39, 37, 'sge sge', '2025-11-02 18:36:15', 1, '2025-11-14 05:18:08'),
(168, 37, 39, 'ang cute prehahahah', '2025-11-03 17:44:42', 1, '2025-11-18 00:22:43'),
(169, 39, 37, 'hahah oo kaso wala yung typing indicator', '2025-11-03 17:44:58', 1, '2025-11-14 05:18:08'),
(170, 37, 39, 'pre haha anyare?', '2025-11-03 18:07:43', 1, '2025-11-18 00:22:43'),
(171, 39, 37, 'idk haha', '2025-11-03 18:07:51', 1, '2025-11-14 05:18:08'),
(172, 37, 39, 'vvvfvfvscxxxxxxxxx', '2025-11-04 09:41:38', 1, '2025-11-18 00:22:43'),
(173, 39, 37, 'ok na ahahahahahahahahahahaha', '2025-11-04 09:59:42', 1, '2025-11-14 05:18:08'),
(174, 39, 37, 'testing', '2025-11-04 10:05:30', 1, '2025-11-14 05:18:08'),
(175, 37, 39, 'wala nawala yung bouncing hahah', '2025-11-04 10:05:45', 1, '2025-11-18 00:22:43'),
(176, 37, 39, 'sssssss', '2025-11-04 12:40:42', 1, '2025-11-18 00:22:43'),
(177, 39, 37, 'cvdvccs', '2025-11-04 12:48:16', 1, '2025-11-14 05:18:08'),
(178, 39, 37, 'saana', '2025-11-04 12:50:25', 1, '2025-11-14 05:18:08'),
(179, 39, 37, '22', '2025-11-04 18:50:49', 1, '2025-11-14 05:18:08'),
(180, 37, 39, '2323232323', '2025-11-04 19:12:59', 1, '2025-11-18 00:22:43'),
(181, 39, 37, 'wala pa yung 3dot bouncing man', '2025-11-04 19:13:26', 1, '2025-11-14 05:18:08'),
(182, 37, 39, 'wala parin', '2025-11-04 19:30:08', 1, '2025-11-18 00:22:43'),
(183, 39, 37, 'bakit hahaha', '2025-11-04 19:30:15', 1, '2025-11-14 05:18:08'),
(184, 39, 37, 'gumana ka haha wala parin', '2025-11-04 19:41:07', 1, '2025-11-14 05:18:08'),
(185, 37, 39, 'tert', '2025-11-04 19:42:42', 1, '2025-11-18 00:22:43'),
(186, 39, 37, 'dddddds', '2025-11-04 19:53:53', 1, '2025-11-14 05:18:08'),
(187, 39, 37, 'ww', '2025-11-05 05:11:16', 1, '2025-11-14 05:18:08'),
(188, 37, 39, 'eee', '2025-11-05 05:11:21', 1, '2025-11-18 00:22:43'),
(189, 39, 37, 'dcdcsd', '2025-11-05 05:24:26', 1, '2025-11-14 05:18:08'),
(190, 39, 37, 'wow ite wroking now hahaha', '2025-11-05 05:28:48', 1, '2025-11-14 05:18:08'),
(191, 37, 39, 'isee  i see', '2025-11-05 05:28:58', 1, '2025-11-18 00:22:43'),
(192, 39, 37, 'perfect', '2025-11-05 05:30:04', 1, '2025-11-14 05:18:08'),
(193, 37, 39, 'bat doble haha', '2025-11-05 05:30:14', 1, '2025-11-18 00:22:43'),
(194, 39, 37, 'bug siguro na refresh ko naman hahaha', '2025-11-05 05:30:47', 1, '2025-11-14 05:18:08'),
(195, 39, 37, 'goodmorning', '2025-11-05 05:59:05', 1, '2025-11-14 05:18:08'),
(196, 37, 39, 'duplicate test 123', '2025-11-05 06:25:37', 1, '2025-11-18 00:22:43'),
(197, 39, 37, '332221', '2025-11-05 06:35:37', 1, '2025-11-14 05:18:08'),
(198, 37, 39, '11122233', '2025-11-05 06:50:36', 1, '2025-11-18 00:22:43'),
(199, 37, 39, '22222', '2025-11-05 07:08:05', 1, '2025-11-18 00:22:43'),
(200, 39, 37, '33333', '2025-11-05 07:08:15', 1, '2025-11-14 05:18:08'),
(201, 37, 39, '111111', '2025-11-05 07:08:20', 1, '2025-11-18 00:22:43'),
(202, 39, 37, '222222', '2025-11-09 10:38:43', 1, '2025-11-14 05:18:08'),
(203, 37, 39, '3333', '2025-11-09 10:38:48', 1, '2025-11-18 00:22:43'),
(204, 39, 37, 'goodmorning', '2025-11-10 08:17:06', 1, '2025-11-14 05:18:08'),
(205, 37, 39, 'goodmorning', '2025-11-10 08:17:18', 1, '2025-11-18 00:22:43'),
(206, 39, 37, 'huhhaha', '2025-11-10 09:43:53', 1, '2025-11-14 05:18:08'),
(207, 37, 39, 'huhuahah', '2025-11-10 09:44:00', 1, '2025-11-18 00:22:43'),
(208, 37, 39, 'ok na hahha', '2025-11-10 09:49:38', 1, '2025-11-18 00:22:43'),
(209, 39, 37, 'goodmorning', '2025-11-11 10:26:48', 1, '2025-11-14 05:18:08'),
(210, 39, 37, 'hello', '2025-11-11 10:26:57', 1, '2025-11-14 05:18:08'),
(211, 40, 37, 'sup?', '2025-11-12 17:25:00', 1, '2025-11-14 02:02:56'),
(212, 37, 40, 'sup?', '2025-11-12 17:25:33', 1, '2025-11-14 04:45:26'),
(213, 40, 37, 'hi there', '2025-11-14 10:01:18', 1, '2025-11-14 02:02:56'),
(214, 37, 40, 'hello', '2025-11-14 10:02:21', 1, '2025-11-14 04:45:26'),
(215, 40, 37, 'hi', '2025-11-14 10:02:42', 1, '2025-11-14 02:02:56'),
(216, 40, 37, 'meow', '2025-11-14 10:05:26', 1, '2025-11-14 05:18:11'),
(217, 40, 37, 'meow', '2025-11-14 10:05:57', 1, '2025-11-14 05:18:11'),
(218, 37, 40, 'awaw', '2025-11-14 10:17:34', 1, '2025-11-14 04:45:26'),
(219, 37, 40, 'awawawawaw', '2025-11-14 10:18:40', 1, '2025-11-14 04:45:26'),
(220, 37, 40, 'wowowow', '2025-11-14 10:20:34', 1, '2025-11-14 04:45:26'),
(221, 40, 37, 'wewewewewew', '2025-11-14 10:48:13', 1, '2025-11-14 05:18:11'),
(222, 37, 40, 'hohohoho', '2025-11-14 11:02:06', 1, '2025-11-14 04:45:26'),
(223, 37, 40, 'heheheeh', '2025-11-14 11:02:45', 1, '2025-11-14 04:45:26'),
(224, 37, 40, 'hihi', '2025-11-14 11:04:00', 1, '2025-11-14 04:45:26'),
(225, 37, 40, 'huhuhaha', '2025-11-14 11:15:57', 1, '2025-11-14 04:45:26'),
(226, 40, 37, 'huhuhaha', '2025-11-14 11:16:58', 1, '2025-11-14 05:18:11'),
(227, 40, 37, 'huhuhaha', '2025-11-14 11:17:20', 1, '2025-11-14 05:18:11'),
(228, 40, 37, 'ereretddd', '2025-11-14 11:44:23', 1, '2025-11-14 05:18:11'),
(229, 40, 37, 'wefergrbg', '2025-11-14 11:44:40', 1, '2025-11-14 05:18:11'),
(230, 40, 37, 'svebwfw', '2025-11-14 11:47:47', 1, '2025-11-14 05:18:11'),
(231, 37, 40, 'testing', '2025-11-14 12:01:02', 1, '2025-11-14 04:45:26'),
(232, 37, 40, 'testing again', '2025-11-14 12:12:05', 1, '2025-11-14 04:45:26'),
(233, 40, 37, 'testitng', '2025-11-14 12:27:30', 1, '2025-11-14 05:18:11'),
(234, 40, 37, 'testing', '2025-11-14 12:45:32', 1, '2025-11-14 05:18:11'),
(235, 40, 37, 'grrrrrrr', '2025-11-14 12:48:10', 1, '2025-11-14 05:18:11'),
(236, 40, 37, 'yow', '2025-11-14 13:18:23', 1, '2025-11-14 14:02:56'),
(237, 40, 37, 'goodmorning', '2025-11-17 07:09:13', 1, '2025-11-16 23:09:50'),
(238, 40, 37, 'dfrghh', '2025-11-17 07:41:53', 1, '2025-11-16 23:44:43'),
(239, 37, 40, 'dgnyj', '2025-11-17 07:51:10', 1, '2025-11-16 23:51:20'),
(240, 40, 37, 'awawawaw', '2025-11-17 07:58:07', 1, '2025-11-17 00:01:54'),
(241, 37, 40, 'dhbsdchbca', '2025-11-17 08:05:28', 1, '2025-11-17 00:05:45'),
(242, 40, 37, 'fhdhkwdvd', '2025-11-17 08:06:01', 1, '2025-11-17 00:06:17'),
(243, 40, 37, 'milo', '2025-11-17 08:07:47', 1, '2025-11-17 00:07:58'),
(244, 40, 37, 'nila', '2025-11-17 08:09:55', 1, '2025-11-17 00:10:40'),
(245, 40, 37, 'mila', '2025-11-17 08:18:26', 1, '2025-11-17 00:18:35'),
(246, 37, 40, 'fhkbrfevdlk', '2025-11-17 08:34:33', 1, '2025-11-17 00:34:41'),
(247, 40, 37, 'gorvjfuhjkdscs', '2025-11-17 08:39:58', 1, '2025-11-17 00:40:07'),
(248, 37, 40, 'dbogfcnwierldsc', '2025-11-17 08:40:52', 1, '2025-11-17 00:41:00'),
(249, 40, 37, 'bwahahahaha', '2025-11-17 10:18:17', 1, '2025-11-17 03:04:20'),
(250, 40, 37, 'testing123', '2025-11-17 11:04:08', 1, '2025-11-17 03:04:20'),
(251, 40, 37, '123test', '2025-11-17 11:04:37', 1, '2025-11-17 03:05:17'),
(252, 40, 37, 'sdveb', '2025-11-17 11:05:30', 1, '2025-11-17 03:06:24'),
(253, 40, 37, 'vefbv', '2025-11-17 11:06:08', 1, '2025-11-17 03:06:24'),
(254, 40, 37, 'sdvef', '2025-11-17 11:06:32', 1, '2025-11-17 03:08:00'),
(255, 40, 37, 'sdvefbds', '2025-11-17 11:08:04', 1, '2025-11-17 03:28:00'),
(256, 40, 37, 'dfbnthnbfvec', '2025-11-17 11:27:40', 1, '2025-11-17 03:28:00'),
(257, 37, 40, 'sdgyjtbfvbh', '2025-11-17 11:28:06', 1, '2025-11-17 03:28:42'),
(258, 37, 40, 'dsbgnhnh', '2025-11-17 11:28:27', 1, '2025-11-17 03:28:42'),
(259, 37, 40, 'dfbthj', '2025-11-17 11:28:49', 1, '2025-11-17 03:30:47'),
(260, 37, 40, 'hyhyhyhy', '2025-11-17 11:30:21', 1, '2025-11-17 03:30:47'),
(261, 40, 37, 'jvjdcdc', '2025-11-17 11:30:54', 1, '2025-11-17 03:32:12'),
(262, 37, 40, 'dhvsdjv', '2025-11-17 11:31:03', 1, '2025-11-17 03:31:21'),
(263, 37, 40, 'csd', '2025-11-17 11:31:09', 1, '2025-11-17 03:31:21'),
(264, 37, 40, 'dvfbfd', '2025-11-17 11:31:25', 1, '2025-11-17 03:32:22'),
(265, 40, 37, 'fgmhnfg', '2025-11-17 11:32:28', 1, '2025-11-17 23:47:41'),
(266, 37, 40, 'dgfhdfdfd', '2025-11-17 11:32:56', 1, '2025-11-17 23:47:24'),
(267, 40, 37, 'goodmorning', '2025-11-18 07:47:31', 1, '2025-11-17 23:47:41'),
(268, 37, 40, 'goodmorning din', '2025-11-18 07:47:49', 1, '2025-11-17 23:48:28'),
(269, 40, 37, 'nagkaon kna', '2025-11-18 07:49:01', 1, '2025-11-17 23:51:43'),
(270, 37, 40, 'hndi pa', '2025-11-18 07:51:55', 1, '2025-11-18 00:20:01'),
(271, 40, 37, 'bakit', '2025-11-18 08:20:05', 1, '2025-11-18 00:20:22'),
(272, 37, 40, 'ewan', '2025-11-18 08:20:30', 1, '2025-11-18 00:21:08'),
(273, 40, 37, 'hahahaha', '2025-11-18 08:20:42', 1, '2025-11-18 00:21:01'),
(274, 39, 37, 'musta', '2025-11-18 08:22:50', 1, '2025-11-18 00:23:37'),
(275, 39, 37, 'seen?', '2025-11-18 08:23:49', 1, '2025-11-18 00:24:08'),
(276, 37, 39, 'uy hahaha', '2025-11-18 08:24:13', 1, '2025-11-18 00:24:22'),
(277, 37, 39, 'huhuhaha', '2025-11-18 08:42:40', 1, '2025-11-18 00:42:48'),
(278, 39, 37, 'huuhuhahha', '2025-11-18 08:43:04', 1, '2025-11-18 00:44:07'),
(279, 37, 39, 'ok naba?', '2025-11-18 08:43:20', 1, '2025-11-18 00:59:03'),
(280, 39, 37, 'i think so', '2025-11-18 08:43:37', 1, '2025-11-18 00:44:07'),
(281, 37, 39, 'testing', '2025-11-18 08:43:44', 1, '2025-11-18 00:59:03'),
(282, 39, 37, 'testing123', '2025-11-18 08:59:09', 1, '2025-11-18 00:59:18'),
(283, 37, 39, 'next naman hahah', '2025-11-18 08:59:27', 1, '2025-11-18 00:59:57'),
(284, 39, 37, 'medyo ok naman so far so good', '2025-11-18 08:59:52', 1, '2025-11-18 00:59:55'),
(285, 37, 39, 'goods yan hahah', '2025-11-18 09:00:09', 1, '2025-11-18 01:00:14'),
(286, 37, 39, 'damn ok na hahaha', '2025-11-18 09:00:27', 1, '2025-11-18 01:00:40'),
(287, 39, 37, 'nicenice', '2025-11-18 09:00:36', 1, '2025-11-18 01:00:47'),
(288, 40, 37, 'testing', '2025-11-18 10:24:28', 1, '2025-11-18 02:25:02'),
(289, 37, 40, 'gdfgdfgdffgg', '2025-11-18 10:25:34', 1, '2025-11-18 02:26:11'),
(290, 40, 37, 'dfgghhhg', '2025-11-18 10:26:25', 1, '2025-11-18 02:26:50'),
(291, 14, 16, 'message nga', '2026-02-22 14:59:14', 1, '2026-02-22 07:07:20'),
(292, 16, 14, 'try lang', '2026-02-22 15:07:37', 1, '2026-02-22 07:10:01'),
(293, 16, 14, 'sige nga', '2026-02-22 15:10:06', 1, '2026-02-22 07:55:31'),
(294, 14, 16, 'okay', '2026-02-22 15:49:12', 1, '2026-02-22 07:49:52'),
(295, 8, 7, 'hey', '2026-03-02 14:28:21', 1, '2026-03-02 06:28:29'),
(296, 7, 8, 'titi', '2026-03-02 14:28:31', 1, '2026-03-02 06:28:40');

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
  `lyrics` text DEFAULT NULL
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
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `activity_type`, `source_user_id`, `post_id`, `created_at`) VALUES
(34, 29, 'like', 30, 79, '2025-06-02 13:19:04'),
(35, 29, 'comment', 30, 79, '2025-06-02 13:19:22'),
(36, 29, 'like', 30, 80, '2025-06-02 13:24:16'),
(38, 29, 'comment', 31, 80, '2025-06-02 13:25:51'),
(39, 29, 'like', 31, 79, '2025-06-02 13:25:59'),
(40, 29, 'comment', 31, 79, '2025-06-02 13:26:09'),
(42, 30, 'repost', 31, 81, '2025-06-02 13:26:25'),
(43, 30, 'like', 31, 81, '2025-06-02 13:29:35'),
(44, 30, 'comment', 31, 81, '2025-06-02 13:29:43'),
(45, 29, 'like', 32, 79, '2025-06-02 13:33:04'),
(46, 31, 'follow', 32, NULL, '2025-06-02 13:33:18'),
(47, 31, 'like', 32, 83, '2025-06-02 13:34:05'),
(48, 31, 'repost', 32, 83, '2025-06-02 13:45:28'),
(49, 30, 'follow', 32, NULL, '2025-06-02 15:18:55'),
(50, 32, 'follow', 34, NULL, '2025-06-02 19:21:05'),
(51, 32, 'follow', 33, NULL, '2025-06-02 19:25:05'),
(52, 31, 'follow', 33, NULL, '2025-06-02 19:25:13'),
(53, 34, 'follow', 32, NULL, '2025-06-02 23:38:48'),
(54, 31, 'repost', 34, 83, '2025-06-05 20:32:01'),
(55, 31, 'like', 34, 83, '2025-06-05 20:32:04'),
(56, 36, 'follow', 32, NULL, '2025-06-05 21:38:49'),
(57, 39, 'follow', 37, NULL, '2025-10-29 19:46:37'),
(58, 37, 'follow', 39, NULL, '2025-10-30 06:06:36'),
(59, 40, 'follow', 37, NULL, '2025-11-02 13:55:55'),
(60, 39, 'follow', 40, NULL, '2025-11-02 13:56:30'),
(61, 37, 'follow', 40, NULL, '2025-11-02 13:56:37'),
(62, 40, 'follow', 39, NULL, '2025-11-02 13:59:19'),
(63, 37, 'follow', 41, NULL, '2025-11-02 14:03:23'),
(64, 39, 'follow', 41, NULL, '2025-11-02 14:03:27'),
(65, 40, 'follow', 41, NULL, '2025-11-02 14:03:32'),
(66, 41, 'follow', 39, NULL, '2025-11-02 14:03:49'),
(67, 41, 'follow', 40, NULL, '2025-11-02 14:04:43'),
(68, 41, 'follow', 37, NULL, '2025-11-02 14:05:21'),
(69, 37, 'follow', 42, NULL, '2025-11-02 14:07:18'),
(70, 39, 'follow', 42, NULL, '2025-11-02 14:07:25'),
(71, 40, 'follow', 42, NULL, '2025-11-02 14:07:29'),
(72, 41, 'follow', 42, NULL, '2025-11-02 14:07:35'),
(73, 42, 'follow', 40, NULL, '2025-11-02 14:07:57'),
(74, 42, 'follow', 39, NULL, '2025-11-02 14:09:05'),
(75, 42, 'follow', 37, NULL, '2025-11-02 14:09:38'),
(76, 42, 'follow', 41, NULL, '2025-11-02 14:10:06'),
(77, 37, 'comment', 14, 91, '2026-02-20 11:55:58'),
(78, 37, 'comment', 14, 91, '2026-02-20 11:56:57'),
(79, 40, 'comment', 14, 90, '2026-02-20 11:57:33'),
(80, 14, 'repost', 14, 94, '2026-02-20 12:39:51'),
(81, 14, 'repost', 14, 93, '2026-02-20 12:40:15'),
(82, 14, 'repost', 14, 92, '2026-02-20 12:51:53'),
(83, 14, 'follow', 16, NULL, '2026-02-20 15:23:55'),
(84, 14, 'repost', 14, 92, '2026-02-20 15:37:05'),
(85, 14, 'repost', 14, 92, '2026-02-20 15:37:05'),
(86, 14, 'repost', 16, 100, '2026-02-20 15:44:19'),
(87, 14, 'repost', 16, 96, '2026-02-20 15:46:40'),
(88, 16, 'repost', 14, 106, '2026-02-20 16:00:23'),
(89, 14, 'repost', 16, 105, '2026-02-20 16:16:54'),
(90, 14, 'follow', 16, NULL, '2026-02-20 16:28:05'),
(91, 14, 'like', 16, 105, '2026-02-22 16:26:55'),
(92, 9, 'follow', 16, NULL, '2026-02-22 16:27:15'),
(93, 14, 'warning', 1, NULL, '2026-03-02 14:25:14'),
(94, 8, 'follow', 7, NULL, '2026-03-02 14:28:05'),
(95, 7, 'warning', 1, NULL, '2026-03-02 14:29:27'),
(96, 8, 'warning', 1, NULL, '2026-03-02 14:57:52'),
(97, 8, 'suspended', 1, NULL, '2026-03-02 15:01:21'),
(98, 8, 'suspended', 1, NULL, '2026-03-02 15:11:08'),
(105, 16, 'like', 7, 106, '2026-03-02 21:37:45'),
(106, 16, 'like', 7, 106, '2026-03-02 21:37:45'),
(107, 16, 'like', 7, 106, '2026-03-02 21:37:45'),
(108, 14, 'like', 7, 105, '2026-03-02 21:38:02'),
(109, 8, 'like', 7, 111, '2026-03-02 21:39:26'),
(111, 8, 'like', 7, 110, '2026-03-02 21:39:30');

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
(1, 10, 1, 100.00, 120.00, 220.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Santa Maria\",\"barangay\":\"Sta. Cruz\",\"zip\":\"2222\"}', 'pending', '2026-02-05 09:18:49'),
(2, 10, 1, 1499.00, 120.00, 1619.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Paombong\",\"barangay\":\"Poblacion\",\"zip\":\"2004\"}', 'pending', '2026-02-05 10:59:58'),
(3, 10, 1, 100.00, 120.00, 220.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Santa Maria\",\"barangay\":\"Sta. Cruz\",\"zip\":\"2003\"}', 'pending', '2026-02-06 09:49:51'),
(4, 7, 1, 1999.00, 120.00, 2119.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Pandi\",\"barangay\":\"Poblacion\",\"zip\":\"123\"}', 'pending', '2026-02-07 10:55:35'),
(5, 7, 0, 2500.00, 0.00, 2500.00, 'cod', '{\"street\":\"kjfkdjfkdsj\",\"region\":\"0700000000\",\"province\":\"Bohol\",\"city\":\"Carmen\",\"barangay\":\"Buenos Aires\",\"zip\":\"skdaskjdas\"}', 'pending', '2026-02-28 22:02:28'),
(6, 7, 0, 2798.00, 0.00, 2798.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Santa Maria\",\"barangay\":\"Sta. Cruz\",\"zip\":\"3022\"}', 'pending', '2026-03-01 21:43:45'),
(7, 7, 0, 100.00, 95.00, 195.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Marilao\",\"barangay\":\"Prenza I\",\"zip\":\"1212\"}', 'pending', '2026-03-01 22:15:11'),
(8, 7, 0, 100.00, 200.00, 300.00, 'cod', '{\"street\":\"sjfdasjf\",\"region\":\"1600000000\",\"province\":\"Agusan del Sur\",\"city\":\"Santa Josefa\",\"barangay\":\"San Jose\",\"zip\":\"123\"}', 'completed', '2026-03-01 23:10:20'),
(9, 7, 0, 100.00, 100.00, 200.00, 'cod', '{\"street\":\"Sooma b 18 lot 100\\nSooma b 18 lot 100\",\"region\":\"0300000000\",\"province\":\"Bulacan\",\"city\":\"Balagtas\",\"barangay\":\"Santol\",\"zip\":\"1212\"}', 'completed', '2026-03-02 00:08:09');

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
(1, 1, 1, 1, 1, 100.00, 100.00, '2026-02-05 09:18:49'),
(2, 2, 3, 7, 1, 1499.00, 1499.00, '2026-02-05 10:59:58'),
(3, 3, 1, 1, 1, 100.00, 100.00, '2026-02-06 09:49:51'),
(4, 4, 3, 7, 1, 1499.00, 1499.00, '2026-02-07 10:55:35'),
(5, 4, 4, 10, 1, 500.00, 500.00, '2026-02-07 10:55:35'),
(6, 5, 4, 10, 5, 500.00, 2500.00, '2026-02-28 22:02:28'),
(7, 6, 2, 4, 1, 1299.00, 1299.00, '2026-03-01 21:43:45'),
(8, 6, 3, 7, 1, 1499.00, 1499.00, '2026-03-01 21:43:45'),
(9, 7, 5, 11, 1, 100.00, 100.00, '2026-03-01 22:15:11'),
(10, 8, 5, 11, 1, 100.00, 100.00, '2026-03-01 23:10:20'),
(11, 9, 5, 11, 1, 100.00, 100.00, '2026-03-02 00:08:09');

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
  `repost_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `posts`
--

INSERT INTO `posts` (`post_id`, `user_id`, `content`, `img_url`, `created_at`, `updated_at`, `repost_id`) VALUES
(79, 29, 'Multi Hyphenate', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748841295/uploads/axxgbm7rnfc9ka8nwe4g.jpg', '2025-06-02 13:14:42', '2025-06-02 13:14:42', NULL),
(80, 29, 'Summer Vacation', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748841418/uploads/jwmwhufyk39bnfzc6m9h.jpg', '2025-06-02 13:16:45', '2025-06-02 13:16:45', NULL),
(81, 30, 'Pantropico', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748841642/uploads/vffae4ruwqltxcc32ahp.jpg', '2025-06-02 13:20:30', '2025-06-02 13:20:30', NULL),
(82, 31, 'Pantropico', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748841642/uploads/vffae4ruwqltxcc32ahp.jpg', '2025-06-02 13:26:25', '2025-06-02 13:26:25', 81),
(83, 31, 'Okay lang talo atlis maganda', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748842081/uploads/tldux0btfavvw8iqffao.jpg', '2025-06-02 13:27:50', '2025-06-02 13:27:50', NULL),
(84, 32, 'Okay lang talo atlis maganda', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748842081/uploads/tldux0btfavvw8iqffao.jpg', '2025-06-02 13:45:28', '2025-06-02 13:45:28', 83),
(85, 34, 'Ganda mo Gwen Urggg', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748863403/uploads/tigqhhf8famkfvtnpt55.jpg', '2025-06-02 19:23:09', '2025-06-02 19:23:09', NULL),
(86, 33, 'So Beautiful', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748863506/uploads/unaaedanq1wqkksgwabx.jpg', '2025-06-02 19:24:52', '2025-06-02 19:24:52', NULL),
(87, 32, 'test1', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748914904/uploads/qkpzvp8tll6xeh8v6ztb.jpg', '2025-06-03 09:41:31', '2025-06-03 09:41:31', NULL),
(88, 34, 'Okay lang talo atlis maganda', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1748842081/uploads/tldux0btfavvw8iqffao.jpg', '2025-06-05 20:32:01', '2025-06-05 20:32:01', 83),
(89, 39, 'meow', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1761736156/uploads/gy1ifom6wwafq4tmjvut.jpg', '2025-10-29 19:10:15', '2025-10-29 19:10:15', NULL),
(90, 40, 'mrpogi', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1762060808/uploads/exesge3je68mxdtgudkf.jpg', '2025-11-02 13:20:10', '2025-11-02 13:20:10', NULL),
(91, 37, 'goodmorning everyone hehehe', NULL, '2025-11-09 08:23:34', '2025-11-09 08:23:34', NULL),
(92, 14, 'try', NULL, '2026-02-20 12:30:13', '2026-02-20 12:30:13', NULL),
(93, 14, 'hello', NULL, '2026-02-20 12:30:23', '2026-02-20 12:30:23', NULL),
(94, 14, 'hello guys', NULL, '2026-02-20 12:30:44', '2026-02-20 12:30:44', NULL),
(95, 14, 'huysss!', NULL, '2026-02-20 12:31:28', '2026-02-20 12:31:28', NULL),
(96, 14, 'hello', NULL, '2026-02-20 12:31:35', '2026-02-20 12:31:35', NULL),
(97, 14, 'hello guys', NULL, '2026-02-20 12:39:51', '2026-02-20 12:39:51', 94),
(98, 14, 'hello', NULL, '2026-02-20 12:40:15', '2026-02-20 12:40:15', 93),
(99, 14, 'try', NULL, '2026-02-20 12:51:53', '2026-02-20 12:51:53', 92),
(100, 14, '', NULL, '2026-02-20 12:53:40', '2026-02-20 12:53:40', NULL),
(101, 14, 'try', NULL, '2026-02-20 15:37:05', '2026-02-20 15:37:05', 92),
(102, 14, 'try', NULL, '2026-02-20 15:37:05', '2026-02-20 15:37:05', 92),
(103, 16, 'Original post content unavailable', NULL, '2026-02-20 15:44:19', '2026-02-20 15:44:19', 100),
(104, 16, 'hello', NULL, '2026-02-20 15:46:40', '2026-02-20 15:46:40', 96),
(105, 14, 'may post ako diba?', NULL, '2026-02-20 15:59:07', '2026-02-20 15:59:07', NULL),
(106, 16, 'try ko mag post', NULL, '2026-02-20 16:00:18', '2026-02-20 16:00:18', NULL),
(107, 14, 'try ko mag post', NULL, '2026-02-20 16:00:23', '2026-02-20 16:00:23', 106),
(108, 16, 'may post ako diba?', NULL, '2026-02-20 16:16:54', '2026-02-20 16:16:54', 105),
(110, 8, '', NULL, '2026-03-02 14:31:04', '2026-03-02 14:31:04', NULL),
(111, 8, 'jkjhkjhkj', NULL, '2026-03-02 14:49:26', '2026-03-02 14:49:26', NULL);

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
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `name`, `collection_id`, `product_category`, `image_url`, `created_at`) VALUES
(1, 'BINIverse World Tour - T-Shirt', 1, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINI_World_Tour_SHIRT_BACK.png?v=1738236935&width=493', '2025-12-24 19:18:04'),
(2, 'BiniFied T-shirt', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-TShirt-Back.png?v=1763017728&width=360', '2026-01-12 09:55:10'),
(3, 'BIniFied Pullover', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-LongSleeves-Front.png?v=1763018103&width=360', '2026-01-12 09:56:22'),
(4, 'BiniFied Cap', 3, 'Apparel', 'https://store.abs-cbn.com/cdn/shop/files/BINIfiedProductImages-Cap_0621ebe1-b936-4e6d-bead-bbd6a705980c.png?v=1763016405&width=360', '2026-01-12 09:57:07'),
(5, 'music muna itest baitn', 3, 'Accessories', NULL, '2026-03-01 22:02:03');

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
  `weight_g` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`variant_id`, `product_id`, `variant_name`, `variant_values`, `price`, `stock`, `weight_g`) VALUES
(1, 1, 'Size', 'Small', 100.00, 8, 0.00),
(2, 1, 'Size', 'Medium', 80.00, 10, 0.00),
(3, 1, 'Size', 'Large', 120.00, 10, 0.00),
(4, 2, 'Size', 'Small', 1299.00, 19, 0.00),
(5, 2, 'Size', 'Medium', 1500.00, 10, 0.00),
(6, 2, 'Size', 'Large', 2000.00, 20, 0.00),
(7, 3, 'Size', 'Small', 1499.00, 1, 0.00),
(8, 3, 'Size', 'Medium', 2000.00, 10, 0.00),
(9, 3, 'Size', 'Large', 3000.00, 10, 0.00),
(10, 4, 'Size', 'Small', 500.00, 14, 0.00),
(11, 5, 'size', 'small', 100.00, 7, 100.00);

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`report_id`, `reporter_id`, `reported_user_id`, `report_type`, `message_id`, `post_id`, `reason`, `status`, `admin_notes`, `created_at`, `updated_at`) VALUES
(1, 7, 14, 'post', NULL, 105, 'harassment', 'resolved', '[2026-03-02T06:25:14.205Z] admin:1 action:warning reason:Warning: 2 more reports and your account will be banned.', '2026-03-01 13:49:51', '2026-03-02 06:25:14'),
(2, 8, 7, 'chat', NULL, NULL, '', 'resolved', '[2026-03-02T06:29:27.809Z] admin:1 action:warning reason:Warning: 2 more reports and your account will be banned.', '2026-03-02 06:28:50', '2026-03-02 06:29:27'),
(3, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:31:43', '2026-03-02 07:11:08'),
(4, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:40:53', '2026-03-02 07:11:08'),
(5, 7, 8, 'post', NULL, 110, '', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:44:21', '2026-03-02 07:11:08'),
(6, 7, 8, 'post', NULL, 111, 'harassment', 'resolved', '[2026-03-02T07:11:08.210Z] admin:1 action:suspend reason:asd', '2026-03-02 06:49:36', '2026-03-02 07:11:08'),
(7, 7, 16, 'post', NULL, 106, 'harassment', 'pending', NULL, '2026-03-02 07:17:44', '2026-03-02 07:17:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
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

INSERT INTO `users` (`user_id`, `email`, `fullname`, `password`, `profile_picture`, `google_id`, `auth_provider`, `failed_login_attempts`, `role`, `created_at`, `reset_otp`, `reset_expr`) VALUES
(7, 'jamino179@gmail.com', 'jamin omar', 'a89cf4ac962edffef451ae5224b6e1d8baa423bb463b19e6d0dd597b95ff9b03', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772456514/uploads/jdtusc8g5dkbps7x3una.jpg', '108469309788281447418', 'google', 0, 'main_admin', '2025-12-24 21:05:53', NULL, NULL),
(8, 'mikoalvarado@gmail.com', 'miko alvarado', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'https://res.cloudinary.com/dv7b0rwzl/image/upload/v1772366832/uploads/bkiihsojcfyfi5eikvus.jpg', NULL, 'local', 0, 'customer', '2026-01-08 20:37:32', NULL, NULL),
(9, 'yvan@gmail.com', 'yvan mayor', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'customer', '2026-01-08 21:46:39', NULL, NULL),
(10, 'desd85531@gmail.com', 'des desdiaz', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'customer', '2026-01-28 12:13:18', NULL, NULL),
(14, 'wilson@gmail.com', 'esmabe wilson', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'https://lh3.googleusercontent.com/a/ACg8ocKNKFJ1FbHXcY6qyfUBswAS3DKCKoqFnJ0gCFo-iDRVslo_Cjw=s96-c', NULL, 'local', 0, 'customer', '2026-02-19 21:21:35', NULL, NULL),
(15, 'wilsonesmabe2003@gmail.com', 'Esmabe C.', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'none', NULL, 'local', 0, 'customer', '2026-02-20 13:07:01', NULL, NULL),
(16, 'bago@gmail.com', 'bago lang', '238ea4226235d4c825b55a957643f9ecc4577f8d9b8b2db0685ea0757ce884aa', 'https://lh3.googleusercontent.com/a/ACg8ocKYuFWwaCl-fkHACM9xrj7YN1TtUvW3tqotwTbqhyoDzhAeSg=s96-c', NULL, 'local', 1, 'main_admin', '2026-02-20 14:34:35', NULL, NULL),
(18, 'ericamayor0@gmail.com', 'Erica Mayor', 'ccc8530a8d8e6da4271206a1d9de829fc95a168e0bb643b2ba621a9be87624a7', 'https://lh3.googleusercontent.com/a/ACg8ocK5_6nucmu9lIdxMVnf9k6IiFxlPSIaSy2MyzXzfUfTpAKp8Nw=s96-c', NULL, 'local', 0, 'customer', '2026-03-01 11:24:24', NULL, NULL),
(20, 'justin@gmail.com', 'justin cortez', 'b7e1712ca5a4f6f90a3276915ed4df8ad1e1a3e1c781182eeb90be27768177ac', 'none', NULL, 'local', 0, 'main_admin', '2026-03-01 14:23:33', NULL, NULL),
(23, 'abesamischrisaaron@gmail.com', 'chris aaron Abesamis', '32f5113cad712e167da3d86f0c4a897fa90c90be30454251033c99e531a0afa8', 'https://lh3.googleusercontent.com/a/ACg8ocIPjf0OzIXL4YQIimgcariAenSwmPE3RDa6Xb1H5nIDlsCBU9E=s96-c', '108028491461499683145', 'google', 0, 'customer', '2026-03-01 15:06:37', NULL, NULL),
(24, 'marcyvanmayor@gmail.com', 'Marc Yvan Mayor', '73660e1b330919c10543e0862793e9e0a2d64b48c936d5705604067bafae0dfe', 'https://lh3.googleusercontent.com/a/ACg8ocLBGQL8_UTJeTN2WzHiPM27A31fDzA69naKCHNvqif3t6om1g=s96-c', '100596293037269441367', 'google', 0, 'customer', '2026-03-01 15:08:10', NULL, NULL);

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
(0, 8, 1, 'asd', '2026-03-02 15:01:21', '2026-03-05 15:11:08', 3, 'active', '2026-03-02 15:01:21', '2026-03-02 15:11:08');

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
  ADD PRIMARY KEY (`comment_id`);

--
-- Indexes for table `communities`
--
ALTER TABLE `communities`
  ADD PRIMARY KEY (`community_id`);

--
-- Indexes for table `community_threads`
--
ALTER TABLE `community_threads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `daily_revenue`
--
ALTER TABLE `daily_revenue`
  ADD UNIQUE KEY `uq_daily_revenue_order_id` (`order_id`);

--
-- Indexes for table `discography`
--
ALTER TABLE `discography`
  ADD PRIMARY KEY (`album_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`);

--
-- Indexes for table `follows`
--
ALTER TABLE `follows`
  ADD PRIMARY KEY (`follow_id`);

--
-- Indexes for table `hashtags`
--
ALTER TABLE `hashtags`
  ADD PRIMARY KEY (`hashtag_id`);

--
-- Indexes for table `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`like_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`);

--
-- Indexes for table `music`
--
ALTER TABLE `music`
  ADD PRIMARY KEY (`music_id`),
  ADD KEY `album_id` (`album_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`);

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
-- Indexes for table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`post_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `collection_id` (`collection_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `registration_verifications`
--
ALTER TABLE `registration_verifications`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `cart_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `collection_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `collection_categories`
--
ALTER TABLE `collection_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `comment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `communities`
--
ALTER TABLE `communities`
  MODIFY `community_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `community_threads`
--
ALTER TABLE `community_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `discography`
--
ALTER TABLE `discography`
  MODIFY `album_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `follows`
--
ALTER TABLE `follows`
  MODIFY `follow_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `hashtags`
--
ALTER TABLE `hashtags`
  MODIFY `hashtag_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `likes`
--
ALTER TABLE `likes`
  MODIFY `like_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=297;

--
-- AUTO_INCREMENT for table `music`
--
ALTER TABLE `music`
  MODIFY `music_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `posts`
--
ALTER TABLE `posts`
  MODIFY `post_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `fk_cartitem_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cartitem_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
