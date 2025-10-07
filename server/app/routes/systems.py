import os
from flask import Blueprint, jsonify, request, current_app, send_from_directory, send_file, abort
from werkzeug.utils import secure_filename
from ..services.backup import create_backup, list_backups, get_backup_dir
from ..services.settings import load_settings, save_settings  # added
from ..services.image_pdf import images_to_pdf, get_uploads_dir, get_generated_dir, _is_allowed_image  # added

systems_bp = Blueprint("systems", __name__)

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

@systems_bp.route("/system/settings/borrow-limit", methods=["GET"])
def get_borrow_limit_setting():
    settings = load_settings()
    return jsonify({"borrow_limit": settings.get("borrow_limit")}), 200

@systems_bp.route("/system/settings/borrow-limit", methods=["POST"])
def update_borrow_limit_setting():
    data = request.get_json(silent=True) or {}
    if "borrow_limit" not in data:
        return jsonify({"error": "Missing borrow_limit"}), 400
    try:
        limit_val = int(data["borrow_limit"])
        if limit_val <= 0:
            raise ValueError()
    except Exception:
        return jsonify({"error": "borrow_limit must be a positive integer"}), 400

    saved = save_settings({"borrow_limit": limit_val})
    return jsonify({"borrow_limit": saved.get("borrow_limit")}), 200


@systems_bp.route("/system/settings/backup-schedule", methods=["GET"])
def get_backup_schedule():
    settings = load_settings()
    return (
        jsonify(
            {
                "auto_backup_enabled": settings.get("auto_backup_enabled"),
                "auto_backup_time": settings.get("auto_backup_time"),
                "auto_backup_days": settings.get("auto_backup_days"),
            }
        ),
        200,
    )


@systems_bp.route("/system/settings/backup-schedule", methods=["POST"])
def update_backup_schedule():
    data = request.get_json(silent=True) or {}
    payload = {}
    if "auto_backup_enabled" in data:
        payload["auto_backup_enabled"] = data["auto_backup_enabled"]
    if "auto_backup_time" in data:
        payload["auto_backup_time"] = data["auto_backup_time"]
    if "auto_backup_days" in data:
        payload["auto_backup_days"] = data["auto_backup_days"]

    if not payload:
        return jsonify({"error": "No schedule fields provided"}), 400

    saved = save_settings(payload)
    return (
        jsonify(
            {
                "auto_backup_enabled": saved.get("auto_backup_enabled"),
                "auto_backup_time": saved.get("auto_backup_time"),
                "auto_backup_days": saved.get("auto_backup_days"),
            }
        ),
        200,
    )

@systems_bp.route("/system/image-to-pdf", methods=["POST"])
def system_image_to_pdf():
    """
    Convert 1..N images into a single PDF and return it.
    Accepts:
      - multipart/form-data with one or more files under field name 'images'
      - application/json with {"files": ["existing1.jpg", "existing2.png"]} referring to server/uploads
    Optional query:
      - ?inline=1 to preview in browser (default is attachment)
    """
    images_fs = []
    errors = []

    # Option A: multipart uploads
    if request.files:
        files = request.files.getlist("images")
        for f in files:
            if not f or not getattr(f, "filename", ""):
                continue
            fname = secure_filename(f.filename or "")
            if not fname:
                errors.append("Unnamed file skipped")
                continue
            if not _is_allowed_image(fname):
                errors.append(f"{fname}: unsupported file type")
                continue
            # save to uploads temp and use that path
            uploads = get_uploads_dir()
            save_path = os.path.join(uploads, fname)
            # Avoid overwrite by uniquifying
            base, ext = os.path.splitext(save_path)
            i = 1
            while os.path.exists(save_path):
                save_path = f"{base}_{i}{ext}"
                i += 1
            f.save(save_path)
            images_fs.append(save_path)

    # Option B: JSON body referencing existing files
    if not images_fs and request.is_json:
        data = request.get_json(silent=True) or {}
        names = data.get("files") or data.get("paths") or []
        if isinstance(names, list):
            uploads = get_uploads_dir()
            for n in names:
                # Only allow basenames to prevent path traversal
                bn = secure_filename(os.path.basename(str(n)))
                if not _is_allowed_image(bn):
                    errors.append(f"{bn}: unsupported file type")
                    continue
                p = os.path.join(uploads, bn)
                if not os.path.isfile(p):
                    errors.append(f"{bn}: not found in uploads")
                    continue
                images_fs.append(p)

    if not images_fs:
        return jsonify({"error": "No images provided", "details": errors}), 400

    try:
        out_path, conv_errs = images_to_pdf(images_fs)
        errors.extend(conv_errs)
    except Exception as e:
        return jsonify({"error": f"Conversion failed: {e}"}), 500

    inline = request.args.get("inline") in ("1", "true", "yes")
    try:
        return send_file(
            out_path,
            mimetype="application/pdf",
            as_attachment=not inline,
            download_name=os.path.basename(out_path),
            max_age=0,
        )
    finally:
        # Optionally keep generated file; comment the next block to retain files
        # If you prefer to keep, remove this cleanup
        # try:
        #     if os.path.exists(out_path):
        #         os.remove(out_path)
        # except:
        #     pass
        pass