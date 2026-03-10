# Minecraft Bedrock Block Development - Actual Knowledge

## Critical Lessons: January 19, 2026

### Lesson 1: READ THE ACTUAL ERROR MESSAGES
**What I did wrong:** Assumed the error was about `minecraft:geometry` component.
**What the error actually said:** "Unexpected version for the loaded data" - nothing about geometry.
**Why I was wrong:** I didn't read the errors, I made assumptions and went down a rabbit hole.

### Lesson 2: Block States Syntax
**THE ACTUAL ERROR:** Used wrong syntax for block states

**WRONG (What I did):**
```json
"states": {
  "monarch:growth_stage": {
    "values": { "min": 0, "max": 2 }
  }
}
```

**CORRECT (What it should be):**
```json
"properties": {
  "custom:growth_stage": [0, 1, 2]
}
```

**Key differences:**
- Use `"properties"` not `"states"`
- Values are an ARRAY `[0, 1, 2]`, not an object with `{ "min": 0, "max": 2 }`
- Both syntaxes exist in documentation but `properties` is the current standard

### Lesson 3: Official Documentation Sources
**Primary sources (in order of authority):**
1. **Microsoft Learn** - https://learn.microsoft.com/en-us/minecraft/creator/
   - Official Microsoft documentation
   - Most authoritative but sometimes behind current version
   
2. **bedrock.dev** - https://bedrock.dev/docs/stable/Blocks
   - Community-maintained
   - Usually more current than Microsoft docs
   - Good for seeing all available components in one place

### Lesson 4: Block Components - Confirmed Valid
From official sources, these components ARE valid for blocks:

**Physical:**
- `minecraft:collision_box` - Block collision area
- `minecraft:selection_box` - Selection/targeting area  
- `minecraft:destructible_by_mining` - Mining properties
- `minecraft:destructible_by_explosion` - Explosion resistance
- `minecraft:friction` - Movement friction (0.0-0.9)

**Visual:**
- `minecraft:geometry` - Custom geometry (must reference existing geometry in resource pack OR use vanilla: "minecraft:geometry.full_block" or "minecraft:geometry.cross")
- `minecraft:material_instances` - Texture mapping
- `minecraft:map_color` - Color on maps
- `minecraft:light_emission` - Light level (0-15)
- `minecraft:light_dampening` - Light blocking (0-15)
- `minecraft:display_name` - Localization key

**Behavior:**
- `minecraft:placement_filter` - Where block can be placed
- `minecraft:loot` - Loot table path
- `minecraft:flammable` - Fire properties
- `minecraft:random_ticking` - Random tick events
- `minecraft:queued_ticking` - Scheduled tick events

**Interactions (Trigger Components):**
- `minecraft:on_interact` - Player interaction
- `minecraft:on_step_on` - Entity steps on
- `minecraft:on_step_off` - Entity steps off
- `minecraft:on_placed` - Block placed
- `minecraft:on_player_destroyed` - Player breaks

### Lesson 5: Format Versions
- Latest format_version in examples: `"1.21.130"`
- Format versions are strings: `"1.20.10"` not arrays
- Backward compatible - older versions still work
- Use current version for new blocks to access latest features

### Lesson 6: Block Properties (States) Usage
**In description:**
```json
"description": {
  "identifier": "namespace:block_name",
  "properties": {
    "namespace:property_name": [0, 1, 2, 3]
  }
}
```

**In permutations:**
```json
"permutations": [
  {
    "condition": "query.block_state('namespace:property_name') == 0",
    "components": { ... }
  }
]
```

**In events:**
```json
"events": {
  "event_name": {
    "set_block_state": {
      "namespace:property_name": "1"
    }
  }
}
```

### Lesson 7: What I SHOULD Have Done
1. **Read the actual error message** - "Unexpected version for the loaded data"
2. **Search for that specific error** - not make assumptions
3. **Compare my syntax to official examples** - would have immediately seen "properties" vs "states"
4. **Test the fix** - verify it resolves the error
5. **Only then** move to the next error

### Lesson 8: Geometry Component (Actual Facts)
- `minecraft:geometry` IS valid for blocks
- Requires identifier that matches geometry in resource pack OR vanilla identifier
- Vanilla identifiers: "minecraft:geometry.full_block", "minecraft:geometry.cross"
- Custom identifiers: "geometry.sushi", "geometry.palm_trunk" (must exist in resource pack .geo.json file)
- From 1.21.80+: Must include both `minecraft:geometry` AND `minecraft:material_instances` together

### Key Takeaway
**Stop assuming. Read errors. Research specific issues. Test fixes.**

My problem wasn't lack of knowledge - it was lack of discipline in reading what was actually wrong.
