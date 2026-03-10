# Milkweed Seed Dispersal - Implementation Plan

## Current State Analysis

### What Currently Exists

| File | Status | Current Functionality |
|------|--------|----------------------|
| `items/milkweed_seeds.json` | ✅ Exists | Manual planting item, placeable on grass/dirt/farmland |
| `loot_tables/blocks/milkweed_mature.json` | ✅ Exists | Drops 1-3 seeds when mature milkweed broken |
| `textures/items/milkweed_seeds.png` | ✅ Exists | Item icon texture |

### Current Behavior
- **Player breaks mature milkweed** → drops seed items
- **Player places seed on ground** → milkweed grows
- **No automatic dispersal** - seeds don't fly/spread naturally

---

## Desired Functionality

### Automatic Seed Dispersal System

**Trigger:** Mature milkweed (growth_stage = 2) automatically releases seeds periodically

**Seed Entity Behavior:**
1. Seeds spawn as floating entities above mature milkweed
2. Seeds float/drift slowly like bees using hover movement (very slow speed ~0.05-0.1)
3. **Players auto-collect seeds by walking near them** (like normal dropped items)
4. When it rains, gravity turns back on and seeds fall quickly
5. When seed touches dirt/grass/farmland → plants milkweed automatically
6. If seed lands on wrong surface → despawns after brief delay
7. Seeds have limited lifetime (despawn after ~2 minutes if not landed)

**Visual Appearance:**
- Fluffy white/cream appearance like real milkweed seeds
- Visible "parachute" (silk) above the seed
- Small and delicate looking

---

## Implementation Design

### Architecture Overview

```
Mature Milkweed Block
    ↓ (timer in custom component)
Spawns monarch:milkweed_seed_entity
    ↓ (hover movement: very slow bee-like flight)
Entity floats around slowly
    ↓ (rain detected: gravity enabled)
Falls quickly to ground
    ↓ (collision detection via script)
Lands on dirt/grass/farmland
    ↓ (script places block)
Milkweed stage 0 planted
    +
Entity despawns
```

### Key Components

1. **Seed Entity** - `monarch:milkweed_seed_entity` (new)
2. **Milkweed Block Script** - Extend existing growable component
3. **Seed Collision Script** - Detect landing and plant
4. **Keep Existing Item** - Manual planting still works

---

## Detailed Changes

### 1. CREATE: Seed Entity (Behavior)

**File:** `behavior-packs/monarch_garden/entities/milkweed_seed_entity.json`

**Components Needed:**

```json
{
  "format_version": "1.20.0",
  "minecraft:entity": {
    "description": {
      "identifier": "monarch:milkweed_seed_entity",
      "is_spawnable": false,
      "is_summonable": true,
      "is_experimental": false
    },
    "components": {
      "minecraft:type_family": {
        "family": ["seed", "inanimate"]
      },
      "minecraft:collision_box": {
        "width": 0.15,
        "height": 0.15
      },
      "minecraft:physics": {
        "has_gravity": false,  // Initially floating
        "has_collision": false  // Passes through entities
      },
      "minecraft:pushable": {
        "is_pushable": false,
        "is_pushable_by_piston": false
      },
      // Bee-like slow floating movement
      "minecraft:movement": {
        "value": 0.08  // Very slow (butterflies ~0.3-0.5)
      },
      "minecraft:navigation.hover": {
        "can_path_over_water": true,
        "can_sink": false,
        "can_pass_doors": false,
        "can_path_from_air": true,
        "avoid_water": true,
        "avoid_damage_blocks": true,
        "avoid_sun": false
      },
      "minecraft:movement.hover": {},
      "minecraft:behavior.float": {
        "priority": 0
      },
      "minecraft:behavior.random_fly": {
        "priority": 1,
        "xz_dist": 8,
        "y_dist": 3,
        "y_offset": 0,
        "speed_multiplier": 0.5,
        "can_land_on_trees": false,
        "avoid_damage_blocks": true
      },
      "minecraft:timer": {
        "looping": false,
        "time": 2400,  // 2 minutes
        "time_down_event": {
          "event": "monarch:despawn_seed"
        }
      }
    },
    "events": {
      "monarch:despawn_seed": {
        "add": {
          "component_groups": ["monarch:despawn"]
        }
      },
      "monarch:rain_detected": {
        "remove": {
          "component_groups": ["monarch:floating"]
        },
        "add": {
          "component_groups": ["monarch:falling"]
        }
      }
    },
    "component_groups": {
      "monarch:despawn": {
        "minecraft:instant_despawn": {}
      },
      "monarch:floating": {
        // Default components above
      },
      "monarch:falling": {
        "minecraft:physics": {
          "has_gravity": true,  // Gravity enabled
          "has_collision": false
        }
      }
    }
  }
}
```

