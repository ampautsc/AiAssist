# Quick integration test for Minecraft automation
# Run this from a standalone PowerShell window (not VS Code terminal)

Write-Host "Minecraft Automation Quick Test" -ForegroundColor Cyan
Write-Host "==================================`n"

# Check Minecraft is running
$mc = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if (-not $mc) {
    Write-Host "ERROR: Minecraft is not running" -ForegroundColor Red
    Write-Host "Please start Minecraft and try again"
    exit 1
}

Write-Host "OK: Minecraft is running (PID: $($mc.Id))" -ForegroundColor Green

# Activate Minecraft
Write-Host "`nActivating Minecraft..." -ForegroundColor Yellow
$wshell = New-Object -ComObject WScript.Shell
$result = $wshell.AppActivate($mc.Id)
Write-Host "   AppActivate result: $result"
Start-Sleep -Seconds 3

# Take screenshot and validate
Write-Host "`nTaking screenshot..." -ForegroundColor Yellow
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$screenshotPath = "C:\Users\ampau\source\AiAssist\AiAssist\test_minecraft_focus.png"
$bmp.Save($screenshotPath)
Write-Host "   Saved to: $screenshotPath"

# Run OCR
Write-Host "`nRunning OCR..." -ForegroundColor Yellow
$pythonPath = "C:/Users/ampau/source/AiAssist/AiAssist/.venv/Scripts/python.exe"
$scriptPath = "C:\Users\ampau\source\AiAssist\AiAssist\mcp-servers\minecraft-automation\scripts\validate_screen.py"
$detectedScreen = & $pythonPath $scriptPath $screenshotPath
Write-Host "   Detected screen: $detectedScreen" -ForegroundColor $(if ($detectedScreen -ne 'unknown') { 'Green' } else { 'Red' })

if ($detectedScreen -eq 'unknown') {
    Write-Host "`nWARNING: Minecraft may not be in focus or OCR failed" -ForegroundColor Yellow
    Write-Host "   Please check that:"
    Write-Host "   1. Minecraft is visible and maximized"
    Write-Host "   2. No other windows are in front"
    Write-Host "   3. Minecraft is on main menu, worlds list, or edit screen"
} else {
    Write-Host "`nSUCCESS: Screen detection working!" -ForegroundColor Green
    Write-Host "`nReady to run full integration tests with: npm run test:integration"
}
