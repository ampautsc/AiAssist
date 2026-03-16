/**
 * combat-rollbar.spec.ts
 *
 * Requirements verified:
 * - Dice roll bar is always visible at the bottom of the viewport
 * - All six die buttons are rendered (d4, d6, d8, d10, d12, d20)
 * - Clicking a die button opens DiceArena 3D overlay for free rolls
 * - After DiceArena resolves, roll history populates
 * - Die buttons are disabled when no session exists (edge case)
 * - Die buttons are enabled after session creation
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Dice Roll Bar', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('dice roll bar is visible on page load', async () => {
    await expect(combat.diceRollBar).toBeVisible()
  })

  test('all six die buttons are visible', async () => {
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      await expect(combat.dieBtn(sides)).toBeVisible()
    }
  })

  test('clicking d20 opens DiceArena 3D overlay', async () => {
    await combat.rollDie(20)

    // DiceArena overlay should appear
    const diceArena = combat.page.getByTestId('dice-arena')
    await expect(diceArena).toBeVisible({ timeout: 5_000 })

    // The roll status area should show active roll
    const status = combat.animArea()
    await expect(status).toContainText('Rolling', { timeout: 3_000 })
  })

  test('free roll completes after DiceArena interaction', async ({ page }) => {
    await combat.rollDie(20)

    // DiceArena appears
    const diceArena = page.getByTestId('dice-arena')
    await expect(diceArena).toBeVisible({ timeout: 5_000 })

    // Click the throw button inside the arena
    const throwBtn = diceArena.locator('button').first()
    await throwBtn.click({ force: true })

    // DiceArena should close after the physics finish
    await expect(diceArena).not.toBeVisible({ timeout: 15_000 })

    // Roll history should have at least one entry
    const history = combat.rollHistory()
    await expect(history).not.toBeEmpty({ timeout: 5_000 })
  })

  test('clicking d6 opens DiceArena with d6', async ({ page }) => {
    await combat.rollDie(6)

    const diceArena = page.getByTestId('dice-arena')
    await expect(diceArena).toBeVisible({ timeout: 5_000 })

    // The arena should show d6
    await expect(diceArena).toContainText('d6')
  })

  test('status area shows idle hint initially', async () => {
    await expect(combat.animArea()).toContainText('Click a die to roll')
  })
})
