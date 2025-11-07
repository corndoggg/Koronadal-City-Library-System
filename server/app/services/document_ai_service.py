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
ALLOWED_CLASSIFICATIONS = ["Public Resource", "Government Document", "Historical File"]
SAFE_FIELDS = ["Title", "Author", "Category", "Department", "Classification", "Year", "Sensitivity"]

_CLASSIFICATION_SYNONYMS = {
    "public resources": "Public Resource",
    "public resource": "Public Resource",
    "government document": "Government Document",
    "historical files": "Historical File",
    "historical file": "Historical File"
}

_SENS_KEYWORDS = [
    r"\bconfidential\b", r"\brestricted\b", r"\bsecret\b",
    r"\bclassified\b", r"\bprivate\b", r"\bpersonal\b",
    r"\bpassport\b", r"\bcredit card\b", r"\baccount number\b",
    r"\bssn\b", r"\bsocial security\b", r"\bstudent id\b"
]

OCR_MAX_PAGES = 3


def _normalize_text(value, default="N/A") -> str:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        value = str(value)
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or default
    return default


def _merge_field_sources(primary: dict, secondary: dict) -> dict:
    if not secondary:
        return dict(primary)
    result = dict(primary)
    for key, value in secondary.items():
        if key not in SAFE_FIELDS:
            continue
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        existing = result.get(key)
        if isinstance(existing, str):
            existing_str = existing.strip().lower()
        elif existing is None:
            existing_str = ""
        else:
            existing_str = str(existing).strip().lower()
        if existing_str in {"", "n/a", "na", "none"}:
            result[key] = value
    return result


def _run_classifier_pipeline(pdf_path: str, combined_text: str):
    if not combined_text.strip():
        return {}, [], None, {}
    classifier_fields = {}
    ranked = []
    sensitivity = None
    pii_summary = {}
    try:
        meta = document_classifier.extract_metadata(pdf_path)
    except Exception:
        meta = {}
    try:
        classifier_fields = document_classifier.extract_structured_fields(combined_text, meta)
    except Exception:
        classifier_fields = {}
    try:
        ranked = document_classifier.classify_document(combined_text)
    except Exception:
        ranked = []
    try:
        pii = document_classifier.detect_pii(combined_text)
        sensitivity = document_classifier.sensitivity_flag(combined_text, pii)
        pii_summary = {
            "pii_count": len(pii),
            "types": sorted({f.get("entity_type") for f in pii if f.get("entity_type")})
        }
    except Exception:
        sensitivity = None
        pii_summary = {}
    return classifier_fields, ranked, sensitivity, pii_summary


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
        return "Historical File"
    return "Public Resource"

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
    key = val.strip().lower()
    mapped = _CLASSIFICATION_SYNONYMS.get(key, None)
    if mapped:
        return mapped
    for c in ALLOWED_CLASSIFICATIONS:
        if key == c.lower():
            return c
    return None  # route will re-heuristic if needed

def _extract_fields_from_pdf(pdf_path: str):
    heuristic_fields = {}
    combined_text = ""
    ocr_segments = []
    if not PdfReader:
        return heuristic_fields, combined_text, {"ocr_used": False}

    text_segments = []
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
        sources = [part for part in (text_content, ocr_content) if part]
        combined_text = "\n".join(sources)
        analysis_source = combined_text or text_content or ""
        lines_source = text_content or analysis_source
        lines = [l.strip() for l in lines_source.splitlines() if l.strip()]

        if lines:
            heuristic_fields["Title"] = lines[0][:180]
        for line in lines[:30]:
            low = line.lower()
            if not heuristic_fields.get("Author") and (" by " in low or low.startswith("by ")):
                heuristic_fields["Author"] = (
                    line.replace("By", "")
                         .replace("by", "")
                         .strip(" :,-")
                )[:120]
            if not heuristic_fields.get("Year"):
                match = re.search(r"\b(20\d{2}|19\d{2})\b", line)
                if match:
                    heuristic_fields["Year"] = match.group(1)
            if heuristic_fields.get("Author") and heuristic_fields.get("Year"):
                break

        lower = analysis_source.lower()
        heuristic_fields["Classification"] = _heuristic_classification(lower)
        heuristic_fields["Sensitivity"] = _heuristic_sensitivity(lower)
    except Exception:
        combined_text = combined_text or ""

    classifier_fields, ranked, classifier_sensitivity, pii_summary = _run_classifier_pipeline(pdf_path, combined_text)
    merged_fields = _merge_field_sources(heuristic_fields, classifier_fields)

    # Defaults and normalization
    merged_fields["Department"] = _normalize_text(merged_fields.get("Department"))
    merged_fields["Category"] = _normalize_text(merged_fields.get("Category"))
    merged_fields["Author"] = _normalize_text(merged_fields.get("Author"))
    merged_fields["Year"] = _normalize_text(merged_fields.get("Year"))

    ranked_label = ranked[0]["label"] if ranked else merged_fields.get("Classification")
    normalized_class = _normalize_classification(ranked_label) or _normalize_classification(merged_fields.get("Classification"))
    if normalized_class:
        merged_fields["Classification"] = normalized_class
    else:
        merged_fields["Classification"] = _heuristic_classification((combined_text or "").lower())

    merged_fields["Sensitivity"] = _normalize_sensitivity(
        classifier_sensitivity or merged_fields.get("Sensitivity")
    )

    analysis = {
        "ocr_used": bool(ocr_segments),
        "classifier_ranked": ranked,
        "classifier_top": normalized_class or merged_fields.get("Classification"),
        "pii_summary": pii_summary
    }

    return merged_fields, combined_text, analysis

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

        extracted, combined_text, analysis_details = _extract_fields_from_pdf(temp_path)
        analysis_details = analysis_details or {}
        ocr_used = bool(analysis_details.get("ocr_used", False))

        extracted["Classification"] = _normalize_classification(extracted.get("Classification")) or extracted.get("Classification")
        extracted["Sensitivity"] = _normalize_sensitivity(extracted.get("Sensitivity"))
        # Alignment: guarantee keys & defaults
        extracted["Department"] = _normalize_text(extracted.get("Department"))
        extracted["Category"] = _normalize_text(extracted.get("Category"))
        extracted["Author"] = _normalize_text(extracted.get("Author"))
        extracted["Year"] = _normalize_text(extracted.get("Year"))

        final_saved_path = None
        if save_original:
            os.makedirs(save_dir, exist_ok=True)
            safe_name = _safe_filename(file_storage.filename)
            final_saved_path = os.path.join(save_dir, safe_name)
            shutil.copyfile(temp_path, final_saved_path)

        pii_summary = analysis_details.get("pii_summary")
        if not isinstance(pii_summary, dict):
            pii_summary = {}
        classifier_ranked = analysis_details.get("classifier_ranked")
        if not isinstance(classifier_ranked, list):
            classifier_ranked = []

        training_metadata = {
            "file_name": file_storage.filename or "document.pdf",
            "saved_path": final_saved_path,
            "ocr_used": ocr_used,
            "text_chars": len(combined_text),
            "classifier_top": analysis_details.get("classifier_top"),
            "pii_types": pii_summary.get("types"),
            "classifier_ranked": classifier_ranked[:3]
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