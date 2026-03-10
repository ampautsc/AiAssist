# Simple text scanner - looks for text-like patterns in bright areas
param([string]$ImagePath)

Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::FromFile($ImagePath)

$textRegions = @()

# Scan for horizontal bright streaks (typical of text)
for ($y = 100; $y -lt $bitmap.Height - 100; $y += 30) {
    $brightStreak = 0
    $streakStart = 0
    
    for ($x = 100; $x -lt $bitmap.Width - 100; $x += 10) {
        $pixel = $bitmap.GetPixel($x, $y)
        $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
        
        if ($brightness -gt 150) {
            if ($brightStreak -eq 0) { $streakStart = $x }
            $brightStreak++
        } else {
            if ($brightStreak -gt 5) {
                # Found a bright horizontal region - likely text
                $textRegions += @{
                    X = $streakStart
                    Y = $y
                    Width = ($x - $streakStart)
                    Type = "Text"
                }
            }
            $brightStreak = 0
        }
    }
}

$bitmap.Dispose()

# Cluster nearby regions
$clusters = @()
foreach ($region in $textRegions) {
    $foundCluster = $false
    for ($i = 0; $i -lt $clusters.Count; $i++) {
        $cluster = $clusters[$i]
        if ([Math]::Abs($region.Y - $cluster.Y) -lt 50 -and 
            [Math]::Abs($region.X - $cluster.X) -lt 200) {
            $cluster.Count++
            $cluster.AvgX = [Math]::Round(($cluster.AvgX + $region.X) / 2)
            $cluster.AvgY = [Math]::Round(($cluster.AvgY + $region.Y) / 2)
            $foundCluster = $true
            break
        }
    }
    
    if (-not $foundCluster) {
        $clusters += @{
            AvgX = $region.X
            AvgY = $region.Y
            Count = 1
        }
    }
}

Write-Host "`n=== TEXT-LIKE REGIONS FOUND ===" -ForegroundColor Cyan
$sorted = $clusters | Sort-Object -Property Count -Descending | Select-Object -First 15
foreach ($cluster in $sorted) {
    Write-Host "• ($($cluster.AvgX),$($cluster.AvgY)) - density:$($cluster.Count)" -ForegroundColor Yellow
}

return $sorted
