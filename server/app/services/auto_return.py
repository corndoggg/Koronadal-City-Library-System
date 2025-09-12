from threading import Thread, Event
from datetime import date
import time

from app.db import get_db_connection
from app.services.notifications import notify_return_recorded

_stop_event = None
_thread = None

def _scan_and_auto_return():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Find Approved, not Returned, digital-only document transactions
        cursor.execute("""
            SELECT bt.BorrowID
            FROM BorrowTransactions bt
            WHERE bt.ApprovalStatus='Approved'
              AND COALESCE(bt.ReturnStatus,'Not Returned') <> 'Returned'
              AND EXISTS (
                    SELECT 1 FROM BorrowedItems bi
                    WHERE bi.BorrowID=bt.BorrowID AND bi.ItemType='Document'
              )
              AND NOT EXISTS (
                    SELECT 1 FROM BorrowedItems bi
                    WHERE bi.BorrowID=bt.BorrowID AND bi.ItemType='Document'
                      AND bi.DocumentStorageID IS NOT NULL
              )
        """)
        rows = cursor.fetchall() or []
        today = date.today()

        for r in rows:
            bid = r['BorrowID']
            # Get the due/expiration date (MAX ReturnDate)
            cursor.execute("""
                SELECT MAX(ReturnDate) AS DueDate
                FROM ReturnTransactions
                WHERE BorrowID=%s
            """, (bid,))
            due_row = cursor.fetchone()
            due = due_row and due_row.get('DueDate')
            if not due:
                continue  # no due date recorded, skip
            # Compare by date only
            if getattr(due, 'date', None):
                due_d = due.date()
            else:
                # Fallback if it's already a date
                due_d = due
            if due_d and due_d <= today:
                # Mark as returned (no inventory changes for digital)
                cursor.execute("""
                    UPDATE BorrowTransactions
                    SET ReturnStatus='Returned'
                    WHERE BorrowID=%s
                """, (bid,))
                # Notify borrower/staff
                notify_return_recorded(cursor, bid)

        conn.commit()
    except Exception as e:
        # Best-effort; don't crash the service
        try:
            conn.rollback()
        except:
            pass
        print(f"[auto_return] Error: {e}")
    finally:
        cursor.close()
        conn.close()

def start_auto_return_service(app, interval_seconds: int = 60):
    global _stop_event, _thread
    if _thread and _thread.is_alive():
        return  # already running
    _stop_event = Event()

    def _runner():
        with app.app_context():
            while not _stop_event.is_set():
                _scan_and_auto_return()
                # Wait with early-exit
                _stop_event.wait(interval_seconds)

    _thread = Thread(target=_runner, name="auto-return-service", daemon=True)
    _thread.start()

def stop_auto_return_service():
    global _stop_event, _thread
    if _stop_event:
        _stop_event.set()
    _thread = None