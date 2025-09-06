from __future__ import annotations

import platform
import socket
import time
from datetime import datetime

import psutil


def _bytes(n: int | float | None) -> int:
    return int(n or 0)


def _bytes_human(n: int | float | None) -> str:
    n = float(n or 0)
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    while n >= 1024 and i < len(units) - 1:
        n /= 1024.0
        i += 1
    return f"{n:.2f} {units[i]}"


def get_cpu(interval: float = 0.1) -> dict:
    """
    interval: seconds to sample CPU percent. Use 0 for instantaneous (may be 0 on first call).
    """
    try:
        freq = psutil.cpu_freq()  # may be None on some systems
    except Exception:
        freq = None

    try:
        per_core = psutil.cpu_percent(interval=interval, percpu=True)
        total = sum(per_core) / max(1, len(per_core))
    except Exception:
        per_core = []
        total = psutil.cpu_percent(interval=interval)

    return {
        "model": platform.processor(),
        "physical_cores": psutil.cpu_count(logical=False) or 0,
        "logical_cores": psutil.cpu_count(logical=True) or 0,
        "frequency_mhz": {
            "current": getattr(freq, "current", None),
            "min": getattr(freq, "min", None),
            "max": getattr(freq, "max", None),
        } if freq else None,
        "usage": {
            "total_percent": round(total, 2),
            "per_core_percent": [round(x, 2) for x in per_core] if per_core else None,
        },
    }


def get_memory() -> dict:
    vm = psutil.virtual_memory()
    sm = psutil.swap_memory()
    return {
        "ram": {
            "total": _bytes(vm.total),
            "available": _bytes(vm.available),
            "used": _bytes(vm.used),
            "percent": round(vm.percent, 2),
            "human": {
                "total": _bytes_human(vm.total),
                "available": _bytes_human(vm.available),
                "used": _bytes_human(vm.used),
            },
        },
        "swap": {
            "total": _bytes(sm.total),
            "used": _bytes(sm.used),
            "free": _bytes(sm.free),
            "percent": round(sm.percent, 2),
            "human": {
                "total": _bytes_human(sm.total),
                "used": _bytes_human(sm.used),
                "free": _bytes_human(sm.free),
            },
        },
    }


def get_disks() -> dict:
    parts = []
    try:
        for p in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(p.mountpoint)
            except PermissionError:
                usage = None
            except Exception:
                usage = None

            parts.append({
                "device": p.device,
                "mountpoint": p.mountpoint,
                "fstype": p.fstype,
                "opts": p.opts,
                "usage": None if usage is None else {
                    "total": _bytes(usage.total),
                    "used": _bytes(usage.used),
                    "free": _bytes(usage.free),
                    "percent": round(usage.percent, 2),
                    "human": {
                        "total": _bytes_human(usage.total),
                        "used": _bytes_human(usage.used),
                        "free": _bytes_human(usage.free),
                    },
                },
            })
    except Exception:
        parts = []

    io_counters = psutil.disk_io_counters(perdisk=False)  # aggregate
    disk_io = None
    if io_counters:
        disk_io = {
            "read_bytes": _bytes(io_counters.read_bytes),
            "write_bytes": _bytes(io_counters.write_bytes),
            "read_count": io_counters.read_count,
            "write_count": io_counters.write_count,
            "human": {
                "read_bytes": _bytes_human(io_counters.read_bytes),
                "write_bytes": _bytes_human(io_counters.write_bytes),
            }
        }

    return {
        "partitions": parts,
        "io": disk_io,
    }


