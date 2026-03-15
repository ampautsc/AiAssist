param(
    [string]$BaseDir = "c:\Users\ampau\source\AiAssist\AiAssist\Sis\History",
    [int]$DaysOld = 7
)

$archiveDir = Join-Path $BaseDir "Archive"
$digestsDir = Join-Path $BaseDir "Digests"

# Ensure directories exist
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "Created Archive directory: $archiveDir"
}

if (-not (Test-Path $digestsDir)) {
    New-Item -ItemType Directory -Path $digestsDir -Force | Out-Null
    Write-Host "Created Digests directory: $digestsDir"
}

# Find .md files directly under the BaseDir (exclude child directories)
$thresholdDate = (Get-Date).AddDays(-$DaysOld)
$mdFiles = Get-ChildItem -Path $BaseDir -Filter "*.md" -File | 
           Where-Object { $_.LastWriteTime -lt $thresholdDate }

if ($mdFiles.Count -eq 0) {
    Write-Host "No files older than $DaysOld days found for consolidation."
    exit
}

# Group files by ISO Week
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$calendar = $culture.Calendar

$groupedFiles = $mdFiles | Group-Object {
    # Get ISO 8601 week number (FirstFourDayWeek, starting Monday)
    $week = $calendar.GetWeekOfYear($_.LastWriteTime, [System.Globalization.CalendarWeekRule]::FirstFourDayWeek, [System.DayOfWeek]::Monday)
    $year = $_.LastWriteTime.ToString("yy") # 2-digit year
    "Week_${year}-$($week.ToString('D2'))"
}

foreach ($group in $groupedFiles) {
    $weekLabel = $group.Name
    $digestPath = Join-Path $digestsDir "$weekLabel.md"
    
    $content = @()
    $content += "# Memory Digest: $weekLabel"
    $content += "Consolidated on: $(Get-Date -Format 'yyyy-MM-dd')"
    $content += "Files spanned: $($group.Count)"
    $content += ""
    $content += "---"
    $content += ""

    # Sort files chronologically
    $sortedFiles = $group.Group | Sort-Object LastWriteTime

    foreach ($file in $sortedFiles) {
        $content += "## Log Entry: $($file.Name)"
        $content += "Date: $($file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
        $content += ""
        $content += Get-Content -Path $file.FullName -Raw
        $content += ""
        $content += "---"
        $content += ""
    }

    # Append to digest if it exists, or create new
    if (Test-Path $digestPath) {
        Add-Content -Path $digestPath -Value ($content -join "`n") -Encoding UTF8
        Write-Host "Updated existing digest: $weekLabel.md"
    } else {
        Set-Content -Path $digestPath -Value ($content -join "`n") -Encoding UTF8
        Write-Host "Created new digest: $weekLabel.md"
    }

    # Move files to archive
    foreach ($file in $sortedFiles) {
        Move-Item -Path $file.FullName -Destination $archiveDir -Force
        Write-Host "Archived: $($file.Name)"
    }
}

Write-Host "Consolidation complete."
