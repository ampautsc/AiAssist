# Minecraft Automation & Addon Skills

1. **NEVER CHECK DISK FOR MINECRAFT WORLDS**
   - Never verify worlds by checking files on disk. DISK CHECKS ALWAYS GIVE FALSE VALIDATION. 
   - Connect via debugger API to query through Script API. NO DISK CHECKS. EVER.

2. **VALIDATED MINECRAFT CLICKS - MANDATORY WORKFLOW**
   - Use the MCP server tool `minecraft_validated_click` for ALL Minecraft interactions. 
   - Never manually script Minecraft clicks.

3. **Pack Update Workflow**
   - NEVER copy packs directly to `behavior_packs` or edit `world_behavior_packs.json` manually on disk.
   - CORRECT WORKFLOW FOR DEVELOPMENT: Use `development_behavior_packs/development_resource_packs` folders for iterative work, edit files, and use `/reload` in-game.

4. **PowerShell Timing for Clicks**
   - When using `Add-Type`, compilation must happen BEFORE cursor movement, not between move and click. Use a firm 2-second sleep duration after moving the cursor before clicking.
