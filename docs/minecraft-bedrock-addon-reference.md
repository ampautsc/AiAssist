# Minecraft Bedrock Edition Addon Development Reference

> **Note**: This document serves as a reference for the MCP server to create Minecraft Bedrock addons. It contains essential information about Resource Packs and Behavior Packs structure and formats.

## Overview

Minecraft Bedrock Edition addons consist of two main components:
1. **Resource Packs** - Control visual/audio elements (textures, models, sounds, animations)
2. **Behavior Packs** - Control game mechanics (entities, items, blocks, gameplay logic)

## Directory Structure

### Resource Pack Structure
```
ResourcePack/
├── manifest.json                 # Pack metadata and dependencies
├── pack_icon.png                 # 256x256 pack icon
├── textures/
│   ├── blocks/                   # Block textures
│   ├── items/                    # Item textures
│   ├── entity/                   # Entity/mob textures
│   └── terrain_texture.json      # Block texture definitions
├── models/
│   └── entity/                   # Entity models (.geo.json)
├── animations/
│   └── *.animation.json          # Animation definitions
├── sounds/
│   ├── sound_definitions.json    # Sound mappings
│   └── *.ogg                     # Sound files
├── texts/
│   ├── en_US.lang                # Localization files
│   └── languages.json            # Language definitions
└── ui/                           # UI modifications
```

### Behavior Pack Structure
```
BehaviorPack/
├── manifest.json                 # Pack metadata and dependencies
├── pack_icon.png                 # 256x256 pack icon
├── entities/
│   └── *.json                    # Entity definitions
├── items/
│   └── *.json                    # Item definitions
├── blocks/
│   └── *.json                    # Block definitions
├── loot_tables/
│   └── *.json                    # Loot table definitions
├── recipes/
│   └── *.json                    # Crafting recipes
├── spawn_rules/
│   └── *.json                    # Mob spawn rules
├── trading/
│   └── *.json                    # Villager trades
├── scripts/
│   ├── server/                   # Server-side scripts
│   └── client/                   # Client-side scripts
└── functions/
    └── *.mcfunction              # Command functions
```

## Key File Formats

### manifest.json
The manifest file is required for both Resource and Behavior packs.

**Resource Pack manifest.json:**
```json
{
  "format_version": 2,
  "header": {
    "name": "pack.name",
    "description": "pack.description",
    "uuid": "UNIQUE-UUID-HERE",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 0]
  },
  "modules": [
    {
      "type": "resources",
      "uuid": "UNIQUE-UUID-HERE",
      "version": [1, 0, 0]
    }
  ]
}
```

**Behavior Pack manifest.json:**
```json
{
  "format_version": 2,
  "header": {
    "name": "pack.name",
    "description": "pack.description",
    "uuid": "UNIQUE-UUID-HERE",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 0]
  },
  "modules": [
    {
      "type": "data",
      "uuid": "UNIQUE-UUID-HERE",
      "version": [1, 0, 0]
    }
  ],
  "dependencies": [
    {
      "uuid": "RESOURCE-PACK-UUID",
      "version": [1, 0, 0]
    }
  ]
}
```

**Important**: Each UUID must be unique. Use UUID v4 format.

### Entity Definition (Behavior Pack)

```json
{
  "format_version": "1.20.0",
  "minecraft:entity": {
    "description": {
      "identifier": "namespace:entity_name",
      "is_spawnable": true,
      "is_summonable": true,
      "is_experimental": false
    },
    "component_groups": {
      "custom_group": {
        "minecraft:behavior.float": {
          "priority": 0
        }
      }
    },
    "components": {
      "minecraft:type_family": {
        "family": ["mob", "custom"]
      },
      "minecraft:health": {
        "value": 20,
        "max": 20
      },
      "minecraft:movement": {
        "value": 0.25
      },
      "minecraft:navigation.walk": {
        "can_path_over_water": true,
        "avoid_water": true
      },
      "minecraft:physics": {},
      "minecraft:pushable": {
        "is_pushable": true,
        "is_pushable_by_piston": true
      }
    },
    "events": {
      "minecraft:entity_spawned": {
        "add": {
          "component_groups": ["custom_group"]
        }
      }
    }
  }
}
```

