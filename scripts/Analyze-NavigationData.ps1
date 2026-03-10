param(
    [string]$DataPath = "C:\Users\ampau\source\AiAssist\AiAssist\minecraft-navigation-data"
)

Add-Type -AssemblyName System.Drawing

function Get-ImageDifference {
    param([string]$Before, [string]$After)
    
    $imgBefore = [System.Drawing.Image]::FromFile($Before)
    $imgAfter = [System.Drawing.Image]::FromFile($After)
    
    $bmpBefore = New-Object System.Drawing.Bitmap $imgBefore
    $bmpAfter = New-Object System.Drawing.Bitmap $imgAfter
    
    $width = [Math]::Min($bmpBefore.Width, $bmpAfter.Width)
    $height = [Math]::Min($bmpBefore.Height, $bmpAfter.Height)
    
    $totalPixels = $width * $height
    $differentPixels = 0
    
    for ($y = 0; $y -lt $height; $y += 10) {
        for ($x = 0; $x -lt $width; $x += 10) {
            $pixelBefore = $bmpBefore.GetPixel($x, $y)
            $pixelAfter = $bmpAfter.GetPixel($x, $y)
            
            $diff = [Math]::Abs($pixelBefore.R - $pixelAfter.R) + 
                    [Math]::Abs($pixelBefore.G - $pixelAfter.G) + 
                    [Math]::Abs($pixelBefore.B - $pixelAfter.B)
            
            if ($diff -gt 30) {
                $differentPixels++
            }
        }
    }
    
    $bmpBefore.Dispose()
    $bmpAfter.Dispose()
    $imgBefore.Dispose()
    $imgAfter.Dispose()
    
    $sampledPixels = ($width / 10) * ($height / 10)
    return [Math]::Round(($differentPixels / $sampledPixels) * 100, 2)
}

function Analyze-ClickSequence {
    $navData = Get-Content "$DataPath\navigation_data.json" | ConvertFrom-Json
    $analysis = @()
    
    foreach ($click in $navData) {
        $num = $click.num
        $beforePath = "$DataPath\click_${num}_before.png"
        $afterPath = "$DataPath\click_${num}_after.png"
        
        if ((Test-Path $beforePath) -and (Test-Path $afterPath)) {
            $diffPercent = Get-ImageDifference -Before $beforePath -After $afterPath
            
            $clickInfo = [PSCustomObject]@{
                ClickNumber = $num
                Time = $click.time
                X = $click.x
                Y = $click.y
                ScreenChangePercent = $diffPercent
                ScreenRegion = Get-ScreenRegion -X $click.x -Y $click.y
                Before = Split-Path $beforePath -Leaf
                After = Split-Path $afterPath -Leaf
            }
            
            $analysis += $clickInfo
            Write-Host "Click $num at ($($click.x), $($click.y)) - ${diffPercent}% screen change - $($clickInfo.ScreenRegion)"
        }
    }
    
    return $analysis
}

function Get-ScreenRegion {
    param([int]$X, [int]$Y)
    
    # Assume 1920x1080 screen
    $screenWidth = 1920
    $screenHeight = 1080
    
    $horizontalRegion = if ($X -lt $screenWidth * 0.33) { "Left" }
                       elseif ($X -lt $screenWidth * 0.67) { "Center" }
                       else { "Right" }
    
    $verticalRegion = if ($Y -lt $screenHeight * 0.33) { "Top" }
                     elseif ($Y -lt $screenHeight * 0.67) { "Middle" }
                     else { "Bottom" }
    
    return "$verticalRegion-$horizontalRegion"
}

Write-Host "=== Minecraft Navigation Analysis ===" -ForegroundColor Cyan
Write-Host ""

$analysis = Analyze-ClickSequence

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total Clicks: $($analysis.Count)"
Write-Host "Average Screen Change: $([Math]::Round(($analysis.ScreenChangePercent | Measure-Object -Average).Average, 2))%"
Write-Host ""
Write-Host "Screen Regions Used:" -ForegroundColor Yellow
$analysis | Group-Object ScreenRegion | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) clicks"
}

# Save detailed analysis
$analysis | ConvertTo-Json | Out-File "$DataPath\navigation_analysis.json" -Encoding UTF8
Write-Host ""
Write-Host "Detailed analysis saved to navigation_analysis.json" -ForegroundColor Green
