/**
 * GameState — Immutable combat state container for engine-v2.
 *
 * Holds all combatant data, round tracking, initiative order, and combat log.
 * All mutation methods return NEW GameState instances — the original is never modified.
 *
 * Design:
 *   - Combatants stored in a Map<id, object> for O(1) lookup
 *   - Structural sharing: unchanged combatants keep references
 *   - Deep-clone on public construction to prevent external mutation
 *   - All "with*" methods return new GameState instances
 *
 * Combatant shape matches the v1 creature objects produced by creatures.js / buildConverter.js.
 */

'use strict'

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// ── GameState ────────────────────────────────────────────────────────────────

class GameState {
  /**
   * @param {object}       init
   * @param {object[]|Map} init.combatants       - Array of creature objects or Map<id, creature>
   * @param {number}       [init.round=1]        - Current round number
   * @param {number}       [init.turnIndex=0]    - Index into initiativeOrder
   * @param {string[]}     [init.initiativeOrder] - Combatant IDs in turn order
   * @param {string[]}     [init.log]            - Combat log entries
   * @param {Map}          [init.corpses]        - Map<id, corpseData> for looted/lootable dead entities
   * @param {boolean}      [init._skipClone]     - Internal: skip deep-clone for structural sharing
   */
  constructor(init) {
    const {
      combatants,
      round = 1,
      turnIndex = 0,
      initiativeOrder = [],
      log = [],
      corpses = new Map(),
      _skipClone = false,
    } = init

    // Build the combatants Map
    if (combatants instanceof Map) {
      this._combatants = _skipClone
        ? new Map(combatants)
        : new Map(Array.from(combatants.entries()).map(([id, c]) => [id, deepClone(c)]))
    } else if (Array.isArray(combatants)) {
      this._combatants = new Map()
      for (const c of combatants) {
        if (!c.id) throw new Error('Every combatant must have an id')
        const clone = _skipClone ? c : deepClone(c)
        this._combatants.set(clone.id, clone)
      }
    } else {
      throw new Error('combatants must be an array or Map')
    }

    this._round = round
    this._turnIndex = turnIndex
    this._initiativeOrder = Object.freeze([...initiativeOrder])
    this._log = Object.freeze([...log])

    // Corpses Map<id, { position, name, loot, looted, templateKey }>
    if (corpses instanceof Map) {
      this._corpses = _skipClone
        ? new Map(corpses)
        : new Map(Array.from(corpses.entries()).map(([id, c]) => [id, deepClone(c)]))
    } else {
      this._corpses = new Map()
    }

    Object.freeze(this)
  }

  // ── Read Accessors ─────────────────────────────────────────────────────────

  /** Current round number (starts at 1). */
  get round() { return this._round }

  /** Index of the active combatant within initiativeOrder. */
  get turnIndex() { return this._turnIndex }

  /** Ordered array of combatant IDs (defensive copy). */
  get initiativeOrder() { return [...this._initiativeOrder] }

  /** Combat log entries (defensive copy). */
  get log() { return [...this._log] }

  /** Number of combatants in the encounter. */
  get combatantCount() { return this._combatants.size }

  /**
   * Get a combatant by ID. Returns null if not found.
   * NOTE: Returns a reference to the internal object. Callers must not mutate it.
   * (withUpdatedCombatant is the only safe way to change combatant state.)
   */
  getCombatant(id) {
    return this._combatants.get(id) || null
  }

  /** Get all combatants as an array. */
  getAllCombatants() {
    return Array.from(this._combatants.values())
  }

  /** Get the ID of the combatant whose turn it is. */
  getActiveCombatantId() {
    if (this._initiativeOrder.length === 0) return null
    return this._initiativeOrder[this._turnIndex] || null
  }

  /** Get the combatant whose turn it is. */
  getActiveCombatant() {
    const id = this.getActiveCombatantId()
    return id ? this.getCombatant(id) : null
  }

  /** Get combatants on a specific side. */
  getCombatantsBySide(side) {
    return this.getAllCombatants().filter(c => c.side === side)
  }

  /** Get all combatants with HP > 0. */
  getAliveCombatants() {
    return this.getAllCombatants().filter(c => c.currentHP > 0)
  }

  /** Get alive combatants on a specific side. */
  getAliveCombatantsBySide(side) {
    return this.getAllCombatants().filter(c => c.side === side && c.currentHP > 0)
  }

  /** Check if a combatant is alive. */
  isAlive(id) {
    const c = this.getCombatant(id)
    return c !== null && c.currentHP > 0
  }