### Item Definition (Behavior Pack)

```json
{
  "format_version": "1.20.0",
  "minecraft:item": {
    "description": {
      "identifier": "namespace:item_name",
      "category": "equipment"
    },
    "components": {
      "minecraft:max_stack_size": 64,
      "minecraft:icon": {
        "texture": "item_texture_name"
      },
      "minecraft:display_name": {
        "value": "Custom Item"
      },
      "minecraft:hand_equipped": true,
      "minecraft:durability": {
        "max_durability": 100
      }
    }
  }
}
```

### Block Definition (Behavior Pack)

```json
{
  "format_version": "1.20.0",
  "minecraft:block": {
    "description": {
      "identifier": "namespace:block_name"
    },
    "components": {
      "minecraft:destroy_time": 2.0,
      "minecraft:explosion_resistance": 10.0,
      "minecraft:friction": 0.6,
      "minecraft:map_color": "#FFFFFF",
      "minecraft:geometry": "geometry.block_name"
    }
  }
}
```

### Recipe Definition (Behavior Pack)

**Shaped Recipe:**
```json
{
  "format_version": "1.20.0",
  "minecraft:recipe_shaped": {
    "description": {
      "identifier": "namespace:recipe_name"
    },
    "tags": ["crafting_table"],
    "pattern": [
      "XXX",
      "X X",
      "XXX"
    ],
    "key": {
      "X": {
        "item": "minecraft:stick"
      }
    },
    "result": {
      "item": "namespace:custom_item",
      "count": 1
    }
  }
}
```

**Shapeless Recipe:**
```json
{
  "format_version": "1.20.0",
  "minecraft:recipe_shapeless": {
    "description": {
      "identifier": "namespace:recipe_name"
    },
    "tags": ["crafting_table"],
    "ingredients": [
      {
        "item": "minecraft:iron_ingot",
        "count": 4
      }
    ],
    "result": {
      "item": "namespace:custom_item",
      "count": 1
    }
  }
}
```

### terrain_texture.json (Resource Pack)

```json
{
  "resource_pack_name": "pack_name",
  "texture_name": "atlas.terrain",
  "padding": 8,
  "num_mip_levels": 4,
  "texture_data": {
    "custom_block": {
      "textures": "textures/blocks/custom_block"
    },
    "custom_block_side": {
      "textures": "textures/blocks/custom_block_side"
    }
  }
}
```

### item_texture.json (Resource Pack)

```json
{
  "resource_pack_name": "pack_name",
  "texture_name": "atlas.items",
  "texture_data": {
    "custom_item": {
      "textures": "textures/items/custom_item"
    }
  }
}
```

### Entity Geometry (Resource Pack .geo.json)

```json
{
  "format_version": "1.12.0",
  "minecraft:geometry": [
    {
      "description": {
        "identifier": "geometry.entity_name",
        "texture_width": 64,
        "texture_height": 64,
        "visible_bounds_width": 2,
        "visible_bounds_height": 2,
        "visible_bounds_offset": [0, 0, 0]
      },
      "bones": [
        {
          "name": "body",
          "pivot": [0, 0, 0],
          "cubes": [
            {
              "origin": [-4, 0, -4],
              "size": [8, 8, 8],
              "uv": [0, 0]
            }
          ]
        }
      ]
    }
  ]
}
```

### Animation Definition (Resource Pack)

```json
{
  "format_version": "1.8.0",
  "animations": {
    "animation.entity_name.walk": {
      "loop": true,
      "animation_length": 1.0,
      "bones": {
        "body": {
          "rotation": [0, 0, 0],
          "position": [0, 0, 0]
        }
      }
    }
  }
}
```

### Sound Definitions (Resource Pack)

```json
{
  "format_version": "1.14.0",
  "sound_definitions": {
    "custom.sound": {
      "category": "neutral",
      "sounds": [
        "sounds/custom_sound"
      ]
    }
  }
}
```

