from datetime import date, datetime
from threading import Event, Thread
from typing import Optional, Set

from flask import current_app

from .backup import create_backup
from .settings import load_settings

_stop_event: Optional[Event] = None
_thread: Optional[Thread] = None


def _parse_schedule(settings) -> tuple[bool, int, int, Set[str]]:
    enabled = bool(settings.get("auto_backup_enabled", False))
    time_str = str(settings.get("auto_backup_time", "02:00") or "02:00")
    hour = 2
    minute = 0
    try:
        parts = time_str.split(":")
        if len(parts) == 2:
            hour = max(0, min(23, int(parts[0])))
            minute = max(0, min(59, int(parts[1])))
    except Exception:
        hour, minute = 2, 0
    days = settings.get("auto_backup_days") or []
    normalized_days = {str(d)[:3].title() for d in days if d}
    if not normalized_days:
        normalized_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
    return enabled, hour, minute, normalized_days


def _should_run(now: datetime, last_run: Optional[date], hour: int, minute: int, allowed_days: Set[str]) -> bool:
    day_code = now.strftime("%a")
    if allowed_days and day_code not in allowed_days:
        return False
    scheduled = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if now < scheduled:
        return False
    if last_run == scheduled.date():
        return False
    return True


def start_auto_backup_service(app):
    global _stop_event, _thread
    if _thread and _thread.is_alive():
        return
    _stop_event = Event()
    stop_event = _stop_event

    def _runner():
        last_run_date: Optional[date] = None
        with app.app_context():
            while not stop_event.is_set():
                try:
                    settings = load_settings()
                    enabled, hour, minute, allowed_days = _parse_schedule(settings)
                    if not enabled:
                        last_run_date = None
                        wait_for = 300
                    else:
                        now = datetime.now()
                        if _should_run(now, last_run_date, hour, minute, allowed_days):
                            try:
                                create_backup(current_app)
                                last_run_date = now.date()
                            except Exception as exc:
                                print(f"[auto_backup] Backup failed: {exc}")
                        # determine wait until next check
                        scheduled = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        if now < scheduled:
                            wait_for = max(30, min(300, int((scheduled - now).total_seconds())))
                        else:
                            wait_for = 300
                except Exception as exc:
                    print(f"[auto_backup] Scheduler error: {exc}")
                    wait_for = 300
                stop_event.wait(wait_for)

    _thread = Thread(target=_runner, name="auto-backup-service", daemon=True)
    _thread.start()


def stop_auto_backup_service():
    global _stop_event, _thread
    if _stop_event:
        _stop_event.set()
    _thread = None
