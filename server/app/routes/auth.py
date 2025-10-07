from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from ..db import get_db_connection
from ..services.password_reset import (
    consume_reset_code,
    request_password_reset,
    verify_reset_code,
)
from ..services.passwords import hash_password

auth_bp = Blueprint('auth', __name__)


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
