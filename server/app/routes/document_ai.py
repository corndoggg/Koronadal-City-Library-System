from flask import Blueprint, request, jsonify, current_app
from ..services.document_ai_service import process_upload
import traceback, re

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

bp = Blueprint("document_ai", __name__)

ALLOWED_SENSITIVITY = ["Public", "Restricted", "Confidential"]
ALLOWED_CLASSIFICATIONS = ["Public Resources", "Government Document", "Historical Files"]

def _normalize_sensitivity(val):
    if not val:
        return "Public"
    for s in ALLOWED_SENSITIVITY:
        if val.lower() == s.lower():
            return s
    # map legacy
    m = val.lower()
    if m in ("low", "open"):
        return "Public"
    if m in ("medium", "internal"):
        return "Restricted"
    if m in ("high", "secret", "confidential"):
        return "Confidential"
    return "Public"

def _normalize_classification(val):
    if not val:
        return None
    for c in ALLOWED_CLASSIFICATIONS:
        if val.lower() == c.lower():
            return c
    # simple heuristics
    v = val.lower()
    if "government" in v or "ordinance" in v or "policy" in v:
        return "Government Document"
    if "histor" in v or "archive" in v:
        return "Historical Files"
    if "public" in v or "resource" in v or "guide" in v:
        return "Public Resources"
    return None

def _fallback_extract(file_storage):
    if not PdfReader:
        return {}
    try:
        file_storage.stream.seek(0)
        reader = PdfReader(file_storage.stream)
        pages_text = []
        for i in range(min(2, len(reader.pages))):
            try:
                pages_text.append(reader.pages[i].extract_text() or "")
            except Exception:
                continue
        text = "\n".join(pages_text)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        data = {}
        if lines:
            data["Title"] = lines[0][:180]
        for l in lines[:15]:
            if not data.get("Author") and ("by " in l.lower() or l.lower().startswith("by")):
                data["Author"] = l.replace("By", "").replace("by", "").strip(" :,-")[:120]
            if not data.get("Year"):
                m = re.search(r"\b(20\d{2}|19\d{2})\b", l)
                if m:
                    data["Year"] = m.group(1)
            if all(k in data for k in ("Title", "Author", "Year")):
                break
        return data
    except Exception:
        return {}

def _json_error(code, error, detail=None, trace=None):
    payload = {"error": error}
    if detail: payload["detail"] = detail
    if trace and current_app.debug: payload["trace"] = trace
    return jsonify(payload), code

@bp.route("/analyze", methods=["POST"])
def analyze_document():
    if "file" not in request.files:
        return _json_error(400, "file_field_required")
    f = request.files["file"]
    if not f.filename:
        return _json_error(400, "empty_filename")
    if not f.filename.lower().endswith(".pdf"):
        return _json_error(400, "only_pdf_supported")

    save_flag = request.args.get("save", "false").lower() == "true"

    try:
        f.stream.seek(0)
        result = process_upload(f, save_original=save_flag, save_dir="uploaded_docs")
        fields = (result or {}).get("extracted_fields", {}) or {}
    except ValueError as ve:
        return _json_error(400, "validation_error", str(ve))
    except Exception as e:
        current_app.logger.exception("process_upload failed, using fallback")
        fields = _fallback_extract(f)
        if not fields:
            return _json_error(500, "processing_failed", str(e), traceback.format_exc())

    # Normalize + enforce allowed values + fallbacks
    norm = {
        "Title": fields.get("Title") or None,
        "Author": fields.get("Author") or "N/A",
        "Category": fields.get("Category") or "N/A",
        "Department": (fields.get("Department") or "").strip() or "N/A",
        "Classification": _normalize_classification(fields.get("Classification")),
        "Year": fields.get("Year") or "N/A",
        "Sensitivity": _normalize_sensitivity(fields.get("Sensitivity")),
    }

    return jsonify({
        "record": norm,
        "extracted_fields": fields,
        "allowed": {
            "sensitivity": ALLOWED_SENSITIVITY,
            "classification": ALLOWED_CLASSIFICATIONS
        }
    })