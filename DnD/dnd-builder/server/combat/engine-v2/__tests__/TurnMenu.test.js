/**
 * TurnMenu — unit tests
 *
 * Tests the zero-trust option generation layer: categories, action options,
 * bonus action options, movement options, choice validation, and all D&D 5e
 * action economy rules.
 */

'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const dice = require('../../engine/dice')
const { GameState } = require('../GameState')
const TurnMenu = require('../TurnMenu')
const { makeBard, makeEnemy, makeBrute, makeCombatant } = require('./helpers')

// Use average dice mode for deterministic tests
before(() => dice.setDiceMode('average'))
after(() => dice.setDiceMode('random'))

// ── Test Setup Helpers ────────────────────────────────────────────────────────

/** Standard 1v1 scenario: bard at (0,0) vs enemy at (6,0) = 30ft away */
function makeStandardState() {
  return new GameState({
    combatants: [makeBard(), makeEnemy()],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

/** Bard adjacent to enemy (5ft) */
function makeMeleeState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 1, y: 0 } }),
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

/** Bard with enemy out of all weapon range (150ft) */
function makeFarState() {
  return new GameState({
    combatants: [
      makeBard(),
      makeEnemy({ position: { x: 30, y: 0 } }),
    ],
    initiativeOrder: ['bard1', 'enemy1'],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — internal helpers', () => {
  it('gridDistance calculates Chebyshev distance in feet', () => {
    assert.equal(TurnMenu._gridDistance({ x: 0, y: 0 }, { x: 6, y: 0 }), 30)
    assert.equal(TurnMenu._gridDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 20)
    assert.equal(TurnMenu._gridDistance({ x: 0, y: 0 }, { x: 1, y: 0 }), 5)
    assert.equal(TurnMenu._gridDistance({ x: 0, y: 0 }, { x: 0, y: 0 }), 0)
  })

  it('isIncapacitated detects paralyzed, stunned, unconscious', () => {
    assert.equal(TurnMenu._isIncapacitated({ conditions: ['paralyzed'] }), true)
    assert.equal(TurnMenu._isIncapacitated({ conditions: ['stunned'] }), true)
    assert.equal(TurnMenu._isIncapacitated({ conditions: ['unconscious'] }), true)
    assert.equal(TurnMenu._isIncapacitated({ conditions: ['charmed_hp'] }), true)
    assert.equal(TurnMenu._isIncapacitated({ conditions: [] }), false)
    assert.equal(TurnMenu._isIncapacitated({ conditions: ['frightened'] }), false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — getCategories', () => {
  it('fresh turn: all categories available', () => {
    const state = makeStandardState()
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.length, 4)
    assert.equal(cats.find(c => c.id === 'action').available, true)
    assert.equal(cats.find(c => c.id === 'bonusAction').available, true)
    assert.equal(cats.find(c => c.id === 'movement').available, true)
    assert.equal(cats.find(c => c.id === 'endTurn').available, true)
  })

  it('action used: action category unavailable', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { usedAction: true })
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.find(c => c.id === 'action').available, false)
    assert.equal(cats.find(c => c.id === 'bonusAction').available, true)
  })

  it('bonus action used: bonus category unavailable', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { usedBonusAction: true })
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.find(c => c.id === 'bonusAction').available, false)
  })

  it('no movement remaining: movement unavailable', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { movementRemaining: 0 })
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.find(c => c.id === 'movement').available, false)
  })

  it('incapacitated creature: only endTurn available', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { conditions: ['stunned'] })
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.find(c => c.id === 'action').available, false)
    assert.equal(cats.find(c => c.id === 'bonusAction').available, false)
    assert.equal(cats.find(c => c.id === 'movement').available, false)
    assert.equal(cats.find(c => c.id === 'endTurn').available, true)
  })

  it('dead creature: no categories at all', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { currentHP: 0 })
    const cats = TurnMenu.getCategories(state, 'bard1')

    assert.equal(cats.length, 0)
  })

  it('unknown combatant: empty categories', () => {
    const state = makeStandardState()
    const cats = TurnMenu.getCategories(state, 'nobody')

    assert.equal(cats.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTION OPTIONS — WEAPON ATTACKS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — action options: weapon attacks', () => {
  it('includes melee attack when enemy is adjacent', () => {
    const state = makeMeleeState()
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const meleeAtks = options.filter(o => o.type === 'attack' && o.weaponName === 'Rapier')

    assert.equal(meleeAtks.length, 1)
    assert.equal(meleeAtks[0].targetId, 'enemy1')
  })

  it('excludes melee attack when enemy is out of range', () => {
    const state = makeStandardState() // 30ft apart
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const meleeAtks = options.filter(o => o.type === 'attack' && o.weaponName === 'Rapier')

    assert.equal(meleeAtks.length, 0)
  })

  it('includes ranged attack when enemy is within range', () => {
    const state = makeStandardState() // 30ft, crossbow range 30
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const rangedAtks = options.filter(o => o.type === 'attack' && o.weaponName === 'Hand Crossbow')

    assert.equal(rangedAtks.length, 1)
    assert.equal(rangedAtks[0].targetId, 'enemy1')
  })

  it('excludes ranged attack when enemy is out of range', () => {
    const state = makeFarState() // 150ft, crossbow range 30
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const rangedAtks = options.filter(o => o.type === 'attack' && o.weaponName === 'Hand Crossbow')

    assert.equal(rangedAtks.length, 0)
  })

  it('lists attacks against multiple enemies', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ id: 'cf1', name: 'CF1', position: { x: 1, y: 0 } }),
        makeEnemy({ id: 'cf2', name: 'CF2', position: { x: 0, y: 1 } }),
      ],
      initiativeOrder: ['bard1', 'cf1', 'cf2'],
    })
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const rapierAtks = options.filter(o => o.type === 'attack' && o.weaponName === 'Rapier')

    // Both enemies within melee range (5ft each)
    assert.equal(rapierAtks.length, 2)
  })

  it('excludes dead enemies from attack options', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ id: 'cf1', currentHP: 0, position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'cf1'],
    })
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const attacks = options.filter(o => o.type === 'attack')

    assert.equal(attacks.length, 0)
  })

  it('includes multiattack option for creatures with multiattack', () => {
    const state = new GameState({
      combatants: [
        makeBrute({ side: 'party', position: { x: 0, y: 0 } }),
        makeEnemy({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['brute1', 'enemy1'],
    })
    const options = TurnMenu.getActionOptions(state, 'brute1')
    const multiAtks = options.filter(o => o.type === 'multiattack')

    assert.equal(multiAtks.length, 1)
    assert.equal(multiAtks[0].attackCount, 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTION OPTIONS — SPELLS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — action options: spells', () => {
  it('includes cantrips (Vicious Mockery) with valid targets', () => {
    const state = makeStandardState() // enemy at 30ft, VM range 60ft
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const vm = options.filter(o => o.type === 'spell' && o.spellName === 'Vicious Mockery')

    assert.equal(vm.length, 1)
    assert.equal(vm[0].slotLevel, 0)
    assert.ok(vm[0].validTargets.some(t => t.id === 'enemy1'))
  })

  it('includes action-time leveled spells with available slots', () => {
    const state = makeStandardState()
    const options = TurnMenu.getActionOptions(state, 'bard1')

    // Hypnotic Pattern (level 3, action, area)
    const hp = options.filter(o => o.spellName === 'Hypnotic Pattern')
    assert.ok(hp.length >= 1, 'Should have Hypnotic Pattern option')
    assert.equal(hp[0].slotLevel, 3)
  })

  it('offers upcast options at higher slot levels', () => {
    const state = makeStandardState()
    const options = TurnMenu.getActionOptions(state, 'bard1')

    // Hold Person is level 2 — should be offered at level 2, 3, and 4
    const holdPerson = options.filter(o => o.spellName === 'Hold Person')
    const levels = holdPerson.map(o => o.slotLevel).sort()

    assert.ok(levels.includes(2), 'Should have Hold Person at level 2')
    assert.ok(levels.includes(3), 'Should have Hold Person at level 3')
    assert.ok(levels.includes(4), 'Should have Hold Person at level 4')
  })

  it('excludes spells when no slots remain', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const leveledSpells = options.filter(o => o.type === 'spell' && o.slotLevel > 0)
    assert.equal(leveledSpells.length, 0)
  })

  it('cantrips still available when all slots depleted', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0 } })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const cantrips = options.filter(o => o.type === 'spell' && o.slotLevel === 0)
    assert.ok(cantrips.length > 0, 'Cantrips should still be available')
  })

  it('bonus-action spell restriction: only cantrips after BA spell', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { bonusActionSpellCastThisTurn: true })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const leveledSpells = options.filter(o => o.type === 'spell' && o.slotLevel > 0)
    assert.equal(leveledSpells.length, 0, 'No leveled spells after BA spell')

    const cantrips = options.filter(o => o.type === 'spell' && o.slotLevel === 0)
    assert.ok(cantrips.length > 0, 'Cantrips should still be available')
  })

  it('single-target spells list valid targets in range', () => {
    const state = makeStandardState() // enemy at 30ft
    const options = TurnMenu.getActionOptions(state, 'bard1')

    // Hold Person is single-target, 60ft range
    const hp = options.find(o => o.spellName === 'Hold Person' && o.slotLevel === 2)
    assert.ok(hp, 'Should have Hold Person')
    assert.equal(hp.targetType, 'single')
    assert.ok(hp.validTargets.some(t => t.id === 'enemy1'))
  })

  it('area spells include AoE metadata', () => {
    const state = makeStandardState()
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const hp = options.find(o => o.spellName === 'Hypnotic Pattern')
    assert.ok(hp, 'Should have Hypnotic Pattern')
    assert.equal(hp.targetType, 'area')
    assert.equal(hp.requiresPosition, true)
    assert.ok(hp.castRange > 0)
  })

  it('concentration warning when already concentrating', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { concentrating: 'Faerie Fire' })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const hp = options.find(o => o.spellName === 'Hypnotic Pattern')
    assert.ok(hp, 'Hypnotic Pattern should still appear')
    assert.equal(hp.concentrationWarning, true)
    assert.ok(hp.label.includes('[breaks concentration]'))
  })

  it('no concentration warning when not concentrating', () => {
    const state = makeStandardState()
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const hp = options.find(o => o.spellName === 'Hypnotic Pattern')
    assert.ok(hp)
    assert.equal(hp.concentrationWarning, false)
  })

  it('excludes spells not in spellsKnown', () => {
    // Create a bard with only Dissonant Whispers known (a spell IN the registry)
    const state = new GameState({
      combatants: [
        makeBard({ spellsKnown: ['Dissonant Whispers'], cantrips: [] }),
        makeEnemy(),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const options = TurnMenu.getActionOptions(state, 'bard1')
    const spells = options.filter(o => o.type === 'spell')
    const spellNames = [...new Set(spells.map(o => o.spellName))]

    assert.ok(spellNames.includes('Dissonant Whispers'))
    assert.ok(!spellNames.includes('Hold Person'))
    assert.ok(!spellNames.includes('Vicious Mockery'))
  })

  it('does not include bonus-action spells in action options', () => {
    const state = makeStandardState()
    const options = TurnMenu.getActionOptions(state, 'bard1')

    // Healing Word is a bonus-action spell — should NOT appear here
    const healingWord = options.filter(o => o.spellName === 'Healing Word')
    assert.equal(healingWord.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTION OPTIONS — STANDARD ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — action options: standard actions', () => {
  it('always includes Dodge, Dash, Disengage', () => {
    const state = makeFarState() // enemy far away
    const options = TurnMenu.getActionOptions(state, 'bard1')

    assert.ok(options.some(o => o.type === 'dodge'), 'Should have Dodge')
    assert.ok(options.some(o => o.type === 'dash'), 'Should have Dash')
    assert.ok(options.some(o => o.type === 'disengage'), 'Should have Disengage')
  })

  it('returns empty if action already used', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { usedAction: true })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })

  it('returns empty for dead combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { currentHP: 0 })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })

  it('returns empty for incapacitated combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { conditions: ['paralyzed'] })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BONUS ACTION OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — bonus action options', () => {
  it('includes bonus-action spells (Healing Word)', () => {
    const state = makeStandardState()
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')

    const hw = options.filter(o => o.spellName === 'Healing Word')
    assert.ok(hw.length >= 1, 'Should have Healing Word')
    assert.equal(hw[0].category, 'bonusAction')
    assert.equal(hw[0].setsCantripsOnlyRestriction, true)
  })

  it('Healing Word lists self and allies as valid targets', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeCombatant({ id: 'ally1', name: 'Ally', side: 'party', position: { x: 2, y: 0 } }),
        makeEnemy(),
      ],
      initiativeOrder: ['bard1', 'ally1', 'enemy1'],
    })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const hw = options.find(o => o.spellName === 'Healing Word')

    assert.ok(hw, 'Should have Healing Word')
    const targetIds = hw.validTargets.map(t => t.id)
    assert.ok(targetIds.includes('bard1'), 'Can target self')
    assert.ok(targetIds.includes('ally1'), 'Can target ally')
    assert.ok(!targetIds.includes('enemy1'), 'Cannot target enemy with heal')
  })

  it('includes Bardic Inspiration with remaining uses', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeCombatant({ id: 'ally1', name: 'Ally', side: 'party', position: { x: 2, y: 0 } }),
        makeEnemy(),
      ],
      initiativeOrder: ['bard1', 'ally1', 'enemy1'],
    })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const bi = options.filter(o => o.type === 'bardicInspiration')

    assert.equal(bi.length, 1) // one ally
    assert.equal(bi[0].targetId, 'ally1')
    assert.equal(bi[0].die, 'd8')
  })

  it('excludes Bardic Inspiration when no uses remain', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { bardicInspiration: { uses: 0, maxUses: 3, die: 'd8' } })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const bi = options.filter(o => o.type === 'bardicInspiration')

    assert.equal(bi.length, 0)
  })

  it('excludes Bardic Inspiration when no allies alive', () => {
    const state = makeStandardState() // bard vs 1 enemy, no allies
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const bi = options.filter(o => o.type === 'bardicInspiration')

    assert.equal(bi.length, 0)
  })

  it('includes Gem Flight when available', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { gemFlight: { uses: 1, active: false, roundsRemaining: 0 }, flying: false })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const gf = options.filter(o => o.type === 'gemFlight')

    assert.equal(gf.length, 1)
  })

  it('excludes Gem Flight when already flying', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { gemFlight: { uses: 1, active: true, roundsRemaining: 5 }, flying: true })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')
    const gf = options.filter(o => o.type === 'gemFlight')

    assert.equal(gf.length, 0)
  })

  it('returns empty when bonus action already used', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { usedBonusAction: true })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })

  it('returns empty for incapacitated combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { conditions: ['stunned'] })
    const options = TurnMenu.getBonusActionOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — movement options', () => {
  it('provides move and hold options when movement remains', () => {
    const state = makeStandardState()
    const options = TurnMenu.getMovementOptions(state, 'bard1')

    assert.equal(options.length, 2)
    assert.ok(options.some(o => o.type === 'move'))
    assert.ok(options.some(o => o.type === 'hold'))
  })

  it('move option shows max distance and current position', () => {
    const state = makeStandardState()
    const options = TurnMenu.getMovementOptions(state, 'bard1')
    const move = options.find(o => o.type === 'move')

    assert.equal(move.maxDistance, 30)
    assert.deepEqual(move.currentPosition, { x: 0, y: 0 })
    assert.equal(move.requiresPosition, true)
  })

  it('returns empty when no movement remaining', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { movementRemaining: 0 })
    const options = TurnMenu.getMovementOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })

  it('returns empty for dead combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { currentHP: 0 })
    const options = TurnMenu.getMovementOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })

  it('returns empty for incapacitated combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { conditions: ['unconscious'] })
    const options = TurnMenu.getMovementOptions(state, 'bard1')

    assert.equal(options.length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FULL MENU (getMenu)
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — getMenu', () => {
  it('returns all sections', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    assert.ok(Array.isArray(menu.categories))
    assert.ok(Array.isArray(menu.actions))
    assert.ok(Array.isArray(menu.bonusActions))
    assert.ok(Array.isArray(menu.movements))
    assert.ok(menu.endTurn)
    assert.equal(menu.endTurn.optionId, 'end-turn')
  })

  it('all option IDs are unique', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const allIds = [
      ...menu.actions.map(o => o.optionId),
      ...menu.bonusActions.map(o => o.optionId),
      ...menu.movements.map(o => o.optionId),
      menu.endTurn.optionId,
    ]

    const uniqueIds = new Set(allIds)
    assert.equal(uniqueIds.size, allIds.length, `Duplicate IDs found: ${allIds}`)
  })

  it('findOption locates action options by ID', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')

    const firstAction = menu.actions[0]
    const found = TurnMenu.findOption(menu, firstAction.optionId)
    assert.equal(found.optionId, firstAction.optionId)
  })

  it('findOption returns end-turn', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const found = TurnMenu.findOption(menu, 'end-turn')

    assert.equal(found.type, 'endTurn')
  })

  it('findOption returns null for unknown ID', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const found = TurnMenu.findOption(menu, 'nonexistent-99')

    assert.equal(found, null)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CHOICE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — validateChoice', () => {
  it('end-turn is always valid for alive combatants', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: 'end-turn' })

    assert.equal(result.valid, true)
  })

  it('end-turn invalid for dead combatant', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', { currentHP: 0 })
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: 'end-turn' })

    assert.equal(result.valid, false)
  })

  it('valid attack choice passes', () => {
    const state = makeMeleeState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const atkOption = menu.actions.find(o => o.type === 'attack' && o.weaponName === 'Rapier')

    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: atkOption.optionId })
    assert.equal(result.valid, true)
    assert.equal(result.option.type, 'attack')
  })

  it('unknown optionId fails', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: 'bogus-999' })

    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('not available'))
  })

  it('missing optionId fails', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', {})

    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('No optionId'))
  })

  it('null choice fails', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', null)

    assert.equal(result.valid, false)
  })

  it('single-target spell requires targetId', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.spellName === 'Hold Person' && o.targetType === 'single')

    // Missing targetId
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: holdPerson.optionId })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('targetId'))
  })

  it('single-target spell with valid targetId passes', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.spellName === 'Hold Person' && o.targetType === 'single')

    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'enemy1',
    })
    assert.equal(result.valid, true)
  })

  it('single-target spell with invalid targetId fails', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const holdPerson = menu.actions.find(o => o.spellName === 'Hold Person' && o.targetType === 'single')

    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: holdPerson.optionId,
      targetId: 'nonexistent',
    })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('Invalid target'))
  })

  it('area spell requires aoeCenter', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.spellName === 'Hypnotic Pattern')

    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: hp.optionId })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('aoeCenter'))
  })

  it('area spell with valid aoeCenter passes', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.spellName === 'Hypnotic Pattern')

    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 6, y: 0 },
    })
    assert.equal(result.valid, true)
  })

  it('area spell with out-of-range aoeCenter fails', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const hp = menu.actions.find(o => o.spellName === 'Hypnotic Pattern')

    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: hp.optionId,
      aoeCenter: { x: 100, y: 0 }, // 500ft away, range is 120ft
    })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('out of range'))
  })

  it('movement requires position', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: 'move-to' })

    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('position'))
  })

  it('movement with valid position passes', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: 'move-to',
      position: { x: 3, y: 0 }, // 15ft
    })

    assert.equal(result.valid, true)
  })

  it('movement exceeding remaining distance fails', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', {
      optionId: 'move-to',
      position: { x: 20, y: 0 }, // 100ft > 30ft remaining
    })

    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('exceeds'))
  })

  it('hold movement is valid', () => {
    const state = makeStandardState()
    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: 'move-hold' })

    assert.equal(result.valid, true)
  })

  it('dodge choice is valid', () => {
    const state = makeStandardState()
    const menu = TurnMenu.getMenu(state, 'bard1')
    const dodge = menu.actions.find(o => o.type === 'dodge')

    const result = TurnMenu.validateChoice(state, 'bard1', { optionId: dodge.optionId })
    assert.equal(result.valid, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES & COMBINED SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

describe('TurnMenu — edge cases', () => {
  it('creature with no weapons gets no attack options', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({ id: 'c1', weapons: [], weapon: null }),
        makeEnemy({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['c1', 'enemy1'],
    })
    const options = TurnMenu.getActionOptions(state, 'c1')
    const attacks = options.filter(o => o.type === 'attack' || o.type === 'multiattack')

    assert.equal(attacks.length, 0)
  })

  it('creature with no spells gets no spell options', () => {
    const state = new GameState({
      combatants: [
        makeCombatant({ id: 'c1', spellsKnown: [], cantrips: [] }),
        makeEnemy({ position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['c1', 'enemy1'],
    })
    const options = TurnMenu.getActionOptions(state, 'c1')
    const spells = options.filter(o => o.type === 'spell')

    assert.equal(spells.length, 0)
  })

  it('all enemies dead: no attack or hostile spell options, but dodge/dash/disengage remain', () => {
    const state = new GameState({
      combatants: [
        makeBard(),
        makeEnemy({ currentHP: 0 }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })
    const options = TurnMenu.getActionOptions(state, 'bard1')

    const attacks = options.filter(o => o.type === 'attack')
    assert.equal(attacks.length, 0)

    assert.ok(options.some(o => o.type === 'dodge'))
    assert.ok(options.some(o => o.type === 'dash'))
  })

  it('action used + bonus used + no movement = only end turn available', () => {
    const state = makeStandardState()
      .withUpdatedCombatant('bard1', {
        usedAction: true,
        usedBonusAction: true,
        movementRemaining: 0,
      })
    const menu = TurnMenu.getMenu(state, 'bard1')

    assert.equal(menu.actions.length, 0)
    assert.equal(menu.bonusActions.length, 0)
    assert.equal(menu.movements.length, 0)
    assert.ok(menu.endTurn)
  })

  it('option IDs are stable for same state', () => {
    const state = makeMeleeState()
    const menu1 = TurnMenu.getMenu(state, 'bard1')
    const menu2 = TurnMenu.getMenu(state, 'bard1')

    assert.deepEqual(
      menu1.actions.map(o => o.optionId),
      menu2.actions.map(o => o.optionId),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FLYING DISTANCE — combatDistance / creatureToPointDistance
// ─────────────────────────────────────────────────────────────────────────────

describe('combatDistance — flying altitude', () => {
  it('ground-to-ground uses 2D Chebyshev distance', () => {
    const a = { position: { x: 0, y: 0 }, flying: false }
    const b = { position: { x: 6, y: 0 }, flying: false }
    assert.equal(TurnMenu._combatDistance(a, b), 30)
  })

  it('flying-to-flying uses 2D Chebyshev (same altitude)', () => {
    const a = { position: { x: 0, y: 0 }, flying: true }
    const b = { position: { x: 6, y: 0 }, flying: true }
    assert.equal(TurnMenu._combatDistance(a, b), 30)
  })

  it('flying vs ground at same position = 30ft (altitude only)', () => {
    const flyer = { position: { x: 0, y: 0 }, flying: true }
    const ground = { position: { x: 0, y: 0 }, flying: false }
    assert.equal(TurnMenu._combatDistance(flyer, ground), 30)
  })

  it('flying vs ground at 40ft horizontal ≈ 50ft 3D', () => {
    // sqrt(40² + 30²) = sqrt(1600+900) = sqrt(2500) = 50
    const flyer = { position: { x: 0, y: 0 }, flying: true }
    const ground = { position: { x: 8, y: 0 }, flying: false }
    assert.equal(TurnMenu._combatDistance(flyer, ground), 50)
  })

  it('ground vs flying is symmetric', () => {
    const flyer = { position: { x: 4, y: 0 }, flying: true }
    const ground = { position: { x: 0, y: 0 }, flying: false }
    assert.equal(
      TurnMenu._combatDistance(flyer, ground),
      TurnMenu._combatDistance(ground, flyer),
    )
  })

  it('creatureToPointDistance: flying creature to ground point adds altitude', () => {
    const flyer = { position: { x: 0, y: 0 }, flying: true }
    const point = { x: 0, y: 0 }
    assert.equal(TurnMenu._creatureToPointDistance(flyer, point), 30)
  })

  it('creatureToPointDistance: grounded creature uses 2D', () => {
    const ground = { position: { x: 0, y: 0 }, flying: false }
    const point = { x: 6, y: 0 }
    assert.equal(TurnMenu._creatureToPointDistance(ground, point), 30)
  })
})

describe('Flying creature — melee attacks blocked', () => {
  it('grounded enemy cannot melee a flying bard at same position', () => {
    const state = new GameState({
      combatants: [
        makeBard({ flying: true, position: { x: 0, y: 0 } }),
        makeEnemy({
          position: { x: 0, y: 0 },
          weapons: [{ name: 'Slam', attackBonus: 3, damageDice: '1d6', damageBonus: 1, type: 'melee', range: 5 }],
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const actions = TurnMenu.getActionOptions(state, 'enemy1')
    const attacks = actions.filter(o => o.type === 'attack')
    assert.equal(attacks.length, 0, 'Ground enemy should have no melee attacks against flying bard')
  })

  it('flying bard CAN melee a flying enemy at same position', () => {
    const state = new GameState({
      combatants: [
        makeBard({ flying: true }),
        makeEnemy({ flying: true, position: { x: 1, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const actions = TurnMenu.getActionOptions(state, 'bard1')
    const attacks = actions.filter(o => o.type === 'attack')
    assert.ok(attacks.length > 0, 'Flying attacker should melee a flying target at 5ft')
  })

  it('ranged weapon can still hit flying target from ground', () => {
    const state = new GameState({
      combatants: [
        makeBard({ flying: true, position: { x: 0, y: 0 } }),
        makeEnemy({
          position: { x: 0, y: 0 },
          weapons: [{ name: 'Shortbow', attackBonus: 4, damageDice: '1d6', damageBonus: 2, type: 'ranged', range: 80 }],
        }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const actions = TurnMenu.getActionOptions(state, 'enemy1')
    const attacks = actions.filter(o => o.type === 'attack')
    assert.ok(attacks.length > 0, 'Ranged weapon should still reach flying target (30ft < 80ft)')
  })

  it('flying bard spell targets use 3D distance', () => {
    // Bard flying at (0,0), enemy at (10,0) = 50ft horizontal.
    // 3D distance = sqrt(50² + 30²) = sqrt(3400) ≈ 58.3 → 60ft
    // Hold Person range = 60ft → should be in range
    const state = new GameState({
      combatants: [
        makeBard({
          flying: true,
          position: { x: 0, y: 0 },
          spellsKnown: ['Hold Person'],
          spellSlots: { 2: 1 },
          spellSaveDC: 16,
        }),
        makeEnemy({ position: { x: 10, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const actions = TurnMenu.getActionOptions(state, 'bard1')
    const holdPerson = actions.find(o => o.spellName === 'Hold Person')
    assert.ok(holdPerson, 'Hold Person should be available at 60ft 3D distance')
    assert.ok(holdPerson.validTargets.some(t => t.id === 'enemy1'))
  })

  it('flying bard spell NOT available when 3D distance exceeds range', () => {
    // Bard flying at (0,0), enemy at (12,0) = 60ft horizontal.
    // 3D distance = sqrt(60² + 30²) = sqrt(4500) ≈ 67.1 → 65ft
    // Hold Person range = 60ft → should be OUT of range
    const state = new GameState({
      combatants: [
        makeBard({
          flying: true,
          position: { x: 0, y: 0 },
          spellsKnown: ['Hold Person'],
          spellSlots: { 2: 1 },
          spellSaveDC: 16,
        }),
        makeEnemy({ position: { x: 12, y: 0 } }),
      ],
      initiativeOrder: ['bard1', 'enemy1'],
    })

    const actions = TurnMenu.getActionOptions(state, 'bard1')
    const holdPerson = actions.find(o => o.spellName === 'Hold Person')
    // At 65ft, should be out of 60ft range
    if (holdPerson) {
      assert.ok(!holdPerson.validTargets.some(t => t.id === 'enemy1'),
        'Enemy at 65ft 3D should not be in 60ft spell range')
    }
  })
})
