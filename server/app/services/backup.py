import os
import io
import sqlite3
import subprocess
import gzip
import shutil
from datetime import datetime, timezone, date, time
from urllib.parse import urlparse
from decimal import Decimal

import mysql.connector
from mysql.connector import Error as MySQLError

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

    backup_dir = get_backup_dir()
    out_name = f"mysql_backup_{_ts()}.sql"
    out_path = os.path.join(backup_dir, out_name)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    if mysqldump:
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

        with open(out_path, "wb") as f:
            proc = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            try:
                if os.path.exists(out_path):
                    os.remove(out_path)
            except Exception:
                pass
            raise RuntimeError(f"mysqldump failed: {proc.stderr.decode(errors='ignore') or 'unknown error'}")

        method = "mysqldump"
    else:
        try:
            _python_mysql_backup(cfg, out_path)
        except Exception as exc:
            try:
                if os.path.exists(out_path):
                    os.remove(out_path)
            except Exception:
                pass
            raise RuntimeError(
                "MISSING_MYSQLDUMP: Python fallback failed when creating the backup. "
                "Install MySQL client tools (mysqldump/mariadb-dump) or provide MYSQLDUMP_PATH. "
                f"Details: {exc}"
            )
        method = "python"

    size = os.path.getsize(out_path)
    result = {"file": out_name, "path": out_path, "size": size, "db_type": "mysql", "method": method}
    result = _maybe_compress(result)
    _enforce_retention()
    return result


def _mysql_escape_value(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, datetime):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
    if isinstance(value, date):
        return f"'{value.strftime('%Y-%m-%d')}'"
    if isinstance(value, time):
        return f"'{value.strftime('%H:%M:%S')}'"
    if isinstance(value, bytes):
        return "0x" + value.hex()
    escaped = str(value).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def _python_mysql_backup(cfg: dict, out_path: str) -> None:
    required = ["host", "port", "name", "user"]
    if not all(cfg.get(k) for k in required):
        raise RuntimeError("Incomplete MySQL config. Host, port, name, and user are required for Python backup fallback.")

    try:
        conn = mysql.connector.connect(
            host=cfg.get("host"),
            port=int(cfg.get("port", 3306)),
            user=cfg.get("user"),
            password=cfg.get("password", ""),
            database=cfg.get("name"),
            charset="utf8mb4",
        )
    except MySQLError as exc:
        raise RuntimeError(f"MySQL connection failed: {exc}")

    cursor = None
    try:
        cursor = conn.cursor()
        try:
            cursor.execute("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        except MySQLError:
            pass
        try:
            cursor.execute("START TRANSACTION WITH CONSISTENT SNAPSHOT")
        except MySQLError:
            pass

        cursor.execute("SHOW FULL TABLES")
        rows = cursor.fetchall()
        tables = [(r[0], r[1]) for r in rows]
        tables.sort(key=lambda x: x[0])

        with open(out_path, "w", encoding="utf-8") as f:
            f.write("-- MariaDB/MySQL logical backup generated via Python fallback\n")
            f.write(f"-- Host: {cfg.get('host')}\n")
            f.write(f"-- Database: {cfg.get('name')}\n")
            f.write(f"-- Timestamp: {datetime.utcnow().isoformat()}Z\n\n")
            f.write("SET NAMES utf8mb4;\n")
            f.write("SET FOREIGN_KEY_CHECKS=0;\n")
            f.write(f"USE `{cfg.get('name')}`;\n\n")

            for table_name, table_type in tables:
                if table_type and table_type.upper() == "VIEW":
                    cursor.execute(f"SHOW CREATE VIEW `{table_name}`")
                    create_view = cursor.fetchone()
                    if create_view and len(create_view) > 1:
                        f.write(f"-- ----------------------------\n-- Structure for view `{table_name}`\n-- ----------------------------\n")
                        f.write(f"DROP VIEW IF EXISTS `{table_name}`;\n")
                        f.write(create_view[1] + ";\n\n")
                    continue

                cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
                create_row = cursor.fetchone()
                if not create_row or len(create_row) < 2:
                    continue
                create_stmt = create_row[1]

                f.write(f"-- ----------------------------\n-- Structure for table `{table_name}`\n-- ----------------------------\n")
                f.write(f"DROP TABLE IF EXISTS `{table_name}`;\n")
                f.write(create_stmt + ";\n\n")

                data_cursor = conn.cursor()
                try:
                    data_cursor.execute(f"SELECT * FROM `{table_name}`")
                    has_description = bool(data_cursor.description)

                    f.write(f"-- ----------------------------\n-- Data for table `{table_name}`\n-- ----------------------------\n")

                    batch = data_cursor.fetchmany(size=500)
                    while batch:
                        for row in batch:
                            values = ", ".join(_mysql_escape_value(value) for value in row)
                            if has_description:
                                f.write(f"INSERT INTO `{table_name}` VALUES ({values});\n")
                        batch = data_cursor.fetchmany(size=500)
                    f.write("\n")
                finally:
                    data_cursor.close()

            f.write("SET FOREIGN_KEY_CHECKS=1;\n")
            f.write("COMMIT;\n")

        conn.commit()
    finally:
        try:
            if cursor is not None:
                cursor.close()
        except Exception:
            pass
        conn.close()

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