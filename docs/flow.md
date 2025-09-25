# Koronadal City Library System – Process Flow (Code‑Free)
Date: 2025‑09‑25

This document outlines how the system behaves end‑to‑end. It focuses on actors, states, and transitions—not code.

## Actors
- Borrower (Researcher / Government Agency)
- Librarian (Book operations)
- Administrator (Document operations and approvals)
- Background Services (Auto‑return, Overdue reminders)
- Notification Service (emits/records notifications)
- Audit Logger (records system actions)

## 0) System Initialization
1. The application starts the background auto‑return service (interval ~60s).
2. The notification and audit subsystems are available to all routes.

## 1) Registration & Approval (Borrower)
1. The borrower submits a registration form.
2. The system creates an audit entry and notifies administrators of the new registration.
3. The administrator reviews borrower details.
4. The administrator approves or rejects the registration.
	- If approved: The system notifies the borrower of approval.
	- If rejected: The system notifies the borrower of rejection.

## 2) Authentication & Session
1. The user opens the login page.
2. The system checks for an existing session:
	- If “Remember me” was used, it restores the session from persistent storage and redirects to the role dashboard.
	- If no session exists, the user logs in with username and password.
3. The system verifies credentials, logs an audit event, and establishes a session.
4. The system routes the user to the correct area:
	- Borrower → Borrower dashboard.
	- Librarian → Librarian area.
	- Administrator → Admin area.
5. If the borrower account is still Pending or Rejected, the system shows a status screen and does not create a session.

## 3) Resource Management
### 3.1 Documents (Digitization & Management)
1. The librarian/administrator creates or edits a document record.
2. The user uploads images if needed; the system converts multiple images into a single PDF.
3. The system displays a PDF preview.
4. Upon closing the preview, the system triggers metadata analysis and pre‑fills suggestions.
5. The user finalizes and saves metadata (title, category, classification, notes, etc.).
6. For physical documents, storage copies may be tracked; for digital documents, no physical storage is associated.

### 3.2 Books (Management)
1. The librarian/administrator views and edits book metadata (title, author, call number, location).
2. The system maintains per‑copy availability via book inventory and updates it through borrow/return events.

## 4) Browse & Search
1. Any authenticated user searches books/documents by common metadata (title, author, category).
2. The system presents results; whether a document is digital or physical is inferred by the presence of storage copies.

## 5) Borrow Request (Borrower)
1. The borrower selects items (books and/or documents) and submits a borrow request with purpose if required.
2. The system splits the submission into homogeneous transactions by item type:
	- Books → routed to Librarian workflow.
	- Documents (digital and physical) → routed to Administrator workflow.
3. For books, the system immediately reserves selected copies (sets availability to unavailable) and notifies librarians.
4. For documents, the system does not reserve copies upon submission and notifies administrators.
5. The system logs an audit event for the submission.

## 6) Approval / Rejection
### 6.1 Books (Librarian)
1. The librarian reviews pending book transactions.
2. The librarian approves or rejects:
	- Approve: The system confirms reservation and notifies the borrower that items are ready for pickup.
	- Reject: The system releases previously reserved book copies and notifies the borrower.
3. The system records audit entries for actions.

### 6.2 Documents (Administrator)
1. The administrator reviews pending document transactions.
2. The administrator approves or rejects:
	- Approve (Digital): The system records a due date (if set) and creates due records; the borrower can view the PDF while Active.
	- Approve (Physical): The system reserves physical copies on approval and notifies the borrower for pickup.
	- Reject: The system notifies the borrower; physical inventory was not pre‑reserved.
3. The system records audit entries for actions.

## 7) Retrieval (Physical Items)
1. The borrower arrives to pick up approved physical items.
2. The librarian/administrator marks the transaction as Retrieved.
3. The system updates retrieval status and may notify relevant staff/borrower.
4. The system records an audit entry.

## 8) Access to Digital Documents
1. For approved digital transactions, the borrower can view the PDF while the transaction is Active and not expired.
2. When the transaction is expired/returned (auto‑return), the system hides the View PDF action.

## 9) Returns (Physical Items)
1. The borrower returns physical items to the library.
2. The librarian/administrator records a return transaction (with optional before/after condition notes per item).
3. The system restores inventory availability for returned physical items.
4. The system updates the borrow return status.
5. The system notifies the borrower (and relevant staff) that the return is recorded.
6. The system records an audit entry.

## 10) Auto‑Return (Digital Only)
1. The background auto‑return service periodically scans approved digital‑only transactions.
2. When a due date is on or before today, the system marks the transaction as Returned (displayed as Expired to the borrower).
3. The system emits return‑recorded notifications.
4. The system records an audit entry for the automated action (if enabled).

## 11) Overdue Reminders
1. The system is designed to send overdue reminders once per day per overdue borrow.
2. The notification includes the borrow ID and due date and is sent to the borrower and relevant staff.
3. Duplicate reminders for the same day and borrow are suppressed.

## 12) Notifications Flow
Notifications are created automatically at key lifecycle points and are visible to the intended recipients:
- Registration submitted → administrators.
- Account approved/rejected → borrower.
- Borrow submitted → librarians (books) or administrators (documents).
- Borrow approved/rejected → borrower.
- Ready for pickup (physical) → borrower.
- Retrieved (physical) → staff.
- Return recorded → borrower and staff.
- Overdue reminder → borrower and staff.
- Auto‑return (digital) → borrower and staff (via return recorded notification).

Recipients can mark notifications as read or unread.

## 13) Audit Trail Flow
At each critical step, the system creates an audit log record containing the user (if any), action code, target entity, and details. Examples include:
- Login attempt/success/failure
- Registration submitted/approved/rejected
- Borrow submitted/approved/rejected/retrieved/returned
- Document view, upload, update
- Overdue reminder sent, auto‑return executed

Administrators can filter and inspect audit logs by date, user, action, and target.

## 14) Dashboard & Analytics Flow
1. The dashboard loads aggregated data on page open:
	- Borrow status distribution
	- Borrow mix (Books vs Documents vs Digital)
	- Availability breakdown
	- Monthly trends
	- Top borrowers
	- Recent borrow activity
2. The system derives “Expired” for digital‑only returns to distinguish them in the UI.

## 15) Session Persistence (“Remember Me”)
1. If the user selects Remember Me, the system stores the session persistently and restores it on subsequent visits (no re‑login needed).
2. If not selected, the session is scoped to the current tab or browser session.
3. Pending/Rejected borrower status does not create a session.

## 16) Error & Exception Handling (User‑Visible Flow)
1. On failed login, the system shows an error message and logs the failure.
2. On failed borrow submission, the system reports the error to the user and logs details for troubleshooting.
3. Background service errors do not interrupt user interactions; they are isolated and retried on the next cycle.

---
End of process flow.
