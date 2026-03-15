/**
 * combat-spells.spec.ts
 *
 * Requirements verified:
 * - Spell flyout lists all available spells for the bard (cantrips + leveled)
 * - Single-target spells (Vicious Mockery, Dissonant Whispers) enter target selection mode
 * - Mode banner for target mode contains the spell name and "Select a target"
 * - AoE spells (Shatter, Faerie Fire) enter AoE placement mode
 * - Mode banner for AoE mode contains the spell name and "Place AoE"
 * - Escape cancels target mode
 * - Escape cancels AoE placement mode
 * - Casting a cantrip (Vicious Mockery) on the zombie resolves — combat log shows cast + save
 * - Casting a save-based leveled spell (Dissonant Whispers) — log shows cast + save result
 * - Casting an AoE spell (Shatter) by placing center — log shows cast + save result
 * - Self-targeting spells (Greater Invisibility) resolve — log shows cast
 * - Bonus flyout shows Healing Word (bonus action spell)
 * - Casting Healing Word resolves — log shows cast
 * - No error toast after any successfully cast spell
 * - Sequential casts (action + bonus) both appear in the combat log
 * - Every spell resolution is validated via visible combat log entries, not just mode banner removal
 *
 * Default session: Gem Dragonborn Lore Bard 8 (player, q=0,r=0) vs Zombie (enemy, q=3,r=-1)
 * Bard cantrips:    Vicious Mockery, Minor Illusion
 * Bard action spells: Dissonant Whispers, Faerie Fire, Shatter, Hold Person,
 *                     Hypnotic Pattern, Greater Invisibility, Dimension Door
 * Bard bonus spells:  Healing Word
 *
 * NOTE: Each leveled spell appears once per available upcast slot level in the flyout
 * (e.g. Dissonant Whispers appears as "1st level", "2nd level", "3rd level", "4th level").
 * All spell locators use flyout testid + hasText + .first() to safely pick
 * the lowest-level entry and avoid Playwright strict-mode violations.
 */

import { test, expect, type Page } from '@playwright/test'
import { CombatPage } from './helpers/combat-page'

/** Scoped locator for the first spell flyout item whose label contains `name`. */
function spellItem(page: Page, name: string) {
  return page.locator('[data-testid^="flyout-spell-"]').filter({ hasText: name }).first()
}

/** Scoped locator for the first bonus flyout item whose label contains `name`. */
function bonusItem(page: Page, name: string) {
  return page.locator('[data-testid^="flyout-bonus-"]').filter({ hasText: name }).first()
}

// ── Spell Flyout Content ──────────────────────────────────────────────────────

test.describe('Spell flyout content', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('spell flyout lists at least 3 spell entries', async ({ page }) => {
    await combat.clickToolbar('spell')

    const allSpells = page.locator('[data-testid^="flyout-spell-"]')
    await expect(allSpells.first()).toBeVisible({ timeout: 3_000 })
    const count = await allSpells.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('spell flyout lists Vicious Mockery (cantrip)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Vicious Mockery')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Dissonant Whispers (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Dissonant Whispers')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Faerie Fire (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Faerie Fire')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Shatter (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Shatter')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Greater Invisibility (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Greater Invisibility')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Hypnotic Pattern (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Hypnotic Pattern')).toBeVisible({ timeout: 3_000 })
  })

  test('spell flyout lists Hold Person (leveled)', async ({ page }) => {
    await combat.clickToolbar('spell')
    await expect(spellItem(page, 'Hold Person')).toBeVisible({ timeout: 3_000 })
  })
})

// ── Single-Target Spells → Target Mode ────────────────────────────────────────

test.describe('Single-target spells — target mode', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('Vicious Mockery enters target selection mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Vicious Mockery')
    await expect(combat.modeBanner).toContainText('Esc to cancel')
  })

  test('Dissonant Whispers enters target selection mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Dissonant Whispers')
  })

  test('Hold Person enters target selection mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Hold Person').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Hold Person')
  })

  test('Escape cancels target mode after selecting Vicious Mockery', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('Escape cancels target mode after selecting Dissonant Whispers', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('Vicious Mockery resolves on zombie click — mode ends, log shows cast', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Zombie is at q=3, r=-1
    await combat.clickEntityHex(3, -1)
    await combat.throwDiceIfVisible()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: combat log shows the spell was cast and save was rolled
    await combat.assertLogContains('casts Vicious Mockery')
    await combat.assertLogContains('WIS save')
  })

  test('Dissonant Whispers resolves on zombie click — log shows cast + save', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickEntityHex(3, -1)
    await combat.throwDiceIfVisible()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: combat log shows cast and WIS save result
    await combat.assertLogContains('casts Dissonant Whispers')
    await combat.assertLogContains('WIS save')
  })
})

