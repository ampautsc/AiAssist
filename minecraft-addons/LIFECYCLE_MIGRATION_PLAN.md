# Monarch Lifecycle - Migration to Block-Based System

## Executive Summary

**Current Implementation:** Separate entities for egg, caterpillar, and chrysalis  
**New Implementation:** Lifecycle stages integrated into milkweed block states  
**Reason for Change:** Better attachment to plant surface, simpler logic, more realistic

---

## Current State Analysis

### Files That Currently Exist

| File | Type | Purpose | Status |
|------|------|---------|--------|
| `behavior-packs/monarch_garden/entities/monarch_egg.json` | Entity | Egg entity | ❌ **DELETE** |
| `behavior-packs/monarch_garden/entities/monarch_caterpillar.json` | Entity | Caterpillar entity (ground navigation) | ❌ **DELETE** |
| `behavior-packs/monarch_garden/entities/monarch_chrysalis.json` | Entity | Chrysalis entity | ❌ **DELETE** |
| `behavior-packs/monarch_garden/blocks/milkweed.json` | Block | Milkweed with 3 growth stages | ✏️ **MODIFY** |
| `behavior-packs/monarch_garden/entities/monarch_butterfly.json` | Entity | Adult butterfly | ✏️ **MODIFY** |
| `behavior-packs/monarch_garden/scripts/main.js` | Script | Event handling | ✏️ **MODIFY** |

### Resource Pack Files to Check

Need to audit:
- `resource-packs/monarch_garden/entity/monarch_egg.entity.json` - **DELETE**
- `resource-packs/monarch_garden/entity/monarch_caterpillar.entity.json` - **DELETE**
- `resource-packs/monarch_garden/entity/monarch_chrysalis.entity.json` - **DELETE**
- `resource-packs/monarch_garden/models/entity/monarch_egg.geo.json` - **DELETE**
- `resource-packs/monarch_garden/models/entity/monarch_caterpillar.geo.json` - **DELETE**
- `resource-packs/monarch_garden/models/entity/monarch_chrysalis.geo.json` - **DELETE**
- `resource-packs/monarch_garden/textures/entity/monarch_egg.png` - **DELETE**
- `resource-packs/monarch_garden/textures/entity/monarch_caterpillar.png` - **DELETE**
- `resource-packs/monarch_garden/textures/entity/monarch_chrysalis.png` - **DELETE**
- Any animations/controllers for these entities - **DELETE**

---

## New Implementation Design

### Milkweed Block State Expansion

**Current States:**
```
monarch:growth_stage = [0, 1, 2]
0 = seedling
1 = growing
2 = mature
```

**New States:**
```
monarch:growth_stage = [0, 1, 2]  (keep existing)
monarch:lifecycle_stage = [0, 1, 2, 3, 4]  (NEW)
0 = none (normal plant)
1 = has_egg
2 = has_small_caterpillar
3 = has_large_caterpillar  
4 = has_chrysalis
```

### Visual Changes by Lifecycle Stage

| Lifecycle Stage | What Block Shows | Geometry Needed |
|-----------------|------------------|-----------------|
| 0 (none) | Just milkweed plant | Existing cross geometry |
| 1 (egg) | Plant + tiny oval on leaf underside | Add egg mesh at leaf position |
| 2 (small caterpillar) | Plant + small striped caterpillar | Add small caterpillar mesh |
| 3 (large caterpillar) | Plant + large striped caterpillar | Add large caterpillar mesh |
| 4 (chrysalis) | Plant + green/gold chrysalis hanging | Add chrysalis mesh hanging down |

---

## Detailed Change List

### 1. DELETE Legacy Entity Files

#### Behavior Pack - Delete (3 files)
```
behavior-packs/monarch_garden/entities/monarch_egg.json
behavior-packs/monarch_garden/entities/monarch_caterpillar.json
behavior-packs/monarch_garden/entities/monarch_chrysalis.json
```

#### Resource Pack - Delete (9+ files)
```
resource-packs/monarch_garden/entity/monarch_egg.entity.json
resource-packs/monarch_garden/entity/monarch_caterpillar.entity.json
resource-packs/monarch_garden/entity/monarch_chrysalis.entity.json
resource-packs/monarch_garden/models/entity/monarch_egg.geo.json
resource-packs/monarch_garden/models/entity/monarch_caterpillar.geo.json
resource-packs/monarch_garden/models/entity/monarch_chrysalis.geo.json
resource-packs/monarch_garden/textures/entity/monarch_egg.png
resource-packs/monarch_garden/textures/entity/monarch_caterpillar.png
resource-packs/monarch_garden/textures/entity/monarch_chrysalis.png
```

