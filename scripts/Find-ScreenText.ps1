# Windows UI Detection Script
# Uses Windows OCR to find text on screen

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Foundation.IAsyncOperation`1,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics,ContentType=WindowsRuntime]

function Find-TextOnScreen {
    param([string]$ImagePath)
    
    # Get OCR engine
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    
    # Load image
    $fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)
    $file = $fileTask.GetAwaiter().GetResult()
    
    $streamTask = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = $streamTask.GetAwaiter().GetResult()
    
    $decoderTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = $decoderTask.GetAwaiter().GetResult()
    
    $bitmapTask = $decoder.GetSoftwareBitmapAsync()
    $bitmap = $bitmapTask.GetAwaiter().GetResult()
    
    # Run OCR
    $ocrTask = $ocrEngine.RecognizeAsync($bitmap)
    $result = $ocrTask.GetAwaiter().GetResult()
    
    # Extract text and positions
    $findings = @()
    foreach ($line in $result.Lines) {
        $text = $line.Text
        $bounds = $line.Words[0].BoundingRect
        $findings += @{
            Text = $text
            X = [Math]::Round($bounds.X)
            Y = [Math]::Round($bounds.Y)
            Width = [Math]::Round($bounds.Width)
            Height = [Math]::Round($bounds.Height)
        }
    }
    
    return $findings
}

# Take screenshot and analyze
Write-Host "Taking screenshot..." -ForegroundColor Cyan
$bitmap = New-Object System.Drawing.Bitmap(2560, 1440)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
$path = "$env:TEMP\ocr_analyze.png"
$bitmap.Save($path)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Running OCR..." -ForegroundColor Cyan
$text = Find-TextOnScreen -ImagePath $path

Write-Host "`n=== TEXT FOUND ON SCREEN ===" -ForegroundColor Green
$text | ForEach-Object {
    Write-Host "At ($($_.X),$($_.Y)): '$($_.Text)'" -ForegroundColor Gray
}

Write-Host "`nTotal text elements: $($text.Count)" -ForegroundColor Cyan
