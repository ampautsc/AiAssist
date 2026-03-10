# Simple cursor capture test using precompiled C# class
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Load C# class if not already loaded
if (-not [type]::GetType("ScreenCapture")) {
    Add-Type -Path "$PSScriptRoot\ScreenCapture.cs"
}

# Get Minecraft
$process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
if (-not $process) {
    Write-Host "Minecraft not running" -ForegroundColor Red
    exit 1
}

$hwnd = $process.MainWindowHandle

# Get window position
$rect = New-Object WindowRect
[ScreenCapture]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
[ScreenCapture]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 300

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

Write-Host "Window: ${width}x${height} at ($($rect.Left), $($rect.Top))" -ForegroundColor Cyan

# Capture screenshot
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)

# Get cursor and draw it
$cursorInfo = New-Object CursorInfo
$cursorInfo.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf([Type][CursorInfo])

if ([ScreenCapture]::GetCursorInfo([ref]$cursorInfo)) {
    Write-Host "Cursor flags: $($cursorInfo.flags)" -ForegroundColor Gray
    Write-Host "Cursor position: ($($cursorInfo.ptScreenPos.X), $($cursorInfo.ptScreenPos.Y))" -ForegroundColor Gray
    
    if ($cursorInfo.flags -eq [ScreenCapture]::CURSOR_SHOWING) {
        $cursorX = $cursorInfo.ptScreenPos.X - $rect.Left
        $cursorY = $cursorInfo.ptScreenPos.Y - $rect.Top
        
        Write-Host "Drawing cursor at relative position: ($cursorX, $cursorY)" -ForegroundColor Yellow
        
        $hdc = $graphics.GetHdc()
        $result = [ScreenCapture]::DrawIconEx($hdc, $cursorX, $cursorY, $cursorInfo.hCursor, 0, 0, 0, [IntPtr]::Zero, [ScreenCapture]::DI_NORMAL)
        $graphics.ReleaseHdc($hdc)
        
        if ($result) {
            Write-Host "DrawIconEx SUCCESS" -ForegroundColor Green
        } else {
            Write-Host "DrawIconEx FAILED" -ForegroundColor Red
        }
    } else {
        Write-Host "Cursor not showing" -ForegroundColor Red
    }
} else {
    Write-Host "GetCursorInfo failed" -ForegroundColor Red
}

# Save
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$path = "$env:TEMP\minecraft_simple_$timestamp.png"
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Host "`nScreenshot saved: $path" -ForegroundColor Green

# Open briefly
Start-Process $path
Start-Sleep -Seconds 3
Get-Process | Where-Object { $_.MainWindowTitle -like "*minecraft_simple*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Check if cursor was visible in the screenshot" -ForegroundColor Yellow
