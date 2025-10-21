-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: o0wogkw84go08ocw0ss4goo4
-- Generation Time: Oct 21, 2025 at 07:29 PM
-- Server version: 11.8.3-MariaDB-ubu2404
-- PHP Version: 8.4.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kcls_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ActionTypes`
--

CREATE TABLE `ActionTypes` (
  `ActionCode` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `ActionTypes`
--

INSERT INTO `ActionTypes` (`ActionCode`, `Description`) VALUES
('BORROW_APPROVE', 'Borrow request approved'),
('BORROW_FINE_PAID', 'Fine payment recorded'),
('BORROW_ITEM_RETURN', 'Single item returned'),
('BORROW_OVERDUE', 'Borrow marked overdue'),
('BORROW_OVERDUE_REMINDER', 'Overdue reminder sent'),
('BORROW_REJECT', 'Borrow request rejected'),
('BORROW_REQUEST', 'Borrow request submitted'),
('BORROW_RETRIEVE', 'Borrow items retrieved'),
('BORROW_RETURN', 'Borrow fully returned'),
('DOC_DOWNLOAD', 'Document downloaded'),
('DOC_VIEW', 'Document viewed'),
('LOGIN_ATTEMPT', 'User login attempt'),
('LOGIN_FAILURE', 'Failed login'),
('LOGIN_SUCCESS', 'Successful login'),
('LOGOUT', 'User logout'),
('NOTIFICATION_READ', 'Notification marked read'),
('PASSWORD_CHANGE', 'Password changed'),
('PROFILE_UPDATE', 'User profile updated');

-- --------------------------------------------------------

--
-- Table structure for table `AuditLog`
--

CREATE TABLE `AuditLog` (
  `AuditID` bigint(20) UNSIGNED NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `ActionCode` varchar(50) NOT NULL,
  `TargetTypeCode` varchar(50) DEFAULT NULL,
  `TargetID` bigint(20) DEFAULT NULL,
  `Details` text DEFAULT NULL,
  `IPAddress` varchar(64) DEFAULT NULL,
  `UserAgent` varchar(255) DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `AuditLog`
--

INSERT INTO `AuditLog` (`AuditID`, `UserID`, `ActionCode`, `TargetTypeCode`, `TargetID`, `Details`, `IPAddress`, `UserAgent`, `CreatedAt`) VALUES
(1, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:42:46'),
(2, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:42:47'),
(3, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:44:08'),
(4, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:44:09'),
(5, 2, 'BORROW_APPROVE', 'Borrow', 1, '{\"role\":\"admin\",\"mode\":\"physical/mixed\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:44:42'),
(6, 2, 'BORROW_RETRIEVE', 'Borrow', 1, '{\"role\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 23:44:44'),
(7, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 02:30:24'),
(8, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 02:30:25'),
(9, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1', '2025-10-11 03:42:15'),
(10, NULL, 'LOGIN_FAILURE', 'User', NULL, '{\"username\":\"admin\",\"reason\":\"Invalid username or password\"}', '10.0.1.6', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1', '2025-10-11 03:42:16'),
(11, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1', '2025-10-11 03:42:19'),
(12, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1', '2025-10-11 03:42:20'),
(13, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:24:57'),
(14, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:24:58'),
(15, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:28:07'),
(16, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:28:08'),
(17, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:39:43'),
(18, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 04:39:44'),
(19, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 05:53:44'),
(20, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 05:53:45'),
(21, 2, 'BORROW_RETURN', 'Borrow', 1, '{\"lostItems\":0,\"returnedItems\":2}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:05:01'),
(22, NULL, 'BORROW_FINE_PAID', 'BorrowItem', 1, '{\"returnId\": 2, \"returnedItemId\": 1, \"amount\": 100.0, \"reference\": null, \"note\": null}', NULL, NULL, '2025-10-11 06:05:21'),
(23, NULL, 'BORROW_FINE_PAID', 'BorrowItem', 2, '{\"returnId\": 2, \"returnedItemId\": 2, \"amount\": 100.0, \"reference\": null, \"note\": null}', NULL, NULL, '2025-10-11 06:05:27'),
(24, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:53:57'),
(25, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:53:57'),
(26, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:54:08'),
(27, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:54:09'),
(28, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:57:37'),
(29, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:57:38'),
(30, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"chastine\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:58:21'),
(31, 105, 'LOGIN_SUCCESS', 'User', 105, '{\"username\":\"chastine\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 06:58:22'),
(32, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:00:22'),
(33, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:00:23'),
(34, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:03:35'),
(35, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:03:35'),
(36, 3, 'BORROW_APPROVE', 'Borrow', 2, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:03:45'),
(37, 3, 'BORROW_RETRIEVE', 'Borrow', 2, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:03:49'),
(38, 3, 'BORROW_RETURN', 'Borrow', 2, '{\"lostItems\":0,\"returnedItems\":3}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:03:54'),
(39, 3, 'BORROW_APPROVE', 'Borrow', 3, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:06:27'),
(40, 3, 'BORROW_RETRIEVE', 'Borrow', 3, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:06:31'),
(41, 3, 'BORROW_RETURN', 'Borrow', 3, '{\"lostItems\":0,\"returnedItems\":2}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:06:34'),
(42, 3, 'BORROW_REJECT', 'Borrow', 5, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:07:14'),
(43, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 07:12:50'),
(44, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 07:12:51'),
(45, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:13:43'),
(46, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:13:43'),
(47, 2, 'BORROW_REJECT', 'Borrow', 7, '{\"role\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:14:43'),
(48, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:15:02'),
(49, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:15:02'),
(50, 3, 'BORROW_APPROVE', 'Borrow', 6, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:15:09'),
(51, 3, 'BORROW_RETRIEVE', 'Borrow', 6, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:15:13'),
(52, 3, 'BORROW_RETURN', 'Borrow', 6, '{\"lostItems\":1,\"returnedItems\":0}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:19:29'),
(53, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:31:23'),
(54, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:31:24'),
(55, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:03'),
(56, NULL, 'LOGIN_FAILURE', 'User', NULL, '{\"username\":\"librarian\",\"reason\":\"Invalid username or password\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:04'),
(57, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:08'),
(58, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:09'),
(59, 3, 'BORROW_APPROVE', 'Borrow', 8, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:13'),
(60, 3, 'BORROW_RETRIEVE', 'Borrow', 8, '{\"role\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:14'),
(61, 3, 'BORROW_RETURN', 'Borrow', 8, '{\"lostItems\":0,\"returnedItems\":1}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:32:53'),
(62, NULL, 'BORROW_FINE_PAID', 'BorrowItem', 12, '{\"returnId\": 13, \"returnedItemId\": 9, \"amount\": 100.0, \"reference\": null, \"note\": null}', NULL, NULL, '2025-10-11 07:33:32'),
(63, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:35:02'),
(64, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 07:35:04'),
(65, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 08:03:39'),
(66, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 08:03:40'),
(67, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-19 11:32:43'),
(68, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-19 11:32:44'),
(69, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-19 11:36:34'),
(70, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-19 11:36:35'),
(71, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 02:32:12'),
(72, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 02:32:13'),
(73, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 02:34:02'),
(74, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 02:34:03'),
(75, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 08:55:53'),
(76, NULL, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 08:55:53'),
(77, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 09:06:47'),
(78, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-20 09:06:48'),
(79, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:10:05'),
(80, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:10:10'),
(81, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:11:32'),
(82, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:11:35'),
(83, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:12:17'),
(84, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:12:20'),
(85, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:12:47'),
(86, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:12:49'),
(87, 3, 'BORROW_REJECT', 'Borrow', 9, '{\"role\":\"librarian\",\"remarks\":\"Invalif\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 09:13:24'),
(88, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"chastine\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:21:01'),
(89, NULL, 'LOGIN_FAILURE', 'User', NULL, '{\"username\":\"chastine\",\"reason\":\"Invalid username or password\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:21:02'),
(90, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"chastine\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:22:13'),
(91, 105, 'LOGIN_SUCCESS', 'User', 105, '{\"username\":\"chastine\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:22:13'),
(92, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:36:36'),
(93, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:36:37'),
(94, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:45:36'),
(95, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-20 12:45:37'),
(96, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', '2025-10-21 03:23:10'),
(97, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', '2025-10-21 03:23:11'),
(98, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 03:23:41'),
(99, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 03:23:41'),
(100, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 03:24:18'),
(101, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 03:24:18'),
(102, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 04:03:42'),
(103, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 04:03:42'),
(104, 2, 'BORROW_APPROVE', 'Borrow', 4, '{\"role\":\"admin\",\"mode\":\"digital\",\"due\":\"2025-10-28\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 04:04:36'),
(105, 2, 'BORROW_REJECT', 'Borrow', 11, '{\"role\":\"admin\",\"remarks\":\"bawal\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 04:04:47'),
(106, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:08:33'),
(107, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:08:34'),
(108, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:13:42'),
(109, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:13:43'),
(110, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:25:04'),
(111, 4, 'LOGIN_SUCCESS', 'User', 4, '{\"username\":\"researcher\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:25:05'),
(112, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:28:35'),
(113, 2, 'LOGIN_SUCCESS', 'User', 2, '{\"username\":\"admin\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:28:36'),
(114, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:55:25'),
(115, 3, 'LOGIN_SUCCESS', 'User', 3, '{\"username\":\"librarian\"}', '10.0.1.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-21 16:55:26');

-- --------------------------------------------------------

--
-- Table structure for table `Books`
--

CREATE TABLE `Books` (
  `Book_ID` int(11) NOT NULL,
  `Title` varchar(255) NOT NULL,
  `Author` varchar(255) DEFAULT NULL,
  `Edition` varchar(50) DEFAULT NULL,
  `Publisher` varchar(255) DEFAULT NULL,
  `Year` year(4) DEFAULT NULL,
  `Subject` varchar(100) DEFAULT NULL,
  `Language` varchar(50) DEFAULT NULL,
  `ISBN` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Books`
