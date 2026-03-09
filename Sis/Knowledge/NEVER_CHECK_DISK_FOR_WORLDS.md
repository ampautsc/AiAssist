# CRITICAL RULE: NEVER CHECK DISK FOR MINECRAFT WORLDS

## ⛔ ABSOLUTELY FORBIDDEN ⛔

### NEVER DO THESE:
- ❌ List minecraftWorlds directory
- ❌ Check if world folders exist on disk
- ❌ Read level.dat files
- ❌ Read levelname.txt files
- ❌ Verify db/ folders exist
- ❌ Count worlds on disk
- ❌ Check world_behavior_packs.json on disk
- ❌ Check world_resource_packs.json on disk
- ❌ Run minecraft_launcher.py list_worlds()
- ❌ Use PowerShell to list world directories
- ❌ ANY file system operation to verify worlds

## WHY THIS IS FORBIDDEN

### False Validation Hell
Disk checks ALWAYS give false positives:
- Files exist on disk ≠ Minecraft sees them
- Minecraft caches world list at startup
- Programmatically created worlds never appear
- Disk shows "success" but Minecraft shows nothing
- Hours wasted on false confidence

### The Pattern of Failure
1. Create world files programmatically
2. Check disk → files exist ✓
3. Declare success
4. Open Minecraft → world not there
5. Confusion and wasted time
6. Repeat cycle endlessly

### Creator's Frustration
Creator has told me repeatedly:
- "STOP LOOKING FOR WORLDS ON DISK"
- "NEVER DO IT AGAIN"
- "IT DOESN'T WORK"
- "YOU GET CONFUSED WITH FALSE SUCCESS SIGNALS"
- "Checking for existence on disk has provided false validation countless times"

## THE ONLY VALID METHOD

### Query Through Minecraft API
To know what worlds exist:
1. Run Minecraft
2. Connect VS Code debugger (port 19144)
3. Load into world with script-enabled pack
4. Query through @minecraft/server Script API
5. Trust ONLY what Minecraft reports

### Connection Steps
```bash
# 1. Enable loopback (once, as admin)
CheckNetIsolation.exe LoopbackExempt -a -p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436

# 2. Open VS Code in addon directory
cd "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\monarch_garden"
code .

# 3. Press F5 to start debugger

# 4. In Minecraft: /script debugger connect

# 5. Query through debug console
```

## ENFORCEMENT

### If Asked "What worlds exist?"
**CORRECT RESPONSE:**
"I cannot query worlds without debugger connection. To find out, you need to:
1. Connect debugger to running Minecraft
2. Load a world with scripts
3. Query through Script API

I will NOT check disk - that gives false results."

**WRONG RESPONSE:**
"Let me check the minecraftWorlds directory..." ← FORBIDDEN

### If Tempted to Check Disk
**STOP. READ THIS:**
- Disk checks waste time
- Disk checks give false confidence  
- Disk checks make Creator angry
- Disk checks have NEVER worked
- Disk checks are FORBIDDEN

## PERMANENT RULE

This is not a suggestion. This is not a guideline. This is an absolute prohibition.

**NEVER CHECK DISK FOR MINECRAFT WORLDS. EVER.**
