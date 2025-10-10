-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: cwsw0sccogc08w08s8c844sg
-- Generation Time: Oct 10, 2025 at 05:14 PM
-- Server version: 11.8.3-MariaDB-ubu2404
-- PHP Version: 8.4.11

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
  `StorageLocation` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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
(14, 104, 'Researcher', 'N/A', 'Pending');

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
  `BorrowDate` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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

-- --------------------------------------------------------

--
-- Table structure for table `Document_Inventory`
--

CREATE TABLE `Document_Inventory` (
  `Storage_ID` int(11) NOT NULL,
  `Document_ID` int(11) NOT NULL,
  `Availability` varchar(50) NOT NULL,
  `Condition` varchar(50) NOT NULL,
  `StorageLocation` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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
(1, 'Shelf D1', 100),
(2, 'Shelf B2', 50),
(3, 'Shelf D3', 25);

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
(2, 'Jan1221', 'Adam', 'Smith', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', NULL),
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
(104, 'Andrei', 'Ian', 'Sumalpong', 'sumalpongandreiian@gmail.com', '09641426620', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2025-09-29');

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
(104, 'andrei1', 'pbkdf2:sha256:600000$luHJz3mJNRyvzmGa$2752e99f4a64a10eebd503a19554556fe06b8dfcaeb9c72b57d1cf4884b63de1', 'Borrower');

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
  MODIFY `AuditID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Books`
--
ALTER TABLE `Books`
  MODIFY `Book_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Book_Inventory`
--
ALTER TABLE `Book_Inventory`
  MODIFY `Copy_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `BorrowedItems`
--
ALTER TABLE `BorrowedItems`
  MODIFY `BorrowedItemID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Borrowers`
--
ALTER TABLE `Borrowers`
  MODIFY `BorrowerID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `BorrowTransactions`
--
ALTER TABLE `BorrowTransactions`
  MODIFY `BorrowID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Documents`
--
ALTER TABLE `Documents`
  MODIFY `Document_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Document_Inventory`
--
ALTER TABLE `Document_Inventory`
  MODIFY `Storage_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Notifications`
--
ALTER TABLE `Notifications`
  MODIFY `NotificationID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Notification_Recipients`
--
ALTER TABLE `Notification_Recipients`
  MODIFY `RecipientID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReturnedItems`
--
ALTER TABLE `ReturnedItems`
  MODIFY `ReturnedItemID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReturnTransactions`
--
ALTER TABLE `ReturnTransactions`
  MODIFY `ReturnID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Staff`
--
ALTER TABLE `Staff`
  MODIFY `StaffID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Storages`
--
ALTER TABLE `Storages`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

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