**Technical Notes:**
- **Floating Phase:** Uses hover movement components (same as butterflies, but much slower)
- **Rain Detection:** Script monitors weather, fires `monarch:rain_detected` event
- **Falling Phase:** Gravity enabled via component group swap, falls quickly
- **Collision:** Script handles ground detection and planting logic

---

### 2. CREATE: Seed Entity Client Definition

**File:** `resource-packs/monarch_garden/entity/milkweed_seed_entity.entity.json`

```json
{
  "format_version": "1.10.0",
  "minecraft:client_entity": {
    "description": {
      "identifier": "monarch:milkweed_seed_entity",
      "materials": {
        "default": "entity_alphablend"
      },
      "textures": {
        "default": "textures/entity/milkweed_seed"
      },
      "geometry": {
        "default": "geometry.milkweed_seed"
      },
      "animations": {
        "float": "animation.milkweed_seed.float"
      },
      "scripts": {
        "animate": [
          "float"
        ]
      },
      "render_controllers": ["controller.render.default"]
    }
  }
}
```

---

### 3. CREATE: Seed Geometry

**File:** `resource-packs/monarch_garden/models/entity/milkweed_seed.geo.json`

**Design:**
- Small seed body (oval, ~2x2x1 pixels)
- Fluffy "parachute" above (3-4 thin strands radiating up)
- Total height ~6 pixels

**Structure:**
```json
{
  "format_version": "1.12.0",
  "minecraft:geometry": [
    {
      "description": {
        "identifier": "geometry.milkweed_seed",
        "texture_width": 16,
        "texture_height": 16
      },
      "bones": [
        {
          "name": "seed",
          "pivot": [0, 0, 0],
          "cubes": [
            {
              "origin": [-1, 0, -0.5],
              "size": [2, 2, 1],
              "uv": [0, 0]
            }
          ]
        },
        {
          "name": "silk1",
          "parent": "seed",
          "pivot": [0, 2, 0],
          "cubes": [
            {
              "origin": [-0.25, 2, -0.25],
              "size": [0.5, 4, 0.5],
              "uv": [4, 0]
            }
          ]
        }
        // Additional silk strands at angles
      ]
    }
  ]
}
```

---

### 4. CREATE: Seed Texture

**File:** `resource-packs/monarch_garden/textures/entity/milkweed_seed.png`

**Size:** 16x16 pixels

**Design:**
- Seed: Brown/tan oval
- Silk: White/cream semi-transparent
- Fluffy appearance

**Creation Method:**
- Programmatic generation via Python/PIL
- Or hand-drawn if you prefer

---

### 5. CREATE: Seed Animations

**File:** `resource-packs/monarch_garden/animations/milkweed_seed.animation.json`

**A. Float Animation** (gentle bobbing)
```json
{
  "format_version": "1.8.0",
  "animations": {
    "animation.milkweed_seed.float": {
      "loop": true,
      "animation_length": 3.0,
      "bones": {
        "seed": {
          "position": {
            "0.0": [0, 0, 0],
            "1.5": [0, 0.2, 0],
            "3.0": [0, 0, 0]
          }
        }
      }
    }
  }
}
```

**B. Tumble Animation** (rotation)
```json
{
  "animation.milkweed_seed.tumble": {
    "loop": true,
    "animation_length": 4.0,
    "bones": {
      "seed": {
        "rotation": {
          "0.0": [0, 0, 0],
          "4.0": [0, 360, 0]
        }
      }
    }
  }
}
```

---

### 6. MODIFY: Milkweed Block - Add Seed Release

**File:** `behavior-packs/monarch_garden/blocks/milkweed.json`

**No changes to JSON needed** - handle in script

---

### 7. MODIFY: Custom Component Script

**File:** `behavior-packs/monarch_garden/scripts/main.ts`

#### A. Add Seed Release Logic to Growable Component

