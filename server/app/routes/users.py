import base64
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Tuple, cast

from flask import Blueprint, current_app, jsonify, request
from ..db import get_db_connection
import re
from ..services.notifications import (
    notify_account_registration_submitted,
    notify_account_approved,
    notify_account_rejected,
)
from app.services.passwords import hash_password
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

users_bp = Blueprint('users', __name__)

USERNAME_PATTERN = re.compile(r'^[A-Za-z0-9._-]+$')
USERNAME_MIN_LENGTH = 4
ATTACHMENTS_SUBDIR = 'attachments'


def _load_payload() -> Optional[dict]:
    """Return request payload as dict, supporting JSON or multipart with json payload field."""
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data

    raw_payload = request.form.get('payload') or request.form.get('data')
    if raw_payload:
        try:
            parsed = json.loads(raw_payload)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def _attachments_dir() -> Path:
    base_dir = current_app.config.get('ATTACHMENTS_DIR')
    if base_dir:
        directory = Path(base_dir)
    else:
        directory = Path(current_app.root_path).parent / ATTACHMENTS_SUBDIR
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _resolve_attachment_file(db_path: Optional[str]) -> Optional[Path]:
    if not db_path:
        return None
    attachments_root = _attachments_dir().resolve()
    try:
        stored_path = Path(db_path)
    except Exception:
        return None
    candidate: Path
    if stored_path.is_absolute():
        candidate = stored_path
    else:
        candidate = (attachments_root.parent / stored_path).resolve()
    try:
        if candidate.exists() and candidate.is_file() and (attachments_root in candidate.parents or candidate.parent == attachments_root):
            return candidate
    except Exception:
        current_app.logger.exception('Failed to resolve borrower attachment path %s', db_path)
    return None


def _load_attachment_pdf_content(db_path: Optional[str]) -> Optional[str]:
    file_path = _resolve_attachment_file(db_path)
    if not file_path:
        return None
    try:
        with file_path.open('rb') as attachment_file:
            return base64.b64encode(attachment_file.read()).decode('ascii')
    except Exception:
        current_app.logger.exception('Failed to read borrower attachment %s', db_path)
        return None


def _save_borrower_attachment(file_storage, user_id: int) -> Tuple[str, Path]:
    if not file_storage or not getattr(file_storage, 'filename', None):
        raise ValueError('attachment_missing_filename')

    attachments_dir = _attachments_dir()
    original_stem = Path(file_storage.filename).stem
    safe_stem = secure_filename(original_stem) or f'borrower_{user_id}'
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique_token = uuid.uuid4().hex
    pdf_filename = f"{safe_stem}_{user_id}_{timestamp}_{unique_token}.pdf"
    target_path = attachments_dir / pdf_filename

    suffix = Path(file_storage.filename).suffix.lower()

    try:
        file_storage.stream.seek(0)
    except Exception:
        pass

    if suffix == '.pdf' or getattr(file_storage, 'mimetype', '').lower() == 'application/pdf':
        file_storage.save(str(target_path))
    else:
        try:
            with Image.open(file_storage.stream) as image:
                if image.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1])
                    converted = background
                else:
                    converted = image.convert('RGB')
                try:
                    converted.save(str(target_path), 'PDF', resolution=100.0)
                finally:
                    if hasattr(converted, 'close'):
                        converted.close()
        except UnidentifiedImageError as exc:
            raise ValueError('unsupported_attachment_format') from exc

    db_path = str(Path(ATTACHMENTS_SUBDIR) / pdf_filename).replace('\\', '/')
    return db_path, target_path


def _delete_attachment_file(db_path: Optional[str]) -> None:
    if not db_path:
        return
    relative = Path(db_path.lstrip('/\\'))
    try:
        file_path = (_attachments_dir().parent / relative).resolve()
    except Exception:
        return
    attachments_root = (_attachments_dir().resolve())
    try:
        if attachments_root in file_path.parents or file_path == attachments_root:
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
    except Exception:
        current_app.logger.exception('Failed to remove borrower attachment %s', db_path)

