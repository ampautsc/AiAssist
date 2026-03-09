# 🎯 Minecraft Bedrock Event Triggers Master List

> **GOLD STANDARD: Events over Polling!**  
> This is the definitive list of ALL event triggers available in Minecraft Bedrock.  
> Use these to build reactive, event-driven addons that don't waste CPU on polling.

---

## Table of Contents
1. [Script API World Events (afterEvents)](#1-script-api-world-events-afterevents)
2. [Script API World Events (beforeEvents)](#2-script-api-world-events-beforeevents)
3. [Script API System Events](#3-script-api-system-events)
4. [Block Custom Component Events](#4-block-custom-component-events)
5. [Item Custom Component Events](#5-item-custom-component-events)
6. [Entity Sensor Components (Data-Driven)](#6-entity-sensor-components-data-driven)
7. [Entity Filter Tests (for environment_sensor, scheduler, etc.)](#7-entity-filter-tests)
8. [Animation Controller Events](#8-animation-controller-events)
9. [Quick Reference: Event Selection Guide](#9-quick-reference-event-selection-guide)

---

## 1. Script API World Events (afterEvents)

**Access:** `world.afterEvents.<eventName>.subscribe(callback)`  
**Best For:** Reacting to things that already happened

| Event | Description | Use Case |
|-------|-------------|----------|
| `blockExplode` | Block destroyed by explosion | Explosion damage tracking |
| `buttonPush` | Button is pushed | Redstone automation triggers |
| `dataDrivenEntityTrigger` | Entity event fired from JSON | Bridge JSON ↔ Script |
| `effectAdd` | Effect added to entity | Poison/buff detection |
| `entityDie` | Entity dies | Death handling, loot spawning |
| `entityHealthChanged` | Health changes any amount | Health monitoring |
| `entityHitBlock` | Entity melees a block | Mining detection |
| `entityHitEntity` | Entity melees another entity | Combat detection |
| `entityHurt` | Entity takes damage | Damage tracking, shields |
| `entityLoad` | Entity loads into world | Entity initialization |
| `entityRemove` | Entity unloads/killed | Cleanup, tracking |
| `entitySpawn` | Entity spawns | Spawn tracking, welcome messages |
| `explosion` | Explosion occurs | Explosion handling |
| `gameRuleChange` | Gamerule changes | Settings sync |
| `itemCompleteUse` | Chargeable item finishes | Bow fully drawn |
| `itemReleaseUse` | Chargeable item released | Bow released |
| `itemStartUse` | Chargeable item starts | Bow drawing started |
| `itemStartUseOn` | Item used on block (start) | Block placement start |
| `itemStopUse` | Chargeable item stops | Bow canceled |
| `itemStopUseOn` | Item use on block stops | Block placement done |
| `itemUse` | Item successfully used | Item use tracking |
| `leverAction` | Lever pulled | Redstone automation |
| `pistonActivate` | Piston extends/retracts | Redstone mechanics |
| `playerBreakBlock` | Player breaks block | Mining, protection |
| `playerButtonInput` | 🆕 InputButton state changes | Custom controls |
| `playerDimensionChange` | Player changes dimension | Dimension-specific logic |
| `playerEmote` | Player uses emote | Social features |
| `playerGameModeChange` | Gamemode changes | Mode-specific features |
| `playerHotbarSelectedSlotChange` | 🆕 Hotbar slot changes | Toolbar monitoring |
| `playerInputModeChange` | 🆕 Input mode changes | Controller/keyboard detection |
| `playerInputPermissionCategoryChange` | Input permissions change | Permission tracking |
| `playerInteractWithBlock` | Player interacts with block | Custom block interaction |
| `playerInteractWithEntity` | Player interacts with entity | NPC dialogs, trading |
| `playerInventoryItemChange` | 🆕 Inventory item changes | Inventory tracking |
| `playerJoin` | Player joins world | Welcome, setup |
| `playerLeave` | Player leaves world | Cleanup, save |
| `playerPlaceBlock` | Player places block | Build tracking, protection |
| `playerSpawn` | Player spawns/respawns | Spawn handling |
| `pressurePlatePop` | Pressure plate releases | Trap resets |
| `pressurePlatePush` | Pressure plate pressed | Trap triggers, doors |
| `projectileHitBlock` | Projectile hits block | Arrow impact, splash |
| `projectileHitEntity` | Projectile hits entity | Arrow damage, effects |
| `targetBlockHit` | Target block hit | Target practice scoring |
| `tripWireTrip` | Tripwire triggered | Trap triggers |
| `weatherChange` | Weather changes | Weather-based mechanics |
| `worldLoad` | 🆕 World loads | Initial setup |

### Example: Subscribing to Events
```javascript
import { world } from "@minecraft/server";

// Player joins
world.afterEvents.playerJoin.subscribe((event) => {
    const player = event.playerName;
    world.sendMessage(`Welcome, ${player}!`);
});

// Block broken
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const block = event.brokenBlockPermutation.type.id;
    const player = event.player.name;
    console.log(`${player} broke ${block}`);
});

// Entity spawns (with filter)
world.afterEvents.entitySpawn.subscribe((event) => {
    if (event.entity.typeId === "minecraft:zombie") {
        // Handle zombie spawn
    }
});
```

---

## 2. Script API World Events (beforeEvents)

**Access:** `world.beforeEvents.<eventName>.subscribe(callback)`  
**Best For:** Canceling or modifying actions BEFORE they happen  
**⚠️ LIMITATION:** Cannot modify gameplay state in beforeEvents (no spawning, teleporting, etc.)

| Event | Description | Can Cancel? |
|-------|-------------|-------------|
| `effectAdd` | Before effect is added | ✅ Yes |
| `entityRemove` | Before entity removed | ❌ No |
| `explosion` | Before explosion | ✅ Yes (cancel/modify blocks) |
| `itemUse` | Before item used | ✅ Yes |
| `playerBreakBlock` | Before block broken | ✅ Yes |
| `playerGameModeChange` | Before gamemode changes | ✅ Yes |
| `playerInteractWithBlock` | Before block interaction | ✅ Yes |
| `playerInteractWithEntity` | Before entity interaction | ✅ Yes |
| `playerLeave` | Before player leaves | ❌ No |
| `weatherChange` | Before weather changes | ✅ Yes |

### Example: Canceling Actions
```javascript
import { world } from "@minecraft/server";

// Prevent breaking diamond blocks
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (event.block.typeId === "minecraft:diamond_block") {
        event.cancel = true;
        // Note: Cannot use world.sendMessage here - it's a beforeEvent!
    }
});

// Prevent explosions from destroying blocks
world.beforeEvents.explosion.subscribe((event) => {
    event.setImpactedBlocks([]); // No blocks destroyed
});
```

---

## 3. Script API System Events

**Access:** `system.afterEvents.<eventName>.subscribe(callback)`

| Event | Description | Use Case |
|-------|-------------|----------|
| `scriptEventReceive` | `/scriptevent` command fired | Command → Script bridge |

### Example: Custom Commands via /scriptevent
```javascript
import { system } from "@minecraft/server";

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "monarch:spawn_butterfly") {
        const player = event.sourceEntity;
        // Handle custom command
    }
});
```

**In-game:** `/scriptevent monarch:spawn_butterfly`

---

## 4. Block Custom Component Events

**Registration:** `world.beforeEvents.worldInitialize` → `blockRegistry.registerCustomComponent()`  
**Best For:** Custom block behaviors without polling

| Method | Trigger | Use Case |
|--------|---------|----------|
| `beforeOnPlayerPlace` | Before player places | Validate placement |
| `onPlace` | Block placed | Initialize block state |
| `onBreak` | Block destroyed (any cause) | Cleanup, drops |
| `onPlayerBreak` | Player breaks block | Player-specific handling |
| `onPlayerInteract` | Player right-clicks | Custom UI, actions |
| `onStepOn` | Entity steps on block | Pressure plates, traps |
| `onStepOff` | Entity steps off block | Trap reset |
| `onEntityFallOn` | Entity falls onto block | Fall damage modification |
| `onRandomTick` | Random tick occurs | Crop growth, decay |
| `onTick` | 🆕 Block ticks | Regular updates (use sparingly!) |
| `onRedstoneUpdate` | Redstone signal changes | Redstone-powered blocks |

### Example: Block Custom Component
```javascript
import { world } from "@minecraft/server";

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.blockRegistry.registerCustomComponent("monarch:glowing_block", {
        onPlayerInteract(event, params) {
            const player = event.player;
            const block = event.block;
            world.sendMessage(`${player.name} interacted with glow block!`);
        },
        onStepOn(event, params) {
            const entity = event.entity;
            if (entity.typeId === "minecraft:player") {
                // Player stepped on the block
            }
        },
        onRedstoneUpdate(event, params) {
            // Requires minecraft:redstone_consumer component on block
            const powered = event.isPowered;
        }
    });
});
```

---

## 5. Item Custom Component Events

**Registration:** `world.beforeEvents.worldInitialize` → `itemRegistry.registerCustomComponent()`  
**Best For:** Custom item behaviors

| Method | Trigger | Use Case |
|--------|---------|----------|
| `onBeforeDurabilityDamage` | Before durability lost | Modify durability loss |
| `onCompleteUse` | Use duration completed | Food eaten, bow fully drawn |
| `onConsume` | Item eaten | Food effects |
| `onHitEntity` | Item hits entity | Weapon effects |
| `onMineBlock` | Item mines block | Tool bonuses |
| `onUse` | Item used | General use handling |
| `onUseOn` | Item used on block | Placement, interactions |

### Example: Item Custom Component
```javascript
import { world } from "@minecraft/server";

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.itemRegistry.registerCustomComponent("monarch:magic_wand", {
        onUse(event, params) {
            const player = event.source;
            world.sendMessage(`${player.name} waved the magic wand!`);
        },
        onHitEntity(event, params) {
            const target = event.hitEntity;
            target.addEffect("levitation", 60, { amplifier: 1 });
        }
    });
});
```

---

## 6. Entity Sensor Components (Data-Driven)

**Best For:** Pure JSON triggers without scripting

### minecraft:entity_sensor
Detects entities within range.

```json
"minecraft:entity_sensor": {
    "subsensors": [
        {
            "range": [10, 10],
            "minimum_count": 1,
            "event_filters": {
                "test": "is_family",
                "value": "player"
            },
            "event": "monarch:player_nearby"
        }
    ]
}
```

### minecraft:environment_sensor
Continuously monitors environment conditions.

```json
"minecraft:environment_sensor": {
    "triggers": [
        {
            "filters": { "test": "is_daytime", "value": false },
            "event": "monarch:become_active"
        },
        {
            "filters": { "test": "in_water" },
            "event": "monarch:enter_water"
        }
    ]
}
```

### minecraft:damage_sensor
Triggers on taking damage.

```json
"minecraft:damage_sensor": {
    "triggers": [
        {
            "cause": "fire",
            "deals_damage": false,
            "on_damage": { "event": "monarch:immune_to_fire" }
        },
        {
            "on_damage": { "event": "monarch:took_damage" }
        }
    ]
}
```

### minecraft:timer
One-shot or repeating timer.

```json
"minecraft:timer": {
    "looping": true,
    "time": [5, 10],
    "randomInterval": true,
    "time_down_event": { "event": "monarch:timer_expired" }
}
```

### minecraft:scheduler
Time-of-day based scheduling.

```json
"minecraft:scheduler": {
    "min_delay_secs": 0,
    "max_delay_secs": 10,
    "scheduled_events": [
        {
            "filters": {
                "all_of": [
                    { "test": "hourly_clock_time", "operator": ">=", "value": 0 },
                    { "test": "hourly_clock_time", "operator": "<", "value": 12000 }
                ]
            },
            "event": "monarch:daytime_behavior"
        }
    ]
}
```

### minecraft:interact
Player interaction events.

```json
"minecraft:interact": {
    "interactions": [
        {
            "on_interact": {
                "filters": {
                    "test": "has_equipment",
                    "domain": "hand",
                    "value": "wheat"
                },
                "event": "monarch:fed_wheat"
            },
            "use_item": true,
            "interact_text": "action.interact.feed"
        }
    ]
}
```

---

## 7. Entity Filter Tests

**Use With:** `environment_sensor`, `scheduler`, `interact`, `damage_sensor`, `entity_sensor`

### State Tests
| Filter | Description |
|--------|-------------|
| `is_daytime` | True during day (6000-18000) |
| `is_sleeping` | Entity is sleeping |
| `is_sneaking` | Entity is sneaking |
| `is_sprinting` | Entity is sprinting |
| `is_moving` | Entity is moving |
| `is_swimming` | Entity is swimming |
| `is_climbing` | Entity is climbing |
| `is_panicking` | Entity is panicking |
| `is_sitting` | Entity is sitting |
| `is_baby` | Entity is baby |
| `on_fire` | Entity is on fire |
| `on_ground` | Entity is on ground |
| `in_water` | Entity is in water |
| `in_water_or_rain` | Entity in water or rain |
| `in_lava` | Entity is in lava |
| `in_nether` | Entity is in Nether |
| `in_overworld` | Entity is in Overworld |
| `is_underground` | Entity is underground |
| `is_underwater` | Entity is underwater |

### Property Tests
| Filter | Description |
|--------|-------------|
| `bool_property` | Test bool actor property |
| `int_property` | Test int actor property |
| `float_property` | Test float actor property |
| `enum_property` | Test enum actor property |
| `has_property` | Test if property exists |
| `has_tag` | Entity has tag |
| `has_component` | Entity has component |
| `has_target` | Entity has valid target |
| `has_mob_effect` | Entity has effect |
| `has_equipment` | Entity has item in slot |

### Environment Tests
| Filter | Description |
|--------|-------------|
| `is_brightness` | Light level (0.0-1.0) |
| `light_level` | Light level (0-16) |
| `is_altitude` | Y position test |
| `is_biome` | Current biome |
| `has_biome_tag` | Biome tag test |
| `is_temperature_type` | Temperature type |
| `is_humidity` | Humidity test |
| `weather` | Current weather |
| `weather_at_position` | Weather at entity |
| `moon_phase` | Moon phase (0-7) |
| `hourly_clock_time` | Time (0-24000) |
| `clock_time` | Normalized time (0.0-1.0) |

### Relationship Tests  
| Filter | Description |
|--------|-------------|
| `is_family` | Entity family type |
| `is_owner` | Subject is owner |
| `is_target` | Subject is target |
| `is_riding` | Entity is riding |
| `is_leashed` | Entity is leashed |
| `distance_to_nearest_player` | Distance to player |
| `target_distance` | Distance to target |
| `home_distance` | Distance to home |

### Example: Complex Filter
```json
"filters": {
    "all_of": [
        { "test": "is_daytime", "value": false },
        { "test": "is_underground", "value": false },
        {
            "any_of": [
                { "test": "weather", "value": "clear" },
                { "test": "is_brightness", "operator": "<", "value": 0.5 }
            ]
        },
        { "test": "distance_to_nearest_player", "operator": "<", "value": 32 }
    ]
}
```

---

## 8. Animation Controller Events

**Best For:** Visual state-driven events

```json
{
    "format_version": "1.10.0",
    "animation_controllers": {
        "controller.animation.monarch_butterfly.movement": {
            "initial_state": "idle",
            "states": {
                "idle": {
                    "animations": ["idle"],
                    "transitions": [
                        { "flying": "query.is_moving" }
                    ],
                    "on_entry": ["@s monarch:became_idle"],
                    "on_exit": ["@s monarch:left_idle"]
                },
                "flying": {
                    "animations": ["fly"],
                    "transitions": [
                        { "idle": "!query.is_moving" }
                    ],
                    "on_entry": ["@s monarch:started_flying"]
                }
            }
        }
    }
}
```

Events fired:
- `on_entry`: When entering state
- `on_exit`: When leaving state

---

## 9. Quick Reference: Event Selection Guide

### "I want to detect when..."

| Scenario | Best Event/Method |
|----------|-------------------|
| Player joins | `world.afterEvents.playerJoin` |
| Player breaks block | `world.afterEvents.playerBreakBlock` |
| Player places block | `world.afterEvents.playerPlaceBlock` |
| Player right-clicks block | `world.afterEvents.playerInteractWithBlock` |
| Player right-clicks entity | `world.afterEvents.playerInteractWithEntity` |
| Entity spawns | `world.afterEvents.entitySpawn` |
| Entity dies | `world.afterEvents.entityDie` |
| Entity takes damage | `world.afterEvents.entityHurt` or `damage_sensor` |
| Entity health changes | `world.afterEvents.entityHealthChanged` |
| Player nearby entity | `minecraft:entity_sensor` |
| Time of day changes | `minecraft:scheduler` or `hourly_clock_time` filter |
| Weather changes | `world.afterEvents.weatherChange` |
| Entity enters water | `environment_sensor` + `in_water` filter |
| Brightness changes | `environment_sensor` + `is_brightness` filter |
| Button/lever activated | `world.afterEvents.buttonPush/leverAction` |
| Pressure plate stepped | `world.afterEvents.pressurePlatePush` |
| Tripwire triggered | `world.afterEvents.tripWireTrip` |
| Projectile hits | `world.afterEvents.projectileHitBlock/Entity` |
| Custom command | `system.afterEvents.scriptEventReceive` |
| Block randomly ticks | `BlockCustomComponent.onRandomTick` |
| Redstone signal | `BlockCustomComponent.onRedstoneUpdate` |
| Entity stepped on block | `BlockCustomComponent.onStepOn` |
| Item used on block | `ItemCustomComponent.onUseOn` |
| Item hits entity | `ItemCustomComponent.onHitEntity` |
| Timer expires | `minecraft:timer` component |
| After delay | `system.runTimeout()` |
| Repeating action | `system.runInterval()` (but prefer events!) |

### Priority Order (Most to Least Efficient)
1. **Script API afterEvents** - Native, fast, flexible
2. **Block/Item Custom Components** - Event-driven for custom content
3. **Data-Driven Sensors** - No script needed, good for entities
4. **system.runInterval** - Use sparingly, last resort for polling

---

## Version Info
- **Last Updated:** January 24, 2026
- **Minecraft Version:** 1.21.40+
- **@minecraft/server:** 2.0.0 stable
- **Source:** Official Microsoft Learn Documentation
