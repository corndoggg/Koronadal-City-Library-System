from flask import Blueprint, jsonify, request
from ..db import get_db_connection
from datetime import datetime
import re
from ..services.notifications import (
    notify_account_registration_submitted,
    notify_account_approved,
    notify_account_rejected,
)
from werkzeug.security import generate_password_hash
from app.services.passwords import (
    hash_password,
    verify_password,
    needs_rehash,
)

users_bp = Blueprint('users', __name__)

USERNAME_PATTERN = re.compile(r'^[A-Za-z0-9._-]+$')
USERNAME_MIN_LENGTH = 4

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
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    raw_password = data['password']
    hashed = hash_password(raw_password)

    cursor.execute("""
        INSERT INTO Users (Username, Password, Role)
        VALUES (%s, %s, %s)
    """, (data['username'], hashed, data['role']))
    user_id = cursor.lastrowid

    # Insert into UserDetails
    details = data['details']
    date_of_birth = parse_date(details.get('dateofbirth'))
    cursor.execute("""
        INSERT INTO UserDetails (UserID, Firstname, Middlename, Lastname, Email, ContactNumber, Street, Barangay, City, Province, DateOfBirth)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, details['firstname'], details.get('middlename'), details['lastname'], details['email'],
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
        cursor.execute("""
            INSERT INTO Borrowers (UserID, Type, Department, AccountStatus)
            VALUES (%s, %s, %s, %s)
        """, (user_id, borrower['type'], borrower.get('department'), borrower['accountstatus']))
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
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
               s.Position,
               b.BorrowerID, b.Type, b.Department, b.AccountStatus
        FROM Users u
        LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
        LEFT JOIN Staff s ON u.UserID = s.UserID
        LEFT JOIN Borrowers b ON u.UserID = b.UserID
    """)
    users = cursor.fetchall()
    for user in users:
        if user['Role'] == 'Staff':
            user['staff'] = {'Position': user['Position']}
            user['borrower'] = None
        elif user['Role'] == 'Borrower':
            user['borrower'] = {
                'BorrowerID': user['BorrowerID'],
                'Type': user['Type'],
                'Department': user['Department'],
                'AccountStatus': user['AccountStatus']
            }
            user['staff'] = None
        else:
            user['staff'] = None
            user['borrower'] = None
        # cleanup
        for k in ['Position','Type','Department','AccountStatus','BorrowerID']:
            user.pop(k, None)
    cursor.close()
    conn.close()
    return jsonify(users)

# --- Edit User (and Borrower/Staff) ---
@users_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

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
    if 'details' in data:
        details = data['details']
        date_of_birth = parse_date(details.get('dateofbirth'))
        cursor.execute("""
            UPDATE UserDetails SET Firstname=%s, Middlename=%s, Lastname=%s, Email=%s, ContactNumber=%s,
            Street=%s, Barangay=%s, City=%s, Province=%s, DateOfBirth=%s WHERE UserID=%s
        """, (details.get('firstname'), details.get('middlename'), details.get('lastname'), details.get('email'),
              details.get('contactnumber'), details.get('street'), details.get('barangay'), details.get('city'),
              details.get('province'), date_of_birth, user_id))

    # Update Staff
    if 'staff' in data:
        staff = data['staff']
        cursor.execute("""
            UPDATE Staff SET Position=%s WHERE UserID=%s
        """, (staff.get('position'), user_id))

    # Update Borrower
    if 'borrower' in data:
        borrower = data['borrower']
        cursor.execute("""
            UPDATE Borrowers SET Type=%s, Department=%s, AccountStatus=%s WHERE UserID=%s
        """, (borrower.get('type'), borrower.get('department'), borrower.get('accountstatus'), user_id))

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User updated'})

# --- Login User ---
@users_bp.route('/users/login', methods=['POST'])
def login_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role, u.Password,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
               s.Position,
               b.BorrowerID, b.Type, b.Department, b.AccountStatus
        FROM Users u
        LEFT JOIN UserDetails ud ON u.UserID = ud.UserID
        LEFT JOIN Staff s ON u.UserID = s.UserID
        LEFT JOIN Borrowers b ON u.UserID = b.UserID
        WHERE u.Username = %s
    """, (username,))
    user = cursor.fetchone()

    if not user or not verify_password(user['Password'], password):
        cursor.close()
        conn.close()
        return jsonify({'error': 'Invalid username or password'}), 401

    # If legacy password (plaintext) rehash & store
    if needs_rehash(user['Password']):
        try:
            new_hash = hash_password(password)
            up_cur = conn.cursor()
            up_cur.execute("UPDATE Users SET Password=%s WHERE UserID=%s", (new_hash, user['UserID']))
            conn.commit()
            up_cur.close()
        except Exception:
            conn.rollback()

    # Strip hashed password from response
    user.pop('Password', None)

    if user['Role'] == 'Staff':
        user['staff'] = {'Position': user['Position']}
        user['borrower'] = None
    elif user['Role'] == 'Borrower':
        user['borrower'] = {
            'BorrowerID': user['BorrowerID'],
            'Type': user['Type'],
            'Department': user['Department'],
            'AccountStatus': user['AccountStatus']
        }
        user['staff'] = None
    else:
        user['staff'] = None
        user['borrower'] = None

    for k in ['Position','Type','Department','AccountStatus','BorrowerID']:
        user.pop(k, None)

    cursor.close()
    conn.close()
    return jsonify(user)

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
    notify_account_rejected(cursor, user_id, sender_user_id=sender_id)

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User rejected.'}), 200

# --- Get User Details by BorrowerID ---
@users_bp.route('/users/borrower/<int:borrower_id>', methods=['GET'])
def get_user_by_borrower_id(borrower_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.UserID, u.Username, u.Role,
               ud.Firstname, ud.Middlename, ud.Lastname, ud.Email, ud.ContactNumber,
               ud.Street, ud.Barangay, ud.City, ud.Province, ud.DateOfBirth,
               b.BorrowerID, b.Type, b.Department, b.AccountStatus
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
    # Structure output similar to /users
    user['borrower'] = {
        'BorrowerID': user['BorrowerID'],
        'Type': user['Type'],
        'Department': user['Department'],
        'AccountStatus': user['AccountStatus']
    }
    for k in ['BorrowerID', 'Type', 'Department', 'AccountStatus']:
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
               b.BorrowerID, b.Type, b.Department, b.AccountStatus
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

    if user['Role'] == 'Staff':
        user['staff'] = {'Position': user['Position']}
        user['borrower'] = None
    elif user['Role'] == 'Borrower':
        user['borrower'] = {
            'BorrowerID': user['BorrowerID'],
            'Type': user['Type'],
            'Department': user['Department'],
            'AccountStatus': user['AccountStatus']
        }
        user['staff'] = None
    else:
        user['staff'] = None
        user['borrower'] = None

    for k in ['Position','Type','Department','AccountStatus','BorrowerID']:
        user.pop(k, None)

    return jsonify(user)