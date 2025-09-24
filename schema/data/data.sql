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

-- Dumping data for table kcls_db.books: ~2 rows (approximately)
INSERT INTO `Books` (`Book_ID`, `Title`, `Author`, `Edition`, `Publisher`, `Year`, `Subject`, `Language`, `ISBN`) VALUES
	(5, 'Farming Basics', 'N/A', '1st', 'N/A', '2003', 'General', 'English', '312321312128'),
	(6, 'Introduction to CSS', 'Renz Mariscal', '1st', 'N/A', '2017', 'Information Technology', 'English', '122331155'),
	(7, 'Test', 'N/a', '1st', 'N/A', '2015', 'IT', 'English', '103547896');

-- Dumping data for table kcls_db.book_inventory: ~4 rows (approximately)
INSERT INTO `Book_Inventory` (`Copy_ID`, `Book_ID`, `Accession_Number`, `Availability`, `Physical_Status`, `BookCondition`, `StorageLocation`) VALUES
	(1, 5, 'B2313323567', 'Available', 'Shelf-worn', 'Good', 2),
	(2, 6, 'C-10001', 'Borrowed', 'Good', 'Good', 2),
	(3, 5, 'B12121', 'Available', 'Good', 'Good', 2),
	(4, 7, 'B12324', 'Borrowed', 'Shelf-worn', 'Good', 3);

-- Dumping data for table kcls_db.borrowers: ~1 rows (approximately)
INSERT INTO `Borrowers` (`BorrowerID`, `UserID`, `Type`, `Department`, `AccountStatus`) VALUES
	(1, 1, 'Researcher', 'N/A', 'Registered'),
	(2, 4, 'Researcher', 'N/A', 'Registered'),
	(3, 5, 'Researcher', 'N/A', 'Registered');

-- Dumping data for table kcls_db.staff: ~2 rows (approximately)
INSERT INTO `Staff` (`StaffID`, `UserID`, `Position`) VALUES
	(1, 2, 'Admin'),
	(2, 3, 'Librarian');

-- Dumping data for table kcls_db.storages: ~3 rows (approximately)
INSERT INTO `Storages` (`ID`, `Name`, `Capacity`) VALUES
	(1, 'Shelf D1', 0),
	(2, 'Shelf B2', 0),
	(3, 'Shelf D3', 0);

-- Dumping data for table kcls_db.userdetails: ~2 rows (approximately)
INSERT INTO `UserDetails` (`UserID`, `Firstname`, `Middlename`, `Lastname`, `Email`, `ContactNumber`, `Street`, `Barangay`, `City`, `Province`, `DateOfBirth`) VALUES
	(1, 'Juan', 'Luna', 'DelaCruz', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(2, 'Jane', 'Adam', 'Smith', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(3, 'John', 'Smith', 'Doe', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15'),
	(4, 'Andrei', 'Lagos', 'Sumalpong', 'sumalpong@gamil.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2003-11-18'),
	(5, 'Jenelyn', 'Manangan', 'Gomez', 'yanskieexb@gmail.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2004-12-25');

-- Dumping data for table kcls_db.users: ~2 rows (approximately)
INSERT INTO `Users` (`UserID`, `Username`, `Password`, `Role`) VALUES
	(1, 'andrei', '1234', 'Borrower'),
	(2, 'admin', '1234', 'Staff'),
	(3, 'librarian', '1234', 'Staff'),
	(4, 'researcher', '123456', 'Borrower'),
	(5, 'corndog', '112233', 'Borrower');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
