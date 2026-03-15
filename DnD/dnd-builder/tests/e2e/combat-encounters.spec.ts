/**
 * combat-encounters.spec.ts
 *
 * Requirements verified:
 * - Triangular load button opens encounter modal
 * - Encounter cards are rendered and selectable
 * - Loading an encounter confirms replacement, recreates session, and spawns expected enemies
 * - Page remains interactive (no hang) after encounter load
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Combat encounter loader', () => {
  test('opens encounter modal from HUD load button', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    await page.getByTestId('load-encounter-btn').click()
    await expect(page.getByTestId('encounter-modal')).toBeVisible()
    await expect(page.getByTestId('encounter-card-undead-patrol')).toBeVisible()
    await expect(page.getByTestId('encounter-card-undead-horde')).toBeVisible()

    // Close and verify modal dismiss works
    await page.getByTestId('encounter-modal-close').click()
    await expect(page.getByTestId('encounter-modal')).not.toBeVisible()
  })

  test('loads a larger encounter and remains interactive (no hang)', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    const beforeSessionId = await page.locator('[data-session-id]').getAttribute('data-session-id')

    // Open modal and choose a larger encounter
    await page.getByTestId('load-encounter-btn').click()
    await expect(page.getByTestId('encounter-modal')).toBeVisible()

    // Confirm replacement prompt should appear because session is active
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('Replace current encounter')
      await dialog.accept()
    })

    await page.getByTestId('encounter-load-undead-horde').click()

    // Modal closes after load starts
    await expect(page.getByTestId('encounter-modal')).not.toBeVisible({ timeout: 10_000 })

    // Wait for next session state to settle
    await combat.waitForSession()

    const afterSessionId = await page.locator('[data-session-id]').getAttribute('data-session-id')
    expect(afterSessionId).toBeTruthy()
    expect(afterSessionId).not.toEqual(beforeSessionId)

    // Undead Horde = 10 enemies + 1 player marker = 11 total entity markers
    const entityMarkers = page.locator('[data-testid^="entity-pos-"]')
    await expect(entityMarkers).toHaveCount(11)

    // Smoke interaction: toolbar still clickable and responsive
    await combat.clickToolbar('move')
    await expect(combat.modeBanner).toBeVisible()
    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()

    // No crash toast on successful flow
    await expect(combat.errorToast).not.toBeVisible()
  })
})
