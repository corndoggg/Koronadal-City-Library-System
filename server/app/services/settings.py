import json, os, tempfile
from typing import Dict, Any

def _server_dir():
    return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def get_settings_path() -> str:
    cfg_dir = os.path.join(_server_dir(), "config")
    os.makedirs(cfg_dir, exist_ok=True)
    return os.path.join(cfg_dir, "system.json")

DEFAULTS = {
    "fine": 5
}

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
    return out

def save_settings(partial: Dict[str, Any]) -> Dict[str, Any]:
    current = load_settings()
    if "fine" in partial:
        try:
            current["fine"] = int(partial["fine"])
        except Exception:
            pass
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