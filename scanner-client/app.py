import logging
import threading
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, cast

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image
from werkzeug.serving import make_server

try:  # pragma: no cover - platform specific
    import pythoncom  # type: ignore
    import win32api  # type: ignore
    import win32con  # type: ignore
    import win32gui  # type: ignore
    import win32gui_struct  # type: ignore
    from win32com import client as win32_client  # type: ignore
except ImportError as exc:  # pragma: no cover - platform specific
    pythoncom = None  # type: ignore
    win32_client = None  # type: ignore
    win32api = None  # type: ignore
    win32con = None  # type: ignore
    win32gui = None  # type: ignore
    win32gui_struct = None  # type: ignore
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


ROOT_DIR = Path(__file__).resolve().parent
SCAN_OUTPUT_DIR = ROOT_DIR / "scans"
SCAN_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger("scanner-client")


class ScannerError(Exception):
    """Custom exception raised for scanner related issues."""


class WIAScannerService:
    """Small helper that wraps Windows Image Acquisition to control flatbed/ADF scanners."""

    PAGE_SIZES: Dict[str, Tuple[float, float]] = {
        "A4": (8.27, 11.69),
        "Letter": (8.5, 11.0),
        "Legal": (8.5, 14.0),
    }

    COLOR_INTENTS: Dict[str, int] = {}
    DEFAULT_INTENTS = {
        "Color": 0x00000001,
        "Grayscale": 0x00000002,
        "Text": 0x00000004,
        "BlackWhite": 0x00000004,
    }
    DEFAULT_FEEDER = 0x00000080  # wiaItemTypeAutoFeed
    DEFAULT_FLATBED = 0x00000004  # wiaItemTypeFlatbed

    def __init__(self) -> None:
        # `win32com.client.constants` is populated lazily. We cache it once we have COM available.
        self.constants = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def list_devices(self) -> List[Dict[str, Optional[str]]]:
        pycom, win32 = self._ensure_platform()
        pycom.CoInitialize()
        try:
            manager = win32.Dispatch("WIA.DeviceManager")
            devices: List[Dict[str, Optional[str]]] = []
            for index in range(1, manager.DeviceInfos.Count + 1):
                info = manager.DeviceInfos.Item(index)
                # 1 == Scanner, 2 == Camera
                if getattr(info, "Type", None) != 1:
                    continue
                props = self._properties_to_dict(info.Properties)
                devices.append(
                    {
                        "id": getattr(info, "DeviceID", ""),
                        "name": props.get("Name") or props.get("Description") or "Unknown Scanner",
                        "description": props.get("Description"),
                        "port_name": props.get("PortName"),
                        "server": props.get("ServerName"),
                        "driver_version": props.get("DriverVersion"),
                        "manufacturer": props.get("Manufacturer"),
                    }
                )
            return devices
        finally:
            pycom.CoUninitialize()

    def scan_to_pdf(
        self,
        output_path: Path,
        *,
        device_id: Optional[str] = None,
        pages: int = 1,
        dpi: int = 300,
        color_mode: str = "Color",
        page_size: str = "A4",
        use_adf: bool = False,
    ) -> Dict[str, int]:
        pycom, win32 = self._ensure_platform()
        if pages <= 0:
            raise ScannerError("`pages` must be greater than zero")
        if dpi < 75 or dpi > 1200:
            raise ScannerError("`dpi` must be between 75 and 1200")

        with self._lock:
            pycom.CoInitialize()
            try:
                device = self._connect_device(device_id, win32)
                item = self._get_scan_item(device)
                constants = self._ensure_constants(win32)
                self._configure_item(
                    item,
                    dpi=dpi,
                    color_mode=color_mode,
                    page_size=page_size,
                    use_adf=use_adf,
                    constants=constants,
                )

                image_paths = self._acquire_images(item, pages=pages, constants=constants, win32=win32)
                total_pages = len(image_paths)
                if not total_pages:
                    raise ScannerError("No pages were captured from the scanner")

                self._images_to_pdf(image_paths, output_path)
                return {"pages": total_pages}
            finally:
                pycom.CoUninitialize()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _ensure_constants(self, win32):
        if self.constants is None:
            # Dispatching any WIA object ensures constants are registered.
            win32.Dispatch("WIA.CommonDialog")
            self.constants = win32.constants
            self.COLOR_INTENTS = {
                "Color": getattr(self.constants, "wiaImageIntentColor", self.DEFAULT_INTENTS["Color"]),
                "Grayscale": getattr(self.constants, "wiaImageIntentGrayscale", self.DEFAULT_INTENTS["Grayscale"]),
                "Text": getattr(self.constants, "wiaImageIntentText", self.DEFAULT_INTENTS["Text"]),
                "BlackWhite": getattr(self.constants, "wiaImageIntentText", self.DEFAULT_INTENTS["BlackWhite"]),
            }
        return self.constants

    def _connect_device(self, device_id: Optional[str], win32):
        manager = win32.Dispatch("WIA.DeviceManager")
        candidates = []
        for index in range(1, manager.DeviceInfos.Count + 1):
            info = manager.DeviceInfos.Item(index)
            if getattr(info, "Type", None) != 1:
                continue
            if device_id and info.DeviceID == device_id:
                logger.info("Using requested device %s", device_id)
                return info.Connect()
            candidates.append(info)
        if device_id:
            raise ScannerError(f"Scanner with device_id '{device_id}' was not found")
        if not candidates:
            raise ScannerError("No WIA scanner devices were detected")
        logger.info("Falling back to first available scanner: %s", candidates[0].DeviceID)
        return candidates[0].Connect()

    def _get_scan_item(self, device):
        items = getattr(device, "Items", None)
        if items is None:
            raise ScannerError("Connected scanner returned no items to scan")

        count = getattr(items, "Count", 0) or 0
        # WIA collections are 1-based; try direct access first.
        try:
            first = items.Item(1)
            if first:
                return first
        except Exception:  # noqa: BLE001
            logger.debug("Primary WIA item access via Item(1) failed; falling back to iteration")

        for idx in range(1, count + 1):
            try:
                candidate = items.Item(idx)
                if candidate is not None:
                    return candidate
            except Exception:  # noqa: BLE001
                logger.debug("Unable to access WIA item at index %s", idx)
                continue

        raise ScannerError("Scanner exposes no accessible items for acquisition")

    def _configure_item(
        self,
        item,
        *,
        dpi: int,
        color_mode: str,
        page_size: str,
        use_adf: bool,
        constants,
    ) -> None:
        props = item.Properties

        # Resolution
        self._set_property(props, 6147, dpi)  # WIA_IPS_XRES
        self._set_property(props, 6148, dpi)  # WIA_IPS_YRES

        # Scanning area based on page size (convert inches → pixels)
        width_in, height_in = self.PAGE_SIZES.get(page_size, self.PAGE_SIZES["A4"])
        width_px = int(width_in * dpi)
        height_px = int(height_in * dpi)
        self._set_property(props, 6151, width_px)   # WIA_IPS_XEXTENT
        self._set_property(props, 6152, height_px)  # WIA_IPS_YEXTENT
        self._set_property(props, 6149, 0)          # WIA_IPS_XPOS (offset)
        self._set_property(props, 6150, 0)          # WIA_IPS_YPOS

        intent = self.COLOR_INTENTS.get(color_mode) or self.DEFAULT_INTENTS.get(color_mode, self.DEFAULT_INTENTS["Color"])
        self._set_property(props, 6146, intent)  # WIA_IPS_CUR_INTENT

        # Attempt to configure feeder/flatbed selection when supported
        feeder = getattr(constants, "wiaItemTypeAutoFeed", self.DEFAULT_FEEDER)
        flatbed = getattr(constants, "wiaItemTypeFlatbed", self.DEFAULT_FLATBED)
        self._set_property(props, 3087, feeder if use_adf else flatbed)

    def _acquire_images(self, item, *, pages: int, constants, win32) -> List[Path]:
        dialog = win32.Dispatch("WIA.CommonDialog")
        temp_dir = Path(tempfile.mkdtemp(prefix="wia_scan_"))
        captured: List[Path] = []
        try:
            for page_index in range(pages):
                logger.info("Starting scan for page %s", page_index + 1)
                try:
                    image = dialog.ShowTransfer(item, constants.wiaFormatBMP)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Failed acquiring page %s", page_index + 1)
                    if not captured:
                        raise ScannerError(str(exc)) from exc
                    break

                page_path = temp_dir / f"page_{page_index + 1:02d}.bmp"
                image.SaveFile(str(page_path))
                captured.append(page_path)
                logger.info("Captured page %s → %s", page_index + 1, page_path)

                # If the feeder runs out mid-way, WIA raises an error on next iteration.
            return captured
        except Exception:
            # On unexpected failure, clean up before bubbling up.
            for path in captured:
                try:
                    path.unlink(missing_ok=True)
                except Exception:  # noqa: BLE001
                    pass
            try:
                temp_dir.rmdir()
            except Exception:  # noqa: BLE001
                pass
            raise

    @staticmethod
    def _images_to_pdf(image_paths: List[Path], output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pdf_pages: List[Image.Image] = []
        for path in image_paths:
            with Image.open(path) as img:
                rgb = img.convert("RGB")
                pdf_pages.append(rgb.copy())
            try:
                path.unlink(missing_ok=True)
            except Exception:  # noqa: BLE001
                logger.warning("Unable to delete temporary file %s", path)
        if image_paths:
            try:
                image_paths[0].parent.rmdir()
            except Exception:  # noqa: BLE001
                pass
        first, *rest = pdf_pages
        first.save(str(output_path), "PDF", save_all=bool(rest), append_images=rest)
        logger.info("Saved merged PDF → %s", output_path)

    @staticmethod
    def _set_property(properties, property_id: int, value) -> None:
        for prop in properties:
            if getattr(prop, "PropertyID", None) == property_id:
                try:
                    prop.Value = value
                except Exception:  # noqa: BLE001
                    logger.debug("Property %s refused value %s", property_id, value)
                return

    @staticmethod
    def _properties_to_dict(properties) -> Dict[str, Optional[str]]:
        data: Dict[str, Optional[str]] = {}
        for prop in properties:
            name = getattr(prop, "Name", None)
            value = getattr(prop, "Value", None)
            if name:
                data[name] = value
        return data

    @staticmethod
    def _ensure_platform() -> Tuple[Any, Any]:
        if IMPORT_ERROR is not None or pythoncom is None or win32_client is None:
            raise ScannerError(
                "The scanner client requires Windows with WIA support (pywin32). "
                f"Import error: {IMPORT_ERROR}"
            )
        return pythoncom, win32_client


scanner_service = WIAScannerService()
app = Flask(__name__)
CORS(app)


class FlaskServerThread(threading.Thread):
    """Run the Flask app inside a background thread so the UI can stay responsive."""

    def __init__(self, flask_app: Flask, host: str = "0.0.0.0", port: int = 7070) -> None:
        super().__init__(daemon=True)
        self._app = flask_app
        self.host = host
        self.port = port
        self._server = None
        self._started = threading.Event()
        self._stopped = threading.Event()
        self.error: Optional[Exception] = None

    def run(self) -> None:  # pragma: no cover - runtime integration
        try:
            self._server = make_server(self.host, self.port, self._app)
            self._started.set()
            logger.info("Scanner client listening on %s:%s", self.host, self.port)
            self._server.serve_forever()
        except Exception as exc:  # noqa: BLE001
            self.error = exc
            logger.exception("Scanner client server failed: %s", exc)
            self._started.set()
        finally:
            if self._server is not None:
                try:
                    self._server.server_close()
                except Exception:  # noqa: BLE001
                    pass
            self._stopped.set()

    def wait_started(self, timeout: Optional[float] = None) -> bool:
        return self._started.wait(timeout)

    def shutdown(self) -> None:
        if self._server is not None:
            try:
                logger.info("Stopping scanner client server...")
                self._server.shutdown()
            except Exception:  # noqa: BLE001
                pass
        else:
            self._stopped.set()
        self._stopped.wait(timeout=5)


class TrayApplication:
    """Minimal Windows system-tray integration to control the background server."""

    CMD_EXIT = 1025
    TRAY_EVENT = (win32con.WM_USER + 1) if win32con is not None else 0

    def __init__(self, server_thread: FlaskServerThread, tooltip: str = "Scanner Client") -> None:
        if not self.is_supported():
            raise RuntimeError("System tray integration is unavailable on this platform.")
        self.server_thread = server_thread
        self.tooltip = tooltip[:127]
        self.hwnd: Optional[int] = None
        self._notify_id = None
        self._shutting_down = False
        self._gui = cast(Any, win32gui)
        self._con = cast(Any, win32con)
        self._api = cast(Any, win32api)

    @staticmethod
    def is_supported() -> bool:
        return all(module is not None for module in (win32api, win32con, win32gui))

    def run(self) -> None:  # pragma: no cover - UI loop
        message_map = {
            self._con.WM_DESTROY: self._on_destroy,
            self._con.WM_COMMAND: self._on_command,
            self.TRAY_EVENT: self._on_tray_notify,
        }

        window_class = self._gui.WNDCLASS()
        hinstance = self._api.GetModuleHandle(None)
        class_name = "ScannerClientTray"
        window_class.hInstance = hinstance
        window_class.lpszClassName = class_name
        window_class.lpfnWndProc = message_map

        try:
            self._gui.RegisterClass(window_class)
        except self._gui.error:  # noqa: BLE001
            pass

        self.hwnd = self._gui.CreateWindow(
            class_name,
            "Scanner Client",
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            hinstance,
            None,
        )

        self._add_icon()
        self._gui.UpdateWindow(self.hwnd)
        logger.info("Scanner client running in system tray – right-click the icon to exit.")
        self._gui.PumpMessages()

    def _add_icon(self) -> None:
        if self.hwnd is None:
            return
        icon_handle = self._gui.LoadIcon(0, self._con.IDI_APPLICATION)
        flags = self._gui.NIF_ICON | self._gui.NIF_MESSAGE | self._gui.NIF_TIP
        notify_id = (self.hwnd, 0, flags, self.TRAY_EVENT, icon_handle, self.tooltip)
        self._gui.Shell_NotifyIcon(self._gui.NIM_ADD, notify_id)
        self._notify_id = notify_id

    def _remove_icon(self) -> None:
        if self._notify_id is not None:
            try:
                self._gui.Shell_NotifyIcon(self._gui.NIM_DELETE, self._notify_id)
            except Exception:  # noqa: BLE001
                pass
            self._notify_id = None

    def _on_tray_notify(self, hwnd, msg, wparam, lparam):  # noqa: D401, ANN001, ANN002, ANN003
        if lparam == self._con.WM_RBUTTONUP:
            self._show_menu()
        elif lparam == self._con.WM_LBUTTONDBLCLK:
            self._quit()
        return True

    def _show_menu(self) -> None:
        if self.hwnd is None:
            return
        menu = self._gui.CreatePopupMenu()
        self._gui.AppendMenu(menu, self._con.MF_STRING, self.CMD_EXIT, "Exit")
        current_pos = self._gui.GetCursorPos()
        self._gui.SetForegroundWindow(self.hwnd)
        self._gui.TrackPopupMenu(
            menu,
            self._con.TPM_LEFTALIGN | self._con.TPM_BOTTOMALIGN | self._con.TPM_RIGHTBUTTON,
            current_pos[0],
            current_pos[1],
            0,
            self.hwnd,
            None,
        )
        self._gui.DestroyMenu(menu)

    def _on_command(self, hwnd, msg, wparam, lparam):  # noqa: D401, ANN001, ANN002, ANN003
        command_id = self._api.LOWORD(wparam)
        if command_id == self.CMD_EXIT:
            self._quit()
        return True

    def _quit(self) -> None:
        if self._shutting_down or self.hwnd is None:
            return
        self._shutting_down = True
        self.server_thread.shutdown()
        self._gui.DestroyWindow(self.hwnd)

    def _on_destroy(self, hwnd, msg, wparam, lparam):  # noqa: D401, ANN001, ANN002, ANN003
        self._remove_icon()
        self._gui.PostQuitMessage(0)
        return True


def _json_error(message: str, status: int = 400):
    payload = {"error": message, "status": status}
    return jsonify(payload), status


@app.get("/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@app.get("/status")
def status():
    return health()


@app.get("/devices")
def devices():
    try:
        device_list = scanner_service.list_devices()
        return jsonify({"devices": device_list})
    except ScannerError as exc:
        return _json_error(str(exc), status=404)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error listing devices")
        return _json_error(str(exc), status=500)


@app.post("/scan")
def scan():
    try:
        payload = request.get_json(silent=True) or {}
        device_id = payload.get("deviceId")
        pages = int(payload.get("pages") or 1)
        dpi = int(payload.get("dpi") or 300)
        color_mode = str(payload.get("colorMode") or "Color")
        page_size = str(payload.get("pageSize") or "A4")
        use_adf = bool(payload.get("useAdf") or False)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = payload.get("filename") or f"scan_{timestamp}.pdf"
        safe_name = filename.replace("/", "-").replace("\\", "-")
        output_path = SCAN_OUTPUT_DIR / safe_name

        result = scanner_service.scan_to_pdf(
            output_path,
            device_id=device_id,
            pages=pages,
            dpi=dpi,
            color_mode=color_mode,
            page_size=page_size,
            use_adf=use_adf,
        )

        response = send_file(
            output_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=safe_name,
        )
        response.headers["X-Scan-Filename"] = safe_name
        response.headers["X-Scan-Pages"] = str(result["pages"])
        response.headers["X-Scan-DPI"] = str(dpi)
        return response
    except ScannerError as exc:
        return _json_error(str(exc), status=400)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error while scanning")
        return _json_error("Scanner service fault: " + str(exc), status=500)


@app.get("/scans")
def list_scans():
    files = []
    for path in sorted(SCAN_OUTPUT_DIR.glob("*.pdf"), reverse=True):
        files.append(
            {
                "filename": path.name,
                "size_bytes": path.stat().st_size,
                "created_at": datetime.fromtimestamp(path.stat().st_ctime).isoformat(),
            }
        )
    return jsonify({"files": files})


@app.get("/scans/<path:filename>")
def download_scan(filename: str):
    safe_name = filename.replace("/", "-")
    pdf_path = SCAN_OUTPUT_DIR / safe_name
    if not pdf_path.exists():
        return _json_error("Requested scan was not found", status=404)
    return send_file(pdf_path, mimetype="application/pdf", as_attachment=True, download_name=safe_name)


def main() -> None:  # pragma: no cover - entrypoint
    host = "0.0.0.0"
    port = 7070
    server_thread = FlaskServerThread(app, host=host, port=port)
    server_thread.start()
    if not server_thread.wait_started(timeout=5):
        server_thread.shutdown()
        server_thread.join(timeout=5)
        if server_thread.error is not None:
            raise RuntimeError("Failed to start scanner client") from server_thread.error
        raise RuntimeError("Scanner client failed to initialise within timeout")

    if TrayApplication.is_supported():
        tray = TrayApplication(server_thread, tooltip=f"Scanner Client (port {port})")
        try:
            tray.run()
        finally:
            server_thread.shutdown()
            server_thread.join(timeout=5)
    else:
        logger.warning("System tray unavailable – keeping server running in background.")
        try:
            server_thread.join()
        except KeyboardInterrupt:
            server_thread.shutdown()
            server_thread.join(timeout=5)


if __name__ == "__main__":
    main()
