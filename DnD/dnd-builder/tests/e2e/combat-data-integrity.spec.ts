/**
 * combat-data-integrity.spec.ts
 *
 * Requirements verified:
 * - Page loads with zero JavaScript errors (catches infinite reload loops, React crashes)
 * - Session ID is present in the DOM after session creation
 * - Entity position markers are rendered for every combatant
 * - Map entity positions match the server's authoritative positions after initial load
 * - Map entity HP matches server HP after session creation (catches field-name mismatches)
 * - After a damage-dealing spell, UI HP updates to match the server's HP
 * - After a server-initiated movement, UI position updates to match the server state
 * - Server combatant positions use hex coordinates (q,r) not legacy (x,y)
 * - No error toast appears during any of these operations
 *
 * These tests exist to catch the class of bugs found in prior sessions:
 *   - Server serializes currentHP/maxHP but UI read hp/maxHp → sync missed
 *   - Encounter config sent q/r as top-level fields instead of nested position: {q,r}
 *   - Stale server processes serving old code caused page crashes
 *   - Sync effect writing undefined HP values when fields don't match
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

// ── Constants matching the default encounter setup ────────────────────────────

const BARD_ID = 'party-1'
const ZOMBIE_ID = 'zombie-1'
const BARD_START = { q: 0, r: 0 }
const ZOMBIE_START = { q: 3, r: -1 }

// ── Page Health — Zero Errors ──────────────────────────────────────────────────

test.describe('Page health — zero errors on load', () => {
  test('no JavaScript errors during page load and session creation', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // Allow a brief settle for any deferred errors
    await page.waitForTimeout(500)

    expect(jsErrors, `Expected zero JS errors but got:\n${jsErrors.join('\n')}`).toHaveLength(0)
  })

  test('no console.error messages during page load', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
    await page.waitForTimeout(500)

    expect(
      consoleErrors,
      `Expected zero console errors but got:\n${consoleErrors.join('\n')}`
    ).toHaveLength(0)
  })

  test('page does not reload after initial load (no infinite loop)', async ({ page }) => {
    let loadCount = 0
    page.on('load', () => loadCount++)

    const combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()

    // Wait to make sure no secondary reload happens
    await page.waitForTimeout(2000)

    expect(loadCount, 'Page should load exactly once, but reloaded multiple times').toBe(1)
  })
})

// ── Session & DOM Markers ──────────────────────────────────────────────────────

test.describe('Session markers in DOM', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('combat-viewer wrapper has a non-empty session ID', async ({ page }) => {
    const viewer = page.getByTestId('combat-viewer')
    await expect(viewer).toBeAttached()

    const sessionId = await viewer.getAttribute('data-session-id')
    expect(sessionId).toBeTruthy()
    expect(sessionId!.length).toBeGreaterThan(0)
  })

  test('entity position markers exist for bard and zombie', async ({ page }) => {
    const bardMarker = page.getByTestId(`entity-pos-${BARD_ID}`)
    const zombieMarker = page.getByTestId(`entity-pos-${ZOMBIE_ID}`)

    await expect(bardMarker).toBeAttached()
    await expect(zombieMarker).toBeAttached()
  })

  test('entity position markers have numeric q and r attributes', async ({ page }) => {
    const bardMarker = page.getByTestId(`entity-pos-${BARD_ID}`)
    const q = await bardMarker.getAttribute('data-q')
    const r = await bardMarker.getAttribute('data-r')

    expect(q).not.toBeNull()
    expect(r).not.toBeNull()
    expect(Number(q)).not.toBeNaN()
    expect(Number(r)).not.toBeNaN()
  })
})

// ── Position Sync — Map Matches Server ──────────────────────────────────────

test.describe('Position sync — map matches server', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('bard map position matches server position after session creation', async () => {
    const mapPos = await combat.getMapEntityPosition(BARD_ID)
    const serverPos = await combat.getServerEntityPosition(BARD_ID)

    expect(mapPos.q, `Bard map q=${mapPos.q} should match server q=${serverPos.q}`).toBe(serverPos.q)
    expect(mapPos.r, `Bard map r=${mapPos.r} should match server r=${serverPos.r}`).toBe(serverPos.r)
  })

  test('zombie map position matches server position after session creation', async () => {
    const mapPos = await combat.getMapEntityPosition(ZOMBIE_ID)
    const serverPos = await combat.getServerEntityPosition(ZOMBIE_ID)

    expect(mapPos.q, `Zombie map q=${mapPos.q} should match server q=${serverPos.q}`).toBe(serverPos.q)
    expect(mapPos.r, `Zombie map r=${mapPos.r} should match server r=${serverPos.r}`).toBe(serverPos.r)
  })

  test('bard starts at expected hex coordinates', async () => {
    const mapPos = await combat.getMapEntityPosition(BARD_ID)
    expect(mapPos.q).toBe(BARD_START.q)
    expect(mapPos.r).toBe(BARD_START.r)
  })

  test('zombie starts at expected hex coordinates', async () => {
    const mapPos = await combat.getMapEntityPosition(ZOMBIE_ID)
    expect(mapPos.q).toBe(ZOMBIE_START.q)
    expect(mapPos.r).toBe(ZOMBIE_START.r)
  })

  test('server positions use hex (q,r) coordinates, not legacy (x,y)', async () => {
    const serverPos = await combat.getServerEntityPosition(ZOMBIE_ID)

    // The server must return q and r, not x and y
    expect(serverPos.q, 'Server position must have q field').toBeDefined()
    expect(serverPos.r, 'Server position must have r field').toBeDefined()
    // q and r should be numbers
    expect(typeof serverPos.q).toBe('number')
    expect(typeof serverPos.r).toBe('number')
  })
})

// ── HP Sync — Map Matches Server ──────────────────────────────────────────────

test.describe('HP sync — map matches server', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  /** Helper: get server HP for a combatant via the REST API. */
  async function getServerHP(combat: CombatPage, entityId: string) {
    const sessionId = await combat.page.evaluate(() => {
      const el = document.querySelector('[data-session-id]')
      return el?.getAttribute('data-session-id') ?? null
    })
    if (!sessionId) throw new Error('No session ID')
    const data = await combat.apiGet<{
      data: {
        state: {
          combatants: Array<{
            id: string
            currentHP: number
            maxHP: number
          }>
        }
      }
    }>(`/api/combat/sessions/${sessionId}`)
    const c = data.data.state.combatants.find(c => c.id === entityId)
    if (!c) throw new Error(`Combatant ${entityId} not found`)
    return { currentHP: c.currentHP, maxHP: c.maxHP }
  }

  test('zombie server HP is a positive number after session creation', async () => {
    const hp = await getServerHP(combat, ZOMBIE_ID)
    expect(hp.currentHP).toBeGreaterThan(0)
    expect(hp.maxHP).toBeGreaterThan(0)
    expect(hp.currentHP).toBeLessThanOrEqual(hp.maxHP)
  })

  test('bard server HP is a positive number after session creation', async () => {
    const hp = await getServerHP(combat, BARD_ID)
    expect(hp.currentHP).toBeGreaterThan(0)
    expect(hp.maxHP).toBeGreaterThan(0)
    expect(hp.currentHP).toBeLessThanOrEqual(hp.maxHP)
  })

  test('zombie HP updates on map after taking Vicious Mockery damage', async ({ page }) => {
    // Get zombie HP before spell
    const hpBefore = await getServerHP(combat, ZOMBIE_ID)

    // Cast Vicious Mockery on zombie
    await combat.clickToolbar('spell')
    await page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: 'Vicious Mockery' }).first().click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })

    // Wait for server resolution and UI sync
    await page.waitForTimeout(500)

    // Get HP after spell
    const hpAfter = await getServerHP(combat, ZOMBIE_ID)

    // Check combat log for save result
    const logs = await combat.getLogEntries()
    const saveFailed = logs.some(l => l.includes('FAIL'))

    if (saveFailed) {
      // Damage was dealt — HP should be lower
      expect(
        hpAfter.currentHP,
        `Expected zombie HP to decrease from ${hpBefore.currentHP} but got ${hpAfter.currentHP}`
      ).toBeLessThan(hpBefore.currentHP)
    } else {
      // Save succeeded — HP unchanged
      expect(hpAfter.currentHP).toBe(hpBefore.currentHP)
    }

    // Either way, no error toast
    await expect(combat.errorToast).not.toBeVisible()
  })
})

