/**
 * Integration tests - Run against actual Minecraft
 * 
 * Prerequisites:
 * - Minecraft must be at main menu
 * - Python venv must be activated
 * - Tesseract OCR must be installed
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// Path to MCP server
const SERVER_PATH = path.join(__dirname, '..', 'index.js');

/**
 * Call MCP tool via stdio
 */
async function callMCPTool(toolName: string, args: any = {}): Promise<{ success: boolean; message: string }> {
  const input = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  });

  try {
    const { stdout, stderr } = await execAsync(
      `echo '${input}' | node "${SERVER_PATH}" 2>&1`,
      { 
        cwd: path.join(__dirname, '..', '..'),
        timeout: 90000 // 90 second timeout for Minecraft interactions
      }
    );

    // Combine stdout and stderr since server logs go to stderr
    const output = stdout + stderr;
    
    // Find JSON response in output
    const jsonMatch = output.match(/\{"result":\{.*?\},"jsonrpc":"2\.0","id":\d+\}/);
    if (jsonMatch) {
      const response = JSON.parse(jsonMatch[0]);
      if (response.result?.content?.[0]?.text) {
        const text = response.result.content[0].text;
        return {
          success: text.includes('SUCCESS'),
          message: text
        };
      }
    }

    return { success: false, message: `No valid response. Output: ${output.substring(0, 200)}` };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Integration test suite
 */
const integrationTests = [
  {
    name: 'Click Play - Main Menu to Worlds List',
    async run() {
      console.log('  Testing: Main Menu -> Worlds List');
      const result = await callMCPTool('click_play');
      return result;
    },
  },
  {
    name: 'Edit World - Worlds List to Edit Screen',
    async run() {
      console.log('  Testing: Worlds List -> Edit World');
      const result = await callMCPTool('edit_world');
      return result;
    },
  },
  {
    name: 'Go Back - Edit Screen to Worlds List',
    async run() {
      console.log('  Testing: Edit World -> Worlds List (back button)');
      const result = await callMCPTool('go_back');
      return result;
    },
  },
];

/**
 * Full workflow test: Apply addon to world
 */
async function testFullWorkflow() {
  console.log('\n🚀 Testing Full Workflow: Apply Addon to World\n');
  
  const steps = [
    { name: 'Navigate to Worlds List', tool: 'click_play' },
    { name: 'Open World Edit', tool: 'edit_world' },
    { name: 'Open Resource Packs', tool: 'select_resource_packs' },
    { name: 'Activate Resource Pack', tool: 'activate_resource_pack', args: { pack_name: 'monarch_garden_rp', confirm_update: true } },
    { name: 'Open Behavior Packs', tool: 'select_behavior_packs' },
    { name: 'Activate Behavior Pack', tool: 'activate_behavior_pack', args: { pack_name: 'monarch_garden' } },
    { name: 'Return to Worlds List', tool: 'go_back' },
  ];

  let passed = 0;
  let failed = 0;

  for (const step of steps) {
    process.stdout.write(`  ${step.name}... `);
    const result = await callMCPTool(step.tool, step.args || {});
    
    if (result.success) {
      console.log('✅');
      passed++;
    } else {
      console.log('❌');
      console.log(`    ${result.message}`);
      failed++;
      break; // Stop on first failure since workflow is sequential
    }

    // Wait a bit between steps
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { passed, failed, total: steps.length };
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
  console.log('🧪 Starting Minecraft Automation Integration Tests\n');
  console.log('⚠️  Prerequisites:');
  console.log('   - Minecraft must be running');
  console.log('   - Start at main menu for best results');
  console.log('   - Do not interact with Minecraft during tests\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // Run individual tests
  console.log('📋 Individual Navigation Tests:\n');
  
  for (const test of integrationTests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const result = await test.run();
      
      if (result.success) {
        console.log('✅ PASS');
        totalPassed++;
      } else {
        console.log('❌ FAIL');
        console.log(`   ${result.message}`);
        totalFailed++;
      }
    } catch (error: any) {
      console.log('❌ FAIL (exception)');
      console.log(`   Error: ${error.message}`);
      totalFailed++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Run full workflow test
  const workflowResult = await testFullWorkflow();
  totalPassed += workflowResult.passed;
  totalFailed += workflowResult.failed;

  // Summary
  console.log(`\n📊 Results: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${totalFailed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
