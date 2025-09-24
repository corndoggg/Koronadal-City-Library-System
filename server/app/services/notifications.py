from typing import Iterable, Optional, List, Any, Dict
from app.services.audit import log_event  # NEW

# NOTE: Adjust table/column names if your schema differs (Staff vs Users, etc.).

def get_staff_user_ids(cursor, role: str) -> List[int]:
    """
    role: 'librarian' | 'admin'
    Tries Staff.Position, falls back to Users.Role.
    """
    position = 'Librarian' if role.lower() == 'librarian' else 'Admin'
    try:
        cursor.execute("SELECT UserID FROM Staff WHERE Position=%s", (position,))
        rows = cursor.fetchall() or []
        ids = [r.get('UserID') for r in rows if r.get('UserID')]
        if ids:
            return ids
    except Exception:
        pass

    # Fallback: Users.Role
    try:
        cursor.execute("SELECT UserID FROM Users WHERE Role=%s", (position,))
        rows = cursor.fetchall() or []
        return [r.get('UserID') for r in rows if r.get('UserID')]
    except Exception:
        return []

def get_borrower_user_id(cursor, borrow_id: int) -> Optional[int]:
    cursor.execute("""
        SELECT b.UserID
        FROM BorrowTransactions t
        JOIN Borrowers b ON b.BorrowerID = t.BorrowerID
        WHERE t.BorrowID=%s
    """, (borrow_id,))
    row = cursor.fetchone()
    return row.get('UserID') if row else None

def ensure_type_exists(cursor, type_code: str) -> bool:
    cursor.execute("SELECT 1 FROM Notification_Types WHERE Code=%s", (type_code,))
    return cursor.fetchone() is not None

