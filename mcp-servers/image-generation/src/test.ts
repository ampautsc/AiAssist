#!/usr/bin/env node

/**
 * Test script for Image Generation MCP Server
 * 
 * This script tests the image generation and validation functionality
 */

import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test prompts
const TEST_PROMPTS = [
  "A red apple on a wooden table with dramatic lighting",
  "A futuristic cityscape at sunset with flying cars",
  "A cozy coffee shop interior with warm lighting and plants",
];

interface ImageResult {
  prompt: string;
  imageUrl: string;
  revisedPrompt: string;
  validationResult?: string;
}

async function generateImage(prompt: string, size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024") {
  console.log(`\n📸 Generating image for prompt: "${prompt}"`);
  
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    quality: "standard",
    style: "vivid",
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No image data returned");
  }
  const imageData = response.data[0];
  if (!imageData || !imageData.url) {
    throw new Error("No image data returned");
  }

  console.log(`✅ Image generated successfully!`);
  console.log(`   URL: ${imageData.url}`);
  console.log(`   Revised prompt: ${imageData.revised_prompt}`);

  return {
    prompt,
    imageUrl: imageData.url,
    revisedPrompt: imageData.revised_prompt || prompt,
  };
}

async function validateImage(imageUrl: string, originalPrompt: string) {
  console.log(`\n🔍 Validating image against prompt...`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this image and determine if it matches the prompt: "${originalPrompt}". 
            
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
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const analysis = response.choices[0]?.message?.content;
  if (!analysis) {
    throw new Error("No analysis returned");
  }

  console.log(`✅ Validation complete!`);
  console.log(`   Analysis: ${analysis}`);

  return analysis;
}

async function describeImage(imageUrl: string) {
  console.log(`\n📝 Describing image...`);

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
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const description = response.choices[0]?.message?.content;
  if (!description) {
    throw new Error("No description returned");
  }

  console.log(`✅ Description complete!`);
  console.log(`   ${description}`);

  return description;
}

async function runTests() {
  console.log("🚀 Starting Image Generation MCP Server Tests\n");
  console.log("=".repeat(60));

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const results: ImageResult[] = [];

  // Test 1: Generate images for each test prompt
  console.log("\n\n📋 Test 1: Image Generation");
  console.log("=".repeat(60));

  for (const prompt of TEST_PROMPTS) {
    try {
      const result = await generateImage(prompt);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to generate image: ${error}`);
    }
  }

  // Test 2: Validate generated images
  console.log("\n\n📋 Test 2: Image Validation");
  console.log("=".repeat(60));

  for (const result of results) {
    try {
      const validation = await validateImage(result.imageUrl, result.prompt);
      result.validationResult = validation;
    } catch (error) {
      console.error(`❌ Failed to validate image: ${error}`);
    }
  }

  // Test 3: Describe one of the images
  console.log("\n\n📋 Test 3: Image Description");
  console.log("=".repeat(60));

  if (results.length > 0 && results[0]) {
    try {
      await describeImage(results[0].imageUrl);
    } catch (error) {
      console.error(`❌ Failed to describe image: ${error}`);
    }
  }

  // Test 4: Test different sizes
  console.log("\n\n📋 Test 4: Different Image Sizes");
  console.log("=".repeat(60));

  try {
    await generateImage("A simple geometric pattern", "1792x1024");
    console.log("✅ Successfully generated 1792x1024 image");
  } catch (error) {
    console.error(`❌ Failed to generate 1792x1024 image: ${error}`);
  }

  // Summary
  console.log("\n\n📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`✅ Total images generated: ${results.length}`);
  console.log(`✅ Total images validated: ${results.filter(r => r.validationResult).length}`);
  
  console.log("\n\n🎉 All tests completed!");
  console.log("\n📸 Generated Images:");
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.prompt}`);
    console.log(`   URL: ${result.imageUrl}`);
    console.log(`   Revised: ${result.revisedPrompt}`);
  });
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
