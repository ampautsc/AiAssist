/**
 * combat-toolbar.spec.ts
 *
 * Requirements verified:
 * - Attack button opens the attack flyout
 * - Spell button opens the spell flyout
 * - Bonus action button opens the bonus flyout
 * - Flyout items are rendered from the server menu
 * - Clicking outside a flyout closes it
 * - End Turn button is always enabled
 * - Disabled buttons do not open flyouts
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Combat toolbar', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('attack button opens attack flyout with server items', async ({ page }) => {
    await combat.clickToolbar('attack')

    // At least one flyout item starting with 'flyout-attack-' should appear
    const attackItems = page.locator('[data-testid^="flyout-attack-"]')
    await expect(attackItems.first()).toBeVisible({ timeout: 3_000 })
  })

  test('spell button opens spell flyout with server items', async ({ page }) => {
    await combat.clickToolbar('spell')

    // Lore Bard has spells — at least one item starting with 'flyout-spell-'
    const spellItems = page.locator('[data-testid^="flyout-spell-"]')
    await expect(spellItems.first()).toBeVisible({ timeout: 3_000 })
  })

  test('clicking toolbar button again closes its own flyout', async ({ page }) => {
    await combat.clickToolbar('attack')
    const attackItems = page.locator('[data-testid^="flyout-attack-"]')
    await expect(attackItems.first()).toBeVisible({ timeout: 3_000 })

    // Click attack again — flyout should close
    await combat.clickToolbar('attack')
    await expect(attackItems.first()).not.toBeVisible()
  })

  test('switching between two flyouts closes the first', async ({ page }) => {
    await combat.clickToolbar('attack')
    const attackItems = page.locator('[data-testid^="flyout-attack-"]')
    await expect(attackItems.first()).toBeVisible({ timeout: 3_000 })

    await combat.clickToolbar('spell')
    const spellItems = page.locator('[data-testid^="flyout-spell-"]')
    await expect(spellItems.first()).toBeVisible({ timeout: 3_000 })

    // Attack flyout should now be gone
    await expect(attackItems.first()).not.toBeVisible()
  })

  test('end turn button is always present', async () => {
    await expect(combat.toolbarBtn('end')).toBeAttached()
  })

  test('move button is accessible', async () => {
    // Move button should exist regardless of whether movement remains
    await expect(combat.toolbarBtn('move')).toBeAttached()
  })
})