--

INSERT INTO `Books` (`Book_ID`, `Title`, `Author`, `Edition`, `Publisher`, `Year`, `Subject`, `Language`, `ISBN`) VALUES
(1, 'Reduce world', 'David Hale', '1st', 'Curry-Hill', '2007', 'Technology', 'Spanish', '9780172905297'),
(2, 'Why health billion pull', 'Jacob Hensley', '3rd', 'Mosley-Bonilla', '2003', 'Mathematics', 'Spanish', '9781913237431'),
(3, 'Determine impact health affect early', 'Clifford Foster', '2nd', 'Barry, Jones and Stevens', '2022', 'History', 'Filipino', '9780261923478'),
(4, 'Myself current home then discussion to section', 'Ryan Parsons', '3rd', 'King, Barrett and Santos', '2002', 'Technology', 'Filipino', '9781152190351'),
(5, 'Cause prevent step eight officer exactly garden', 'Jennifer Bryant', '1st', 'Matthews, Phillips and Stafford', '2013', 'Culture', 'Cebuano', '9781044316692'),
(6, 'Garden open task arrive accept challenge by', 'Gabriel Walker', '3rd', 'Alvarado Group', '2009', 'Education', 'Spanish', '9781971576985'),
(7, 'Thought let upon side loss', 'Elizabeth Goodwin', '2nd', 'Rogers PLC', '2019', 'History', 'Spanish', '9781543958713'),
(8, 'Impact consumer serve weight eye may', 'Melanie White', '2nd', 'Smith-Jackson', '2004', 'Arts', 'Cebuano', '9780959453478'),
(9, 'Cause true art', 'Rhonda Burns', 'Revised', 'Gilmore, Pitts and Ware', '1997', 'Mathematics', 'Cebuano', '9780108764851'),
(10, 'Form party', 'Lisa Williams', '3rd', 'Savage-Bolton', '2008', 'Arts', 'Hiligaynon', '9781099499814'),
(11, 'Move feel note', 'Kristen Dunn', 'Revised', 'Lee, Clayton and Myers', '2023', 'History', 'Filipino', '9780560179965'),
(12, 'Rather medical beat war', 'Paul Taylor', 'Special', 'Lewis, Smith and Peters', '1999', 'Technology', 'English', '9781473244283'),
(13, 'Side company second start', 'Kristy Murray', 'Special', 'Green, Patel and Cabrera', '2005', 'Technology', 'Hiligaynon', '9780287252859'),
(14, 'Particular traditional different theory building both', 'Jeffery Gallagher', '2nd', 'Mcgee PLC', '2020', 'Culture', 'Cebuano', '9780687207879'),
(15, 'White west onto study', 'Marilyn Johnson', '1st', 'Miller LLC', '2009', 'Mathematics', 'English', '9780946713202'),
(16, 'Explain take way sign himself', 'Martha Foster', 'Revised', 'Ryan-Brown', '2007', 'Arts', 'Spanish', '9780566115929'),
(17, 'Mrs many during senior far avoid', 'Michelle Cole', '3rd', 'Cox Group', '2010', 'Arts', 'English', '9781831321168'),
(18, 'Season family husband group apply power', 'Michelle Porter', '1st', 'Allen LLC', '2010', 'Science', 'Hiligaynon', '9780989081092'),
(19, 'Discover provide', 'Melissa Joyce', '1st', 'Casey, Gillespie and Mills', '2006', 'Education', 'English', '9781837285907'),
(20, 'Right perform mission', 'Jonathan Anthony', 'Special', 'Jones LLC', '2006', 'Mathematics', 'Filipino', '9780917248726'),
(21, 'Explain sound address main them pass', 'Jill Novak', '1st', 'Richards-Young', '2025', 'Mathematics', 'Filipino', '9781076306210'),
(22, 'Military reason thousand bag', 'Jimmy King', '1st', 'Maxwell Ltd', '2015', 'Mathematics', 'Cebuano', '9780619195380'),
(23, 'Culture capital mean level college avoid', 'Hannah Cummings', 'Revised', 'Henderson, Banks and Leon', '2004', 'Culture', 'Filipino', '9780694422067'),
(24, 'Miss bag pattern simple should', 'Sarah Cochran', 'Revised', 'Nguyen Inc', '1997', 'Education', 'English', '9780227019436'),
(25, 'Commercial ground', 'Beth Powell', 'Special', 'Jackson LLC', '1999', 'Education', 'English', '9781774467077'),
(26, 'Ask before former accept', 'Christy Beltran', '3rd', 'Ramsey and Sons', '2021', 'Arts', 'Filipino', '9781883025441'),
(27, 'Spring remain issue Mrs purpose', 'Daniel Fernandez', 'Revised', 'Ayers, Rhodes and Brown', '2022', 'Technology', 'Hiligaynon', '9781359225047'),
(28, 'Thus participant', 'Michelle Cooper', 'Revised', 'Graham, Hobbs and Ruiz', '2023', 'Science', 'English', '9781024071719'),
(29, 'Necessary', 'Gregory Harding', '1st', 'Villarreal, King and Pierce', '2007', 'Science', 'Filipino', '9780253459107'),
(30, 'Customer situation ten', 'Cathy Flores', '1st', 'Mendoza-Carter', '2008', 'Arts', 'Filipino', '9781626087644'),
(31, 'Task address', 'Vicki Snyder', '2nd', 'Miller-Malone', '2018', 'Education', 'Spanish', '9780923744281'),
(32, 'You research', 'Charles Ryan', '2nd', 'Rogers-Perez', '2022', 'Science', 'Spanish', '9780086361660'),
(33, 'Someone cup whatever road person major', 'Tiffany Carson', '1st', 'Blair, Davis and Russell', '1999', 'History', 'Cebuano', '9780893701642'),
(34, 'Economy test', 'Joseph Rivera', '1st', 'Branch Group', '2018', 'Mathematics', 'English', '9781401309763'),
(35, 'Beat attention site', 'George Martin', '3rd', 'Smith, Harper and Kim', '2004', 'Technology', 'Spanish', '9781723861659'),
(36, 'Return part oil enter course', 'Shannon Flynn', 'Special', 'Duncan and Sons', '2001', 'Education', 'Cebuano', '9780374206116'),
(37, 'Answer yeah deal fund already', 'Robert Edwards', '1st', 'West-Gonzalez', '2003', 'Arts', 'Filipino', '9780833509659'),
(38, 'Catch prove', 'Eric Melendez', 'Revised', 'Rogers-Turner', '2007', 'Science', 'English', '9780439478236'),
(39, 'May significant bill gas half', 'Kristen Johnston', '1st', 'Barry, Yoder and Herrera', '2008', 'Science', 'English', '9780917084027'),
(40, 'Prove finally policy attack end identify', 'Jill Thomas', 'Revised', 'Herrera Group', '2023', 'History', 'Hiligaynon', '9780433234128'),
(41, 'Three cut region', 'Shane Anderson', 'Revised', 'Cruz, Gordon and Perez', '2008', 'Science', 'Spanish', '9780735182110'),
(42, 'Contain', 'Sandra Garcia', 'Special', 'Lewis, Andrade and Long', '1995', 'Arts', 'Filipino', '9781096459934'),
(43, 'Push add', 'Amy Woods', 'Special', 'Thompson-Crawford', '2022', 'Science', 'English', '9781372828782'),
(44, 'Election model similar next class film defense', 'Amanda Long', 'Revised', 'Baker-Hernandez', '2024', 'Science', 'Filipino', '9781996681411'),
(45, 'Reach those', 'Katie Clements', 'Revised', 'Steele-Franklin', '2013', 'Mathematics', 'Cebuano', '9780725043643'),
(46, 'Simple wrong', 'Sharon Allen', 'Revised', 'Hernandez-Leon', '1995', 'Arts', 'Cebuano', '9780559343117'),
(47, 'Interesting player quite spend environment discuss media', 'Mark Lambert', '2nd', 'Brown, Stevens and Brooks', '2017', 'Science', 'Hiligaynon', '9780155739055'),
(48, 'Effect culture ready', 'Jessica Wright', '2nd', 'Hernandez-Barry', '2003', 'Culture', 'Filipino', '9780429322860'),
(49, 'Baby citizen night trade', 'Benjamin Taylor', '2nd', 'Howell-Garcia', '2005', 'Culture', 'English', '9780984099184'),
(50, 'Often', 'Tyler Elliott', '2nd', 'Blair and Sons', '2007', 'Technology', 'Hiligaynon', '9781941512449'),
(51, 'Similar bed real', 'Christina Weaver', 'Special', 'Taylor, Carter and Hendricks', '2025', 'Technology', 'Filipino', '9781911479482'),
(52, 'Attorney until reality', 'Karen Payne', '1st', 'Richards-Cannon', '2022', 'History', 'Hiligaynon', '9780597615443'),
(53, 'Pass trial risk top yeah size', 'Teresa Miller', '2nd', 'Hernandez-Hill', '2019', 'Mathematics', 'Filipino', '9781918650730'),
(54, 'Herself year', 'Jon Davis', 'Special', 'Saunders-Hampton', '2017', 'Culture', 'Hiligaynon', '9780199884674'),
(55, 'Positive break', 'Stanley Lopez', '1st', 'Rowland PLC', '2019', 'Mathematics', 'Cebuano', '9780635680143'),
(56, 'Weight local front cause', 'Susan Randall', 'Revised', 'Golden Ltd', '2019', 'Technology', 'Cebuano', '9781462778232'),
(57, 'Guy spend usually shoulder', 'Lydia Cortez', 'Revised', 'King-Scott', '1998', 'Arts', 'Cebuano', '9780884960621'),
(58, 'Development risk none structure bad level', 'Tyler Beasley', 'Special', 'Williams LLC', '2011', 'History', 'English', '9780625522798'),
(59, 'Buy alone friend', 'Matthew Thomas', '1st', 'Beard, Williams and Gonzales', '2018', 'Arts', 'Filipino', '9781852541705'),
(60, 'Hot yourself where', 'Tina Hill', 'Revised', 'Garcia-Johnson', '2015', 'Arts', 'Filipino', '9781636774121');

