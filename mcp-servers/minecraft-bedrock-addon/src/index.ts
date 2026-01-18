#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "create_addon_structure",
    description:
      "Creates the complete directory structure for a Minecraft Bedrock addon (Resource Pack and/or Behavior Pack)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the addon (will be used in manifests)",
        },
        description: {
          type: "string",
          description: "Description of the addon",
        },
        outputPath: {
          type: "string",
          description: "Base path where the addon structure will be created",
        },
        createResourcePack: {
          type: "boolean",
          description: "Whether to create a Resource Pack",
          default: true,
        },
        createBehaviorPack: {
          type: "boolean",
          description: "Whether to create a Behavior Pack",
          default: true,
        },
        minEngineVersion: {
          type: "array",
          description: "Minimum Minecraft engine version [major, minor, patch]",
          items: { type: "number" },
          default: [1, 20, 0],
        },
      },
      required: ["name", "description", "outputPath"],
    },
  },
  {
    name: "create_entity",
    description:
      "Creates entity definition files for both Resource and Behavior packs",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description:
            'Entity identifier (e.g., "custom:my_entity"). Must include namespace.',
        },
        displayName: {
          type: "string",
          description: "Display name for the entity",
        },
        health: {
          type: "number",
          description: "Entity health points",
          default: 20,
        },
        movementSpeed: {
          type: "number",
          description: "Entity movement speed",
          default: 0.25,
        },
        behaviorPackPath: {
          type: "string",
          description: "Path to the behavior pack root directory",
        },
      },
      required: ["identifier", "displayName", "behaviorPackPath"],
    },
  },
  {
    name: "create_item",
    description: "Creates item definition files for Behavior pack",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description:
            'Item identifier (e.g., "custom:my_item"). Must include namespace.',
        },
        displayName: {
          type: "string",
          description: "Display name for the item",
        },
        maxStackSize: {
          type: "number",
          description: "Maximum stack size (1-64)",
          default: 64,
        },
        category: {
          type: "string",
          description: "Item category",
          enum: ["construction", "nature", "equipment", "items"],
          default: "items",
        },
        behaviorPackPath: {
          type: "string",
          description: "Path to the behavior pack root directory",
        },
      },
      required: ["identifier", "displayName", "behaviorPackPath"],
    },
  },
  {
    name: "create_block",
    description: "Creates block definition files for Behavior pack",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description:
            'Block identifier (e.g., "custom:my_block"). Must include namespace.',
        },
        displayName: {
          type: "string",
          description: "Display name for the block",
        },
        destroyTime: {
          type: "number",
          description: "Time to break the block in seconds",
          default: 2.0,
        },
        explosionResistance: {
          type: "number",
          description: "Resistance to explosions",
          default: 10.0,
        },
        behaviorPackPath: {
          type: "string",
          description: "Path to the behavior pack root directory",
        },
      },
      required: ["identifier", "displayName", "behaviorPackPath"],
    },
  },
  {
    name: "create_recipe",
    description: "Creates crafting recipe definition for Behavior pack",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description:
            'Recipe identifier (e.g., "custom:my_recipe"). Must include namespace.',
        },
        type: {
          type: "string",
          description: "Recipe type",
          enum: ["shaped", "shapeless"],
        },
        resultItem: {
          type: "string",
          description:
            'Result item identifier (e.g., "minecraft:diamond" or "custom:my_item")',
        },
        resultCount: {
          type: "number",
          description: "Number of items produced",
          default: 1,
        },
        ingredients: {
          type: "array",
          description:
            "Recipe ingredients (for shapeless) or pattern definition (for shaped)",
        },
        behaviorPackPath: {
          type: "string",
          description: "Path to the behavior pack root directory",
        },
      },
      required: [
        "identifier",
        "type",
        "resultItem",
        "ingredients",
        "behaviorPackPath",
      ],
    },
  },
  {
    name: "add_texture_reference",
    description:
      "Adds texture references to terrain_texture.json or item_texture.json",
    inputSchema: {
      type: "object",
      properties: {
        textureType: {
          type: "string",
          description: "Type of texture to add",
          enum: ["block", "item"],
        },
        textureName: {
          type: "string",
          description: 'Texture identifier (e.g., "custom_block")',
        },
        texturePath: {
          type: "string",
          description:
            'Path to texture file relative to textures/ (e.g., "blocks/custom_block")',
        },
        resourcePackPath: {
          type: "string",
          description: "Path to the resource pack root directory",
        },
      },
      required: [
        "textureType",
        "textureName",
        "texturePath",
        "resourcePackPath",
      ],
    },
  },
  {
    name: "create_localization",
    description: "Creates or updates localization files for the addon",
    inputSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: 'Language code (e.g., "en_US", "es_ES")',
          default: "en_US",
        },
        translations: {
          type: "object",
          description:
            "Key-value pairs of translation keys and their values",
          additionalProperties: { type: "string" },
        },
        resourcePackPath: {
          type: "string",
          description: "Path to the resource pack root directory",
        },
      },
      required: ["translations", "resourcePackPath"],
    },
  },
  {
    name: "generate_uuid",
    description:
      "Generates a random UUID v4 for use in manifest files or other addon components",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of UUIDs to generate",
          default: 1,
          minimum: 1,
          maximum: 10,
        },
      },
    },
  },
];

// Helper functions
function generateManifest(
  type: "resources" | "data",
  name: string,
  description: string,
  version: number[],
  minEngineVersion: number[],
  dependency?: { uuid: string; version: number[] }
): any {
  const manifest = {
    format_version: 2,
    header: {
      name,
      description,
      uuid: randomUUID(),
      version,
      min_engine_version: minEngineVersion,
    },
    modules: [
      {
        type,
        uuid: randomUUID(),
        version,
      },
    ],
  };

  if (dependency) {
    (manifest as any).dependencies = [dependency];
  }

  return manifest;
}

function createEntityDefinition(
  identifier: string,
  displayName: string,
  health: number,
  movementSpeed: number
): any {
  return {
    format_version: "1.20.0",
    "minecraft:entity": {
      description: {
        identifier,
        is_spawnable: true,
        is_summonable: true,
        is_experimental: false,
      },
      components: {
        "minecraft:type_family": {
          family: ["mob", identifier.split(":")[0]],
        },
        "minecraft:health": {
          value: health,
          max: health,
        },
        "minecraft:movement": {
          value: movementSpeed,
        },
        "minecraft:navigation.walk": {
          can_path_over_water: true,
          avoid_water: true,
        },
        "minecraft:physics": {},
        "minecraft:pushable": {
          is_pushable: true,
          is_pushable_by_piston: true,
        },
        "minecraft:collision_box": {
          width: 0.6,
          height: 1.8,
        },
      },
      events: {
        "minecraft:entity_spawned": {},
      },
    },
  };
}

function createItemDefinition(
  identifier: string,
  displayName: string,
  maxStackSize: number,
  category: string
): any {
  const namespace = identifier.split(":")[0];
  const itemName = identifier.split(":")[1];

  return {
    format_version: "1.20.0",
    "minecraft:item": {
      description: {
        identifier,
        category,
      },
      components: {
        "minecraft:max_stack_size": maxStackSize,
        "minecraft:icon": {
          texture: `${namespace}_${itemName}`,
        },
        "minecraft:display_name": {
          value: displayName,
        },
        "minecraft:hand_equipped": true,
      },
    },
  };
}

function createBlockDefinition(
  identifier: string,
  destroyTime: number,
  explosionResistance: number
): any {
  return {
    format_version: "1.20.0",
    "minecraft:block": {
      description: {
        identifier,
      },
      components: {
        "minecraft:destroy_time": destroyTime,
        "minecraft:explosion_resistance": explosionResistance,
        "minecraft:friction": 0.6,
        "minecraft:map_color": "#FFFFFF",
      },
    },
  };
}

function createShapedRecipe(
  identifier: string,
  resultItem: string,
  resultCount: number,
  pattern: string[],
  key: Record<string, { item: string }>
): any {
  return {
    format_version: "1.20.0",
    "minecraft:recipe_shaped": {
      description: {
        identifier,
      },
      tags: ["crafting_table"],
      pattern,
      key,
      result: {
        item: resultItem,
        count: resultCount,
      },
    },
  };
}

function createShapelessRecipe(
  identifier: string,
  resultItem: string,
  resultCount: number,
  ingredients: Array<{ item: string; count?: number }>
): any {
  return {
    format_version: "1.20.0",
    "minecraft:recipe_shapeless": {
      description: {
        identifier,
      },
      tags: ["crafting_table"],
      ingredients,
      result: {
        item: resultItem,
        count: resultCount,
      },
    },
  };
}

// Server implementation
const server = new Server(
  {
    name: "minecraft-bedrock-addon-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_uuid": {
        const count = (args?.count as number) || 1;
        const uuids = Array.from({ length: count }, () => randomUUID());
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { uuids, count: uuids.length },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_addon_structure": {
        const {
          name: addonName,
          description,
          outputPath,
          createResourcePack = true,
          createBehaviorPack = true,
          minEngineVersion = [1, 20, 0],
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const structure: any = {
          created: [],
          manifests: {},
        };

        const resourcePackUuid = randomUUID();
        const behaviorPackUuid = randomUUID();

        // Create Resource Pack
        if (createResourcePack) {
          const rpPath = path.join(outputPath, `${addonName}_RP`);
          await fs.mkdir(rpPath, { recursive: true });

          const rpManifest = generateManifest(
            "resources",
            `${addonName} Resources`,
            description,
            [1, 0, 0],
            minEngineVersion
          );
          structure.manifests.resourcePack = rpManifest;

          await fs.writeFile(
            path.join(rpPath, "manifest.json"),
            JSON.stringify(rpManifest, null, 2)
          );
          structure.created.push(path.join(rpPath, "manifest.json"));

          // Create standard directories
          const rpDirs = [
            "textures/blocks",
            "textures/items",
            "textures/entity",
            "models/entity",
            "animations",
            "sounds",
            "texts",
          ];

          for (const dir of rpDirs) {
            await fs.mkdir(path.join(rpPath, dir), { recursive: true });
            structure.created.push(path.join(rpPath, dir));
          }

          // Create texture definition files
          const terrainTexture = {
            resource_pack_name: addonName,
            texture_name: "atlas.terrain",
            padding: 8,
            num_mip_levels: 4,
            texture_data: {},
          };

          await fs.writeFile(
            path.join(rpPath, "textures/terrain_texture.json"),
            JSON.stringify(terrainTexture, null, 2)
          );
          structure.created.push(
            path.join(rpPath, "textures/terrain_texture.json")
          );

          const itemTexture = {
            resource_pack_name: addonName,
            texture_name: "atlas.items",
            texture_data: {},
          };

          await fs.writeFile(
            path.join(rpPath, "textures/item_texture.json"),
            JSON.stringify(itemTexture, null, 2)
          );
          structure.created.push(
            path.join(rpPath, "textures/item_texture.json")
          );

          // Create basic localization file
          const enUS = `pack.name=${addonName}\npack.description=${description}\n`;
          await fs.writeFile(path.join(rpPath, "texts/en_US.lang"), enUS);
          structure.created.push(path.join(rpPath, "texts/en_US.lang"));

          const languages = {
            languages: ["en_US"],
          };
          await fs.writeFile(
            path.join(rpPath, "texts/languages.json"),
            JSON.stringify(languages, null, 2)
          );
          structure.created.push(path.join(rpPath, "texts/languages.json"));
        }

        // Create Behavior Pack
        if (createBehaviorPack) {
          const bpPath = path.join(outputPath, `${addonName}_BP`);
          await fs.mkdir(bpPath, { recursive: true });

          const dependency = createResourcePack
            ? { uuid: resourcePackUuid, version: [1, 0, 0] }
            : undefined;

          const bpManifest = generateManifest(
            "data",
            `${addonName} Behaviors`,
            description,
            [1, 0, 0],
            minEngineVersion,
            dependency
          );
          structure.manifests.behaviorPack = bpManifest;

          await fs.writeFile(
            path.join(bpPath, "manifest.json"),
            JSON.stringify(bpManifest, null, 2)
          );
          structure.created.push(path.join(bpPath, "manifest.json"));

          // Create standard directories
          const bpDirs = [
            "entities",
            "items",
            "blocks",
            "loot_tables",
            "recipes",
            "spawn_rules",
            "trading",
            "functions",
          ];

          for (const dir of bpDirs) {
            await fs.mkdir(path.join(bpPath, dir), { recursive: true });
            structure.created.push(path.join(bpPath, dir));
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(structure, null, 2),
            },
          ],
        };
      }

      case "create_entity": {
        const {
          identifier,
          displayName,
          health = 20,
          movementSpeed = 0.25,
          behaviorPackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const entityDef = createEntityDefinition(
          identifier,
          displayName,
          health,
          movementSpeed
        );

        const entityName = identifier.split(":")[1];
        const entityPath = path.join(
          behaviorPackPath,
          "entities",
          `${entityName}.json`
        );

        await fs.writeFile(entityPath, JSON.stringify(entityDef, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: entityPath,
                  entity: entityDef,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_item": {
        const {
          identifier,
          displayName,
          maxStackSize = 64,
          category = "items",
          behaviorPackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const itemDef = createItemDefinition(
          identifier,
          displayName,
          maxStackSize,
          category
        );

        const itemName = identifier.split(":")[1];
        const itemPath = path.join(
          behaviorPackPath,
          "items",
          `${itemName}.json`
        );

        await fs.writeFile(itemPath, JSON.stringify(itemDef, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: itemPath,
                  item: itemDef,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_block": {
        const {
          identifier,
          displayName,
          destroyTime = 2.0,
          explosionResistance = 10.0,
          behaviorPackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const blockDef = createBlockDefinition(
          identifier,
          destroyTime,
          explosionResistance
        );

        const blockName = identifier.split(":")[1];
        const blockPath = path.join(
          behaviorPackPath,
          "blocks",
          `${blockName}.json`
        );

        await fs.writeFile(blockPath, JSON.stringify(blockDef, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: blockPath,
                  block: blockDef,
                  note: `Don't forget to add texture reference and localization for ${displayName}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_recipe": {
        const {
          identifier,
          type: recipeType,
          resultItem,
          resultCount = 1,
          ingredients,
          behaviorPackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        let recipeDef;
        if (recipeType === "shaped") {
          const { pattern, key } = ingredients as any;
          recipeDef = createShapedRecipe(
            identifier,
            resultItem,
            resultCount,
            pattern,
            key
          );
        } else {
          recipeDef = createShapelessRecipe(
            identifier,
            resultItem,
            resultCount,
            ingredients
          );
        }

        const recipeName = identifier.split(":")[1];
        const recipePath = path.join(
          behaviorPackPath,
          "recipes",
          `${recipeName}.json`
        );

        await fs.writeFile(recipePath, JSON.stringify(recipeDef, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: recipePath,
                  recipe: recipeDef,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "add_texture_reference": {
        const {
          textureType,
          textureName,
          texturePath,
          resourcePackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const filename =
          textureType === "block"
            ? "terrain_texture.json"
            : "item_texture.json";
        const filePath = path.join(
          resourcePackPath,
          "textures",
          filename
        );

        let textureData;
        try {
          const content = await fs.readFile(filePath, "utf-8");
          textureData = JSON.parse(content);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Texture file not found: ${filePath}`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        textureData.texture_data[textureName] = {
          textures: texturePath,
        };

        await fs.writeFile(filePath, JSON.stringify(textureData, null, 2));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: filePath,
                  added: textureName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_localization": {
        const {
          language = "en_US",
          translations,
          resourcePackPath,
        } = args as any;

        const fs = await import("fs/promises");
        const path = await import("path");

        const langFile = path.join(
          resourcePackPath,
          "texts",
          `${language}.lang`
        );

        let existingContent = "";
        try {
          existingContent = await fs.readFile(langFile, "utf-8");
        } catch (error) {
          // File doesn't exist, will create new
        }

        const lines = existingContent.split("\n").filter((l) => l.trim());
        const existingKeys = new Set(
          lines
            .filter((l) => l.includes("="))
            .map((l) => l.split("=")[0])
        );

        for (const [key, value] of Object.entries(translations)) {
          if (!existingKeys.has(key)) {
            lines.push(`${key}=${value}`);
          }
        }

        await fs.writeFile(langFile, lines.join("\n") + "\n");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  file: langFile,
                  added: Object.keys(translations).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
            stack: error.stack,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Minecraft Bedrock Addon MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
