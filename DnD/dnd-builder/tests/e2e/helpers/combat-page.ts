/**
 * CombatPage — Page Object Model for the /combat-viewer route.
 *
 * Wraps Playwright locators and provides typed helpers for all
 * combat interactions (toolbar clicks, flyout items, hex clicks,
 * dice rolls, end-turn, etc.).
 *
 * Hex math mirrors CombatHexCanvas.jsx so tests can click hexes
 * by grid coordinates rather than raw pixel offsets.
 */

import { Page, Locator } from '@playwright/test'

const SQRT3 = Math.sqrt(3)
const HEX_SIZE = 28 // Must match CombatHexCanvas.jsx

// ── Hex math ─────────────────────────────────────────────────────────────────

/** Convert axial (q, r) to world-space (x, y) in the canvas coordinate system. */
function hexToWorld(q: number, r: number) {
  return {
    x: HEX_SIZE * (SQRT3 * q + SQRT3 / 2 * r),
    y: HEX_SIZE * 1.5 * r,
  }
}

/** Convert world-space to canvas screen-space given viewport and camera. */
function worldToScreen(
  wx: number, wy: number,
  vpW: number, vpH: number,
  camX = 0, camY = 0, camScale?: number,
) {
  const scale = camScale ?? (Math.min(vpW, vpH) / 2 / (6 * HEX_SIZE * SQRT3))
  return {
    cx: wx * scale + vpW / 2 + camX,
    cy: wy * scale + vpH / 2 + camY,
  }
}

// ── Page Object ───────────────────────────────────────────────────────────────

export class CombatPage {
  readonly page: Page

  // ── High-level element locators ────────────────────────────────────────────
  readonly canvas:       Locator
  readonly rollBar:      Locator
  readonly diceRollBar:  Locator
  readonly modeBanner:   Locator
  readonly victoryOverlay: Locator
  readonly errorToast:   Locator
  readonly combatLog:    Locator

  constructor(page: Page) {
    this.page         = page
    this.canvas       = page.locator('canvas')
    this.rollBar      = page.getByTestId('dice-roll-bar')
    this.diceRollBar  = page.getByTestId('dice-roll-bar')
    this.modeBanner   = page.getByTestId('mode-banner')
    this.victoryOverlay = page.getByTestId('victory-overlay')
    this.errorToast   = page.getByTestId('error-toast')
    this.combatLog    = page.getByTestId('combat-log')
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/combat-viewer')
  }

  /** Navigate with a test dice queue for deterministic outcomes.
   *  Each value in `diceQueue` is consumed in order as a d20 roll. */
  async gotoWithTestConfig(config: { diceQueue?: number[] }) {
    const params = new URLSearchParams()
    if (config.diceQueue?.length) params.set('testDiceQueue', config.diceQueue.join(','))
    await this.page.goto(`/combat-viewer?${params}`)
  }

  /** Get the full server-side combatant object for assertions on
   *  reactedThisRound, movementRemaining, position, etc. */
  async getServerCombatant(entityId: string): Promise<Record<string, unknown>> {
    const sessionId = await this.page.evaluate(() => {
      const el = document.querySelector('[data-session-id]')
      return el?.getAttribute('data-session-id') ?? null
    })
    if (!sessionId) throw new Error('No session ID found in page')
    const data = await this.apiGet<{
      data: { state: { combatants: Array<Record<string, unknown>> } }
    }>(`/api/combat/sessions/${sessionId}`)
    const combatant = data.data.state.combatants.find(c => c['id'] === entityId)
    if (!combatant) throw new Error(`Combatant ${entityId} not found in session state`)
    return combatant
  }