### Localization (Resource Pack texts/en_US.lang)

```
pack.name=My Custom Pack
pack.description=A custom addon pack
entity.namespace:custom_entity.name=Custom Entity
item.namespace:custom_item.name=Custom Item
tile.namespace:custom_block.name=Custom Block
```

## Common Components

### Entity Components (Partial List)

- `minecraft:health` - Entity health
- `minecraft:movement` - Movement speed
- `minecraft:navigation.walk` - Ground navigation
- `minecraft:navigation.fly` - Flying navigation
- `minecraft:collision_box` - Collision dimensions
- `minecraft:scale` - Entity size scaling
- `minecraft:type_family` - Entity family tags
- `minecraft:behavior.*` - Various AI behaviors
- `minecraft:attack` - Attack properties
- `minecraft:loot` - Loot table reference
- `minecraft:tameable` - Taming mechanics
- `minecraft:rideable` - Riding mechanics
- `minecraft:damage_sensor` - Damage filtering
- `minecraft:breathable` - Breathing mechanics

### Item Components

- `minecraft:icon` - Item texture
- `minecraft:max_stack_size` - Stack limit
- `minecraft:durability` - Item durability
- `minecraft:weapon` - Weapon properties
- `minecraft:armor` - Armor properties
- `minecraft:food` - Food properties
- `minecraft:hand_equipped` - Can be held
- `minecraft:foil` - Enchantment glint
- `minecraft:cooldown` - Use cooldown

### Block Components

- `minecraft:destroy_time` - Break time
- `minecraft:explosion_resistance` - Blast resistance
- `minecraft:friction` - Movement friction
- `minecraft:light_emission` - Light level
- `minecraft:map_color` - Map display color
- `minecraft:flammable` - Fire properties
- `minecraft:loot` - Loot table

## Best Practices

1. **UUIDs**: Always generate unique UUIDs for each manifest
2. **Namespaces**: Use custom namespace (not "minecraft:") for custom content
3. **Format Version**: Match format_version to target Minecraft version
4. **Testing**: Test packs in creative mode first
5. **Validation**: Use JSON validators before testing in-game
6. **Dependencies**: Link behavior pack to resource pack via dependencies
7. **Identifiers**: Use lowercase with underscores (e.g., "custom_entity")
8. **Textures**: Use PNG format, power-of-2 dimensions recommended
9. **Sounds**: Use OGG format for audio files
10. **Documentation**: Comment your JSON with description fields

## Installation Paths

### Windows 10/11
- Resource Packs: `%localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\resource_packs\`
- Behavior Packs: `%localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\`

### Android
- Resource Packs: `/sdcard/games/com.mojang/resource_packs/`
- Behavior Packs: `/sdcard/games/com.mojang/behavior_packs/`

### iOS
- Via iTunes file sharing or Files app to Minecraft's Documents folder

## Debugging Tips

1. Enable content logs in Minecraft settings
2. Check `com.mojang\minecraftpe\` for error logs
3. Use `/reload` command to reload packs without restarting
4. Test components individually before combining
5. Validate JSON syntax with online validators
6. Check format_version compatibility with target Minecraft version

## Additional Resources

For the most up-to-date documentation, refer to:
- Microsoft Learn: Minecraft Creator Documentation
- bedrock.dev: Community documentation
- Minecraft Wiki: Bedrock Edition add-ons
- GitHub: minecraft-creator-ms samples

## Version Compatibility

This reference is based on Minecraft Bedrock Edition 1.20+. Format versions and features may vary with different game versions.

**Format Version Guidelines:**
- Format version 2: Manifests (current standard)
- Format version 1.20.0+: Entity/Item/Block definitions (latest features)
- Format version 1.12.0+: Geometry (supports newer features)
- Format version 1.8.0+: Animations (standard)

## JSON Schema Notes

All JSON files should:
- Use UTF-8 encoding
- Have proper nesting and syntax
- Not include comments (though some parsers may allow //)
- Follow strict JSON format (no trailing commas)

---

*This documentation is maintained for use by the Minecraft Bedrock MCP server to assist in addon creation.*
