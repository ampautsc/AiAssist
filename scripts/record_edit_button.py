import time
import win32api
import win32con

print('Move mouse to edit button on a world and click it')
print('Recording in 3 seconds...')
time.sleep(3)

print('Waiting for click...')
while True:
    if win32api.GetAsyncKeyState(win32con.VK_LBUTTON):
        x, y = win32api.GetCursorPos()
        print(f'\nEdit button clicked at: ({x}, {y})')
        break
    time.sleep(0.1)