```typescript
// In milkweed growable component onTick
onTick(args: BlockCustomComponentTickEvent) {
  const block = args.block;
  const dimension = args.dimension;
  const growthStage = block.permutation.getState('monarch:growth_stage');
  
  // Existing growth logic...
  
  // NEW: Seed release for mature plants
  if (growthStage === 2 && shouldReleaseSeed(block.location)) {
    releaseSeed(dimension, block.location);
  }
}

function shouldReleaseSeed(location: Vector3): boolean {
  // Random chance + cooldown
  const key = `seed_cooldown_${location.x}_${location.y}_${location.z}`;
  const lastRelease = world.getDynamicProperty(key) as number ?? 0;
  const currentTick = system.currentTick;
  
  // Release seed every ~5 minutes + randomness
  if (currentTick - lastRelease > 6000) {
    if (Math.random() < 0.001) { // 0.1% per tick
      world.setDynamicProperty(key, currentTick);
      return true;
    }
  }
  return false;
}

function releaseSeed(dimension: Dimension, blockLocation: Vector3) {
  // Spawn seed entity above block
  const spawnLocation = {
    x: blockLocation.x + 0.5,
    y: blockLocation.y + 1.5,
    z: blockLocation.z + 0.5
  };
  
  const seed = dimension.spawnEntity('monarch:milkweed_seed_entity', spawnLocation);
  
  // Give seed initial horizontal velocity (wind)
  const windX = (Math.random() - 0.5) * 0.2;
  const windZ = (Math.random() - 0.5) * 0.2;
  seed.applyImpulse({ x: windX, y: 0, z: windZ });
  
  // Particle effect
  dimension.spawnParticle('minecraft:crop_growth_emitter', spawnLocation);
}
```

#### B. Add Seed Landing Detection & Rain Detection

```typescript
// New system run - checks seed entities every tick
system.runInterval(() => {
  const overworld = world.getDimension('overworld');
  const isRaining = overworld.getWeather() === 'Rain' || overworld.getWeather() === 'Thunder';
  
  const seeds = overworld.getEntities({
    type: 'monarch:milkweed_seed_entity'
  });
  
  for (const seed of seeds) {
    // Rain detection - enable gravity
    if (isRaining) {
      seed.triggerEvent('monarch:rain_detected');
    }
    
    // Player proximity collection
    checkPlayerCollection(seed, overworld);
    
    // Landing detection
    checkSeedLanding(seed, overworld);
  }
}, 1); // Every tick

function checkPlayerCollection(seed: Entity, dimension: Dimension) {
  const nearbyPlayers = dimension.getPlayers({
    location: seed.location,
    maxDistance: 1.5
  });
  
  if (nearbyPlayers.length > 0) {
    const player = nearbyPlayers[0];
    const inventory = player.getComponent('inventory') as EntityInventoryComponent;
    
    if (inventory && inventory.container) {
      // Try to add seed to inventory
      const remainder = inventory.container.addItem(new ItemStack('monarch:milkweed_seeds', 1));
      
      if (!remainder) {
        // Successfully added - remove seed entity
        seed.remove();
        
        // Play collection sound
        dimension.playSound('random.pop', seed.location);
      }
    }
  }
}

function checkSeedLanding(seed: Entity, dimension: Dimension) {
  const location = seed.location;
  const blockBelow = dimension.getBlock({
    x: Math.floor(location.x),
    y: Math.floor(location.y) - 1,
    z: Math.floor(location.z)
  });
  
  if (!blockBelow) return;
  
  // Check if seed is on ground (low velocity)
  const velocity = seed.getVelocity();
  if (Math.abs(velocity.y) < 0.1 && Math.abs(velocity.x) < 0.1 && Math.abs(velocity.z) < 0.1) {
    handleSeedLanded(seed, blockBelow, dimension);
  }
}

function handleSeedLanded(seed: Entity, groundBlock: Block, dimension: Dimension) {
  const groundType = groundBlock.typeId;
  
  // Valid planting surfaces
  if (groundType === 'minecraft:grass_block' || 
      groundType === 'minecraft:dirt' ||
      groundType === 'minecraft:farmland') {
    
    // Check if block above is air
    const plantLocation = {
      x: groundBlock.location.x,
      y: groundBlock.location.y + 1,
      z: groundBlock.location.z
    };
    const blockAbove = dimension.getBlock(plantLocation);
    
    if (blockAbove && blockAbove.typeId === 'minecraft:air') {
      // Plant milkweed!
      const milkweedPermutation = BlockPermutation.resolve('monarch:milkweed', {
        'monarch:growth_stage': 0,
        'monarch:lifecycle_stage': 0
      });
      blockAbove.setPermutation(milkweedPermutation);
      
      // Particle effect
      dimension.spawnParticle('minecraft:crop_growth_emitter', plantLocation);
      
      // Remove seed entity
      seed.remove();
    } else {
      // Can't plant, despawn
      seed.remove();
    }
  } else {
    // Wrong surface, despawn after brief delay
    system.runTimeout(() => {
      if (seed.isValid()) {
        seed.remove();
      }
    }, 40); // 2 seconds
  }
}
```

