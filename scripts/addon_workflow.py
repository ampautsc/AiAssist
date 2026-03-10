"""
Workflow: Import and Apply Minecraft Addon
Imports .mcaddon file and applies it to a world
"""
import subprocess
import time
import os
from pathlib import Path

WORKSPACE = Path(r'C:\Users\ampau\source\AiAssist\AiAssist')

def click_at(x, y, delay=2.0):
    """Execute a click at coordinates"""
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

def close_minecraft():
    """Close Minecraft completely"""
    print("Closing Minecraft...")
    subprocess.run(['taskkill', '/F', '/IM', 'Minecraft.Windows.exe'], capture_output=True)
    time.sleep(2)
    return True

def import_addon(addon_path):
    """Import .mcpack/.mcaddon file to Minecraft
    
    CRITICAL: How addon import actually works:
    1. Just open the .mcpack/.mcaddon file (double-click or Invoke-Item)
    2. Windows will automatically launch Minecraft and import it
    3. Wait 20 seconds for import to complete
    4. Done.
    
    DO NOT manually launch Minecraft first. The file association handles everything.
    
    NOTE: Minecraft can only import ONE pack per session.
    After importing, must close Minecraft completely before importing another.
    """
    print(f"Importing: {addon_path}")
    
    # Just open the file - Windows/Minecraft handles the rest
    subprocess.run(['cmd', '/c', 'start', '', addon_path], shell=True)
    
    print("Waiting 20 seconds for Minecraft to launch and import...")
    time.sleep(20)
    print("Import complete")
    
    return True

def apply_addon_to_world(world_name="My World"):
    """Apply imported addon to world from worlds list
    
    Uses captured workflow coordinates from Apply-Addon-Workflow.md
    9-step process:
    1. Click world edit button (not the tile itself)
    2. Expand menu to show pack options
    3. Show Resource Packs
    4. Activate Resource Pack (triggers "Update world?" dialog)
    5. Confirm update
    6. Switch to Behavior Pack tab and activate
    7. (Close panel - coordinate not captured, may not be needed)
    8. Back to worlds list
    9. Click world tile to LOAD it
    """
    print("\n=== Applying Addon to World ===")
    
    # Step 1: Click world edit button
    print(f"Step 1: Selecting '{world_name}' edit button...")
    click_at(395, 527, delay=2)  # Edit button on world tile
    
    # Step 2: Expand menu to show pack options
    print("Step 2: Expanding menu...")
    click_at(553, 850, delay=2)
    
    # Step 3: Show Resource Packs section
    print("Step 3: Opening Resource Packs...")
    click_at(320, 787, delay=2)
    
    # Step 4: Activate Resource Pack
    print("Step 4: Activating Monarch Garden Resource Pack...")
    click_at(1656, 380, delay=2)
    
    # Step 5: Confirm "Update world?" dialog
    print("Step 5: Confirming world update...")
    click_at(818, 635, delay=2)
    
    # Step 6: Switch to and activate Behavior Pack
    print("Step 6: Activating Monarch Garden Behavior Pack...")
    click_at(1352, 109, delay=2)
    
    # Step 7: (Close panel - not strictly necessary, back button exits)
    # Coordinate not captured in recording
    
    # Step 8: Back to worlds list
    print("Step 8: Returning to worlds list...")
    click_at(19, 16, delay=2)
    
    print("✓ Packs applied to world")
    return True

def load_world(world_name="Addon Test"):
    """Load the world from worlds list
    
    CRITICAL: This clicks the world TILE itself, not the edit button
    Different coordinate than apply_addon_to_world which clicks edit button
    """
    print("\n=== Loading World ===")
    
    print(f"Clicking '{world_name}' tile to load...")
    click_at(198, 543, delay=5)  # Click world tile (not edit button!)
    
    print("World loading...")
    time.sleep(5)  # Wait for world to load
    return True

def workflow_import_and_test():
    """Complete workflow: import addon, apply to world, load world
    NOTE: Imports resource pack and behavior pack separately due to Minecraft limitation
    """
    print("="*80)
    print("WORKFLOW: Import and Apply Addon")
    print("="*80)
    
    # The .mcaddon contains both resource and behavior packs
    # But we need to import them separately due to Minecraft's one-per-session limit
    
    resource_pack_path = WORKSPACE / 'minecraft-addons' / 'monarch_garden_rp.mcpack'
    behavior_pack_path = WORKSPACE / 'minecraft-addons' / 'monarch_garden_bp.mcpack'
    
    if not resource_pack_path.exists():
        print(f"ERROR: Resource pack not found at {resource_pack_path}")
        return False
    
    if not behavior_pack_path.exists():
        print(f"ERROR: Behavior pack not found at {behavior_pack_path}")
        return False
    
    # Step 1: Import resource pack
    print("\n--- Importing Resource Pack ---")
    if not import_addon(str(resource_pack_path)):
        print("ERROR: Failed to import resource pack")
        return False
    print("✓ Resource pack imported")
    
    # Step 2: Close Minecraft
    close_minecraft()
    
    # Step 3: Import behavior pack
    print("\n--- Importing Behavior Pack ---")
    if not import_addon(str(behavior_pack_path)):
        print("ERROR: Failed to import behavior pack")
        return False
    print("✓ Behavior pack imported")
    
    # Step 4: Apply to world
    print("\n--- Applying Packs to World ---")
    print("NOTE: Minecraft should be at worlds list after import")
    time.sleep(2)  # Give user time to see the note
    
    if not apply_addon_to_world():
        print("ERROR: Failed to apply addon to world")
        return False
    
    print("\n✓ Addon applied to world")
    
    # Step 5: Load world to test
    if not load_world():
        print("ERROR: Failed to load world")
        return False
    
    print("\n✓ World loaded with addon")
    print("\n" + "="*80)
    print("WORKFLOW COMPLETE - Check Content Log for errors")
    print("="*80)
    
    return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "import":
            addon_path = sys.argv[2] if len(sys.argv) > 2 else str(WORKSPACE / 'minecraft-addons' / 'monarch_garden.mcaddon')
            import_addon(addon_path)
        elif sys.argv[1] == "apply":
            apply_addon_to_world()
        elif sys.argv[1] == "load":
            load_world()
        elif sys.argv[1] == "full":
            workflow_import_and_test()
    else:
        print("Usage:")
        print("  python addon_workflow.py import [addon_path]")
        print("  python addon_workflow.py apply")
        print("  python addon_workflow.py load")
        print("  python addon_workflow.py full")
