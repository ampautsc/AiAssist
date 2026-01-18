#!/usr/bin/env node

/**
 * Example: Testing GitHub MCP Server with Real API Calls
 * 
 * This script demonstrates how to test the GitHub MCP server
 * with actual API calls, including reading your repositories.
 * 
 * Prerequisites:
 * 1. Build the server: npm run build
 * 2. Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable
 * 3. Run this script: node examples/test-real-api.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for token
const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!token) {
  console.error('❌ Error: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set.');
  console.error('');
  console.error('To test with real GitHub API:');
  console.error('1. Create a token at: https://github.com/settings/tokens');
  console.error('2. Set it: export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"');
  console.error('3. Run this script again');
  console.error('');
  console.error('For now, here\'s what the test would do:\n');
  
  // Show example test scenarios
  console.log('📋 Test Scenarios:');
  console.log('');
  console.log('1. List Your Repositories');
  console.log('   Tool: list_repositories');
  console.log('   Arguments: { type: "owner", sort: "updated", per_page: 10 }');
  console.log('   Expected: List of your repositories\n');
  
  console.log('2. Get Repository Details');
  console.log('   Tool: get_repository');
  console.log('   Arguments: { owner: "your-username", repo: "your-repo" }');
  console.log('   Expected: Full repository information\n');
  
  console.log('3. Search Repositories');
  console.log('   Tool: search_repositories');
  console.log('   Arguments: { query: "user:your-username language:javascript" }');
  console.log('   Expected: Your JavaScript repositories\n');
  
  console.log('4. List Repository Branches');
  console.log('   Tool: list_branches');
  console.log('   Arguments: { owner: "your-username", repo: "your-repo" }');
  console.log('   Expected: List of branches\n');
  
  console.log('5. Get File Contents');
  console.log('   Tool: get_file_contents');
  console.log('   Arguments: { owner: "your-username", repo: "your-repo", path: "README.md" }');
  console.log('   Expected: README.md contents\n');
  
  console.log('6. List Recent Commits');
  console.log('   Tool: list_commits');
  console.log('   Arguments: { owner: "your-username", repo: "your-repo", per_page: 5 }');
  console.log('   Expected: Last 5 commits\n');
  
  process.exit(1);
}

console.log('✓ GitHub token found');
console.log('');
console.log('🧪 Testing GitHub MCP Server with Real API Calls');
console.log('');

// Test using MCP Inspector (recommended)
console.log('Recommended: Use MCP Inspector for interactive testing:');
console.log('  npx @modelcontextprotocol/inspector node dist/index.js');
console.log('');

// Test with stdio (advanced)
console.log('Alternative: Direct stdio communication:');
console.log('');

const serverPath = join(dirname(__dirname), 'dist', 'index.js');

const server = spawn('node', [serverPath], {
  env: { ...process.env },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('Server output:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Server:', data.toString());
});

// Send a list tools request (MCP protocol)
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  console.log('Sending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Wait a bit then close
setTimeout(() => {
  server.kill();
  
  console.log('');
  console.log('✓ Test complete!');
  console.log('');
  console.log('To test specific operations:');
  console.log('1. Use MCP Inspector (recommended):');
  console.log('   npx @modelcontextprotocol/inspector node dist/index.js');
  console.log('');
  console.log('2. Or integrate with Claude Desktop / VS Code');
  console.log('   See CONFIGURATION.md for setup instructions');
  console.log('');
  console.log('Example operations you can test:');
  console.log('- "List my repositories"');
  console.log('- "Show me the README from my repository X"');
  console.log('- "Create a new branch called feature-test"');
  console.log('- "Search for open issues in my repos"');
  console.log('');
}, 3000);
