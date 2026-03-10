Add-Type -AssemblyName System.Windows.Forms

# Move mouse to Play button
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(869, 471)
Start-Sleep -Milliseconds 100

# Simulate left click
Add-Type -MemberDefinition @"
[DllImport("user32.dll")]
public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
"@ -Namespace Win32 -Name Mouse

[Win32.Mouse]::mouse_event(0x0002, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTDOWN
Start-Sleep -Milliseconds 50
[Win32.Mouse]::mouse_event(0x0004, 0, 0, 0, 0)  # MOUSEEVENTF_LEFTUP

Write-Host "Clicked at (869, 471)"