Plus any associated:
- `animations/monarch_egg.animation.json`
- `animations/monarch_caterpillar.animation.json`
- `animations/monarch_chrysalis.animation.json`
- `animation_controllers/` for these entities

---

### 2. MODIFY: Milkweed Block Definition

**File:** `behavior-packs/monarch_garden/blocks/milkweed.json`

#### Changes Needed:

**A. Add New Block State**
```json
"states": {
  "monarch:growth_stage": [0, 1, 2],
  "monarch:lifecycle_stage": [0, 1, 2, 3, 4]  // NEW
}
```

**B. Update Custom Component**
Current: `"monarch:growable"` - handles growth  
Needed: Expand to also handle lifecycle progression

**C. Add Permutations for Lifecycle Stages**

For EACH lifecycle stage (1-4), need permutations that:
1. Change geometry to include egg/caterpillar/chrysalis
2. Change material instances if needed
3. Apply at any growth_stage (only mature milkweed gets eggs, so filter for growth_stage == 2)

Example structure:
```json
{
  "condition": "q.block_state('monarch:growth_stage') == 2 && q.block_state('monarch:lifecycle_stage') == 1",
  "components": {
    "minecraft:geometry": "geometry.milkweed_with_egg",
    "minecraft:material_instances": { /* ... */ }
  }
}
```

**D. Loot Table Update**
- When lifecycle_stage > 0, should drop milkweed item (not destroy lifecycle)
- Or prevent breaking when lifecycle active?

---

### 3. CREATE: New Geometry Files

**Location:** `resource-packs/monarch_garden/models/blocks/`

#### Files to Create:

1. **milkweed_with_egg.geo.json**
   - Base: milkweed cross geometry
   - Add: Tiny oval (egg) attached to leaf underside
   - Position: Offset to side of one leaf

2. **milkweed_with_small_caterpillar.geo.json**
   - Base: milkweed geometry
   - Add: Small segmented caterpillar on stem/leaf
   - Position: Mid-stem or on leaf surface

3. **milkweed_with_large_caterpillar.geo.json**
   - Base: milkweed geometry
   - Add: Larger segmented caterpillar
   - Position: Prominent on stem

4. **milkweed_with_chrysalis.geo.json**
   - Base: milkweed geometry
   - Add: Hanging chrysalis pod from top or underside of leaf
   - Position: Hanging down

#### Geometry Notes:
- Use same texture_width/height as base milkweed for consistency
- Add bones for egg/caterpillar/chrysalis parts
- Consider adding subtle animation later (caterpillar wiggle, chrysalis sway)

---

### 4. CREATE: New Textures

**Location:** `resource-packs/monarch_garden/textures/blocks/`

#### Textures Needed:

1. **milkweed_lifecycle_egg.png** (or expand existing milkweed texture)
   - Pale yellow/cream oval for egg
   - Small section of texture atlas

2. **milkweed_lifecycle_caterpillar.png**
   - Yellow, black, and white stripes
   - Segmented appearance
   - Could be same texture for small/large, just different geometry scale

3. **milkweed_lifecycle_chrysalis.png**
   - Green base with gold dots/spots
   - Realistic monarch chrysalis appearance

**Option A:** Separate texture files  
**Option B:** Expand main milkweed texture atlas to include lifecycle elements

---

### 5. MODIFY: Butterfly Egg-Laying Behavior

**File:** `behavior-packs/monarch_garden/entities/monarch_butterfly.json`

#### Current Implementation:
Unknown - need to check if butterflies already have egg-laying behavior pointing to old entity

#### Changes Needed:

**Remove any references to spawning monarch:egg entity**

**Approach A: Script-Based** (Recommended)
- Remove entity-based egg-laying behavior from butterfly.json
- Handle in script: butterfly near mature milkweed → script changes block state

**Approach B: Behavior-Based**
- Create custom behavior that interacts with blocks
- May not be possible with vanilla components

---

### 6. MODIFY: Custom Component Script

**File:** `behavior-packs/monarch_garden/scripts/main.ts` (compiles to main.js)