  // ── Immutable Updates ──────────────────────────────────────────────────────

  /**
   * Return a new GameState with one combatant updated.
   * @param {string}          id      - Combatant ID
   * @param {object|function} changes - Plain object merged onto combatant,
   *                                    OR function(combatant) → changes object
   * @returns {GameState}
   */
  withUpdatedCombatant(id, changes) {
    const old = this._combatants.get(id)
    if (!old) throw new Error(`Unknown combatant: ${id}`)

    const patch = typeof changes === 'function' ? changes(old) : changes
    const updated = { ...old, ...patch }

    // Structural sharing: reuse all other combatant references
    const newMap = new Map(this._combatants)
    newMap.set(id, updated)

    return new GameState({
      combatants: newMap,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Return a new GameState with multiple combatants updated.
   * @param {Array<{ id: string, changes: object|function }>} updates
   * @returns {GameState}
   */
  withUpdatedCombatants(updates) {
    const newMap = new Map(this._combatants)
    for (const { id, changes } of updates) {
      const old = newMap.get(id)
      if (!old) throw new Error(`Unknown combatant: ${id}`)
      const patch = typeof changes === 'function' ? changes(old) : changes
      newMap.set(id, { ...old, ...patch })
    }

    return new GameState({
      combatants: newMap,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Advance to the next turn. Wraps around and increments round.
   * @returns {GameState}
   */
  withNextTurn() {
    let nextIndex = this._turnIndex + 1
    let nextRound = this._round
    if (nextIndex >= this._initiativeOrder.length) {
      nextIndex = 0
      nextRound++
    }

    return new GameState({
      combatants: this._combatants,
      round: nextRound,
      turnIndex: nextIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Append a single log entry.
   * @param {string} entry
   * @returns {GameState}
   */
  withLog(entry) {
    return new GameState({
      combatants: this._combatants,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: [...this._log, entry],
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Append multiple log entries.
   * @param {string[]} entries
   * @returns {GameState}
   */
  withLogEntries(entries) {
    return new GameState({
      combatants: this._combatants,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: [...this._log, ...entries],
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Set the initiative order (resets turnIndex to 0).
   * @param {string[]} order - Combatant IDs in turn order
   * @returns {GameState}
   */
  withInitiativeOrder(order) {
    // Validate all IDs exist
    for (const id of order) {
      if (!this._combatants.has(id)) {
        throw new Error(`Initiative order contains unknown combatant: ${id}`)
      }
    }

    return new GameState({
      combatants: this._combatants,
      round: this._round,
      turnIndex: 0,
      initiativeOrder: order,
      log: this._log,
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  /**
   * Set the round number explicitly.
   * @param {number} round
   * @returns {GameState}
   */
  withRound(round) {
    return new GameState({
      combatants: this._combatants,
      round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: this._corpses,
      _skipClone: true,
    })
  }

  // ── Corpse Accessors ───────────────────────────────────────────────────

  /** Get all corpses as an array. */
  getAllCorpses() {
    return Array.from(this._corpses.values())
  }

  /** Get a corpse by ID. Returns null if not found. */
  getCorpse(id) {
    return this._corpses.get(id) || null
  }

  /** Get corpses that have not been looted yet. */
  getUnlootedCorpses() {
    return this.getAllCorpses().filter(c => !c.looted)
  }

  // ── Corpse Mutations ──────────────────────────────────────────────────

  /**
   * Add a corpse to the state.
   * @param {object} corpseData - { id, position, name, loot, templateKey, looted }
   * @returns {GameState}
   */
  withCorpse(corpseData) {
    const newCorpses = new Map(this._corpses)
    newCorpses.set(corpseData.id, { ...corpseData, looted: false })

    return new GameState({
      combatants: this._combatants,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: newCorpses,
      _skipClone: true,
    })
  }

  /**
   * Mark a corpse as looted (loot already transferred to player).
   * @param {string} corpseId
   * @returns {GameState}
   */
  withCorpseLooted(corpseId) {
    const corpse = this._corpses.get(corpseId)
    if (!corpse) return this

    const newCorpses = new Map(this._corpses)
    newCorpses.set(corpseId, {
      ...corpse,
      looted: true,
      loot: { items: [], currency: {} },
    })

    return new GameState({
      combatants: this._combatants,
      round: this._round,
      turnIndex: this._turnIndex,
      initiativeOrder: this._initiativeOrder,
      log: this._log,
      corpses: newCorpses,
      _skipClone: true,
    })
  }
}

module.exports = { GameState }
