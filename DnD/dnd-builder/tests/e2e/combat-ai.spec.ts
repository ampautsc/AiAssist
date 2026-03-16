/**
 * combat-ai.spec.ts
 *
 * Requirements verified:
 * - After the player ends their turn, the zombie automatically takes its turn
 *   without any player input (autonomous AI).
 * - The zombie moves toward the player — its position changes from (q=3, r=-1).
 * - Zombie movement is recorded in the combat log ("Zombie moves").
 * - When close enough, the zombie attacks (combat log shows "Zombie attacks").
 * - After the zombie's AI turn completes, control returns to the player (party-1).
 *
 * Default scenario (CombatViewer default):
 *   Player (party-1 / bard) at q=0, r=0   — always wins initiative (dexMod:100)
 *   Zombie (zombie-1)       at q=3, r=-1  — aiProfile: undead_basic
 *   Distance = 3 hexes (15 ft) — within zombie's 30 ft move range, so it
 *   moves adjacent and attacks in the same turn.
 */

import { test, expect } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

const BARD_ID   = 'party-1'
const ZOMBIE_ID = 'zombie-1'

// Zombie starts at (3, -1)
const ZOMBIE_START = { q: 3, r: -1 }

test.describe('Zombie AI auto-turn', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  // ── Turn ownership ──────────────────────────────────────────────────────────

  test('player (bard) goes first', async () => {
    const activeId = await combat.getSessionActiveId()
    expect(activeId).toBe(BARD_ID)
  })

  test('after player ends turn, zombie is NOT active — AI runs and returns to player', async () => {
    // The AI runs synchronously server-side during endTurn.
    // By the time the response settles the turn has already cycled back to the player.
    await combat.endTurn()
    // Wait for at least one AI log line as a proxy that the server round-trip finished.
    await combat.assertLogContains('Zombie', 8_000)
    const activeId = await combat.getSessionActiveId()
    expect(activeId).toBe(BARD_ID)
  })

  // ── Zombie movement ─────────────────────────────────────────────────────────

  test('zombie moves from its starting position toward the player', async () => {
    const before = await combat.getServerEntityPosition(ZOMBIE_ID)
    expect(before).toMatchObject(ZOMBIE_START)    // sanity: confirm start position

    await combat.endTurn()
    await combat.assertLogContains('Zombie moves', 8_000)

    const after = await combat.getServerEntityPosition(ZOMBIE_ID)
    // Zombie should have advanced along the q axis (toward q=0)
    expect(Number(after.q)).toBeLessThan(ZOMBIE_START.q)
  })

  test('zombie map position (UI canvas) updates to match server position', async () => {
    await combat.endTurn()
    await combat.assertLogContains('Zombie moves', 8_000)

    const serverPos = await combat.getServerEntityPosition(ZOMBIE_ID)
    const mapPos    = await combat.getMapEntityPosition(ZOMBIE_ID)

    expect(mapPos.q).toBe(Number(serverPos.q))
    expect(mapPos.r).toBe(Number(serverPos.r))
  })

  // ── Combat log content ──────────────────────────────────────────────────────

  test('combat log shows zombie move entry after player ends turn', async () => {
    await combat.endTurn()
    await combat.assertLogContains('Zombie moves', 8_000)
  })

  test('combat log shows zombie attack entry (zombie is close enough to attack)', async () => {
    // Default distance (3 hexes / 15 ft) is within zombie 30 ft speed so it
    // moves adjacent and attacks in the same turn.
    await combat.endTurn()
    await combat.assertLogContains('Zombie attacks', 8_000)
  })

  // ── Multi-round AI continuity ───────────────────────────────────────────────

  test('zombie AI fires every round without errors', async () => {
    for (let round = 1; round <= 3; round++) {
      await combat.endTurn()
      // Each round the zombie should produce at least one log entry
      await combat.assertLogContains('Zombie', 8_000)
      await expect(combat.errorToast).not.toBeVisible()
    }
  })

  test('no error toast appears after AI turn', async () => {
    await combat.endTurn()
    await combat.assertLogContains('Zombie', 8_000)
    await expect(combat.errorToast).not.toBeVisible()
  })
})

// ── Opportunity Attack ──────────────────────────────────────────────────────
//
// Scenario: Player bard starts at q=0,r=0.  Zombie starts at q=3,r=-1.
//   Step 1 — bard moves to q=2,r=-1 (1 hex = 5ft from zombie → adjacent).
//   Step 2 — bard moves to q=-2,r=0 (5 hexes from zombie → leaves reach).
// Expected: zombie makes an opportunity attack; combat log records it.
//
// Notes:
//   distBefore(step2) = max(|2-3|,|-1+1|,|2+1-3+1|)*5 = max(1,0,1)*5 = 5 ft  ← in melee
//   distAfter(step2)  = max(|-2-3|,|0+1|,|-2+3+0+1|)*5 = max(5,1,2)*5 = 25 ft ← out of reach
//   Bard movement: 10 ft + 20 ft = 30 ft (exactly the default 30 ft speed).

test.describe('Opportunity Attack', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('zombie makes opportunity attack when player leaves its melee reach', async () => {
    // ── Retrieve session ID from the page ──────────────────────────────────
    const sessionId = await combat.page.evaluate(() =>
      document.querySelector('[data-session-id]')?.getAttribute('data-session-id') ?? null
    )
    if (!sessionId) throw new Error('No session ID found in page')

    const actionsUrl = `/api/combat/sessions/${sessionId}/actions`

    // Step 1: bard moves adjacent to the zombie (q=2, r=-1 is 5 ft from zombie at q=3,r=-1)
    const move1 = await combat.apiPost<{ data: { result: { type: string } } }>(actionsUrl, {
      optionId: 'move-to',
      position: { q: 2, r: -1 },
    })
    expect(move1.data.result.type).toBe('move')

    // Step 2: bard moves away — now 25 ft from zombie, triggering an opportunity attack
    const move2 = await combat.apiPost<{ data: { result: { type: string } } }>(actionsUrl, {
      optionId: 'move-to',
      position: { q: -2, r: 0 },
    })
    expect(move2.data.result.type).toBe('move')

    // ── Assert opportunity attack is recorded in the server session log ────
    const sessionState = await combat.apiGet<{
      data: { state: { log: string[] } }
    }>(`/api/combat/sessions/${sessionId}`)

    const log = sessionState.data.state.log
    const oaEntry = log.find(l => l.toLowerCase().includes('opportunity attack'))
    expect(oaEntry).toBeTruthy()

  })

  test('no opportunity attack when player uses Disengage before moving away', async () => {
    const sessionId = await combat.page.evaluate(() =>
      document.querySelector('[data-session-id]')?.getAttribute('data-session-id') ?? null
    )
    if (!sessionId) throw new Error('No session ID found in page')

    const actionsUrl = `/api/combat/sessions/${sessionId}/actions`

    // Step 1: bard moves adjacent to zombie
    await combat.apiPost(actionsUrl, { optionId: 'move-to', position: { q: 2, r: -1 } })

    // Step 2: fetch the turn menu to find the Disengage optionId (it is generated dynamically)
    const menuData = await combat.apiGet<{
      data: { menu: { actions: Array<{ optionId: string; type: string; label: string }> } }
    }>(`/api/combat/sessions/${sessionId}/menu`)
    const disengageOpt = menuData.data.menu.actions.find(o => o.type === 'disengage')
    if (!disengageOpt) throw new Error('Disengage option not found in menu')

    // Step 3: bard Disengages — this sets disengaged:true, preventing OA
    await combat.apiPost(actionsUrl, { optionId: disengageOpt.optionId })

    // Step 4: bard moves away — no OA should fire because bard Disengaged
    await combat.apiPost(actionsUrl, { optionId: 'move-to', position: { q: -2, r: 0 } })

    const sessionState = await combat.apiGet<{
      data: { state: { log: string[] } }
    }>(`/api/combat/sessions/${sessionId}`)

    const log = sessionState.data.state.log
    const oaEntry = log.find(l => l.toLowerCase().includes('opportunity attack'))
    expect(oaEntry).toBeUndefined()
  })
})
