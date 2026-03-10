using System;
using System.Runtime.InteropServices;

public class ScreenCapture {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hwnd, ref WindowRect rect);
    
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorInfo(ref CursorInfo pci);
    
    [DllImport("user32.dll")]
    public static extern bool DrawIconEx(IntPtr hdc, int xLeft, int yTop, 
        IntPtr hIcon, int cxWidth, int cyHeight, uint istepIfAniCur, 
        IntPtr hbrFlickerFreeDraw, uint diFlags);
    
    public const int DI_NORMAL = 0x0003;
    public const int CURSOR_SHOWING = 0x00000001;
}

[StructLayout(LayoutKind.Sequential)]
public struct WindowRect {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

[StructLayout(LayoutKind.Sequential)]
public struct CursorPoint {
    public int X;
    public int Y;
}

[StructLayout(LayoutKind.Sequential)]
public struct CursorInfo {
    public int cbSize;
    public int flags;
    public IntPtr hCursor;
    public CursorPoint ptScreenPos;
}
