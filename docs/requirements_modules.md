# Koronadal City Library System
## Functional & Non-Functional Requirements (Module-Oriented Revision)
Date: 2025-09-25

Legend (Status):
- Implemented = Fully working in current codebase
- Partial = Some aspects working; gaps noted
- Pending = Not implemented / future scope

---
## 1. Module 1 – Login Module for Administrator
REQ001: The administrator shall log in with a username and password.
REQ002: The system shall display a clear error for invalid credentials and log LOGIN_ATTEMPT / LOGIN_FAILURE audit events.

## 2. Module 2 – Borrower Registration Approval (Administrator)
REQ003: The administrator shall view pending borrower registrations.
REQ004: The administrator shall view borrower details (name, type, email, affiliation if any).
REQ005: The administrator shall approve or reject borrower registrations.

## 3. Module 3 – User Management (Administrator)
REQ006: The administrator shall view all users (borrowers, librarians, administrators).
REQ007: The administrator shall manage user accounts (activate/deactivate, role assignment where applicable).
REQ008: The system shall validate inputs and display success/failure messages; invalid updates are rejected safely.

## 4. Module 4 – Document Management (Administrator)
REQ009: The administrator shall view documents with metadata (title, category, classification, description, preservation notes, and digital/physical indicator via presence of storage copies).
REQ010: The administrator shall create or update document metadata and view or edit preservation notes.

## 5. Module 6 – Book Management (Administrator)
REQ011: The administrator shall view a list of books with metadata (title, author, classification/location/call number if present) and availability.
REQ012: The administrator shall update book metadata and the system shall auto‑update availability based on borrow reservations and returns.

## 6. Module 7 – Document Approval (Administrator)
REQ013: The administrator shall view pending document borrow requests (digital and physical).
REQ014: The administrator shall approve document borrow requests.
REQ015: The administrator shall reject document borrow requests.

## 7. Module 8 – System Settings Management (Administrator)
No implemented requirements in current version.

## 8. Module 9 – Notification Module (Administrator)
REQ018: The administrator shall view all notifications.
REQ019: The administrator shall filter and mark notifications as read or unread.

## 9. Module 10 – Report Monitoring (Administrator)
REQ023: The system shall display visual summaries (charts) of borrow and activity metrics on the dashboard.

## 10. Module 11 – Audit Trails & Logs (Administrator)
REQ024: The system shall list logs for login attempts, borrow lifecycle, document view/upload/update, overdue reminders, and returns.
REQ025: The administrator shall filter logs by date range, user, action code, target type, or target ID.
REQ026: The administrator shall view detailed log entries with JSON details rendered in readable form.

## 11. Module 12 – Login Module (Librarian)
REQ028: The librarian shall log in with username and password.

## 12. Module 13 – Document Digitization & Management (Librarian)
REQ029: The librarian shall upload scanned documents (images → PDF) with initial metadata.
REQ030: The librarian shall update document metadata.
REQ029A: The librarian shall trigger an image‑to‑PDF conversion preview before finalizing a document record.
REQ030A: The system shall run metadata analysis after the preview is closed.

## 13. Module 14 – Book Management (Librarian)
REQ031: The librarian shall create book metadata entries.
REQ032: The librarian shall view and update book records (non‑restricted fields).
REQ033: The librarian shall assign call numbers and location information.

## 14. Module 15 – Storage Filing & Preservation (Librarian)
No implemented requirements in current version.

## 15. Module 16 – Borrowing & Return Management (Librarian)
REQ035: The librarian shall process book borrowing transactions.
REQ036: The librarian shall track due dates, borrower details, retrieval status.
REQ035A: The librarian shall mark retrieval for physical items.

## 16. Module 17 – Notification Module (Librarian)
REQ038: The system shall view notifications shall include borrow ID, type, and timestamps.

## 17. Module 18 – Registration Module (Researchers / Government Agency Borrowers)
REQ039: The user registration form shall capture personal information.
REQ039A: The borrower shall receive a notification upon administrator approval or rejection.

## 18. Module 19 – Login Module (Researchers / Government Agency Borrowers)
REQ040: The borrower shall log in securely with a hashed password and the system shall record audit events.

## 19. Module 20 – Browse & Search (Researchers / Government Agency Borrowers)
REQ041: The user shall search books and documents by metadata (title, author, category); digital versus physical shall be inferred by storage presence.

## 20. Module 21 – Borrow Request (Researchers / Government Agency Borrowers)
REQ042: The borrower shall request to borrow books and/or documents.

## 21. Module 22 – Borrower Dashboard (Researchers / Government Agency Borrowers)
REQ043: The borrower shall view active borrowings with statuses (Pending, Approved, Retrieved, Expired (digital), Returned, Rejected).
REQ044: The borrower shall view borrowing history with item titles and due/return dates.
REQ043A: The system shall display the Digital PDF View button only while a digital transaction is Active and not auto‑returned.

## 22. Module 23 – Notification Module (Researchers / Government Agency Borrowers)
REQ045: The borrower shall view notifications including borrow submission/approval/rejection, ready for pickup, retrieval, due reminders, overdue, and return recorded.
REQ045A: The borrower shall mark notifications as read.

---
## 23. Non-Functional Requirements (Implemented Only)
REQ048: The system shall support modern desktop browsers (Chrome, Firefox, Edge, Safari); mobile optimization is out of scope.
REQ049: The system shall log all major user activities in the audit trail.
REQ054: The system shall enforce Role-Based Access Control in endpoints and UI.
REQ055: The system shall store passwords hashed (PBKDF2) and deployment shall enforce HTTPS.
REQ057: The system shall create audit events for borrowing, registration approval, document uploads, and logins.
REQ058: The system shall use English as the default language and remain localization‑extensible.
REQ060: The system shall restrict access to document metadata and borrow requests to authenticated, authorized users.
NFR-R01: The auto‑return service shall scan periodically (~60s) for digital due items.
NFR-R03: The system shall isolate background service failures from the main request thread.
NFR-O01: The system shall log audit events for key transitions.
NFR-M01: The system shall centralize action and target type codes.
NFR-M02: The system shall determine digital versus physical solely by storage presence.
NFR-M03: The system shall isolate borrow splitting logic in a single endpoint.
NFR-UX01: The system shall hide the PDF View after digital expiration (auto‑return).

---
## 24. Change Log
2025-09-25: Reorganized requirements by provided module structure; merged existing capabilities, added explicit digital logic, automation, audit, and identified gaps.

End of document.
