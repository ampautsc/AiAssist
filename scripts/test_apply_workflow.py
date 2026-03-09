"""
Test the apply workflow with captured coordinates
Assumes Minecraft is at worlds list
"""
import sys
import time
from addon_workflow import apply_addon_to_world, load_world, close_minecraft

def test_apply_only():
    """Test just applying packs to world (no load)"""
    print("="*80)
    print("TEST: Apply Packs to World")
    print("="*80)
    print("\nPre-requisites:")
    print("1. Minecraft should be running")
    print("2. Should be at worlds list")
    print("3. 'My World' should exist")
    print("4. Monarch Garden packs should be imported")
    print("\nStarting in 3 seconds...")
    time.sleep(3)
    
    result = apply_addon_to_world()
    
    if result:
        print("\n✓ Apply workflow completed successfully")
    else:
        print("\n✗ Apply workflow failed")
    
    return result

def test_apply_and_load():
    """Test applying packs AND loading world"""
    print("="*80)
    print("TEST: Apply Packs and Load World")
    print("="*80)
    print("\nPre-requisites:")
    print("1. Minecraft should be running")
    print("2. Should be at worlds list")
    print("3. 'My World' and 'Addon Test' worlds should exist")
    print("4. Monarch Garden packs should be imported")
    print("\nStarting in 3 seconds...")
    time.sleep(3)
    
    # Apply packs
    if not apply_addon_to_world():
        print("\n✗ Apply workflow failed")
        return False
    
    print("\n✓ Packs applied")
    print("\nNow loading world to test...")
    time.sleep(2)
    
    # Load world
    if not load_world():
        print("\n✗ Load world failed")
        return False
    
    print("\n✓ World loaded - check Content Log for errors")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "apply":
            test_apply_only()
        elif sys.argv[1] == "full":
            test_apply_and_load()
    else:
        print("Usage:")
        print("  python test_apply_workflow.py apply    # Just apply packs")
        print("  python test_apply_workflow.py full     # Apply and load world")