def get_network(sample_seconds: float = 0.0) -> dict:
    """
    Returns per-interface stats and totals.
    If sample_seconds > 0, measures simple throughput over that period.
    """
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    io0 = psutil.net_io_counters(pernic=True)
    total0 = psutil.net_io_counters(pernic=False)

    if sample_seconds and sample_seconds > 0:
        time.sleep(sample_seconds)
        io1 = psutil.net_io_counters(pernic=True)
        total1 = psutil.net_io_counters(pernic=False)
    else:
        io1 = io0
        total1 = total0
        sample_seconds = 1.0  # avoid division by zero for "per_sec" fields

    interfaces = []
    for name, s in stats.items():
        nic0 = io0.get(name)
        nic1 = io1.get(name)
        if nic0 and nic1:
            rx_bps = (nic1.bytes_recv - nic0.bytes_recv) / sample_seconds
            tx_bps = (nic1.bytes_sent - nic0.bytes_sent) / sample_seconds
        else:
            rx_bps = tx_bps = 0.0

        ip4, ip6, mac = None, None, None
        for a in addrs.get(name, []):
            if a.family.name == "AF_LINK" or str(a.family) == "AddressFamily.AF_PACKET":
                mac = a.address
            elif a.family.name == "AF_INET":
                ip4 = a.address
            elif a.family.name == "AF_INET6":
                ip6 = a.address

        interfaces.append({
            "name": name,
            "isup": s.isup,
            "speed_mbps": getattr(s, "speed", 0),  # may be 0 if unknown
            "mtu": getattr(s, "mtu", None),
            "addresses": {"ipv4": ip4, "ipv6": ip6, "mac": mac},
            "bytes": {
                "sent": _bytes(nic1.bytes_sent if nic1 else 0),
                "recv": _bytes(nic1.bytes_recv if nic1 else 0),
                "human": {
                    "sent": _bytes_human(nic1.bytes_sent if nic1 else 0),
                    "recv": _bytes_human(nic1.bytes_recv if nic1 else 0),
                }
            },
            "throughput_per_sec": {
                "tx_bps": int(tx_bps),
                "rx_bps": int(rx_bps),
                "human": {
                    "tx": f"{tx_bps/1024/1024:.2f} MB/s",
                    "rx": f"{rx_bps/1024/1024:.2f} MB/s",
                }
            }
        })

    total_rx_bps = (total1.bytes_recv - total0.bytes_recv) / sample_seconds if total0 and total1 else 0.0
    total_tx_bps = (total1.bytes_sent - total0.bytes_sent) / sample_seconds if total0 and total1 else 0.0

    return {
        "hostname": socket.gethostname(),
        "interfaces": interfaces,
        "total": {
            "bytes": {
                "sent": _bytes(total1.bytes_sent if total1 else 0),
                "recv": _bytes(total1.bytes_recv if total1 else 0),
                "human": {
                    "sent": _bytes_human(total1.bytes_sent if total1 else 0),
                    "recv": _bytes_human(total1.bytes_recv if total1 else 0),
                }
            },
            "throughput_per_sec": {
                "tx_bps": int(total_tx_bps),
                "rx_bps": int(total_rx_bps),
                "human": {
                    "tx": f"{total_tx_bps/1024/1024:.2f} MB/s",
                    "rx": f"{total_rx_bps/1024/1024:.2f} MB/s",
                }
            }
        }
    }


def get_system() -> dict:
    try:
        boot_ts = psutil.boot_time()
    except Exception:
        boot_ts = None

    return {
        "os": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "boot_time": boot_ts,
        "boot_time_iso": datetime.fromtimestamp(boot_ts).isoformat() if boot_ts else None,
        "hostname": socket.gethostname(),
    }


def snapshot(cpu_interval: float = 0.1, net_sample: float = 0.0) -> dict:
    """
    Single call to fetch all metrics.
    cpu_interval: sampling time for CPU load percentage.
    net_sample: if > 0, compute simple network throughput over that window.
    """
    return {
        "timestamp": int(time.time()),
        "timestamp_iso": datetime.utcnow().isoformat() + "Z",
        "system": get_system(),
        "cpu": get_cpu(interval=cpu_interval),
        "memory": get_memory(),
        "disks": get_disks(),
        "network": get_network(sample_seconds=net_sample),
    }