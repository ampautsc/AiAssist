# Test if Minecraft exposes UI elements via Windows UI Automation

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Write-Host "=== Checking Minecraft UI Automation ===" -ForegroundColor Cyan

# Get Minecraft window
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*" -and $_.MainWindowHandle -ne 0}
if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running" -ForegroundColor Red
    exit 1
}

Write-Host "Found Minecraft process: $($minecraft.ProcessName)" -ForegroundColor Green

# Get automation element for the window
$windowHandle = $minecraft.MainWindowHandle
$rootElement = [System.Windows.Automation.AutomationElement]::FromHandle($windowHandle)

Write-Host "`nWindow Details:" -ForegroundColor Yellow
Write-Host "  Name: $($rootElement.Current.Name)"
Write-Host "  ClassName: $($rootElement.Current.ClassName)"
Write-Host "  ControlType: $($rootElement.Current.ControlType.ProgrammaticName)"

# Try to find all buttons
Write-Host "`nSearching for buttons..." -ForegroundColor Yellow
$buttonCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
)

$walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
$buttons = $rootElement.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)

Write-Host "Found $($buttons.Count) button elements" -ForegroundColor $(if ($buttons.Count -gt 0) { "Green" } else { "Red" })

if ($buttons.Count -gt 0) {
    Write-Host "`nButton Details:" -ForegroundColor Cyan
    foreach ($button in $buttons) {
        Write-Host "  - Name: '$($button.Current.Name)'" -ForegroundColor White
        Write-Host "    ControlType: $($button.Current.ControlType.ProgrammaticName)" -ForegroundColor Gray
        Write-Host "    Enabled: $($button.Current.IsEnabled)" -ForegroundColor Gray
    }
    
    # Try to find "Play" button
    $playButton = $buttons | Where-Object {$_.Current.Name -like "*Play*"}
    if ($playButton) {
        Write-Host "`n✅ FOUND PLAY BUTTON!" -ForegroundColor Green
        Write-Host "Can invoke: $($playButton.GetSupportedPatterns().Length -gt 0)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⚠️ No buttons exposed via UI Automation" -ForegroundColor Yellow
    Write-Host "Minecraft likely uses custom rendering without accessibility support" -ForegroundColor Gray
}

# Try to enumerate all child elements to see what's available
Write-Host "`nEnumerating all UI elements (first 20)..." -ForegroundColor Yellow
$allCondition = [System.Windows.Automation.Condition]::TrueCondition
$allElements = $rootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $allCondition)

Write-Host "Found $($allElements.Count) child elements" -ForegroundColor Cyan
$count = 0
foreach ($element in $allElements) {
    if ($count -ge 20) { break }
    Write-Host "  [$($element.Current.ControlType.ProgrammaticName)] $($element.Current.Name)" -ForegroundColor Gray
    $count++
}
