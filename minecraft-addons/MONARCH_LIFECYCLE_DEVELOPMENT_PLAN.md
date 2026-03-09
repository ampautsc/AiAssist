# Monarch Butterfly Lifecycle Development Plan

## Current State Summary (UPDATED - Checked Addon)

### Existing Entities
| Entity | File Exists | Status |
|--------|-------------|--------|
| `monarch:butterfly` | ✅ | Working - flies, finds perches |
| `monarch:flower_perch` | ✅ | Working - invisible mount |
| `monarch:caterpillar` | ✅ | Exists but uses ground navigation |
| `monarch:chrysalis` | ✅ | Exists - needs review |
| `monarch:egg` | ✅ | Exists - needs review |

### Existing Blocks
| Block | File Exists | Status |
|-------|-------------|--------|
| `monarch:milkweed` | ✅ | 3 growth stages, cross geometry |

### Existing Scripts
- `main.js` - Already compiled, source likely in `main.ts`

---

## CRITICAL ISSUE: Caterpillar Surface Crawling

### The Problem
Caterpillars need to crawl ON the surface of milkweed stems/leaves, not on the ground below. Current implementation uses `navigation.walk` which only works on ground surfaces.

### Vanilla Mechanics Analysis

| Mechanic | What It Does | Applicable? |
|----------|--------------|-------------|
| `minecraft:can_climb` | Allows climbing walls (spider) | ❌ Climbs any wall, not specific block |
| `minecraft:block_climber` | Silverfish-style block interaction | ❌ For hiding in blocks |
| `minecraft:navigation.climb` | Spider wall navigation | ❌ General wall climbing |
| `minecraft:behavior.stay_near_noteblock` | Stay near specific block | ⚠️ Proximity only, not surface |
| `minecraft:rideable` | Entity mounts another | ✅ Could work! |
| Leash mechanics | Constrain entity position | ⚠️ Visible tether |

### Possible Approaches

#### Approach A: Caterpillar as Rider (Recommended)
**Concept:** Make milkweed spawn invisible "leaf perch" entities on its surface. Caterpillars ride these perches and can jump between them.

**How it works:**
1. Milkweed block spawns multiple invisible `monarch:leaf_perch` entities at different positions (stem, leaves)
2. Caterpillar uses `behavior.find_mount` to attach to nearest leaf perch
3. Caterpillar periodically dismounts and finds new perch (simulates crawling)
4. Animation makes it look like crawling motion

**Pros:** Uses proven perch mechanic we already have working
**Cons:** Discrete positions, not smooth crawling

#### Approach B: Animation-Only Crawling
**Concept:** Caterpillar stays at fixed position relative to milkweed, animation simulates movement around stem.

**How it works:**
1. Caterpillar entity spawns at milkweed position
2. No actual movement components
3. Complex animation rotates/translates the model around a central axis
4. Appears to crawl in circles around stem

**Pros:** Smooth visual movement
**Cons:** Complex animation math, caterpillar doesn't actually move

#### Approach C: Particle/Client-Side Effect
**Concept:** Caterpillars aren't entities at all - they're animated textures on the milkweed block itself.

**How it works:**
1. Milkweed block states include "has_caterpillar" 
2. Block geometry includes caterpillar mesh
3. Block animation moves caterpillar around surface
4. Script handles lifecycle timing

**Pros:** Perfect surface attachment, no entity sync issues
**Cons:** Can't interact with caterpillar as entity, complex block geometry

#### Approach D: Very Small Entity + Restricted Navigation (Simplest)
**Concept:** Make caterpillar so small it fits on a leaf, restrict its movement to only milkweed blocks.

**How it works:**
1. Tiny collision box (0.1 x 0.1)
2. Use script to teleport back to milkweed if it wanders off
3. Very slow movement speed
4. Visual scale larger than collision

**Pros:** Simple to implement
**Cons:** May look weird, could fall off

### Recommendation: Hybrid A + D

1. **Leaf perch system** for stable "resting" positions on milkweed
2. **Very small caterpillar** that moves between perches
3. **Script enforcement** to keep caterpillar on milkweed
4. **Scale trick**: Collision 0.1, visual model scaled up to look normal size
