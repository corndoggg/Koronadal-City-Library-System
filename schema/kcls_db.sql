-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.8.2-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for kcls_db
CREATE DATABASE IF NOT EXISTS `kcls_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `kcls_db`;

-- Dumping structure for table kcls_db.books
CREATE TABLE IF NOT EXISTS `books` (
  `Book_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Title` varchar(255) NOT NULL,
  `Author` varchar(255) DEFAULT NULL,
  `Edition` varchar(50) DEFAULT NULL,
  `Publisher` varchar(255) DEFAULT NULL,
  `Year` year(4) DEFAULT NULL,
  `Subject` varchar(100) DEFAULT NULL,
  `Language` varchar(50) DEFAULT NULL,
  `ISBN` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Book_ID`),
  UNIQUE KEY `ISBN` (`ISBN`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.books: ~3 rows (approximately)
REPLACE INTO `books` (`Book_ID`, `Title`, `Author`, `Edition`, `Publisher`, `Year`, `Subject`, `Language`, `ISBN`) VALUES
	(5, 'Farming Basics', 'N/A', '1st', 'N/A', '2003', 'General', 'English', '312321312128'),
	(6, 'Introduction to CSS', 'Renz Mariscal', '1st', 'N/A', '2017', 'Information Technology', 'English', '122331155'),
	(7, 'Test', 'N/a', '1st', 'N/A', '2015', 'IT', 'English', '103547896');

-- Dumping structure for table kcls_db.book_inventory
CREATE TABLE IF NOT EXISTS `book_inventory` (
  `Copy_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Book_ID` int(11) NOT NULL,
  `Accession_Number` varchar(50) DEFAULT NULL,
  `Availability` varchar(50) DEFAULT NULL,
  `Physical_Status` varchar(100) DEFAULT NULL,
  `BookCondition` varchar(100) DEFAULT NULL,
  `StorageLocation` int(11) NOT NULL,
  PRIMARY KEY (`Copy_ID`),
  UNIQUE KEY `Accession_Number` (`Accession_Number`),
  KEY `Book_ID` (`Book_ID`),
  KEY `FK_book_inventory_storages` (`StorageLocation`),
  CONSTRAINT `FK_book_inventory_storages` FOREIGN KEY (`StorageLocation`) REFERENCES `storages` (`ID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `book_inventory_ibfk_1` FOREIGN KEY (`Book_ID`) REFERENCES `books` (`Book_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.book_inventory: ~4 rows (approximately)
REPLACE INTO `book_inventory` (`Copy_ID`, `Book_ID`, `Accession_Number`, `Availability`, `Physical_Status`, `BookCondition`, `StorageLocation`) VALUES
	(1, 5, 'B2313323567', 'Borrowed', 'Shelf-worn', 'Good', 2),
	(2, 6, 'C-10001', 'Borrowed', 'Good', 'Good', 2),
	(3, 5, 'B12121', 'Available', 'Good', 'Good', 2),
	(4, 7, 'B12324', 'Borrowed', 'Shelf-worn', 'Good', 3);

-- Dumping structure for table kcls_db.borroweditems
CREATE TABLE IF NOT EXISTS `borroweditems` (
  `BorrowedItemID` int(11) NOT NULL AUTO_INCREMENT,
  `BorrowID` int(11) NOT NULL,
  `ItemType` enum('Book','Document') NOT NULL,
  `BookCopyID` int(11) DEFAULT NULL,
  `DocumentStorageID` int(11) DEFAULT NULL,
  `InitialCondition` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`BorrowedItemID`),
  KEY `BorrowID` (`BorrowID`),
  KEY `BookCopyID` (`BookCopyID`),
  KEY `DocumentStorageID` (`DocumentStorageID`),
  CONSTRAINT `borroweditems_ibfk_1` FOREIGN KEY (`BorrowID`) REFERENCES `borrowtransactions` (`BorrowID`),
  CONSTRAINT `borroweditems_ibfk_2` FOREIGN KEY (`BookCopyID`) REFERENCES `book_inventory` (`Copy_ID`),
  CONSTRAINT `borroweditems_ibfk_3` FOREIGN KEY (`DocumentStorageID`) REFERENCES `document_inventory` (`Storage_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.borroweditems: ~16 rows (approximately)
REPLACE INTO `borroweditems` (`BorrowedItemID`, `BorrowID`, `ItemType`, `BookCopyID`, `DocumentStorageID`, `InitialCondition`) VALUES
	(12, 10, 'Book', 1, NULL, 'Good'),
	(13, 11, 'Book', 3, NULL, 'Good'),
	(14, 11, 'Book', 4, NULL, 'Good'),
	(15, 12, 'Book', 3, NULL, 'Good'),
	(16, 13, 'Book', 1, NULL, 'Good'),
	(17, 14, 'Book', 1, NULL, 'Good'),
	(18, 14, 'Book', 2, NULL, 'Good'),
	(19, 19, 'Book', 3, NULL, 'Good'),
	(20, 20, 'Book', 1, NULL, 'Good'),
	(21, 21, 'Book', 2, NULL, 'Good'),
	(22, 21, 'Book', 4, NULL, 'Good'),
	(23, 22, 'Document', NULL, 3, 'Bad'),
	(24, 23, 'Book', 1, NULL, 'Good'),
	(25, 24, 'Document', NULL, 4, 'Good'),
	(26, 25, 'Document', NULL, 4, 'Good'),
	(27, 26, 'Document', NULL, 4, 'Good');

-- Dumping structure for table kcls_db.borrowers
CREATE TABLE IF NOT EXISTS `borrowers` (
  `BorrowerID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `Type` enum('Researcher','Government Agency') NOT NULL,
  `Department` varchar(100) DEFAULT NULL,
  `AccountStatus` enum('Pending','Registered','Suspended','Rejected') NOT NULL,
  PRIMARY KEY (`BorrowerID`),
  UNIQUE KEY `UserID` (`UserID`),
  CONSTRAINT `borrowers_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.borrowers: ~2 rows (approximately)
REPLACE INTO `borrowers` (`BorrowerID`, `UserID`, `Type`, `Department`, `AccountStatus`) VALUES
	(1, 1, 'Researcher', 'N/A', 'Registered'),
	(2, 4, 'Researcher', 'N/A', 'Registered');

-- Dumping structure for table kcls_db.borrowtransactions
CREATE TABLE IF NOT EXISTS `borrowtransactions` (
  `BorrowID` int(11) NOT NULL AUTO_INCREMENT,
  `BorrowerID` int(11) NOT NULL,
  `Purpose` text DEFAULT NULL,
  `ApprovalStatus` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `ApprovedByStaffID` int(11) DEFAULT NULL,
  `RetrievalStatus` enum('Pending','Retrieved','Returned') NOT NULL DEFAULT 'Pending',
  `ReturnStatus` enum('Returned','Not Returned') NOT NULL DEFAULT 'Not Returned',
  `BorrowDate` date DEFAULT NULL,
  PRIMARY KEY (`BorrowID`),
  KEY `BorrowerID` (`BorrowerID`),
  KEY `ApprovedByStaffID` (`ApprovedByStaffID`),
  CONSTRAINT `borrowtransactions_ibfk_1` FOREIGN KEY (`BorrowerID`) REFERENCES `borrowers` (`BorrowerID`),
  CONSTRAINT `borrowtransactions_ibfk_2` FOREIGN KEY (`ApprovedByStaffID`) REFERENCES `staff` (`StaffID`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.borrowtransactions: ~13 rows (approximately)
REPLACE INTO `borrowtransactions` (`BorrowID`, `BorrowerID`, `Purpose`, `ApprovalStatus`, `ApprovedByStaffID`, `RetrievalStatus`, `ReturnStatus`, `BorrowDate`) VALUES
	(10, 1, 'Test', 'Rejected', NULL, 'Returned', 'Returned', '2025-07-17'),
	(11, 1, 'Personal Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-17'),
	(12, 1, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-23'),
	(13, 1, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-24'),
	(14, 1, 'Personal', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-08'),
	(19, 2, 'dwadwd', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-09'),
	(20, 2, 'Test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-15'),
	(21, 2, '12233', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-08-15'),
	(22, 2, 'test', 'Pending', NULL, 'Pending', 'Not Returned', '2025-08-22'),
	(23, 2, 'weqweqe', 'Pending', NULL, 'Pending', 'Not Returned', '2025-08-22'),
	(24, 2, 'wadwdad', 'Pending', NULL, 'Pending', 'Not Returned', '2025-08-22'),
	(25, 2, 'wadwdad', 'Pending', NULL, 'Pending', 'Not Returned', '2025-08-22'),
	(26, 2, 'wadwdad', 'Pending', NULL, 'Pending', 'Not Returned', '2025-08-22');

-- Dumping structure for table kcls_db.documents
CREATE TABLE IF NOT EXISTS `documents` (
  `Document_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Title` varchar(255) NOT NULL,
  `Author` varchar(255) DEFAULT NULL,
  `Category` varchar(100) DEFAULT NULL,
  `Department` varchar(100) DEFAULT NULL,
  `Classification` varchar(100) DEFAULT NULL,
  `Year` int(11) DEFAULT NULL,
  `Sensitivity` varchar(50) DEFAULT NULL,
  `File_Path` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`Document_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.documents: ~4 rows (approximately)
REPLACE INTO `documents` (`Document_ID`, `Title`, `Author`, `Category`, `Department`, `Classification`, `Year`, `Sensitivity`, `File_Path`) VALUES
	(9, 'CA-1212', 'N/A', 'Other', 'N/A', 'Goverment Document', 2003, 'Public', '/uploads/75b1f6ab-5c90-4842-8a92-8b8534dbe171_Almelda_08Quiz1.pdf'),
	(10, 'Capstone Project', 'N/A', 'Capstone', 'N/A', 'Public Resource', 2010, 'Public', '/uploads/2d829061-f6bb-40d6-8a18-98ce74c4318d_final_group_8_print.pdf'),
	(11, 'Test', 'N/A', 'Case Study', 'dawdwad', 'Public Resource', 2003, 'Restricted', '/uploads/17d916f0-230b-4014-8102-8f6a1f400c82_08_Handout_115_1.pdf'),
	(12, 'czscz', 'cszc', 'Thesis', 'czsc', 'Goverment Document', 203, 'Restricted', '/uploads/254988cd-6cc2-4924-bea3-7c03411ef52d_01_Laboratory_Activity_1_1.pdf');

-- Dumping structure for table kcls_db.document_inventory
CREATE TABLE IF NOT EXISTS `document_inventory` (
  `Storage_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Document_ID` int(11) NOT NULL,
  `Availability` varchar(50) NOT NULL,
  `Condition` varchar(50) NOT NULL,
  `StorageLocation` int(11) NOT NULL,
  PRIMARY KEY (`Storage_ID`),
  KEY `Document_ID` (`Document_ID`),
  KEY `StorageID` (`StorageLocation`),
  CONSTRAINT `FK_document_inventory_storages` FOREIGN KEY (`StorageLocation`) REFERENCES `storages` (`ID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `document_inventory_ibfk_1` FOREIGN KEY (`Document_ID`) REFERENCES `documents` (`Document_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.document_inventory: ~4 rows (approximately)
REPLACE INTO `document_inventory` (`Storage_ID`, `Document_ID`, `Availability`, `Condition`, `StorageLocation`) VALUES
	(3, 9, 'Borrowed', 'Bad', 1),
	(4, 10, 'Available', 'Good', 1),
	(7, 11, 'Available', 'Bad', 1),
	(8, 12, 'Available', 'good', 1);

-- Dumping structure for table kcls_db.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `NotificationID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `Type` varchar(64) NOT NULL,
  `Title` varchar(160) DEFAULT NULL,
  `Message` text NOT NULL,
  `SenderUserID` bigint(20) unsigned DEFAULT NULL,
  `RelatedType` varchar(32) DEFAULT NULL,
  `RelatedID` bigint(20) unsigned DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`NotificationID`),
  KEY `idx_notifications_type` (`Type`),
  KEY `idx_notifications_created` (`CreatedAt`),
  CONSTRAINT `fk_notifications_type` FOREIGN KEY (`Type`) REFERENCES `notification_types` (`Code`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.notifications: ~0 rows (approximately)

-- Dumping structure for table kcls_db.notification_recipients
CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `RecipientID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `NotificationID` bigint(20) unsigned NOT NULL,
  `RecipientUserID` bigint(20) unsigned NOT NULL,
  `IsRead` tinyint(1) NOT NULL DEFAULT 0,
  `ReadAt` datetime DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`RecipientID`),
  UNIQUE KEY `uq_notif_recipient` (`NotificationID`,`RecipientUserID`),
  KEY `idx_recipients_unread` (`RecipientUserID`,`IsRead`,`CreatedAt`),
  CONSTRAINT `fk_recipient_notification` FOREIGN KEY (`NotificationID`) REFERENCES `notifications` (`NotificationID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.notification_recipients: ~0 rows (approximately)

-- Dumping structure for table kcls_db.notification_types
CREATE TABLE IF NOT EXISTS `notification_types` (
  `Code` varchar(64) NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.notification_types: ~14 rows (approximately)
REPLACE INTO `notification_types` (`Code`, `Description`) VALUES
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

-- Dumping structure for table kcls_db.returneditems
CREATE TABLE IF NOT EXISTS `returneditems` (
  `ReturnedItemID` int(11) NOT NULL AUTO_INCREMENT,
  `ReturnID` int(11) NOT NULL,
  `BorrowedItemID` int(11) NOT NULL,
  `ReturnCondition` varchar(100) DEFAULT NULL,
  `Fine` decimal(10,2) DEFAULT 0.00,
  `FinePaid` enum('Yes','No') DEFAULT 'No',
  PRIMARY KEY (`ReturnedItemID`),
  KEY `ReturnID` (`ReturnID`),
  KEY `BorrowedItemID` (`BorrowedItemID`),
  CONSTRAINT `returneditems_ibfk_1` FOREIGN KEY (`ReturnID`) REFERENCES `returntransactions` (`ReturnID`),
  CONSTRAINT `returneditems_ibfk_2` FOREIGN KEY (`BorrowedItemID`) REFERENCES `borroweditems` (`BorrowedItemID`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.returneditems: ~9 rows (approximately)
REPLACE INTO `returneditems` (`ReturnedItemID`, `ReturnID`, `BorrowedItemID`, `ReturnCondition`, `Fine`, `FinePaid`) VALUES
	(1, 3, 13, 'Good', 1.00, 'Yes'),
	(2, 3, 14, 'Good', 1.00, 'Yes'),
	(3, 5, 12, 'Good', 10.00, 'Yes'),
	(4, 6, 15, 'Good', 11.00, 'No'),
	(5, 8, 16, 'Good', 10.00, 'Yes'),
	(6, 11, 17, 'Good', 0.00, 'Yes'),
	(7, 11, 18, 'Good', 0.00, 'Yes'),
	(8, 12, 19, 'Good', 0.00, 'Yes'),
	(9, 16, 20, 'Good', 0.00, 'Yes');

-- Dumping structure for table kcls_db.returntransactions
CREATE TABLE IF NOT EXISTS `returntransactions` (
  `ReturnID` int(11) NOT NULL AUTO_INCREMENT,
  `BorrowID` int(11) NOT NULL,
  `ReturnDate` date NOT NULL,
  `ReceivedByStaffID` int(11) DEFAULT NULL,
  `Remarks` text DEFAULT NULL,
  PRIMARY KEY (`ReturnID`),
  KEY `BorrowID` (`BorrowID`),
  KEY `ReceivedByStaffID` (`ReceivedByStaffID`),
  CONSTRAINT `returntransactions_ibfk_1` FOREIGN KEY (`BorrowID`) REFERENCES `borrowtransactions` (`BorrowID`),
  CONSTRAINT `returntransactions_ibfk_2` FOREIGN KEY (`ReceivedByStaffID`) REFERENCES `staff` (`StaffID`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.returntransactions: ~20 rows (approximately)
REPLACE INTO `returntransactions` (`ReturnID`, `BorrowID`, `ReturnDate`, `ReceivedByStaffID`, `Remarks`) VALUES
	(1, 10, '2025-07-25', NULL, NULL),
	(2, 11, '2025-07-19', NULL, NULL),
	(3, 11, '2025-07-23', NULL, ''),
	(4, 12, '2025-07-24', NULL, NULL),
	(5, 10, '2025-07-23', NULL, ''),
	(6, 12, '2025-07-23', NULL, ''),
	(7, 13, '2025-07-25', NULL, NULL),
	(8, 13, '2025-07-24', NULL, ''),
	(9, 14, '2025-08-15', NULL, NULL),
	(10, 19, '2025-08-09', NULL, NULL),
	(11, 14, '2025-08-15', NULL, ''),
	(12, 19, '2025-08-15', NULL, ''),
	(13, 20, '2025-08-23', NULL, NULL),
	(14, 21, '2025-08-17', NULL, NULL),
	(15, 22, '2025-08-30', NULL, NULL),
	(16, 20, '2025-08-22', NULL, ''),
	(17, 23, '2025-08-24', NULL, NULL),
	(18, 24, '2025-08-24', NULL, NULL),
	(19, 25, '2025-08-24', NULL, NULL),
	(20, 26, '2025-08-24', NULL, NULL);

-- Dumping structure for table kcls_db.staff
CREATE TABLE IF NOT EXISTS `staff` (
  `StaffID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `Position` enum('Librarian','Admin') NOT NULL,
  PRIMARY KEY (`StaffID`),
  UNIQUE KEY `UserID` (`UserID`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.staff: ~2 rows (approximately)
REPLACE INTO `staff` (`StaffID`, `UserID`, `Position`) VALUES
	(1, 2, 'Admin'),
	(2, 3, 'Librarian');

-- Dumping structure for table kcls_db.storages
CREATE TABLE IF NOT EXISTS `storages` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) NOT NULL DEFAULT '0',
  `Capacity` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.storages: ~3 rows (approximately)
REPLACE INTO `storages` (`ID`, `Name`, `Capacity`) VALUES
	(1, 'Shelf D1', 0),
	(2, 'Shelf B2', 0),
	(3, 'Shelf D3', 0);

-- Dumping structure for table kcls_db.userdetails
CREATE TABLE IF NOT EXISTS `userdetails` (
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
  `DateOfBirth` date DEFAULT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `userdetails_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.userdetails: ~4 rows (approximately)
REPLACE INTO `userdetails` (`UserID`, `Firstname`, `Middlename`, `Lastname`, `Email`, `ContactNumber`, `Street`, `Barangay`, `City`, `Province`, `DateOfBirth`) VALUES
	(1, 'test', 'test', 'test', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(2, 'admin', 'admin', 'admin', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(3, 'John', 'Smith', 'Doe', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(4, 'Andrei', 'Lagos', 'Sumalpong', 'sumalpong@gamil.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2003-11-18');

-- Dumping structure for table kcls_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `Password` varchar(100) NOT NULL,
  `Role` enum('Staff','Borrower') NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table kcls_db.users: ~4 rows (approximately)
REPLACE INTO `users` (`UserID`, `Username`, `Password`, `Role`) VALUES
	(1, 'andrei', '1234', 'Borrower'),
	(2, 'admin', '1234', 'Staff'),
	(3, 'librarian', '1234', 'Staff'),
	(4, 'researcher', '123456', 'Borrower');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