#### Current Custom Component:
`monarch:growable` - handles plant growth stages 0→1→2

#### Changes Needed:

**A. Extend `growable` Component**

Add lifecycle progression logic:
```typescript
// Pseudo-code
onTick(block) {
  const lifecycle = block.permutation.getState('monarch:lifecycle_stage');
  
  switch(lifecycle) {
    case 0: // Normal plant, check for butterfly nearby
      if (growth_stage === 2 && butterflyNearby()) {
        setLifecycleStage(1); // Add egg
      }
      break;
    
    case 1: // Has egg, timer to hatch
      incrementTimer();
      if (timerReached(EGG_HATCH_TIME)) {
        setLifecycleStage(2); // Small caterpillar
      }
      break;
    
    case 2: // Small caterpillar, timer to grow
      incrementTimer();
      if (timerReached(CATERPILLAR_GROW_TIME)) {
        setLifecycleStage(3); // Large caterpillar
      }
      break;
    
    case 3: // Large caterpillar, timer to chrysalis
      incrementTimer();
      if (timerReached(CHRYSALIS_FORM_TIME)) {
        setLifecycleStage(4); // Chrysalis
      }
      break;
    
    case 4: // Chrysalis, timer to hatch butterfly
      incrementTimer();
      if (timerReached(BUTTERFLY_HATCH_TIME)) {
        spawnButterfly(block.location);
        setLifecycleStage(0); // Back to normal plant
      }
      break;
  }
}
```

**B. Add Timer Storage**

Need to store tick count per block. Options:
- Block entity data (if available)
- Dynamic property on block
- World dynamic property with location key

**C. Butterfly Detection Logic**

```typescript
function butterflyNearby(blockLocation: Vector3): boolean {
  const dimension = world.getDimension('overworld');
  const butterflies = dimension.getEntities({
    type: 'monarch:butterfly',
    location: blockLocation,
    maxDistance: 3
  });
  
  return butterflies.length > 0;
}
```

**D. State Change Helper**

```typescript
function setLifecycleStage(block: Block, stage: number) {
  const current = block.permutation;
  const newPermutation = current.withState('monarch:lifecycle_stage', stage);
  block.setPermutation(newPermutation);
  
  // Reset timer for this block
  resetTimer(block.location);
}
```

---

### 7. MODIFY: Butterfly Behavior (Optional Enhancement)

**File:** `behavior-packs/monarch_garden/entities/monarch_butterfly.json`

#### Optional Behaviors to Add:

**A. Prefer Flying Near Mature Milkweed**
```json
"minecraft:behavior.move_towards_restriction": {
  "priority": 5,
  "speed_multiplier": 1.0
}
```
Combined with script that sets home position to milkweed clusters

**B. Visual Indicator When Laying Egg**
- Add animation for landing on milkweed
- Play particle effect when egg is laid
- Handle in script when lifecycle_stage changes 0→1

---

### 8. CREATE: Configuration Constants

**New File:** `behavior-packs/monarch_garden/scripts/lifecycle_config.ts`

```typescript
export const LifecycleConfig = {
  // Timers in ticks (20 ticks = 1 second)
  EGG_HATCH_TIME: 1200,        // 60 seconds
  SMALL_CATERPILLAR_TIME: 2400, // 120 seconds
  LARGE_CATERPILLAR_TIME: 2400, // 120 seconds
  CHRYSALIS_TIME: 3600,         // 180 seconds
  
  // Butterfly egg-laying
  EGG_LAY_CHANCE: 0.01,         // 1% per tick when near milkweed
  EGG_LAY_COOLDOWN: 6000,       // 5 minutes between eggs
  
  // Plant requirements
  MIN_LIGHT_LEVEL: 9,           // Needs light to progress
  REQUIRES_MATURE: true         // Only mature milkweed gets eggs
};
```

---

### 9. UPDATE: Terrain/Textures JSON

**File:** `resource-packs/monarch_garden/blocks.json` (or similar)

Register new geometries and textures:
```json
{
  "milkweed_with_egg": {
    "textures": {
      "down": "milkweed_lifecycle_egg",
      "up": "milkweed_stage_2",
      "side": "milkweed_stage_2"
    }
  }
  // ... similar for other lifecycle stages
}
```

---

### 10. UPDATE: Language Files