def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Try to parse as ISO (YYYY-MM-DD)
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        try:
            # Try to parse as RFC (e.g., 'Sat, 26 Jul 2025 00:00:00 GMT')
            return datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %Z").date()
        except ValueError:
            return None


# --- Username availability check ---
@users_bp.route('/users/username-available', methods=['GET'])
def username_available():
    username = request.args.get('username', '')
    if username is None:
        return jsonify({'error': 'username_required'}), 400

    username = username.strip()
    if not username:
        return jsonify({'error': 'username_required'}), 400

    if len(username) < USERNAME_MIN_LENGTH:
        return jsonify({'available': False, 'reason': 'too_short', 'minLength': USERNAME_MIN_LENGTH}), 200

    if not USERNAME_PATTERN.match(username):
        return jsonify({'available': False, 'reason': 'invalid_format'}), 200

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM Users WHERE LOWER(Username) = LOWER(%s) LIMIT 1",
            (username,),
        )
        exists = cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()

    return jsonify({'available': not exists})

# --- Add User (with Borrower or Staff) ---
@users_bp.route('/users', methods=['POST'])
def add_user():
    data = _load_payload()
    attachment_file = request.files.get('attachment') if request.files else None
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'database_unavailable'}), 500
    cursor = conn.cursor()

    if not isinstance(data, dict):
        cursor.close()
        conn.close()
        return jsonify({'error': 'invalid_payload'}), 400

    details = data.get('details') or {}
    if not isinstance(details, dict):
        cursor.close()
        conn.close()
        return jsonify({'error': 'invalid_details'}), 400
    email = (details.get('email') or '').strip()
    if not email:
        cursor.close()
        conn.close()
        return jsonify({'error': 'email_required'}), 400

    cursor.execute(
        """
        SELECT 1 FROM UserDetails
        WHERE LOWER(Email) = LOWER(%s)
        LIMIT 1
        """,
        (email,),
    )
    if cursor.fetchone():
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': 'email_exists'}), 409

    raw_password = data['password']
    hashed = hash_password(raw_password)

    cursor.execute("""
        INSERT INTO Users (Username, Password, Role)
        VALUES (%s, %s, %s)
    """, (data['username'], hashed, data['role']))
    user_id = cursor.lastrowid
    if not isinstance(user_id, int):
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': 'user_creation_failed'}), 500

    saved_attachment_path = None
    saved_attachment_full_path = None
    if attachment_file and attachment_file.filename:
        try:
            saved_attachment_path, saved_attachment_full_path = _save_borrower_attachment(attachment_file, user_id)
        except ValueError as exc:
            conn.rollback()
            if saved_attachment_full_path and saved_attachment_full_path.exists():
                saved_attachment_full_path.unlink(missing_ok=True)
            cursor.close()
            conn.close()
            return jsonify({'error': str(exc)}), 400
        except Exception:
            conn.rollback()
            if saved_attachment_full_path and saved_attachment_full_path.exists():
                saved_attachment_full_path.unlink(missing_ok=True)
            cursor.close()
            conn.close()
            return jsonify({'error': 'attachment_processing_failed'}), 500

    # Insert into UserDetails
    date_of_birth = parse_date(details.get('dateofbirth'))
    cursor.execute("""
        INSERT INTO UserDetails (UserID, Firstname, Middlename, Lastname, Email, ContactNumber, Street, Barangay, City, Province, DateOfBirth)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, details['firstname'], details.get('middlename'), details['lastname'], email,
          details.get('contactnumber'), details.get('street'), details.get('barangay'), details.get('city'),
          details.get('province'), date_of_birth))

    # Insert into Staff or Borrowers
    if data['role'] == 'Staff':
        staff = data['staff']
        cursor.execute("""
            INSERT INTO Staff (UserID, Position)
            VALUES (%s, %s)
        """, (user_id, staff['position']))
    elif data['role'] == 'Borrower':
        borrower = data['borrower']
        manual_attachment_path = borrower.get('attachmentPath') or borrower.get('attachmentpath')
        if manual_attachment_path and not saved_attachment_path:
            saved_attachment_path = manual_attachment_path or None
        cursor.execute("""
            INSERT INTO Borrowers (UserID, Type, Department, AccountStatus, AttachmentPath)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, borrower['type'], borrower.get('department'), borrower['accountstatus'], saved_attachment_path))
        # Emit notification to admins about new registration
        notify_account_registration_submitted(cursor, user_id)

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User added', 'user_id': user_id})

