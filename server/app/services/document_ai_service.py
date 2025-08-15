import os
import tempfile
import shutil
import re
from datetime import datetime

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

ALLOWED_SENSITIVITY = ["Public", "Restricted", "Confidential"]
ALLOWED_CLASSIFICATIONS = ["Public Resources", "Government Document", "Historical Files"]
SAFE_FIELDS = ["Title", "Author", "Category", "Department", "Classification", "Year", "Sensitivity"]

_SENS_KEYWORDS = [
    r"\bconfidential\b", r"\brestricted\b", r"\bsecret\b",
    r"\bclassified\b", r"\bprivate\b", r"\bpersonal\b",
    r"\bpassport\b", r"\bcredit card\b", r"\baccount number\b",
    r"\bssn\b", r"\bsocial security\b", r"\bstudent id\b"
]

def _safe_filename(original_name: str) -> str:
    base = os.path.basename(original_name or "document.pdf")
    base = base.replace("..", "_").replace("/", "_").replace("\\", "_")
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{ts}_{base}"

def _heuristic_classification(text_lower: str) -> str:
    if any(k in text_lower for k in ("government", "ordinance", "policy", "republic act", "executive order")):
        return "Government Document"
    if any(k in text_lower for k in ("historical", "archive", "heritage", "chronicle", "centennial")):
        return "Historical Files"
    return "Public Resources"

def _heuristic_sensitivity(text_lower: str) -> str:
    hits = sum(1 for p in _SENS_KEYWORDS if re.search(p, text_lower))
    if hits >= 4:
        return "Confidential"
    if hits >= 1:
        return "Restricted"
    return "Public"

def _normalize_sensitivity(val):
    if not val:
        return "Public"
    for s in ALLOWED_SENSITIVITY:
        if val.lower() == s.lower():
            return s
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
    return None  # route will re‑heuristic if needed

def _extract_fields_from_pdf(pdf_path: str) -> dict:
    data = {}
    if not PdfReader:
        return data
    try:
        reader = PdfReader(pdf_path)
        pages_text = []
        for i in range(min(3, len(reader.pages))):
            try:
                pages_text.append(reader.pages[i].extract_text() or "")
            except Exception:
                continue
        text = "\n".join(pages_text)
        lower = text.lower()
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if lines:
            data["Title"] = lines[0][:180]
        import re
        for l in lines[:30]:
            low = l.lower()
            if not data.get("Author") and (" by " in low or low.startswith("by ")):
                data["Author"] = (
                    l.replace("By", "")
                     .replace("by", "")
                     .strip(" :,-")
                )[:120]
            if not data.get("Year"):
                m = re.search(r"\b(20\d{2}|19\d{2})\b", l)
                if m:
                    data["Year"] = m.group(1)
            if data.get("Author") and data.get("Year"):
                break
        data["Classification"] = _heuristic_classification(lower)
        data["Sensitivity"] = _heuristic_sensitivity(lower)
        # Aligned defaults
        data["Department"] = (data.get("Department") or "").strip() or "N/A"
        data["Category"] = (data.get("Category") or "").strip() or "N/A"
        if not data.get("Author"):
            data["Author"] = "N/A"
        if not data.get("Year"):
            data["Year"] = "N/A"
    except Exception:
        pass
    return data

def process_upload(file_storage, save_original=False, save_dir="uploaded_docs"):
    """
    Returns:
      {
        'saved_path': <path or None>,
        'extracted_fields': { Title, Author, Year, Classification, Sensitivity }
      }
    """
    if not file_storage:
        raise ValueError("No file provided")

    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    try:
        file_storage.stream.seek(0)
        file_storage.save(temp_path)

        extracted = _extract_fields_from_pdf(temp_path)
        extracted["Classification"] = _normalize_classification(extracted.get("Classification")) or extracted.get("Classification")
        extracted["Sensitivity"] = _normalize_sensitivity(extracted.get("Sensitivity"))
        # Alignment: guarantee keys & defaults
        extracted["Department"] = (extracted.get("Department") or "").strip() or "N/A"
        extracted["Category"] = (extracted.get("Category") or "").strip() or "N/A"
        if not extracted.get("Author"):
            extracted["Author"] = "N/A"
        if not extracted.get("Year"):
            extracted["Year"] = "N/A"

        final_saved_path = None
        if save_original:
            os.makedirs(save_dir, exist_ok=True)
            safe_name = _safe_filename(file_storage.filename)
            final_saved_path = os.path.join(save_dir, safe_name)
            shutil.copyfile(temp_path, final_saved_path)

        return {
            "saved_path": final_saved_path,
            "extracted_fields": extracted
        }
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            pass