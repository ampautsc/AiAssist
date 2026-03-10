# Addon Errors to Fix - January 18, 2026

## Errors Found in Debug Console

### 1. ⚠️ Warning - milkweed_seeds texture field
```
[Item][warning]-monarch:milkweed_seeds -> components -> minecraft:icon -> texture: 
this member was found in the input, but is not present in the Schema
```

**Issue:** The `texture` field in `minecraft:icon` component is invalid
**File:** `minecraft-addons/behavior-packs/monarch_garden/items/milkweed_seeds.json`
**Fix:** Remove the `texture` field from `minecraft:icon` component

### 2. ✅ Success - Butterfly spawning works!
```
[Scripting][warning]-[SUCCESS] Spawned butterfly via API: monarch:butterfly
```
**Status:** This is working! Butterfly entity spawns successfully.

### 3. ❌ Error - Test script crash
```
[Scripting][error]-[ERROR] Test script crashed: TypeError: not a function
```

**Issue:** JavaScript error in test script
**File:** Likely `main.js` or test script in behavior pack
**Cause:** Calling something that isn't a function
**Need:** Check the test script for syntax errors

## Priority
1. Fix milkweed_seeds.json (remove invalid texture field)
2. Debug the test script TypeError
3. Verify all entities spawn correctly

## Status
- Debugger: Connected (addon loaded in world)
- Behavior Pack: Loaded
- Resource Pack: Loaded
- World: Running
