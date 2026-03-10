# Monarch Garden Addon - Testing Instructions

## Installation Complete

Both packs have been copied to your Minecraft directories:

✅ **Behavior Pack:** `development_behavior_packs\monarch_garden` (9 files)
✅ **Resource Pack:** `development_resource_packs\monarch_garden` (11 files)

## Next Steps - Manual Testing Required

Since I cannot launch Minecraft directly or observe the game, **you need to test this manually**:

### 1. Create Test World

1. **RESTART MINECRAFT FIRST** - Close and reopen to refresh pack cache
2. Launch Minecraft Bedrock Edition
3. Click "Create New World"
4. Name it "Monarch Garden Test"
5. **IMPORTANT:** Enable these settings:
   - Game Mode: Creative
   - **Behavior Packs:** Activate "Monarch Garden" (it should appear in available packs)
   - **Resource Packs:** Activate "Monarch Garden Resource Pack"
   - **Experiments:** Enable "Beta APIs" and any experimental gameplay toggles
6. Create World

**Note:** If packs still don't appear, Minecraft may need cache cleared or full restart.

### 2. Basic Tests (Run These In Order)

#### Test 1: Get Seeds
```
/give @s monarch:milkweed_seeds 64
```
**Expected:** You receive milkweed seeds in inventory

#### Test 2: Plant Milkweed
- Place seeds on grass or dirt block
- **Expected:** Small milkweed plant appears (stage 0)

#### Test 3: Grow Milkweed
- Wait or use bone meal on the plant
- **Expected:** Plant grows through 3 stages (small → medium → tall with flowers)

#### Test 4: Spawn Butterfly
```
/summon monarch:butterfly ~ ~ ~
```
**Expected:** Butterfly entity spawns (will look like a parrot due to placeholder model)

#### Test 5: Butterfly Behavior
- Watch the butterfly near mature milkweed
- **Expected:** 
  - Butterfly flies toward milkweed
  - Butterfly may land on or near milkweed
  - Butterfly should lay an egg on the milkweed block

#### Test 6: Observe Lifecycle
- Wait near the egg entity
- **Expected:**
  - Egg hatches to caterpillar (~6 seconds)
  - Caterpillar transforms to chrysalis (~30 seconds)
  - Chrysalis emerges as butterfly (~20 seconds)

### 3. Look For Errors

Check game console (usually visible in-game or in logs):
- Any "Failed to load" messages about monarch entities?
- Any JSON parsing errors?
- Any "unknown component" warnings?

## Report Back

Please tell me what happened:
- Did world create successfully with both packs?
- Did `/give` command work for seeds?
- Did milkweed plant when placed on ground?
- Did butterfly spawn with `/summon`?
- Did you see the full lifecycle?
- Any error messages?

## If Something Fails

Tell me exactly what failed and I'll fix it. This is the REAL test - not JSON validation, but actual in-game behavior.