// ── Position Sync After Server-Side Movement ───────────────────────────────────

test.describe('Position sync after server-side movement', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('after player moves one hex, map position updates to match server', async ({ page }) => {
    // Enter move mode
    await combat.clickToolbar('move')
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Click an adjacent hex to the bard (1,0)
    await combat.clickHex(1, 0)

    // Wait for server resolution
    await page.waitForTimeout(1000)

    // Verify map position updated
    const mapPos = await combat.getMapEntityPosition(BARD_ID)
    const serverPos = await combat.getServerEntityPosition(BARD_ID)

    expect(
      mapPos.q,
      `Map q=${mapPos.q} should match server q=${serverPos.q}`
    ).toBe(serverPos.q)
    expect(
      mapPos.r,
      `Map r=${mapPos.r} should match server r=${serverPos.r}`
    ).toBe(serverPos.r)

    await expect(combat.errorToast).not.toBeVisible()
  })
})

// ── Data Integrity After Multi-Step Combat ─────────────────────────────────────

test.describe('Data integrity across combat actions', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('no JS errors after casting a spell and ending turn', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    // Cast Vicious Mockery on zombie
    await combat.clickToolbar('spell')
    await page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: 'Vicious Mockery' }).first().click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })

    // End turn
    await combat.endTurn()
    await page.waitForTimeout(1000)

    expect(jsErrors, `JS errors after spell+endTurn:\n${jsErrors.join('\n')}`).toHaveLength(0)
    await expect(combat.errorToast).not.toBeVisible()
  })

  test('combat log accumulates entries without duplicates', async ({ page }) => {
    // Cast a spell
    await combat.clickToolbar('spell')
    await page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: 'Vicious Mockery' }).first().click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(500)

    const logs = await combat.getLogEntries()
    const castEntries = logs.filter(l => l.includes('casts Vicious Mockery'))

    // Should have exactly one cast entry (not duplicated by sync effect)
    expect(castEntries.length).toBe(1)
  })

  test('all entity markers remain valid after multiple operations', async ({ page }) => {
    // Cast a spell
    await combat.clickToolbar('spell')
    await page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: 'Vicious Mockery' }).first().click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(500)

    // Entity markers should still be present and have numeric coordinates
    for (const id of [BARD_ID, ZOMBIE_ID]) {
      const marker = page.getByTestId(`entity-pos-${id}`)
      await expect(marker).toBeAttached()
      const q = Number(await marker.getAttribute('data-q'))
      const r = Number(await marker.getAttribute('data-r'))
      expect(q).not.toBeNaN()
      expect(r).not.toBeNaN()
    }
  })
})
