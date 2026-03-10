# Simple Minecraft World Loader - Hybrid OCR + Fallback Coordinates
$OCR = "C:\Users\ampau\source\AiAssist\AiAssist\mcp-servers\screenshot-ocr\scripts\ocr_engine.py"
$PY = "C:\Python312\python.exe"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
try{[Mouse]|Out-Null}catch{Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Mouse{[DllImport("user32.dll")]public static extern void mouse_event(int a,int b,int c,int d,int e);public const int MOUSEEVENTF_LEFTDOWN=0x02;public const int MOUSEEVENTF_LEFTUP=0x04;}'}
Write-Host "`nMINECRAFT WORLD LOADER`n" -ForegroundColor Cyan
$w=New-Object -ComObject wscript.shell;$w.AppActivate('Minecraft')|Out-Null;Start-Sleep -Milliseconds 500
$s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds;$b=New-Object System.Drawing.Bitmap($s.Width,$s.Height);$g=[System.Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(0,0,0,0,$b.Size);$p="$env:TEMP\mc1.png";$b.Save($p);$g.Dispose();$b.Dispose()
Write-Host "[1] Screenshot taken" -ForegroundColor Green
try{$r=(& $PY $OCR $p "Play" 2>$null|ConvertFrom-Json);if($r.found -gt 0){$x=$r.texts[0].x;$y=$r.texts[0].y;Write-Host "[2] OCR found Play at ($x,$y)" -ForegroundColor Green}else{$x=1280;$y=780;Write-Host "[2] Using fallback (1280,780)" -ForegroundColor Yellow}}catch{$x=1280;$y=780;Write-Host "[2] Fallback coords" -ForegroundColor Yellow}
[System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point($x,$y);Start-Sleep -Milliseconds 200;[Mouse]::mouse_event(2,0,0,0,0);Start-Sleep -Milliseconds 50;[Mouse]::mouse_event(4,0,0,0,0);Start-Sleep -Seconds 2
Write-Host "[3] Clicked Play" -ForegroundColor Green
[System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point(1280,500);Start-Sleep -Milliseconds 200;[Mouse]::mouse_event(2,0,0,0,0);Start-Sleep -Milliseconds 50;[Mouse]::mouse_event(4,0,0,0,0);Start-Sleep -Seconds 1
Write-Host "[4] Clicked first world" -ForegroundColor Green
[System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point(1280,1200);Start-Sleep -Milliseconds 200;[Mouse]::mouse_event(2,0,0,0,0);Start-Sleep -Milliseconds 50;[Mouse]::mouse_event(4,0,0,0,0);Start-Sleep -Seconds 5
Write-Host "[5] Loading world..." -ForegroundColor Yellow
$c=netstat -ano|Select-String "19144"|Select-String "ESTABLISHED"
if($c){Write-Host "[6] Debugger CONNECTED!" -ForegroundColor Green}else{Write-Host "[6] No debugger yet" -ForegroundColor Yellow}
Write-Host "`nCheck VS Code Debug Console" -ForegroundColor White