def create_notification(
    cursor,
    type_code: str,
    message: str,
    sender_user_id: Optional[int],
    related_type: Optional[str],
    related_id: Optional[int],
    recipients: Iterable[int],
    title: Optional[str] = None
) -> Optional[int]:
    recips = [int(r) for r in recipients if r is not None]
    if not recips or not type_code or not message:
        return None
    if not ensure_type_exists(cursor, type_code):
        return None

    cursor.execute("""
        INSERT INTO Notifications (Type, Title, Message, SenderUserID, RelatedType, RelatedID)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (type_code, title, message, sender_user_id, related_type, related_id))
    notif_id = cursor.lastrowid

    cursor.executemany("""
        INSERT IGNORE INTO Notification_Recipients (NotificationID, RecipientUserID)
        VALUES (%s, %s)
    """, [(notif_id, uid) for uid in recips])
    return notif_id

# High-level emitters (optional helpers)

def notify_submit(cursor, borrow_id: int, route: str, sender_user_id: Optional[int] = None):
    borrower_uid = get_borrower_user_id(cursor, borrow_id)
    if route == 'librarian':
        staff_uids = get_staff_user_ids(cursor, 'librarian')
        create_notification(
            cursor,
            'BORROW_BOOK_REQUEST_SUBMITTED',
            f'Borrow request #{borrow_id} submitted.',
            borrower_uid,
            'Borrow',
            borrow_id,
            staff_uids,
            title='New Book Borrow Request'
        )
    else:
        staff_uids = get_staff_user_ids(cursor, 'admin')
        create_notification(
            cursor,
            'BORROW_DOC_REQUEST_SUBMITTED',
            f'Document borrow request #{borrow_id} submitted.',
            borrower_uid,
            'Borrow',
            borrow_id,
            staff_uids,
            title='New Document Borrow Request'
        )

def notify_approved(cursor, borrow_id: int, sender_user_id: Optional[int] = None):
    borrower_uid = get_borrower_user_id(cursor, borrow_id)
    if not borrower_uid:
        return
    create_notification(
        cursor,
        'BORROW_APPROVED',
        f'Your borrow request #{borrow_id} was approved.',
        sender_user_id,
        'Borrow',
        borrow_id,
        [borrower_uid],
        title='Borrow Approved'
    )
    create_notification(
        cursor,
        'READY_FOR_PICKUP',
        f'Items for borrow #{borrow_id} are ready for pickup.',
        sender_user_id,
        'Borrow',
        borrow_id,
        [borrower_uid],
        title='Ready for Pickup'
    )

def notify_rejected(cursor, borrow_id: int, sender_user_id: Optional[int] = None):
    borrower_uid = get_borrower_user_id(cursor, borrow_id)
    if not borrower_uid:
        return
    create_notification(
        cursor,
        'BORROW_REJECTED',
        f'Your borrow request #{borrow_id} was rejected.',
        sender_user_id,
        'Borrow',
        borrow_id,
        [borrower_uid],
        title='Borrow Rejected'
    )

def notify_retrieved(cursor, borrow_id: int, route: str, sender_user_id: Optional[int] = None):
    staff_uids = get_staff_user_ids(cursor, route)
    create_notification(
        cursor,
        'BORROW_RETRIEVED',
        f'Borrow #{borrow_id} marked as retrieved.',
        sender_user_id,
        'Borrow',
        borrow_id,
        staff_uids,
        title='Items Retrieved'
    )

def notify_return_recorded(cursor, borrow_id: int, sender_user_id: Optional[int] = None):
    borrower_uid = get_borrower_user_id(cursor, borrow_id)
    recips = set()
    if borrower_uid:
        recips.add(int(borrower_uid))
    # notify staff by route type
    route = 'admin'
    try:
        cursor.execute("SELECT ItemType FROM BorrowedItems WHERE BorrowID=%s", (borrow_id,))
        rows = cursor.fetchall() or []
        route = 'admin' if any(r.get('ItemType') == 'Document' for r in rows) else 'librarian'
    except Exception:
        pass
    for uid in get_staff_user_ids(cursor, route):
        recips.add(int(uid))

    if recips:
        create_notification(
            cursor,
            'BORROW_RETURN_RECORDED',
            f'Return recorded for borrow #{borrow_id}.',
            sender_user_id,
            'Borrow',
            borrow_id,
            list(recips),
            title='Return Recorded'
        )

def _get_user_name(cursor, user_id: int) -> str:
    try:
        cursor.execute("""
            SELECT ud.Firstname, ud.Middlename, ud.Lastname, u.Username
            FROM Users u
            LEFT JOIN UserDetails ud ON ud.UserID = u.UserID
            WHERE u.UserID=%s
        """, (user_id,))
        row = cursor.fetchone() or {}
        first = (row.get('Firstname') or '').strip()
        mid = (row.get('Middlename') or '').strip()
        last = (row.get('Lastname') or '').strip()
        if first or last:
            mi = f" {mid[0]}." if mid else ""
            return f"{first}{mi} {last}".strip()
        return row.get('Username') or f"User #{user_id}"
    except Exception:
        return f"User #{user_id}"

def notify_account_registration_submitted(cursor, user_id: int):
    # Notify admins of new borrower registration
    name = _get_user_name(cursor, user_id)
    admins = get_staff_user_ids(cursor, 'admin')
    create_notification(
        cursor,
        'ACCOUNT_REGISTRATION_SUBMITTED',
        f'New borrower registration submitted: {name} (User #{user_id}).',
        user_id,
        'User',
        user_id,
        admins,
        title='New Registration'
    )

def notify_account_approved(cursor, user_id: int, sender_user_id: Optional[int] = None):
    create_notification(
        cursor,
        'ACCOUNT_APPROVED',
        'Your account has been approved.',
        sender_user_id,
        'User',
        user_id,
        [user_id],
        title='Account Approved'
    )

def notify_account_rejected(cursor, user_id: int, sender_user_id: Optional[int] = None):
    create_notification(
        cursor,
        'ACCOUNT_REJECTED',
        'Your account has been rejected.',
        sender_user_id,
        'User',
        user_id,
        [user_id],
        title='Account Rejected'
    )

def _ensure_type(cursor, code: str, desc: str):
    try:
        cursor.execute("INSERT IGNORE INTO Notification_Types (Code, Description) VALUES (%s,%s)", (code, desc))
    except Exception:
        pass

def notify_overdue(cursor, borrow_id: int, due_date, sender_user_id: Optional[int] = None):
    """
    Sends an overdue reminder if not already sent today for this borrow.
    due_date: date/datetime object.
    """
    _ensure_type(cursor, 'BORROW_OVERDUE_REMINDER', 'Borrow overdue reminder')

    # Avoid duplicate reminders on same day
    try:
        cursor.execute("""
            SELECT 1
            FROM Notifications n
            JOIN Notification_Recipients r ON r.NotificationID = n.NotificationID
            WHERE n.Type='BORROW_OVERDUE_REMINDER'
              AND n.RelatedType='Borrow'
              AND n.RelatedID=%s
              AND DATE(n.CreatedAt)=CURRENT_DATE()
            LIMIT 1
        """, (borrow_id,))
        if cursor.fetchone():
            return
    except Exception:
        pass

    borrower_uid = get_borrower_user_id(cursor, borrow_id)
    if not borrower_uid:
        return

    # Determine route (document vs book) to notify appropriate staff group too
    route = 'admin'
    try:
        cursor.execute("SELECT ItemType FROM BorrowedItems WHERE BorrowID=%s LIMIT 1", (borrow_id,))
        r = cursor.fetchone() or {}
        if r.get('ItemType') == 'Book':
            route = 'librarian'
    except Exception:
        pass

    recips = {int(borrower_uid)}
    for sid in get_staff_user_ids(cursor, route):
        recips.add(int(sid))

    due_str = getattr(due_date, 'strftime', lambda fmt: str(due_date))('%Y-%m-%d')
    create_notification(
        cursor,
        'BORROW_OVERDUE_REMINDER',
        f'Borrow #{borrow_id} is overdue (due {due_str}). Please return items.',
        sender_user_id,
        'Borrow',
        borrow_id,
        recips,
        title='Overdue Reminder'
    )
    log_event("BORROW_OVERDUE_REMINDER", user_id=sender_user_id,
              target_type="Borrow", target_id=borrow_id,
              details={"due": str(due_date)})  # NEW