"""
Minecraft Navigation Engine
Executes workflows by detecting screens and clicking appropriate buttons
"""
import time
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from minecraft_screen_detector import ScreenDetector, MinecraftScreen
from PIL import ImageGrab
import subprocess

class MinecraftNavigator:
    def __init__(self, workspace_root: str = r'C:\Users\ampau\source\AiAssist\AiAssist'):
        self.workspace = Path(workspace_root)
        self.detector = ScreenDetector()
        self.button_coords = self.load_button_coords()
        
    def load_button_coords(self) -> Dict:
        """Load known button coordinates from navigation data"""
        nav_file = self.workspace / 'minecraft-navigation-data' / 'navigation_data.json'
        if nav_file.exists():
            with open(nav_file) as f:
                data = json.load(f)
            
            # Map clicks to their purpose based on OCR analysis
            return {
                'save_and_quit': (743, 516),      # Click 2
                'select_world': (372, 527),        # Click 3
                'expand_menu': (550, 525),         # Click 4
                'remove_resource_pack': (1652, 217), # Click 6
                'confirm_dialog': (943, 602),      # Click 7
                'back_button': (19, 16),           # Click 8
                'settings_item': (198, 543),       # Click 9
                'storage_expand': (1145, 857),     # Click 10
                'delete_button': (1146, 847),      # Click 11
                'confirm_delete': (896, 825),      # Click 12
            }
        return {}
    
    def take_screenshot(self, save_path: Optional[str] = None) -> str:
        """Capture current screen"""
        screenshot = ImageGrab.grab()
        if save_path is None:
            save_path = self.workspace / 'temp_screenshot.png'
        screenshot.save(save_path)
        return str(save_path)
    
    def detect_current_screen(self) -> Tuple[MinecraftScreen, float, List[str]]:
        """Take screenshot and detect what screen we're on"""
        screenshot_path = self.take_screenshot()
        return self.detector.detect_screen(screenshot_path)
    
    def click(self, x: int, y: int, delay: float = 2.0):
        """Click at coordinates using working Windows Forms method"""
        ps_script = f"""
Add-Type -AssemblyName System.Windows.Forms
$minecraft = Get-Process | Where-Object {{$_.ProcessName -like "*Minecraft*"}} | Select-Object -First 1
if ($minecraft) {{
    $code = @"
using System;
using System.Runtime.InteropServices;
public class Clicker {{
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
}}
"@
    Add-Type -TypeDefinition $code
    [Clicker]::SetForegroundWindow($minecraft.MainWindowHandle)
    Start-Sleep -Milliseconds 500
    [Clicker]::SetCursorPos({x}, {y})
    Start-Sleep -Milliseconds 200
    
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {{
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;
    
    public static void Click() {{
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }}
}}
"@
    [MouseClick]::Click()
}}
"""
        subprocess.run(['powershell', '-Command', ps_script], capture_output=True)
        time.sleep(delay)
    
    def verify_screen(self, expected: MinecraftScreen, timeout: int = 5) -> bool:
        """Wait for and verify we're on expected screen"""
        start = time.time()
        while time.time() - start < timeout:
            screen, confidence, _ = self.detect_current_screen()
            if screen == expected and confidence > 0.5:
                return True
            time.sleep(0.5)
        return False
    
    def execute_workflow(self, workflow_name: str) -> Dict:
        """Execute a named workflow"""
        workflows = {
            'unload_addon': self.workflow_unload_addon,
            'import_addon': self.workflow_import_addon,
            'load_world': self.workflow_load_world,
            'test_spawn': self.workflow_test_spawn,
        }
        
        if workflow_name not in workflows:
            return {'success': False, 'error': f'Unknown workflow: {workflow_name}'}
        
        return workflows[workflow_name]()
    
    def workflow_unload_addon(self) -> Dict:
        """Remove addon from world (both resource and behavior packs)"""
        log = []
        
        # Step 1: Detect starting screen
        screen, conf, _ = self.detect_current_screen()
        log.append(f"Starting from: {screen.value} (confidence: {conf:.2f})")
        
        # If in-game, open pause menu
        if screen == MinecraftScreen.IN_GAME:
            log.append("Opening pause menu (ESC)")
            subprocess.run(['powershell', '-Command', '[System.Windows.Forms.SendKeys]::SendWait("{ESC}")'])
            time.sleep(1)
            if not self.verify_screen(MinecraftScreen.PAUSE_MENU):
                return {'success': False, 'error': 'Could not open pause menu', 'log': log}
        
        # Step 2: Save and quit if in pause menu
        if screen == MinecraftScreen.PAUSE_MENU:
            log.append("Clicking Save & Quit")
            self.click(*self.button_coords['save_and_quit'])
            if not self.verify_screen(MinecraftScreen.WORLDS_LIST):
                return {'success': False, 'error': 'Did not reach worlds list', 'log': log}
        
        # Step 3: Select world for editing
        log.append("Selecting world")
        self.click(*self.button_coords['select_world'])
        if not self.verify_screen(MinecraftScreen.WORLD_EDIT):
            return {'success': False, 'error': 'Did not open world edit', 'log': log}
        
        # Step 4: Expand to show resource packs
        log.append("Expanding menu")
        self.click(*self.button_coords['expand_menu'])
        time.sleep(1)
        
        # Step 5: Remove resource pack
        log.append("Removing resource pack")
        self.click(*self.button_coords['remove_resource_pack'])
        if not self.verify_screen(MinecraftScreen.CONFIRMATION_DIALOG):
            return {'success': False, 'error': 'No confirmation dialog', 'log': log}
        
        # Step 6: Confirm removal
        log.append("Confirming removal")
        self.click(*self.button_coords['confirm_dialog'])
        time.sleep(2)
        
        # Step 7: Go back to worlds
        log.append("Going back")
        self.click(*self.button_coords['back_button'])
        if not self.verify_screen(MinecraftScreen.WORLDS_LIST):
            return {'success': False, 'error': 'Not at worlds list', 'log': log}
        
        # Step 8: Open settings to delete behavior pack
        log.append("Opening settings")
        self.click(*self.button_coords['settings_item'])
        if not self.verify_screen(MinecraftScreen.SETTINGS):
            return {'success': False, 'error': 'Settings not opened', 'log': log}
        
        # Step 9: Open storage
        log.append("Opening storage")
        self.click(*self.button_coords['storage_expand'])
        if not self.verify_screen(MinecraftScreen.STORAGE_SETTINGS):
            return {'success': False, 'error': 'Storage not opened', 'log': log}
        
        # Step 10: Select and delete behavior pack
        log.append("Deleting behavior pack")
        self.click(*self.button_coords['delete_button'])
        time.sleep(1)
        
        # Step 11: Confirm deletion
        log.append("Confirming deletion")
        self.click(*self.button_coords['confirm_delete'])
        time.sleep(2)
        
        log.append("Addon unload complete!")
        return {'success': True, 'log': log}
    
    def workflow_import_addon(self) -> Dict:
        """Import .mcaddon file"""
        # This requires file picker automation - needs more work
        return {'success': False, 'error': 'Not yet implemented'}
    
    def workflow_load_world(self) -> Dict:
        """Load a world from worlds list"""
        # Simpler workflow - just click Play from world selection
        return {'success': False, 'error': 'Not yet implemented'}
    
    def workflow_test_spawn(self) -> Dict:
        """Test that addon entity spawns correctly"""
        # Verify in-game, run spawn command, check results
        return {'success': False, 'error': 'Not yet implemented'}

def main():
    nav = MinecraftNavigator()
    
    # Test screen detection
    print("Detecting current screen...")
    screen, confidence, matches = nav.detect_current_screen()
    print(f"Current screen: {screen.value} (confidence: {confidence:.2f})")
    if matches:
        print(f"Matched patterns: {', '.join(matches)}")
    
    print(f"\nAvailable actions: {nav.detector.get_available_actions(screen)}")

if __name__ == "__main__":
    main()
