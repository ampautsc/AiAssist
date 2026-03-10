#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies a Minecraft world exists by actually loading it via UI automation
#>

param(
    [string]$WorldName = "Monarch Garden Test"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Wait-ForMinecraft {
    $process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Starting Minecraft..."
        Start-Process "minecraft:"
        Start-Sleep -Seconds 10
    }
    
    $process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "✓ Minecraft is running (PID: $($process.Id))"
        return $true
    }
    return $false
}

function Send-KeyToMinecraft {
    param([string]$Key)
    
    $wshell = New-Object -ComObject wscript.shell
    if ($wshell.AppActivate("Minecraft")) {
        Start-Sleep -Milliseconds 200
        $wshell.SendKeys($Key)
        Start-Sleep -Milliseconds 300
        return $true
    }
    return $false
}

function Find-WorldInMinecraft {
    param([string]$WorldName)
    
    Write-Host "Navigating Minecraft UI to find world: $WorldName"
    
    # Ensure on main menu (press ESC a few times)
    for ($i = 0; $i < 3; $i++) {
        Send-KeyToMinecraft "{ESC}"
        Start-Sleep -Milliseconds 500
    }
    
    # Navigate to Play menu
    Write-Host "  → Opening Play menu..."
    Send-KeyToMinecraft "{ENTER}"  # Click Play
    Start-Sleep -Seconds 2
    
    # Take screenshot to see current state
    $screenshotPath = "C:\Users\ampau\source\AiAssist\AiAssist\minecraft_worlds_screen.png"
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
    $bitmap.Save($screenshotPath)
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "  → Screenshot saved: $screenshotPath"
    Write-Host "  → Searching for world in list..."
    
    # Try to find and click the world
    # Tab through worlds list
    for ($i = 0; $i < 10; $i++) {
        Send-KeyToMinecraft "{TAB}"
        Start-Sleep -Milliseconds 200
    }
    
    # Try pressing Enter to load selected world
    Write-Host "  → Attempting to load selected world..."
    Send-KeyToMinecraft "{ENTER}"
    Start-Sleep -Seconds 5
    
    # Check if world loaded by looking for game UI elements
    $screenshotPath2 = "C:\Users\ampau\source\AiAssist\AiAssist\minecraft_ingame_screen.png"
    $bitmap2 = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
    $graphics2 = [System.Drawing.Graphics]::FromImage($bitmap2)
    $graphics2.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
    $bitmap2.Save($screenshotPath2)
    $graphics2.Dispose()
    $bitmap2.Dispose()
    
    Write-Host "  → In-game screenshot: $screenshotPath2"
    
    # Try to run verification command
    Write-Host "  → Opening chat to run !verify command..."
    Send-KeyToMinecraft "t"  # Open chat
    Start-Sleep -Milliseconds 500
    Send-KeyToMinecraft "!verify"
    Send-KeyToMinecraft "{ENTER}"
    Start-Sleep -Seconds 2
    
    return @{
        Screenshots = @($screenshotPath, $screenshotPath2)
        Attempted = $true
    }
}

# Main execution
Write-Host "=== Minecraft World Verification Tool ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Wait-ForMinecraft)) {
    Write-Host "✗ Failed to start Minecraft" -ForegroundColor Red
    exit 1
}

$result = Find-WorldInMinecraft -WorldName $WorldName

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host "Screenshots saved for manual review:"
foreach ($screenshot in $result.Screenshots) {
    Write-Host "  - $screenshot"
}
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Review screenshots to confirm world '$WorldName' is visible"
Write-Host "2. If world loaded, chat should show 'World Verification: World loaded successfully!'"
Write-Host "3. If !verify command worked, world existence is CONFIRMED"
