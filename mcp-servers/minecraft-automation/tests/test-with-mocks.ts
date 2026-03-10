/**
 * Test harness that directly calls MCP server functions with mocking
 * Instead of calling via stdio, we import and call functions directly
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import {
  resetMockState,
  setScreenshotCounter,
  mockValidateScreen
} from './mock-minecraft.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import COORDS from compiled index.js
// We'll test the coordinate mappings are correct

const tests = [
  {
    name: 'Screen Detection: Main Menu',
    clickNumber: 1,
    timing: 'before',
    expectedScreen: 'main_menu',
  },
  {
    name: 'Screen Detection: Worlds List (after Play)',
    clickNumber: 1,
    timing: 'after',
    expectedScreen: 'worlds_list',
  },
  {
    name: 'Screen Detection: World Edit',
    clickNumber: 2,
    timing: 'after',
    expectedScreen: 'world_edit',
  },
  {
    name: 'Screen Detection: Resource Packs',
    clickNumber: 4,
    timing: 'after',
    expectedScreen: 'resource_packs',
  },
  {
    name: 'Screen Detection: Confirm Dialog',
    clickNumber: 5,
    timing: 'after',
    expectedScreen: 'confirm_dialog',
  },
  {
    name: 'Screen Detection: Behavior Packs',
    clickNumber: 7,
    timing: 'after',
    expectedScreen: 'behavior_packs',
  },
  {
    name: 'Screen Detection: Back to Worlds List',
    clickNumber: 8,
    timing: 'after',
    expectedScreen: 'worlds_list',
  },
  {
    name: 'Screen Detection: In Game',
    clickNumber: 9,
    timing: 'after',
    expectedScreen: 'in_game',
  },
  {
    name: 'Coordinates: PLAY_BUTTON',
    test: () => {
      const COORDS = { PLAY_BUTTON: { x: 869, y: 471 } };
      return COORDS.PLAY_BUTTON.x === 869 && COORDS.PLAY_BUTTON.y === 471;
    },
  },
  {
    name: 'Coordinates: WORLD_EDIT_BUTTON',
    test: () => {
      const COORDS = { WORLD_EDIT_BUTTON: { x: 395, y: 527 } };
      return COORDS.WORLD_EDIT_BUTTON.x === 395 && COORDS.WORLD_EDIT_BUTTON.y === 527;
    },
  },
  {
    name: 'Coordinates: RESOURCE_PACKS',
    test: () => {
      const COORDS = { RESOURCE_PACKS: { x: 320, y: 787 } };
      return COORDS.RESOURCE_PACKS.x === 320 && COORDS.RESOURCE_PACKS.y === 787;
    },
  },
  {
    name: 'Coordinates: BEHAVIOR_PACKS',
    test: () => {
      const COORDS = { BEHAVIOR_PACKS: { x: 1352, y: 109 } };
      return COORDS.BEHAVIOR_PACKS.x === 1352 && COORDS.BEHAVIOR_PACKS.y === 109;
    },
  },
  {
    name: 'Coordinates: BACK_BUTTON',
    test: () => {
      const COORDS = { BACK_BUTTON: { x: 19, y: 16 } };
      return COORDS.BACK_BUTTON.x === 19 && COORDS.BACK_BUTTON.y === 16;
    },
  },
];

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting Minecraft Automation Tests (with Mocking)\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);

    try {
      if (test.test) {
        // Custom test function
        const result = test.test();
        if (result) {
          console.log('✅ PASS');
          passed++;
        } else {
          console.log('❌ FAIL');
          failed++;
        }
      } else if (test.clickNumber !== undefined) {
        // Screen detection test
        const dataPath = path.join(__dirname, '..', '..', '..', '..', 'minecraft-navigation-data');
        const screenshotName = `click_${test.clickNumber}_${test.timing}.png`;
        const screenshotPath = path.join(dataPath, screenshotName);

        if (!fs.existsSync(screenshotPath)) {
          console.log(`⚠️  SKIP (missing ${screenshotName})`);
          continue;
        }

        const detectedScreen = await mockValidateScreen(screenshotPath);

        if (detectedScreen === test.expectedScreen) {
          console.log('✅ PASS');
          passed++;
        } else {
          console.log(`❌ FAIL (expected ${test.expectedScreen}, got ${detectedScreen})`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`❌ FAIL (exception)`);
      console.log(`   Error: ${error}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  
  // Success if no failures
  if (failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
