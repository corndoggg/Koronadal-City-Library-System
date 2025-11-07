-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: o0wogkw84go08ocw0ss4goo4
-- Generation Time: Nov 07, 2025 at 04:07 AM
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
  `StorageLocation` int(11) NOT NULL,
  `UpdatedOn` datetime NOT NULL DEFAULT current_timestamp(),
  `LostOn` datetime DEFAULT NULL,
  `FoundOn` datetime DEFAULT NULL
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
  `StorageLocation` int(11) NOT NULL,
  `UpdatedOn` datetime NOT NULL DEFAULT current_timestamp(),
  `LostOn` datetime DEFAULT NULL,
  `FoundOn` datetime DEFAULT NULL
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

-- --------------------------------------------------------

--
-- Table structure for table `Storages`
--

CREATE TABLE `Storages` (
  `ID` int(11) NOT NULL,
  `Name` varchar(50) NOT NULL,
  `Capacity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `TargetTypes`
--

CREATE TABLE `TargetTypes` (
  `TargetTypeCode` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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
  MODIFY `BorrowerID` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `PasswordResetCodes`
--
ALTER TABLE `PasswordResetCodes`
  MODIFY `ResetID` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `StaffID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Storages`
--
ALTER TABLE `Storages`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT;

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
