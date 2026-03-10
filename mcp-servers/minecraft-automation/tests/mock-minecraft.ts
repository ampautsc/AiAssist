/**
 * Mock layer for Minecraft automation testing
 * Uses pre-recorded screenshots to simulate Minecraft interactions
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to screenshot fixtures
const FIXTURES_PATH = path.join(__dirname, '..', '..', '..', '..', 'minecraft-navigation-data');

// Current simulated screen state
let currentScreen = 'main_menu';
let screenshotCounter = 1;

/**
 * Mock: Check if Minecraft is "running" (always true in tests)
 */
export function mockIsMinecraftRunning(): boolean {
  return true;
}

/**
 * Mock: Start Minecraft (no-op in tests)
 */
export function mockStartMinecraft(): void {
  // No-op
}

/**
 * Mock: Activate Minecraft (no-op in tests)
 */
export function mockActivateMinecraft(): void {
  // No-op
}

/**
 * Mock: Take screenshot - copies from fixtures
 */
export function mockTakeScreenshot(filename: string): void {
  // Determine which fixture to copy based on current state
  const fixtureFile = `click_${screenshotCounter}_${filename.includes('before') ? 'before' : 'after'}.png`;
  const fixturePath = path.join(FIXTURES_PATH, fixtureFile);
  
  if (fs.existsSync(fixturePath)) {
    fs.copyFileSync(fixturePath, filename);
  } else {
    console.warn(`Warning: Fixture ${fixtureFile} not found`);
  }
}

/**
 * Mock: Validate screen using OCR on fixture screenshots
 */
export async function mockValidateScreen(screenshotPath: string): Promise<string> {
  // Extract click number from path if available
  const match = screenshotPath.match(/click_(\d+)_(before|after)/);
  
  if (!match) {
    // Fall back to actual OCR if path doesn't match pattern
    return performOCR(screenshotPath);
  }

  const clickNum = parseInt(match[1]);
  const timing = match[2];

  // Map known screenshots to their screen types based on workflow analysis
  const screenMap: { [key: string]: string } = {
    '1_before': 'main_menu',
    '1_after': 'worlds_list',
    '2_before': 'worlds_list',
    '2_after': 'world_edit',
    '3_before': 'world_edit',
    '3_after': 'world_edit',
    '4_before': 'world_edit',
    '4_after': 'resource_packs',
    '5_before': 'resource_packs',
    '5_after': 'confirm_dialog',
    '6_before': 'confirm_dialog',
    '6_after': 'resource_packs',
    '7_before': 'resource_packs',
    '7_after': 'behavior_packs',
    '8_before': 'world_edit',
    '8_after': 'worlds_list',
    '9_before': 'worlds_list',
    '9_after': 'in_game',
  };

  const key = `${clickNum}_${timing}`;
  return screenMap[key] || 'unknown';
}

/**
 * Mock: Click at coordinates (updates internal state)
 */
export function mockClickAt(x: number, y: number): void {
  // Simulate click by advancing screenshot counter
  screenshotCounter++;
  
  // Simulate 5-second wait
  // In real code this would be: await new Promise(resolve => setTimeout(resolve, 5000));
  // In tests, we skip the wait
}

/**
 * Actually perform OCR on a screenshot (fallback)
 */
async function performOCR(screenshotPath: string): Promise<string> {
  if (!fs.existsSync(screenshotPath)) {
    return 'unknown';
  }

  // This would call the real Python OCR script
  // For now, return unknown since we're using the screenMap above
  return 'unknown';
}

/**
 * Reset mock state
 */
export function resetMockState(): void {
  currentScreen = 'main_menu';
  screenshotCounter = 1;
}

/**
 * Set current screenshot counter (for test setup)
 */
export function setScreenshotCounter(counter: number): void {
  screenshotCounter = counter;
}