# --- Get All Users with Specifics ---
@users_bp.route('/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'database_unavailable'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
         s.Position,
         b.BorrowerID, b.Type, b.Department, b.AccountStatus, b.AttachmentPath
        FROM Users u
        LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
        LEFT JOIN Staff s ON u.UserID = s.UserID
        LEFT JOIN Borrowers b ON u.UserID = b.UserID
    """)
    rows = cursor.fetchall()
    normalized = []
    for row in rows or []:
        row_dict = cast(dict[str, Any], row)
        user: dict[str, Any] = dict(row_dict)
        if user.get('Role') == 'Staff':
            user['staff'] = {'Position': user.get('Position')}
            user['borrower'] = None
        elif user.get('Role') == 'Borrower':
            attachment_path = user.get('AttachmentPath')
            user['borrower'] = {
                'BorrowerID': user.get('BorrowerID'),
                'Type': user.get('Type'),
                'Department': user.get('Department'),
                'AccountStatus': user.get('AccountStatus'),
                'AttachmentPath': attachment_path,
                'AttachmentPdfBase64': _load_attachment_pdf_content(attachment_path)
            }
            user['staff'] = None
        else:
            user['staff'] = None
            user['borrower'] = None
        for k in ['Position', 'Type', 'Department', 'AccountStatus', 'BorrowerID', 'AttachmentPath']:
            user.pop(k, None)
        normalized.append(user)
    cursor.close()
    conn.close()
    return jsonify(normalized)

# --- Edit User (and Borrower/Staff) ---
@users_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = _load_payload()
    attachment_file = request.files.get('attachment') if request.files else None
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'database_unavailable'}), 500
    cursor = conn.cursor()

    if not isinstance(data, dict):
        cursor.close()
        conn.close()
        return jsonify({'error': 'invalid_payload'}), 400

    fields = []
    values = []

    if 'username' in data:
        fields.append("Username=%s")
        values.append(data['username'])
    if 'role' in data:
        fields.append("Role=%s")
        values.append(data['role'])
    if 'password' in data and data['password']:
        # re-hash new password
        fields.append("Password=%s")
        values.append(hash_password(data['password']))

    if fields:
        sql = f"UPDATE Users SET {', '.join(fields)} WHERE UserID=%s"
        values.append(user_id)
        cursor.execute(sql, tuple(values))

    # Update UserDetails
    details_payload = data.get('details') if isinstance(data.get('details'), dict) else None
    if details_payload is not None:
        details = details_payload
        date_of_birth = parse_date(details.get('dateofbirth'))
        cursor.execute("""
            UPDATE UserDetails SET Firstname=%s, Middlename=%s, Lastname=%s, Email=%s, ContactNumber=%s,
            Street=%s, Barangay=%s, City=%s, Province=%s, DateOfBirth=%s WHERE UserID=%s
        """, (details.get('firstname'), details.get('middlename'), details.get('lastname'), details.get('email'),
              details.get('contactnumber'), details.get('street'), details.get('barangay'), details.get('city'),
              details.get('province'), date_of_birth, user_id))

    # Update Staff
    staff_payload = data.get('staff') if isinstance(data.get('staff'), dict) else None
    if staff_payload is not None:
        staff = staff_payload
        cursor.execute("""
            UPDATE Staff SET Position=%s WHERE UserID=%s
        """, (staff.get('position'), user_id))

    # Update Borrower
    borrower_payload = data.get('borrower') if isinstance(data.get('borrower'), dict) else None

    manual_attachment_provided = False
    manual_attachment_path: Optional[str] = None
    if isinstance(borrower_payload, dict):
        if 'attachmentPath' in borrower_payload or 'attachmentpath' in borrower_payload:
            manual_attachment_provided = True
            manual_attachment_path = borrower_payload.get('attachmentPath', borrower_payload.get('attachmentpath'))
            if isinstance(manual_attachment_path, str) and not manual_attachment_path.strip():
                manual_attachment_path = None

    need_existing_attachment = manual_attachment_provided or (attachment_file and attachment_file.filename)
    existing_attachment_path: Optional[str] = None
    if need_existing_attachment:
        cursor.execute("SELECT AttachmentPath FROM Borrowers WHERE UserID=%s LIMIT 1", (user_id,))
        existing_row = cursor.fetchone()
        raw_path = None
        if isinstance(existing_row, dict):
            raw_path = existing_row.get('AttachmentPath')
        elif isinstance(existing_row, (list, tuple)) and existing_row:
            raw_path = existing_row[0]
        if raw_path is not None:
            existing_attachment_path = str(raw_path)

    new_attachment_path: Optional[str] = None
    new_attachment_full_path: Optional[Path] = None
    if attachment_file and attachment_file.filename:
        try:
            new_attachment_path, new_attachment_full_path = _save_borrower_attachment(attachment_file, user_id)
        except ValueError as exc:
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({'error': str(exc)}), 400
        except Exception:
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({'error': 'attachment_processing_failed'}), 500

    borrower_fields = []
    borrower_values: list[Any] = []
    attachment_field_set = False
    final_attachment_path: Optional[str] = None
    path_to_delete_after_commit: Optional[str] = None

    if isinstance(borrower_payload, dict):
        if 'type' in borrower_payload:
            borrower_fields.append("Type=%s")
            borrower_values.append(borrower_payload.get('type'))
        if 'department' in borrower_payload:
            borrower_fields.append("Department=%s")
            borrower_values.append(borrower_payload.get('department'))
        if 'accountstatus' in borrower_payload:
            borrower_fields.append("AccountStatus=%s")
            borrower_values.append(borrower_payload.get('accountstatus'))

    if new_attachment_path is not None:
        final_attachment_path = new_attachment_path
        attachment_field_set = True
        if existing_attachment_path and existing_attachment_path != final_attachment_path:
            path_to_delete_after_commit = existing_attachment_path
    elif manual_attachment_provided:
        final_attachment_path = manual_attachment_path
        attachment_field_set = True
        if existing_attachment_path and existing_attachment_path != final_attachment_path:
            path_to_delete_after_commit = existing_attachment_path

    if attachment_field_set:
        borrower_fields.append("AttachmentPath=%s")
        borrower_values.append(final_attachment_path)

    try:
        if borrower_fields:
            borrower_values.append(user_id)
            sql = f"UPDATE Borrowers SET {', '.join(borrower_fields)} WHERE UserID=%s"
            cursor.execute(sql, tuple(borrower_values))
        conn.commit()
    except Exception:
        conn.rollback()
        if new_attachment_full_path:
            new_attachment_full_path.unlink(missing_ok=True)
        cursor.close()
        conn.close()
        current_app.logger.exception('Failed to update borrower attachment for user %s', user_id)
        return jsonify({'error': 'update_failed'}), 500
    finally:
        cursor.close()
        conn.close()

    if path_to_delete_after_commit and path_to_delete_after_commit != final_attachment_path:
        _delete_attachment_file(path_to_delete_after_commit)

    return jsonify({'message': 'User updated'})

# --- Approve a user account ---
@users_bp.route('/users/<int:user_id>/approve', methods=['PUT'])
def approve_user_account(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Update AccountStatus to 'Registered' for borrowers
    cursor.execute("""
        UPDATE Borrowers
        SET AccountStatus='Registered'
        WHERE UserID=%s
    """, (user_id,))
    # Notify borrower (sender optional from query: ?senderUserId=123)
    try:
        sender_id = request.args.get('senderUserId', type=int)
    except Exception:
        sender_id = None
    notify_account_approved(cursor, user_id, sender_user_id=sender_id)

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User approved.'}), 200

# --- Reject a user account ---
@users_bp.route('/users/<int:user_id>/reject', methods=['PUT'])
def reject_user_account(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    payload = request.get_json(silent=True) or {}
    # Update AccountStatus to 'Rejected' for borrowers
    cursor.execute("""
        UPDATE Borrowers
        SET AccountStatus='Rejected'
        WHERE UserID=%s
    """, (user_id,))
    # Notify borrower (sender optional from query)
    try:
        sender_id = request.args.get('senderUserId', type=int)
    except Exception:
        sender_id = None
    reason = payload.get('reason') if isinstance(payload, dict) else None
    notify_account_rejected(cursor, user_id, sender_user_id=sender_id, reason=reason)

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User rejected.'}), 200

# --- Get User Details by BorrowerID ---
@users_bp.route('/users/borrower/<int:borrower_id>', methods=['GET'])
def get_user_by_borrower_id(borrower_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'database_unavailable'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
               b.BorrowerID, b.Type, b.Department, b.AccountStatus, b.AttachmentPath
        FROM Borrowers b
        JOIN Users u ON u.UserID = b.UserID
        LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
        WHERE b.BorrowerID = %s
    """, (borrower_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user:
        return jsonify({'error': 'Borrower not found'}), 404
    user = dict(user)
    # Structure output similar to /users
    attachment_path = user.get('AttachmentPath')
    user['borrower'] = {
        'BorrowerID': user['BorrowerID'],
        'Type': user['Type'],
        'Department': user['Department'],
        'AccountStatus': user['AccountStatus'],
        'AttachmentPath': attachment_path,
        'AttachmentPdfBase64': _load_attachment_pdf_content(attachment_path)
    }
    for k in ['BorrowerID', 'Type', 'Department', 'AccountStatus', 'AttachmentPath']:
        user.pop(k, None)
    return jsonify(user)

# --- Get User Details by UserID ---
@users_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
         s.Position,
         b.BorrowerID, b.Type, b.Department, b.AccountStatus, b.AttachmentPath
        FROM Users u
        LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
        LEFT JOIN Staff s ON u.UserID = s.UserID
        LEFT JOIN Borrowers b ON u.UserID = b.UserID
        WHERE u.UserID = %s
        LIMIT 1
    """, (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user = dict(user)

    if user.get('Role') == 'Staff':
        response = {k: v for k, v in user.items() if k not in {'Position', 'Type', 'Department', 'AccountStatus', 'BorrowerID', 'AttachmentPath'}}
        response['staff'] = {'Position': user.get('Position')}
        response['borrower'] = None
    elif user.get('Role') == 'Borrower':
        response = {k: v for k, v in user.items() if k not in {'Position', 'Type', 'Department', 'AccountStatus', 'BorrowerID', 'AttachmentPath'}}
        response['staff'] = None
        attachment_path = user.get('AttachmentPath')
        response['borrower'] = {
            'BorrowerID': user.get('BorrowerID'),
            'Type': user.get('Type'),
            'Department': user.get('Department'),
            'AccountStatus': user.get('AccountStatus'),
            'AttachmentPath': attachment_path,
            'AttachmentPdfBase64': _load_attachment_pdf_content(attachment_path)
        }
    else:
        response = {k: v for k, v in user.items() if k not in {'Position', 'Type', 'Department', 'AccountStatus', 'BorrowerID', 'AttachmentPath'}}
        response['staff'] = None
        response['borrower'] = None

    return jsonify(response)