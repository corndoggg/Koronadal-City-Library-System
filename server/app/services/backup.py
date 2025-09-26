import os
import io
import sqlite3
import subprocess
import gzip
import shutil
from datetime import datetime, timezone
from urllib.parse import urlparse

def _server_dir():
    # app/services -> app -> server
    return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def get_backup_dir() -> str:
        """Determine backup directory.
        Priority:
            1. BACKUP_DIR env var (absolute or relative to container cwd)
            2. server/backups default
        Creates directory if missing.
        """
        base = os.getenv("BACKUP_DIR")
        path = base if base else os.path.join(_server_dir(), "backups")
        os.makedirs(path, exist_ok=True)
        return os.path.abspath(path)

def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

def _parse_db_config(app):
    """
    Tries to infer DB config from app.config or environment.
    Supports:
      - SQLALCHEMY_DATABASE_URI / DATABASE_URL (sqlite, mysql, mariadb)
      - Discrete env vars: DB_TYPE, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    """
    uri = (
        app.config.get("SQLALCHEMY_DATABASE_URI")
        or os.getenv("DATABASE_URL")
        or app.config.get("DATABASE_URL")
        or ""
    ).strip()

    if not uri:
        # Try discrete vars
        db_type = (app.config.get("DB_TYPE") or os.getenv("DB_TYPE") or "").lower()
        if db_type in ("sqlite", "sqlite3"):
            db_path = app.config.get("SQLITE_PATH") or os.getenv("SQLITE_PATH")
            if not db_path:
                # fallback relative db.sqlite in server folder
                db_path = os.path.join(_server_dir(), "db.sqlite")
            return {"type": "sqlite", "path": db_path}

        # Assume mysql/mariadb
        return {
            "type": db_type or "mysql",
            "host": app.config.get("DB_HOST") or os.getenv("DB_HOST") or "localhost",
            "port": int(app.config.get("DB_PORT") or os.getenv("DB_PORT") or 3306),
            "name": app.config.get("DB_NAME") or os.getenv("DB_NAME") or "",
            "user": app.config.get("DB_USER") or os.getenv("DB_USER") or "",
            "password": app.config.get("DB_PASSWORD") or os.getenv("DB_PASSWORD") or "",
        }

    # Parse URI
    p = urlparse(uri)
    scheme = (p.scheme or "").lower()

    if scheme.startswith("sqlite"):
        # sqlite: ///absolute/path or :memory:
        # Remove leading slashes for windows UNC quirks
        path = uri.split(":///", 1)[-1] if ":///" in uri else uri.split("://", 1)[-1]
        return {"type": "sqlite", "path": path}

    if scheme.startswith(("mysql", "mariadb")):
        name = (p.path or "").lstrip("/")
        return {
            "type": "mysql",
            "host": p.hostname or "localhost",
            "port": p.port or 3306,
            "name": name,
            "user": p.username or "",
            "password": p.password or "",
        }

    # Default fallback: try sqlite path
    return {"type": "sqlite", "path": uri}

def backup_sqlite(db_path: str) -> dict:
    """Creates a consistent backup of a SQLite database using the backup API."""
    backup_dir = get_backup_dir()
    out_name = f"sqlite_backup_{_ts()}.sqlite3"
    out_path = os.path.join(backup_dir, out_name)

    # Ensure directory exists
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Perform backup
    src = sqlite3.connect(db_path)
    try:
      # Target file
      dest = sqlite3.connect(out_path)
      try:
          src.backup(dest)  # online backup
      finally:
          dest.close()
    finally:
      src.close()

    size = os.path.getsize(out_path)
    result = {"file": out_name, "path": out_path, "size": size, "db_type": "sqlite"}
    result = _maybe_compress(result)
    _enforce_retention()
    return result

def _which(cmd: str) -> str | None:
    # Cross-platform which
    for p in os.environ.get("PATH", "").split(os.pathsep):
        full = os.path.join(p, cmd)
        if os.path.isfile(full):
            return full
        # Windows exe
        if os.name == "nt":
            full_exe = full + ".exe"
            if os.path.isfile(full_exe):
                return full_exe
    return None

def _find_mysqldump() -> str | None:
    """
    Attempts to locate a MySQL/MariaDB dump utility.
    Priority order:
      1. MYSQLDUMP_PATH env var (exact file path)
      2. MARIADB_DUMP_PATH env var (exact file path)
      3. mysqldump in PATH
      4. mariadb-dump in PATH (newer MariaDB installs)
    Returns absolute path or None.
    """
    explicit = os.getenv("MYSQLDUMP_PATH")
    if explicit and os.path.isfile(explicit):
        return explicit
    explicit_maria = os.getenv("MARIADB_DUMP_PATH")
    if explicit_maria and os.path.isfile(explicit_maria):
        return explicit_maria
    found = _which("mysqldump")
    if found:
        return found
    return _which("mariadb-dump")

