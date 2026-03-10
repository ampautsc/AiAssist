# Apply Addon to World - Workflow Documentation

## Captured: January 18, 2026, 19:21-19:22

### Workflow: Applying Resource and Behavior Packs to World

**Starting Point:** Worlds List screen

**Click 1 (395, 527):** Select "My World"  
→ Opens Edit World screen

**Click 2 (553, 850):** Expand menu (shows General, Advanced, Multiplayer tabs)  
→ Menu expanded

**Click 3 (320, 787):** Click to show Active packs section  
→ Shows "Shared packs" with Active/Available tabs

**Click 4 (1656, 380):** Activate Monarch Garden Resource Pack  
→ Dialog appears: "Update world? This world may not look or behave the same way..."

**Click 5 (818, 635):** Confirm world update (Continue button)  
→ Resource pack activated, returns to pack list

**Click 6 (1352, 109):** Switch to or activate Monarch Garden Behavior Pack  
→ Behavior pack showing in Active section

**Click 7:** Close behavior packs panel  
→ Still in Edit World, showing General/Advanced/Multiplayer tabs

**Click 8 (19, 16):** Back button (top left)  
→ Exit Edit World, return to Worlds list

**Click 9 (198, 543):** Click "Addon Test" world tile to LOAD it  
→ World loads, content log shows errors immediately

**Clicks 10-13:** NOT part of workflow - these were reviewing errors and closing Minecraft after load

## Actual Apply Workflow: 9 Steps

1. Select world edit button (395, 527)
2. Expand menu (553, 850)
3. Show Resource Packs (320, 787)
4. Activate Resource Pack (1656, 380)
5. Confirm "Update world?" (818, 635)
6. Switch to/activate Behavior Pack (1352, 109)
7. Close pack panel (coordinate unknown)
8. Back to worlds list (19, 16)
9. Load world by clicking world tile (198, 543)

## Key Coordinates for Apply Workflow

```python
APPLY_WORKFLOW = {
    'select_world_edit': (395, 527),        # Edit button on world tile
    'expand_menu': (553, 850),              # Expand settings menu
    'show_resource_packs': (320, 787),      # Resource Packs option
    'activate_resource_pack': (1656, 380),  # Activate button for RP
    'confirm_update': (818, 635),           # "Update world?" confirm
    'behavior_pack_tab': (1352, 109),       # Behavior Packs tab/activate
    'back_button': (19, 16),                # Back arrow top left
    'world_tile_to_load': (198, 543),       # Click world tile (not edit!)
}
```

## Critical Distinctions

**World Edit vs World Load:**
- (395, 527) = Edit button on "My World" tile → opens edit screen
- (198, 543) = "Addon Test" world tile itself → loads world
- These are DIFFERENT actions on DIFFERENT worlds

**Screen Identification Required:**
- Must verify on Worlds list before clicking load
- Must verify Edit World screen before clicking back
- Clicking wrong coordinate on wrong screen will fail

## Notes
- "Update world?" warning appears when activating resource pack - must confirm
- Both packs activated in same edit session (no need to exit between)
- Click 7 coordinate not captured (closing panel) - may not be necessary if back button exits anyway
- After load, world immediately shows content log with errors
