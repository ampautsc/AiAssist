# Verified Minecraft Bedrock Patterns

**CRITICAL: Copy from these files, don't write from memory.**

These patterns are extracted from:
1. Working code in Monarch Garden addon
2. Official Minecraft bedrock-samples (GitHub)
3. Microsoft Learn docs (verified January 2026)

## Usage Rules

1. **ALWAYS check this folder first** before writing new Minecraft JSON/scripts
2. **Copy and modify** - don't write from scratch
3. **If a pattern doesn't exist here** - research it first, add it here, THEN use it
4. **Validate JSON** before packaging - use `validate_addon.py`
5. **Check COMMON_MISTAKES.md** before making any changes

## Quick Reference Files

- [COMMON_MISTAKES.md](./COMMON_MISTAKES.md) - **READ THIS FIRST** - Errors to avoid
- [PREFLIGHT_CHECKLIST.md](./PREFLIGHT_CHECKLIST.md) - Validation checklist before packaging
- [EVENT_TRIGGERS_MASTER_LIST.md](./EVENT_TRIGGERS_MASTER_LIST.md) - 🎯 **ALL EVENT TRIGGERS** - Comprehensive list

## Index

### Entities (Behavior Pack)
- [entity-basic.json](./entities/entity-basic.json) - Simple entity with physics, health, damage_sensor
- [entity-sensor.json](./entities/entity-sensor.json) - Entity with minecraft:entity_sensor (**subsensors pattern!**)
- [entity-invisible.json](./entities/entity-invisible.json) - Invisible utility entity
- [damage-sensor-examples.json](./entities/damage-sensor-examples.json) - Official damage_sensor patterns

### Entities (Resource Pack / Client)
- [client-entity-basic.json](./client-entities/client-entity-basic.json) - Basic visible entity
- [client-entity-invisible.json](./client-entities/client-entity-invisible.json) - Invisible entity (no rendering)

### Blocks
- [block-basic.json](./blocks/block-basic.json) - Simple custom block
- [block-with-states.json](./blocks/block-with-states.json) - Block with states and permutations
- [block-custom-geometry.json](./blocks/block-custom-geometry.json) - Block with custom model
- [material-instances-examples.json](./blocks/material-instances-examples.json) - Official material_instances patterns

### Scripts
- [script-events.js](./scripts/script-events.js) - Available events (and what's REMOVED)
- [script-custom-components.js](./scripts/script-custom-components.js) - Block custom component pattern
- [event-patterns.js](./scripts/event-patterns.js) - 📋 **COPY-PASTE READY** event subscription patterns

### Geometry
- [geometry-block.json](./geometry/geometry-block.json) - Block geometry with UV mapping
- [geometry-invisible.json](./geometry/geometry-invisible.json) - Empty geometry for invisible entities

### Textures
- [terrain_texture.json](./textures/terrain_texture.json) - Block texture definitions
- [item_texture.json](./textures/item_texture.json) - Item texture definitions

### Manifests
- [manifest-patterns.json](./manifests/manifest-patterns.json) - BP/RP manifest templates

## Critical Notes from Official Docs

### 1.21.80+ Requirement
> From 1.21.80 onward, when using a `minecraft:geometry` component or `minecraft:material_instances` component, you must include **BOTH**.

### entity_sensor Uses Subsensors
Properties like `range`, `event`, `event_filters` go INSIDE `subsensors` array, NOT directly on the component.

### damage_sensor triggers: Object OR Array
Both formats are valid - Bat uses object, Bee uses array.

### Stable Script API (2.0.0)
- ❌ `world.beforeEvents.chatSend` - REMOVED
- ❌ `world.afterEvents.blockBreak` - Use `playerBreakBlock`
- ✅ `world.afterEvents.playerBreakBlock` - Correct
- ✅ `world.afterEvents.playerPlaceBlock` - Correct

### BlockCustomComponent Methods
- `onBreak` - Not `onPlayerDestroy`
- `onPlayerBreak` - When player breaks
- Must wrap state changes in `system.run()`
