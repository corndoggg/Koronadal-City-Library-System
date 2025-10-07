from __future__ import annotations

import random
import string
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple, cast


from app.services.mailer import send_forgot_password_email
from app.services.notifications import _compose_display_name
from app.services.passwords import hash_password, verify_password

RESET_CODE_LENGTH = 6
RESET_CODE_EXPIRY_MINUTES = 30
RESET_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS PasswordResetCodes (
    ResetID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    CodeHash VARCHAR(255) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    Consumed TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_expires (UserID, ExpiresAt),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
)
"""


def _ensure_table(cursor: Any) -> None:
    cursor.execute(RESET_TABLE_DDL)


def _generate_code() -> str:
    return ''.join(random.choices(string.digits, k=RESET_CODE_LENGTH))


def _lookup_user_by_email(cursor: Any, email: str) -> Optional[Tuple[int, Dict[str, Any]]]:
    cursor.execute(
        """
        SELECT u.UserID, u.Username, ud.Firstname, ud.Middlename, ud.Lastname, ud.Email
        FROM Users u
        LEFT JOIN UserDetails ud ON ud.UserID = u.UserID
        WHERE LOWER(COALESCE(ud.Email, u.Username)) = LOWER(%s)
           OR LOWER(u.Username) = LOWER(%s)
        LIMIT 1
        """,
        (email, email),
    )
    raw_row = cursor.fetchone()
    if not raw_row:
        return None
    row = cast(Dict[str, Any], raw_row)
    if not row:
        return None

    profile = {
        'email': (row.get('Email') or '').strip() or None,
        'username': (row.get('Username') or '').strip() or None,
        'firstname': (row.get('Firstname') or '').strip() or None,
        'middlename': (row.get('Middlename') or '').strip() or None,
        'lastname': (row.get('Lastname') or '').strip() or None,
    }
    user_id = row.get('UserID')
    if user_id is None:
        return None
    return int(user_id), profile


def request_password_reset(cursor: Any, email: str) -> None:
    """Create a password reset code for the given email and send it if possible."""

    _ensure_table(cursor)
    user_record = _lookup_user_by_email(cursor, email)
    if not user_record:
        return  # Silently ignore to prevent user enumeration

    user_id, profile = user_record
    code = _generate_code()
    code_hash = hash_password(code)
    expires_at = datetime.utcnow() + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)

    cursor.execute(
        """
        INSERT INTO PasswordResetCodes (UserID, CodeHash, ExpiresAt)
        VALUES (%s, %s, %s)
        """,
        (user_id, code_hash, expires_at),
    )

    recipient = profile.get('email') or profile.get('username')
    if recipient:
        display_name = _compose_display_name(profile, fallback=profile.get('username') or '')
        send_forgot_password_email(
            recipient,
            code,
            name=display_name or None,
            expires_minutes=RESET_CODE_EXPIRY_MINUTES,
        )


def verify_reset_code(cursor: Any, email: str, code: str) -> Optional[int]:
    """Return the UserID if the code is valid and not yet consumed."""

    _ensure_table(cursor)
    user_record = _lookup_user_by_email(cursor, email)
    if not user_record:
        return None

    user_id, _ = user_record
    cursor.execute(
        """
        SELECT ResetID, CodeHash, ExpiresAt, Consumed
        FROM PasswordResetCodes
        WHERE UserID=%s
        ORDER BY CreatedAt DESC
        LIMIT 5
        """,
        (user_id,),
    )
    fetched = cursor.fetchall() or []
    rows = [cast(Dict[str, Any], r) for r in fetched]

    now = datetime.utcnow()
    for row in rows:
        if row.get('Consumed'):
            continue
        expires_at = row.get('ExpiresAt')
        if expires_at and expires_at < now:
            continue
        code_hash = row.get('CodeHash')
        if isinstance(code_hash, bytes):
            code_hash = code_hash.decode('utf-8')
        if isinstance(code_hash, str) and verify_password(code_hash, code):
            return user_id
    return None


def consume_reset_code(cursor: Any, user_id: int) -> None:
    cursor.execute(
        """
        UPDATE PasswordResetCodes
        SET Consumed=1
        WHERE UserID=%s AND Consumed=0
        """,
        (user_id,),
    )
