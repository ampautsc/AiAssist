import { describe, it } from "node:test";
import assert from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";
import { Readable, Writable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestClient() {
  const serverPath = path.join(__dirname, "..", "index.js");
  
  const serverProcess = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  return { client, transport, originalProcess: serverProcess };
}

function parseToolResponse(response: any): any {
  if (response && response.content && Array.isArray(response.content) && response.content.length > 0) {
    const textContent = response.content[0];
    if (textContent && typeof textContent.text === 'string') {
      return JSON.parse(textContent.text);
    }
  }
  throw new Error("Invalid response format");
}

describe("Minecraft Bedrock Addon MCP Server", () => {
  describe("Tool Listing", () => {
    it("should list all available tools", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        const response = await client.listTools();

        assert.ok(response.tools, "Tools should be returned");
        assert.ok(response.tools.length > 0, "Should have at least one tool");

        const toolNames = response.tools.map((tool: any) => tool.name);
        const expectedTools = [
          "create_addon_structure",
          "create_entity",
          "create_item",
          "create_block",
          "create_recipe",
          "add_texture_reference",
          "create_localization",
          "generate_uuid",
        ];

        for (const expectedTool of expectedTools) {
          assert.ok(
            toolNames.includes(expectedTool),
            `Should include tool: ${expectedTool}`
          );
        }
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
      }
    });
  });

  describe("UUID Generation", () => {
    it("should generate a single UUID", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        const response = await client.callTool({
          name: "generate_uuid",
          arguments: {},
        });

        assert.ok(response.content, "Should return content");
        assert.strictEqual(
          (response.content as any)[0].type,
          "text",
          "Should return text content"
        );

        const result = parseToolResponse(response);
        assert.ok(result.uuids, "Should have uuids property");
        assert.strictEqual(result.uuids.length, 1, "Should have 1 UUID");
        assert.match(
          result.uuids[0],
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          "Should be a valid UUID v4"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
      }
    });

    it("should generate multiple UUIDs", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        const response = await client.callTool({
          name: "generate_uuid",
          arguments: { count: 5 },
        });

        const result = parseToolResponse(response);
        assert.strictEqual(result.uuids.length, 5, "Should have 5 UUIDs");
        assert.strictEqual(result.count, 5, "Count should be 5");

        // Verify all UUIDs are unique
        const uniqueUuids = new Set(result.uuids);
        assert.strictEqual(
          uniqueUuids.size,
          5,
          "All UUIDs should be unique"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
      }
    });
  });

  describe("Addon Structure Creation", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");

    it("should create resource and behavior pack structure", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Clean up any existing test output
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        const response = await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "A test addon for unit testing",
            outputPath: testOutputPath,
            createResourcePack: true,
            createBehaviorPack: true,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.created, "Should have created files");
        assert.ok(
          result.created.length > 0,
          "Should have created at least one file"
        );
        assert.ok(result.manifests, "Should have manifests");
        assert.ok(
          result.manifests.resourcePack,
          "Should have resource pack manifest"
        );
        assert.ok(
          result.manifests.behaviorPack,
          "Should have behavior pack manifest"
        );

        // Verify directory structure
        const rpPath = path.join(testOutputPath, "TestAddon_RP");
        const bpPath = path.join(testOutputPath, "TestAddon_BP");

        assert.ok(
          existsSync(rpPath),
          "Resource pack directory should exist"
        );
        assert.ok(
          existsSync(bpPath),
          "Behavior pack directory should exist"
        );

        // Verify manifest files
        assert.ok(
          existsSync(path.join(rpPath, "manifest.json")),
          "Resource pack manifest should exist"
        );
        assert.ok(
          existsSync(path.join(bpPath, "manifest.json")),
          "Behavior pack manifest should exist"
        );

        // Verify subdirectories
        assert.ok(
          existsSync(path.join(rpPath, "textures")),
          "Textures directory should exist"
        );
        assert.ok(
          existsSync(path.join(bpPath, "entities")),
          "Entities directory should exist"
        );
        assert.ok(
          existsSync(path.join(bpPath, "items")),
          "Items directory should exist"
        );
        assert.ok(
          existsSync(path.join(bpPath, "blocks")),
          "Blocks directory should exist"
        );
        assert.ok(
          existsSync(path.join(bpPath, "recipes")),
          "Recipes directory should exist"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });

    it("should create only resource pack when specified", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Clean up any existing test output
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        const response = await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "RPOnly",
            description: "Resource pack only test",
            outputPath: testOutputPath,
            createResourcePack: true,
            createBehaviorPack: false,
          },
        });

        const result = parseToolResponse(response);

        const rpPath = path.join(testOutputPath, "RPOnly_RP");
        const bpPath = path.join(testOutputPath, "RPOnly_BP");

        assert.ok(
          existsSync(rpPath),
          "Resource pack directory should exist"
        );
        assert.ok(
          !existsSync(bpPath),
          "Behavior pack directory should NOT exist"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Entity Creation", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const bpPath = path.join(testOutputPath, "TestAddon_BP");

    it("should create entity definition file", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup: Create addon structure first
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createBehaviorPack: true,
          },
        });

        // Test: Create entity
        const response = await client.callTool({
          name: "create_entity",
          arguments: {
            identifier: "test:custom_zombie",
            displayName: "Custom Zombie",
            health: 30,
            movementSpeed: 0.3,
            behaviorPackPath: bpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.ok(result.file, "Should return file path");
        assert.ok(result.entity, "Should return entity definition");

        // Verify file exists
        const entityPath = path.join(bpPath, "entities", "custom_zombie.json");
        assert.ok(existsSync(entityPath), "Entity file should exist");

        // Verify content
        const content = await fs.readFile(entityPath, "utf-8");
        const entityData = JSON.parse(content);
        assert.strictEqual(
          entityData["minecraft:entity"].description.identifier,
          "test:custom_zombie"
        );
        assert.strictEqual(
          entityData["minecraft:entity"].components["minecraft:health"].value,
          30
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Item Creation", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const bpPath = path.join(testOutputPath, "TestAddon_BP");

    it("should create item definition file", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createBehaviorPack: true,
          },
        });

        // Test: Create item
        const response = await client.callTool({
          name: "create_item",
          arguments: {
            identifier: "test:custom_sword",
            displayName: "Custom Sword",
            maxStackSize: 1,
            category: "equipment",
            behaviorPackPath: bpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.ok(result.file, "Should return file path");

        // Verify file exists
        const itemPath = path.join(bpPath, "items", "custom_sword.json");
        assert.ok(existsSync(itemPath), "Item file should exist");

        // Verify content
        const content = await fs.readFile(itemPath, "utf-8");
        const itemData = JSON.parse(content);
        assert.strictEqual(
          itemData["minecraft:item"].description.identifier,
          "test:custom_sword"
        );
        assert.strictEqual(
          itemData["minecraft:item"].components["minecraft:max_stack_size"],
          1
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Block Creation", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const bpPath = path.join(testOutputPath, "TestAddon_BP");

    it("should create block definition file", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createBehaviorPack: true,
          },
        });

        // Test: Create block
        const response = await client.callTool({
          name: "create_block",
          arguments: {
            identifier: "test:custom_block",
            displayName: "Custom Block",
            destroyTime: 3.0,
            explosionResistance: 15.0,
            behaviorPackPath: bpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.ok(result.file, "Should return file path");

        // Verify file exists
        const blockPath = path.join(bpPath, "blocks", "custom_block.json");
        assert.ok(existsSync(blockPath), "Block file should exist");

        // Verify content
        const content = await fs.readFile(blockPath, "utf-8");
        const blockData = JSON.parse(content);
        assert.strictEqual(
          blockData["minecraft:block"].description.identifier,
          "test:custom_block"
        );
        assert.strictEqual(
          blockData["minecraft:block"].components["minecraft:destroy_time"],
          3.0
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Recipe Creation", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const bpPath = path.join(testOutputPath, "TestAddon_BP");

    it("should create shapeless recipe", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createBehaviorPack: true,
          },
        });

        // Test: Create shapeless recipe
        const response = await client.callTool({
          name: "create_recipe",
          arguments: {
            identifier: "test:custom_recipe",
            type: "shapeless",
            resultItem: "minecraft:diamond",
            resultCount: 1,
            ingredients: [
              { item: "minecraft:iron_ingot", count: 4 },
              { item: "minecraft:gold_ingot", count: 4 },
            ],
            behaviorPackPath: bpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.ok(result.file, "Should return file path");

        // Verify file exists
        const recipePath = path.join(bpPath, "recipes", "custom_recipe.json");
        assert.ok(existsSync(recipePath), "Recipe file should exist");

        // Verify content
        const content = await fs.readFile(recipePath, "utf-8");
        const recipeData = JSON.parse(content);
        assert.ok(
          recipeData["minecraft:recipe_shapeless"],
          "Should be shapeless recipe"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });

    it("should create shaped recipe", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createBehaviorPack: true,
          },
        });

        // Test: Create shaped recipe
        const response = await client.callTool({
          name: "create_recipe",
          arguments: {
            identifier: "test:shaped_recipe",
            type: "shaped",
            resultItem: "minecraft:diamond",
            resultCount: 1,
            ingredients: {
              pattern: ["XXX", "X X", "XXX"],
              key: {
                X: { item: "minecraft:stick" },
              },
            },
            behaviorPackPath: bpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");

        // Verify file exists
        const recipePath = path.join(bpPath, "recipes", "shaped_recipe.json");
        assert.ok(existsSync(recipePath), "Recipe file should exist");

        // Verify content
        const content = await fs.readFile(recipePath, "utf-8");
        const recipeData = JSON.parse(content);
        assert.ok(
          recipeData["minecraft:recipe_shaped"],
          "Should be shaped recipe"
        );
        assert.deepStrictEqual(
          recipeData["minecraft:recipe_shaped"].pattern,
          ["XXX", "X X", "XXX"]
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Texture Reference", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const rpPath = path.join(testOutputPath, "TestAddon_RP");

    it("should add block texture reference", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createResourcePack: true,
          },
        });

        // Test: Add texture reference
        const response = await client.callTool({
          name: "add_texture_reference",
          arguments: {
            textureType: "block",
            textureName: "custom_block",
            texturePath: "textures/blocks/custom_block",
            resourcePackPath: rpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.strictEqual(result.added, "custom_block");

        // Verify content
        const texturePath = path.join(
          rpPath,
          "textures",
          "terrain_texture.json"
        );
        const content = await fs.readFile(texturePath, "utf-8");
        const textureData = JSON.parse(content);
        assert.ok(
          textureData.texture_data.custom_block,
          "Texture should be added"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe("Localization", () => {
    const testOutputPath = path.join(__dirname, "../../test-output");
    const rpPath = path.join(testOutputPath, "TestAddon_RP");

    it("should create localization entries", async () => {
      const { client, transport, originalProcess } = await createTestClient();

      try {
        // Setup
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
        await fs.mkdir(testOutputPath, { recursive: true });

        await client.callTool({
          name: "create_addon_structure",
          arguments: {
            name: "TestAddon",
            description: "Test addon",
            outputPath: testOutputPath,
            createResourcePack: true,
          },
        });

        // Test: Add localization
        const response = await client.callTool({
          name: "create_localization",
          arguments: {
            language: "en_US",
            translations: {
              "entity.test:custom.name": "Custom Entity",
              "item.test:sword.name": "Custom Sword",
            },
            resourcePackPath: rpPath,
          },
        });

        const result = parseToolResponse(response);

        assert.ok(result.success, "Should be successful");
        assert.strictEqual(result.added, 2, "Should add 2 translations");

        // Verify content
        const langPath = path.join(rpPath, "texts", "en_US.lang");
        const content = await fs.readFile(langPath, "utf-8");
        assert.ok(
          content.includes("entity.test:custom.name=Custom Entity"),
          "Should contain entity translation"
        );
        assert.ok(
          content.includes("item.test:sword.name=Custom Sword"),
          "Should contain item translation"
        );
      } finally {
        await client.close();
        await transport.close();
        originalProcess.kill();
        // Clean up
        if (existsSync(testOutputPath)) {
          await fs.rm(testOutputPath, { recursive: true, force: true });
        }
      }
    });
  });
});