// ── AoE Spells → AoE Placement Mode ──────────────────────────────────────────

test.describe('AoE spells — placement mode', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('Faerie Fire enters AoE placement mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Faerie Fire').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Place AoE')
    await expect(combat.modeBanner).toContainText('Faerie Fire')
    await expect(combat.modeBanner).toContainText('Esc to cancel')
  })

  test('Shatter enters AoE placement mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Shatter').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Place AoE')
    await expect(combat.modeBanner).toContainText('Shatter')
  })

  test('Hypnotic Pattern enters AoE placement mode', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Hypnotic Pattern').click()

    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Place AoE')
    await expect(combat.modeBanner).toContainText('Hypnotic Pattern')
  })

  test('Escape cancels AoE placement mode after selecting Shatter', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Shatter').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('Escape cancels AoE placement mode after selecting Faerie Fire', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Faerie Fire').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })

  test('Shatter resolves when AoE center is placed — log shows cast + save', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Shatter').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Place AoE center near zombie
    await combat.clickHex(3, -1)
    await combat.throwDiceIfVisible()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: combat log shows cast and CON save result
    await combat.assertLogContains('casts Shatter')
    await combat.assertLogContains('CON save')
  })

  test('Faerie Fire resolves when AoE center is placed — log shows cast + save', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Faerie Fire').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.clickHex(3, -1)
    await combat.throwDiceIfVisible()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: combat log shows cast and DEX save result
    await combat.assertLogContains('casts Faerie Fire')
    await combat.assertLogContains('DEX save')
  })
})

// ── Self-Targeting Spells → Immediate Resolution ──────────────────────────────

test.describe('Self-targeting spells — immediate resolution', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('Greater Invisibility resolves without entering any mode — log shows cast', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Greater Invisibility').click()

    // Self-targeting: no target or AoE mode should appear
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 2_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    // Validate visible feedback: combat log shows the buff was applied
    await combat.assertLogContains('casts Greater Invisibility')
  })

  test('Dimension Door resolves without entering any mode — log shows cast', async ({ page }) => {
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dimension Door').click()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 2_000 })
    await expect(combat.errorToast).not.toBeVisible({ timeout: 3_000 })

    // Validate visible feedback: combat log shows teleportation
    await combat.assertLogContains('casts Dimension Door')
  })
})

// ── Bonus Action Spells ────────────────────────────────────────────────────────

test.describe('Bonus action spells', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('bonus flyout shows Healing Word', async ({ page }) => {
    await combat.clickToolbar('bonus')
    await expect(bonusItem(page, 'Healing Word')).toBeVisible({ timeout: 3_000 })
  })

  test('Healing Word enters target mode (targets self when no allies present)', async ({ page }) => {
    await combat.clickToolbar('bonus')
    await bonusItem(page, 'Healing Word').click()

    // Single-target heal with only self as valid target → enters target mode
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await expect(combat.modeBanner).toContainText('Select a target')
    await expect(combat.modeBanner).toContainText('Healing Word')
  })

  test('Healing Word resolves after selecting self — log shows cast + healing', async ({ page }) => {
    await combat.clickToolbar('bonus')
    await bonusItem(page, 'Healing Word').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    // Bard is at q=0, r=0
    await combat.clickEntityHex(0, 0)
    await combat.throwDiceIfVisible()

    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: combat log shows healing spell cast
    await combat.assertLogContains('casts Healing Word')
  })

  test('Escape cancels Healing Word target mode', async ({ page }) => {
    await combat.clickToolbar('bonus')
    await bonusItem(page, 'Healing Word').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })

    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
  })
})

// ── Sequential Spell Actions ───────────────────────────────────────────────────

test.describe('Sequential spell actions', () => {
  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.goto()
    await combat.waitForSession()
  })

  test('casting action spell then bonus spell — both appear in log', async ({ page }) => {
    // Step 1: Cast Vicious Mockery (action cantrip) on zombie
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(3, -1)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate Vicious Mockery appears in log
    await combat.assertLogContains('casts Vicious Mockery')

    // Step 2: Cast Healing Word (bonus action) on self
    await combat.clickToolbar('bonus')
    await bonusItem(page, 'Healing Word').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(0, 0)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate both spells are visible in the log
    await combat.assertLogContains('casts Healing Word')
  })

  test('cancelling a spell and re-selecting — log shows cast after resolution', async ({ page }) => {
    // Select then cancel
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()

    // Re-open and cast for real
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(3, -1)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await expect(combat.errorToast).not.toBeVisible()

    // Validate visible feedback: log shows cast after re-selection
    await combat.assertLogContains('casts Vicious Mockery')
  })

  test('switching between AoE and target spell modes without casting works cleanly', async ({ page }) => {
    // Enter AoE mode for Shatter
    await combat.clickToolbar('spell')
    await spellItem(page, 'Shatter').click()
    await expect(combat.modeBanner).toContainText('Place AoE', { timeout: 3_000 })

    // Cancel
    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()

    // Now enter target mode for Vicious Mockery
    await combat.clickToolbar('spell')
    await spellItem(page, 'Vicious Mockery').click()
    await expect(combat.modeBanner).toContainText('Select a target', { timeout: 3_000 })

    // Cancel again — no error
    await combat.cancelMode()
    await expect(combat.modeBanner).not.toBeVisible()
    await expect(combat.errorToast).not.toBeVisible()
  })
})

// ── Dissonant Whispers — Forced Reaction Movement ───────────────────────────

test.describe('Dissonant Whispers forced movement', () => {
  /**
   * Requirements verified:
   * - When DW hits (save fails, deterministic via ?testDiceQueue=1), zombie moves away
   * - Server position is farther from caster (hex distance increases)
   * - zombie.reactedThisRound === true
   * - zombie.movementRemaining === 0
   * - The UI map entity position syncs with the server position
   * - The combat log shows a "uses its reaction to move away" entry
   *
   * All tests are unconditional — testDiceQueue=1 forces d20=1 → WIS save 1+(-2)=-1 < DC 14 → FAIL.
   */

  const ZOMBIE_ID    = 'zombie-1'
  const ZOMBIE_START = { q: 3, r: -1 }

  const hexDist = (a: { q: number; r: number }, b: { q: number; r: number }) => {
    const dq = b.q - a.q, dr = b.r - a.r
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))
  }

  let combat: CombatPage

  test.beforeEach(async ({ page }) => {
    combat = new CombatPage(page)
    await combat.gotoWithTestConfig({ diceQueue: [1] })
    await combat.waitForSession()
  })

  test('server moves zombie away and sets reactedThisRound + movementRemaining', async ({ page }) => {
    // Cast Dissonant Whispers on the zombie
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(500)

    const zombie = await combat.getServerCombatant(ZOMBIE_ID)
    const pos = zombie['position'] as { q: number; r: number }

    // Hex distance must have increased
    const distBefore = hexDist({ q: 0, r: 0 }, ZOMBIE_START)
    const distAfter  = hexDist({ q: 0, r: 0 }, pos)
    expect(distAfter, `Zombie must be farther from caster: before=${distBefore}, after=${distAfter}`).toBeGreaterThan(distBefore)

    // Reaction consumed and movement exhausted
    expect(zombie['reactedThisRound'], 'reactedThisRound must be true').toBe(true)
    expect(zombie['movementRemaining'], 'movementRemaining must be 0').toBe(0)
  })

  test('UI map entity position syncs after DW forced movement', async ({ page }) => {
    // Cast Dissonant Whispers on the zombie
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(500)

    const serverPos = await combat.getServerEntityPosition(ZOMBIE_ID) as { q: number; r: number }
    const mapPos    = await combat.getMapEntityPosition(ZOMBIE_ID)

    // Map must match server
    expect(mapPos.q, `Map q=${mapPos.q} must match server q=${serverPos.q}`).toBe(serverPos.q)
    expect(mapPos.r, `Map r=${mapPos.r} must match server r=${serverPos.r}`).toBe(serverPos.r)

    // And zombie must have moved from its starting position
    expect(
      mapPos.q !== ZOMBIE_START.q || mapPos.r !== ZOMBIE_START.r,
      `Zombie map position must move from start (${ZOMBIE_START.q},${ZOMBIE_START.r}), got (${mapPos.q},${mapPos.r})`
    ).toBeTruthy()
  })

  test('forced movement log entry is visible in combat log panel', async ({ page }) => {
    // Cast Dissonant Whispers on the zombie
    await combat.clickToolbar('spell')
    await spellItem(page, 'Dissonant Whispers').click()
    await expect(combat.modeBanner).toBeVisible({ timeout: 3_000 })
    await combat.clickEntityHex(ZOMBIE_START.q, ZOMBIE_START.r)
    await combat.throwDiceIfVisible()
    await expect(combat.modeBanner).not.toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(1_000)

    await combat.assertLogContains('casts Dissonant Whispers')
    await combat.assertLogContains('WIS save')
    await combat.assertLogContains('uses its reaction to move away')
  })
})
