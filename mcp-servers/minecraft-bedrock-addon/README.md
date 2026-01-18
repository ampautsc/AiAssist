# Minecraft Bedrock Addon MCP Server

A Model Context Protocol (MCP) server for creating Minecraft Bedrock Edition addons, including Resource Packs and Behavior Packs.

## Features

This MCP server provides tools to:

- **Create complete addon structures** - Generate the full directory structure for Resource and Behavior packs
- **Generate entities** - Create custom entity definitions with behaviors
- **Generate items** - Create custom item definitions
- **Generate blocks** - Create custom block definitions
- **Generate recipes** - Create crafting recipes (shaped and shapeless)
- **Manage textures** - Add texture references to texture definition files
- **Handle localization** - Create and update language files
- **Generate UUIDs** - Create unique identifiers for manifests

## Installation

```bash
cd mcp-servers/minecraft-bedrock-addon
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "minecraft-bedrock": {
      "command": "node",
      "args": ["/path/to/mcp-servers/minecraft-bedrock-addon/dist/index.js"]
    }
  }
}
```

### Available Tools

#### 1. `create_addon_structure`

Creates the complete directory structure for a Minecraft Bedrock addon.

**Parameters:**
- `name` (required): Name of the addon
- `description` (required): Description of the addon
- `outputPath` (required): Base path where the addon will be created
- `createResourcePack` (optional): Whether to create a Resource Pack (default: true)
- `createBehaviorPack` (optional): Whether to create a Behavior Pack (default: true)
- `minEngineVersion` (optional): Minimum Minecraft version [major, minor, patch] (default: [1, 20, 0])

**Example:**
```json
{
  "name": "MyAddon",
  "description": "My custom Minecraft addon",
  "outputPath": "/path/to/addons",
  "createResourcePack": true,
  "createBehaviorPack": true
}
```

#### 2. `create_entity`

Creates an entity definition file in the Behavior Pack.

**Parameters:**
- `identifier` (required): Entity identifier with namespace (e.g., "custom:zombie")
- `displayName` (required): Display name for the entity
- `health` (optional): Health points (default: 20)
- `movementSpeed` (optional): Movement speed (default: 0.25)
- `behaviorPackPath` (required): Path to the behavior pack root

#### 3. `create_item`

Creates an item definition file in the Behavior Pack.

**Parameters:**
- `identifier` (required): Item identifier with namespace
- `displayName` (required): Display name for the item
- `maxStackSize` (optional): Max stack size 1-64 (default: 64)
- `category` (optional): Item category (default: "items")
- `behaviorPackPath` (required): Path to the behavior pack root

#### 4. `create_block`

Creates a block definition file in the Behavior Pack.

**Parameters:**
- `identifier` (required): Block identifier with namespace
- `displayName` (required): Display name for the block
- `destroyTime` (optional): Time to break in seconds (default: 2.0)
- `explosionResistance` (optional): Blast resistance (default: 10.0)
- `behaviorPackPath` (required): Path to the behavior pack root

#### 5. `create_recipe`

Creates a crafting recipe definition file.

**Parameters:**
- `identifier` (required): Recipe identifier with namespace
- `type` (required): "shaped" or "shapeless"
- `resultItem` (required): Result item identifier
- `resultCount` (optional): Number of items produced (default: 1)
- `ingredients` (required): Recipe ingredients (format depends on type)
- `behaviorPackPath` (required): Path to the behavior pack root

**Shaped Recipe Example:**
```json
{
  "identifier": "custom:my_recipe",
  "type": "shaped",
  "resultItem": "custom:my_item",
  "resultCount": 1,
  "ingredients": {
    "pattern": ["XXX", "X X", "XXX"],
    "key": {
      "X": { "item": "minecraft:stick" }
    }
  },
  "behaviorPackPath": "/path/to/BP"
}
```

**Shapeless Recipe Example:**
```json
{
  "identifier": "custom:my_recipe",
  "type": "shapeless",
  "resultItem": "custom:my_item",
  "resultCount": 1,
  "ingredients": [
    { "item": "minecraft:iron_ingot", "count": 4 }
  ],
  "behaviorPackPath": "/path/to/BP"
}
```

#### 6. `add_texture_reference`

Adds texture references to terrain_texture.json or item_texture.json.

**Parameters:**
- `textureType` (required): "block" or "item"
- `textureName` (required): Texture identifier
- `texturePath` (required): Path to texture file relative to textures/
- `resourcePackPath` (required): Path to the resource pack root

#### 7. `create_localization`

Creates or updates localization files.

**Parameters:**
- `language` (optional): Language code (default: "en_US")
- `translations` (required): Object with key-value pairs
- `resourcePackPath` (required): Path to the resource pack root

**Example:**
```json
{
  "language": "en_US",
  "translations": {
    "entity.custom:zombie.name": "Custom Zombie",
    "item.custom:sword.name": "Custom Sword"
  },
  "resourcePackPath": "/path/to/RP"
}
```

#### 8. `generate_uuid`

Generates random UUIDs for use in manifests.

**Parameters:**
- `count` (optional): Number of UUIDs to generate (default: 1, max: 10)

## Development

### Build
```bash
npm run build
```

### Watch mode
```bash
npm run watch
```

### Run tests
```bash
npm test
```

## Reference Documentation

For detailed information about Minecraft Bedrock addon development, see:
- `/docs/minecraft-bedrock-addon-reference.md` in the repository

## File Structure

```
minecraft-bedrock-addon/
├── src/
│   ├── index.ts          # Main server implementation
│   └── test/             # Test files
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js 20.x or higher
- TypeScript 5.3+
- @modelcontextprotocol/sdk

## License

MIT

## Contributing

This MCP server is part of the AiAssist repository. Contributions are welcome!

## Tips

1. Always use unique namespaces (not "minecraft:") for custom content
2. Generate UUIDs for each manifest before creating addon structure
3. Create the addon structure first, then add entities/items/blocks
4. Don't forget to add texture references and localization for visual content
5. Test your addon in Minecraft's creative mode before distributing

## Troubleshooting

**Issue**: "Texture file not found"
- Ensure you've created the addon structure with `create_addon_structure` first

**Issue**: "Invalid identifier format"
- Identifiers must include a namespace (e.g., "custom:my_item")

**Issue**: "Manifests won't load in Minecraft"
- Verify UUIDs are unique and properly formatted
- Check format_version matches your Minecraft version
- Validate JSON syntax

## Resources

- [Microsoft Learn - Minecraft Creator](https://learn.microsoft.com/minecraft/creator/)
- [bedrock.dev](https://bedrock.dev) - Community documentation
- [Minecraft Wiki - Bedrock Edition Add-ons](https://minecraft.wiki/w/Add-on)
