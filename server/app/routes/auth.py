from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple, cast

from flask import Blueprint, current_app, jsonify, request

from ..db import get_db_connection
from ..services.password_reset import (
    consume_reset_code,
    request_password_reset,
    verify_reset_code,
)
from ..services.passwords import hash_password, verify_password, needs_rehash

auth_bp = Blueprint('auth', __name__)

LOCKOUT_ATTEMPT_LIMIT = 5
LOCKOUT_DURATION = timedelta(minutes=5)
_FAILED_LOGIN_ATTEMPTS: Dict[str, Dict[str, Any]] = {}


def _record_failed_login(key: str, now: datetime) -> Tuple[Any, int]:
    record = _FAILED_LOGIN_ATTEMPTS.get(key)
    if record:
        locked_until = record.get('locked_until')
        if isinstance(locked_until, datetime) and now >= locked_until:
            record = None

    if not record:
        record = {'count': 0, 'locked_until': None}

    count = int(record.get('count', 0)) + 1
    record['count'] = count

    if count >= LOCKOUT_ATTEMPT_LIMIT:
        locked_until = now + LOCKOUT_DURATION
        record['locked_until'] = locked_until
        _FAILED_LOGIN_ATTEMPTS[key] = record
        retry_seconds = max(1, int((locked_until - now).total_seconds()))
        return jsonify({
            'error': 'Too many failed attempts. Account locked for 5 minutes.',
            'code': 'account_locked',
            'lockedUntil': locked_until.isoformat(),
            'retryAfterSeconds': retry_seconds
        }), 423

    record['locked_until'] = None
    _FAILED_LOGIN_ATTEMPTS[key] = record
    remaining = LOCKOUT_ATTEMPT_LIMIT - count
    payload: Dict[str, Any] = {
        'error': 'Invalid username or password',
        'code': 'invalid_credentials'
    }
    if remaining > 0:
        payload['remainingAttempts'] = remaining
    return jsonify(payload), 401


# --- Login User ---
@auth_bp.route('/auth/login', methods=['POST'])
def login_user():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username') or '').strip()
    password = str(data.get('password') or '')

    if not username or not password:
        return jsonify({
            'error': 'Username and password are required.',
            'code': 'credentials_required'
        }), 400

    key = username.lower()
    now = datetime.now(timezone.utc)

    existing = _FAILED_LOGIN_ATTEMPTS.get(key)
    if existing:
        locked_until = existing.get('locked_until')
        if isinstance(locked_until, datetime) and now < locked_until:
            remaining = max(1, int((locked_until - now).total_seconds()))
            return jsonify({
                'error': 'Too many failed attempts. Account locked for 5 minutes.',
                'code': 'account_locked',
                'lockedUntil': locked_until.isoformat(),
                'retryAfterSeconds': remaining
            }), 423
        if isinstance(locked_until, datetime) and now >= locked_until:
            _FAILED_LOGIN_ATTEMPTS.pop(key, None)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'database_unavailable'}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT u.UserID, u.Username, u.Role, u.Password,
                   ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
                   ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
                   s.Position,
             b.BorrowerID, b.Type, b.Department, b.AccountStatus, b.AttachmentPath
            FROM Users u
            LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
            LEFT JOIN Staff s ON u.UserID = s.UserID
            LEFT JOIN Borrowers b ON u.UserID = b.UserID
            WHERE u.Username = %s
            """,
            (username,),
        )
        raw_user = cursor.fetchone()

        user_dict: Dict[str, Any] = cast(Dict[str, Any], raw_user) if raw_user else {}
        password_hash = user_dict.get('Password')

        if not password_hash or not isinstance(password_hash, str) or not verify_password(password_hash, password):
            response, status = _record_failed_login(key, now)
            return response, status

        _FAILED_LOGIN_ATTEMPTS.pop(key, None)

        if needs_rehash(password_hash):
            try:
                new_hash = hash_password(password)
                up_cur = conn.cursor()
                up_cur.execute(
                    "UPDATE Users SET Password=%s WHERE UserID=%s",
                    (new_hash, user_dict.get('UserID')),
                )
                conn.commit()
                up_cur.close()
            except Exception:
                conn.rollback()

        user_payload: Dict[str, Any] = {
            k: v for k, v in user_dict.items()
            if k not in {'Password', 'Position', 'Type', 'Department', 'AccountStatus', 'BorrowerID', 'AttachmentPath'}
        }

        role = user_dict.get('Role')
        if role == 'Staff':
            user_payload['staff'] = {'Position': user_dict.get('Position')}
            user_payload['borrower'] = None
        elif role == 'Borrower':
            user_payload['borrower'] = {
                'BorrowerID': user_dict.get('BorrowerID'),
                'Type': user_dict.get('Type'),
                'Department': user_dict.get('Department'),
                'AccountStatus': user_dict.get('AccountStatus'),
                'AttachmentPath': user_dict.get('AttachmentPath'),
            }
            user_payload['staff'] = None
        else:
            user_payload['staff'] = None
            user_payload['borrower'] = None

        return jsonify(user_payload)
    finally:
        try:
            cursor.close()
        finally:
            conn.close()


@auth_bp.route('/auth/password/forgot', methods=['POST'])
def forgot_password_request():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get('email') or '').strip()
    if not email:
        return jsonify({'error': 'email_required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'database_unavailable'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        request_password_reset(cursor, email)
        conn.commit()
    except Exception as exc:  # pragma: no cover - external dependency
        conn.rollback()
        current_app.logger.exception('Password reset request failed: %s', exc)
        return jsonify({'error': 'internal_error'}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({'message': 'If the account exists, a reset code has been sent.'}), 200


@auth_bp.route('/auth/password/reset', methods=['POST'])
def reset_password():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get('email') or '').strip()
    code = str(payload.get('code') or '').strip()
    new_password = str(payload.get('password') or '').strip()

    if not email:
        return jsonify({'error': 'email_required'}), 400
    if not code or len(code) < 4:
        return jsonify({'error': 'code_invalid'}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'password_too_short', 'minLength': 6}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'database_unavailable'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        user_id = verify_reset_code(cursor, email, code)
        if not user_id:
            return jsonify({'error': 'invalid_or_expired_code'}), 400

        hashed = hash_password(new_password)
        cursor.execute(
            "UPDATE Users SET Password=%s WHERE UserID=%s",
            (hashed, user_id),
        )
        consume_reset_code(cursor, user_id)
        conn.commit()
    except Exception as exc:  # pragma: no cover - external dependency
        conn.rollback()
        current_app.logger.exception('Password reset failed: %s', exc)
        return jsonify({'error': 'internal_error'}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({'message': 'Password reset successful.'}), 200
