# Monarch Garden Addon - Test Results Phase 1

**Date:** January 18, 2026  
**Test Type:** Static validation and logic review

## JSON Syntax Validation ✓

All JSON files validated successfully:
- manifest.json ✓
- blocks/milkweed.json ✓
- entities/monarch_butterfly.json ✓
- entities/monarch_caterpillar.json ✓
- entities/monarch_chrysalis.json ✓
- spawn_rules/monarch_butterfly.json ✓

## Logic Errors Found & Fixed

### ERROR 1: Missing Block State Definition ✓ FIXED
**File:** blocks/milkweed.json  
**Issue:** Block references `monarch:growth_stage` state but never declares it  
**Impact:** Block would fail to load in Minecraft  
**Fix:** Added states definition to block description:
```json
"states": {
  "monarch:growth_stage": {
    "values": { "min": 0, "max": 2 }
  }
}
```

### ERROR 2: Incorrect Breeding Mechanic ❌ NEEDS FIX
**File:** entities/monarch_butterfly.json  
**Issue:** Uses `minecraft:breedable` with `breed_items: ["minecraft:air"]`  
**Impact:** 
- Not educationally accurate (butterflies don't "breed" in game sense)
- Players can't trigger egg-laying properly
- Doesn't teach that butterflies LAY EGGS on milkweed

**Correct Approach:**
- Remove breeding component
- Add `minecraft:behavior.lay_egg` behavior
- Butterfly should seek milkweed blocks
- Lay egg entity (not caterpillar directly)
- Egg transforms to caterpillar after time

### ERROR 3: Missing Egg Entity ❌ NEEDS FIX
**Impact:** Lifecycle jumps from butterfly → caterpillar, skipping egg stage  
**Educational Issue:** Kids won't see that butterflies lay EGGS first  
**Fix Needed:** Create `monarch:egg` entity

### ERROR 4: Missing Loot Table ⚠️ WARNING
**File:** blocks/milkweed.json references "loot_tables/blocks/milkweed_mature.json"  
**Issue:** File doesn't exist  
**Impact:** Game will error/warn when breaking mature milkweed  
**Fix:** Create loot table or remove reference

### ERROR 5: Missing Resource Pack Files ⚠️ WARNING
**Missing:**
- Textures for all entities
- Models for all entities  
- Sounds definitions
- Client entity definitions

**Impact:** Entities will be invisible/use default appearance  
**Note:** Flagged as "placeholder needed" but not created

## Educational Accuracy Issues

### Issue 1: Lifecycle Not Complete
Current: Butterfly → Caterpillar → Chrysalis → Butterfly  
Should be: Butterfly → **Egg** → Caterpillar → Chrysalis → Butterfly

### Issue 2: Milkweed Dependency Not Enforced
- Butterflies should ONLY lay eggs ON or NEAR milkweed
- Caterpillars should seek and eat milkweed
- Without milkweed, butterflies shouldn't reproduce
- Currently: spawn rules allow butterflies without milkweed present

### Issue 3: No Player Interaction Needed
- Kids should plant milkweed to see butterflies
- Currently butterflies just spawn naturally
- Missing the core "cause and effect" learning

## Recommendations

### STOP - Do Not Proceed to Phase 2
Foundational issues need fixing first.

### Priority Fixes:
1. **Create egg entity** (high priority - educational accuracy)
2. **Fix butterfly reproduction** (use lay_egg behavior, not breeding)
3. **Add milkweed dependency** (butterflies need milkweed to lay eggs)
4. **Create basic loot table** (prevent errors)
5. **Add placeholder textures** (at minimum, retexture vanilla entities)

### Then Test In-Game:
- Install in Minecraft
- Plant milkweed
- Verify butterflies spawn near milkweed
- Check if they lay eggs
- Watch lifecycle progression
- Verify timing (is 30 seconds too fast? too slow?)

## Decision Point

**Option A: Fix Now** - Correct these issues before continuing  
**Option B: Quick Playtest** - Test current version to see what else breaks  
**Option C: Redesign** - Step back and use simpler approach

**Recommendation:** Option A - Fix the egg lifecycle and milkweed dependency now. These are core to the educational value.

## Testing Still Needed

- [ ] In-game load test
- [ ] Spawn verification
- [ ] Lifecycle timing
- [ ] Performance with multiple entities
- [ ] Texture/model placeholder creation
- [ ] Educational effectiveness (do kids understand the cause/effect?)

## Conclusion

Good foundation, but **NOT ready for release**. Critical educational inaccuracies and missing lifecycle stage. Need to fix egg implementation and milkweed dependency before this teaches the right lessons.

**Status:** ❌ PHASE 1 INCOMPLETE - NEEDS REVISION
