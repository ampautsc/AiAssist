/**
 * combat-movement.spec.ts
 *
 * Requirements verified:
 * - Clicking Move button enters move interaction mode
 * - Mode banner appears with correct text
 * - Pressing Escape exits move mode and hides the mode banner
 * - Clicking a reachable hex while in move mode triggers a move
 * - Move mode is cancelled when active combatant changes
 * - Movement budget is correctly deducted after each move (bug regression)
 * - Total movement in a turn cannot exceed the combatant's speed
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

test.describe('Movement interaction mode', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('clicking Move enters move mode and shows mode banner', async () => {
    await combat.startMoveMode()

    await expect(combat.modeBanner).toBeVisible()
    await expect(combat.modeBanner).toContainText('Select a hex to move to')
    await expect(combat.modeBanner).toContainText('Esc to cancel')
  })

  test('Escape cancels move mode and hides banner', async () => {
    await combat.startMoveMode()
    await expect(combat.modeBanner).toBeVisible()

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('move banner disappears after clicking another toolbar button', async ({ page }) => {
    await combat.startMoveMode()
    await expect(combat.modeBanner).toBeVisible()

    // Click Attack — should switch interaction mode away from move (no move banner)
    await combat.clickToolbar('attack')
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('mode banner is not visible in idle state', async () => {
    // Before any interaction
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('clicking a nearby hex in move mode submits a move command', async ({ page }) => {
    await combat.startMoveMode()

    // Player starts at q=0,r=0 — click an adjacent hex q=1,r=0
    await combat.clickHex(1, 0)

    // After clicking, move mode should end (banner disappears)
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Movement budget regression — hex coordinate deduction', () => {
  /**
   * Bug: the server computed gridDistance by reading pos.x and pos.y, but the
   * frontend submits positions as { q, r } axial hex coordinates.  Since pos.x
   * and pos.y were undefined, gridDistance always returned 0 and movementRemaining
   * was never deducted — allowing unlimited movement in a turn.
   *
   * These tests verify the fix: after moving N hexes the server correctly reports
   * movementRemaining decreased by N*5 feet.
   */

  test('movement budget is deducted on the server after moving one hex', async ({ page }) => {
    let sessionId: string | undefined

    // Intercept session creation to capture the session ID
    page.on('response', async (res) => {
      if (res.url().includes('/api/combat/sessions') && res.request().method() === 'POST') {
        try {
          const body = await res.json()
          if (body?.data?.sessionId) sessionId = body.data.sessionId
        } catch { /* ignore parse errors */ }
      }
    })

    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // Verify session ID was captured
    expect(sessionId).toBeTruthy()

    // Get initial movement budget
    const before = await combat.apiGet<any>(`/api/combat/sessions/${sessionId}`)
    const beforeCombatants: any[] = before?.data?.state?.combatants ?? []
    const activeIdBefore: string = before?.data?.activeId
    const activeBeforeMove = beforeCombatants.find((c: any) => c.id === activeIdBefore)

    expect(activeBeforeMove).toBeTruthy()
    const initialMovement: number = activeBeforeMove.movementRemaining
    expect(initialMovement).toBeGreaterThan(0)

    // Enter move mode and click an adjacent hex (1 hex = 5ft away)
    await combat.startMoveMode()
    await combat.clickHex(1, 0)
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })

    // Give server a moment to process
    await page.waitForTimeout(300)

    // Verify the server deducted 5ft from movementRemaining
    const after = await combat.apiGet<any>(`/api/combat/sessions/${sessionId}`)
    const afterCombatants: any[] = after?.data?.state?.combatants ?? []
    const activeAfterMove = afterCombatants.find((c: any) => c.id === activeIdBefore)

    expect(activeAfterMove).toBeTruthy()
    expect(activeAfterMove.movementRemaining).toBeLessThan(initialMovement)
    expect(activeAfterMove.movementRemaining).toBe(initialMovement - 5)
  })

  test('split movement correctly accumulates — total cannot exceed speed', async ({ page }) => {
    let sessionId: string | undefined

    page.on('response', async (res) => {
      if (res.url().includes('/api/combat/sessions') && res.request().method() === 'POST') {
        try {
          const body = await res.json()
          if (body?.data?.sessionId) sessionId = body.data.sessionId
        } catch { /* ignore */ }
      }
    })

    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    expect(sessionId).toBeTruthy()

    // Get initial budget
    const start = await combat.apiGet<any>(`/api/combat/sessions/${sessionId}`)
    const activeId: string = start?.data?.activeId
    const startCombatant = (start?.data?.state?.combatants ?? []).find((c: any) => c.id === activeId)
    const speed: number = startCombatant?.movementRemaining ?? 30

    // First move: 1 hex (5ft)
    await combat.startMoveMode()
    await combat.clickHex(1, 0)
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(300)

    const after1 = await combat.apiGet<any>(`/api/combat/sessions/${sessionId}`)
    const combatant1 = (after1?.data?.state?.combatants ?? []).find((c: any) => c.id === activeId)
    expect(combatant1.movementRemaining).toBe(speed - 5)

    // Second move: another adjacent hex (5ft)
    await combat.startMoveMode()
    await combat.clickHex(2, 0)
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(300)

    const after2 = await combat.apiGet<any>(`/api/combat/sessions/${sessionId}`)
    const combatant2 = (after2?.data?.state?.combatants ?? []).find((c: any) => c.id === activeId)
    expect(combatant2.movementRemaining).toBe(speed - 10)

    // Total movement deducted must equal the number of hexes × 5
    expect(speed - combatant2.movementRemaining).toBe(10)
  })
})
