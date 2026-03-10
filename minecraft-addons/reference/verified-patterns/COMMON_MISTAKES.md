# Common Mistakes - DO NOT MAKE THESE

## Entity Components

### ❌ WRONG: entity_sensor with flat properties
```json
"minecraft:entity_sensor": {
  "sensor_range": 10,
  "event": "my_event",
  "event_filters": { ... }
}
```

### ✅ CORRECT: entity_sensor uses subsensors array
```json
"minecraft:entity_sensor": {
  "subsensors": [
    {
      "range": [10, 10],
      "event": "my_event",
      "event_filters": { ... }
    }
  ]
}
```

---

### ❌ WRONG: Filter without "subject" for other entities
```json
{ "test": "is_family", "value": "player" }
```

### ✅ CORRECT: Include subject when checking other entities
```json
{ "test": "is_family", "subject": "other", "value": "player" }
```

---

### ❌ WRONG: damage_sensor triggers must be array
Actually, this is a misconception. Both are valid!

### ✅ CORRECT: Both object AND array work
```json
// Object style (Bat, Blaze)
"triggers": { "cause": "fall", "deals_damage": false }

// Array style (Bee, Allay)
"triggers": [{ "cause": "fall", "deals_damage": false }]
```

---

## Block Components

### ❌ WRONG: Mixing render_methods on same block in different permutations
This can cause "material mixing" errors.

### ✅ CORRECT: Use same render_method across all permutations
If base uses "opaque", permutations should also use "opaque".

---

### ❌ WRONG: Using minecraft:geometry without minecraft:material_instances (1.21.80+)
```json
"components": {
  "minecraft:geometry": "geometry.my_block"
}
```

### ✅ CORRECT: Always include both together
```json
"components": {
  "minecraft:geometry": "geometry.my_block",
  "minecraft:material_instances": {
    "*": { "texture": "my_texture", "render_method": "opaque" }
  }
}
```

---

### ❌ WRONG: Texture name not in terrain_texture.json
Block references `"texture": "my_special_texture"` but terrain_texture.json doesn't have that key.

### ✅ CORRECT: Ensure texture key exists
```json
// In terrain_texture.json
"texture_data": {
  "my_special_texture": {
    "textures": "textures/blocks/my_special_texture"
  }
}
```

---

## Script API

### ❌ WRONG: Using removed/deprecated events
```javascript
world.beforeEvents.chatSend.subscribe()  // REMOVED in stable
world.afterEvents.blockBreak.subscribe() // Use playerBreakBlock
```

### ✅ CORRECT: Use stable API events
```javascript
world.afterEvents.playerBreakBlock.subscribe()
world.afterEvents.playerPlaceBlock.subscribe()
```

---

### ❌ WRONG: BlockCustomComponent method names
```javascript
onPlayerDestroy(event) { }  // WRONG NAME
```

### ✅ CORRECT: Use correct method names
```javascript
onBreak(event) { }        // When destroyed by any cause
onPlayerBreak(event) { }  // When broken by player specifically
```

---

### ❌ WRONG: Modifying block state directly in event handler
```javascript
onPlayerInteract(event) {
  event.block.setPermutation(...)  // May fail
}
```

### ✅ CORRECT: Wrap state changes in system.run()
```javascript
onPlayerInteract(event) {
  system.run(() => {
    event.block.setPermutation(...)
  });
}
```

---

## Client Entities

### ❌ WRONG: Geometry identifier doesn't match file
```json
// In client entity
"geometry": { "default": "geometry.monarch.invisible" }

// But file has
"identifier": "geometry.invisible"
```

### ✅ CORRECT: Match identifiers exactly
```json
// In client entity
"geometry": { "default": "geometry.invisible" }

// File has same
"identifier": "geometry.invisible"
```

---

## Manifest

### ❌ WRONG: BP and RP versions don't match
BP is 1.0.25, but BP depends on RP 1.0.24

### ✅ CORRECT: Keep all versions synchronized
- BP header version
- BP module version  
- BP dependency on RP version
- RP header version
- RP module version
- RP dependency on BP version

All should match!

---

## States

### ❌ WRONG: State definition as single value
```json
"states": {
  "my:state": 5
}
```

### ✅ CORRECT: State values as array
```json
"states": {
  "my:state": [0, 1, 2, 3, 4, 5]
}
```

Or boolean:
```json
"states": {
  "my:active": [false, true]
}
```
