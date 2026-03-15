/**
 * TacticsAdapter — unit tests
 *
 * Tests the bridge between v1 AI tactics (free-form decisions) and
 * v2 menu-validated choices (optionId-based).
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const TacticsAdapter = require('../TacticsAdapter')
const { makeBard, makeEnemy, makeBrute, makeCombatant } = require('./helpers')

before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMeleeState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 1, y: 0 } }),
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

function makeRangedState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 6, y: 0 } }), // 30ft away
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// matchAction — weapon attacks
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — matchAction weapon attacks', () => {
  it('matches a melee attack to the correct menu option', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    const v1Action = { type: 'attack', target: enemy, weapon: { name: 'Rapier' } }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result, 'Should find a match')
    assert.ok(result.optionId, 'Should have optionId')

    // Verify the matched option is an attack on enemy1
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'attack')
    assert.equal(option.targetId, 'enemy1')
  })

  it('matches multiattack to the correct menu option', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ id: 'brute1', side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['brute1', 'enemy1'],
    })
    const menu = TurnMenu.getMenu(state, 'brute1')
    const enemy = state.getCombatant('enemy1')

    const v1Action = { type: 'multiattack', target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'multiattack')
    assert.equal(option.targetId, 'enemy1')
  })

  it('falls back when multiattack not available', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    // Bard doesn't have multiattack, but v1 asked for one
    const v1Action = { type: 'multiattack', target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    // Should fall back to regular attack
    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'attack')
    assert.equal(option.targetId, 'enemy1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchAction — standard actions
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — matchAction standard actions', () => {
  it('matches dodge', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchAction(menu.actions, { type: 'dodge' }, state)

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'dodge')
  })

  it('matches dash', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchAction(menu.actions, { type: 'dash' }, state)

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'dash')
  })

  it('matches disengage', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchAction(menu.actions, { type: 'disengage' }, state)

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'disengage')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchAction — spells
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — matchAction spells', () => {
  it('matches a single-target spell', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    const v1Action = { spell: 'Hold Person', level: 2, target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result)
    assert.equal(result.targetId, 'enemy1')

    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'spell')
    assert.equal(option.spellName, 'Hold Person')
  })

  it('matches an area spell with aoeCenter', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const v1Action = { spell: 'Hypnotic Pattern', level: 3, aoeCenter: { x: 6, y: 0 } }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result)
    assert.deepEqual(result.aoeCenter, { x: 6, y: 0 })

    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.spellName, 'Hypnotic Pattern')
  })

  it('matches Vicious Mockery cantrip', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    const v1Action = { spell: 'Vicious Mockery', target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result)
    assert.equal(result.targetId, 'enemy1')

    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.spellName, 'Vicious Mockery')
    assert.equal(option.slotLevel, 0) // cantrip
  })

  it('relaxes slot level if exact match not found', () => {
    // Request Dissonant Whispers at level 3 but no 3rd-level slot match
    // Should still find Dissonant Whispers offered at some available level
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    const v1Action = { spell: 'Dissonant Whispers', level: 5, target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    // Should find Dissonant Whispers at any available slot level
    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.spellName, 'Dissonant Whispers')
  })

  it('returns null for spell not in menu', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    // Thunderwave is not in the combat spell registry
    const v1Action = { spell: 'Thunderwave', level: 1, target: enemy }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.equal(result, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchBonusAction
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — matchBonusAction', () => {
  it('matches gem flight', () => {
    const state = makeRangedState()
      .withUpdatedCombatant('bard1', {
        gemFlight: { uses: 1, active: false, roundsRemaining: 0 },
        flying: false,
      })
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchBonusAction(
      menu.bonusActions, { type: 'gem_flight' }, state
    )

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'gemFlight')
  })

  it('matches Healing Word', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchBonusAction(
      menu.bonusActions, { type: 'cast_healing_word', spell: 'Healing Word' }, state
    )

    assert.ok(result)
    const option = TurnMenu.findOption(menu, result.optionId)
    assert.equal(option.type, 'spell')
    assert.equal(option.spellName, 'Healing Word')
  })

  it('Healing Word without target auto-selects from validTargets', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    // v1 AI returns Healing Word with NO target (implicit self-heal)
    const result = TacticsAdapter._matchBonusAction(
      menu.bonusActions, { type: 'cast_healing_word', spell: 'Healing Word' }, state
    )

    assert.ok(result)
    assert.ok(result.targetId, 'Single-target spell must have a targetId')
    // targetId should be a valid party member (bard is the only one)
    assert.equal(result.targetId, 'bard1')
  })

  it('single-target action spell without target auto-selects from validTargets', () => {
    const state = makeRangedState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    // v1 AI returns Hold Person with NO target
    const v1Action = { spell: 'Hold Person', level: 2 }
    const result = TacticsAdapter._matchAction(menu.actions, v1Action, state)

    assert.ok(result)
    assert.ok(result.targetId, 'Single-target spell must have a targetId')
    assert.equal(result.targetId, 'enemy1')
  })

  it('returns null when bonus action not available', () => {
    const state = makeMeleeState()
      .withUpdatedCombatant('bard1', { usedBonusAction: true })
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchBonusAction(
      menu.bonusActions, { type: 'gem_flight' }, state
    )

    assert.equal(result, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchMovement
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — matchMovement', () => {
  it('computes move toward target position', () => {
    const state = makeRangedState() // enemy at x:6, bard at x:0
    const menu = TurnMenu.getMenu(state, 'bard1')
    const enemy = state.getCombatant('enemy1')

    const v1Movement = { type: 'move_toward', target: enemy }
    const result = TacticsAdapter._matchMovement(
      menu.movements, v1Movement, 'bard1', state
    )

    assert.ok(result)
    assert.equal(result.optionId, 'move-to')
    assert.ok(result.position.x > 0, 'Should move toward enemy (positive x)')
    assert.ok(result.position.x <= 6, 'Should not overshoot')
  })

  it('returns null for zero-distance movement', () => {
    const state = makeMeleeState() // enemy at x:1
    const menu = TurnMenu.getMenu(state, 'bard1')

    // Target is already adjacent
    const enemy = state.getCombatant('enemy1')
    const v1Movement = { type: 'move_toward', target: { ...enemy, position: { x: 0, y: 0 } } }
    const result = TacticsAdapter._matchMovement(
      menu.movements, v1Movement, 'bard1', state
    )

    // Distance is 0 → no movement needed
    assert.equal(result, null)
  })

  it('returns null for null movement', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const result = TacticsAdapter._matchMovement(
      menu.movements, null, 'bard1', state
    )

    assert.equal(result, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// adaptDecision — full pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — adaptDecision', () => {
  it('adapts a complete v1 decision with action + bonus + movement', () => {
    const state = makeRangedState()
      .withUpdatedCombatant('bard1', {
        gemFlight: { uses: 1, active: false, roundsRemaining: 0 },
        flying: false,
      })
    const enemy = state.getCombatant('enemy1')

    const v1Decision = {
      action: { spell: 'Hypnotic Pattern', level: 3, aoeCenter: { x: 6, y: 0 } },
      bonusAction: { type: 'gem_flight' },
      reasoning: 'Opening combo',
    }

    const result = TacticsAdapter.adaptDecision(state, 'bard1', v1Decision)

    assert.ok(result, 'Should produce a result')
    assert.ok(result.action, 'Should have action')
    assert.ok(result.bonusAction, 'Should have bonus action')
  })

  it('adapts action-only decision', () => {
    const state = makeMeleeState()
    const enemy = state.getCombatant('enemy1')

    const v1Decision = {
      action: { type: 'attack', target: enemy, weapon: enemy.weapons?.[0] },
      reasoning: 'Melee attack',
    }

    const result = TacticsAdapter.adaptDecision(state, 'bard1', v1Decision)

    assert.ok(result)
    assert.ok(result.action)
    assert.equal(result.bonusAction, undefined)
    assert.equal(result.movement, undefined)
  })

  it('falls back to dodge when action not matchable', () => {
    const state = makeMeleeState()

    // v1 decision asks for breath weapon (not in bard's menu)
    const v1Decision = {
      action: { type: 'breath_weapon', targets: [] },
      reasoning: 'Breath weapon',
    }

    const result = TacticsAdapter.adaptDecision(state, 'bard1', v1Decision)

    assert.ok(result)
    const menu = TurnMenu.getMenu(state, 'bard1')
    const option = TurnMenu.findOption(menu, result.action.optionId)
    assert.equal(option.type, 'dodge', 'Should fall back to dodge')
  })

  it('returns null for null decision', () => {
    const state = makeMeleeState()
    const result = TacticsAdapter.adaptDecision(state, 'bard1', null)
    assert.equal(result, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// makeAdaptedAI
// ─────────────────────────────────────────────────────────────────────────────

describe('TacticsAdapter — makeAdaptedAI', () => {
  it('creates a getDecision function that returns v2 choices', () => {
    const state = makeRangedState()
      .withUpdatedCombatant('bard1', {
        gemFlight: { uses: 1, active: false, roundsRemaining: 0 },
        flying: false,
      })
      .withRound(1)

    const getDecision = TacticsAdapter.makeAdaptedAI({
      bard1: 'lore_bard',
      enemy1: 'cult_fanatic',
    })

    const choice = getDecision(state, 'bard1')

    // Should produce some valid v2 choice
    assert.ok(choice, 'Should produce a choice')
    // It should have at least an action
    assert.ok(choice.action || choice.bonusAction || choice.movement,
      'Should have at least one decision component')
  })

  it('works with function-based profile resolver', () => {
    const state = makeMeleeState().withRound(1)

    const getDecision = TacticsAdapter.makeAdaptedAI(
      (creature) => creature.side === 'party' ? 'lore_bard' : 'cult_fanatic'
    )

    const choice = getDecision(state, 'enemy1')

    // Cult fanatic should try to do something
    assert.ok(choice, 'Should produce a choice')
  })

  it('handles invalid profile gracefully', () => {
    const state = makeMeleeState().withRound(1)

    const getDecision = TacticsAdapter.makeAdaptedAI({
      bard1: 'nonexistent_profile',
    })

    // Should fall back to generic_melee without throwing
    const choice = getDecision(state, 'bard1')
    assert.ok(choice !== undefined) // null or an object, but not an exception
  })

  it('single-target spell with no resolvable target returns null (safety guard)', () => {
    // matchSpellOption should return null instead of a choice without targetId
    const options = [{
      optionId: 'action-1',
      type: 'spell',
      spellName: 'Hold Person',
      slotLevel: 2,
      targetType: 'single',
      validTargets: [], // empty — edge case (shouldn't normally happen)
    }]

    const v1Action = { spell: 'Hold Person', level: 2 } // no target
    const result = TacticsAdapter._matchSpellOption(options, 'Hold Person', v1Action, null)

    // Must return null rather than { optionId: 'action-1' } without targetId
    assert.strictEqual(result, null, 'Should return null when no target can be resolved')
  })
})
