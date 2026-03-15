/**
 * EncounterRunner v2 — unit tests
 *
 * Tests the immutable encounter loop: initiative, turn state reset,
 * start-of-turn processing, end-of-turn saves, victory conditions,
 * analytics, and the full runEncounter loop.
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const ER = require('../EncounterRunner')
const { makeBard, makeEnemy, makeBrute, makeCombatant } = require('./helpers')

before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBaseState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 1, y: 0 } }),
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

/** AI that always attacks with first available attack option */
function attackAI(state, actorId) {
  const menu = TurnMenu.getMenu(state, actorId)
  const attack = menu.actions.find(o => o.type === 'attack' || o.type === 'multiattack')
  if (attack) {
    return { action: { optionId: attack.optionId } }
  }
  return { action: { optionId: 'end-turn' } }
}

/** AI that does nothing */
function passiveAI() {
  return null
}

/** AI that always ends turn */
function skipAI() {
  return { action: { optionId: 'end-turn' } }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIATIVE
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — rollInitiative', () => {
  it('sets initiative order on game state', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
    })

    const result = ER.rollInitiative(state)

    assert.ok(result.initiativeOrder.length === 2)
    assert.ok(result.initiativeOrder.includes('bard1'))
    assert.ok(result.initiativeOrder.includes('enemy1'))
  })

  it('adds log entries for initiative rolls', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
    })

    const result = ER.rollInitiative(state)

    assert.ok(result.log.some(l => l.includes('INITIATIVE')))
    assert.ok(result.log.some(l => l.includes('Lore Bard')))
  })

  it('original state is unchanged', () => {
    const state = new GameState({
      combatants: [makeBard(), makeEnemy()],
    })

    ER.rollInitiative(state)

    assert.deepEqual(state.initiativeOrder, [])
    assert.equal(state.log.length, 0)
  })

  it('sorts by total (higher first)', () => {
    // Give enemy higher DEX so they go first
    const state = new GameState({
      combatants: [
        makeBard({ dexMod: 0 }),
        makeEnemy({ dexMod: 5 }),
      ],
    })

    const result = ER.rollInitiative(state)
    assert.equal(result.initiativeOrder[0], 'enemy1')
    assert.equal(result.initiativeOrder[1], 'bard1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TURN STATE RESET
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — resetTurnState', () => {
  it('resets action, bonus, movement, and per-turn flags', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        usedAction: true,
        usedBonusAction: true,
        movementRemaining: 0,
        reactedThisRound: true,
        bonusActionSpellCastThisTurn: true,
        disengaged: true,
      })

    const result = ER.resetTurnState(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.equal(bard.usedAction, false)
    assert.equal(bard.usedBonusAction, false)
    assert.equal(bard.movementRemaining, 30)
    assert.equal(bard.reactedThisRound, false)
    assert.equal(bard.bonusActionSpellCastThisTurn, false)
    assert.equal(bard.disengaged, false)
  })

  it('removes dodging but preserves vm_disadvantage (consumed on attack)', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        conditions: ['dodging', 'vm_disadvantage', 'prone'],
      })

    const result = ER.resetTurnState(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.ok(!bard.conditions.includes('dodging'), 'Dodging clears at start of turn')
    assert.ok(bard.conditions.includes('vm_disadvantage'),
      'vm_disadvantage persists until attack (consumed by resolveAttack)')
    assert.ok(bard.conditions.includes('prone'), 'Persistent conditions should remain')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// START-OF-TURN PROCESSING
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — processStartOfTurn', () => {
  it('paralyzed + flying → fall damage', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        flying: true,
        conditions: ['paralyzed'],
        gemFlight: { uses: 0, active: true, roundsRemaining: 5 },
      })

    const { state: result, skipped } = ER.processStartOfTurn(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.equal(bard.flying, false, 'Should no longer be flying')
    assert.ok(bard.conditions.includes('prone'), 'Should be prone')
    assert.ok(bard.currentHP < 45, 'Should have taken fall damage')
    assert.equal(bard.gemFlight.active, false)
    assert.ok(result.log.some(l => l.includes('falls')))
  })

  it('gem flight timer decrements', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        flying: true,
        gemFlight: { uses: 0, active: true, roundsRemaining: 3 },
      })

    const { state: result } = ER.processStartOfTurn(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.equal(bard.gemFlight.roundsRemaining, 2)
    assert.equal(bard.gemFlight.active, true)
  })

  it('gem flight expires when timer hits 0', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        flying: true,
        gemFlight: { uses: 0, active: true, roundsRemaining: 1 },
      })

    const { state: result } = ER.processStartOfTurn(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.equal(bard.gemFlight.active, false)
    assert.equal(bard.flying, false)
    assert.ok(result.log.some(l => l.includes('Gem Flight expires')))
  })

  it('concentration timer decrements', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Hold Person',
        concentrationRoundsRemaining: 5,
      })

    const { state: result } = ER.processStartOfTurn(state, 'bard1')
    const bard = result.getCombatant('bard1')

    assert.equal(bard.concentrationRoundsRemaining, 4)
    assert.equal(bard.concentrating, 'Hold Person')
  })

  it('concentration expires and breaks when timer hits 0', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Hold Person',
        concentrationRoundsRemaining: 1,
      })
      .withUpdatedCombatant('enemy1', {
        conditions: ['paralyzed'],
      })

    const { state: result } = ER.processStartOfTurn(state, 'bard1')
    const bard = result.getCombatant('bard1')
    const enemy = result.getCombatant('enemy1')

    assert.equal(bard.concentrating, null)
    assert.ok(!enemy.conditions.includes('paralyzed'), 'Paralysis should be removed')
    assert.ok(result.log.some(l => l.includes('expires')))
  })

  it('no-op for combatant with nothing active', () => {
    const state = makeBaseState()
    const { state: result, skipped } = ER.processStartOfTurn(state, 'bard1')

    assert.equal(skipped, false)
    assert.equal(result.getCombatant('bard1').currentHP, 45)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// END-OF-TURN SAVES
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — processEndOfTurnSaves', () => {
  it('paralyzed creature saves vs Hold Person', () => {
    // In average mode, d20=10.5. WIS save mod for enemy = +3 → total 13.5
    // Bard spellSaveDC = 15 → 13.5 < 15 = FAIL
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Hold Person',
        spellSaveDC: 15,
      })
      .withUpdatedCombatant('enemy1', {
        conditions: ['paralyzed'],
        saves: { str: 0, dex: 1, con: 1, int: 0, wis: 3, cha: 0 },
      })

    const result = ER.processEndOfTurnSaves(state, 'enemy1')
    const enemy = result.getCombatant('enemy1')

    // 10.5 + 3 = 13.5 < 15 → FAIL
    assert.ok(enemy.conditions.includes('paralyzed'), 'Should still be paralyzed (failed save)')
    assert.ok(result.log.some(l => l.includes('FAIL')))
  })

  it('paralyzed creature breaks free with high modifier', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Hold Person',
        spellSaveDC: 10,
      })
      .withUpdatedCombatant('enemy1', {
        conditions: ['paralyzed'],
        saves: { wis: 5 },
      })

    const result = ER.processEndOfTurnSaves(state, 'enemy1')
    const enemy = result.getCombatant('enemy1')

    // 10.5 + 5 = 15.5 >= 10 → SUCCESS
    assert.ok(!enemy.conditions.includes('paralyzed'), 'Should break free')
    assert.ok(result.log.some(l => l.includes('SUCCESS')))
  })

  it('frightened creature saves vs Dragon Fear', () => {
    const state = new GameState({
      combatants: [
        makeBard({
          dragonFear: { dc: 10, uses: 1 },
        }),
        makeEnemy({
          conditions: ['frightened'],
          saves: { wis: 5 },
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const result = ER.processEndOfTurnSaves(state, 'enemy1')
    const enemy = result.getCombatant('enemy1')

    // 10.5 + 5 = 15.5 >= 10 → SUCCESS
    assert.ok(!enemy.conditions.includes('frightened'), 'Should no longer be frightened')
    assert.ok(result.log.some(l => l.includes('no longer frightened')))
  })

  it('no-op when creature has no conditions requiring saves', () => {
    const state = makeBaseState()
    const result = ER.processEndOfTurnSaves(state, 'bard1')

    // Same state returned (no logs added)
    assert.equal(result.log.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VICTORY CHECK
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — checkVictory', () => {
  it('party wins when all enemies at 0 HP', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('enemy1', { currentHP: 0 })

    assert.deepEqual(ER.checkVictory(state), { over: true, winner: 'party' })
  })

  it('enemies win when all party at 0 HP', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', { currentHP: 0 })

    assert.deepEqual(ER.checkVictory(state), { over: true, winner: 'enemy' })
  })

  it('not over when both sides alive', () => {
    const state = makeBaseState()
    assert.deepEqual(ER.checkVictory(state), { over: false, winner: null })
  })

  it('party wins when all enemies incapacitated at round 15+', () => {
    const state = makeBaseState()
      .withRound(15)
      .withUpdatedCombatant('enemy1', {
        conditions: ['paralyzed'],
      })

    assert.deepEqual(ER.checkVictory(state), { over: true, winner: 'party' })
  })

  it('no early victory before round 15 with incapacitated enemies', () => {
    const state = makeBaseState()
      .withRound(14)
      .withUpdatedCombatant('enemy1', {
        conditions: ['paralyzed'],
      })

    assert.deepEqual(ER.checkVictory(state), { over: false, winner: null })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — buildAnalytics', () => {
  it('returns per-combatant stats', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        attacksMade: 5,
        attacksHit: 3,
        totalDamageDealt: 42,
        totalDamageTaken: 10,
        spellsCast: 2,
      })
      .withUpdatedCombatant('enemy1', {
        currentHP: 0,
        totalDamageTaken: 33,
      })

    const analytics = ER.buildAnalytics(state)

    assert.equal(analytics.length, 2)

    const bardStats = analytics.find(a => a.id === 'bard1')
    assert.equal(bardStats.survived, true)
    assert.equal(bardStats.attacksMade, 5)
    assert.equal(bardStats.attacksHit, 3)
    assert.equal(bardStats.hitRate, 60)
    assert.equal(bardStats.damageDealt, 42)
    assert.equal(bardStats.spellsCast, 2)

    const enemyStats = analytics.find(a => a.id === 'enemy1')
    assert.equal(enemyStats.survived, false)
    assert.equal(enemyStats.finalHP, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FULL ENCOUNTER LOOP
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — runEncounter', () => {
  it('runs a basic encounter to completion', () => {
    const state = new GameState({
      combatants: [
        makeBard({ position: { x: 0, y: 0 } }),
        makeEnemy({ currentHP: 5, maxHP: 33, position: { x: 1, y: 0 } }),
      ],
    })

    const result = ER.runEncounter({ state, getDecision: attackAI, maxRounds: 5 })

    assert.equal(result.winner, 'party')
    assert.ok(result.rounds >= 1)
    assert.ok(result.log.length > 0)
    assert.ok(result.analytics.length === 2)
    assert.ok(result.snapshots.length >= 2, 'Should have start + at least one round snapshot')
    assert.ok(result.finalState instanceof GameState)
  })

  it('reaches draw at maxRounds', () => {
    // Both sides skip every turn → nobody dies → draw
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ position: { x: 10, y: 0 } }),
      ],
    })

    const result = ER.runEncounter({ state, getDecision: passiveAI, maxRounds: 3 })

    assert.equal(result.winner, 'draw')
    assert.equal(result.rounds, 3)
  })

  it('handles AI errors gracefully', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ position: { x: 10, y: 0 } }),
      ],
    })

    function errorAI() {
      throw new Error('AI crashed!')
    }

    const result = ER.runEncounter({ state, getDecision: errorAI, maxRounds: 2 })

    assert.equal(result.winner, 'draw')
    assert.ok(result.log.some(l => l.includes('ERROR')))
  })

  it('produces correct number of snapshots', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ position: { x: 10, y: 0 } }),
      ],
    })

    const result = ER.runEncounter({ state, getDecision: passiveAI, maxRounds: 3 })

    // 1 start + 3 end-of-round = 4
    assert.equal(result.snapshots.length, 4)
    assert.equal(result.snapshots[0].phase, 'start')
    assert.equal(result.snapshots[1].phase, 'end')
  })

  it('incapacitated creatures skip their turn but get saves', () => {
    // Enemy is paralyzed by Hold Person, bard concentrating
    // Enemy should skip action but get end-of-turn WIS save
    const state = new GameState({
      combatants: [
        makeBard({
          concentrating: 'Hold Person',
          concentrationRoundsRemaining: 10,
          spellSaveDC: 15,
        }),
        makeEnemy({
          position: { x: 1, y: 0 },
          conditions: ['paralyzed'],
          saves: { str: 0, dex: 1, con: 1, int: 0, wis: 3, cha: 0 },
        }),
      ],
    })

    const result = ER.runEncounter({ state, getDecision: skipAI, maxRounds: 1 })

    assert.ok(result.log.some(l => l.includes('incapacitated')))
    assert.ok(result.log.some(l => l.includes('Hold Person')))
  })

  it('preserves immutability of initial state', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ currentHP: 1, maxHP: 33, position: { x: 1, y: 0 } }),
      ],
    })

    ER.runEncounter({ state, getDecision: attackAI, maxRounds: 5 })

    // Original state must be untouched
    assert.equal(state.getCombatant('bard1').currentHP, 45)
    assert.equal(state.getCombatant('enemy1').currentHP, 1)
    assert.equal(state.round, 1)  // Original state round unchanged (default=1)
    assert.equal(state.log.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMMUTABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe('EncounterRunner v2 — immutability', () => {
  it('resetTurnState does not mutate original', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', { usedAction: true })

    ER.resetTurnState(state, 'bard1')

    assert.equal(state.getCombatant('bard1').usedAction, true)
  })

  it('processStartOfTurn does not mutate original', () => {
    const state = makeBaseState()
      .withUpdatedCombatant('bard1', {
        concentrating: 'Hold Person',
        concentrationRoundsRemaining: 1,
      })

    ER.processStartOfTurn(state, 'bard1')

    assert.equal(state.getCombatant('bard1').concentrationRoundsRemaining, 1)
    assert.equal(state.getCombatant('bard1').concentrating, 'Hold Person')
  })
})
