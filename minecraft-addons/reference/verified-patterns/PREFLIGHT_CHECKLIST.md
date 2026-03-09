# Pre-Flight Checklist for Minecraft Addon Changes

**USE THIS BEFORE PACKAGING. Check each item.**

## ⚠️ CRITICAL 1.21.80+ RULE
- [ ] If using `minecraft:geometry`, MUST also have `minecraft:material_instances`
- [ ] If using `minecraft:material_instances`, MUST also have `minecraft:geometry`

## JSON Validation

- [ ] All JSON files are valid (no trailing commas, proper quotes)
- [ ] Format version matches target engine (1.21.40 for 1.21.0+)
- [ ] All identifiers use `namespace:name` format

## Entity Behavior Pack

- [ ] `minecraft:entity_sensor` uses `subsensors` array (NOT flat properties)
- [ ] `minecraft:damage_sensor.triggers` - object OR array (both valid)
- [ ] Filter tests include `"subject": "other"` when checking other entities
- [ ] Events referenced in components exist in `events` section

## Entity Resource Pack (Client)

- [ ] `geometry.default` matches EXACT identifier from geometry file
- [ ] Texture paths exist in textures folder
- [ ] Animations referenced exist in animations folder

## Blocks

- [ ] Textures referenced in `material_instances` exist in `terrain_texture.json`
- [ ] Custom geometry identifier matches geometry file exactly
- [ ] All render_methods are consistent (don't mix opaque/blend/alpha_test on same block)
- [ ] States values are arrays: `"my_state": [0, 1, 2]` not `"my_state": 3`
- [ ] **1.21.80+**: Both geometry AND material_instances present together

## Scripts

- [ ] Only using stable API events (see script-events.js for list)
- [ ] NOT using `world.beforeEvents.chatSend` (REMOVED)
- [ ] NOT using `world.afterEvents.blockBreak` (use `playerBreakBlock`)
- [ ] Using `onBreak` not `onPlayerDestroy` in custom components
- [ ] State changes wrapped in `system.run()` 
- [ ] All subscriptions wrapped in try-catch for safety

## Textures

- [ ] All textures referenced in blocks exist in `terrain_texture.json`
- [ ] All textures referenced in items exist in `item_texture.json`
- [ ] Texture files are PNG format
- [ ] Paths in texture JSONs don't include file extension

## Manifests

- [ ] BP and RP versions match
- [ ] BP dependency on RP has correct UUID and version
- [ ] RP dependency on BP has correct UUID and version
- [ ] Script module version matches BP version

## Geometry

- [ ] Identifier format: `geometry.namespace.name` or `geometry.name`
- [ ] Client entity references match geometry identifier EXACTLY
- [ ] UV coordinates fit within texture_width/texture_height

## Quick Validation Commands

```powershell
# Validate JSON syntax (PowerShell)
Get-Content file.json | ConvertFrom-Json

# Search for common mistakes
Select-String -Path "*.json" -Pattern "sensor_range|event_filters.*:.*{" -Recurse
```
