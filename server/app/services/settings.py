import json, os, tempfile
from typing import Dict, Any, Iterable

def _server_dir():
    return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def get_settings_path() -> str:
    cfg_dir = os.path.join(_server_dir(), "config")
    os.makedirs(cfg_dir, exist_ok=True)
    return os.path.join(cfg_dir, "system.json")

WEEKDAY_MAP = {
    "mon": "Mon",
    "monday": "Mon",
    "tue": "Tue",
    "tues": "Tue",
    "tuesday": "Tue",
    "wed": "Wed",
    "weds": "Wed",
    "wednesday": "Wed",
    "thu": "Thu",
    "thur": "Thu",
    "thurs": "Thu",
    "thursday": "Thu",
    "fri": "Fri",
    "friday": "Fri",
    "sat": "Sat",
    "saturday": "Sat",
    "sun": "Sun",
    "sunday": "Sun",
}

DEFAULTS = {
    "fine": 5,
    "borrow_limit": 3,
    "auto_backup_enabled": False,
    "auto_backup_time": "02:00",
    "auto_backup_days": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
    ],
    "auto_overdue_enabled": True,
    "auto_overdue_time": "08:00",
    "auto_overdue_days": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
    ],
}


def _normalize_bool(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "on"}:
            return True
        if lowered in {"false", "0", "no", "off"}:
            return False
    return default


def _normalize_time(value: Any, default: str) -> str:
    if isinstance(value, str):
        parts = value.strip().split(":")
        if len(parts) == 2:
            try:
                hour = int(parts[0])
                minute = int(parts[1])
                if 0 <= hour < 24 and 0 <= minute < 60:
                    return f"{hour:02d}:{minute:02d}"
            except Exception:
                pass
    return default


def _normalize_days(value: Any, default: Iterable[str]) -> list[str]:
    if isinstance(value, str):
        items = [value]
    elif isinstance(value, Iterable):
        items = value
    else:
        items = []
    normalized = []
    seen = set()
    for item in items:
        key = str(item).strip()
        if not key:
            continue
        lookup = WEEKDAY_MAP.get(key.lower())
        if not lookup:
            # attempt first three letters fallback
            lookup = WEEKDAY_MAP.get(key[:3].lower())
        if not lookup or lookup in seen:
            continue
        seen.add(lookup)
        normalized.append(lookup)
    if not normalized:
        return list(default)
    return normalized

def load_settings() -> Dict[str, Any]:
    path = get_settings_path()
    if not os.path.exists(path):
        return DEFAULTS.copy()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f) or {}
    except Exception:
        return DEFAULTS.copy()
    # normalize/ensure defaults
    out = DEFAULTS.copy()
    out.update(data)
    try:
        out["fine"] = int(out.get("fine", DEFAULTS["fine"]))
    except Exception:
        out["fine"] = DEFAULTS["fine"]
    try:
        limit_val = int(out.get("borrow_limit", DEFAULTS["borrow_limit"]))
        if limit_val <= 0:
            raise ValueError()
        out["borrow_limit"] = limit_val
    except Exception:
        out["borrow_limit"] = DEFAULTS["borrow_limit"]
    out["auto_backup_enabled"] = _normalize_bool(
        out.get("auto_backup_enabled", DEFAULTS["auto_backup_enabled"]),
        DEFAULTS["auto_backup_enabled"],
    )
    out["auto_backup_time"] = _normalize_time(
        out.get("auto_backup_time", DEFAULTS["auto_backup_time"]),
        DEFAULTS["auto_backup_time"],
    )
    out["auto_backup_days"] = _normalize_days(
        out.get("auto_backup_days", DEFAULTS["auto_backup_days"]),
        DEFAULTS["auto_backup_days"],
    )
    out["auto_overdue_enabled"] = _normalize_bool(
        out.get("auto_overdue_enabled", DEFAULTS["auto_overdue_enabled"]),
        DEFAULTS["auto_overdue_enabled"],
    )
    out["auto_overdue_time"] = _normalize_time(
        out.get("auto_overdue_time", DEFAULTS["auto_overdue_time"]),
        DEFAULTS["auto_overdue_time"],
    )
    out["auto_overdue_days"] = _normalize_days(
        out.get("auto_overdue_days", DEFAULTS["auto_overdue_days"]),
        DEFAULTS["auto_overdue_days"],
    )
    return out

def save_settings(partial: Dict[str, Any]) -> Dict[str, Any]:
    current = load_settings()
    if "fine" in partial:
        try:
            current["fine"] = int(partial["fine"])
        except Exception:
            pass
    if "borrow_limit" in partial:
        try:
            limit_val = int(partial["borrow_limit"])
            if limit_val <= 0:
                raise ValueError()
            current["borrow_limit"] = limit_val
        except Exception:
            pass
    if "auto_backup_enabled" in partial:
        current["auto_backup_enabled"] = _normalize_bool(
            partial.get("auto_backup_enabled"),
            current["auto_backup_enabled"],
        )
    if "auto_backup_time" in partial:
        current["auto_backup_time"] = _normalize_time(
            partial.get("auto_backup_time"),
            current["auto_backup_time"],
        )
    if "auto_backup_days" in partial:
        current["auto_backup_days"] = _normalize_days(
            partial.get("auto_backup_days"),
            current["auto_backup_days"],
        )
    if "auto_overdue_enabled" in partial:
        current["auto_overdue_enabled"] = _normalize_bool(
            partial.get("auto_overdue_enabled"),
            current["auto_overdue_enabled"],
        )
    if "auto_overdue_time" in partial:
        current["auto_overdue_time"] = _normalize_time(
            partial.get("auto_overdue_time"),
            current["auto_overdue_time"],
        )
    if "auto_overdue_days" in partial:
        current["auto_overdue_days"] = _normalize_days(
            partial.get("auto_overdue_days"),
            current["auto_overdue_days"],
        )
    # atomic write
    path = get_settings_path()
    fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(path), prefix="system_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except:
            pass
    return current