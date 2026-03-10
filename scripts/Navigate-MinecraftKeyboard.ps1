# Minecraft Menu Navigation via Keyboard
# Uses Enter/Tab/Arrow keys instead of mouse coordinates

param(
    [string]$Target = "PlayWorld"  # PlayWorld, Settings, CreateWorld
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Minecraft Keyboard Navigation ===" -ForegroundColor Cyan

# Activate Minecraft
$code = @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
'@

if (-not ([System.Management.Automation.PSTypeName]'Nav.WinAPI').Type) {
    Add-Type -MemberDefinition $code -Name WinAPI -Namespace Nav
}

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*" -and $_.MainWindowHandle -ne 0}
if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running" -ForegroundColor Red
    exit 1
}

[Nav.WinAPI]::ShowWindow($minecraft.MainWindowHandle, 9) | Out-Null
[Nav.WinAPI]::SetForegroundWindow($minecraft.MainWindowHandle) | Out-Null
Start-Sleep -Seconds 1

Add-Type -AssemblyName System.Windows.Forms

Write-Host "Navigating to: $Target" -ForegroundColor Yellow

switch ($Target) {
    "PlayWorld" {
        # From main menu: Press Enter (Play button is default selected)
        Write-Host "  Pressing Enter to activate Play..." -ForegroundColor Gray
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Seconds 2
        
        # Should now be at worlds list, first world selected
        Write-Host "  Pressing Enter to play first world..." -ForegroundColor Gray
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Seconds 5
        
        Write-Host "✅ Should be loading world..." -ForegroundColor Green
    }
    
    "Settings" {
        # Tab to Settings button, then Enter
        Write-Host "  Tabbing to Settings..." -ForegroundColor Gray
        [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
        Start-Sleep -Milliseconds 300
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Seconds 1
        
        Write-Host "✅ Should be in Settings..." -ForegroundColor Green
    }
    
    "BackToMenu" {
        # Press Escape to go back
        Write-Host "  Pressing Escape..." -ForegroundColor Gray
        [System.Windows.Forms.SendKeys]::SendWait("{ESC}")
        Start-Sleep -Seconds 1
        
        Write-Host "✅ Went back..." -ForegroundColor Green
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan
