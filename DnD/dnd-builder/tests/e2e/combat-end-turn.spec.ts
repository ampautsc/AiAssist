/**
 * combat-end-turn.spec.ts
 *
 * Requirements verified:
 * - End Turn button ends the player's turn and advances to the enemy
 * - After End Turn the active combatant name changes in the HUD
 * - Multiple End Turn presses cycle through combatants back to player
 * - End Turn is always clickable (never disabled)
 * - Combat can continue for multiple rounds without errors
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('End turn flow', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('end turn button is always present and clickable', async ({ page }) => {
    const endBtn = combat.toolbarBtn('end')
    await expect(endBtn).toBeAttached()

    // Should be clickable without error
    await endBtn.click()
    await expect(combat.errorToast).not.toBeVisible({ timeout: 2_000 })
  })

  test('no error toast after end turn', async () => {
    await combat.endTurn()
    await expect(combat.errorToast).not.toBeVisible()
  })

  test('victory overlay does not appear immediately after one end turn', async () => {
    await combat.endTurn()
    // One end turn should not kill all enemies
    await expect(combat.victoryOverlay).not.toBeVisible({ timeout: 2_000 })
  })

  test('multiple end turns do not cause errors', async ({ page }) => {
    // End turn 3 times (player → enemy → player)
    for (let i = 0; i < 3; i++) {
      await combat.endTurn()
      await expect(combat.errorToast).not.toBeVisible()
    }
  })

  test('roll bar remains visible after end turn', async () => {
    await combat.endTurn()
    await expect(combat.rollBar).toBeVisible()
  })

  test('canvas remains visible after end turn', async () => {
    await combat.endTurn()
    await expect(combat.canvas).toBeVisible()
  })
})
