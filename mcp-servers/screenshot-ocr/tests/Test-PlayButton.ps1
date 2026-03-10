# Test Play Button Location with Proper Verification
# This script tests if a coordinate is the Play button by:
# 1. Capturing "before" state (should be main menu)
# 2. Clicking the coordinate
# 3. Capturing "after" state (should be worlds list)
# 4. Using Python verification script to confirm

param(
    [int]$X = 1280,
    [int]$Y = 780
)

$ErrorActionPreference = "Stop"
$fixtureDir = "C:\Users\ampau\source\AiAssist\AiAssist\mcp-servers\screenshot-ocr\tests\fixtures"

Write-Host "`n=== Testing Play Button Coordinate ($X, $Y) ===" -ForegroundColor Cyan

# Ensure we're starting from main menu
Write-Host "Step 1: Ensuring Minecraft is on main menu..." -ForegroundColor Yellow

# Minimize VS Code, activate Minecraft
$code = @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
'@

if (-not ([System.Management.Automation.PSTypeName]'TestBtn.WinAPI').Type) {
    Add-Type -MemberDefinition $code -Name WinAPI -Namespace TestBtn
}

$vscode = Get-Process | Where-Object {$_.ProcessName -eq "Code" -and $_.MainWindowHandle -ne 0}
if ($vscode) {
    [TestBtn.WinAPI]::ShowWindow($vscode.MainWindowHandle, 6) | Out-Null
}

Start-Sleep -Milliseconds 500

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*" -and $_.MainWindowHandle -ne 0}
if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running" -ForegroundColor Red
    exit 1
}

[TestBtn.WinAPI]::ShowWindow($minecraft.MainWindowHandle, 9) | Out-Null
[TestBtn.WinAPI]::SetForegroundWindow($minecraft.MainWindowHandle) | Out-Null
Start-Sleep -Seconds 2

# Capture BEFORE state
Write-Host "Step 2: Capturing BEFORE state..." -ForegroundColor Yellow
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
$beforePath = Join-Path $fixtureDir "before_click.png"
$bitmap.Save($beforePath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "  Saved: $beforePath" -ForegroundColor Gray

# Click the coordinate
Write-Host "Step 3: Clicking coordinate ($X, $Y)..." -ForegroundColor Yellow
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($X, $Y)
Start-Sleep -Milliseconds 300

Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cData, int extraInfo);
'@ -Name Mouse -Namespace Win32Test

[Win32Test.Mouse]::mouse_event(0x0002, 0, 0, 0, 0)  # Left down
[Win32Test.Mouse]::mouse_event(0x0004, 0, 0, 0, 0)  # Left up

Start-Sleep -Seconds 3  # Wait for transition

# Capture AFTER state
Write-Host "Step 4: Capturing AFTER state..." -ForegroundColor Yellow
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
$afterPath = Join-Path $fixtureDir "after_click.png"
$bitmap.Save($afterPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "  Saved: $afterPath" -ForegroundColor Gray

# Run Python verification
Write-Host "Step 5: Running verification..." -ForegroundColor Yellow
$testScript = "C:\Users\ampau\source\AiAssist\AiAssist\mcp-servers\screenshot-ocr\tests\test_play_button.py"
$result = & C:\Python312\python.exe $testScript $X $Y 2>&1

Write-Host "`n$result" -ForegroundColor White

# Restore VS Code
if ($vscode) {
    [TestBtn.WinAPI]::ShowWindow($vscode.MainWindowHandle, 9) | Out-Null
    [TestBtn.WinAPI]::SetForegroundWindow($vscode.MainWindowHandle) | Out-Null
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ VERIFIED: Play button is at ($X, $Y)" -ForegroundColor Green
} else {
    Write-Host "`n❌ FAILED: ($X, $Y) is NOT the Play button" -ForegroundColor Red
}

exit $LASTEXITCODE
