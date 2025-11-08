import os, re, hashlib, datetime, mimetypes, math, threading, json
from pathlib import Path
from typing import Dict, Any, List, Optional, cast
import PyPDF2, docx

# ---------- MODEL LOADING (smart cache + graceful fallback) ----------
_zero_shot = None
_zero_shot_lock = threading.Lock()
_zero_shot_failed = False

_TRAINING_DIR = Path(__file__).resolve().parent / "_training_data"
_TRAINING_FILE = _TRAINING_DIR / "document_samples.jsonl"
_TRAINING_LOCK = threading.Lock()
_TRAINING_TEXT_LIMIT = 20000

def get_zero_shot():
    global _zero_shot, _zero_shot_failed
    if _zero_shot_failed:
        return None
    if _zero_shot is None:
        with _zero_shot_lock:
            if _zero_shot is None:
                try:
                    from transformers import pipeline
                    _zero_shot = pipeline(
                        "zero-shot-classification",
                        model="facebook/bart-large-mnli",
                        device=-1
                    )
                except Exception:
                    _zero_shot_failed = True
                    _zero_shot = None
    return _zero_shot

# Restricted classification labels (business rule)
CLASSIFICATION_LABELS = ["Public Resources", "Government Document", "Historical Files"]
CATEGORY_LABELS = [
    "Public Records",
    "Government Report",
    "Policy Brief",
    "Administrative Order",
    "Legislative Act",
    "N/A"
]
DEPARTMENT_LABELS = [
    "Administration","Finance Department","Legal Department","Research Department",
    "Library Services","IT Department","Human Resources","Academic Affairs"
]

CURRENT_YEAR = datetime.datetime.utcnow().year

# Stopwords to avoid mis‑detecting as titles
_TITLE_STOP = {"a","the","an","of","for","and","in","on","by","to","with","at"}
TITLE_LINE_RE = re.compile(r'^[A-Z0-9][A-Za-z0-9 ,.\-:;()/]{5,180}$')
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s\-()]{7,}\d")
DOB_RE = re.compile(r"\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b")
GENERIC_ID_RE = re.compile(r"\b(ID|Id|id|Student\s*ID|Passport No\.?)[:#]?\s*[A-Z0-9\-]{4,}\b")

SENSITIVE_KEYWORDS = [
    r"\bssn\b", r"\bsocial security\b", r"\bpassport\b", r"\bcredit card\b",
    r"\baccount number\b", r"\bconfidential\b", r"\bstudent id\b", r"\bdate of birth\b"
]

SENSITIVITY_LEVELS = ["Public","Restricted","Confidential"]

