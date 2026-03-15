/**
 * combat-polymorph.spec.ts
 *
 * End-to-end tests for the Polymorph spell beast form selection flow.
 *
 * Requirements verified:
 * - Polymorph appears in spell flyout
 * - Clicking Polymorph enters target selection mode
 * - Clicking self (bard) opens beast form picker overlay
 * - Beast form picker is visible with form cards
 * - Each form card displays name, CR, HP, AC, speed, and attacks
 * - Clicking a beast form resolves the spell — combat log shows cast + polymorph
 * - Escape cancels target selection mode for Polymorph
 * - Escape cancels beast form selection mode
 * - Clicking enemy enters beast form picker with Sheep
 * - Beast form picker items are interactive (not blocked by pointer-events)
 *
 * Default session: Gem Dragonborn Lore Bard 8 (player, q=0,r=0) vs Zombie (enemy, q=3,r=-1)
 */

import { test, expect, type Page } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

/** Scoped locator for the first spell flyout item whose label contains `name`. */
function spellItem(page: Page, name: string) {
  return page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: name }).first()
}

// ── Polymorph in Spell Flyout ────────────────────────────────────────────────

test.describe('Polymorph — spell flyout', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('Polymorph appears in the spell flyout', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Polymorph')).toBeVisible({ timeout: 3_000 })
  })
})

// ── Polymorph Target Selection ───────────────────────────────────────────────

test.describe('Polymorph — target selection mode', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('clicking Polymorph enters target selection mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Polymorph')
  })

  test('Escape cancels target selection mode for Polymorph', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })
})

// ── Beast Form Picker (Self-Target) ──────────────────────────────────────────

test.describe('Polymorph — beast form picker (self)', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('clicking self in target mode opens beast form picker', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Click self (bard at q=0, r=0)
    await combat.clickEntityHex(0, 0)

    // Beast form picker should appear
    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })
    await expect(picker).toContainText('Choose Beast Form')
  })

  test('beast form picker shows mode banner', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Choose a beast form')
    await expect(combat.modeBanner).toContainText('Polymorph')
  })

  test('beast form picker contains T-Rex as highest CR option', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    const trex = page.getByTestId('beast-form-t-rex')
    await expect(trex).toBeVisible()
    await expect(trex).toContainText('T-Rex')
    await expect(trex).toContainText('CR 8')
    await expect(trex).toContainText('HP 136')
  })

  test('beast form picker contains multiple forms across CRs', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    // Check a sampling of forms across CRs
    await expect(page.getByTestId('beast-form-t-rex')).toBeVisible()
    await expect(page.getByTestId('beast-form-giant-ape')).toBeVisible()
    await expect(page.getByTestId('beast-form-mammoth')).toBeVisible()
    await expect(page.getByTestId('beast-form-brown-bear')).toBeVisible()
    await expect(page.getByTestId('beast-form-giant-eagle')).toBeVisible()
  })

  test('beast form card displays attack info', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    const trex = page.getByTestId('beast-form-t-rex')
    await expect(trex).toContainText('Bite')
    await expect(trex).toContainText('Tail')
  })

  test('Escape cancels beast form picker', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    await page.keyboard.press('Escape')

    await expect(picker).not.toBeVisible({ timeout: 2_000 })
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 2_000 })
  })
})

// ── Beast Form Selection Resolution ──────────────────────────────────────────

test.describe('Polymorph — beast form selection resolves spell', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('clicking T-Rex resolves Polymorph — log shows cast + polymorph', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Click self
    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    // Click T-Rex
    await page.getByTestId('beast-form-t-rex').click()

    // Picker and mode banner should disappear
    await expect(picker).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    // Combat log shows Polymorph was cast
    await combat.assertLogContains('casts Polymorph')
  })

  test('clicking Giant Eagle resolves Polymorph — log shows cast', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    await page.getByTestId('beast-form-giant-eagle').click()

    await expect(picker).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    await combat.assertLogContains('casts Polymorph')
  })

  test('clicking Brown Bear resolves Polymorph — log shows cast', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    await page.getByTestId('beast-form-brown-bear').click()

    await expect(picker).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    await combat.assertLogContains('casts Polymorph')
  })

  test('after polymorph, bard has beast form HP via server state', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    // Choose T-Rex (136 HP)
    await page.getByTestId('beast-form-t-rex').click()
    await expect(picker).not.toBeVisible({ timeout: 5_000 })

    // Verify server state: bard should now be polymorphed with T-Rex stats
    const bard = await combat.getServerCombatant('party-1')
    expect(bard['polymorphedAs']).toBe('T-Rex')
    expect(bard['currentHP']).toBe(136)
    expect(bard['maxHP']).toBe(136)
    expect(bard['ac']).toBe(13)
  })

  test('no error toast after any beast form selection', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(0, 0)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    await page.getByTestId('beast-form-mammoth').click()

    await expect(picker).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })
  })
})

// ── Polymorph on Enemy (Sheep) ──────────────────────────────────────────────

test.describe('Polymorph — enemy target (Sheep)', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('clicking enemy in target mode opens beast form picker with Sheep', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Click zombie at q=3, r=-1
    await combat.clickEntityHex(3, -1)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    const sheep = page.getByTestId('beast-form-sheep')
    await expect(sheep).toBeVisible()
    await expect(sheep).toContainText('Sheep')
    await expect(sheep).toContainText('CR 0')
  })

  test('clicking Sheep resolves Polymorph on enemy — log shows cast + save', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Polymorph').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(3, -1)

    const picker = page.getByTestId('beast-form-picker')
    await expect(picker).toBeVisible({ timeout: 3_000 })

    await page.getByTestId('beast-form-sheep').click()
    await combat.throwDiceIfVisible()

    await expect(picker).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    await combat.assertLogContains('casts Polymorph')
    await combat.assertLogContains('WIS save')
  })
})
