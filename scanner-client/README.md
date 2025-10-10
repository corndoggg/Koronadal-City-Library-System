# Scanner Client (Epson L3250)

This lightweight Flask service wraps the Windows Image Acquisition (WIA) API so the web app can trigger multi-page scans on an Epson L3250 (or any WIA-compatible) device and receive a merged PDF.

## Requirements

- Windows 10/11 with the Epson L3250 (or compatible) scanner drivers installed.
- Python 3.11+
- Dependencies from `requirements.txt` (`Flask`, `Flask-Cors`, `Pillow`, `pywin32`).

## Running locally

```powershell
cd scanner-client
python -m venv venv
./venv/Scripts/Activate.ps1
pip install -r requirements.txt
flask --app app run --host 0.0.0.0 --port 7070
```

> The workspace already defines a VS Code task **Run Scanner Client Flask Server** that performs these steps and keeps the service running.

## API overview

| Endpoint | Method | Description |
| --- | --- | --- |
| `/health` | GET | Basic health check. |
| `/devices` | GET | Lists available WIA scanner devices. |
| `/scan` | POST | Triggers a scan session and returns a merged PDF. |
| `/scans` | GET | Lists PDFs saved to the local `scans/` directory. |
| `/scans/<filename>` | GET | Downloads a previously saved PDF. |

### `/scan` payload

```json
{
  "pages": 1,
  "dpi": 300,
  "colorMode": "Color",
  "deviceId": "optional WIA device id",
  "useAdf": false,
  "pageSize": "A4"
}
```

The server streams the resulting PDF and exposes metadata via response headers:

- `X-Scan-Filename`
- `X-Scan-Pages`
- `X-Scan-DPI`

## Frontend integration

Set `VITE_SCANNER_BASE` in `kcls-app/.env` (defaults to `http://localhost:7070`):

```env
VITE_SCANNER_BASE=http://localhost:7070
```

In the document form modal, use the **Scan to PDF** button to acquire pages directly from the Epson L3250, preview the result, and auto-fill metadata using the existing Document AI flow.

## Building a standalone executable (PyInstaller)

The repository includes a PowerShell helper (`build-exe.ps1`) and a PyInstaller spec (`scanner-client.spec`) so you can package the scanner client into a deployable Windows executable.

```powershell
cd scanner-client
.\build-exe.ps1
```

The script will:

- Create (or reuse) a local `venv` under `scanner-client\venv`
- Install runtime dependencies from `requirements.txt`
- Install PyInstaller (if necessary)
- Build the app into `scanner-client\dist\scanner-client\scanner-client.exe`

To rebuild without reinstalling dependencies, pass `-NoInstall`. Add `-Clean` to remove `build/` and `dist/` first.

> The generated folder contains `scanner-client.exe` plus the Python runtime. Copy the entire `dist\scanner-client` directory to the target machine and run the executable from there. The service still listens on port `7070`, so ensure Windows Firewall allows inbound connections if another machine will reach it.
>
> When the packaged app launches, it runs headless and adds a tray icon (printer/scanner glyph) in the Windows notification area. Right-click the icon and choose **Exit** to stop the embedded Flask server cleanly.