---

### 8. OPTIONAL: Wind Direction System

**File:** `behavior-packs/monarch_garden/scripts/wind_system.ts` (new)

**Concept:** Global wind direction that changes periodically

```typescript
export class WindSystem {
  private static windDirection = { x: 0.1, z: 0.1 };
  private static lastChange = 0;
  
  static init() {
    system.runInterval(() => {
      this.updateWind();
    }, 600); // Update every 30 seconds
  }
  
  static updateWind() {
    // Gradual wind direction change
    const angle = Math.random() * Math.PI * 2;
    const strength = 0.05 + Math.random() * 0.15;
    
    this.windDirection = {
      x: Math.cos(angle) * strength,
      z: Math.sin(angle) * strength
    };
  }
  
  static getWind() {
    return this.windDirection;
  }
}

// Use in releaseSeed function:
const wind = WindSystem.getWind();
seed.applyImpulse({ x: wind.x, y: 0, z: wind.z });
```

---

### 9. UPDATE: Language File

**File:** `resource-packs/monarch_garden/texts/en_US.lang`

```
entity.monarch:milkweed_seed_entity.name=Milkweed Seed
```

---

### 10. MODIFY: Keep Manual Planting

**File:** `items/milkweed_seeds.json`

**No changes needed** - existing item continues to work for manual planting

**Ensures:**
- Players can still collect and plant seeds manually
- Seeds from loot tables work as before
- Automatic dispersal is ADDITIONAL, not replacement

---

## Configuration Constants

**File:** `behavior-packs/monarch_garden/scripts/seed_config.ts` (new)

```typescript
export const SeedConfig = {
  // Seed release timing
  RELEASE_COOLDOWN: 6000,        // 5 minutes between seeds per plant
  RELEASE_CHANCE: 0.001,         // 0.1% per tick when cooldown passed
  
  // Seed movement
  SEED_FLOAT_SPEED: 0.08,        // Bee-like slow hover speed
  SEED_RANDOM_FLY_RANGE: 8,      // XZ distance for random flying
  SEED_Y_RANGE: 3,               // Vertical range for flying
  
  // Seed lifetime
  SEED_DESPAWN_TIME: 2400,       // 2 minutes
  
  // Valid planting surfaces
  PLANT_ON_BLOCKS: [
    'minecraft:grass_block',
    'minecraft:dirt', 
    'minecraft:farmland'
  ],
  
  // Player collection
  COLLECTION_RANGE: 1.5,           // Distance for auto-collection
  
  // Landing detection
  LANDING_VELOCITY_THRESHOLD: 0.1  // Consider landed if all velocity < this
};
```

---

## Implementation Phases

### Phase 1: Entity Setup
1. ✅ Create seed entity behavior file with hover movement components
2. ✅ Create seed entity client file
3. ✅ Create placeholder geometry (simple cube)
4. ✅ Test: Seed entity spawns and floats slowly like bee

### Phase 2: Visual Polish
5. ✅ Create proper seed geometry (seed + silk parachute)
6. ✅ Create seed texture
7. ✅ Add float animation
8. ✅ Test: Seed looks good floating

### Phase 3: Release Mechanism
9. ✅ Add seed release logic to milkweed component
10. ✅ Add cooldown tracking
11. ✅ Test: Mature milkweed releases seeds periodically

### Phase 4: Rain Detection & Falling
12. ✅ Implement rain detection script
13. ✅ Fire event to enable gravity when raining
14. ✅ Test: Seeds fall quickly when it rains

### Phase 5: Landing & Planting
15. ✅ Implement landing detection script
16. ✅ Implement auto-planting logic
17. ✅ Test: Seeds plant on grass/dirt
18. ✅ Test: Seeds despawn on invalid surfaces

