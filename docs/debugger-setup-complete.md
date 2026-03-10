# Minecraft Debugger Connection Setup - COMPLETE

## What Was Built

### 1. VS Code Debugger Extension
✅ **Installed:** `mojang-studios.minecraft-debugger`
- Official Microsoft extension for Minecraft Bedrock debugging
- Allows breakpoint debugging, variable inspection, and game state queries

### 2. Debug Configuration
✅ **Created:** `behavior_packs/monarch_garden/.vscode/launch.json`
```json
{
  "version": "0.3.0",
  "configurations": [{
    "type": "minecraft-js",
    "request": "attach",
    "name": "Debug Monarch Garden in Minecraft",
    "mode": "listen",
    "targetModuleUuid": "d3e4f5a6-789b-cdef-0123-456789abcdef",
    "localRoot": "${workspaceFolder}/",
    "port": 19144
  }]
}
```

### 3. Test Script
✅ **Created:** `behavior_packs/monarch_garden/scripts/main.js`
- Logs addon load confirmation
- Periodic player count updates
- Exportable test function for breakpoint testing
- Uses @minecraft/server API

### 4. Updated Manifest
✅ **Modified:** `behavior_packs/monarch_garden/manifest.json`
- Added script module (UUID: d3e4f5a6-789b-cdef-0123-456789abcdef)
- Added @minecraft/server dependency
- Entry point: scripts/main.js

## How To Test (Manual Steps Required)

### ONE-TIME SETUP (Requires Administrator)
```powershell
# Run PowerShell as Administrator
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
```

### TESTING PROCEDURE

**Step 1:** Open VS Code in addon directory
```powershell
cd "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden"
code .
```

**Step 2:** Start debugging
- Press F5 in VS Code
- Status bar should show "Debugger listening on port 19144"

**Step 3:** Launch Minecraft
1. Open Minecraft Bedrock Edition
2. Create new world or load existing
3. **ENABLE monarch_garden behavior pack** in world settings
4. Enter world

**Step 4:** Connect debugger
In Minecraft chat:
```
/script debugger connect
```

**Step 5:** Verify connection
Expected results:
- Minecraft: "Debugger connected to host" message
- Minecraft: "§a[Monarch Garden] Addon loaded and debugger ready!" message
- VS Code: Debug toolbar becomes active
- VS Code: Can set breakpoints in main.js

## What This Proves

### ✅ Addon Actually Loaded
If you see the green "Addon loaded" message, the addon IS running in Minecraft (not just on disk).

### ✅ Scripts Execute
The periodic player count messages prove script execution.

### ✅ External Connection Works
VS Code connection proves we can query game state externally.

### ✅ Can Debug Live
Breakpoints can be set in main.js - execution will pause, allowing variable inspection.

## Testing Capabilities Now Available

With debugger connected, you can:
1. **Query loaded packs** - Inspect world.behavior_packs via debug console
2. **Test entity spawning** - Run spawn commands, set breakpoints on entity events
3. **Verify game state** - Access ALL Minecraft API data in real-time
4. **Profile performance** - Use `/script profiler start` for performance analysis
5. **Capture errors** - All script errors appear in VS Code with stack traces

## Why This Matters

This connection replaces:
- ❌ File-based verification (unreliable, gave false positives)
- ❌ Manual world creation attempts (Minecraft never detected them)
- ❌ Guessing if addons loaded (no visibility)

With:
- ✅ Real-time game state verification
- ✅ Actual execution confirmation
- ✅ Professional debugging workflow
- ✅ Immediate feedback on changes

## Success Criteria

Connection test is SUCCESSFUL when:
1. ✅ Loopback exemption enabled (administrator command)
2. ✅ VS Code shows "Debugger listening"
3. ✅ Minecraft shows "Debugger connected to host"
4. ✅ Green "Addon loaded" message appears in-game
5. ✅ Debug toolbar active in VS Code
6. ✅ Breakpoints can be set in main.js

## After Connection Confirmed

Once connectivity proven, can:
1. Add more entities (monarch butterflies, caterpillars)
2. Implement conservation mechanics
3. Test everything with breakpoints
4. Profile performance
5. Build complete educational addon with confidence

**LESSON LEARNED:** Microsoft provides the tools. Research first, build second. The proper debugging protocol existed all along - just needed to find Microsoft's documentation instead of inventing workarounds.