-- --------------------------------------------------------

--
-- Table structure for table `Book_Inventory`
--

CREATE TABLE `Book_Inventory` (
  `Copy_ID` int(11) NOT NULL,
  `Book_ID` int(11) NOT NULL,
  `Accession_Number` varchar(50) DEFAULT NULL,
  `Availability` varchar(50) DEFAULT NULL,
  `Physical_Status` varchar(100) DEFAULT NULL,
  `BookCondition` varchar(100) DEFAULT NULL,
  `StorageLocation` int(11) NOT NULL,
  `UpdatedOn` datetime NOT NULL DEFAULT current_timestamp(),
  `LostOn` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Book_Inventory`
--

INSERT INTO `Book_Inventory` (`Copy_ID`, `Book_ID`, `Accession_Number`, `Availability`, `Physical_Status`, `BookCondition`, `StorageLocation`, `UpdatedOn`, `LostOn`) VALUES
(1, 1, 'ACC-0001-01', 'Available', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(2, 2, 'ACC-0002-01', 'Available', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(3, 2, 'ACC-0002-02', 'Available', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(4, 3, 'ACC-0003-01', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(5, 3, 'ACC-0003-02', 'Reserved', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(6, 3, 'ACC-0003-03', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(7, 3, 'ACC-0003-04', 'Available', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(8, 4, 'ACC-0004-01', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(9, 4, 'ACC-0004-02', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(10, 4, 'ACC-0004-03', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(11, 4, 'ACC-0004-04', 'Available', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(12, 5, 'ACC-0005-01', 'Reserved', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(13, 5, 'ACC-0005-02', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(14, 5, 'ACC-0005-03', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(15, 5, 'ACC-0005-04', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(16, 6, 'ACC-0006-01', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(17, 6, 'ACC-0006-02', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(18, 6, 'ACC-0006-03', 'Available', NULL, 'Fair', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(19, 6, 'ACC-0006-04', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(20, 7, 'ACC-0007-01', 'Available', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(21, 7, 'ACC-0007-02', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(22, 8, 'ACC-0008-01', 'Available', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(23, 8, 'ACC-0008-02', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(24, 8, 'ACC-0008-03', 'Available', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(25, 8, 'ACC-0008-04', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(26, 9, 'ACC-0009-01', 'Available', NULL, 'Bad', 4, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(27, 10, 'ACC-0010-01', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(28, 10, 'ACC-0010-02', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(29, 11, 'ACC-0011-01', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(30, 11, 'ACC-0011-02', 'Available', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(31, 11, 'ACC-0011-03', 'Reserved', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(32, 11, 'ACC-0011-04', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(33, 12, 'ACC-0012-01', 'Reserved', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(34, 12, 'ACC-0012-02', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(35, 13, 'ACC-0013-01', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(36, 13, 'ACC-0013-02', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(37, 13, 'ACC-0013-03', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(38, 14, 'ACC-0014-01', 'Reserved', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(39, 14, 'ACC-0014-02', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(40, 14, 'ACC-0014-03', 'Available', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(41, 14, 'ACC-0014-04', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(42, 15, 'ACC-0015-01', 'Available', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(43, 15, 'ACC-0015-02', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(44, 15, 'ACC-0015-03', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(45, 16, 'ACC-0016-01', 'Available', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(46, 16, 'ACC-0016-02', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(47, 16, 'ACC-0016-03', 'Available', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(48, 16, 'ACC-0016-04', 'Reserved', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(49, 17, 'ACC-0017-01', 'Reserved', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(50, 17, 'ACC-0017-02', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(51, 18, 'ACC-0018-01', 'Reserved', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(52, 18, 'ACC-0018-02', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(53, 18, 'ACC-0018-03', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(54, 19, 'ACC-0019-01', 'Available', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(55, 19, 'ACC-0019-02', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(56, 20, 'ACC-0020-01', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(57, 20, 'ACC-0020-02', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(58, 20, 'ACC-0020-03', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(59, 20, 'ACC-0020-04', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(60, 21, 'ACC-0021-01', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(61, 21, 'ACC-0021-02', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(62, 21, 'ACC-0021-03', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(63, 21, 'ACC-0021-04', 'Available', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(64, 22, 'ACC-0022-01', 'Reserved', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(65, 22, 'ACC-0022-02', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(66, 22, 'ACC-0022-03', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(67, 23, 'ACC-0023-01', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(68, 23, 'ACC-0023-02', 'Available', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(69, 24, 'ACC-0024-01', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(70, 24, 'ACC-0024-02', 'Available', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(71, 24, 'ACC-0024-03', 'Available', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(72, 24, 'ACC-0024-04', 'Available', NULL, 'Fair', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(73, 25, 'ACC-0025-01', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(74, 26, 'ACC-0026-01', 'Lost', NULL, 'Lost', 3, '2025-10-20 02:34:38', '0000-00-00 00:00:00'),
(75, 26, 'ACC-0026-02', 'Reserved', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(76, 26, 'ACC-0026-03', 'Reserved', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(77, 27, 'ACC-0027-01', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(78, 27, 'ACC-0027-02', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(79, 28, 'ACC-0028-01', 'Available', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(80, 28, 'ACC-0028-02', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(81, 28, 'ACC-0028-03', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(82, 28, 'ACC-0028-04', 'Available', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(83, 29, 'ACC-0029-01', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(84, 30, 'ACC-0030-01', 'Available', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(85, 30, 'ACC-0030-02', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(86, 31, 'ACC-0031-01', 'Available', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(87, 31, 'ACC-0031-02', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(88, 32, 'ACC-0032-01', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(89, 33, 'ACC-0033-01', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(90, 33, 'ACC-0033-02', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(91, 33, 'ACC-0033-03', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(92, 33, 'ACC-0033-04', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(93, 34, 'ACC-0034-01', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(94, 34, 'ACC-0034-02', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(95, 34, 'ACC-0034-03', 'Available', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(96, 35, 'ACC-0035-01', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(97, 35, 'ACC-0035-02', 'Reserved', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(98, 35, 'ACC-0035-03', 'Reserved', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(99, 35, 'ACC-0035-04', 'Available', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(100, 36, 'ACC-0036-01', 'Available', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(101, 36, 'ACC-0036-02', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(102, 36, 'ACC-0036-03', 'Reserved', NULL, 'Fair', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(103, 37, 'ACC-0037-01', 'Borrowed', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(104, 37, 'ACC-0037-02', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(105, 37, 'ACC-0037-03', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(106, 37, 'ACC-0037-04', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(107, 38, 'ACC-0038-01', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(108, 38, 'ACC-0038-02', 'Borrowed', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(109, 39, 'ACC-0039-01', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(110, 40, 'ACC-0040-01', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(111, 40, 'ACC-0040-02', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(112, 40, 'ACC-0040-03', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(113, 40, 'ACC-0040-04', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(114, 41, 'ACC-0041-01', 'Available', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(115, 41, 'ACC-0041-02', 'Reserved', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(116, 42, 'ACC-0042-01', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(117, 42, 'ACC-0042-02', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(118, 43, 'ACC-0043-01', 'Available', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(119, 43, 'ACC-0043-02', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(120, 43, 'ACC-0043-03', 'Reserved', NULL, 'Fair', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(121, 44, 'ACC-0044-01', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(122, 44, 'ACC-0044-02', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(123, 44, 'ACC-0044-03', 'Reserved', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(124, 44, 'ACC-0044-04', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(125, 45, 'ACC-0045-01', 'Available', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(126, 45, 'ACC-0045-02', 'Available', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(127, 45, 'ACC-0045-03', 'Available', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(128, 45, 'ACC-0045-04', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(129, 46, 'ACC-0046-01', 'Available', NULL, 'Fair', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(130, 46, 'ACC-0046-02', 'Reserved', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(131, 46, 'ACC-0046-03', 'Available', NULL, 'Fair', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(132, 47, 'ACC-0047-01', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(133, 47, 'ACC-0047-02', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(134, 47, 'ACC-0047-03', 'Reserved', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(135, 48, 'ACC-0048-01', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(136, 48, 'ACC-0048-02', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(137, 48, 'ACC-0048-03', 'Reserved', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(138, 48, 'ACC-0048-04', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(139, 49, 'ACC-0049-01', 'Reserved', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(140, 50, 'ACC-0050-01', 'Available', NULL, 'Poor', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(141, 50, 'ACC-0050-02', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(142, 50, 'ACC-0050-03', 'Reserved', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(143, 50, 'ACC-0050-04', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(144, 51, 'ACC-0051-01', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(145, 52, 'ACC-0052-01', 'Reserved', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(146, 52, 'ACC-0052-02', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(147, 52, 'ACC-0052-03', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(148, 53, 'ACC-0053-01', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(149, 53, 'ACC-0053-02', 'Available', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(150, 54, 'ACC-0054-01', 'Available', NULL, 'Good', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(151, 54, 'ACC-0054-02', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(152, 54, 'ACC-0054-03', 'Available', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(153, 55, 'ACC-0055-01', 'Available', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(154, 55, 'ACC-0055-02', 'Reserved', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(155, 55, 'ACC-0055-03', 'Reserved', NULL, 'Average', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(156, 55, 'ACC-0055-04', 'Available', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(157, 56, 'ACC-0056-01', 'Available', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(158, 56, 'ACC-0056-02', 'Available', NULL, 'Bad', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(159, 57, 'ACC-0057-01', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(160, 57, 'ACC-0057-02', 'Available', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(161, 57, 'ACC-0057-03', 'Available', NULL, 'Average', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(162, 57, 'ACC-0057-04', 'Reserved', NULL, 'Bad', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(163, 58, 'ACC-0058-01', 'Available', NULL, 'Average', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(164, 58, 'ACC-0058-02', 'Reserved', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(165, 59, 'ACC-0059-01', 'Reserved', NULL, 'Good', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(166, 59, 'ACC-0059-02', 'Available', NULL, 'Good', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(167, 59, 'ACC-0059-03', 'Reserved', NULL, 'Bad', 1, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(168, 59, 'ACC-0059-04', 'Available', NULL, 'Poor', 2, '2025-10-19 22:56:01', '0000-00-00 00:00:00'),
(169, 60, 'ACC-0060-01', 'Reserved', NULL, 'Poor', 3, '2025-10-19 22:56:01', '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `BorrowedItems`
--

CREATE TABLE `BorrowedItems` (
  `BorrowedItemID` int(11) NOT NULL,
  `BorrowID` int(11) NOT NULL,
  `ItemType` enum('Book','Document') NOT NULL,
  `BookCopyID` int(11) DEFAULT NULL,
  `DocumentStorageID` int(11) DEFAULT NULL,
  `Document_ID` int(11) DEFAULT NULL,
  `InitialCondition` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `BorrowedItems`
--

INSERT INTO `BorrowedItems` (`BorrowedItemID`, `BorrowID`, `ItemType`, `BookCopyID`, `DocumentStorageID`, `Document_ID`, `InitialCondition`) VALUES
(1, 1, 'Document', NULL, 11, 7, 'Fair'),
(2, 1, 'Document', NULL, 8, 6, 'Fair'),
(3, 2, 'Book', 103, NULL, NULL, 'Average'),
(4, 2, 'Book', 74, NULL, NULL, 'Bad'),
(5, 2, 'Book', 146, NULL, NULL, 'Fair'),
(6, 3, 'Book', 99, NULL, NULL, 'Poor'),
(7, 3, 'Book', 166, NULL, NULL, 'Good'),
(8, 4, 'Document', NULL, NULL, 7, ''),
(9, 5, 'Book', 146, NULL, NULL, 'Good'),
(10, 6, 'Book', 74, NULL, NULL, 'Good'),
(11, 7, 'Document', NULL, NULL, 6, ''),
(12, 8, 'Book', 146, NULL, NULL, 'Good'),
(13, 9, 'Book', 146, NULL, NULL, 'Good'),
(14, 10, 'Book', 108, NULL, NULL, 'Average'),
(15, 11, 'Document', NULL, NULL, 7, ''),
(16, 12, 'Book', 103, NULL, NULL, 'Good');

-- --------------------------------------------------------

--
-- Table structure for table `Borrowers`
--

CREATE TABLE `Borrowers` (
  `BorrowerID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `Type` enum('Researcher','Government Agency') NOT NULL,
  `Department` varchar(100) DEFAULT NULL,
  `AccountStatus` enum('Pending','Registered','Suspended','Rejected') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Borrowers`
--

INSERT INTO `Borrowers` (`BorrowerID`, `UserID`, `Type`, `Department`, `AccountStatus`) VALUES
(1, 1, 'Researcher', 'N/A', 'Registered'),
(2, 4, 'Researcher', 'N/A', 'Registered'),
(3, 5, 'Researcher', 'N/A', 'Registered'),
(4, 6, 'Government Agency', 'CPDO', 'Registered'),
(5, 7, 'Researcher', 'dti', 'Registered'),
(6, 10, 'Government Agency', 'n/a', 'Pending'),
(7, 11, 'Researcher', 'N/A', 'Registered'),
(8, 12, 'Researcher', 'N/A', 'Registered'),
(9, 13, 'Researcher', 'Non-Government', 'Pending'),
(10, 14, 'Researcher', 'Non-Government', 'Pending'),
(11, 15, 'Researcher', '', 'Rejected'),
(12, 16, 'Researcher', '', 'Registered'),
(13, 103, 'Researcher', '', 'Pending'),
(14, 104, 'Researcher', 'N/A', 'Pending'),
(15, 105, 'Researcher', 'N/A', 'Registered');

-- --------------------------------------------------------

--
-- Table structure for table `BorrowTransactions`
--

CREATE TABLE `BorrowTransactions` (
  `BorrowID` int(11) NOT NULL,
  `BorrowerID` int(11) NOT NULL,
  `Purpose` text DEFAULT NULL,
  `ApprovalStatus` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `ApprovedByStaffID` int(11) DEFAULT NULL,
  `RetrievalStatus` enum('Pending','Retrieved','Returned') NOT NULL DEFAULT 'Pending',
  `ReturnStatus` enum('Returned','Not Returned') NOT NULL DEFAULT 'Not Returned',
  `BorrowDate` date DEFAULT NULL,
  `Remarks` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `BorrowTransactions`
--

INSERT INTO `BorrowTransactions` (`BorrowID`, `BorrowerID`, `Purpose`, `ApprovalStatus`, `ApprovedByStaffID`, `RetrievalStatus`, `ReturnStatus`, `BorrowDate`, `Remarks`) VALUES
(1, 2, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-10-11', ''),
(2, 15, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-10-11', ''),
(3, 15, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-10-11', ''),
(4, 15, 'Reading', 'Approved', NULL, 'Pending', 'Not Returned', '2025-10-11', ''),
(5, 15, 'Reading', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-10-11', ''),
(6, 2, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-10-11', ''),
(7, 2, 'Reading', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-10-11', ''),
(8, 2, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-10-11', ''),
(9, 2, 'Reading', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-10-20', 'Invalif'),
(10, 15, 'reading', 'Pending', NULL, 'Pending', 'Not Returned', '2025-10-20', ''),
(11, 15, 'reading', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-10-20', 'bawal'),
(12, 2, 'study', 'Pending', NULL, 'Pending', 'Not Returned', '2025-10-22', '');

-- --------------------------------------------------------

--
-- Table structure for table `Documents`
--

CREATE TABLE `Documents` (
  `Document_ID` int(11) NOT NULL,
  `Title` varchar(255) NOT NULL,
  `Author` varchar(255) DEFAULT NULL,
  `Category` varchar(100) DEFAULT NULL,
  `Department` varchar(100) DEFAULT NULL,
  `Classification` varchar(100) DEFAULT NULL,
  `Year` int(11) DEFAULT NULL,
  `Sensitivity` varchar(50) DEFAULT NULL,
  `File_Path` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Documents`
--

INSERT INTO `Documents` (`Document_ID`, `Title`, `Author`, `Category`, `Department`, `Classification`, `Year`, `Sensitivity`, `File_Path`) VALUES
(1, 'Vision-oriented multimedia synergy', 'Lance Johnson', 'Resolution', 'Public Works', 'Public Resource', 2006, 'Public', '/uploads/a16710d4-aeaa-47bd-9240-df5aecfc17db_vision-oriented_multimedia_synergy.pdf'),
(2, 'Total foreground frame', 'Lisa Jimenez', 'Budget', 'Records Management', 'Public Resource', 2001, 'Restricted', '/uploads/5aec4ff5-f6b0-41bc-99eb-d5443216a9db_total_foreground_frame.pdf'),
(3, 'Profit-focused bottom-line hardware', 'Amanda Wallace', 'Memorandum', 'Records Management', 'Historical File', 2011, 'Public', '/uploads/bf155bb5-ee1d-4514-8e46-397d78b5a61c_profit-focused_bottom-line_hardware.pdf'),
(4, 'Total methodical capacity', 'Lindsey Evans', 'Ordinance', 'N/A', 'Government Document', 2022, 'Public', '/uploads/64b3c931-05fa-4cb1-9694-c15c217d9345_total_methodical_capacity.pdf'),
(5, 'Organic zero tolerance complexity', 'Gerald Rodriguez', 'Ordinance', 'Records Management', 'Government Document', 2015, 'Confidential', '/uploads/beff1f3f-3110-4a7a-ae62-842525a8de52_organic_zero_tolerance_complexity.pdf'),
(6, 'Intuitive radical installation', 'Keith Glass', 'Ordinance', 'Tourism', 'Historical File', 2003, 'Restricted', '/uploads/0b1d4575-cab4-4ff4-aa51-8b18875c29ec_intuitive_radical_installation.pdf'),
(7, 'Cross-group zero tolerance firmware', 'Amy Bennett', 'Correspondence', 'N/A', 'Public Resource', 2020, 'Public', '/uploads/d0c58681-0fdd-4400-86e1-27f9e50dbb07_cross-group_zero_tolerance_firmware.pdf'),
(8, 'Compatible incremental benchmark', 'Erica Dixon', 'Memorandum', 'Tourism', 'Public Resource', 2002, 'Confidential', '/uploads/21ae2054-aa54-4892-9c20-f1952cffe1d3_compatible_incremental_benchmark.pdf'),
(9, 'Mandatory uniform process improvement', 'Justin Mitchell', 'Ordinance', 'Tourism', 'Historical File', 2016, 'Restricted', '/uploads/868f6e66-43c8-46d3-b68a-f91404ad0dff_mandatory_uniform_process_improvement.pdf'),
(10, 'Stand-alone real-time interface', 'Chase Taylor', 'Ordinance', 'Mayor\'s Office', 'Historical File', 2004, 'Confidential', '/uploads/b9d53a30-934d-4e6f-8b92-d778886203c6_stand-alone_real-time_interface.pdf'),
(11, 'Multi-lateral global moderator', 'Joseph Davis', 'Memorandum', 'Library Services', 'Public Resource', 2004, 'Public', '/uploads/41c4af72-9663-44b8-b90f-e512f4d55c40_multi-lateral_global_moderator.pdf'),
(12, 'Multi-layered web-enabled groupware', 'Troy Hopkins', 'Correspondence', 'Public Works', 'Historical File', 2011, 'Restricted', '/uploads/2ff59e7a-d45b-497e-b5a6-9b52ab6b9dd0_multi-layered_web-enabled_groupware.pdf'),
(13, 'Pre-emptive next generation conglomeration', 'Cheryl Smith', 'Minutes', 'Mayor\'s Office', 'Public Resource', 2002, 'Confidential', '/uploads/6cd52176-1d48-4d1f-8d05-23c870d4077f_pre-emptive_next_generation_conglomerati.pdf'),
(14, 'Operative upward-trending productivity', 'Kristy Evans', 'Minutes', 'Education', 'N/A', 2019, 'Confidential', '/uploads/65d75fa3-b9c0-444b-a379-a2f95fb6421d_operative_upward-trending_productivity.pdf'),
(15, 'Universal dynamic Internet solution', 'Erica Rogers', 'Budget', 'Mayor\'s Office', 'Public Resource', 2025, 'Confidential', '/uploads/7879695b-4cca-482b-a588-cc83a204308d_universal_dynamic_internet_solution.pdf'),
(16, 'Secured user-facing ability', 'Angel Diaz', 'Resolution', 'Records Management', 'Historical File', 2006, 'Restricted', '/uploads/11a79710-90fc-4aeb-a279-2d1be04366bc_secured_user-facing_ability.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `Document_Inventory`
--

CREATE TABLE `Document_Inventory` (
  `Storage_ID` int(11) NOT NULL,
  `Document_ID` int(11) NOT NULL,
  `Availability` varchar(50) NOT NULL,
  `Condition` varchar(50) NOT NULL,
  `StorageLocation` int(11) NOT NULL,
  `UpdatedOn` datetime NOT NULL DEFAULT current_timestamp(),
  `LostOn` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Document_Inventory`
--

INSERT INTO `Document_Inventory` (`Storage_ID`, `Document_ID`, `Availability`, `Condition`, `StorageLocation`, `UpdatedOn`, `LostOn`) VALUES
(1, 1, 'Available', 'Average', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(2, 2, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(3, 3, 'Available', 'Fair', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(4, 4, 'Available', 'Bad', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(5, 5, 'Available', 'Fair', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(6, 5, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(7, 5, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(8, 6, 'Available', 'Good', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(9, 6, 'Available', 'Average', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(10, 6, 'Available', 'Good', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(11, 7, 'Available', 'Average', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(12, 8, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(13, 9, 'Available', 'Fair', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(14, 9, 'Available', 'Good', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(15, 10, 'Available', 'Average', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(16, 10, 'Available', 'Fair', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(17, 10, 'Available', 'Fair', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(18, 11, 'Available', 'Average', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(19, 11, 'Available', 'Good', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(20, 11, 'Available', 'Fair', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(21, 12, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(22, 12, 'Available', 'Fair', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(23, 13, 'Available', 'Fair', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(24, 13, 'Available', 'Average', 1, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(25, 14, 'Available', 'Bad', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(26, 14, 'Available', 'Average', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(27, 15, 'Available', 'Good', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(28, 15, 'Available', 'Average', 2, '2025-10-19 22:56:22', '0000-00-00 00:00:00'),
(29, 16, 'Available', 'Poor', 3, '2025-10-19 22:56:22', '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `Notifications`
--

CREATE TABLE `Notifications` (
  `NotificationID` bigint(20) UNSIGNED NOT NULL,
  `Type` varchar(64) NOT NULL,
  `Title` varchar(160) DEFAULT NULL,
  `Message` text NOT NULL,
  `SenderUserID` bigint(20) UNSIGNED DEFAULT NULL,
  `RelatedType` varchar(32) DEFAULT NULL,
  `RelatedID` bigint(20) UNSIGNED DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Notifications`
--

INSERT INTO `Notifications` (`NotificationID`, `Type`, `Title`, `Message`, `SenderUserID`, `RelatedType`, `RelatedID`, `CreatedAt`) VALUES
(1, 'BORROW_DOC_REQUEST_SUBMITTED', 'New Document Borrow Request', 'Document borrow request #1 submitted.', 4, 'Borrow', 1, '2025-10-10 23:43:53'),
(2, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #1 was approved.', NULL, 'Borrow', 1, '2025-10-10 23:44:41'),
(3, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #1 are ready for pickup.', NULL, 'Borrow', 1, '2025-10-10 23:44:41'),
(4, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #1 marked as retrieved.', NULL, 'Borrow', 1, '2025-10-10 23:44:44'),
(5, 'BORROW_RETURN_RECORDED', 'Return Recorded', 'Return recorded for borrow #1.', NULL, 'Borrow', 1, '2025-10-11 06:05:01'),
(6, 'ACCOUNT_APPROVED', 'Account Approved', 'Your account has been approved.', NULL, 'User', 105, '2025-10-11 06:57:55'),
(7, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #2 submitted.', 105, 'Borrow', 2, '2025-10-11 07:02:18'),
(8, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #2 was approved.', NULL, 'Borrow', 2, '2025-10-11 07:03:45'),
(9, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #2 are ready for pickup.', NULL, 'Borrow', 2, '2025-10-11 07:03:45'),
(10, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #2 marked as retrieved.', NULL, 'Borrow', 2, '2025-10-11 07:03:48'),
(11, 'BORROW_RETURN_RECORDED', 'Return Recorded', 'Return recorded for borrow #2.', NULL, 'Borrow', 2, '2025-10-11 07:03:54'),
(12, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #3 submitted.', 105, 'Borrow', 3, '2025-10-11 07:04:52'),
(13, 'BORROW_DOC_REQUEST_SUBMITTED', 'New Document Borrow Request', 'Document borrow request #4 submitted.', 105, 'Borrow', 4, '2025-10-11 07:04:52'),
(14, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #3 was approved.', NULL, 'Borrow', 3, '2025-10-11 07:06:27'),
(15, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #3 are ready for pickup.', NULL, 'Borrow', 3, '2025-10-11 07:06:27'),
(16, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #3 marked as retrieved.', NULL, 'Borrow', 3, '2025-10-11 07:06:30'),
(17, 'BORROW_RETURN_RECORDED', 'Return Recorded', 'Return recorded for borrow #3.', NULL, 'Borrow', 3, '2025-10-11 07:06:33'),
(18, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #5 submitted.', 105, 'Borrow', 5, '2025-10-11 07:07:00'),
(19, 'BORROW_REJECTED', 'Borrow Rejected', 'Your borrow request #5 was rejected.', NULL, 'Borrow', 5, '2025-10-11 07:07:13'),
(20, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #6 submitted.', 4, 'Borrow', 6, '2025-10-11 07:13:15'),
(21, 'BORROW_DOC_REQUEST_SUBMITTED', 'New Document Borrow Request', 'Document borrow request #7 submitted.', 4, 'Borrow', 7, '2025-10-11 07:13:15'),
(22, 'BORROW_REJECTED', 'Borrow Rejected', 'Your borrow request #7 was rejected.', NULL, 'Borrow', 7, '2025-10-11 07:14:43'),
(23, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #6 was approved.', NULL, 'Borrow', 6, '2025-10-11 07:15:09'),
(24, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #6 are ready for pickup.', NULL, 'Borrow', 6, '2025-10-11 07:15:09'),
(25, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #6 marked as retrieved.', NULL, 'Borrow', 6, '2025-10-11 07:15:13'),
(26, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #8 submitted.', 4, 'Borrow', 8, '2025-10-11 07:31:52'),
(27, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #8 was approved.', NULL, 'Borrow', 8, '2025-10-11 07:32:12'),
(28, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #8 are ready for pickup.', NULL, 'Borrow', 8, '2025-10-11 07:32:12'),
(29, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #8 marked as retrieved.', NULL, 'Borrow', 8, '2025-10-11 07:32:14'),
(30, 'BORROW_RETURN_RECORDED', 'Return Recorded', 'Return recorded for borrow #8.', NULL, 'Borrow', 8, '2025-10-11 07:32:52'),
(31, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #9 submitted.', 4, 'Borrow', 9, '2025-10-20 09:12:34'),
(32, 'BORROW_REJECTED', 'Borrow Rejected', 'Your borrow request #9 was rejected.', NULL, 'Borrow', 9, '2025-10-20 09:13:23'),
(33, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #10 submitted.', 105, 'Borrow', 10, '2025-10-20 12:23:02'),
(34, 'BORROW_DOC_REQUEST_SUBMITTED', 'New Document Borrow Request', 'Document borrow request #11 submitted.', 105, 'Borrow', 11, '2025-10-20 12:23:02'),
(35, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #4 was approved.', NULL, 'Borrow', 4, '2025-10-21 04:04:36'),
(36, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #4 are ready for pickup.', NULL, 'Borrow', 4, '2025-10-21 04:04:36'),
(37, 'BORROW_REJECTED', 'Borrow Rejected', 'Your borrow request #11 was rejected.', NULL, 'Borrow', 11, '2025-10-21 04:04:46'),
(38, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #12 submitted.', 4, 'Borrow', 12, '2025-10-21 16:27:39');

-- --------------------------------------------------------

--
-- Table structure for table `Notification_Recipients`
--

CREATE TABLE `Notification_Recipients` (
  `RecipientID` bigint(20) UNSIGNED NOT NULL,
  `NotificationID` bigint(20) UNSIGNED NOT NULL,
  `RecipientUserID` bigint(20) UNSIGNED NOT NULL,
  `IsRead` tinyint(1) NOT NULL DEFAULT 0,
  `ReadAt` datetime DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Notification_Recipients`
--

INSERT INTO `Notification_Recipients` (`RecipientID`, `NotificationID`, `RecipientUserID`, `IsRead`, `ReadAt`, `CreatedAt`) VALUES
(1, 1, 2, 0, NULL, '2025-10-10 23:43:53'),
(2, 1, 102, 0, NULL, '2025-10-10 23:43:53'),
(3, 2, 4, 0, NULL, '2025-10-10 23:44:41'),
(4, 3, 4, 0, NULL, '2025-10-10 23:44:41'),
(5, 4, 2, 0, NULL, '2025-10-10 23:44:44'),
(6, 4, 102, 0, NULL, '2025-10-10 23:44:44'),
(7, 5, 2, 1, '2025-10-11 06:09:32', '2025-10-11 06:05:01'),
(8, 5, 4, 0, NULL, '2025-10-11 06:05:01'),
(9, 5, 102, 0, NULL, '2025-10-11 06:05:01'),
(10, 6, 105, 0, NULL, '2025-10-11 06:57:55'),
(11, 7, 3, 0, NULL, '2025-10-11 07:02:18'),
(12, 8, 105, 0, NULL, '2025-10-11 07:03:45'),
(13, 9, 105, 0, NULL, '2025-10-11 07:03:45'),
(14, 10, 3, 0, NULL, '2025-10-11 07:03:48'),
(15, 11, 105, 0, NULL, '2025-10-11 07:03:54'),
(16, 11, 3, 0, NULL, '2025-10-11 07:03:54'),
(17, 12, 3, 0, NULL, '2025-10-11 07:04:52'),
(18, 13, 2, 0, NULL, '2025-10-11 07:04:52'),
(19, 13, 102, 0, NULL, '2025-10-11 07:04:52'),
(20, 14, 105, 0, NULL, '2025-10-11 07:06:27'),
(21, 15, 105, 0, NULL, '2025-10-11 07:06:27'),
(22, 16, 3, 0, NULL, '2025-10-11 07:06:30'),
(23, 17, 105, 0, NULL, '2025-10-11 07:06:33'),
(24, 17, 3, 0, NULL, '2025-10-11 07:06:33'),
(25, 18, 3, 0, NULL, '2025-10-11 07:07:00'),
(26, 19, 105, 0, NULL, '2025-10-11 07:07:13'),
(27, 20, 3, 0, NULL, '2025-10-11 07:13:15'),
(28, 21, 2, 0, NULL, '2025-10-11 07:13:15'),
(29, 21, 102, 0, NULL, '2025-10-11 07:13:15'),
(30, 22, 4, 0, NULL, '2025-10-11 07:14:43'),
(31, 23, 4, 0, NULL, '2025-10-11 07:15:09'),
(32, 24, 4, 0, NULL, '2025-10-11 07:15:09'),
(33, 25, 3, 0, NULL, '2025-10-11 07:15:13'),
(34, 26, 3, 0, NULL, '2025-10-11 07:31:52'),
(35, 27, 4, 0, NULL, '2025-10-11 07:32:12'),
(36, 28, 4, 0, NULL, '2025-10-11 07:32:12'),
(37, 29, 3, 0, NULL, '2025-10-11 07:32:14'),
(38, 30, 3, 0, NULL, '2025-10-11 07:32:52'),
(39, 30, 4, 0, NULL, '2025-10-11 07:32:52'),
(40, 31, 3, 0, NULL, '2025-10-20 09:12:34'),
(41, 32, 4, 0, NULL, '2025-10-20 09:13:23'),
(42, 33, 3, 0, NULL, '2025-10-20 12:23:02'),
(43, 34, 2, 0, NULL, '2025-10-20 12:23:02'),
(44, 34, 102, 0, NULL, '2025-10-20 12:23:02'),
(45, 35, 105, 0, NULL, '2025-10-21 04:04:36'),
(46, 36, 105, 0, NULL, '2025-10-21 04:04:36'),
(47, 37, 105, 0, NULL, '2025-10-21 04:04:46'),
(48, 38, 3, 0, NULL, '2025-10-21 16:27:39');

-- --------------------------------------------------------

--
-- Table structure for table `Notification_Types`
--

CREATE TABLE `Notification_Types` (
  `Code` varchar(64) NOT NULL,
  `Description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Notification_Types`
--

INSERT INTO `Notification_Types` (`Code`, `Description`) VALUES
('ACCOUNT_APPROVED', 'Account approved'),
('ACCOUNT_REGISTRATION_SUBMITTED', 'New borrower registration'),
('ACCOUNT_REJECTED', 'Account rejected'),
('BORROW_APPROVED', 'Borrow request approved'),
('BORROW_BOOK_REQUEST_SUBMITTED', 'New book borrow request submitted'),
('BORROW_DOC_REQUEST_SUBMITTED', 'New document borrow request submitted'),
('BORROW_OVERDUE_REMINDER', 'Overdue reminder'),
('BORROW_REJECTED', 'Borrow request rejected'),
('BORROW_RETRIEVED', 'Items retrieved by borrower'),
('BORROW_RETURN_RECORDED', 'Return recorded'),
('DOCUMENT_VERIFICATION_REQUIRED', 'Document borrow requires admin verification'),
('FINE_ASSESSED', 'Fine assessed on returned item'),
('FINE_PAID', 'Fine paid'),
('READY_FOR_PICKUP', 'Items ready for pickup');

-- --------------------------------------------------------

--
-- Table structure for table `PasswordResetCodes`
--

CREATE TABLE `PasswordResetCodes` (
  `ResetID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `CodeHash` varchar(255) NOT NULL,
  `ExpiresAt` datetime NOT NULL,
  `Consumed` tinyint(1) NOT NULL DEFAULT 0,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `PasswordResetCodes`
--

INSERT INTO `PasswordResetCodes` (`ResetID`, `UserID`, `CodeHash`, `ExpiresAt`, `Consumed`, `CreatedAt`) VALUES
(1, 105, 'pbkdf2:sha256:600000$DTdUaxvzXkQsmmHi$a26bf5c990a1c2487e923f0e2a61cad5aea98f61bf7c70027c4942d79211b81a', '2025-10-20 12:51:19', 1, '2025-10-20 12:21:19');

-- --------------------------------------------------------

--
-- Table structure for table `ReturnedItems`
--

CREATE TABLE `ReturnedItems` (
  `ReturnedItemID` int(11) NOT NULL,
  `ReturnID` int(11) NOT NULL,
  `BorrowedItemID` int(11) NOT NULL,
  `ReturnCondition` varchar(100) DEFAULT NULL,
  `Fine` decimal(10,2) DEFAULT 0.00,
  `FinePaid` enum('Yes','No') DEFAULT 'No'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `ReturnedItems`
--

INSERT INTO `ReturnedItems` (`ReturnedItemID`, `ReturnID`, `BorrowedItemID`, `ReturnCondition`, `Fine`, `FinePaid`) VALUES
(1, 2, 1, 'Average', 100.00, 'Yes'),
(2, 2, 2, 'Good', 100.00, 'Yes'),
(3, 4, 3, 'Good', 0.00, 'No'),
(4, 4, 4, 'Good', 0.00, 'No'),
(5, 4, 5, 'Good', 0.00, 'No'),
(6, 7, 6, 'Good', 0.00, 'No'),
(7, 7, 7, 'Good', 0.00, 'No'),
(8, 11, 10, 'Lost', 0.00, 'No'),
(9, 13, 12, 'Good', 100.00, 'Yes');

-- --------------------------------------------------------

--
-- Table structure for table `ReturnTransactions`
--

CREATE TABLE `ReturnTransactions` (
  `ReturnID` int(11) NOT NULL,
  `BorrowID` int(11) NOT NULL,
  `ReturnDate` date NOT NULL,
  `ReceivedByStaffID` int(11) DEFAULT NULL,
  `Remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `ReturnTransactions`
--

INSERT INTO `ReturnTransactions` (`ReturnID`, `BorrowID`, `ReturnDate`, `ReceivedByStaffID`, `Remarks`) VALUES
(1, 1, '2025-10-25', NULL, NULL),
(2, 1, '2025-10-11', NULL, NULL),
(3, 2, '2025-10-17', NULL, NULL),
(4, 2, '2025-10-11', NULL, ''),
(5, 3, '2025-10-15', NULL, NULL),
(6, 4, '2025-10-15', NULL, NULL),
(7, 3, '2025-10-11', NULL, ''),
(8, 5, '2025-11-11', NULL, NULL),
(9, 6, '2025-10-16', NULL, NULL),
(10, 7, '2025-10-16', NULL, NULL),
(11, 6, '2025-10-11', NULL, '[LOST]'),
(12, 8, '2025-10-17', NULL, NULL),
(13, 8, '2025-10-11', NULL, 'Fine paid PHP 100.00 on 2025-10-11 07:33:32 UTC'),
(14, 9, '2025-10-23', NULL, NULL),
(15, 10, '2025-10-27', NULL, NULL),
(16, 11, '2025-10-27', NULL, NULL),
(17, 4, '2025-10-28', NULL, NULL),
(18, 12, '2025-10-29', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Staff`
--

CREATE TABLE `Staff` (
  `StaffID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `Position` enum('Librarian','Admin') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Staff`
--

INSERT INTO `Staff` (`StaffID`, `UserID`, `Position`) VALUES
(1, 2, 'Admin'),
(2, 3, 'Librarian'),
(3, 102, 'Admin');

-- --------------------------------------------------------

--
-- Table structure for table `Storages`
--

CREATE TABLE `Storages` (
  `ID` int(11) NOT NULL,
  `Name` varchar(50) NOT NULL,
  `Capacity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Storages`
--

INSERT INTO `Storages` (`ID`, `Name`, `Capacity`) VALUES
(1, 'Shelf D1', 110),
(2, 'Shelf B2', 75),
(3, 'Shelf D3', 100),
(4, 'Book Archive Section', 100);

-- --------------------------------------------------------

--
-- Table structure for table `TargetTypes`
--

CREATE TABLE `TargetTypes` (
  `TargetTypeCode` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `TargetTypes`
--

INSERT INTO `TargetTypes` (`TargetTypeCode`, `Description`) VALUES
('Borrow', 'Borrow transaction'),
('BorrowItem', 'Borrowed item'),
('Document', 'Document record'),
('Notification', 'Notification entry'),
('System', 'System / background task'),
('User', 'User account');

-- --------------------------------------------------------

--
-- Table structure for table `UserDetails`
--

CREATE TABLE `UserDetails` (
  `UserID` int(11) NOT NULL,
  `Firstname` varchar(100) NOT NULL,
  `Middlename` varchar(100) DEFAULT NULL,
  `Lastname` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `ContactNumber` varchar(100) DEFAULT NULL,
  `Street` varchar(100) DEFAULT NULL,
  `Barangay` varchar(100) DEFAULT NULL,
  `City` varchar(100) DEFAULT NULL,
  `Province` varchar(100) DEFAULT NULL,
  `DateOfBirth` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `UserDetails`
--

INSERT INTO `UserDetails` (`UserID`, `Firstname`, `Middlename`, `Lastname`, `Email`, `ContactNumber`, `Street`, `Barangay`, `City`, `Province`, `DateOfBirth`) VALUES
(1, 'Juan', 'Luna', 'DelaCruz', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
(2, 'Jan', 'Adam', 'Smith', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2005-03-09'),
(3, 'John', 'Smith', 'Doe', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
(4, 'Andrei', 'Lagos', 'Sumalpong', 'sumalpong@gamil.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2003-11-18'),
(5, 'Jenelyn', 'Manangan', 'Gomez', 'yanskieexb@gmail.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2004-12-25'),
(6, 'Alvin', NULL, 'Subere', 'alvinsubere5@gmail.com', '09466753106', 'Upper Valley', 'Sto Nino', 'Koronadal', 'South Cotabato', '1999-05-08'),
(7, 'rinz', '', 'vergs', 'test@getnada.com', '', 'stas', 'zone iii', 'kor', 'south cot', NULL),
(10, 'Test', 'test', 'test', 'user@gmail.com', '09312345677', 'test', 'test', 'test', 'test', '1990-11-09'),
(11, 'Andrei', 'Ian', 'Sumalpong', 'sumalpongandreiian@gmail.com', '09641426620', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2025-02-01'),
(12, 'Lawrence Blake', NULL, 'Templado', 'blake.templado2323@gmail.com', '09934917607', 'St.Lucia', 'Zone II', 'Koronadal City', 'South Cotabato', '2001-09-23'),
(13, 'John', 'Donut', 'Doe', 'email@exampleemail.com', '09123456789', 'Pantua', 'ZoneIII', 'Koronadal', 'South Cotabato', '2012-02-07'),
(14, 'Piolo', 'Pogi', 'Pascual', 'piolopascual@123gmail.com', '09123456789', 'Pantua', 'ZoneIII', 'Koronadal', 'South Cotabato', '2025-09-30'),
(15, '1234', '123', '56', 'blake@templado.com', '12321412352342', '', 'Zone 2', 'Koronadal', 'South Cot', '2001-09-23'),
(16, 'Blademere ', 'A.', 'Suico', 'bladbike@gmail.com', '09060539683', 'Sta. Lucia Street', 'Zone II', 'Koronadal', 'South Cotabato', '2004-07-10'),
(102, '123145', '', 'te12312', 'ivyatanoso@yahoo.com', '09934917607', 'qwe', 'qweq', 'qweqwe', 'qweqweqwe', '2000-01-23'),
(103, 'Lawrence', '', 'Templado', 'ivyatanoso10@yahoo.com', '09934917607', 'Sta', 'qweqe', 'Marbel', 'South', '2001-10-23'),
(104, 'Andrei', 'Ian', 'Sumalpong', 'sumalpongandreiian@gmail.com', '09641426620', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2025-09-29'),
(105, 'Chastine Grace', NULL, 'Basio', 'chastinegracebasio12@gmail.com', '09123456789', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2004-03-11');

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `Password` text NOT NULL,
  `Role` enum('Staff','Borrower') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`UserID`, `Username`, `Password`, `Role`) VALUES
(1, 'andrei', '1234', 'Borrower'),
(2, 'admin', 'pbkdf2:sha256:600000$4Wht3mTj7oOoi3N7$cdc29efeb22c9dabbed224ea5fbe46ec631d1c50ca126dd7b8567cbd7a018a06', 'Staff'),
(3, 'librarian', 'pbkdf2:sha256:600000$L221hhwbcCovAny0$74cadaf8faf23d6a4c3ce18131068431f00419c27f01e1986cb9d0605e262e3e', 'Staff'),
(4, 'researcher', 'pbkdf2:sha256:600000$VEKtOMlvtkzdT6n7$b5dc04d92b7dc68ac55148c776d79a83c226d821daba6885a24b4a28f5827a8f', 'Borrower'),
(5, 'corndog', '112233', 'Borrower'),
(6, 'asubere', 'pbkdf2:sha256:600000$Dj9BfOnUtBLtvqnT$ac801b694c23768182174c8a897904f096e888556a449df62f66e66fb1a7954a', 'Borrower'),
(7, 'rinz', 'pbkdf2:sha256:600000$Dp7RrMEVQ9XQJbTW$5cbfa0ebd303bb01547c527b7a6449ad1ee66475d054e87b997d9c89194253b5', 'Borrower'),
(10, 'borrower123', 'pbkdf2:sha256:600000$P8zvtANnnqDEeBHT$5d18f79b4701ad53861217e165bd95f52ffd4a1680790d282a523deebb1a16a2', 'Borrower'),
(11, 'borrower', 'pbkdf2:sha256:600000$FNBs31DdNxa9qnC5$95b91a11a44213e3adbd92dcd7f74690b376f976a0fdf2b8c02740ab0339a74f', 'Borrower'),
(12, 'sush1nobi', 'pbkdf2:sha256:600000$cZGCpg20L0gV3gZQ$fa508c8330fa927e01dc86b2b42466c4cdf2f8315e2fda50c002071a8c8c352e', 'Borrower'),
(13, 'JohnD', 'pbkdf2:sha256:600000$PsNWiRKuSfWRI1JP$394f4b17dfc180b84e65fd6fdb3b7073509ccac691a10f84e884f9de01e0f186', 'Borrower'),
(14, 'User123', 'pbkdf2:sha256:600000$LvjcRORpYjzoPRDD$3bd106c744f3d569d5c1ab1feaf66d65681a06f64572960715c631f86ac7f899', 'Borrower'),
(15, 'blake123', 'pbkdf2:sha256:600000$JWhJvfMM5aL0jpI4$60b0c006ace092f06b70ff2d8d4939b2741ada41caeed4380c5f620ecd9bf5dc', 'Borrower'),
(16, 'blad', 'pbkdf2:sha256:600000$DexUTPl4x4TWzAZh$00ac6ee2defa5b10360099b06973895d509cba7e03aec028170e28232d6d20a4', 'Borrower'),
(102, 'qweqw', 'pbkdf2:sha256:600000$fHwkhetFizQXjubQ$b7de059c60e8ebf11a81b3ba2e4eeea8b687e1768e1a0d0287defcac744affe5', 'Staff'),
(103, 'bt.interlude', 'pbkdf2:sha256:600000$S5Yhdz1ajEz2LlI5$ddc4bff57331ef6d771a00d84151e742f5b0d3d15fbf56e10c1b888a1ce966f3', 'Borrower'),
(104, 'andrei1', 'pbkdf2:sha256:600000$luHJz3mJNRyvzmGa$2752e99f4a64a10eebd503a19554556fe06b8dfcaeb9c72b57d1cf4884b63de1', 'Borrower'),
(105, 'chastine', 'pbkdf2:sha256:600000$LJgKjTkKWOX9IAGF$7803cb8b8cc85f1d3971cacb6198f7b7f77aa30059e40d4c5e94403a4f932c41', 'Borrower');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ActionTypes`
--
ALTER TABLE `ActionTypes`
  ADD PRIMARY KEY (`ActionCode`);

--
-- Indexes for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD PRIMARY KEY (`AuditID`),
  ADD KEY `idx_audit_user` (`UserID`),
  ADD KEY `idx_audit_action` (`ActionCode`),
  ADD KEY `idx_audit_target` (`TargetTypeCode`,`TargetID`),
  ADD KEY `idx_audit_created` (`CreatedAt`);

--
-- Indexes for table `Books`
--
ALTER TABLE `Books`
  ADD PRIMARY KEY (`Book_ID`),
  ADD UNIQUE KEY `ux_books_isbn` (`ISBN`);

--
-- Indexes for table `Book_Inventory`
--
ALTER TABLE `Book_Inventory`
  ADD PRIMARY KEY (`Copy_ID`),
  ADD UNIQUE KEY `ux_book_inventory_accession` (`Accession_Number`),
  ADD KEY `idx_book_inventory_book` (`Book_ID`),
  ADD KEY `idx_book_inventory_storage` (`StorageLocation`);

--
-- Indexes for table `BorrowedItems`
--
ALTER TABLE `BorrowedItems`
  ADD PRIMARY KEY (`BorrowedItemID`),
  ADD KEY `idx_borroweditems_borrow` (`BorrowID`),
  ADD KEY `idx_borroweditems_bookcopy` (`BookCopyID`),
  ADD KEY `idx_borroweditems_docstorage` (`DocumentStorageID`),
  ADD KEY `idx_borroweditems_document` (`Document_ID`);

--
-- Indexes for table `Borrowers`
--
ALTER TABLE `Borrowers`
  ADD PRIMARY KEY (`BorrowerID`),
  ADD UNIQUE KEY `ux_borrowers_user` (`UserID`);

--
-- Indexes for table `BorrowTransactions`
--
ALTER TABLE `BorrowTransactions`
  ADD PRIMARY KEY (`BorrowID`),
  ADD KEY `idx_borrow_borrower` (`BorrowerID`),
  ADD KEY `idx_borrow_staff` (`ApprovedByStaffID`);

--
-- Indexes for table `Documents`
--
ALTER TABLE `Documents`
  ADD PRIMARY KEY (`Document_ID`);

--
-- Indexes for table `Document_Inventory`
--
ALTER TABLE `Document_Inventory`
  ADD PRIMARY KEY (`Storage_ID`),
  ADD KEY `idx_docinv_document` (`Document_ID`),
  ADD KEY `idx_docinv_storage` (`StorageLocation`);

--
-- Indexes for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD PRIMARY KEY (`NotificationID`),
  ADD KEY `idx_notifications_type` (`Type`),
  ADD KEY `idx_notifications_created` (`CreatedAt`);

--
-- Indexes for table `Notification_Recipients`
--
ALTER TABLE `Notification_Recipients`
  ADD PRIMARY KEY (`RecipientID`),
  ADD UNIQUE KEY `uq_notif_recipient` (`NotificationID`,`RecipientUserID`),
  ADD KEY `idx_recipients_unread` (`RecipientUserID`,`IsRead`,`CreatedAt`);

--
-- Indexes for table `Notification_Types`
--
ALTER TABLE `Notification_Types`
  ADD PRIMARY KEY (`Code`);

--
-- Indexes for table `PasswordResetCodes`
--
ALTER TABLE `PasswordResetCodes`
  ADD PRIMARY KEY (`ResetID`),
  ADD KEY `idx_user_expires` (`UserID`,`ExpiresAt`);

--
-- Indexes for table `ReturnedItems`
--
ALTER TABLE `ReturnedItems`
  ADD PRIMARY KEY (`ReturnedItemID`),
  ADD KEY `idx_returneditems_return` (`ReturnID`),
  ADD KEY `idx_returneditems_borrowed` (`BorrowedItemID`);

--
-- Indexes for table `ReturnTransactions`
--
ALTER TABLE `ReturnTransactions`
  ADD PRIMARY KEY (`ReturnID`),
  ADD KEY `idx_return_borrow` (`BorrowID`),
  ADD KEY `idx_return_staff` (`ReceivedByStaffID`);

--
-- Indexes for table `Staff`
--
ALTER TABLE `Staff`
  ADD PRIMARY KEY (`StaffID`),
  ADD UNIQUE KEY `ux_staff_user` (`UserID`);

--
-- Indexes for table `Storages`
--
ALTER TABLE `Storages`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `TargetTypes`
--
ALTER TABLE `TargetTypes`
  ADD PRIMARY KEY (`TargetTypeCode`);

--
-- Indexes for table `UserDetails`
--
ALTER TABLE `UserDetails`
  ADD PRIMARY KEY (`UserID`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `ux_users_username` (`Username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `AuditLog`
--
ALTER TABLE `AuditLog`
  MODIFY `AuditID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `Books`
--
ALTER TABLE `Books`
  MODIFY `Book_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `Book_Inventory`
--
ALTER TABLE `Book_Inventory`
  MODIFY `Copy_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=170;

--
-- AUTO_INCREMENT for table `BorrowedItems`
--
ALTER TABLE `BorrowedItems`
  MODIFY `BorrowedItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `Borrowers`
--
ALTER TABLE `Borrowers`
  MODIFY `BorrowerID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `BorrowTransactions`
--
ALTER TABLE `BorrowTransactions`
  MODIFY `BorrowID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `Documents`
--
ALTER TABLE `Documents`
  MODIFY `Document_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `Document_Inventory`
--
ALTER TABLE `Document_Inventory`
  MODIFY `Storage_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `Notifications`
--
ALTER TABLE `Notifications`
  MODIFY `NotificationID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `Notification_Recipients`
--
ALTER TABLE `Notification_Recipients`
  MODIFY `RecipientID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `PasswordResetCodes`
--
ALTER TABLE `PasswordResetCodes`
  MODIFY `ResetID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `ReturnedItems`
--
ALTER TABLE `ReturnedItems`
  MODIFY `ReturnedItemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `ReturnTransactions`
--
ALTER TABLE `ReturnTransactions`
  MODIFY `ReturnID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `Staff`
--
ALTER TABLE `Staff`
  MODIFY `StaffID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Storages`
--
ALTER TABLE `Storages`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AuditLog`
--
ALTER TABLE `AuditLog`
  ADD CONSTRAINT `fk_audit_action` FOREIGN KEY (`ActionCode`) REFERENCES `ActionTypes` (`ActionCode`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_audit_targettype` FOREIGN KEY (`TargetTypeCode`) REFERENCES `TargetTypes` (`TargetTypeCode`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Book_Inventory`
--
ALTER TABLE `Book_Inventory`
  ADD CONSTRAINT `fk_bookinv_book` FOREIGN KEY (`Book_ID`) REFERENCES `Books` (`Book_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookinv_storage` FOREIGN KEY (`StorageLocation`) REFERENCES `Storages` (`ID`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `BorrowedItems`
--
ALTER TABLE `BorrowedItems`
  ADD CONSTRAINT `fk_borroweditems_bookcopy` FOREIGN KEY (`BookCopyID`) REFERENCES `Book_Inventory` (`Copy_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_borroweditems_borrow` FOREIGN KEY (`BorrowID`) REFERENCES `BorrowTransactions` (`BorrowID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_borroweditems_docstorage` FOREIGN KEY (`DocumentStorageID`) REFERENCES `Document_Inventory` (`Storage_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_borroweditems_document` FOREIGN KEY (`Document_ID`) REFERENCES `Documents` (`Document_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Borrowers`
--
ALTER TABLE `Borrowers`
  ADD CONSTRAINT `fk_borrowers_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `BorrowTransactions`
--
ALTER TABLE `BorrowTransactions`
  ADD CONSTRAINT `fk_borrow_tx_borrower` FOREIGN KEY (`BorrowerID`) REFERENCES `Borrowers` (`BorrowerID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_borrow_tx_staff` FOREIGN KEY (`ApprovedByStaffID`) REFERENCES `Staff` (`StaffID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Document_Inventory`
--
ALTER TABLE `Document_Inventory`
  ADD CONSTRAINT `fk_docinv_document` FOREIGN KEY (`Document_ID`) REFERENCES `Documents` (`Document_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_docinv_storage` FOREIGN KEY (`StorageLocation`) REFERENCES `Storages` (`ID`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD CONSTRAINT `fk_notifications_type` FOREIGN KEY (`Type`) REFERENCES `Notification_Types` (`Code`) ON UPDATE CASCADE;

--
-- Constraints for table `Notification_Recipients`
--
ALTER TABLE `Notification_Recipients`
  ADD CONSTRAINT `fk_recipient_notification` FOREIGN KEY (`NotificationID`) REFERENCES `Notifications` (`NotificationID`) ON DELETE CASCADE;

--
-- Constraints for table `PasswordResetCodes`
--
ALTER TABLE `PasswordResetCodes`
  ADD CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `ReturnedItems`
--
ALTER TABLE `ReturnedItems`
  ADD CONSTRAINT `fk_returneditems_borrowed` FOREIGN KEY (`BorrowedItemID`) REFERENCES `BorrowedItems` (`BorrowedItemID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_returneditems_return` FOREIGN KEY (`ReturnID`) REFERENCES `ReturnTransactions` (`ReturnID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReturnTransactions`
--
ALTER TABLE `ReturnTransactions`
  ADD CONSTRAINT `fk_return_tx_borrow` FOREIGN KEY (`BorrowID`) REFERENCES `BorrowTransactions` (`BorrowID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_return_tx_staff` FOREIGN KEY (`ReceivedByStaffID`) REFERENCES `Staff` (`StaffID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Staff`
--
ALTER TABLE `Staff`
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserDetails`
--
ALTER TABLE `UserDetails`
  ADD CONSTRAINT `fk_userdetails_user` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
