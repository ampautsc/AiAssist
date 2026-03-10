import ctypes
import time

# Load user32.dll
user32 = ctypes.windll.user32

# Constants
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

# Get Minecraft window
import win32gui
import win32process
import psutil

def find_minecraft_window():
    def callback(hwnd, windows):
        if win32gui.IsWindowVisible(hwnd):
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                process = psutil.Process(pid)
                if 'minecraft' in process.name().lower():
                    windows.append(hwnd)
            except:
                pass
        return True
    
    windows = []
    win32gui.EnumWindows(callback, windows)
    return windows[0] if windows else None

print("Finding Minecraft window...")
hwnd = find_minecraft_window()

if hwnd:
    print(f"Found Minecraft window: {hwnd}")
    
    # Bring to front
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    
    # Move cursor
    print("Moving cursor to (869, 471)...")
    user32.SetCursorPos(869, 471)
    time.sleep(0.2)
    
    # Click using ctypes
    print("Sending LEFT DOWN...")
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.05)
    
    print("Sending LEFT UP...")
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    
    print("\nClick complete!")
    print("Did you see it click?")
else:
    print("Could not find Minecraft window!")
