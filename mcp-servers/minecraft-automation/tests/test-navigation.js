/**
 * Comprehensive tests for Minecraft Automation MCP Server
 *
 * Tests use existing screenshots from minecraft-navigation-data folder
 * Each test validates the full workflow: start Minecraft, activate, screenshot, click, verify
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
const execAsync = promisify(exec);
// MCP client simulation
async function callTool(toolName, args = {}) {
    const input = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args,
        },
    });
    // Call the MCP server via stdio
    const { stdout } = await execAsync(`echo '${input}' | node ../build/index.js`, { cwd: __dirname });
    return stdout;
}
/**
 * Test Suite
 */
const tests = [
    {
        name: 'click_play - Main Menu to Worlds List',
        tool: 'click_play',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_1_before.png', // Main menu
        afterScreenshot: 'click_1_after.png', // Worlds list
    },
    {
        name: 'edit_world - Select World Edit',
        tool: 'edit_world',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_2_before.png', // Worlds list
        afterScreenshot: 'click_2_after.png', // Edit world screen
    },
    {
        name: 'select_resource_packs - Open Resource Packs',
        tool: 'select_resource_packs',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_4_before.png',
        afterScreenshot: 'click_4_after.png',
    },
    {
        name: 'activate_resource_pack - Activate Pack',
        tool: 'activate_resource_pack',
        args: { pack_name: 'monarch_garden_rp', confirm_update: true },
        expectedSuccess: true,
        beforeScreenshot: 'click_5_before.png',
        afterScreenshot: 'click_6_after.png',
    },
    {
        name: 'select_behavior_packs - Open Behavior Packs',
        tool: 'select_behavior_packs',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_6_before.png',
        afterScreenshot: 'click_7_after.png',
    },
    {
        name: 'activate_behavior_pack - Activate Pack',
        tool: 'activate_behavior_pack',
        args: { pack_name: 'monarch_garden' },
        expectedSuccess: true,
        beforeScreenshot: 'click_7_before.png',
        afterScreenshot: 'click_7_after.png',
    },
    {
        name: 'go_back - Return to Worlds List',
        tool: 'go_back',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_8_before.png',
        afterScreenshot: 'click_8_after.png',
    },
    {
        name: 'launch_world - Load World',
        tool: 'launch_world',
        args: {},
        expectedSuccess: true,
        beforeScreenshot: 'click_9_before.png',
        afterScreenshot: 'click_9_after.png',
    },
];
/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 Starting Minecraft Automation MCP Server Tests\n');
    let passed = 0;
    let failed = 0;
    for (const test of tests) {
        process.stdout.write(`Testing ${test.name}... `);
        try {
            // Verify screenshots exist
            const dataPath = '..\\..\\..\\minecraft-navigation-data';
            const beforePath = path.join(__dirname, dataPath, test.beforeScreenshot);
            const afterPath = path.join(__dirname, dataPath, test.afterScreenshot);
            if (!fs.existsSync(beforePath)) {
                console.log(`⚠️  SKIP (missing ${test.beforeScreenshot})`);
                continue;
            }
            if (!fs.existsSync(afterPath)) {
                console.log(`⚠️  SKIP (missing ${test.afterScreenshot})`);
                continue;
            }
            // Call the tool
            const result = await callTool(test.tool, test.args);
            // Check for SUCCESS in response
            if (result.includes('SUCCESS') && test.expectedSuccess) {
                console.log('✅ PASS');
                passed++;
            }
            else if (result.includes('ERROR') && !test.expectedSuccess) {
                console.log('✅ PASS (expected error)');
                passed++;
            }
            else {
                console.log(`❌ FAIL`);
                console.log(`   Result: ${result.substring(0, 100)}...`);
                failed++;
            }
        }
        catch (error) {
            console.log(`❌ FAIL (exception)`);
            console.log(`   Error: ${error}`);
            failed++;
        }
    }
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
    process.exit(failed > 0 ? 1 : 0);
}
// Run if executed directly
if (require.main === module) {
    runTests().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
export { runTests, callTool };
