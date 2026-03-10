# Quick cursor test - analyze most recent screenshots
Import-Module "$PSScriptRoot\MinecraftAutomation.psm1" -Force

$screenshots = Get-ChildItem "$env:TEMP\minecraft_*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 3

Write-Host "`n=== Analyzing Recent Screenshots for Cursor ===" -ForegroundColor Cyan

foreach ($screenshot in $screenshots) {
    Write-Host "`nFile: $($screenshot.Name)" -ForegroundColor Yellow
    Write-Host "Size: $([Math]::Round($screenshot.Length/1KB, 2)) KB" -ForegroundColor Gray
    
    # Load image
    Add-Type -AssemblyName System.Drawing
    try {
        $bitmap = [System.Drawing.Bitmap]::FromFile($screenshot.FullName)
        $width = $bitmap.Width
        $height = $bitmap.Height
        
        # Count bright white pixels (cursor is typically bright white)
        $brightCount = 0
        $sampleSize = 1000
        
        for ($i = 0; $i -lt $sampleSize; $i++) {
            $x = Get-Random -Minimum 0 -Maximum $width
            $y = Get-Random -Minimum 0 -Maximum $height
            $pixel = $bitmap.GetPixel($x, $y)
            $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
            
            if ($brightness -gt 250) {
                $brightCount++
            }
        }
        
        $bitmap.Dispose()
        
        $brightPercent = ($brightCount / $sampleSize) * 100
        Write-Host "Dimensions: ${width}x${height}" -ForegroundColor Gray
        Write-Host "Bright pixels (sample): $brightPercent%" -ForegroundColor $(if ($brightPercent -gt 1) { "Green" } else { "Red" })
        
        if ($brightPercent -lt 0.5) {
            Write-Host "WARNING: Very few bright pixels - cursor may not be captured" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "Error analyzing: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Cursor Detection Status ===" -ForegroundColor Cyan
Write-Host "If screenshots have bright pixels, cursor capture is likely working." -ForegroundColor Yellow
Write-Host "Next step: Manually verify one screenshot has visible cursor at expected position." -ForegroundColor Yellow