  /** Wait for the server session to be created and server menu to be fully loaded. */
  async waitForSession() {
    // Wait for HUD to signal that serverMenu data has arrived from the API
    await this.page.locator('[data-server-menu="ready"]').waitFor({ timeout: 10_000 })
    // Brief settle: lets isResolving clear and React finish rendering toolbar buttons
    await this.page.waitForTimeout(300)
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────

  toolbarBtn(key: string) {
    return this.page.getByTestId(`toolbar-btn-${key}`)
  }

  async clickToolbar(key: string) {
    await this.toolbarBtn(key).click()
  }

  flyoutItem(optionId: string) {
    return this.page.getByTestId(`flyout-${optionId}`)
  }

  async clickFlyout(optionId: string) {
    await this.flyoutItem(optionId).click()
  }

  // ── Dice bar ───────────────────────────────────────────────────────────────

  dieBtn(sides: number) {
    return this.page.getByTestId(`die-btn-${sides}`)
  }

  rollHistory() {
    return this.page.getByTestId('roll-history')
  }

  animArea() {
    return this.page.getByTestId('roll-status')
  }

  async rollDie(sides: number) {
    await this.dieBtn(sides).click()
  }

  /** Wait until the DiceArena closes (free roll or action roll physics have finished). */
  async waitForRollComplete(timeoutMs = 15_000) {
    await this.page.waitForFunction(() => {
      const arena = document.querySelector('[data-testid="dice-arena"]')
      // Roll is complete when DiceArena is no longer visible
      return !arena || arena.getBoundingClientRect().width === 0
    }, { timeout: timeoutMs })
  }

  /**
   * If DiceArena opens after an action, click the throw button, then click
   * the "Click to continue" confirm button once physics settle, and wait for
   * the arena to close.
   * Safe to call even if no dice roll is triggered — will no-op if arena doesn't appear.
   */
  async throwDiceIfVisible(timeoutMs = 15_000) {
    const arena = this.page.getByTestId('dice-arena')
    try {
      await arena.waitFor({ state: 'visible', timeout: 3_000 })
    } catch {
      // No DiceArena appeared — action resolved without dice
      return
    }
    // Step 1: click the throw (die face) button
    await arena.locator('button').first().click({ force: true })
    // Step 2: wait for the "Click to continue" confirm button to appear, then click it
    const confirm = this.page.getByTestId('dice-result-confirm')
    try {
      await confirm.waitFor({ state: 'visible', timeout: timeoutMs })
      await confirm.click({ force: true })
    } catch {
      // Some roll paths auto-resolve without a confirm step — best-effort
    }
    await arena.waitFor({ state: 'hidden', timeout: timeoutMs })
  }

  // ── Canvas hex clicks ─────────────────────────────────────────────────────

  /**
   * Click a hex by axial coordinates.
   * Computed using the default camera (camX=0, camY=0, default scale).
   */
  async clickHex(q: number, r: number) {
    const vp = this.page.viewportSize() ?? { width: 1280, height: 720 }
    const { x: wx, y: wy } = hexToWorld(q, r)
    const { cx, cy } = worldToScreen(wx, wy, vp.width, vp.height)
    await this.canvas.click({ position: { x: Math.round(cx), y: Math.round(cy) } })
  }

  /**
   * Click on the entity at hex (q, r) for targeting.
   * Same as clickHex but with a label for test readability.
   */
  async clickEntityHex(q: number, r: number) {
    return this.clickHex(q, r)
  }

  // ── Turn flow ──────────────────────────────────────────────────────────────

  async endTurn() {
    await this.clickToolbar('end')
    // Wait for session state to update (active combatant changes)
    await this.page.waitForTimeout(500)
  }

  async startMoveMode() {
    await this.clickToolbar('move')
    await this.modeBanner.waitFor({ state: 'visible', timeout: 3_000 })
  }

  async cancelMode() {
    await this.page.keyboard.press('Escape')
    await this.modeBanner.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => {})
  }

  // ── Combat log assertions ──────────────────────────────────────────────────

  /**
   * Assert that the combat log panel contains at least one entry matching `text`.
   * Waits up to `timeoutMs` for the text to appear (async log updates may take a moment).
   */
  async assertLogContains(text: string, timeoutMs = 5_000) {
    const entry = this.combatLog.locator('[data-testid="log-entry"]').filter({ hasText: text })
    await entry.first().waitFor({ state: 'visible', timeout: timeoutMs })
  }

  /**
   * Return all visible log entry texts as a string array.
   */
  async getLogEntries(): Promise<string[]> {
    const entries = this.combatLog.locator('[data-testid="log-entry"]')
    return entries.allTextContents()
  }

  /**
   * Get the MAP entity position (what the UI is actually rendering).
   * Reads from hidden data-attribute markers in CombatViewer.
   * Returns { q, r } hex coordinates.
   */
  async getMapEntityPosition(entityId: string): Promise<{ q: number; r: number }> {
    const marker = this.page.getByTestId(`entity-pos-${entityId}`)
    await marker.waitFor({ state: 'attached', timeout: 5_000 })
    const q = Number(await marker.getAttribute('data-q'))
    const r = Number(await marker.getAttribute('data-r'))
    return { q, r }
  }

  /**
   * Get the SERVER entity position (authoritative game state).
   * Queries the REST API for the session state and reads the combatant's position.
   */
  async getServerEntityPosition(entityId: string): Promise<{ q?: number; r?: number; x?: number; y?: number }> {
    const sessionId = await this.page.evaluate(() => {
      const el = document.querySelector('[data-session-id]')
      return el?.getAttribute('data-session-id') ?? null
    })
    if (!sessionId) throw new Error('No session ID found in page')
    const data = await this.apiGet<{ data: { state: { combatants: Array<{ id: string; position: Record<string, number> }> } } }>(
      `/api/combat/sessions/${sessionId}`
    )
    const combatant = data.data.state.combatants.find(c => c.id === entityId)
    if (!combatant) throw new Error(`Combatant ${entityId} not found in session state`)
    return combatant.position
  }

  /**
   * Return the active combatant ID from the server session state.
   * Useful for asserting whose turn it currently is.
   */
  async getSessionActiveId(): Promise<string | null> {
    const sessionId = await this.page.evaluate(() => {
      const el = document.querySelector('[data-session-id]')
      return el?.getAttribute('data-session-id') ?? null
    })
    if (!sessionId) throw new Error('No session ID found in page')
    const data = await this.apiGet<{
      data: { state: { initiativeOrder: string[]; turnIndex: number } }
    }>(`/api/combat/sessions/${sessionId}`)
    const { initiativeOrder, turnIndex } = data.data.state
    return initiativeOrder[turnIndex] ?? null
  }

  // ── REST API helpers (bypass UI, useful for test setup/assertions) ─────────

  async apiGet<T = unknown>(path: string): Promise<T> {
    const res = await this.page.request.get(`http://localhost:3001${path}`)
    return res.json() as T
  }

  async apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.page.request.post(`http://localhost:3001${path}`, { data: body })
    return res.json() as T
  }
}
