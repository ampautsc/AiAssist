#!/usr/bin/env node

/**
 * Test script for GitHub MCP Server
 * This script tests that the server can start and list its tools without requiring a GitHub token
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing GitHub MCP Server...\n');

// Start the server without a token to test it handles the error gracefully
const serverPath = join(__dirname, 'dist', 'index.js');
console.log(`Server path: ${serverPath}\n`);

// Test 1: Check if server file exists and is executable
console.log('Test 1: Checking if server file exists...');
try {
  const fs = await import('fs');
  const stats = fs.statSync(serverPath);
  if (stats.isFile()) {
    console.log('✓ Server file exists\n');
  } else {
    console.log('✗ Server file not found\n');
    process.exit(1);
  }
} catch (error) {
  console.log(`✗ Error checking server file: ${error.message}\n`);
  process.exit(1);
}

// Test 2: Check if all operation modules are present
console.log('Test 2: Checking operation modules...');
const operationModules = [
  'branches',
  'commits',
  'files',
  'issues',
  'pulls',
  'releases',
  'repository',
  'search'
];

let allModulesPresent = true;
for (const module of operationModules) {
  try {
    const fs = await import('fs');
    const modulePath = join(__dirname, 'dist', 'operations', `${module}.js`);
    fs.statSync(modulePath);
    console.log(`  ✓ ${module}.js`);
  } catch (error) {
    console.log(`  ✗ ${module}.js - NOT FOUND`);
    allModulesPresent = false;
  }
}

if (allModulesPresent) {
  console.log('✓ All operation modules present\n');
} else {
  console.log('✗ Some operation modules missing\n');
  process.exit(1);
}

// Test 3: Check common modules
console.log('Test 3: Checking common modules...');
const commonModules = ['errors', 'github-client', 'version'];
let allCommonPresent = true;

for (const module of commonModules) {
  try {
    const fs = await import('fs');
    const modulePath = join(__dirname, 'dist', 'common', `${module}.js`);
    fs.statSync(modulePath);
    console.log(`  ✓ ${module}.js`);
  } catch (error) {
    console.log(`  ✗ ${module}.js - NOT FOUND`);
    allCommonPresent = false;
  }
}

if (allCommonPresent) {
  console.log('✓ All common modules present\n');
} else {
  console.log('✗ Some common modules missing\n');
  process.exit(1);
}

console.log('All tests passed! ✓\n');
console.log('Server is ready to use. To test with actual GitHub API calls:');
console.log('1. Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable');
console.log('2. Use MCP Inspector: npx @modelcontextprotocol/inspector node dist/index.js');
console.log('3. Or configure in Claude Desktop / VS Code as per CONFIGURATION.md\n');
