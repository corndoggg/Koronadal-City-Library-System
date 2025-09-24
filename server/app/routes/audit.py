from flask import Blueprint, request, jsonify
from app.db import get_db_connection
from app.services.audit import log_event

audit_bp = Blueprint("audit", __name__)

@audit_bp.route("/audit", methods=["GET"])
def list_audit():
    user_id = request.args.get("userId", type=int)
    action = request.args.get("action")
    target_type = request.args.get("targetType")
    target_id = request.args.get("targetId", type=int)
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    limit = request.args.get("limit", default=100, type=int)
    limit = max(1, min(limit, 1000))

    where, params = [], []
    if user_id:
        where.append("a.UserID=%s"); params.append(user_id)
    if action:
        where.append("a.ActionCode=%s"); params.append(action)
    if target_type:
        where.append("a.TargetTypeCode=%s"); params.append(target_type)
    if target_id:
        where.append("a.TargetID=%s"); params.append(target_id)
    if date_from:
        where.append("a.CreatedAt >= %s"); params.append(f"{date_from} 00:00:00")
    if date_to:
        where.append("a.CreatedAt <= %s"); params.append(f"{date_to} 23:59:59")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = f"""
        SELECT a.AuditID, a.UserID, a.ActionCode, a.TargetTypeCode, a.TargetID,
               a.Details, a.IPAddress, a.UserAgent, a.CreatedAt
        FROM AuditLog a
        {where_sql}
        ORDER BY a.AuditID DESC
        LIMIT %s
    """
    params.append(limit)
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)

@audit_bp.route("/audit", methods=["POST"])
def create_audit():
    data = request.json or {}
    action_code = data.get("actionCode")
    target_type = data.get("targetType")
    if not action_code:
        return jsonify({"error": "actionCode required"}), 400

    # Validate actionCode / targetType exist
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM ActionTypes WHERE ActionCode=%s LIMIT 1", (action_code,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({"error": "Unknown actionCode"}), 400
    if target_type:
        cur.execute("SELECT 1 FROM TargetTypes WHERE TargetTypeCode=%s LIMIT 1", (target_type,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return jsonify({"error": "Unknown targetType"}), 400
    cur.close(); conn.close()

    audit_id = log_event(
        action_code=action_code,
        user_id=data.get("userId"),
        target_type=target_type,
        target_id=data.get("targetId"),
        details=data.get("details"),
        ip=request.remote_addr,
        ua=request.headers.get("User-Agent"),
    )
    if not audit_id:
        return jsonify({"error": "Failed to log"}), 400
    return jsonify({"auditId": audit_id})

@audit_bp.route("/audit/action-types", methods=["GET"])
def list_action_types():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT ActionCode, Description FROM ActionTypes ORDER BY ActionCode")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)

@audit_bp.route("/audit/target-types", methods=["GET"])
def list_target_types():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT TargetTypeCode, Description FROM TargetTypes ORDER BY TargetTypeCode")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)