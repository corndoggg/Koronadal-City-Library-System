-- MariaDB/MySQL logical backup generated via Python fallback
-- Host: localhost
-- Database: kcls_db
-- Timestamp: 2025-09-27T09:35:50.522630Z

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
USE `kcls_db`;

-- ----------------------------
-- Structure for table `actiontypes`
-- ----------------------------
DROP TABLE IF EXISTS `actiontypes`;
CREATE TABLE `actiontypes` (
  `ActionCode` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`ActionCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `actiontypes`
-- ----------------------------
INSERT INTO `actiontypes` VALUES ('BORROW_APPROVE', 'Borrow request approved');
INSERT INTO `actiontypes` VALUES ('BORROW_ITEM_RETURN', 'Single item returned');
INSERT INTO `actiontypes` VALUES ('BORROW_OVERDUE', 'Borrow marked overdue');
INSERT INTO `actiontypes` VALUES ('BORROW_OVERDUE_REMINDER', 'Overdue reminder sent');
INSERT INTO `actiontypes` VALUES ('BORROW_REJECT', 'Borrow request rejected');
INSERT INTO `actiontypes` VALUES ('BORROW_REQUEST', 'Borrow request submitted');
INSERT INTO `actiontypes` VALUES ('BORROW_RETRIEVE', 'Borrow items retrieved');
INSERT INTO `actiontypes` VALUES ('BORROW_RETURN', 'Borrow fully returned');
INSERT INTO `actiontypes` VALUES ('DOC_DOWNLOAD', 'Document downloaded');
INSERT INTO `actiontypes` VALUES ('DOC_UPDATE', 'Document updated');
INSERT INTO `actiontypes` VALUES ('DOC_UPLOAD', 'Document uploaded');
INSERT INTO `actiontypes` VALUES ('DOC_VIEW', 'Document viewed');
INSERT INTO `actiontypes` VALUES ('LOGIN_ATTEMPT', 'User login attempt');
INSERT INTO `actiontypes` VALUES ('LOGIN_FAILURE', 'Failed login');
INSERT INTO `actiontypes` VALUES ('LOGIN_SUCCESS', 'Successful login');
INSERT INTO `actiontypes` VALUES ('LOGOUT', 'User logout');
INSERT INTO `actiontypes` VALUES ('NOTIFICATION_READ', 'Notification marked read');
INSERT INTO `actiontypes` VALUES ('PASSWORD_CHANGE', 'Password changed');
INSERT INTO `actiontypes` VALUES ('PROFILE_UPDATE', 'User profile updated');

-- ----------------------------
-- Structure for table `auditlog`
-- ----------------------------
DROP TABLE IF EXISTS `auditlog`;
CREATE TABLE `auditlog` (
  `AuditID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` int(11) DEFAULT NULL,
  `ActionCode` varchar(50) NOT NULL,
  `TargetTypeCode` varchar(50) DEFAULT NULL,
  `TargetID` bigint(20) DEFAULT NULL,
  `Details` text DEFAULT NULL,
  `IPAddress` varchar(64) DEFAULT NULL,
  `UserAgent` varchar(255) DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`AuditID`),
  KEY `idx_audit_user` (`UserID`),
  KEY `idx_audit_action` (`ActionCode`),
  KEY `idx_audit_target` (`TargetTypeCode`,`TargetID`),
  KEY `idx_audit_created` (`CreatedAt`),
  CONSTRAINT `fk_audit_action` FOREIGN KEY (`ActionCode`) REFERENCES `actiontypes` (`ActionCode`) ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_targettype` FOREIGN KEY (`TargetTypeCode`) REFERENCES `targettypes` (`TargetTypeCode`) ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `auditlog`
-- ----------------------------
INSERT INTO `auditlog` VALUES (1, 2, 'LOGIN_ATTEMPT', 'User', NULL, '{"username": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 14:23:11');
INSERT INTO `auditlog` VALUES (2, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username": "admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 14:23:11');
INSERT INTO `auditlog` VALUES (3, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 14:39:57');
INSERT INTO `auditlog` VALUES (4, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 14:39:58');
INSERT INTO `auditlog` VALUES (5, 2, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 22:42:38');
INSERT INTO `auditlog` VALUES (6, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 22:42:39');
INSERT INTO `auditlog` VALUES (7, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:10:38');
INSERT INTO `auditlog` VALUES (8, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:10:39');
INSERT INTO `auditlog` VALUES (9, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:43');
INSERT INTO `auditlog` VALUES (10, NULL, 'LOGIN_FAILURE', 'User', NULL, '{"username":"librarian","reason":"Invalid username or password"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:44');
INSERT INTO `auditlog` VALUES (11, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:48');
INSERT INTO `auditlog` VALUES (12, NULL, 'LOGIN_FAILURE', 'User', NULL, '{"username":"librarian","reason":"Invalid username or password"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:50');
INSERT INTO `auditlog` VALUES (13, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:54');
INSERT INTO `auditlog` VALUES (14, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:39:56');
INSERT INTO `auditlog` VALUES (15, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:46:32');
INSERT INTO `auditlog` VALUES (16, NULL, 'LOGIN_FAILURE', 'User', NULL, '{"username":"researcher","reason":"Invalid username or password"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:46:34');
INSERT INTO `auditlog` VALUES (17, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:46:36');
INSERT INTO `auditlog` VALUES (18, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:46:40');
INSERT INTO `auditlog` VALUES (19, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:48:47');
INSERT INTO `auditlog` VALUES (20, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 00:48:49');
INSERT INTO `auditlog` VALUES (21, 2, 'BORROW_REJECT', 'Borrow', 24, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:05:57');
INSERT INTO `auditlog` VALUES (22, 2, 'BORROW_REJECT', 'Borrow', 24, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:06:05');
INSERT INTO `auditlog` VALUES (23, 2, 'BORROW_REJECT', 'Borrow', 25, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:06:26');
INSERT INTO `auditlog` VALUES (24, 2, 'BORROW_APPROVE', 'Borrow', 26, '{"role":"admin","mode":"physical/mixed"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:24:50');
INSERT INTO `auditlog` VALUES (25, 2, 'BORROW_RETRIEVE', 'Borrow', 26, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:25:09');
INSERT INTO `auditlog` VALUES (26, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:50:49');
INSERT INTO `auditlog` VALUES (27, NULL, 'LOGIN_FAILURE', 'User', NULL, '{"username":"librarian","reason":"Invalid username or password"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:50:50');
INSERT INTO `auditlog` VALUES (28, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:50:52');
INSERT INTO `auditlog` VALUES (29, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:50:54');
INSERT INTO `auditlog` VALUES (30, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:51:18');
INSERT INTO `auditlog` VALUES (31, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:51:20');
INSERT INTO `auditlog` VALUES (32, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:51:56');
INSERT INTO `auditlog` VALUES (33, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:51:58');
INSERT INTO `auditlog` VALUES (34, 3, 'BORROW_APPROVE', 'Borrow', 34, '{"role":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:52:08');
INSERT INTO `auditlog` VALUES (35, 3, 'BORROW_RETRIEVE', 'Borrow', 34, '{"role":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:52:11');
INSERT INTO `auditlog` VALUES (36, 3, 'BORROW_RETURN', 'Borrow', 34, '{"lostItems":0,"returnedItems":1}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:52:56');
INSERT INTO `auditlog` VALUES (37, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:53:28');
INSERT INTO `auditlog` VALUES (38, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 01:53:30');
INSERT INTO `auditlog` VALUES (39, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:31:52');
INSERT INTO `auditlog` VALUES (40, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:31:55');
INSERT INTO `auditlog` VALUES (41, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:35:39');
INSERT INTO `auditlog` VALUES (42, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:35:43');
INSERT INTO `auditlog` VALUES (43, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:36:28');
INSERT INTO `auditlog` VALUES (44, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 02:36:31');
INSERT INTO `auditlog` VALUES (45, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:10:09');
INSERT INTO `auditlog` VALUES (46, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:10:11');
INSERT INTO `auditlog` VALUES (47, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:11:24');
INSERT INTO `auditlog` VALUES (48, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:11:26');
INSERT INTO `auditlog` VALUES (49, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:12:56');
INSERT INTO `auditlog` VALUES (50, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:12:58');
INSERT INTO `auditlog` VALUES (51, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:13:13');
INSERT INTO `auditlog` VALUES (52, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:13:15');
INSERT INTO `auditlog` VALUES (53, 2, 'DOC_UPDATE', 'Document', 9, '{"title":"CA-1212"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:19:13');
INSERT INTO `auditlog` VALUES (54, 2, 'BORROW_APPROVE', 'Borrow', 36, '{"role":"admin","mode":"physical/mixed"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:29:02');
INSERT INTO `auditlog` VALUES (55, 2, 'BORROW_REJECT', 'Borrow', 33, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:29:25');
INSERT INTO `auditlog` VALUES (56, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:35:54');
INSERT INTO `auditlog` VALUES (57, NULL, 'LOGIN_FAILURE', 'User', NULL, '{"username":"librarian","reason":"Invalid username or password"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:35:56');
INSERT INTO `auditlog` VALUES (58, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:35:58');
INSERT INTO `auditlog` VALUES (59, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:36:00');
INSERT INTO `auditlog` VALUES (60, 3, 'DOC_UPLOAD', 'Document', NULL, '{"title":"KORONADALCITYLIBRARY:MODERNIZINGACCESS"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:38:17');
INSERT INTO `auditlog` VALUES (61, 3, 'DOC_UPDATE', 'Document', 13, '{"title":"KORONADALCITYLIBRARY:MODERNIZINGACCESS"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 06:39:46');
INSERT INTO `auditlog` VALUES (62, 3, 'DOC_UPDATE', 'Document', 10, '{"title":"Capstone Project"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:05:12');
INSERT INTO `auditlog` VALUES (63, 3, 'DOC_UPDATE', 'Document', 10, '{"title":"Capstone Project"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:05:15');
INSERT INTO `auditlog` VALUES (64, 3, 'DOC_UPDATE', 'Document', 11, '{"title":"Test"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:05:59');
INSERT INTO `auditlog` VALUES (65, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:20:33');
INSERT INTO `auditlog` VALUES (66, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:20:39');
INSERT INTO `auditlog` VALUES (67, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:21:07');
INSERT INTO `auditlog` VALUES (68, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:21:13');
INSERT INTO `auditlog` VALUES (69, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:04:51');
INSERT INTO `auditlog` VALUES (70, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:04:54');
INSERT INTO `auditlog` VALUES (71, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:13:48');
INSERT INTO `auditlog` VALUES (72, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:13:49');
INSERT INTO `auditlog` VALUES (73, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:21:56');
INSERT INTO `auditlog` VALUES (74, 4, 'LOGIN_SUCCESS', 'User', 4, '{"username":"researcher"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:21:59');
INSERT INTO `auditlog` VALUES (75, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:30:28');
INSERT INTO `auditlog` VALUES (76, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 01:30:31');
INSERT INTO `auditlog` VALUES (77, 2, 'BORROW_RETRIEVE', 'Borrow', 36, '{"role":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 01:49:55');
INSERT INTO `auditlog` VALUES (78, 2, 'BORROW_RETURN', 'Borrow', 26, '{"lostItems":1,"returnedItems":0}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:08:05');
INSERT INTO `auditlog` VALUES (79, 2, 'BORROW_RETURN', 'Borrow', 36, '{"lostItems":1,"returnedItems":0}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:08:45');
INSERT INTO `auditlog` VALUES (80, 2, 'BORROW_APPROVE', 'Borrow', 28, '{"role":"admin","mode":"digital","due":"2025-09-28"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:18:18');
INSERT INTO `auditlog` VALUES (81, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:18:45');
INSERT INTO `auditlog` VALUES (82, 3, 'LOGIN_SUCCESS', 'User', 3, '{"username":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:18:47');
INSERT INTO `auditlog` VALUES (83, 3, 'BORROW_APPROVE', 'Borrow', 35, '{"role":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:18:59');
INSERT INTO `auditlog` VALUES (84, 3, 'BORROW_RETRIEVE', 'Borrow', 35, '{"role":"librarian"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 02:19:03');
INSERT INTO `auditlog` VALUES (85, 3, 'DOC_UPDATE', 'Document', 9, '{"title":"CA-1212"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 03:12:24');
INSERT INTO `auditlog` VALUES (86, 3, 'DOC_UPDATE', 'Document', 9, '{"title":"CA-1212"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 03:13:25');
INSERT INTO `auditlog` VALUES (87, 3, 'DOC_UPDATE', 'Document', 10, '{"title":"Capstone Project"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 03:19:13');
INSERT INTO `auditlog` VALUES (88, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 03:25:55');
INSERT INTO `auditlog` VALUES (89, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 03:25:56');
INSERT INTO `auditlog` VALUES (90, NULL, 'LOGIN_ATTEMPT', 'User', NULL, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 04:02:50');
INSERT INTO `auditlog` VALUES (91, 2, 'LOGIN_SUCCESS', 'User', 2, '{"username":"admin"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 04:02:52');

-- ----------------------------
-- Structure for table `book_inventory`
-- ----------------------------
DROP TABLE IF EXISTS `book_inventory`;
CREATE TABLE `book_inventory` (
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

-- ----------------------------
-- Data for table `book_inventory`
-- ----------------------------
INSERT INTO `book_inventory` VALUES (1, 5, 'B2313323567', 'Borrowed', 'Shelf-worn', 'Good', 3);
INSERT INTO `book_inventory` VALUES (2, 6, 'C-10001', 'Borrowed', 'Good', 'Good', 1);
INSERT INTO `book_inventory` VALUES (3, 5, 'B12121', 'Available', 'Good', 'Good', 2);
INSERT INTO `book_inventory` VALUES (4, 7, 'B12324', 'Borrowed', 'Shelf-worn', 'Good', 3);

-- ----------------------------
-- Structure for table `books`
-- ----------------------------
DROP TABLE IF EXISTS `books`;
CREATE TABLE `books` (
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

-- ----------------------------
-- Data for table `books`
-- ----------------------------
INSERT INTO `books` VALUES (5, 'Farming Basics', 'N/A', '1st', 'N/A', 2003, 'General', 'English', '312321312128');
INSERT INTO `books` VALUES (6, 'Introduction to CSS', 'Renz Mariscal', '1st', 'N/A', 2017, 'Information Technology', 'English', '122331155');
INSERT INTO `books` VALUES (7, 'Test', 'N/a', '1st', 'N/A', 2015, 'IT', 'English', '103547896');

-- ----------------------------
-- Structure for table `borroweditems`
-- ----------------------------
DROP TABLE IF EXISTS `borroweditems`;
CREATE TABLE `borroweditems` (
  `BorrowedItemID` int(11) NOT NULL AUTO_INCREMENT,
  `BorrowID` int(11) NOT NULL,
  `ItemType` enum('Book','Document') NOT NULL,
  `BookCopyID` int(11) DEFAULT NULL,
  `DocumentStorageID` int(11) DEFAULT NULL,
  `Document_ID` int(11) DEFAULT NULL,
  `InitialCondition` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`BorrowedItemID`),
  KEY `BorrowID` (`BorrowID`),
  KEY `BookCopyID` (`BookCopyID`),
  KEY `DocumentStorageID` (`DocumentStorageID`),
  KEY `FK_borroweditems_documents` (`Document_ID`),
  CONSTRAINT `FK_borroweditems_documents` FOREIGN KEY (`Document_ID`) REFERENCES `documents` (`Document_ID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `borroweditems_ibfk_1` FOREIGN KEY (`BorrowID`) REFERENCES `borrowtransactions` (`BorrowID`),
  CONSTRAINT `borroweditems_ibfk_2` FOREIGN KEY (`BookCopyID`) REFERENCES `book_inventory` (`Copy_ID`),
  CONSTRAINT `borroweditems_ibfk_3` FOREIGN KEY (`DocumentStorageID`) REFERENCES `document_inventory` (`Storage_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `borroweditems`
-- ----------------------------
INSERT INTO `borroweditems` VALUES (12, 10, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (13, 11, 'Book', 3, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (14, 11, 'Book', 4, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (15, 12, 'Book', 3, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (16, 13, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (17, 14, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (18, 14, 'Book', 2, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (19, 19, 'Book', 3, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (20, 20, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (21, 21, 'Book', 2, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (22, 21, 'Book', 4, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (23, 22, 'Document', NULL, 3, NULL, 'Bad');
INSERT INTO `borroweditems` VALUES (24, 23, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (25, 24, 'Document', NULL, 4, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (26, 25, 'Document', NULL, 4, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (27, 26, 'Document', NULL, 4, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (28, 27, 'Document', NULL, 4, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (29, 28, 'Document', NULL, NULL, 9, '');
INSERT INTO `borroweditems` VALUES (30, 31, 'Document', NULL, NULL, 11, '');
INSERT INTO `borroweditems` VALUES (31, 32, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (32, 33, 'Document', NULL, NULL, 12, '');
INSERT INTO `borroweditems` VALUES (33, 34, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (34, 35, 'Book', 1, NULL, NULL, 'Good');
INSERT INTO `borroweditems` VALUES (35, 36, 'Document', NULL, 8, 12, 'Good');

-- ----------------------------
-- Structure for table `borrowers`
-- ----------------------------
DROP TABLE IF EXISTS `borrowers`;
CREATE TABLE `borrowers` (
  `BorrowerID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `Type` enum('Researcher','Government Agency') NOT NULL,
  `Department` varchar(100) DEFAULT NULL,
  `AccountStatus` enum('Pending','Registered','Suspended','Rejected') NOT NULL,
  PRIMARY KEY (`BorrowerID`),
  UNIQUE KEY `UserID` (`UserID`),
  CONSTRAINT `borrowers_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `borrowers`
-- ----------------------------
INSERT INTO `borrowers` VALUES (1, 1, 'Researcher', 'N/A', 'Registered');
INSERT INTO `borrowers` VALUES (2, 4, 'Researcher', 'N/A', 'Registered');
INSERT INTO `borrowers` VALUES (3, 5, 'Researcher', 'N/A', 'Registered');
INSERT INTO `borrowers` VALUES (4, 8, 'Researcher', 'N/A', 'Registered');

-- ----------------------------
-- Structure for table `borrowtransactions`
-- ----------------------------
DROP TABLE IF EXISTS `borrowtransactions`;
CREATE TABLE `borrowtransactions` (
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
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `borrowtransactions`
-- ----------------------------
INSERT INTO `borrowtransactions` VALUES (10, 1, 'Test', 'Rejected', NULL, 'Returned', 'Returned', '2025-07-17');
INSERT INTO `borrowtransactions` VALUES (11, 1, 'Personal Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-17');
INSERT INTO `borrowtransactions` VALUES (12, 1, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-23');
INSERT INTO `borrowtransactions` VALUES (13, 1, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-07-24');
INSERT INTO `borrowtransactions` VALUES (14, 1, 'Personal', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-08');
INSERT INTO `borrowtransactions` VALUES (19, 2, 'dwadwd', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-09');
INSERT INTO `borrowtransactions` VALUES (20, 2, 'Test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-15');
INSERT INTO `borrowtransactions` VALUES (21, 2, '12233', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-08-15');
INSERT INTO `borrowtransactions` VALUES (22, 2, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (23, 2, 'weqweqe', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (24, 2, 'wadwdad', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (25, 2, 'wadwdad', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (26, 2, 'wadwdad', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (27, 3, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-08-22');
INSERT INTO `borrowtransactions` VALUES (28, 2, 'REading', 'Approved', NULL, 'Pending', 'Not Returned', '2025-09-12');
INSERT INTO `borrowtransactions` VALUES (31, 2, 'jv', 'Approved', NULL, 'Retrieved', 'Returned', '2025-09-12');
INSERT INTO `borrowtransactions` VALUES (32, 2, 'yygj', 'Approved', NULL, 'Retrieved', 'Returned', '2025-09-12');
INSERT INTO `borrowtransactions` VALUES (33, 2, 'tessf', 'Rejected', NULL, 'Pending', 'Not Returned', '2025-09-24');
INSERT INTO `borrowtransactions` VALUES (34, 2, 'test', 'Approved', NULL, 'Retrieved', 'Returned', '2025-09-25');
INSERT INTO `borrowtransactions` VALUES (35, 2, 'test', 'Approved', NULL, 'Retrieved', 'Not Returned', '2025-09-25');
INSERT INTO `borrowtransactions` VALUES (36, 2, 'Reading', 'Approved', NULL, 'Retrieved', 'Returned', '2025-09-25');

-- ----------------------------
-- Structure for table `document_inventory`
-- ----------------------------
DROP TABLE IF EXISTS `document_inventory`;
CREATE TABLE `document_inventory` (
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `document_inventory`
-- ----------------------------
INSERT INTO `document_inventory` VALUES (3, 9, 'Lost', 'Bad', 1);
INSERT INTO `document_inventory` VALUES (4, 10, 'Lost', 'Good', 1);
INSERT INTO `document_inventory` VALUES (7, 11, 'Available', 'Good', 1);
INSERT INTO `document_inventory` VALUES (8, 12, 'Lost', 'Good', 1);
INSERT INTO `document_inventory` VALUES (9, 9, 'Available', 'Fair', 2);
INSERT INTO `document_inventory` VALUES (10, 13, 'Available', 'Good', 2);
INSERT INTO `document_inventory` VALUES (11, 10, 'Borrowed', 'Fair', 1);
INSERT INTO `document_inventory` VALUES (12, 10, 'Borrowed', 'Fair', 1);
INSERT INTO `document_inventory` VALUES (13, 11, 'Available', 'Fair', 3);

-- ----------------------------
-- Structure for table `documents`
-- ----------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `documents`
-- ----------------------------
INSERT INTO `documents` VALUES (9, 'CA-1212', 'N/A', 'N/A', 'N/A', 'Public Resources', 2005, 'Public', '/uploads/images_1758942783734.pdf');
INSERT INTO `documents` VALUES (10, 'Capstone Project', 'N/A', 'N/A', 'N/A', 'Public Resources', 2006, 'Public', '/uploads/f2dfb458-eb4e-48a4-ad4d-992b4ac4d0d8_images_1758943134987.pdf');
INSERT INTO `documents` VALUES (11, 'Test', 'N/A', 'Case Study', 'dawdwad', 'Public Resource', 2003, 'Restricted', '/uploads/17d916f0-230b-4014-8102-8f6a1f400c82_08_Handout_115_1.pdf');
INSERT INTO `documents` VALUES (12, 'czscz', 'cszc', 'Thesis', 'czsc', 'Goverment Document', 203, 'Restricted', '/uploads/254988cd-6cc2-4924-bea3-7c03411ef52d_01_Laboratory_Activity_1_1.pdf');
INSERT INTO `documents` VALUES (13, 'KORONADALCITYLIBRARY:MODERNIZINGACCESS', 'Renz Mariscal', 'N/A', 'N/A', 'Public Resources', 2025, 'Public', '/uploads/76faeceb-28a6-49b0-972f-adf8bf74aab9_GROUP-4-KORONADAL-CITY-LIBRARY-MODERNIZING-ACCESS-AND-PRESERVING-HISTORY-THROUGH-DIGITIZATION.pdf');

-- ----------------------------
-- Structure for table `notification_recipients`
-- ----------------------------
DROP TABLE IF EXISTS `notification_recipients`;
CREATE TABLE `notification_recipients` (
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `notification_recipients`
-- ----------------------------
INSERT INTO `notification_recipients` VALUES (1, 1, 3, 1, '2025-09-25 10:36:55', '2025-09-25 10:35:59');
INSERT INTO `notification_recipients` VALUES (2, 2, 8, 0, NULL, '2025-09-25 14:11:54');
INSERT INTO `notification_recipients` VALUES (3, 3, 2, 1, '2025-09-25 14:32:29', '2025-09-25 14:24:28');
INSERT INTO `notification_recipients` VALUES (4, 4, 4, 0, NULL, '2025-09-25 14:29:02');
INSERT INTO `notification_recipients` VALUES (5, 5, 4, 0, NULL, '2025-09-25 14:29:02');
INSERT INTO `notification_recipients` VALUES (6, 6, 4, 0, NULL, '2025-09-25 14:29:25');
INSERT INTO `notification_recipients` VALUES (7, 7, 2, 0, NULL, '2025-09-27 09:49:54');
INSERT INTO `notification_recipients` VALUES (8, 8, 4, 0, NULL, '2025-09-27 10:18:17');
INSERT INTO `notification_recipients` VALUES (9, 9, 4, 0, NULL, '2025-09-27 10:18:17');
INSERT INTO `notification_recipients` VALUES (10, 10, 4, 0, NULL, '2025-09-27 10:18:58');
INSERT INTO `notification_recipients` VALUES (11, 11, 4, 0, NULL, '2025-09-27 10:18:58');
INSERT INTO `notification_recipients` VALUES (12, 12, 3, 0, NULL, '2025-09-27 10:19:03');
INSERT INTO `notification_recipients` VALUES (13, 12, 9, 0, NULL, '2025-09-27 10:19:03');

-- ----------------------------
-- Structure for table `notification_types`
-- ----------------------------
DROP TABLE IF EXISTS `notification_types`;
CREATE TABLE `notification_types` (
  `Code` varchar(64) NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `notification_types`
-- ----------------------------
INSERT INTO `notification_types` VALUES ('ACCOUNT_APPROVED', 'Account approved');
INSERT INTO `notification_types` VALUES ('ACCOUNT_REGISTRATION_SUBMITTED', 'New borrower registration');
INSERT INTO `notification_types` VALUES ('ACCOUNT_REJECTED', 'Account rejected');
INSERT INTO `notification_types` VALUES ('BORROW_APPROVED', 'Borrow request approved');
INSERT INTO `notification_types` VALUES ('BORROW_BOOK_REQUEST_SUBMITTED', 'New book borrow request submitted');
INSERT INTO `notification_types` VALUES ('BORROW_DOC_REQUEST_SUBMITTED', 'New document borrow request submitted');
INSERT INTO `notification_types` VALUES ('BORROW_OVERDUE_REMINDER', 'Overdue reminder');
INSERT INTO `notification_types` VALUES ('BORROW_REJECTED', 'Borrow request rejected');
INSERT INTO `notification_types` VALUES ('BORROW_RETRIEVED', 'Items retrieved by borrower');
INSERT INTO `notification_types` VALUES ('BORROW_RETURN_RECORDED', 'Return recorded');
INSERT INTO `notification_types` VALUES ('DOCUMENT_VERIFICATION_REQUIRED', 'Document borrow requires admin verification');
INSERT INTO `notification_types` VALUES ('FINE_ASSESSED', 'Fine assessed on returned item');
INSERT INTO `notification_types` VALUES ('FINE_PAID', 'Fine paid');
INSERT INTO `notification_types` VALUES ('READY_FOR_PICKUP', 'Items ready for pickup');

-- ----------------------------
-- Structure for table `notifications`
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `notifications`
-- ----------------------------
INSERT INTO `notifications` VALUES (1, 'BORROW_BOOK_REQUEST_SUBMITTED', 'New Book Borrow Request', 'Borrow request #35 submitted.', 4, 'Borrow', 35, '2025-09-25 10:35:59');
INSERT INTO `notifications` VALUES (2, 'ACCOUNT_APPROVED', 'Account Approved', 'Your account has been approved.', NULL, 'User', 8, '2025-09-25 14:11:54');
INSERT INTO `notifications` VALUES (3, 'BORROW_DOC_REQUEST_SUBMITTED', 'New Document Borrow Request', 'Document borrow request #36 submitted.', 4, 'Borrow', 36, '2025-09-25 14:24:28');
INSERT INTO `notifications` VALUES (4, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #36 was approved.', NULL, 'Borrow', 36, '2025-09-25 14:29:02');
INSERT INTO `notifications` VALUES (5, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #36 are ready for pickup.', NULL, 'Borrow', 36, '2025-09-25 14:29:02');
INSERT INTO `notifications` VALUES (6, 'BORROW_REJECTED', 'Borrow Rejected', 'Your borrow request #33 was rejected.', NULL, 'Borrow', 33, '2025-09-25 14:29:25');
INSERT INTO `notifications` VALUES (7, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #36 marked as retrieved.', NULL, 'Borrow', 36, '2025-09-27 09:49:54');
INSERT INTO `notifications` VALUES (8, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #28 was approved.', NULL, 'Borrow', 28, '2025-09-27 10:18:17');
INSERT INTO `notifications` VALUES (9, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #28 are ready for pickup.', NULL, 'Borrow', 28, '2025-09-27 10:18:17');
INSERT INTO `notifications` VALUES (10, 'BORROW_APPROVED', 'Borrow Approved', 'Your borrow request #35 was approved.', NULL, 'Borrow', 35, '2025-09-27 10:18:58');
INSERT INTO `notifications` VALUES (11, 'READY_FOR_PICKUP', 'Ready for Pickup', 'Items for borrow #35 are ready for pickup.', NULL, 'Borrow', 35, '2025-09-27 10:18:58');
INSERT INTO `notifications` VALUES (12, 'BORROW_RETRIEVED', 'Items Retrieved', 'Borrow #35 marked as retrieved.', NULL, 'Borrow', 35, '2025-09-27 10:19:03');

-- ----------------------------
-- Structure for table `returneditems`
-- ----------------------------
DROP TABLE IF EXISTS `returneditems`;
CREATE TABLE `returneditems` (
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `returneditems`
-- ----------------------------
INSERT INTO `returneditems` VALUES (1, 3, 13, 'Good', 1.00, 'Yes');
INSERT INTO `returneditems` VALUES (2, 3, 14, 'Good', 1.00, 'Yes');
INSERT INTO `returneditems` VALUES (3, 5, 12, 'Good', 10.00, 'Yes');
INSERT INTO `returneditems` VALUES (4, 6, 15, 'Good', 11.00, 'No');
INSERT INTO `returneditems` VALUES (5, 8, 16, 'Good', 10.00, 'Yes');
INSERT INTO `returneditems` VALUES (6, 11, 17, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (7, 11, 18, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (8, 12, 19, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (9, 16, 20, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (10, 22, 24, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (11, 27, 30, 'Good', 0.00, 'No');
INSERT INTO `returneditems` VALUES (12, 28, 31, 'Good', 0.00, 'Yes');
INSERT INTO `returneditems` VALUES (13, 31, 33, 'Good', 0.00, 'No');
INSERT INTO `returneditems` VALUES (18, 38, 27, 'Lost', 340.00, 'Yes');
INSERT INTO `returneditems` VALUES (19, 39, 35, 'Lost', 0.00, 'Yes');

-- ----------------------------
-- Structure for table `returntransactions`
-- ----------------------------
DROP TABLE IF EXISTS `returntransactions`;
CREATE TABLE `returntransactions` (
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `returntransactions`
-- ----------------------------
INSERT INTO `returntransactions` VALUES (1, 10, '2025-07-25', NULL, NULL);
INSERT INTO `returntransactions` VALUES (2, 11, '2025-07-19', NULL, NULL);
INSERT INTO `returntransactions` VALUES (3, 11, '2025-07-23', NULL, '');
INSERT INTO `returntransactions` VALUES (4, 12, '2025-07-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (5, 10, '2025-07-23', NULL, '');
INSERT INTO `returntransactions` VALUES (6, 12, '2025-07-23', NULL, '');
INSERT INTO `returntransactions` VALUES (7, 13, '2025-07-25', NULL, NULL);
INSERT INTO `returntransactions` VALUES (8, 13, '2025-07-24', NULL, '');
INSERT INTO `returntransactions` VALUES (9, 14, '2025-08-15', NULL, NULL);
INSERT INTO `returntransactions` VALUES (10, 19, '2025-08-09', NULL, NULL);
INSERT INTO `returntransactions` VALUES (11, 14, '2025-08-15', NULL, '');
INSERT INTO `returntransactions` VALUES (12, 19, '2025-08-15', NULL, '');
INSERT INTO `returntransactions` VALUES (13, 20, '2025-08-23', NULL, NULL);
INSERT INTO `returntransactions` VALUES (14, 21, '2025-08-17', NULL, NULL);
INSERT INTO `returntransactions` VALUES (15, 22, '2025-08-30', NULL, NULL);
INSERT INTO `returntransactions` VALUES (16, 20, '2025-08-22', NULL, '');
INSERT INTO `returntransactions` VALUES (17, 23, '2025-08-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (18, 24, '2025-08-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (19, 25, '2025-08-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (20, 26, '2025-08-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (21, 27, '2025-08-24', NULL, NULL);
INSERT INTO `returntransactions` VALUES (22, 23, '2025-08-23', NULL, 'Good');
INSERT INTO `returntransactions` VALUES (23, 28, '2025-09-20', NULL, NULL);
INSERT INTO `returntransactions` VALUES (24, 31, '2025-09-20', NULL, NULL);
INSERT INTO `returntransactions` VALUES (25, 31, '2025-09-20', NULL, NULL);
INSERT INTO `returntransactions` VALUES (26, 32, '2025-09-20', NULL, NULL);
INSERT INTO `returntransactions` VALUES (27, 31, '2025-09-12', NULL, '');
INSERT INTO `returntransactions` VALUES (28, 32, '2025-09-13', NULL, '');
INSERT INTO `returntransactions` VALUES (29, 33, '2025-09-30', NULL, NULL);
INSERT INTO `returntransactions` VALUES (30, 34, '2025-09-27', NULL, NULL);
INSERT INTO `returntransactions` VALUES (31, 34, '2025-09-25', NULL, '');
INSERT INTO `returntransactions` VALUES (32, 35, '2025-09-27', NULL, NULL);
INSERT INTO `returntransactions` VALUES (33, 36, '2025-09-27', NULL, NULL);
INSERT INTO `returntransactions` VALUES (38, 26, '2025-09-27', NULL, '[LOST]');
INSERT INTO `returntransactions` VALUES (39, 36, '2025-09-27', NULL, '[LOST]');
INSERT INTO `returntransactions` VALUES (40, 28, '2025-09-28', NULL, NULL);

-- ----------------------------
-- Structure for table `staff`
-- ----------------------------
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `StaffID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `Position` enum('Librarian','Admin') NOT NULL,
  PRIMARY KEY (`StaffID`),
  UNIQUE KEY `UserID` (`UserID`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `staff`
-- ----------------------------
INSERT INTO `staff` VALUES (1, 2, 'Admin');
INSERT INTO `staff` VALUES (2, 3, 'Librarian');
INSERT INTO `staff` VALUES (4, 9, 'Librarian');

-- ----------------------------
-- Structure for table `storages`
-- ----------------------------
DROP TABLE IF EXISTS `storages`;
CREATE TABLE `storages` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) NOT NULL DEFAULT '0',
  `Capacity` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `storages`
-- ----------------------------
INSERT INTO `storages` VALUES (1, 'Shelf D1', 100);
INSERT INTO `storages` VALUES (2, 'Shelf B2', 50);
INSERT INTO `storages` VALUES (3, 'Shelf D3', 35);
INSERT INTO `storages` VALUES (4, 'Shelf B3', 35);

-- ----------------------------
-- Structure for table `targettypes`
-- ----------------------------
DROP TABLE IF EXISTS `targettypes`;
CREATE TABLE `targettypes` (
  `TargetTypeCode` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`TargetTypeCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `targettypes`
-- ----------------------------
INSERT INTO `targettypes` VALUES ('Borrow', 'Borrow transaction');
INSERT INTO `targettypes` VALUES ('BorrowItem', 'Borrowed item');
INSERT INTO `targettypes` VALUES ('Document', 'Document record');
INSERT INTO `targettypes` VALUES ('Notification', 'Notification entry');
INSERT INTO `targettypes` VALUES ('System', 'System / background task');
INSERT INTO `targettypes` VALUES ('User', 'User account');

-- ----------------------------
-- Structure for table `userdetails`
-- ----------------------------
DROP TABLE IF EXISTS `userdetails`;
CREATE TABLE `userdetails` (
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

-- ----------------------------
-- Data for table `userdetails`
-- ----------------------------
INSERT INTO `userdetails` VALUES (1, 'Juan', 'Luna', 'DelaCruz', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15');
INSERT INTO `userdetails` VALUES (2, 'Jane', 'Adam', 'Smith', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15');
INSERT INTO `userdetails` VALUES (3, 'John', 'Smith', 'Doe', 'sumalpong@gamil.com', '09641425520', 'dwawd', 'dwada', 'dwadad', 'dawdawd', '2025-08-15');
INSERT INTO `userdetails` VALUES (4, 'Andrei', 'Lagos', 'Sumalpong', 'sumalpong@gamil.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2003-11-18');
INSERT INTO `userdetails` VALUES (5, 'Jenelyn', 'Manangan', 'Gomez', 'yanskieexb@gmail.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2004-12-25');
INSERT INTO `userdetails` VALUES (8, 'John', 'Lagos', 'Sumalpong', 'sumalpongandreiian@gmail.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', '2011-11-18');
INSERT INTO `userdetails` VALUES (9, 'test', 'test', 'test', 'sumalpong@gamil.com', '09641425520', 'Purok 2', 'Dumadalig', 'Tantangan', 'South Cotabato', NULL);

-- ----------------------------
-- Structure for table `users`
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `Password` text NOT NULL,
  `Role` enum('Staff','Borrower') NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ----------------------------
-- Data for table `users`
-- ----------------------------
INSERT INTO `users` VALUES (1, 'andrei', '1234', 'Borrower');
INSERT INTO `users` VALUES (2, 'admin', 'pbkdf2:sha256:600000$COP6KbvH7pLJR01s$fa61fa0b05694bd294cf59c351d2d26d22fbf08f6efaae181ea1c858795547f6', 'Staff');
INSERT INTO `users` VALUES (3, 'librarian', 'pbkdf2:sha256:600000$COP6KbvH7pLJR01s$fa61fa0b05694bd294cf59c351d2d26d22fbf08f6efaae181ea1c858795547f6', 'Staff');
INSERT INTO `users` VALUES (4, 'researcher', 'pbkdf2:sha256:600000$COP6KbvH7pLJR01s$fa61fa0b05694bd294cf59c351d2d26d22fbf08f6efaae181ea1c858795547f6', 'Borrower');
INSERT INTO `users` VALUES (5, 'corndog', '112233', 'Borrower');
INSERT INTO `users` VALUES (8, 'borrower1', 'pbkdf2:sha256:600000$VaqcHf8KeRTz5ji7$a83725e1ff084d6d6389231f53dfb98267f26d56e20bc8f4e6b58783b4fd42e5', 'Borrower');
INSERT INTO `users` VALUES (9, 'librarian2', 'pbkdf2:sha256:600000$kRZGdnY3bv6D68cp$c0ad64cb7af6c5da02e088e84cb74beb4f751950b397ffce069141fff2be544c', 'Staff');

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
