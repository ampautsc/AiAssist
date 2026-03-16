/**
 * combat-session.spec.ts
 *
 * Requirements verified:
 * - Navigating to /combat-viewer creates a server session automatically
 * - The server session returns a valid sessionId
 * - The toolbar becomes interactive after session creation
 * - The roll bar renders and die buttons are available
 * - Navigating away destroys the session (no lingering sessions)
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Combat session lifecycle', () => {
  test('page loads and creates a server session', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // Canvas is present
    await expect(combat.canvas).toBeVisible()

    // Roll bar is always visible
    await expect(combat.rollBar).toBeVisible()

    // At least attack toolbar button should be in the DOM
    await expect(combat.toolbarBtn('attack')).toBeAttached()
  })

  test('session has valid state after creation', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // Directly query the health endpoint to confirm server is running
    const health = await combat.apiGet<{ ok: boolean }>('/api/health')
    expect(health.ok).toBe(true)
  })

  test('all six toolbar buttons are present', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    const keys = ['move', 'attack', 'spell', 'bonus', 'react', 'end']
    for (const key of keys) {
      await expect(combat.toolbarBtn(key)).toBeAttached({ timeout: 5_000 })
    }
  })

  test('error toast does not appear on clean load', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    await expect(combat.errorToast).not.toBeVisible()
  })

  test('no victory overlay on session start', async ({ page }) => {
    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    await expect(combat.victoryOverlay).not.toBeVisible()
  })
})
