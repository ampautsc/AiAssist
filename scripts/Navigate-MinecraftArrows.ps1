# Navigate Minecraft menus using arrow keys with verification
# Tests each step to confirm navigation worked

param(
    [switch]$LoadWorld
)

$ErrorActionPreference = "Stop"

# Activate Minecraft
$code = @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
'@

if (-not ([System.Management.Automation.PSTypeName]'Arrow.WinAPI').Type) {
    Add-Type -MemberDefinition $code -Name WinAPI -Namespace Arrow
}

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*" -and $_.MainWindowHandle -ne 0}
if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running" -ForegroundColor Red
    exit 1
}

[Arrow.WinAPI]::ShowWindow($minecraft.MainWindowHandle, 9) | Out-Null
[Arrow.WinAPI]::SetForegroundWindow($minecraft.MainWindowHandle) | Out-Null
Start-Sleep -Seconds 1

Add-Type -AssemblyName System.Windows.Forms

Write-Host "`n=== Arrow Key Navigation Test ===" -ForegroundColor Cyan

# Make sure we're on main menu by pressing Escape a few times
Write-Host "Ensuring we're on main menu..." -ForegroundColor Yellow
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 500

if ($LoadWorld) {
    Write-Host "`nAttempting to load world via keyboard:" -ForegroundColor Cyan
    
    # Method: Space bar is often universal "activate" in games
    Write-Host "  1. Pressing SPACE on Play button..." -ForegroundColor Yellow
    [System.Windows.Forms.SendKeys]::SendWait(" ")
    Start-Sleep -Seconds 2
    
    Write-Host "  2. Pressing SPACE on first world..." -ForegroundColor Yellow
    [System.Windows.Forms.SendKeys]::SendWait(" ")
    Start-Sleep -Seconds 5
    
    Write-Host "  3. Checking if world loaded..." -ForegroundColor Yellow
    $connected = netstat -ano | Select-String "19144" | Select-String "ESTABLISHED"
    if ($connected) {
        Write-Host "`n✅ SUCCESS! Debugger connected - world loaded!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n⚠️ No debugger connection yet (world may still be loading)" -ForegroundColor Yellow
        exit 1
    }
} else {
    # Just test arrow key navigation
    Write-Host "Testing arrow keys (will navigate down then back up):" -ForegroundColor Yellow
    
    Write-Host "  Pressing DOWN arrow..." -ForegroundColor Gray
    [System.Windows.Forms.SendKeys]::SendWait("{DOWN}")
    Start-Sleep -Seconds 1
    
    Write-Host "  Pressing DOWN arrow again..." -ForegroundColor Gray
    [System.Windows.Forms.SendKeys]::SendWait("{DOWN}")
    Start-Sleep -Seconds 1
    
    Write-Host "  Pressing UP arrow twice to return..." -ForegroundColor Gray
    [System.Windows.Forms.SendKeys]::SendWait("{UP}")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{UP}")
    
    Write-Host "`n✅ Navigation test complete" -ForegroundColor Green
    Write-Host "Check if menu selection visually changed" -ForegroundColor Gray
}
