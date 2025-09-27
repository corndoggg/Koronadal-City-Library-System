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
CREATE DATABASE IF NOT EXISTS `kcls_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_uca1400_ai_ci;
USE `kcls_db`;

-- 1. Core user tables
CREATE TABLE IF NOT EXISTS `Users` (
  `UserID` INT(11) NOT NULL AUTO_INCREMENT,
  `Username` VARCHAR(50) NOT NULL,
  `Password` VARCHAR(100) NOT NULL,
  `Role` ENUM('Staff','Borrower') NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `ux_users_username` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `UserDetails` (
  `UserID` INT(11) NOT NULL,
  `Firstname` VARCHAR(100) NOT NULL,
  `Middlename` VARCHAR(100) DEFAULT NULL,
  `Lastname` VARCHAR(100) NOT NULL,
  `Email` VARCHAR(100) NOT NULL,
  `ContactNumber` VARCHAR(100) DEFAULT NULL,
  `Street` VARCHAR(100) DEFAULT NULL,
  `Barangay` VARCHAR(100) DEFAULT NULL,
  `City` VARCHAR(100) DEFAULT NULL,
  `Province` VARCHAR(100) DEFAULT NULL,
  `DateOfBirth` DATE DEFAULT NULL,
  PRIMARY KEY (`UserID`),
  CONSTRAINT `fk_userdetails_user`
    FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Staff` (
  `StaffID` INT(11) NOT NULL AUTO_INCREMENT,
  `UserID` INT(11) NOT NULL,
  `Position` ENUM('Librarian','Admin') NOT NULL,
  PRIMARY KEY (`StaffID`),
  UNIQUE KEY `ux_staff_user` (`UserID`),
  CONSTRAINT `fk_staff_user`
    FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Borrowers` (
  `BorrowerID` INT(11) NOT NULL AUTO_INCREMENT,
  `UserID` INT(11) NOT NULL,
  `Type` ENUM('Researcher','Government Agency') NOT NULL,
  `Department` VARCHAR(100) DEFAULT NULL,
  `AccountStatus` ENUM('Pending','Registered','Suspended','Rejected') NOT NULL,
  PRIMARY KEY (`BorrowerID`),
  UNIQUE KEY `ux_borrowers_user` (`UserID`),
  CONSTRAINT `fk_borrowers_user`
    FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 2. Static / catalog resources
CREATE TABLE IF NOT EXISTS `Books` (
  `Book_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `Title` VARCHAR(255) NOT NULL,
  `Author` VARCHAR(255) DEFAULT NULL,
  `Edition` VARCHAR(50) DEFAULT NULL,
  `Publisher` VARCHAR(255) DEFAULT NULL,
  `Year` YEAR(4) DEFAULT NULL,
  `Subject` VARCHAR(100) DEFAULT NULL,
  `Language` VARCHAR(50) DEFAULT NULL,
  `ISBN` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`Book_ID`),
  UNIQUE KEY `ux_books_isbn` (`ISBN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Documents` (
  `Document_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `Title` VARCHAR(255) NOT NULL,
  `Author` VARCHAR(255) DEFAULT NULL,
  `Category` VARCHAR(100) DEFAULT NULL,
  `Department` VARCHAR(100) DEFAULT NULL,
  `Classification` VARCHAR(100) DEFAULT NULL,
  `Year` INT(11) DEFAULT NULL,
  `Sensitivity` VARCHAR(50) DEFAULT NULL,
  `File_Path` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`Document_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Storages` (
  `ID` INT(11) NOT NULL AUTO_INCREMENT,
  `Name` VARCHAR(50) NOT NULL,
  `Capacity` INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 3. Inventories
CREATE TABLE IF NOT EXISTS `Book_Inventory` (
  `Copy_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `Book_ID` INT(11) NOT NULL,
  `Accession_Number` VARCHAR(50) DEFAULT NULL,
  `Availability` VARCHAR(50) DEFAULT NULL,
  `BookCondition` VARCHAR(100) DEFAULT NULL,
  `StorageLocation` INT(11) NOT NULL,
  PRIMARY KEY (`Copy_ID`),
  UNIQUE KEY `ux_book_inventory_accession` (`Accession_Number`),
  KEY `idx_book_inventory_book` (`Book_ID`),
  KEY `idx_book_inventory_storage` (`StorageLocation`),
  CONSTRAINT `fk_bookinv_book`
    FOREIGN KEY (`Book_ID`) REFERENCES `Books` (`Book_ID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookinv_storage`
    FOREIGN KEY (`StorageLocation`) REFERENCES `Storages` (`ID`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Document_Inventory` (
  `Storage_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `Document_ID` INT(11) NOT NULL,
  `Availability` VARCHAR(50) NOT NULL,
  `Condition` VARCHAR(50) NOT NULL,
  `StorageLocation` INT(11) NOT NULL,
  PRIMARY KEY (`Storage_ID`),
  KEY `idx_docinv_document` (`Document_ID`),
  KEY `idx_docinv_storage` (`StorageLocation`),
  CONSTRAINT `fk_docinv_document`
    FOREIGN KEY (`Document_ID`) REFERENCES `Documents` (`Document_ID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_docinv_storage`
    FOREIGN KEY (`StorageLocation`) REFERENCES `Storages` (`ID`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 4. Borrow / return transactions
CREATE TABLE IF NOT EXISTS `BorrowTransactions` (
  `BorrowID` INT(11) NOT NULL AUTO_INCREMENT,
  `BorrowerID` INT(11) NOT NULL,
  `Purpose` TEXT DEFAULT NULL,
  `ApprovalStatus` ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `ApprovedByStaffID` INT(11) DEFAULT NULL,
  `RetrievalStatus` ENUM('Pending','Retrieved','Returned') NOT NULL DEFAULT 'Pending',
  `ReturnStatus` ENUM('Returned','Not Returned') NOT NULL DEFAULT 'Not Returned',
  `BorrowDate` DATE DEFAULT NULL,
  PRIMARY KEY (`BorrowID`),
  KEY `idx_borrow_borrower` (`BorrowerID`),
  KEY `idx_borrow_staff` (`ApprovedByStaffID`),
  CONSTRAINT `fk_borrow_tx_borrower`
    FOREIGN KEY (`BorrowerID`) REFERENCES `Borrowers` (`BorrowerID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_borrow_tx_staff`
    FOREIGN KEY (`ApprovedByStaffID`) REFERENCES `Staff` (`StaffID`)
      ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `BorrowedItems` (
  `BorrowedItemID` INT(11) NOT NULL AUTO_INCREMENT,
  `BorrowID` INT(11) NOT NULL,
  `ItemType` ENUM('Book','Document') NOT NULL,
  `BookCopyID` INT(11) DEFAULT NULL,
  `DocumentStorageID` INT(11) DEFAULT NULL,
  `Document_ID` INT(11) DEFAULT NULL,
  `InitialCondition` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`BorrowedItemID`),
  KEY `idx_borroweditems_borrow` (`BorrowID`),
  KEY `idx_borroweditems_bookcopy` (`BookCopyID`),
  KEY `idx_borroweditems_docstorage` (`DocumentStorageID`),
  KEY `idx_borroweditems_document` (`Document_ID`),
  CONSTRAINT `fk_borroweditems_borrow`
    FOREIGN KEY (`BorrowID`) REFERENCES `BorrowTransactions` (`BorrowID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_borroweditems_bookcopy`
    FOREIGN KEY (`BookCopyID`) REFERENCES `Book_Inventory` (`Copy_ID`)
      ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_borroweditems_docstorage`
    FOREIGN KEY (`DocumentStorageID`) REFERENCES `Document_Inventory` (`Storage_ID`)
      ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_borroweditems_document`
    FOREIGN KEY (`Document_ID`) REFERENCES `Documents` (`Document_ID`)
      ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `ReturnTransactions` (
  `ReturnID` INT(11) NOT NULL AUTO_INCREMENT,
  `BorrowID` INT(11) NOT NULL,
  `ReturnDate` DATE NOT NULL,
  `ReceivedByStaffID` INT(11) DEFAULT NULL,
  `Remarks` TEXT DEFAULT NULL,
  PRIMARY KEY (`ReturnID`),
  KEY `idx_return_borrow` (`BorrowID`),
  KEY `idx_return_staff` (`ReceivedByStaffID`),
  CONSTRAINT `fk_return_tx_borrow`
    FOREIGN KEY (`BorrowID`) REFERENCES `BorrowTransactions` (`BorrowID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_return_tx_staff`
    FOREIGN KEY (`ReceivedByStaffID`) REFERENCES `Staff` (`StaffID`)
      ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `ReturnedItems` (
  `ReturnedItemID` INT(11) NOT NULL AUTO_INCREMENT,
  `ReturnID` INT(11) NOT NULL,
  `BorrowedItemID` INT(11) NOT NULL,
  `ReturnCondition` VARCHAR(100) DEFAULT NULL,
  `Fine` DECIMAL(10,2) DEFAULT 0.00,
  `FinePaid` ENUM('Yes','No') DEFAULT 'No',
  PRIMARY KEY (`ReturnedItemID`),
  KEY `idx_returneditems_return` (`ReturnID`),
  KEY `idx_returneditems_borrowed` (`BorrowedItemID`),
  CONSTRAINT `fk_returneditems_return`
    FOREIGN KEY (`ReturnID`) REFERENCES `ReturnTransactions` (`ReturnID`)
      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_returneditems_borrowed`
    FOREIGN KEY (`BorrowedItemID`) REFERENCES `BorrowedItems` (`BorrowedItemID`)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 5. Notifications
CREATE TABLE IF NOT EXISTS `Notification_Types` (
  `Code` VARCHAR(64) NOT NULL,
  `Description` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Notifications` (
  `NotificationID` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `Type` VARCHAR(64) NOT NULL,
  `Title` VARCHAR(160) DEFAULT NULL,
  `Message` TEXT NOT NULL,
  `SenderUserID` BIGINT(20) UNSIGNED DEFAULT NULL,
  `RelatedType` VARCHAR(32) DEFAULT NULL,
  `RelatedID` BIGINT(20) UNSIGNED DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`NotificationID`),
  KEY `idx_notifications_type` (`Type`),
  KEY `idx_notifications_created` (`CreatedAt`),
  CONSTRAINT `fk_notifications_type`
    FOREIGN KEY (`Type`) REFERENCES `Notification_Types` (`Code`)
      ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `Notification_Recipients` (
  `RecipientID` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `NotificationID` BIGINT(20) UNSIGNED NOT NULL,
  `RecipientUserID` BIGINT(20) UNSIGNED NOT NULL,
  `IsRead` TINYINT(1) NOT NULL DEFAULT 0,
  `ReadAt` DATETIME DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`RecipientID`),
  UNIQUE KEY `uq_notif_recipient` (`NotificationID`,`RecipientUserID`),
  KEY `idx_recipients_unread` (`RecipientUserID`,`IsRead`,`CreatedAt`),
  CONSTRAINT `fk_recipient_notification`
    FOREIGN KEY (`NotificationID`) REFERENCES `Notifications` (`NotificationID`)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Action types master (what happened)
CREATE TABLE IF NOT EXISTS `ActionTypes` (
  `ActionCode` VARCHAR(50) NOT NULL,
  `Description` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`ActionCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Target types master (what kind of entity was acted on)
CREATE TABLE IF NOT EXISTS `TargetTypes` (
  `TargetTypeCode` VARCHAR(50) NOT NULL,
  `Description` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`TargetTypeCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- General audit log
CREATE TABLE IF NOT EXISTS `AuditLog` (
  `AuditID` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `UserID` INT(11) DEFAULT NULL,            -- actor (nullable for system events)
  `ActionCode` VARCHAR(50) NOT NULL,        -- FK to ActionTypes
  `TargetTypeCode` VARCHAR(50) DEFAULT NULL,-- FK to TargetTypes
  `TargetID` BIGINT DEFAULT NULL,           -- ID of the specific target (BorrowID, Document_ID, etc.)
  `Details` TEXT DEFAULT NULL,              -- JSON/text details
  `IPAddress` VARCHAR(64) DEFAULT NULL,
  `UserAgent` VARCHAR(255) DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AuditID`),
  KEY `idx_audit_user` (`UserID`),
  KEY `idx_audit_action` (`ActionCode`),
  KEY `idx_audit_target` (`TargetTypeCode`,`TargetID`),
  KEY `idx_audit_created` (`CreatedAt`),
  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`)
      ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_action`
    FOREIGN KEY (`ActionCode`) REFERENCES `ActionTypes` (`ActionCode`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_targettype`
    FOREIGN KEY (`TargetTypeCode`) REFERENCES `TargetTypes` (`TargetTypeCode`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Seed common action types
INSERT IGNORE INTO `ActionTypes` (ActionCode, Description) VALUES
 ('LOGIN_ATTEMPT','User login attempt'),
 ('LOGIN_SUCCESS','Successful login'),
 ('LOGIN_FAILURE','Failed login'),
 ('LOGOUT','User logout'),
 ('PASSWORD_CHANGE','Password changed'),
 ('PROFILE_UPDATE','User profile updated'),
 ('BORROW_REQUEST','Borrow request submitted'),
 ('BORROW_APPROVE','Borrow request approved'),
 ('BORROW_REJECT','Borrow request rejected'),
 ('BORROW_RETRIEVE','Borrow items retrieved'),
 ('BORROW_RETURN','Borrow fully returned'),
 ('BORROW_ITEM_RETURN','Single item returned'),
 ('BORROW_OVERDUE','Borrow marked overdue'),
 ('BORROW_OVERDUE_REMINDER','Overdue reminder sent'),
 ('DOC_VIEW','Document viewed'),
 ('DOC_DOWNLOAD','Document downloaded'),
 ('NOTIFICATION_READ','Notification marked read');

-- Seed common target types
INSERT IGNORE INTO `TargetTypes` (TargetTypeCode, Description) VALUES
 ('User','User account'),
 ('Borrow','Borrow transaction'),
 ('BorrowItem','Borrowed item'),
 ('Document','Document record'),
 ('Notification','Notification entry'),
 ('System','System / background task');

-- Example insert usage:
-- INSERT INTO AuditLog (UserID, ActionCode, TargetTypeCode, TargetID, Details, IPAddress, UserAgent)
-- VALUES (123,'BORROW_REQUEST','Borrow',456,'{\"purpose\":\"research\"}','127.0.0.1','Mozilla/5.0');
-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
