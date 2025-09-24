from flask import Blueprint, request, jsonify
from app.db import get_db_connection

notification_bp = Blueprint('notification', __name__)

# -------- Helpers --------
def _parse_bool(val, default=None):
    if val is None:
        return default
    s = str(val).strip().lower()
    if s in ('1', 'true', 'yes', 'y'): return True
    if s in ('0', 'false', 'no', 'n'): return False
    return default

def _limit_offset():
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
    except ValueError:
        limit, offset = 20, 0
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    return limit, offset

def _ensure_type_exists(cursor, type_code):
    cursor.execute("SELECT 1 FROM Notification_Types WHERE Code=%s", (type_code,))
    return cursor.fetchone() is not None

# -------- Notification Types --------
@notification_bp.route('/notification-types', methods=['GET'])
def list_Notification_Types():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT Code, Description FROM Notification_Types ORDER BY Code ASC")
        return jsonify(cur.fetchall() or []), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/notification-types', methods=['POST'])
def create_notification_type():
    data = request.json or {}
    code = (data.get('Code') or data.get('code') or '').strip()
    desc = (data.get('Description') or data.get('description') or '').strip()
    if not code or not desc:
        return jsonify({'error': 'Code and Description are required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("INSERT INTO Notification_Types (Code, Description) VALUES (%s, %s)", (code, desc))
        conn.commit()
        return jsonify({'Code': code, 'Description': desc}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cur.close(); conn.close()

@notification_bp.route('/notification-types/<string:code>', methods=['PUT'])
def update_notification_type(code):
    data = request.json or {}
    desc = (data.get('Description') or data.get('description') or '').strip()
    if not desc:
        return jsonify({'error': 'Description is required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("UPDATE Notification_Types SET Description=%s WHERE Code=%s", (desc, code))
        conn.commit()
        return jsonify({'updated': cur.rowcount}), 200
    finally:
        cur.close(); conn.close()

# -------- Notifications (create, get, delete, admin list) --------
@notification_bp.route('/notifications', methods=['POST'])
def create_notification():
    """
    Body:
      Type: str (must exist in Notification_Types)
      Title: str|null
      Message: str
      SenderUserID: int|null
      RelatedType: str|null
      RelatedID: int|null
      recipients: [userId, ...]  (required, at least one)
    """
    data = request.json or {}
    type_code = (data.get('Type') or '').strip()
    title = data.get('Title')
    message = data.get('Message') or ''
    sender = data.get('SenderUserID')
    related_type = data.get('RelatedType')
    related_id = data.get('RelatedID')
    recipients = data.get('recipients') or []

    if not type_code or not message:
        return jsonify({'error': 'Type and Message are required.'}), 400
    if not isinstance(recipients, list) or len(recipients) == 0:
        return jsonify({'error': 'At least one recipient is required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        if not _ensure_type_exists(cur, type_code):
            return jsonify({'error': f'Notification type "{type_code}" does not exist.'}), 400

        cur.execute("""
            INSERT INTO Notifications (Type, Title, Message, SenderUserID, RelatedType, RelatedID)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (type_code, title, message, sender, related_type, related_id))
        notif_id = cur.lastrowid

        # Insert recipients (ignore duplicates)
        clean_recips = [int(r) for r in recipients if r is not None]
        if clean_recips:
            values = [(notif_id, rid) for rid in clean_recips]
            cur.executemany("""
                INSERT IGNORE INTO Notification_Recipients (NotificationID, RecipientUserID)
                VALUES (%s, %s)
            """, values)

        conn.commit()

        # Return composed result
        cur.execute("SELECT * FROM Notifications WHERE NotificationID=%s", (notif_id,))
        notif = cur.fetchone()
        cur.execute("""
            SELECT RecipientID, NotificationID, RecipientUserID, IsRead, ReadAt, CreatedAt
            FROM Notification_Recipients WHERE NotificationID=%s
        """, (notif_id,))
        recips = cur.fetchall() or []
        return jsonify({'notification': notif, 'recipients': recips}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close(); conn.close()

@notification_bp.route('/notifications/<int:notification_id>', methods=['GET'])
def get_notification(notification_id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM Notifications WHERE NotificationID=%s", (notification_id,))
        notif = cur.fetchone()
        if not notif:
            return jsonify({'error': 'Not found'}), 404
        cur.execute("""
            SELECT RecipientID, NotificationID, RecipientUserID, IsRead, ReadAt, CreatedAt
            FROM Notification_Recipients WHERE NotificationID=%s
        """, (notification_id,))
        recips = cur.fetchall() or []
        return jsonify({'notification': notif, 'recipients': recips}), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/notifications', methods=['GET'])
def admin_list_notifications():
    """
    Admin list with filters:
      ?type=CODE
      ?relatedType=Borrow
      ?relatedId=123
      ?q=search in Title/Message
      ?from=YYYY-MM-DD
      ?to=YYYY-MM-DD
      ?limit=..&offset=..
    """
    type_code = request.args.get('type')
    related_type = request.args.get('relatedType')
    related_id = request.args.get('relatedId')
    q = request.args.get('q')
    from_dt = request.args.get('from')
    to_dt = request.args.get('to')
    limit, offset = _limit_offset()

    where = []
    params = []
    if type_code:
        where.append("n.Type=%s"); params.append(type_code)
    if related_type:
        where.append("n.RelatedType=%s"); params.append(related_type)
    if related_id:
        where.append("n.RelatedID=%s"); params.append(related_id)
    if q:
        where.append("(n.Title LIKE %s OR n.Message LIKE %s)")
        like = f"%{q}%"; params.extend([like, like])
    if from_dt:
        where.append("n.CreatedAt >= %s"); params.append(from_dt)
    if to_dt:
        where.append("n.CreatedAt <= %s"); params.append(to_dt)

    sql = "SELECT n.* FROM Notifications n"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY n.CreatedAt DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall() or []
        return jsonify(rows), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("DELETE FROM Notifications WHERE NotificationID=%s", (notification_id,))
        conn.commit()
        return jsonify({'deleted': cur.rowcount}), 200
    finally:
        cur.close(); conn.close()

# -------- Recipient-scoped APIs (per user) --------
@notification_bp.route('/users/<int:user_id>/notifications', methods=['GET'])
def list_user_notifications(user_id):
    """
    List notifications for a recipient.
      Filters:
        ?isRead=true|false
        ?type=CODE
        ?q=... (Title/Message)
        ?limit&offset
    """
    is_read = _parse_bool(request.args.get('isRead'))
    type_code = request.args.get('type')
    q = request.args.get('q')
    limit, offset = _limit_offset()

    where = ["r.RecipientUserID=%s"]
    params = [user_id]
    if is_read is True:
        where.append("r.IsRead=1")
    elif is_read is False:
        where.append("r.IsRead=0")
    if type_code:
        where.append("n.Type=%s"); params.append(type_code)
    if q:
        where.append("(n.Title LIKE %s OR n.Message LIKE %s)")
        like = f"%{q}%"; params.extend([like, like])

    sql = f"""
        SELECT
            n.NotificationID, n.Type, n.Title, n.Message, n.SenderUserID,
            n.RelatedType, n.RelatedID, n.CreatedAt AS NotificationCreatedAt,
            r.RecipientID, r.IsRead, r.ReadAt, r.CreatedAt AS RecipientCreatedAt
        FROM Notification_Recipients r
        JOIN Notifications n ON n.NotificationID = r.NotificationID
        WHERE {" AND ".join(where)}
        ORDER BY n.CreatedAt DESC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, tuple(params))
        return jsonify(cur.fetchall() or []), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/users/<int:user_id>/notifications/unread-count', methods=['GET'])
def user_unread_count(user_id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM Notification_Recipients
            WHERE RecipientUserID=%s AND IsRead=0
        """, (user_id,))
        row = cur.fetchone() or {'cnt': 0}
        return jsonify({'userId': user_id, 'unread': int(row['cnt'])}), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/users/<int:user_id>/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_user_notification_read(user_id, notification_id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            UPDATE Notification_Recipients
            SET IsRead=1, ReadAt=NOW()
            WHERE RecipientUserID=%s AND NotificationID=%s
        """, (user_id, notification_id))
        conn.commit()
        return jsonify({'updated': cur.rowcount}), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/users/<int:user_id>/notifications/mark-read', methods=['PUT'])
def bulk_mark_user_notifications_read(user_id):
    data = request.json or {}
    ids = data.get('notificationIds') or []
    if not isinstance(ids, list) or not ids:
        return jsonify({'error': 'notificationIds array is required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        fmt = ','.join(['%s'] * len(ids))
        params = [user_id] + ids
        cur.execute(f"""
            UPDATE Notification_Recipients
            SET IsRead=1, ReadAt=NOW()
            WHERE RecipientUserID=%s AND NotificationID IN ({fmt})
        """, tuple(params))
        conn.commit()
        return jsonify({'updated': cur.rowcount}), 200
    finally:
        cur.close(); conn.close()

@notification_bp.route('/users/<int:user_id>/notifications/<int:notification_id>', methods=['DELETE'])
def delete_user_notification_link(user_id, notification_id):
    """
    Remove visibility of a notification for this user (deletes recipient link).
    """
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            DELETE FROM Notification_Recipients
            WHERE RecipientUserID=%s AND NotificationID=%s
        """, (user_id, notification_id))
        conn.commit()
        return jsonify({'deleted': cur.rowcount}), 200
    finally:
        cur.close(); conn.close()