# ------------- TEXT & METADATA EXTRACTION -------------
def extract_metadata(path_str: str) -> Dict[str, Any]:
    path = Path(path_str)
    stat = path.stat()
    mime, _ = mimetypes.guess_type(path_str)
    sha256 = hashlib.sha256(path.read_bytes()).hexdigest()
    pdf_meta = {}
    if path.suffix.lower() == ".pdf":
        try:
            with open(path_str, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                if reader.metadata:
                    for k, v in reader.metadata.items():
                        if isinstance(v, str):
                            cleaned = v.strip()
                            if cleaned:
                                pdf_meta[k.strip("/").lower()] = cleaned
        except Exception:
            pass
    return {
        "file_name": path.name,
        "extension": path.suffix.lower(),
        "size_bytes": stat.st_size,
        "mime_type": mime or "application/octet-stream",
        "sha256": sha256,
        "pdf_raw_metadata": pdf_meta
    }

def extract_text(path_str: str, max_chars: int = 250_000) -> str:
    ext = Path(path_str).suffix.lower()
    text = ""
    if ext == ".pdf":
        pages = []
        try:
            with open(path_str, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for idx, p in enumerate(reader.pages):
                    try:
                        pages.append(p.extract_text() or "")
                        if sum(len(x) for x in pages) > max_chars:
                            break
                    except Exception:
                        continue
        except Exception:
            pass
        text = "\n".join(pages)
    elif ext == ".docx":
        try:
            d = docx.Document(path_str)
            text = "\n".join(p.text for p in d.paragraphs)
        except Exception:
            text = ""
    return text[:max_chars]

# ------------- ZERO-SHOT + HEURISTIC CLASSIFICATION -------------
def _heuristic_classification(text: str) -> List[Dict[str,Any]]:
    t = text.lower()
    scores = {lbl:0.0 for lbl in CLASSIFICATION_LABELS}
    if "government" in t or "ordinance" in t or "policy" in t:
        scores["Government Document"] += 0.7
    if "archive" in t or "historical" in t or "year" in t:
        scores["Historical Files"] += 0.6
    if "guide" in t or "resources" in t or "public" in t:
        scores["Public Resources"] += 0.6
    # normalize
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [{"label": l, "score": round(s,4)} for l,s in ranked if s>0]

def segment_text(text: str, seg_size: int = 1600, max_segments: int = 4) -> List[str]:
    if not text:
        return []
    words = text.split()
    segments = []
    cur = []
    count = 0
    for w in words:
        cur.append(w)
        if len(" ".join(cur)) >= seg_size:
            segments.append(" ".join(cur))
            cur = []
            count += 1
            if count >= max_segments:
                break
    if cur and count < max_segments:
        segments.append(" ".join(cur))
    return segments or [text[:seg_size]]

def classify_document(text: str) -> List[Dict[str, Any]]:
    model = get_zero_shot()
    if not text.strip():
        return []
    # Multi-segment scoring: more stable on long docs
    segments = segment_text(text)
    agg = {lbl: [] for lbl in CLASSIFICATION_LABELS}
    if model:
        try:
            for seg in segments:
                res = cast(Dict[str, Any], model(seg[:4000], CLASSIFICATION_LABELS, multi_label=True))
                labels = res.get("labels", [])
                scores = res.get("scores", [])
                for lbl, score in zip(labels, scores):
                    lbl_key = str(lbl)
                    if lbl_key in agg:
                        agg[lbl_key].append(float(score))
        except Exception:
            # fallback to heuristic alone
            return _heuristic_classification(text)
        averaged = [
            (lbl, sum(v)/len(v) if v else 0.0) for lbl, v in agg.items()
        ]
        averaged.sort(key=lambda x: x[1], reverse=True)
        return [{"label": l, "score": float(f"{s:.4f}")} for l, s in averaged]
    # No model available -> heuristic
    return _heuristic_classification(text)

# ------------- FIELD EXTRACTION -------------
_DEGREE_CLEAN = re.compile(r",?\s*(Ph\.?D\.?|MSc|BS|MBA|MA|BA|BSc)\b", re.IGNORECASE)

def _clean_author(a: str) -> str:
    return _DEGREE_CLEAN.sub("", a).strip(" ,;-")

def zero_shot_best(text: str, labels: List[str], threshold: float = 0.40) -> Optional[str]:
    model = get_zero_shot()
    if not text.strip():
        return None
    if not model:
        # heuristic: first label whose keyword appears
        tl = text.lower()
        for lab in labels:
            key = lab.split()[0].lower()
            if key in tl:
                return lab
        return None
    try:
        res = cast(Dict[str, Any], model(text[:4000], labels, multi_label=True))
        best = None
        best_score = 0.0
        for lab, sc in zip(res.get("labels", []), res.get("scores", [])):
            if sc > best_score:
                best, best_score = lab, sc
        if best_score >= threshold:
            return best
    except Exception:
        return None
    return None

def extract_structured_fields(text: str, meta: Dict[str, Any]) -> Dict[str, Any]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    pdf_meta = meta.get("pdf_raw_metadata", {})
    title = pdf_meta.get("title") or ""
    if not title:
        candidates = []
        for cand in lines[:25]:
            if len(cand.split()) < 3:
                continue
            if TITLE_LINE_RE.match(cand) and not cand.lower() in _TITLE_STOP:
                candidates.append(cand)
        if candidates:
            title = max(candidates, key=len)
        elif lines:
            title = lines[0][:180]
    author = pdf_meta.get("author") or ""
    if not author:
        for l in lines[:60]:
            m = re.search(r'^(Author|Authors|By)\s*[:\-]\s*(.+)$', l, re.IGNORECASE)
            if m:
                author = _clean_author(m.group(2))
                break
        if not author:
            for l in lines[:40]:
                if len(l.split()) <= 6 and l.replace(" & "," ").count(" ")>=1:
                    if l[:1].isupper():
                        author = _clean_author(l)
                        break
    year = None
    for k,v in pdf_meta.items():
        if "creationdate" in k and re.search(r'20\d{2}|19\d{2}', v):
            m = re.search(r'(20\d{2}|19\d{2})', v)
            if m:
                yi = int(m.group(1))
                if 1950 <= yi <= CURRENT_YEAR:
                    year = yi
                    break
    if year is None:
        for y in re.findall(r'\b(19[5-9]\d|20[0-4]\d|2050)\b', "\n".join(lines[:120])):
            yi = int(y)
            if 1950 <= yi <= CURRENT_YEAR:
                year = yi
                break
    category = zero_shot_best(text, CATEGORY_LABELS) or "N/A"
    department = zero_shot_best(text, DEPARTMENT_LABELS) or "N/A"
    if not author:
        author = "N/A"
    if year is None:
        year = "N/A"
    return {
        "Title": title or None,
        "Author": author or "N/A",
        "Category": category,
        "Department": (department or "N/A"),
        "Year": year
    }

# ------------- PII & SENSITIVITY -------------
def detect_pii(text: str):
    findings = []
    for e in EMAIL_RE.findall(text):
        findings.append({"entity_type":"EMAIL","value":e})
    for p in PHONE_RE.findall(text):
        findings.append({"entity_type":"PHONE","value":p})
    for d in DOB_RE.findall(text):
        findings.append({"entity_type":"DOB","value":"/".join(d)})
    for g in GENERIC_ID_RE.findall(text):
        findings.append({"entity_type":"GENERIC_ID","value":g if isinstance(g,str) else "ID"})
    return findings

def sensitivity_flag(text: str, pii_findings) -> str:
    kw_hits = sum(1 for pat in SENSITIVE_KEYWORDS if re.search(pat, text, re.IGNORECASE))
    pii_count = len(pii_findings)
    # Weighted decision
    risk = kw_hits*1.2 + pii_count*1.5
    if risk >= 6:
        return "Confidential"
    if risk >= 1:
        return "Restricted"
    return "Public"

def record_training_sample(extracted_fields: Dict[str, Any], combined_text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Persist a lightweight training example for later fine-tuning."""
    if not combined_text:
        return

    snapshot = dict(extracted_fields or {})
    sample = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "fields": snapshot,
        "text": combined_text[:_TRAINING_TEXT_LIMIT],
        "metadata": metadata or {}
    }

    _TRAINING_DIR.mkdir(parents=True, exist_ok=True)
    with _TRAINING_LOCK:
        with _TRAINING_FILE.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(sample, ensure_ascii=False) + "\n")

# ------------- MAIN ENTRY -------------
def analyze_document(path_str: str) -> Dict[str, Any]:
    meta = extract_metadata(path_str)
    text = extract_text(path_str)
    classifications = classify_document(text)
    pii = detect_pii(text)
    sens = sensitivity_flag(text, pii)
    fields = extract_structured_fields(text, meta)
    fields["Classification"] = classifications[0]["label"] if classifications else None
    if not fields.get("Department"):
        fields["Department"] = "N/A"
    # Ensure allowed sensitivity
    fields["Sensitivity"] = sens if sens in SENSITIVITY_LEVELS else "Public"
    return {
        "metadata": meta,
        "extracted_fields": fields,
        "classification_ranked": classifications,
        "pii_summary": {
            "pii_count": len(pii),
            "sample": pii[:25],
            "types": list({f['entity_type'] for f in pii})
        }
    }