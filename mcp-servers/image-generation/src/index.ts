#!/usr/bin/env node

/**
 * Image Generation MCP Server
 * 
 * Provides tools for generating images using OpenAI's DALL-E API
 * and validating image quality using GPT-4 Vision.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";

// Check for API key early
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is not set");
  console.error("Please set your OpenAI API key:");
  console.error("  export OPENAI_API_KEY=your-api-key-here");
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "generate_image",
    description: "Generate an image from a text prompt using DALL-E 3. Returns the image URL and revised prompt.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The text prompt describing the image to generate",
        },
        size: {
          type: "string",
          enum: ["1024x1024", "1792x1024", "1024x1792"],
          description: "The size of the generated image (default: 1024x1024)",
        },
        quality: {
          type: "string",
          enum: ["standard", "hd"],
          description: "The quality of the generated image (default: standard)",
        },
        style: {
          type: "string",
          enum: ["vivid", "natural"],
          description: "The style of the generated image (default: vivid)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "validate_image",
    description: "Validate if a generated image matches the original prompt and assess its quality using GPT-4 Vision. Provide either url or base64_image.",
    inputSchema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "URL of the image to validate",
        },
        original_prompt: {
          type: "string",
          description: "The original prompt used to generate the image",
        },
      },
      required: ["image_url", "original_prompt"],
    },
  },
  {
    name: "describe_image",
    description: "Get a detailed description of an image using GPT-4 Vision.",
    inputSchema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "URL of the image to describe",
        },
      },
      required: ["image_url"],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: "image-generation-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_image": {
        const { prompt, size, quality, style } = args as {
          prompt: string;
          size?: "1024x1024" | "1792x1024" | "1024x1792";
          quality?: "standard" | "hd";
          style?: "vivid" | "natural";
        };

        if (!prompt) {
          throw new Error("Prompt is required");
        }

        // Generate image using DALL-E 3
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: size || "1024x1024",
          quality: quality || "standard",
          style: style || "vivid",
        });

        if (!response.data || response.data.length === 0) {
          throw new Error("No image data returned from API");
        }
        const imageData = response.data[0];
        if (!imageData || !imageData.url) {
          throw new Error("Invalid image data received from API");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  image_url: imageData.url,
                  revised_prompt: imageData.revised_prompt,
                  size: size || "1024x1024",
                  quality: quality || "standard",
                  style: style || "vivid",
                  original_prompt: prompt,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "validate_image": {
        const { image_url, original_prompt } = args as {
          image_url: string;
          original_prompt: string;
        };

        if (!image_url || !original_prompt) {
          throw new Error("Both image_url and original_prompt are required");
        }

        // Use GPT-4 Vision to validate the image
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this image and determine if it matches the prompt: "${original_prompt}". 
                  
Provide your analysis in the following JSON format:
{
  "matches_prompt": true/false,
  "confidence": 0-100,
  "description": "detailed description of what you see",
  "quality_score": 0-10,
  "strengths": ["list", "of", "strengths"],
  "issues": ["list", "of", "issues"],
  "suggestions": ["list", "of", "suggestions"]
}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image_url,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        });

        const analysis = response.choices[0]?.message?.content;
        if (!analysis) {
          throw new Error("No analysis returned from Vision API");
        }

        return {
          content: [
            {
              type: "text",
              text: analysis,
            },
          ],
        };
      }

      case "describe_image": {
        const { image_url } = args as {
          image_url: string;
        };

        if (!image_url) {
          throw new Error("image_url is required");
        }

        // Use GPT-4 Vision to describe the image
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Provide a detailed description of this image, including objects, colors, composition, style, and mood.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image_url,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        const description = response.choices[0]?.message?.content;
        if (!description) {
          throw new Error("No description returned from Vision API");
        }

        return {
          content: [
            {
              type: "text",
              text: description,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
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
  console.error("Image Generation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
