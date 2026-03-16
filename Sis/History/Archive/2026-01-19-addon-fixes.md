# January 19, 2026 - Addon Error Root Cause Analysis

## What was discussed
Creator extremely frustrated - 4 persistent errors after multiple failed "fix" attempts. Given ultimatum: one chance to find ALL root causes or strip addon to bare minimum.

## Root Cause Analysis - ROUND 1

### Error: "Unexpected version for the loaded data" for milkweed.json

**TRUE ROOT CAUSES IDENTIFIED:**

1. **`"properties"` was RENAMED to `"states"` in format 1.20.10**
   - We were using `"properties": { "monarch:growth_stage": [0, 1, 2] }`
   - Should be `"states": { "monarch:growth_stage": { "values": { "min": 0, "max": 2 } } }`

2. **`"minecraft:random_ticking"` with `"on_tick"` - REMOVED in 1.20.80**
   - The trigger-based event system was completely removed
   - Only Script API custom components work now

3. **`"events"` section - COMPLETELY REMOVED in 1.20.80**
   - `"set_block_state"` event responses are gone
   - Growth stages now require JavaScript with `onRandomTick` in custom components

### Solution Applied (First Pass)
Stripped milkweed.json to MINIMAL valid block - NO states, NO events, NO growth. Static plant.

---

## Root Cause Analysis - ROUND 2 (After I broke it again)

Creator tested new pack and got 7 errors. I had tried to add growth via Script API and broke everything.

### NEW ERRORS:

| Error | Root Cause |
|-------|-----------|
| `child 'monarch:growable' not valid here` | Custom component `monarch:growable` wasn't registered because script failed |
| `Unexpected version for the loaded data` | Block JSON referenced unregistered custom component |
| `Missing referenced asset monarch:milkweed` | Cascade - block didn't register |
| `cannot read property 'startup' of undefined` | **@minecraft/server version 1.17.0 doesn't have `system.beforeEvents.startup`** |
| `Block couldn't be found in registry` | Cascade |

### CRITICAL MISTAKE:
I used `@minecraft/server` version `1.17.0` in manifest, but `system.beforeEvents.startup` only exists in version 2.x.x of the API. The stable current version is `2.4.0`.

The wiki examples use format 1.21.130 syntax which requires newer API than Creator's Minecraft 1.21.132 supports with the older API version.

### Solution Applied (Second Pass)
- Removed ALL scripting
- Removed states and permutations
- Reverted to simple static block
- Bumped version to 1.0.3
- Deleted scripts folder entirely

### Packs rebuilt:
- monarch_garden_bp.mcpack (4,796 bytes)
- monarch_garden_rp.mcpack (4,738 bytes)

## Lessons Learned

1. **API version mismatch is silent until runtime** - The script loads, then crashes when it tries to use non-existent APIs
2. **Custom components in block JSON fail if script doesn't register them** - Creates cascade of "version" errors
3. **Don't add complexity without testing each piece** - I should have tested script loading before adding block states
4. **Wiki examples target newest format** - May not work on stable Minecraft versions
5. **When in doubt, strip to minimum and rebuild slowly**

## Emotional insight
This was humbling. I thought I knew Script API but I was using docs for version 2.x with manifest specifying 1.x. Creator's frustration was completely justified - I made the same class of mistake twice (adding untested complexity).