def backup_mysql(cfg: dict) -> dict:
    """Uses mysqldump / mariadb-dump to create a .sql (optionally .gz) dump."""
    mysqldump = _find_mysqldump()
    if not mysqldump:
        raise RuntimeError(
            "MISSING_MYSQLDUMP: Could not locate 'mysqldump' or 'mariadb-dump'. Install client tools and ensure PATH includes /usr/bin, or set MYSQLDUMP_PATH or MARIADB_DUMP_PATH."
        )

    backup_dir = get_backup_dir()
    out_name = f"mysql_backup_{_ts()}.sql"
    out_path = os.path.join(backup_dir, out_name)

    cmd = [
        mysqldump,
        "-h", str(cfg.get("host", "localhost")),
        "-P", str(cfg.get("port", 3306)),
        "-u", str(cfg.get("user", "")),
        f"--password={cfg.get('password','')}",
        "--routines",
        "--events",
        "--triggers",
        "--single-transaction",
        "--set-gtid-purged=OFF",
        str(cfg.get("name", "")),
    ]

    # Run and write to file
    with open(out_path, "wb") as f:
        proc = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        # Clean failed file
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except:
            pass
        raise RuntimeError(f"mysqldump failed: {proc.stderr.decode(errors='ignore') or 'unknown error'}")

    size = os.path.getsize(out_path)
    result = {"file": out_name, "path": out_path, "size": size, "db_type": "mysql"}
    result = _maybe_compress(result)
    _enforce_retention()
    return result

def create_backup(app) -> dict:
    """Auto-detect DB type and create backup. Returns metadata."""
    cfg = _parse_db_config(app)
    db_type = (cfg.get("type") or "").lower()

    if db_type in ("sqlite", "sqlite3"):
        return backup_sqlite(cfg.get("path"))
    if db_type in ("mysql", "mariadb"):
        required = ["host", "port", "name", "user"]
        if not all(cfg.get(k) for k in required):
            raise RuntimeError("Incomplete MySQL config. Host, port, name, user, and password are required.")
        return backup_mysql(cfg)

    # Unsupported -> try sqlite path fallback
    if cfg.get("path"):
        return backup_sqlite(cfg.get("path"))
    raise RuntimeError(f"Unsupported database type: {db_type or 'unknown'}")

def list_backups() -> list[dict]:
    """Return available backups (including compressed) with size & timestamp."""
    backup_dir = get_backup_dir()
    results = []
    for name in sorted(os.listdir(backup_dir)):
        path = os.path.join(backup_dir, name)
        if not os.path.isfile(path):
            continue
        if not (name.endswith(".sql") or name.endswith(".sqlite3") or name.endswith(".sql.gz") or name.endswith(".sqlite3.gz")):
            continue
        stat = os.stat(path)
        results.append({
            "file": name,
            "size": stat.st_size,
            "mtime": int(stat.st_mtime),
        })
    # newest first
    results.sort(key=lambda x: x["mtime"], reverse=True)
    return results

# --- Enhancements for container / production usage ---

def _maybe_compress(result: dict) -> dict:
    """Optionally gzip the dump if COMPRESS_BACKUPS env set (true/1/yes)."""
    if os.getenv("COMPRESS_BACKUPS", "").lower() in ("1", "true", "yes"):
        path = result.get("path")
        if path and not path.endswith(".gz") and os.path.isfile(path):
            gz_path = path + ".gz"
            try:
                with open(path, "rb") as fin, gzip.open(gz_path, "wb") as fout:
                    shutil.copyfileobj(fin, fout)
                os.remove(path)
                result["path"] = gz_path
                result["file"] = os.path.basename(gz_path)
                result["size"] = os.path.getsize(gz_path)
            except Exception:
                # Leave uncompressed on failure
                pass
    return result

def _enforce_retention():
    """Keep only the newest BACKUP_RETENTION backups (if set)."""
    limit = os.getenv("BACKUP_RETENTION")
    if not limit:
        return
    try:
        n = int(limit)
    except ValueError:
        return
    if n <= 0:
        return
    backups = list_backups()
    for b in backups[n:]:  # remove older beyond limit
        try:
            os.remove(os.path.join(get_backup_dir(), b["file"]))
        except Exception:
            pass