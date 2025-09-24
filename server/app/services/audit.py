from datetime import datetime
from typing import Optional, Any, Dict
from app.db import get_db_connection

AUDIT_TABLE = "AuditLog"

def _safe_commit(conn):
    try:
        conn.commit()
    except Exception:
        conn.rollback()

def log_event(
    action_code: str,
    user_id: Optional[int] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[Any] = None,
    ip: Optional[str] = None,
    ua: Optional[str] = None,
) -> int:
    """
    Inserts a single audit log row. Returns AuditID (or 0 if failed).
    details can be dict (auto JSON) or string.
    """
    if not action_code:
        return 0
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if isinstance(details, (dict, list)):
            import json
            details_str = json.dumps(details, ensure_ascii=False)
        else:
            details_str = details
        cursor.execute(
            f"""INSERT INTO {AUDIT_TABLE}
                (UserID, ActionCode, TargetTypeCode, TargetID, Details, IPAddress, UserAgent, CreatedAt)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                user_id,
                action_code,
                target_type,
                target_id,
                details_str,
                ip,
                ua,
                datetime.utcnow(),
            ),
        )
        audit_id = cursor.lastrowid
        _safe_commit(conn)
        return audit_id
    except Exception:
        conn.rollback()
        return 0
    finally:
        cursor.close()
        conn.close()

def log_many(rows: list[Dict]) -> int:
    """
    Bulk insert many audit rows. Each dict supports same keys as log_event.
    Returns number of inserted rows.
    """
    if not rows:
        return 0
    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0
    try:
        import json
        data = []
        for r in rows:
            details = r.get("details")
            if isinstance(details, (dict, list)):
                details = json.dumps(details, ensure_ascii=False)
            data.append(
                (
                    r.get("user_id"),
                    r.get("action_code"),
                    r.get("target_type"),
                    r.get("target_id"),
                    details,
                    r.get("ip"),
                    r.get("ua"),
                    datetime.utcnow(),
                )
            )
        cursor.executemany(
            f"""INSERT INTO {AUDIT_TABLE}
                (UserID, ActionCode, TargetTypeCode, TargetID, Details, IPAddress, UserAgent, CreatedAt)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            data,
        )
        inserted = cursor.rowcount
        _safe_commit(conn)
    except Exception:
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
    return inserted