param(
    [switch]$Clean,
    [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$venvPath = Join-Path $projectRoot 'venv'
$scriptsPath = Join-Path $venvPath 'Scripts'
$pip = Join-Path $scriptsPath 'pip.exe'
$pyInstaller = Join-Path $scriptsPath 'pyinstaller.exe'

if (-not (Test-Path $venvPath)) {
    Write-Host 'Creating virtual environment...' -ForegroundColor Cyan
    python -m venv $venvPath
}

if (-not $NoInstall) {
    Write-Host 'Installing runtime dependencies...' -ForegroundColor Cyan
    & $pip install --upgrade pip
    & $pip install -r (Join-Path $projectRoot 'requirements.txt')
    & $pip install pyinstaller
}

if ($Clean) {
    Write-Host 'Cleaning previous build artifacts...' -ForegroundColor Yellow
    Get-ChildItem (Join-Path $projectRoot 'build') -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
    Get-ChildItem (Join-Path $projectRoot 'dist') -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
}

$specPath = Join-Path $projectRoot 'scanner-client.spec'
if (-not (Test-Path $specPath)) {
    Write-Error 'Spec file not found. Expected scanner-client.spec next to build script.'
}

Write-Host 'Running PyInstaller...' -ForegroundColor Cyan
& $pyInstaller --clean --noconfirm $specPath

Write-Host 'Build complete. Executable is located in:' -ForegroundColor Green
Write-Host "  $($projectRoot)\dist\scanner-client\scanner-client.exe"
