/**
 * combat-targeting.spec.ts
 *
 * Requirements verified:
 * - Selecting a spell with validTargets enters target selection mode
 * - Mode banner shows target selection prompt
 * - Escape cancels target mode
 * - Clicking a valid target hex resolves the spell
 * - Attacks with a pre-filled targetId resolve directly (no target mode)
 * - No error toast after successful actions
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Target selection mode', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('opening spell flyout and selecting a spell enters target mode', async ({ page }) => {
    await combat.clickToolbar('spell')

    // First spell should be a single-target spell (e.g. Vicious Mockery)
    const firstSpell = page.locator('[data-testid^="flyout-spell-"]').first()
    await expect(firstSpell).toBeVisible({ timeout: 3_000 })
    await firstSpell.click()

    // Spell has validTargets — should enter target selection mode
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Esc to cancel')
  })

  test('Escape cancels target mode after spell selection', async ({ page }) => {
    await combat.clickToolbar('spell')
    const firstSpell = page.locator('[data-testid^="flyout-spell-"]').first()
    await firstSpell.click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('attack with pre-filled target resolves directly without target mode', async ({ page }) => {
    await combat.clickToolbar('attack')
    const firstAttack = page.locator('[data-testid^="flyout-attack-"]').first()
    await expect(firstAttack).toBeVisible({ timeout: 3_000 })
    await firstAttack.click()

    // Attack has targetId baked in — no target mode banner should appear
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 2_000 })

    // No error toast
    await expect(combat.errorToast).not.toBeVisible({ timeout: 2_000 })
  })

  test('clicking spell target zombie hex resolves the spell', async ({ page }) => {
    await combat.clickToolbar('spell')
    const firstSpell = page.locator('[data-testid^="flyout-spell-"]').first()
    await firstSpell.click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Zombie is at q=3, r=-1
    await combat.clickEntityHex(3, -1)

    // Target mode should end after clicking valid target
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })

    // No error toast
    await expect(combat.errorToast).not.toBeVisible()
  })

  test('no error toast after submitting an attack', async ({ page }) => {
    await combat.clickToolbar('attack')
    const firstAttack = page.locator('[data-testid^="flyout-attack-"]').first()
    await firstAttack.click()
    await page.waitForTimeout(1_000)

    await expect(combat.errorToast).not.toBeVisible()
  })
})
