from flask import Blueprint, jsonify, request, current_app, send_from_directory, abort
from ..services.system import (
    snapshot,
    get_cpu,
    get_memory,
    get_disks,
    get_network,
    get_system,
)
from ..services.backup import create_backup, list_backups, get_backup_dir
from ..services.settings import load_settings, save_settings  # added

systems_bp = Blueprint("systems", __name__)

def _get_float(arg: str, default: float) -> float:
    try:
        return float(request.args.get(arg, default))
    except (TypeError, ValueError):
        return default

@systems_bp.route("/system/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

@systems_bp.route("/system/info", methods=["GET"])
def system_info():
    return jsonify(get_system()), 200

@systems_bp.route("/system/cpu", methods=["GET"])
def system_cpu():
    interval = _get_float("interval", 0.1)
    return jsonify(get_cpu(interval=interval)), 200

@systems_bp.route("/system/memory", methods=["GET"])
def system_memory():
    return jsonify(get_memory()), 200

@systems_bp.route("/system/disks", methods=["GET"])
def system_disks():
    return jsonify(get_disks()), 200

@systems_bp.route("/system/network", methods=["GET"])
def system_network():
    sample = _get_float("sample", 0.0)  # seconds to measure throughput
    return jsonify(get_network(sample_seconds=sample)), 200

@systems_bp.route("/system/snapshot", methods=["GET"])
def system_snapshot():
    cpu_interval = _get_float("cpu_interval", 0.1)
    net_sample = _get_float("net_sample", 0.0)
    return jsonify(snapshot(cpu_interval=cpu_interval, net_sample=net_sample)), 200

@systems_bp.route("/system/backup", methods=["POST"])
def system_backup():
    """
    Triggers a database backup and returns metadata.
    Optional query: ?download=1 to return the file directly.
    """
    try:
        meta = create_backup(current_app)
    except Exception as e:
        msg = str(e)
        status = 500
        code = "ERROR"
        if "MISSING_MYSQLDUMP" in msg or "mysqldump not found" in msg:
            status = 503
            code = "MISSING_MYSQLDUMP"
        return jsonify({"error": msg, "code": code}), status

    download = request.args.get("download")
    if download in ("1", "true", "yes"):
        return send_from_directory(
            get_backup_dir(), meta["file"], as_attachment=True, download_name=meta["file"]
        )

    return jsonify(meta), 200

@systems_bp.route("/system/backups", methods=["GET"])
def system_backups_list():
    """
    Lists existing backup files.
    """
    try:
        items = list_backups()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@systems_bp.route("/system/backup/<path:filename>", methods=["GET"])
def system_backup_download(filename: str):
    """
    Downloads a specific backup file by name.
    """
    # Basic safety: only allow .sql or .sqlite3 within backup dir
    if not (filename.endswith(".sql") or filename.endswith(".sqlite3")):
        abort(400, description="Invalid file type")
    return send_from_directory(get_backup_dir(), filename, as_attachment=True, download_name=filename)

@systems_bp.route("/system/settings", methods=["GET"])
def get_system_settings():
    return jsonify(load_settings()), 200

@systems_bp.route("/system/settings", methods=["POST"])
def update_system_settings():
    try:
        data = request.get_json(silent=True) or {}
        saved = save_settings(data)
        return jsonify(saved), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500