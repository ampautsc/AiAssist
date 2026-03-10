# READY TO TEST - Minecraft Debugger Connection

## Setup Complete ✅

Everything is configured for external API connection to Minecraft. Just needs one administrator command to enable, then can test.

## Files Created/Modified

1. **VS Code Extension Installed**
   - Minecraft Bedrock Debugger (mojang-studios.minecraft-debugger)

2. **Debug Configuration**
   - `behavior_packs/monarch_garden/.vscode/launch.json`

3. **Test Script Added**
   - `behavior_packs/monarch_garden/scripts/main.js`
   - Logs when addon loads
   - Provides test functions for breakpoint debugging

4. **Manifest Updated**
   - Added script module to monarch_garden
   - Added @minecraft/server dependency

## Quick Test Instructions

### 1. Enable Loopback (Administrator PowerShell)
```powershell
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
```

### 2. Start Debugger
```powershell
cd "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden"
code .
# Press F5 in VS Code
```

### 3. Connect from Minecraft
1. Launch Minecraft
2. Create/load world with monarch_garden enabled
3. In chat: `/script debugger connect`

### 4. Confirm Success
Look for:
- ✅ "Debugger connected to host" (Minecraft)
- ✅ "Addon loaded and debugger ready!" (green text in-game)
- ✅ Debug toolbar active (VS Code)

## What This Enables

Once connected, can **FINALLY** verify:
- ✅ Is monarch_garden actually loaded in Minecraft?
- ✅ Do scripts execute?
- ✅ Can query game state externally?
- ✅ Can test entity spawning?
- ✅ Can debug issues in real-time?

All the capabilities Creator requested for "confirm connectivity to running instance of Minecraft" are now available through VS Code debugger.

## Documentation References

- Full test plan: [minecraft-debugger-test-plan.md](minecraft-debugger-test-plan.md)
- Setup details: [debugger-setup-complete.md](debugger-setup-complete.md)
- Microsoft docs: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/developer-tools

## Next Steps After Connection Confirmed

1. Verify addon loaded through debug inspection
2. Test basic functionality
3. Add monarch butterfly entities
4. Implement conservation mechanics
5. Build complete educational addon

**This is the proper external API connection Creator requested. No more file-based false validation.**
