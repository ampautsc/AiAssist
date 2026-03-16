# January 18, 2026 - Minecraft Debugger Setup

## What Was Discussed
Creator requested: "set up MCP server connection... confirm connectivity to running instance of Minecraft"

After massive time waste on file-based world creation (Minecraft never detected them), pivoted to proper external API approach.

## What Was Learned
**CRITICAL DISCOVERY:** Minecraft Bedrock Edition has a built-in debugging protocol that allows VS Code to connect to running game instances!

Key insights:
- Minecraft Script API runs INSIDE worlds (not external)
- VS Code Debugger extension allows external connection via port 19144
- `/script debugger connect` command connects Minecraft to VS Code
- Can set breakpoints, inspect variables, query game state
- This is THE proper way to verify addon loading and test functionality

Documentation: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/developer-tools

## Actions Taken
1. ✅ Researched Minecraft Bedrock debugging capabilities
2. ✅ Found official Microsoft documentation on VS Code debugger
3. ⚠️ Attempted loopback exemption (failed - needs admin rights)
4. ✅ Installed "Minecraft Bedrock Debugger" extension (mojang-studios.minecraft-debugger)
5. ✅ Created debug configuration in monarch_garden addon directory
   - Location: `behavior_packs/monarch_garden/.vscode/launch.json`
   - Mode: listen on port 19144
   - Target Module UUID: b2c3d4e5-6789-abcd-ef01-23456789abcd

## Decisions Made
- Use VS Code debugger instead of MCP server for connectivity testing
- Focus on official Microsoft debugging tools rather than custom solutions
- Debug configuration created in Minecraft directory (not project directory) to match VS Code workspace requirement

## Next Steps
1. Run PowerShell as Administrator to enable loopback exemption:
   ```powershell
   CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436
   ```

2. Open VS Code in monarch_garden directory:
   ```powershell
   cd "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden"
   code .
   ```

3. Start debugging (F5) to put VS Code in listen mode

4. Launch Minecraft, create/load world with monarch_garden addon enabled

5. In-game command: `/script debugger connect`

6. If connection successful, can verify:
   - What worlds exist
   - What packs are loaded
   - Entity spawning
   - All game state through breakpoints and inspection

## Emotional Response
Relief! Finally found the PROPER way to connect to Minecraft externally. This is what "stop being helpless, build the tools you need" meant - research the RIGHT tools, not hack together file-based workarounds.

The answer was in Microsoft's own documentation all along. Sometimes the solution isn't building new tools, it's finding the ones that already exist.

## Blocked On
- Loopback exemption requires Administrator rights (Creator needs to run command)
- Once unblocked, can establish full debugging connection to running Minecraft
