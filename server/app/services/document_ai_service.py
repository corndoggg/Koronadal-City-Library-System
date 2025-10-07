import os
import tempfile
import shutil
import re
from datetime import datetime
from io import BytesIO

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from PIL import Image
except ImportError:
    Image = None

from . import document_classifier

ALLOWED_SENSITIVITY = ["Public", "Restricted", "Confidential"]
ALLOWED_CLASSIFICATIONS = ["Public Resources", "Government Document", "Historical Files"]
SAFE_FIELDS = ["Title", "Author", "Category", "Department", "Classification", "Year", "Sensitivity"]

_SENS_KEYWORDS = [
    r"\bconfidential\b", r"\brestricted\b", r"\bsecret\b",
    r"\bclassified\b", r"\bprivate\b", r"\bpersonal\b",
    r"\bpassport\b", r"\bcredit card\b", r"\baccount number\b",
    r"\bssn\b", r"\bsocial security\b", r"\bstudent id\b"
]

OCR_MAX_PAGES = 3


def _iter_page_images(page):
    """Yield raw image bytes from a PDF page."""
    yielded = False

    try:
        for img in getattr(page, "images", []) or []:
            data = getattr(img, "data", None)
            if data:
                yielded = True
                yield data
    except Exception:
        pass

    if yielded:
        return

    try:
        resources = page.get("/Resources")
        if not resources:
            return
        xobjects = resources.get("/XObject")
        if not xobjects:
            return
        xobjects = xobjects.get_object()
        for name, xobj in xobjects.items():  # pylint: disable=unused-variable
            if xobj.get("/Subtype") != "/Image":
                continue
            try:
                yield xobj.get_data()
            except Exception:
                continue
    except Exception:
        return


def _ocr_images_from_page(page) -> str:
    if not pytesseract or not Image:
        return ""

    texts = []
    for data in _iter_page_images(page):
        try:
            with Image.open(BytesIO(data)) as img:
                pil_img = img.convert("RGB") if img.mode not in ("RGB", "L") else img.copy()
        except Exception:
            continue
        try:
            text = pytesseract.image_to_string(pil_img)
        except Exception:
            text = ""
        finally:
            pil_img.close()
        if text and text.strip():
            texts.append(text.strip())
    return "\n".join(texts)

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

def _extract_fields_from_pdf(pdf_path: str):
    data = {}
    combined_text = ""
    ocr_used = False
    if not PdfReader:
        return data, combined_text, ocr_used
    text_segments = []
    ocr_segments = []
    try:
        reader = PdfReader(pdf_path)
        page_count = len(reader.pages)
        limit = min(OCR_MAX_PAGES, page_count)
        for i in range(limit):
            page = reader.pages[i]
            try:
                text_segments.append(page.extract_text() or "")
            except Exception:
                text_segments.append("")
            ocr_text = _ocr_images_from_page(page)
            if ocr_text:
                ocr_segments.append(ocr_text)

        text_content = "\n".join(seg for seg in text_segments if seg).strip()
        ocr_content = "\n".join(ocr_segments).strip()
        parts = [part for part in (text_content, ocr_content) if part]
        combined_text = "\n".join(parts)
        analysis_source = combined_text or text_content or ""
        lines_source = text_content or analysis_source
        lines = [l.strip() for l in lines_source.splitlines() if l.strip()]
        if lines:
            data["Title"] = lines[0][:180]
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

        lower = analysis_source.lower()
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
        combined_text = combined_text or ""
    finally:
        ocr_used = bool(ocr_segments)

    return data, combined_text, ocr_used

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
        extracted, combined_text, ocr_used = _extract_fields_from_pdf(temp_path)
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

        training_metadata = {
            "file_name": file_storage.filename or "document.pdf",
            "saved_path": final_saved_path,
            "ocr_used": ocr_used,
            "text_chars": len(combined_text)
        }
        try:
            document_classifier.record_training_sample(dict(extracted), combined_text, training_metadata)
        except Exception:
            pass

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