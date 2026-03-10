# Unload Addon Workflow - Corrected Analysis

## Recorded: January 18, 2026, 20:31-20:33

### Actual Unload Workflow: 11 Essential Steps

**Starting Point:** Edit World screen

## Phase 1: Remove Packs from World (Clicks 1-7)

**Click 1 (553, 833):** Expand menu in Edit World
- Shows General/Advanced/Multiplayer tabs

**Click 2 (327, 731):** Click Resource Packs section  
- Opens Resource Packs, shows "Monarch Garden Resource Pack"

**Click 3 (1642, 375):** Click X to remove Resource Pack from world
- Removes RP from world's active packs

**Click 4 (240, 814):** Navigate to Behavior Packs section

**Click 5 (1641, 219):** Click X to remove Behavior Pack from world  
- Triggers warning dialog

**Click 6 (1063, 598):** Click "Continue" on warning dialog
- Confirms removal of BP from world

**Click 7 (29, 18):** Back button to exit Edit World
- Returns to worlds list (Click 8 goes to main menu - not part of unload)

## Phase 2: Delete from Global Storage (Clicks 14-18)

**Clicks 9-13:** Wrong path - exploring settings, not part of workflow

**Click 14 (663, 793):** From settings, found Storage area
- Navigated to Storage menu showing Subscriptions/Global Resources

**Click 15 (1387, 766):** Clicked "Global Resources"
- Opens Global Resources section

**Click 16 (1692, 821):** Clicked "Storage" to expand
- Shows "Resource Packs A.B2hB - 1 Item" 

**Click 17 (1164, 737):** Selected resource pack for deletion
- Triggers "Delete 1 item permanently?" confirmation

**Click 18 (1057, 548):** Clicked "Delete" on confirmation
- **DELETED RESOURCE PACK FROM GLOBAL STORAGE**

**Note:** Behavior pack deletion from storage not captured (Creator may have stopped recording or it was already deleted)

## Minimal Unload Workflow

```python
UNLOAD_WORKFLOW = {
    # Phase 1: Remove from World
    'expand_menu': (553, 833),
    'resource_packs': (327, 731),
    'remove_rp': (1642, 375),
    'behavior_packs': (240, 814),
    'remove_bp': (1641, 219),
    'confirm_warning': (1063, 598),
    'back': (29, 18),
    
    # Phase 2: Delete from Storage
    'storage_menu': (663, 793),          # From settings
    'global_resources': (1387, 766),
    'storage_expand': (1692, 821),
    'select_pack': (1164, 737),
    'delete_confirm': (1057, 548),
}
```

## Key Findings

1. **Two-phase process:** Must remove from world AND delete from global storage
2. **Clicks 9-13 were exploration** - Creator went down wrong path in settings first
3. **11 actual clicks** for the unload (7 for world removal, 4 for storage deletion)
4. **Missing BP storage deletion** - not captured in this recording
5. **Navigation to storage is direct** - no need for the complex navigation I documented
