# Minecraft Bedrock Addon Creation Example

This example demonstrates how to create a complete Minecraft Bedrock addon using the MCP server.

## Scenario: Creating a "Magic Mod" addon

We'll create a custom addon with:
- A custom magical sword item
- A custom magical block
- A crafting recipe for the sword
- Textures and localization

## Step-by-Step Process

### Step 1: Generate UUIDs

First, generate unique identifiers for the manifests:

```json
Tool: generate_uuid
Arguments: { "count": 2 }

Response:
{
  "uuids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  ],
  "count": 2
}
```

### Step 2: Create Addon Structure

Create the base addon structure:

```json
Tool: create_addon_structure
Arguments: {
  "name": "MagicMod",
  "description": "Adds magical items and blocks to Minecraft",
  "outputPath": "/path/to/addons",
  "createResourcePack": true,
  "createBehaviorPack": true,
  "minEngineVersion": [1, 20, 0]
}

Response:
{
  "created": [
    "/path/to/addons/MagicMod_RP/manifest.json",
    "/path/to/addons/MagicMod_RP/textures",
    "/path/to/addons/MagicMod_RP/texts",
    ...
    "/path/to/addons/MagicMod_BP/manifest.json",
    "/path/to/addons/MagicMod_BP/items",
    "/path/to/addons/MagicMod_BP/blocks",
    ...
  ],
  "manifests": {
    "resourcePack": { ... },
    "behaviorPack": { ... }
  }
}
```

### Step 3: Create Custom Item (Magical Sword)

```json
Tool: create_item
Arguments: {
  "identifier": "magic:enchanted_sword",
  "displayName": "Enchanted Sword",
  "maxStackSize": 1,
  "category": "equipment",
  "behaviorPackPath": "/path/to/addons/MagicMod_BP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_BP/items/enchanted_sword.json",
  "item": { ... }
}
```

### Step 4: Create Custom Block (Magical Block)

```json
Tool: create_block
Arguments: {
  "identifier": "magic:enchanted_block",
  "displayName": "Enchanted Block",
  "destroyTime": 5.0,
  "explosionResistance": 20.0,
  "behaviorPackPath": "/path/to/addons/MagicMod_BP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_BP/blocks/enchanted_block.json",
  "block": { ... },
  "note": "Don't forget to add texture reference and localization for Enchanted Block"
}
```

### Step 5: Create Crafting Recipe

Create a recipe for the enchanted sword:

```json
Tool: create_recipe
Arguments: {
  "identifier": "magic:enchanted_sword_recipe",
  "type": "shaped",
  "resultItem": "magic:enchanted_sword",
  "resultCount": 1,
  "ingredients": {
    "pattern": [
      " D ",
      " D ",
      " S "
    ],
    "key": {
      "D": { "item": "minecraft:diamond" },
      "S": { "item": "minecraft:stick" }
    }
  },
  "behaviorPackPath": "/path/to/addons/MagicMod_BP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_BP/recipes/enchanted_sword_recipe.json",
  "recipe": { ... }
}
```

### Step 6: Add Texture References

Add texture reference for the item:

```json
Tool: add_texture_reference
Arguments: {
  "textureType": "item",
  "textureName": "magic_enchanted_sword",
  "texturePath": "textures/items/enchanted_sword",
  "resourcePackPath": "/path/to/addons/MagicMod_RP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_RP/textures/item_texture.json",
  "added": "magic_enchanted_sword"
}
```

Add texture reference for the block:

```json
Tool: add_texture_reference
Arguments: {
  "textureType": "block",
  "textureName": "magic_enchanted_block",
  "texturePath": "textures/blocks/enchanted_block",
  "resourcePackPath": "/path/to/addons/MagicMod_RP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_RP/textures/terrain_texture.json",
  "added": "magic_enchanted_block"
}
```

### Step 7: Add Localizations

Add display names for all custom content:

```json
Tool: create_localization
Arguments: {
  "language": "en_US",
  "translations": {
    "item.magic:enchanted_sword.name": "Enchanted Sword",
    "tile.magic:enchanted_block.name": "Enchanted Block",
    "pack.name": "Magic Mod",
    "pack.description": "Adds magical items and blocks"
  },
  "resourcePackPath": "/path/to/addons/MagicMod_RP"
}

Response:
{
  "success": true,
  "file": "/path/to/addons/MagicMod_RP/texts/en_US.lang",
  "added": 4
}
```

## Final Steps (Manual)

After using the MCP server to create all the files:

1. **Add Texture Images**: Place actual PNG texture files in:
   - `/path/to/addons/MagicMod_RP/textures/items/enchanted_sword.png`
   - `/path/to/addons/MagicMod_RP/textures/blocks/enchanted_block.png`

2. **Update Item Properties** (Optional): Edit the item JSON to add:
   - Durability
   - Attack damage
   - Enchantment properties
   - Custom behavior

3. **Test the Addon**:
   - Copy `MagicMod_RP` to Minecraft's resource_packs folder
   - Copy `MagicMod_BP` to Minecraft's behavior_packs folder
   - Launch Minecraft and enable both packs in world settings
   - Test in creative mode first

4. **Iterate**: Use the MCP server to add more items, blocks, entities, or recipes as needed

## Directory Structure Result

```
MagicMod_RP/
├── manifest.json
├── pack_icon.png (add manually)
├── textures/
│   ├── terrain_texture.json (updated)
│   ├── item_texture.json (updated)
│   ├── items/
│   │   └── enchanted_sword.png (add manually)
│   └── blocks/
│       └── enchanted_block.png (add manually)
└── texts/
    ├── en_US.lang (updated)
    └── languages.json

MagicMod_BP/
├── manifest.json
├── items/
│   └── enchanted_sword.json
├── blocks/
│   └── enchanted_block.json
└── recipes/
    └── enchanted_sword_recipe.json
```

## Tips

1. **Always use the same namespace** across all identifiers (e.g., "magic:")
2. **Generate UUIDs first** to ensure uniqueness
3. **Follow the order**: Structure → Content → Textures → Localization
4. **Test incrementally**: Add one feature at a time and test
5. **Keep backups**: Version control your addon files

## Common Next Steps

- Add custom entities with behaviors
- Create spawn rules for entities
- Add loot tables for blocks and entities
- Create custom sounds
- Add particle effects
- Create custom animations

All of these can be expanded using the MCP server's tools combined with manual JSON editing for advanced features!
