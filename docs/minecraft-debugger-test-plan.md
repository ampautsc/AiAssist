# Minecraft Debugger Connection Test Plan

## Prerequisites Setup

### 1. Enable Loopback Exemption (Run as Administrator)
```powershell
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
```
**Result Expected:** "OK."

### 2. Verify Extension Installed
✅ **COMPLETED:** Minecraft Bedrock Debugger (mojang-studios.minecraft-debugger) installed

### 3. Debug Configuration Created
✅ **COMPLETED:** `launch.json` created at:
```
C:\Users\ampau\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden\.vscode\launch.json
```

## Connection Test Steps

### Step 1: Open VS Code in Addon Directory
```powershell
cd "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden"
code .
```

### Step 2: Start Debugging in VS Code
1. Press **F5** or click "Run and Debug"
2. Select "Debug Monarch Garden in Minecraft"
3. VS Code should show "Debugger listening on port 19144"

### Step 3: Launch Minecraft
1. Open Minecraft Bedrock Edition
2. Create a new world OR load existing world
3. **CRITICAL:** Enable "monarch_garden" behavior pack in world settings
4. Enter the world

### Step 4: Connect from Minecraft
In-game chat, type:
```
/script debugger connect
```

**Expected Result:** "Debugger connected to host"

### Step 5: Verify Connection
In VS Code, you should see:
- Connection established message
- Debug toolbar active
- Ability to set breakpoints in monarch_garden scripts (if any exist)

## What This Connection Enables

### Query Capabilities
Once connected, can inspect:
- ✅ Active worlds
- ✅ Loaded behavior packs
- ✅ Entity lists
- ✅ World state
- ✅ All game variables

### Testing Capabilities
- Set breakpoints in addon scripts
- Inspect variable values
- Step through code execution
- Profile performance
- Capture errors in real-time

## Troubleshooting

### Connection Refused
- **Cause:** Loopback exemption not enabled
- **Fix:** Run CheckNetIsolation command as Administrator

### Addon Not Visible
- **Cause:** Pack not enabled in world settings
- **Fix:** Edit world → Resource Packs → Add monarch_garden

### Port Already in Use
- **Cause:** Previous debug session still running
- **Fix:** Restart VS Code, or change port in launch.json

## Success Criteria
✅ VS Code shows "Debugger listening"
✅ Minecraft command shows "Debugger connected"
✅ Debug toolbar active in VS Code
✅ Can query game state through debug console

## Next Steps After Connection
Once connectivity confirmed:
1. Verify monarch_garden actually loaded (check pack list via debug)
2. Test entity spawning (if monarch_garden has entities)
3. Verify resource pack loading
4. Test gameplay features

This replaces ALL file-based verification attempts. API connection is the ONLY reliable way to verify Minecraft game state.
