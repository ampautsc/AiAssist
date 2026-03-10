#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = new Server(
  {
    name: 'screenshot-ocr',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Find Python executable
function findPython(): string {
  const candidates = [
    'C:\\Python312\\python.exe',
    'C:\\Python310\\python.exe',
    'python',
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'python'; // fallback
}

const PYTHON_CMD = findPython();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'find_text_on_screen',
        description: 'Performs OCR on a screenshot image and returns all text found with coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            image_path: {
              type: 'string',
              description: 'Absolute path to the screenshot image file',
            },
          },
          required: ['image_path'],
        },
      },
      {
        name: 'find_specific_text',
        description: 'Searches for specific text in a screenshot and returns its coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            image_path: {
              type: 'string',
              description: 'Absolute path to the screenshot image file',
            },
            search_text: {
              type: 'string',
              description: 'Text to search for (case-insensitive)',
            },
          },
          required: ['image_path', 'search_text'],
        },
      },
      {
        name: 'detect_ui_elements',
        description: 'Detects all clickable UI elements (buttons, panels, interactive regions) in a screenshot, not just text. Returns comprehensive UI structure with coordinates, types, and confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            image_path: {
              type: 'string',
              description: 'Absolute path to the screenshot image file',
            },
            debug: {
              type: 'boolean',
              description: 'If true, saves annotated image showing detected elements',
            },
          },
          required: ['image_path'],
        },
      },
      {
        name: 'get_menu_layout',
        description: 'Retrieves cached menu layout for known screens (e.g., minecraft_main_menu). Returns known clickable elements without needing to analyze screenshot.',
        inputSchema: {
          type: 'object',
          properties: {
            menu_name: {
              type: 'string',
              description: 'Name of the menu layout to retrieve (e.g., minecraft_main_menu, minecraft_worlds_list)',
            },
          },
          required: ['menu_name'],
        },
      },
      {
        name: 'update_menu_layout',
        description: 'Updates cached menu layout with verified element positions. Use this after confirming button locations work.',
        inputSchema: {
          type: 'object',
          properties: {
            menu_name: {
              type: 'string',
              description: 'Name of the menu layout to update',
            },
            elements: {
              type: 'string',
              description: 'JSON string containing array of UI elements with verified coordinates',
            },
          },
          required: ['menu_name', 'elements'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'find_text_on_screen') {
    const imagePath = String(args?.image_path);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Call Python script to do OCR
    const scriptPath = path.join(__dirname, '..', 'scripts', 'ocr_engine.py');
    const result = await runPythonScript(scriptPath, [imagePath]);
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (name === 'find_specific_text') {
    const imagePath = String(args?.image_path);
    const searchText = String(args?.search_text);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Call Python script with search parameter
    const scriptPath = path.join(__dirname, '..', 'scripts', 'ocr_engine.py');
    const result = await runPythonScript(scriptPath, [imagePath, searchText]);
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (name === 'detect_ui_elements') {
    const imagePath = String(args?.image_path);
    const debug = Boolean(args?.debug);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Call UI detector Python script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'ui_detector.py');
    const scriptArgs = [imagePath];
    if (debug) scriptArgs.push('--debug');
    
    const result = await runPythonScript(scriptPath, scriptArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  if (name === 'get_menu_layout') {
    const menuName = String(args?.menu_name);
    const cachePath = path.join(__dirname, '..', 'scripts', 'menu_layout_cache.json');
    
    if (!fs.existsSync(cachePath)) {
      throw new Error('Menu layout cache not found');
    }
    
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    
    if (!cache[menuName]) {
      throw new Error(`Menu layout not found: ${menuName}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cache[menuName], null, 2),
        },
      ],
    };
  }

  if (name === 'update_menu_layout') {
    const menuName = String(args?.menu_name);
    const elementsJson = String(args?.elements);
    const cachePath = path.join(__dirname, '..', 'scripts', 'menu_layout_cache.json');
    
    // Load current cache
    let cache: any = {};
    if (fs.existsSync(cachePath)) {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
    
    // Parse new elements
    const elements = JSON.parse(elementsJson);
    
    // Update cache
    cache[menuName] = {
      description: cache[menuName]?.description || `Menu: ${menuName}`,
      resolution: cache[menuName]?.resolution || 'unknown',
      last_updated: new Date().toISOString(),
      elements: elements
    };
    
    // Save cache
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    
    return {
      content: [
        {
          type: 'text',
          text: `Menu layout '${menuName}' updated successfully with ${elements.length} elements`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_CMD, [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