### Phase 6: Wind & Polish (Optional)
19. ✅ Add wind system if desired
20. ✅ Tune release frequency
21. ✅ Add particle effects
22. ✅ Full testing

---

## Testing Checklist

- [ ] Seed entity spawns above mature milkweed
- [ ] Seed floats slowly around in bee-like pattern
- [ ] **Player auto-collects seed by walking near it (1.5 block range)**
- [ ] Collection plays sound and adds seed to inventory
- [ ] Seed doesn't fall while weather is clear
- [ ] When it starts raining, seed falls quickly
- [ ] Seed plants milkweed when landing on grass
- [ ] Seed plants milkweed when landing on dirt
- [ ] Seed plants milkweed when landing on farmland
- [ ] Seed despawns when landing on stone/other blocks (not collectible after landing)
- [ ] Seed despawns after 2 minutes if not landed
- [ ] Multiple seeds can be floating simultaneously
- [ ] Manual seed planting still works (existing item)
- [ ] Seeds don't spawn too frequently (cooldown works)
- [ ] Seeds don't spawn from immature milkweed
- [ ] Seed entity doesn't collide with player/mobs
- [ ] Performance: 10+ seeds floating doesn't cause lag

---

## Technical Challenges & Solutions

### Challenge 1: Bee-like Floating Movement
**Problem:** Need slow, random floating pattern  
**Solution:** Use `movement.hover` + `navigation.hover` + `behavior.random_fly` with very slow speed (0.08)

### Challenge 2: Rain Detection
**Problem:** Need to detect when it's raining  
**Solution:** Script checks `dimension.getWeather()` every tick, triggers event when raining

### Challenge 3: Switching Physics
**Problem:** Need gravity off while floating, on when raining  
**Solution:** Use component groups - swap from floating group to falling group via event

### Challenge 4: Landing Detection
**Problem:** No built-in "on ground" event for entities  
**Solution:** Script checks velocity every tick, considers landed when all velocity < 0.1

### Challenge 5: Planting Block
**Problem:** Entities can't directly place blocks  
**Solution:** Script handles block placement when landing detected

### Challenge 6: Too Many Seeds
**Problem:** Every mature milkweed releasing seeds = spam  
**Solution:** Long cooldown (5 min) + low random chance per tick

---

## Performance Considerations

**Entity Count:**
- With 100 mature milkweeds and 5-minute cooldown: ~20 seeds floating at once
- Each seed exists max 2 minutes
- Should be fine for performance

**Script Frequency:**
- Rain and landing detection runs every tick for active seeds
- Minimal performance impact with proper velocity checks

**Optimization:**
```typescript
// Only check landing for seeds that have low velocity
if (Math.abs(velocity.y) < 0.2) {
  checkSeedLanding(seed, dimension);
}
```

---

## File Summary

### Files to CREATE (5)
- `entities/milkweed_seed_entity.json` (behavior)
- `entity/milkweed_seed_entity.entity.json` (resource)
- `models/entity/milkweed_seed.geo.json`
- `textures/entity/milkweed_seed.png`
- `animations/milkweed_seed.animation.json`
- `scripts/seed_config.ts`

### Files to MODIFY (2)
- `scripts/main.ts` - Add seed release, rain detection, and landing logic
- `texts/en_US.lang` - Add entity name

### Files UNCHANGED (3)
- `items/milkweed_seeds.json` - Keep for manual planting
- `loot_tables/blocks/milkweed_mature.json` - Keep for player harvesting
- `textures/items/milkweed_seeds.png` - Keep for item icon

---

## Open Questions

1. **Release Frequency:** 5 minutes per plant too slow/fast?
   - Real monarch lays ~400 eggs over lifetime
   - Game balance vs realism

2. **Wind Consistency:** Should wind be global (all seeds drift same direction) or per-seed random?
   - Global = more realistic
   - Random = simpler implementation

3. **Player Interaction:** Should players be able to catch floating seeds before they land?
   - If yes: seed needs to be collectible mid-air
   - If no: ignore player collision

4. **Visual Scale:** Should seed entity be visible from distance or very small/subtle?
   - Large = easier to see
   - Small/realistic = more immersive

5. **Sound Effects:** Should seed release make a sound?
   - Real milkweed pods "pop" when opening
   - Could add subtle sound on release

---

*Document created: January 22, 2026*
*Status: Ready for review and implementation*
