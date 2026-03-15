/**
 * GameState — unit tests
 *
 * Tests the immutable state container: construction, read accessors,
 * immutable update methods, edge cases, and error handling.
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const { GameState } = require('../GameState')
const { makeCombatant, makeBard, makeEnemy, makeBrute } = require('./helpers')

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

describe('GameState — construction', () => {
  it('constructs from an array of combatants', () => {
    const bard = makeBard()
    const enemy = makeEnemy()
    const state = new GameState({ combatants: [bard, enemy] })

    assert.equal(state.combatantCount, 2)
    assert.equal(state.round, 1)
    assert.equal(state.turnIndex, 0)
  })

  it('constructs from a Map of combatants', () => {
    const bard = makeBard()
    const enemy = makeEnemy()
    const map = new Map([['bard1', bard], ['enemy1', enemy]])
    const state = new GameState({ combatants: map })

    assert.equal(state.combatantCount, 2)
    assert.notEqual(state.getCombatant('bard1'), null)
  })

  it('deep-clones combatants on construction (no external mutation)', () => {
    const bard = makeBard()
    const state = new GameState({ combatants: [bard] })

    // Mutate original — should NOT affect state
    bard.currentHP = 0
    assert.equal(state.getCombatant('bard1').currentHP, 45)
  })

  it('defaults round=1, turnIndex=0, empty initiative + log', () => {
    const state = new GameState({ combatants: [makeCombatant()] })
    assert.equal(state.round, 1)
    assert.equal(state.turnIndex, 0)
    assert.deepEqual(state.initiativeOrder, [])
    assert.deepEqual(state.log, [])
  })

  it('accepts custom round, turnIndex, initiativeOrder, log', () => {
    const c = makeCombatant({ id: 'a' })
    const state = new GameState({
      combatants: [c],
      round: 3,
      turnIndex: 0,
      initiativeOrder: ['a'],
      log: ['Round 1 start'],
    })

    assert.equal(state.round, 3)
    assert.equal(state.turnIndex, 0)
    assert.deepEqual(state.initiativeOrder, ['a'])
    assert.deepEqual(state.log, ['Round 1 start'])
  })

  it('throws if combatant has no id', () => {
    assert.throws(() => {
      new GameState({ combatants: [{ name: 'No ID', currentHP: 10 }] })
    }, /must have an id/)
  })

  it('throws if combatants is neither array nor Map', () => {
    assert.throws(() => {
      new GameState({ combatants: 'invalid' })
    }, /must be an array or Map/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// READ ACCESSORS
// ─────────────────────────────────────────────────────────────────────────────

describe('GameState — read accessors', () => {
  let state

  before(() => {
    const bard = makeBard()
    const e1 = makeEnemy({ id: 'cf1', name: 'Cult Fanatic 1', position: { x: 4, y: 0 } })
    const e2 = makeEnemy({ id: 'cf2', name: 'Cult Fanatic 2', currentHP: 0, position: { x: 6, y: 0 } })

    state = new GameState({
      combatants: [bard, e1, e2],
      initiativeOrder: ['cf1', 'bard1', 'cf2'],
      round: 2,
      turnIndex: 1,
    })
  })

  it('getCombatant returns correct combatant', () => {
    const bard = state.getCombatant('bard1')
    assert.equal(bard.name, 'Lore Bard')
    assert.equal(bard.id, 'bard1')
  })

  it('getCombatant returns null for unknown ID', () => {
    assert.equal(state.getCombatant('nonexistent'), null)
  })

  it('getAllCombatants returns all combatants', () => {
    const all = state.getAllCombatants()
    assert.equal(all.length, 3)
  })

  it('getActiveCombatantId uses turnIndex into initiativeOrder', () => {
    assert.equal(state.getActiveCombatantId(), 'bard1') // turnIndex=1 → 'bard1'
  })

  it('getActiveCombatant returns the creature object', () => {
    const active = state.getActiveCombatant()
    assert.equal(active.name, 'Lore Bard')
  })

  it('getActiveCombatantId returns null when no initiative order', () => {
    const empty = new GameState({ combatants: [makeCombatant()] })
    assert.equal(empty.getActiveCombatantId(), null)
  })

  it('getCombatantsBySide filters correctly', () => {
    assert.equal(state.getCombatantsBySide('party').length, 1)
    assert.equal(state.getCombatantsBySide('enemy').length, 2)
  })

  it('getAliveCombatants excludes dead', () => {
    const alive = state.getAliveCombatants()
    assert.equal(alive.length, 2) // cf2 is dead
  })

  it('getAliveCombatantsBySide combines both filters', () => {
    assert.equal(state.getAliveCombatantsBySide('enemy').length, 1)
    assert.equal(state.getAliveCombatantsBySide('party').length, 1)
  })

  it('isAlive returns true for living combatant', () => {
    assert.equal(state.isAlive('bard1'), true)
  })

  it('isAlive returns false for dead combatant', () => {
    assert.equal(state.isAlive('cf2'), false)
  })

  it('isAlive returns false for unknown ID', () => {
    assert.equal(state.isAlive('ghost'), false)
  })

  it('initiativeOrder returns defensive copy', () => {
    const order1 = state.initiativeOrder
    const order2 = state.initiativeOrder
    assert.notEqual(order1, order2) // Different array references
    assert.deepEqual(order1, order2)
  })

  it('log returns defensive copy', () => {
    const log1 = state.log
    const log2 = state.log
    assert.notEqual(log1, log2)
    assert.deepEqual(log1, log2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMMUTABLE UPDATES
// ─────────────────────────────────────────────────────────────────────────────

describe('GameState — withUpdatedCombatant', () => {
  it('returns new state with updated combatant', () => {
    const state = new GameState({ combatants: [makeBard()] })
    const next = state.withUpdatedCombatant('bard1', { currentHP: 20 })

    assert.equal(next.getCombatant('bard1').currentHP, 20)
    assert.equal(state.getCombatant('bard1').currentHP, 45) // original unchanged
  })

  it('accepts a function for changes', () => {
    const state = new GameState({ combatants: [makeBard()] })
    const next = state.withUpdatedCombatant('bard1', c => ({
      currentHP: c.currentHP - 10,
    }))

    assert.equal(next.getCombatant('bard1').currentHP, 35)
  })

  it('preserves other combatants', () => {
    const state = new GameState({ combatants: [makeBard(), makeEnemy()] })
    const next = state.withUpdatedCombatant('bard1', { currentHP: 10 })

    assert.equal(next.getCombatant('enemy1').currentHP, 33) // unchanged
  })

  it('preserves round, turnIndex, initiative, log', () => {
    const state = new GameState({
      combatants: [makeBard()],
      round: 5,
      turnIndex: 0,
      initiativeOrder: ['bard1'],
      log: ['entry1'],
    })
    const next = state.withUpdatedCombatant('bard1', { usedAction: true })

    assert.equal(next.round, 5)
    assert.equal(next.turnIndex, 0)
    assert.deepEqual(next.initiativeOrder, ['bard1'])
    assert.deepEqual(next.log, ['entry1'])
  })

  it('throws for unknown combatant ID', () => {
    const state = new GameState({ combatants: [makeBard()] })
    assert.throws(() => {
      state.withUpdatedCombatant('nobody', { currentHP: 0 })
    }, /Unknown combatant/)
  })
})

describe('GameState — withUpdatedCombatants (batch)', () => {
  it('updates multiple combatants at once', () => {
    const state = new GameState({ combatants: [makeBard(), makeEnemy()] })
    const next = state.withUpdatedCombatants([
      { id: 'bard1', changes: { currentHP: 20 } },
      { id: 'enemy1', changes: { currentHP: 10 } },
    ])

    assert.equal(next.getCombatant('bard1').currentHP, 20)
    assert.equal(next.getCombatant('enemy1').currentHP, 10)
    // Originals unchanged
    assert.equal(state.getCombatant('bard1').currentHP, 45)
    assert.equal(state.getCombatant('enemy1').currentHP, 33)
  })

  it('supports function-based changes in batch', () => {
    const state = new GameState({ combatants: [makeBard(), makeEnemy()] })
    const next = state.withUpdatedCombatants([
      { id: 'bard1', changes: c => ({ currentHP: c.currentHP - 5 }) },
      { id: 'enemy1', changes: c => ({ currentHP: c.currentHP - 10 }) },
    ])

    assert.equal(next.getCombatant('bard1').currentHP, 40)
    assert.equal(next.getCombatant('enemy1').currentHP, 23)
  })
})

describe('GameState — withNextTurn', () => {
  it('advances turnIndex by 1', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
      initiativeOrder: ['enemy1', 'bard1'],
      turnIndex: 0,
      round: 1,
    })
    const next = state.withNextTurn()

    assert.equal(next.turnIndex, 1)
    assert.equal(next.round, 1)
  })

  it('wraps around to 0 and increments round', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
      initiativeOrder: ['enemy1', 'bard1'],
      turnIndex: 1,
      round: 1,
    })
    const next = state.withNextTurn()

    assert.equal(next.turnIndex, 0)
    assert.equal(next.round, 2)
  })

  it('original state is unchanged', () => {
    const state = new GameState({
      combatants: [makeBard()],
      initiativeOrder: ['bard1'],
      turnIndex: 0,
      round: 1,
    })
    const next = state.withNextTurn()

    assert.equal(state.turnIndex, 0)
    assert.equal(state.round, 1)
    assert.equal(next.turnIndex, 0)
    assert.equal(next.round, 2)
  })
})

describe('GameState — withLog / withLogEntries', () => {
  it('withLog appends a single entry', () => {
    const state = new GameState({ combatants: [makeCombatant()] })
    const next = state.withLog('Round 1 begins')

    assert.deepEqual(next.log, ['Round 1 begins'])
    assert.deepEqual(state.log, []) // original unchanged
  })

  it('withLogEntries appends multiple entries', () => {
    const state = new GameState({ combatants: [makeCombatant()], log: ['a'] })
    const next = state.withLogEntries(['b', 'c'])

    assert.deepEqual(next.log, ['a', 'b', 'c'])
    assert.deepEqual(state.log, ['a'])
  })
})

describe('GameState — withInitiativeOrder', () => {
  it('sets initiative order and resets turnIndex to 0', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
      turnIndex: 1,
    })
    const next = state.withInitiativeOrder(['enemy1', 'bard1'])

    assert.deepEqual(next.initiativeOrder, ['enemy1', 'bard1'])
    assert.equal(next.turnIndex, 0)
  })

  it('throws if order contains unknown combatant ID', () => {
    const state = new GameState({ combatants: [makeBard()] })
    assert.throws(() => {
      state.withInitiativeOrder(['bard1', 'ghost'])
    }, /unknown combatant/)
  })
})

describe('GameState — withRound', () => {
  it('sets round number explicitly', () => {
    const state = new GameState({ combatants: [makeCombatant()] })
    const next = state.withRound(5)

    assert.equal(next.round, 5)
    assert.equal(state.round, 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMMUTABILITY GUARANTEES
// ─────────────────────────────────────────────────────────────────────────────

describe('GameState — immutability', () => {
  it('Object.freeze prevents adding properties to state', () => {
    const state = new GameState({ combatants: [makeCombatant()] })
    assert.throws(() => {
      state.newProp = 'oops'
    })
  })

  it('chained updates produce independent snapshots', () => {
    const s0 = new GameState({ combatants: [makeBard()], initiativeOrder: ['bard1'] })
    const s1 = s0.withUpdatedCombatant('bard1', { currentHP: 40 })
    const s2 = s1.withUpdatedCombatant('bard1', { currentHP: 30 })
    const s3 = s0.withUpdatedCombatant('bard1', { currentHP: 20 }) // branch from s0

    assert.equal(s0.getCombatant('bard1').currentHP, 45)
    assert.equal(s1.getCombatant('bard1').currentHP, 40)
    assert.equal(s2.getCombatant('bard1').currentHP, 30)
    assert.equal(s3.getCombatant('bard1').currentHP, 20)
  })

  it('withUpdatedCombatant does not mutate other combatant references', () => {
    const state = new GameState({ combatants: [makeBard(), makeEnemy()] })
    const next = state.withUpdatedCombatant('bard1', { currentHP: 10 })

    // The enemy object reference should be the same (structural sharing)
    const origEnemy = state.getCombatant('enemy1')
    const nextEnemy = next.getCombatant('enemy1')
    // Both should have same data
    assert.equal(origEnemy.currentHP, nextEnemy.currentHP)
  })
})