**File:** `resource-packs/monarch_garden/texts/en_US.lang`

Remove old entries:
```
tile.monarch:butterfly_egg.name=Butterfly Egg
entity.monarch:caterpillar.name=Monarch Caterpillar  
entity.monarch:chrysalis.name=Monarch Chrysalis
```

Add descriptive hover text (if blocks show state in debug):
```
tile.monarch:milkweed.lifecycle.egg=Milkweed (with Egg)
tile.monarch:milkweed.lifecycle.caterpillar_small=Milkweed (with Small Caterpillar)
tile.monarch:milkweed.lifecycle.caterpillar_large=Milkweed (with Large Caterpillar)
tile.monarch:milkweed.lifecycle.chrysalis=Milkweed (with Chrysalis)
```

---

## Implementation Phases

### Phase 1: Cleanup (Remove Old System)
1. ✅ Delete entity files (behavior + resource pack)
2. ✅ Remove entity references from scripts
3. ✅ Test: Ensure no errors from missing entities

### Phase 2: Block State Setup
4. ✅ Add `lifecycle_stage` state to milkweed.json
5. ✅ Add basic permutations (no geometry yet, just test state changes)
6. ✅ Test: Script can change lifecycle_stage

### Phase 3: Geometry & Textures
7. ✅ Create placeholder geometries (simple cubes for egg/caterpillar/chrysalis)
8. ✅ Add permutations with new geometries
9. ✅ Test: Visual changes work
10. ✅ Create proper textures
11. ✅ Create detailed geometries
12. ✅ Test: Looks good

### Phase 4: Script Logic
13. ✅ Implement timer system
14. ✅ Implement lifecycle progression
15. ✅ Implement butterfly detection & egg laying
16. ✅ Test: Full cycle egg→butterfly works

### Phase 5: Polish
17. ✅ Add animations (caterpillar wiggle, chrysalis sway)
18. ✅ Add particles/sounds
19. ✅ Tune timers
20. ✅ Test: Full playtesting

---

## Testing Checklist

- [ ] Remove old entity files without errors
- [ ] Milkweed can change to lifecycle_stage 1 (egg)
- [ ] Egg stage visible on block
- [ ] Timer progresses egg → small caterpillar
- [ ] Small caterpillar visible and distinct from egg
- [ ] Timer progresses to large caterpillar
- [ ] Large caterpillar visible and larger than small
- [ ] Timer progresses to chrysalis
- [ ] Chrysalis hangs correctly
- [ ] Butterfly spawns after chrysalis timer
- [ ] Block returns to normal milkweed after butterfly spawns
- [ ] Multiple milkweeds can have different lifecycle stages simultaneously
- [ ] Lifecycle doesn't progress if player far away (chunk unloaded)
- [ ] Breaking milkweed during lifecycle drops appropriate items
- [ ] Butterflies approach mature milkweed to lay eggs

---

## File Summary

### Files to DELETE (12+)
- 3 entity behavior files
- 3 entity client files  
- 3 entity geometry files
- 3 entity texture files
- Any associated animations/controllers

### Files to CREATE (5-7)
- 4 new block geometry files
- 1-3 new texture files (depending on atlas approach)
- 1 config file (lifecycle_config.ts)
- Possibly animation files for lifecycle stages

### Files to MODIFY (4-5)
- milkweed.json (block)
- monarch_butterfly.json (entity)
- main.ts (script)
- blocks.json (resource pack)
- en_US.lang (resource pack)

---

## Open Questions

1. **Timer Persistence:** How to store timers when chunks unload/reload?
   - Options: Block entity, dynamic properties, accept reset on reload

2. **Multiple Eggs:** Can one milkweed have multiple lifecycle instances or one at a time?
   - Recommendation: One at a time for simplicity

3. **Player Interaction:** Can players break milkweed during lifecycle?
   - If yes: What drops? Egg item? Caterpillar entity?
   - Recommendation: Prevent breaking or drop special items

4. **Lighting:** Should lifecycle only progress in daylight?
   - Realistic but might frustrate players
   - Recommendation: Progress anytime, maybe slower at night

5. **Butterfly Behavior:** Should butterflies actively seek milkweed to lay eggs?
   - Current: random_fly and random_hover
   - Add: behavior.move_towards_target with milkweed detection?

---

*Document created: January 22, 2026*
*Status: Ready for review and implementation approval*
