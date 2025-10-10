from __future__ import annotations

from datetime import date, datetime
from threading import Event, Thread
from typing import Optional

from app.db import get_db_connection
from app.services.notifications import notify_overdue
from app.services.settings import load_settings

_stop_event: Optional[Event] = None
_thread: Optional[Thread] = None


def _fetch_overdue(cursor):
    cursor.execute(
        """
        SELECT bt.BorrowID, MAX(rt.ReturnDate) AS DueDate
        FROM BorrowTransactions bt
        LEFT JOIN ReturnTransactions rt ON rt.BorrowID = bt.BorrowID
        WHERE bt.ApprovalStatus='Approved'
          AND COALESCE(bt.ReturnStatus, 'Not Returned') <> 'Returned'
        GROUP BY bt.BorrowID
        """
    )
    return cursor.fetchall() or []


def _row_value(row, key):
    if isinstance(row, dict):
        return row.get(key)
    try:
        return row[key]
    except Exception:
        return None


def _normalize_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except Exception:
            return None
    return None


def _safe_int(value):
    try:
        return int(value)
    except Exception:
        return None


def _run_overdue_scan():
    conn = get_db_connection()
    if conn is None:
        return
    cursor = conn.cursor(dictionary=True)
    today = date.today()
    try:
        rows = _fetch_overdue(cursor)
        for row in rows:
            borrow_id = _safe_int(_row_value(row, "BorrowID"))
            due_date = _normalize_date(_row_value(row, "DueDate"))
            if borrow_id is None or due_date is None:
                continue
            if due_date >= today:
                continue
            notify_overdue(cursor, borrow_id, due_date)
        conn.commit()
    except Exception as exc:  # pragma: no cover - background worker
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[auto_overdue] Error: {exc}")
    finally:
        cursor.close()
        conn.close()


def _should_run(enabled: bool, now, target_hour: int, target_minute: int, allowed_days, last_run):
    if not enabled:
        return False
    day_code = now.strftime("%a")
    if allowed_days and day_code not in allowed_days:
        return False
    scheduled = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
    if now < scheduled:
        return False
    if last_run == scheduled.date():
        return False
    return True


def start_auto_overdue_service(app):
    global _stop_event, _thread
    if _thread and _thread.is_alive():
        return

    _stop_event = Event()
    stop_event = _stop_event

    def _runner():
        last_run_date: Optional[date] = None
        with app.app_context():
            while not stop_event.is_set():
                try:
                    settings = load_settings()
                    enabled = bool(settings.get("auto_overdue_enabled", False))
                    hour, minute = 8, 0
                    time_str = str(settings.get("auto_overdue_time", "08:00") or "08:00")
                    try:
                        parts = time_str.split(":")
                        if len(parts) == 2:
                            hour = max(0, min(23, int(parts[0])))
                            minute = max(0, min(59, int(parts[1])))
                    except Exception:
                        hour, minute = 8, 0
                    allowed_days = {
                        str(d).strip()[:3].title()
                        for d in (settings.get("auto_overdue_days") or [])
                        if str(d).strip()
                    }

                    now_dt = datetime.now()
                    if _should_run(enabled, now_dt, hour, minute, allowed_days, last_run_date):
                        _run_overdue_scan()
                        last_run_date = now_dt.date()
                        wait_for = 300
                    else:
                        scheduled = now_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        if now_dt < scheduled:
                            wait_for = max(30, min(300, int((scheduled - now_dt).total_seconds())))
                        else:
                            wait_for = 300
                except Exception as exc:  # pragma: no cover - background worker
                    print(f"[auto_overdue] Scheduler error: {exc}")
                    wait_for = 300
                stop_event.wait(wait_for)

    _thread = Thread(target=_runner, name="auto-overdue-service", daemon=True)
    _thread.start()


def stop_auto_overdue_service():
    global _stop_event, _thread
    if _stop_event:
        _stop_event.set()
    _thread = None
